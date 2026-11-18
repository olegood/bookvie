# Ideas

A parking lot for feature ideas. Nothing here is planned or promised: each entry is a candidate to think through properly when there is time, then either turn into an epic/story or drop.

How to use it:

- Add an idea as a `##` section with a one-line summary and whatever notes you have. Rough is fine.
- When you pick one up, give it a proper thought (for example with `bmad-forge-idea` or `bmad-brainstorming`) and record the outcome in its **Status** line.
- Status values: `new` (just captured), `exploring` (being thought through), `planned` (moved into an epic or story; link it), `dropped` (with a one-line reason).

## Tiles view in the catalog

**Status:** planned (Epic 8, see [the plan](../_bmad-output/planning-artifacts/catalog-tiles-plan-2026-11-13.md))

Add a grid view to catalog mode: a tile per book with its cover and title, as an alternative to the current list.

Notes:

- Needs a view toggle (list / tiles), probably remembered between visits.
- Books without a cover need a placeholder tile that still reads well.

## Pagination with pagination-aware search

**Status:** new

Paginate the catalog, and make search work across all pages rather than only filtering the page currently shown.

Notes:

- Search likely moves server-side (or the client loads the full index) so results aren't limited to the loaded page.
- Search results should be paginated too, and clearing the search should return to where the user was.

## Catalog quick-search by author

**Status:** new

Extend the catalog quick-search so it matches authors as well as titles.

Notes:

- Decide how matches are shown: highlight the author match, or rank title matches first.

## bookvie MCP server

**Status:** new

Expose bookvie as an MCP server so Claude (and other agents) can read and update the catalog and reading progress directly.

Use cases:

- **Update the current page:** "I am on page X of book Y".
- **Move the bookvie skills onto MCP:** refactor `bookvie-new-book`, `bookvie-notes-summary` and the like to call MCP tools instead of the HTTP API.
- **Reading list for a skill:** "list all the books I need to read to acquire skill X".
- **Time-boxed reading plan:** "which books can I fully read on topic X if I have 2 months?" (uses measured pace and pages left).
- **Reading order:** "organize the right sequence for reading X, Y, Z".

Notes:

- The first two are thin wrappers over existing API calls; the last three need the agent to reason over the catalog (topics, purposes, notes, pace), so the MCP mostly has to expose good read tools.

## Faster card note entry

**Status:** planned (Epic 9, see [the plan](../_bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md))

Make the "Add card note" dialog quicker to use when adding several notes in a row. Today each note means saving, then pressing "Add card note" again to reopen the dialog.

Suggestions:

- **Cmd+Enter to save:** while typing the note, Cmd+Enter does what the "Save note" button does.
- **"Add another" checkbox:** when it's checked, saving keeps the dialog open with an empty field, ready for the next note.

Notes:

- Decide whether "Add another" is remembered between visits or resets each time the dialog opens.
- With "Add another" on, show that the note was saved (for example a brief confirmation or a running count) and put focus back in the empty field.
- Decide which fields carry over to the next note (for example the page number) and which are cleared.

## Home bookcase ordered by recent use

**Status:** new

Order the bookcase on Home by when each Book was last touched or opened, so the Books in use right now are at hand.

The Books must be sorted by their last touch, most recently touched first.

Notes:

- This is side information, not library data. Keep it outside the main data, for example in the browser's local storage, so it is never exported and doesn't count as part of the library. The Tiles view's remembered choice (FR-25) already works this way.
- Today the Home slice (FR-24) shows the Main book's row, then the Up next Book's, then rows with the most recent finishes, with the Books in bookcase (catalog sort) order. Decide whether recent use replaces that, only orders the Books within it, or is a Home-only option.
- Define "touch": opening the Book's detail, logging a page, adding a card note, editing it?
- Local storage is per browser, so the order won't follow you to another computer and resets if site data is cleared. That's acceptable for a convenience, but the app has to work when it's empty.

## Catalog grouping by author, publisher or year

**Status:** new

Let the catalog group Books by author, by publisher or by year, so it's easier to find your way around a large catalog.

Notes:

- Needs a grouping control (none / author / publisher / year), probably next to the list / tiles toggle.
- Remember the chosen grouping in the browser's local storage, like the Tiles view's remembered choice (FR-25). It's a viewing preference, not library data, so it's never exported.
- Decide how a Book with several authors is grouped: under each author, or only the first.
- Books with no publisher or no year need their own group (for example "Unknown"), placed last.
- Decide how grouping combines with the catalog sort, the filter chips, quick-search and the tiles view, and whether groups can be collapsed.

## Development vs production, and a visible version

**Status:** planned (Epic 11, see [the plan](../_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md))

Make it obvious whether the running app is the development version or the one in real use ("production"), and show the app's version somewhere, so it's always clear which version is in use.

Notes:

- Distinguishing the environments: for example a "DEV" badge or a different accent color in the app shell, and a different browser tab title or favicon, only in development. Production stays as it looks today.
- The two environments should also keep separate data (database file, port), so trying things out in development never touches the real library. Check what is shared today.
- Version: decide where it comes from (`package.json` / `pyproject.toml` version, a git tag, the commit hash, the build date, or a combination) and where it's shown (footer, an "About" entry, the tab tooltip).
- The backend could report its version too (for example in a health or info API call), so a mismatch between frontend and backend is visible.

## Catalog search and filter results count

**Status:** new

Show how many Books match the current quick-search and filter chips. Today there is no way to see how many matches were found.

Notes:

- For example "12 of 240 books" near the search field, updated as the user types or toggles a chip.
- Decide whether the count shows only while a search or filter is active, or always (as the total).
- Announce the count to screen readers (a polite live region), without announcing on every keystroke.
- If pagination is picked up (see "Pagination with pagination-aware search"), the count must cover all pages, not only the loaded one.

## Descending catalog sort

**Status:** planned (Epic 10, see [the plan](../_bmad-output/planning-artifacts/catalog-sort-direction-plan-2026-11-15.md))

Let the catalog sort in the other direction as well. Today each key has one fixed direction: Author, Title and Pages ascending, Date added newest first. The direction isn't shown and can't be reversed.

Notes:

- Needs a direction control next to the Sort select, for example an ascending / descending toggle button, or descending entries in the select itself ("Date added, newest first").
- Remember the direction along with the sort key. The key is already kept in local storage (`bookvie.catalogSort`), so a stored value from before this change must still read correctly (default: ascending).
- Decide whether each key has its own natural default direction (for example Date added newest first, Pages longest first) or all start ascending.
- Decide the tie-breaker (for example Title ascending), and whether it flips with the direction.
- If catalog grouping is picked up (see "Catalog grouping by author, publisher or year"), decide whether the direction also orders the groups or only the Books inside each group.

## App favicon

**Status:** planned (Epic 11, see [the plan](../_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md))

Give bookvie a favicon, so its tab and bookmark are easy to recognize among the others. Today `frontend/index.html` has no icon link and there is no `frontend/public/` folder, so the browser shows its generic page icon.

Notes:

- Use a free icon whose license allows it (for example a book icon from an open icon set under MIT, CC0 or similar), or draw a simple one. Record the source and license next to the file.
- An SVG favicon scales to any size and can follow the color tokens in DESIGN.md. Decide whether a PNG fallback (for example 32×32 and a 180×180 Apple touch icon) is worth adding; Chrome is the only supported browser and handles SVG.
- Check that it stays readable at 16×16 in the tab, in both light and dark browser themes.
- If "Development vs production, and a visible version" is picked up, the development build could use a variant of the same icon (for example with a "DEV" mark or another color), so the two tabs are easy to tell apart.

## Back to top button

**Status:** planned (standalone spec, see [the spec](../_bmad-output/implementation-artifacts/spec-back-to-top-button.md))

Add a button that takes the user back to the top of the page. Scrolling a catalog of 500+ Books is long, and a quick way to jump back to the top (to the search field, filter chips and sort) saves a lot of scrolling.

Notes:

- Show it only after the user has scrolled down some way (for example one screen height), and hide it again near the top.
- Place it so it doesn't cover content or other controls, for example fixed in the bottom-right corner, and make sure it works in both the list and tiles views.
- Decide whether it scrolls smoothly or jumps, and respect the reduced-motion setting (`prefers-reduced-motion`).
- Keyboard and screen readers: give it an accessible name ("Back to top"), and after it's used, move focus to the top of the page (for example the quick-search field or the page heading) so keyboard users don't stay at the bottom.
- Decide whether it's catalog-only or part of the app shell for any long page.
- If pagination is picked up (see "Pagination with pagination-aware search"), the catalog gets shorter pages and the button matters less, but it's still useful on a long page.
