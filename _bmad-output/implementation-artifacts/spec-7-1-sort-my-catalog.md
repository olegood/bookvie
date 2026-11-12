---
title: 'Story 7.1: Sort my catalog'
type: 'feature'
created: '2026-11-12'
baseline_revision: 'a7f8d766a90928b3c1700aaaeea18f0866d6adb7'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-7-1-sort-my-catalog.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, Structural Seed), reconciled before the next epic: the spine doesn't record the four sort keys, the tie-break chain, Home's slice packing rows in the remembered sort, or the catalogSort module.
    evidence: |-
      frontend/src/lib/catalog.ts sortBooks and PRIMARY; frontend/src/lib/catalogSort.ts; frontend/src/pages/HomePage.tsx HomeSlice; ARCHITECTURE-SPINE.md AD-6 names only "catalog sort, using Intl.Collator", and the Seed's frontend/src/lib/ line omits catalogSort (spine check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Catalog has one fixed order (first author, then title), and a tie on both keeps the server's order. Oleg can't arrange the shelf by title, date added or length, and two editions of the same Book have no stable order (FR-20, UX-DR19).

**Approach:** Add a native `select` labeled "Sort" to the Catalog toolbar with Author (default), Title, Date added and Pages. One client-side comparator per key, with the shared tie-breaks title → `createdAt` → id, sorts the array that the bookcase, the List view and Home's slice all render. The choice is remembered in `localStorage` like the Catalog view.

## Boundaries & Constraints

**Always:**
- Client presentation only (AD-6): sort the `books` the catalog and home views already carry (`ShelfBook` has `id`, `title`, `firstAuthor`, `pages`, `createdAt`). No backend, API or schema change.
- Author: `Intl.Collator` on `firstAuthor`, then title. Title: collator A–Z. Date added: newest `createdAt` first. Pages: fewest first. Every key then breaks ties by title (collator), then `createdAt` ascending (older first), then Book id by plain code-unit comparison.
- Compare `createdAt` as instants (`Date.parse`), not as strings, since offsets can differ.
- The select is a native `select` whose accessible name is exactly "Sort", with exactly four options in that order and no empty option. The visible label "Sort" sits to its left in `body-sm`/`ink-secondary`; the select is styled as a Text field (DESIGN.md → Sort select).
- Toolbar order: Search titles, Sort, the Catalog view toggle, New book. Sort shows and hides with Search titles and the toggle (hidden on an empty library).
- Storage: key `bookvie.catalogSort`, values `author` · `title` · `dateAdded` · `pages`, read and written in try/catch; nothing stored, junk or throwing storage gives Author, and a failed write still re-sorts for the visit.
- Search titles keeps its text and filter across a sort change; a sort change alone announces nothing.

**Never:**
- No filter chips, second toolbar row or filter copy (Story 7.2).
- Don't reuse `SelectField` unchanged (it adds an empty first option), and don't change `SelectField`'s behavior for its existing callers.
- Don't widen `NamedSpine`/`ListedBook` in a way that forces `spineName` callers or tests to supply `id`, `pages` or `createdAt`.
- Don't move the slice-priority logic or recompute anything the server owns.
- Restore neither brings nor replaces the stored sort (no Backup change).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same title and createdAt | Two "Dune" editions, ids 4 then 3 in the view | id 3 before id 4 under every key | No error expected |
| Same title, different createdAt | Two "Dune", 2026-01 and 2026-02 | Older first under Author, Title and Pages (Date added still puts the newer first, by its primary key) | No error expected |
| No author | `firstAuthor: ''` under Author | Sorts before named authors (collator on the empty string), then by title | No error expected |
| Stored junk | `bookvie.catalogSort` = `shelves` | Catalog opens on Author | Falls back silently |
| Storage throws | `getItem`/`setItem` throw | Catalog opens on Author; choosing a key still re-sorts | Swallowed in try/catch |

</intent-contract>

## Code Map

- `frontend/src/lib/catalog.ts:6-16` -- `ListedBook {title, firstAuthor}` and `sortBooks(books)`: one Author order, no id tie-break. `NamedSpine extends ListedBook` (line 25) is built by `spineName` tests without `id`/`pages`/`createdAt`, so add a separate `SortableBook extends ListedBook` for the sort.
- `frontend/src/lib/catalog.test.ts:21-47` -- the two existing `sortBooks` cases (collator: `bell hooks`, `Émile Zola`; case-insensitive title tie). Keep them under the Author key; give their fixtures `id`, `pages`, `createdAt`.
- `frontend/src/lib/catalogView.ts` + `catalogView.test.ts` -- the pattern to mirror for the remembered sort (`STORAGE_KEY`, type guard, read/write in try/catch, `withStorage` stub in tests).
- `frontend/src/pages/CatalogPage.tsx:117` -- `sorted = useMemo(() => sortBooks(books), [books])`; line 123 holds `catalogView` state from `readCatalogView`; lines 250-256 are the toolbar (`SearchTitles`, `ViewToggle`, New book); line 136-139 `latest` ref feeds the delayed match count from `sorted` (count is order-independent).
- `frontend/src/pages/HomePage.tsx:67-76` -- `HomeSlice` sorts `view.books` with `sortBooks`; its doc comment says "in Catalog's order (Author)".
- `frontend/src/pages/Bookcase.tsx:153-176` -- roving Tab stop keyed by Book id (`stopId`, falls back to the first id); it already follows whatever order `books` arrives in, so no change is expected.
- `frontend/src/pages/SearchTitles.tsx` + `.module.css` -- label-left layout (`.search` flex row, `.label` body-sm/ink-secondary nowrap) to mirror for Sort.
- `frontend/src/components/TextField.module.css` `.input` -- the Text field look (height, border, radius, focus halo) for the select.
- `frontend/src/components/ViewToggle.tsx` -- placed after Sort in the toolbar; unchanged.
- `frontend/e2e/catalog-sort.spec.ts` -- the four ATDD leaves (`test.skip`), seed `SORT_SHELF`, expected orders `BY_AUTHOR`/`BY_TITLE`/`BY_DATE_ADDED`/`BY_PAGES`.
- `frontend/e2e/bookcase.spec.ts` ('[P1] AC-1 a junk stored view…', '…storage that throws…') -- pattern for the storage-fault e2e leaves.
- `frontend/e2e/catalog-list.spec.ts:130`, `bookcase.spec.ts` AC-5, `home-slice.spec.ts` `expectedSlice` -- assume the default Author order; must still pass unchanged.
- `README.md:8` -- Status line; its Stats sentence ends "…showing when the reading happened." Lines 216-217 hold the Story 6.4 links.
- Deferred-work intake: none name story 7.1 (no open entry names 7.1 or Epic 7 as a whole; the "before Epic 7" lines are `resolved:` lines of closed spine drift).

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/catalogSort.ts` (new) -- export `CatalogSortKey = 'author' | 'title' | 'dateAdded' | 'pages'`, `CATALOG_SORTS` in option order, `CATALOG_SORT_LABELS` (Author, Title, Date added, Pages), `readCatalogSort()` and `writeCatalogSort(key)` under `bookvie.catalogSort`, mirroring `catalogView.ts` -- one home for the remembered choice.
- `frontend/src/lib/catalogSort.test.ts` (new) -- mirror `catalogView.test.ts`: stored key read back; null and junk give `author`; throwing storage gives `author` and the write doesn't throw; writes `['bookvie.catalogSort', 'title']`.
- `frontend/src/lib/catalog.ts` -- add `SortableBook extends ListedBook { id: string; pages: number; createdAt: string }`; change `sortBooks(books, key: CatalogSortKey)` to apply the key's primary comparison, then title (collator), `createdAt` ascending (`Date.parse`), id (`<`/`>`); return a new array; update its doc comment.
- `frontend/src/lib/catalog.test.ts` -- keep the two cases under `'author'`; add: each key's order; each tie-break step alone (title, then `createdAt` older first, then id); Title with lower-case and accented first letters; Pages ties; `firstAuthor: ''` under Author; input not mutated.
- `frontend/src/components/SortSelect.tsx` + `SortSelect.module.css` (new) -- label "Sort" (via `htmlFor`/`useId`) to the left of a native `select` with the four options from `catalogSort.ts`, styled like `TextField.module.css` `.input` with the `.search`-style row; props `value`, `onChange`.
- `frontend/src/pages/CatalogPage.tsx` -- `sortKey` state from `readCatalogSort`; `sorted` memo on `[books, sortKey]`; `chooseSort` sets state and writes; render `<SortSelect>` between `SearchTitles` and `ViewToggle` when not empty.
- `frontend/src/pages/HomePage.tsx` -- `HomeSlice` reads `readCatalogSort()` once (state initializer) and sorts with it; update its doc comment to "in Catalog's remembered sort".
- `frontend/e2e/catalog-sort.spec.ts` -- turn the four `test.skip` leaves into `test`; add `[P1] AC-3` leaves for a junk stored sort (opens on Author) and for storage that throws (opens on Author, choosing Pages still reorders), mirroring `bookcase.spec.ts`'s storage-fault leaves.
- `README.md` -- on the Status line, after the Stats sentence, add that a **Sort** select on Catalog orders the shelf and list by Author, Title, Date added or Pages, remembered on this computer, with Home's slice following it. After line 217, add the Story 7.1 spec link and the ATDD checklist link (`_bmad-output/test-artifacts/atdd-checklist-7-1-sort-my-catalog.md`). Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given a seeded library, when Catalog renders, then a native `select` named "Sort" shows Author, Title, Date added, Pages with Author selected, its "Sort" label is visible, and Tab goes Search titles → Sort → the view toggle's Bookcase button (ATDD AC-1).
- Given `SORT_SHELF`, when each key is chosen, then the spines match `BY_PAGES`, `BY_TITLE`, `BY_DATE_ADDED`, `BY_AUTHOR`; the List rows follow Pages order; and Tab into the bookcase lands on Kindred, ArrowRight on Beloved, End on Emma (ATDD AC-2).
- Given Title was chosen, when Catalog is loaded again and then Home is opened, then Title is checked, the spines are in Title order, and Home's one-row slice shows the five spines in Title order (ATDD AC-3).
- Given "d" in Search titles, when Pages is chosen, then the four matching spines are in Pages order, the field still holds "d" and Emma stays hidden (ATDD AC-4).
- Given junk in `bookvie.catalogSort`, or storage that throws, when Catalog loads, then Author is selected, and with throwing storage choosing Pages still reorders the spines.

### Review Findings

Code review 2026-11-12 (bmad-code-review): 22 raw findings from 5 layers (Blind Hunter, Edge Case Hunter, Verification Gap: none, Acceptance Auditor, Spine Check). After grouping: 1 decision-needed, 1 patch, 1 defer, 16 rejected.

- [x] [Review][Patch] Titles and authors with numbers sort as text — `new Intl.Collator(undefined)` has no `numeric: true`, so "Volume 10" sorts before "Volume 2" under Title, Author and every title tie-break, on Catalog and on Home's slice. Decision (Oleg, 2026-11-12): sort numbers by value — pass `{ numeric: true }` and add a unit case. (blind-hunter) [frontend/src/lib/catalog.ts:20]
- [x] [Review][Patch] README says the sort is "remembered on this computer", but it lives in `localStorage`, so it is per browser (epic context: "Sort is remembered per browser") [README.md:8]
- [x] [Review][Defer] Spine drift (AD-6, Structural Seed): AD-6 records no sort keys, tie-break chain or the Home slice's use of the remembered sort; the Seed's `frontend/src/lib/` line omits `catalogSort` [ARCHITECTURE-SPINE.md AD-6] — deferred: spine drift, reconciled before the next epic; already recorded in `deferred-work.md` by the build-auto review (spine-check)

**Rejected:**
- `low` Home and a remounted Catalog fall back to Author when `setItem` throws, though Catalog re-sorted for the visit (blind-hunter+edge-case-hunter): real, but storage that throws is rare in a local app, the spec's "re-sorts for the visit" holds on Catalog, `catalogView` behaves the same, and the fix adds module-level state.
- `low` A mounted Home or Catalog doesn't follow a sort changed in another tab; Home reads the sort once per mount (edge-case-hunter+acceptance-auditor): the spec task asks for a once-per-mount read; already rejected in the build-auto triage for the same reason (a `storage` listener for a rare case).
- `low` Leading articles ("The", "A") aren't ignored under Title (blind-hunter): the spec says collator A–Z; stripping articles is new, locale-dependent behavior and a spec change.
- `low` An empty author sorts first under Author (blind-hunter): the spec's I/O matrix states this order explicitly; changing it means editing the spec.
- `low` `subtitle` isn't a tie-break (blind-hunter): the spec fixes the tie-break chain (title, `createdAt`, id); adding one means editing the spec.
- `false` `catalogSort.test.ts` would miss a wrong read key (blind-hunter): the e2e AC-3 reload leaf writes through the UI and reads back after a reload, so a read/write key mismatch fails there. With `setItem` throwing, nothing can be written, so the test name holds.
- `low` The Verification section's targeted Playwright command omits `catalog-empty` and `bookcase-details` (blind-hunter): the fix is a spec edit, and `npm run check` ran both.
- `false` The bookcase's roving Tab stop stays on the last-focused Book after a sort change (blind-hunter): keeping the roving stop on the last-focused item is the standard roving-tabindex pattern, and the spec's Code Map says `Bookcase.tsx` needs no change.
- `false` The select has no focus indicator in forced-colors mode (blind-hunter): the select doesn't suppress `outline`, so the global `:focus-visible` ring in `base.css` applies, and its forced-colors rule sets it to `Highlight`.
- `low` The deferred record's `location` names only AD-6, and `deferred-work.md` mentions older Seed drift under the 7.1 heading (blind-hunter): the fix edits the spec's frontmatter; the `deferred-work.md` note is accurate context.
- `false` `CATALOG_SORTS` and `CATALOG_SORT_LABELS` can be mutated at runtime (blind-hunter): no code mutates them, so the harm never happens.
- `false` `bookcase-details.spec.ts` was edited outside the task list (acceptance-auditor): the toolbar-order constraint requires it, and the Auto Run Result records it.
- `low` The storage-fault e2e leaves visit only Catalog, not Home (acceptance-auditor): Home goes through the same unit-tested `readCatalogSort`; it's listed as an automate follow-up.
- `low` Nothing tests "a sort change alone announces nothing" (acceptance-auditor): `chooseSort` calls no `announce`; it's an automate follow-up in the ATDD checklist.
- `false` `SortSelect.module.css` omits `.input`'s `aria-invalid` and `::placeholder` rules (acceptance-auditor): neither applies to a select that has no error state and no placeholder.
- `false` The ascending `byCreatedAt` step after Date added is redundant (acceptance-auditor): it only runs when the primary returns 0, so it never changes the order.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 17 findings — high 0, medium 0, low 13, false 4, maybe-false 0
- findings:
  - `[false]` `[reject]` `byCreatedAt` returns NaN for an unparseable `createdAt`, making the comparator non-transitive (Edge Case Hunter) — `ShelfBook.created_at` is a pydantic `AwareDatetime`, always serialized as an ISO instant with an offset, so `Date.parse` never sees an unparseable value from the view.
  - `[low]` `[reject]` A sort changed in another tab doesn't reach an already-mounted Home or Catalog (Edge Case Hunter) — real, but changing the sort in one tab while another stays open on Home is rare, and the fix adds a `storage` listener (new branch and effect); any remount or reload picks the choice up.
  - `[low]` `[patch]` The empty-library test never asserts that Sort is hidden (Verification Gap) — fixed: `catalog-empty.spec.ts` AC-8 asserts `main` has no `combobox`.
  - `[low]` `[patch]` Home's slice after a client-side nav-link visit is untested; AC-3 only uses full `page.goto` loads (Verification Gap) — fixed: a new `[P1] AC-3` leaf in `catalog-sort.spec.ts` chooses Pages, clicks the nav's Home link and expects the slice in Pages order.
  - `[false]` `[reject]` The toolbar overflows on narrow screens with no `flex-wrap` (Blind Hunter) — DESIGN.md → Viewport is desktop only with a 1024px minimum and horizontal scroll below it; at 1024px the row (about 860px) fits the content width.
  - `[low]` `[reject]` `SortSelect.module.css` copies `TextField.module.css` `.input` (Blind Hunter) — the same copy already exists in `SearchTitles.module.css`, so this follows the codebase's convention; tokens carry the shared values, so a token change reaches both.
  - `[false]` `[reject]` The select lacks native-select styling (appearance, chevron, padding-right) (Blind Hunter) — `appearance` is not reset, so the browser draws its own arrow inside the box; the Catalog axe test in `bookcase-details.spec.ts` passes in both themes with the select present.
  - `[false]` `[reject]` NaN `createdAt` breaks Date added order (Blind Hunter) — same refutation as the Edge Case Hunter row: the view always sends an ISO instant.
  - `[low]` `[reject]` No e2e for a multi-row Home slice under a non-default sort with a Main book, or for Home under junk or throwing storage (Blind Hunter) — the slice packer and priority logic are unchanged and consume the sorted array; both are listed as green-phase follow-ups in the ATDD checklist for `bmad-testarch-automate`.
  - `[low]` `[reject]` No tests for "a sort change announces nothing", add-highlight under a non-Author sort, or List view keyboard under a sort (Blind Hunter) — the sort change calls no `announce`, and the highlight effect is keyed by Book id, not position; these are ATDD-checklist follow-ups for `bmad-testarch-automate`.
  - `[low]` `[reject]` Both pages read the stored sort once per mount (Blind Hunter) — same root as the Edge Case Hunter cross-tab row; rejected for the same reason.
  - `[low]` `[patch]` `catalog.test.ts` hard-codes the key list in its "every key" loops (Blind Hunter) — fixed: the loops iterate `CATALOG_SORTS`.
  - `[low]` `[reject]` No component test for `SortSelect` (Blind Hunter) — the project has no component-test harness (`node --test` covers `lib/` only); the e2e leaves cover the label, the options and the change path.
  - `[low]` `[reject]` README doesn't link `epic-7-context.md` (Blind Hunter) — the README links no epic context after Epic 3, and the spec's README task names only the spec and ATDD links.
  - `[low]` `[reject]` README Status still says "Epics 1-6 are complete (39 of 41 stories done)" (Blind Hunter) — still true; bmad-code-review moves the count when it marks the story done, as the spec's README task says.
  - `[low]` `[defer]` Spine drift (AD-6): the spine doesn't record the four sort keys, the tie-break chain, or that Home's slice packs rows in the remembered Catalog sort (Spine Check) — deferred to the Epic 7 spine reconciliation.
  - `[low]` `[defer]` Spine drift (Structural Seed): the seed's `frontend/src/lib/` line omits `catalogSort` (Spine Check) — grouped with the AD-6 row; deferred to the Epic 7 spine reconciliation.
- Intent Alignment Auditor: descriptive only, no defect claims. It reads the diff as the literal client-side reading. Its coverage notes overlap the Blind Hunter and Verification Gap rows above.

## Verification

**Commands:**
- `cd frontend && node --test src/lib/catalog.test.ts src/lib/catalogSort.test.ts` -- expected: pass.
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-sort.spec.ts e2e/bookcase.spec.ts e2e/catalog-list.spec.ts e2e/home-slice.spec.ts` -- expected: pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:**
- **Catalog:** the toolbar has a native `select` labeled "Sort", between Search titles and the view toggle. It offers Author (default), Title, Date added and Pages, with no empty option, and hides on an empty library like Search titles. The bookcase spines, the List rows and the bookcase keyboard order all follow one sorted array, and Search titles keeps its text and filter across a sort change.
- **Orders:** Author uses `Intl.Collator` on the first author. Title is A–Z with the collator, Date added is newest `createdAt` first, and Pages is fewest first. Every key then breaks ties by title, then `createdAt` older first (compared as instants), then Book id by code unit.
- **Remembered:** the choice is stored in `localStorage` under `bookvie.catalogSort`, read and written in try/catch. Nothing stored, junk or throwing storage gives Author, and a failed write still re-sorts for the visit. Home's slice reads it when it mounts and packs its rows in that order.

**Files changed:**
- `frontend/src/lib/catalogSort.ts` (new): the keys, their labels, `isCatalogSort`, `readCatalogSort` and `writeCatalogSort`.
- `frontend/src/lib/catalogSort.test.ts` (new): stored, missing, junk and throwing storage, and the key written.
- `frontend/src/lib/catalog.ts`: `SortableBook`, and `sortBooks(books, key)` with the per-key order and the shared tie-breaks.
- `frontend/src/lib/catalog.test.ts`: the old cases under Author, plus each key, each tie-break step, mixed offsets, code-unit ids, an empty author and no mutation.
- `frontend/src/components/SortSelect.tsx` and `.module.css` (new): the labeled select, styled as a Text field.
- `frontend/src/pages/CatalogPage.tsx`: the sort state, the memo on `[books, sortKey]`, and the select in the toolbar.
- `frontend/src/pages/HomePage.tsx`: `HomeSlice` sorts with the remembered key.
- `frontend/e2e/catalog-sort.spec.ts`: the four ATDD leaves are on, plus three `[P1] AC-3` leaves: a junk stored sort, storage that throws, and Home reached by the nav link.
- `frontend/e2e/catalog-empty.spec.ts`: AC-8 asserts no `combobox` on an empty library.
- `frontend/e2e/bookcase-details.spec.ts`: the Tab-order test now expects Sort between Search titles and Bookcase. This file is not in the spec's task list, but the spec's toolbar order required the change.
- `README.md`: the Status line and the 7.1 spec and ATDD links. `deferred-work.md`: one spine drift entry. `sprint-status.yaml`: epic-7 → in-progress, 7.1 → review. `epic-7-context.md` (new): the compiled epic context.

**Review:** 17 findings: high 0, medium 0, low 13, false 4, maybe-false 0.
- **Patched:** 3 entries, all low. The empty-library test now checks that Sort is hidden, a new e2e leaf covers Home reached by the nav link, and the unit loops use `CATALOG_SORTS`.
- **Deferred:** 1 entry, spine drift on AD-6 and the Structural Seed (2 rows).
- **Rejected:** 13, each with its reason in the Review Triage Log above:
  - an unparseable `createdAt` (2 rows, false);
  - cross-tab sync and reading the sort once per mount (2 rows);
  - narrow-screen overflow (false);
  - the copied Text field CSS;
  - native-select styling (false);
  - the multi-row Home slice and storage-fault e2e;
  - the announce, highlight and List keyboard tests;
  - a `SortSelect` component test;
  - the README epic-context link;
  - the README Status count.

**Follow-up review recommended:** false. The patched entries were 0 high, 0 medium and 3 low.

**Verification:**
- `node --test src/lib/catalog.test.ts src/lib/catalogSort.test.ts`: 40 pass, before and after the patches.
- `npm run build`, then the targeted Playwright run: 59 passed before the patches (`catalog-sort`, `bookcase`, `catalog-list`, `home-slice` and `bookcase-details`). After them, 55 passed (`catalog-sort`, `catalog-empty`, `bookcase`, `catalog-list` and `home-slice`).
- `TZ=Europe/Madrid npm run check`: exit 0 before the patches (566 e2e) and after them (567 e2e). Backend coverage was 98%.
- Matrix audit: each row has a passing test. The unit tests cover the same-title-and-`createdAt` id tie, the different-`createdAt` tie and the empty author. The e2e leaves cover junk and throwing storage.

**Residual risks:**
- An already-open Home or Catalog doesn't see a sort chosen in another tab until it remounts or reloads.
- Home's slice under a non-default sort with a Main book across several rows, and Home under storage faults, are tested only through the unchanged packer and the unit tests. They are follow-ups for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
