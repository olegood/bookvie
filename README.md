# bookvie

[![Test](https://github.com/olegood/bookvie/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/olegood/bookvie/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A personal, local-first web app for organizing my home library and tracking my reading. It replaces a paper reading diary as the single source of truth for reading progress. The diary can stay on the nightstand for quick notes; I catch up in the app on my next visit by entering the page I reached.

> **Status:** v1 is feature-complete: Epics 1-7 are done, with all retrospectives, trace and quality gates passed and every retro action item closed. Epic 8 is in progress (43 of 44 stories done): the Catalog can now also be shown as a grid of covers (Tiles), where read Books carry a ribbon in their spine color and Books being read show a reading bar. See [Sprint status](_bmad-output/implementation-artifacts/sprint-status.yaml) for details.

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

**Non-functional:** runs in Chrome (the only supported browser) on one laptop or desktop (1024px minimum width) with no account, network, or database server; light, dark, or system theme; English only; catch-up takes under 30 seconds; no action silently deletes data and a failed save is never silent; no guilt mechanics, greetings or praise.

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

## Delivery plan

The build is split into 7 epics and 41 stories, each story with Given/When/Then acceptance criteria. Each epic builds only on earlier ones and ends with its own test gate.

1. **Catalog the home library** (14 stories). Scaffold and install, one safe instance, one `check` command, the safe single-file store, one checked API contract, the app shell, the agent-friendly New book panel, duplicate warnings, the bookcase, Book detail, covers and spine colors. The test harness is built here too. Until Epic 3 added Home, bookvie opened on the Catalog.
2. **Keep the library safe** (3). One-click export, restore, and refusing damaged, hostile or newer files.
3. **Read a book with visible progress** (7). Story 3.1 made Home the launch page at `/` (the date header, the Main book card and its gauge, the empty states) and moved the Catalog to `/catalog`. Story 3.2 added the Start dialog with its Purpose, opened from Book detail or the spine popover, and Edit Purpose. Story 3.3 added the page field on Home's Main book card: type the page, press **Update** or Enter, and the gauge follows. Story 3.4 ended that card with the re-entry line: "Last updated …", "~N days left" (from the Measured pace of finished Readings) and "Last export …". Story 3.5 added the bookcase slice below it, with the Main book's spine filled to its percentage. Story 3.6 added finishing: reaching the last page, or **Mark finished** on the Main book's Book detail, opens the Finish dialog (Finished on, "Purpose fulfilled?" when the Reading has a Purpose, and a star rating); **Done** records the finish, clears the Main book and goes Home, and Book detail's Readings rows show the stars and the answer. Story 3.7 added the finish moment: in the tab that pressed **Done**, Home's slice scrolls the finished spine into view, fills it to full with the highlight ring (only the ring for a re-read; instant under reduced motion), shows "Finished _X_." in the bookcase header and announces "Finished _X_. N of M finished."; it never replays.
4. **Switch books without losing your place** (7). Story 4.1 made the interrupted Main book Up next: `start-reading` moves the pointer in the same commit, the Start dialog names a displaced Up next, and Home shows it in an Up next pane or in the empty Main book card. Story 4.2 lists every other paused Book in Home's Waiting for you pane, oldest pause first, each with **Resume**. Story 4.3 added **Pause** for the Main book. Story 4.4 added **Set as Up next** on Book detail and in the spine popover. Story 4.5 lets you mark any book finished from its page. Story 4.6 shows each Book's state on the shelf and its page. Story 4.7 keeps up to 3 Side reads in an On the side pane.
5. **Keep what a book gave you** (4). Card notes: add, edit, search, and go through a book's notes as a pile.
6. **Know how long and how much** (4). The quick pace calculator for one book or the whole library, and Stats with monthly bars.
7. **Organize the catalog** (2). Sort and filter chips.

## Getting started

You need Python 3.14 with [uv](https://docs.astral.sh/uv/), and Node 24+ (see `.nvmrc`) with npm.

```sh
npm install                              # frontend dependencies and Playwright's Chromium
npm run build                            # builds the SPA into backend/bookvie/http/static/
uv tool install --reinstall ./backend    # puts `bookvie` on your PATH
bookvie                                  # serves 127.0.0.1:8765 and opens the browser
```

**Updating:** `npm run install:local` rebuilds and reinstalls in one step. Then restart a running `bookvie` (Ctrl+C, run it again) and hard-reload open tabs so the browser picks up the new bundle.

**Options:** `--data-dir DIR` (default `~/bookvie-data`), `--port N`, `--no-browser`, `--dev` (accepts the Vite dev origin on `:5173`) and `--fake-today YYYY-MM-DD` (tests only, with `--no-browser`). Only one `bookvie` runs per data folder; a second launch reopens it.

**Data folder:** `library.json` holds the whole library and is written atomically; `covers/` holds the cover images, and `local-state.json` remembers "Last export" on this machine. Back up and restore from the Backup page: an export is a zip of `library.json` and `covers/`, and a restore checks the whole file before replacing anything.

**Development:** run `bookvie --dev --no-browser --data-dir <scratch folder>` in one terminal and `npm run dev` in another, then open `http://127.0.0.1:5173`. Vite proxies `/api` and `/media` to port 8765, so stop any normal `bookvie` first.

**Tests:** `npm run check` runs `check:py` (ruff and pytest with coverage gates), `check:api` (API type drift, frontend lint, type check and unit tests), `check:e2e` (Playwright) and `check:smoke` (install and serve), stopping at the first failure; each also runs alone. `npm run format` applies both formatters. No check touches `~/bookvie-data`. See [`frontend/e2e/README.md`](frontend/e2e/README.md) for the e2e suite.

**CI:** GitHub Actions runs the same four checks on every push to `master` and every pull request, plus a weekly and per-PR e2e burn-in. See [`docs/ci.md`](docs/ci.md).

## AI skills

The repo ships two Claude Code skills in [`.claude/skills/`](.claude/skills/). Both talk to a local `bookvie` on `127.0.0.1:8765`.

- **[`bookvie-new-book`](.claude/skills/bookvie-new-book/SKILL.md)** adds a book to the catalog. It starts `bookvie` if needed and checks the catalog for a duplicate. It then looks up the metadata and front cover on amazon.com, manning.com, leanpub.com or oreilly.com, saves the book through the add-book API and tags it `added-by-skill`.
  - "Add *Designing Data-Intensive Applications* to bookvie"
  - "I just bought this one: https://www.manning.com/books/…"
- **[`bookvie-notes-summary`](.claude/skills/bookvie-notes-summary/SKILL.md)** turns a book's card notes into a printable one-page Word summary of what you learned, grouped by theme. It saves the file to `~/Documents`. The book needs a Purpose and at least one card note. With no title given, it uses the Main book.
  - "Summarize my card notes for *Fluent Python*"
  - "Make a study sheet from what I learned in my current book"

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
- [CI](docs/ci.md): the GitHub Actions jobs, quality gates, burn-in and artifacts
- [Releasing](docs/release.md): keeping the changelog current with `scripts/changelog.sh` and releasing with `scripts/release.sh`
- [Changelog](CHANGELOG.md): what changed in each release
- [Ideas](docs/ideas.md): feature ideas waiting to be thought through, each with a status
- [Deferred work](_bmad-output/implementation-artifacts/deferred-work.md): review findings deferred to later stories, each marked with the story that resolved it once done
- [Story 8.1 spec](_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md): Tiles, the Catalog's grid of covers
- [Story 8.1 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md): the story's acceptance tests and green-phase follow-ups
- [Story 8.2 spec](_bmad-output/implementation-artifacts/spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md): the finished ribbon and the reading bar on the tiles
- [Story 8.2 ATDD checklist](_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md): the story's acceptance tests and green-phase follow-ups
- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): the brainstorm's problem statement, pillars and decisions
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
