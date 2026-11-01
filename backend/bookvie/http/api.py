"""The ``/api`` contract: views, the error envelope and its handlers (AD-9).

Every ``/api`` error body is ``{error: {kind, code, message, fields?}}``:
:class:`IntentError` from an intent, 422 ``invalid_fields`` for a request
that fails validation, and 500 ``couldnt_save`` for anything unexpected.
FastAPI's ``{detail}`` shape never reaches the browser from a route here.
Unknown ``/api`` paths are not enveloped: a GET or HEAD 404s through the SPA
route, and any other method gets Starlette's 405 ``{detail}``.

``add-book`` and ``edit-book`` take an optional ``cover`` file part (AD-3).
:class:`CoverSizeCap` refuses a body past the cover limit with 413
``cover_too_large`` while it streams; the route refuses a ``cover`` part over
exactly 20 MB the same way, then has Pillow decode it before the intent takes
the store lock.

``http`` may not import ``store`` or ``domain``: the store on
``app.state.store`` is duck-typed and only its ``library`` is read.
"""

import sys
from typing import Annotated, Any

from fastapi import APIRouter, FastAPI, File, Form, Request, UploadFile
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from bookvie import views
from bookvie.intents import (
    COVER_LIMIT,
    ErrorResponse,
    FieldError,
    IntentError,
    OkResponse,
    UploadedCover,
    add_book,
    book_not_found,
    couldnt_save,
    cover_too_large,
    delete_book,
    edit_book,
    invalid_fields,
    parse_add_book_intent,
    parse_delete_book_intent,
    parse_edit_book_intent,
    prepare_cover,
)

# Every /api route documents the envelope for these statuses. Declaring 422
# here also keeps FastAPI from adding its own `HTTPValidationError`.
ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    status: {"model": ErrorResponse, "description": description}
    for status, description in (
        (422, "Invalid fields"),
        (409, "Refused by a library rule"),
        (500, "Couldn't save"),
        (503, "Couldn't save"),
    )
}

# Only the two routes that take a cover part can refuse one as too large.
COVER_RESPONSES: dict[int | str, dict[str, Any]] = {
    413: {"model": ErrorResponse, "description": "Cover too large"},
}

# Contract models no route returns yet; they are still part of the schema.
EXTRA_SCHEMAS: tuple[type[BaseModel], ...] = ()

router = APIRouter(prefix="/api", responses=ERROR_RESPONSES)

ADD_BOOK_PATH = "/api/intents/add-book"
EDIT_BOOK_PATH = "/api/intents/edit-book"
# The cover plus room for the intent part and the multipart framing.
BODY_LIMIT = COVER_LIMIT + 64 * 1024


class _BodyTooLarge(Exception):
    """Raised from ``receive`` once a capped body passes its limit."""


class CoverSizeCap:
    """Pure-ASGI cap on the bodies of the routes that take a cover (R-14).

    A ``Content-Length`` over ``limit`` is refused before anything is read.
    Otherwise the bytes are counted as they arrive, and past ``limit`` the
    body stops being read: whatever the route answers is replaced by 413
    ``cover_too_large``.
    """

    def __init__(
        self,
        app: ASGIApp,
        *,
        paths: tuple[str, ...] = (ADD_BOOK_PATH, EDIT_BOOK_PATH),
        limit: int = BODY_LIMIT,
    ) -> None:
        self.app = app
        self.paths = paths
        self.limit = limit

    async def _refuse(self, scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse(cover_too_large().response_body(), status_code=413)
        await response(scope, receive, send)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] not in self.paths:
            await self.app(scope, receive, send)
            return
        for name, value in scope.get("headers", []):
            if name == b"content-length" and value.isdigit() and int(value) > self.limit:
                await self._refuse(scope, receive, send)
                return
        received = 0
        exceeded = False
        started = False

        async def capped_receive() -> Message:
            nonlocal received, exceeded
            if exceeded:
                raise _BodyTooLarge()
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.limit:
                    exceeded = True
                    raise _BodyTooLarge()
            return message

        async def guarded_send(message: Message) -> None:
            nonlocal started
            if exceeded:
                return  # the route's answer to a cut-off body is replaced
            started = True
            await send(message)

        try:
            await self.app(scope, capped_receive, guarded_send)
        except Exception:
            if not exceeded:
                raise
        if exceeded and not started:
            await self._refuse(scope, receive, send)


def _uploaded_cover(cover: UploadFile | None) -> UploadedCover | None:
    """The ``cover`` part decoded, or ``None`` when none was sent; 413 past 20 MB."""
    if cover is None:
        return None
    data = cover.file.read(COVER_LIMIT + 1)
    if len(data) > COVER_LIMIT:
        raise cover_too_large()
    return prepare_cover(data)


CoverPart = Annotated[
    UploadFile | None,
    File(description="The cover image: JPEG, PNG or WebP, 20 MB or smaller. Optional."),
]


@router.get("/views/home", response_model=views.HomeView)
def home_view(request: Request) -> views.HomeView:
    return views.home(request.app.state.store.library)


@router.get("/views/catalog", response_model=views.CatalogView)
def catalog_view(request: Request) -> views.CatalogView:
    return views.catalog(request.app.state.store.library)


@router.get(
    "/views/book",
    response_model=views.BookDetailView,
    responses={404: {"model": ErrorResponse, "description": "No such Book"}},
)
def book_view(request: Request, id: str) -> views.BookDetailView:
    """One Book as Book detail shows it; 404 ``book_not_found`` when it is gone."""
    view = views.book_detail(request.app.state.store.library, id)
    if view is None:
        raise book_not_found(404)
    return view


@router.post(
    "/intents/add-book",
    response_model=OkResponse,
    response_model_exclude_none=True,
    responses=COVER_RESPONSES,
)
def add_book_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description="JSON object of the New book form's fields, as typed.",
        ),
    ] = None,
    cover: CoverPart = None,
) -> OkResponse:
    """Save a new Book only when every field is valid (FR-1), with its cover if one is sent."""
    parsed = parse_add_book_intent(intent)
    uploaded = _uploaded_cover(cover)
    book_id = add_book(request.app.state.store, request.app.state.clock, parsed, uploaded)
    return OkResponse(ok=True, ids={"bookId": book_id})


@router.post(
    "/intents/edit-book",
    response_model=OkResponse,
    response_model_exclude_none=True,
    responses=COVER_RESPONSES,
)
def edit_book_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                "JSON object of the Edit book form's fields, as typed, plus bookId "
                "and, to clear the cover, removeCover: true."
            ),
        ),
    ] = None,
    cover: CoverPart = None,
) -> OkResponse:
    """Correct a Book's details (FR-1, FR-3); a cover part replaces its cover."""
    parsed = parse_edit_book_intent(intent, has_cover=cover is not None)
    uploaded = _uploaded_cover(cover)
    edit_book(request.app.state.store, request.app.state.clock, parsed, uploaded)
    return OkResponse(ok=True)


@router.post("/intents/delete-book", response_model=OkResponse, response_model_exclude_none=True)
def delete_book_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description='JSON object {"bookId": ...}: the Book to delete.',
        ),
    ] = None,
) -> OkResponse:
    """Remove a Book with its Readings and Card notes, and clear every pointer to it (FR-1)."""
    parsed = parse_delete_book_intent(intent)
    delete_book(request.app.state.store, parsed)
    return OkResponse(ok=True)


def _is_api(request: Request) -> bool:
    first = request.url.path.lstrip("/").split("/", 1)[0].lower()
    return first == "api"


def _field_path(loc: tuple[Any, ...]) -> str:
    parts = list(loc)
    if parts and parts[0] in ("body", "query", "path", "header", "cookie"):
        source = parts.pop(0)
        if not parts or all(isinstance(p, int) for p in parts):
            # The whole body (missing, not JSON, wrong shape) has no field name.
            return str(source)
    return ".".join(str(part) for part in parts)


async def _intent_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, IntentError)
    return JSONResponse(exc.response_body(), status_code=exc.status)


async def _validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    if not _is_api(request):
        return await request_validation_exception_handler(request, exc)
    errors = [
        FieldError(field=_field_path(tuple(error.get("loc", ()))), message=error["msg"])
        for error in exc.errors()
    ]
    return await _intent_error(request, invalid_fields(errors))


async def _unexpected_error(request: Request, exc: Exception):
    print(
        f"bookvie: unexpected {type(exc).__name__} on {request.method} {request.url.path}: {exc}",
        file=sys.stderr,
        flush=True,
    )
    if not _is_api(request):
        return PlainTextResponse("Internal Server Error\n", status_code=500)
    return await _intent_error(request, couldnt_save(500))


def _openapi_with_extras(app: FastAPI):
    plain = app.openapi

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            schema = plain()
            components = schema.setdefault("components", {}).setdefault("schemas", {})
            for model in EXTRA_SCHEMAS:
                components.setdefault(
                    model.__name__,
                    model.model_json_schema(
                        by_alias=True, ref_template="#/components/schemas/{model}"
                    ),
                )
            schema["components"]["schemas"] = dict(sorted(components.items()))
            app.openapi_schema = schema
        return app.openapi_schema

    return openapi


def install_api(app: FastAPI) -> None:
    """Add the /api routes, the envelope handlers and the contract schema."""
    app.include_router(router)
    app.add_exception_handler(IntentError, _intent_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unexpected_error)
    app.openapi = _openapi_with_extras(app)  # type: ignore[method-assign]
