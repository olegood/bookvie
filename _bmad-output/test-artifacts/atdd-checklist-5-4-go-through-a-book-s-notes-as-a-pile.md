---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-10'
storyId: '5.4'
storyKey: '5-4-go-through-a-book-s-notes-as-a-pile'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-54-go-through-a-books-notes-as-a-pile'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md'
generatedTestFiles:
  - 'backend/tests/test_full_data_round_trip.py'
  - 'frontend/e2e/card-notes-pile.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 5 intro and gate; Story 5.4)'
  - '_bmad-output/implementation-artifacts/epic-5-context.md (Pile; injectable random source; full-data export and restore re-run)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Pile; Card notes list; Book detail → Card notes block; Focus after close; Motion)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Pile; pile-text 17px / 1.6; Card notes list page-ref chip; segmented-control selected treatment)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CRD-E2E-002 "open in pile", CRD-E2E-003, BKP-API-001)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (5-3 done; 5-4 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-3-find-a-note-across-all-my-books.md (format, conventions, seeds)'
  - 'backend/tests/test_restore.py (ac6 round trip, _seed_rich), builder.py, helpers.py'
  - 'frontend/src/pages/CardNotesPage.tsx, pages/BookDetailPage.tsx (CardNotesBlock), lib/cardNotes.ts, styles/tokens.css'
  - 'frontend/e2e/card-notes.spec.ts (seeds, helpers), new-book-panel.spec.ts (scrim), fixtures.ts, home.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Book''s notes, from its group on the Card notes page or its Book detail block, when I choose "Go through as a pile", then a modal named "Card notes pile, X" opens with the page background color over the scrim, showing one note at a time in pile-text with a faint stacked edge, a Close button (text) at the top right, Previous · "N of M" · Next, and an "Order" radio group (Page order · Shuffled) (FR-18, UX-DR50)' }
  - { id: AC-2, idSource: generated, text: 'Given the pile, when I press Next or Previous, then the note changes and a polite live region announces "Note 3 of 7, p.42: text."; and at the first and last notes the inactive button stays focusable with aria-disabled="true", with no wrap; a pile of one note has both disabled' }
  - { id: AC-3, idSource: generated, text: 'Given the Order group, when I pick Shuffled, then the notes are reshuffled once for that change, and "N of M" follows the current order; and picking Page order restores page order' }
  - { id: AC-4, idSource: generated, text: 'Given a search result on the Card notes page or in Book detail''s block, when I open it, then the pile opens in Page order at that note (FR-19)' }
  - { id: AC-5, idSource: generated, text: 'Given any Card notes list (Book detail''s block or the Card notes page, searched or not), when I activate a note''s page ref ("p.42" or "pp.42–45"), a compact chip-style button with the accessible name "Open p.42 in the pile", then the pile opens in Page order at that note (FR-18); and the note''s Edit stays a separate button' }
  - { id: AC-6, idSource: generated, text: 'Given the pile, when I press Close or Esc, then it closes and returns to the list scrolled to the last viewed note, with focus on that note''s Edit; and on Book detail, focus goes to that note''s Edit if it is shown, else to "Go through as a pile"; and the pile has no search and no editing' }
  - { id: AC-7, idSource: generated, text: 'Given a library with Card notes, a paused Reading, an Up next Book and Side reads (seeded with LibraryBuilder), when it is exported and then restored, then library.json and every cover are byte-identical to the originals (BKP-API-001 re-run with full data)' }
---

# ATDD Checklist - Epic 5, Story 5.4: Go through a book's notes as a pile

**Date:** 2026-11-10
**Author:** Oleg
**Primary test levels:** E2E (Playwright against the real `bookvie`) and API (pytest: the app through `TestClient`)

---

## Story Summary

As Oleg, I want to step through a Book's Card notes one at a time, so that I can review what it gave me at my own pace.

5.3 shipped the Card notes page (`/card-notes`, scoped with `?book=<id>`), both Search card notes fields, and Book detail's "See all card notes" link. In 5.3 a page ref is plain text, and a search result opens nothing.

**What 5.4 adds (all on the client: AD-6 says pile order and shuffle belong to the client):**
- **The pile:** a modal named "Card notes pile, *X*" over the Card notes page or Book detail. It shows one note at a time in `pile-text`, with Previous · "N of M" · Next, an "Order" radio group (Page order · Shuffled), **Close**, and a polite live region.
- **"Go through as a pile"** on each group of the Card notes page and in Book detail's block, shown only when the Book has notes.
- **Page refs become chip `button`s** named "Open p.42 in the pile", on the page and in the block, searched or not. Each opens the pile in Page order at that note.
- **Focus after close:** the last viewed note's **Edit**. On Book detail, when that note isn't shown, focus goes to "Go through as a pile".
- **The Epic 5 data gate:** export, then restore, with full data. The result is byte-identical (BKP-API-001 re-run).

**No backend change** is expected, apart from AC-7's test. The pile reads the notes the `card-notes` and `book` views already serve.

**Story source:** `epics.md` → Story 5.4. There is no spec file yet: `sprint-status.yaml` has `5-4-go-through-a-book-s-notes-as-a-pile: backlog`.
- When `spec-5-4-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** 5.4 is **the last story of Epic 5**. Once it is `done`, the next steps are `bmad-testarch-automate` for 5.4, then the Epic 5 retrospective and its before-next-epic items: the trace and gate, and the spine reconciliation. Don't start Epic 6's first story before these (AGENTS.md → Epic boundaries).

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 5.3.

**Generation mode:** AI generation from the criteria, the UX docs and the code. Nothing was recorded in a browser, because the pile and its controls don't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins. The one exception is `group()`, which finds a group of the Card notes page as the `section` holding its `h2`. The 5.3 groups are unnamed sections, and every group's "Go through as a pile" has the same name.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run was **sequential** with one author, as in Stories 1.6 to 5.3, so the seeds stay consistent across both halves.

### Decisions taken with Oleg (2026-11-10)

- **AC-7 is green on arrival.** Story 2.2's `test_restore.py` ac6 already round-trips a library with Card notes, a paused Up next and a Side read, and 5.4 doesn't touch export or restore.
  - So AC-7 gets its own skipped leaf with a fuller Epic 4 and 5 seed, recorded as a regression re-run, not new behavior.
  - It was run un-skipped once, and it passes (below).
- **A change of order restarts at "1 of M"**, both to Shuffled and back to Page order.
- **The pile always holds every note of the Book,** even when it opens from a search result. M is the Book's note count, and N is the note's place in page order among all of them.
- **"Go through as a pile" is a `button`**, because it opens a dialog. It can be styled to match the "See all card notes" link beside it. DESIGN.md's "`link`s" describes the look.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-7, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | "Go through as a pile" opens "Card notes pile, *X*": one note, `pile-text`, Close, Previous · N of M · Next, Order | E2E | P0 | `[P0] AC-1` |
| AC-2 | Next and Previous change the note and announce it; the ends are `aria-disabled` with no wrap; a one-note pile disables both | E2E | P0 | `[P0] AC-2` |
| AC-3 | Shuffled reshuffles once per change, and N of M follows; Page order restores | E2E | P1 | `[P1] AC-3` |
| AC-4 | A search result (page and block) opens the pile in Page order at that note | E2E | P1 | `[P1] AC-4` |
| AC-5 | A page ref is a chip `button` "Open p.42 in the pile", separate from Edit | E2E | P1 | `[P1] AC-5` |
| AC-6 | Close or Esc returns focus to the last viewed note's Edit, or to "Go through as a pile" on Book detail; read-only | E2E | P1 | `[P1] AC-6` |
| AC-7 | Export, then restore, with full data is byte-identical (BKP-API-001 re-run) | API | P0 | `test_ac7_p0_…` |

**Priorities:**
- **P0:**
  - AC-1 and AC-2 are FR-18 itself: the pile and stepping through it.
  - AC-7 is the epic's data gate (R-02).
- **P1:**
  - AC-3 to AC-5 are the order and the entry points. Each reuses AC-1's modal, so its new risk is the starting index.
  - AC-6 is the close. Focus is the risk, and the epic's focus rules are already proven by the dialogs.

**Level split (no duplicate coverage):**
- **API** proves only the export and restore round trip. The pile needs no new server code: the order, the shuffle and the starting note are client decisions (AD-6).
- **E2E** proves everything the user sees:
  - the modal and its name;
  - the controls, the ends, and the live region;
  - the order radio group;
  - the entry points and the index they open at;
  - focus after close.
- **Unit** (`cardNotes.test.ts`, a green-phase follow-up) should prove the shuffle with an injected random source, and the starting index for a note id. The E2E leaf seeds `Math.random` instead.

**Secondary branches (green-phase follow-ups, not separate red leaves):**
- the stacked edge;
- dark theme and forced colors;
- reduced-motion scroll;
- Tab containment;
- axe;
- the unscoped page's per-group openers;
- shuffle unit tests.

The full list is under "Green-phase follow-ups" below.

---

## Story Integration Metadata

- **Story ID:** `5.4`
- **Story Key:** `5-4-go-through-a-book-s-notes-as-a-pile`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 5.4)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md`
- **Generated Test Files:** `backend/tests/test_full_data_round_trip.py`, `frontend/e2e/card-notes-pile.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 7 in all.
- **The backend leaf** has `@pytest.mark.skip(reason=RED)`, and its name carries `ac7_p0`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was run un-skipped once on the current code.
- **The 6 E2E leaves fail.** Each fails at the first control 5.4 adds: the "Go through as a pile" button (AC-1, -2, -3, -6) or a page-ref button (AC-4, -5). Every setup step ran cleanly first: the seeds, the server starts, the navigation, and, for AC-4, the search.
  - AC-5's first assertion is the criterion's own: the page-ref button.
  - The other five reach their criterion through that control, so they fail on the click that opens the pile, just before their first assertion.
- **AC-7 passes un-skipped:** green on arrival, as decided above.

**Skipped as committed:**
- `pytest tests/test_full_data_round_trip.py` gives 1 skipped.
- `playwright test e2e/card-notes-pile.spec.ts` gives 6 skipped.
- `ruff format` and `ruff check` are clean on the new file, and Prettier, `oxlint` and `tsc -b` pass on the spec.

### API Test (1 test): `backend/tests/test_full_data_round_trip.py`

**`[P0] AC-7`: `test_ac7_p0_export_then_restore_with_full_data_is_byte_identical`** (line 188)

**Seed** (`_seed_full`): every state from Epics 3 to 5.
- **Dune** is Main at p.150, with a JPEG cover and five notes stored out of page order: a range, two notes on p.96 a day apart, a multi-line note, and an em-dash note.
- **Neuromancer** is Up next, paused at p.80, with a note.
- **The Left Hand of Darkness** is paused and not Up next, with a range note.
- **Three Side reads:** The Dispossessed, Cien años (with a Spanish note) and Emma.
- **Piranesi** has been read twice (once back-filled), has a user spine color and a PNG cover, and has a note on its last page.
- **Middlemarch** is unread.

1. Export, then restore onto an empty data dir.
2. **`library.json` is byte-identical** (the first assertion).
3. Every cover is byte-identical.
4. The home view's Main book is Dune with `cardNoteCount` 5, and the card-notes view holds 9 notes.
5. Restoring the same export again changes nothing.

*Today: green on arrival (a regression re-run).*

### E2E Tests (6 tests): `frontend/e2e/card-notes-pile.spec.ts`

**Seed** (the spec's own, plus `DUNE` and `LEFT_HAND` from `e2e/home.ts`): 7 notes in 3 Books.
- **Dune:** p.12 "Fear is the mind-killer.", pp.42–45 "A beginning is …", p.96 "The spice must flow.", and p.300 "The mystery of life …".
- **The Left Hand of Darkness:** p.42 and p.151.
- **Neuromancer:** p.3, its only note (the one-note pile).

**`[P0] AC-1` the pile opens** (line 136)
1. Open `/card-notes?book=<Dune>` and click **Go through as a pile**.
2. **The dialog "Card notes pile, Dune" is visible** (the first assertion).
3. It shows one note, "Fear is the mind-killer.", and none of the other three. The note's font is 17px with a 27.2px line height (`pile-text`).
4. Previous, "1 of 4" and Next are there. The "Order" radio group has 2 radios, with Page order checked.
5. **Close** is a text button in the right quarter, above the note.
6. The dialog's background is `page` (light `#F6F4EF`), and its `::backdrop` is the scrim.

*Red today: there is no "Go through as a pile" button.*

**`[P0] AC-2` stepping and the ends** (line 179)
1. Press Next.
2. **`status` in the dialog reads "Note 2 of 4, pp.42–45: A beginning is …"** (the first assertion). It has `aria-live="polite"`, the note shows, and the position reads "2 of 4".
3. Previous → "Note 1 of 4, p.12: …".
4. At 1, Previous has `aria-disabled="true"`. Pressing it keeps focus and stays at "1 of 4".
5. Next three times → 4 of 4. Next is disabled there, pressing it does nothing, and there is no wrap.
6. Neuromancer's pile reads "1 of 1", with both buttons disabled.

*Red today: there is no opener.*

**`[P1] AC-3` Shuffled** (line 228)
1. `Math.random` is seeded (mulberry32, 42).
2. Press Next, then pick Shuffled.
3. **The position reads "1 of 4"** (the first assertion), and Shuffled is checked.
4. Walk forward to 4 and back to 1, reading each announcement. The order holds still while stepping. It holds each note once, and it isn't page order.
5. Page order → "1 of 4", "Fear …", then the page order step by step.

*Red today: there is no opener.*

**`[P1] AC-4` from a search result** (line 284)
1. On `/card-notes`, search "spice", then click **Open p.96 in the pile**.
2. **The position reads "3 of 4"** (the first assertion). "The spice must flow." shows, and Page order is checked.
3. Next shows p.300, which is not a match: the pile holds every note.
4. Esc closes the pile.
5. On Dune's Book detail, search "mystery" in the block → **Open p.300 in the pile** → "4 of 4".

*Red today: there is no page-ref button.*

**`[P1] AC-5` the page-ref chip** (line 315)
1. **In Dune's block, the button "Open pp.42–45 in the pile" reads "pp.42–45"** (the first assertion).
2. Its list item also holds "Edit pp.42–45", and exactly 2 buttons.
3. Click → "2 of 4", "A beginning …", Page order.
4. On `/card-notes`, the Left Hand group's **Open p.42 in the pile** → "Card notes pile, The Left Hand of Darkness", "1 of 2".

*Red today: the page ref is plain text.*

**`[P1] AC-6` closing** (line 347)
1. The viewport is 1280×480. On `/card-notes`, open Dune's group pile and press Next three times (4 of 4), then Esc.
2. **Focus is on "Edit p.300" in Dune's group** (the first assertion). The dialog is hidden, and the Edit is in the viewport.
3. Reopen it. The pile has no searchbox, no textbox, and no Edit or Delete. Close → focus is on "Edit p.12".
4. On Dune's Book detail, open the block's pile and go to 4 of 4. Close → focus is on **Go through as a pile**, because p.300 isn't among the three shown.
5. Reopen it and go to 2 of 4. Esc → focus is on "Edit pp.42–45".

*Red today: there is no opener.*

---

## Data Factories Created

None new. AC-7 seeds through `LibraryBuilder` (TC-1), and the E2E seeds are partials. The ids are fixed literals where a test navigates by them.

## Fixtures and Helpers Created or Changed

- **None changed.**
- **The 5.3 seeds and helpers are copied** into the new spec: `DUNE_WITH_NOTES`, `LEFT_HAND_WITH_NOTES`, `NEUROMANCER`, `searchField` and `cardNotesBlock`. `card-notes.spec.ts` keeps them local.
  - If `bmad-testarch-automate` adds a third card-notes spec, move them into a shared `e2e/cardNotes.ts`.
- **`_seed_full`** is local to the AC-7 file. It overlaps `test_restore.py`'s `_seed_rich`, but stays separate so ac6's assertions keep their smaller seed.

## Mock Requirements

None. Every leaf runs against the real server. AC-3 stubs only `Math.random`, in an init script.

## Required data-testid Attributes

None.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The pile** (a new component, e.g. `components/CardNotesPile.tsx`, with its logic in `lib/cardNotes.ts`):
- **The dialog:** a modal `dialog` (`showModal`, so `::backdrop` is the scrim), named "Card notes pile, *X*" by its title.
  - Its background is `--color-page`, with the `dialog` radius and shadow.
- **The note:** one note at a time, as an element whose text is exactly the note's text, in `pile-text` (17px, line-height 1.6), with the faint stacked edge (two 1px `line` offsets).
- **Close:** a `button` "Close" with a visible text label, at the top right.
- **The controls:** `button`s "Previous" and "Next", with the text "N of M" between them.
  - At either end, the inactive button keeps focus and its shape, has `aria-disabled="true"`, and does nothing when pressed. There is no wrap.
  - A one-note pile disables both.
- **The live region:** a `status` (polite) inside the dialog. After each move it reads "Note N of M, *ref*: *text*", where *ref* is `pageRef()` ("p.42", "pp.42–45").
  - It is set on Next and Previous. Whether it speaks when the pile opens or the order changes is not pinned.
- **Order:** a `radiogroup` named "Order", with `radio`s "Page order" (checked when it opens) and "Shuffled", styled as the segmented control.
  - Any change of order restarts at "1 of M".
  - Shuffled reshuffles once per change. Stepping never reshuffles.
  - The shuffle uses `Math.random` unless a source is injected, so the e2e seed reaches it.
- **Contents:** every note of the Book, in page order (the server's `pageStart`, then `createdAt`), whatever search is active.
  - It is read-only: no search, no fields, no Edit or Delete.
- **Close or Esc:** focus goes to the last viewed note's **Edit** in the list, scrolled into view (`behavior: 'auto'` under reduced motion).
  - On Book detail, that note's Edit if it is among the notes shown, else **Go through as a pile**.

**The openers:**
- **"Go through as a pile":** a `button` per group on the Card notes page (scoped or not), and one in Book detail's block next to "See all card notes". Both are shown only when the Book has notes. It opens at "1 of M".
- **The page ref:** a chip-style `button`, named "Open *ref* in the pile" and reading *ref*. It replaces the plain-text page ref on the Card notes page and in the block, searched or not, and opens in Page order at that note.
  - Each note's list item holds exactly two buttons: the page ref, then Edit.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/e2e/card-notes.spec.ts` | Page refs become buttons. `getByText('p.300', { exact: true })` still matches a button's text, so the assertions should hold. Re-run the axe leaf (`:577`) and the focus-after-delete leaves. |
| `frontend/e2e/edit-card-note.spec.ts`, `add-card-note.spec.ts` | The block gains a page-ref button per note and "Go through as a pile". The Tab-cycle leaves stay inside their dialogs, but re-run them. |
| `frontend/src/lib/cardNotes.ts` | Add `openInPileName(start, end)`, `pileName(title)`, `pileAnnouncement(n, m, note)`, `shuffled(notes, random)` and the starting index, with unit tests. |

None needs an edit until the implementation lands. No backend contract changes, so `api:gen` and `test_contract.py` are unaffected.

## Assumptions for the spec to confirm

- **The announcement doesn't add a period** when the note's text already ends in one. The scaffold expects "Note 2 of 4, pp.42–45: A beginning is the time for taking the most delicate care." Every seeded note ends in ".".
- **The pile's `status` lives inside the dialog,** so it is read while the modal hides the rest of the page. The shell's `status` stays for the list's own messages.
- **Opening from a group's opener starts at "1 of M"** in Page order, whatever the last order was. The order resets each time the pile opens.
- **Pressing an `aria-disabled` end button** changes nothing and keeps focus on it.
- **"Close" at the top right** is checked loosely: its right edge is in the dialog's right quarter, above the note.
- **AC-3's non-page-order check** relies on the seeded `Math.random`. If the chosen shuffle happens to return page order for seed 42, change the seed in the scaffold. Don't weaken the assertion.

## Open items that bear on this story

- **CRD-E2E-002's "open in pile"** is AC-4 here. With 5.3's parts, CRD-E2E-002 is complete. **CRD-E2E-003** (page order, seeded shuffle, next/prev, jump) is AC-1 to AC-5.
- **The block's long-note clamp,** deferred from 5.1 "with 5.3/5.4", is still open. The pile shows the full text, so 5.4's spec is the last place to decide the clamp, or to retire it explicitly in `deferred-work.md`.
- **Spine drift to expect:** none from the pile, which is client-only per AD-6. If the spine's Capability map names a pile view or server shuffle, defer that as "spine drift" in the story (AGENTS.md).
- **Epic 5 closes with this story.** After `done`, run `bmad-testarch-automate`, then the Epic 5 retrospective. Its before-next-epic items include the trace and gate (CRD-API-001, P0 100%, P1 ≥ 95%) and the spine reconciliation.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_full_data_round_trip.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/card-notes-pile.spec.ts -g "AC-1"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-1: the pile
- [x] `lib/cardNotes.ts`: `pileName(title)`, `pileAnnouncement`, `pilePosition(n, m)`, with unit tests. (done: frontend/src/lib/cardNotes.test.ts:203 `pilePosition`, :208 `pileAnnouncement`; `pileName` was removed at the build review because it was unused. The dialog name is composed in `CardNotesPile.tsx` and asserted in frontend/e2e/card-notes-pile.spec.ts:170)
- [x] `components/CardNotesPile.tsx` (+ `.module.css`): a modal `dialog` on `page`, the note in `pile-text` with the stacked edge, Close at the top right, Previous · N of M · Next, and the Order `radiogroup` (segmented style). (done: frontend/e2e/card-notes-pile.spec.ts:170, :872)
- [x] "Go through as a pile" `button` in each group of `CardNotesPage` and in `CardNotesBlock`. (done: frontend/e2e/card-notes-pile.spec.ts:442, :615)
- [x] Activate AC-1. (done: frontend/e2e/card-notes-pile.spec.ts:170)

### AC-2: stepping
- [x] Next and Previous with `aria-disabled` at the ends, no wrap, and the polite `status` inside the dialog. (done: frontend/e2e/card-notes-pile.spec.ts:216)
- [x] Activate AC-2. (done: frontend/e2e/card-notes-pile.spec.ts:216)

### AC-3: order
- [x] `shuffled(notes, random = Math.random)`: a Fisher–Yates shuffle with an injectable source, reshuffled only when the order changes. A change restarts at 1. (done: frontend/src/lib/cardNotes.test.ts:222, :233; frontend/e2e/card-notes-pile.spec.ts:265, :496)
- [x] Unit tests with an injected source: a permutation, deterministic, the input untouched. (done: frontend/src/lib/cardNotes.test.ts:222, :233, :245)
- [x] Activate AC-3. (done: frontend/e2e/card-notes-pile.spec.ts:265)

### AC-5: page refs (do before AC-4)
- [x] Replace the page-ref `<p>` with a chip `button` named `openInPileName(...)` on `CardNotesPage` and in `CardNotesBlock`. It opens the pile at that note's index in the Book's full page-order list. (done: frontend/e2e/card-notes-pile.spec.ts:355; frontend/src/lib/cardNotes.test.ts:199)
- [x] Activate AC-5. (done: frontend/e2e/card-notes-pile.spec.ts:355)

### AC-4: search results
- [x] Opening from a searched list uses the Book's full notes (from the unfiltered view), not the filtered ones. (done: frontend/e2e/card-notes-pile.spec.ts:324, :927)
- [x] Activate AC-4. (done: frontend/e2e/card-notes-pile.spec.ts:324)

### AC-6: closing
- [x] On close, focus goes to the last viewed note's Edit, scrolled into view (`auto` under reduced motion), else "Go through as a pile" on Book detail. Reuse the `editButton` ref maps the edit flow already keeps. (done: frontend/e2e/card-notes-pile.spec.ts:390, :541, :774, :948)
- [x] Cancel any pending search count before opening, as `openEdit` does. (done: frontend/e2e/card-notes-pile.spec.ts:682, :704)
- [x] Activate AC-6. (done: frontend/e2e/card-notes-pile.spec.ts:390)

### AC-7: the full-data round trip
- [x] Activate AC-7. It should pass at once. If it doesn't, the failure is a real export or restore regression: fix it, don't change the seed. (done: backend/tests/test_full_data_round_trip.py:181, green with no seed change)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1, the openers on the unscoped page:** each group's "Go through as a pile" opens that Book's pile. A Book without notes has no group, so it has no opener. (done: frontend/e2e/card-notes-pile.spec.ts:442; a Book without notes has no opener: frontend/e2e/card-notes-pile.spec.ts:615)
- [x] **AC-1, the stacked edge** and the dialog radius and shadow (a screenshot or computed style). Check the dark theme's `page` (`#191B18`) and scrim (`rgba(25, 27, 24, 0.6)`). (done: frontend/e2e/card-notes-pile.spec.ts:872 computed styles; dark `page` and scrim frontend/e2e/card-notes-pile.spec.ts:517)
- [x] **AC-1, forced colors:** the dialog border, the selected radio and the disabled ends stay visible. (done: frontend/e2e/card-notes-pile.spec.ts:834, for the selected segment's `Highlight` bar and the ends' `GrayText`. The dialog border is the UA's forced-colors `CanvasText`, with no rule of ours to pin)
- [x] **AC-1, Tab stays inside the pile** (modal), and focus starts on a sensible control (Next, or Close: decide in the spec). (done: frontend/e2e/card-notes-pile.spec.ts:462, focus on Next)
- [x] **AC-2, the disabled ends' look:** `ink-tertiary` text, the shape kept. (done: frontend/e2e/card-notes-pile.spec.ts:872)
- [x] **AC-3, re-picking the checked radio** doesn't reshuffle. Arrow keys move within the radio group. (done: frontend/e2e/card-notes-pile.spec.ts:496; arrow keys frontend/e2e/card-notes-pile.spec.ts:462)
- [x] **AC-4, a search on a scoped page** opens the same pile. The page's search status doesn't speak over the pile. (done: frontend/e2e/card-notes-pile.spec.ts:927; status frontend/e2e/card-notes-pile.spec.ts:682, :661)
- [x] **AC-5, a range ref's name** reads "Open pp.42–45 in the pile". The chip has a visible focus ring and a 24px target. (done: frontend/e2e/card-notes-pile.spec.ts:355 range name, :528 24px; focus ring is the global `:focus-visible`, and axe passes at frontend/e2e/card-notes-pile.spec.ts:587)
- [x] **AC-6, reduced motion:** the return scroll is instant. A long list (a 30-note Book) scrolls to the note. (done: frontend/e2e/card-notes-pile.spec.ts:774, :803)
- ~~**AC-6, the opener vanished:** a note edited or deleted elsewhere while the pile is open can't happen (the pile is modal), but a refetch that drops the note must still leave focus somewhere sensible.~~ **Retired:** nothing in the app can drop a note while the modal, read-only pile is open. `usePileFlow` already falls through Edit → the group's opener → the `h1` → `#main` (`frontend/src/lib/usePileFlow.tsx`), and the opener path is pinned at frontend/e2e/card-notes-pile.spec.ts:541 and :637.
- [x] **axe** on the open pile (light and dark), and on the list with page-ref chips. (done: frontend/e2e/card-notes-pile.spec.ts:587)
- [x] **Unit:** the starting index for a note id, and the announcement copy for a single page and a range. (done: frontend/src/lib/cardNotes.test.ts:214, :208)
