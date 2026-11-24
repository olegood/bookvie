---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-24'
storyId: '14.3'
storyKey: '14-3-see-the-open-box-in-its-book-s-color'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-143-see-the-open-box-in-its-books-color'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-14-3-see-the-open-box-in-its-book-s-color.md'
generatedTestFiles:
  - 'frontend/e2e/open-box.spec.ts'
  - 'frontend/e2e/card-note-boxes.ts (openBoxColor, isCardNotesView, openBoxStrip, StripLook)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 14.3; AR62, AR63, UX-DR89)'
  - '_bmad-output/implementation-artifacts/epic-14-context.md'
  - '_bmad-output/planning-artifacts/card-note-boxes-plan-2026-11-23.md (D14)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.open-box-strip; Layout & Spacing → Card notes; Components → Open box strip; Forced colors)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card notes shelf → The open box; Back to top; Open box strip row; empty states)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (14-2 done, 14-3 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-14-2-see-my-card-notes-as-boxes.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CardNotesPage.tsx + .module.css, components/AppShell.tsx + .module.css, pages/CardNotesBlock.tsx, styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, library.ts, card-note-boxes.ts + .spec.ts, card-notes.spec.ts, card-notes-pile.spec.ts, pile.ts, home.ts, card-note-keys.ts, card-note-add-another.ts, back-to-top.ts, back-to-top-automate.spec.ts, dev-mode.ts, stats.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Boxes view, when I open a box (click or Enter), then the open box shows the scoped page as before Epic 14 (the "In X" chip, Search card notes, Add card note, the notes, "Go through as a pile", Back to top) with no view toggle; and the open box strip, an 8px band the full width of the window directly under the app shell, above the page''s top padding, in scope.spineColor exactly, with no edge, label or shadow, aria-hidden, the same in both themes, CanvasText under forced colors; and the strip shows also on the open box of a Book with no notes (reached from Book detail), only once the view has loaded, never before it and never under "Couldn''t load"; and reaching the scoped page by "See card notes" or "See all card notes" gives the same open box; and Add card note, Edit, the pile and focus return work there as before Epic 14.' }
  - { id: AC-2, idSource: generated, text: 'Given the open box, when it renders, scrolled more than one window height, then Back to top shows and works as before Epic 14, moving focus to Search card notes.' }
  - { id: AC-3, idSource: generated, text: 'Given the open-box-strip component token in DESIGN.md, when the strip is styled, then its height comes from DESIGN.md''s components block, and any literal added to frontend/src/styles/tokens.css matches DESIGN.md character for character, so e2e/app-shell.spec.ts still passes.' }
---

# ATDD Checklist: Story 14.3 See the open box in its Book's color

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are both in place. This story is frontend only: 14.1 already put `spineColor` on the scope, even for a Book with no notes. So every leaf is e2e.
- **Story:** Story 14.3 in `epics.md` has 3 Given/When/Then criteria, none with ids. They're numbered AC-1 to AC-3 in source order (registry above), and each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `14-3-…`, and 14.2 is `done`. There's no spec file yet, so the story file is the `epics.md` section, as for 14.1 and 14.2.
- **Epic gate:** 14.3 isn't Epic 14's first story, so the spine gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotesPage` renders `CardNotesFrame` (a `.page` flex column with `spacing.page-top` / `spacing.page-x` padding, the `h1`), then the chip (scoped), the toolbar and the groups. The view toggle already shows only when unscoped (14.2). `main` (`AppShell`) has no padding, and the header is the 60px top bar (`--space-topbar-height`, its 1px hairline included), plus the update notice when shown.
  - Book detail's Card notes block links "See all card notes" only when the Book has notes (`CardNotesBlock.tsx:89`). The Main book card's "See card notes" links even with no notes.
  - There's no `open-box-strip` custom property in `tokens.css` yet. DESIGN.md's `components.open-box-strip.height` is `8px`.

## Generation Mode

**AI generation**, run in sequence in this session. Recording isn't needed: the scoped page, its roles and its entry links already ship, and DESIGN.md and EXPERIENCE.md pin the strip's size, color, place and states. No API worker ran, because the server doesn't change.

## Test Strategy

Every leaf is in `frontend/e2e/open-box.spec.ts`, with the fixture turned off (`test.use({ cardNotesView: null })`), so `/card-notes` opens in Boxes view and a box can be clicked. The strip is found by `openBoxStrip` (card-note-boxes.ts) without class names: the first element outside the header and any dialog with a non-transparent `background-color`, under 40px tall and at least half the window wide.

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E, fixture off, `PILE_SHELF`, then `mainAt(120)` twice | P1 | `:49` | After a click on Candide's box, the strip's background is Candide's `scope.spineColor` (`:58`, `expect.poll`). Then: the URL is Candide's open box; the strip has left 0, height 8, `0px` borders, no shadow and no text, is `aria-hidden`, starts at the header's bottom and is as wide as the window; the `h1` starts `8 + 24` px under the strip's top; the chip "In Candide", the search, the one group with 5 notes and "Go through as a pile" show, with no toggle and no box links. In dark the color is the same. Under forced colors it is `CanvasText` with `forced-color-adjust: none`. Enter on Beloved's box opens Beloved's open box in its color. While the view is held, the `h1` shows with no strip, and the strip comes once the group renders. Under a 500, "Couldn't load…" shows with no strip. A Book with no notes, through the Main book card's bare "See card notes", shows the strip, and Add card note there (Page prefilled 120) saves, says "Card note saved.", parks focus on `main` and keeps the strip. "See card notes · 7" and Book detail's "See all card notes" give the strip in the Book's color with no toggle. On Dune's open box, an Edit save refocuses that note's Edit and says so, and the pile opens at "1 of 4" and Esc returns focus to Edit p.12. |
| AC-2 | E2E, fixture off, `LONG_NOTES` with ids | P1 | `:176` | After a click on Solaris's box (50 notes), the strip is in Solaris's color (`:187`): the Given, the open box. Then Back to top shows at 1.5 window heights and is gone just under one, and a press from the bottom scrolls to 0 and focuses Search card notes. |
| AC-3 | E2E, fixture off, plus a file read | P2 | `:202` | The strip's height equals DESIGN.md's `components.open-box-strip.height`, read from the file (`:211`). Then every `--open-box-strip-*` custom property in `tokens.css` equals DESIGN.md's value for its key, character for character. `app-shell.spec.ts` AC-1 keeps checking the primitives. |

**Why these first assertions.** Everything on the open box but the strip already ships (14.2 already hides the toggle there), so every leaf starts with the one new fact: the strip, in the scope's exact color. AC-2's Back to top already works on the scoped page (`back-to-top-automate.spec.ts:78`), so its leaf starts with its Given, the open box, as 14.2's AC-11 did.

**What the leaves pin (the contract for the build):**
- **The strip.** One element outside the app shell's `header`, painted with `background-color` (not a background image or a pseudo-element), 8px tall, `left: 0`, as wide as `document.documentElement.clientWidth`, its top at the header's bottom edge, with no border, no `box-shadow` and no text, inside an `aria-hidden="true"` subtree.
- **Where it sits.** The `h1` starts exactly `strip.top + 8 + 24` px down: the strip comes before the page's top padding, which stays `--space-page-top`.
- **Its color.** `scope.spineColor` from the `card-notes` view, exactly, in light and dark. Under `forced-colors: active` it is `CanvasText` with `forced-color-adjust: none`.
- **When it shows.** Only on the scoped page with the view `ready`, notes or no notes. It's absent while the view loads and under "Couldn't load". 14.2's unscoped Boxes and List views have no such element (the probe confirmed it today), and must keep it that way.
- **Painted elements.** Nothing else outside the header that is under 40px tall and at least half the window wide may paint a `background-color` before the strip in DOM order. Otherwise `openBoxStrip` finds that element first.

**Open for the build (not pinned):**
- Where the strip is rendered (in `CardNotesFrame` before `.page`, or in `CardNotesBody`), its class name, and whether it's a `div` or another element, within the bullets above.
- Whether `tokens.css` gains `--open-box-strip-height`. AC-3 checks it only if it's added.

**Wording for the review (not a test change).** AC-1 says the Book with no notes is "reached from Book detail", but Book detail links "See all card notes" only when the Book has notes (`CardNotesBlock.tsx:89`, `card-notes.spec.ts:571`). The leaf reaches that open box through the Main book card's bare "See card notes", which opens the same `/card-notes?book=<id>`. The review may want the AC's wording fixed, or to defer it to `deferred-work.md`.

## Existing leaves this story changes (for the build)

- **None.** `card-note-boxes.ts` only gained exports (`openBoxColor`, `isCardNotesView`, `openBoxStrip`, `StripLook`) and a `rgbOf` import. `card-note-boxes.spec.ts` still passes: 12 passed and 3 skipped together with `open-box.spec.ts`, run on 2026-11-24 before any app change.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-1 axe:** the open box passes axe (`AXE_TAGS`) in light and dark, with notes and without. The strip adds no node to the accessibility tree.
- [ ] **E2E, AC-1 read vs unread:** an unread Book's strip uses its `spineColor`, never a `spine-unread-*` color (AR63), like 14.2's box front for Dubliners and Emma.
- [ ] **E2E, AC-1 near-white color:** a white or near-white `spineColor` still paints the strip, with no edge line added.
- [ ] **E2E, AC-1 remove the chip:** "Remove In *X*" goes to `/card-notes` (in the remembered view) and the strip goes. Back returns to the open box and the strip comes back.
- [ ] **E2E, AC-1 window width:** at 1024px and 1440px the strip stays as wide as the window, and at the bottom of a long page it scrolls away with the page (it isn't fixed).
- [ ] **E2E, AC-1 update notice:** with the update notice showing (11.4's app-info fake), the strip starts under the notice, the header's new bottom.
- [ ] **E2E, AC-1 refetch:** a note added in another context, on an empty open box, shows after a focus refetch, and the strip stays the whole time.
- [ ] **E2E, AC-1 color change:** after the Book's spine color is changed on Book detail, its open box strip shows the new color.
- [ ] **E2E, AC-2 axe:** Back to top passes axe on the open box.
- [ ] **E2E, AC-3:** if `--open-box-strip-height` is added, `app-shell.spec.ts` still passes, and the strip's computed height comes from it.

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `bookId`, `designComponentValue` (library.ts); `cardNotesPage` (pile.ts, re-exported by card-note-boxes.ts); `box`, `boxLinks`, `boxName`, `cardNotesViewToggle`, `groupHeadings`, `searchField`, `PILE_SHELF` (card-note-boxes.ts); `seeCardNotes` (card-note-add-another.ts); `cardNotePanel`, `cardNotesBlock`, `editOf`, `editPanel`, `noteItem`, `SAVED` (card-note-keys.ts); `DUNE_WITH_NOTES`, `FEAR`, `pile`, `pileOpener`, `position` (pile.ts); `DUNE_ID`, `LEFT_HAND_ID`, `mainAt` (home.ts); `backToTop`, `LAST_NOTE`, `LONG_NOTES`, `scrollToY` (back-to-top.ts); `systemColor` (dev-mode.ts); `COULDNT_LOAD` (stats.ts).

Helpers added (all in card-note-boxes.ts):
- `openBoxColor`: reads the scoped view's `scope.spineColor`, which a Book with no notes has too. 14.2's spec-local `spineColors` reads only the unscoped view's groups.
- `isCardNotesView`: a URL predicate for `page.route` that also matches the scoped `?book=` request. 14.2's AC-8 uses the glob `**/api/views/card-notes`, which doesn't match a query string.
- `openBoxStrip` and `StripLook`: finds and measures the strip. No existing helper reads a full-width band under the header. `boxLook` reads inside a box link, and `elementsColored` (dev-mode.ts) lists elements by color but gives no rect, ARIA state or forced-color-adjust.

Shipped numbers:
- AC-1 quotes the page's top padding (`spacing.page-top`): measured `--space-page-top: 24px` (tokens.css:142), and the probe below measured the scoped `h1` at y = 84 under a header ending at y = 60 (light and dark, 1280×720, `deviceScaleFactor` 1). So 84 − 60 = 24. Asserted as quoted, as `PAGE_TOP`.
- AC-1's "directly under the app shell" depends on the header's bottom, `--space-topbar-height: 60px` (tokens.css:144), measured at 60 in the probe. The leaf reads the header's bottom at run time rather than asserting 60.
- The strip's 8px is new UI (`components.open-box-strip.height`), not shipped, so it wasn't measured. AC-3 reads it from DESIGN.md, and AC-1 asserts it as quoted.
- No border or outline width in this story is fractional.

Probes (Chromium, Desktop Chrome 1280×720, `deviceScaleFactor` 1; command `TZ=Europe/Madrid npx playwright test e2e/open-box.probe.spec.ts`, removed with `rm`):
- **`openBoxStrip`**, known good: a `setContent` shell (a `header` holding `nav[aria-label="Main"]` in a 60px box with a 1px bottom border, then `main` with an `aria-hidden` 8px `#6B4E71` div, then a padded `h1`).
  - It returned exactly `{top 60, left 0, width 1280, height 8, headerBottom 60, windowWidth 1280, background rgb(107, 78, 113), borders 0px 0px 0px 0px, boxShadow none, text '', hidden true, forcedColorAdjust auto}`.
  - It refused a 9px strip with a 1px bottom border, a shadow, the text "x", no `aria-hidden` and `#6B4E70`. It read `height 9`, `borders 0px 0px 1px 0px`, `boxShadow rgb(0, 0, 0) 0px 1px 2px 0px`, `text x`, `hidden false` and `rgb(107, 78, 112)`, so none of them passes as the strip.
  - It returned `null` for a 40%-wide band and for no band.
- **`openBoxStrip`**, forced colors: a strip with `forced-color-adjust: none` and `CanvasText` read `rgb(0, 0, 0)`, equal to `systemColor(page, 'CanvasText')`, and `forcedColorAdjust none`.
  - **The probe changed the helper.** The first version took a transparent background for painted under forced colors, because Chromium writes transparent there as `rgba(255, 255, 255, 0)`, not `rgba(0, 0, 0, 0)`. The probe found the `h1` and a chip span. The helper now treats any zero alpha as transparent, and every probe was re-run after that fix and passed.
- **`openBoxStrip` on the shipped app** (fixture off, `PILE_SHELF`): it returned `null` on Candide's scoped page (light, dark and forced colors), on the unscoped Boxes and List views, on Austerlitz's empty scoped page, and under a 500 for the scoped view. The 500 was routed by `isCardNotesView`, which confirms the predicate matches the scoped request.
- **The rest of AC-1 and AC-2 against the shipped app:** a throwaway copy with every strip line removed (`e2e/open-box-rest.probe.spec.ts`, removed with `rm`) passed both leaves. Everything except the strip is right today. Its first run found one test bug: after `release()` the held view could still be in flight when the route was removed (`Route is already handled`). The leaf now waits for the Beloved group to render before it reads the strip and removes the route.

Render-before-read: every leaf was checked. Each one-shot `openBoxStrip` read runs after a web-first poll of the strip, or, for absence, after a web-first wait on the rendered `h1` (while loading) or on "Couldn't load…". The `h1`'s `boundingBox` runs after the strip poll. One leaf was fixed: AC-1's held load now waits for the group heading after `release()` (above).

Storage keys: no new localStorage key.

## TDD Red Phase

- 3 e2e leaves, all `test.skip`, one per criterion. Each has a `// Red phase:` reason above it. There are no API or unit leaves.
- **Red run** (after the last probe and the last leaf change, 2026-11-24): a throwaway un-skipped copy, `e2e/open-box-red.probe.spec.ts`, removed with `rm`. **3 failed, each at its first assertion:** `:58`, `:187` and `:211`, the strip polls in the table above.
- `git status` lists no `*.probe.*` file and no throwaway copy.
- `npx prettier --check`, `tsc -b` and `oxlint` are clean on the changed e2e files. The skipped spec runs as 3 skipped.

## Next Steps (task-by-task activation)

1. `bmad-build-auto` builds the story. For each task, remove `test.skip` from its leaf and run `TZ=Europe/Madrid npx playwright test e2e/open-box.spec.ts` from `frontend/`.
2. Watch each leaf fail first, then pass. If a leaf fails for a reason outside the feature, fix the test and say so in the build's summary. Name any change to `openBoxStrip`, since a changed helper voids its probe.
3. Run the whole e2e suite. `card-notes.spec.ts`, `card-note-boxes*.spec.ts` and `back-to-top*.spec.ts` must pass unchanged.
4. Run `npm run check` before the story goes to review.

## Implementation Guidance

- **Server:** none. The `card-notes` view's scope already carries `spineColor` (14.1), even for a Book with no notes.
- **Changed:** `CardNotesPage.tsx` renders the strip (`aria-hidden`, `scope.spineColor` passed inline as a custom property such as `--strip-color`, so the forced-colors rule below can still override the background without `!important`) only when the view is `ready` and scoped. That's after `content()`'s loading and failed branches, and also when the Book has no notes. It sits above `.page`'s padding, so the strip runs the full width with no `page-x` inset. The CSS Module gives it `height` from DESIGN.md's `components.open-box-strip.height` (through `--open-box-strip-height` if tokens.css gains it, copied character for character and never formatted), and a `@media (forced-colors: active)` rule with `forced-color-adjust: none; background: CanvasText`.
- **Unchanged:** the chip, search, Add card note, notes, pile, Edit, focus return and Back to top on the scoped page, and the unscoped Boxes and List views.
