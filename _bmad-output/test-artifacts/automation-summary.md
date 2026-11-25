---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-25'
storyId: 'epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key'
storyKey: 'epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md (ACs, I/O matrix, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - frontend/src/pages/CatalogPage.tsx, frontend/src/lib/catalogFilter.ts, frontend/src/lib/catalogFilter.test.ts
  - frontend/e2e/catalog-publisher-filter.spec.ts, catalog-filter.ts, intents.ts (editBook), library.ts, fixtures.ts
---

# Automation Summary: Epic 15 retro item 105, forget a dropped filter check

## Preflight

- **Done at HEAD.** A standalone spec with no `development_status` key, so its own frontmatter is the record: `git show HEAD:…/spec-epic-15-retro-item-105-….md` reads `status: 'done'` (review commit `aae8050`), and the working tree was clean.
- **Stack:** `fullstack` (auto). The fix is client-only (`CatalogPage.tsx:175`, a render-time prune), so every target is an e2e leaf. No pytest target.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's 3 open green-phase follow-ups, the spec's ACs and I/O matrix, and the review's findings (`aae8050`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. No browser exploration: every locator ships and is used by the item's existing leaves.
- **Execution mode:** sequential, in this session. Two leaves in one describe block, one author for the reuse rule.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| ATDD follow-up: Language or Tag away-and-back | E2E | P1 | Tag already written by the build (`catalog-publisher-filter.spec.ts:749`); **new** Language leaf `:812` |
| ATDD follow-up: partly dropped | E2E | P1 | Already written by the build: `:781` |
| ATDD follow-up: unit "Nothing dropped" | Unit | — | **Retired**: the prune stayed in `CatalogPage.tsx`, no helper; `liveFilters` identity is pinned at `catalogFilter.test.ts:202` |
| The prune doesn't fight the user: re-check a forgotten Manning, it filters, announces "1 book matches." and holds across a no-change refetch | E2E | P2 | **New** leaf `:846` |

Why these two: the spec's I/O matrix row "Language and Tag" named both chips, and the spec's Residual risks listed Language as having no leaf of its own. The re-check leaf pins the other side of a render-time `setFilters`: once the user checks the value again it is live, so the prune must not clear it on the next render or refetch.

## Files

- `frontend/e2e/catalog-publisher-filter.spec.ts`: two leaves at the end of the "Epic 15 retro item 105 Forget a dropped filter check" block, and a describe-local constant `MANNING_BACK_ROWS` (the Publisher rows once Grokking is back at Manning). The build's AC-1 and partly-dropped leaves listed those rows inline; both now use the constant. Their assertions are unchanged.
- `_bmad-output/test-artifacts/atdd-checklist-epic-15-retro-item-105-….md`: two follow-ups ticked, one retired. Remaining `[ ]`: **0**.
- This summary.

**Helpers:** none added. Reused `editElsewhere`, `movePublisher`, `refetchCatalog`, `checkPublisher`, `PUBLISHER_SHELF`, `PUBLISHER_ROWS`, `BY_AUTHOR`, `MANNING_BOOKS`, `startsOf` (spec-local) and `languageChip`, `publisherChip`, `listPopup`, `checkboxNames`, `clearFilters`, `spineNames` (`catalog-filter.ts`). `MANNING_BACK_ROWS` is a data constant replacing two inline copies, not a helper.

## Validation

- The six item-105 leaves: 6 passed.
- **Mutation probe** (prune line commented out by hand in `CatalogPage.tsx:175`, then restored by hand; `git status` showed only the spec file modified): the new Language leaf fails (`Polish` row checked), as do the build's Publisher, Tag and partly-dropped leaves; the new re-check leaf fails at its setup; AC-2 passes, as a guard should.
- `TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts e2e/bookcase-details.spec.ts`: 56 passed.
- `npm run check:api`: exit 0 (Prettier, oxlint, `tsc -b`, 425 unit tests).
- No production file changed; no CLI session opened; no temp artifact left.

## Assumptions and risks

- The re-check leaf's distinct value (no fight with the user) shows only when the prune exists; with the prune removed it fails earlier, at its own setup. Its guard is the passing run: a prune that compared against stale lists would clear Manning after the check or after the refetch.
- The `ready` guard stays untestable from the UI (no chip before the first load; a failed refetch stays `ready`), as the spec's Residual risks and review record.

## Next

The spec's pipeline is complete. Item 105's sprint action item (`epic-15-retro-item-105-…` in `sprint-status.yaml`) still reads `status: open`. Remaining before Epic 16: item 106, the Epic 15 trace and gate (`bmad-testarch-trace`).
