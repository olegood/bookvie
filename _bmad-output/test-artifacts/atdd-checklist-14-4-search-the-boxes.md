---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-24'
storyId: '14.4'
storyKey: '14-4-search-the-boxes'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-144-search-the-boxes'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-14-4-search-the-boxes.md'
generatedTestFiles:
  - 'frontend/e2e/search-boxes.spec.ts'
  - 'frontend/e2e/card-note-boxes.ts (HABIT_SHELF, HABIT_BOXES, HABIT_COUNT_LINE, boxOfBook, boxFrames, boxFrameOf, BoxFrame, FadedPart, pillLook, PillLook)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 14.4; FR-19, NFR3, AR63, UX-DR83, UX-DR90, UX-DR92, UX-DR93)'
  - '_bmad-output/implementation-artifacts/epic-14-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.card-note-box pill-*, lift, fade, transition, focus-*; Components → Card note box → Match pill, Lift, Fade, Motion, Focus; Colors → Contrast; Forced colors)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card notes shelf → Search on the shelf, Temporary; Interaction Primitives → Motion; Accessibility Floor → Faded Card note boxes)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (14-3 done, 14-4 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-14-3-see-the-open-box-in-its-book-s-color.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CardNotesPage.tsx, pages/SearchTitles.tsx, components/CardNoteBox.tsx + .module.css, lib/cardNotes.ts, lib/useSearchCount.ts, lib/announce.ts, lib/motion.ts, styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, library.ts, card-note-boxes.ts + .spec.ts + -automate.spec.ts + -dark-theme.spec.ts, open-box*.spec.ts, card-note-add-another.ts, dev-mode.ts, stats.ts, bookcase.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a seeded library where "habit" appears in 3 of Atomic Habits''s 12 notes, all of a Book''s notes, one of a Book''s 12, the only note of a one-note Book, and in no note of Refactoring, when I type "habit" in Search card notes in Boxes view, then each box with matches lifts by 6px (no shadow, no scale) and shows the pill "3 of 12" ("12 of 12" when every note matches) where its count was: meta at 600, spine-label on #E3EBE2, 22px tall, rounded.full, with a 6px #557059 dot spacing.2 before the text; and each box without a match fades to 0.38 through one inner wrapper holding its cards and front, stays in place, stays a link and a Tab stop, and its focus ring stays at full strength; and nothing is hidden and the grid doesn''t reflow; and what matches is decided by the same lib/cardNotes.ts matcher as the List (contains, ignoring case), and a spaces-only query counts as empty (AR63).' }
  - { id: AC-2, idSource: generated, text: 'Given that search, when the boxes update, then the count line reads "14 card notes in 4 Books contain “habit”." ("1 card note in 1 Book contains “habit”."), quoting the trimmed text, updated as I type; and status announces the same sentence once typing pauses (about 500 ms); and the accessible names read "Atomic Habits, 3 of 12 card notes match", "Title, 1 of 12 card notes matches", "Title, 1 of 1 card note matches", "Title, 12 of 12 card notes match" and "Refactoring, no match".' }
  - { id: AC-3, idSource: generated, text: 'Given a query no note contains, such as "zettel", when I type it in Boxes view, then every box fades, the count line reads "No card notes contain “zettel”.", and status announces it the same way.' }
  - { id: AC-4, idSource: generated, text: 'Given a search on the shelf, when I press Esc in the field, or empty it, then every box comes back to full strength and its count, and the count line shows the totals again; and UX-DR92''s staging is gone: Boxes view with text never shows the List''s flat results, and EXPERIENCE.md → Card notes shelf → Temporary no longer holds the staging note.' }
  - { id: AC-5, idSource: generated, text: 'Given the search changing as I type, when boxes lift or fade, then they change over 150ms ease-out; and under prefers-reduced-motion: reduce they change at once; and when I switch from List to Boxes with text in the field, the boxes render in their search state at once, with no animation.' }
  - { id: AC-6, idSource: generated, text: 'Given text in the field, when I switch Boxes ⇄ List, then the field keeps the text, the other view applies it in its own way (List: grouped results with highlights; Boxes: lift, fade and pills), focus stays on the pressed button, and status stays silent.' }
  - { id: AC-7, idSource: generated, text: 'Given the shelf during a search, in light, dark and forced-colors: active, when a faded box has keyboard focus, then its focus ring is at full strength (accent vs page 4.96 light, 7.68 dark; the system color under forced colors), the pill under forced colors is Canvas with CanvasText text, a 1px CanvasText border and a CanvasText dot, and the fade and lift still apply (UX-DR93''s documented deviation).' }
---

# ATDD Checklist: Story 14.4 Search the boxes

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are both in place. This story is frontend only: the `card-notes` view already gives every group's notes and `spineColor`, and the matcher lives in `lib/cardNotes.ts`. So every leaf is e2e.
- **Story:** Story 14.4 in `epics.md` has 7 Given/When/Then criteria, none with ids. They're numbered AC-1 to AC-7 in source order (registry above), and each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `14-4-search-the-boxes`, and 14.3 is `done`. There's no spec file yet, so the story file is the `epics.md` section, as for 14.1 to 14.3.
- **Epic gate:** 14.4 isn't Epic 14's first story, so the spine gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotesPage` computes `boxesShown = unscoped && shelfView === 'boxes' && query.trim() === ''`. That's UX-DR92's staging: with text, Boxes view renders the List's groups, hides the count line, and `useSearchCount` announces "N notes match.".
  - `CardNoteBox` is a link holding the cards and the front directly. There's no inner wrapper, no pill and no transition yet, and `cardNoteBoxName` gives only "*Title*, N card notes".
  - `lib/cardNotes.ts` has `noteMatches` (trimmed, case-insensitive contains) and `cardNotesCountLine`, but no shelf sentence, match count or match name.
  - EXPERIENCE.md → Card notes shelf → Temporary still holds the *Staging* note (`EXPERIENCE.md:371`).

## Generation Mode

**AI generation**, run in sequence in this session. Recording isn't needed: the shelf, its field, its toggle and its count line already ship, and DESIGN.md and EXPERIENCE.md pin the pill, the lift, the fade, the copy and the motion. No API worker ran, because the server doesn't change. No subagent was launched.

## Test Strategy

Every leaf is in `frontend/e2e/search-boxes.spec.ts`, with the fixture turned off (`test.use({ cardNotesView: null })`), so `/card-notes` opens in Boxes view. The seed is `HABIT_SHELF` (card-note-boxes.ts): Atomic Habits 3 of 12, Deep Work 1 of 12, Refactoring 0 of 4, Tiny Habits 12 of 12, Walden 1 of 1 (its only note alone holds "woods"). Boxes are found by their Book (`boxOfBook`, by `href`), since their names change during a search. The lift, fade, slot and transitions are read by `boxFrames` without class names, and the pill by `pillLook`.

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E, fixture off, `HABIT_SHELF` | P0 | `:93` | After "habit", Atomic Habits's box shows the text "3 of 12" (`:108`). Then, once the transition is over: the four boxes with matches have lift −6 and opacity 1, and Refactoring has lift 0 and opacity 0.38 (`expect.poll`). Every box keeps its slot (the link's `offset*`, which a transform doesn't move), its front shadow and no scale. Matched boxes have no faded element. Refactoring has exactly one faded element, at 0.38, which holds the front and every card and is neither the link nor its list item. All 5 boxes stay visible. Each pill ("3 of 12", "1 of 12", "12 of 12", "1 of 1") is 22px tall on `pill-background` from DESIGN.md, `spine-label` text, the count line's font family (meta), 13px at 600, `9999px` corners, `0 8px` padding and no border, left-aligned with the title. Its dot is 6 × 6 in `pill-dot` from DESIGN.md, 8px before the text. A matched box has lost its count, and Refactoring keeps "4 card notes". "  HaBiT  " gives the same pills and state. "   " brings every box back to rest with its count and the totals line, with no group headings. |
| AC-2 | E2E, fixture off, `HABIT_SHELF` | P0 | `:162` | After "habit", the count line reads "17 card notes in 4 Books contain “habit”." (`:173`). Then: it isn't in a live region, `status` reads the same sentence, and only once (`recordStatus`, empties dropped). The five names in grid order are those in `HABIT_NAMES`. Adding "s" makes the line "5 card notes in 2 Books contain “habits”." before any pause, `status` follows it, and the names become "Atomic Habits, 1 of 12 card notes matches" and "Tiny Habits, 4 of 12 card notes match". "  WOODS " gives "1 card note in 1 Book contains “WOODS”." in the line and in `status`, "Walden, 1 of 1 card note matches" and "Atomic Habits, no match". |
| AC-3 | E2E, fixture off, `HABIT_SHELF` | P1 | `:201` | After "zettel", every box has lift 0 and opacity 0.38 (`:213`, `expect.poll`). Then "No card notes contain “zettel”." appears exactly once in `main` (the count line, with no separate List line) and isn't in a live region. Each box has one inner faded wrapper, is visible and is named "*Title*, no match". `status` reads the sentence once. |
| AC-4 | E2E, fixture off, `HABIT_SHELF` | P0 | `:230` | After "habit", the box named "Atomic Habits, 3 of 12 card notes match" is visible (`:240`): the Given, with the staging gone. Then there are no group headings and no `<mark>`, and `status` reads the shelf sentence. Esc empties the field, and every box is back at rest with no faded element, its "*Title*, N card notes" name, no "M of N" text and the totals line "41 card notes in 5 Books". Typing "habit" and then filling "" does the same. No `status` text matched "notes match". EXPERIENCE.md's Card notes shelf section still has **Search on the shelf.** but no "Staging (until the Epic 14 retro)" and no "Until Story 14.4". |
| AC-5 | E2E, fixture off, `HABIT_SHELF`, `reducedMotion` emulated | P1 | `:280` | Over 600ms of frames sampled from before the "habit" keystroke, Refactoring shows an opacity strictly between 0.38 and 1 (`:292`). Then Atomic Habits shows a lift strictly between 0 and −6. Both end at their final state. The faded wrapper's `opacity` (or `all`) transition, and the transition of whatever moves the front (`transform`, `translate` or `all`), are both `0.15s ease-out`. Under `reduce`, no in-between frame occurs and the end state is reached. Back with motion allowed, List → Boxes with "habit" in the field draws every frame of Refactoring at 0.38 and of Atomic Habits at −6 from its first frame. |
| AC-6 | E2E, fixture off, `HABIT_SHELF` | P1 | `:331` | After "habit" in Boxes, the box named "Atomic Habits, 3 of 12 card notes match" is visible (`:340`): Boxes applies the text in its own way. After the shelf sentence is announced, `status` is recorded. List: focus on List, the field still "habit", the four group headings, 17 `<mark>`, no boxes and no shelf sentence. Boxes: focus on Boxes, the field still "habit", the five match names, the "habit" state, the pill "3 of 12", the shelf sentence and no headings. `status` stayed silent through both presses. |
| AC-7 | E2E, fixture off, `HABIT_SHELF`, light, dark, forced colors | P1 | `:370` | After "habit", Refactoring has one inner faded wrapper at 0.38 (`:380`, `expect.poll`): the Given. Then 5 Tabs from the field (Boxes, List, Atomic Habits, Deep Work, Refactoring) focus it. It is named "Refactoring, no match", with `outline` `ACCENT solid 2px` at a 4px offset and the link's own opacity 1, and nothing faded at the link or its list item. In dark the outline is `ACCENT_DARK` and the opacity still 1. Under forced colors: a solid outline that isn't the accent, focus kept, and Atomic Habits's pill `Canvas` with `CanvasText` text, a `1px solid CanvasText` border and a `CanvasText` dot. The lift and the fade still hold. |

**Why these first assertions.** Each leaf starts with the one new thing its criterion promises, and today each fails there because of the staging. AC-4, AC-6 and AC-7 open on their Given (a searched shelf, which can't exist today), as 14.3's AC-2 did, and their own promise follows straight after.

**What the leaves pin (the contract for the build):**
- **The structure.** Inside each box link: one inner wrapper that holds every card and the front, and takes `opacity: 0.38` when the box has no match. The link and its `li` are never faded or given an opacity. The lift is a `transform` or `translate` on the front or an ancestor up to the `li`, −6px exactly at rest, with no scale and no change to the front's `box-shadow`. The link's layout slot never moves.
- **The pill.** A painted element around the text "M of N" (the text node itself may sit in a child), 22px tall, with the dot either an empty painted child or the pill's `::before` with a background. It stands where the count was, so the matched box no longer shows "N card notes".
- **Motion.** `transition` on the wrapper's `opacity` and on the moved element's `transform`/`translate` (or `all`), `150ms ease-out`. Under `prefers-reduced-motion: reduce` no intermediate value may render: either no transition then, or a duration of 0. On a List → Boxes switch the boxes mount in their final state.
- **Copy.** The count line swaps in place to "N card note(s) in M Book(s) contain(s) “q”." (q trimmed, as typed) or "No card notes contain “q”.". It is the only element with that text in `main` and stays outside a live region. `status` gets the same sentence once, after the pause. Names: "*Title*, M of N card notes match", "…, 1 of N card notes matches", "…, 1 of 1 card note matches", "*Title*, no match".
- **No staging.** With text in Boxes view there are no group headings, no `<mark>` and no "N notes match." announcement.

**Open for the build (not pinned):**
- Where the shelf sentence, match counts and match names live in `lib/cardNotes.ts` (AR63 asks for one matcher, `noteMatches`), and whether `useSearchCount` takes a view-dependent line.
- Whether the lift sits on the wrapper or the front, and whether the dot is a `::before` or a `span`.
- Any new `--card-note-box-pill-*`, `-lift`, `-fade` or `-transition` custom property in `tokens.css`, copied from DESIGN.md character for character, never formatted.

**Wording for the review (not a test change).** AC-2 quotes "14 card notes in 4 Books contain “habit”." But AC-1's own seed (3 of 12, 12 of 12, 1 of 12 and 1 of 1) adds up to 17 notes in 4 Books. The leaf asserts 17, the value the AC-1 seed gives. The review may want the AC's example aligned, or a note in `deferred-work.md`. AC-7's contrast ratios (4.96, 7.68) are DESIGN.md's computed pairs, not run-time values. The leaf pins the ring's exact colors (`ACCENT`, `ACCENT_DARK`) and an unfaded link instead.

## Existing leaves this story changes (for the build)

The staging is removed on purpose, so two of 14.2's leaves stop holding. The build edits them, not this run, since both still pass today:

- **`card-note-boxes.spec.ts:541` AC-10** ("until Story 14.4 … the List's results") asserts the staging and reads EXPERIENCE.md's staging note. Delete it: `search-boxes.spec.ts` AC-1 to AC-4 replace it.
- **`card-note-boxes.spec.ts:213–214` in AC-3** types "Candide note" in Boxes view and expects `status` to read "5 notes match.". After 14.4 it reads "5 card notes in 1 Book contain “Candide note”.". Change that one expected string. The rest of the leaf (List keeps the text, focus, silence) stays.
- **`card-note-boxes.spec.ts:6–7`** (the header comment about the staging): drop those two lines.
- `card-note-boxes.ts` only gained exports. `card-note-boxes*.spec.ts` and `open-box*.spec.ts` still pass: 37 passed and 7 skipped together with `search-boxes.spec.ts`, run on 2026-11-24 before any app change. `card-notes.spec.ts` and the other List specs aren't touched: the fixture keeps them in List.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Unit (`node --test`, `src/lib/cardNotes.test.ts`), AC-1/AC-2:** the shelf sentence (plural, singular, none, trimmed quote), the match count per group, and the match name in all four forms, through `noteMatches`. (done: frontend/src/lib/cardNotes.test.ts:327 `boxMatches and boxMatchPill`, :349 `cardNoteBoxName during a search`, :364 `shelfCountLine`; written by the build, read and run green by this run)
- [x] **E2E, AC-1 axe:** the searched shelf passes axe (`AXE_TAGS`) in light and dark. The faded contrast is the documented deviation, so the run either passes or excludes only `color-contrast` on faded boxes, and says so. (done: frontend/e2e/search-boxes-automate.spec.ts:83. Every other rule gives `[]`. Two rules are allowed, and only on Refactoring's faded box: `color-contrast`, and also `label-content-name-mismatch`, which axe reports on every faded box ("*Title*, no match" leaves out the visible count, WCAG 2.5.3; the build's deferred entry in `deferred-work.md`, for the Epic 14 retro))
- [x] **E2E, AC-1 regex characters:** a query like "(habit" or "." matches literally, as in the List. (done: frontend/e2e/search-boxes-automate.spec.ts:111)
- [x] **E2E, AC-2 pause:** `status` stays silent while typing continues inside 500 ms, then reads the last sentence once. (done: frontend/e2e/search-boxes-automate.spec.ts:141, under a paused clock)
- [x] **E2E, AC-2 window widths:** at 1024px (4 columns) and 1440px (5), a search moves no slot. (done: frontend/e2e/search-boxes-automate.spec.ts:198, one test per width)
- [x] **E2E, AC-4 blank field:** emptying the field announces nothing, and a pending sentence is dropped (as `useSearchCount` does for a blank query). (done: frontend/e2e/search-boxes-automate.spec.ts:163, under a paused clock, with a control)
- [x] **E2E, AC-5 dark:** the lift and fade look the same in dark, and the front's dark shadow is unchanged by the lift. (done: frontend/e2e/search-boxes-automate.spec.ts:218)
- [x] **E2E, AC-6 open a faded box:** a click on a faded box still opens its open box (the carried text is Story 14.5's). (done: frontend/e2e/search-boxes-automate.spec.ts:269; the field's text on arrival is left to 14.5)
- [x] **E2E, AC-7 pill dark:** the pill keeps `#E3EBE2` and `spine-label` in dark (fixed literals). (done: frontend/e2e/search-boxes-automate.spec.ts:244)

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `rgbOf`, `designComponentColor`, `DESIGN_MD`, `ACCENT`, `ACCENT_DARK`, `bookId` (library.ts); `SPINE_LABEL`, `finished` (bookcase.ts); `cardNotesPage` (pile.ts, re-exported by card-note-boxes.ts); `box`, `boxLinks`, `boxName`, `noteCount`, `groupHeadings`, `searchField`, `viewButton` (card-note-boxes.ts); `recordStatus`, `statusTexts`, `inLiveRegion` (card-note-add-another.ts); `systemColor` (dev-mode.ts); `afterAnnounceDelay` (stats.ts). The EXPERIENCE.md section split copies 14.2 AC-10's two lines, which that leaf's deletion leaves as the only copy.

Helpers added (all in card-note-boxes.ts):
- `HABIT_SHELF`, `HABIT_BOXES` and `HABIT_COUNT_LINE`: a seed with every match kind. `PILE_SHELF`'s generated texts all hold their title, so they can't give a partial match.
- `boxOfBook`: a box by its `href`. `box` finds one by name, which changes during a search.
- `boxFrames` and `boxFrameOf` (types `BoxFrame` and `FadedPart`): each box's lift, scale, effective front opacity, faded elements, layout slot, front shadow and transitions, read once or every animation frame. `boxLook` reads a box's parts at rest, with no opacity, transform or transition, and only for one box.
- `pillLook` (type `PillLook`): the pill and its dot. No helper reads a pill or a pseudo-element.

Shipped numbers:
- AC-1's pill text is `meta`: measured `--font-meta-size: 13px` (tokens.css:109). Its family is read at run time from the shipped count line (the probe read `system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`). Asserted as quoted.
- AC-1's `rounded.full`: measured `--radius-full: 9999px` (tokens.css:130). Asserted as quoted.
- AC-1's `spacing.2`: measured `--space-2: 8px` (tokens.css:134), asserted as the dot-to-text gap and the pill's side padding (`pill-padding: '0 {spacing.2}'`).
- AC-1's `spine-label`: `SPINE_LABEL` (bookcase.ts), DESIGN.md `#2B2E2A`, `--color-spine-label: #2B2E2A` (tokens.css:38). The pill's background and dot are read from DESIGN.md with `designComponentColor`.
- AC-2's "14 card notes in 4 Books": not shipped UI, but it disagrees with AC-1's seed. The leaf asserts 17, measured on the shipped List (the app probe below read "17 notes match."). Mismatch noted above.
- AC-7's ring `accent` vs `page`: the ring's colors ship (14.2 AC-7). `ACCENT` `#557059` and `ACCENT_DARK` `#93B597` equal `--color-accent` in tokens.css:22 and :226. The ratios 4.96 and 7.68 aren't asserted.
- The slot step in the probe below (240 = 216 + `spacing.6` 24) is shipped, but no leaf asserts it: AC-1 compares each slot with itself before the search.
- The pill's 22px and 6px, the lift's −6px, the fade's 0.38 and 150ms are new UI, so they weren't measured. They're asserted as quoted. No border or outline width in this story is fractional (the forced-colors pill border is 1px).

Probes (Chromium, Desktop Chrome 1280×720, `deviceScaleFactor` 1; commands `TZ=Europe/Madrid npx playwright test e2e/search-boxes.probe.spec.ts` and `e2e/search-boxes-app.probe.spec.ts`, both removed with `rm`):
- **`boxFrames`**, known good: a `setContent` grid of 216 × 196 links, each with an absolute wrapper holding two painted cards and a painted front with a label, under `forced-colors` `none` and `active`.
  - It returned exactly: lift −6 for a wrapper with `translateY(-6px)`, and −5 for `translate: 0 -5px`. Slots read `{8, 8, 216, 196}` and `{248, 8, …}` (body margin 8, gap 24), and `{248, 236, …}` on the second row (row gap 32). A 0.38 wrapper read `[{0.38, outer false, holdsAll true}]` with transitions `{opacity: '0.15s ease-out'}`. A wrapper with `transform 150ms ease-out, opacity 300ms cubic-bezier(…)` read both. A box at rest read `liftTransitions {}`.
  - It refused the wrong inputs: a faded link read `outer true`. `scale(1.02)` read `scaled true`. A front fading alone read `holdsAll false`. A link with no transition read `{all: '0s ease'}`.
  - **The probe changed the helper once:** the first version read the Book id from `link.href`, which threw on `about:blank`. It now parses the `href` attribute. The first probe run's slot mismatch was the probe's own expectation (it forgot the body's 8px margin), not the helper. Every probe re-ran after both changes and after `transitions` was added, and passed.
- **`boxFrames` sampling:** a 400ms sample started before a class change to opacity 0.38 with a 150ms transition gave 26 frames. Its first frame read 1, some frames read in between, and the last read 0.38. With `transition: none` no frame was in between. It ran under `reducedMotion` `no-preference` and `reduce`.
- **`pillLook`**, known good: a pill `inline-flex`, 22px, `0 8px`, `9999px`, `#E3EBE2`, 600 13px, with a `::before` dot 6 × 6 `#557059` and `margin-right: 8px`. It read exactly those values, with the dot's gap 8 and `leftOfTitle` 0. It refused a pill whose child-span dot was 5 × 5 with a 4px gap: it read 5, 5 and 4. It returned `null` for a box with no such text. Under forced colors it read the forced Canvas (white) background.
- **On the shipped app** (fixture off, `HABIT_SHELF`, light and dark): five boxes in `HABIT_BOXES` order with their "*Title*, N card notes" names and "41 card notes in 5 Books". Every frame read lift 0, opacity 1 and no faded element, with slot steps of 240. The front's shadow equalled DESIGN.md's box-front shadow for each theme, so `boxFrames` finds the shipped front. `pillLook` returned `null` for "3 of 12". In List: "habit" and "HaBiT" read "17 notes match." with the four headings, and the groups hold 3, 1, 12 and 1 notes. "habits" read 5 in Atomic Habits and Tiny Habits, "hab" 17, "WOODS" "1 note matches." in Walden, and "zettel" the no-match line. So the seed's counts are what the leaves assert.

Render-before-read: every leaf was checked. Each leaf waits web-first on the shipped boxes (`boxLinks` `toHaveCount(5)`) before its first `boxFrames` read or count-line font read. Each later `boxFrames`, `boxFrameOf` or `pillLook` read follows an `expect.poll` of the state it reads, or a visible pill, or (AC-5) the end of a sample that outlasts the 150ms transition. The forced-colors `pillLook` in AC-7 follows a web-first `toHaveCSS` on the focused box. No leaf needed a fix.

Storage keys: no new localStorage key.

## TDD Red Phase

- 7 e2e leaves, all `test.skip`, one per criterion. Each has a `// Red phase:` reason above it. There are no API or unit leaves.
- **Red run** (after the last probe and the last leaf change, 2026-11-24): a throwaway un-skipped copy, `e2e/search-boxes-red.probe.spec.ts`, removed with `rm`. **7 failed, each at its first assertion:** `:108`, `:173`, `:213`, `:240`, `:292`, `:340` and `:380`, the lines in the table above.
- `git status` lists no `*.probe.*` file and no throwaway copy: only `frontend/e2e/card-note-boxes.ts` (modified) and `frontend/e2e/search-boxes.spec.ts` (new).
- `npx prettier --check`, `tsc -b` and `oxlint` are clean on the changed e2e files. The skipped spec runs as 7 skipped.

## Next Steps (task-by-task activation)

1. `bmad-build-auto` builds the story. For each task, remove `test.skip` from its leaf and run `TZ=Europe/Madrid npx playwright test e2e/search-boxes.spec.ts` from `frontend/`.
2. Watch each leaf fail first, then pass. If a leaf fails for a reason outside the feature, fix the test and say so in the build's summary. Name any change to `boxFrames` or `pillLook`, since a changed helper voids its probe.
3. Make the three edits under "Existing leaves this story changes", then run the whole e2e suite. `card-notes.spec.ts`, `card-note-boxes*.spec.ts` and `open-box*.spec.ts` must pass.
4. Remove the staging note from EXPERIENCE.md → Card notes shelf → Temporary (and the **Temporary.** bullet itself, if it's left empty), and the staging sentence from `CardNotesPage.tsx`'s doc comment.
5. Run `npm run check` before the story goes to review.

## Implementation Guidance

- **Server:** none.
- **`lib/cardNotes.ts`:** add the shelf sentence, the per-group match count and the match name, all through `noteMatches` (AR63). The page computes none of them.
- **`CardNotesPage.tsx`:** drop the `query.trim() === ''` term from `boxesShown`. In Boxes view the count line shows the shelf sentence while the trimmed query is non-blank, and `useSearchCount`'s line is the shelf sentence in Boxes and "N notes match." in List, read when the pause ends. Pass each box its match count, or `null` with a blank query.
- **`CardNoteBox`:** one inner wrapper around the cards and the front, taking the fade, and the lift on it or on the front. The pill replaces the count. The name comes from the lib. Under `@media (prefers-reduced-motion: reduce)` the transition is removed. Under `forced-colors: active` the pill is `Canvas`, `CanvasText`, with a `1px solid CanvasText` border and a `forced-color-adjust: none` `CanvasText` dot. The fade and lift aren't overridden.
- **Unchanged:** List view, the open box, the toggle's behavior and the remembered view.
