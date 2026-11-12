# Epic 7 Context: Organize the catalog

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Oleg arrange and narrow his catalog. He can sort it by Author, Title, Date added or Pages, and filter it with chips for Read / Unread, Type, Language and Tag. The bookcase reorders and closes up around the result, and Home's bookcase slice follows the same sort, so finding the right Book for the moment takes one or two clicks instead of a scan of the whole shelf. The epic is presentation only: it adds no new stored data and no new intents.

## Stories

- Story 7.1: Sort my catalog
- Story 7.2: Filter my catalog

## Requirements & Constraints

- **Sort keys:** Author (default), Title, Date added, Pages. Author sorts by the first listed author string with locale-aware collation, then by title. Last-name sorting is out of scope. Title sorts A–Z, Date added newest first by `createdAt`, Pages fewest first. Ties break by title, then `createdAt`, then Book id, so the order is always stable.
- **Sort applies everywhere:** the bookcase spines, the List view rows, the bookcase keyboard order and Home's bookcase slice. Search titles still applies after a sort change.
- **Sort is remembered** per browser. Filters are not: leaving Catalog turns them off.
- **Filter groups:** Status (Read, Unread), Type (Paperback, Hardcover, Ebook), Language, Tag. Language and Tag offer only values that exist in the library, in alphabetical order. Chips in the same group combine with OR. Groups combine with each other and with Search titles with AND.
- **Hidden, not dimmed:** Books that don't match are removed and the shelf closes up. The same applies to List view.
- **Filters never apply** to Home's slice or to the "X of Y finished" library meter.
- **Adding a Book** that the current search or filters would hide clears them first, so the new spine can be scrolled into view and highlighted.
- **Accessibility:** WCAG 2.2 AA in both themes. Every control's accessible name is its visible label.
- **Epic gate:** the per-epic quality gates: P0 = 100%, P1 ≥ 95%, `check:api` clean, coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.

## Technical Decisions

- **Client-side presentation only.** The server owns domain numbers and selections. The client may only apply sort (with `Intl.Collator`) and filter chips to the views it has already fetched. Don't add server-side sorting or filtering, and don't recompute anything the server already owns (meter, roles, slice priority).
- **Server title ordering is separate.** Server-side orderings use their own title key (NFKD, marks stripped, casefold). The catalog sort uses `Intl.Collator` on the client. Don't try to unify them.
- **Home slice:** the client packs spines into rows by viewport width in the remembered sort, then picks up to 3 rows from the view's `slicePriority` (`frontend/src/lib/slice.ts`). Changing the sort changes which rows exist, so the slice is built from the sorted shelf.
- **Preferences:** the sort, like the theme and the Catalog view, lives in browser `localStorage`, wrapped in try/catch, defaulting to Author. A restore neither brings nor replaces it. Browser storage is otherwise banned for library data.
- **Data layer:** view queries are keyed `['view', name, params]`. No optimistic updates. All views refetch after any intent and on window focus, so sort and filter must be re-applied to fresh data, not stored as a derived copy.
- **Tests:** Playwright e2e drives the UI only by exact accessible names (no `data-testid`). Seeded states use the `LibraryBuilder` fixture.

## UX & Interaction Patterns

- **Catalog layout:** `h1` "Catalog". Toolbar row 1: Search titles, Sort select, Bookcase · List toggle, **New book** at the right. Row 2: filter chips, then "Clear filters" when any filter is on. Then the library meter, the collapsed "How long until…?" link, then the bookcase or list.
- **Sort select:** native `select` styled as a Text field, label "Sort" to its left in `body-sm`/`ink-secondary`. Options: Author · Title · Date added · Pages.
- **Filter chips:** chip toggle buttons with `aria-pressed`, in labeled groups. A selected chip has an `accent-soft` fill, a 2px `accent` border and a leading check glyph. Color is never the only indicator. **Language ▾** and **Tag ▾** open a small `surface` list of checkboxes. With values selected, the chip reads "Language: 2". "Clear filters" is a `link` at the row end.
- **Announcements:** the page's one polite `status` region reads "N books match." after a filter change. It is emptied first and set after about 100 ms, so a repeated message is announced again.
- **No matches:** the shelf area shows "No books match these filters." with a "Clear filters" link.
- **Keyboard:** the bookcase is one Tab stop with roving `tabindex`. Left and Right follow sort order across rows; Up and Down go to the nearest spine by horizontal center; Home and End go to the ends. If the focused spine is filtered out, focus moves to its nearest remaining neighbor in sort order, or to Search titles when none remain.
- **Tone:** no exclamation marks and no red failure states.

## Cross-Story Dependencies

- Story 7.2 builds on Story 7.1's sorted list: filtering hides Books from the sorted order, and the focus fallback uses that order.
- Both stories extend the Catalog toolbar, Search titles, the List view toggle, the bookcase keyboard model and add-book highlighting from Epic 1. They share the Catalog layout with Epic 6's collapsed calculator link.
- Read / Unread comes from the finished state the server derives (Epics 3–4). Type, Language and Tags are Book fields from Epic 1, read from the catalog view.
- Home's slice (Epic 3, `lib/slice.ts`) must read the remembered sort.
