"""Story 13.1's restore scene, shared by the agent-restore test modules.

:class:`Scene` writes yesterday's library into ``then/`` and backs it up as
``backups/bookvie-backup-2026-11-19.zip``, then writes the library as it grew
since into ``library/``, with a :class:`~tests.helpers.SetClock` at 20 Nov
2026, 10:04 and two clients on one app (the handshake revision, and
2026-07-28 with form elicitation). :class:`FaultIn` fails one step of an
atomic write into one folder. The rest are the small readers and callers the
restore leaves share. Test modules import from here, never from each other.
"""

import json
import threading
import zipfile
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

from bookvie.store import OsFileSystem
from tests.agent_client import (
    FORM_ELICITATION,
    MODERN_PROTOCOL_VERSION,
    RESTORE_BACKUP,
    McpClient,
)
from tests.builder import LibraryBuilder
from tests.helpers import (
    SetClock,
    backup_zip,
    covers_in,
    files_under,
    image_bytes,
    library_bytes,
)

# --- The scene: yesterday's backup, and a library that grew since --------------

NOW = datetime(2026, 11, 20, 10, 4).astimezone()
"""The app's clock (Europe/Madrid, as every test runs): 20 Nov, 10:04."""
BACKUP_AT = datetime(2026, 11, 19, 9, 2).astimezone()
"""When yesterday's daily backup was made: "19 Nov, 09:02"."""
DAILY = "bookvie-backup-2026-11-19.zip"
TODAY_DAILY = "bookvie-backup-2026-11-20.zip"
TODAY_DAILY_AT = datetime(2026, 11, 20, 9, 1).astimezone()
SAFETY_COPY = "bookvie-pre-restore-2026-11-20T1004.zip"
SECOND_SAFETY_COPY = "bookvie-pre-restore-2026-11-20T1004-2.zip"
FROM_DROPBOX = "from-dropbox"

DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
COVER_FILE = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
NOTE_IDS = ("1d0c8e0a-1111-4a2b-8c3d-000000000001", "1d0c8e0a-1111-4a2b-8c3d-000000000002")
ADDED_TITLES = ["Designing Data-Intensive Applications", "Thinking in Systems", "Atomic Habits"]
ADDED_IDS = (
    "2a2a2a2a-0000-4000-8000-000000000001",
    "2a2a2a2a-0000-4000-8000-000000000002",
    "2a2a2a2a-0000-4000-8000-000000000003",
)
NOTES_PER_ADDED_BOOK = 5
LATER_NOTES_ON_PIRANESI = 3
ADDED_CARD_NOTES = len(ADDED_TITLES) * NOTES_PER_ADDED_BOOK + LATER_NOTES_ON_PIRANESI  # 18
THEN = {"books": 2, "cardNotes": 2, "covers": 1}
NOW_COUNTS = {"books": 5, "cardNotes": 2 + ADDED_CARD_NOTES, "covers": 1}

LOCAL_STATE = "local-state.json"
EARLIER_EXPORT = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'

ACCEPT = {"action": "accept", "content": {}}
DECLINE = {"action": "decline"}
CANCEL = {"action": "cancel"}

OUTSIDE_MESSAGE = "bookvie restores only from its backups folder. Nothing was changed."
NOT_CONFIRMED_MESSAGE = "Not restored. Nothing was changed."
SAFETY_COPY_FAILED_MESSAGE = "Couldn't save a safety copy, so nothing was restored."
"""UX-DR81's words for the three new codes: the skill reports the answer's message."""


def write_library(folder: Path, *, grown: bool) -> None:
    """The library as it was at :data:`BACKUP_AT`, or (``grown``) as it is now:
    3 Books and 18 Card notes added since, and Dune's page moved on."""
    builder = LibraryBuilder()
    dune = builder.book(
        id=DUNE_ID, title="Dune", pages=412, cover_file=COVER_FILE, spine_color_from_cover="#A85A4A"
    )
    builder.reading(dune, current_page=120 if grown else 50)
    builder.main(dune)
    piranesi = builder.book(id=PIRANESI_ID, title="Piranesi", pages=272)
    builder.card_note(dune, id=NOTE_IDS[0], text="Fear is the mind-killer.", page_start=10)
    builder.card_note(dune, id=NOTE_IDS[1], text="The spice must flow.", page_start=20)
    if grown:
        for book_id, title in zip(ADDED_IDS, ADDED_TITLES, strict=True):
            builder.book(id=book_id, title=title)
            for n in range(NOTES_PER_ADDED_BOOK):
                builder.card_note(book_id, text=f"{title}, note {n + 1}", page_start=n + 1)
        for n in range(LATER_NOTES_ON_PIRANESI):
            builder.card_note(piranesi, text=f"A later note {n + 1}", page_start=n + 1)
    builder.write(folder)
    (folder / "covers").mkdir(exist_ok=True)
    (folder / COVER_FILE).write_bytes(image_bytes(fmt="JPEG"))


class Scene:
    """A data folder that grew since :data:`DAILY`, the backups folder holding it,
    a :class:`SetClock` at :data:`NOW`, and two clients on one app: ``client`` speaks
    the handshake revision, ``modern`` 2026-07-28 with form elicitation."""

    def __init__(self, tmp_path: Path, connect_mcp: Callable[..., McpClient]) -> None:
        self.tmp_path = tmp_path
        self.data_dir = tmp_path / "library"
        self.backups = tmp_path / "backups"
        self.then = tmp_path / "then"
        write_library(self.then, grown=False)
        self.backup_library = library_bytes(self.then)
        self.backup_covers = covers_in(self.then)
        self.backups.mkdir()
        (self.backups / DAILY).write_bytes(backup_zip(self.then, BACKUP_AT))
        write_library(self.data_dir, grown=True)
        (self.data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
        self.clock = SetClock(NOW)
        self._connect_mcp = connect_mcp
        self.client = self.connect()
        self.modern = self.client.speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)

    def connect(self) -> McpClient:
        """Another app on the same folders and clock: what a restarted server would be."""
        return self._connect_mcp(data_dir=self.data_dir, backups_dir=self.backups, clock=self.clock)

    def path(self, name: str) -> str:
        return str(self.backups / name)

    def kept(self) -> dict[str, dict[str, bytes]]:
        """``library.json``, ``covers/``, ``local-state.json`` and the backups folder, by bytes."""
        data = {
            k: v for k, v in files_under(self.data_dir).items() if not k.startswith(".staging/")
        }
        return {"data": data, "backups": files_under(self.backups)}


def structured(answer: dict[str, Any]) -> dict[str, Any]:
    """A result's structured content, or ``{}`` (an error, or a tool that isn't there)."""
    return answer.get("structuredContent") or {}


def tool_error(answer: dict[str, Any]) -> dict[str, Any]:
    """The AD-9 error object of an ``isError`` result; for a JSON-RPC error, its message as
    ``code``, so a red leaf names what came back."""
    if "rpcError" in answer:
        return {"code": answer["rpcError"].get("message")}
    if answer.get("isError") is not True:
        return {"code": f"not an error: {json.dumps(answer)[:200]}"}
    return json.loads(answer["content"][0]["text"])


def retry_with(asked: dict[str, Any]) -> tuple[str, str | None]:
    """The key of an ``InputRequiredResult``'s one input request and its ``requestState``.

    Opaque on purpose: no assertion, so a leaf reaches its criterion first.
    """
    return next(iter(asked.get("inputRequests") or {}), "confirm"), asked.get("requestState")


def confirm(client: McpClient, path: str, response: dict[str, Any] = ACCEPT) -> dict[str, Any]:
    """``restore_backup`` asked, then answered with ``response`` on its own token."""
    asked = client.answer(RESTORE_BACKUP, {"path": path})
    key, state = retry_with(asked)
    return client.answer(
        RESTORE_BACKUP, {"path": path}, input_responses={key: response}, request_state=state
    )


def within(seconds: float, call: Callable[[], Any]) -> Any:
    """``call()``'s value, failing if it hasn't returned after ``seconds`` (a deadlock)."""
    box: dict[str, Any] = {}

    def run() -> None:
        try:
            box["value"] = call()
        except BaseException as exc:  # noqa: BLE001 - re-raised in the test's thread
            box["error"] = exc

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    worker.join(seconds)
    assert not worker.is_alive(), f"didn't finish in {seconds} s: is the store lock taken twice?"
    if "error" in box:
        raise box["error"]
    return box["value"]


def members(path: Path) -> dict[str, bytes]:
    with zipfile.ZipFile(path) as archive:
        return {i.filename: archive.read(i) for i in archive.infolist() if not i.is_dir()}


class FaultIn(OsFileSystem):
    """Fails one step of an atomic write whose file lies directly in ``folder``; ``write``
    writes half first. Every other write passes, so one folder's write can fail alone."""

    def __init__(self, folder: Path, fail_at: str) -> None:
        self.folder = Path(folder).resolve()
        self.fail_at = fail_at
        self._fds: set[int] = set()

    def _here(self, path: Path) -> bool:
        return Path(path).resolve() == self.folder

    def _fail(self, step: str) -> None:
        if step == self.fail_at:
            raise OSError(5, f"injected {step} fault in {self.folder.name}/")

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        if self._here(directory):
            self._fail("create_temp")
        fd, temp = super().create_temp(directory, prefix)
        if self._here(directory):
            self._fds.add(fd)
        return fd, temp

    def write(self, fd: int, data: bytes) -> None:
        if fd in self._fds and self.fail_at == "write":
            super().write(fd, data[: len(data) // 2])
            self._fail("write")
        super().write(fd, data)

    def fsync(self, fd: int) -> None:
        if fd in self._fds:
            self._fail("fsync")
        super().fsync(fd)

    def close(self, fd: int) -> None:
        super().close(fd)
        if fd in self._fds:
            self._fail("close")

    def replace(self, src: Path, dst: Path) -> None:
        if self._here(Path(dst).parent):
            self._fail("replace")
        super().replace(src, dst)

    def fsync_dir(self, directory: Path) -> None:
        if self._here(directory):
            self._fail("fsync_dir")
        super().fsync_dir(directory)
