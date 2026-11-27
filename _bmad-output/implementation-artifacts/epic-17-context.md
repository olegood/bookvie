# Epic 17 Context: See the Books behind the numbers

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stats tells Oleg how many Books and pages he finished in a range. It doesn't yet show which Books. Epic 17 adds a list under the chart with one row per finish in the chosen range (presets or Custom), newest first, and each row opens its Book. Pressing a month's or year's bar narrows the list to that period, and pressing it again widens it. The range and the selected bar live in the page's address, so Back from a Book returns to the same list. Agents get the same finishes from `get_stats`, so "what did I read last spring?" becomes a question Oleg can ask.

## Stories

- Story 17.1: See the Books finished in a range
- Story 17.2: Choose a month or year by its bar

## Requirements & Constraints

**What's listed:**
- Only finished Readings, one row per finish. A Book finished twice in the range has two rows.
- The row count always equals the books count, for the range or for the selected bar. A bar's rows also add up to its pages.
- Back-filled finishes (no start date) are listed. Side reads are not listed.
- No paging: All time sends every finish. An empty range shows no heading and no list, only the existing "No books finished in this range." or "No books finished yet."

**The two big numbers** always show the whole range, even while a bar is selected.

**History:**
- Every address change replaces the history entry and never adds one.
- Back from a Book restores the same range, bar and list, opens at the top and focuses the `h1`.
- Back from Stats leaves Stats in one step.
- Nothing is remembered between visits: a plain `/stats` and the nav link both open on This year with no bar, and nothing is written to `localStorage`.

**Bad addresses fall back quietly**, with no message and no announcement, and the address is replaced with what the page shows:
- An unknown `range`, or a Custom without two valid dates, opens This year.
- A reversed Custom is put in order.
- A `period` that isn't a bar with finishes in the shown range, or is the wrong kind (`YYYY` on a month chart), is dropped.

**Announcements** go to the polite `status` region, and only after the person's own press:
- A range change announces the range line.
- Selecting a bar announces "Finished in March 2026: 3 books.", where the count is the bucket's `books`.
- Widening announces the range line.
- Arrival, a fallback and a release after a refetch announce nothing.

**Out of scope:**
- Side reads in the list.
- The favourite star or "purpose fulfilled" on a row.
- New presets.
- Paging, sorting, filtering or exporting the list.
- A tooltip or popover on a bar.
- Behavior that only Safari or Firefox shows.

**Guards:**
- No new stored field, schema version, color or token.
- `tokens.css` is unchanged.
- New strings must pass `frontend/scripts/copy.test.mjs`: no "!", greeting or praise, and every `:hover` rule needs a `:focus-visible` twin. Bar keys are handled on the chart by key name, not on `window`.
- Axe passes on Stats in both themes.
- Existing tests change only where the epic gate in `epics.md` names them. Read that list before editing any test.

## Technical Decisions

**Server view.** `StatsView` gains a required `finishes: StatsFinish[]`:
- Fields: `{ readingId, bookId, title, firstAuthor, authorCount, coverFile, spineColor, finishDate, finishedPages, rating }`, read as stored.
- `readingId` is the row key, because one Book can finish twice on one day.
- A stored null `finishedPages` is sent as 0. `rating` is null when unrated, and `coverFile` is null without a cover.
- Order: `finishDate` newest first, then the server title key, then Book id, then the Readings' stored order. The order must be stable across fetches.
- The model is added in Python first. Then `npm --prefix frontend run api:gen` regenerates `schema.d.ts`, which is never edited by hand. Frontend and e2e fixtures carry `finishes`.

**Agent.** `get_stats` returns the view as is, `finishes` included. Only its description changes, and its text is Story 17.1's in `epics.md`. `backend/tests/agent_client.py` `_parse_descriptions` reads it there in place of Epic 12's line, as Epic 13's `export_backup` does. `AGENT_TOOL_NAMES` is unchanged.

**The client never sorts or counts finishes.** `components/StatsFinishedList.tsx` renders `finishes` in the view's order.
- Everything under the range picker renders from the one shown view and the range it was fetched for, never the address's range: the numbers, the bars, the heading and the list.
- While `keepPreviousData` shows the previous range's view, no bar is a button and the list isn't narrowed.
- A `period` is valid only if it equals a bucket's `period` with `books > 0` in the shown view. Narrowing keeps the finishes whose `finishDate` starts with the period.

**`lib/stats` builds the strings and parses the address:**
- Strings: the headings, the row `aria-label`, the bar names and the announcements.
- Address: it parses the search into `{ range, from, to, period }` and builds the whole search back.
- Reused from elsewhere: the author line is the catalog's ("and N others" from `authorCount`), and the stars use `lib/bookDetail` `starsLabel`.

**Stats address** (`range=thisMonth|thisYear|lastYear|allTime|custom`, `from`/`to` as `YYYY-MM-DD`, `period=YYYY-MM|YYYY`):
- A preset is kept by name, so This year next January means the new year.
- `StatsPage` reads the address with `useSearchParams`. Every write replaces the whole search (never a merge) and carries `lib/page`'s same-page marker, built once per user action.
- A plain `/stats` isn't rewritten until the first change.
- Custom's From and To text is page state, seeded from the address. The address is written only for a complete range in order (after the silent swap), with dates the server's `IsoDate` accepts (`0000-01-01` is refused). Until then the address, view and list keep the last committed range, and pressing Custom with empty fields writes nothing.
- The fallback applies on arrival: on mount and on every location change without the marker.
- `period` is checked only against a settled view, so `useStatsView` must report `fetching`. A failed refetch's kept copy counts as settled.
- If a refetch removes the period's books, the bar is released, the list widens and the address is replaced. Focus moves to the chart's Tab stop, else the `h1`.
- `period` is never sent to the server, which sees only `from` and `to`.
- A range change by the person clears `period`. A preset's dates moving to a new local day doesn't clear it.
- `StatsPage` owns every announcement. `StatsBars` and `StatsFinishedList` never announce.

**Same-page replace.** One `lib/page` function decides whether a change is a same-page replace: navigation type REPLACE and the marker present. The marker is ignored on mount, PUSH and POP, since `history.state` brings it back on Back, Forward and reload.
- On a same-page replace, `PageHeading` doesn't take focus and the page doesn't scroll. The `main.tsx` subscription stays subscribed and calls `markNavigated` only on changes that aren't same-page replaces.
- Every other change is a route change. `StatsPage`'s body gets a new key, which gives a fresh roving Tab stop and no announcement. The page scrolls to the top (`behavior: 'auto'`) and then the `h1` takes focus.
- The Stats `NavLink` in `components/AppShell.tsx` replaces while the path is `/stats`, so it resets to a plain `/stats` without adding a history entry.

**Bars (17.2).** In `components/StatsBars.tsx`:
- The chart becomes a `group` named "Finished by month" or "Finished by year" and is no longer `aria-hidden`.
- Each bucket with books is a toggle `button` with `aria-pressed`, and the chart is one roving Tab stop. At most one bar is selected.
- A range change releases the bar and forgets the last focused bar.
- The visually hidden table (Period, Books, Pages) stays, with every bucket.

## UX & Interaction Patterns

**Layout.** One left-aligned column, `{spacing.5}` between blocks: `h1` "Stats", the range picker, the two big numbers, the bars, the list's `h2` (with Show the whole range), then the list.

**Heading** (`h2`, `panel-heading`):
- Presets: "Finished this month", "Finished this year", "Finished last year", "Finished, all time".
- Custom: "Finished 1 February – 15 April 2026"; across a year end "Finished 1 December 2025 – 15 January 2026"; inside one month "Finished 3 – 17 March 2026"; a single day "Finished 14 March 2026".
- A selected bar: "Finished in March 2026" or "Finished in 2024".

**Row** (`{components.stats-finished-row}`): an `li` in an `ol` with no markers, holding one link to `/book/<id>`.
- Thumbnail: 44 × 64, `alt=""`, contained, with a hairline edge.
- Title in `book-title-sm` 600 `ink`, and the author in `body-sm` `ink-secondary`. Each is cut to one line with an ellipsis.
- End column: "Finished 14 Mar 2026 · 611 pages" ("1 page") in `meta` with tabular figures, then 14px stars 2px apart, filled `accent` and outlined `input-border`, never gold. The stars are one image named "4 stars" ("1 star").
- Unrated: no stars and no text, but the line keeps its height.
- No author: the title alone, vertically centered.
- Link name: "*Title*, Author, finished 14 Mar 2026, 611 pages, 4 stars". Unrated, the name ends at the pages. With no author, the author part is left out.
- Hover and `:focus-visible` underline the title only. The focus ring goes around the whole row.
- A missing or failed cover shows the read typeset cover with no text: the exact spine color, the typeset edge, and a plate 5px from the sides, 19px from the top and 18px tall. Under forced colors it is `Canvas` with a `CanvasText` border.

**Bars (17.2):**
- Name: "March 2026, 3 books, 912 pages" or "2024, 1 book, 304 pages", with grouped numbers ("1,204 pages").
- The whole column, from value to period label, is the click target.
- A bar with no finishes isn't focusable, and its text is `aria-hidden`.
- Tab lands on the last focused bar if it is still in the chart, else the selected bar, else the latest bar with finishes.
- Left and Right skip empty bars and don't wrap. Home and End go to the first and last. Up and Down do nothing. Enter and Space press.
- Focus stays on the bar after a press.
- Selected bar: the track's highlight ring, labels in `ink` at weight 600, and the focus ring 6px out.
- Other bars with finishes keep full-contrast labels, and only their fill drops to 0.35 opacity.
- Hover changes only the cursor, and nothing animates.
- Forced colors: no dimming, and the selected bar gets a 2px `Highlight` outline at offset 0.

**Show the whole range:**
- A link-styled `button` in `meta`, placed `{spacing.4}` after the heading's text. It is a sibling of the `h2`, so the heading's name stays the period.
- It shows only while a bar is selected.
- Pressing it widens the list and moves focus to the previously selected bar, which becomes the Tab stop.

## Cross-Story Dependencies

- Before Story 17.1, check that `deferred-work.md` has no unresolved "spine drift" entries. None were open on 2026-11-27.
- 17.2 builds on 17.1's `finishes`, list component, address plumbing, same-page marker and `useStatsView` `fetching`.
- 17.1 must not read or write `period`, and must leave the chart unchanged.
- 17.2 replaces the `stats-bars.spec.ts` locators that find the chart through `[aria-hidden="true"]` (`:77–81`, `:182`, `:236`) and keeps what they assert.
- 17.2 closes the epic. After it come automate, the Epic 17 retro and its before-next-epic items.
