# bookvie

A personal, local-first web app for organizing my home library and tracking my reading. It replaces a paper reading diary as the single source of truth for reading progress. The diary can stay on the nightstand for quick notes; I catch up in the app on my next visit by entering the page I reached.

> **Status:** planning. There is no application code yet. The PRD, UX design, architecture, system-level test design, and epics and stories are final (see [Project docs](#project-docs)); the next step is sprint planning, then building Epic 1.

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
- Stats for any date range: books finished and pages finished, with a bar per month
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
- **Intents, not CRUD.** Each user action is one `POST /api/intents/<verb>` call that applies all its consequences and commits once, or changes nothing and returns a refusal.
- **One JSON document.** All text data lives in a single `library.json`, written atomically (temp file, fsync, rename). Covers sit next to it in `covers/`. Schema changes go through versioned migrations with a backup copy.
- **One command.** `bookvie` starts the server and opens the browser; a lock file keeps it to one instance per data folder. It installs with `uv tool install`, and Node is needed only to build the frontend.

**Stack:** Python 3.14, FastAPI, Pydantic, Uvicorn, Pillow; React 19, TypeScript 5.9, Vite, TanStack Query, with API types generated by openapi-typescript; pytest and Playwright for tests.

Testing is planned up front: a risk register (18 risks, none critical) and about 88 test scenarios, with the Agent Label Contract covered by Playwright end-to-end tests and the test harness built in the first epic.

## Delivery plan

The build is split into 7 epics and 38 stories, each story with Given/When/Then acceptance criteria. Each epic builds only on earlier ones and ends with its own test gate.

1. **Catalog the home library** (11 stories). Install and launch, the safe single-file store, the app shell, the agent-friendly New book panel, duplicate warnings, the bookcase, Book detail, covers and spine colors. The test harness is built here too.
2. **Keep the library safe** (3). One-click export, restore, and refusing damaged, hostile or newer files.
3. **Read a book with visible progress** (7). The Main book on Home, the Start dialog with Purpose, one-step catch-up, "~N days left", the shelf slice, finishing, and the one-time spine fill.
4. **Switch books without losing your place** (7). Up next, Waiting for you, pause, marking any book finished, state markers on the shelf, and Side reads.
5. **Keep what a book gave you** (4). Card notes: add, edit, search, and go through a book's notes as a pile.
6. **Know how long and how much** (4). The quick pace calculator for one book or the whole library, and Stats with monthly bars.
7. **Organize the catalog** (2). Sort and filter chips.

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
- [Epics and stories](_bmad-output/planning-artifacts/epics.md): requirements inventory, FR coverage map, and all 38 stories with acceptance criteria
- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): the brainstorm's problem statement, pillars and decisions
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
