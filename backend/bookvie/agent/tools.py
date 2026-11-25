"""The agent tools (AD-21): :data:`TOOLS`, in the order ``tools/list`` lists them.

Each group lives in its own module: what every tool shares in ``tool_base``,
the read tools in ``read_tools``, the write tools in ``write_tools``, the book
tools in ``book_tools``, and the backup and restore tools in ``backup_tools``.

The destructive intents (``delete_book``,
``delete_card_note``, ``restore``, ``set_spine_color``) are never tools, and
neither is ``set_favourite``: an agent reads the star but never sets it.
"""

from .backup_tools import (
    EXPORT_BACKUP,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    RECORD_BACKUP_UPLOAD,
    RESTORE_BACKUP,
)
from .book_tools import ADD_BOOK, EDIT_BOOK
from .read_tools import (
    FIND_BOOK,
    GET_APP_INFO,
    GET_BOOK,
    GET_CARD_NOTES,
    GET_HOME,
    GET_STATS,
    LIST_CATALOG,
)
from .tool_base import AgentTool
from .write_tools import (
    ADD_CARD_NOTE,
    EDIT_CARD_NOTE,
    EDIT_PURPOSE,
    FINISH_READING,
    MARK_SIDE_READ,
    PAUSE,
    SET_UP_NEXT,
    START_READING,
    UNMARK_SIDE_READ,
    UPDATE_PAGE,
)

TOOLS: tuple[AgentTool, ...] = (
    GET_APP_INFO,
    FIND_BOOK,
    GET_BOOK,
    LIST_CATALOG,
    GET_CARD_NOTES,
    GET_HOME,
    GET_STATS,
    START_READING,
    UPDATE_PAGE,
    FINISH_READING,
    PAUSE,
    SET_UP_NEXT,
    EDIT_PURPOSE,
    ADD_CARD_NOTE,
    EDIT_CARD_NOTE,
    MARK_SIDE_READ,
    UNMARK_SIDE_READ,
    ADD_BOOK,
    EDIT_BOOK,
    EXPORT_BACKUP,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    RESTORE_BACKUP,
    RECORD_BACKUP_UPLOAD,
)
"""The tools every ``create_app`` registers unless a test passes its own."""
