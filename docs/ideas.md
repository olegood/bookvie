# Ideas

A parking lot for feature ideas. Nothing here is planned or promised: each entry is a candidate to think through properly when there is time, then either turn into an epic/story or drop.

How to use it:

- Add an idea as a `##` section with a one-line summary and whatever notes you have. Rough is fine.
- When you pick one up, give it a proper thought (for example with `bmad-forge-idea` or `bmad-brainstorming`) and record the outcome in its **Status** line.
- Status values: `new` (just captured), `exploring` (being thought through), `planned` (moved into an epic or story; link it), `dropped` (with a one-line reason).

## Backlog

Ideas not yet delivered.

### Catalog quick-search by author

**Status:** new

Extend the catalog quick-search so it matches authors as well as titles.

Notes:

- Decide how matches are shown: highlight the author match, or rank title matches first.

### Catalog search and filter results count

**Status:** new

Show how many Books match the current quick-search and filter chips. Today there is no way to see how many matches were found.

Notes:

- For example "12 of 240 books" near the search field, updated as the user types or toggles a chip.
- Decide whether the count shows only while a search or filter is active, or always (as the total).
- Announce the count to screen readers (a polite live region), without announcing on every keystroke.
- If pagination is picked up (see "Pagination with pagination-aware search"), the count must cover all pages, not only the loaded one.

### Pagination with pagination-aware search

**Status:** new

Paginate the catalog, and make search work across all pages rather than only filtering the page currently shown.

Notes:

- Search likely moves server-side (or the client loads the full index) so results aren't limited to the loaded page.
- Search results should be paginated too, and clearing the search should return to where the user was.

### Catalog grouping by author, publisher or year

**Status:** new

Let the catalog group Books by author, by publisher or by year, so it's easier to find your way around a large catalog.

Notes:

- Needs a grouping control (none / author / publisher / year), probably next to the list / tiles toggle.
- Remember the chosen grouping in the browser's local storage, like the Tiles view's remembered choice (FR-25). It's a viewing preference, not library data, so it's never exported.
- Decide how a Book with several authors is grouped: under each author, or only the first.
- Books with no publisher or no year need their own group (for example "Unknown"), placed last.
- Decide how grouping combines with the catalog sort, the filter chips, quick-search and the tiles view, and whether groups can be collapsed.

### Home bookcase ordered by recent use

**Status:** new

Order the bookcase on Home by when each Book was last touched or opened, so the Books in use right now are at hand.

The Books must be sorted by their last touch, most recently touched first.

Notes:

- This is side information, not library data. Keep it outside the main data, for example in the browser's local storage, so it is never exported and doesn't count as part of the library. The Tiles view's remembered choice (FR-25) already works this way.
- Today the Home slice (FR-24) shows the Main book's row, then the Up next Book's, then rows with the most recent finishes, with the Books in bookcase (catalog sort) order. Decide whether recent use replaces that, only orders the Books within it, or is a Home-only option.
- Define "touch": opening the Book's detail, logging a page, adding a card note, editing it?
- Local storage is per browser, so the order won't follow you to another computer and resets if site data is cleared. That's acceptable for a convenience, but the app has to work when it's empty.

### bookvie MCP server

**Status:** planned (Epic 12, see [the plan](../_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md))

Expose bookvie as an MCP server so Claude (and other agents) can read and update the catalog and reading progress directly.

Use cases:

- **Update the current page:** "I am on page X of book Y".
- **Move the bookvie skills onto MCP:** refactor `bookvie-new-book`, `bookvie-notes-summary` and the like to call MCP tools instead of the HTTP API.
- **Reading list for a skill:** "list all the books I need to read to acquire skill X".
- **Time-boxed reading plan:** "which books can I fully read on topic X if I have 2 months?" (uses measured pace and pages left).
- **Reading order:** "organize the right sequence for reading X, Y, Z".

Notes:

- The first two are thin wrappers over existing API calls; the last three need the agent to reason over the catalog (topics, purposes, notes, pace), so the MCP mostly has to expose good read tools.
- The bookvie skills (`bookvie-new-book`, `bookvie-notes-summary` and any others) have to be reworked once the MCP server is available, so they use it instead of the HTTP API.
- The MCP server should start and run with the same `bookvie` CLI command that starts the app today, if possible, so there's nothing extra to launch. Decide whether it's always on, or turned on by a flag or subcommand.

### Daily backup to Dropbox

**Status:** new

Back up the library automatically once a day and upload the backup to Dropbox, so a copy exists off this machine without remembering to export by hand.

Notes:

- The backup itself already exists: the export from the Backup page (`GET /api/export` with the `X-Bookvie-Export: 1` header) is a zip of `library.json` and `covers/`, and a restore checks it before replacing anything. This idea is about running it on a schedule and getting it off the machine.
- Possible shapes:
  - **A new bookvie skill** (for example `bookvie-backup`) that calls the export and uploads the zip through a Dropbox MCP integration, run daily by a scheduled task or `/loop`.
  - **Built into the app:** the backend makes the daily export itself and uploads it with the Dropbox API, with no agent involved.
  - **Simplest:** a daily export written into the local Dropbox folder (the Dropbox desktop app syncs it), via launchd/cron or the app.
- Decide what "once per day" means when the app isn't running all day: catch up on the next start if the last backup is older than a day? The "Last export" time in `local-state.json` could drive that.
- Retention: keep the last N daily zips (for example 7 daily plus a few weekly) so Dropbox doesn't fill up, and a bad day doesn't overwrite the only good copy.
- Name the files with the date (for example `bookvie-backup-2026-11-18.zip`), and skip the upload when nothing changed since the last one.
- Dropbox credentials (an OAuth token) must stay out of the library data and out of the repo.
- Show the last successful upload somewhere (the Backup page?), and make a failed upload visible rather than silent.
- If the "bookvie MCP server" idea is picked up, a backup tool there could be what the skill calls.

### Finished Books behind the Stats numbers

**Status:** new

Let the Stats page show which Books were finished, not only how many. Today it shows the totals ("books finished", "pages finished") and one bar per month or year, but there's no way to see the Books behind a number.

Suggested shape: click a bar to see the list of Books finished in that month or year.

UX suggestions:

- **A list under the chart, not a popup.** Clicking a bar selects it (highlighted, the others dimmed) and shows "Finished in March 2026" with its Books below the chart. A popover or tooltip is cramped for a long year, and a list on the page is easy to read, scroll and click through.
- **A list for the whole range too.** With no bar selected, the list shows every Book finished in the chosen range (This year, All time, Custom...), so the "books finished" total has its Books as well. Selecting a bar narrows it to that period; clicking the bar again (or a "Show the whole range" link) goes back.
- **Each row:** cover thumbnail, title, author, pages and the finish date, newest first, and it links to the Book's detail page.
- Empty bars (0 books) aren't clickable.
- Changing the range clears the selected bar.

Notes:

- Today the chart is decorative (`aria-hidden` in `StatsBars.tsx`) with a visually hidden table for screen readers. Clickable bars must become real buttons with an accessible name (for example "March 2026, 3 books, 912 pages") and `aria-pressed` for the selected one, reachable with the keyboard (arrow keys between bars would be a nice touch).
- When a bar is selected, announce the list's heading politely (for example "Finished in March 2026: 3 books").
- The stats API sends only counts per bucket today. Either it also returns the finished Books (id, title, author, pages, finish date) for the range, or the page asks for them separately when a bar is chosen. A year of finishes is small, so sending them with the range is probably simplest.
- A re-read Book finished twice in the range: decide whether it's listed once per finish (matching how the counts work) or once with both dates. The list should add up to the bar's number.
- Decide whether the selected bar is kept in the URL (for example `?period=2026-03`), so going back from a Book's detail returns to the same list.
- Possible extra: a "pages finished" figure per row helps explain a tall bar with few books.

### Edit a Reading

**Status:** new

Let me edit a Reading after the fact: change my mind about the rating, rethink whether the purpose was fulfilled, fix a wrong finish date, and so on. Today a finished Reading can't be changed at all.

Notes:

- What exists today: `finish-reading` sets the finish date, Purpose fulfilled and rating once, when the Reading is finished. `edit-purpose` changes the Purpose, but only on the current (unfinished) Reading; a finished one gets `reading_already_finished`. There's no way to change any of these on a finished Reading.
- Which fields are editable? Likely candidates: rating, Purpose fulfilled, Purpose, finish date, start date. Probably not the page fields (`startPage`, `currentPage`, `finishedPages`, the earlier segments), since they drive Measured pace and Stats; decide whether those are in or out.
- Where it lives: an "Edit" action on each Reading in the Book's detail page (the reading history), opening a dialog like the Finish one, prefilled with the current values.
- Same rules as when finishing: rating 1 to 5 or none; Purpose fulfilled only when the Reading has a Purpose. If the Purpose is cleared, Purpose fulfilled has to be cleared too.
- Dates: the finish date can't be before the start date or in the future. Changing it moves the Book between Stats buckets, and that's expected.
- Re-reads: a Book can have several Readings, so the edit must target one Reading by its id, not "the Book's latest".
- Editing isn't progress, so `lastProgressUpdate` stays as it is (like `edit-purpose` today).
- Possible extra: also allow un-finishing a Reading (finished by mistake), or deleting a Reading. Decide whether that belongs here or is its own idea.
- If the "bookvie MCP server" is in place, an edit-reading tool there would let me say "change my rating of X to 4 stars".

### Card notes on introductory (Roman-numbered) pages

**Status:** new (bug or enhancement, to decide in party mode)

A card note can't point at the introductory pages that many books number with Roman numerals, such as "VI" or the range "IX-X" (preface, foreword, introduction). The Page field accepts only Arabic page numbers, so a note taken there can't record its real page.

Notes:

- What exists today: `parse_note_pages` (`backend/bookvie/domain/note_pages.py`) accepts one page or one range of whole numbers between 1 and the Book's Pages, and refuses anything else with the "one page or one range" message. A note is stored as integer `pageStart` and `pageEnd`.
- Not an immediate need: today the workaround is to put the Roman page in the note's text, or pick a nearby Arabic page.
- Bug or enhancement: decide whether this is a gap in FR-17 (a page that exists in the book can't be referenced) or new scope.
- Storage: integers can't hold "VI" as typed. Options include a separate front-matter flag plus a number (VI = front page 6), or keeping the page label as text next to the numbers used for sorting. Whatever is picked has to survive export and restore, and older backups must still load.
- Order: front-matter notes come before page 1 in the pile and in the Card notes list. Decide where a range that crosses into the main pages (for example "XII-3") goes, or refuse it.
- Validation: Book's Pages counts only the Arabic pages today, so Roman pages have no upper bound to check against. Decide whether any well-formed Roman numeral is accepted, and whether "vi" (lower case, the usual print style) and "VI" are the same page.
- Other things that use note pages: the check that Pages can't drop below a note's page (`pages_below_card_note` in `edit_book.py`), the page ref chip, `bookvie-notes-summary`, and the MCP server's card-note tools if Epic 12 is in place. Roman pages must not count towards reading progress.

## Implemented

Ideas already built and delivered.

### Tiles view in the catalog

**Status:** planned (Epic 8, see [the plan](../_bmad-output/planning-artifacts/catalog-tiles-plan-2026-11-13.md))

Add a grid view to catalog mode: a tile per book with its cover and title, as an alternative to the current list.

Notes:

- Needs a view toggle (list / tiles), probably remembered between visits.
- Books without a cover need a placeholder tile that still reads well.

### Faster card note entry

**Status:** planned (Epic 9, see [the plan](../_bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md))

Make the "Add card note" dialog quicker to use when adding several notes in a row. Today each note means saving, then pressing "Add card note" again to reopen the dialog.

Suggestions:

- **Cmd+Enter to save:** while typing the note, Cmd+Enter does what the "Save note" button does.
- **"Add another" checkbox:** when it's checked, saving keeps the dialog open with an empty field, ready for the next note.

Notes:

- Decide whether "Add another" is remembered between visits or resets each time the dialog opens.
- With "Add another" on, show that the note was saved (for example a brief confirmation or a running count) and put focus back in the empty field.
- Decide which fields carry over to the next note (for example the page number) and which are cleared.

### Development vs production, and a visible version

**Status:** planned (Epic 11, see [the plan](../_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md))

Make it obvious whether the running app is the development version or the one in real use ("production"), and show the app's version somewhere, so it's always clear which version is in use.

Notes:

- Distinguishing the environments: for example a "DEV" badge or a different accent color in the app shell, and a different browser tab title or favicon, only in development. Production stays as it looks today.
- The two environments should also keep separate data (database file, port), so trying things out in development never touches the real library. Check what is shared today.
- Version: decide where it comes from (`package.json` / `pyproject.toml` version, a git tag, the commit hash, the build date, or a combination) and where it's shown (footer, an "About" entry, the tab tooltip).
- The backend could report its version too (for example in a health or info API call), so a mismatch between frontend and backend is visible.

### Descending catalog sort

**Status:** planned (Epic 10, see [the plan](../_bmad-output/planning-artifacts/catalog-sort-direction-plan-2026-11-15.md))

Let the catalog sort in the other direction as well. Today each key has one fixed direction: Author, Title and Pages ascending, Date added newest first. The direction isn't shown and can't be reversed.

Notes:

- Needs a direction control next to the Sort select, for example an ascending / descending toggle button, or descending entries in the select itself ("Date added, newest first").
- Remember the direction along with the sort key. The key is already kept in local storage (`bookvie.catalogSort`), so a stored value from before this change must still read correctly (default: ascending).
- Decide whether each key has its own natural default direction (for example Date added newest first, Pages longest first) or all start ascending.
- Decide the tie-breaker (for example Title ascending), and whether it flips with the direction.
- If catalog grouping is picked up (see "Catalog grouping by author, publisher or year"), decide whether the direction also orders the groups or only the Books inside each group.

### App favicon

**Status:** planned (Epic 11, see [the plan](../_bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md))

Give bookvie a favicon, so its tab and bookmark are easy to recognize among the others. Today `frontend/index.html` has no icon link and there is no `frontend/public/` folder, so the browser shows its generic page icon.

Notes:

- Use a free icon whose license allows it (for example a book icon from an open icon set under MIT, CC0 or similar), or draw a simple one. Record the source and license next to the file.
- An SVG favicon scales to any size and can follow the color tokens in DESIGN.md. Decide whether a PNG fallback (for example 32×32 and a 180×180 Apple touch icon) is worth adding; Chrome is the only supported browser and handles SVG.
- Check that it stays readable at 16×16 in the tab, in both light and dark browser themes.
- If "Development vs production, and a visible version" is picked up, the development build could use a variant of the same icon (for example with a "DEV" mark or another color), so the two tabs are easy to tell apart.

### Back to top button

**Status:** planned (standalone spec, see [the spec](../_bmad-output/implementation-artifacts/spec-back-to-top-button.md))

Add a button that takes the user back to the top of the page. Scrolling a catalog of 500+ Books is long, and a quick way to jump back to the top (to the search field, filter chips and sort) saves a lot of scrolling.

Notes:

- Show it only after the user has scrolled down some way (for example one screen height), and hide it again near the top.
- Place it so it doesn't cover content or other controls, for example fixed in the bottom-right corner, and make sure it works in both the list and tiles views.
- Decide whether it scrolls smoothly or jumps, and respect the reduced-motion setting (`prefers-reduced-motion`).
- Keyboard and screen readers: give it an accessible name ("Back to top"), and after it's used, move focus to the top of the page (for example the quick-search field or the page heading) so keyboard users don't stay at the bottom.
- Decide whether it's catalog-only or part of the app shell for any long page.
- If pagination is picked up (see "Pagination with pagination-aware search"), the catalog gets shorter pages and the button matters less, but it's still useful on a long page.
