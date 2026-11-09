"""The AD-9 envelope: error codes, the commit path and the global handlers.

The backend matrix rows run against test-only routes added to a
``create_app`` instance, since no real intent exists yet (Story 1.7).
"""

import asyncio
import json
from pathlib import Path
from typing import Literal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

import bookvie.store.restore as unpack
from bookvie.domain import Library
from bookvie.http.api import BODY_LIMIT, FRAMING_SLACK, BodyCap, BodySizeCap
from bookvie.http.app import create_app
from bookvie.intents import (
    ErrorBody,
    ErrorCode,
    ErrorKind,
    FieldError,
    IntentError,
    OkResponse,
    commit,
    cover_too_large,
    invalid_fields,
)
from bookvie.store import Store
from tests.builder import LibraryBuilder
from tests.helpers import (
    BASE_URL,
    COULDNT_SAVE_BODY,
    FaultyFs,
    RecordingLock,
    library_bytes,
)


class Probe(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    mode: Literal["ok", "invariant", "invalid", "raise", "refuse"]
    page_count: int
    authors: list[str] = []


def _change(mode: str):
    def change(library: Library) -> Library | None:
        if mode == "ok":
            library.books[0].tags.append("probe")
        elif mode == "invariant":
            library.main_book_id = "no-such-book"  # breaks pointer_exists
        elif mode == "invalid":
            library.books[0].pages = 0  # breaks the model bound pages >= 1
        elif mode == "raise":
            raise RuntimeError("probe exploded")
        elif mode == "refuse":
            raise invalid_fields([FieldError(field="title", message="Required")])
        return None

    return change


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    builder = LibraryBuilder()
    builder.book(title="Dune")
    builder.write(tmp_path / "data")
    return tmp_path / "data"


def _app(data_dir: Path) -> FastAPI:
    store = Store.open(data_dir)
    app = create_app(data_dir / "no-static", data_dir=data_dir, store=store)

    @app.post("/api/intents/probe")
    def probe(body: Probe) -> dict:
        commit(app.state.store, _change(body.mode))
        return OkResponse(ok=True, ids={"probe": "x"}).model_dump(by_alias=True, exclude_none=True)

    @app.post("/api/intents/boom")
    def boom() -> None:
        raise RuntimeError("outside commit")

    @app.post("/elsewhere/boom")
    def elsewhere_boom() -> None:
        raise RuntimeError("outside /api")

    @app.post("/elsewhere/{n}")
    def elsewhere(n: int) -> int:
        return n

    return app


@pytest.fixture
def client(data_dir: Path) -> TestClient:
    return TestClient(_app(data_dir), base_url=BASE_URL, raise_server_exceptions=False)


# --- success and refusals -----------------------------------------------------


def test_success_commits_and_returns_ok(client: TestClient, data_dir: Path) -> None:
    response = client.post("/api/intents/probe", json={"mode": "ok", "pageCount": 1})
    assert response.status_code == 200
    assert response.json() == {"ok": True, "ids": {"probe": "x"}}
    assert b'"probe"' in library_bytes(data_dir)


def test_refusal_from_a_change_passes_through(client: TestClient, data_dir: Path) -> None:
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "refuse", "pageCount": 1})
    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "invalid_fields",
            "message": "Not saved. 1 field needs attention: title.",
            "fields": [{"field": "title", "message": "Required"}],
        }
    }
    assert library_bytes(data_dir) == before


# --- bad body -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("kwargs", "fields"),
    [
        ({"json": {"mode": "ok"}}, ["pageCount"]),
        ({"json": {"mode": "ok", "pageCount": "many", "authors": [1]}}, ["pageCount", "authors.0"]),
        ({"json": {"pageCount": 1, "extra": True}}, ["mode", "extra"]),
        ({"content": b"{not json", "headers": {"content-type": "application/json"}}, ["body"]),
        ({}, ["body"]),
    ],
    ids=["missing", "wrong-type", "missing-and-unknown", "bad-json", "no-body"],
)
def test_bad_body_is_invalid_fields(
    client: TestClient, data_dir: Path, kwargs: dict, fields: list[str]
) -> None:
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", **kwargs)
    assert response.status_code == 422
    body = response.json()
    assert "detail" not in body
    error = body["error"]
    assert error["kind"] == "refusal"
    assert error["code"] == "invalid_fields"
    assert [f["field"] for f in error["fields"]] == fields
    assert all(f["message"] for f in error["fields"])
    noun = "field needs" if len(fields) == 1 else "fields need"
    assert error["message"] == f"Not saved. {len(fields)} {noun} attention: {', '.join(fields)}."
    assert library_bytes(data_dir) == before


def test_invalid_fields_message_names_each_field_once() -> None:
    error = invalid_fields(
        [
            FieldError(field="authors.0", message="a"),
            FieldError(field="authors.0", message="b"),
            FieldError(field="pages", message="c"),
        ]
    )
    assert error.status == 422
    assert error.body.message == "Not saved. 2 fields need attention: authors.0, pages."
    assert len(error.body.fields or []) == 3


def test_invalid_fields_message_names_labels_when_given() -> None:
    error = invalid_fields(
        [
            FieldError(field="pages", message="a"),
            FieldError(field="finishedOn", message="b"),
            FieldError(field="intent", message="c"),
        ],
        {"pages": "Pages", "finishedOn": "Finished on"},
    )
    assert error.body.message == "Not saved. 3 fields need attention: Pages, Finished on, intent."
    assert [f.field for f in error.body.fields or []] == ["pages", "finishedOn", "intent"]


def test_validation_outside_api_keeps_fastapi_shape(client: TestClient) -> None:
    response = client.post("/elsewhere/nope")
    assert response.status_code == 422
    assert "detail" in response.json()


# --- couldn't save ------------------------------------------------------------


def test_failed_invariant_is_500_and_names_the_rule(
    client: TestClient, data_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "invariant", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert "pointer_exists" in lines[0]


def test_revalidation_error_is_500(
    client: TestClient, data_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "invalid", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert "the library is not valid: books.0.pages" in lines[0]


def test_unexpected_exception_in_a_change_is_500(
    client: TestClient, data_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "raise", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert lines == ["bookvie: couldn't save: unexpected RuntimeError: probe exploded"]


def test_unexpected_exception_outside_commit_is_500_envelope(
    client: TestClient, capsys: pytest.CaptureFixture[str]
) -> None:
    response = client.post("/api/intents/boom")
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE_BODY
    assert "bookvie: unexpected RuntimeError on POST /api/intents/boom" in capsys.readouterr().err


def test_unexpected_exception_outside_api_is_plain_500(client: TestClient) -> None:
    response = client.post("/elsewhere/boom")
    assert response.status_code == 500
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == "Internal Server Error\n"  # no envelope


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "close", "replace"])
def test_seam_fault_is_503(data_dir: Path, step: str, capsys: pytest.CaptureFixture[str]) -> None:
    app = _app(data_dir)
    app.state.store.fs = FaultyFs(step)
    client = TestClient(app, base_url=BASE_URL, raise_server_exceptions=False)
    before = library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "ok", "pageCount": 1})
    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(data_dir) == before
    assert sorted(data_dir.glob("library.json.tmp*")) == []
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert f"injected {step} fault" in lines[0]


def test_intent_error_body_omits_absent_fields() -> None:
    error = IntentError(
        422, ErrorBody(kind=ErrorKind.REFUSAL, code=ErrorCode.INVALID_FIELDS, message="m")
    )
    assert error.response_body() == {
        "error": {"kind": "refusal", "code": "invalid_fields", "message": "m"}
    }


def test_unknown_api_path_still_404s(client: TestClient) -> None:
    assert client.get("/api/nope").status_code == 404


# --- OpenAPI ------------------------------------------------------------------


@pytest.fixture
def openapi() -> dict:
    return create_app().openapi()


def test_openapi_error_enums(openapi: dict) -> None:
    schemas = openapi["components"]["schemas"]
    codes = [
        "invalid_fields",
        "couldnt_save",
        "duplicate_book",
        "book_not_found",
        "pages_below_current_page",
        "pages_below_card_note",
        "cover_too_large",
        "couldnt_export",
        "restore_invalid",
        "restore_newer_version",
        "restore_unsafe",
        "already_main",
        "reading_already_finished",
        "not_main_book",
        "main_cannot_be_up_next",
    ]
    kinds = ["refusal", "couldnt_save", "couldnt_export"]
    assert schemas["ErrorCode"]["enum"] == codes
    assert schemas["ErrorKind"]["enum"] == kinds
    assert [code.value for code in ErrorCode] == codes
    assert [kind.value for kind in ErrorKind] == kinds


def test_every_restore_refusal_code_is_in_the_ad9_enum(openapi: dict) -> None:
    restore_codes = {"restore_invalid", "restore_newer_version", "restore_unsafe", "couldnt_save"}
    error_body = openapi["components"]["schemas"]["ErrorBody"]
    ref = error_body["properties"]["code"]["$ref"].rsplit("/", 1)[-1]
    assert restore_codes <= set(openapi["components"]["schemas"][ref]["enum"])
    assert restore_codes <= {code.value for code in ErrorCode}


def test_openapi_documents_the_envelope_not_fastapi_errors(openapi: dict) -> None:
    schemas = openapi["components"]["schemas"]
    assert "HTTPValidationError" not in schemas
    assert "ValidationError" not in schemas
    assert schemas["ErrorBody"]["required"] == ["kind", "code", "message"]
    assert schemas["OkResponse"]["required"] == ["ok"]
    assert set(schemas["OkResponse"]["properties"]) == {"ok", "ids", "reachedLastPage"}
    ids = schemas["OkResponse"]["properties"]["ids"]["anyOf"][0]
    assert ids == {"type": "object", "additionalProperties": {"type": "string"}}
    operations = [("get", "/api/views/home"), ("get", "/api/views/catalog")]
    operations.append(("get", "/api/views/book"))
    operations.append(("post", "/api/intents/add-book"))
    operations.append(("post", "/api/intents/edit-book"))
    operations.append(("post", "/api/intents/delete-book"))
    operations.append(("post", "/api/intents/set-spine-color"))
    operations.append(("post", "/api/intents/start-reading"))
    operations.append(("post", "/api/intents/edit-purpose"))
    operations.append(("post", "/api/intents/update-page"))
    operations.append(("post", "/api/intents/pause"))
    operations.append(("post", "/api/intents/set-up-next"))
    operations.append(("post", "/api/intents/restore"))
    operations.append(("get", "/api/views/backup"))
    operations.append(("get", "/api/export"))
    for method, path in operations:
        responses = openapi["paths"][path][method]["responses"]
        for status in ("409", "422", "500", "503"):
            ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
            assert ref == "#/components/schemas/ErrorResponse"
    # The two intents that take a cover document 413 cover_too_large too.
    for path in ("/api/intents/add-book", "/api/intents/edit-book"):
        responses = openapi["paths"][path]["post"]["responses"]
        ref = responses["413"]["content"]["application/json"]["schema"]["$ref"]
        assert ref == "#/components/schemas/ErrorResponse"
        body = openapi["paths"][path]["post"]["requestBody"]["content"]["multipart/form-data"]
        assert body["schema"]["$ref"].startswith("#/components/schemas/Body_")
    # Routes without a cover part can't answer 413, so they don't document it.
    coverless = [
        ("get", "/api/views/home"),
        ("get", "/api/views/catalog"),
        ("get", "/api/views/book"),
        ("get", "/api/views/backup"),
        ("get", "/api/export"),
        ("post", "/api/intents/delete-book"),
        ("post", "/api/intents/set-spine-color"),
        ("post", "/api/intents/start-reading"),
        ("post", "/api/intents/edit-purpose"),
        ("post", "/api/intents/update-page"),
        ("post", "/api/intents/pause"),
        ("post", "/api/intents/set-up-next"),
        ("post", "/api/intents/restore"),
    ]
    for method, path in coverless:
        assert "413" not in openapi["paths"][path][method]["responses"]


def test_openapi_documents_the_export_download(openapi: dict) -> None:
    responses = openapi["paths"]["/api/export"]["get"]["responses"]
    assert set(responses["200"]["content"]) == {"application/zip"}
    assert responses["503"]["description"] == "Couldn't export"


def test_openapi_is_cached_and_stable() -> None:
    app = create_app()
    assert app.openapi() is app.openapi()
    names = list(app.openapi()["components"]["schemas"])
    assert names == sorted(names)
    assert "OkResponse" in names


# --- 413 cover_too_large (Story 1.13) -------------------------------------------

COVER_TOO_LARGE = {
    "error": {
        "kind": "refusal",
        "code": "cover_too_large",
        "message": "Not saved. 1 field needs attention: Cover.",
        "fields": [{"field": "cover", "message": "Cover must be 20 MB or smaller."}],
    }
}


def _run_asgi(app, scope: dict, chunks) -> tuple[list[dict], int]:
    """Run ``app`` on one request whose body arrives in ``chunks``; (sent messages, chunks pulled)."""
    sent: list[dict] = []
    pulled = 0
    source = iter(chunks)

    async def receive() -> dict:
        nonlocal pulled
        chunk = next(source, None)
        if chunk is None:
            return {"type": "http.request", "body": b"", "more_body": False}
        pulled += 1
        return {"type": "http.request", "body": chunk, "more_body": True}

    async def send(message: dict) -> None:
        sent.append(message)

    asyncio.run(app(scope, receive, send))
    return sent, pulled


def _response(sent: list[dict]) -> tuple[int, dict]:
    start = next(m for m in sent if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return start["status"], json.loads(body)


COVER_ROUTES = ("/api/intents/add-book", "/api/intents/edit-book")


def _streamed_cover_scope(
    content_length: int | None = None, path: str = "/api/intents/add-book"
) -> dict:
    headers = [
        (b"host", b"127.0.0.1:8765"),
        (b"content-type", b"multipart/form-data; boundary=xyz"),
    ]
    if content_length is not None:
        headers.append((b"content-length", str(content_length).encode()))
    return {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": headers,
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8765),
    }


def _endless_cover(chunk_size: int):
    yield (
        b'--xyz\r\nContent-Disposition: form-data; name="intent"\r\n\r\n{}\r\n'
        b'--xyz\r\nContent-Disposition: form-data; name="cover"; filename="big.png"\r\n'
        b"Content-Type: image/png\r\n\r\n"
    )
    while True:
        yield b"\x00" * chunk_size


@pytest.mark.parametrize("path", COVER_ROUTES)
def test_a_streamed_body_past_the_cover_limit_is_413_and_is_not_read_further(
    data_dir: Path, path: str
) -> None:
    before = library_bytes(data_dir)
    chunk = 1024 * 1024
    # No Content-Length: the body is counted as it arrives.
    scope = _streamed_cover_scope(path=path)
    sent, pulled = _run_asgi(_app(data_dir), scope, _endless_cover(chunk))

    assert _response(sent) == (413, COVER_TOO_LARGE)
    # Reading stopped at the first chunk past the limit.
    assert pulled == 1 + BODY_LIMIT // chunk + 1
    assert library_bytes(data_dir) == before
    assert sorted((data_dir / "covers").iterdir()) == []


@pytest.mark.parametrize("path", COVER_ROUTES)
def test_a_content_length_past_the_cover_limit_is_413_before_any_read(
    data_dir: Path, path: str
) -> None:
    scope = _streamed_cover_scope(content_length=BODY_LIMIT + 1, path=path)
    sent, pulled = _run_asgi(_app(data_dir), scope, _endless_cover(1024))

    assert _response(sent) == (413, COVER_TOO_LARGE)
    assert pulled == 0


def test_a_streamed_restore_body_past_the_upload_cap_is_422_restore_unsafe_without_the_lock(
    data_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(unpack, "MAX_UPLOAD_BYTES", 100 * 1024)
    app = _app(data_dir)
    log: list[str] = []
    lock = RecordingLock(log)
    app.state.store.lock = lock
    app.state.write_lock = lock
    before = library_bytes(data_dir)
    chunk = 16 * 1024
    # No Content-Length: the body is counted as it arrives.
    scope = _streamed_cover_scope(path="/api/intents/restore")

    sent, pulled = _run_asgi(app, scope, _endless_cover(chunk))

    status, body = _response(sent)
    assert (status, body["error"]["code"]) == (422, "restore_unsafe")
    limit = 100 * 1024 + FRAMING_SLACK
    assert pulled == 1 + limit // chunk + 1
    assert log == []
    assert library_bytes(data_dir) == before


def test_the_cover_cap_leaves_other_routes_and_small_bodies_alone() -> None:
    async def echo(scope, receive, send) -> None:
        body = b""
        while True:
            message = await receive()
            body += message.get("body", b"")
            if not message.get("more_body"):
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": str(len(body)).encode()})

    capped = BodySizeCap(
        echo, caps={"/api/intents/add-book": BodyCap(limit=lambda: 10, refusal=cover_too_large)}
    )
    small = _run_asgi(capped, _streamed_cover_scope(), [b"12345", b"12345"])[0]
    assert small[0]["status"] == 200 and small[1]["body"] == b"10"
    other = {**_streamed_cover_scope(), "path": "/api/intents/delete-book"}
    assert _run_asgi(capped, other, [b"x" * 20])[0][1]["body"] == b"20"
    # A route that fails on the cut-off body is answered with 413 instead.
    status, body = _response(_run_asgi(capped, _streamed_cover_scope(), [b"x" * 11])[0])
    assert (status, body) == (413, COVER_TOO_LARGE)


def test_an_error_that_is_not_the_cap_still_propagates() -> None:
    async def broken(scope, receive, send) -> None:
        raise RuntimeError("route exploded")

    with pytest.raises(RuntimeError, match="route exploded"):
        _run_asgi(BodySizeCap(broken), _streamed_cover_scope(), [])
