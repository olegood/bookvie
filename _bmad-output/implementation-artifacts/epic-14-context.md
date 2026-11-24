# Epic 14 Context: See card notes as boxes

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The unscoped Card notes page gains a Boxes view: one box per Book that has notes, drawn in the Book's spine color with a pile of cards that grows with its note count. A remembered Boxes · List toggle keeps today's page as List. Opening a box opens that Book's scoped page under a strip in its spine color. A search on the shelf fades the boxes without a match and shows "3 of 12" on those with matches, and the search text goes into the box and comes back out with the user. Oleg can then sit with one Book's ideas or hunt across all his cards without retyping. The page keeps its name "Card notes", its `h1` and its `/card-notes` route. "Card note" stays the domain and agent-tool term.

## Stories

- Story 14.1: Carry each Book's spine color in the card-notes view
- Story 14.2: See my card notes as boxes
- Story 14.3: See the open box in its Book's color
- Story 14.4: Search the boxes
- Story 14.5: Keep the search when I open a box and come back

## Requirements & Constraints

- **List is unchanged.** List view is today's unscoped page exactly: groups, search with highlights and "N notes match.", Edit, "Go through as a pile", Back to top. The existing Card notes e2e specs must pass with no edit to their files. One option fixture in `frontend/e2e/fixtures.ts` stores `bookvie.cardNotesView = "list"` before each test, and new specs turn it off.
- **Boxes is the default.** It shows when nothing is stored, when the value is junk or empty, or when the storage read throws. The toggle shows only on the unscoped page, only when at least one card note exists, never on the open box, and never while loading or under "Couldn't load". With no notes at all the page keeps "No card notes yet."
- **Only Books with notes get a box,** in the groups' order. Boxes view never sorts.
- **The fade is never the only signal.** A faded box stays a link and a Tab stop, keeps a full-strength focus ring, and carries its match in its accessible name ("*Refactoring*, no match"). The 0.38 fade is an accepted, documented deviation from SC 1.4.3. Accessibility otherwise follows WCAG 2.2 AA in both themes and under `forced-colors: active`.
- **Motion.** Lift and fade animate (150ms ease-out) only while the field's text changes. A carried search, or a List → Boxes switch with text in the field, renders the search state at once. Under `prefers-reduced-motion: reduce`, changes are instant.
- **Staging (UX-DR92).** From 14.2 until 14.4, Boxes view with non-blank text shows exactly the List's results and announcements and hides the count line. Story 14.4 removes this from both the code and EXPERIENCE.md → Card notes shelf → Temporary.
- **Gate:** the per-epic quality gates (P0 = 100%, P1 ≥ 95%, `check:api` clean, plus the coverage floors). The P0 risks also have to be green: List unchanged; default and storage; `spineColor` on every group and on the scope; the shelf search; the carried search in both directions, with every other way in starting empty.
- **Out of scope:** boxes the user packs across Books, renaming the page, a pile button on the box, and anything that only Safari or Firefox shows. Nothing needs the Mac itself, so no story has a Mac check.

## Technical Decisions

- **Server (14.1 only):** `spineColor` is added to `CardNotesGroup` and `CardNotesScope`. It is the Book's stored, resolved `spine_color` exactly as stored, the same value the `book` and `catalog` views give. The scope carries it even for a Book with no notes. There is no other server change, no data change and no backup format change. Regenerate `frontend/src/api/generated/schema.d.ts` with `npm --prefix frontend run api:gen` and never hand-format it, because `check:api` compares it byte for byte. `get_card_notes` returns the view as is, and its registered description stays unchanged.
- **Client owns presentation, server owns order.** One matcher in `lib/cardNotes.ts` (contains, case-insensitive; spaces-only counts as empty) serves the List filter, the open box, each box's "M of N" and the shelf sentence's totals. `lib/cardNotes.ts` also computes the pile step (1 → 1 card, 2–5 → 3, 6–20 → 5, 21+ → 7), the count line's totals (a sum over the loaded groups), each box's accessible name and the match counts. The page computes none of these. One Book's box is `components/CardNoteBox`.
- **Color:** a box front and the open box strip use `spineColor` exactly, read or unread, never the `spine-unread-*` colors.
- **Remembered view:** `bookvie.cardNotesView` (`"boxes"` / `"list"`) is read and written by `lib/cardNotesView.ts` inside try/catch, mirroring `lib/catalogView.ts` and `components/ViewToggle.tsx`. The value is stored as soon as the view changes, and a failed write keeps the choice for this visit. It is never exported, and a restore neither brings nor replaces it.
- **Carried search (14.5):** the text lives only in React state of the route component `CardNotesPage`, never in the URL, in storage or in `history.state`. Router state, built by the page, carries only a carry marker and, on a box link's push, `openedFrom` (the shelf entry's `location.key`, `"default"` included). The marker is ignored on mount.
  - **When the text is kept:** only on a PUSH carrying the marker, or on a POP that lands on the `openedFrom` of the entry just left. Every other `location.key` change starts empty, and while the view has no groups the text is dropped.
  - **How the page decides:** during render, never in an effect and never by writing a ref in render. It keeps the last handled `{ key, state }` in state (`HomePage`'s hand-off pattern), and a unit test runs the decision under `<StrictMode>`.
  - **Fresh body per entry:** the body is keyed by `location.key`, giving a fresh view query with no placeholder data and fresh pile, panels, pending count and focus maps. Each key change scrolls to the top (`behavior: 'auto'`), then focuses the `h1`. A carried search is announced once, from the new entry's view once it is `ready` and the `h1` has focus, by an effect that cancels on cleanup.
- **Styling:** every value comes from DESIGN.md's components block (`card-note-box`, `card-notes-view-toggle`, `card-notes-count-line`, `open-box-strip`). Any literal added to `frontend/src/styles/tokens.css` must match DESIGN.md character for character, because `e2e/app-shell.spec.ts` compares them. Never run a formatter on `tokens.css`. The box's label, cards, count and pill are fixed literals that look the same in both themes. Only the page background and the shadow's strength change in dark theme.

## UX & Interaction Patterns

- **Toolbar:** Search card notes, then the view toggle (`role="group"` "Card notes view", Boxes then List, `aria-pressed`, the Catalog toggle's visual, text only) and the count line, `spacing.4` apart. A press switches in place, keeps focus on the pressed button, keeps the search text, and leaves `status` silent.
- **Shelf grid:** a left-aligned `repeat(auto-fill, 216px)` grid on `page`, `spacing.6` column gap and `spacing.8` row gap, every box 216 × 196 (4 columns at 1024px, 5 at 1280px and 1440px). A search never reflows it.
- **Box:** a link to `/card-notes?book=<id>`, one Tab stop. Its name is "*Title*, N card notes" with the full title, even when the 2-line label truncates it. Focus is a `2px solid accent` ring at 4px offset with `rounded.lg` corners. There is no hover change apart from the pointer cursor.
- **Count line:** "139 card notes in 9 Books" in `meta`/`ink-tertiary`. It is plain text, not a live region, and shows in Boxes view only. During a search it becomes the shelf sentence ("14 card notes in 4 Books contain “habit”." or "No card notes contain “…”."), which `status` announces after about 500 ms of no typing.
- **Open box:** today's scoped page (chip, search, Add card note, notes, pile, Back to top) with no toggle, plus an 8px full-width strip in `scope.spineColor` directly under the app shell. The strip is `aria-hidden`, shows only once the view has loaded, and also shows for a Book with no notes.
- Back to top keeps working in both views and on the open box, moving focus to Search card notes.

## Cross-Story Dependencies

- Each story depends only on the stories before it. 14.1's `spineColor` and regenerated schema feed 14.2's boxes and 14.3's strip. 14.4 needs 14.2's boxes and removes 14.2's staging. 14.5 needs 14.4's shelf search state.
- Before 14.1, every unresolved "spine drift" entry in `deferred-work.md` must be reconciled. None was open on 2026-11-24.
- After 14.5 comes the Epic 14 retro, and GitHub issue #17 closes when the epic is done.
