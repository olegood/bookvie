"""The AD-9 response envelope and error codes.

Success is ``{ok: true, ids?, reachedLastPage?}``. Every ``/api`` failure is
``{error: {kind, code, message, fields?}}``. The server owns all message copy.
Intents raise :class:`IntentError`; ``http`` turns it into a JSON response.

Each later story adds its own refusal code here, with its API test.
"""

from collections.abc import Iterable, Mapping
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

COULDNT_SAVE_MESSAGE = "Couldn't save. Your data wasn't changed."


class _Wire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ErrorKind(StrEnum):
    REFUSAL = "refusal"
    COULDNT_SAVE = "couldnt_save"


class ErrorCode(StrEnum):
    INVALID_FIELDS = "invalid_fields"
    COULDNT_SAVE = "couldnt_save"


class FieldError(_Wire):
    field: str
    """The camelCase path of the field, e.g. ``authors.0``."""
    message: str


class ErrorBody(_Wire):
    kind: ErrorKind
    code: ErrorCode
    message: str
    fields: list[FieldError] | None = None


class ErrorResponse(_Wire):
    error: ErrorBody


class OkResponse(_Wire):
    ok: Literal[True]
    ids: dict[str, str] | None = None
    """The ids the intent minted, by name, e.g. ``{"bookId": "<uuid>"}``."""
    reached_last_page: bool | None = None


class IntentError(Exception):
    """An intent's failure, with the HTTP status and envelope body to return."""

    def __init__(self, status: int, body: ErrorBody) -> None:
        super().__init__(f"{status} {body.code}: {body.message}")
        self.status = status
        self.body = body

    def response_body(self) -> dict:
        return ErrorResponse(error=self.body).model_dump(
            mode="json", by_alias=True, exclude_none=True
        )


def invalid_fields(
    errors: Iterable[FieldError], labels: Mapping[str, str] | None = None
) -> IntentError:
    """422 ``invalid_fields`` naming every failing field, in order.

    The top-level message names each field by its form label when ``labels``
    has one ("Not saved. 2 fields need attention: Pages, Language."), else by
    its key.
    """
    errors = list(errors)
    labels = labels or {}
    keys = dict.fromkeys(error.field for error in errors)
    names = [labels.get(key, key) for key in keys]
    count = len(names)
    noun = "field needs" if count == 1 else "fields need"
    message = f"Not saved. {count} {noun} attention: {', '.join(names)}."
    return IntentError(
        422,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.INVALID_FIELDS,
            message=message,
            fields=errors,
        ),
    )


def couldnt_save(status: int) -> IntentError:
    """500 or 503 ``couldnt_save``: nothing was committed."""
    return IntentError(
        status,
        ErrorBody(
            kind=ErrorKind.COULDNT_SAVE,
            code=ErrorCode.COULDNT_SAVE,
            message=COULDNT_SAVE_MESSAGE,
        ),
    )
