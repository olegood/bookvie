---
title: 'Story 3.4: See where I left off and how long is left'
type: 'feature'
created: '2026-11-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '96de85b6a57e62998e141761027c6614e3e7155c'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-4-see-where-i-left-off-and-how-long-is-left.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Main book card shows the page but not when the user last updated it or how long is left, and with a Main book "Last export" appears nowhere on Home.

**Approach:** Add Measured pace and days left in `domain/pace.py`, carry `daysLeft` and `lastProgressUpdate` in the home view's `mainBook`, and end the card with a muted re-entry line: "Last updated …" · "~N days left" · "Last export …". Names, shapes and behaviours follow the ATDD checklist's "Contract the Scaffolds Pin"; the 6 red leaves are activated, not rewritten.

## Boundaries & Constraints

**Always:**
- `measured_pace(library) -> Fraction | None`: over every Book's Readings with both `startDate` and `finishDate` (re-reads and the Main book's earlier Readings included), Σ stored `finishedPages` ÷ Σ (finish − start + 1) calendar days. `None` when none qualify; `Fraction(0)` when they qualify with 0 pages. Exact arithmetic, no Clock.
- `days_left(pages_left, pace) -> int | None`: `None` when pace is `None` or 0 or `pages_left` ≤ 0; else `max(1, ceil(pages_left ÷ pace))`.
- `HomeMainBook.daysLeft: int | null` and `lastProgressUpdate: timestamp | null` — keys always present, `null` means omitted. Regenerate `schema.d.ts`.
- Re-entry line: last in the card, after the page field; one `<p>` whose direct children are one `<span>` per fact, in order: "Last updated " + `relativeDay(...)` (omitted when `lastProgressUpdate` is null), "~N days left" / "~1 day left" (omitted when `daysLeft` is null), `lastExportLine(...)`. `body-sm`, `ink-secondary`; dots are CSS `span + span::before`, 6px round `ink-tertiary`. Uses Home's `useNow()` so focus/visibility recompute it with the date header.
- "Last export" sits in the line with a Main book and on the header line without one (header already does this).
- WCAG 2.2 AA both themes (Home's axe test covers the line).

**Never:**
- No warning tone: no other color, icon, emphasis or `alert` in the line (NFR6).
- No client-side pace or days-left arithmetic (AD-6); no stored-shape change; no new intent or error code.
- No Quick pace calculator, spine fill (3.5) or Finish dialog (3.6).

**Decisions (defaults, low-stakes):**
- A qualifying Reading whose `finishDate` is before its `startDate` (impossible via the app) is skipped by pace, so the day sum is never 0 or negative.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|---|---|---|
| Paced | p.151/330, pace 900/31 | `daysLeft` 7 |
| Last page | p.330 | `daysLeft` null; gauge 100%; no "days left" fact |
| No pace | no finished Reading with start date, or only 0-page ones | `daysLeft` null |
| Same day / DST | start = finish; 10-24..10-26 | 1 day; 3 days |
| No export | `lastExportAt` null | "No export yet" |
| No `lastProgressUpdate` | null | fact omitted, first remaining fact has no dot |
| Past midnight | focus/visibility after 00:00 | "Last updated yesterday", new header date |

</frozen-after-approval>

## Code Map

Backend:
- new `backend/bookvie/domain/pace.py` -- `measured_pace`, `days_left`; re-export both in `domain/__init__.py` (`__all__`). Use `Reading.start_date`, `finish_date`, `finished_pages` (`model.py:35`); `finished_pages` may be `None` on hand-edited data — treat as 0.
- `backend/bookvie/views/models.py:51` `HomeMainBook` -- add `days_left: int | None`, `last_progress_update: AwareDatetime | None` (camelCase via `_View`).
- `backend/bookvie/views/shelf.py:78` `_main_book` -- fill both from `current_reading(book)` and `days_left(book.pages - page, measured_pace(library))`. `home()` stays clockless.
- Then `npm --prefix frontend run api:gen` for `schema.d.ts`.
- `test_home_view.py`, `test_views.py` -- update only if they compare the whole `mainBook`.

Frontend (`frontend/src`):
- `lib/relativeDay.ts` -- reuse `relativeDay`, `lastExportLine`, `useNow` unchanged.
- `pages/HomePage.tsx:48,92-115` -- pass `now` and `lastExportAt` into `MainBookCard`.
- `components/MainBookCard.tsx` -- render a new `ReentryLine` after `PageField`; update its docstring.
- new `components/ReentryLine.tsx` + `.module.css` -- per mockup `key-home.html:203-205` (`p.reentry`: margin-top 16px, flex-wrap, dot margins 10px); tokens `--font-body-sm-*`, `--color-ink-secondary`, `--color-ink-tertiary`.

E2E (`frontend/e2e`): `home.ts` seeds (`mainAt`, `serverAtFakeToday`); `update-page.spec.ts:97` (P0 AC-2); `home.spec.ts` AC-3/4/5 should stay green.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/pace.py`, `domain/__init__.py` -- pace and days left.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- the two view fields; regenerate `schema.d.ts`.
- [x] `backend/tests/test_reentry.py` -- activate AC-1/AC-2; add start-after-finish skipped and `finishedPages` null as 0.
- [x] new `frontend/src/components/ReentryLine.tsx(+.module.css)`, `MainBookCard.tsx`, `pages/HomePage.tsx` -- the line.
- [x] `frontend/e2e/reentry.spec.ts` -- activate 4 leaves; add follow-ups: over a year ago; `lastProgressUpdate` null (facts start with "~N days left", first has no dot); Main book deleted → "Last export" back on the header; "Last export: 13 days ago" after midnight.
- [x] `frontend/e2e/update-page.spec.ts` -- P0 AC-2 follow-up: after a save from 3 days ago the line reads "Last updated today" and, with a paced seed, the new "~N days left".
- [x] `README.md` -- Epic 3 status line (re-entry line on Home).

**Acceptance Criteria:**
- Given the ATDD leaves, when activated, then `pytest tests/test_reentry.py` and `e2e/reentry.spec.ts` pass.
- Given the whole suite, when `npm run check` runs, then it passes, including coverage gates and `check:api`.

### Review Findings

Code review 2026-11-05 (layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check).

- [x] [Review][Patch] README status line's "(or the empty states)" now reads as attached to the re-entry line, not the card [README.md:8]
- [x] [Review][Patch] README's Story 3.4 spec link breaks the sibling pattern ("intent, I/O matrix and verification for …") [README.md:181]
- [x] [Review][Patch] `dots()` docstring says "width and background" but it also returns `content`, which the no-dot check relies on [frontend/e2e/reentry.spec.ts:58]
- [x] [Review][Patch] The null-`lastProgressUpdate` API test has no Measured pace, so `daysLeft is None` holds trivially; seed a paced library and assert `daysLeft` is still given [backend/tests/test_reentry.py:226]
- [x] [Review][Defer] Spine drift: Structural Seed, AD-20, AD-6, AD-19 don't reflect pace rules, nullable `daysLeft`/`lastProgressUpdate` [_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md] — deferred: re-raised by spine-check; already recorded in deferred-work.md (SC1–SC4), reconciled per epic
- [x] [Review][Defer] README "19 of 41 stories done" is stale (20) [README.md:8] — deferred: pre-existing since 3.3; already recorded in deferred-work.md
- [x] [Review][Defer] README "Test automation summary (currently story 3.2)" is stale; `automation-summary.md` is at story 3.3 [README.md:182] — deferred: pre-existing, not caused by 3.4

**Rejected:**
- BH: missing `finishedPages` lowers pace instead of being skipped — low; the Code Map explicitly says treat it as 0, so the fix edits the spec.
- BH: no direct unit tests for `days_left` edge branches — false; `ceil` of a positive ratio is already ≥ 1, and negative `pages_left`/pace are unreachable (invariant; EC1 in pass 1).
- BH: "~1 day left" singular untested — false; `reentry.spec.ts:111` asserts `~1 day left`.
- BH: P0 update-page seed dropped the Purpose — false; no assertion in that test reads the Purpose, and `test_update_page.py` seeds and covers it.
- BH: duplicated Emma fixture across specs — low; no named harm, the two seeds pin different numbers on purpose.
- BH: screen readers get no separator between facts — low; re-raise of pass-1 BH4, the ariaSnapshot reads separate words.
- BH: no "over a year" boundary test — low; `relativeDay` is reused unchanged and owned by its own tests.
- BH: same-day pace test not visible — false; `test_reentry.py:102` asserts same-day = 1 day.
- BH: README describes 3.4 as finished while in review — false; the README line describes the story as merged, as 3.1–3.3 did.
- EC: Main book without an unfinished Reading gets full-book days left — low; the state breaks an invariant and is not reachable; the fix adds a guard.
- VG: AC-3's no-dot check still only checks width; the Implementation Note overstates the BH6 fix — low; the leaf is frozen ("activated, not rewritten"), the follow-up test pins `content`, and the note fix edits the spec.
- AA: `days_left` returns `None` for a negative pace too — low; unreachable, the safe reading.
- AA: `measured_pace` runs at the last page — low; efficiency only, single-user library.

## Implementation Notes

- `reentryFacts` moved from `reentry.spec.ts` into `e2e/home.ts` (as the ATDD checklist suggested) so `update-page.spec.ts` can read the line; `reentryFactsByExport` reaches the line through the "Last export" fact for the `lastProgressUpdate: null` follow-up.
- `test_views.py::test_home_view_main_book_card_fields` compares the whole `mainBook`, so it now pins `lastProgressUpdate` and `daysLeft: null` (its only finished Reading is back-filled).
- Update-page P0 AC-2 uses a paced seed (Emma, 20 pages a day): "~9 days left" before, "~6 days left" after saving p.212.
- `spine-popover.spec.ts` "at 1024px …" failed once under full-suite load (0 rows found), passed 5/5 alone and in the next full `npm run check`; unrelated to this story.

- Review pass 1 patches applied: `MainBookCard` docstring names the re-entry line and its `lastExportAt`/`now` props; a pace test where the Main book's own earlier finished Reading counts (730/20, ~10 days); the no-dot check asserts the first fact's `::before` has no `content`. Re-verified by the orchestrator: `pytest` 970 passed; `npm run check` green (e2e 247, smoke ok). Deferred: spine reconciliation for 3.4 and AD-19's nullable `lastProgressUpdate`, README story count (deferred-work.md).

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| VG1 | Main book's own earlier finished Reading never counted in a pace test | gap (pre-verified) | Every seed gives the Main book only its current Reading or a back-filled one; skipping the Main book would pass all tests. | patch |
| BH7 | `MainBookCard` JSDoc not updated for the re-entry line and its new props | low | Docstring still ends at "the gauge and the page field"; the Code Map asked for the update; direct correction. | patch |
| BH6 | "No dot" assertion only checks `width != 6px` | low | Any other dot size on the first fact would pass; direct assertion fix. | patch |
| SC1+SC2+SC3 | Spine lags 3.4: Structural Seed lists pace as planned; AD-20 lacks the start-after-finish skip and null-`finishedPages` rules; AD-6 lacks the `daysLeft` null cases | low | Real doc drift; the fix edits the architecture spine, which is reconciled per epic (`spec-reconcile-architecture-spine-with-epic-2`). | defer |
| SC4 | AD-19 lists `lastProgressUpdate` as non-null; the model and now the home view allow `null` | low | Pre-existing (`model.py:40` already nullable); fix is a spine edit. | defer |
| BH2 | README "19 of 41 stories done" is stale | low | Pre-existing: 3.3 became done in its own review without a count change (14 + 3 + 3 = 20); not caused by 3.4. | defer |
| BH4 | Screen readers get the facts run together | false | Playwright `ariaSnapshot` of the line reads "Last updated 3 days ago ~9 days left No export yet": the facts are separate words. | reject |
| BH3 | Home's axe test doesn't cover the line | false | `mainAt(212)` renders the line (the Last export fact always renders) in the same `ink-secondary` style as every fact, scanned in both themes; the dots are not text. | reject |
| BH1 | Spec `in-review` vs sprint `in-progress` | false | Step 5 syncs sprint-status to `review`; the review runs between. | reject |
| BH5 | Wrapped row starts with a dot at narrow widths | low | Same CSS as the mockup; Home has no narrow-layout rules (desktop app, as in 3.3 BH11); fix adds layout rules. | reject |
| BH8 | `days_left` with a page past the last page untested | false | The invariant keeps `currentPage` within pages; the `<= 0` branch is tested at 0. | reject |
| BH9 | "Past midnight" doesn't say `daysLeft` is date-independent | low | No named harm; `daysLeft` is clockless by contract (AD-20). | reject |
| BH10 | Spec log sections empty; `test_home_view.py` not mentioned | false | The logs fill in this step; the Code Map says to update those tests "only if" they compare the whole `mainBook`. | reject |
| BH11 | Pace computed per request with no note | low | Linear in Readings on a single-user library; no named harm. | reject |
| BH12 | E2E helpers locate the line by DOM position | low | The shape is pinned by the ATDD contract (direct children are the facts); no current harm. | reject |
| EC1 | Negative `finishedPages` skews pace | low | Only hand-edited data can hold it; the fix is a guard for a state not shown reachable. | reject |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- all pass, 0 skipped from 3.4
- `npm run check:api` -- clean
- `npm run check` -- green, incl. e2e and coverage gates
