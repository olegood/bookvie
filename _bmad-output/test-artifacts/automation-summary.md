---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-18'
storyId: 'back-to-top-button'
storyKey: ''
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-back-to-top-button.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-back-to-top-button.md
  - _bmad-output/implementation-artifacts/deferred-work.md (the spine popover layering entry from the code review)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts; frontend/e2e/fixtures.ts; frontend/e2e/global-setup.ts
  - frontend/e2e/back-to-top.ts; frontend/e2e/back-to-top.spec.ts
  - frontend/src/components/BackToTop.tsx + BackToTop.module.css; frontend/src/components/Button.tsx
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

# Automation Summary: Back to top button (standalone spec)

The previous version of this file held the summary for story 11.4. It's in git history (`ff50bbd`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place. The spec changes only the frontend.
- **Mode:** BMad-Integrated. The spec is `done` after `bmad-code-review` (commit `238c079`, working tree clean at the start of this run). The spec and ATDD checklist are present. It is a standalone spec, so there is no story key.
- **Config:** `tea_use_playwright_utils: false`, and playwright-utils isn't installed, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). There are no Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:**
  - The ATDD checklist's 6 green-phase follow-ups.
  - The code review's deferred spine popover layering entry in `deferred-work.md`.

## Coverage Plan

Browser exploration was skipped. The ATDD leaves already pin the button's role, name and placement, and `BackToTop.tsx` is short. Everything is browser behavior: scroll position, layering, inert content, colors. So every new leaf is E2E, in one new file, `frontend/e2e/back-to-top-automate.spec.ts`. Scope is selective: each open follow-up gets one leaf, and nothing re-proves what the ATDD leaves already own.

| # | Target | Level | Priority | Source |
|---|---|---|---|---|
| 1 | A filter chip on: the button shows past one window and a press works (the chip stays pressed). A filter that leaves a short page shows no button even at the bottom | E2E | P2 | ATDD follow-up AC-1 filters |
| 2 | Scoped Card notes (`?book=`): shown past one window; a press scrolls to the top and focuses Search card notes | E2E | P2 | ATDD follow-up AC-3 scoped |
| 3 | Dark: `surface-inset`, `ink` and `input-border` dark twins, and the `accent` dark focus ring. Forced colors: a 1px solid border on every side, not `Canvas` or `ButtonFace` | E2E | P2 | ATDD follow-up AC-6 dark and forced colors |
| 4 | The spine popover paints above the shown button where they overlap | E2E | P2 | `deferred-work.md`, code review of spec-back-to-top-button |
| 5 | Behind the open New book panel the button is covered and can't take focus | E2E | P2 | ATDD follow-up Side panel |
| 6 | axe (WCAG 2.2 AA tags) on Catalog and Card notes with the button shown, light and dark | E2E | P2 | ATDD follow-up axe |

Not new tests:
- **"AC-1 resize"** is already proved by the resize step the build review added to AC-1 (`back-to-top.spec.ts:88`).

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session instead: six small leaves in one file didn't justify handing work to a worker. The API and backend workers had nothing to do, since there is no backend change. The output contract is unchanged.
- **Production code untouched:** `git status` lists only the new spec and the artifact files below. The mutation probe edited one source file and reverted that same edit (see Tests Added).

## Tests Added

`frontend/e2e/back-to-top-automate.spec.ts`:

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 52 | AC-1 with Unread on, the button shows at the bottom and a press focuses Search titles, the chip still pressed; Ebook on (no matches) leaves a short page and no button | P2 | not mutated |
| 78 | AC-3 scoped Card notes (Solaris, 50 notes): shown past one window, and a press focuses Search card notes | P2 | not mutated |
| 98 | AC-6 dark tokens and the `accent` dark ring; under forced colors the border is drawn (1px solid on every side, not `Canvas` or `ButtonFace`) | P2 | not mutated |
| 129 | The spine popover, moved over the shown button, is painted there | P2 | button `z-index` 10 → 30: the centre hit the button (`self`), wanted `dialog` |
| 153 | Behind the open New book panel: the page doesn't scroll, the button's centre isn't the button, and `focus()` can't land on it | P2 | not mutated |
| 180 | axe on Catalog and Card notes with the button shown, light and dark | P2 | not mutated |

**How the mutation was done:** a `sed` edit of `BackToTop.module.css` (`z-index: 10` → `30`), then the popover leaf alone, which failed as listed. The same `sed` edit was reversed. `git status` showed `frontend/src` unchanged, and no git command changed the tree. e2e global setup rebuilds the bundle on every run.

**Findings while writing the leaves:**
- Playwright's `getByRole` still finds the button under the modal panel. Inert content stays in its role query. So leaf 153 proves "not reachable" with `elementFromPoint` and a failed `focus()`, not with role absence.
- Seeded Books default to Paperback (`book_fields.py:155`), so the filter leaf uses Ebook for "no matches".

Priority coverage: P0 0, P1 0, P2 6, P3 0. The spec's P0 and P1 paths are the ATDD leaves.

## Validation

- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/back-to-top-automate.spec.ts e2e/back-to-top.spec.ts --repeat-each=2`: 32 passed, 0 flaky.
- Full `npm run check`: see the line below.
- No CLI browser session was opened. Temp artifacts are in the session scratchpad only.
- ATDD checklist: all 6 green-phase follow-ups ticked with their test lines. `grep -cF '[ ]'` gives 0.
- `deferred-work.md`: the popover layering entry has a `resolved:` line.

## Risks and Assumptions

- Leaf 129 moves the popover with inline `left`/`top`. That tests stacking, not `placePopover`'s placement. Whether a real placement ever reaches the button's corner isn't asserted.
- Leaf 153 covers only the New book panel. Card notes' Add and Edit card note panels use the same `showModal()` top layer, and the pile is a dialog too.

## Next

- `bmad-testarch-trace`, if a traceability matrix is wanted for this standalone spec. There is no epic gate for it.
- The two spine-drift entries (AD-6) stay open. The review deferred a process gap: a standalone spec's drift entries aren't picked up by the retro or the next-epic gate.
