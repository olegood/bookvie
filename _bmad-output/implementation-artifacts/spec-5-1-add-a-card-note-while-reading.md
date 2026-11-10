---
title: 'Story 5.1: Add a card note while reading'
type: 'feature'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
warnings: ['oversized']
baseline_revision: '6d6bd736e2a288bad5429dc7b26a9fc0597572c7'
baseline_commit: '6d6bd736e2a288bad5429dc7b26a9fc0597572c7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Each Book already stores `cardNotes[]` (AD-18), and the invariants check note ids and pages, but nothing writes a note or shows one. FR-17, UX-DR47, UX-DR49.

**Approach:** Add the `add-card-note` intent, which parses Page on the server, and a `cardNotes` field on the Book detail view. On the client, add the Card note panel (a 360px index-card modal), opened by **Add card note** on the Main book card and on every Book detail, plus Book detail's "Card notes (N)" block. The ATDD checklist's "Contract the Scaffolds Pin" section is binding.

## Boundaries & Constraints

**Always:**
- **`add-card-note` `{bookId, text, page}`**, where `page` is the Page field's string as typed. It is checked inside the commit:
  1. 409 `book_not_found`.
  2. 422 `invalid_fields`, `text` (label "Note") before `page` (label "Page"):
     - `text` empty after trimming: "Note is required.";
     - `page` empty after trimming: "Page is required.";
     - not one page or one range: "Use one page or one range.";
     - any page below 1 or above Pages: "Page must be between 1 and N." (checked before the reversed check);
     - start greater than end: "The first page must come before the last.".
  3. It appends `{id: uuid4, text, pageStart, pageEnd, createdAt: clock.now()}` and answers `ids: {cardNoteId}`. Nothing else changes.
- **Page grammar:** an optional `p.`/`pp.` prefix (optional dot, optional spaces), then an integer, or two integers joined by `-` or `–` with optional spaces. When start equals end, `pageEnd` is null. The parser is pure, in `domain/`.
- **The Note text is stored with its outer whitespace trimmed.** Inner newlines are kept.
- **`BookDetailView.cardNotes`** lists the notes ordered by `pageStart`, then `createdAt`.
- **The Card note panel:**
  - a modal `dialog` named "Card note", 360px wide, styled with `card-note` tokens;
  - a `textarea` "Note" (required), focused on open, and a text input "Page";
  - **Save note** (primary) and **Cancel**.
  - Page is prefilled with the current Reading's `currentPage` (at least 1): the Main book's on Home, or Book detail's `currentReading` (Main, waiting, or a paused Up next). It is empty when there is no current Reading, a finished-only Book included.
  - The client doesn't check fields. A 422's `fields` show under their fields with `aria-invalid` and `aria-describedby`, the summary goes in `alert`, and focus moves to the first invalid field.
  - Any other failure shows the `alert` line inside the panel, above the buttons, with both values kept.
  - **Save note** is `aria-disabled` while the request is out. Esc works like Cancel.
- **On success** the panel closes and the user stays put. Focus returns to the opener, then `status` reads "Card note saved.". Cancel and Esc also return focus to the opener and send nothing.
- **The openers:**
  - Main book card: **Add card note** in a `button-secondary` stack under the cover (DESIGN.md → Main book card).
  - Book detail: **Add card note** is always shown, after the Side-read button's slot and before **Edit**.
- **The "Card notes (N)" block** is a `region` named by its `section-label` h2, placed after Current reading and before Readings.
  - It shows the first three notes as `listitem` cards: the text in `body`, then "p.42" or "pp.42–45" below it, in `meta` / `ink-tertiary`.
  - With no notes, the heading is "Card notes" and the block reads "No card notes yet.".
- The standard intent ACs (TR8) apply. Tests seed state with `LibraryBuilder` / the e2e `cardNotes` partial.

**Never:**
- No Edit or Delete on a note, and no search, pile, Card notes page or "See card notes · N" (5.2 to 5.4).
- The page refs are not buttons yet.
- No new `ErrorCode`.
- No hand edits to `tokens.css`. `schema.d.ts` changes only through `api:gen`.
- No edits to the architecture spine: record drift in deferred-work.md.

## I/O & Edge-Case Matrix

| Scenario | Input | Result |
|---|---|---|
| Single page | "42", "p.42", "42–42" | 200; (42, null) |
| Range | "42–45", "42-45", "42 – 45", "pp. 42–45" | 200; (42, 45) |
| Out of range | "0", "331", "42–400" on 330 pages | 422 `page` "Page must be between 1 and 330." |
| Reversed | "45–42" | 422 "The first page must come before the last." |
| Not one range | "42–45, 50–52", "42, 50", "abc", "p.", "42 to" | 422 "Use one page or one range." |
| Empty | page "" or "   " / text "" or whitespace | 422 "Page is required." / "Note is required." |
| Both bad | text " ", page "400" | 422 fields [text, page], "Not saved. 2 fields need attention: Note, Page." |
| Gone Book / disk fault | | 409 `book_not_found` / 503 `couldnt_save`, bytes unchanged |

</frozen-after-approval>

## Code Map

- `backend/bookvie/domain/note_pages.py` (new; export it in `domain/__init__.py`): `parse_note_pages(raw, pages) -> tuple[int, int | None] | str` (the pages, or the refusal message). The messages are constants.
- `backend/bookvie/intents/add_card_note.py` (new): `AddCardNoteIntent(book_id, text, page: str)`, `parse_add_card_note_intent`, `add_card_note(store, clock, intent) -> str`. Model it on `update_page.py` (the `change` closure and `commit`), and use `invalid_fields(errors, {"text": "Note", "page": "Page"})`. Export it in `intents/__init__.py`.
- `backend/bookvie/http/api.py`: add `POST /intents/add-card-note`, modeled on `set_up_next_intent` (`:557`), returning `OkResponse(ok=True, ids={"cardNoteId": id})`. It is not in `BODY_CAPS`.
- `backend/bookvie/views/models.py:180` `BookDetailView`: add `card_notes: list[BookCardNote]` (id, text, page_start, page_end, created_at). `views/shelf.py:266` `book_detail` fills it, sorted.
- `backend/tests/helpers.py`: the `ADD_CARD_NOTE` URL. `tests/test_add_card_note.py`: activate the three leaves, use the helper constant, add a trim case to AC-2, and add a `test_note_pages.py` unit table plus a view-order test with a tie.
- `backend/tests/test_intent_routes.py` (`INTENT_ROUTES`) and `test_contract.py` (the envelope operations ~`:344` and the coverless list ~`:373`): add the route.
- `frontend/src/api/generated/schema.d.ts`: regenerate only. `src/api/books.ts`: `addCardNoteForm`, `addCardNote`, `useAddCardNote`, re-exported in `api/index.ts`, with a case in `books.test.ts`.
- `frontend/src/lib/cardNotes.ts` (new, + test): `pageRef(start, end)` gives "p.42" or "pp.42–45", `notePrefill(currentPage | null)`, `CARD_NOTE_SAVED`, and `cardNotesHeading(n)`.
- `frontend/src/lib/useAlertDialog.ts:36`: `keepFocusInside` also cycles through `textarea`.
- `frontend/src/components/CardNotePanel.tsx` + `.module.css` (new), modeled on `StartDialog.tsx` (`useAlertDialog` with `role: 'dialog'`, `initialFocus` on Note, the region slot above the actions, and `inFlight`). Props: `bookId`, `initialPage`, `onCancel`, `onSaved`. The Note field is a `textarea` with TextField's label, error and `aria-describedby` pattern (TextField takes only an `input`; add a small `multiline` variant or write the markup inline).
- `frontend/src/lib/useCardNoteFlow.tsx` (new): `{button ref, open, panel}`. On close it bumps a refocus counter, and the effect focuses the button and, after a save, `announce('status', CARD_NOTE_SAVED)`. Both `MainBookCard` (via `HomePage` or inside the card) and `BookDetailPage` use it.
- `frontend/src/components/MainBookCard.tsx` and its CSS: wrap the Cover and an actions stack in a left column.
- `frontend/src/pages/BookDetailPage.tsx`: the button at `~:262` (before Edit), and the block between Current reading and Readings. Update the docblock's action-stack list.
- `frontend/e2e/intents.ts`: `ADD_CARD_NOTE`. In `e2e/add-card-note.spec.ts`, activate the three leaves (import the constant) and add the follow-ups: from Book detail (no-Reading empty prefill), a 422 shown in the panel, a routed 503 keeping the values, and the Esc refocus.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:332`: add the row Card note panel | Page | Not empty | "Page is required." (decided with Oleg in the ATDD).
- `README.md`: add Card notes to the Status line, and the 5.1 spec and ATDD links after 4.7's (`:201`).
- Deferred-work intake: none name story 5.1 or Epic 5.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/note_pages.py`, `tests/test_note_pages.py` -- the Page parser and its unit table -- FR-17, AD-18.
- [x] `backend/bookvie/intents/add_card_note.py`, `intents/__init__.py`, `http/api.py` -- the intent and its route -- AD-9, TR8.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- `cardNotes` on Book detail, in page order.
- [x] `backend/tests/test_add_card_note.py`, `helpers.py`, `test_intent_routes.py`, `test_contract.py` -- activate the leaves, and add the route to the shared tables.
- [x] `frontend/src/api/*` (`api:gen`, then `books.ts` and `index.ts`) -- the client.
- [x] `frontend/src/lib/cardNotes.ts`, `useCardNoteFlow.tsx`, `useAlertDialog.ts` -- the copy, the refs, and the open/close/refocus/announce flow.
- [x] `frontend/src/components/CardNotePanel.tsx` -- the panel -- UX-DR47.
- [x] `frontend/src/components/MainBookCard.tsx`, `pages/HomePage.tsx`, `pages/BookDetailPage.tsx` -- the openers and the block -- UX-DR49.
- [x] `frontend/e2e/add-card-note.spec.ts`, `intents.ts` -- activate the leaves and add the follow-ups.
- [x] `EXPERIENCE.md`, `README.md` -- the validation row, the status line, the links.

**Acceptance Criteria:**
- Given the Main book at p.212, when I press **Add card note**, then a 360px dialog "Card note" opens with focus in the Note `textarea` and Page "212"; Cancel or Esc closes it, focus returns to **Add card note**, and nothing is stored.
- Given the panel, when I save Note plus Page "212–213", then I stay on `/`, focus returns to **Add card note**, then `status` reads "Card note saved.", and the note is stored as (212, 213).
- Given the server refuses Page "400", when I save, then the Page field shows "Page must be between 1 and 330." with `aria-invalid` and `aria-describedby`, `alert` is announced, the panel stays open with both values, and nothing is stored.
- Given a routed 503, when I save, then "Couldn't save. Your data wasn't changed." shows inside the panel above the buttons, and both values are kept.
- Given a Book with notes at p.300, p.12, p.96 and pp.42–45, when I open its Book detail, then "Card notes (4)" lists p.12, pp.42–45, p.96, each with its ref below the text in `ink-tertiary`; a Book with none shows "No card notes yet.".
- Given a Book with no Reading, when I open the panel from Book detail, then Page is empty, and after a save focus returns to that **Add card note**.

## Design Notes

The client sends Page as typed, and only the server parses it. That way one grammar holds, and Story 5.2's edit and the agent skill reuse it.

The refocus-then-announce order follows Book detail's `onSaved` and finish flows: the counter effect runs after the dialog unmounts.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/add-card-note.spec.ts e2e/home.spec.ts e2e/book-detail.spec.ts e2e/home-slice.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0 (formatting, lint, `tsc`, `api:gen` byte check, unit tests, e2e).

## Implementation Notes

- `domain/note_pages.py` uses ASCII digits only (`[0-9]`), so other scripts' digits are "Use one page or one range.". "p42" and "pp 42–45" (prefix without a dot) are accepted, as the grammar's optional dot allows.
- The Card note panel lives inside `MainBookCard` (the flow hook runs there), so `HomePage.tsx` needed no change.
- `e2e/intents.ts` `intentOf` now decodes the JSON part as UTF-8: it read the body as latin1, which mangled "212–213" in AC-4's request check.
- `test_edit_book.py`'s whole-body Book detail comparison gained `cardNotes: []`, and `views.test.ts`'s fixture `cardNotes: []`.
- The shared `watchStatus` / `topOf` / `bottomOf` helpers were not moved to an `e2e/announce.ts` (the checklist's suggestion); the spec doesn't ask for it.
- On Book detail, a stale-tab 409 `book_not_found` refetches the view to not-found, which unmounts the panel with the page (the Finish dialog is hosted above for that reason; the Card note panel isn't). Not pinned by the spec.

## Spec Change Log

## Review Triage Log

### 2026-11-10 — Review pass
- layers: blind-hunter, edge-case-hunter, verification-gap, spine-check (none failed).
- verdicts: 25 findings — high 0, medium 0, low 16, false 3, maybe-false 0, rejected for spec-only fix 1, plus 5 spine-drift items grouped into one defer.
- findings:
  - `[low]` `[patch]` (verification-gap) Book detail's Page prefill from `currentReading` is never asserted (only the no-Reading empty case) — an e2e leaf with a paused Book at p.88 was added.
  - `[low]` `[patch]` (verification-gap, blind) The `textarea` in `keepFocusInside` is untested — a Shift+Tab / Tab cycle leaf was added.
  - `[low]` `[patch]` (edge-case) The panel renders only in MainBookCard's Main-book branch, so a refetch that empties the card unmounts it without the refocus — it is now rendered in the empty branch too.
  - `[low]` `[patch]` (blind) The panel and EXPERIENCE.md's Card note panel section show Page as optional while the server refuses it empty — Page is now `required`, and EXPERIENCE.md:250 says so.
  - `[low]` `[patch]` (blind) Red-phase wording in `test_add_card_note.py` (docstring, `_fields`) and the e2e describe title — reworded.
  - `[low]` `[patch]` (blind) `sprint-status.yaml` `last_updated` changed format to `YYYY-MM-DD` — restored to `MM-DD-YYYY HH:MM`.
  - `[low]` `[defer]` (spine-check ×5, blind) Spine drift: the Structural Seed doesn't list `add_card_note` / `note_pages`, the FR-17 map row names only `views/card_notes`, AD-6 doesn't name the notes order or the first-three cut, and AD-18 doesn't give the canonical `pageEnd: null` or `pageStart ≤ pageEnd` — one "spine drift" entry in deferred-work.md.
  - `[low]` `[defer]` (blind) The README Status line still says Epic 4 is in progress with 31 of 41 stories done — it predates this story, and the count belongs to bmad-code-review; deferred.
  - `[low]` `[reject]` (edge-case) A digit run over 4,300 characters makes `int()` raise, giving a 500 — no one types that, and the guard adds a branch.
  - `[low]` `[reject]` (edge-case) A network failure after a commit, then a retry, stores the note twice — every intent shares this AD-3 behavior (no idempotency keys); not caused by this story.
  - `[low]` `[reject]` (blind) The grammar refuses "P. 42", the em dash and the minus sign — the frozen grammar pins `p.`/`pp.` and `-`/`–`, and the refusal is honest.
  - `[low]` `[reject]` (blind) Field errors stay until the next Save — this matches StartDialog's "Which page?" (`setPageInvalid(null)` only on confirm).
  - `[low]` `[reject]` (blind) A fixed three-column grid at narrow widths — DESIGN.md → Book detail specifies a three-column grid, and the app's layouts are desktop-first.
  - `[false]` `[reject]` (blind) The `createdAt` tie-break isn't pinned for notes added at the same instant — `sorted` is stable, so equal keys keep insertion order (the order added), which is the intended order.
  - `[low]` `[reject]` (blind) No size limit on the Note or the Page — no text field in the app has one (Purpose, Title); unlikely in use, and a limit adds new copy.
  - `[false]` `[reject]` (blind) Book detail fetches every note but shows three — 5.2 to 5.4 need the full list on Book detail (in-place search shows every match), and the count comes from it.
  - `[low]` `[reject]` (blind) The ATDD checklist isn't updated — that is `bmad-testarch-automate`'s step after done (AGENTS.md → Story pipeline).
  - `[reject]` (edge-case claim) The ticked task names `pages/HomePage.tsx`, which didn't change — the fix edits this spec; the opener lives in MainBookCard.
  - `[false]` `[reject]` (verification-gap, other) Esc and Cancel are ignored while a save is in flight, with no test — the reviewer filed it for awareness, and it is StartDialog's guard, not a gap the spec asks for.

### 2026-11-10 — Code review pass (bmad-code-review)
- scope: `6d6bd73..740aef2`, full mode, five layers (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check), none failed.
- verdicts: 27 findings — high 0, medium 0, low 19, false 3, plus 5 spine-drift items already deferred by the build review.

### Review Findings
- [x] [Review][Defer] (decided by Oleg: keep it) `add-card-note` returns `ids.cardNoteId`, which no client reads (SC) — the Consistency Conventions → IDs rule says an id no client uses is not returned (`start-reading`'s Reading id). This spec and the ATDD contract both require `cardNoteId`. Either drop it, or keep it and record the exception (the agent skill and 5.2 as its readers) as spine drift. — deferred: spine drift (Consistency Conventions → IDs, AD-9), reconciled before the next epic.
- [x] [Review][Patch] The Page grammar takes any whitespace (`\s`: tabs, newlines, Unicode spaces) where the frozen grammar says "optional spaces" (AA) [backend/bookvie/domain/note_pages.py:19]
- [x] [Review][Patch] Esc or Cancel during an in-flight save is untested (VG): removing `dismiss`'s `inFlight` guard leaves every leaf green [frontend/e2e/add-card-note.spec.ts]
- [x] [Review][Patch] A 422 refusing both Note and Page is untested in the browser: focus on Note, both `aria-invalid`, and the two-field summary (VG, AA, BH) [frontend/e2e/add-card-note.spec.ts]
- [x] [Review][Patch] The Card notes `<ul>` has `list-style: none` with no `role="list"`, so Safari/VoiceOver drops the list semantics; `Bookcase.tsx:336` adds the role for this reason (BH) [frontend/src/pages/BookDetailPage.tsx:107]
- [x] [Review][Patch] `.cardNoteText` uses `white-space: pre-line`, which collapses runs of spaces the server keeps; `pre-wrap` shows the note as stored (BH) [frontend/src/pages/BookDetailPage.module.css:268]
- [x] [Review][Defer] A long note makes its card, and the block's grid row, arbitrarily tall and pushes Readings down; DESIGN.md sets no clamp for the block's preview cards (BH) [frontend/src/pages/BookDetailPage.module.css:251] — deferred: a UX choice for 5.3/5.4 (full text lives in the list and the pile).

### Rejected
- `[low]` (EC, BH) A digit run over 4,300 characters makes `int()` raise, giving a 500 — reachable only by a crafted request, and nothing is written; the guard adds a branch (the build review rejected it too).
- `[low]` (AA, EC) A stale-tab 409 on Book detail unmounts the panel with the page — the Book is gone, so the note can't be kept anyway; `announce('alert')` still fires.
- `[false]` (EC) Focus drops to `body` after that 409 — `BookDetailPage`'s missing-status effect focuses the not-found `h1` when focus is on `body`.
- `[low]` (EC) A Note made only of zero-width characters passes `strip()` — no one types that, and the guard adds a branch.
- `[low]` (BH) `check_invariants` accepts `pageEnd == pageStart`, which renders "pp.42–42" — only a hand-edited or restored file can hold it; recorded in the AD-18 spine drift.
- `[low]` (AA) The Esc leaf doesn't use the p.212 seed — the refocus path is the same code for every prefill, and AC-1's Cancel covers p.212.
- `[low]` (BH) Cancel and Esc discard a typed Note with no warning — the frozen spec says "Esc works like Cancel"; changing it is a product decision, not a fix.
- `[low]` (BH) Page has no hint about ranges — no hint is in EXPERIENCE.md or DESIGN.md; adding copy is a spec change.
- `[low]` (BH) The README Status line is stale beyond the count — fixed with the count when this review moves the story to `done`.
- (BH) The ticked task names `pages/HomePage.tsx` — the fix edits this spec.
- `[low]` (BH) No browser leaf for a stale-tab 409 from Home — it takes the same alert-line branch the routed-503 leaf pins.
- `[false]` (BH) `isinstance(parsed, str)` in `if errors or …` is redundant — it narrows `parsed` for the type checker before the tuple unpack; the behavior is single-path.
- `[low]` (BH) Screen readers say "p dot 42" — 5.4 turns page refs into buttons named "Open p.42 in the pile" (DESIGN.md → Card notes list).
- `[false]` (BH) An e2e gap for a two-field refusal was filed separately — grouped with the VG/AA patch above.
