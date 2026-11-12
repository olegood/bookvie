---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-12'
storyId: '7.2'
storyKey: '7-2-filter-my-catalog'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-72-filter-my-catalog'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-2-filter-my-catalog.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-filter.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 7 intro; Story 7.2; Story 7.1 for the boundary)'
  - '_bmad-output/implementation-artifacts/epic-7-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Filter chips, Search field, Catalog view toggle, Bookcase ordering and Home slice, Filters no matches, Live regions)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Catalog layout toolbar row 2, Filter chips, accent-soft token)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html (chip markup: role=group "Status" and "Type", aria-pressed buttons)'
  - '_bmad-output/test-artifacts/atdd-checklist-7-1-sort-my-catalog.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/models.py (ShelfBook has no type, language or tags; CatalogView.tags), backend/bookvie/views/shelf.py (tags via merge_tags, library order), backend/tests/builder.py (Book defaults), backend/tests/test_bookcase_view.py'
  - 'frontend/src/pages/CatalogPage.tsx, Bookcase.tsx (nearestVisible Tab stop, li[hidden], noMatch), CatalogList.tsx; src/lib/catalog.ts (matchesTitle, matchCountCopy, noMatchCopy, bookcaseName)'
  - 'frontend/e2e/bookcase.ts, catalog-sort.spec.ts, fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Catalog toolbar''s second row, when it renders, then filter chips appear in labeled groups: Status (Read, Unread), Type (Paperback, Hardcover, Ebook), Language ▾ and Tag ▾, each chip a toggle button with aria-pressed, and selected chips show the accent-soft fill, a 2px accent border and a check glyph (UX-DR20)' }
  - { id: AC-2, idSource: generated, text: 'Given Language ▾ or Tag ▾, when I open it, then it lists checkboxes for the values that exist in the library (from the catalog view), in alphabetical order, and with values selected the chip reads "Language: 2"' }
  - { id: AC-3, idSource: generated, text: 'Given active filters, when they apply, then chips within a group combine with OR, and groups combine with each other and with Search titles with AND, and non-matching Books are hidden, not dimmed, the shelf closes up, and after the change the status region reads "N books match." (FR-20)' }
  - { id: AC-4, idSource: generated, text: 'Given any filter on, when I look at the row, then a "Clear filters" link at its end turns every filter off' }
  - { id: AC-5, idSource: generated, text: 'Given filters that match nothing, when the view renders, then the shelf area shows "No books match these filters." with a "Clear filters" link' }
  - { id: AC-6, idSource: generated, text: 'Given the focused spine is filtered out, when filters change, then focus moves to its nearest remaining neighbor in sort order, or to Search titles when none remain' }
  - { id: AC-7, idSource: generated, text: 'Given filters, when I leave Catalog and come back, then they are off, because filters aren''t remembered between visits, and Home''s slice and the library meter never apply them' }
  - { id: AC-8, idSource: generated, text: 'Given I add a Book that the current filters would hide, when the panel closes, then the filters are cleared first, so the new spine can be highlighted' }
---

# ATDD Checklist: Story 7.2 Filter my catalog

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Story:** `epics.md` Story 7.2 has 8 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-8 in source order (registry above).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments load. Contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`.
- **Epic gate:** not needed. 7.2 is not the first story of Epic 7, and Story 7.1 is `done` in `sprint-status.yaml`.
- **What exists today:**
  - The Catalog toolbar has one row: Search titles, Sort, the view toggle and New book. There are no filter chips.
  - Search titles hides non-matching spines (`li[hidden]`) and List rows, and the shelf closes up. The count "N books match." is announced after typing pauses. With no match it shows `No titles match “…”.`
  - `Bookcase`'s Tab stop already moves to the nearest visible spine in sort order (the previous one on a tie) when its spine is hidden. It moves real focus only if the hidden spine had real focus, and it falls back to Search titles when none remain.
  - `onSaved` clears Search titles before the new spine is focused and ringed.
  - **The backend has to change.** `ShelfBook` (the catalog view's Book) has no `type`, `language` or `tags`, so the client can't filter on them. `CatalogView.tags` exists, but in library order with case merged (`merge_tags`), not alphabetical. Status comes from `ShelfBook.finished`, which already exists.
- **Boundary with Story 7.1:** 7.1 owns the Sort select, the four orders, the remembered sort and Home's slice order. 7.2 owns the chips, toolbar row 2, Clear filters, the filter-driven "N books match.", the no-match line, the focus fallback on a filter change, and clearing filters on an add.

## Generation Mode

**AI generation**, run sequentially in this session, without subagents, as for 7.1. The chips don't exist yet, so there is nothing to record. The leaves reuse `bookcase.ts`'s locators and the add-book flow from `catalog-sort.spec.ts`.

**No API leaf.** The rule is one red leaf per criterion, and every criterion is browser behavior. The backend change (type, language and tags on `ShelfBook`) is reached end to end by AC-2, AC-3, AC-5 and AC-6. Its own pytest is a green-phase follow-up below.

## Test Strategy

There is one red leaf per criterion: 8 in all, all E2E, in a new `frontend/e2e/catalog-filter.spec.ts`. Every leaf runs at 1280×900 under the default Author sort.

**Seed (`FILTER_SHELF`):** six Books, seeded in the order Austerlitz, Candide, Flights, Bleak House, Dubliners, Emma. In that order, the languages and the tags are not alphabetical.

| Author order | Title | First author | Type | Language | Tags | Status |
|---|---|---|---|---|---|---|
| 1 | Bleak House | Charles Dickens | hardcover | English | novel, classic | not read yet |
| 2 | Dubliners | James Joyce | paperback | English | stories | not read yet |
| 3 | Emma | Jane Austen | ebook | English | novel, classic | not read yet |
| 4 | Flights | Olga Tokarczuk | hardcover | Polish | (none) | finished |
| 5 | Candide | Voltaire | ebook | French | classic | finished |
| 6 | Austerlitz | W. G. Sebald | paperback | German | novel | finished |

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P1 | **The `Status` group in `main` holds the buttons Read and Unread.** Then the `Type` group holds Paperback, Hardcover and Ebook. All are `aria-pressed="false"`. The Language and Tag chips read "Language ▾" and "Tag ▾". The Status group sits below Search titles' row. After a click, Read is `aria-pressed="true"` with an `accent-soft` fill, a 2px `accent` border on all sides, and a check glyph (✓ in its text or `::before`, or an `svg`). Its name stays exactly "Read". | Role, state and computed look exist only in the browser |
| AC-2 | E2E | P1 | **After opening Language ▾, the checkboxes are English, French, German, Polish.** Then checking French and Polish makes the chip read "Language: 2". Tag ▾ lists classic, novel, stories. | The values come from the view, but the list and its order are client presentation |
| AC-3 | E2E | P0 | **With Paperback and Ebook on, the spines are Dubliners, Emma, Candide, Austerlitz** (OR within a group). Then `status` reads "4 books match.". Adding Unread leaves Dubliners and Emma, with "2 books match." (AND across groups). Candide and Bleak House are hidden, not dimmed. Search titles "d" leaves only Dubliners, with "1 book matches.", since "d" alone also matches Candide. List view shows one row, Dubliners. | The combining rules, the closing up and the announcement meet only in the page. FR-20 |
| AC-4 | E2E | P1 | **After Read, Ebook and Language French, then Clear filters, every spine is back in Author order.** Then every chip is unpressed, the Language chip has no count, and Clear filters is gone. With a filter on again, the Tab stop after Tag ▾ is Clear filters. | A UI control and its place in the row |
| AC-5 | E2E | P1 | **Ebook and Polish together show "No books match these filters."** in `main`. Then no spine is visible. There are two Clear filters controls: the row's, and the later one in the shelf area. Clicking the later one brings all six back and removes the line. | An empty-state rendering |
| AC-6 | E2E | P1 | **With Flights focused and Tag "novel" checked, Tab into the bookcase lands on Emma**, Flights' nearest remaining neighbor (one step back). Austerlitz is two steps on, and Bleak House is the first spine, so "the first spine" and "the next one" both fail. Then the spines are Bleak House, Emma, Austerlitz. | The roving keyboard model is browser behavior |
| AC-7 | E2E | P1 | **After Unread, going to Home and coming back to Catalog through the nav, Unread is not pressed.** Then all six spines show. With Unread on again (three spines), the meter's `aria-valuetext` is still "3 of 6 finished". Home's slice shows all six in Author order. | Navigation state and two other surfaces |
| AC-8 | E2E | P1 | **With Read on, after adding Swing Time (unread), Read is no longer pressed.** Then the new spine is focused, the panel is closed, 7 spines show, and `status` reads "Added Swing Time.". | The add flow's hand-off to the shelf |

**Red today** (each leaf was un-skipped in a throwaway copy, run with a 15 s timeout, and the copy deleted):
- **AC-1** fails at its first assertion: `toHaveText` on the `Status` group's buttons times out, because there is no such group.
- **AC-2 to AC-8** fail at the first chip click, the transition each criterion's journey starts with: Language ▾ (AC-2), Paperback (AC-3), Read (AC-4, AC-8), Ebook (AC-5), Tag ▾ (AC-6), Unread (AC-7). No assertion runs before it.
- **AC-6**'s unasserted setup passes: Tab into the bookcase and three ArrowRights.

Every seed loaded and every server started cleanly, so no leaf fails for a seed error. The builder already accepts `type`, `language` and `tags`.

**What the leaves pin (the contract for the build):**
- **Groups:** `role="group"` named exactly **Status** and **Type** inside `main`, as in the mockup. Their buttons are **Read** and **Unread**, and **Paperback**, **Hardcover** and **Ebook**, in that order. Each is a `button` with `aria-pressed`.
- **Language and Tag chips:** `button`s in `main` whose accessible names start with "Language" and "Tag". Their text is "Language ▾" and "Tag ▾" with nothing selected, and "Language: N" (starting with that) with N values checked. Clicking one shows its values as `checkbox`es named by the value, in alphabetical order. There are no other checkboxes on the page while it's open.
- **Selected look:** `background-color` `accent-soft` (`rgb(227, 235, 226)` in light), a 2px `accent` border on every side, and a check glyph that isn't part of the accessible name.
- **Row 2:** the Status group's top is at or below the bottom of Search titles.
- **Combining:** OR within a group, AND across groups and with Search titles. This also covers the search's own count: "1 book matches." counts the filtered result.
- **Hiding:** non-matching spines are out of the accessibility tree (hidden), as Search titles already does it. List view applies the same filters.
- **Announcement:** after a chip change, the `status` region reads "N books match." (`matchCountCopy`).
- **Clear filters:** a `button` named exactly **Clear filters** (styled as a link, like "How long until…?"). It's present only while a filter is on, it's the next Tab stop after Tag ▾, and it turns off every chip and every checked Language and Tag value.
- **No match:** the text "No books match these filters." in `main`, plus a second Clear filters button after the row's.
- **Focus:** the bookcase's Tab stop follows `nearestVisible`: the nearest remaining spine in sort order.
- **Not remembered:** leaving Catalog through the nav and coming back turns every filter off. The meter and Home's slice ignore filters.
- **Add:** after an add that a filter would hide, every filter is off by the time the new spine is focused.

**Open for the build (not pinned):**
- **The view fields.** The suggestion is `type`, `language` and `tags` on `ShelfBook`. The leaves only need the filters to work.
- Whether the Language and Tag chips use `aria-pressed` (as the AC says for every chip) or `aria-expanded` for their popup, and how the popup closes (Esc, outside click). The leaves only click the chip and check boxes.
- How a value's case is handled. `merge_tags` keeps the first spelling. Language values are free text, so "english" and "English" could both exist.
- Whether Clear filters also clears Search titles. The AC says "every filter", and the search isn't a filter.
- Which line shows when the search and the filters together match nothing: `No titles match “…”.` or "No books match these filters.".
- Whether the bookcase's name ("Bookcase, N books") keeps counting every Book while a filter is on. Today it does during a search.
- Whether an add clears filters that wouldn't hide the new Book.
- Whether the chips show on an empty library. Search titles, Sort and the view toggle hide then.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **API, the catalog view (`backend/tests/test_bookcase_view.py`):** every `books[]` entry carries `type`, `language` and `tags` as stored, and the contract test or the generated `schema.d.ts` picks them up (`npm --prefix frontend run api:gen`).
- [ ] **Unit, the filter (`lib/catalog.test.ts` or a new `lib/catalogFilter.test.ts`):** OR within a group, AND across groups. An empty group means no constraint. Read is `finished`, and Unread is `!finished`, so a re-read finished Book counts as Read. A Book with no tags never matches a Tag filter. The distinct, alphabetical value lists use `Intl.Collator`. Case handling for tags and languages, whichever the build picks. The function doesn't mutate its input.
- [ ] **E2E, AC-6 none remain:** a filter change that hides every spine moves real focus to Search titles when a spine had real focus. With focus on a chip or checkbox, only the Tab stop is affected. Pin what the build does, since chips take focus when clicked.
- [ ] **E2E, AC-6 restore:** after Clear filters, the Tab stop stays where it moved, as Search titles already does ("Keep a moved stop").
- [ ] **E2E, AC-3 repeated count:** toggling a chip off and on again with the same result announces "N books match." again (the region is emptied first, about 100 ms tick).
- [ ] **E2E, AC-3 single value:** one Book shows "1 book matches.".
- [ ] **E2E, AC-5 in List view:** the same "No books match these filters." line and Clear filters link replace the table.
- [ ] **E2E, AC-5 search plus filters:** pin which no-match line shows when both are active.
- [ ] **E2E, AC-1 dark theme and axe:** the selected chip's fill and border use the dark tokens. Extend the Catalog axe test in `bookcase-details.spec.ts` with a chip on and the Language list open, in both themes.
- [ ] **E2E, AC-2 keyboard:** the Language and Tag lists open and close from the keyboard (Enter or Space on the chip, Esc closes and returns focus to the chip), and Tab reaches the checkboxes.
- [ ] **E2E, AC-2 Tag case:** a library with "Classic" and "classic" lists one value.
- [ ] **E2E, AC-7 reload:** a reload of Catalog also starts with no filters on, and no filter key appears in `localStorage`.
- [ ] **E2E, AC-7 sort kept:** a filter doesn't change the remembered sort, and a sort change keeps the filters.
- [ ] **E2E, AC-8 matching add:** pin whether adding a Book that the filters keep visible leaves them on.
- [ ] **E2E, AC-8 with a search:** with Search titles text and a filter both hiding the new Book, both are cleared.

## Existing tests the build must update

- `frontend/e2e/catalog-list.spec.ts:130` checks that Search titles is the first control after the nav. It stays true while the chips come after row 1.
- `frontend/e2e/catalog-sort.spec.ts` AC-1 checks the Tab order Search titles → Sort → view toggle. Row 2 comes after row 1's controls in the DOM, so New book and then the chips follow. Keep the toolbar's row 1 order unchanged.
- `tabIntoBookcase` (`bookcase.ts`) focuses "How long until…?" and presses Tab. It stays right as long as nothing new sits between that link and the bookcase.
- `backend/tests/test_contract.py` and `frontend/src/api/generated/schema.d.ts` change when `ShelfBook` gains fields. Regenerate the schema; `check:api` compares it byte for byte.
- `frontend/e2e/bookcase-details.spec.ts:408` runs axe on a non-empty Catalog, which will now render the chips in both themes.

## TDD Red Phase (Current)

There is one skipped leaf per criterion, 8 in all, in `frontend/e2e/catalog-filter.spec.ts`, inside the `Story 7.2 Filter my catalog (ATDD)` describe. Each is a `test.skip(`, and each title carries exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `catalog-filter.spec.ts:157` the toolbar's second row has Status and Type chip groups plus Language ▾ and Tag ▾, toggle buttons that show selection with a fill, a 2px accent border and a check | P1 |
| AC-2 | `catalog-filter.spec.ts:198` Language ▾ and Tag ▾ list the library's values as checkboxes in alphabetical order, and the chip counts the checked ones | P1 |
| AC-3 | `catalog-filter.spec.ts:215` chips OR within a group and AND across groups and Search titles, hide non-matching Books in both views, and announce "N books match." | P0 |
| AC-4 | `catalog-filter.spec.ts:247` "Clear filters" at the end of the row turns every filter off | P1 |
| AC-5 | `catalog-filter.spec.ts:274` filters that match nothing show "No books match these filters." with a "Clear filters" link | P1 |
| AC-6 | `catalog-filter.spec.ts:295` when the focused spine is filtered out, the bookcase's Tab stop moves to its nearest remaining neighbor in sort order | P1 |
| AC-7 | `catalog-filter.spec.ts:317` filters are off after leaving Catalog and coming back, and never apply to the meter or Home's slice | P1 |
| AC-8 | `catalog-filter.spec.ts:344` adding a Book the filters would hide clears them, so the new spine is focused and announced | P1 |

**Skipped as committed** (run in this session):
- `TZ=Europe/Madrid npx playwright test e2e/catalog-filter.spec.ts` gives 8 skipped.
- Prettier formatted the file, `tsc -b` is clean, and oxlint reports nothing for `catalog-filter.spec.ts`.

## Data Factories, Fixtures and Mocks

- **No new factory or fixture.** The leaves use `seededServer` and `bookcase.ts`'s `bookcase`, `bookRows`, `search`, `spine`, `viewToggle`, `tabIntoBookcase`, `finished`, `SWING_TIME` and `ACCENT`.
- **New helpers, local to the spec:**
  - `bookId(n)`.
  - `chipGroup` and `chip`.
  - `languageChip`, `tagChip` and `clearFilters`.
  - `spineNames`, the visible spines' `aria-label`s in DOM order.
  - `checkboxNames`, each checkbox's name from `aria-labelledby`, `aria-label` or its `<label>`.
  - `anySpine`, a spine by name even while hidden.
  - `FILTER_SHELF`, the seed.
- **No mocks:** every leaf runs against the real server.
- **No `data-testid`:** the leaves locate elements by role, accessible name and label.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass. Run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-filter.spec.ts`.

### Backend: the view fields
- [ ] Add `type`, `language` and `tags` to `ShelfBook` and fill them in `views/shelf.py`. Add the pytest above and regenerate `schema.d.ts`.

### AC-1: the chips
- [ ] Add toolbar row 2 with the Status and Type groups and the Language ▾ and Tag ▾ chips, in the chip style (DESIGN.md → Filter chips).
- [ ] Activate AC-1.

### AC-2: Language and Tag lists
- [ ] Derive the distinct values from the view's Books, sorted with the collator, and show them as checkboxes in a small `surface` list. Show the count on the chip.
- [ ] Activate AC-2.

### AC-3: apply the filters
- [ ] Filter the sorted array (OR within a group, AND across groups and the search) in both views, re-applied to every refetch. Announce "N books match." after a filter change, and make the search's count use the filtered result.
- [ ] Add the unit cases above.
- [ ] Activate AC-3.

### AC-4 and AC-5: Clear filters and no matches
- [ ] Add Clear filters at the row's end while any filter is on. Show "No books match these filters." with its own Clear filters in the shelf area.
- [ ] Activate AC-4 and AC-5.

### AC-6: focus
- [ ] Feed the filtered visibility into `Bookcase`'s `visible` set, so the `nearestVisible` Tab stop and the Search titles fallback work for filters as they do for the search.
- [ ] Activate AC-6.

### AC-7: not remembered
- [ ] Keep the filters in `CatalogPage` state only, so leaving Catalog drops them. Don't apply them to the meter or `HomePage`.
- [ ] Activate AC-7.

### AC-8: an add clears them
- [ ] In `onSaved`, clear the filters with the search, before the new spine is focused.
- [ ] Activate AC-8.

## Completion

- **Test files:** `frontend/e2e/catalog-filter.spec.ts` (new, 8 skipped leaves).
- **Checklist:** this file. **Story key:** `7-2-filter-my-catalog`. **Story:** `epics.md` Story 7.2. There is no spec file yet, and `sprint-status.yaml` still reads `backlog`.
- **Next:** `bmad-build-auto` for story 7.2 (AGENTS.md "Story pipeline"). Its build turns these leaves on. Then come `bmad-code-review` in a new session and `bmad-testarch-automate`. Story 7.2 closes Epic 7, the last epic in `epics.md`, so after automate come the epic's retrospective and its trace and gate (AGENTS.md "Epic boundaries").
