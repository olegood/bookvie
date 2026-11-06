"""The ``/api`` contract: views, the error envelope and its handlers (AD-9).

Every ``/api`` error body is ``{error: {kind, code, message, fields?}}``:
:class:`IntentError` from an intent, 422 ``invalid_fields`` for a request
that fails validation or, on an intent route, whose body can't be parsed
(broken multipart, a non-file part over 1 MB, too many fields or files), and
500 ``couldnt_save`` for anything unexpected.
FastAPI's ``{detail}`` shape never reaches the browser from a route here.
Unknown ``/api`` paths are not enveloped: a GET or HEAD 404s through the SPA
route, and any other method gets Starlette's 405 ``{detail}``.

``add-book`` and ``edit-book`` take an optional ``cover`` file part (AD-3).
:class:`BodySizeCap` refuses a body past the cover limit with 413
``cover_too_large`` while it streams; the route refuses a ``cover`` part over
exactly 20 MB the same way, then has Pillow decode it before the intent takes
the store lock. :class:`BodySizeCap` also caps ``restore``'s body at the upload limit plus
framing slack with 422 ``restore_unsafe`` (AD-14), before the route runs or
the lock is taken; the exact limit is checked on the spooled file.

``http`` may not import ``store`` or ``domain``: the store on
``app.state.store`` is duck-typed and only its ``library`` is read.
"""

import sys
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import IO, Annotated, Any

import anyio
import anyio.lowlevel
import anyio.to_thread
from fastapi import APIRouter, FastAPI, File, Form, Request, UploadFile
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from bookvie import views
from bookvie.intents import (
    COVER_LIMIT,
    EXPORT_CHUNK,
    ErrorResponse,
    FieldError,
    IntentError,
    OkResponse,
    UploadedCover,
    add_book,
    book_not_found,
    build_export,
    couldnt_save,
    cover_too_large,
    delete_book,
    edit_book,
    edit_purpose,
    export_filename,
    finish_reading,
    invalid_fields,
    malformed_intent,
    max_upload_bytes,
    parse_add_book_intent,
    parse_delete_book_intent,
    parse_edit_book_intent,
    parse_edit_purpose_intent,
    parse_finish_reading_intent,
    parse_restore_intent,
    parse_set_spine_color_intent,
    parse_start_reading_intent,
    parse_update_page_intent,
    prepare_cover,
    record_export,
    restore,
    restore_unsafe,
    set_spine_color,
    start_reading,
    update_page,
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
RESTORE_PATH = "/api/intents/restore"
# Room for the intent part and the multipart framing around the file part.
FRAMING_SLACK = 64 * 1024
# The cover plus the framing.
BODY_LIMIT = COVER_LIMIT + FRAMING_SLACK


class _BodyTooLarge(Exception):
    """Raised from ``receive`` once a capped body passes its limit."""


@dataclass(frozen=True)
class BodyCap:
    """One route's body cap: ``limit()`` is read per request, ``refusal()`` answers past it."""

    limit: Callable[[], int]
    refusal: Callable[[], IntentError]


COVER_CAP = BodyCap(limit=lambda: BODY_LIMIT, refusal=cover_too_large)
# The exact upload limit is checked on the spooled file; this stops a body
# far past it from being spooled at all.
RESTORE_CAP = BodyCap(limit=lambda: max_upload_bytes() + FRAMING_SLACK, refusal=restore_unsafe)
BODY_CAPS: Mapping[str, BodyCap] = {
    ADD_BOOK_PATH: COVER_CAP,
    EDIT_BOOK_PATH: COVER_CAP,
    RESTORE_PATH: RESTORE_CAP,
}


class BodySizeCap:
    """Pure-ASGI cap on the request bodies of the routes in ``caps`` (R-14, AD-14).

    A ``Content-Length`` over the route's limit is refused before anything is
    read. Otherwise the bytes are counted as they arrive, and past the limit
    the body stops being read: whatever the route answers is replaced by the
    cap's refusal.
    """

    def __init__(self, app: ASGIApp, *, caps: Mapping[str, BodyCap] = BODY_CAPS) -> None:
        self.app = app
        self.caps = caps

    async def _refuse(self, cap: BodyCap, scope: Scope, receive: Receive, send: Send) -> None:
        error = cap.refusal()
        response = JSONResponse(error.response_body(), status_code=error.status)
        await response(scope, receive, send)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        cap = self.caps.get(scope["path"]) if scope["type"] == "http" else None
        if cap is None:
            await self.app(scope, receive, send)
            return
        limit = cap.limit()
        for name, value in scope.get("headers", []):
            if name == b"content-length" and value.isdigit() and int(value) > limit:
                await self._refuse(cap, scope, receive, send)
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
                if received > limit:
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
            await self._refuse(cap, scope, receive, send)


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


class ExportResponse(Response):
    """Sends a built export in :data:`EXPORT_CHUNK` body messages, then calls ``on_complete``.

    ``on_complete`` runs (in a worker thread) only when every body message
    went out and no ``http.disconnect`` arrived before the last one, so an
    aborted download records nothing. Not a ``BackgroundTask``: Starlette runs
    those even after the client has gone. ``receive`` is watched in a task
    while sending; a server like uvicorn answers it with a disconnect once
    the response is complete, so only a disconnect seen before the final
    send counts as an abort.
    """

    media_type = "application/zip"

    def __init__(
        self,
        file: IO[bytes],
        *,
        filename: str,
        on_complete: Callable[[], None],
        status_code: int = 200,
    ) -> None:
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        super().__init__(
            status_code=status_code,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(size),
                "Cache-Control": "no-store",
            },
        )
        self.file = file
        self.on_complete = on_complete

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        gone = False

        async def watch_for_disconnect() -> None:
            nonlocal gone
            while (await receive())["type"] != "http.disconnect":
                pass
            gone = True

        try:
            async with anyio.create_task_group() as tasks:
                tasks.start_soon(watch_for_disconnect)
                await send(
                    {
                        "type": "http.response.start",
                        "status": self.status_code,
                        "headers": self.raw_headers,
                    }
                )
                while not gone:
                    chunk = await anyio.to_thread.run_sync(self.file.read, EXPORT_CHUNK)
                    if not chunk:
                        break
                    await send({"type": "http.response.body", "body": chunk, "more_body": True})
                    await anyio.lowlevel.checkpoint()  # let the watcher see a disconnect
                if not gone:
                    await send({"type": "http.response.body", "body": b"", "more_body": False})
                # Read before any await: the server's post-response disconnect isn't an abort.
                complete = not gone
                tasks.cancel_scope.cancel()
        finally:
            self.file.close()
        if complete:
            await anyio.to_thread.run_sync(self.on_complete)


def _json_error(description: str) -> dict[str, Any]:
    # Spelled out, not ``model``: FastAPI files a model under the route's own
    # media type, which for the export is application/zip.
    schema = {"$ref": "#/components/schemas/ErrorResponse"}
    return {"description": description, "content": {"application/json": {"schema": schema}}}


EXPORT_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {
        "content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}},
        "description": "The export, bookvie-export-<YYYY-MM-DD>.zip: library.json and covers/",
    },
    **{
        status: _json_error(str(response["description"]))
        for status, response in ERROR_RESPONSES.items()
    },
    503: _json_error("Couldn't export"),
}


@router.get("/export", response_class=ExportResponse, responses=EXPORT_RESPONSES)
def export(request: Request) -> ExportResponse:
    """Download all data as one zip (FR-22); 503 ``couldnt_export`` before any byte is sent.

    Plain ``def``: the zip is built under the store lock in the threadpool.
    "Last export" is recorded only once the whole download went out.
    """
    store = request.app.state.store
    clock = request.app.state.clock
    archive = build_export(store)
    return ExportResponse(
        archive,
        filename=export_filename(clock.today()),
        on_complete=lambda: record_export(store, clock),
    )


@router.get("/views/backup", response_model=views.BackupView)
def backup_view(request: Request) -> views.BackupView:
    return views.backup(request.app.state.store)


@router.get("/views/home", response_model=views.HomeView)
def home_view(request: Request) -> views.HomeView:
    return views.home_for(request.app.state.store)


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


@router.post(
    "/intents/set-spine-color",
    response_model=OkResponse,
    response_model_exclude_none=True,
)
def set_spine_color_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                'JSON object {"bookId": ..., "spineColor": "#RRGGBB" | null}: null is From cover.'
            ),
        ),
    ] = None,
) -> OkResponse:
    """Set or clear a Book's own spine color and re-resolve its spine color (FR-24)."""
    parsed = parse_set_spine_color_intent(intent)
    set_spine_color(request.app.state.store, parsed)
    return OkResponse(ok=True)


@router.post("/intents/start-reading", response_model=OkResponse, response_model_exclude_none=True)
def start_reading_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                'JSON object {"bookId": ..., "purpose": "..." | null}: the Start '
                "dialog's Purpose, trimmed, null when empty."
            ),
        ),
    ] = None,
) -> OkResponse:
    """Start, resume or re-read a Book as the Main book, pausing the previous one (FR-5)."""
    parsed = parse_start_reading_intent(intent)
    start_reading(request.app.state.store, request.app.state.clock, parsed)
    return OkResponse(ok=True)


@router.post("/intents/edit-purpose", response_model=OkResponse, response_model_exclude_none=True)
def edit_purpose_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                'JSON object {"bookId": ..., "purpose": "..." | null}: the new Purpose '
                "of the Book's current Reading, trimmed, null when empty."
            ),
        ),
    ] = None,
) -> OkResponse:
    """Change the Purpose of a Book's current Reading, active or paused (FR-9)."""
    parsed = parse_edit_purpose_intent(intent)
    edit_purpose(request.app.state.store, parsed)
    return OkResponse(ok=True)


@router.post("/intents/update-page", response_model=OkResponse, response_model_exclude_none=True)
def update_page_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                'JSON object {"bookId": ..., "page": <integer>}: the absolute page '
                "reached in the Main book, 0 to its page count."
            ),
        ),
    ] = None,
) -> OkResponse:
    """Save the Main book's current page; ``reachedLastPage`` at its last page (FR-10)."""
    parsed = parse_update_page_intent(intent)
    reached = update_page(request.app.state.store, request.app.state.clock, parsed)
    return OkResponse(ok=True, reached_last_page=True if reached else None)


@router.post("/intents/finish-reading", response_model=OkResponse, response_model_exclude_none=True)
def finish_reading_intent(
    request: Request,
    intent: Annotated[
        str | None,
        Form(
            media_type="multipart/form-data",
            description=(
                'JSON object {"bookId": ..., "finishedOn": "YYYY-MM-DD", '
                '"purposeFulfilled": "yes" | "partly" | "notYet" | null, "rating": 1..5 | null}: '
                "the Finish dialog's answers, null when skipped."
            ),
        ),
    ] = None,
) -> OkResponse:
    """Finish a Book's current Reading and clear it as the Main book (FR-14)."""
    parsed = parse_finish_reading_intent(intent)
    finish_reading(request.app.state.store, request.app.state.clock, parsed)
    return OkResponse(ok=True)


@router.post("/intents/restore", response_model=OkResponse, response_model_exclude_none=True)
def restore_intent(
    request: Request,
    archive: Annotated[
        UploadFile,
        File(description="An export zip from GET /api/export: library.json and covers/."),
    ],
    intent: Annotated[
        str | None,
        Form(media_type="multipart/form-data", description="JSON object {}."),
    ] = None,
) -> OkResponse:
    """Replace all data with an export (FR-23); a 422 refusal changes nothing.

    ``restore_invalid`` for a file that isn't a usable export,
    ``restore_newer_version`` for one from a newer bookvie, ``restore_unsafe``
    for one that breaks a path or size rule (AD-14).

    Plain ``def``: the archive is unpacked and applied under the store lock in
    the threadpool. Starlette spools the upload to disk past 1 MB; the body is
    capped at the upload limit plus framing before the route runs.
    """
    parse_restore_intent(intent)
    restore(request.app.state.store, archive.file)
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


def _is_intent(request: Request) -> bool:
    parts = request.url.path.lstrip("/").lower().split("/", 2)
    return len(parts) == 3 and parts[:2] == ["api", "intents"]


async def _http_error(request: Request, exc: Exception) -> Response:
    """A body an intent route can't parse is a malformed intent (422).

    Starlette and FastAPI raise 400 for broken multipart framing, a missing
    boundary, a non-file part over 1 MB, or more than 1000 fields or files.
    Every other status, and every other path, keeps FastAPI's own answer.
    """
    assert isinstance(exc, StarletteHTTPException)
    if exc.status_code == 400 and _is_intent(request):
        print(
            f"bookvie: unparseable body on {request.method} {request.url.path}: {exc.detail}",
            file=sys.stderr,
            flush=True,
        )
        return await _intent_error(request, malformed_intent())
    return await http_exception_handler(request, exc)


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
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unexpected_error)
    app.openapi = _openapi_with_extras(app)  # type: ignore[method-assign]
