---
title: 'Reconcile the architecture spine with as-built Epic 10'
type: 'chore'
created: '2026-11-16'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 10 deferred two "spine drift" entries to `deferred-work.md`, and neither edited the spine (Epic 10 retro, sprint item `epic-10-retro-item-72-reconcile-the-spine-with-epic-10`). They are at `:1023` and `:1029` and name these gaps:
- **AD-6, Seed and the FR-4/FR-20/FR-24 map row:** they still mark the catalog sort's reversal and `SortDirectionToggle` "Story 10.1, planned", though Story 10.1 built them.
- **AD-15:** it says a missing or junk `bookvie.catalogSortReversed`, or a stored key that isn't one of the four, reads as not reversed. It doesn't say that no stored key at all reads the same way, which is why `reverse()` stores the shown key along with the reversal.

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so AD-6, AD-15, the Seed and the map row state what the code does, citing story 10.1, as items 57 and 61 did.
- Close each entry with a `resolved:` line.
- No code changes. Oleg reviews the spine diff before it's final. Sprint item 72 is marked `done` only after that.

</frozen-after-approval>

## Implementation Notes

- **Count:** two open drift entries from Epic 10 (`deferred-work.md:1023`, `:1029`), both closed with a `resolved:` line. A case-insensitive scan finds no other "spine drift" entry from Epic 10 without one.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` set to 2026-11-16). Each statement was checked against the code: `lib/catalogSort.ts` (`readCatalogSortReversed` requires a stored key that is one of the four and `"true"`; `writeCatalogSortReversed` stores `"true"` or removes the key), `pages/CatalogPage.tsx` `reverse()` (stores `sortKey` with the reversal) and the key change (resets to natural), and `components/SortSelect.tsx` (renders `SortDirectionToggle`):
  - **AD-6:** the catalog sort bullet's "Reversed" clause loses "Story 10.1, planned", and now names `components/SortDirectionToggle.tsx` and story 10.1.
  - **AD-15:** the Rule adds that no stored sort key at all also reads as not reversed (Author is then only the fallback), so reversing stores the shown key too (story 10.1 review).
  - **Seed:** the `pages/ components/` comment drops "(Story 10.1, planned)".
  - **Map:** the FR-4, FR-20, FR-24 row drops "(Story 10.1, planned)" after `components/SortDirectionToggle`.
- **Not edited:** the toggle's placement inside `SortSelect`'s `role="group"`. The spine never said where it goes, so the entry at `:1023` asks for no edit.
- **`.memlog.md`:** one event line added.
- **No code changes.** The tests that read the spine (`test_layers.py`, `test_stack_pins.py`, `test_home_slice.py`, `test_ordering.py`) passed 105 of 105.
- **Sprint item 72 stays `open`** until Oleg approves the spine diff. Then it is marked `done` with `sprint_status.py --set-action-status` in the same commit.
