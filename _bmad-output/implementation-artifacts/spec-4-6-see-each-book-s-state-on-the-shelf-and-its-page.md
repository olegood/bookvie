---
title: "Story 4.6: See each book's state on the shelf and its page"
type: 'feature'
created: '2026-11-09'
status: 'in-review'
baseline_commit: '4e388083b1c67f1bad283dddf3aee7c187620b33'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Spines show only the Main-book marker. An Up next spine is named "…, not read yet" even when its Reading is paused at a kept page. Nothing tests the EXPERIENCE.md Book states table row by row, so a regression in any state's name, popover action, Home pane or Book detail stack would go unnoticed (FR-24, UX-DR24–26, UX-DR43, R-01).

**Approach:** Name every spine from the table, draw one marker per spine by priority (Main, then Up next in sky, then Waiting for you in sand), and add "up next" and "waiting for you" to the legend. Then pin each table row with a seeded API test and an e2e check, and make the property test's "no page lost" rule explicit.

## Boundaries & Constraints

**Always:**
- **Spine status** (the part after "Title by Author, "), built from the server's `role`, `finished`, `currentPage` and `percent`:
  - `role` null: "not read yet" or "finished".
  - `main`: "Main book, 64%" or "finished, re-reading, 12%".
  - `waiting`: "waiting for you, page 120" or "finished, waiting for you, page 40".
  - `upNext` with no Reading in progress (`currentPage` null): "not read yet, Up next" or "finished, Up next".
  - `upNext` paused: "Up next, paused at page 120" or "finished, Up next, paused at page 40".
- **Markers:**
  - At most one 7px dot per spine, with `marker-ring`, centered near the top. The spine gets the `marked` strip offset whenever it has a dot.
  - The dot's color: Main is `spine-unread-text` (as today), `upNext` is `--color-marker-up-next` and `waiting` is `--color-marker-waiting`.
  - The dot stays `aria-hidden` and carries `data-marker="main|upNext|waiting"` for tests. In forced colors it keeps today's Canvas dot with a CanvasText ring.
- **Legend:** after the Main item, add "up next" and "waiting for you", each with a mini dot swatch in its marker color and ring.
- **Delete Confirm role line** for a paused Up next: "It is Up next, paused at p.120." (from `currentReading.currentPage`). Every other role line stays as it is.
- **Property test (RDG-UNIT-002):** add a page ledger as an invariant. Every surviving Reading keeps its `currentPage` unless an accepted `update-page` changed it, or a finish or back-fill set it. Also assert that at most one catalog Book has `role == "main"`.
- No backend production change. The shelf already sends everything the client needs.

**Never:**
- ", on the side", Side-read intents or the On the side pane (those are 4.7's).
- **Add card note** (Epic 5).
- Changing which actions the popover or Book detail offers. They already match the table; this story only tests them.
- The popover's own status line ("finished" / "not read yet") stays as it is.
- No hand edits to `tokens.css` or `schema.d.ts`, and no spine edits (defer drift).

## I/O & Edge-Case Matrix

The rows of the Book states table. Seed each with `LibraryBuilder` or `e2e/library.ts`.

| Row | Spine status | Marker | Popover primary | Home | Book detail stack |
|---|---|---|---|---|---|
| Never read, no Reading | not read yet | — | Set as Up next | — | Start reading · Set as Up next · Mark finished · Edit · Delete |
| Never read, Up next | not read yet, Up next | upNext | Start reading | Up next | Start reading · Mark finished · Edit · Delete |
| Never read, Main | Main book, 64% | main | none | Main card | Pause · Mark finished · Edit · Delete |
| Never read, paused | waiting for you, page 120 | waiting | Resume | Waiting | Resume · Set as Up next · Mark finished · Edit · Delete |
| Never read, paused, Up next | Up next, paused at page 120 | upNext | Resume | Up next only | Resume · Mark finished · Edit · Delete |
| Finished, no Reading | finished | — | none | — | Start reading · Set as Up next · Edit · Delete |
| Finished, Up next | finished, Up next | upNext | Start reading | Up next | Start reading · Edit · Delete |
| Finished, re-reading Main | finished, re-reading, 12% | main | none | Main card | Pause · Mark finished · Edit · Delete |
| Finished, re-read paused | finished, waiting for you, page 40 | waiting | Resume | Waiting | Resume · Set as Up next · Mark finished · Edit · Delete |
| Finished, re-read paused, Up next | finished, Up next, paused at page 40 | upNext | Resume | Up next only | Resume · Mark finished · Edit · Delete |

</frozen-after-approval>

## Code Map

- `frontend/src/lib/catalog.ts:34` `spineStatus`/`spineName`: add the `upNext` branches, which read `currentPage`, then update the docblock. Add `spineMarker(book): 'main' | 'upNext' | 'waiting' | null` (it is the role, but only for the spine's own marker). Unit-test both in `catalog.test.ts`.
- `frontend/src/pages/Bookcase.tsx:219` `spineButton`:
  - `marked` and the dot follow from `spineMarker`; the marker span gets `data-marker` and a per-kind class.
  - Legend (`:357`): two new items.
  - Docblock (`:102`).
- `frontend/src/pages/Bookcase.module.css`:
  - `.marker` (`:233`): add `.markerUpNext` and `.markerWaiting` backgrounds.
  - Legend swatches (`:345`): a dot swatch.
  - Keep the forced-colors rule (`:465`).
- `frontend/src/lib/bookDetail.ts:158-176` `RoledBook`/`roleLine`: add `currentReading` to the Pick; a paused Up next gives the page line. Test in `bookDetail.test.ts`.
- Read only, no change:
  - `frontend/src/lib/startReading.ts` (`detailPrimary`, `popoverStart`), `setUpNext.ts`, `markFinished.ts`;
  - `frontend/src/pages/BookDetailPage.tsx:259-294` (the stack);
  - `backend/bookvie/views/shelf.py:214` `_role_reading`.
- `backend/tests/test_book_states.py` (new):
  - One parametrized test per matrix row (RDG-API-001..003's state rows), seeded with `tests/builder.py`.
  - Asserts, through the view routes: the catalog `role`/`finished`/`currentPage`/`percent`/`waitingPage`; Home's `mainBook`/`upNext` (`paused`)/`waiting` membership; and Book detail's `role`/`currentReading.status`.
- `backend/tests/test_reading_state_machine.py`:
  - Add a `self.pages` ledger (reading id → page): set in `seed`, `update` (accepted) and `finish` (finish and back-fill), and pruned on `delete`.
  - New `@invariant` `no_page_is_lost` comparing each stored unfinished Reading's `currentPage` with the ledger, plus the one-Main check.
  - Update the docstring.
- `frontend/e2e/book-states.spec.ts` (new): one test per matrix row, seeded through `e2e/library.ts`.
  - Open Catalog and assert the spine's exact name and its `data-marker` (or none).
  - Open its popover and assert the primary (or none).
  - On Home, assert the pane (Up next / Waiting for you / Main card / none).
  - On Book detail, assert the button names in the action stack, in order.
  - One legend check: the five item texts.
- `frontend/e2e/set-up-next.spec.ts:70`, `stale-hand-offs.spec.ts:87`, `start-reading.spec.ts:505`: restore exact spine-name asserts where the "Story 4.6's" comments widened them, and drop those comments.
- `README.md`: the Status line gains "see each book's state on its spine"; add the 4.6 spec link after 4.5's.

**Deferred-work intake:**
- `deferred-work.md:382` (an Up next spine named from its paused page): turned into the `spineStatus` task and the matrix rows.
- `deferred-work.md:397` (the Delete Confirm role line carries the page for a paused Up next): turned into the `roleLine` task.
- `deferred-work.md:361` (no test that the finish fill ends on `transitionend`): not in this story. A wall-clock assertion under 1000 ms is load-sensitive (see the story 3.5 flake entry), and the marker work doesn't touch the fill path.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/catalog.ts` (+ test) -- status strings and `spineMarker` -- UX-DR25.
- [x] `frontend/src/pages/Bookcase.tsx`, `Bookcase.module.css` -- markers and legend -- UX-DR24, UX-DR26.
- [x] `frontend/src/lib/bookDetail.ts` (+ test) -- the paused Up next role line -- deferred :397.
- [x] `backend/tests/test_book_states.py` -- every matrix row -- RDG-API-001..003.
- [x] `backend/tests/test_reading_state_machine.py` -- page ledger, one Main -- RDG-UNIT-002, R-01.
- [x] `frontend/e2e/book-states.spec.ts` + the three widened specs -- every matrix row end to end.
- [x] `README.md` -- status line, spec link.

**Acceptance Criteria:**
- Given a Main book, an Up next and a waiting Book on the Catalog bookcase, when it renders, then each spine has exactly one dot of its kind, the others have none, and the legend reads "finished · not read yet · Main book, filled to its % · up next · waiting for you".
- Given a paused Up next, when I open its Delete Confirm, then it reads "It is Up next, paused at p.120.".
- Given a random sequence of the reading intents, when it runs against `domain/`, then no surviving Reading's page differs from the ledger and at most one Book is Main.

## Implementation Notes

- The page ledger covers finished Readings as well as unfinished ones, which is stricter than the Code Map asked. A start appends a Reading at p.0, so the start rule records it. A mutation check (making `pause` zero the page) failed the machine as it should; the change was then reverted.
- `frontend/e2e/delete-book.spec.ts`: two tests expected "It is Up next." for a paused Up next. They now expect the new "It is Up next, paused at p.80.". This file wasn't in the Code Map, but the role-line task made its expectations out of date.
- The e2e reads the popover's primary action as the control focused when the popover opens. With no primary, focus is on "Open book →".
- Marker colors are checked only in the light theme. The forced-colors swatches share the dot's Canvas/CanvasText rule.
- README: the implementer moved the "N of M stories done" count. That count was put back, because code review moves the story to `done`.

## Spec Change Log

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 22 findings — high 0, medium 1, low 16, false 5, maybe-false 0 (spine check: none)
- findings:
  - `[medium]` `[patch]` (verification-gap) The legend's "up next" / "waiting for you" dot swatches are untested: swapping or dropping their classes passes every check — a CSS check of each swatch's background and 7px width was added to the AC-1 legend test.
  - `[low]` `[patch]` (blind) Same root cause as the item above: the legend test checks only text — grouped with it.
  - `[low]` `[patch]` (blind) `SpineMarker`'s doc said "or `null`", but the type excludes null — doc reworded.
  - `[low]` `[patch]` (blind, edge-case) `roleLine` treats any Up next `currentReading` as paused without saying why — a comment now states that an Up next Book's unfinished Reading is always paused (it can't be Main; AD-19).
  - `[low]` `[patch]` (blind) `test_book_states.py` didn't check Book detail's `waitingPage`, which the role line reads — assertion added.
  - `[low]` `[reject]` (blind) The legend's Main item has no dot swatch — it predates this story and matches DESIGN.md's legend ("Main book, filled to its %" with the filled-spine swatch).
  - `[low]` `[reject]` (blind, edge-case) Up next and waiting dots differ only by hue, and look identical in forced colors — DESIGN.md decides this: "Markers never carry meaning alone"; every spine's accessible name states its status, and the forced-colors rule is DESIGN.md's ("Markers get a CanvasText ring"). A shape change would be a design change.
  - `[low]` `[reject]` (blind) No dark-theme dot colors or axe pass — the dark values are `tokens.css` copies, which `app-shell.spec.ts` compares with DESIGN.md; the dots are `aria-hidden` decoration.
  - `[low]` `[reject]` (blind) Home's slice markers are untested — the slice and Catalog render the same `spineButton`, and the markers come only from `spineMarker`; Catalog's checks cover that path.
  - `[low]` `[reject]` (blind) Book detail's status text isn't pinned per row — `currentReadingStatus` predates this story and has unit tests; the 4.6 ACs pin the action stack.
  - `[low]` `[reject]` (blind) "paused at page 0" has no copy decision — it follows the matrix's rule for any paused page, and Book detail's existing "Up next, paused at page N" status says the same.
  - `[low]` `[reject]` (blind, edge-case) The one-Main assertion is tautological (a single pointer) — true by construction; it documents the AC's "never more than one Main book", and the one-unfinished-Reading check sits beside it.
  - `[low]` `[reject]` (blind) No ledger reset for a whole-library replacement — no such rule is in the machine; one added later fails loudly where it is added.
  - `[low]` `[reject]` (blind) The `actionStack` locator goes through Delete's parent — test-only, and a layout change fails loudly with a clear diff.
  - `[low]` `[reject]` (blind) The README says "sky"/"sand", and the legend's "up next" is lowercase — plain color words; the legend's casing is DESIGN.md's ("up next · waiting for you").
  - `[low]` `[reject]` (verification-gap other, edge-case) The ledger takes update and back-fill pages from the observed state — the assertions just before pin those values against the model; the ledger polices the rules that must not move a page.
  - `[false]` `[reject]` (edge-case) A `waiting` role with `waitingPage` null, or `main` with `percent` null, would draw a dot with no status — unreachable: the server sets `waitingPage` whenever the role is `waiting`, and `check_invariants` requires the Main book to have an unfinished Reading, so `percent` is set.
  - `[false]` `[reject]` (edge-case) `roleLine` would say "paused" for a non-paused Up next Reading — the invariants forbid it: Up next is never Main, so its unfinished Reading is paused by AD-19's definition.
  - `[false]` `[reject]` (edge-case) The task list says "three widened specs" but four were touched — the fix would be a spec edit; Implementation Notes already record `delete-book.spec.ts`.
  - `[false]` `[reject]` (blind) The Bookcase docblock's "the legend names all three" is wrong — the legend does name all three states (Main, up next, waiting for you).
  - `[false]` `[reject]` (blind) `spineMarker` "applies the priority" is misdocumented — its doc says the server's role already applies it, which is accurate; `test_book_states.py`'s paused-Up-next rows pin the priority (role `upNext`, not `waiting`).

## Design Notes

- **Finished, paused, Up next** isn't spelled out in the table: its row gives "finished, waiting for you, page 40" with the marker "sky if Up next". The name joins the parts the way the other rows do: the read part ("finished") is dropped for a never-read paused Book, then the role part follows. So the name is "finished, Up next, paused at page 40". This also matches Book detail's existing "Up next, paused at page N" status.
- The client reads `currentPage` rather than `waitingPage` for a paused Up next. On the shelf, an Up next Book's unfinished Reading is always paused, since it can't be Main, so that page is the paused page. Adding a field to the wire format would buy nothing.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_book_states.py tests/test_reading_state_machine.py` -- expected: all pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/book-states.spec.ts e2e/bookcase.spec.ts e2e/set-up-next.spec.ts e2e/stale-hand-offs.spec.ts e2e/start-reading.spec.ts e2e/delete-book.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.
