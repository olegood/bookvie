---
title: 'Story 7.2: Filter my catalog'
type: 'feature'
created: '2026-11-12'
baseline_revision: 'a63cd010218ea9235a72e25b2066c76706bc612b'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-7-2-filter-my-catalog.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, Structural Seed), reconciled before the next epic: the spine doesn't record the filter chips' rules, the client-side Language and Tag value lists with their case key, or the catalogFilter and FilterChips modules.
    evidence: |-
      frontend/src/lib/catalogFilter.ts (filterKey with toLocaleLowerCase, filterValues, matchesFilters, liveFilters); frontend/src/components/FilterChips.tsx; ARCHITECTURE-SPINE.md AD-6 says only "filter chips;", and the Seed's frontend/src/lib/ line omits catalogFilter. The client's case key differs from merge_tags' casefold for the Tag list (spine check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Catalog can be searched by title and sorted, but Oleg can't narrow it to read or unread Books, a type, a language or a tag, so finding the right Book for the moment still means scanning the whole shelf (FR-20, UX-DR20).

**Approach:** Add the catalog view's `type`, `language` and `tags` to each `ShelfBook`. On Catalog, a second toolbar row of filter chips (Status, Type, Language ▾, Tag ▾) and a "Clear filters" link narrow the sorted array the bookcase and the List view already render. The filters live in `CatalogPage` state only, combine OR within a group and AND across groups and with Search titles, and hide non-matching Books exactly as Search titles does.

## Boundaries & Constraints

**Always:**
- Backend: `ShelfBook` gains `type` (`paperback` · `hardcover` · `ebook`), `language` and `tags`, copied as stored. No new intent, no stored-data change, no server-side filtering (AD-6). Regenerate `schema.d.ts`.
- Status: **Read** is `finished`, **Unread** is `!finished` (a re-read finished Book is Read). Type matches `book.type`. Language and Tag values are matched ignoring case (`toLocaleLowerCase` key); a Book with no tags never matches a Tag filter. An empty group is no constraint.
- Language ▾ and Tag ▾ list each value that exists in the catalog view's Books once, ignoring case and keeping the first spelling in view (library) order, sorted with the Catalog's `Intl.Collator`. A checked value that no Book has any more (after a refetch) is ignored by matching and by the chip count.
- Chip markup: `role="group"` named by its visible label (**Status**, **Type**, in `meta`/`ink-tertiary`), each chip a `button` with `aria-pressed`. Language and Tag are `button`s with `aria-pressed` (true while ≥1 value is checked) and `aria-expanded`/`aria-controls`; their visible text is "Language ▾" / "Tag ▾", or "Language: N" / "Tag: N" with N values checked (the ▾ is `aria-hidden`). The popup is a small `surface` list of native checkboxes, each labeled by its value, rendered right after its chip; it closes on Esc (focus back to the chip) and when focus leaves chip + popup. Only one popup is open at a time.
- Look (DESIGN.md → Filter chips, `components.chip`): `surface-inset` fill, 1px `input-border`, `rounded.full`, `meta` text, 28px high. Selected: `accent-soft` fill, 2px `accent` border on every side (padding reduced by 1px, so nothing shifts), and a leading ✓ drawn with `::before { content: '✓' / '' }` so it stays out of the accessible name and `textContent`. Forced colors keep a visible selected indicator.
- Row 2 sits below row 1 (Search titles, Sort, view toggle, New book, unchanged) and holds Status, Type, Language ▾, Tag ▾, then **Clear filters** (a `button` with the global `linkButton` look) only while any filter is on. Row 2 hides on an empty library, like row 1's tools.
- After each filter change (chip, checkbox, Clear filters) cancel a pending search count and `announce('status', matchCountCopy(n))`, where n counts Books passing the search AND the filters. The search's delayed count also counts with the filters.
- Bookcase and List view show only Books passing search AND filters (`hidden`, the shelf closes up); the bookcase's Tab stop and real-focus fallback (`nearestVisible`, else Search titles) run on that combined visibility. The bookcase list's name keeps counting every Book.
- No match: when the search alone matches nothing, keep `No titles match “…”.`; otherwise, with nothing shown, the shelf area shows "No books match these filters." followed by a **Clear filters** `linkButton` (in both views).
- Clear filters (either one) turns every chip and checked value off, leaves Search titles' text alone, and moves focus to the **Read** chip (the clicked link disappears).
- Filters are not remembered: plain `CatalogPage` state, never storage; leaving Catalog or reloading turns them off. Home's slice and the library meter never read them.
- `onSaved` (an add) clears the filters along with the search, before the new spine is focused and announced.

**Never:**
- No change to Home, `useSliceRows`, the meter, the sort, or `SelectField`; no filter key in `localStorage`/`sessionStorage`.
- Don't reorder row 1 or put anything between "How long until…?" and the bookcase (`tabIntoBookcase` relies on it).
- Don't put the ✓ in the chip's text or name; don't dim non-matching Books.
- No new dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OR within a group | Paperback + Ebook on | Paperback or ebook Books | No error expected |
| AND across groups | + Unread | Only unread paperbacks/ebooks | No error expected |
| Case-merged values | Tags "Classic" (first) and "classic" | One value "Classic"; checking it matches both Books | No error expected |
| Stale checked value | "Polish" checked, then its only Book's language edited elsewhere and the view refetches | "Polish" ignored: no constraint from Language, chip reads "Language ▾" | No error expected |
| Re-read | Finished Book being re-read | Matches Read, not Unread | No error expected |
| No tags | Book with `tags: []`, any Tag checked | Hidden | No error expected |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:24-50` -- `ShelfBook`: add `type: Literal["paperback","hardcover","ebook"]`, `language: str`, `tags: list[str]` (mirror `BookDetailView` lines 237-242). Shared by the catalog and home views.
- `backend/bookvie/views/shelf.py:50-73` -- `_shelf_book`: fill them from `book.type`, `book.language`, `list(book.tags)`. `catalog()` (83-97) is otherwise unchanged.
- `backend/tests/test_bookcase_view.py` -- pattern for a catalog-view pytest (`library_builder.book(...)`, `api_client(...).get("/api/views/catalog")`). The builder accepts `type`, `language`, `tags`.
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen`; never hand-edit or format. `frontend/src/api/index.ts:88` exports `ShelfBook`.
- `frontend/src/lib/catalog.ts:21` -- the numeric `collator` (export it for the value lists); `matchesTitle` (51), `matchCountCopy` (142), `noMatchCopy` (147).
- `frontend/src/pages/CatalogPage.tsx` -- `sorted` (121), `query` (126), `latest` ref + `search` count timer (140-143, 220-229), `onSaved` (237-243), toolbar (260-267), `Bookcase`/`CatalogList` props (274-282), `searchRef`.
- `frontend/src/pages/Bookcase.tsx` -- Catalog props take `query` (41) and compute `visibleIds` with `matchesTitle` (157-160); no-match `<p>` (334). Tab stop via `nearestVisible` (169-176) and real-focus fallback (184-190) already follow `visible`.
- `frontend/src/pages/CatalogList.tsx:25-45` -- `matches`/`hidden` by `matchesTitle`; no-match `<p>` (28).
- `frontend/src/pages/CatalogPage.module.css` -- `.toolbar` flex row; `.page` column gap.
- `frontend/src/components/TagsCombobox.module.css` `.list` -- the `surface` popup look (hairline `line` border, `radius-lg`, `shadow-overlay`, `z-index: 1`) to mirror; `frontend/src/styles/base.css:62` `.linkButton`.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html` `.tb2`, `.cg`, `.chip`, `.chip.on` -- reference chip CSS (gap 6px within a group, 22px between groups).
- `frontend/e2e/catalog-filter.spec.ts` -- the 8 ATDD leaves (`test.skip`) and the contract they pin (see the ATDD checklist's "What the leaves pin").
- `frontend/e2e/catalog-sort.spec.ts` AC-1, `catalog-list.spec.ts:130`, `bookcase-details.spec.ts` (Tab order, axe on Catalog), `catalog-empty.spec.ts` -- must stay green.
- `README.md:8` Status line ends "…and Home's bookcase slice follows it."; lines 218-219 hold the 7.1 links.
- Deferred-work intake: none name story 7.2 (no open entry names 7.2; Epic 7 has no epic-wide entry and 7.2 isn't its first story).

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- add and fill `type`, `language`, `tags` on `ShelfBook`.
- `backend/tests/test_bookcase_view.py` -- add a test: each catalog `books[]` entry carries `type`, `language` and `tags` as stored (one Book with two tags, one with none).
- `frontend/src/api/generated/schema.d.ts` -- regenerate (`api:gen`).
- `frontend/src/lib/catalogFilter.ts` (new) -- `CatalogFilters` (`status: ('read'|'unread')[]`, `types`, `languages`, `tags` as case keys), `NO_FILTERS`, `filterKey`, `filterValues(values)` (distinct ignoring case, first spelling, collator order), `matchesFilters(book, filters)`, `filtersOn(filters)`, `toggleValue(list, value)`, and a helper that drops checked Language/Tag keys absent from the current values -- one pure home for the rules.
- `frontend/src/lib/catalogFilter.test.ts` (new) -- the I/O matrix rows plus: empty filters match all; Read/Unread both on match all; value lists sorted with the collator; no input mutation.
- `frontend/src/components/FilterChips.tsx` + `FilterChips.module.css` (new) -- toolbar row 2 as specified (groups, chips, Language/Tag popups with checkboxes, Clear filters), props: the filters, the Language and Tag values, `onChange`, `onClear`, and a ref for the Read chip.
- `frontend/src/pages/Bookcase.tsx`, `frontend/src/pages/CatalogList.tsx` -- replace the Catalog `query` prop with the set of shown Book ids plus the no-match content, so visibility, the Tab stop, the focus fallback and the empty line come from CatalogPage's combined search + filters.
- `frontend/src/pages/CatalogPage.tsx` -- filters state; the value lists from `view.data.books`; the shown-id set (memoized) from search AND filters; announce on filter changes; search count with filters; Clear filters focusing the Read chip; `onSaved` clearing filters; render `FilterChips` below the toolbar when not empty; the no-match content per the Always rules.
- `frontend/e2e/catalog-filter.spec.ts` -- turn the 8 `test.skip` into `test`; add a P1 leaf for a search-only no-match keeping `No titles match “…”.` while a filter is on and a P1 leaf that Esc closes the Language list and returns focus to its chip.
- `README.md` -- Status line: after the Sort sentence, add that filter chips on Catalog narrow the shelf and the list to Read or Unread, a type, languages or tags, with Clear filters, and that filters reset when you leave Catalog. After line 219 add the Story 7.2 spec link and the ATDD checklist link (`_bmad-output/test-artifacts/atdd-checklist-7-2-filter-my-catalog.md`). Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given `FILTER_SHELF`, when Catalog renders, then the Status and Type groups and the Language ▾ and Tag ▾ chips sit in row 2, unpressed, and a pressed chip shows the `accent-soft` fill, a 2px `accent` border and a ✓ outside its name (ATDD AC-1).
- Given Language ▾ / Tag ▾ is opened, then its checkboxes are English, French, German, Polish / classic, novel, stories, and two checked values make the chip read "Language: 2" (ATDD AC-2).
- Given chips and Search titles together, then OR within, AND across apply in the bookcase and the List view, and `status` reads "N books match." / "1 book matches." (ATDD AC-3).
- Given any filter on, then Clear filters is the Tab stop after Tag ▾, and activating it restores every Book and unpresses every chip (ATDD AC-4); given filters matching nothing, then "No books match these filters." shows with a second Clear filters (ATDD AC-5).
- Given Flights focused and Tag "novel" checked, when tabbing into the bookcase, then Emma is focused (ATDD AC-6).
- Given a filter on, when leaving Catalog and coming back, then no filter is on, and the meter and Home's slice ignore filters (ATDD AC-7).
- Given Read on, when Swing Time (unread) is added, then Read is unpressed, the new spine is focused and "Added Swing Time." is announced (ATDD AC-8).
- Given text in Search titles that matches no title, with a filter on, then `No titles match “…”.` shows, not the filters line.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 26 findings — high 2, medium 0, low 21, false 3, maybe-false 0
- findings:
  - `[high]` `[patch]` A mouse press on a Language/Tag value's label text closes the popup before the click lands, so the value isn't checked (Edge Case Hunter) — confirmed with a Playwright probe (chip stayed "Language ▾", 0 checkboxes). Fixed in `ValueList`: a document `pointerdown` outside the chip and popup closes it, blur closes only for an Element `relatedTarget` outside, and the popup's `mousedown` (except on the checkbox) is prevented so focus doesn't jump to `main`. New P1 leaf clicks the label text and then the `h1`.
  - `[low]` `[patch]` In macOS Safari, where a click doesn't focus a button, an outside click never closes the popup (Edge Case Hunter) — same root cause as the row above (closing relied on focus); fixed by the same `pointerdown` listener.
  - `[low]` `[reject]` Tag ▾ opens an empty popup when the library has no tags (Edge Case Hunter) — real, but the cataloging skill tags every Book `added-by-skill`, so an all-untagged library is unlikely; the fix needs new copy or a hide rule.
  - `[low]` `[reject]` A stale checked value stays in `rawFilters` and turns back on if a later refetch brings the value back (Edge Case Hunter) — needs two edits elsewhere while Catalog stays mounted; leaving Catalog resets filters; the fix adds an effect.
  - `[low]` `[reject]` The client's `toLocaleLowerCase` key merges fewer spellings than the server's `casefold` (ß/SS) (Edge Case Hunter) — real for that rare pair only; the spine-record part is deferred with the spine-check rows.
  - `[low]` `[reject]` Clearing Search titles to blank while filters are on announces nothing (Edge Case Hunter) — matches the existing search behavior (a cleared search never announced); the fix adds a branch.
  - `[low]` `[reject]` Language/Tag chips carry both `aria-pressed` and `aria-expanded` (Blind Hunter) — the epic AC says every chip is a toggle with `aria-pressed`, and the mockup marks them so; `aria-expanded` is needed for the popup.
  - `[high]` `[patch]` The popup can close before a checkbox click lands in Safari/Firefox (Blind Hunter) — same defect as the first row (it happens in Chromium too); fixed there.
  - `[low]` `[reject]` A stale value comes back silently (Blind Hunter) — same as the Edge Case Hunter row; rejected for the same reason.
  - `[low]` `[patch]` Test gaps: stale value e2e, List-view Clear filters, focus leaving closes the popup, one popup at a time (Blind Hunter) — List-view no-match leaf and the outside-click close leaf added; "one popup" is already pinned by AC-2's `checkboxNames` over the whole page; the stale e2e is rejected (see the Verification Gap row).
  - `[false]` `[reject]` `content: '✓' / ''` has no fallback (Blind Hunter) — every current desktop browser supports the alt-text syntax (Chromium, Safari 17.4+, Firefox 128+), and the build keeps it (`content: '✓' / ''` in the built CSS).
  - `[low]` `[reject]` `spine-popover.spec.ts` moved its outside-click target to the legend; the popover now covers the heading (Blind Hunter) — the popover is anchored above its spine by design and row 2 moved the shelf; the new target is less tidy but stable.
  - `[low]` `[reject]` The spec's Verification commands omit `test_views.py` and `spine-popover.spec.ts` (Blind Hunter) — the fix edits the spec; `npm run check` ran both (584 e2e passed).
  - `[low]` `[patch]` One docstring after `tags` documents only `tags` (Blind Hunter) — `type`, `language` and `tags` each have their own docstring now.
  - `[low]` `[patch]` `BookType` re-declares the generated union by hand (Blind Hunter) — now `ShelfBook['type']` (type-only import).
  - `[low]` `[reject]` `filterKey` doesn't NFC-normalize, trim or fix the locale (Blind Hunter) — fields are trimmed on entry and the app runs in one user's locale; duplicates would need mixed normalization forms.
  - `[low]` `[reject]` The popup has no `max-width` (Blind Hunter) — DESIGN.md → Viewport is desktop only (1024px minimum); tags are short words.
  - `[false]` `[reject]` With every spine filtered out, focus should go to the shelf's Clear filters, not Search titles (Blind Hunter) — the epic AC says "or to Search titles when none remain".
  - `[low]` `[reject]` Spec line numbers are already stale (Blind Hunter) — the fix edits the spec.
  - `[low]` `[patch]` Missing blank line after the AC-8 leaf; new leaves reuse AC numbers without a checklist update (Blind Hunter) — blank line added; the checklist is the ATDD step's artifact, and automate updates it.
  - `[low]` `[patch]` Clear filters' focus to Read, kept search and announcement are unasserted (Verification Gap) — AC-4 now fills "e", then asserts Read focused, the search still "e" and `status` "5 books match.".
  - `[low]` `[patch]` The List view's filters no-match line and link are untested (Verification Gap) — new List-view AC-5 leaf: the line, two Clear filters, six rows back.
  - `[low]` `[reject]` `CatalogPage`'s use of `liveFilters` after a refetch is untested end to end (Verification Gap) — needs an out-of-band edit plus a forced refetch while Catalog stays mounted; the helper is unit-tested and the call site is one line.
  - `[low]` `[defer]` The client rebuilds the Tag list with its own case rule instead of the view's `merge_tags` list, and AD-6 doesn't record it (Spine Check) — spine drift, deferred to the Epic 7 spine reconciliation; the behavior part is the rejected casefold row above.
  - `[low]` `[defer]` AD-6 and the Structural Seed don't record `catalogFilter`/`FilterChips` or the filter rules (Spine Check) — spine drift, grouped with the row above.
  - `[false]` `[reject]` `schema.d.ts` is missing, so `check:api` would fail (Spine Check) — the generated file was left out of the review diff on purpose; it is regenerated in the tree and `check:api` passed.
- Intent Alignment Auditor: descriptive only. It reads the diff as the epic's UI reading, verified in the browser; it notes the focus AC is pinned as the bookcase's Tab stop (live focus sits on a chip when filters change) and the spec-level choices (Clear filters focuses Read and keeps the search; an add always clears filters).

## Design Notes

- **Open choices from the ATDD checklist, resolved:** chips hide on an empty library; Clear filters doesn't clear the search (it isn't a filter); the bookcase name keeps counting every Book (as during a search); an add always clears the filters, as it already always clears the search (epic context: "Adding a Book that the current search or filters would hide clears them first" — the new Book's fields aren't on the client until the refetch); Language/Tag chips carry both `aria-pressed` (the AC and the mockup) and `aria-expanded` (the popup).
- Shown ids as one memoized `Set` passed down keeps a single source of visibility for both views and for the Tab-stop logic, instead of each view re-deriving search + filters.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_bookcase_view.py tests/test_contract.py` -- expected: pass.
- `cd frontend && node --test src/lib/catalogFilter.test.ts src/lib/catalog.test.ts` -- expected: pass.
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-filter.spec.ts e2e/catalog-sort.spec.ts e2e/bookcase.spec.ts e2e/catalog-list.spec.ts e2e/catalog-empty.spec.ts e2e/bookcase-details.spec.ts` -- expected: pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:**
- **Backend:** the catalog (and home) view's `ShelfBook` carries `type`, `language` and `tags` as stored. No new intent, no server-side filtering.
- **Catalog row 2:** Status (Read, Unread) and Type (Paperback, Hardcover, Ebook) chip groups, then Language ▾ and Tag ▾ with checkbox lists of the library's values (merged ignoring case, collator order), then Clear filters while any filter is on. Selected chips show the `accent-soft` fill, a 2px `accent` border and a ✓ outside the name.
- **Filtering:** OR within a group, AND across groups and with Search titles, in both views; non-matching Books are hidden and the shelf closes up. Each filter change announces "N books match.", and the search count counts with the filters. No match shows "No books match these filters." with a Clear filters link (the search's own line stays when the search alone matches nothing). Clear filters keeps the search and focuses Read. The bookcase Tab stop follows the combined visibility. Filters are page state only, so leaving Catalog resets them; an add clears them; Home and the meter ignore them.

**Files changed:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py`: the three `ShelfBook` fields.
- `backend/tests/test_bookcase_view.py`: the fields as stored. `backend/tests/test_views.py`: the seeded payloads gain them.
- `frontend/src/api/generated/schema.d.ts`: regenerated.
- `frontend/src/lib/catalogFilter.ts` + `.test.ts` (new): the filter rules and their unit tests. `frontend/src/lib/catalog.ts`: exports `collator`.
- `frontend/src/components/FilterChips.tsx` + `.module.css` (new): toolbar row 2.
- `frontend/src/pages/CatalogPage.tsx`: filters state, shown ids, announcements, Clear filters, no-match content. `Bookcase.tsx`, `CatalogList.tsx`: take `shown` and `noMatch` instead of `query`.
- `frontend/e2e/catalog-filter.spec.ts`: the 8 ATDD leaves on, plus 4 P1 leaves (search-only no-match, Esc, label-text click and outside click, List-view no-match). `bookcase-details.spec.ts`: Tab order through the chips. `spine-popover.spec.ts`: outside-click target moved to the legend (row 2 moved the shelf, so the popover covers the heading). Neither file is in the spec's task list; the new row required both.
- `README.md`: Status line and the 7.2 links. `deferred-work.md`: one spine drift entry. `sprint-status.yaml`: 7.2 → review.

**Review:** 26 findings: high 2, medium 0, low 21, false 3, maybe-false 0.
- **Patched:** 5 entries — 1 high (popup closing: label-text clicks and Safari outside clicks, 3 rows), 4 low (List-view and close tests; Clear filters assertions; docstrings; `BookType` from the schema; blank line).
- **Deferred:** 1 entry, spine drift on AD-6 and the Seed (2 rows).
- **Rejected:** 16, each with its reason in the Review Triage Log: the empty Tag list; stale values returning (2); the casefold case key; no announce on a cleared search; `aria-pressed` with `aria-expanded`; the `::before` fallback (false); the spine-popover target; the spec's Verification list; NFC/locale keys; popup width; focus fallback to Search titles (false); stale spec line numbers; the stale-value e2e; `schema.d.ts` (false).

**Follow-up review recommended:** true. The patched entries were 1 high and 4 low. Unverified risk: the popup's new closing logic (document `pointerdown`, blur on an Element only, `mousedown` prevented inside the popup) was only exercised in Chromium; WebKit/Firefox mouse focus behavior was not run.

**Verification:**
- Before the patches: pytest 36 passed; `node --test` 52 passed; targeted Playwright (incl. `spine-popover`) 77 passed; `TZ=Europe/Madrid npm run check` exit 0 (582 e2e).
- After the patches: pytest (`test_bookcase_view`, `test_contract`, `test_views`) 61 passed; `node --test` 52 passed; `TZ=Europe/Madrid npm run check` exit 0 (584 e2e, smoke ok).
- Matrix audit: every I/O row has a passing unit test in `catalogFilter.test.ts` (OR, AND, case-merged values and matching, `liveFilters` for the stale value, re-read as Read, no tags).

**Residual risks:**
- Popup mouse behavior outside Chromium (see above).
- A stale checked Language/Tag value can turn back on if a later refetch restores it while Catalog stays mounted.
- The Tag list's case key (`toLocaleLowerCase`) can differ from the server's `casefold` for rare pairs such as ß/SS.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
