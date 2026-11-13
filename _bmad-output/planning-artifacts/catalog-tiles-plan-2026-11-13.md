---
title: Catalog tiles view — plan
status: agreed
created: 2026-11-13
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: docs/ideas.md → "Tiles view in the catalog"
---

# Catalog tiles view — plan

A third Catalog view, **Tiles**, next to Bookcase and List: one tile per Book showing its cover, title and author, laid out like the reference (a Kindle-style cover grid). This plan records what was decided and the changes to make, in order.

## 1. What already exists

- The Catalog already has a remembered view toggle, Bookcase · List (`frontend/src/components/ViewToggle.tsx`, `frontend/src/lib/catalogView.ts`, `localStorage` key `bookvie.catalogView`). Tiles is a third value of `CatalogViewChoice`, not a new toggle.
- Search titles, Sort and the filter chips already apply to every view (FR-20, EXPERIENCE.md → Catalog view toggle).
- `ShelfBook` (`backend/bookvie/views/models.py:24`) carries `has_cover`, `finished`, `role`, `current_page`, `pages` and `spine_color`, but **not** `cover_file`.
- Covers are stored at up to 1200px on the long edge, with no smaller copy (AD-12), and served at `/media/covers/<file>` with immutable caching.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Tiles is a **third view**: Bookcase (default) · List · Tiles, in the same segmented control and remembered the same way. | Oleg's call. The bookcase stays the main picture; tiles are for recognizing a book by its cover. |
| D2 | **Layout follows the reference:** a responsive grid of tiles. Each tile has a cover in its natural shape, sitting on a **shared bottom baseline**, then one bold line of title (ellipsis), then one line of first author (ellipsis). No buttons on the tile. | The reference. Bottom alignment works like an invisible plank, so it keeps the bookcase idea. |
| D3 | **Fixed cover box** per tile (2:3, about 150px wide; final size in DESIGN.md tokens). The image sits inside with `object-fit: contain; object-position: bottom`. | The grid never shifts while covers load, and no image dimensions have to be stored. No data change. |
| D4 | **Finished:** a small **bookmark ribbon** at the cover's top-right corner, filled with the Book's **spine color**, with the `spine-edge` line and a check glyph. | Shows status by shape, not color (DESIGN.md accessibility rule), and carries the color earned on the bookcase onto the tile. Oleg approved. |
| D5 | **Reading now** (a Book with a current, unfinished Reading: Main, Side read, Up next or Waiting with a paused Reading): a thin **progress bar under the cover**, `accent` on `accent-soft`, the same style as the Waiting-for-you mini bar. A re-read of a finished Book shows both the ribbon and the bar. | Oleg approved. The data is already on `ShelfBook` (`current_page`, `pages`). |
| D6 | **Unread:** no mark. | Calm grid; the unread state is the absence of a mark. |
| D7 | **No cover:** a **typeset cover** fills the box: the Book's spine color as the fill, the title in the serif and the author small near the bottom (read Books); the dashed-outline version on `surface-inset` for unread Books, matching an unread spine. Not the current dashed "two bars" placeholder. | A missing-cover placeholder looks broken in a grid of covers. |
| D8 | **Activating a tile opens Book detail**, as a List title does. The Spine popover stays in the Bookcase. | One action per tile; the popover belongs to spines. |
| D9 | **Accessible name** of each tile link: "*Title*, by *Author*", plus "finished" or "reading, page N of M". Title and author cut with an ellipsis never hide information (EXPERIENCE.md → Names). | Status mustn't be visual only, and the Agent Label Contract (AD-17) relies on names. |
| D10 | Search, Sort, filters, the empty shelf, "No books match these filters.", the new-book focus and highlight ring (`HIGHLIGHT_MS`) and the delete hand-off all behave in Tiles as in the other views. | One Catalog, three ways to see it. |
| D11 | Covers load with `loading="lazy"` and `decoding="async"` at full size. **No thumbnails for now.** A performance check (§5) decides whether a thumbnail ADR is ever needed. | Localhost with immutable caching; don't amend AD-12/AD-14 until a measurement says so. |

## 3. Changes, in order

Each step is its own skill run. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 1 | PRD (`prds/prd-bookvie-2026-10-28/prd.md`) | Add **FR-25: Catalog tiles** under §4.8 Organizing *(Should)* with D1–D10 as Consequences. Extend FR-4 / FR-20 cross-references ("the bookcase, list or tiles"). In §6.2 *Progress visuals*, note that the tile reading bar is a small, separate step and that the "cover that fills with color" stays Later. Bump `updated:`. | `bmad-prd` (update) |
| 2 | DESIGN.md | New **Catalog tile** component (cover box, baseline, title and author type, gaps, grid columns at desktop widths), **Finished ribbon**, **Tile reading bar**, **Typeset cover** (read and unread). Catalog view toggle becomes three options. New tokens copied character for character into `frontend/src/styles/tokens.css` in the story that first uses them (`e2e/app-shell.spec.ts` compares them). Light, dark and forced-colors rules for the ribbon and bar. | `bmad-ux` (update) |
| 3 | EXPERIENCE.md | Catalog view toggle row: Bookcase · List · Tiles. New **Tiles** section after **Bookcase**: activation → Book detail, keyboard order (row by row, in sort order), accessible names (D9), add-highlight and delete hand-off, empty and no-match states, lazy cover loading with the box shown first. | `bmad-ux` (update) |
| 4 | Architecture spine | Small note (not a new AD): the catalog view's `ShelfBook` gains `coverFile` (AD-8: Python model first, then `npm --prefix frontend run api:gen`). Add **Cover thumbnails** to **Deferred**, triggered only by a failed performance check (§5), naming AD-12 and AD-14 as the ADs it would amend. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 8: See the catalog as covers**, covering FR-25, with the three stories below and their gates. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 8 and its stories to `sprint-status.yaml`. Check readiness first: the Epic 7 retro items and spine reconciliation are done. | `bmad-sprint-planning` |
| 7 | Each story | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. | per story |
| 8 | `docs/ideas.md` | Status → `planned`, linking Epic 8. Done with this plan. | — |

## 4. Story cut (Epic 8)

**8.1 See my catalog as covers.** `ShelfBook.coverFile` in the API and the regenerated schema; a third **Tiles** option in the view toggle, remembered; the tile grid with the fixed cover box, baseline, title and author lines; activating a tile opens Book detail; Search, Sort and filters apply; empty and no-match states; add-highlight and focus on the new tile; lazy cover loading; the performance check (§5). Books without a cover use the existing placeholder for now.

**8.2 See what I've read and what I'm reading on the tiles.** Finished ribbon in spine color (D4), reading bar (D5), accessible names with status (D9), forced-colors look.

**8.3 Give books without a cover a typeset cover.** Typeset cover for read and unread Books (D7), replacing the placeholder in Tiles only. Whether the Main book card and the Up next thumbnail adopt it too is a separate decision for later.

## 5. Tests and the performance check

- **Unit:** `catalogView.ts` accepts `tiles`, and storage holding an unknown value still falls back to Bookcase; the reading-bar percentage from `current_page` and `pages`; the tile accessible-name builder.
- **API:** `coverFile` is present and null-safe on every `ShelfBook`; `check:api` passes on the regenerated schema.
- **E2E (Chromium only):** the toggle has three options and remembers Tiles across a reload; search, filters and sort narrow and reorder tiles; activating a tile opens Book detail; a new book is focused and ringed in Tiles; ribbon and bar show for the right roles; names carry status; tokens match DESIGN.md.
- **Performance check (8.1 AC):** seed 500 Books with 1200px covers, switch to Tiles in Chromium: the grid and the first screen of covers render within about 1 s on Oleg's machine, and scrolling to the end has no visible layout shift. If it fails, open a follow-up story for cover thumbnails and amend AD-12/AD-14 (step 4's Deferred entry).

## 6. Risks and open items

- **Image weight** (D11): covered by the performance check.
- **Tokens drift:** DESIGN.md and `tokens.css` must change in the same story.
- **Existing tests:** any e2e or unit test that assumes two view options needs updating in 8.1.
- **Open:** the exact tile width and the number of columns at common desktop widths, settled in step 2 against the reference.
