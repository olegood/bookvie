---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-04'
storyId: '2.2'
storyKey: '2-2-restore-my-library-from-an-export'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-22-restore-my-library-from-an-export'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md'
generatedTestFiles:
  - 'backend/tests/test_restore.py'
  - 'frontend/e2e/restore.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 2.2, Story 2.3 for scope edges, Conventions for every story)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-2, AD-3, AD-4, AD-12, AD-13, AD-14, AD-15)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Backup page, Confirm dialog, Flow 8, State patterns, Live regions)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Backup page, Busy button, Confirm dialog)'
  - '_bmad-output/test-artifacts/test-design-qa.md (BKP-API-001, BKP-API-005, BKP-API-006, BKP-E2E-001)'
  - '_bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md'
  - 'backend/tests/conftest.py, backend/tests/helpers.py, backend/tests/builder.py, backend/tests/test_export.py, backend/tests/test_migrations.py'
  - 'backend/bookvie/store/store.py, backend/bookvie/store/migrations/__init__.py, backend/bookvie/store/fs.py, backend/bookvie/domain/invariants.py, backend/bookvie/intents/export.py, backend/bookvie/intents/contract.py, backend/bookvie/http/api.py'
  - 'frontend/e2e/fixtures.ts, frontend/e2e/backup.spec.ts, frontend/e2e/delete-book.spec.ts, frontend/e2e/intents.ts, frontend/e2e/library.ts'
  - 'frontend/src/pages/BackupPage.tsx, frontend/src/components/ConfirmDialog.tsx, frontend/src/main.tsx, frontend/src/lib/theme.ts, frontend/src/lib/catalogView.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Pressing Restore from file… and picking a file opens an alertdialog asking "Replace all data with this file? Your current books, readings and card notes will be replaced.", with Replace all data and Cancel; Cancel has default focus' }
  - { id: AC-2, idSource: generated, text: 'In the Confirm dialog, Cancel or Esc changes nothing and focus returns to Restore from file…' }
  - { id: AC-3, idSource: generated, text: 'Confirming a valid export at the current schemaVersion runs restore (POST /api/intents/restore, multipart, one call): .staging/ is emptied and the archive unpacked into it, the whole file is validated (schema, AD-18 invariants, every referenced cover present and decodable) before anything is replaced, then applied in AD-12 order (archive covers in, library.json commit (AD-2), unreferenced covers deleted); the whole operation holds the AD-4 lock' }
  - { id: AC-4, idSource: generated, text: 'A successful restore shows "Restored." in the status region, goes to the launch page / with the restored data, focus on its h1; local-state.json ("Last export") and the browser preferences (theme, Catalog view, sort) are left as they were' }
  - { id: AC-5, idSource: generated, text: 'A valid export at an older schemaVersion (test fixture) is migrated through the same store/migrations/ chain used at startup, then replaces the current data' }
  - { id: AC-6, idSource: generated, text: 'A library exported and then restored at the same schemaVersion has library.json and every cover byte-identical to the originals (BKP-API-001)' }
  - { id: AC-7, idSource: generated, text: 'A restore taking longer than about 300 ms shows the button as "Restoring…", disabled until it finishes' }
  - { id: AC-8, idSource: generated, text: 'At server start, leftovers in .staging/ from an interrupted restore are deleted; .staging/ is also emptied after every restore, succeeded or refused' }
  - { id: AC-9, idSource: generated, text: 'An export from a library with no covers restores successfully, with a missing covers/ treated as empty' }
  - { id: AC-10, idSource: generated, text: 'When the document commit succeeded and a fault is injected while deleting unreferenced covers or emptying .staging/, the response is still success and "Restored." is shown, the failure is logged to stderr, and the startup sweep removes the leftovers (AD-12)' }
---

# ATDD Checklist - Epic 2, Story 2.2: Restore my library from an export

**Date:** 2026-11-04
**Author:** Oleg
**Primary test levels:** API (pytest against the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to restore everything from an export file onto a fresh install, so that a new laptop shows my library exactly as I left it.

**The server half:**
- `POST /api/intents/restore` takes the zip as one multipart intent.
- It empties `.staging/`, unpacks the archive there and validates the whole file.
- It then applies the result in AD-12 order, all under the AD-4 lock.
- An older `schemaVersion` goes through the startup migration chain (AD-13).
- A failed cleanup after the commit is logged and left to the startup sweep.

**The client half:**
- **Restore from file…** opens a file picker, then the Confirm dialog.
- A slow restore shows a busy "Restoring…" button.
- On success the page announces "Restored." and goes to `/`.

**Story source:** `epics.md` → Story 2.2. There is no spec file yet: `sprint-status.yaml` has `2-2-restore-my-library-from-an-export: backlog`. When `spec-2-2-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`). The spec should adopt the names under "Contract the Scaffolds Pin" or change the scaffolds along with them.

**Out of scope here (Story 2.3):**
- Every refusal: `restore_invalid`, `restore_newer_version`, `restore_unsafe`, and `couldnt_save` before the commit.
- The archive-safety rules: paths, symlinks, duplicates, entry and size limits.
- The refusal line on the Backup page.

Story 2.2 still has to *call* the validation (AC-3), but the tests that prove each refusal belong to 2.3.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 2.1.

**Generation mode:** AI generation from the criteria, the UX and architecture docs, and the existing code. There was no browser recording, because the restore UI doesn't exist yet. Every locator comes from a role and name the criteria or EXPERIENCE.md pin.

**Execution:** **sequential** with one author, as in Stories 1.6 to 2.1. `tea_execution_mode: auto` would have chosen subagents, but the context was already loaded, and one author keeps the seeds and helpers consistent across both halves.

**Decisions confirmed with Oleg (2026-11-04):**
- **The request:** multipart, with a JSON part `intent` holding `{}` and the zip in a file part named **`archive`**.
- **The busy button:** confirming closes the dialog, and **Restore from file…** itself becomes the busy "Restoring…" button. This matches Story 2.3, where refusals show under Restore and focus returns to that button.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-10, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Restore from file… + a file → `alertdialog` with the exact copy; Cancel focused | E2E | P1 | `[P1] AC-1` |
| AC-2 | Cancel or Esc → nothing changes; focus back on Restore from file… | E2E | P1 | `[P1] AC-2` |
| AC-3 | Valid export → staged, validated, AD-12 order, one AD-4 lock | API | P0 | `test_ac3_p0_…` |
| AC-4 | "Restored.", `/` with the restored data, `h1` focused; Last export and preferences untouched | E2E | P1 | `[P1] AC-4` |
| AC-5 | Older `schemaVersion` → migrated through the startup chain, then restored | API | P1 | `test_ac5_p1_…` |
| AC-6 | Export → restore is byte-identical (BKP-API-001) | API | P0 | `test_ac6_p0_…` |
| AC-7 | Slow restore → "Restoring…", disabled until done | E2E | P2 | `[P2] AC-7` |
| AC-8 | `.staging/` emptied after every restore, and at startup | API | P1 | `test_ac8_p1_…` |
| AC-9 | No `covers/` in the archive → success, `covers/` treated as empty | API | P1 | `test_ac9_p1_…` |
| AC-10 | Fault after the commit → still 200, logged, swept at startup | API | P1 | `test_ac10_p1_…` |

**Priorities:**
- **AC-3 and AC-6 are P0.** They are the restore itself and the epic gate's byte-identical round trip (R-02, BKP-API-001).
- **AC-1, AC-2 and AC-4 are P1:** the confirm step that guards "replace everything", and Flow 8's outcome (BKP-E2E-001).
- **AC-5 is P1** (R-15, BKP-API-006). It runs on a fixture chain today, because `CURRENT_VERSION` is still 1.
- **AC-8, AC-9 and AC-10 are P1:** data-folder hygiene and the AD-12 "after the commit it has succeeded" rule (BKP-API-005's post-commit half).
- **AC-7 is P2:** the busy state, as in 2.1 AC-4.

**Level split (no duplicate coverage):**
- **API:** what restore does to the data folder.
- **E2E:** what the page shows and where focus goes.
- **AC-4 is E2E.** Its "Last export" half is checked on disk inside the same leaf (the `local-state.json` bytes), so it needs no API twin.
- **AC-10's '"Restored." is shown' half** is a green-phase E2E follow-up.

---

## Story Integration Metadata

- **Story ID:** `2.2`
- **Story Key:** `2-2-restore-my-library-from-an-export`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 2.2)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md`
- **Generated Test Files:** `backend/tests/test_restore.py`, `frontend/e2e/restore.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 10 in all.
- **Backend leaves** have `@pytest.mark.skip(reason=RED)`, and their names carry `acN_pN`.
- **E2E leaves** use `test.skip(...)`, and their titles carry exactly one `[P#] AC-n`.
- **Red check:** each leaf was un-skipped once on the current code (in a temporary copy, since deleted) and failed at its first assertion, as listed below.
- **Skipped as committed:** `pytest tests/test_restore.py` gives 6 skipped, and `playwright test e2e/restore.spec.ts` gives 4 skipped. The whole backend suite passes (803 passed, 6 skipped). `backup.spec.ts` still passes 11 of 11 after the helper move. Ruff (on the touched files), oxlint and `tsc -b` are clean.

### API Tests (6 tests): `backend/tests/test_restore.py`

The request is `_post_restore(client, archive)`: `intent` `(None, "{}", "application/json")` plus `archive` `("bookvie-export-2026-10-30.zip", <bytes>, "application/zip")`. Archives come from the real `GET /api/export` (`_export`) or are hand-made with `_zip` (for AC-5 and AC-9). The response of an unimplemented restore stays opaque before each leaf's first assertion.

**`[P0] AC-3`: `test_ac3_p0_a_valid_export_replaces_the_library_in_ad12_order_under_one_lock`**

Setup:
- **Source:** Dune is the Main book at p.150, with a card note and a JPEG cover; Neuromancer is unread.
- **Target:** one other Book whose cover (`OLD_COVER`) the restored library doesn't reference.
- **Recording:** a `RecordingLock` replaces `store.lock` and `app.state.write_lock`, and a `RecordingFs` replaces `store.fs`. Both log into one list.

The leaf checks, in order:
1. **The status is 200** (the first assertion), with the body exactly `{"ok": true}`.
2. `library.json` is byte-identical to the source's, and `covers/` is exactly `{DUNE_COVER: <bytes>}`.
3. `/api/views/catalog` lists Dune and Neuromancer, so the in-memory state was swapped too.
4. The log starts with `lock acquired`, ends with `lock released`, and has one acquire.
5. Outside `.staging/`, the log is exactly:
   - `lock acquired`
   - `replace covers/<DUNE_COVER>`
   - `replace library.json`
   - `remove covers/<OLD_COVER>`
   - `lock released`

*Red today: 405 ≠ 200.*

**`[P1] AC-5`: `test_ac5_p1_an_older_schema_version_is_migrated_through_the_chain_then_restored`**

The fixture chain is the `test_migrations` one: `CURRENT_VERSION = 2`, and `STEPS = {1: <step that adds the "migrated" tag>}`. The archive is a hand-made v1 export of Dune tagged `sf`. The target is migrated to v2 at startup, then the step counter is cleared.

The leaf checks, in order:
1. **The status is 200** (the first assertion).
2. The stored `schemaVersion` is 2, and the books are exactly `[("Dune", ["sf", "migrated"])]`.
3. The step ran exactly once (`steps == [1]`), so it was the same chain.
4. `covers/` is empty.

*Red today: 405 ≠ 200.*

**`[P0] AC-6`: `test_ac6_p0_export_then_restore_reproduces_library_json_and_every_cover_byte_for_byte`**

The source is `_seed_rich`, the TC-1 rich fixture:
- **Dune:** the Main book at p.150, with a purpose, two card notes (one a range) and a JPEG cover.
- **Neuromancer:** Up next, paused at p.80.
- **The Dispossessed:** a Side read at p.120.
- **Piranesi:** finished and back-filled (no start date, rated 5), with a user spine color and a semi-transparent PNG cover.
- **Cien años de soledad:** unread, Spanish, tagged `clásicos`, so non-ASCII text is checked byte for byte.

The seed was checked separately: it passes `check_invariants`, and `Store.open` keeps both covers. It is restored into a fresh, empty data folder (a new laptop).

The leaf checks, in order:
1. **`library.json` is byte-identical to the source's** (the first assertion).
2. Every cover is byte-identical.
3. Restoring the same export again changes nothing.

*Red today: an empty library ≠ the rich one (`b'…"books": []…'` vs the source bytes).*

**`[P1] AC-8`: `test_ac8_p1_staging_is_emptied_after_a_restore_whether_it_succeeded_or_was_refused`**

`.staging/leftover.zip` and `.staging/covers/half.jpg` are planted *after* startup, so only the restore can clear them.

The leaf checks, in order:
1. After a valid restore, **`.staging/` is empty** (the first assertion).
2. With a leftover planted again, a refused restore (`b"this is not a zip"`, status not checked; it's Story 2.3's) also empties it and leaves `library.json` byte-identical.
3. The startup branch (`Store.open` sweeps `.staging/`) is checked last. **It is already green today.** It was built in Story 1.4, and `test_store.py` also covers it.

*Red today: `['covers', 'leftover.zip'] ≠ []`.*

**`[P1] AC-9`: `test_ac9_p1_an_archive_without_covers_restores_and_empties_covers`**

The archive holds only `library.json`, with no `covers/` entry at all.

The leaf checks, in order:
1. **The status is 200** (the first assertion), with the body exactly `{"ok": true}`.
2. `library.json` is byte-identical to the archive's.
3. `covers/` still exists and is empty: the target's old cover was no longer referenced.

*Red today: 405 ≠ 200.*

**`[P1] AC-10`: `test_ac10_p1_a_failed_cleanup_after_the_commit_still_succeeds_and_startup_sweeps_it`**

`FaultyFs("remove")` makes every delete through the seam fail. Nothing before the commit deletes anything, so the commit itself succeeds. The target also has an earlier `local-state.json`.

The leaf checks, in order:
1. **The status is 200** (the first assertion), with the body exactly `{"ok": true}`.
2. `library.json` is the source's.
3. stderr has `bookvie: couldn't delete covers/<OLD_COVER>`.
4. The old cover is still there, and `local-state.json` is byte-identical.
5. After a fresh `Store.open`:
   - `covers/` is exactly `{DUNE_COVER}`;
   - `.staging/` is empty;
   - `library.json` is unchanged.

*Red today: 405 ≠ 200.*

### E2E Tests (4 tests): `frontend/e2e/restore.spec.ts`

**Shared setup:**
- `pickFile` registers `waitForEvent('filechooser')`, clicks **Restore from file…**, then sets the file.
- `exportOf` takes a real export of a seeded source server with `X-Bookvie-Export: 1`.
- The dialog-only tests use `ANY_FILE`, a few bytes that are never sent.

**`[P1] AC-1`** (on the worker's server; nothing is sent):
1. **Restore from file… is enabled** (the first assertion; see "Why E2E leaves start with `toBeEnabled`").
2. After picking a file, the `alertdialog`:
   - has the accessible name "Replace all data with this file?";
   - has the accessible description "Your current books, readings and card notes will be replaced.";
   - has the buttons `["Replace all data", "Cancel"]`, with Cancel focused.

*Red today: `toBeEnabled` received disabled (`aria-disabled="true"`).*

**`[P1] AC-2`** (on a seeded server holding *The Left Hand of Darkness*):
1. **Enabled** (the first assertion).
2. Cancel closes the dialog, and focus is on Restore from file….
3. **The same file is picked again,** so the input must be reset after each pick. Esc closes the dialog, and focus returns again.
4. No POST went to `/api/intents/restore`, the catalog is unchanged, and `status` is empty.

*Red today: disabled.*

**`[P1] AC-4`** (Flow 8):
- **Source:** a seeded server with Dune (Main at p.150) and Neuromancer.
- **Target:** started with `startSeededServer` holding *The Left Hand of Darkness* and `local-state.json`.
- **Preferences:** `bookvie.theme=dark` and `bookvie.catalogView=list` are set in `localStorage`.

The leaf checks, in order:
1. **Enabled** (the first assertion).
2. Pick the export and press Replace all data. Then:
   - `status` reads "Restored.";
   - the URL is `<target>/`, and the `h1` is focused;
   - the catalog API lists exactly Dune and Neuromancer;
   - `main` shows Neuromancer and not the old title;
   - `alert` is empty.
3. `local-state.json` is byte-identical on disk, and `localStorage` is unchanged.

*Red today: disabled.*

**`[P2] AC-7`:**
- `/api/intents/restore` is held by a route that waits on a promise the test resolves, so there is no timer. The source and target are seeded servers.

The leaf checks, in order:
1. **Enabled** (the first assertion).
2. After Replace all data, `button` "Restoring…" in `main`:
   - is disabled, with the native `disabled` property `true`;
   - has opacity `0.6` and `animation-name: none`;
   - and there is no `progressbar`, and the dialog is closed.
3. Release the route. `status` reads "Restored.", and no "Restoring…" is left.

*Red today: disabled.*

### Why E2E leaves start with `toBeEnabled`

Every E2E criterion begins with "I press **Restore from file…**".
- **Today:** that button is `aria-disabled` (2.1's "Restore arrives in the next update."). Playwright's `click` waits for an enabled element, so without an assertion the first failure would be the click timing out. That is a setup step, not an assertion.
- **The fix:** asserting `toBeEnabled()` first turns that into a clear, immediate assertion failure. Its message names the missing feature.
- **Precedent:** this follows 2.1 AC-4 and 1.14 AC-4/AC-5, which also assert the idle state before a transition.

---

## Data Factories Created

None new. Everything goes through the existing `LibraryBuilder` (TC-1):
- **pytest:** spec-local seeds `_seed_source`, `_seed_rich` and `_seed_target`, with `image_bytes` from `tests/helpers.py`. The ids are fixed literals, the same ones the E2E specs use (`DUNE_ID`, `NEUROMANCER_ID`, …).
- **Playwright:** `seededServer(...)` for source and target servers. `startSeededServer` is used for the one target that needs `local-state.json` before it starts.

## Fixtures and Helpers Created or Moved

- **`tests/helpers.py`: `RecordingLock`,** moved from `test_export.py` (now imported there). The suite's rule is "import from helpers, never from another test module", and restore is its second user.
- **`frontend/e2e/fixtures.ts`: `startSeededServer(testInfo, name, partial, files)`.**
  - It seeds `<run dir>/<name>-<test id>`, writes extra files such as `local-state.json` or a cover, then starts a server. The caller stops it in `finally`.
  - This is the move 2.1's checklist asked for once a second user appeared. `backup.spec.ts`'s `serverWithLastExport` now delegates to it, with the same data-dir name (`last-export-<test id>`). It passes 11 of 11 as before.
- **Spec-local, not shared yet:**
  - `test_restore.py`: `RecordingFs`, `_post_restore`, `_export`, `_zip`.
  - `restore.spec.ts`: `pickFile`, `exportOf`, `preferences`.

## Mock Requirements

One. AC-7 holds `/api/intents/restore` with `page.route` until the test releases it, then `route.continue()`s to the real server. A real restore of a tiny library is too fast for the 300 ms busy threshold.

Everything else runs against the real `bookvie`. AC-10's fault is the existing `FaultyFs` seam, not a stub.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text. The labels are part of the Agent Label Contract. The file input is reached only through the `filechooser` event, so it needs no locator.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Route:** `POST /api/intents/restore`, multipart (AD-3), one call.
- **Parts:** `intent` = `{}` (JSON), and `archive` = the zip as a file part.
- **Success:** 200 with exactly `{"ok": true}`.
- **The guard:** restore goes through the same AD-16 Host/Origin guard as every intent; nothing special here.

**Order and lock** (for a valid export at the current `schemaVersion`):
- **The lock:** `store.lock` (the same object as `app.state.write_lock`) is acquired exactly once, before anything touches `.staging/`. It is released after the last cleanup.
- **The order:** outside `.staging/`, the filesystem seam sees, in order:
  1. `fs.replace(..., covers/<name>)` for each archive cover;
  2. `fs.replace(..., library.json)`, the AD-2 commit;
  3. `fs.remove(covers/<name>)` for each cover the new document doesn't reference.
- **In memory:** the state is swapped, so views read the restored library right away.

**Migration:** call `migrations.migrate(doc)` and read `migrations.CURRENT_VERSION` **through the module at call time**.
- `from .migrations import CURRENT_VERSION` would freeze the value and break AC-5's fixture chain. `Store._read` already does it right.

**`.staging/`:**
- It is emptied before unpacking, and again after every restore, succeeded or refused (`try`/`finally`).
- After a successful commit, cleanup goes through `store.fs.remove` (the seam).
  - It never raises: a failure is logged as `bookvie: couldn't delete …`, and the startup sweep removes the leftovers.
  - A failure deleting an old cover must log exactly `bookvie: couldn't delete covers/<name>`. `Store._remove_covers` already does.

**Untouched:** `local-state.json` (AD-15) and nothing else in the data folder besides `library.json`, `covers/` and `.staging/`.

**Page:**
- **The button:** `button` "Restore from file…" (U+2026) in `main` is enabled (no `aria-disabled`, no "Restore arrives…" description). Pressing it opens the browser's file chooser, and the input is reset after each pick, so the same file can be picked twice.
- **The Confirm dialog:** an `alertdialog` whose accessible name is "Replace all data with this file?" (its heading) and whose description is "Your current books, readings and card notes will be replaced.".
  - Its buttons, in DOM order, are "Replace all data" (`button-primary`) then "Cancel". Cancel is focused.
  - This is the existing `ConfirmDialog` with `heading` and `lines`.
- **Cancel and Esc:** they close it, send nothing, and return focus to Restore from file….
- **Replace all data:** it closes the dialog and sends the intent.
  - After ~300 ms with no answer, the button reads "Restoring…" with the native `disabled` attribute, opacity 0.6, no animation and no `progressbar`.
- **On 200:**
  - every view query is invalidated;
  - the page navigates to `/`, and the `h1` takes focus there;
  - `status` reads "Restored.", set after focus settles (EXPERIENCE live-region rule);
  - `alert` stays empty, and `localStorage` is untouched.

**Assumptions for the spec to confirm:**
- **The 1 GB upload versus Starlette's multipart parser.** Starlette spools file parts to disk past 1 MB, so the upload never sits in memory. `CoverSizeCap` must **not** be extended to `/api/intents/restore` with its 20 MB limit. The 1 GB cap and its 422 `restore_unsafe` are Story 2.3.
- **How restore takes the lock.** `Store.apply` takes `self.lock` itself, and `threading.Lock` isn't reentrant. Restore can't call `apply` from inside its own `with store.lock`, or it deadlocks. The suggestion is a `Store.replace_all(library, cover_files)` that does the AD-12 sequence with the lock already held. `apply` and `replace_all` can then share one internal `_apply_locked`.
- **Where validation lives.** `Store._read` and `Store._validate` raise `StartupError`. Restore needs the same checks (JSON object, integer `schemaVersion`, model validation, `check_invariants`) mapped to a restore error that Story 2.3 turns into 422s. The suggestion is to factor the shared parse-and-validate out of `_read`/`_validate` so startup and restore can't drift (AD-13's "Prevents").
- **A pre-migration backup on restore.** Startup writes `library.v<N>.bak.json` before migrating. For restore, the archive *is* the backup, so the scaffolds don't expect one. The spec should state that.
- **Covers are re-decoded, not normalized.** AC-3 says every referenced cover must be "present and decodable". The suggestion is to decode with Pillow (as `prepare_cover` does) but store the archive's bytes unchanged. Re-encoding would break AC-6's byte-identical round trip.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_restore.py -k ac3`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/restore.spec.ts -g "AC-1 "`

### AC-3 / AC-9 / AC-6 the restore intent (do first)
- [x] `store/store.py`: a locked AD-12 sequence for a whole new library (see Assumptions). Covers go in with `_write_atomic` (or `fs.replace` from `.staging/`), then the commit, then `_remove_covers` for the unreferenced ones. (done: `backend/bookvie/store/store.py:477` `Store.replace_all`: covers via `_write_atomic` (l.521), commit (l.526), `_sweep_covers` → `_remove_covers` (l.527))
- [x] `intents/restore.py`, all under `store.lock`: (done: `backend/bookvie/intents/restore.py:71`)
  - [x] Empty `.staging/`, then unpack only `library.json` and `covers/<name>` into it. A missing `covers/` counts as empty. (done: `backend/bookvie/store/restore.py:286` `stage_archive`; since Story 2.3 any other entry is refused as `restore_unsafe` (l.268) rather than ignored; missing `covers/`: `test_ac9_p1_an_archive_without_covers_restores_and_empties_covers`)
  - [x] Parse and validate `library.json`: JSON, `schemaVersion`, migrate if older, model, `check_invariants`. (done: `backend/bookvie/intents/restore.py:82` → `backend/bookvie/store/store.py:225` `load_library` (migrate l.232, `check_invariants` l.207))
  - [x] Check that every referenced cover is in staging and decodes. (done: `backend/bookvie/intents/restore.py:87`)
  - [x] Apply the AD-12 sequence; empty `.staging/` in `finally`. (done: `backend/bookvie/intents/restore.py:93` (`replace_all`) and l.74 (`empty_staging` in `finally`))
- [x] `http/api.py`: `POST /intents/restore` with `intent` (Form, optional `{}`) and `archive` (`UploadFile`). Plain `def`, so it runs in the threadpool like export. It returns `OkResponse(ok=True)`. (done: `backend/bookvie/http/api.py:522` `restore_intent`)
- [x] `npm run check:api` to regenerate `schema.d.ts`. (done: `frontend/src/api/generated/schema.d.ts:276`)
- [x] Activate AC-3, then AC-9, then AC-6. (done: `backend/tests/test_restore.py` `test_ac3_p0_a_valid_export_replaces_the_library_in_ad12_order_under_one_lock`, `test_ac9_p1_an_archive_without_covers_restores_and_empties_covers`, `test_ac6_p0_export_then_restore_reproduces_library_json_and_every_cover_byte_for_byte`, none skipped)

### AC-5 the older schemaVersion
- [x] Run `migrations.migrate(doc)` when `schemaVersion < migrations.CURRENT_VERSION`, before model validation (the module attribute, not an import-time copy). (done: `backend/bookvie/store/store.py:232`)
- [x] Activate AC-5. (done: `backend/tests/test_restore.py` `test_ac5_p1_an_older_schema_version_is_migrated_through_the_chain_then_restored`, not skipped)

### AC-8 / AC-10 cleanup
- [x] `.staging/` is emptied in `finally` after a refused restore too. A garbage upload must not leave anything. (done: `backend/bookvie/intents/restore.py:74`; `backend/tests/test_restore.py` `test_ac8_p1_staging_is_emptied_after_a_restore_whether_it_succeeded_or_was_refused`)
- [x] After the commit, every cleanup failure is logged and swallowed, and the response stays 200. (done: `backend/bookvie/store/store.py:343` `_remove_covers` and `empty_staging(quiet=True)` (l.540))
- [x] Activate AC-8, then AC-10. (done: `backend/tests/test_restore.py` `test_ac8_p1_staging_is_emptied_after_a_restore_whether_it_succeeded_or_was_refused`, `test_ac10_p1_a_failed_cleanup_after_the_commit_still_succeeds_and_startup_sweeps_it`, none skipped)

### AC-1 / AC-2 / AC-4 / AC-7 the Backup page
- [x] **Change the existing test:** `frontend/e2e/backup.spec.ts`, the test titled "[P2] AC-2 the Restore card explains itself, and its button is unavailable until restore arrives", asserts `aria-disabled` and "Restore arrives in the next update.". In the same change that enables the button, keep its explanation-line check and drop the `aria-disabled`, description and `:disabled` assertions. (done: `frontend/e2e/backup.spec.ts:172` "[P2] AC-2 the Restore card explains itself", which now asserts the button is enabled and has neither `aria-disabled` nor the old description)
- [x] `BackupPage.tsx`: (done: `frontend/src/pages/BackupPage.tsx`)
  - [x] Remove `RESTORE_NOT_YET`. (done: no `RESTORE_NOT_YET` left in `frontend/src`)
  - [x] **Restore from file…** clicks a visually hidden `<input type="file" accept=".zip,application/zip">`, whose value is reset after each pick. (done: `frontend/src/pages/BackupPage.tsx:178` (the `hidden` input), reset at l.131)
  - [x] Picking a file opens `ConfirmDialog` with `heading="Replace all data with this file?"`, `lines={['Your current books, readings and card notes will be replaced.']}` and `confirmLabel="Replace all data"`. (done: `frontend/src/pages/BackupPage.tsx:183`, copy at l.30-32)
- [x] Cancel and Esc unmount the dialog and focus Restore from file…. (done: `frontend/src/pages/BackupPage.tsx:135` `cancelRestore`; `frontend/e2e/restore.spec.ts:77` "[P1] AC-2 Cancel or Esc in the Confirm dialog changes nothing…")
- [x] Replace all data: (done: `frontend/src/pages/BackupPage.tsx:141` `runRestore`)
  - [x] Close the dialog and call `restore(file)` in `api/`. (done: `frontend/src/pages/BackupPage.tsx:145` (`setPicked(null)`) and l.149)
  - [x] After `BUSY_DELAY_MS`, label the button "Restoring…" with `busy` (native `disabled`, 60% opacity, as Export does). (done: `frontend/src/pages/BackupPage.tsx:148` and l.175; native `disabled` at 60% in `frontend/src/components/Button.tsx:14`)
  - [x] On 200, `queryClient.invalidateQueries()`, navigate to `/`, then announce `status` "Restored." after focus settles. (done: `frontend/src/api/intents.ts:49` invalidates every view, then `frontend/src/pages/BackupPage.tsx:155` (`navigate('/')`) and l.156 (`announce('status', RESTORED)`))
- [x] `api/intents.ts` (or a new `api/restore.ts`): a multipart POST with `intent` `{}` and `archive`. Refusals surface as Story 2.3's failure line, not here. (done: `frontend/src/api/restore.ts:10` (`api/restore.ts`))
- [x] Activate AC-1, AC-2, AC-4, then AC-7. (done: `frontend/e2e/restore.spec.ts:60`, `:77`, `:104`, `:150`, none skipped)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1:** Replace all data is `button-primary` (computed background `rgb(85, 112, 89)` in light), and there is no red in the dialog. Axe AA on `/backup` with the dialog open, in both themes. (done: `frontend/e2e/restore.spec.ts:183` "[P2] AC-1 Replace all data is button-primary and axe finds nothing with the dialog open, in both themes"; the dialog's only filled button is the primary one (`frontend/src/components/ConfirmDialog.tsx:79`))
- [x] **AC-2:** pressing Esc after Cancel has already closed the dialog doesn't move focus. A dismissed dialog announces nothing. (done: `frontend/e2e/restore.spec.ts:205` "[P2] AC-2 Esc after Cancel has closed the dialog keeps focus on Restore from file… and announces nothing")
- [x] **AC-3:** (done: sub-items below)
  - [x] Validation runs before anything changes (the 2.3 refusals prove it). (done: `backend/tests/test_restore_refusals.py` `test_ac1_p0_a_damaged_or_invalid_file_is_422_restore_invalid_and_changes_nothing`, `test_ac3_p0_a_hostile_archive_is_422_restore_unsafe_before_anything_outside_staging_changes`)
  - [x] A concurrent intent sent during a slow restore waits for the lock, then applies to the restored library (no lost update). (done: `backend/tests/test_restore.py` `test_an_intent_sent_during_a_slow_restore_waits_then_applies_to_the_restored_library`)
- [x] **AC-4:** (done: sub-items below)
  - [x] Restoring on the Catalog route with a preference set to `bookcase` keeps it. (done: `frontend/e2e/restore.spec.ts:104` "[P1] AC-4 a restore says "Restored." …keeping Last export and preferences" sets `bookvie.catalogView` (to `list`) and asserts it is unchanged after the restore)
  - [x] After Home exists (Epic 3), the launch page `/` is Home and its `h1` is focused. The leaf asserts only "the `h1` at `/`", so it survives that change. (done: `frontend/e2e/restore.spec.ts:134` (the `h1` "Home" at `/` is focused))
- ~~**AC-6:** the round trip goes through the browser (export download → restore file chooser) on the rich fixture, then Book detail for Dune matches (BKP-E2E-001's full form).~~ **Retired:** not automated; the round trip is checked at the API level (`backend/tests/test_restore.py` `test_ac6_p0_export_then_restore_reproduces_library_json_and_every_cover_byte_for_byte`), the browser form is deferred (`_bmad-output/implementation-artifacts/deferred-work.md:202`)
- [x] **AC-7:** a fast restore never shows "Restoring…" (watch the button names, as 2.1's fast-export test does). A double-click on Replace all data sends one request. (done: `frontend/e2e/restore.spec.ts:220` "[P2] AC-7 a fast restore never shows "Restoring…"" and `:243` "[P2] AC-7 a double click on Replace all data sends one restore")
- ~~**AC-10, E2E:** with a faulty cleanup (not reachable from the browser), "Restored." still shows. The API leaf covers it; the browser half needs a test hook, so it's not automated.~~ **Retired:** not automated (needs a fault seam under the e2e server); the API leaf is `backend/tests/test_restore.py` `test_ac10_p1_a_failed_cleanup_after_the_commit_still_succeeds_and_startup_sweeps_it`, the browser half is deferred (`_bmad-output/implementation-artifacts/deferred-work.md:202`)
- [x] **AC-10, `.staging/` half:** a fault while emptying `.staging/` after the commit, through the seam, logs and returns 200. The `FaultyFs("remove")` leaf covers it only if staging cleanup goes through `fs.remove`. If the implementation uses `shutil.rmtree`, add a monkeypatched-`rmtree` test. (done: staging files are deleted through `fs.remove` (`backend/bookvie/store/store.py` `_remove_tree`), so `backend/tests/test_restore.py` `test_ac10_p1_a_failed_cleanup_after_the_commit_still_succeeds_and_startup_sweeps_it` covers it (asserts `couldn't delete .staging/library.json` and 200))

---

## Running Tests

```bash
# API scaffolds (6 skipped today)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_restore.py

# E2E scaffolds (4 skipped today), against the last build
npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/restore.spec.ts

# Everything, as CI does
npm run check
```

**CI note:** `scripts/e2e-count.mjs` fails the CI E2E job when Playwright lists more tests than it runs (`docs/ci.md`: "A skipped test … fails the job"). The 4 skipped scaffolds in `restore.spec.ts` turn the GitHub Actions E2E and burn-in jobs red from the commit that adds them until the last one is activated. Local `npm run check` is unaffected. Either land the scaffolds with the Story 2.2 implementation, or accept the red CI E2E job until then, as with Stories 1.14 and 2.1.

---

## Red-Green-Refactor Workflow

- **RED (done):** 10 leaves, all skipped. Each fails at its first assertion when activated on today's code.
- **GREEN (dev):** activate one leaf, implement the smallest change that passes it, then the next. Order: AC-3 → AC-9 → AC-6 → AC-5 → AC-8 → AC-10 → AC-1 → AC-2 → AC-4 → AC-7. Then add the follow-ups.
- **REFACTOR:** with everything green:
  - factor startup's and restore's parse-and-validate into one function;
  - move `RecordingFs` into `tests/helpers.py` if Story 2.3's fault tests (BKP-API-005) need it, which is likely.

---

## Knowledge Base References Applied

- **test-quality:** one criterion per leaf, assertions in the test bodies, no hard waits (the route gate stands in for a slow restore), no conditionals, seeded literals only.
- **timing-debugging / network-first:** `waitForEvent('filechooser')` is registered before the click; the route is held on a promise, not a timer.
- **data-factories:** `LibraryBuilder` with overrides; the rich TC-1 fixture covers every Book state.
- **selector-resilience:** role and exact name only; no `data-testid`.
- **fixture-architecture:** `startSeededServer` moved into `fixtures.ts` once a second spec needed it; the other helpers stay spec-local.
- **component-tdd / test-healing-patterns:** the red check proved each leaf fails for the right reason (405, empty library, leftover staging, `aria-disabled`), not on a broken setup. Two setup bugs found this way were fixed: `pausedAt` is a date, and a fresh data folder must exist before `Store.open`.
- **test-levels-framework / test-priorities-matrix:** the API/E2E split and the P0–P2 assignment above.
- **ci-burn-in:** the `e2e-count` interaction noted above.
- **playwright-cli:** not used; there was no UI to record.

---

## Validation (Step 5)

- [x] Prerequisites: the criteria are clear; Playwright and pytest are configured; the dev environment runs (build, 803 pytest, E2E).
- [x] The criterion registry is AC-1..AC-10, generated deterministically in source order, with no supplied ids to preserve.
- [x] Each leaf title carries exactly one declared id: `[P#] AC-n` in E2E, `acN_pN` in pytest names. There are no ids on `describe` only.
- [x] Each criterion has exactly one red-phase leaf (6 API + 4 E2E = 10). Secondary branches are follow-ups above.
- [x] Each leaf's first assertion is the criterion-defining status, bytes or property:
  - **The API leaves:** 200 for AC-3, AC-5, AC-9 and AC-10; the bytes for AC-6; the empty `.staging/` for AC-8.
  - **The E2E leaves:** the enabled precondition, as explained above.
- [x] Responses of the unimplemented restore stay opaque before each first assertion: they are not parsed, branched on or used for cleanup.
- [x] State transitions take the transition-bearing branch: confirm → busy → done, open → cancel → closed, and a restore *after* planting leftovers.
- [x] Story metadata and handoff paths are in the frontmatter.
- [x] No CLI or browser sessions were left open; the temporary red-check copies and their `test-results/` were deleted.
- [x] Artifacts are under `_bmad-output/test-artifacts/`.

---

## Notes

- **Data safety:** every leaf that restores over existing data checks what was replaced and what was kept:
  - AC-10 and AC-4 keep `local-state.json` byte-identical;
  - AC-8 keeps `library.json` after a refused upload;
  - AC-2 sends nothing.
- **Why AC-3 logs only renames and deletes:** they are the AD-12 steps the user can lose data between. How the implementation unpacks into `.staging/` (zipfile, the seam, or both) is left free, apart from the lock around it.
- **Next workflow:** `bmad-build` (dev-story) for Story 2.2, using this checklist. Then `bmad-testarch-automate` after implementation for the follow-ups. Story 2.3's ATDD will reuse `_post_restore`, `_zip` and `RecordingFs`; move them to `tests/helpers.py` then.

**Generated by BMad TEA Agent** - 2026-11-04
