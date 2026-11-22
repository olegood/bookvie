"""views layer."""

from .app_info import AppInfoView, app_info
from .backup import backup
from .card_notes import card_notes, require_card_notes
from .find_book import find_book
from .models import (
    AutoBackupView,
    BackupView,
    BookCandidate,
    BookCardNote,
    BookDetailView,
    BookEditForm,
    BookReading,
    CardNotesGroup,
    CardNotesScope,
    CardNotesView,
    CatalogView,
    CurrentReading,
    FindBookView,
    HomeMainBook,
    HomeView,
    LibraryMeter,
    ShelfBook,
    StatsBucket,
    StatsView,
)
from .shelf import book_detail, catalog, cover_path, home, home_for, require_book_detail
from .stats import IsoDate, check_stats_range, stats

__all__ = [
    "AppInfoView",
    "AutoBackupView",
    "BackupView",
    "BookCandidate",
    "BookCardNote",
    "BookDetailView",
    "BookEditForm",
    "BookReading",
    "CardNotesGroup",
    "CardNotesScope",
    "CardNotesView",
    "CatalogView",
    "CurrentReading",
    "FindBookView",
    "HomeMainBook",
    "HomeView",
    "IsoDate",
    "LibraryMeter",
    "ShelfBook",
    "StatsBucket",
    "StatsView",
    "app_info",
    "backup",
    "book_detail",
    "card_notes",
    "catalog",
    "check_stats_range",
    "cover_path",
    "find_book",
    "home",
    "home_for",
    "require_book_detail",
    "require_card_notes",
    "stats",
]
