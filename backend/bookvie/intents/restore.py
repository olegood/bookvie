"""The ``restore`` intent (FR-23, AD-4, AD-12, AD-13, AD-14).

Under one AD-4 lock, staging included: ``.staging/`` is emptied, the archive
unpacked into it (:func:`bookvie.store.stage_archive`), ``library.json``
parsed, migrated in memory when older and validated through the same path
as startup (:func:`bookvie.store.load_library`), and every referenced cover
checked present and decodable with the cover decoder (its bytes are stored
unchanged). Only then is it applied, in AD-12 order, by
:meth:`Store.replace_all`. ``.staging/`` is emptied again whatever happened;
a failure there is only logged.

Until Story 2.3, every refusal is 422 ``restore_invalid``. A write fault
before the commit is 503 ``couldnt_save``. No pre-migration backup is
written: the archive is the backup. ``local-state.json`` is never touched.
"""

from typing import BinaryIO

from bookvie.domain import InvariantViolation
from bookvie.store import (
    ArchiveRefused,
    CouldntSave,
    LibraryRefused,
    Store,
    load_library,
    referenced_covers,
    stage_archive,
)

from .commit import log
from .contract import couldnt_save, restore_invalid
from .cover import check_decodable
from .intent_model import IntentModel, parse_form_intent


class RestoreIntent(IntentModel):
    """The ``intent`` part of a restore: ``{}``; the file is the ``archive`` part."""


def parse_restore_intent(raw: str | None) -> RestoreIntent:
    """The ``intent`` form part, ``{}``, or 422 on ``intent``."""
    return parse_form_intent(RestoreIntent, raw)


class _Refused(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def restore(store: Store, archive: BinaryIO) -> None:
    """Replace all data with the export in ``archive``, or change nothing."""
    with store.lock:
        try:
            _restore_locked(store, archive)
        finally:
            store.empty_staging(quiet=True)


def _restore_locked(store: Store, archive: BinaryIO) -> None:
    try:
        staged = stage_archive(store, archive)
        try:
            library = load_library(staged.library)
        except LibraryRefused as exc:
            raise _Refused(f"library.json {exc.reason}") from exc
        names = sorted(referenced_covers(library))
        for name in names:
            if name not in staged.covers:
                raise _Refused(f"covers/{name} is missing")
            if not check_decodable(staged.cover_bytes(name)):
                raise _Refused(f"covers/{name} isn't a usable image")
        store.replace_all(library, {name: staged.covers[name] for name in names})
    except ArchiveRefused as exc:
        log(f"couldn't restore: the file {exc.reason}")
        raise restore_invalid() from exc
    except _Refused as exc:
        log(f"couldn't restore: {exc.reason}")
        raise restore_invalid() from exc
    except CouldntSave as exc:
        log(f"couldn't save: {exc}")
        raise couldnt_save(503) from exc
    except InvariantViolation as exc:
        log(f"couldn't save: library rule {exc.rule} failed: {exc.message}")
        raise couldnt_save(500) from exc
