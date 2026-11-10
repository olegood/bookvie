---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-10'
storyId: 'pile-arrow-key-navigation'
storyKey: 'pile-arrow-key-navigation'
storyFile: '_bmad-output/implementation-artifacts/spec-pile-arrow-key-navigation.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-pile-arrow-key-navigation.md'
generatedTestFiles:
  - 'frontend/e2e/card-notes-pile-keys.spec.ts'
  - 'frontend/e2e/pile.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-pile-arrow-key-navigation.md (Intent, I/O matrix, Code Map, Tasks & Acceptance AC-1 to AC-8)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (§ Pile, Focus after close)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md (format, seeds, conventions)'
  - 'frontend/src/components/CardNotesPile.tsx, frontend/src/lib/useAlertDialog.ts, frontend/src/components/Button.tsx'
  - 'frontend/e2e/card-notes-pile.spec.ts (seeds and helpers), fixtures.ts, home.ts'
  - '.tea/enforce-config.json (maxFileLines 1000)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: supplied, text: 'With the pile open and focus on Next, Close or Previous, Right shows the next note and Left the previous; the pile''s status reads "Note N of M, ref: text" exactly as for a button press, "N of M" follows, and focus stays on the element that had it' }
  - { id: AC-2, idSource: supplied, text: 'Home shows the first note of the current order and End the last, with the same announcement; Home on the first note or End on the last changes nothing and announces nothing' }
  - { id: AC-3, idSource: supplied, text: 'Right on the last note and Left on the first change nothing and announce nothing; the buttons'' aria-disabled is unchanged; in a one-note pile all four keys do nothing' }
  - { id: AC-4, idSource: supplied, text: 'With focus on an Order radio, Left/Right move the checked option as today (the order switches, the pile restarts at "1 of M") and the note doesn''t step a second time; Home/End there do nothing to the note' }
  - { id: AC-5, idSource: supplied, text: 'Alt, Ctrl, Meta or Shift held with any of the four keys doesn''t step the pile, and the event isn''t preventDefault-ed' }
  - { id: AC-6, idSource: supplied, text: 'Each of the four keys, when the pile handles it, is preventDefault-ed, including at an end; neither the dialog nor the page behind it scrolls' }
  - { id: AC-7, idSource: supplied, text: 'Previous has aria-keyshortcuts="ArrowLeft" and Next has aria-keyshortcuts="ArrowRight"; axe still finds nothing on the open pile, in light and dark' }
  - { id: AC-8, idSource: supplied, text: 'In Shuffled, the keys follow the shuffled sequence; End reaches "M of M" of the shuffle, and closing from there focuses that note''s Edit (story 5.4 AC-6 unchanged)' }
---

# ATDD Checklist: Step through the Card notes pile with the arrow keys

**Date:** 2026-11-10
**Author:** Oleg
**Primary test level:** E2E (Playwright against the real `bookvie`)

---

## Summary

Left/Right step the pile like Previous/Next, and Home/End jump to the first and last note. This works anywhere in the pile except on the Order radios, which keep their native arrow keys. Keys with a modifier go to the browser. Focus stays where it is, each move is announced like a button press, an end does nothing, and every handled key is `preventDefault`-ed. Previous and Next carry `aria-keyshortcuts`. There's no visible hint.

**Source:** the standalone spec `spec-pile-arrow-key-navigation.md` (commit `8c313aa`). It isn't a sprint story, so there's no `story_key` in `sprint-status.yaml`. The checklist key is the spec's slug.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the tests use plain Playwright with the project's `fixtures.ts`.

**Generation mode:** AI generation from the spec and the shipped 5.4 component. Nothing was recorded in a browser: every locator already exists in 5.4's suite.

**Execution:** sequential, one author, as in earlier stories. There's no API half.

**No backend change.** The keys are client behavior inside `CardNotesPile.tsx`.

---

## Acceptance Criteria

The spec's ids are kept as supplied (AC-1 to AC-8). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Left/Right step like Previous/Next, announced, focus kept | E2E | P0 | `[P0] AC-1` |
| AC-2 | Home/End jump, announced; a no-op at the matching end | E2E | P0 | `[P0] AC-2` |
| AC-3 | No wrap and no announcement at the ends; a one-note pile ignores all four keys | E2E | P1 | `[P1] AC-3` |
| AC-4 | Order radios keep their arrow keys, with no extra step; Home/End do nothing there | E2E | P1 | `[P1] AC-4` |
| AC-5 | Modified keys don't step and aren't prevented | E2E | P1 | `[P1] AC-5` |
| AC-6 | Handled keys are `preventDefault`-ed, even at an end | E2E | P1 | `[P1] AC-6` |
| AC-7 | `aria-keyshortcuts` on Previous and Next | E2E | P1 | `[P1] AC-7` |
| AC-8 | Keys follow the shuffle; closing at End focuses that note's Edit | E2E | P1 | `[P1] AC-8` |

**Priorities:**
- **P0:** AC-1 and AC-2 are the feature itself.
- **P1:** the guards (AC-3 to AC-6), discoverability (AC-7), and the Shuffled path (AC-8). A broken guard is a real regression, but each one reuses AC-1's handler.

**Level:** E2E only.
- A keydown handler on a native `dialog`, with focus, `defaultPrevented` and live-region text, is only trustworthy in a real browser.
- There's no new pure logic worth a unit test: the move is 5.4's `move()`.

---

## Red-Phase Test Scaffolds Created

There are 8 leaves in `frontend/e2e/card-notes-pile-keys.spec.ts`, one per criterion.
- Each is `test.skip(...)`, with the reason in a comment on the line above. The TEA hook's C1 rule needs that comment.
- Each title carries exactly one `[P#] AC-n`. The `describe` is "Pile arrow keys", so `-g "Pile arrow keys.*AC-1"` won't also match 5.4's AC-1.

**The file split (TEA rule H5, 1000 lines max):**
- Adding the leaves to `card-notes-pile.spec.ts` pushed it to 1286 lines.
- The shared seeds and helpers moved, unchanged, into a new module, `frontend/e2e/pile.ts`:
  - the seeds: `LIBRARY`, Dune's notes and their page order, `NEUROMANCER_ID`;
  - the locators: `pile`, `pileOpener`, `position`, `announcement`, `nextButton`, `previousButton`, `orderGroup`, `group`;
  - the helpers: `press`, `announcedNote`, `seededRandom`, `DUNE_EDIT_BY_TEXT`.
- The 5.4 spec imports them from there and is now 880 lines. The 5.4 checklist had already anticipated this move ("if a third card-notes spec appears, move them into a shared module").

**Red check:** each leaf was run once un-skipped on the current code, using a throwaway copy. All 8 failed:

| Leaf | Fails at | Today |
|---|---|---|
| AC-1 | its first assertion, the `status` after Right | `""` |
| AC-2 | its first assertion, the `status` after End | `""` |
| AC-3 | its first assertion: the recorded announcements should be just "Note 3 of 4…" | `[]` |
| AC-4 | its control step, Right from Next → "2 of 4" | "1 of 4" |
| AC-5 | its control step, plain Right → "2 of 4" | "1 of 4" |
| AC-6 | its first assertion: all four keys `prevented: true` | all `false` |
| AC-7 | its first assertion, Previous's `aria-keyshortcuts` | missing |
| AC-8 | its first assertion, End → "4 of 4" | "1 of 4" |

**AC-4 and AC-5 are guards** that today's code already satisfies on its own: the radios pick the order, and modified keys do nothing. Each leaf therefore also steps once with a plain key. That control step makes the leaf red now and keeps "nothing stepped" from being vacuous after the build. This is a deliberate exception to "the first failing assertion is the criterion's own".

**AC-3** uses button presses as setup and isolates the criterion in one recorded-announcement assertion, so it's red on its own terms.

**In the same run:** all 25 existing tests in `card-notes-pile.spec.ts` passed after the helper move.

**Skipped as committed:**
- `playwright test e2e/card-notes-pile-keys.spec.ts --list` lists 8 tests.
- Prettier, `oxlint` and `tsc -b` pass on all three files.

### E2E Tests (8): `frontend/e2e/card-notes-pile-keys.spec.ts`

**Seed:** 5.4's `LIBRARY` from `e2e/pile.ts`.
- Dune has p.12, pp.42–45, p.96 and p.300.
- The Left Hand of Darkness has 2 notes.
- Neuromancer has 1 note.

**Two local recorders:**
- `recordPileStatus` puts a MutationObserver on the pile's `status`, so "announced nothing" is provable even when the text would be the same.
- `recordKeys` adds a `keydown` bubble listener on `window`. It reads `defaultPrevented` after React's root handlers, plus the modifier state.

1. **`[P0] AC-1`:**
   - Right from Next → "Note 2 of 4, pp.42–45: …", with focus on Next.
   - Left → "Note 1 of 4…".
   - From Close, Right steps and Close keeps focus. From Previous, Left steps and Previous keeps focus.
2. **`[P0] AC-2`:**
   - End → "Note 4 of 4, p.300: …".
   - End again → no announcement.
   - Home → "Note 1 of 4…".
   - Home again → nothing new.
3. **`[P1] AC-3`:**
   - Next ×3 to 4 of 4, then Right, Right, Left → the only announcement is "Note 3 of 4, p.96: …".
   - Home, then Left at the first note → stays at 1 with no wrap.
   - Neuromancer: all four keys → still "1 of 1", silent, both buttons disabled.
4. **`[P1] AC-4`:**
   - Control step: Right from Next → 2 of 4.
   - On Page order, Right → Shuffled is checked and focused, at "1 of 4" with no extra step.
   - Left → Page order, at 1, "Fear…".
   - End and Home on the radio → still "1 of 4".
5. **`[P1] AC-5`:**
   - Alt+, Control+, Meta+ and Shift+ArrowRight, then Shift+End, then a plain Right.
   - Result: "2 of 4". The recorded keydowns show the modified keys with `prevented: false` and the plain Right with `prevented: true`.
   - Only forward keys are used, because a modified Left can be the browser's Back.
6. **`[P1] AC-6`:** at the first note, Home, Left, End, Right are all `prevented: true`, ending at "4 of 4".
7. **`[P1] AC-7`:**
   - Previous has `aria-keyshortcuts="ArrowLeft"` and Next has `"ArrowRight"`.
   - These are the only two elements with `aria-keyshortcuts`.
   - There's no arrow glyph or "arrow" text, so no hint.
8. **`[P1] AC-8`:**
   - Uses the seeded `Math.random`, on the unscoped page.
   - Shuffled, then End from Next → "4 of 4".
   - Left back to 1 and Next forward to 4 give the same sequence, and it isn't page order.
   - Home, End, then Esc → focus is on the Edit of the shuffle's last note.

---

## Data Factories, Fixtures, Mocks

- **Data factories:** none new.
- **Fixtures:** none changed. `e2e/pile.ts` is a new shared module: an extraction, with no new behavior.
- **Mocks:** none. Only `Math.random` is seeded, in AC-8's init script.
- **`data-testid`:** none.

## Contract the Scaffolds Pin

- **Where the handler lives:** on the pile's `dialog`, so it covers Next, Previous and Close. It must keep `useAlertDialog`'s Tab trap: call `dialogProps.onKeyDown` first.
- **The keys:** ArrowLeft → `index - 1`, ArrowRight → `index + 1`, Home → `0`, End → `total - 1`.
  - It steps only when the target exists and differs from the current note.
  - The key is `preventDefault`-ed whether or not it moves.
- **Skipped entirely, with no `preventDefault`:**
  - any key with `altKey`, `ctrlKey`, `metaKey` or `shiftKey`;
  - any event whose target is an `input[type=radio]`.
- **A move:** calls 5.4's `move()`, so the `status` text and "N of M" are identical to a button press. Focus isn't touched.
- **The attributes:** `aria-keyshortcuts="ArrowLeft"` on Previous and `"ArrowRight"` on Next. `Button` already forwards `...rest`.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/e2e/card-notes-pile.spec.ts` | Nothing should. Its `[P2] AC-1` Tab leaf presses ArrowRight on the Page order radio and expects Shuffled. The radio exemption keeps that true, so re-run it. |

## Assumptions for the build to confirm

- **React's dialog `onKeyDown` runs before a `window` bubble listener.** The `defaultPrevented` checks in AC-5 and AC-6 rely on this. It holds for React 17+ root listeners.
- **Home and End on a radio do nothing natively** in Chromium, so "a no-op there" is the browser's behavior, not the pile's.
- **Setting the `status` to the same text causes no DOM mutation.** It doesn't come up: the leaves never move to the current note.

---

## Implementation Checklist

Activate one leaf at a time: change `test.skip(` to `test(` and delete its RED comment. Watch it fail, implement, then watch it pass.
- **Command:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/card-notes-pile-keys.spec.ts -g "AC-1"`

- [ ] **`CardNotesPile.tsx`:** a dialog `onKeyDown` that calls `dialogProps.onKeyDown`, then handles the four keys as pinned above. Update the doc comment.
- [ ] **`aria-keyshortcuts`** on Previous and Next.
- [ ] **`EXPERIENCE.md` § Pile:** add the spec's Keyboard bullet.
- [ ] Activate AC-1, then AC-2, AC-3, AC-6, AC-5, AC-4, AC-7 and AC-8.
- [ ] Re-run `card-notes-pile.spec.ts` in full, including the Tab/radio leaf and axe.

### Green-phase follow-ups (for `bmad-testarch-automate`, not red leaves)

- [ ] **AC-1:** the keys work on Book detail's pile too (same component; one smoke step).
- [ ] **AC-6, scroll:** at a short viewport with a long list behind the pile, End and Home leave `window.scrollY` and the dialog's `scrollTop` unchanged.
- [ ] **AC-1, held key:** holding Right (auto-repeat) stops at "M of M" with no wrap. The polite region may merge announcements.
- [ ] **AC-7, axe:** the existing `[P2] axe` leaf in `card-notes-pile.spec.ts` covers it once the attributes land; confirm it's still green.
- [ ] **AC-4, Shuffled:** with Shuffled checked, Left on the radio returns to Page order without a step.
