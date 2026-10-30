"""The one-file store: serialize, startup, atomic commits, faults, the AD-4 lock."""

import json
import os
import threading
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from bookvie.domain import InvariantViolation, Library
from bookvie.domain.model import Book, CardNote, Reading
from bookvie.store import (
    CouldntSave,
    OsFileSystem,
    StartupError,
    Store,
    ensure_writable,
    serialize,
)
from tests.builder import LibraryBuilder

EMPTY_V1 = (
    b'{\n  "schemaVersion": 1,\n  "mainBookId": null,\n  "upNextBookId": null,\n'
    b'  "sideReadBookIds": [],\n  "books": []\n}\n'
)


def _temps(data_dir: Path) -> list[Path]:
    return sorted(data_dir.glob("library.json.tmp*"))


# --- serialize --------------------------------------------------------------


def test_serialize_empty_library_golden_bytes() -> None:
    assert serialize(Library.empty()) == EMPTY_V1


def test_serialize_book_golden_bytes(library_builder: LibraryBuilder) -> None:
    book = library_builder.book(
        id="b1",
        created_at="2026-01-02T10:00:00+01:00",
        title="Cien años de soledad",
        authors=["Gabriel García Márquez"],
        pages=417,
        language="Español",
        publisher="Sudamericana",
        type="hardcover",
        year=1967,
        tags=["novela"],
        spine_color_curated="#749076",
    )
    library_builder.reading(
        book,
        id="r1",
        start_date="2026-01-03",
        current_page=12,
        last_progress_update="2026-01-04T21:30:00+01:00",
    )
    library_builder.card_note(
        book, id="n1", text="«Muchos años después…»", page_start=1,
        created_at="2026-01-03T08:00:00Z",
    )  # fmt: skip
    library_builder.main(book)
    expected = """{
  "schemaVersion": 1,
  "mainBookId": "b1",
  "upNextBookId": null,
  "sideReadBookIds": [],
  "books": [
    {
      "id": "b1",
      "createdAt": "2026-01-02T10:00:00+01:00",
      "ownership": "owned",
      "title": "Cien años de soledad",
      "subtitle": null,
      "authors": [
        "Gabriel García Márquez"
      ],
      "pages": 417,
      "edition": 1,
      "language": "Español",
      "publisher": "Sudamericana",
      "type": "hardcover",
      "isbn": null,
      "year": 1967,
      "tags": [
        "novela"
      ],
      "coverFile": null,
      "spineColorUser": null,
      "spineColorFromCover": null,
      "spineColorCurated": "#749076",
      "spineColor": "#749076",
      "readings": [
        {
          "id": "r1",
          "startDate": "2026-01-03",
          "currentPage": 12,
          "purpose": null,
          "lastProgressUpdate": "2026-01-04T21:30:00+01:00",
          "pausedAt": null,
          "finishDate": null,
          "finishedPages": null,
          "purposeFulfilled": null,
          "rating": null
        }
      ],
      "cardNotes": [
        {
          "id": "n1",
          "text": "«Muchos años después…»",
          "pageStart": 1,
          "pageEnd": null,
          "createdAt": "2026-01-03T08:00:00Z"
        }
      ]
    }
  ]
}
""".encode()
    data = serialize(library_builder.build())
    assert data == expected
    assert b"\r" not in data and data.endswith(b"}\n") and not data.endswith(b"\n\n")


_text = st.text(st.characters(exclude_categories=("Cs",)), max_size=12)
_dates = st.dates(min_value=date(1900, 1, 1), max_value=date(2100, 12, 31))
_zones = st.integers(min_value=-14 * 60, max_value=14 * 60).map(
    lambda minutes: timezone(timedelta(minutes=minutes))
)
_stamps = st.datetimes(
    min_value=datetime(1900, 1, 2), max_value=datetime(2100, 12, 30), timezones=_zones
)
_ints = st.integers(min_value=-(2**31), max_value=2**31)


def _opt(strategy: st.SearchStrategy) -> st.SearchStrategy:
    return st.none() | strategy


def _model(cls, **fields: st.SearchStrategy) -> st.SearchStrategy:
    # Not st.builds: it would also fill required fields by their aliases.
    return st.fixed_dictionaries(fields).map(lambda kwargs: cls(**kwargs))


_readings = _model(
    Reading,
    id=_text,
    start_date=_opt(_dates),
    current_page=_ints,
    purpose=_opt(_text),
    last_progress_update=_opt(_stamps),
    paused_at=_opt(_dates),
    finish_date=_opt(_dates),
    finished_pages=_opt(_ints),
    purpose_fulfilled=_opt(st.sampled_from(["yes", "partly", "notYet"])),
    rating=_opt(st.integers(1, 5)),
)
_notes = _model(
    CardNote, id=_text, text=_text, page_start=_ints, page_end=_opt(_ints), created_at=_stamps
)
_books = _model(
    Book,
    id=_text,
    created_at=_stamps,
    ownership=st.just("owned"),
    title=_text,
    subtitle=_opt(_text),
    authors=st.lists(_text, max_size=3),
    pages=st.integers(1, 10_000),
    edition=st.integers(1, 20),
    language=_text,
    publisher=_text,
    type=st.sampled_from(["paperback", "hardcover", "ebook"]),
    isbn=_opt(_text),
    year=_opt(_ints),
    tags=st.lists(_text, max_size=3),
    cover_file=_opt(_text),
    spine_color_user=_opt(_text),
    spine_color_from_cover=_opt(_text),
    spine_color_curated=_text,
    spine_color=_text,
    readings=st.lists(_readings, max_size=2),
    card_notes=st.lists(_notes, max_size=2),
)
_libraries = _model(
    Library,
    schema_version=st.just(1),
    main_book_id=_opt(_text),
    up_next_book_id=_opt(_text),
    side_read_book_ids=st.lists(_text, max_size=4),
    books=st.lists(_books, max_size=3),
)


@settings(max_examples=150, suppress_health_check=[HealthCheck.too_slow])
@given(_libraries)
def test_serialize_round_trips(library: Library) -> None:
    data = serialize(library)
    again = Library.model_validate_json(data)
    assert again == library
    assert serialize(again) == data
    assert data.endswith(b"\n") and not data.endswith(b"\n\n")
    assert b"\r\n" not in data
    data.decode("utf-8")


# --- startup ------------------------------------------------------------------


def test_first_start_creates_empty_library_covers_and_staging(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    ensure_writable(data_dir)
    store = Store.open(data_dir)
    assert (data_dir / "library.json").read_bytes() == EMPTY_V1
    assert (data_dir / "covers").is_dir()
    assert (data_dir / ".staging").is_dir()
    assert list((data_dir / ".staging").iterdir()) == []
    assert store.library == Library.empty()
    assert _temps(data_dir) == []


def test_leftovers_are_swept(tmp_path: Path) -> None:
    (tmp_path / "library.json.tmp").write_text("x")
    (tmp_path / "library.json.tmpabc123").write_text("y")
    staging = tmp_path / ".staging"
    (staging / "nested").mkdir(parents=True)
    (staging / "nested" / "a.jpg").write_text("z")
    (staging / "b.zip").write_text("z")
    (tmp_path / "keep.txt").write_text("keep")
    Store.open(tmp_path)
    assert _temps(tmp_path) == []
    assert list(staging.iterdir()) == []
    assert (tmp_path / "keep.txt").read_text() == "keep"


def test_valid_v1_is_loaded_and_bytes_unchanged(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = builder.book(title="Dune")
    builder.reading(dune, current_page=40)
    builder.main(dune)
    path = builder.write(tmp_path)
    before = path.read_bytes()
    mtime = path.stat().st_mtime_ns
    store = Store.open(tmp_path)
    assert path.read_bytes() == before
    assert path.stat().st_mtime_ns == mtime
    assert store.library == builder.build()


def _refused(data_dir: Path, raw: bytes, reason: str) -> None:
    """Refused before anything in the folder changes, leftovers included."""
    path = data_dir / "library.json"
    path.write_bytes(raw)
    (data_dir / "library.json.tmp1").write_text("leftover")
    with pytest.raises(StartupError) as exc:
        Store.open(data_dir)
    assert exc.value.path == path
    assert reason in str(exc.value)
    assert str(path) in str(exc.value)
    assert path.read_bytes() == raw
    assert sorted(p.name for p in data_dir.iterdir()) == ["library.json", "library.json.tmp1"]


def _valid_doc() -> dict:
    builder = LibraryBuilder()
    builder.book()
    return json.loads(serialize(builder.build()))


def test_newer_file_is_refused(tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["schemaVersion"] = 2
    _refused(tmp_path, json.dumps(doc).encode(), "newer than this bookvie supports")


@pytest.mark.parametrize(
    ("raw", "reason"),
    [
        (b"{not json", "is not valid JSON"),
        (b"", "is not valid JSON"),
        (b'{"schemaVersion": 1, "x": "\xff"}', "is not UTF-8"),
        (b"[]", "is not a JSON object"),
        (b'"text"', "is not a JSON object"),
        (b'{"books": []}', "has no schemaVersion"),
        (b'{"schemaVersion": "1"}', "not a whole number"),
        (b'{"schemaVersion": 1.0}', "not a whole number"),
        (b'{"schemaVersion": true}', "not a whole number"),
        (b'{"schemaVersion": 0}', "unknown schemaVersion"),
    ],
)
def test_invalid_file_is_refused(tmp_path: Path, raw: bytes, reason: str) -> None:
    _refused(tmp_path, raw, reason)


def test_unknown_key_is_refused(tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["books"][0]["shelf"] = "top"
    _refused(tmp_path, json.dumps(doc).encode(), "books.0.shelf")


def test_wrong_type_is_refused(tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["books"][0]["pages"] = "300"
    doc["books"][0]["edition"] = "1"
    _refused(tmp_path, json.dumps(doc).encode(), "and 1 more problem")


def test_failed_invariant_is_refused(tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["mainBookId"] = doc["books"][0]["id"]  # Main book without a Reading
    _refused(tmp_path, json.dumps(doc).encode(), "breaks a library rule")


def test_unwritable_data_dir_is_refused(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    data_dir.chmod(0o500)
    try:
        with pytest.raises(StartupError, match="is not writable") as exc:
            ensure_writable(data_dir)
        assert exc.value.path == data_dir
    finally:
        data_dir.chmod(0o700)
    assert list(data_dir.iterdir()) == []


def test_unwritable_parent_is_refused(tmp_path: Path) -> None:
    parent = tmp_path / "parent"
    parent.mkdir()
    parent.chmod(0o500)
    try:
        with pytest.raises(StartupError, match="can't be created") as exc:
            ensure_writable(parent / "data")
        assert str(parent / "data") in str(exc.value)
    finally:
        parent.chmod(0o700)
    assert not (parent / "data").exists()


def test_data_dir_that_is_a_file_is_refused(tmp_path: Path) -> None:
    path = tmp_path / "data"
    path.write_text("not a folder")
    with pytest.raises(StartupError, match="is not a folder"):
        ensure_writable(path)


def test_failed_startup_create_is_refused(tmp_path: Path) -> None:
    with pytest.raises(StartupError, match="can't be written"):
        Store.open(tmp_path, fs=FaultyFs("replace"))
    assert not (tmp_path / "library.json").exists()
    assert _temps(tmp_path) == []


def test_unreadable_library_is_refused(tmp_path: Path) -> None:
    path = LibraryBuilder().write(tmp_path)
    raw = path.read_bytes()
    path.chmod(0o000)
    try:
        with pytest.raises(StartupError, match="can't be read") as exc:
            Store.open(tmp_path)
        assert exc.value.path == path
    finally:
        path.chmod(0o600)
    assert path.read_bytes() == raw


@pytest.mark.parametrize("name", ["covers", ".staging"])
def test_uncreatable_folder_is_refused(tmp_path: Path, name: str) -> None:
    (tmp_path / name).write_text("not a folder")
    with pytest.raises(StartupError, match="can't be created") as exc:
        Store.open(tmp_path)
    assert exc.value.path == tmp_path / name
    assert not (tmp_path / "library.json").exists()

def test_failed_backup_stops_migration(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from bookvie.store import migrations

    original = LibraryBuilder().write(tmp_path).read_bytes()
    monkeypatch.setattr(migrations, "CURRENT_VERSION", 2)
    monkeypatch.setattr(migrations, "STEPS", {1: lambda doc: {**doc, "schemaVersion": 2}})
    with pytest.raises(StartupError, match="library.v1.bak.json"):
        Store.open(tmp_path, fs=FaultyFs("write"))
    assert (tmp_path / "library.json").read_bytes() == original
    assert not (tmp_path / "library.v1.bak.json").exists()


def test_unremovable_leftover_is_refused(tmp_path: Path) -> None:
    (tmp_path / "library.json.tmp1").write_text("x")
    with pytest.raises(StartupError, match="leftover"):
        Store.open(tmp_path, fs=FaultyFs("remove"))


# --- commits ------------------------------------------------------------------


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

    def remove(self, path: Path) -> None:
        self._maybe_fail("remove")
        super().remove(path)


def _seeded_store(data_dir: Path, fs: OsFileSystem | None = None) -> Store:
    builder = LibraryBuilder()
    builder.book(title="Dune", tags=[])
    builder.write(data_dir)
    return Store.open(data_dir, fs=fs)


def _add_tag(tag: str):
    def change(library: Library) -> None:
        library.books[0].tags.append(tag)

    return change


def test_apply_commits_serialized_bytes_and_swaps(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    old = store.library
    new = store.apply(_add_tag("sf"))
    on_disk = (tmp_path / "library.json").read_bytes()
    assert on_disk == serialize(new)
    assert Library.model_validate_json(on_disk) == new
    assert store.library is new
    assert old.books[0].tags == []  # the change ran on a copy
    assert _temps(tmp_path) == []


def test_apply_accepts_a_returned_library(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    new = store.apply(lambda library: Library.empty())
    assert store.library == new == Library.empty()
    assert (tmp_path / "library.json").read_bytes() == EMPTY_V1


def test_library_changes_only_after_the_rename(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    class Watching(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            seen["before"] = store.library
            seen["file_before"] = dst.read_bytes()
            super().replace(src, dst)
            seen["after_rename"] = store.library

    store = _seeded_store(tmp_path, fs=Watching())
    old = store.library
    old_bytes = (tmp_path / "library.json").read_bytes()
    new = store.apply(_add_tag("x"))
    assert seen["before"] is old
    assert seen["after_rename"] is old  # swap comes after the rename returns
    assert seen["file_before"] == old_bytes
    assert store.library is new


def test_readers_see_old_state_until_swap(tmp_path: Path) -> None:
    """A reader thread polling during a slow commit only ever sees old or new."""
    in_rename = threading.Event()
    release = threading.Event()

    class Slow(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            in_rename.set()
            release.wait(5)
            super().replace(src, dst)

    store = _seeded_store(tmp_path, fs=Slow())
    old = store.library
    writer = threading.Thread(target=store.apply, args=(_add_tag("x"),))
    writer.start()
    assert in_rename.wait(5)
    assert store.library is old
    assert store.library.books[0].tags == []
    release.set()
    writer.join(5)
    assert store.library.books[0].tags == ["x"]


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "close", "replace"])
def test_fault_leaves_file_and_state_unchanged(tmp_path: Path, step: str) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    old = store.library
    store.fs = FaultyFs(step)
    with pytest.raises(CouldntSave) as exc:
        store.apply(_add_tag("x"))
    assert exc.value.code == "couldnt_save"
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library is old
    assert _temps(tmp_path) == []
    store.fs = OsFileSystem()
    store.apply(_add_tag("y"))
    assert store.library.books[0].tags == ["y"]


def test_fault_while_cleaning_up_still_reports_couldnt_save(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()

    class Both(FaultyFs):
        def close(self, fd: int) -> None:
            super().close(fd)
            raise OSError(5, "close fails too")

        def remove(self, path: Path) -> None:
            os.remove(path)
            raise OSError(5, "remove fails too")

    store.fs = Both("fsync")
    with pytest.raises(CouldntSave):
        store.apply(_add_tag("x"))
    assert (tmp_path / "library.json").read_bytes() == before
    assert _temps(tmp_path) == []


def test_non_oserror_in_cleanup_still_removes_the_temp_file(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()

    class OddClose(FaultyFs):
        def close(self, fd: int) -> None:
            super().close(fd)
            raise RuntimeError("close fails oddly")

    store.fs = OddClose("fsync")
    with pytest.raises(CouldntSave):
        store.apply(_add_tag("x"))
    assert (tmp_path / "library.json").read_bytes() == before
    assert _temps(tmp_path) == []

@pytest.mark.parametrize("version", [0, 2])
def test_change_to_schema_version_commits_nothing(tmp_path: Path, version: int) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    old = store.library

    def bump(library: Library) -> None:
        library.schema_version = version

    with pytest.raises(InvariantViolation) as exc:
        store.apply(bump)
    assert exc.value.rule == "schema_version"
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library is old

def test_invariant_failure_commits_nothing(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    old = store.library

    def dangling(library: Library) -> None:
        library.up_next_book_id = "gone"

    with pytest.raises(InvariantViolation):
        store.apply(dangling)
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library is old


@pytest.mark.parametrize(("field", "value"), [("pages", "300"), ("pages", 0), ("type", "scroll")])
def test_change_that_breaks_the_model_commits_nothing(
    tmp_path: Path, field: str, value: object
) -> None:
    from pydantic import ValidationError

    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    old = store.library

    def bad(library: Library) -> None:
        setattr(library.books[0], field, value)

    with pytest.raises(ValidationError):
        store.apply(bad)
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library is old
    assert old.books[0].pages == 300 and old.books[0].type == "paperback"
    assert _temps(tmp_path) == []
    Store.open(tmp_path)  # the file still loads


def test_change_that_raises_commits_nothing(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()

    def broken(library: Library) -> None:
        library.books[0].tags.append("half")
        raise ValueError("refused")

    with pytest.raises(ValueError):
        store.apply(broken)
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library.books[0].tags == []


def test_concurrent_apply_loses_nothing(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    barrier = threading.Barrier(2)

    def worker(prefix: str) -> None:
        barrier.wait()
        for i in range(50):
            store.apply(_add_tag(f"{prefix}{i}"))

    threads = [threading.Thread(target=worker, args=(p,)) for p in "ab"]
    for t in threads:
        t.start()
    for t in threads:
        t.join(60)
    expected = {f"{p}{i}" for p in "ab" for i in range(50)}
    tags = store.library.books[0].tags
    assert len(tags) == 100 and set(tags) == expected
    on_disk = Library.model_validate_json((tmp_path / "library.json").read_bytes())
    assert on_disk == store.library
    assert _temps(tmp_path) == []


def test_apply_holds_the_ad4_lock(tmp_path: Path) -> None:
    store = _seeded_store(tmp_path)
    held: list[bool] = []
    store.apply(lambda library: held.append(store.lock.locked()))
    assert held == [True]
    assert not store.lock.locked()


# --- seeding a data folder (LibraryBuilder CLI) -----------------------------


def _run_builder(args: list[str], stdin: str) -> "subprocess.CompletedProcess[str]":
    import subprocess
    import sys

    backend = Path(__file__).resolve().parents[1]
    return subprocess.run(
        [sys.executable, "-m", "tests.builder", *args],
        input=stdin, capture_output=True, text=True, cwd=backend, timeout=60,
    )  # fmt: skip


def test_builder_cli_seeds_a_loadable_library(tmp_path: Path) -> None:
    partial = {
        "books": [
            {"id": "dune", "title": "Dune", "authors": ["Frank Herbert"], "pages": 412,
             "readings": [{"currentPage": 100}], "cardNotes": [{"pageStart": 3}]},
            {"title": "Solaris"},
        ],
        "mainBookId": "dune",
    }  # fmt: skip
    result = _run_builder([str(tmp_path / "seed")], json.dumps(partial))
    assert result.returncode == 0, result.stderr
    raw = (tmp_path / "seed" / "library.json").read_bytes()
    store = Store.open(tmp_path / "seed")
    assert (tmp_path / "seed" / "library.json").read_bytes() == raw
    dune, solaris = store.library.books
    assert store.library.main_book_id == "dune"
    assert dune.readings[0].current_page == 100
    assert dune.card_notes[0].page_start == 3
    assert solaris.title == "Solaris" and solaris.spine_color_curated != dune.spine_color_curated


def test_builder_cli_refuses_invariant_breaks_and_the_real_library(tmp_path: Path) -> None:
    broken = _run_builder([str(tmp_path / "x")], '{"mainBookId": "gone"}')
    assert broken.returncode != 0
    assert not (tmp_path / "x" / "library.json").exists()
    real = _run_builder([str(Path.home() / "bookvie-data")], "{}")
    assert real.returncode == 2
    assert "refusing the real library" in real.stderr
    assert not (Path.home() / "bookvie-data").exists()
    assert _run_builder([], "").returncode == 2
