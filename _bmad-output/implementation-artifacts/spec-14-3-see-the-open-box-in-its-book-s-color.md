---
title: "Story 14.3: See the open box in its Book's color"
type: 'feature'
created: '2026-11-24'
baseline_revision: '7d0ddff9668588776b378b0b8d363cb1f51df40d'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-14-3-see-the-open-box-in-its-book-s-color.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the Capability → Architecture Map still lists the open box strip as "Epic 14, planned".
    evidence: |-
      Spine Check, build-auto review of Story 14.3: ARCHITECTURE-SPINE.md lines 556 and 568 (the FR-17 to FR-19 row and its lead-in). The code is right; the spine is out of date. Widens the 14.2 drift entry.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      AC-1's "reached from Book detail" for a Book with no notes names a route that doesn't exist; the leaf uses the Main book card's bare "See card notes" (same URL).
    evidence: |-
      CardNotesBlock.tsx renders "See all card notes" only when notes.length > 0 (card-notes.spec.ts:571). The wording predates the story; fix it in epics.md, e.g. at the Epic 14 retro.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Story 14.3, AC-1)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Opening a box lands on the scoped Card notes page, which looks the same for every Book, so nothing tells Oleg which box he is in (UX-DR89, AR62/AR63).

**Approach:** On the scoped page, once the view is `ready`, render the open box strip: an 8px, full-window-width, `aria-hidden` band in `scope.spineColor` exactly, directly under the app shell and above the page's top padding. Everything else on the scoped page stays as it is.

## Boundaries & Constraints

**Always:**
- The strip shows only when `bookId` is set and the view is `ready` (notes or no notes). Never while loading, never under "Couldn't load", never on the unscoped Boxes or List views, never on the not-found page.
- Its fill is `scope.spineColor` exactly, read or unread, never a `spine-unread-*` color, the same in both themes. It is painted with `background-color` on one element; no border, outline, shadow, text or pseudo-element.
- Under `forced-colors: active`: `forced-color-adjust: none; background-color: CanvasText` (DESIGN.md → Forced colors). The color travels as an inline custom property (e.g. `--strip-color`), so the media rule overrides it without `!important`.
- Its height comes from DESIGN.md `components.open-box-strip.height` via a new `--open-box-strip-height: 8px;` in `tokens.css`, copied character for character, the file edited by hand and never formatted.
- The strip sits outside `.page` (so no `page-x` inset), and `.page`'s padding stays `--space-page-top`, so the `h1` starts 8 + 24px under the strip's top.

**Never:**
- No server, API, schema, backup or agent-tool change. No change to the unscoped views, the chip, search, Add card note, Edit, pile, focus return or Back to top.
- No edit to existing e2e specs or helpers; `open-box.spec.ts` changes only by removing `test.skip` and its red-phase comments.
- No shelf search (14.4), no carried search (14.5).
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open box with notes | `?book=<id>`, view ready | strip in `scope.spineColor`, then the scoped page | — |
| Open box, no notes | `?book=<id>`, no groups | strip, "No card notes yet.", Add card note | — |
| Loading | view pending | `h1` only, no strip | — |
| Failed | view 500 | "Couldn't load…", Try again, no strip | — |
| Unscoped | `/card-notes` | no strip | — |
| Forced colors | `forced-colors: active` | `CanvasText` fill, `forced-color-adjust: none` | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CardNotesPage.tsx:331` `return <CardNotesFrame>{content()}</CardNotesFrame>` -- `CardNotesFrame` (`:381`) renders `.page` with the `h1`. Give it an optional `stripColor` and render the strip before `.page` (a fragment). Pass `view.status === 'ready' && scope !== null ? scope.spineColor : null`. `content()` already returns `null` while loading and the failure block when failed. `view.status === 'missing'` returns `NotFoundPage` before the frame, so no strip there.
- `frontend/src/pages/CardNotesPage.module.css` -- `.page` (flex column, padding `--space-page-top --space-page-x`). Add `.strip` (`height: var(--open-box-strip-height)`, `background-color: var(--strip-color)`) and its forced-colors rule.
- `frontend/src/components/AppShell.module.css:121` -- `main` is `display: block` with no padding, directly after the `header` (top bar plus the optional update notice), so a block before `.page` starts at the header's bottom and spans the window width.
- `frontend/src/styles/tokens.css:212` -- end of the `--card-note-box-*` literals in the `:root` components block; add `--open-box-strip-height: 8px;` there. Not theme-dependent, so no dark-block copy.
- DESIGN.md `components.open-box-strip` (line 519), the Open box strip row (line 813), Layout & Spacing → Card notes (line 752), Forced colors (line 704).
- `frontend/e2e/open-box.spec.ts` -- the 3 red leaves (AC-1 `:49`, AC-2 `:176`, AC-3 `:202`). `openBoxStrip` (`card-note-boxes.ts`) finds the first element outside the header and dialogs with a non-transparent background, under 40px tall and ≥ half the window wide; nothing painted like that may come before the strip in DOM order.
- Deferred-work intake: none name story 14.3.

## Tasks & Acceptance

**Execution:**
- `frontend/src/styles/tokens.css` -- add `--open-box-strip-height: 8px;` after `--card-note-box-focus-offset`, by hand -- AC-3.
- `frontend/src/pages/CardNotesPage.module.css` -- `.strip` and `@media (forced-colors: active) { .strip { forced-color-adjust: none; background-color: CanvasText } }` -- AC-1.
- `frontend/src/pages/CardNotesPage.tsx` -- `CardNotesFrame` takes `stripColor: string | null` and renders `<div className={styles.strip} aria-hidden="true" style={{ '--strip-color': stripColor }} />` before `.page` when set; the body passes the ready scope's `spineColor`; update the page's doc comment -- AC-1, AC-2.
- `frontend/e2e/open-box.spec.ts` -- remove each `test.skip` and its red-phase comment.

**Acceptance Criteria:**
- Given the 3 leaves in `open-box.spec.ts` (AC-1 to AC-3 in the ATDD checklist), when they run un-skipped, then all pass.
- Given the existing Card notes, Card note boxes, Back to top and app-shell e2e specs, when the full suite runs, then they pass with no edit to their files.
- Given `npm run check`, when it runs, then it exits 0.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 16 findings — high 0, medium 0, low 10, false 6, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine) Spine drift (AD-6), reconciled before the next epic: the Capability → Architecture Map's FR-17 to FR-19 row and lead-in still call the open box strip "Epic 14, planned". — The code is right and the spine is out of date; deferred to `deferred-work.md`.
  - `[low]` `[defer]` (intent) AC-1's "reached from Book detail" route for a Book with no notes doesn't exist; the leaf uses the Main book card's "See card notes". — Book detail links only with notes (`CardNotesBlock.tsx`). The AC wording predates this story and no code is wrong; deferred to `deferred-work.md` for an `epics.md` wording fix.
  - `[false]` `[reject]` (intent) "As before Epic 14" isn't compared against earlier behavior. — The diff touches only the frame wrapper, and the pre-existing Card notes, pile, Back to top and app-shell specs pass unedited in the full `npm run check` (829 e2e passed).
  - `[false]` `[reject]` (intent) The explicit `data-theme="dark"` path isn't exercised. — The fill is an inline `spineColor` with no token lookup, so no theme rule can change it.
  - `[false]` `[reject]` (intent) AR63's "one matcher … for the open box" isn't touched. — That clause is search behavior for Stories 14.4/14.5; Story 14.3's ACs add no search.
  - `[low]` `[reject]` (blind) The new `open-box-unscoped.spec.ts` sits outside the spec's Tasks. — Step 3's Matrix Test Audit required a covering test for the "Unscoped → no strip" row, and the ATDD file may change only by its un-skips, so the leaf lives in its own file, as 14.2's review did. Its fix would edit this spec; recorded in the Auto Run Result instead.
  - `[low]` `[patch]` (blind) Removing the chip landed in List view only because of an earlier List press, so the default Boxes path was never checked. — The leaf now presses Boxes again before opening the box, so "Remove In Candide" lands in Boxes view.
  - `[low]` `[patch]` (blind) The one-shot null checks were gated on a single visible box. — Each Boxes check now waits for all 6 box links first (List waits for all 6 group titles).
  - `[low]` `[patch]` (blind) `ALL_GROUPS`'s comment named `PILE_SHELF` though it is built from `PILE_BOXES`. — Comment corrected. The suggested shared export would touch the ATDD helpers; not done.
  - `[low]` `[reject]` (blind) No test opens an unknown Book and checks for no strip. — `view.status === 'missing'` returns `NotFoundPage` before `CardNotesFrame` renders; no plausible edit to this code reaches it, and Verification Gap agreed.
  - `[low]` `[reject]` (blind) The unscoped leaf reuses the "AC-1" label. — Several leaves per AC is the repo's norm (14.2's dark-theme leaf is also AC-6); the leaf does check part of AC-1's "only once the view has loaded / on the open box" boundary.
  - `[false]` `[reject]` (blind) `view.status === 'ready'` in the strip condition is redundant. — True that `scope` is only non-null when ready, but no bad outcome follows; the explicit check states the rule the spec names.
  - `[low]` `[reject]` (blind) The Code Map's line numbers are off. — The fix edits this build's spec.
  - `[low]` `[defer]` (blind) The AC wording problem has nowhere to land. — Same root cause as the intent row above; now in `deferred` and `deferred-work.md`.
  - `[low]` `[reject]` (blind) The `oversized` warning is unexplained. — It is the template's mechanical size rule (over ~1600 tokens); the fix edits this spec.
  - `[false]` `[reject]` (blind) The strip's "directly under the app shell" relies on `main` having no padding, with no warning. — AC-1's leaf asserts `strip.top === headerBottom`, so padding added to `main` would fail the suite.
  - Edge Case Hunter and Verification Gap found nothing.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why the frame:** the strip must sit above `.page`'s padding and outside its `page-x` inset; `CardNotesFrame` is the one place that owns `.page`. The body keys on `bookId`, so a new scope remounts and the strip follows the new view's state.
- **AC wording (from the ATDD checklist):** AC-1 says the no-notes open box is "reached from Book detail", but Book detail links "See all card notes" only with notes. The leaf uses the Main book card's bare "See card notes", the same URL. Left for the review to fix or defer.

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/open-box.spec.ts` -- expected: 3 passed.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/app-shell.spec.ts e2e/card-note-boxes.spec.ts e2e/card-notes.spec.ts` -- expected: pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** Opening a box now shows the open box strip on the scoped Card notes page. The strip is an 8px, full-window-width, `aria-hidden` band in `scope.spineColor` exactly, directly under the app shell and above the page's top padding. It shows only once the view is ready, with notes or without, and is `CanvasText` under forced colors. The rest of the scoped page is unchanged, and so are the unscoped views, the server and the backup format.

**Files changed:**
- `frontend/src/pages/CardNotesPage.tsx`: `CardNotesFrame` takes `stripColor` and renders the strip before `.page`. The body passes the ready scope's `spineColor`, else `null`.
- `frontend/src/pages/CardNotesPage.module.css`: `.strip` (height from the token, fill from the inline `--strip-color`) and its forced-colors rule.
- `frontend/src/styles/tokens.css`: `--open-box-strip-height: 8px;`, edited by hand and not formatted.
- `frontend/e2e/open-box.spec.ts`: the 3 ATDD leaves un-skipped, with their red-phase comments removed.
- `frontend/e2e/open-box-unscoped.spec.ts` (new): a leaf that checks the unscoped Boxes and List views have no strip, and that "Remove In Candide" takes it away. Step 3's matrix audit added it, because no test covered the "Unscoped" row. A mutation that drew the strip on the unscoped page made it fail.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the two deferrals below.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: `14-3-…` set to `review`.

**Review findings.** There were 16 findings: low 10, false 6.
- **Patched, all low, all in `open-box-unscoped.spec.ts`:**
  - "Remove In Candide" now lands in the default Boxes view.
  - The null checks wait until every box or group has rendered.
  - The comment on `ALL_GROUPS` is corrected.
- **Deferred, both low:**
  - Spine drift (AD-6): the strip is still listed as "planned" in the spine.
  - AC-1's "reached from Book detail" wording names a route that doesn't exist.
- **Rejected:** 11, each with its reason in the Review Triage Log. 6 were false. 5 were low: the leaf being outside the spec's Tasks, the not-found test, the AC-1 label, and two whose fix edits this spec.
- Edge Case Hunter and Verification Gap found nothing.

**Follow-up review recommendation:** false. Patched: high 0, medium 0, low 3.

**Verification:**
- Story 14.3 and nearby specs: `TZ=Europe/Madrid npx playwright test e2e/open-box.spec.ts e2e/app-shell.spec.ts e2e/card-note-boxes.spec.ts e2e/card-notes.spec.ts` gave 56 passed.
- `open-box-unscoped.spec.ts`: 3 passing runs in a row, both before and after the patches.
- `npm run check` after the patches: exit 0. That covers check:api, check:py (2508 passed), check:e2e (829 passed) and check:smoke.

**Residual risks:**
- The first version of the unscoped leaf found that, right after "Remove In Candide", the old scoped page stays on screen for a moment before the unscoped page renders. Strip included, it was gone within 300 ms. This is the existing route transition, not a stuck strip, and the leaf now waits for the unscoped page before checking.
- The ATDD checklist's green-phase follow-ups are left for `bmad-testarch-automate`: axe, unread color, near-white color, update notice, window widths, refetch and color change.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
