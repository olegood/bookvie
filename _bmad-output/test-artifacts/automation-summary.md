---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-24'
storyId: '14.2'
storyKey: '14-2-see-my-card-notes-as-boxes'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-14-2-see-my-card-notes-as-boxes.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-14-2-see-my-card-notes-as-boxes.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - frontend/src/components/CardNoteBox.tsx, frontend/src/pages/CardNotesPage.tsx, frontend/src/components/ViewToggle.module.css
  - frontend/e2e/card-note-boxes.spec.ts, card-note-boxes.ts, card-note-boxes-dark-theme.spec.ts, restore.spec.ts, restore.ts, card-notes.spec.ts (XUI-E2E-002), back-to-top-automate.spec.ts, fixtures.ts
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

# Automation Summary: Story 14.2 See my card notes as boxes

## Preflight

- **Stack:** `fullstack` (auto). The story is frontend only: a Boxes · List toggle, the `CardNoteBox` component and a count line on the unscoped Card notes page. Every new target is an e2e leaf.
- **Gate:** `sprint-status.yaml` at HEAD (`3fc7763`) says `14-2-…: done`, and the tree was clean at the start.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 10 open green-phase follow-ups and the spec's I/O matrix and Review Findings.
- **Generation:** sequential, in this session. The leaves reuse the ATDD module's seeds and helpers (`card-note-boxes.ts`), so a worker would need this session's reading anyway.
- **Knowledge:** the six core fragments, plus Traditional Patterns (`fixture-architecture.md`, `network-first.md`) and `playwright-cli.md`. `@seontechnologies/playwright-utils` isn't in `package.json`, so the Playwright Utils branch didn't open. There is no Pact artifact. No browser session was opened for exploration: the ATDD run had already probed the page, and the leaves pin only roles, names and computed styles that the ATDD helpers read.

## Coverage plan

The 12 ATDD leaves cover AC-1 to AC-12, and the review's explicit-Dark leaf (`card-note-boxes-dark-theme.spec.ts`) covers the dark shadow through the Theme toggle. The build had already written the unit follow-up (`cardNotes.test.ts`, `cardNotesView.test.ts`). This run adds one e2e leaf for each of the other 9 follow-ups, in `frontend/e2e/card-note-boxes-automate.spec.ts`:

| Follow-up | Priority | Level | Leaf |
|---|---|---|---|
| AC-3 restore | P1 | E2E | `:69` a restore of another library's export keeps `bookvie.cardNotesView` as it was, for `"boxes"` and for `"list"`. The kept `"list"` then opens List on the restored library. |
| AC-3 dark and forced colors | P2 | E2E | `:98` in dark, the toggle's computed look (group, pressed and unpressed options) equals the Catalog view toggle's. Under forced colors, the pressed option's bottom border is `Highlight` and the unpressed one's isn't. |
| AC-5 twins | P2 | E2E | `:119` two Books titled "Emma", seeded in reverse id order, get two boxes in Book-id order (`href`), both named "Emma, 1 card note". The count line reads "2 card notes in 2 Books". |
| AC-6 near-white front | P2 | E2E | `:139` a `#FFFFFF` spine color: the front is white at (0, 80) 216 × 116, with the light box-front shadow and a 0px border, and 3 cards show. |
| AC-7 axe | P1 | E2E | `:167` Boxes view passes axe (`AXE_TAGS`) in light and dark, with Candide's box focused by keyboard. |
| AC-8 count line copy | P2 | E2E | `:186` "12 card notes in 1 Book", in `ink-tertiary` dark (`#9A9E94`) in dark. "1 card note in 1 Book" was already pinned by AC-9 (`card-note-boxes.spec.ts:511`) and `cardNotes.test.ts:310`. |
| AC-8 refetch | P1 | E2E | `:202` a note added to Austerlitz from another context: after a focus refetch, the line reads "56 card notes in 7 Books", and Austerlitz's box is second, in title order. No alert. |
| AC-10 typing back to blank | P2 | E2E | `:232` "Emma" typed, then deleted one character at a time. "Emm", "Em" and "E" still show no boxes, and the empty field brings back the six boxes and the count line, with no groups and Boxes still pressed. |
| AC-11 automate | P2 | E2E | `:258` with `MANY_BOXES` at 1280 × 720, scrolled to the bottom with Back to top shown, Boxes view passes axe in light and dark. |

## Defect found and fixed

The two axe leaves (`:167` and `:258`) failed on the first run. axe 4.14 reported `label-content-name-mismatch` (WCAG 2.5.3 Label in Name, impact "serious") on every box link. The link's `aria-label` reads "Anathem, 21 card notes", but its visible text ran the title and count spans together as "Anathem21 card notes", which isn't inside the name.

- **Fix:** one space text node between the title and count spans in `frontend/src/components/CardNoteBox.tsx`. Oleg chose this fix in this run, over deferring it or reopening the story. The label is a flex column, so the space renders nothing, and the name is unchanged.
- **Probe before the choice:** the space was added, the app rebuilt, and the 22 Story 14.2 e2e leaves (12 ATDD, 1 dark-theme, 9 automate) passed. The edit was then reverted and the app rebuilt, before Oleg answered.
- The ATDD and review leaves never ran axe on Boxes view, so this gap was invisible to them.

## Files

- **Created:** `frontend/e2e/card-note-boxes-automate.spec.ts`, with 9 leaves. It imports the seeds and locators from `card-note-boxes.ts`, and has a module-local `toggleLook` (the same computed-style pick as the ATDD AC-3 leaf's inline `look`, which the ATDD file can't export) plus the DESIGN.md literals `BOX_FRONT_SHADOW` and `INK_TERTIARY_DARK`.
- **Changed (source):** `frontend/src/components/CardNoteBox.tsx`: the space and a one-line comment.
- **Updated:** the ATDD checklist. All 10 green-phase follow-ups are ticked with their evidence. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **The axe leaves can fail:** they failed on the shipped code and passed only with the fix.
- **Story leaves:** `TZ=Europe/Madrid npx playwright test e2e/card-note-boxes-automate.spec.ts e2e/card-note-boxes.spec.ts e2e/card-note-boxes-dark-theme.spec.ts` gave 22 passed with the fix.
- **Full check, after the fix and the new leaves (2026-11-24):** `npm run check` exited 0. pytest 2508 passed, unit 406 passed, e2e 825 passed (the review's 816, plus 9), smoke passed. oxlint, `tsc -b` and Prettier were clean.
- **Quality checklist:**
  - No hard waits.
  - No conditionals: the two `for` loops run fixed lists.
  - Every leaf seeds its own server, so they are parallel-safe. The restore leaf stops and removes its target server in `finally`.
  - One subject per leaf.
  - No skips or focus.
  - Exact values throughout: names, `href`s, computed colors and shadows, axe violation lists compared with `[]`.
- **No CLI browser sessions** were opened. The one probe file (`e2e/zz-axe.probe.spec.ts`) was removed with `rm`, and `git status` showed no leftovers.

## Assumptions and risks

- The restore leaf seeds the target with one other Book, so the restore really replaces data. It asserts only the stored key and the view it opens, not the restored data, which `restore.spec.ts` covers.
- `toggleLook` copies the ATDD leaf's style pick. If the toggle's look gains a property, both need it.
- The twins leaf relies on the view ordering by title, then Book id (AD-6). It asserts the `href` order, not the title order.

## Next

Story 14.2's pipeline is complete. Story 14.3 (`see-the-open-box-in-its-book-s-color`) is the next story of Epic 14. Start it with `bmad-testarch-atdd`.
