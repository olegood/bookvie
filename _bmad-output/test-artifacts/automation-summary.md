---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-24'
storyId: '14.3'
storyKey: '14-3-see-the-open-box-in-its-book-s-color'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-14-3-see-the-open-box-in-its-book-s-color.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-14-3-see-the-open-box-in-its-book-s-color.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/epic-14-context.md
  - _bmad/tea/config.yaml
  - frontend/src/pages/CardNotesPage.tsx, frontend/src/pages/CardNotesPage.module.css, frontend/src/components/AppShell.tsx, frontend/src/api/views.ts
  - frontend/e2e/open-box.spec.ts, open-box-unscoped.spec.ts, card-note-boxes.ts, card-note-boxes-automate.spec.ts, update-notice.ts, spine-popover.spec.ts, back-to-top.ts, card-note-keys.ts, library.ts, fixtures.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 14.3 See the open box in its Book's color

## Preflight

- **Stack:** `fullstack` (auto). The story is frontend only: the open box strip on the scoped Card notes page. Every new target is an e2e leaf.
- **Gate:** `sprint-status.yaml` at HEAD (`591f39c`) says `14-3-…: done`, and the tree was clean at the start.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 10 open green-phase follow-ups and the spec's I/O matrix and Review Findings.
- **Generation:** sequential, in this session. The leaves reuse the ATDD module's seeds and helpers (`card-note-boxes.ts`, `openBoxStrip`), so a worker would need this session's reading anyway.
- **Knowledge:** the six core fragments, plus Traditional Patterns (`fixture-architecture.md`, `network-first.md`) and `playwright-cli.md`. `@seontechnologies/playwright-utils` isn't in `package.json`, so the Playwright Utils branch didn't open. There is no Pact artifact. No browser session was opened for exploration: the ATDD run had already probed the page, and the leaves read the strip through `openBoxStrip`, which that run probed.

## Coverage plan

The 3 ATDD leaves (`open-box.spec.ts`) cover AC-1 to AC-3, and the build's `open-box-unscoped.spec.ts` covers the "Unscoped" matrix row and the strip going when the chip is removed. This run adds one e2e leaf for each of the 10 follow-ups (11 tests, since the window-width leaf runs at two widths), in `frontend/e2e/open-box-automate.spec.ts`:

| Follow-up | Priority | Level | Leaf |
|---|---|---|---|
| AC-1 axe | P1 | E2E | `:52` the open box passes axe (`AXE_TAGS`) in light and dark, for Candide (5 notes) and Austerlitz (no notes), each after its strip has rendered. |
| AC-1 read vs unread | P1 | E2E | `:77` Dubliners (no finished reading, color set by the user) opened from its box: the strip is `#2F6B6B` exactly, in light and dark. |
| AC-1 near-white color | P2 | E2E | `:92` a `#FFFFFF` spine color: the strip is `rgb(255, 255, 255)`, 8px tall, with 0px borders and no shadow. |
| AC-1 remove the chip | P2 | E2E | `:114` after "Remove In Candide" there's no strip, and Back returns to Candide's open box with its strip. The removal half was already in `open-box-unscoped.spec.ts:24`. |
| AC-1 window width | P2 | E2E | `:136` at 1024px and 1440px, the strip is at `left: 0`, as wide as the window, at y = 60. One window down it sits at 60 − 720, still at the header's bottom: it scrolls with the page. |
| AC-1 update notice | P2 | E2E | `:162` with the update notice faked (`answerAppInfo`, a newer version), the header's bottom is the banner's bottom, below 60, and the strip starts there. |
| AC-1 refetch | P1 | E2E | `:180` a note added to Austerlitz's empty open box from another context shows after a focus refetch. The strip node from before the refetch is still connected, with the same color, and there's no alert. |
| AC-1 color change | P2 | E2E | `:212` Book detail → "See all card notes" (Candide's strip), Back, Teal picked on Book detail, Forward: the cached open box's strip is Teal. |
| AC-2 axe | P1 | E2E | `:236` Solaris's open box (50 notes), scrolled to the bottom with Back to top shown, passes axe in light and dark. |
| AC-3 | P2 | E2E | `:255` the strip is 8px, and setting `--open-box-strip-height: 12px` on `:root` makes it 12px. `app-shell.spec.ts` passes in the full check. |

## Mutation checks

The new leaves passed on the first run, so each kind was checked against a broken build. Each edit was made by hand, rebuilt, run, then reverted by the inverse edit and compared with a saved copy (`cmp`). No git command changed the tree.

- `.strip` given `height: 8px; position: sticky; top: 0`: both window-width leaves and the AC-3 token leaf failed (3 failed).
- The strip given `key={Math.random()}`, so every render remounts it: the refetch leaf failed (`isConnected` was `false`).

## Files

- **Created:** `frontend/e2e/open-box-automate.spec.ts`: 10 leaves (11 tests). It imports the seeds and locators from `card-note-boxes.ts`, the update-notice fake from `update-notice.ts`, and has one module-local locator, `stripNode` (the `aria-hidden` child of `main`, used only for node identity in the refetch leaf), plus the literals `TOPBAR_HEIGHT` (60, `--space-topbar-height`) and `TEAL` (`#4B7C7B`, a curated swatch, as in `spine-popover.spec.ts`).
- **Changed (source):** none.
- **Updated:** the ATDD checklist. All 10 green-phase follow-ups are ticked with their evidence. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Story leaves:** `TZ=Europe/Madrid npx playwright test e2e/open-box-automate.spec.ts` gave 11 passed.
- **Full check, after the new leaves (2026-11-24):** `npm run check` exited 0. pytest 2508 passed, unit 406 passed, e2e 840 passed (the build's 829, plus 11), smoke passed. oxlint, `tsc -b` and Prettier were clean.
- **Quality checklist:**
  - No hard waits. Every one-shot `openBoxStrip` read comes after a web-first poll of the strip or an awaited scroll position.
  - No conditionals: the `for` loops run fixed lists (themes, Books, widths).
  - Every leaf seeds its own server, so they are parallel-safe. The other context in the refetch leaf is closed in `finally`.
  - One subject per leaf.
  - No skips or focus.
  - Exact values throughout: computed colors, rects, borders, shadows, node identity, axe violation lists compared with `[]`.
- **No CLI browser sessions** were opened, and `git status` showed only this run's files.

## Assumptions and risks

- The window-width leaf asserts the strip at y = 60, `--space-topbar-height`, with no update notice. A change to the top bar's height fails it; `TOPBAR_HEIGHT` names the value.
- `stripNode` finds the strip by structure (the `aria-hidden` child of `main`), not by class. If another `aria-hidden` child of `main` came before the page, the refetch leaf would track the wrong node. The color check beside it still reads the strip through `openBoxStrip`.
- The color-change leaf goes through Back and Forward so the open box's view stays cached. That proves the strip follows the new color after a set-spine-color, whether the cache is invalidated or refetched on mount; it doesn't tell those two apart.
- The review deferred one design question this run only observes: a near-white strip on the light page (or near-black on dark) is nearly invisible (`deferred-work.md`, code review of spec-14-3). The `:92` leaf pins that it is still painted, with no edge.

## Next

Story 14.3's pipeline is complete. Story 14.4 (`search-the-boxes`) is the next story of Epic 14. Start it with `bmad-testarch-atdd`.
