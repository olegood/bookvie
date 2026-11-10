---
title: 'Step through the Card notes pile with the arrow keys'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: 'ab8fe6636dc76975f47aa8a6bc82989ef2820ff2'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md'
  - '_bmad-output/implementation-artifacts/spec-5-4-go-through-a-book-s-notes-as-a-pile.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In the Card notes pile (story 5.4), the only way to step from note to note is the **Previous** and **Next** buttons. Focus opens on Next, so Enter or Space works until you reach the end. But once focus is on Close or the Order group, you have to Tab back to a button first. That breaks the flip-flip-flip rhythm of going through a pile.

**Approach:** Let the arrow keys and Home/End step through the notes from anywhere in the pile, except inside the Order radio group. There, the arrow keys already pick the order, and taking them over would switch the order and step at the same time. Each key does exactly what its button does: it calls the same move, with the same announcement and the same no-wrap ends. Focus doesn't move. There's no visible hint. Previous and Next expose their shortcut through `aria-keyshortcuts`.

## Boundaries & Constraints

**Always:** Keys reuse the buttons' move: same polite `status` text "Note N of M, *ref*: *text*", same no-wrap ends. The Tab focus trap from `useAlertDialog` keeps working. Esc closes as before.

**Never:** A visible keyboard hint. Wrap-around. Moving focus when a key steps. Changing what the arrow keys do on the Order radios. Changes to `useAlertDialog.ts`, `usePileFlow.tsx`, the backend or the API.

**Decisions (Oleg, 2026-11-10):**
- No visible hint (DESIGN.md is unchanged).
- Home and End are in scope: they jump to the first and last note.
- A standalone spec, not a sprint change proposal (no correct-course).

</frozen-after-approval>

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Step forward | Right, focus on Next/Close/Previous, not at last | `move(index + 1)`: note, "N of M" and `status` update; focus stays; `preventDefault` | No error expected |
| Step back | Left, not at first | `move(index - 1)`, as above | No error expected |
| Jump | Home / End, not already there | `move(0)` / `move(total - 1)`, announced | No error expected |
| At an end | Right at last, Left at first, Home at first, End at last, any key in a 1-note pile | Nothing changes, nothing announced, still `preventDefault` | No error expected |
| On a radio | any of the 4 keys, target is `input[type=radio]` | No step; arrows keep native radio behaviour (switch order); Home/End are `preventDefault`-ed so the dialog doesn't scroll | No error expected |
| Modified | Alt/Ctrl/Meta/Shift + any of the 4 keys | Pile ignores it, not `preventDefault`-ed | No error expected |
| Other keys | Tab / Shift+Tab / Esc | Unchanged: Tab trap via `dialogProps.onKeyDown`, Esc via `onCancel` | No error expected |

## Code Map

- `frontend/src/components/CardNotesPile.tsx` -- the only code change. `move(to)` (guards `sequence[to]`, sets index and `spoken`) is the shared step; `index`, `total`, `sequence` in scope. `dialogProps` from `useAlertDialog` is spread on `<dialog>` and carries `onKeyDown: keepFocusInside` (the Tab trap) and `onCancel`; the new `onKeyDown` must be passed **after** the spread and call `dialogProps.onKeyDown(event)` first. Order radios are `<input type="radio">` inside the `radiogroup`. Doc comment above the component describes the pile; extend it with the keys.
- `frontend/src/components/Button.tsx` -- read-only. Spreads `...rest` onto `<button>`, so `aria-keyshortcuts` passes through. Its `aria-disabled` click guard is irrelevant to keys, which call `move` directly.
- `frontend/src/lib/useAlertDialog.ts`, `frontend/src/lib/usePileFlow.tsx` -- read-only (Never list).
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- § Pile (line ~257); add the **Keyboard** bullet right after **Ends** (line ~263).
- `frontend/e2e/card-notes-pile-keys.spec.ts` -- 8 ATDD leaves (`test.skip`), one per AC, using the 4-note Dune pile and 1-note Neuromancer pile from `LIBRARY` in `frontend/e2e/pile.ts`. Un-skip them and drop the "RED (ATDD)" comments.
- `frontend/e2e/card-notes-pile.spec.ts` -- story 5.4's pile tests incl. axe in light and dark; must stay green (covers AC-7's axe part).
- Non-story work: no `story_key`, so no sprint-status, README or deferred-work intake.

## Tasks & Acceptance

**Execution:**
- `frontend/src/components/CardNotesPile.tsx` -- add a dialog `onKeyDown` after `{...dialogProps}`: call `dialogProps.onKeyDown(event)`; return if any of alt/ctrl/meta/shift is held or `event.target` is an `HTMLInputElement` of type `radio`; map ArrowLeft → `index - 1`, ArrowRight → `index + 1`, Home → `0`, End → `total - 1`; for a mapped key `event.preventDefault()`, and call `move(to)` only when `to !== index` and `sequence[to]` exists. Add `aria-keyshortcuts="ArrowLeft"` to Previous and `"ArrowRight"` to Next. Extend the doc comment. -- the feature itself.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- insert the **Keyboard** bullet below after **Ends** -- the UX spec stays the source of truth.
- `frontend/e2e/card-notes-pile-keys.spec.ts` -- un-skip all 8 leaves, remove the RED markers and the "guard criteria pass on today's code" header paragraph -- turns the ATDD scaffolds green.

EXPERIENCE.md bullet (verbatim):

> - **Keyboard:** Left and Right do what Previous and Next do; Home and End go to the first and last note. They work wherever focus is in the pile except on the Order radios, where the arrow keys keep picking the order, and Home and End do nothing. A key held with Alt, Ctrl, Meta or Shift is left to the browser. Focus stays where it is; the move is announced like a button press ("Note 3 of 7, p.42: *text*"). At an end the key does nothing: no wrap and no announcement. Previous and Next carry `aria-keyshortcuts` ("ArrowLeft", "ArrowRight"). There is no on-screen hint.

**Acceptance Criteria:**
- AC-1: Given the pile open with focus on Next, Close or Previous, when Right / Left is pressed, then the next / previous note shows, `status` reads "Note N of M, *ref*: *text*" as for a button press, "N of M" follows, and focus stays on that element.
- AC-2: Given the pile open, when Home / End is pressed, then the first / last note of the current order shows with the same announcement; and given the pile already on the first / last note, when Home / End is pressed, then nothing changes and nothing is announced.
- AC-3: Given the pile on its last / first note, when Right / Left is pressed, then nothing changes, nothing is announced and `aria-disabled` is unchanged; given a one-note pile, when any of the four keys is pressed, then nothing happens.
- AC-4: Given focus on an Order radio, when Left/Right is pressed, then the checked order switches, the pile restarts at "1 of M" and the note doesn't step again; when Home/End is pressed there, then the note doesn't change.
- AC-5: Given the pile open, when any of the four keys is pressed with Alt, Ctrl, Meta or Shift, then the pile doesn't step and the event isn't `preventDefault`-ed.
- AC-6: Given the pile handles one of the four keys (including at an end), when it is pressed, then the event is `preventDefault`-ed so neither the dialog nor the page scrolls.
- AC-7: Given the pile open, then Previous has `aria-keyshortcuts="ArrowLeft"`, Next has `aria-keyshortcuts="ArrowRight"`, nothing else in the pile has one, there is no on-screen hint, and axe finds nothing in light and dark.
- AC-8: Given Shuffled order, when the keys are used, then they follow the shuffled sequence, End reaches "M of M", and closing there focuses that note's Edit (story 5.4 AC-6).

### Review Findings

Code review 2026-11-10, of commits `ab8fe66..c792de6`. 17 findings from 5 layers: 0 decision-needed, 0 patch, 1 defer (2 findings), 14 rejected. Spine check: none (AD-1, AD-3, AD-6, AD-7, AD-15, AD-17). Verification gap: none.

- [x] [Review][Defer] bmad-build-auto set this spec to `done` before bmad-code-review ran, and its rewrite dropped the "Pipeline" note [_bmad-output/implementation-artifacts/spec-pile-arrow-key-navigation.md:5] — deferred: build-auto's persistent facts treat any spec with no `story_key` as non-story work and mark it `done`, although this standalone spec asked for the full story pipeline. Fixing it means editing build-auto's customization (agent context), not this change. Users weren't affected: this review is the gate, and it confirms `done`. (edge-case-hunter + blind-hunter)

**Rejected:**
- `low` (acceptance) The ATDD checklist was edited although the Code Map doesn't list it — a one-line, docs-only fix of a stale reference; no harm.
- `low` (acceptance, blind) `sequence[to]` is checked twice — the spec's Execution asks for it; no caller would diverge.
- `low` (acceptance, blind) AC-6's "no scroll" is tested only through `defaultPrevented` — carried from the build's triage; a browser probe showed no scroll, and `preventDefault` is the mechanism.
- `false` (blind) The ACs were reworded but the Spec Change Log is empty — that log is for review loopbacks only, and there were none; the AC-7 additions match assertions the ATDD test already made.
- `false` (blind) The ATDD checklist's AC texts and red-phase body are out of date — project convention keeps checklists as red-phase records (the 5.4 checklist still says `test.skip`).
- `low` (blind) AC-5 covers only modified forward keys — carried; the modifier guard is one branch for all four keys, and Verification Gap showed that dropping any modifier check fails AC-5.
- `low` (blind) `keyTarget` has no unit test — carried; AC-1, AC-2 and AC-8 fail when any mapping is swapped.
- `false` (blind) Home/End on a radio aren't prevented and scroll — carried; the probe left `scrollTop` unchanged on an overflowing dialog. **Corrected by automate (2026-11-10):** the probe was wrong (it read too early). This was real and is fixed, see Spec Change Log.
- `false` (blind) Without a `defaultPrevented`/`isComposing` check, a future child could double-step — the pile has no text field, link or other key-handling child today; this is a hypothetical.
- `false` (blind) Spec rationale was dropped (the 1000-line split, why Ends is unedited) — the fix edits the spec under review.
- `false` (blind) The Code Map uses line numbers for EXPERIENCE.md — the fix edits the spec under review.
- `false` (blind) Right-to-left text isn't addressed — the app is left-to-right only; no `dir` is used anywhere in `frontend/`.
- `false` (blind) `review_loop_iteration` is 0 after a review pass — it counts bad_spec loopbacks, and there were none.
- `false` (blind) The Verification command differs from CI's (TZ, build) — carried; the fix edits the spec under review, and the keys tests use no dates.

## Spec Change Log

### 2026-11-10 — bmad-testarch-automate correction
- **Trigger:** the automate E2E worker found that Home on a focused Order radio scrolls an overflowing pile dialog (360×300: `scrollTop` 91 → 0; re-probed 64 → 0 after the scroll settled). The build review's probe (`scrollTop` 118 → 118) read before Chromium's smooth keyboard scroll had started, so both reviews wrongly rejected this as `false` (the edge-case and blind rows in the Review Triage Log, and "Home/End on a radio aren't prevented and scroll" under Review Findings → Rejected).
- **Amended (Oleg chose to fix it now):** the "On a radio" row of the I/O matrix. In `CardNotesPile.tsx`, `stepByKey` now `preventDefault`s Home and End on a radio and still doesn't step. The arrows stay native. This matches EXPERIENCE.md's "Home and End do nothing" there, which is unchanged.
- **Known-bad state avoided:** on a short viewport, Home or End on the Order radios jumped the dialog's scroll.
- **Test:** `frontend/e2e/card-notes-pile-keys.spec.ts`, the `[P2] AC-6 in an overflowing pile…` leaf, asserts that both scroll values are unchanged after Home on the radio. It fails with the `preventDefault` removed.

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 19 findings — high 0, medium 0, low 10, false 9, maybe-false 0
- findings:
  - `[false]` `[reject]` (edge-case) Home/End on an Order radio aren't prevented, so an overflowing dialog scrolls — a probe at a 360×300 viewport (dialog scrollHeight 380, clientHeight 262) with focus on the Page order radio at scrollTop 118: Home left scrollTop at 118, so the dialog didn't scroll.
  - `[low]` `[patch]` (blind) The ATDD checklist cites the spec's removed "Implementation Notes" section — fixed: `atdd-checklist-pile-arrow-key-navigation.md:13` now cites Intent, I/O matrix, Code Map, Tasks & Acceptance.
  - `[low]` `[reject]` (blind) The Verification e2e command leaves out `TZ=Europe/Madrid` and the build — the fix edits this build's spec; the keys tests use no dates, and CI runs the TZ form anyway.
  - `[false]` `[reject]` (blind) Home/End on a radio scroll the dialog — the same probe as the edge-case row: no scroll.
  - `[false]` `[reject]` (blind) After a click on the note text, focus falls to body and the keys stop — a probe found `document.activeElement` is DIALOG after the click, and Right then stepped to "2 of 4".
  - `[low]` `[reject]` (blind) AC-5 sends only modified forward keys — the guard is one branch covering all four keys, and Verification Gap showed that dropping it fails AC-5; adding test leaves is more than a direct correction.
  - `[low]` `[reject]` (blind) `keyTarget` has no unit test — swapped mappings already fail AC-1/AC-2 (Verification Gap layer); a new test file is more than a direct correction.
  - `[low]` `[reject]` (blind) `sequence[to]` repeats `move`'s guard — the spec's Execution requires it, and the duplicate is harmless, with no caller that would diverge.
  - `[low]` `[reject]` (blind) Home/End have no `aria-keyshortcuts` — the intent names only Previous and Next, and AC-7 fixes exactly two; the fix edits this build's spec.
  - `[false]` `[reject]` (blind) The spec's review logs are empty while it's in-review — this log is written at review time, as the workflow requires.
  - `[low]` `[reject]` (blind) The doc comment duplicates the EXPERIENCE bullet — it matches the component's existing doc-comment style, and no harm is named.
  - `[low]` `[patch]` (blind) The test header has a leftover short line — fixed: rewrapped `card-notes-pile-keys.spec.ts:1-7` with the same words.
  - `[false]` `[reject]` (intent) Reading A2: keys stop after a pointer click inside the pile — the probe shows focus goes to the dialog and the keys keep working.
  - `[low]` `[reject]` (intent) AC-6's "no scroll" is checked by proxy through `defaultPrevented` — `preventDefault` is the mechanism, so a scroll measurement would add little.
  - `[low]` `[reject]` (intent) The announcement is checked as DOM text, not real screen-reader speech — the same polite region as the buttons; AT automation is out of reach for this suite.
  - `[false]` `[reject]` (intent) Tab trap/Esc aren't re-tested in the new file — `card-notes-pile.spec.ts:391` (Tab) and its Esc tests ran green through the composed handler, and AC-8 presses Escape.
  - `[false]` `[reject]` (intent) B1 vs B2 on the radios — the intent says the keys work "except inside the Order radio group", which reads as all keys; AC-4 and EXPERIENCE agree.
  - `[false]` `[reject]` (intent) The tests predate the code — that's ATDD by design, and Verification Gap confirmed each guard is load-bearing.
  - `[low]` `[reject]` (intent) The no-hint check catches text only — the diff adds no icon or pseudo-element hint, and a broader check isn't worth the complexity.
- Spine check: no findings (AD-1, AD-3, AD-6, AD-7, AD-15, AD-17). Verification gap: no gaps.
- **Correction (2026-11-10, automate):** the two `false` rows on Home/End on a radio scrolling were wrong. The probe read before the smooth scroll began. They're really `low`, now fixed (see Spec Change Log).

## Auto Run Result

**Summary:** In the Card notes pile, Left/Right step like Previous/Next and Home/End jump to the first and last note, from anywhere in the pile except the Order radios. Modified keys pass through. Handled keys are `preventDefault`-ed, even at an end. Focus stays put, a move is announced as for a button press, and there's no wrap. Previous and Next carry `aria-keyshortcuts`.

**Files changed:**
- `frontend/src/components/CardNotesPile.tsx` -- a `keyTarget` mapping, a `stepByKey` dialog handler chained after the `useAlertDialog` Tab trap, `aria-keyshortcuts` on Previous/Next, and the doc comment.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- the § Pile **Keyboard** bullet.
- `frontend/e2e/card-notes-pile-keys.spec.ts` -- the 8 ATDD leaves un-skipped, the RED markers removed, the header rewrapped.
- `_bmad-output/test-artifacts/atdd-checklist-pile-arrow-key-navigation.md` -- the stale spec-section reference fixed.

**Review:** 19 findings. Patched 2 (both low). Deferred 0. Rejected 17: 9 false, refuted by a browser probe or the code, and 8 low, with the reasons in the triage log.

**Follow-up review recommended:** false. The patches were 2 low and 0 medium/high.

**Verification:** `npm --prefix frontend run check:api` passes (281/281 unit tests). `npx playwright test e2e/card-notes-pile-keys.spec.ts e2e/card-notes-pile.spec.ts` gives 33 passed, 0 skipped, including the 5.4 axe light/dark and Tab-trap tests. Both were re-run after the patches.

**Residual risks:** None known. Real screen-reader output isn't automated, so only the status-region text is checked.

## Verification

**Commands:**
- `npm --prefix frontend run check:api` -- expected: passes (format, tsc, oxlint, unit tests).
- `cd frontend && npx playwright test e2e/card-notes-pile-keys.spec.ts e2e/card-notes-pile.spec.ts` -- expected: all pass, none skipped in the keys file.
