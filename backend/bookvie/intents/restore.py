"""The ``restore`` intent (FR-23, AD-4, AD-12, AD-13, AD-14).

Under one AD-4 lock, staging included: ``.staging/`` is emptied, the archive
unpacked into it (:func:`bookvie.store.stage_archive`), ``library.json``
parsed, migrated in memory when older and validated through the same path
as startup (:func:`bookvie.store.load_library`), and every referenced cover
checked present and decodable with the cover decoder (its bytes are stored
unchanged). Only then is it applied, in AD-12 order, by
:meth:`Store.replace_all`. ``.staging/`` is emptied again whatever happened;
a failure there is only logged.

Refusals are 422: ``restore_invalid`` for a file that isn't a zip;
``restore_unsafe`` for a break of an archive-safety rule or limit (AD-14),
checked before anything is unpacked; ``restore_newer_version`` for a
``schemaVersion`` above the current one, decided before model validation and
the cover checks; ``restore_invalid`` for anything else. A write fault before
the commit is 503 ``couldnt_save``. No pre-migration backup is
written: the archive is the backup. ``local-state.json`` is never touched.
"""

from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import bookvie.store.restore as unpack
from bookvie.domain import InvariantViolation, Library
from bookvie.store import (
    LIBRARY_NAME,
    ArchiveRefused,
    ArchiveUnsafe,
    CouldntSave,
    LibraryNewer,
    LibraryRefused,
    Store,
    load_library,
    referenced_covers,
    stage_archive,
)

from .commit import log
from .contract import (
    couldnt_save,
    restore_invalid,
    restore_newer_version,
    restore_unsafe,
)
from .cover import check_decodable
from .intent_model import IntentModel, parse_form_intent


class RestoreIntent(IntentModel):
    """The ``intent`` part of a restore: ``{}``; the file is the ``archive`` part."""


def parse_restore_intent(raw: str | None) -> RestoreIntent:
    """The ``intent`` form part, ``{}``, or 422 on ``intent``."""
    return parse_form_intent(RestoreIntent, raw)


def max_upload_bytes() -> int:
    """The largest restore upload, read from the store's limit at call time (AD-14)."""
    return unpack.MAX_UPLOAD_BYTES


class _Refused(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class StagedRestore:
    """An archive staged and validated by :func:`stage_and_validate`, ready to apply."""

    library: Library
    """The archive's library, migrated in memory when older, and validated."""
    covers: Mapping[str, Path]
    """Each cover ``library`` references, by its staged file in ``.staging/covers/``."""


def restore(store: Store, archive: BinaryIO) -> None:
    """Replace all data with the export in ``archive``, or change nothing."""
    with store.lock:
        try:
            apply_staged(store, stage_and_validate(store, archive))
        finally:
            store.empty_staging(quiet=True)


def stage_and_validate(store: Store, archive: BinaryIO) -> StagedRestore:
    """Unpack ``archive`` into ``.staging/`` and validate it; nothing outside ``.staging/``
    changes. Lock-free: the caller holds ``store.lock`` and empties ``.staging/`` after."""
    with _restore_errors():
        staged = stage_archive(store, archive)
        try:
            library = load_library(staged.library)
        except LibraryNewer:
            raise
        except LibraryRefused as exc:
            raise _Refused(f"library.json {exc.reason}") from exc
        names = sorted(referenced_covers(library))
        for name in names:
            if name not in staged.covers:
                raise _Refused(f"covers/{name} is missing")
            if not check_decodable(staged.cover_bytes(name)):
                raise _Refused(f"covers/{name} isn't a usable image")
        return StagedRestore(library, {name: staged.covers[name] for name in names})


def apply_staged(store: Store, staged: StagedRestore) -> None:
    """Apply a staged restore in AD-12 order (:meth:`Store.replace_all`).

    Lock-free: the caller holds ``store.lock``.
    """
    with _restore_errors():
        store.replace_all(staged.library, staged.covers)


@contextmanager
def _restore_errors() -> Iterator[None]:
    """The one mapping from a staging, validation or apply failure to its AD-9 error."""
    try:
        yield
    except ArchiveUnsafe as exc:
        log(f"couldn't restore: the file {exc.reason}")
        raise restore_unsafe() from exc
    except ArchiveRefused as exc:
        log(f"couldn't restore: the file {exc.reason}")
        raise restore_invalid() from exc
    except LibraryNewer as exc:
        log(
            f"couldn't restore: {LIBRARY_NAME} is schemaVersion {exc.version}, "
            f"newer than {exc.current}"
        )
        raise restore_newer_version() from exc
    except _Refused as exc:
        log(f"couldn't restore: {exc.reason}")
        raise restore_invalid() from exc
    except CouldntSave as exc:
        log(f"couldn't save: {exc}")
        raise couldnt_save(503) from exc
    except InvariantViolation as exc:
        log(f"couldn't save: library rule {exc.rule} failed: {exc.message}")
        raise couldnt_save(500) from exc
