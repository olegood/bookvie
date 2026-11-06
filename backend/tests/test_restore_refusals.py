"""Story 2.3: refuse damaged, hostile or newer files (FR-23, NFR5, AR18).

The four server-side acceptance criteria, numbered in the order of epics.md,
Story 2.3:

- AC-1: a damaged or invalid file is 422 ``restore_invalid`` (BKP-API-003).
- AC-2: a newer ``schemaVersion`` is 422 ``restore_newer_version``.
- AC-3: a hostile archive is 422 ``restore_unsafe``, before anything outside
  ``.staging/`` is written (BKP-API-004, R-14).
- AC-4: a fault while covers are copied in or at the commit is 503
  ``couldnt_save`` with the previous library intact (BKP-API-005, R-02).

AC-5 is the Backup page, in ``frontend/e2e/restore-refusals.spec.ts``; its
"every refusal code has an API test" half is AC-1 to AC-4 here.

AC-1 and AC-4 already pass on Story 2.2's code (its catch-all refusal and its
AD-12 undo). They are kept as one leaf each, so the split into three refusal
codes can't move a damaged file out of ``restore_invalid`` or loosen a fault.

The scaffolds pin these names (see the ATDD checklist):

- The limits are module attributes of :mod:`bookvie.store.restore`, read at
  call time so a test can lower them: ``MAX_UPLOAD_BYTES`` and
  ``MAX_EXTRACTED_BYTES`` (1 GiB each), ``MAX_ENTRIES`` (5,000) and
  ``MAX_COVER_NAME_BYTES`` (200, Epic 2 retro action 2).
- ``restore_unsafe`` has the same message as ``restore_invalid``.
"""

import errno
import io
import json
import os
import stat
import struct
import zipfile
from pathlib import Path

import pytest

import bookvie.store.restore as unpack
from bookvie.http.api import FRAMING_SLACK
from bookvie.store import OsFileSystem, migrations
from bookvie.store.store import TEMP_PREFIX
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    DUNE,
    DUNE_ID,
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

INVALID_MESSAGE = "This file isn't a bookvie export, or it's damaged. Nothing was changed."
NEWER_MESSAGE = "This export is from a newer version of bookvie. Nothing was changed."
RESTORE_INVALID_BODY = {
    "error": {"kind": "refusal", "code": "restore_invalid", "message": INVALID_MESSAGE}
}
RESTORE_NEWER_VERSION_BODY = {
    "error": {"kind": "refusal", "code": "restore_newer_version", "message": NEWER_MESSAGE}
}
RESTORE_UNSAFE_BODY = {
    "error": {"kind": "refusal", "code": "restore_unsafe", "message": INVALID_MESSAGE}
}

GIB = 1024**3

DUNE_COVER = f"{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
PIRANESI_COVER = f"{PIRANESI_ID}-11111111-2222-4333-8444-555555555555.png"
OLD_BOOK_ID = "3a5b7c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
OLD_COVER = f"{OLD_BOOK_ID}-66666666-7777-4888-9999-000000000000.jpg"
"""The cover of the library a refused restore must leave alone."""
# One name in two Unicode forms: APFS stores both as one file (Epic 2 retro F-R1).
ACCENTED_NFC = "\u00e9.jpg"
ACCENTED_NFD = "e\u0301.jpg"


# --- Seeds and archives -------------------------------------------------------


def _seed_source(data_dir: Path) -> None:
    """Dune (JPEG cover) and Piranesi (PNG cover): an export with two covers to copy in."""
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID, **DUNE, cover_file=f"covers/{DUNE_COVER}", spine_color_from_cover="#A85A4A"
    )
    builder.book(
        id=PIRANESI_ID,
        title="Piranesi",
        authors=["Susanna Clarke"],
        pages=272,
        cover_file=f"covers/{PIRANESI_COVER}",
        spine_color_from_cover="#5B7590",
    )
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / "covers" / DUNE_COVER).write_bytes(image_bytes(fmt="JPEG"))
    (data_dir / "covers" / PIRANESI_COVER).write_bytes(image_bytes(color=(91, 117, 144)))


def _seed_target(data_dir: Path) -> None:
    """The library every refusal must leave byte-identical: one Book with a cover."""
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


class _Source:
    """A real export of :func:`_seed_source`, and its parts to hand-make variants from."""

    def __init__(self, tmp_path: Path) -> None:
        data_dir = tmp_path / "source"
        _seed_source(data_dir)
        self.export = api_client(data_dir).get(EXPORT, headers=EXPORT_HEADERS).content
        self.library = library_bytes(data_dir)
        self.doc = json.loads(self.library)
        self.covers = covers_in(data_dir)
        self.extracted = len(self.library) + sum(len(data) for data in self.covers.values())

    def entries(self, library: bytes | None = None) -> dict[str, bytes | None]:
        """The export's entries, in its order, with ``library`` as ``library.json``."""
        entries: dict[str, bytes | None] = {"library.json": library or self.library}
        entries["covers/"] = None
        entries.update({f"covers/{name}": data for name, data in self.covers.items()})
        return entries

    def with_doc(self, doc: dict) -> bytes:
        """The export with ``doc`` as ``library.json``, and every cover."""
        return zip_archive(self.entries((json.dumps(doc, indent=2) + "\n").encode("utf-8")))


def _with_raw_entries(archive: bytes, extra: list[tuple[zipfile.ZipInfo, bytes]]) -> bytes:
    """``archive`` plus ``extra`` entries written as given (duplicates, symlinks)."""
    buffer = io.BytesIO(archive)
    with zipfile.ZipFile(buffer, "a") as zf:
        for info, data in extra:
            zf.writestr(info, data)
    return buffer.getvalue()


def _symlink(name: str, target: str) -> tuple[zipfile.ZipInfo, bytes]:
    info = zipfile.ZipInfo(name)
    info.create_system = 3  # Unix, so external_attr carries the file type
    info.external_attr = (stat.S_IFLNK | 0o777) << 16
    return info, target.encode()


def _understated(archive_entries: dict[str, bytes], name: str, declared: int) -> bytes:
    """A deflated archive whose headers say ``name`` holds ``declared`` bytes.

    Both the local header and the central directory understate it, as a zip
    bomb would.
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for entry, data in archive_entries.items():
            zf.writestr(entry, data)
    raw = bytearray(buffer.getvalue())
    with zipfile.ZipFile(io.BytesIO(bytes(raw))) as zf:
        offset = zf.getinfo(name).header_offset
    struct.pack_into("<I", raw, offset + 22, declared)  # local header: uncompressed size
    position = raw.find(b"PK\x01\x02")
    while position != -1:
        name_length = struct.unpack_from("<H", raw, position + 28)[0]
        if raw[position + 46 : position + 46 + name_length] == name.encode():
            struct.pack_into("<I", raw, position + 24, declared)  # central directory
        position = raw.find(b"PK\x01\x02", position + 46)
    return bytes(raw)


# --- Checks -------------------------------------------------------------------


class _Snapshot:
    """``library.json``, ``covers/`` and both folder listings, to prove nothing changed."""

    def __init__(self, data_dir: Path) -> None:
        self.library = library_bytes(data_dir)
        self.covers = covers_in(data_dir)
        self.data_dir = sorted(p.name for p in data_dir.iterdir())
        self.parent = sorted(p.name for p in data_dir.parent.iterdir())

    @classmethod
    def assert_unchanged(cls, before: _Snapshot, data_dir: Path, case: str) -> None:
        after = cls(data_dir)
        assert after.library == before.library, f"{case}: library.json changed"
        assert after.covers == before.covers, f"{case}: covers/ changed"
        assert after.data_dir == before.data_dir, f"{case}: the data folder changed"
        assert after.parent == before.parent, f"{case}: something was written beside it"
        assert staging_in(data_dir) == [], f"{case}: .staging/ wasn't emptied"


def _outside_staging(log: list[str]) -> list[str]:
    return [entry for entry in log if not entry.split(" ", 1)[1].startswith(".staging/")]


def _referenced_covers_exist(data_dir: Path) -> bool:
    books = json.loads(library_bytes(data_dir))["books"]
    return all((data_dir / b["coverFile"]).is_file() for b in books if b.get("coverFile"))


# --- AC-1: a damaged or invalid file is 422 restore_invalid --------------------


def test_ac1_p0_a_damaged_or_invalid_file_is_422_restore_invalid_and_changes_nothing(
    tmp_path: Path,
) -> None:
    source = _Source(tmp_path)
    doc = source.doc
    dune_book = next(book for book in doc["books"] if book["id"] == DUNE_ID)
    untitled = {k: v for k, v in dune_book.items() if k != "title"}
    unversioned = {k: v for k, v in doc.items() if k != "schemaVersion"}
    marker = b'"schemaVersion"'
    assert source.with_doc(doc).count(marker) == 1, "entries are stored, so the bytes are as is"
    damaged = {
        "a file that isn't a zip": b"this is not a zip",
        "an empty file": b"",
        "a zip without library.json": zip_archive(
            {k: v for k, v in source.entries().items() if k != "library.json"}
        ),
        "an archive cut in half": source.export[: len(source.export) // 2],
        "an archive missing its last byte": source.export[:-1],
        "an entry that fails its CRC": source.with_doc(doc).replace(marker, b'"schemaVersioN"'),
        "a library.json that isn't JSON": zip_archive(source.entries(b"{not json")),
        "a library.json that isn't UTF-8": zip_archive(source.entries(b"\xff\xfe{}")),
        "a library.json that isn't an object": zip_archive(source.entries(b"[]")),
        "no schemaVersion": source.with_doc(unversioned),
        "a schemaVersion of true": source.with_doc({**doc, "schemaVersion": True}),
        'a schemaVersion of "1"': source.with_doc({**doc, "schemaVersion": "1"}),
        "a field the schema doesn't know": source.with_doc({**doc, "shelves": []}),
        "a Book without a title": source.with_doc(
            {**doc, "books": [untitled if b is dune_book else b for b in doc["books"]]}
        ),
        "the Main book also Up next (AD-18)": source.with_doc(
            {**doc, "mainBookId": DUNE_ID, "upNextBookId": DUNE_ID}
        ),
        "a referenced cover missing": zip_archive(
            {k: v for k, v in source.entries().items() if k != f"covers/{DUNE_COVER}"}
        ),
        "a referenced cover that doesn't decode": zip_archive(
            {**source.entries(), f"covers/{DUNE_COVER}": b"\xff\xd8 not really a JPEG"}
        ),
    }
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    for case, archive in damaged.items():
        before = _Snapshot(target)

        response = post_restore(client, archive)

        assert response.json()["error"]["code"] == "restore_invalid", case
        assert response.status_code == 422, case
        assert response.json() == RESTORE_INVALID_BODY, case
        _Snapshot.assert_unchanged(before, target, case)

    titles = [book["title"] for book in client.get("/api/views/catalog").json()["books"]]
    assert titles == ["The Left Hand of Darkness"]


# --- AC-2: a newer schemaVersion is 422 restore_newer_version ------------------


def test_ac2_p0_a_newer_schema_version_is_422_restore_newer_version_and_changes_nothing(
    tmp_path: Path,
) -> None:
    source = _Source(tmp_path)
    # As a later bookvie would write it: a higher version and a field today's
    # schema doesn't know. The version is checked first, so it isn't "damaged".
    newer = {**source.doc, "schemaVersion": migrations.CURRENT_VERSION + 1, "shelves": []}
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)

    response = post_restore(client, source.with_doc(newer))

    assert response.json()["error"]["code"] == "restore_newer_version"
    assert response.status_code == 422
    assert response.json() == RESTORE_NEWER_VERSION_BODY
    _Snapshot.assert_unchanged(before, target, "a newer schemaVersion")
    titles = [book["title"] for book in client.get("/api/views/catalog").json()["books"]]
    assert titles == ["The Left Hand of Darkness"]


# --- AC-3: a hostile archive is 422 restore_unsafe, nothing written outside .staging/


def test_ac3_p0_a_hostile_archive_is_422_restore_unsafe_before_anything_outside_staging_changes(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = _Source(tmp_path)
    entries = source.entries()
    upper = DUNE_COVER.upper()
    # Valid apart from its count: 5,001 entries, each filler a plain cover name.
    fillers = {
        f"covers/{OLD_BOOK_ID}-00000000-0000-4000-8000-{n:012d}.jpg": b"x"
        for n in range(5_001 - len(entries))
    }
    # (case, archive, limits to lower first). Every archive is a valid export
    # apart from the one hostile thing, so only the safety rule can refuse it.
    without_dune = {k: v for k, v in entries.items() if k != f"covers/{DUNE_COVER}"}
    dune_again = (zipfile.ZipInfo(f"covers/{DUNE_COVER}"), source.covers[DUNE_COVER])
    long_name = f"covers/{'a' * 300}.jpg"
    # 101 two-byte characters plus ".jpg": 105 characters, 206 bytes.
    wide_name = f"covers/{'\u00e9' * 101}.jpg"
    wide_cover = wide_name.removeprefix("covers/")
    assert len(wide_cover) <= unpack.MAX_COVER_NAME_BYTES < len(wide_cover.encode())
    library_again = (zipfile.ZipInfo("library.json"), source.library)
    hostile: list[tuple[str, bytes, dict[str, int]]] = [
        (
            "an entry other than library.json or covers/<name>",
            zip_archive({**entries, "notes.txt": b"not part of an export"}),
            {},
        ),
        ("an absolute path", zip_archive({**entries, "/tmp/bookvie-evil.jpg": b"x"}), {}),
        ("a .. component at the top", zip_archive({**entries, "../evil.jpg": b"x"}), {}),
        ("a .. component under covers/", zip_archive({**entries, "covers/../../e.jpg": b"x"}), {}),
        (
            "a symlink",
            _with_raw_entries(source.export, [_symlink("covers/link.jpg", "../library.json")]),
            {},
        ),
        (
            "a symlink named as a referenced cover",
            _with_raw_entries(
                zip_archive(without_dune),
                [_symlink(f"covers/{DUNE_COVER}", f"../covers/{OLD_COVER}")],
            ),
            {},
        ),
        ("library.json twice", _with_raw_entries(source.export, [library_again]), {}),
        ("a cover twice", _with_raw_entries(source.export, [dune_again]), {}),
        (
            "two covers whose names differ only in case",
            zip_archive({**entries, f"covers/{upper}": source.covers[DUNE_COVER]}),
            {},
        ),
        (
            "two covers whose names differ only in Unicode form (NFC and NFD)",
            zip_archive(
                {**entries, f"covers/{ACCENTED_NFC}": b"one", f"covers/{ACCENTED_NFD}": b"two"}
            ),
            {},
        ),
        (
            "two covers whose names differ in case and Unicode form",
            zip_archive(
                {
                    **entries,
                    f"covers/{ACCENTED_NFC}": b"one",
                    f"covers/{ACCENTED_NFD.upper()}": b"two",
                }
            ),
            {},
        ),
        ("a cover name over the length cap", zip_archive({**entries, long_name: b"x"}), {}),
        (
            "a cover name over the cap in bytes but not in characters",
            zip_archive({**entries, wide_name: b"x"}),
            {},
        ),
        ("more than 5,000 entries", zip_archive({**entries, **fillers}), {}),
        ("an upload over the limit", source.export, {"MAX_UPLOAD_BYTES": len(source.export) - 1}),
        (
            "more extracted than the limit",
            source.export,
            {"MAX_EXTRACTED_BYTES": source.extracted - 1},
        ),
    ]
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    log: list[str] = []
    client.app.state.store.fs = RecordingFs(target, log)

    for case, archive, limits in hostile:
        before = _Snapshot(target)
        log.clear()
        with monkeypatch.context() as patch:
            for name, value in limits.items():
                patch.setattr(unpack, name, value)

            response = post_restore(client, archive)

        assert response.json()["error"]["code"] == "restore_unsafe", case
        assert response.status_code == 422, case
        assert response.json() == RESTORE_UNSAFE_BODY, case
        assert _outside_staging(log) == [], f"{case}: written outside .staging/"
        _Snapshot.assert_unchanged(before, target, case)

    # The limits as specified (AD-14), read from the module at call time.
    assert (unpack.MAX_UPLOAD_BYTES, unpack.MAX_ENTRIES, unpack.MAX_EXTRACTED_BYTES) == (
        GIB,
        5_000,
        GIB,
    )

    # Headers that understate a size: the cap is counted on bytes written, not
    # on the header, so 2 MiB declared as 1,000 bytes is inflated only up to
    # the cap and refused as unsafe, not as damage; nothing changes.
    files = {name: data for name, data in source.entries().items() if data is not None}
    filler = "covers/filler.jpg"
    bomb = _understated({**files, filler: bytes(2 * 1024 * 1024)}, filler, declared=1_000)
    before = _Snapshot(target)
    log.clear()
    with monkeypatch.context() as patch:
        patch.setattr(unpack, "MAX_EXTRACTED_BYTES", source.extracted + 64 * 1024)
        response = post_restore(client, bomb)
    assert response.json()["error"]["code"] == "restore_unsafe"
    assert response.status_code == 422
    assert response.json() == RESTORE_UNSAFE_BODY
    assert _outside_staging(log) == []
    _Snapshot.assert_unchanged(before, target, "headers that understate a size")


# --- AC-4: a fault while covers are copied in or at the commit -----------------


class _StepFault(OsFileSystem):
    """Fails one ``step`` of one atomic write; every other call is real.

    ``where`` is ``"cover"`` (the second cover restore copies into ``covers/``,
    so the first is already in and must be removed again) or ``"commit"``
    (the ``library.json`` write).
    """

    def __init__(self, step: str, where: str) -> None:
        self.step = step
        self.where = where
        self.covers_seen = 0
        self.fd: int | None = None
        self.temp: Path | None = None

    def _fail(self, step: str) -> None:
        if step == self.step:
            raise OSError(5, f"injected {step} fault at the {self.where}")

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        if directory.name == "covers":
            self.covers_seen += 1
        second_cover = directory.name == "covers" and self.covers_seen == 2
        armed = (self.where == "cover" and second_cover) or (
            self.where == "commit" and prefix == TEMP_PREFIX
        )
        if armed:
            self._fail("create_temp")
        fd, temp = super().create_temp(directory, prefix)
        if armed:
            self.fd, self.temp = fd, temp
        return fd, temp

    def write(self, fd: int, data: bytes) -> None:
        if fd == self.fd and self.step == "write":
            super().write(fd, data[: len(data) // 2])
            self._fail("write")
        super().write(fd, data)

    def fsync(self, fd: int) -> None:
        if fd == self.fd:
            self._fail("fsync")
        super().fsync(fd)

    def close(self, fd: int) -> None:
        super().close(fd)
        if fd == self.fd:
            self._fail("close")

    def replace(self, src: Path, dst: Path) -> None:
        if src == self.temp:
            self._fail("replace")
        super().replace(src, dst)


def test_ac4_p0_a_fault_copying_covers_in_or_at_the_commit_is_503_with_the_old_library_intact(
    tmp_path: Path,
) -> None:
    source = _Source(tmp_path)
    cases = [
        (where, step)
        for where in ("cover", "commit")
        for step in ("create_temp", "write", "fsync", "close", "replace")
    ]

    for where, step in cases:
        case = f"{step} fault at the {where}"
        target = tmp_path / f"target-{where}-{step}"
        _seed_target(target)
        client = api_client(target, _StepFault(step, where))
        before = _Snapshot(target)

        response = post_restore(client, source.export)

        assert response.status_code == 503, case
        assert response.json() == COULDNT_SAVE_BODY, case
        _Snapshot.assert_unchanged(before, target, case)
        assert _referenced_covers_exist(target), f"{case}: a referenced cover is gone"
        titles = [book["title"] for book in client.get("/api/views/catalog").json()["books"]]
        assert titles == ["The Left Hand of Darkness"], case


# --- Green-phase follow-ups (secondary branches of AC-2 and AC-3) --------------


def test_ac3_the_limits_themselves_are_allowed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = _Source(tmp_path)
    entries = source.entries()
    fillers = {
        f"covers/{OLD_BOOK_ID}-00000000-0000-4000-8000-{n:012d}.jpg": b"x"
        for n in range(5_000 - len(entries))
    }
    at_count = zip_archive({**entries, **fillers})
    assert len(zipfile.ZipFile(io.BytesIO(at_count)).infolist()) == 5_000
    at_name_cap = f"covers/{'b' * (unpack.MAX_COVER_NAME_BYTES - 4)}.jpg"
    cases: list[tuple[str, bytes, dict[str, int]]] = [
        ("exactly 5,000 entries", at_count, {}),
        ("a cover name exactly at the length cap", zip_archive({**entries, at_name_cap: b"x"}), {}),
        ("an upload exactly at the limit", source.export, {"MAX_UPLOAD_BYTES": len(source.export)}),
        (
            "an extraction exactly at the limit",
            source.export,
            {"MAX_EXTRACTED_BYTES": source.extracted},
        ),
    ]

    for index, (case, archive, limits) in enumerate(cases):
        target = tmp_path / f"target-{index}"
        _seed_target(target)
        client = api_client(target)
        with monkeypatch.context() as patch:
            for name, value in limits.items():
                patch.setattr(unpack, name, value)

            response = post_restore(client, archive)

        assert response.status_code == 200, case
        assert library_bytes(target) == source.library, case
        assert staging_in(target) == [], case


def test_ac3_an_unsafe_archive_is_unsafe_even_when_library_json_is_broken_or_newer(
    tmp_path: Path,
) -> None:
    source = _Source(tmp_path)
    newer = (
        json.dumps({**source.doc, "schemaVersion": migrations.CURRENT_VERSION + 1}) + "\n"
    ).encode()
    cases = {
        "a .. entry and a library.json that isn't JSON": zip_archive(
            {**source.entries(b"{not json"), "../evil.jpg": b"x"}
        ),
        "a .. entry and a newer library.json": zip_archive(
            {**source.entries(newer), "../evil.jpg": b"x"}
        ),
        "a symlink and a newer library.json": _with_raw_entries(
            zip_archive(source.entries(newer)), [_symlink("covers/link.jpg", "../library.json")]
        ),
        "an extra entry and no library.json": zip_archive(
            {"covers/": None, "notes.txt": b"not part of an export"}
        ),
    }
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    for case, archive in cases.items():
        before = _Snapshot(target)

        response = post_restore(client, archive)

        assert response.json() == RESTORE_UNSAFE_BODY, case
        assert response.status_code == 422, case
        _Snapshot.assert_unchanged(before, target, case)


def test_ac3_extraction_stops_before_staging_passes_the_cap(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = _Source(tmp_path)
    files = {name: data for name, data in source.entries().items() if data is not None}
    filler = "covers/filler.jpg"
    bomb = _understated({**files, filler: bytes(2 * 1024 * 1024)}, filler, declared=1_000)
    cap = source.extracted + 64 * 1024
    written: list[int] = []
    real_open = open

    class _Counting:
        def __init__(self, file) -> None:
            self.file = file

        def write(self, data: bytes) -> int:
            written.append(len(data))
            return self.file.write(data)

        def __enter__(self) -> _Counting:
            return self

        def __exit__(self, *exc: object) -> None:
            self.file.close()

    def counting_open(path, mode="r", *args, **kwargs):
        return _Counting(real_open(path, mode, *args, **kwargs))

    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    monkeypatch.setattr(unpack, "MAX_EXTRACTED_BYTES", cap)
    monkeypatch.setattr(unpack, "open", counting_open, raising=False)

    response = post_restore(client, bomb)

    assert response.json() == RESTORE_UNSAFE_BODY
    assert 0 < sum(written) <= cap


def test_ac3_an_archive_over_the_entry_count_stages_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = _Source(tmp_path)
    copied: list[str] = []
    real_copy = unpack._copy_entry

    def recording_copy(archive, info, target, budget) -> None:
        copied.append(info.filename)
        real_copy(archive, info, target, budget)

    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    monkeypatch.setattr(unpack, "_copy_entry", recording_copy)
    monkeypatch.setattr(unpack, "MAX_ENTRIES", len(source.entries()) - 1)

    response = post_restore(client, source.export)

    assert response.json() == RESTORE_UNSAFE_BODY
    assert copied == []


def test_ac3_a_central_directory_too_big_for_the_entry_count_is_refused_before_it_is_parsed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """``zipfile`` builds every record before ``infolist()``; the end record's size is checked first."""
    source = _Source(tmp_path)
    checked: list[int] = []
    real_check = unpack._check_entries

    def recording_check(store, infos):
        checked.append(len(infos))
        return real_check(store, infos)

    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)
    monkeypatch.setattr(unpack, "_check_entries", recording_check)
    # The entry count itself is allowed; only the directory is too big for it.
    monkeypatch.setattr(unpack, "MAX_ENTRIES", len(source.entries()))
    monkeypatch.setattr(unpack, "DIRECTORY_BYTES_PER_ENTRY", 1)

    response = post_restore(client, source.export)

    assert response.status_code == 422
    assert response.json() == RESTORE_UNSAFE_BODY
    assert checked == []
    _Snapshot.assert_unchanged(before, target, "a central directory past its cap")


def test_ac3_a_garbage_upload_is_still_restore_invalid_with_the_directory_check(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    monkeypatch.setattr(unpack, "DIRECTORY_BYTES_PER_ENTRY", 0)

    response = post_restore(client, b"not a zip at all" * 100)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "restore_invalid"


def test_ac3_a_body_over_the_streaming_cap_is_refused_without_the_lock(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    log: list[str] = []
    lock = RecordingLock(log)
    client.app.state.store.lock = lock
    client.app.state.write_lock = lock
    before = _Snapshot(target)
    monkeypatch.setattr(unpack, "MAX_UPLOAD_BYTES", 1_000)

    # Past the upload limit plus the framing slack.
    response = post_restore(client, b"x" * (1_000 + FRAMING_SLACK + 1))

    assert response.status_code == 422
    assert response.json() == RESTORE_UNSAFE_BODY
    assert log == []
    _Snapshot.assert_unchanged(before, target, "a body over the streaming cap")


def test_ac3_a_cover_whose_name_differs_only_in_case_from_one_in_covers_is_unsafe(
    tmp_path: Path,
) -> None:
    source = _Source(tmp_path)
    upper = OLD_COVER.upper()
    archive = zip_archive({**source.entries(), f"covers/{upper}": b"another cover"})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    log: list[str] = []
    client.app.state.store.fs = RecordingFs(target, log)
    before = _Snapshot(target)

    response = post_restore(client, archive)

    assert response.json() == RESTORE_UNSAFE_BODY
    assert response.status_code == 422
    assert _outside_staging(log) == []
    _Snapshot.assert_unchanged(before, target, "a case collision with covers/")


def test_ac3_a_cover_whose_name_differs_only_in_unicode_form_from_one_in_covers_is_unsafe(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    archive = zip_archive({**source.entries(), f"covers/{ACCENTED_NFC}": b"another cover"})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    # After startup, which would sweep it: an unreferenced file in NFD form.
    (target / "covers" / ACCENTED_NFD).write_bytes(b"a cover already here")
    if ACCENTED_NFC not in os.listdir(target / "covers") and ACCENTED_NFD not in os.listdir(
        target / "covers"
    ):  # pragma: no cover - a filesystem that rewrites names in some third form
        pytest.skip("the filesystem stores neither form")
    log: list[str] = []
    client.app.state.store.fs = RecordingFs(target, log)
    before = _Snapshot(target)

    response = post_restore(client, archive)

    assert response.json() == RESTORE_UNSAFE_BODY
    assert response.status_code == 422
    assert _outside_staging(log) == []
    _Snapshot.assert_unchanged(before, target, "a Unicode-form collision with covers/")
    assert "could share one file with covers/'e\\u0301.jpg'" in capsys.readouterr().err


def test_ac3_a_cover_name_the_filesystem_rejects_is_unsafe_not_couldnt_save(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # With the cap out of the way, the real open() fails with ENAMETOOLONG.
    monkeypatch.setattr(unpack, "MAX_COVER_NAME_BYTES", 10_000)
    source = _Source(tmp_path)
    archive = zip_archive({**source.entries(), f"covers/{'a' * 300}.jpg": b"x"})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    log: list[str] = []
    client.app.state.store.fs = RecordingFs(target, log)
    before = _Snapshot(target)

    response = post_restore(client, archive)

    assert response.json() == RESTORE_UNSAFE_BODY
    assert response.status_code == 422
    assert _outside_staging(log) == []
    _Snapshot.assert_unchanged(before, target, "a name the filesystem rejects")
    assert "which can't be a file name" in capsys.readouterr().err


@pytest.mark.parametrize(
    ("code", "status"),
    [
        (errno.ENAMETOOLONG, 422),
        (errno.EILSEQ, 422),
        (errno.EINVAL, 422),
        (errno.EACCES, 503),
        (errno.ENOSPC, 503),
        (errno.EIO, 503),
    ],
)
def test_ac3_only_name_errors_opening_a_staged_cover_are_unsafe(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, code: int, status: int
) -> None:
    source = _Source(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)
    real_open = open

    def failing_open(path: object, *args: object, **kwargs: object) -> object:
        if Path(str(path)).parent.name == "covers":
            raise OSError(code, os.strerror(code), str(path))
        return real_open(path, *args, **kwargs)  # type: ignore[call-overload]

    monkeypatch.setattr(unpack, "open", failing_open, raising=False)

    response = post_restore(client, source.export)

    assert response.status_code == status
    assert response.json() == (RESTORE_UNSAFE_BODY if status == 422 else COULDNT_SAVE_BODY)
    _Snapshot.assert_unchanged(before, target, f"open() failing with {errno.errorcode[code]}")


def test_ac3_a_cover_matching_one_of_two_same_key_names_in_covers_is_kept(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Two names with one key can both exist on Linux; an exact match of either is fine.
    source = _Source(tmp_path)
    for index, (listed, status) in enumerate(
        [
            ([OLD_COVER, DUNE_COVER, DUNE_COVER.upper()], 200),
            ([OLD_COVER, DUNE_COVER.upper()], 422),
        ]
    ):
        target = tmp_path / f"target-{index}"
        _seed_target(target)
        client = api_client(target)
        monkeypatch.setattr(client.app.state.store, "cover_names", lambda names=listed: names)

        response = post_restore(client, source.export)

        assert response.status_code == status, listed


def test_ac2_a_newer_export_missing_its_covers_is_still_restore_newer_version(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    current = migrations.CURRENT_VERSION
    newer = {**source.doc, "schemaVersion": current + 1}
    doc = (json.dumps(newer, indent=2) + "\n").encode()
    archive = zip_archive({"library.json": doc, "covers/": None})
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)

    response = post_restore(client, archive)

    assert response.json() == RESTORE_NEWER_VERSION_BODY
    assert response.status_code == 422
    _Snapshot.assert_unchanged(before, target, "a newer export without its covers")
    expected = (
        f"couldn't restore: library.json is schemaVersion {current + 1}, newer than {current}"
    )
    assert expected in capsys.readouterr().err


def test_ac3_an_entry_that_inflates_past_its_declared_size_is_unsafe_under_the_cap(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    files = {name: data for name, data in source.entries().items() if data is not None}
    filler = "covers/filler.jpg"
    # Far under the 1 GiB cap: only the declared size is broken.
    bomb = _understated({**files, filler: bytes(200 * 1024)}, filler, declared=1_000)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)

    response = post_restore(client, bomb)

    assert response.json() == RESTORE_UNSAFE_BODY
    _Snapshot.assert_unchanged(before, target, "an entry larger than declared")
    assert "which unpacks to more than its declared 1000 bytes" in capsys.readouterr().err


@pytest.mark.skipif(os.geteuid() == 0, reason="root ignores folder permissions")
def test_ac4_a_fault_unpacking_into_staging_is_503_with_nothing_changed(tmp_path: Path) -> None:
    source = _Source(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)
    staging = target / ".staging"
    staging.mkdir(exist_ok=True)
    staging.chmod(0o500)
    try:
        response = post_restore(client, source.export)
    finally:
        staging.chmod(0o700)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    _Snapshot.assert_unchanged(before, target, "a read-only .staging/")


@pytest.mark.skipif(os.geteuid() == 0, reason="root ignores folder permissions")
def test_ac4_a_fault_listing_covers_is_503_with_nothing_changed(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)
    before = _Snapshot(target)
    covers = target / "covers"
    covers.chmod(0o300)  # writable and enterable, but can't be listed
    try:
        response = post_restore(client, source.export)
    finally:
        covers.chmod(0o700)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    _Snapshot.assert_unchanged(before, target, "covers/ that can't be listed")
    assert "can't list covers/" in capsys.readouterr().err
