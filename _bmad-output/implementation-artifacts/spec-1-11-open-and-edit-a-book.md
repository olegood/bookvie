---
title: 'Story 1.11: Open and edit a book'
type: 'feature'
created: '2026-10-31'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Book can't be opened or corrected, so cataloging mistakes and back-filled finish dates stay wrong forever.

**Approach:** Add the `edit-book` intent (add-book's parsing and duplicate flow plus the edit-only rules), a `book` view, the Book detail page reached from List view title links, and the New book panel in edit mode. Turn on the 12 ATDD scaffolds (`backend/tests/test_edit_book.py`, `frontend/e2e/book-detail.spec.ts`). The criteria are epics.md → Story 1.11, AC-1…AC-12 in the checklist.

## Boundaries & Constraints

**Always:** Every name, code, message and stored effect in the checklist's "Contract the Scaffolds Pin". The intent commits once or changes nothing. All checks run inside the commit's `change`, in this order: `book_not_found` (409) → every field failure, including the edit-mode Finished on rules, as one 422 in form order → Pages floors (409) → duplicate (409) → apply. Un-skip the scaffolds without weakening them; update `test_contract.py` for the new codes and routes.

Decisions: Book detail lives at `/book/:bookId`; an unknown id shows the not-found page. The view is `GET /api/views/book?id=…` (404 with code `book_not_found` when absent), and it returns the prefill value `latestFinishDate`, so the client never picks the Reading. "Changed" for the duplicate check compares trimmed parsed values (a case-only edit runs the check; self-exclusion keeps it quiet). When Pages is below both floors, the higher floor's 409 wins; on a tie, the current page. The 409 Pages message reuses the 422 summary copy ("Not saved. 1 field needs attention: Pages."). Finished on equal to the latest `finishDate` is no change; when two finished Readings share the latest date, the later one in list order is edited. Empty Finished on is refused only when a finished Reading exists. Book detail shows only what this story owns: one `surface` card, left column with the action stack holding only **Edit**, right column with `h1`, subtitle, author line (names joined "; "), the metadata grid (empty ISBN/Year rows left out), tag chips (omitted when none), and the Readings block. Readings list newest first: "Started 2 Sep 2026 · Finished 3 Oct 2026", "Finished 14 Aug 2019" for a back-fill, "Started 2 Sep 2026" for an unfinished one; with none, "Not read yet." The spec was kept whole at ~2,700 tokens.

**Never:** No cover, no-cover placeholder or **Remove cover** (1.13). No Delete (1.12), Change color block (1.14), Current reading block, Card notes block, Pace calculator or other actions (Epics 3–6). No bookcase spine link (the popover in 1.14 opens Book detail). No CRUD/PATCH routes. No optimistic updates. No planning-doc edits.

</frozen-after-approval>

## Code Map

- `backend/bookvie/intents/add_book.py` -- `AddBookIntent`, `parse_add_book_intent`, `_malformed`, the back-fill `Reading(...)` and duplicate block. Factor the intent parsing (generic over the model class) and back-fill construction into shared helpers; add_book behavior must not change.
- `backend/bookvie/intents/contract.py` -- `ErrorCode` (append `book_not_found`, `pages_below_current_page`, `pages_below_card_note`), `invalid_fields` (split out the summary builder so a 409 with one `pages` field can reuse it), `duplicate_book`.
- `backend/bookvie/intents/commit.py` -- `commit(store, change)`; `IntentError` raised in `change` passes through.
- `backend/bookvie/domain/book_fields.py` -- `parse_book_fields` (already refuses future dates), `LABELS`, `resolve_spine_color`. Add the edit-mode messages and a `long_date(d)` ("12 March 2026", locale-free month table) for the before-start message that FIN-API-003 reuses later.
- `backend/bookvie/domain/duplicates.py` -- `find_duplicates(books, fields)`; pass every Book except the edited one.
- `backend/bookvie/domain/model.py` -- `Book`, `Reading` (`finished`), `CardNote` (`page_end or page_start`), `Library.book(id)`. Replace the Book via `model_copy(update=…)` in `library.books`.
- `backend/bookvie/http/api.py` -- add `POST /intents/edit-book` (mirror `add_book_intent`, return `OkResponse(ok=True)`) and `GET /views/book`.
- `backend/bookvie/views/{models,shelf}.py` -- add `BookDetailView` (id, title, subtitle, authors, pages, edition, language, publisher, type, isbn, year, tags, spineColorUser, latestFinishDate, readings[{id, startDate, finishDate}]) and a pure `book_detail(library, id)`; export from `views/__init__.py`.
- `backend/tests/test_contract.py:290-312` -- the exact `ErrorCode` enum list and the operations whose envelope is checked; extend both.
- `frontend/src/api/{books,views,index}.ts` -- `addBookForm`/`useAddBook` pattern → `editBookForm(bookId, fields, options)` (bookId first) and `useEditBook`; `useBookView(id)` keyed `['view', 'book', id]` with a `missing` state on 404. `src/api/generated/` is regenerated by `npm run check:api`.
- `frontend/src/pages/NewBookPanel.tsx` -- add an optional `book` prop (`{ id, fields }`) for edit mode: dialog title, prefill, submit label, `useEditBook`, and `onSaved(bookId, title)` replacing `onAdded`. Its refusal path already maps any refusal's `fields`, so a 409 with `fields` needs no new branch. Keep mode differences in one small table.
- `frontend/src/components/DuplicateDialog.tsx` -- labels by mode (Don't add/Add anyway vs Don't save/Save anyway); rename callbacks to `onDismiss`/`onConfirm`. In edit mode the panel refocuses **Save changes** (give `Button` a React 19 `ref` prop).
- `frontend/src/pages/CatalogList.tsx` -- the title cell holds a `Link` to `/book/<id>`; the link (not the `td`) registers in `focusTargets` and takes the `tabIndex`. Remove the 1.11 comment.
- `frontend/src/pages/CatalogPage.tsx` -- `onAdded` → `onSaved`; otherwise unchanged. Reference for loading/failed states and `PageHeading`.
- `frontend/src/lib/page.ts` + `components/PageHeading.tsx` -- `usePageTitle` and h1 focus after navigation. Child effects run first, so the page must not call `usePageTitle` in the same tree as `NotFoundPage`.
- `frontend/src/main.tsx` -- add the `/book/:bookId` route.
- `frontend/src/styles/tokens.css` -- `--font-book-title-lg-*`, `--font-section-label-*`, `--color-surface`, chip and line tokens already exist.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-book-detail.html` -- reference markup: `.bd` grid (200px | 1fr), `.mgrid` (`dl` of `div > dt + dd`), `.tagchip`, `.blk` + `.slabel`, `.rlist`.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/bookvie/intents/contract.py`, `domain/book_fields.py` -- new codes, a `pages_refusal(code, message)` 409 helper, the edit messages and `long_date`. Unit-test `long_date`.
- [ ] `backend/bookvie/intents/edit_book.py` (+ `__init__.py` exports, shared helpers in `add_book.py` or a new `intents/book_form.py`) -- `EditBookIntent` (add-book's fields + required `bookId`), `edit_book(store, clock, intent)` with the check order above, Finished on rules, Pages floors, conditional duplicate check, AD-11 spine color, and in-place replacement keeping id, `createdAt`, `ownership`, cover fields, curated color and `cardNotes`.
- [ ] `backend/bookvie/views/*`, `http/api.py` -- the `book` view and both routes.
- [ ] `backend/tests/test_edit_book.py`, `test_contract.py` -- un-skip the 8 leaves; extend the contract test. Add a `book` view API test (found, 404, `latestFinishDate`, reading order is not asserted server-side) and the checklist's AC-3/AC-6/AC-8 follow-ups (case-only title edit, both floors at once, same-date resend no-op, paused Reading floor).
- [ ] `frontend/src/api/*` (+ tests) -- `editBookForm`, `useEditBook`, `useBookView`.
- [ ] `frontend/src/pages/BookDetailPage.tsx` (+ `.module.css`), `src/lib/bookDetail.ts` (+ test) -- route component (loading → null; failed → `COULDNT_LOAD` + **Try again**; missing → `NotFoundPage`; ready → the detail), the layout above, `toPanelFields(view)` and `readingLines(readings)` with en-GB short dates. Edit opens the panel with `tags` from `useCatalogView`; on save, close the panel and `announce('status', 'Saved <Title>.')`; `SidePanel` already returns focus to **Edit**.
- [ ] `frontend/src/pages/NewBookPanel.tsx`, `components/DuplicateDialog.tsx`, `components/Button.tsx`, `pages/CatalogList.tsx`, `pages/CatalogPage.tsx`, `main.tsx` -- wiring as in the Code Map.
- [ ] `frontend/e2e/book-detail.spec.ts` -- un-skip all 4; add the AC-12 routed-503 follow-up (panel stays open with values, couldn't-save line, `aria-disabled` in flight) and Cancel/Esc returning focus to **Edit**. Re-run `new-book-panel.spec.ts` and `duplicate-dialog.spec.ts`.
- [ ] `_bmad-output/test-artifacts/atdd-checklist-1-11-…md` -- tick the implementation checklist; link this spec.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 12 Story 1.11 scaffolds active and every earlier test passing.
- Given `/book/<unknown id>`, when it loads, then the not-found page shows with `document.title` "Page not found — bookvie".
- Given an add from the New book panel in List view, when it saves, then the new row's title link takes focus and the highlight ring (new-book-panel AC-5 still passes).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Finished on in edit, with `latest` = the finished Reading with the greatest `finishDate` (last in list order on a tie):

```
date = parsed finishedOn (None when empty)
latest exists:  None → 422 "A finish date can't be removed here."
                date < latest.start_date → 422 before-start message
                date != latest.finish_date → latest.finish_date = date
no latest:      date → append back-fill (startDate None, currentPage = finishedPages = new Pages)
```

The pages floors use the new Pages value; the back-fill's `finishedPages` is the new Pages too. Existing finished Readings are never touched by a Pages change.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_book.py tests/test_contract.py` -- expected: all pass, none skipped.
- `npm --prefix frontend run check:api` -- expected: contract regenerated with no diff afterwards, `tsc -b`, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/book-detail.spec.ts e2e/new-book-panel.spec.ts e2e/duplicate-dialog.spec.ts e2e/catalog-list.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
