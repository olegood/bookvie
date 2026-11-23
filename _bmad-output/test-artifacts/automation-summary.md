---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-23'
storyId: '13.6'
storyKey: '13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md (I/O matrix, Design Notes, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md (Green-phase follow-ups, Implementation checklist)
  - _bmad/tea/config.yaml
  - backend/bookvie/views/backup.py, backend/bookvie/views/models.py, backend/bookvie/store/local_state.py
  - frontend/src/lib/dropboxBackupLine.ts, frontend/src/pages/BackupPage.tsx
  - backend/tests/test_dropbox_backup_line.py, test_agent_backup_upload.py, test_agent_backup.py, agent_client.py, conftest.py (connect_mcp)
  - frontend/src/lib/dropboxBackupLine.test.ts, frontend/e2e/dropbox-backup-line.spec.ts, frontend/e2e/backup.spec.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.6 See on the Backup page how the last Dropbox backup went

## Preflight

- **Stack:** `fullstack` (auto). The targets are pytest (API) and `node --test` (unit). No e2e leaf was added, so no browser session was opened and the Playwright fragments weren't loaded.
- **Where:** this worktree's branch (`hogback-creosote`). The story is `done` at `3483351`, the review commit.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's follow-ups, the spec's I/O matrix, and the code review's rejected test-gap notes.
- **Generation:** sequential, in this session.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off in `_bmad/tea/config.yaml`, and there is no Pact artifact.

## Coverage plan

The ATDD leaves and the build's added leaves already cover every I/O matrix row. They seed the stored `autoBackup` group by hand, though, and nothing tied the real writer to the reader. The only place the real `record_backup_upload` fed the view was e2e AC-4, and that covered an upload only.

| AC | Priority | Level | Leaf |
|---|---|---|---|
| AC-1 | P1 | API | `test_what_record_backup_upload_stores_is_what_the_line_shows`: through the shipped MCP tools, export the day's backup, then record an upload (2 copies), a skip, and a failure for each of the five causes. After each one, `views/backup`'s `dropboxBackup` is the exact body: `lastUploadAt` is the zip's own time, not the report's; a skip keeps it; each failure carries its cause and the upload before it. |
| AC-1 | P1 | API | `test_a_failure_recorded_before_any_upload_shows_no_last_upload`: a failure recorded by the tool on a fresh library reads `failed`, with its cause and null `lastUploadAt` and `copies` (I/O "Failure, never uploaded"). |
| AC-1 | P2 | API | `test_only_a_failure_carries_a_cause_and_a_utc_time_reads_as_the_same_instant`: a stray stored `cause` on an upload or a skip reads `cause: null` (the spec's "cause is set only when failed"), and a `Z` time reads as the same instant as `+01:00`. |
| AC-2 | P2 | Unit | Whole lines whose parts each take their own "when": a skip with "1 copy" and a last upload "on 19 Nov 2025"; an upload in another year; a failure later the same day with " Last upload today at 09:02.". |
| AC-2 | P2 | Unit | `dropboxWhen` across a new year, from 2 Jan 2026: 1 Jan is "yesterday", and 31 Dec and 30 Dec are "on 31 Dec 2025" and "on 30 Dec 2025". |

**Not added (duplicate coverage):** e2e for these combinations. The page renders `dropboxBackupLine`'s string as is (`BackupPage.tsx:178`), and e2e AC-2 already pins the rendering for every state. A bad `copies` on an upload or a skip goes through `_last_upload`, the same function the failure-path leaves cover, and the leaves at `test_dropbox_backup_line.py:167` already read `copies: 0` and `copies: true` on an upload as `none`.

## Files

- **Created:** `backend/tests/test_dropbox_backup_line_follow_ups.py` (3 leaves). It reuses `_connect`, `_uploaded`, `NOW`, `STEP` and `TODAY_BACKUP` from `test_agent_backup_upload.py`, `_when` from `test_agent_backup.py`, and `UPLOAD_GROUP`, `_store` and `_dropbox_backup` from `test_dropbox_backup_line.py`. The only helpers it adds are two private ones, `_line` and `_record`.
- **Updated:** `frontend/src/lib/dropboxBackupLine.test.ts` gets 2 `it`s, one of them in a new `describe`.
- **Updated:** the ATDD checklist. Every follow-up and implementation line is ticked with its evidence, and the forced-colors line is retired. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Each new leaf can fail.** Each code edit below was made by hand, run, and then reverted:

  | Hand edit | Result |
  |---|---|
  | `_last_upload` reads `lastUpload.at` instead of `backupAt` | 1 of the 3 new API leaves failed |
  | An upload or a skip keeps a stored cause | 1 of the 3 new API leaves failed |
  | `dropboxWhen` drops the year for a date fewer than 3 days back | the new-year unit leaf failed |
  | " Last upload" is worded from `reportAt` | 2 unit leaves failed, the new one included |

  `git status` showed only the test files changed afterwards.
- **Time zones:** the unit file passes under `TZ` Europe/Madrid, UTC, America/Los_Angeles and Pacific/Kiritimati (6 of 6 each).
- **Suite:** `npm run check:py` gives 2430 passed (3 more than the review's run) with every coverage gate OK. `npm run check:api` exits 0 with 395 node tests (2 more), and Prettier, `tsc -b` and oxlint are clean. `check:e2e` wasn't re-run, because no e2e file or source file changed. The review's full `npm run check` after `3483351` had e2e at 803 passed.
- **Quality checklist:** no hard waits or conditionals; every assert compares exact values; the leaves are parallel-safe (`tmp_path`, own app per test); one subject per leaf; no skips or focus.
- **No browser sessions** were opened, and no temp files are left in the repo.

## Assumptions and risks

- The contract leaves record through the MCP tools on an in-process app with a `SetClock`, as Story 13.3's tests do. The e2e AC-4 leaf remains the one run against a real server.
- Spine drift for AD-22 stays open in `deferred-work.md` until the Epic 13 reconciliation. No test depends on it.

## Next

Story 13.7 (`13-7-fetch-a-backup-from-my-dropbox`) is next in Epic 13, starting with `bmad-testarch-atdd`. Epic 13 isn't closed: 13.7 and 13.8 are in backlog.
