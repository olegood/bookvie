---
title: 'Count only tracked pages in Measured pace'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
baseline_commit: 'a2621346c4c167c4de06e8155b1674a2376c0137'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Which page?" (4.7) inflates Measured pace. A Reading started at page N finishes with `finishedPages` = the whole Book, so pages read before tracking count as read in the tracked days: one 330-page Side read took pace from 10.0 to 20.32 and the Main book's days left from 30 to 15.

Source: Epic 4 retro F-R2 (`epic-4-retro-2026-11-09.md`), sprint item `epic-4-retro-item-35-count-only-tracked-pages-in-measured-pac`. Oleg decided to count only tracked pages.

**Approach:** Store the page a new Reading starts at as `startPage`, and count `finishedPages − startPage` in Measured pace. Because AD-13 requires it for any persisted-shape change, this is `schemaVersion` 2 with one migration step that sets `startPage: 0` on every stored Reading, so older data and exports stay valid and count from 0.

## Boundaries & Constraints

**Always:** Use the existing chain (`store/migrations`), so startup backs up to `library.v1.bak.json` and restore migrates in memory. A Reading's tracked pages are never below 0. The day count is unchanged.

**Never:** No `startPage` in any view or API response. Resuming doesn't change `startPage`, even with "Which page?". No guessing of a starting page for existing Readings. No change to the Quick pace calculator beyond the pace it is given.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New Reading at a page | `start-reading` with `page` 300, no current Reading | `startPage` 300, `currentPage` 300 | N/A |
| New Reading, no page | `start-reading`, no `page` | `startPage` 0 | N/A |
| Resume | paused Reading, `page` sent | `currentPage` changes, `startPage` doesn't | N/A |
| Back-fill | Finished on | `startPage` 0, still excluded from pace | N/A |
| Pace | finished 330 pages from page 300 | counts 30 pages | N/A |
| Started on the last page | `startPage` = `finishedPages` | counts 0 pages, its days still count | N/A |
| Pages cut below the start | Book edited so `finishedPages` < `startPage` | counts 0, never negative | N/A |
| v1 file at startup | no `startPage`, `schemaVersion` 1 | backup written, every Reading `startPage` 0, `schemaVersion` 2 | a failed step refuses the file, as today |
| v1 export restored | archive at `schemaVersion` 1 | migrated in memory and restored | as today |
| v2 export on an older bookvie | `schemaVersion` 2 | `restore_newer_version`, as designed | as today |
| Hand-edited file | `startPage` negative or missing at v2 | refused by model validation | `LibraryRefused` |

</frozen-after-approval>

## Code Map

- `backend/bookvie/domain/model.py` -- `SCHEMA_VERSION` (line 19); `Reading` (line 35). Field order is file key order, so `start_page` goes after `start_date`.
- `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION`, `STEPS` (empty today; this is the first real step). `store.py` already handles backup, migrate and restore; don't change it.
- `backend/bookvie/domain/pace.py:measured_pace` -- the one sum that changes.
- `backend/bookvie/intents/start_reading.py` -- the new `Reading(...)`; the resume branch stays as it is.
- `backend/bookvie/intents/book_form.py:backfill_reading` -- the other `Reading(...)`.
- `backend/tests/builder.py:52,120` -- writes `schemaVersion` and default Readings; move to current. `test_migrations.py`, `test_store.py`, `test_store_commits.py`, `test_restore*.py`, `test_cli.py`, `test_model.py` pin version 1 or Reading keys.
- `frontend/e2e/` -- seeds come through the backend builder or `home.ts`; confirm they write a valid document at the new version.
- Not `check_invariants`: `startPage` has no upper bound, since Pages can legally drop below it (`_check_pages_floors` only looks at unfinished `currentPage`).

## Tasks & Acceptance

**Execution:**
- [x] `backend/tests/test_reentry.py` -- add pace tests for the matrix's pace rows -- red first.
- [x] `backend/tests/test_migrations.py` -- add the v1 to v2 step, the contiguous chain, a backup at startup, and a v1 export through restore -- AD-13.
- [x] `backend/tests/test_start_reading.py` -- `startPage` on new Readings; unchanged on resume.
- [x] `backend/bookvie/domain/model.py` -- `SCHEMA_VERSION = 2`; required `start_page: Annotated[int, Field(ge=0)]`.
- [x] `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION = 2`; `STEPS[1]` sets `startPage: 0` on every Reading and `schemaVersion: 2`.
- [x] `backend/bookvie/domain/pace.py` -- sum `max((finished_pages or 0) - start_page, 0)`; update the docstring.
- [x] `backend/bookvie/intents/start_reading.py`, `book_form.py` -- set `start_page`.
- [x] `backend/tests/builder.py` and the tests that pin version 1 or Reading keys -- move to the current version; keep literal v1 documents only where a test is about upgrading.
- [x] `_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md` -- Measured pace (line 65) counts pages read since each Reading's starting page.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- spine drift (AD-18, AD-19, AD-6) for retro item 38.

**Acceptance Criteria:**
- Given the F-R2 case, a 330-page Side read started at page 300 and finished, when Home is read, then pace counts 30 of its pages and days left doesn't shrink as it did.
- Given a v1 `library.json`, when bookvie starts, then `library.v1.bak.json` holds the original bytes and `library.json` is v2 with every Reading kept.
- Given a v1 export, when restored, then the library is v2 and its pace is the same as before the upgrade.

## Implementation Notes

- The retro assumed a stored Reading without `startPage` could just count from 0. AD-13 requires a `schemaVersion` bump and one migration for any persisted-shape change, so this is v2 with bookvie's first real migration step, approved at the spec checkpoint.
- The back-fill and Side-read tests moved to `backend/tests/test_edit_book_back_fill.py`: the new test took `test_edit_book.py` past the 1000-line limit of the project's test-size hook.
- Final verification: `npm run check:py` and `npm run check:api` exit 0, 1164 backend tests pass. The first full e2e run had 1 failure in `stale-hand-offs.spec.ts:185`, the flake tracked by retro item 42. It passed 8 of 8 alone, and a full re-run passed 391 of 391.

## Review Triage Log

Four layers: Blind Hunter, Edge Case Hunter, Verification Gap (no gaps), Spine Check.

- medium, patched: no test drove start-reading at a page through finish-reading to pace. Added an API test.
- medium, deferred: a resume at a higher page still counts the skipped pages, and a page corrected below `startPage` undercounts. The approved intent covers new Readings only; recorded in `deferred-work.md`.
- medium, patched: `EXPERIENCE.md:115` and `epics.md:1261` still gave the old definition.
- low, patched: the spine drift entry cited AD-6, which has no formula; it now cites AD-20. AD-18's part now names the page-count invariant.
- low, patched: comments in `test_restore.py` and the `chain_to_2` docstring described a chain that no longer exists; two no-op lines removed.
- low, patched: the back-fill pace test didn't seed a non-zero `startPage`.
- low, patched: the no-view test skipped other responses; it now also checks the OpenAPI schema.
- low, patched: `st.just(2)` now uses `SCHEMA_VERSION`.
- low, rejected: a malformed v1 file gives a raw reason (`...: 'books'`). It is still refused with no data lost, it takes a hand-damaged file, and tolerating it would add guards to the step.
- low, rejected: moving the three `EMPTY_LIBRARY` copies and the `_edit` helpers to `tests.helpers`. Not worth the churn here.
- false: already-inflated Readings aren't corrected. The approved intent says they count from 0, with no guessing.
- false: moving item 34's tests was unrelated. The 1000-line test-size hook required the split.
- false: AD-19 drift is recorded. It already was.

## Verification

**Commands:**
- `npm run check:py` -- expected: exit 0.
- `npm run check:api` -- expected: exit 0, no API type diff, since no view changed.
- `npm --prefix frontend run e2e` -- expected: all pass.
