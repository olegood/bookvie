# bookvie PRD: Addendum

This addendum supports `prd.md` with four sections: the competitive research, implementation notes for architecture, the design rationale, and the full rules for the Later backlog.

## Competitive landscape (research digest, 2026-10-28)

Sources are store listings, roadmap posts, and reviews from 2021 to 2024.

| App | Progress logging | Streaks | Pace / finish calc | Local-first / self-hosted | Time logging |
|---|---|---|---|---|---|
| StoryGraph | Yes (journal) | Opt-in, resets to 0 | not found | No | Pages + notes |
| Goodreads | Yes, buggy | No | No | No | No |
| Bookly | Yes (on timer stop) | Days-in-a-row | Current book + deadlines | No | Timer / manual |
| Basmo | Yes (session end) | Yes | Current book | No | Yes; minute goals only |
| Literal | Pages / % / min | not found | not found | No | Minutes |
| Book Track / Reading List | Basic | No | No | Partly (on-device iOS) | No |
| BookLogr | Current page | No | No | Yes (Docker, SQLite) | No |
| BookWyrm | Progress + shelves | No | No | Yes (multi-user server) | No |
| Calibre-Web | Workarounds only | No | No | Yes | No |

**Gaps bookvie can own:**
- Pace math for the whole library, not only the current book.
- Reading sequences: topic, marathon, sprint.
- One Main book plus a resumable pause. Elsewhere, "stopped reading" is a dead end.
- A single-user, local-first web app. Existing self-hosted options need Docker and a server; the local-first ones are iOS-only.

**User complaints that support the design:**
- Streaks are unforgiving. Late logging breaks them, and people end up reading just to protect the streak.
- Progress logging is fiddly (Goodreads edition bugs, Basmo goals that don't accept pages).

**Links:**
- roadmap.thestorygraph.com/features/posts/daily-streak
- goodreads.com/topic/show/19554911
- bookriot.com/bookly-review
- bookriot.com/basmo-app-review
- github.com/mozzo1000/booklogr
- docs.joinbookwyrm.com/shelves.html

## Implementation notes for architecture (not in the PRD)
- **Persistence:** Local-first, with simple persistence. The user explicitly asked for no complex persistence layer. The single-file export and restore (FR-22, FR-23) should probably use the same format as the app's internal storage.
- **AI entry is UI-only:** The user's own AI skill fills the forms. That makes the labels and accessible names the contract. The single source is EXPERIENCE.md → Agent Label Contract (UX run, 2026-10-28). Tests use that table as their single source, and renaming a label counts as a breaking change. It covers:
  - **Opener:** "New book", the catalog button that opens the form. It's distinct from the submit button. The panel is a dialog named "New book", or "Edit book" in edit mode.
  - **Fields:** Title, Subtitle, Pages, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Finished on, Tags, Cover, and Spine color, plus the swatch buttons beside Spine color (From cover, Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone).
  - **Buttons:** "Add book" (submit, new), "Save changes" (submit, edit), "Cancel" (panel footer, the only Cancel while the panel is open), "Close" (panel ×), "Don't add" and "Add anyway" (duplicate warning), and "Search titles".
  - **Field rules:** Author(s) is one field with semicolon-separated names. Type is a select with exactly Paperback, Hardcover, and Ebook. "(required)" sits outside the label, so the accessible name equals the label.
  - **Lookup:** Labels are matched exactly ("Title" never matches "Subtitle"). The skill confirms a save by an exact title match in Search titles, not by a result count.
- **Expectations from the UX run:** prd-deltas.md (A1–A6, in the UX folder) lists what the UX spines expect from the architecture.
  - **A1 (blocks architecture):** The AI skill drives its own automated browser, so storage must be shared by every browser on the machine (for example, a local server plus a file), or the skill must be guaranteed to use the user's browser profile. Browser-local storage would put UJ-1's Books in a store the user never sees.
  - **A2:** Last write wins across tabs.
  - **A3:** Every save reports success or failure, with no partial writes.
  - **A4:** Spine colors, finish dates, and finished page counts are stored rather than recomputed.
  - **A5:** Covers are downscaled to a 1200px long edge.
  - **A6:** The export is versioned, and restore validates it before replacing anything. "Last export" and UI preferences are kept local.

## Design rationale
- **Stats spike in the month a Book is finished.** All of a Reading's pages count in the period it finished in (FR-16), so a 900-page book finished on 2 December puts all 900 pages in December. That follows from having no per-day logs. Don't add page logs back just to smooth the chart.
- **Measured pace counts paused days as reading days.** That makes the figure slower after long interruptions. The user accepted the distortion to keep things simple (the alternative was storing pause and resume dates). A single paused-at date per Reading is stored for the Waiting for you order and SM-3; it isn't used for pace.
- **Back-filled Readings have no start date.** Measured pace therefore excludes them rather than guessing a duration.
- **What history is kept.** Readings, finishes, and donations are kept. Exclusions, abandons, and per-day page logs are deliberately not recorded, because simplicity beats completeness of history.
- **Re-reads.** A re-read is a new Reading of its own and counts again in stats. A lower current page is allowed, and the gauge simply follows it.
- **Day types and the Reading calendar were removed (UX run, 2026-10-28).** The user dropped them as extra effort with no outcome. Catch-up is now one page update, and Stats show only Books and pages.

## Later backlog detail
Brainstorm rules for the Later items in PRD §6.2, kept so whoever builds them doesn't have to rediscover them.

### Sequences
- **Sequence:** an optional ordered set of Books. Sequences can be created as plans before any of their Books is started.
- **Progress:** A Sequence holds no progress of its own. Its progress comes from its Books' Readings.
- **Topic:** open-ended, with no clock. Any Book not yet read can be skipped or reordered.
- **Marathon:** a reading-time budget (for example, 24 hours). It can be extended or paused, has no overrun penalty, and ends with a recap card.
  - Starting a Marathon pauses the Main book. The Main book returns as Up next when the Marathon ends or is paused.
  - Paused Marathons join Waiting for you.
- **Weekend sprint:** a calendar window (Saturday and Sunday), turned into a daily page target.
- **Membership:** A Book can belong to many Sequences, and a Book read in one counts as read in all. Dropping a Book excludes it from that Sequence, and no record of the exclusion is kept.
- **No auto-start:** Finishing a Book in a Sequence never starts the next one. The next Book is only offered as Up next, and the user confirms it through FR-5.
- **Pace:** The quick pace calculator also works per Sequence (unread pages of its non-donated Books). Any scope with a deadline (a Weekend sprint or a deadline goal) also shows the pages/day needed to finish by that date.

### Reading time
Entered by hand only, with quick chips (+15m, +30m, +1h). It's approximate and just for fun, and it's used by Marathons. Once the feature exists, the export includes it.

### Goals
- Book-count goals and page goals.
- Page goals are proposed from Measured pace.
- A deadline goal becomes a daily pages/day target.
- One click resets a goal to a realistic target.

### Donation and the Past shelf
- Donation applies to physical Books only.
- A Donation records a destination type (university, public library shelf, gift, or public place), a free-text note, and a date.
- A donated Book keeps its history and stats.
- A donated unread Book stays grayed out in its Sequences, and its pages are excluded from Sequence progress.
- Once Donation ships, the catalog shows each Book's Ownership and can be filtered by it.

### Wishlist
A separate list, not an Ownership state. Buying a wishlisted book moves it into the catalog.

### Progress visuals
The MVP bookcase of spines (FR-24) already shows outlined unread Books, full-color read Books, and the Main book's spine filled to its percentage. Later adds:
- a cover that fills with color as you read
- an outline for a wishlisted book
- a dust layer on long-unread Books
- a re-read badge (in the MVP, a re-read keeps its full-color spine and gets the Main-book marker)

### Smart shelves
Saved filters. A smart shelf can seed a Marathon pile.

### Card note export
Image or Markdown. (Anki export from the brainstorm was dropped: Card notes have no back side.)

### "What I can do now" wall
A wall of fulfilled Purposes.
