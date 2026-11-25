---
title: 'Story 15.2: Filter the catalog by publisher'
type: 'feature'
created: '2026-11-25'
status: 'in-review'
baseline_revision: '335d577dc7c50c3bd62d0c16fcc9bde0c8812e4e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-15-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-15-2-filter-the-catalog-by-publisher.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Oleg can't see one publisher's shelf (everything from Manning). The catalog view carries `ShelfBook.publisher` since 15.1, but there is no chip that filters by it.

**Approach:** Add a Publisher ▾ list chip after Tag ▾, reusing the Language/Tag checkbox popup. Its rows are ordered by each publisher's Book count in the whole library (most first, ties by the Catalog collator), and each shows that count after the name. It filters like every other chip group: OR within the group, AND with the other groups and Search titles. It is page state only.

## Boundaries & Constraints

**Always:**
- Matching and keying work as they do for Language and Tag: the key is `toLocaleLowerCase`, the label is the first spelling in library order, and a blank value is skipped.
- Counts and order come from all of the catalog view's Books, never from the filtered set, so other chips and Search titles change neither of them.
- `liveFilters` drops a checked publisher that no Book has any more. Clear filters, reload, leaving the page and an add all reset Publisher, as they reset every chip.
- Each row's count sits in its own element after the name, one space apart, in `body-sm`/`--color-ink-tertiary`. The accessible name is the visible text plus "book" or "books" ("Manning 49 books", "Apress 1 book").
- The chip reads "Publisher ▾" when nothing is checked and "Publisher: N" when N values are. It opens, closes on Esc and returns focus exactly as `ValueList` already does.

**Never:**
- No server or API change. No storage key. No export change.
- No change to Home's slice or the meter. No count on Language or Tag rows.
- No `tokens.css` edit. No search field in the popup.
- No Safari-only workarounds (AGENTS.md → Supported browser).
- No banned git commands: no stash, checkout or restore of paths, no reset, no clean, no branch change (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Order | Library has O'Reilly 84, Manning 49, Pragmatic 49, Apress 1 | O'Reilly 84, Manning 49, Pragmatic 49, Apress 1 | — |
| Case | "Manning" (first in library order), "manning" | One row, "Manning 2", which matches both Books | — |
| OR / AND | Manning + O'Reilly; Manning + Unread + "in" | Books of both publishers; only the Books that match all three | — |
| Stale | Manning checked, then every Manning Book is edited away and the view refetches | The check is dropped, every Book shows, and the chip reads "Publisher ▾" | — |
| Blank | A publisher of "" (the server refuses one) | Skipped | — |

</intent-contract>

## Code Map

- `frontend/src/lib/catalogFilter.ts` -- `CatalogFilters` (`:14`), `NO_FILTERS` (`:21`), `FilterValue` (`:24`), `FilterableBook` (`:32`), `filterValues` (`:50`), `matchesFilters` (`:63`), `filtersOn` (`:73`), `liveFilters(filters, languages, tags)` (`:88`). Add the publisher group here. `collator` comes from `lib/catalog.ts:21` (`numeric: true`).
- `frontend/src/lib/catalogFilter.test.ts` -- `node:test` unit tests. Its three `liveFilters` calls change if the signature changes.
- `frontend/src/components/FilterChips.tsx` -- `ValueList` (the popup is a `role="group"` with `aria-label`, each row a `label` holding a native checkbox) and `list(field, label, values)`. `ListField` is `'languages' | 'tags'`.
- `frontend/src/components/FilterChips.module.css` -- `.option` (`body-sm`, `ink`) and `.popup` (`max-height: 320px`, `overflow-y: auto`). Add a count class that uses `--color-ink-tertiary`.
- `frontend/src/styles/base.css:60` -- the global `.visuallyHidden` class, used for the noun.
- `frontend/src/pages/CatalogPage.tsx:158–161` -- builds `languages` and `tags` from all `books` and passes them to `liveFilters`. Also `:272`, where `changeFilters` calls `liveFilters` again, and `:346`, the `<FilterChips>` props.
- `frontend/e2e/catalog-publisher-filter.spec.ts` -- 8 red leaves (`test.skip`) to un-skip: AC-1 `:175` through AC-8 `:452`. They use the helpers in `e2e/catalog-filter.ts` (`listNames`, `countLook`) and `editBook` in `e2e/intents.ts`.
- `frontend/e2e/catalog-filter.spec.ts` -- Story 7.2's leaves. They must pass unchanged (the epic gate).
- Deferred-work intake: none name story 15.2 or Epic 15.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/catalogFilter.ts`:
  - Add `publishers: readonly string[]` to `CatalogFilters` and `NO_FILTERS`, and `publisher: string` to `FilterableBook`.
  - Match publishers in `matchesFilters` by `filterKey`, and count them in `filtersOn`.
  - Add `PublisherValue = FilterValue & { count: number }` and `publisherValues(values)`: keyed and labelled as `filterValues`, counted across every spelling, blank skipped, sorted by count descending and then `collator.compare` on the label.
  - Make `liveFilters` take publishers too, keeping the "same object when nothing changes" contract.
  - Update the header comment.
- `frontend/src/lib/catalogFilter.test.ts` -- unit-test `publisherValues` (order, ties, numeric collation, case merge and count, blank, no mutation), the publisher match (OR, AND, case), `filtersOn`, and `liveFilters` dropping a gone publisher. Update the existing `liveFilters` calls and the `book()` default (`publisher`).
- `frontend/src/components/FilterChips.tsx`:
  - `ListField` gains `'publishers'`, and Props gain `publishers: readonly PublisherValue[]`.
  - `ValueList` renders an optional count: `{label} <span class=count>{count}</span><span class="visuallyHidden"> book(s)</span>`.
  - Add `list('publishers', 'Publisher', publishers)` after Tag, in the same group.
  - Update the doc comments.
- `frontend/src/components/FilterChips.module.css` -- add `.count { color: var(--color-ink-tertiary); }`.
- `frontend/src/pages/CatalogPage.tsx` -- `publishers = useMemo(() => publisherValues(books.map((b) => b.publisher)))`. Pass it to both `liveFilters` calls and to `FilterChips`.
- `frontend/e2e/catalog-publisher-filter.spec.ts` -- remove the 8 `test.skip` marks and the `// Red phase:` comments.

**Acceptance Criteria:**
- Given a non-empty Catalog, when it renders, then the filter row reads Status, Type, Language ▾, Tag ▾, Publisher ▾, and Publisher ▾ opens the same checkbox list as Language: rows in `body-sm`/`ink`, at most 320px tall, scrolling beyond that.
- Given publishers with 84, 49, 49 and 1 Books, when Publisher ▾ opens, then the rows are ordered by count, ties A–Z, each with its count after the name in `body-sm`/`ink-tertiary`, and Language and Tag rows show no count.
- Given Unread, a Tag and Search titles text on, when Publisher ▾ opens, then the counts and order are the same as with no filters.
- Given Manning checked, when the Catalog shows the bookcase, the List or the Tiles, then only Manning's Books show, the shelf closes up, the chip reads "Publisher: 1" and `status` announces "N books match." With O'Reilly Media also checked, both publishers' Books show (OR). With Unread and a search, only the Books that match all three show (AND).
- Given "Manning" and "manning", when the list opens, then one row "Manning 2" matches both Books.
- Given Manning checked and every Manning Book edited away, when the view refetches, then the check is dropped and the Catalog isn't empty.
- Given Publisher on, when Clear filters, a reload, leaving Catalog or an add happens, then it is off. Nothing is stored or sent, and Home's slice and the meter ignore it.
- Given a keyboard or screen reader user, when they move through the rows, then each checkbox is named "Manning 49 books" or "Apress 1 book", and Esc closes the list and returns focus to the chip.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 24 findings — high 0, medium 1, low 13, false 10, maybe-false 0
- findings:
  - (edge) `[low]` `[reject]` `rawFilters` keeps a stale publisher key after `liveFilters` drops it, so it can come back if a Book is later edited back to that publisher. This is the same design Language and Tag have had since Story 7.2, and it needs the gone value to return within one Catalog visit. The fix would add a syncing effect, and it is unlikely to be met in everyday use.
  - (edge) `[false]` `[reject]` "Manning " and "Manning" would make two rows. The server trims every publisher (`book_fields.py` and the `book_publisher_trimmed` invariant, AR66), so a padded value can't reach the view.
  - (edge) `[low]` `[reject]` `box-sizing: border-box` on the shared `.popup` also changes Language and Tag. That is the intended fix: DESIGN.md says "at most 320px tall" for all three lists, and before it a full list rendered 330px. The 2px narrower `min-width` is cosmetic.
  - (verification-gap) `[medium]` `[patch]` Nothing checked that the noun stays visually hidden. Patched: AC-2 now asserts the " books"/" book" element is at most 1×1. The implementer's mutation (dropping `visuallyHidden`) failed it at 42.8px.
  - (intent) `[low]` `[reject]` The shared popup CSS changes Language and Tag. Same root cause as the edge finding above, rejected for the same reason.
  - (intent) `[low]` `[reject]` Two older e2e leaves were edited despite "must pass unchanged". AC-1 puts Publisher ▾ after Tag ▾, so the Tab-order leaves (`catalog-filter.spec.ts` Clear filters stop, `bookcase-details.spec.ts` chip sequence) can't hold as written. Each edit keeps its leaf's intent. The fix would edit this spec, so it is recorded under Auto Run Result.
  - (intent) `[false]` `[reject]` "Never in an export" is only checked indirectly. The filter is page state and the export is built on the server from `library.json`, so there is no path. AC-7 pins that nothing is stored or sent.
  - (intent) `[low]` `[reject]` AC-1 compares Publisher's popup with Language only, not Tag. Both come from the same `ValueList` and `.option`, so a Tag check repeats it.
  - (intent) `[false]` `[reject]` "The shelf closes up" is asserted only through hidden spines. A hidden (not dimmed) spine is removed from layout, the existing 7.2 leaves already pin that, and the spine order assertion shows the order closes up.
  - (intent) `[false]` `[reject]` Closing on a pointer press outside is untested for Publisher. The behaviour is the shared `ValueList`, tested through Language (`catalog-filter.spec.ts` "a click outside closes it").
  - (intent) `[false]` `[reject]` The numeric tie break is unit-only. The unit test covers it (`breaks ties by number value`). The claim is about test placement, not a defect.
  - (intent) `[false]` `[reject]` "Whole library" vs "catalog view": AR66 defines the count over the catalog view, which holds every Book.
  - (intent) `[false]` `[reject]` Skipping a blank publisher goes beyond the intent. It mirrors `filterValues`' guard, and the server refuses a blank, so nothing observable changes.
  - (blind) `[low]` `[reject]` The spec says `catalog-filter.spec.ts` passes unchanged, but the diff edits it. The fix is a spec edit; the deviation is recorded under Auto Run Result.
  - (blind) `[low]` `[reject]` `bookcase-details.spec.ts` is edited but not listed in the spec. The fix is a spec edit; recorded under Auto Run Result.
  - (blind) `[low]` `[reject]` The shared `.popup` `box-sizing` changes Language and Tag. Same as the edge finding above.
  - (blind) `[low]` `[patch]` `ValueList`'s local `count` (checked) shadows the meaning of `value.count` (Books). Patched: renamed to `checkedCount`.
  - (blind) `[low]` `[reject]` The anonymous `FilterValue & { count?: number }` is written twice in one file. That is cosmetic, two lines apart, and a named export would add public surface.
  - (blind) `[low]` `[patch]` `publisherValues` copies `filterValues`' rules and drops the blank-skip reason. Patched: the doc comment now cross-references `filterValues` and AD-18. A shared grouping helper was not added, since it would be a refactor beyond a direct correction.
  - (blind) `[low]` `[patch]` No unit test sorts a merged case group in a tie. Patched: added `publisherValues(['manning','Apress','Manning','Apress','Zed'])`, which gives Apress 2, manning 2, Zed 1.
  - (blind) `[false]` `[reject]` No `liveFilters` identity test per group. The "same object" test with a live publisher checks identity, and `keep` returns the same array whenever nothing is dropped. No failing case was shown.
  - (blind) `[low]` `[patch]` The `ValueList` doc comment wraps unevenly. Patched: rewrapped to about 80 columns.
  - (blind) `[false]` `[reject]` The spec's Code Map line numbers are stale. The Code Map was written before the change, by design (the investigation map). The fix edits the spec, which is rejected.
  - (blind) `[false]` `[reject]` The spec has no verification evidence. Finalize writes it under Auto Run Result; the spec is not missing it at this stage.

Note: Spine Check reported no findings (AD-6, AD-7, AD-8, AD-15 and AD-17 checked).

## Design Notes

**The noun is a hidden span, not an `aria-label`.** A visually hidden " books" inside the `label` keeps the accessible name equal to the visible text plus the noun, as UX-DR94 asks, and avoids a name that the visible text doesn't contain (WCAG 2.5.3).

```tsx
{value.label}
{count !== undefined && (
  <>
    {' '}<span className={styles.count}>{count}</span>
    <span className="visuallyHidden">{count === 1 ? ' book' : ' books'}</span>
  </>
)}
```

**`publishers` holds case keys,** like `languages` and `tags`. So `liveFilters` and `toggleValue` stay generic over `FilterValue.key`.

## Verification

**Commands:**
- `cd frontend && node --test src/lib/catalogFilter.test.ts` -- expected: all pass.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts` -- expected: all pass, none skipped.
- `npm run check` (repo root) -- expected: exit 0.
- `cd frontend && TZ=Europe/Madrid npx playwright test` -- expected: the whole e2e suite passes.

## Auto Run Result

Status: in-review

**Summary.** The Catalog filter row gains Publisher ▾ after Tag ▾. Its checkbox list is ordered by each publisher's Book count across the whole catalog view (most first, ties by the Catalog collator). Each row shows its count after the name in `ink-tertiary`, with a visually hidden " book"/" books" noun so the accessible name reads "Manning 49 books". Matching ignores case, ORs within the group and ANDs with the other groups and Search titles. `liveFilters` drops a gone publisher, and the filter is page state only.

**Files changed:**
- `frontend/src/lib/catalogFilter.ts`: `publishers` in `CatalogFilters`/`NO_FILTERS`, `FilterableBook.publisher`, `PublisherValue`, `publisherValues()`, and the publisher match in `matchesFilters`, `filtersOn` and `liveFilters` (now a fourth parameter).
- `frontend/src/lib/catalogFilter.test.ts`: unit tests for `publisherValues` (order, numeric ties, case merge in a tie, blank, no mutation), the publisher match, `filtersOn` and `liveFilters`.
- `frontend/src/components/FilterChips.tsx`: the Publisher list chip after Tag. `ValueList` renders an optional count and the hidden noun, and its local `count` is renamed `checkedCount`.
- `frontend/src/components/FilterChips.module.css`: `.count` in `--color-ink-tertiary`, plus `box-sizing: border-box` on `.popup`, so all three lists respect DESIGN.md's 320px cap (a full list rendered 330px before).
- `frontend/src/pages/CatalogPage.tsx`: builds `publishers` from all Books and passes it to both `liveFilters` calls and to `FilterChips`.
- `frontend/e2e/catalog-publisher-filter.spec.ts`: the 8 ATDD leaves are un-skipped, and AC-2 also asserts the noun is at most 1×1.
- `frontend/e2e/catalog-filter.spec.ts` and `frontend/e2e/bookcase-details.spec.ts`: one Tab-order step each now includes Publisher ▾, the new last chip (see the deviation below).

**Deviation from the spec (for bmad-code-review).** The Code Map says `catalog-filter.spec.ts` "must pass unchanged (the epic gate)", and the ATDD checklist's gate analysis said no 7.2 leaf asserts the whole row. Two existing leaves did assume Tag ▾ was the last chip:
- `catalog-filter.spec.ts` AC-4 (Tab from the last chip reaches Clear filters) now focuses `publisherChip` instead of `tagChip`.
- `bookcase-details.spec.ts:95` (Story 1.10's toolbar Tab sequence) adds `'Publisher'`.

Both edits follow from AC-1's row order and keep each leaf's intent. No other assertion changed.

**Review findings.** 24 in total: 5 patched (1 medium, 4 low), 0 deferred, 19 rejected (9 low, 10 false). Each has its reason in the Review Triage Log above. Spine Check found nothing.

**Follow-up review recommendation:** `false`. This first pass patched one medium and four low findings, none high, and the medium is a test assertion whose mutation check failed as expected.

**Verification:**
- `npm run check` (repo root) exit 0, before and after the patches: check:api, check:py, check:e2e with 884 passed and none skipped, and check:smoke.
- `node --test src/lib/catalogFilter.test.ts`: 26 passed.
- `catalog-publisher-filter.spec.ts` and `catalog-filter.spec.ts`: 33 passed.
- Matrix audit: each row of the I/O matrix has a passing unit test, and every row except Blank also has a passing e2e leaf.

**Helpers:** no e2e or pytest helper was added. The build reused `publisherChip` from `e2e/catalog-filter.ts` (added by the ATDD run). The noun check in AC-2 is an inline evaluate.

**Residual risks:**
- `rawFilters` still holds a dropped publisher key until the next filter change, as Language and Tag do (rejected as unlikely).
- The `.popup` `box-sizing` change makes long Language and Tag lists 10px shorter and their popups 2px narrower at the minimum.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
