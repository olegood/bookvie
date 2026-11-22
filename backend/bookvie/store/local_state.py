"""``local-state.json``: this machine's own state, never exported (AD-15).

It holds top-level groups, each owned by one writer:

- ``lastExportAt``, the ISO-8601 time (with offset) of the last complete
  export, written by :meth:`Store.record_export`;
- ``autoBackup``, how the daily backup runs went (AD-22, Story 13.3), written
  by ``record_backup_upload``.

Both go through one :class:`LocalStateWriter`, which read-modify-writes only
the group it is given under its own lock (never the AD-4 store lock), so a
write keeps every other key as it read it. Restore never touches the file. A
missing file means no export and no upload yet; a malformed one is logged and
read as empty, and the next write replaces it with the written group alone.
"""

import json
import sys
import threading
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

LOCAL_STATE_NAME = "local-state.json"
LOCAL_STATE_TEMP_PREFIX = "local-state.json.tmp"
LAST_EXPORT_KEY = "lastExportAt"


def _log(message: str) -> None:
    print(f"bookvie: {message}", file=sys.stderr, flush=True)


AUTO_BACKUP_KEY = "autoBackup"


class LocalStateWriter:
    """The one writer of ``local-state.json`` in ``data_dir``.

    ``write(target, data)`` writes the whole file atomically (the store's
    ``_write_atomic``, through its filesystem seam) and raises
    :class:`~bookvie.store.CouldntSave` when it can't.
    """

    def __init__(self, data_dir: Path, write: Callable[[Path, bytes], None]) -> None:
        self.path = Path(data_dir) / LOCAL_STATE_NAME
        self._write = write
        self._lock = threading.Lock()

    def update(self, key: str, change: Callable[[Any], Any]) -> None:
        """Replace the top-level ``key`` with ``change(<its current value or None>)``.

        Every other key is kept as read. A file that isn't a JSON object is
        logged and read as ``{}``; one that can't be read (other than
        missing) is :class:`~bookvie.store.CouldntSave` with nothing
        written, so a key it holds is never lost.
        """
        # Imported here: store.py imports this module.
        from .store import CouldntSave

        with self._lock:
            try:
                raw = self.path.read_bytes()
            except FileNotFoundError:
                doc: dict[str, Any] = {}
            except OSError as exc:
                raise CouldntSave(f"can't read {LOCAL_STATE_NAME}: {exc}") from exc
            else:
                doc = _parse_or_empty(raw)
            doc[key] = change(doc.get(key))
            self._write(self.path, (json.dumps(doc) + "\n").encode("utf-8"))


def _parse_or_empty(raw: bytes) -> dict[str, Any]:
    try:
        doc = json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        _log(f"{LOCAL_STATE_NAME} is not valid JSON ({exc}); replacing it")
        return {}
    if not isinstance(doc, dict):
        _log(f"{LOCAL_STATE_NAME} is not a JSON object; replacing it")
        return {}
    return doc


def read_group(data_dir: Path, key: str) -> Any:
    """The top-level ``key`` of ``local-state.json``, or ``None`` (missing or unreadable).

    Never raises.
    """
    try:
        raw = (Path(data_dir) / LOCAL_STATE_NAME).read_bytes()
        doc = json.loads(raw.decode("utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, ValueError) as exc:
        _log(f"couldn't read {key} from {LOCAL_STATE_NAME}: {exc}")
        return None
    return doc.get(key) if isinstance(doc, dict) else None


def read_last_export(data_dir: Path) -> datetime | None:
    """When the last complete export happened, or ``None`` (none, or unreadable).

    Never raises: anything but a JSON object whose ``lastExportAt`` is an
    ISO-8601 time with an offset is logged and read as ``None``.
    """
    path = Path(data_dir) / LOCAL_STATE_NAME
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        return None
    except OSError as exc:
        _log(f"couldn't read {LOCAL_STATE_NAME} ({exc.strerror}); showing no export")
        return None
    try:
        doc = json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        _log(f"{LOCAL_STATE_NAME} is not valid JSON ({exc}); showing no export")
        return None
    if isinstance(doc, dict) and LAST_EXPORT_KEY not in doc:
        return None  # no export yet, though another group (autoBackup) is stored
    value = doc.get(LAST_EXPORT_KEY) if isinstance(doc, dict) else None
    if not isinstance(value, str):
        _log(f"{LOCAL_STATE_NAME} has no {LAST_EXPORT_KEY} string; showing no export")
        return None
    try:
        when = datetime.fromisoformat(value)
    except ValueError:
        _log(f"{LOCAL_STATE_NAME} has an unreadable {LAST_EXPORT_KEY} {value!r}; showing no export")
        return None
    if when.tzinfo is None or when.utcoffset() is None:
        _log(f"{LOCAL_STATE_NAME} has a {LAST_EXPORT_KEY} without an offset; showing no export")
        return None
    return when
