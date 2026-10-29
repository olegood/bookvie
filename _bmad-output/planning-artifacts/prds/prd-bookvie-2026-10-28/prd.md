---
title: bookvie PRD
status: final
created: 2026-10-28
updated: 2026-10-29
inputs:
  - _bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/prd-deltas.md
assumptions: all confirmed by the user on 2026-10-28
---

# PRD: bookvie

## 0. Document Purpose

This PRD is for the builder, who is also the only user, and for the downstream UX, architecture, and epics work. §3 defines the terms the rest of the PRD uses. FR IDs are stable: FR-12 and FR-13 (Day types and the Reading calendar) were retired on 2026-10-28, and new requirements get new numbers. The addendum (`addendum.md`) holds the rules for Later features, the design rationale, and the competitive research.

## 1. Vision

bookvie is a personal, local-first web app that organizes the user's home library and holds the authoritative record of the user's reading. It replaces a paper reading diary. The paper diary can stay on the nightstand as a quick place to jot things down, but the app is the single source of truth for reading progress. The user catches up on the next visit by entering the page reached.

bookvie breaks the urgency chain. An urgent work book interrupts the current one, the context is lost, re-reading feels like no progress, and the paused book is never resumed. bookvie allows exactly one tracked **Main book**, makes every switch a deliberate, visible trade-off, and keeps every paused book in view until the user picks it up again.

Three pillars guide every decision:
- **Visible progress:** Every real reading effort moves something you can see.
- **Conscious reading:** You set a Purpose when you start a book and answer "fulfilled?" when you finish.
- **Simplicity:** Less state means less stress, and removing a state also removes a failure signal. Simplicity beats completeness of history.

Re-reading is welcome and never counts as lost progress.

The Must features (§6.1) deliver Visible progress, Simplicity, and the Purpose. The rest of Conscious reading (the "fulfilled?" prompt at the finish) arrives with the Should features, by design.

## 2. Target User

### 2.1 Jobs To Be Done
- Show me how far I am through the book I'm reading, and through my whole unread library.
- When something urgent interrupts, let me park the current book without losing my place, and keep reminding me of it.
- Don't lose my Readings and Card notes to a dead disk.

### 2.2 Non-Users (v1)
Anyone other than the single user.

### 2.3 Key User Journeys
- **UJ-1. The user catalogs a shelf.** The user points an AI skill at a stack of books. The skill fills the labeled add-book form the way a person would. bookvie warns when a book is a likely duplicate, and by the end of the evening the whole shelf is in the catalog.
- **UJ-2. The user catches up after three busy days.** The user opens bookvie, enters p.212, and presses Update. The gauge jumps to 64%, and "~7 days left" appears next to it.
- **UJ-3. An urgent work book arrives.** The user picks the work book, *X*, as the new Main book. bookvie asks: "Start *X*? This pauses *Y* at p.120 (64%)." The user confirms, and *Y* goes to Up next.
- **UJ-4. The user finishes a book.** The user enters the last page. bookvie asks whether the Purpose was fulfilled and asks for a 1–5 star rating, then counts every page of the Book toward the period it finished in.
- **UJ-5. The user wonders "how long until…".** The user types 30 pages/day into the quick pace calculator in the catalog and sees the unread library finishing in about 9 months.

## 3. Glossary

- **Book**: a catalog entry for one physical or electronic copy the user owns or owned. A Book has zero or more Readings.
- **Reading**: one read-through of a Book. It has its own current page, Purpose, start and finish dates, star rating, the time of its last progress update, and, once paused, the date it was paused. A Book counts as read if any of its Readings is finished.
- **Back-filled Reading**: a finished Reading created from a **Finished on** date (FR-1, FR-14). It has no start date.
- **Main book**: the single Book whose Reading is currently tracked. There is at most one Main book.
- **Side read**: a marker on a Book showing that it's currently being read on the side. It doesn't change the Book's status and doesn't create a Reading.
- **Pause**: puts the active Reading back on the shelf, keeps its current page, and records the date it was paused. Pause also covers interruption by an urgent book.
- **Up next**: the single Book the user has chosen to read next. It can be unread or paused.
- **Waiting for you**: the list of paused Readings, except the Up next Book's.
- **Purpose**: one sentence written when a Reading starts, answering "what do I need to be able to do with this knowledge?"
- **Catch-up**: entering, on a later visit, the current page reached.
- **Bookcase**: a row of Book spines. Unread Books are outlined; read Books show their spine color.
- **Spine color**: a read Book's color on the bookcase. It's the user's choice, else derived from the cover, else taken from a curated palette.
- **Quick pace calculator**: takes a pages/day value and shows an estimated finish date.
- **Measured pace**: total pages of finished Readings divided by the total days from their start dates to their finish dates. Both the start and the finish day count, so a same-day start and finish is 1 day. Back-filled Readings are excluded.
- **Ownership**: *owned*, or *donated* once Donation ships (see addendum).
- **Card note**: a piece of text (a quote or a note) plus the page or page range where the user found it, attached to a Book. It has one side only; it isn't a flash card.

## 4. Features

### 4.1 Catalog and entry *(Must)*
Realizes UJ-1.

#### FR-1: Book fields
The user can create, edit, and delete a Book.
- **Required:** title, pages, at least one author, edition (defaults to 1), language, publisher, and type (paperback, hardcover, or ebook; ebook is the only non-physical type).
- **Optional:** subtitle, ISBN, year (the year of the edition), cover image, spine color, tags, and **Finished on**.
- **Consequences:**
  - bookvie refuses to save while any required field is empty.
  - Pages is always a page count, ebooks included.
  - bookvie displays the edition only when it isn't 1.
  - A Book without a cover shows a "no cover" placeholder.
  - New Books default to Ownership = owned.
  - An empty spine color means automatic: derived from the cover, else taken from a curated palette.
  - An empty **Finished on** means not read. A date (not in the future) creates a back-filled Reading finished on that date. On a Book with an active or paused Reading, it adds a past Reading and leaves the current one untouched.
  - When editing a Book, **Finished on** shows its most recent finish date, and changing it changes that date. Clearing it is refused: a finished Reading can't be un-finished.
  - Tags: many per Book, in a free-text, comma-separated field with suggestions from existing tags. Tags are shown on Book detail.
  - Editing Pages below the current page of an active or paused Reading, or below the highest Card note page, is refused with a message. Finished Readings keep the page count they finished with.
  - Deleting a Book requires confirmation and removes its Readings and Card notes.

#### FR-2: Agent-friendly form
The add-book and edit-book forms expose stable, labeled fields and buttons that can be reached by their labels, so a browser-driven AI skill can fill them exactly as a person would.
- **Consequences:**
  - Every field has a visible label and a stable accessible name. Labels and accessible names don't change between releases without notice.
  - Every outcome of the form (saved, duplicate warning, validation error, couldn't save) is exposed through roles, accessible names, and live-region text, because cataloging runs unattended.
  - After saving, the user can find the new Book by searching for its title.

#### FR-3: Duplicate warning
When a new Book matches an existing one, bookvie warns before saving.
- **Consequences:**
  - A matching ISBN triggers the warning. ISBNs are compared after removing hyphens and spaces and converting ISBN-10 to ISBN-13.
  - When either Book has no ISBN, a matching title plus at least one shared author triggers the warning. The title comparison ignores case and extra whitespace. Authors are compared as a set of semicolon-separated names, ignoring case and surrounding spaces.
  - The warning offers exactly two choices: **Don't add** (closes the warning and keeps the typed fields) and **Add anyway**. The form behind it is inert while the warning is open.
  - When editing a Book, the check runs only if the title, an author, or the ISBN changed.

#### FR-4: Browse the catalog
The user can list Books, search them by title, and open them.

### 4.2 Main book, Readings, and pausing *(Must, plus Should where marked)*
Nothing starts automatically; the user always chooses. Realizes UJ-3.

#### FR-5: Start a Reading with confirmation
The user can make a Book the Main book, or resume a paused Reading, through a Start confirmation. The confirmation is shown on every start or resume and holds the optional Purpose field (FR-9). If there's already a Main book, it also shows the trade-off ("Start *X*? This pauses *Y* at p.120 (64%)").
- **Consequences:**
  - Confirming pauses the previous Reading at its current page and creates or resumes a Reading for *X*.
  - Starting a finished Book creates a new Reading for the re-read.
  - When the start displaces the Up next Book, the confirmation names it: "*Z* moves to Waiting for you." if *Z* has a paused Reading, or "*Z* returns to the catalog." if it was never started.

#### FR-6: Pause
The user can pause the Main book from Book detail or from the Main book card's "⋯" menu. Its current page is kept, and bookvie has no Main book until the user chooses one.
- **Consequences:**
  - Every pause, including an interruption (FR-5), records the Reading's paused-at date.
  - When pausing would displace an Up next Book, a confirmation says so first.

#### FR-7: Up next and Waiting for you
The user can set one Book as Up next.
- **Consequences:**
  - A Main book that is interrupted (FR-5) or paused (FR-6) becomes Up next.
  - When a new Book takes over Up next, the displaced Book moves to Waiting for you if it has a paused Reading. If it was never started, it returns to the catalog.
  - Waiting for you lists every paused Reading except the Up next Book's, oldest paused-at date first, with no cap. A paused Book that is Up next appears only in Up next, with Resume.
  - The user can resume any paused Reading at any time, from Waiting for you or from Up next. Resuming goes through the FR-5 confirmation, so there is still only one Main book.

#### FR-8: Side reads *(Should)*
The user can mark up to 3 Books as Side reads.
- **Consequences:**
  - Marking or unmarking a Side read changes nothing else about the Book: no status change, no Reading, no progress, stats, goals, or nudges.
  - Starting a Side read, by any route, asks "Which page?" in the FR-5 confirmation, and tracking starts from that page.
  - A Side read that becomes the Main book, or is finished, leaves the Side reads automatically.

#### FR-9: Purpose
When starting a Reading, the user can enter an optional one-sentence Purpose in the Start confirmation (FR-5) and edit it later.

### 4.3 Progress *(Must)*
Progress is the current page of the Main book's Reading. Audiobook listening is entered as pages of the Book the user owns. Realizes UJ-2.

#### FR-10: Quick page update
The user can set the Main book's current page from the main screen.
- **Consequences:**
  - The percentage and gauge update immediately.
  - The update takes one field and one confirm action: at most 2 interactions after opening the app. The field takes the absolute page; there's no separate "add pages" control.
  - The page must be from 0 through the Book's page count. The user can enter a lower page than before, for example to re-read lost context; the gauge simply follows the page.
  - Saving the page records the time of the Reading's last progress update.
  - Entering the last page opens the finish flow (FR-14). If the user cancels it, the Reading stays active at that page.

#### FR-11: Re-entry info and effort *(Should)*
On the next visit, bookvie shows the Main book's current page on the gauge ("p.N of M"), "Last updated N days ago", and the pages left as an effort estimate ("~7 days left") based on Measured pace.
- **Consequences:**
  - This re-entry info, like any nudge, appears only in the app, on the next visit.
  - "Last updated N days ago" is muted and never a warning.
  - Days left = pages left ÷ Measured pace, rounded up to whole days, and at least "~1 day left". It's hidden when there's no Measured pace (no finished Reading with a start date yet) or no pages left.

#### FR-24: Bookcase
The main screen shows a slice of the bookcase, and the catalog shows the full bookcase: one spine per Book, in the catalog sort order (FR-20; Author by default).
- **Consequences:**
  - The slice is up to 3 shelf rows: the Main book's row, then the Up next Book's, then rows with the most recent finishes. Filters never apply to it.
  - Unread Books are outlined; read Books show their spine color (FR-1), stored exactly as chosen.
  - Up next and Waiting for you Books carry their own markers, so a paused Book that was never finished stays visible even though it's outlined.
  - The Main book's spine is filled to its reading percentage. A re-read of a finished Book keeps its full-color spine and gets the Main-book marker instead.
  - An overall meter shows "X of Y finished".
  - The bookcase isn't ordered by physical location; Shelves are Later (§6.2).

### 4.4 Finishing *(Must; prompts are Should)*
Realizes UJ-4.

#### FR-14: Finish a Reading
When the current page reaches the Book's last page, or the user marks a Reading finished, the Reading gets a finish date.
- **Consequences:**
  - The finish flow has a **Finished on** date: today by default, not in the future, and not before the Reading's start.
  - Any Reading can be marked finished from Book detail through the same flow, not only the Main book's. Finishing a Reading that isn't Main leaves the Main book unchanged and removes the Book from Up next and Waiting for you.
  - Only finishing the Main book leaves bookvie with no Main book until the user chooses one; bookvie then suggests the Up next Book.
  - Marking a Book with no Reading finished creates a back-filled Reading.
  - The Book counts as read.
  - *(Should)* The finish flow asks "Purpose fulfilled? yes / partly / not yet" (only if the Reading has a Purpose) and asks for a 1–5 star rating for this Reading. The user can skip both.

### 4.5 Quick pace calculator *(Must)*
Realizes UJ-5.

#### FR-15: Pace to finish date
On a Book or in the catalog, the user can type a positive pages/day value and see the estimated finish date and duration. Both update as the user types.
- **Consequences:**
  - **Book scope:** the pages left in its current Reading, or all its pages if it hasn't been started.
  - **Library scope:** all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, including re-reads. Donated Books and finished Books without an active Reading aren't counted.
  - When the input is zero, negative, or not a number, bookvie shows no result and no error message.
  - The field starts filled with the Measured pace (§3) when there is one, and is empty otherwise.

### 4.6 Stats *(Must)*

#### FR-16: Stats for any period
The user can choose any date range and see the number of Books finished and the pages finished. The UX offers presets (This month, This year, Last year, All time) plus a custom range, with a bar per month.
- **Consequences:**
  - All of a Reading's pages count in the period it finished in, whatever its start date. A finish counts by its local date; a back-filled Reading counts in the period of its Finished on date.
  - "All time" starts at the earliest finished Reading.
  - Re-reads count again. Side reads never count.

### 4.7 Card notes *(Must)*
Card notes keep what a book gave the user, so it can be found again. The main screen offers **Add card note** and **See card notes** from the first release.

#### FR-17: Add Card notes to any Book
The user can add, edit, and delete a Card note on any Book at any time, whether or not it's the Main book.
- **Consequences:**
  - A Card note needs its text and a page or a page range (for example, p.42 or pp.42–45).
  - The page or range is shown below the text.
  - A page or range outside the Book's page count is refused.

#### FR-18: Review a Book's Card notes as a pile
The user can open a Book's Card notes as a pile and go through them one at a time, at the user's own pace.
- **Consequences:**
  - The pile can be in page order or shuffled.
  - The user can move to the next or previous Card note.
  - The user can jump straight to a particular Card note in the pile.

#### FR-19: Card notes view and quick search
The user can open a separate Card notes view that shows all Card notes, grouped by Book. The quick search lives on this view and finds the Card notes that contain the typed text, so the user can quickly find where in a Book a thought was written.
- **Consequences:**
  - **Search across all Books:** on the Card notes view, the search covers every Book's Card notes, and results stay grouped by Book.
  - **Search inside a Book:** the Card notes view scoped to one Book searches only that Book's Card notes. The pile itself has no search.
  - Results update while the user types. The match ignores case.
  - Each result shows the page or page range and the matching text highlighted. Search across all Books also shows the Book's title.
  - Opening a result shows that Card note in its Book's pile.

### 4.8 Organizing *(Should)*

#### FR-20: Filter and sort
The user can filter and sort the catalog.
- **Consequences:**
  - **Sort:** Author (default), Title, Date added, or Pages. The bookcase (FR-24) reorders its spines to match.
  - **Filter chips:** Read / Unread, Type, Language, and Tag. Books that don't match are hidden and the bookcase closes up; they aren't dimmed.

#### FR-21: Cover on the main screen
The main screen shows the Main book's uploaded cover, or the placeholder.

### 4.9 Backup and restore *(Must, from day one)*

#### FR-22: One-click export
With one action, the user can export all data to a single file: Books (including spine color), Readings (including finish dates, back-filled Readings, and each Reading's last progress update and paused-at date), Card notes, and cover images, plus any data from later features.
- **Consequences:**
  - bookvie records the time of the last export and shows "Last export: N days ago" on the Backup page and on the main screen. It's informational only.

#### FR-23: Restore from export
The user can restore bookvie from an export file.
- **Consequences:**
  - The restore replaces the current data, after an explicit confirmation.
  - Exporting and then restoring reproduces identical data.
  - This is the only way to import data into bookvie.

## 5. Cross-Cutting NFRs
- **Local-first:** bookvie runs in a browser on one laptop or desktop. No account and no network connection are needed for any feature. There's no database server, and all data lives locally. A Book saved from any browser on this machine appears in every other browser.
- **Display:** The UI is in English only. The minimum viewport is 1024px; below that the page scrolls horizontally, and there's no phone layout. The user can choose a light, dark, or system theme.
- **Accessibility deviation (accepted):** The 1024px minimum width doesn't meet WCAG 2.2 SC 1.4.10 Reflow; at 200–400% zoom the page scrolls horizontally. Accepted because bookvie has a single user, runs on desktop only, and phone layouts are Won't (§6.3).
- **Speed:** Catch-up (one page update) takes under 30 seconds and at most 2 interactions after opening the app.
- **Data safety:** No action silently deletes data. Every destructive action needs confirmation. A save that fails is never silent: the UI says "Couldn't save. Your data wasn't changed." and keeps the user's input.
- **Tone:** No guilt mechanics. bookvie has no streaks, no "you missed a day" message, and no red failure states. There are no greetings, exclamation marks, or praise. The finish copy is "Finished *X*.", and the finish moment is a single ~600ms spine fill that never replays.

## 6. MVP Scope

### 6.1 In Scope
The MVP is every FR tagged Must. Should items follow in priority order.

### 6.2 Later (Could)
Each item below is a one-line summary; the addendum has the full rules.
- **Shelves:** one physical location per Book, assigned after cataloging. The catalog then shows all Books grouped by shelf.
- **Goals:** book-count and page goals, including deadline goals.
- **Sequences:** Topic, Marathon, and Weekend sprint, plus pace and deadline calculations per Sequence.
- **Donation and the Past shelf:** physical Books only, with the Book's history kept.
- **Wishlist:** a separate list. Ownership stays owned or donated.
- **Progress visuals:** beyond the MVP bookcase (FR-24): a cover that fills with color as you read, an outline for wishlisted Books, a dust layer on long-unread Books, and a re-read badge.
- **Organizing extras:** smart shelves, author and publisher groups, and publisher series.
- **Card note extras:** shuffling Card notes across scopes, and Card note export.
- **Resuming:** review pages, resume with rewind, and a pause note.
- **More stats:** language stats and a "What I can do now" wall of fulfilled Purposes.
- **Near-finish guard:** advice, never a block.

### 6.3 Won't
- multiple users, accounts, sharing or social features
- phone support or phone layouts
- borrowed Books
- batch or in-app import (restore from an export file is the only import)
- a local API for entry
- a session timer
- per-day page logs
- an abandoned status, or any history of abandons or of exclusions from Sequences
- an audiobook format
- email or push nudges

## 7. Success Metrics
- **SM-1:** The user retires the paper diary as the source of truth. The app's current page stays up to date at least weekly for 3 months. Validates FR-10.
- **SM-2:** The whole existing library is in the catalog within the first month of the MVP. Validates FR-1 to FR-3.
- **SM-3 (the thesis):** Most paused Readings are finished within 6 months of their paused-at date. An urgent book is the usual cause of a pause, and bookvie doesn't record the cause. Validates FR-5 to FR-7.
- **SM-C1 (do not optimize):** The number of visits or page updates. More updates aren't the goal; see §5 Tone. Counterbalances SM-1.
