---
title: bookvie PRD
status: final
created: 2026-10-28
updated: 2026-10-28
inputs: _bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md
assumptions: all confirmed by the user on 2026-10-28
---

# PRD: bookvie

## 0. Document Purpose

This PRD is for the builder, who is also the only user, and for the downstream UX, architecture, and epics work. §3 defines the terms the rest of the PRD uses. The addendum (`addendum.md`) holds the rules for Later features, the design rationale, and the competitive research.

## 1. Vision

bookvie is a personal, local-first web app that organizes the user's home library and holds the authoritative record of the user's reading. It replaces a paper reading diary. The paper diary can stay on the nightstand as a quick place to jot things down, but the app is the single source of truth for reading progress. The user catches up on the next visit by entering the page reached and the type of each day.

bookvie breaks the urgency chain. An urgent work book interrupts the current one, the context is lost, re-reading feels like no progress, and the paused book is never resumed. bookvie allows exactly one tracked **Main book**, makes every switch a deliberate, visible trade-off, and keeps every paused book in view until the user picks it up again.

Three pillars guide every decision:
- **Visible progress:** Every real reading effort moves something you can see.
- **Conscious reading:** You set a Purpose when you start a book, a Day type each day, and answer "fulfilled?" when you finish.
- **Simplicity:** Less state means less stress, and removing a state also removes a failure signal. Simplicity beats completeness of history.

Re-reading is welcome and never counts as lost progress.

The Must features (§6.1) deliver Visible progress and Simplicity. Conscious reading arrives with the Should features, by design.

## 2. Target User

### 2.1 Jobs To Be Done
- Show me how far I am through the book I'm reading, and through my whole unread library.
- When something urgent interrupts, let me park the current book without losing my place, and keep reminding me of it.
- Let me record what kind of reading day it was without punishing me for tiring work days.
- Don't lose my Readings and Reading calendar to a dead disk.

### 2.2 Non-Users (v1)
Anyone other than the single user.

### 2.3 Key User Journeys
- **UJ-1. The user catalogs a shelf.** The user points an AI skill at a stack of books. The skill fills the labeled add-book form the way a person would. bookvie warns when a book is a likely duplicate, and by the end of the evening the whole shelf is in the catalog.
- **UJ-2. The user catches up after three busy evenings.** The user opens bookvie on the laptop, sets Tue = Light, Wed = Rest, Thu = Deep, and enters p.212. The gauge jumps to 64%, and "~7 evenings left" appears next to it.
- **UJ-3. An urgent work book arrives.** The user picks the work book, *X*, as the new Main book. bookvie asks: "Start *X*? This pauses *Y* at p.120 (64%)." The user confirms, and *Y* goes to Up next.
- **UJ-4. The user finishes a book.** The user enters the last page. bookvie asks whether the Purpose was fulfilled and asks for a 1–5 star rating, then counts every page of the book toward the period it finished in.
- **UJ-5. The user wonders "how long until…".** The user types 30 pages/day into the quick pace calculator in the catalog and sees the unread library finishing in about 9 months.

## 3. Glossary

- **Book**: a catalog entry for one physical or electronic copy the user owns or owned. A Book has zero or more Readings.
- **Reading**: one read-through of a Book. It has its own current page, Purpose, start and finish dates, and star rating. A Book counts as read if any of its Readings is finished.
- **Main book**: the single Book whose Reading is currently tracked. There is at most one Main book.
- **Side read**: a marker on a Book showing that it's currently being read on the side. It doesn't change the Book's status and doesn't create a Reading.
- **Pause**: puts the active Reading back on the shelf and keeps its current page. Pause also covers interruption by an urgent book.
- **Up next**: the single Book the user has chosen to read next. It can be unread or paused.
- **Waiting for you**: the list of paused Readings.
- **Purpose**: one sentence written when a Reading starts, answering "what do I need to be able to do with this knowledge?"
- **Day type**: the kind of reading day a calendar day was: **Deep**, **Light**, or **Rest**. The user always picks it; bookvie never infers it.
- **Reading calendar**: the record of Day types by date.
- **Catch-up**: entering, on a later visit, the Day types for days that have already passed and the current page.
- **Quick pace calculator**: takes a pages/day value and shows an estimated finish date.
- **Measured pace**: total pages of finished Readings divided by the total days from their start dates to their finish dates.
- **Ownership**: *owned*, or *donated* once Donation ships (see addendum).
- **Card note**: a piece of text (a quote or a note) plus the page or page range where the user found it, attached to a Book. It has one side only; it isn't a flash card.

## 4. Features

### 4.1 Catalog and entry *(Must)*
Realizes UJ-1.

#### FR-1: Book fields
The user can create, edit, and delete a Book.
- **Required:** title, pages, at least one author, edition (defaults to 1), language, publisher, and type (paperback, hardcover, or ebook; ebook is the only non-physical type).
- **Optional:** subtitle, ISBN, year (the year of the edition), and cover image.
- **Consequences:**
  - bookvie refuses to save while any required field is empty.
  - Pages is always a page count, ebooks included.
  - bookvie displays the edition only when it isn't 1.
  - A Book without a cover shows a "no cover" placeholder.
  - New Books default to Ownership = owned.
  - Deleting a Book requires confirmation and removes its Readings and Card notes.

#### FR-2: Agent-friendly form
The add-book and edit-book forms expose stable, labeled fields and buttons that can be reached by their labels, so a browser-driven AI skill can fill them exactly as a person would.
- **Consequences:**
  - Every field has a visible label and a stable accessible name. Labels and accessible names don't change between releases without notice.
  - After saving, the user can find the new Book by searching for its title.

#### FR-3: Duplicate warning
When a new Book matches an existing one, bookvie warns before saving.
- **Consequences:**
  - A matching ISBN triggers the warning. The comparison ignores hyphens and spaces.
  - When either Book has no ISBN, a matching title plus at least one shared author triggers it. The title comparison ignores case and extra whitespace.
  - The user can cancel or choose **Add anyway**.

#### FR-4: Browse the catalog
The user can list Books, search them by title, and open them.

### 4.2 Main book, Readings and pausing *(Must, plus Should where marked)*
Nothing starts automatically; the user always chooses. Realizes UJ-3.

#### FR-5: Start a Reading with confirmation
The user can make a Book the Main book. If there's already a Main book, bookvie first shows the trade-off ("Start *X*? This pauses *Y* at p.120 (64%)") and asks for confirmation.
- **Consequences:**
  - Confirming pauses the previous Reading at its current page and creates or resumes a Reading for *X*.
  - Starting a finished Book creates a new Reading for the re-read.

#### FR-6: Pause
The user can pause the Main book. Its current page is kept, and bookvie has no Main book until the user chooses one.

#### FR-7: Up next and Waiting for you
The user can set one Book as Up next.
- **Consequences:**
  - A Main book that is interrupted (FR-5) or paused (FR-6) becomes Up next.
  - When a new Book takes over Up next, the displaced Book moves to Waiting for you if it has a paused Reading. If it was never started, it returns to the catalog.
  - Waiting for you lists every paused Reading, oldest first, with no cap.
  - The user can resume any paused Reading at any time, from Waiting for you or from Up next. Resuming goes through the FR-5 confirmation, so there is still only one Main book.

#### FR-8: Side reads *(Should)*
The user can mark up to 3 Books as Side reads.
- **Consequences:**
  - Marking or unmarking a Side read changes nothing else about the Book: no status change, no Reading, no progress, stats, goals, or nudges.
  - Promoting a Side read to Main book asks "Which page?" once, and tracking starts from that page. If there's already a Main book, the FR-5 confirmation applies.

#### FR-9: Purpose *(Should)*
When starting a Reading, the user can enter an optional one-sentence Purpose and edit it later.

### 4.3 Progress *(Must)*
Progress is the current page of the Main book's Reading. Audiobook listening is entered as pages of the Book the user owns. Realizes UJ-2.

#### FR-10: Quick page update
The user can set the Main book's current page from the main screen.
- **Consequences:**
  - The percentage and gauge update immediately.
  - The update takes one field and one confirm action: at most 2 interactions after opening the app.
  - The page must be from 0 through the Book's page count. The user can enter a lower page than before, for example to re-read lost context; the gauge simply follows the page.
  - Entering the last page opens the finish flow (FR-14). If the user cancels it, the Reading stays active at that page.

#### FR-11: Re-entry info and effort *(Should)*
On the next visit, bookvie shows the page the user last reached in the Main book and the pages left as an effort estimate ("~7 evenings") based on Measured pace. One evening is one day at Measured pace.
- **Consequences:**
  - This re-entry info, like any nudge, appears only in the app, on the next visit.
  - The effort estimate stays hidden until at least one Reading has been finished.

### 4.4 Daily check-in and Reading calendar *(Must)*
The Day type is a fun, honest record of what kind of reading day it was. It's separate from the page count. Realizes UJ-2.

#### FR-12: Set Day type, including Catch-up
The user can set a Day type for today or any past day, with one choice per day.
- **Consequences:**
  - The options are Deep, Light, and Rest.
  - The user can change a day's type later.
  - Days with no type are allowed, aren't shown as failures, and aren't counted in stats.
  - When there's a Main book, choosing Deep or Light for today offers the FR-10 page field, which is optional.

#### FR-13: Reading calendar
The user can view the Reading calendar, colored by Day type. It shows no streak or days-in-a-row figure, and nothing resets.

### 4.5 Finishing *(Must; prompts are Should)*
Realizes UJ-4.

#### FR-14: Finish a Reading
When the current page reaches the Book's last page, or the user marks the Reading finished, the Reading gets a finish date.
- **Consequences:**
  - The Book counts as read.
  - *(Should)* The finish flow asks "Purpose fulfilled? yes / partly / not yet" (only if the Reading has a Purpose) and asks for a 1–5 star rating for this Reading. The user can skip both.
  - Afterward there's no Main book until the user chooses one, and bookvie suggests the Up next Book.

### 4.6 Quick pace calculator *(Must)*
Realizes UJ-5.

#### FR-15: Pace to finish date
On a Book or in the catalog, the user can type a positive pages/day value and see the estimated finish date and duration. Both update as the user types.
- **Consequences:**
  - **Book scope:** the pages left in its current Reading, or all its pages if it hasn't been started.
  - **Library scope:** all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, including re-reads. Donated Books and finished Books without an active Reading aren't counted.
  - When the input is zero, negative or not a number, bookvie shows no result and no error message.
  - The field starts filled with the Measured pace when there is one, and is empty otherwise.

### 4.7 Stats *(Must)*

#### FR-16: Stats for any period
The user can choose any date range and see the number of Books finished, the pages finished, and the count of each Day type.
- **Consequences:**
  - All of a Reading's pages count in the period it finished in, whatever its start date.
  - Re-reads count again. Side reads never count.

### 4.8 Card notes *(Should)*

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
The user can open a separate Card notes view that shows all Card notes, grouped by Book. The quick search lives on this view. The user can type text and immediately see the Card notes that contain it, so the user can quickly find where in a Book a thought was written.
- **Consequences:**
  - Results update while the user types. The match ignores case.
  - Each result shows the page or page range and the matching text highlighted. Search across all Books also shows the Book's title.
  - **Search across all Books:** on the Card notes view, the search covers every Book's Card notes, and results stay grouped by Book.
  - **Search inside a Book:** when the user is viewing a Book or browsing its pile, the search covers only that Book's Card notes.
  - Opening a result shows that Card note in its Book's pile.

### 4.9 Organizing *(Should)*

#### FR-20: Tags, filter, sort
The user can add free-form tags (many per Book), and filter the catalog by tag, type, language, or read status. The user can sort it by title, author, date added, or pages.

#### FR-21: Cover on the main screen
The main screen shows the Main book's uploaded cover, or the placeholder.

### 4.10 Backup and restore *(Must, from day one)*

#### FR-22: One-click export
With one action, the user can export all data to a single file: Books, Readings, Day types, Card notes, and cover images, plus any data from later features.

#### FR-23: Restore from export
The user can restore bookvie from an export file.
- **Consequences:**
  - The restore replaces the current data, after an explicit confirmation.
  - Exporting and then restoring reproduces identical data.
  - This is the only way to import data into bookvie.

## 5. Cross-Cutting NFRs
- **Local-first:** bookvie runs in a browser on one laptop or desktop. No account and no network connection are needed for any feature. There's no database server, and all data lives locally.
- **Speed:** Catch-up for a few days (Day types plus a page update) takes under 30 seconds.
- **Data safety:** No action silently deletes data. Every destructive action needs confirmation.
- **Tone:** no guilt mechanics. bookvie has no streaks, no "you missed a day" message, and no red failure states.

## 6. MVP Scope

### 6.1 In Scope
The MVP is every FR tagged Must. Should items follow in priority order.

### 6.2 Later (Could)
Each item below has a one-line summary here. The addendum has the full rules.
- **Shelves:** one physical location per Book, assigned after cataloging. The catalog then shows all Books grouped by shelf.
- **Goals:** book-count and page goals, including deadline goals.
- **Sequences:** Topic, Marathon, and Weekend sprint, plus pace and deadline calculations per Sequence.
- **Donation and the Past shelf:** physical Books only, with the Book's history kept.
- **Wishlist:** a separate list. Ownership stays owned or donated.
- **Progress visuals:** a cover that fills with color as you read, a dust layer on long-unread Books, and a re-read badge.
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
- **SM-1:** The user retires the paper diary as the source of truth. The app's current page and Reading calendar stay up to date at least weekly for 3 months. Validates FR-10 and FR-12.
- **SM-2:** The whole existing library is in the catalog within the first month of the MVP. Validates FR-1 to FR-3.
- **SM-3 (the thesis):** Most Readings paused by an urgent book are finished within 6 months. Validates FR-5 to FR-7.
- **SM-C1 (do not optimize):** the number of reading days or check-ins. Logging more days isn't the goal, because Rest is a valid day; see §5 Tone. Counterbalances SM-1.
