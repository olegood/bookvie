---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-08'
storyId: '4.4'
storyKey: '4-4-choose-what-to-read-next'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-44-choose-what-to-read-next'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md'
generatedTestFiles:
  - 'backend/tests/test_set_up_next.py'
  - 'frontend/e2e/set-up-next.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 4 intro and gate; Story 4.4; Story 4.3 for context; Conventions for every story: TR8)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-9: main_cannot_be_up_next, and set-up-next for the current Up next is a 200 no-op that commits nothing)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states table and rules 2 and 5; Spine popover; Book detail actions; Live regions; State Patterns → Couldn''t save; Flow 3)'
  - '_bmad-output/implementation-artifacts/epic-4-context.md (displacement rule; refusal codes; focus after close; 4.3 and 4.4 reuse the 4.1 displacement rule)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (4-1 to 4-3 done; 4-4 backlog)'
  - '_bmad-output/test-artifacts/test-design-qa.md (RDG-API-003 P1, RDG-UNIT-002, XUI-E2E-001, R-01)'
  - '_bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md (format and conventions)'
  - 'backend/bookvie/intents/pause.py, intents/contract.py, intents/commit.py, store/store.py (apply), http/api.py (pause route)'
  - 'backend/tests/test_pause.py, helpers.py (FaultyFs, RecordingFs), builder.py, test_reading_state_machine.py, test_intent_routes.py, test_contract.py'
  - 'frontend/src/pages/BookDetailPage.tsx, components/SpinePopover.tsx, lib/startReading.ts (detailPrimary, popoverStart), lib/catalog.ts (spineName), lib/pause.ts'
  - 'frontend/e2e/fixtures.ts, home.ts, intents.ts, bookcase.ts, pause.spec.ts, spine-popover.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Book that isn''t Main and isn''t already Up next, when I press Set as Up next on its Book detail (a secondary action) or in its spine popover, where it is the primary action when the Book has no Reading, then set-up-next makes it upNextBookId (FR-7), and the status region reads "X is Up next.", and focus moves to Book detail''s primary button (its h1 when there is none), or back to the spine when set from a spine popover' }
  - { id: AC-2, idSource: generated, text: 'Given the current Up next Book, when set-up-next is sent for it again, then the response is 200, nothing changes, and nothing is committed (AD-9)' }
  - { id: AC-3, idSource: generated, text: 'Given a server that answers couldnt_save (a routed 503 in e2e), when I press Set as Up next, then "Couldn''t save. Your data wasn''t changed." appears in an alert line directly below the button, focus stays on the button, and nothing changes (TR9)' }
  - { id: AC-4, idSource: generated, text: 'Given an existing Up next Z, when another Book becomes Up next, then Z moves to Waiting for you if it has a paused Reading, otherwise it returns to the catalog' }
  - { id: AC-5, idSource: generated, text: 'Given an existing Up next, when a spine popover offers Set as Up next, then the hint "Replaces the current Up next." appears under the button' }
  - { id: AC-6, idSource: generated, text: 'Given the Main book, when I look at its actions, then Set as Up next isn''t offered, and set-up-next sent for the Main book is refused with 409 main_cannot_be_up_next (AD-9)' }
  - { id: AC-7, idSource: generated, text: 'Given a paused Book in Waiting for you, when I set it as Up next, then it leaves Waiting for you and appears in Up next with Resume' }
  - { id: AC-8, idSource: generated, text: 'Given a finished Book with no unfinished Reading, or a Side read, when I set it as Up next, then it becomes Up next like any other Book: a finished Book shows Start reading, which starts a re-read, and a Side read stays in On the side as well (EXPERIENCE.md Book states: "Finished, Up next" and "Any of the above, plus Side read")' }
  - { id: AC-9, idSource: generated, text: 'The standard intent ACs (TR8) hold for set-up-next' }
---

# ATDD Checklist - Epic 4, Story 4.4: Choose what to read next

**Date:** 2026-11-08
**Author:** Oleg
**Primary test levels:** API (pytest: the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to set any Book as Up next, so that the Book I mean to read next is ready when the current one is done.

Today Up next moves only as a side effect: `start-reading` makes the interrupted Main book Up next (4.1), and `pause` makes the paused Book Up next (4.3). Nothing lets the user pick a Book for Up next directly.

**What 4.4 adds:**
- **The `set-up-next` intent:** `{"bookId"}` → `upNextBookId`. The previous Up next *Z* is displaced by the 4.1 rule, so only the pointer moves. A paused *Z* lands in Waiting for you; any other *Z* goes back to the catalog.
- **Its refusals and its no-op:** the Main book gets 409 `main_cannot_be_up_next`; a deleted Book gets 409 `book_not_found`; the current Up next gets a 200 that commits nothing (AD-9).
- **Set as Up next on Book detail:** the first secondary action, shown when the Book is neither Main nor Up next.
- **Set as Up next in the spine popover:** the primary action for a never-read Book with no Reading, beside the "Start reading" link. It carries the hint "Replaces the current Up next." when an Up next exists.
- **The outcome:** `status` reads "*X* is Up next.", announced after focus lands. On a 503, the alert line goes directly below the button and focus stays there.

**Not in 4.4:**
- the sky marker and "Up next" in spine names (4.6);
- Mark finished from any page (4.5);
- Side reads, their intents and the On the side pane (4.7).

The AC-8 Side-read case is seeded with `sideReadBookIds` and checked on the stored document.

**Story source:** `epics.md` → Story 4.4. There is no spec file yet: `sprint-status.yaml` has `4-4-choose-what-to-read-next: backlog`.
- When `spec-4-4-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is Epic 4's fourth story, and 4.1 to 4.3 are `done`. Under the per-epic spine policy, spine drift from earlier Epic 4 stories doesn't block it.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 4.2.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the button doesn't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run used **sequential** with one author, as in Stories 1.6 to 4.2, so the seeds stay consistent across both halves.

### Before the leaves: what today's code already does

- **The displacement rule already exists in practice.** `pause` (4.3) sets `upNextBookId` and leaves the old Up next's Readings alone. The home view's `waiting` (4.2) and the shelf role then put a paused *Z* in Waiting for you and an unstarted *Z* back in the catalog. `set-up-next` only has to move the pointer.
- **There is no no-op path in the store.** `Store.apply` always commits. To honor AD-9's "commits nothing", the intent must return before `commit()`, or the store must skip an unchanged document. The scaffold proves it two ways. Under `FaultyFs("write")` it still answers 200 (any write would be a 503). Under `RecordingFs` it logs no rename.
- **The Book detail primary already exists** for every non-Main Book: `detailPrimary()` gives **Resume** or **Start reading**. Since the Main book never offers Set as Up next, focus always has a primary to land on. The `h1` fallback can't be reached through the UI today.
- **The popover's start action** (`popoverStart()`) already renders "Start reading" as a link-styled button for a never-read Book with no role. 4.4 adds **Set as Up next** before it as `button-primary`, and it takes the popover's initial focus.
- **Book detail's 503 slot** already exists for **Pause**: `regionSlot` below the button, with focus kept. Set as Up next can reuse that pattern.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-9, one per Given/When/Then block in source order, with the trailing TR8 line as AC-9. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Book detail **Set as Up next** → `upNextBookId`; focus to the primary, then "*X* is Up next." | E2E | P0 | `[P0] AC-1` |
| AC-2 | The current Up next again: 200, no change, no commit | API | P1 | `test_ac2_p1_…` |
| AC-3 | Routed 503: alert line directly below the button, focus kept, nothing changes | E2E | P1 | `[P1] AC-3` |
| AC-4 | Displacement: a paused *Z* goes to Waiting for you, an unstarted *Z* to the catalog | API | P0 | `test_ac4_p0_…` |
| AC-5 | Popover with an Up next: hint "Replaces the current Up next." under the button | E2E | P2 | `[P2] AC-5` |
| AC-6 | Main book: 409 `main_cannot_be_up_next` (and not offered) | API | P0 | `test_ac6_p0_…` |
| AC-7 | A paused Book in Waiting → Up next with **Resume**, out of Waiting | E2E | P1 | `[P1] AC-7` |
| AC-8 | A finished Book and a Side read become Up next like any other | API | P1 | `test_ac8_p1_…` |
| AC-9 | TR8: faults, `book_not_found`, 422, invariants, contract | API | P0 | `test_ac9_p0_…` |

**Priorities:**
- **P0:**
  - AC-4 is RDG-API-003's displacement half, and R-01. test-design-qa lists RDG-API-003 as P1. This checklist raises it, because the epic gate names it (RDG-API-001..003) and it is the product thesis: no Book is silently dropped.
  - AC-6 is RDG-API-003's other half and a new error code. TR8 requires an API test for it.
  - AC-9 is TR8, P0 in every intent story so far.
  - AC-1 is the story's journey, and it is the only route by which the user picks Up next.
- **P1:**
  - AC-2 is AD-9's no-op.
  - AC-3 is TR9, under XUI-E2E-001's couldn't-save family.
  - AC-7 is Book states rule 2 from the other side.
  - AC-8 covers two Book-states rows ("Finished, Up next" and "… plus Side read").
- **P2:** AC-5 is a hint line.

**Level split (no duplicate coverage):**
- **API** proves what only the server decides:
  - the pointer;
  - where *Z* goes, and that *Z*'s Readings are untouched;
  - the no-op;
  - the refusals;
  - the Side read and the finished Book;
  - TR8.
- **E2E** proves:
  - where the button is and when it shows;
  - the `status` line and that focus lands before it;
  - the 503 line's position and focus;
  - the popover's hint, its description and focus back to the spine;
  - Home's panes after the move.

**Cases that can't fail on today's code:**
- **AC-6's "isn't offered"** can't fail, because no Book offers Set as Up next yet. Its red leaf is the API refusal. The Book detail and popover absence checks are green-phase follow-ups.
- **AC-1's popover route** is in AC-5's leaf: with an Up next, the popover's button takes focus, and pressing it closes the popover and focuses the spine. The no-Up-next popover (no hint) is a green follow-up.
- **AC-8's "Start reading" in the browser** is a green follow-up. The leaf checks what decides it: the home view's `upNext.paused` is `false`, and a `start-reading` then appends a re-read.

---

## Story Integration Metadata

- **Story ID:** `4.4`
- **Story Key:** `4-4-choose-what-to-read-next`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 4.4)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md`
- **Generated Test Files:** `backend/tests/test_set_up_next.py`, `frontend/e2e/set-up-next.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 9 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 9 fail on their criterion assertion, as listed below. Every setup step ran cleanly first: the seeds, the server start, the spine click and the popover opening.

**Skipped as committed:**
- `pytest tests/test_set_up_next.py` gives 5 skipped.
- `playwright test e2e/set-up-next.spec.ts` gives 4 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `tsc -b` passes.

### API Tests (5 tests): `backend/tests/test_set_up_next.py`

**`[P1] AC-2`: `test_ac2_p1_set_up_next_for_the_current_up_next_is_a_200_no_op_that_commits_nothing`**

**Seed:** Dune is Main at p.150; Emma is Up next, never started.
1. **`set-up-next` Emma under `FaultyFs("write")` answers 200** (the first assertion). Any commit would write, and so answer 503.
2. The body is `{"ok": true}`, and `library.json` is byte-identical.
3. Again under `RecordingFs`: 200, and the log is empty (no rename, no delete).

*Red today: `assert 405 == 200`. There is no route.*

**`[P0] AC-4`: `test_ac4_p0_a_new_up_next_displaces_a_paused_z_to_waiting_and_an_unstarted_z_to_the_catalog`**

**Seed:** Dune is Main at p.150. Neuromancer is paused at p.40 since 2026-10-01 and is Up next. Emma and Kindred are never started.
1. **`set-up-next` Emma → the home view's `waiting` ids are `[Neuromancer]`** (the first assertion).
2. The answer is 200 `{"ok": true}`, and the pointers are (Dune, Emma).
   - Neuromancer's stored Book is unchanged, and Emma still has no Readings.
   - The shelf roles are `waiting` for Neuromancer and `upNext` for Emma.
   - Home's `upNext` is Emma with `paused: false`.
   - The invariants hold.
3. **`set-up-next` Kindred:** the pointers are (Dune, Kindred), and Emma is unchanged with shelf role `null` (back in the catalog). `waiting` is still `[Neuromancer]`, and the invariants hold.

*Red today: `assert [] == ['<neuromancer id>']`.*

**`[P0] AC-6`: `test_ac6_p0_set_up_next_for_the_main_book_is_refused_with_main_cannot_be_up_next`**

**Seed:** Dune is Main; Emma is Up next.
1. **The error `code` is `main_cannot_be_up_next`** (the first assertion).
2. The status is 409, `kind` is `refusal`, the message is not empty, and the file is byte-identical.

*Red today: `assert None == 'main_cannot_be_up_next'`. The body is `{"detail": "Method Not Allowed"}`.*

**`[P1] AC-8`: `test_ac8_p1_a_finished_book_and_a_side_read_become_up_next_like_any_other_book`**

**Seed:** Dune is Main. Emma was finished on 2026-04-10, rated 4, and has no unfinished Reading. Kindred is paused at p.60 since 2026-10-01 and is a Side read. There is no Up next.
1. **`set-up-next` Kindred → `upNextBookId` is Kindred** (the first assertion).
2. `sideReadBookIds` is still `[Kindred]`, Dune is still Main, Kindred's Book is unchanged, and the invariants hold. Home's `upNext` is Kindred with `paused: true`, and `waiting` is empty (rule 2).
3. **`set-up-next` Emma:**
   - Up next is Emma, `sideReadBookIds` is still `[Kindred]`, and Emma is unchanged.
   - Home's `upNext` is Emma with `paused: false`, which means **Start reading**.
   - The displaced Kindred is in `waiting`.
4. **`start-reading` Emma** appends a re-read. Emma has two Readings, the finished one is kept as it was, Emma is Main, and the invariants hold.

*Red today: `assert None == '<kindred id>'`.*

**`[P0] AC-9`: `test_ac9_p0_set_up_next_meets_the_standard_intent_acs`**

**Seed:** Dune is Main; Kindred is Up next; Emma is never started.
1. **A `write` fault answers 503** (the first assertion), then `fsync` and `replace`. Each body is `COULDNT_SAVE_BODY`, and the file is byte-identical.
2. A Book that is gone gets 409 `book_not_found`. A malformed `intent` gets 422 `invalid_fields`. Neither changes the file.
3. A success leaves the invariants holding.
4. The OpenAPI document gives `/api/intents/set-up-next` the `ErrorResponse` ref for 409, 422, 500 and 503, with no 413. `ErrorCode` lists `main_cannot_be_up_next`.

*Red today: `assert 405 == 503` (write).*

### E2E Tests (4 tests): `frontend/e2e/set-up-next.spec.ts`

**Seeds** (the spec's own, plus `DUNE` and `LEFT_HAND` from `e2e/home.ts`):
- `DUNE_MAIN`: Dune as the Main book at p.100 of 412.
- `FAHRENHEIT`, `NEUROMANCER`: never started.
- `LEFT_HAND_WAITING`: The Left Hand of Darkness paused at p.120 of 330 since 2026-10-05, with a fixed Reading id.
- `FAHRENHEIT_WAITING`: Fahrenheit 451 paused at p.40 since 2026-10-10.

**`[P0] AC-1` Book detail** (Main: `DUNE_MAIN`; `/book/<Fahrenheit 451>`)
1. **`main` has the button "Set as Up next"** (the first assertion: the criterion's opener).
2. It sits below the primary **Start reading** and above **Edit**.
3. Click → `status` reads "Fahrenheit 451 is Up next.", and **Start reading** is focused. The status watcher saw exactly that line, set while **Start reading** had focus.
4. **Set as Up next** is gone (already Up next). Exactly one `set-up-next` was sent, with `{bookId}`. `library.json` has the pointers (Dune, Fahrenheit 451), and Fahrenheit 451 has no Readings.

*Red today: no button "Set as Up next".*

**`[P1] AC-3` couldn't-save** (`page.route` 503 on `set-up-next`)
1. **The button "Set as Up next" is visible** (the first assertion: the opener).
2. Click → `alert` reads "Couldn't save. Your data wasn't changed.". The line in `main` is below the button and above **Edit**.
3. The button keeps focus, `status` is empty, and `library.json` is byte-identical.

*Red today: no button "Set as Up next".*

**`[P2] AC-5` the popover's hint** (`/catalog`; Main: `DUNE_MAIN`; Up next: `LEFT_HAND`, never started; `NEUROMANCER` with no Reading)
1. Open Neuromancer's spine. **The popover shows "Replaces the current Up next."** (the first assertion).
2. The button "Set as Up next" has that text as its accessible description, and the hint is below it. The button has focus (the primary action), and the "Start reading" button is still there.
3. Click → `status` reads "Neuromancer is Up next.", the popover is hidden, and Neuromancer's spine is focused. The watcher saw the line once, set while the spine had focus. The pointers are (Dune, Neuromancer).

*Red today: no hint text in the popover.*

**`[P1] AC-7` from Waiting for you to Up next** (Main: `DUNE_MAIN`; Waiting: `LEFT_HAND_WAITING`, `FAHRENHEIT_WAITING`; no Up next)
1. **The Left Hand of Darkness's Book detail has "Set as Up next"** (the first assertion: the opener).
2. Click → `status` reads "The Left Hand of Darkness is Up next.", and **Resume** is focused.
3. On Home:
   - the Up next pane has "Resume The Left Hand of Darkness";
   - the heading reads "Waiting for you (1)", and the row titles are `['Fahrenheit 451']`;
   - the Waiting pane has no Resume for The Left Hand of Darkness.
4. The Left Hand of Darkness's stored Book is unchanged: the same page and `pausedAt`. `upNextBookId` is that Book.

*Red today: no button "Set as Up next".*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

- **None changed.** The spec has its own copies of `watchStatus`, `statusSeen`, `routeCouldntSave`, `detailButton`, `topOf` and `bottomOf`, the same as `pause.spec.ts`. That makes three intent specs with these helpers. Move them to a shared `e2e/announce.ts` (or `home.ts`) in the green phase or in 4.5, whichever comes first. The route path argument becomes a parameter.
- **`spineOf(page, "Title by Author")`** matches a spine by its name prefix, so 4.6's ", Up next" status doesn't break it.
- **`SET_UP_NEXT`** is local to the spec. Add it to `e2e/intents.ts` and `backend/tests/helpers.py` with the implementation, then import it in both files.

## Mock Requirements

Only AC-3's `page.route` 503 (TR9). Everything else runs against the real `bookvie`.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The intent** `POST /api/intents/set-up-next`:
- **The request** is multipart, with a JSON part `intent` = `{"bookId": "<id>"}`. A success answers `{"ok": true}`.
- **The checks, in order, inside the commit:**
  1. a missing Book: 409 `book_not_found`;
  2. the Main book: 409 `main_cannot_be_up_next` (a new `ErrorCode`, with an API test);
  3. the Book already Up next: 200 with **no write at all** (AD-9).
- **Otherwise** it sets `upNextBookId` and nothing else. The displaced Book's Readings, `sideReadBookIds` and `mainBookId` don't change.
- **A malformed `intent`** gets 422 `invalid_fields` on `intent`, through `parse_form_intent`.
- **OpenAPI** documents 409, 422, 500 and 503 with `ErrorResponse`, and no 413.

**Book detail:**
- **A `button` named exactly "Set as Up next"** in `main`, shown when `role` is neither `main` nor `upNext`. It is the first secondary action: after the primary (**Start reading** or **Resume**), before **Pause**, **Mark finished** and **Edit**.
- **It applies at once,** with no dialog. The view refetches, focus goes to the primary button (the `h1` if there is none), and only then does `status` read "*X* is Up next.".
- **On a failure,** the `alert` line goes directly below the button, and focus stays on it.

**The spine popover:**
- **For a never-read Book with no Reading and no role,** a `button-primary` named "Set as Up next" comes before the link-styled "Start reading". It takes the popover's initial focus.
- **When an Up next exists,** the hint "Replaces the current Up next." is under the button, and it is the button's accessible description (`aria-describedby`).
- **On success,** the popover closes, focus returns to its spine, and then `status` reads "*X* is Up next.".

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `backend/tests/test_reading_state_machine.py` (RDG-UNIT-002) | Add a `set_up_next` rule. Expect `book_not_found`, then `main_cannot_be_up_next`. The current Up next is a no-op: the bytes are identical and the response is accepted. Otherwise `self.up_next = book_id`, and every Book's stored JSON is unchanged. Update the docstring ("Later intents (set-up-next, …) join"). The epic gate names this test. |
| `backend/tests/test_intent_routes.py` | Add `"set-up-next": {"bookId": DUNE_ID}` to `INTENT_ROUTES`. No `_ready` step is needed: Dune isn't Main. |
| `backend/tests/test_contract.py` | Add `/api/intents/set-up-next` to the envelope `operations` and to `coverless`. Add `main_cannot_be_up_next` to the expected `ErrorCode` enum. |
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen` (`check:api` compares it byte for byte). |
| `frontend/e2e/spine-popover.spec.ts` | Its never-read Neuromancer's popover now opens with focus on **Set as Up next**, not "Start reading". Any leaf that asserts the first focus, the tab order or the action list for an unread Book changes. Re-run it. |
| `frontend/e2e/book-detail.spec.ts`, `pause.spec.ts`, `finish-reading.spec.ts` | Any leaf that pins the Book detail action stack's order or count, or a button's position, sees one more button for non-Main Books. Re-run them. Pause's 503 line positions are taken against **Mark finished**, which is unaffected for the Main book. |
| `frontend/src/lib/startReading.ts` (`popoverStart`) and its unit test | The popover's primary becomes **Set as Up next** for the "Never read, no Reading" row, with "Start reading" kept as the link. Change the doc comment and the unit cases together. |

## Assumptions for the spec to confirm

- **The popover offers Set as Up next only for "Never read, no Reading"**, which is the Book states table's only row with it as the primary. The criterion's "when the Book has no Reading" is read as that row. For "Finished, no Reading" the table says "none (re-read from Book detail)", so Book detail offers it there. A paused Book's popover keeps **Resume** as its only primary. If the spec puts it in more popovers, add a case.
- **The hint is the button's accessible description.** EXPERIENCE.md says only that the hint "appears under the button". `aria-describedby` follows the "Up to 3 side reads." precedent. AC-5 pins it.
- **The message for `main_cannot_be_up_next`** isn't fixed in the docs, so AC-6 checks only that it's not empty. A suggestion: "Your Main book can't be Up next." The UI never shows it, because the button isn't offered. A stale tab could still show it, in the same alert slot as the 503.
- **A stale tab** that sends `set-up-next` for a Book that became Main elsewhere gets the refusal. On the refetch, the button is gone. As with Pause (4.3), the alert line should move to the primary or stay where focus can reach it. No red leaf pins this; it's a green follow-up.
- **The no-op still invalidates the views,** like every intent response. That is harmless, and it makes a second tab catch up.
- **The `h1` fallback** for "no primary" can't be reached through the UI (see "Before the leaves"). There's no leaf for it.

## Open items that bear on this story

- **R-01 / RDG-UNIT-002:** the property test must gain `set-up-next` (table above). It's part of Epic 4's gate.
- **RDG-API-003** (displacement; Main can't be Up next) is covered by AC-4 and AC-6. Tick it in the trace once green.
- **XUI-E2E-001** (couldn't-save on every save surface) gains Set as Up next through AC-3.
- **Spine drift to expect:**
  - ARCHITECTURE-SPINE's Capability → Architecture Map row for FR-7 should name `intents/set_up_next`.
  - AD-9's no-op wording might gain the mechanism the implementation picks: return before `commit()`, or the store skipping an unchanged document.

  Defer both as "spine drift" in the story, as AGENTS.md says.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_set_up_next.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/set-up-next.spec.ts -g "AC-1"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-2, AC-4, AC-6, AC-8, AC-9: the intent
- [x] `intents/contract.py`: `ErrorCode.MAIN_CANNOT_BE_UP_NEXT` and `main_cannot_be_up_next()`. (done: backend/tests/test_set_up_next.py::test_ac6_p0_set_up_next_for_the_main_book_is_refused_with_main_cannot_be_up_next; backend/tests/test_contract.py::test_openapi_error_enums)
- [x] `intents/set_up_next.py`: `SetUpNextIntent`, `parse_set_up_next_intent` and `set_up_next(store, intent)`. Check `book_not_found`, then `main_cannot_be_up_next`. Return before `commit()` when the Book is already Up next. Otherwise set `upNextBookId`. (done: backend/tests/test_set_up_next.py::test_ac2_p1_…, test_ac4_p0_…, test_ac6_p0_…, test_ac9_p0_…)
- [x] `http/api.py`: `POST /intents/set-up-next`, exported from `intents/__init__.py`. Then run `npm --prefix frontend run api:gen`. (done: backend/tests/test_set_up_next.py::test_ac9_p0_set_up_next_meets_the_standard_intent_acs; backend/tests/test_contract.py:344; `check:api` compares `schema.d.ts`)
- [x] Update `test_intent_routes.py`, `test_contract.py` and `test_reading_state_machine.py` (table above). (done: backend/tests/test_intent_routes.py:42; backend/tests/test_contract.py:306, :344, :373; backend/tests/test_reading_state_machine.py `choose_up_next`)
- [x] Activate AC-2, AC-4, AC-6, AC-8 and AC-9. (done: backend/tests/test_set_up_next.py, no skips left)

### AC-1, AC-3, AC-7: Book detail
- [x] A `useSetUpNext` mutation in `api/`, and a **Set as Up next** button on Book detail (the first secondary). It is shown when `role` isn't `main` or `upNext`. On success, wait for the refetched view, focus the primary, then announce "*X* is Up next.". On failure, put the alert line in a slot directly below the button and keep focus there. (done: frontend/src/api/books.ts:150; frontend/e2e/set-up-next.spec.ts:125, :157)
- [x] Activate AC-1, AC-3 and AC-7. (done: frontend/e2e/set-up-next.spec.ts:125, :157, :218)

### AC-5: the spine popover
- [x] `SpinePopover`: for the "Never read, no Reading" row, a `button-primary` **Set as Up next** before the "Start reading" button, with initial focus. When an Up next exists, the hint "Replaces the current Up next." goes under it, wired with `aria-describedby`. The Bookcase needs to know whether any shelf Book has role `upNext`. On success, close the popover with `refocus`, then announce. (done: frontend/e2e/set-up-next.spec.ts:181, :255)
- [x] Activate AC-5. (done: frontend/e2e/set-up-next.spec.ts:181)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1, the popover with no Up next:** no hint, and the button has no description. Pressing it gives the same focus-to-spine and `status`. (done: frontend/e2e/set-up-next.spec.ts:255)
- [x] **AC-1, a Book whose Book detail primary is Resume** (a paused, non-Up-next Book): focus lands on **Resume**. AC-7 covers it; this item just records that AC-7 is the reference. (done: frontend/e2e/set-up-next.spec.ts:218)
- [x] **AC-1, a delayed response** (XUI-E2E-003): while the request is in flight, the button has `aria-disabled="true"`, and a second press sends nothing. (done: frontend/e2e/set-up-next.spec.ts:325 on Book detail; :583 and :629 in the popover, epic 4 retro item 36)
- [x] **AC-3, the popover's 503:** the line is directly below the popover's button, focus stays there, and the popover stays open. (done: frontend/e2e/set-up-next.spec.ts:300)
- [x] **AC-3, a stale tab's refusal** (`main_cannot_be_up_next` or `book_not_found` after another tab acted): the line is shown where focus can reach it, as in Pause's stale-tab amendment (4.3). (done: frontend/e2e/set-up-next.spec.ts:381, :409)
- [x] **AC-6, not offered:** no **Set as Up next** on the Main book's Book detail, or on an Up next Book's Book detail. The Main book's popover has no primary, and an Up next Book's popover keeps **Start reading** or **Resume**. (done: frontend/e2e/set-up-next.spec.ts:282 for Book detail; frontend/e2e/book-states.spec.ts "Never read, Main" (no popover primary) and "Never read, Up next" (Start reading))
- [x] **AC-4, in the browser:** setting a Book as Up next while a paused *Z* is Up next. Home then shows *Z* as a Waiting row, placed by its own `pausedAt`. An unstarted *Z* is in neither pane. (done: frontend/e2e/set-up-next.spec.ts:664, epic 4 retro item 36)
- [x] **AC-8, in the browser:** a finished Book set as Up next shows **Start reading** in the Up next pane, and the Start dialog says "Start *X*?" with no Purpose prefilled. (done: frontend/e2e/set-up-next.spec.ts:694, epic 4 retro item 36)
- [x] **AC-8, Side read** in the On the side pane once 4.7 adds it: still listed after becoming Up next. (done: frontend/e2e/side-reads.spec.ts:306 (both panes); backend/tests/test_set_up_next.py::test_ac8_p1_… (set-up-next keeps `sideReadBookIds`))
- [x] **AC-2, in the browser:** once a Book is Up next, the button isn't offered, so the no-op is reachable only from a stale tab. Two contexts (XUI-E2E-002): tab B still shows the button and presses it. The answer is 200, the `status` line is said, and nothing changes. (done: frontend/e2e/set-up-next.spec.ts:555, epic 4 retro item 36)
- [x] **Refetch on focus** (AD-7): a set-up-next in another tab updates Home's panes and Book detail's actions with no warning. (done: frontend/e2e/set-up-next.spec.ts:720, epic 4 retro item 36)
- [x] **axe** on Book detail with the button, and on the popover with the hint, in both themes. (done: frontend/e2e/set-up-next.spec.ts:356)
- [x] **RDG-UNIT-002:** the `set_up_next` rule (table above). (done: backend/tests/test_reading_state_machine.py `choose_up_next`)
