"""intents layer."""

from bookvie.domain import Clock, FakeClock, SystemClock

from .add_book import AddBookIntent, add_book, parse_add_book_intent
from .commit import commit
from .contract import (
    COULDNT_EXPORT_MESSAGE,
    COULDNT_SAVE_MESSAGE,
    COVER_LIMIT,
    RESTORE_INVALID_MESSAGE,
    RESTORE_NEWER_VERSION_MESSAGE,
    DuplicateMatch,
    ErrorBody,
    ErrorCode,
    ErrorKind,
    ErrorResponse,
    FieldError,
    IntentError,
    OkResponse,
    book_not_found,
    couldnt_export,
    couldnt_save,
    cover_too_large,
    duplicate_book,
    invalid_fields,
    pages_refusal,
    restore_invalid,
    restore_newer_version,
    restore_unsafe,
)
from .cover import PreparedCover, RefusedCover, UploadedCover, prepare_cover
from .delete_book import DeleteBookIntent, delete_book, parse_delete_book_intent
from .edit_book import EditBookIntent, edit_book, parse_edit_book_intent
from .export import EXPORT_CHUNK, build_export, export_filename, record_export
from .intent_model import malformed as malformed_intent
from .restore import RestoreIntent, max_upload_bytes, parse_restore_intent, restore
from .set_spine_color import (
    SetSpineColorIntent,
    parse_set_spine_color_intent,
    set_spine_color,
)

__all__ = [
    "COULDNT_EXPORT_MESSAGE",
    "COULDNT_SAVE_MESSAGE",
    "COVER_LIMIT",
    "EXPORT_CHUNK",
    "RESTORE_INVALID_MESSAGE",
    "RESTORE_NEWER_VERSION_MESSAGE",
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
    "RestoreIntent",
    "SetSpineColorIntent",
    "SystemClock",
    "UploadedCover",
    "add_book",
    "book_not_found",
    "build_export",
    "commit",
    "couldnt_export",
    "couldnt_save",
    "cover_too_large",
    "delete_book",
    "duplicate_book",
    "edit_book",
    "export_filename",
    "invalid_fields",
    "malformed_intent",
    "max_upload_bytes",
    "pages_refusal",
    "parse_add_book_intent",
    "parse_delete_book_intent",
    "parse_edit_book_intent",
    "parse_restore_intent",
    "parse_set_spine_color_intent",
    "prepare_cover",
    "record_export",
    "restore",
    "restore_invalid",
    "restore_newer_version",
    "restore_unsafe",
    "set_spine_color",
]
