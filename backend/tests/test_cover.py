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

from bookvie.intents.contract import ErrorCode
from bookvie.store import OsFileSystem, StartupError, Store
from tests.builder import CURATED, LibraryBuilder
from tests.helpers import (
    ADD_BOOK,
    COULDNT_SAVE_BODY,
    DELETE_BOOK,
    DUNE,
    DUNE_FORM,
    DUNE_ID,
    EDIT_BOOK,
    RED_ORANGE,
    VALID,
    VALID_FORM,
    FaultyFs,
    api_client,
    assert_invariants,
    image_bytes,
    library_bytes,
    seed_dune_with_cover,
    stored_books,
)

IMAGE_MESSAGE = "Cover must be an image file."
FORMAT_MESSAGE = "Cover must be a JPEG, PNG or WebP image."
TOO_LARGE_MESSAGE = "Cover must be 20 MB or smaller."
COVER_LIMIT = 20 * 1024 * 1024
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
COVER_NAME = re.compile(rf"^covers/(?P<book>{_UUID})-(?P<minted>{_UUID})\.(?P<ext>jpg|png)$")
# HEIC's ISO-BMFF header: a real image format Pillow can't decode without a plugin.
HEIC_BYTES = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64


# --- images ------------------------------------------------------------------


def _rotated_jpeg() -> bytes:
    """2400×1600 as stored, EXIF orientation 6: displayed upright as 1600×2400."""
    exif = Image.Exif()
    exif[0x0112] = 6
    return image_bytes((2400, 1600), fmt="JPEG", exif=exif)


def _animated_gif() -> bytes:
    """Three frames: red-orange first, then blue, then green."""
    frames = [Image.new("RGB", (30, 45), c) for c in (RED_ORANGE, (30, 60, 200), (40, 180, 60))]
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


def _close(actual: tuple[int, ...] | None, expected: tuple[int, ...], tolerance: int = 6) -> bool:
    return actual is not None and all(
        abs(a - e) <= tolerance for a, e in zip(actual, expected, strict=False)
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


def _temp_files(data_dir: Path) -> list[Path]:
    """Commit or cover temp files left in the data folder or ``covers/``."""
    return [*data_dir.glob("*.tmp*"), *data_dir.glob("covers/*.tmp*")]


def _only_book(data_dir: Path) -> dict[str, Any]:
    (book,) = stored_books(data_dir)
    return book


def _stored_cover(data_dir: Path) -> Image.Image | None:
    """The only Book's stored cover, decoded, or ``None`` when it has none."""
    cover_file = _only_book(data_dir).get("coverFile")
    if cover_file is None:
        return None
    image = Image.open(data_dir / cover_file)
    image.load()
    return image


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


def test_ac2_p0_a_non_image_with_an_image_extension_is_refused_on_cover(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    before = library_bytes(data_dir)
    client = api_client(data_dir)

    response = _add_with_cover(client, b"not an image at all\n", "cover.jpg", "image/jpeg")

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "invalid_fields",
            "message": "Not saved. 1 field needs attention: Cover.",
            "fields": [{"field": "cover", "message": IMAGE_MESSAGE}],
        }
    }
    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == set()

    # Truncated image data and an empty file are not images either.
    for junk in (image_bytes()[:40], b""):
        response = _add_with_cover(client, junk)
        assert response.status_code == 422
        assert response.json()["error"]["fields"] == [{"field": "cover", "message": IMAGE_MESSAGE}]

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
    assert response.json()["error"]["fields"] == [{"field": "cover", "message": FORMAT_MESSAGE}]

    # A decompression bomb over MAX_IMAGE_PIXELS is refused like a non-image,
    # both where Pillow only warns (over 1×) and where it raises (over 2×).
    monkeypatch.setattr(PIL.Image, "MAX_IMAGE_PIXELS", 10_000)
    for size in ((120, 120), (200, 200)):
        response = _add_with_cover(client, image_bytes(size))
        assert response.status_code == 422, size
        assert response.json()["error"]["fields"] == [{"field": "cover", "message": IMAGE_MESSAGE}]

    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == set()


# --- AC-3: orientation, color mode, first frame, ≤ 1200px, re-encoded, minted name ---


def test_ac3_p0_a_valid_cover_is_normalized_downscaled_re_encoded_and_stored_under_a_minted_name(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)

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
    assert_invariants(data_dir)

    # Replacing it writes a new name; the old one is gone and never reused,
    # even for the very same bytes.
    names = [book["coverFile"]]
    for _ in range(2):
        response = _edit_with_cover(client, book["id"], image_bytes(), form=VALID_FORM)
        assert response.status_code == 200
        names.append(_only_book(data_dir)["coverFile"])
    assert len(set(names)) == 3
    assert _cover_files(data_dir) == {names[-1]}


# --- AC-4: new files, then the document commit, then deleting unreferenced files ---


def test_ac4_p0_a_cover_write_renames_the_new_file_then_commits_then_deletes_the_old_file(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    fs = RecordingFs()
    client = api_client(data_dir, fs=fs)  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, image_bytes())

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


def test_ac5_p0_a_failed_document_commit_keeps_the_old_cover_and_cleans_up_the_new_file(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    before = library_bytes(data_dir)
    old_bytes = (data_dir / old).read_bytes()
    fs = DocumentFaultFs()
    client = api_client(data_dir, fs=fs)  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, image_bytes())

    written = [path for op, path in fs.events if op == "replace" and path.parent.name == "covers"]
    removed = [path for op, path in fs.events if op == "remove" and path.parent.name == "covers"]
    assert len(written) == 1 and removed == written
    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == {old}
    assert (data_dir / old).read_bytes() == old_bytes


# --- AC-6: a fault while deleting after a successful commit is logged, still 200 ---


def test_ac6_p1_a_failed_delete_after_the_commit_is_logged_still_200_and_swept_at_startup(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    client = api_client(data_dir, fs=CoverRemoveFaultFs())  # type: ignore[arg-type]

    response = _edit_with_cover(client, DUNE_ID, image_bytes())

    err = capsys.readouterr().err
    assert re.search(rf"^bookvie: .*{re.escape(Path(old).name)}", err, re.MULTILINE), err
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    new = _only_book(data_dir)["coverFile"]
    assert new != old
    assert _cover_files(data_dir) == {old, new}  # left for the sweep

    Store.open(data_dir)

    assert _cover_files(data_dir) == {new}


# --- AC-7: served immutable; swept at startup; delete-book removes its cover ---


def test_ac7_p1_covers_are_served_immutable_swept_at_startup_and_removed_with_their_book(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    cover = seed_dune_with_cover(data_dir)
    stray = "covers/00000000-0000-4000-8000-000000000000-11111111-2222-4333-8444-555555555555.jpg"
    (data_dir / stray).write_bytes(image_bytes(fmt="JPEG"))
    client = api_client(data_dir)  # Store.open runs the startup sweep

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


def test_ac8_p1_spine_color_from_cover_is_the_dominant_non_neutral_hue_capped_at_045(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)

    response = _add_with_cover(client, _half_white())

    book = _only_book(data_dir)
    expected = _capped_hex(RED_ORANGE)
    assert _close(_rgb(book["spineColorFromCover"]), expected), book["spineColorFromCover"]
    assert response.status_code == 200
    # No user color: the resolved color is the cover's; curated stays assigned.
    assert book["spineColor"] == book["spineColorFromCover"]
    assert book["spineColorCurated"] == CURATED[0]

    # A black-and-white cover gives none, so curated applies.
    response = _add_with_cover(client, _grayscale(), title="Ficciones", authors="Jorge Luis Borges")
    assert response.status_code == 200
    ficciones = stored_books(data_dir)[1]
    assert ficciones["coverFile"] is not None
    assert ficciones["spineColorFromCover"] is None
    assert ficciones["spineColor"] == ficciones["spineColorCurated"] == CURATED[1]

    # A user color wins; the cover color is still computed and stored.
    response = _add_with_cover(
        client, image_bytes(), title="Solaris", authors="Stanisław Lem", spineColor="#123456"
    )
    assert response.status_code == 200
    solaris = stored_books(data_dir)[2]
    assert solaris["spineColor"] == "#123456"
    assert _close(_rgb(solaris["spineColorFromCover"]), expected)


# --- AC-11: the standard intent ACs (TR8) for the cover paths ---


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
        before = library_bytes(add_dir)
        response = _add_with_cover(api_client(add_dir, fs=FaultyFs(step)), image_bytes())
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(add_dir) == before, step
        assert _cover_files(add_dir) == set(), step
        assert _temp_files(add_dir) == [], step

        edit_dir = tmp_path / f"edit-{step}"
        old = seed_dune_with_cover(edit_dir)
        before = library_bytes(edit_dir)
        response = _edit_with_cover(api_client(edit_dir, fs=FaultyFs(step)), DUNE_ID, image_bytes())
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(edit_dir) == before, step
        assert _cover_files(edit_dir) == {old}, step
        assert _temp_files(edit_dir) == [], step

    # After every successful cover intent check_invariants() holds.
    data_dir = tmp_path / "ok"
    seed_dune_with_cover(data_dir)
    client = api_client(data_dir)
    assert _edit_with_cover(client, DUNE_ID, image_bytes()).status_code == 200
    assert _edit_with_cover(client, DUNE_ID, None, removeCover=True).status_code == 200
    assert_invariants(data_dir)

    # A Book that is gone: 409 book_not_found, nothing changed, no file left.
    before = library_bytes(data_dir)
    files = _cover_files(data_dir)
    gone = "00000000-0000-4000-8000-000000000000"
    response = _edit_with_cover(client, gone, image_bytes())
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == files


@pytest.mark.parametrize("step", ["write", "fsync", "replace"])
def test_ac11_p0_a_failed_remove_cover_commit_keeps_the_cover(tmp_path: Path, step: str) -> None:
    # TR8 on remove-cover (F-S4): nothing lands and the old file is not deleted.
    old = seed_dune_with_cover(tmp_path)
    old_bytes = (tmp_path / old).read_bytes()
    before = library_bytes(tmp_path)
    client = api_client(tmp_path, fs=FaultyFs(step))

    response = _edit_with_cover(client, DUNE_ID, None, removeCover=True)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(tmp_path) == before
    assert _cover_files(tmp_path) == {old}
    assert (tmp_path / old).read_bytes() == old_bytes
    assert _temp_files(tmp_path) == []


@pytest.mark.parametrize("step", ["write", "fsync", "replace"])
def test_ac11_p0_a_failed_delete_book_commit_keeps_the_book_and_its_cover(
    tmp_path: Path, step: str
) -> None:
    # TR8 on delete-book of a Book with a cover (F-S4): the cover goes only
    # after the commit that drops the Book.
    old = seed_dune_with_cover(tmp_path)
    old_bytes = (tmp_path / old).read_bytes()
    before = library_bytes(tmp_path)
    client = api_client(tmp_path, fs=FaultyFs(step))

    response = _post(client, DELETE_BOOK, {"bookId": DUNE_ID}, None)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(tmp_path) == before
    assert _cover_files(tmp_path) == {old}
    assert (tmp_path / old).read_bytes() == old_bytes
    assert _temp_files(tmp_path) == []


# --- Green-phase follow-ups ------------------------------------------------------


def _refusal_fields(response) -> list[dict[str, str]]:
    return response.json()["error"]["fields"]


def test_ac2_a_cover_of_exactly_20_mb_is_not_refused_for_size_and_webp_is_accepted(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)

    # A PNG padded to exactly 20 MiB: Pillow ignores the bytes after IEND.
    png = image_bytes()
    response = _add_with_cover(client, png + b"\x00" * (COVER_LIMIT - len(png)))
    assert response.status_code == 200, response.json()

    response = _add_with_cover(
        client, image_bytes(fmt="WEBP"), "cover.webp", "image/webp", title="Solaris"
    )
    assert response.status_code == 200
    stored = Image.open(data_dir / stored_books(data_dir)[1]["coverFile"])
    assert stored.format == "JPEG"


def test_ac2_a_content_length_past_the_cap_is_413_before_the_body_is_read(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    before = library_bytes(data_dir)

    response = _add_with_cover(api_client(data_dir), b"\x00" * (COVER_LIMIT + 128 * 1024))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "cover_too_large"
    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == set()


def test_ac2_a_cover_error_is_listed_with_other_field_errors_in_form_order(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)

    response = _add_with_cover(client, b"junk", tags="ok", spineColor="red", title="")
    assert response.status_code == 422
    assert [f["field"] for f in _refusal_fields(response)] == ["title", "cover", "spineColor"]
    assert response.json()["error"]["message"] == (
        "Not saved. 3 fields need attention: Title, Cover, Spine color."
    )

    seed_dune_with_cover(data_dir)
    client = api_client(data_dir)
    response = _edit_with_cover(client, DUNE_ID, b"junk", spineColor="red")
    assert response.status_code == 422
    assert [f["field"] for f in _refusal_fields(response)] == ["cover", "spineColor"]
    assert _cover_files(data_dir) == {_only_book(data_dir)["coverFile"]}


def test_ac2_avif_and_heif_are_refused_with_the_formats_message(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)
    for brand in (b"avif", b"mif1", b"heix"):
        data = b"\x00\x00\x00\x18ftyp" + brand + b"\x00" * 64
        response = _add_with_cover(client, data, "photo.avif", "image/avif")
        assert _refusal_fields(response) == [{"field": "cover", "message": FORMAT_MESSAGE}]
    assert _cover_files(data_dir) == set()


def _stored(data_dir: Path, response) -> Image.Image:
    assert response.status_code == 200, response.json()
    book_id = response.json()["ids"]["bookId"]
    (book,) = [b for b in stored_books(data_dir) if b["id"] == book_id]
    image = Image.open(data_dir / book["coverFile"])
    image.load()
    assert book["coverFile"].endswith(f".{'png' if image.format == 'PNG' else 'jpg'}")
    return image


def test_ac3_color_modes_frames_and_sizes_are_normalized(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    client = api_client(data_dir)
    titles = iter(f"Book {n}" for n in range(100))

    def add(data: bytes, filename: str = "cover.png") -> Image.Image:
        return _stored(data_dir, _add_with_cover(client, data, filename, title=next(titles)))

    # Some transparent pixel: PNG with alpha.
    partial = Image.new("RGBA", (40, 60), (*RED_ORANGE, 255))
    partial.putpixel((0, 0), (0, 0, 0, 0))
    buffer = io.BytesIO()
    partial.save(buffer, "PNG")
    stored = add(buffer.getvalue())
    assert (stored.format, stored.mode) == ("PNG", "RGBA")

    # Fully opaque RGBA: JPEG.
    stored = add(image_bytes(mode="RGBA", color=(*RED_ORANGE, 255)))
    assert (stored.format, stored.mode) == ("JPEG", "RGB")

    # CMYK JPEG: RGB.
    stored = add(image_bytes(mode="CMYK", color=(0, 180, 200, 40), fmt="JPEG"), "cmyk.jpg")
    assert (stored.format, stored.mode) == ("JPEG", "RGB")

    # An animated GIF keeps only its first frame (red-orange).
    stored = add(_animated_gif(), "anim.gif")
    assert _close(stored.getpixel((15, 20)), RED_ORANGE, 12)  # type: ignore[arg-type]
    assert getattr(stored, "n_frames", 1) == 1

    # Never upscaled; downscaled keeping the aspect ratio.
    assert add(image_bytes((40, 60))).size == (40, 60)
    assert add(image_bytes((3000, 1000))).size == (1200, 400)

    # The upload's name never reaches the stored name.
    for filename in ("../../library.json", "noextension", "x.heic", "a/b.png"):
        response = _add_with_cover(client, image_bytes(), filename, title=next(titles))
        assert response.status_code == 200, filename
    for book in stored_books(data_dir):
        assert COVER_NAME.fullmatch(book["coverFile"]), book["coverFile"]
    assert _cover_files(data_dir) == {b["coverFile"] for b in stored_books(data_dir)}
    assert not (tmp_path / "library.json").exists()


def test_ac4_a_refusal_inside_the_commit_removes_the_new_file(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    client = api_client(data_dir)
    before = library_bytes(data_dir)

    # add-book: a duplicate of Dune with a cover.
    response = _add_with_cover(
        client, image_bytes(), **{k: v for k, v in DUNE_FORM.items() if k != "isbn"}
    )
    assert response.json()["error"]["code"] == "duplicate_book"
    # edit-book: an invalid field, checked inside the commit.
    response = _edit_with_cover(client, DUNE_ID, image_bytes(), pages="0")
    assert response.status_code == 422
    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == {old}


def test_ac4_pages_below_a_floor_with_a_cover_removes_the_new_file(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE)
    builder.reading(DUNE_ID, current_page=300)
    builder.write(data_dir)
    client = api_client(data_dir)

    response = _edit_with_cover(client, DUNE_ID, image_bytes(), pages="100")

    assert response.json()["error"]["code"] == "pages_below_current_page"
    assert _cover_files(data_dir) == set()


def test_ac4_invalid_fields_on_add_book_are_refused_before_any_file_is_written(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    LibraryBuilder().write(data_dir)
    fs = RecordingFs()
    client = api_client(data_dir, fs=fs)  # type: ignore[arg-type]

    response = _add_with_cover(client, image_bytes(), pages="many")

    assert response.status_code == 422
    assert fs.events == []


def test_ac7_head_is_served_and_media_needs_a_store(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    cover = seed_dune_with_cover(data_dir)
    client = api_client(data_dir)

    response = client.head(f"/media/{cover}")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert response.content == b""
    assert client.get("/media/covers/nope.jpg").status_code == 404
    # A referenced file that went missing is a 404 too.
    (data_dir / cover).unlink()
    assert client.get(f"/media/{cover}").status_code == 404

    from bookvie.http.app import create_app

    bare = TestClient(create_app(data_dir / "no-static"), base_url="http://127.0.0.1:8765")
    assert bare.get(f"/media/{cover}").status_code == 404


def test_ac7_a_hand_edited_cover_file_outside_covers_is_never_served_or_deleted(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE, cover_file="covers/../library.json")
    builder.write(data_dir)
    client = api_client(data_dir)

    assert client.get("/media/covers/..%2Flibrary.json").status_code == 404
    response = _edit_with_cover(client, DUNE_ID, image_bytes())
    assert response.status_code == 200
    assert (data_dir / "library.json").is_file()


def test_ac8_a_replaced_cover_recomputes_the_color_and_an_edit_without_one_leaves_it(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    seed_dune_with_cover(data_dir)
    client = api_client(data_dir)

    # An edit with no cover part leaves the cover, its color and spineColor alone.
    response = _edit_with_cover(client, DUNE_ID, None, title="Dune Messiah")
    assert response.status_code == 200
    book = _only_book(data_dir)
    assert (book["spineColorFromCover"], book["spineColor"]) == ("#A85A4A", "#A85A4A")

    # A new cover recomputes it.
    response = _edit_with_cover(client, DUNE_ID, _grayscale(), title="Dune Messiah")
    book = _only_book(data_dir)
    assert book["spineColorFromCover"] is None
    assert book["spineColor"] == book["spineColorCurated"] == CURATED[0]

    # A user color stays when the cover changes.
    form = {**DUNE_FORM, "title": "Dune Messiah", "spineColor": "#123456"}
    assert _edit_with_cover(client, DUNE_ID, None, form=form).status_code == 200
    assert _edit_with_cover(client, DUNE_ID, image_bytes(), form=form).status_code == 200
    book = _only_book(data_dir)
    assert book["spineColor"] == "#123456"
    assert _close(_rgb(book["spineColorFromCover"]), _capped_hex(RED_ORANGE))


def test_ac10_remove_cover_clears_the_cover_deletes_the_file_and_falls_back(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    client = api_client(data_dir)

    response = _edit_with_cover(client, DUNE_ID, None, removeCover=True)

    assert response.status_code == 200
    book = _only_book(data_dir)
    assert (book["coverFile"], book["spineColorFromCover"]) == (None, None)
    assert book["spineColor"] == CURATED[0]
    assert not (data_dir / old).exists()
    assert _cover_files(data_dir) == set()

    # Without a cover, removeCover is a no-op 200.
    before = library_bytes(data_dir)
    assert _edit_with_cover(client, DUNE_ID, None, removeCover=True).status_code == 200
    assert library_bytes(data_dir) == before


def test_ac10_remove_cover_keeps_a_user_color(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    seed_dune_with_cover(data_dir)
    client = api_client(data_dir)
    form = {**DUNE_FORM, "spineColor": "#123456"}

    assert _edit_with_cover(client, DUNE_ID, None, form=form, removeCover=True).status_code == 200

    book = _only_book(data_dir)
    assert (book["coverFile"], book["spineColor"]) == (None, "#123456")


def test_ac10_remove_cover_must_be_a_boolean_and_never_comes_with_a_cover(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "data"
    old = seed_dune_with_cover(data_dir)
    client = api_client(data_dir)
    before = library_bytes(data_dir)

    response = _edit_with_cover(client, DUNE_ID, None, removeCover="true")
    assert response.status_code == 422
    assert [f["field"] for f in _refusal_fields(response)] == ["intent"]

    response = _edit_with_cover(client, DUNE_ID, image_bytes(), removeCover=True)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert [f["field"] for f in _refusal_fields(response)] == ["intent"]

    assert library_bytes(data_dir) == before
    assert _cover_files(data_dir) == {old}


def test_the_startup_sweep_logs_a_cover_it_cannot_delete_and_starts_anyway(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir = tmp_path / "data"
    cover = seed_dune_with_cover(data_dir)
    stray = data_dir / "covers" / "stray.jpg.tmpabc"
    stray.write_bytes(b"x")
    (data_dir / "covers" / "subfolder").mkdir()

    Store.open(data_dir, fs=CoverRemoveFaultFs())

    assert "bookvie: couldn't delete covers/stray.jpg.tmpabc" in capsys.readouterr().err
    Store.open(data_dir)
    assert _cover_files(data_dir) == {cover}
    assert (data_dir / "covers" / "subfolder").is_dir()


def test_a_missing_library_json_with_covers_refuses_to_start(tmp_path: Path) -> None:
    # Starting would commit an empty library, and the next start's sweep
    # would delete every cover; the folder is refused untouched instead.
    data_dir = tmp_path / "data"
    (data_dir / "covers").mkdir(parents=True)
    (data_dir / "covers" / "kept.jpg").write_bytes(b"jpeg")
    (data_dir / "library.json.tmp123").write_bytes(b"leftover")

    for _ in range(2):
        with pytest.raises(StartupError, match="is missing but covers/ holds covers") as exc:
            Store.open(data_dir)
        assert exc.value.path == data_dir / "library.json"

    assert _cover_files(data_dir) == {"covers/kept.jpg"}
    assert not (data_dir / "library.json").exists()
    assert (data_dir / "library.json.tmp123").exists()


def test_a_missing_library_json_with_an_empty_covers_folder_starts(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    (data_dir / "covers").mkdir(parents=True)

    Store.open(data_dir)

    assert (data_dir / "library.json").exists()
