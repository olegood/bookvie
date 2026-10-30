"""The AD-9 envelope: error codes, the commit path and the global handlers.

The backend matrix rows run against test-only routes added to a
``create_app`` instance, since no real intent exists yet (Story 1.7).
"""

from pathlib import Path
from typing import Literal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain import Library
from bookvie.http.app import create_app
from bookvie.intents import (
    COULDNT_SAVE_MESSAGE,
    ErrorBody,
    ErrorCode,
    ErrorKind,
    FieldError,
    IntentError,
    OkResponse,
    commit,
    invalid_fields,
)
from bookvie.store import Store
from tests.builder import LibraryBuilder
from tests.test_store import FaultyFs

BASE_URL = "http://127.0.0.1:8765"
COULDNT_SAVE = {
    "error": {"kind": "couldnt_save", "code": "couldnt_save", "message": COULDNT_SAVE_MESSAGE}
}


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


def _library_bytes(data_dir: Path) -> bytes:
    return (data_dir / "library.json").read_bytes()


# --- success and refusals -----------------------------------------------------


def test_success_commits_and_returns_ok(client: TestClient, data_dir: Path) -> None:
    response = client.post("/api/intents/probe", json={"mode": "ok", "pageCount": 1})
    assert response.status_code == 200
    assert response.json() == {"ok": True, "ids": {"probe": "x"}}
    assert b'"probe"' in _library_bytes(data_dir)


def test_refusal_from_a_change_passes_through(client: TestClient, data_dir: Path) -> None:
    before = _library_bytes(data_dir)
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
    assert _library_bytes(data_dir) == before


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
    before = _library_bytes(data_dir)
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
    assert _library_bytes(data_dir) == before


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
    before = _library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "invariant", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE
    assert _library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert "pointer_exists" in lines[0]


def test_revalidation_error_is_500(
    client: TestClient, data_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    before = _library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "invalid", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE
    assert _library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert len(lines) == 1
    assert "the library is not valid: books.0.pages" in lines[0]


def test_unexpected_exception_in_a_change_is_500(
    client: TestClient, data_dir: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    before = _library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "raise", "pageCount": 1})
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE
    assert _library_bytes(data_dir) == before
    lines = [line for line in capsys.readouterr().err.splitlines() if line.startswith("bookvie:")]
    assert lines == ["bookvie: couldn't save: unexpected RuntimeError: probe exploded"]


def test_unexpected_exception_outside_commit_is_500_envelope(
    client: TestClient, capsys: pytest.CaptureFixture[str]
) -> None:
    response = client.post("/api/intents/boom")
    assert response.status_code == 500
    assert response.json() == COULDNT_SAVE
    assert "bookvie: unexpected RuntimeError on POST /api/intents/boom" in capsys.readouterr().err


def test_unexpected_exception_outside_api_is_plain_500(client: TestClient) -> None:
    response = client.post("/elsewhere/boom")
    assert response.status_code == 500
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == "Internal Server Error\n"  # no envelope


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "close", "replace"])
def test_seam_fault_is_503(
    data_dir: Path, step: str, capsys: pytest.CaptureFixture[str]
) -> None:
    app = _app(data_dir)
    app.state.store.fs = FaultyFs(step)
    client = TestClient(app, base_url=BASE_URL, raise_server_exceptions=False)
    before = _library_bytes(data_dir)
    response = client.post("/api/intents/probe", json={"mode": "ok", "pageCount": 1})
    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE
    assert _library_bytes(data_dir) == before
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
    assert schemas["ErrorCode"]["enum"] == ["invalid_fields", "couldnt_save", "duplicate_book"]
    assert schemas["ErrorKind"]["enum"] == ["refusal", "couldnt_save"]
    assert [code.value for code in ErrorCode] == ["invalid_fields", "couldnt_save", "duplicate_book"]
    assert [kind.value for kind in ErrorKind] == ["refusal", "couldnt_save"]


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
    operations.append(("post", "/api/intents/add-book"))
    for method, path in operations:
        responses = openapi["paths"][path][method]["responses"]
        for status in ("409", "422", "500", "503"):
            ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
            assert ref == "#/components/schemas/ErrorResponse"


def test_openapi_is_cached_and_stable() -> None:
    app = create_app()
    assert app.openapi() is app.openapi()
    names = list(app.openapi()["components"]["schemas"])
    assert names == sorted(names)
    assert "OkResponse" in names
