"""Helpers the test modules share; import from here, never from another test module.

- The app under test: :data:`BASE_URL` and :func:`api_client`.
- The intent paths, the fake :data:`TODAY`, and the intents the panels send:
  :data:`VALID` (New book), :data:`DUNE_FORM` and :data:`VALID_FORM`
  (Edit book), plus :data:`DUNE`, :data:`DUNE_ID` and :data:`DUNE_ISBN13`
  as the builder seeds Dune.
- Answers: :data:`COULDNT_SAVE_BODY` and :func:`field_messages`.
- The data folder as stored: :func:`library_bytes`, :func:`stored_books`,
  :func:`stored_book`, :func:`assert_invariants`.
- Faults and covers: :class:`FaultyFs`, :func:`image_bytes` (by default a
  :data:`RED_ORANGE` PNG), :func:`seed_dune_with_cover`.
- The lock's order of events: :class:`RecordingLock`.
- Restore: :data:`RESTORE`, :func:`post_restore`, :func:`zip_archive`,
  :func:`covers_in`, :func:`staging_in` and :class:`RecordingFs`.
- The skills' step 1 (Epic 12 retro item 84): :data:`PROBE_PORTS`,
  :data:`OLDER_BOOKVIE`, :func:`curl_lines`, :func:`is_health_or_probe` and
  :func:`check_the_older_bookvie_probe`.
- Backups (Epic 13): :class:`SetClock`, :func:`files_under`,
  :func:`dropbox_content_hash`, :func:`backup_zip`, :func:`short_when`,
  :func:`confirmation_text`, :func:`failing_reasons` and :func:`restore_outcomes`.
- The generated client types and the stored Book's shape: :data:`SCHEMA_D_TS`,
  :func:`schema_block` and :data:`STORED_BOOK_KEYS`.
"""

import hashlib
import io
import json
import os
import re
import shlex
import threading
import zipfile
from collections.abc import Collection, Sequence
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from fastapi.testclient import TestClient
from PIL import Image

from bookvie.domain import Library, check_invariants
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from bookvie.store import COVERS_DIR, LIBRARY_NAME, OsFileSystem, Store, referenced_covers
from tests.agent_client import McpClient
from tests.builder import LibraryBuilder

# The Host guard accepts only this server's own Host (see test_guard.py).
BASE_URL = "http://127.0.0.1:8765"

ADD_BOOK = "/api/intents/add-book"
EDIT_BOOK = "/api/intents/edit-book"
DELETE_BOOK = "/api/intents/delete-book"
SET_SPINE_COLOR = "/api/intents/set-spine-color"
START_READING = "/api/intents/start-reading"
EDIT_PURPOSE = "/api/intents/edit-purpose"
UPDATE_PAGE = "/api/intents/update-page"
FINISH_READING = "/api/intents/finish-reading"
PAUSE = "/api/intents/pause"
SET_UP_NEXT = "/api/intents/set-up-next"
MARK_SIDE_READ = "/api/intents/mark-side-read"
UNMARK_SIDE_READ = "/api/intents/unmark-side-read"
ADD_CARD_NOTE = "/api/intents/add-card-note"
EDIT_CARD_NOTE = "/api/intents/edit-card-note"
DELETE_CARD_NOTE = "/api/intents/delete-card-note"

# Card note Page parsing (Stories 5.1, 5.2): every form the server accepts, as
# (typed, pageStart, pageEnd), and every refusal on a 330-page Book, as (typed, message).

PAGE_FORMS = [
    ("42", 42, None),
    ("42–45", 42, 45),
    ("42-45", 42, 45),
    ("42 – 45", 42, 45),
    ("p.42", 42, None),
    ("pp. 42–45", 42, 45),
    ("42–42", 42, None),
]


OUT_OF_RANGE = "Page must be between 1 and 330."
REVERSED = "The first page must come before the last."
ONE_RANGE = "Use one page or one range."
PAGE_REQUIRED = "Page is required."
NOTE_REQUIRED = "Note is required."

PAGE_REFUSALS = [
    ("0", OUT_OF_RANGE),
    ("331", OUT_OF_RANGE),
    ("42–400", OUT_OF_RANGE),
    ("45–42", REVERSED),
    ("42–45, 50–52", ONE_RANGE),
    ("42, 50", ONE_RANGE),
    ("abc", ONE_RANGE),
    ("p.", ONE_RANGE),
    ("42 to", ONE_RANGE),
    ("", PAGE_REQUIRED),
    ("   ", PAGE_REQUIRED),
]

# The fake today. Year may be at most next year (2027); Finished on at most today.
TODAY = date(2026, 10, 30)

COULDNT_SAVE_BODY = {
    "error": {"kind": "couldnt_save", "code": "couldnt_save", "message": COULDNT_SAVE_MESSAGE}
}
"""The whole body of a 500 or 503 ``couldnt_save``: nothing was committed."""

# Only the required fields, as the New book panel sends them (Edition omitted).
VALID = {
    "title": "The Dispossessed",
    "pages": "387",
    "authors": "Ursula K. Le Guin",
    "language": "English",
    "publisher": "Harper",
    "type": "paperback",
}

# Ace's Dune, as stored.
DUNE_ISBN13 = "9780441172719"
DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"

# Dune as the builder seeds it (snake_case) and as the Edit book panel
# prefills it (camelCase form strings). Edition 1, so the panel sends "1".
DUNE = {
    "title": "Dune",
    "authors": ["Frank Herbert"],
    "pages": 412,
    "language": "English",
    "publisher": "Chilton Books",
    "isbn": DUNE_ISBN13,
    "year": 1965,
}
DUNE_FORM = {
    "title": "Dune",
    "subtitle": "",
    "pages": "412",
    "authors": "Frank Herbert",
    "edition": "1",
    "language": "English",
    "publisher": "Chilton Books",
    "type": "paperback",
    "isbn": DUNE_ISBN13,
    "year": "1965",
    "finishedOn": "",
    "tags": "",
    "spineColor": "",
}
# VALID (The Dispossessed) as the Edit book panel prefills it.
VALID_FORM = {**DUNE_FORM, **VALID, "isbn": "", "year": ""}

# A second Book for edit-book's duplicate and floor tests, and its Edit book form.
NEUROMANCER = {"title": "Neuromancer", "authors": ["William Gibson"], "pages": 271}
NEUROMANCER_FORM = {
    **DUNE_FORM,
    "title": "Neuromancer",
    "pages": "271",
    "authors": "William Gibson",
    "publisher": "Publisher",
    "isbn": "",
    "year": "",
}

# A saturated red-orange: hue ~8°, lightness 0.47, saturation 0.67 (capped to 0.45).
RED_ORANGE = (200, 60, 40)


class FaultyFs(OsFileSystem):
    """Fails at one step of a commit; ``write`` fails after writing half."""

    def __init__(self, fail_at: str) -> None:
        self.fail_at = fail_at

    def _maybe_fail(self, step: str) -> None:
        if step == self.fail_at:
            raise OSError(5, f"injected {step} fault")

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        self._maybe_fail("create_temp")
        return super().create_temp(directory, prefix)

    def write(self, fd: int, data: bytes) -> None:
        if self.fail_at == "write":
            super().write(fd, data[: len(data) // 2])
        self._maybe_fail("write")
        super().write(fd, data)

    def fsync(self, fd: int) -> None:
        self._maybe_fail("fsync")
        super().fsync(fd)

    def close(self, fd: int) -> None:
        super().close(fd)
        self._maybe_fail("close")

    def replace(self, src: Path, dst: Path) -> None:
        self._maybe_fail("replace")
        super().replace(src, dst)

    def fsync_dir(self, directory: Path) -> None:
        self._maybe_fail("fsync_dir")
        super().fsync_dir(directory)

    def remove(self, path: Path) -> None:
        self._maybe_fail("remove")
        super().remove(path)


class RecordingLock:
    """A ``threading.Lock`` that logs each acquire and release into ``log``."""

    def __init__(self, log: list[str]) -> None:
        self._lock = threading.Lock()
        self._log = log

    def acquire(self, blocking: bool = True, timeout: float = -1) -> bool:
        got = self._lock.acquire(blocking, timeout)
        if got:
            self._log.append("lock acquired")
        return got

    def release(self) -> None:
        self._log.append("lock released")
        self._lock.release()

    def locked(self) -> bool:
        return self._lock.locked()

    __enter__ = acquire

    def __exit__(self, *exc: object) -> None:
        self.release()


def api_client(
    data_dir: Path,
    fs: FaultyFs | None = None,
    *,
    raise_server_exceptions: bool = False,
    today: date = TODAY,
    dev: bool = False,
) -> TestClient:
    """The app on the library in ``data_dir``, today pinned to ``today`` (:data:`TODAY`);
    a ``--dev`` app with ``dev``.

    ``fs`` injects faults into intents, not startup. By default an unexpected
    exception becomes the app's 500, as a browser would see it; view tests
    pass ``raise_server_exceptions=True`` to fail on the traceback instead.
    """
    store = Store.open(data_dir)
    if fs is not None:
        store.fs = fs
    app = create_app(
        data_dir / "no-static", data_dir=data_dir, store=store, clock=FakeClock(today), dev=dev
    )
    return TestClient(app, base_url=BASE_URL, raise_server_exceptions=raise_server_exceptions)


def library_bytes(data_dir: Path) -> bytes:
    return (data_dir / "library.json").read_bytes()


def stored_books(data_dir: Path) -> list[dict[str, Any]]:
    return json.loads(library_bytes(data_dir))["books"]


def stored_book(data_dir: Path, book_id: str) -> dict[str, Any]:
    (book,) = [b for b in stored_books(data_dir) if b["id"] == book_id]
    return book


def stored_readings(data_dir: Path, book_id: str) -> list[dict[str, Any]]:
    return stored_book(data_dir, book_id)["readings"]


def post_edit_book(
    client: TestClient, book_id: str, form: dict[str, Any], **changes: Any
) -> httpx.Response:
    """``edit-book`` for ``book_id``: the prefilled ``form`` with ``changes``."""
    intent = {"bookId": book_id, **form, **changes}
    return client.post(EDIT_BOOK, files={"intent": (None, json.dumps(intent), "application/json")})


def post_set_spine_color(client: TestClient, book_id: str, color: str | None) -> httpx.Response:
    """``set-spine-color`` as a swatch (``#RRGGBB``) or "From cover" (``None``) sends it."""
    intent = {"bookId": book_id, "spineColor": color}
    return client.post(
        SET_SPINE_COLOR,
        files={"intent": (None, json.dumps(intent), "application/json")},
    )


def assert_invariants(data_dir: Path) -> None:
    check_invariants(Library.model_validate_json(library_bytes(data_dir)))


def field_messages(response: httpx.Response) -> dict[str, str]:
    return {f["field"]: f["message"] for f in response.json()["error"]["fields"]}


def image_bytes(
    size: tuple[int, int] = (40, 60),
    color: tuple[int, ...] = RED_ORANGE,
    *,
    mode: str = "RGB",
    fmt: str = "PNG",
    **save: Any,
) -> bytes:
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save)
    return buffer.getvalue()


def seed_dune_with_cover(data_dir: Path) -> str:
    """Dune with a stored cover (written as Story 1.13 would); returns ``coverFile``.

    ``spineColorFromCover`` is a fixed placeholder, not the color the stored
    image would give.
    """
    cover_file = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=cover_file,
        spine_color_from_cover="#A85A4A",
    )
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / cover_file).write_bytes(image_bytes(fmt="JPEG"))
    return cover_file


# --- Restore (Stories 2.2 and 2.3) --------------------------------------------

RESTORE = "/api/intents/restore"


def zip_archive(entries: dict[str, bytes | None]) -> bytes:
    """A hand-made archive, entries in order: ``None`` is a directory entry."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in entries.items():
            if data is None:
                archive.mkdir(name.rstrip("/"))
            else:
                archive.writestr(name, data)
    return buffer.getvalue()


def post_restore(client: TestClient, archive: bytes) -> httpx.Response:
    """One restore intent, as the Backup page sends it: ``intent`` ``{}`` plus ``archive``."""
    return client.post(
        RESTORE,
        files={
            "intent": (None, "{}", "application/json"),
            "archive": ("bookvie-export-2026-10-30.zip", archive, "application/zip"),
        },
    )


def covers_in(data_dir: Path) -> dict[str, bytes]:
    """Every file in ``covers/``, by name."""
    return {p.name: p.read_bytes() for p in sorted((data_dir / "covers").iterdir())}


def staging_in(data_dir: Path) -> list[str]:
    """The names directly inside ``.staging/``."""
    return sorted(p.name for p in (data_dir / ".staging").iterdir())


class RecordingFs(OsFileSystem):
    """Logs each rename and delete as ``"<op> <path relative to data_dir>"``."""

    def __init__(self, data_dir: Path, log: list[str]) -> None:
        self.data_dir = data_dir
        self.log = log

    def _note(self, op: str, path: Path) -> None:
        relative = Path(os.path.relpath(path, self.data_dir)).as_posix()
        self.log.append(f"{op} {relative}")

    def replace(self, src: Path, dst: Path) -> None:
        super().replace(src, dst)
        self._note("replace", dst)

    def remove(self, path: Path) -> None:
        super().remove(path)
        self._note("remove", path)


EMPTY_LIBRARY = (
    b'{\n  "schemaVersion": 3,\n  "mainBookId": null,\n  "upNextBookId": null,\n'
    b'  "sideReadBookIds": [],\n  "books": []\n}\n'
)


def temp_files(data_dir: Path) -> list[Path]:
    """The commit's temporary files left in the data folder."""
    return sorted(data_dir.glob("library.json.tmp*"))


def seeded_store(data_dir: Path, fs: OsFileSystem | None = None) -> Store:
    """A store over a data folder seeded with one untagged Dune."""
    builder = LibraryBuilder()
    builder.book(title="Dune", tags=[])
    builder.write(data_dir)
    return Store.open(data_dir, fs=fs)


# Epic 12 retro item 84: after `/api/health`, step 1 of the two bookvie skills asks the
# entry's port for `get_app_info` at `/mcp`. A bookvie from before the agent tools
# answers 405 (or 404, or nothing), and the skill says so and stops, instead of the
# reconnect and setup advice.
PROBE_PORTS = {"bookvie": 8765, "bookvie-dev": 8766}
OLDER_BOOKVIE = "An older bookvie is running: stop it and start the new one."
INSTALLED_IS_OLDER = (
    "If you started bookvie yourself in this step, the installed `bookvie` is older: "
    "tell the user instead to update it with `npm run install:local` (the README's Updating), and stop."
)


def curl_lines(text: str) -> list[str]:
    """``curl`` or ``wget`` command lines, not the words in prose ("makes no `curl` call")."""
    return re.findall(r"\b(?:curl|wget)\s+(?:-|https?://)[^\n`]*", text)


def _probe_port(line: str) -> int | None:
    """The port a curl line probes: a POST of ``tools/call get_app_info`` to ``/mcp``."""
    found = re.search(r"-X POST http://127\.0\.0\.1:(\d+)/mcp\s", line)
    if found is None or '"method":"tools/call"' not in line:
        return None
    return int(found.group(1)) if '"params":{"name":"get_app_info"' in line else None


def is_health_or_probe(line: str) -> bool:
    """Whether a curl line is the health check or the ``get_app_info`` probe."""
    health = re.fullmatch(r"curl -fsS http://127\.0\.0\.1:(?:8765|8766)/api/health\s*", line)
    return health is not None or _probe_port(line) is not None


def check_the_older_bookvie_probe(
    skill: str,
    start_step_title: str,
    client: McpClient,
    *,
    ports: Collection[int] | None = None,
) -> None:
    """Step 1 probes each entry's port after the health check, and stops on an
    older bookvie before the reconnect advice; the probe's headers and body,
    sent to this checkout's ``/mcp``, answer 200 with the app info.

    ``ports`` are the ports the skill probes, one probe each: by default both
    entries' (:data:`PROBE_PORTS`); ``bookvie-backup`` probes only 8765 (Story 13.4)."""
    # Imported here: test_agent_mount imports this module.
    from tests.test_agent_mount import _section

    step = _section(skill, start_step_title, numbered=True)
    assert step is not None, start_step_title
    probes = [(line, port) for line in curl_lines(skill) if (port := _probe_port(line))]
    expected = PROBE_PORTS.values() if ports is None else ports
    assert sorted(port for _, port in probes) == sorted(expected), probes
    assert all(line in step for line, _ in probes), "every probe is in step 1"

    # The order: health check, then the probe, then the older-bookvie stop, then reconnect.
    health = step.index("curl -fsS http://127.0.0.1:8765/api/health")
    probe = min(step.index(line) for line, _ in probes)
    older = step.index(OLDER_BOOKVIE)
    reconnect = step.index("choose reconnect")
    assert health < probe < older < reconnect

    # Only 405, 404 or 000 mean an older bookvie: the message, a stop, and no reconnect
    # or setup advice. Any other code is reported as it is. A bookvie the skill started
    # itself is the installed one, so that one needs updating. The skill never stops or
    # restarts bookvie itself.
    stop = " ".join(step[probe:reconnect].split())
    assert re.search(
        r"It prints `200` when bookvie has the agent tools\. `405` or `404`, or `000` when "
        r"it doesn't answer, means an older bookvie",
        stop,
    )
    assert f'Tell the user "{OLDER_BOOKVIE}" and stop.' in stop
    assert INSTALLED_IS_OLDER in stop
    assert re.search(
        r"Any other code: tell the user the code bookvie answered and stop, without the "
        r"older-bookvie message",
        stop,
    )
    assert (
        "In each of these cases, don't give the reconnect or `claude mcp add` advice below" in stop
    )
    assert "Don't stop or restart bookvie yourself." in stop

    # The probe's headers and body, sent to this checkout's `/mcp`: 200 and the app info.
    for line, _ in probes:
        words = shlex.split(line)
        assert words[words.index("-o") + 1] == "/dev/null", line
        assert "-m" in words, line
        assert words[words.index("-w") + 1] == "%{http_code}\\n", line
        headers = dict(words[i + 1].split(": ", 1) for i, word in enumerate(words) if word == "-H")
        body = words[words.index("-d") + 1]
        answer = client.http.post(client.path, content=body, headers=headers)
        assert answer.status_code == 200, (line, answer.text)
        result = answer.json()["result"]
        assert result["isError"] is False
        assert set(result["structuredContent"]) >= {"version", "mode"}, result


# --- Backups (Epic 13) ---------------------------------------------------------


class SetClock:
    """A clock that reads one instant until it is moved (AD-20); ``today`` follows ``now``."""

    def __init__(self, at: datetime) -> None:
        if at.tzinfo is None:
            raise ValueError("SetClock needs an aware datetime")
        self.at = at

    def now(self) -> datetime:
        return self.at

    def today(self) -> date:
        return self.at.date()

    def advance(self, by: timedelta) -> None:
        self.at = self.at + by


def files_under(folder: Path) -> dict[str, bytes]:
    """Every file under ``folder``, by relative POSIX path, with its bytes; ``{}`` if it's missing."""
    if not folder.exists():
        return {}
    return {
        path.relative_to(folder).as_posix(): path.read_bytes()
        for path in sorted(folder.rglob("*"))
        if path.is_file()
    }


DROPBOX_BLOCK = 4 * 1024 * 1024
"""Dropbox hashes a file in 4 MiB blocks."""


def dropbox_content_hash(data: bytes) -> str:
    """Dropbox's content hash, in hex: SHA-256 over the SHA-256 of each 4 MiB block (AD-22)."""
    blocks = b"".join(
        hashlib.sha256(data[start : start + DROPBOX_BLOCK]).digest()
        for start in range(0, len(data), DROPBOX_BLOCK)
    )
    return hashlib.sha256(blocks).hexdigest()


def backup_zip(data_dir: Path, at: datetime) -> bytes:
    """An export of ``data_dir`` as an older bookvie wrote it: ``library.json`` (its entry
    stamped ``at`` in local time, with no time zone), ``covers/`` and each referenced cover."""
    library = (data_dir / LIBRARY_NAME).read_bytes()
    stamp = at.astimezone().timetuple()[:6]
    names = sorted(referenced_covers(Library.model_validate_json(library)))
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(
            zipfile.ZipInfo(LIBRARY_NAME, date_time=stamp), library, zipfile.ZIP_DEFLATED
        )
        archive.mkdir(COVERS_DIR)
        for name in names:
            archive.writestr(
                zipfile.ZipInfo(f"{COVERS_DIR}/{name}", date_time=stamp),
                (data_dir / COVERS_DIR / name).read_bytes(),
            )
    return buffer.getvalue()


def short_when(at: datetime, today: date) -> str:
    """A backup's time as EXPERIENCE.md names it: "19 Nov, 09:02", "19 Nov 2025, 09:02"
    when it isn't this year (Foundation, Dates; Agent conversations)."""
    local = at.astimezone()
    day = f"{local.day} {local:%b}" + ("" if local.year == today.year else f" {local.year}")
    return f"{day}, {local:%H:%M}"


def confirmation_text(at: datetime, titles: Sequence[str], card_notes: int, today: date) -> str:
    """UX-DR80's confirmation, as bookvie's question must word it for this preview.

    Up to 5 titles, then "and N more"; "1 book", "1 card note". With nothing
    added, the "every change goes back" variant. UX-DR80 words neither "books
    added but no card notes" nor the reverse, so those raise.
    """
    when = short_when(at, today)
    tail = "A safety copy of your current library is saved first."
    if not titles and card_notes == 0:
        return (
            f"Replace all data with the backup from {when}? "
            f"Every change since then goes back, such as pages reached. {tail}"
        )
    if not titles or card_notes == 0:
        raise ValueError("UX-DR80 doesn't word a preview with only books or only card notes added")
    shown = ", ".join(titles[:5]) + (f", and {len(titles) - 5} more" if len(titles) > 5 else "")
    books = "1 book" if len(titles) == 1 else f"{len(titles):,} books"
    notes = "1 card note" if card_notes == 1 else f"{card_notes:,} card notes"
    return (
        f"Replace all data with the backup from {when}? You'd lose {books} added since "
        f"({shown}), {notes}, and every other change since then. {tail}"
    )


EXPERIENCE_MD = (
    Path(__file__).resolve().parents[2]
    / "_bmad-output"
    / "planning-artifacts"
    / "ux-designs"
    / "ux-bookvie-2026-10-28"
    / "EXPERIENCE.md"
)
_FAILING_ROW = re.compile(r'^\| [^|]+ \| "([^"]+)" \|\s*$')


def failing_reasons() -> list[str]:
    """EXPERIENCE.md's Failed reasons, in the table's order, each as quoted after
    "failed *when* · " (the Dropbox backup line's words, which the backup skill's "Failed: "
    line repeats, UX-DR82). The rows follow AD-22's cause order: ``dropbox_signin``,
    ``upload_incomplete``, ``dropbox_full``, ``backup_write``, ``other``."""
    text = EXPERIENCE_MD.read_text(encoding="utf-8")
    header = text.find('| Cause | After "failed *when* · " |')
    assert header != -1, "no Failed reasons table in EXPERIENCE.md"
    reasons: list[str] = []
    for line in text[header:].splitlines()[2:]:
        row = _FAILING_ROW.match(line)
        if row is None:
            break
        reasons.append(row.group(1))
    return reasons


_OUTCOME_ROW = re.compile(r"^\| ([^|]+?) \| (.+?) \|\s*$")


def restore_outcomes() -> dict[str, list[str]]:
    """EXPERIENCE.md's Restore outcomes (Agent conversations, Restore, step 4; UX-DR81),
    in the table's order: each row's Outcome cell, mapped to the texts its Text cell
    quotes, in order. "Not restored. Nothing was changed." comes before the terminal
    advice, and a template keeps its ``*reason*``."""
    text = EXPERIENCE_MD.read_text(encoding="utf-8")
    header = text.find("| Outcome | Text |")
    assert header != -1, "no Restore outcome table in EXPERIENCE.md"
    outcomes: dict[str, list[str]] = {}
    for line in text[header:].splitlines()[2:]:
        row = _OUTCOME_ROW.match(line)
        if row is None:
            break
        outcomes[row.group(1)] = re.findall(r'"([^"]+)"', row.group(2))
    return outcomes


SCHEMA_D_TS = Path(__file__).resolve().parents[2] / "frontend/src/api/generated/schema.d.ts"
"""The client types ``npm --prefix frontend run api:gen`` writes from the OpenAPI document."""


def schema_block(name: str) -> str:
    """The body of ``schema.d.ts``'s ``<name>: { … };`` under ``components.schemas``."""
    text = SCHEMA_D_TS.read_text(encoding="utf-8")
    match = re.search(rf"^ {{8}}{re.escape(name)}: \{{\n(.*?)^ {{8}}\}};$", text, re.M | re.S)
    assert match is not None, f"no {name} in schema.d.ts"
    return match.group(1)


STORED_BOOK_KEYS = frozenset(
    {
        "id",
        "createdAt",
        "ownership",
        "title",
        "subtitle",
        "authors",
        "pages",
        "edition",
        "language",
        "publisher",
        "type",
        "isbn",
        "year",
        "tags",
        "coverFile",
        "spineColorUser",
        "spineColorFromCover",
        "spineColorCurated",
        "spineColor",
        "readings",
        "cardNotes",
    }
)
"""A stored Book's 21 keys in ``library.json`` (a backup carries the file as is)."""
