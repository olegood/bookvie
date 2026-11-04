"""Export all data (FR-22, AD-4, AD-14, AD-15).

:func:`build_export` packages the data folder into one zip while holding the
AD-4 lock, so the snapshot is consistent with every intent: exactly
``library.json`` (the bytes on disk, deflated), the ``covers/`` directory
entry and ``covers/<name>`` for every cover the library references (stored
without compression: they are already compressed images). It goes into a spooled temp file (in memory up to
:data:`SPOOL_MEMORY_LIMIT`, then on disk); the caller sends it after the lock
is released. Any read failure is 503 ``couldnt_export`` before anything is
sent.

:func:`record_export` writes "Last export" into ``local-state.json`` once a
download has gone out completely. A failure there is only logged: the
download already succeeded.
"""

import os
import shutil
import time
import zipfile
from datetime import date
from tempfile import SpooledTemporaryFile

from bookvie.domain import Clock
from bookvie.store import COVERS_DIR, LIBRARY_NAME, Store, referenced_covers

from .commit import log
from .contract import couldnt_export

SPOOL_MEMORY_LIMIT = 10 * 1024 * 1024
"""Up to 10 MiB the zip stays in memory; past that it spills to a temp file."""
EXPORT_CHUNK = 64 * 1024
"""The size of each body message the export is sent in."""

_ZIP_ERRORS = (OSError, zipfile.BadZipFile, zipfile.LargeZipFile)
_ZIP_EPOCH = (1980, 1, 1, 0, 0, 0)
"""The earliest time a zip entry can carry."""


def _zip_time(seconds: float | None = None) -> tuple[int, int, int, int, int, int]:
    """Local ``date_time`` for a zip entry, clamped to 1980 (an older mtime would raise)."""
    stamp = tuple(time.localtime(seconds)[:6])
    return max(stamp, _ZIP_EPOCH)  # type: ignore[return-value]


def export_filename(today: date) -> str:
    """``bookvie-export-<YYYY-MM-DD>.zip``."""
    return f"bookvie-export-{today.isoformat()}.zip"


def _write_zip(store: Store, out: SpooledTemporaryFile) -> None:
    with zipfile.ZipFile(out, "w", strict_timestamps=False) as archive:
        library = store.path.read_bytes()
        archive.writestr(
            zipfile.ZipInfo(LIBRARY_NAME, date_time=_zip_time()),
            library,
            compress_type=zipfile.ZIP_DEFLATED,
        )
        archive.mkdir(COVERS_DIR)
        covers = store.data_dir / COVERS_DIR
        for name in sorted(referenced_covers(store.library)):
            with open(covers / name, "rb") as source:
                stat = os.fstat(source.fileno())
                info = zipfile.ZipInfo(f"{COVERS_DIR}/{name}", date_time=_zip_time(stat.st_mtime))
                info.compress_type = zipfile.ZIP_STORED
                info.file_size = stat.st_size
                with archive.open(info, "w") as target:
                    shutil.copyfileobj(source, target, EXPORT_CHUNK)


def build_export(store: Store) -> SpooledTemporaryFile:
    """The export zip, rewound to its start; 503 ``couldnt_export`` when it can't be built.

    Built while holding ``store.lock`` and returned after it is released.
    The caller owns (and closes) the file.
    """
    out = SpooledTemporaryFile(max_size=SPOOL_MEMORY_LIMIT)  # noqa: SIM115 - returned to the caller
    try:
        with store.lock:
            _write_zip(store, out)
        out.seek(0)
    except _ZIP_ERRORS as exc:
        out.close()
        log(f"couldn't export: {exc}")
        raise couldnt_export() from exc
    except BaseException:
        out.close()
        raise
    return out


def record_export(store: Store, clock: Clock) -> None:
    """Record a complete export as "Last export"; a failure is logged, never raised."""
    try:
        store.record_export(clock.now())
    except Exception as exc:  # noqa: BLE001 - the download already succeeded
        log(f"couldn't record the export in local-state.json: {exc}")
