# Ideas

A parking lot for feature ideas. Nothing here is planned or promised: each entry is a candidate to think through properly when there is time, then either turn into an epic/story or drop.

How to use it:

- Add an idea as a `##` section with a one-line summary and whatever notes you have. Rough is fine.
- When you pick one up, give it a proper thought (for example with `bmad-forge-idea` or `bmad-brainstorming`) and record the outcome in its **Status** line.
- Status values: `new` (just captured), `exploring` (being thought through), `planned` (moved into an epic or story; link it), `dropped` (with a one-line reason).

## Tiles view in the catalog

**Status:** new

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
