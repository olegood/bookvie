---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-26'
storyId: 'epic-16-retro-item-107'
storyKey: 'epic-16-retro-item-107-clear-a-stuck-pending-unstar'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md (ACs, I/O matrix, Auto Run Result, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - frontend/src/pages/CatalogPage.tsx, frontend/src/pages/Bookcase.tsx
  - frontend/e2e/favourites-chip-stuck-unstar.spec.ts, favourites-chip.spec.ts, catalog-filter.ts, catalog-filter.spec.ts, bookcase.ts, favourite.ts, favourites-shelf.ts, library.ts, tiles.ts
  - resources/knowledge: test-levels-framework.md, test-priorities-matrix.md, data-factories.md, selective-testing.md, ci-burn-in.md, test-quality.md, fixture-architecture.md, network-first.md, playwright-cli.md (core and Traditional Patterns; no Playwright Utils)
---

# Automation Summary: Epic 16 retro item 107, clear a stuck pending unstar

## Preflight

- **Done at HEAD.** Item 107 is a retro action item, not a `development_status` story. At HEAD (`0d29524`, the review's commit), the spec's frontmatter reads `status: 'done'` and the action item in `sprint-status.yaml` reads `status: done`. The working tree was clean.
- **Stack:** `fullstack` (auto). Playwright (Chromium only) and pytest are in place. The change is frontend only, so there's no pytest target.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's five green-phase follow-ups, and the residual gaps the build and the review named (Clear filters, a New book save, the List-row and popover star paths).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. I didn't explore with `playwright-cli`, because every locator already ships and the 16.2 leaves use them.
- **Execution mode:** sequential in this session. All four leaves go in one file, and they share one setup helper.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| AC-1 in List: type "Bl" while a row's unstar waits | E2E | P1 | `favourites-chip-stuck-unstar.spec.ts:319` |
| AC-1 in the Bookcase: type "Bl" while a Spine popover's unstar waits | E2E | P1 | `favourites-chip-stuck-unstar.spec.ts:342` |
| AC-2 Clear filters while an unstar waits | E2E | P2 | `favourites-chip-stuck-unstar.spec.ts:272` |
| AC-2 a New book save while an unstar waits | E2E | P2 | `favourites-chip-stuck-unstar.spec.ts:297` |
| AC-3 the same star again | E2E | P1 | Already covered by the build's leaf at `:186`; nothing added |

**Scope is selective.** All the behavior lives in `CatalogPage`'s refs and a layout effect across three views, so E2E is the only level that sees it. There's no unit or API surface.

**Not added: List-row or popover star presses while an unstar waits** (the drop in the wrapped `press`). All three views get the same wrapped `favourite` object, and `:249` (Tiles) already pins that drop. The review rejected per-view leaves as repeats, and this run agrees.

## Files changed

- `frontend/e2e/favourites-chip-stuck-unstar.spec.ts`:
  - **Four new leaves.**
  - **`stuckUnstarOfEmma` takes an optional `view`** (`'Tiles'` by default; also `'List'` or `'Bookcase'`). It reaches the stuck unstar from a List row's star or from Emma's Spine popover. The popover's star is named "Favourite", like 16.2 AC-7's `favouriteStar(card)`.
  - **New spec-local `expectStarredShown(page, view)`.** It checks that the three starred Books show in that view.
- `_bmad-output/test-artifacts/atdd-checklist-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md`: the five follow-ups are ticked. There are 0 `[ ]` left (`grep -cF '[ ]'`).

## Helpers

- **No new module helper.** `addSwingTime`, `clearFilters`, `spineNames`, `SWING` (`catalog-filter.ts`), `bookRows`, `popover`, `spine`, `spines` and `viewToggle` (`bookcase.ts`), and `EMMA` (`favourites-shelf.ts`) are imported as they are.
- **`stuckUnstarOfEmma` was extended with an optional parameter, not copied** (the reuse rule).
- **`expectStarredShown` is new and spec-local.** It holds the per-view "starred Books shown" check that the helper runs twice (before and after the failed refetch), and the 16.2 spec has no export for it.
- **`rowTitleLink` is not used.** It's spec-local to `favourites-chip.spec.ts`, and the List leaf checks focus in Search titles, not on a row.

## Validation

- **`favourites-chip-stuck-unstar.spec.ts`, `favourites-chip.spec.ts` and `favourite-star.spec.ts` with `--repeat-each=3`:** 123 passed. The build was from HEAD's source.
- **Mutation probe for the search drop.** With `dropPendingUnstar()` deleted from `search`, and the app rebuilt, both new AC-1 leaves (List `:319`, Bookcase `:342`) failed at `expect(await unstarLines(announced)).toEqual([])`. The source was then restored and rebuilt, and `git diff -- frontend/src` was empty. They fail on the spoken line, not on focus, because the focus guard keeps focus in the box either way.
- **What the AC-2 leaves can and can't catch.** The Clear filters and New book save leaves can't catch a missing drop:
  - Both actions turn Favourites off, so Emma shows again.
  - With the `!favouritesOn` branch gone, a leftover pending unstar can't fire.
  - So these two leaves pin what each action itself does (its line, focus, and silence after a refetch), not the drop. The same holds for the build's chip-off leaf at `:116`.
- **Prettier:** `format:check` clean.
- **Full `npm run check`** from the repo root, 2026-11-26: exit 0. pytest 2534 passed, unit 432 passed, e2e 935 passed (931 before plus these 4), smoke ok.

## Assumptions and risks

- **A residual the review rejected.** In the Bookcase view, focus can sit on the waiting Book's spine when a late refetch hides it. Bookcase then moves focus to the nearest spine before the focus guard runs. No leaf covers this. The review called it low and not worth a pre-render focus record.
- **The `:191` render-time `setFilters` path.** No leaf changes language, tag or publisher keys while an unstar waits. That path never touches `favourites` (`liveFilters`), so it can't turn the chip off.

## Production defects found

None. No production code was changed; the mutation probe's edit was reverted.

## Next

- **`bmad-testarch-trace` is optional for a retro item.** Epic 16's trace and gate, if any, follow the retro's own items.
- **Item 108 is due before Epic 17's first story.** It reconciles the spine with Epic 16: the AD-6 and AD-7 drift entries, including item 107's.
