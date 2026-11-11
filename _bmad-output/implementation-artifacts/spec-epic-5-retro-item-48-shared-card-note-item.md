---
title: 'Share one Card note list item between the Card notes page and Book detail'
type: 'refactor'
created: '2026-11-11'
status: 'done'
baseline_commit: '78e4d47823e8faf7e1ae1dc2425baed8e89100fe'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Card note list item is written twice (retro F-A2): the Card notes page's `Group` and Book detail's `CardNotesBlock` each render the same `<li>` with `MarkedText`, the page-ref chip and **Edit**, and their CSS repeats the card and `.pageRef` rules token for token. A change to one can silently miss the other. Book detail has also regrown to 644 lines, past its pre-split size (F-A1), and `CardNotesBlock` is the largest piece of it. This is Epic 5 retro action 48, due before story 6.1.

**Approach:** a behavior-preserving extraction, like Epic 4's item 41:
- One shared `CardNoteItem` component and its CSS module render the `<li>`, used by both lists.
- `CardNotesBlock` moves out of `BookDetailPage.tsx` into its own file next to the page.
- `blockNotes` moves next to `BLOCK_NOTES` in `lib/cardNotes.ts`.

## Boundaries & Constraints

**Always:**
- **No change a user can see or hear:** roles, accessible names, copy, focus targets, announcement order and the computed look stay the same on both pages. That includes Book detail's 6-line clamp while its search is empty, and Edit at the card's bottom in the grid.
- **One DOM difference is allowed:** the clamp flag moves from the `<ul>`'s `data-clamped` to the item (a `clamped` prop), so the shared CSS module owns the clamp rule. CSS-module class names change, since they are hashed per module.
- **The existing tests pass unchanged.** The only test edit allowed is new unit cases for `blockNotes` in `cardNotes.test.ts`.
- **Format** only the changed files with the pinned Prettier, from inside `frontend/`.

**Never:**
- New features or copy, or changes to any e2e spec.
- Changes to `useCardNoteEditFlow`, `usePileFlow` or `useSearchCount`.
- Moving the block's shared Book detail styles (`.block`, `.blockLabel`, `.none`) out of `BookDetailPage.module.css`, which the other blocks use.

</frozen-after-approval>

## Code Map

- `frontend/src/pages/CardNotesPage.tsx:79-99` -- `Group`'s `<li>` (classes `note`, `noteText`, `pageRef`, `noteEdit`). Edit's handler is `onEdit(note, group.bookId)`; the chip's is `onOpenPile(note.id)`.
- `frontend/src/pages/BookDetailPage.tsx`:
  - l.115-122: `blockNotes`, used at l.244 and l.246.
  - l.124-222: `CardNotesBlock` and its doc comment. The `<li>` is at l.180-200 (classes `cardNote`, `cardNoteText`, `pageRef`, `cardNoteEdit`). The `<ul>` at l.178 carries `data-clamped`.
  - l.418-429: the call site, which stays as it is.
  - After the move, drop the imports only the block used (`Link`, `RefCallback`, `MarkedText`, `SearchTitles`, `cardNotesHeading`, `editNoteName`, `openInPileName`, `pageRef`, `NO_CARD_NOTES`, `noNotesMatchCopy`, `SEARCH_CARD_NOTES`, `noteMatches`, `BLOCK_NOTES`, `cardNotesPath`). Check each against the rest of the file before removing it.
- `frontend/src/pages/BookDetailPage.module.css`:
  - Moves out: l.251-311 (`.cardNote`, `.cardNoteText`, the clamp rule, `.pageRef`, `.cardNoteEdit`).
  - Stays: `.cardNotes` (the 3-column grid), `.noteSearch` and `.seeAll`.
- `frontend/src/pages/CardNotesPage.module.css`:
  - Moves out: l.106-154 (`.note`, `.noteText`, `.pageRef`, `.noteEdit`).
  - Stays: `.notes` (the column). Fix its comment, which points at Book detail's look.
- **The two copies differ only in two places:**
  - Book detail's Edit has `margin-top: auto`, which pins it to the bottom of an equal-height grid cell. In the page's column, the item is only as tall as its content, so the rule is a no-op there and can apply to both.
  - The clamp, which applies on Book detail only.
- `frontend/src/lib/cardNotes.ts:16` -- `BLOCK_NOTES`. `lib/cardNotes.test.ts:67` tests it.
- `frontend/src/components/MarkedText.tsx` and `Button.tsx` -- reused as they are.
- `frontend/e2e/card-notes-pile.spec.ts:489` -- the clamp test, which checks the rendered height. `card-notes.spec.ts`, `edit-card-note.spec.ts` and `card-notes-pile*.spec.ts` find items by role and name only.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/components/CardNoteItem.tsx` and `CardNoteItem.module.css` (new) -- `CardNoteItem({ note, query, editRef, onEdit, onOpenPile, clamped })`:
  - It renders the `<li>`: the text `<p>` with `MarkedText`, the page-ref chip `button` named by `openInPileName`, and an **Edit** `Button` named by `editNoteName`.
  - With `clamped`, the `<p>` gets `data-clamped="true"`.
  - The CSS is one copy of the card, text, clamp, `.pageRef` and Edit rules (Edit with `align-self: flex-start; margin-top: auto`).
  - Add a prose header comment. -- F-A2.
- [x] `frontend/src/lib/cardNotes.ts` and `cardNotes.test.ts` -- move `blockNotes` here, generic over `{ text: string }`, with its comment. Add unit cases: an empty or whitespace query gives the first 3; a query gives every match, ignoring case.
- [x] `frontend/src/pages/CardNotesBlock.tsx` (new) -- move `CardNotesBlock` verbatim with its doc comment, rendering `CardNoteItem` with `clamped={query.trim() === ''}`. It imports `BookDetailPage.module.css` for the block styles, as `CatalogPage.tsx` imports `Bookcase.module.css`. -- F-A1.
- [x] `frontend/src/pages/BookDetailPage.tsx` and `BookDetailPage.module.css` -- import `CardNotesBlock` and `blockNotes`, remove what moved, and drop the unused imports and CSS rules.
- [x] `frontend/src/pages/CardNotesPage.tsx` and `CardNotesPage.module.css` -- `Group` renders `CardNoteItem` (not clamped); remove the moved CSS.

**Acceptance Criteria:**
- Given the refactor, when `npm run check` runs, then it passes with no e2e spec edited.
- Given `frontend/src`, when searched for `openInPileName(` and `editNoteName(`, then only `CardNoteItem.tsx` renders them (plus `lib/` and tests), and `.pageRef` is defined in one CSS module.
- Given `BookDetailPage.tsx`, when read, then it holds no `CardNotesBlock` or `blockNotes` definition, and it is shorter by at least the block (about 110 lines).
- Given the card-note specs, when run with `--repeat-each=3 --retries=0`, then all pass.

## Verification

**Commands:**
- `cd frontend && npx prettier --write <changed files>`, then `npm run check:api` -- expected: green.
- `npm run check` -- expected: green (pytest and the full e2e suite); report any flake.
- `cd frontend && npx playwright test e2e/card-notes.spec.ts e2e/edit-card-note.spec.ts e2e/add-card-note.spec.ts e2e/card-notes-pile.spec.ts e2e/card-notes-pile-keys.spec.ts --repeat-each=3 --retries=0` -- expected: all pass.

## Implementation Notes

- `CardNoteItem` takes `onEdit` and `onOpenPile` as no-argument callbacks; each caller closes over its own arguments (`onEdit(note, group.bookId)` on the page, `onEdit(note)` in the block).
- The clamp rule is now `.text[data-clamped='true']` on the item's `<p>`; the old `.cardNotes[data-clamped]` on the `<ul>` is gone.
- `BookDetailPage.tsx` went from 644 to 529 lines. `npm run check` was green (507 e2e passed, no flakes), and the five card-note specs passed 273/273 with `--repeat-each=3 --retries=0`.
- **Verification after the review patches:** `npm run check` exited 0, with 285 unit tests, 507 e2e tests and smoke all passing. The five card-note specs passed 273/273 with `--repeat-each=3 --retries=0`. No e2e spec was edited.

## Review Triage Log

### 2026-11-11: pass 1

Layers: Blind Hunter (floor N = 5, 10 findings), Edge Case Hunter (none), Verification Gap (2), Spine Check (none; it checked AD-6, AD-7, AD-17 and the Structural Seed conventions).

- **`[low]` `[patch]` `CardNotesBlock.tsx`'s import comment says the block "owns its grid"** (Blind Hunter). `.cardNotes`, `.noteSearch` and `.seeAll` are in `BookDetailPage.module.css`. Reworded.
- **`[low]` `[patch]` The `blockNotes` cases miss the no-match and padded-query branches** (Blind Hunter). Both cases added.
- **`[medium]` `[defer]` Nothing tests that the Card notes page stays unclamped** (Verification Gap; Blind Hunter too). It is real: the page now relies on `clamped`'s default, and the only clamp test opens Book detail. Its fix edits an e2e spec, which the intent's Never excludes, so it goes to `deferred-work.md`.
- **`[low]` `[defer]` Nothing pins Edit to the bottom of Book detail's grid cells** (Verification Gap). It was untested before this change too, and the e2e specs are frozen. Recorded in `deferred-work.md`.
- **`[low]` `[reject]` The "search is empty" rule is computed twice** (Blind Hunter). It was already twice before the change (the `<ul>`'s `data-clamped` and `blockNotes`). A shared helper would add API to a verbatim move.
- **`[low]` `[reject]` `CardNotesBlock` takes both `notes` and `shown`** (Blind Hunter). Its props are unchanged from the verbatim move, and `BookDetail` still needs `shown` for the edit flow's `shownIds`.
- **`[false]` `[reject]` `CardNoteItem` has no test of its own** (Blind Hunter). The frontend unit runner is `node:test` with no DOM. `card-notes.spec.ts` and `card-notes-pile.spec.ts` exercise the chip and Edit names and their handlers on both pages, and the clamp test covers `data-clamped`.
- **`[low]` `[reject]` The 6-line limit is written in several places** (Blind Hunter). The `-webkit-line-clamp` and `line-clamp` pair is as it was, now in one file. The comments describe it.
- **`[low]` `[reject]` The shared CSS comments name their callers' layouts** (Blind Hunter). They record why `margin-top: auto` and the clamp exist, so the comments are useful as they are.
- **`[false]` `[reject]` `margin-top: auto` on Edit changes the Card notes page** (Blind Hunter). `.notes` is a flex column with content-sized items, so there is no free space and the margin is 0. The 507 e2e tests pass.
- **`[false]` `[reject]` The diff omits the spec and `sprint-status.yaml`** (Blind Hunter). The spec is withheld from the blind layers on purpose, and `sprint-status.yaml` is updated at completion (step 5).
