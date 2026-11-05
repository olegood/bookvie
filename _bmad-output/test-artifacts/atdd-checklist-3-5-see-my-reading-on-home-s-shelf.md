---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-05'
storyId: '3.5'
storyKey: '3-5-see-my-reading-on-home-s-shelf'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-35-see-my-reading-on-homes-shelf'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-5-see-my-reading-on-home-s-shelf.md'
generatedTestFiles:
  - 'backend/tests/test_home_slice.py'
  - 'frontend/e2e/home-slice.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3; Story 3.5; Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Server owns numbers, Bookcase slice, Main spine)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 slice selection on the server, Title ordering)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states table, Bookcase → Home slice, Keyboard)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Spine: Main book never finished, re-read, Markers; Bookcase legend; spine-edge, spine-unread-text)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-home.html (ul "Bookcase slice, 3 rows", .sp.main gradient fill, strip on the Main spine, legend)'
  - '_bmad-output/test-artifacts/test-design-qa.md (PRG-API-003, R-10)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-5 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-4-see-where-i-left-off-and-how-long-is-left.md (format, conventions)'
  - 'backend/bookvie/views/shelf.py, models.py; backend/bookvie/domain/invariants.py'
  - 'backend/tests/builder.py, helpers.py, test_reentry.py'
  - 'frontend/src/pages/HomePage.tsx, HomePage.module.css, Bookcase.tsx, Bookcase.module.css; frontend/src/lib/catalog.ts, spine.ts; frontend/src/styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, home.ts, bookcase.ts, library.ts, update-page.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the home view, when it is computed, then the server supplies the slice priority: the Main book, then the Up next Book (when one exists), then Books by most recent finish, newest first (AD-6), and the client packs the full bookcase into rows at the current width and shows up to 3 rows: the row holding the Main book, then the Up next Book''s row, then rows with the most recent finishes, filled from the first rows when fewer qualify (UX-DR31)' }
  - { id: AC-2, idSource: generated, text: 'Given chosen slice rows, when they display, then the Main book''s row comes first and the others follow in bookcase order (all in bookcase order when there is no Main book), and the slice recomputes on resize, never applies Catalog filters, never scrolls internally, and is a list named "Bookcase slice, N rows" with the actual row count, using the bookcase keyboard model, and on Home the arrow keys and Home/End follow the rows as displayed (Main book row first), not the full bookcase order' }
  - { id: AC-3, idSource: generated, text: 'Given a never-finished Main book at 64%, when its spine renders, then it has the unread body and outline with its exact color filled from the plank up to 64% of the area below the label strip, topped by a 2px spine-edge fill line, plus the Main-book marker dot (UX-DR24)' }
  - { id: AC-4, idSource: generated, text: 'Given a re-read of a finished Book, when it is the Main book, then its spine stays full color with the Main-book marker, and its accessible name ends "finished, re-reading, 12%"' }
  - { id: AC-5, idSource: generated, text: 'Given the slice header, when it renders, then it shows "BOOKCASE", the library meter and a "See all in Catalog" link, and the legend adds "Main book, filled to its %" on Home and Catalog' }
  - { id: AC-6, idSource: generated, text: 'Given a page update, when the views refetch, then the Main book spine fill moves to the new percentage together with the gauge (instantly under reduced motion)' }
---

# ATDD Checklist - Epic 3, Story 3.5: See my reading on Home's shelf

**Date:** 2026-11-05
**Author:** Oleg
**Primary test levels:** API (pytest, the view through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want a slice of my bookcase on Home with my Main book's spine filling as I read, so that progress is something I can see on the shelf, not only a number.

Today Home shows the date header, the Main book card and an empty side column. The home view already carries `books` and `meter` (the Catalog's), "until Story 3.5's slice". The Catalog bookcase (`Bookcase.tsx`) already draws spines, the meter, the legend and the keyboard model. `spineName()` already says "Main book, 64%" and "finished, re-reading, 12%".

**What 3.5 adds:**
- **`slicePriority`** in the home view (AD-6).
- **The slice** below Home's grid: rows packed at the current width, up to 3 chosen, the Main row first.
- **The Main spine:** the unread body filled in its color to the percentage, a 2px `spine-edge` line, the Main-book marker. A re-read keeps full color plus the marker.
- **The header** "See all in Catalog" link, and the legend's "Main book, filled to its %" on Home and Catalog.

**Not in 3.5:**
- Up next and Waiting for you markers (sky, sand) and their legend items: Epic 4;
- the finish fill, the highlight ring and "Finished *X*." in the header: Story 3.7;
- the Sort select shared with the slice (Catalog sorts by Author today, so the slice does too).

**Story source:** `epics.md` → Story 3.5. There is no spec file yet: `sprint-status.yaml` has `3-5-see-my-reading-on-home-s-shelf: backlog`.
- When `spec-3-5-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.4.

**Generation mode:** AI generation from the criteria, the UX docs, the `key-home.html` mockup and the code. No browser recording: the slice doesn't exist yet. Locators are roles and names (the `region` "Bookcase", the `list` "Bookcase slice, N rows", spine buttons by name) plus rows by shared bottom edge, as `bookcase.ts`'s `shelfRows` does.

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.4.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Server slice priority: Main, Up next, finishes newest first; client chooses up to 3 rows | API | P1 | `test_ac1_p1_…` |
| AC-2 | Display order, resize, no filters, no scroll, list name, keys follow displayed rows | E2E | P1 | `[P1] AC-2` |
| AC-3 | Never-finished Main at 64%: fill to 64% below the strip, 2px line, marker | E2E | P1 | `[P1] AC-3` |
| AC-4 | Re-read Main: full color, marker, "finished, re-reading, 12%" | E2E | P2 | `[P2] AC-4` |
| AC-5 | Header: BOOKCASE, meter, See all in Catalog; legend on Home and Catalog | E2E | P2 | `[P2] AC-5` |
| AC-6 | After a page update the fill moves with the gauge, instantly under reduced motion | E2E | P1 | `[P1] AC-6` |

**Priorities** (from `test-design-qa.md`):
- **P1:** AC-1 is PRG-API-003 (R-10, a server-owned selection). AC-2 is the slice itself, and the keyboard rule is the one place Home differs from Catalog. AC-3 is the story's purpose (FR-24, "filled to its reading percentage"). AC-6 is Flow 2's climax ("the Main book spine fills a little higher").
- **P2:** AC-4 and AC-5. The re-read name already exists in `spineName`, and the header mostly reuses the Catalog's.

**Level split (no duplicate coverage):**
- **API:** the priority list and its edges (role dedupe, ties, back-filled finishes, no Main, empty library). The client never sorts finishes.
- **E2E:** packing, choosing and ordering rows (they depend on the browser's width), keys, pixels, header and legend copy.

**The client half of AC-1** (choosing rows from the priority) is read in AC-2's leaf. Its expected rows come from the priority, so it fails if either half is wrong.

---

## Story Integration Metadata

- **Story ID:** `3.5`
- **Story Key:** `3-5-see-my-reading-on-home-s-shelf`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.5)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-5-see-my-reading-on-home-s-shelf.md`
- **Generated Test Files:** `backend/tests/test_home_slice.py`, `frontend/e2e/home-slice.spec.ts`

---

## Contract the Scaffolds Pin

- **`HomeView.slicePriority: list[str]`** in `GET /api/views/home`: Book ids, each at most once, in priority order.
  - The Main book, then Up next, then every other Book with a finished Reading by its latest `finishDate`, newest first.
  - Ties by the server's title ordering key, then Book id (ARCHITECTURE-SPINE → Title ordering).
  - A Main or Up next Book that is also finished appears once, at its role's place.
  - Back-filled finishes count. Unfinished Books with no role are not listed.
  - Python: `home(library).slice_priority`.
- **The slice** is a `region` named "Bookcase" (its `h2`) in Home's `main`, holding a `list` named "Bookcase slice, N rows". Each spine is a `button` named by `spineName`.
- **A row** is the spines that share a bottom edge (one plank), as on Catalog. The slice fills the main column's full width, and spines are 28px with a 4px gap.
- **The Main spine has a painted label strip**, as in `key-home.html`. The fill's area runs from the plank to the strip's lower end.
- **The legend item** reads exactly "Main book, filled to its %", on Home and on Catalog (seeded with a Main book in both).
- **"See all in Catalog"** is a `link` to `/catalog` inside the slice region.

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **The backend leaf** has `@pytest.mark.skip(reason=RED)`, and its name carries `ac1_p1`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 6 fail as listed below, and every seed started cleanly (the home view answered; AC-6's page update saved before the failure).

**Sampler check:** a throwaway probe (since deleted) ran `spineColumn` and `measureFill` on a read Catalog spine in `#4F7096`. They read the exact fill `rgb(79, 112, 150)`, the paper strip above it, and an area below the strip of 87px on a 136px spine.

**Skipped as committed:**
- `pytest tests/test_home_slice.py` gives 1 skipped.
- `playwright test e2e/home-slice.spec.ts` gives 5 skipped.
- The whole backend suite passes (971 passed, 1 skipped).
- Ruff (check and format) on the new file, oxlint and `tsc -b` are clean.

**One deviation from the workflow's rules, kept to match Stories 1.6 to 3.4:** the E2E leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.

### API Test (1 test): `backend/tests/test_home_slice.py`

**`[P1] AC-1`: `test_ac1_p1_the_home_view_supplies_main_then_up_next_then_most_recent_finishes`**

Seed: The Left Hand of Darkness is the Main book and a re-read (finished 2026-05-01). Kindred is Up next and finished 2026-10-25, newer than every other finish. The finishes:
- Dune 2026-10-20, back-filled;
- Emma 2026-09-20, then 2026-10-10;
- Beloved and Austerlitz, both 2026-09-15;
- Middlemarch 2026-09-01.

"Never Read" and a paused Book are in the library but not listed.

1. **`body["slicePriority"] == [left_hand, kindred, dune, emma, austerlitz, beloved, middlemarch]`** (the first assertion).
2. With no Main book, Up next leads and the former Main book falls in by its finish: `[kindred, dune, emma, austerlitz, beloved, middlemarch, left_hand]`. With no Up next either, Kindred still leads as the newest finish.
3. A library with only a Main book: `[solo]`. An empty library: `[]`.

*Red today: `AssertionError: assert None == [...]`, with `slicePriority` missing from the view.*

### E2E Tests (5 tests): `frontend/e2e/home-slice.spec.ts`

**`[P1] AC-2`: the rows as displayed**

Seed: 180 Books, "Book 001" to "Book 180" by one author, so bookcase order is title order.
- Main: Book 170. Up next: Book 090.
- Newest finish: Book 130 (2026-10-20). Older finish: Book 010 (2026-03-20, back-filled).
- Viewport 1280×900.

1. **The list is named "Bookcase slice, 3 rows"** (the first operation that can fail).
2. The row capacity `k` is measured from the list's content width and a spine's width and gap. The test's oracle (`expectedSlice`) packs the 180 titles into rows of `k` and chooses the rows of 170, 090 and 130. It displays 170's row first, then the other two in bookcase order. The displayed rows must equal it exactly. Book 010's row is left out: the newest finish wins.
3. Neither the list nor the region scrolls (`overflow-y` isn't `auto`/`scroll`, and nothing is hidden).
4. At 900px wide `k` drops and the rows equal the oracle again. Back at 1280px they return.
5. A Catalog search ("Book 17"), then Home: the same 3 rows.
6. Keys: Home goes to the Main row's first spine and End to the last displayed row's last spine. Right from the end of the Main row goes to the second displayed row's first spine, and Left comes back. Down from there lands in the second displayed row.

*Red today: `toHaveAccessibleName`, "element(s) not found" for the slice list.*

**`[P1] AC-3`: the fill of a never-finished Main book at 64%**

Seed: The Left Hand of Darkness at p.212 of 330 (64%) in `#4F7096`, plus Dune.

1. **From the spine's center pixel column:** the rows of its exact color counted up from the plank are 64% of the area below the label strip (±2px). Directly above are 2–3 rows of `spine-edge`, then the unread fill `#FDFCF9`.
2. The Main-book marker (`spine-unread-text`, `#77716A`) is painted above the strip.
3. The unread outline (`rgb(138, 130, 115)`) and the name "…, Main book, 64%".

*Red today: `locator.evaluate` times out waiting for the spine in the slice.*

**`[P2] AC-4`: the re-read Main book**

Seed: The Left Hand of Darkness finished in April, re-read as the Main book at p.40 (12%).

1. **The name is "The Left Hand of Darkness by Ursula K. Le Guin, finished, re-reading, 12%".**
2. Its color runs from the plank to the strip with no fill line, and the marker is above the strip.

*Red today: `toHaveAccessibleName`, "element(s) not found".*

**`[P2] AC-5`: the header and legend**

Seed: Main at p.212, Dune, and Emma finished (1 of 3).

1. **A "See all in Catalog" link in the Bookcase region.**
2. The "Bookcase" heading with `text-transform: uppercase`, the meter "1 of 3 finished", and "Main book, filled to its %" in the legend.
3. The link goes to `/catalog`, whose legend also has "Main book, filled to its %".

*Red today: `toBeVisible`, "element(s) not found" for the link.*

**`[P1] AC-6`: the fill follows a page update**

Seed: Main at p.150 (45%) in `#4F7096`, plus Dune. Reduced motion.

1. Setup, which passes today: the gauge says "45%, page 150 of 330". Page 212 is typed, **Update** is pressed, and the gauge says "64%, page 212 of 330".
2. **One immediate read of the spine fill (no polling) is 64% of the area (±2px).**
3. The name says "Main book, 64%".

*Red today: `locator.evaluate` times out waiting for the spine in the slice, after the update saved.*

---

## Green-Phase Follow-ups (automation, not red leaves)

- **AC-1, the client:**
  - fewer qualifying rows fill from the first rows (Main only, in row 0 or a late row);
  - no Main book: Up next's and the finishes' rows in bookcase order;
  - a library smaller than 3 rows: every row, "Bookcase slice, 1 row" (singular);
  - Main and Up next on the same row.
- **AC-1, the server:** Title-ordering ties on diacritics and case ("Émile" vs "Emile"), then the Book id.
- **AC-2:**
  - Tab returns to the last focused spine;
  - Enter or Space opens the Spine popover from the slice;
  - the slice after deleting the Main book in another tab (refetch);
  - axe on Home with the slice in both themes (WCAG 2.2 AA).
- **AC-3:** 0% (only the line at the plank) and 100% at the last page (fill to the strip's lower end, marker kept: EXPERIENCE.md → "Main book at its last page"). Dark theme: `spine-edge` `#858A7F`. Forced colors: fill and marker stay distinct.
- **AC-4:** the re-read in the dark theme. The re-read at 0%.
- **AC-5:** the legend swatch for the Main fill. The legend without a Main book: decide whether the item stays (the scaffold seeds a Main book on both pages).
- **AC-6:** without reduced motion the fill transitions and lands at the new % (poll). The baseline 45% before the update.
- **Story 3.4 follow-up still open:** PRG-E2E-001's "~N days left after refetch" half.

---

## Implementation Guidance

**Server (`views/shelf`, `views/models`):**
- Add `HomeView.slice_priority: list[str]` computed in `home()`, then regenerate the API contract (`npm run api:gen`).
- Story 3.5 can drop the "(until Story 3.5's slice)" note on `home()`. The client still needs `books` to pack the full bookcase.

**Client:**
- **Reuse `Bookcase.tsx`** for spines, the meter, the legend, the popover and the keys, with a slice mode: rows packed from the measured width, chosen from `slicePriority`, the Main row first.
  - `aria-label` "Bookcase slice, N rows".
  - Keys move over the displayed spine order.
  - No Search titles.
  - "See all in Catalog" in the header.
- **Recompute on resize** (a `ResizeObserver` on the list).
- **The Main spine:**
  - the unread body and outline with a painted strip;
  - a fill in `--spine-color` to `percent`% of the area below the strip, with a 2px `spine-edge` line on top;
  - the marker dot `spine-unread-text` with a 1.5px `marker-ring`;
  - the fill transitions, except under `prefers-reduced-motion: reduce`.
- **Re-read:** the read spine plus the marker. Strip top 20px on a marked spine (DESIGN.md).
- **Legend:** add "Main book, filled to its %" (on Catalog too).

---

## Next Steps

1. Write `spec-3-5-…md` and link this checklist under its Dev Notes (`### ATDD Artifacts`).
2. Implement task by task, un-skipping the matching leaf. Each should fail first as listed, then pass.
3. Run `bmad-testarch-automate` for the follow-ups above once 3.5 is green.
