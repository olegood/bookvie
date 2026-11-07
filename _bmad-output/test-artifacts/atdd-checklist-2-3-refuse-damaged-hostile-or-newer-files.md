---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-04'
storyId: '2.3'
storyKey: '2-3-refuse-damaged-hostile-or-newer-files'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-23-refuse-damaged-hostile-or-newer-files'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md'
generatedTestFiles:
  - 'backend/tests/test_restore_refusals.py'
  - 'frontend/e2e/restore-refusals.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 2.3; Story 2.2 for what is already built)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-9 restore route, restore validation, restore limits; AD-12; AD-14)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (validation table: restore refusals)'
  - '_bmad-output/test-artifacts/test-design-qa.md (BKP-API-003, BKP-API-004, BKP-API-005)'
  - '_bmad-output/test-artifacts/test-design-architecture.md (R-02, R-14)'
  - '_bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md'
  - '_bmad-output/test-artifacts/automation-summary.md (Story 2.2 expansion; staging-fault gap)'
  - '_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md (deferrals to 2.3)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (case-collision cover names; FormData in memory)'
  - 'backend/bookvie/intents/restore.py, backend/bookvie/store/restore.py, backend/bookvie/store/store.py, backend/bookvie/store/fs.py, backend/bookvie/store/migrations/__init__.py, backend/bookvie/intents/contract.py'
  - 'backend/tests/helpers.py, backend/tests/test_restore.py, backend/tests/builder.py'
  - 'frontend/src/pages/BackupPage.tsx, frontend/src/api/restore.ts, frontend/src/components/FailureMessage.tsx (+ .module.css), frontend/src/styles/tokens.css'
  - 'frontend/e2e/restore.spec.ts, frontend/e2e/fixtures.ts, frontend/e2e/library.ts, frontend/e2e/intents.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'A file that is not a zip, a zip without library.json, a truncated archive, or a library.json that fails the schema or AD-18 invariants is refused with 422 restore_invalid and "This file isn''t a bookvie export, or it''s damaged. Nothing was changed.", with library.json and covers/ byte-identical to before (BKP-API-003); a library.json referencing a missing or undecodable cover is refused the same way' }
  - { id: AC-2, idSource: generated, text: 'An export whose schemaVersion is newer than the server supports is refused with 422 restore_newer_version and "This export is from a newer version of bookvie. Nothing was changed." and nothing changes' }
  - { id: AC-3, idSource: generated, text: 'An archive with an entry other than library.json or covers/<name>, an absolute path, a .. component, a symlink, a duplicate name, more than 5,000 entries, an upload over 1 GB, or more than 1 GB extracted (counted on bytes written, including headers that understate sizes) is refused with 422 restore_unsafe and the restore_invalid message, before anything is written outside .staging/, and nothing outside .staging/ changes (BKP-API-004, R-14)' }
  - { id: AC-4, idSource: generated, text: 'With a valid archive and a fault injected through the filesystem seam while covers are copied in or at the document commit, the previous library.json is intact and still references only covers that exist, and the response is 503 couldnt_save with "Couldn''t save. Your data wasn''t changed." (BKP-API-005, R-02)' }
  - { id: AC-5, idSource: generated, text: 'Any refusal shows on the Backup page as one ink failure line under Restore (no red, no icon), with focus back on Restore from file…; every refusal code (restore_invalid, restore_newer_version, restore_unsafe, couldnt_save) is in the AD-9 enum with an API test' }
---

# ATDD Checklist - Epic 2, Story 2.3: Refuse damaged, hostile or newer files

**Date:** 2026-11-04
**Author:** Oleg
**Primary test levels:** API (pytest against the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want a wrong or broken file to be refused before anything changes, so that a restore can never leave me with less than I had.

Story 2.2 already restores, with one catch-all refusal: every bad file is 422 `restore_invalid`. A write fault before the commit is already 503 `couldnt_save`.

**What 2.3 adds:**
- **Two new refusal codes,** split out of the catch-all:
  - `restore_newer_version`, with its own copy;
  - `restore_unsafe`, with `restore_invalid`'s copy.
- **The archive-safety rules.** Duplicate names include names that differ only in case.
- **The limits:**
  - at most 5,000 entries;
  - an upload of at most 1 GB;
  - at most 1 GB extracted, counted on the bytes written.
- **Tests:** the full refusal and fault matrices (BKP-API-003/004/005).

**Story source:** `epics.md` → Story 2.3. There is no spec file yet: `sprint-status.yaml` has `2-3-refuse-damaged-hostile-or-newer-files: backlog`.
- When `spec-2-3-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 2.2.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, and the code. There was no browser recording: the Restore card exists, and every locator comes from a role and name the criteria or the 2.2 spec already pin.

**Execution:** **sequential** with one author, as in Stories 1.6 to 2.2. One author keeps the seeds and archive builders consistent across both halves.

### What today's code already does (probed 2026-11-04, before writing the leaves)

Thirty-nine archives were posted against the 2.2 code: the 17 damaged or invalid files of AC-1, the newer version of AC-2, 12 hostile archives, and 5 seam steps × 2 places for AC-4. The AC-3 probe ran again on archives that are valid apart from the one hostile thing.

| Criterion | Today | Red? |
|---|---|---|
| AC-1: damaged or invalid → `restore_invalid` | All 17 cases: 422 `restore_invalid`, nothing changed | **Already passes** |
| AC-2: newer `schemaVersion` | 422 `restore_invalid` with the damaged-file copy | Red |
| AC-3: hostile archive | Five are 422 `restore_invalid`; **seven are accepted with 200** (below) | Red |
| AC-4: fault at cover copy-in or commit | All 10 step × place cases: 503 `couldnt_save`, byte-identical | **Already passes** |
| AC-5: the refusal line | The line, focus and ink color work; the newer-version copy is missing | Red |

**Accepted today, with 200 and the library replaced:**
- a symlink entry;
- `library.json` twice;
- a cover twice;
- two cover names that differ only in case (the deferred-work item from 2.2's review);
- 5,001 entries;
- an upload over the (lowered) upload limit;
- more extracted than the (lowered) extraction limit.

**Why AC-1 and AC-4 still get a leaf:**
- Story 2.2 built both behaviors: its catch-all refusal, and the AD-12 undo that removes the covers already written.
- Each leaf is the full BKP matrix in one place. It must stay green while 2.3 splits the catch-all into three codes.
- The two main risks of the split are a damaged file moving into `restore_unsafe` or `restore_newer_version` (for example `"schemaVersion": true`), and a reordered copy-in that loosens the undo. These leaves catch both.
- **Precedent:** Story 1.10 AC-2 also kept a leaf that already passed.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-5, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Damaged or invalid → 422 `restore_invalid`, byte-identical (BKP-API-003) | API | P0 | `test_ac1_p0_…` (already passes) |
| AC-2 | Newer `schemaVersion` → 422 `restore_newer_version` with its own copy | API | P0 | `test_ac2_p0_…` |
| AC-3 | Hostile archive → 422 `restore_unsafe` before anything outside `.staging/` (BKP-API-004) | API | P0 | `test_ac3_p0_…` |
| AC-4 | Fault at cover copy-in or commit → 503, old library intact (BKP-API-005) | API | P0 | `test_ac4_p0_…` (already passes) |
| AC-5 | Any refusal → one ink line under Restore; focus back on Restore from file… | E2E | P1 | `[P1] AC-5` |

**Priorities:**
- **AC-1 to AC-4 are P0.** They are the epic gate ("every refusal and fault test green (BKP-API-003..005)") and close R-02 and R-14.
- **AC-5 is P1:** it shows the outcome the API leaves prove. The data is already safe whatever the page shows.

**Level split (no duplicate coverage):**
- **API:** which archives are refused, with which code, and that nothing changes on disk.
- **E2E:** what the page shows and where focus goes.
- **AC-5's second half** ("every refusal code … with an API test") is covered by the AC-1 to AC-4 leaves, which assert each code's exact body. The enum-membership check is a green-phase follow-up.

---

## Story Integration Metadata

- **Story ID:** `2.3`
- **Story Key:** `2-3-refuse-damaged-hostile-or-newer-files`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 2.3)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md`
- **Generated Test Files:** `backend/tests/test_restore_refusals.py`, `frontend/e2e/restore-refusals.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 5 in all.
- **Backend leaves** have `@pytest.mark.skip(reason=RED)`, and their names carry `acN_pN`.
- **The E2E leaf** uses `test.skip(...)`, and its title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code (in a temporary copy, since deleted):
- **AC-2, AC-3 and AC-5** fail at their first assertion, as listed below.
- **AC-1 and AC-4** pass, as explained above.
- **The rest of the AC-5 leaf** was also run without its newer-version case. It passes today, so the leaf is red only for the missing copy.
- **AC-3's hostile cases** were each run with the code assertion replaced by a print. Each archive is otherwise a valid export, and the understated-headers block passes today.

**Skipped as committed:**
- `pytest tests/test_restore_refusals.py` gives 4 skipped, and `playwright test e2e/restore-refusals.spec.ts` gives 1 skipped.
- The whole backend suite passes (847 passed, 4 skipped). `restore.spec.ts` still passes 9 of 9 after the helper move.
- Ruff (on the touched files), oxlint and `tsc -b` are clean.

### API Tests (4 tests): `backend/tests/test_restore_refusals.py`

**Shared setup:**
- **Source:** Dune (JPEG cover) and Piranesi (PNG cover). `_Source` holds its real `GET /api/export`, its `library.json` bytes and doc, its covers, and its extracted size.
- **Target:** *The Left Hand of Darkness*, with `OLD_COVER`.
- **`_Snapshot`:** records `library.json`, `covers/`, the data folder's listing and its parent's listing. `assert_unchanged` also checks that `.staging/` is empty. The parent listing catches a `..` entry that escaped the data folder.

**`[P0] AC-1`: `test_ac1_p0_a_damaged_or_invalid_file_is_422_restore_invalid_and_changes_nothing`**

The leaf posts 17 cases to one target:
- **Not an archive:** not a zip; an empty file; a zip without `library.json`; the export cut in half; the export missing its last byte; an entry that fails its CRC.
- **A bad `library.json`:** not JSON; not UTF-8; not an object; no `schemaVersion`; `schemaVersion` `true`; `schemaVersion` `"1"`; a field the schema doesn't know; a Book without a title; the Main book also Up next.
- **A bad cover:** a referenced cover missing; a referenced cover that doesn't decode.

Each case checks, in order:
1. **The code is `restore_invalid`** (the first assertion).
2. The status is 422, with the exact body.
3. Nothing changed (`_Snapshot`).

The catalog view still lists only the target's book at the end.

*Passes today.*

**`[P0] AC-2`: `test_ac2_p0_a_newer_schema_version_is_422_restore_newer_version_and_changes_nothing`**

The archive is the source export with `schemaVersion` set to `CURRENT_VERSION + 1` and a field today's schema doesn't know (`shelves`), as a later bookvie would write it.

The leaf checks, in order:
1. **The code is `restore_newer_version`** (the first assertion).
2. The status is 422, with the exact body (`NEWER_MESSAGE`).
3. Nothing changed, and the catalog is unchanged.

*Red today: `'restore_invalid' == 'restore_newer_version'`.*

**`[P0] AC-3`: `test_ac3_p0_a_hostile_archive_is_422_restore_unsafe_before_anything_outside_staging_changes`**

One target, with a `RecordingFs` on `store.fs`. Each archive is a valid export apart from one hostile thing. The 12 cases, in order:
1. An extra entry, `notes.txt`.
2. An absolute path.
3. A `..` component at the top.
4. A `..` component under `covers/`.
5. A symlink entry.
6. A symlink named as a referenced cover.
7. `library.json` twice.
8. A cover twice.
9. Two covers whose names differ only in case.
10. 5,001 entries.
11. The real export with `MAX_UPLOAD_BYTES` lowered to its size − 1.
12. The real export with `MAX_EXTRACTED_BYTES` lowered to its extracted size − 1.

Each case checks, in order:
1. **The code is `restore_unsafe`** (the first assertion).
2. The status is 422, and the body is exact, with `restore_invalid`'s message.
3. The seam logged no rename or delete outside `.staging/`.
4. Nothing changed (`_Snapshot`).

After the loop:
- **The limits as specified:** `(MAX_UPLOAD_BYTES, MAX_ENTRIES, MAX_EXTRACTED_BYTES) == (1 GiB, 5000, 1 GiB)`.
- **Headers that understate a size:** a deflated `covers/filler.jpg` of 2 MiB is declared as 1,000 bytes, and the extraction cap sits between the two. The leaf checks:
  - the status is 422, with the shared message (the code is not pinned; see Assumptions);
  - nothing was written outside `.staging/`;
  - nothing changed.

*Red today: `'restore_invalid' == 'restore_unsafe'` on the first case.*

**`[P0] AC-4`: `test_ac4_p0_a_fault_copying_covers_in_or_at_the_commit_is_503_with_the_old_library_intact`**

`_StepFault(step, where)` fails one seam step of one atomic write, and every other call is real:
- **The steps:** `create_temp`, `write` (after writing half), `fsync`, `close` and `replace`.
- **`where = "cover"`:** the second cover restore copies in (Piranesi's), so Dune's is already in and must be removed again.
- **`where = "commit"`:** the `library.json` write.

Each of the 10 cases runs on a fresh target and checks, in order:
1. **The status is 503** (the first assertion), with exactly `COULDNT_SAVE_BODY`.
2. Nothing changed.
3. Every `coverFile` in the stored library exists.
4. The catalog still lists only the target's book.

*Passes today.*

### E2E Tests (1 test): `frontend/e2e/restore-refusals.spec.ts`

**`[P1] AC-5`** (light theme; a seeded server holding *The Left Hand of Darkness*):

The leaf posts three real refusals:
- **`restore_newer_version`:** the server's own `library.json` with `schemaVersion + 1`, zipped by `storedZip`.
- **`restore_unsafe`:** that `library.json` plus `../evil.jpg`.
- **`restore_invalid`:** `ANY_FILE`.

Then **`couldnt_save`:** a real export, with the server's 503 answer played back by `page.route`. A disk fault can't be caused from the browser; the API test injects it.

For each refusal, `expectRefusalLine` checks, in order:
1. **The server's exact message is visible in the `region` "Restore"** (the first assertion).
2. Focus is on Restore from file….
3. The card has exactly two `paragraph`s: the explanation and one failure line, so the previous refusal's line is gone.
4. The line's `color` is `--color-ink` (`rgb(43, 46, 42)`), so there is no red.
5. There is no `svg` or `img` in the card.
6. `alert` reads the message.

The URL stays `/backup`, and the catalog is unchanged at the end.

*Red today: the newer-version line is not found. The page shows the damaged-file copy, because the server sends `restore_invalid`.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1), with fixed literal ids and cover names (the same as `test_restore.py`).

**Archives are built three ways:**
- the real export;
- `zip_archive` (moved to helpers);
- spec-local builders for what `zip_archive` can't make:
  - `_with_raw_entries`: duplicates and symlinks appended raw;
  - `_symlink`: an `S_IFLNK` entry;
  - `_understated`: patches both the local header and the central directory.

**In E2E:** `storedZip` builds a stored zip byte by byte with `node:zlib`'s `crc32`. Its names are written as given, so it can make `../x`. The frontend has no zip dependency, and none was added.

## Fixtures and Helpers Created or Moved

- **`backend/tests/helpers.py`:** `RESTORE`, `post_restore`, `zip_archive`, `covers_in`, `staging_in` and `RecordingFs`, moved from `test_restore.py`. Its uses there were renamed; the behavior is the same, and all 24 tests still pass. 2.2's checklist asked for this move once 2.3 reused them.
- **`frontend/e2e/restore.ts` (new):** the shared restore helpers for both restore specs.
  - **Moved from `restore.spec.ts`:** `RESTORE`, `REPLACE_ALL`, `RESTORE_INTENT`, `RESTORE_INVALID`, `FilePayload`, `ANY_FILE`, `restoreButton`, `confirmDialog`, `pickFile`, `exportOf`.
  - **New:** `restoreCard`, `restoreFrom`, `zipFile`, `storedZip`.
- **Spec-local, not shared yet:**
  - `test_restore_refusals.py`: `_Source`, `_Snapshot`, `_StepFault`, `_with_raw_entries`, `_symlink`, `_understated`;
  - `restore-refusals.spec.ts`: `libraryOf`, `expectRefusalLine`.

## Mock Requirements

One. AC-5's `couldnt_save` case fulfills `/api/intents/restore` with the 503 envelope:

```json
{"error": {"kind": "couldnt_save", "code": "couldnt_save", "message": "Couldn't save. Your data wasn't changed."}}
```

That body is pinned by `COULDNT_SAVE_BODY` in the API tests. Everything else runs against the real `bookvie`. AC-4's faults go through the real `FileSystem` seam.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text: the `region` "Restore" (the card's `aria-label`) and `paragraph`.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Codes and bodies:**
- **`ErrorCode`** gains `RESTORE_NEWER_VERSION = "restore_newer_version"` and `RESTORE_UNSAFE = "restore_unsafe"`. Both are `kind: "refusal"`, status 422.
- **`restore_newer_version`'s message:** "This export is from a newer version of bookvie. Nothing was changed." (EXPERIENCE.md's validation table).
- **`restore_unsafe`'s message:** exactly `RESTORE_INVALID_MESSAGE` (AD-9).
- **Then `npm run check:api`,** so `schema.d.ts` lists both codes.

**Which code wins:**
- **The archive's shape and limits are checked first.** Any `restore_unsafe` rule refuses as unsafe, even when `library.json` is also broken. The AC-3 archives are otherwise valid, so the leaf doesn't pin this order; it's a follow-up.
- **Then the version.** `library.json` is parsed, `schemaVersion` is read as an int (not a bool), and if it is newer the restore is refused as `restore_newer_version`. This happens **before model validation**, so a newer document with fields today's model doesn't know is still "newer" (AC-2's `shelves`).
- **A `schemaVersion` that isn't a real int** (`true`, `"1"`, missing) stays `restore_invalid` (AC-1).

**The limits:**
- They are module attributes of `bookvie.store.restore`, read **at call time** (`unpack.MAX_ENTRIES`, not a `from … import` copy). AC-3 lowers them with `monkeypatch.setattr`.
- **Values:** `MAX_UPLOAD_BYTES = 1024**3`, `MAX_ENTRIES = 5_000`, `MAX_EXTRACTED_BYTES = 1024**3`.
- **Entries:** more than `MAX_ENTRIES` entries in `infolist()` (directory entries count) is `restore_unsafe`. 5,000 entries is allowed.
- **Upload:** an upload of more than `MAX_UPLOAD_BYTES` bytes is `restore_unsafe`.
- **Extracted:** extraction counts the bytes actually written to `.staging/`. It stops and refuses as `restore_unsafe` as soon as the count passes `MAX_EXTRACTED_BYTES`, never trusting the header sizes (AD-14).

**The archive-safety rules** (each is `restore_unsafe`, raised before any write outside `.staging/`):
- **Only these entries:** `library.json`, the `covers/` directory, and `covers/<plain name>` (as `cover_name` rules).
- **No absolute path** and **no `..` component.**
- **No symlink:** an entry whose Unix mode (`external_attr >> 16`) is `S_IFLNK`. This holds even when it is named like a valid cover.
- **No duplicate name:** two entries with the same name, **or names equal under `casefold()`** (closes the 2.2 deferred-work item about case collisions).

**Unchanged:**
- Every refusal still empties `.staging/` (2.2 AC-8).
- No rename or delete reaches the `FileSystem` seam outside `.staging/` before a refusal.
- `local-state.json` is never touched.

**The page:** nothing new is required, because the page shows the server's message.
- **AC-5 pins the line:** one `FailureMessage` (ink, no icon) in the Restore card. A new refusal replaces the previous line.
- **Focus** returns to Restore from file… after each refusal, `couldnt_save` included.

## Existing tests that must change with the implementation

- **`test_restore.py::test_a_newer_schema_version_is_422_restore_invalid_until_story_2_3`** asserts the old catch-all, so it will fail once AC-2 is in. Delete it in the same change: AC-2 replaces it.
- **`test_restore.py::test_a_zip_with_an_extra_entry_is_422_restore_invalid`:** an extra entry becomes `restore_unsafe` (AC-3), so this test will fail. Delete it; AC-3's first case replaces it.
- **The other catch-all tests in `test_restore.py`** stay `restore_invalid` and stay green. They overlap AC-1's matrix, so the refactor below may fold them in:
  - a garbage upload;
  - a missing cover;
  - an undecodable cover;
  - an invariant break;
  - no `library.json`;
  - a bad CRC;
  - the cover cap.
- **The module docstring of `test_restore.py`** ("The full refusal set … is Story 2.3") and the section comment "The catch-all refusal (Story 2.3 splits it)" should point at `test_restore_refusals.py` instead.

## Assumptions for the spec to confirm

- **"1 GB" is 1 GiB (`1024**3`).** That is never less than a decimal GB, so a real 1 GB export always fits. If the spec prefers `10**9`, change the one tuple at the end of AC-3's loop.
- **Where the upload cap is enforced.** Starlette's multipart parser spools file parts to disk with no size limit, so checking only after parsing would still write >1 GB to a temp file. The suggestion:
  - Count the body bytes for `POST /api/intents/restore` as they stream in, as `CoverSizeCap` does for covers but with `MAX_UPLOAD_BYTES`.
  - Answer 422 `restore_unsafe` once the count passes the cap, before the lock is taken.
  - The check must read `bookvie.store.restore.MAX_UPLOAD_BYTES` at request time; the AC-3 leaf patches that module attribute.
  - `test_the_cover_cap_does_not_apply_to_restore` (20 MB + 1 bytes is still not 413) stays valid.
- **Headers that understate a size can't be told apart from damage in Python.** `zipfile` never inflates past the declared size, then fails the CRC (probed on 3.14).
  - So the cap holds on bytes written, but the refusal reads as damaged. The AC-3 leaf pins only 422, the shared message and no change, not the code.
  - If the spec wants `restore_unsafe` here, the extractor must compare the bytes written against the declared size itself. Then add a code assertion to that block.
- **The case-collision rule uses `casefold()`** on the full entry name, which covers macOS's default case-insensitive APFS. Unicode normalization collisions (NFC vs NFD) are not covered. The spec may add them; minted names are ASCII UUIDs, so only a crafted archive reaches this.
- **The staging seam.** Unpacking into `.staging/` still bypasses the `FileSystem` seam (2.2 triage #37). AC-4 reads "while covers are being copied in" as copying into `covers/` (`Store.replace_all`), which goes through the seam. A fault while unpacking into `.staging/` is a follow-up below; it doesn't require routing staging through the seam.
- **The 2.2 deferred FormData item:** the page reads the whole file into memory before upload. It is not in scope here. With the 1 GB cap it is bounded, but it stays a candidate for streaming later.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_restore_refusals.py -k ac2`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/restore-refusals.spec.ts`

### First: activate the guards (AC-1, AC-4)
- [x] Activate AC-1 and AC-4. They pass on today's code; keep them green through every step below. (done: `backend/tests/test_restore_refusals.py:224` `test_ac1_p0_…` and `backend/tests/test_restore_refusals.py:495` `test_ac4_p0_…`, no skip marker)

### AC-2: the newer version
- [x] `intents/contract.py`: add `ErrorCode.RESTORE_NEWER_VERSION`, `RESTORE_NEWER_VERSION_MESSAGE` and `restore_newer_version()` (422, refusal). (done: `backend/bookvie/intents/contract.py:23`, `:48`, `:313`)
- [x] `store/store.py`: `load_library` raises a distinct refusal (for example `LibraryNewer`) when `version > migrations.CURRENT_VERSION`, after `parse_document` (bool excluded) and before `validate_document`. Startup keeps its own `StartupError` copy. (done: `backend/bookvie/store/store.py:151` `LibraryNewer`, raised inside `parse_document` at `:188` after the bool check (`:185`) and before `validate_document`; startup's `StartupError` at `:361-363`)
- [x] `intents/restore.py`: map it to `restore_newer_version()`, with a stderr line such as `couldn't restore: library.json is schemaVersion N, newer than M`. (done: `backend/bookvie/intents/restore.py:100-105`)
- [x] Delete `test_a_newer_schema_version_is_422_restore_invalid_until_story_2_3`. (done: no longer in `backend/tests/`; `backend/tests/test_restore.py:465` points at `test_restore_refusals.py`)
- [x] `npm run check:api`, then activate AC-2. (done: `backend/tests/test_restore_refusals.py:284` `test_ac2_p0_…`, no skip marker)

### AC-3: the archive-safety rules and limits
- [x] `intents/contract.py`: add `ErrorCode.RESTORE_UNSAFE` and `restore_unsafe()` (422, refusal, `RESTORE_INVALID_MESSAGE`). (done: `backend/bookvie/intents/contract.py:49`, `:325`)
- [x] `store/restore.py`: an `ArchiveUnsafe(ArchiveRefused)` (or a sibling), with `MAX_UPLOAD_BYTES`, `MAX_ENTRIES` and `MAX_EXTRACTED_BYTES` read through the module. (done: `backend/bookvie/store/restore.py:88` `ArchiveUnsafe(ArchiveRefused)`, limits at `:49-53`, read through `unpack.` in `intents/restore.py:60`)
- [x] Before writing anything (still under the lock, after `.staging/` is emptied), walk `infolist()` and refuse when there are: (done: `backend/bookvie/store/restore.py:288-302` `stage_archive`, `_check_entries` at `:231`)
  - [x] more than `MAX_ENTRIES` entries; (done: `backend/bookvie/store/restore.py:242`, plus the central-directory pre-check at `:181`)
  - [x] an absolute name or a `..` part; (done: `backend/bookvie/store/restore.py:201` `_unsafe_name`)
  - [x] `S_IFLNK` in `external_attr >> 16`; (done: `backend/bookvie/store/restore.py:227` `_is_symlink`)
  - [x] a casefolded duplicate; (done: `backend/bookvie/store/restore.py:253-256`; since hardened to NFC + casefold, `_name_key` at `:210`)
  - [x] anything other than `library.json`, `covers/` or `covers/<plain name>`. (done: `backend/bookvie/store/restore.py:257-268`)
- [x] `_copy_entry`: add each chunk's length to a running total, and raise `ArchiveUnsafe` once it passes `MAX_EXTRACTED_BYTES`, before writing that chunk. (done: `backend/bookvie/store/restore.py:151-154` (a `_Budget` running total))
- [x] The upload cap: the streaming body counter on the restore route (see Assumptions), plus a defensive size check on the spooled file in `stage_archive`. Both read `MAX_UPLOAD_BYTES` at call time. (done: streaming counter `backend/bookvie/http/api.py:129` `RESTORE_CAP`; spooled-file check `backend/bookvie/store/restore.py:300`; both read `MAX_UPLOAD_BYTES` at call time)
- [x] `intents/restore.py`: map `ArchiveUnsafe` to `restore_unsafe()` and log the reason. (done: `backend/bookvie/intents/restore.py:94-96`)
- [x] Delete `test_a_zip_with_an_extra_entry_is_422_restore_invalid`. (done: no longer in `backend/tests/`)
- [x] `npm run check:api`, then activate AC-3. (done: `backend/tests/test_restore_refusals.py:309` `test_ac3_p0_…`, no skip marker)

### AC-5: the Backup page
- [x] No production change is expected; the server sends the copy. Activate AC-5 after AC-2 and AC-3 are green, with `npm run build` first. (done: `frontend/e2e/restore-refusals.spec.ts:56` `[P1] AC-5 …`, not skipped)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-5, the enum half:** in `test_contract.py`, check that `ErrorCode` and the OpenAPI `ErrorBody.code` enum hold all four restore codes (`restore_invalid`, `restore_newer_version`, `restore_unsafe`, `couldnt_save`), and that `schema.d.ts` does too, through `check:api`. (done: `backend/tests/test_contract.py:314` `test_every_restore_refusal_code_is_in_the_ad9_enum`; `frontend/src/api/generated/schema.d.ts:524`)
- [x] **AC-3, boundaries:** (done: `backend/tests/test_restore_refusals.py:525` `test_ac3_the_limits_themselves_are_allowed`)
  - [x] exactly 5,000 entries restores; (done: `backend/tests/test_restore_refusals.py:525` "exactly 5,000 entries")
  - [x] an upload of exactly `MAX_UPLOAD_BYTES`, and an extraction of exactly `MAX_EXTRACTED_BYTES`, restore. (done: `backend/tests/test_restore_refusals.py:525` "an upload exactly at the limit", "an extraction exactly at the limit")
- [x] **AC-3, the order:** (done: `backend/tests/test_restore_refusals.py:563` `test_ac3_an_unsafe_archive_is_unsafe_even_when_library_json_is_broken_or_newer`)
  - [x] a hostile archive whose `library.json` is also broken (or newer) is `restore_unsafe`; (done: `backend/tests/test_restore_refusals.py:563` ("a .. entry and a library.json that isn't JSON", "… and a newer library.json"))
  - [x] a symlink plus a newer version is `restore_unsafe`. (done: `backend/tests/test_restore_refusals.py:563` "a symlink and a newer library.json")
- [x] **AC-3, stop early:** (done: `backend/tests/test_restore_refusals.py:598`, `:638`)
  - [x] Over the extraction cap, staging never holds more than the cap. Spy on `_copy_entry`'s writes, or check the staged sizes from a `RecordingFs`-style hook. (done: `backend/tests/test_restore_refusals.py:598` `test_ac3_extraction_stops_before_staging_passes_the_cap`)
  - [x] The over-limit entry count is refused without staging any entry. (done: `backend/tests/test_restore_refusals.py:638` `test_ac3_an_archive_over_the_entry_count_stages_nothing`)
- [x] **AC-3, the upload cap end to end:** the streaming counter refuses a body over a lowered cap without taking the store lock (`RecordingLock` logs nothing). (done: `backend/tests/test_restore_refusals.py:704` `test_ac3_a_body_over_the_streaming_cap_is_refused_without_the_lock`)
- ~~**AC-3, the E2E twin:** an unsafe archive leaves `<data dir>/../evil.jpg` absent. The API leaf covers it; this is optional.~~ **Retired:** optional, and not automated in the browser: `frontend/e2e/restore-refusals.spec.ts:76` posts `../evil.jpg` but checks only the page and the catalog; the API leaf pins it (`backend/tests/test_restore_refusals.py:337` with the beside-the-data-dir check at `backend/tests/test_restore_refusals.py:208`)
- [x] **AC-2:** a newer export whose covers are missing is still `restore_newer_version` (the version wins over the cover checks). (done: `backend/tests/test_restore_refusals.py:853` `test_ac2_a_newer_export_missing_its_covers_is_still_restore_newer_version`)
- [x] **AC-4, `.staging/`:** a fault while unpacking into `.staging/` (for example a read-only `.staging/` via `chmod`, skipped as root) is 503 `couldnt_save` with nothing changed. This closes the automation-summary gap (`store/restore.py` staging writes). (done: `backend/tests/test_restore_refusals.py:898` `test_ac4_a_fault_unpacking_into_staging_is_503_with_nothing_changed`)
- ~~**AC-4, the undo fails too:** a failure removing the already-written cover is logged. The old `library.json` still references only covers that exist, since the leftover is unreferenced and the next startup sweeps it.~~ **Retired:** not automated: the undo logs each failed removal (`backend/bookvie/store/store.py:343-351` `_remove_covers`), but no test fails both a cover copy-in and the removal; `backend/tests/test_restore.py:433` covers only a failed cleanup after the commit; deferred to `_bmad-output/implementation-artifacts/deferred-work.md:365`
- [x] **AC-5, dark theme:** the line is `--color-ink` dark (`#ECEAE3`), and axe finds nothing with a refusal line shown, in both themes. (done: `frontend/e2e/restore-refusals.spec.ts:106` `[P2] AC-5 the refusal line is ink in the dark theme too …`)

---

## Running Tests

```bash
# API scaffolds (4 skipped today)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_restore_refusals.py

# E2E scaffold (1 skipped today), against the last build
npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/restore-refusals.spec.ts

# Everything, as CI does
npm run check
```

**CI note:** `scripts/e2e-count.mjs` fails the CI E2E job when Playwright lists more tests than it runs (`docs/ci.md`).
- The skipped `[P1] AC-5` turns the GitHub Actions E2E and burn-in jobs red from the commit that adds it until it is activated. Local `npm run check` is unaffected.
- Either land the scaffolds with the Story 2.3 implementation, or accept the red CI E2E job until then, as with Stories 1.14, 2.1 and 2.2.

---

## Red-Green-Refactor Workflow

- **RED (done):** 5 leaves, all skipped. AC-2, AC-3 and AC-5 fail at their first assertion when activated; AC-1 and AC-4 pass (guards).
- **GREEN (dev):** in this order: AC-1 and AC-4 (activate) → AC-2 → AC-3 → AC-5. Then the follow-ups.
- **REFACTOR:** with everything green:
  - fold `test_restore.py`'s catch-all tests into AC-1's matrix;
  - if the spec splits refusal reasons into an enum, assert each logged reason in AC-1 and AC-3.

---

## Knowledge Base References Applied

- **test-quality:**
  - One criterion per leaf; each leaf is a table loop with the case named in every assertion message, not parametrized leaves, so there is exactly one leaf per criterion.
  - No hard waits, and no conditionals in the leaves.
  - Seeded literals only.
- **data-factories:** `LibraryBuilder` seeds. Each hostile archive is a valid export apart from one thing, so only the rule under test can refuse it.
- **component-tdd / test-healing-patterns:**
  - The red check proved each red leaf fails on the missing behavior (the code, the copy), not on setup.
  - The per-case probe proved every hostile archive is otherwise valid.
  - Two setup issues found this way were fixed: an archive without its referenced cover (refused for the wrong reason), and the commit's temp prefix (`library.json.tmp`).
- **selector-resilience:** a role plus an exact name (`region` "Restore", `paragraph`, `button`); no `data-testid`.
- **timing-debugging / network-first:** the 503 route is registered before the action that triggers it; web-first assertions only.
- **fixture-architecture:** the restore helpers moved to `tests/helpers.py` and `e2e/restore.ts` once a second spec needed them; the rest stays spec-local.
- **test-levels-framework / test-priorities-matrix:** the API/E2E split and P0 for the epic-gate matrices above.
- **ci-burn-in:** the `e2e-count` interaction noted above.
- **playwright-cli:** not used. The UI exists and its locators were already pinned by Story 2.2.

---

## Validation (Step 5)

- [x] **Prerequisites:** the criteria are clear; Playwright and pytest are configured; the dev environment runs (build, 847 pytest, E2E).
- [x] **The criterion registry** is AC-1..AC-5, generated deterministically in source order. There were no supplied ids to preserve.
- [x] **Each leaf title carries exactly one declared id:** `[P1] AC-5` in E2E, `acN_pN` in pytest names. There are no ids on `describe` only.
- [x] **Each criterion has exactly one red-phase leaf** (4 API + 1 E2E = 5). Secondary branches are follow-ups above.
- [x] **Each leaf's first assertion is the criterion-defining code, status or copy:** `restore_invalid` (AC-1), `restore_newer_version` (AC-2), `restore_unsafe` (AC-3), 503 (AC-4), and the server's line under Restore (AC-5).
  - AC-1 and AC-4 already pass; this is documented, with the reason.
- [x] **Responses stay opaque before each first assertion.** No limit is patched before AC-3's first assertion, so its red run fails there and not in `monkeypatch.setattr`.
- [x] **State transitions take the transition-bearing branch:** confirm → refused → line and focus, and a refusal replacing an earlier refusal's line.
- [x] **Story metadata and handoff paths** are in the frontmatter.
- [x] **No CLI or browser sessions were left open.** The temporary probe and red-check copies, and their `test-results/`, were deleted.
- [x] **Artifacts** are under `_bmad-output/test-artifacts/`.

---

## Notes

- **Data safety:** every refusal leaf compares `library.json`, `covers/`, the data folder's listing and its parent's listing before and after, and checks that `.staging/` is empty. AC-3 also proves that no rename or delete reached the seam outside `.staging/`.
- **Next workflow:** `bmad-build` (dev-story) for Story 2.3, using this checklist. Then `bmad-testarch-automate` for the follow-ups, and `bmad-testarch-trace` for the Epic 2 gate (BKP-API-001, -003, -004 and -005 all green).

**Generated by BMad TEA Agent** - 2026-11-04
