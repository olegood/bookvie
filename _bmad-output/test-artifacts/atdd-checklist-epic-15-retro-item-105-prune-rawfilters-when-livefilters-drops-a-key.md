---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-25'
storyId: 'epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key'
storyKey: 'epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key'
storyFile: '_bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-publisher-filter.spec.ts (new describe block "Epic 15 retro item 105 Forget a dropped filter check (ATDD)", 2 skipped leaves)'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md'
  - '_bmad-output/implementation-artifacts/epic-15-retro-2026-11-25.md (E15-R1, E15-P1, action item 4)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (the spec-15-2 deferral)'
  - '_bmad-output/test-artifacts/atdd-checklist-15-2-filter-the-catalog-by-publisher.md (format, AC-6 flow)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CatalogPage.tsx, src/lib/catalogFilter.ts (liveFilters), src/api/views.ts (toViewState, useView), src/api/queryClient.ts (retry false, refetchOnWindowFocus)'
  - 'frontend/e2e/catalog-publisher-filter.spec.ts, catalog-filter.ts, catalog-filter.spec.ts, fixtures.ts, library.ts, intents.ts (editBook), dropbox-backup-line.spec.ts (refetch pattern)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a checked key that the catalog view drops, when a Book gets that value back in the same Catalog visit, then the row is listed unchecked, its chip shows no count for it, and no Book is filtered by it.' }
  - { id: AC-2, idSource: generated, text: 'Given a checked key and a refetch that is loading or fails, when the view comes back unchanged, then the check is still on.' }
  - { id: AC-3, idSource: generated, text: 'Given npm run check, when it runs, then it passes, and every existing catalog-filter, catalog-publisher-filter and bookcase-details leaf passes unchanged.' }
---

# ATDD Checklist: Epic 15 retro item 105, forget a dropped filter check

## Preflight

- **Branch:** `story-15-1-carry-the-publisher-in-the-catalog-view`, after the spec commit `f3373b0`. This run changed no git state.
- **Stack:** `fullstack`, auto-detected. Playwright (Chromium only) and pytest are in place. The fix is client-only (`CatalogPage.tsx`), so every leaf is e2e.
- **Story:** a standalone pipeline spec (`- **Pipeline:**` line in its Design Notes), status `ready-for-dev`, with no `story_key`. Its three criteria have no ids, so they are numbered AC-1 to AC-3 in source order (registry above). The I/O matrix's rows map onto them: "Edited away and back", "Language and Tag" and "Partly dropped" are AC-1; "Refetch in flight or failed" is AC-2; "Nothing dropped" is a code property (no render loop) with no UI signal.
- **Epic gate:** not an epic story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto`.
- **What exists today:**
  - `CatalogPage.tsx:157` keeps `rawFilters` in state. `:164` derives `filters = liveFilters(rawFilters, languages, tags, publishers)`, which hides a gone key but never removes it from state.
  - `toViewState` (`views.ts:64`) returns `ready` whenever the query has data, including after a failed refetch. So once the Catalog has loaded, it never sees `loading` or `failed` again in that visit. `books` is `NO_BOOKS` only before the first load, when no check can exist yet. AC-2's "loading" case can't be reached from the UI; its "fails" case can.
  - `queryClient.ts:30`: `retry: false`, `refetchOnWindowFocus: true`. A `focus` event refetches the view once, and a 500 isn't retried.
  - Story 15.2 AC-6 (`catalog-publisher-filter.spec.ts:403`) already pins the drop.

## Generation Mode

**AI generation**, sequential, in this session. There's no API surface, so no worker A output, and the two leaves extend one existing flow (15.2 AC-6), so one author keeps the helper reuse in view. Recording isn't needed: every locator already ships and is used by 15.2's leaves.

## Test Strategy

Both leaves are in `frontend/e2e/catalog-publisher-filter.spec.ts`, in a new describe block at the end, at 1280×900 in the light theme, on 15.2's `PUBLISHER_SHELF`.

| AC | Level | Priority | Leaf | First assertion that can fail (red run) |
|---|---|---|---|---|
| AC-1 | E2E, `PUBLISHER_SHELF`, a second browser context | P1 | `:686` | Given (shipped, passes): Manning checked, then all three Manning Books moved to No Starch Press and refetched, and the chip reads "Publisher ▾". Grokking is moved back to Manning and refetched. The list poll proves the new view has rendered (No Starch Press 2, O'Reilly Media 2, Addison-Wesley Professional 1, Apress 1, Manning 1; shipped, passes). **Criterion:** the chip reads "Publisher ▾" (`:716`); red: it reads "Publisher: 1". Then the Manning 1 row is unchecked, all seven spines show in `BY_AUTHOR` order, and there's no Clear filters. |
| AC-2 | E2E, `PUBLISHER_SHELF`, a one-time 500 route | P2 | `:725` | Manning checked. The catalog view's refetch gets a 500: the chip still reads "Publisher: 1" and only `MANNING_BOOKS` show. The next refetch gets a 200: the same. **Passes in red, by design:** it is a guard for the spec's "Always" rule (never prune from a view that isn't loaded). An implementation that pruned on a failed refetch would fail it. |
| AC-3 | Command | — | none | `npm run check` and the three named spec files. This criterion is a process check over existing leaves, so it has no leaf of its own; the build and the review run the commands in the spec's Verification section. |

**Why the list poll comes before AC-1's criterion assertion.** Before the second refetch renders, the chip already reads "Publisher ▾" (from the first drop). So asserting the chip right after the response would pass before the bug can show. The poll waits for the Manning 1 row, which only the refetched view has, and only then is the chip read.

**What the leaves pin (the contract for the build):**
- After a drop, the Manning check doesn't come back when Manning does: chip "Publisher ▾", the row unchecked, no Book hidden, no Clear filters.
- A failed refetch keeps the check and the filtered shelf.

**Open for the build (not pinned):** an effect or a render-time state adjustment. Either has to act only on a `ready` view, and set state only when `liveFilters` returned a new object.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-1, Language or Tag (the spec's third Execution task):** the same away-and-back for a Language or Tag key. 7.2's deleted-Polish leaf in `catalog-filter.spec.ts` (~:720) is the model: drop the key, give a Book the value back, refetch, and the chip shows no count for it. The build adds it, since the spec names it.
- [ ] **E2E, AC-1, partly dropped:** Manning and O'Reilly Media checked; every Manning Book leaves Manning. The chip reads "Publisher: 1" with O'Reilly Media's Books shown, and Manning stays unchecked when it comes back.
- [ ] **Unit, "Nothing dropped":** if the build moves the prune decision into a pure helper in `catalogFilter.ts`, `catalogFilter.test.ts` pins that it returns the same object when nothing is dropped (`liveFilters` already has that test at :202).

## Helper probes

Helpers reused: `test`, `expect`, `seededServer`, `Server` (fixtures.ts); `bookId` (library.ts); `bookcase` (bookcase.ts); `publisherChip`, `listPopup`, `listNames`, `clearFilters`, `spineNames` (catalog-filter.ts); `editBook` (intents.ts); `PUBLISHER_SHELF`, `PUBLISHER_ROWS`, `MANNING_BOOKS`, `BY_AUTHOR`, `startsOf`, `checkPublisher` (spec-local in catalog-publisher-filter.spec.ts, from Story 15.2).

Helpers added (both local to the new describe block):
- `movePublisher(browser, server, ids, publisher)`: runs `editBook` from a second browser context for several Books. 15.2 AC-6 does the same inline once; this block needs it twice.
- `refetchCatalog(page, status)`: dispatches `focus` and waits for `/api/views/catalog` with the given status. `dropbox-backup-line.spec.ts:94` has `refetch` for `views/backup` with `r.ok()`, which can't wait for a 500, and the AC-6 leaf has the focus step inline without the response wait.

Shipped numbers: none quoted.

Probe (Chromium, 1280×900, `deviceScaleFactor` 1, light): `TZ=Europe/Madrid npx playwright test e2e/refetch-helper.probe.spec.ts`, removed with `rm`.
- **`refetchCatalog`**, known good: on the shipped Catalog, `refetchCatalog(page, 200)` resolved after exactly 1 catalog view response. It refused a status the server didn't send: `refetchCatalog(page, 500)` with no route timed out (rejected with `Timeout`). With a one-time 500 route it resolved, and the page kept its heading. Passed.
- `movePublisher` wraps `editBook`, which 15.2's probe already checked. The red run's first refetch shows it moved the three Books (the drop happened).

Render-before-read: both new leaves were checked. AC-1 reads the chip only after the web-first list poll proves the refetched view rendered, and its `spineNames` reads are polled. AC-2's chip reads are web-first `toHaveText` and its spine reads are polled, each after the refetch's response. No leaf needed a fix.

Storage keys: no new localStorage key.

## TDD Red Phase

- 2 e2e leaves, both `test.skip`, one per declared criterion that has a leaf, each with a `// Red phase:` reason above it. AC-3 is a command criterion with no leaf (see Test Strategy).
- **Red run** (2026-11-25, after the probe passed and after the last leaf change): a throwaway un-skipped copy, `e2e/catalog-publisher-filter-red.probe.spec.ts`, removed with `rm`, run with the probe. **AC-1 failed at its criterion assertion** (`:716` in the spec): `unexpected value "Publisher: 1"`. Everything before it passed. **AC-2 passed**, as a guard should. The probe passed.
- The spec itself runs as 12 passed and 2 skipped. `npx prettier --check`, `tsc -b` and `oxlint` are clean on it.
- `git status` lists no `*.probe.*` file and no throwaway copy: only `frontend/e2e/catalog-publisher-filter.spec.ts` (modified) and this checklist (new).

## Next Steps (task-by-task activation)

1. `bmad-build-auto` for this spec. Un-skip AC-1, watch it fail, fix `CatalogPage.tsx`, watch it pass. Un-skip AC-2 and keep it green. Add the Language or Tag leaf, and rewrite the 15.2 deferral in `deferred-work.md` with its `resolved:` line.
2. `npm run check` and the three named spec files (AC-3).
3. `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.

## Implementation Guidance

- **`pages/CatalogPage.tsx`:** when `view.status === 'ready'` and `filters !== rawFilters` (`liveFilters` returns a new object only when it dropped a key), set the filter state to `filters`. No announcement, no focus change.
- No change to `lib/catalogFilter.ts`'s exports, `FilterChips.tsx`, tokens or copy.
