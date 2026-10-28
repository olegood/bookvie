# bookvie PRD: Addendum

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
- Day-type check-in with no streak.
- Pace math for the whole library, not only the current book.
- Reading sequences: topic, marathon, sprint.
- One main book plus a resumable pause. Elsewhere, "stopped reading" is a dead end.
- A single-user, local-first web app. Existing self-hosted options need Docker and a server; the local-first ones are iOS-only.

**User complaints that support the design:**
- Streaks are unforgiving. Late logging breaks them, and people end up reading just to protect the streak.
- Progress logging is fiddly (Goodreads edition bugs, Basmo goals that don't accept pages).

Links: roadmap.thestorygraph.com/features/posts/daily-streak · goodreads.com/topic/show/19554911 · bookriot.com/bookly-review · bookriot.com/basmo-app-review · github.com/mozzo1000/booklogr · docs.joinbookwyrm.com/shelves.html

## Implementation notes for architecture (not in the PRD)
- **Persistence:** Local-first, with simple persistence. The user explicitly asked for no complex persistence layer. The single-file export and restore (FR-22, FR-23) should probably use the same format as the app's internal storage.
- **AI entry is UI-only:** The user's own AI skill fills the forms. That makes the labels and accessible names the contract. UX should publish one table of field and button labels (Title, Subtitle, Pages, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Cover, "Add book", "Search titles"). Tests should use that table as their single source, and renaming a label counts as a breaking change.

## Design rationale
- **Stats spike in the month a Book is finished.** All of a Reading's pages count in the period it finished in (FR-16), so a 900-page book finished on 2 December puts all 900 pages in December. That follows from having no per-day logs. Don't add page logs back just to smooth the chart.
- **Measured pace counts paused days as reading days.** That makes the figure slower after long interruptions. The user accepted the distortion to keep things simple (the alternative was storing pause and resume dates).
- **What history is kept.** Readings, finishes, and donations are kept. Exclusions, abandons, and per-day page logs are deliberately not recorded, because simplicity beats completeness of history.
- **Re-reads.** A re-read is a new Reading of its own and counts again in stats. A lower current page is allowed, and the gauge simply follows it.

## Later backlog detail
Brainstorm rules for the §6.2 Later items, kept so whoever builds them doesn't have to rediscover them.

**Sequences**
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

**Reading time:** entered by hand only, with quick chips (+15m, +30m, +1h). It's approximate and just for fun, and it's used by Marathons. It's included in the export once it exists.

**Goals**
- Book-count goals and page goals.
- Page goals are proposed from Measured pace.
- A deadline goal becomes a daily pages/day target.
- One click resets a goal to a realistic target.

**Donation and the Past shelf**
- Donation applies to physical Books only.
- A Donation records a destination type (university, public library shelf, gift, or public place), a free-text note, and a date.
- A donated Book keeps its history and stats.
- A donated unread Book stays grayed out in its Sequences, and its pages are excluded from Sequence progress.
- Once Donation ships, the catalog shows each Book's Ownership and the catalog can be filtered by it.

**Wishlist:** a separate list, not an Ownership state. Buying a wishlisted book moves it into the catalog.

**Progress visuals:** a cover that fills with color to show progress:
- outline for a wishlisted book
- gray when unread
- filling while reading
- vivid when read

There's also a dust layer on long-unread Books, and a re-read badge.

**Smart shelves:** saved filters. A smart shelf can seed a Marathon pile.

**Card note export:** image or Markdown. (Anki export from the brainstorm was dropped: Card notes have no back side.)

**"What I can do now" wall:** a wall of fulfilled Purposes.
