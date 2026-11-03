"""The ``backup`` view: "Last export", read from ``local-state.json`` (AD-15)."""

from bookvie.store import Store, read_last_export

from .models import BackupView


def backup(store: Store) -> BackupView:
    """When the last export finished; ``None`` when none did or the record is unreadable."""
    return BackupView(last_export_at=read_last_export(store.data_dir))
