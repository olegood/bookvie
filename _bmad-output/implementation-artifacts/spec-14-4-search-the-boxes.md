---
title: 'Story 14.4: Search the boxes'
type: 'feature'
created: '2026-11-24'
baseline_revision: '263613cf9e6ecc93b25ed4e22a0b1269dfeb5951'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-14-4-search-the-boxes.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the Capability → Architecture Map still lists the shelf search as "Epic 14, planned", and the Structural Seed's `lib/` line still describes `useSearchCount` only as "N notes match." and `cardNotes` without the box match counts and shelf sentence.
    evidence: |-
      Spine Check, build-auto review of Story 14.4: ARCHITECTURE-SPINE.md lines 549, 556 and 568. Story 14.4 built the shelf search (`boxMatches`, `shelfCountLine` in `lib/cardNotes.ts`; `CardNotesPage.tsx`'s Boxes-view `useSearchCount` line). The code is right; the spine is out of date. Widens the 14.2 and 14.3 drift entries: only the carried search (14.5) is still planned.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      AC-2's example "14 card notes in 4 Books contain “habit”." doesn't fit AC-1's own seed, which gives 17 (3 + 1 + 12 + 1); the leaf asserts 17.
    evidence: |-
      epics.md Story 14.4 AC-2; search-boxes.spec.ts:44. The sentence is computed by `shelfCountLine`, so no code is wrong. EXPERIENCE.md's "14 card notes in 4 Books" examples have no seed and stand as examples. Fix the AC's wording in epics.md, e.g. at the Epic 14 retro.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Story 14.4, AC-2)
    severity: low
  - summary: >-
      A faded box's name "*Title*, no match" leaves out its visible count ("4 card notes"), so the visible label isn't fully in the accessible name (WCAG 2.5.3), and CardNoteBox.tsx's comment claiming the space keeps it there is now true only at rest and for matched boxes.
    evidence: |-
      Edge Case Hunter, build-auto review of Story 14.4. The name is the exact string the story's AC-2 and EXPERIENCE.md → Card notes shelf prescribe, and search-boxes.spec.ts AC-2/AC-3 assert it, so changing it is a UX decision (e.g. "Refactoring, 4 card notes, no match"), not a build fix. For the Epic 14 retro.
    location: >-
      frontend/src/lib/cardNotes.ts (cardNoteBoxName); EXPERIENCE.md → Card notes shelf → Search on the shelf
    severity: low
---

<intent-contract>

## Intent

**Problem:** In Boxes view, typing in Search card notes swaps the shelf for the List's flat results (UX-DR92's staging), so Oleg can't see at a glance which boxes hold matches (FR-19, UX-DR90).

**Approach:** Remove the staging. While the trimmed query is non-blank, Boxes view keeps every box: a box with matches lifts 6px and shows the pill "M of N" in place of its count, a box without one fades to 0.38 through one inner wrapper, each box's name carries its match, and the count line becomes the shelf sentence, which `status` announces after the pause. Every count, name and sentence comes from `lib/cardNotes.ts` through `noteMatches` (AR63).

## Boundaries & Constraints

**Always:**
- One inner wrapper inside the box link holds every card and the front. It takes `opacity: var(--card-note-box-fade)` (0.38) when the box has no match, and `transform: translateY(var(--card-note-box-lift))` (−6px) when it has matches. The link and its `li` never get an opacity or transform, so the focus ring (`2px solid accent`, 4px offset) stays full strength and the slot never moves. No added shadow, no scale.
- The wrapper's `transition` is `opacity` and `transform` at `var(--card-note-box-transition)` (150ms ease-out). It is `none` under `prefers-reduced-motion: reduce`. Boxes mounted with text in the field (a List → Boxes switch) render their search state at once: CSS doesn't transition an element's first style.
- The pill replaces the count only on a box with matches: "3 of 12" in `meta` at weight 600, `spine-label` on `#E3EBE2`, 22px tall, `0 8px` padding, `rounded.full`, no border, left-aligned in the label (`align-self: flex-start`), with a 6 × 6 `#557059` dot (`::before`) 8px before the text. A box without a match keeps "N card notes".
- Under `forced-colors: active` the pill is `forced-color-adjust: none`, `Canvas` with `CanvasText` text, a `1px solid CanvasText` border and a `CanvasText` dot. The fade and lift are not overridden.
- Names: "*Title*, 3 of 12 card notes match", "…, 1 of 12 card notes matches", "…, 1 of 1 card note matches", "…, 12 of 12 card notes match", "*Title*, no match". With a blank query: "*Title*, N card notes" as today.
- Count line: blank query → the totals ("41 card notes in 5 Books"). Otherwise "17 card notes in 4 Books contain “habit”." / "1 card note in 1 Book contains “WOODS”." / "No card notes contain “zettel”.", quoting the trimmed text as typed. Plain text, not a live region. `status` reads the same sentence once, after `SEARCH_PAUSE_MS`, in Boxes view; List view keeps "N notes match.".
- New literals go into `tokens.css` by hand, character for character from DESIGN.md `components.card-note-box` (`pill-background`, `pill-dot`, `pill-dot-size`, `pill-height`, `lift`, `fade`, `transition`). Never format `tokens.css`.

**Never:**
- No server, API, schema, backup or agent-tool change. No change to List view, the open box, the toggle or the remembered view.
- No carried search (14.5). The search text stays in `CardNotesBody` state.
- No edit to `search-boxes.spec.ts` beyond removing each `test.skip` and its red-phase comment, and no change to `boxFrames` or `pillLook`.
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Matches | "habit", Boxes | 4 boxes lifted with pills, Refactoring faded with its count, shelf sentence | — |
| No match | "zettel" | every box faded, "No card notes contain “zettel”." | — |
| Spaces only | "   " | every box at rest, totals line, no announcement | — |
| Case and trim | "  HaBiT  " | same as "habit"; sentence quotes "HaBiT" | — |
| Esc / emptied | "" | every box at rest, its count and name, totals line | — |
| List view | "habit", List | grouped results, `<mark>`, "17 notes match." (unchanged) | — |
| Reduced motion | `reduce` | lift and fade at once | — |

</intent-contract>

## Code Map

- `frontend/src/lib/cardNotes.ts` -- `noteMatches` (`:70`) is the one matcher. `cardNoteCount`, `cardNoteBoxName` (`:208`), `cardNotesCountLine` (`:213`) and `noNotesMatchCopy` (`:113`) already exist. Add: `boxMatches(notes, query)` (`null` for a blank query, else the count via `noteMatches`), `boxMatchPill(matches, count)` ("3 of 12"), an optional `matches: number | null` on `cardNoteBoxName`, and `shelfCountLine(groups, query)` (totals when blank, else the shelf sentence; none → `noNotesMatchCopy`).
- `frontend/src/lib/cardNotes.test.ts:298-320` -- the node unit tests for the box name and count line; extend them.
- `frontend/src/pages/CardNotesPage.tsx:183-184` -- the staging: `boxesShown = unscoped && shelfView === 'boxes' && query.trim() === ''`. Drop the query term. `:174` `useSearchCount` reads `notesMatchCopy`; make it read `shelfCountLine(groups, text)` when Boxes is shown at the pause, else `notesMatchCopy`. `:332` count line → `shelfCountLine(groups, query)`. `:338` pass `matches={boxMatches(group.notes, query)}`. Doc comment `:141-145` drops "Until Story 14.4 …" and gains the shelf search.
- `frontend/src/components/CardNoteBox.tsx` + `.module.css` -- the link holds the cards and the front directly; `.box` is `position: relative`. Add the wrapper (`position: absolute; inset: 0`), its `.lifted` / `.faded` modifiers, transition, reduced-motion rule, the pill and its forced-colors rule.
- `frontend/src/lib/useSearchCount.ts` -- reads `line` at the pause through a ref; unchanged.
- `frontend/src/styles/tokens.css:212-213` -- the `--card-note-box-*` literals; add the new ones after `--card-note-box-focus-offset`.
- `frontend/e2e/search-boxes.spec.ts` -- the 7 red leaves (AC-1 to AC-7). Helpers `boxFrames`, `boxFrameOf`, `pillLook` in `card-note-boxes.ts` read the structure without class names (front = outermost painted element with text; lift summed from the front up to the `li`; faded = any element with opacity ≠ 1).
- `frontend/e2e/card-note-boxes.spec.ts` -- `:6-7` header lines on the staging; `:213` expects "5 notes match." in Boxes view; `:541-578` AC-10 asserts the staging and EXPERIENCE.md's staging note.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:372-373` -- **Temporary.** holds only the *Staging* note; remove both.
- Deferred-work intake: `deferred-work.md:1766` (spine drift AD-6, mentions "the shelf search (14.4)" as planned) -- not in this story: spine drift is reconciled once per epic, before the next epic.

## Tasks & Acceptance

**Execution:**
- `frontend/src/styles/tokens.css` -- add `--card-note-box-pill-background: #E3EBE2;`, `--card-note-box-pill-dot: #557059;`, `--card-note-box-pill-dot-size: 6px;`, `--card-note-box-pill-height: 22px;`, `--card-note-box-lift: -6px;`, `--card-note-box-fade: 0.38;`, `--card-note-box-transition: 150ms ease-out;`, by hand -- AC-1, AC-5.
- `frontend/src/lib/cardNotes.ts` + `cardNotes.test.ts` -- `boxMatches`, `boxMatchPill`, `cardNoteBoxName(title, count, matches?)`, `shelfCountLine`, with unit tests for every name form, the plural/singular/none sentence, trimming and spaces-only -- AC-1, AC-2, AC-3.
- `frontend/src/components/CardNoteBox.tsx` + `.module.css` -- `matches: number | null` prop; the wrapper with lift/fade, transition and reduced-motion rule; pill in place of the count when `matches > 0`; forced-colors pill -- AC-1, AC-5, AC-7.
- `frontend/src/pages/CardNotesPage.tsx` -- remove the staging; count line and status from `shelfCountLine` in Boxes view; pass `matches`; update the doc comment -- AC-2, AC-3, AC-4, AC-6.
- `frontend/e2e/search-boxes.spec.ts` -- remove each `test.skip` and its red-phase comment.
- `frontend/e2e/card-note-boxes.spec.ts` -- drop header lines 6-7, change `:213`'s expected status to "5 card notes in 1 Book contain “Candide note”.", delete AC-10 (and `EXPERIENCE_MD`/`readFileSync` if unused) -- AC-4.
- `EXPERIENCE.md` -- remove the **Temporary.** bullet and its *Staging* note -- AC-4.

**Acceptance Criteria:**
- Given the 7 leaves in `search-boxes.spec.ts` (AC-1 to AC-7 in the ATDD checklist), when they run un-skipped, then all pass.
- Given the existing Card notes, Card note boxes, open box, Back to top and app-shell e2e specs, when the full suite runs, then they pass, with only the three planned edits to `card-note-boxes.spec.ts`.
- Given `npm run check`, when it runs, then it exits 0.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 20 findings — high 0, medium 0, low 13, false 7, maybe-false 0
- findings:
  - `[low]` `[defer]` (intent) epics.md AC-2 and EXPERIENCE.md quote "14 card notes in 4 Books", while the leaf asserts 17. — AC-1's seed gives 17; the sentence is computed, so no code is wrong. Deferred for an epics.md wording fix.
  - `[false]` `[reject]` (intent) `sprint-status.yaml` still reads `backlog` while the spec is `in-review`. — Finalize sets `review` and commits it with this build.
  - `[false]` `[reject]` (intent) Earlier stories' tests are edited and the staging assertion is removed. — AC-4 requires the staging to be gone, so 14.2's staging leaves had to change; the ATDD checklist names the edits.
  - `[false]` `[reject]` (intent) `pill-padding`, `pill-radius` and `pill-foreground` aren't tokens. — They are DESIGN.md references (`{spacing.2}`, `{rounded.full}`, `{colors.spine-label}`) and use those existing tokens, as `.count` does.
  - `[false]` `[reject]` (intent) The diff doesn't run code review or automate (readings R3/R4). — Those are later pipeline steps, not defects.
  - `[low]` `[defer]` (spine) Spine drift (AD-6), reconciled before the next epic: the Architecture Map still calls the shelf search "planned". — Deferred to `deferred-work.md`.
  - `[low]` `[defer]` (spine) Spine drift (AD-6), reconciled before the next epic: the Structural Seed's `lib/` line names only "N notes match." — Same entry as above.
  - `[low]` `[defer]` (edge) A faded box's name "*Title*, no match" leaves out its visible "4 card notes" (WCAG 2.5.3). — The name is the exact string AC-2 and EXPERIENCE.md prescribe; changing it is a UX decision for the retro.
  - `[low]` `[reject]` (blind) Removing the **Temporary.** bullet drops the 14.5 marker. — EXPERIENCE.md is the target design (the open box strip had no staging note either); sprint-status tracks what's built, and AC-4's leaf requires the note gone.
  - `[low]` `[defer]` (blind) "14 vs 17" is left unresolved. — Same root cause as the first row; now in `deferred`.
  - `[low]` `[reject]` (blind) The spec doesn't record the edit to `card-note-boxes-automate.spec.ts`. — The fix edits this spec; the Auto Run Result names the file and why.
  - `[low]` `[patch]` (blind) The automate AC-10 regex also matches "No card notes contain “Emma”.". — Anchored to `^\d+ card notes? in \d+ Books? contains? “…”\.$`.
  - `[low]` `[patch]` (blind) The pill's `font-weight: 600` is the one pill literal without a token. — Added `--card-note-box-pill-weight: 600;` to tokens.css by hand and used it.
  - `[low]` `[reject]` (blind) The label grows about 3px when the pill replaces the count, nudging the title about 1.5px. — Barely visible under the 6px lift; reserving the height would change the resting box that 14.2's leaves pin.
  - `[false]` `[reject]` (blind) The matching runs three times per keystroke. — Each pass is a substring check over a few hundred notes; no measurable cost, and all go through `boxMatches`, so they can't disagree.
  - `[low]` `[patch]` (blind) The `useSearchCount` closure on `boxesShown` is untested. — Grouped with the Verification Gap row below; a leaf now covers it.
  - `[low]` `[patch]` (blind) No unit case for plural notes in one Book, nor for a box with `matches === 0` keeping its count. — Added "2 card notes in 1 Book contain “habit”."; the count case is component rendering, and `search-boxes.spec.ts` AC-1 asserts Refactoring shows "4 card notes".
  - `[false]` `[reject]` (blind) Nothing asserts no `<mark>` in Boxes view with text. — `search-boxes.spec.ts` AC-4 asserts `main.locator('mark')` has count 0.
  - `[low]` `[patch]` (verification-gap) A Boxes ⇄ List press during the typing pause isn't tested for which sentence `status` reads. — New `e2e/search-boxes-view-switch.spec.ts` leaf: Boxes → List reads "17 notes match.", List → Boxes reads the shelf sentence.
  - `[false]` `[reject]` (verification-gap, other) AC-6's "status stays silent" vs an announcement after a press during the pause. — The press itself announces nothing; the pending typing announcement reads the view shown, as the spec's Design Notes say.

### Review Findings

Code review, 2026-11-24, in a new session (`bmad-code-review`), on `git diff 263613c..e2566c3`. The five layers were Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor and Spine Check. They raised 17 findings: 0 `decision-needed`, 3 `patch` entries (5 findings: two layers each raised the overflow and the comment), 1 `defer` and 11 rejected. Verification Gap found no gap. The Acceptance Auditor found no AC or constraint violation. The review checked the new `tokens.css` lines against DESIGN.md `components.card-note-box` (lines 505–516): they match character for character. A review probe in Chromium at 1024px confirmed the overflow: a 120-character unbroken query gave `scrollWidth` 1414 against `clientWidth` 1024; 30 and 60 characters fit. The probe file was deleted afterwards. The spec has no manual AC.

- [x] [Review][Patch] A long unbroken query makes the shelf sentence widen the toolbar and scroll the page sideways [frontend/src/pages/CardNotesPage.module.css:139] (edge + blind, `low`)
- [x] [Review][Patch] `CardNoteBox.tsx`'s comment says the space keeps the visible text in the link's name, which a faded box ("*Title*, no match" while it shows "4 card notes") no longer does [frontend/src/components/CardNoteBox.tsx:48] (blind + auditor, `low`)
- [x] [Review][Patch] `search-boxes-view-switch.spec.ts` relies on the real 500 ms pause: if `fill` and the view press take longer than the pause on a loaded machine, `status` reads the other view's sentence first and the exact-array assertions fail. The repo's clock pattern (`openPaused` in `card-notes.spec.ts`, from the Epic 6 trace flake) makes "a press inside the pause" certain [frontend/e2e/search-boxes-view-switch.spec.ts:35] (blind, `low`)
- [x] [Review][Defer] Spine drift (AD-6): the client presentation list's `lib/cardNotes.ts`, `lib/useSearchCount.ts` item still says the client counts matching notes only for "N notes match." [ARCHITECTURE-SPINE.md:118] — deferred: spine drift, reconciled before the next epic; added to the build's 14.4 entry in `deferred-work.md`. (spine)

Full check after the patches, 2026-11-24, in this review session: `npm run check` exit 0 — pytest 2508 passed, unit 414 passed, e2e 847 passed, smoke ok. Before it, `search-boxes-view-switch.spec.ts` and `search-boxes.spec.ts` passed 24 of 24 with `--repeat-each=3`, and the overflow probe at 1024px read `scrollWidth` 1024 for a 120-character query (deleted afterwards).

**Rejected:**
- (spine) Spine drift (AD-6) on the Structural Seed's `lib/` line (549) and the Capability → Architecture Map (556, 568): already deferred by the build's 14.4 entry in `deferred-work.md`.
- (auditor, `low`) `card-note-boxes-automate.spec.ts` was edited outside the plan's "three planned edits". Its 14.2 AC-10 leaf asserted the staging that AC-4 removes, so it had to change; the Auto Run Result names the file and why.
- (auditor, `low`) `card-note-boxes.spec.ts` also lost its `DESIGN_MD` import. It followed from deleting the staging leaf, its only user; oxlint would flag it otherwise.
- (auditor, `false`) The count line and `matches` take `shownQuery`, not `query`. They differ only with no groups, which renders the empty state, not the shelf; List view uses the same variable.
- (blind, `low`) The rewritten automate AC-10 regex accepts any count, and `left` goes into `new RegExp` unescaped. The exact shelf sentences are pinned by `search-boxes.spec.ts` AC-2/AC-3; this leaf checks that every box stays and the count line comes back. `left` comes from a fixed list of letters.
- (blind, `low`) The spec's Always rule and Execution task list seven tokens, not eight (`pill-weight`), and the Spec Change Log is empty. The fix edits this spec; the Review Triage Log and Files changed record the eighth token.
- (blind, `low`) The spec's Verification commands leave out `search-boxes-view-switch.spec.ts`. The fix edits this spec; `npm run check` runs the file.
- (blind, `false`) "A lifted box's picture reaches the focus ring's outer edge." The tallest pile's back card sits 22px below the link's top (`card-top` 70 − 6 × `card-step` 8), so lifted 6px it is still 16px inside the link; the ring is 4px outside it. DESIGN.md has the link never move.
- (blind, `low`) No unit case for regex characters or typographic quotes in `boxMatches`/`shelfCountLine`, nor for `cardNoteBoxName('X', 1, 0)`. `boxMatches` only calls `noteMatches`, which has its own regex-character tests; the quote case is cosmetic and the one-note no-match name is the same branch as any no-match.
- (blind, `low`) The automate leaf now tests 14.4 behavior under the 14.2 describe and an "AC-10" id. Relabelling coverage is `bmad-testarch-automate`'s job for this story, which runs next; the leaf's assertions are right.
- (blind, `false`) "The 14 vs 17 deferral reads differently in the spec and `deferred-work.md`." Both say only `epics.md` needs the wording fix; the spec's frontmatter adds that EXPERIENCE.md's examples have no seed and stand.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **AC-2's "14 card notes in 4 Books"** doesn't fit AC-1's own seed (3 + 1 + 12 + 1 = 17). The sentence is computed, so the code is right whichever number; the leaf asserts 17. Left for the review to fix the wording in `epics.md` or defer it.
- **Why one wrapper:** opacity on the link would fade the focus ring, and fading the cards and front separately lets the cards show through the front. The wrapper takes both the fade and the lift so a single element's `transition` covers AC-5.
- **Status at the pause:** `useSearchCount` reads `line` when the pause ends, so a view switch during the pause announces the view shown then. A press itself never announces (AC-6).

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/search-boxes.spec.ts` -- expected: 7 passed.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/card-note-boxes.spec.ts e2e/card-note-boxes-automate.spec.ts e2e/card-note-boxes-dark-theme.spec.ts e2e/open-box.spec.ts e2e/card-notes.spec.ts e2e/app-shell.spec.ts` -- expected: pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** A search on the shelf now keeps every box. While the trimmed query is non-blank, in Boxes view:
- A box with matches lifts 6px and shows the pill "M of N" in place of its count.
- A box without a match fades to 0.38 through one inner wrapper. The link and its focus ring are never faded or moved.
- Each box's name carries its match.
- The count line becomes the shelf sentence, and `status` reads it once after the pause.

The lift and the fade change over 150ms ease-out, and at once under reduced motion or on a List → Boxes switch. Every count, name and sentence comes from `lib/cardNotes.ts` through `noteMatches`. UX-DR92's staging is gone from the code and from EXPERIENCE.md. List view, the open box, the server and the backup format are unchanged.

**Files changed:**
- `frontend/src/lib/cardNotes.ts`: added `boxMatches`, `boxMatchPill`, `shelfCountLine`, and an optional `matches` on `cardNoteBoxName`.
- `frontend/src/lib/cardNotes.test.ts`: unit tests for the name forms and the shelf sentence (plural, singular, plural notes in one Book, none, trimming, spaces only).
- `frontend/src/components/CardNoteBox.tsx` and `.module.css`: the `.picture` wrapper (lift, fade, transition, reduced-motion rule), the pill with its `::before` dot, and the forced-colors pill.
- `frontend/src/pages/CardNotesPage.tsx`: removed the staging. The count line and `status` come from `shelfCountLine` in Boxes view, each box gets `matches`, and the doc comment is updated.
- `frontend/src/styles/tokens.css`: eight `--card-note-box-*` literals from DESIGN.md (pill background, dot, dot size, height, weight; lift; fade; transition), edited by hand and not formatted.
- `frontend/e2e/search-boxes.spec.ts`: the 7 ATDD leaves un-skipped, with their red-phase comments removed.
- `frontend/e2e/card-note-boxes.spec.ts`: the three planned edits (header lines, "5 card notes in 1 Book contain “Candide note”.", and 14.2's AC-10 staging leaf deleted).
- `frontend/e2e/card-note-boxes-automate.spec.ts`: not in the plan. Its 14.2 AC-10 leaf asserted the staging (no boxes while the field holds text). It now expects every box to stay and the shelf sentence for a search that found notes.
- `frontend/e2e/search-boxes-view-switch.spec.ts` (new): a press during the typing pause announces the count of the view shown when the pause ends (a review patch).
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md`: removed the **Temporary.** bullet and its staging note.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the three deferrals below.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: `14-4-search-the-boxes` set to `review`.

**Review findings.** There were 20 findings: low 13, false 7.
- **Patched, all low:**
  - The automate regex now matches only the sentence for a search that found notes.
  - Added the `--card-note-box-pill-weight` token.
  - Added a unit case for plural notes in one Book.
  - Added a view-switch-in-the-pause leaf. The Verification Gap finding and Blind Hunter's closure finding both led to it.
- **Deferred, all low:**
  - Spine drift (AD-6): the spine still lists the shelf search as planned.
  - AC-2's "14" vs the seed's 17.
  - A faded box's name "*Title*, no match" leaves out its visible count (WCAG 2.5.3). The name is the string the AC prescribes, so changing it is a UX decision for the retro.
- **Rejected:** 10, each with its reason in the Review Triage Log.
  - 7 were false: sprint status, the edits to earlier tests, the pill tokens, the later pipeline steps, the triple match pass, `<mark>` coverage, and AC-6's silence.
  - 3 were low: the 14.5 marker in EXPERIENCE.md, the spec not naming the automate spec edit (the fix edits this spec), and the label growing 3px.

**Follow-up review recommendation:** false. Patched: high 0, medium 0, low 4.

**Verification:**
- Story 14.4 and nearby specs (`search-boxes`, `card-note-boxes`, `-automate`, `-dark-theme`, `open-box`, `card-notes`, `app-shell`): 72 passed before the patches.
- The new view-switch leaf: 3 of 3 runs passed (`--repeat-each=3`, run by the implementation subagent).
- `npm run check` before the patches: exit 0, with 846 e2e passed.
- `npm run check` after the patches: exit 0. That covers check:api, check:py, check:e2e (847 passed) and check:smoke.

**Residual risks:**
- When the pill replaces the count, the label grows about 3px and the title moves about 1.5px, without a transition (rejected as barely visible).
- The ATDD checklist's green-phase follow-ups are left for `bmad-testarch-automate`: axe, regex characters, the pause, window widths, the blank field, dark, opening a faded box, and the dark pill.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
