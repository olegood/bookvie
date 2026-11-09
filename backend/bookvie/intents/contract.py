"""The AD-9 response envelope and error codes.

Success is ``{ok: true, ids?, reachedLastPage?}``. Every ``/api`` failure is
``{error: {kind, code, message, fields?, duplicates?}}``. The server owns all
message copy.
Intents raise :class:`IntentError`; ``http`` turns it into a JSON response.

Each later story adds its own refusal code here, with its API test.
"""

from collections.abc import Iterable, Mapping
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain.labels import COVER_TOO_LARGE_MESSAGE, LABELS

COULDNT_SAVE_MESSAGE = "Couldn't save. Your data wasn't changed."
COULDNT_EXPORT_MESSAGE = "Couldn't export. Your data wasn't changed."
RESTORE_INVALID_MESSAGE = "This file isn't a bookvie export, or it's damaged. Nothing was changed."
RESTORE_NEWER_VERSION_MESSAGE = (
    "This export is from a newer version of bookvie. Nothing was changed."
)


class _Wire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ErrorKind(StrEnum):
    REFUSAL = "refusal"
    COULDNT_SAVE = "couldnt_save"
    COULDNT_EXPORT = "couldnt_export"


class ErrorCode(StrEnum):
    INVALID_FIELDS = "invalid_fields"
    COULDNT_SAVE = "couldnt_save"
    DUPLICATE_BOOK = "duplicate_book"
    BOOK_NOT_FOUND = "book_not_found"
    PAGES_BELOW_CURRENT_PAGE = "pages_below_current_page"
    PAGES_BELOW_CARD_NOTE = "pages_below_card_note"
    COVER_TOO_LARGE = "cover_too_large"
    COULDNT_EXPORT = "couldnt_export"
    RESTORE_INVALID = "restore_invalid"
    RESTORE_NEWER_VERSION = "restore_newer_version"
    RESTORE_UNSAFE = "restore_unsafe"
    ALREADY_MAIN = "already_main"
    READING_ALREADY_FINISHED = "reading_already_finished"
    NOT_MAIN_BOOK = "not_main_book"
    MAIN_CANNOT_BE_UP_NEXT = "main_cannot_be_up_next"
    MAIN_CANNOT_BE_SIDE_READ = "main_cannot_be_side_read"
    SIDE_READS_FULL = "side_reads_full"


class FieldError(_Wire):
    field: str
    """The camelCase path of the field, e.g. ``authors.0``."""
    message: str


class DuplicateMatch(_Wire):
    """A Book already in the catalog that the refused intent would duplicate."""

    title: str
    authors: list[str]
    isbn: str | None
    """As stored; ``null`` on the wire when the Book has none."""


class ErrorBody(_Wire):
    kind: ErrorKind
    code: ErrorCode
    message: str
    fields: list[FieldError] | None = None
    duplicates: list[DuplicateMatch] | None = None
    """``duplicate_book`` only: every matching Book, in catalog order."""


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
        body = ErrorResponse(error=self.body).model_dump(
            mode="json", by_alias=True, exclude_none=True
        )
        if self.body.duplicates is not None:
            # exclude_none would drop a match's ``isbn: null``; keep it on the wire.
            body["error"]["duplicates"] = [
                match.model_dump(mode="json", by_alias=True) for match in self.body.duplicates
            ]
        return body


def fields_summary(errors: Iterable[FieldError], labels: Mapping[str, str] | None = None) -> str:
    """ "Not saved. 2 fields need attention: Pages, Language."

    Each field is named by its form label when ``labels`` has one, else by its
    key; a field listed twice is named once.
    """
    labels = labels or {}
    keys = dict.fromkeys(error.field for error in errors)
    names = [labels.get(key, key) for key in keys]
    count = len(names)
    noun = "field needs" if count == 1 else "fields need"
    return f"Not saved. {count} {noun} attention: {', '.join(names)}."


def invalid_fields(
    errors: Iterable[FieldError], labels: Mapping[str, str] | None = None
) -> IntentError:
    """422 ``invalid_fields`` naming every failing field, in order (see :func:`fields_summary`)."""
    errors = list(errors)
    return IntentError(
        422,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.INVALID_FIELDS,
            message=fields_summary(errors, labels),
            fields=errors,
        ),
    )


PAGES_FIELD = "pages"


def pages_refusal(code: ErrorCode, message: str) -> IntentError:
    """409 refusing the Pages value (a Pages floor), with one ``pages`` field.

    The top-level message is the 422 summary ("Not saved. 1 field needs
    attention: Pages."), so the panel shows it the same way.
    """
    errors = [FieldError(field=PAGES_FIELD, message=message)]
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=code,
            message=fields_summary(errors, {PAGES_FIELD: LABELS[PAGES_FIELD]}),
            fields=errors,
        ),
    )


COVER_FIELD = "cover"
COVER_LIMIT = 20 * 1024 * 1024
"""The largest cover upload, in bytes: 20 MB (AD-12)."""


def cover_too_large() -> IntentError:
    """413 ``cover_too_large``, with one ``cover`` field, like a field refusal."""
    errors = [FieldError(field=COVER_FIELD, message=COVER_TOO_LARGE_MESSAGE)]
    return IntentError(
        413,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.COVER_TOO_LARGE,
            message=fields_summary(errors, {COVER_FIELD: LABELS[COVER_FIELD]}),
            fields=errors,
        ),
    )


BOOK_NOT_FOUND_MESSAGE = "This book isn't in your catalog anymore."


def book_not_found(status: int = 409) -> IntentError:
    """``book_not_found``: 409 from an intent, 404 from a view."""
    return IntentError(
        status,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.BOOK_NOT_FOUND,
            message=BOOK_NOT_FOUND_MESSAGE,
        ),
    )


ALREADY_MAIN_MESSAGE = "This book is already your Main book."


def already_main() -> IntentError:
    """409 ``already_main``: ``start-reading`` for the Main book (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.ALREADY_MAIN,
            message=ALREADY_MAIN_MESSAGE,
        ),
    )


NOT_MAIN_BOOK_MESSAGE = "This book isn't your Main book anymore."


def not_main_book() -> IntentError:
    """409 ``not_main_book``: ``update-page`` or ``pause`` for a Book that isn't Main, e.g. a stale tab (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.NOT_MAIN_BOOK,
            message=NOT_MAIN_BOOK_MESSAGE,
        ),
    )


MAIN_CANNOT_BE_UP_NEXT_MESSAGE = "Your Main book can't be Up next."


def main_cannot_be_up_next() -> IntentError:
    """409 ``main_cannot_be_up_next``: ``set-up-next`` for the Main book, e.g. a stale tab (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.MAIN_CANNOT_BE_UP_NEXT,
            message=MAIN_CANNOT_BE_UP_NEXT_MESSAGE,
        ),
    )


MAIN_CANNOT_BE_SIDE_READ_MESSAGE = "Your Main book can't be a Side read."


def main_cannot_be_side_read() -> IntentError:
    """409 ``main_cannot_be_side_read``: ``mark-side-read`` for the Main book, e.g. a stale tab (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.MAIN_CANNOT_BE_SIDE_READ,
            message=MAIN_CANNOT_BE_SIDE_READ_MESSAGE,
        ),
    )


SIDE_READS_FULL_MESSAGE = "You already have 3 side reads. Remove one first."


def side_reads_full() -> IntentError:
    """409 ``side_reads_full``: ``mark-side-read`` with 3 Side reads already (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.SIDE_READS_FULL,
            message=SIDE_READS_FULL_MESSAGE,
        ),
    )


READING_ALREADY_FINISHED_MESSAGE = "This reading is already finished."


def reading_already_finished() -> IntentError:
    """409 ``reading_already_finished``: the Book has no unfinished Reading to change (AD-9)."""
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.READING_ALREADY_FINISHED,
            message=READING_ALREADY_FINISHED_MESSAGE,
        ),
    )


DUPLICATE_NAMED_LIMIT = 3


def _named(match: DuplicateMatch) -> str:
    return f"{match.title} by {'; '.join(match.authors)}"


def duplicate_message(matches: list[DuplicateMatch]) -> str:
    """The refusal copy, naming up to three matches.

    "Possible duplicate: A by X, B by Y and C by Z are already in your
    catalog, and N more."
    """
    names = [_named(match) for match in matches[:DUPLICATE_NAMED_LIMIT]]
    more = len(matches) - len(names)
    if len(names) == 1:
        listed, verb = names[0], "is"
    else:
        listed, verb = f"{', '.join(names[:-1])} and {names[-1]}", "are"
    tail = f", and {more} more." if more else "."
    return f"Possible duplicate: {listed} {verb} already in your catalog{tail}"


def duplicate_book(matches: Iterable[DuplicateMatch]) -> IntentError:
    """409 ``duplicate_book`` listing every matching Book (AD-10)."""
    matches = list(matches)
    return IntentError(
        409,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.DUPLICATE_BOOK,
            message=duplicate_message(matches),
            duplicates=matches,
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


def couldnt_export() -> IntentError:
    """503 ``couldnt_export``: the export couldn't be built; nothing was sent or changed."""
    return IntentError(
        503,
        ErrorBody(
            kind=ErrorKind.COULDNT_EXPORT,
            code=ErrorCode.COULDNT_EXPORT,
            message=COULDNT_EXPORT_MESSAGE,
        ),
    )


def restore_invalid() -> IntentError:
    """422 ``restore_invalid``: the file isn't a usable export; nothing was changed."""
    return IntentError(
        422,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.RESTORE_INVALID,
            message=RESTORE_INVALID_MESSAGE,
        ),
    )


def restore_newer_version() -> IntentError:
    """422 ``restore_newer_version``: the export is from a newer bookvie; nothing was changed."""
    return IntentError(
        422,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.RESTORE_NEWER_VERSION,
            message=RESTORE_NEWER_VERSION_MESSAGE,
        ),
    )


def restore_unsafe() -> IntentError:
    """422 ``restore_unsafe``: the file breaks a path or size rule (AD-14); nothing was changed.

    The user sees ``restore_invalid``'s copy (AD-9).
    """
    return IntentError(
        422,
        ErrorBody(
            kind=ErrorKind.REFUSAL,
            code=ErrorCode.RESTORE_UNSAFE,
            message=RESTORE_INVALID_MESSAGE,
        ),
    )
