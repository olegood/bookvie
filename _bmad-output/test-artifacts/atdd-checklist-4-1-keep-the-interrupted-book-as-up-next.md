---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-07'
storyId: '4.1'
storyKey: '4-1-keep-the-interrupted-book-as-up-next'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-41-keep-the-interrupted-book-as-up-next'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md'
generatedTestFiles:
  - 'backend/tests/test_up_next.py'
  - 'frontend/e2e/up-next.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 4 intro and gate; Story 4.1; Conventions for every story: TR8)'
  - '_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md (FR-5, FR-7)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (A2 last write wins, AD-7 refetch on focus, AD-19 Targeting, Deferred: stale-confirmation guard)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states; Microcopy; Section pane; Start dialog; State Patterns; Focus after close; Accessibility Floor → Names)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Main book card — empty; Section pane; Start dialog; Typography)'
  - '_bmad-output/test-artifacts/test-design-qa.md (RDG-API-001, RDG-UNIT-002, RDG-E2E-001, XUI-E2E-002, R-01, R-11)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-4 and 4-1 backlog; every Epic 3 before-Epic-4 item done)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spec-3-1: Up next Book with a paused Reading on Book detail; spec-3-2: start-reading for an Up next Book fails main_not_up_next, dialog mode vs lib/startReading.ts)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md (format, conventions, contract of start-reading)'
  - 'backend/bookvie/intents/start_reading.py, intents/commit.py, views/models.py, views/shelf.py, domain/invariants.py'
  - 'backend/tests/builder.py, helpers.py, test_start_reading.py, test_home_view.py, test_reading_state_machine.py, test_finish_reading.py'
  - 'frontend/src/pages/HomePage.tsx, components/MainBookCard.tsx, StartDialog.tsx, Cover.tsx, lib/startReading.ts, api/queryClient.ts'
  - 'frontend/e2e/fixtures.ts, home.ts, intents.ts, start-reading.spec.ts, finish-reading.spec.ts, finish-moment.spec.ts, stale-hand-offs.spec.ts, backup.spec.ts, home.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Main book Y and no Up next, when I confirm starting another Book X, start-reading pauses Y (recording pausedAt) and sets upNextBookId = Y, in the same commit as starting X (FR-7)' }
  - { id: AC-2, idSource: generated, text: 'Given a Main book Y and an Up next Z that isn''t X, when the Start dialog opens for X, below "This pauses Y at p.120 (64%)." it adds "Z moves to Waiting for you." when Z has a paused Reading, or "Z returns to the catalog." when Z was never started (FR-5, UX-DR39); and confirming makes Y Up next and moves Z exactly as stated' }
  - { id: AC-3, idSource: generated, text: 'Given X is itself the Up next Book, when I start or resume it, it leaves Up next as it becomes Main, and no displacement line is shown' }
  - { id: AC-4, idSource: generated, text: 'Given a Main book and an Up next, when I open Home, the side column''s Up next pane shows the Book with a 44×64 thumbnail (or placeholder), a serif title link, the author, and Start reading or Resume named with the title ("Resume The Left Hand of Darkness"), which opens the Start dialog (UX-DR38); and with a Main book but no Up next, the pane reads "Nothing up next." with a link to Catalog' }
  - { id: AC-5, idSource: generated, text: 'Given no Main book and an Up next, when I open Home, the Up next pane is hidden, and the empty Main book card shows "No Main book." with the Up next Book (thumbnail, title, author) and Start reading or Resume (UX-DR34); and this amends Story 3.6: after finishing the Main book, focus lands on that Start reading or Resume button when an Up next exists, and stays on the "No Main book." heading when none does, with the Story 3.6 e2e test updated to cover both cases' }
  - { id: AC-6, idSource: generated, text: 'Given two browser contexts on the same data, when one starts a Book and the other then regains focus, the second shows the new state after refetching, the last write wins, and no warning appears (R-11, A2)' }
  - { id: AC-7, idSource: generated, text: 'The standard intent ACs (TR8) hold for the extended start-reading' }
---

# ATDD Checklist - Epic 4, Story 4.1: Keep the interrupted book as Up next

**Date:** 2026-11-07
**Author:** Oleg
**Primary test levels:** API (pytest against the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want the Book I was reading to become Up next when an urgent one takes over, so that it is the first thing bookvie offers me once the urgent one is done.

Today `start-reading` pauses the Main book but leaves `upNextBookId` alone (Story 3.2, `intents/start_reading.py`). Nothing sets Up next, Home's side column is an empty `div`, and the empty Main book card always links to the Catalog.

**What 4.1 adds:**
- **`start-reading` moves Up next:** the interrupted Main book becomes Up next in the same commit; an earlier Up next is displaced; the Up next Book itself leaves Up next as it becomes Main.
- **The Start dialog's displacement line:** "*Z* moves to Waiting for you." or "*Z* returns to the catalog.", below the pause line.
- **Home's Up next pane** in the side column, or "Nothing up next." with a Catalog link.
- **The empty Main book card's Up next suggestion,** with focus on its button after a finish (amends Story 3.6).

**Not in 4.1:** Waiting for you (4.2), Pause (4.3), Set as Up next (4.4), Mark finished from any page (4.5), spine names, markers and Book detail role lines (4.6), Side reads and "Which page?" (4.7).

**Story source:** `epics.md` → Story 4.1. There is no spec file yet: `sprint-status.yaml` has `4-1-keep-the-interrupted-book-as-up-next: backlog`.
- When `spec-4-1-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is Epic 4's first story. Every Epic 3 before-Epic-4 item in `sprint-status.yaml` is `done`, including the spine reconciliation (item 23), and every "spine drift" entry in `deferred-work.md` has a `resolved:` line. Nothing blocks the story.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.7.

**Generation mode:** AI generation from the criteria, the PRD, the UX docs and the code. There was no browser recording, because the Up next pane, the card's suggestion and the displacement line don't exist yet. Every locator is a role and name that the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run used **sequential** with one author, as in Stories 1.6 to 3.7, so one author keeps the seeds consistent across both halves: The Left Hand of Darkness at p.212 (64%), Dune paused at p.120, Fahrenheit 451.

### Before the leaves: what today's code already does

- **The model and builder already carry `upNextBookId`** (`Library.up_next_book_id`, `LibraryBuilder.up_next()`, e2e `seedLibrary` with `upNextBookId`).
- **The invariant `main_not_up_next` already guards AC-3.** Starting the Up next Book today fails the commit with 500 `couldnt_save` ("Book … is both Main book and Up next").
- **`ShelfBook.role` is `upNext`, and `_slice_priority` already ranks Up next second** (AD-6). `ShelfBook.current_page` is set for any Book with a current Reading, Up next included.
- **`BookDetailView` gives no `currentReading` for an Up next Book** (`_role_reading` returns `("upNext", None)`). The Start dialog decides Start or Resume from `currentReading`, so today a paused Up next opens as "Start *X*?" (deferred from spec-3-1 and spec-3-2).
- **`HomeView` has no Up next.** The Start dialog reads `home.mainBook` for the pause line and has nothing for the displacement line.
- **Views refetch on `focus` and `visibilitychange`** (`api/queryClient.ts`). A `window` `focus` event is how e2e makes a context "regain focus" (`home.spec.ts`, `reentry.spec.ts`).

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-7, one per Given/When/Then block in source order. The closing "And the standard intent ACs" line is AC-7. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Main *Y*, no Up next: starting *X* pauses *Y* and sets `upNextBookId` = *Y* in one commit | API | P0 | `test_ac1_p0_…` |
| AC-2 | Main *Y*, Up next *Z* ≠ *X*: "*Z* moves to Waiting for you." or "*Z* returns to the catalog." below the pause line; confirming does exactly that | E2E | P0 | `[P0] AC-2` |
| AC-3 | *X* is Up next: starting or resuming takes it out of Up next; no displacement line | API | P0 | `test_ac3_p0_…` |
| AC-4 | Home's Up next pane: 44×64 thumbnail, serif title link, author, **Resume** named with the title, opens the Start dialog; otherwise "Nothing up next." with a Catalog link | E2E | P1 | `[P1] AC-4` |
| AC-5 | No Main book: pane hidden; the empty card suggests the Up next Book with **Start reading** or **Resume**; focus after a finish (amends 3.6) | E2E | P1 | `[P1] AC-5` |
| AC-6 | Two contexts: the other shows the new state after focus; last write wins; no warning | E2E | P1 | `[P1] AC-6` |
| AC-7 | TR8 for the extended `start-reading` | API | P0 | `test_ac7_p0_…` |

**Priorities:**
- **P0:** AC-1 and AC-3 (FR-7, R-01: the pointer move is the story, and the AC-3 path is a 500 today), AC-2 (the product thesis: every consequence stated before confirming, and confirming does exactly that), and AC-7 (R-01, R-02: one commit or none, invariants after every success).
- **P1:** AC-4 and AC-5 (Home's presentation of Up next), and AC-6 (R-11, score 4).

**Level split (no duplicate coverage):**
- **API:** the pointers after each branch, fault injection, invariants and `book_not_found`. These are what only the server can prove, or what it proves much more cheaply.
- **E2E:** the dialog's lines, the pane, the card, focus, two contexts, and the stored result of AC-2's journey, read from the data dir's `library.json` once the UI says it's done.
- **AC-3's UI half** (a paused Up next opens "Resume *X*?" and shows no displacement line) is covered as a secondary assertion of AC-4's leaf. The pane's **Resume** opens "Resume The Left Hand of Darkness?", which has no displacement line. The Book detail route is the first green-phase follow-up.
- **AC-5's 3.6 amendment** is a change to an existing test, as the criterion says (`finish-reading.spec.ts` AC-6). See "Existing tests that must change".

---

## Story Integration Metadata

- **Story ID:** `4.1`
- **Story Key:** `4-1-keep-the-interrupted-book-as-up-next`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 4.1)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md`
- **Generated Test Files:** `backend/tests/test_up_next.py`, `frontend/e2e/up-next.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 7 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 7 fail on their criterion assertion, as listed below. Every setup step (seeds, `--fake-today`, Book detail's **Start reading**, the Start dialog, the second browser context) ran cleanly first.

**Skipped as committed:**
- `pytest tests/test_up_next.py` gives 3 skipped.
- `playwright test e2e/up-next.spec.ts` gives 4 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `tsc -b` passes.

### API Tests (3 tests): `backend/tests/test_up_next.py`

**Seeds** (each through `LibraryBuilder`):
- `_fahrenheit`: Fahrenheit 451 (Ray Bradbury, 187 pages) at p.120 with a Purpose.
- `_paused_dune`: Dune (412 pages) paused at p.120 since 2026-10-20, with a Purpose.
- `_main_and_up_next`: Fahrenheit 451 as Main; Dune as Up next, paused or never started; and Emma (400 pages), never started.
- `api_client` pins today to `TODAY` (2026-10-30); `NOW` is `FakeClock(TODAY).now()`.

**`[P0] AC-1`: `test_ac1_p0_starting_another_book_makes_the_interrupted_main_book_up_next_in_the_same_commit`**

**Seed:** Fahrenheit 451 is Main; Dune has never been started; there is no Up next.

The leaf starts Dune, then checks, in order:
1. **`upNextBookId` is Fahrenheit 451** (the first assertion).
2. The response is 200 `{ok: true}`, and `mainBookId` is Dune.
3. Fahrenheit 451's Reading equals its seed except `pausedAt` = today.
4. Dune has one new Reading at page 0, from today, and the invariants hold.

*Red today: `assert None == '<fahrenheit id>'`.*

**`[P0] AC-3`: `test_ac3_p0_starting_or_resuming_the_up_next_book_takes_it_out_of_up_next`**

The leaf runs two cases:
1. **Resume the Up next Book, no Main book.** Seed: Dune paused and Up next. The leaf resumes Dune with its Purpose. **`upNextBookId` is `null`** (the first assertion). The response is 200, Dune is Main, and the same Reading resumes with only `lastProgressUpdate` changed. The invariants hold.
2. **Start the Up next Book, with a Main book.** Seed: Fahrenheit 451 Main, Dune never started and Up next. The leaf starts Dune: the response is 200, Dune is Main, `upNextBookId` is Fahrenheit 451, and Dune has a new Reading at page 0. The invariants hold.

*Red today: `assert '<dune id>' is None`. The commit failed `main_not_up_next` with 500.*

**`[P0] AC-7`: `test_ac7_p0_the_extended_start_reading_keeps_the_standard_intent_guarantees`**

The leaf checks, in order:
1. **Starting the Up next Dune while Fahrenheit 451 is Main gives 200** (the first assertion). Then: `{ok: true}`, the pointers are (Dune, Fahrenheit 451), and the invariants hold.
2. **Displacement.** Starting Emma over a paused or a never-started Up next Dune gives 200 and the pointers (Emma, Fahrenheit 451). Dune's stored Book is byte-for-byte unchanged. The invariants hold.
3. **Faults.** For `write`, `fsync` and `replace`, starting either the Up next Dune or Emma (which displaces Dune) gives 503 with the whole `couldnt_save` body, and `library.json` is byte-identical: one commit or none.
4. **A deleted Book** gives 409 `book_not_found`, and nothing changes.
5. **The contract:** `start-reading` is still in the OpenAPI paths. There is no new error code.

*Red today: `assert 500 == 200`.*

### E2E Tests (4 tests): `frontend/e2e/up-next.spec.ts`

**Seeds** (the spec's own, plus `DUNE` and `LEFT_HAND` from `e2e/home.ts`):
- `LEFT_HAND_MAIN`: The Left Hand of Darkness at p.212 of 330 (64%), with a fixed Reading id.
- `LEFT_HAND_PAUSED`: the same Book paused at p.212 since 2026-10-22, with a Purpose.
- `DUNE_PAUSED`: Dune paused at p.120 since 2026-10-20, with a Purpose and a fixed Reading id.
- `DUNE_MAIN`: Dune at p.100 of 412 (24%).
- `FAHRENHEIT`: Fahrenheit 451 (187 pages), never started.

**`[P0] AC-2` the Start dialog names the displaced Up next, and confirming does it** (`--fake-today`; Main: The Left Hand of Darkness at p.212; Up next: `DUNE_PAUSED`; Fahrenheit 451 never started)
1. Book detail for Fahrenheit 451 → **Start reading** → "Start Fahrenheit 451?".
2. **The dialog contains "Dune moves to Waiting for you."** (the first assertion).
3. That line comes after "This pauses The Left Hand of Darkness at p.212 (64%).". The dialog never says "returns to the catalog", and "Dune" is in a `ui-serif` face.
4. **Start reading** → the "Fahrenheit 451" link in the Main book card is focused. Exactly one `start-reading` was sent.
5. `library.json`: `mainBookId` is Fahrenheit 451 and `upNextBookId` is The Left Hand of Darkness. Its Reading is at p.212 with `pausedAt` = 2026-10-28. Dune's Reading is untouched: p.120, `pausedAt` 2026-10-20, no `finishDate`.

*Red today: the dialog reads "Start Fahrenheit 451?This pauses The Left Hand of Darkness at p.212 (64%).Purpose (optional)Start readingCancel".*

**`[P1] AC-4` the Up next pane** (Main: `DUNE_MAIN`; Up next: `LEFT_HAND_PAUSED`)
1. **`main` has a `region` "Up next"** (the first assertion). It is not inside the Main book card.
2. The `img` "No cover" in it renders at 44×64.
3. The link "The Left Hand of Darkness" goes to `/book/<id>`, in `ui-serif`. The text "Ursula K. Le Guin" is there.
4. The button is named exactly "Resume The Left Hand of Darkness", and there is no "Start reading…".
5. Clicking it opens "Resume The Left Hand of Darkness?", which says "This pauses Dune at p.100 (24%)." and has no displacement line (AC-3's UI half). Cancel.
6. On a second server with Main Dune and no Up next, the pane shows "Nothing up next." and a link whose name contains "Catalog", with `href="/catalog"`. It has no buttons.

*Red today: no "Up next" region.*

**`[P1] AC-5` the empty Main book card suggests Up next** (no Main book; Up next: `LEFT_HAND_PAUSED`; Dune never started)
1. **The Main book card has a button "Resume The Left Hand of Darkness"** (the first assertion).
2. The heading "No Main book." is still there, and "Choose a book in the Catalog" is gone.
3. The `img` "No cover" renders at 44×64. "The Left Hand of Darkness" is in `ui-serif`, with "Ursula K. Le Guin".
4. There is no "Up next" region.
5. Clicking the button opens "Resume The Left Hand of Darkness?" with no "This pauses" line. **Cancel** returns focus to the button.

*Red today: no such button in the card.*

**`[P1] AC-6` two browser contexts** (Main: `LEFT_HAND_MAIN`; Dune never started; no Up next)
1. The second context (`browser.newContext()`) opens Home and shows The Left Hand of Darkness as Main.
2. The first context starts Dune from Book detail and lands on Home.
3. The second context is brought to front and gets a `window` `focus` event.
4. **Its Up next pane has the link "The Left Hand of Darkness"** (the first assertion). Its card shows Dune, the `alert` region is empty, and there is no dialog.
5. **Last write wins:** the second context resumes The Left Hand of Darkness from its pane. The dialog says "This pauses Dune at p.0 (0%).", and confirming makes The Left Hand of Darkness Main and Dune Up next in `library.json`.
6. The first context, on focus, follows: The Left Hand of Darkness is Main, Dune is in the pane, and there is no alert.

*Red today: no "Up next" region in the second context.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

None. The spec reuses `fixtures.ts` (`seededServer`, `browser`), `home.ts` (`serverAtFakeToday`, `storedLibrary`, `storedBook`, `mainBookCard`, `stopAndRemove`) and `intents.ts` (`START_READING`, `requestsTo`).
- **When a second Epic 4 spec needs them:** move `upNextPane`, `startDialog`, `LEFT_HAND_PAUSED` and `DUNE_PAUSED` into `e2e/home.ts`. Stories 4.2 to 4.4 will. `start-reading.spec.ts` has its own `DUNE_PAUSED` and `startDialog`, so fold those in at the same time.
- **The `StoredLibrary` type** in `home.ts` could gain `upNextBookId: string | null`. The scaffolds read it through the index signature.

## Mock Requirements

None. Every leaf runs against the real `bookvie`.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**`start-reading`:** the request and answer are Story 3.2's, unchanged. In the same commit:
- **A Main book *Y* (another Book):** its current Reading gets `pausedAt` = today at its page (3.2), and `upNextBookId` = *Y*.
- **No Main book:** `upNextBookId` stays as it is, unless it is *X*, in which case it becomes `null`.
- ***X* is the Up next Book:** it leaves Up next. The result is *Y* when there is a Main book, else `null`.
- **An earlier Up next *Z* ≠ *X*:** with a Main book it is displaced, which only means it is no longer `upNextBookId`. Its Readings are untouched: a paused *Z* is then in Waiting for you, and a never-started *Z* is back in the catalog (FR-7).
- **No new error code.**

**The home view** (`GET /api/views/home`) gains **`upNext`**: `null` when there is no Up next, or when Up next is the Main book (impossible under `main_not_up_next`). Otherwise it carries `id`, `title`, `authors`, `coverFile`, `hasCover`, and whether the Book has a paused Reading.
- The name of that last field is open. The suggestion is `paused: boolean`, true when the Book has a current, unfinished Reading.
- It decides **Start reading** or **Resume** in the pane and the card, and the dialog's "moves to Waiting for you." versus "returns to the catalog.".

**`BookDetailView` for an Up next Book with a paused Reading** carries its `currentReading`. The `status` value is open; `"upNext"` beside `main`/`waiting` is the suggestion. That way the Start dialog opens "Resume *X*?" with the Purpose prefilled, from any opener. This closes the spec-3-1 and spec-3-2 deferred items.

**The Start dialog:**
- **The displacement line** sits below "This pauses *Y* at p.*N* (*P*%).". It appears only when a Main book *Y* exists and an Up next *Z* ≠ *X* exists. It reads "*Z* moves to Waiting for you." when *Z* has a paused Reading, else "*Z* returns to the catalog.".
- ***Z* is in the serif face,** as *X* and *Y* are.
- **The data comes from the home view:** `mainBook` for *Y*, and `upNext` for *Z*.

**Home's Up next pane:**
- **A `region` named "Up next"** (its section label; DESIGN.md sets it uppercase) in `main`, in the side column, outside the Main book card.
- **Shown only with a Main book.** With an Up next, its one row has:
  - a 44×64 cover thumbnail: an `img` "Cover of *X*", or the `img` "No cover" placeholder;
  - the serif title as a `link` to `/book/<id>`, and the author;
  - a compact button whose visible label is **Start reading** or **Resume** and whose accessible name adds the title: "Resume The Left Hand of Darkness". It opens the Start dialog.
- **Without an Up next** it shows "Nothing up next." and a `link` to `/catalog`. The link's name is open; the scaffold checks only that it contains "Catalog".

**The empty Main book card with an Up next:**
- "No Main book." stays as the heading, and "Choose a book in the Catalog" is replaced by the Up next Book: the 44×64 thumbnail, the serif title, the author, and a `button-primary` named like the pane's ("Resume The Left Hand of Darkness"). It opens the Start dialog.
- **Cancel** returns focus to that button.
- **After a finish** of the Main book with an Up next, Home focuses that button instead of the heading (EXPERIENCE.md → Focus after close: "Home, **Start reading** for the suggested Up next").

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `backend/tests/test_reading_state_machine.py` (RDG-UNIT-002) | `views_agree_with_the_pointers` asserts `library.up_next_book_id is None`. Once `start-reading` sets Up next, that fails on the first start over a Main book. Model the new pointer: after a start, Up next is the previous Main book, `None` if *X* was Up next, unchanged otherwise. `waiting` becomes paused minus Up next, and `upNext` is the Up next Book's role. Update the docstring ("Up next is Epic 4, so none here"). |
| `backend/tests/test_start_reading.py`, `test_finish_reading.py` docstrings | "never assert `upNextBookId`: Story 4.1 decides it" and "`upNextBookId` is not asserted (Story 4.1)". Reword, since 4.1 now decides it. `test_finish_reading.py` should also say that finishing the Main book leaves Up next alone (EXPERIENCE.md: "with Up next suggested"). |
| `frontend/e2e/start-reading.spec.ts` automate `[P1] AC-6 … afterwards Y reads waiting for you, page 120` | Fahrenheit 451 now becomes Up next, not Waiting for you. Its spine name, Book detail line ("Waiting for you, page 120") and **Resume** expectations change. Assert Up next, keeping **Resume** if the Book detail fix above lands. |
| `frontend/e2e/stale-hand-offs.spec.ts` `[P1] F-R2` | After two starts elsewhere, The Left Hand of Darkness is Up next, so its spine is no longer "…, waiting for you" and the popover's **Resume** comes from `popoverStart`, which gives an Up next Book nothing. Either reach it through the Up next pane, or extend `popoverStart` (next row). |
| `frontend/src/lib/startReading.ts` and `startReading.test.ts` | `paused()` and `popoverStart()` treat `upNext` as never paused ("until Epic 4"). Up next Books now arise from every interrupted start. Book states: "Never read, Up next" → **Start reading**; "paused, Up next" → **Resume**. Derive it from `ShelfBook.currentPage`, or from the new `currentReading` for Book detail, from one source, as the spec-3-2 deferred item asks. The spine names and markers stay Story 4.6's. |
| `frontend/e2e/finish-reading.spec.ts` `[P1] AC-6` (Story 3.6) | Required by AC-5. Keep the no-Up-next case ("No Main book." focused), and add a case with an Up next: after **Done**, its **Start reading** or **Resume** button in the card is focused. Add a matching row to `[P1] AC-6 the finished hand-off focuses … once`. |
| `frontend/e2e/home.spec.ts` `[P1] AC-8` | No change: it seeds no Up next, so the card still links to the Catalog. Re-run it. |
| `frontend/src/pages/HomePage.tsx` and `MainBookCard.tsx` comments | "side column (empty until Epic 4)", and the finish hand-off focusing "the heading". Update them with the code. |
| `backend/tests/test_contract.py` | Regenerate `schema.d.ts` with `npm --prefix frontend run api:gen` once `HomeView.upNext` exists (`npm run check:api` compares it). |

## Assumptions for the spec to confirm

- **The card's button carries the title in its name,** like the pane's ("Resume The Left Hand of Darkness"). EXPERIENCE.md → Names allows a name that starts with the visible label and adds the title, and requires it for pane rows. The card's title sits right beside the button, so a bare "Resume" would also meet the rule. If the spec chooses that, change `RESUME_LEFT_HAND` to `'Resume'` in AC-5.
- **The card's title is text, not a link.** DESIGN.md says "serif title in `book-title-md`" and doesn't call it a link. AC-5 uses `getByText`, so the test passes either way.
- **"Never started" means "no current Reading".** FR-7 and the dialog split *Z* into "has a paused Reading" and "was never started". A finished *Z* with no Reading in progress therefore "returns to the catalog". Book states agree: a finished Up next shows **Start reading**.
- **With no Main book, starting *X* leaves a different Up next *Z* in place.** Nothing is interrupted, so nothing takes Up next (FR-7 moves Up next only for an interrupted or paused Main book). There is no displacement line. The green follow-up below pins it.
- **The displacement line is its own paragraph,** after the pause line and before the Purpose field. AC-2 checks only the text order, so either markup passes.
- **`aria-describedby` on the Start dialog** should name both trade-off lines when both show. Today it names only the pause line.
- **No warning across tabs (A2):** the stale-confirmation guard is still deferred (ARCHITECTURE-SPINE → Deferred). A dialog left open in another tab applies to the server's current state when confirmed. The AC-6 leaf proves the no-warning refetch. The stale open dialog is a follow-up.

## Open items that bear on this story

- **R-01** is the epic's top risk. RDG-API-001 (`start-reading` × every EXPERIENCE.md Book-states row) is part of Epic 4's gate. The Up next rows ("Never read, Up next", "Never read, paused, Up next", "Finished, Up next", and "Finished, re-read paused" when Up next) are 4.1's to add to `test_start_reading.py::test_start_reading_across_the_state_matrix`: an `up_next` axis beside `with_main`.
- **RDG-UNIT-002** must cover Up next from this story on (table above). It is also the gate's property test.
- **Side reads in `start-reading`** (`main_not_side_read`, 500 today) belong to Story 4.7. The spec-3-2 deferred item lists them with Up next, but no 4.1 criterion names Side reads.
- **Deferred items this story closes:** spec-3-1 (Book detail's Current reading for a paused Up next) and spec-3-2 (`start-reading` for an Up next Book, and one source for the opener label and the dialog mode). Add `resolved:` lines when the code lands.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_up_next.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/up-next.spec.ts -g "AC-2"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-1, AC-3, AC-7: the intent
- [x] `intents/start_reading.py`: in the same `change`, set `library.up_next_book_id`: *Y* when a Main book was paused, else `None` if it was *X*, else unchanged. Update the module docstring ("`upNextBookId` is untouched (Story 4.1)"). (done: backend/tests/test_up_next.py:test_ac1_p0_…, test_ac3_p0_…; backend/bookvie/intents/start_reading.py:82-109)
- [x] Update `test_reading_state_machine.py` (table above) and run it. (done: backend/tests/test_reading_state_machine.py:108,158-160)
- [x] Activate AC-1, AC-3, AC-7. (done: backend/tests/test_up_next.py:91,122,188, unskipped and passing)

### AC-2: the displacement line
- [x] `views/models.py` and `views/shelf.py`: `HomeView.up_next` (`HomeUpNext`: `id`, `title`, `authors`, `cover_file`, `has_cover`, `paused`). Then `npm --prefix frontend run api:gen`. (done: backend/tests/test_up_next.py:test_ac7_p1_the_home_view_carries_up_next_with_whether_it_is_paused; schema.d.ts in sync per check:api)
- [x] `BookDetailView.current_reading` for a paused Up next Book (`_role_reading`). (done: frontend/e2e/up-next.spec.ts:352 (Up next, paused at page 120; Resume with the Purpose prefilled))
- [x] `StartDialog`: the second trade-off line from `home.data.upNext`, *Z* in the book-title face, and `aria-describedby` covering both lines. (done: frontend/e2e/up-next.spec.ts:99 (serif Z, toHaveAccessibleDescription with both lines))
- [x] Activate AC-2. (done: frontend/e2e/up-next.spec.ts:99)

### AC-4, AC-5: Home
- [x] An `UpNextPane` (section pane) in Home's side column: a `region` "Up next", the row (thumbnail, title link, author, the compact button named with the title), or "Nothing up next." with a Catalog link. Shown only with a Main book. (done: frontend/e2e/up-next.spec.ts:148)
- [x] `MainBookCard` without a Main book: the Up next suggestion instead of the Catalog link, its button a `button-primary`. (done: frontend/e2e/up-next.spec.ts:199)
- [x] Both buttons open the `StartDialog`, and Cancel returns focus to the opener. (done: frontend/e2e/up-next.spec.ts:199 (card), frontend/e2e/up-next.spec.ts:385 (pane))
- [x] After a finish hand-off with an Up next, focus goes to the card's button. Update `finish-reading.spec.ts` AC-6. (done: frontend/e2e/finish-reading.spec.ts:300,692)
- [x] `lib/startReading.ts`: one source for **Start reading** versus **Resume** for an Up next Book (table above). Update `stale-hand-offs.spec.ts` and `start-reading.spec.ts` as listed. (done: frontend/src/lib/startReading.test.ts:15-27; frontend/e2e/stale-hand-offs.spec.ts:72; frontend/e2e/start-reading.spec.ts:485)
- [x] Activate AC-4, AC-5. (done: frontend/e2e/up-next.spec.ts:148,199)

### AC-6: two contexts
- [x] Nothing new beyond AC-4: the views already refetch on focus (AD-7). Activate AC-6. (done: frontend/e2e/up-next.spec.ts:234)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-3 from Book detail:** a paused Up next Book shows **Resume**, its dialog reads "Resume *X*?" with the Purpose prefilled, and there is no displacement line with a Main book present. A never-started Up next shows **Start reading** and "Start *X*?". (done: frontend/e2e/up-next.spec.ts:352 (paused: Resume) and frontend/e2e/up-next.spec.ts:567 (never-started: Start reading, "Start Dune?", automate))
- [x] **AC-2, "*Z* returns to the catalog."** for a never-started Up next (and for a finished one with no Reading in progress). After confirming, *Z* has no role and no Reading changed. (done: frontend/e2e/up-next.spec.ts:295 (never started) and frontend/e2e/up-next.spec.ts:529 (finished, Readings byte-identical, automate))
- [x] **AC-2, no displacement line** with an Up next but no Main book. After confirming, that Up next stays (API: `upNextBookId` unchanged). (done: frontend/e2e/up-next.spec.ts:332; backend/tests/test_up_next.py:250)
- [x] **AC-2, after confirming,** Home's Up next pane shows *Y* with **Resume**, and *Z* is no longer in it. (done: frontend/e2e/up-next.spec.ts:295 (Resume The Left Hand of Darkness, Dune gone from the pane))
- [x] **AC-4, Start reading** in the pane for a never-started Up next, named "Start reading *X*", whose dialog reads "Start *X*?". (done: frontend/e2e/up-next.spec.ts:385)
- [x] **AC-4, the cover thumbnail:** with a cover, an `img` "Cover of *X*" at 44×64 (`attachCover` in `intents.ts`). (done: frontend/e2e/up-next.spec.ts:422)
- [x] **AC-4, a long title** clamps to 2 lines in the pane (DESIGN.md → Section pane). (done: frontend/e2e/up-next.spec.ts:602 (automate))
- [x] **AC-5, Start reading** in the card for a never-started Up next. (done: frontend/e2e/up-next.spec.ts:410)
- [x] **AC-5, the 3.6 amendment:** finish the Main book with an Up next, and the card's button is focused. Without one, "No Main book." is focused. This is in `finish-reading.spec.ts` (table above). (done: frontend/e2e/finish-reading.spec.ts:300 (Up next focused), :692; the no-Up-next case is the existing AC-6 leaf)
- [x] **AC-6, a stale open dialog:** context B opens "Start Fahrenheit 451?" while The Left Hand of Darkness is Main. Context A then starts Dune, and B confirms. The server pauses Dune, makes Dune Up next, and displaces The Left Hand of Darkness to Waiting for you, with no warning (A2). (done: frontend/e2e/up-next.spec.ts:634 (automate; the other tab's start is sent through page.request))
- [x] **AC-7, the home view's `upNext`** in an API test: `null` without Up next, `paused` true or false, and the fields as stored. (done: backend/tests/test_up_next.py:test_ac7_p1_the_home_view_carries_up_next_with_whether_it_is_paused)
- [x] **RDG-API-001's Up next rows** in `test_start_reading.py`'s state matrix (Open items). (done: backend/tests/test_start_reading.py:273-276 (up_next axis none/dune/other))
- [x] **RDG-E2E-001** (UJ-3: trade-off and displacement copy → confirm → Home state): tick it in the trace once AC-2 and the "returns to the catalog." follow-up are green. (done: Epic 4 trace, retro item 37, 2026-11-10: frontend/e2e/up-next.spec.ts:81, :277 and :314 passed in the trace run; see traceability/epic-4-traceability-matrix.md)
- [x] **axe** on Home with the Up next pane, and on the empty card with its suggestion, in both themes. (done: frontend/e2e/up-next.spec.ts:491)
