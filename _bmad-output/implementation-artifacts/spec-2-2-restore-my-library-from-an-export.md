---
title: 'Story 2.2: Restore my library from an export'
type: 'feature'
created: '2026-11-04'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '8764e0ce9c5e156ebdcbbbcea78cf0b27977c83d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An export can be made (Story 2.1) but not used. On a new laptop, or after a dead disk, there is no way to put the library back.

**Approach:** Add the `restore` intent (`POST /api/intents/restore`, multipart: `intent` `{}` plus the file part `archive`). Under one AD-4 lock it empties `.staging/`, unpacks the zip there, validates the whole archive (migrating an older `schemaVersion` through the startup chain), applies it in AD-12 order and always empties `.staging/` again. On the Backup page, **Restore from file…** becomes a file picker plus Confirm dialog. Turn on the 10 ATDD leaves (`backend/tests/test_restore.py`, `frontend/e2e/restore.spec.ts`). The criteria are epics.md → Story 2.2, AC-1…AC-10 in the checklist, whose "Contract the Scaffolds Pin" fixes every name, copy string and log line.

## Boundaries & Constraints

**Always:**
- AD-1: everything that touches the data folder (`.staging/`, `covers/`, `library.json`) lives in `store/`. The intent orchestrates; it doesn't open data-folder paths itself.
- One `with store.lock:` around the whole restore, staging included. `Store.apply` and the restore share one locked core, so the lock is never taken twice (it isn't reentrant).
- Unpack accepts only `library.json` and `covers/<name>` (`cover_name` rules). A missing `covers/` means no covers.
- Startup and restore share one parse-and-validate path: UTF-8, JSON object, integer `schemaVersion`, `migrations.migrate` when older (read through the module at call time), model validation, `check_invariants`. Startup keeps its exact `StartupError` messages.
- Every referenced cover must be in the archive and decode with Pillow (cover.py's decoder). The archive's bytes are stored unchanged, never re-encoded.
- Apply: write each archive cover that isn't in `covers/` yet through `_write_atomic`, commit `serialize(library)`, swap memory, then sweep `covers/` of files the new library doesn't reference via `_remove_covers` (logs `couldn't delete covers/<name>`, never raises).
- AD-12: a cover name is never overwritten. A cover already in `covers/` is left as it is; only new names are written, so a failure before the commit only removes what restore wrote and `covers/` is byte-identical to before.
- `.staging/` is emptied (files through `fs.remove`) before unpacking and in `finally`. After a successful commit any cleanup failure is logged and the response stays 200.
- No pre-migration backup on restore: the archive is the backup.
- Don't extend `CoverSizeCap` to the restore route.

**Decisions (Oleg, 2026-11-04):**
- Until Story 2.3, every refusal (not a zip, missing or bad `library.json`, a newer `schemaVersion`, a missing or undecodable cover) is one catch-all 422 `restore_invalid` with "This file isn't a bookvie export, or it's damaged. Nothing was changed." A write fault before the commit is 503 `couldnt_save`. One API test pins the 422.
- The Backup page shows any non-OK restore message as one ink `FailureMessage` under Restore, plus `announce('alert')`, and focus returns to **Restore from file…** (Export's failure pattern). The next attempt clears it.
- A cover whose name already exists in `covers/` with different bytes keeps the existing file; the mismatch is logged to stderr (`bookvie: kept covers/<name>; the export's copy differs`) and the restore succeeds. (Decided after review, 2026-11-04.)
- Story 2.3 splits out `restore_newer_version` and `restore_unsafe`, and adds the limits and the full refusal tests.

**Never:**
- Touch `local-state.json`, browser `localStorage`, or anything in the data folder besides `library.json`, `covers/` and `.staging/`.
- Refusal codes `restore_newer_version` / `restore_unsafe`, the archive-safety limits (paths, symlinks, duplicates, 5,000 entries, 1 GB) and their tests. Those are Story 2.3.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Valid export, current version | Zip from `GET /api/export` | 200 `{"ok": true}`; byte-identical `library.json` + covers; old covers removed | N/A |
| Older `schemaVersion` | v1 zip, server at v2 | Migrated once, committed at v2 | N/A |
| No `covers/` entry | Only `library.json` | 200; `covers/` exists and is empty of unreferenced files | N/A |
| Same export twice | Covers already present | 200; no cover rewritten | N/A |
| Same name, other bytes | `covers/<name>` exists, differs | 200; existing file kept; mismatch logged | Logged only |
| Cleanup fault after commit | `FaultyFs("remove")` | 200; `bookvie: couldn't delete covers/<name>` on stderr; startup sweeps | Logged only |
| Garbage upload | Not a zip | 422 `restore_invalid`; `library.json`, `covers/` unchanged; `.staging/` empty | Page shows the ink line under Restore |

</frozen-after-approval>

## Code Map

- `backend/bookvie/store/store.py` -- `Store.apply` (lock → `new_files` → change → validate → `_commit` → swap → remove unreferenced): split into `apply` (takes lock) + a locked core the restore also uses. `_read`/`_validate`/`_migrate` raise `StartupError`: factor the parse/validate into a shared function raising a store-level refusal; startup wraps it with its current messages. `_sweep_covers`, `_remove_covers`, `_write_atomic(target, data, prefix)`, `STAGING_DIR`, `cover_name`, `referenced_covers`. `_sweep` empties `.staging/` at startup (keep; it uses `unlink`/`rmtree` directly, which is fine).
- `backend/bookvie/store/restore.py` (new) or in `store.py` -- empty staging, unpack into staging, `Store.replace_all(library, covers: Mapping[str, Path])` (caller holds the lock). Its rollback reuses `apply`'s: remove only the files it wrote.
- `backend/bookvie/store/__init__.py` -- export the new surface.
- `backend/bookvie/store/migrations/__init__.py` -- `migrate(doc)`, `CURRENT_VERSION`; read both via the module.
- `backend/bookvie/intents/cover.py` -- `_decode(data)` already enforces formats and the pixel limit: expose a public `check_decodable(data)` (or rename) for restore.
- `backend/bookvie/intents/commit.py` -- `log`; the exception → envelope mapping to mirror (`CouldntSave` → 503).
- `backend/bookvie/intents/contract.py` -- `ErrorKind`/`ErrorCode`, `couldnt_save`; add `restore_invalid` (422) per the Decisions.
- `backend/bookvie/intents/export.py` -- the pattern: `with store.lock:` inside the intent.
- `backend/bookvie/http/api.py` -- `delete_book_intent` (multipart `intent` Form) and `edit_book_intent` (`UploadFile`) patterns; plain `def` routes run in the threadpool.
- `backend/tests/test_restore.py` -- 6 skipped leaves; `RecordingFs` logs `replace`/`remove` outside `.staging/`. `tests/helpers.py` has `FaultyFs`, `RecordingLock`.
- `frontend/src/pages/BackupPage.tsx` -- Export's busy/refocus/`running` pattern to mirror; remove `RESTORE_NOT_YET` / `disabledReason`.
- `frontend/src/components/ConfirmDialog.tsx` -- `heading`, `lines`, `confirmLabel`, `onConfirm`, `onCancel`.
- `frontend/src/api/intents.ts` -- `sendIntent(client, verb, FormData)` encodes multipart and invalidates every view.
- `frontend/e2e/restore.spec.ts` -- 4 skipped leaves. `frontend/e2e/backup.spec.ts` -- "[P2] AC-2 … unavailable until restore arrives" asserts `aria-disabled`: keep only its explanation-line check.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/store/store.py`, `store/restore.py`, `store/__init__.py` -- shared parse/validate; `apply` over a locked core; staging empty/unpack; `replace_all` that writes only new cover names and rolls back only those -- AD-1, AD-2, AD-12, AD-13, AD-14.
- [x] `backend/bookvie/intents/cover.py` -- public decode check.
- [x] `backend/bookvie/intents/restore.py` (new), `intents/__init__.py`, `intents/contract.py` -- `restore(store, archive)`: lock → empty → unpack → validate → covers decodable → `replace_all`; `finally` empty staging (log only); map refusals to `restore_invalid` and `CouldntSave` to 503 `couldnt_save`.
- [x] `backend/bookvie/http/api.py` -- plain-`def` `POST /intents/restore` with `intent` (Form, `{}`) and `archive` (`UploadFile`), returns `OkResponse(ok=True)`.
- [x] `backend/tests/test_restore.py`, `test_store.py`, `test_migrations.py` -- un-skip the 6 leaves; add tests for: an unchanged startup message set; the garbage-upload 422 `restore_invalid`; 422 for a referenced cover missing from the archive and for an undecodable cover; 422 for a zip whose `library.json` is newer or breaks an invariant; a commit fault removes the newly written covers (`covers/` byte-identical); a same-name different-bytes cover is kept and logged; a second restore of the same export writes no cover; an intent sent during a restore waits for its lock.
- [x] `frontend/src/api/generated/schema.d.ts` -- `npm --prefix frontend run api:gen`.
- [x] `frontend/src/api/restore.ts` (new) + `api/index.ts` -- `restore(client, file)`: FormData `intent` `{}` + `archive` through `sendIntent`.
- [x] `frontend/src/pages/BackupPage.tsx` (+ `.module.css`) -- hidden `<input type="file" accept=".zip,application/zip">` reset after each pick; ConfirmDialog; Cancel/Esc → focus Restore; confirm → close, busy "Restoring…" after `BUSY_DELAY_MS`, guard double sends; on OK navigate `/`, then `announce('status', 'Restored.')` after focus settles; on failure the ink line under Restore, `alert`, focus back on Restore.
- [x] `frontend/e2e/restore.spec.ts`, `backup.spec.ts` -- un-skip the 4 leaves; update the 2.1 test; add the checklist's green-phase follow-ups that are reachable (fast restore never shows "Restoring…", one request on double confirm, Axe with the dialog open in both themes, Esc after Cancel, the refusal ink line; the line clears on the next confirmed attempt).
- [x] `README.md` -- one short paragraph on restore, next to 2.1's export section.

**Acceptance Criteria:**
- Given the 10 ATDD leaves un-skipped, when the suites run, then all pass and `e2e-count` reports nothing skipped.
- Given a slow intent sent while a restore holds the lock, when both finish, then the intent applied to the restored library.
- Given an archive with covers not yet in `covers/` and a fault at the commit, when restore runs, then `covers/` and `library.json` are byte-identical to before.

## Implementation Notes

**Loop 2:**
- Applied loop 1's patch, then removed displacement: `replace_all` writes only names not yet in `covers/` and rolls back only those; a differing existing cover is kept and logged `bookvie: kept covers/<name>; the export's copy differs`.
- New tests: commit fault removes new covers (`covers/` byte-identical), same-name different-bytes kept and logged, 422 for a missing cover, an undecodable cover, a newer `schemaVersion` and an invariant break. E2E refusal comment fixed; the line clears on the next confirmed attempt. README restore paragraph.
- `npm run check` green: 827 py tests, 185/185 E2E, none skipped; intents+store coverage 95.52%.
- A folder or symlink at a cover's name is kept and logged like a differing file (hand-made only).

**Loop 1 (reverted after review; kept for reference):**
- All 10 ATDD leaves are on (6 in `test_restore.py`, 4 in `restore.spec.ts`). `npm run check` is green (821 py tests, 185/185 E2E, none skipped). Coverage: domain 100%, intents+store 94.12%.
- Store surface: `parse_document`, `validate_document`, `load_library` raise `LibraryRefused`; startup wraps them with its old reasons (pinned by `test_startup_refusals_keep_their_exact_messages`). `apply` = lock + `_apply_locked`; `_commit_and_swap(new, undo)` is the shared core. `Store.replace_all` and `Store.empty_staging(quiet=)`; unpacking is `store/restore.py` `stage_archive`.
- `intents/cover.py`: decoding split into `_load`; public `check_decodable(data)`.
- Added beyond the leaves: the garbage-upload 422 body, the displaced-cover rollback at a commit fault, an `add-book` that waits for a restore's lock, the identical-cover skip on a second restore (matrix row), and E2E follow-ups (button-primary + Axe with the dialog in both themes, Esc after Cancel, fast restore never busy, double click sends one, the refusal ink line).
- `intent` is a required part (422 `invalid_fields` when missing), like every intent; the checklist had said "optional".
- Startup now also turns a `RecursionError` from `json.loads` into the "is not valid JSON" refusal.
- Known edge: if a commit fails and a displaced cover can't be moved back, it stays in `.staging/displaced/` (`keep_displaced`), but the next startup sweep empties `.staging/`.
- Covers are decoded under the lock; a big archive holds the lock longer.
- Not automated: the browser half of AC-10, and the full browser round trip (BKP-E2E-001's full form).

## Spec Change Log

- **Loop 1 → 2 (2026-11-04), triage #1–#3 (intent_gap):** the frozen rule moved a same-named cover with different bytes to `.staging/displaced/` and overwrote it. That breaks AD-12 ("a name is never reused or overwritten"; covers are served `immutable`), and a failed put-back could lose the original (startup sweeps `.staging/`). Oleg decided: keep the existing file, log the mismatch, succeed. Amended: the Always rule, Decisions, matrix, `replace_all` task, the rollback AC, and the test list (adds the patch findings #4–#7 and #28). Known-bad state avoided: any overwrite of `covers/<name>`, any user cover inside `.staging/`.
  - **KEEP:** loop 1's code was saved as a reference patch (deleted after loop 2) and passed `npm run check`. Reuse it except for the displacement: `parse_document`/`validate_document`/`load_library` + `LibraryRefused` (startup messages unchanged), `apply` → `_apply_locked` + `_commit_and_swap`, `stage_archive`/`StagedArchive`/`ArchiveRefused`, `empty_staging(quiet=)`, `check_decodable`, `restore_invalid`, the route, `restore.ts`, the `BackupPage` flow, and every test except the displaced-cover one. Drop `DISPLACED_DIR`, `keep_displaced`, `_existing_bytes`/`_NOT_A_FILE`. Fix the E2E refusal test's "The next attempt clears it" comment so it matches its assertions.

## Review Triage Log

Review pass 1 (2026-11-04): four layers (blind, edge, verification-gap, spine) on `8764e0c..` working tree, `_bmad-output/` and generated types excluded.

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | spine | `replace_all` overwrites an existing `covers/<name>` with different bytes; AD-12 says a name is never overwritten, and covers are served `immutable` | medium | `COVER_CACHE_CONTROL = "public, max-age=31536000, immutable"` (`http/app.py:45`); spine AD-12 l.149. A browser keeps the old image. The overwrite comes from the frozen "displacement" rule. | intent_gap |
| 2 | blind, edge, VG | A failed put-back strands the original in `.staging/displaced/`; startup's `_sweep` deletes it, a later restore overwrites it, `keep_displaced` never resets | medium | `_sweep` rmtrees every `.staging/` entry; `fs.replace(target, aside)` overwrites; flag set once. Same root cause as #1 (displacement). | intent_gap (with 1) |
| 3 | blind | 503 "Your data wasn't changed" is untrue when a put-back failed | medium | `covers/<name>` then holds archive bytes. Same root cause as #1. | intent_gap (with 1) |
| 4 | VG | No test for the missing-cover or undecodable-cover 422 | medium | Deleting the presence/decode loop passes every test. | patch |
| 5 | VG | `replace_all` rollback of newly written covers is untested | medium | The failed-commit test only takes the displaced branch; `written` stays empty. | patch |
| 6 | VG | Bad `library.json` inside a valid zip (newer version, invariant) has no restore test | low | Spec gives the full refusal tests to 2.3; one test pins the catch-all cheaply. | patch |
| 7 | blind, VG | E2E refusal test comment "The next attempt clears it" disagrees with its assertions | low | Line clears on the next confirmed attempt (`setRestoreFailure(null)` in `runRestore`), not on pick; the comment is wrong. | patch |
| 8 | blind, edge | Migration chain that stops short gives 500 not 422 | false | `migrations.migrate` raises `ValueError` when a step doesn't set the next version, and loops to `CURRENT_VERSION`; mapped to `LibraryRefused`. | reject |
| 9 | blind | Frontend restore stuck busy when `restore()` rejects | false | `sendIntent` catches fetch/parse failures and returns `couldntSave()`. | reject |
| 10 | blind, edge | Export and Restore can run at once | false | Both hold the AD-4 lock server-side; an export captures the library wholly before or after. | reject |
| 11 | spine, blind | `schema.d.ts` missing from the diff | false | Excluded from the review diff on purpose; it is regenerated in the tree and `check:api` passed. | reject |
| 12 | edge | `OSError` while reading the spooled upload mid-entry is an unmapped 500 | low | The generic handler still returns an enveloped 500; needs a disk fault on the spool file. Fix adds a branch. | reject |
| 13 | edge | Non-`OSError` from the fs seam in `empty_staging` escapes | low | Only a test seam raises non-`OSError`; enveloped 500 anyway. | reject |
| 14 | edge | `.staging` as a symlink lets unpack write outside the data folder | low | Startup creates a real folder; needs a hand-planted symlink. 2.3's safety rules. | reject |
| 15 | edge | `covers/A.jpg` and `covers/a.jpg` collide on a case-insensitive FS | low | Crafted archive only (minted names are lowercase UUIDs); belongs with 2.3's duplicate-name rule. | defer |
| 16 | edge | A `coverFile` not shaped `covers/<name>` restores as a dangling reference | low | The model accepts any string, at startup too (pre-existing); `cover_name` keeps it from reaching the disk. | defer |
| 17 | blind | Duplicate entries silently last-one-wins | low | Intent "Never": duplicates are Story 2.3. | reject |
| 18 | blind | No upload size cap while the lock is held | low | Intent "Never": the 1 GB limits are Story 2.3. | reject |
| 19 | blind | Re-zipped exports (`__MACOSX/`, `.DS_Store`, a top folder) are refused | low | AD-14 accepts only `library.json` and `covers/<name>`; refusing is the rule. | reject |
| 20 | blind | `check_decodable` doesn't apply the 20 MB cap or ext/format match | low | Restore stores archive bytes unchanged by design; the cap is an upload rule. | reject |
| 21 | spine | Interim `restore_invalid` catch-all and missing limits aren't noted in the spine | low | Spine-text drift; fix edits ARCHITECTURE-SPINE. | defer |
| 22 | spine | AD-12 "Until restore exists…" sentence is now outdated | low | Spine-text drift. | defer (with 21) |
| 23 | blind | Focus falls to `body` while a slow restore runs | low | Same as Export's busy state (native `disabled`); failure refocuses, success moves to `h1`. | reject |
| 24 | edge | Leaving `/backup` mid-restore still navigates to `/` on success | low | Spec says success goes to `/`; rare. Fix adds mounted tracking. | reject |
| 25 | edge | "Restored." may be announced before the `h1` focus lands | low | AC-4 E2E asserts both; passes. | reject |
| 26 | blind | Timing-based tests (fast restore, `join(0.3)`) may flake | low | Same accepted pattern as 2.1 triage #10. | reject |
| 27 | blind | `restore.test.ts` covers the happy path only | low | Refusal parsing is `envelope.ts`'s, tested there. | reject |
| 28 | blind | No README update for restore | low | Story 2.1 updated README in its commit; do the same at commit time. | patch |
| 29 | edge | `test_migrations.py` untouched though the task names it | false | AC-5 exercises the chain through restore; no migration-module change needed a test there. | reject |
| 30 | edge | `_existing_bytes` treats a folder named like a cover as displaceable | low | Hand-made folder only; goes away with #1's fix. | reject |

Review pass 2 (2026-11-04, loop 2): the same four layers on the re-derived tree.

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 31 | spine | Interim `restore_invalid` catch-all, missing limits, outdated "Until restore exists" sentence | low | carried #21/#22: spine-text drift. | defer (carried) |
| 32 | spine | AD-14 byte-identical vs AD-12 no-overwrite: the spine doesn't say which wins | low | Oleg's loop-2 decision; recording it edits the spine. | defer (with 31) |
| 33 | spine | Restored covers skip AD-12's downscale/re-encode output rules | low | carried #20: the round trip requires the archive's bytes unchanged; spine needs the exemption noted. | defer (with 31) |
| 34 | blind, edge | A kept existing cover that is a folder, dangling symlink or corrupt file leaves the library pointing at it | low | Oleg's decision keeps the existing file; a folder/symlink needs a hand-made entry (carried #30). | reject |
| 35 | blind | `_sweep` and `empty_staging` empty `.staging/` two ways (fatal vs logged) | low | Startup's behaviour predates this story and is deliberate (refuse to start); routing it through the seam changes startup. | reject |
| 36 | blind, edge | Non-`OSError` from the seam, an `OSError` reading the spool, or one at `close()` escapes as a generic 500 | low | carried #12/#13; the generic handler still answers an envelope. Needs a disk fault on flush. | reject (carried) |
| 37 | blind | Staging writes bypass the `FileSystem` seam, so a staging-write 503 is untestable | low | 2.3 owns the fault tests (copy-in and commit); staging is scratch. | reject |
| 38 | blind | The page reads the whole archive into memory (`arrayBuffer()`) before sending | low | `requestInit` encodes any file form; covers are ≤1200px, so a few hundred MB at most. Belongs with 2.3's 1 GB limit. | defer |
| 39 | blind | Re-zipped exports are refused with the generic message | low | carried #19. | reject (carried) |
| 40 | blind, VG | `stage_archive` refusals untested: no `library.json`, an extra entry, a CRC-damaged entry | medium | VG ran them: 422 today, but removing each branch passes every test. | patch |
| 41 | blind | Other refusal branches untested: non-UTF-8/invalid JSON `library.json`, a failing migration step, malformed/missing `intent`, missing `archive` | low | Partly covered by #42; the JSON and migration branches are shared with startup tests. | patch (with 42 for `intent`) |
| 42 | VG | Restore is missing from `INTENT_ROUTES` (malformed body, missing `intent`, foreign caller 403) | medium | `test_intent_routes.py:29-35` lists four routes; the docstring promises every intent route. | patch |
| 43 | VG | No runtime test that a restore body over `BODY_LIMIT` isn't 413 | medium | Only OpenAPI is checked; adding the path to `CoverSizeCap` passes every test. | patch |
| 44 | blind | OpenAPI marks `intent` optional though it is required at runtime | false | Every intent route declares `str \| None = None` and refuses `None` in `parse_form_intent`; same contract. | reject |
| 45 | blind | `backup.spec.ts` AC-2 now only checks visibility | low | A regression back to `disabledReason` would pass. Direct fix: assert enabled and no description. | patch |
| 46 | blind | Frontend 503/network failure on restore isn't tested; a network failure may have committed | low | Same `sendIntent` pattern as every intent; refusal line is tested. | reject |
| 47 | blind | The Confirm dialog doesn't name the picked file | low | The copy is pinned by epics/EXPERIENCE; a change is a UX decision. | reject |
| 48 | blind | Concurrency test hides thread exceptions and uses a 0.3 s join | low | carried #26. | reject (carried) |
| 49 | blind | README "15 of 41 stories done" and "currently story 2.1" are stale | low | Direct text correction. | patch |
| 50 | blind | `BUSY_DELAY_MS` comment wording | low | Cosmetic. | reject |
| 51 | blind | Generated types, sprint-status and spec not in the review diff | false | carried #11: excluded on purpose. | reject (carried) |
| 52 | edge | Case-insensitive cover-name collision | low | carried #15. | defer (carried) |
| 53 | edge | `.staging` as a symlink | low | carried #14. | reject (carried) |
| 54 | edge | Leaving `/backup` mid-restore still navigates to `/` | low | carried #24. | reject (carried) |
| 55 | edge | `test_migrations.py` untouched | false | carried #29. | reject (carried) |
| 56 | VG | `RecursionError` → startup refusal isn't pinned | low | One extra parametrize case. | patch |

## Design Notes

**Why the locked core:** `threading.Lock` isn't reentrant, and AC-3 asserts one acquire. So `apply` becomes `with self.lock: return self._apply_locked(...)`, and `replace_all` (lock already held by the restore intent) reuses the same commit-swap-sweep tail.

**Why never overwrite:** AD-12 forbids reusing a cover name, and covers are served `immutable`, so an overwritten file would keep showing the old image. Minted names are unique, so a same-named cover is normally identical; a differing one (local corruption or a hand-edited archive) keeps the existing file and is logged.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, coverage gate OK.
- `npm run check` -- expected: py, api, e2e and smoke green; no skipped E2E.
