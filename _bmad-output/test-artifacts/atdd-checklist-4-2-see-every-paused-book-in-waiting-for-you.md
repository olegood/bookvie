---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-08'
storyId: '4.2'
storyKey: '4-2-see-every-paused-book-in-waiting-for-you'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-42-see-every-paused-book-in-waiting-for-you'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md'
generatedTestFiles:
  - 'backend/tests/test_waiting_for_you.py'
  - 'frontend/e2e/waiting-for-you.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 4 intro and gate; Story 4.2; Story 4.1 for context; NFR6)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 the server computes Waiting order; AD-19 Reading fields and status)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states rules 2 and 5; Home → Waiting for you (N); State Patterns: Waiting for you none/one/many, no Main book with Up next; Flow 10; Microcopy: no elapsed time since pause)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Section pane; Book title, small; Section label)'
  - '_bmad-output/implementation-artifacts/epic-4-context.md (Waiting for you definition; server owns selections and same-day ties; Home side column; 4.2 depends on 4.1)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (4-1 done; 4-2 backlog)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spec-4-1 entries; none names Story 4.2)'
  - '_bmad-output/test-artifacts/test-design-qa.md (RDG-API-006 P1, RDG-UNIT-002 P0, RDG-E2E-002 P1, XUI-E2E-005 P2, R-01)'
  - '_bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md (format, conventions, the helper move it planned)'
  - 'backend/bookvie/views/models.py, views/shelf.py, domain/ordering.py (title_key), domain/progress.py (current_reading, reading_status), domain/model.py'
  - 'backend/tests/builder.py, helpers.py, test_up_next.py, test_home_view.py, test_reading_state_machine.py'
  - 'frontend/src/pages/HomePage.tsx, components/UpNextPane.tsx, components/Gauge.tsx, components/StartDialog.tsx'
  - 'frontend/e2e/fixtures.ts, home.ts, intents.ts, up-next.spec.ts, start-reading.spec.ts, home.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given paused Readings, when the home view is computed, Waiting for you lists every paused Reading except the Up next Book''s, ordered by pausedAt, oldest first, with no cap (FR-7, AD-6); and Readings paused on the same day are ordered by the server title key (NFKD, combining marks stripped, casefolded), then by Book id, so the order is the same on every render (unit test with two pauses on one fake day, including titles that differ only by accents)' }
  - { id: AC-2, idSource: generated, text: 'Given Waiting for you has entries, when Home renders, a pane headed "Waiting for you (N)" shows each row''s serif title link, a 60×5 mini progressbar (labeled by the title, aria-valuetext "page 120 of 330, 36%"), "p.120 of 330" in tabular figures, and Resume named with the title; and the paused-at date is never shown (UX-DR38, NFR6)' }
  - { id: AC-3, idSource: generated, text: 'Given no paused Readings outside Up next, when Home renders, the pane is hidden' }
  - { id: AC-4, idSource: generated, text: 'Given a library written under the Epic 3 behavior (Story 3.2), with a paused Reading that isn''t Up next (seeded with LibraryBuilder), when I open Home, that Book is listed in Waiting for you with Resume, and check_invariants() holds' }
  - { id: AC-5, idSource: generated, text: 'Given many paused Readings, when Home renders, all rows are shown, the side column grows and the page scrolls' }
  - { id: AC-6, idSource: generated, text: 'Given a row, when I press Resume, the Start dialog opens as "Resume X?" with its Purpose prefilled and the trade-off lines that apply, and confirming makes it Main at its page (FR-7)' }
  - { id: AC-7, idSource: generated, text: 'Given a paused Book that is also Up next, when Home renders, it appears only in Up next with Resume, never also in Waiting for you, and the "(N)" count excludes it' }
---

# ATDD Checklist - Epic 4, Story 4.2: See every paused book in Waiting for you

**Date:** 2026-11-08
**Author:** Oleg
**Primary test levels:** unit and API (pytest: `views.home()` directly, and the app through `TestClient`), and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want every paused Book listed on Home with its page, oldest first, so that nothing I put down is ever forgotten.

Today the home view has `mainBook` and `upNext` but no list of paused Books. Home's side column holds only the Up next pane (Story 4.1). A paused Book that isn't Up next shows up only as a spine ("…, waiting for you, page 120") and on Book detail.

**What 4.2 adds:**
- **The home view's Waiting for you list:** every paused Reading except the Up next Book's, oldest `pausedAt` first, with no cap. Same-day ties go by the server title key, then by Book id (AD-6: the server orders, the client only presents).
- **Home's "Waiting for you (N)" pane** in the side column. Each row has the serif title link, the 60×5 mini bar, "p.N of M" and **Resume** named with the title. The pane is hidden when the list is empty.
- **Resume from a row** opens the Start dialog that already exists, which Home hosts as it does for the Up next pane.

**Not in 4.2:** Pause (4.3), Set as Up next (4.4), Mark finished from any page (4.5), the sand marker, the spine names and the legend (4.6), Side reads (4.7), and the library pace scope (Epic 6). Those reuse the same definition of Waiting for you, and the Epic 4 context says so.

**Story source:** `epics.md` → Story 4.2. There is no spec file yet: `sprint-status.yaml` has `4-2-see-every-paused-book-in-waiting-for-you: backlog`.
- When `spec-4-2-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is Epic 4's second story. Story 4.1 is `done`. Spine drift entries from 4.1 are reconciled once per epic, so they don't block this story.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 4.1.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the pane doesn't exist yet. Every locator is a role plus a name that the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run used **sequential** with one author, as in Stories 1.6 to 4.1, so the seeds stay consistent across both halves:
- The Left Hand of Darkness at p.120 of 330, which is the criterion's "page 120 of 330, 36%".
- Fahrenheit 451 at p.40 of 187.
- Dune as the Main book at p.100.

### Before the leaves: what today's code already does

- **"Paused" already has one definition.** `reading_status()` says paused for the current, unfinished Reading of a Book that isn't Main (AD-19). `views/shelf.py::_role_reading` already gives such a Book the role `waiting`, unless it is Up next, which wins.
- **`title_key()` already exists** (`domain/ordering.py`: NFKD, combining marks stripped, casefolded). `_slice_priority` uses it, then the Book id, for its ties.
- **Every pause stores `pausedAt`.** Story 3.2's `start-reading` pauses the Main book with `pausedAt` = today, and the date is never cleared (AD-19). A library written under Epic 3 therefore has paused Readings with `pausedAt` and `upNextBookId: null`.
- **Home already hosts the Start dialog** for the Up next pane and the empty card (`startingUpNext` in `HomePage.tsx`). Cancel returns focus to the opener. A Waiting row's **Resume** can reuse that hosting.
- **The Start dialog already reads Book detail** for Start versus Resume and the Purpose. A `waiting` Book has a `currentReading`, so it opens "Resume *X*?" with the Purpose prefilled. It reads the home view for the trade-off lines.
- **The Main book card's gauge** reads `aria-valuetext` "64%, page 212 of 330" (`lib/gauge.ts`). The Waiting row's bar reads "page 120 of 330, 36%", in the other order, as EXPERIENCE.md writes it.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-7, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Every paused Reading but Up next's, oldest `pausedAt` first, no cap; same-day ties by title key, then id | Unit | P0 | `test_ac1_p0_…` |
| AC-2 | "Waiting for you (N)": serif title link, 60×5 bar, "p.120 of 330" in tabular figures, **Resume** named with the title; no date | E2E | P1 | `[P1] AC-2` |
| AC-3 | Nothing paused outside Up next: the pane is hidden | E2E | P2 | `[P2] AC-3` |
| AC-4 | A library written under Epic 3 lists its paused Book, and the invariants hold | API | P0 | `test_ac4_p0_…` |
| AC-5 | Many rows: all shown, the side column grows, the page scrolls | E2E | P2 | `[P2] AC-5` |
| AC-6 | **Resume** on a row: "Resume *X*?", Purpose prefilled, the trade-off lines; confirming makes it Main at its page | E2E | P1 | `[P1] AC-6` |
| AC-7 | A paused Up next is only in Up next, and the count leaves it out | E2E | P1 | `[P1] AC-7` |

**Priorities:**
- **P0:**
  - AC-1 is the definition that the count, the sand marker (4.6) and the library pace scope (Epic 6) all reuse. It is RDG-UNIT-002's "Waiting = paused − Up next", and R-01. test-design-qa lists RDG-API-006 as P1; this checklist raises it because the gate's property test depends on it.
  - AC-4 is the story's promise for data already on disk: a Book paused before Epic 4 must not vanish from Home.
- **P1:**
  - AC-2 is the pane itself.
  - AC-6 is RDG-E2E-002's Resume half. `start-reading` itself is already P0-covered by Stories 3.2 and 4.1.
  - AC-7 is EXPERIENCE.md's Book states rule 2.
- **P2:** AC-3 and AC-5 are XUI-E2E-005 (Waiting 0 and many).

**Level split (no duplicate coverage):**
- **Unit and API:**
  - the list's content and order (ties, accents, Up next, Main, never started, finished, Side read, a re-read);
  - no cap;
  - no `pausedAt` on the wire;
  - the Epic 3 library and its invariants.

  These are what only the server can prove, and it proves them cheaply.
- **E2E:**
  - the pane's look and names;
  - the hiding;
  - many rows and scrolling;
  - Resume through the dialog to the stored result;
  - the count with a paused Up next.

  AC-7's server half (Up next left out) is in AC-1. The E2E leaf checks the count and the two panes.
- **AC-4's "with Resume"** is checked at API level through what decides it: the shelf role `waiting` and Book detail's `currentReading.status`. A Waiting row always offers **Resume**. AC-2, AC-6 and AC-7 click it in the browser on seeds of the same shape.
- **AC-3 can't fail on today's code,** because there is no pane to hide. Its leaf therefore takes the transition. First the pane shows one row. Then **Resume** with no Main book leaves nothing paused, and the pane must go. The red failure is the starting state. The static seeds (no paused Reading; only a paused Up next) are green-phase follow-ups.

---

## Story Integration Metadata

- **Story ID:** `4.2`
- **Story Key:** `4-2-see-every-paused-book-in-waiting-for-you`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 4.2)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md`
- **Generated Test Files:** `backend/tests/test_waiting_for_you.py`, `frontend/e2e/waiting-for-you.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 7 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 7 fail on their criterion assertion, as listed below. Every setup step ran cleanly first: the seeds, `--fake-today` and the server start.

**Skipped as committed:**
- `pytest tests/test_waiting_for_you.py` gives 2 skipped.
- `playwright test e2e/waiting-for-you.spec.ts` gives 5 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `tsc -b` passes.
- After the helper move (below), `up-next.spec.ts` and `start-reading.spec.ts` still pass: 38 passed.

### Unit and API Tests (2 tests): `backend/tests/test_waiting_for_you.py`

**`[P0] AC-1`: `test_ac1_p0_the_home_view_lists_every_paused_reading_except_up_next_oldest_first_with_fixed_ties`**

**Seed:** one `LibraryBuilder` library, built and passed to `views.home()`. The Books are added out of order, so library order can't pass for the server's order:

| Book | State | Listed |
|---|---|---|
| Zazie dans le métro, Emile (id `b2…`), Émile (id `a1…`), anna karenina | each paused on the same fake day (`TODAY`, 2026-10-30) | yes |
| The Left Hand of Darkness | paused 2026-10-05, at p.40 of 330 | yes, first |
| Kindred | paused 2026-10-20, and a Side read | yes |
| Solaris | finished once, its re-read paused 2026-10-12 | yes |
| Dune | paused 2026-10-01 (the oldest), and Up next | no |
| Fahrenheit 451 | Main, with an old `pausedAt` from an earlier pause | no |
| Emma | never started | no |
| Neuromancer | finished, no Reading in progress | no |

The leaf checks, in order:
1. **The ids of `waiting`, in order** (the first assertion): Left Hand, Solaris, Kindred, anna karenina, Émile, Emile, Zazie. "Émile" and "Emile" share a title key, so the id decides. A plain code-point title sort would put "Emile" first.
2. The first entry carries `title`, `pages` 330, `currentPage` 40 and `percent` 12. No entry has `pausedAt`, and Dune is absent.
3. **The same on every render:** a second call, and a library with its Books reversed, give the same list.
4. **No cap:** 30 Books paused on 1 to 30 September give 30 entries, in date order.

*Red today: `assert None == ['…', …]`. `HomeView` has no `waiting`.*

**`[P0] AC-4`: `test_ac4_p0_a_book_paused_under_epic_3_is_listed_in_waiting_for_you_and_invariants_hold`**

**Seed** (`LibraryBuilder.write`, which runs `check_invariants`), as Story 3.2 left a library:
- The Left Hand of Darkness is Main at p.212.
- Dune is paused at p.120 of 412 since 2026-10-20, with a Purpose.
- `upNextBookId` is `null`.

The leaf reads `GET /api/views/home`, then checks, in order:
1. **`waiting` lists Dune alone** (the first assertion).
2. Its entry is `Dune`, 412 pages, `currentPage` 120, `percent` 29, with no `pausedAt`. `upNext` is `null`.
3. Its shelf role is `waiting` at page 120, and Book detail's `currentReading.status` is `waiting`. Both of those give **Resume**.
4. `library.json` is byte-identical after the reads, and `check_invariants()` holds.

*Red today: `assert None == ['<dune id>']`.*

### E2E Tests (5 tests): `frontend/e2e/waiting-for-you.spec.ts`

**Seeds** (the spec's own, plus `DUNE` and `LEFT_HAND` from `e2e/home.ts`):
- `LEFT_HAND_WAITING`: The Left Hand of Darkness paused at p.120 of 330 (36%) since 2026-10-22, with a Purpose and a fixed Reading id.
- `LEFT_HAND_PAUSED_EARLY`: the same Reading, paused 2026-10-05.
- `FAHRENHEIT_WAITING`: Fahrenheit 451 paused at p.40 of 187 (21%) since 2026-10-10.
- `DUNE_MAIN`: Dune as the Main book at p.100 of 412 (24%).
- `FAHRENHEIT`: Fahrenheit 451, never started.

**`[P1] AC-2` the pane and its rows** (Main: `DUNE_MAIN`; Waiting: `FAHRENHEIT_WAITING`, `LEFT_HAND_WAITING`)
1. **`main` has the heading "Waiting for you (2)"** (the first assertion).
2. The pane (a `region` named by that heading) isn't inside the Main book card. Its links read Fahrenheit 451, then The Left Hand of Darkness: oldest pause first.
3. The title link goes to `/book/<id>`, in `ui-serif`.
4. The `progressbar` named "The Left Hand of Darkness" has `aria-valuetext` "page 120 of 330, 36%" and renders at 60×5. Fahrenheit's reads "page 40 of 187, 21%".
5. "p.120 of 330" is visible, with `font-variant-numeric: tabular-nums`. "p.40 of 187" is there too.
6. The button is named exactly "Resume The Left Hand of Darkness", and its text is "Resume". There is a "Resume Fahrenheit 451". The pane has exactly 2 buttons.
7. **No date:** the pane contains none of `paused`, `ago`, `Oct`, `2026` or `22`. The Up next pane still reads "Nothing up next.".

*Red today: no heading "Waiting for you (2)".*

**`[P2] AC-3` the pane hides once nothing is waiting** (no Main book; Waiting: `LEFT_HAND_WAITING`; Dune never started)
1. **The heading "Waiting for you (1)"** (the first assertion: the starting state; see the level split).
2. **Resume** on the row opens "Resume The Left Hand of Darkness?" with no "This pauses" line. Confirm with **Resume**.
3. The card's title link "The Left Hand of Darkness" is focused.
4. **No "Waiting for you" region and no such heading.** `mainBookId` is The Left Hand of Darkness.

*Red today: no heading "Waiting for you (1)".*

**`[P2] AC-5` many rows** (Main: `DUNE_MAIN`; 20 Books "Paused book 01" to "20" paused on 1 to 20 October, seeded newest first)
1. **The heading "Waiting for you (20)"** (the first assertion).
2. There are 20 progressbars, and the link titles are in date order. The 20 links are all row titles, so there is no "show more".
3. The pane's bottom is below the Main book card's bottom (the side column grows), and the document scrolls.
4. "Resume Paused book 20" starts outside the viewport and scrolls into it.

*Red today: no heading "Waiting for you (20)".*

**`[P1] AC-6` Resume from a row** (`--fake-today`; Main: `DUNE_MAIN`; Up next: `FAHRENHEIT`, never started; Waiting: `LEFT_HAND_WAITING`)
1. **The row's "Resume The Left Hand of Darkness" is visible** (the first assertion: the criterion's opener).
2. Clicking it opens "Resume The Left Hand of Darkness?", with the Purpose prefilled. The accessible description is "This pauses Dune at p.100 (24%). Fahrenheit 451 returns to the catalog.".
3. **Resume** → the card's title link is focused, and its gauge reads "36%, page 120 of 330". Exactly one `start-reading` was sent.
4. `library.json`:
   - `mainBookId` is The Left Hand of Darkness, and `upNextBookId` is Dune.
   - The Left Hand of Darkness has the same Reading at p.120, still with `pausedAt` 2026-10-22.
   - Dune is at p.100 with `pausedAt` = 2026-10-28.
   - Fahrenheit 451 has no Readings.
5. Nothing is left waiting: the pane is gone.

*Red today: no "Waiting for you" region, so no row button.*

**`[P1] AC-7` a paused Up next stays out** (Main: `DUNE_MAIN`; Up next: `LEFT_HAND_PAUSED_EARLY`, the oldest pause; Waiting: `FAHRENHEIT_WAITING`)
1. **The heading "Waiting for you (1)"** (the first assertion).
2. The pane's only title is Fahrenheit 451. It has no button and no bar for The Left Hand of Darkness.
3. The Up next pane has "Resume The Left Hand of Darkness". There is no "Waiting for you (2)".

*Red today: no heading "Waiting for you (1)".*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

- **Moved into `e2e/home.ts`,** as the 4.1 checklist planned for the second Epic 4 spec: `startDialog`, `upNextPane`, `fontFamily` and `sizeOf`. `up-next.spec.ts` and `start-reading.spec.ts` now import them, and their own copies are gone. Behavior is unchanged: both specs pass.
- **Kept in the spec:** `waitingPane`, `waitingHeading` and `rowTitles`. Move them to `home.ts` when Story 4.3's Pause spec needs them (RDG-E2E-002).
- **Not moved:** `LEFT_HAND_PAUSED` and `DUNE_PAUSED` from `up-next.spec.ts`. This spec's Waiting seed is at p.120, not p.212, to match the criterion's "page 120 of 330, 36%".

## Mock Requirements

None. Every leaf runs against the real `bookvie`.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The home view** (`GET /api/views/home`) gains **`waiting`** (`HomeView.waiting`):
- **A list,** never `null`. It is empty when nothing is waiting. The suggested model name is `HomeWaiting`.
- **Each entry carries** `id`, `title`, `pages`, `currentPage` and `percent` (`floor(currentPage × 100 ÷ pages)`, AD-6). The spec may add fields (e.g. `authors`), but **never `pausedAt`**.
- **Who is in it:** every Book whose current Reading has `reading_status()` "paused", except `upNextBookId`. A Side read and a finished Book's paused re-read are included.
- **The order:** `pausedAt` ascending, then `title_key(title)`, then Book id. The server decides it; the client never sorts it.

**Home's Waiting for you pane:**
- **A `region` in `main`,** in the side column, outside the Main book card. It is named by its heading, "Waiting for you (*N*)", where *N* is `waiting.length`. DESIGN.md sets the label in uppercase through CSS; the accessible name keeps the DOM text.
- **Hidden when `waiting` is empty,** with or without a Main book. It shows as usual with no Main book (EXPERIENCE.md → State Patterns).
- **One row per entry, in the view's order.** Each row has:
  - the serif title (`book-title-sm`, 2-line clamp) as the row's only `link`, to `/book/<id>`;
  - a 60×5 `progressbar` labeled by the title (`aria-labelledby`), with `aria-valuetext` "page *N* of *M*, *P*%";
  - "p.*N* of *M*" in tabular figures;
  - a compact `button-secondary` whose visible label is **Resume** and whose accessible name is "Resume *X*".
- **No date and no elapsed time** anywhere in the pane (NFR6).
- **Resume opens the Start dialog** that Home hosts, as the Up next pane's button does. Cancel returns focus to that row's button.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `backend/tests/test_reading_state_machine.py` (RDG-UNIT-002) | `views_agree_with_the_pointers` checks `role == "waiting"` per Book, but not the home view's list. Add: `[w.id for w in view.waiting]` equals the paused Books minus Up next, sorted by (`pausedAt`, `title_key`, id). The epic gate names it: "Waiting = paused − Up next". The model already tracks `pausedAt` per Reading through `start-reading`. |
| `backend/tests/test_contract.py` and `frontend/src/api/generated/schema.d.ts` | Regenerate `schema.d.ts` with `npm --prefix frontend run api:gen` once `HomeView.waiting` exists (`npm run check:api` compares it). |
| `frontend/src/pages/HomePage.tsx` comments | "the 320px side column (the Up next pane, …)" and the Start dialog it hosts "that the pane's and the card's buttons open". Add the Waiting pane and its rows. `startingUpNext` and `paneButton` will serve more than Up next, so rename them with the change. |
| `frontend/e2e/up-next.spec.ts` | No change expected. Its paused Up next seeds stay out of Waiting (AC-7). The 4.1 `[P0] AC-2` journey leaves Dune paused and displaced, so after this story Home lists it in Waiting for you. That leaf reads only the dialog, the card and `library.json`, so it still passes. Re-run it. |
| `frontend/e2e/home.spec.ts`, `start-reading.spec.ts`, `stale-hand-offs.spec.ts` | Seeds with a paused, non-Up-next Book will now show a Waiting pane on Home. No leaf counts Home's buttons or regions, but re-run them, and the axe checks on Home in particular. |

## Assumptions for the spec to confirm

- **The field is `waiting`,** after the role `waiting` and `waitingPage`. `waitingForYou` would read better on the wire. If the spec picks it, change `_waiting()` in the backend test.
- **A paused Reading with `pausedAt: null`** can't come from any intent: every pause sets it, and nothing clears it. A hand-edited or restored file could still hold one. The suggestion is to sort such Readings first, as "paused longest", then by title key and id, and to list them rather than hide them. No red leaf pins this. Add a unit case in the green phase.
- **The rows are not pinned as `list`/`listitem`.** The scaffolds count rows by their one link and one progressbar. A `ul` is still the natural markup.
- **The bar's value text order** ("page 120 of 330, 36%") differs from the Main gauge's ("64%, page 212 of 330"). Both come from the docs, so `lib/gauge.ts` needs a second formatter, not a change to the first.
- **The Waiting pane comes after the Up next pane** in the side column (EXPERIENCE.md lists Up next, Waiting for you, On the side). No red leaf pins the order. It is a green follow-up below.
- **No Main book:** the pane shows beside the empty card's Up next suggestion, and a row's dialog has no trade-off line (Flow 10, step 4). AC-3's leaf covers the dialog half.

## Open items that bear on this story

- **R-01 / RDG-UNIT-002:** the property test must assert the list (table above). It is part of Epic 4's gate.
- **RDG-API-006** (Waiting order: oldest first, no cap, Up next excluded) is AC-1's leaf. Tick it in the trace once green.
- **RDG-E2E-002** (Flow 10: Pause via ⋯ → Resume from Waiting, Purpose prefilled) needs Story 4.3's Pause. AC-6 covers the Resume half; 4.3 finishes the journey.
- **XUI-E2E-005** (Waiting 0, 1 and many) is AC-3, AC-2 and AC-7 (one), and AC-5.
- **Spine drift to expect:** ARCHITECTURE-SPINE's Capability → Architecture Map row for FR-7 should name `views/shelf` (home `waiting`) and Home's Waiting pane. Defer it as "spine drift" in the story, as AGENTS.md says.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_waiting_for_you.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/waiting-for-you.spec.ts -g "AC-2"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-1, AC-4: the view
- [x] `views/models.py`: `HomeWaiting` (`id`, `title`, `pages`, `current_page`, `percent`) and `HomeView.waiting: list[HomeWaiting]`. (done: backend/bookvie/views/models.py:87, :110; `test_waiting_for_you.py` AC-1 and AC-4 pass)
- [x] `views/shelf.py`: `_waiting(library)`. It takes every Book whose role is `waiting` (reuse `_role_reading`, so Up next wins as it does everywhere) and sorts by (`pausedAt`, `title_key`, id). Then run `npm --prefix frontend run api:gen`. (done: backend/bookvie/views/shelf.py:158, :203; `schema.d.ts` in sync under `npm run check`)
- [x] Update `test_reading_state_machine.py` (table above) and run it. (done: backend/tests/test_reading_state_machine.py:389 `views_agree_with_the_pointers`)
- [x] Activate AC-1 and AC-4. (done: backend/tests/test_waiting_for_you.py:63, :133)

### AC-2, AC-3, AC-5, AC-7: the pane
- [x] A `WaitingPane` (section pane) in Home's side column, after the Up next pane: the `region` and heading "Waiting for you (N)", and one row per entry. Each row has the title link, the bar (a new `aria-valuetext` formatter in `lib/gauge.ts`), "p.N of M" and the compact **Resume** named with the title. Render nothing when the list is empty. (done: frontend/src/components/WaitingPane.tsx, frontend/src/lib/gauge.test.ts:12; frontend/e2e/waiting-for-you.spec.ts:95)
- [x] The side column grows with its content: no cap, no inner scroll, no `max-height`. (done: frontend/src/pages/HomePage.module.css:43; frontend/e2e/waiting-for-you.spec.ts:168)
- [x] Activate AC-2, AC-3, AC-5 and AC-7. (done: frontend/e2e/waiting-for-you.spec.ts:95, :143, :168, :262)

### AC-6: Resume from a row
- [x] Home opens the Start dialog for a row's Book, through the same hosting as Up next. Cancel focuses that row's **Resume**, and confirming hands off to the card's title link (Story 3.2). (done: frontend/e2e/waiting-for-you.spec.ts:205 (confirm hands off to the title link), :290 (Cancel))
- [x] Activate AC-6. (done: frontend/e2e/waiting-for-you.spec.ts:205)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1, `pausedAt: null`:** the order the spec chooses (Assumptions), in a unit case. (done: backend/tests/test_waiting_for_you.py:183)
- [x] **AC-1, every Book-states row with a paused Reading** in RDG-UNIT-002's random sequences (above). (done: backend/tests/test_reading_state_machine.py:389, over the paused and finished-then-re-read-paused rows the machine reaches; the paused Side read is the AC-1 unit case, `test_waiting_for_you.py:63`, until Story 4.7 adds a side-read intent)
- [x] **AC-2, a long title** clamps to 2 lines in the row, and the row stays inside the pane. (done: frontend/e2e/waiting-for-you.spec.ts:498)
- [x] **AC-2, the pane's place:** after the Up next pane in the side column. With no Main book (Up next pane hidden), it sits beside the empty card's suggestion. (done: frontend/e2e/waiting-for-you.spec.ts:377)
- [x] **AC-2, one row:** the heading "Waiting for you (1)" (EXPERIENCE.md → State Patterns). (done: frontend/e2e/waiting-for-you.spec.ts:377)
- [x] **AC-3, static seeds:** no paused Reading at all, and only a paused Up next. In both, there is no Waiting region, with and without a Main book. (done: frontend/e2e/waiting-for-you.spec.ts:355)
- [x] **AC-6, Cancel** returns focus to the row's **Resume**, and nothing is sent. (done: frontend/e2e/waiting-for-you.spec.ts:290, and with no Main book :566)
- [x] **AC-6, the Main book has an Up next with a paused Reading:** the dialog says "*Z* moves to Waiting for you.". After confirming, *Z* is a row in the pane, placed by its own `pausedAt`. (done: frontend/e2e/waiting-for-you.spec.ts:322)
- [x] **AC-6, after confirming,** the paused Main book is Up next (FR-7). It doesn't appear in Waiting for you, and the count drops by one. (done: frontend/e2e/waiting-for-you.spec.ts:205 (Dune is Up next and the pane goes from 1 row to none))
- [x] **AC-7, no Main book:** the paused Up next is only in the empty card's suggestion, and the count still leaves it out. (done: frontend/e2e/waiting-for-you.spec.ts:566)
- [x] **Refetch on focus** (AD-7): a pause or resume in another tab updates the pane and its count with no warning. (done: frontend/e2e/waiting-for-you.spec.ts:410 (a resume; Pause arrives in Story 4.3))
- [x] **axe** on Home with the Waiting pane, in both themes. (done: frontend/e2e/waiting-for-you.spec.ts:447)
