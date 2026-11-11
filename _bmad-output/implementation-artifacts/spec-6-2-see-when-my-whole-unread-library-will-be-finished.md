---
title: 'Story 6.2: See when my whole unread library will be finished'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_revision: '38472234bb7942d46b06e6590b1da0d96b042449'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, FR-15 map row), reconciled before the next epic: the spine doesn't say the catalog view carries the library-scope pages left (the sum of every Book's pages_left) and measuredPace, or that CatalogPage hosts PaceCalculator behind "How long until…?".
    evidence: |-
      backend/bookvie/views/shelf.py catalog() fills pages_left and measured_pace (story 6.2); frontend/src/pages/CatalogPage.tsx LibraryPace. The 6.1 drift entry in deferred-work.md names only the book view (Blind Hunter, build-auto review of 6.2).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6, Capability map FR-15 row
    severity: low
---

<intent-contract>

## Intent

**Problem:** Story 6.1's pace calculator only answers for one Book. Catalog has no way to say when the whole unread library would be finished (FR-15 library scope, UJ-5, Flow 5).

**Approach:** The catalog view gains the library-scope `pagesLeft` (the sum of every Book's Book-scope pages left) and `measuredPace`. Catalog shows a row with the library meter and a collapsed "How long until…?" button, in both views. Activating the button expands 6.1's `PaceCalculator` inline, with `aria-expanded`.

## Boundaries & Constraints

**Always:**
- **The library rule:** library `pagesLeft` = Σ `pages_left(book)` over every Book, computed in `views/` (AD-6). That means never-started Books count all their pages, every active or paused Reading (re-reads included) counts `pages − currentPage` (never below 0), and Books with only finished Readings count 0.
- **Side read, Up next and Main** play no part. A paused Up next Book counts its pages left, like every paused Reading.
- **`measuredPace`** is sent unrounded, or `null`, the same value as the book view's.
- **The calculator** is 6.1's `PaceCalculator`, unchanged: the field, prefill, arithmetic, copy, invalid-input rules, the `output` with `role="none"`, and "Nothing left to read.".
- **The toggle:**
  - It is a `<button type="button">` styled as a `link`, named "How long until…?", with `aria-expanded` `false` by default. Activating it toggles the state.
  - It comes after the meter's `progressbar` "Books finished" in document order, in the same row.
  - The calculator renders only while expanded, inline, directly below that row and before the bookcase or list.
- **Collapsed on every visit:** the expanded state isn't persisted.

**Never:**
- No calculator arithmetic on the server and no new request: the client computes from the view.
- No change to Home: its Bookcase slice keeps the meter in its header.
- Don't edit ARCHITECTURE-SPINE.md (AGENTS.md).
- No Stats work (6.3, 6.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Flow 5 | 8,100 pages left, pace 17, today 2026-10-28 | Collapsed. Expanding shows "17" and "About 16 months · February 2028"; typing 30 shows "About 9 months · July 2027" | No error expected |
| Every state | the ATDD AC-4 seed, with Piranesi as the paused Up next | `pagesLeft` 1665, and each Book's view agrees | No error expected |
| Side read mark | same library with and without the mark | same `pagesLeft` | No error expected |
| All finished | only finished Books | `pagesLeft` 0; expanded reads "Nothing left to read." | No error expected |
| No pace | no finished Reading with a start date | `measuredPace: null`; expanded field empty, no result | No error expected |
| Empty library | no Books | Empty shelf, with no meter row and no button | No error expected |
| Invalid input | "0", "", "-5", "abc" | empty `output`, no message, no `aria-invalid` | silent |

</intent-contract>

## Code Map

- `backend/bookvie/domain/progress.py:26` `pages_left(book)` -- the Book scope, reused unchanged. It is exported from `bookvie.domain`.
- `backend/bookvie/domain/pace.py` `measured_pace` -- read-only.
- `backend/bookvie/views/models.py:153` `CatalogView` -- add `pages_left: int` and `measured_pace: float | None`, with docstrings like `BookDetailView`'s (l.270-274).
- `backend/bookvie/views/shelf.py:83` `catalog` -- fill both fields. `pages_left` and `measured_pace` are already imported (l.16-17). `book_detail` (l.283-329) shows the `float(pace)` conversion.
- `backend/tests/test_library_pages_left.py` -- the ATDD leaves AC-1 and AC-4 (skipped).
- `frontend/src/api/generated/schema.d.ts` -- regenerate only.
- `frontend/src/pages/Bookcase.tsx:96` `MeterBar`, and l.325 where the header renders it. `Shared.meter` (l.33) is used by both Catalog and Home's slice.
- `frontend/src/pages/Bookcase.module.css:49-75` -- `.header` and `.meter` (`margin-left: auto` in the header).
- `frontend/src/pages/CatalogPage.tsx` -- the Bookcase/List branch, near the end of the component.
- `frontend/src/pages/CatalogPage.module.css` -- `.page` is a flex column with `gap: var(--space-5)`.
- `frontend/src/components/PaceCalculator.tsx` -- reuse as is: props `pagesLeft` and `measuredPace`.
- `frontend/e2e/catalog-pace-calculator.spec.ts` -- the ATDD leaves AC-2 and AC-3 (skipped).
- `frontend/e2e/bookcase.spec.ts:194-201` -- finds the meter as `main.getByRole('progressbar')`. That still works after the move.
- `frontend/e2e/catalog-empty.spec.ts:31,87` -- an empty Catalog has no `progressbar`. Keep the row hidden there.
- Mockup `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html:208,226` -- the `tb3` row (meter, then the link button) sits above the bookcase and the list.
- Deferred-work intake: none name story 6.2.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- add and fill `CatalogView.pages_left` (sum of `pages_left(b)`) and `measured_pace`. The catalog view must supply them.
- `frontend/src/api/generated/schema.d.ts` -- run `npm --prefix frontend run api:gen`.
- `backend/tests/test_library_pages_left.py` -- in AC-4, make Piranesi the paused Up next: a Reading at p.45 of 245, `paused_at="2026-10-25"`, expected 200, total 1665. Update the comments. Remove both skips and the `RED` constant. This pins the paused Up next decision in the Design Notes.
- `frontend/src/pages/Bookcase.tsx`, `Bookcase.module.css` -- make the header meter Home-only: move `meter` from `Shared` to `SliceProps`, and export the meter bar for reuse. The DESIGN.md Catalog layout puts the meter above the bookcase.
- `frontend/src/pages/CatalogPage.tsx`, `CatalogPage.module.css` -- for a non-empty library, render a row with the meter and the "How long until…?" toggle, then, when expanded, `PaceCalculator` with `pagesLeft` and `measuredPace` from the view, then the bookcase or list. AC-2 and AC-3.
- `frontend/e2e/catalog-pace-calculator.spec.ts` -- change `test.skip(` to `test(`. Add `[P2]` leaves for List view (the row and the expansion are there), for an all-finished library ("Nothing left to read."), for a library with no Measured pace (expanded: empty field, empty `output`), for an empty library (no button), and for axe with the calculator expanded in light and dark, following `pace-calculator.spec.ts:286`.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:64` -- in Book states rule 2, drop "and the Library pace scope" from the shared-definition list, and add after the Pace calculator row's "Scopes per FR-15" that the library scope counts every active or paused Reading, Up next included. That keeps the UX doc consistent with FR-15.
- `README.md` -- on the Status line (l.8), after the 6.1 sentence, add that on Catalog "How long until…?" opens the same calculator for the whole unread library. After the 6.1 links (l.210-211), add the Story 6.2 spec and ATDD checklist links. Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given the catalog view, when it is computed, then `pagesLeft` is the library-scope pages left and `measuredPace` is the library's Measured pace, with Side read marks changing nothing (ATDD AC-1 and AC-4 pass).
- Given Catalog in either view, when it renders, then the button "How long until…?" follows the meter, collapsed; activating it expands the calculator inline with `aria-expanded="true"`, and activating it again collapses it (ATDD AC-2).
- Given the expanded calculator with 8,100 pages left, when I type 30, then it reads "About 9 months · July 2027", and 6.1's prefill and invalid-input rules hold (ATDD AC-3).
- Given Home, when it renders, then its Bookcase header still shows the meter (`home-slice.spec.ts`, `finish-moment.spec.ts` pass).

### Review Findings

Code review (`bmad-code-review`, new session, 2026-11-11). Five layers: blind, edge, verification, acceptance, spine. None failed.

- [x] [Review][Patch] README's Story 6.2 spec link says the calculator sits "below the library meter". The toggle sits next to the meter in the same row, as the spec, DESIGN.md and the Status line ("next to the library meter") say. The ATDD's AC-2 test title keeps its wording for traceability (low; acceptance) [README.md:212]
- [x] [Review][Defer] Nothing tests the expanded Catalog calculator following a catalog view refetch. `LibraryPace` reads `pagesLeft` from `view.data` on every render, so the code is right today, but a change that captured it on expand would pass every leaf (low; verification+acceptance+blind) [frontend/src/pages/CatalogPage.tsx:257] — deferred: a leaf for `bmad-testarch-automate` of 6.2 (seed `NO_PACE`, expand, type 30, add a Book through New book, assert the new duration and that "30" stays)
- [x] [Review][Defer] Nothing asserts that the expanded calculator comes before the bookcase or list. Moving it below `<Bookcase>`/`<CatalogList>` passes every leaf (low; verification) [frontend/src/pages/CatalogPage.tsx:257] — deferred: a `compareDocumentPosition` or Tab-order leaf for `bmad-testarch-automate` of 6.2, with the calculator expanded
- [x] [Review][Defer] Four ATDD green-phase follow-ups are still open: Enter and Space on the toggle with focus kept on it, the never-below-0 clamp at library scope, PAC-UNIT-002's 8100 cases in `pace.cases.json` (30 → 270 days, 17 → 477 days), and the expanded state across a view switch and a revisit. The code is right by construction: a native `<button>`, 6.1's pinned `pages_left` clamp, the same `paceResult`, and React state (low; acceptance+blind) [frontend/e2e/catalog-pace-calculator.spec.ts, frontend/src/lib/pace.cases.json] — deferred: leaves for `bmad-testarch-automate` of 6.2
- [x] [Review][Defer] The ATDD checklist is stale. It still has Piranesi as a never-started Up next at 245 and `pagesLeft` 1710 (l.146-149), the leaves "Skipped as committed", and its Implementation Checklist unchecked. The build re-seeded AC-4 to a paused Up next (200, total 1665) and turned every leaf on, and the README links the checklist (low; blind) [_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md:146] — deferred: `bmad-testarch-automate` of 6.2 brings the checklist up to date, as 6.1's did (110de76)
- [x] [Review][Defer] DESIGN.md's contrast table records the library meter only against `shelf-wall`. On Catalog it now sits on `page`. The fill (`accent`) against `page` is 4.96 / 7.68, already in the table's focus-ring row, so it passes 3:1. Only the row is missing (low; blind) [DESIGN.md:494] — deferred: a design-doc row with no user-facing failure; add it with the next DESIGN.md pass
- [x] [Review][Defer] Spine drift (AD-6, FR-15 map row): the catalog view's `pagesLeft`/`measuredPace` and CatalogPage's calculator (low; spine) [backend/bookvie/views/shelf.py, frontend/src/pages/CatalogPage.tsx] — deferred: already recorded by the build in deferred-work.md and this spec's `deferred:`; reconciled before the next epic

**Rejected:**
- `false` (edge) A refetch that changes `measuredPace` while the calculator is expanded leaves the old prefill. This is by design: `PaceCalculator`'s docblock says the typed text is the state and a refetch keeps it, and the ATDD's live-update follow-up asks for the typed pace to be kept. Book detail behaves the same since 6.1.
- `false` (blind) The axe leaf's List pass depends on stacked `addInitScript` calls. It asserts the table is visible before scanning (`catalog-pace-calculator.spec.ts:233`), so a wrong order fails loudly rather than scanning the wrong view.
- `false` (blind) The new EXPERIENCE.md sentence reads like the whole library-scope rule. It follows "Scopes per FR-15", which carries the full rule, and it only clarifies the Up next case.
- `false` (blind) The README's "whole unread library" overstates the scope. It is the story's and FR-15's wording, and the pages left in a partly read Book are unread pages.
- `false` (blind) Nothing guards Bookcase rendering no meter on Catalog. A second meter in `main` breaks `bookcase.spec.ts:196`'s strict `main.getByRole('progressbar')`, and `catalog-pace-calculator.spec.ts` pins the meter-then-toggle order.
- `low` (blind) The expanded calculator has no visible scope. The toggle "How long until…?, expanded" comes just before the field in reading and Tab order. A group label adds markup for a rare navigation path, and the build review rejected it too.
- `low` (blind) `catalog()` repeats `float(pace)` from `book_detail`. It is a one-line conversion of the same `measured_pace` result, and the 100/3 leaf pins the two as equal. A helper adds surface for no named divergence.
- `low` (blind) The spec's Verification commands skip `bookcase-details.spec.ts`. `npm run check` runs it (526 e2e), and the fix would edit the spec under review.

## Spec Change Log

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 16 findings — high 0, medium 0, low 8, false 8, maybe-false 0
- findings:
  - `[low]` `[patch]` DESIGN.md's Bookcase row (l.598) still puts the meter in the header on both pages — the row is reworded: header on Home, the row above the bookcase or list on Catalog.
  - `[low]` `[defer]` Spine drift (AD-6, FR-15 map row): the 6.1 drift entry names only the book view; the catalog view's `pagesLeft`/`measuredPace` and CatalogPage's calculator are unrecorded — deferred to deferred-work.md as spine drift (AGENTS.md).
  - `[low]` `[patch]` AC-4's Piranesi change dropped the only never-started Up next case — a separate library with a never-started Up next (412) is added to AC-4.
  - `[low]` `[patch]` "Unrounded, same value as the book view's" is checked only with an integer pace — AC-1 gains a 100/3 library asserting catalog `measuredPace` equals the book view's.
  - `[low]` `[reject]` Collapsing remounts PaceCalculator and drops the typed pace — real but rare (collapse then re-expand in one visit); keeping it mounted adds hidden-state handling, and the spec only promises collapsed on every visit.
  - `[false]` `[reject]` pagesLeft ignores Search titles and filters — FR-15's library scope is the whole library, and the meter beside it is whole-library too; a view filter isn't a scope.
  - `[low]` `[reject]` The expanded calculator doesn't name its scope — the field follows the toggle "How long until…?, expanded" in reading and Tab order, and the field is described by its result; a group label would add markup for a negligible gain.
  - `[false]` `[reject]` `tabIntoBookcase` assumes the calculator is collapsed — every caller loads a fresh Catalog, which always starts collapsed (no caller expands it), so the Tab lands on the shelf.
  - `[false]` `[reject]` epic-6-context.md rewritten outside the story — step-01 had to recompile it (the cache predated DESIGN.md/EXPERIENCE.md edits); that is the workflow's own artifact, not story scope.
  - `[false]` `[reject]` README's "36 of 41 stories done" is stale — sprint-status.yaml has 36 of 41 story keys done (6.1 included), so the count is right.
  - `[low]` `[patch]` axe runs only in Bookcase view — the axe leaf also scans List view with the calculator expanded, both themes.
  - `[false]` `[reject]` The Code Map's line anchors will go stale — the fix edits this build's spec (rejected by rule).
  - `[false]` `[reject]` Bookcase.tsx tests `props.slice !== undefined` beside `sliceMode` — `sliceMode` is defined as that same expression, so they can't drift; the raw check is needed for narrowing to `SliceProps`.
  - `[low]` `[reject]` A Measured pace of exactly 0 prefills "0" with no result (Edge Case Hunter) — identical to Book detail since 6.1, where `pacePrefill(0.04)` → "0" with no result is pinned (`pace.test.ts:99-101`); AC-3 requires the same prefill rules, so diverging here would be the defect.
  - `[false]` `[reject]` The link sits beside the meter, not literally below it (Intent Alignment) — DESIGN.md → Catalog orders meter then link, and the mockup's `tb3` row puts both on one row; the AC's "below the meter" is that order, which AC-2 pins.
  - `[false]` `[reject]` The paused Up next decision changed the ATDD seed and EXPERIENCE.md (Intent Alignment) — the story's AC and FR-15 say "every active or paused Reading"; the decision and the doc fix are recorded in Design Notes, and the test now pins it.

## Design Notes

- **A paused Up next Book counts:** EXPERIENCE.md's Book states rule 2 lists "the Library pace scope" among the uses of Waiting for you's definition (every paused Reading except the Up next Book's). Story 6.2's AC, PRD FR-15 ("every active or paused Reading") and the spine (AD-6, pages left per Book and library scope) all count every unfinished Reading. Leaving the Up next Book out would hide pages that are still unread. The story's AC decides it, and the EXPERIENCE.md line is corrected in this story.
- **Why the meter moves on Catalog only:** DESIGN.md → Catalog orders the meter, then the collapsed link, then the bookcase or list, and the mockup shows one row in both views. Home's slice header keeps the meter and "See all in Catalog".
- **Sum of the Book scopes:** with one current Reading per Book (an invariant), the sum can't double count, and the two scopes can't disagree.

```py
pages_left=sum(pages_left(b) for b in library.books)
```

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_library_pages_left.py` -- expected: 2 passed.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/catalog-pace-calculator.spec.ts e2e/bookcase.spec.ts e2e/catalog-list.spec.ts e2e/catalog-empty.spec.ts e2e/home-slice.spec.ts e2e/finish-moment.spec.ts` -- expected: pass.
- `npm run check` -- expected: exit 0 (format, lint, `tsc -b`, `api:gen` diff, full pytest, coverage, e2e).

## Auto Run Result

Status: in-review

**Summary:** The catalog view now carries the library-scope `pagesLeft` (the sum of every Book's Book-scope pages left) and the unrounded `measuredPace`. Catalog shows the library meter and a collapsed "How long until…?" button in one row above the bookcase or list, in both views. The button expands Story 6.1's `PaceCalculator` inline with `aria-expanded`. Home keeps its meter in the Bookcase header. A paused Up next Book counts its pages left (FR-15), and EXPERIENCE.md now says so.

**Files changed:**
- `backend/bookvie/views/models.py`, `views/shelf.py`: `CatalogView.pages_left` and `measured_pace`.
- `backend/tests/test_library_pages_left.py`: ATDD AC-1 and AC-4 on. Piranesi is the paused Up next (total 1665). Added a never-started Up next library and a 100/3 pace equal to the book view's.
- `backend/tests/test_views.py`, `frontend/src/api/views.test.ts`: the empty catalog shape gains the two fields.
- `frontend/src/api/generated/schema.d.ts`: regenerated.
- `frontend/src/pages/Bookcase.tsx`, `.module.css`: the meter moves to `SliceProps` (Home only), and `MeterBar` is exported.
- `frontend/src/pages/CatalogPage.tsx`, `.module.css`: the `LibraryPace` row (meter, toggle, inline calculator).
- `frontend/e2e/catalog-pace-calculator.spec.ts`: AC-2 and AC-3 on, plus `[P2]` leaves: List view, all finished, no pace, empty library, and axe in both views and themes.
- `frontend/e2e/bookcase.ts`, `bookcase.spec.ts`, `bookcase-details.spec.ts`: the new Tab stop between New book and the shelf.
- `EXPERIENCE.md` (Book states rule 2, Pace calculator row), `DESIGN.md` (Bookcase row), `README.md` (Status line and 6.2 links), `epic-6-context.md` (recompiled in step 1).
- `deferred-work.md` (one spine drift entry), `sprint-status.yaml` (6.2 → review).

**Review:** 16 findings: 4 patches applied (all low), 1 deferred (spine drift AD-6 and the FR-15 map row, low), 11 rejected. Each rejection's reason is in the Review Triage Log.

**Follow-up review recommended:** false. The patched entries were 0 high, 0 medium and 4 low.

**Verification:**
- `uv run pytest tests/test_library_pages_left.py`: 2 passed.
- The spec's e2e list: 77 passed before the patches. `catalog-pace-calculator.spec.ts`: 7 passed after them.
- `TZ=Europe/Madrid npm run check`: exit 0 before and after the patches. After them: coverage 98%, 526 e2e passed.

**Residual risks:**
- Collapsing and re-expanding the calculator in one visit resets the typed pace to the prefill (rejected as low).
- The axe test's List pass relies on stacked `addInitScript` calls, where the last one wins. It asserts the table is visible first.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
