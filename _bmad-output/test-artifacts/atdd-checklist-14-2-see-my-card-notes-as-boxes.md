---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-24'
storyId: '14.2'
storyKey: '14-2-see-my-card-notes-as-boxes'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-142-see-my-card-notes-as-boxes'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-14-2-see-my-card-notes-as-boxes.md'
generatedTestFiles:
  - 'frontend/e2e/card-note-boxes.spec.ts'
  - 'frontend/e2e/card-note-boxes.ts'
  - 'frontend/e2e/fixtures.ts (the cardNotesView option fixture)'
  - 'frontend/e2e/library.ts (designComponentValue)'
  - 'frontend/e2e/card-note-add-another.ts (storedChoice takes an optional key)'
  - 'frontend/e2e/catalog-filter.spec.ts (bookvie.cardNotesView joins APP_STORAGE_KEYS)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 14.2; UX-DR92)'
  - '_bmad-output/implementation-artifacts/epic-14-context.md'
  - '_bmad-output/planning-artifacts/card-note-boxes-plan-2026-11-23.md (D3–D9, D11, §4, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.card-notes-view-toggle, card-notes-count-line, card-note-box; Layout → Card notes; Card note box; Elevation → box front; Forced colors)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card notes shelf, incl. Temporary → Staging)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (14-1 done, 14-2 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-4-tell-me-when-a-tab-is-older-than-the-app.md and atdd-checklist-14-1-… (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CardNotesPage.tsx + .module.css, pages/SearchTitles.tsx + .module.css, lib/cardNotes.ts, lib/catalogView.ts, components/ViewToggle.tsx + .module.css, styles/tokens.css, components/AppShell.module.css, tsconfig.node.json, package.json (check:api)'
  - 'frontend/e2e/fixtures.ts, library.ts, pile.ts, bookcase.ts, back-to-top.ts, card-note-add-another.ts, dev-mode.ts, restore.ts, stats.ts, tiles.ts; card-notes.spec.ts, back-to-top*.spec.ts, catalog-filter.spec.ts (APP_STORAGE_KEYS), catalog-tiles-automate.spec.ts (throwing storage), restore.spec.ts, app-shell.spec.ts'
  - 'backend/tests/builder.py (spineColorUser, readings), backend/bookvie/views/card_notes.py (title_key order)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the e2e suite after this story, when the existing Card notes specs run, then one fixture in frontend/e2e/fixtures.ts stores bookvie.cardNotesView = "list" before each test (an option fixture a spec can turn off), and those specs pass with no edit to their files; and the specs this story adds turn it off, so they open with nothing stored.' }
  - { id: AC-2, idSource: generated, text: 'Given nothing stored, an empty or junk bookvie.cardNotesView, or storage whose read throws, when the unscoped Card notes page opens with at least one card note, then it opens in Boxes view and the Boxes button is pressed (AR64); and a stored "list" opens List view.' }
  - { id: AC-3, idSource: generated, text: 'Given at least one card note, when the unscoped page renders, then the toolbar holds Search card notes, then the Card notes view toggle and the count line, spacing.4 apart: a role="group" named "Card notes view" with two buttons, Boxes then List, with aria-pressed, in the Catalog view toggle''s visual (components.card-notes-view-toggle, text only); and pressing List (click, Enter or Space) shows the List view in place, keeps focus on the pressed button, keeps the search text, leaves status silent, and stores "list" at once; a reload opens List; and a write that throws still switches for this visit, with no message; and bookvie.cardNotesView never appears in an export, and a restore neither brings nor replaces it.' }
  - { id: AC-4, idSource: generated, text: 'Given List view, when I use it, then it is the unscoped page exactly as before this story: the groups, the search with its highlights and "N notes match.", Edit, "Go through as a pile" and Back to top.' }
  - { id: AC-5, idSource: generated, text: 'Given a seeded library whose Books have 1, 2, 5, 6, 20 and 21 card notes, and Books without notes, when Boxes view renders, then there is one Card note box per Book with notes, in the groups'' order (title key, then Book id), and none for a Book without notes; and each box shows 1, 3, 3, 5, 5 and 7 cards respectively (the pile step, computed in lib/cardNotes.ts, AR63); and each box''s label shows the full title up to 2 lines, then an ellipsis, and "N card notes" ("1 card note"); and each box is a link to /card-notes?book=<id> (click or Enter opens the scoped page as it is before this story), one Tab stop per box in grid order, whose accessible name is "Title, N card notes" ("Title, 1 card note") with the full title even when the label cuts it.' }
  - { id: AC-6, idSource: generated, text: 'Given Boxes view at 1024px, 1280px and 1440px wide, when it renders, then the boxes form a left-aligned grid on the page background, repeat(auto-fill, 216px) with spacing.6 column and spacing.8 row gaps, giving 4, 5 and 5 columns, every box 216 × 196; and a box''s front is the lower 116px with 6px 6px 12px 12px corners and the box-front shadow, filled with the group''s spineColor exactly whether the Book is read or unread (never a spine-unread-* color), with no edge line; and the label is a spine-label-strip plate with the title in book-title-sm/spine-label and the count in meta #5F635C, and the cards are 176 × 96 paper cards behind the front, card i of k topped at 70px − (k − 1 − i) × 8px and turned by the first k of −1.6°, 1.2°, −0.6°, 1.8°, −1.2°, 0.8°, −1.8°; and the label, cards and count look the same in dark theme, where only the page and the shadow''s strength change (DESIGN.md → Card note box).' }
  - { id: AC-7, idSource: generated, text: 'Given a box, when it has keyboard focus, in light or dark theme, then it shows a 2px solid accent ring at 4px offset around the whole box with rounded.lg corners, and there is no hover change apart from the pointer cursor; and under forced-colors: active the front is CanvasText (forced-color-adjust: none), the label Canvas with CanvasText text, each card Canvas with a 1px CanvasText border, and the focus ring takes the system color.' }
  - { id: AC-8, idSource: generated, text: 'Given Boxes view with an empty search field and the view loaded, when it renders, then the toolbar ends with the count line "139 card notes in 9 Books" ("1 card note in 1 Book", "12 card notes in 1 Book"), the totals summed over the loaded groups in lib/cardNotes.ts, in meta/ink-tertiary, plain text and not a live region; and the toggle and the count line don''t show while the view loads or under "Couldn''t load", and the count line doesn''t show in List view.' }
  - { id: AC-9, idSource: generated, text: 'Given no card notes at all, when the unscoped page opens, then it shows "No card notes yet." as before, with no view toggle, no count line and no boxes.' }
  - { id: AC-10, idSource: generated, text: 'Given Boxes view and text in Search card notes (UX-DR92''s staging, until Story 14.4), when the field holds non-blank text, then the page shows exactly the List view''s results and announcements ("N notes match."), and the count line is hidden; and once the field is blank the boxes show again; and EXPERIENCE.md → Card notes shelf → Temporary keeps its staging note.' }
  - { id: AC-11, idSource: generated, text: 'Given the page in Boxes view and in List view, when it is scrolled more than one window height, then Back to top shows and works as before this story, moving focus to Search card notes.' }
  - { id: AC-12, idSource: generated, text: 'Given the new component tokens in DESIGN.md (card-note-box, card-notes-view-toggle, card-notes-count-line), when the box, the toggle and the count line are styled, then every value comes from DESIGN.md''s components block, and any literal added to frontend/src/styles/tokens.css''s components block matches DESIGN.md character for character, so e2e/app-shell.spec.ts still passes.' }
---

# ATDD Checklist: Story 14.2 See my card notes as boxes

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are both in place. This story is frontend only: 14.1 already put `spineColor` on every group and the scope, and nothing on the server changes. So every leaf is e2e.
- **Story:** Story 14.2 in `epics.md` has 12 Given/When/Then criteria, none with ids. They're numbered AC-1 to AC-12 in source order (registry above), and each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for `14-2-…`, and 14.1 is `done`. There's no spec file yet, so the story file is the `epics.md` section, as for 14.1.
- **Epic gate:** 14.2 isn't Epic 14's first story, so the spine gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotesPage.tsx` renders the `h1`, the chip (scoped), then `SearchTitles` (a flex row: visible label, then a 280px input) and the groups. There's no toolbar wrapper yet. `.page` is a flex column with `align-items: flex-start`, `gap: spacing.5`, and `spacing.page-top`/`spacing.page-x` padding. `CardNotesBody` is keyed by `bookId`.
  - `lib/catalogView.ts` and `components/ViewToggle.tsx` hold the Catalog's remembered view and its segmented `aria-pressed` group named "Catalog view". The new toggle mirrors both (the leaf compares the two toggles' computed styles directly).
  - `lib/cardNotes.ts` holds `noteMatches`, `notesMatchCopy`, `noNotesMatchCopy`, `cardNotesPath` and friends. It has no pile step, count line or box name yet.
  - `useCardNotesView` returns `loading | failed | missing | ready`. On failure, `main` shows "Couldn't load. Is bookvie still running?" with Try again.
  - No `localStorage` key exists for the Card notes view (`grep -rn localStorage frontend/src`).

## Generation Mode

**AI generation**, run sequentially in this session. Recording isn't needed: the page, its search and its roles already ship, and DESIGN.md and EXPERIENCE.md pin the new toggle's, box's and count line's names, text and geometry. No API worker ran, because the server doesn't change.

## Test Strategy

Every leaf is in `frontend/e2e/card-note-boxes.spec.ts`. The specs about Boxes turn the fixture off with `test.use({ cardNotesView: null })`. AC-1 and AC-4 keep the default `"list"`, because they are about the List view the old specs rely on. Seed `PILE_SHELF` (in `card-note-boxes.ts`) holds Anathem 21, Beloved 1, Candide 5, Dubliners 2, Emma 6 and *Flights of Memory…* 20 notes, seeded out of order, plus Austerlitz and Middlemarch with no notes. Anathem (user color, read) and Dubliners (user color, unread) have set colors, Emma is unread with its curated color, and the Flights title is far too long for two lines.

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E, default fixture | P0 | `:78` | List pressed (`:85`). Then Boxes unpressed, the six group headings, no box links, and the stored value `"list"`. |
| AC-2 | E2E, fixture off | P0 | `:125` | Boxes pressed with nothing stored (`:132`). Then the six boxes and `null` stored; `""`, `"grid"`, `"LIST"` and `" list"` each open Boxes after a reload; `"list"` opens List; a second page whose `getItem` throws for the key opens Boxes with no page error. |
| AC-3 | E2E, fixture off | P0 | `:170` | The toggle's buttons read exactly `Boxes`, `List` (`:177`). Then: input → toggle → count line, 16px apart on one row; the toggle's computed look (group, pressed and unpressed options) equals the Catalog view toggle's, with no glyph; type "Candide note", wait for "5 notes match.", and record `status`; click List: pressed, focused, same URL, text kept, List results, `"list"` stored, and no `status` text after the announce delay; reload opens List; Enter presses Boxes (stored `"boxes"`), Tab then Space presses List; a page whose `setItem` throws still switches with an empty `alert` and no page error; no export entry mentions `cardNotesView`. |
| AC-4 | E2E, default fixture | P0 | `:94` | List pressed (`:101`). Then the six groups, six "Go through as a pile" and six `Edit p.1`, no count line; "beloved NOTE" keeps Beloved with `<mark>Beloved note</mark>` and "1 note matches."; cleared, the first pile opens at "1 of 21". |
| AC-5 | E2E, fixture off | P1 | `:274` | Six box links (`:281`). Then each `nth(i)` has the name "*Title*, N card notes" and its `href`; no Austerlitz or Middlemarch; `boxLook` finds 7, 1, 3, 3, 5 and 5 cards and a title and count in every box; the Flights title is clamped to 2 lines and cut, Emma's is 1 line; Tab walks the six boxes in order; click opens Candide's scoped page (chip, 5 notes, no toggle); Back, then Enter on Beloved opens its scoped page. |
| AC-6 | E2E, fixture off, light then dark | P1 | `:327` | 4 columns at 1024px (`:337`, `expect.poll(columnsOf)`). Then at 1280, 1440 and 1024: 5, 5 and 4 columns, every box 216 × 196, a 240px column pitch, a 36px row gap, and the first box's left equal to the `h1`'s. In light and dark, for each box: the body is `page`; the front is at (0, 80), 216 × 116, in the view's `spineColor`, with radii `6px 6px 12px 12px`, the box-front shadow (light or dark) and a 0px border; the label is `spine-label-strip`, `4px` radius, `10px 12px` padding, 14px in from each side and vertically centered; the title uses the `book-title-sm` family at 15.5px in `spine-label`; the count is 13px `#5F635C`; and the cards are 176 × 96 at left 20, top `70 − (k − 1 − i) × 8`, at the listed angles, `#FFFFFF` with a `1px solid #E4DFD5` border and a `4px` radius. |
| AC-7 | E2E, fixture off | P1 | `:419` | After Tab ×3 from the search field, the first box's `outline` is `rgb(85, 112, 89) solid 2px` (`:432`). Then it's focused, with a 4px offset, `border-radius: 12px` and a 216 × 196 rect; in dark the ring is `accent-dark`; hovering Beloved changes nothing in the link's subtree (transform, rotate, translate, opacity, background, shadow, color) and the cursor is `pointer`; under forced colors Candide's front is `CanvasText`, the label `Canvas`, the title and count `CanvasText`, each card `Canvas` with a `1px solid CanvasText` border, and the focused ring is solid and not `accent`. |
| AC-8 | E2E, fixture off | P1 | `:475` | "55 card notes in 6 Books" is visible (`:484`). Then it's 13px, `ink-tertiary` and outside any live region; it's gone in List and back in Boxes; with the view request held, the `h1` shows but no toggle and no count line, until it's released; with a 500, "Couldn't load…" shows with no toggle and no count line. |
| AC-9 | E2E, fixture off | P1 | `:521` | **Witness:** with one note, the toggle is visible (`:538`). Then "1 card note in 1 Book" shows. With PILE_SHELF's Books and no notes: "No card notes yet.", no toggle, no count line, no box links, no search field. |
| AC-10 | E2E, fixture off | P1 | `:552` | After "candide NOTE 0" is typed, Boxes is still pressed (`:560`). Then the Candide group with 5 `<mark>`s and "5 notes match.", no box links and no count line; spaces only brings back the boxes and the line; a query with no match shows "No card notes contain “…”." and no boxes; Esc brings back the boxes and the line with no groups; EXPERIENCE.md's Card notes shelf still has **Temporary.** and the Staging sentence. |
| AC-11 | E2E, fixture off, `MANY_BOXES` (40 Books × 1 note) | P1 | `:594` | The box "Book 40, 1 card note" is attached (`:602`). Then in Boxes, and again after pressing List (40 groups): shown at 1.5 window heights, gone just under one, a press from the bottom scrolls to 0 and focuses Search card notes. |
| AC-12 | E2E, fixture off, plus a file read | P2 | `:622` | Anathem's link `width` equals DESIGN.md's `components.card-note-box.width`, read from the file (`:630`). Then `height`, `front-height`, `front-radius`, `card-width`, `card-height`, `card-inset`, `card-top`, `card-border` and `focus-offset` all match DESIGN.md as read; every `--card-note-box-*`, `--card-notes-view-toggle-*` or `--card-notes-count-line-*` custom property in `tokens.css` equals DESIGN.md's value for its key, character for character. `app-shell.spec.ts` AC-1 keeps checking the primitives. |

**Why these first assertions.** AC-1 and AC-4 describe today's List, which passes red, so each starts with the one new fact the List view has: its pressed List button. AC-9's absences pass red, so a witness that the toggle can show comes first, as in 11.4's AC-2. In AC-10 the List-shaped results already show red, so the first assertion is that the toggle still says Boxes while they show. AC-11 starts with its Given: the page in Boxes view.

**What the leaves pin (the contract for the build):**
- The toggle: a `group` inside `main` named exactly "Card notes view", holding exactly two `button`s, "Boxes" then "List", with `aria-pressed`. It isn't on the open box, or while loading or failed.
- The boxes: `a` elements in `main` whose `href` starts with `/card-notes?book=`, one per Book with notes. Each accessible name is exactly "*Title*, N card notes" ("1 card note"). Nothing else in `main` links to `?book=` in Boxes view. In List view there's no such link.
- Inside a box: one element whose whole text is the full title (truncation by CSS, not by cutting the string), one whose whole text is "N card notes", and a label element holding both. The front is the label's nearest ancestor with a background. The cards are every other element with a background that is neither inside the front nor holds it, so the build mustn't add other painted elements inside the link (a painted wrapper around front and cards would count as a card). Rotations may use `rotate` or `transform: rotate()`.
- The count line: one element in `main` whose whole text is "55 card notes in 6 Books".
- Storage: `bookvie.cardNotesView`, values `"boxes"` and `"list"`, exactly as written (case-sensitive, no trimming).

**Open for the build (not pinned):**
- The class names, the toolbar wrapper, and how `CardNoteBox` is split into elements, within the bullets above.
- Whether the toggle reuses `ViewToggle` (made generic) or a copy. The leaf only compares computed styles.
- Where the pile step, the count totals and the box name live inside `lib/cardNotes.ts` (AR63 says they're there; no leaf imports them).
- Whether tokens.css gains `--card-note-box-*` properties at all. AC-12 checks only those it adds.

## Existing leaves this story changes (for the build)

- **None of the existing Card notes spec files changes** (AC-1). They run with the default fixture, which stores `"list"`. Every spec that opens `/card-notes` unscoped does so through the fixture's `page`. `card-notes.spec.ts`'s second context only posts an intent and never opens a page, so the fixture isn't needed there.
- **`fixtures.ts`** gained the `cardNotesView` option fixture (default `'list'`, `null` turns it off) and a `page` override that adds an init script. The script stores the value only when the key is absent, so a test that switches the view and reloads keeps its own choice. It's wrapped in try/catch, because specs that make storage throw add their own init scripts after it.
- **`catalog-filter.spec.ts`'s `APP_STORAGE_KEYS`** gained `bookvie.cardNotesView`, because the fixture now stores it in every test.
- With the fixture in place, `card-notes.spec.ts`, `restore.spec.ts`, `catalog-filter.spec.ts`, `back-to-top.spec.ts`, `card-note-add-another.spec.ts` and `card-note-add-another-automate.spec.ts` pass unchanged (run on 2026-11-24, before any app change).

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-3 restore:** a restore of another library's export leaves `bookvie.cardNotesView` as it was (`"boxes"` and `"list"`), like `restore.spec.ts` does for `bookvie.catalogView`.
- [ ] **E2E, AC-3 dark and forced colors:** the toggle matches the Catalog toggle in dark. Under forced colors the pressed option keeps its `Highlight` indicator.
- [ ] **E2E, AC-5 twins:** two Books with the same title get two boxes in Book-id order, and their names are the same (no disambiguation is promised).
- [ ] **E2E, AC-6 near-white front:** a white or near-white spine color still shows its front, outlined by its shadow, with no edge line.
- [ ] **E2E, AC-7 axe:** Boxes view passes axe (`AXE_TAGS`) in light and dark, with a focused box.
- [ ] **E2E, AC-8 count line copy:** "1 card note in 1 Book" (covered by AC-9's witness) and "12 card notes in 1 Book". The line in dark is `ink-tertiary` dark `#9A9E94`.
- [ ] **E2E, AC-8 refetch:** a note added in another context updates the count line and adds a box after a focus refetch, as `card-notes.spec.ts` XUI-E2E-002 does for the groups.
- [ ] **Unit (`node --test`, `src/lib/cardNotes.test.ts`), AC-5/AC-8:** the pile step at 0, 1, 2, 5, 6, 20, 21 and 100; the count line copy; the box name ("1 card note"); `lib/cardNotesView.ts` read and write with junk, empty, throwing, `"boxes"` and `"list"`, mirroring `catalogView.test.ts`.
- [ ] **E2E, AC-10 typing back to blank:** the boxes return when the text is deleted character by character, not only with Esc.
- [ ] **E2E, AC-11 automate:** Back to top passes axe in Boxes view (`back-to-top-automate.spec.ts` covers List).

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `bookId`, `rgbOf`, `designComponentColor`, `designTokens`, `DESIGN_MD`, `ACCENT`, `ACCENT_DARK`, `INK_TERTIARY`, `PAGE`, `SPINE_LABEL_STRIP` (library.ts); `finished`, `SPINE_LABEL` (bookcase.ts); `cardNotesPage` (pile.ts, re-exported by card-note-boxes.ts); `boxOf`, `inLiveRegion`, `recordStatus`, `statusTexts`, `zipEntries` (card-note-add-another.ts); `storedChoice` (card-note-add-another.ts, extended with an optional `key` that defaults to Add another's, probed); `systemColor` (dev-mode.ts); `exportOf` (restore.ts); `afterAnnounceDelay`, `COULDNT_LOAD` (stats.ts); `backToTop`, `scrollToY` (back-to-top.ts).

Helpers added:
- `designComponentValue` (library.ts): returns any `components.<c>.<key>` value as written, including token references and multi-part values. `designComponentColor` only accepts a `#rrggbb` literal.
- `cardNotesView` option fixture and `page` override (fixtures.ts): no fixture seeded a `localStorage` key before.
- In `card-note-boxes.ts`:
  - The seeds `PILE_SHELF`, `PILE_BOXES`, `PILE_COUNT_LINE`, `MANY_BOXES`, `FLIGHTS`, `ANATHEM_COLOR`, `DUBLINERS_COLOR`, and `notesOf`. `back-to-top.ts`'s `LONG_NOTES` has three Books of 50 notes, with no pile-step edges and too few Books for the grid.
  - `VIEW_KEY`, `noteCount`, `boxName`.
  - The locators `cardNotesViewToggle`, `viewButton`, `boxLinks`, `box`, `searchField` and `groupHeadings`. `card-notes.spec.ts` has spec-local `searchField(scope)` and `groupHeadings`, which aren't exported. Catalog's `viewToggle` (bookcase.ts) names "Catalog view".
  - The measuring helpers `columnsOf` and `boxLook`. No existing helper reads a grid's column count or a box's parts (`tiles.ts`'s `coverBox` reads a tile cover).
- In card-note-boxes.spec.ts: `spineColors` reads the `card-notes` view's colors (only `catalogTitles` reads a view, and that's the catalog's). `BOX_FRONT_SHADOW`, `BOX_FRONT_SHADOW_DARK`, `CARD_ANGLES` and `PAGE_DARK` are DESIGN.md literals with no reader: the shadows are in a Markdown table, and the angles are in prose. `PAGE_DARK` is the dark `page` primitive that library.ts lacks.

Shipped numbers:
- AC-3 quotes `spacing.4` (16px): measured 16px (`--space-4`, tokens.css:136). Asserted as quoted.
- AC-6 quotes `spacing.6` (24px) and `spacing.8` (36px): measured `--space-6: 24px` (tokens.css:138) and `--space-8: 36px` (tokens.css:140). Asserted as quoted.
- AC-6 quotes 4, 5 and 5 columns at 1024, 1280 and 1440. These follow from the shipped content width: a probe on the shipped List page (`MANY_BOXES`, light, `deviceScaleFactor` 1, heights 900) measured `clientWidth` equal to the viewport (no classic scrollbar), the `.page` content box at 952, 1208 and 1368px, and the `h1` at x = 36. ⌊(w + 24) / 240⌋ gives 4, 5 and 5. Asserted as quoted, with the box's left asserted equal to the `h1`'s.
- AC-7 quotes `rounded.lg` (12px): measured `--radius-lg: 12px` (tokens.css:128). Asserted as quoted.
- AC-6 quotes the label's `rounded.cover` (4px) and card corners: measured `--radius-cover: 4px` (tokens.css:125).
- AC-6 and AC-8 quote `meta` (13px) and `book-title-sm` (15.5px): measured `--font-meta-size: 13px` (tokens.css:109) and `--font-book-title-sm-size: 15.5px` (tokens.css:81). The family is read through `designTokens()`.
- AC-8 quotes `ink-tertiary`: `INK_TERTIARY` (library.ts) = `#666961` = `--color-ink-tertiary` light (tokens.css:21).
- AC-7 quotes `accent`: `ACCENT`/`ACCENT_DARK` (library.ts) = `#557059` and `#93B597` (tokens.css:22, :208).
- The `page` dark value `#191B18` is tokens.css:200 (`PAGE_DARK`).
- No border or outline width in this story is fractional. The card border is 1px, the ring 2px, and `--hairline` 1px.
- The box's own sizes (216 × 196, 116, 176 × 96, 20, 70, 8, 14, 10px 12px) and the card and count colors are new UI from DESIGN.md's `components.card-note-box`. They aren't shipped, so they weren't measured. AC-12 reads them from DESIGN.md.

Probes (Chromium, Desktop Chrome default 1280×720 unless set, `deviceScaleFactor` 1, light, no forced colors; command `TZ=Europe/Madrid npx playwright test e2e/card-note-boxes.probe.spec.ts` and then `e2e/card-note-boxes-fixture.probe.spec.ts`, both removed with `rm`):
- **`boxLook`** (card-note-boxes.ts):
  - Input: a `setContent` box 216 × 196 with three 176 × 96 cards at top 54, 62 and 70, rotated by `rotate: -1.6deg`, `transform: rotate(1.2deg)` and `rotate(-0.6deg)`. The front is at top 80, 216 × 116, `#6B4E71`, with radii `6px 6px 12px 12px` and the light box-front shadow. The label is `#FBF8F1` with `10px 12px` padding, 14px in. The title is 15.5px `#2B2E2A` and the count 13px `#5F635C`.
  - Returned exactly that: cards `left 20`, tops `[54, 62, 70]`, angles `[-1.6, 1.2, -0.6]`, `1px solid rgb(228, 223, 213)`, radius `4px`; front `{0, 80, 216, 116}`, `rgb(107, 78, 113)`, `6px 6px 12px 12px`; label `{14, 109, 188, 58}` (29px above and below); count `{13px, rgb(95, 99, 92)}`. The shadow read as `rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(43, 46, 42, 0.12) 0px 1px 2px 0px`, which is the format `BOX_FRONT_SHADOW` uses.
  - Refused: a box with its cards one pixel higher and the back card 177px wide returned tops `[53, 61, 69]` and width 177.
  - A 2-line-clamped long title returned `lines 2, truncated true`; the short one `lines 1, truncated false`.
- **`toHaveCSS('outline' …)`**, a built-in read that a leaf compares with a composed string: a focused link with `outline: 2px solid rgb(85, 112, 89)` passed `toHaveCSS('outline', 'rgb(85, 112, 89) solid 2px')`, plus `outline-offset: 4px` and `border-radius: 12px`.
- **`columnsOf`** (card-note-boxes.ts): six `a[href^="/card-notes?book="]` in a grid of `repeat(4, 216px)` returned 4, and in `repeat(5, 216px)` returned 5 (refusing 4).
- **`designComponentValue`** (library.ts):
  - Returned `216px`, `196px`, `{rounded.lg}`, `116px`, `6px 6px 12px 12px`, `1px solid #E4DFD5`, `176px`, `96px`, `20px`, `70px`, `4px`, `0.38` (unquoted), `{colors.ink-tertiary}` and `8px` (`open-box-strip.height`).
  - Threw for a missing key and for a missing component.
- **`cardNotesView` fixture and `storedChoice(page, key)`:**
  - With the fixture on, `/card-notes` read `"list"` for `bookvie.cardNotesView` and `null` for Add another's key, the default.
  - After writing `"boxes"` and `"on"` and reloading, it read `"boxes"` and `"on"`: the fixture never overwrites an existing value.
  - With the fixture off, it read `null`.
  - The existing `storedChoice` callers (`card-note-add-another*.spec.ts`, 22 tests) still pass.

Render-before-read: every leaf was checked. Each one-shot read (`boxOf`, `boxLook`, `columnsOf`, `inLiveRegion`, `storedChoice`, `evaluate`) runs after a web-first wait on what it reads, or inside `expect.poll`. One leaf was fixed: AC-3 now waits for the count line to be visible before measuring it with `boxOf`. Absence reads wait first on the rendered `h1`, group headings or the no-notes line.

Storage keys: added `bookvie.cardNotesView` to `APP_STORAGE_KEYS` (catalog-filter.spec.ts), with its owner named in the comment above the list.

## TDD Red Phase

- 12 e2e leaves, all `test.skip`, one per criterion. Each has a `// Red phase:` reason above it. No API or unit leaves.
- **Red run** (after the last probe and the last helper change, 2026-11-24): a throwaway un-skipped copy, `e2e/card-note-boxes-red.probe.spec.ts`, removed with `rm`. **12 failed, each at its first assertion:** `:85`, `:101`, `:132`, `:177`, `:281`, `:337`, `:432`, `:484`, `:538`, `:560`, `:602` and `:630` (the lines in the table above).
- `git status` lists no `*.probe.*` file and no throwaway copy.
- `npx prettier --check`, `tsc -b` and `oxlint` are clean on the changed e2e files. The skipped spec runs as 12 skipped.

## Next Steps (task-by-task activation)

1. `bmad-build-auto` builds the story. For each task, remove `test.skip` from its leaf and run `TZ=Europe/Madrid npx playwright test e2e/card-note-boxes.spec.ts` from `frontend/`.
2. See each leaf fail first, then pass. If a leaf fails for a reason outside the feature, fix the test and say so in the build's summary. Name any helper change, since a changed helper voids its probe.
3. Run the whole e2e suite: the old Card notes specs must pass with no edit to their files (AC-1).
4. `npm run check` before the story goes to review.

## Implementation Guidance

- **Server:** none. The `card-notes` view already carries `spineColor` (14.1).
- **New:** `lib/cardNotesView.ts` (read and write `bookvie.cardNotesView` inside try/catch, `"boxes"` default), `components/CardNoteBox` (+ CSS Module), and in `lib/cardNotes.ts` the pile step, count line copy and box name.
- **Changed:** `CardNotesPage.tsx` gets the toolbar (search, toggle, count line), the Boxes grid, the staging rule (non-blank text shows the List results in Boxes view, with no count line), and the toggle and count line only once the view is ready with at least one note, unscoped. `tokens.css` changes only if it gains component literals, copied from DESIGN.md character for character and never formatted.
