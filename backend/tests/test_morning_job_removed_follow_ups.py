"""Story 13.5 follow-ups (bmad-testarch-automate): edges the ATDD leaves don't pin.

- The Backup view, now ``lastExportAt`` only, leaves out the stored upload group
  that ``record_backup_upload`` keeps writing, and reading the view changes nothing
  on disk (the spec's I/O matrix, "Upload state").
- The guide's cleanup for a Mac that had the old job: it unloads the job before
  deleting its file, and its delete of the file is safe when the file is already
  gone (the build review's patch).

The removed job's words are imported from ``test_morning_job_removed`` so that this
module stays out of that module's scan of the tests (AC-5).
"""

from pathlib import Path

from bookvie.domain.clock import FakeClock
from bookvie.intents import record_backup_upload
from tests.helpers import TODAY, api_client
from tests.test_dropbox_backup_guide import GUIDE, section, shell_lines
from tests.test_morning_job_removed import BOOTOUT, OLD_LOGS, OLD_PLIST

LAST_EXPORT = "2026-10-01T09:30:00+02:00"


def test_the_backup_view_leaves_out_the_stored_upload_group_and_reading_it_changes_nothing(
    tmp_path: Path,
) -> None:
    # [P1] AC-2, I/O matrix "Upload state"
    client = api_client(tmp_path, raise_server_exceptions=True)
    (tmp_path / "local-state.json").write_text(f'{{"lastExportAt": "{LAST_EXPORT}"}}')
    store = client.app.state.store
    record_backup_upload(store, FakeClock(TODAY), None, {"outcome": "skipped"})
    record_backup_upload(
        store, FakeClock(TODAY), None, {"outcome": "failed", "cause": "upload_incomplete"}
    )
    before = (tmp_path / "local-state.json").read_bytes()
    assert b'"lastReport"' in before and b'"lastOk"' in before, before

    response = client.get("/api/views/backup")

    assert response.status_code == 200
    assert response.json() == {"lastExportAt": LAST_EXPORT}
    assert (tmp_path / "local-state.json").read_bytes() == before


def test_the_old_job_cleanup_unloads_first_and_is_safe_when_already_gone() -> None:
    # [P2] AC-4, build review patch (`rm -f` and the "that's fine" sentence)
    uninstalling = section(GUIDE.read_text(encoding="utf-8"), "Uninstalling")
    commands = shell_lines(uninstalling)

    # Unload, then delete the file, then the logs, before anything else is removed.
    assert commands[:3] == [BOOTOUT, f"rm -f {OLD_PLIST}", f"rm -r {OLD_LOGS}"], commands
    # The note is only for a Mac that had the job, and says leftover errors are fine.
    flat = " ".join(uninstalling.split())
    assert "If this Mac had the old daily job installed" in flat
    after_block = flat[flat.index(f"rm -r {OLD_LOGS}") :]
    assert "that's fine" in after_block.split("```")[1], after_block
