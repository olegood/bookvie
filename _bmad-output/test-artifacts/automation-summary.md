---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-23'
storyId: '13.5'
storyKey: '13-5-take-out-the-morning-job'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-13-5-take-out-the-morning-job.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - docs/dropbox-backup.md (Uninstalling)
  - backend/bookvie/views/backup.py, backend/bookvie/views/models.py, backend/bookvie/intents/backup_file.py (`record_backup_upload`)
  - backend/tests/test_morning_job_removed.py, test_views.py, test_dropbox_backup_guide.py, test_agent_backup_upload.py, helpers.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.5 Take out the morning job

## Preflight

- **Stack:** `fullstack` (auto). This is a removal story with no UI change: the frontend never read `autoBackup`. Every target is pytest. No browser session was opened, and the Playwright fragments weren't loaded.
- **Where:** this worktree's branch (`hogback-creosote`). The story is `done` at `f1ef6b9`, the review commit.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 3 open follow-ups, the spec's I/O matrix, and the build review's two patches.
- **Generation:** sequential, in this session.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

The 5 ATDD leaves already cover each AC's primary branch, and the existing view, export and upload tests cover the rest of the I/O matrix. Two edges were left unpinned:

| AC | Priority | Level | Leaf |
|---|---|---|---|
| AC-2, I/O "Upload state" | P1 | API | With `local-state.json` holding `lastExportAt` and an upload group written by the real `record_backup_upload` (a skip, then a failure), `GET /api/views/backup` is exactly `{"lastExportAt": …}`, and the read leaves the file's bytes unchanged. Before this, every view test had a `local-state.json` with no upload group. |
| AC-4 | P2 | Docs | Uninstalling's old-job commands come first and in order: unload, then `rm -f` the plist, then `rm -r` the logs. The note is conditional ("If this Mac had the old daily job installed"), and the "that's fine" sentence follows the block. This pins the build review's patch. |

Scope: selective. Both are secondary branches. Other checks were not added: the CLI's usage error, the source scans and the schema are already pinned by the ATDD leaves.

## Files

- `backend/tests/test_morning_job_removed_follow_ups.py` (new): the 2 leaves above, each with a `# [Pn] AC-n` tag. They import `BOOTOUT`, `OLD_PLIST` and `OLD_LOGS` from `test_morning_job_removed.py`, so this file never spells the removed words, and AC-5's scan of the tests stays green without another exclusion.
- `_bmad-output/test-artifacts/atdd-checklist-13-5-take-out-the-morning-job.md`: 3 follow-ups ticked.

No product, skill or docs file changed.

## Validation

- `uv run ruff format` and `ruff check` were clean on the new module.
- The related set (the new module, `test_morning_job_removed.py`, `test_agent_backup_upload*.py`, `test_export.py`, `test_dropbox_backup_guide.py`, `test_views.py`, `test_backup_skill.py`): **112 passed**.
- **Mutation probes:** each one edited a file with `sed`, ran the new module, then reverted the same edit with the inverse `sed`. No git command was used. **2 of 2 killed**, each by the leaf it targets:
  - `rm -f` changed to `rm` for the plist in `docs/dropbox-backup.md`;
  - an `auto_backup` field added to `BackupView` in `views/models.py`.
- `git status` after the probes showed only the new test file.
- `npm run check`, first run: `check:py` failed (exit 1), which stopped `check:e2e`. That run's pytest output wasn't kept, so the failing test is unknown. A re-run of `check:py` alone gave 2422 passed, with the coverage gate ok. The cause may be the known `bookvie-dropbox auth` port flake (13.4's run hit it), but this run didn't confirm that.
- `npm run check`, second run on the final tree (before this Markdown): **exit 0**. check:api passed, check:py passed (2422), check:e2e gave 800 passed, and check:smoke passed.

## ATDD checklist

3 of 3 follow-ups ticked. Each cites this run's evidence. `grep -cF '[ ]'` = **0**.

## Risks and assumptions

- The guide leaf pins the three cleanup command lines exactly. That is deliberate, but rewording the block means updating the leaf.
- The unexplained `check:py` failure in the first full run. If it recurs, it should be logged together with the port flake in `deferred-work.md`.

## Next

- Commit this run (`test:`, story 13.5).
- Story 13.6 (`see-on-the-backup-page-how-the-last-dropbox-backup-went`): ATDD, `bmad-build-auto`, then `bmad-code-review` in a new session. The deferred EXPERIENCE.md casing entry is addressed to it.
