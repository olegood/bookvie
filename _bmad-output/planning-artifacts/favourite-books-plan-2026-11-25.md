---
title: Favourite books — plan
status: agreed
created: 2026-11-25
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: Oleg, 2026-11-25 → "favourite books: a simple starred Book; search and filter can show only favourites"
---

# Favourite books — plan

Let Oleg star a Book to remember that it **had an impact on him**. The star is a verdict about the Book, not a way to find it again. He sets it on the Book page, next to the title, and on the Book's cover in the Catalog. A one-click **★ Favourites** toggle chip in the Catalog's filter row shows only starred Books, together with Search titles and every other chip.

## 1. What already exists

- **A tag could stand in for this, but it would leak** (Amelia). A `favourite` tag in the Tag chip works today. It would also show in the tags combobox, the tag list on the Book page and the Tag chip's list, next to `added-by-skill`, so each of those would need a special case. A verdict belongs on the Book (Winston conceded the tag route).
- **Whole edits** (Amelia). `edit_book` requires every form key (`agent/book_tools.py:5`), and the web Edit form sends the whole Book too. A `favourite` field on the form would unstar a Book whenever an edit leaves it out.
- **Writes are intents** (AD-3): one user action each, e.g. `POST /api/intents/mark-side-read` (`http/api.py:673`). The agent tools run over the same intents (AD-21).
- **The document is versioned with one migration chain** (AD-13), so a new Book field comes with a migration, and an older backup restores through it (AD-14).
- **Filters are never remembered** (`catalogFilter.ts:4`, EXPERIENCE.md → Filter chips). Chips in a group OR, groups AND with each other and with Search titles (`matchesFilters`). Today's groups: Status, Type, Language, Tag, Publisher.
- **The Catalog has three views.** Tiles and List show covers. Bookcase shows only spines, and clicking a spine opens the `SpinePopover`. In Tiles, a finished Book's spine-coloured ribbon hangs at the cover's top right (`CatalogTiles.module.css:100`, Epic 8).
- `ShelfBook` (`views/models.py:24`) is the catalog view's Book; it has no favourite.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **`favourite: bool` on the Book**, default `false`. A migration adds `false` to every Book, so an older backup restores with no stars. *Superseded in part by the spine's AD-18 (2026-11-25): the field is required in the store model, with no default. `add-book` and the migration write `false`.* | Oleg: the star means "this Book had an impact on me". That's a verdict about the Book, not a tag (Winston conceded; Amelia's three special cases). |
| D2 | **Only its own intent writes it:** `POST /api/intents/set-favourite` with `{bookId, favourite}`. It is idempotent: setting the current value succeeds and changes nothing. The Book form, `edit_book` and every other intent never read or write it. | Amelia's whole-edit trap: editing a title must never unstar a Book. Winston: one door. Murat: "an edit keeps the star" holds by construction. |
| D3 | **Any Book can be starred**: unread, reading, paused, side read or finished. | Oleg's call (John over Mary's "only after it's finished"). The star is Oleg's verdict, and the first chapter can be enough. |
| D4 | **The Book page is the main place:** a star toggle button next to the title. Its accessible name is stable (AD-17), e.g. "Favourite", with `aria-pressed`. | Sally: "on the cover *too*" means the cover is the shortcut and the Book page is the main place. |
| D5 | **Tiles and List:** a star toggle on the cover, at the top left, opposite the finished ribbon. A starred Book always shows ★. An unstarred Book shows the outline ☆ only on hover or keyboard focus. | Oleg's call (Sally): 528 outline stars would be noise. Top left keeps clear of Epic 8's ribbon. |
| D6 | **Bookcase:** a starred Book shows a small ★ mark on its spine, which isn't clickable. The `SpinePopover` has the star toggle button. | Oleg's call (Sally). A spine is too narrow to be a target. |
| D7 | **Clicks are optimistic and roll back on failure:** ★ shows at once. If the intent fails, the star goes back to how it was and the usual failure message shows. The views are refetched after success (AD-7). *Superseded (2026-11-25): Oleg chose to follow AD-7 in the UX update, so there is no optimistic star and no rollback. The star changes once the save succeeds and the views refetch (EXPERIENCE.md → Favourite star; spine AD-7).* | Murat: a star that quietly reverts is a lie. |
| D8 | **A ★ Favourites toggle chip, first in the filter row:** one click, `aria-pressed`, no popup. On, it shows only starred Books, ANDed with Search titles and every other group. "Clear filters" turns it off. | Oleg's call (Sally): it is the chip he'll use most. Winston: favourite isn't an alternative to Read or Unread, so it's its own group, not part of Status. |
| D9 | **The chip is not remembered**, like every other chip. It never applies to Home's slice or to the "X of Y finished" meter. | Oleg's call (Amelia: one exception is how bugs start). |
| D10 | **The Catalog only.** Card notes search and the shelf search in Boxes don't get a favourites filter. | Oleg's call. Mary's "notes from my favourite Books" stays an idea. |
| D11 | **Agents can read the star but can't set it.** `get_book` and `list_catalog` show `favourite`. There is no `set_favourite` tool, and `find_book` doesn't filter by it. | Oleg's call (Sally): "a verdict an agent sets isn't your verdict". |
| D12 | **Epic 16, two stories**, FR-31. | Oleg's call (John's split, a third time running). |

Out of scope:
- A favourites filter on Card notes or the Boxes shelf search (D10).
- An agent tool that sets the star (D11).
- A Favourites sort, a count of favourites on Stats, and a dedicated favourites page. Mary: with the chip on, Tiles is already the trophy shelf.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 16's first story: confirm `deferred-work.md` has no unresolved "spine drift" entries from Epic 15 (AGENTS.md → Architecture spine). The Epic 15 reconciliation landed in `d75b35e`. | — |
| 1 | EXPERIENCE.md | The star on the Book page (D4), on covers in Tiles and List with the outline shown only on hover/focus (D5), on the spine and in the `SpinePopover` (D6), failure and rollback (D7), and the ★ Favourites toggle chip (D8, D9). Name each control's accessible text. | `bmad-ux` (update) |
| 2 | DESIGN.md | The star: glyph or icon, size, colour token for ★ and ☆, its spot on the cover (top left) and on the spine, and the pressed style of the toggle chip. Reuse tokens where possible. | `bmad-ux` (update) |
| 3 | PRD | New **FR-31: Favourite Books**: star and unstar any Book from the Book page and the Catalog; the Catalog can show only favourites. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | AD-18: the Book's `favourite` and its default. AD-13: the migration. AD-3/intents: `set-favourite`, the only writer (D2). AD-6: the Favourites group. AD-21: `favourite` is in `get_book` and `list_catalog`, with deliberately no tool to set it. Capability map row for FR-31. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 16: Remember the Books that mattered**, covering FR-31, with the two stories below. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 16 and Stories 16.1 and 16.2. | `bmad-sprint-planning` |
| 7 | Stories 16.1, 16.2 | Each: ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate` (AGENTS.md → Story pipeline). Then the Epic 16 retro, since 16.2 closes the epic. | per story |

## 4. Story cut (Epic 16)

**16.1 Star a Book.** D1–D7, D11:

- Domain and store: `favourite` on the Book, the AD-18 invariant, a migration that sets `false` (AD-13).
- Intent `set-favourite` (`intents/`, `http/api.py`), with `book_not_found` when the Book is gone.
- Views: `favourite` on the Book detail view and `ShelfBook`, then `npm --prefix frontend run api:gen` (AD-8). Frontend and e2e fixtures gain `favourite`.
- Agent: `get_book` and `list_catalog` return `favourite`. No new tool, and `edit_book` is unchanged.
- UI: the star on the Book page, on covers in Tiles and List, the spine mark and the `SpinePopover` button in Bookcase.

**16.2 Show only favourites.** D8–D10:

- `lib/catalogFilter.ts`: `CatalogFilters.favourites: boolean`, `NO_FILTERS`, `FilterableBook.favourite`, the match in `matchesFilters`.
- `components/FilterChips.tsx`: the ★ Favourites toggle chip, first in the row, `aria-pressed`. "Clear filters" turns it off.
- `pages/CatalogPage.tsx`: wires it like the other chips.

## 5. Tests

Murat's risks, for the ATDD:

- **Edits keep the star** (P0): editing a starred Book on the web and with `edit_book` leaves it starred (D2).
- **Backups** (P0): restoring a backup from before Epic 16 gives every Book `favourite: false`. A star survives an export and restore round trip.
- **Star and unstar** (P0): from the Book page, a Tiles cover, a List row and the `SpinePopover`; the star shows in the other views after a refetch. Setting the current value is a no-op success.
- **Filter** (P0): the Favourites chip shows exactly the starred Books in Bookcase, List and Tiles. It ANDs with Unread, a Tag and a Search title. "Clear filters" turns it off.
- **Rollback** (P1): a failed `set-favourite` puts the star back and shows the failure message.
- **Hover only** (P1): an unstarred cover shows no outline star until hover or focus. A starred cover always shows ★. The star never covers the finished ribbon.
- **Accessible names** (P1): the star buttons and the chip have stable names and `aria-pressed` (AD-17); e2e drives them by name.
- **Not remembered** (P1): a reload resets the chip. Home's slice and the finished meter ignore it.
- **Agents** (P1): `get_book` and `list_catalog` return `favourite`. The tool list has no tool that sets it.
- **Unchanged** (P1): the existing catalog-filter specs pass with Favourites off.
