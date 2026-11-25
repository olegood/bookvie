---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-25'
storyId: '15.2'
storyKey: '15-2-filter-the-catalog-by-publisher'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-152-filter-the-catalog-by-publisher'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-15-2-filter-the-catalog-by-publisher.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-publisher-filter.spec.ts'
  - 'frontend/e2e/catalog-filter.ts (new shared module: the filter helpers moved from catalog-filter.spec.ts, plus publisherChip, listChip, listPopup, listNames and countLook)'
  - 'frontend/e2e/catalog-filter.spec.ts (now imports the moved helpers; no leaf changed)'
  - 'frontend/e2e/intents.ts (editBook added beside attachCover)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 15 intro, gate, out of scope; Story 15.2)'
  - '_bmad-output/implementation-artifacts/epic-15-context.md'
  - '_bmad-output/planning-artifacts/catalog-publisher-filter-plan-2026-11-25.md (D1–D9, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Filter chips, lines 862–865) and EXPERIENCE.md (Filter chips row, line 148)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-15 backlog, 15-1 done, 15-2 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-15-1-carry-the-publisher-in-the-catalog-view.md and atdd-checklist-14-4-search-the-boxes.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/lib/catalogFilter.ts, catalogFilter.test.ts, components/FilterChips.tsx, FilterChips.module.css, pages/CatalogPage.tsx, styles/tokens.css, api/generated/schema.d.ts'
  - 'frontend/e2e/catalog-filter.spec.ts, fixtures.ts, library.ts, bookcase.ts, tiles.ts, intents.ts; backend/tests/builder.py; backend/bookvie/agent/book_tools.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a non-empty Catalog, when it renders, then the filter row shows Status, Type, Language ▾, Tag ▾, then Publisher ▾, and Publisher ▾ opens the same checkbox list as Language and Tag: rows in body-sm/ink, at most 320px tall, scrolling beyond that (UX-DR94).' }
  - { id: AC-2, idSource: generated, text: 'Given publishers with 84, 49, 49 and 1 Books, when I open Publisher ▾, then the rows are ordered by Book count, most first, the two with 49 in alphabetical order with the Catalog''s collator, and each row shows its count after the name, one space apart, in body-sm/ink-tertiary ("Manning 49"), and Language and Tag rows still show no count.' }
  - { id: AC-3, idSource: generated, text: 'Given Unread and a Tag checked, or text in Search titles, when I open Publisher ▾, then every count is still the publisher''s Books in the whole library, and the order is the same as with no filters (AR66).' }
  - { id: AC-4, idSource: generated, text: 'Given Manning checked, when the Catalog renders in the bookcase, the list and the tiles, then only Manning''s Books show, the others are hidden (not dimmed) and the shelf closes up, the chip reads "Publisher: 1", and the status region announces "N books match."; with Manning and O''Reilly Media checked, the Books of both show (OR); with Manning checked plus Unread and a Search title, only the Books that match all three show (AND).' }
  - { id: AC-5, idSource: generated, text: 'Given Books stored with "Manning" and "manning", when I open Publisher ▾, then they are one row labelled with the first spelling in library order, its count covers both, and checking it shows both.' }
  - { id: AC-6, idSource: generated, text: 'Given Manning checked and the last Manning Book edited to another publisher, when the catalog view is fetched again, then the stale check is dropped (liveFilters), Manning is no longer in the list, and the Catalog isn''t left empty by it.' }
  - { id: AC-7, idSource: generated, text: 'Given a publisher filter on, when I press "Clear filters", reload the page, or add a Book, then Publisher is off again, as every chip is: it is never stored, never in an export, and never applied to Home''s slice or the "X of Y finished" meter.' }
  - { id: AC-8, idSource: generated, text: 'Given a screen reader or keyboard user, when they open Publisher ▾ and move through the rows, then each row is a checkbox whose accessible name is its visible text plus the noun: "Manning 49 books", "Apress 1 book" (UX-DR94), and the chip opens, closes on Esc and returns focus exactly as Language ▾ and Tag ▾ do.' }
---

# ATDD Checklist: Story 15.2 Filter the catalog by publisher

## Preflight

- **Branch:** this run stayed on `story-15-1-carry-the-publisher-in-the-catalog-view` (last commit `7c7788c`), which isn't merged into `master` yet. 15.2 builds on 15.1's `ShelfBook.publisher`, so its tests need those commits. Story steps don't change branches (AGENTS.md → Story pipeline), so Oleg decides whether 15.2 continues on this branch or on a new branch cut from it.
- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are in place. 15.2 is client-only: it adds a chip and filter rules over a field 15.1 already ships, with no server change. So every red leaf is e2e.
- **Story:** `epics.md` Story 15.2 has 8 Given/When/Then criteria, none with an id. They are numbered AC-1 to AC-8 in source order (registry above), and each "And" line belongs to the criterion above it. In `sprint-status.yaml`, `15-2-…` reads `backlog` and `15-1-…` reads `done`.
- **Epic boundary:** 15.2 is Epic 15's last story. After it come automate, the Epic 15 retro and its before-next-epic items (AGENTS.md → Epic boundaries).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto`.
- **What exists today:**
  - `catalogFilter.ts` has `CatalogFilters` with `status`, `types`, `languages` and `tags`, plus `NO_FILTERS`, `FilterableBook`, `filterValues()` (keyed by `toLocaleLowerCase`, first spelling as the label, collator A–Z), `matchesFilters()`, `filtersOn()` and `liveFilters(filters, languages, tags)`. It has no `publishers` field.
  - In `FilterChips.tsx`, `list(field, label, values)` renders `ValueList`: a chip that opens a `role="group"` popup with `aria-label={label}`, holding one native checkbox per value inside a `label`. `.popup` sets `max-height: 320px` and `overflow-y: auto`, and `.option` sets body-sm and `--color-ink`.
  - `CatalogPage.tsx:158–161` builds the Language and Tag lists from all of `books` and passes them through `liveFilters`.
  - The catalog view carries `publisher` (15.1). The e2e builder seeds it from a `publisher` key (default `"Publisher"`), and the app probe below read the seeded values back.

## Generation Mode

**AI generation**, sequential, in this session, as in 14.x and 15.1. Recording isn't needed: the chip reuses `ValueList`, and the shipped Language and Tag lists show its structure. With no API leaf, there was nothing to split into parallel workers, and the reuse rule needs one author to compare helpers.

## Test Strategy

Every leaf is in `frontend/e2e/catalog-publisher-filter.spec.ts`, at 1280×900 in the light theme. Two seeds:

- **`PUBLISHER_SHELF`** (7 Books): Manning 3 (Kubernetes is finished), O'Reilly Media 2 (Learning Go is finished), Addison-Wesley Professional 1, Apress 1. Library order differs from both the Author sort and the list order. Under the Author sort it shows `BY_AUTHOR`: Grokking, Learning Go, Kubernetes, DDIA, Joy of Clojure, Clean Craftsmanship, Pro Git. The list is Manning 3, O'Reilly Media 2, Addison-Wesley Professional 1, Apress 1.
- **`COUNT_SHELF`** (195 Books), AC-2's numbers: O'Reilly Media 84, Manning 49, Pragmatic Bookshelf 49, Apress 1, plus 12 more one-Book publishers, for 16 rows that scroll. In library order Apress comes first, Pragmatic Bookshelf comes before Manning, and the singles run Z to A. So neither library order nor A–Z alone gives `COUNT_ROWS`. Book *n* is "<publisher> book NN": every even *n* is finished and every third *n* is tagged "ops". All are in English.

| AC | Level | Priority | Leaf | First assertion (red run: where it fails) |
|---|---|---|---|---|
| AC-1 | E2E, `COUNT_SHELF` | P1 | `:175` | The chip row's buttons read Read, Unread, Paperback, Hardcover, Ebook, Language ▾, Tag ▾, Publisher ▾ (`:183`). Then the Publisher popup has 16 checkboxes, `max-height: 320px`, the Language popup's background, a height of at most 320, and `scrollHeight > clientHeight` with `overflow-y` `auto` or `scroll`. Its row font and color equal the Language row's (14px, 21px line height, `ink` from DESIGN.md). |
| AC-2 | E2E, `COUNT_SHELF` | P0 | `:224` | `listNames('Publisher')` (polled) matches `COUNT_ROWS` in order, each name starting "<publisher> <count>" with a single space (`:231`). Then, for Manning 49, Pragmatic Bookshelf 49 and Apress 1: the row text starts "<name> <count>". The count sits in its own element in `ink-tertiary`, 14px/21px, in the row's font family. The row is `ink`. Language lists `['English']` and Tag lists `['ops']`, with no count. |
| AC-3 | E2E, `COUNT_SHELF` | P0 | `:260` | With Unread, Tag "ops" and "book 1" on (shipped; `status` reads "3 books match." and 3 spines show), `listNames('Publisher')` still matches `COUNT_ROWS` (`:276`). |
| AC-4 | E2E, `PUBLISHER_SHELF` | P0 | `:280` | The Given: the list matches `PUBLISHER_ROWS` (`:288`). After Manning is checked: the spines are exactly Grokking, Kubernetes and Joy, `status` reads "3 books match.", the chip reads "Publisher: 1", and Learning Go and Pro Git are hidden. With O'Reilly Media also checked: 5 spines, "5 books match." and "Publisher: 2". Manning + Unread: Grokking and Joy. Adding "in": Grokking alone, "1 book matches.". The List shows the one row, Grokking, and the Tiles show the one tile, Grokking. |
| AC-5 | E2E, 3 Books "Manning" (library first), "manning" (author sorts first), "Apress" | P1 | `:324` | The list matches `[Manning 2, Apress 1]`, labelled with the capital spelling (`:339–341`). Checking it gives "Publisher: 1", both spines and "2 books match.". |
| AC-6 | E2E, `PUBLISHER_SHELF`, a second browser context | P1 | `:357` | The Given: `checkPublisher` checks Manning (its list poll at `:162` is the first assertion), and 3 spines show. Another context moves all three Manning Books to No Starch Press with `editBook`, Grokking last. After a focus refetch: the chip reads "Publisher ▾", all 7 spines show, there's no Clear filters and no no-match line, and the list is No Starch Press 3, O'Reilly Media 2, Addison-Wesley Professional 1, Apress 1. |
| AC-7 | E2E, `PUBLISHER_SHELF` | P1 | `:398` | The Given: Manning on through `checkPublisher` (`:162`). The meter reads "2 of 7 finished" with it on. Then each of Clear filters, a reload and leaving for Home and coming back gives "Publisher ▾" and `BY_AUTHOR`. Home's slice shows `BY_AUTHOR`. An add (Swing Time) gives "Publisher ▾" and 8 spines. Storage keys stay as they were, and the only non-GET request is `ADD_BOOK`. |
| AC-8 | E2E, `COUNT_SHELF`, keyboard only | P1 | `:452` | Tab from Tag ▾ and then Enter: the checkbox named exactly "Manning 49 books" is visible (`:463`). Then "Apress 1 book" is visible, and every name equals `COUNT_ROWS.map(fullName)`. The chip is focused with `aria-expanded="true"`. Tab focuses "O'Reilly Media 84 books" and Space checks it, so the chip reads "Publisher: 1". Tab moves to Manning. Esc removes the checkboxes, focuses the chip and sets `aria-expanded="false"`. Enter reopens the list, and Shift+Tab to Tag ▾ closes it. |

**Why these first assertions.** AC-1, AC-2, AC-3 and AC-8 start with the new thing their criterion promises. For AC-4, AC-5 (its first assertion is the merged row itself), AC-6 and AC-7, the first assertion is their Given, because a checked publisher can't exist today. 14.4's AC-4, AC-6 and AC-7 did the same. `listNames` polls: it clicks the chip only if one exists and otherwise returns `[]`. So in every leaf the first operation that can fail is a web-first assertion, never a click on a chip that doesn't exist. AC-3's shipped setup passes in the red run before its first assertion fails.

**What the leaves pin (the contract for the build):**
- **The chip.** A button whose name starts "Publisher", reading "Publisher ▾" when nothing is checked and "Publisher: N" when N values are, placed after Tag ▾ in the row that holds the Status group. Clear filters comes after it. It is the same `ValueList` as Language and Tag: `aria-expanded`, Esc, Tab-out and focus return.
- **The popup.** `role="group"` named "Publisher". Each row is a native checkbox in a `label`. The count is in its own element (an element whose own text is exactly the count) in `ink-tertiary`. The name stays in the row's `ink`. The row text starts "<name> <count>".
- **The names.** "<label> <count> book" or "<label> <count> books". A visually hidden noun or an `aria-label` both pass. The leaves read names from the accessibility tree.
- **The rules.** The order is by library count, then by the Catalog's collator. The counts come from all the catalog view's Books. Case is merged with the first spelling as the label. Publisher combines with the other groups and Search titles like any chip group. `liveFilters` drops a gone publisher.
- **Page state only.** Publisher adds no localStorage key and sends no request.

**Open for the build (not pinned):**
- Whether the noun is a visually hidden span or an `aria-label` on the input.
- How `publisherValues()` returns the count (for example `FilterValue & { count: number }`), and whether `liveFilters` takes a third list or an object.
- Whether `ValueList` gets an optional `count` render or a separate row component.

**Wording for the review (not a test change).** AC-7 says Publisher is "never in an export". The export is built on the server from `library.json`, so a page-state chip can't reach it. The leaf instead pins that nothing is stored and that no request other than the add is sent. It doesn't diff an export file.

## Existing leaves this story changes (for the build)

- **`catalog-filter.spec.ts`:** its helpers `main`, `chipGroup`, `chip`, `languageChip`, `tagChip`, `clearFilters`, `spineNames`, `checkboxNames`, `anySpine`, `storageKeys`, `addSwingTime` and `SWING` moved to `e2e/catalog-filter.ts`, and the spec now imports them. `languageChip` and `tagChip` are now `listChip(page, 'Language' | 'Tag')`, with the same `/^Label\b/` pattern. No leaf or assertion changed. On 2026-11-25, before any app change, `catalog-filter.spec.ts`, `catalog-publisher-filter.spec.ts` and `cover.spec.ts` ran together: 36 passed and 8 skipped.
- **The epic gate** ("the existing catalog-filter e2e specs pass unchanged with Publisher untouched"): `catalog-filter.spec.ts:157` AC-1 asserts `toHaveText(/^Tag\s*▾$/)` on Tag alone, and no Story 7.2 leaf asserts the whole row. So a Publisher chip after Tag keeps them green. The AC-2 Tab-out leaf at `:422` tabs from Language through 4 checkboxes to Tag, which Publisher doesn't change.
- **`catalogFilter.test.ts`** calls `liveFilters(filters, languages, tags)` three times. If the build changes that signature, it updates those calls. `{ ...NO_FILTERS, … }` literals keep compiling once `NO_FILTERS` gains `publishers`.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Unit (`node --test`, `src/lib/catalogFilter.test.ts`), AC-2/AC-5:** `publisherValues()` orders by count descending, then by collator (numeric, for example "Part 2" before "Part 10"). It merges case into the first spelling, counts every spelling, skips a blank value and doesn't mutate its input.
- [ ] **Unit, AC-4/AC-5:** `matchesFilters` with `publishers` ORs within the group, ANDs with the other groups and ignores case. `filtersOn` is true with only a publisher checked.
- [ ] **Unit, AC-6:** `liveFilters` drops a publisher no Book has any more, and returns the same object when everything is live.
- [ ] **E2E, AC-1 axe:** with the Publisher list open, axe finds nothing in light and dark (as `catalog-filter.spec.ts:712` does for Language). Check that the count's `ink-tertiary` on `surface` passes contrast.
- [ ] **E2E, AC-2 dark:** the count is `ink-tertiary-dark` (`#9A9E94`) and the name is `ink-dark`.
- [ ] **E2E, AC-4:** checking a publisher with zero matches under other filters shows "No books match these filters." with the Clear filters link.
- [ ] **E2E, AC-4:** each publisher change announces its count again, even when it is word for word the same (as `catalog-filter.spec.ts:569`).
- [ ] **E2E, AC-8:** Esc after clicks that move no focus works as for Language (Chromium-observable only; AGENTS.md → Supported browser).
- [ ] **E2E, AC-1/AC-2:** a publisher name with an apostrophe or a long name doesn't wrap in its row (`white-space: nowrap`).

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `bookId`, `designColor`, `rgbOf` (library.ts); `bookcase`, `bookRows`, `finished`, `search`, `viewToggle`, `SWING_TIME` (bookcase.ts); `tileNames` (tiles.ts); `ADD_BOOK`, `EDIT_BOOK` (intents.ts). The helpers moved to `catalog-filter.ts` unchanged and weren't probed: `main`, `chipGroup`, `chip`, `clearFilters`, `spineNames`, `checkboxNames`, `anySpine`, `storageKeys`, `addSwingTime` and `SWING`. `languageChip` and `tagChip` are reused through `listChip`, with the same pattern. The API type for `editBook` comes from the generated schema (`components['schemas']['BookDetailView']`).

Helpers added:
- **`catalog-filter.ts`** (a new shared module, since 15.2's spec needs the filter helpers the 7.2 spec kept to itself):
  - `listChip`, `publisherChip`, `listPopup` and the `ListLabel` type: locators for the list chips and their popups.
  - `listNames`: the checkboxes' names from the accessibility tree (`ariaSnapshot`). It opens the popup if needed and returns `[]` when there is no chip. `checkboxNames` reads DOM label text, which misses how a visually hidden noun or an `aria-label` is combined, and it can't open a popup or run before the chip exists.
  - `countLook` (type `CountLook`): the count element's and the row's color and font. No helper reads a row's parts.
- **`intents.ts`:** `editBook`, an edit-book with only `changes` altered, the rest of the form taken from the Book's `editForm`. `attachCover` needs the whole form from the caller and always sends a cover.

Other copies left alone: `catalog-sort.spec.ts:67` and `catalog-tiles-automate.spec.ts:60` keep their own `spineNames`, and `catalog-tiles-automate.spec.ts:95` keeps its own `addSwingTime`. They were outside this story, so they weren't touched. They are candidates for the next helper clean-up.

Shipped numbers:
- AC-1's "at most 320px tall": measured `max-height: 320px` in `FilterChips.module.css` `.popup`, and the app probe read `320px` with `overflow-y: auto` on the Language popup. Asserted as quoted.
- AC-1's and AC-2's `body-sm`: measured `--font-body-sm-size: 14px` and `--font-body-sm-line-height: 1.5` (tokens.css:105, :107). The app probe read 14px and 21px on a Language row. Asserted as 14px and 21px, and also as equal to the Language row.
- AC-1's `ink` and AC-2's `ink-tertiary`: read with `designColor` (`#2B2E2A` and `#666961`), the same as `--color-ink` and `--color-ink-tertiary` in tokens.css:19 and :21. The leaves wrap them in `rgbOf`, because `designColor` returns hex (the app probe showed this, and the leaves were fixed before the red run).
- AC-2's "84, 49, 49 and 1" and AC-8's "Manning 49 books" and "Apress 1 book" describe a seed, not shipped UI. `COUNT_SHELF` gives them exactly, and the app probe read 195 Books with those counts back from `/api/views/catalog`.
- No border or outline width in this story is fractional.

Probes (Chromium, 1280×900, `deviceScaleFactor` 1, light). Commands: `TZ=Europe/Madrid npx playwright test e2e/publisher-helpers.probe.spec.ts` and `e2e/publisher-app.probe.spec.ts`. Both were removed with `rm`.
- **`listNames`**, known good: a `setContent` page whose "Publisher" chip inserts the popup on click. It has rows with a visually hidden noun, an `aria-label`, a count in the row's own text, and a name with `"` in it. The helper clicked the chip and returned exactly `["O'Reilly Media 84 books", 'Manning 49 books', 'Apress 1 book', 'Say "Hi" 2 books']`. It didn't return `'Manning 49'`, and it returned `[]` for an absent chip (Language). On the shipped Catalog it returned `['English', 'German']` for Language, and `[]` for Tag (no tags) and for Publisher (no chip yet).
- **`countLook`**, known good: on the same page, Manning returned row text `Manning 49`, the count `rgb(102, 105, 97)`, 14px, `system-ui` and 21px, and the row `rgb(43, 46, 42)`. The `/^Manning 49(?: |$)/` pattern returned the same. It refused wrong values: a count in the row's own text node returned `count: null`, and a count in another color returned that color (`rgb(1, 2, 3)`). On the shipped Language row it read `ink` 14px/21px. **The probe changed it twice:** RegExp names were added and the NodeList spread became `Array.from` for `tsc`. The probes re-ran after both changes and passed (4 of 4).
- **`editBook`**, known good: on the shipped app it moved Grokking from Manning to No Starch Press, and `/api/views/catalog` read it back. It threw for an unknown Book. In the app probe a second context moved the three Manning Books, and the focus refetch kept 8 spines.
- **The shipped steps the leaves rely on** (app probe): `PUBLISHER_SHELF` sorts as `BY_AUTHOR`. Unread + "in" gave Grokking and DDIA, and "2 books match.". The List rows sort by author. `tileNames` returns "Title by Author, not read yet". The meter read "2 of 7 finished" while Unread was on. Clear filters, a reload and Home and back each reset the chips, and Home's slice showed `BY_AUTHOR`. The add sent exactly `["/api/intents/add-book"]`. Storage changed only by `bookvie.catalogView`, which the probe's own view switching set (AC-7 doesn't switch views). `COUNT_SHELF` with Unread + "ops" + "book 1" gave "3 books match." and book 15 of Manning, O'Reilly Media and Pragmatic Bookshelf. The case seed's `/api/views/catalog` kept "Manning" and "manning" as stored. The probe's first run had a wrong expectation of its own (the List order), not a helper bug.

Render-before-read: every new leaf was checked. AC-1 reads first through a web-first `toHaveText`. Its `countLook` and `evaluate` reads follow `toHaveCount` on the popup's checkboxes and `toHaveCSS`. AC-2's `countLook` reads follow the passed `listNames` poll, and its `checkboxNames` reads are polled. AC-3 waits on `status` and the spine count before its poll. AC-4's `tileNames` is polled. AC-7's `storageKeys` reads follow a polled `BY_AUTHOR` and `toHaveCount(8)`. AC-8's first read is web-first. No leaf needed a fix.

Storage keys: no new localStorage key.

## TDD Red Phase

- 8 e2e leaves, all `test.skip`, one per criterion, each with a `// Red phase:` reason above it. There are no API or unit leaves. The unit tests for `publisherValues()` are green-phase follow-ups, because a test that imports a function that doesn't exist yet would break `tsc -b` even while skipped.
- **Red run** (2026-11-25, after the last probe and the last leaf change): a throwaway un-skipped copy, `e2e/catalog-publisher-filter-red.probe.spec.ts`, removed with `rm`. **8 failed, each at its first assertion:** AC-1 `:183`, AC-2 `:231`, AC-3 `:276` (after its shipped setup passed at `:273`), AC-4 `:288`, AC-5 `:339–341`, AC-6 and AC-7 at `checkPublisher`'s poll `:162`, AC-8 `:463`.
- `git status` lists no `*.probe.*` file and no throwaway copy. It shows `frontend/e2e/catalog-filter.spec.ts` and `frontend/e2e/intents.ts` (modified), and `frontend/e2e/catalog-filter.ts`, `frontend/e2e/catalog-publisher-filter.spec.ts` and this checklist (new).
- `npx prettier --check` is clean on the changed e2e files, and `tsc -b` and `oxlint` (on `e2e/`) are clean. The new spec runs as 8 skipped.

## Next Steps (task-by-task activation)

1. `bmad-build-auto` for 15.2. Remove `test.skip` from one leaf at a time and watch it fail, then pass.
2. Run `npm run check` and the whole e2e suite. The catalog, home-slice and catalog-filter specs must pass unchanged (the epic gate).
3. `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above. Then the Epic 15 retro, since 15.2 closes the epic.

## Implementation Guidance

- **`lib/catalogFilter.ts`:** add `CatalogFilters.publishers`, an entry in `NO_FILTERS`, `FilterableBook.publisher`, the publisher match in `matchesFilters` (case keys, as Language), `publishers` in `filtersOn`, and publishers in `liveFilters`. Add a new `publisherValues()` with the same keying and labelling as `filterValues()`, plus a library count, ordered by count descending and then `collator.compare`.
- **`components/FilterChips.tsx`:** `ListField` gains `'publishers'`. After Tag, add `list('publishers', 'Publisher', publishers)`, whose rows render the count in its own `ink-tertiary` element after the name, one space apart, plus the noun for assistive tech. Language and Tag rows stay as they are.
- **`pages/CatalogPage.tsx`:** build `publishers` from all `books` (never `shown`), and pass it to `liveFilters`, `changeFilters`' announcement and `FilterChips`.
- **No token changes:** `tokens.css` is untouched. Reuse `--color-ink-tertiary`.
