---
title: 'Story 13.3: Record each upload in bookvie'
type: 'feature'
created: '2026-11-22'
status: 'in-review'
baseline_revision: '609cd19acffbff977f5252cff55a5b0714daaf43'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-3-record-each-upload-in-bookvie.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-15 State that is not exported), reconciled before the next epic: an unreadable local-state.json (an OSError other than not-found) is now CouldntSave and left as it is, so the next export no longer overwrites it; AD-15 still says the next export overwrites an unreadable or malformed file. A malformed one is still replaced.
    evidence: |-
      spine-check finding 1; backend/bookvie/store/local_state.py LocalStateWriter.update; backend/tests/test_export.py test_an_unreadable_local_state_reads_as_no_export_and_an_export_leaves_it_as_it_was; spec I/O matrix row "Unreadable file".
    location: >-
      backend/bookvie/store/local_state.py
    severity: low
  - summary: >-
      Spine drift (AD-15, AD-4 readers of local-state.json), reconciled before the next epic: export_backup (intents/backup_file _last_upload_hash, through read_group) now reads local-state.json outside the AD-4 lock to answer unchangedSinceUpload; AD-15 and AD-4 list only views/backup and views/shelf as readers.
    evidence: |-
      spine-check finding 2; backend/bookvie/intents/backup_file.py _last_upload_hash.
    location: >-
      backend/bookvie/intents/backup_file.py
    severity: low
  - summary: >-
      Spine drift (AD-22 record_backup_upload), reconciled before the next epic: an argument the outcome doesn't need is refused as invalid_fields (skipped with any other argument, failed with path/copies/contentHash, uploaded with cause), copies must be at least 1 and contentHash 64 lowercase hex; AD-22 states only what each outcome needs.
    evidence: |-
      spine-check finding 4; backend/bookvie/intents/backup_file.py _WANTED, _argument_errors; spec Design Notes "Extra arguments are refused".
    location: >-
      backend/bookvie/intents/backup_file.py
    severity: low
  - summary: >-
      Spine drift (AD-1, AD-3, AD-15, AD-21 Tools/One validator/Backup, AD-22, Structural Seed, Capability Map FR-29), reconciled before the next epic: lines still say "planned" for what 13.3 built (record_backup_upload, forUpload, libraryHash and unchangedSinceUpload, the one local-state writer, the None backups folder), and AD-21's tool list puts record_backup_upload before the restore tools while TOOLS registers it last.
    evidence: |-
      spine-check finding 5; backend/bookvie/agent/tools.py TOOLS.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      Pre-existing flaky Dropbox sign-in tests (Story 13.2's b64f901) that bind the fixed port 8790 fail intermittently under npm run check's parallel, loaded run; not caused by this story.
    evidence: |-
      Baseline 609cd19 shows it too; 4 of 7 full checks in this build failed only on these leaves; serial runs pass 20/20; an xdist_group attempt didn't help and was reverted.
    location: >-
      backend/tests/test_dropbox_cli_follow_ups.py, backend/tests/test_dropbox_auth.py
    severity: medium
---

<intent-contract>

## Intent

**Problem:** bookvie can't tell when the last Dropbox upload happened or how it went, so the Backup page (13.6) can't show it and the daily run (13.4) would upload an unchanged library again. Also `local-state.json` is written whole by `record_export`, so any second key would be lost, and `~/bookvie` still borrows `~/bookvie-backups`.

**Approach:** One group writer in `store/local_state` (its own lock, read-modify-write of one top-level key) that `Store.record_export` and a new tool-only writer `record_backup_upload` both use. `export_backup` gains an optional `forUpload` and answers `libraryHash` and `unchangedSinceUpload`. `backups_folder` answers `None` when the sibling rule lands on a default backups folder. bookvie gets its own copy of the cause enum.

## Boundaries & Constraints

**Always:**
- Registered descriptions of `export_backup` and `record_backup_upload` equal Story 13.3's quoted text in `epics.md`, word for word (`DESCRIPTIONS` already reads them).
- `record_backup_upload` is listed last, after `restore_backup`.
- Every stored `at` comes from `state.clock.now()`; `backupAt` from `backup_time` of the zip; `libraryHash` is bookvie's own SHA-256 of the zip's `library.json` (never the agent's).
- A failure replaces only `autoBackup.lastReport`; a skip `lastReport` and `lastOk`; an upload all three. Keys of `autoBackup` not replaced, and every other top-level key, are kept as read.
- The writer goes through `store.fs` (via `Store._write_atomic`), never takes `store.lock`, and a write failure is `CouldntSave` → tool answer 503 `couldnt_save` with the file unchanged.
- A refused call stores nothing. Refusals are `invalid_fields`, one field error per failing argument, named by its key.
- `bookvie_dropbox` and `bookvie` don't import each other; the cause enum is copied.

**Never:**
- No HTTP route, no view change, no frontend change (the Backup line is 13.6).
- Don't move `lastExportAt` on `forUpload: true`, on `record_backup_upload`, or on a restore; an export never touches `autoBackup`.
- Don't edit the spine, the README, or `schema.d.ts`.
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload | `{uploaded, path, copies, contentHash}`, daily file in backups folder, hash matches | All three groups stored; answer `{ok: true}` | — |
| Skip | `{skipped}` | `lastReport`, `lastOk` replaced | — |
| Failure | `{failed, cause}` | only `lastReport` (with `cause`) | — |
| Bad outcome/cause | unknown or missing `outcome`; cause outside enum; `failed` without cause | nothing stored | `invalid_fields` on `outcome` / `cause` |
| Upload args | missing `path`/`copies`/`contentHash`; `copies` < 1 or not an int; `contentHash` not 64 lowercase hex | nothing stored | `invalid_fields` on that argument (all failing ones, in property order) |
| Upload path | outside folder, in `from-dropbox/`, safety-copy name, no file, symlink, `..`, no backups folder | nothing stored | `invalid_fields` on `path` |
| Hash mismatch | valid path, other hash | nothing stored | `invalid_fields` on `contentHash` |
| Unreadable zip | daily-named file that isn't a zip or lacks `library.json` | nothing stored | `invalid_fields` on `path` |
| Extra args | `skipped` with any other arg; `failed` with `path`/`copies`/`contentHash`; `uploaded` with `cause` | nothing stored | `invalid_fields` on each extra argument |
| Malformed file | `local-state.json` not a JSON object | replaced with the written group alone; stderr names `local-state.json` | — |
| Unreadable file | read raises `OSError` other than not-found | nothing written | `CouldntSave` |
| Write fault | `FaultyFs` at create_temp/write/fsync/replace | file unchanged, no temp | `couldnt_save` |
| `~/bookvie` data | sibling would be `~/bookvie-backups(-dev)` | `backups_dir` is `None`; `export_backup` `couldnt_save`; `list_local_backups` empty | — |

</intent-contract>

## Code Map

- `backend/bookvie/store/local_state.py` -- `local_state_bytes` (remove); `read_last_export` (keep reading `lastExportAt` from a file holding `autoBackup` too). Home for the new writer and a `read_group` helper.
- `backend/bookvie/store/store.py:32,250,587-598` -- imports `local_state_bytes`; `self.lock` (AD-4, don't use); `record_export` → group writer; `_write_atomic(target, data, prefix)` goes through `self.fs` at call time (tests swap `store.fs`).
- `backend/bookvie/intents/backup_file.py` -- `backups_folder` (AC-7), `BackupFile` (add `library_hash`, `unchanged_since_upload`), `write_backup` (add `for_upload`; hash `library.json` from the spooled zip before closing it), `resolve_backup_path` (share its core with a daily-only resolver), `dropbox_content_hash`, `DAILY_NAME`. Add `CAUSES` and `record_backup_upload` here.
- `backend/bookvie/intents/export.py:88,102,125` -- `backup_time`, `write_export_zip` (`library.json` = `store.path.read_bytes()`), `build_export`.
- `backend/bookvie/intents/contract.py:356` -- `couldnt_save(status)`; `invalid_fields`, `FieldError`.
- `backend/bookvie/intents/__init__.py` -- re-export new names.
- `backend/bookvie/agent/tools.py:747-760,883` -- `_export_backup`/`EXPORT_BACKUP` (`NoArguments` → a `forUpload` model, new description); add `RECORD_BACKUP_UPLOAD` after `RESTORE_BACKUP` in `TOOLS`; `parse_view_arguments` names failing args by alias; `input_schema` drops `null` from optionals.
- `backend/bookvie/http/app.py:249`, `backend/bookvie/cli.py:314` -- already accept `backups_dir=None`.
- `backend/bookvie_dropbox/contracts.py` -- `CAUSES` (the other copy).
- `backend/tests/test_agent_backup_upload.py`, `test_dropbox_contracts.py:112` -- the 7 red leaves (un-skip).
- `backend/tests/test_agent_backup.py:146-195,436` -- 12.6's shape assertions to update; folder-rule leaf gains the `None` case.
- `docs/dropbox-backup.md` -- add a short note on what bookvie records and the `~/bookvie` folder rule.
- Deferred-work intake:
  - `deferred-work.md:1475` (backups_folder for `~/bookvie`, from 13.1's review) -- task 3, AC-7.
  - `deferred-work.md:1513` (bookvie's copy of `CAUSES` and the compare test, from 13.2's review) -- task 3, AC-5.

## Tasks & Acceptance

**Execution:**
1. `backend/bookvie/store/local_state.py` -- add `LocalStateWriter(data_dir, write)` with its own `threading.Lock` and `update(key, change)` (read file; malformed → log naming `local-state.json`, start from `{}`; unreadable → `CouldntSave`; `doc[key] = change(doc.get(key))`; write `json.dumps(doc) + "\n"` through `write`); add `read_group(data_dir, key)` (never raises); remove `local_state_bytes`.
2. `backend/bookvie/store/store.py` -- `self.local_state = LocalStateWriter(self.data_dir, lambda target, data: self._write_atomic(target, data, prefix=LOCAL_STATE_TEMP_PREFIX))`; `record_export` calls `update(LAST_EXPORT_KEY, lambda _: now.isoformat())`.
3. `backend/bookvie/intents/backup_file.py` -- `CAUSES`; `backups_folder` returns `Path | None`; `write_backup(..., for_upload=False)` returns the two new fields; `record_backup_upload(store, clock, backups_dir, arguments model)` validating per the matrix, reading the file through one handle (content hash, then `library.json` and `backup_time`), then one `update("autoBackup", …)`; `CouldntSave` → `couldnt_save(503)`.
4. `backend/bookvie/agent/tools.py` -- `ExportBackupArguments(for_upload: bool = False)` parsed with `parse_arguments`; `RecordBackupUploadArguments` (`outcome: Literal[...]`, optional `path`, `copies: int` (ge 1), `content_hash`, `cause: Literal[CAUSES]`) parsed with `parse_view_arguments`; register both with the epics text; update module docstring.
5. Tests -- un-skip the 7 leaves; update `test_agent_backup.py`'s 12.6 shape/schema asserts and folder-rule leaf; add leaves for the matrix rows the red leaves don't cover (extra args, copies bounds, bad hex, unreadable zip, symlink, unreadable/malformed reader, unknown top-level key kept, forUpload refusing `"true"`, a 50-thread race between `record_export` and skips).
6. `docs/dropbox-backup.md` -- the note above.

**Acceptance Criteria:**
- Given the 7 ATDD leaves un-skipped, when the backend suite runs, then they pass, and the 13 tool-list cases pass unchanged.
- Given `npm run check`, when it runs, then it passes.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 30 findings — high 0, medium 3, low 22, false 5, maybe-false 0
- findings:
  - `[false]` `[reject]` (intent) The Backup page doesn't show the upload state and nothing acts on unchangedSinceUpload — the epic puts the Backup line in 13.6 and the skip in 13.4; 13.3's ACs stop at local-state.json and the tool contract.
  - `[low]` `[reject]` (intent) An unreadable local-state.json is no longer overwritten by an export, changing the route's earlier "as before" behavior — the spec's matrix chose it so a permissions fault can't wipe autoBackup; a chmod-000 state file is rare and the old overwrite would silently lose the upload state. Spine side deferred (spine-check 1).
  - `[false]` `[reject]` (intent) No test runs 13.1's restore_backup tool and checks autoBackup survived — `test_agent_restore.py:577,584` assert local-state.json byte-identical after the tool's restore, which catches any write, and the tool never calls the writer.
  - `[false]` `[reject]` (intent) "(no other argument)" read as a refusal rule — a deliberate, recorded Design Notes choice, not a defect.
  - `[low]` `[reject]` (intent) The race test calls the intent directly and FaultyFs covers only a skip — the verification-gap layer showed removing the lock fails the race test 5/5; both writers share `_write_atomic`, which `test_store.py` faults for record_export.
  - `[low]` `[defer]` (spine) AD-15: an unreadable file is no longer overwritten — spine drift, deferred.
  - `[low]` `[defer]` (spine) AD-15/AD-4 reader lists omit export_backup's read — spine drift, deferred.
  - `[low]` `[patch]` (spine) The `Cause` Literal duplicates `CAUSES` and no test ties them (AD-22 Copied contracts) — test asserts `get_args(Cause) == CAUSES`.
  - `[low]` `[defer]` (spine) AD-22 doesn't state the extra-argument refusals and bounds — spine drift, deferred.
  - `[low]` `[defer]` (spine) "planned" markers and AD-21 tool order — spine drift, deferred.
  - `[low]` `[patch]` (blind) Cause enum spelled twice — grouped with spine-check 3; same patch.
  - `[low]` `[reject]` (blind) A skip is taken on the agent's word — AD-22 "skipped needs neither"; bookvie compares in export_backup and the skill only branches on the flag. Checking it would add a rule the spine and ACs don't have.
  - `[low]` `[reject]` (blind) An unreadable local-state.json blocks "Last export" — same as the intent row above.
  - `[low]` `[reject]` (blind) No startup log when the data folder gets no backups folder — only odd folders like `~/bookvie` hit it; the AC asks only for couldnt_save and an empty list; a new log path is more than a direct correction.
  - `[false]` `[reject]` (blind) The 50-thread race test can't catch a missing lock — the verification-gap layer replaced the lock with `if True:` and the test failed 5/5.
  - `[false]` `[reject]` (blind) The docs and the description present unbuilt features — the description is epics.md's mandated text, and the docs describe what bookvie stores and what export_backup answers, which this story built.
  - `[low]` `[reject]` (blind) The docs don't mention forUpload, refusals or couldnt_save — the guide is for the user; 13.4 documents the run. Not a defect anyone meets.
  - `[low]` `[reject]` (blind) No test for a malformed autoBackup group — the `isinstance` guards are simple, and a hand-mangled group is unlikely; a new test isn't a direct correction.
  - `[low]` `[patch]` (blind) write_backup hashes library.json after the rename, so a read failure escapes with the file written — hash computed from the spool before `_write_atomic`.
  - `[low]` `[reject]` (blind) Arguments are validated twice — cosmetic; the cost is microseconds.
  - `[low]` `[patch]` (blind) `_NOT_A_DAILY_BACKUP` defined after its user, `_content_hash_of(source: Any)` — constant moved up, parameter typed `BinaryIO`.
  - `[low]` `[reject]` (blind) Case folding refuses `~/Bookvie` on a case-sensitive disk — the spec chose it; macOS's default disk is case-insensitive and the result fails closed (no backups folder), never into the real one.
  - `[medium]` `[patch]` (edge) A daily zip with corrupt deflated library.json raises zlib.error/EOFError, uncaught (`_ZIP_ERRORS` is OSError, BadZipFile, LargeZipFile) — both added to the except; a test refuses it on `path`.
  - `[medium]` `[patch]` (edge) read_last_export logs "has no lastExportAt string" on every view read when the file holds only autoBackup — the daily run never sets lastExportAt, so it hits every user who only backs up daily — a missing key now returns None without a log; test pins no stderr.
  - `[low]` `[reject]` (edge) Case-sensitive disk `~/Bookvie` — same as the blind row above.
  - `[low]` `[reject]` (edge) A symlink swapped in between lstat and open — needs write access to the user's own backups folder; O_NOFOLLOW handling adds branches for a threat the local-first app doesn't model.
  - `[low]` `[patch]` (edge) Hash after rename in write_backup — grouped with the blind row; same patch.
  - `[medium]` `[patch]` (verification) The case-folded comparison is never exercised — folder-rule test asserts `backups_folder(home / "BookVie", home) is None`.
  - `[low]` `[patch]` (verification) The dev default in the None rule is never exercised — folder-rule test with `x-backups` symlinked to `bookvie-backups-dev`.
  - `[low]` `[patch]` (verification) `_NOT_A_DAILY_BACKUP` placement — grouped with the blind style row; same patch.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Success answer:** `OkResponse` (`{ok: true}`), as the write tools answer; the stored state is read through `local-state.json` (13.6's view).
- **Extra arguments are refused**, reading the AC's "(no other argument)" as a rule, so a skill bug surfaces instead of being silently dropped.
- **`unchangedSinceUpload`** reads `autoBackup.lastUpload.libraryHash` with `read_group`; a missing or malformed state is `false`.
- **Case-insensitive disks:** the `None` check compares with `samefile`, then resolved paths case-folded, so `~/Bookvie` can't reach `~/bookvie-backups` either.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_backup_upload.py tests/test_dropbox_contracts.py tests/test_agent_backup.py tests/test_store.py tests/test_export.py` -- expected: all pass
- `npm run check` -- expected: exit 0

## Auto Run Result

Status: in-review

**Summary.** bookvie now records each daily upload. `export_backup` takes an optional `forUpload` (true: "Last export" doesn't move) and answers `libraryHash` (SHA-256 of the zip's `library.json`) and `unchangedSinceUpload`. A new tool-only writer `record_backup_upload` stores `autoBackup.lastReport/lastOk/lastUpload` in `local-state.json`, with bookvie's own clock, zip time and hash, refusing every bad argument as `invalid_fields` by key. One `LocalStateWriter` (own lock, not AD-4's) read-modify-writes one top-level group for both `record_export` and the upload record; `local_state_bytes` is gone. `backups_folder` answers `None` for a data folder like `~/bookvie`. bookvie has its own `CAUSES`, compared with `bookvie_dropbox`'s.

**Files changed.**
- `backend/bookvie/store/local_state.py` — `LocalStateWriter`, `read_group`; `read_last_export` no longer logs a file without `lastExportAt`.
- `backend/bookvie/store/store.py` — `Store.local_state`; `record_export` through it.
- `backend/bookvie/intents/backup_file.py` — `CAUSES`, `backups_folder` → `None` rule, `write_backup(for_upload)` + hash, `resolve_daily_backup`, `RecordBackupUploadArguments`, `record_backup_upload`.
- `backend/bookvie/intents/__init__.py`, `backend/bookvie/agent/__init__.py` — re-exports.
- `backend/bookvie/agent/tools.py` — `ExportBackupArguments`, new `export_backup` description, `RECORD_BACKUP_UPLOAD` registered last.
- `backend/tests/test_agent_backup_upload.py` — 7 ATDD leaves un-skipped, plus matrix and follow-up leaves.
- `backend/tests/test_dropbox_contracts.py` — AC-5 leaf un-skipped; `get_args(Cause) == CAUSES`.
- `backend/tests/test_agent_backup.py`, `test_store.py`, `test_export.py` — 12.6 shape updated, folder-rule `None` cases (case-folded, dev symlink), the unreadable-file leaf now expects the file left as it was, no log for a file with only `autoBackup`.
- `docs/dropbox-backup.md` — "What bookvie records".
- `_bmad-output/implementation-artifacts/deferred-work.md` — two intake entries resolved; this review's deferrals.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 13-3 → review.

**Review.** 30 findings: 0 high, 3 medium, 22 low, 5 false. Patched (all in one round): medium ×3 (corrupt deflated zip uncaught in `record_backup_upload`; `read_last_export` logging on every view read when only `autoBackup` exists; the case-folded folder rule untested), low ×4 entries (`Cause`/`CAUSES` tie, hash before rename in `write_backup`, constant placement and `BinaryIO`, dev-default folder rule untested). Deferred: four spine drift entries (AD-15 unreadable file, AD-15/AD-4 readers, AD-22 extra-argument refusals, "planned" markers and tool order) and the pre-existing port-8790 flake. Rejected, with reasons in the Review Triage Log: UI not in this story, unreadable-file behavior (spec's choice), skip trusted on the agent's word, no startup log, docs scope, double validation, case-sensitive disks, TOCTOU symlink swap, malformed `autoBackup` test, and the false ones.

**Follow-up review recommended: true** (first pass, 3 medium patched). Unverified risk: the patch round's new paths (`write_backup` refusing an unreadable built zip as `couldnt_save`, the zlib/EOF refusal, `read_last_export`'s silent missing key) were checked only by the subagent's own new tests and the full suite, not by a second review.

**Verification.** `cd backend && uv run pytest -q tests/test_agent_backup_upload.py tests/test_dropbox_contracts.py tests/test_agent_backup.py tests/test_store.py tests/test_export.py` — 171 passed (after the patches). `npm run check` — exit 0 on the final run (2377 pytest, 800 e2e, api, smoke). Earlier full runs failed only on the pre-existing port-8790 Dropbox sign-in leaves (deferred above); the baseline commit shows the same flake.

**Residual risks.** The port-8790 flake will keep failing `npm run check` intermittently until fixed. An unreadable `local-state.json` now stops "Last export" from moving (logged only), by the spec's choice. The Matrix Test Audit found every matrix row covered by a passing test.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
