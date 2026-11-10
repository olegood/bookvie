---
title: "Story 5.4: Go through a book's notes as a pile"
type: 'feature'
created: '2026-11-10'
status: 'in-review'
baseline_revision: '24899ea692d793d3a512512196f6529ff3ec7366'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A Book's Card notes can be listed and searched, but not reviewed one at a time, and a page ref or a search result opens nothing. The Epic 5 data gate (export then restore with full data, BKP-API-001) has not been re-run. FR-18, FR-19, FR-23, UX-DR50.

**Approach:** A client-only pile modal (AD-6: order and shuffle belong to the client) opened from "Go through as a pile" (each group on the Card notes page, Book detail's block) and from each note's page ref, now a chip `button`. Un-skip the AC-7 round-trip test. The ATDD checklist's "Contract the Scaffolds Pin" is binding.

## Boundaries & Constraints

**Always:**
- **The pile:** a native `<dialog>` opened with `showModal()` (`::backdrop` = `--color-scrim`), role `dialog`, named by its `h2` "Card notes pile, *X*" (title in `<em>`). Background `--color-page`, `radius-lg`, `shadow-overlay`, `hairline` `line` border. A **Close** `button-secondary` with the text "Close" at the top right, beside the `h2`. Below: one note as a `card-note` (surface, line border, radius-lg) whose text element holds exactly the note text in `pile-text` (17px / 1.6, `pre-wrap`), with a faint stacked edge behind it (two 1px `line` offsets). Then Previous · "N of M" · Next, then the "Order" `radiogroup` with native radios "Page order" (checked at open) and "Shuffled", styled as the segmented control (ViewToggle's selected look: `accent-soft`, weight 600, 2px `accent` bottom bar; Highlight in forced colors).
- **Contents:** every note of the Book, in the server's page order, whatever search is active. On the page, the group's notes from the unfiltered view; on Book detail, `book.cardNotes`. Read-only: no field, no Edit, no Delete.
- **Stepping:** Next and Previous move by one, with no wrap. At an end the inactive button stays focusable with `aria-disabled="true"` (Button's `disabledReason`), keeps its shape, does nothing when pressed and keeps focus; a one-note pile disables both. Focus on open: **Next**.
- **Live region:** a visually hidden `role="status"` `aria-live="polite"` element inside the dialog, empty at open, set in the same render as the move to "Note N of M, *ref*: *text*" (`pageRef`, no period added). The pile does **not** adopt the shell's regions (one `status` in the dialog), and it isn't set on open or on a change of order.
- **Order:** picking Shuffled computes one Fisher–Yates shuffle with `Math.random` (injectable in the helper) and restarts at "1 of M"; stepping never reshuffles; re-picking the checked radio does nothing. Page order restores page order from "1 of M". Each open starts in Page order.
- **Openers:** "Go through as a pile" is a `button` styled as a link: in each group on the Card notes page (scoped or not, after the notes) and in Book detail's block beside "See all card notes"; shown only when the Book has notes (also while a search shows no match). It opens at "1 of M". A page ref is a chip `button` (`chip` look: `surface-inset`, `input-border`, radius full, `meta`, min 24px tall, focus ring) reading the ref and named "Open p.42 in the pile" / "Open pp.42–45 in the pile"; it replaces the plain-text ref on the page and in the block, searched or not, and opens in Page order at that note's index among all the Book's notes. Each note's list item holds exactly two buttons: the page ref, then Edit. Opening cancels any pending search count.
- **Close or Esc:** the pile unmounts; then focus goes to the last viewed note's **Edit** if it is shown, else that Book's "Go through as a pile", else the `h1`; the target is scrolled into view (`block: 'nearest'`, `behavior: 'auto'` under `prefers-reduced-motion: reduce`, else `'smooth'`). Tab and Shift+Tab stay inside the pile, reaching only the checked radio of the group.
- **Block clamp (deferred-work.md:612):** Book detail's block cards clamp the note text to 6 lines while the block's search is empty; while it holds text, no clamp (so every `<mark>` shows). The full text is read in the pile. The Card notes page never clamps.
- **AC-7:** `backend/tests/test_full_data_round_trip.py` un-skipped and green with no seed change; a failure is a real regression to fix.

**Never:**
- No backend or contract change (no `api:gen` diff), no new intent or view, no search in the pile, no URL state for the pile.
- No hand edits to `tokens.css`; no spine edits (drift goes to deferred-work.md).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open from opener | Dune, 4 notes | "1 of 4", p.12 note, Previous `aria-disabled` | — |
| Open from ref | search "spice", Open p.96 | "3 of 4", Page order; Next → p.300 (not a match) | — |
| One note | Neuromancer | "1 of 1", both ends `aria-disabled` | press does nothing |
| Shuffle | Next, then Shuffled | "1 of 4", a permutation; stepping keeps it | — |
| Close from 4 of 4 on Book detail | p.300 not in the three shown | focus "Go through as a pile" | — |
| Close on page, note hidden by search | last note not shown | focus that group's "Go through as a pile" | else `h1` |

</intent-contract>

## Code Map

- `frontend/src/lib/cardNotes.ts` -- add `openInPileName(start, end)` ("Open p.42 in the pile"), `pileName(title)`, `pilePosition(n, m)` ("2 of 4"), `pileAnnouncement(n, m, note)`, `shuffled(notes, random = Math.random)` (Fisher–Yates on a copy), `pileStart(notes, noteId?)` (index, 0 when absent). Tests in `cardNotes.test.ts` (singular/range copy, a permutation, deterministic with an injected source, input untouched, start index).
- `frontend/src/components/CardNotesPile.tsx` (+ `.module.css`, new) -- props `{ title, notes, startNoteId?, onClose(lastNoteId) }`. Lifecycle like `useAlertDialog` (`lib/useAlertDialog.ts`): showModal in a layout effect, Esc via `cancel` → `onClose`, native close routed. Either give `useAlertDialog` an `adoptRegions?: boolean` option (default true; the pile passes false) plus the radio-aware Tab cycling (selector skips unchecked radios: no other dialog has radios), or keep a local copy; prefer the option. Buttons via `components/Button.tsx` (`disabledReason` gives `aria-disabled`; reason text e.g. "This is the first note." / "This is the last note."). Segmented look from `components/ViewToggle.module.css` (radios: visually hidden input + label, `:has(:checked)` / `:focus-visible` on the label).
- `frontend/src/lib/usePileFlow.tsx` (new) -- `{ open(title, notes, startNoteId?), pile: ReactNode }`; options `editButton(noteId) => HTMLElement | undefined` and `fallback(bookId) => HTMLElement | null`. On close: store the last note id, unmount, then in an effect focus + scroll the target (refocus counter, as `useCardNoteFlow` does at `lib/useCardNoteFlow.tsx:37-47`).
- `frontend/src/lib/useCardNoteFlow.tsx:131-214` `useCardNoteEditFlow` -- also return `find(noteId)` from its private `buttons` map, so the pile reuses the Edit refs.
- `frontend/src/pages/CardNotesPage.tsx:50-87` `Group` -- page ref `<p>` → chip button (`onOpenPile(note.id)`), add the group's "Go through as a pile" after the list with a ref per bookId; wire `usePileFlow` in `CardNotesBody` (full notes from `groups`, not `shown`), `count.cancel()` before opening. CSS in `CardNotesPage.module.css` (`.pageRef` → chip). Update the docblock.
- `frontend/src/pages/BookDetailPage.tsx:126-185` `CardNotesBlock` -- same chip, the opener beside "See all card notes" (a row), `data-clamped` on the list when the query is blank; `BookDetail` wires `usePileFlow` with `book.cardNotes`, `noteCount.cancel()`. CSS: `.pageRef` chip, `.cardNoteText` 6-line clamp under `[data-clamped]`, the opener styled as a link (shared link-button look; check `styles/base.css` for an existing link style).
- `backend/tests/test_full_data_round_trip.py` -- remove the `skip` and RED wording.
- `frontend/e2e/card-notes-pile.spec.ts` -- `test.skip(` → `test(`, drop RED wording; add follow-ups (Tasks).
- `frontend/e2e/card-notes.spec.ts`, `edit-card-note.spec.ts`, `add-card-note.spec.ts`, `book-detail.spec.ts` -- re-run; adjust only locators the chips and openers move (e.g. button counts, Tab-order cycles).
- `README.md:8` -- Status line adds the pile; after `:207` add the 5.4 spec and ATDD links. Leave the counts alone.
- Deferred-work intake:
  - `deferred-work.md:612` (the block's clamp, "decide with 5.3/5.4") -- in this story: the 6-line clamp while unsearched (Always → Block clamp; AC below). Finalize adds `resolved: Story 5.4, …`.
  - No other open entry names 5.4.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/cardNotes.ts` (+ test) -- the pile helpers.
- [x] `frontend/src/lib/useAlertDialog.ts` -- the `adoptRegions` option and radio-aware Tab cycling (other dialogs unchanged).
- [x] `frontend/src/components/CardNotesPile.tsx` (+ css) -- the modal.
- [x] `frontend/src/lib/usePileFlow.tsx`, `useCardNoteFlow.tsx` (`find`) -- open and close-focus.
- [x] `frontend/src/pages/CardNotesPage.tsx` (+ css) -- chips, openers, pile.
- [x] `frontend/src/pages/BookDetailPage.tsx` (+ css) -- chips, opener, pile, clamp.
- [x] `backend/tests/test_full_data_round_trip.py` -- activate AC-7.
- [x] `frontend/e2e/card-notes-pile.spec.ts` -- activate AC-1..AC-6; add follow-ups: each group's opener on the unscoped page opens its own Book's pile; Tab cycles inside the pile; re-picking Shuffled keeps the order; dark theme `page` (#191B18) and scrim; a page-ref chip is ≥24px tall; closing with the note hidden by a search on the page focuses that group's opener; the block clamps a long note unsearched and not while searching; axe on the open pile (light, dark) and on the list with chips.
- [x] `README.md` -- Status line and links.

**Acceptance Criteria:**
- Given a Book's notes on the Card notes page or Book detail's block, when I choose "Go through as a pile", then the modal "Card notes pile, *X*" opens on `page` over the scrim with one note in `pile-text`, Close at the top right, Previous · "1 of M" · Next and the Order group with Page order checked.
- Given the pile, when I press Next or Previous, then the note and "N of M" change and the pile's polite `status` reads "Note N of M, *ref*: *text*"; the ends are `aria-disabled` with no wrap; a one-note pile disables both.
- Given the pile, when I pick Shuffled, then it restarts at "1 of M" in one fixed permutation while stepping; Page order restores page order from "1 of M".
- Given a list (page or block, searched or not), when I activate a page-ref chip "Open p.42 in the pile" or a search result's chip, then the pile opens in Page order at that note's place among all the Book's notes; its Edit stays a separate button.
- Given the pile, when I press Close or Esc, then focus goes to the last viewed note's Edit (scrolled into view), else that Book's "Go through as a pile", and the pile has no search or editing controls.
- Given Book detail's block with a note longer than 6 lines and an empty search, when it renders, then the card's text is clamped to 6 lines; with text in the search, it is not.
- Given a full-data library (AC-7 seed), when exported then restored, then `library.json` and every cover are byte-identical.

## Spec Change Log

## Review Triage Log

### 2026-11-10 — Review pass
- layers: blind-hunter, edge-case-hunter, verification-gap, intent-alignment, spine-check (none failed; spine-check: no findings).
- verdicts: 28 findings — high 0, medium 1, low 14, false 13, maybe-false 0
- findings:
  - `[false]` `[reject]` (intent) The Card notes page drops "Go through as a pile" when a search hides a group — the opener lives in each group, and 5.3 hides groups with no match; the "also while a search shows no match" rule is the block's, which keeps its opener (now tested).
  - `[low]` `[reject]` (intent) The announcement adds no period, unlike the epic's "…: *text*." — the ATDD assumption decided it; every real note is read as written, and a screen reader pauses at the end anyway.
  - `[false]` `[reject]` (intent) A change of order restarts at "1 of M" rather than "following" — decided with Oleg in the ATDD checklist; "N of M" does follow the current order.
  - `[false]` `[reject]` (intent) The page adds a close-focus fallback the epic names only for Book detail — additive: it applies only when the note's Edit is hidden by a search, and the Edit path is the epic's.
  - `[false]` `[reject]` (intent) A search result's "N of M" counts all the Book's notes — decided with Oleg (the pile holds every note).
  - `[low]` `[patch]` (intent) Spec items without a test: empty status on open and order change, the cancelled count, scroll and styling — the status and cancel gaps are patched with the verification-gap rows below; scroll is covered by AC-6's `toBeInViewport`, styling by AC-1 and the follow-ups.
  - `[false]` `[reject]` (intent) A scaffold locator in AC-5 was changed — `filter({ has })` with a `main`-rooted locator can't match inside a list item; the assertions are unchanged.
  - `[false]` `[reject]` (intent) `sprint-status.yaml` still says backlog — Finalize sets `review` in this commit.
  - `[low]` `[reject]` (blind) The page-ref chip markup and CSS are copied between the page and the block — the two lists already keep separate `card-note` styles (5.3); a shared component is a refactor with no user-visible harm.
  - `[low]` `[patch]` (blind) `pileName` is exported and tested but unused — deleted with its test.
  - `[medium]` `[patch]` (blind) On open a screen reader hears the dialog name and "Next" but not which note is shown — the `<dialog>` now has `aria-describedby` on the note card and "N of M"; AC-1 asserts the description. The `status` stays empty on open.
  - `[low]` `[reject]` (blind) A change of order is silent — the spec's Always rule says the status isn't set on a change of order; the fix edits the spec. The next move announces the new place.
  - `[low]` `[reject]` (blind) Shuffled can return page order (1/M!) — a uniform shuffle is correct; excluding the identity adds a branch, and the AC-3 seed is deterministic, so no flake.
  - `[low]` `[reject]` (blind) A very long note pushes the controls below the fold — the modal `dialog` scrolls (UA overflow), Next has focus and stays reachable; a scroll region on the card would need its own keyboard access.
  - `[false]` `[reject]` (blind) Close does nothing on an empty pile — `usePileFlow.open` never mounts an empty pile, the only way in.
  - `[false]` `[reject]` (blind) The `h1` fallback may not take focus — `PageHeading` renders `tabIndex={-1}`.
  - `[false]` `[reject]` (blind) The Tab trap ignores links and natively disabled controls — no dialog holds a link or a native-disabled button (busy is only on the Backup page); pre-existing selector.
  - `[false]` `[reject]` (blind) `adoptRegions: false` is untested and leaves the shell regions inert under the pile — the default path is unchanged and covered by every dialog's tests; the pile is read-only and cancels the pending count, so nothing writes to the shell regions while it is open.
  - `[false]` `[reject]` (blind) README says "5.1 to 5.3 done" and links an untracked spec — counts are left to bmad-code-review; the spec is committed in Finalize.
  - `[low]` `[reject]` (blind) The new test imports are out of alphabetical order — the list was already unsorted before (`editNoteName` after `seeCardNotesName`); no tool enforces it.
  - `[low]` `[patch]` (blind) `PileNote` hand-copies the API note type — now `Pick<BookCardNote, …>`.
  - `[low]` `[reject]` (blind) Literal sizes in the pile's CSS (560px, 4/8px offsets) — no DESIGN.md token exists for them; `--dialog-width` (440px) is the Confirm dialog's.
  - `[low]` `[patch]` (verification-gap) The pile's status staying empty on open and after a change of order isn't asserted — AC-1 and AC-3 now assert ''.
  - `[low]` `[patch]` (verification-gap) The block's opener during a no-match search, and its absence with no notes, aren't asserted — new leaf: "zzz" keeps the opener, which opens "1 of 4"; Emma's block has none.
  - `[low]` `[patch]` (verification-gap) Opening the pile cancelling a pending count isn't checked — two Playwright-clock leaves (page and block), each shown to fail with its `cancel()` removed.
  - `[low]` `[reject]` (edge-case) The order change swaps the note silently — same as the blind row: the spec forbids setting the status on a change of order.
  - `[false]` `[reject]` (edge-case) An empty sequence makes Close a no-op — unreachable: `open` guards on length.
  - `[false]` `[reject]` (edge-case) `openPile` returns silently when the Book isn't in `groups` — unreachable: chips and openers render from `shown`, a filter of the same `groups`.

## Design Notes

The pile's `status` is its own element, not the shell's `announce()`: `announce` clears and sets after a 100 ms tick, while the scaffold reads the announcement right after "N of M" changes, and the shell's status would make two `status`es in the dialog. The pile is a plain `dialog` (no form submit), and its live region is written by React, so each move speaks once.

Focus after close reuses the edit flow's Edit refs (`find`), so "shown" means exactly the Edits rendered after the search filter and the first-three cut.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_full_data_round_trip.py` -- expected: pass.
- `npm --prefix frontend run test -- cardNotes` (or the unit runner in `frontend/package.json`) -- expected: pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/card-notes-pile.spec.ts e2e/card-notes.spec.ts e2e/edit-card-note.spec.ts e2e/add-card-note.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review (story work: bmad-code-review is the step that marks it `done`).

**Summary.** Story 5.4 adds the Card notes pile, a client-only modal ("Card notes pile, *X*") that shows one note at a time with Previous · "N of M" · Next (no wrap, `aria-disabled` ends), an "Order" radio group (Page order · Shuffled) and its own polite `status`. It opens from "Go through as a pile" (each group on the Card notes page, Book detail's block) and from each note's page ref, now a chip button "Open p.42 in the pile", searched or not, always over every note of the Book. Close or Esc returns focus to the last viewed note's Edit, else the Book's opener, else the `h1`. Book detail's block clamps note text to 6 lines while its search is empty (deferred-work.md:612 resolved). AC-7's full-data export and restore round trip is un-skipped and green with no code change.

**Files changed.**
- `frontend/src/components/CardNotesPile.tsx` (+ css, new): the pile.
- `frontend/src/lib/usePileFlow.tsx` (new): opening and focus after close.
- `frontend/src/lib/cardNotes.ts` (+ test): `openInPileName`, `pilePosition`, `pileAnnouncement`, `shuffled`, `pileStart`, the end-button reasons.
- `frontend/src/lib/useAlertDialog.ts`: `adoptRegions` option; Tab cycling skips unchecked radios.
- `frontend/src/lib/useCardNoteFlow.tsx`: the edit flow also returns `find(noteId)`.
- `frontend/src/pages/CardNotesPage.tsx` (+ css), `BookDetailPage.tsx` (+ css): chips, openers, the pile, the block clamp.
- `backend/tests/test_full_data_round_trip.py`: AC-7 activated.
- `frontend/e2e/card-notes-pile.spec.ts`: six scaffolds activated, eleven follow-ups. `card-notes.spec.ts`: the 5.3 leaf that asserted no pile controls now counts them.
- `README.md`: Status line and the 5.4 links. `deferred-work.md`: the clamp entry resolved.

**Review.** 28 findings: high 0, medium 1, low 14, false 13.
- **Patches applied:** the dialog's `aria-describedby` (note card and position) so opening reads the shown note (medium); `pileName` removed; `PileNote` as `Pick<BookCardNote, …>`; e2e assertions for the empty status on open and order change, the block opener during a no-match search and with no notes, and two clock leaves for the cancelled search count (all low).
- **Deferred:** none. Spine check: no drift.
- **Rejected:** every other finding, each with its reason in the Review Triage Log.

**Follow-up review:** not recommended (`false`). Patched entries by verdict: high 0, medium 1, low 6.

**Verification.**
- `TZ=Europe/Madrid npm run check`: exit 0 before and after the patches. After them: pytest 1320 passed (AC-7 included, not skipped), 488 e2e passed (17 in `card-notes-pile.spec.ts`), plus ruff, Prettier, oxlint, `tsc`, the `api:gen` byte check, the unit tests and the smoke install.
- Matrix audit: every row is covered by a passing e2e leaf (AC-1/AC-2 open and ends, AC-4 from a ref, AC-2 one note, AC-3 shuffle, AC-6 Book detail close, the search-hidden close follow-up).

**For bmad-code-review (residual).**
- **One scaffold locator changed** (AC-5): `filter({ has: ref })` re-rooted at `page`; assertions unchanged.
- **Spec choices to confirm:** the status is silent on open and on a change of order (the dialog description now reads the note on open); focus opens on Next; the pile card also shows the page ref under the text.
- **Rejected, low:** a 2-note Shuffled can come back in page order; a very long note scrolls the dialog rather than the card.
- **Not tested by e2e:** forced colors and the reduced-motion return scroll (CSS and `matchMedia` in place).
- **Epic boundary:** 5.4 is Epic 5's last story. After `done`: `bmad-testarch-automate`, the Epic 5 retrospective, then the trace and gate and the spine reconciliation before Epic 6.
