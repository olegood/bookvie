---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-30'
storyId: '1.10'
storyKey: '1-10-see-the-library-as-a-bookcase'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-110-see-the-library-as-a-bookcase'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md'
generatedTestFiles:
  - 'backend/tests/test_bookcase_view.py'
  - 'frontend/e2e/bookcase.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.10, Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md (Scale, Spine colors, Bookcase, Spine popover, Motion, Focus after close)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Bookcase, Interaction Primitives, Accessibility Floor, Focus after close, Agent Label Contract)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Spine colors, Contrast, Forced colors, Layout & Spacing → Bookcase and Spine sizing, Components → Bookcase, Library meter, Catalog view toggle, Spine, Highlight ring)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-E2E-002, CAT-UNIT-003, PRG-E2E-004)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md'
  - 'backend/bookvie/views/models.py, views/shelf.py, http/api.py, domain/model.py'
  - 'backend/tests/test_views.py, builder.py'
  - 'frontend/e2e/fixtures.ts, catalog-list.spec.ts, new-book-panel.spec.ts, duplicate-dialog.spec.ts'
  - 'frontend/src/pages/CatalogPage.tsx, CatalogList.tsx, SearchTitles.tsx, lib/catalog.ts, components/ThemeToggle.tsx, styles/tokens.css'
  - 'frontend/playwright.config.ts, _bmad/tea/config.yaml'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Catalog with Books, when it opens, the Bookcase view is the default, and a role="group" "Catalog view" toggle (Bookcase · List, aria-pressed) switches views, remembered in localStorage (UX-DR21); and Search titles applies to both views' }
  - { id: AC-2, idSource: generated, text: 'When the client renders spines, the server supplies per Book the resolved spine color, read status, title, first author and author count, plus the "X of Y finished" meter, with X counting Books that have at least one finished Reading (back-fills included) and Y counting all Books (AD-6)' }
  - { id: AC-3, idSource: generated, text: 'A spine is 28px wide, with height = 120px + 0.3 × the title''s rendered one-line length in the spine-label style, rounded up to 8px and capped at 200px (Dune → 136px, The Left Hand of Darkness → 168px); a read spine shows its exact stored color with the spine-edge line on top and sides and the title on the label strip (max 96px, label one line with an ellipsis); an unread spine shows the unread fill, a 1.5px outline and unread text with no strip (UX-DR24)' }
  - { id: AC-4, idSource: generated, text: 'To assistive tech a spine is a button in a list item, named "Title by First author, not read yet" or "…, finished", with "by First author and N others" for several authors, and the full title even when the label is cut (UX-DR25)' }
  - { id: AC-5, idSource: generated, text: 'The bookcase is a shelf-wall card of birch planks with a "BOOKCASE" header, the library meter (a progressbar with aria-valuetext "24 of 73 finished") and a footer legend for finished and not read yet; it is a list named "Bookcase, N books", spines are packed into rows by viewport width and ordered by author then title, and the page scrolls normally (UX-DR26, UX-DR30)' }
  - { id: AC-6, idSource: generated, text: 'With a library of 500 seeded Books, all 500 spines are in the page (no lazy rows), so find-in-page and the keyboard reach every spine (NFR7)' }
  - { id: AC-7, idSource: generated, text: 'The bookcase is one Tab stop with roving tabindex that remembers the last focused spine; Left and Right move in sort order across rows; Up and Down move to the nearest horizontal center in the adjacent row; Home and End go to the first and last spine; and there is no type-ahead (UX-DR27)' }
  - { id: AC-8, idSource: generated, text: 'When Search titles narrows the shelf and the focused spine is hidden, non-matching spines are hidden and the shelf closes up, and focus moves to the nearest remaining spine in sort order, or to Search titles when none remain' }
  - { id: AC-9, idSource: generated, text: 'After adding a Book, when the panel closes in Bookcase view, the new spine is scrolled into view with the highlight ring (fading over about 2 s, instant under reduced motion) and receives focus' }
  - { id: AC-10, idSource: generated, text: 'When the cataloging skill has just saved "Dune" and Catalog opens in Bookcase view (default or remembered) and it types "Dune" into Search titles, it can confirm the save from a spine whose accessible name starts with "Dune by " (the UX-DR25 name pattern), which "Dune Messiah by …" never matches; and CAT-E2E-002 runs in both Bookcase and List view' }
  - { id: AC-11, idSource: generated, text: 'In both themes and forced colors, read and unread spines stay distinct, and axe reports no AA violations' }
---

# ATDD Checklist - Epic 1, Story 1.10: See the library as a bookcase

**Date:** 2026-10-30
**Author:** Oleg
**Primary test levels:** E2E (Playwright against a real seeded `bookvie`) for the Bookcase view; API (pytest, `TestClient` against `create_app` and a real `Store` on `tmp_path`) for the view data

---

## Story Summary

As Oleg, I want my catalog drawn as birch shelves of spines, with read books in color and unread ones outlined, so that I can see at a glance how much of my library I have read.

The story is almost all client work. The `catalog` view already carries every input a spine needs (Story 1.6 built it to AD-6): `spineColor`, `finished`, `title`, `firstAuthor`, `authorCount` and the `meter`. Story 1.10 adds the Bookcase view as the Catalog default, the Bookcase · List toggle, spine geometry and color, spine names, the bookcase card with meter and legend, roving-tabindex keyboard, Search titles on the shelf, focus after an add, and the skill's spine check. The spine popover (Enter and Space) is not in this story; Stories 1.14, 3.2 and 4.4 bring it. Markers and the Main-book fill come with Epics 3 and 4. Sort and filters come with Epic 7.

**Story source:** there is no story spec file yet (`sprint-status.yaml` lists `1-10-see-the-library-as-a-bookcase` as `backlog`). The criteria come from `epics.md` → Story 1.10. When `spec-1-10-…md` is written, add an `### ATDD Artifacts` link to this checklist under its Dev Notes.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false (the package isn't installed), so the specs use the project's own `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.9.

**Generation mode:** AI generation from the story, EXPERIENCE.md, DESIGN.md and the existing code. There was no browser recording, because the Bookcase view doesn't exist yet; every locator comes from the role and name the criteria pin. Execution was sequential with a single author, as in Stories 1.6 to 1.9: the context was already loaded, and one author keeps the helpers consistent across both files.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-11 in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Bookcase is the default; "Catalog view" toggle with `aria-pressed`, remembered; Search applies to both | E2E | P1 | `[P1] AC-1` |
| AC-2 | Server supplies spine color, status, title, first author, author count, meter (back-fills count) | API | P0 | `test_ac2_p0_…` |
| AC-3 | 28px wide; height formula (136 / 168 / 200 cap); read = exact color + edge + strip ≤ 96 + ellipsis; unread = fill + outline, no strip | E2E | P0 | `[P0] AC-3` |
| AC-4 | Button in a list item; "*Title* by *First author*[ and N others], finished / not read yet"; full title | E2E | P0 | `[P0] AC-4` |
| AC-5 | `shelf-wall` card, BOOKCASE header, meter progressbar, legend; list "Bookcase, N books"; author/title order; page scrolls | E2E | P1 | `[P1] AC-5` |
| AC-6 | 500 Books → 500 spines in the page; keyboard reaches the last | E2E | P1 | `[P1] AC-6` |
| AC-7 | One Tab stop, roving tabindex remembered; Left/Right across rows; Up/Down nearest center; Home/End; no type-ahead | E2E | P0 | `[P0] AC-7` |
| AC-8 | Search hides spines, shelf closes up, Tab stop moves to the nearest spine; none left → no-match line | E2E | P1 | `[P1] AC-8` |
| AC-9 | After an add in Bookcase view: new spine scrolled into view, ringed, focused | E2E | P0 | `[P0] AC-9` |
| AC-10 | Skill check: spine named `^Dune by ` (never "Dune Messiah by"), in Bookcase and List | E2E | P0 | `[P0] AC-10` |
| AC-11 | Read and unread distinct in light, dark and forced colors; axe AA clean | E2E | P1 | `[P1] AC-11` |

Priorities: P0 covers what the unattended cataloging skill and assistive tech read (R-05): spine names (AC-4, PRG-E2E-004), the skill's confirmation (AC-10, CAT-E2E-002) and focus after an add (AC-9). It also covers the only keyboard route to a spine (AC-7), the read/unread distinction that is the story's purpose (AC-3), and the numbers behind the meter (AC-2). P1 is for things that are visible and recoverable if they break: the toggle, the card, scale, closing up the shelf after a search, and the themes.

Level split (no duplicate coverage): the view numbers are proven at API (AC-2), and the E2E tests never recount Readings. They seed state through `LibraryBuilder` and read what the browser shows: roles, names, focus, computed style and geometry.

---

## Story Integration Metadata

- **Story ID:** `1.10`
- **Story Key:** `1-10-see-the-library-as-a-bookcase`
- **Story File:** none yet; criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.10)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md`
- **Generated Test Files:** `backend/tests/test_bookcase_view.py`, `frontend/e2e/bookcase.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 11 in all. The backend leaf carries `@pytest.mark.skip(reason=RED)`, where `RED` is "ATDD red phase: un-skip when Story 1.10 builds the Bookcase view", and its name carries `ac2_p0`. E2E leaves are `test.skip(...)`, and their titles carry `[P#] AC-n`.

### API Test (1 test): `backend/tests/test_bookcase_view.py`

- `[P0] AC-2` primary: `meter == {finished: 3, total: 5}`. The library holds *Dune* (back-filled, no start date, user color `#F2D35B`), *Good Omens* (finished once and now re-read, color from the cover), *Nana* (finished twice), *Emma* (started, never finished) and *The Science of Discworld* (never started, three authors). Then the `(title, firstAuthor, authorCount, spineColor, finished)` of each Book are exact, including the user, cover and curated colors. **This leaf is green on arrival** (see Notes).

### E2E Tests (10 tests): `frontend/e2e/bookcase.spec.ts`

- `[P1] AC-1` primary: **Bookcase** in the "Catalog view" group has `aria-pressed="true"` on first visit. Then the buttons are exactly **Bookcase**, **List**; the list is visible and the table hidden; "Dune" in Search titles leaves one spine; **List** shows one row, the search kept; a reload keeps List; **Bookcase** then a reload keeps Bookcase.
- `[P0] AC-3` primary: *Dune*'s spine box is exactly 28 × 136. Then *The Left Hand of Darkness* is 168 high and 28 wide, and a 63-character Tufte title is capped at 200. *Dune* (read, user color pale yellow) has the exact fill `rgb(242, 211, 91)`, `spine-edge` borders on the top and sides and none at the bottom, its label in `spine-label` ink, on a `spine-label-strip` plate. The Tufte label is `nowrap` with an `ellipsis`, on a strip no longer than 96px. *The Left Hand of Darkness* (unread) has the unread fill, `spine-unread-outline` on the top and sides and none at the bottom, `spine-unread-text`, and no plate.
- `[P0] AC-4` primary: a `button` named exactly "Dune by Frank Herbert, finished" inside a `listitem` of the bookcase. Then "The Science of Discworld by Terry Pratchett and 2 others, not read yet" and the full Tufte title. Three list items hold three buttons.
- `[P1] AC-5` primary: a `list` named exactly "Bookcase, 5 books". Then the five spine names are in Intl.Collator order by first author, then title (bell hooks, Émile Zola, Frank Herbert, Ursula K. Le Guin ×2). The heading reads "Bookcase" in any case. The one `progressbar` has `aria-valuetext` "2 of 5 finished", min 0, max 5, now 2, and the text is visible. The legend shows "finished" and "not read yet". An ancestor of the list has the `shelf-wall` background, and no ancestor up to `body` has `overflow-y: auto|scroll`.
- `[P1] AC-6` primary: "Bookcase, 500 books" holds 500 buttons. Then "Book 500" is text in the page, and Tab into the bookcase, then End, focuses its spine.
- `[P0] AC-7` primary: Tab from **New book** focuses the first spine. Then exactly one `[tabindex="0"]`. Right and Left step in order. With 50 spines in two rows (measured by spine bottoms): Right crosses from the end of row 1 to the start of row 2, and Left crosses back. Down from the far right of row 1 lands on row 2's last spine (nearest center). Up lands on the spine straight above it. End and Home go to the last and first spine. "B" moves nothing. Shift+Tab to **New book**, then Tab, comes back to the last focused spine, with still one `[tabindex="0"]`.
- `[P1] AC-8` primary: after the Tab stop is on *Cosmos* and "moon" is typed, two spines remain (*Blue Moon*, *Eclipse Moon*) in two list items. Then the two stand 4px apart (the shelf closed up). Tab from **New book** lands on *Blue Moon*, the nearest remaining spine (one away; *Eclipse Moon* is two). With "zzz", focus stays in Search titles, no spine remains, and "No titles match “zzz”." is shown.
- `[P0] AC-9` primary: after **Add book** for *Swing Time* by Zadie Smith (it sorts last after 300 seeded Books, below the fold), its spine is focused. Then the panel is hidden, the spine is in the viewport, `status` reads "Added Swing Time.", and an `accent` box-shadow is on the spine (or its list item, or inside it) and gone within 4 s.
- `[P0] AC-10` primary: after the skill saves *Dune* and types "Dune" into Search titles, exactly one bookcase button matches `^Dune by `. Then two spines are shown and *Dune Messiah*'s name starts "Dune Messiah by ". In List view, exactly one row has the title "Dune", out of two rows. Back to Bookcase, a reload and the same search find one `^Dune by ` spine.
- `[P1] AC-11` primary: in light, the read and unread spines' fills differ. Then axe (WCAG 2.2 AA tags) finds nothing in light or dark. Under `forced-colors: active`, the fills still differ and the unread outline differs from its fill.

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): the `library_builder` fixture in pytest and `seededServer({books})` in Playwright. The spec adds two small builders: `finished(pages)`, a back-filled finished Reading, and `shelfOf(count, author)`, "Book 001" to "Book N" by one author, so sort order is the title order. Literals are named (`PALE_YELLOW`, `TUFTE`, `SWING_TIME`, and the DESIGN.md light colors as computed `rgb()` strings).

## Fixtures Created

None. The backend file has its own `_client` (the `test_views.py` pattern). The E2E file has spec-local helpers in the 1.8 and 1.9 style: `bookcase`, `spines`, `spine` (a button in a list item, by exact name), `viewToggle`, `search`, `bookRows`, `tabIntoBookcase`, `press`, `shelfRows` (spine indexes grouped by their bottom edge) and `look` (the computed fill, edges, label and label plate of a spine).

## Mock Requirements

None. Every test runs against a real seeded server. Nothing is routed.

## Contract the Scaffolds Pin (names the implementation must use)

- **Toggle:** `role="group"` named "Catalog view", with two buttons, **Bookcase** then **List**, each with `aria-pressed`. This is ThemeToggle's pattern. The choice survives a reload (localStorage; the key is free). With no stored choice, Bookcase is pressed.
- **Bookcase list:** `role="list"` named "Bookcase, *N* books", with one `listitem` per Book. Each item holds exactly one `button` (the spine). Filtered-out items are `hidden`, so they leave both the accessibility tree and the layout.
- **Spine name:** "*Title* by *First author*, finished" or "…, not read yet"; with several authors, "*Title* by *First author* and *N* others, …". The full title always, even when the label is cut.
- **Spine geometry:** the `button` element's border box is the spine: 28px wide, and the height from the formula. The scaffolds measure `boundingBox()` on the button.
- **Spine look:** the button's own `background-color` is the fill: the exact `spineColor` when read, `spine-unread-fill` when unread. The edge line and the unread outline are the button's top, left and right **borders**, with a 0px bottom border. The label is the deepest element whose text is the title, and on a read spine its nearest ancestor with a background (inside the button) is the strip, in `spine-label-strip`. On an unread spine nothing between the label and the button has a background. The label is `white-space: nowrap` and `text-overflow: ellipsis`.
- **Card:** an ancestor of the list has the `shelf-wall` background. The Catalog's `main` holds exactly one `progressbar` (the library meter) with `aria-valuemin="0"`, `aria-valuemax` = total, `aria-valuenow` = finished, `aria-valuetext` "*X* of *Y* finished", and the same text visible. A heading whose name is "Bookcase" in any case (CSS may uppercase it). Legend texts "finished" and "not read yet" (any case).
- **Keyboard:** the bookcase follows **New book** in Tab order. Exactly one spine has `tabindex="0"`, and the others have `-1`.
- **After an add:** the new spine is focused, in the viewport, and ringed with an `accent` box-shadow on the button, its list item, or a descendant, gone after about 2 s. Then `announce('status', 'Added <Title>.')`, as in 1.8.
- **Shelf gap:** 4px between neighbouring spines (`--space-spine-gap`), also after a search closes the shelf up.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`, then watch it fail, implement, and watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_bookcase_view.py`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/bookcase.spec.ts -g "AC-4 "`.

### AC-2 view data
- [x] Un-skip AC-2. It passes today (the view shipped with Story 1.6), so keep it as the regression pin for back-fills, re-reads and color precedence

### AC-1 the toggle (do first: it changes the default view)
- [x] `components/ViewToggle` (or a generic `SegmentedToggle` shared with ThemeToggle): `role="group"`, "Catalog view", Bookcase · List, `aria-pressed`, stored in `localStorage` with the try/catch that `lib/theme.ts` uses
- [x] `CatalogPage`: render `Bookcase` or `CatalogList` from the choice, with Bookcase as the default. Search titles keeps one `query` for both
- [x] **Existing tests that assume the List view is the default** must switch to List first, by clicking **List** or seeding the stored choice: `catalog-list.spec.ts` (all four tests), `new-book-panel.spec.ts` AC-5 (focus on the new row) and `duplicate-dialog.spec.ts` AC-8 (`getByRole('table').locator(':focus')`). This is part of the implementation, not a regression
- [x] Activate AC-1

### AC-3 / AC-4 the spine
- [x] The spine, inline in `pages/Bookcase.tsx` (no separate component): `<li><button>` with the accessible name from `title`, `firstAuthor`, `authorCount` and `finished` (`aria-label`, or visually hidden text), and the label as visible text
- [x] Height: measure the label's natural one-line width in `spine-label` (built as the vertical label's `scrollHeight`), then `min(200, ceil((120 + 0.3 × w) / 8) × 8)`. Keep this as a pure function in `lib/` so it can be unit-tested
- [x] Read: fill `spineColor` exactly; `spine-edge` borders on the top and sides; a label strip of at most 96px (label at most 88px, one line, ellipsis). Unread: `spine-unread-fill`, 1.5px `spine-unread-outline` on the top and sides, `spine-unread-text`, no strip
- [x] Activate AC-4, then AC-3

### AC-5 / AC-6 the bookcase
- [x] `pages/Bookcase`: a `shelf-wall` card, a "BOOKCASE" heading, the meter as a `progressbar` from `view.meter`, the `list` "Bookcase, N books", rows on birch planks (flex-wrap, so rows follow the viewport width), and a legend. Order with the existing `sortBooks`
- [x] Render every spine, with no virtualization (NFR7). Keep spine elements light: 500 is the design scale
- [x] Reuse the plank styles of `EmptyShelf`, so the empty state and the full bookcase share one look
- [x] Activate AC-5, then AC-6

### AC-7 / AC-8 keyboard and search
- [x] Roving tabindex: one `tabIndex=0` spine (the last focused, or the first). Left/Right step through the *visible* spines in sort order. Up/Down use the spines' `getBoundingClientRect()` centres in the row above or below. Home/End. Character keys are ignored
- [x] When the tab-stop spine is filtered out, move the tab stop to the nearest visible spine in sort order (see Notes for ties). Move actual focus only when a spine had focus. When none remain, show the no-match line (the existing `noMatchCopy`) in place of the shelf
- [x] Activate AC-7, then AC-8

### AC-9 / AC-10 after an add, and the skill
- [x] `onAdded`: in Bookcase view, scroll the new spine into view (`behavior: 'auto'` under reduced motion), focus it, ring it for `HIGHLIGHT_MS`, then announce. Generalize `titleCells` so it holds the spine buttons too
- [x] Activate AC-9, then AC-10

### AC-11 themes
- [x] Dark tokens are already in `tokens.css`. Add the forced-colors rules from DESIGN.md → Forced colors (`forced-color-adjust: none` on read fills, a `CanvasText` outline on unread, a `Canvas`/`CanvasText` strip)
- [x] Activate AC-11

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] AC-1: an empty library shows neither the toggle nor Search titles (`catalog-empty.spec.ts` AC-8 "only New book" must keep passing); a broken or unknown stored value falls back to Bookcase; localStorage throwing doesn't break the page; Tab order is Search titles → Bookcase → List → **New book** (empty library: `catalog-empty.spec.ts` AC-8; the rest: `bookcase.spec.ts` and `bookcase-details.spec.ts`)
- [x] AC-3 (unit, `src/**/*.test.ts`): the height function at the boundaries: a width of 0 gives 120; the step rounds up at w = 80/3 (w = 26.66 → 128, w = 26.67 → 136, w = 26.8 → 136); the cap starts at 200 (w > 240 → 200)
- [ ] AC-3: (done in `bookcase-details.spec.ts`: the spines are bottom-aligned on the plank; the strip leaves a 6px band of color on each side; a user-set near-black and pure white are shown exactly; text-spacing overrides grow the spine) open: the 1.5px outline. Playwright 1.64's Chromium computes a 1.5px border as 1px at `deviceScaleFactor: 2` too, even on a plain `div`, so no browser test can pin it
- [x] AC-4: the wording for exactly one co-author (see Notes); a Book with no authors (`firstAuthor` is "") gets no dangling "by"
- [x] AC-5: rows reflow when the viewport goes from 1024 to 1440px; about 35 spines a plank at 1280px; 12px inner padding at the row ends; the list name with one Book ("Bookcase, 1 book": unit, `catalog.test.ts`)
- [ ] AC-6: a performance budget for the first render of 500 spines (a P3 check). Open: NFR7 sets a scale, not a time, so there is no budget to assert
- [x] AC-7: Left on the first spine and Right on the last don't wrap; Up from row 1 and Down from the last row stay put; arrows skip `hidden` spines; Enter and Space do nothing until the popover story
- [x] AC-8: the nearest-neighbour tie rule; clearing the search keeps the tab stop; when the focused spine itself is hidden (filters and delete come in Epic 7 and Story 1.12), real focus moves, and it goes to Search titles when none remain (driven by setting Search titles from a script, so focus stays on the spine)
- [x] AC-9: reduced motion shows the ring instantly and scrolls with `behavior: 'auto'`; a search that would hide the new Book is cleared first; Add anyway from the Duplicate dialog lands on the spine the same way
- [x] AC-10: the remembered List view after a reload runs the List form of the check (AC-1 reloads into List; AC-10 runs the List form)
- [x] AC-11: axe with 500 spines; the dark-theme computed colors of the edge, strip and unread outline; the two-tone focus ring on a spine (`page` band, then `accent`)

---

## Running Tests

```bash
# Story 1.10 scaffolds (all skipped until activated)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_bookcase_view.py
npm --prefix frontend run e2e -- e2e/bookcase.spec.ts

# One criterion, after un-skipping it
npm run build && npm --prefix frontend run e2e -- e2e/bookcase.spec.ts -g "AC-7 "

# Everything
npm run check
```

---

## Red-Green-Refactor Workflow

**RED (done):** 11 scaffolds, all skipped. 10 fail when un-skipped. AC-2 already passes (see Notes).

**GREEN (dev):** start with AC-1, because making Bookcase the default breaks the existing List-view tests, and those should be fixed in the same change. Then the spine (AC-4, AC-3), the card (AC-5, AC-6), the keyboard (AC-7, AC-8), focus after an add (AC-9, AC-10) and the themes (AC-11). Run `npm run check` before each commit.

**REFACTOR:** with everything green, pull the spine, plank and roving-tabindex logic into pieces that Home's bookcase slice (Story 3.5) can reuse. The slice follows the rows as displayed, not bookcase order, so keep row computation separate from key handling.

---

## Next Steps

1. Write the story spec (`spec-1-10-see-the-library-as-a-bookcase.md`), settle the open points in Notes, and link this checklist from its Dev Notes.
2. Implement Story 1.10 with `bmad-build` (or dev-story), activating tests one criterion at a time.
3. After implementation, run `bmad-testarch-automate` for the green-phase follow-ups above.

---

## Knowledge Base References Applied

- **test-levels-framework.md / test-priorities-matrix.md:** the view numbers sit at API, and everything that needs layout, focus or computed style sits at E2E. No E2E test recounts Readings. P0 is what the skill and assistive tech read (R-05), plus the keyboard route and the read/unread distinction.
- **test-quality.md:** one criterion per leaf, and no conditionals. Every value is exact (pixel sizes, `rgb()` strings, names, counts), and assertions sit in test bodies. The 500-Book leaf asserts presence and reach, not timing.
- **data-factories.md:** `LibraryBuilder` with only the fields that matter, plus `finished()` and `shelfOf()` for readable seeds.
- **selector-resilience.md:** roles and exact accessible names (`group` "Catalog view", `list` "Bookcase, N books", spine names, `progressbar`). No test ids or CSS classes. Computed style is read from the elements found by role.
- **network-first.md / timing-debugging.md:** every wait is a web-first assertion or `expect.poll`. There is no `waitForTimeout` and no routing.
- **fixture-architecture.md:** reuses `seededServer`, so every test gets its own seeded server with cleanup.
- **component-tdd.md:** red-green-refactor per criterion, with accessibility (names, roles, focus, forced colors) alongside behaviour.
- **test-healing-patterns.md:** rows are found from geometry (spine bottoms), not hard-coded counts per row. Spines are found by name, never by index into an implementation list, except where the criterion is about order.
- **playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack. No recording was possible (there is no UI yet), and the CI pipeline is unchanged.

---

## Test Execution Evidence

### Green run (Story 1.10 implemented)

- `TZ=Europe/Madrid uv run pytest tests/test_bookcase_view.py` → **1 passed**.
- `npm --prefix frontend run e2e -- e2e/bookcase.spec.ts` → **14 passed** (the 10 ATDD tests plus 4 added in review).
- `npm run check` → exit 0 (96 e2e passed, none skipped).
- Unit: `spine.test.ts` (height boundaries, tie rule), `catalog.test.ts` (`spineName`, `bookcaseName`), `catalogView.test.ts` (junk and throwing storage). The step boundary is w = 80/3 ≈ 26.667, so the unit test pins 26.66 → 128 and 26.67 → 136 (w = 26.7 gives 128.01, which rounds up to 136).

### Scaffold run (all skipped)

- `TZ=Europe/Madrid uv run pytest tests/test_bookcase_view.py` → **1 skipped**; `ruff check` clean.
- `npx playwright test e2e/bookcase.spec.ts` → **10 skipped**; `tsc -b` and `oxlint e2e` clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

| ID | Result | First failure |
|---|---|---|
| AC-1 | fail | `group "Catalog view"` → **Bookcase** not found (`toHaveAttribute aria-pressed`) |
| AC-2 | **pass** | (green on arrival; see Notes) |
| AC-3 | fail | `boundingBox` timeout: spine "Dune by Frank Herbert, finished" not found |
| AC-4 | fail | spine button "Dune by Frank Herbert, finished" not found (`toBeVisible`) |
| AC-5 | fail | `list "Bookcase, 5 books"` not found (`toBeVisible`) |
| AC-6 | fail | `list "Bookcase, 500 books"` buttons: expected 500, received 0 |
| AC-7 | fail | first spine not found (`toBeFocused`) |
| AC-8 | fail | spine "Cosmos by Author, not read yet" not found (`toBeFocused`) |
| AC-9 | fail | spine "Swing Time by Zadie Smith, not read yet" not found (`toBeFocused`) |
| AC-10 | fail | `^Dune by ` spines: expected 1, received 0 |
| AC-11 | fail | `evaluate` timeout: read spine not found |

---

## Notes and Open Points

- **AC-2 is green on arrival.** Story 1.6 built the `catalog` view to AD-6 with every spine input and the meter, and `test_views.py` already covers its shape. The AC-2 leaf adds the cases that view test leaves out: a Book finished twice counts once, a re-read in progress still counts as finished, and cover-derived color precedence. It passes when un-skipped. It is kept skipped only so that every scaffold in this commit follows the same rule; un-skip it first. No server change is expected in this story.
- **"and N others" with one co-author.** The criterion gives the pattern "by *First author* and N others". For N = 1 that reads "and 1 others". The scaffolds avoid it (they use three authors), and Good Omens-style Books need a decision in the spec: "and 1 other" is the natural reading.
- **The list name while searching.** "Bookcase, N books": the criterion doesn't say whether N is the total or the visible count during a search. The scaffolds match any N, except in AC-5 and AC-6, where nothing is filtered. A visible count would repeat the polite "N books match." announcement, so the total seems better.
- **Nearest spine on a tie.** AC-8's scenario has no tie (one away against two away). When the hidden spine has visible neighbours at equal distance on both sides, the spec should pick one; the previous spine keeps the reading position.
- **Focus while typing.** In this story, only Search titles can hide spines, and while you type, focus is in the search field, not on a spine. So the AC-8 scaffold checks the *tab stop* moving, not focus being taken from the field. The "real focus moves" branch (and "to Search titles when none remain") becomes reachable with filter chips (Epic 7) and Delete (Story 1.12). It is listed as a follow-up.
- **The edge line is a border.** The scaffolds read the read edge and the unread outline as the button's top, left and right borders with no bottom border. If the spec draws them another way (an inset box-shadow or a pseudo-element), change the `look()` helper, not the criterion.
- **Platform fonts.** The heights 136 and 168 come from the story's examples, measured with the macOS `system-ui`. CI runs on Ubuntu. *Dune* is safe for any font (its title would have to be over 53px to change the step), and the Tufte title is far past the cap. *The Left Hand of Darkness* needs a measured width between 134 and 160px. That covers the usual Linux fallbacks (about 150px for DejaVu Sans at 11px), but if CI disagrees, assert the formula from the label's measured width instead of the literal.
- **Bookcase follows New book in Tab order.** `tabIntoBookcase` presses Tab from **New book**. Today's toolbar is Search titles, then the toggle, then **New book**. Epic 7 inserts the Sort select and filter chips before the shelf, and that helper will need to change then.
- **Existing tests change with the default.** Three specs assume the List view (listed under AC-1). Updating them belongs to the AC-1 change.
