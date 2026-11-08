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
    already_main,
    book_not_found,
    couldnt_export,
    couldnt_save,
    cover_too_large,
    duplicate_book,
    invalid_fields,
    not_main_book,
    pages_refusal,
    reading_already_finished,
    restore_invalid,
    restore_newer_version,
    restore_unsafe,
)
from .cover import PreparedCover, RefusedCover, UploadedCover, prepare_cover
from .delete_book import DeleteBookIntent, delete_book, parse_delete_book_intent
from .edit_book import EditBookIntent, edit_book, parse_edit_book_intent
from .edit_purpose import EditPurposeIntent, edit_purpose, parse_edit_purpose_intent
from .export import EXPORT_CHUNK, build_export, export_filename, record_export
from .finish_reading import (
    FinishReadingIntent,
    finish_reading,
    parse_finish_reading_intent,
)
from .intent_model import malformed as malformed_intent
from .pause import PauseIntent, parse_pause_intent, pause
from .restore import RestoreIntent, max_upload_bytes, parse_restore_intent, restore
from .set_spine_color import (
    SetSpineColorIntent,
    parse_set_spine_color_intent,
    set_spine_color,
)
from .start_reading import StartReadingIntent, parse_start_reading_intent, start_reading
from .update_page import UpdatePageIntent, parse_update_page_intent, update_page

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
    "EditPurposeIntent",
    "ErrorBody",
    "ErrorCode",
    "ErrorKind",
    "ErrorResponse",
    "FakeClock",
    "FieldError",
    "FinishReadingIntent",
    "IntentError",
    "OkResponse",
    "PauseIntent",
    "PreparedCover",
    "RefusedCover",
    "RestoreIntent",
    "SetSpineColorIntent",
    "StartReadingIntent",
    "SystemClock",
    "UpdatePageIntent",
    "UploadedCover",
    "add_book",
    "already_main",
    "book_not_found",
    "build_export",
    "commit",
    "couldnt_export",
    "couldnt_save",
    "cover_too_large",
    "delete_book",
    "duplicate_book",
    "edit_book",
    "edit_purpose",
    "export_filename",
    "finish_reading",
    "invalid_fields",
    "malformed_intent",
    "max_upload_bytes",
    "not_main_book",
    "pages_refusal",
    "parse_add_book_intent",
    "parse_delete_book_intent",
    "parse_edit_book_intent",
    "parse_edit_purpose_intent",
    "parse_finish_reading_intent",
    "parse_pause_intent",
    "parse_restore_intent",
    "parse_set_spine_color_intent",
    "parse_start_reading_intent",
    "parse_update_page_intent",
    "pause",
    "prepare_cover",
    "reading_already_finished",
    "record_export",
    "restore",
    "restore_invalid",
    "restore_newer_version",
    "restore_unsafe",
    "set_spine_color",
    "start_reading",
    "update_page",
]
