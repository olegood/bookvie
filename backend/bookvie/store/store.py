"""The one-file store (AD-2, AD-4, AD-13).

``library.json`` holds the whole textual library. :func:`serialize` is the only
code that makes its bytes. :meth:`Store.open` prepares the data folder at
startup (load or migrate, then sweep, then create or commit), and :meth:`Store.apply` is the only
way to change the library: under the AD-4 lock it runs a change on a copy,
checks the AD-18 invariants, commits atomically and swaps the in-memory state.
:meth:`Store.replace_all` is restore's whole-library version of the same
commit (the caller holds the lock), and :func:`load_library` the parse,
migrate and validate path startup shares.
"""

import json
import os
import shutil
import sys
import threading
from collections.abc import Callable, Iterable, Mapping
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError

from bookvie.domain.invariants import InvariantViolation, check_invariants
from bookvie.domain.model import Library

from . import migrations
from .fs import FileSystem, OsFileSystem
from .local_state import LOCAL_STATE_NAME, LOCAL_STATE_TEMP_PREFIX, local_state_bytes

LIBRARY_NAME = "library.json"
TEMP_PREFIX = "library.json.tmp"
COVERS_DIR = "covers"
STAGING_DIR = ".staging"


def _log(message: str) -> None:
    print(f"bookvie: {message}", file=sys.stderr, flush=True)


def cover_name(cover_file: str) -> str | None:
    """The file name in ``covers/`` that ``cover_file`` names, or ``None`` if it names none.

    Only ``covers/<name>`` with a plain name counts, so a hand-edited
    ``coverFile`` can never reach a file outside ``covers/``.
    """
    prefix = f"{COVERS_DIR}/"
    if not cover_file.startswith(prefix):
        return None
    name = cover_file[len(prefix) :]
    if not name or name in (".", "..") or "/" in name or "\\" in name or "\0" in name:
        return None
    return name


def _has_covers(covers: Path) -> bool:
    """Whether ``covers/`` is a real folder holding at least one file."""
    if not covers.is_dir() or covers.is_symlink():
        return False
    try:
        return any(entry.is_file() or entry.is_symlink() for entry in covers.iterdir())
    except OSError as exc:
        raise StartupError(covers, f"can't be read ({exc.strerror})") from None


def referenced_covers(library: Library) -> set[str]:
    """The names in ``covers/`` that some Book's ``coverFile`` names."""
    names = (cover_name(book.cover_file) for book in library.books if book.cover_file)
    return {name for name in names if name is not None}


class StartupError(Exception):
    """The data folder can't be served; ``library.json`` was not changed."""

    def __init__(self, path: Path, reason: str) -> None:
        super().__init__(f"{path}: {reason}")
        self.path = path
        self.reason = reason


class CouldntSave(Exception):
    """A commit failed; ``library.json`` and the in-memory state are unchanged."""

    code = "couldnt_save"


def serialize(library: Library) -> bytes:
    """The canonical bytes of ``library.json`` (AD-2)."""
    data = library.model_dump(mode="json", by_alias=True)
    return (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def _flush_parent(folder: Path, fs: FileSystem) -> None:
    """Fsync the folder holding ``folder``, so its entry survives a power cut."""
    try:
        fs.fsync_dir(folder.parent)
    except PermissionError as exc:
        # A parent we can write into but not read (a `-wx` drop folder) can't be
        # opened to flush. Nothing more can be done there; don't refuse to start.
        _log(f"couldn't flush {folder.parent} ({exc.strerror}); continuing")
    except OSError as exc:
        raise StartupError(
            folder, f"can't be made durable: {folder.parent} can't be flushed ({exc.strerror})"
        ) from None


def ensure_writable(data_dir: Path, fs: FileSystem | None = None) -> None:
    """Create ``data_dir`` if needed and make sure it is a writable folder.

    The parent of ``data_dir`` is fsynced on every start, so a data folder
    created by an earlier, interrupted start is made durable too. Each missing
    ancestor this creates has its own parent fsynced, outermost first.
    """
    fs = fs or OsFileSystem()
    data_dir = Path(os.path.abspath(data_dir))
    missing = [path for path in data_dir.parents if not os.path.lexists(path)]
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except FileExistsError:
        raise StartupError(data_dir, "is not a folder") from None
    except OSError as exc:
        raise StartupError(data_dir, f"can't be created ({exc.strerror})") from None
    if not data_dir.is_dir():
        raise StartupError(data_dir, "is not a folder")
    if not os.access(data_dir, os.W_OK | os.X_OK):
        raise StartupError(data_dir, "is not writable")
    for created in reversed(missing):
        _flush_parent(created, fs)
    _flush_parent(data_dir, fs)


def _validation_reason(exc: ValidationError) -> str:
    first = exc.errors()[0]
    where = ".".join(str(part) for part in first["loc"]) or "document"
    more = exc.error_count() - 1
    tail = f" (and {more} more problem{'s' if more > 1 else ''})" if more else ""
    return f"is not a valid library: {where}: {first['msg']}{tail}"


class LibraryRefused(Exception):
    """A ``library.json`` document that can't be served; ``reason`` says why.

    Startup turns it into a :class:`StartupError`; restore into a refusal.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def parse_document(raw: bytes) -> tuple[dict, int]:
    """``raw`` as a JSON object with a supported whole-number ``schemaVersion``.

    The one parse startup and restore share (AD-13); raises
    :class:`LibraryRefused`. ``CURRENT_VERSION`` is read through the module
    at call time.
    """
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise LibraryRefused("is not UTF-8 text") from None
    try:
        doc = json.loads(text)
    except (ValueError, RecursionError) as exc:
        raise LibraryRefused(f"is not valid JSON ({exc})") from None
    if not isinstance(doc, dict):
        raise LibraryRefused("is not a JSON object")
    if "schemaVersion" not in doc:
        raise LibraryRefused("has no schemaVersion")
    version = doc["schemaVersion"]
    if isinstance(version, bool) or not isinstance(version, int):
        raise LibraryRefused(f"has a schemaVersion that is not a whole number: {version!r}")
    current = migrations.CURRENT_VERSION
    if version > current:
        raise LibraryRefused(
            f"has schemaVersion {version}, which is newer than this bookvie supports "
            f"({current}); update bookvie"
        )
    if version < 1:
        raise LibraryRefused(f"has an unknown schemaVersion {version}")
    return doc, version


def validate_document(doc: dict) -> Library:
    """``doc`` as a :class:`Library` that passes the model and the AD-18 invariants."""
    try:
        library = Library.model_validate_json(json.dumps(doc, ensure_ascii=False))
    except ValidationError as exc:
        raise LibraryRefused(_validation_reason(exc)) from None
    try:
        check_invariants(library)
    except InvariantViolation as exc:
        raise LibraryRefused(f"breaks a library rule: {exc.message}") from None
    return library


def load_library(raw: bytes) -> Library:
    """``raw`` parsed, migrated in memory when older, and validated (restore, AD-13).

    No backup is written: for a restore the archive is the backup. Raises
    :class:`LibraryRefused`.
    """
    doc, version = parse_document(raw)
    if version < migrations.CURRENT_VERSION:
        try:
            doc = migrations.migrate(doc)
        except Exception as exc:  # noqa: BLE001 - any step failure refuses the file
            raise LibraryRefused(
                f"could not be upgraded from schemaVersion {version}: {exc}"
            ) from None
    return validate_document(doc)


class Store:
    """The committed library and the only way to change it."""

    def __init__(self, data_dir: Path, library: Library, fs: FileSystem) -> None:
        self.data_dir = data_dir
        self.path = data_dir / LIBRARY_NAME
        self.fs = fs
        # AD-4: covers apply -> write files -> commit -> swap. Export, restore
        # and shutdown take it too.
        self.lock = threading.Lock()
        self._library = library

    @property
    def library(self) -> Library:
        """The committed state. Readers must not modify it."""
        return self._library

    # --- startup -----------------------------------------------------------

    @classmethod
    def open(cls, data_dir: Path, fs: FileSystem | None = None) -> "Store":
        """Load or migrate ``library.json``, sweep, then create or commit it.

        Raises :class:`StartupError` when the folder can't be served. A newer
        or invalid file, or a missing one while ``covers/`` holds files, is
        refused before anything in the folder changes; a
        refused upgrade leaves the original and its backup. A refusal while
        creating or flushing ``covers/``, ``.staging/`` or the first
        ``library.json`` comes after the sweep.
        """
        fs = fs or OsFileSystem()
        data_dir = Path(data_dir)
        store = cls(data_dir, Library.empty(), fs)
        exists = store.path.exists()
        migrated = None
        if exists:
            raw, doc, version = store._read()
            if version == migrations.CURRENT_VERSION:
                store._library = store._validate(doc)
            else:
                # Backup, chain and validation all run before the sweep, so a
                # refused upgrade changes nothing but the backup.
                migrated = store._migrate(raw, doc, version)
        elif _has_covers(data_dir / COVERS_DIR):
            # Covers without a library.json mean the file was lost or moved.
            # Starting would commit an empty library whose next sweep deletes
            # every cover, so the folder is refused before anything changes.
            raise StartupError(
                store.path,
                f"is missing but {COVERS_DIR}/ holds covers; restore library.json or empty {COVERS_DIR}/",
            )
        store._sweep(migrated if migrated is not None else store._library)
        for name in (COVERS_DIR, STAGING_DIR):
            try:
                (data_dir / name).mkdir(exist_ok=True)
            except OSError as exc:
                raise StartupError(data_dir / name, f"can't be created ({exc.strerror})") from None
        # Flushed on every start, not only when created: a start interrupted
        # between mkdir and this flush must not leave covers/ unflushed for good.
        _flush_parent(data_dir / COVERS_DIR, fs)
        if not exists:
            store._commit_at_startup(Library.empty())
        elif migrated is not None:
            store._commit_at_startup(migrated)
        return store

    def _sweep(self, library: Library) -> None:
        self._sweep_covers(library)
        try:
            for prefix in (TEMP_PREFIX, LOCAL_STATE_TEMP_PREFIX):
                for leftover in self.data_dir.glob(f"{prefix}*"):
                    if leftover.is_file() or leftover.is_symlink():
                        self.fs.remove(leftover)
            staging = self.data_dir / STAGING_DIR
            if staging.is_dir() and not staging.is_symlink():
                for entry in staging.iterdir():
                    if entry.is_dir() and not entry.is_symlink():
                        shutil.rmtree(entry)
                    else:
                        entry.unlink()
        except OSError as exc:
            path = Path(exc.filename) if exc.filename else self.data_dir
            raise StartupError(path, f"can't remove a leftover file ({exc.strerror})") from None

    def _sweep_covers(self, library: Library) -> None:
        """Delete files in ``covers/`` that no Book references (AD-12).

        A cleanup that failed after a commit, or a temp file from a crash,
        leaves them. A file that can't be deleted is logged and left.
        """
        covers = self.data_dir / COVERS_DIR
        if not covers.is_dir() or covers.is_symlink():
            return
        keep = referenced_covers(library)
        try:
            entries = sorted(covers.iterdir())
        except OSError as exc:
            _log(f"couldn't sweep {COVERS_DIR}/: {exc}")
            return
        stale = [
            entry
            for entry in entries
            if entry.name not in keep and (entry.is_symlink() or entry.is_file())
        ]
        self._remove_covers(stale)

    def _remove_covers(self, paths: Iterable[Path]) -> None:
        """Delete each file through the seam; log each failure (never raises)."""
        for path in paths:
            try:
                self.fs.remove(path)
            except FileNotFoundError:
                pass
            except Exception as exc:  # noqa: BLE001 - one bad file mustn't stop the rest
                _log(f"couldn't delete {COVERS_DIR}/{path.name}: {exc}")

    def _read(self) -> tuple[bytes, dict, int]:
        """The file's bytes, parsed document and version, or a refusal."""
        path = self.path
        try:
            raw = path.read_bytes()
        except OSError as exc:
            raise StartupError(path, f"can't be read ({exc.strerror})") from None
        try:
            doc, version = parse_document(raw)
        except LibraryRefused as exc:
            raise StartupError(path, exc.reason) from None
        return raw, doc, version

    def _migrate(self, raw: bytes, doc: dict, version: int) -> Library:
        # The backup goes first, so it is untouched when a step raises.
        backup = self.data_dir / f"library.v{version}.bak.json"
        try:
            self._write_atomic(backup, raw)
        except CouldntSave as exc:
            raise StartupError(backup, f"can't be written ({exc})") from None
        try:
            doc = migrations.migrate(doc)
        except Exception as exc:  # noqa: BLE001 - any step failure stops startup
            raise StartupError(
                self.path, f"could not be upgraded from schemaVersion {version}: {exc}"
            ) from None
        return self._validate(doc)

    def _validate(self, doc: dict) -> Library:
        try:
            return validate_document(doc)
        except LibraryRefused as exc:
            raise StartupError(self.path, exc.reason) from None

    def _commit_at_startup(self, library: Library) -> None:
        try:
            check_invariants(library)
        except InvariantViolation as exc:
            raise StartupError(self.path, f"breaks a library rule: {exc.message}") from None
        try:
            self._commit(library)
        except CouldntSave as exc:
            raise StartupError(self.path, f"can't be written ({exc})") from None
        self._library = library

    # --- commits -----------------------------------------------------------

    def apply(
        self,
        change: Callable[[Library], Library | None],
        new_files: Mapping[str, bytes] | None = None,
    ) -> Library:
        """Write ``new_files``, apply ``change`` and commit it once, or change nothing.

        ``new_files`` maps paths relative to the data folder (``covers/<name>``)
        to their bytes. Under the AD-4 lock the order is AD-12's: each new
        file is written (temp + rename), then the change is applied and the
        document committed, then every cover the old document referenced and
        the new one doesn't is deleted. When anything before the swap fails,
        the new files are removed again; a failed deletion after the commit
        is only logged, and the next startup sweeps the file.

        ``change`` gets a deep copy of the committed library and either edits
        it in place (returning ``None``) or returns a new one. The result is
        re-validated against the model, so a wrong-typed or out-of-bound value
        raises ``ValidationError``; a changed ``schemaVersion`` raises
        :class:`InvariantViolation`. That, an exception from ``change``, an
        :class:`InvariantViolation` or :class:`CouldntSave` leaves the file and
        :attr:`library` unchanged.
        """
        with self.lock:
            return self._apply_locked(change, new_files)

    def _apply_locked(
        self,
        change: Callable[[Library], Library | None],
        new_files: Mapping[str, bytes] | None,
    ) -> Library:
        written: list[Path] = []

        def undo() -> None:
            self._remove_covers(written)

        try:
            for relative, data in (new_files or {}).items():
                target = self.data_dir / relative
                self._write_atomic(target, data, prefix=f"{target.name}.tmp")
                written.append(target)
            draft = self._library.model_copy(deep=True)
            result = change(draft)
            new = draft if result is None else result
            # Assignment isn't validated; re-check so the next start can load it.
            new = Library.model_validate(new.model_dump(warnings=False))
        except BaseException:
            undo()
            raise
        old = self._commit_and_swap(new, undo)
        unreferenced = referenced_covers(old) - referenced_covers(new)
        self._remove_covers(self.data_dir / COVERS_DIR / name for name in sorted(unreferenced))
        return new

    def _commit_and_swap(self, new: Library, undo: Callable[[], None]) -> Library:
        """The locked core :meth:`apply` and :meth:`replace_all` share; returns the old library.

        Checks ``schemaVersion`` and the AD-18 invariants, commits ``new``
        atomically (AD-2) and swaps the in-memory state. When anything fails,
        ``undo`` puts the files written before it back, and the exception
        propagates with the file and :attr:`library` unchanged. The caller
        holds :attr:`lock`.
        """
        try:
            if new.schema_version != migrations.CURRENT_VERSION:
                raise InvariantViolation(
                    "schema_version",
                    f"schemaVersion must stay {migrations.CURRENT_VERSION}, "
                    f"not {new.schema_version}",
                )
            check_invariants(new)
            self._commit(new)
        except BaseException:
            undo()
            raise
        old = self._library
        self._library = new
        return old

    def replace_all(self, library: Library, covers: Mapping[str, Path]) -> None:
        """Replace the whole library with ``library`` and its ``covers`` (restore, AD-12).

        The caller holds :attr:`lock` (it is not reentrant). ``covers`` maps
        each name in ``covers/`` to the staged file holding its bytes, which
        are stored unchanged. In AD-12 order: each cover not yet in
        ``covers/`` is written through :meth:`_write_atomic`, then ``library``
        is committed and swapped in, then every file in ``covers/`` that
        ``library`` doesn't reference is deleted.

        A cover name is never overwritten (AD-12): a name already in
        ``covers/`` keeps its file, and when the export's copy differs that
        is only logged. When anything before the swap fails, only the covers
        written here are removed, so ``covers/`` and ``library.json`` are as
        before; :class:`CouldntSave` (or the invariant failure) propagates. A
        failed deletion after the commit is only logged, and the next startup
        sweeps the file.
        """
        covers_dir = self.data_dir / COVERS_DIR
        written: list[Path] = []

        def undo() -> None:
            self._remove_covers(written)

        try:
            try:
                covers_dir.mkdir(exist_ok=True)
            except OSError as exc:
                raise CouldntSave(f"can't create {COVERS_DIR}/: {exc}") from exc
            for name, source in sorted(covers.items()):
                target = covers_dir / name
                try:
                    data = source.read_bytes()
                    if os.path.lexists(target):
                        same = target.is_file() and not target.is_symlink() and (
                            target.read_bytes() == data
                        )
                        if not same:
                            _log(f"kept {COVERS_DIR}/{name}; the export's copy differs")
                        continue
                except OSError as exc:
                    raise CouldntSave(f"can't read {COVERS_DIR}/{name}: {exc}") from exc
                self._write_atomic(target, data, prefix=f"{name}.tmp")
                written.append(target)
        except BaseException:
            undo()
            raise
        self._commit_and_swap(library, undo)
        self._sweep_covers(library)

    def empty_staging(self, *, quiet: bool = False) -> None:
        """Delete everything in ``.staging/``; files go through the seam.

        Raises the first :class:`OSError`, or with ``quiet`` logs each
        failure as ``couldn't delete .staging/<path>`` and goes on (the
        startup sweep removes what is left).
        """
        staging = self.data_dir / STAGING_DIR
        try:
            if staging.is_symlink() or not staging.is_dir():
                return
            entries = sorted(staging.iterdir())
        except OSError as exc:
            if not quiet:
                raise
            _log(f"couldn't empty {STAGING_DIR}/: {exc}")
            return
        for entry in entries:
            self._remove_tree(entry, quiet)

    def _remove_tree(self, path: Path, quiet: bool) -> None:
        try:
            if path.is_dir() and not path.is_symlink():
                for entry in sorted(path.iterdir()):
                    self._remove_tree(entry, quiet)
                path.rmdir()
            else:
                self.fs.remove(path)
        except FileNotFoundError:
            pass
        except Exception as exc:
            if not quiet:
                raise
            relative = Path(os.path.relpath(path, self.data_dir)).as_posix()
            _log(f"couldn't delete {relative}: {exc}")

    def record_export(self, now: datetime) -> None:
        """Write ``local-state.json`` saying the last complete export was at ``now`` (AD-15).

        Atomic through the filesystem seam, like a commit; raises
        :class:`CouldntSave` when it can't be written. It doesn't take the
        lock: it never touches ``library.json`` or ``covers/``.
        """
        self._write_atomic(
            self.data_dir / LOCAL_STATE_NAME,
            local_state_bytes(now),
            prefix=LOCAL_STATE_TEMP_PREFIX,
        )

    def _commit(self, library: Library) -> None:
        self._write_atomic(self.path, serialize(library))

    def _write_atomic(self, target: Path, data: bytes, prefix: str = TEMP_PREFIX) -> None:
        """temp file beside ``target`` -> write -> fsync -> rename -> fsync folder (AD-2).

        The temp file is removed when any step fails.
        """
        fs = self.fs
        try:
            fd, temp = fs.create_temp(target.parent, prefix)
        except Exception as exc:
            raise CouldntSave(f"can't create a temp file: {exc}") from exc
        is_open = True
        try:
            fs.write(fd, data)
            fs.fsync(fd)
            is_open = False
            fs.close(fd)
            fs.replace(temp, target)
        except Exception as exc:
            if is_open:
                try:
                    fs.close(fd)
                except Exception:  # noqa: BLE001 - cleanup must reach remove
                    pass
            try:
                fs.remove(temp)
            except Exception:  # noqa: BLE001 - the original error is reported
                pass
            raise CouldntSave(f"can't write {target.name}: {exc}") from exc
        # The rename is the commit: a failed folder flush after it only weakens
        # durability across a power cut, so it is logged, never rolled back.
        try:
            fs.fsync_dir(target.parent)
        except Exception as exc:  # noqa: BLE001 - the commit already happened
            _log(f"couldn't flush {target.parent.name}/ after writing {target.name}: {exc}")
