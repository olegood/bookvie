---
title: 'Story 14.2: See my card notes as boxes'
type: 'feature'
created: '2026-11-24'
status: 'in-review'
baseline_revision: 'a54a9d965b4606a01fd1b282719de72ffd2f6821'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-14-2-see-my-card-notes-as-boxes.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, AD-15), reconciled before the next epic: the Capability → Architecture Map still calls the Boxes view (lib/cardNotesView, components/CardNoteBox) planned for Epic 14.
    evidence: |-
      Spine Check, build-auto review of Story 14.2: the map's lead-in ("except FR-19's Boxes view, which Epic 14 plans") and the FR-17 to FR-19 row ("Epic 14, planned"). The code is right; the spine is out of date.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the Structural Seed ties components/ViewToggle to Catalog's toolbar, but it is now generic and also serves the Card notes toolbar.
    evidence: |-
      Spine Check, build-auto review of Story 14.2: ViewToggle takes label and options, and both CatalogPage and CardNotesPage use it. The FR-17 to FR-19 row doesn't list it.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The unscoped Card notes page only lists notes by Book, so Oleg can't see at a glance which Books he kept the most from (FR-19, UX-DR83–88).

**Approach:** Add a remembered Boxes · List toggle (`bookvie.cardNotesView`, Boxes by default, AR64) to the unscoped page's toolbar. Boxes view shows one `CardNoteBox` per group, in the groups' order and in the group's `spineColor`, with a pile of 1/3/5/7 cards and a count line. List view is today's page. Until 14.4, non-blank search text in Boxes shows the List results (UX-DR92 staging).

## Boundaries & Constraints

**Always:**
- The pile step, the count line copy and totals, and the box's accessible name live in `lib/cardNotes.ts` (AR63). The page only calls them.
- The storage key is read and written inside try/catch in `lib/cardNotesView.ts`, mirroring `lib/catalogView.ts`. Only the exact values `"boxes"` and `"list"` count. Anything else, or a throw, means Boxes. A failed write still switches the view.
- Toggle and count line render only on the unscoped page, once the view is `ready` and has at least one group. The count line shows only in Boxes view with a blank (trimmed) query.
- Every style value comes from DESIGN.md `components.card-note-box`, `card-notes-view-toggle` and `card-notes-count-line`. Any `--card-note-box-*` literal added to `tokens.css` is copied from DESIGN.md character for character, and the file is edited by hand, never formatted.
- The front fill is `spineColor` exactly (inline style), never a `spine-unread-*` color. The label, cards and count are fixed literals in both themes.

**Never:**
- No server, API, schema, backup or agent-tool change. No change to List view's behavior, or to the scoped page (14.3 adds its strip).
- No edit to existing Card notes e2e specs. The ATDD files change only by removing `test.skip`.
- No shelf search (lift, fade, pills, shelf sentence: 14.4) and no carried search (14.5).
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Stored view | `null`, `""`, `"grid"`, `"LIST"`, `" list"` | Boxes | getItem throws → Boxes, no error |
| Stored list | `"list"` | List pressed, groups | — |
| Press | List/Boxes click, Enter, Space | switches in place, focus kept, text kept, stored at once, `status` silent | setItem throws → still switches, no message |
| Pile step | 1 / 2–5 / 6–20 / 21+ notes | 1 / 3 / 5 / 7 cards | 0 → 0 |
| Count line | 55 notes, 6 Books; 1 note, 1 Book | "55 card notes in 6 Books"; "1 card note in 1 Book" | — |
| Staging | Boxes and non-blank text | List results, "N notes match.", no count line, no boxes | spaces only → boxes |
| No notes | no groups | "No card notes yet.", no toolbar | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CardNotesPage.tsx:136` `CardNotesBody` -- keyed by `bookId`. `shownQuery`/`shown` (`:147`) drive the groups; the `SearchTitles` render (`:284`) becomes a toolbar `div`: field, then (unscoped) toggle and count line. `content()` returns `null` while loading and the failure block when failed, so the toggle and line are naturally absent there. `BackToTop` (`:321`) stays as is.
- `frontend/src/pages/CardNotesPage.module.css` -- `.page` is a flex column with `align-items: flex-start`, `gap: space-5`; the grid needs `align-self: stretch` to wrap at the content width (4/5/5 columns at 1024/1280/1440, measured in the ATDD checklist).
- `frontend/src/components/ViewToggle.tsx` + `.module.css` -- Catalog's toggle, hard-wired to `CATALOG_VIEWS` and "Catalog view". Make it generic (`label`, `options`, `value`, `onChange`). AC-3 compares the two toggles' computed styles, so both must use this module. `CatalogPage.tsx:333` is the only caller. `RangePicker.tsx` imports only the CSS.
- `frontend/src/lib/catalogView.ts` + `catalogView.test.ts` -- the pattern for `lib/cardNotesView.ts` and its unit test.
- `frontend/src/lib/cardNotes.ts` + `cardNotes.test.ts` -- add `pileCards(count)`, `cardNoteCount(count)` ("1 card note"), `cardNoteBoxName(title, count)`, `cardNotesCountLine(groups)`.
- `frontend/src/styles/base.css:6` -- the global `:focus-visible` ring (2px accent, offset 2px) and the forced-colors `Highlight`. The box overrides only the offset (4px) and sets `border-radius: rounded.lg`. Global `a` sets the accent color and underline, so the box resets both.
- `frontend/src/styles/tokens.css:158` elevation, `:164` components, `:222` and `:254` the two dark blocks -- add `--shadow-box-front` (light and dark, DESIGN.md → Elevation table) and `--card-note-box-*` literals. `app-shell.spec.ts` checks only the shadow keys it lists.
- DESIGN.md `components.card-note-box` (line 476), the Card note box section (line 904) and Forced colors (line 704) -- geometry, colors and the forced-colors rules.
- `frontend/e2e/card-note-boxes.spec.ts` + `card-note-boxes.ts` -- the 12 red leaves and `boxLook`. These pin the DOM: one painted front (the label's nearest painted ancestor), a label holding the title and count, cards as the only other painted elements (no painted wrapper), and the title cut by CSS line clamp, never by slicing the string.
- Deferred-work intake: none name story 14.2. The one entry naming Epic 14 (`deferred-work.md` line 1744) already has a `resolved:` line.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/cardNotesView.ts` (new) + `cardNotesView.test.ts` (new) -- `readCardNotesView`/`writeCardNotesView`, mirroring catalogView -- AR64.
- `frontend/src/lib/cardNotes.ts` + `cardNotes.test.ts` -- the four helpers above, with unit tests at 0, 1, 2, 5, 6, 20, 21 and 100 -- AR63.
- `frontend/src/components/ViewToggle.tsx` -- generic props; `frontend/src/pages/CatalogPage.tsx` -- pass Catalog's label and options -- one visual for both toggles.
- `frontend/src/components/CardNoteBox.tsx` + `.module.css` (new) -- a link `a` 216 × 196 (`position: relative`, no underline, pointer cursor, `rounded.lg` radius, 4px outline offset) holding k absolutely positioned cards (top `70 − (k−1−i)·8`, the first k angles via `rotate`), then the front (`bottom: 0`, 116px, `6px 6px 12px 12px`, box-front shadow, inline `spineColor`, 14px padding, grid with centered content) holding the label (title 2-line clamp, count). Forced-colors rules from DESIGN.md → Forced colors.
- `frontend/src/styles/tokens.css` -- `--shadow-box-front` in all three blocks, plus `--card-note-box-*` literal dimensions and colors -- AC-12.
- `frontend/src/pages/CardNotesPage.tsx` + `.module.css` -- the toolbar (flex, `space-4`, centered), the view state (`useState(readCardNotesView)`, writing on change), the Boxes grid, the staging rule, and the count line (`meta`, `ink-tertiary`, plain `p`).
- `frontend/e2e/card-note-boxes.spec.ts` -- remove each `test.skip` and its red-phase comment.

**Acceptance Criteria:**
- Given the 12 leaves in `card-note-boxes.spec.ts` (AC-1 to AC-12 in the ATDD checklist), when they run un-skipped, then all pass.
- Given the existing Card notes, Back to top, restore and catalog e2e specs, when the full suite runs, then they pass with no edit to their files.
- Given `npm run check`, when it runs, then it exits 0 (unit tests, prettier, oxlint, `tsc -b`, check:py, e2e).

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 18 findings — high 0, medium 0, low 13, false 5, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine) Spine drift (AD-6, AD-15), reconciled before the next epic: the Capability → Architecture Map's lead-in and its FR-17 to FR-19 row still call the Boxes view (`lib/cardNotesView`, `components/CardNoteBox`) "Epic 14, planned". — The code is right and the spine is out of date; deferred to `deferred-work.md`.
  - `[low]` `[defer]` (spine) Spine drift (AD-6), reconciled before the next epic: the Structural Seed's `components/` line ties `ViewToggle` to Catalog's toolbar, and the FR-17 to FR-19 row doesn't list it for the Card notes page. — The code is right and the spine is out of date; deferred to `deferred-work.md`.
  - `[false]` `[reject]` (intent) The new toolbar `div` also wraps `SearchTitles` on the scoped page, which should be "as before". — With one child, a flex row with a gap lays out exactly like the bare `SearchTitles` (itself a flex row). Nothing the user sees changes, and AC-5 opens the scoped page with its chip, 5 notes and no toggle.
  - `[low]` `[reject]` (intent) Nothing tests the "a restore neither brings nor replaces it" half. — No code is involved: the key lives only in `localStorage`, and the backup and restore code never reads it. The test is the ATDD checklist's green-phase follow-up "E2E, AC-3 restore", left to `bmad-testarch-automate`.
  - `[false]` `[reject]` (intent) "Done" is measured by the ATDD leaves, not by every criterion. — This describes the pipeline, not a defect. The 12 leaves map one to one to the story's 12 criteria (ATDD checklist registry), and the review checks the code against them.
  - `[false]` `[reject]` (intent) `sprint-status.yaml` still reads `backlog`, and the spec still reads `in-progress`. — Finalize moves both (`review`, `in-review`) in the story's commit.
  - `[low]` `[patch]` (verification-gap) The dark `--shadow-box-front` in `:root[data-theme="dark"]` is never exercised: AC-6 goes dark only through `emulateMedia`. — Added "[P2] AC-6 an explicit Dark theme gives the box front its dark shadow": a light OS scheme, then Theme → Dark, then Anathem's front shadow equals the dark value. A mutation check (that line removed) made the new leaf fail.
  - `[false]` `[reject]` (blind) The story's status never changes. — Same as the intent row above: Finalize does it.
  - `[low]` `[patch]` (blind) `CARD_NOTES_VIEW_OPTIONS` was hand-written beside `CARD_NOTES_VIEWS`, so the allowed values and the toggle's order had two sources. — The options are now built from `CARD_NOTES_VIEWS` and a labels record, as `CatalogPage.tsx` does.
  - `[low]` `[reject]` (blind) The view labels belong in `lib/`, next to the view lists. — AR63 names the pile step, the totals and the box name, not toggle labels. Catalog's labels sit in its page the same way. Cosmetic.
  - `[low]` `[reject]` (blind) `.box, .box:focus-visible { outline-offset }` is redundant. — The bare `.box` is deliberate: the offset holds whatever focus path draws the ring (AC-12 focuses by script). The extra selector is harmless.
  - `[low]` `[patch]` (blind) Under forced colors the front keeps its rgba shadow, because `forced-color-adjust: none` stops the browser from dropping it. — Added `box-shadow: none` to the forced-colors `.front` rule.
  - `[false]` `[reject]` (blind) The box has no inner wrapper for 14.4's fade. — The fade is Story 14.4's scope (this spec's Never). The ATDD allows an unpainted wrapper, so 14.4 can add one then.
  - `[low]` `[reject]` (blind) `overflow-wrap: anywhere` on the title isn't in DESIGN.md. — Without it, one long word wider than the 164px label would be clipped with no ellipsis. Breaking it keeps the 2-line clamp working; DESIGN.md doesn't settle it either way.
  - `[low]` `[reject]` (blind) The helper edge cases (`cardNotesCountLine([])`, `cardNoteCount(0)`, `"boxes "`) aren't tested. — None is reachable: the view only returns groups with notes, and the empty branch renders before the toolbar. The pile step at 0 is already tested.
  - `[low]` `[patch]` (blind) `.shelfItem { display: block }` did nothing. — The rule and its `className` were removed.
  - `[low]` `[reject]` (blind) The scoped page reads `localStorage` for nothing. — One try/catch read per mount, harmless; guarding it adds a branch for no user-visible gain.
  - `[low]` `[reject]` (blind) The Code Map's line numbers are stale after the diff. — The fix edits this build's spec; the Code Map records the code as it was planned.
  - Edge Case Hunter found nothing.

## Design Notes

- **Staging:** `boxesShown = unscoped && view === 'boxes' && query.trim() === ''`. Otherwise the existing List branch renders unchanged, so non-blank text in Boxes reuses the List's results and its `useSearchCount` announcements.
- **Toggle press** calls only `setView` and `writeCardNotesView`. Never `count.typed`, so `status` stays silent.
- **Card angles** (DESIGN.md prose, no token): `[-1.6, 1.2, -0.6, 1.8, -1.2, 0.8, -1.8]` from the back, kept as a constant in `CardNoteBox.tsx`.

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/card-note-boxes.spec.ts` -- expected: 12 passed.
- `cd frontend && node --test 'src/**/*.test.ts'` -- expected: pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** The unscoped Card notes page now has a remembered Boxes · List toggle (`bookvie.cardNotesView`, Boxes by default). Boxes view shows one `CardNoteBox` per Book with notes, in the groups' order:
- each box is a 216 × 196 link named "*Title*, N card notes", with a front in the Book's exact `spineColor`, a label plate, and a pile of 1, 3, 5 or 7 turned paper cards;
- the toolbar's count line reads "55 card notes in 6 Books".

List view is the page as before. Until 14.4, non-blank text in Boxes view shows the List's results (UX-DR92 staging). The scoped page, the server and the backup format are unchanged.

**Files changed:**
- `frontend/src/lib/cardNotesView.ts` (+ test): reads and writes the remembered view inside try/catch. Only the exact values `"boxes"` and `"list"` count.
- `frontend/src/lib/cardNotes.ts` (+ test): `pileCards`, `cardNoteCount`, `cardNoteBoxName` and `cardNotesCountLine` (AR63).
- `frontend/src/components/CardNoteBox.tsx` + `.module.css`: the box. It holds the cards, then the front with the label; the title is clamped to 2 lines. It has a 4px focus offset and the forced-colors rules from DESIGN.md.
- `frontend/src/components/ViewToggle.tsx` (+ CSS comment): generic `label` and `options`, so one visual serves both toggles.
- `frontend/src/pages/CatalogPage.tsx`: passes Catalog's label and options.
- `frontend/src/pages/CardNotesPage.tsx` + `.module.css`: the toolbar, the view state, the shelf grid, the staging rule and the count line.
- `frontend/src/styles/tokens.css`: `--shadow-box-front` in all three blocks, plus 15 `--card-note-box-*` literals copied from DESIGN.md. Edited by hand, not formatted.
- `frontend/e2e/card-note-boxes.spec.ts`: the 12 leaves un-skipped, plus the review's explicit-Dark shadow leaf.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the two spine-drift entries.

**Review findings.** There were 18 findings: low 13, false 5. 4 were patched, all low:
- the toggle options are now built from `CARD_NOTES_VIEWS`;
- `box-shadow: none` under forced colors;
- the no-op `.shelfItem` rule is removed;
- a new leaf covers the explicit-Dark front shadow.

2 were deferred as spine drift (AD-6, AD-15). 12 were rejected, each with its reason in the Review Triage Log: 5 false, 6 low that are harmless, cosmetic or left to automate, and 1 whose fix edits this spec. Edge Case Hunter found nothing.

**Follow-up review recommendation:** false. Patched: high 0, medium 0, low 4.

**Verification:**
- `node --test 'src/**/*.test.ts'`: 398 passed, before the patches.
- `TZ=Europe/Madrid npx playwright test e2e/card-note-boxes.spec.ts`: 12 passed before the patches, and 13 passed after them (implementer's run).
- The new leaf failed with the `data-theme="dark"` shadow line removed, then passed once the line was back.
- `npm run check` after the patches: exit 0 (check:api, check:py, 816 e2e, smoke).

**Residual risks:**
- The ATDD checklist's green-phase follow-ups are left for `bmad-testarch-automate`: restore, axe, near-white front, refetch, and typing back to blank.
- Story 14.4 will need an unpainted fade wrapper inside the box.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
