---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-24'
storyId: '14.5'
storyKey: '14-5-keep-the-search-when-i-open-a-box-and-come-back'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-145-keep-the-search-when-i-open-a-box-and-come-back'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-14-5-keep-the-search-when-i-open-a-box-and-come-back.md'
generatedTestFiles:
  - 'frontend/e2e/carried-search.spec.ts'
  - 'frontend/src/lib/carriedSearch.test.ts'
  - 'frontend/src/test-support/strictRoot.ts (test support: a <StrictMode> client root for node --test)'
  - 'frontend/e2e/card-note-boxes.ts (boxStates, boxTrack)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 14.5; FR-19, AR63, AR65, UX-DR90, UX-DR91)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-7 Carried Card notes search)'
  - '_bmad-output/implementation-artifacts/epic-14-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card notes shelf → Search on the shelf, Into a box with the search, Back out with the search, Starts empty)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (14-4 done, 14-5 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-14-4-search-the-boxes.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CardNotesPage.tsx, pages/HomePage.tsx (hand-off pattern), components/CardNoteBox.tsx, components/PageHeading.tsx, lib/page.ts, lib/useSearchCount.ts, lib/cardNotes.ts, main.tsx'
  - 'frontend/e2e/fixtures.ts, library.ts, card-note-boxes.ts, card-note-add-another.ts, back-to-top.ts, dev-mode.ts, stats.ts, search-boxes*.spec.ts, card-notes.spec.ts, open-box*.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given "habit" typed on the shelf, when I open a matching box, then the open box''s field holds "habit", only its matching notes show with the matches in <mark>, focus goes to the h1, the page is at the top, and once focus has settled status announces "3 notes match." once ("1 note matches."); and opening a faded box shows "No card notes contain “habit”.", keeps "Go through as a pile", and announces "0 notes match." once; and the URL is /card-notes?book=<id> with no search text in it.' }
  - { id: AC-2, idSource: generated, text: 'Given I opened a box from the shelf with "habit", then changed the field to "habits", when I press browser Back, then the shelf returns in the remembered view with "habits" in the field and the boxes faded and lifted for "habits", focus on the h1, the page at the top, and status announces the shelf sentence once (in List view, "N notes match."); and had I cleared the field on the open box, the shelf returns with an empty field and every box at full strength.' }
  - { id: AC-3, idSource: generated, text: 'Given an open box with text in its field, however it was entered (a box, "See card notes", "See all card notes"), when I remove its "In X" chip, then /card-notes is pushed and the shelf shows that text, faded and lifted for it, announced as after Back; and Back from there returns to the open box with an empty field.' }
  - { id: AC-4, idSource: generated, text: 'Given text in the field, when I reach the Card notes page any other way: the nav link (from the shelf too), a box opened with an empty field, "See card notes", "See all card notes", Back to the shelf from another page, a reload of the same history entry, Forward, or a typed URL, then the field is empty and nothing is announced for a search; and the text was never in the URL, in localStorage or in history.state (AR65).' }
  - { id: AC-5, idSource: generated, text: 'Given the carried-search decision (AR65), when its unit test runs it under <StrictMode>, then the text is kept only on a PUSH carrying the page''s marker and on a POP landing on the openedFrom of the entry just left, and every other location.key change starts empty; and the decision runs during render, never in an effect and never by writing a ref in render; and the page''s body is keyed by location.key, so each history entry gets a fresh view query (no placeholder data) and fresh pile, panels, pending count and focus maps; and while the view has no groups, the text is dropped.' }
  - { id: AC-6, idSource: generated, text: 'Given a carried search arriving on the shelf (by Back or the chip), when the boxes render, then they are in their search state at once, with no lift or fade animation (UX-DR90).' }
---

# ATDD Checklist: Story 14.5 Keep the search when I open a box and come back

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are both in place. This story is frontend only. The server doesn't change, and the text never reaches it. So the leaves are e2e, plus one unit leaf that AC-5 asks for by name.
- **Story:** Story 14.5 in `epics.md` has 6 Given/When/Then criteria, none with ids. They're numbered AC-1 to AC-6 in source order (registry above), and each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `14-5-keep-the-search-when-i-open-a-box-and-come-back`, and 14.4 is `done`. There's no spec file yet, so the story file is the `epics.md` section, as for 14.1 to 14.4.
- **Epic gate:** 14.5 isn't Epic 14's first story, so the spine gate doesn't apply. It is Epic 14's last story: after its review, `bmad-testarch-automate` and then the Epic 14 retro come next (AGENTS.md → Epic boundaries).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotesPage` keys its body by `bookId`, not by `location.key`, and the text is `useState('')` inside that body. So the text is lost on every scope change (a box, the chip, Back), but kept across a REPLACE on the same scope (the nav link clicked on the shelf). The probe below saw both.
  - No router state is built: `CardNoteBox` is a plain `<Link>` and the chip is `navigate(cardNotesPath())`.
  - Nothing scrolls to the top on a key change. On Back the browser restores the shelf's old scroll position (76px in the probe).
  - Focus already goes to the `h1` on every client-side navigation (`PageHeading`, `lib/page.ts`).
  - AD-7 requires the decision to be unit-tested under `<StrictMode>`, "because e2e runs a production build". The repo had no way to do that: `node --test` has no DOM and no JSX, there's no jsdom or happy-dom, and `react-dom/server` doesn't double-render under StrictMode (probed: 2 bodies from a render-phase update, the same without StrictMode).

## Generation Mode

**AI generation**, run in sequence in this session, as for 14.1 to 14.4. Recording isn't needed. The shelf, the open box, the chip and the nav link all ship, and EXPERIENCE.md and AD-7 pin the copy and the rules. No API worker ran, because the server doesn't change. No subagent was launched.

## Test Strategy

The e2e leaves are in `frontend/e2e/carried-search.spec.ts`. They run with the fixture off (`test.use({ cardNotesView: null })`), so the shelf opens in Boxes view, at **1280×400**, where the shelf scrolls 76px (measured). The seed is 14.4's `HABIT_SHELF`. "habit" gives Atomic Habits 3 of 12, Deep Work 1 of 12, Refactoring 0 of 4, Tiny Habits 12 of 12 and Walden 1 of 1. "habits" gives Atomic Habits 1 and Tiny Habits 4. The unit leaf is in `frontend/src/lib/carriedSearch.test.ts`. It runs on `node --test`, under `<StrictMode>` with the real client renderer (`src/test-support/strictRoot.ts`) and a `MemoryRouter`.

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E, fixture off, `HABIT_SHELF`, 1280×400 | P0 | `carried-search.spec.ts:84` | On the shelf with "habit" (its 14.4 sentence announced), scrolled to the bottom, a click on Atomic Habits opens the open box (its chip "In Atomic Habits" is visible). There the field holds **"habit"** (`:97`). Then: 3 notes, three `<mark>` reading "habit" in any case, the `h1` focused, `scrollY` 0, and `status` reads "3 notes match." exactly once, with the `h1` focused at that moment (`watchFocusAtStatus`). The URL is exactly `/card-notes?book=<id>`. Then a fresh shelf with "habit" and a click on faded Refactoring: field "habit", "No card notes contain “habit”.", no notes, "Go through as a pile" visible, the `h1` focused, "0 notes match." once with the `h1` focused, and the exact URL. |
| AC-2 | E2E, fixture off, `HABIT_SHELF`, 1280×400 | P0 | `:130` | The shelf with "habit", scrolled to the bottom (76px). Then Atomic Habits, "habits" typed there ("1 note matches." announced), scrolled to the bottom, and Back. Once the 5 boxes are drawn, the field holds **"habits"** (`:148`). Then: the boxes reach `HABITS_STATE` (Atomic Habits and Tiny Habits lifted −6, the rest faded to 0.38), the count line reads "5 card notes in 2 Books contain “habits”.", Boxes is pressed, the `h1` is focused, `scrollY` is 0, `status` reads the shelf sentence exactly once with the `h1` focused, and the URL is `/card-notes`. Then Tiny Habits opens with "habits" carried, its own "4 notes match." is waited out, the field is cleared and Back is pressed. The field is empty, every box is at rest, the count line reads "41 card notes in 5 Books", the `h1` is focused and nothing is announced. |
| AC-3 | E2E, fixture off, `HABIT_SHELF` | P1 | `:181` | Atomic Habits is entered from Book detail's "See all card notes" (no box, so no `openedFrom`). "habit" is typed there and "3 notes match." announced, then "Remove In Atomic Habits" is pressed. The URL is `/card-notes`, and once the 5 boxes are drawn the field holds **"habit"** (`:197`). Then: `HABIT_STATE`, the shelf sentence "17 card notes in 4 Books contain “habit”.", the `h1` focused, `scrollY` 0, and the sentence announced once with the `h1` focused. Back returns to `/card-notes?book=<id>` with its chip, an empty field and all 12 notes. |
| AC-4 | E2E, fixture off, `HABIT_SHELF` | P0 | `:216` | On the shelf with "habit" (announced, then recording), the nav link "Card notes" is clicked. That's a REPLACE with a new key (probed), and the field is **empty** (`:225`). Then: every box at rest, the totals line, the `h1` focused, and nothing announced. Next, carried into Atomic Habits with "habit": the URL, `history.state` and every `localStorage` entry hold no "habit". Back brings "habit" to the shelf, and Forward to the open box starts empty with 12 notes. A reload of that entry starts empty. Shelf with "habit", the nav link to Catalog, then Back: empty and at rest. A typed URL starts empty. |
| AC-5 | Unit (`node --test`), `<StrictMode>`, `MemoryRouter` | P0 | `carriedSearch.test.ts:109` | On `/card-notes` (key `"default"`), "habit" is typed, then a push to `?book=11` with `carryState('default')`. Every commit of the new entry shows **`'habit'`** (`:121`). Then: Back after "habits" gives `'habits'`, Forward gives `''`, the chip's push (`carryState()`) after "zettel" gives `'zettel'`, Back from there to the box gives `''`, a push without state gives `''`, a REPLACE gives `''` with or without the marker, and a re-render with groups keeps `'habit'`. `noGroups` drops it to `''`, and it stays `''` when the groups come back. No router state ever holds the text. A mount whose entry carries the marker gives `''`. `carryState('k-42')` holds `k-42` in at most 2 keys, and `carryState()` has at most 1. `lib/carriedSearch.ts` exists and has no `useEffect`, `useLayoutEffect`, `useInsertionEffect` or `useRef`. |
| AC-6 | E2E, fixture off, `HABIT_SHELF` | P1 | `:279` | The shelf with "habit" at rest in `HABIT_STATE`, then Atomic Habits. `boxFrames` samples 1500ms, started before Back. Every frame where Refactoring is drawn reads opacity **0.38** (`:293`). Then every frame of Atomic Habits reads lift −6 and of Refactoring lift 0, Refactoring is drawn in more than 30 frames (the probe saw 91), and the field holds "habit". |

**Why these first assertions.** Each leaf starts with the one new thing its criterion promises, and each of them fails today. AC-1, AC-2 and AC-3 read the field's value on arrival, because that's what carrying means. AC-4 takes the branch that fails today, the nav link on the shelf. It is the only "starts empty" branch that the current keying gets wrong, so it is the transition the build must add (a body keyed by `location.key`). Every other branch in AC-4 already starts empty today, so it follows the first assertion. AC-6 asserts the frames, because the field alone can't tell "at once" from "animated". AC-5 checks the commits right after a PUSH with the marker.

**What the leaves pin (the contract for the build):**
- **The decision module.** `frontend/src/lib/carriedSearch.ts` exports `useCarriedSearch({ noGroups }): readonly [text, setText]`, which reads `useLocation()` and `useNavigationType()` itself, and `carryState(openedFrom?)`, the router state for a box link's push (with `openedFrom`) or the chip's (without). `noGroups` is true only while the entry's view is **ready with no groups**, not while it loads: a carried text must survive the new entry's load. The build may rename either. Then it edits `carriedSearch.test.ts`'s `CarriedSearch` type and `MODULE` to match, switches to a static import, drops `load()`'s stand-in, and says so. The module has no effect and no ref. The reference implementation the probe used follows `HomePage`'s hand-off: `useState({ key, state, text })`, set during render when `location.key` differs.
- **The rules, as the unit leaf runs them.** Kept: a PUSH whose state carries the marker, and a POP to the key named by the `openedFrom` of the entry just left. Everything else is `''`: Forward, a POP from the chip's shelf to the box, a push without state, a REPLACE with or without state, and a mount with the marker. `noGroups` clears the stored text, not only the shown one.
- **The page.** The box link pushes with `carryState(shelfKey)` and the chip with `carryState()`. The body is keyed by `location.key`. On each key change the page scrolls to the top with `behavior: 'auto'` (AC-2 and AC-3 see `scrollY` 0 after Back restored 76px), then the `h1` takes focus (already shipped). The carried search is announced once, after the view is `ready` and the `h1` has focus: the open box's "N notes match.", the shelf sentence in Boxes, "N notes match." in List.
- **Copy.** Unchanged from 14.4 and the List: "3 notes match.", "1 note matches.", "0 notes match.", the shelf sentence, and "No card notes contain “…”.".
- **Motion.** Boxes that arrive with a carried search are drawn in their final state from their first frame (AC-6). The 14.4 transitions must not run on mount.

**Open for the build (not pinned):**
- Where `noGroups` comes from. The text lives in `CardNotesPage` (the route component), above the keyed body. The page can read the same `card-notes` view (cached) or let the body report it, but never through an effect that writes the text.
- The marker's name and shape (the leaf only bounds the key count), and how `CardNoteBox` takes the state (a `state` prop, or a `linkState` built by the page).
- How the carried announcement waits for focus. `useSearchCount` stays the typed path.

**Wording for the review (not a test change).**
- AC-1's "the page is at the top" can't fail today. Clicking a box shows the open box's loading state first, which clamps `scrollY` to 0 (probe: 0 after a click from 76). The leaf still asserts it. AC-2 and AC-3 are where the scroll rule is really tested.
- The epic context says the existing Card notes specs pass "with no edit to their files". AC-3 overrides that for one leaf (next section). The review may want the context's line narrowed.
- AC-5's "fresh view query (no placeholder data) and fresh pile, panels, pending count and focus maps" isn't read by the unit leaf. It was meant to be covered by AC-4's nav-link branch, but the review found that branch passes with the body keyed by `bookId` too (the hook empties the field on its own). The green follow-up "E2E, AC-5 fresh body" below now covers it, checked against that mutation (automate, 2026-11-24).

## Existing leaves this story changes (for the build)

Both still pass today. The build edits them, because the carried search changes what they assert:

- **`card-notes.spec.ts:497` `[P1] AC-5 removing the chip while searching starts the wider view with an empty search`.** With "spice" in Dune's field, the chip now carries "spice" to the shelf (in List view, under the fixture). Change it to expect "spice" in the field and only Dune's matching note. Or rename it to what 14.5 makes true and keep a chip-without-text case. Say which in the build's summary.
- **`search-boxes-automate.spec.ts:269` `[P1] AC-6 a click on a faded box still opens its open box`.** With "habit" carried into Refactoring, the open box reads "No card notes contain “habit”." and `RF note 01` is no longer listed. Replace the last line with the no-match line and "Go through as a pile", or clear the field first. Its comment already leaves the field's text to 14.5.
- `card-note-boxes.ts` only gained exports. No other shipped leaf asserts an empty field after a navigation with text (grep of `toHaveValue('')` across the Card notes specs). `open-box-unscoped.spec.ts:48` and `open-box-automate.spec.ts:114` remove the chip with an empty field.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **E2E, AC-1 singular:** Deep Work or Walden opened with "habit" announces "1 note matches." once. (done: frontend/e2e/carried-search-automate.spec.ts:77, Walden)
- [x] **E2E, AC-1 keyboard:** Enter on a focused box carries the text the same way as a click. (done: frontend/e2e/carried-search-automate.spec.ts:77)
- [x] **E2E, AC-2 List view:** with List remembered (the fixture's default), removing the chip of an open box with "habit" shows the List's grouped results for "habit" with highlights, and `status` reads "17 notes match." once with the `h1` focused. Boxes are Boxes-only, so in List view the chip is the way out with the text. (done: frontend/e2e/carried-search-automate.spec.ts:321)
- [x] **E2E, AC-2 no match:** Back with a text that matches nothing shows every box faded and "No card notes contain “…”." announced once. (done: frontend/e2e/carried-search-automate.spec.ts:98)
- [x] **E2E, AC-3 the other two ways in:** the chip carries the text when the open box was entered by a box and by Home's "See card notes" too. (done: frontend/e2e/carried-search-automate.spec.ts:122)
- [x] **E2E, AC-4 the remaining ways:** a box opened with an empty field, "See card notes", "See all card notes" (from Book detail, with text typed on the shelf before leaving), and the nav link from the open box all start empty, with nothing announced. (done: frontend/e2e/carried-search-automate.spec.ts:166)
- ~~**E2E, AC-4 bfcache:** not testable in the e2e server setup; leave it to the review if needed (AD-7: "a bfcache restore keeps the page as left").~~ **Retired:** Playwright can't force a bfcache restore, and nothing in the code handles one (a restore shows the page as the browser kept it). Recorded in `automation-summary.md` (Story 14.5) as not automated; AD-7 states the behavior.
- [x] **E2E, AC-5 fresh body:** after the nav-link REPLACE, an open pile or panel is gone, a pending count (typed less than 500ms before the click) is never announced, and the view is refetched with no placeholder data. Use a paused clock, as `search-boxes-automate.spec.ts` `openPaused` does. (done: frontend/e2e/carried-search-automate.spec.ts:225, the nav-link REPLACE: the view's GET is sent again, the pending count is never announced, `scrollY` 0; frontend/e2e/carried-search-automate.spec.ts:350, an open pile gone after a two-step Back between two shelf entries. Both fail with the body keyed by `bookId`. "No placeholder data" is shown by the refetch on mount; `useCardNotesView` sets no `placeholderData`.)
- [x] **E2E, AC-6 by the chip:** a chip removal with text draws every box in its final state from its first frame. (done: frontend/e2e/carried-search-automate.spec.ts:255)
- [x] **E2E, reduced motion and dark:** a carried arrival under `reducedMotion: 'reduce'` and in dark is drawn the same. (done: frontend/e2e/carried-search-automate.spec.ts:279)
- [x] **E2E, axe:** the open box arriving with a carried search passes axe (`AXE_TAGS`). (done: frontend/e2e/carried-search-automate.spec.ts:299, light and dark)
- [x] **Unit, AC-5 coalesced moves:** a `navigate(-2)` from a box opened from a shelf two entries back counts from the handled location (AD-7 "a move the router coalesced counts from it"). (done: frontend/src/lib/carriedSearch.test.ts:195)

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `HABIT_SHELF`, `HABIT_BOXES`, `HABIT_COUNT_LINE`, `boxFrames`, `boxLinks`, `boxOfBook`, `cardNotesPage`, `searchField`, `viewButton` (card-note-boxes.ts); `recordStatus`, `statusTexts`, `watchFocusAtStatus`, `focusAtStatus` (card-note-add-another.ts); `scrollToY` (back-to-top.ts); `mainNav` (dev-mode.ts); `afterAnnounceDelay` (stats.ts). `boxFrames` is reused unchanged and wasn't re-probed for its own reads, but its sampling across a same-document Back is new use, probed below.

Helpers added:
- `boxStates` (card-note-boxes.ts): every box's id, lift and opacity now. It is 14.4's spec-local `resting` (in `search-boxes.spec.ts` and `search-boxes-automate.spec.ts`), moved to the shared module instead of a third copy. The two 14.4 copies are left as they are: a clean-up for the review or the automate step, not this story's.
- `boxTrack` (card-note-boxes.ts): one box across sampled frames. It is 14.4's spec-local `track` (`search-boxes.spec.ts`), moved the same way.
- `strictRoot` (`src/test-support/strictRoot.ts`): renders a tree under `<StrictMode>` with `react-dom/client` in `node --test`, on a stub `window`, `document` and container. No existing helper renders React in node, and it needs no new dependency.
- Spec-local in `carried-search.spec.ts`: `searchedState` (an expected `boxStates` value from a match list), `chip` (the shipped "In *X*" text), `notes` (main's list items), `announced` (non-empty `statusTexts`) and `searchTheShelf` (go, type, wait for 14.4's announcement). Each is a one-line locator or a composition of the reused helpers. `card-notes.spec.ts` has its own `notes` and `recordStatus` (spec-local, a different recording shape), which aren't importable from a spec.
- Spec-local in `carriedSearch.test.ts`: `load`, `mount`, `texts` and `keyOf`, the harness around `useCarriedSearch`.

Shipped numbers:
- The shelf scrolls 76px at 1280×400: measured with the probe below (`scrollHeight` 476 against 400). At 1280×720 it doesn't scroll (720 against 720), which is why the leaves use 400. Asserted only as "scrolled before" (the leaves scroll to the bottom and then assert 0).
- The open box's heights at 1280×400: Atomic Habits 2109, Refactoring 963, Walden 533. So every open box scrolls, but AC-1's 0 can't fail today (see the review wording above).
- "habits" gives "5 card notes in 2 Books contain “habits”.": measured on the shipped shelf. Atomic Habits's open box with "habits" gives "1 note matches." (asserted as a setup wait), and Tiny Habits's gives 4.
- The lift −6 and the fade 0.38 are 14.4's shipped values, read by `boxStates` on the shipped shelf (`HABIT_STATE` matched).
- "17 card notes in 4 Books contain “habit”.", "41 card notes in 5 Books", "3 notes match." and "0 notes match." ship (14.4 and the List). No border or outline width is asserted.

Probes. The e2e probes ran on Chromium, Desktop Chrome, `deviceScaleFactor` 1, with the fixture off. They were `TZ=Europe/Madrid npx playwright test e2e/carried-search-app.probe.spec.ts` and `e2e/carried-search-helpers.probe.spec.ts`, then removed with `rm`. The unit probes ran as `node --test src/lib/carriedSearch.<variant>.probe.test.ts` and `src/test-support/strictRoot.probe.test.ts`, then removed with `rm`.
- **The shipped app** (1280×720 and 1280×400):
  - The heights above.
  - The nav link clicked on the shelf with "habit" changed `history.state` from `{"idx":0}` to `{"usr":null,"key":"c3y7lb68","idx":0}`, a REPLACE with a new key, and the field still read "habit" (AC-4's red branch).
  - A box click from 76px read `scrollY` 0 with an empty field. Back read `scrollY` 76 with an empty field. Book detail's "See all card notes" opened the open box. The chip, with "habit" typed, gave `/card-notes` with an empty field.
- **`boxStates`**, on the shipped shelf at 1280×400:
  - It returned exactly `AT_REST` at rest, `HABIT_STATE` once the "habit" transition was over, and `HABITS_STATE` after "habits".
  - It refused the wrong value: after "habit" it didn't equal `HABITS_STATE`.
- **`boxTrack`**, on a 600ms `boxFrames` sample across typing "habit": Refactoring was drawn in 38 frames, the first at 1 and the last at 0.38, with 8 in between. An unknown id gave `[]`.
- **`boxFrames` across Back** (new use): 1500ms started on the open box, then `page.goBack()`. That gave 92 frames: the first had no boxes, and the boxes were drawn from frame 1 on. Refactoring was drawn in 91 frames, all at opacity 1, so today's no-carry state is what AC-6's first assertion refuses.
- **`strictRoot`**: a component's body ran twice on mount and twice on an update. A plain `createRoot` on the same stubs ran it once, so the 2 is StrictMode, not the stub. After `unmount`, `globalThis` had no `window` and no `IS_REACT_ACT_ENVIRONMENT`.
- **The unit leaf itself**, as a throwaway un-skipped copy against three modules:
  - A **reference** `useCarriedSearch` (render-phase, the `HomePage` pattern, no effect or ref) passed every assertion.
  - An **effect-based** one failed at the Forward step (`['habits', '']`: a commit showed the stale text).
  - The **missing** module (today's state) failed at `:121`: `['']` where `['habit']` was expected.
  - So the leaf can pass, it catches an effect, and it fails red at its first assertion.
- **Re-run after formatting:** Prettier reformatted `strictRoot.ts` (layout only) after its probe, and it moved lines in the spec. So the reference, red unit and red e2e runs were all redone afterwards. The numbers above are from those runs.

Render-before-read: every leaf was checked.
- Each e2e leaf waits web-first on something that ships before its first one-shot read: `boxLinks` `toHaveCount(5)` on the shelf, the chip "In *X*" on the open box, `status` `toHaveText` of the shipped announcement before `recordStatus` starts, and the URL.
- Every `boxStates` read is an `expect.poll`. Every `announced` read is either an `expect.poll` or follows one plus `afterAnnounceDelay`.
- AC-6's `boxFrames` sample is awaited as a whole, after Back.
- `scrollY` is read only through `expect.poll`.
- In AC-2, the second Back's "nothing announced" waits for Tiny Habits's own carried "4 notes match." before recording, so a late announcement can't land in the recording. That wait was added while the leaves were written, before any red run.
- No leaf needed a fix after the check.

Storage keys: no new localStorage key (AR65 forbids storing the text; AC-4 asserts no `localStorage` entry holds it).

## TDD Red Phase

- 5 e2e leaves (`carried-search.spec.ts`) and 1 unit leaf (`carriedSearch.test.ts`), all `test.skip`, one per criterion. Each e2e leaf has a `// Red phase:` reason above it, and the unit file's header gives its own.
- **Red runs.** These ran after the last probe, the last leaf change and Prettier, on 2026-11-24, as throwaway un-skipped copies removed with `rm`:
  - **e2e** (`e2e/carried-search-red.probe.spec.ts`): **5 failed, each at its first assertion.** AC-1 at `:97` (expected "habit", received ""), AC-2 at `:148` ("habits" / ""), AC-3 at `:197` ("habit" / ""), AC-4 at `:225` ("" / "habit") and AC-6 at `:293` (the Set {1} where {0.38} is expected).
  - **unit** (`src/lib/carriedSearch.red.probe.test.ts`): **1 failed at `:121`**, `['']` where `['habit']` is expected.
- `git status` lists no `*.probe.*` file and no throwaway copy. It lists `frontend/e2e/card-note-boxes.ts` (modified), and `frontend/e2e/carried-search.spec.ts`, `frontend/src/lib/carriedSearch.test.ts` and `frontend/src/test-support/strictRoot.ts` (new).
- `npx prettier --check`, `tsc -b` and `oxlint` are clean on the changed files. `node --test 'src/**/*.test.ts'` gives 406 passed and 1 skipped. The e2e spec runs as 5 skipped.

## Next Steps (task-by-task activation)

1. `bmad-build-auto` builds the story. Write `lib/carriedSearch.ts` first, then in `carriedSearch.test.ts` switch to a static import and remove `skip`. Run `node --test src/lib/carriedSearch.test.ts` from `frontend/`.
2. For each e2e task, remove `test.skip` from its leaf and run `TZ=Europe/Madrid npx playwright test e2e/carried-search.spec.ts` from `frontend/`. Watch each leaf fail first, then pass. Name any change to `boxStates`, `boxTrack` or `strictRoot`, since a changed helper voids its probe.
3. Make the two edits under "Existing leaves this story changes", then run the whole e2e suite. `card-notes.spec.ts`, `card-note-boxes*.spec.ts`, `search-boxes*.spec.ts` and `open-box*.spec.ts` must pass.
4. Update `CardNotesPage.tsx`'s doc comment ("The search lives in this page's state, never in the URL.") for the carried search.
5. Run `npm run check` before the story goes to review.

## Implementation Guidance

- **Server:** none.
- **`lib/carriedSearch.ts`:** `useCarriedSearch` and `carryState` as pinned above, decided in render.
- **`CardNotesPage.tsx`:** the route component calls `useCarriedSearch` and passes the text and setter to a body keyed by `location.key` (no longer by `bookId`). The body's `query` state becomes those props. On each key change it scrolls to the top (`behavior: 'auto'`) before the `h1` takes focus. A carried text is announced once, from an effect that waits for `ready` and the `h1`'s focus and cancels on cleanup. The chip pushes `cardNotesPath()` with `carryState()`.
- **`CardNoteBox.tsx`:** the link pushes with the page's `carryState(location.key)`.
- **Unchanged:** the List, the shelf's own search (14.4), the copy, the remembered view, and the server.
