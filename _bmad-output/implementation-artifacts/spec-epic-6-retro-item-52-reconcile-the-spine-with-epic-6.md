---
title: 'Reconcile the architecture spine with as-built Epic 6'
type: 'chore'
created: '2026-11-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 6 deferred eight "spine drift" entries to `deferred-work.md`, and none of them edited the spine (Epic 6 retro F-S1 and F-S2, sprint item `epic-6-retro-item-52-…`). The entries are `:716`, `:719`, `:722`, `:725`, `:738`, `:770`, `:780` and `:789`. They name these gaps:
- **AD-6:**
  - It doesn't state the Book-scope pages left rule (`domain/progress` `pages_left`: an unfinished Reading gives max(pages − currentPage, 0), a never-started Book all its pages, only-finished Readings 0), or that the `book` view and the `catalog` view carry `pagesLeft` and `measuredPace`, the catalog's being the sum over every Book.
  - The calculator bullet omits the client's own rules: months = round(days ÷ 30.4375), years = round(months ÷ 12) from 24 months, plain decimals only, no result for an out-of-range finish date, and the prefill to one decimal without ".0". Book detail and Catalog (behind "How long until…?") both host `PaceCalculator`.
  - The stats view lacks the bucket rules: calendar months touched, both ends included; `period` `YYYY-MM` or `YYYY`; oldest first, empty periods as 0 books and 0 pages; All time from the earliest finish to the latest, `[]` only with nothing finished.
  - The client list lacks Custom's handling (the earlier date sent as `from`, the silent swap, no request while a field is empty or invalid) and the Stats bars' presentation (height = pages over the range's largest, the `aria-hidden` chart with a visually hidden table, "Jan" labels with the year on the first bar and each January).
- **AD-3 (F-S2):** the sanctioned pre-checks lack Custom's swap and no-request rule, which pre-empt the stats view's 422 for `to` before `from`.
- **AD-9:** the stats view refuses a half range, a value that isn't a `YYYY-MM-DD` date, or `to` before `from` with 422 `invalid_fields`, but AD-9 names only 404 `book_not_found` as a view refusal.
- **Overview and Seed (AD-16):** the cataloging skill is an HTTP client of the intent API (`POST /api/intents/add-book`, `GET /api/views/catalog`, `GET /api/views/book`), not an automated browser. Name it as a second client of the add-book intent body (AD-8).
- **Structural Seed:** `domain/` lacks `pages_left`; `views/` lacks `stats`; `lib/` lacks `pace` and `stats`.
- **Capability Map:** the FR-15 row should name `views/shelf` (book and catalog), `domain/progress`, `lib/pace` and `components/PaceCalculator`. The FR-16 row should name `views/stats`, `lib/stats`, `StatsPage`, `StatsBars`, `RangePicker`, and add AD-3 and AD-9. The preface still gives `views/stats` as unbuilt.

Oleg folded one more item in (retro open question 4): DESIGN.md's non-text contrast table lacks the library meter's fill on `page` (`deferred-work.md:764`). It is `accent` vs `page`: 4.96 light, 7.68 dark, the focus-ring figures.

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does and cites the story that decided it, as Epic 5's item 44 did (`spec-epic-5-retro-item-44-…`, commit `8ca86a0`). Bump `updated`.
- Add the DESIGN.md row.
- Close each of the nine entries with a `resolved:` line.
- Describe the calculator prefill as built today. Action 55 (E6-R1) will change how the untouched prefill is computed and records that in EXPERIENCE.md; it is not drift, so don't pre-empt it here.
- No code changes. Oleg reviews the spine diff before it's final.

</frozen-after-approval>

## Implementation Notes

- **Count:** eight open drift entries from Epic 6 (`deferred-work.md:716`, `:719`, `:722`, `:725`, `:738`, `:770`, `:780`, `:789`) plus the DESIGN.md entry `:764`, all closed with a `resolved:` line. A case-insensitive scan finds no other "spine drift" entry without one. The two scan hits that remain mention drift but aren't drift: `spec-epic-4-retro-item-38`'s cached-home entry and 6.4's OpenAPI docstring entry.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-11). Each statement was checked against the code (`domain/progress.py` `pages_left`; `views/shelf.py` `catalog()` and the book view, l.95-96, l.123, l.333-334; `views/stats.py`; `http/api.py` `stats_view`; `lib/pace.ts`; `lib/stats.ts`; `StatsPage.tsx`; `api/views.ts` `useStatsView` `enabled: range !== null`; `StatsBars.tsx`; `.claude/skills/bookvie-new-book/scripts/add_book.py` and `check_catalog.py`):
  - **Overview:** the clients are the user's browser and the cataloging skill, which calls the HTTP API with no browser.
  - **AD-3:** Custom joins the sanctioned pre-checks. The lead-in now reads "refuse or correct … showing the server's exact copy whenever it shows one", because Custom shows no copy and corrects (swaps) rather than refuses. FR-16 added to Binds.
  - **AD-6:** a Pages left bullet (rule, both views, Home's days left on the same function, E6-R2's re-read case); the Stats view bullet split into buckets, refusals and presets; the calculator bullet gains the client rules and both hosts; a Stats bars bullet.
  - **AD-8:** the skill is a second, untyped client of the `add-book` body and the `catalog` and `book` views.
  - **AD-9:** the stats view's 422 `invalid_fields` (with E6-R5's note), and Binds name the refusing views.
  - **Seed:** the `AG` node, `views/` `stats`, `domain/` `pages_left`, `lib/` `pace` and `stats`.
  - **Map:** the preface no longer names an unbuilt module; the FR-15 and FR-16 rows.
- **The calculator prefill** is described as built (one decimal, no ".0"). Action 55 will change how the untouched prefill computes; it updates EXPERIENCE.md, and AD-6 points there.
- **DESIGN.md:** besides the fill row (`accent` vs `page`, 4.96 / 7.68), the decorative track row (`line` vs `page`, 1.21 / 1.45) was added to mirror the `shelf-wall` pair. Ratios computed from the tokens with the WCAG formula; the same script reproduces the existing rows' 4.55 / 7.27 and 1.11 / 1.37.
- **Not added:** `RangePicker` and `StatsPage` have no AD of their own beyond AD-3 and AD-6; they're named in the FR-16 row only.
- **No code changes.** The tests that read the spine (`test_layers.py`, `test_stack_pins.py`, `test_home_slice.py`, `test_ordering.py`) passed 104 of 104.
- **Beyond the nine entries:** the review found more drift in the Paradigm paragraph, AD-6 (the `pace.cases.json` table) and AD-8 (the envelope keys, the skill's copied duplicate rule). It is recorded as one more drift entry, resolved in this pass (item 44's precedent), plus one open entry for the copied duplicate rule itself.
- **Sprint item 52 stays `open`** until Oleg approves the spine diff. Then it is marked `done` with `sprint_status.py --set-action-status` in the same commit, as item 44 was.

## Review Triage Log

### 2026-11-11: Blind Hunter, pass 1

Floor N = 7 (about 41 kB). It reported 10 findings.

- **`[low]` `[patch]` The Paradigm paragraph said every client renders views and holds no domain state, and its diagram shows only the browser.** Patched: clients send intents and read views, which the browser renders, and the skill calls `http/` the same way.
- **`[medium]` `[patch]` The skill copies `domain/duplicates`' rule without a shared check** (`check_catalog.py` docstring), which AD-3 prevents. Patched: AD-8 records it as a known gap, with a new open `deferred-work.md` entry. Advisory only: the server still refuses with 409 `duplicate_book`.
- **`[low]` `[patch]` AD-8 left out the AD-9 envelope the skill reads** (`add_book.py` l.124-170: `ok`, `ids.bookId`, `error.code`, `duplicates`, `fields`, `message`). Patched, and the `:780` resolution says so.
- **`[low]` `[reject]` AD-17, the FR-2 row, AD-16's and AD-1's agent wording still assume a browser agent.** The skill's drift entry (`:780`), decided with Oleg in the Winston discussion, keeps FR-2 and AD-17 as they are: the form must still be fillable by its labels, and the e2e suite enforces the contract. AD-1's and AD-16's Binds cite FR-2 and stay true. The IDs row's "once those skills exist" is about card-note writing skills, which still don't exist.
- **`[low]` `[patch]` AD-6's calculator bullet didn't name `pace.cases.json`,** the table both `pace.test.ts` and `test_pace_calculator.py` read. Patched.
- **`[false]` AD-3 misstates when Custom swaps.** "When focus leaves them" is the rule. The Tab keydown handler (`StatsPage.tsx:77-81`) implements that rule in Chromium, where blur comes too late, and its code comment records why.
- **`[low]` `[patch]` The map preface's second sentence described no row, and "every FR row" overstated, since A1 isn't an FR.** Patched: "Every row below is built."
- **`[low]` `[patch]` AD-9 didn't say where the stats view's 422 copy lives.** Patched: it points to `http/api.py` `stats_view`. AD-9 doesn't quote every field message elsewhere either.
- **`[false]` The spec is still `in-progress`, and sprint item 52 is still open.** The spec is finalized in this step. The sprint item waits for Oleg's approval, as item 44 did (see Implementation Notes).
- **`[low]` `[patch]` The DESIGN.md fill row's label had a parenthetical no other row has.** Dropped. The extra track row stays: it is correct (recomputed), mirrors the `shelf-wall` pair, and is flagged for Oleg in the Implementation Notes and in the `:764` resolution.

