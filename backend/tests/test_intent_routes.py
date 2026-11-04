"""The real intent and cover routes against bad bodies and foreign callers.

Retro action 8 (F-R2, VG1, VG2). A body Starlette or FastAPI can't parse gets
the same 422 ``invalid_fields`` on ``intent`` as a malformed ``intent`` part,
never FastAPI's ``{detail}``. The Host/Origin guard (AD-16) refuses foreign
callers on every intent route and on ``/media/covers/*`` before any route or
body cap runs.
"""

import asyncio
import io
import json
import zipfile
from pathlib import Path

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from bookvie.domain.model import Library
from bookvie.http.api import BODY_LIMIT, _http_error
from bookvie.intents.intent_model import MALFORMED_INTENT_MESSAGE
from bookvie.store import serialize
from tests.helpers import (
    DUNE_ID,
    VALID,
    VALID_FORM,
    api_client,
    library_bytes,
    seed_dune_with_cover,
)

INTENT_ROUTES = {
    "add-book": VALID,
    "edit-book": {**VALID_FORM, "bookId": DUNE_ID},
    "delete-book": {"bookId": DUNE_ID},
    "set-spine-color": {"bookId": DUNE_ID, "spineColor": "#749076"},
    "restore": {},
}
"""Each intent route with an intent it would accept for the seeded Dune."""

MALFORMED_INTENT = {
    "error": {
        "kind": "refusal",
        "code": "invalid_fields",
        "message": "Not saved. 1 field needs attention: intent.",
        "fields": [{"field": "intent", "message": MALFORMED_INTENT_MESSAGE}],
    }
}

MULTIPART = "multipart/form-data; boundary=xyz"
OVER_PART_LIMIT = 1024 * 1024 + 1
"""One byte past Starlette's 1 MB limit on a non-file part."""

BAD_BODIES = {
    "broken-framing": {
        "content": b"no boundary anywhere",
        "headers": {"content-type": MULTIPART},
    },
    "missing-boundary": {
        "content": b"--xyz\r\n",
        "headers": {"content-type": "multipart/form-data"},
    },
    "intent-part-over-1mb": {"files": {"intent": (None, "x" * OVER_PART_LIMIT)}},
    "too-many-fields": {"data": {f"f{i}": "1" for i in range(1001)}},
    "too-many-files": {"files": [("f", (f"{i}.txt", b"x")) for i in range(1001)]},
    "urlencoded-field-over-1mb": {
        "content": b"intent=" + b"x" * OVER_PART_LIMIT,
        "headers": {"content-type": "application/x-www-form-urlencoded"},
    },
}

OWN_HOST = "127.0.0.1:8765"
FOREIGN = {
    "foreign-host": {"Host": "evil.example:8765"},
    "foreign-origin": {"Host": OWN_HOST, "Origin": "http://evil.example"},
    "null-origin": {"Host": OWN_HOST, "Origin": "null"},
}


def _empty_export() -> bytes:
    """The smallest valid export: an empty library and an empty ``covers/``."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("library.json", serialize(Library.empty()))
        archive.mkdir("covers")
    return buffer.getvalue()


def _intent_files(route: str) -> dict:
    """The intent part for ``route``, plus a valid ``archive`` part for restore."""
    files = {"intent": (None, json.dumps(INTENT_ROUTES[route]), "application/json")}
    if route == "restore":
        files["archive"] = ("bookvie-export.zip", _empty_export(), "application/zip")
    return files


@pytest.fixture
def cover_file(tmp_path: Path) -> str:
    """Seeds Dune with a stored cover; returns its ``coverFile``."""
    return seed_dune_with_cover(tmp_path)


@pytest.fixture
def data_dir(tmp_path: Path, cover_file: str) -> Path:
    return tmp_path


# --- VG2 / F-R2: a body that can't be parsed is enveloped ------------------------


@pytest.mark.parametrize("route", INTENT_ROUTES)
@pytest.mark.parametrize("body", BAD_BODIES.values(), ids=BAD_BODIES.keys())
def test_unparseable_body_is_malformed_intent(
    data_dir: Path, route: str, body: dict, capsys: pytest.CaptureFixture[str]
) -> None:
    before = library_bytes(data_dir)
    response = api_client(data_dir).post(f"/api/intents/{route}", **body)
    assert response.status_code == 422
    assert response.json() == MALFORMED_INTENT
    assert library_bytes(data_dir) == before
    # The parser's reason is kept on stderr, so a client bug stays traceable.
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert f"unparseable body on POST /api/intents/{route}: " in lines[0]


@pytest.mark.parametrize("route", INTENT_ROUTES)
def test_missing_intent_part_is_malformed_intent(data_dir: Path, route: str) -> None:
    before = library_bytes(data_dir)
    files = {"other": (None, "{}")} | {k: v for k, v in _intent_files(route).items() if k != "intent"}
    response = api_client(data_dir).post(f"/api/intents/{route}", files=files)
    assert response.status_code == 422
    assert response.json() == MALFORMED_INTENT
    assert library_bytes(data_dir) == before


@pytest.mark.parametrize(
    ("method", "path", "status"),
    [
        ("GET", "/api/no-such-route", 404),
        ("HEAD", "/api/no-such-route", 404),
        ("POST", "/api/no-such-route", 405),
        ("PUT", "/api/intents/add-book", 405),
        ("GET", "/media/covers/missing.jpg", 404),
    ],
)
def test_other_http_errors_keep_fastapi_shape(
    data_dir: Path, method: str, path: str, status: int
) -> None:
    # Unknown /api paths and methods stay unenveloped, as api.py documents.
    response = api_client(data_dir).request(method, path)
    assert response.status_code == status
    if method != "HEAD":
        assert "detail" in response.json()
    if status == 405:
        assert response.headers["allow"]  # headers survive the delegation


@pytest.mark.parametrize("path", ["/media/x", "/api/views/home", "/api/intents"])
def test_a_400_off_the_intent_routes_keeps_fastapi_shape(path: str) -> None:
    # Only intent routes parse a body, so call the handler directly.
    scope = {"type": "http", "method": "POST", "path": path, "headers": []}
    response = asyncio.run(_http_error(Request(scope), HTTPException(status_code=400)))
    assert response.status_code == 400
    assert json.loads(bytes(response.body)) == {"detail": "Bad Request"}


# --- VG1: the guard on the real routes ---------------------------------------------


@pytest.mark.parametrize("route", INTENT_ROUTES)
@pytest.mark.parametrize("headers", FOREIGN.values(), ids=FOREIGN.keys())
def test_foreign_caller_is_403_on_intent_route(data_dir: Path, route: str, headers: dict) -> None:
    client = api_client(data_dir)
    files = _intent_files(route)
    before = library_bytes(data_dir)
    response = client.post(f"/api/intents/{route}", files=files, headers=headers)
    assert response.status_code == 403
    assert response.headers["content-type"].startswith("text/plain")
    assert library_bytes(data_dir) == before
    # Control: the same intent from the app itself is saved.
    own = client.post(f"/api/intents/{route}", files=files)
    assert own.status_code == 200
    assert own.json()["ok"] is True


@pytest.mark.parametrize("headers", FOREIGN.values(), ids=FOREIGN.keys())
@pytest.mark.parametrize("method", ["GET", "HEAD"])
def test_foreign_caller_is_403_on_cover(
    data_dir: Path, cover_file: str, headers: dict, method: str
) -> None:
    client = api_client(data_dir)
    path = f"/media/{cover_file}"
    response = client.request(method, path, headers=headers)
    assert response.status_code == 403
    assert "cache-control" not in response.headers
    # Control: the app's own request gets the cover.
    assert client.request(method, path).status_code == 200


@pytest.mark.parametrize("route", ["add-book", "edit-book"])
@pytest.mark.parametrize("caller", FOREIGN.values(), ids=FOREIGN.keys())
def test_guard_runs_before_the_cover_cap(data_dir: Path, route: str, caller: dict) -> None:
    # A foreign caller with an oversized body is refused by the guard (403),
    # not answered by CoverSizeCap (413).
    client = api_client(data_dir)
    body = b"x" * (BODY_LIMIT + 1)
    path = f"/api/intents/{route}"
    headers = {"content-type": MULTIPART}
    before = library_bytes(data_dir)
    foreign = client.post(path, content=body, headers=headers | caller)
    assert foreign.status_code == 403
    assert library_bytes(data_dir) == before
    # Control: from the app itself, the same body reaches the cap.
    assert client.post(path, content=body, headers=headers).status_code == 413
