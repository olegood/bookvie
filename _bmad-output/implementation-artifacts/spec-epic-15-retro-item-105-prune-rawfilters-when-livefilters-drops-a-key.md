---
title: 'Forget a dropped filter check, so it never comes back on its own'
type: 'bugfix'
created: '2026-11-25'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-15-retro-2026-11-25.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 15 retro item 105 (E15-R1, E15-P1; sprint item `epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key`). `CatalogPage.tsx` keeps the checked Language, Tag and Publisher keys in `rawFilters`, and `liveFilters` hides a key no Book has any more. It hides the key but never forgets it. So when a Book is edited back to that value in the same Catalog visit, the check comes back on its own: check Manning, another tab or the agent moves the last Manning Book to "No Starch Press" (the chip drops to "Publisher ▾", as Story 15.2's AC-6 pins), then moves it back, and the chip reads "Publisher: 1" again and the Catalog filters with nobody touching it. Story 7.2 has had this for Language and Tag. Publisher makes it likely, because a publisher's spelling is what people fix by editing. Source: `deferred-work.md`, "Deferred from: code review of spec-15-2-filter-the-catalog-by-publisher.md (2026-11-25)".

**Approach:** When the loaded catalog view drops a checked key, remove it from the page's filter state too. A dropped check is gone for the rest of the visit, for all three list chips, and a Book that gets the value back shows unfiltered under an unchecked row.

## Boundaries & Constraints

**Always:**
- Prune only from a loaded (`ready`) catalog view. While the view is loading or has failed, the page has no Books (`NO_BOOKS`), and that must never clear a check.
- Prune only keys that `liveFilters` drops. Status, Type and every key still in the library stay exactly as they are. Nothing that shows today changes: the chip text, its count, the shown Books, Clear filters and the announcements read the same as now, before and after the drop.
- A prune is silent. It announces nothing and moves no focus, as the drop does today.
- Language, Tag and Publisher all go through the same prune.
- Format only the files you change, with the project's pinned tools.

**Never:**
- Don't store filters anywhere or send them to the server. They stay plain page state (Story 7.2, Story 15.2 AC-7).
- Don't change `liveFilters`'s signature or what it returns, or `shownIds`, `filterValues` or `publisherValues`.
- Don't change any existing test's assertions or titles. AC-6 in `catalog-publisher-filter.spec.ts` and the deleted-Polish leaf in `catalog-filter.spec.ts` (~:757) must pass as they are.
- No new UI, copy or token.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edited away and back | Manning checked; another context moves every Manning Book to No Starch Press, the view refetches; then moves one back to Manning, the view refetches | After the first refetch: "Publisher ▾", every Book shows. After the second: still "Publisher ▾", every Book shows, the Manning row is listed unchecked | — |
| Language and Tag | The same away-and-back for a checked Language or Tag key | The same: the check stays off once dropped | — |
| Partly dropped | Manning and O'Reilly Media checked; every Manning Book leaves Manning | O'Reilly Media stays checked and filtering ("Publisher: 1"); Manning stays off if it comes back | — |
| Refetch in flight or failed | A check is on and the view is loading or failed | The check is kept; the view's return shows it as before | — |
| Nothing dropped | Every checked key is still in the library | The filter state isn't replaced (no extra render loop) | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CatalogPage.tsx:157-167` -- `rawFilters` state and the `filters` memo through `liveFilters`. The fix belongs here.
- `frontend/src/pages/CatalogPage.tsx:274-279` -- `changeFilters`: a user change also runs `liveFilters` for its announcement. It must keep doing so.
- `frontend/src/lib/catalogFilter.ts:118-135` -- `liveFilters` returns the same object when nothing is dropped. That identity tells the page whether a prune is due.
- `frontend/e2e/catalog-publisher-filter.spec.ts:403-442` -- AC-6, the existing drop leaf. The new leaf extends this flow (`editBook`, a second context, the `focus` refetch).
- `frontend/e2e/catalog-filter.ts` -- the shared chip and list helpers (`publisherChip`, `languageChip`, `tagChip`, `listPopup`, `checkboxNames`, `clearFilters`, `spineNames`). Reuse them (Epic 11 retro item 78); don't copy one into a spec.
- `frontend/e2e/catalog-filter.spec.ts:~720-765` -- the Story 7.2 drop leaf for Language, unchanged.
- `_bmad-output/implementation-artifacts/deferred-work.md:1851-1853` -- the 15.2 deferral: a bare bullet with no `source_spec:`/`summary:`/`evidence:` fields, and a heading that names the spec with `.md` (E15-P1).

## Tasks & Acceptance

**Execution:**
- `frontend/src/pages/CatalogPage.tsx` -- when the view is `ready` and `liveFilters` drops a key, set the page's filter state to the pruned filters -- the bug.
- `frontend/e2e/catalog-publisher-filter.spec.ts` -- add a leaf for the I/O matrix's first row, for Publisher: Manning checked, every Manning Book edited away in another context and refetched, then one edited back and refetched. The chip reads "Publisher ▾", every Book shows, Clear filters is absent and the Manning row is unchecked -- the reported case.
- The Language or Tag half -- add one e2e leaf (in `catalog-filter.spec.ts`, or the publisher spec if that reuses more) that does the same away-and-back for a Language or Tag key, so the retro's "all three chips" has a test -- the other two chips.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- give the 15.2 entry the file's `source_spec:`/`summary:`/`evidence:` shape (as the 15.1 entry above it has), keep its heading's text but drop the `.md`, and add a `resolved:` line naming this spec and Epic 15 retro item 105 -- close the source and E15-P1.

**Acceptance Criteria:**
- Given a checked key that the catalog view drops, when a Book gets that value back in the same Catalog visit, then the row is listed unchecked, its chip shows no count for it, and no Book is filtered by it.
- Given a checked key and a refetch that is loading or fails, when the view comes back unchanged, then the check is still on.
- Given `npm run check`, when it runs, then it passes, and every existing catalog-filter, catalog-publisher-filter and bookcase-details leaf passes unchanged.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why prune and not keep `rawFilters`:** Story 7.2 kept the key so the derived `filters` could stay a pure memo. The retro decided (Oleg, 2026-11-25) that a check that came back without anyone touching it is worse than one sync. The sync has to wait for a `ready` view, because `books` is `NO_BOOKS` while loading or failed, and `liveFilters` would then drop every key.
- **Why a refetch and not a remount:** editing a Book on Book detail and pressing Back remounts Catalog, which already resets the filters (AC-7). The bug needs the edit to come from somewhere else while Catalog stays mounted: a second tab, or the agent, with the `focus` refetch, as AC-6 drives it.

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts e2e/bookcase-details.spec.ts` -- expected: pass
- `npm run check` -- expected: exit 0
