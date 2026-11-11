"""Story 2.2: restore my library from an export (FR-23, AD-4, AD-12, AD-13, AD-14).

The six server-side acceptance criteria, numbered in the order of epics.md,
Story 2.2:

- AC-3: what a valid restore applies, in what order, under the lock.
- AC-5: an older ``schemaVersion`` is migrated first.
- AC-6: the round trip is byte-identical.
- AC-8: ``.staging/`` is emptied after every restore.
- AC-9: a missing ``covers/`` counts as empty.
- AC-10: a failed cleanup after the commit is still a success.

AC-1, AC-2, AC-4 and AC-7 are the Backup page, in
``frontend/e2e/restore.spec.ts``. Then the spec's own checks: a garbage
upload, a missing or undecodable cover and a bad ``library.json`` are the
catch-all 422 ``restore_invalid``; a fault at the commit removes only the
covers restore wrote; a cover name already in ``covers/`` is never
overwritten (AD-12); and an intent sent during a restore waits for it. The
full refusal set (``restore_newer_version``, ``restore_unsafe``, faults at
every step) is in ``test_restore_refusals.py``.

The tests pin these names (decided with Oleg, 2026-11-04):

- ``POST /api/intents/restore``, multipart, with a JSON ``intent`` part
  holding ``{}`` and the zip in a file part named ``archive``.
- Success is 200 ``{"ok": true}``, like every intent (AD-9).
"""

import io
import json
import os
import threading
import zipfile
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from bookvie.http.api import BODY_LIMIT
from bookvie.store import OsFileSystem, Store, migrations
from tests.builder import LibraryBuilder, as_v1
from tests.helpers import (
    ADD_BOOK,
    COULDNT_SAVE_BODY,
    DUNE,
    DUNE_ID,
    VALID,
    FaultyFs,
    RecordingFs,
    RecordingLock,
    api_client,
    covers_in,
    image_bytes,
    library_bytes,
    post_restore,
    staging_in,
    zip_archive,
)

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


# --- AC-3: a valid export is validated, then applied in AD-12 order under the lock


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

    response = post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(source)
    assert covers_in(target) == {DUNE_COVER: dune_cover}
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


def test_ac5_p1_an_older_schema_version_is_migrated_through_the_chain_then_restored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A v1 export, upgraded by a stand-in for the real step (as in test_migrations).
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE, tags=["sf"])
    v1_library = as_v1(builder.write(tmp_path / "v1").read_bytes())
    archive = zip_archive({"library.json": v1_library, "covers/": None})
    steps: list[int] = []

    def counted_step(doc: dict) -> dict:
        steps.append(doc["schemaVersion"])
        return _step_to_2(doc)

    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: counted_step})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    response = post_restore(client, archive)

    assert response.status_code == 200
    restored = json.loads(library_bytes(target))
    assert restored["schemaVersion"] == 2
    assert [(b["title"], b["tags"]) for b in restored["books"]] == [("Dune", ["sf", "migrated"])]
    assert steps == [1], "the archive went through the same chain, once"
    assert covers_in(target) == {}


def test_a_failing_migration_step_is_422_restore_invalid_and_changes_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE, tags=["sf"])
    v1_library = as_v1(builder.write(tmp_path / "v1").read_bytes())
    archive = zip_archive({"library.json": v1_library, "covers/": None})
    target = tmp_path / "target"
    _seed_target(target)

    def boom(doc: dict) -> dict:
        raise RuntimeError("step 1 broke")

    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    client = api_client(target)
    monkeypatch.setattr(migrations, "STEPS", {1: boom})
    capsys.readouterr()

    _assert_refused_and_unchanged(client, target, archive)
    assert (
        "bookvie: couldn't restore: library.json could not be upgraded from schemaVersion 1: "
        "step 1 broke"
    ) in capsys.readouterr().err


# --- AC-6: export → restore at the same schemaVersion is byte-identical (BKP-API-001)


def test_ac6_p0_export_then_restore_reproduces_library_json_and_every_cover_byte_for_byte(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source"
    covers = _seed_rich(source)
    archive = _export(source)
    fresh = tmp_path / "fresh"
    fresh.mkdir()
    client = api_client(fresh)  # a new laptop: an empty library

    post_restore(client, archive)

    assert library_bytes(fresh) == library_bytes(source)
    assert covers_in(fresh) == covers
    assert covers_in(fresh) == covers_in(source)

    # Restoring the same export again onto the restored library changes nothing.
    post_restore(client, archive)

    assert library_bytes(fresh) == library_bytes(source)
    assert covers_in(fresh) == covers


# --- AC-8: .staging/ is emptied after every restore, and at startup ------------


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

    post_restore(client, archive)

    assert staging_in(target) == []

    # A refused restore empties it too.
    (staging / "leftover.zip").write_bytes(b"again")
    library_before = library_bytes(target)

    post_restore(client, b"this is not a zip")

    assert staging_in(target) == []
    assert library_bytes(target) == library_before

    # And startup sweeps whatever an interrupted restore left (already green).
    (staging / "covers").mkdir()
    (staging / "covers" / "half.jpg").write_bytes(b"half")
    Store.open(target)

    assert staging_in(target) == []


# --- AC-9: an export without covers/ restores, with covers/ treated as empty ---


def test_ac9_p1_an_archive_without_covers_restores_and_empties_covers(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    builder.book(id=NEUROMANCER_ID, title="Neuromancer", authors=["William Gibson"], pages=271)
    no_covers_library = builder.write(tmp_path / "bare").read_bytes()
    archive = zip_archive({"library.json": no_covers_library})  # no covers/ entry at all
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    response = post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == no_covers_library
    assert (target / "covers").is_dir()
    assert covers_in(target) == {}, "the replaced library's cover is no longer referenced"


# --- AC-10: a fault after the commit is still success, logged, and swept later --


def test_an_archive_without_a_covers_directory_entry_still_restores_its_covers(
    tmp_path: Path,
) -> None:
    # Zips re-made by other tools often hold covers/<name> with no covers/ entry.
    doc, dune_cover = _source_doc(tmp_path)
    archive = zip_archive(
        {
            "library.json": (json.dumps(doc, indent=2) + "\n").encode("utf-8"),
            f"covers/{DUNE_COVER}": dune_cover,
        }
    )
    assert "covers/" not in zipfile.ZipFile(io.BytesIO(archive)).namelist()
    target = tmp_path / "target"
    _seed_target(target)

    response = post_restore(api_client(target), archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(tmp_path / "source")
    assert covers_in(target) == {DUNE_COVER: dune_cover}
    assert staging_in(target) == []


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

    response = post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(source)
    err = capsys.readouterr().err
    assert f"bookvie: couldn't delete covers/{OLD_COVER}" in err
    assert "bookvie: couldn't delete .staging/library.json" in err
    assert (target / "covers" / OLD_COVER).exists(), "left for the startup sweep"
    assert "library.json" in staging_in(target), "the .staging/ cleanup failed too"
    assert (target / LOCAL_STATE).read_bytes() == EARLIER_EXPORT

    # The next start removes what the failed cleanup left.
    Store.open(target)

    assert covers_in(target) == {DUNE_COVER: dune_cover}
    assert staging_in(target) == []
    assert library_bytes(target) == library_bytes(source)


# --- restore_invalid (the full refusal set: test_restore_refusals.py) ----------

RESTORE_INVALID_BODY = {
    "error": {
        "kind": "refusal",
        "code": "restore_invalid",
        "message": "This file isn't a bookvie export, or it's damaged. Nothing was changed.",
    }
}


def test_a_garbage_upload_is_422_restore_invalid_and_changes_nothing(tmp_path: Path) -> None:
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    library_before = library_bytes(target)
    covers_before = covers_in(target)

    response = post_restore(client, b"this is not a zip")

    assert response.status_code == 422
    assert response.json() == RESTORE_INVALID_BODY
    assert library_bytes(target) == library_before
    assert covers_in(target) == covers_before
    assert staging_in(target) == []


def _source_with(library: dict, covers: dict[str, bytes]) -> bytes:
    """A hand-made export: ``library`` as ``library.json`` plus ``covers/<name>`` files."""
    entries: dict[str, bytes | None] = {
        "library.json": (json.dumps(library, indent=2) + "\n").encode("utf-8"),
        "covers/": None,
    }
    entries.update({f"covers/{name}": data for name, data in covers.items()})
    return zip_archive(entries)


def _source_doc(tmp_path: Path) -> tuple[dict, bytes]:
    source = tmp_path / "source"
    dune_cover = _seed_source(source)
    return json.loads(library_bytes(source)), dune_cover


def _assert_refused_and_unchanged(client: TestClient, target: Path, archive: bytes) -> None:
    library_before = library_bytes(target)
    covers_before = covers_in(target)

    response = post_restore(client, archive)

    assert response.status_code == 422
    assert response.json() == RESTORE_INVALID_BODY
    assert library_bytes(target) == library_before
    assert covers_in(target) == covers_before
    assert staging_in(target) == []


def test_a_referenced_cover_missing_from_the_archive_is_422_restore_invalid(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    doc, _ = _source_doc(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)

    _assert_refused_and_unchanged(api_client(target), target, _source_with(doc, {}))
    assert f"covers/{DUNE_COVER} is missing" in capsys.readouterr().err


def test_an_undecodable_cover_is_422_restore_invalid(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    doc, _ = _source_doc(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    archive = _source_with(doc, {DUNE_COVER: b"\xff\xd8 not really a JPEG"})

    _assert_refused_and_unchanged(api_client(target), target, archive)
    assert f"covers/{DUNE_COVER} isn't a usable image" in capsys.readouterr().err


def test_a_library_that_breaks_an_invariant_is_422_restore_invalid(tmp_path: Path) -> None:
    doc, dune_cover = _source_doc(tmp_path)
    doc["upNextBookId"] = doc["mainBookId"]  # Main book and Up next at once
    target = tmp_path / "target"
    _seed_target(target)

    archive = _source_with(doc, {DUNE_COVER: dune_cover})
    _assert_refused_and_unchanged(api_client(target), target, archive)


def _break_dune_note(doc: dict, case: str) -> None:
    """Make Dune's Card note (or Neuromancer's copy of it) something no intent produces."""
    books = {book["id"]: book for book in doc["books"]}
    note = books[DUNE_ID]["cardNotes"][0]
    if case == "page_end_equals_start":
        note["pageEnd"] = note["pageStart"]
    elif case == "empty_text":
        note["text"] = ""
    elif case == "whitespace_text":
        note["text"] = "   "
    elif case == "untrimmed_text":
        note["text"] = f" {note['text']}\n"
    elif case == "note_id_in_two_books":
        books[NEUROMANCER_ID]["cardNotes"].append({**note, "text": "Another Book's note"})
    else:
        raise AssertionError(case)


@pytest.mark.parametrize(
    ("case", "logged"),
    [
        ("page_end_equals_start", "ends on its start page 19"),
        ("empty_text", "has no text"),
        ("whitespace_text", "has no text"),
        ("untrimmed_text", "has text with whitespace around it"),
        ("note_id_in_two_books", "is used more than once"),
    ],
)
def test_a_card_note_no_intent_can_produce_is_422_restore_invalid(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], case: str, logged: str
) -> None:
    """Epic 5 retro item 49 (E5-R1, E5-R2): restore refuses these, and the library is unchanged."""
    doc, dune_cover = _source_doc(tmp_path)
    _break_dune_note(doc, case)
    target = tmp_path / "target"
    _seed_target(target)

    archive = _source_with(doc, {DUNE_COVER: dune_cover})
    _assert_refused_and_unchanged(api_client(target), target, archive)
    err = capsys.readouterr().err
    assert "breaks a library rule" in err
    assert logged in err


def test_the_unbroken_card_note_source_restores(tmp_path: Path) -> None:
    """The control for the refusals above: the same hand-made archive, untouched, restores."""
    doc, dune_cover = _source_doc(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)

    response = post_restore(api_client(target), _source_with(doc, {DUNE_COVER: dune_cover}))

    assert response.status_code == 200
    assert json.loads(library_bytes(target))["books"] == doc["books"]


def test_a_zip_without_library_json_is_422_restore_invalid(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    _, dune_cover = _source_doc(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    archive = zip_archive({"covers/": None, f"covers/{DUNE_COVER}": dune_cover})

    _assert_refused_and_unchanged(api_client(target), target, archive)
    assert "the file has no library.json" in capsys.readouterr().err


def test_a_library_json_that_fails_its_crc_is_422_restore_invalid(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    doc, dune_cover = _source_doc(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    archive = _source_with(doc, {DUNE_COVER: dune_cover})
    # Entries are stored uncompressed, so the document's bytes are in the zip as is.
    marker = b'"schemaVersion"'
    assert archive.count(marker) == 1
    damaged = archive.replace(marker, b'"schemaVersioN"')

    _assert_refused_and_unchanged(api_client(target), target, damaged)
    assert "Bad CRC-32 for file 'library.json'" in capsys.readouterr().err


def test_the_cover_cap_does_not_apply_to_restore(tmp_path: Path) -> None:
    target = tmp_path / "target"
    _seed_target(target)
    garbage = b"x" * (BODY_LIMIT + 1)

    # Not 413: the 20 MB cover cap is only on the routes that take a cover.
    _assert_refused_and_unchanged(api_client(target), target, garbage)


# --- A fault at the commit removes only the covers restore wrote --------------


class _FailingCommit(OsFileSystem):
    """Fails the rename that commits ``library.json``; every other step is real."""

    def replace(self, src: Path, dst: Path) -> None:
        if dst.name == "library.json":
            raise OSError(5, "injected commit fault")
        super().replace(src, dst)


def test_a_failed_commit_removes_the_new_covers_and_leaves_covers_byte_identical(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    _seed_rich(source)
    archive = _export(source)
    # Neither of the archive's covers is in the target yet, so restore writes both.
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target, _FailingCommit())
    library_before = library_bytes(target)
    covers_before = covers_in(target)

    response = post_restore(client, archive)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert "bookvie: couldn't save: can't write library.json" in capsys.readouterr().err
    assert library_bytes(target) == library_before
    assert covers_in(target) == covers_before, "only restore's own covers were removed"
    assert staging_in(target) == []
    titles = [book["title"] for book in client.get("/api/views/catalog").json()["books"]]
    assert titles == ["The Left Hand of Darkness"]


# --- A cover name already in covers/ is never overwritten (AD-12) -------------


def test_a_same_named_cover_with_other_bytes_is_kept_and_logged(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    _seed_source(source)
    archive = _export(source)
    # The target's Dune has the same cover name, with other bytes.
    target = tmp_path / "target"
    _seed_source(target)
    kept = image_bytes(fmt="JPEG", color=(10, 20, 30))
    (target / "covers" / DUNE_COVER).write_bytes(kept)
    log: list[str] = []
    client = api_client(target)
    client.app.state.store.fs = RecordingFs(target, log)

    response = post_restore(client, archive)

    assert response.status_code == 200
    assert response.json() == OK
    assert library_bytes(target) == library_bytes(source)
    assert covers_in(target) == {DUNE_COVER: kept}
    assert f"bookvie: kept covers/{DUNE_COVER}; the export's copy differs" in (
        capsys.readouterr().err
    )
    outside_staging = [entry for entry in log if " .staging/" not in entry]
    assert outside_staging == ["replace library.json"], "the existing cover isn't rewritten"


# --- An intent sent during a restore applies to the restored library ----------


class _SlowCommit(OsFileSystem):
    """Holds the ``library.json`` commit until ``go`` is set; ``holding`` says it got there."""

    def __init__(self) -> None:
        self.holding = threading.Event()
        self.go = threading.Event()

    def replace(self, src: Path, dst: Path) -> None:
        if dst.name == "library.json" and not self.go.is_set():
            self.holding.set()
            assert self.go.wait(10)
        super().replace(src, dst)


def test_an_intent_sent_during_a_slow_restore_waits_then_applies_to_the_restored_library(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source"
    _seed_source(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    fs = _SlowCommit()
    client = api_client(target, fs)
    answers: dict[str, httpx.Response] = {}

    def send(name: str, call) -> threading.Thread:
        thread = threading.Thread(target=lambda: answers.__setitem__(name, call()))
        thread.start()
        return thread

    restoring = send("restore", lambda: post_restore(client, archive))
    assert fs.holding.wait(10), "the restore reached its commit"
    adding = send("add", lambda: client.post(ADD_BOOK, files={"intent": (None, json.dumps(VALID))}))
    adding.join(0.3)
    assert adding.is_alive(), "add-book waits for the restore's lock"
    fs.go.set()
    restoring.join(10)
    adding.join(10)

    assert answers["restore"].status_code == 200
    assert answers["add"].status_code == 200
    titles = sorted(book["title"] for book in json.loads(library_bytes(target))["books"])
    assert titles == ["Dune", "Neuromancer", "The Dispossessed"]


# --- Restoring the same export again rewrites no identical cover --------------


def test_restoring_the_same_export_again_skips_every_identical_cover(tmp_path: Path) -> None:
    source = tmp_path / "source"
    covers = _seed_rich(source)
    archive = _export(source)
    target = tmp_path / "target"
    target.mkdir()
    client = api_client(target)
    assert post_restore(client, archive).status_code == 200
    log: list[str] = []
    client.app.state.store.fs = RecordingFs(target, log)

    response = post_restore(client, archive)

    assert response.status_code == 200
    outside_staging = [entry for entry in log if " .staging/" not in entry]
    assert outside_staging == ["replace library.json"], "only the document is committed again"
    assert covers_in(target) == covers


# --- Automation expansion (bmad-testarch-automate, 2026-11-04) -----------------
#
# The pre-commit fault branches the story's tests didn't reach: a write fault
# on a later cover, an existing cover that can't be read, and a .staging/
# leftover that can't be deleted. Each is 503 couldnt_save with library.json
# and covers/ exactly as before (AD-12: only restore's own covers are removed).


class _FailingCoverWrite(RecordingFs):
    """Fails the rename that writes ``covers/<fail_name>``; logs the rest like RecordingFs."""

    def __init__(self, data_dir: Path, log: list[str], fail_name: str) -> None:
        super().__init__(data_dir, log)
        self.fail_name = fail_name

    def replace(self, src: Path, dst: Path) -> None:
        if dst.parent.name == "covers" and dst.name == self.fail_name:
            raise OSError(5, "injected cover write fault")
        super().replace(src, dst)


def test_a_fault_writing_a_later_cover_removes_the_covers_already_written(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    _seed_rich(source)
    archive = _export(source)
    # Covers are written in name order: Dune's first, then Piranesi's, which fails.
    assert DUNE_COVER < PIRANESI_COVER
    target = tmp_path / "target"
    _seed_target(target)
    log: list[str] = []
    client = api_client(target, _FailingCoverWrite(target, log, PIRANESI_COVER))
    library_before = library_bytes(target)
    covers_before = covers_in(target)

    response = post_restore(client, archive)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert "bookvie: couldn't save:" in capsys.readouterr().err
    # The failed write's own temp file is removed too; _covers below proves none is left.
    renames_and_deletes = [e for e in log if " .staging/" not in e and ".tmp" not in e]
    assert renames_and_deletes == [f"replace covers/{DUNE_COVER}", f"remove covers/{DUNE_COVER}"]
    assert library_bytes(target) == library_before
    assert covers_in(target) == covers_before
    assert staging_in(target) == []
    titles = [book["title"] for book in client.get("/api/views/catalog").json()["books"]]
    assert titles == ["The Left Hand of Darkness"]


@pytest.mark.skipif(os.getuid() == 0, reason="root can read a chmod 000 file")
def test_an_unreadable_same_named_cover_is_503_and_removes_the_covers_already_written(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    covers = _seed_rich(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    # Put after startup, whose sweep would delete it: a file named like the
    # archive's second cover that can't be read for the same-bytes check.
    unreadable = target / "covers" / PIRANESI_COVER
    unreadable.write_bytes(covers[PIRANESI_COVER])
    library_before = library_bytes(target)
    unreadable.chmod(0)
    try:
        response = post_restore(client, archive)
    finally:
        unreadable.chmod(0o644)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert f"bookvie: couldn't save: can't read covers/{PIRANESI_COVER}" in (
        capsys.readouterr().err
    )
    assert library_bytes(target) == library_before
    assert sorted(covers_in(target)) == sorted([OLD_COVER, PIRANESI_COVER]), (
        "Dune's cover, written first, was removed again"
    )
    assert staging_in(target) == []


def test_a_staging_leftover_that_cannot_be_deleted_is_503_and_changes_nothing(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "source"
    _seed_source(source)
    archive = _export(source)
    target = tmp_path / "target"
    _seed_target(target)
    # As AC-10 leaves it: a file in .staging/ the seam can't delete. Put after
    # startup, whose sweep would remove it.
    client = api_client(target, FaultyFs("remove"))
    (target / ".staging").mkdir(exist_ok=True)
    (target / ".staging" / "library.json").write_bytes(b"left by a failed cleanup")
    library_before = library_bytes(target)
    covers_before = covers_in(target)

    response = post_restore(client, archive)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    err = capsys.readouterr().err
    assert "bookvie: couldn't save: can't empty .staging/" in err
    assert "bookvie: couldn't delete .staging/library.json" in err, "the finally cleanup logs"
    assert library_bytes(target) == library_before
    assert covers_in(target) == covers_before
    assert staging_in(target) == ["library.json"], "left for the startup sweep"

    # The next start sweeps it, and a restore then succeeds.
    client = api_client(target)
    assert staging_in(target) == []
    assert post_restore(client, archive).status_code == 200
    assert library_bytes(target) == library_bytes(source)
