---
title: 'Split backup_file.py and agent/tools.py'
type: 'refactor'
created: '2026-11-23'
status: 'done'
route: 'dispatch'
baseline_commit: '1a316f4c8f78ea8955331650d4507329ff3c2c1f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 95 (E13-A2, E12-A2; sprint item `epic-13-retro-item-95-split-backup-file-and-agent-tools`). Every Epic 14 backup or tool change lands in one of two files: `intents/backup_file.py` (627 lines, 8 concerns) and `agent/tools.py` (924 lines, every tool). Item 90's addendum: a split that adds modules keeps the restore-path coverage gate green without measuring them, so `RESTORE_PATH` must name the new restore modules.

**Approach:** move code, unchanged, into flat sibling modules by concern and by tool group. `agent/tools.py` keeps `TOOLS`. Importers and tests change only their import paths and patch targets.

## Boundaries & Constraints

**Always:** each moved function, class, constant and docstring is copied verbatim; only imports and module docstrings change. `TOOLS` keeps its order and stays the one list in `agent/tools.py`. `bookvie.intents` and `bookvie.agent` keep exporting the same names. Layer rules (`test_layers.py`) hold. The modules stay flat (`intents/backup_*.py`, `agent/*_tools.py`), so the coverage groups see them where they did.

**Never:** no behavior, message, schema or description change. No compatibility shim: `intents/backup_file.py` is deleted and its importers move. No edit to ARCHITECTURE-SPINE.md (AGENTS.md "Architecture spine"): its mentions of `intents/backup_file` and `agent/tools.py` become one spine-drift entry. No test assertion changes, only imports and patch targets.

</frozen-after-approval>

## Code Map

- `backend/bookvie/intents/backup_file.py` -- split, then deleted:
  - `backup_names.py`: the data and backups folder names, `_same_folder*`, `backups_folder`, `backup_name`, `DAILY_NAME`, `SAFETY_NAME`, `FROM_DROPBOX`, `BackupKind`, `_is_daily_name`, `_is_safety_name`, `_kind_in_folder`, `_kind_in_from_dropbox` and `safety_copy_name`.
  - `backup_daily.py`: `BackupFile`, `write_backup`, `_couldnt_save` and `_write_atomic`. It imports `build_export` by name, so the test patch moves here.
  - `backup_listing.py`: `CONTENT_HASH_BLOCK`, `dropbox_content_hash`, `_content_hash_of`, `_library_hash`, `LocalBackup(s)`, `_candidates` and `list_local_backups`.
  - `backup_restore.py`: `_is_regular_file`, `_locate_backup`, `resolve_backup_path`, `resolve_daily_backup` and `write_safety_copy` (which uses `backup_daily._write_atomic`).
  - `backup_upload.py`: `LAST_*`, `_NOT_A_DAILY_BACKUP`, `CAUSES`, `Outcome`, `Cause`, the argument keys, `RecordBackupUploadArguments`, `_argument_errors`, `_refuse`, `_read_upload`, `record_backup_upload` and `_last_upload_hash` (which `backup_daily` imports).
  - Import direction, no cycles: names ← listing ← daily ← restore; upload ← (names, listing, restore); daily → upload.
- `backend/bookvie/intents/__init__.py:8` -- import the same names from the new modules.
- `backend/bookvie/intents/restore_file.py:4,17,37` -- `write_safety_copy` from `backup_restore`, and the docstring references.
- `backend/bookvie/agent/tools.py` -- split:
  - `tool_base.py`: `ToolCall`, `AgentTool`, the schema helpers (`JSON_VALUE_TYPES`, `input_schema`, `advertised_schema`, `_required_schema` and the rest), `parse_arguments`, `parse_view_arguments`, `NoArguments`, `MISSING_MESSAGE`, `_expected_keys` and `_refuse_missing`.
  - `read_tools.py`: `GET_APP_INFO` and the six view tools.
  - `write_tools.py`: `_write_tool` and the ten write tools. The test patch `bookvie.agent.tools.{tool}` moves here.
  - `book_tools.py`: `COVER_URL_*`, `_book_tool`, `ADD_BOOK`, `BOOK_FORM_KEYS` and `EDIT_BOOK`.
  - `backup_tools.py`: `ExportBackupArguments`, `PathArguments`, `CONFIRM_*` and the export, list, preview, restore and record tools.
  - The module docstring's paragraphs go to the module each one describes. `tools.py` keeps `TOOLS`.
- `backend/bookvie/agent/__init__.py`, `agent/server.py:32` -- import from the module that defines each name.
- `backend/scripts/coverage_gate.py:33-40` -- `RESTORE_PATH` = `restore_gate.py`, `restore_file.py`, `backup_names.py`, `backup_listing.py`, `backup_restore.py`. That is the restore half: the allowed names, the listing, and the path and safety-copy rules. `backup_daily` and `backup_upload` stay in intents+store at 80%.
- Tests, imports and patch targets only:
  - `tests/test_coverage_gate.py`: the module names in the fixtures and the expected messages; the "three modules" test name becomes "its modules".
  - `test_agent_write.py:594`
  - `test_agent_backup_upload.py:34,673`
  - `test_dropbox_contracts.py:17-24,111-113`
  - `test_backup_skill.py:32`
  - `test_layers.py:194` (the self-test's fake import names a module that is gone)

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/backup_*.py`, `intents/__init__.py`, `intents/restore_file.py` -- create the five modules, delete `backup_file.py`, repoint the imports.
- [x] `backend/bookvie/agent/{tool_base,read_tools,write_tools,book_tools,backup_tools,tools}.py`, `agent/__init__.py`, `agent/server.py` -- the same for the tools.
- [x] `backend/scripts/coverage_gate.py`, `backend/tests/test_coverage_gate.py` -- name the restore half's modules.
- [x] The tests listed in the Code Map -- repoint imports and patch targets.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- one spine-drift entry naming the stale module paths (AD-21, AD-22, Consistency Conventions, Structural Seed).
- [x] `sprint-status.yaml` -- item 95 `done`.

**Acceptance Criteria:**
- Given the split, when `grep -rn backup_file backend/bookvie backend/scripts backend/tests` runs, then nothing matches except prose naming the old file in history (none expected).
- Given `tools/list` on both servers, when its JSON is compared with the baseline's, then it is byte-identical (names, order, descriptions, schemas).
- Given the full `npm run check`, when it runs, then it exits 0 and the coverage report lists the restore path's five modules at 90% or more.
- Given `wc -l`, then no new module is above 350 lines and `agent/tools.py` holds little more than `TOOLS`.

## Implementation Notes

- **A change from the Code Map, to break an import cycle.** The planned edges ran daily → upload (`_last_upload_hash`) → restore (`resolve_daily_backup`) → daily (`_write_atomic`), a loop. So `_last_upload_hash` and `LAST_REPORT`, `LAST_OK` and `LAST_UPLOAD` live in `backup_daily`, and `backup_upload` imports the keys from there. The edges now run one way: names → listing → daily → restore → upload. Keeping `_write_atomic` in `backup_daily` keeps the daily writer out of the restore-path gate.
- **Beyond the Code Map:**
  - `test_agent_write.py`'s broken-handler helper also runs for `add_book` and `edit_book`, so it patches `book_tools.<tool>` for those two and `write_tools.<tool>` for the rest, importing `BOOK_TOOL_NAMES`.
  - The `bookvie_dropbox/contracts.py` docstrings that name bookvie's copy of each contract now name `backup_names` and `backup_listing`. Only docstrings changed.
  - A comment in `test_agent_restore_follow_ups.py:103` named the old module.
- **Sizes:** `backup_names` 126 lines, `backup_listing` 122, `backup_daily` 167, `backup_restore` 116, `backup_upload` 162, `tool_base` 219, `read_tools` 154, `write_tools` 234, `book_tools` 151, `backup_tools` 193, `tools` 65.
- **Verified by the parent session, 2026-11-23:**
  - An AST comparison of every top-level statement except imports and the module docstring found them unchanged: 58 of 58 from `backup_file.py` and 84 of 84 from `tools.py`, none missing and none added.
  - `TOOLS` was dumped (name, description, required keys, `interactive`, advertised schema) from a `git archive` of the baseline and from the tree. The two outputs are byte-identical, 24 tools.
  - `grep -rn backup_file` matches only the test name `test_the_backup_file_restores_…`, which is about a backup file, not the module.
- **Restore-path coverage (AC 3).** The gate sums its modules, as item 90 set it up. In the implementer's `check:py` run the summed figure was 94.06%. One module alone is below 90%: `backup_listing.py` at 89%, missing `_candidates`' error paths (lines 70–71, 81–89). Those lines were uncovered inside `backup_file.py` before the split too. Covering them needs a new test, which is outside this behavior-preserving split. They are listed in the deferred-work entry below.
- **Review patch (pass 1): `backup_daily.py` joined `RESTORE_PATH`**, since the safety copy writes through its `_write_atomic`. The gate now names six modules; only `backup_upload.py` counts solely in intents+store. Also corrected: `backup_daily`'s note on the import cycle, the `book_tools` docstring, and the destructive-intents sentence, which moved word for word to `tools.py`. Re-checked afterwards: the AST comparison is still 58/58 and 84/84, and the `TOOLS` dump is still byte-identical.
- **Full check after the review patch, 2026-11-23:** `npm run check` exit 0. 2,497 pytest, 396 node, 803 e2e, smoke ok. Coverage gates: domain 100%, intents+store 97.28%, bookvie_dropbox 95.47%, restore path 94.77% (471/497, six modules). The run before the patch was also exit 0 (restore path 94.06%, five modules).
- **Spine:** one "Spine drift" entry in `deferred-work.md`. It blocks Epic 14's first story until the spine is reconciled again, or until Oleg says to proceed (AGENTS.md "Architecture spine").

## Review Triage Log

### 2026-11-23: pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap, Spine Check)

- **`[medium]` `[patch]` The restore-path gate no longer measures the safety copy's writer.** `write_safety_copy` writes through `backup_daily._write_atomic`, and `backup_daily.py` was outside `RESTORE_PATH`. Before the split, the whole `backup_file.py` was gated. Fix: `backup_daily.py` (98% covered) joins `RESTORE_PATH`. Reported by Edge Case Hunter and Blind Hunter.
- **`[low]` `[patch]` `backup_daily.py`'s note on the import cycle gave the wrong reason.** It said `backup_upload` imports the keys because it imports `backup_restore`. The real reason: keeping them in `backup_upload` would make `backup_daily` import it, closing daily → upload → restore → daily. Blind Hunter.
- **`[low]` `[patch]` Two `book_tools.py` docstring sentences no longer fit.** "(add_book and edit_book) are write tools too" reads wrongly in a module of their own, and the "destructive intents are never tools" rule is about `TOOLS` as a whole, so it moves to `tools.py`. Blind Hunter.
- **`[low]` `[patch]` The deferred coverage entry cited line numbers** that go stale on the first edit. It now names the three branches. Blind Hunter.
- **`[low]` `[defer]` Planning and trace artifacts still name `intents/backup_file` or `agent/tools.py`** (`epics.md`, the plan, the Epic 13 trace, ATDD checklists). Deferred beside the spine-drift entry. Blind Hunter.
- **`[low]` `[defer]` (already deferred) `backup_listing.py` is 89% on its own; AC 3 read per module isn't met.** The gate sums its modules (item 90), and that sum passes. The missed lines were uncovered inside `backup_file.py` before the split. Adding a test is new coverage, outside a behavior-preserving split. Blind Hunter, Edge Case Hunter, Verification Gap.
- **`[low]` `[defer]` (already deferred) The spine names the old modules.** The spine-drift entry covers every stale mention, which Spine Check verified one by one. Spine Check.
- **`[false]` The sprint item is `done` before the review.** This is retro-item work with no `story_key`, so the build closes it. The status is committed only after this review and the full check (workflow fact "Spec status ownership"). Blind Hunter.
- **`[false]` The task line names Consistency Conventions, but the entry doesn't.** Spine Check found no stale mention under Consistency Conventions (spine `:424` onward). The stale ones are in AD-4, AD-8, AD-21, AD-22, the Seed and the map, which is what the entry lists. Blind Hunter, Edge Case Hunter.
- **`[false]` `backup_tools.py` says `record_backup_upload` is "listed last".** It still is: `TOOLS` ends with `RECORD_BACKUP_UPLOAD`. Blind Hunter.
- **`[false]` The broken-handler helper falls through for a tool in neither group.** It is called only with `WRITE_TOOL_NAMES` and `BOOK_TOOL_NAMES`, and a wrong name fails loudly with `AttributeError`, which is correct. Edge Case Hunter.
- **`[low]` rejected: the Code Map and AC 1's grep disagree with what was built** (`LAST_*` placement; the one `test_the_backup_file_…` name match). The fix is an edit to this build's spec, and the Implementation Notes record both. Blind Hunter, Edge Case Hunter, Verification Gap.
- **`[low]` rejected: private names (`_write_atomic`, `_expected_keys`, `_kind_in_folder` and others) now cross sibling modules.** Renaming them would break the verbatim-move rule. They stay inside one layer. Blind Hunter.
- **`[low]` rejected: nothing stops a future `backup_*` module from skipping the gate, and `test_the_restore_path_sums_its_modules` gives non-zero numbers to one backup module only.** The gate code is unchanged and its tests pin the summing. A guard test adds machinery for a case no one is making now. Blind Hunter.
- **`[low]` rejected: the verification can't be reproduced.** The scripts are in this session's scratchpad (`mine/dump.py`, `verbatim.py`), and Verification Gap re-ran the AST comparison on its own and matched 58/58 and 84/84. Blind Hunter.
- **Verification Gap:** no gaps. It re-ran the AST comparison and the `__all__` check, confirmed that both moved patch targets still bite, and ran 95 targeted tests.

## Design Notes

The modules are flat, not packages, so the intents+store gate and `test_layers.py` see them unchanged. With no shim, each name lives in one module, and patching that module is the only patch that works.

## Verification

**Commands:**
- `cd backend && uv run pytest -q -n auto` -- expected: all green.
- Dump `tools/list` at the baseline and after, then `diff` them -- expected: empty.
- `npm run check` -- expected: exit 0, with the "restore path" gate at 90% or more.
