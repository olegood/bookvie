"""The store's atomic commits: ``Store.apply``, faults, the no-op, the AD-4 lock."""

import os
import threading
from pathlib import Path

import pytest

from bookvie.domain import InvariantViolation, Library
from bookvie.store import (
    UNCHANGED,
    CouldntSave,
    OsFileSystem,
    Store,
    serialize,
)
from tests.helpers import FaultyFs, RecordingFs, seeded_store

EMPTY_LIBRARY = (
    b'{\n  "schemaVersion": 2,\n  "mainBookId": null,\n  "upNextBookId": null,\n'
    b'  "sideReadBookIds": [],\n  "books": []\n}\n'
)


def _temps(data_dir: Path) -> list[Path]:
    return sorted(data_dir.glob("library.json.tmp*"))


# --- commits ------------------------------------------------------------------


def _add_tag(tag: str):
    def change(library: Library) -> None:
        library.books[0].tags.append(tag)

    return change


def test_apply_commits_serialized_bytes_and_swaps(tmp_path: Path) -> None:
    store = seeded_store(tmp_path)
    old = store.library
    new = store.apply(_add_tag("sf"))
    on_disk = (tmp_path / "library.json").read_bytes()
    assert on_disk == serialize(new)
    assert Library.model_validate_json(on_disk) == new
    assert store.library is new
    assert old.books[0].tags == []  # the change ran on a copy
    assert _temps(tmp_path) == []


def test_apply_accepts_a_returned_library(tmp_path: Path) -> None:
    store = seeded_store(tmp_path)
    new = store.apply(lambda library: Library.empty())
    assert store.library == new == Library.empty()
    assert (tmp_path / "library.json").read_bytes() == EMPTY_LIBRARY


def test_apply_unchanged_writes_nothing(tmp_path: Path) -> None:
    """AD-9's no-op: a change returning UNCHANGED commits nothing, even under a write fault."""
    store = seeded_store(tmp_path)
    old = store.library
    before = (tmp_path / "library.json").read_bytes()

    def no_op(library: Library):
        library.books[0].tags.append("ignored")  # edits to the draft are dropped
        return UNCHANGED

    store.fs = FaultyFs("write")
    assert store.apply(no_op) is old
    log: list[str] = []
    store.fs = RecordingFs(tmp_path, log)
    assert store.apply(no_op, new_files={"covers/c.jpg": b"cover"}) is old
    assert store.library is old
    assert old.books[0].tags == []
    assert (tmp_path / "library.json").read_bytes() == before
    # The new file was written, then removed again; library.json was never renamed.
    assert log == ["replace covers/c.jpg", "remove covers/c.jpg"]
    assert not (tmp_path / "covers" / "c.jpg").exists()
    assert _temps(tmp_path) == []


def test_library_changes_only_after_the_rename(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    class Watching(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            seen["before"] = store.library
            seen["file_before"] = dst.read_bytes()
            super().replace(src, dst)
            seen["after_rename"] = store.library

    store = seeded_store(tmp_path, fs=Watching())
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

    store = seeded_store(tmp_path, fs=Slow())
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
    store = seeded_store(tmp_path)
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


def test_commit_fsyncs_the_folder_after_the_rename(tmp_path: Path) -> None:
    events: list[tuple[str, Path]] = []

    class Recording(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            super().replace(src, dst)
            events.append(("replace", Path(dst)))

        def fsync_dir(self, directory: Path) -> None:
            super().fsync_dir(directory)
            events.append(("fsync_dir", Path(directory)))

    store = seeded_store(tmp_path, fs=Recording())
    events.clear()  # startup flushes the data folder on every open
    store.apply(_add_tag("x"))
    assert events == [("replace", tmp_path / "library.json"), ("fsync_dir", tmp_path)]


def test_folder_fsync_fault_after_the_rename_still_commits(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """The rename is the commit; a failed folder flush is logged, not rolled back."""
    store = seeded_store(tmp_path)
    store.fs = FaultyFs("fsync_dir")
    new = store.apply(_add_tag("x"), new_files={"covers/c.jpg": b"cover"})
    assert store.library is new
    assert (tmp_path / "library.json").read_bytes() == serialize(new)
    assert (tmp_path / "covers" / "c.jpg").read_bytes() == b"cover"
    assert _temps(tmp_path) == []
    assert "couldn't flush" in capsys.readouterr().err


def test_fault_while_cleaning_up_still_reports_couldnt_save(tmp_path: Path) -> None:
    store = seeded_store(tmp_path)
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
    store = seeded_store(tmp_path)
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


@pytest.mark.parametrize("version", [0, 3])
def test_change_to_schema_version_commits_nothing(tmp_path: Path, version: int) -> None:
    store = seeded_store(tmp_path)
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
    store = seeded_store(tmp_path)
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

    store = seeded_store(tmp_path)
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
    store = seeded_store(tmp_path)
    before = (tmp_path / "library.json").read_bytes()

    def broken(library: Library) -> None:
        library.books[0].tags.append("half")
        raise ValueError("refused")

    with pytest.raises(ValueError):
        store.apply(broken)
    assert (tmp_path / "library.json").read_bytes() == before
    assert store.library.books[0].tags == []


def test_concurrent_apply_loses_nothing(tmp_path: Path) -> None:
    store = seeded_store(tmp_path)
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
    store = seeded_store(tmp_path)
    held: list[bool] = []
    store.apply(lambda library: held.append(store.lock.locked()))
    assert held == [True]
    assert not store.lock.locked()
