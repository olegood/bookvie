---
status: final
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/prd-deltas.md
  - _bmad-output/test-artifacts/test-design/bookvie-handoff.md
---

# bookvie - Epic Breakdown

## Overview

This document breaks bookvie's PRD, UX design (DESIGN.md, EXPERIENCE.md) and architecture spine into seven epics of implementable stories. Each story names the requirement IDs it satisfies and lists Given/When/Then acceptance criteria.

**How to read it.** The Epic List gives the build order and what each epic delivers. Each epic section starts with its gate. Every story follows the conventions in "Conventions for every story", just before Epic 1. The Requirements Inventory is a lookup table; the source documents stay authoritative.

**ID key.**
- **FR-n, NFRn:** PRD requirements (`prd.md`).
- **ARn:** architecture requirements; each points to an AD-n decision in `ARCHITECTURE-SPINE.md`.
- **TRn:** test requirements from the TEA handoff; each points to a TC-n testability concern or an R-n risk.
- **UX-DRn:** UX design requirements; each points to a section of `DESIGN.md` or `EXPERIENCE.md`.
- **R-n:** risks in `test-design-architecture.md`. "Closes R-n" in a gate means the epic's tests retire that risk.
- **Test IDs** such as FND-API-001 or CAT-E2E-002: scenarios in `test-design-qa.md`. The prefix is the area (FND foundation, CAT catalog, BKP backup, PRG progress, FIN finish, RDG reading, CRD card notes) and the middle part is the level (UNIT, API, E2E).

## Epic List

Gates are in each epic's section.

| Epic | What it delivers | FRs covered |
|---|---|---|
| 1. Catalog the home library | Add, edit, delete and browse Books on a bookcase, with duplicate warnings, back-filled finishes, covers and the agent-friendly form; plus the project foundation (skeleton, CLI, store, API contract, test harness, app shell). | FR-1, FR-2, FR-3, FR-4, FR-24 (catalog bookcase) |
| 2. Keep the library safe | Export everything with one click and restore it on a fresh machine; damaged, hostile and newer files are refused with nothing changed. | FR-22, FR-23 |
| 3. Read a book with visible progress | Start a Main book with a Purpose, catch up in at most 2 interactions, see "Last updated…" and days left, and finish with the one-time spine fill, including re-reads. | FR-5 (basic), FR-9, FR-10, FR-11, FR-14 (Main book), FR-21, FR-24 (Home slice, Main fill) |
| 4. Switch books without losing your place | Interrupt with every consequence stated, pause, Up next, Waiting for you, finishing any non-Main Reading, and up to 3 Side reads. | FR-5 (Up next displacement), FR-6, FR-7, FR-8, FR-14 (non-Main finish), FR-24 (markers) |
| 5. Keep what a book gave you | Card notes with a page or range on any Book, the pile, and note search. | FR-17, FR-18, FR-19 |
| 6. Know how long and how much | Pace to finish for a Book or the whole unread library, and Stats for any period with monthly bars. | FR-15, FR-16 |
| 7. Organize the catalog | Sort, and filter chips that close up the bookcase; Home's slice follows the sort. | FR-20 |

## Requirements Inventory

### Functional Requirements

The PRD is authoritative; this text is a copy so each story can be read on its own. FR IDs are the PRD's own stable IDs. FR-12 and FR-13 (Day types, Reading calendar) were retired on 2026-10-28 and are not listed. Priority in brackets.

FR-1 [Must]: Book fields. The user can create, edit and delete a Book. Required: title, pages, at least one author, edition (default 1), language, publisher, type (Paperback / Hardcover / Ebook). Optional: subtitle, ISBN, year, cover image, spine color, tags, Finished on. Saving is refused while any required field is empty. Pages is always a page count. Edition is displayed only when it isn't 1. A Book without a cover shows a "no cover" placeholder. New Books default to Ownership = owned. An empty spine color means automatic (from cover, else curated palette). An empty Finished on means not read; a date (not in the future) creates a back-filled Reading (no start date) finished on that date, and on a Book with an active or paused Reading adds a past Reading and leaves the current one untouched. In edit, Finished on shows the most recent finish date and changing it changes that date; clearing it is refused. Tags: many per Book, comma-separated free text with suggestions from existing tags, shown on Book detail. Editing Pages below the current page of an active or paused Reading, or below the highest Card note page, is refused with a message; finished Readings keep the page count they finished with. Deleting a Book requires confirmation and removes its Readings and Card notes.

FR-2 [Must]: Agent-friendly form. Add-book and edit-book forms expose stable, labeled fields and buttons reachable by label, so a browser-driven AI skill can fill them as a person would. Every field has a visible label and a stable accessible name; labels don't change between releases without notice. Every form outcome (saved, duplicate warning, validation error, couldn't save) is exposed through roles, accessible names and live-region text. After saving, the new Book can be found by searching its title.

FR-3 [Must]: Duplicate warning. A new Book matching an existing one triggers a warning before saving. Matching ISBN triggers it (ISBNs compared after removing hyphens/spaces and converting ISBN-10 to ISBN-13). When either Book has no ISBN, matching title (case- and extra-whitespace-insensitive) plus at least one shared author (set of semicolon-separated names, case- and surrounding-space-insensitive) triggers it. The warning offers exactly **Don't add** (closes, keeps typed fields) and **Add anyway**; the form behind is inert. On edit, the check runs only if title, an author or ISBN changed.

FR-4 [Must]: Browse the catalog. The user can list Books, search them by title, and open them.

FR-5 [Must]: Start a Reading with confirmation. The user makes a Book the Main book, or resumes a paused Reading, through a Start confirmation shown on every start or resume; it holds the optional Purpose field. When a Main book exists it shows the trade-off ("Start *X*? This pauses *Y* at p.120 (64%)"). Confirming pauses the previous Reading at its current page and creates or resumes a Reading for *X*. Starting a finished Book creates a new Reading (re-read). When the start displaces the Up next Book *Z*, the confirmation says "*Z* moves to Waiting for you." (paused Reading) or "*Z* returns to the catalog." (never started).

FR-6 [Must]: Pause. The user can pause the Main book from Book detail or from the Main book card's "⋯" menu; its current page is kept and there is no Main book until the user chooses one. Every pause records the Reading's paused-at date. When pausing would displace an Up next Book, a confirmation says so first.

FR-7 [Must]: Up next and Waiting for you. The user can set one Book as Up next. An interrupted or paused Main book becomes Up next. A displaced Up next Book moves to Waiting for you if it has a paused Reading, else returns to the catalog. Waiting for you lists every paused Reading except the Up next Book's, oldest paused-at date first, no cap. A paused Up next Book appears only in Up next, with Resume. Any paused Reading can be resumed at any time from Waiting for you or Up next, through the FR-5 confirmation.

FR-8 [Should]: Side reads. The user can mark up to 3 Books as Side reads. Marking/unmarking changes nothing else (no status change, Reading, progress, stats, goals or nudges). Starting a Side read by any route asks "Which page?" in the FR-5 confirmation and tracking starts from that page. A Side read that becomes the Main book, or is finished, leaves the Side reads automatically.

FR-9 [Must]: Purpose. When starting a Reading, the user can enter an optional one-sentence Purpose in the Start confirmation and edit it later.

FR-10 [Must]: Quick page update. The user can set the Main book's current page from the main screen. Percentage and gauge update immediately. One field and one confirm action: at most 2 interactions after opening the app; the field takes the absolute page, no "add pages" control. Page must be 0 to the Book's page count; a lower page than before is allowed. Saving records the Reading's last progress update time. Entering the last page opens the finish flow (FR-14); cancelling it leaves the Reading active at that page.

FR-11 [Should]: Re-entry info and effort. On the next visit, show "p.N of M" on the gauge, "Last updated N days ago" (muted, never a warning), and "~N days left" = pages left ÷ Measured pace, rounded up, minimum "~1 day left", hidden with no Measured pace or no pages left. Re-entry info appears only in the app, on the next visit.

FR-14 [Must; prompts Should]: Finish a Reading. When the current page reaches the last page, or the user marks a Reading finished, the Reading gets a finish date. The finish flow has a Finished on date: today by default, not in the future, not before the Reading's start. Any Reading can be marked finished from Book detail through the same flow; finishing a non-Main Reading leaves the Main book unchanged and removes the Book from Up next and Waiting for you. Only finishing the Main book leaves no Main book, and bookvie then suggests the Up next Book. Marking a Book with no Reading finished creates a back-filled Reading. The Book counts as read. *(Should)* The flow asks "Purpose fulfilled? yes / partly / not yet" (only if the Reading has a Purpose) and a 1–5 star rating; both skippable.

FR-15 [Must]: Pace to finish date. On a Book or in the catalog, the user types a positive pages/day value and sees the estimated finish date and duration, updating as they type. Book scope: pages left in its current Reading, or all its pages if never started. Library scope: all pages of owned never-started Books plus pages left in every active or paused Reading, including re-reads; donated Books and finished Books without an active Reading excluded. Zero, negative or non-numeric input: no result and no error. The field starts filled with Measured pace when there is one, else empty.

FR-16 [Must]: Stats for any period. The user chooses any date range and sees the number of Books finished and pages finished; UX presets This month, This year, Last year, All time, plus custom, with a bar per month. All of a Reading's pages count in the period it finished in; a finish counts by its local date; a back-filled Reading counts in the period of its Finished on date. "All time" starts at the earliest finished Reading. Re-reads count again; Side reads never count.

FR-17 [Must]: Add Card notes to any Book. The user can add, edit and delete a Card note on any Book at any time. A Card note needs text and a page or page range (p.42 or pp.42–45), shown below the text. A page or range outside the Book's page count is refused.

FR-18 [Must]: Review a Book's Card notes as a pile, one at a time: page order or shuffled, next/previous, and jump straight to a particular Card note.

FR-19 [Must]: Card notes view and quick search. A separate Card notes view shows all Card notes grouped by Book, with a quick search that finds notes containing the typed text. Search across all Books keeps results grouped by Book; the view scoped to one Book searches only that Book's notes; the pile itself has no search. Results update while typing, case-insensitive; each result shows the page or range and the matching text highlighted (plus the Book title in all-Books search). Opening a result shows that note in its Book's pile.

FR-20 [Should]: Filter and sort. Sort: Author (default), Title, Date added, Pages; the bookcase reorders to match. Filter chips: Read / Unread, Type, Language, Tag; non-matching Books are hidden and the bookcase closes up (not dimmed).

FR-21 [Should]: Cover on the main screen. The main screen shows the Main book's uploaded cover, or the placeholder.

FR-22 [Must]: One-click export. One action exports all data to a single file: Books (incl. spine color), Readings (incl. finish dates, back-filled Readings, last progress update, paused-at date), Card notes and cover images, plus data from later features. bookvie records the time of the last export and shows "Last export: N days ago" on the Backup page and the main screen, informational only.

FR-23 [Must]: Restore from export. The user can restore bookvie from an export file. Restore replaces current data after explicit confirmation. Export then restore reproduces identical data. This is the only way to import data.

FR-24 [Must]: Bookcase. The main screen shows a slice of the bookcase and the catalog shows the full bookcase: one spine per Book, in catalog sort order (Author by default). The slice is up to 3 shelf rows: the Main book's row, then the Up next Book's, then rows with the most recent finishes; filters never apply to it. Unread Books are outlined; read Books show their spine color exactly as stored. Up next and Waiting for you Books carry markers. The Main book's spine is filled to its reading percentage; a re-read keeps its full-color spine and gets the Main-book marker. An overall meter shows "X of Y finished". Not ordered by physical location.

### NonFunctional Requirements

NFR1 (Local-first): bookvie runs in a browser on one laptop or desktop. No account and no network connection for any feature; no database server; all data lives locally. A Book saved from any browser on this machine appears in every other browser.

NFR2 (Display): UI in English only. Minimum viewport 1024px; below that the page scrolls horizontally; no phone layout. Light, dark or system theme selectable.

NFR3 (Accessibility): WCAG 2.2 AA in both themes, with one accepted deviation: the 1024px minimum width does not meet SC 1.4.10 Reflow (horizontal scroll at 200–400% zoom).

NFR4 (Speed): Catch-up (one page update) takes under 30 seconds and at most 2 interactions after opening the app.

NFR5 (Data safety): No action silently deletes data. Every destructive action needs confirmation. A failed save is never silent: the UI says "Couldn't save. Your data wasn't changed." and keeps the user's input.

NFR6 (Tone): No guilt mechanics: no streaks, no "you missed a day", no red failure states. No greetings, exclamation marks or praise. Finish copy is "Finished *X*."; the finish moment is a single ~600ms spine fill that never replays.

NFR7 (Scale, from architecture): Sized for about 500 Books and a few thousand Card notes; the Catalog bookcase renders all ~500 spines in the page with no lazy rows.

NFR8 (Unattended operation): Cataloging runs with nobody watching; every outcome of the add-book form is machine-readable by role, accessible name and live-region text. Renaming any Agent Label Contract entry is a breaking change.

### Additional Requirements

From ARCHITECTURE-SPINE.md and the TEA handoff. Each line names the source decision, which holds the full rule.

**Persistence and data folder.**
- AR1 (AD-1): One data folder (`--data-dir`, default `~/bookvie-data`); only `store/` reads or writes it.
- AR2 (AD-2): One `library.json`, produced only by `store.serialize()`, committed by temp file, fsync and rename; startup cleanup of leftover temp files.
- AR3 (AD-18): Canonical document shape; `check_invariants()` runs before every commit.
- AR4 (AD-19): Reading fields, the single status function, start and finish rules, and how intents address their target.
- AR5 (AD-11): Spine colors and finish values are stored, never recomputed.
- AR6 (AD-12): Cover decoding, immutable cover names, and the files-then-document-then-cleanup order.
- AR7 (AD-13): `schemaVersion` and one migration chain, run in memory, with a pre-migration backup.
- AR8 (AD-15): Last export in `local-state.json`; UI preferences in browser `localStorage`.

**API contract.**
- AR9 (AD-3): Each user action is one `POST /api/intents/<verb>` that applies every consequence and commits once, or changes nothing.
- AR10 (AD-4): One in-process lock serializes intents, export and restore; views read committed state.
- AR11 (AD-6): The server computes domain numbers and selections; the client only presents them.
- AR12 (AD-7): No optimistic updates; every intent response invalidates all views.
- AR13 (AD-8): Pydantic models are the contract; TS types are generated and checked by `check:api`.
- AR14 (AD-9): One success and failure envelope, an error-code enum, and the refusal codes.
- AR15 (AD-10): Duplicate detection is a 409 refusal with `confirmDuplicate`.
- AR16 (AD-20): Injected `Clock`, local dates, and Measured pace in `domain/`.
- AR17 (Consistency Conventions): Server-minted UUIDs and the naming conventions.

**Export and restore.**
- AR18 (AD-14): Export packaging and when Last export is recorded; restore validation, limits and apply order.

**CLI, process and security.**
- AR19 (AD-5): One server per data folder through a health-checked lock.
- AR20 (AD-16): Loopback bind, port handling, the Host/Origin guard and the SPA fallback.
- AR21 (Consistency Conventions): CLI flags, stderr logging, no outbound network calls.
- AR22 (Stack, Structural Seed): Build into `backend/bookvie/http/static/`, shipped in the hatchling wheel, install with `uv tool install`, Vite dev proxy; React Router 8.5 and CSS Modules over one `tokens.css`.
- AR23 (AD-17): The Agent Label Contract is a public interface; e2e drives it by exact accessible names, with no `data-testid`.

**Test harness and quality gates (TEA handoff).**
- TR1 (TC-1): `LibraryBuilder` fixture and pre-start seeding of a data folder.
- TR2 (TC-2): `--fake-today` Clock flag, only with `--no-browser`; TZ pinned to `Europe/Madrid`; browser clock and time zone matched in e2e.
- TR3 (TC-3): Filesystem seam in `store/` for fault injection.
- TR4 (TC-4): Worker-scoped Playwright server fixture.
- TR5 (TC-5): Per-worker e2e data dirs, a path guard that always refuses `~/bookvie-data`, and an isolated install smoke test.
- TR6 (R-16): One `npm run check` command (`check:py`, `check:api`, `check:e2e`, `check:smoke`, stopping at the first failure); `~/bookvie-data` is never touched.
- TR7: Per-epic gates: P0 = 100%, P1 ≥ 95%, every error code has an API test, `check:api` clean, coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- TR8: The standard intent ACs in "Conventions for every story".
- TR9 (R-12): Every UI save surface keeps its values and shows "Couldn't save. Your data wasn't changed." on a routed 503.
- No CI provider is required; everything runs locally until one is chosen.

### UX Design Requirements

Each line names the UX section that holds the full requirement. D = DESIGN.md, E = EXPERIENCE.md.

**Foundation and tokens**
- UX-DR1: Design tokens as CSS custom properties (D → Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes)
- UX-DR2: Theme toggle, Light / Dark / System (D → Components; E → Foundation)
- UX-DR3: App shell, nav, landmarks, page titles and focus on route change (E → Information Architecture, Accessibility Floor)
- UX-DR4: Live regions and their timing (E → Accessibility Floor)
- UX-DR5: Shared primitives: buttons, link, Text field, chip, focus and highlight rings, Failure message, Busy button (D → Components)
- UX-DR6: Overlay primitives: dialog, alertdialog, side panel, popover, menu (E → Overlays, Interaction Primitives)
- UX-DR7: Focus after close (E → Focus after close)
- UX-DR8: Reduced motion (E → Interaction Primitives)
- UX-DR9: Forced colors (D → Forced colors)
- UX-DR10: Relative dates in local calendar days (E → Foundation)
- UX-DR11: Controls that can't act use `aria-disabled` with a reason (E → Accessibility Floor)
- UX-DR12: Voice and Tone, and banned patterns (E → Voice and Tone; D → Do's and Don'ts)

**Catalog and entry**
- UX-DR13: New book / Edit book panel fields and buttons (E → New book panel, Agent Label Contract)
- UX-DR14: New book panel outcomes (E → New book panel)
- UX-DR15: Duplicate dialog (E → Duplicate dialog)
- UX-DR16: Tags combobox (E → Component Patterns)
- UX-DR17: Catalog page layout and toolbar (E → Pages, Component Patterns; D → Layout & Spacing)
- UX-DR18: Search titles (E → Component Patterns)
- UX-DR19: Sort select (E → Component Patterns, Bookcase)
- UX-DR20: Filter chips (D → Filter chips; E → Component Patterns)
- UX-DR21: Catalog view toggle and List view (E → Component Patterns)
- UX-DR22: Empty state on Home and Catalog (E → State Patterns)
- UX-DR23: No-cover placeholder (D → Components)

**Bookcase**
- UX-DR24: Spine visual (D → Spine)
- UX-DR25: Spine semantics and accessible name (E → Book states, Bookcase)
- UX-DR26: Bookcase container, planks and legend (D → Components; E → Bookcase)
- UX-DR27: Bookcase keyboard (E → Bookcase)
- UX-DR28: Spine popover (D → Spine popover; E → Spine popover)
- UX-DR29: Change color control (E → Spine popover, Book detail)
- UX-DR30: Library meter (D → Components)
- UX-DR31: Home bookcase slice (E → Bookcase)

**Home and reading flow**
- UX-DR32: Home layout (D → Layout & Spacing; E → Pages)
- UX-DR33: Main book card (D → Main book card)
- UX-DR34: Main book card empty state (E → State Patterns)
- UX-DR35: Gauge (D → Components; E → Component Patterns)
- UX-DR36: Page field (E → Component Patterns)
- UX-DR37: Re-entry line (E → Component Patterns)
- UX-DR38: Section panes: Up next, Waiting for you, On the side (E → Section pane)
- UX-DR39: Start dialog (E → Start dialog)
- UX-DR40: Pause flows (E → Flow 10, Focus after close)
- UX-DR41: Finish dialog (E → Finish dialog)
- UX-DR42: Finish moment (E → Finish dialog; D → Components)

**Book detail**
- UX-DR43: Book detail page and its actions (D → Book detail; E → Book detail, Book states)
- UX-DR44: Edit Purpose inline (E → Book detail)
- UX-DR45: Mark as Side read limit (E → Book detail)
- UX-DR46: Delete book confirmation (E → Overlays, Focus after close)

**Card notes**
- UX-DR47: Card note panel and page parser (E → Card note panel)
- UX-DR48: Card notes page and search (E → Component Patterns)
- UX-DR49: Book detail Card notes block (E → Book detail)
- UX-DR50: Pile (E → Pile)

**Pace, Stats, Backup**
- UX-DR51: Pace calculator (E → Component Patterns, Flow 5)
- UX-DR52: Stats page (E → Component Patterns; D → Components)
- UX-DR53: Backup page (E → State Patterns, Component Patterns)

### FR Coverage Map

FR-1: Epic 1 - Book fields, create/edit/delete, Finished on back-fill, tags field, spine color
FR-2: Epic 1 - Agent-friendly form (Agent Label Contract)
FR-3: Epic 1 - Duplicate warning
FR-4: Epic 1 - Browse, search titles, open Book detail
FR-5: Epic 3 - Start dialog, start/resume/re-read, pausing the previous Main with "This pauses *Y*…"; Epic 4 - Up next displacement lines
FR-6: Epic 4 - Pause
FR-7: Epic 4 - Up next and Waiting for you
FR-8: Epic 4 - Side reads
FR-9: Epic 3 - Purpose
FR-10: Epic 3 - Quick page update
FR-11: Epic 3 - Re-entry info and days left
FR-14: Epic 3 - Finishing the Main book, prompts, finish moment, re-read; Epic 4 - marking any non-Main Reading finished from Book detail
FR-15: Epic 6 - Quick pace calculator
FR-16: Epic 6 - Stats
FR-17: Epic 5 - Add/edit/delete Card notes
FR-18: Epic 5 - Card notes pile
FR-19: Epic 5 - Card notes view and search
FR-20: Epic 7 - Filter and sort
FR-21: Epic 3 - Cover on the main screen
FR-22: Epic 2 - Export; Epic 3 - Last export on Home
FR-23: Epic 2 - Restore
FR-24: Epic 1 - Catalog bookcase (spines, colors, meter, popover, keyboard); Epic 3 - Home slice and Main-book fill; Epic 4 - Up next / Waiting markers

## Conventions for every story

**Standard intent ACs (TR8).** Every story below that adds or changes an intent also satisfies: *Given* a failure injected through the store's filesystem seam at write, fsync or rename, *When* the intent runs, *Then* `library.json` is byte-identical to before and the response is 503 `couldnt_save` with "Couldn't save. Your data wasn't changed." (FND-API-001); *and* after every successful intent `check_invariants()` holds (FND-UNIT-002); *and* an intent naming a Book that no longer exists is refused with 409 `book_not_found` and changes nothing; *and* every new error `code` has an API test.

**Seeded states.** "Seeded" in an AC means the state is built with the `LibraryBuilder` fixture (TC-1) before the test, not clicked into place.

## Epic 1: Catalog the home library

The user, or their AI cataloging skill, can open bookvie, add, edit and delete Books through the agent-friendly form, get duplicate warnings, back-fill finished Books with Finished on, and browse and search the full bookcase on Catalog, with Book detail and the spine popover. The epic also lays the foundation every later epic builds on: skeleton, CLI, store, security guard, test harness and app shell.

**Gate:** FND-* P0 green; label-contract suite (CAT-E2E-001..005) green; `~/bookvie-data` untouched by `npm run check`; per-epic quality gates (TR7). Closes R-03, R-04, R-05, R-06, R-08, R-13, R-15, R-16.

### Story 1.1: Scaffold and install bookvie

As Oleg,
I want to install bookvie once and start it with one command,
So that it opens in my browser from a project laid out the way every later story expects.

**Requirements:** NFR1, AR20, AR22

**Acceptance Criteria:**

**Given** a fresh clone with `backend/` (uv, Python 3.14) and `frontend/` (Vite 8.3 `react-ts`, React 19.3, TypeScript pinned to 5.9)
**When** I run `npm run build` and then `uv tool install --reinstall ./backend`
**Then** a global `bookvie` command exists
**And** the built SPA is packaged from `backend/bookvie/http/static/` (gitignored, included as package data)
**And** there is no third-party starter: `backend/` is a uv-managed package with the console script `bookvie = bookvie.cli:main`, and `frontend/` starts from the Vite `react-ts` template with TanStack Query 5 and Playwright 1.64, TypeScript pinned to 5.9 instead of the template's TS 7 because openapi-typescript 7.13 requires TS ^5
**And** every dependency matches the pins in ARCHITECTURE-SPINE.md → Stack
**And** the backend packages follow the AD layer layout (`cli.py`, `http/`, `intents/`, `views/`, `domain/`, `store/`, `tests/`), and the frontend has `src/api/generated/`, `src/api/`, `pages/`, `components/` and `e2e/`
**And** the dependency direction holds: `http → intents, views → domain`; `intents, views → store`; `domain` imports no other layer; `store` imports only `domain` types; the frontend imports only `api/`.

**Given** the backend's `pyproject.toml`
**When** the wheel is built
**Then** the build backend is hatchling, with `[tool.hatch.build.targets.wheel] packages = ["bookvie"]` and `artifacts = ["bookvie/http/static/**"]`, so the gitignored built SPA ships in the wheel.

**Given** the template's `tsconfig` with TypeScript pinned to 5.9
**When** I run `tsc -b` in `frontend/`
**Then** it passes with no errors.

**Given** the frontend
**When** pages and styles are added
**Then** routing uses React Router 8.5 in library mode (`createBrowserRouter`)
**And** each component has its own CSS Module, and all of them read one `tokens.css` holding the DESIGN.md custom properties.

**Given** no bookvie is running
**When** I run `bookvie`
**Then** the server binds `127.0.0.1:8765`, creates the data folder (`--data-dir`, default `~/bookvie-data`) if missing, and opens the default browser at its URL (skipped with `--no-browser`)
**And** `/` serves the SPA, and any other path outside `/api` and `/media` falls back to `index.html`.

**Given** development mode
**When** I run `npm run dev` alongside `bookvie --dev --no-browser`
**Then** Vite on :5173 proxies `/api` and `/media` to :8765.

### Story 1.2: Run one safe instance

As Oleg,
I want bookvie to run as exactly one server per data folder, reachable only from my own machine,
So that two launches never fight over my library and nothing outside my machine can reach it.

**Requirements:** NFR1, AR19, AR20, AR21

**Acceptance Criteria:**

**Given** no bookvie is running
**When** I run `bookvie`
**Then** it writes `bookvie.lock` in the data folder with its PID and port.

**Given** a live `bookvie.lock`
**When** I run `bookvie` again
**Then** it opens the browser at the recorded URL and exits without starting a second server
**And** a lock counts as live only when its PID is alive and `GET /api/health` on the recorded port answers `{ "app": "bookvie", "dataDir": … }` for this data folder (AD-5).

**Given** a `bookvie.lock` whose PID is dead, or whose PID is alive but doesn't answer as bookvie for this folder
**When** I run `bookvie`
**Then** the new server takes the lock over (R-13).

**Given** two `bookvie` launches at the same moment with no lock
**When** both try to create `bookvie.lock`
**Then** exactly one succeeds, because the lock is created with exclusive-create
**And** the other polls the winner's `GET /api/health` every 100 ms for up to 5 s, then opens the browser at its URL and exits
**And** when the winner hasn't answered after 5 s, the other exits non-zero with "bookvie is starting in another window; try again."

**Given** port 8765 is held by a process that isn't bookvie
**When** I run `bookvie`
**Then** it exits non-zero with a message naming the port and the `--port` flag
**And** when `GET /api/health` on that port answers as bookvie for a different data folder, the message says bookvie is already running for that folder instead (AD-16).

**Given** a running server
**When** it receives SIGINT or SIGTERM
**Then** it waits for the AD-4 lock, removes `bookvie.lock`, and exits.

**Given** a running server
**When** a request arrives with a `Host` other than `127.0.0.1:<port>` or `localhost:<port>`, or with an `Origin` present that isn't one of those
**Then** it is rejected, with every combination in the FND-API-004 matrix covered by an API test
**And** with `--dev` the Vite dev origin is also accepted
**And** the server isn't reachable on any non-loopback interface (FND-API-005).

### Story 1.3: One check command guards the repo

As Oleg,
I want one command that runs every test and gate without touching my real library,
So that I know the repo is healthy before I trust it with my data.

**Requirements:** AR21, TR4–TR7

**Acceptance Criteria:**

**Given** the repository root
**When** I run `npm run check`
**Then** the root `package.json` runs, in order, `check:py` (`uv run --project backend pytest` with the coverage gate), `check:api` (`npm --prefix frontend run check:api`), `check:e2e` (the Playwright suite) and `check:smoke` (the isolated install smoke test), stopping at the first failure with a non-zero exit
**And** every check later stories add runs inside one of these four scripts (R-16).

**Given** `check:py`
**When** it runs
**Then** it enforces the coverage thresholds (≥ 90% line on `domain/`, ≥ 80% on `intents/` + `store/`) and fails below them (TR7).

**Given** the Playwright suite
**When** it starts
**Then** a worker-scoped fixture launches `bookvie --no-browser` on a free port with a data dir under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/` (TC-4)
**And** a path guard refuses any data dir outside that root, and always refuses `~/bookvie-data` (TC-5).

**Given** `check:smoke`
**When** it runs
**Then** it builds the SPA, installs with `uv tool install` into a temporary tool dir, starts the installed `bookvie --no-browser` on a temporary data dir, and `GET /` returns the app HTML, proving the SPA is inside the installed tool.

**Given** `npm run check` has run
**When** I look at the home folder
**Then** `~/bookvie-data` is neither created nor modified
**And** the server makes no outbound network calls and logs only to stderr.

### Story 1.4: Keep the library in one safe file

As Oleg,
I want all my data kept in one folder that bookvie upgrades safely and never half-writes,
So that every browser on this machine sees the same library and a crash can never corrupt it.

**Requirements:** NFR1, NFR5, AR1–AR5, AR7, AR10, AR16, TR1–TR3

**Acceptance Criteria:**

**Given** an empty data folder
**When** the server starts
**Then** it creates `library.json` as `{ "schemaVersion": 1, "mainBookId": null, "upNextBookId": null, "sideReadBookIds": [], "books": [] }`, plus `covers/` and an empty `.staging/`
**And** at every startup leftover `library.json.tmp*` files are deleted, and an unwritable data folder makes the server exit non-zero with a message naming the path (AD-2)
**And** the bytes come only from `store.serialize()`: UTF-8, camelCase keys, nulls kept, keys in model order, 2-space indent
**And** the schema at `schemaVersion` 1 already includes Readings (with `pausedAt`), `upNextBookId` and `sideReadBookIds`, so Story 1.12 and later tests can seed them without a migration.

**Given** the store's commit path
**When** a commit runs
**Then** it writes a temp file in the same folder, fsyncs it and renames it over `library.json`
**And** one in-process lock (the AD-4 lock) covers apply → write files → commit → swap in-memory state, and views read only the committed in-memory state (AD-4).

**Given** the store's commit path
**When** a fault is injected through the filesystem seam (TC-3) at write, fsync or rename
**Then** the original file is byte-identical and the commit reports `couldnt_save` (R-03).

**Given** a `library.json` whose `schemaVersion` is newer than the server supports, or that isn't valid against the model
**When** the server starts
**Then** it exits non-zero with a message saying why, and the file is unchanged (FND-API-010, R-15).

**Given** a `library.json` at an older `schemaVersion` (a test fixture migration)
**When** the server starts
**Then** it copies the original to `library.v<N>.bak.json` before rewriting
**And** the upgrade runs through the single ordered chain in `store/migrations/`, the same chain restore will use, in memory, committed once.

**Given** a migration step that raises (a test fixture)
**When** the server starts
**Then** it exits non-zero with a message, and the original file and its backup are unchanged (AD-13).

**Given** `domain.check_invariants()`
**When** it is unit-tested with libraries built by the `LibraryBuilder` fixture (TC-1)
**Then** each AD-18 rule (pointers reference existing Books; Main is neither Up next nor a Side read; at most 3 Side reads; at most one unfinished Reading per Book; the Main book has an unfinished Reading; card-note and unfinished-Reading pages within the page count) has a failing and a passing case
**And** `LibraryBuilder` can also pre-seed a data folder before an e2e server starts.

**Given** `domain/`
**When** it needs the date or time
**Then** it receives an injected `Clock` (now, plus today as a local `YYYY-MM-DD` date) and never reads the system clock
**And** `--fake-today YYYY-MM-DD` sets that Clock but is refused at startup unless `--no-browser` is also given (TC-2)
**And** `check:py` and `check:e2e` run with `TZ=Europe/Madrid`, and the Playwright fixture sets the browser clock (`page.clock`) to the same date and `timezoneId: 'Europe/Madrid'`, so browser-side dates match the server (AD-20)
**And** DST boundary tests use the last Sundays of March and October.

### Story 1.5: Speak one API contract

As Oleg,
I want the server and the browser to share one checked contract for every request, view and error,
So that every save, refusal and failure is reported the same way and the browser can never drift from the server.

**Requirements:** NFR5, AR9, AR11–AR14, AR17, TR7

**Acceptance Criteria:**

**Given** the HTTP layer
**When** any request fails validation or is refused
**Then** the body has the AD-9 shape `{ "error": { "kind", "code", "message", "fields"? } }` with 422 for `invalid_fields`, 409 for state rules and 500/503 for `couldnt_save`
**And** FastAPI's default `{"detail": …}` never reaches the client, because a global `RequestValidationError` handler maps it
**And** error codes are an enum in the OpenAPI contract
**And** when `check_invariants()` fails after validation passed, nothing is committed, the failed rule is logged to stderr, and the response is 500 `couldnt_save` (AD-9), covered by an API test that forces the failure.

**Given** the views `GET /api/views/home` and `GET /api/views/catalog`
**When** the library is empty
**Then** each returns its Pydantic view model, with no Books and a library meter of 0 of 0.

**Given** the Pydantic models
**When** I run `npm run check:api`
**Then** `openapi-typescript` regenerates `frontend/src/api/generated/` from FastAPI's OpenAPI (alias names) and the command fails on any diff
**And** `npm run check` runs it as its `check:api` step (Story 1.3, R-18).

**Given** the frontend `api/` module
**When** any intent response arrives, success or refusal
**Then** every query keyed `['view', …]` is invalidated, all views also refetch on window focus and visibility change, and nothing is patched optimistically (AD-7)
**And** the fetch wrapper parses the AD-9 envelope into a typed success, refusal or `couldnt_save` result, and treats a network failure as `couldnt_save`.

**Given** a view query in the `api/` module
**When** its fetch fails
**Then** with no data received yet, it reports a failed-load state the page can show
**And** when it already holds data (a background refetch), it keeps the last data and reports nothing.

### Story 1.6: Open bookvie to an empty shelf

As Oleg,
I want a calm, accessible app frame with themes and an honest empty shelf,
So that bookvie feels like my own reading room from the first launch.

**Requirements:** NFR2, NFR3, NFR6, UX-DR1–UX-DR5, UX-DR8–UX-DR12, UX-DR22

**Acceptance Criteria:**

**Given** the frontend
**When** any page renders
**Then** every DESIGN.md token is available as a CSS custom property: colors and their dark twins, spine colors, typography roles, spacing, radii, elevation and the scrim (UX-DR1)
**And** UI text uses the sans system stack, and only book titles use the serif stack.

**Given** the top nav
**When** I look at it
**Then** it shows a "Skip to content" link first (visible on focus, moves focus to `main`), the wordmark, and the nav items for the pages that exist (only Catalog in this story), with later stories adding Home, Stats, Card notes and Backup in the order Home · Catalog · Stats · Card notes · Backup
**And** until Story 3.1 ships, `/` routes to Catalog and Home is not in the nav
**And** the active item has `aria-current="page"` and the 2px accent underline (UX-DR3).

**Given** the theme toggle
**When** I pick Light, Dark or System
**Then** the theme switches instantly, System follows the OS setting live, and the choice is remembered in `localStorage` (read and written inside try/catch, default System)
**And** the toggle is a `role="group"` named "Theme" with three toggle buttons using `aria-pressed` and the segmented-control selected style (UX-DR2).

**Given** any route
**When** it loads
**Then** the page has `header` (with `nav`) and `main` landmarks, exactly one `h1` (visually hidden "Home" on Home), and `document.title` "<Page> — bookvie"
**And** on a route change focus moves to the new page's `h1`.

**Given** any page
**When** it renders
**Then** it holds one polite `status` region and one `alert` region, with a shared helper that empties both, then sets text after about 100 ms (UX-DR4).

**Given** any page that shows server data
**When** its first view response hasn't arrived yet
**Then** only the header and nav render, with no spinner and no skeleton.

**Given** any page whose view fetch fails before any data has arrived (a routed failure in e2e)
**When** it renders
**Then** the page body shows "Couldn't load. Is bookvie still running?" in an `alert` region with a **Try again** button that refetches
**And** when a background refetch fails after data has loaded, the page keeps showing the last data with no message.

**Given** an empty library
**When** I open Catalog
**Then** it shows the `h1` "Catalog", the empty state (bare birch planks and "Your shelf is empty. Add your first book."), and a toolbar holding only **New book** (UX-DR22).

**Given** the shared primitives
**When** they render
**Then** `button-primary`, `button-secondary`, `link`, Text field (visible label, "(required)" outside the label element, accent focus with halo, invalid = 2px ink border plus a one-line message, never red), focus ring on `:focus-visible` and Failure message match DESIGN.md (UX-DR5)
**And** controls that can't act use `aria-disabled="true"` with a reason, never native `disabled` (UX-DR11).

**Given** OS settings
**When** `prefers-reduced-motion: reduce` is on
**Then** all transitions and animations are off (UX-DR8)
**And** under `forced-colors: active` the base forced-color rules from DESIGN.md apply (UX-DR9).

**Given** a viewport narrower than 1024px
**When** I view any page
**Then** the page scrolls horizontally instead of reflowing (NFR2, NFR3).

**Given** a date helper
**When** it formats relative dates
**Then** it counts local calendar days ("today", "yesterday", "N days ago", a future timestamp → "today", more than 365 days → "over a year ago") and recomputes on window focus and visibility (UX-DR10).

**Given** Catalog in both themes
**When** an automated axe check runs in Playwright
**Then** it reports no WCAG 2.2 AA violations.

**Given** every user-facing message, in server copy (AD-9 messages) and client copy
**When** a copy test scans them
**Then** none contains an exclamation mark, a greeting or praise, and no style uses red or warning colors for failures
**And** no character-key shortcuts, drag and drop, hover-only affordances or animations that play on load exist (UX-DR12, NFR6).

### Story 1.7: Accept a new book only when it is complete

As Oleg,
I want bookvie to save a new Book only when every required field is valid,
So that my catalog never holds half-entered books and the cataloging skill always gets a precise answer.

**Requirements:** FR-1, AR3, AR5, AR9, AR14

**Acceptance Criteria:**

**Given** a valid `POST /api/intents/add-book` (`multipart/form-data` with a JSON part named `intent`)
**When** it is sent
**Then** the Book is saved with a server-generated UUID, `createdAt`, `ownership: "owned"`, edition defaulting to 1, `coverFile: null`, its PRD fields, and empty `readings[]` and `cardNotes[]`
**And** the response is 200 `{ "ok": true, "ids": { "bookId": "<uuid>" } }`.

**Given** a Book being created
**When** it is saved
**Then** `spineColorCurated` is the next of Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone in creation order
**And** `spineColorUser` is the entered `#RRGGBB` or null, and the resolved `spineColor` is user, else curated, stored rather than computed on read (AD-11).

**Given** input that breaks any rule in the Agent Label Contract validation table (required fields; Pages a whole number ≥ 1; Edition a whole number ≥ 1; Year four digits, not after next year; ISBN 10 or 13 digits after removing hyphens and spaces, last may be X; Finished on a valid date, not in the future; Spine color `#RRGGBB` or empty; Type exactly paperback, hardcover or ebook)
**When** add-book is sent
**Then** the response is 422 `invalid_fields` listing **every** failing field with the table's exact message ("Pages is required.", "ISBN must have 10 or 13 digits.", …) and nothing is saved (CAT-API-001)
**And** text fields are trimmed before validation, so a value of only spaces counts as empty ("Title is required.").

**Given** an Author(s) value such as "Ursula K. Le Guin; Brian Attebery"
**When** the Book is saved
**Then** authors are stored as a list of trimmed names, empty entries dropped, and at least one is required.

**Given** a Tags value such as "sci-fi, Classics, classics , "
**When** the Book is saved
**Then** tags are trimmed, empty entries dropped and duplicates merged ignoring case, keeping the first spelling (["sci-fi", "Classics"]).

**Given** a Finished on date
**When** the Book is saved
**Then** it holds one finished Reading with `startDate: null`, `finishDate` set to that local date, and `finishedPages` set to the Book's pages (a back-filled Reading) (CAT-API-004)
**And** with Finished on empty, the Book has no Readings.

**Given** saved Books
**When** I fetch the catalog view
**Then** each Book appears with title, authors, pages, read status (finished if any Reading is finished), `createdAt` and resolved spine color
**And** the view lists the library's existing tags for the Tags suggestions.

**And** the standard intent ACs (TR8) hold for add-book.

### Story 1.8: Add a book with the New book panel

As Oleg, or my AI cataloging skill,
I want a labeled New book panel and a searchable list of my Books,
So that a shelf can be cataloged unattended and every save can be confirmed by title.

**Requirements:** FR-1, FR-2, FR-4, NFR8, AR23, UX-DR6, UX-DR7, UX-DR13, UX-DR14, UX-DR16–UX-DR18, UX-DR21

**Acceptance Criteria:**

**Given** Catalog
**When** I activate **New book** (also on the empty state)
**Then** a modal side panel `dialog` named "New book" opens from the right with focus on **Title**, a scrim, and a sticky footer; the body sets `scroll-padding-bottom` so a focused field is never hidden (UX-DR6, UX-DR13).

**Given** the open panel
**When** Playwright looks up each Agent Label Contract entry for this panel by exact accessible name (`exact: true`)
**Then** Title, Subtitle, Pages, Author(s), Edition (prefilled 1), Language, Publisher, Type (empty first option, then Paperback, Hardcover, Ebook), ISBN, Year, Finished on, Tags, Spine color, the swatch buttons Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone, **Add book**, **Cancel** and **Close** are found with the contract's roles, and "Title" never matches "Subtitle" (CAT-E2E-001)
**And** "(required)" sits outside each label, and required fields carry `required`.

**Given** the Tags field
**When** I type
**Then** a `combobox` with a `listbox` suggests existing tags that start with the typed text, arrow keys and Enter pick a suggestion, and any other text is always accepted (UX-DR16).

**Given** a swatch button
**When** I press it
**Then** Spine color is filled with that swatch's hex and the swatch shows `aria-pressed="true"`.

**Given** a complete form
**When** I press **Add book**
**Then** both live regions are emptied at the press, the panel closes, the `status` region reads "Added *Title*.", the new row is highlighted in the List view, and focus moves to the new row's title (CAT-E2E-002)
**And** if a search would hide the new Book, it is cleared first.

**Given** one or more invalid fields
**When** I press **Add book**
**Then** nothing is saved, the panel stays open with every value kept, each invalid field has `aria-invalid="true"` and a described-by message, the `alert` region reads "Not saved. 2 fields need attention: Pages, Language.", and focus moves to the first invalid field, with no red anywhere (UX-DR14).

**Given** the server answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Add book**
**Then** the panel stays open with every typed value kept and the `alert` region reads "Couldn't save. Your data wasn't changed." in ink (CAT-E2E-005, TR9).

**Given** typed fields
**When** I press **Cancel**, **Close** or Esc
**Then** the panel closes without a prompt, nothing is saved, and focus returns to **New book**.

**Given** Books in the catalog
**When** I open Catalog
**Then** a List view table shows Title (serif), Author, Pages, Status and Date added in that fixed column order, sorted by first author string with `Intl.Collator`, then by title (UX-DR21).

**Given** the **Search titles** field (visible label, `searchbox`, no placeholder, the first control after the nav)
**When** I type
**Then** rows whose titles don't contain the text, ignoring case, are hidden, and after about 500 ms the `status` region reads "N books match."
**And** with no matches the list area shows "No titles match “query”." and "0 books match."
**And** Esc in a non-empty field clears it (UX-DR17, UX-DR18).

**Given** the cataloging skill has just saved "Dune"
**When** it types "Dune" into **Search titles**
**Then** it can confirm the save from a row whose title equals "Dune" exactly, even though "Dune Messiah" also matches.

**Given** I press **Add book**
**When** the request is in flight
**Then** **Add book** has `aria-disabled="true"` and further presses send nothing until the response arrives.

### Story 1.9: Get warned about duplicates

As Oleg,
I want bookvie to warn me before it adds a Book I already have,
So that a second copy or a skill's repeated entry doesn't clutter my catalog.

**Requirements:** FR-3, AR15, UX-DR15

**Acceptance Criteria:**

**Given** the `domain/` matching functions
**When** they are unit-tested
**Then** ISBNs match after removing hyphens and spaces and converting ISBN-10 to ISBN-13 ("0-441-17271-7" matches "9780441172719")
**And** titles match ignoring case and extra whitespace
**And** authors match as sets of semicolon-separated names, ignoring case and surrounding spaces, with at least one shared name required (R-08).

**Given** an existing Book with the same normalized ISBN
**When** add-book is sent without `confirmDuplicate`
**Then** the response is 409 `duplicate_book`, listing the matching Books (title, authors, ISBN), and nothing is saved (CAT-API-009).

**Given** the new Book or the existing Book has no ISBN, the titles match, and at least one author is shared
**When** add-book is sent
**Then** it is refused with `duplicate_book`
**And** two Books with different ISBNs never match on title and author alone.

**Given** a `duplicate_book` refusal
**When** the same intent is resent with `confirmDuplicate: true`
**Then** the Book is saved as normal.

**Given** an add-book payload that both has invalid fields and matches an existing Book
**When** it is sent
**Then** the response is 422 `invalid_fields`, because field validation runs first and the duplicate check runs only on a valid payload.

**Given** a refusal in the New book panel
**When** the response arrives
**Then** an `alertdialog` named "Possible duplicate" opens over the panel, its description naming up to three matching Books and "and N more"
**And** the panel behind is `inert`, so only **Don't add** and **Add anyway** are exposed, and there is no warning color and no "Open existing" (UX-DR15).

**Given** the Duplicate dialog
**When** I press **Don't add** (which has default focus)
**Then** the dialog closes, nothing is saved, every typed field is kept, and focus returns to **Title** (CAT-E2E-003).

**Given** the Duplicate dialog
**When** I press **Add anyway**
**Then** the intent is resent with `confirmDuplicate: true`, and the outcome is the same as a normal "Added *Title*." save.

**And** the standard intent ACs (TR8) hold for add-book with the duplicate check.

### Story 1.10: See the library as a bookcase

As Oleg,
I want my catalog drawn as birch shelves of spines, with read books in color and unread ones outlined,
So that I can see at a glance how much of my library I have read.

**Requirements:** FR-4, FR-24, NFR7, UX-DR21, UX-DR24–UX-DR27, UX-DR30

**Acceptance Criteria:**

**Given** Catalog with Books
**When** it opens
**Then** the Bookcase view is the default, and a `role="group"` "Catalog view" toggle (Bookcase · List, `aria-pressed`) switches views, remembered in `localStorage` (UX-DR21)
**And** Search titles applies to both views.

**Given** the catalog view
**When** the client renders spines
**Then** the server supplies per Book the resolved spine color, read status, title, first author and author count, plus the "X of Y finished" meter, with X counting Books that have at least one finished Reading (back-fills included) and Y counting all Books (AD-6).

**Given** a spine
**When** it renders
**Then** it is 28px wide, with height = 120px + 0.3 × the title's rendered one-line length in the spine-label style, rounded up to 8px and capped at 200px (Dune → 136px, The Left Hand of Darkness → 168px)
**And** a read spine shows its exact stored color with the `spine-edge` line on top and sides and the title on the label strip (max 96px, label one line with an ellipsis)
**And** an unread spine shows the unread fill, a 1.5px outline and unread text with no strip (UX-DR24).

**Given** a spine
**When** assistive tech reads it
**Then** it is a `button` in a list item, named "*Title* by *First author*, not read yet" or "…, finished", with "by *First author* and N others" for several authors, and the full title even when the label is cut (UX-DR25).

**Given** the bookcase
**When** it renders
**Then** it is a `shelf-wall` card of birch planks with a "BOOKCASE" header, the library meter (a progressbar with `aria-valuetext` "24 of 73 finished") and a footer legend for finished and not read yet
**And** it is a `list` named "Bookcase, N books", spines are packed into rows by viewport width and ordered by author then title, and the page scrolls normally (UX-DR26, UX-DR30).

**Given** a library of 500 seeded Books
**When** Catalog renders
**Then** all 500 spines are in the page (no lazy rows), so find-in-page and the keyboard reach every spine (NFR7).

**Given** keyboard focus on the bookcase
**When** I use the keys
**Then** the bookcase is one Tab stop with roving tabindex that remembers the last focused spine; Left and Right move in sort order across rows; Up and Down move to the nearest horizontal center in the adjacent row; Home and End go to the first and last spine; and there is no type-ahead (UX-DR27).

**Given** Search titles narrows the shelf
**When** the focused spine is hidden
**Then** non-matching spines are `hidden` and the shelf closes up, and focus moves to the nearest remaining spine in sort order, or to Search titles when none remain.

**Given** I just added a Book
**When** the panel closes in Bookcase view
**Then** the new spine is scrolled into view with the highlight ring (fading over about 2 s, instant under reduced motion) and receives focus.

**Given** the cataloging skill has just saved "Dune" and Catalog opens in Bookcase view (default or remembered)
**When** it types "Dune" into **Search titles**
**Then** it can confirm the save from a spine whose accessible name starts with "Dune by " (the UX-DR25 name pattern), which "Dune Messiah by …" never matches
**And** CAT-E2E-002 runs in both Bookcase and List view.

**Given** both themes and forced colors
**When** the bookcase renders
**Then** read and unread spines stay distinct, and axe reports no AA violations.

### Story 1.11: Open and edit a book

As Oleg,
I want a page for each Book where I can see and correct its details,
So that mistakes from cataloging and back-filled finish dates can be fixed.

**Requirements:** FR-1, FR-3, FR-4, UX-DR7, UX-DR43

**Acceptance Criteria:**

**Given** a Book
**When** I activate its title in the List view
**Then** its Book detail page opens: a surface card whose `h1` is the title (serif), with subtitle, author, a metadata grid (Pages, Edition only when it isn't 1, Language, Publisher, Type, ISBN, Year), Tags as non-interactive chips, and a Readings block (UX-DR43)
**And** a back-filled Reading shows as "Finished 14 Aug 2019" with no start date
**And** `document.title` is "*Title* — bookvie".

**Given** Book detail
**When** I press **Edit**
**Then** the panel opens as a `dialog` named "Edit book", prefilled, with **Save changes** as its submit
**And** on success it closes, the `status` region reads "Saved *Title*.", and focus returns to **Edit**.

**Given** `edit-book`
**When** it is sent
**Then** it applies the same field validation as add-book (422 `invalid_fields`)
**And** it runs the duplicate check only when the title, an author or the ISBN changed, with the same 409 / `confirmDuplicate` flow
**And** the duplicate check compares against every Book except the one being edited, so an API test that changes only an ISBN's hyphenation never gets `duplicate_book`.

**Given** a `duplicate_book` refusal for `edit-book`
**When** the response arrives
**Then** the same Possible duplicate `alertdialog` opens over the Edit book panel, with **Don't save** (default focus) and **Save anyway** (both in the Agent Label Contract)
**And** **Don't save** closes it with nothing saved and returns to the panel unchanged, with focus on **Save changes**
**And** **Save anyway** resends `edit-book` with `confirmDuplicate: true`, with the same outcome as a normal "Saved *Title*." save.

**Given** any `edit-book` refusal that carries `fields` (422 `invalid_fields`, or a 409 such as `pages_below_current_page`)
**When** the response arrives
**Then** the Edit book panel shows it exactly like the New book panel: each named field has `aria-invalid="true"` and a linked message, the `alert` region holds the summary, and focus moves to the first invalid field (AD-9).

**Given** a Book whose unfinished Reading is at page 300 (seeded with `LibraryBuilder`)
**When** I save Pages = 250
**Then** it is refused with 409 `pages_below_current_page` and the field message "Pages can't be less than 300, the page you're on." (CAT-API-006)
**And** finished Readings keep their `finishedPages` when Pages changes.

**Given** a Book with a Card note on page 270
**When** I save Pages = 260
**Then** it is refused with "Pages can't be less than 270, where a card note is."
**And** for a range the highest Card note page is its `pageEnd` when present, else its `pageStart` (a note on pp.268–272 refuses Pages = 270).

**Given** a Book with finished Readings
**When** the edit panel opens
**Then** Finished on shows the most recent finish date, and changing it changes that Reading's `finishDate` (not in the future)
**And** clearing it is refused with "A finish date can't be removed here."

**Given** the most recent finished Reading has a `startDate`
**When** Finished on is changed to a date before it
**Then** nothing is saved, and the response is 422 with "Finished on can't be before 12 March 2026, when this reading started." on Finished on (the same message as FIN-API-003).

**Given** a Book with no finished Reading
**When** I fill Finished on and save
**Then** a back-filled Reading is added
**And** on a Book with an active or paused Reading, the current Reading is left untouched.

**Given** an edit that changes Spine color
**When** it is saved
**Then** `spineColor` is resolved again, and edits that don't touch a color input leave it unchanged (AD-11).

**And** the standard intent ACs (TR8) hold for edit-book, and the panel's couldn't-save behavior matches Story 1.8.

### Story 1.12: Delete a book

As Oleg,
I want to delete a Book after an explicit confirmation,
So that an accidental duplicate can be removed without risking anything else.

**Requirements:** FR-1, NFR5, UX-DR46

**Acceptance Criteria:**

**Given** Book detail
**When** I press **Delete**
**Then** an `alertdialog` asks "Delete *X*? Its readings and card notes are deleted too.", with **Delete book** and **Cancel**, and **Cancel** has default focus
**And** when the Book is Main, Up next or Waiting for you (seeded in the test), the dialog adds "It is your Main book.", "It is Up next." or "It is waiting for you at p.120."

**Given** the Confirm dialog
**When** I press **Cancel** or Esc
**Then** nothing changes and focus returns to **Delete** (CAT-E2E-006).

**Given** the Confirm dialog
**When** I press **Delete book**
**Then** `delete-book` removes the Book with its Readings and Card notes, and clears `mainBookId`, `upNextBookId` and `sideReadBookIds` entries pointing at it, all in the same commit
**And** a vacated Main book or Up next stays empty, with nothing promoted (CAT-API-007)
**And** the app goes to Catalog with focus on **Search titles**, or on the empty state's **New book** when the deleted Book was the last one.

**Given** the Confirm dialog and a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Delete book**
**Then** the dialog stays open, "Couldn't save. Your data wasn't changed." appears in an `alert` line inside the dialog above its buttons, and the Book is unchanged (TR9).

**And** the standard intent ACs (TR8) hold for delete-book.

### Story 1.13: Add a cover

As Oleg,
I want to attach a photo of each Book's cover,
So that my Books are recognizable and their spines can take the cover's color.

**Requirements:** FR-1, AR6, UX-DR23

**Acceptance Criteria:**

**Given** the New book or Edit book panel
**When** I choose a file in **Cover** (`input type=file`, exact label "Cover")
**Then** add-book and edit-book send it as the multipart file part, still in one call and one commit.

**Given** an uploaded file
**When** the server receives it
**Then** Pillow re-decodes it, and anything that isn't an image (including a non-image with an image extension, and a decompression bomb over Pillow's `MAX_IMAGE_PIXELS`) is refused with 422 and "Cover must be an image file."
**And** uploads over 20 MB are refused while streaming, before the whole body is read, with 413 `cover_too_large` and the field message "Cover must be 20 MB or smaller." (R-14)
**And** a HEIC file, or any format Pillow can't decode without a plugin, is refused with 422 and "Cover must be a JPEG, PNG or WebP image." (AD-12)
**And** every cover message appears on **Cover** like any other field error and is listed in the Agent Label Contract.

**Given** a valid image
**When** it is stored
**Then** its EXIF orientation is applied, CMYK is converted to RGB, only the first frame of an animation is kept, and it is downscaled to a long edge of at most 1200px, keeping its aspect ratio
**And** it is re-encoded as JPEG, or PNG when it has transparency, and saved under a new server-minted name `covers/<book-id>-<uuid>.<ext>` recorded in `coverFile`, with `<ext>` from the output format, never from the uploaded file name
**And** replacing a cover writes a new name and never overwrites or reuses one.

**Given** any cover write
**When** the intent runs
**Then** the order is: new files (temp + rename), then the document commit, then deleting files no Book references.

**Given** a cover write
**When** a fault is injected at the document commit
**Then** the old document and its cover are intact and the new file is cleaned up (R-03).

**Given** a cover write whose document commit succeeded
**When** a fault is injected while deleting files no Book references
**Then** the response is still 200, the failure is logged to stderr, and the startup sweep removes the leftover file (AD-12).

**Given** a stored cover
**When** the browser requests `/media/covers/<file>`
**Then** it is served with immutable caching
**And** at startup the server deletes cover files that no Book references, and delete-book removes its cover after the commit.

**Given** a new or replaced cover
**When** it is stored
**Then** `spineColorFromCover` is computed once using the DESIGN.md cover rule (≈64px sample, near-neutral pixels ignored, 24 hue bins, average of the fullest bin, saturation capped at 0.45)
**And** a black-and-white cover gives none, so curated applies
**And** the resolved color stays user, else from cover, else curated.

**Given** Book detail
**When** a Book has no cover
**Then** the no-cover placeholder (surface-inset fill, dashed outline, two title bars) appears at the cover's size and isn't interactive (UX-DR23)
**And** the "From cover" swatch in the panel appears only when a cover exists, and pressing it empties Spine color.

**Given** the Edit book panel for a Book with a cover
**When** I press **Remove cover** (shown only when a cover exists) and save
**Then** `edit-book` is sent with `removeCover: true`, `coverFile` and `spineColorFromCover` are cleared, the file is deleted after the commit (AD-12), and the resolved spine color falls back to user, else curated (AD-11)
**And** Book detail shows the no-cover placeholder.

**And** the standard intent ACs (TR8) hold for the cover paths of add-book and edit-book.

### Story 1.14: Change a book's color from the shelf

As Oleg,
I want to open a spine and change its color,
So that each read book keeps the color I associate with it.

**Requirements:** FR-1, FR-24, UX-DR28, UX-DR29

**Acceptance Criteria:**

**Given** a spine
**When** I click it or press Enter or Space
**Then** a non-modal `dialog` popover labeled by the Book's title opens above the spine with a pointer (below on the top row, shifted inward at viewport edges, at most viewport width − 32px), the spine gets `aria-haspopup="dialog"` and `aria-expanded="true"`, and only one popover is open at a time (UX-DR28).

**Given** an open popover
**When** it opens
**Then** focus moves to its first actionable control, and Tab from the last control (or Shift+Tab from the first) closes it
**And** Esc, an outside click, × or focus leaving it close it, returning focus to the spine.

**Given** the popover
**When** I read it
**Then** it shows title, subtitle, authors, "N pages · year", the status line and the color line, plus an "Open book →" link to Book detail
**And** it has no primary action until Stories 3.2 and 4.4 add them.

**Given** the Change color block in the popover and on Book detail
**When** I pick "From cover" (only when a cover exists) or one of Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone (toggle buttons with `aria-pressed`)
**Then** `set-spine-color` saves at once, with "From cover" clearing the user color, and the `status` region reads "Color set to Teal."
**And** the color line names where the color comes from ("Color: Teal, from cover", "Color: Sage", "Color: set by you")
**And** on an unread Book the block heading adds "· shown once read" (UX-DR29).

**Given** a color change that can't be saved
**When** the server answers `couldnt_save`
**Then** the failure line "Couldn't save. Your data wasn't changed." appears and the previous selection stays shown.

**And** the standard intent ACs (TR8) hold for set-spine-color.

## Epic 2: Keep the library safe

The user can export all data to one file with one click, see "Last export: N days ago", and restore onto a fresh machine, with damaged, hostile and newer files refused and nothing changed. Because export packages the data folder as a whole (AD-14), data added by later epics is covered without changes here.

**Gate:** byte-identical round trip (BKP-API-001); every refusal and fault test green (BKP-API-003..005); per-epic quality gates (TR7). Closes R-02, R-14.

### Story 2.1: Export all data with one click

As Oleg,
I want to export my whole library to one file with a single action,
So that a dead disk can never take my readings and notes with it.

**Requirements:** FR-22, AR8, AR18, UX-DR53

**Acceptance Criteria:**

**Given** the top nav
**When** Epic 2 ships
**Then** a **Backup** item is added at the end of the nav (Catalog · Backup until Home, Stats and Card notes arrive), leading to a Backup page whose `h1` is "Backup" (UX-DR53).

**Given** the Backup page
**When** it renders
**Then** it shows two surface cards: Export (**Export all data** as `button-primary`, with "Last export: N days ago" or "No export yet" below in meta / ink-tertiary) and Restore (**Restore from file…** as `button-secondary` with a one-line explanation).

**Given** a library with Books, back-filled Readings and covers
**When** I press **Export all data**
**Then** `GET /api/export` returns one `.zip` holding exactly `library.json` and `covers/` (a directory entry even when there are no covers) and nothing else, and the browser downloads it as `bookvie-export-<YYYY-MM-DD>.zip`
**And** under the AD-4 lock the zip is built into a spooled temp file (in memory up to about 10 MB, then on disk), so it never captures a half-written state; the lock is released, then the file is sent (AD-14).

**Given** an export that takes longer than about 300 ms
**When** it runs
**Then** the button reads "Exporting…" and is disabled until it finishes, at 60% opacity with no spinner (the one allowed native-disabled case).

**Given** an export download
**When** the server has sent the last byte with no client disconnect
**Then** the server records the time in `local-state.json` in the data folder (never inside the export) (AD-14, AD-15)
**And** a download the client aborts, or a HEAD request, records nothing (API tests for both)
**And** the line reads "Last export: today" in every browser on this machine.

**Given** an export that fails (for example, a cover can't be read)
**When** I press **Export all data**
**Then** the failure happens while the zip is built, before any response header is sent, and the response is 503 with the error kind and code `couldnt_export`, covered by an API test
**And** the page shows "Couldn't export. Your data wasn't changed." as a failure line, and "Last export" keeps its previous value.

### Story 2.2: Restore my library from an export

As Oleg,
I want to restore everything from an export file onto a fresh install,
So that a new laptop shows my library exactly as I left it.

**Requirements:** FR-23, AR7, AR18, UX-DR53

**Acceptance Criteria:**

**Given** the Backup page
**When** I press **Restore from file…** and pick a file
**Then** an `alertdialog` asks "Replace all data with this file? Your current books, readings and card notes will be replaced.", with **Replace all data** and **Cancel**, and Cancel has default focus.

**Given** the Confirm dialog
**When** I press **Cancel** or Esc
**Then** nothing changes and focus returns to **Restore from file…**.

**Given** I confirm with a valid export at the current `schemaVersion`
**When** `restore` runs (`POST /api/intents/restore`, multipart, one call)
**Then** `.staging/` is emptied and the archive is unpacked into it, the whole file is validated (schema, AD-18 invariants, every referenced cover present and decodable) before anything is replaced, and the result is applied in AD-12 order: archive covers in, then the `library.json` commit (AD-2), then covers the new document doesn't reference are deleted
**And** the whole operation holds the AD-4 lock.

**Given** a restore that succeeds
**When** it completes
**Then** the `status` region reads "Restored.", the app goes to the launch page `/` with the restored data, and focus is on that page's `h1`
**And** `local-state.json` ("Last export") and the browser's preferences (theme, Catalog view, sort) are left as they were.

**Given** a valid export at an older `schemaVersion` (test fixture)
**When** it is restored
**Then** it is migrated through the same `store/migrations/` chain used at startup, then replaces the current data.

**Given** a library exported and then restored at the same `schemaVersion`
**When** the files are compared
**Then** `library.json` and every cover are byte-identical to the originals (BKP-API-001).

**Given** a restore running
**When** it takes longer than about 300 ms
**Then** the button reads "Restoring…" and is disabled until it finishes.

**Given** the server starts
**When** `.staging/` holds leftovers from an interrupted restore
**Then** they are deleted
**And** `.staging/` is also emptied after every restore, whether it succeeded or was refused.

**Given** an export from a library with no covers
**When** it is restored
**Then** it succeeds, with a missing `covers/` treated as empty.

**Given** a restore whose document commit succeeded
**When** a fault is injected while deleting unreferenced covers or emptying `.staging/`
**Then** the response is still success and "Restored." is shown, the failure is logged to stderr, and the startup sweep removes the leftovers (AD-12).

### Story 2.3: Refuse damaged, hostile or newer files

As Oleg,
I want a wrong or broken file to be refused before anything changes,
So that a restore can never leave me with less than I had.

**Requirements:** FR-23, NFR5, AR18

**Acceptance Criteria:**

**Given** a file that isn't a zip, a zip without `library.json`, a truncated archive, or a `library.json` that fails the schema or AD-18 invariants
**When** I confirm the restore
**Then** it is refused with 422 `restore_invalid` and "This file isn't a bookvie export, or it's damaged. Nothing was changed.", and `library.json` and `covers/` are byte-identical to before (BKP-API-003)
**And** a `library.json` that references a missing or undecodable cover is refused the same way, with 422 `restore_invalid`.

**Given** an export whose `schemaVersion` is newer than the server supports
**When** I confirm the restore
**Then** it is refused with 422 `restore_newer_version` and "This export is from a newer version of bookvie. Nothing was changed." and nothing changes.

**Given** an archive with an entry other than `library.json` or `covers/<name>`, an absolute path, a `..` component, a symlink, a duplicate name, more than 5,000 entries, an upload over 1 GB, or more than 1 GB extracted (counted on bytes written, including an archive whose headers understate its sizes)
**When** it is restored
**Then** it is refused with 422 `restore_unsafe` and the same message as `restore_invalid`, before anything is written outside `.staging/`, and nothing outside `.staging/` changes (BKP-API-004, R-14).

**Given** a valid archive, and a fault injected through the filesystem seam while covers are being copied in or at the document commit
**When** the restore runs
**Then** the previous `library.json` is intact and still references only covers that exist, and the response is 503 `couldnt_save` with "Couldn't save. Your data wasn't changed." (BKP-API-005, R-02).

**Given** any refusal
**When** it is shown on the Backup page
**Then** it appears as one ink failure line under Restore (no red, no icon), and focus returns to **Restore from file…**
**And** every refusal code (`restore_invalid`, `restore_newer_version`, `restore_unsafe`, `couldnt_save`) is in the AD-9 enum with an API test.

## Epic 3: Read a book with visible progress

The user can start a Book as the Main book with an optional Purpose, see it on Home with cover, gauge and page field, catch up in at most 2 interactions, see "Last updated…" and "~N days left", and finish it with the one-time spine fill, including re-reads. In this epic, starting a Book while another is Main pauses the previous one and says so; Epic 4 adds where the paused Book goes (Up next, Waiting for you).

**Gate:** PRG-E2E-001 (≤ 2 interactions) green; fake-Clock tests for re-entry and finish dates green; per-epic quality gates (TR7). Closes R-07, R-10, R-17 (with Epic 4: R-01).

### Story 3.1: See my Main book on Home

As Oleg,
I want Home to show my Main book with its cover and how far I am,
So that opening bookvie tells me where I am in one glance.

**Requirements:** FR-21, FR-22, AR11, UX-DR3, UX-DR22, UX-DR32–UX-DR35

**Acceptance Criteria:**

**Given** the top nav
**When** this story ships
**Then** **Home** is added as the first nav item (Home · Catalog · Backup until Stats and Card notes arrive), and `/` routes to Home, which becomes the launch page that `bookvie` opens (UX-DR3).

**Given** an empty library
**When** I open Home
**Then** the header line is today's date (for example "Wednesday, 28 October"), with no greeting
**And** an e2e test started with `--fake-today` asserts that the header shows that date (TC-2, AD-20)
**And** the empty state shows bare birch planks, "Your shelf is empty. Add your first book." and a **New book** button that navigates to Catalog and opens the New book panel (UX-DR22).

**Given** no Main book
**When** Home renders
**Then** "Last export: N days ago" (or "No export yet") appears muted at the right end of the Home header line, informational only and never a warning (FR-22).

**Given** Home in both themes, empty and with a Main book
**When** an automated axe check runs in Playwright
**Then** it reports no WCAG 2.2 AA violations.

**Given** a Main book (seeded with `LibraryBuilder`)
**When** I open Home
**Then** the layout is the date header, a two-column grid (a fluid Main book card beside a 320px side column) and room for the bookcase slice below (UX-DR32)
**And** the Main book card shows the 200×300 cover (or the no-cover placeholder), the "MAIN BOOK" eyebrow, the title in serif (3-line clamp) as a link to Book detail, the author, and the edition only when it isn't 1 (FR-21, UX-DR33).

**Given** the Main book at page 212 of 330
**When** the gauge renders
**Then** the home view supplies the percentage (64%, computed only on the server as floor(page × 100 ÷ pages), so it reads 100% only at the last page, AD-6), and the gauge shows "64%" in the gauge figure, "p.212 of 330", and ticks 0 · 165 · 330 (the half tick dropped under 4 pages)
**And** it is a progressbar with `aria-valuemin="0"`, `aria-valuenow="212"`, `aria-valuemax="330"` and `aria-valuetext` "64%, page 212 of 330" (UX-DR35).

**Given** a Main book at page 0
**When** Home renders
**Then** the gauge shows 0% and "p.0 of 330".

**Given** no Main book and at least one Book
**When** I open Home
**Then** the card frame shows "No Main book." and a link "Choose a book in the Catalog" (UX-DR34).

**Given** Book detail for the Main book or a paused Book
**When** it renders
**Then** the Current reading block shows the status, the gauge and the Purpose
**And** the spine's accessible name is "…, Main book, 64%" or "…, waiting for you, page 120" per the Book states table.

### Story 3.2: Start reading a book

As Oleg,
I want to start a Book as my Main book through a short confirmation where I can write why I'm reading it,
So that exactly one Book is tracked and I start it on purpose.

**Requirements:** FR-5, FR-9, AR4, UX-DR39, UX-DR44

**Acceptance Criteria:**

**Given** Book detail for a Book with no active or paused Reading that isn't Main
**When** I press **Start reading** (the page's single `button-primary`)
**Then** a modal Start dialog opens with the heading "Start *X*?" (*X* in serif), an optional one-line "Purpose (optional)" field, **Start reading** and **Cancel**
**And** the dialog is shown even when there is no Main book, because it carries the Purpose field (FR-5, FR-9, UX-DR39)
**And** focus starts in **Purpose (optional)** (Story 4.7 starts it in "Which page?" when that field is shown).

**Given** the Start dialog
**When** I press **Start reading**
**Then** `start-reading` makes the Book `mainBookId` and creates a Reading with `startDate` = today, `currentPage` 0, the Purpose (trimmed, null when empty) and `lastProgressUpdate` = now
**And** the app goes to Home with focus on the Main book title link.

**Given** a Book with a finished Reading and no unfinished one
**When** I start it
**Then** a new Reading is created for the re-read, and earlier Readings are unchanged.

**Given** the Main book
**When** `start-reading` is sent for it
**Then** it is refused with 409 `already_main` and nothing changes (AD-9).

**Given** a paused Reading (seeded, or paused by an earlier start)
**When** I press **Resume** on its Book detail
**Then** the dialog reads "Resume *X*?" with the existing Purpose prefilled, and confirming resumes the same Reading at its page, sets `lastProgressUpdate` to now and makes the Book Main (AD-19).

**Given** a Main book *Y* at p.120 of 187
**When** I open the Start dialog for another Book
**Then** it shows "This pauses *Y* at p.120 (64%)."
**And** confirming pauses *Y*'s Reading at its page, records `pausedAt` = today, and starts or resumes *X*, all in one intent and one commit (FR-5)
**And** this is interim behavior until Story 4.1, which also makes *Y* Up next (FR-7): tests here assert only *Y*'s `currentPage` and `pausedAt`, never `upNextBookId`.

**Given** the Start dialog
**When** I press **Cancel** or Esc
**Then** nothing changes and focus returns to the opener (RDG-E2E-003).

**Given** a spine popover
**When** the Book's row in the EXPERIENCE.md Book states table shows Start reading or Resume
**Then** it offers a "Start reading" link (or **Resume** as its primary for a paused Book), which closes the popover and opens the Start dialog
**And** a finished Book with no Reading in progress gets no start action in the popover; its re-read starts from Book detail.

**Given** Book detail with an active or paused Reading
**When** I use **Edit Purpose**
**Then** the Purpose line becomes a one-line field with **Save** and **Cancel**, where Enter saves and Esc cancels, and `edit-purpose` stores it (UX-DR44).

**Given** the Edit Purpose field and a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Save**
**Then** the field stays open with the typed Purpose kept, and "Couldn't save. Your data wasn't changed." appears in an `alert` line directly below it (TR9).

**And** the standard intent ACs (TR8) hold for start-reading and edit-purpose, and a couldn't-save keeps the dialog open with the Purpose kept.

### Story 3.3: Catch up with one page update

As Oleg,
I want to type the page I've reached and press Update,
So that catching up after a few days takes seconds.

**Requirements:** FR-10, NFR4, UX-DR36

**Acceptance Criteria:**

**Given** the Main book card
**When** it renders
**Then** it holds the page field: label "Page", a number input prefilled with the last saved page, "of 330" linked by `aria-describedby`, and **Update** pushed right
**And** focus isn't placed in the field automatically (UX-DR36).

**Given** a page from 0 to the page count, including a lower page than before
**When** I press **Update** or Enter
**Then** `update-page` saves `currentPage` and sets `lastProgressUpdate` to now
**And** the gauge, percentage and re-entry line update together after the views refetch, and the `status` region reads "Page 212 of 330, 64%." (FR-10).

**Given** an out-of-range or non-numeric page
**When** I press **Update**
**Then** nothing is saved, the field keeps the typed value with `aria-invalid="true"`, and "Page must be between 0 and 330." appears under it and in the `alert` region
**And** a page that isn't a whole number (such as 212.5) counts as non-numeric: the input uses `step="1"`, and the server refuses anything but an integer with the same message.

**Given** the Book's last page
**When** I press **Update**
**Then** the page is saved, the Reading stays unfinished, and the response carries `reachedLastPage: true` (PRG-API-002)
**And** until Story 3.6 adds the Finish dialog, the client ignores `reachedLastPage`.

**Given** a page update from a tab that still shows *X* as Main after another tab changed the Main book
**When** `update-page` is sent for *X*
**Then** it is refused with 409 `not_main_book`, nothing changes, and the refreshed views show the current state (AD-9).

**Given** a fresh app open with a Main book
**When** a Playwright test catches up
**Then** it takes at most 2 interactions (click the field and type, then press **Update**) and finishes in under 30 seconds (PRG-E2E-001, NFR4, R-17).

**Given** the server answers `couldnt_save`
**When** I press **Update**
**Then** the typed page stays in the field, the gauge doesn't move, and "Couldn't save. Your data wasn't changed." appears below (TR9).

**And** the standard intent ACs (TR8) hold for update-page.

### Story 3.4: See where I left off and how long is left

As Oleg,
I want a quiet line saying when I last updated and about how many days are left,
So that I can pick up again without guilt or arithmetic.

**Requirements:** FR-11, AR16, UX-DR37

**Acceptance Criteria:**

**Given** `domain/` Measured pace
**When** it is unit-tested with a fake Clock
**Then** it equals total `finishedPages` of finished Readings with a start date ÷ Σ(finishDate − startDate + 1)
**And** back-filled Readings are excluded, a same-day start and finish counts 1 day, and with no qualifying Reading there is no Measured pace (AR16).

**Given** a Main book
**When** the home view is computed
**Then** it supplies days left = ceil(pages left ÷ Measured pace), with a minimum of 1
**And** it omits days left when there is no Measured pace, when Measured pace is 0, or when no pages are left (FR-11, R-10).

**Given** the Main book card
**When** the re-entry line renders
**Then** it shows up to three muted facts separated by dots: "Last updated today / yesterday / N days ago" (local calendar days from `lastProgressUpdate`), "~N days left" ("~1 day left" at minimum), and "Last export: N days ago" or "No export yet"
**And** nothing in it is ever colored or styled as a warning (UX-DR37, NFR6).

**Given** a Main book with a "Last export" fact
**When** Home renders
**Then** "Last export" sits in the re-entry line, and returns to the Home header line when there is no Main book.

**Given** a Main book at its last page
**When** Home renders
**Then** the gauge shows 100% and "~N days left" is hidden.

**Given** a tab left open past midnight
**When** the window regains focus
**Then** "Last updated" and the Home date recompute.

### Story 3.5: See my reading on Home's shelf

As Oleg,
I want a slice of my bookcase on Home with my Main book's spine filling as I read,
So that progress is something I can see on the shelf, not only a number.

**Requirements:** FR-24, AR11, UX-DR24, UX-DR31

**Acceptance Criteria:**

**Given** the home view
**When** it is computed
**Then** the server supplies the slice priority: the Main book, then the Up next Book (when one exists), then Books by most recent finish, newest first (AD-6)
**And** the client packs the full bookcase into rows at the current width and shows up to 3 rows: the row holding the Main book, then the Up next Book's row, then rows with the most recent finishes, filled from the first rows when fewer qualify (UX-DR31).

**Given** chosen slice rows
**When** they display
**Then** the Main book's row comes first and the others follow in bookcase order (all in bookcase order when there is no Main book)
**And** the slice recomputes on resize, never applies Catalog filters, never scrolls internally, and is a `list` named "Bookcase slice, N rows" with the actual row count, using the bookcase keyboard model
**And** on Home the arrow keys and Home/End follow the rows as displayed (Main book row first), not the full bookcase order.

**Given** a never-finished Main book at 64%
**When** its spine renders
**Then** it has the unread body and outline with its exact color filled from the plank up to 64% of the area below the label strip, topped by a 2px `spine-edge` fill line, plus the Main-book marker dot (UX-DR24).

**Given** a re-read of a finished Book
**When** it is the Main book
**Then** its spine stays full color with the Main-book marker, and its accessible name ends "finished, re-reading, 12%".

**Given** the slice header
**When** it renders
**Then** it shows "BOOKCASE", the library meter and a "See all in Catalog" link
**And** the legend adds "Main book, filled to its %" on Home and Catalog.

**Given** a page update
**When** the views refetch
**Then** the Main book spine fill moves to the new percentage together with the gauge (instantly under reduced motion).

### Story 3.6: Finish my Main book

As Oleg,
I want to record finishing a Book, with the date, whether its Purpose was fulfilled and a rating,
So that every finished Book counts and I see whether reading it did what I wanted.

**Requirements:** FR-14, AR4, AR5, UX-DR41

**Acceptance Criteria:**

**Given** `update-page` returned `reachedLastPage`, or I press **Mark finished** on the Main book's Book detail
**When** the Finish dialog opens
**Then** it is a modal headed "Finished *X*" with **Finished on** prefilled with today, "Purpose fulfilled?" (yes · partly · not yet, none preselected, the Purpose quoted above) only when the Reading has a Purpose, and a Rating radio group ("No rating" by default, then "1 star"…"5 stars", stars changing shape when selected), plus **Done** and **Cancel** (UX-DR41)
**And** focus starts in **Finished on**.

**Given** the Finish dialog
**When** I press **Done**
**Then** `finish-reading` stores `finishDate` (local date), `finishedPages` = the Book's Pages value at the time of finishing, `purposeFulfilled` and `rating` (null when skipped), and clears `mainBookId`, in one commit (FR-14, FIN-API-001)
**And** the Book counts as read, so the meter increases.

**Given** a Finished on date in the future, or before the Reading's start date
**When** I press **Done**
**Then** nothing is saved, and the field shows "Finished on can't be in the future." or "Finished on can't be before 12 March 2026, when this reading started." (FIN-API-003).

**Given** the Finish dialog opened from the page field
**When** I press **Cancel** or Esc
**Then** nothing changes, the Reading stays active at the last page, focus returns to the page field, and pressing **Update** again with the same page reopens the dialog
**And** Home's gauge shows 100% with "~N days left" hidden (Story 3.4).

**Given** I press **Done**
**When** the request is in flight
**Then** **Done** has `aria-disabled="true"` and further presses send nothing until the response arrives.

**Given** a finished Main book
**When** **Done** succeeds
**Then** the app goes to Home, the Main book card switches to "No Main book.", and focus is on the "No Main book." heading (Story 4.1 amends this when an Up next exists)
**And** Book detail's Readings block lists the Reading with its start, finish, stars and Purpose fulfilled.

**Given** `update-page` and `finish-reading`
**When** they are tested together
**Then** only `finish-reading` ever sets `finishDate` (AD-19).

**Given** a Reading that is already finished (for example, finished in another tab)
**When** `finish-reading` is sent for it again
**Then** it is refused with 409 `reading_already_finished` and nothing changes (AD-9).

**And** the standard intent ACs (TR8) hold for finish-reading, and a couldn't-save keeps the dialog open with every answer kept.

### Story 3.7: See the finish on the shelf

As Oleg,
I want the finished Book's spine to fill with its color, once,
So that finishing feels like something on my shelf changed, without fuss.

**Requirements:** FR-14, NFR6, AR12, UX-DR42

**Acceptance Criteria:**

**Given** **Done** succeeds for the Main book in this tab
**When** Home renders
**Then** the slice first scrolls the finished spine into view if needed, then fills it from its current fill to full, bottom to top, over about 600 ms ease-out with the highlight ring, and it stays solid (UX-DR42)
**And** the bookcase header shows "Finished *X*.", the meter updates, and once focus has settled the `status` region reads "Finished *X*. 25 of 73 finished."

**Given** the finish moment has played
**When** I reload, revisit Home, or look at another tab or browser that only received refreshed views
**Then** the fill never plays again and the header line is gone (AD-7, NFR6).

**Given** a finished re-read
**When** **Done** succeeds
**Then** only the highlight ring plays (the spine is already full color), the header reads "Finished *X* again.", and the meter count doesn't change.

**Given** `prefers-reduced-motion: reduce`
**When** the finish moment happens
**Then** the fill and ring are instant and the scroll uses `behavior: 'auto'`.

**Given** the finish moment
**When** it plays
**Then** there is no sound, no confetti, no praise and no exclamation mark.

## Epic 4: Switch books without losing your place

An urgent Book can interrupt the current one with every consequence stated up front. The user can pause, set Up next, see and resume every paused Reading in Waiting for you, mark any non-Main Reading finished from Book detail, and keep up to 3 Side reads. This epic carries the product thesis (SM-3).

**Gate:** RDG-UNIT-002 property test green; every EXPERIENCE.md Book-states row has a Given/When/Then API test (RDG-API-001..003); per-epic quality gates (TR7). Closes R-01, R-11.

### Story 4.1: Keep the interrupted book as Up next

As Oleg,
I want the Book I was reading to become Up next when an urgent one takes over,
So that it is the first thing bookvie offers me once the urgent one is done.

**Requirements:** FR-5, FR-7, UX-DR34, UX-DR38, UX-DR39

**Acceptance Criteria:**

**Given** a Main book *Y* and no Up next
**When** I confirm starting another Book *X*
**Then** `start-reading` pauses *Y* (recording `pausedAt`) and sets `upNextBookId` = *Y*, in the same commit as starting *X* (FR-7).

**Given** a Main book *Y* and an Up next *Z* that isn't *X*
**When** the Start dialog opens for *X*
**Then** below "This pauses *Y* at p.120 (64%)." it adds "*Z* moves to Waiting for you." when *Z* has a paused Reading, or "*Z* returns to the catalog." when *Z* was never started (FR-5, UX-DR39)
**And** confirming makes *Y* Up next and moves *Z* exactly as stated.

**Given** *X* is itself the Up next Book
**When** I start or resume it
**Then** it leaves Up next as it becomes Main, and no displacement line is shown.

**Given** a Main book and an Up next
**When** I open Home
**Then** the side column's Up next pane shows the Book with a 44×64 thumbnail (or placeholder), a serif title link, the author, and **Start reading** or **Resume** named with the title ("Resume The Left Hand of Darkness"), which opens the Start dialog (UX-DR38)
**And** with a Main book but no Up next, the pane reads "Nothing up next." with a link to Catalog.

**Given** no Main book and an Up next
**When** I open Home
**Then** the Up next pane is hidden, and the empty Main book card shows "No Main book." with the Up next Book (thumbnail, title, author) and **Start reading** or **Resume** (UX-DR34)
**And** this amends Story 3.6: after finishing the Main book, focus lands on that **Start reading** or **Resume** button when an Up next exists, and stays on the "No Main book." heading when none does, with the Story 3.6 e2e test updated to cover both cases.

**Given** two browser contexts on the same data
**When** one starts a Book and the other then regains focus
**Then** the second shows the new state after refetching, the last write wins, and no warning appears (R-11, A2).

**And** the standard intent ACs (TR8) hold for the extended start-reading.

### Story 4.2: See every paused book in Waiting for you

As Oleg,
I want every paused Book listed on Home with its page, oldest first,
So that nothing I put down is ever forgotten.

**Requirements:** FR-7, UX-DR38

**Acceptance Criteria:**

**Given** paused Readings
**When** the home view is computed
**Then** Waiting for you lists every paused Reading except the Up next Book's, ordered by `pausedAt`, oldest first, with no cap (FR-7, AD-6)
**And** Readings paused on the same day are ordered by the server title key (NFKD, combining marks stripped, casefolded), then by Book id, so the order is the same on every render (unit test with two pauses on one fake day, including titles that differ only by accents).

**Given** Waiting for you has entries
**When** Home renders
**Then** a pane headed "Waiting for you (N)" shows each row's serif title link, a 60×5 mini progressbar (labeled by the title, `aria-valuetext` "page 120 of 330, 36%"), "p.120 of 330" in tabular figures, and **Resume** named with the title
**And** the paused-at date is never shown (UX-DR38, NFR6).

**Given** no paused Readings outside Up next
**When** Home renders
**Then** the pane is hidden.

**Given** a library written under the Epic 3 behavior (Story 3.2), with a paused Reading that isn't Up next (seeded with `LibraryBuilder`)
**When** I open Home
**Then** that Book is listed in Waiting for you with **Resume**, and `check_invariants()` holds.

**Given** many paused Readings
**When** Home renders
**Then** all rows are shown, the side column grows and the page scrolls.

**Given** a row
**When** I press **Resume**
**Then** the Start dialog opens as "Resume *X*?" with its Purpose prefilled and the trade-off lines that apply, and confirming makes it Main at its page (FR-7).

**Given** a paused Book that is also Up next
**When** Home renders
**Then** it appears only in Up next with **Resume**, never also in Waiting for you, and the "(N)" count excludes it.

### Story 4.3: Pause my Main book

As Oleg,
I want to pause my Main book without starting another,
So that I can step away from reading entirely without losing my place.

**Requirements:** FR-6, FR-7, UX-DR6, UX-DR33, UX-DR40

**Acceptance Criteria:**

**Given** the Main book card
**When** I press "⋯" (accessible name "More actions", `aria-haspopup="menu"`)
**Then** a menu opens with **Pause** and **Open book**, arrow keys move between them, and Esc or an outside click closes it, returning focus to "⋯" (UX-DR33).

**Given** a Main book and no Up next
**When** I choose **Pause** (from the menu or the Main book's Book detail)
**Then** `pause` keeps the current page, records `pausedAt` = today, clears `mainBookId` and makes the Book Up next, in one commit (FR-6)
**And** the `status` region reads "Paused *X* at p.150. It's Up next."

**Given** a Main book and an Up next *Z*
**When** I choose **Pause**
**Then** a Confirm `alertdialog` first says "Pause *X* at p.150 (58%)? *Z* moves to Waiting for you." (or "*Z* returns to the catalog."), with **Pause** and **Cancel** (Cancel has default focus) (UX-DR40)
**And** confirming applies the pause and moves *Z* as stated, while **Cancel** or Esc changes nothing.

**Given** a Book that is no longer Main
**When** `pause` is sent for it
**Then** it is refused with 409 `not_main_book` and nothing changes (AD-9).

**Given** a completed pause
**When** focus settles
**Then** after a pause from Home, focus is on **Resume** in the empty Main book card, and after a pause from Book detail, it is on that page's **Resume** button.

**Given** a dialog opened from the "⋯" menu
**When** it opens
**Then** the menu closes first, so only one overlay level exists.

**Given** a paused Reading
**When** it is later resumed, and later still finished
**Then** its `pausedAt` is still the date of its last pause after each step; `pausedAt` is never cleared, only overwritten by the next pause (AD-19, SM-3).

**Given** a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I confirm **Pause** in the Confirm dialog
**Then** the dialog stays open and "Couldn't save. Your data wasn't changed." appears in an `alert` line inside it, above its buttons
**And** when **Pause** applies at once (no Up next), the same `alert` line appears directly below the **Pause** button on Book detail, or below "⋯" on Home, with focus kept there, and nothing changes (TR9).

**And** the standard intent ACs (TR8) hold for pause.

### Story 4.4: Choose what to read next

As Oleg,
I want to set any Book as Up next,
So that the Book I mean to read next is ready when the current one is done.

**Requirements:** FR-7, UX-DR28

**Acceptance Criteria:**

**Given** a Book that isn't Main and isn't already Up next
**When** I press **Set as Up next** on its Book detail (a secondary action) or in its spine popover, where it is the primary action when the Book has no Reading
**Then** `set-up-next` makes it `upNextBookId` (FR-7)
**And** the `status` region reads "*X* is Up next.", and focus moves to Book detail's primary button (its `h1` when there is none), or back to the spine when set from a spine popover.

**Given** the current Up next Book
**When** `set-up-next` is sent for it again
**Then** the response is 200, nothing changes, and nothing is committed (AD-9).

**Given** a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Set as Up next**
**Then** "Couldn't save. Your data wasn't changed." appears in an `alert` line directly below the button, focus stays on the button, and nothing changes (TR9).

**Given** an existing Up next *Z*
**When** another Book becomes Up next
**Then** *Z* moves to Waiting for you if it has a paused Reading, otherwise it returns to the catalog.

**Given** an existing Up next
**When** a spine popover offers **Set as Up next**
**Then** the hint "Replaces the current Up next." appears under the button.

**Given** the Main book
**When** I look at its actions
**Then** **Set as Up next** isn't offered
**And** `set-up-next` sent for the Main book is refused with 409 `main_cannot_be_up_next` (AD-9).

**Given** a paused Book in Waiting for you
**When** I set it as Up next
**Then** it leaves Waiting for you and appears in Up next with **Resume**.

**Given** a finished Book with no unfinished Reading, or a Side read
**When** I set it as Up next
**Then** it becomes Up next like any other Book: a finished Book shows **Start reading**, which starts a re-read, and a Side read stays in On the side as well (EXPERIENCE.md Book states: "Finished, Up next" and "Any of the above, plus Side read").

**And** the standard intent ACs (TR8) hold for set-up-next.

### Story 4.5: Mark any book finished from its page

As Oleg,
I want to mark a paused or never-finished Book finished, including one that is Up next, without touching my Main book,
So that books I finished away from bookvie, or finished in a different way, close their loop.

**Requirements:** FR-14, UX-DR41

**Acceptance Criteria:**

**Given** a Book that isn't Main and either has a paused Reading or has never been finished (whether or not it is Up next)
**When** I press **Mark finished** on its Book detail
**Then** the same Finish dialog opens, with the Purpose question only when the Reading has a Purpose (FR-14)
**And** **Mark finished** is offered only for the Main book, a paused Book or a never-finished Book, so a finished Book with no Reading in progress (even one that is Up next) doesn't offer it.

**Given** a finished Book with no Reading in progress
**When** `finish-reading` is sent for it
**Then** it is refused with 409 `reading_already_finished` and nothing changes (AD-9).

**Given** a paused or Up next Reading
**When** I press **Done**
**Then** `finish-reading` finishes that Reading, leaves `mainBookId` unchanged, and removes the Book from Up next and Waiting for you (FIN-API-002)
**And** I stay on Book detail, no finish moment plays, the `status` region reads "Finished *X*.", and focus moves to the page `h1`.

**Given** a Book with no Reading
**When** I mark it finished with Finished on 14 August 2019
**Then** a back-filled Reading (`startDate: null`) is created, the Book counts as read, and its spine takes its color
**And** when that Book is Up next, the same commit clears `upNextBookId`, as for a paused Up next.

**Given** a non-Main finish
**When** the Finished on date is before the Reading's start
**Then** it is refused with the same message as in Story 3.6.

**And** the standard intent ACs (TR8) hold for the non-Main finish paths.

### Story 4.6: See each book's state on the shelf and its page

As Oleg,
I want spines and Book detail to show exactly the state each Book is in and only the actions that make sense,
So that I always know what is waiting and what to do with it.

**Requirements:** FR-24, UX-DR24–UX-DR26, UX-DR43

**Acceptance Criteria:**

**Given** the bookcase on Home and Catalog
**When** spines render
**Then** each carries at most one 7px marker with the `marker-ring`, by priority Main, then Up next (sky), then Waiting for you (sand), and Side reads have no marker
**And** the legend adds "up next" and "waiting for you" (UX-DR24, UX-DR26).

**Given** every row of the EXPERIENCE.md Book states table
**When** its state is seeded
**Then** the spine's accessible name uses that row's status string ("not read yet, Up next", "Up next, paused at page 120", "finished, waiting for you, page 40", …), the popover shows that row's primary action, and Home shows the Book in that row's pane
**And** each row has an API test of the state and an e2e check of the name (RDG-API-001..003).

**Given** Book detail
**When** it renders
**Then** the primary button is **Resume** when the Book's Reading is paused, or **Start reading** when the Book has no active or paused Reading and isn't Main (including a re-read of a finished Book). The Main book has no primary button
**And** the secondary actions appear only when they apply, in the order Set as Up next, Pause, Mark finished, Mark as Side read / Remove from side, Add card note, Edit, Delete (UX-DR43), with each later epic's action taking its slot in that order
**And** **Edit Purpose** is not in this stack; it stays a link beside the Purpose line in the Current reading block.

**Given** the property test (RDG-UNIT-002)
**When** random sequences of start-reading, pause, set-up-next, update-page, finish-reading and delete-book run against `domain/`
**Then** `check_invariants()` holds after every step, there is never more than one Main book, and no Reading's page is ever lost except by a page the user enters (`update-page`, or "Which page?" when starting a Side read) (R-01).

### Story 4.7: Keep a few side reads

As Oleg,
I want to mark up to three Books I dip into on the side,
So that they stay in view without competing with my Main book.

**Requirements:** FR-8, UX-DR38, UX-DR45

**Acceptance Criteria:**

**Given** a Book that isn't Main
**When** I press **Mark as Side read** on its Book detail
**Then** `mark-side-read` adds it to `sideReadBookIds`, and nothing else about the Book changes: no status change, no Reading, no progress (FR-8)
**And** **Remove from side** removes it again
**And** the `status` region reads "*X* is on the side." or "*X* is off the side.", and focus moves to Book detail's primary button (its `h1` when there is none).

**Given** a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Mark as Side read** or **Remove from side**
**Then** "Couldn't save. Your data wasn't changed." appears in an `alert` line directly below the button, focus stays on the button, and nothing changes (TR9).

**Given** three Side reads already
**When** I look at **Mark as Side read**
**Then** it stays focusable with `aria-disabled="true"` and the hint "Up to 3 side reads." (UX-DR45)
**And** the server refuses a fourth with 409 `side_reads_full` and "You already have 3 side reads. Remove one first." (AD-9)
**And** `mark-side-read` sent for the Main book is refused with 409 `main_cannot_be_side_read` (AD-9).

**Given** Side reads
**When** Home renders
**Then** an "On the side" pane lists them, each with a serif title link, the author and **Start reading** named with the title, and the pane is hidden when there are none
**And** their spines' accessible names add ", on the side", with no marker.

**Given** a Side read
**When** it is started by any route
**Then** the Start dialog shows a required "Which page?" field, prefilled with its paused page if it has one, and focus starts in it
**And** confirming starts tracking from that page and removes it from the Side reads
**And** a value equal to the last page returns `reachedLastPage`, and the Finish dialog opens right after confirming
**And** a value below the paused page is accepted, as with any page update (FR-10).

**Given** a Side read that is also Up next or Waiting for you
**When** Home renders
**Then** it appears in On the side and in its Up next or Waiting for you pane, and its spine shows only that role's marker (EXPERIENCE.md Book states, precedence rule 5).

**Given** the "Which page?" field
**When** it is empty, not a whole number, or outside 0 to the Book's page count
**Then** nothing is saved, and the field shows "Which page? is required." (empty) or "Page must be between 0 and 330." with `aria-invalid="true"`, also announced in the `alert` region
**And** `start-reading` refuses the same values with 422 `invalid_fields`, covered by an API test.

**Given** a Side read that is finished from Book detail
**When** **Done** succeeds
**Then** it also leaves the Side reads.

**And** the standard intent ACs (TR8) hold for mark-side-read and unmark-side-read, and the property test (Story 4.6) includes them, with generators that combine Side read with Up next, paused and finished states.

## Epic 5: Keep what a book gave you

The user can add, edit and delete Card notes with a page or range on any Book, go through a Book's notes as a pile, and search all notes or one Book's notes.

**Gate:** CRD-API-001 green; per-epic quality gates (TR7). Closes R-09 (with Story 1.11).

### Story 5.1: Add a card note while reading

As Oleg,
I want to jot down a quote or thought with the page it came from, from Home or any Book's page,
So that I keep what a book gave me without leaving what I was doing.

**Requirements:** FR-17, UX-DR47, UX-DR49

**Acceptance Criteria:**

**Given** the Main book card or any Book detail
**When** I press **Add card note**
**Then** a small modal styled as an index card (360px) opens, headed "Card note", with Note (multi-line, required) and Page, plus **Save note** and **Cancel** (UX-DR47), with focus starting in **Note**
**And** Page is prefilled with the Book's current page (at least 1), or empty when the Book has no Reading.

**Given** a Page value of "42", "42–45", "42-45", "42 – 45", "p.42" or "pp. 42–45"
**When** I press **Save note**
**Then** `add-card-note` parses it on the server into `pageStart` and `pageEnd` ("42–42" is stored as 42 with `pageEnd: null`) and stores `{ id, text, pageStart, pageEnd, createdAt }` on that Book (AD-18, FR-17).

**Given** a page outside 1 to the Book's page count, a reversed range, or more than one range
**When** I press **Save note**
**Then** nothing is saved, and the field shows "Page must be between 1 and 330.", "The first page must come before the last." or "Use one page or one range." with `aria-invalid`, the message also announced in the `alert` region (CRD-API-001)
**And** a Note that is empty or only whitespace is refused with "Note is required."

**Given** a successful save
**When** the panel closes
**Then** I stay on the page I was on, the `status` region reads "Card note saved.", and focus returns to **Add card note**.

**Given** Book detail
**When** the Book has Card notes
**Then** a "Card notes (N)" block shows the first three notes in page order, each as a card with its text and "p.42" or "pp.42–45" below in meta / ink-tertiary
**And** with no notes it reads "No card notes yet." (UX-DR49).

**And** the standard intent ACs (TR8) hold for add-card-note, and a couldn't-save keeps the panel open with the text kept.

### Story 5.2: Edit or delete a card note

As Oleg,
I want to fix or remove a Card note,
So that my notes stay accurate.

**Requirements:** FR-17, UX-DR47

**Acceptance Criteria:**

**Given** a Card note shown on Book detail
**When** I press its **Edit**
**Then** the panel opens as "Edit card note", prefilled, with **Delete** added at the left
**And** **Save note** runs `edit-card-note` with the same parsing and validation as Story 5.1.

**Given** the edit panel
**When** I press **Delete**
**Then** an `alertdialog` asks "Delete this card note?" with **Delete card note** and **Cancel** (Cancel has default focus), stacked over the Edit card note panel (one of the two allowed stacks)
**And** **Cancel** or Esc closes only the Confirm dialog and returns to the panel with focus on **Delete**
**And** confirming runs `delete-card-note`, closes both the dialog and the panel, and focus moves to the next note's **Edit**, else the block heading.

**Given** a server that answers `couldnt_save` (a routed 503 in e2e)
**When** I press **Save note** in the Edit card note panel, or **Delete card note** in the Confirm dialog
**Then** the panel or dialog stays open with every value kept, and "Couldn't save. Your data wasn't changed." appears in an `alert` line inside it, above its buttons, and nothing changes (TR9).

**Given** the Card note on page 270 is the Book's highest Card note page
**When** it is deleted
**Then** the Pages-below rule from Story 1.11 allows lowering Pages to the highest remaining Card note page, where a range counts by its `pageEnd` when present, else its `pageStart`.

**And** the standard intent ACs (TR8) hold for edit-card-note and delete-card-note.

### Story 5.3: Find a note across all my books

As Oleg,
I want one page with all my Card notes and a quick search,
So that I can find where in which Book a thought was written.

**Requirements:** FR-19, UX-DR48, UX-DR49

**Acceptance Criteria:**

**Given** the top nav
**When** Epic 5 ships
**Then** a **Card notes** item is added in its place in the order (Home · Catalog · Card notes · Backup until Stats arrives), leading to a page whose `h1` is "Card notes".

**Given** the Card notes page unscoped
**When** it renders
**Then** the card notes view lists every note grouped under its Book's serif title, in page order within each Book, each note with its page ref and **Edit**
**And** with no notes at all it reads "No card notes yet." (UX-DR48).

**Given** **Search card notes** (visible label, no placeholder)
**When** I type
**Then** only notes containing the text, ignoring case, remain, still grouped by Book with the Book title shown; matches are wrapped in `<mark>` (accent-soft, weight 600, 1px accent underline); and after about 500 ms the `status` region reads "N notes match." (FR-19)
**And** with no matches it reads "No card notes contain “query”.", and Esc clears the field.

**Given** the Main book card
**When** it renders
**Then** it shows **See card notes · 7** (accessible name "See card notes, 7 notes") when the Book has Card notes, or just **See card notes** when it has none, and either opens the Card notes page scoped to that Book
**And** Book detail's block adds the link "See all card notes", which opens the same scoped view.

**Given** the scoped view
**When** it renders
**Then** it shows only that Book's notes with a removable "In *X*" scope chip, its search covers that Book only, and clearing the chip widens to all Books
**And** with no notes it shows "No card notes yet." with **Add card note**.

**Given** Book detail's Card notes block
**When** I type in its **Search card notes** field
**Then** the block shows every matching note of that Book (not only three) with matches highlighted, and "No card notes contain “query”." when none match, and Esc clears it
**And** the field is absent when the Book has no notes.

### Story 5.4: Go through a book's notes as a pile

As Oleg,
I want to step through a Book's Card notes one at a time,
So that I can review what it gave me at my own pace.

**Requirements:** FR-18, FR-19, FR-23, UX-DR50

**Acceptance Criteria:**

**Given** a Book's notes, from its group on the Card notes page or its Book detail block
**When** I choose "Go through as a pile"
**Then** a modal named "Card notes pile, *X*" opens with the `page` background color over the scrim, showing one note at a time in pile-text with a faint stacked edge, a **Close** button (text) at the top right, Previous · "N of M" · Next, and an "Order" radio group (Page order · Shuffled) (FR-18, UX-DR50).

**Given** the pile
**When** I press **Next** or **Previous**
**Then** the note changes and a polite live region announces "Note 3 of 7, p.42: *text*."
**And** at the first and last notes the inactive button stays focusable with `aria-disabled="true"`, with no wrap; a pile of one note has both disabled.

**Given** the Order group
**When** I pick Shuffled
**Then** the notes are reshuffled once for that change, and "N of M" follows the current order
**And** picking Page order restores page order.

**Given** a search result on the Card notes page or in Book detail's block
**When** I open it
**Then** the pile opens in Page order at that note (FR-19).

**Given** any Card notes list (Book detail's block or the Card notes page, searched or not)
**When** I activate a note's page ref ("p.42" or "pp.42–45"), a compact chip-style `button` with the accessible name "Open p.42 in the pile"
**Then** the pile opens in Page order at that note (FR-18)
**And** the note's **Edit** stays a separate button.

**Given** the pile
**When** I press **Close** or Esc
**Then** it closes and returns to the list scrolled to the last viewed note, with focus on that note's **Edit**
**And** on Book detail, focus goes to that note's **Edit** if it is shown, else to "Go through as a pile"
**And** the pile has no search and no editing.

**Given** a library with Card notes, a paused Reading, an Up next Book and Side reads (seeded with `LibraryBuilder`)
**When** it is exported and then restored
**Then** `library.json` and every cover are byte-identical to the originals (BKP-API-001 re-run with full data).

## Epic 6: Know how long and how much

The user can see when a Book, or the whole unread library, will be finished at a given pace (prefilled with Measured pace), and see Stats for any period with monthly bars.

**Gate:** fake-Clock boundary tests for pace, ranges, month edges and local dates green; per-epic quality gates (TR7). Closes R-07, R-10 (with Epic 3).

### Story 6.1: See when this book will be finished

As Oleg,
I want to type a pages-per-day pace on a Book's page and see when I'd finish it,
So that I can judge whether a Book fits before a deadline.

**Requirements:** FR-15, AR11, UX-DR51

**Acceptance Criteria:**

**Given** the book view
**When** it is computed
**Then** the server supplies the Book-scope pages left: the pages left in its current (active or paused) Reading, or all its pages when it has never been started, plus Measured pace when there is one (FR-15, AD-6).

**Given** Book detail
**When** it renders
**Then** a "How long until…?" block shows a "pages/day" field (80px) prefilled with Measured pace rounded to one decimal, or empty when there is none, and an `output` element for the result (UX-DR51).

**Given** a positive number in the field
**When** I type
**Then** the result updates on every keystroke: days = ceil(pages left ÷ pages/day), finish date = today + days, using the same rounding as the server's days left (AD-6)
**And** it reads as a duration plus a date, in days below 60 days, in months below 24 months, and in years from 24 months on
**And** below 60 days the date is a day and month ("About 12 days · 10 November"), with the year added only when it isn't this year; months and years show month and year ("About 9 months · July 2027").

**Given** zero, a negative number, non-numeric text or an empty field
**When** I type
**Then** no result and no message are shown, with no error styling.

**Given** a Book with nothing left to read (finished, no unfinished Reading)
**When** the block renders
**Then** it reads "Nothing left to read."

**Given** fake-Clock unit tests
**When** the duration formatter runs at its edges (59/60 days, 23/24 months, a pace above the pages left, a day-and-month date that crosses into next year)
**Then** each case formats as specified.

### Story 6.2: See when my whole unread library will be finished

As Oleg,
I want the same calculator for my whole library on Catalog,
So that the unread shelves get an end date.

**Requirements:** FR-15, UX-DR51

**Acceptance Criteria:**

**Given** the catalog view
**When** it is computed
**Then** the server supplies the library-scope pages left: all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, including re-reads
**And** finished Books without an unfinished Reading aren't counted, and Side read marks change nothing (FR-15).

**Given** Catalog
**When** it renders
**Then** a link "How long until…?" sits below the library meter, collapsed by default, and activating it expands the calculator inline with `aria-expanded` (UX-DR51).

**Given** the expanded calculator
**When** I type 30 with 8,100 pages left
**Then** it reads "About 9 months · <month year>", using the same field, prefill, arithmetic, formatting and invalid-input rules as Story 6.1 (UJ-5).

**Given** an API test with seeded Readings in every state
**When** library-scope pages left is computed
**Then** it matches the rule exactly, with no double counting of a Book that has both a finished and an unfinished Reading.

### Story 6.3: See what I finished in any period

As Oleg,
I want to choose a period and see how many Books and pages I finished,
So that I can look back on a month or a year of reading.

**Requirements:** FR-16, AR5, UX-DR52

**Acceptance Criteria:**

**Given** the top nav
**When** Epic 6 ships
**Then** a **Stats** item completes the order Home · Catalog · Stats · Card notes · Backup, leading to a page whose `h1` is "Stats".

**Given** the Stats page
**When** it opens
**Then** a segmented range picker offers This month · This year · Last year · All time · Custom, with This year as the default
**And** Custom reveals "From" and "To" date fields, swapping the two silently when To is before From (UX-DR52).

**Given** a range
**When** the browser requests `GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` (both inclusive local dates; both omitted for All time)
**Then** the response is `{ books, pages, bucket: "month" | "year", buckets: [{ period, books, pages }] }` (AD-6)
**And** the browser resolves the presets: This month = the 1st..today, This year = 1 January..today, Last year = the full previous year.

**Given** a range
**When** the stats view is computed for it
**Then** the server returns the count of finished Readings and the sum of their `finishedPages`, counting each finish by its local `finishDate`, back-filled Readings in their Finished on period, and re-reads again (FR-16, AD-11)
**And** "All time" starts at the earliest finished Reading, back-fills included.

**Given** the result
**When** it renders
**Then** two big numbers show books finished and pages finished, and the `status` region reads "2 books, 610 pages." when the range changes
**And** an empty range shows 0 and 0 with "No books finished in this range."
**And** All time with no finished Readings returns 0 and 0 with no buckets, and the page reads "No books finished yet."

**Given** a Book whose Pages is edited after it was finished
**When** Stats render
**Then** the totals are unchanged, because they use the stored `finishedPages`.

**Given** fake-Clock boundary tests
**When** finishes fall on the first and last day of a month and year, on 1 January, and around a timezone offset
**Then** each is counted in the right period.

### Story 6.4: See my reading month by month

As Oleg,
I want a bar for each month in the period,
So that I can see when my reading happened.

**Requirements:** FR-16, UX-DR52

**Acceptance Criteria:**

**Given** a range up to 24 months
**When** the stats view is computed
**Then** it returns `bucket: "month"` and one bucket per month in the range (`period`, `books`, `pages`), counting only finishes inside the range, so a range starting 15 March counts March from the 15th (AD-6)
**And** a range over 24 months returns `bucket: "year"` and one bucket per year.

**Given** the buckets
**When** the chart renders
**Then** each bar's height is proportional to pages finished, with its value above in meta and the period below, in the accent fill on the accent-soft track (UX-DR52)
**And** the same data is exposed to assistive tech as a table (period, books, pages).

**Given** a 900-page Book finished on 2 December
**When** the year's bars render
**Then** all 900 pages are in December, with no smoothing across months.

**Given** a change of range
**When** I pick a preset or edit Custom
**Then** the numbers and bars update instantly (no animation under reduced motion).

## Epic 7: Organize the catalog

The user can sort the catalog (Author, Title, Date added, Pages) and filter it with chips (Read / Unread, Type, Language, Tag). The bookcase closes up around the result, and Home's slice follows the sort.

**Gate:** per-epic quality gates (TR7).

### Story 7.1: Sort my catalog

As Oleg,
I want to sort my catalog by author, title, date added or pages,
So that the shelf is arranged the way I want to look at it.

**Requirements:** FR-20, UX-DR19

**Acceptance Criteria:**

**Given** the Catalog toolbar
**When** it renders
**Then** a native `select` labeled "Sort" offers Author (default), Title, Date added and Pages (FR-20, UX-DR19).

**Given** a sort key
**When** it applies
**Then** Author sorts by the first listed author string with `Intl.Collator` and then by title; Title sorts A–Z; Date added sorts newest first by `createdAt`; Pages sorts fewest first; and ties always break by title, then by `createdAt`, then by Book id, so two editions with the same title keep a stable order
**And** both the bookcase spines and the List view rows reorder, and the bookcase keyboard order follows the new order.

**Given** a chosen sort
**When** I come back later or open Home
**Then** it is remembered in `localStorage` (try/catch, default Author) and Home's bookcase slice uses the same order.

**Given** Search titles text
**When** I change the sort
**Then** the search still applies.

### Story 7.2: Filter my catalog

As Oleg,
I want to narrow the shelf to read or unread Books, a type, a language or a tag,
So that I can find the right Book for the moment.

**Requirements:** FR-20, UX-DR20

**Acceptance Criteria:**

**Given** the Catalog toolbar's second row
**When** it renders
**Then** filter chips appear in labeled groups: Status (**Read**, **Unread**), Type (**Paperback**, **Hardcover**, **Ebook**), **Language ▾** and **Tag ▾**, each chip a toggle button with `aria-pressed`, and selected chips show the accent-soft fill, a 2px accent border and a check glyph (UX-DR20).

**Given** **Language ▾** or **Tag ▾**
**When** I open it
**Then** it lists checkboxes for the values that exist in the library (from the catalog view), in alphabetical order, and with values selected the chip reads "Language: 2".

**Given** active filters
**When** they apply
**Then** chips within a group combine with OR, and groups combine with each other and with Search titles with AND
**And** non-matching Books are hidden, not dimmed, the shelf closes up, and after the change the `status` region reads "N books match." (FR-20).

**Given** any filter on
**When** I look at the row
**Then** a "Clear filters" link at its end turns every filter off.

**Given** filters that match nothing
**When** the view renders
**Then** the shelf area shows "No books match these filters." with a "Clear filters" link.

**Given** the focused spine is filtered out
**When** filters change
**Then** focus moves to its nearest remaining neighbor in sort order, or to Search titles when none remain.

**Given** filters
**When** I leave Catalog and come back
**Then** they are off, because filters aren't remembered between visits
**And** Home's slice and the library meter never apply them.

**Given** I add a Book that the current filters would hide
**When** the panel closes
**Then** the filters are cleared first, so the new spine can be highlighted.
