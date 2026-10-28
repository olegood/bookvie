# bookvie

A personal, local-first web app for organizing my home library and tracking my reading. It replaces a paper reading diary as the single source of truth for reading progress. The diary can stay on the nightstand for quick notes; I catch up in the app on my next visit.

> **Status:** planning. There is no application code yet. The PRD is final (see [Project docs](#project-docs)); the next steps are UX, architecture, and epics.

## Why

I read almost every day, but my pace depends on work. The pattern that keeps breaking my reading is the **urgency chain**: an urgent work book interrupts the one I'm reading, I lose its context, re-reading feels like no progress, and the paused book never gets picked up again.

bookvie breaks that chain by allowing exactly one tracked **Main book**, making every switch a deliberate, visible trade-off, and keeping every paused book in view until I pick it up again. Three pillars guide every decision:

- **Visible progress.** Every real reading effort moves something you can see: a percentage and a gauge.
- **Conscious reading.** A Purpose when I start a book, a Day type each day, and "Purpose fulfilled?" when I finish.
- **Simplicity.** Less state means less stress. No streaks to break, no "abandoned" status, nothing that resets. Simplicity beats completeness of history.

Re-reading is welcome and never counts as lost progress.

## Core ideas

- **Book → Readings.** A Book is a catalog entry for a copy I own; each read-through is a separate Reading with its own current page, Purpose, dates and rating. A re-read is a new Reading.
- **One Main book.** Starting a new one shows the trade-off first: "Start X? This pauses Y at p.120 (64%)".
- **Pause, don't abandon.** Paused Readings keep their page. An interrupted book becomes **Up next**; other paused Readings wait in **Waiting for you**, oldest first.
- **Day types.** Each day can be **Deep**, **Light** or **Rest**, always chosen by me and never inferred. Days can be filled in later (catch-up), and empty days are never shown as failures. The Reading calendar has no streak count.
- **Quick pace calculator.** Type a pages/day value and see when a book, or the whole unread library, would be finished.
- **Card notes.** Quotes or notes with a page or page range, attached to a Book, reviewable as a pile and searchable across all Books.

## v1 scope

**Must** (the MVP)

- Catalog: create, edit, delete and search Books (required: title, pages, author, edition, language, publisher, type)
- Agent-friendly add/edit forms with stable labels, plus a duplicate warning by ISBN or title + author
- Main book with start confirmation, pause, Up next and Waiting for you
- Quick page update for the Main book (at most 2 interactions), with percentage and gauge
- Daily Day type check-in, including catch-up for past days, and the Reading calendar
- Finishing a Reading
- Quick pace calculator for a Book or the whole library
- Stats for any date range: books finished, pages finished, Day type counts
- One-click export to a single file and restore from it, from day one

**Should:** Side reads (up to 3, untracked), Purpose, re-entry info with an effort estimate ("~7 evenings left"), finish prompts (Purpose fulfilled, 1–5 rating), Card notes, tags with filter and sort, cover on the main screen.

**Later:** shelves, goals, Sequences (Topic, Marathon, Weekend sprint), donation and the Past shelf, wishlist, progress visuals, more stats, and Card note extras.

**Won't:** multiple users or sharing, phone layouts, borrowed books, batch or in-app import, a local API, a session timer, per-day page logs, an abandoned status, an audiobook format, email or push nudges.

**Non-functional:** runs in a browser on one laptop or desktop with no account, network, or database server; catch-up for a few days takes under 30 seconds; no action silently deletes data; no guilt mechanics.

## Adding books with AI

Catalog entry happens through my own AI skills rather than an in-app importer or API. A browser-driven skill fills the "add book" form from a plain description like "Dune by Frank Herbert, 412 pages", exactly as a person would. That makes the form's labels and accessible names a contract: renaming one is a breaking change.

## Project docs

- [PRD](_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md): vision, glossary, functional requirements, scope and success metrics
- [PRD addendum](_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md): competitive landscape, implementation notes, design rationale, and rules for Later features
- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): the brainstorm's problem statement, pillars and decisions
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
