"""Story 1.13: add a cover (FR-1, FR-21, AD-11, AD-12, R-03, R-14).

One red-phase test per server-side acceptance criterion (AC-2 to AC-8 and
AC-11, numbered in the order of epics.md, Story 1.13). AC-1, AC-9 and AC-10
are the Cover field, the no-cover placeholder and Remove cover in the browser,
in ``frontend/e2e/cover.spec.ts``.

The tests pin these names:

- ``add-book`` and ``edit-book`` take an optional file part named ``cover``
  beside the JSON ``intent`` part; still one call and one commit (AD-3).
- Cover refusals are field errors on ``cover`` (label "Cover"): 422
  ``invalid_fields`` with "Cover must be an image file." or "Cover must be a
  JPEG, PNG or WebP image.", and 413 ``cover_too_large`` (a new
  ``ErrorCode``) with "Cover must be 20 MB or smaller." (20 MiB, AD-9).
- ``coverFile`` is the path relative to the data folder,
  ``covers/<book-id>-<uuid>.<ext>``, ``<ext>`` ``jpg`` or ``png`` from the
  output format. The file is served at ``/media/<coverFile>``.
- Cover files are written and removed through the store's ``FileSystem``
  seam (TC-3): temp + ``replace`` into ``covers/``, ``remove`` to delete.
- ``edit-book`` takes ``removeCover: true`` (a strict JSON boolean).
- ``spineColorFromCover`` is computed once per stored cover (DESIGN.md cover
  rule); ``None`` for a cover with no non-neutral pixels.
"""

import colorsys
import io
import json
import re
from pathlib import Path
from typing import Any

import PIL.Image
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from bookvie.domain import Library, check_invariants
from bookvie.intents import COULDNT_SAVE_MESSAGE
from bookvie.intents.contract import ErrorCode
from bookvie.store import OsFileSystem, Store
from tests.builder import CURATED, LibraryBuilder
from tests.test_add_book import ADD_BOOK, VALID, _client, _library_bytes, _stored_books
from tests.test_edit_book import DUNE, DUNE_FORM, EDIT_BOOK
from tests.test_store import FaultyFs

RED = "ATDD red phase: un-skip when Story 1.13 builds covers"

IMAGE_MESSAGE = "Cover must be an image file."
FORMAT_MESSAGE = "Cover must be a JPEG, PNG or WebP image."
TOO_LARGE_MESSAGE = "Cover must be 20 MB or smaller."
COVER_LIMIT = 20 * 1024 * 1024
DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
COVER_NAME = re.compile(
    rf"^covers/(?P<book>{_UUID})-(?P<minted>{_UUID})\.(?P<ext>jpg|png)$"
)
# A saturated red-orange: hue ~8°, lightness 0.47, saturation 0.67 (capped to 0.45).
RED_ORANGE = (200, 60, 40)
# VALID (The Dispossessed) as the Edit book panel prefills it.
VALID_FORM = {**DUNE_FORM, **VALID, "isbn": "", "year": ""}
# HEIC's ISO-BMFF header: a real image format Pillow can't decode without a plugin.
HEIC_BYTES = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64


# --- images ------------------------------------------------------------------


def _image(
    size: tuple[int, int] = (40, 60),
    color: tuple[int, ...] = RED_ORANGE,
    *,
    mode: str = "RGB",
    fmt: str = "PNG",
    **save: Any,
) -> bytes:
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save)
    return buffer.getvalue()


def _rotated_jpeg() -> bytes:
    """2400×1600 as stored, EXIF orientation 6: displayed upright as 1600×2400."""
    exif = Image.Exif()
    exif[0x0112] = 6
    return _image((2400, 1600), fmt="JPEG", exif=exif)


def _animated_gif() -> bytes:
    """Three frames: red-orange first, then blue, then green."""
    frames = [
        Image.new("RGB", (30, 45), c)
        for c in (RED_ORANGE, (30, 60, 200), (40, 180, 60))
    ]
    buffer = io.BytesIO()
    frames[0].save(buffer, "GIF", save_all=True, append_images=frames[1:], duration=100)
    return buffer.getvalue()


def _half_white() -> bytes:
    """Two thirds white (near-neutral, ignored), one third red-orange."""
    image = Image.new("RGB", (60, 90), (255, 255, 255))
    image.paste(Image.new("RGB", (60, 30), RED_ORANGE), (0, 60))
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def _grayscale() -> bytes:
    image = Image.linear_gradient("L").resize((40, 60)).convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def _capped_hex(rgb: tuple[int, int, int], cap: float = 0.45) -> tuple[int, int, int]:
    h, lightness, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    r, g, b = colorsys.hls_to_rgb(h, lightness, min(s, cap))
    return round(r * 255), round(g * 255), round(b * 255)


def _rgb(hex_color: str | None) -> tuple[int, int, int] | None:
    if hex_color is None:
        return None
    return tuple(int(hex_color[i : i + 2], 16) for i in (1, 3, 5))  # type: ignore[return-value]


def _close(
    actual: tuple[int, ...] | None, expected: tuple[int, ...], tolerance: int = 6
) -> bool:
    return actual is not None and all(
        abs(a - e) <= tolerance for a, e in zip(actual, expected)
    )


# --- requests ----------------------------------------------------------------


def _post(client: TestClient, path: str, intent: dict[str, Any], cover: tuple | None):
    files: dict[str, tuple] = {"intent": (None, json.dumps(intent), "application/json")}
    if cover is not None:
        files["cover"] = cover
    return client.post(path, files=files)


def _add_with_cover(
    client: TestClient,
    data: bytes,
    filename: str = "cover.png",
    content_type: str = "image/png",
    **fields: str,
):
    return _post(client, ADD_BOOK, {**VALID, **fields}, (filename, data, content_type))


def _edit_with_cover(
    client: TestClient,
    book_id: str,
    data: bytes | None,
    filename: str = "cover.png",
    form: dict[str, str] = DUNE_FORM,
    **changes: Any,
):
    """``edit-book`` with the prefilled ``form`` (Dune's by default) and ``changes``."""
    cover = (filename, data, "image/png") if data is not None else None
    return _post(client, EDIT_BOOK, {"bookId": book_id, **form, **changes}, cover)


# --- the data folder ---------------------------------------------------------


def _cover_files(data_dir: Path) -> set[str]:
    """``covers/<name>`` for every file in ``covers/``."""
    return {f"covers/{p.name}" for p in (data_dir / "covers").iterdir() if p.is_file()}


def _only_book(data_dir: Path) -> dict[str, Any]:
    (book,) = _stored_books(data_dir)
    return book


def _stored_cover(data_dir: Path) -> Image.Image | None:
    """The only Book's stored cover, decoded, or ``None`` when it has none."""
    cover_file = _only_book(data_dir).get("coverFile")
    if cover_file is None:
        return None
    image = Image.open(data_dir / cover_file)
    image.load()
    return image


def _seed_dune_with_cover(data_dir: Path) -> str:
    """Dune with a stored cover (written as Story 1.13 would); returns ``coverFile``."""
    cover_file = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=cover_file,
        spine_color_from_cover="#A85A4A",
    )
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / cover_file).write_bytes(_image(fmt="JPEG"))
    return cover_file


class RecordingFs(OsFileSystem):
    """Records every ``replace`` destination and ``remove`` path, in order."""

    def __init__(self) -> None:
        self.events: list[tuple[str, Path]] = []

    def replace(self, src: Path, dst: Path) -> None:
        super().replace(src, dst)
        self.events.append(("replace", Path(dst)))

    def remove(self, path: Path) -> None:
        super().remove(path)
        self.events.append(("remove", Path(path)))


class DocumentFaultFs(RecordingFs):
    """Fails only the rename onto ``library.json``: the document commit."""

    def replace(self, src: Path, dst: Path) -> None:
        if Path(dst).name == "library.json":
            raise OSError(5, "injected document commit fault")
        super().replace(src, dst)


class CoverRemoveFaultFs(RecordingFs):
    """Fails every ``remove`` of a file in ``covers/``: the after-commit cleanup."""

    def remove(self, path: Path) -> None:
        if Path(path).parent.name == "covers":
            raise OSError(5, "injected cover delete fault")
        super().remove(path)


# --- AC-2: Pillow re-decodes every upload; non-images, oversize and HEIC are refused ---


@pytest.mark.skip(reason=RED)
def test_ac2_p0_a_non_image_with_an_image_extension_is_refused_on_cover(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    before = _library_bytes(data_dir)
    client = _client(data_dir)

    response = _add_with_cover(
        client, b"not an image at all\n", "cover.jpg", "image/jpeg"
    )

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "invalid_fields",
            "message": "Not saved. 1 field needs attention: Cover.",
            "fields": [{"field": "cover", "message": IMAGE_MESSAGE}],
        }
    }
    assert _library_bytes(data_dir) == before
    assert _cover_files(data_dir) == set()

    # Truncated image data and an empty file are not images either.
    for junk in (_image()[:40], b""):
        response = _add_with_cover(client, junk)
        assert response.status_code == 422
        assert response.json()["error"]["fields"] == [
            {"field": "cover", "message": IMAGE_MESSAGE}
        ]

    # Over 20 MB: 413 cover_too_large, refused while streaming.
    response = _add_with_cover(client, b"\x89PNG" + b"\x00" * COVER_LIMIT)
    assert response.status_code == 413
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "cover_too_large",
            "message": "Not saved. 1 field needs attention: Cover.",
            "fields": [{"field": "cover", "message": TOO_LARGE_MESSAGE}],
        }
    }

    # HEIC (no plugin): the message names the supported formats.
    response = _add_with_cover(client, HEIC_BYTES, "IMG_0042.heic", "image/heic")
    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "cover", "message": FORMAT_MESSAGE}
    ]

    # A decompression bomb over MAX_IMAGE_PIXELS is refused like a non-image,
    # both where Pillow only warns (over 1×) and where it raises (over 2×).
    monkeypatch.setattr(PIL.Image, "MAX_IMAGE_PIXELS", 10_000)
    for size in ((120, 120), (200, 200)):
        response = _add_with_cover(client, _image(size))
        assert response.status_code == 422, size
        assert response.json()["error"]["fields"] == [
            {"field": "cover", "message": IMAGE_MESSAGE}
        ]

    assert _library_bytes(data_dir) == before
    assert _cover_files(data_dir) == set()


# --- AC-3: orientation, color mode, first frame, ≤ 1200px, re-encoded, minted name ---


@pytest.mark.skip(reason=RED)
def test_ac3_p0_a_valid_cover_is_normalized_downscaled_re_encoded_and_stored_under_a_minted_name(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = _client(data_dir)

    # Sent as a .png, but it is a JPEG on its side (EXIF orientation 6).
    response = _add_with_cover(client, _rotated_jpeg(), "photo.png", "image/png")

    stored = _stored_cover(data_dir)
    assert stored is not None and stored.size == (800, 1200)
    assert response.status_code == 200
    book = _only_book(data_dir)
    match = COVER_NAME.fullmatch(book["coverFile"])
    assert match is not None, book["coverFile"]
    assert match["book"] == book["id"] == response.json()["ids"]["bookId"]
    # <ext> from the output format (JPEG: no transparency), never the upload name.
    assert match["ext"] == "jpg" and stored.format == "JPEG" and stored.mode == "RGB"
    assert _cover_files(data_dir) == {book["coverFile"]}
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))

    # Replacing it writes a new name; the old one is gone and never reused,
    # even for the very same bytes.
    names = [book["coverFile"]]
    for _ in range(2):
        response = _edit_with_cover(client, book["id"], _image(), form=VALID_FORM)
        assert response.status_code == 200
        names.append(_only_book(data_dir)["coverFile"])
    assert len(set(names)) == 3
    assert _cover_files(data_dir) == {names[-1]}


# --- AC-4: new files, then the document commit, then deleting unreferenced files ---


@pytest.mark.skip(reason=RED)
def test_ac4_p0_a_cover_write_renames_the_new_file_then_commits_then_deletes_the_old_file(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = _seed_dune_with_cover(data_dir)
    fs = RecordingFs()
    client = _client(data_dir, fs=fs)  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, _image())

    def kind(event: tuple[str, Path]) -> str:
        op, path = event
        if op == "replace" and path.parent.name == "covers":
            return "new cover"
        if op == "replace" and path.name == "library.json":
            return "commit"
        if op == "remove" and f"covers/{path.name}" == old:
            return "delete old"
        return "other"

    assert [kind(e) for e in fs.events if kind(e) != "other"] == [
        "new cover",
        "commit",
        "delete old",
    ]
    assert response.status_code == 200
    new = _only_book(data_dir)["coverFile"]
    assert new != old
    assert _cover_files(data_dir) == {new}


# --- AC-5: a fault at the document commit keeps the old document and cover (R-03) ---


@pytest.mark.skip(reason=RED)
def test_ac5_p0_a_failed_document_commit_keeps_the_old_cover_and_cleans_up_the_new_file(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = _seed_dune_with_cover(data_dir)
    before = _library_bytes(data_dir)
    old_bytes = (data_dir / old).read_bytes()
    fs = DocumentFaultFs()
    client = _client(data_dir, fs=fs)  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, _image())

    written = [
        path
        for op, path in fs.events
        if op == "replace" and path.parent.name == "covers"
    ]
    removed = [
        path
        for op, path in fs.events
        if op == "remove" and path.parent.name == "covers"
    ]
    assert len(written) == 1 and removed == written
    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "kind": "couldnt_save",
            "code": "couldnt_save",
            "message": COULDNT_SAVE_MESSAGE,
        }
    }
    assert _library_bytes(data_dir) == before
    assert _cover_files(data_dir) == {old}
    assert (data_dir / old).read_bytes() == old_bytes


# --- AC-6: a fault while deleting after a successful commit is logged, still 200 ---


@pytest.mark.skip(reason=RED)
def test_ac6_p1_a_failed_delete_after_the_commit_is_logged_still_200_and_swept_at_startup(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir = tmp_path / "data"
    old = _seed_dune_with_cover(data_dir)
    client = _client(data_dir, fs=CoverRemoveFaultFs())  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, _image())

    err = capsys.readouterr().err
    assert re.search(rf"^bookvie: .*{re.escape(Path(old).name)}", err, re.MULTILINE), (
        err
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    new = _only_book(data_dir)["coverFile"]
    assert new != old
    assert _cover_files(data_dir) == {old, new}  # left for the sweep

    Store.open(data_dir)

    assert _cover_files(data_dir) == {new}


# --- AC-7: served immutable; swept at startup; delete-book removes its cover ---


@pytest.mark.skip(reason=RED)
def test_ac7_p1_covers_are_served_immutable_swept_at_startup_and_removed_with_their_book(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    cover = _seed_dune_with_cover(data_dir)
    stray = "covers/00000000-0000-4000-8000-000000000000-11111111-2222-4333-8444-555555555555.jpg"
    (data_dir / stray).write_bytes(_image(fmt="JPEG"))
    client = _client(data_dir)  # Store.open runs the startup sweep

    response = client.get(f"/media/{cover}")

    assert "immutable" in response.headers.get("cache-control", "")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == (data_dir / cover).read_bytes()
    # The sweep removed the file no Book references; it is not served.
    assert _cover_files(data_dir) == {cover}
    assert client.get(f"/media/{stray}").status_code == 404
    # Nothing outside covers/ is reachable through /media.
    for path in (
        "/media/library.json",
        "/media/covers/../library.json",
        "/media/covers/",
    ):
        assert client.get(path).status_code == 404, path

    # delete-book removes the Book's cover after the commit.
    response = _post(client, "/api/intents/delete-book", {"bookId": DUNE_ID}, None)
    assert response.status_code == 200
    assert _cover_files(data_dir) == set()


# --- AC-8: spineColorFromCover, computed once, by the DESIGN.md cover rule ---


@pytest.mark.skip(reason=RED)
def test_ac8_p1_spine_color_from_cover_is_the_dominant_non_neutral_hue_capped_at_045(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = _client(data_dir)

    response = _add_with_cover(client, _half_white())

    book = _only_book(data_dir)
    expected = _capped_hex(RED_ORANGE)
    assert _close(_rgb(book["spineColorFromCover"]), expected), book[
        "spineColorFromCover"
    ]
    assert response.status_code == 200
    # No user color: the resolved color is the cover's; curated stays assigned.
    assert book["spineColor"] == book["spineColorFromCover"]
    assert book["spineColorCurated"] == CURATED[0]

    # A black-and-white cover gives none, so curated applies.
    response = _add_with_cover(
        client, _grayscale(), title="Ficciones", authors="Jorge Luis Borges"
    )
    assert response.status_code == 200
    ficciones = _stored_books(data_dir)[1]
    assert ficciones["coverFile"] is not None
    assert ficciones["spineColorFromCover"] is None
    assert ficciones["spineColor"] == ficciones["spineColorCurated"] == CURATED[1]

    # A user color wins; the cover color is still computed and stored.
    response = _add_with_cover(
        client, _image(), title="Solaris", authors="Stanisław Lem", spineColor="#123456"
    )
    assert response.status_code == 200
    solaris = _stored_books(data_dir)[2]
    assert solaris["spineColor"] == "#123456"
    assert _close(_rgb(solaris["spineColorFromCover"]), expected)


# --- AC-11: the standard intent ACs (TR8) for the cover paths ---


@pytest.mark.skip(reason=RED)
def test_ac11_p0_cover_paths_of_add_book_and_edit_book_keep_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    # The new error code first: the fault clauses below already hold for the
    # cover-less path, so cover_too_large is what this story adds to TR8.
    assert ErrorCode("cover_too_large") is ErrorCode.COVER_TOO_LARGE

    # A fault at write, fsync or rename: 503, library.json byte-identical, and
    # no cover file left behind, for add-book and edit-book with a cover.
    for step in ("write", "fsync", "replace"):
        add_dir = tmp_path / f"add-{step}"
        LibraryBuilder().write(add_dir)
        before = _library_bytes(add_dir)
        response = _add_with_cover(_client(add_dir, fs=FaultyFs(step)), _image())
        assert response.status_code == 503, step
        assert response.json()["error"]["code"] == "couldnt_save", step
        assert _library_bytes(add_dir) == before, step
        assert _cover_files(add_dir) == set(), step
        assert not list(add_dir.glob("covers/*.tmp*")) and not list(
            add_dir.glob("*.tmp*")
        ), step

        edit_dir = tmp_path / f"edit-{step}"
        old = _seed_dune_with_cover(edit_dir)
        before = _library_bytes(edit_dir)
        response = _edit_with_cover(
            _client(edit_dir, fs=FaultyFs(step)), DUNE_ID, _image()
        )
        assert response.status_code == 503, step
        assert _library_bytes(edit_dir) == before, step
        assert _cover_files(edit_dir) == {old}, step

    # After every successful cover intent check_invariants() holds.
    data_dir = tmp_path / "ok"
    _seed_dune_with_cover(data_dir)
    client = _client(data_dir)
    assert _edit_with_cover(client, DUNE_ID, _image()).status_code == 200
    assert _edit_with_cover(client, DUNE_ID, None, removeCover=True).status_code == 200
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))

    # A Book that is gone: 409 book_not_found, nothing changed, no file left.
    before = _library_bytes(data_dir)
    files = _cover_files(data_dir)
    gone = "00000000-0000-4000-8000-000000000000"
    response = _edit_with_cover(client, gone, _image())
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_not_found"
    assert _library_bytes(data_dir) == before
    assert _cover_files(data_dir) == files
