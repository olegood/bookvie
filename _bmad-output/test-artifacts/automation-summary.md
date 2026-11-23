---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-23'
storyId: '13.7'
storyKey: '13-7-fetch-a-backup-from-my-dropbox'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-7-fetch-a-backup-from-my-dropbox.md (I/O matrix, Design Notes, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-13-7-fetch-a-backup-from-my-dropbox.md (Green-phase follow-ups, Implementation checklist)
  - _bmad/tea/config.yaml
  - backend/bookvie_dropbox/download.py, server.py, contracts.py
  - backend/bookvie/intents/backup_file.py (_candidates, _locate_backup)
  - backend/tests/test_dropbox_download.py, test_dropbox_download_edges.py, test_dropbox_upload.py (seed_three_older, Connect), dropbox_fakes.py, helpers.py, restore_scene.py, conftest.py (_isolated_home, connect_mcp)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.7 Fetch a backup from my Dropbox

## Preflight

- **Stack:** `fullstack` (auto). This story is backend only: two tools on the `bookvie-dropbox` stdio server. Every target is a pytest leaf, so no browser session was opened and the Playwright fragments weren't loaded.
- **Where:** this worktree's branch (`hogback-creosote`). The story is `done` at `0e1281a`, the review commit.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's green-phase follow-ups, the spec's I/O matrix and Design Notes, and the code review's rejected test-gap notes.
- **Generation:** sequential, in this session. There are 5 leaves (8 cases) in one file, all reusing the story's own helpers.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

The ATDD leaves, the build's edge leaves and the review's added leaf already cover every I/O matrix row at least once. What was left were the checklist's follow-ups that nothing pinned yet.

| Source | Priority | Level | Leaf (`backend/tests/test_dropbox_download_follow_ups.py`) |
|---|---|---|---|
| Matrix "List", follow-up "order" | P1 | API | `:39` `test_list_backups_orders_by_upload_time_when_the_names_disagree`: with 13.2's `seed_three_older` (17 Nov uploaded last), the order is 17, 19, 18 Nov. The times run newest first, and the first is 19 Nov 23:00 UTC. |
| Design Notes "ties" | P2 | API | `:55` `test_list_backups_breaks_a_tie_in_upload_time_by_name_newest_first`: three dailies with the same `client_modified` list 20, 19, 18 Nov. |
| Follow-up "large download" | P2 | API + file | `:67` `test_a_download_larger_than_one_hash_block_is_verified_and_lands_whole`: 8 MiB plus a partial block, streamed in 1 MiB pieces, lands byte for byte, with the listed size and hash. |
| Follow-up "symlinked backups folder", AC-6 | P2 | Integration (both servers) | `:87` `test_a_download_into_a_symlinked_backups_folder_is_the_path_bookvie_lists_and_previews`: `~/bookvie-backups` is a symlink. The answered path is the resolved one, bookvie's `list_local_backups` lists exactly that path as `from_dropbox`, and `preview_restore` accepts it. |
| Matrix "List fails", "Sign-in", "Other"; follow-ups "list failure writes nothing", "signin message" | P1 | API + file | `:151` `test_a_failed_listing_or_download_writes_no_file` (4 cases): a list sign-in failure, a broken listing, a download sign-in failure and a name Dropbox doesn't hold each answer their cause, change no file under `HOME` and leave every response closed. Only the sign-in cases name `bookvie-dropbox auth`. |

**Not added:**
- **Mid-stream `RateLimitError` or `OSError`.** The cleanup is the same `finally` that AC-5's `broken_transfer` exercises mid-stream, and the per-exception cause mapping is what `test_dropbox_download_edges.py:118` pins. The code review rejected the same gap.
- **A token in a message or log.** `download.py` never reads a token. It is retired in the checklist, with Story 13.2's `no_token_in_the_keychain` as the owner.
- **`files_download_to_file`.** The build doesn't use it, so this is retired as moot.

## Files

- **Created:** `backend/tests/test_dropbox_download_follow_ups.py` (5 leaves, 8 cases). It reuses `dropbox_call` and `same_path` from `test_dropbox_download.py`; `Connect`, `daily` and `seed_three_older` from `test_dropbox_upload.py`; and `files_under`, `backup_zip`, `SetClock`, `write_library`, `BACKUP_AT` and `NOW`. It adds only a private `_names`, a `BLOCK` constant and a `_ListingRefused` fake.
- **Updated:** the ATDD checklist. All 6 implementation lines and 8 follow-ups are ticked with their evidence, and 2 follow-ups are retired. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Each new leaf can fail.** Each source edit below was made by hand, run against the new file, and then reverted:

  | Hand edit | Result |
  |---|---|
  | `list_backups` sorts by the name alone | 1 of 8 failed (order) |
  | `list_backups` sorts by `client_modified` alone, with no name tie-break | 1 of 8 failed (tie) |
  | `contracts.DROPBOX_BLOCK` set to 8 MiB | 1 of 8 failed (large download) |
  | `download_backup` returns the unresolved `landing / name` | 1 of 8 failed (symlinked folder) |
  | The `dropbox_signin` message drops "Run `bookvie-dropbox auth` …" | 2 of 8 failed (`list_signin`, `download_signin`) |

  `git status` showed only the new test file and the checklist changed afterwards.
- **Suite:** `npm run check:py` gives 2453 passed (8 more than the review's 2445), ruff is clean, and every coverage gate is OK (`bookvie_dropbox` 95.39%). `check:api` and `check:e2e` weren't re-run, because no frontend or source file changed. The review's full `npm run check` after its patch had unit at 395 passed and e2e at 803 passed.
- **Quality checklist:**
  - No hard waits or conditionals.
  - Every assert compares exact values.
  - The leaves are parallel-safe: each test has its own `HOME` and `tmp_path` and an in-process server.
  - One subject per leaf.
  - No skips or focus.
- **No browser sessions** were opened, and no temp files are left in the repo.

## Assumptions and risks

- Everything runs against `FakeDropbox` (AR46: no test touches the network). The first real download is Story 13.8's manual restore.
- The failure leaf allows an empty `from-dropbox/` (or `~/bookvie-backups-dev/`) folder after a failed download, because the spec's check order creates the folder before the download. AD-1's side of that stays deferred as spine drift until the Epic 13 reconciliation.

## Next

Story 13.8 (`13-8-restore-with-one-skill-from-this-computer-or-dropbox`) is next, and it is Epic 13's last story. It starts with `bmad-testarch-atdd`. After 13.8 is `done` and automated, the Epic 13 retrospective, trace and gate, and spine reconciliation come before Epic 14.
