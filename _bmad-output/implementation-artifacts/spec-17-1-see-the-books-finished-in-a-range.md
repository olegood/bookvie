---
title: 'Story 17.1: See the Books finished in a range'
type: 'feature'
created: '2026-11-27'
status: 'done'
baseline_revision: 'e40f646979814f8dc814b828706345c689843428'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-17-1-see-the-books-finished-in-a-range.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-7), reconciled before the next epic: the same-page bullet says PageHeading, StatsPage's page key and scroll all call the one lib/page function, but only main.tsx calls isSamePageReplace; the others read lib/page's module-level page key through useNavigatedHere, whose key is now that page key on every page, not location.key.
    evidence: |-
      Spine Check, build-auto review of Story 17.1; frontend/src/main.tsx (router.subscribe), frontend/src/lib/page.ts (pageKey, markNavigated, useNavigatedHere). The single decision point holds; only the spine's wording is stale.
    location: >-
      frontend/src/lib/page.ts
    severity: low
  - summary: >-
      Spine drift (AD-6; Structural Seed components/ line, Capability Map FR-16 row), reconciled before the next epic: the spine names neither components/RatingStars (Book detail's stars, now shared with the Stats finished list) nor lib/catalog's authorPart.
    evidence: |-
      Spine Check, build-auto review of Story 17.1; frontend/src/components/RatingStars.tsx, frontend/src/lib/catalog.ts (authorPart). AD-6's text agrees with the code.
    location: >-
      frontend/src/components/RatingStars.tsx
    severity: low
  - summary: >-
      Spine drift (AD-6, Stats address → Who writes), reconciled before the next epic: the spine says lib/stats parses the address into { range, from, to, period }, but parseStatsAddress returns StatsSelection ({ preset } or Custom's range) and reads no period, which is Story 17.2's.
    evidence: |-
      Spine Check, build-auto review of Story 17.1; frontend/src/lib/stats.ts (parseStatsAddress). Record the shape that ships after Story 17.2.
    location: >-
      frontend/src/lib/stats.ts
    severity: low
  - summary: >-
      Typing a Custom date in Chromium commits each complete segment state (a year passes through 0002, 0020, 0202), so each one fetches and, once current, may announce the range line: a screen-reader user can hear several lines while typing one date.
    evidence: |-
      Blind Hunter, build-auto review of Story 17.1; frontend/src/pages/StatsPage.tsx (changeFrom, changeTo, the announce effect). Pre-existing since Story 6.3, whose range was orderedRange(customFrom, customTo) on every change with the same announce rule; Story 17.1 adds only the address replace, which adds no history. Settling it means committing or announcing on leaving a field, a UX decision.
    location: >-
      frontend/src/pages/StatsPage.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Stats shows how many Books and pages Oleg finished in a range, but not which Books (issue #8). The range is only component state, so Back from a Book always lands on This year.

**Approach:** The server adds `finishes` (one `StatsFinish` per counted Reading, ordered) to `StatsView`, which `get_stats` returns too. Stats renders them as a list under the chart, and keeps the range in the address (`?range=…&from=…&to=…`) with same-page replaces that keep focus and scroll, so Back from a Book restores the list.

## Boundaries & Constraints

**Always:**
- The client never sorts, counts or filters `finishes`. Everything under the picker (numbers, bars, heading, list) renders from the one shown view and the selection that view was fetched for, never the address's, while `keepPreviousData` holds it.
- Every address write replaces the whole search (never a merge), carries `lib/page`'s same-page marker and is built once per user action. A plain `/stats` (no `range`, `from` or `to`) is This year and isn't rewritten until the first change.
- One `lib/page` function decides a same-page replace: navigation type REPLACE **and** the marker. PUSH, POP, a REPLACE without the marker, and the marker restored from `history.state` (Back, Forward, reload) are route changes.
- Announce only after the person's own press; arrival (nav, reload, Back, a link with a range, a fallback) speaks nothing.
- Strings in `lib/stats`: the heading, the row `aria-label`. Author part as the catalog writes it, stars as Book detail's Readings stars (`starsLabel`), dates `shortDate`.
- Row styling follows DESIGN.md `components.stats-finished-row` with literal values in the CSS module; `tokens.css` and `schema.d.ts` are never hand-edited.
- Existing tests change only where the Epic 17 gate names them for 17.1: `backend/tests/test_stats.py:253`, `frontend/e2e/stats.spec.ts:119` and `:208`, `agent_client.py` `_parse_descriptions`. `lib/page.test.ts` stays unchanged.
- Subagents and every step: no `git stash`, `git checkout -- <path>`, `git restore` (except `--staged`), `git reset`, `git clean` or branch switch.

**Never:** read or write `period`, or change the chart (Story 17.2); side reads in the list; a new endpoint, paging or sorting; `localStorage`; a new agent tool; README edits; edits to the spine.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Finishes | Range with back-fill, re-read, two same-day finishes, null `finishedPages`, side read | One entry per finished Reading in range; null pages → 0; side read absent; length = `books`, sum = `pages` | — |
| Order | Same-day finishes | `finishDate` desc, `title_key`, Book id, stored Reading index; stable | — |
| Empty | Range with no finishes / empty library | `"finishes": []`; no `h2`, no list, existing empty line | — |
| Preset press | Last year | address `/stats?range=lastYear` by replace, history length unchanged | — |
| Custom typing | empty / half / reversed fields | write only a complete, ordered, server-valid range; else keep last committed range in address, view and list | — |
| Bad address | `range=nextWeek`, Custom missing `to`, `0000-01-01`, `2026-02-30` | This year, address replaced with `?range=thisYear`, silent | no message |
| Reversed address | `range=custom&from=2026-04-15&to=2026-02-01` | opens in order, address replaced in order | — |
| Nav link on `/stats?range=lastYear` | click Stats | plain `/stats`, replace (no history growth), route change (h1 focus) | — |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:376-398` -- `StatsBucket`, `StatsView`; add `StatsFinish` (`reading_id, book_id, title, first_author, author_count, cover_file, spine_color, finish_date: date, finished_pages: int, rating: int | None`) and `StatsView.finishes: list[StatsFinish]` (required).
- `backend/bookvie/views/stats.py:72` `stats()` -- already collects the finished Readings; build finishes from `(book, index, reading)` and sort with `domain/ordering.py` `title_key`. Author fields as `views/shelf.py:59-60`.
- `backend/bookvie/agent/read_tools.py:146` `GET_STATS` -- description becomes Story 17.1's text (epics.md:4004).
- `backend/tests/agent_client.py:151` `_parse_descriptions` (+ `DESCRIPTIONS` docstring :224) -- learn an Epic 17 override: exactly one `_DESCRIPTION` match in Story 17.1 replaces `get_stats`.
- `backend/tests/test_stats.py:253` -- empty view gains `"finishes": []`.
- `backend/tests/test_stats_finishes.py` -- 4 red leaves to un-skip.
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen`.
- `frontend/src/api/views.ts:286` `useStatsView` -- add `fetching: query.isFetching` (spine; 17.2 uses it).
- `frontend/src/lib/page.ts` -- add the marker (`samePageState()`), `isSamePageReplace(navigationType, state)`, and a page key that survives same-page replaces; `useNavigatedHere` returns that key.
- `frontend/src/components/PageHeading.tsx` -- focuses on page-key change (so not on a same-page replace).
- `frontend/src/main.tsx:44-50` -- subscription skips same-page replaces (`state.historyAction`, `state.location.state`), stays subscribed.
- `frontend/src/components/AppShell.tsx:58` -- Stats `NavLink` `replace` while `pathname === '/stats'`.
- `frontend/src/lib/stats.ts` -- `isIsoDate` (must also refuse year 0000: server `date` min year 1), add address parse/build, heading, row name. `frontend/src/lib/catalog.ts:124` `spineName` -- extract the "and N others" author part as a shared helper.
- `frontend/src/lib/bookDetail.ts:107,121` -- `shortDate`, `starsLabel`, `coverSrc:75`.
- `frontend/src/pages/BookDetailPage.tsx:79` `Stars` + `.stars/.star` CSS (`BookDetailPage.module.css:231-254`) -- extract to `components/RatingStars.tsx` for reuse, same look.
- `frontend/src/pages/CatalogTiles.tsx:66,100` + `CatalogTiles.module.css:162-205,299-310` -- typeset cover and cover load/fail pattern to mirror (read variant, plate measured from outer edge).
- `frontend/src/pages/CardNotesPage.tsx:185-262` -- page-key body and scroll-to-top incl. POP double scroll, to mirror in Stats.
- `frontend/src/pages/StatsPage.tsx` -- rework (below). `frontend/e2e/stats.spec.ts:119,208`; `frontend/e2e/stats-finished.spec.ts` -- 12 red leaves to un-skip; helpers already in `frontend/e2e/stats.ts`.
- Deferred-work intake: none name story 17.1 (the "before Epic 17" spine entries at deferred-work.md:1870, 1877, 1888 are all resolved).

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `views/stats.py` -- `StatsFinish`, `finishes` built and ordered as AR74 -- AC-1, AC-2.
- `backend/bookvie/agent/read_tools.py`, `backend/tests/agent_client.py` -- new description; parser override -- AC-4.
- `backend/tests/test_stats.py:253`, un-skip `test_stats_finishes.py` -- AC-1..AC-4.
- `frontend/src/api/generated/schema.d.ts` -- `api:gen` -- AC-3.
- `frontend/src/lib/page.ts`, `components/PageHeading.tsx`, `main.tsx`, new `lib/samePage.test.ts` -- marker rule + unit cases -- AC-11.
- `frontend/src/components/AppShell.tsx` -- nav replace on `/stats` -- AC-13.
- `frontend/src/lib/catalog.ts` -- `authorPart(firstAuthor, authorCount)` used by `spineName` (unchanged output).
- `frontend/src/lib/stats.ts` + `lib/stats.test.ts` (new cases only) -- `StatsSelection`, `parseStatsAddress`, `statsSearch`, `selectionRange`, `finishedHeading`, `finishRowName`, `finishMeta`; year ≥ 1 in `isIsoDate` -- AC-6, AC-10, AC-14.
- `frontend/src/components/RatingStars.tsx` (+ module CSS), `pages/BookDetailPage.tsx` -- shared stars.
- `frontend/src/components/StatsFinishedList.tsx` (+ module CSS) -- `h2` + `ol`, row link, thumbnail/typeset, stars, states, forced colors -- AC-5, AC-7, AC-8.
- `frontend/src/api/views.ts` -- `fetching`.
- `frontend/src/pages/StatsPage.tsx` (+ CSS) -- body keyed by page key; address read on mount with fallback replace; handlers write; shown-selection ref; scroll top and clear stale announcements on a route-change mount -- AC-9..AC-15.
- `frontend/e2e/stats.spec.ts:119,208`, un-skip `stats-finished.spec.ts` -- AC-5..AC-16.

**Acceptance Criteria:** (AC-1..AC-16 of epics.md Story 17.1, numbered as the ATDD checklist)
- AC-1/2: Given the seed library, when `GET /api/views/stats` is asked for any preset's dates or a mid-month Custom, then `finishes` has one entry per counted Reading with the ten keys, adding up to `books`/`pages`, ordered `finishDate` desc → title key → Book id → stored order, `[]` when empty.
- AC-3: Given the Python models, when `api:gen` runs, then `StatsView.finishes: StatsFinish[]` is required and `check:api` passes.
- AC-4: Given an agent, when it calls `get_stats`, then it returns the route's view with `finishes`, and its description equals Story 17.1's text.
- AC-5/6/7/8: Given Stats with finishes, when it renders, then an `h2` ("Finished this year", the preset and Custom forms) precedes an `ol` of one link per finish in view order, named "Title, Author, finished 14 Mar 2026, 611 pages, 4 stars", styled per `stats-finished-row`; with no finishes there is no `h2` and no list.
- AC-9: Given a range change still loading, when the previous view is held, then heading and list stay the held view's.
- AC-10/11/14: Given a preset press or a committed Custom range, when the address is written, then it is replaced (history length unchanged) with the marker, focus stays and nothing scrolls; a hand-typed bad address falls back quietly and is replaced with what shows.
- AC-12/13/15: Given Back from a Book, the nav link, or a reload, when Stats mounts, then it shows the address's range at the top with the `h1` focused (route change) and announces nothing; only the person's press announces the range line.
- AC-16: Given 17.1, when built, then `period` is neither read nor written, the chart is unchanged, and `copy.test.mjs` and axe pass in both themes.

## Spec Change Log

- 2026-11-27, Oleg's decision on the step-3 block (option A). The row's end column shows the word: "Finished 14 Mar 2026 · 611 pages", with the date and pages in their own span inside the meta line, so the name "…, finished 14 Mar 2026, 611 pages, …" holds the visible text in one run (WCAG 2.5.3, axe `label-content-name-mismatch`). Changed: `StatsFinishedList.tsx`; DESIGN.md → Stats finished list → End column; EXPERIENCE.md → The row → Shows; epics.md UX-DR106 and the Story 17.1 criterion; `epic-17-context.md`. The name, `finishMeta` and every test are unchanged. Re-run: `stats-finished.spec.ts` and `stats.spec.ts`, 31 passed, both axe leaves included.

## Review Triage Log

### 2026-11-27 — Review pass
- verdicts: 28 findings — high 0, medium 3, low 15, false 10, maybe-false 0
- findings:
  - `false` `reject` Intent alignment: Back from a Book resets scroll to the top instead of restoring the list's position. — Spec AC-12 and EXPERIENCE.md say Back opens at the top with the h1 focused; the intent's 'keep focus and scroll' is about same-page replaces, which do keep them (AC-11).
  - `false` `reject` Intent alignment: the visible word "Finished" and the DESIGN.md, EXPERIENCE.md and epics.md edits change the design surface inside the story. — Oleg's decision on the step-3 block (option A, 2026-11-27, Spec Change Log); neither the spine nor the README is touched.
  - `false` `reject` Intent alignment: useNavigatedHere().key is now lib/page's page key on every page, and page.test.ts doesn't test it. — On every page without the marker the key moves on each location change, as location.key did; only Stats sends the marker. The full e2e suite (947) passes, and page.test.ts stays unchanged as the intent requires.
  - `false` `reject` Intent alignment: reversed Custom fields are written in order at once. — The matrix says write 'a complete, ordered, server-valid range'; orderedRange orders it, and the visible swap on leaving a field is Story 6.3's.
  - `low` `reject` Intent alignment, verification gap and edge cases (same claim): StatsViewState.fetching is added but nothing reads it. — The spec's Code Map adds it for Story 17.2 (the spine's settled-view rule); a field for the next story, with no harm now.
  - `false` `reject` Intent alignment: the stable AppShell region refs and the shared RatingStars are additions the intent doesn't name. — The refs fix the AC-12 flake found at step 3 (the regions were unregistered while a page's mount effect cleared them); RatingStars is the reuse 'stars as Book detail's Readings stars' asks for.
  - `low` `defer` Spine Check: AD-7 says PageHeading, the page key and scroll all call the same-page function; only main.tsx does. — Spine drift; deferred-work.md entry.
  - `low` `defer` Spine Check: the Seed and FR-16 row name neither RatingStars nor authorPart. — Spine drift; deferred-work.md entry.
  - `low` `defer` Spine Check: AD-6 says lib/stats parses { range, from, to, period }; parseStatsAddress returns StatsSelection. — Spine drift; deferred-work.md entry.
  - `low` `patch` Blind: AppShell's JSDoc sat above the new statusRef constant, so AppShell had none. — Moved the new declarations above the doc comment, which again documents AppShell.
  - `low` `patch` Blind: no test asserts the visible "Finished" word. — AC-5 now asserts 'Finished 14 Mar 2026 · 611 pages' and 'Finished 12 Oct 2026 · 1 page' in the row text.
  - `low` `patch` Blind: finishMeta's doc says it is the whole end-column line, which now starts with "Finished". — Redocumented finishMeta as the date and pages after "Finished"; the heading and aria-label stay in lib/stats as the intent lists.
  - `low` `patch` Blind: the inner span around finishMeta has no stated purpose. — Commented it in StatsFinishedList.tsx: it is the element carrying exactly the date and pages (AC-7's exact-text style check).
  - `low` `reject` Blind: the spec contradicts itself (Auto Run Result still blocked, Design Notes say a ref, Code Map mirror). — The fix is an edit to this build's spec; Finalize rewrites the Auto Run Result.
  - `low` `reject` Blind: the loading thumbnail has no hairline and no forced-colors edge. — DESIGN.md defines no loading look for the row; the slot is decorative and loads in milliseconds from the local server, and a border would change the 44 × 64 box AC-7 measures.
  - `medium` `defer` Blind: typing a Custom date commits each segment state, fetching and maybe announcing several times. — Pre-existing since Story 6.3 (same per-change range and announce rule); deferred-work.md entry.
  - `low` `patch` Blind: the page key depends on main.tsx subscribing before RouterProvider, with no comment. — Commented the ordering in main.tsx; a module-level subscribe always precedes RouterProvider's own, so there is no bug.
  - `false` `reject` Blind: the arrival fallback can replace twice under StrictMode. — Both replaces carry the marker and target the same canonical search, so the second changes nothing; StrictMode re-runs only in development.
  - `false` `reject` Blind: Custom after All time shows Custom with blank fields while the heading says "Finished, all time". — Per the intent: nothing is written until a complete range, and everything under the picker renders from the shown view's selection (Story 6.3's 'Custom after All time starts empty and sends nothing').
  - `low` `reject` Blind: the finished ol has no accessible name. — The h2 sits directly above it, as UX-DR108 specifies; naming the list is a design addition the docs don't ask for, not a defect.
  - `low` `reject` Blind: stats.py filters finish_date twice and sorts in two passes. — The repeats narrow Optional for the type checker and the two stable sorts are documented; no caller is harmed.
  - `low` `reject` Blind: years before 1000 are written unpadded in the heading. — Only while typing a year in Custom, for one transient render; no stored finish has such a year.
  - `low` `reject` Blind: the get_stats description doesn't name every StatsFinish field. — The text is Story 17.1's line in epics.md, which the test pins; the returned JSON names every field.
  - `medium` `patch` Verification gap: no test checks that a loaded cover becomes visible. — AC-7 now asserts the DDIA cover img has visibility visible; a probe that dropped both 'loaded' paths failed AC-7.
  - `medium` `patch` Verification gap: no test checks that the arrival fallback doesn't focus the h1. — AC-14 now asserts the h1 is not focused after each fallback replace; a probe that dropped the marker failed AC-14.
  - `false` `reject` Edge cases: the arrival fallback drops a period key. — The intent requires every write to replace the whole search and keeps period out of 17.1; Story 17.2 owns it.
  - `false` `reject` Edge cases: every range write removes other address keys. — Same: 'replaces the whole search (never a merge)' is in the intent.
  - `false` `reject` Edge cases: AC-16 says period is never written, yet writes drop it. — Not writing period is what 17.1 does; dropping it with a whole-search replace is the intent's rule.

## Design Notes

- **Selection vs. address.** The picker's `preset` and Custom's From/To text are page state seeded from the address on mount. The *committed* selection is parsed from the address each render and drives `useStatsView`. Preset handlers write the address at once; Custom field handlers write only when `orderedRange` is complete, server-valid and differs from the committed range. Pressing Custom seeds the fields from the previous preset's range and writes it if complete (AC-10).
- **Page key.** `lib/page` keeps a key that changes on every location change except a same-page replace. `StatsPage` renders `<StatsBody key={pageKey}>`, so a route change (Back, nav link, link) remounts and re-reads the address; a same-page replace keeps the body, focus and scroll.
- **Arrival fallback.** On body mount, if the address's `range`/`from`/`to` differ from the canonical search of the parsed selection (and aren't all absent), replace with the canonical search and the marker. Other keys such as `period` are dropped only when that happens.
- **Shown selection.** A ref holds the selection whose view is shown: updated during render whenever `stats.current`; the heading reads it, so a held view keeps its own heading (AC-9).
- **Announcement.** `announced` ref starts at the mounted selection's key, so arrival and fallback are silent; the existing effect speaks when the committed key changes and its view is current.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- all pass, incl. `test_stats_finishes.py` un-skipped.
- `npm --prefix frontend run api:gen` -- `schema.d.ts` regenerated.
- `cd frontend && npx playwright test e2e/stats.spec.ts e2e/stats-bars.spec.ts e2e/stats-finished.spec.ts` -- all pass, none skipped.
- `npm run check` -- passes (format, lint, tsc, unit, copy, pytest, e2e).

## Auto Run Result

Status: in-review

**What was built.** Stats lists the Books behind its numbers (issue #8). The server adds `StatsView.finishes`, one `StatsFinish` per counted Reading, newest first, which `get_stats` returns with Story 17.1's description. Stats renders them under the chart as one row link per finish, with a heading naming the range. The range now lives in the address (`?range=…`, Custom with `from` and `to`), written by same-page replaces that keep focus and scroll, so Back from a Book returns to the same list. Bad addresses fall back quietly, and the Stats nav link resets to a plain `/stats` without adding history.

**History of this run.** The first run halted at step 3: axe `label-content-name-mismatch` failed on every row, because the name says "finished 14 Mar 2026" and the visible text didn't. Oleg chose option A, so the row now shows "Finished 14 Mar 2026 · 611 pages" (Spec Change Log). The resumed run's full check then caught a flaky AC-12 (3 in 15 runs). AppShell's new `useLocation` made the shell re-render on every navigation, and its inline region refs were detached while the Stats body cleared the regions on Back, so an announcement that fired on the Book page stayed. The fix: stable region refs, and the Stats link moved into its own `StatsNavLink` component. AC-12 then passed 30 of 30 runs on 4 workers. This resumed run started at step 3's Verify; the implementation came from the first run's subagent, so no new implementation subagent was launched.

**Files changed:**
- `backend/bookvie/views/models.py`: `StatsFinish`, and a required `StatsView.finishes`.
- `backend/bookvie/views/stats.py`: builds the finishes, ordered by date (newest first), then title key, then Book id, then stored order; a null `finishedPages` is sent as 0.
- `backend/bookvie/agent/read_tools.py`: Story 17.1's `get_stats` description.
- `backend/tests/agent_client.py`: `_parse_descriptions` reads the Epic 17 override (`_EPIC_17_STORY_OF`). `backend/tests/test_stats.py:253`: the empty view gains `finishes`. `backend/tests/test_stats_finishes.py`: un-skipped.
- `frontend/src/api/generated/schema.d.ts`: regenerated. `frontend/src/api/index.ts` and `views.ts`: the `StatsFinish` type, and `useStatsView` returns `fetching`.
- `frontend/src/lib/page.ts`, `frontend/src/main.tsx`: the same-page marker, `isSamePageReplace`, and the page key. `frontend/src/components/PageHeading.tsx`: docstring only.
- `frontend/src/components/AppShell.tsx`: stable region refs, and `StatsNavLink`, which replaces while on `/stats`.
- `frontend/src/lib/catalog.ts`: `authorPart`, shared with `spineName`. `frontend/src/lib/stats.ts`: the address, the selection, the heading, and the row name and meta.
- `frontend/src/components/RatingStars.tsx` and `.module.css`: Book detail's stars, extracted, used by `BookDetailPage.tsx` and the list.
- `frontend/src/components/StatsFinishedList.tsx` and `.module.css`: the list and its rows.
- `frontend/src/pages/StatsPage.tsx`: the body keyed by the page key, the address writes, the arrival fallback, the shown selection, and the scroll to the top on Back.
- Tests: `frontend/src/lib/stats.test.ts` (new cases) and `frontend/src/lib/samePage.test.ts` (new). `frontend/e2e/stats-finished.spec.ts`: un-skipped, plus the review's assertions in AC-5, AC-7 and AC-14. `frontend/e2e/stats.spec.ts:119` and `:208`.
- Design docs (option A): DESIGN.md → Stats finished list → End column; EXPERIENCE.md → The row; epics.md UX-DR106 and the Story 17.1 criterion; `epic-17-context.md`.

**Review.** 28 findings: medium 3, low 15, false 10, none high.
- **Patched (7):** 2 medium, 5 low.
  - Medium: AC-7 now checks that a loaded cover becomes visible, and AC-14 that the fallback doesn't focus the `h1`. Each new assertion was probed: removing the code it guards made it fail.
  - Low: AC-5 now asserts the visible "Finished" text. AppShell's doc comment is back on AppShell. `finishMeta` is redocumented, the inner meta span has a comment, and `main.tsx` notes its subscriber order.
- **Deferred (4):** three spine drift entries (AD-7 same-page wording; RatingStars and authorPart in the Seed and FR-16 row; AD-6's parse shape) and Custom's per-segment commits and announcements, which predate this story (Story 6.3). All four are in `deferred-work.md`.
- **Rejected (17):** each with its reason in the Review Triage Log. The main groups:
  - Per the intent (10): `period` dropped by whole-search writes, Back opening at the top, reversed fields written in order, the page key on every page, Custom after All time, the StrictMode double replace.
  - Not defects: the stable refs and RatingStars additions.
  - Low and not worth the change: `fetching` is for Story 17.2, the loading thumbnail look, the list name, the stats.py repeats, unpadded transient years, and the description text that epics.md fixes.
  - The spec's self-contradictions: the fix would be an edit to this spec.
- **Follow-up review recommended: false.** Patched counts: high 0, medium 2, low 5. The two medium patches are test assertions, each probed to fail on the defect it guards, so no unverified risk remains to name.

**Verification.**
- `npm run check` passed after the patches: format, lint and `tsc` (`check:api`); pytest 2538 passed; e2e 947 passed; smoke passed.
- `npm --prefix frontend run api:gen` left `schema.d.ts` as committed in the diff.
- The Stats specs (`stats`, `stats-bars`, `stats-finished`) all pass, none skipped.
- Matrix audit: every row is covered by a test that ran and passed:
  - finishes and order: `test_stats_finishes.py` AC-1 and AC-2;
  - empty: AC-8 and `test_stats.py`;
  - preset press and Custom typing: AC-10;
  - bad and reversed address: AC-14 and `stats.test.ts`;
  - nav link: AC-13.

**Helpers:** none added to `frontend/e2e/*.ts`. In `backend/tests/`, the constant `_EPIC_17_STORY_OF` mirrors `_EPIC_13_STORY_OF` for the new Epic 17 description line.

**Residual risks:**
- Custom commits as you type, so a year passes through 0002 and the like. Each step replaces the address (no history) and may announce (deferred above).
- The page key relies on `main.tsx` subscribing before RouterProvider mounts. That order is fixed by module load, and it is commented.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").

### Review Findings

Code review 2026-11-27 (bmad-code-review, new session). Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check. 26 findings: 0 decision-needed, 1 patch, 4 defer (3 already in `deferred-work.md` from the build-auto review, 1 new), 21 rejected. Verification Gap: one gap (the title-key tie-break). Spine Check: four drifts, three already deferred, one new (the FR-16 row). AD-3, AD-6, AD-7, AD-8, AD-11, AD-15 and AD-21 hold.

- [x] [Review][Patch] The AC-2 order test can't tell `title_key` from a raw title compare. Its same-day pair is "emile" (id `0a…`) and "Émile" (id `0b…`), and code-point order gives the same answer as the key then the Book id ("Beloved" < "emile" < "Émile"). So replacing `title_key(item[0].title)` with `item[0].title` in `stats.py` passes every test. The fix: give "Émile" the lower id and make the other title "EMILE". The key and then the id put "Émile" first, while a raw compare, casefold alone or accent-stripping alone each put "EMILE" first [backend/tests/test_stats_finishes.py:232]
- [x] [Review][Defer] Spine drift (AD-7; Capability Map FR-16 row): the row names only `lib/page` and `components/PageHeading` for the same-page marker, not `components/AppShell` (`StatsNavLink`, the replace on `/stats`) or the `main.tsx` subscription, where the same-page decision is actually made [ARCHITECTURE-SPINE.md] — deferred: spine drift, reconciled before the next epic; new `deferred-work.md` entry.
- [x] [Review][Defer] Spine drift (AD-7 same-page wording; AD-6 RatingStars and authorPart in the Seed and FR-16 row; AD-6 the parse shape) [ARCHITECTURE-SPINE.md] — deferred: already in `deferred-work.md` from the build-auto review, reconciled before the next epic. No duplicate entry added.

Patches applied 2026-11-27:
- `test_ac2_p0_…` now gives "Émile" the lower id (`EMILE_A`) and names the other Book "EMILE". The expected order is unchanged: by the title key and then the Book id, "Émile" comes first. A probe that replaced `title_key(item[0].title)` in `stats.py` with the raw title failed AC-2, and so did one with `.casefold()` alone. The probe was reverted, and `stats.py` is unchanged.

Full check after the last patch, 2026-11-27: `npm run check` exit 0. pytest 2538 passed, unit 452 passed, e2e 947 passed (none skipped), smoke ok.

**Rejected:**
- (edge) `false` The arrival fallback and the writes drop other keys such as `period`. The intent says every write "replaces the whole search (never a merge)", and the Design Notes say other keys are dropped only when the fallback fires. `addressNeedsFallback` looks only at the range keys, so it doesn't trigger a replace for them, which is consistent.
- (acceptance) `low` A Custom edit that resolves to the committed range still replaces the address when a hand-typed extra key is present (`write` compares with `location.search`). The replace carries the marker, so nothing visible happens. 17.1 reads no other key, and the whole-search rule drops it anyway.
- (edge) `false` Custom after All time shows Custom with blank fields while the heading and list show All time. This is Story 6.3's rule ("Custom after All time starts empty and sends nothing"), and the intent renders everything under the picker from the shown view's selection.
- (edge) `false` A half-edited Custom field leaves the list on the old range. The matrix row "Custom typing" requires exactly this: "else keep last committed range in address, view and list".
- (edge, verification-gap) `low` `StatsViewState.fetching` has no reader. The Code Map adds it for Story 17.2 (the spine's settled-view rule), and it does no harm now.
- (edge) `false` `get_stats` returns every finish with no paging. The intent's Never list forbids paging, and AC-2 asserts All time is unpaged.
- (edge, blind) `low` The `get_stats` description doesn't name `readingId`, `authorCount`, `coverFile` or `spineColor`, a null rating or a 0 page count. The text is Story 17.1's line in `epics.md`, which AC-4 pins character for character, so the fix would edit planning docs. The JSON names every field.
- (acceptance) `low` The visible word "Finished" is written in `StatsFinishedList.tsx`, not in `lib/stats`. The intent's list names only the heading and the row `aria-label`, and the word came with Oleg's option A. axe `label-content-name-mismatch` and AC-5's visible-text assertion catch any drift between the two.
- (acceptance) `low` Pressing a range and then the mounted one again, before the first loads, announces nothing. Story 6.3 has the same `announced` rule, so it isn't new, and the double press while loading is rare.
- (blind) `low` (`maybe-false`) `useNavigatedHere` reads a module-level `pageKey` during render, which can tear if an urgent re-render of the outgoing page lands inside a pending router transition. Settling it needs a reproduction under React Router 8.5's `startTransition` updates. If it is real, the outgoing page's body remounts once just before it unmounts, which is negligible. No route here suspends, so the transition commits at once.
- (blind) `low` `isSamePageReplace` doesn't check that the path stayed the same. Only Stats sends the marker, always to its own path. A path guard would protect against a caller that doesn't exist.
- (blind) `low` The page-key bookkeeping in `main.tsx` has no unit test. e2e AC-11, AC-12, AC-13 and AC-14 cover it through the real router, and extracting a function to test is a refactor.
- (blind) `low` `samePage.test.ts`'s "fresh marker" case asserts object identity, which nothing depends on. It's harmless, and the predicate cases around it cover the rule.
- (blind) `low` The heading's `shownSelection` and the numbers' `shown` are two sources. Both update only when `stats.current`, so they agree today. The named harm, divergence in Story 17.2, is speculative.
- (blind) `false` No decision covers a finish with unknown pages. The matrix row "Finishes" says "null pages → 0", and AC-1 and AC-5 pin it.
- (blind) `low` The loading thumbnail has no forced-colors edge, unlike `CatalogTiles`' `.loading`. The build review rejected this too: DESIGN.md defines no loading look for the row, the slot is decorative, and with forced colors on, an image still loading from the local server is gone within milliseconds of coming into view. A border would also change the 44 × 64 box that AC-7 measures.
- (blind) `false` The `Thumbnail` ref callback misses a cover that has already failed. React attaches `onError` when it creates the `img`, before the browser can fire `error`, so the event isn't missed. The pattern is `CatalogTiles.tsx:103` word for word.
- (blind) `low` No `finishRowName` case has more than 999 pages. It uses the same `pagesWords` as `finishMeta`, whose "1,204 pages" case covers the grouping.
- (blind) `low` `addressNeedsFallback` has no cases for a bad Custom date, a doubled key or a lone `to`. It parses with `parseStatsAddress`, whose tests cover the bad dates, and AC-14 covers the fallback end to end.
