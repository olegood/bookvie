---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-12'
storyId: '7.1'
storyKey: '7-1-sort-my-catalog'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-71-sort-my-catalog'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-1-sort-my-catalog.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-sort.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 7 intro and gate; Story 7.1; Story 7.2 for the boundary)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Sort select, Catalog view toggle, Bookcase ordering, Home slice, Keyboard, Backup page on local preferences)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Catalog layout toolbar row 1, Sort select component)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 client presentation: catalog sort with Intl.Collator; UI preferences in localStorage with try/catch; Title ordering row; FR-20 map row)'
  - '_bmad-output/test-artifacts/test-design-qa.md (ORG-E2E-001)'
  - '_bmad-output/test-artifacts/atdd-checklist-6-4-see-my-reading-month-by-month.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/models.py (ShelfBook: id, title, firstAuthor, pages, createdAt)'
  - 'frontend/src/lib/catalog.ts, catalog.test.ts (sortBooks), catalogView.ts, catalogView.test.ts; src/pages/CatalogPage.tsx, HomePage.tsx, Bookcase.tsx; src/components/ViewToggle.tsx, SelectField.tsx'
  - 'frontend/e2e/bookcase.ts, bookcase.spec.ts, catalog-list.spec.ts, home-slice.spec.ts, fixtures.ts, catalog-pace-calculator.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Catalog toolbar, when it renders, then a native select labeled "Sort" offers Author (default), Title, Date added and Pages (FR-20, UX-DR19)' }
  - { id: AC-2, idSource: generated, text: 'Given a sort key, when it applies, then Author sorts by the first listed author string with Intl.Collator and then by title; Title sorts A–Z; Date added sorts newest first by createdAt; Pages sorts fewest first; and ties always break by title, then by createdAt, then by Book id, so two editions with the same title keep a stable order; and both the bookcase spines and the List view rows reorder, and the bookcase keyboard order follows the new order' }
  - { id: AC-3, idSource: generated, text: 'Given a chosen sort, when I come back later or open Home, then it is remembered in localStorage (try/catch, default Author) and Home''s bookcase slice uses the same order' }
  - { id: AC-4, idSource: generated, text: 'Given Search titles text, when I change the sort, then the search still applies' }
---

# ATDD Checklist: Story 7.1 Sort my catalog

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Story:** `epics.md` Story 7.1 has 4 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-4 in source order (registry above).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments load. Contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`.
- **Epic gate:** Epic 6's before-next-epic items are done in `sprint-status.yaml`: item 52 (spine reconciliation) and item 54 (trace and gate).
- **What exists today:**
  - `lib/catalog.ts` `sortBooks(books)` has one order: first author with `Intl.Collator`, then title. A tie on both keeps the server's order.
  - `CatalogPage` and `HomePage` both call it on the view's `books`.
  - The toolbar has Search titles, the Catalog view toggle and New book, with no Sort.
  - `lib/catalogView.ts` is the pattern for a remembered choice: `bookvie.catalogView`, read and written in try/catch, with junk falling back to the default.
  - `ShelfBook` already carries `id`, `title`, `firstAuthor`, `pages` and `createdAt`. **No backend change is needed** (AD-6: the catalog sort is client presentation).
- **Boundary with Story 7.2:** 7.2 owns the filter chips, the second toolbar row, "N books match." for filters, and focus moving off a filtered-out spine. 7.1 owns the select, the four orders, the remembered key and Home's slice order.

## Generation Mode

**AI generation**, run sequentially in this session, without subagents. There are four criteria. The story is client-only, so there is no API worker, and the select doesn't exist yet, so there is nothing to record. The leaves reuse `bookcase.ts`'s locators and the seed shapes from `home-slice.spec.ts` (stable `bookId(n)`) and `catalog-list.spec.ts` (`createdAt`).

## Test Strategy

There is one red leaf per criterion: 4 in all, all E2E, in a new `frontend/e2e/catalog-sort.spec.ts`. The order, the remembered choice and Home's slice only meet in the browser. The comparator itself is pinned by a unit follow-up below. Secondary branches are recorded under Green-phase follow-ups, not as extra red leaves.

**Seed (`SORT_SHELF`):** each of the four keys orders these five Books differently.

| id | Title | First author | Pages | createdAt | Status |
|---|---|---|---|---|---|
| 1 | Kindred | Octavia E. Butler | 286 | 2026-01-10 | not read yet |
| 2 | Emma | Jane Austen | 474 | 2026-03-01 | not read yet |
| 4 | Dune | Frank Herbert | 412 | 2026-02-01 09:00 | finished |
| 3 | Dune | Frank Herbert | 412 | 2026-02-01 09:00 | not read yet |
| 5 | Beloved | Toni Morrison | 324 | 2026-04-15 | not read yet |

The two Dune editions tie on everything but the id. Id 3 must come before id 4 under every key. They are seeded id 4 first, so an order that keeps the stored order (today's `sortBooks`) fails. Their statuses differ, so the two spine names can be told apart.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P1 | **The `Sort` combobox in `main` has exactly the options Author · Title · Date added · Pages**, with no empty first option. Then the checked option is Author, the element is a `SELECT`, the label "Sort" is visible, and the Tab order goes Search titles → Sort → the view toggle's Bookcase button. | The control, its label and its place in the toolbar exist only in the browser |
| AC-2 | E2E | P0 | **After choosing Pages, the spine names are Kindred, Beloved, Dune (not read yet), Dune (finished), Emma.** Then Title, Date added and Author each give their order. In List view under Pages, the rows follow the same order. Back in Bookcase, Tab lands on Kindred, ArrowRight moves to Beloved, and End moves to Emma. | The criterion is that both views and the keyboard reorder. ORG-E2E-001 |
| AC-3 | E2E | P1 | **After choosing Title and loading Catalog again, the checked option is Title.** Then the spines are in Title order. On Home, the slice is "Bookcase slice, 1 row" with the same five spines in Title order. | Remembering across loads and the Home slice are browser behaviour |
| AC-4 | E2E | P1 | **With "d" in Search titles, after choosing Pages, the spines are Kindred, Beloved, Dune (not read yet), Dune (finished).** Then Search titles still holds "d", and Emma's spine stays hidden. | Search and sort are combined in `CatalogPage` |

**Red today** (each leaf was un-skipped in a throwaway copy, run, and the copy deleted):
- **AC-1** fails at its first assertion. `toHaveText` on the options times out, because there is no `Sort` combobox.
- **AC-2 and AC-3** fail at `selectOption`, the transition that each criterion's journey starts with, because there is no `Sort` combobox. No assertion runs before it.
- **AC-4**'s unasserted setup passes: the seed loads, and "d" leaves 4 spines. It then fails at `selectOption`, for the same reason.

Every seed loaded and every server started cleanly, so no leaf fails for a seed error.

**What the leaves pin (the contract for the build):**
- **The control:** a native `select` whose accessible name is exactly **Sort**, inside `main`. It has exactly four options, labeled **Author**, **Title**, **Date added** and **Pages**, in that order. Author is selected by default. `SelectField` as it stands adds an empty first option, so the build must not use it unchanged.
- **The label:** the word **Sort** is visible as text in `main`.
- **Tab order:** Search titles, then Sort, then the Catalog view toggle.
- **The four orders:**
  - **Author:** `Intl.Collator` on `firstAuthor`, then title.
  - **Title:** A–Z with the collator.
  - **Date added:** newest `createdAt` first.
  - **Pages:** fewest first.
  - **Ties:** every key breaks ties by title, then `createdAt`, then Book id. With equal titles and `createdAt`, the lower id comes first.
- **Both views:** the bookcase spines and the List view rows use one sorted array. The bookcase's roving keyboard order (Arrow keys, Home and End) follows it.
- **Remembering:** the choice survives a fresh page load.
- **Home:** Home's slice uses the same order. With no Main book and one row, the slice's spines are in the chosen sort's order.
- **Search:** changing the sort keeps the Search titles text, and its filter still applies.

**Open for the build (not pinned):**
- The option `value` strings. The leaves select by label.
- The `localStorage` key and stored values. The follow-ups suggest `bookvie.catalogSort` next to `bookvie.catalogView`.
- **The direction of the `createdAt` tie-break.** Ascending, so the older edition comes first, is the natural reading of "keep a stable order". The unit follow-up pins whichever the build picks. The E2E leaf only reaches the id tie.
- Whether Sort shows on an empty library. Search titles and the view toggle hide then.
- How `sortBooks` takes the key, for example `sortBooks(books, key)` or one comparator per key.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Unit, the comparator (`lib/catalog.test.ts`):**
  - Each key's order.
  - Each tie-break step on its own: equal first author, then equal title, then equal `createdAt`, then the id. Pin the `createdAt` direction here.
  - The collator cases the existing `sortBooks` tests cover (`bell hooks`, `Émile Zola`), kept under Author.
  - Title with a leading lower-case letter or an accent.
  - Pages ties.
  - A Book with no author (`firstAuthor: ''`) under Author.
  - The function doesn't mutate its input.
- [ ] **Unit, storage (`lib/catalogSort.test.ts` or similar, mirroring `catalogView.test.ts`):** a stored key is read back. Nothing stored, or junk, gives Author. Storage that throws gives Author, and a write doesn't throw. The key and value are written as the build chooses.
- [ ] **E2E, AC-3 storage faults:** a junk stored sort opens Author. With storage that throws, Catalog opens in Author and the select still reorders the shelf for the visit (mirror `bookcase.spec.ts` '[P1] AC-1 a junk stored view…' and '…storage that throws…').
- [ ] **E2E, AC-3 Home with a Main book:** the slice's chosen rows are in the remembered sort's bookcase order, and the Main book's row stays first. Needs a library over 3 rows (`home-slice.spec.ts`'s `bigShelf`). Pick a sort that moves the Main book to another row.
- [ ] **E2E, AC-2 focus across a sort change:** the focused spine keeps focus, or the Tab stop stays on that Book, when the order changes. EXPERIENCE.md says nothing explicit, so pin what the build does.
- [ ] **E2E, after an add:** the new spine is scrolled into view and ringed at its place in the current sort (EXPERIENCE.md → Highlight after add). For example, under Date added the new Book is first.
- [ ] **E2E, AC-4 in List view:** the search still applies after a sort change, and the "N books match." count is not announced again for a sort change alone.
- [ ] **E2E, the Sort select's look:** it is styled as a Text field, with the label to its left in `body-sm`/`ink-secondary` (DESIGN.md → Sort select). Check axe on Catalog in both themes; extend an existing Catalog axe test.
- [ ] **Backup:** the sort is a local preference, so restore neither brings nor replaces it (EXPERIENCE.md → Backup page). A restore leaves the stored sort in place.

## Existing tests the build must update

- `frontend/src/lib/catalog.test.ts:21` `sortBooks` takes one argument. If the signature changes, keep its two cases under the Author key.
- `frontend/e2e/catalog-list.spec.ts:130` checks that Search titles is the first control after the nav. It stays true as long as Sort comes after Search titles.
- `frontend/e2e/bookcase.spec.ts` AC-5 ("named list in sort order") and `catalog-list.spec.ts` AC-9 assert the default Author order. They should pass unchanged. A seed in either with two Books that tie on author and title would now order by `createdAt`, then id.
- `home-slice.spec.ts` `expectedSlice` computes the slice from Author order (`shelfOf`, one author, titles in order). It is unaffected while the default stays Author.

## TDD Red Phase (current)

There is one skipped leaf per criterion, 4 in all, in `frontend/e2e/catalog-sort.spec.ts`, inside the `Story 7.1 Sort my catalog (ATDD)` describe. Each is a `test.skip(`, and each title carries exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `catalog-sort.spec.ts:71` the Catalog toolbar has a native select labeled "Sort" offering Author (default), Title, Date added and Pages | P1 |
| AC-2 | `catalog-sort.spec.ts:93` each sort key reorders the bookcase spines and the List rows, ties break by title, createdAt, then id, and the keyboard follows | P0 |
| AC-3 | `catalog-sort.spec.ts:127` the chosen sort is remembered on the next visit and Home's slice uses the same order | P1 |
| AC-4 | `catalog-sort.spec.ts:147` Search titles still applies after the sort changes | P1 |

**Skipped as committed** (re-run in this session):
- `TZ=Europe/Madrid npx playwright test e2e/catalog-sort.spec.ts` gives 4 skipped.
- Prettier `format:check` and `tsc -b` are clean, and oxlint reports nothing for `catalog-sort.spec.ts`.

## Data Factories, Fixtures and Mocks

- **No new factory or fixture.** The leaves use `seededServer`, and `bookcase.ts`'s `bookcase`, `bookRows`, `search`, `viewToggle`, `tabIntoBookcase` and `finished`.
- **New helpers, local to the spec:**
  - `bookId(n)`, the same as `home-slice.spec.ts`'s.
  - `sortSelect`.
  - `spineNames`, the visible spines' `aria-label`s in DOM order.
  - `homeSlice`.
  - `SORT_SHELF`, the seed, with the four expected orders.
- **No mocks:** every leaf runs against the real server.
- **No `data-testid`:** the leaves locate elements by role, accessible name and label.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass. Run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-sort.spec.ts`.

### AC-2: the four orders
- [ ] In `lib/catalog.ts`, give the sort a key (Author, Title, Date added, Pages), with the tie-breaks title, then `createdAt`, then id. Widen `ListedBook` with `id`, `pages` and `createdAt`.
- [ ] Add the unit cases above to `catalog.test.ts`.
- [ ] Activate AC-2.

### AC-1: the select
- [ ] Add the Sort select to the Catalog toolbar, between Search titles and the view toggle, with a visible "Sort" label to its left and no empty option. Hide it with the other controls on an empty library, if the build decides to.
- [ ] Activate AC-1.

### AC-3: remember it and share it with Home
- [ ] Add a `catalogView.ts`-style module to read and write the key in `localStorage` inside try/catch, defaulting to Author.
- [ ] `CatalogPage` starts from the stored key, and `HomePage` sorts `view.books` with it.
- [ ] Activate AC-3.

### AC-4: search with sort
- [ ] Keep `query` across a sort change. `Bookcase` and `CatalogList` keep filtering the sorted array.
- [ ] Activate AC-4.

## Completion

- **Test files:** `frontend/e2e/catalog-sort.spec.ts` (new, 4 skipped leaves).
- **Checklist:** this file. **Story key:** `7-1-sort-my-catalog`. **Story:** `epics.md` Story 7.1. There is no spec file yet, and `sprint-status.yaml` still reads `backlog`.
- **Next:** `bmad-build-auto` for story 7.1 (AGENTS.md "Story pipeline"). Its build turns these leaves on. Then come `bmad-code-review` in a new session and `bmad-testarch-automate`.
