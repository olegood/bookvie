"""Story 13.1: edges of the agent restore that ``test_agent_restore.py`` doesn't reach.

The backup time's seconds come from the zip's 0x5455 field, a symlinked
``from-dropbox/`` stays outside the allowed files, a symlinked backups folder
lists the paths a restore resolves, and two tokens the gate must refuse with
the right reason. Every test passes its own ``backups_dir``, under ``tmp_path``.
"""

import io
import json
import zipfile
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

from tests.agent_client import (
    EXPORT_BACKUP,
    FORM_ELICITATION,
    LIST_LOCAL_BACKUPS,
    MODERN_PROTOCOL_VERSION,
    PREVIEW_RESTORE,
    RESTORE_BACKUP,
    McpClient,
)
from tests.builder import LibraryBuilder
from tests.helpers import SetClock, backup_zip, image_bytes, library_bytes

NOW = datetime(2026, 11, 20, 10, 4).astimezone()
BACKUP_AT = datetime(2026, 11, 19, 9, 2).astimezone()
DAILY = "bookvie-backup-2026-11-19.zip"
ACCEPT = {"action": "accept", "content": {}}
DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"


def _library(folder: Path, *titles: str) -> None:
    """Dune (the same id in every library), plus ``titles`` added since."""
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, title="Dune")
    for title in titles:
        builder.book(title=title)
    builder.write(folder)


def _structured(answer: dict[str, Any]) -> dict[str, Any]:
    return answer.get("structuredContent") or {}


def _error(answer: dict[str, Any]) -> dict[str, Any]:
    if "rpcError" in answer:
        return {"code": answer["rpcError"].get("message")}
    if answer.get("isError") is not True:
        return {"code": f"not an error: {json.dumps(answer)[:200]}"}
    return json.loads(answer["content"][0]["text"])


def _modern(client: McpClient) -> McpClient:
    return client.speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)


def _accept(client: McpClient, path: str) -> dict[str, Any]:
    asked = client.answer(RESTORE_BACKUP, {"path": path})
    key = next(iter(asked.get("inputRequests") or {}), "confirm")
    return client.answer(
        RESTORE_BACKUP,
        {"path": path},
        input_responses={key: ACCEPT},
        request_state=asked.get("requestState"),
    )


def test_the_backup_time_keeps_its_seconds(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-2: a zip's date_time holds even seconds only; 37 s comes from the 0x5455 field.
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    _library(data_dir)
    clock = SetClock(datetime(2026, 11, 19, 9, 2, 37).astimezone())
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=clock)
    client.call_tool(EXPORT_BACKUP)

    (entry,) = _structured(client.answer(LIST_LOCAL_BACKUPS))["backups"]

    when = datetime.fromisoformat(entry["backupTime"])
    assert when == clock.now() and when.second == 37, entry


def test_a_symlinked_from_dropbox_folder_is_outside_the_backups(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-1, AC-4: from-dropbox/ linked elsewhere is neither listed nor restorable.
    data_dir, backups, then = tmp_path / "library", tmp_path / "backups", tmp_path / "then"
    _library(data_dir, "Piranesi")
    _library(then)
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / DAILY).write_bytes(backup_zip(then, BACKUP_AT))
    backups.mkdir()
    (backups / "from-dropbox").symlink_to(elsewhere, target_is_directory=True)
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    before = library_bytes(data_dir)
    path = str(backups / "from-dropbox" / DAILY)

    for tool in (PREVIEW_RESTORE, RESTORE_BACKUP):
        refused = _error(_modern(client).answer(tool, {"path": path}))
        assert refused.get("code") == "restore_outside_backups", (tool, refused)

    assert _structured(client.answer(LIST_LOCAL_BACKUPS)) == {"backups": []}
    assert library_bytes(data_dir) == before
    assert sorted(p.name for p in elsewhere.iterdir()) == [DAILY]


def test_a_symlinked_backups_folder_lists_the_paths_a_restore_resolves(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-1, AC-7: ~/bookvie-backups may be a link to another disk.
    data_dir, then = tmp_path / "library", tmp_path / "then"
    _library(data_dir, "Piranesi")
    _library(then)
    real = tmp_path / "real-backups"
    real.mkdir()
    (real / DAILY).write_bytes(backup_zip(then, BACKUP_AT))
    link = tmp_path / "backups"
    link.symlink_to(real, target_is_directory=True)
    client = connect_mcp(data_dir=data_dir, backups_dir=link, clock=SetClock(NOW))

    (entry,) = _structured(client.answer(LIST_LOCAL_BACKUPS))["backups"]

    assert entry["path"] == str((real / DAILY).resolve()), entry
    preview = _structured(client.answer(PREVIEW_RESTORE, {"path": entry["path"]}))
    assert preview["booksAddedSince"] == ["Piranesi"], preview
    done = _structured(_accept(_modern(client), str(link / DAILY)))
    assert done["restoredFrom"] == entry["path"], done
    assert library_bytes(data_dir) == library_bytes(then)
    listed = {e["path"] for e in _structured(client.answer(LIST_LOCAL_BACKUPS))["backups"]}
    assert done["safetyCopy"] in listed, (done, listed)


@pytest.mark.parametrize("state", ["é" * 40, "abc.dé.f", "☃.☃.☃"])
def test_a_non_ascii_request_state_is_changed(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, state: str
) -> None:
    # [P0] AC-6: a token bookvie never sealed is changed, not an unexpected failure.
    data_dir, backups, then = tmp_path / "library", tmp_path / "backups", tmp_path / "then"
    _library(data_dir, "Piranesi")
    _library(then)
    backups.mkdir()
    (backups / DAILY).write_bytes(backup_zip(then, BACKUP_AT))
    client = _modern(connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW)))
    before = library_bytes(data_dir)

    answer = client.answer(
        RESTORE_BACKUP,
        {"path": str(backups / DAILY)},
        input_responses={"confirm": ACCEPT},
        request_state=state,
    )

    refused = _error(answer)
    assert (refused.get("code"), refused.get("reason")) == ("restore_not_confirmed", "changed")
    assert library_bytes(data_dir) == before


def test_an_expired_token_stays_expired_after_another_question_is_sealed(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-6: sealing a later question forgets the old nonce; the answer still reads expired.
    data_dir, backups, then = tmp_path / "library", tmp_path / "backups", tmp_path / "then"
    _library(data_dir, "Piranesi")
    _library(then)
    backups.mkdir()
    (backups / DAILY).write_bytes(backup_zip(then, BACKUP_AT))
    clock = SetClock(NOW)
    client = _modern(connect_mcp(data_dir=data_dir, backups_dir=backups, clock=clock))
    path = str(backups / DAILY)
    first = client.answer(RESTORE_BACKUP, {"path": path})
    clock.advance(timedelta(minutes=5, seconds=1))
    second = client.answer(RESTORE_BACKUP, {"path": path})
    assert second.get("resultType") == "input_required", second
    before = library_bytes(data_dir)

    answer = client.answer(
        RESTORE_BACKUP,
        {"path": path},
        input_responses={"confirm": ACCEPT},
        request_state=first.get("requestState"),
    )

    refused = _error(answer)
    assert (refused.get("code"), refused.get("reason")) == ("restore_not_confirmed", "expired")
    assert library_bytes(data_dir) == before


def _impossible_date_zip(data_dir: Path) -> bytes:
    """A backup of ``data_dir`` whose ``library.json`` entry has a DOS date with month 0
    and no 0x5455 field."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(
            zipfile.ZipInfo("library.json", date_time=(1980, 0, 0, 0, 0, 0)),
            library_bytes(data_dir),
        )
        archive.mkdir("covers")
    return buffer.getvalue()


@pytest.mark.parametrize("tool", [PREVIEW_RESTORE, RESTORE_BACKUP])
def test_a_backup_with_an_impossible_time_is_restore_invalid(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, tool: str
) -> None:
    # [P1] AC-3: the same file list_local_backups leaves out is refused, not couldnt_save.
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    _library(data_dir, "Thinking in Systems")
    backups.mkdir()
    (backups / DAILY).write_bytes(_impossible_date_zip(data_dir))
    client = _modern(connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW)))
    kept = library_bytes(data_dir)

    assert _structured(client.call_tool(LIST_LOCAL_BACKUPS))["backups"] == []
    assert _error(client.answer(tool, {"path": str(backups / DAILY)}))["code"] == "restore_invalid"
    assert library_bytes(data_dir) == kept


@pytest.mark.parametrize(
    "name",
    [
        "bookvie-backup-2026-11-19.zip\n",
        "bookvie-pre-restore-2026-11-19T0902.zip\n",
        "bookvie-backup-2026-11-\u0661\u0669.zip",
    ],
    ids=["daily_newline", "safety_newline", "arabic_indic_digits"],
)
def test_a_name_that_only_starts_like_a_backup_isnt_one(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, name: str
) -> None:
    # [P1] AC-1, AC-4: the whole name must match, in ASCII digits.
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    _library(data_dir)
    backups.mkdir()
    (backups / name).write_bytes(backup_zip(data_dir, BACKUP_AT))
    client = _modern(connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW)))

    assert _structured(client.call_tool(LIST_LOCAL_BACKUPS))["backups"] == []
    refused = _error(client.answer(PREVIEW_RESTORE, {"path": str(backups / name)}))
    assert refused["code"] == "restore_outside_backups"


def test_an_unsupported_client_is_unsupported_even_for_a_path_outside_the_backups(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-6: unsupported is checked before the path, so the skill's CLI advice still shows.
    data_dir, backups, elsewhere = (
        tmp_path / "library",
        tmp_path / "backups",
        tmp_path / "elsewhere",
    )
    _library(data_dir)
    backups.mkdir()
    elsewhere.mkdir()
    (elsewhere / DAILY).write_bytes(backup_zip(data_dir, BACKUP_AT))
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    kept = library_bytes(data_dir)

    refused = _error(
        client.speaking(MODERN_PROTOCOL_VERSION, {}).answer(
            RESTORE_BACKUP, {"path": str(elsewhere / DAILY)}
        )
    )

    assert (refused.get("code"), refused.get("reason")) == ("restore_not_confirmed", "unsupported")
    assert library_bytes(data_dir) == kept


def test_a_safety_copy_that_cant_read_the_library_is_safety_copy_failed(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-8: a referenced cover is gone from the data folder, so no safety copy, no restore.
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    cover = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, title="Dune", cover_file=cover, spine_color_from_cover="#A85A4A")
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / cover).write_bytes(image_bytes(fmt="JPEG"))
    backups.mkdir()
    (backups / DAILY).write_bytes(backup_zip(data_dir, BACKUP_AT))
    client = _modern(connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW)))
    (data_dir / cover).unlink()
    kept = library_bytes(data_dir)

    refused = _error(_accept(client, str(backups / DAILY)))

    assert refused == {
        "kind": "couldnt_save",
        "code": "safety_copy_failed",
        "message": "Couldn't save a safety copy, so nothing was restored.",
    }
    assert library_bytes(data_dir) == kept
    assert sorted(p.name for p in backups.iterdir()) == [DAILY]
