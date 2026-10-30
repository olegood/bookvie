---
title: 'Story 1.9: Get warned about duplicates'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: 'de58e3bb347dd10b1f9d77dcaedcc9cd15e2b011'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `add-book` saves a Book that's already in the catalog, so a second copy or a skill's repeated entry clutters it with no warning.

**Approach:** FR-3 on both sides of `add-book` (AD-10). `domain/duplicates.py` holds the ISBN, title and author rules. `add-book` refuses a match with 409 `duplicate_book` listing the matches, unless the intent carries `confirmDuplicate: true`. The New book panel shows the refusal as the "Possible duplicate" alertdialog, with **Don't add** and **Add anyway**. Turn on the 9 ATDD scaffolds (`backend/tests/test_duplicate_book.py`, `frontend/e2e/duplicate-dialog.spec.ts`). The criteria are epics.md → Story 1.9, AC-1…AC-9 in the checklist.

## Boundaries & Constraints

**Always:** The names and shapes pinned in the checklist's "Contract the Scaffolds Pin". Rule: when both Books have an ISBN, match on normalized ISBN only; otherwise on title plus at least one shared author. `parse_book_fields` runs first, and the check runs on parsed fields before `commit`. `confirmDuplicate` is a strict JSON boolean, optional, never stored. The client omits it on the first send and adds `true` only on the **Add anyway** resend. Matches are listed in catalog order, each once. The server owns the copy. The dialog has no warning color and no icon, and **Don't add** comes first with default focus. Esc in the dialog acts as **Don't add** and leaves the panel open. Live regions follow the topmost modal and go back to the panel when the dialog closes. Un-skip the scaffolds without weakening them.

Decisions: the dialog's description is rendered by the client from `duplicates`, not taken from the server `message`. It reads "Already in your catalog: " followed by up to three matches, each as the serif title, " by " and the authors joined with "; ", plus " (ISBN <as stored>)" when the match has an ISBN. Matches are separated by ", ", with " and " before the last one, and the sentence ends with "." or with ", and N more." when there are more. The server `message` is the fallback copy (the alert). Server copy for several matches: "Possible duplicate: *A* by *X*, *B* by *Y* and *C* by *Z* are already in your catalog." With more than three: "… are already in your catalog, and N more." The spec was kept whole at ~2,400 tokens.

**Never:** No edit-mode variant (Don't save / Save anyway): that is 1.11. No "Open existing". No generic Confirm dialog beyond what this story needs. No planning-doc edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ISBN match | stored 978…, typed ISBN-10 | 409 `duplicate_book`, `duplicates` lists it | nothing saved |
| Title + author | either side has no ISBN | 409 | nothing saved |
| Different ISBNs | same title and author | 200, saved | N/A |
| Invalid and matching | Pages empty | 422 `invalid_fields`, no `duplicates` | nothing saved |
| Confirmed | `confirmDuplicate: true` | 200, saved as normal | fault → 503, file byte-identical |
| Malformed flag | `"true"` or `null` | 422 on `intent` | N/A |
| Resend fails | 503 on Add anyway | dialog closes, panel keeps values, couldn't-save line | not reopened |

</frozen-after-approval>

## Code Map

- `backend/bookvie/domain/book_fields.py` -- `BookFields` (`title`, `authors: list[str]`, `isbn` trimmed raw or None), `split_authors`. Don't change. New sibling module `domain/duplicates.py`, exported where the tests import it. `domain` imports no other layer (`tests/test_layers.py`).
- `backend/bookvie/intents/add_book.py` -- `AddBookIntent` (`strict`, `extra=forbid`, `_no_null` on `"*"`). Add `confirm_duplicate: bool = False`. The `"*"` null validator must also cover it, and the field must be left out of `raw` before `parse_book_fields` (that function only knows the form keys). The check runs inside `change(library)`, so it reads committed state under the store lock, and raising an `IntentError` there passes straight through `commit`.
- `backend/bookvie/intents/contract.py` -- add `ErrorCode.DUPLICATE_BOOK`, `DuplicateMatch` (`title`, `authors`, `isbn: str | None`, serialized even when null), `ErrorBody.duplicates`, and a `duplicate_book(matches)` constructor. Watch out: `response_body` uses `exclude_none=True`, so a null `isbn` inside `duplicates` would be dropped. Keep `isbn: null` on the wire.
- `backend/tests/test_contract.py:292-302` -- pins the `ErrorCode` enum and the `ErrorBody` required keys. Update the enum.
- `frontend/src/api/generated/` -- regenerate with `npm run check:api` (openapi-typescript).
- `frontend/src/api/envelope.ts` -- `toIntentResult`. Add a validated `duplicates` to `refusal` (malformed → `couldnt_save`). Unit tests are in `envelope.test.ts`.
- `frontend/src/api/books.ts` -- `addBook(client, fields)`. Add an optional `{ confirmDuplicate: true }` that is merged into the intent JSON only when given.
- `frontend/src/lib/announce.ts` -- `adoptRegions`/`releaseRegions` keep one host and one parent. Make it a stack: adopt pushes, release pops back to the previous container or the body. Extend `announce.test.ts`.
- `frontend/src/components/SidePanel.tsx` -- a native `<dialog>` with `showModal()`, the StrictMode-safe `onClose`, opener focus restore, and region adoption. Mirror these patterns in the new dialog.
- `frontend/src/components/Button.tsx` -- `variant`, `disabledReason`.
- `frontend/src/pages/NewBookPanel.tsx` -- `submit()` with the `inFlight` guard and the outcome mapping. Branch on `code === 'duplicate_book'` to open the dialog, with no alert and no field errors. The resend reuses the guard and the same outcome handling.
- `frontend/src/styles/tokens.css` -- `--color-surface`, `--color-line`, `--radius-lg`, `--shadow-overlay`, `--color-scrim`, the panel-heading and book-title-md fonts. Add `--dialog-width: 440px`.
- `frontend/scripts/copy.test.mjs` -- the tone guard; new client copy must pass it.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/duplicates.py` (+ `domain/__init__.py` if exports are listed there) -- `normalize_isbn`, `isbns_match`, `titles_match` (casefold, collapse `\s+`), `authors_match`, `find_duplicates(books, fields) -> list[Book]` in catalog order.
- [x] `backend/bookvie/intents/contract.py` -- the code, the `DuplicateMatch` model, `duplicates`, `duplicate_book(matches)` with the one-match and multi-match copy.
- [x] `backend/bookvie/intents/add_book.py` -- the flag, and the check inside `change` before append.
- [x] `backend/tests/test_duplicate_book.py` -- un-skip all 6. Add a unit test for multi-match messages (2, 3, 4 matches), a null `isbn` in `duplicates`, and a malformed flag. `tests/test_contract.py` -- the enum.
- [x] `frontend/src/api/generated/*`, `api/envelope.ts` (+ test), `api/books.ts` (+ test) -- the regenerated types, `duplicates` on the refusal, and the confirm option.
- [x] `frontend/src/lib/announce.ts` (+ test) -- the region stack.
- [x] `frontend/src/components/DuplicateDialog.tsx` (+ `.module.css`) -- `<dialog role="alertdialog">` opened with `showModal()` while mounted, `aria-labelledby` its heading and `aria-describedby` its description, adopting the regions. **Don't add** is autofocused, then **Add anyway** (primary). Cancel (Esc) calls `onDontAdd`. 440px, centered, buttons right-aligned.
- [x] `frontend/src/pages/NewBookPanel.tsx` -- `duplicates` state. **Don't add** clears it and focuses Title. **Add anyway** closes the dialog, then resends with the flag through the same guard and outcome path.
- [x] `frontend/e2e/duplicate-dialog.spec.ts` -- un-skip all 3. Add one test: Esc in the dialog keeps the panel open and focuses Title, and the regions are inside the dialog while it is open.
- [x] `_bmad-output/test-artifacts/atdd-checklist-1-9-…md` -- tick the implementation checklist.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 9 Story 1.9 scaffolds active and every earlier test passing.
- Given the open Duplicate dialog, when a screen reader reads the page, then the `status`/`alert` regions are inside it (not inert), and after it closes they are back inside the panel.

### Review Findings

- [x] [Review][Patch] Fold typographic punctuation and compatibility forms in title/author matching (NFKC; curly quotes → straight, en/em dash → hyphen) — decision resolved: widen the key [backend/bookvie/domain/duplicates.py:40]
- [x] [Review][Patch] 979 test uses an invalid ISBN-13 and a false comment; its ISBN-10 assertion is a tautology [backend/tests/test_duplicate_book.py:323]
- [x] [Review][Patch] No test that a `duplicate_book` refusal clears earlier field errors (`setErrors({})`) [frontend/src/pages/NewBookPanel.tsx:106]
- [x] [Review][Patch] Dialog description untested for 2 matches (" and ", no comma), a multi-author match ("; ") and 4 matches (", and 1 more.") [frontend/src/components/DuplicateDialog.tsx:27]
- [x] [Review][Patch] ATDD checklist follow-up lines bundle done and undone cases, so tested items stay unticked [_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md:166]

**Rejected:**
- (blind) Spec status `done` vs sprint `review`, `review_loop_iteration`, timestamp — fix edits the spec under review; status is synced at the end of this review.
- (blind, auditor) Spec Code Map/Tasks/Verification counts out of date (4 vs 5 e2e tests), empty change log — fix edits the spec under review.
- (blind) Dialog fallback to server `message` untested — low: `duplicate_book` is only raised when `matches` is non-empty, so the branch is unreachable from the real server.
- (blind) Server `DUPLICATE_NAMED_LIMIT` and client `NAMED` can drift — low: the dialog never shows the server message when `duplicates` is present, so drift changes no user-visible copy; the spec owns both rules.
- (blind) Agent callers get a server message without ISBNs — the server copy is pinned verbatim by spec Decisions; agents also receive `duplicates` with each `isbn`.
- (blind) `test_title_alone_or_author_alone_is_not_a_duplicate` hand-builds `BookFields` — low: a new field fails it loudly; "listed once" is already deferred.
- (blind) `key={index}` in `describe()` — false: the list is fixed for the dialog's lifetime.
- (blind) A second Esc could force a native close and call `onDontAdd` twice — false: the first Esc unmounts the dialog, so a second Esc reaches the panel, not the dialog.
- (edge) Tab trap misses when focus isn't on a button — low: needs a mouse click on dialog text then Shift+Tab; with focus on `body` the dialog's `onKeyDown` never fires, so the proposed guard wouldn't help either.
- (auditor) Checklist AC-6 wording changed — false: it now matches spec Decisions, and the checklist is a test artifact, not a planning doc.
- (auditor) `authors_match` normalizes beyond "casefold and trim" — false: a superset agreed in build triage #1–2; no pinned case breaks.
- (auditor) Three `test_add_book.py` tests got new titles — false: each keeps its purpose; only the identical re-add (now a 409) changed.
- (auditor) `DuplicateDialog` lacks opener focus restore — false: native `close()` restores focus to the pre-`showModal` element; Don't add/Esc focus Title explicitly (build triage #12).
- (auditor) "Before `commit`" vs inside `change()` — false: the check runs inside the commit before append, as the Design Notes specify.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind, edge | Titles/authors not Unicode-normalized (NFC vs NFD) | low | `_title_key`/`_author_keys` only casefold; macOS paste yields NFD, so a visually equal title saves silently | patch |
| 2 | blind, edge | Author keys don't collapse inner whitespace, unlike titles | low | `_author_keys` strips only ends; "Frank  Herbert" ≠ "Frank Herbert" | patch (same root as 1: one shared key function) |
| 3 | verif-gap, blind | Dialog description text never asserted exactly | medium | AC-6 regexes also pass on the server `message`; no test pins ISBN suffix shown/hidden | patch |
| 4 | verif-gap | No test that a duplicate refusal skips the alert line/announcement | medium | No test reads `alert` text while the dialog is open or after Don't add | patch |
| 5 | blind | 979-vs-ISBN-10 assertion can never fail; mixed checks under a misleading test name | low | ISBN-10 always normalizes to 978…, so `!=` with a 979… is a tautology | patch |
| 6 | blind | Checklist AC-6 line says `aria-describedby` the server message | low | Description is client-rendered from `duplicates` per spec Decisions | patch |
| 7 | blind | Green-phase follow-ups untested: axe both themes, Add anyway double-press, ISBN edit after Don't add, 10 matches, both-rules-listed-once, repeated authors, Tab trap | medium | Checklist follow-ups unticked; no tests found | defer |
| 8 | verif-gap | No concurrency test for two simultaneous identical adds | medium | Check placement inside `change()` is unguarded by tests | defer |
| 9 | blind | ISBN-10 check digit ignored in normalization | low | Only matters for a mistyped check digit; user can Add anyway; fix adds checksum logic | reject |
| 10 | edge | Non-digit in stored ISBN-10 stem raises in `int()` | low | Stored ISBNs only enter via `parse_book_fields` (`_ISBN10` = 9 digits + check); needs hand-edited file | reject |
| 11 | blind | Copy rule lives on client and server | false | Spec Decisions mandate client-rendered description with server message as fallback | reject |
| 12 | blind | Focus after a failed Add anyway may land on body | maybe-false | Native `close()` in cleanup restores focus to the pre-`showModal` element (Add book, in the panel); spec sets no rule; would be low | reject |
| 13 | blind | Spec verification counts / empty notes out of date | n/a | Fix edits this build's spec | reject |
| 14 | blind | Spec `in-review` vs sprint `in-progress` | false | Sprint status syncs at the present step | reject |
| 15 | blind | `releaseRegions()` zero-arg pops any owner | low | Every production caller passes its container; no caller diverges today; fix adds API churn | reject |
| 16 | blind | Distinct-ids test no longer adds an identical Book twice | low | Test still proves distinct ids; the ids come from the clock/uuid, not the payload | reject |
| 17 | edge | `duplicate_message([])` raises IndexError | false | Only caller raises after `if matches`; never called empty | reject |
| 18 | edge | Empty `authors` renders "Dune by ." | false | Stored Books always have ≥1 author (`parse_book_fields` requires it) | reject |
| 19 | edge | `adoptRegions` before host exists sends host to body | false | `AppShell` calls `regionHost()` during render, before any child layout effect | reject |
| 20 | verif-gap | Checklist follow-ups partly done but unticked | low | Each line bundles several cases, some still untested (see 7) | reject |

## Design Notes

Server check (inside the commit, so it sees committed state):
```py
def change(library):
    matches = find_duplicates(library.books, fields)
    if matches and not intent.confirm_duplicate:
        raise duplicate_book(matches)
    ...append as today
```
Region stack: `adoptRegions(el)` pushes `el` and moves the host there. `releaseRegions()` pops and moves the host back to the new top, or to the body. The dialog adopts the regions after `showModal()` and releases them in its effect cleanup, before the panel's own release.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py tests/test_contract.py` -- expected: all pass, 0 skipped.
- `npm run build && npm --prefix frontend run e2e -- e2e/duplicate-dialog.spec.ts` -- expected: 4 passed.
- `npm run check` -- expected: exit 0.
