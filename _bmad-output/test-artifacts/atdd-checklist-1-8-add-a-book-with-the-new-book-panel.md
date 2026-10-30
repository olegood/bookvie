---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-30'
storyId: '1.8'
storyKey: '1-8-add-a-book-with-the-new-book-panel'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-18-add-a-book-with-the-new-book-panel'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-8-add-a-book-with-the-new-book-panel.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-list.spec.ts'
  - 'frontend/e2e/new-book-panel.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.8, Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md (Clock: Playwright timezoneId/page.clock left for 1.8)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Focus after close, Agent Label Contract)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (ink, accent, scrim, text-field border-invalid, highlight-ring, serif, side panel)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-E2E-001, -002, -004, -005; R-05, R-12)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md (add-book contract)'
  - 'frontend/playwright.config.ts, frontend/e2e/README.md, frontend/e2e/fixtures.ts, frontend/e2e/catalog-empty.spec.ts, frontend/e2e/seed.spec.ts'
  - 'frontend/src/pages/CatalogPage.tsx, components/AppShell.tsx, lib/announce.ts, api/intents.ts, api/views.ts, api/generated/schema.d.ts'
  - 'backend/bookvie/intents/add_book.py, intents/contract.py, backend/tests/builder.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Activating New book on Catalog (also on the empty state) opens a modal side panel dialog named "New book" from the right with focus on Title, a scrim and a sticky footer; the body sets scroll-padding-bottom so a focused field is never hidden (UX-DR6, UX-DR13)' }
  - { id: AC-2, idSource: generated, text: 'Every Agent Label Contract entry for the panel (Title, Subtitle, Pages, Author(s), Edition prefilled 1, Language, Publisher, Type with an empty first option then Paperback, Hardcover, Ebook, ISBN, Year, Finished on, Tags, Spine color, swatches Sage … Stone, Add book, Cancel, Close) is found by exact accessible name with the contract''s role, "Title" never matches "Subtitle" (CAT-E2E-001); "(required)" sits outside each label and required fields carry required' }
  - { id: AC-3, idSource: generated, text: 'Typing in Tags shows a combobox with a listbox suggesting existing tags that start with the typed text; arrow keys and Enter pick a suggestion, and any other text is always accepted (UX-DR16)' }
  - { id: AC-4, idSource: generated, text: 'Pressing a swatch button fills Spine color with that swatch''s hex and the swatch shows aria-pressed="true"' }
  - { id: AC-5, idSource: generated, text: 'Add book on a complete form empties both live regions at the press, closes the panel, sets status to "Added Title.", highlights the new row in the List view and moves focus to its title (CAT-E2E-002); a search that would hide the new Book is cleared first' }
  - { id: AC-6, idSource: generated, text: 'Add book with invalid fields saves nothing, keeps the panel open with every value, gives each invalid field aria-invalid="true" and a described-by message, sets alert to "Not saved. 2 fields need attention: Pages, Language." and focuses the first invalid field, with no red anywhere (UX-DR14)' }
  - { id: AC-7, idSource: generated, text: 'When the server answers couldnt_save (a routed 503 in e2e), the panel stays open with every typed value and alert reads "Couldn''t save. Your data wasn''t changed." in ink (CAT-E2E-005, TR9)' }
  - { id: AC-8, idSource: generated, text: 'Cancel, Close or Esc closes the panel without a prompt, saves nothing, and returns focus to New book' }
  - { id: AC-9, idSource: generated, text: 'With Books in the catalog, a List view table shows Title (serif), Author, Pages, Status and Date added in that fixed order, sorted by first author string with Intl.Collator, then by title (UX-DR21)' }
  - { id: AC-10, idSource: generated, text: 'Search titles (visible label, searchbox, no placeholder, first control after the nav) hides rows whose titles don''t contain the text, ignoring case, and after about 500 ms status reads "N books match."; with no matches the list area shows "No titles match “query”." and "0 books match."; Esc in a non-empty field clears it (UX-DR17, UX-DR18)' }
  - { id: AC-11, idSource: generated, text: 'After the cataloging skill saves "Dune" and types "Dune" into Search titles, it can confirm the save from a row whose title equals "Dune" exactly, even though "Dune Messiah" also matches' }
  - { id: AC-12, idSource: generated, text: 'While the add-book request is in flight, Add book has aria-disabled="true" and further presses send nothing until the response arrives' }
---

# ATDD Checklist - Epic 1, Story 1.8: Add a book with the New book panel

**Date:** 2026-10-30
**Author:** Oleg
**Primary test level:** E2E (Playwright against a real `bookvie`, each test on its own seeded server)

---

## Story Summary

As Oleg, or my AI cataloging skill, I want a labeled New book panel and a searchable list of my Books, so that a shelf can be cataloged unattended and every save can be confirmed by title.

The story is the browser side of Story 1.7's `add-book` intent: the New book side panel with every Agent Label Contract field, Tags suggestions and spine swatches, the add, validation and couldn't-save outcomes, closing without saving, the in-flight guard, the List view table, and Search titles. The Bookcase view, and the toggle between the two views, arrive in Story 1.10. Until then the List view is the only view of a non-empty Catalog.

**Story source:** there is no story spec file yet (`sprint-status.yaml` lists `1-8-add-a-book-with-the-new-book-panel` as `backlog`). The criteria come from `epics.md` → Story 1.8. When `spec-1-8-…md` is written, add an `### ATDD Artifacts` link to this checklist under its Dev Notes.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). The story's server side shipped with 1.7, so every scaffold is E2E. The label contract is about the accessibility tree, and only E2E sees it (test-design-qa, CAT-E2E-001).

**Generation mode:** AI generation from the story, EXPERIENCE.md, DESIGN.md and the existing code. No browser recording, since the panel doesn't exist yet. Execution was sequential with a single author, as in Stories 1.6 and 1.7.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-12 in source order. Full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | New book opens a modal side panel from the right, focus on Title, scrim, sticky footer, scroll padding | E2E | P0 | `new-book-panel.spec.ts` |
| AC-2 | Every contract label by exact name and role; "(required)" outside the label; `required` | E2E | P0 | `new-book-panel.spec.ts` |
| AC-3 | Tags combobox with listbox suggestions; arrow keys + Enter pick; free text accepted | E2E | P1 | `new-book-panel.spec.ts` |
| AC-4 | A swatch fills Spine color with its hex; `aria-pressed="true"` | E2E | P1 | `new-book-panel.spec.ts` |
| AC-5 | Add book: regions emptied, panel closes, "Added *Title*.", row highlighted and focused; search cleared | E2E | P0 | `new-book-panel.spec.ts` |
| AC-6 | Invalid: nothing saved, values kept, `aria-invalid` + description, alert text, focus first invalid, no red | E2E | P0 | `new-book-panel.spec.ts` |
| AC-7 | Couldn't save (routed 503): panel open, values kept, exact alert in ink | E2E | P0 | `new-book-panel.spec.ts` |
| AC-8 | Cancel / Close / Esc: no prompt, nothing saved, focus back on New book | E2E | P1 | `new-book-panel.spec.ts` |
| AC-9 | List view columns in fixed order, serif titles, `Intl.Collator` author sort then title | E2E | P1 | `catalog-list.spec.ts` |
| AC-10 | Search titles filters ignoring case, "N books match." after the pause, no-match state, Esc clears | E2E | P0 | `catalog-list.spec.ts` |
| AC-11 | The skill confirms a save from the row whose title equals the search exactly | E2E | P0 | `catalog-list.spec.ts` |
| AC-12 | Add book is `aria-disabled` while in flight; more presses send nothing | E2E | P1 | `new-book-panel.spec.ts` |

Priorities: P0 is every outcome the unattended cataloging skill reads, plus the data-safety paths. That is R-05 (Agent Label Contract drift: AC-1, AC-2, AC-5, AC-6, AC-10, AC-11) and R-12 (data-safety UX: AC-7). P1 covers behaviour that is visible and recoverable when it breaks: suggestions, swatches, closing, ordering, and the double-submit guard. The guard's server-side backstop is that a second add of the same title would be stopped by Story 1.9's duplicate check.

---

## Story Integration Metadata

- **Story ID:** `1.8`
- **Story Key:** `1-8-add-a-book-with-the-new-book-panel`
- **Story File:** none yet; criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.8)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-8-add-a-book-with-the-new-book-panel.md`
- **Generated Test Files:** `frontend/e2e/catalog-list.spec.ts`, `frontend/e2e/new-book-panel.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one `test.skip(...)` leaf per criterion, 12 in all. Each title carries `[P#] AC-n`. Every test emulates the light theme where it checks colors, and starts its own seeded server through `seededServer`, so no test writes to the worker's shared server.

### E2E Tests (9 tests): `frontend/e2e/new-book-panel.spec.ts`

- `[P0] AC-1` primary: the `dialog` "New book" is visible after **New book** on the empty state. Then: Title is focused; the dialog matches `:modal`; its `::backdrop` is the light scrim `rgba(43, 46, 42, 0.24)`; its right edge is the viewport's; and in a 1280×640 viewport, a focused Spine color sits fully in view above **Add book**, with **Add book** still in view.
- `[P0] AC-2` primary: `getByLabel('Title', { exact: true })` finds exactly one field, named exactly "Title". Then each of the twelve contract fields is found by role and exact name. Each one's `<label>` text is exactly its name, and its `required` property is as the contract says. There are 7 "(required)" markers. Edition is `1`. Type's options are `''`, Paperback, Hardcover, Ebook. Finished on is `type=date`. The eight swatches are `aria-pressed="false"`, and From cover is absent. There is one each of **Add book**, **Cancel** and **Close**, and one **Cancel** on the whole page.
- `[P1] AC-3` primary: typing `sc` in a library tagged `science`, `classics`, `sci-fi`, `cyberpunk` shows exactly two options, science and sci-fi, and Tags has `aria-expanded="true"`. Then ArrowDown selects one option and Enter puts it in the field, without submitting. A free-text tag `zines` is saved and appears in the catalog view's `tags`.
- `[P1] AC-4` primary: **Clay** fills Spine color with `#9B6753` (case-insensitive). Then Clay is `aria-pressed="true"` and the other seven are `"false"`.
- `[P0] AC-5` primary: `status` reads "Added Dune." after **Add book**. The search box held "Neuro", and an invalid press beforehand left text in `alert`. Then: the panel is hidden; the first text recorded on `alert` after the press is `''`, and it stays empty; `status` held no other text; the search box is empty; exactly one row has the title "Dune", and the focused element inside it reads "Dune"; that row (or a cell in it) carries the accent box-shadow of the highlight ring; the server holds Dune and Neuromancer.
- `[P0] AC-6` primary: with Pages and Language empty, `alert` reads "Not saved. 2 fields need attention: Pages, Language." Then: the panel is still open; Pages is focused; Pages and Language each have `aria-invalid="true"` and the descriptions "Pages is required." and "Language is required."; Title is not marked invalid; every typed value is kept (Title, Author(s), Publisher, Type, Edition); Pages has a 2px ink top border; both messages are ink; the server still holds only Neuromancer.
- `[P0] AC-7` primary: with `add-book` routed to a 503 `couldnt_save` envelope, `alert` reads "Couldn't save. Your data wasn't changed." Then: the panel is open; its own copy of the line is ink; all seven typed values and Type are kept; `status` is empty; the server holds only Neuromancer.
- `[P1] AC-8` primary: after **Cancel**, the panel is hidden and **New book** is focused. The same holds for **Close** and for Esc in the same leaf, one round each. Every round opens with an empty Title, which shows the last round's text was discarded. No `window` dialog (prompt) appeared, and the server holds only Neuromancer.
- `[P1] AC-12` primary: with the request held at the route, **Add book** is `aria-disabled="true"`. A forced click and an Enter while it is held send nothing more. After release, `status` reads "Added Dune.", the route saw exactly one POST, and the server holds Dune once.

### E2E Tests (3 tests): `frontend/e2e/catalog-list.spec.ts`

- `[P1] AC-9` primary: the `table`'s column headers are exactly Title, Author, Pages, Status, Date added. Then the rows are ordered *All About Love* (bell hooks), *Nana* (Émile Zola), *Dune* (Frank Herbert), *A Wizard of Earthsea*, *The Dispossessed* (both Ursula K. Le Guin). That order differs from code-point order (which puts "bell" and "É" last) and from insertion order. Titles are set in `ui-serif`.
- `[P0] AC-10` primary: typing `DUNE` one key at a time leaves 3 of 5 rows, ignoring case. Then *The Left Hand of Darkness* is hidden, and `status` reads "3 books match." It is the only non-empty text the region held: a count announced per keystroke would add "4 books match." for "d". Next, `zzz` shows "No titles match “zzz”." in `main`, "0 books match." and no rows. Esc clears the field and brings back all 5 rows. Last: the label "Search titles" is visible, there is no `placeholder`, and Tab from `main` lands on the search box first.
- `[P0] AC-11` primary: with *Dune* and *Dune Messiah* seeded, searching "Dune" leaves exactly one row with an element whose text is exactly "Dune". Then both rows match, so the count alone can't confirm the save.

### API / Component Tests (0 tests)

N/A. The add-book rules are covered at API level by Story 1.7 (`backend/tests/test_add_book.py`). This story adds no new server behaviour, and the repo has no component-test runner. Client logic that could be unit tested (the collator sort, the tags split, the debounce) is green-phase work in `src/**/*.test.ts` (see the follow-ups below).

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1), called by `seedLibrary`. Each test names only the Book fields it is about. `DUNE` is the required form fields as the skill types them, and `NEUROMANCER` is the one-book baseline.

## Fixtures Created

- **`seededServer(partial)`** (test-scoped, in `frontend/e2e/fixtures.ts`): it seeds a fresh folder `seeded-<testId>-<n>` under the run directory, starts a server on it, and follows the worker's `serverDev` option. After the test it stops every server it started, removes their folders, and fails if any server wrote to stdout. It replaces the hand-written seed → start → `finally` stop pattern in `catalog-empty.spec.ts`. `e2e/README.md` → Seeding documents it.
- Spec-local helpers in `new-book-panel.spec.ts`: `newBookPanel`, `openNewBook`, `fillFields`, `catalog` (reads `GET /api/views/catalog` from the test's server), `recordRegion` / `recordedTexts` (a MutationObserver log of a live region's texts, as in the 1.6 Try-again test). In `catalog-list.spec.ts`: `bookRows`, the table's rows without the header row.

## Infrastructure Changes Made

- `frontend/e2e/fixtures.ts`: the `seededServer` fixture (above). `seed.spec.ts` still passes with it.
- `frontend/e2e/README.md`: one sentence on `seededServer`.

## Mock Requirements

- **AC-7:** `page.route('**/api/intents/add-book')` fulfills 503 with the real `couldnt_save` envelope: `{"error": {"kind": "couldnt_save", "code": "couldnt_save", "message": "Couldn't save. Your data wasn't changed."}}`.
- **AC-12:** the same route, held on a promise and then continued to the real server.
- Nothing else is mocked. Every other test saves to a real seeded server and reads the result back from its catalog view.

## Contract the Scaffolds Pin (names the implementation must use)

- **Panel:** a native `<dialog>` opened with `showModal()` (the test checks `:modal` and `::backdrop`). Its accessible name is "New book", for example through `aria-labelledby` on its "New book" heading. **Close** is the × button's accessible name.
- **Labels:** every field has a `<label>` whose text is exactly the contract name. "(required)" is a sibling outside the `<label>`. The field has the `required` attribute. Tags is an `<input role="combobox" aria-expanded aria-controls>` with a `role="listbox"` of `role="option"` items, and the active option has `aria-selected="true"`. Type is a native `<select>` whose first option is empty.
- **Swatches:** `<button aria-pressed>` named Sage … Stone, filling Spine color with the DESIGN.md hex (`#749076` … `#6F7375`). From cover is not rendered without a cover.
- **Messages:** each invalid field's message is linked through `aria-describedby`, and its text is the server's `fields[].message`. The `alert` text is the server's top-level `message`: "Not saved. N fields need attention: …" (Story 1.7 already builds it with form labels).
- **Live regions:** the shell's `status` and `alert` regions, through `announce` / `clearAnnouncements`. They are cleared on panel open and at each **Add book** press.
- **List view:** a `<table>` with `<th>` column headers, in a fixed order. The title in a row is focusable (Story 1.11 turns it into a link to Book detail), and its text is exactly the title. Rows hidden by search are removed from the accessibility tree (`hidden`).
- **Search titles:** `<input type="search">` with a visible `<label>` "Search titles", no placeholder, and the first focusable element in `main`.
- **Highlight ring:** DESIGN.md `highlight-ring` as a `box-shadow` containing the accent `rgb(85, 112, 89)`, on the row or a cell in it.
- **Submit guard:** `aria-disabled="true"` (never native `disabled`) while the request is in flight. Presses are ignored in the handler.

---

## Implementation Checklist

Activate one test at a time: change its `test.skip(` to `test(`, watch it fail, implement, and watch it pass. Run with `npm --prefix frontend run e2e -- e2e/new-book-panel.spec.ts -g "AC-1 "` after `npm run build` (the server serves the built SPA).

### Prerequisite: e2e time (deferred-work, Story 1.4 → 1.7)
- [ ] Pin `TZ=Europe/Madrid` in `check:e2e`, and set `timezoneId` (and a fixed `page.clock` day matching `--fake-today`) in the Playwright fixture. The deferred-work item names this for Story 1.8. No red scaffold needs it, but Finished on's default and "not in the future" depend on it once green-phase tests cover them.

### AC-1 panel
- [ ] `components/SidePanel` (a native `<dialog>` with `showModal()`, a heading, × **Close**, a scrollable body with `scroll-padding-bottom` equal to the footer height, a sticky footer) and its CSS Module using `--color-scrim` for `::backdrop`
- [ ] `CatalogPage`: **New book** (toolbar and empty state) opens `NewBookPanel`; focus on Title; `clearAnnouncements()` on open
- [ ] Activate AC-1

### AC-2 fields
- [ ] `NewBookPanel` with every contract field in form order, using `TextField` (with a "(required)" marker outside the label); the Type `<select>`; Finished on as `type=date`; Edition prefilled `1`
- [ ] Activate AC-2

### AC-3 Tags / AC-4 swatches
- [ ] `TagsCombobox`: suggestions from `CatalogView.tags` that start with the last comma-separated segment; arrow keys move `aria-selected`; Enter picks the option (with `preventDefault`, so the form doesn't submit); free text untouched
- [ ] Swatch row: eight `aria-pressed` buttons; pressing one sets Spine color; Spine color equal to a swatch's hex marks it pressed
- [ ] Activate AC-3, then AC-4

### AC-5 / AC-12 add
- [ ] `addBook(form)` in `api/`: `FormData` with an `intent` JSON part of the form's raw strings (camelCase keys, as in the 1.7 contract), through `sendIntent`
- [ ] On **Add book**: `clearAnnouncements()`; set `aria-disabled` and ignore presses until the result; on `ok`, clear a hiding search, close the panel, wait for the refetched view to render, focus the new row's title, highlight it, then `announce('status', 'Added <Title>.')`
- [ ] Activate AC-5, then AC-12

### AC-6 / AC-7 refusals
- [ ] `invalid_fields`: map `fields[].field` (camelCase key) to its input; set `aria-invalid` and `aria-describedby` on each; `announce('alert', error.message)`; focus the first invalid field in form order; keep every value
- [ ] `couldnt_save`: keep the panel and values; show the line in ink inside the panel; `announce('alert', message)`
- [ ] `TextField` invalid style: `2px solid var(--color-ink)`, messages in ink, no red token anywhere
- [ ] Activate AC-6, then AC-7

### AC-8 closing
- [ ] **Cancel**, **Close** and the dialog's `cancel` event (Esc) reset the form and close; focus returns to the opener
- [ ] Activate AC-8

### AC-9 / AC-10 / AC-11 List view and search
- [ ] `CatalogList`: `<table>` Title (serif `book-title-sm`), Author, Pages, Status, Date added; sort with `new Intl.Collator(undefined)` on `firstAuthor`, then on title
- [ ] `SearchTitles`: labelled `type=search`, first in `main`; filter with `toLocaleLowerCase().includes`; set `hidden` on non-matching rows; debounce about 500 ms, then `announce('status', 'N books match.')`; the no-match line; Esc clears a non-empty field
- [ ] Activate AC-9, AC-10, then AC-11

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] AC-1: `inert` / focus trap. Tab from **Close** wraps inside the panel, and `main` is not reachable while the panel is open. Also axe in both themes with the panel open (as in 1.6's AC-13)
- [ ] AC-1: the 150 ms fade, and no fade or slide under `prefers-reduced-motion: reduce`
- [ ] AC-2: the dark theme's ink for messages and borders (`rgb(236, 234, 227)`)
- [ ] AC-3: suggestions for the second tag ("sci-fi, cl" suggests `classics` and keeps `sci-fi, `); ArrowUp; Esc in Tags closes the listbox first and doesn't close the panel; matching that ignores case ("SC")
- [ ] AC-4: typing a swatch's hex by hand marks that swatch pressed; clearing Spine color unpresses all
- [ ] AC-5: Finished on filled → the new row's Status reads as finished (back-filled), and the library meter, once it exists, counts it
- [ ] AC-5: the full CAT-E2E-002 agent flow over all optional fields (Subtitle, ISBN with spaces, Year, Tags, Spine color) read back from the catalog view; Story 1.10 reruns it in Bookcase view
- [ ] AC-6: one test per validation-table row through the UI (Pages `0`, Edition `0`, Year `65`, ISBN `12345`, Finished on tomorrow, Spine color `red`), each with its exact described-by text; the 1-field singular "1 field needs attention: Pages."
- [ ] AC-6: a second invalid press re-announces the same alert text (regions emptied, then set after the tick)
- [ ] AC-7: a network failure (`route.abort`) gives the same couldn't-save outcome (`sendIntent` maps it); a retry after the route is lifted saves once
- [ ] AC-8: Esc while the Tags listbox is open; closing from the empty state returns focus to the empty state's **New book**
- [ ] AC-10: the 500 ms pause measured with `page.clock` (no announcement at 300 ms, one at about 600 ms); "1 book match." versus "1 books match." (settle the copy, see Notes); search plus a later add of a matching title
- [ ] AC-9: ties on author break by title with the collator ("a" vs "B"); Date added and Pages formatting; Status strings
- [ ] Unit (`src/**/*.test.ts`): the catalog sort comparator, the tags-segment matcher, and the search predicate

---

## Running Tests

```bash
# Story 1.8 scaffolds (all skipped until activated)
npm --prefix frontend run e2e -- e2e/new-book-panel.spec.ts e2e/catalog-list.spec.ts

# One criterion, after un-skipping it
npm run build --prefix frontend && npm --prefix frontend run e2e -- e2e/new-book-panel.spec.ts -g "AC-6 "

# The whole e2e check (build + suite)
npm run check:e2e
```

---

## Red-Green-Refactor Workflow

**RED (done):** 12 scaffolds, all skipped, each asserting the expected behaviour.

**GREEN (dev):** take one criterion, un-skip its test, see it fail, implement the minimum, and see it pass. Start with AC-1 and AC-2 (the panel and its fields), since every panel test opens it. Run `npm run check` before each commit.

**REFACTOR:** with everything green, extract the side panel, the live-region "clear at press, announce after render" sequence, and the field-error mapping, so Story 1.9's Duplicate dialog and Story 1.11's Edit book panel reuse them.

---

## Next Steps

1. Write the story spec (`spec-1-8-add-a-book-with-the-new-book-panel.md`), settle the open points in Notes, and link this checklist from its Dev Notes.
2. Implement Story 1.8 with `bmad-build` (or dev-story), activating tests one criterion at a time.
3. After implementation, run `bmad-testarch-automate` for the green-phase follow-ups above.

---

## Knowledge Base References Applied

- **selector-resilience.md:** every locator is a role plus an exact accessible name, or an exact label. No test ids or CSS classes: the Agent Label Contract forbids them, and the tests are its check. Rows are filtered by content, not by index.
- **network-first.md / timing-debugging.md:** routes are registered before navigation. Held requests release on a promise, and `waitForRequest` is awaited before checking the in-flight state. Every wait is a web-first assertion or `expect.poll`. There is no `waitForTimeout`, and no typing delay.
- **test-quality.md:** one concern per leaf. No conditionals: AC-2's and AC-8's loops run the same path every time, with the loop key as the assertion message. Assertions sit in the test bodies, and helpers only act or read. Every assertion can fail: values are constrained (exact texts, exact colors, exact title sets), not shapes.
- **data-factories.md:** state is seeded through `LibraryBuilder` with only the fields that matter. Literals are named (`DUNE`, `NEUROMANCER`, `SWATCHES`, `INK`, `ACCENT`, `SCRIM`).
- **fixture-architecture.md:** `seededServer` is one concern (a seeded server per test) with automatic cleanup, composed onto the existing worker fixtures through `base.extend`.
- **test-levels-framework.md / test-priorities-matrix.md:** E2E only for what needs the browser (the accessibility tree, focus, live regions, CSS). Business rules stay at API level (1.7) and are not duplicated. P0 for what the skill reads and for data safety.
- **component-tdd.md:** red-green-refactor per criterion, with accessibility assertions alongside behaviour.
- **test-healing-patterns.md:** no hardcoded ids. The new row is found by its title, and `seeded-<testId>` folders keep parallel workers apart.
- **playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack; no recording was needed (no UI yet), and the CI pipeline is unchanged.

---

## Test Execution Evidence

### Scaffold run (all skipped)

`npm --prefix frontend run e2e -- e2e/new-book-panel.spec.ts e2e/catalog-list.spec.ts e2e/seed.spec.ts` → **12 skipped, 2 passed** (`seed.spec.ts`, exercising the changed fixture file). `tsc -b` and `oxlint e2e` are clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

With the skips removed, all 12 fail against today's code. The `seededServer` teardown ran clean every time (no stdout, folders removed).

| ID | Result | First failure |
|---|---|---|
| AC-1 | fail | `dialog "New book"` not found (`toBeVisible`) |
| AC-2 | fail | `getByLabel('Title', { exact: true })` count `0`, expected `1` |
| AC-3 | fail | Tags combobox not found (`pressSequentially` timeout) |
| AC-4 | fail | Clay swatch not found (`click` timeout) |
| AC-5 | fail | Search titles not found (`fill` timeout) |
| AC-6 | fail | panel fields not found (`fill` timeout) |
| AC-7 | fail | panel fields not found (`fill` timeout) |
| AC-8 | fail | panel Title not found (`toHaveValue('')`) |
| AC-9 | fail | column headers `[]`, expected the five |
| AC-10 | fail | rows `0`, expected `5` |
| AC-11 | fail | Search titles not found (`fill` timeout) |
| AC-12 | fail | panel fields not found (`fill` timeout) |

Seven of the twelve fail on a setup action, a locator timeout on a control that doesn't exist yet, before their primary assertion. That is expected while the panel and search box don't exist. Once AC-1 and AC-2 are green, each of those tests reaches its own primary assertion first.

---

## Notes and Open Points

- **Inert live regions.** `showModal()` makes everything outside the dialog inert, and that includes the shell's `status` and `alert` regions, which sit outside `main`. The `AppShell` comment expects only the page to become inert. AC-5, AC-6 and AC-7 read `getByRole('alert')` while the panel is open, so they fail if the regions drop out of the accessibility tree. That failure would be real: a screen reader would not hear the regions either. If it happens, move the regions into the top layer (for example, render them inside the open dialog), or make the panel modal another way. Don't weaken the locator.
- **"1 book match."** The copy for N = 1 isn't specified ("N books match."). No red scaffold depends on it. Settle it in the spec. Story 1.7's server message already uses "1 field needs" for the alert.
- **Tags pick semantics.** AC-3 accepts the picked tag with or without a trailing ", ". Settle the choice in the spec, then tighten the regex.
- **Type values.** `selectOption('Paperback')` matches either a label or a value. The server expects lowercase `paperback`, so the option values should be lowercase and the labels capitalised.
- **Highlight ring detection.** AC-5 checks for the accent in a computed `box-shadow` on the row or a cell. An outline-based ring would need the test changed. DESIGN.md defines the ring as a box-shadow.
- **Status column copy.** No red scaffold asserts the Status strings. EXPERIENCE.md → Book states uses "finished" and "not read yet" in spine names. Pick the List view text in the spec.
