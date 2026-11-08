---
title: 'Story 4.2: See every paused book in Waiting for you'
type: 'feature'
created: '2026-11-08'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '3e5b12ac77986b0c956d881b5eb961955bc5c8ab'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Book paused by a start (Story 3.2) or displaced from Up next (4.1) shows on Home only as a spine. Nothing lists the paused Books, so a Book put down can be forgotten (FR-7).

**Approach:** The home view gains `waiting`, a server-ordered list of every paused Reading except the Up next Book's. Home's side column shows it as a "Waiting for you (N)" pane after Up next. Each row has **Resume**, which opens the Start dialog Home already hosts.

## Boundaries & Constraints

**Always:**
- "Paused" is the shelf role `waiting` (`_role_reading`): the current, unfinished Reading of a Book that is neither Main nor Up next. A Side read and a finished Book's paused re-read count.
- Order is `pausedAt` ascending, then `title_key(title)`, then Book id. The server decides it, and the client renders it in the order given. A paused Reading with `pausedAt: null` (only from a hand-edited or restored file) sorts first and is still listed.
- No cap. The side column grows and the page scrolls. The pane has no inner scroll and no `max-height`.
- The paused-at date never goes on the wire or the screen (NFR6, UX-DR38).
- `percent` comes from the server (`domain.percent`, AD-6).
- The pane is hidden when `waiting` is empty, with or without a Main book. When it isn't empty, it shows with or without a Main book.

**Never:** Pause (4.3), Set as Up next (4.4), non-Main finish (4.5), the sand marker, spine names, the legend or role lines (4.6), Side reads UI (4.7), the library pace scope (Epic 6). No new intent and no change to `start-reading`. No edits to `tokens.css`, `schema.d.ts` by hand, or the spine (drift is deferred).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mixed library | paused Books on different days and on one day, a paused Up next, a Main with an old `pausedAt`, never started, finished | only the paused non-Up-next Books, oldest first; same day by title key ("Émile" = "Emile"), then id | N/A |
| Epic 3 library | Main + paused Dune, `upNextBookId: null` | `waiting` = [Dune]; invariants hold; file unchanged | N/A |
| Nothing paused | no paused Reading, or only a paused Up next | `waiting: []`; no pane | N/A |
| `pausedAt: null` | paused Reading without a date | listed first, then by title key, then id | N/A |
| Resume a row | Main Y, row X | the Start dialog "Resume X?", Purpose prefilled, trade-off lines; Confirm makes X Main at its page; Cancel focuses that row's **Resume** | 503 shows the dialog's existing alert line |

</frozen-after-approval>

## Code Map

- `backend/bookvie/views/models.py` -- add `HomeWaiting` (`id`, `title`, `pages`, `current_page`, `percent`) and `HomeView.waiting: list[HomeWaiting]`. Document the order and "never `pausedAt`".
- `backend/bookvie/views/shelf.py` -- `_waiting(library)`: Books whose `_role_reading` role is `waiting`, sorted by key `(paused_at is not None, paused_at or date.min, title_key(title), id)`. `home()` fills it, and its docstring names it. Reuse `percent` and `title_key`. Don't change `_role_reading`, `_slice_priority` or `ShelfBook`.
- `frontend/src/lib/gauge.ts` (+ `gauge.test.ts` if one exists, else a new one) -- `miniBarValueText(page, pages, percent)` returns "page 120 of 330, 36%". Keep `gaugeValueText` and reuse `gaugePageLine`.
- `frontend/src/components/WaitingPane.tsx` + `.module.css` (new) -- a `section` region named by its `h2` "Waiting for you (N)", styled like `UpNextPane` (the same pane, heading, title, compact and line rules; copy them, don't import another module's CSS). Rows go in a `ul`. Each row has a title `Link` to `/book/<id>` with an id, then a line with a 60×5 bar (`role="progressbar"`, `aria-labelledby` the title id, `aria-valuenow`/`min`/`max` 0–100, `aria-valuetext`; `accent-soft` track, `accent` fill, `forced-color-adjust: none` with `CanvasText` fill), "p.N of M" (`tabular-nums`), and a compact `Button` with the text "Resume" and the name "Resume {title}" that calls `onStart(id, button)`. It returns `null` when the list is empty.
- `frontend/src/pages/HomePage.tsx` -- render `WaitingPane` in `.side` after `UpNextPane`. Rename `startingUpNext` → `starting`, `openStartUpNext` → `openStart`, `cancelStartUpNext` → `cancelStart`. Replace `paneButton` with an `opener` ref holding the clicked element. Cancel focuses `opener` while it is connected, else the existing fallbacks. `UpNextPane` and `MainBookCard` keep their `buttonRef`/`suggestRef`; set the opener from those refs when they open. Update the docblock.
- `frontend/src/components/StartDialog.tsx` -- no change expected. It already reads Book detail for Resume and Purpose and the home view for trade-off lines.
- Tests that change: `backend/tests/test_reading_state_machine.py` `views_agree_with_the_pointers` asserts `[w.id for w in home.waiting]` equals the paused Books minus Up next, sorted (`pausedAt`, title key, id). `frontend/e2e/home.ts` already has the moved helpers. Re-run `up-next.spec.ts`, `home.spec.ts`, `start-reading.spec.ts`, `stale-hand-offs.spec.ts` and `finish-reading.spec.ts`.
- Deferred-work intake: none name story 4.2.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- `HomeWaiting`, `HomeView.waiting`, `_waiting`; then `npm --prefix frontend run api:gen` -- AC-1, AC-4.
- [x] `backend/tests/test_waiting_for_you.py` -- un-skip AC-1 and AC-4. Add the `pausedAt: null` case and an empty-list case.
- [x] `backend/tests/test_reading_state_machine.py` -- assert the list (Code Map).
- [x] `frontend/src/lib/gauge.ts` (+ unit test) -- `miniBarValueText`.
- [x] `frontend/src/components/WaitingPane.tsx`, `.module.css` -- the pane.
- [x] `frontend/src/pages/HomePage.tsx` -- render the pane; generalize the Start-dialog hosting and opener focus.
- [x] `frontend/e2e/waiting-for-you.spec.ts` -- un-skip AC-2, AC-3, AC-5, AC-6, AC-7. Add the checklist's green follow-ups: Cancel returns focus to the row's **Resume** with nothing sent; a Main with a paused Up next shows "*Z* moves to Waiting for you." and *Z* becomes a row after confirming; one row reads "(1)"; static seeds with no pane; the pane comes after Up next; axe on Home with the pane in both themes.
- [x] `README.md` -- Status line: Home lists every paused Book in Waiting for you. Add the spec and ATDD checklist links after 4.1's.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- spine drift: the FR-7 map row should name `views/shelf` home `waiting` and the Waiting pane (AD-6).

**Acceptance Criteria:**
- Given Waiting for you has entries, when Home renders, then the region "Waiting for you (N)" shows each row's serif title link, the 60×5 bar named by the title with `aria-valuetext` "page 120 of 330, 36%", "p.120 of 330" in tabular figures, and **Resume** named "Resume *X*", and the pane shows no date.
- Given a paused Book that is also Up next, when Home renders, then it appears only in Up next, and the "(N)" count excludes it.
- Given many paused Readings, when Home renders, then all rows show, the side column grows and the page scrolls.
- Given another tab pauses or resumes, when this tab regains focus, then the pane and its count update with no warning.

## Implementation Notes

- Files beyond the Code Map: `backend/tests/test_views.py` (`HOME_EMPTY` gains `waiting: []`), `frontend/src/api/views.ts`, `api/index.ts` (export `HomeWaiting`), `api/views.test.ts` (`waiting: []` for `tsc`), and `pages/HomePage.module.css` (`.side` is a flex column with a 16px gap, so the panes stack and the column grows).
- `HomePage.tsx`: `paneButton` became `upNextButton`. The Up next pane and the empty card open through `openStartFromPane`/`openStartFromSuggestion`, which set `opener` from their refs.
- Matrix audit: the 503 row had no covering test, so a `[P1] AC-6` couldn't-save leaf was added to `waiting-for-you.spec.ts`. The dialog stays open with its alert line, focus stays on **Resume**, and the library is unchanged.
- Not covered by a test: a long title clamping in a row (the checklist follow-up; the CSS is the Up next pane's 2-line clamp), and the forced-colors look of the mini bar, which was not checked visually.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-08). Layers: blind-hunter (BH), edge-case-hunter (EC, no findings), verification-gap (VG), spine-check (SC).

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | VG1 | The mini bar's fill width and `aria-valuenow` aren't asserted | medium | Pre-verified: AC-2 checks only `aria-valuetext` and the 60×5 track, so a wrong `style` width passes. | patch (test) |
| 2 | BH11 | The first row has a hairline under the heading | low | The key-home mockup's `.prow:first-of-type{border-top:none;padding-top:0}` and `.prow:last-child{padding-bottom:0}`; `.row` puts a border on every row. Direct CSS correction. | patch |
| 3 | BH3 | README says "Below Up next" | low | It doesn't hold with no Main book, where the Up next pane is hidden (EXPERIENCE.md State Patterns). Direct wording fix. | patch |
| 4 | BH10 | `home()` docstring summary wraps onto two lines | low | Confirmed in the diff. The module's other summaries are one line. Direct correction. | patch |
| 5 | BH12 | The pane CSS copied from `UpNextPane.module.css` has no back-reference | low | The two panes can drift on a later change to one of them. A one-line comment fixes it. | patch |
| 6 | SC1 | The FR-7 map row doesn't name home `waiting` or the pane (AD-6) | low | The code follows the spec, and the spine is out of date. It is already logged as spine drift in `deferred-work.md` by this story. | defer (spine drift, existing entry) |
| 7 | SC1-note | "Spine drift" is capitalized | false | It matches the existing drift entries (`deferred-work.md:385`, `:388`, `:391`), and the gate matches the phrase, not the case. | reject |
| 8 | BH1 | Sprint status is `in-progress` while the spec is `in-review` | false | Step 05 syncs sprint-status to `review`; the run is mid-workflow. | reject |
| 9 | BH2 | README's "with Story 4.1 done" isn't updated | false | The workflow leaves the done count to bmad-code-review, which marks the story `done`. | reject |
| 10 | BH4 | The spec's ACs aren't numbered AC-1..7 like the tests | false | The fix edits this build's spec. The ATDD checklist holds the numbering the trace uses. | reject |
| 11 | BH5 | Code Map ("replace `paneButton`") differs from the code (`upNextButton` + wrappers) | false | The fix edits this build's spec. Implementation Notes record the deviation. | reject |
| 12 | BH6 | The `isConnected` fallback after a refetch removes the opener is untested | false | VG traced `e2e/up-next.spec.ts:439`, which fails without the `isConnected` check. | reject |
| 13 | BH7 | Resume from a row with no Main book is untested | false | `[P2] AC-3` resumes a row with no Main book and asserts no "This pauses" line. Cancel focus uses the same `opener` path as the tested Main case. | reject |
| 14 | BH8 | `opener.current` is never cleared | low | Every open path sets it (`openStart`, both wrappers). Clearing it guards a path that doesn't exist. | reject |
| 15 | BH9 | A docstring line in `test_reading_state_machine.py` is 104 columns | false | The file already has many lines over 90 columns (lines 4, 42, 56, 68…), so this matches the file's style. | reject |
| 16 | BH13 | A test reuses a builder after `build()` | low | Test style, with no named failure; `build()` returns a copy. | reject |
| 17 | BH14 | The axe loop doesn't confirm dark mode applied | low | The same `emulateMedia` loop as the other specs' axe checks. Any fix belongs to all of them, not this story. | reject |

## Design Notes

- **Field name `waiting`:** it matches the role `waiting` and `waitingPage`, and the scaffolds pin it.
- **Opener focus:** a ref to the clicked element replaces the single `paneButton`. With many rows, one shared ref would point at the last row rendered. A refetch can remove the row while the dialog is open. In that case `isConnected` is false and focus falls back, as it does today.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, including `test_waiting_for_you.py` and the state machine.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/waiting-for-you.spec.ts e2e/up-next.spec.ts e2e/home.spec.ts e2e/start-reading.spec.ts e2e/stale-hand-offs.spec.ts e2e/finish-reading.spec.ts` -- expected: all pass.
- `npm run check` -- expected: clean (formatters, oxlint, tsc, `schema.d.ts` in sync, coverage).
