---
title: 'Reconcile the architecture spine with as-built Epic 7'
type: 'chore'
created: '2026-11-12'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 7 deferred four "spine drift" entries to `deferred-work.md`, and none of them edited the spine (Epic 7 retro F-S1, sprint item `epic-7-retro-item-57-…`). The entries are `:833`, `:841`, `:847` and `:853`. They name these gaps:
- **AD-6:** the client list says only "catalog sort, using `Intl.Collator`" and "filter chips". It records none of:
  - the sort keys: Author by the first author string, Title A–Z, Date added newest `createdAt` first, Pages fewest first; a numeric collator, so numbers sort by value; ties break by title, then `createdAt` older first compared as instants, then Book id by code unit; the choice remembered per browser; Home's slice packing its rows in the remembered sort before `slicePriority` picks them (story 7.1, `lib/catalog.ts` `sortBooks`, `lib/catalogSort.ts`);
  - the filter rules: OR within a group, AND across groups and with Search titles; Read is `finished`; Type, Language and Tag compare the Book's stored fields, Language and Tag ignoring case; an untagged Book never matches a Tag filter; checked values that no Book has any more are ignored; the client builds the Language and Tag value lists itself from the catalog view, keyed by `toLocaleLowerCase` (the server's `merge_tags` uses `casefold`, so ß/SS pairs can differ); filters are page state only and never reach Home's slice or the meter (story 7.2, `lib/catalogFilter.ts`, `components/FilterChips.tsx`).
- **Structural Seed:** the `frontend/src/lib/` line omits `catalog`, `catalogView`, `catalogSort` and `catalogFilter`, and no entry names `components/FilterChips` or `SortSelect`.
- **Capability Map:** the FR-4, FR-20, FR-24 row says only "client presentation" and names no client module, while the FR-15 and FR-16 rows name theirs.

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so AD-6, the Seed and the map row state what the code does and cite the story that decided it, as items 44 and 52 did. Bump `updated`.
- Close each of the four entries with a `resolved:` line.
- No code changes. Oleg reviews the spine diff before it's final; sprint item 57 is marked `done` only after that.

</frozen-after-approval>

## Implementation Notes

- **Count:** four open drift entries from Epic 7 (`deferred-work.md:833`, `:841`, `:847`, `:853`), all closed with a `resolved:` line (on `:853`, only the spine-drift item; the second item, the test gaps, was already resolved by automate). A case-insensitive scan finds no other "spine drift" entry without one, except the two known non-drift mentions item 52 already noted (`spec-epic-4-retro-item-38`'s cached-home entry, 6.4's OpenAPI docstring entry).
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-12). Each statement was checked against the code: `lib/catalog.ts` (`collator` with `numeric: true`, `PRIMARY`, `sortBooks`' tie-break chain), `lib/catalogSort.ts` (`bookvie.catalogSort`, default `author`, try/catch), `lib/catalogFilter.ts` (`filterKey`, `filterValues`, `matchesFilters`, `liveFilters`), `pages/HomePage.tsx:70-71` (`readCatalogSort` once per mount, `sortBooks` before the slice), `domain/book_fields.py` `merge_tags` (`casefold`), `views/models.py` `ShelfBook` (`type`, `language`, `tags`):
  - **AD-6:** the two one-line client bullets ("catalog sort", "filter chips") become a sort bullet and a filter bullet, each naming its modules and story.
  - **Seed:** the `lib/` line gains `catalog`, `catalogSort`, `catalogView` and `catalogFilter`; `components/` gains a comment naming `SortSelect` and `FilterChips`.
  - **Map:** the FR-4, FR-20, FR-24 row names its client modules and `ShelfBook`'s filter fields, and adds AD-15 (the remembered sort).
- **AD-15** already lists the sort among the UI preferences in `localStorage` (l.209), so it was not edited; the sort bullet points to it.
- **Not recorded as drift:** E7-R1 (blank Language or Tag values) is action 60's code fix, not a spine statement.
- **No code changes.** The tests that read the spine (`test_layers.py`, `test_stack_pins.py`, `test_home_slice.py`, `test_ordering.py`) passed 104 of 104.
- **Sprint item 57 stays `open`** until Oleg approves the spine diff. Then it is marked `done` with `sprint_status.py --set-action-status` in the same commit, as items 44 and 52 were.

## Review Triage Log

### 2026-11-12: Blind Hunter, pass 1

Floor N = 4 (about 15.7 kB). It reported 9 findings.

- **`[low]` `[patch]` The sort bullet said the order "never depends on the locale".** The collator is `new Intl.Collator(undefined, …)`, the browser's default locale (`lib/catalog.ts:21`). Patched: the tie-breaks make the order total, and the collator uses the default locale.
- **`[low]` `[patch]` The ß/SS divergence had no status.** The 7.2 build and code reviews rejected changing it (`spec-7-2…md` Review Triage Log). Patched: "(story 7.2 review, accepted)".
- **`[low]` `[patch]` The map row cites AD-15, but AD-15's Binds didn't name FR-20 or FR-24.** Patched in Binds. Naming the storage keys in AD-15 was not done: the keys are named where each module is documented (AD-6 for the sort; `lib/catalogView.ts`), and AD-15's rule is about what is not exported.
- **`[low]` `[patch]` The map row left out `lib/catalogView`, `components/ViewToggle`, `pages/Bookcase` and `pages/CatalogList`.** Patched.
- **`[low]` `[patch]` (partly) The filter bullet didn't record the client-computed "N books match." count or that filters apply to both views.** Patched, matching the search bullet's "N notes match.". Rejected for the rest: Clear filters' focus and the focus fallback are interaction rules owned by EXPERIENCE.md and the epic ACs, not architecture decisions.
- **`[low]` `[patch]` The Seed's `catalog` gloss hid that `catalogFilter` imports its collator.** Patched: "sort and the shared collator". The other helpers (Date added format, Tags suggestions) predate Epic 7 and aren't drift from it.
- **`[false]` The `resolved:` lines are final before the human review.** The change is committed only after Oleg approves the diff, as items 44 and 52 were; the commit is the trace. If he changes the spine, the lines are edited in the same pass.
- **`[false]` The spec is a stub.** The reviewer saw it before the Implementation Notes were written; the status is set in this step. The frozen Intent's line numbers refer to the file before this change, as item 52's did.
- **`[low]` `[patch]` (partly) The slice bullet's "bookcase order" didn't say it is the remembered sort.** Patched. Rejected: a sort changed elsewhere reaching an already-mounted Home, which the 7.1 build and code reviews rejected (once-per-mount read).

After the patches the spine tests pass 104 of 104.
