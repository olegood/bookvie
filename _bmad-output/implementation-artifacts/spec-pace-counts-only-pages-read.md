---
title: 'Count only the pages read in each resume for Measured pace'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: 'd86bbe3a19bd9652c9a5c259274c860507891959'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Measured pace still counts pages skipped on a resume. A resume with "Which page?" moves `currentPage` but never `startPage` (item 35), so a Reading started at 0, paused at 20 and resumed at 300 counts all 300 pages when it finishes. A resume below the start (a mistyped start corrected on resume) undercounts the same way: started at 300, resumed at 30, finished at 330 counts 30, not 300.

Source: `deferred-work.md` entry "Measured pace still counts pages skipped on a resume" (from item 35's review). Oleg decided to track resume segments: store each resume's starting page on the Reading, and count only the pages read in each segment. This revisits item 35's "resuming never changes `startPage`".

**Approach:** `startPage` becomes the page the Reading's current segment starts at. A resume whose sent page differs from `currentPage` closes the current segment: it appends `{startPage, endPage: currentPage}` to a new Reading field `earlierSegments` and sets `startPage` to the sent page. Measured pace counts Σ max(endPage − startPage, 0) over `earlierSegments` plus max(`finishedPages` − `startPage`, 0). This is `schemaVersion` 3 with one migration step that adds `earlierSegments: []` to every Reading, so every existing Reading is one segment from its `startPage` and its pace is unchanged.

## Boundaries & Constraints

**Always:** Use the AD-13 chain (`store/migrations`): startup backs a v2 file up to `library.v2.bak.json` and upgrades it; restore migrates a v1 or v2 export in memory; a v4 file or export is refused as newer, as today. Each segment counts at least 0 pages. Days are unchanged (still `finishDate − startDate + 1`). `check_invariants()` enforces the shape the intents produce (below), so startup and restore refuse a hand-edited file that breaks it.

**Never:** No `earlierSegments` or `startPage` in any view, API response or the client (no e2e change). No change to `update-page` (a page lowered there stays in the current segment), `finish-reading`, `pause`, stats or the "X of Y finished" meter, which count `finishedPages` as today. No guessing of earlier segments for existing Readings. No upper bound on segment pages (Pages can be edited below them, like `startPage`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Skip ahead on resume | Reading start 0, paused at 20; `start-reading` page 300 | `earlierSegments` [{0, 20}], `startPage` 300, `currentPage` 300 | N/A |
| Skip back on resume | start 300, paused at 300; resume page 30 | [{300, 300}], `startPage` 30 | N/A |
| Resume at the same page | paused at 20; page 20 | nothing appended, `startPage` unchanged | N/A |
| Resume without page | paused at 20; no `page` | nothing appended, `startPage` unchanged | N/A |
| New Reading | no current Reading | `earlierSegments` [], `startPage` = page or 0 | N/A |
| Back-fill | Finished on | `earlierSegments` [], `startPage` 0 | N/A |
| Pace, skip ahead | start 0 → paused 20 → resume 300 → finish 330 | counts 20 + 30 = 50 pages | N/A |
| Pace, skip back | start 300 → paused 300 → resume 30 → finish 330 | counts 0 + 300 = 300 pages | N/A |
| Pace, re-read | start 0 → paused 20 → resume 10 → finish 330 | counts 20 + 320 = 340 pages | N/A |
| Segment lowered in it | segment {50, 40} (page lowered by `update-page`) | counts 0, never negative | N/A |
| v2 file at startup | no `earlierSegments`, `schemaVersion` 2 | `library.v2.bak.json` holds the original bytes; every Reading `earlierSegments` [], `schemaVersion` 3; pace unchanged | a failed step refuses the file, as today |
| v1 or v2 export restored | archive at `schemaVersion` 1 or 2 | migrated in memory through every step and restored; pace unchanged | as today |
| v4 export or file | `schemaVersion` 4 | `restore_newer_version` / startup refusal, as today | as today |
| Hand-edited file | segment page negative, key missing or extra, `earlierSegments` missing | refused by model validation | startup refusal / `restore_invalid` |
| Hand-edited file | segments on a Reading with no `startDate` | refused: `reading_segments_need_start_date` | as above |
| Hand-edited file | a segment's `endPage` equals the next segment's `startPage` (or the Reading's `startPage`) | refused: `reading_segment_starts_at_new_page` | as above |

</intent-contract>

## Code Map

- `backend/bookvie/domain/model.py` -- `SCHEMA_VERSION` (line 19), `Reading` (line 35). Add `ReadingSegment(_Model)` with `start_page`, `end_page` (both `Annotated[int, Field(ge=0)]`) and `Reading.earlier_segments: list[ReadingSegment]` right after `start_page` (field order is file key order). Export `ReadingSegment` from `domain/__init__.py` if other modules need it.
- `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION`, `STEPS` (`{1: _add_start_page}`). Add `STEPS[2]`. `store.py` already handles backup naming (`library.v{version}.bak.json`, line 372), newer-version refusal and restore migration; don't change it.
- `backend/bookvie/domain/pace.py:measured_pace` -- the one sum that changes; update the docstring.
- `backend/bookvie/intents/start_reading.py` -- resume branch (line ~111) and module docstring line 19 ("resuming never changes `startPage`"); new-Reading branch adds `earlier_segments=[]`.
- `backend/bookvie/intents/book_form.py:backfill_reading` -- the other `Reading(...)`.
- `backend/bookvie/domain/invariants.py` -- per-Book loop over Readings; add the two rules after `reading_page_in_range` style (rule ids above).
- `backend/tests/builder.py` -- `as_v1` (line 50) must also drop `earlierSegments`; add `as_v2`; default Reading gets `"earlierSegments": []` after `startPage`.
- Tests pinning version 2 or Reading keys: `tests/helpers.py:346`, `test_cli.py:635,660,665`, `test_model.py:14,30,52`, `test_store.py:64,97,150,334,359,380`, `test_migrations.py` (step-2 tests; v1 tests still meaningful through the chain, adjust `== 2` asserts), `test_restore.py`, `test_finish_any_book.py:200`, `test_reading_state_machine.py:319,518,629,702` (the model must append a segment on a resume at another page), `test_start_reading.py:423` (item 35's "keeps the start page" test is now reversed).
- `backend/tests/test_reentry.py:296` -- pace helpers live here; add segment pace tests. `test_invariants.py` -- invariant cases.
- Not consumers: `views/stats.py` and the meter count `finishedPages`; `views/shelf.py` only calls `measured_pace`; the frontend never sees `startPage`.
- Spine `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md`: AD-18 line 242 (page invariant), AD-19 line 257 (Fields) and 263 (sent page), AD-20 line 274 (pace formula).
- PRD `_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md` line 65, `ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:115`, `epics.md:1265` -- item 35 updated the Measured pace definition there; check each and say pages read since each segment's starting page.
- Real data: `~/bookvie-data/library.json` is v2 with 409 Books and 4 Readings (none finished with a start date, none with a non-zero `startPage`). Use only the copy at `/tmp/pace-realdata/orig/` (with `covers/`); never write to or start bookvie against `~/bookvie-data`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/tests/test_reentry.py` -- pace tests for the matrix's pace rows (skip ahead, skip back, re-read, a segment lowered within it) -- red first.
- [x] `backend/tests/test_start_reading.py` -- the resume rows: skip ahead and back append a segment; same page or no page append nothing; new Reading has none; replace item 35's keep-the-start test.
- [x] `backend/tests/test_migrations.py` -- `STEPS[2]` adds `earlierSegments: []` and nothing else; a v2 file is backed up to `library.v2.bak.json` and upgraded at startup with the same pace; a v1 file and a v1 and v2 export reach v3 with the same pace; hand-edited segment shapes refused.
- [x] `backend/tests/test_invariants.py` -- the two new rules, each with a passing and a failing case.
- [x] `backend/bookvie/domain/model.py` -- `SCHEMA_VERSION = 3`, `ReadingSegment`, `Reading.earlier_segments`.
- [x] `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION = 3`; `STEPS[2]` inserts `earlierSegments: []` right after `startPage` in every Reading and sets `schemaVersion: 3`.
- [x] `backend/bookvie/domain/pace.py` -- sum the segments; docstring.
- [x] `backend/bookvie/intents/start_reading.py`, `book_form.py` -- resume closes a segment when the sent page differs from `currentPage`; new Readings get `[]`; docstring.
- [x] `backend/bookvie/domain/invariants.py` -- `reading_segments_need_start_date`, `reading_segment_starts_at_new_page`.
- [x] `backend/tests/builder.py` and the tests that pin version 2 or Reading keys -- move to version 3; keep literal older documents only where a test is about upgrading.
- [x] Spine AD-18, AD-19, AD-20 and the PRD/EXPERIENCE/epics Measured pace wording -- edit for the new decision (a deliberate change, as item 35 did).
- [x] Real-data check on the `/tmp` copy -- record pace per Book (and library) before and after `Store.open` on the copy; must be equal.

**Acceptance Criteria:**
- Given a Reading started at 0, paused at 20 and resumed at 300, when it finishes at 330 pages, then Home's Measured pace counts 50 of its pages.
- Given a v2 `library.json`, when bookvie starts, then `library.v2.bak.json` holds the original bytes, `library.json` is v3 with every Reading kept and `earlierSegments: []`, and Measured pace and every Book's days left are unchanged.
- Given a v1 or v2 export, when restored, then the library is v3 and its pace is the same as before the upgrade.
- Given the copy of the real library, when a Store opens it, then it loads at v3 and the pace and every Book's days left equal the values computed before the upgrade.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 21 findings — high 0, medium 0, low 12, false 9, maybe-false 0
- findings:
  - `[low]` `[patch]` (spine-check) AD-19's "A sent `page`" bullet: "`update-page` never closes a segment." came before "It is required for a Side read", so "It" read as `update-page` — fixed: "The `page` is required…", and the `update-page` sentence moved after it.
  - `[low]` `[patch]` (intent-alignment) The skip-ahead acceptance criterion is about Home's Measured pace, but every pace test asserted `measured_pace()` on the stored library — `test_resuming_further_on_counts_only_the_pages_read_through_the_api` now also asserts the catalog view's `measuredPace` is 50 and Home's Main book `daysLeft` is 10 for a 500-page Book (2 under the old count).
  - `[false]` `[reject]` (intent-alignment) A resume with a page on an active (not paused) unfinished Reading also closes a segment — the intent's Approach defines a resume as a sent page that differs from `currentPage`, not as paused only; the same rule, and the matrix's "Resume" rows, apply.
  - `[low]` `[patch]` (intent-alignment, grouped with blind #5) Restore refusal of a hand-edited segment was tested only through `Store.open` — added `test_a_reading_segment_no_intent_can_produce_is_422_restore_invalid` (a segment ending on the Reading's start, and a segment missing `endPage`): 422 `restore_invalid`, library, covers and staging unchanged.
  - `[low]` `[reject]` (edge-case) Resuming an unfinished Reading with `startDate: null` at a new page appends a segment that breaks `reading_segments_need_start_date`, so the commit fails — only a hand-edited file can hold an unfinished Reading without a start date (back-fills are always finished; no intent clears a finish); it fails loudly with nothing written, and the fix adds a guard branch.
  - `[low]` `[reject]` (edge-case, claim) `check_invariants` doesn't refuse the shape that leads to the above — same root cause and same reason as the row above.
  - `[low]` `[reject]` (verification-gap, other finding) Same unfinished-Reading-without-start-date case — same reason as above.
  - `[false]` `[reject]` (blind #1) Side reads lose the pages read on the side but keep the days — the intent counts only pages read in each segment, and Design Notes record that untracked pages (Side read or pause) don't count, consistent with item 35; this is the decided behavior.
  - `[false]` `[reject]` (blind #2) A resume to a lower page after a mistyped pause page overcounts — the intent's matrix defines a lower resume as a re-read (start 0 → 20 → resume 10 counts 340); the intent chose that reading.
  - `[false]` `[reject]` (blind #3) The deferred-work entry is left open — Finalize adds its `resolved:` line in this run.
  - `[low]` `[reject]` (blind #4) `_add_earlier_segments` keeps a stray `earlierSegments` already present in a hand-edited v2 file, and skips a Reading with no `startPage` — a v2 file can't validly hold either (the v2 model forbids extra keys and requires `startPage`); whatever comes out is still validated by the v3 model and invariants, so a bad value is refused, not silently kept. Key-order insertion matches what the model writes. Unlikely, and the fix adds a branch.
  - `[low]` `[patch]` (blind #5) The restore side of the two new rules is untested — grouped with the intent-alignment row above; same test.
  - `[low]` `[reject]` (blind #6) No tests that `update-page`, `pause`, `finish-reading` and edit-book leave `earlierSegments` alone — none of those intents changed, and each copies the Reading with `model_copy`, which keeps fields it doesn't name; the Side-read resume runs the same branch as the tested resume.
  - `[false]` `[reject]` (blind #7) The spec records no verification — Finalize writes it under `## Auto Run Result` in this run.
  - `[false]` `[reject]` (blind #8) Segments store no date, so pause days can't be excluded — the intent says days stay `finishDate − startDate + 1`; outside the intent.
  - `[false]` `[patch]` (blind #9a) `starts[: len(segments)]` is a no-op — it isn't: with no segments `starts` holds one item and `zip(strict=True)` raised; rewritten as `starts if segments else []` with a comment for clarity.
  - `[low]` `[reject]` (blind #9b) The segment checks open a second loop over Readings — cosmetic, no named harm.
  - `[low]` `[patch]` (blind #9c) The message "starts on the page the segment before it ended" is wrong when the clash is with the Reading's own `startPage` — now "has a segment that ends on page N, where the next segment starts"; the expected text in `test_migrations.py` updated.
  - `[low]` `[patch]` (blind #10a) `test_store.py` added `_pages` but kept the identical inline strategy for `start_page` — now uses `_pages`.
  - `[false]` `[reject]` (blind #10b) The round-trip Hypothesis strategy pairs segments with `startDate: null`, which the invariant forbids — that test checks model round-trip only, never `check_invariants`, so nothing breaks.
  - `[false]` `[reject]` (blind #10c) `test_reentry.py` imports `measured_pace` inside each test — cosmetic, matches nearby tests; no harm.

## Design Notes

Why `earlierSegments` plus a moving `startPage`, not a full `segments` list: the open segment's start is the existing `startPage` and its end is the existing `currentPage`/`finishedPages`, so only closed segments need storing; old Readings are exactly "no earlier segments", and the v2→v3 step is one empty list. A resume at the same page is the same segment, so a segment boundary always moves the page (the second invariant keeps the stored form canonical, like a Card note's `pageEnd`).

Pages read during a Side read or a pause (untracked) are not counted, consistent with item 35's "only tracked pages count": a new Reading started at page N doesn't count pages before N either.

Golden example (Reading after start 0 → pause at 20 → resume at 300 → finish):
```json
{"startPage": 300, "earlierSegments": [{"startPage": 0, "endPage": 20}],
 "currentPage": 300, "finishedPages": 330}
```
counts 20 + 30 = 50 pages.

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass.
- `npm run check` (repo root) -- expected: exit 0, no API type diff (no view changed), e2e all pass.

## Auto Run Result

**Summary.** Measured pace counts only the pages read in each resume segment. A resume at a page other than `currentPage` closes the segment into the Reading's new `earlierSegments` (`{startPage, endPage}`) and moves `startPage` to the sent page; pace sums every segment's pages (at least 0 each) plus the last segment's. `schemaVersion` 3: migration step 2 adds `earlierSegments: []` after `startPage`, so existing Readings are one segment and keep their pace. Two new invariants refuse hand-edited shapes no intent produces. Item 35's "a resume never changes `startPage`" is replaced in the spine and the planning docs.

**Files changed:**
- `backend/bookvie/domain/model.py` -- `SCHEMA_VERSION = 3`, `ReadingSegment`, `Reading.earlier_segments`.
- `backend/bookvie/domain/__init__.py` -- exports `ReadingSegment`.
- `backend/bookvie/domain/pace.py` -- sums the segments; docstring.
- `backend/bookvie/domain/invariants.py` -- `reading_segments_need_start_date`, `reading_segment_starts_at_new_page`.
- `backend/bookvie/intents/start_reading.py` -- the resume closes a segment; new Readings get `[]`; docstring.
- `backend/bookvie/intents/book_form.py` -- back-filled Readings get `[]`.
- `backend/bookvie/store/migrations/__init__.py` -- `CURRENT_VERSION = 3`, `STEPS[2]`.
- `backend/tests/` -- `builder.py` (`as_v2`, v3 default), `helpers.py`, `test_cli.py`, `test_model.py`, `test_store.py`, `test_store_commits.py`, `test_finish_any_book.py` moved to v3; new or updated pace (`test_reentry.py`), resume (`test_start_reading.py`, `test_reading_state_machine.py`), migration and restore (`test_migrations.py`, `test_restore.py`) and invariant (`test_invariants.py`) tests.
- `ARCHITECTURE-SPINE.md` (AD-18, AD-19, AD-20), `prd.md`, `EXPERIENCE.md`, `epics.md` -- the new Measured pace decision.
- `deferred-work.md` -- `resolved:` on "Measured pace still counts pages skipped on a resume".

**Review findings.** 21 findings: 0 high, 0 medium, 12 low, 9 false. Patches applied: 6 low (spine AD-19 wording, view-level pace assertions, restore refusal test, invariant message, test strategy reuse) plus a clarity rewrite of the invariant pairing after a `false` no-op claim. Deferred: none. Rejected: 14, each with its reason in the Review Triage Log above (side-read and lowered-resume behavior are the intent's decision; the unfinished-Reading-without-start-date case is reachable only by hand edit and fails loudly; the rest cosmetic or handled in Finalize).

**Follow-up review recommendation:** `false`. Patched counts: high 0, medium 0, low 6.

**Verification:**
- `uv run ruff format --check .` and `uv run ruff check .` (backend) -- clean.
- `cd backend && uv run pytest -q` -- 1572 passed.
- `npm run check` (repo root, one clean run, no other Playwright run) -- exit 0: API types unchanged, 609 e2e passed, packaging smoke ok.
- Real data: a fresh copy of `~/bookvie-data` (with `covers/`) in `/tmp/pace-realdata2/`, the original never written and bookvie never started against it. Baseline `d86bbe3` (from a temporary worktree, removed) opened one copy, this change opened another through `Store.open`. Result: v2 → v3, 409 Books and 4 Readings kept, each Reading `earlierSegments: []`, `library.v2.bak.json` byte-identical to the original; library pace, every Book's own pace and every Book's days left equal before and after. The pace is `None` both times: no finished Reading in the real library has a start date, so the real data proves no change but doesn't exercise a non-zero pace (the unit, migration and API tests do).

**Residual risks:** an unfinished Reading without a start date, possible only in a hand-edited file, refuses a resume at another page with an invariant error (nothing written). Pages read during a Side read or a pause aren't counted, by decision.
