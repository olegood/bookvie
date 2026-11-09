"""The migration chain (AD-13) and startup migration through the store."""

import json
from fractions import Fraction
from pathlib import Path

import pytest

from bookvie.domain.pace import measured_pace
from bookvie.store import StartupError, Store, migrations, serialize
from tests.builder import LibraryBuilder, as_v1
from tests.helpers import api_client, library_bytes, post_restore, zip_archive


def test_chain_is_contiguous_from_1_to_current() -> None:
    assert migrations.CURRENT_VERSION >= 1
    assert set(migrations.STEPS) == set(range(1, migrations.CURRENT_VERSION))


def test_domain_schema_version_matches_the_chain() -> None:
    """A fresh start writes Library.empty(); it must be at the current version."""
    from bookvie.domain.model import SCHEMA_VERSION

    assert SCHEMA_VERSION == migrations.CURRENT_VERSION


def test_migrate_at_current_version_is_identity() -> None:
    doc = {"schemaVersion": migrations.CURRENT_VERSION, "books": []}
    assert migrations.migrate(doc) == doc


def _step_to_2(doc: dict) -> dict:
    doc["schemaVersion"] = 2
    for book in doc["books"]:
        book["tags"] = [*book["tags"], "migrated"]
    return doc


@pytest.fixture
def chain_to_2(monkeypatch: pytest.MonkeyPatch) -> None:
    """A stand-in for the real v1 -> v2 step: it tags each Book, so a test can see it ran.

    It adds no ``startPage``, so the documents it upgrades hold no Readings.
    """
    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: _step_to_2})


def test_migrate_runs_steps_without_touching_input(chain_to_2: None) -> None:
    doc = {"schemaVersion": 1, "books": [{"tags": []}]}
    assert migrations.migrate(doc) == {"schemaVersion": 2, "books": [{"tags": ["migrated"]}]}
    assert doc == {"schemaVersion": 1, "books": [{"tags": []}]}


def test_missing_step_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(migrations, "CURRENT_VERSION", 3)
    monkeypatch.setattr(migrations, "STEPS", {1: _step_to_2})
    with pytest.raises(ValueError, match="from schemaVersion 2"):
        migrations.migrate({"schemaVersion": 1, "books": []})


def test_step_that_forgets_the_version_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: lambda doc: doc})
    with pytest.raises(ValueError, match="did not set it"):
        migrations.migrate({"schemaVersion": 1, "books": []})


def _seed_v1(data_dir: Path) -> bytes:
    builder = LibraryBuilder()
    builder.book(title="Dune", tags=["sf"])
    return _write_v1(builder, data_dir)


def _write_v1(builder: LibraryBuilder, data_dir: Path) -> bytes:
    path = builder.write(data_dir)
    original = as_v1(path.read_bytes())
    path.write_bytes(original)
    return original


def _seed_leftovers(data_dir: Path) -> None:
    (data_dir / "library.json.tmpOLD").write_text("leftover")
    (data_dir / ".staging").mkdir()
    (data_dir / ".staging" / "scratch").write_text("scratch")


def _assert_only_original_backup_and_leftovers(data_dir: Path) -> None:
    """A refused upgrade sweeps nothing and creates nothing but the backup."""
    assert sorted(p.name for p in data_dir.iterdir()) == [
        ".staging", "library.json", "library.json.tmpOLD", "library.v1.bak.json",
    ]  # fmt: skip
    assert [p.name for p in (data_dir / ".staging").iterdir()] == ["scratch"]


def test_older_file_is_backed_up_then_migrated_once(
    tmp_path: Path, chain_to_2: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = _seed_v1(tmp_path)
    (tmp_path / "library.v1.bak.json").write_text("stale backup")
    order: list[str] = []
    real_step = _step_to_2

    def step(doc: dict) -> dict:
        order.append("step")
        assert (tmp_path / "library.v1.bak.json").read_bytes() == original
        return real_step(doc)

    monkeypatch.setattr(migrations, "STEPS", {1: step})
    store = Store.open(tmp_path)
    assert order == ["step"]
    assert (tmp_path / "library.v1.bak.json").read_bytes() == original
    on_disk = (tmp_path / "library.json").read_bytes()
    assert on_disk == serialize(store.library)
    assert json.loads(on_disk)["schemaVersion"] == 2
    assert store.library.books[0].tags == ["sf", "migrated"]
    assert not list(tmp_path.glob("library.json.tmp*"))


def test_migration_commits_once(tmp_path: Path, chain_to_2: None) -> None:
    _seed_v1(tmp_path)
    commits: list[Path] = []

    from bookvie.store import OsFileSystem

    class Counting(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            commits.append(dst)
            super().replace(src, dst)

    Store.open(tmp_path, fs=Counting())
    assert commits == [tmp_path / "library.v1.bak.json", tmp_path / "library.json"]


def test_step_that_raises_leaves_original_and_backup(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = _seed_v1(tmp_path)

    def boom(doc: dict) -> dict:
        doc["schemaVersion"] = 2
        doc["books"].clear()
        raise RuntimeError("step exploded")

    _seed_leftovers(tmp_path)
    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: boom})
    with pytest.raises(StartupError, match="could not be upgraded from schemaVersion 1"):
        Store.open(tmp_path)
    assert (tmp_path / "library.json").read_bytes() == original
    assert (tmp_path / "library.v1.bak.json").read_bytes() == original
    _assert_only_original_backup_and_leftovers(tmp_path)


def test_migrated_result_that_breaks_the_model_is_refused(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = _seed_v1(tmp_path)

    def bad(doc: dict) -> dict:
        doc["schemaVersion"] = 2
        doc["books"][0]["pages"] = "many"
        return doc

    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: bad})
    _seed_leftovers(tmp_path)
    with pytest.raises(StartupError, match="not a valid library"):
        Store.open(tmp_path)
    assert (tmp_path / "library.json").read_bytes() == original
    assert (tmp_path / "library.v1.bak.json").read_bytes() == original
    _assert_only_original_backup_and_leftovers(tmp_path)


def test_migrated_result_that_breaks_an_invariant_is_refused(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = _seed_v1(tmp_path)

    def bad(doc: dict) -> dict:
        doc["schemaVersion"] = 2
        doc["mainBookId"] = "gone"
        return doc

    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: bad})
    _seed_leftovers(tmp_path)
    with pytest.raises(StartupError, match="breaks a library rule"):
        Store.open(tmp_path)
    assert (tmp_path / "library.json").read_bytes() == original
    assert (tmp_path / "library.v1.bak.json").read_bytes() == original
    _assert_only_original_backup_and_leftovers(tmp_path)


def test_a_migration_sweeps_covers_against_the_migrated_library(
    tmp_path: Path, chain_to_2: None
) -> None:
    builder = LibraryBuilder()
    builder.book(title="Dune", cover_file="covers/x.jpg")
    _write_v1(builder, tmp_path)
    (tmp_path / "covers").mkdir()
    (tmp_path / "covers" / "x.jpg").write_bytes(b"jpeg")
    (tmp_path / "covers" / "stray.jpg").write_bytes(b"jpeg")

    store = Store.open(tmp_path)

    assert store.library.schema_version == 2
    assert sorted(p.name for p in (tmp_path / "covers").iterdir()) == ["x.jpg"]


# --- The real v1 -> v2 step: startPage (epic 4 retro item 35) ----------------------


def _library_with_readings() -> LibraryBuilder:
    """A Main book at page 100, and a Book finished twice: 800 pages over 20 days."""
    builder = LibraryBuilder()
    main = builder.book(title="Dune", pages=412)
    builder.reading(main, start_date="2026-10-11", current_page=100)
    builder.main(main)
    emma = builder.book(title="Emma", pages=400)
    for start, finish in (("2026-09-01", "2026-09-10"), ("2026-10-01", "2026-10-10")):
        builder.reading(
            emma, start_date=start, finish_date=finish, finished_pages=400, current_page=400
        )
    return builder


def test_step_1_sets_start_page_0_on_every_reading_and_nothing_else() -> None:
    doc = json.loads(as_v1(serialize(_library_with_readings().build())))

    migrated = migrations.STEPS[1](json.loads(json.dumps(doc)))

    assert migrated["schemaVersion"] == 2
    readings = [r for book in migrated["books"] for r in book["readings"]]
    assert [r["startPage"] for r in readings] == [0, 0, 0]
    for reading in readings:
        del reading["startPage"]
    assert {**migrated, "schemaVersion": 1} == doc


def test_a_real_v1_file_is_backed_up_and_upgraded_at_startup(tmp_path: Path) -> None:
    original = _write_v1(_library_with_readings(), tmp_path)

    store = Store.open(tmp_path)

    assert (tmp_path / "library.v1.bak.json").read_bytes() == original
    on_disk = json.loads((tmp_path / "library.json").read_bytes())
    assert on_disk["schemaVersion"] == 2
    assert (tmp_path / "library.json").read_bytes() == serialize(store.library)
    before = json.loads(original)
    assert [[r["id"] for r in b["readings"]] for b in on_disk["books"]] == [
        [r["id"] for r in b["readings"]] for b in before["books"]
    ]
    assert all(r["startPage"] == 0 for b in on_disk["books"] for r in b["readings"])
    assert list(on_disk["books"][0]["readings"][0])[:3] == ["id", "startDate", "startPage"]


def test_a_v1_export_restores_at_v2_with_the_same_pace(tmp_path: Path) -> None:
    builder = _library_with_readings()
    pace_before = measured_pace(builder.build())
    assert pace_before == Fraction(800, 20)
    v1_library = as_v1(serialize(builder.build()))
    archive = zip_archive({"library.json": v1_library, "covers/": None})
    target = tmp_path / "target"
    LibraryBuilder().write(target)

    response = post_restore(api_client(target), archive)

    assert response.status_code == 200
    assert json.loads(library_bytes(target))["schemaVersion"] == 2
    assert measured_pace(Store.open(target).library) == pace_before
    assert not (target / "library.v1.bak.json").exists()


def _reading_edit(doc: dict, edit) -> bytes:
    edit(doc["books"][1]["readings"][0])
    return json.dumps(doc).encode()


@pytest.mark.parametrize(
    "edit",
    [
        pytest.param(lambda r: r.update(startPage=-1), id="negative"),
        pytest.param(lambda r: r.pop("startPage"), id="missing"),
    ],
)
def test_a_hand_edited_start_page_at_v2_is_refused(tmp_path: Path, edit) -> None:
    doc = json.loads(serialize(_library_with_readings().build()))
    raw = _reading_edit(doc, edit)
    (tmp_path / "library.json").write_bytes(raw)

    with pytest.raises(StartupError, match="not a valid library"):
        Store.open(tmp_path)
    assert (tmp_path / "library.json").read_bytes() == raw
