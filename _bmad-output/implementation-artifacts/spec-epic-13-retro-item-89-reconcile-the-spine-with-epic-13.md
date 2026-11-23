---
title: 'Reconcile the architecture spine and the planning text with as-built Epic 13'
type: 'chore'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: '722b7e6244f787af93d2ac2b6e9cc1b1eb365dcd'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 13's stories deferred 38 "spine drift" entries to `deferred-work.md` (from `spec-13-1` … `spec-13-8`), and the spine still marks AD-22, the FR-29/FR-30 rows, Stack, Seed and the Testing row as planned. Some planning text was left stale by the 2026-11-23 sprint change and later edits (Epic 13 retro E13-SP1, E13-S2; item 89; sprint item `epic-13-retro-item-89-reconcile-the-spine-with-epic-13`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so it states what the code does, checked against the code: AD-22 and the lines around it built; the 38 entries' facts recorded (the `restore_file`/`restore_gate` modules, the preview keys and token format; the allowed-files rule; `build_server(connect=…)` and `bookvie_dropbox`'s `{cause, message}` error shape; port 8790; the `DOWNLOAD_CAUSES` and `views.models.DropboxCause` copies; the `local-state.json` readers and unreadable cases; the third and fourth skills). AD-22's "deletes nothing" is narrowed to failures before the verify.
- Add a `resolved:` line to each of the 38 entries, naming where it was reconciled. For the same-day mismatch entry, the spine side is done here; the `epics.md` AC-9 and `upload_backup` description side goes with item 91, and the non-drift Medium entry stays open for item 91.
- Fix the stale planning text: Story 13.4's "How it works" AC; the "daily backup run" wording in the `export_backup` and `record_backup_upload` **Description:** lines (`epics.md` first, then `agent/tools.py`), resolving the entry that names it; `spec-13-4`'s headless row; `spec-13-8`'s AC-6 note and residual risk; `spec-13-1`'s "Next:" line and its pre-rebase review SHAs. Confirm the ATDD retirements already done by the trace (`18d62dc`).
- Reword Story 13.2 AC-3 and AC-6 in `epics.md` (Oleg's decision in the Epic 13 trace, 2026-11-23): AC-3 says what the test proves (both copies agree on files across block boundaries, and Dropbox's published block digests give its published hash; the published image itself isn't hashed); AC-6 says Dropbox's per-request content hash on each request, then the returned `size` and `content_hash` checked against the bytes sent before any prune.
- Out of scope (item 91): Story 13.2 AC-9, the `upload_backup` description, EXPERIENCE.md, the skills, the frontend and `bookvie_dropbox/`. `README.md` is not edited.

</frozen-after-approval>

## Implementation Notes

- **Count:** 38 open "spine drift" entries, each closed with a `resolved:` line naming where the spine now says it. They are the retro's 38; from `:1572` on, their line numbers had shifted by one (`:1573` … `:1678`) after items 92 and 90 added `resolved:` lines. The same scan as item 82's (an entry is a line starting `- ` and its indented lines; count those whose text holds "spine drift" in any case and that have no `resolved:` line) gives 38 before and 0 after.
- **The same-day mismatch entry** (`:1548`): its `resolved:` line says only the spine side is done here; Story 13.2 AC-9 and the `upload_backup` description go with item 91, and the non-drift Medium entry (`:1549`) stays open for it.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-23). Each statement was checked against the code at `722b7e6`:
  - **Design Paradigm:** four skills, with their stories; the mermaid's stdio edge isn't planned.
  - **AD-1:** the zip's readers (`record_backup_upload`, `list_local_backups`, `preview_restore`); `write_safety_copy` creates and resolves the folder; `download_backup` can create a missing backups folder.
  - **AD-3:** `record_backup_upload` and `restore_backup` built.
  - **AD-4:** `export_backup` is the third reader of `local-state.json` (`_last_upload_hash` through `read_group`).
  - **AD-6:** App info allows `dropboxBackup.state` `dev` as the one other dev signal (`lib/dropboxBackupLine.ts`).
  - **AD-8:** four skills with their versions (backup and restore 1.0.0); all four skill tests pin step 1; `bookvie-backup` uses only the `bookvie` entry; `bookvie_dropbox`'s hand-written schemas and `other` for a bad argument set.
  - **AD-9:** Binds narrowed to bookvie's tools; the three restore codes are story 13.1.
  - **AD-15:** three readers; `LocalStateWriter`; a new "Damaged files" bullet (malformed replaced; unreadable `CouldntSave` and left; a missing `lastExportAt` valid and silent); UI preferences made a bullet so the paragraph splits cleanly.
  - **AD-21:** header names Epic 13; the tool list in `TOOLS` order; One validator for `export_backup` (`ExportBackupArguments`), `list_local_backups` (`NoArguments`), the restore tools (`PathArguments`) and `record_backup_upload`; Same handler gains `reason`, the interactive `ToolCall`/`InputRequiredResult` path and the restore tools' `intents/` models; Backup's answer keys.
  - **AD-22:** built in 13.1 to 13.8. Copied contracts name both files, the `DropboxCause` copy and `DOWNLOAD_CAUSES`. Sign-in names port 8790 and item 92's test seam. The seam is `build_server(connect=…)`. `upload_backup` uses the per-request hash and a new "What a failure leaves" bullet narrows "deletes nothing" to failures before the finish. `list_backups`/`download_backup` as built. Causes: `DOWNLOAD_CAUSES`, the `{cause, message}` shape, the skill's `other`, EXPERIENCE.md's Failed reasons. Backup time: the 0x5455 field. `record_backup_upload`'s refused extras. The backup skill's stops and records. The line's unreadable cases. Restore: Modules, Allowed files, the listing, `write_export_zip(store, out, now)`, the preview's keys, the token format and check order, one gate per app, the `confirm` key, and Apply's library-hash-first order. "Prevents" says a failed or mismatched upload never prunes a copy.
  - **Conventions:** the Config row's `bookvie-dropbox` and port 8790; the Testing row's fake SDK client, the failing keyring and the `bookvie-dropbox --help` smoke check.
  - **Stack:** `mcp`, `dropbox`, `keyring` lose "planned" (so `test_stack_pins.py` now checks the last two), and a new `requests` 2.34.x row, mapped in `backend/tests/test_stack_pins.py` (`requests>=2.34,<2.35`).
  - **Seed:** the stdio edge, the wheel packages, both commands, `local-state.json`, the backups folder paragraph, `pyproject.toml`, `agent/`, `intents/`, `store/`, `bookvie_dropbox/`, `docs/dropbox-backup.md` and `lib/` (`relativeDay`, `dropboxBackupLine`).
  - **Map:** every row built; FR-28 names four skills; FR-29 and FR-30 name the as-built modules, with `list_backups` under FR-30.
- **`epics.md`:**
  - Story 13.2 AC-3 and AC-6 reworded as Oleg decided in the trace.
  - Story 13.3's two **Description:** lines say "a Dropbox backup run" instead of "the daily backup run".
  - Story 13.4: "How it works" describes a run started by hand (matching 13.5 AC-4 and the guide); the "So that" line drops "or the morning job"; the note under the ACs is dropped as redundant (the epic preamble keeps the history).
- **Code:** `agent/tools.py` registers the same two descriptions (the tests read them from `epics.md`), and the "daily backup run" docstrings in `tools.py`, `intents/backup_file.py` and `store/local_state.py` say "Dropbox backup run". `deferred-work.md`'s entry on that wording is resolved. Test-file docstrings that say "the daily run" are left as they are.
- **Specs:** `spec-13-4`'s headless row is struck and marked retired; `spec-13-8`'s AC-6 heading and residual risk say the runs were recorded (`2c7322b`); `spec-13-1`'s review header maps `1815bff..9dc90dc` to `b7a2aba..d47751a` (read-only `git log`/`git patch-id`: same subjects and author dates; the build commit's patch differs only by the rebase onto `c1e7b0c`). The "Next: run bmad-code-review" lines in `spec-13-1`, `spec-13-4` and `spec-13-8` say the review is done, with its commit.
- **ATDD:** `grep -cF '[ ]'` is 0 in `atdd-checklist-13-4-…md` and in the superseded `atdd-checklist-13-5-run-the-backup-every-morning.md` (retired by the trace, `18d62dc`), so no edit.
- **Not changed (item 91):** Story 13.2 AC-9, the `upload_backup` description, EXPERIENCE.md, the skills, the frontend and `bookvie_dropbox/`. `README.md` is not edited. The Seed's **Check:** paragraph's phase order is not in any drift entry and is left.
- **"Before the verify" became "before the finish":** the item says to narrow AD-22's "deletes nothing" to failures before the verify. The code's line is the finish: `files_upload_session_finish` already replaces that day's copy, and the verify comes after it. So the spine says a failure before the finish deletes nothing, a mismatch found by the verify has replaced the same-day copy, and a prune failure after the verify answers `other`.
- **Review patches:** `epics.md` AR46, AR47 (the hash wording only; "any failure deletes nothing" is left for item 91), AR48, AR49, AR51 and AR55 now match the spine. Story 13.2's `DropboxApi` AC line is fixed. Dated notes mark the reworded 13.2 AC-3/AC-6, and 13.4's history note is restored with what item 89 changed. The `tools.py` docstring is reflowed, `spec-13-8`'s note is tagged, `spec-13-1`'s note mentions the AC-11 waiver (`2cacf0e`), and the port-8790 `resolved:` line is corrected. Two findings are deferred to `deferred-work.md`: the remaining "nothing deleted" text and the guide's "one tool" line (item 91), and the stale trace artifacts.
- **Verification:**
  - Drift scan: 38 before, 0 after.
  - `uv run pytest` passed on the description and stack tests (546 passed), and `test_stack_pins.py` now checks `dropbox`, `keyring` and `requests`.
  - `npm --prefix frontend run format:check`, `uv run ruff format --check .` and `uv run ruff check .` all exit 0.
  - `npm run check` was run on the final tree before the commit.

## Review Triage Log

- low, patch: AR47 still said "the whole file's `content_hash`", which contradicts the reworded AC-6 (`epics.md:201`). AR46 and Story 13.2's AC still named a `DropboxApi` seam that doesn't exist (`bookvie_dropbox/server.py` `build_server`).
- low, patch: AR49's "the daily run" and AR51's "always" record. AR55's allowed files, and AR48's missing `now` and 0x5455 field.
- low, defer: three more places say "nothing deleted" after a mismatch (AR47, 13.4's guide AC, `docs/dropbox-backup.md:131`), and the guide's "one tool" (`:5`). They belong to item 91's messages, and the guide is outside this item.
- low, patch: the reworded ACs had no dated note, and 13.4's history note had been removed. Both are added back, in the style of AR54.
- low, defer: the trace matrix and gate JSON still call 13.2 AC-3/AC-6 open. Those are the trace's artifacts, not this item's.
- false: "the spec is unfinished". The reviewer read it before the Implementation Notes were written, and its status is set to `done` at the finish, as the step says.
- low, patch: the change from "before the verify" to "before the finish" wasn't recorded. It is now in the Implementation Notes.
- low, patch: the `tools.py:48` docstring line was 104 columns. It is reflowed.
- low, patch: `spec-13-8`'s note lacked the item tag.
- reject: the "Status: in-review" lines under `## Auto Run Result` in `spec-13-1` and `spec-13-8` are the build's own record of where it parked, not current status.
- low, patch: `spec-13-1`'s note left out the AC-11 waiver (`2cacf0e`).
- low, patch: the port-8790 `resolved:` line said more than the Config row holds.
- false: `baseline_commit` is the key this workflow's template and the sibling item-92 spec use.
