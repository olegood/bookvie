"""The one-file store: serialize, startup, seeding and flushing (commits: ``test_store_commits.py``)."""

import errno
import fcntl
import json
import os
import subprocess
import sys
from datetime import UTC, date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from bookvie.domain import Library
from bookvie.domain.model import SCHEMA_VERSION, Book, CardNote, Reading
from bookvie.store import (
    CouldntSave,
    OsFileSystem,
    StartupError,
    Store,
    ensure_writable,
    read_last_export,
    serialize,
)
from tests.builder import LibraryBuilder, as_v1
from tests.helpers import EMPTY_LIBRARY, FaultyFs, seeded_store, temp_files

# --- serialize --------------------------------------------------------------


def test_serialize_empty_library_golden_bytes() -> None:
    assert serialize(Library.empty()) == EMPTY_LIBRARY


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
  "schemaVersion": 2,
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
          "startPage": 0,
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
    start_page=st.integers(min_value=0, max_value=100_000),
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
    schema_version=st.just(SCHEMA_VERSION),
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
    assert (data_dir / "library.json").read_bytes() == EMPTY_LIBRARY
    assert (data_dir / "covers").is_dir()
    assert (data_dir / ".staging").is_dir()
    assert list((data_dir / ".staging").iterdir()) == []
    assert store.library == Library.empty()
    assert temp_files(data_dir) == []


def test_leftovers_are_swept(tmp_path: Path) -> None:
    (tmp_path / "library.json.tmp").write_text("x")
    (tmp_path / "library.json.tmpabc123").write_text("y")
    staging = tmp_path / ".staging"
    (staging / "nested").mkdir(parents=True)
    (staging / "nested" / "a.jpg").write_text("z")
    (staging / "b.zip").write_text("z")
    (tmp_path / "keep.txt").write_text("keep")
    Store.open(tmp_path)
    assert temp_files(tmp_path) == []
    assert list(staging.iterdir()) == []
    assert (tmp_path / "keep.txt").read_text() == "keep"


def test_local_state_temp_files_are_swept_and_local_state_kept(tmp_path: Path) -> None:
    (tmp_path / "local-state.json.tmp").write_text("x")
    (tmp_path / "local-state.json.tmpabc123").write_text("y")
    (tmp_path / "local-state.json").write_text('{"lastExportAt": "2026-10-01T09:30:00+02:00"}')
    Store.open(tmp_path)
    assert sorted(tmp_path.glob("local-state.json*")) == [tmp_path / "local-state.json"]


def test_record_export_writes_local_state_atomically(tmp_path: Path) -> None:
    store = Store.open(tmp_path)
    library = (tmp_path / "library.json").read_bytes()
    when = datetime(2026, 10, 30, 12, tzinfo=timezone(timedelta(hours=1)))
    store.record_export(when)
    raw = (tmp_path / "local-state.json").read_bytes()
    assert json.loads(raw) == {"lastExportAt": "2026-10-30T12:00:00+01:00"}
    assert read_last_export(tmp_path) == when
    assert (tmp_path / "library.json").read_bytes() == library
    assert sorted(tmp_path.glob("local-state.json.tmp*")) == []


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "replace"])
def test_failed_record_export_keeps_the_earlier_record(tmp_path: Path, step: str) -> None:
    earlier = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'
    (tmp_path / "local-state.json").write_bytes(earlier)
    store = Store.open(tmp_path)
    store.fs = FaultyFs(step)
    with pytest.raises(CouldntSave):
        store.record_export(datetime(2026, 10, 30, 12, tzinfo=UTC))
    assert (tmp_path / "local-state.json").read_bytes() == earlier
    assert sorted(tmp_path.glob("local-state.json.tmp*")) == []


@pytest.mark.parametrize(
    "raw",
    [
        b"{not json",
        b"\xff\xfe",
        b"[]",
        b"{}",
        b'{"lastExportAt": 5}',
        b'{"lastExportAt": "yesterday"}',
        b'{"lastExportAt": "2026-10-01T09:30:00"}',
    ],
    ids=["bad-json", "not-utf8", "array", "no-key", "number", "not-a-date", "no-offset"],
)
def test_malformed_local_state_reads_as_no_export_and_is_logged(
    tmp_path: Path, raw: bytes, capsys: pytest.CaptureFixture[str]
) -> None:
    (tmp_path / "local-state.json").write_bytes(raw)
    assert read_last_export(tmp_path) is None
    assert "bookvie: local-state.json" in capsys.readouterr().err


def test_missing_local_state_reads_as_no_export_silently(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert read_last_export(tmp_path) is None
    assert capsys.readouterr().err == ""


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
    doc["schemaVersion"] = 3
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


def _newer() -> bytes:
    doc = _valid_doc()
    doc["schemaVersion"] = 3
    return json.dumps(doc).encode()


def _broken_rule() -> bytes:
    doc = _valid_doc()
    doc["books"][0]["id"] = "5f5559ad-3454-4919-9822-e8d24a063e42"
    doc["mainBookId"] = doc["books"][0]["id"]
    return json.dumps(doc).encode()


@pytest.mark.parametrize(
    ("raw", "reason"),
    [
        (lambda: b"\xff", "is not UTF-8 text"),
        (lambda: b"[]", "is not a JSON object"),
        (lambda: b'{"books": []}', "has no schemaVersion"),
        (lambda: b'{"schemaVersion": "1"}', "has a schemaVersion that is not a whole number: '1'"),
        (lambda: b'{"schemaVersion": 0}', "has an unknown schemaVersion 0"),
        (
            _newer,
            "has schemaVersion 3, which is newer than this bookvie supports (2); update bookvie",
        ),
        (
            _broken_rule,
            (
                "breaks a library rule: Main book 5f5559ad-3454-4919-9822-e8d24a063e42 "
                "has no unfinished Reading"
            ),
        ),
    ],
)
def test_startup_refusals_keep_their_exact_messages(tmp_path: Path, raw, reason: str) -> None:
    """Startup and restore share one parse-and-validate path; startup's copy is unchanged."""
    path = tmp_path / "library.json"
    path.write_bytes(raw())
    with pytest.raises(StartupError) as exc:
        Store.open(tmp_path)
    assert exc.value.reason == reason
    assert str(exc.value) == f"{path}: {reason}"


def test_a_document_nested_too_deeply_to_parse_is_not_valid_json(tmp_path: Path) -> None:
    """``json.loads`` raises ``RecursionError`` here; startup refuses it like bad JSON."""
    depth = 1_000_000
    (tmp_path / "library.json").write_bytes(b"[" * depth + b"]" * depth)
    with pytest.raises(StartupError) as exc:
        Store.open(tmp_path)
    assert exc.value.reason.startswith("is not valid JSON (")


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
    assert temp_files(tmp_path) == []


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

    path = LibraryBuilder().write(tmp_path)
    original = as_v1(path.read_bytes())
    path.write_bytes(original)
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


# --- seeding a data folder (LibraryBuilder CLI) -----------------------------


def _run_builder(args: list[str], stdin: str) -> subprocess.CompletedProcess[str]:
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


def test_fsync_uses_full_fsync_where_the_platform_has_it(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, int]] = []
    monkeypatch.setattr(fcntl, "F_FULLFSYNC", 51, raising=False)
    monkeypatch.setattr(fcntl, "fcntl", lambda fd, cmd: calls.append(("fcntl", cmd)))
    monkeypatch.setattr(os, "fsync", lambda fd: calls.append(("fsync", fd)))
    OsFileSystem().fsync(7)
    assert calls == [("fcntl", 51)]


def test_fsync_falls_back_when_full_fsync_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []
    monkeypatch.delattr(fcntl, "F_FULLFSYNC", raising=False)
    monkeypatch.setattr(os, "fsync", calls.append)
    OsFileSystem().fsync(7)
    assert calls == [7]


def test_fsync_falls_back_when_full_fsync_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(fd: int, cmd: int) -> None:
        raise OSError(errno.ENOTSUP, "not supported")

    calls: list[int] = []
    monkeypatch.setattr(fcntl, "F_FULLFSYNC", 51, raising=False)
    monkeypatch.setattr(fcntl, "fcntl", refuse)
    monkeypatch.setattr(os, "fsync", calls.append)
    OsFileSystem().fsync(7)
    assert calls == [7]


def test_fsync_raises_a_real_io_failure_from_full_fsync(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(fd: int, cmd: int) -> None:
        raise OSError(errno.EIO, "I/O error")

    monkeypatch.setattr(fcntl, "F_FULLFSYNC", 51, raising=False)
    monkeypatch.setattr(fcntl, "fcntl", fail)
    monkeypatch.setattr(os, "fsync", lambda fd: pytest.fail("fell back after a real failure"))
    with pytest.raises(OSError) as raised:
        OsFileSystem().fsync(7)
    assert raised.value.errno == errno.EIO


def test_fsync_dir_flushes_a_real_folder(tmp_path: Path) -> None:
    OsFileSystem().fsync_dir(tmp_path)


def test_fsync_dir_flushes_through_fsync(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    flushed: list[int] = []
    monkeypatch.setattr(OsFileSystem, "fsync", lambda self, fd: flushed.append(fd))
    OsFileSystem().fsync_dir(tmp_path)
    assert len(flushed) == 1


@pytest.mark.parametrize("code", [errno.EINVAL, errno.ENOTSUP, errno.EBADF])
@pytest.mark.parametrize("step", ["open", "fsync"])
def test_fsync_dir_skips_a_folder_the_filesystem_cannot_flush(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, step: str, code: int
) -> None:
    def refuse(*args: object) -> None:
        raise OSError(code, "not supported")

    if step == "open":
        monkeypatch.setattr(os, "open", refuse)
    else:
        monkeypatch.setattr(OsFileSystem, "fsync", refuse)
    OsFileSystem().fsync_dir(tmp_path)


@pytest.mark.parametrize("step", ["open", "fsync"])
def test_fsync_dir_raises_a_real_io_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, step: str
) -> None:
    def fail(*args: object) -> None:
        raise OSError(errno.EIO, "I/O error")

    if step == "open":
        monkeypatch.setattr(os, "open", fail)
    else:
        monkeypatch.setattr(OsFileSystem, "fsync", fail)
    with pytest.raises(OSError) as raised:
        OsFileSystem().fsync_dir(tmp_path)
    assert raised.value.errno == errno.EIO


# --- folder creation is flushed (F-S8) ----------------------------------------


class _EventFs(OsFileSystem):
    """Records folder flushes and renames, in order."""

    def __init__(self) -> None:
        self.events: list[tuple[str, Path]] = []

    def replace(self, src: Path, dst: Path) -> None:
        super().replace(src, dst)
        self.events.append(("replace", Path(dst)))

    def fsync_dir(self, directory: Path) -> None:
        super().fsync_dir(directory)
        self.events.append(("fsync_dir", Path(directory)))


def test_ensure_writable_flushes_every_created_folder_outermost_first(tmp_path: Path) -> None:
    fs = _EventFs()
    ensure_writable(tmp_path / "a" / "b" / "data", fs=fs)
    assert fs.events == [
        ("fsync_dir", tmp_path),
        ("fsync_dir", tmp_path / "a"),
        ("fsync_dir", tmp_path / "a" / "b"),
    ]


def test_ensure_writable_flushes_the_parent_of_an_existing_folder(tmp_path: Path) -> None:
    # An earlier start may have created it and died before flushing.
    (tmp_path / "data").mkdir()
    fs = _EventFs()
    ensure_writable(tmp_path / "data", fs=fs)
    assert fs.events == [("fsync_dir", tmp_path)]


def test_ensure_writable_normalizes_dot_dot(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    fs = _EventFs()
    ensure_writable(Path("x/../data"), fs=fs)
    assert (tmp_path / "data").is_dir() and not (tmp_path / "x").exists()
    assert fs.events == [("fsync_dir", tmp_path.resolve())]


def test_ensure_writable_refuses_a_failed_flush(tmp_path: Path) -> None:
    with pytest.raises(StartupError, match="can't be flushed") as exc:
        ensure_writable(tmp_path / "data", fs=FaultyFs("fsync_dir"))
    assert exc.value.path == tmp_path / "data"


def test_fresh_open_flushes_new_folders_before_the_first_commit(tmp_path: Path) -> None:
    fs = _EventFs()
    Store.open(tmp_path, fs=fs)
    assert fs.events == [
        ("fsync_dir", tmp_path),
        ("replace", tmp_path / "library.json"),
        ("fsync_dir", tmp_path),
    ]
    assert (tmp_path / "covers").is_dir() and (tmp_path / ".staging").is_dir()


def test_open_flushes_the_data_folder_every_time(tmp_path: Path) -> None:
    seeded_store(tmp_path)
    fs = _EventFs()
    Store.open(tmp_path, fs=fs)
    assert fs.events == [("fsync_dir", tmp_path)]


def test_retry_after_a_failed_flush_flushes_before_the_first_commit(tmp_path: Path) -> None:
    with pytest.raises(StartupError, match="can't be flushed") as exc:
        Store.open(tmp_path, fs=FaultyFs("fsync_dir"))
    assert exc.value.path == tmp_path / "covers"
    assert not (tmp_path / "library.json").exists()
    assert (tmp_path / "covers").is_dir()  # left behind, as after a crash
    fs = _EventFs()
    Store.open(tmp_path, fs=fs)
    assert fs.events[:2] == [("fsync_dir", tmp_path), ("replace", tmp_path / "library.json")]


def test_unreadable_parent_is_not_flushed_but_startup_continues(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    parent = tmp_path / "drop"
    parent.mkdir()
    parent.chmod(0o333)  # writable and traversable, not readable
    try:
        ensure_writable(parent / "data")
        Store.open(parent / "data")
    finally:
        parent.chmod(0o700)
    assert (parent / "data" / "library.json").is_file()
    assert f"couldn't flush {parent}" in capsys.readouterr().err
