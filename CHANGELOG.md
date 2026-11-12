# Changelog

All notable changes to bookvie are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-11-12

The first complete version: all seven v1 epics (41 stories) are done.

### Added

#### Catalog the home library (Epic 1)

- Install and run bookvie as one local process that refuses to start a second copy.
- Keep the whole library in one local file that is written safely.
- Add a Book with the New book panel. A Book is saved only when its required fields (title, pages, author, edition, language, publisher and type) are complete.
- Get a warning about a possible duplicate, matched by ISBN or by title and author.
- See the library as a bookcase of spines, open a Book to edit it, or delete it.
- Add a cover, and change a Book's spine color from the shelf.

#### Keep the library safe (Epic 2)

- Export all data to a single file with one click.
- Restore the library from an export.
- Damaged, hostile or newer-version files are refused on restore, and the library is left unchanged.

#### Read a book with visible progress (Epic 3)

- See the Main book on Home, and start reading a Book with a confirmation that shows the trade-off.
- Catch up with one page update, and see the percentage and gauge move.
- See where you left off and about how long is left.
- See your reading on Home's shelf, finish the Main book, and see the finish on the shelf.

#### Switch books without losing your place (Epic 4)

- An interrupted Book becomes Up next. All other paused Books wait in Waiting for you, oldest first.
- Pause the Main book and choose what to read next.
- Mark any Book finished from its own page.
- See each Book's state on the shelf and on its page.
- Keep up to three untracked Side reads.

#### Keep what a book gave you (Epic 5)

- Add a card note, with a page or page range, while you read.
- Edit or delete a card note.
- Search notes across all Books.
- Go through a Book's notes as a pile and step through it with the arrow keys.

#### Know how long and how much (Epic 6)

- See when a Book will be finished at a given pages-per-day pace.
- See when the whole unread library will be finished.
- See the Books and pages you finished in any date range, with a bar for each month (each year for ranges over 24 months).

#### Organize the catalog (Epic 7)

- Sort the catalog. Numbers in titles and authors sort by value.
- Filter the catalog by status (read or unread), type, language and tag.

#### Agent skills

- `bookvie-new-book` adds a book to the catalog through the add-book API. It checks the catalog first and looks up the metadata and cover online.
- `bookvie-notes-summary` turns a Book's card notes into a one-page Word summary you can print.

### Fixed

- Measured pace counts only the pages read in each resume.
- Spine names tell editions of the same title apart.
- Finish opens for the Book whose last page was saved.
- The Start and Pause dialogs wait for a fresh Home view.
- A running bookvie that reports no process ID keeps its lock.
- The curated spine color rotates from the last Book added.
- Finished Readings stay in order when Finished on is edited.
- Restore refuses covers that point to missing files, and Book field values the app could not have saved.
- Blank or untrimmed language and tag values are refused.
- The Change color refusal is still announced after its popover closes.
- The pace calculator agrees with Home's days-left figure.

[Unreleased]: https://github.com/olegood/bookvie/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/olegood/bookvie/releases/tag/v1.0.0
