---
title: 'Story 5.3: Find a note across all my books'
type: 'feature'
created: '2026-11-10'
status: 'in-review'
baseline_revision: '96b1fd44df123be1ed1ace0c20de8ec90e3ddd35'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-5-3-find-a-note-across-all-my-books.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, AD-9, Structural Seed), reconciled before the next epic: the card-notes view's selections and scope, Home's cardNoteCount, the client's highlighting, match count and first-three cut, the second view that answers 404 book_not_found, and the Seed's views/card_notes and lib/useSearchCount.ts.
    evidence: |-
      The spine-check layer of this build-auto review (7 findings). In each case the code follows the spec and the ATDD contract decided with Oleg; ARCHITECTURE-SPINE.md is out of date. Recorded in deferred-work.md under "build-auto review of spec-5-3-find-a-note-across-all-my-books".
    location: >-
      backend/bookvie/views/card_notes.py, backend/bookvie/http/api.py, frontend/src/lib/cardNotes.ts, frontend/src/lib/useSearchCount.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Card notes can be added, edited and deleted, but only the first three of a Book show (on Book detail), and there is no way to find a note across Books. FR-19, UX-DR48, UX-DR49.

**Approach:** Add a read-only `card-notes` view (all Books, or one Book with `?book=`), a Card notes page at `/card-notes` with a nav item, a client-side **Search card notes** on that page and in Book detail's block, a removable "In *X*" scope chip, and two links into the scoped view: the Main book card's "See card notes · N" and Book detail's "See all card notes". The ATDD checklist's "Contract the Scaffolds Pin" section is binding.

## Boundaries & Constraints

**Always:**
- **`GET /api/views/card-notes`** (optional query `book`) answers `CardNotesView {scope: CardNotesScope{bookId,title} | null, groups: [CardNotesGroup{bookId,title,notes:[BookCardNote]}]}`. Unscoped: one group per Book that has notes, ordered by `title_key(title)`, then Book id. Notes in a group go by `(pageStart, createdAt)`, the same key as `book_detail` (shared, not copied). Scoped: `scope` is set and `groups` holds only that Book's group, or `[]` when it has no notes. An unknown id gets 404 `book_not_found` (kind `refusal`), as `views/book` does. It never writes. OpenAPI documents the `book` query and the 404 with `ErrorResponse`.
- **`HomeMainBook.cardNoteCount: int`**: the Main book's number of notes.
- **The page** `/card-notes` (scoped `/card-notes?book=<id>`): `h1` "Card notes", title "Card notes — bookvie", focus on the `h1` after navigating, as on every route. The nav order is Home · Catalog · **Card notes** · Backup, and the item has `aria-current="page"` on the page (unscoped or scoped). Each group is an `h2` with the Book title (serif, `book-title-sm`), then its notes as `listitem`s. Each note shows its text, its page ref as plain text ("p.42", "pp.42–45", `meta`/`ink-tertiary`), and an **Edit** (`button-secondary`, named "Edit p.42") that opens the Card note panel in edit mode for that note's Book. Only notes are `listitem`s inside `main`, and the group `h2`s are the only `h2`s in `main`.
- **Empty states:** with no notes (unscoped), "No card notes yet." with no groups and no search field. Scoped to a Book with none: the chip, "No card notes yet." and an **Add card note** button that opens the Card note panel (add mode, Page prefilled with that Book's current page via `notePrefill`, else empty). After a save the refetch replaces the empty state with the new note, so the opener is gone and focus parks on `main`, as `useCardNoteFlow` already does; then `status` reads "Card note saved.". When the view answers 404 (unknown or deleted Book), the page renders `NotFoundPage`, as Book detail does.
- **The scope chip:** its text content is "In *X*" (title in `<em>`), not a `listitem`. Its remove button is named "Remove In *X*" (e.g. "Remove In Dune"). Removing it navigates (push) to `/card-notes`, and focus goes to the `h1`. Back and Forward restore the scope from the URL.
- **Search card notes** (page, and Book detail's block): a `searchbox` named by its visible label, with no placeholder; Esc in a non-empty field clears it. `SearchTitles` gains a `label` prop (default "Search titles"). The match is a case-insensitive substring of the note text only, on the trimmed query; a blank query filters nothing. Regex characters match literally. On the page, groups with no match are hidden. Every match in a note's text is wrapped in `<mark>`, keeping the note's own casing (`accent-soft` background, weight 600, 1px `accent` underline; visible in forced colors). About 500 ms after typing pauses, `status` reads "N notes match." ("1 note matches."), announced once, as Catalog does. With text and no match: "No card notes contain “query”." (trimmed query, curly quotes), on the page or inside the block, with no notes listed. The scoped page's search covers that Book only.
- **Book detail's block:** when the Book has notes, a Search card notes field sits under the heading, then the notes. While it holds text, every matching note shows (not only three), each with its Edit. Below the notes, a `link` "See all card notes" to `/card-notes?book=<id>`. With no notes: no field and no link. The heading's count stays the Book's total.
- **The Main book card:** after **Add card note** in its action stack, a `link` styled as `button-secondary`: "See card notes · N" with the accessible name "See card notes, N notes" ("See card notes, 1 note"), or "See card notes" at 0, to `/card-notes?book=<Main book id>`. The count follows the home view (it updates after an add on Home).
- **Edit from the page or from a searched block** works as in 5.2: focus is resolved by note id once the refetched view has rendered. After a save: that note's Edit if it's still shown, else its group heading (page) or the block heading (block), else the `h1`; then `status` reads "Card note saved.". After a delete: the Edit of the note now shown where it was in the same group or block, else that heading, else the `h1`. Cancel or Esc go back to the note's Edit. `useCardNoteEditFlow` is generalised to take the ids as rendered and an identity token from the cache, not a block-only first-three cut.

**Never:**
- No pile, no "Go through as a pile", no page-ref buttons ("Open p.42 in the pile"), and opening a search result does nothing (5.4).
- No server-side search, and no search in the URL. No new intent.
- No line clamp on the block's cards (moved to 5.4, see the Code Map's intake).
- No hand edits to `tokens.css`; `schema.d.ts` changes only through `api:gen`. No edits to the architecture spine: drift goes to deferred-work.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unscoped | Notes in Neuromancer, Emma, Émile, Dune; Good Omens none | groups Dune, Émile, Emma, Neuromancer; `scope: null` | — |
| Empty library | no notes | `{"scope": null, "groups": []}`; page "No card notes yet." | — |
| Scoped | `?book=<Dune>` | `scope {bookId,title:"Dune"}`, one group | — |
| Scoped, none | `?book=<Emma>` (no notes) | `scope` set, `groups: []`; page: chip, "No card notes yet.", Add card note | — |
| Unknown Book | `?book=nope` | 404 `book_not_found`; page renders NotFoundPage | file untouched |
| Search | "ICE" over 7 notes | 2 notes in 2 groups, `<mark>`s "ice"/"Ice", "2 notes match." | — |
| Literal | "p.4(" | substring match, no regex error | — |
| Blank | "   " | nothing filtered, nothing announced | — |
| No match | "zzz" | "No card notes contain “zzz”." | — |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:180` `BookCardNote` -- reuse in groups; add `CardNotesScope`, `CardNotesGroup`, `CardNotesView`; `HomeMainBook` (`:53`) gains `card_note_count: int`. Export the new models in `views/__init__.py`.
- `backend/bookvie/views/shelf.py:310-319` -- `book_detail`'s note list; extract a shared helper (e.g. `card_note_views(book) -> list[BookCardNote]`, sorted by `(page_start, created_at)`) used by `book_detail` and the new view. `_main_book` (`:95-120`) sets `card_note_count=len(book.card_notes)`. Waiting for you's `title_key` then id tie-break is the model for the group order (`:158`, `domain/ordering.title_key`).
- `backend/bookvie/views/card_notes.py` (new) -- `card_notes(library, book_id: str | None) -> CardNotesView | None` (`None` for an unknown id).
- `backend/bookvie/http/api.py:350-361` -- `book_view` is the model: add `GET /views/card-notes` with `book: str | None = None`, `responses={404: ...}`, raising `book_not_found(404)`.
- `backend/tests/test_card_notes_view.py` -- delete the `skip` and RED wording; add follow-ups: scoped view (one group, `scope`), scoped without notes, unknown id 404 `book_not_found` byte-identical, OpenAPI (`book` param, 404, `CardNotesView` in schemas), `cardNoteCount` 0 and N on the home view.
- `backend/tests/test_contract.py` (`operations` ~`:345`, coverless list ~`:362`) -- add `("get", "/api/views/card-notes")`. Any test that compares `mainBook` as a whole dict (grep `backend/tests` for `"mainBook"`: `test_views.py`, `test_home_view.py`, `test_pause.py`, `test_reentry.py`, …) gains `cardNoteCount`.
- `frontend/src/api/generated/schema.d.ts` -- regenerate (`npm --prefix frontend run api:gen`). `src/api/views.ts:87-110` -- model `cardNotesViewKey(bookId?)` under `VIEW_ROOT` (so every intent refetches it), `fetchCardNotesView` (`null` on 404) and `useCardNotesView(bookId?)` on `bookViewKey`/`fetchBookView`/`useBookView`; export the types (`CardNotesView`, `CardNotesGroup`) via `api/index.ts`.
- `frontend/src/lib/cardNotes.ts` -- add `noteMatches(text, query)`, `highlightParts(text, query): {text, mark}[]` (literal, case-insensitive, original casing), `notesMatchCopy(n)`, `noNotesMatchCopy(query)`, `seeCardNotesName(n)` / `seeCardNotesLabel(n)`, `scopeChipRemoveName(title)`; tests in `cardNotes.test.ts` (regex chars, blank, two matches in one note, singular).
- `frontend/src/lib/catalog.ts:110` `matchCountCopy`, `src/pages/CatalogPage.tsx:24,92,174-183` -- the 500 ms debounced single announcement to copy (or extract into a small shared hook, e.g. `lib/useSearchCount.ts`, used by Catalog, the page and the block; keep Catalog's behaviour).
- `frontend/src/pages/SearchTitles.tsx` -- add the `label` prop.
- `frontend/src/lib/useCardNoteFlow.tsx:84-180` `useCardNoteEditFlow` -- today keyed on `bookId` + `book.cardNotes` identity + `shownIds` (first three) + `cachedBookView`. Generalise: the caller passes the ids as rendered, a cache identity token (the view's own array/object) and a getter for the fresh one, and `open(note, bookId)`; the fallback target is per note (group heading / block heading, then `h1`/`main`). Keep 5.2's behaviour on Book detail unchanged (its tests must stay green).
- `frontend/src/lib/useCardNoteFlow.tsx:30-70` `useCardNoteFlow` -- reuse for the scoped empty view's **Add card note**.
- `frontend/src/pages/CardNotesPage.tsx` (+ `.module.css`, new) -- the page; `usePageTitle('Card notes')`, `PageHeading`, reads `?book=` with `useSearchParams`, renders `NotFoundPage` on `null`, the loading/failure states as `CatalogPage` does (`:150-170`). Notes rendered with the same `card-note` look as Book detail's block (`BookDetailPage.module.css` `.cardNote`, `.cardNoteText`, `.pageRef`), in a single column list.
- `frontend/src/main.tsx:34-38` -- route `/card-notes` before `*`. `src/components/AppShell.tsx:40-47` -- `NavLink to="/card-notes"` between Catalog and Backup.
- `frontend/src/components/MainBookCard.tsx:138-143` -- the "See card notes" `Link` after **Add card note** (style it as `button-secondary`; check `Button.module.css` for the class to reuse).
- `frontend/src/pages/BookDetailPage.tsx:99-137` `CardNotesBlock`, `:160-171`, `:309` -- search field (state in the block), matching notes, `<mark>`, no-match line, "See all card notes" link; pass the shown ids to the generalised edit flow. Update the page docblock.
- `frontend/e2e/card-notes.spec.ts` -- `test.skip(` → `test(`, drop RED wording, add the follow-ups in Tasks.
- `frontend/e2e/app-shell.spec.ts:121-126` (nav list; only Stats absent) and its routes loop (~`:218`, add `/card-notes`). Re-run `e2e/edit-card-note.spec.ts`, `add-card-note.spec.ts`, `book-detail.spec.ts`, `home*.spec.ts`; adjust only counts or locators the new field, links and card link move.
- `README.md:8` -- Status line gains what the user can now do; after `:205` add the 5.3 spec and ATDD links. Leave the story count alone.
- Deferred-work intake:
  - `deferred-work.md:612` (Book detail's Card notes block has no clamp; decide with 5.3/5.4) -- not in this story: moved to 5.4. A clamp would hide `<mark>`s that 5.3's in-block search puts past the clamp, and 5.4's pile is where a long note is read from the block; decide both together. Add a note line to the entry saying so (not `resolved:`).
  - `deferred-work.md:602`, `:615`, `:622`, `:628` (spine drift) -- not in this story: reconciled before Epic 6 (AGENTS.md).

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/views/models.py`, `card_notes.py`, `shelf.py`, `__init__.py` -- the view models, the shared note sort, `card_notes()`, `card_note_count`.
- [x] `backend/bookvie/http/api.py` -- the route with its 404.
- [x] `backend/tests/test_card_notes_view.py`, `test_contract.py`, `test_views.py`, `test_home_view.py` -- activate AC-2, add the follow-ups in the Code Map.
- [x] `frontend/src/api/*` -- `api:gen`, `useCardNotesView`, exports.
- [x] `frontend/src/lib/cardNotes.ts` (+ test) -- match, highlight and copy helpers.
- [x] `frontend/src/pages/SearchTitles.tsx`, the search-count debounce (shared or copied) -- label prop, announcement.
- [x] `frontend/src/lib/useCardNoteFlow.tsx` -- generalised edit flow.
- [x] `frontend/src/pages/CardNotesPage.tsx`, `.module.css`, `main.tsx`, `components/AppShell.tsx` -- the page, the route, the nav item.
- [x] `frontend/src/components/MainBookCard.tsx` (+ css) -- the count link.
- [x] `frontend/src/pages/BookDetailPage.tsx` (+ css) -- block search and "See all card notes".
- [x] `frontend/e2e/card-notes.spec.ts`, `app-shell.spec.ts` -- activate AC-1, AC-3..AC-6; add follow-ups: the page's rendering (serif `h2`s, page refs, Edit names, page order on screen; empty library "No card notes yet." with no field and no Add card note); Edit from the page (save focuses that note's Edit + "Card note saved."; delete focuses the next note's Edit in the group, else the group heading); an edit while searching that stops the note matching focuses the group heading; "1 note matches." and the "See card notes, 1 note" name; the count link updates after Add card note on Home without a reload; Add card note on the empty scoped view saves and the note shows; an unknown `?book=` shows "Page not found"; Back after removing the chip restores "In *X*"; an edit from a searched block beyond the first three refocuses its Edit; axe on the page (unscoped, scoped, searching, empty) and the searched block.
- [x] `README.md` -- Status line and links. `deferred-work.md:612` -- the note line.

**Acceptance Criteria:**
- Given the top nav, when any page renders, then its links read Home, Catalog, Card notes, Backup, and Card notes leads to `/card-notes` with `h1` "Card notes" focused and `aria-current="page"` on the item.
- Given notes in three Books, when the Card notes page renders, then the groups are `h2`s with the Book titles A→Z (server order), each note in page order with its page ref and an Edit named "Edit p.N"; with no notes it reads "No card notes yet.".
- Given the page, when I type "ICE" in Search card notes, then only the 2 notes containing "ice" (any case) remain under their Book titles, matches are in `<mark>` with their own casing, and `status` reads "2 notes match." once; "zzz" shows "No card notes contain “zzz”."; Esc clears the field and every note is back.
- Given the Main book has 7 notes, when Home renders, then its card has the link "See card notes · 7" named "See card notes, 7 notes" (at 0, "See card notes"), opening `/card-notes?book=<id>`; and Book detail's block's "See all card notes" opens the same scoped view.
- Given `/card-notes?book=<Dune>`, when it renders, then only Dune's group shows under the chip "In Dune", its search covers Dune only, and **Remove In Dune** goes to `/card-notes` with every group; a Book with no notes shows the chip, "No card notes yet." and **Add card note**.
- Given Book detail's block with 4 notes, when I type "the", then all 4 matching notes show with `<mark>`s and `status` reads "4 notes match."; "zzz" shows the no-match line inside the block; Esc returns to the first three; a Book with no notes has no field and no "See all card notes".

## Spec Change Log

## Review Triage Log

### 2026-11-10 — Review pass
- layers: blind-hunter, edge-case-hunter, verification-gap, intent-alignment, spine-check (none failed).
- verdicts: 35 findings — high 0, medium 0, low 26, false 9, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) AD-6's server list doesn't name the card-notes view's selections (Books with notes, `title_key` then id, the `?book=` scope) — spine drift, one grouped entry in deferred-work.md.
  - `[low]` `[defer]` (spine-check) AD-6's server list doesn't name `HomeMainBook.cardNoteCount` — spine drift, same entry.
  - `[low]` `[defer]` (spine-check) AD-6's client list doesn't name the `<mark>` highlighting, the "N notes match." count or the block's first-three cut — spine drift, same entry.
  - `[low]` `[defer]` (spine-check) AD-9 names only `views/book` as answering 404 `book_not_found` — spine drift, same entry.
  - `[low]` `[defer]` (spine-check) The Structural Seed's `views/` line lacks `card_notes` — spine drift, same entry.
  - `[low]` `[defer]` (spine-check) The Seed's `lib/` line lacks `useSearchCount.ts` — spine drift, same entry.
  - `[low]` `[patch]` (spine-check) The build's drift entry wrongly said AD-6's client list lacks Search card notes and missed the Seed lines — rewrote the entry (heading now "build-auto review of …"), naming only what the spine lacks.
  - `[false]` `[reject]` (edge-case) A stale query hidden after every note on the page is deleted re-filters when notes return — the field re-renders with `value={query}`, so the filter is visible, and Esc clears it.
  - `[low]` `[patch]` (edge-case) The search text survives a scope change (chip removal, Back/Forward) — the page body is now keyed on the `?book=` id, so a scope change remounts it with an empty search and cancels the pending count; e2e leaf added.
  - `[false]` `[reject]` (edge-case) The block's stale query after all notes are deleted — same refutation: the field shows the query again when notes return.
  - `[low]` `[reject]` (edge-case) Add card note pressed before the scoped Book's view loads opens Page empty — a local fetch that resolves within a tick of the card-notes view; the fix adds a guard or a new view field.
  - `[low]` `[patch]` (verification-gap) No test pins the scoped empty view's Page prefill — added a P1 leaf: Main book at p.88 with no notes, scoped view, Add card note, Page "88".
  - `[low]` `[patch]` (verification-gap) No test reaches the `h1` focus fallback — added a P1 leaf deleting Neuromancer's only note from the page; the `h1` takes focus.
  - `[low]` `[patch]` (verification-gap other) The scope change keeps the query — same root as the edge-case finding; fixed there.
  - `[low]` `[patch]` (blind) `styles.add` names an undefined class — removed the prop.
  - `[low]` `[reject]` (blind) Add card note before the Book view loads — same as the edge-case finding; rejected there.
  - `[low]` `[patch]` (blind) The search outlives a scope change — same root; fixed by the keyed body.
  - `[low]` `[patch]` (blind) `?book=` with no value shows Page not found — now `params.get('book') || undefined`, so it is unscoped.
  - `[low]` `[reject]` (blind) Catalog keeps its own debounce beside `useSearchCount` — the Code Map allowed "copy (or extract …)"; moving Catalog is a refactor outside the story's need.
  - `[low]` `[reject]` (blind) A note can match with no `<mark>` when lower-casing changes length ("İ"), and no NFC normalisation — rare for English notes; the fix adds a normalisation layer on both sides.
  - `[low]` `[reject]` (blind) `highlightParts` tests miss overlapping repeats and the length-change fallback — non-overlapping is a cosmetic choice; no user-visible harm.
  - `[low]` `[reject]` (blind) The spec's tasks were unticked while `in-review` — the fix edits this spec; Finalize ticks them.
  - `[low]` `[reject]` (blind) The README describes 5.3 while saying "5.1 and 5.2 done" — the spec leaves the count to bmad-code-review, as in 5.1 and 5.2.
  - `[false]` `[reject]` (blind) The Card notes page has no Add card note once a Book has notes — EXPERIENCE.md gives the list's empty scoped view Add card note only; Book detail's action stack always has it.
  - `[low]` `[reject]` (blind) Callbacks rebuilt each render, and the `latest` ref effect relies on declaration order — no user-visible harm; React runs effects in order, and the 5.2 tests pass through the refactor.
  - `[low]` `[reject]` (blind) "See card notes · 7" has the name "See card notes, 7 notes" (label-in-name) — the name is fixed by EXPERIENCE.md and the story AC; changing it changes the UX copy.
  - `[false]` `[reject]` (blind) `useOptionalBookView` leaves a phantom `['view','book','']` entry — the query is disabled, so invalidation never fetches it and nothing reads that key.
  - `[low]` `[patch]` (blind) The drift entry misses pieces — merged into the spine-check rewrite; the route, nav item and cache key family are not spine items (the Naming convention covers `views/<name>` keys).
  - `[false]` `[reject]` (intent a) sprint-status still says backlog — Finalize sets `review` in the same commit.
  - `[false]` `[reject]` (intent b) An ATDD assertion changed from 4 to 5 marks — the AC says matches are wrapped, and "A beginning is the time for taking the most delicate care." holds "the" twice; the scaffold miscounted.
  - `[low]` `[patch]` (intent c) The `<mark>` style is pinned only by weight — the AC-3 leaf now also checks a non-transparent background and a 1px underline.
  - `[false]` `[reject]` (intent d) Server selections are tested at API level only — that is the ATDD's level split; the e2e heading order reads the same view.
  - `[low]` `[reject]` (intent e) The shared debounce isn't used by Catalog — same as the blind finding.
  - `[false]` `[reject]` (intent f) Scope beyond the epic (404, cardNoteCount, focus rules, axe) — each is in the ATDD contract or the spec.
  - `[false]` `[reject]` (intent g) "Book title shown" during search is met only by the `h2`s — the group heading is the Book title shown, as the AC says ("still grouped by Book with the Book title shown").

## Design Notes

The edit flow waits for the refetch by comparing the rendered source's identity with the cache's, because the list re-renders and re-sorts. On the Card notes page the token is the `card-notes` view's own `groups` array (or the view object); on Book detail it stays `book.cardNotes`. The ids passed are the ones on screen after the search filter, so "the next note" is the next one the user can see.

The group order and the scope are server selections (AD-6); search, highlighting and the first-three cut stay on the client.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/card-notes.spec.ts e2e/app-shell.spec.ts e2e/edit-card-note.spec.ts e2e/add-card-note.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review (story work: bmad-code-review is the step that marks it `done`).

**Summary.** Story 5.3 adds the read-only `GET /api/views/card-notes` view (all Books grouped by title, or one Book with `?book=`; 404 `book_not_found` for an unknown Book) and `HomeMainBook.cardNoteCount`. On the client it adds the Card notes page at `/card-notes` with a nav item (Home · Catalog · Card notes · Backup), the removable "In *X*" scope chip, Search card notes on the page and in Book detail's block (case-insensitive, `<mark>` highlights, "N notes match." after a 500 ms pause), the Main book card's "See card notes · N" link and Book detail's "See all card notes". `useCardNoteEditFlow` is generalised so Edit works from the page and from a searched block, with focus resolved by note id after the refetch.

**Files changed.**
- `backend/bookvie/views/card_notes.py` (new), `models.py`, `shelf.py`, `__init__.py`: the view, its models, the shared note sort (`card_note_views`), `card_note_count`.
- `backend/bookvie/http/api.py`: the route and its 404.
- `backend/tests/test_card_notes_view.py`, `test_contract.py`, `test_views.py`, `test_home_view.py`: AC-2 activated, plus the scoped, scoped-empty, 404, OpenAPI and `cardNoteCount` tests.
- `frontend/src/api/generated/schema.d.ts` (`api:gen`), `api/views.ts`, `api/index.ts`: `useCardNotesView`, `useCachedCardNotesView`, `useOptionalBookView`.
- `frontend/src/lib/cardNotes.ts` (+ test): matching, highlighting and copy helpers. `lib/useSearchCount.ts` (new): the debounced count. `lib/useCardNoteFlow.tsx`: the generalised edit flow.
- `frontend/src/components/MarkedText.tsx` (+ css, new), `MainBookCard.tsx` (+ css), `AppShell.tsx`, `pages/SearchTitles.tsx` (label prop), `main.tsx` (route).
- `frontend/src/pages/CardNotesPage.tsx` (+ css, new): the page. `pages/BookDetailPage.tsx` (+ css): the block's search and link.
- `frontend/e2e/card-notes.spec.ts`: five scaffolds activated, 13 follow-ups. `app-shell.spec.ts`, `backup.spec.ts`, `home.spec.ts`: the nav list.
- `README.md`: the Status line and the 5.3 links. `deferred-work.md`: the clamp entry moved to 5.4, and the 5.3 spine-drift entry.

**Review.** 35 findings: high 0, medium 0, low 26, false 9.
- **Patches applied (all low):** the search resets on a scope change (keyed body) plus an e2e leaf; `?book=` with no value is unscoped; the undefined `styles.add` is gone; e2e leaves for the scoped empty view's Page prefill, the `h1` focus fallback and the mark's background and underline; the spine-drift entry corrected.
- **Deferred:** one grouped spine-drift entry (AD-6, AD-9, Structural Seed), in `deferred-work.md` and the frontmatter `deferred`.
- **Rejected:** every other finding, each with its reason in the Review Triage Log.

**Follow-up review:** not recommended (`false`). Patched entries by verdict: high 0, medium 0, low 7.

**Verification.**
- `TZ=Europe/Madrid npm run check`: exit 0 before and after the patches. After them: pytest 1317 passed, 465 e2e passed, plus ruff, Prettier, oxlint, `tsc`, the `api:gen` byte check, the unit tests and the smoke install.
- The matrix audit: every row is covered by a test that ran and passed (API tests for the view rows, `cardNotes.test.ts` and e2e for the search rows).

**For bmad-code-review (residual).**
- **One ATDD assertion changed.** AC-6's mark count went from 4 to 5: "A beginning is the time for taking the most delicate care." holds "the" twice, and every match is marked.
- **5.2 behaviour shift.** After a delete whose refetch fails on Book detail, focus now goes to the block heading when the deleted note was the third shown (it used to reach the fourth note's Edit). Both satisfy "never the deleted note"; the 5.2 tests pass.
- **Rejected, low:** Add card note pressed before the scoped Book's view loads opens Page empty; "İ"-style case folding can list a note with no `<mark>`; Catalog keeps its own debounce copy.
- **Not run:** the R-17 timing smoke (report only).
