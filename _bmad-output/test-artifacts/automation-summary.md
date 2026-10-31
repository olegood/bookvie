---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-31'
storyId: '1.10'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-10-see-the-library-as-a-bookcase.md
  - _bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 1.10 entry)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/fixtures.ts
  - frontend/e2e/bookcase.spec.ts, catalog-empty.spec.ts, duplicate-dialog.spec.ts, new-book-panel.spec.ts
  - frontend/src/pages/Bookcase.tsx, Bookcase.module.css, CatalogPage.tsx
  - frontend/src/lib/spine.ts (+ test), catalog.test.ts, styles/tokens.css, styles/base.css
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 1.10, See the library as a bookcase

The Story 1.9 summary that used to live in this file is in git history (`40c7341`).

**Execution mode:** BMad-Integrated (story spec + ATDD checklist + deferred-work entry)
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`). Story 1.10 is client-only, so every target is in the browser.
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Config resolves to subagent mode, but 14 small targets in one spec cost less to write inline.
**Total tests added:** 13 (e2e 96 → 109, all green). One planned test was dropped (#2, see Validation).
**Browser exploration:** skipped. `playwright-cli` is not installed, and every selector reuses a role or name the green ATDD tests already pin.

## Coverage Plan by Test Level and Priority

Scope: **selective**. The targets are the ATDD checklist's unticked green-phase follow-ups that the review's added tests didn't already close.

| # | Target | Level | Priority |
|---|---|---|---|
| 1 | AC-1: Tab order is Search titles → Bookcase → List → New book → the shelf | E2E | P2 |
| 2 | AC-3: the unread outline is 1.5px at `deviceScaleFactor: 2` | E2E | P2 (dropped) |
| 3 | AC-3: spines of different heights stand on one plank; the strip leaves a 6px band of fill each side | E2E | P2 |
| 4 | AC-3: a user-set near-black and pure white are shown exactly | E2E | P2 |
| 5 | AC-3: a text-spacing override grows the spine, by the formula from the label's length | E2E | P2 |
| 6 | AC-5: rows reflow from 1024 to 1440px; about 35 spines a row at 1280px; 12px inner padding at the row ends | E2E | P2 |
| 7 | AC-7: Enter and Space on a spine do nothing | E2E | P2 |
| 8 | AC-8: when the hidden stop has visible spines at equal distance, the previous one takes the stop | E2E | P3 |
| 9 | AC-8: a focused spine that gets hidden hands focus to the nearest spine, and to Search titles when none remain | E2E | P2 |
| 10 | AC-9: under reduced motion the ring has no transition and the scroll is `behavior: 'auto'`; a search that would hide the new Book is cleared | E2E | P2 |
| 11 | AC-9: Add anyway from the Duplicate dialog focuses the new spine, not the old one | E2E | P2 |
| 12 | AC-11: dark-theme computed edge, strip, unread fill, outline and text | E2E | P2 |
| 13 | AC-11: the two-tone focus ring on a spine (`page` band, then `accent` outline) | E2E | P2 |
| 14 | AC-11: axe finds nothing with 500 spines, light and dark | E2E | P2 |

Level split: all E2E. The rules that are pure logic (the height formula, the tie rule, `spineName`, `bookcaseName`, junk storage) already have unit tests. What's left is layout, computed style, focus and wiring, which need a real browser.

Priorities: nothing here is P0 or P1. The P0 paths (spine shape, names, keyboard, focus after an add, the skill's check) are green in the ATDD suite. These are secondary branches of the same criteria. #8 is P3 because `spine.test.ts` already pins the tie rule; the e2e only proves `Bookcase` passes it the full sort order.

**Not added (and why):**
- AC-1 empty library: `catalog-empty.spec.ts` AC-8 already fails if any button but **New book**, or any searchbox, shows up.
- AC-5 "Bookcase, 1 book": `catalog.test.ts` pins `bookcaseName(1)`, and the 5- and 500-Book e2e tests pin the wiring.
- AC-6 performance budget: NFR7 sets a scale (500 spines, no lazy rows), not a time. A made-up threshold would only flake on CI.
- AC-8 "clearing the search keeps the tab stop": two review tests already cover it.
- AC-10 List view after a reload: AC-1 covers reloading into List, and AC-10 already runs the List form of the check.

## Baseline

- Story 1.10 was green at `fd7a1cf`: 11 ATDD scaffolds active, plus the review's 4 added tests (junk storage, throwing storage, hidden-then-shown height, the stop moved with no spine focused) and its no-wrap and full-count assertions.

## Priority Totals

| Level | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| E2E (Playwright) | 0 | 0 | 12 | 1 | 13 |
| **Total new** | 0 | 0 | 12 | 1 | **13** |

## Files Created/Updated

### Created
- `frontend/e2e/bookcase.ts`: the bookcase helpers and DESIGN.md colors, moved unchanged out of `bookcase.spec.ts` and exported. Both bookcase specs import them. It isn't a spec file, so Playwright doesn't collect it.
- `frontend/e2e/bookcase-details.spec.ts`: the `Story 1.10 Bookcase view details (automate)` describe with 13 tests, plus two spec-local helpers: `fillNewBook(page, fields)` and `setSearchKeepingFocus(page, value)`.
  - Tab from Search titles reaches Bookcase, List, **New book**, then the shelf.
  - Dune (136), *The Left Hand of Darkness* (168) and the Tufte title (200) all end exactly 204px below the shelf top, so they stand on one plank. The strip sits 6px in from each side of the button.
  - `#111111` and `#FFFFFF` user colors come back as exact computed fills.
  - A WCAG 1.4.12 text-spacing sheet, adopted before the app loads, makes the label longer and the spine taller. The new height equals the formula applied to the new length, so the test holds on any platform font.
  - At 1280px the top row holds `floor((shelf width − 24 + 4) / 32)` spines, which falls between 33 and 37. The first spine is 12px in, and the row's right gap is at least 12px and under one spine pitch. At 1024px the row is shorter, and at 1440px longer.
  - Enter and Space on a focused spine: focus stays, no dialog opens, the URL doesn't change, and the Tab stop stays put.
  - Tie: the stop is on Cosmos, between Blue Moon and Dark Moon, and "moon" hides it. The stop goes to Blue Moon, the previous one (P3).
  - A focused spine hidden by a scripted search hands focus to the nearest spine. When none remain, focus goes to Search titles.
  - Reduced motion: a "Book" search that would hide Swing Time is cleared. The one `scrollIntoView` call is `{ block: 'nearest', behavior: 'auto' }`, the ring is on, and `transition-duration` is `0s`.
  - **Add anyway** on a second Dune focuses the new spine, a different element from the old Dune spine, which has the same name.
  - Dark: the read edge is `#858A7F` and the strip and its ink stay paper. Unread is `#252822` / `#70766A` / `#A39E92`.
  - Focus ring: a 2px solid accent outline, offset 2px, with a `page` box-shadow band and no accent shadow.
  - axe (WCAG 2.0–2.2 A/AA) finds nothing with 500 spines, half of them read, in light and dark.

### Updated
- `frontend/e2e/bookcase.spec.ts`: the helpers moved out to `bookcase.ts` (1048 → 552 lines with the new tests elsewhere). The ATDD describe is byte-for-byte unchanged (checked with `diff` against `HEAD`).
- `_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md`: 7 follow-up lines ticked. The AC-3 line (the 1.5px width) and the AC-6 line (no budget) stay open, each with its reason.
- `_bmad-output/implementation-artifacts/deferred-work.md`: new entry for the 1.5px outline that Chromium renders as 1px.

No new fixtures or factories. Seeding reuses `seededServer` with the existing `finished()` / `shelfOf()` builders.

## Validation

- `npm run check`: exit 0. pytest 498 passed (coverage 98%), `check:api` 89/89 unit tests, e2e 109/109, smoke ok.
- Burn-in: `bookcase-details.spec.ts --repeat-each=10 --retries=0` → 130/130 (the run before the 2× test was dropped and two selectors were tidied; the tidied AC-3 tests passed again afterwards).
- Mutation checks, each reverted afterwards (only test and doc files differ in `git status`):
  - Scroll always `smooth` → the reduced-motion test fails.
  - Focus move off a hidden spine removed (`target?.focus()`) → the focused-spine-hidden test fails. That closes review triage #25, which had "no reachable trigger".
  - `nearestVisible` prefers the next spine on a tie → the P3 tie test fails.
  - Shelf side padding 12px → 0 → the AC-5 rows test fails.
  - Focus band `page` → `accent` → the two-tone ring test fails.
  - Dark `--color-spine-unread-outline` set to the light value in the `prefers-color-scheme` block → the dark-token test fails. The first attempt changed the `[data-theme="dark"]` copy, which the test doesn't reach, and survived (see Risks).
- **Dropped test (#2, 1.5px at 2×).** Under `test.use({ deviceScaleFactor: 2 })`, `devicePixelRatio` is 2, but the unread border still computes as `1px`, and a plain `div` with `1.5px solid` does the same. So Chromium (Playwright 1.64) never keeps a 1.5px border, and the ATDD premise that DPR 2 preserves it is wrong. The test is dropped rather than weakened, and the finding is in `deferred-work.md` for a design decision.
- The 1000-line file limit: the first draft appended to `bookcase.spec.ts` and took it to 1048 lines. The TEA hook (H5) flagged it, which prompted the split above.
- Lint: `tsc -b` and `oxlint` are clean.
- Quality: no hard waits (`expect.poll` for reflow after a resize). Nothing is routed. Role and name selectors only, except inside `evaluate` geometry reads, which find the label by its text and the strip by its paint, as `look()` does. One concern per test. Data is fixed literals, not faker, as in every e2e spec here: the criteria are about specific titles and sort order.

## Key Assumptions and Risks

- `setSearchKeepingFocus` sets the input's value from a script and fires `input`. It stands in for filters (Epic 7) and Delete (Story 1.12), the real ways a focused spine gets hidden. When those land, a test through the real control should replace it.
- The dark-token test emulates `prefers-color-scheme: dark` with no stored theme. The explicit Dark choice (`[data-theme="dark"]`) duplicates the same tokens and isn't asserted here. A drift between the two blocks would go unseen, as the first M6 attempt showed. A guard that compares the two blocks in `tokens.css` would close this cheaply.
- The reduced-motion test wraps `Element.prototype.scrollIntoView` in an init script. If `CatalogPage` ever scrolls another way (`window.scrollTo`, `scrollTop`), the recorded list comes back empty and the test fails loudly rather than passing.
- The AC-5 capacity bounds (33–37) assume the page layout at 1280px. A wider side column or page padding would move the count. The exact count is derived from the measured shelf width, so only the sanity bounds would need changing.
- The CI-font concern for the literal 168px height (already in `deferred-work.md`) doesn't touch the new tests: the text-spacing test compares against the formula, and the plank test compares bottoms, not heights.

## Playwright Utils deviations

None. The mandate is off (`tea_use_playwright_utils: false`).

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.10, to roll the 11 ACs, the review's additions and these 13 tests into the traceability matrix and gate decision.
- A design decision on the 1.5px unread outline (`deferred-work.md`), before Epic 3 adds markers to the same spine.
