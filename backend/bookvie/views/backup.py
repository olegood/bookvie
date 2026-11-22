"""The ``backup`` view: "Last export", read from ``local-state.json`` (AD-15), and
whether the daily backup job is installed (Story 13.5)."""

from bookvie.store import Store, read_last_export

from .models import AutoBackupView, BackupView


def backup(store: Store, *, auto_backup_installed: bool = False) -> BackupView:
    """When the last export finished; ``None`` when none did or the record is unreadable."""
    return BackupView(
        last_export_at=read_last_export(store.data_dir),
        auto_backup=AutoBackupView(installed=auto_backup_installed),
    )
