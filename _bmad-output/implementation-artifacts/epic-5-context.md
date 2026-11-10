# Epic 5 Context: Keep what a book gave you

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the user keep quotes and thoughts from any Book as Card notes, each tied to a page or page range, and find them again later. Notes can be added from Home without leaving the reading in view, edited or deleted from Book detail or the Card notes page, searched across all Books or within one, and reviewed one at a time as a pile. Done means: CRD-API-001 (card note CRUD, text required, page or range in bounds, low to high, one page or one range) is green, and the per-epic quality gates pass (P0 100%, P1 at least 95%, every error code API-tested, `check:api` clean, coverage at least 90% on `domain/` and at least 80% on `intents/` + `store/`). The epic also re-runs export then restore with full data (Card notes, a paused Reading, Up next, Side reads) and requires byte-identical results. Together with Story 1.11 it closes risk R-09 (edit consequences such as Pages below the highest Card note page).

## Stories

- Story 5.1: Add a card note while reading
- Story 5.2: Edit or delete a card note
- Story 5.3: Find a note across all my books
- Story 5.4: Go through a book's notes as a pile

## Requirements & Constraints

- **Card note:** any Book, at any time, needs non-blank text and a page or range shown as "p.42" or "pp.42–45". Stored as `{ id, text, pageStart, pageEnd|null, createdAt }`.
- **Page parsing is on the server:** accepts "42", "42–45", "42-45", "42 – 45", with or without "p." / "pp.". "42–42" is stored as 42 with `pageEnd: null`. Refusals (field errors, the Book's real page count in the copy): "Page must be between 1 and N.", "The first page must come before the last.", "Use one page or one range.", and "Note is required." for empty or whitespace-only text.
- **Pages floor:** editing Pages below the highest Card note page is refused ("Pages can't be less than 270, where a card note is."). A range counts by `pageEnd`, else `pageStart`. Deleting the highest note lowers that floor.
- **Search:** case-insensitive substring match on note text, updating while typing. All-Books search keeps results grouped by Book with the title. A scoped view searches only that Book. The pile has no search.
- **Pile:** page order or shuffled, next/previous with no wrap, opens at a specific note from a page ref or a search result. Read-only.
- **Scale:** about 500 Books and a few thousand Card notes, held in memory.
- **Standard intent ACs** apply to `add-card-note`, `edit-card-note` and `delete-card-note`. A write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`. `check_invariants()` holds after every success. A deleted Book is refused with 409 `book_not_found`. Every new error code gets an API test. Test states are seeded with `LibraryBuilder`.
- **Couldn't save:** the panel or Confirm dialog stays open with every value kept and shows "Couldn't save. Your data wasn't changed." in an `alert` line inside it, above its buttons. Nothing changes.

## Technical Decisions

- **Document shape:** Card notes live nested in their Book's `cardNotes[]`, never top-level. Note ids are server-minted UUIDs, unique within the Book. The invariants already enforce unique note ids and note pages within the Book's page count. Deleting a Book removes its notes.
- **Intents and view:** one intent per action under `/api/intents/<kebab-verb>` (`add-card-note`, `edit-card-note`, `delete-card-note`) in `intents/*_card_note`, and a `views/card_notes` view under `GET /api/views/<name>`. Pydantic models are the contract, and TS types are regenerated (`check:api`).
- **Responses:** success is `{ ok: true, ids? }`. Page and Note validation is 422 `invalid_fields` with `fields` listing every failing field. The server owns all message copy, and the client renders it as is.
- **Client owns presentation only:** text search, highlighting, pile order and shuffle run in the client over fetched views. Shuffle must take an injectable random source so tests are deterministic.
- **No optimistic updates:** every intent response invalidates all views. Success announcements wait until the refetched views have rendered.

## UX & Interaction Patterns

- **Card note panel:** a small 360px modal styled as an index card, headed "Card note" or "Edit card note", with Note (multi-line, focused on open) and Page, prefilled with the current page (at least 1) or empty with no Reading. Buttons are **Save note** and **Cancel**. Edit mode adds **Delete** at the left. Errors use `aria-invalid` and `aria-describedby` and are announced in `alert`. On save the user stays on the page, `status` reads "Card note saved.", and focus returns to the opener.
- **Delete card note:** an `alertdialog` "Delete this card note?" with **Delete card note** and **Cancel** (Cancel focused) stacks over the Edit panel. This is one of only two allowed stacks. Cancel or Esc returns to the panel on **Delete**. Confirming closes both, and focus goes to the next note's **Edit**, else the group or block heading.
- **Entry points:** the Main book card has **Add card note** and **See card notes · N** (accessible name "See card notes, 7 notes"; just "See card notes" at 0). Book detail has **Add card note** in the action stack. The top nav gains **Card notes** (Home · Catalog · Card notes · Backup until Stats arrives). Its page `h1` is "Card notes".
- **Card notes list:** notes grouped under serif Book titles, in page order. Each note has its text, a page-ref chip button ("Open p.42 in the pile") that opens the pile in Page order at that note, and a separate **Edit**. A scoped view has a removable "In *X*" chip that widens to all Books. Each group has "Go through as a pile".
- **Search card notes:** visible label, no placeholder, `<mark>` highlights (accent-soft, weight 600, 1px accent underline). After about 500 ms `status` reads "N notes match.". With no match it reads "No card notes contain “query”.". Esc clears the field.
- **Book detail block "Card notes (N)":** the first three notes in page order, in a grid, with a search that shows every match in place, then the "Go through as a pile" and "See all card notes" links. With no notes it reads "No card notes yet." and has no search or links. An empty scoped page adds **Add card note**.
- **Pile:** a modal named "Card notes pile, *X*" on the `page` background over the scrim. One note in `pile-text` with a faint stacked edge, **Close** at top right, Previous · "N of M" · Next, and an "Order" segmented radio group (Page order · Shuffled, reshuffled once per change). A polite live region announces "Note 3 of 7, p.42: *text*.". At either end the button stays focusable with `aria-disabled="true"`. Close or Esc returns to the list scrolled to the last viewed note, focusing its **Edit**. On Book detail, focus goes to that note's **Edit** if it is shown, else to "Go through as a pile". Reduced motion makes the return scroll instant.

## Cross-Story Dependencies

- **5.1** adds the data path and the Book detail block that 5.2 to 5.4 build on. The `CardNote` model, the note invariants and the `pages_below_card_note` refusal already exist from Story 1.11.
- **5.2** reuses 5.1's panel, parsing and validation, and relies on Story 1.11's Pages-below rule for the lowered floor.
- **5.3** adds the Card notes page, the scoped view, both searches and the Main book card's count link. **5.4** needs 5.3's lists and search results as pile entry points. It also carries the full-data export and restore re-run (Epic 2's BKP-API-001), which is seeded with Epic 4 states.
