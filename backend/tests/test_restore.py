"""Story 2.2: restore my library from an export (FR-23, AD-4, AD-12, AD-13, AD-14).

Red-phase ATDD scaffolds for the six server-side acceptance criteria, numbered
in the order of epics.md, Story 2.2:

- AC-3: what a valid restore applies, in what order, under the lock.
- AC-5: an older ``schemaVersion`` is migrated first.
- AC-6: the round trip is byte-identical.
- AC-8: ``.staging/`` is emptied after every restore.
- AC-9: a missing ``covers/`` counts as empty.
- AC-10: a failed cleanup after the commit is still a success.

AC-1, AC-2, AC-4 and AC-7 are the Backup page, in
``frontend/e2e/restore.spec.ts``. Refusals (``restore_invalid``,
``restore_newer_version``, ``restore_unsafe``, ``couldnt_save``) are
Story 2.3.

The tests pin these names (decided with Oleg, 2026-11-04):

- ``POST /api/intents/restore``, multipart, with a JSON ``intent`` part
  holding ``{}`` and the zip in a file part named ``archive``.
- Success is 200 ``{"ok": true}``, like every intent (AD-9).

Activate one test at a time by deleting its ``@pytest.mark.skip(reason=RED)``.
"""

import io
import json
import os
import zipfile
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from bookvie.store import OsFileSystem, Store, migrations
from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_ID,
    FaultyFs,
    RecordingLock,
    api_client,
    image_bytes,
    library_bytes,
)

RED = "ATDD red phase (story 2.2): restore is not implemented yet"

RESTORE = "/api/intents/restore"
EXPORT = "/api/export"
EXPORT_HEADERS = {"X-Bookvie-Export": "1"}
OK = {"ok": True}

LOCAL_STATE = "local-state.json"
EARLIER_EXPORT = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'
"""This machine's "Last export"; a restore never touches it (AD-15)."""

DUNE_COVER = f"{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
PIRANESI_COVER = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b-11111111-2222-4333-8444-555555555555.png"
OLD_COVER = "3a5b7c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d-66666666-7777-4888-9999-000000000000.jpg"
"""The cover of the library a restore replaces; no restored Book references it."""

NEUROMANCER_ID = "1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c"
DISPOSSESSED_ID = "7c2d9e1f-4a6b-4c8d-a0e1-2f3a4b5c6d7e"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
CIEN_ANOS_ID = "5d3c1b2a-6e7f-4a8b-9c0d-1e2f3a4b5c6d"
OLD_BOOK_ID = "3a5b7c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"


# --- Seeds --------------------------------------------------------------------


def _seed_source(data_dir: Path) -> bytes:
    """Dune (with a cover and a Reading at p.150) and an unread Neuromancer.

    Returns Dune's cover bytes as stored.
    """
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=f"covers/{DUNE_COVER}",
        spine_color_from_cover="#A85A4A",
        readings=[{"currentPage": 150}],
        card_notes=[{"text": "Fear is the mind-killer.", "pageStart": 19}],
    )
    builder.main(DUNE_ID)
    builder.book(id=NEUROMANCER_ID, title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.write(data_dir)
    cover = image_bytes(fmt="JPEG")
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / "covers" / DUNE_COVER).write_bytes(cover)
    return cover


def _seed_rich(data_dir: Path) -> dict[str, bytes]:
    """Every Book state the shelf knows, two covers and non-ASCII text (TC-1).

    - Dune is the Main book at p.150, with a Card note and a JPEG cover.
    - Neuromancer is Up next, paused at p.80.
    - The Dispossessed is a Side read at p.120.
    - Piranesi is finished (back-filled, no start date), with a user spine
      color and a transparent PNG cover.
    - Cien años de soledad is unread, with a non-ASCII tag.

    Returns each cover's bytes by file name.
    """
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=f"covers/{DUNE_COVER}",
        spine_color_from_cover="#A85A4A",
        tags=["sf", "classics"],
        readings=[{"currentPage": 150, "purpose": "Reread before the film"}],
        card_notes=[
            {"text": "Fear is the mind-killer.", "pageStart": 19},
            {"text": "The spice must flow.", "pageStart": 200, "pageEnd": 204},
        ],
    )
    builder.book(
        id=NEUROMANCER_ID,
        title="Neuromancer",
        authors=["William Gibson"],
        pages=271,
        readings=[{"currentPage": 80, "pausedAt": "2026-10-20"}],
    )
    builder.book(
        id=DISPOSSESSED_ID,
        title="The Dispossessed",
        authors=["Ursula K. Le Guin"],
        pages=387,
        readings=[{"currentPage": 120}],
    )
    builder.book(
        id=PIRANESI_ID,
        title="Piranesi",
        authors=["Susanna Clarke"],
        pages=272,
        cover_file=f"covers/{PIRANESI_COVER}",
        spine_color_from_cover="#5B7590",
        spine_color_user="#7A6283",
        readings=[
            {
                "startDate": None,
                "currentPage": 272,
                "lastProgressUpdate": None,
                "finishDate": "2025-03-14",
                "finishedPages": 272,
                "rating": 5,
            }
        ],
    )
    builder.book(
        id=CIEN_ANOS_ID,
        title="Cien años de soledad",
        authors=["Gabriel García Márquez"],
        pages=471,
        language="Spanish",
        tags=["clásicos"],
    )
    builder.main(DUNE_ID).up_next(NEUROMANCER_ID).side_read(DISPOSSESSED_ID)
    builder.write(data_dir)
    covers = {
        DUNE_COVER: image_bytes(fmt="JPEG"),
        PIRANESI_COVER: image_bytes(mode="RGBA", color=(91, 117, 144, 128)),
    }
    (data_dir / "covers").mkdir(exist_ok=True)
    for name, data in covers.items():
        (data_dir / "covers" / name).write_bytes(data)
    return covers


def _seed_target(data_dir: Path) -> None:
    """The library a restore replaces: one Book whose cover no restored Book references."""
    builder = LibraryBuilder()
    builder.book(
        id=OLD_BOOK_ID,
        title="The Left Hand of Darkness",
        authors=["Ursula K. Le Guin"],
        pages=304,
        cover_file=f"covers/{OLD_COVER}",
        spine_color_from_cover="#6C7650",
    )
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / "covers" / OLD_COVER).write_bytes(image_bytes(fmt="JPEG", color=(30, 60, 90)))


# --- Archives and requests ----------------------------------------------------


def _export(data_dir: Path) -> bytes:
    """The real export of ``data_dir`` (Story 2.1), as the browser downloads it."""
    client = api_client(data_dir)
    return client.get(EXPORT, headers=EXPORT_HEADERS).content


def _zip(entries: dict[str, bytes | None]) -> bytes:
    """A hand-made archive: ``None`` is a directory entry."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in entries.items():
            if data is None:
                archive.mkdir(name.rstrip("/"))
            else:
                archive.writestr(name, data)
    return buffer.getvalue()


def _post_restore(client: TestClient, archive: bytes) -> httpx.Response:
    """One restore intent, as the Backup page sends it: ``intent`` ``{}`` plus ``archive``."""
    return client.post(
        RESTORE,
        files={
            "intent": (None, "{}", "application/json"),
            "archive": ("bookvie-export-2026-10-30.zip", archive, "application/zip"),
        },
    )


def _covers(data_dir: Path) -> dict[str, bytes]:
    return {p.name: p.read_bytes() for p in sorted((data_dir / "covers").iterdir())}


def _staging(data_dir: Path) -> list[str]:
    return sorted(p.name for p in (data_dir / ".staging").iterdir())


class RecordingFs(OsFileSystem):
    """Logs each rename and delete outside ``.staging/`` as ``"<op> <relative path>"``."""

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


# --- AC-3: a valid export is validated, then applied in AD-12 order under the lock


@pytest.mark.skip(reason=RED)
def test_ac3_p0_a_valid_export_replaces_the_library_in_ad12_order_under_one_lock(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source"
    dune_cover = _seed_source(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    log: list[str] = []
    lock = RecordingLock(log)
    client.app.state.store.lock = lock
    client.app.state.write_lock = lock
    client.app.state.store.fs = RecordingFs(target, log)

    response = _post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(source)
    assert _covers(target) == {DUNE_COVER: dune_cover}
    # The in-memory state was swapped too: views read the restored library.
    catalog = client.get("/api/views/catalog").json()
    assert sorted(book["title"] for book in catalog["books"]) == ["Dune", "Neuromancer"]

    # AD-4: one lock around the whole restore, staging included.
    assert log[0] == "lock acquired"
    assert log[-1] == "lock released"
    assert log.count("lock acquired") == 1
    # AD-12: covers in, then the document commit, then the old cover out.
    outside_staging = [entry for entry in log if " .staging/" not in entry]
    assert outside_staging == [
        "lock acquired",
        f"replace covers/{DUNE_COVER}",
        "replace library.json",
        f"remove covers/{OLD_COVER}",
        "lock released",
    ]


# --- AC-5: an older schemaVersion goes through the startup migration chain -----


def _step_to_2(doc: dict) -> dict:
    doc["schemaVersion"] = 2
    for book in doc["books"]:
        book["tags"] = [*book["tags"], "migrated"]
    return doc


@pytest.mark.skip(reason=RED)
def test_ac5_p1_an_older_schema_version_is_migrated_through_the_chain_then_restored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A v1 export, made before this server learned v2 (the test_migrations fixture chain).
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE, tags=["sf"])
    v1_library = builder.write(tmp_path / "v1").read_bytes()
    archive = _zip({"library.json": v1_library, "covers/": None})
    steps: list[int] = []

    def counted_step(doc: dict) -> dict:
        steps.append(doc["schemaVersion"])
        return _step_to_2(doc)

    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: counted_step})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)  # the target itself is migrated to v2 at startup
    steps.clear()

    response = _post_restore(client, archive)

    assert response.status_code == 200
    restored = json.loads(library_bytes(target))
    assert restored["schemaVersion"] == 2
    assert [(b["title"], b["tags"]) for b in restored["books"]] == [("Dune", ["sf", "migrated"])]
    assert steps == [1], "the archive went through the same chain, once"
    assert _covers(target) == {}


# --- AC-6: export → restore at the same schemaVersion is byte-identical (BKP-API-001)


@pytest.mark.skip(reason=RED)
def test_ac6_p0_export_then_restore_reproduces_library_json_and_every_cover_byte_for_byte(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source"
    covers = _seed_rich(source)
    archive = _export(source)
    fresh = tmp_path / "fresh"
    fresh.mkdir()
    client = api_client(fresh)  # a new laptop: an empty library

    _post_restore(client, archive)

    assert library_bytes(fresh) == library_bytes(source)
    assert _covers(fresh) == covers
    assert _covers(fresh) == _covers(source)

    # Restoring the same export again onto the restored library changes nothing.
    _post_restore(client, archive)

    assert library_bytes(fresh) == library_bytes(source)
    assert _covers(fresh) == covers


# --- AC-8: .staging/ is emptied after every restore, and at startup ------------


@pytest.mark.skip(reason=RED)
def test_ac8_p1_staging_is_emptied_after_a_restore_whether_it_succeeded_or_was_refused(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source"
    _seed_source(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    staging = target / ".staging"
    # Planted after startup, so only the restore itself can clear them.
    (staging / "leftover.zip").write_bytes(b"from an interrupted restore")
    (staging / "covers").mkdir()
    (staging / "covers" / "half.jpg").write_bytes(b"half")

    _post_restore(client, archive)

    assert _staging(target) == []

    # A refused restore empties it too.
    (staging / "leftover.zip").write_bytes(b"again")
    library_before = library_bytes(target)

    _post_restore(client, b"this is not a zip")

    assert _staging(target) == []
    assert library_bytes(target) == library_before

    # And startup sweeps whatever an interrupted restore left (already green).
    (staging / "covers").mkdir()
    (staging / "covers" / "half.jpg").write_bytes(b"half")
    Store.open(target)

    assert _staging(target) == []


# --- AC-9: an export without covers/ restores, with covers/ treated as empty ---


@pytest.mark.skip(reason=RED)
def test_ac9_p1_an_archive_without_covers_restores_and_empties_covers(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    builder.book(id=NEUROMANCER_ID, title="Neuromancer", authors=["William Gibson"], pages=271)
    no_covers_library = builder.write(tmp_path / "bare").read_bytes()
    archive = _zip({"library.json": no_covers_library})  # no covers/ entry at all
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    response = _post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == no_covers_library
    assert (target / "covers").is_dir()
    assert _covers(target) == {}, "the replaced library's cover is no longer referenced"


# --- AC-10: a fault after the commit is still success, logged, and swept later --


@pytest.mark.skip(reason=RED)
def test_ac10_p1_a_failed_cleanup_after_the_commit_still_succeeds_and_startup_sweeps_it(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    dune_cover = _seed_source(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    (target / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    # Every delete through the seam fails: the old cover, and .staging/ cleanup.
    client = api_client(target, FaultyFs("remove"))

    response = _post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(source)
    err = capsys.readouterr().err
    assert f"bookvie: couldn't delete covers/{OLD_COVER}" in err
    assert (target / "covers" / OLD_COVER).exists(), "left for the startup sweep"
    assert (target / LOCAL_STATE).read_bytes() == EARLIER_EXPORT

    # The next start removes what the failed cleanup left.
    Store.open(target)

    assert _covers(target) == {DUNE_COVER: dune_cover}
    assert _staging(target) == []
    assert library_bytes(target) == library_bytes(source)
