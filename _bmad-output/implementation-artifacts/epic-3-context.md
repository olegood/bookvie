# Epic 3 Context: Read a book with visible progress

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn bookvie from a catalog into a reading tracker. The user starts a Book as the Main book through a Start dialog that holds an optional Purpose. Home becomes the launch page: it shows the Main book's cover, a gauge and a page field, so catching up takes at most 2 interactions. A quiet re-entry line reads "Last updated…", "~N days left" and "Last export…". Finishing a Book records its date, whether the Purpose was fulfilled and a rating, then plays a one-time spine fill on Home's bookcase slice. Re-reads are included. In this epic, starting a Book while another is Main only pauses the previous one and says so. Epic 4 decides where the paused Book goes (Up next, Waiting for you). Done means: the catch-up e2e (at most 2 interactions, under 30 s) is green, the fake-Clock tests for re-entry and finish dates are green, and the per-epic quality gates pass.

## Stories

- Story 3.1: See my Main book on Home
- Story 3.2: Start reading a book
- Story 3.3: Catch up with one page update
- Story 3.4: See where I left off and how long is left
- Story 3.5: See my reading on Home's shelf
- Story 3.6: Finish my Main book
- Story 3.7: See the finish on the shelf

## Requirements & Constraints

- **Start/resume:** every start or resume goes through the Start dialog, even when there is no Main book, because the dialog carries the Purpose. When a Main book *Y* exists, the dialog says "This pauses *Y* at p.120 (64%)." Starting a finished Book creates a new Reading (a re-read) and leaves earlier Readings unchanged. The Purpose is optional, trimmed, null when empty, and editable later.
- **Page update:** the field takes the absolute page, a whole number from 0 to the page count. A lower page than before is allowed, and there is no "add pages" control. The field is never auto-focused. Reaching the last page saves the page but does not finish the Reading. A catch-up takes at most 2 interactions after opening the app and under 30 s.
- **Re-entry:** "Last updated" counts local calendar days from the last progress update. Days left = ceil(pages left ÷ Measured pace), minimum 1. It is hidden when there is no Measured pace, when Measured pace is 0, or when no pages are left. Measured pace = total `finishedPages` of finished Readings that have a start date ÷ Σ(finishDate − startDate + 1). Back-filled Readings are excluded, and a same-day start and finish counts as 1 day. Relative dates and the Home date recompute on focus or visibility, so a tab left open past midnight stays right.
- **Finish:** the Finished on date defaults to today. It can't be in the future or before the Reading's start. "Purpose fulfilled?" (yes · partly · not yet) appears only when the Reading has a Purpose. The rating is 1–5 stars or "No rating". Both questions can be skipped, and a skipped one is stored as null. Finishing the Main book clears the Main book. The Book counts as read and the meter goes up.
- **Tone:** no greeting (the Home header is the date), no warnings, no red, no praise, no exclamation marks. Finish copy is "Finished *X*." (or "Finished *X* again." for a re-read). The finish fill never replays.
- **Accessibility:** WCAG 2.2 AA in both themes, checked by axe on Home. Every save surface (page field, Start dialog, Finish dialog, Edit Purpose) keeps its values on `couldnt_save` and shows "Couldn't save. Your data wasn't changed."
- **Standard intent ACs** apply to `start-reading`, `edit-purpose`, `update-page` and `finish-reading`:
  - a fault injected at write, fsync or rename gives 503 `couldnt_save` with the data unchanged;
  - `check_invariants()` holds after every success;
  - an intent naming a deleted Book gets 409 `book_not_found`;
  - every new error code has an API test.
- **Quality gates:** P0 100%, P1 at least 95%, `check:api` clean, coverage of at least 90% on `domain/` and at least 80% on `intents/` and `store/`.

## Technical Decisions

- **New intents**, each one `POST /api/intents/<verb>` sent as multipart with a JSON `intent` part, applying every consequence in one commit: `start-reading`, `edit-purpose`, `update-page`, `finish-reading`. Intents address `bookId` and act on the server's current state, so the last write wins.
- **Reading fields:** `id`, `startDate|null`, `currentPage`, `purpose|null`, `lastProgressUpdate` (a timestamp, set by `update-page` and by start/resume), `pausedAt|null` (a local date, overwritten on every pause and never cleared), `finishDate|null`, `finishedPages|null`, `purposeFulfilled|null`, `rating|null`.
- **Status:** `domain.reading_status()` is the only status function. A Reading is finished if it has a `finishDate`, active if its Book is `mainBookId`, and paused otherwise. A Book's current Reading is its single unfinished Reading.
- **Start:** `start-reading` resumes the current Reading or creates a new one. A new Reading starts with `startDate` = today, `currentPage` 0 and `lastProgressUpdate` = now. Resume keeps the page and sets `lastProgressUpdate` = now. If a Main book exists, the same intent pauses its Reading and sets `pausedAt` = today. Tests in this epic must not assert `upNextBookId`; Story 4.1 adds that.
- **Finish:** only `finish-reading` ever sets `finishDate`. It stores `finishedPages` = the Book's Pages at the moment of finishing; this and `finishDate` are stored, never recomputed. When `update-page` lands on the last page, the success envelope carries `reachedLastPage: true` and the client opens the Finish dialog.
- **Refusal codes (409):**
  - `already_main`: `start-reading` for the Main book.
  - `not_main_book`: `update-page` for a Book that isn't Main, for example from a stale tab.
  - `reading_already_finished`: the Reading was already finished.
  - An out-of-range or non-integer page is a 422 `invalid_fields` with "Page must be between 0 and 330."
- **Invariants to respect:**
  - the Main book has an unfinished Reading;
  - a Book has at most one unfinished Reading;
  - the pages of an unfinished Reading are within the Book's page count.
- **Server owns numbers:** the home view supplies the percentage, floor(page × 100 ÷ pages), so it reads 100% only at the last page. It also supplies Measured pace, days left, pages left, the "X of Y finished" meter, and the slice priority: Main book, then Up next, then most recent finishes. The client only packs spines into rows by width and formats copy and relative dates.
- **Time:** `domain/` gets an injected `Clock` and never calls the system clock. Local dates are `YYYY-MM-DD` and timestamps are ISO 8601 with an offset. The e2e tests pass `--fake-today` (only with `--no-browser`) and set the browser's `page.clock` to the same date. TZ is pinned to `Europe/Madrid`.
- **No optimistic updates:** after every intent response, success or refusal, the client invalidates all views. Success announcements wait until the refetched views have rendered. The finish moment plays only in the tab that received the successful `finish-reading` response, never because a view changed.
- **Planned modules:** `intents/start_reading`, `edit_purpose`, `update_page`, `finish_reading`; the home view in `views/shelf`; `reading_status` and pace in `domain/`.

## UX & Interaction Patterns

- **Nav and launch:** Home becomes the first nav item (Home · Catalog · Backup) and `/` routes to it.
- **Home layout:** the date header (for example "Wednesday, 28 October"), then a two-column grid: the fluid Main book card beside a 320px side column. The bookcase slice sits below. With no Main book, "Last export" moves to the right end of the header line; with a Main book it sits in the re-entry line.
- **Empty states:**
  - No Books: bare planks, "Your shelf is empty. Add your first book." and **New book**, which goes to Catalog and opens the panel.
  - No Main book: "No Main book." with the link "Choose a book in the Catalog".
- **Main book card:** a 200×300 cover or the no-cover placeholder, the "MAIN BOOK" eyebrow, a serif title (3-line clamp) linking to Book detail, the author, and the edition only when it isn't 1. Then the gauge, the page field and the re-entry line.
- **Gauge:** a progressbar whose `aria-valuetext` reads "64%, page 212 of 330". It shows the percentage figure, "p.N of M" and ticks 0 · half · total; the half tick is dropped under 4 pages.
- **Page field:** the label "Page", "of M" linked by `aria-describedby`, and **Update** (Enter also saves). On success, the `status` region reads "Page 212 of 330, 64%." On an invalid value the field keeps the typed value, gets `aria-invalid`, and shows the message inline and in `alert`.
- **Start dialog:** a modal headed "Start *X*?" or "Resume *X*?" with the existing Purpose prefilled on resume. It has the "Purpose (optional)" field (focused on open), **Start reading** or **Resume**, and **Cancel**. Confirming goes to Home with focus on the Main book title link. Cancel or Esc changes nothing and returns focus to the opener. A spine popover offers a "Start reading" link, or a **Resume** primary for a paused Book; a finished Book is re-read from Book detail only.
- **Book detail:** a single `button-primary`, **Start reading** or **Resume**, with none for the Main book. **Mark finished** is offered for the Main book. The Current reading block shows the status, the gauge and the Purpose, with an **Edit Purpose** link: an inline one-line field where Enter saves and Esc cancels. The Readings block lists start, finish, stars and Purpose fulfilled.
- **Finish dialog:** a modal headed "Finished *X*" with focus in **Finished on**. Rating is a radio group whose stars change shape when selected, not only color. While the request is in flight, **Done** has `aria-disabled` and further presses send nothing. Cancel or Esc after an update to the last page keeps the Reading active at that page and returns focus to the page field; Update with the same page reopens the dialog. On success the app goes to Home and focus moves to the "No Main book." heading.
- **Bookcase slice:** up to 3 rows, with the Main book's row first and the other chosen rows in bookcase order. It recomputes on resize, ignores filters and never scrolls internally. It is a `list` named "Bookcase slice, N rows", and arrow keys and Home/End follow the rows as displayed. The header shows "BOOKCASE", the library meter and "See all in Catalog". The legend adds "Main book, filled to its %".
- **Main spine:**
  - Never-finished Main book: an unread body and outline, filled in its exact color from the plank up to the percentage (below the label strip), topped by a 2px `spine-edge` line, plus the Main-book marker.
  - Re-read: stays full color with the marker; its accessible name ends "finished, re-reading, 12%".
  - The fill moves together with the gauge after an update (instantly under reduced motion).
- **Finish moment:**
  1. Scroll the spine into view if needed.
  2. Fill it to full over about 600 ms ease-out with the highlight ring.
  3. Show "Finished *X*." in the bookcase header.
  4. Once focus has settled, `status` reads "Finished *X*. 25 of 73 finished."

  On a re-read only the ring plays and the meter doesn't change. Under reduced motion the fill and ring are instant and the scroll is instant (`behavior: 'auto'`). There is no sound and no confetti.

## Cross-Story Dependencies

- **Built on Epics 1 and 2:**
  - From Epic 1: the store and its filesystem seam, the envelope and error enum, `check_invariants()`, the `LibraryBuilder` and `--fake-today` fixtures, the Catalog bookcase (spines, keyboard model, meter, popover), Book detail and the overlay primitives.
  - From Epic 2: "Last export" from `local-state.json`, and restore navigating to `/`, which now opens Home.
- **Within this epic:**
  - 3.1 provides the Home page and the home view that 3.3, 3.4 and 3.5 extend.
  - 3.2 creates the Readings every later story needs.
  - 3.3 returns `reachedLastPage`, which the client ignores until 3.6 adds the Finish dialog.
  - 3.4's Measured pace needs finished Readings with start dates.
  - 3.7 depends on 3.5's slice and 3.6's finish.
- **Feeds Epic 4:**
  - Story 4.1 makes the paused Main book Up next and changes focus after finish when an Up next exists.
  - Story 4.5 adds marking non-Main Readings finished.
  - Story 4.7 adds "Which page?" for Side reads.
  - Epic 4 also adds the displacement lines in the Start dialog, the "⋯" menu with Pause, and the section panes.
