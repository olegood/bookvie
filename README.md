# bookvie

[![Test](https://github.com/olegood/bookvie/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/olegood/bookvie/actions/workflows/test.yml)

A personal, local-first web app for organizing my home library and tracking my reading. It replaces a paper reading diary as the single source of truth for reading progress. The diary can stay on the nightstand for quick notes; I catch up in the app on my next visit by entering the page I reached.

> **Status:** building Epic 1. Stories 1.1 to 1.8 are done: *Scaffold and install bookvie*, *Run one safe instance*, *One check command guards the repo*, *Keep the library in one safe file*, *Speak one API contract*, *Open bookvie to an empty shelf*, *Accept a new book only when it is complete* and *Add a book with the New book panel*. The one-command install works, only one server runs per data folder, reachable only from its own loopback address, `npm run check` guards the repo without touching `~/bookvie-data`, and bookvie creates, validates and migrates `library.json` at startup and writes it atomically. Every API error comes back in one envelope with a stable error code, the `home` and `catalog` views are served from the library, and the TypeScript API types are generated from the server and checked for drift. bookvie opens on the Catalog inside the app shell (header, nav, Light/Dark/System theme toggle), with loading, couldn't-load and empty-shelf states. `POST /api/intents/add-book` saves a new Book only when every field passes its rule: it refuses with one 422 that lists each failing field in form order, and on success assigns the curated spine color and back-fills a finished Reading when Finished on is given. The server reads "today" through an injected `Clock`. **New book** opens a side panel with every Agent Label Contract field, Tags suggestions and spine swatches; it names each invalid field in place, keeps every value when a save fails, and on success closes, announces "Added Dune." (for a book titled Dune) and focuses the new row. A non-empty Catalog shows the List view, sorted by first author, with **Search titles** and a live match count. The other 33 stories are in backlog (see [Sprint status](_bmad-output/implementation-artifacts/sprint-status.yaml)).

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
- **Intents, not CRUD.** Each user action is one `POST /api/intents/<verb>` call that applies all its consequences and commits once, or changes nothing and returns a refusal with a stable error code. Export is a plain `GET /api/export`.
- **One JSON document.** All text data lives in a single `library.json`, written atomically (temp file, fsync, rename). Covers sit next to it in `covers/`. Schema changes go through versioned migrations with a backup copy.
- **One command.** `bookvie` starts the server and opens the browser; a lock file keeps it to one instance per data folder. It installs with `uv tool install` (the built frontend ships inside the Python package), and Node is needed only to build the frontend.
- **One check.** `npm run check` at the repo root runs pytest with coverage gates, the API-types drift check, the Playwright suite and an install smoke test, and never touches `~/bookvie-data`.

**Stack:** Python 3.14, FastAPI, Pydantic, Uvicorn, Pillow, packaged with uv and hatchling; React 19, TypeScript 5.9, Vite, React Router 8, TanStack Query, CSS Modules over DESIGN.md tokens, with API types generated by openapi-typescript; pytest (with Hypothesis) and Playwright for tests.

Testing is planned up front: a risk register (18 risks, none critical) and about 88 test scenarios, with the Agent Label Contract covered by Playwright end-to-end tests and the test harness built in the first epic.

## Delivery plan

The build is split into 7 epics and 41 stories, each story with Given/When/Then acceptance criteria. Each epic builds only on earlier ones and ends with its own test gate.

1. **Catalog the home library** (14 stories). Scaffold and install, one safe instance, one `check` command, the safe single-file store, one checked API contract, the app shell, the agent-friendly New book panel, duplicate warnings, the bookcase, Book detail, covers and spine colors. The test harness is built here too. Until Epic 3 adds Home, bookvie opens on the Catalog.
2. **Keep the library safe** (3). One-click export, restore, and refusing damaged, hostile or newer files.
3. **Read a book with visible progress** (7). The Main book on Home, the Start dialog with Purpose, one-step catch-up, "~N days left", the shelf slice, finishing, and the one-time spine fill.
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

`bookvie` keeps its data in `~/bookvie-data` (created if missing). Options: `--data-dir DIR`, `--port N`, `--no-browser`, `--dev` (also accepts requests from the Vite dev origin on `:5173`), and `--fake-today YYYY-MM-DD` (pretends today is that local date; for tests, and only with `--no-browser`). A second `bookvie` for the same folder opens the running one instead of starting another server; while it runs, the folder holds a `bookvie.lock` (its PID and port), removed on Ctrl+C or `kill`. If the port is taken by another program or by a bookvie for a different folder, `bookvie` says so and exits; pick another with `--port`. `GET /api/health` reports `{"app", "dataDir", "pid"}`. Requests must use `127.0.0.1:<port>` or `localhost:<port>`, and any other `Host` or `Origin` gets 403.

**Data folder.** Everything bookvie keeps lives in the data folder:

```text
~/bookvie-data/
  library.json            # the whole library: one JSON document, written atomically
  library.v<N>.bak.json   # a copy of the original, made before a schema upgrade
  covers/                 # cover images
  .staging/               # scratch space, emptied at every start
  bookvie.lock            # PID and port of the running server
```

`library.json` is created on first start as an empty version 1 library. Every save writes a temp file in the same folder, fsyncs it and renames it over the original, so a crash never leaves a half-written file; leftover `library.json.tmp*` files are removed at the next start. bookvie refuses to start, with a one-line `bookvie: …` message naming the path and leaving `library.json` unchanged, when the folder isn't writable or `library.json` is invalid or from a newer bookvie. An older `library.json` is backed up to `library.v<N>.bak.json`, then upgraded in memory and saved once.

**Development:** run `npm run dev` (Vite on `:5173`, proxying `/api` and `/media` to `:8765`) next to `bookvie --dev --no-browser`.

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
- [Test automation summary](_bmad-output/test-artifacts/automation-summary.md): the latest test automation pass (currently story 1.6): what was covered and the tests it added
- [CI](docs/ci.md): the GitHub Actions jobs, quality gates, burn-in and artifacts
- [Deferred work](_bmad-output/implementation-artifacts/deferred-work.md): review findings deferred to later stories, each marked with the story that resolved it once done
- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): the brainstorm's problem statement, pillars and decisions
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
