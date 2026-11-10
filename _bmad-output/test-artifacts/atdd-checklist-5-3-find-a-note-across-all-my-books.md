---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-10'
storyId: '5.3'
storyKey: '5-3-find-a-note-across-all-my-books'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-53-find-a-note-across-all-my-books'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-3-find-a-note-across-all-my-books.md'
generatedTestFiles:
  - 'backend/tests/test_card_notes_view.py'
  - 'frontend/e2e/card-notes.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 5 intro and gate; Story 5.3; Stories 5.2 and 5.4 for scope)'
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 server selections, client search; AD-9 404 book_not_found from a view; Naming: views are nouns under GET /api/views/<name>; Capability map FR-17 to FR-19 → views/card_notes)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Top nav; Main book card; Search field; Card notes list; Book detail → Card notes block; Search, no matches; No Card notes; Live regions; Structure)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Top nav; Search field; Card notes list: <mark> accent-soft, weight 600, 1px accent underline; scope chip; Book title small for groups)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CRD-E2E-002)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (5-2 done; 5-3 backlog)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (5.1 spine drift entry; the block clamp deferred to 5.3/5.4)'
  - '_bmad-output/implementation-artifacts/spec-5-2-edit-or-delete-a-card-note.md (useCardNoteEditFlow notes must be the cache''s own array)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-2-edit-or-delete-a-card-note.md (format and conventions)'
  - 'backend/bookvie/views/models.py (BookCardNote, HomeMainBook), views/shelf.py (book_detail order), domain/ordering.py (title_key), http/api.py (view routes)'
  - 'backend/tests/builder.py (card_note), helpers.py (api_client, library_bytes), test_contract.py, test_edit_book.py (views/book 404)'
  - 'frontend/src/main.tsx (routes), components/AppShell.tsx (nav), components/MainBookCard.tsx, pages/BookDetailPage.tsx (CardNotesBlock), pages/SearchTitles.tsx, lib/cardNotes.ts, lib/catalog.ts (matchCountCopy)'
  - 'frontend/e2e/edit-card-note.spec.ts, catalog-list.spec.ts (status recorder), app-shell.spec.ts, fixtures.ts, home.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the top nav, when Epic 5 ships, then a Card notes item is added in its place in the order (Home · Catalog · Card notes · Backup until Stats arrives), leading to a page whose h1 is "Card notes"' }
  - { id: AC-2, idSource: generated, text: 'Given the Card notes page unscoped, when it renders, then the card notes view lists every note grouped under its Book''s serif title, in page order within each Book, each note with its page ref and Edit; and with no notes at all it reads "No card notes yet." (UX-DR48)' }
  - { id: AC-3, idSource: generated, text: 'Given Search card notes (visible label, no placeholder), when I type, then only notes containing the text, ignoring case, remain, still grouped by Book with the Book title shown; matches are wrapped in <mark> (accent-soft, weight 600, 1px accent underline); and after about 500 ms the status region reads "N notes match." (FR-19); and with no matches it reads "No card notes contain “query”.", and Esc clears the field' }
  - { id: AC-4, idSource: generated, text: 'Given the Main book card, when it renders, then it shows See card notes · 7 (accessible name "See card notes, 7 notes") when the Book has Card notes, or just See card notes when it has none, and either opens the Card notes page scoped to that Book; and Book detail''s block adds the link "See all card notes", which opens the same scoped view' }
  - { id: AC-5, idSource: generated, text: 'Given the scoped view, when it renders, then it shows only that Book''s notes with a removable "In X" scope chip, its search covers that Book only, and clearing the chip widens to all Books; and with no notes it shows "No card notes yet." with Add card note' }
  - { id: AC-6, idSource: generated, text: 'Given Book detail''s Card notes block, when I type in its Search card notes field, then the block shows every matching note of that Book (not only three) with matches highlighted, and "No card notes contain “query”." when none match, and Esc clears it; and the field is absent when the Book has no notes' }
---

# ATDD Checklist - Epic 5, Story 5.3: Find a note across all my books

**Date:** 2026-11-10
**Author:** Oleg
**Primary test levels:** E2E (Playwright against the real `bookvie`) and API (pytest: the app through `TestClient`)

---

## Story Summary

As Oleg, I want one page with all my Card notes and a quick search, so that I can find where in which Book a thought was written.

5.1 and 5.2 shipped the three card-note intents, the Card note panel (add and edit modes) and Book detail's "Card notes (N)" block, which shows the first three notes with an Edit on each. There is no Card notes page, no search, and no way to reach a Book's other notes.

**What 5.3 adds:**
- **The `card-notes` view:** `GET /api/views/card-notes`, optionally `?book=<id>`. It returns every note grouped by Book, or one Book's.
- **The Card notes page** at `/card-notes` (scoped: `/card-notes?book=<id>`), with `h1` "Card notes" and a **Card notes** item in the top nav.
- **Search card notes** on that page and in Book detail's block: a client-side, case-insensitive substring match with `<mark>` highlights and "N notes match.".
- **The scope chip** "In *X*", which widens to all Books when removed, and the scoped empty state with **Add card note**.
- **The Main book card's "See card notes · N"** link (with a new `cardNoteCount` on the home view), and Book detail's **See all card notes** link.

**Not in 5.3:**
- the pile, "Go through as a pile", page refs as buttons ("Open p.42 in the pile"), and opening a search result in the pile (all 5.4). In 5.3 a page ref is plain text, and a search result opens nothing.

**Story source:** `epics.md` → Story 5.3. There is no spec file yet: `sprint-status.yaml` has `5-3-find-a-note-across-all-my-books: backlog`.
- When `spec-5-3-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** 5.3 is neither the epic's first story nor its last. 5.2 is `done`, so the pipeline continues with `bmad-build-auto`.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 5.2.

**Generation mode:** AI generation from the criteria, the UX docs and the code. Nothing was recorded in a browser, because the page, the fields and the links don't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins. The one exception is the scope chip's remove button, matched as `/^Remove\b/` (see the assumptions below).

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run was **sequential** with one author, as in Stories 1.6 to 5.2, so the seeds stay consistent across both halves.

### Decisions taken with Oleg (2026-11-10)

- **Group order is title A→Z, decided on the server:** `title_key`, then Book id, the same tie-breaks as Waiting for you. Only Books with notes get a group. The client renders the groups in the order the view gives them.
- **The scope is applied on the server.** The route is `/card-notes?book=<id>`. `GET /api/views/card-notes?book=<id>` returns `scope: {bookId, title}` and only that Book's group, or no groups when the Book has no notes. An unknown id gets 404 `book_not_found` (kind `refusal`), as `views/book` does. This follows AD-6, where the server owns selections.

### Before the leaves: what today's code already does

- **The note order already exists.** `views/shelf.book_detail` sorts by `(page_start, created_at)`. The new view should share that key, not copy it.
- **`BookCardNote`** (`id`, `text`, `pageStart`, `pageEnd`, `createdAt`) is the note shape to reuse in the groups.
- **`SearchTitles`** hard-codes its label. Generalize it (label prop) or add a sibling for "Search card notes". Its Esc-clears rule is the same.
- **`matchCountCopy`** in `lib/catalog.ts` is the pattern for "N notes match." ("1 note matches." for one, by the same rule). The ~500 ms debounce and the single announcement are already proven for Catalog.
- **`HomeMainBook` has no note count.** The card's "See card notes · N" needs a new `cardNoteCount: int`.
- **`useCardNoteEditFlow`** needs `notes` to be the cache's own array (5.2 review). The Card notes page passes a filtered or grouped list, so focus resolution after a save or a delete must be checked there (follow-up below).

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | The nav reads Home · Catalog · Card notes · Backup; Card notes leads to `h1` "Card notes" | E2E | P1 | `[P1] AC-1` |
| AC-2 | Unscoped, every note grouped by Book title (A→Z), in page order; with no notes, no groups | API | P0 | `test_ac2_p0_…` |
| AC-3 | Search card notes: case-insensitive, grouped, `<mark>`, "N notes match.", no-match copy, Esc | E2E | P0 | `[P0] AC-3` |
| AC-4 | "See card notes · 7" ("See card notes, 7 notes") and "See all card notes" open the scoped view | E2E | P1 | `[P1] AC-4` |
| AC-5 | Scoped: "In *X*" chip, search covers that Book only, clearing widens, empty with Add card note | E2E | P1 | `[P1] AC-5` |
| AC-6 | Book detail's block search shows every match (not only three), and is absent without notes | E2E | P1 | `[P1] AC-6` |

**Priorities:**
- **P0:**
  - AC-2 is the view every other leaf reads, and its group and note order is a server decision (AD-6) that nothing else proves.
  - AC-3 is FR-19's core: finding a note. It carries CRD-E2E-002.
- **P1:**
  - AC-1, AC-4 and AC-5 are entry points and scope. Each is a navigation or a selection, and each is cheap to get right.
  - AC-6 is the in-place search on Book detail. It reuses AC-3's matching, so its new risk is the first-three cut.

**Level split (no duplicate coverage):**
- **API** proves what only the server decides:
  - which Books get a group;
  - the group order (`title_key`, then id);
  - the note order (`pageStart`, then `createdAt`);
  - the scope and its 404;
  - the home view's `cardNoteCount`;
  - OpenAPI.
- **E2E** proves:
  - the nav, the routes, and focus on the `h1`;
  - the matching, the highlights, and the debounced announcement;
  - the chip and its removal;
  - the links and their accessible names;
  - the block's search and its first-three cut.

**Secondary branches (green-phase follow-ups, not separate red leaves):**
- AC-2's rendering: serif group titles, page refs, each note's Edit, and "No card notes yet.";
- the scoped view at API level, and its 404;
- `cardNoteCount`;
- Edit from the Card notes page;
- axe.

The full list is under "Green-phase follow-ups" below.

---

## Story Integration Metadata

- **Story ID:** `5.3`
- **Story Key:** `5-3-find-a-note-across-all-my-books`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 5.3)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-5-3-find-a-note-across-all-my-books.md`
- **Generated Test Files:** `backend/tests/test_card_notes_view.py`, `frontend/e2e/card-notes.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **The backend leaf** has `@pytest.mark.skip(reason=RED)`, and its name carries `ac2_p0`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 6 fail on their first assertion, as listed below. Every setup step ran cleanly first: the `LibraryBuilder` seed and the e2e seeds and server starts.

**Skipped as committed:**
- `pytest tests/test_card_notes_view.py` gives 1 skipped.
- `playwright test e2e/card-notes.spec.ts` gives 5 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `oxlint` and `tsc -b` pass.

### API Test (1 test): `backend/tests/test_card_notes_view.py`

**`[P0] AC-2`: `test_ac2_p0_card_notes_view_groups_every_note_by_book_title_in_page_order`** (line 39)

**Seed** (library order): Neuromancer (p.3), Emma (p.368), Émile (p.37), Dune and Good Omens.
- **Dune** has five notes, stored out of page order: p.300, p.96 (later `createdAt`), pp.42–45, p.96 (earlier `createdAt`) and p.12.
- **Good Omens** has no notes.

1. **`GET /api/views/card-notes` answers 200** (the first assertion).
2. The group titles are `["Dune", "Émile", "Emma", "Neuromancer"]`, and the group `bookId`s match. `title_key` puts Émile before Emma. Good Omens has no group.
3. `scope` is `null`.
4. Dune's note ids are in page order: p.12, pp.42–45, p.96 (earlier), p.96 (later), p.300. The range note keeps `pageEnd: 45`. A single page has `pageEnd: null`.
5. The file is byte-identical.
6. An empty library gives exactly `{"scope": null, "groups": []}`.

*Red today: `assert 404 == 200`. There is no route.*

### E2E Tests (5 tests): `frontend/e2e/card-notes.spec.ts`

**Seed** (the spec's own, plus `DUNE`, `LEFT_HAND` and `mainAt` from `e2e/home.ts`). `LIBRARY` holds seven notes in three Books, plus Emma with none:
- **Dune:** p.12 "Fear is the mind-killer.", pp.42–45 "A beginning is …", p.96 "The spice must flow.", and p.300 "The mystery of life …".
- **The Left Hand of Darkness:** p.42 "Light is the left hand of darkness." and p.151 "On the Ice, …".
- **Neuromancer:** p.3 "The sky above the port …".

**`[P1] AC-1` the nav item** (line 102)
1. **The nav's links read Home, Catalog, Card notes, Backup** (the first assertion).
2. Click **Card notes** → the URL is `/card-notes`. The `h1` "Card notes" has focus, the title is "Card notes — bookvie", and the item has `aria-current="page"`.

*Red today: the nav has three links.*

**`[P0] AC-3` Search card notes** (line 122)
1. **The `searchbox` "Search card notes" is visible** (the first assertion). It has no `placeholder`, its visible label shows, and the page lists 7 notes.
2. Type "ICE" key by key. 2 notes remain, and the group headings read Dune, The Left Hand of Darkness. Neuromancer is gone.
3. The `<mark>`s read "ice" and "Ice", each as written in its note, with weight 600.
4. `status` reads "2 notes match.", and that is the only text it announced.
5. "zzz" → "No card notes contain “zzz”." and no notes.
6. Esc → the field is empty, and all 7 notes and 3 groups are back.

*Red today: `/card-notes` is the not-found page.*

**`[P1] AC-4` the links to the scoped view** (line 164)
1. **The Main book card has a `link` named "See card notes, 7 notes"** (the first assertion). Its text is "See card notes · 7".
2. Click → `/card-notes?book=<Left Hand id>`. The chip reads "In The Left Hand of Darkness", and the page shows one group with 7 notes.
3. Dune's Book detail → **See all card notes** in the block → `/card-notes?book=<Dune id>`. The chip reads "In Dune", and the page shows one group with 4 notes.
4. A Main book with no notes has a link named exactly "See card notes". It leads to the same scoped route.

*Red today: the card has no such link.*

**`[P1] AC-5` the scoped view** (line 201)
1. **`/card-notes?book=<Dune id>` shows "In Dune"** (the first assertion). The `h1` is still "Card notes", and the page shows one group, Dune, with 4 notes.
2. Search "the" → 4 notes, and `status` reads "4 notes match.". Three notes from other Books also contain "the", and they stay out. Esc clears.
3. The chip's **Remove** button → the URL is `/card-notes`, the chip is gone, and all 3 groups and 7 notes show.
4. `/card-notes?book=<Emma id>` → "In Emma", "No card notes yet.", and **Add card note**. There are no notes.

*Red today: the not-found page.*

**`[P1] AC-6` Book detail's search** (line 239)
1. **The block "Card notes (4)" holds the `searchbox` "Search card notes"** (the first assertion). The block shows 3 notes.
2. Type "the" → all 4 notes show, p.300 included (outside the first three). There are 4 `<mark>`s, and `status` reads "4 notes match.".
3. "zzz" → "No card notes contain “zzz”." inside the block, with no notes.
4. Esc → the field is empty, and the block is back to 3 notes.
5. Emma's Book detail → the block "Card notes" reads "No card notes yet.", with no search field.

*Red today: the block has no search field.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials. The ids are fixed literals where a test navigates by them.

## Fixtures and Helpers Created or Changed

- **None changed.**
- **The status recorder** (`recordStatus`) copies the MutationObserver from `catalog-list.spec.ts`. If a third spec needs it, move it into a shared e2e helper.
- **`CARD_NOTES_VIEW`** is local to the backend file. Move it to `tests/helpers.py` if the follow-ups put view tests in other files.

## Mock Requirements

None. Every leaf runs against the real server. The pause before the announcement is the real debounce; the recorder proves there is exactly one announcement.

## Required data-testid Attributes

None. Every locator is a role plus an accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The view** `GET /api/views/card-notes` (`views/card_notes.py`, models in `views/models.py`):
- **The response** is `CardNotesView`: `{ "scope": CardNotesScope | null, "groups": [CardNotesGroup] }`.
  - `CardNotesScope` is `{ "bookId", "title" }`.
  - `CardNotesGroup` is `{ "bookId", "title", "notes": [BookCardNote] }`.
- **Unscoped:** one group per Book that has notes. The groups go by `title_key(title)`, then Book id. The notes go by `pageStart`, then `createdAt`, the same key as `book_detail`.
- **Scoped** (`?book=<id>`): `scope` is set, and `groups` holds only that Book's group, or is empty when the Book has no notes. An unknown id is 404 `book_not_found` (kind `refusal`), as on `views/book`.
- **It is a read:** nothing is written.
- **OpenAPI** documents the 404 with `ErrorResponse`. As a view it carries the envelope's 409, 422, 500 and 503 like the other views, and no 413. Then run `npm --prefix frontend run api:gen`.

**The home view:** `HomeMainBook.cardNoteCount: int`, the number of the Main book's Card notes.

**The page** `/card-notes`, scoped `/card-notes?book=<id>`:
- **`h1` "Card notes"**, and the title "Card notes — bookvie". Focus goes to the `h1` after navigating, as on every route.
- **The nav:** a **Card notes** `link` between Catalog and Backup, with `aria-current="page"` on its page.
- **Groups:** each group has an `h2` with the Book's title (serif, `book-title-sm`), then its notes as `listitem`s. Each note has its text, its page ref as text ("p.42", "pp.42–45"), and an Edit `button` whose name starts with "Edit" ("Edit p.42", as on Book detail).
- **Only notes are `listitem`s** inside `main`, so the chip and the other controls are not list items.
- **Empty:** "No card notes yet.". The scoped view adds an **Add card note** `button`.
- **The scope chip:** its text is "In *X*" (the title may be in `<em>`; the text content is "In Dune"). It has a remove `button` whose name starts with "Remove". Removing it navigates to `/card-notes`.

**Search card notes** (the page and Book detail's block):
- **The field** is a `searchbox` named by its visible label "Search card notes", with no `placeholder`. Esc in a non-empty field clears it.
- **The match** is a case-insensitive substring on the note text only, done on the client (AD-6). On the page, groups without a match are hidden. In the block, while the field holds text, every matching note shows, not only three.
- **Highlights:** matches go in `<mark>`, with the text as written in the note, weight 600, the `accent-soft` background and a 1px `accent` underline.
- **`status`:** about 500 ms after typing pauses, it reads "N notes match.", announced once ("1 note matches." for one, as Catalog does).
- **No matches:** "No card notes contain “query”." with curly quotes, on the page or inside the block.
- **In the block,** the field shows only when the Book has notes.

**The links:**
- **The Main book card:** a `link` (not a button) in its action stack. It reads "See card notes · N" with the accessible name "See card notes, N notes", or just "See card notes" at 0. It goes to `/card-notes?book=<Main book id>`.
- **Book detail's block:** a `link` "See all card notes", shown only when the Book has notes. It goes to `/card-notes?book=<id>`.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/e2e/app-shell.spec.ts` | `[P0] AC-2` (line 115) expects nav links `['Home', 'Catalog', 'Backup']`, and that "Card notes" is absent. It becomes `['Home', 'Catalog', 'Card notes', 'Backup']`, and only Stats is absent. `[P1] AC-4` (line 218) loops over the routes: add `/card-notes`. |
| `backend/tests/test_contract.py` | Add `("get", "/api/views/card-notes")` to the envelope `operations` and the coverless list. |
| `backend/tests/test_views.py`, `test_home_view.py` | Home view snapshots gain `cardNoteCount` on `mainBook`. |
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen`. |
| `frontend/e2e/edit-card-note.spec.ts`, `add-card-note.spec.ts` | The block gains a searchbox and a link. Re-run them: the list-item counts and the Tab-cycle leaf (`:548`) may move. |

## Assumptions for the spec to confirm

- **The chip's remove button is named "Remove In *X*"** (recommended, e.g. "Remove In Dune"). The scaffold matches `/^Remove\b/` inside `main`.
- **The Main book card's count link is a `link`**, because it navigates. DESIGN.md draws it as a `button-secondary` in the stack, which is only styling.
- **"1 note matches."** is the singular, by Catalog's rule. The scaffolds assert only plural counts.
- **The search matches note text only,** not the Book title or the page ref. The criterion says "notes containing the text".
- **On Book detail, `status` uses the same "N notes match."** after the same pause. EXPERIENCE.md → Card notes block says so.
- **The `h2` group headings** are the only level-2 headings in `main` on the Card notes page. If the page adds another `h2`, `groupHeadings` must be scoped.
- **The search field and the chip survive a refetch.** The search lives in the page's state, not the URL.
- **A scoped search's `status` reads the scoped count.**

## Open items that bear on this story

- **CRD-E2E-002** ("Card notes search: across Books / scoped, grouped, highlighted, open in pile") is complete except "open in pile", which is 5.4. Tick the first four parts in the trace.
- **The block's long-note clamp** (deferred from 5.1 "with 5.3/5.4") is still open. 5.3's page shows the full text, so decide the block's clamp in this story's spec, or move the deferral explicitly to 5.4.
- **Spine drift to expect:**
  - the Capability map's FR-17 to FR-19 row names `views/card_notes`, which now exists, but AD-6 lists neither the group order nor the scope as server selections;
  - AD-9 doesn't list `views/card-notes` with `views/book` as a view that answers 404 `book_not_found`;
  - `HomeMainBook.cardNoteCount` isn't named in the spine.

  Defer each as "spine drift" in the story, as AGENTS.md says.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_card_notes_view.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/card-notes.spec.ts -g "AC-3"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-2: the view
- [x] `views/models.py`: `CardNotesScope`, `CardNotesGroup`, `CardNotesView` (reuse `BookCardNote`). (done: backend/bookvie/views/models.py; backend/tests/test_card_notes_view.py:170 (schemas))
- [x] `views/card_notes.py`: `card_notes(library, book_id: str | None) -> CardNotesView | None` (`None` for an unknown id). Share the note sort key with `book_detail`. Order the groups by `title_key`, then id. (done: backend/tests/test_card_notes_view.py:32 and :96 (title key, then Book id))
- [x] `http/api.py`: `GET /views/card-notes` with an optional `book` query, returning 404 `book_not_found` for an unknown id. Export it from `views/__init__.py`, then run `npm --prefix frontend run api:gen`. (done: backend/tests/test_card_notes_view.py:154 (404), :170 (OpenAPI); `check:api` byte-compares schema.d.ts)
- [x] Update `test_contract.py` (table above). (done: backend/tests/test_contract.py:337, :370)
- [x] Activate AC-2. (done: backend/tests/test_card_notes_view.py:32)

### AC-1: the page and the nav
- [x] `api/views.ts`: `useCardNotesView(bookId?)`. (done: frontend/e2e/card-notes.spec.ts:102)
- [x] `pages/CardNotesPage.tsx` at `/card-notes` in `main.tsx`, with `usePageTitle('Card notes')` and `h1` "Card notes". (done: frontend/e2e/card-notes.spec.ts:102; app-shell.spec.ts:222)
- [x] `AppShell.tsx`: a **Card notes** `NavLink` between Catalog and Backup. (done: frontend/e2e/app-shell.spec.ts:115)
- [x] Update `app-shell.spec.ts` (table above). (done: frontend/e2e/app-shell.spec.ts:122, :222)
- [x] Activate AC-1. (done: frontend/e2e/card-notes.spec.ts:102)

### AC-3: Search card notes
- [x] The field: a label prop on `SearchTitles`, or a shared search field component. (done: frontend/e2e/card-notes.spec.ts:122 (label prop on SearchTitles))
- [x] `lib/cardNotes.ts`: `noteMatches(text, query)` (case-insensitive substring) and a highlight splitter that keeps the note's own casing; `notesMatchCopy(n)`; `NO_NOTES_MATCH(query)`. Add unit tests in `cardNotes.test.ts`. (done: frontend/src/lib/cardNotes.test.ts:97, :115, :155)
- [x] The groups render `<mark>` (accent-soft, weight 600, 1px accent underline) and hide groups without a match. The ~500 ms debounced `status`, as Catalog does. (done: frontend/e2e/card-notes.spec.ts:122, :638, :677)
- [x] Activate AC-3. (done: frontend/e2e/card-notes.spec.ts:122)

### AC-4: the links
- [x] `views/models.py` and `views/shelf.py`: `HomeMainBook.card_note_count`. (done: backend/tests/test_home_view.py:56, :77)
- [x] `MainBookCard.tsx`: the "See card notes · N" `link` with the name "See card notes, N notes" ("See card notes" at 0), to `/card-notes?book=<id>`. (done: frontend/e2e/card-notes.spec.ts:168, :426)
- [x] `BookDetailPage.tsx` (`CardNotesBlock`): the "See all card notes" `link`, only when there are notes. (done: frontend/e2e/card-notes.spec.ts:168, :243)
- [x] Activate AC-4. (done: frontend/e2e/card-notes.spec.ts:168)

### AC-5: the scope
- [x] `CardNotesPage` reads `?book=`, renders the "In *X*" chip with a **Remove In *X*** button that navigates to `/card-notes`, and handles the empty scoped view with **Add card note** (`useCardNoteFlow` with that Book's id). (done: frontend/e2e/card-notes.spec.ts:205, :449)
- [x] An unknown `?book=` id gets the not-found page, or an unscoped fallback. Decide this in the spec. (done: the spec decided the not-found page; frontend/e2e/card-notes.spec.ts:513, and an empty `?book=` is unscoped at :520)
- [x] Activate AC-5. (done: frontend/e2e/card-notes.spec.ts:205)

### AC-6: the block's search
- [x] `CardNotesBlock`: a Search card notes field when there are notes. While it holds text, show every match (not the first three) with `<mark>`, or the no-match line, and the same `status` count. (done: frontend/e2e/card-notes.spec.ts:243)
- [x] Activate AC-6. (done: frontend/e2e/card-notes.spec.ts:243)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-2, the page's rendering:** the group titles in serif (`book-title-sm`), each note with its page ref ("pp.42–45") and its Edit, and the notes in page order on screen. An empty library reads "No card notes yet." with no groups and no **Add card note**. (done: frontend/e2e/card-notes.spec.ts:308)
- [x] **AC-2, Edit from the Card notes page:** it opens the Edit card note panel (5.2) prefilled. After a save, focus returns to that note's Edit and `status` reads "Card note saved.". After a delete, focus goes to the next note's Edit in the group, else the group heading, else the `h1`. Check `useCardNoteEditFlow`'s reference-identity rule against the page's grouped and filtered list (5.2 review). (done: frontend/e2e/card-notes.spec.ts:349, :481)
- [x] **AC-2, the scoped view at API level:** `?book=<id>` gives `scope` and one group. A Book with no notes gives `scope` and `groups: []`. An unknown id gets 404 `book_not_found`, and nothing is written. (done: backend/tests/test_card_notes_view.py:115, :138, :154)
- [x] **AC-2, OpenAPI:** `/api/views/card-notes` documents the `book` query and the 404, and `CardNotesView` is in the schemas. (done: backend/tests/test_card_notes_view.py:170)
- [x] **AC-3, the mark style:** `accent-soft` background and the 1px `accent` underline, in both themes. Forced colors keep the mark visible. (done: frontend/e2e/card-notes.spec.ts:122 (light), :638 (dark), :677 (forced colors))
- [x] **AC-3, edge text:** a query with regex characters ("p.4(") matches literally. A query of spaces only filters nothing. A match spanning two marks in one note highlights both. "1 note matches." for one. (done: frontend/src/lib/cardNotes.test.ts:103, :108, :116, :155; frontend/e2e/card-notes.spec.ts:408, :710)
- [x] **AC-3, edit while searching:** an edit that stops a note matching removes it from the results, and focus has a target. (done: frontend/e2e/card-notes.spec.ts:386)
- [x] **AC-4, `cardNoteCount`** on the home view: 0, and N after an add or a delete. The link's count updates after **Add card note** on Home, without a reload. (done: backend/tests/test_home_view.py:56, :77; frontend/e2e/card-notes.spec.ts:426)
- [x] **AC-4, "1 note":** the accessible name for one note is "See card notes, 1 note". (done: frontend/e2e/card-notes.spec.ts:426)
- [x] **AC-5, an unknown or deleted Book in `?book=`:** the page behaves as the spec decides. (done: frontend/e2e/card-notes.spec.ts:513 (a deleted Book gets the same 404 from the same view))
- [x] **AC-5, Add card note on the empty scoped view:** it opens the Card note panel for that Book. After a save, the note shows in the scoped list, and focus is on its Edit or as the spec says. (done: frontend/e2e/card-notes.spec.ts:449, :471)
- [x] **AC-6, an edit from a searched block:** the panel opens from a match beyond the first three, and focus returns to it. (done: frontend/e2e/card-notes.spec.ts:553)
- [x] **AC-1, Back and Forward** between scoped and unscoped views restore the right chip and groups. (done: frontend/e2e/card-notes.spec.ts:528)
- [x] **axe** on the Card notes page (unscoped, scoped, searching, empty) and on Book detail's searched block, in both themes. (done: frontend/e2e/card-notes.spec.ts:577)
- [x] **Timing smoke** (R-17, report only): the view on the 500-Book / 3,000-note fixture. (done: measured in this run, report only, no committed test: automation-summary.md → Validation)
