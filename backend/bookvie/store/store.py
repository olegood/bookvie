"""The one-file store (AD-2, AD-4, AD-13).

``library.json`` holds the whole textual library. :func:`serialize` is the only
code that makes its bytes. :meth:`Store.open` prepares the data folder at
startup (load or migrate, then sweep, then create or commit), and :meth:`Store.apply` is the only
way to change the library: under the AD-4 lock it runs a change on a copy,
checks the AD-18 invariants, commits atomically and swaps the in-memory state.
"""

import json
import os
import shutil
import threading
from collections.abc import Callable
from pathlib import Path

from pydantic import ValidationError

from bookvie.domain.invariants import InvariantViolation, check_invariants
from bookvie.domain.model import Library

from . import migrations
from .fs import FileSystem, OsFileSystem

LIBRARY_NAME = "library.json"
TEMP_PREFIX = "library.json.tmp"
COVERS_DIR = "covers"
STAGING_DIR = ".staging"


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


def ensure_writable(data_dir: Path) -> None:
    """Create ``data_dir`` if needed and make sure it is a writable folder."""
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


def _validation_reason(exc: ValidationError) -> str:
    first = exc.errors()[0]
    where = ".".join(str(part) for part in first["loc"]) or "document"
    more = exc.error_count() - 1
    tail = f" (and {more} more problem{'s' if more > 1 else ''})" if more else ""
    return f"is not a valid library: {where}: {first['msg']}{tail}"


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
        or invalid file is refused before anything in the folder changes; a
        refused upgrade leaves the original and its backup. A refusal while
        creating ``covers/``, ``.staging/`` or the first ``library.json``
        comes after the sweep.
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
        store._sweep()
        for name in (COVERS_DIR, STAGING_DIR):
            try:
                (data_dir / name).mkdir(exist_ok=True)
            except OSError as exc:
                raise StartupError(data_dir / name, f"can't be created ({exc.strerror})") from None
        if not exists:
            store._commit_at_startup(Library.empty())
        elif migrated is not None:
            store._commit_at_startup(migrated)
        return store

    def _sweep(self) -> None:
        try:
            for leftover in self.data_dir.glob(f"{TEMP_PREFIX}*"):
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

    def _read(self) -> tuple[bytes, dict, int]:
        """The file's bytes, parsed document and version, or a refusal."""
        path = self.path
        try:
            raw = path.read_bytes()
        except OSError as exc:
            raise StartupError(path, f"can't be read ({exc.strerror})") from None
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise StartupError(path, "is not UTF-8 text") from None
        try:
            doc = json.loads(text)
        except ValueError as exc:
            raise StartupError(path, f"is not valid JSON ({exc})") from None
        if not isinstance(doc, dict):
            raise StartupError(path, "is not a JSON object")
        if "schemaVersion" not in doc:
            raise StartupError(path, "has no schemaVersion")
        version = doc["schemaVersion"]
        if isinstance(version, bool) or not isinstance(version, int):
            raise StartupError(path, f"has a schemaVersion that is not a whole number: {version!r}")
        current = migrations.CURRENT_VERSION
        if version > current:
            raise StartupError(
                path,
                f"has schemaVersion {version}, which is newer than this bookvie supports "
                f"({current}); update bookvie",
            )
        if version < 1:
            raise StartupError(path, f"has an unknown schemaVersion {version}")
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
            library = Library.model_validate_json(json.dumps(doc, ensure_ascii=False))
        except ValidationError as exc:
            raise StartupError(self.path, _validation_reason(exc)) from None
        try:
            check_invariants(library)
        except InvariantViolation as exc:
            raise StartupError(self.path, f"breaks a library rule: {exc.message}") from None
        return library

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

    def apply(self, change: Callable[[Library], Library | None]) -> Library:
        """Apply ``change`` and commit it once, or change nothing.

        ``change`` gets a deep copy of the committed library and either edits
        it in place (returning ``None``) or returns a new one. The result is
        re-validated against the model, so a wrong-typed or out-of-bound value
        raises ``ValidationError``; a changed ``schemaVersion`` raises
        :class:`InvariantViolation`. That, an exception from ``change``, an
        :class:`InvariantViolation` or :class:`CouldntSave` leaves the file and
        :attr:`library` unchanged.
        """
        with self.lock:
            draft = self._library.model_copy(deep=True)
            result = change(draft)
            new = draft if result is None else result
            # Assignment isn't validated; re-check so the next start can load it.
            new = Library.model_validate(new.model_dump(warnings=False))
            if new.schema_version != migrations.CURRENT_VERSION:
                raise InvariantViolation(
                    "schema_version",
                    f"schemaVersion must stay {migrations.CURRENT_VERSION}, "
                    f"not {new.schema_version}",
                )
            check_invariants(new)
            self._commit(new)
            self._library = new
            return new

    def _commit(self, library: Library) -> None:
        self._write_atomic(self.path, serialize(library))

    def _write_atomic(self, target: Path, data: bytes) -> None:
        """temp file in the data folder -> write -> fsync -> rename (AD-2)."""
        fs = self.fs
        try:
            fd, temp = fs.create_temp(self.data_dir, TEMP_PREFIX)
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
