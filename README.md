# bookvie

A personal web app for organizing my home library and tracking my reading. It replaces a paper reading diary with something that shows progress clearly and helps me read with intent, one book at a time.

> **Status:** planning. There is no application code yet. The product direction comes from a brainstorming session (see [Project docs](#project-docs)); the next steps are the product brief, PRD and architecture.

## Why

I read almost every day, but my pace depends on work. The pattern that keeps breaking my reading is the **urgency chain**: an urgent work book interrupts the one I'm reading, I lose its context, re-reading feels like no progress, and the paused book never gets picked up again.

bookvie is built to break that chain:

- **Visible progress.** Every reading session moves a percentage and a gauge. This is the main thing paper can't do.
- **Conscious reading.** Three intent touchpoints: a purpose when I start a book, a day type each day, and "purpose fulfilled?" when I finish.
- **Simplicity.** Less state means less stress. No streaks to break, no "abandoned" status, nothing that resets.

## Core ideas

- **Book → Readings.** A book is a catalog entry; each read-through is a separate Reading with its own progress, logs, purpose and rating. A re-read is a new Reading.
- **One main book.** Exactly one tracked main book, plus up to 3 untracked side reads. Starting a new main book asks for confirmation and shows what gets paused ("Start X? This pauses Y at p.120 (64%)").
- **Pause, don't abandon.** Paused books keep their page and wait in a **Waiting for you** list. An interrupted book returns as **Up next**.
- **Daily check-in.** One tap picks the day type: **Deep**, **Light**, **Cards** or **Rest**. The reading calendar shows day types only, with no streak count.
- **Sequences** (later): topic lists, reading-time marathons and weekend sprints.
- **Own library only.** Books are owned or donated; donated books keep their history.

## v1 scope

**Must have**

- Catalog: only title and page count are required; everything else can be filled in later
- Entry that works well with AI tools (stable form labels or a small API), with duplicate detection by ISBN/title
- Book → Readings model
- One main book with start confirmation
- Quick page logging for the main book, with percentage and progress gauge
- Pause / put back on shelf
- Daily check-in: Deep / Light / Rest
- Reading calendar showing day types
- Stats for any period

**Should have:** reading purpose, re-entry hints ("last page, ~7 evenings left"), Up next and Waiting for you, side reads, flash cards with the Cards day type, a finish ceremony with a 1–5 rating, shelves and tags, cover images.

**Won't have:** borrowed books, bulk import, a session timer, an abandoned status, an audiobook format, email or push notifications.

The full MoSCoW list, decisions and open questions are in the brainstorm intent document.

## Adding books with AI

Catalog entry is meant to happen through my own AI skills rather than an in-app importer. For example, a Claude Code skill can fill in the app's "add book" form in the browser from a plain description like "Dune by Frank Herbert, 412 pages". This is why stable form labels matter in v1.

## Project docs

- [Brainstorm intent](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md): problem, pillars, domain model, v1 scope, decisions and open items
- [Brainstorm session](_bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm.html): the full session record

Planning follows the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD); its framework files live in `_bmad/`.

## License

[MIT](LICENSE) © 2026 Oleg Anastassov
