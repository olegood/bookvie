---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-05'
storyId: '3.4'
storyKey: '3-4-see-where-i-left-off-and-how-long-is-left'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-34-see-where-i-left-off-and-how-long-is-left'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-4-see-where-i-left-off-and-how-long-is-left.md'
generatedTestFiles:
  - 'backend/tests/test_reentry.py'
  - 'frontend/e2e/reentry.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3; Story 3.4; Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Re-entry, Server owns numbers, Time, Main book card)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 server owns pace and days left, AD-20 Clock and inclusive days, module map FR-11)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Re-entry line, Measured pace, Voice and Tone, Book states: last page, never exported)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (re-entry-line: body-sm, ink-secondary, ink-tertiary 6px dots; Do''s and Don''ts)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-home.html (p.reentry with one span per fact, dots as span+span::before)'
  - '_bmad-output/test-artifacts/test-design-qa.md (PAC-UNIT-001, PRG-UNIT-001, PRG-E2E-001, PRG-E2E-002, R-07, R-10)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-4 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-3-catch-up-with-one-page-update.md (format, conventions)'
  - 'backend/bookvie/domain/progress.py, clock.py, model.py, __init__.py; backend/bookvie/views/shelf.py, models.py'
  - 'backend/tests/builder.py, helpers.py, test_home_view.py, test_progress.py, test_update_page.py'
  - 'frontend/src/pages/HomePage.tsx; frontend/src/components/MainBookCard.tsx; frontend/src/lib/relativeDay.ts, today.ts; frontend/src/styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, home.ts, library.ts, home.spec.ts, update-page.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given domain/ Measured pace, when it is unit-tested with a fake Clock, then it equals total finishedPages of finished Readings with a start date ÷ Σ(finishDate − startDate + 1), and back-filled Readings are excluded, a same-day start and finish counts 1 day, and with no qualifying Reading there is no Measured pace (AR16)' }
  - { id: AC-2, idSource: generated, text: 'Given a Main book, when the home view is computed, then it supplies days left = ceil(pages left ÷ Measured pace), with a minimum of 1, and it omits days left when there is no Measured pace, when Measured pace is 0, or when no pages are left (FR-11, R-10)' }
  - { id: AC-3, idSource: generated, text: 'Given the Main book card, when the re-entry line renders, then it shows up to three muted facts separated by dots: "Last updated today / yesterday / N days ago" (local calendar days from lastProgressUpdate), "~N days left" ("~1 day left" at minimum), and "Last export: N days ago" or "No export yet", and nothing in it is ever colored or styled as a warning (UX-DR37, NFR6)' }
  - { id: AC-4, idSource: generated, text: 'Given a Main book with a "Last export" fact, when Home renders, then "Last export" sits in the re-entry line, and returns to the Home header line when there is no Main book' }
  - { id: AC-5, idSource: generated, text: 'Given a Main book at its last page, when Home renders, then the gauge shows 100% and "~N days left" is hidden' }
  - { id: AC-6, idSource: generated, text: 'Given a tab left open past midnight, when the window regains focus, then "Last updated" and the Home date recompute' }
---

# ATDD Checklist - Epic 3, Story 3.4: See where I left off and how long is left

**Date:** 2026-11-05
**Author:** Oleg
**Primary test levels:** Unit and API (pytest, the view through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want a quiet line saying when I last updated and about how many days are left, so that I can pick up again without guilt or arithmetic.

Today the Main book card (Stories 3.1 and 3.3) shows the cover, the title, the author, the gauge and the page field. "Last export" sits on the Home header line only when there is no Main book; with a Main book it appears nowhere.

**What 3.4 adds:**
- **Measured pace** in `domain/` (AR16).
- **Days left** in the home view, plus the Reading's `lastProgressUpdate` so the client can say "Last updated …".
- **The re-entry line** at the end of the Main book card: "Last updated …", "~N days left", "Last export …".

**Not in 3.4:**
- the Quick pace calculator that reuses Measured pace (FR-15, later epic);
- pages left at library scope and stats;
- the Main spine's fill: Story 3.5;
- the Finish dialog: Story 3.6.

**Story source:** `epics.md` → Story 3.4. There is no spec file yet: `sprint-status.yaml` has `3-4-see-where-i-left-off-and-how-long-is-left: backlog`.
- When `spec-3-4-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.3.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, the `key-home.html` mockup and the code. No browser recording: the line doesn't exist yet. Locators are the Main book card's `region`, exact fact text, and the line as the parent of the "Last updated …" fact (the mockup's `p.reentry` with one `span` per fact).

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.3.

### Before the leaves: what today's code already does

- **`relativeDay()` and `lastExportLine()`** (`lib/relativeDay.ts`) already count local calendar days and say "today", "yesterday", "N days ago", "Last export: N days ago" and "No export yet". The re-entry line should reuse them.
- **`useNow()`** already refreshes on `focus` and `visibilitychange`, and Home's date header already uses it (`home.spec.ts` covers the date). AC-6 only needs the line to read the same `now`.
- **`Reading.lastProgressUpdate`** is stored (an aware timestamp, nullable), but `HomeMainBook` doesn't carry it yet.
- **`home()`** is a pure function of the library and needs no Clock for days left: every pace input is a stored date.
- **`tests/test_clock.py`** already keeps `domain/` off the system clock, so the "fake Clock" in AC-1 holds by construction.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Measured pace: Σ finishedPages ÷ Σ inclusive days; back-filled out; same day = 1; none without a qualifying Reading | Unit | P1 | `test_ac1_p1_…` |
| AC-2 | Home view: `daysLeft` = ceil(left ÷ pace), min 1; `null` without pace, at pace 0, or with no pages left | API | P1 | `test_ac2_p1_…` |
| AC-3 | The line: up to three facts, in order, dots between, muted in both themes, never a warning | E2E | P1 | `[P1] AC-3` |
| AC-4 | "Last export" in the line with a Main book; on the header line without one | E2E | P2 | `[P2] AC-4` |
| AC-5 | The last page: gauge 100%, "~N days left" hidden | E2E | P1 | `[P1] AC-5` |
| AC-6 | Past midnight: "Last updated" and the date recompute on focus and visibility | E2E | P1 | `[P1] AC-6` |

**Priorities** (from `test-design-qa.md`):
- **P1:** AC-1 is PAC-UNIT-001 and AC-2 is PRG-UNIT-001 (both R-10). AC-6 is R-07 (date errors). AC-3 is PRG-E2E-002, raised from P2 because the line is the story's purpose. AC-5 is R-10's "no pages left" seen in the UI.
- **P2:** AC-4, a placement rule. Its no-Main half is already covered by `home.spec.ts` AC-3.
- **No P0 leaf.** The P0 that touches this story is PRG-E2E-001's "~N days left after refetch" half, a 3.3 follow-up listed below.

**Level split (no duplicate coverage):**
- **Unit and API:** every number. Pace and days left are only computed on the server (AD-6), so their edge cases (ceil, min 1, pace 0, back-filled, same day, re-reads, stored `finishedPages`) live in pytest.
- **E2E:** the copy, the order, the tone, the placement, and the browser's own "today". One E2E seed per kind of fact, not one per number.

---

## Story Integration Metadata

- **Story ID:** `3.4`
- **Story Key:** `3-4-see-where-i-left-off-and-how-long-is-left`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.4)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-4-see-where-i-left-off-and-how-long-is-left.md`
- **Generated Test Files:** `backend/tests/test_reentry.py`, `frontend/e2e/reentry.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 6 fail as listed below, and every seed started cleanly (the home view answered, and every server reached its assertion).

**Skipped as committed:**
- `pytest tests/test_reentry.py` gives 2 skipped.
- `playwright test e2e/reentry.spec.ts` gives 4 skipped.
- The whole backend suite passes (962 passed, 2 skipped).
- Ruff (check and format) on the new file, oxlint and `tsc -b` are clean.

**Two deviations from the workflow's rules, kept to match Stories 1.6 to 3.3:**
- The E2E leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.
- **AC-1** imports `bookvie.domain.pace` inside the test, so the module collects today. Its red failure is that import (`ModuleNotFoundError`), not the pace assertion. Once the module exists, the first failure is the pace itself.
- **AC-6** waits for the date header ("Wednesday, 28 October") before moving the clock. That wait passes today; the first operation that fails is the criterion's "Last updated yesterday".

### Unit and API Tests (2 tests): `backend/tests/test_reentry.py`

**Seed (`_paced_library`):**
- The Left Hand of Darkness (330 pages) is the Main book at p.151, or at `main_page`. It was started 2026-10-11, and `lastProgressUpdate` is 2026-10-25T21:00 CET.
- Emma (the Book now says 420 pages) was finished twice: 400 pages over 2026-09-01 to 09-20 (20 days), and a re-read of 400 pages over 2026-10-01 to 10-10 (10 days).
- Kindred: 100 pages started and finished on 2026-09-25 (1 day).
- Dune: back-filled (no start date), 412 pages. Excluded.
- **Measured pace = 900 ÷ 31 pages a day.**

**`[P1] AC-1`: `test_ac1_p1_measured_pace_is_pages_over_inclusive_days_without_back_fills`**
1. **`measured_pace(library) == Fraction(900, 31)`** (the first assertion). This proves re-reads count, the stored `finishedPages` wins over today's Book pages, and back-filled and unfinished Readings are left out.
2. A same-day Reading of 100 pages: `Fraction(100)`.
3. 2026-10-24 to 10-26 (across the October DST change): 3 days, `Fraction(30)`.
4. `None` for an empty library, for only back-filled Readings, and for only unfinished ones.
5. A qualifying Reading of 0 pages: `Fraction(0)`, not `None`.

*Red today: `ModuleNotFoundError: No module named 'bookvie.domain.pace'`.*

**`[P1] AC-2`: `test_ac2_p1_the_home_view_supplies_days_left_rounded_up_and_null_when_it_cant_be_said`**
1. **`GET /api/views/home` → `mainBook.daysLeft == 7`** (the first assertion): 179 × 31 ÷ 900 = 6.16….
2. `mainBook.lastProgressUpdate` is the seeded timestamp.
3. `days_left()`: 179 → 7, 29 → 1 (0.99…), 30 → 2 (1.03…), 1 page at 1000 a day → 1; `None` for 0 pages left, for no pace, and for pace 0.
4. `home()` on variants: p.329 → 1, p.330 → `None`, p.0 → 12, no finished Reading → `None`, a 0-page finished Reading → `None`.

*Red today: `assert None == 7` (no `daysLeft` key).*

### E2E Tests (4 tests): `frontend/e2e/reentry.spec.ts`

**Seeds:** `pacedMainAt(page, lastProgressUpdate, others)` is `mainAt(page, …)` from `e2e/home.ts` plus Emma (400 pages, 2026-09-01 to 09-20): **Measured pace 20 pages a day**. `EXPORTED_12_DAYS_AGO` writes `local-state.json` with `lastExportAt` 2026-10-16T09:30 CEST. Servers start with `serverAtFakeToday` (2026-10-28, browser clock 10:00 Europe/Madrid).

**`[P1] AC-3` the line**
1. Main at p.151, last updated 2026-10-25T21:00, exported. **The line's facts read exactly `["Last updated 3 days ago", "~9 days left", "Last export: 12 days ago"]`** (the first assertion). 179 ÷ 20 = 8.95, so a floor would say 8.
2. In light and in dark: each fact is `ink-secondary`; every fact but the first has a 6px `ink-tertiary` `::before` dot; the first has none.
3. `alert` is empty, and the line sits below the page field's **Update**.
4. Main at p.329, last updated 2026-10-27T23:59, never exported: `["Last updated yesterday", "~1 day left", "No export yet"]`.
5. Main at p.151, last updated this morning, no finished Reading: `["Last updated today", "No export yet"]`, and no "days left" anywhere in the card.

*Red today: the facts locator finds no "Last updated" (`toHaveText` mismatch).*

**`[P2] AC-4` where Last export sits**
1. With a Main book: **"Last export: 12 days ago" is visible in the Main book card** (the first assertion).
2. It is the only "Last export" in `main`, and the header line doesn't hold it.
3. Without a Main book (same export): the header line holds it, and the card has neither "Last export" nor "Last updated".

*Red today: no "Last export" in the card.*

**`[P1] AC-5` the last page**
1. Main at p.330, exported. **The facts read exactly `["Last updated 3 days ago", "Last export: 12 days ago"]`** (the first assertion).
2. The gauge's `aria-valuetext` is "100%, page 330 of 330", and the card has no "days left".

*Red today: no line.*

**`[P1] AC-6` past midnight** (`seededServer`)
1. The browser clock is 2026-10-28T23:59; `lastProgressUpdate` is 09:00 that day. Wait for "Wednesday, 28 October".
2. Move the clock to 2026-10-29T00:01 and fire `focus`. **"Last updated yesterday" is visible in the card** (the first assertion), and the header reads "Thursday, 29 October".
3. Move to 2026-10-30T00:01 and fire `visibilitychange`: "Last updated 2 days ago" and "Friday, 30 October".

*Red today: no "Last updated yesterday".*

---

## Data Factories Created

None new. API seeds use `LibraryBuilder` directly (TC-1). E2E seeds are `mainAt` partials plus a literal Emma with a fixed id.

## Fixtures and Helpers Created or Changed

None. The spec reuses `e2e/home.ts` (`mainAt`, `mainBookCard`, `serverAtFakeToday`, `stopAndRemove`, `FAKE_TODAY`, `LEFT_HAND`) and `rgbOf` from `e2e/library.ts`. If later specs need the line (3.3's follow-up, 3.6), move `reentryFacts` into `home.ts`.

## Mock Requirements

None. Every leaf runs against the real `bookvie`.

## Required data-testid Attributes

None. The line is found through its "Last updated …" fact; the contract below fixes its shape.

---

## Contract the Scaffolds Pin (names the implementation must use)

**`domain/pace.py`** (re-exported from `bookvie.domain`):
- `measured_pace(library: Library) -> Fraction | None`: over every Book's Readings with both `startDate` and `finishDate`, Σ `finishedPages` ÷ Σ (`finishDate` − `startDate` + 1 days). `None` when none qualify. `Fraction(0)` when they qualify but total 0 pages.
- `days_left(pages_left: int, pace: Fraction | None) -> int | None`: `None` when `pace` is `None` or 0, or when `pages_left` ≤ 0; otherwise `max(1, ceil(pages_left ÷ pace))`, computed exactly.
- No Clock: every input is a stored date.

**The home view** (`GET /api/views/home`, `HomeMainBook`):
- `daysLeft: int | null`: `days_left(pages − currentPage, measured_pace(library))`. The key is always present; "omits" in the criterion means `null`, as `lastExportAt` does.
- `lastProgressUpdate: <ISO 8601 with offset> | null`: the current Reading's, as stored.
- Regenerate `schema.d.ts` with `npm run check:api`.

**The re-entry line** (last in the Main book card, after the page field):
- One element (the mockup's `<p>`) whose **direct children are the facts, one element each**, in this order:
  1. "Last updated " + `relativeDay(lastProgressUpdate, now)` ("today", "yesterday", "N days ago", "over a year ago"). Omitted when `lastProgressUpdate` is `null`.
  2. "~N days left", or "~1 day left" for 1. Omitted when `daysLeft` is `null`.
  3. `lastExportLine(lastExportAt, now)`: "Last export: N days ago" or "No export yet".
- **Dots are CSS, not text:** a 6px round `::before` in `ink-tertiary` on every fact after the first (`span + span::before`, as in the mockup). The facts are `body-sm` in `ink-secondary`, in both themes.
- No warning tone anywhere: no other color, no icon, no `alert` (NFR6).
- `now` is Home's `useNow()`, so focus and visibility recompute the line together with the date header.
- Home's header line shows "Last export" only when there is no Main book (already true).

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/e2e/home.spec.ts` AC-4 (axe on Home with a Main book, both themes) | No code change expected. It now covers the line, so a contrast miss in `ink-secondary` fails it. |
| `frontend/e2e/home.spec.ts` `[P2] AC-3` (no Last export on the header line with a Main book) | Stays green. Its comment ("Story 3.4's re-entry line carries Last export elsewhere") becomes true. |
| `frontend/e2e/home.spec.ts` AC-5 | If any assertion pins the card's full text, add the line. |
| `backend/tests/test_home_view.py`, `test_views.py` | If any assertion compares the whole `mainBook` object, add `daysLeft` and `lastProgressUpdate`. |
| `backend/tests/test_contract.py` | Regenerate `schema.d.ts` with `npm run check:api`. |
| `backend/tests/test_coverage_gate.py` | `domain/pace.py` falls under the ≥ 90% `domain/` gate; AC-1 and AC-2 cover every branch. |

## Assumptions for the spec to confirm

- **"Omits days left" = `null`**, not a missing key. The views keep nullable keys (`lastExportAt`, `currentPage`); `response_model_exclude_none` is used only by the intent envelope.
- **Pace counts every Book's finished Readings**, re-reads included, Main book included (its earlier finished Readings). Side reads don't exist until Epic 4; whether they count is for Story 4.7.
- **`finishedPages` is the pace numerator**, not the Book's current page count (epic context: "stored, never recomputed").
- **A Reading with `startDate` after `finishDate`** can't be stored (finish validation, Story 3.6). Pace doesn't guard against it; if the invariants don't forbid it, the spec should say which wins.
- **"Last updated" with `lastProgressUpdate` `null`:** the fact is omitted. Every Reading created by `start-reading` sets it, so only old or hand-edited data hits this.
- **A future `lastProgressUpdate`** (clock skew) reads "today", as `relativeDay` already does.
- **AC-6's refetch:** a synthetic `focus` may also trigger TanStack Query's window-focus refetch. The scaffold doesn't care either way.

## Open items that bear on this story

- **PRG-E2E-001** (P0): its "~N days left after refetch" half waits for this story. See the follow-up below on `update-page.spec.ts`.
- **3.3's open follow-up** "AC-2, the re-entry line, once Story 3.4 lands" is the same check.
- **No deferred-work item names Story 3.4.**

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_reentry.py`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/reentry.spec.ts -g "AC-3"`

### AC-1, AC-2: the numbers
- [ ] `domain/pace.py`: `measured_pace` and `days_left`, exported from `bookvie.domain`.
- [ ] `views/models.py`: `HomeMainBook.days_left` and `last_progress_update`.
- [ ] `views/shelf.py`: `_main_book` fills both. Then run `npm run check:api`.
- [ ] Activate AC-1 and AC-2.

### AC-3, AC-5, AC-6: the line
- [ ] A `ReentryLine` component (or markup in `MainBookCard`) after the `PageField`, with its own CSS Module: `body-sm`, `ink-secondary`, `span + span::before` dots in `ink-tertiary`.
- [ ] Pass Home's `now` and `lastExportAt` down to the card; reuse `relativeDay` and `lastExportLine`.
- [ ] "~1 day left" vs "~N days left".
- [ ] Activate AC-3, AC-5 and AC-6.

### AC-4: Last export's place
- [ ] With a Main book, "Last export" only in the line (the header already hides it).
- [ ] Activate AC-4.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **PRG-E2E-001 / 3.3's AC-2 (P0):** in `update-page.spec.ts`, after a save from "Last updated 3 days ago", the line reads "Last updated today" and, with a pace in the seed, "~N days left" for the new page.
- [ ] **AC-3, a year:** `lastProgressUpdate` over 365 days ago reads "Last updated over a year ago".
- [ ] **AC-3, no `lastProgressUpdate`:** the "Last updated" fact is omitted and the others keep their dots right (the first remaining fact has none). The scaffold's locator needs the "Last updated" fact, so this one needs another way to reach the line.
- [ ] **AC-4, the transition:** delete the Main book from Book detail (it clears `mainBookId`), and Home moves "Last export" back to the header line. After Story 3.6, the same after a finish.
- [ ] **AC-6 with the line's other facts:** "Last export: 12 days ago" becomes "13 days ago" after midnight, from the same `now`.
- [ ] **axe on Home with the line,** both themes: covered by `home.spec.ts` AC-4 once the line exists. Confirm it stays green.
- [ ] **PAC-UNIT-001, PRG-UNIT-001:** tick them in the trace once AC-1 and AC-2 are green. PRG-E2E-002 once AC-3 is green.
