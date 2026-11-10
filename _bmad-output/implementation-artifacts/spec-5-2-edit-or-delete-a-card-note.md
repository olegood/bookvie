---
title: 'Story 5.2: Edit or delete a card note'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: 'a4ecc340668527d1a771cfb6e46782dff25093d3'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-5-2-edit-or-delete-a-card-note.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-9, AD-19 Targeting, Structural Seed), reconciled before the next epic: the spine doesn't name card_note_not_found, cardNoteId targeting, the new card-note modules, or that an unchanged edit commits.
    evidence: |-
      AD-9's 409 list and AD-19's Targeting rule omit card_note_not_found and cardNoteId; the Structural Seed omits edit_card_note, delete_card_note, check_card_note_fields and lib/cardNotes.ts; AD-9 (spine:65) says asking for what is already so is a no-op, while edit-card-note commits an unchanged edit as decided with Oleg in the ATDD.
    location: >-
      backend/bookvie/intents/contract.py, edit_card_note.py, delete_card_note.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** 5.1 lets the user add a Card note and shows the first three on Book detail, but a note can't be fixed or removed. FR-17, UX-DR47.

**Approach:** Add the `edit-card-note` and `delete-card-note` intents, with a new 409 `card_note_not_found`. On the client, give each note in Book detail's "Card notes (N)" block an **Edit** that opens the Card note panel in edit mode, with **Delete** stacking the "Delete this card note?" Confirm dialog over it. The ATDD checklist's "Contract the Scaffolds Pin" section is binding.

## Boundaries & Constraints

**Always:**
- **`edit-card-note` `{bookId, cardNoteId, text, page}`**, checked inside the commit in this order: 409 `book_not_found`; 409 `card_note_not_found` (no note with that id on that Book, including another Book's note id); then 422 `invalid_fields` exactly as `add-card-note` (same parser, labels, messages, trim, `text` before `page`). It replaces the note's `text`, `pageStart` and `pageEnd` in place, keeping its `id`, `createdAt` and its position in `cardNotes`. An unchanged edit commits as normal (no no-op). Answers `{"ok": true}` (no `ids`).
- **`delete-card-note` `{bookId, cardNoteId}`**: `book_not_found`, then `card_note_not_found`; removes only that note; answers `{"ok": true}`.
- **`ErrorCode.CARD_NOTE_NOT_FOUND = "card_note_not_found"`**: 409, kind `refusal`, no `fields`, message "This card note isn't there anymore.".
- Both routes document 409, 422, 500, 503 with `ErrorResponse` and no 413. Standard intent ACs (TR8) hold for both.
- **Each note in the block** (`listitem`) holds a `button-secondary`-style **Edit** button whose accessible name is "Edit p.96" / "Edit pp.42–45" (visible text "Edit", the page ref added for the name), so it never matches Book detail's own `Edit` (exact).
- **Edit mode of the Card note panel:** the same component, a modal `dialog` headed "Edit card note"; Note holds the note's text and Page holds "96" or "42–45" (en dash, no prefix); focus on open is in Note; the action row is **Delete** (`button-secondary`) at the left, then **Save note** and **Cancel** as in add mode. Save note sends `edit-card-note` with Note and Page as typed; refusals, the in-flight guard and the couldn't-save line behave as in add mode.
- **After an edit is saved**, the panel closes, focus goes to that note's Edit (looked up by note id after the refetch), then `status` reads "Card note saved.". If that note is no longer among the three shown (it moved past them), focus goes to the block heading. Cancel or Esc send nothing and return focus to the note's Edit.
- **The Confirm dialog** is the existing `ConfirmDialog`: `alertdialog` "Delete this card note?", no description lines, **Delete card note** and **Cancel** (Cancel focused). It stacks over the edit panel, which stays open beneath it. Cancel or Esc close only the dialog, and focus goes to the panel's **Delete**. While the delete is in flight both buttons are `aria-disabled` and Esc is ignored.
- **Delete card note** sends `delete-card-note`; on success (after the views refetch) the dialog and panel close, and focus goes to the Edit of the note that now sits where the deleted note was in the block's shown order (the next note), else the last shown note's Edit, else the block heading; nothing is announced. The heading has `tabIndex={-1}`.
- **Couldn't save** (any non-field failure, `card_note_not_found` included): the panel's or the dialog's `alert` line shows inside it above its buttons, the surface stays open with every value kept, `status` stays empty.

**Never:**
- No Card notes page, search, pile, "See card notes · N", nav item, or page-ref buttons (5.3, 5.4).
- No delete announcement line; no client-side field checks.
- No change to `edit-book`'s floor (`_check_pages_floors` already counts a range by `pageEnd`).
- No hand edits to `tokens.css`; `schema.d.ts` changes only through `api:gen`. No edits to the architecture spine: drift goes to deferred-work.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit a note | p.96 note, text "New", page "pp. 97–98" | 200 `{ok:true}`; note (97, 98), same id/createdAt/position | — |
| Edit, bad fields | text " ", page "400" on 412 pages | 422 fields [text, page] | file byte-identical |
| Gone note | note id unknown or another Book's | 409 `card_note_not_found`, checked before fields | file byte-identical |
| Gone Book | unknown bookId | 409 `book_not_found` (before the note check) | file byte-identical |
| Delete highest | notes p.19, pp.200–230, p.270; delete p.270 | 200; then Pages "230" ok, "229" 409 `pages_below_card_note` "…less than 230…" | — |
| Disk fault | write/fsync/replace fault | 503 `couldnt_save` | file byte-identical |

</intent-contract>

## Code Map

- `backend/bookvie/intents/contract.py:38` `ErrorCode` -- add `CARD_NOTE_NOT_FOUND`; add `card_note_not_found()` beside `book_not_found()` (`:186`), exported in `intents/__init__.py`.
- `backend/bookvie/intents/add_card_note.py` -- holds the field checks inline in `change`. Extract them into a shared helper (e.g. `check_card_note_fields(text, page, pages) -> tuple[int, int | None]` raising `invalid_fields`) used by both add and edit; keep `CARD_NOTE_LABELS` / `NOTE_REQUIRED_MESSAGE` there.
- `backend/bookvie/intents/edit_card_note.py` (new) -- `EditCardNoteIntent(book_id, card_note_id, text, page)`, `parse_edit_card_note_intent`, `edit_card_note(store, intent)`; model on `add_card_note.py` (`commit`, `library.replace_book(book.model_copy(...))`, `CardNote.model_copy`).
- `backend/bookvie/intents/delete_card_note.py` (new) -- `DeleteCardNoteIntent(book_id, card_note_id)`, `parse_delete_card_note_intent`, `delete_card_note(store, intent)`; model on `delete_book.py`.
- `backend/bookvie/http/api.py:576` -- add both routes after `add-card-note`, same shape, returning `OkResponse(ok=True)`; not in `BODY_CAPS`.
- `backend/tests/helpers.py:53` -- add `EDIT_CARD_NOTE`, `DELETE_CARD_NOTE`; `tests/test_edit_card_note.py` -- import them, delete the `skip` lines and the RED-phase wording, then add the follow-ups below. Reuse `PAGE_FORMS` / `PAGE_REFUSALS` from `tests/test_add_card_note.py` (or `test_note_pages.py`) by import.
- `backend/tests/test_intent_routes.py:53` (`INTENT_ROUTES`) and `tests/test_contract.py` (`operations` `:345`, the coverless list `~:362`, the `ErrorCode` list `~:289`) -- add both routes and the code.
- `frontend/src/api/generated/schema.d.ts` -- regenerate only. `src/api/books.ts:307` -- `editCardNoteForm` / `editCardNote` / `useEditCardNote`, `deleteCardNoteForm` / `deleteCardNote` / `useDeleteCardNote` beside the add ones; re-export in `api/index.ts`; add cases to `books.test.ts`.
- `frontend/src/lib/cardNotes.ts` -- add `pageField(start, end)` ("96" / "42–45"), `editNoteName(start, end)` ("Edit p.96"), `DELETING_CARD_NOTE` busy reason, the Confirm copy; unit tests in `cardNotes.test.ts`.
- `frontend/src/components/CardNotePanel.tsx` -- add an optional `note?: {id, text, pageStart, pageEnd}` prop (edit mode): heading, prefill, sends `edit-card-note`, and a **Delete** button at the left of the actions (CSS in `CardNotePanel.module.css`). The panel owns the Confirm state and renders `ConfirmDialog` as a **sibling** of its `<dialog>` (a fragment), not inside it, so `keepFocusInside` and Esc stay per-dialog; the Confirm's `onCancel` refocuses Delete after it unmounts; a new `onDeleted` prop is called after a successful delete. Region adoption already stacks (`lib/announce.ts:55`).
- `frontend/src/components/ConfirmDialog.tsx` -- reused unchanged (`lines={[]}` is fine; drop `aria-describedby` only if axe objects to an empty description).
- `frontend/src/lib/useCardNoteFlow.tsx` -- generalise or add a sibling hook for the block: open the panel for a note id, and after close focus by note id (Edit buttons keyed in a `Map<string, HTMLButtonElement>` ref), with the fallbacks above, then announce on save.
- `frontend/src/pages/BookDetailPage.tsx:97` `CardNotesBlock` -- the Edit button per note, `tabIndex={-1}` heading with a ref, and the panel host. Keep the block's panel rendered by `BookDetail` (like `cardNotePanel` at `:316`). Update the page docblock.
- `frontend/e2e/intents.ts` -- `EDIT_CARD_NOTE`, `DELETE_CARD_NOTE`; `e2e/edit-card-note.spec.ts` -- import them, activate the three leaves, drop RED wording, add the e2e follow-ups below.
- `frontend/e2e/add-card-note.spec.ts` -- re-run; adjust only if the block's new buttons break a leaf.
- `README.md` -- Status line (`:8`): the user can now edit or delete a card note from Book detail; add the 5.2 spec and ATDD links after 5.1's (`:203`). Leave the story count alone.
- Deferred-work intake: `deferred-work.md:615` (spine drift, Consistency Conventions → IDs, AD-9: `cardNoteId` names "Story 5.2's edit" as a reader) -- not in this story: it is spine drift, reconciled before the next epic; 5.2's edit reads note ids from `BookDetailView.cardNotes`, not the add response (note this in the deferral).

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/contract.py`, `__init__.py` -- `card_note_not_found` code and refusal -- AD-9 targeting.
- [x] `backend/bookvie/intents/add_card_note.py`, `edit_card_note.py`, `delete_card_note.py` -- shared field check, the two intents -- FR-17, TR8.
- [x] `backend/bookvie/http/api.py` -- the two routes.
- [x] `backend/tests/test_edit_card_note.py`, `helpers.py`, `test_intent_routes.py`, `test_contract.py` -- activate AC-4/AC-5; add follow-ups: edit parses every `PAGE_FORMS` entry and refuses every `PAGE_REFUSALS` entry plus empty Note and both-bad (byte-identical); edit in place keeps id/createdAt/position, trims, leaves other notes and Books unchanged; delete leaves the rest unchanged.
- [x] `frontend/src/api/*` -- `api:gen`, the two clients, `books.test.ts`.
- [x] `frontend/src/lib/cardNotes.ts` (+ test), `useCardNoteFlow.tsx` -- helpers, note-keyed refocus.
- [x] `frontend/src/components/CardNotePanel.tsx`, `.module.css` -- edit mode, Delete, stacked Confirm.
- [x] `frontend/src/pages/BookDetailPage.tsx` -- Edit per note, focusable heading.
- [x] `frontend/e2e/edit-card-note.spec.ts`, `intents.ts` -- activate AC-1..AC-3; add follow-ups: a 422 (Page "400" → "Page must be between 1 and 412." with `aria-invalid`); range prefill "42–45" saved unchanged; Cancel/Esc in the edit panel refocus the note's Edit and send nothing; an edit moving p.96 → p.400 focuses the heading; deleting the only note leaves "No card notes yet." with focus on the "Card notes" heading; a stale `card_note_not_found` shows inside the panel; axe on the edit panel and the stacked Confirm.
- [x] `README.md` -- Status line and links.

**Acceptance Criteria:**
- Given Dune's block shows p.12, pp.42–45, p.96, when I press the p.96 note's Edit, then "Edit card note" opens with Note "The spice must flow." and Page "96", and Delete sits left of Cancel and Save note; saving "pp. 97–98" sends one `edit-card-note`, stores (97, 98) with the same id and `createdAt`, focuses that note's Edit, then `status` reads "Card note saved.".
- Given the edit panel, when I press Delete, then "Delete this card note?" opens over the still-visible panel with Cancel focused; Cancel or Esc close only it and focus Delete, sending nothing; Delete card note sends one `delete-card-note`, closes both, the block reads "Card notes (3)", and focus is on the next shown note's Edit.
- Given both routes answer 503, when I Save note, then Delete card note, then "Couldn't save. Your data wasn't changed." shows inside the panel (then the dialog) above its buttons, both stay open with values kept, `status` is empty, and `library.json` is byte-identical.
- Given notes at p.19, pp.200–230 and p.270 on 412 pages, when the p.270 note is deleted, then Pages "230" is accepted and "229" is refused with "Pages can't be less than 230, where a card note is.".
- Given either intent, then TR8 holds (faults 503 byte-identical, `book_not_found`, `card_note_not_found` before fields, malformed intent 422, invariants after success, OpenAPI documents the statuses and the new code).

## Spec Change Log

## Review Triage Log

### 2026-11-10 — Review pass
- layers: spine-check, verification-gap, intent-alignment, blind-hunter, edge-case-hunter (none failed).
- verdicts: 26 findings — high 0, medium 0, low 17, false 9, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) AD-9's 409 targeting list doesn't name `card_note_not_found` or its order (after `book_not_found`, before the fields) — spine drift; one grouped entry in deferred-work.md.
  - `[low]` `[defer]` (spine-check) AD-19's Targeting rule names `bookId` / `readingId` but not `cardNoteId` — spine drift, added to the same entry.
  - `[low]` `[defer]` (spine-check) The Structural Seed doesn't list `edit_card_note`, `delete_card_note`, the shared `check_card_note_fields`, or `lib/cardNotes.ts` — spine drift, same entry.
  - `[low]` `[defer]` (spine-check) The spec names an AD-9 addition with no spine edit — the spec forbids spine edits in a story (AGENTS.md); covered by the same entry.
  - `[low]` `[patch]` (verification-gap) No test holds `delete-card-note` in flight, so the Confirm's `aria-disabled` buttons and ignored Esc are unpinned — added the P1 leaf "while delete-card-note is out, both Confirm buttons are aria-disabled and Esc is ignored" (delayed route, one request).
  - `[low]` `[patch]` (intent-alignment a) After a delete, focus fell back to the last shown note's Edit, where the story AC (epics.md:1758), EXPERIENCE.md:392 and the ATDD checklist say "the next note's Edit, else the block heading" — `noteAfterDelete` is now `shownIds[index] ?? null`, its unit test updated, and a P1 e2e leaf deletes the last of two notes and finds focus on "Card notes (1)". The intent-contract's "else the last shown note's Edit" clause (Boundaries → Always) is now stale; this spec's intent-contract is read-only in the build, so bmad-code-review should strike it.
  - `[false]` `[reject]` (intent-alignment b) Notes past the first three have no Edit — the story's own Given is "a Card note shown on Book detail"; the full list and its Edit arrive with 5.3's Card notes page.
  - `[low]` `[reject]` (intent-alignment c) AC-4 is proven at API level, not by lowering Pages in the Edit book panel — the floor is server-decided and 1.11's e2e already pins the panel's refusal; a UI leaf adds no new code path.
  - `[false]` `[reject]` (intent-alignment d) AC-3's "nothing changes" is split between a routed 503 and the FaultyFs API test — both halves are tested, which is TR9's standard split.
  - `[false]` `[reject]` (intent-alignment e) Additions beyond the intent (`card_note_not_found`, focusable heading, Edit names, busy state, axe) — each is spec- or ATDD-required; no bad outcome named.
  - `[low]` `[reject]` (intent-alignment f) Stacking is asserted by visibility, not inertness or the Tab cycle — `showModal()` makes the panel inert natively, and `ConfirmDialog`'s Tab cycle is shared code pinned by delete-book; the ATDD lists the Tab-cycle leaf for bmad-testarch-automate.
  - `[low]` `[reject]` (blind) The spec's matrix and e2e task say Page "400" is out of range on 412 pages — true (the test uses 413, and the backend both-bad case runs on a 330-page Book), but the fix edits this spec; noted in the Auto Run Result for bmad-code-review.
  - `[false]` `[reject]` (blind) The empty Spec Change Log hides deviations — the change log records bad_spec loopbacks only; there were none, and deviations are logged here.
  - `[low]` `[defer]` (blind) An unchanged edit commits, while AD-9's rule (spine:65) says asking for what is already so is a 200 no-op — decided with Oleg in the ATDD ("as `edit-book` does"); the code is right and the spine's general wording lags: spine drift, added to the grouped entry.
  - `[false]` `[reject]` (blind) Focus waits forever when the refetch fails or returns the same array — then `fresh === stale` (react-query keeps the old data or shares the identical structure), so `notes !== next.fresh` is false and the effect proceeds at once.
  - `[false]` `[reject]` (blind) An uncached book view makes a delete focus the deleted note — Book detail renders from that cached view, so `cachedBookView(bookId)` can't be `undefined` while the block is mounted.
  - `[low]` `[reject]` (blind) Two notes on the same page share the Edit name "Edit p.96" — each Edit sits in its note's list item after that note's text; a unique name needs new copy the UX docs don't give.
  - `[low]` `[reject]` (blind) No test that editing the highest note down lowers the Pages floor — `_check_pages_floors` reads the stored notes, however they changed; the in-place edit test pins the stored pages.
  - `[low]` `[patch]` (blind) The in-flight guards are untested — same root as the verification-gap finding; fixed by that leaf.
  - `[low]` `[reject]` (blind) No component tests for edit mode, and no refusal case for `deleteCardNote` in `books.test.ts` — the project covers components through e2e (13 edit-card-note leaves), and `deleteCardNote` goes through the same `sendIntent` whose refusals are already unit-tested.
  - `[false]` `[reject]` (blind) A stale panel alert survives into the Confirm dialog — `useAlertDialog`'s layout effect calls `clearAnnouncements()` when the Confirm opens.
  - `[low]` `[reject]` (blind) `edit_card_note.py` imports its field check from `add_card_note.py`, and `isinstance` is redundant — no caller diverges; the `isinstance` narrows the type (5.1's review rejected the same point).
  - `[low]` `[defer]` (blind) The new drift entry misses the AD-9 no-op wording and the no-`ids` answers — the no-op wording joins the grouped entry; the no-`ids` answers follow the IDs convention, so they are not drift.
  - `[false]` `[reject]` (edge-case) A delete with no cached view focuses the deleted note — same refutation as the blind finding: the view is cached while Book detail is mounted.
  - `[low]` `[patch]` (edge-case) The delete's index was captured when the panel opened, so a refetch that reorders the notes moves focus to the wrong neighbour — the index is now taken from the current `notes` when `onDeleted` fires, falling back to the opened index.
  - `[false]` `[reject]` (edge-case) Edit mode with `onDeleted` omitted leaves the Confirm busy forever — the only edit-mode caller (`useCardNoteEditFlow`) always passes it.

### 2026-11-10 — Code review pass (bmad-code-review)
- scope: `a4ecc34..7a49901`, full mode, five layers (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check), none failed.
- verdicts: 31 findings (BH 15, AA 5, VG 3, EC 3, SC 5) — high 0, medium 0, low 28, false 3, maybe-false 0. Grouped: 6 patch entries (9 findings), 1 defer entry (the 5 spine-drift items the build already recorded), 17 rejected.

### Review Findings
- [x] [Review][Patch] After a successful delete whose refetch fails, or with no cached book view, focus goes to the deleted note's own Edit: `invalidateQueries` keeps the same `cardNotes` array, so `fresh === stale`, the effect runs at once, and the stale list still holds the deleted note at `index` (BH, EC ×2, VG other). The earlier "false" verdicts on this path missed the stale list. Fix: drop the deleted id from the shown ids before `noteAfterDelete` [frontend/src/lib/useCardNoteFlow.tsx:131]
- [x] [Review][Patch] `useCardNoteEditFlow`'s wait-for-refetch depends on `notes` being the cache's own array (reference identity), and nothing says so. A 5.3 caller passing a filtered or sorted array would resolve focus against the stale list. Fix: state the requirement in `EditOptions.notes`'s doc (BH) [frontend/src/lib/useCardNoteFlow.tsx:84]
- [x] [Review][Patch] Nothing tests that **Delete** is `aria-disabled`, and opens no Confirm, while `edit-card-note` is in flight: dropping `openConfirm`'s `inFlight` guard and Delete's `disabledReason` stays green (VG) [frontend/e2e/edit-card-note.spec.ts]
- [x] [Review][Patch] Nothing tests that add mode has no **Delete**: rendering it in both modes stays green (VG) [frontend/e2e/add-card-note.spec.ts:107]
- [x] [Review][Patch] `test_edit_card_note.py` imports `PAGE_FORMS` / `PAGE_REFUSALS` from another test module. Fix: move both tables to `tests/helpers.py` (BH) [backend/tests/test_edit_card_note.py]
- [x] [Review][Patch] A blank line is missing before the "[P1] AC-1 a refused Page" leaf, unlike every other leaf in the file (BH) [frontend/e2e/edit-card-note.spec.ts]
- [x] [Review][Defer] Spine drift (AD-9 targeting refusals and its no-op rule, AD-19 Targeting, the Structural Seed's `intents/` and `lib/` lines), reconciled before the next epic (SC ×5) — deferred: already recorded in deferred-work.md under "build-auto review of spec-5-2-edit-or-delete-a-card-note"; the code follows the ATDD contract decided with Oleg.

### Rejected
- `[low]` (BH, AA) The intent contract's "else the last shown note's Edit" clause contradicts the code, the story AC and the e2e leaf — the fix edits this spec; raised with Oleg as a separate spec correction.
- `[low]` (BH, AA) The I/O matrix row and the e2e task use Page "400" on 412 pages, which is in range — the fix edits this spec; the tests use 413 and a 330-page Book. Raised with Oleg alongside the clause above.
- `[low]` (BH) `CardNotePanel`'s optional props allow edit mode with no `onDeleted` — the only edit-mode caller passes it; a discriminated union adds surface for a case nobody can reach today.
- `[low]` (BH) `editButton` makes a new callback ref per note on each render — React detaches and re-attaches them, so the map stays correct; nothing user-visible, and caching the callbacks adds a structure.
- `[false]` (BH) `useCachedBookView` reads as a reactive hook — its docblock says it reads the cache "as it holds it right now", and its only caller reads it in an event handler.
- `[low]` (BH) `edit_card_note.py` imports its field check from `add_card_note.py` — carried from the build review: no caller diverges, and moving the helper is churn.
- `[low]` (BH) `_ready` seeds the note through `store.apply` instead of `LibraryBuilder` — the route test seeds through the running app's store (the other branches use intents); the note is invariant-valid, and the minted id can't be static through `add-card-note`.
- `[low]` (BH) `books.test.ts` has no refusal case for `deleteCardNote` — carried: it goes through the same `sendIntent`, whose refusal path is unit-tested.
- `[low]` (BH) No test that an edit lowering the highest note lowers the Pages floor — carried: `_check_pages_floors` reads the stored notes, and the in-place edit test pins those.
- `[low]` (BH) The commit includes the recompiled `epic-5-context.md` — build-auto recompiles it whenever a planning document is newer; it is already committed, and splitting it out would rewrite history.
- `[low]` (BH) Nothing tests that the panel is inert under the Confirm, or the Tab cycle inside it — carried: `showModal()` makes the panel inert natively, and the ATDD hands the Tab-cycle leaf to bmad-testarch-automate.
- `[low]` (AA) The ATDD orders the edit panel's buttons Delete, Cancel, Save note, while the spec and code use Delete, Save note, Cancel — both put Delete at the left, which AC-1 checks, and the fix edits the ATDD document.
- `[false]` (AA) The Confirm's `aria-describedby` points at an empty description — the spec's rule is to drop it only if axe objects, and the axe leaf passes in both themes.
- `[false]` (AA) The ATDD's Tab-cycle follow-up has no leaf — the spec's e2e task list doesn't include it; it is bmad-testarch-automate's step.
- `[low]` (EC) Two notes on one page share the name "Edit p.96" — carried from the build review: each Edit sits in its note's list item after the text, and a unique name needs copy the UX docs don't give.

## Design Notes

The Confirm dialog is a sibling of the panel's `<dialog>`, not a child: React synthetic `keydown` and `cancel` events bubble through the React tree, so a child would run the panel's Tab cycle after its own. Both are `showModal()`-ed, so the browser's top layer stacks them and the panel stays inert until the Confirm closes.

Focus after save or delete is resolved by note id after the refetch, because the block re-renders and re-sorts: the old button element may be gone or moved.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/edit-card-note.spec.ts e2e/add-card-note.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review (story work: bmad-code-review is the step that marks it `done`).

**Summary.** Story 5.2 adds the `edit-card-note` and `delete-card-note` intents with a new 409 `card_note_not_found` (checked after `book_not_found`, before the fields), and a field check shared with `add-card-note`. On Book detail each shown note gets an **Edit** ("Edit p.96") that opens the Card note panel in edit mode ("Edit card note", prefilled, **Delete** at the left). **Delete** stacks the "Delete this card note?" Confirm dialog over the panel as a sibling `<dialog>`. Focus is resolved by note id once the refetched view has rendered: after a save, that note's Edit, else the block heading; after a delete, the next note's Edit, else the heading.

**Files changed.**
- `backend/bookvie/intents/contract.py`, `__init__.py`: `CARD_NOTE_NOT_FOUND` and `card_note_not_found()`.
- `backend/bookvie/intents/add_card_note.py`: `check_card_note_fields`, now shared by add and edit.
- `backend/bookvie/intents/edit_card_note.py`, `delete_card_note.py` (new): the two intents.
- `backend/bookvie/http/api.py`: the two routes.
- `backend/tests/test_edit_card_note.py`, `helpers.py`, `test_contract.py`, `test_intent_routes.py`: AC-4/AC-5 activated, plus follow-ups (every page form and refusal, the edit in place, the delete of one note).
- `frontend/src/api/generated/schema.d.ts` (`api:gen`), `books.ts`, `books.test.ts`, `index.ts`, `views.ts`: the clients and `useCachedBookView`.
- `frontend/src/lib/cardNotes.ts` (+ test): `pageField`, `editNoteName`, the Confirm copy, `noteAfterDelete`.
- `frontend/src/lib/useCardNoteFlow.tsx`: `useCardNoteEditFlow`, which handles focus by note id.
- `frontend/src/components/CardNotePanel.tsx`, `.module.css`: edit mode, Delete, and the stacked Confirm.
- `frontend/src/pages/BookDetailPage.tsx`, `.module.css`: the Edit per note and the focusable block heading.
- `frontend/e2e/edit-card-note.spec.ts`, `intents.ts`: AC-1 to AC-3 activated, plus 10 follow-ups.
- `README.md`: the Status line, and the 5.2 spec and ATDD links. `deferred-work.md`: a note on the `cardNoteId` entry, and the grouped 5.2 spine-drift entry. `epic-5-context.md`: recompiled, because EXPERIENCE.md was newer than it.

**Review.** 26 findings: high 0, medium 0, low 17, false 9.
- **Patches applied (3 entries, all low):**
  - The in-flight Confirm e2e leaf (verification-gap and blind).
  - Focus after a delete is "the next note's Edit, else the heading", plus an e2e leaf (intent-alignment).
  - The delete index is taken when the delete lands (edge-case).
- **Deferred (1 grouped entry):** spine drift for AD-9, AD-19 Targeting and the Structural Seed, including AD-9's no-op wording against the commit on an unchanged edit. It is recorded in `deferred-work.md` and in the frontmatter `deferred`.
- **Rejected:** every other finding, each with its reason in the Review Triage Log above.

**Follow-up review:** not recommended (`false`). Patched entries by verdict: high 0, medium 0, low 3.

**Verification.**
- `cd backend && TZ=Europe/Madrid uv run pytest`: 1307 passed.
- The spec's targeted e2e command: 39 passed, before the patches.
- `TZ=Europe/Madrid npm run check`: exit 0 both before and after the patches. After the patches, all 444 e2e tests passed, along with pytest, ruff, Prettier, oxlint, `tsc`, the `api:gen` byte check and the unit tests.
- The matrix audit: every row is covered by a test that ran and passed.

**For bmad-code-review (residual).**
- **Stale intent-contract clause.** Boundaries → Always still says "else the last shown note's Edit". The code now follows the story AC (next note, else the heading), so strike that clause.
- **Wrong page in the spec.** The I/O matrix row "Edit, bad fields" and the e2e task line give Page "400" on a 412-page Book, which is in range. The tests use 413 (e2e) and a 330-page Book (API).
- **Untested follow-ups.** The ATDD checklist still lists the Tab cycle inside the stacked Confirm, and a re-ordering edit's axe pass in both themes, for bmad-testarch-automate.
- **Flaky test.** The implementer saw `waiting-for-you.spec.ts` "[P1] AC-6 Cancel on a row's Start dialog…" fail once in one `npm run check` run. It passed in every later run, including both full checks here. It is unrelated to this story.
