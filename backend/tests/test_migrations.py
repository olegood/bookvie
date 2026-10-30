"""The migration chain (AD-13) and startup migration through the store."""

import json
from pathlib import Path

import pytest

from bookvie.store import StartupError, Store, migrations, serialize
from tests.builder import LibraryBuilder


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
    """A fixture chain v1 -> v2. The v2 shape equals v1 plus a tag per Book."""
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
    return builder.write(data_dir).read_bytes()


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
