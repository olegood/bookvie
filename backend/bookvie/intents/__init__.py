"""intents layer."""

from bookvie.domain import Clock, FakeClock, SystemClock

from .add_book import AddBookIntent, add_book, parse_add_book_intent
from .commit import commit
from .contract import (
    COULDNT_SAVE_MESSAGE,
    COVER_LIMIT,
    DuplicateMatch,
    ErrorBody,
    ErrorCode,
    ErrorKind,
    ErrorResponse,
    FieldError,
    IntentError,
    OkResponse,
    book_not_found,
    couldnt_save,
    cover_too_large,
    duplicate_book,
    invalid_fields,
    pages_refusal,
)
from .cover import PreparedCover, RefusedCover, UploadedCover, prepare_cover
from .delete_book import DeleteBookIntent, delete_book, parse_delete_book_intent
from .edit_book import EditBookIntent, edit_book, parse_edit_book_intent
from .intent_model import malformed as malformed_intent
from .set_spine_color import (
    SetSpineColorIntent,
    parse_set_spine_color_intent,
    set_spine_color,
)

__all__ = [
    "COULDNT_SAVE_MESSAGE",
    "COVER_LIMIT",
    "AddBookIntent",
    "Clock",
    "DeleteBookIntent",
    "DuplicateMatch",
    "EditBookIntent",
    "ErrorBody",
    "ErrorCode",
    "ErrorKind",
    "ErrorResponse",
    "FakeClock",
    "FieldError",
    "IntentError",
    "OkResponse",
    "PreparedCover",
    "RefusedCover",
    "SetSpineColorIntent",
    "SystemClock",
    "UploadedCover",
    "add_book",
    "book_not_found",
    "commit",
    "couldnt_save",
    "cover_too_large",
    "delete_book",
    "duplicate_book",
    "edit_book",
    "invalid_fields",
    "malformed_intent",
    "pages_refusal",
    "parse_add_book_intent",
    "parse_delete_book_intent",
    "parse_edit_book_intent",
    "parse_set_spine_color_intent",
    "prepare_cover",
    "set_spine_color",
]
