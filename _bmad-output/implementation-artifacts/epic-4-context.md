# Epic 4 Context: Switch books without losing your place

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let an urgent Book interrupt the current one without anything being lost or happening silently. This epic carries the product thesis. Every consequence of a switch is stated before it applies. The interrupted Main book becomes Up next. A displaced Up next goes to Waiting for you if it has a paused Reading, otherwise back to the catalog. The user can pause with no Main book, set any Book as Up next, see and resume every paused Reading in Waiting for you, mark any non-Main Reading finished from Book detail, and keep up to 3 Side reads. Done means: the RDG-UNIT-002 property test is green, every Book-states row has a Given/When/Then API test (RDG-API-001..003), and the per-epic quality gates pass (P0 100%, P1 at least 95%, every error code API-tested, `check:api` clean, coverage at least 90% on `domain/` and at least 80% on `intents/` + `store/`). It closes risks R-01 (lost page or two Main books) and R-11 (multi-tab state).

## Stories

- Story 4.1: Keep the interrupted book as Up next
- Story 4.2: See every paused book in Waiting for you
- Story 4.3: Pause my Main book
- Story 4.4: Choose what to read next
- Story 4.5: Mark any book finished from its page
- Story 4.6: See each book's state on the shelf and its page
- Story 4.7: Keep a few side reads

## Requirements & Constraints

- **Displacement rule:** the interrupted or paused Main book becomes Up next. The previous Up next *Z* moves to Waiting for you if it has a paused Reading, otherwise it returns to the catalog. Every route that displaces Up next states it first: the Start dialog's lines, and the Pause Confirm when an Up next exists.
- **Waiting for you:** every paused Reading except the Up next Book's, oldest `pausedAt` first, with no cap. The paused-at date orders the list but is never shown. The "(N)" count, the sand marker and the library pace scope all use this same definition.
- **Pause:** keeps the page, records `pausedAt` = today, and clears `mainBookId`. There is then no Main book until the user picks one, and nothing starts by itself.
- **Side reads:** at most 3, and never the Main book. Marking or unmarking changes nothing else (no status, Reading, progress or stats). Starting a Side read by any route asks a required "Which page?". A Side read that becomes Main or is finished leaves the Side reads. A Side read may also be Up next or Waiting for you.
- **Non-Main finish:** leaves `mainBookId` unchanged, removes the Book from Up next and Waiting for you, plays no finish moment, and keeps the user on Book detail. A Book with no Reading gets a back-filled Reading (`startDate: null`).
- **Tone and safety:** there are no guilt cues and the paused-at date is never shown. Every save surface shows "Couldn't save. Your data wasn't changed." in an `alert` line on a 503, keeps focus where it was, and changes nothing. Success outcomes are announced in the `status` region only after the refetched views have rendered.
- **Standard intent ACs** apply to every new or extended intent: a write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`; `check_invariants()` holds after every success; a deleted target is refused with 409 `book_not_found`; and every new error code has an API test. Test states are seeded with `LibraryBuilder`, not clicked into place.

## Technical Decisions

- **One intent per action, one commit:** `start-reading` (extended), `pause`, `set-up-next`, `finish-reading` (non-Main paths), `mark-side-read` and `unmark-side-read`. Each applies every consequence (pointer moves, pauses, Side-read removal) in the same commit, or changes nothing.
- **Document shape:** Main book, Up next and Side reads exist only as root pointers (`mainBookId`, `upNextBookId`, `sideReadBookIds[]`). The invariants: the Main book is neither Up next nor a Side read; no duplicate Side reads and at most 3; at most one unfinished Reading per Book; the Main book has an unfinished Reading; every pointer resolves to a Book.
- **Status:** `domain.reading_status()` is the only status function. A Reading is finished if it has `finishDate`, active if its Book is Main, and paused otherwise. A paused Up next Reading is still paused. `pausedAt` is overwritten on every pause and is never cleared, not by resume and not by finish.
- **Refusal codes (409):** `not_main_book` (pause for a non-Main Book), `main_cannot_be_up_next`, `main_cannot_be_side_read`, `side_reads_full` ("You already have 3 side reads. Remove one first."), `reading_already_finished`, `already_main`. `set-up-next` for the current Up next is a 200 no-op that commits nothing. A bad "Which page?" value is 422 `invalid_fields`, with the same copy as the page field ("Page must be between 0 and N.").
- **Server owns selections:** the server computes Waiting for you order, percentages and the slice priority. Same-day ties sort by the server title key (NFKD, combining marks stripped, casefolded), then by Book id. The client only presents.
- **Client data layer:** no optimistic updates. Every intent response invalidates all views, and views refetch on window focus, so multi-tab use is last-write-wins with no warning. Dialogs that fix their answers when they open (Start, Finish) wait for a fresh `book` view. Known gap: the Start dialog's trade-off line reads a cached home view.
- **Side read reaching the last page:** a "Which page?" equal to the last page returns `reachedLastPage: true`, and the client then opens the Finish dialog. Only `finish-reading` sets `finishDate`.
- **Property test (RDG-UNIT-002):** random sequences of start-reading, pause, set-up-next, update-page, finish-reading, delete-book and the side-read intents run against `domain/`. After every step the invariants hold, there is at most one Main book, and no page is lost except one the user enters.

## UX & Interaction Patterns

- **Book states:** a Book's state has four independent parts: read-ever, Reading (none, Main or paused), Up next, and Side read. The EXPERIENCE.md Book states table fixes each state's spine look, marker, status string in the spine's accessible name (e.g. "Up next, paused at page 120", "finished, waiting for you, page 40", plus ", on the side"), popover primary action and Home pane.
- **Markers:** at most one 7px dot per spine with `marker-ring`, by priority Main, then Up next (sky), then Waiting for you (sand). Side reads get no marker. The legend adds "up next" and "waiting for you".
- **Home side column:** three panes, Up next, Waiting for you (N) and On the side. Each row has a serif title link to Book detail and a button named with the title ("Resume The Left Hand of Darkness") that opens the Start dialog. Waiting rows show a 60×5 mini progressbar (`aria-valuetext` "page 120 of 330, 36%") and "p.N of M" in tabular figures. Empty panes are hidden, except Up next while a Main book exists ("Nothing up next." plus a Catalog link). With no Main book, the empty Main book card suggests the Up next Book instead.
- **Start dialog:** shows "This pauses *Y* at p.120 (64%)." and then "*Z* moves to Waiting for you." or "*Z* returns to the catalog.", each only when it applies. No displacement line appears when *X* is itself Up next. For a Side read, focus starts in "Which page?", prefilled with the paused page if it has one.
- **Pause:** from the Main book card's "⋯" menu ("More actions", `aria-haspopup="menu"`, arrow keys, Esc returns focus to "⋯") or from Book detail. When an Up next exists, a Confirm `alertdialog` reads "Pause *X* at p.150 (58%)? *Z* moves…", with Cancel focused by default. A dialog opened from the menu closes the menu first, so only one overlay level exists.
- **Book detail actions:** one primary button, **Resume** (paused) or **Start reading** (no active or paused Reading, not Main). The Main book has none. Secondary actions appear only when they apply, in this order: Set as Up next, Pause, Mark finished, Mark as Side read / Remove from side, Add card note, Edit, Delete. **Edit Purpose** stays a link beside the Purpose line. At 3 Side reads, **Mark as Side read** has `aria-disabled="true"` and the hint "Up to 3 side reads."
- **Spine popover:** shows **Set as Up next** as the primary action for a Book with no Reading, with the hint "Replaces the current Up next." when an Up next exists.
- **Focus after close:** a pause from Home lands on the empty card's **Resume** or **Start reading**; a pause from Book detail lands on **Resume**. A non-Main finish lands on the Book detail `h1`. Set as Up next and Side-read toggles land on the primary button (the `h1` when there is none), or on the spine when started from a popover.

## Cross-Story Dependencies

- **Amends Epic 3:** 4.1 extends `start-reading` and changes Story 3.6's post-finish focus: it goes to the Up next's **Start reading** or **Resume** when an Up next exists, else to the "No Main book." heading. Update that e2e test to cover both cases.
- **Carry-overs that 4.1 must close (from deferred work):** `start-reading` on an Up next or Side-read Book currently fails with 500 because it doesn't clear those pointers. Views expose no `currentReading` for an Up next Book with a paused Reading, so the dialog says "Start" and the empty Purpose overwrites the stored one. Fix both by clearing the pointers in the same commit, having `book_detail` and the shelf expose the paused Reading, and deriving the opener label and dialog mode from one source.
- **4.2** depends on 4.1's Up next exclusion and must list Readings paused under Epic 3 behavior (seeded).
- **4.3 and 4.4** reuse 4.1's displacement rule. **4.5** reuses Story 3.6's Finish dialog and its "before start" refusal.
- **4.6** depends on 4.1–4.5 (and 4.7 for ", on the side") for the full Book-states matrix and the property test. **4.7** adds its intents to that property test.
