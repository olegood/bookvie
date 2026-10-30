"""The ``/api`` contract: views, the error envelope and its handlers (AD-9).

Every ``/api`` error body is ``{error: {kind, code, message, fields?}}``:
:class:`IntentError` from an intent, 422 ``invalid_fields`` for a request
that fails validation, and 500 ``couldnt_save`` for anything unexpected.
FastAPI's ``{detail}`` shape never reaches the browser from a route here.
Unknown ``/api`` paths are not enveloped: a GET or HEAD 404s through the SPA
route, and any other method gets Starlette's 405 ``{detail}``.

``http`` may not import ``store`` or ``domain``: the store on
``app.state.store`` is duck-typed and only its ``library`` is read.
"""

import sys
from typing import Any

from fastapi import APIRouter, FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse

from bookvie import views
from bookvie.intents import (
    ErrorResponse,
    FieldError,
    IntentError,
    OkResponse,
    couldnt_save,
    invalid_fields,
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

# Contract models no route returns yet; they are still part of the schema.
EXTRA_SCHEMAS = (OkResponse,)

router = APIRouter(prefix="/api", responses=ERROR_RESPONSES)


@router.get("/views/home", response_model=views.HomeView)
def home_view(request: Request) -> views.HomeView:
    return views.home(request.app.state.store.library)


@router.get("/views/catalog", response_model=views.CatalogView)
def catalog_view(request: Request) -> views.CatalogView:
    return views.catalog(request.app.state.store.library)


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
