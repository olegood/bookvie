# bookvie

[![Test](https://github.com/olegood/bookvie/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/olegood/bookvie/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A personal, local-first web app for organizing my home library and tracking my reading. It replaces a paper reading diary as the single source of truth for reading progress. The diary can stay on the nightstand for quick notes; I catch up in the app on my next visit by entering the page I reached.

> **Status:** Epics 1 and 2 are complete (17 of 41 stories done); Epic 3 is in progress (Story 3.1 in review). Both retrospectives are done and both trace and quality gates passed. Epic 1 has 11 of its 12 action items closed, and Epic 2 has 2 of its 7. You can install and run bookvie, which opens on Home: today's date, then the Main book's card with its cover and a gauge of how far along it is (or the empty states), with the Catalog at `/catalog`. You can add books through the New book panel (with duplicate warnings), see the Catalog as a bookcase of spines or as a list, search it, open a Book to see its details, edit it, give it a cover whose color can tint its spine, press a spine to see the Book in a popover and change its color there or on Book detail, and delete it after a confirmation. On the Backup page, **Export all data** downloads the whole library as one `bookvie-export-<date>.zip`, and "Last export" shows when that last happened. **Restore from file…** puts that file back after a confirmation, replacing the whole library, and refuses a damaged, hostile or newer file with nothing changed. See [Sprint status](_bmad-output/implementation-artifacts/sprint-status.yaml) for details.

## Why

I read almost every day, but my pace depends on work. The pattern that keeps breaking my reading is the **urgency chain**: an urgent work book interrupts the one I'm reading, I lose its context, re-reading feels like no progress, and the paused book never gets picked up again.

bookvie breaks that chain by allowing exactly one tracked **Main book**, making every switch a deliberate, visible trade-off, and keeping every paused book in view until I pick it up again. Three pillars guide every decision:

- **Visible progress.** Every real reading effort moves something you can see: a percentage, a gauge, and a spine on the bookcase.
- **Conscious reading.** A Purpose when I start a book, and "Purpose fulfilled?" when I finish.
- **Simplicity.** Less state means less stress, and removing a state also removes a failure signal. No streaks to break, no "abandoned" status, nothing that resets. Simplicity beats completeness of history.

Re-reading is welcome and never counts as lost progress.

## Core ideas

- **Book → Readings.** A Book is a catalog entry for a copy I own; each read-through is a separate Reading with its own current page, Purpose, dates and rating. A re-read is a new Reading. Books I read before bookvie get a back-filled Reading from a **Finished on** date.
- **One Main book.** Starting a new one shows the trade-off first: "Start X? This pauses Y at p.120 (64%)".
- **Pause, don't abandon.** Paused Readings keep their page. An interrupted book becomes **Up next**; other paused Readings wait in **Waiting for you**, oldest first.
- **The bookcase.** Every Book is a spine on a pale birch shelf. Unread Books are outlined; finished ones show their spine color; the Main book's spine fills as I read. Coloring in the library, one spine at a time, is the only reward.
- **Quick pace calculator.** Type a pages/day value and see when a book, or the whole unread library, would be finished.
- **Card notes.** Quotes or notes with a page or page range, attached to a Book, reviewable as a pile and searchable across all Books.

## v1 scope

**Must** (the MVP)

- Catalog: create, edit, delete and search Books (required: title, pages, author, edition, language, publisher, type), with tags and an optional Finished on date for back-filling
- Agent-friendly add/edit forms with stable labels, plus a duplicate warning by ISBN or title + author
- Main book with a Start confirmation and optional Purpose, pause, Up next and Waiting for you
- Quick page update for the Main book (at most 2 interactions), with percentage and gauge
- Bookcase: a slice on the main screen and the full bookcase in the catalog, with an "X of Y finished" meter
- Finishing a Reading
- Quick pace calculator for a Book or the whole library
- Stats for any date range: books finished and pages finished, with a bar per month (per year for ranges over 24 months)
- Card notes: add to any Book, review as a pile, search across all Books
- One-click export to a single file and restore from it, from day one

**Should:** Side reads (up to 3, untracked), re-entry info with an effort estimate ("~7 days left"), finish prompts (Purpose fulfilled, 1–5 rating), filter and sort, cover on the main screen.

**Later:** shelves, goals, Sequences (Topic, Marathon, Weekend sprint), donation and the Past shelf, wishlist, more progress visuals, organizing extras, Card note extras, resuming extras, more stats, and a near-finish guard.

**Won't:** multiple users or sharing, phone layouts, borrowed books, batch or in-app import, a local API, a session timer, per-day page logs, an abandoned status, an audiobook format, email or push nudges.

**Non-functional:** runs in a browser on one laptop or desktop (1024px minimum width) with no account, network, or database server; light, dark, or system theme; English only; catch-up takes under 30 seconds; no action silently deletes data and a failed save is never silent; no guilt mechanics, greetings or praise.

## Design

The visual direction is **Birch Morning**: bright, flat and Nordic, with pale birch wood and one sage accent. The dark theme is the same room in the evening. Sans-serif for everything the app says, serif only for book titles. The app has five pages (Home, Catalog, Stats, Card notes, Backup) plus Book detail.

## Architecture

One local Python process owns the data; browsers (mine and the cataloging agent's) are just clients.

- **Server-owned domain.** A FastAPI server on `127.0.0.1:8765` is the only reader and writer of `~/bookvie-data/`. Every domain rule and every number on screen is computed on the server; the client holds no domain state.
- **Intents, not CRUD.** Each user action is one `POST /api/intents/<verb>` call that applies all its consequences and commits once, or changes nothing and returns a refusal with a stable error code. Export is a plain `GET /api/export` with an `X-Bookvie-Export: 1` header, which keeps another site from triggering it (`curl -H 'X-Bookvie-Export: 1' -o backup.zip http://127.0.0.1:8765/api/export`).
- **One JSON document.** All text data lives in a single `library.json`, written atomically (temp file, fsync, rename). Covers sit next to it in `covers/`. Schema changes go through versioned migrations with a backup copy.
- **One command.** `bookvie` starts the server and opens the browser; a lock file keeps it to one instance per data folder. It installs with `uv tool install` (the built frontend ships inside the Python package), and Node is needed only to build the frontend.
- **One check.** `npm run check` at the repo root runs pytest with coverage gates, the API-types drift check, the Playwright suite and an install smoke test, and never touches `~/bookvie-data`.

**Stack:** Python 3.14, FastAPI, Pydantic, Uvicorn, Pillow, packaged with uv and hatchling; React 19, TypeScript 5.9, Vite, React Router 8, TanStack Query, CSS Modules over DESIGN.md tokens, with API types generated by openapi-typescript; pytest (with Hypothesis) and Playwright for tests.

Testing is planned up front: a risk register (18 risks, none critical) and about 88 test scenarios, with the Agent Label Contract covered by Playwright end-to-end tests and the test harness built in the first epic.

## Delivery plan

The build is split into 7 epics and 41 stories, each story with Given/When/Then acceptance criteria. Each epic builds only on earlier ones and ends with its own test gate.

1. **Catalog the home library** (14 stories). Scaffold and install, one safe instance, one `check` command, the safe single-file store, one checked API contract, the app shell, the agent-friendly New book panel, duplicate warnings, the bookcase, Book detail, covers and spine colors. The test harness is built here too. Until Epic 3 added Home, bookvie opened on the Catalog.
2. **Keep the library safe** (3). One-click export, restore, and refusing damaged, hostile or newer files.
3. **Read a book with visible progress** (7). Story 3.1 made Home the launch page at `/` (the date header, the Main book card and its gauge, the empty states) and moved the Catalog to `/catalog`. Still to come: the Start dialog with Purpose, one-step catch-up, "~N days left", the shelf slice, finishing, and the one-time spine fill.
4. **Switch books without losing your place** (7). Up next, Waiting for you, pause, marking any book finished, state markers on the shelf, and Side reads.
5. **Keep what a book gave you** (4). Card notes: add, edit, search, and go through a book's notes as a pile.
6. **Know how long and how much** (4). The quick pace calculator for one book or the whole library, and Stats with monthly bars.
7. **Organize the catalog** (2). Sort and filter chips.

## Getting started

You need Python 3.14 with [uv](https://docs.astral.sh/uv/), and Node 24 or newer (see `.nvmrc`) with npm to build the frontend.

```sh
npm install                              # installs frontend dependencies and Playwright's Chromium
npm run build                            # builds the SPA into backend/bookvie/http/static/
uv tool install --reinstall ./backend    # puts `bookvie` on your PATH
bookvie                                  # serves 127.0.0.1:8765 and opens the browser
```

To bring `bookvie` up to date later, `npm run install:local` does a clean frontend install, builds the SPA and reinstalls the tool in one step.

After `install:local`, restart a running `bookvie`: stop it with Ctrl+C, then run `bookvie` again. The old process keeps running the old server code, and running `bookvie` while it is still up only reopens it ("bookvie is already running"). Then reload any open bookvie tab without the cache (Cmd+Shift+R in Chrome or Firefox on macOS, Cmd+Option+R in Safari, Ctrl+Shift+R elsewhere): the browser may keep the previous `index.html`, which still points at the old bundle.

`bookvie` keeps its data in `~/bookvie-data` (created if missing). Options: `--data-dir DIR`, `--port N`, `--no-browser`, `--dev` (also accepts requests from the Vite dev origin on `:5173`), and `--fake-today YYYY-MM-DD` (pretends today is that local date; for tests, and only with `--no-browser`). A second `bookvie` for the same folder opens the running one instead of starting another server; while it runs, the folder holds a `bookvie.lock` (its PID and port), removed on Ctrl+C or `kill`. If the port is taken by another program or by a bookvie for a different folder, `bookvie` says so and exits; pick another with `--port`. `GET /api/health` reports `{"app", "dataDir", "pid"}`. Requests must use `127.0.0.1:<port>` or `localhost:<port>`, and any other `Host` or `Origin` gets 403.

**Data folder.** Everything bookvie keeps lives in the data folder:

```text
~/bookvie-data/
  library.json            # the whole library: one JSON document, written atomically
  library.v<N>.bak.json   # a copy of the original, made before a schema upgrade
  covers/                 # cover images (re-encoded on upload; files no Book uses are removed)
  .staging/               # scratch space, emptied at every start
  local-state.json        # this machine's own state ("Last export"), never exported
  bookvie.lock            # PID and port of the running server
```

`library.json` is created on first start as an empty version 1 library. Every save writes a temp file in the same folder, fsyncs it and renames it over the original, so a crash never leaves a half-written file; leftover `library.json.tmp*` and `local-state.json.tmp*` files are removed at the next start. An export zip holds `library.json` and `covers/` with only the covers the library uses. `local-state.json` is written only after an export has downloaded completely; if it is missing or unreadable, the Backup page says "No export yet". bookvie refuses to start, with a one-line `bookvie: …` message naming the path and leaving `library.json` unchanged, when the folder isn't writable or `library.json` is invalid or from a newer bookvie. An older `library.json` is backed up to `library.v<N>.bak.json`, then upgraded in memory and saved once.

On the Backup page, **Restore from file…** takes such an export and, after a confirmation, replaces `library.json` and `covers/` with it (`POST /api/intents/restore`, multipart: `intent` `{}` plus the zip as `archive`). The whole file is unpacked into `.staging/` and checked first (an older export is upgraded through the same migrations as startup), so a file that isn't an export, or is damaged, is refused with nothing changed. So is an export from a newer bookvie (it says so), and a hostile archive: anything but `library.json` and `covers/<name>`, an absolute or `..` path, a symlink, two names that differ only in case or Unicode form, such as `é` written as one character or as `e` plus an accent (or a cover that differs that way from one already in `covers/`), a cover name over 200 bytes in UTF-8 or one the filesystem rejects, an entry that unpacks to more than its header says, more than 5,000 entries (or a file listing too big for them), or more than 1 GiB uploaded or unpacked. Those are refused before anything outside `.staging/` is written. A cover name already in `covers/` is never overwritten. `.staging/` is emptied after every restore and at startup, and `local-state.json` and browser preferences are left alone.

**Development:** `npm run dev` serves only the SPA (Vite on `:5173`) and proxies `/api` and `/media` to `127.0.0.1:8765`, so keep `bookvie --dev --no-browser` running in another terminal while you use it. Stop a normal `bookvie` first: while one is running, the `--dev` launch only reopens it (same folder) or refuses port 8765 (another folder), and the proxy target is fixed, so `--port` doesn't help. Add `--data-dir <scratch folder>` to keep test saves out of your real library. Without the backend, every API call fails: the page shows "Couldn't load. Is bookvie still running?" and Vite logs a proxy error with `ECONNREFUSED`. Without `--dev`, pages load but every save fails: the server refuses requests that carry the `:5173` `Origin` with 403. Open `http://127.0.0.1:5173`.

**Tests:** `npm run check` at the repo root runs four steps in order and stops at the first failure: `check:py` (pytest pinned to `TZ=Europe/Madrid`, with line-coverage gates of 90% on `bookvie/domain/` and 80% on `bookvie/intents/` + `bookvie/store/`), `check:api` (regenerates the TypeScript API types from the backend OpenAPI schema and fails on any diff, then the frontend type check, lint, the unit tests under `frontend/src/` and the script tests in `frontend/scripts/`: the contract drift, layer-boundary and calm-copy checks; `npm run api:gen --prefix frontend` rewrites the types after a model change), `check:e2e` (builds the SPA, then runs the Playwright suite pinned to `TZ=Europe/Madrid`; each worker starts its own `bookvie` on a free port with a data dir under `$TMPDIR/bookvie-e2e/<run-id>/`) and `check:smoke` (builds, installs bookvie with `uv tool install` into a temp folder, starts it and checks that it serves the SPA). Each step also runs on its own, e.g. `npm run check:py`. No check touches `~/bookvie-data`: pytest runs with a temp `HOME`, and the e2e path guard always refuses the real library. A failing e2e test keeps a trace, screenshot and video in `frontend/test-results/`, with HTML and JUnit reports next to it; [`frontend/e2e/README.md`](frontend/e2e/README.md) explains the suite's fixtures, conventions and troubleshooting.

**CI:** GitHub Actions runs the same four checks as separate jobs on every push to `master` and every pull request, plus a burn-in that runs each e2e test 10 times with retries off (`npm run e2e:burn-in`) on pull requests and weekly. [`docs/ci.md`](docs/ci.md) covers the jobs, gates, artifacts and troubleshooting.

## Adding books with AI

Catalog entry happens through my own AI skills rather than an in-app importer or API. A browser-driven skill fills the "add book" form from a plain description like "Dune by Frank Herbert, 412 pages", exactly as a person would. That makes the form's labels, accessible names and outcome messages a contract (the Agent Label Contract in the UX spec): renaming one is a breaking change.

## Project docs

- [PRD](_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md): vision, glossary, functional requirements, scope and success metrics
- [PRD addendum](_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md): competitive landscape, implementation notes, design rationale, and rules for Later features
- [DESIGN.md](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md): how bookvie looks: tokens, colors, typography, components
- [EXPERIENCE.md](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md): how bookvie behaves: information architecture, states, accessibility, Agent Label Contract, key flows
- Mockups: [Home](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-home.html), [Catalog](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html), [Book detail](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-book-detail.html), [Birch Morning light/dark](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/birch-v2-light-dark.html)
- [PRD deltas](_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/prd-deltas.md): the changes UX design made to the PRD, plus open items for architecture
- [Architecture spine](_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md): design paradigm, architecture decisions (AD-1 to AD-20), stack, structure and capability map
- [Test design: architecture](_bmad-output/test-artifacts/test-design-architecture.md): risk register, testability requirements and NFR concerns for the build
- [Test design: QA](_bmad-output/test-artifacts/test-design-qa.md): coverage plan, test scenarios and quality gates
- [Test design handoff](_bmad-output/test-artifacts/test-design/bookvie-handoff.md): how the test design feeds epics and stories
- [Epics and stories](_bmad-output/planning-artifacts/epics.md): requirements inventory, FR coverage map, and all 41 stories with acceptance criteria
- [Implementation readiness](_bmad-output/planning-artifacts/implementation-readiness.md): the readiness gate's findings and the decisions that resolved them
- [Sprint status](_bmad-output/implementation-artifacts/sprint-status.yaml): the status of every epic, story and retrospective, updated as the build moves forward
- [Epic 1 context](_bmad-output/implementation-artifacts/epic-1-context.md): the planning facts Epic 1's stories build on
- [Story 1.1 spec](_bmad-output/implementation-artifacts/spec-1-1-scaffold-and-install-bookvie.md): intent, acceptance criteria, review triage and verification for the scaffold
- [Story 1.2 spec](_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md): intent, I/O matrix, review findings and verification for the single-instance lock and the Host/Origin guard
- [Story 1.3 spec](_bmad-output/implementation-artifacts/spec-1-3-one-check-command-guards-the-repo.md): intent, I/O matrix and review findings and verification for `npm run check`, the coverage gates, the e2e harness and the install smoke test
- [Story 1.4 spec](_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md): intent, I/O matrix, review findings and verification for the one-file store, migrations and `LibraryBuilder`
- [Story 1.5 spec](_bmad-output/implementation-artifacts/spec-1-5-speak-one-api-contract.md): intent, I/O matrix, review findings and verification for the error envelope, the `home` and `catalog` views, the generated API types and the frontend `api/` module
- [Story 1.6 spec](_bmad-output/implementation-artifacts/spec-1-6-open-bookvie-to-an-empty-shelf.md): intent, I/O matrix, review findings and verification for the app shell, themes, the Catalog's loading, couldn't-load and empty states, and `relativeDay`
- [Story 1.6 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md): the acceptance tests (AC-1 to AC-14) written red before the app shell was built
- [Story 1.7 spec](_bmad-output/implementation-artifacts/spec-1-7-accept-a-new-book-only-when-it-is-complete.md): intent, I/O matrix, review findings and verification for the `add-book` intent, field validation, the `Clock` and `--fake-today`, and the catalog's authors, pages, `createdAt` and tags
- [Story 1.7 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md): the acceptance tests written red before the `add-book` intent was built
- [Story 1.8 spec](_bmad-output/implementation-artifacts/spec-1-8-add-a-book-with-the-new-book-panel.md): intent, I/O matrix, review findings and verification for the New book panel, the movable live regions, the List view and Search titles
- [Story 1.8 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-8-add-a-book-with-the-new-book-panel.md): the acceptance tests (AC-1 to AC-12) written red before the New book panel was built
- [Story 1.9 spec](_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md): intent, I/O matrix, review findings and verification for the duplicate rules, the `duplicate_book` refusal and the Possible duplicate dialog
- [Story 1.9 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md): the acceptance tests (AC-1 to AC-9) written red before duplicate warnings were built
- [Story 1.10 spec](_bmad-output/implementation-artifacts/spec-1-10-see-the-library-as-a-bookcase.md): intent, constraints, review findings and verification for the Bookcase view, spines, the library meter and the Catalog view toggle
- [Story 1.10 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md): the acceptance tests (AC-1 to AC-11) written red before the Bookcase view was built
- [Story 1.11 spec](_bmad-output/implementation-artifacts/spec-1-11-open-and-edit-a-book.md): intent, constraints, review findings and verification for the `edit-book` intent, the `book` view, the Book detail page and the New book panel in edit mode
- [Story 1.11 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md): the acceptance tests (AC-1 to AC-12) written red before Book detail and editing were built
- [Story 1.12 spec](_bmad-output/implementation-artifacts/spec-1-12-delete-a-book.md): intent, constraints, review findings and verification for the `delete-book` intent, the `book` view's role line, the Delete action and the Confirm dialog
- [Story 1.12 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md): the acceptance tests (AC-1 to AC-5) written red before deleting a book was built
- [Story 1.13 spec](_bmad-output/implementation-artifacts/spec-1-13-add-a-cover.md): intent, constraints, review findings and verification for the `cover` part and `removeCover` on `add-book` and `edit-book`, the 20 MiB cap, `/media/covers/`, the From cover swatch and the cover on Book detail
- [Story 1.13 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md): the acceptance tests (AC-1 to AC-11) written red before covers were built
- [Story 1.14 spec](_bmad-output/implementation-artifacts/spec-1-14-change-a-book-s-color-from-the-shelf.md): intent, constraints, review findings and verification for the `set-spine-color` intent, the Spine popover and the Change color block on the popover and Book detail
- [Story 1.14 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md): the acceptance tests (AC-1 to AC-6) written red before changing a book's color from the shelf was built
- [Epic 1 retrospective](_bmad-output/implementation-artifacts/epic-1-retro-2026-11-03.md): what Epic 1 delivered against its gate, the findings, and the action items that came out of it
- [Epic 1 traceability matrix](_bmad-output/test-artifacts/traceability/epic-1-traceability-matrix.md): every Epic 1 acceptance criterion traced to its tests, with the quality gate decision against TR7 (PASS)
- [Epic 2 context](_bmad-output/implementation-artifacts/epic-2-context.md): the planning facts Epic 2's stories build on
- [Story 2.1 spec](_bmad-output/implementation-artifacts/spec-2-1-export-all-data-with-one-click.md): intent, I/O matrix, review findings and verification for `GET /api/export`, `local-state.json`, the `backup` view and the Backup page
- [Story 2.1 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md): the acceptance tests (AC-1 to AC-6) written red before export was built
- [Story 2.2 spec](_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md): intent, I/O matrix, review findings and verification for the `restore` intent and the Restore card
- [Story 2.2 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md): the acceptance tests (AC-1 to AC-10) written red before restore was built
- [Story 2.3 spec](_bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md): intent, I/O matrix, review findings and verification for the `restore_invalid`, `restore_newer_version` and `restore_unsafe` refusals and the restore limits
- [Story 2.3 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md): the acceptance tests (AC-1 to AC-5) written red before the refusals were built
- [Epic 2 retrospective](_bmad-output/implementation-artifacts/epic-2-retro-2026-11-04.md): what Epic 2 delivered against its gate, the findings, and the action items that came out of it
- [Epic 2 traceability matrix](_bmad-output/test-artifacts/traceability/epic-2-traceability-matrix.md): every Epic 2 acceptance criterion traced to its tests, with the quality gate decision against TR7 (PASS)
- [Restore name hardening spec](_bmad-output/implementation-artifacts/spec-harden-restore-archive-names.md): Epic 2 retro action 2, the NFC + casefold name comparison and the cover-name length cap
- [Story 3.1 spec](_bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md): intent, I/O matrix and verification for Home at `/`, the Main book card and its server-computed gauge, Book detail's Current reading block and the spine names
- [Test automation summary](_bmad-output/test-artifacts/automation-summary.md): the latest test automation pass (currently story 2.3): what was covered and the tests it added
- [CI](docs/ci.md): the GitHub Actions jobs, quality gates, burn-in and artifacts
- [Deferred work](_bmad-output/implementation-artifacts/deferred-work.md): review findings deferred to later stories, each marked with the story that resolved it once done
- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): the brainstorm's problem statement, pillars and decisions
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
