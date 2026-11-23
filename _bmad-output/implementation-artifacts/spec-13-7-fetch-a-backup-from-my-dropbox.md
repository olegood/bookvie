---
title: 'Story 13.7: Fetch a backup from my Dropbox'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: '4a6496266c7c007b5cad37561d864c0e62f04ab0'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-7-fetch-a-backup-from-my-dropbox.md'
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-22 Backup time, Dropbox tools), reconciled before the next epic: list_backups reports and orders by the client_modified that upload_backup stamped, not the zip entry's time; it lists only daily FileMetadata, newest first, as {"backups": [...]}, a missing folder as []; download_backup also checks the size, refuses a symlinked from-dropbox, fsyncs the folder, and maps ApiError to other and transfer faults to download_incomplete.
    evidence: |-
      spine-check findings 1-3, intent-alignment divergence 2; backend/bookvie_dropbox/download.py.
    location: >-
      backend/bookvie_dropbox/download.py
    severity: low
  - summary: >-
      Spine drift (AD-22 Causes, Copied contracts; AD-9), reconciled before the next epic: DOWNLOAD_CAUSES (dropbox_signin, download_incomplete, other) is a bookvie_dropbox-only cause set beside the closed five-cause enum, and list_backups/download_backup answer {cause, message} with a bad argument set as other, not AD-9's error object.
    evidence: |-
      spine-check findings 4 and 6; backend/bookvie_dropbox/download.py DOWNLOAD_CAUSES, server.py _error.
    location: >-
      backend/bookvie_dropbox/server.py
    severity: low
  - summary: >-
      Spine drift (AD-1; Structural Seed, Capability map, Testing row), reconciled before the next epic: download_backup's mkdir(parents=True) can create a missing backups folder, not only from-dropbox/; and the spine still marks list_backups/download_backup planned, with list_backups under FR-29.
    evidence: |-
      spine-check findings 5 and 7.
    location: >-
      backend/bookvie_dropbox/download.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** An agent can restore from a backup on this computer (Story 13.1), but it can't see or fetch the copies in bookvie's Dropbox folder, so a library whose local backups are gone can't be restored through an agent.

**Approach:** Add two tools to the `bookvie-dropbox` stdio server (AD-22): `list_backups` lists the daily backups in `/.backups`, newest first, as `{name, backupTime, size, contentHash}`; `download_backup(name, target)` downloads one daily backup into `~/bookvie-backups/from-dropbox/` or `~/bookvie-backups-dev/from-dropbox/` through a temporary file that is fsynced and renamed only after its content hash and size match Dropbox's. bookvie's side (13.1's `list_local_backups`, `preview_restore`) already reads `from-dropbox/`.

## Boundaries & Constraints

**Always:**
- The registered descriptions equal epics.md Story 13.7's two "Description:" lines verbatim.
- `list_backups` takes no arguments; `download_backup` takes exactly `name` and `target` (both strings, both required, `additionalProperties: false`). Any other argument set, a `name` that isn't a daily name on a real calendar day (`contracts.daily_date`), or a `target` other than `bookvie` / `bookvie-dev` is refused with cause `other` before `connect()` and before any file or folder is created.
- A success answer is structured content with the same JSON as its one text content: `{"backups": [...]}` and `{"path": "<absolute path>"}`. A failure is `isError` with one JSON text `{cause, message}`, as `upload_backup`'s.
- `download_backup`'s causes are `dropbox_signin`, `download_incomplete`, `other`. `download_incomplete` is not added to `contracts.CAUSES` (that is `record_backup_upload`'s enum, pinned at 5).
- The file appears at `from-dropbox/<name>` only after the whole body was written to a temporary file in the same folder, the file fsynced, and its size and content hash equal the download metadata's; then `os.replace`, then the folder is fsynced. Any failure removes the temporary file and leaves an existing `from-dropbox/<name>` untouched. The response is always closed.
- Only `/.backups/<name>` is read; the listing reads only `/.backups`.

**Never:** a delete, move or restore tool; writing into the backups folder itself; following a symlinked `from-dropbox/`; a message or log holding a token; any import of `bookvie` from `bookvie_dropbox`; the `bookvie-restore` skill or the guide's download troubleshooting (Story 13.8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List | dailies, other names, a daily-named folder, several pages | only `FileMetadata` with a daily name, newest first by `client_modified` (then by name), `backupTime` = `client_modified` as aware UTC ISO-8601 | missing `/.backups` → `{"backups": []}` |
| List fails | sign-in refused / Keychain unreadable; anything else | — | `dropbox_signin` (names `bookvie-dropbox auth`); `other` |
| Download | daily name, `bookvie` or `bookvie-dev` | `{"path": ".../from-dropbox/<name>"}`, folder created | — |
| Mismatch / cut | other bytes; broken transfer; `RequestException`, `OSError`, `RateLimitError` mid-transfer | nothing left in `from-dropbox/`, earlier file kept | `download_incomplete` |
| Sign-in | `AuthError`, `SigninError` | nothing written | `dropbox_signin` |
| Other | name Dropbox doesn't hold (`ApiError`), any other exception, `from-dropbox` is a symlink or not a folder | nothing written | `other` |

</intent-contract>

## Code Map

- `backend/bookvie_dropbox/server.py` -- `build_server`: registers only `upload_backup`; `call_tool` raises `MCPError` for any other name; `_answer`/`_error` build the answers. Extend to three tools, dispatch by name; `_error` takes any refusal with `cause`/`message`.
- `backend/bookvie_dropbox/upload.py` -- reuse `_list_backups(dbx)` (pages `/.backups`, missing folder → `[]`), `DROPBOX_FOLDER`, `_connect` pattern, `SIGNIN_COMMAND` message shape. `UploadRefused` asserts `cause in CAUSES`, so it can't carry `download_incomplete`.
- `backend/bookvie_dropbox/contracts.py` -- `daily_date`, `ContentHasher`, `BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `FROM_DROPBOX`, `CAUSES` (read-only).
- `backend/bookvie_dropbox/dropbox_api.py` -- `SigninError`, `SIGNIN_COMMAND` (read-only).
- `backend/bookvie/intents/backup_file.py` `_candidates` -- bookvie lists `from-dropbox/` daily regular files, skips a symlinked `from-dropbox/` and `.tmp*` names (read-only; temp names must not be daily names).
- `backend/tests/test_dropbox_download.py` -- the 6 red leaves (AC-1…AC-6), `@pytest.mark.skip(reason=RED_13_7)`.
- `backend/tests/test_dropbox_upload.py:115` -- exact tool list, red until both tools register; no edit needed.
- `backend/tests/dropbox_fakes.py` -- `FakeDropbox.files_download` returns `(FileMetadata, FakeDownload)`; faults `other_bytes`, `broken_transfer`, `signin`, `unexpected`.
- `docs/dropbox-backup.md` "Restoring" -- lists bookvie's three restore tools; add bookvie-dropbox's two.
- Deferred-work intake: none name story 13.7 unresolved (line 1479's "Story 13.2 or 13.7" content-hash entry is already resolved by Story 13.2).

## Tasks & Acceptance

**Execution:**
- `backend/bookvie_dropbox/download.py` (new) -- `DownloadRefused(cause, message)` with `DOWNLOAD_CAUSES`; `list_backups(connect)` and `download_backup(name, target, connect, *, home=None)` per the matrix -- one module per tool family, as `upload.py`.
- `backend/bookvie_dropbox/server.py` -- register `list_backups` and `download_backup` after `upload_backup` with schemas and verbatim descriptions; per-tool argument checks; map unexpected exceptions to `other` without details -- AC-1, AC-4.
- `backend/tests/test_dropbox_download.py` -- remove the 6 skip markers and `RED_13_7` -- the leaves are the acceptance tests.
- `docs/dropbox-backup.md` -- in "Restoring", a short paragraph: bookvie-dropbox's `list_backups` and `download_backup`, where a download lands for each `target`, that it appears only once it matches Dropbox's copy, and that `list_local_backups` then lists it as `from_dropbox` -- AR61.

**Acceptance Criteria:**
- Given the stdio server, when a client lists tools, then it holds exactly `upload_backup`, `list_backups`, `download_backup` with their story descriptions, and none deletes, moves, renames or restores.
- Given a downloaded file, when bookvie's `list_local_backups` and `preview_restore` read it, then it is `from_dropbox` with the same `contentHash` as `list_backups` gave, and previews like the same daily backup in the backups folder.
- Given the I/O matrix, when `npm run check` runs, then the six 13.7 leaves and the rest of the suite pass and the coverage gate holds.

### Review Findings

Code review of 2026-11-23, in a new session, on `4a64962..eb7c151`, with five layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor and spine-check. The layers filed 28 findings: 0 decision-needed, 1 patch, 6 defer and 21 rejected. No AC needs a manual run: all three are covered by tests (Story 13.8 runs the first real download).

- [x] [Review][Patch] The best-effort folder fsync after the rename (the build review's medium EC-1 patch) has no test: replacing `contextlib.suppress(OSError)` with `if True:` leaves all 14 download tests passing, so a failed folder fsync could again answer `download_incomplete` "Nothing was written" with the verified file in place [`backend/bookvie_dropbox/download.py:208`]
- [x] [Review][Defer] AD-22 Backup time: `list_backups` reports and sorts by `client_modified`, not the zip entry's time [`backend/bookvie_dropbox/download.py:99`] — deferred: spine drift, reconciled before the next epic. Already logged in `deferred-work.md` by the build, so no second entry was added.
- [x] [Review][Defer] AD-22 Dropbox tools, `list_backups`: daily `FileMetadata` only, newest first, `{"backups": [...]}` with `name`, a missing folder `[]`, its own causes [`backend/bookvie_dropbox/download.py:79`] — deferred: spine drift. Already logged by the build.
- [x] [Review][Defer] AD-22 Dropbox tools, `download_backup`: the size check, the symlinked `from-dropbox` refusal, the best-effort folder fsync, `{"path": ...}`, and `download_incomplete` also covering `RateLimitError` and local `OSError` [`backend/bookvie_dropbox/download.py:178`] — deferred: spine drift. Already logged by the build.
- [x] [Review][Defer] AD-22 Causes, Copied contracts and AD-9: `DOWNLOAD_CAUSES` is a second cause set, and both tools answer `{cause, message}` with a bad argument set as `other` [`backend/bookvie_dropbox/server.py:153`] — deferred: spine drift. Already logged by the build.
- [x] [Review][Defer] AD-1: `mkdir(parents=True)` can create a missing backups folder, not only `from-dropbox/` [`backend/bookvie_dropbox/download.py:164`] — deferred: spine drift. Already logged by the build.
- [x] [Review][Defer] The Paradigm and Seed diagrams, the Seed's `bookvie_dropbox/` line, the Stack rows and the Testing row still say "planned", and the Capability map lists `list_backups` under FR-29 [`ARCHITECTURE-SPINE.md`] — deferred: spine drift. Already logged, by the build's third entry and by Story 13.2's "planned" entry.
- Full check after the patch, 2026-11-23: `npm run check` exited 0 (pytest 2445 passed, unit 395 passed, e2e 803 passed, smoke ok; coverage gate `bookvie_dropbox` 95.39%). Applied: `test_a_failed_folder_fsync_after_the_rename_still_answers_the_verified_download` in `test_dropbox_download_edges.py` makes every fsync after `os.replace` raise `OSError` and asserts the answer's path, the verified bytes and no leftover temp file; the mutation `contextlib.suppress(OSError)` → `if True:` failed it, and that edit was reverted.

**Rejected:**
- `low` (blind+edge) A Dropbox 5xx (`InternalServerError`) from the download answers `other` without "try again". The spec's matrix sends "any other exception" to `other`; `upload_backup` maps the same 503 to `other` and pins it (`test_dropbox_upload.py:308`); and the SDK already retries 5xx four times (`max_retries_on_error=4`). Changing it is a cause-contract change for both tools, not a fix.
- `low` (blind) The edges test's "mid-transfer" faults are raised by `files_download`, before `mkstemp`. A fault inside the stream takes the same `finally` cleanup that AC-5's `broken_transfer` exercises mid-stream, and the cause mapping per exception type is what the edges test pins.
- `low` (blind+edge) A process killed mid-download leaves a hidden `.*.tmp` in `from-dropbox/`. It needs the server killed during a transfer, bookvie already skips `.tmp*` names, and the fix adds a sweep.
- `false` (blind) A download is mode 0600. bookvie and bookvie-dropbox run as the same user on a single-user Mac, so bookvie reads it, and nothing else needs to.
- `false` (blind) A download already present is fetched again. That is the spec's behavior: a verified download replaces an earlier one, and the guide says so.
- `false` (blind) `getattr(metadata, "size"/"content_hash", None)` could hide a missing field. The SDK's `FileMetadata` from `files_download` always carries both.
- `false` (blind) The build triage's tally miscounts medium and low. The fix edits this spec's own bookkeeping, and the follow-up decision rests on one root cause (EC-1/EC-7/BH-1), which the log says.
- `false` (blind+acceptance) The Code Map and Verification don't name `test_dropbox_download_edges.py`. The fix edits the spec under review; `npm run check` runs the file, and the Auto Run Result's own run lists it.
- `false` (blind) Some refusals lack "Nothing was downloaded."/"No backups were listed.". They start "Not downloaded:", or refuse the arguments before any listing, so the fact is already stated.
- `low` (blind) The guide doesn't say to reinstall and restart to get the two new tools. The guide already says to reinstall bookvie to update `bookvie-dropbox`, and download troubleshooting is Story 13.8's (spec "Never").
- `false` (blind) The returned path may disagree with bookvie's under a symlinked backups folder. Both sides resolve the folder (`landing.resolve()`, bookvie's `resolve_backup_path`), and the reviewer agrees it works.
- `low` (blind) `DownloadRefused` checks its cause with `assert`. It copies `UploadRefused`, every cause is a literal in two modules, and tests run with assertions on.
- `low` (edge) `from-dropbox/<name>` as a folder gives `download_incomplete` on every retry. Only a person could make that folder, and the fix adds a branch (the same call as the build review's EC-2).
- `low` (edge) Every `ApiError` gets the "may not hold that backup" message. The message already hedges ("couldn't give … may not hold"), and splitting the error union adds branches.
- `maybe-false` (edge) `_close(dbx)` raising after a verified download would answer `other`. `Dropbox.close` closes a `requests` session, which doesn't raise in practice; if true it is low.
- `maybe-false` (edge) A symlink swapped in between `_check_landing` and the write (TOCTOU). It needs a local process racing a single-user Mac; if true it is low (the build review's BH-9).
- `low` (acceptance) A failed download can leave an empty `from-dropbox/` (or backups folder). The spec's check order puts `mkdir` before `files_download`, no file is written, and the AD-1 side is deferred as spine drift.
- `low` (acceptance) "Nothing was written" could read as "no local copy" when an earlier download stays. It describes this download; the guide says an earlier one stays as it was.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 37 findings — high 0, medium 1, low 20, false 9, maybe-false 7
- findings:
  - `[false]` `[reject]` IA-1 Everything but the stdio tool list runs against `FakeDropbox`, not the real SDK — by design (AR46: no test touches the network); the fake uses the SDK's own types and method names.
  - `[low]` `[defer]` IA-2 `backupTime` is `client_modified`, not the zip entry's time (AR48) — the story's AC-2 asks for `client_modified`, which `upload_backup` stamps from the zip entry; spine drift, grouped with SC-1.
  - `[low]` `[reject]` IA-3 The read scope is tested only through the refusal cases — the path is always `/.backups/<name>` after the daily-name check, and AC-4's 20 argument sets cover `..`, paths and safety-copy names; another test adds nothing.
  - `[false]` `[reject]` IA-4 "A same-day name never lands in the backups folder" has no dedicated test — AC-3 asserts the backups folder's same-day file is untouched (`test_dropbox_download.py` AC-3).
  - `[false]` `[reject]` IA-5 Verification checks size as well as hash — stricter than the AC, which the spec states; not a defect.
  - `[low]` `[reject]` IA-6 The registered `bookvie-dropbox` in this session lists only `upload_backup` — a reinstall of the wheel and an MCP restart pick up any release; Story 13.8 runs the tools for real.
  - `[medium]` `[patch]` EC-1 A failed folder fsync after `os.replace` answered `download_incomplete` "Nothing was written" with the file in place — patched: the folder fsync after the rename is best effort (`contextlib.suppress(OSError)`), so the verified download answers its path.
  - `[low]` `[reject]` EC-2 `from-dropbox/<name>` existing as a folder gives `download_incomplete` forever — only a person could make that folder; the fix adds a branch.
  - `[low]` `[reject]` EC-3 A `mkstemp` permission fault reads as a broken transfer — the spec's matrix maps `OSError` mid-transfer to `download_incomplete`; a read-only `~/bookvie-backups/from-dropbox` is rare, and splitting causes adds branches.
  - `[low]` `[patch]` EC-4 Every `ApiError` said "Dropbox has no daily backup" — patched: the message now says Dropbox couldn't give the file and that it may not hold it.
  - `[low]` `[patch]` EC-5 A symlinked or file `from-dropbox` refusal appended the name/target usage hint — patched: `_check_landing` raises its own message without the hint.
  - `[maybe-false]` `[reject]` EC-6 `response.close()` raising in `finally` would mask a result — `requests.Response.close` releases the connection and doesn't raise in practice; if true it would be low.
  - `[medium]` `[patch]` EC-7 (claim) A failure after the rename contradicts "leaves an existing file untouched" — same root cause as EC-1; patched with it.
  - `[medium]` `[patch]` BH-1 Wrong message after a successful replace — same as EC-1; patched with it.
  - `[low]` `[patch]` BH-2 Every `ApiError` reported as a missing file — same as EC-4; patched with it.
  - `[low]` `[reject]` BH-3 Local write faults reported as transfer faults — same as EC-3; rejected with it.
  - `[low]` `[patch]` BH-4 The guide said neither tool deletes or moves, but a verified download replaces an earlier one — patched: the paragraph now says a verified download replaces an earlier download of the same name.
  - `[low]` `[reject]` BH-5 `target` has no `enum`, `name` no `pattern` — the spec fixes both as strings; a wrong value is refused with a message naming the allowed values.
  - `[low]` `[reject]` BH-6 `download.py` imports the private `upload._list_backups` — a refactor that breaks it fails AC-2 at once; renaming adds churn to 13.2's module for no user harm.
  - `[maybe-false]` `[reject]` BH-7 Exception mapping is duplicated across server and module, and `landing.resolve()` can raise past the cleanup — `resolve()` after a successful `mkdir` and lstat check doesn't raise in practice, and the server's catch-all still answers `other`; if true it is low.
  - `[low]` `[patch]` BH-8 `list_backups`'s `other` message dropped "No backups were listed." — patched: it ends with that sentence like the other branches.
  - `[maybe-false]` `[reject]` BH-9 A symlink swapped in between the check and `resolve()` (TOCTOU) — needs a local attacker racing a single-user Mac; bookvie's own `_candidates` skips a symlinked `from-dropbox`; if true it is low.
  - `[low]` `[patch]` BH-10 Missing tests (mkdir failure, non-signin connect failure, extra arguments, `AuthError` from the download, `OSError` after verify) — patched the extra-argument case (with VG-3); `AuthError` from the download is already AC-5's `signin` fault (its first call is the download); the others are error branches the 95% coverage already reaches or would only be low.
  - `[false]` `[reject]` BH-11 No check that a success leaves no `.tmp` file — AC-3 asserts `from-dropbox/` holds only the one name after the download.
  - `[low]` `[reject]` BH-12 The spec's Code Map and Verification don't list `test_dropbox_download_edges.py` — the fix edits this build's spec.
  - `[low]` `[defer]` SC-1 Spine drift (AD-22 Backup time): `list_backups` reports and sorts by the `client_modified` the upload stamped, not by reading the zip.
  - `[low]` `[defer]` SC-2 Spine drift (AD-22 Dropbox tools, `list_backups`): newest first, daily `FileMetadata` only, `{"backups": [...]}`, missing folder `[]`, causes `dropbox_signin`/`other` aren't in the spine.
  - `[low]` `[defer]` SC-3 Spine drift (AD-22 Dropbox tools, `download_backup`): size check, symlinked `from-dropbox` refusal, folder fsync and the cause mapping go past the spine's text.
  - `[low]` `[defer]` SC-4 Spine drift (AD-22 Causes, Copied contracts): `DOWNLOAD_CAUSES` is a second, uncopied cause set beside the closed enum.
  - `[low]` `[defer]` SC-5 Spine drift (AD-1): `mkdir(parents=True)` also creates a missing backups folder, not only `from-dropbox/`.
  - `[low]` `[defer]` SC-6 Spine drift (AD-9, AD-22 Causes): the two new tools also answer `{cause, message}`, and a bad argument set is `other`, not `invalid_fields`.
  - `[low]` `[defer]` SC-7 Spine drift (Structural Seed, Capability map, Testing row): `list_backups`/`download_backup` still read as planned, and `list_backups` sits under FR-29.
  - `[maybe-false]` `[patch]` VG-1 The response being closed is never asserted (pre-verified gap) — patched: `FakeDropbox.responses` keeps each response; AC-3 and AC-5 assert all were closed; mutation (`response.close()` → `pass`) now fails 2 tests.
  - `[maybe-false]` `[patch]` VG-2 The folder fsync after the rename is never asserted (pre-verified gap) — patched: AC-3 asserts an fsync after the rename; mutation (`_fsync_folder` → `pass`) now fails it.
  - `[maybe-false]` `[patch]` VG-3 `download_backup` with an extra argument is never tested (pre-verified gap) — patched: `REFUSED_ARGUMENTS` gains `{name, target, path}`.
  - `[maybe-false]` `[reject]` VG-4 The tie-break by name isn't exercised — two uploads stamped with the same second can't come from daily runs; only order would change; low.
  - `[false]` `[reject]` VG-5 (other) The folder fsync failure message — same as EC-1, already patched.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- "Newest first" orders by `client_modified`, which is the backup time `upload_backup` stamps; it matches the description's "the time the backup was made". Ties fall back to the name, descending.
- Check order in `download_backup`: arguments → `from-dropbox` not a symlink/non-folder (if it exists) → `connect()` → `mkdir(parents=True, exist_ok=True)` → `files_download` → stream with `iter_content` into `tempfile.mkstemp(dir=landing, prefix=".", suffix=".tmp")`, hashing with `ContentHasher` → fsync, close → verify → `os.replace` → fsync folder. Return the resolved landing folder joined with `name`.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_dropbox_download.py tests/test_dropbox_upload.py tests/test_dropbox_backup_guide.py` -- expected: all pass
- `npm run check` -- expected: exit 0 (format, lint, tests, coverage gate)

## Auto Run Result

Status: in-review

**Summary:** `bookvie-dropbox` now registers `upload_backup`, `list_backups` and `download_backup`. `list_backups` answers the daily backups in `/.backups`, newest first by `client_modified`, as `{name, backupTime, size, contentHash}`. `download_backup(name, target)` checks its arguments and `from-dropbox` before connecting, streams `/.backups/<name>` into a temporary file in `~/bookvie-backups[-dev]/from-dropbox/`, fsyncs it, checks size and content hash against Dropbox's metadata, then renames it onto `<name>` and fsyncs the folder. Causes: `dropbox_signin`, `download_incomplete`, `other`.

**Files changed:**
- `backend/bookvie_dropbox/download.py` (new) -- `list_backups`, `download_backup`, `DownloadRefused`, `DOWNLOAD_CAUSES`.
- `backend/bookvie_dropbox/server.py` -- registers the two tools with epics.md's descriptions and strict schemas; dispatch by name; shared `_success`/`_error`.
- `backend/tests/test_dropbox_download.py` -- the 6 ATDD leaves un-skipped; review added an extra-argument refusal, a folder-fsync-after-rename assertion and response-closed assertions.
- `backend/tests/test_dropbox_download_edges.py` (new) -- the matrix rows the ATDD leaves don't reach: list failures, a symlinked or file `from-dropbox`, rate limit / OSError / timeout, listed metadata matching the downloaded bytes.
- `backend/tests/dropbox_fakes.py` -- `FakeDropbox.responses` keeps each download response.
- `docs/dropbox-backup.md` -- "Restoring" gains a paragraph on `list_backups` and `download_backup`.

**Review:** 37 findings (high 0, medium 1, low 20, false 9, maybe-false 7). Patched: the folder fsync after the rename is best effort, so a verified download never answers "Nothing was written" (medium; EC-1/EC-7/BH-1/VG-5); the `ApiError` message; the `from-dropbox` refusal message; `list_backups`' `other` message; the guide's replace sentence; and three test gaps (response closed, fsync after rename, extra argument). Deferred: 3 spine-drift entries (AD-22 tool details and backup time; the download cause set and error shape; AD-1 mkdir and "planned" markers), also in `deferred-work.md`. Rejected with reasons in the Review Triage Log: IA-1, IA-3–IA-6, EC-2, EC-3, EC-6, BH-3, BH-5–BH-7, BH-9, BH-11, BH-12, VG-4.

**Follow-up review recommended:** false (patched by verdict: medium 1, low 5, maybe-false 3; no high, fewer than two medium).

**Verification:** `uv run pytest -q tests/test_dropbox_download.py tests/test_dropbox_download_edges.py tests/test_dropbox_upload.py tests/test_dropbox_backup_guide.py` -- 48 passed. Mutations `response.close()` → `pass` (2 tests fail) and `_fsync_folder` → `pass` (1 test fails), each reverted. `npm run check` after the patches -- exit 0: pytest 2444 passed, coverage gate `bookvie_dropbox` 95.39%, e2e 803 passed, smoke passed.

**Residual risks:** nothing runs against the real Dropbox SDK's download (by design, AR46); Story 13.8's manual restores are the first real download. The `bookvie-dropbox` server registered in Claude Code needs the wheel reinstalled and a restart to show the two new tools.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
