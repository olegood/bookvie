---
status: final
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/prd-deltas.md
  - _bmad-output/test-artifacts/test-design/bookvie-handoff.md
  - _bmad-output/planning-artifacts/catalog-tiles-plan-2026-11-13.md
  - _bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md
  - _bmad-output/planning-artifacts/catalog-sort-direction-plan-2026-11-15.md
  - _bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md
  - _bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md
  - _bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md
---

# bookvie - Epic Breakdown

## Overview

This document breaks bookvie's PRD, UX design (DESIGN.md, EXPERIENCE.md) and architecture spine into thirteen epics of implementable stories. Each story names the requirement IDs it satisfies and lists Given/When/Then acceptance criteria.

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
| 8. See the catalog as covers | A third Catalog view, Tiles: a grid of covers in the current sort and filters, a spine-color ribbon on read Books, a progress bar on Books being read, and a typeset cover for Books without one; each tile opens its Book. | FR-25 |
| 9. Add card notes faster | Save a card note with Cmd+Enter or Ctrl+Enter, and add several in a row with a remembered Add another that keeps the panel open, keeps the page and shows a running count. | FR-17 (keyboard save, Add another) |
| 10. Reverse the catalog order | A Sort direction toggle joined to the Sort select reverses the current key's natural order and says which order is in effect; remembered on this computer, reset on a key change, and followed by Home's slice. | FR-20 (Sort direction) |
| 11. Know which bookvie you're looking at | Its own sage favicon. A development server keeps to its own library and port, refuses the real library, and is marked by an amber favicon, a `DEV · ` title and a DEV pill; Backup shows the version and data folder; a tab older than the app offers Reload. | FR-26, FR-27 |
| 12. Talk to bookvie from Claude Code | Claude Code connects to the running bookvie at `/mcp` (its own entry for the real app and for a development server). An agent finds a Book without guessing; reads the catalog, a Book, Home, Card notes and Stats; logs pages, starts, pauses and finishes Readings, chooses Up next, edits Purposes, and adds and edits Card notes and Side reads; adds and edits Books, with a cover fetched from its web address; and writes a dated backup to disk. It can't delete or restore anything. The two bookvie skills move onto the tools. | FR-28 |
| 13. Back up to Dropbox every day, and restore through an agent | An agent restores a local or Dropbox backup only after showing what will be lost and passing two confirmations it can't skip, with a safety copy first (built first, to prove the riskiest part). Every morning, with nothing open, the library goes to bookvie's own Dropbox folder: 3 copies, the oldest deleted only after a checked upload, an unchanged library skipped, a development library never uploaded. The Backup page says in words whether auto-backup is Off, Waiting, On, Failing or Stalled. Setup and a fix for each state ship in `docs/dropbox-backup.md`. | FR-29, FR-30, FR-28 (restore lifted from the ban, the daily export not counted as Last export) |

## Requirements Inventory

### Functional Requirements

The PRD is authoritative; this text is a copy so each story can be read on its own. FR IDs are the PRD's own stable IDs. FR-12 and FR-13 (Day types, Reading calendar) were retired on 2026-10-28 and are not listed. FR-2 was retired on 2026-11-19 and stays listed because Epic 1's stories cite it. Priority in brackets.

FR-1 [Must]: Book fields. The user can create, edit and delete a Book. Required: title, pages, at least one author, edition (default 1), language, publisher, type (Paperback / Hardcover / Ebook). Optional: subtitle, ISBN, year, cover image, spine color, tags, Finished on. Saving is refused while any required field is empty. Pages is always a page count. Edition is displayed only when it isn't 1. A Book without a cover shows a "no cover" placeholder. New Books default to Ownership = owned. An empty spine color means automatic (from cover, else curated palette). An empty Finished on means not read; a date (not in the future) creates a back-filled Reading (no start date) finished on that date, and on a Book with an active or paused Reading adds a past Reading and leaves the current one untouched. In edit, Finished on shows the most recent finish date and changing it changes that date; clearing it is refused. Tags: many per Book, comma-separated free text with suggestions from existing tags, shown on Book detail. Editing Pages below the current page of an active or paused Reading, or below the highest Card note page, is refused with a message; finished Readings keep the page count they finished with. Deleting a Book requires confirmation and removes its Readings and Card notes.

FR-2 [Retired 2026-11-19, replaced by FR-28]: Agent-friendly form. Add-book and edit-book forms expose stable, labeled fields and buttons reachable by label, so a browser-driven AI skill can fill them as a person would. Every field has a visible label and a stable accessible name; labels don't change between releases without notice. Every form outcome (saved, duplicate warning, validation error, couldn't save) is exposed through roles, accessible names and live-region text. After saving, the new Book can be found by searching its title. Built in Epic 1; agents now use the agent tools (FR-28), and the form's labels stay as ordinary accessible names (AR23).

FR-3 [Must]: Duplicate warning. A new Book matching an existing one triggers a warning before saving. Matching ISBN triggers it (ISBNs compared after removing hyphens/spaces and converting ISBN-10 to ISBN-13). When either Book has no ISBN, matching title (case- and extra-whitespace-insensitive) plus at least one shared author (set of semicolon-separated names, case- and surrounding-space-insensitive) triggers it. The warning offers exactly **Don't add** (closes, keeps typed fields) and **Add anyway**; the form behind is inert. On edit, the check runs only if title, an author or ISBN changed.

FR-4 [Must]: Browse the catalog. The user can list Books, search them by title, and open them.

FR-5 [Must]: Start a Reading with confirmation. The user makes a Book the Main book, or resumes a paused Reading, through a Start confirmation shown on every start or resume; it holds the optional Purpose field. When a Main book exists it shows the trade-off ("Start *X*? This pauses *Y* at p.120 (64%)"). Confirming pauses the previous Reading at its current page and creates or resumes a Reading for *X*. Starting a finished Book creates a new Reading (re-read). When the start displaces the Up next Book *Z*, the confirmation says "*Z* moves to Waiting for you." (paused Reading), "*Z* stays on the side." (no paused Reading, a Side read) or "*Z* returns to the catalog." (no paused Reading, not a Side read).

FR-6 [Must]: Pause. The user can pause the Main book from Book detail or from the Main book card's "⋯" menu; its current page is kept and there is no Main book until the user chooses one. Every pause records the Reading's paused-at date. When pausing would displace an Up next Book, a confirmation says so first.

FR-7 [Must]: Up next and Waiting for you. The user can set one Book as Up next. An interrupted or paused Main book becomes Up next. A displaced Up next Book moves to Waiting for you if it has a paused Reading, else stays on the side if it is a Side read, else returns to the catalog. Waiting for you lists every paused Reading except the Up next Book's, oldest paused-at date first, no cap. A paused Up next Book appears only in Up next, with Resume. Any paused Reading can be resumed at any time from Waiting for you or Up next, through the FR-5 confirmation.

FR-8 [Should]: Side reads. The user can mark up to 3 Books as Side reads. Marking/unmarking changes nothing else (no status change, Reading, progress, stats, goals or nudges). Starting a Side read by any route asks "Which page?" in the FR-5 confirmation and tracking starts from that page. A Side read that becomes the Main book, or is finished, leaves the Side reads automatically.

FR-9 [Must]: Purpose. When starting a Reading, the user can enter an optional one-sentence Purpose in the Start confirmation and edit it later.

FR-10 [Must]: Quick page update. The user can set the Main book's current page from the main screen. Percentage and gauge update immediately. One field and one confirm action: at most 2 interactions after opening the app; the field takes the absolute page, no "add pages" control. Page must be 0 to the Book's page count; a lower page than before is allowed. Saving records the Reading's last progress update time. Entering the last page opens the finish flow (FR-14); cancelling it leaves the Reading active at that page.

FR-11 [Should]: Re-entry info and effort. On the next visit, show "p.N of M" on the gauge, "Last updated N days ago" (muted, never a warning), and "~N days left" = pages left ÷ Measured pace, rounded up, minimum "~1 day left", hidden with no Measured pace or no pages left. Re-entry info appears only in the app, on the next visit.

FR-14 [Must; prompts Should]: Finish a Reading. When the current page reaches the last page, or the user marks a Reading finished, the Reading gets a finish date. The finish flow has a Finished on date: today by default, not in the future, not before the Reading's start. Any Reading can be marked finished from Book detail through the same flow; finishing a non-Main Reading leaves the Main book unchanged and removes the Book from Up next and Waiting for you. Only finishing the Main book leaves no Main book, and bookvie then suggests the Up next Book. Marking a Book with no Reading finished creates a back-filled Reading. The Book counts as read. *(Should)* The flow asks "Purpose fulfilled? yes / partly / not yet" (only if the Reading has a Purpose) and a 1–5 star rating; both skippable.

FR-15 [Must]: Pace to finish date. On a Book or in the catalog, the user types a positive pages/day value and sees the estimated finish date and duration, updating as they type. Book scope: pages left in its current Reading, or all its pages if never started. Library scope: all pages of owned never-started Books plus pages left in every active or paused Reading, including re-reads; donated Books and finished Books without an active Reading excluded. Zero, negative or non-numeric input: no result and no error. The field starts filled with Measured pace when there is one, else empty.

FR-16 [Must]: Stats for any period. The user chooses any date range and sees the number of Books finished and pages finished; UX presets This month, This year, Last year, All time, plus custom, with a bar per month. All of a Reading's pages count in the period it finished in; a finish counts by its local date; a back-filled Reading counts in the period of its Finished on date. "All time" starts at the earliest finished Reading. Re-reads count again; Side reads never count.

FR-17 [Must]: Add Card notes to any Book. The user can add, edit and delete a Card note on any Book at any time. A Card note needs text and a page or page range (p.42 or pp.42–45), shown below the text. A page or range outside the Book's page count is refused. A keyboard shortcut saves a note from its text. The user can add several notes in a row without closing the note form: after each save it stays open for the next note, keeping the page; whether it stays open is the user's choice, remembered on this computer and not exported. Leaving the form keeps every note already saved; only an unsaved note is dropped.

FR-18 [Must]: Review a Book's Card notes as a pile, one at a time: page order or shuffled, next/previous, and jump straight to a particular Card note.

FR-19 [Must]: Card notes view and quick search. A separate Card notes view shows all Card notes grouped by Book, with a quick search that finds notes containing the typed text. Search across all Books keeps results grouped by Book; the view scoped to one Book searches only that Book's notes; the pile itself has no search. Results update while typing, case-insensitive; each result shows the page or range and the matching text highlighted (plus the Book title in all-Books search). Opening a result shows that note in its Book's pile.

FR-20 [Should]: Filter and sort. Sort: Author (default), Title, Date added, Pages; the bookcase reorders to match. Each sort has a natural direction (Author and Title A–Z, Date added newest first, Pages fewest first) that the user can reverse; the catalog shows which order is in effect, ties keep their order either way, the direction is remembered on this computer with the sort and not exported, choosing another sort goes back to its natural direction, and Home's bookcase slice follows the same order. Filter chips: Read / Unread, Type, Language, Tag; non-matching Books are hidden and the bookcase closes up (not dimmed).

FR-21 [Should]: Cover on the main screen. The main screen shows the Main book's uploaded cover, or the placeholder.

FR-22 [Must]: One-click export. One action exports all data to a single file: Books (incl. spine color), Readings (incl. finish dates, back-filled Readings, last progress update, paused-at date), Card notes and cover images, plus data from later features. bookvie records the time of the last export and shows "Last export: N days ago" on the Backup page and the main screen, informational only.

FR-23 [Must]: Restore from export. The user can restore bookvie from an export file. Restore replaces current data after explicit confirmation. Export then restore reproduces identical data. This is the only way to import data.

FR-24 [Must]: Bookcase. The main screen shows a slice of the bookcase and the catalog shows the full bookcase: one spine per Book, in catalog sort order (Author by default). The slice is up to 3 shelf rows: the Main book's row, then the Up next Book's, then rows with the most recent finishes; filters never apply to it. Unread Books are outlined; read Books show their spine color exactly as stored. Up next and Waiting for you Books carry markers. The Main book's spine is filled to its reading percentage; a re-read keeps its full-color spine and gets the Main-book marker. An overall meter shows "X of Y finished". Not ordered by physical location.

FR-25 [Should]: Catalog tiles. The user can see the catalog as tiles: one tile per Book with its cover, title and author, as a third view next to the bookcase and the list. Bookcase (default) · List · Tiles; the last choice is remembered on this computer and isn't exported. The cover keeps its own shape and the covers in a row share a bottom line; under it the title and first author, one line each, cut short when too long. A read Book carries a bookmark ribbon in its spine color; a Book with an unfinished Reading shows a progress bar for its current page; a re-read shows both; an unread Book has no mark. Status never depends on color alone, and each tile's accessible name includes it. A Book without a cover shows a typeset cover (on its spine color if read, outlined if unread). Search by title, sort and filters apply; opening a tile opens the Book. With 500 Books that have covers, the first screen of tiles appears in about 1 second and the grid doesn't jump while covers load.

FR-26 [Must]: Development and production stay apart. A Development server (bookvie started in development mode) keeps away from the user's real library and is plainly marked as development. Without extra options it uses its own library and its own address; an explicitly chosen library or address still wins, and starting bookvie normally is unchanged. It refuses to start on the real library, even when that is named through a link or a roundabout path; it says why and how to start instead, and changes nothing. Whatever delivered the page, the server alone decides whether a tab is development. In development only, the tab title starts with "DEV", the header shows a "DEV" label (a word, not just a color), and the tab icon turns amber (NFR9); the real app shows none of these marks.

FR-27 [Must]: The version is visible. The Backup page shows the version and the library's folder in About this copy; on a Development server it also says so and shows the exact build (the source commit); the real app shows no build. When the running app's version differs from the version an open tab was loaded with (a rollback counts too), the tab shows a quiet notice that bookvie was updated, with a Reload button; if the app can't be reached, for example while it restarts, there's no notice. The notice is announced once, never on every check; it's never a dialog and blocks nothing: the old tab keeps working until the user reloads it.

FR-28 [Should]: Agents read and update the library through MCP. An AI agent in Claude Code can read the library and record reading through bookvie's agent tools, under the same rules as the UI and with no way to delete a Book or a Card note (uses: "I'm on page X of Y", the bookvie skills, reading lists, time-boxed plans, reading order). The tools are on whenever bookvie runs, with nothing extra to start; a Development server offers its own against its own library, so an agent trying something out never writes to the real library. Claude Code is the only supported client; the README gives the setup. A request from another site or host is refused. A write follows the same rules as the same action in the UI and is refused with the same reason and fields; adding a likely duplicate is refused until the agent confirms it. A free-text search (abbreviation, author, part of a title) returns every likely match with edition and type, or an empty list; every other tool names the Book by id, so a page is never logged on the wrong edition. Agents can read the catalog, a Book, Home, Card notes and Stats; start, update, pause and finish a Reading, choose Up next, edit a Purpose; add and edit Card notes; mark and unmark Side reads; add and edit Books; export a backup; upload it to Dropbox (FR-29); restore a backup, with two confirmations (FR-30). They can't delete a Book or a Card note. Adding or editing a Book can take a cover's web address, which bookvie downloads; only an image from a public address is accepted, and a failed download saves nothing. An agent's export writes a dated backup file to a fixed folder (separate for a Development server), says where, replaces a same-day file, and counts as the last export, except the daily backup run's export, which never moves it (FR-29). Each tool's description says what it does and how to use it; a refusal gives the same reason and fields as the UI. There are no planning tools: the agent answers from titles, tags, Purposes, Card notes, pages left and measured pace. (Amended 2026-11-21: restore is no longer banned.)

FR-29 [Should]: Daily off-machine backup. Once a day, an agent backs up the library and uploads it to the user's Dropbox, so a copy exists off this computer without exporting by hand. Daily and unattended: once set up, a backup runs every morning with no app or agent session open; a run missed while the computer slept runs when it wakes; macOS only. Three copies, deleted only after a checked upload: Dropbox keeps the last 3; the oldest is deleted only after the new one has uploaded and been checked against the local file; a failed or mismatched upload deletes nothing; a second upload on the same day replaces that day's copy only once the new one checks out. Unchanged library, no upload: the run uploads nothing and reports a skip, so the 3 copies cover the last 3 changes, not the last 3 days. bookvie's folder only: the backup reaches nothing in Dropbox outside bookvie's own folder and deletes nothing there except bookvie's older backups; the sign-in lives in the computer's keychain, never in the library, an export or the repository, and renews itself; an expired sign-in fails with the command that fixes it. Never from development (FR-26). Status on the Backup page: next to "Last export", in words, Off (not set up), Waiting (set up, not yet run), On (an upload or a skip in the last 26 hours), Failing (the last run reported an error: the reason and the fix) or Stalled (no upload, skip or error in 26 hours). Uploads aren't exports: a manual export doesn't count as an upload, an upload doesn't change "Last export" (FR-22); the upload status belongs to this computer, isn't exported, and a restore leaves it as it was. Documented: setup, how it works, and a fix for each status and known failure ship with the feature. Dropbox is the only provider; the folder and the number of copies can't be changed in the UI.

FR-30 [Should]: Restore through an agent, with confirmation. An agent can restore the library from a backup on this computer or in Dropbox, only after the user has seen what the restore will lose and confirmed it twice, in ways the agent can't skip. The user picks: the agent lists backups on this computer (safety copies included) and in Dropbox, may suggest the newest, but the user picks. What will be lost: the backup's date, its Books, Card notes and covers, the current library's, and what the current library has that the backup lacks (titles of the Books added since, the number of Card notes); a backup bookvie can't restore is refused with the same reason as in the UI (FR-23). Two confirmations the agent can't skip: Claude Code asks permission for every restore, and bookvie itself then asks the user directly with the same summary; anything other than an explicit yes to both refuses and changes nothing, including a client that can't show bookvie's question; the agent's own chat question comes first but is neither; the agent never retries a refused or unconfirmed restore on its own. Safety copy first: bookvie saves the current library as a safety copy in the backups folder and names it in the result; if it fails, nothing is restored; safety copies stay on this computer and never replace or remove a daily backup; restoring one undoes the restore. Backups folder only, including the Dropbox backups downloaded there. Same restore as the UI (FR-23). Never unattended: the daily run (FR-29) can never restore. In development too: a Development server restores its own library only, and a Dropbox backup can be downloaded into it. Restoring from Dropbox in the Backup page's UI is out of scope.

### NonFunctional Requirements

NFR1 (Local-first): bookvie runs in a browser on one laptop or desktop. No account and no network connection for any feature (bookvie's only outbound request is a cover download an agent asks for by address, FR-28; the daily Dropbox backup, FR-29, is optional, needs a Dropbox account, runs outside bookvie, and no other feature depends on it); no database server; all data lives locally. A Book saved from any browser on this machine appears in every other browser.

NFR2 (Display): UI in English only. Minimum viewport 1024px; below that the page scrolls horizontally; no phone layout. Light, dark or system theme selectable.

NFR3 (Accessibility): WCAG 2.2 AA in both themes, with one accepted deviation: the 1024px minimum width does not meet SC 1.4.10 Reflow (horizontal scroll at 200–400% zoom).

NFR4 (Speed): Catch-up (one page update) takes under 30 seconds and at most 2 interactions after opening the app.

NFR5 (Data safety): No action silently deletes data. Every destructive action needs confirmation. A Development server never opens the real library (FR-26). No agent tool deletes a Book or a Card note (FR-28). A restore through an agent needs two confirmations the agent can't skip and saves a safety copy first (FR-30). The daily backup deletes only bookvie's older Dropbox backups, and only after a checked upload (FR-29). A failed save is never silent: the UI says "Couldn't save. Your data wasn't changed." and keeps the user's input.

NFR6 (Tone): No guilt mechanics: no streaks, no "you missed a day", no red failure states. No greetings, exclamation marks or praise. Finish copy is "Finished *X*."; the finish moment is a single ~600ms spine fill that never replays.

NFR7 (Scale, from architecture): Sized for about 500 Books and a few thousand Card notes; the Catalog bookcase renders all ~500 spines in the page with no lazy rows.

NFR8 (Unattended operation): Cataloging and other agent work run with nobody watching, through the agent tools (FR-28): every outcome is machine-readable as the AD-9 success or error object. (Until 2026-11-19 this bound the add-book form's labels; renaming a label is no longer a breaking change, AR23.)

NFR9 (Look and feel): bookvie has its own tab icon, drawn for bookvie: a small shelf of three book spines on a plank, readable at 16×16, in the accent sage, with a lighter fill on a dark tab strip. A Development server shows the same drawing in amber (FR-26).

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
- AR8 (AD-15): Last export in `local-state.json`; UI preferences in browser `localStorage`. Epic 13 adds the upload state group `autoBackup` (AR49), and one writer in `store/local_state`, under its own `threading.Lock`, read-modify-writes only the group it changes and keeps every other key; `Store.record_export` becomes a call to it and `local_state_bytes` goes; a malformed file is replaced with that group alone and the loss logged.

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
- AR21 (Consistency Conventions): CLI flags, stderr logging, no outbound network calls except an agent's cover download (AR41). Epic 13 adds the subcommands `bookvie autobackup install`, `uninstall` and `run` (AR52) and the second command `bookvie-dropbox auth` and `serve` (AR44); `bookvie-dropbox` calls only Dropbox and never logs a token; the launchd run logs under `~/Library/Logs/bookvie/`.
- AR22 (Stack, Structural Seed): Build into `backend/bookvie/http/static/`, shipped in the hatchling wheel, install with `uv tool install`, Vite dev proxy; React Router 8.5 and CSS Modules over one `tokens.css`.
- AR23 (AD-17): Accessible names are stable, and e2e finds the controls EXPERIENCE.md's table lists by role and that name, with no `data-testid`. Renaming one changes EXPERIENCE.md, the component and the e2e together; no agent depends on them (narrowed 2026-11-19 with FR-2's retirement).
- AR24 (AD-6): The Tiles view is client presentation over the same sorted, filtered array as the bookcase and List. The ribbon reads the view's `finished`; the reading bar shows only when `percent` is not null and fills to `percent`, never recomputed; the tile's accessible name comes from the spine's name builder.
- AR25 (AD-8, AD-12): `ShelfBook.coverFile` is added in the Python model first, then `api:gen`. Tiles load covers from `/media/covers/<coverFile>` at their stored size, lazily.
- AR26 (AD-15, Deferred → Cover thumbnails): The remembered Catalog view gains `tiles`. No thumbnails unless Epic 8's 500-cover check fails; that follow-up would amend AD-12 and AD-14.
- AR27 (AD-15): The Card note panel's Add another choice is a `localStorage` UI preference, `bookvie.cardNoteAddAnother`, read and written by `lib/cardNoteAddAnother` inside try/catch. Off by default and whenever storage is empty, junk or unreadable; never exported, and a restore neither brings nor replaces it.
- AR28 (AD-6, AD-15): `sortBooks(books, key, reversed)` negates only the primary compare; the tie-break chain (title, `createdAt` older first, Book id) never flips. The reversal is its own `localStorage` key, `bookvie.catalogSortReversed`, read and written by `lib/catalogSort` inside try/catch; the format of `bookvie.catalogSort` doesn't change. Not reversed by default and whenever the value is empty, junk or unreadable, or the stored key isn't one of the four; a key change resets it and stores that; never exported, and a restore neither brings nor replaces it. Home's slice reads both keys.

**Development, production and the version (Epic 11).**
- AR29 (AD-16): With `--dev` the defaults are port `8766` and the data folder `~/bookvie-data-dev`, so a development server and the real app run side by side; an explicit `--port` or `--data-dir` still wins, and plain `bookvie` keeps `8765` and `~/bookvie-data`. The Vite dev proxy targets `8766`.
- AR30 (AD-16): With `--dev`, `cli.py` resolves the data folder (symlinks and `..` included) right after parsing and, when it equals the resolved `~/bookvie-data`, prints "bookvie: --dev won't use your real library (~/bookvie-data). Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder." and exits 2, before `instance.py` takes the lock or the store opens. No test touches the real `~/bookvie-data`: they set `HOME` to a temporary folder.
- AR31 (AD-6, AD-8): `GET /api/views/app-info` (`views/app_info`, a Pydantic model, then `api:gen`) returns `{ version, mode: "dev" | "production", dataDir, commit }`. `version` is `bookvie.__version__`; `mode` is `dev` exactly when the server was started with `--dev` and is the only dev signal the client reads, never `import.meta.env.DEV`; `dataDir` is formatted by the server, `~` for the home folder and a full absolute path outside it; `commit` is the short git hash read once at startup and only with `--dev` (`git rev-parse --short HEAD` in the package's source folder), `null` in production and when git or a checkout isn't there, never an error. `/api/health` doesn't change.
- AR32 (AD-7): `app-info` is an ordinary view keyed `['view', 'app-info']`: invalidated after every intent and refetched on window focus. A failed fetch keeps the last data; with no data yet, the shell looks like production and shows no notice.
- AR33 (AD-16, Structural Seed): A dedicated `GET /favicon.svg` route, registered before the SPA catch-all, serves `favicon.svg` (sage) from a production server and `favicon-dev.svg` (amber) from a `--dev` one, as `image/svg+xml` with `Cache-Control: no-cache`. Both files live in `frontend/public/`; the build copies them into `http/static/`, the wheel ships them and the smoke test checks `/favicon.svg`. `index.html` links `/favicon.svg` once and the client never changes it. The Vite dev proxy forwards `/favicon.svg` with `/api` and `/media`.
- AR34 (AD-8): One version: the bundle bakes its version at build time from `frontend/package.json` (a Vite `define`, declared for `tsc -b`); `scripts/release.sh` sets every copy, and a test in `npm run check` fails unless `bookvie.__version__`, `backend/pyproject.toml`, `package.json` and `frontend/package.json` agree.

**Agent tools (Epic 12).** All from AD-21.
- AR35 (AD-21, AD-16): `create_app` builds a fresh `MCPServer` each time and mounts its streamable-HTTP app at `/mcp` exactly (no `/mcp/mcp`, no redirect), before the SPA catch-all, with `mcp` among the server prefixes; its session manager runs in the app's lifespan; stateless with JSON responses; on in production and `--dev`; the intents' 1 MB body cap. `/mcp` is behind the AD-16 guard and `Sec-Fetch-Site` check; the SDK's own Host/Origin check is off (`enable_dns_rebinding_protection=False`), so refusals are AD-16's 403.
- AR36 (AD-21): The tools, exactly: read `get_app_info`, `find_book`, `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`; write `start_reading`, `update_page`, `finish_reading`, `pause`, `set_up_next`, `edit_purpose`, `add_card_note`, `edit_card_note`, `mark_side_read`, `unmark_side_read`, `add_book`, `edit_book`; backup `export_backup`; Epic 13 adds `record_backup_upload`, `list_local_backups`, `preview_restore`, `restore_backup` (AR50, AR55–AR57). `delete-book`, `delete-card-note` and `set-spine-color` are never registered; restore is reachable only as `restore_backup`, behind its two gates (amended 2026-11-21: Epic 12's ban on restore is lifted for that tool alone). A test asserts the list (`AGENT_TOOL_NAMES`), and each registered description equals its text in this file (Epic 12, or Epic 13 for AD-22's tools).
- AR37 (AD-21, AD-8): One validator. A write tool's arguments are its intent's JSON body with the same camelCase keys (`add_book` and `edit_book` add optional `coverUrl`). Each tool advertises an input schema generated from its intent model by alias (plus `coverUrl`, `null` left out where the parser refuses it, no extra properties); the SDK neither validates nor coerces; `parse_*_intent` is the only validator; a test compares each advertised schema with its model.
- AR38 (AD-21, AD-9): Same handler, same answers. The tool body runs in one worker-thread call, passes the arguments to the route's `parse_*_intent` and calls the same handler. Success: the route's `OkResponse` by alias (`ids`, `reachedLastPage`) as structured content, same JSON as text. Failure: `isError` with one text content, the AD-9 `error` object as JSON (`kind`, `code`, `message`, `fields`, `duplicates`); any other exception becomes `couldnt_save`. Read tools return their view model by alias and refuse as their routes do; parsing or refusing they need that lives in `http/api.py` (stats range, not-found) moves into `views/` first; `agent/` never imports `http/api`. A contract test per write tool compares tool and route: stored result and error.
- AR39 (AD-21, AD-3): `edit_book` is a whole edit: its input schema requires every form key (only `removeCover`, `confirmDuplicate`, `coverUrl` optional) and the tool never merges with the stored Book. The stale-tab deviation is accepted for agent edits too.
- AR40 (AD-21): `find_book` (`views/find_book`, a tool only) matches title, subtitle, authors, normalized ISBN and title-word initials ("DDIA") and returns `[{id, title, subtitle, authors, edition, type, role}]`, empty when nothing matches. Every other tool takes `bookId`. Tool descriptions are part of the interface and are fixed by the stories' ACs.
- AR41 (AD-21, AD-12): Cover by URL (`intents/cover_fetch`), in order: take `coverUrl` out; `parse_*_intent` with `has_cover` when it was sent; `edit_book` checks the Book exists; download (before the AD-4 lock); the handler with an `UploadedCover`. Rules: `https` on every hop, redirects by hand (at most 3), every resolved address on every hop global (mapped, 6to4, NAT64, Teredo unwrapped), connect to the checked address with TLS verified against the hostname, proxy variables ignored, `Accept-Encoding: identity`, 30-second deadline, 20 MB cap while streaming, bytes sniffed for JPEG, PNG or WebP. Over 20 MB is `cover_too_large`, any other download failure `invalid_fields`, a handler `cover` refusal is reported on `coverUrl`; nothing is saved. No host allow-list.
- AR42 (AD-21, AD-14, AD-15): `export_backup` (`intents/backup_file`) builds the export zip under the AD-4 lock, releases it, writes `bookvie-backup-YYYY-MM-DD.zip` (date from the `Clock`) atomically (unique temp, fsync, rename replacing the day's file), then records `lastExportAt` and returns `{path, size, createdAt}`; read failure `couldnt_export`, write failure `couldnt_save`. The backup folder follows the data folder: `~/bookvie-backups` for the default `~/bookvie-data`, `~/bookvie-backups-dev` for the default `~/bookvie-data-dev`, a sibling `<data folder>-backups` otherwise; `cli.py` resolves it and passes it to `create_app`; no flag, no retention. Epic 13 (AD-22): an optional `forUpload` argument (true: `lastExportAt` isn't recorded), and the result adds `libraryHash` and `unchangedSinceUpload` (AR49); a non-default data folder whose sibling would be `~/bookvie-backups` or `~/bookvie-backups-dev` gets no backups folder (`backups_dir` is `None`), so only `~/bookvie-data` writes into `~/bookvie-backups` (AR48).
- AR43 (Stack, AD-21): `mcp` 2.3.x and `httpx2` 2.16.x become runtime dependencies, pinned in Story 12.1 after a fresh version check; `httpx` stays dev-only. pytest sets `HOME` to a temporary folder for every test and Playwright's servers get a temporary `HOME`, so no test writes a real backup folder.

**Daily Dropbox backup and agent restore (Epic 13).** All from AD-22 unless named; where `dropbox-backup-plan-2026-11-21.md` differs, AD-22 wins (plan §6).
- AR44 (AD-22, Structural Seed): Two processes. `bookvie_dropbox` (`backend/bookvie_dropbox/`, console script `bookvie-dropbox` with `auth` and `serve`) ships in the same wheel (`packages = ["bookvie", "bookvie_dropbox"]`; the smoke test checks the `bookvie-dropbox` command). It is a stdio MCP server Claude Code starts, added as `bookvie-dropbox` with `--scope user` and the command's absolute path. It calls only Dropbox, touches only backup files (writes only `from-dropbox/` inside a backups folder), never a data folder, never calls bookvie, logs to stderr and never logs a token. `bookvie` never imports `bookvie_dropbox`, `dropbox` or `keyring`; `bookvie_dropbox` never imports `bookvie`; `backend/tests/test_layers.py` enforces both. They meet only in the skills, through files in a backups folder.
- AR45 (AD-22): Copied contracts, once on each side, a test comparing the two copies: the daily-name regex `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$` with a valid calendar date (every unit that selects, counts, prunes, lists, downloads or accepts a daily backup matches it; a non-matching name is never counted or deleted); the folders `~/bookvie-backups`, `~/bookvie-backups-dev` and their `from-dropbox`; the cause enum (AR47); the Dropbox content hash (SHA-256 over the SHA-256 of each 4 MiB block, stdlib only).
- AR46 (AD-22): Dropbox scope and sign-in. An App-folder Dropbox app; backups in `/Apps/bookvie/.backups/`. `bookvie-dropbox auth` runs OAuth with PKCE (app key a constant in `bookvie_dropbox`, no secret) through a loopback redirect on a fixed registered port, and stores the refresh token only in the macOS Keychain through `keyring` (service `bookvie-dropbox`, account `refresh-token`). The SDK refreshes access tokens; a refused refresh, or a Keychain read that fails or is denied, is cause `dropbox_signin`. No token in any tool result or log. The `dropbox` SDK sits behind a `DropboxApi` seam; tests use a fake and never touch the network or the real Keychain.
- AR47 (AD-22): Dropbox tools, and no others (no delete tool, nothing outside `.backups`). `upload_backup(localPath)` accepts only a regular file with a daily name directly in the resolved `~/bookvie-backups/` (no `..`, no symlink out; anything else refused before any network call, so a dev or scratch backup never uploads); a chunked upload session finished directly to the final name with `WriteMode.overwrite`, the whole file's `content_hash` and `client_modified` = the backup time in UTC; then it checks the returned `size` and `content_hash`; only then deletes the oldest daily backups beyond 3 by the date in the name, never the name it just wrote; any failure deletes nothing and returns its cause; keep fixed at 3, no argument; returns `{name, copies, deleted, contentHash}`. `list_backups()` returns the daily backups in `.backups` with time, size and `content_hash`. `download_backup(name, target)` takes only a daily name, `target` `bookvie` or `bookvie-dev` picks that folder's `from-dropbox/`, writes atomically (temp, fsync, rename) only once `content_hash` matches (a mismatch leaves no file), returns the local path; failures `dropbox_signin`, `download_incomplete`, `other`. Causes, one closed enum shared by `upload_backup` and `record_backup_upload`: `dropbox_signin`, `upload_incomplete` (mismatch, failed chunk, timeout), `dropbox_full`, `backup_write`, `other`.
- AR48 (AD-22, AD-20, amends AD-21 Backup): Backup time is one instant from the injected `Clock`: `build_export` stamps the zip's `library.json` entry with `clock.now()`, and the daily name, `createdAt` and a safety copy's name use that same `now`; every tool reports a backup's time as ISO-8601 with an offset, and `bookvie_dropbox` reads it from that zip entry. Backups folder: a data folder that isn't one of the two defaults but whose sibling rule would give `~/bookvie-backups` or `~/bookvie-backups-dev` gets `backups_dir = None`.
- AR49 (AD-22, AD-15): Upload state in `local-state.json`: `autoBackup: {lastReport: {outcome: "uploaded" | "skipped" | "failed", at, cause?}, lastOk: {at, outcome}, lastUpload: {at, backupAt, name, copies, libraryHash}}`; `at` from the `Clock`, never from the agent; a failure replaces only `lastReport`, a skip also `lastOk`, an upload all three. Unchanged: the fingerprint is the SHA-256 of the backup's `library.json` bytes; `export_backup` returns `libraryHash` and `unchangedSinceUpload` (equal to `lastUpload.libraryHash`); bookvie compares, the skill only branches. `export_backup({forUpload: true})` doesn't record `lastExportAt`: the daily run never moves "Last export", an export never moves `autoBackup`, a restore touches neither.
- AR50 (AD-22, AD-9): `record_backup_upload({outcome, path?, copies?, contentHash?, cause?})`, a tool-only bookvie writer. `uploaded` needs `path` (a daily backup in this server's backups folder), `copies` and `contentHash`; bookvie checks the zip at `path` still has that Dropbox hash and stores its `library.json` hash itself. `failed` needs `cause`; `skipped` needs neither. A broken argument is `invalid_fields`; a write failure `couldnt_save`.
- AR51 (AD-22): The `bookvie-backup` project skill: `get_app_info` to check bookvie is reachable; `export_backup({forUpload: true})`; unless `unchangedSinceUpload`, `upload_backup`; then `record_backup_upload` always (skip and failure too). Uses only `mcp__bookvie__` and `mcp__bookvie-dropbox__` tools. Run by hand interactively it may start bookvie as the other skills do; the unattended run never needs to.
- AR52 (AD-22, AD-5): The schedule, `cli.py` subcommands, production only (each refused with `--dev`). `bookvie autobackup install` writes `~/Library/LaunchAgents/<label>.plist` and loads it with `launchctl bootstrap`; `uninstall` unloads with `bootout` and removes it; the label is one constant shared with the probe; installing over an existing job replaces it, resolves every path again and reloads. Install refuses a linked git worktree, and its `WorkingDirectory` is the checkout holding `.claude/skills/bookvie-backup/SKILL.md` (the current folder; refused otherwise). The plist runs `bookvie autobackup run` by absolute path at 09:00 (`StartCalendarInterval`), sets `PATH` to include the folders of the resolved `bookvie`, `bookvie-dropbox` and `claude`, and logs to `~/Library/Logs/bookvie/autobackup.log` and `autobackup.err.log`. `autobackup run`: if `/api/health` doesn't answer, start `bookvie --no-browser` and wait for health; run the resolved `claude -p "/bookvie-backup"` with `--allowedTools` and `--disallowedTools`; SIGTERM the server only if it started it; exit with `claude`'s status.
- AR53 (AD-22): The tool lists. `--allowedTools` is one constant in `cli.py` of MCP tool names only, never `Bash` in any form, and a test checks it equals the skill's tools; `--disallowedTools` names `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup` (from Story 13.4 on, before those tools exist). A test reads the generated plist and the arguments.
- AR54 (AD-22, AD-6, AD-20): Auto-backup state in `views/backup`: the server computes `autoBackup.state` (`off`, `waiting`, `on`, `failing`, `stalled`) with EXPERIENCE.md's first-match order and the 26-hour rule on `lastReport.at` against the `Clock` (exactly 26 h is still `on`/`failing`; a future report time counts as now); `off` with reason `dev` on a `--dev` server, and with reason `other_library` unless this server's backups folder is `~/bookvie-backups` (only that server runs the probe). The view also carries `reportAt`, `lastOkAt`, `lastUploadAt` (the upload's `backupAt`), `copies` and `cause`; the client only formats. Installed comes from `create_app`'s `launchd_probe` seam: only the exit status of `launchctl print gui/<uid>/<label>`, short timeout; any error, or not macOS, reads as not installed. Missing or unreadable upload state reads as no report.
- AR55 (AD-22, AD-14): Restore files. `preview_restore` and `restore_backup` take a `path` that must resolve to a regular file directly in this server's backups folder or its `from-dropbox/`, with a daily name or a safety-copy name (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`, then `-2`, `-3`…); any other path, `..` or a symlink out is 422 `restore_outside_backups` (no `fields`) before anything is read. `list_local_backups()` (read tool) returns the daily backups, safety copies and `from-dropbox/` files, newest first, each with `path`, `kind` (`daily`, `safety`, `from_dropbox`), backup time, size and Dropbox content hash. `preview_restore(path)` takes the lock, stages and validates, applies nothing, and returns the backup's time and counts (Books, Card notes, covers), the current library's counts, the titles of Books whose ids are in the current library and not the backup, and the number of such Card notes on any Book; its refusals are AD-14's codes.
- AR56 (AD-22, AD-21): Gates. Gate 1 is Claude Code's `ask` permission rule on both `restore_backup` names in user settings (the guide's setting; bookvie can't see it). Gate 2 is MCP 2026-07-28 elicitation over the stateless JSON mount: a connection below 2026-07-28 (`ctx.protocol_version`) or a client without form elicitation (an empty `elicitation` object counts as form) is `unsupported`, checked first. A call without input responses computes the preview and returns an `InputRequiredResult` with one form elicitation whose message is EXPERIENCE.md's confirmation text and a `requestState` bookvie seals by hand (no SDK `RequestStateBoundary`): a process nonce and a single-use nonce plus `{resolved path, archive SHA-256, current library.json SHA-256, expiry 5 minutes}` under HMAC-SHA256 with a per-process key. Only an explicit accept on a valid token goes on; anything else is 409 `restore_not_confirmed` with `reason`: `declined`, `cancelled`, `unsupported`, `expired` (expiry passed, or unknown process nonce after a restart), `changed` (bad MAC, nonce reused, a retry whose `path` resolves elsewhere, or a moved library or archive hash), and nothing changes.
- AR57 (AD-22, AD-4, AD-12, AD-14): Apply, in one hold of the store lock: read the file once into the staging spool, whose SHA-256 must equal the sealed hash (`changed` otherwise), then stage and validate (a refusal writes nothing); write the safety copy with `write_export_zip` and the atomic file write (never `build_export`, `write_backup` or `record_export`; failure is 503 `safety_copy_failed`, kind `couldnt_save`, and nothing is restored); run `apply_staged` in the AD-12 order. Lock-free cores: `intents/export` gets `write_export_zip(store, out)` (wrapped by `build_export`), `intents/restore` splits into `stage_and_validate` and `apply_staged` (wrapped by `restore()`); each expects its caller to hold `store.lock`; a test with a timeout proves `restore_backup` finishes. Success returns `{restoredFrom, backupTime, safetyCopy}`; refusals equal the route's (a contract test compares tool and route); `local-state.json` stays byte-identical. `POST /api/intents/restore` doesn't change. Safety copies and `from-dropbox/` files are never pruned or uploaded.
- AR58 (AD-22): The `bookvie-restore` project skill: lists both sources (`list_local_backups`, `list_backups`, one row per content hash), suggests the newest and never picks; downloads a Dropbox pick; shows `preview_restore`; asks in the chat (not a gate); calls `restore_backup`; reports the outcome and the safety copy; gives the terminal-CLI advice only for `reason: unsupported`; never retries a refused or unconfirmed restore by itself; uses `bookvie-dev`'s tools and `download_backup` target `bookvie-dev` when asked to work on development.
- AR59 (AD-9): New error codes: 422 `restore_outside_backups`; 409 `restore_not_confirmed`, whose error object also carries `reason` (the one code with that key); 503 `safety_copy_failed` (kind `couldnt_save`). Each has an API or tool test (TR7).
- AR60 (Stack): `dropbox` 12.2.x and `keyring` 25.7.x, `bookvie_dropbox` only, pinned after a fresh version check; `mcp` 2.3.x supplies `InputRequiredResult` and the stdio server. Every test's `HOME` is temporary and `_on_the_machine` refuses any lookup or connection off the machine.
- AR61 (plan D12, Consistency Conventions → Testing): Docs ship with the code. `docs/dropbox-backup.md` (setup, how it works, troubleshooting, restoring) grows story by story, each story adding the docs for what it introduces as ACs; README → Agent tools gets a short "Daily backup to Dropbox" paragraph linking to it, and README → AI skills lists both skills. A pytest parses the guide's code blocks and checks each `bookvie`/`bookvie-dropbox` subcommand and flag against the CLI, and that every auto-backup state has a troubleshooting entry with its exact wording. The setup is checked by Oleg following it from scratch.

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

**Catalog tiles (FR-25)**
- UX-DR54: Catalog view toggle with three options, Bookcase · List · Tiles (D → Components; E → Component Patterns)
- UX-DR55: Tiles grid and cover box: 140px minimum, 24/32px gaps, 2:3 box, bottom-aligned covers, one-line caption, reserved reading-bar slot; values in `components.catalog-tile`, no new primitive tokens (D → Layout & Spacing → Tiles, Catalog tile)
- UX-DR56: Finished ribbon with its light halo, and the reading bar, including dark theme and forced colors (D → Catalog tile, Forced colors)
- UX-DR57: Typeset cover, read and unread, also used when a cover fails to load (D → Catalog tile; E → State Patterns: No cover)
- UX-DR58: Tiles behavior: one link per tile with the spine's name, a list named "Tiles, N books", lazy covers with no layout shift, highlight after add, focus after delete, empty and no-match states (E → Tiles)

**Faster card note entry (FR-17)**
- UX-DR59: Keyboard save: Cmd+Enter or Ctrl+Enter in Note or Page saves exactly as **Save note**; `aria-keyshortcuts="Meta+Enter Control+Enter"` on **Save note**; while a save is out, **Save note** (and **Delete**) are `aria-disabled` described "Saving the card note.", and further presses, **Cancel** and Esc are ignored (E → Card note panel, Interaction Primitives)
- UX-DR60: Checkbox: the native checkbox, 16px, tinted with `accent` via `accent-color`, label in `body-sm`/`ink`, focus ring on the box, forced colors left to the system (D → Components → Checkbox, `components.checkbox`)
- UX-DR61: Add another (add mode only): after a save the panel stays open, Note empties, Page keeps what was typed, errors clear, focus returns to Note, `status` announces "Card note saved."; Cancel or Esc after saves keeps the saved notes; an edit save always closes; failures never close the panel (E → Card note panel, Focus after close, Flow 6 variant)
- UX-DR62: Running count: "N notes saved" in `meta`/`ink-tertiary` on the checkbox's line, right-aligned, plain text (not a live region), empty at each opening (D → Card note panel, `components.card-note.saved-count`; E → Card note panel)

**Descending catalog sort (FR-20)**
- UX-DR63: Sort direction toggle, visual: joined to the Sort select's right edge as one compound field (same height and border, the shared edge drawn once, the select's right corners square), `surface-inset` fill, an arrow in `ink-secondary` (↑ natural, ↓ reversed) then the order's text in `body-sm`/`ink`, minimum width of the key's wider label, no hover change, the focused half raised, forced colors as `ButtonFace`/`ButtonText` (D → Components → Sort direction toggle, `components.sort-direction-toggle`, Forced colors)
- UX-DR64: Sort direction toggle, behavior: a plain `button` named by its visible text ("A–Z" ⇄ "Z–A", "Newest first" ⇄ "Oldest first", "Fewest first" ⇄ "Most first"), no `aria-pressed`, the arrow `aria-hidden`, select and toggle in a `role="group"` labelled "Sort"; a press reorders bookcase, list and tiles in place, keeps focus, and `status` stays silent; next Tab stop after the select; hidden on an empty catalog (E → Component Patterns: Sort select, Sort direction toggle; Accessibility Floor → Names)

**Which bookvie you're looking at (FR-26, FR-27, NFR9)**
- UX-DR65: Favicon: our own drawing (MIT, noted in a comment in the file), SVG only, a 32-unit grid with three spines of different heights on one plank, path `M3 11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14H3z M12.5 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20h-8z M22 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v12h-7z M1 26h30v4H1z`, one flat fill, transparent elsewhere; production `accent` `#557059`, and `accent-dark` `#93B597` under `@media (prefers-color-scheme: dark)` inside the SVG; dev the same drawing in `#8C5E0E`, `#EBC27A` under the dark scheme (D → Components → Favicon, `components.favicon`; E → Favicon)
- UX-DR66: Dev amber only on a `--dev` server and only on the dev favicon and the DEV pill, as literals in `components.favicon` and `components.dev-pill`, not a `colors` primitive, so `tokens.css` and its `app-shell.spec.ts` comparison don't change; production never shows amber (D → Colors → Dev amber, Do's and Don'ts)
- UX-DR67: DEV pill, visual: "DEV" in `section-label` (12px, 600, 0.08em, uppercase), `#FFFFFF` on `#8C5E0E` (light) and `#191B18` on `#EBC27A` (dark), `rounded.sm`, `4px 7px` padding, `spacing.2` after the word "bookvie", centered on the wordmark's line, no hover; under forced colors `Canvas` with `CanvasText` text and a 1px `CanvasText` border (D → DEV pill, `components.dev-pill`, Forced colors)
- UX-DR68: DEV pill and tab title, behavior: the pill is plain text inside the wordmark, not a control, link or Tab stop, with a DOM space before it so the wordmark reads "bookvie DEV"; on a dev server every route's title is "DEV · *Page* — bookvie"; both appear once `app-info` says `mode: "dev"`, and the nav's one-time shift when the pill appears is accepted (E → Foundation, DEV pill, Tab title, Accessibility Floor → Structure)
- UX-DR69: Update notice, visual: a full-width `surface` band directly under the top nav with a 1px `line` bottom hairline, `10px {spacing.page-x}` padding, one sentence in `body-sm`/`ink`, then `spacing.4` later a compact **Reload** `button-secondary` (30px, `body-sm`, `0 {spacing.3}`); no icon, no close button, no amber or accent fill; it pushes the page down and never overlaps; under forced colors the border is `CanvasText` and Reload takes system button colors (D → Update notice, `components.update-notice`, Layout & Spacing, Forced colors)
- UX-DR70: Update notice, behavior: "bookvie was updated to *X*. Reload to use it." with the server's version, shown while the bundle's and the last successful `app-info`'s versions differ (newer or older), hidden when a refetch finds them equal again, unchanged by a failed fetch; no dismiss; **Reload** reloads at once without asking; inside the `header` landmark after the top bar, reached by Tab after the theme toggle and before the page, skipped by "Skip to content"; not a dialog, not an `alert`, not itself a live region; announced once through the polite `status` region each time it appears or names a new server version, unless another message is pending or the regions are emptied within the tick (by any later message, such as a save's when its own refetch found the version, or by a panel or dialog opening), in which case the band and **Reload** stay and the announcement is not retried (E → Update notice, Accessibility Floor → Keyboard, Live regions; Flow 12)
- UX-DR71: About this copy: the third `surface` card on Backup, under Export and Restore, a `section` labelled by its `h2` "About this copy" (shown in `section-label`/`ink-tertiary`); line 1 "bookvie 1.1.0", or on a dev server "bookvie 1.1.0 (a1b2c3d) · Development server" (no brackets when `commit` is null); line 2 "Data folder: ~/bookvie-data" as the server sends it; both in `body-sm`/`ink-secondary`, sans, wrapping anywhere, read-only with no copy button; the commit never shows in production; left out silently until `app-info` loads (D → Backup page, About this copy, `components.about-card`; E → About this copy; Flow 11)
- UX-DR72: `app-info` states: not loaded yet, or never loaded, means the header and title look like production, no notice and no About this copy card, and nothing says it failed; a refetch that fails after a success keeps the last data for the pill, the title, the card and any notice (E → State Patterns)

**Daily Dropbox backup and agent restore (FR-29, FR-30)**
- UX-DR73: Auto-backup line, visual: `components.auto-backup-line`, a second `meta` line in the Export card directly under "Last export", same left alignment, wrapping inside the card; Off, Waiting and On in `ink-tertiary`, Failing and Stalled in `ink` (`text-color-strong`); text only (no dot, glyph, icon, badge shape, tint or color, so no forced-colors rule); the state word plain, same weight; commands in a reason stay in the body font, not monospace (D → Components → Auto-backup line, Do's and Don'ts)
- UX-DR74: Auto-backup line, behavior: pattern "Auto-backup: *State* · *detail*" from `views/backup`; plain text, not a control, link, Tab stop or live region; updates with the page's refetch on focus, unannounced, like "Last export"; only on Backup, never on Home's re-entry line; **Export all data** changes "Last export", never this line, an upload never changes "Last export", a restore changes neither; if `views/backup` can't load, the page shows "Couldn't load" (E → Pages: Backup page, Component Patterns → Auto-backup line)
- UX-DR75: Auto-backup states, first match wins: Off (dev) "Auto-backup: Off · never on a development server"; Off (not installed, unknown, not macOS) "Auto-backup: Off · not set up on this computer"; Waiting "Auto-backup: Waiting · first backup at 09:00"; Failing "Auto-backup: Failing · *reason and fix*" then " Last upload *when*." if there was one; On after an upload "Auto-backup: On · last upload today at 09:02 · 3 copies in Dropbox", after a skip "Auto-backup: On · checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox"; Stalled "Auto-backup: Stalled · no backup since yesterday at 09:02" (the latest upload or skip; "no backup since it was set up" if none) (E → Auto-backup line)
- UX-DR76: Auto-backup timing and formats: 26 hours from the latest report to now, exactly 26 h still On or Failing, past it Stalled, a future report counts as now; Waiting never times out; missing or unreadable state is no report; "today at 09:02", "yesterday at 09:02", otherwise "on 19 Nov" (Stalled "since 19 Nov"), local calendar days, recomputed on focus; "1 copy" / "2 copies" / "3 copies", a skip keeping the last upload's count; short absolute dates day first ("19 Nov", "19 Nov 2025" outside the current year) and local 24-hour times (E → Auto-backup line, Foundation → Dates)
- UX-DR77: Failing reasons by cause: `dropbox_signin` "Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal."; `upload_incomplete` "the last upload didn't finish. Nothing in Dropbox was deleted; the next 09:00 run tries again."; `dropbox_full` "Dropbox is full. Nothing in Dropbox was deleted; free some space there."; `backup_write` "bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting."; `other` "the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting." The guide has one troubleshooting entry per state with the same wording (E → Auto-backup line)
- UX-DR78: Restore pick list (chat): "Backups you can restore:", numbered rows newest first by backup time, "*date, time* · daily backup | safety copy (before a restore) · this computer | Dropbox | this computer and Dropbox · *size*", one row per content hash (restored from this computer without a download), the 10 newest then "and N older. Say show all to see them.", "The newest is 1. Which one?"; never picks; Dropbox unreachable: local rows then "Couldn't reach Dropbox: *reason*." (sign-in: "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."); none anywhere: "No backups found on this computer or in Dropbox. Nothing was changed." (E → Agent conversations → Restore, step 1)
- UX-DR79: Restore preview (chat): "Restore *file* (*source*, *date, time*)?", "This backup:" and "Now:" counts of books, card notes and covers, "You'd lose what was added since *date, time*:" with "N books: A; B; C" (up to 5 titles, then "and N more"; "1 book", "1 card note") and "N card notes", or "No books or card notes were added since *date, time*."; always "Everything else changed since *date, time*, such as pages reached, goes back to how it was then." and "A safety copy of your current library is saved first."; then the skill asks in its own words (not a gate) (E → Agent conversations → Restore, step 2)
- UX-DR80: bookvie's confirmation (gate 2's message), plain text, one paragraph, no markdown, always its own counts: "Replace all data with the backup from *date, time*? You'd lose N books added since (*titles*), N card notes, and every other change since then. A safety copy of your current library is saved first."; with nothing added: "Replace all data with the backup from *date, time*? Every change since then goes back, such as pages reached. A safety copy of your current library is saved first." Same title rule as the preview (E → Agent conversations → Restore, step 3)
- UX-DR81: Restore outcomes (chat): Restored "Restored from the backup of *date, time*. Safety copy: *~ path*"; `restore_not_confirmed` "Not restored. Nothing was changed." plus, for `unsupported` only, "Run it in the Claude Code terminal, not VS Code or claude -p."; `restore_invalid`/`restore_unsafe` "This file isn't a bookvie export, or it's damaged. Nothing was changed."; `restore_newer_version` "This export is from a newer version of bookvie. Nothing was changed."; `couldnt_save` "Couldn't save. Your data wasn't changed."; download failed "Couldn't download the backup from Dropbox: *reason*. Nothing was changed."; `safety_copy_failed` "Couldn't save a safety copy, so nothing was restored."; `restore_outside_backups` "bookvie restores only from its backups folder. Nothing was changed."; `download_incomplete` "The download didn't match the copy in Dropbox, so nothing was restored. Try again."; paths with `~`; never retried on its own (E → Agent conversations → Restore, step 4; Voice and Tone)
- UX-DR82: Auto-backup report, one line in the line's words: "Uploaded *name* · N copies in Dropbox, deleted *name*", "Nothing new since the last upload; skipped.", "Failed: *reason and fix*"; to the launchd log headless, in the chat when run by hand (E → Agent conversations → Auto-backup report)

### FR Coverage Map

FR-1: Epic 1 - Book fields, create/edit/delete, Finished on back-fill, tags field, spine color
FR-2: Epic 1 - Agent-friendly form (retired 2026-11-19; agents use FR-28)
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
FR-17: Epic 5 - Add/edit/delete Card notes; Epic 9 - Keyboard save and Add another
FR-18: Epic 5 - Card notes pile
FR-19: Epic 5 - Card notes view and search
FR-20: Epic 7 - Filter and sort; Epic 10 - Sort direction
FR-21: Epic 3 - Cover on the main screen
FR-22: Epic 2 - Export; Epic 3 - Last export on Home
FR-23: Epic 2 - Restore
FR-24: Epic 1 - Catalog bookcase (spines, colors, meter, popover, keyboard); Epic 3 - Home slice and Main-book fill; Epic 4 - Up next / Waiting markers
FR-25: Epic 8 - Tiles view: grid, covers, ribbon, reading bar, typeset covers
FR-26: Epic 11 - Dev defaults and the real-library refusal, `app-info` mode, the amber favicon, the DEV pill and the `DEV · ` title
FR-27: Epic 11 - About this copy on Backup, the update notice and the one version
FR-28: Epic 12 - The agent tools at `/mcp`: read tools and `find_book`, daily-loop write tools, add and edit a Book with a cover URL, `export_backup`, and the two bookvie skills moved onto them; Epic 13 - restore through `restore_backup`, and `export_backup`'s `forUpload`
FR-29: Epic 13 - The `bookvie-dropbox` server and `upload_backup`, `record_backup_upload` and the upload state, the `bookvie-backup` skill, `bookvie autobackup` with launchd, the auto-backup line, and the guide
FR-30: Epic 13 - `list_local_backups`, `preview_restore`, `restore_backup` with its two gates and the safety copy, `list_backups` and `download_backup`, and the `bookvie-restore` skill

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

**Given** a Book with an active or paused Reading that started on 1 October 2026
**When** Finished on is set or changed to a date after that start
**Then** nothing is saved, and the response is 422 with "Finished on can't be after 1 October 2026, when the current reading started." on Finished on; the start day itself is allowed (Epic 3 retro item 21, 2026-11-06).

**Given** a Book whose most recent finish is a back-fill on 1 June 2025 and another Reading finished on 14 August 2019
**When** Finished on is changed to a date before 14 August 2019
**Then** nothing is saved, and the response is 422 with "Finished on can't be before 14 August 2019, when an earlier reading finished." on Finished on; 14 August 2019 itself is allowed (spec-finished-on-keeps-readings-in-order, 2026-11-12).

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
**Then** it equals the total pages read in finished Readings with a start date (each segment's pages since its `startPage`: `endPage` − `startPage` for each of `earlierSegments`, `finishedPages` − `startPage` for the last, each at least 0) ÷ Σ(finishDate − startDate + 1)
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
**Then** below "This pauses *Y* at p.120 (64%)." it adds "*Z* moves to Waiting for you." when *Z* has a paused Reading, "*Z* stays on the side." when *Z* has none and is a Side read, or "*Z* returns to the catalog." when *Z* has none and is not a Side read (FR-5, UX-DR39)
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
**Then** a Confirm `alertdialog` first says "Pause *X* at p.150 (58%)? *Z* moves to Waiting for you." (or "*Z* stays on the side." or "*Z* returns to the catalog."), with **Pause** and **Cancel** (Cancel has default focus) (UX-DR40)
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
**Then** *Z* moves to Waiting for you if it has a paused Reading, stays on the side if it has none and is a Side read, otherwise it returns to the catalog.

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

## Epic 8: See the catalog as covers

The user can switch the Catalog to Tiles, a third view next to the bookcase and the list: a grid of covers in the current sort and filters. Read Books carry a ribbon in their spine color, Books being read show a progress bar, and Books without a cover get a typeset cover. Each tile opens its Book.

**Gate:** per-epic quality gates (TR7), plus the 500-cover speed check in Story 8.1. If that check fails, a follow-up story for cover thumbnails (ARCHITECTURE-SPINE → Deferred, amending AD-12 and AD-14) is opened; it does not block the epic.

### Story 8.1: See my catalog as covers

As Oleg,
I want to switch the Catalog to a grid of covers,
So that I can find a Book by its cover rather than its title.

**Requirements:** FR-25, NFR7, AR24, AR25, AR26, UX-DR54, UX-DR55, UX-DR58

**Acceptance Criteria:**

**Given** the catalog view
**When** it is fetched
**Then** every `ShelfBook` carries `coverFile` (the stored cover file name, `null` without a cover), added to the Python model first and then to the generated schema with `api:gen`, and `check:api` passes (AR25).

**Given** the Catalog toolbar
**When** it renders
**Then** the "Catalog view" group offers Bookcase (default) · List · Tiles as three toggle buttons with `aria-pressed`, in the theme toggle's look (UX-DR54)
**And** choosing Tiles is remembered in `localStorage` under `bookvie.catalogView` (try/catch); an unknown stored value still falls back to Bookcase, and a restore neither brings nor replaces the choice (AR26).

**Given** Tiles is chosen
**When** the Catalog renders
**Then** the Books appear as a `list` named "Tiles, N books" on the plain page background, packed with `repeat(auto-fill, minmax(140px, 1fr))`, 24px between columns and 32px between rows, so a 1280px window shows 7 columns (UX-DR55)
**And** each tile is one link to Book detail, holding a 2:3 cover box, an 11px reserved reading-bar slot, the title in `book-title-sm` at weight 600 and the first author in `body-sm` `ink-secondary`, each on one line cut with an ellipsis
**And** the link's accessible name is the spine's name, built by the same function: "*Title* by *First author*, *status*", with the same "and N others" rule and twin disambiguation (AR24, UX-DR58).

**Given** a Book with a cover
**When** its tile renders
**Then** the cover is `/media/covers/<coverFile>` with `loading="lazy"`, `decoding="async"` and empty `alt`, shown whole (`object-fit: contain`) at the bottom of the box with 4px corners and a 1px `line` hairline, never cropped, dimmed or shadowed
**And** until it loads the box shows a flat `surface-inset` fill with the same hairline, and the box never changes size, so nothing in the grid moves as covers arrive.

**Given** a Book without a cover, or a cover that fails to load
**When** its tile renders
**Then** the box shows the existing no-cover placeholder at the box size (Story 8.3 replaces it with the typeset cover).

**Given** Search titles text, a sort or filter chips
**When** they change in Tiles
**Then** tiles follow the same sorted array as the bookcase and List, non-matching tiles are `hidden` and the grid closes up, and the `status` region reads "N books match." as in the other views (AR24)
**And** "No titles match “query”.", "No books match these filters." with "Clear filters", and the empty shelf with **New book** show in place of the grid.

**Given** Tiles is showing
**When** I add a Book with the New book panel
**Then** the new tile is scrolled into view in the current sort, focused and given the highlight ring around its cover box (instant under reduced motion), and a search or filter that would hide it is cleared first.

**Given** I delete a Book from its page
**When** I land back on the Catalog in Tiles
**Then** focus goes to **Search titles**, as in the other views.

**Given** a tile
**When** I Tab through the grid and press Enter
**Then** each tile is one Tab stop in sort order with the 2px accent focus ring around its cover box, and Enter opens Book detail.

**Given** a seeded library of 500 Books, each with a 1200px cover
**When** I switch to Tiles in Chromium at 1280px
**Then** the grid and the first screen of covers render in about 1 second, and scrolling to the end shows no layout shift (FR-25, NFR7)
**And** if this fails, the story records the measurement and a follow-up story for cover thumbnails is opened (AR26).

**Given** the existing unit and e2e tests that assume two view options
**When** this story lands
**Then** they cover the three options, and Bookcase and List behave as before.

### Story 8.2: See what I've read and what I'm reading on the tiles

As Oleg,
I want each tile to show whether I've read the Book and how far I am in it,
So that the grid of covers also tells me where my reading stands.

**Requirements:** FR-25, AR24, UX-DR56

**Acceptance Criteria:**

**Given** a Book whose catalog view has `finished: true`
**When** its tile renders
**Then** a bookmark ribbon 16×24px with a 6px V-notch hangs from the visible cover's top edge, 10px in from its right edge, filled with the Book's exact `spineColor`, with a 1px `spine-edge` line on its sides and notch and a 1.5px `spine-label-strip` halo outside that line, and no glyph or text on it (UX-DR56)
**And** it sits on the visible cover, not on the empty part of the box.

**Given** a Book whose catalog view has a non-null `percent`
**When** its tile renders
**Then** a 5px reading bar sits in the reserved slot 6px below the box, the box's width, `accent-soft` track and `accent` fill to `percent`, square ends; it is never recomputed from `currentPage` and `pages` (AR24)
**And** a Book with `percent: null` shows no bar, and the slot stays empty so captions still line up across the row.

**Given** a finished Book being re-read
**When** its tile renders
**Then** it shows both the ribbon and the bar.

**Given** an unread Book with no Reading
**When** its tile renders
**Then** it has no mark.

**Given** any tile
**When** a screen reader reads it
**Then** the ribbon and the bar are `aria-hidden`, and the status is in the link's name from Story 8.1 ("finished", "Main book, 64%", "finished, waiting for you, page 40"), so status never depends on color or shape alone.

**Given** the dark theme
**When** tiles render
**Then** the ribbon fill, its halo and the bar keep their meaning; only `spine-edge` and chrome colors take their dark twins.

**Given** `forced-colors: active`
**When** tiles render
**Then** the ribbon and the bar's fill use `forced-color-adjust: none` with `CanvasText`, the bar's track becomes `Canvas` with a `CanvasText` outline, the ribbon halo becomes `Canvas`, and the cover hairline becomes `CanvasText`.

### Story 8.3: Give books without a cover a typeset cover

As Oleg,
I want a Book without a cover to look like a book in the grid,
So that the tiles don't read as broken where a cover is missing.

**Requirements:** FR-25, UX-DR57

**Acceptance Criteria:**

**Given** a read Book without a cover
**When** its tile renders
**Then** the box is filled with the Book's exact `spineColor`, with a 1px `spine-edge` border and 4px corners, and a `spine-label-strip` plate inset 10px from the sides and starting 34px from the top holds the title (`book-title-sm` at weight 400, up to 4 lines, `spine-label` color) and the first author (`meta`, one line) (UX-DR57)
**And** no text sits straight on the Book's color, and the ribbon from Story 8.2 hangs clear of the plate.

**Given** an unread Book without a cover
**When** its tile renders
**Then** the box is `spine-unread-fill` with a 1.5px `spine-unread-outline` border, the title and author in `spine-unread-text`, and no plate, like an unread spine seen from the front.

**Given** a Book whose cover image fails to load
**When** its tile renders
**Then** the typeset cover for its read state replaces the image.

**Given** the dark theme or `forced-colors: active`
**When** typeset covers render
**Then** the read fill and plate are the same in both themes while `spine-edge` and the unread colors take their dark twins, and under forced colors the typeset cover is `Canvas` with a `CanvasText` border and `CanvasText` text.

**Given** the Main book card, the Up next thumbnail or Book detail
**When** a Book has no cover
**Then** they keep the existing no-cover placeholder; the typeset cover applies to catalog tiles only.

## Epic 9: Add card notes faster

The user can save a Card note from the keyboard and add several in a row: with **Add another** checked, the Card note panel stays open after each save with the page kept, and a running count shows how many notes this opening has saved.

**Gate:** per-epic quality gates (TR7), and the existing card note e2e specs pass unchanged with Add another off.

### Story 9.1: Save a card note with Cmd+Enter

As Oleg,
I want to save a card note from the keyboard while I'm typing it,
So that catching a line doesn't need a reach for the mouse.

**Requirements:** FR-17, UX-DR59

**Acceptance Criteria:**

**Given** the Card note panel in add or edit mode
**When** I press Cmd+Enter or Ctrl+Enter with focus in Note or in Page
**Then** the panel does exactly what **Save note** does: it sends `add-card-note` (or `edit-card-note`) with both values as typed, and on success it closes, focus returns to the opener and the `status` region reads "Card note saved."
**And** the keys submit the form through the same path as **Save note** (`requestSubmit()`), so there is one save path to test.

**Given** focus in Note
**When** I press Enter without Cmd or Ctrl
**Then** a new line is inserted and nothing is sent.

**Given** an empty Note, or a Page outside 1 to the Book's page count
**When** I press Cmd+Enter
**Then** nothing is saved, and the same field messages, `aria-invalid`, `alert` announcement and focus on the first invalid field appear as with **Save note**
**And** a couldn't-save keeps the panel open with both values kept and the line above the buttons, as with **Save note**.

**Given** a save is out
**When** I press Cmd+Enter again, hold it down, press **Save note**, **Cancel** or Esc
**Then** exactly one request is sent and the panel stays open until the result is in
**And** **Save note** (and **Delete** in edit mode) stay focusable with `aria-disabled="true"`, described "Saving the card note."

**Given** the Card note panel
**When** it renders
**Then** **Save note** carries `aria-keyshortcuts="Meta+Enter Control+Enter"`, and there is no on-screen hint.

### Story 9.2: Add several card notes in a row

As Oleg,
I want the card to stay open after a save when I'm catching several lines,
So that I can keep reading and noting without reopening the panel and retyping the page.

**Requirements:** FR-17, AR27, UX-DR60, UX-DR61, UX-DR62

**Acceptance Criteria:**

**Given** the Card note panel in add mode
**When** it renders
**Then** an **Add another** checkbox sits under Page, above the buttons: the native checkbox, 16px, tinted with `accent` through `accent-color`, its label "Add another" in `body-sm`/`ink` and clickable, with the focus ring on the box (UX-DR60)
**And** in edit mode there is no checkbox and no count.

**Given** I check or uncheck **Add another**
**When** the box changes
**Then** the choice is stored at once in `localStorage` under `bookvie.cardNoteAddAnother` by `lib/cardNoteAddAnother` (try/catch), and the next opening, also after a reload, shows the same state
**And** storage that is empty, holds anything else, or throws reads as off and the panel still works; a write that fails still toggles the box for this opening, with no message
**And** the choice is not in an export, and a restore neither brings nor replaces it (AR27).

**Given** **Add another** is on
**When** a save succeeds, from **Save note** or from Cmd+Enter
**Then** the panel stays open as the modal, Note empties, Page keeps exactly what was typed ("212–213" stays "212–213"), field errors and the couldn't-save line clear, and focus returns to Note
**And** the `status` region reads "Card note saved." after every save, announced again on the second save
**And** the counts behind the panel ("See card notes · N", Book detail's Card notes block) update as after any save (UX-DR61).

**Given** **Add another** is on
**When** the first save of this opening succeeds, then the second
**Then** a line on the checkbox's line, right-aligned in `meta`/`ink-tertiary`, reads "1 note saved", then "2 notes saved"
**And** the line is plain text, not a live region, and it is empty each time the panel opens (UX-DR62).

**Given** three notes saved in this opening and a fourth half typed
**When** I press **Cancel** or Esc
**Then** the panel closes, the three notes exist and the fourth doesn't, focus returns to the opener, and nothing more is announced
**And** the button is labelled **Cancel** throughout.

**Given** **Add another** is on
**When** a save is refused (422) or can't be written
**Then** the panel stays open with both values kept and the message shown as before, and the count doesn't change.

**Given** **Add another** is off, or the panel is in edit mode while the stored choice is on
**When** a save succeeds
**Then** the panel closes and focus returns to the opener, as before this story
**And** the existing card note e2e specs pass unchanged.

**Given** the dark theme or `forced-colors: active`
**When** the checkbox renders
**Then** it shows the dark unchecked box and the `accent` dark twin in the dark theme, and the system colors under forced colors, with no custom drawing.

## Epic 10: Reverse the catalog order

The user can reverse the Catalog's order: a toggle joined to the Sort select flips the current key's natural direction and says which order is in effect. The choice is remembered on this computer, resets when the key changes, and Home's slice follows it.

**Gate:** per-epic quality gates (TR7), and the existing catalog and home-slice e2e specs pass unchanged with the toggle not pressed.

### Story 10.1: Reverse the catalog order

As Oleg,
I want to flip the catalog's order and see which order is in effect,
So that I can find the longest book, my oldest additions, or authors from Z without scrolling to the end.

**Requirements:** FR-20, AR28, UX-DR63, UX-DR64

**Acceptance Criteria:**

**Given** a browser that stored only `bookvie.catalogSort = "dateAdded"` before this story (no reversal key)
**When** the Catalog opens
**Then** the order is newest first, exactly as before, and the toggle reads "↑ Newest first"
**And** with nothing stored, the order is Author A–Z and the toggle reads "↑ A–Z" (AR28).

**Given** a non-empty Catalog
**When** it renders
**Then** the Sort direction toggle is joined to the Sort select's right edge as one compound field: the same height and border, the shared edge drawn once, `surface-inset` fill, an `ink-secondary` arrow then the order's text in `body-sm`/`ink`, its minimum width that of the current key's wider label (UX-DR63)
**And** on an empty Catalog neither the select nor the toggle shows.

**Given** each of the four keys in its natural direction
**When** I press the toggle (click, Enter or Space)
**Then** the bookcase, the list and the tiles reorder to exactly the reversed key order, and the toggle's text changes: "A–Z" to "Z–A" (Author, Title), "Newest first" to "Oldest first", "Fewest first" to "Most first", with the arrow from ↑ to ↓
**And** pressing it again restores the natural order and text
**And** the controls to its right don't move when it's pressed.

**Given** two Books with the same first author, and two with the same title
**When** the order is reversed
**Then** the tied Books keep title A–Z, then the Book added earlier first, exactly as in the natural direction: only the key's own order flips (AR28).

**Given** Author reversed (Z–A)
**When** I choose Pages in the Sort select
**Then** the order is fewest first, the toggle reads "↑ Fewest first", and the stored reversal is not reversed, so a reload still shows fewest first.

**Given** the order reversed
**When** I reload the page, or open Home
**Then** the Catalog is still reversed, and Home's bookcase slice packs its rows in the reversed order before choosing them
**And** `bookvie.catalogSortReversed` holds the reversal, `bookvie.catalogSort` keeps its old format, and neither is in an export; a restore neither brings nor replaces them.

**Given** storage that throws, a junk `bookvie.catalogSortReversed`, or a stored key that isn't one of the four
**When** the Catalog opens
**Then** the order is the key's natural direction (Author A–Z for a bad key) and the Catalog still sorts
**And** a write that fails still reverses the order for this visit, with no message.

**Given** a screen reader or keyboard user
**When** they reach the toggle
**Then** it is a plain `button` with no `aria-pressed`, its accessible name is its visible text with the arrow `aria-hidden`, and the select and the toggle sit in a `role="group"` labelled by the visible "Sort" label
**And** it is the next Tab stop after the Sort select, a press keeps focus on it, and the `status` region stays silent
**And** the bookcase's arrow-key order follows the reversed order (UX-DR64).

**Given** the select or the toggle has focus
**When** it renders, in light, dark or `forced-colors: active`
**Then** the focused half is drawn above the other so its halo or focus ring isn't hidden by the shared edge, there is no hover change, and under forced colors the toggle is `ButtonFace` with `ButtonText` text, border and arrow, the shared edge still visible.

## Epic 11: Know which bookvie you're looking at

bookvie gets its own favicon, a sage shelf of three spines. A development server keeps to its own library and port, refuses the real library, and is marked in every tab: an amber favicon, a `DEV · ` title and a DEV pill in the header. The Backup page says which version is running and which data folder it uses, and a tab left open across an update says so quietly and offers Reload.

**Gate:** per-epic quality gates (TR7); the plan's P0 risks green (real library refused, including through a symlink or `..`, with `HOME` set to a temporary folder; dev defaults; `app-info` per mode; favicon by mode, also through Vite; the dev frame; the stale-tab notice); the version equality test in `npm run check`; the existing e2e specs pass unchanged on a production server; `~/bookvie-data` untouched by `npm run check`. Plan: `dev-prod-favicon-plan-2026-11-17.md`.

### Story 11.1: A favicon for bookvie

As Oleg,
I want bookvie's tab to carry its own icon,
So that I can find it among my other tabs at a glance.

**Requirements:** NFR9, AR33 (production file and route), UX-DR65 (production fills)

**Acceptance Criteria:**

**Given** the built app
**When** I look at `frontend/public/favicon.svg`
**Then** it is the F3 drawing on a `0 0 32 32` viewBox with exactly the DESIGN.md path, one flat fill and no outline or labels, and a comment names it as bookvie's own drawing under the repo's MIT license
**And** its fill is `#557059` (`accent`), and `#93B597` (`accent-dark`) under `@media (prefers-color-scheme: dark)` inside the SVG
**And** a test reads both fills and fails unless they equal DESIGN.md's `accent` and `accent-dark`, in the spirit of `app-shell.spec.ts`.

**Given** `frontend/index.html`
**When** any page loads
**Then** its head has exactly one icon link, `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, and no PNG or `.ico` fallback (Chrome only, AGENTS.md).

**Given** a running production server
**When** the browser requests `/favicon.svg`
**Then** a dedicated route, registered before the SPA catch-all, answers 200 with the built `favicon.svg`, `Content-Type: image/svg+xml` and `Cache-Control: no-cache`
**And** a request for `/favicon.ico` or any other unknown top-level file behaves as before this story.

**Given** `npm run build`, then the wheel installed in isolation
**When** the smoke test runs (`scripts/smoke.mjs`)
**Then** `favicon.svg` is in `backend/bookvie/http/static/` and in the wheel, and the installed `bookvie` serves `/favicon.svg` as `image/svg+xml`.

**Given** Chrome's Mode set opposite to the OS
**When** Oleg looks at the tab once by hand
**Then** the fill matches the tab strip's scheme, as DESIGN.md → Favicon describes; the result is noted in the story.

**Given** the existing e2e suite
**When** it runs
**Then** every spec passes unchanged; nothing in the page looks different.

### Story 11.2: Keep development apart from the real library

As Oleg, and the agents that start bookvie for me,
I want a development server to keep to its own library and port and to look different in every tab,
So that a forgotten `--data-dir` or a habit can't touch my real library, and I always know which tab is which.

**Requirements:** FR-26, NFR5, AR29, AR30, AR31, AR32, AR33, UX-DR65 (dev fills), UX-DR66, UX-DR67, UX-DR68, UX-DR72

**Acceptance Criteria:**

**Given** `HOME` set to a temporary folder
**When** `bookvie --dev` starts with no `--data-dir` and no `--port`
**Then** it uses `~/bookvie-data-dev` and port `8766`
**And** `--dev --data-dir <scratch>` and `--dev --port <n>` use exactly what was given
**And** plain `bookvie` still uses `~/bookvie-data` and `8765`, and `--help` shows both defaults (AR29).

**Given** `HOME` set to a temporary folder
**When** `bookvie --dev` is started with `--data-dir` naming `~/bookvie-data` directly, through a symlink to it, or through a path with `..` that resolves to it
**Then** it prints "bookvie: --dev won't use your real library (~/bookvie-data). Leave out --data-dir to use ~/bookvie-data-dev, or pass a scratch folder." to stderr and exits 2
**And** no lock file is written, no store is opened, and nothing in that folder changes (AR30)
**And** no test reads or writes the real `~/bookvie-data`.

**Given** a server
**When** the client requests `GET /api/views/app-info`
**Then** the response is `{ version, mode, dataDir, commit }` from a Pydantic model in `views/app_info`, and `schema.d.ts` is regenerated so `check:api` passes
**And** `version` equals `bookvie.__version__`; `mode` is `"dev"` exactly when the server was started with `--dev`, else `"production"`
**And** `dataDir` is the resolved data folder with `~` for the home folder, and a full absolute path outside it
**And** `commit` is the short git hash read once at startup with `--dev`, `null` in production, and `null` (never an error or a failed start) when git isn't on the path or the package isn't in a checkout
**And** `/api/health` is unchanged (AR31).

**Given** a dev server and a production server
**When** each is asked for `/favicon.svg`
**Then** production serves the sage `favicon.svg` and the dev server serves `frontend/public/favicon-dev.svg`, both as `image/svg+xml` with `Cache-Control: no-cache`
**And** `favicon-dev.svg` is the same drawing with `#8C5E0E`, and `#EBC27A` under the dark scheme; a test checks both fills against DESIGN.md's `components.favicon.dev-fill` and `dev-fill-dark`
**And** the wheel ships `favicon-dev.svg` too (AR33).

**Given** `vite.config.ts`
**When** the Vite dev server runs
**Then** it proxies `/api`, `/media` and `/favicon.svg` to `http://127.0.0.1:8766`
**And** `dev-proxy.spec.ts` adds `/favicon.svg` to its inline `proxy` map and checks that a dev tab through Vite gets the backend's amber file, not Vite's own `public/` copy.

**Given** a page served by a `serverDev` server, whether through Vite or the built SPA
**When** `app-info` has loaded
**Then** the header's wordmark reads "bookvie DEV": the pill sits after the word with a space between them in the DOM, "DEV" in `section-label` on the dev amber fill, `rounded.sm`, `4px 7px` padding, `spacing.2` after the word (UX-DR67)
**And** the pill is not a link, button or Tab stop
**And** every route's title is "DEV · *Page* — bookvie", Book detail included ("DEV · Catalog — bookvie")
**And** the client reads dev only from `app-info.mode`; nothing uses `import.meta.env.DEV` for it (UX-DR68).

**Given** a production server
**When** any page renders
**Then** there is no DEV pill, titles are "*Page* — bookvie" as before, and no amber appears anywhere on the page.

**Given** a dev server whose `app-info` hasn't loaded yet, or never loads
**When** the shell renders
**Then** the header and title look like production and nothing says anything failed
**And** after a successful load, a refetch that fails keeps the pill and the `DEV · ` prefix (UX-DR72).

**Given** `forced-colors: active` on a dev server
**When** the pill renders
**Then** it is `Canvas` with `CanvasText` text and a 1px `CanvasText` border.

**Given** the dev amber values
**When** they are written
**Then** they live as literals in the favicon files and the pill's CSS Module, not in `tokens.css`, and `app-shell.spec.ts`'s token comparison passes unchanged (UX-DR66).

**Given** the README
**When** Oleg reads Development and Options
**Then** they say `bookvie --dev --no-browser` uses `~/bookvie-data-dev` on port 8766 and refuses the real library, `npm run dev` proxies to 8766, and the "stop any normal `bookvie` first" line is gone.

### Story 11.3: Show the version on the Backup page

As Oleg,
I want the Backup page to say which version is running and which folder it keeps my library in,
So that I can check I'm looking at the right copy before I export or restore.

**Requirements:** FR-27 (About this copy), UX-DR71, UX-DR72

**Acceptance Criteria:**

**Given** a production server with `app-info` loaded
**When** I open Backup
**Then** a third `surface` card follows Export and Restore, in the same frame: a `section` labelled by its `h2` "About this copy" (shown uppercase in `section-label`/`ink-tertiary`), then "bookvie 1.1.0" and "Data folder: ~/bookvie-data" on two lines in `body-sm`/`ink-secondary`, sans, with the version and folder taken from `app-info`
**And** no commit and no "Development server" appear.

**Given** a dev server with a commit
**When** I open Backup
**Then** line 1 reads "bookvie 1.1.0 (a1b2c3d) · Development server", with " · " as text (space, middle dot, space), and line 2 "Data folder: ~/bookvie-data-dev" (or the folder given)
**And** with `commit: null`, line 1 reads "bookvie 1.1.0 · Development server", with no brackets.

**Given** a data folder outside the home folder, such as an e2e temp folder
**When** the card renders
**Then** the folder shows as the full absolute path the server sends, wrapping anywhere inside the card (`overflow-wrap: anywhere`) and never cut short.

**Given** `app-info` not loaded yet, or failing
**When** I open Backup
**Then** the card is left out silently, nothing says it failed, and Export and Restore work as before
**And** a refetch that fails after a success keeps the card as it was.

**Given** the card
**When** a screen reader or keyboard user reaches it
**Then** it is plain read-only text, with no copy button and no Tab stop, and the page's headings run `h1` "Backup" then `h2` "About this copy"
**And** the axe check for Backup passes in light and dark.

**Given** the existing Backup e2e specs
**When** they run
**Then** they pass unchanged.

### Story 11.4: Tell me when a tab is older than the app

As Oleg,
I want an open tab to tell me when bookvie has been updated under it,
So that I reload when it suits me instead of remembering to hard-reload every tab after an install.

**Requirements:** FR-27 (update notice), AR32, AR34, UX-DR69, UX-DR70, UX-DR72

**Acceptance Criteria:**

**Given** the build
**When** the bundle is made
**Then** it bakes its own version from `frontend/package.json` through a Vite `define`, declared so `tsc -b` knows its type
**And** a test in `npm run check` fails unless `bookvie.__version__`, `backend/pyproject.toml`, `package.json` and `frontend/package.json` hold the same version (AR34).

**Given** a tab whose baked version equals `app-info.version`
**When** any page renders, and after any refetch
**Then** no update notice shows and nothing is announced.

**Given** a tab whose baked version differs from `app-info.version`, newer or older
**When** `app-info` loads or refetches (also on window focus)
**Then** a full-width `surface` band appears directly under the top nav with a `line` hairline at the bottom: "bookvie was updated to *X*. Reload to use it." in `body-sm`/`ink`, where *X* is the server's version, then **Reload** as a compact 30px `button-secondary` `spacing.4` after the sentence
**And** it has no icon, no close button, no amber and no accent fill; it pushes the page down and never overlaps content (UX-DR69).

**Given** the notice is showing
**When** I go to another route, or keep using the tab
**Then** the notice stays on every route until the tab reloads, nothing is blocked, and saving a page or a card note still works
**And** it is not a dialog, not an `alert`, and not itself a live region.

**Given** the notice
**When** I press **Reload** (click, Enter or Space)
**Then** the page reloads at once, without asking.

**Given** the notice first appears in a tab
**When** it is set
**Then** the polite `status` region announces its sentence once, after the usual tick
**And** a refetch that finds the same server version announces nothing
**And** a later, different server version updates the sentence and announces the new one once
**And** a refetch that finds the bundle's own version again hides the notice (UX-DR70).

**Given** another message is pending in the `status` tick, or a later message or an opening panel or dialog empties the regions within it (for example a save whose own refetch finds the new version)
**When** the notice appears
**Then** its sentence is not announced, the band and **Reload** stay, and a refetch that finds the same version does not retry the announcement (UX-DR70).

**Given** a tab with no notice
**When** the `app-info` refetch fails (for example while bookvie restarts)
**Then** no notice appears and nothing complains; with the notice showing, a failed refetch leaves it showing (UX-DR72).

**Given** the notice is showing
**When** a keyboard user tabs from the top
**Then** **Reload** is reached after the theme toggle and before the page's content; "Skip to content" skips it; the notice sits inside the `header` landmark, after the top bar.

**Given** `forced-colors: active`
**When** the notice renders
**Then** its bottom border is `CanvasText` and **Reload** takes the system button colors.

**Given** the README
**When** Oleg reads Updating
**Then** the "hard-reload open tabs" instruction is replaced by a line saying open tabs show a notice with Reload.

## Epic 12: Talk to bookvie from Claude Code

Claude Code connects to the running bookvie at `/mcp`, the real app and a development server each through their own entry. An agent finds a Book without guessing, reads the library, records reading and Card notes, adds and edits Books with a cover fetched from its web address, and writes a dated backup to disk, under the same rules as the UI and with no way to delete or restore anything. The two bookvie skills move onto the tools.

**Gate:** per-epic quality gates (TR7); the plan's P0 risks green (cross-origin refused on `/mcp`; mounted in production and `--dev`, the dev one on the dev data folder; same handler per write tool, errors included; no destructive tools; `find_book` candidates; the cover downloader's refusals, all against local fakes with no network; `export_backup` into a temporary `HOME`); every tool's registered description equals its story's AC text; existing pytest and e2e pass unchanged; `~/bookvie-data` and the real backup folders untouched by `npm run check`. Plan: `mcp-server-plan-2026-11-19.md`; spine AD-21.

**Tool descriptions (all stories).** Each tool's registered description is the exact text its story quotes under "Description:". A test in each story fails unless the registered text equals it. Changing a description is a change to `epics.md` first.

### Story 12.1: Mount the MCP server

As Oleg,
I want Claude Code to connect to the bookvie that's already running,
So that an agent can reach my library with nothing extra to start.

**Requirements:** FR-28, AR35, AR37, AR38, AR43

**Acceptance Criteria:**

**Given** `backend/pyproject.toml`
**When** this story lands
**Then** `mcp` and `httpx2` are runtime dependencies pinned to the versions current on the day (checked on PyPI and recorded in the spec), `httpx` stays dev-only, and `uv.lock` is updated.

**Given** a production server and a `--dev` server
**When** an MCP client connects to `http://127.0.0.1:<port>/mcp`
**Then** it initializes and lists tools on both, with no `/mcp/mcp` path and no redirect to `/mcp/`
**And** `create_app` builds a fresh MCP server each time (two apps in one pytest run both work), the session manager runs in the app's lifespan, the server is stateless with JSON responses, and a server restart needs no new session.

**Given** a request to `/mcp` with a foreign `Origin`, a foreign `Host`, or a `Sec-Fetch-Site` other than `same-origin` or `none`
**When** it arrives
**Then** the AD-16 guard refuses it with 403, as it does `/api`
**And** a request from the loopback address with no `Origin` (as Claude Code sends) is served
**And** the SDK's own Host/Origin check is off, so no refusal is a 421.

**Given** a GET to `/mcp/anything` or `/MCP`
**When** it reaches the server
**Then** the SPA catch-all doesn't answer it with `index.html` (`mcp` is a server prefix)
**And** an `/mcp` body over 1 MB is refused before it is read.

**Given** the tool-registration helper in `agent/`
**When** a tool is declared with an intent or argument model
**Then** its advertised input schema is generated from the model by alias, with no extra properties and `null` left out where the parser refuses it, and the SDK neither validates nor coerces the arguments
**And** the tool body runs in one worker-thread call
**And** a success returns its `OkResponse` (or view) by alias as structured content with the same JSON as text; an `IntentError` returns `isError` with one text content holding the AD-9 `error` object as JSON; any other exception returns `couldnt_save` with "Couldn't save. Your data wasn't changed."
**And** a test-only tool with an argument proves all four: a schema equal to its model's, a `"212"` sent for an integer refused by the model and not coerced, an `IntentError` as the AD-9 object without an "Error executing tool" prefix, and an unexpected exception as `couldnt_save`. The test-only tool isn't registered outside tests.

**Given** the tool list
**When** a client lists tools after this story
**Then** it holds exactly `get_app_info`
**And** `get_app_info` returns the `app-info` view (`version`, `mode`, `dataDir`, `commit`) by alias.
**Description:** "Which bookvie this is: its version, whether it is the real app (production) or a development server (dev), and the library folder it uses. Call it first to check you are talking to the bookvie you mean."

**Given** the pytest suite
**When** a later story writes an agent-tool test
**Then** a shared fixture gives it an MCP client connected to a real app (with its lifespan) on a temporary data folder, and this story's tests use it.

**Given** Claude Code with the `bookvie-dev` entry added while no server runs
**When** Oleg starts `bookvie --dev` after the session has started
**Then** the spec records what Claude Code does (connects on its own, needs `/mcp` reconnect, or needs a new session) and the start step the skills will use, verified by Oleg in a real session.

**Given** the README
**When** Oleg reads its new "Agent tools" section
**Then** it gives `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp` and the same for `bookvie-dev` on `8766`, says bookvie must be running for the tools to appear, and gives the reconnect step this story found.

### Story 12.2: Let an agent read my library

As Oleg,
I want an agent to find my books and read my reading,
So that I can ask it about my library and it never guesses which book I mean.

**Requirements:** FR-28, AR36, AR38, AR40

**Acceptance Criteria:**

**Given** a seeded library with "Designing Data-Intensive Applications" in two editions, and other Books
**When** the agent calls `find_book` with `query` "DDIA", "Designing", "Kleppmann", or an ISBN with or without hyphens
**Then** it returns every matching Book as `{id, title, subtitle, authors, edition, type, role}`, both editions included, each with its own edition and type
**And** a query that matches nothing returns an empty list, not an error, and an empty query is refused as `invalid_fields` on `query`.
**Description:** "Find Books in the library by a free-text query: part of a title or subtitle, an author, an ISBN, or a title's initials such as DDIA. Returns every likely match with its id, edition and type, or an empty list. Never pick a Book for the user: when more than one matches, ask which one, unless only one of them fits the request (update_page and pause work only on the Main book, whose role is main). Every other tool takes the Book's id from here."

**Given** a Book id
**When** the agent calls `get_book` with `bookId`
**Then** it returns the `book` view (the same model as `GET /api/views/book`, by alias)
**And** an unknown id is refused with `book_not_found`, as the route refuses it.
**Description:** "One Book in full: its fields, tags, its role (main for the Main book, upNext, waiting for a paused Book, or null), whether it is a Side read, its Readings, pages left, the user's measured pace, and its Card notes. Takes the Book's id from find_book."

**Given** the library
**When** the agent calls `list_catalog`
**Then** it returns the `catalog` view by alias.
**Description:** "Every Book in the catalog with its title, authors, type, tags, role, current page and percent read. Use it to answer questions across the library, such as which unread Books are about a topic."

**Given** Card notes on several Books
**When** the agent calls `get_card_notes` with no arguments, or with `bookId`
**Then** it returns the `card-notes` view for all Books, or for that Book, by alias
**And** an unknown `bookId` is refused with `book_not_found`.
**Description:** "The user's Card notes (quotes and notes with their pages), for every Book or for one Book's id."

**Given** the library
**When** the agent calls `get_home`
**Then** it returns the `home` view by alias.
**Description:** "What the user is reading now: the Main book with its page and days left, Up next, the paused Books waiting, the Side reads, and when the library was last exported."

**Given** finished Readings
**When** the agent calls `get_stats` with no range, or with `from` and `to` as `YYYY-MM-DD`
**Then** it returns the `stats` view by alias, as `GET /api/views/stats` does for the same range
**And** a half range, a value that isn't a date, or a `to` before `from` is refused with `invalid_fields` on `from` or `to` with the route's copy
**And** that parsing now lives in `views/`, and the route and the tool both use it.
**Description:** "Books and pages finished, overall or for a period given as from and to dates (YYYY-MM-DD, both or neither)."

**Given** `agent/`
**When** the import graph is checked
**Then** `agent/` imports nothing from `http/api`; the views' not-found refusal and the stats range parsing live in `views/`.

### Story 12.3: Let an agent record my reading

As Oleg,
I want to tell an agent "I'm on page 212 of DDIA" and have it saved,
So that I keep my reading up to date without opening the app.

**Requirements:** FR-28, AR36, AR37, AR38, TR8

**Acceptance Criteria:**

**Given** the ten write tools `start_reading`, `update_page`, `finish_reading`, `pause`, `set_up_next`, `edit_purpose`, `add_card_note`, `edit_card_note`, `mark_side_read`, `unmark_side_read`
**When** a client lists them
**Then** each one's input schema equals its intent model's by alias (`bookId`, `page`, `purpose`, `finishedOn`, `purposeFulfilled`, `rating`, `cardNoteId`, `text`), and the tool list holds exactly 12.1's and 12.2's tools plus these ten.

**Given** one parametrized contract test over the ten tools
**When** each case sends the same input through the tool and through `POST /api/intents/<verb>` on two identical seeded libraries
**Then** both give the same stored `library.json` and the same result: the same `ok`, `ids` and `reachedLastPage`, or the same `kind`, `code`, `message` and `fields`
**And** the cases include, per tool where it applies: success; a no-op success (`set_up_next` for the Book already Up next, `mark_side_read` for a Side read, `unmark_side_read` for a Book that isn't one); `book_not_found`; `invalid_fields` with its fields; a wrong JSON type, an unknown key and a missing key refused as the route refuses them; and the state refusals (`not_main_book`, `already_main`, `reading_already_finished`, `main_cannot_be_up_next`, `main_cannot_be_side_read`, `side_reads_full`, `card_note_not_found`)
**And** a filesystem fault at write gives `couldnt_save` and an unchanged `library.json` through the tool too (TR8).

**Given** the descriptions
**When** the tools are registered
**Then** each equals its text below.
- `start_reading` **Description:** "Make a Book the Main book and start or resume its Reading, with an optional one-sentence Purpose. This pauses the current Main book, and it may change Up next. Tell the user what will change and get a yes before you call it. When the Book is a Side read, also send page: the page the user is on."
- `update_page` **Description:** "Save the page the user has reached in the Main book: the page number they are on, from 0 to its page count, not the number of pages read. If the user says how many pages they read, add them to the current page from get_home. Use the Book's id from find_book; never guess a Book from its title. reachedLastPage means the user is at the last page: ask whether to finish the Book."
- `finish_reading` **Description:** "Finish a Book's current Reading, or record a past finish for a Book never read, on finishedOn (YYYY-MM-DD, not in the future). purposeFulfilled is yes, partly or notYet, and rating is 1 to 5; send null for either when the user doesn't say."
- `pause` **Description:** "Pause the Main book at its current page. It becomes Up next, in place of any Book that was Up next."
- `set_up_next` **Description:** "Choose the Book to read next: any Book except the Main book, including a finished one to re-read. It replaces the current Up next, which keeps its state."
- `edit_purpose` **Description:** "Change the Purpose of a Book's current Reading (active or paused): one sentence on what the user needs to be able to do with this Book. null clears it."
- `add_card_note` **Description:** "Add a Card note to a Book: text (a quote or a note, in the user's words; don't rewrite it) and the page or page range where the user found it, such as 212 or 212-214."
- `edit_card_note` **Description:** "Change a Card note's text and page. Takes the Book's id and the Card note's id from get_book or get_card_notes."
- `mark_side_read` **Description:** "Mark a Book as read on the side, next to the Main book. At most 3 Side reads; it doesn't start a Reading."
- `unmark_side_read` **Description:** "Stop reading a Book on the side. Its Readings and page don't change."

**Given** the tool list
**When** a client calls `delete_book`, `delete_card_note`, `restore` or `set_spine_color`
**Then** the call fails as an unknown tool and nothing changes, and a test asserts none of them is listed.

### Story 12.4: Let an agent add and edit a Book

As Oleg,
I want an agent to add a Book, or fix one, with the same checks as the New book panel,
So that cataloging from Claude Code can't create duplicates or half-filled Books.

**Requirements:** FR-28, FR-1, FR-3, AR36, AR37, AR38, AR39, TR8

**Acceptance Criteria:**

**Given** `add_book`
**When** a client lists it
**Then** its input schema equals the `add-book` intent model's by alias (every form key optional, as in the route, and `confirmDuplicate`), with no `coverUrl` yet.
**Description:** "Add a Book to the catalog. Every field is a string. Required: title, pages, authors (separated by semicolons), language, publisher, type (paperback, hardcover or ebook); edition defaults to 1. Optional: subtitle, isbn, year, tags (separated by commas), and finishedOn (YYYY-MM-DD) for a Book the user has already read. A likely duplicate is refused with duplicate_book and the matching Books: show them to the user, and send confirmDuplicate true only if the user says to add it anyway. Returns the new Book's id."

**Given** `edit_book`
**When** a client lists it
**Then** its input schema equals the `edit-book` intent model's by alias, except that every form key is required; only `removeCover` and `confirmDuplicate` are optional.
**Description:** "Replace a Book's fields. This is a whole edit: a field you leave empty is cleared. Call get_book first and send its editForm with bookId, changing only what the user asked for. A finished Book's finishedOn can be changed but not emptied. removeCover true deletes the Book's cover: send it only when the user asks. A changed title, author or ISBN that makes it a likely duplicate is refused like add_book."

**Given** any Book
**When** `get_book` (or `GET /api/views/book`) answers
**Then** it carries `editForm`: the Edit book panel's 13 form fields as the panel prefills them, every one a string (authors joined by "; ", tags by ", ", Finished on from the latest finish date, and Spine color the user's own color or empty, never the curated or cover color), and `edit_book` with that `editForm` and the `bookId` alone commits the Book unchanged.

**Given** a contract test over both tools, as 12.3's
**When** the same input goes through the tool and through the intent route on identical seeded libraries
**Then** the stored result and the result or error are the same, for: success with the new `bookId`; `invalid_fields` with every failing field; `duplicate_book` with its `duplicates`, then success with `confirmDuplicate: true`; `pages_below_current_page`; `book_not_found` on edit; an unchanged edit that still commits; and a filesystem fault giving `couldnt_save` (TR8).

**Given** a Book with a subtitle, ISBN, tags and a chosen spine color
**When** `edit_book` is called with only `bookId` and `title`
**Then** it is refused as invalid arguments naming the missing keys, and the Book is unchanged.

### Story 12.5: Let an agent fetch a Book's cover from its address

As Oleg,
I want an agent to give bookvie a cover's web address and have bookvie fetch it,
So that a cover never has to pass through the conversation, and fetching it can't reach anything on my machine or network.

**Requirements:** FR-28, NFR1, AR21, AR41

**Acceptance Criteria:**

**Given** `add_book` and `edit_book`
**When** a client lists them
**Then** each also takes an optional `coverUrl` (a string), and the schema-equality tests include it.
**Description addition:** both tools' descriptions end with: "coverUrl is the https address of the front cover image; bookvie downloads it. If the download fails, nothing is saved: tell the user why."

**Given** `edit_book` with `removeCover: true` and a `coverUrl`
**When** it is called
**Then** it is refused as the route refuses `removeCover` with a cover file, before any download.

**Given** `edit_book` for a Book that doesn't exist, with a `coverUrl`
**When** it is called
**Then** it is refused with `book_not_found` and nothing is downloaded.

**Given** the downloader's resolver and connection seams, a local TLS fake server and a test resolver
**When** a `coverUrl` points at it
**Then** a JPEG served as `binary/octet-stream` is accepted and stored as the Book's cover through the existing cover path, as an uploaded JPEG would be
**And** these are refused with `invalid_fields` on `coverUrl` and nothing saved: an `http` URL; a host that resolves to a loopback, private, link-local, shared (`100.64.0.0/10`), unspecified or metadata address, including when any one of several records does, and including IPv4-mapped, 6to4, NAT64 and Teredo forms; a redirect from a public host to any of those; a redirect to `http`; a fourth redirect; a body that isn't JPEG, PNG or WebP whatever its `Content-Type`; a download past 30 seconds
**And** a body over 20 MB stops reading at the cap and is refused with `cover_too_large` on `coverUrl`
**And** an image the cover path can't decode is reported on `coverUrl`, not `cover`
**And** the connection goes to the address that was checked, with TLS verified against the hostname, `Accept-Encoding: identity`, and proxy variables ignored
**And** on a refused `add_book` no Book is added; on a refused `edit_book` the Book is unchanged.

**Given** the whole test suite
**When** it runs
**Then** no test opens a connection off the machine.

### Story 12.6: Let an agent back up my library to disk

As Oleg,
I want an agent to write a dated backup file,
So that a backup exists without me clicking Export, ready for a later upload.

**Requirements:** FR-28, FR-22, AR36, AR42, AR43

**Acceptance Criteria:**

**Given** a server on the default `~/bookvie-data`, a `--dev` server on the default `~/bookvie-data-dev`, and a server on any other `--data-dir` (with `HOME` a temporary folder)
**When** `export_backup` is called on 2026-11-19 (fake clock)
**Then** it writes `bookvie-backup-2026-11-19.zip` into `~/bookvie-backups/`, `~/bookvie-backups-dev/`, or `<data folder>-backups/` respectively, creating the folder
**And** returns `{path, size, createdAt}` with the absolute path.
**Description:** "Write a dated backup of the whole library (library.json and covers, the same file as the Backup page's Export) to the backups folder, and return its path, size and time. A second backup on the same day replaces that day's file. It counts as the library's last export."

(Superseded by Story 13.3's description once 13.3 lands.)

**Given** the backup file
**When** it is restored through the existing restore check
**Then** it is accepted and reproduces the library (AD-14 round trip).

**Given** a backup already written today
**When** `export_backup` runs again the same day
**Then** that day's file is replaced, no other file in the folder changes, and no temp file is left behind.

**Given** a successful backup
**When** the `backup` and `home` views are read
**Then** "Last export" is the backup's time; a failed backup leaves it unchanged.

**Given** a read failure while building the zip, or a write failure in the backup folder (filesystem seam)
**When** `export_backup` runs
**Then** it returns `couldnt_export` or `couldnt_save` respectively, the folder holds no partial file, and `lastExportAt` doesn't move.

**Given** pytest and Playwright
**When** `npm run check` runs
**Then** every pytest test has `HOME` set to a temporary folder and every Playwright server gets a temporary `HOME`, and no real `~/bookvie-backups*` folder is created or changed.

### Story 12.7: Summarize a book's notes through the agent tools

As Oleg,
I want `bookvie-notes-summary` to read my notes through the agent tools,
So that it uses the same interface as everything else and needs no HTTP calls.

**Requirements:** FR-28

**Acceptance Criteria:**

**Given** `.claude/skills/bookvie-notes-summary/`
**When** this story lands
**Then** it reads the Book through `find_book`, `get_book` and `get_card_notes` (or `get_home` for the Main book) and makes no `curl` or HTTP call to `/api/views/*` or `/api/intents/*`
**And** it keeps its start step: check `/api/health` and start `bookvie` when it isn't running, then the reconnect step Story 12.1 found
**And** the output (the one-page .docx) is unchanged in content and layout.

**Given** a title that matches two editions
**When** the skill runs
**Then** it asks which one, and never picks one itself.

**Given** a `--dev` server with a seeded Book that has a Purpose and Card notes
**When** Oleg runs the skill in a real Claude Code session
**Then** the summary is produced, and the spec records that run (manual verification).

**Note:** `get_book`'s `readings[]` carries each Reading's `purpose` (`null` when it has none), so a finished Book's Purpose comes from the tools (added in this story; Epic 12 retro item 83).

### Story 12.8: Add a book through the agent tools

As Oleg,
I want `bookvie-new-book` to add books through the agent tools,
So that it checks duplicates with the server's own rule and bookvie fetches the cover itself.

**Requirements:** FR-28, FR-3

**Acceptance Criteria:**

**Given** `.claude/skills/bookvie-new-book/`
**When** this story lands
**Then** it checks for the book with `find_book`, adds it with `add_book` and its `coverUrl`, and verifies it with `get_book`
**And** it no longer downloads the cover itself, and its multipart `add_book.py` post and its duplicate pre-check copy (`check_catalog.py`) are gone, closing that `deferred-work.md` entry
**And** it makes no `curl` or HTTP call to `/api/intents/*`
**And** the `added-by-skill` tag, the `not-finished` and `0-pages` rules, and the terminal report stay as they are.

**Given** `add_book` refuses with `duplicate_book`
**When** the skill gets that result
**Then** it shows the user the matching Books and adds with `confirmDuplicate: true` only on the user's say-so.

**Given** a cover download refused on `coverUrl`
**When** the skill gets that result
**Then** it tells the user why, and offers to add the Book without a cover.

**Given** a `--dev` server
**When** Oleg runs the skill in a real Claude Code session on a book from amazon.com and one from leanpub.com
**Then** both are added with their covers, and the spec records the runs (manual verification).

## Epic 13: Back up to Dropbox every day, and restore through an agent

An agent restores the library from a backup on this computer or in Dropbox, only after showing what the restore will lose and passing two confirmations it can't skip, and it saves a safety copy first. Every morning, with nothing open, the library goes to bookvie's own Dropbox folder: 3 copies, the oldest deleted only after a checked upload, an unchanged library skipped, a development library never uploaded. The Backup page says in words whether auto-backup is Off, Waiting, On, Failing or Stalled. Setup and a fix for each state ship in `docs/dropbox-backup.md`. Restore comes first (Story 13.1), because its second gate is the one part nobody has seen work.

**Gate:** per-epic quality gates (TR7), plus coverage ≥ 90% on `bookvie_dropbox/` and on `agent/`'s restore path; the plan's P0 risks green against fakes (verify then prune, prune scope, same-day rerun, dev refusal, token, skip reports, the auto-backup states at 26 hours either side, gates fail closed, the confirmation shows the truth, safety copy, allowed folders, same handler, `download_backup`, headless can't restore, still banned); every new tool's registered description, in both servers, equals its story's AC text; the guide's commands match the CLI; no test touches the network, the real Keychain, `~/bookvie-data` or a real backups folder; Oleg's manual runs (13.1 gate 2, 13.4 first run, 13.5 install and the headless run awake and after wake, 13.8 restores) recorded in their specs, and a story whose manual AC isn't recorded stays in review (Epic 12 retro item 85). Plan: `dropbox-backup-plan-2026-11-21.md` (where it differs, spine AD-22 wins); spine AD-22.

**Before Story 13.1:** plan step 0, the spine reconciliation of any unresolved "spine drift" entry in `deferred-work.md` (AGENTS.md → Architecture spine).

**If gate 2 fails in Story 13.1:** when Claude Code's terminal CLI can't show bookvie's question, Stories 13.7 and 13.8 stop for Oleg's decision; 13.2–13.6 go on.

**Tool descriptions (all stories).** As in Epic 12: each new tool's registered description, in `bookvie` and in `bookvie-dropbox`, is the exact text its story quotes under "Description:", and a test under `backend/tests/` fails unless they are equal (the `bookvie-dropbox` test reads the tool list through its stdio server; nothing in `bookvie_dropbox` reads this file). Changing a description is a change to `epics.md` first.

### Story 13.1: Restore my library through an agent, with two confirmations

As Oleg,
I want an agent to restore a backup only after I've seen what I'd lose and said yes twice,
So that a bad afternoon can be undone from Claude Code, and no agent can wipe my library by itself.

**Requirements:** FR-30, FR-28, FR-23, NFR5, AR36, AR38, AR45, AR48, AR55, AR56, AR57, AR59, AR61, UX-DR80, TR8

**Acceptance Criteria:**

**Given** a server's backups folder (AD-21) holding daily backups, safety copies and files in `from-dropbox/`, and other files
**When** the agent calls `list_local_backups`
**Then** it returns the daily backups (names matching `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$` with a valid calendar date), the safety copies (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`, with or without a `-2`, `-3`… suffix) and the `from-dropbox/` daily backups, newest first by backup time, each as `{path, kind, backupTime, size, contentHash}` with `kind` `daily`, `safety` or `from_dropbox`, `backupTime` ISO-8601 with an offset, and `contentHash` the Dropbox content hash (SHA-256 over the SHA-256 of each 4 MiB block, stdlib only)
**And** a file whose name matches neither pattern, a `.tmp*` file, a folder or a symlink is never listed
**And** with no backups folder, or an empty one, it returns an empty list.
**Description:** "The backups on this computer that a restore can use, newest first: the daily backups, the safety copies saved before a restore, and the backups downloaded from Dropbox. Each has its path, its kind (daily, safety or from_dropbox), the time the backup was made, its size and its Dropbox content hash. Show them to the user and let the user pick; never pick one yourself."

**Given** the export zip
**When** `build_export` writes it (fake clock)
**Then** its `library.json` entry is stamped with the same `clock.now()` that names the daily backup and gives `createdAt`, and `list_local_backups` reads `backupTime` from that entry (an older zip's entry time is read as local time).

**Given** a backup from yesterday and a current library with 3 Books and 18 Card notes added since, and other edits
**When** the agent calls `preview_restore` with its path
**Then** it returns the backup's time and counts (Books, Card notes, covers), the current library's counts, the titles of the Books whose ids are in the current library and not in the backup, and the number of Card notes (on any Book) whose ids are in the current library and not in the backup
**And** `library.json`, `covers/` and the backups folder are unchanged
**And** a damaged, unsafe or newer archive is refused with the restore intent's code (`restore_invalid`, `restore_unsafe`, `restore_newer_version`) and fields.
**Description:** "Check a backup from list_local_backups without changing anything, and say what restoring it would lose: the backup's time and counts, the current library's counts, the titles of the Books added since and the number of Card notes added since. Show this to the user before you ask about restoring. A file bookvie can't restore is refused with the same reason as the Backup page."

**Given** a `path` outside the backups folder and its `from-dropbox/`, one with `..`, a symlink pointing out of the folder, a folder, or a file whose name is neither a daily name nor a safety-copy name
**When** `preview_restore` or `restore_backup` is called with it
**Then** it is refused with 422 `restore_outside_backups` (no `fields`) before the file is opened, and nothing changes.

**Given** a client connected with MCP 2026-07-28 and form elicitation
**When** the agent calls `restore_backup` with a path and no input responses
**Then** bookvie computes the preview and returns an `InputRequiredResult` with one form elicitation, whose message is UX-DR80's confirmation text for that exact file and library (the counts and up to 5 titles from the preview, then "and N more"; the "nothing added" variant when nothing was added), plain text with no markdown
**And** its `requestState` is sealed by hand (HMAC-SHA256 with a per-process key, a process nonce, a single-use nonce, the resolved path, the archive's SHA-256, the current `library.json`'s SHA-256, and an expiry 5 minutes ahead); the SDK's `RequestStateBoundary` isn't installed
**And** nothing has changed yet.
**Description:** "Replace the whole library with a backup from list_local_backups. Call it only when the user has asked for this restore and said yes to its preview_restore summary; never on your own initiative, and never again after a refusal unless the user asks. bookvie then asks the user directly to confirm; anything but an explicit yes is restore_not_confirmed and nothing changes. Before replacing anything it saves a safety copy of the current library and returns its path."

**Given** the MCP test client answering bookvie's question
**When** it declines, cancels, sends a tampered `requestState`, reuses one already used, sends it after 5 minutes (fake clock) or after a server restart, sends it with a `path` that resolves elsewhere, or answers after the library or the archive changed
**Then** each is 409 `restore_not_confirmed` with `reason` `declined`, `cancelled`, `changed`, `changed`, `expired`, `expired`, `changed`, `changed` respectively, and `library.json`, `covers/`, `local-state.json` and the backups folder are byte-identical to before
**And** a client below MCP 2026-07-28, or one whose capabilities lack form elicitation, is `restore_not_confirmed` with `reason` `unsupported` before any preview is built (an empty `elicitation` object counts as form)
**And** only an explicit accept on a valid token goes on.

**Given** an accepted confirmation
**When** `restore_backup` applies
**Then** in one hold of the store lock it reads the file once into the staging spool and checks its SHA-256 against the sealed hash (`changed` otherwise), stages and validates it (a refusal writes nothing), writes the safety copy `bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip` (fake clock; `-2`, `-3`… when taken) into the backups folder with `write_export_zip` and the atomic file write, then runs `apply_staged` in the AD-12 order
**And** it returns `{restoredFrom, backupTime, safetyCopy}`, and restoring that safety copy the same way gives back the library as it was before
**And** the safety copy never replaces a `bookvie-backup-*.zip` (today's included), `lastExportAt` doesn't move, and `local-state.json` is byte-identical
**And** a test with a timeout proves `restore_backup` finishes (the store lock isn't reentrant: `write_export_zip`, `stage_and_validate` and `apply_staged` are lock-free cores that `build_export` and `restore()` now wrap).

**Given** a failure writing the safety copy (filesystem seam)
**When** `restore_backup` applies
**Then** it is 503 `safety_copy_failed` (kind `couldnt_save`), no partial safety copy is left, and the library isn't restored.

**Given** one contract test
**When** the same archive goes through `restore_backup` (accepted) and through `POST /api/intents/restore` on two identical seeded libraries
**Then** both give the same restored `library.json` and `covers/`, and every refusal the route gives has the same `kind`, `code`, `message` and `fields` through the tool
**And** `POST /api/intents/restore` and the Backup page's restore are unchanged (no safety copy, no new gate)
**And** a filesystem fault at write gives `couldnt_save` and an unchanged `library.json` through the tool too (TR8).

**Given** the tool list
**When** a client lists tools after this story
**Then** it holds exactly Epic 12's tools plus `list_local_backups`, `preview_restore` and `restore_backup` (`AGENT_TOOL_NAMES`)
**And** `delete_book`, `delete_card_note`, `set_spine_color` and `restore` are still unknown tools
**And** each new error code (`restore_outside_backups`, `restore_not_confirmed` with each `reason`, `safety_copy_failed`) has a test.

**Given** a `--dev` server with a seeded library and a backup in `~/bookvie-backups-dev/`
**When** Oleg, in a real Claude Code terminal session with the `ask` rule in place, asks for a restore and calls `restore_backup` once accepting, once declining bookvie's question, and once declining Claude Code's permission prompt
**Then** the accept restores and names the safety copy, both declines change nothing, and the spec records the runs, the message as shown, and what VS Code and `claude -p` do with the same call (manual verification). If bookvie's question can't be shown in the terminal CLI, the story stops for Oleg's decision (see the epic's gate).

**Given** `docs/dropbox-backup.md` (new) and the README
**When** Oleg reads them
**Then** the guide's Restoring section gives the `ask` rule for `~/.claude/settings.json` (`permissions.ask` for `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup`) and how to check it's active, what the two prompts look like, where the safety copy goes and how to restore it to undo a restore, and one troubleshooting entry each for `restore_not_confirmed` (declined, or a client that can't ask: use the Claude Code terminal, not VS Code or `claude -p`), a refused archive (each refusal code in plain words), a failed safety copy and a path outside the backups folder
**And** the README's Agent tools section gets a short "Daily backup to Dropbox, and restore" paragraph linking to the guide.

### Story 13.2: Upload a backup to my Dropbox

As Oleg,
I want a small Dropbox server of my own that uploads a backup and keeps the last 3,
So that a copy of my library lives off this computer, and a bad upload never costs me one.

**Requirements:** FR-29, NFR1, NFR5, AR44, AR45, AR46, AR47, AR60, AR61

**Acceptance Criteria:**

**Given** `backend/pyproject.toml`
**When** this story lands
**Then** `dropbox` and `keyring` are runtime dependencies pinned to the versions current on the day (checked on PyPI and recorded in the spec), the wheel's packages are `["bookvie", "bookvie_dropbox"]`, the console script `bookvie-dropbox` exists, `uv.lock` is updated, and the install smoke test checks that `bookvie-dropbox --help` runs from the installed tool.

**Given** `backend/tests/test_layers.py`
**When** the import graph is checked
**Then** nothing under `bookvie/` imports `bookvie_dropbox`, `dropbox` or `keyring`, and nothing under `bookvie_dropbox/` imports `bookvie`.

**Given** the copied contracts
**When** a test compares the two sides
**Then** `bookvie_dropbox`'s daily-name regex, its folders (`~/bookvie-backups`, `~/bookvie-backups-dev`, `from-dropbox`) and its content hash equal bookvie's (Story 13.1), and the content hash matches Dropbox's published test vector.

**Given** `bookvie-dropbox auth`
**When** it runs (against a fake OAuth server)
**Then** it runs OAuth with PKCE (the app key a constant, no secret) through a loopback redirect on the fixed registered port, opens the browser, and stores the refresh token only in the Keychain through `keyring` (service `bookvie-dropbox`, account `refresh-token`), replacing an old one
**And** no token is printed, logged, or written to any file.

**Given** the stdio server (`bookvie-dropbox serve`) with a fake `DropboxApi`
**When** a client lists tools
**Then** it holds exactly `upload_backup`.
**Description:** "Upload a daily backup from ~/bookvie-backups (the path export_backup returned) to bookvie's Dropbox folder, check that Dropbox's copy matches the file, and only then delete the oldest daily backups beyond 3. A failed or mismatched upload deletes nothing and returns its cause. Returns the uploaded name, the number of copies, the names deleted and the content hash; pass them to record_backup_upload."

**Given** a regular file with a daily name directly in the resolved `~/bookvie-backups/`, and 3 older daily backups in `/Apps/bookvie/.backups/`
**When** `upload_backup` is called with its path
**Then** it uploads through a chunked upload session finished directly to the final name with `WriteMode.overwrite`, the whole file's `content_hash` and `client_modified` set to the backup time in UTC (read from the zip's `library.json` entry)
**And** it checks the returned `size` and `content_hash`, then deletes exactly the oldest daily backup by the date parsed from the name (not string order, not upload time), never the name it just wrote
**And** it returns `{name, copies, deleted, contentHash}` with `copies` 3.

**Given** fewer than 3 daily backups in Dropbox, or files in `.backups` that don't match the daily name
**When** an upload succeeds
**Then** nothing is deleted while there are at most 3, and a non-matching file is never deleted or counted.

**Given** a fake Dropbox that refuses the hash, fails a chunk, times out, or returns a size or hash that doesn't match
**When** `upload_backup` runs
**Then** it deletes nothing and returns cause `upload_incomplete`; an insufficient-space error is `dropbox_full`; a refused refresh or a Keychain read that fails or is denied is `dropbox_signin` with a message naming `bookvie-dropbox auth`; anything else is `other`.

**Given** today's backup already in Dropbox
**When** a second upload of today's file runs the same day
**Then** that day's copy is replaced only once the new one verifies; a failed second upload leaves the first in place.

**Given** a path in `~/bookvie-backups-dev/`, a `from-dropbox/` file, a safety copy, a path outside `~/bookvie-backups/`, `..`, a symlink out, or a missing file
**When** `upload_backup` is called with it
**Then** it is refused before any network call, and nothing in Dropbox changes.

**Given** a file over 150 MB (sparse, in a temporary `HOME`)
**When** it is uploaded to the fake
**Then** it goes through more than one chunk and verifies.

**Given** an expired access token
**When** a tool call needs Dropbox
**Then** the SDK refreshes it from the Keychain's refresh token, and the call succeeds.

**Given** the guide and the README
**When** Oleg follows them from scratch
**Then** `docs/dropbox-backup.md` gives the setup in order: registering the Dropbox app (App folder access, the name that makes the folder `/Apps/bookvie/`, the scopes it needs, the redirect URI), `bookvie-dropbox auth`, adding both MCP servers with `--scope user` (the exact `claude mcp add` line for `bookvie-dropbox` with the command's absolute path) and checking them with `claude mcp list`
**And** troubleshooting for an expired sign-in and for an MCP server shown as failed (bookvie not running or started after the session, a moved command path, `uv` not found)
**And** a pytest parses the guide's code blocks and checks every `bookvie` and `bookvie-dropbox` subcommand and flag shown against the CLI.

### Story 13.3: Record each upload in bookvie

As Oleg,
I want bookvie to know when the last upload happened and how it went,
So that the Backup page can tell me, and an unchanged library isn't uploaded again.

**Requirements:** FR-29, FR-28, FR-22, AR8, AR42, AR45, AR47, AR48, AR49, AR50, TR8

**Acceptance Criteria:**

**Given** `export_backup` with `forUpload: true`
**When** it writes the day's backup
**Then** `lastExportAt` doesn't move, and "Last export" on Backup and Home is unchanged
**And** without `forUpload`, or with `false`, it records `lastExportAt` as before
**And** both return `libraryHash` (the SHA-256 of the zip's `library.json` bytes) and `unchangedSinceUpload` (true exactly when it equals `autoBackup.lastUpload.libraryHash`).
**Description:** (replaces Story 12.6's, and the description test reads this one) "Write a dated backup of the whole library (library.json and covers, the same file as the Backup page's Export) to the backups folder, and return its path, size, time, libraryHash and unchangedSinceUpload. A second backup on the same day replaces that day's file. It counts as the library's last export, except when forUpload is true, which only the daily backup run sends."

**Given** the tool list
**When** a client lists tools after this story
**Then** it holds Story 13.1's tools plus `record_backup_upload`.
**Description:** "Record how a daily backup run ended, so the Backup page can show it: uploaded (with the path from export_backup, and copies and contentHash from upload_backup), skipped (when export_backup said unchangedSinceUpload), or failed (with its cause). Call it once at the end of every run, for a skip or a failure too."

**Given** `record_backup_upload({outcome: "uploaded", path, copies, contentHash})`
**When** `path` is a daily backup in this server's backups folder whose Dropbox content hash equals `contentHash`
**Then** bookvie stores `lastReport`, `lastOk` and `lastUpload` (`at` from the `Clock`, `backupAt` from the zip, `name`, `copies`, and the `libraryHash` bookvie computes from that zip) in `local-state.json` under `autoBackup`
**And** a hash that doesn't match, a path outside the backups folder or not a daily name, or a missing `copies` is `invalid_fields` on that argument, and nothing is stored.

**Given** `outcome: "skipped"` (no other argument), or `outcome: "failed"` with a `cause`
**When** it is recorded
**Then** a skip replaces `lastReport` and `lastOk`, a failure only `lastReport` (with its `cause`), and `lastUpload` stays as it was
**And** a `cause` outside `dropbox_signin`, `upload_incomplete`, `dropbox_full`, `backup_write`, `other`, a failure without one, or an unknown `outcome` is `invalid_fields`.

**Given** the cause enum
**When** a test compares the two sides
**Then** bookvie's equals `bookvie_dropbox`'s (Story 13.2).

**Given** `store/local_state`
**When** an upload, an export, then an upload are recorded
**Then** `lastExportAt` and `autoBackup` both survive each write: one writer under its own `threading.Lock` (not the AD-4 lock) read-modify-writes only the group it changes, `Store.record_export` calls it, and `local_state_bytes` is gone
**And** a malformed `local-state.json` is replaced with the written group alone and the loss is logged
**And** a write failure (filesystem seam) is `couldnt_save` for `record_backup_upload` and leaves the file as it was
**And** an export file and a restore (Story 13.1 and the route) never touch `autoBackup`.

**Given** a data folder that isn't one of the two defaults but whose sibling rule would give `~/bookvie-backups` or `~/bookvie-backups-dev` (for example `~/bookvie`)
**When** the server starts
**Then** it has no backups folder (`backups_dir` is `None`), `export_backup` is `couldnt_save` with no file written, and `list_local_backups` is empty; only `~/bookvie-data` writes into `~/bookvie-backups`.

### Story 13.4: Back up to Dropbox with one skill

As Oleg,
I want one skill that exports, uploads only when something changed, and records what happened,
So that a backup run is the same every time, whether I start it or the morning job does.

**Requirements:** FR-29, AR49, AR51, AR61, UX-DR82

**Acceptance Criteria:**

**Given** `.claude/skills/bookvie-backup/SKILL.md` (new)
**When** it runs
**Then** it checks bookvie with `get_app_info`, then calls `export_backup({forUpload: true})`; unless `unchangedSinceUpload`, it calls `upload_backup` with the returned path; and it always ends with one `record_backup_upload`: `uploaded` with the upload's `copies` and `contentHash`, `skipped`, or `failed` with the cause (`backup_write` when `export_backup` failed, the upload's cause otherwise)
**And** it uses only `mcp__bookvie__` and `mcp__bookvie-dropbox__` tools: no Bash, no `curl`, no other tool, and its frontmatter lists exactly those tools.

**Given** a `--dev` server (`get_app_info` says `mode: "dev"`)
**When** the skill runs against it
**Then** it uploads nothing, records nothing, and says that a development library is never uploaded.

**Given** each outcome
**When** the run ends
**Then** the skill reports it in one line in UX-DR82's words ("Uploaded *name* · N copies in Dropbox, deleted *name*", "Nothing new since the last upload; skipped.", "Failed: *reason and fix*").

**Given** an interactive session with bookvie not running
**When** Oleg runs `/bookvie-backup`
**Then** the skill starts bookvie as the other skills do (step 1) and goes on.

**Given** the real library, the real Dropbox app and the guide's setup followed from scratch
**When** Oleg runs `/bookvie-backup` by hand twice, the second time with no change in between
**Then** the first uploads and the second skips, and the spec records both runs and the guide's corrections (manual verification).

**Given** the guide and the README
**When** this story lands
**Then** `docs/dropbox-backup.md` has the first manual run, "How it works" (09:00 launchd, headless `claude -p`, export, verify then prune, keep 3, skip when unchanged, `--dev` never uploads), troubleshooting for a failed or mismatched upload (nothing deleted; rerun; what to check in Dropbox), and a line that a Dropbox backup can always be restored by hand: download it from `~/Dropbox/Apps/bookvie/.backups/` and use the Backup page's Restore
**And** README → AI skills lists `bookvie-backup`.

### Story 13.5: Run the backup every morning

As Oleg,
I want a launchd job that runs the backup at 09:00, even after the Mac slept,
So that I never have to remember it.

**Requirements:** FR-29, FR-30 (never unattended), AR21, AR52, AR53, AR54, AR61

**Acceptance Criteria:**

**Given** `bookvie autobackup install`, run in the main checkout (the folder holding `.claude/skills/bookvie-backup/SKILL.md`)
**When** it runs (with `launchctl` behind a seam in tests)
**Then** it writes `~/Library/LaunchAgents/<label>.plist` (the label one constant, shared with the probe) and loads it with `launchctl bootstrap`
**And** the plist runs `bookvie autobackup run` by absolute path at 09:00 (`StartCalendarInterval`), sets `WorkingDirectory` to the checkout, sets `PATH` to include the folders of the resolved `bookvie`, `bookvie-dropbox` and `claude`, and sends output to `~/Library/Logs/bookvie/autobackup.log` and `autobackup.err.log`
**And** installing over an existing job replaces it, resolves every path again and reloads it.

**Given** a linked git worktree, a folder without the skill, `--dev`, or a `claude`, `bookvie` or `bookvie-dropbox` that can't be found
**When** `install` runs
**Then** it refuses with a message naming the cause and writes nothing.

**Given** `bookvie autobackup uninstall`
**When** it runs
**Then** it unloads the job with `launchctl bootout` and removes the plist; with no job installed it says so and succeeds.

**Given** `bookvie autobackup run`
**When** `/api/health` doesn't answer
**Then** it starts `bookvie --no-browser`, waits for health, runs the resolved `claude -p "/bookvie-backup"` with `--allowedTools` and `--disallowedTools`, stops the server with SIGTERM only because it started it, and exits with `claude`'s status
**And** when bookvie is already running, it leaves it running.

**Given** the generated plist and the `claude` arguments
**When** a test reads them
**Then** `--allowedTools` is the one constant in `cli.py`, holds MCP tool names only (never `Bash` in any form) and equals the tools in `bookvie-backup`'s frontmatter
**And** `--disallowedTools` names `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup`.

**Given** `views/backup` on the server whose backups folder is `~/bookvie-backups`
**When** it is read
**Then** it carries whether the job is installed, from `create_app`'s `launchd_probe` seam: only the exit status of `launchctl print gui/<uid>/<label>` with a short timeout; any error, a timeout, or a system that isn't macOS reads as not installed
**And** a `--dev` server, or a server on another library, never runs the probe.

**Given** the real Mac
**When** Oleg installs the job by following the guide, then lets it run at 09:00 once with the Mac awake and once after waking it from sleep
**Then** both runs back up with no permission prompt, and the spec records them and the log lines (manual verification).

**Given** the guide
**When** this story lands
**Then** `docs/dropbox-backup.md` has install, uninstall (with `claude mcp remove`, deleting the Keychain item and revoking the app in Dropbox), the log location, running the job now with `launchctl kickstart`, and the launchd troubleshooting entries: `claude` not found on launchd's `PATH` after a reinstall or move, a tool missing from `--allowedTools`, Claude Code signed out, a moved checkout (install again), and a Mac asleep at 09:00 (runs on wake)
**And** the docs pytest covers the new commands.

### Story 13.6: See on the Backup page whether auto-backup works

As Oleg,
I want the Backup page to tell me in words whether the daily backup is working,
So that I notice a broken backup in a day, not when I need it.

**Requirements:** FR-29, AR6, AR54, AR61, UX-DR73, UX-DR74, UX-DR75, UX-DR76, UX-DR77

**Acceptance Criteria:**

**Given** `views/backup`
**When** it is read
**Then** it carries `autoBackup: {state, offReason, reportAt, lastOkAt, lastUploadAt, copies, cause}` (Pydantic, then `api:gen`), with `state` one of `off`, `waiting`, `on`, `failing`, `stalled`, computed on the server from the probe and `local-state.json` with EXPERIENCE.md's first-match order and `lastUploadAt` the upload's `backupAt`
**And** `off` with `offReason` `dev` on a `--dev` server, `other_library` unless this server's backups folder is `~/bookvie-backups`, and `not_installed` when the probe says so
**And** missing or unreadable upload state reads as no report.

**Given** an installed job and a report (fake clock)
**When** the report is 25 h 59 min old, exactly 26 h old, 26 h 1 min old, or in the future
**Then** an upload or skip is `on`, `on`, `stalled`, `on`, and a failure is `failing`, `failing`, `stalled`, `failing`; no report is `waiting` however long it has been.

**Given** each state, seeded through `local-state.json` and a stubbed probe (test-only, never on in production)
**When** the Backup page renders
**Then** the Export card shows one line directly under "Last export", in UX-DR75's words: "Auto-backup: Off · never on a development server", "Auto-backup: Off · not set up on this computer" (not installed or another library), "Auto-backup: Waiting · first backup at 09:00", "Auto-backup: On · last upload today at 09:02 · 3 copies in Dropbox", "Auto-backup: On · checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox", "Auto-backup: Failing · *reason* Last upload on 19 Nov.", "Auto-backup: Stalled · no backup since yesterday at 09:02", and "Auto-backup: Stalled · no backup since it was set up"
**And** each `cause` shows its UX-DR77 sentence
**And** "when" follows UX-DR76 ("today at 09:02", "yesterday at 09:02", "on 19 Nov", "19 Nov 2025" outside the current year) and recomputes on focus; copies read "1 copy", "2 copies", "3 copies".

**Given** the line
**When** it is inspected
**Then** it is `meta` text, `ink-tertiary` for Off, Waiting and On and `ink` for Failing and Stalled, with no dot, icon, badge shape, tint or color, and a command in a reason in the body font (UX-DR73)
**And** it is plain text: not a control, link, Tab stop or live region, and a change found by the refetch on focus isn't announced (UX-DR74)
**And** it never appears on Home
**And** axe passes in both themes.

**Given** a manual **Export all data**
**When** it finishes
**Then** "Last export" moves and the line doesn't; a recorded upload moves the line and not "Last export"; a restore moves neither.

**Given** the guide
**When** this story lands
**Then** `docs/dropbox-backup.md` has one troubleshooting entry per state and per Failing reason, each quoting the line's exact words, and the docs pytest fails unless every state and cause has its entry.

### Story 13.7: Fetch a backup from my Dropbox

As Oleg,
I want an agent to list my Dropbox backups and download one,
So that I can restore from a copy that isn't on this computer anymore.

**Requirements:** FR-30, AR45, AR47, AR55

**Acceptance Criteria:**

**Given** the stdio server
**When** a client lists tools after this story
**Then** it holds exactly `upload_backup`, `list_backups` and `download_backup`, and still no tool that deletes, moves or reads outside `/Apps/bookvie/.backups/`.

**Given** daily backups and other files in `.backups` (fake Dropbox)
**When** the agent calls `list_backups`
**Then** it returns only the daily backups, newest first, each as `{name, backupTime, size, contentHash}`, with `backupTime` from the file's `client_modified` as ISO-8601 with an offset.
**Description:** "The daily backups in bookvie's Dropbox folder, newest first, each with its name, the time the backup was made, its size and its Dropbox content hash. A backup with the same content hash as one from list_local_backups is the same backup."

**Given** a daily name from `list_backups` and `target` `bookvie` or `bookvie-dev`
**When** the agent calls `download_backup`
**Then** it downloads into `~/bookvie-backups/from-dropbox/` or `~/bookvie-backups-dev/from-dropbox/` (creating it), through a temporary file, fsync and rename, only once the file's content hash matches Dropbox's, and returns the local path
**And** a same-day name never lands in the backups folder itself, and an existing `from-dropbox/` file of that name is replaced only by a verified download.
**Description:** "Download a daily backup from bookvie's Dropbox folder into this computer's backups, by its name from list_backups. target is bookvie for the real library or bookvie-dev for a development server: use the one you will restore into. The file appears only once it matches Dropbox's copy. Returns the local path; pass it to preview_restore."

**Given** a name that isn't a daily name (a safety-copy name, `..`, a path), or a `target` other than the two
**When** `download_backup` is called
**Then** it is refused before any network call, and no file is written.

**Given** a fake Dropbox that returns other bytes, or breaks the transfer
**When** `download_backup` runs
**Then** it is cause `download_incomplete`, no file and no temporary file are left; a sign-in failure is `dropbox_signin`; anything else is `other`.

**Given** a downloaded file
**When** Story 13.1's `list_local_backups` and `preview_restore` read it
**Then** it is listed as `from_dropbox` with the same `contentHash` as in `list_backups`, and previews like any daily backup.

### Story 13.8: Restore with one skill, from this computer or Dropbox

As Oleg,
I want one skill that shows me every backup, lets me pick, and walks me through the restore,
So that restoring is a conversation I can follow, and it never decides for me.

**Requirements:** FR-30, AR58, AR61, UX-DR78, UX-DR79, UX-DR80, UX-DR81

**Acceptance Criteria:**

**Given** `.claude/skills/bookvie-restore/SKILL.md` (new)
**When** it runs
**Then** it starts bookvie if needed (as the other skills do), calls `list_local_backups` and `list_backups`, and shows UX-DR78's pick list: newest first, one row per content hash (a backup both here and in Dropbox is one row, restored from this computer without a download), the 10 newest then "and N older. Say show all to see them.", and "The newest is 1. Which one?"
**And** it suggests the newest and waits; it never picks
**And** when Dropbox can't be reached it lists this computer's backups and "Couldn't reach Dropbox: *reason*."; with no backups anywhere it says "No backups found on this computer or in Dropbox. Nothing was changed."

**Given** a Dropbox pick
**When** the user picks it
**Then** the skill calls `download_backup` with the target of the bookvie it restores into, then `preview_restore` with the local path.

**Given** the preview
**When** the skill shows it
**Then** it uses UX-DR79's layout and words (the counts, up to 5 titles then "and N more", the "Everything else changed since…" line, the safety-copy line), asks in the chat in its own words, and calls `restore_backup` only after a yes.

**Given** each outcome of `restore_backup` or of the download
**When** the skill reports it
**Then** it uses UX-DR81's words, with paths written with `~`, adds the terminal-CLI advice only for `reason: unsupported`, and never retries a refused or unconfirmed restore by itself.

**Given** a request to work on development
**When** the skill runs
**Then** it uses the `bookvie-dev` tools and `download_backup` with target `bookvie-dev`, and never touches the real library.

**Given** a `--dev` server with real data downloaded into it
**When** Oleg runs the skill in a real Claude Code terminal session: one restore from a local backup, one from Dropbox, one declined in the chat, one declined at Claude Code's permission prompt, one declined at bookvie's question, and an undo from the safety copy
**Then** each behaves as above, and the spec records the runs (manual verification).

**Given** the guide and the README
**When** Oleg follows the Restoring section from scratch
**Then** `docs/dropbox-backup.md` describes the skill step by step, with Dropbox downloads and the manual fallback, and the Dropbox download troubleshooting (sign-in, a download that didn't match)
**And** README → AI skills lists `bookvie-restore`.
