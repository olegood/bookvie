---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-05'
storyId: '3.1'
storyKey: '3-1-see-my-main-book-on-home'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-31-see-my-main-book-on-home'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-1-see-my-main-book-on-home.md'
generatedTestFiles:
  - 'backend/tests/test_home_view.py'
  - 'frontend/e2e/home.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3 intro and gate; Story 3.1; Conventions for every story)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6, AD-7, AD-9, AD-20; module map views/shelf)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Information Architecture; Book states; Component Patterns: Main book card, Gauge, Re-entry line, Empty state, No-cover placeholder; State Patterns; Accessibility Floor)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Home layout; Main book card; Gauge; Typography)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-home.html, key-book-detail.html'
  - '_bmad-output/test-artifacts/test-design-qa.md (PRG-UNIT-001, PRG-E2E-004, R-10)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-1 backlog; open retro items 9, 15-19)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (useHomeView key test; Home slice popover geometry)'
  - '_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md (format and conventions)'
  - 'backend/bookvie/views/shelf.py, backend/bookvie/views/models.py, backend/bookvie/views/backup.py, backend/bookvie/domain/model.py, backend/bookvie/cli.py (--fake-today, launch URL)'
  - 'backend/tests/builder.py, backend/tests/helpers.py, backend/tests/conftest.py, backend/tests/test_views.py'
  - 'frontend/src/main.tsx, frontend/src/components/AppShell.tsx, frontend/src/api/views.ts, frontend/src/lib/catalog.ts (spineName), frontend/src/pages/BookDetailPage.tsx, frontend/src/pages/BackupPage.tsx, frontend/src/lib/relativeDay.ts, frontend/src/styles/tokens.css'
  - 'frontend/e2e/fixtures.ts, frontend/e2e/library.ts, frontend/e2e/bookcase.ts, frontend/e2e/intents.ts, frontend/e2e/catalog-empty.spec.ts, frontend/e2e/backup.spec.ts, frontend/playwright.config.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Home is added as the first nav item (Home · Catalog · Backup until Stats and Card notes arrive), and / routes to Home, which becomes the launch page that bookvie opens (UX-DR3)' }
  - { id: AC-2, idSource: generated, text: 'With an empty library, Home''s header line is today''s date (for example "Wednesday, 28 October") with no greeting; an e2e test started with --fake-today asserts the header shows that date (TC-2, AD-20); the empty state shows bare birch planks, "Your shelf is empty. Add your first book." and a New book button that navigates to Catalog and opens the New book panel (UX-DR22)' }
  - { id: AC-3, idSource: generated, text: 'With no Main book, "Last export: N days ago" (or "No export yet") appears muted at the right end of the Home header line, informational only and never a warning (FR-22)' }
  - { id: AC-4, idSource: generated, text: 'Home in both themes, empty and with a Main book: an automated axe check in Playwright reports no WCAG 2.2 AA violations' }
  - { id: AC-5, idSource: generated, text: 'With a Main book seeded with LibraryBuilder, Home''s layout is the date header, a two-column grid (a fluid Main book card beside a 320px side column) and room for the bookcase slice below (UX-DR32); the Main book card shows the 200×300 cover (or the no-cover placeholder), the "MAIN BOOK" eyebrow, the title in serif (3-line clamp) as a link to Book detail, the author, and the edition only when it isn''t 1 (FR-21, UX-DR33)' }
  - { id: AC-6, idSource: generated, text: 'With the Main book at page 212 of 330, the home view supplies the percentage (64%, computed only on the server as floor(page × 100 ÷ pages), so it reads 100% only at the last page, AD-6), and the gauge shows "64%" in the gauge figure, "p.212 of 330", and ticks 0 · 165 · 330 (the half tick dropped under 4 pages); it is a progressbar with aria-valuemin="0", aria-valuenow="212", aria-valuemax="330" and aria-valuetext "64%, page 212 of 330" (UX-DR35)' }
  - { id: AC-7, idSource: generated, text: 'With a Main book at page 0, the gauge shows 0% and "p.0 of 330"' }
  - { id: AC-8, idSource: generated, text: 'With no Main book and at least one Book, the card frame shows "No Main book." and a link "Choose a book in the Catalog" (UX-DR34)' }
  - { id: AC-9, idSource: generated, text: 'Book detail for the Main book or a paused Book shows the Current reading block with the status, the gauge and the Purpose; the spine''s accessible name is "…, Main book, 64%" or "…, waiting for you, page 120" per the Book states table' }
---

# ATDD Checklist - Epic 3, Story 3.1: See my Main book on Home

**Date:** 2026-11-05
**Author:** Oleg
**Primary test levels:** E2E (Playwright against the real `bookvie`) and API (pytest against the app through `TestClient`)

---

## Story Summary

As Oleg, I want Home to show my Main book with its cover and how far I am, so that opening bookvie tells me where I am in one glance.

Today `/` is Catalog, and the `home` view is a placeholder: the Catalog's books and meter (`views/shelf.py::home`).

**What 3.1 adds:**
- **A Home page at `/`,** first in the nav. Catalog moves to its own route (see "Contract the Scaffolds Pin").
- **The date header,** with "Last export" at its right end while there is no Main book.
- **The empty states:** the empty shelf (no Books) and "No Main book." (Books, no Main book).
- **The Main book card:** cover, eyebrow, title link, author, edition, and the gauge.
- **The server's percentage** in the home view (AD-6).
- **Book detail's Current reading block,** and spine names that carry the Main book and waiting states.

**Not in 3.1:** the page field (3.3), the re-entry line (3.4), the Home bookcase slice (3.5), the side-column panes (Epic 4), the card actions (Add card note, "⋯").

**Story source:** `epics.md` → Story 3.1. There is no spec file yet: `sprint-status.yaml` has `3-1-see-my-main-book-on-home: backlog`.
- When `spec-3-1-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 2.3.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, the mockups and the code. There was no browser recording: Home doesn't exist yet, and every locator is a role and name the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** **sequential** with one author, as in Stories 1.6 to 2.3. One author keeps the seeds (The Left Hand of Darkness at p.212 of 330, Dune paused at p.120) consistent across both halves.

### Before the leaves: what today's code already does

- **The launcher already opens `/`** (`cli.py`: `url = f"http://{HOST}:{args.port}/"`). AC-1's "launch page that `bookvie` opens" only needs `/` to route to Home. No CLI change.
- **`--fake-today` already exists** (TC-2) but the e2e fixture couldn't pass it. `startServer` and `startSeededServer` now take `fakeToday` (see Fixtures).
- **The home view is served** at `GET /api/views/home` and `useHomeView` exists. No page uses either yet.
- **Spine names** are built on the client (`lib/catalog.ts::spineName`) from `finished` alone: "finished" or "not read yet".
- **Book detail** already gets `role` and `waitingPage` from the server, but shows no Current reading block.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-9, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Home first in the nav; `/` is Home, the launch page | E2E | P0 | `[P0] AC-1` |
| AC-2 | Empty library: date header from `--fake-today`, no greeting, empty shelf; New book → Catalog + panel | E2E | P0 | `[P0] AC-2` |
| AC-3 | No Main book: "Last export: N days ago" / "No export yet", muted, at the right end of the header line | E2E | P1 | `[P1] AC-3` |
| AC-4 | axe WCAG 2.2 AA on Home: empty and with a Main book, light and dark | E2E | P1 | `[P1] AC-4` |
| AC-5 | Main book card: 200×300 cover, MAIN BOOK, serif title link (3-line clamp), author, edition ≠ 1 | E2E | P0 | `[P0] AC-5` |
| AC-6 | The home view's percentage = floor(page × 100 ÷ pages): 64 at 212/330, 100 only at the last page (AD-6) | API | P0 | `test_ac6_p0_…` |
| AC-7 | Page 0: gauge 0%, "p.0 of 330", ticks, progressbar ARIA | E2E | P1 | `[P1] AC-7` |
| AC-8 | Books, no Main book: "No Main book." and "Choose a book in the Catalog" | E2E | P1 | `[P1] AC-8` |
| AC-9 | Book detail Current reading block (status, gauge, Purpose); spine names "Main book, 64%" / "waiting for you, page 120" | E2E | P1 | `[P1] AC-9` |

**Priorities:**
- **P0:** AC-1 (the route every other leaf stands on), AC-2 (first run and TC-2), AC-5 (FR-21, the story's purpose), and AC-6 (AD-6 and R-10: the one number that must agree everywhere).
- **P1:** the rest. They show states and accessibility on top of the P0 paths.

**Level split (no duplicate coverage):**
- **API:** the percentage rule, including its floor edges. Only the server computes it (AD-6), so a client that rounds or recomputes would still pass every E2E leaf at 212/330.
- **E2E:** everything the page shows, where focus goes, and the names a screen reader hears.
- **AC-6 has one leaf, at API level.** Its gauge half (64%, "p.212 of 330", ticks, ARIA at 212) is the AC-7 gauge at a different page. AC-7's leaf pins the gauge's whole structure (ARIA, figure, label, ticks) at page 0, so the 212 rendering is a green-phase follow-up, not a second red leaf.

---

## Story Integration Metadata

- **Story ID:** `3.1`
- **Story Key:** `3-1-see-my-main-book-on-home`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.1)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-1-see-my-main-book-on-home.md`
- **Generated Test Files:** `backend/tests/test_home_view.py`, `frontend/e2e/home.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 9 in all.
- **The backend leaf** has `@pytest.mark.skip(reason=RED)`, and its name carries `ac6_p0`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code (in a temporary copy, since deleted). All 9 fail at their first assertion, as listed below. The seeds behind them (a cover file, a paused Dune, `--fake-today`) all started cleanly.

**Skipped as committed:**
- `pytest tests/test_home_view.py` gives 1 skipped.
- `playwright test e2e/home.spec.ts` gives 8 skipped.
- The whole backend suite passes (874 passed, 1 skipped).
- `backup.spec.ts` and `restore.spec.ts`, the users of `startSeededServer`, still pass (20 of 20) after the fixture change.
- Ruff (on the new file), oxlint and `tsc -b` are clean.

### API Tests (1 test): `backend/tests/test_home_view.py`

**`[P0] AC-6`: `test_ac6_p0_the_home_view_supplies_the_main_book_percentage_floored_on_the_server`**

**Seed:** `_main_at(page, pages)`: The Left Hand of Darkness with one unfinished Reading at `page`, as the Main book.

The leaf checks, in order:
1. **`GET /api/views/home` → `mainBook.percent == 64`** at 212 of 330 (the first assertion). It reads `(body.get("mainBook") or {}).get("percent")`, so today's view fails on the assertion, not on a `KeyError`.
2. `mainBook.currentPage == 212` and `mainBook.pages == 330`.
3. **The floor matrix,** through the `home()` function:

| Page | Pages | Percent | Why |
|---|---|---|---|
| 0 | 330 | 0 | page 0 |
| 1 | 330 | 0 | 0.30…: floor |
| 165 | 330 | 50 | exact half |
| 329 | 330 | 99 | 99.69…: rounding would say 100 a page early |
| 330 | 330 | 100 | the last page |
| 2 | 3 | 66 | 66.66…: floor, not round |
| 1 | 1 | 100 | a one-page Book |

*Red today: `assert None == 64`.*

### E2E Tests (8 tests): `frontend/e2e/home.spec.ts`

**Shared seeds:**
- **The Left Hand of Darkness** (Ursula K. Le Guin, 330 pages, fixed id `3b8f…5a69`). `mainAt(page, …)` makes it Main with one Reading at `page`.
- **Dune** (Frank Herbert, 412 pages, the `DUNE_ID` of `library.ts`).

**`[P0] AC-1` Home is the first nav item and / opens Home, the launch page**
1. **The nav links read exactly Home, Catalog, Backup** (the first assertion).
2. Home has `aria-current="page"`; the `h1` "Home" is in the page (visually hidden); the title is "Home — bookvie".
3. Catalog → `/catalog`, its `h1` focused, `aria-current` moved.
4. Home → `/`, its `h1` focused.

*Red today: the nav reads Catalog, Backup.*

**`[P0] AC-2` an empty library opens Home to the date header and the empty shelf** (`--fake-today 2026-10-28`; browser clock fixed to 10:00 CET that day; light theme)
1. **"Wednesday, 28 October" is visible in `main`** (the first assertion).
2. No greeting (`/good (morning|afternoon|evening)|hello|welcome/i`).
3. The empty-shelf sentence is visible; no Main book card and no progressbar.
4. **New book** → `/catalog`, the New book panel open, focus in Title.

*Red today: the date is not found.*

**`[P1] AC-3` with no Main book, Last export (or No export yet) sits muted at the right end of the header line** (two fake-today servers, both with two Books and no Main book)
- **Exported:** `local-state.json` holds `2026-10-16T09:30:00+02:00`, 12 local days before the fake today.
- **Never exported:** no `local-state.json`.

For each server, the leaf checks, in order:
1. **"Last export: 12 days ago" or "No export yet" is visible in `main`** (the first assertion).
2. Its color is `--color-ink-tertiary` (`rgb(102, 105, 97)`), and the `alert` region is empty: informational, never a warning.
3. It is on the date's line (vertical centers within 8px) and starts right of the date.

*Red today: the line is not found.*

**`[P1] AC-4` axe finds no WCAG 2.2 AA violations on Home** (an empty server and one with the Main book at p.212; light, then dark)
1. **The `h1` "Home" is in the page** (the first assertion), so axe scans Home, not Catalog.
2. `main` is not empty, and axe with the WCAG 2.0/2.1/2.2 A and AA tags reports nothing.

*Red today: no `h1` "Home". Axe on today's `/` would pass, because it scans Catalog; the heading check keeps the leaf honest.*

**`[P0] AC-5` the Main book card** (the Main book at p.212, edition 2, with `covers/left-hand.png` = `COVER_PNG`; light theme)
1. **The card's title link has `href="/book/<id>"`** (the first assertion).
2. The card is below the date header line.
3. The cover `img` "Cover of The Left Hand of Darkness" is 200×300.
4. The "Main book" eyebrow has `text-transform: uppercase`.
5. The title's `font-family` starts with `ui-serif`, and `-webkit-line-clamp` is 3.
6. The author and "Edition 2" are visible.
7. The title link opens Book detail with its `h1` focused.

*Red today: the region "Main book" is not found.*

**`[P1] AC-7` a Main book at page 0**
1. **The card's progressbar has `aria-valuetext="0%, page 0 of 330"`** (the first assertion).
2. `aria-valuemin` 0, `aria-valuenow` 0, `aria-valuemax` 330.
3. "0%", "p.0 of 330", and the ticks "0", "165" and "330" are visible.
4. Edition 1 shows no edition text.

*Red today: no progressbar in a "Main book" region.*

**`[P1] AC-8` with Books but no Main book**
1. **"No Main book." is visible in the card** (the first assertion).
2. No progressbar, and no empty-shelf sentence.
3. The link "Choose a book in the Catalog" has `href="/catalog"`; it opens Catalog with its `h1` focused.

*Red today: the region is not found.*

**`[P1] AC-9` Book detail's Current reading block and the spine names**

**Seed:**
- The Main book at p.212, with Purpose "To see how Le Guin builds a world".
- Dune paused at p.120 (`pausedAt` 2026-10-20), with Purpose "Reread for the ecology of Arrakis".

The leaf checks, in order:
1. **On the Main book's Book detail, the region "Current reading" contains "Main book"** (the first assertion).
2. Its progressbar reads "64%, page 212 of 330", and the Purpose shows.
3. **Dune's Book detail:**
   - "Waiting for you, page 120";
   - the progressbar reads "29%, page 120 of 412" (the server's floor of 29.1…);
   - the Purpose shows.
4. **On `/catalog`,** the bookcase has the spines:
   - "The Left Hand of Darkness by Ursula K. Le Guin, Main book, 64%";
   - "Dune by Frank Herbert, waiting for you, page 120".

*Red today: the region "Current reading" is not found.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1), with fixed literal ids.
- **In E2E,** seeds go through `seededServer`, or `startSeededServer` when a test needs files (`local-state.json`, a cover) or `--fake-today`.
- **The cover** is `COVER_PNG` from `intents.ts`, written to `covers/left-hand.png` before the server starts.

## Fixtures and Helpers Created or Changed

- **`frontend/e2e/fixtures.ts`:**
  - `startServer` takes `fakeToday?: string` and passes `--fake-today` (with `--no-browser`, as the CLI requires).
  - `startSeededServer` takes a fifth argument, `{ fakeToday }`.
  - Both are optional, so every existing caller is unchanged.
- **Spec-local, not shared yet** (`home.spec.ts`):
  - `mainAt`, `nav`, `mainBookCard`;
  - `serverAtFakeToday`: it sets `page.clock.setFixedTime` to the same day before the server starts (AD-20);
  - `stopAndRemove`.
  - Move them to a `home.ts` when Stories 3.2 to 3.7 reuse them.

## Mock Requirements

None. Every leaf runs against the real `bookvie`. Dates come from `--fake-today` on the server and `page.clock` in the browser, not from mocks.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text. The roles and names are listed in the contract below.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Routes:**
- **`/` is Home.**
- **Catalog moves to `/catalog`.** No document names Catalog's route, so this checklist proposes `/catalog`. The spec may choose another; then change every `/catalog` in `home.spec.ts`.
- The nav order is Home · Catalog · Backup.
- **The launch page is unchanged:** the CLI already opens `/`.

**Page structure and names:**
- **Home's `h1`** is "Home", visually hidden. `document.title` is "Home — bookvie".
- **The date header** is visible text in `main`, in the form "Wednesday, 28 October": the browser's local date (AD-6 presentation, AD-20), English weekday and month, no year.
- **"Last export: N days ago" / "No export yet":**
  - It is visible text in `main`, on the date's line, to its right, in `--color-ink-tertiary`.
  - It uses `relativeDay` from `lib/relativeDay.ts`, so "today", "yesterday" and "over a year ago" match the Backup page.
- **The Main book card is a `region` named "Main book"**, for example `<section aria-labelledby>` the eyebrow.
  - The empty card keeps the same frame and name, and holds "No Main book.".
  - Its text content is "Main book"; CSS uppercases it.
- **In the card:**
  - **The title** is a `link` to `/book/<id>`, in the `book-title-lg` serif with `-webkit-line-clamp: 3`.
  - **The cover** is an `img` named "Cover of *Title*", 200×300, as on Book detail. Without a cover, it is the same no-cover placeholder (`role="img"`, name "No cover").
  - **The author** line, then **"Edition N"** only when the edition isn't 1.
  - **The gauge** is one `progressbar`, with `aria-valuemin="0"`, `aria-valuenow` = the page, `aria-valuemax` = the pages, and `aria-valuetext` "*P*%, page *N* of *M*".
  - Visible text "*P*%" (the figure; the "%" may be its own element inside it) and "p.*N* of *M*".
  - The ticks "0", the half (rounded to a whole page) and the total, as separate text nodes. The half is dropped under 4 pages.
- **The empty card** has the link "Choose a book in the Catalog" to `/catalog`.
- **Book detail's Current reading block is a `region` named "Current reading"** (for example a `section` with an `h2` "Current reading").
  - It shows the status: "Main book…", or "Waiting for you, page *N*…" (the mock adds "· started *date*", which the scaffold doesn't pin).
  - It holds a progressbar with the same ARIA as the card's, and the Purpose.

**The home view (`GET /api/views/home`):**
- **It gains `mainBook`:** `null` with no Main book, else an object with at least `id`, `title`, `authors`, `edition`, `coverFile`, `pages`, `currentPage` and `percent`.
- **`percent` = `floor(currentPage × 100 ÷ pages)`,** an integer computed only on the server (AD-6). The client never divides.
- `meter` and `books` stay as they are until Story 3.5 makes `books` the slice.
- **"Last export" on Home:**
  - The leaves don't pin where the page reads it.
  - Either the home view also carries `lastExportAt` (one query for the page), or Home also reads the `backup` view.
  - **Suggestion: carry it in the home view.** The Home page then has one view, and Story 3.4's re-entry line needs it there too.
  - It stays in `local-state.json` (AD-15), and a restore still neither brings nor replaces it.

**Shelf and Book detail views (for AC-9's names):**
- **Each `ShelfBook` carries what the spine name needs from the server:** its role (`main` / `upNext` / `waiting` / none, as `BookDetailView.role` already defines it), the Main book's `percent`, and the waiting page.
  - The client only formats the name: "*Title* by *Author*, Main book, 64%" and "…, waiting for you, page 120".
  - Extend `spineName` in `lib/catalog.ts` from the Book states table.
- **`BookDetailView` gains the current Reading** (active or paused): its page, `percent` and Purpose, next to the existing `role` and `waitingPage`.

**Unchanged:**
- No new intent, and no new error code.
- The standard intent ACs (TR8) don't apply: 3.1 adds only views.
- **After Restore,** the app still navigates to `/`, which is now Home. That is what EXPERIENCE.md asks: "Restore done | Backup → Home", with focus on Home's `h1`.

## Existing tests that must change with the implementation

Moving Catalog off `/` is the largest change. About **108** `page.goto` calls open `/` and expect Catalog.

| File | What changes |
|---|---|
| Most specs (`` `${server.url}/` `` ×81, `'/'` ×26, `server.url` ×1) | Catalog tests go to `/catalog`. A mechanical rewrite, but check each: a test about the launch page or the shell may mean Home. |
| `app-shell.spec.ts` AC-2 "the top nav shows … only Catalog" (and its title and focus tests on `/`) | Rewrite for Home · Catalog · Backup, and "Catalog — bookvie" on `/catalog`. |
| `backup.spec.ts` AC-1 (`toHaveText(['Catalog', 'Backup'])`) | Expect `['Home', 'Catalog', 'Backup']`. |
| `shell.spec.ts` "/ shows the Catalog heading" | `/` shows Home's `h1`, or move the test to `/catalog`. |
| `catalog-empty.spec.ts` (route `**/api/views/catalog` on `/`) | Go to `/catalog`. Home's own loading and failed-load states are a follow-up. |
| `error-screens.spec.ts` "Back to the catalog" `href="/"` | `NotFoundPage` links to `/catalog`, or the copy becomes "Back to Home". Decide in the spec. |
| `delete-book.spec.ts` `toHaveURL(`${server.url}/`)` ×4 | `BookDetailPage` navigates to `/` after a delete (to Catalog). Decide whether a delete lands on Catalog (`/catalog`, as today's copy and focus imply) or Home. |
| `restore.spec.ts` `toHaveURL(`${target.url}/`)` | Stays `/`, now Home. Its focus check becomes Home's `h1`. |
| `backend/tests/test_views.py` `HOME_EMPTY` and the `home`/`catalog` parametrized tests | `HOME_EMPTY` gains `"mainBook": None` (plus `lastExportAt` if adopted). The shared parametrizations split where the views now differ. |
| `backend/tests/test_contract.py` | Regenerate `schema.d.ts` with `npm run check:api` once `HomeView` changes. |

## Assumptions for the spec to confirm

- **Catalog's route is `/catalog`** (see above).
- **"Edition 2" is the card's edition copy.**
  - The criteria say only "the edition only when it isn't 1". Book detail shows it in the metadata grid as Edition / 2.
  - If the spec prefers "2nd edition", change the one string in AC-5.
- **The card and the Current reading block are named regions,** "Main book" and "Current reading" (above). The criteria don't name them; these are the smallest names that let a test find them by role.
- **The header date has no year,** as in the AC example and DESIGN.md.
- **"Muted" is `--color-ink-tertiary`,** as the Backup page's "Last export" line already is (`BackupPage.module.css`).
- **The date header can't come from the server.** AD-20: "Views don't carry the server's date". That's why AC-2 sets both `--fake-today` and the browser clock.

## Open items that bear on this story

- **`epic-1-retro-item-9` is still open:** "Before Epic 3: extract useSpinePopover from Bookcase.tsx and split domain/book_fields.py". It should land before or with 3.1, because AC-9 changes the spine names in `Bookcase.tsx`.
- **`epic-2-retro-item-17`:** story spec creation pulls in open deferred-work items that name the story. Two name 3.1:
  - **`useHomeView`'s query key** (deferred-work l.42–44). Home is its first consumer. Pin `['view', 'home']` and `GET /api/views/home` with a unit test in `api/views.test.ts`, as Story 1.6 did for Catalog.
  - **The spine popover geometry on Home's slice** (l.122–123). The slice is Story 3.5, so this stays deferred.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_home_view.py`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/home.spec.ts -g "AC-1"`

### AC-6: the percentage on the server
- [ ] `views/models.py`: a `HomeMainBook` (id, title, authors, edition, coverFile, hasCover, pages, currentPage, percent), and `HomeView.main_book: HomeMainBook | None`.
- [ ] One percentage function in the server (for example `domain/` or `views/shelf.py`), `page * 100 // pages`. It is reused by the shelf and book views below.
- [ ] `views/shelf.py::home` fills `main_book` from `mainBookId` and its unfinished Reading.
- [ ] Update `test_views.py`'s `HOME_EMPTY`; `npm run check:api`; activate AC-6.

### AC-1: the route and the nav
- [ ] `main.tsx`: `/` → a new `HomePage`; Catalog at `/catalog`.
- [ ] `AppShell.tsx`: Home first (`end`), Catalog to `/catalog`.
- [ ] `HomePage`: the visually hidden `h1` "Home", and `usePageTitle('Home')`.
- [ ] Rewrite the existing tests that open `/` for Catalog (the table above), then run the whole e2e suite.
- [ ] Activate AC-1.

### AC-2, AC-3: the header line and the empty shelf
- [ ] The date header from the browser's local date, recomputed on focus and visibility, as `useNow` does.
- [ ] The empty state: reuse Catalog's bare planks and sentence. **New book** navigates to `/catalog` and opens the panel (EXPERIENCE.md → New book panel: "When opened from Home's empty state, the app first navigates to Catalog").
- [ ] "Last export" / "No export yet" on the header line when there is no Main book, through `relativeDay`.
- [ ] Activate AC-2 and AC-3.

### AC-5, AC-7, AC-8: the Main book card and the gauge
- [ ] A `MainBookCard`: cover or placeholder, eyebrow, title link, author, edition ≠ 1.
- [ ] A `Gauge` component: progressbar ARIA, figure, "p.N of M", ticks (half rounded, dropped under 4 pages). Book detail reuses it for AC-9.
- [ ] The empty card: "No Main book." and "Choose a book in the Catalog".
- [ ] Layout: the date header, then a grid of the card (fluid) and a 320px side column (empty until Epic 4), then room for the slice.
- [ ] Activate AC-5, AC-7, AC-8, then AC-4 (axe) once the page is complete.

### AC-9: Book detail and the spine names
- [ ] `BookDetailView`: the current Reading's page, `percent` and Purpose. `ShelfBook`: role, `percent` (Main only), waiting page.
- [ ] `BookDetailPage`: the Current reading region, with status, `Gauge` and Purpose.
- [ ] `spineName`: the Book states names, at least "Main book, *P*%" and "waiting for you, page *N*", with unit tests in `lib/catalog.test.ts`.
- [ ] `npm run check:api`; activate AC-9.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-6, the gauge at 212 of 330 (E2E):** "64%", "p.212 of 330", ticks 0 · 165 · 330, `aria-valuenow="212"`, and `aria-valuetext` "64%, page 212 of 330".
- [ ] **AC-6, the half tick:** a 3-page Book shows only "0" and "3"; a 4-page Book shows "0 · 2 · 4"; 331 pages rounds the half to 166 (or 165; pin `Math.round`).
- [ ] **AC-6, the last page:** 330 of 330 reads 100%. Also cover 329 of 330 = 99% in the browser, so no client rounding sneaks in.
- [ ] **AC-5, the no-cover placeholder:** on the card, at 200×300, not focusable.
- [ ] **AC-5, layout:** the card is fluid and the side column is 320px wide with a 24px gap, at a 1280px viewport.
- [ ] **AC-5:** a long title clamps at 3 lines with an ellipsis, and the link's accessible name keeps the full title.
- [ ] **AC-3:** "Last export: today", "yesterday" and "over a year ago" on Home. "Last export" is not on the header line while a Main book exists (Story 3.4 puts it on the re-entry line). Dark-theme muted color.
- [ ] **AC-2:** the date recomputes after midnight, on focus (advance `page.clock` past midnight, dispatch `focus`).
- [ ] **Home's loading and couldn't-load states,** as Catalog's (`catalog-empty.spec.ts` AC-6 and AC-7), on `**/api/views/home`.
- [ ] **AC-9, the rest of the Book states names** that apply before Epic 4: "finished, re-reading, *P*%" for a re-read as Main.
- [ ] **AC-9, the other states and Home's slice:** the Up next names ("not read yet, Up next" and so on) and the slice belong to Stories 3.5 and 4.x.
- [ ] **AC-9, re-reads:** the spine name and Current reading block for a finished Book re-read as Main.
- [ ] **AC-9, a paused Book that is Up next:** not reachable in seeds until Story 4.1 sets Up next.
- [ ] **The `useHomeView` key unit test** (deferred-work l.42–44).
- [ ] **`PRG-E2E-004`** (spine names carry status): tick it in the trace once AC-9 is green.
