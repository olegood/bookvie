# Epic 5 Context: Keep what a book gave you

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let the user keep quotes and thoughts from any Book as Card notes, each tied to a page or page range, and find them again later. Notes can be added from Home without losing sight of the reading, edited or deleted from Book detail or the Card notes page, searched across all Books or within one, and reviewed one at a time as a pile. Done means: CRD-API-001 (card note CRUD, text and page required, page or range in bounds, low to high, one page or one range) is green, and the per-epic quality gates pass (P0 100%, P1 at least 95%, every error code API-tested, `check:api` clean, coverage at least 90% on `domain/` and at least 80% on `intents/` + `store/`). The epic also re-runs export then restore with full data (Card notes, a paused Reading, Up next, Side reads) and requires byte-identical results. With Story 1.11 it closes risk R-09 (edit consequences such as Pages below the highest Card note page).

## Stories

- Story 5.1: Add a card note while reading
- Story 5.2: Edit or delete a card note
- Story 5.3: Find a note across all my books
- Story 5.4: Go through a book's notes as a pile

## Requirements & Constraints

- **Card note:** on any Book, at any time. Both Note and Page are required. The page shows as "p.42" or "pp.42–45". Stored as `{ id, text, pageStart, pageEnd|null, createdAt }`.
- **Page parsing is on the server:** accepts "42", "42–45", "42-45", "42 – 45", with or without "p." / "pp.". "42–42" is stored as 42 with `pageEnd: null` (`pageEnd` is never equal to `pageStart`, and `pageStart ≤ pageEnd`). Field-error copy, with the Book's real page count: "Page is required.", "Page must be between 1 and N.", "The first page must come before the last.", "Use one page or one range.", and "Note is required." for empty or whitespace-only text.
- **Pages floor:** editing Pages below the highest Card note page is refused ("Pages can't be less than 270, where a card note is."). A range counts by `pageEnd`, else `pageStart`. Deleting the highest note lowers the floor.
- **Search:** case-insensitive substring match on note text, updating while typing. All-Books search keeps results grouped by Book with the title. A scoped view searches only that Book. The pile has no search.
- **Pile:** Page order or Shuffled, Next/Previous with no wrap, opens at a specific note from a page ref or a search result. Read-only.
- **Scale:** about 500 Books and a few thousand Card notes, held in memory.
- **Standard intent ACs** apply to `add-card-note`, `edit-card-note` and `delete-card-note`: a write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`; `check_invariants()` holds after every success; a deleted Book is refused with 409 `book_not_found`; every new error code gets an API test; test states are seeded with `LibraryBuilder`.
- **Couldn't save:** the panel or Confirm dialog stays open with every value kept and shows "Couldn't save. Your data wasn't changed." in an `alert` line inside it, above its buttons. Nothing changes.

## Technical Decisions

- **Document shape:** Card notes live nested in their Book's `cardNotes[]`, never top-level. Note ids are server-minted UUIDs, unique within the Book. Invariants enforce unique note ids and note pages within the Book's page count. Deleting a Book removes its notes.
- **Intents and views:** one intent per action under `/api/intents/<kebab-verb>` (`add-card-note`, `edit-card-note`, `delete-card-note`) in `intents/*_card_note`. The Card notes page reads a `views/card_notes` view under `GET /api/views/<name>`. Book detail's notes come from the shelf view's book detail (`BookDetailView.cardNotes`). The server orders notes by `pageStart`, then `createdAt`. Pydantic models are the contract, and TS types are regenerated (`check:api`).
- **Responses:** success is `{ ok: true, ids? }`. `add-card-note` returns `ids.cardNoteId` (kept on purpose for agent skills and edit). Page and Note validation is 422 `invalid_fields` with `fields` listing every failing field. The server owns all message copy; the client renders it as is.
- **Client owns presentation only:** text search, highlighting, the first-three cut on Book detail, pile order and shuffle run in the client over fetched views. Shuffle takes an injectable random source so tests are deterministic.
- **No optimistic updates:** every intent response invalidates all views. Success announcements wait until the refetched views have rendered.
- **Spine drift:** where the code is right and the architecture spine lags (as already logged for 5.1), record it in `deferred-work.md` as "spine drift"; don't edit the spine during a story.

## UX & Interaction Patterns

- **Card note panel:** a small 360px modal styled as an index card, headed "Card note" or "Edit card note", with Note (multi-line, required, focused on open) and Page (required), prefilled with the current page (at least 1) or empty with no Reading. Buttons are **Save note** and **Cancel**; edit mode adds **Delete** at the left. Errors use `aria-invalid` and `aria-describedby` and are announced in `alert`. On save the user stays on the page, the "See card notes · N" count and the Book detail block update, `status` reads "Card note saved.", and focus returns to the opener (**Add card note** or the note's **Edit**).
- **Delete card note:** an `alertdialog` "Delete this card note?" with **Delete card note** and **Cancel** (Cancel focused), stacked over the Edit panel (one of only two allowed stacks). Cancel or Esc returns to the panel with focus on **Delete**. Confirming closes both; focus goes to the next note's **Edit**, else the group or block heading.
- **Entry points:** the Main book card has **Add card note** and **See card notes · N** (accessible name "See card notes, 7 notes"; just "See card notes" at 0). Book detail always has **Add card note** in its action stack. The top nav gains **Card notes** (Home · Catalog · Card notes · Backup until Stats arrives); its page `h1` is "Card notes".
- **Card notes list:** notes grouped under serif Book titles, in page order. Each note has its text, a compact chip-style page-ref `button` ("Open p.42 in the pile") that opens the pile in Page order at that note, and a separate **Edit**. A scoped view has a removable "In *X*" chip that widens to all Books. Each group has "Go through as a pile". Empty: "No card notes yet." (scoped view adds **Add card note**).
- **Search card notes:** visible label, no placeholder, `<mark>` highlights (accent-soft, weight 600, 1px accent underline). After about 500 ms `status` reads "N notes match."; no match reads "No card notes contain “query”.". Esc clears the field.
- **Book detail block "Card notes (N)":** the first three notes in page order in a grid, each with its text, the page ref in meta / ink-tertiary, and **Edit**; a search that shows every match in place; then "Go through as a pile" and "See all card notes" (scoped Card notes page). With no notes: "No card notes yet.", no search, no links. Open question: a line clamp or max height for long notes in the block's cards, to be decided with 5.3/5.4.
- **Pile:** a modal named "Card notes pile, *X*" on the `page` background over the scrim. One note in `pile-text` with a faint stacked edge, **Close** at top right, Previous · "N of M" · Next, and an "Order" radio group (Page order · Shuffled, reshuffled once per change; "N of M" follows the current order). A polite live region announces "Note 3 of 7, p.42: *text*.". At either end the button stays focusable with `aria-disabled="true"`; a one-note pile disables both. Close or Esc returns to the list scrolled to the last viewed note, focusing its **Edit**; on Book detail, that note's **Edit** if shown, else "Go through as a pile". Reduced motion makes the return scroll instant.

## Cross-Story Dependencies

- **5.1** (done) added the panel, server parsing, `add-card-note`, and the Book detail block that 5.2 to 5.4 build on. The `CardNote` model, the note invariants and the Pages-below refusal date from Story 1.11.
- **5.2** reuses 5.1's panel, parsing and validation, and relies on Story 1.11's Pages-below rule for the lowered floor.
- **5.3** adds the Card notes page and `views/card_notes`, the scoped view, both searches, the nav item, the Main book card's count link and "See all card notes". **5.4** needs 5.3's lists and search results as pile entry points, and carries the full-data export and restore re-run (Epic 2's BKP-API-001), seeded with Epic 4 states.
