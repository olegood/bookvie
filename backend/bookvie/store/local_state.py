"""``local-state.json``: this machine's own state, never exported (AD-15).

It holds ``{"lastExportAt": "<ISO-8601 with offset>"}``, written by
:meth:`Store.record_export` after a complete export download. Restore never
touches it. A missing file means no export yet; a malformed one is logged and
read as no export, and the next export overwrites it.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

LOCAL_STATE_NAME = "local-state.json"
LOCAL_STATE_TEMP_PREFIX = "local-state.json.tmp"
LAST_EXPORT_KEY = "lastExportAt"


def _log(message: str) -> None:
    print(f"bookvie: {message}", file=sys.stderr, flush=True)


def local_state_bytes(last_export_at: datetime) -> bytes:
    """The bytes :meth:`Store.record_export` writes."""
    return (json.dumps({LAST_EXPORT_KEY: last_export_at.isoformat()}) + "\n").encode("utf-8")


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
