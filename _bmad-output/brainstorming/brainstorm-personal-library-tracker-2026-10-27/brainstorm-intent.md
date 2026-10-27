---
topic: bookvie
type: brainstorm-intent
source: .memlog.md (brainstorm 2026-10-27)
---

# bookvie: Brainstorm Intent

## Problem / Goal
bookvie is a personal web-based library organizer and reading tracker. It replaces a paper reading diary where the user ticks off reading days. The user reads almost every day, but pace depends on workload, and missed days are heavy, tiring work days. The core failure it fixes is the urgency chain: an urgent work-driven book interrupts the current one, its context gets lost, re-reading feels like no progress, motivation drops, and the paused book is never resumed. The goal is to read consistently with explicit intent, see progress clearly, plan reading, and stop opening several books at once.

## Guiding Pillars
- **Visible progress**: the killer benefit over paper (percentage, gauge). Every real reading effort must visibly move something.
- **Conscious reading**: there are three intent touchpoints: a purpose at the start, a day type each day, and "fulfilled?" at the finish.
- **Simplicity**: less state = less stress. Removing a state also removes a failure signal.

## Core Domain Model
- **Book** (catalog entry, 1) -> **Readings** (0..n). Each Reading has its own progress, page/time logs, purpose, pause note and star rating.
  - A Book counts as read if any Reading finished. A full re-read is a new Reading. Progress lives on the Book/Reading, not on a sequence.
- **Book fields**: title, subtitle, pages, authors, ISBN, edition, year, type (paperback, hardcover, ebook, ...), plus language and publisher, which were added later. Only title and pages are required. A user-uploaded cover image is optional.
- **Reading slots**: exactly 1 **main book**, which is tracked, plus up to 3 **side reads**. Side reads are an untracked "also reading" marker: no logs, no stats, no nudges.
  - Promoting a side read to main asks "which page?" once. Tracking starts from there.
  - The reader always chooses the main book. Nothing auto-starts.
- **Start confirmation**: a deliberate step that shows the trade-off ("Start X? This pauses Y at p.120 (64%)").
- **Pause / Interrupt**: one concept. It covers put-back-on-shelf, urgent books and marathon start. Pause keeps the page reached. Anything can be paused, books and marathons alike.
  - **Up next**: one chosen next book. An interrupted main book returns here.
  - **Waiting for you**: a visible list of paused items, oldest first, with no cap.
- **Day types** (daily check-in, one tap = the tick): **Deep / Light / Cards / Rest**.
  - The reader picks the type. It is never inferred from pages.
  - Deep and Light open page logging, Cards opens card review, Rest only marks the day.
- **Reading calendar**: tracks the type of each day only. There is no streak or days-in-a-row metric, and it never resets.
- **Ownership**: owned / donated. Library is strictly the user's own (no borrowed books).
- **Donation**: physical formats only (not ebooks). It marks the book donated and keeps its history and stats.
  - The record holds a destination type (university, public library shelf, gift, public place) + a free-text note + a date.
  - A donated unread book stays in its sequences, greyed out, and its pages are excluded from sequence progress.
- **Sequences** (optional, for focus and fun; can be created as plans up front):
  - **Topic**: open-ended, no clock. Books can be skipped or reordered unless already read.
  - **Marathon**: a reading-time budget (e.g. 24h of total reading). It can be extended or paused. Overrun carries no penalty.
  - **Weekend sprint**: a calendar window (Sat to Sun), turned into a daily page target.
  - A book can be in many sequences. A book finished in any of them counts as read in all.
  - Dropping a book = exclude it from the sequence. No history of the exclusion is kept.
- **Reading time**: entered by hand only (quick chips like +15m/+30m/+1h). Approximate, for fun.
- **Audiobook listening**: logged against the owned book's pages. There is no audiobook format.

## v1 Scope (MoSCoW)

### Must
- Catalog (title + pages required, the rest optional and fillable later)
- Entry that works well with AI skills (stable form labels/selectors or a small API) + duplicate detection (ISBN/title)
- Book -> Readings model
- One main book with start confirmation
- Quick page logging for the main book with % and gauge
- Pause / put back on shelf
- Daily check-in: Deep / Light / Rest
- Reading calendar showing day types only (no streak count, never resets)
- Stats for any period

### Should
- Reading purpose: one sentence, "what do I need to be able to do with this knowledge?"
- Re-entry info (last page/note) + pages left shown as effort ("~7 evenings"). Delivered as in-app nudges on the next visit only.
- Up next + Waiting for you
- Side-read markers
- Flash cards (quote/note + page; sequential or shuffled review) + the Cards day type
- Simple finish ceremony: purpose fulfilled? yes / partly / not yet, then a 1-5 star rating per Reading
- Shelves, tags, filter, sort
  - Shelf = physical location, exactly one per book
  - Tags = free-form, many per book
- User-uploaded cover image on the main screen

### Could
- Goals: book-count **and** page goals. Page goals are proposed from measured pace, deadline goals become a daily page target, and one click resets to a realistic target.
- Sequences: Topic, Marathon (with recap card), Weekend sprint
- Donation + Past shelf view
- Wishlist
- Colour-filling cover as progress bar (wishlist outline, grey unread, filling while reading, vivid when read)
- Dust layer on long-unread books
- Smart shelves (saved filters, can seed a marathon pile)
- Author and publisher groups; publisher series
- Card shuffle across scopes; card export (image / Markdown / Anki)
- Review pages, resume with rewind, pause note
- Language stats; felt-vs-actual day-type stats
- "What I can do now" wall of fulfilled purposes
- Near-finish guard (advice, not a block)
- Re-read badge

### Won't
- Borrowed books
- Batch or in-app import (AI skills handle entry)
- Session timer
- Abandoned status (and history of abandons/exclusions)
- Audiobook format
- Email or browser push nudges

## Decisions (user, latest wins)
- Simplicity beats completeness of history.
- No abandoned status. Drop = exclude from the sequence. Standalone books use put back on shelf (pause).
- One main book, tracked. Up to 3 side reads, untracked. Only the main book counts toward goals and stats.
- The reader always chooses the main book. A sequence's next book is only suggested as Up next.
- Starting a marathon pauses the main book, which returns as Up next afterwards.
- No cap on paused items. The Waiting for you list is enough.
- A full re-read of a finished book is a new Reading. Re-reading is welcome.
- Reading time is entered by hand only. No penalty for marathon overrun.
- Catalog entry happens through the user's own AI skills.
- Ebooks can't be donated. Donation is for physical books only.
- A donated book keeps its history. A donated unread book stays greyed out in its sequences, with its pages excluded from progress.
- Strictly the user's own library. Ownership = owned / donated.
- Day type is the reader's own choice. Rest days may include card review.
- The calendar tracks day type only. No days-in-a-row metric. Nothing resets.
- Nudges are in-app, on the next visit only.
- Book-count goals stay, alongside page goals.
- Cover images are uploaded by the user.
- Shelf = one physical location per book. Tags = free-form, many per book.
- v1 must get right: quick page logging for the main book with visible progress.
- The MoSCoW buckets are accepted as drafted, with the resolutions above applied.

## Open Items
- The risk review (Black hat) was skipped by the user. One coach-raised risk is still open: if logging is slower than ticking a paper box, the diary wins on tired evenings.
- **Cards day type**: the Must check-in lists Deep/Light/Rest, while Cards is bundled with flash cards in Should. Cards ships only if flash cards ship.
- **Wishlist ownership state**: the coach suggested adding `wished` (wished/owned/donated). The user never confirmed it, and the earlier decision fixed ownership at owned/donated.
- **Language and publisher fields**: they were added through the user's language and filter ideas after the field list was decided. Their bucket was not set explicitly. Language stats are in Could.
- **AI-entry interface**: stable form selectors vs a small API is not decided.
- **Book type behaviour**: the only rule decided is that ebooks can't be donated. Whether type affects anything else, such as physical shelf assignment, is not decided.
