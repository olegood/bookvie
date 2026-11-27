---
name: bookvie
status: final
updated: 2026-11-27
design: ./DESIGN.md
sources:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
  - _bmad-output/planning-artifacts/catalog-tiles-plan-2026-11-13.md
  - _bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md
  - _bmad-output/planning-artifacts/catalog-sort-direction-plan-2026-11-15.md
  - _bmad-output/planning-artifacts/dev-prod-favicon-plan-2026-11-17.md
  - _bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md
  - _bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md
  - _bmad-output/planning-artifacts/card-note-boxes-plan-2026-11-23.md
  - _bmad-output/planning-artifacts/catalog-publisher-filter-plan-2026-11-25.md
  - _bmad-output/planning-artifacts/favourite-books-plan-2026-11-25.md
  - _bmad-output/planning-artifacts/stats-finished-books-plan-2026-11-27.md
---

# bookvie — Experience Spine

Behavior. Visual specs live in [DESIGN.md](./DESIGN.md) under the same component names. Terms (Book, Reading, Back-filled Reading, Main book, Side read, Pause, Up next, Waiting for you, Purpose, Catch-up, Bookcase, Spine color, Card note, Measured pace, Quick pace calculator) are used exactly as defined in the PRD glossary. "D*n*" citations below point to the change list in [prd-deltas.md](./prd-deltas.md); every delta is applied in the PRD as of 2026-10-29.

Mocks illustrate this spine; they are not the contract. If a mock and a spine disagree, the spine wins. Key screens: [Home](mockups/key-home.html), [Catalog](mockups/key-catalog.html), [Book detail](mockups/key-book-detail.html). Direction reference: [Birch Morning v2](mockups/birch-v2-light-dark.html).

## Foundation

- **Platform.** Web app in desktop Chrome on a desktop or laptop (DESIGN.md → Viewport; AGENTS.md → Supported browser). Minimum viewport 1024px; below that the page scrolls horizontally. No phone or tablet layout (PRD §6.3) (documented deviation: Accessibility Floor → Reflow).
- **UI system.** None named. Plain, semantic HTML controls styled by DESIGN.md tokens. Native elements (`button`, `input`, `select`, `dialog`) are preferred so roles and names come for free.
- **Local-first.** All data lives on this computer; no account, no network (PRD §5). No sync or connection status is shown; the Dropbox backup line on Backup (FR-29) reports the last backup run, not a connection. There is no loading indicator: before a page's first view response, only the header and nav render (no spinner, no skeleton). A view that can't be loaded shows "Couldn't load" (see State Patterns); a failed background refetch keeps the last data silently. The only busy states are Export and Restore (see Backup page). A save that fails is never silent (see State Patterns → Couldn't save).
- **One store, two operators.** The user's browsers and the agents' tools see the same data (PRD §5: a Book saved from any browser on this machine appears in every other; FR-28). One local server owns it (spine AD-1). UX rule for two open tabs, or a tab and an agent: last write wins; reloading shows the current data. No cross-tab warning is shown.
- **Production and development.** A server started with `--dev` is a development server; anything else is production (plan D3). The mode comes from the `app-info` view (`mode`, `version`, `dataDir`, `commit`), never from how the page was served. Production looks exactly as before Epic 11, apart from the favicon, the About this copy card and, after an update, the update notice. A development server adds three marks, so a dev tab can't be taken for the real library: the amber favicon, the `DEV · ` tab-title prefix and the DEV pill.
- **Theme.** Light · Dark · System toggle in the top nav. Default is System; the choice is remembered on this computer.
- **Users.** One person, who is also the builder. AI agents in Claude Code read and update the library through bookvie's agent tools (PRD FR-28), not through the UI; they have no screens here. Their words to the user are specified where it matters: the restore conversation (Agent conversations → Restore, FR-30).
- **Language.** UI is English only.
- **Dates.** Relative times ("today", "yesterday", "N days ago") count local calendar days. A timestamp in the future (clock change) shows as "today". Beyond 365 days: "over a year ago". Short absolute dates put the day first, as the Readings list does ("14 Aug 2019"): "19 Nov" in the current year, "19 Nov 2025" otherwise; times are local 24-hour ("09:02"). All relative times and the Home date recompute when the window regains focus or becomes visible, so a tab left open past midnight stays right.

## Information Architecture

Top nav, left to right: **Home · Catalog · Stats · Card notes · Backup**, theme toggle on the right. A "Skip to content" link comes first. No left rail. Implementation staging: until Home ships (Story 3.1), `/` opens Catalog and Home is not in the nav; Story 3.1 adds Home to the nav and makes it the launch page. Overlay stacking: see Interaction Primitives → One level of stacking.

### Pages

| Surface | Reached from | Purpose | Traces to | Journey |
|---|---|---|---|---|
| Home | App open; nav | Main book progress and actions, Up next, Waiting for you, On the side, bookcase slice, library meter, quiet status facts | FR-6–FR-11, FR-14, FR-21, FR-24; D14, D17–D19 | Flows 2, 3, 4, 6, 10 |
| Catalog | Nav | The whole library: bookcase, list or tiles, Search titles, Sort, filters, New book, library meter, "How long until…?" | FR-1–FR-4, FR-15, FR-20, FR-24, FR-25, FR-31; D14, D37 | Flows 1, 3, 5, 9, 15 |
| Book detail | A book title anywhere (Main book card, Home panes, List view row, catalog tile); "Open book →" in the spine popover; "Open book" in the "⋯" menu | One Book's metadata, favourite star, current Reading, its first Card notes with search and the pile, Readings, actions, per-Book pace, spine color | FR-1, FR-4–FR-9, FR-14, FR-15, FR-31; D31, D35 | Flows 1, 9, 10, 15 |
| Stats | Nav | Books finished and pages finished for a period, monthly bars, and the Books behind them: the finished list, narrowed to one month or year by its bar. The range and the selected bar are in the address. | FR-16; D3, D30; stats plan D1–D17 | Flows 7, 16 |
| Card notes | Nav (all Books, in the remembered view); a Card note box, "See card notes" on the Main book card or "See all card notes" on Book detail (scoped to one Book: the open box) | All Books as boxes, one per Book, or as notes grouped by Book; quick search that shows which boxes match and carries into a box and back; entry to the pile | FR-17–FR-19; D23, D43; card-note-boxes plan D1–D15 | Flow 6 |
| Backup | Nav | Export, Restore, "Last export", the Dropbox backup line, About this copy (version, mode, data folder) | FR-22, FR-23, FR-27, FR-29; D19 | Flows 7, 8, 11, 12, 13 |

The app shell (top nav, and the update notice under it) is on every page. The favicon, the dev tab title, the DEV pill and the update notice trace to FR-26 and FR-27 (Flows 11, 12).

Book detail is a page, not an overlay.

### Overlays

| Overlay | Opened from | Traces to | Journey |
|---|---|---|---|
| Spine popover | Click, Enter or Space on a spine (Home slice or Catalog) | FR-24, FR-31; D14 | Flows 1, 3, 15 |
| "⋯" menu | Main book card | FR-6; D35 | Flow 10 |
| New book panel | **New book** button on Catalog (and on the empty state); **Edit** on Book detail | FR-1, FR-2; D20, D28, D38 | Flows 1, 9 |
| Duplicate dialog | **Add book** or **Save changes** when FR-3 matches (over the New book or Edit book panel) | FR-3; D22, D39 | Flow 1 |
| Start dialog | Start reading or Resume anywhere | FR-5, FR-7–FR-9; D24, D33, D34 | Flows 3, 10 |
| Finish dialog | Entering the last page; **Mark finished** on Book detail | FR-14; D28, D31 | Flows 4, 9 |
| Card note panel | **Add card note** on the Main book card or Book detail; Edit on a note | FR-17 | Flow 6 |
| Pile | Card notes list or Book detail's Card notes block ("Go through as a pile", or opening a search result) | FR-18, FR-19 | Flow 6 |
| Confirm dialog | Restore; Delete book; Delete card note; Pause that displaces an Up next | FR-1, FR-6, FR-17, FR-23, NFR Data safety | Flows 8, 10 |

## Book states

A Book's state has four independent parts: **read-ever** (has a finished Reading), **Reading** (none, Main, paused), **Up next** (yes or no), **Side read** (yes or no). Precedence rules:

1. A re-read of a finished Book keeps its full-color spine and gets the Main-book marker.
2. A paused Book that is Up next shows **Resume** and appears only in Up next, never also in Waiting for you. Waiting for you means every paused Reading except the Up next Book's; its "(N)" count and the sand marker use the same definition.
3. The Start dialog names any Up next displacement (see Start dialog).
4. A Side read that becomes Main (or is finished) leaves On the side automatically.
5. One marker per spine, by priority: Main book, then Up next, then Waiting for you. Side read has no marker.

| State | Spine | Marker | Status in spine name | Popover primary | On Home |
|---|---|---|---|---|---|
| Never read, no Reading | Outlined | — | "not read yet" | **Set as Up next** (plus the "Start reading" link) | — |
| Never read, Up next | Outlined | sky | "not read yet, Up next" | **Start reading** | Up next |
| Never read, Main | Outlined in its color, filled to % | Main | "Main book, 64%" | none | Main book card |
| Never read, paused | Outlined | sand | "waiting for you, page 120" | **Resume** | Waiting for you |
| Never read, paused, Up next | Outlined | sky | "Up next, paused at page 120" | **Resume** | Up next only |
| Finished, no Reading | Full color | — | "finished" | none (re-read from Book detail) | — |
| Finished, Up next | Full color | sky | "finished, Up next" | **Start reading** | Up next |
| Finished, re-reading as Main | Full color | Main | "finished, re-reading, 12%" | none | Main book card |
| Finished, re-read paused | Full color | sand (sky if Up next) | "finished, waiting for you, page 40" | **Resume** | Waiting for you (or Up next only) |
| Any of the above, plus Side read | As above | As above | adds ", on the side" | As above; Start reading asks "Which page?" | Also in On the side |

**Book detail actions.** One `button-primary`: **Resume** (paused) or **Start reading** (no active or paused Reading, not Main; on a finished Book this starts a re-read); none for the Main book. Secondary, shown only when they apply: **Set as Up next** (not Main, not already Up next), **Pause** (Main only), **Mark finished** (Main, paused, or never finished), **Mark as Side read** or **Remove from side** (not Main), and always **Add card note**, **Edit**, **Delete**, in that order (DESIGN.md → Book detail). Always shown in the right column: the Card notes block, the Pace calculator, and **Change color**. **Edit Purpose** is a `link` beside the Purpose line in the Current reading block (active or paused Reading), not in the action stack.

## Voice and Tone

Microcopy. Brand voice lives in DESIGN.md → Brand & Style. A calm librarian: short, plain, factual. No exclamation marks, no praise, no guilt.

| Do | Don't |
|---|---|
| "Finished Thinking in Systems." | "Congratulations! You finished a book! 🎉" |
| "Last updated 3 days ago" | "You haven't read in 3 days" |
| "~7 days left" | "Only 7 days to go — keep it up!" |
| "Last export: 12 days ago" | "Warning: backup overdue" |
| "Start *X*? This pauses *Y* at p.120 (64%)." | "Are you sure you want to switch books?" |
| "*Z* returns to the catalog." or "*Z* stays on the side." | "Your previous Up next will be lost!" |
| "Couldn't save. Your data wasn't changed." | "Error! Save failed." |
| "Your shelf is empty. Add your first book." | "Welcome! Let's build your library!" |
| "Possible duplicate: *X* by *Author* is already in your catalog." | "Error: duplicate detected" |
| "Page must be between 0 and 330." | "Invalid input!" |
| Waiting for you shows the page ("p.120 of 330") | Elapsed time since pause ("paused 41 days ago") |
| No greeting. The Home header is the date. | "Good morning, Oleg" |
| "bookvie was updated to 1.2.0. Reload to use it." | "A new version is available! Please refresh now." |
| "DEV" | "⚠ DEVELOPMENT MODE — DO NOT USE" |
| "Dropbox backup: last upload on 19 Nov · 3 copies in Dropbox" | "⚠ Your library is not backed up!" |
| "Not restored. Nothing was changed." | "Restore cancelled by user." |
| "14 card notes in 4 Books contain “habit”." and a box's "3 of 12" | "Found 14 results!" or "3 matches" |
| "*Dune* is a favourite." | "Added to your favourites! ⭐" |
| "Finished in March 2026: 3 books." | "You read 3 books in March! 📚" |

## Component Patterns

Behavioral. Visual specs: DESIGN.md → Components, same names. Longer patterns follow the table as subsections.

| Component | Use | Behavioral rules |
|---|---|---|
| Top nav | Every page | `nav` landmark inside the `header`. Active item has `aria-current="page"`. "Skip to content" moves focus to `main`. |
| DEV pill | Top nav, dev server only | Plain text "DEV" inside the wordmark, after the word "bookvie"; not a control, not a link, not a Tab stop. The DOM puts a space between the word and the pill, so a screen reader reads the wordmark as "bookvie DEV". The pill appearing after `app-info` loads shifts the nav slightly to the right, once, on a dev server only; that's accepted. Shown once `app-info` says `mode: "dev"`; until `app-info` loads, or if it never loads, the header looks like production. |
| Tab title | Every page | Production: "*Page* — bookvie" as before. Dev server: "DEV · *Page* — bookvie" ("DEV · Catalog — bookvie"), on every route, Book detail included. The prefix follows the DEV pill's rule: it appears once `app-info` has loaded. |
| Favicon | Browser tab | The server picks it, so the tab is right from the first paint: sage on production, amber on a dev server (plan D5). Nothing in the page changes it. |
| Update notice | Every page, under the top nav | See [Update notice](#update-notice) below. |
| Theme toggle | Top nav | `role="group"` named "Theme" holding three toggle buttons (Light, Dark, System), `aria-pressed` on each; glyphs `aria-hidden`. Switching is instant; System follows the OS setting live. |
| Main book card | Home, when a Main book exists | Shows cover (or no-cover placeholder), title, author, edition only when it isn't 1, gauge, page field, re-entry line. The title is a link to Book detail. Actions: **Add card note** (opens Card note panel; the user stays on Home) and **See card notes · N** (opens Card notes scoped to this Book; accessible name "See card notes, 7 notes"; at 0 notes the label is just "See card notes"). Progress is only the page field. "⋯" button (name "More actions", `aria-haspopup="menu"`) opens a menu: **Pause** (see Book detail → Pause) and **Open book**. Arrow keys move within the menu; Esc closes it and returns focus to "⋯". |
| Page field | Main book card | Holds the absolute current page, prefilled with the last saved page; "of 330" is linked to the field by `aria-describedby`. **Update** (or Enter) saves. Saving takes at most two interactions after opening the app (focus is not auto-placed in the field, so a stray keypress never edits progress). Accepts whole numbers 0 to the Book's page count; a lower page than before is allowed and the gauge follows. Out-of-range or non-numeric: not saved, field keeps the typed value, `aria-invalid="true"`, inline message linked by `aria-describedby` and announced in the `alert` region. Entering the last page opens the Finish dialog; Cancel there leaves the Reading active at that page, and pressing **Update** again with the last page reopens the dialog. On save: gauge, percentage, re-entry line, and the Main book spine fill update together; the `status` region announces "Page 212 of 330, 64%." |
| Gauge | Main book card | Read-only progressbar: `aria-valuemin="0"`, `aria-valuenow` set to the page, `aria-valuemax` set to the page count, `aria-valuetext` "64%, page 212 of 330". The "p.N of M" label is the page last reached (FR-11). |
| Re-entry line | Main book card | Up to three muted facts. **"Last updated N days ago"**: time since the Reading's last progress update, which is set by every page save, by starting, and by resuming ("Last updated today", "yesterday", or "N days ago"); informational, never a warning, never colored. **"~N days left"**: pages left divided by Measured pace, rounded up to whole days, minimum "~1 day left"; hidden when there is no Measured pace, when Measured pace is 0, or when no pages are left. **"Last export: N days ago"**: see Backup page. |
| Measured pace | Re-entry line, Pace calculator | Total pages read in finished Readings, counted from each Reading's starting page and, after a resume at another page, from that page (pages skipped on a resume don't count), divided by total days from start to finish, counting days inclusively (a Reading started and finished the same day counts 1 day). Back-filled Readings (no start date) are excluded. With no qualifying Reading there is no Measured pace. |
| Section pane | Home side column | See [Section pane](#section-pane) below. |
| Library meter | Bookcase header on Home and Catalog | "X of Y finished": X is the number of Books with at least one finished Reading (back-filled included); Y is the number of all Books. Progressbar with `aria-valuetext` "24 of 73 finished". Updates the moment a Book is finished or added. |
| Bookcase | Home (slice), Catalog (full) | See section **Bookcase**. |
| Spine | Bookcase | A `button` in a list item, `aria-haspopup="dialog"`, `aria-expanded` while its popover is open. Accessible name: "*Title* by *First author*, *status*" — with more than one author, "by *First author* and N others". The name always carries the full title, even when the visible label is cut with an ellipsis. Status strings per Book states. When two spines in the bookcase (every Book, shown or hidden) would share a name, what tells them apart goes between the author part and the status, in rounds: "edition N", else the year ("no year" when missing), else "N pages", grouped ("1,412 pages"). A round touches only twins that differ in that field, and several qualifiers join with ", " ("Dune by Frank Herbert, edition 1, 1965, not read yet"); a spine with no twin keeps the plain name. A starred Book's name ends with ", favourite", after the status ("Dune by Frank Herbert, edition 1, 1965, finished, favourite"). Twins are found on the name without it, so starring one twin never changes another Book's name. Click, Enter or Space opens the Spine popover. |
| Spine popover | Spine | See [Spine popover](#spine-popover) below. |
| Favourite star | Book detail, Spine popover, Catalog tile, List view row; a mark on every spine | A toggle button that stars and unstars a Book. See [Favourite star](#favourite-star) below. |
| Catalog view toggle | Catalog toolbar | `role="group"` named "Catalog view": Bookcase (default) · List · Tiles, three toggle buttons with `aria-pressed`. Search, Sort and filters apply to all three views. The last view is remembered on this computer. |
| List view | Catalog | Table: Title, Author, Pages, Status, Date added. Column order fixed. The title in each row is a link to Book detail; the row's favourite star follows it in the same cell (see [Favourite star](#favourite-star)). Built for admin and cataloging checks. |
| Catalog tile | Catalog, Tiles view | See section **Tiles**. |
| Search field | Catalog; Card notes | Visible label "Search titles" (Catalog) or "Search card notes" (Card notes); the label is the accessible name; no placeholder. Filters as the user types, case-insensitive. On Catalog, matches by title (FR-4); non-matching spines, rows and tiles are removed (`hidden`) and the shelf closes up; the `status` region announces "N books match." after typing pauses (about 500 ms). Esc in a non-empty field clears it. No keyboard shortcut focuses it. On the Card notes page in Boxes view, nothing is hidden: boxes without a match fade instead (Card notes shelf → Search on the shelf). |
| Back to top | Catalog; Card notes | A `button` "↑ Back to top" (the arrow `aria-hidden`; accessible name "Back to top"), fixed in the bottom-right corner. Shown only while the page is scrolled more than one window height (`scrollY` > `innerHeight`), re-checked on scroll (at most once per frame) and on resize; otherwise it isn't rendered, so it is no Tab stop and no accessible node. In DOM order it comes after the page's content: the last Tab stop of `main`. A press (click, Enter or Space) scrolls to the top (smooth; an instant jump under `prefers-reduced-motion: reduce`) and moves focus to Search titles (Catalog) or Search card notes (Card notes) without cutting the scroll short, keeping its text. While it has focus it stays shown even back near the top (Home, PageUp, the wheel), so focus never jumps unasked and never falls to `body`; it goes once focus leaves it. No announcement: the focus move is the feedback. No keyboard shortcut; the Home key and the bookcase's roving focus are unchanged. On Card notes it works the same in Boxes and List views and on the open box. Not on Home, Stats, Backup or Book detail, nor on an empty catalog or Card notes without notes (no search field, no long page). The page leaves room for it at its end, so at the very bottom it covers nothing. Behind an open side panel or dialog it is covered with the rest of the page. |
| Sort select | Catalog toolbar | Native `select` labelled "Sort": **Author** (default), **Title**, **Date added**, **Pages**. Author sorts by the first listed author string with locale-aware collation (`Intl.Collator`); last-name sorting is out of scope. Each key has a natural direction: Author A–Z, Title A–Z, Date added newest first, Pages fewest first. The Sort direction toggle beside it reverses that direction. Ties go by title A–Z, then by the Book added earlier, in either direction: only the key's own order flips. The bookcase reorders its spines; the list reorders its rows; the tiles reorder too. The key and its direction are remembered on this computer and are shared with Home's slice. |
| Sort direction toggle | Catalog toolbar, right after the Sort select | A plain `button` whose text names the current order of the current key: Author and Title **A–Z** ⇄ **Z–A**; Date added **Newest first** ⇄ **Oldest first**; Pages **Fewest first** ⇄ **Most first**. A leading arrow is `aria-hidden`: ↑ in the key's natural direction, ↓ when reversed. The visible text is the accessible name, and there's no `aria-pressed`, because the label already states the order. The select and the toggle sit in a `role="group"` labelled by the visible "Sort" label, so the toggle is heard as part of Sort. Click, Enter or Space reverses the order in place: the bookcase, list and tiles reorder and focus stays on the button. The `status` region stays silent; the button's new name is the only feedback. It is the next Tab stop after the Sort select. It is shown only when the Sort select is (not on an empty catalog). Reversed is stored on this computer separately from the key. The direction is natural when its stored value can't be read, is empty or holds anything else, and when the stored key can't be read or isn't one of the four. A failed write still reverses for this visit. Choosing another key resets the direction to that key's natural one and remembers that, so a reload after a key change shows the new key's natural order. |
| Filter chips | Catalog toolbar | First, the **★ Favourites** toggle chip (`aria-pressed`, no popup; the star is `aria-hidden`, so the name is "Favourites"): when on, it shows only starred Books (favourite plan D8). It is a lone toggle button, not in a `role="group"`; it counts as its own group only for the AND rule, so it ANDs with Status and every other group. It is shown whenever the catalog has Books, even when none is starred. Then the groups: Status (**Read**, **Unread**), Type (**Paperback**, **Hardcover**, **Ebook**), **Language ▾**, **Tag ▾**, **Publisher ▾**. Chips are toggle buttons with `aria-pressed`; Language, Tag and Publisher open a checkbox list of the values that exist in the library. Language and Tag list them in alphabetical order. Publisher lists them by Book count, most Books first, with ties in alphabetical order, and each row shows its count after the name ("Manning 49"). The count is the publisher's Books in the whole library: other chips and Search titles change neither the numbers nor the order. A row's accessible name is its visible text plus the noun: "Manning 49 books", "Apress 1 book". All three lists treat values that differ only in case as one value, labelled with its first spelling in library order (Publisher plan D3–D6). Within a group, chips combine with OR; across groups, and with Search titles, with AND. Non-matching Books are hidden, not dimmed: the shelf closes up. "Clear filters" turns all off, Favourites included, and focus goes to the Favourites chip, the first chip. The `status` region announces "N books match." Filters are not remembered between visits, Favourites included, and they never apply to Home's slice or the library meter (favourite plan D9). |
| Book detail | Page | See [Book detail](#book-detail) below. |
| New book panel | Catalog; Book detail (edit) | See [New book panel](#new-book-panel) below. |
| Finished on | New book panel | Optional date field. Empty means the Book has not been read (the default, so cataloging never marks books read by accident). A date creates a finished Reading on that date with no start date (a back-filled Reading): the Book counts as read, its spine takes its color, Stats count it in that date's period, and Measured pace ignores it. Not in the future. In edit mode the field shows the Book's most recent finish date and editing it changes that date; clearing it is refused ("A finish date can't be removed here."): a finished Reading cannot be un-finished, and there is no "Remove this reading" action. Filling it on a Book with an active or paused Reading adds a past Reading and leaves the current one untouched. Whenever the Book has an active or paused Reading, a new or changed Finished on can't be after that Reading's start ("Finished on can't be after 1 October 2026, when the current reading started."). When the Book has another finished Reading, a changed Finished on can't be before that Reading's finish ("Finished on can't be before 14 August 2019, when an earlier reading finished."); the same day is allowed. |
| Tags | New book panel; Book detail | Free-text field, tags separated by commas. Typing shows a suggestion list of existing tags that start with the typed text (`combobox` with `listbox`; arrow keys and Enter pick, typing anything else is always allowed). Tags are trimmed; duplicates are merged ignoring case, keeping the first spelling. Book detail shows them as plain chips (not interactive). |
| Duplicate dialog | Over the New book panel | See [Duplicate dialog](#duplicate-dialog) below. |
| Start dialog | Anywhere a Reading starts or resumes | See [Start dialog](#start-dialog) below. |
| Finish dialog | After the last page is entered; **Mark finished** on Book detail | See [Finish dialog](#finish-dialog) below. |
| Card note panel | Home (Main book card), Book detail; Card notes list (edit) | See [Card note panel](#card-note-panel) below. |
| Card notes view toggle | Card notes toolbar, unscoped only | `role="group"` named "Card notes view": Boxes (default) · List, two toggle buttons with `aria-pressed`, like the Catalog view toggle. See [Card notes shelf](#card-notes-shelf) below. |
| Card note box | Card notes page, Boxes view | One per Book with notes; a link that opens the Book's open box. See [Card notes shelf](#card-notes-shelf) below. |
| Card notes count line | Card notes toolbar, Boxes view | The totals, or during a search the match sentence. See [Card notes shelf](#card-notes-shelf) below. |
| Open box strip | Card notes page, scoped | Decorative; shown once the view has loaded. Visual: DESIGN.md → Open box strip. See [Card notes shelf](#card-notes-shelf) below. |
| Card notes list | Card notes page, List view and the open box | All Books (List view): notes grouped by Book (serif titles), search across all Books with results still grouped. Scoped (the open box, reached from a Card note box, "See card notes" or Book detail's "See all card notes"): only that Book's notes, scope chip "In *X*" with a clear button that widens to all Books, search covers that Book only. Results update while typing, case-insensitive, matching text in `<mark>`, page ref shown; `status` announces "N notes match." after typing pauses. Each group has "Go through as a pile"; opening a result opens the pile at that note. Each note's page ref ("p.42") is a button that opens the pile in Page order at that note. Each note has Edit (Card note panel in edit mode), separate from the page ref. |
| Pile | Over Card notes or Book detail | See [Pile](#pile) below. |
| Pace calculator | Catalog (library scope), Book detail (Book scope) | Catalog: collapsed behind the link "How long until…?"; activating it expands inline (`aria-expanded`). One "pages/day" field, prefilled with Measured pace rounded to one decimal when one exists, else empty. Result updates as the user types, in an `output` element: duration and date ("About 9 months · July 2027"). Duration in days under 60 days, months under 24 months, years beyond: days = max(1, ceil(pages left ÷ pages/day)), months = round(days ÷ 30.4375), years = round(months ÷ 12). Under 60 days the date is a day and month ("About 12 days · 10 November"), with the year added only when it isn't this year, and 1 day reads "About 1 day"; months and years keep month and year ("July 2027"). The prefill drops a trailing ".0" (pace 20 → "20"). While the field's text is the prefill, the result uses the unrounded Measured pace, so Book detail agrees with Home's "~N days left" for the same Book (300 pages left at 100/3 is 9 days, where "33.3" would give 10; Epic 6 retro item 55). Any other text, "33.30" included, uses the number typed. When nothing is left to read, including an unfinished Reading at its last page: "Nothing left to read." in place of the field. Zero, negative, or non-numeric input: no result, no message. The `output` is not a live region (one polite `status` per page); the field is described by it (`aria-describedby`). Scopes per FR-15. The library scope counts every active or paused Reading, the Up next Book's included. |
| Stats range picker | Stats | Presets This month · This year · Last year · All time, plus Custom ("From", "To" date fields). Default This year. Presets end today: This month runs from the 1st to today, This year from 1 January to today; Last year is the full year. If To is before From, the two dates swap silently. All time starts at the earliest finished Reading, back-filled ones included; with no finished Readings it shows 0 books, 0 pages, no bars, and "No books finished yet." A finish counts by its local date. Changing the range instantly updates the numbers, bars and finished list and clears the selected bar (even when the chart switches between months and years); the `status` region announces "2 books, 610 pages." The range is kept in the address (Stats → Address). |
| Monthly bars | Stats | Two numbers: books finished, pages finished. One bar per month in the range, counting only finishes inside the range (a range from 15 March counts March from the 15th); over 24 months, one bar per year. Each bar has a text value. All of a Reading's pages count in the period it finished (FR-16), using the page count it finished with. Each bar with at least one finish is a toggle button that narrows the finished list to its period (Stats → Choosing a bar). The visually hidden table (period, books, pages) stays as the overview of every period, empty ones included. |
| Stats finished list | Stats, under the chart | The Books behind the numbers: one row per finished Reading in the range, or in the selected bar's period. See [Stats](#stats). |
| About this copy | Backup page, third card | A `section` labelled by its visible heading "About this copy", an `h2` under the `h1` "Backup". Production: "bookvie 1.1.0" and "Data folder: ~/bookvie-data". Dev server: "bookvie 1.1.0 (a1b2c3d) · Development server" and "Data folder: ~/bookvie-data-dev"; with no commit (no git or no checkout) the part in brackets is left out: "bookvie 1.1.0 · Development server". The commit is never shown in production. The data folder is written as the server sends it: with `~` for the home folder, and as a full absolute path when it is outside the home folder. Plain read-only text, with no copy button. The card shows once `app-info` has loaded; if it can't load, the card is left out silently and Export and Restore work as usual. |
| Backup page | Backup | **Export all data** builds one file (FR-22) and hands it to the browser's download. When Export or Restore takes longer than about 300 ms, its button reads "Exporting…" or "Restoring…" and is disabled until it finishes; there is no spinner. "Last export: today" is set only once the file has been built and handed over; the browser cannot confirm the file was kept. **Restore from file…** opens a file picker, then the Confirm dialog. The whole file is checked before anything is replaced. "Last export: N days ago" also appears on Home's re-entry line; "No export yet" before the first export. "Last export" and preferences (theme, Catalog view, sort and its direction, Add another, Card notes view) stay local: a restore neither brings nor replaces them. "Last export" is never a warning. The Dropbox backup line sits directly under "Last export" (see Dropbox backup line). |
| Dropbox backup line | Backup page, Export card, under "Last export" | One status line for the last Dropbox backup run (FR-29), from `views/backup`. Pattern **"Dropbox backup: *detail*"**; a failure says "failed" first, so the meaning never depends on style. Plain text: not a control, not a link, not a Tab stop, not a live region; it updates with the page's refetch on focus, and a change found that way isn't announced, like "Last export". Shown only on Backup, never on Home's re-entry line. States and wording: see Dropbox backup line below. |
| Confirm dialog | Restore, Delete book, Delete card note, Pause | `alertdialog`. Restore: "Replace all data with this file? Your current books, readings and card notes will be replaced." with **Replace all data** and **Cancel**. Delete book: "Delete *X*? Its readings and card notes are deleted too." with the Book's role when it has one ("It is your Main book.", "It is Up next.", or "It is waiting for you at p.120."), then **Delete book** and **Cancel**. After deleting, the app goes to Catalog; a vacated Main book or Up next stays empty (nothing is promoted automatically). Delete card note: see Card note panel. Pause: see Book detail. Cancel has default focus. For Delete book, Delete card note and Pause, if the save fails the dialog stays open and shows the couldn't-save `alert` line inside it, above its buttons (State Patterns → Couldn't save). Restore is the exception, because a restore can take a while: **Replace all data** closes the dialog and starts it, so its busy state ("Restoring…") and any failure or refusal show on the Backup page, as the `ink` line under **Restore from file…**, announced in `alert`, with focus back on that button. Nothing has changed, and the user can pick the file again. |
| Empty state | Home, Catalog (no Books) | Bare birch planks, "Your shelf is empty. Add your first book.", **New book** button. |
| No-cover placeholder | Main book card, Up next, Book detail | Stands in for a missing cover at the same size; not interactive; the Book's title is still given in text beside it. |
| Cover | New book panel | Image files only (JPEG, PNG or WebP), 20 MB or smaller. On upload the image is downscaled to a long edge of 1200px before it is stored, so a library of phone photos stays a manageable export. In edit mode, **Remove cover** clears an existing cover (see New book panel). |
| Focus ring | Every focusable element | Shown on keyboard focus (`:focus-visible`) and on an open spine; never suppressed. |
| Highlight ring | New spine or row; finish moment | Brief ring that fades over about 2 s; instant on and off under reduced motion. |
| Finish fill | Finished spine on Home's slice | See State Patterns → Finish moment. |

### Section pane

Use: Home side column.

- **Panes:** three, top to bottom. Each row's title is a link to Book detail, and each row's button opens the Start dialog. Buttons carry the title in their name ("Resume The Left Hand of Darkness").
- **Up next:** the single Up next Book, button **Start reading** (or **Resume** if it has a paused Reading).
- **Waiting for you (N):** every paused Reading except the Up next Book's, longest paused first (by paused-at date), no cap. The paused-at date orders the list but is never shown. Each row: title, mini bar, "p.N of M", and **Resume**. The mini bar is a progressbar named by the row title (`aria-labelledby`), with `aria-valuetext` "page 120 of 330, 36%".
- **On the side:** up to 3 Side reads. Each row: title, author, and **Start reading**, which opens the Start dialog with "Which page?".
- **Empty panes:** hidden, except Up next while a Main book exists ("Nothing up next."). With no Main book the Up next pane is hidden: the empty Main book card already suggests the Up next Book (see State Patterns).

### Update notice

The bundle knows the version it was built as; `app-info` says the server's.

- **When it shows:** the two versions differ, newer or older. When they are equal it never shows.
- **Content:** "bookvie was updated to *1.2.0*. Reload to use it.", where *1.2.0* is the server's version, and a **Reload** button.
- **What it follows:** the last successful `app-info`. The sentence names the newest server version seen; when a later refetch finds the bundle's own version again (a rollback to it), the notice hides. A failed fetch never shows it and never hides one already shown (the last data stays, Foundation). Because views refetch when the window regains focus, the notice appears when Oleg comes back to an old tab.
- **Never in the way:** not a dialog, not an `alert`; it blocks nothing, and the old tab keeps working until it's reloaded. No dismiss: it stays on every route until the tab reloads.
- **Reload:** reloads at once, without asking, like the browser's own reload; typing in an open panel or field is lost.
- **Place:** inside the `header` landmark, after the top bar, so it belongs to a landmark. Tab reaches **Reload** after the theme toggle and before the page; "Skip to content" skips it.
- **Announcement:** once each time the notice appears or names a new server version, unless another message is pending or the regions are emptied within the tick; then the band and **Reload** stay and it isn't retried. See Accessibility Floor → Live regions.

### Dropbox backup line

One signal: the latest report of the backup skill, which Oleg runs by hand (`/bookvie-backup`): an upload, a skip or an error (PRD FR-29). Until 2026-11-23 this was the five-state auto-backup line of a 09:00 job; the job was dropped (`sprint-change-proposal-2026-11-23.md`). The first row that matches wins:

| State | When | Line |
|---|---|---|
| Dev | Development server | "Dropbox backup: never from a development server" |
| None | No report yet, or the upload state can't be read | "Dropbox backup: none yet · run /bookvie-backup in Claude Code" |
| Failed | The latest report is an error | "Dropbox backup: failed *when* · *reason and fix*" (table below), then " Last upload *when*." if there has been one |
| Uploaded | The latest report is an upload | "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox" |
| Skipped | The latest report is a skip | "Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox" |

- **No time-out.** The line never turns into a warning because time passed; "when" says how old the copy is, like "Last export".
- **Unreadable state.** Upload state that is missing or can't be read counts as no report yet.
- **When.** "today at 09:02", "yesterday at 09:02", otherwise "on 19 Nov". Local calendar days, recomputed on focus like every relative time (Foundation → Dates).
- **Copies.** The number the last upload reported: "1 copy", "2 copies", "3 copies". It can be more than 3 when deleting the older copies didn't finish after a checked upload; the run still counts as an upload, and a later upload deletes the extras. The line shows the count with no note (no new state); the run report explains it. A skip keeps the last upload's count.
- **Failed reasons.** One or two sentences, from this list; every reason after the run reached Dropbox says what it left there. A failed run never deletes an older backup (plan D2), but an upload that didn't finish or didn't match may already have replaced that day's copy, so its reason says that copy may be damaged (AD-22, What a failure leaves). The skill reports a cause from this list (`record_backup_upload`'s fixed set of causes).

| Cause | After "failed *when* · " |
|---|---|
| Dropbox sign-in expired or revoked | "Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal." |
| Upload didn't match the file, or didn't finish | "the last upload didn't finish or didn't match. No older backup in Dropbox was deleted, but that day's copy there may be damaged; run /bookvie-backup again." |
| Dropbox is full | "Dropbox is full. Nothing in Dropbox was deleted; free some space there." |
| bookvie couldn't write the backup | "bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting." |
| Anything else | "the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting." |

- **Fixes in words.** A command is written in the sentence in the body font, not as code, and isn't a copy button. The guide (`docs/dropbox-backup.md`) has one troubleshooting entry per cause, with the same wording (plan D12).
- **Never a warning.** Failed is `ink`, like every failure line (DESIGN.md → `text-color-strong`); the other states are `ink-tertiary`, like "Last export" (DESIGN.md → Dropbox backup line). No color, icon or dot.
- **Manual export.** **Export all data** changes "Last export", never this line, and an upload never changes "Last export". A restore changes neither.
- **Can't load.** The line is part of `views/backup`: if that view can't load, the page shows "Couldn't load" as usual.

### Spine popover

Use: Spine.

- **Role:** non-modal `dialog` with `aria-labelledby` pointing at its title. Only one popover is open at a time.
- **Focus:** on open, focus moves to the primary action, else the first link, never the favourite star. Tab moves through its controls; Shift+Tab from the control focused on open reaches the star, and Shift+Tab from the star, or Tab from the last control, closes the popover and returns focus to the spine.
- **Closing:** Esc, outside click, ×, or focus leaving it; focus returns to the spine.
- **Favourite star:** a toggle button right after the title, named "Favourite", the first control in the popover's DOM (see [Favourite star](#favourite-star)).
- **Read-only details:** title, subtitle, authors, pages, year, status, current color ("Color: Teal, from cover", "Color: Sage" or "Color: set by you").
- **Primary action:** at most one, state-aware (Book states table). Set as Up next displaces the current Up next per FR-7 (hint "Replaces the current Up next." when one exists). Start reading and Resume close the popover and open the Start dialog.
- **Always shown:** the "Open book →" link and **Change color**: From cover (when a cover exists) plus the eight curated swatches named Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone, each a toggle button with `aria-pressed`; on unread Books labelled "· shown once read". Color changes save immediately and announce "Color set to Teal."

### Favourite star

Use: Book detail, Spine popover, Catalog tile, List view row; a mark on spines. One Book field, `favourite`, written only by its own intent. The star means "this Book had an impact on me". Any Book can be starred, read or not. It is not a rating: a Reading's rating stars stay sage, in the Readings and the Finish dialog. D-numbers in this subsection are the favourite plan's (`favourite-books-plan-2026-11-25.md`). Visuals: DESIGN.md → Favourite star. Mock: [epic16-options](mockups/epic16-options.html) (blocks 2–5; the spines win).

- **Control.** A `button` with `aria-pressed` (true when starred). The star icon is `aria-hidden`, and the button has no visible text, like "×" (Close) and "⋯" (More actions). Its name is stable (spine AD-17): "Favourite" on Book detail and in the Spine popover, where the Book is already named by the `h1` or the popover's title; "Favourite *Title*" on a Catalog tile and a List view row, so a list of buttons never reads "Favourite, Favourite, …" (Accessibility Floor → Names). The e2e tests find it by that name and match names exactly (`exact: true`, per the Form Names → Lookup rule), since "Favourite" is a prefix of "Favourites" (the chip) and of "Favourite *Title*". Twins' stars share a name ("Favourite Dune"); that's accepted, and tests reach a twin's star through its tile or row.
- **Where.**
  - **Book detail (the main place, D4):** right after the `h1` on the same line, always shown, starred or not.
  - **Spine popover (D6):** right after the title; see Spine popover.
  - **Catalog tile (D5):** at the top left of the tile's 2:3 cover box, opposite the finished ribbon. The button is a sibling of the tile's link inside the list item, never inside the link. Tab order: the tile link, then its star.
  - **List view row:** in the title cell, after the title link. Tab order: the title link, then its star.
  - **Spine:** a small star mark at the spine's foot on a starred Book, in the Bookcase on Catalog and Home's slice alike. It is not a control; the spine's accessible name says ", favourite" (Component Patterns → Spine) and the bookcase legend names the mark.
- **Outline shown only on hover or focus (D5).** On a tile or List row, a starred Book always shows its gold star. An unstarred Book's outline star is drawn only while the pointer is over the tile or row or focus is anywhere inside it (`:hover`, `:focus-within`), so 500 outlines never crowd the grid. The button is in the page and in Tab order all the time; only its drawing is hidden. Book detail and the Spine popover always show it. This is the one exception to the ban on hover-only affordances (Interaction Primitives).
- **Click, Enter or Space** sends the opposite of the value shown. Focus stays on the button.
- **Shown once saved (architecture AD-7).** Like every save, the star changes only after the save succeeds and the views have refetched; locally that is near-instant. There is no optimistic star and no rollback (Oleg, over plan D7). The save sends a value, not a toggle, and is idempotent: a second press before the refetch sends the same value again and changes nothing. The button is never disabled. Once the star changes, `status` announces "*Dune* is a favourite." or "*Dune* is not a favourite."
- **Couldn't save.** The star stays as it was, and `alert` says "Couldn't save. Your data wasn't changed." (State Patterns → Couldn't save). The line shows under the title row on Book detail and in an open Spine popover. On Tiles and List, or when the popover has closed, it shows once under the filter row, above the results; the page doesn't scroll to it. It is emptied at the next save attempt or filter change. Focus stays where it is.
- **With the Favourites chip on.** Unstarring a Book in the Catalog hides it once the refetch renders, as any filter does. Focus moves to the next remaining Book in sort order (its tile link, its row's title link, or its spine), else the previous one, else Search titles, and `status` announces "*Dune* is not a favourite. 11 books match." From the Spine popover, the popover closes with its spine and focus follows the same rule (Focus after close).
- **Never written by anything else (D2).** The New book panel in edit mode, **Save changes**, agents' `edit_book` and every other intent leave the star as it is. Agents can read it (`get_book`, `list_catalog`) but have no tool to set it (D11).
- **No count, no sort, no page.** Stats doesn't count favourites, Sort has no Favourites key, and there is no favourites page; with the chip on, Tiles is that page.

### Book detail

Use: page.

- **Heading:** the `h1` is the Book title. The favourite star button follows it on the same line, always visible, named "Favourite" (see [Favourite star](#favourite-star)).
- **Content:** metadata, cover, Tags, current Reading (status, gauge, Purpose), Readings (start, finish, stars, Purpose fulfilled). Back-filled Readings show "Finished 14 Aug 2019" with no start.
- **Actions:** visible per state; see Book states → Book detail actions.
- **Pause** (Main book only): pauses the Reading at its current page and records its paused-at date; per FR-7 it becomes Up next. If another Book is Up next, the Confirm dialog first states the displacement ("Pause *X* at p.150 (58%)? *Z* moves to Waiting for you.", "*Z* stays on the side." or "*Z* returns to the catalog.", the same line and rules as the Start dialog) with **Pause** and **Cancel**. Otherwise Pause applies at once and `status` announces "Paused *X* at p.150. It's Up next."
- **Set as Up next, Mark as Side read, Remove from side:** apply at once with no dialog; `status` announces the outcome (Accessibility Floor → Live regions). While another Book is Up next, **Set as Up next** carries the hint "Replaces the current Up next." under the button, on Book detail as in the Spine popover.
- **Edit Purpose** (when a Reading is active or paused): turns the Purpose line into a one-line field with **Save** and **Cancel**; Enter saves, Esc cancels. The field is optional with no length limit; surrounding whitespace is trimmed, and saving it empty clears the Purpose.
- **Mark finished:** opens the Finish dialog.
- **Mark as Side read:** When three Side reads already exist, **Mark as Side read** stays focusable with `aria-disabled="true"` and is described by the hint "Up to 3 side reads."
- **Edit:** opens the New book panel in edit mode over this page.
- **Card notes block** ("Card notes (N)"): the Book's first three notes in page order, each with Edit (Card note panel in edit mode). Each note's page ref is a button that opens the Pile, as in the Card notes list.
  - A **Search card notes** field searches this Book's notes in place. While it holds text, the block shows every matching note (not only three), with matching text in `<mark>`, and `status` announces "N notes match." after typing pauses. Esc clears it.
  - "Go through as a pile" opens the Pile over Book detail with this Book's notes; opening a matching note opens the pile at that note.
  - "See all card notes" opens the Card notes page scoped to this Book.
  - With no notes, the block shows "No card notes yet." and no search field or links.
- **Change color:** same control and rules as the Spine popover; the current-color line updates.

### New book panel

Use: Catalog; Book detail (edit).

- **Role:** modal side panel (`dialog`, name "New book"; "Edit book" in edit mode). Fields and buttons per Form Names.
- **Opening:** opens from **New book**; focus moves to Title. When opened from Home's empty state, the app first navigates to Catalog.
- **Submitting:** on every **Add book** or **Save changes** press, all rules in the validation table are checked.
- **Success (add):** the panel closes, `status` announces "Added *Title*.", and the Catalog scrolls the new spine into view in the current sort with the highlight ring.
- **Success (edit):** the panel closes, `status` announces "Saved *Title*.", and the page stays where it was.
- **Validation failure:** the panel stays open and nothing is saved (see State Patterns).
- **Closing without saving:** **Cancel**, **Close** (×) or Esc. If fields were typed in, closing discards them without a prompt.
- **Remove cover** (edit mode, when the Book has a cover): a button beside **Cover**. On **Save changes** the cover is cleared and its file deleted; the spine color falls back to the curated color unless the user set one (DESIGN.md → Spine colors).
- **Pages in edit mode:** setting Pages lower than the current page of an active or paused Reading, or lower than the highest Card note page, is refused (validation table). Finished Readings keep the page count they were finished with, so Stats never change retroactively.
- **Focus:** see Focus after close.

### Duplicate dialog

Use: over the New book panel (or the Edit book panel).

- **Role:** `alertdialog`, name "Possible duplicate". The description names up to three matching Books (title, author, ISBN) and "and N more".
- **Stacking:** while it is open the panel behind is `inert` (native `showModal()` stacking), so only the dialog's two buttons are exposed.
- **Don't add** (default focus): closes the warning and returns to the panel with every typed field kept; nothing is saved.
- **Add anyway:** saves as normal. There is no "Open existing".
- **Edit mode:** the same dialog over the Edit book panel, with **Don't save** (default focus; returns to the panel unchanged, focus on **Save changes**, nothing saved) and **Save anyway** (saves as normal).
- **Matching:** titles normalized per FR-3; authors compared ignoring case and surrounding spaces, as a set of semicolon-separated names; ISBNs compared after removing hyphens and spaces and converting ISBN-10 to ISBN-13. A match on title and author, or on ISBN, triggers it. In edit mode the check runs only when Title, Author(s) or ISBN changed.
- **Focus:** see Focus after close.

### Start dialog

Use: anywhere a Reading starts or resumes.

- **Role:** modal. Heading "Start *X*?" (or "Resume *X*?" for a paused Reading). Shown even with no Main book, because it carries the Purpose field.
- **Opening focus:** on "Which page?" when it is shown, else on Purpose.
- **Trade-off lines**, each shown only when it applies: "This pauses *Y* at p.120 (64%)." when a Main book exists; and, when that pause will displace an Up next *Z* that is not *X*: "*Z* moves to Waiting for you." (*Z* has a paused Reading), "*Z* stays on the side." (*Z* has none and is a Side read) or "*Z* returns to the catalog." (*Z* has none and is not a Side read).
- **Which page?:** a required number field whenever *X* is a Side read, by any route, prefilled with its paused page if it has one, else empty. A value equal to the last page opens the Finish dialog right after confirming.
- **Purpose:** optional field (one sentence, FR-9), prefilled with the existing Purpose when resuming.
- **Start reading** or **Resume** confirms: the previous Main book is paused (its paused-at date is recorded) and becomes Up next; the displaced Up next goes as stated. Starting a Side read removes it from On the side. Starting or resuming sets the Reading's "Last updated" to now. Starting a finished Book creates a re-read.
- **Cancel** or Esc: nothing changes.

### Finish dialog

Use: after the last page is entered; **Mark finished** on Book detail.

- **Role:** modal.
- **Opening focus:** on Finished on.
- **Finished on:** date field, prefilled today; not in the future and not before the Reading's start date ("Finished on can't be before 12 March 2026, when this reading started.").
- **Purpose fulfilled?:** radio group (yes · partly · not yet), only when the Reading has a Purpose, no option preselected.
- **Rating:** radio group: "No rating" (default), "1 star" … "5 stars"; arrow keys move, the selected stars fill.
- **Skipping:** both questions are skippable; skipping records no answer.
- **Done** records the finish (and the answers, if any). **Cancel** or Esc: nothing changes; a Main Reading stays active at the entered page.
- **Main book** (from the page field or Book detail): on Done the app goes to Home, the finish moment plays, and the Main book card switches to the no-Main-book state with Up next suggested.
- **Any other Reading** (paused, Up next, or a Book never started): on Done the user stays on Book detail, no finish moment plays, the Main book is untouched, the Book leaves Up next and Waiting for you, and `status` announces "Finished *X*."
- **No Reading:** a Book with no Reading gets a finished Reading with no start date (a back-fill).
- **Side read:** finishing a Side read also removes it from On the side.

### Card note panel

Use: Home (Main book card), Book detail; Card notes list (edit).

- **Role:** small modal styled as an index card.
- **Opening focus:** on Note.
- **Fields:** Note (required) and Page (required), prefilled with the current page (at least 1), or empty when the Book has no Reading.
- **Page format:** accepts "42", "42–45", "42-45", "42 – 45", with or without "p." or "pp."; "42–42" is stored as 42. Valid pages are 1 to the Book's page count. A reversed range ("45–42") is refused: "The first page must come before the last." More than one range is refused: "Use one page or one range."
- **Errors:** `aria-invalid`, message linked by `aria-describedby`, announced in `alert`.
- **Save note** saves and closes (unless Add another is on, below); the "See card notes · N" count (on Book detail, the Card notes block) updates; `status` announces "Card note saved." The user never leaves the page they were on.
- **While a save is out:** **Save note** (and **Delete** in edit mode) stay focusable with `aria-disabled="true"`, described "Saving the card note."; the label doesn't change, so this isn't a busy state (Foundation). Further presses, **Cancel** and Esc are ignored until the result is in.
- **Keyboard save:** Cmd+Enter or Ctrl+Enter in Note or Page does exactly what **Save note** does: the same checks, errors and focus, and a press while a save is out is ignored. Plain Enter in Note is still a new line; plain Enter in Page already saves. Works in add and edit mode. **Save note** carries `aria-keyshortcuts="Meta+Enter Control+Enter"`; there is no on-screen hint.
- **Add another** (add mode only): a checkbox under Page, off by default. Its state is remembered on this computer as soon as it changes, like the Catalog view, and is never part of an export or a restore. Storage that can't be read, is empty, or holds anything else means off; if the write fails, the box still toggles for this opening and no message is shown.
- **After a save with Add another on:** the panel stays open. Note empties, Page keeps exactly what was typed ("212–213" stays "212–213"), field errors and the couldn't-save line clear, focus returns to Note, and `status` announces "Card note saved." each time. The counts behind the panel update as after any save.
- **Running count:** after the first save in an opening, a line beside the checkbox reads "1 note saved", then "2 notes saved", and so on. It is plain text, not a live region (each save is already announced), and it starts empty each time the panel opens.
- **Cancel after saves:** the label stays **Cancel**. Cancel or Esc closes the panel and drops only the note not yet saved; the saved notes stay. No confirm, and nothing more is announced. Focus returns to the opener.
- **Add another off, or edit mode:** a save closes the panel as before. Edit mode shows no checkbox, so an edit save always closes, whatever the remembered choice. Failures never close the panel, whether Add another is on or off (State Patterns → Couldn't save).
- **Edit mode** ("Edit card note") adds **Delete**, which opens the Confirm dialog "Delete this card note?" with **Delete card note** and **Cancel** over the panel (one of the two allowed stacks; Interaction Primitives → One level of stacking). **Cancel** returns to the panel with focus on **Delete**; **Delete card note** closes both.
- **Focus:** see Focus after close.

### Pile

Use: over Card notes or Book detail.

- **Role:** modal, named "Card notes pile, *X*". One note at a time, its page ref below the text. Next takes focus on open, and the dialog's description reads the note, its page ref and "N of M". The pile has its own polite `status`, separate from the shell's regions; it is empty on open. Each move sets it to "Note 3 of 7, p.42: *text*", with no final period. A change of order restarts at "1 of M" and empties the status.
- **Controls:** Previous and Next buttons, "N of M", and an "Order" radio group (Page order · Shuffled; shuffle reorders once per change). "N of M" follows the current order.
- **Ends:** at the first and last note, Previous and Next stay focusable with `aria-disabled="true"`; there is no wrap. A pile of one note has both disabled.
- **Keyboard:** Left and Right do what Previous and Next do; Home and End go to the first and last note. They work wherever focus is in the pile except on the Order radios, where the arrow keys keep picking the order, and Home and End do nothing. A key held with Alt, Ctrl, Meta or Shift is left to the browser. Focus stays where it is; the move is announced like a button press ("Note 3 of 7, p.42: *text*"). At an end the key does nothing: no wrap and no announcement. Previous and Next carry `aria-keyshortcuts` ("ArrowLeft", "ArrowRight"). There is no on-screen hint.
- **Entry:** opening a search result, or activating a note's page ref in any Card notes list (Card notes page or Book detail's Card notes block), opens the pile in Page order at that note. To jump to a specific note, use its page ref or a search result.
- **Read-only:** editing happens in the list.
- **Closing:** a visible **Close** button (top right) and Esc both close it, returning to the list scrolled to the last viewed note.
- **Focus:** see Focus after close.

### Card notes shelf

Use: the Card notes page. Plan: [card-note-boxes-plan](../../card-note-boxes-plan-2026-11-23.md) D1–D15. The page keeps its name, its `h1` "Card notes" and its route; "Card note" stays the domain term. "The shelf" in this section means the Card notes page in Boxes view, not the bookcase. Mocks: [epic14-options](mockups/epic14-options.html) (Oleg's picks: fade A, paper cards, no edge) and the claude.ai canvas "Card notes boxes — mockups" (private, and not needed to build: this spine and epic14-options are enough). Where a mock and the spines differ, the spines win. The canvas shows a placeholder in the search field, puts the search sentence on its own line, puts the chip beside the `h1`, and uses a 32px column gap.

- **Two views.** The unscoped page has the **Card notes view** toggle: **Boxes** (default) · **List**. It sits in the toolbar right after Search card notes. It shows only on the unscoped page and only when at least one card note exists, never on the open box. A press switches the view in place. Focus stays on the pressed button, the search text stays in the field, and the other view applies the same search in its own way. `status` stays silent, because the pressed state is the feedback.
- **Remembered.** The view is stored on this computer as `bookvie.cardNotesView` (`"boxes"` or `"list"`) as soon as it changes, like the Catalog view. If the stored value can't be read, is empty or holds anything else, the page opens in Boxes. If the write fails, the switch still holds for this visit. The choice is never part of an export, and a restore neither brings nor replaces it.
- **List view** is the page as it was before Epic 14: groups, search, highlights, Edit, piles, Back to top (Card notes list).
- **Boxes view.** One Card note box per Book that has at least one card note, in the List's group order (title, then Book id; architecture spine AD-6), so switching views never reorders anything. Books without notes get no box. The boxes form a grid that wraps (DESIGN.md → Layout & Spacing → Card notes). With no card notes at all: State Patterns → No Card notes.
- **Card notes count line.** With an empty search field, the toolbar ends with "139 card notes in 9 Books" ("1 card note in 1 Book"; "12 card notes in 1 Book"). It's plain text, not a live region, and shows in Boxes view only. Like the toggle, it appears only once the view has loaded.
- **A box.** A link to the open box (`/card-notes?book=<id>`), one Tab stop per box in grid order. Click or Enter opens it. The front shows the Book's spine color and a label with the title (up to 2 lines, then an ellipsis) and "N card notes" ("1 card note"). Cards stick out of the top, and their number depends on the note count: 1 note shows 1 card, 2–5 notes 3 cards, 6–20 notes 5 cards, 21 or more 7 cards. The color and the cards are decorative. Accessible name: "*Atomic Habits*, 12 card notes". It always carries the full title, even when the label cuts it. No hover-only change.
- **The open box.** The scoped page as before Epic 14 (chip, Search card notes, **Add card note**, the notes, "Go through as a pile", Back to top), with two changes: the open box strip at the top (DESIGN.md → Open box strip), and no view toggle. The strip shows for a Book with no notes too, and only once the view has loaded: not before it, and not under "Couldn't load". It's decorative (`aria-hidden`), and the page's `h1` and chip still name the Book.
- **Search on the shelf.** Same field, same matching as the List: a note matches when its text contains the query, ignoring case, and a blank or spaces-only query counts as empty. While the field holds non-blank text:
  - A box with matches lifts slightly, and the pill "3 of 12" (matches of that Book's notes) replaces its count. "12 of 12" when every note matches.
  - A box without a match fades. It stays in place, stays a link and a Tab stop, and keeps a full-strength focus ring. Nothing is hidden, so the grid never reflows.
  - The count line becomes "14 card notes in 4 Books contain “habit”." ("1 card note in 1 Book contains “habit”."), updated as the user types. `status` announces the same sentence once typing pauses (about 500 ms). The sentences quote the trimmed text.
  - With no match, every box fades and the line reads "No card notes contain “habit”.", announced the same way.
  - Accessible names carry the match: "*Atomic Habits*, 3 of 12 card notes match", "*Atomic Habits*, 1 of 12 card notes matches", "*Refactoring*, 1 of 1 card note matches", "*Atomic Habits*, 12 of 12 card notes match", and, for a faded box, its visible count: "*Refactoring*, 4 card notes, no match" ("*Walden*, 1 card note, no match").
  - Esc in the field, or emptying it, brings every box back and restores the count line.
  - The lift and the fade animate only while the field's text changes (Interaction Primitives → Motion). When the page arrives already searched (a carried search) or the view switches from List to Boxes with text in the field, the boxes render in their search state at once.
- **Into a box with the search.** Opening a box while the field holds non-blank text opens the open box with that text in its field: only the matching notes show, with the matches in `<mark>`, exactly as if the text had been typed there. A faded box opens to "No card notes contain “habit”.", and its "Go through as a pile" stays, as on any open box with no match. Focus goes to the `h1` as after any route change. Once it has settled and the box's notes are refetched, `status` announces the count once, exactly as typing would ("3 notes match.", "1 note matches.", "0 notes match."); a stale copy of an empty box keeps the text until its notes are back. Typing, or opening Edit, Add card note or the pile, before then drops the announcement: only what the user did speaks.
- **Back out with the search.** Browser Back from the open box, or removing its "In *X*" chip, returns to the unscoped page in the remembered view. The field holds the open box's text at that moment ("habits" if the user changed "habit" there, empty if they cleared it), and the boxes are faded and lifted for that text. Focus goes to the `h1`, and once it has settled, `status` announces the view's own count once: the shelf sentence in Boxes, "N notes match." in List. The announcement waits for the refetched notes, so after an edit in the open box it counts the edited notes; typing or opening a panel before then drops it. The page opens at the top, as after any route change. Removing the chip carries the text whichever way the open box was entered. It pushes `/card-notes` as before Epic 14, so Back from there returns to the open box with an empty field.
- **Starts empty.** Every other way into the page starts with an empty field, as before Epic 14: the nav, a box opened with an empty field, "See card notes", "See all card notes", Back to the shelf from any other page, a reload (even of the same history entry), Forward, a typed URL. The search text never appears in the URL.

### Stats

The Books behind the numbers (stats plan D1–D17, FR-16). Visual specs: DESIGN.md → Components → Monthly bars and Stats finished list. Mock: [epic17-options](mockups/epic17-options.html), row R2 and bar B2.

- **What's listed.** Finished Readings only. A side read mark isn't a finish, so it is neither counted nor listed. There is one row per finish: a Book finished twice in the range has two rows, one for each date. The row count always equals the books count: the range's, or the selected bar's. Back-filled finishes are listed like any other. The newest finish comes first, and finishes on the same day are sorted by title. The server sends them in that order with the range (`StatsView.finishes`); the page neither sorts nor counts.
- **The row.** One `li` in an `ol`, holding one link to the Book's page.
  - **Shows,** in reading order: the cover thumbnail (or the typeset cover; the image is `alt=""`), the title, the author as the catalog writes it ("Frank Herbert", "Kent Beck and 2 others"), the finish date after the word "Finished", as Book detail's Readings write it ("Finished 14 Mar 2026"), the pages that finish added ("611 pages", "1 page"), and the Reading's rating as the same stars Book detail's Readings show: one image named "4 stars" ("1 star"). An unrated finish shows no stars and no "No rating" text. When the Book has no author, the author line is left out.
  - **Name.** Set with `aria-label` so it reads in one piece: "*Designing Data-Intensive Applications*, Martin Kleppmann, finished 14 Mar 2026, 611 pages, 4 stars". Unrated, it ends at the pages; with no author, the author part is left out.
- **Heading.** An `h2` directly above the list says what it shows: "Finished this month", "Finished this year", "Finished last year", "Finished, all time", or, for Custom, "Finished 1 February – 15 April 2026" ("Finished 1 December 2025 – 15 January 2026" across a year end, "Finished 3 – 17 March 2026" inside one month, "Finished 14 March 2026" for a single day). With a bar selected, it reads "Finished in March 2026" or "Finished in 2024".
- **Empty.** When the range has no finishes there is no heading and no list, only the empty line (State Patterns).
- **Choosing a bar.** Each bar with at least one finish is a toggle `button` with `aria-pressed`, named "March 2026, 3 books, 912 pages" ("2024, 1 book, 304 pages"; numbers grouped as everywhere, "1,204 pages"). The whole column, from its value to its period label, is the click target. A bar with no finishes is drawn as before, but isn't a button and can't be focused. The chart is a `group` named "Finished by month" ("Finished by year"), and is no longer `aria-hidden`; inside it only the bar buttons are exposed, and an empty bar's value and period text stay `aria-hidden` (the hidden table still lists empty periods).
  - **Keyboard.** The chart is one Tab stop (roving `tabindex`). Tab lands on the last focused bar if that bar is still in the chart; otherwise on the selected bar; with none selected, on the latest bar with finishes (Oleg). A range change forgets the last focused bar. Left and Right move to the previous and next bar with finishes, skipping empty ones, without wrapping. Home and End go to the first and last bar with finishes. Up and Down do nothing. Enter and Space press the bar.
  - **Pressing.** Pressing a bar selects it and narrows the list to that period; any other selected bar is released. Pressing the selected bar again widens the list to the range. Either way, focus stays on the bar. At most one bar is selected. The two big numbers keep showing the whole range; only the list narrows.
- **Show the whole range.** A `button` styled as a link, right after the heading and outside it (a sibling of the `h2`, so the heading's name stays the period), shown only while a bar is selected. Pressing it widens the list to the range and moves focus to the bar that was selected. That bar is no longer pressed and is the chart's Tab stop (Oleg, refining plan D10).
- **Announcements.** Selecting a bar announces "Finished in March 2026: 3 books." ("Finished in 2024: 1 book."). The count is the bar's books, not a count of rows. Widening, by the bar or by **Show the whole range**, announces the range's line ("12 books, 4,310 pages."), as a range change does. Opening Stats announces nothing, whether from the nav, a reload, Back, or a link with a range and bar in it.
- **Address.** The address is `/stats?range=thisMonth`, `thisYear`, `lastYear`, `allTime` or `custom`; Custom adds `from` and `to` (`YYYY-MM-DD`, in order after the silent swap); a selected bar adds `period=YYYY-MM` or `period=YYYY`. A preset is stored by its name, so "This year" next January means the new year. Every change replaces the current history entry and never adds one: Back from Stats leaves Stats in one step, and Back from a Book returns to the same range, bar and list. Nothing is kept on this computer (no `localStorage`): the range and bar live only in the address.
  - **Not a route change.** Replacing the address on Stats (a range, Custom dates, a bar) doesn't move focus to the `h1` and doesn't scroll the page. Arriving on Stats, Back from a Book included, is a route change: focus goes to the `h1` and the page opens at the top.
  - **Plain `/stats`.** Opens on This year with no bar, and isn't rewritten to `?range=thisYear`; the first change writes the address. The Stats nav link opens a plain `/stats` like any nav link, even from Stats, so it resets the range to This year and drops the bar.
  - **Bad address.** An unknown `range`, or a Custom without two valid dates, opens This year. A `period` that doesn't match a bar with finishes in the shown range, or is the wrong kind (`YYYY` on a month chart), is ignored. There is no message. The address is then replaced with what the page shows.
- **Agents.** `get_stats` returns the same `finishes` (plan D6).

## Bookcase

The bookcase is the library drawn as birch shelves of spines. It is atmospheric: a picture of the collection, not a map of the user's physical shelves (PRD "Shelves" stays Later). Spine visuals, sizing and colors: DESIGN.md → Spine, Spine colors. Mocks: [key-home](mockups/key-home.html) (slice, popover, finish end state), [key-catalog](mockups/key-catalog.html) (full bookcase).

- **Ordering.** Spines follow the Sort select and its direction (default Author A–Z), left to right, row by row. Never by physical location. Changing sort or filters reorders or closes up the shelf.
- **Read in color, unread outlined.** Per the Book states table. A read spine shows the book's exact color (user-set, from cover, or curated), never lightened or darkened for contrast, so a book keeps the color the user associates with it. Legibility comes from the fixed edge line and the label strip the title sits on (DESIGN.md → Spine colors), not from the fill; any color the user picks is accepted.
- **Markers.** One dot per spine (Book states rule 5); a legend under the bookcase names every visual state. A starred Book also has the star mark at its foot (Favourite star); it is not a marker, so a spine can have a dot and a star. The legend names it ("Favourite") and, like its other items, always shows it, even when nothing is starred.
- **Home slice.** Up to 3 shelf rows from the full bookcase in the remembered sort and direction, chosen in this order: the row holding the Main book, then the row holding the Up next Book, then rows with the most recent finishes, newest first. With fewer qualifying rows, the first rows of the bookcase fill the rest. Display order: the Main book's row first, then the other chosen rows in bookcase order. With no Main book, all chosen rows are in bookcase order. The slice recomputes when the window is resized. Filters never apply to the slice. The header carries the library meter and a "See all in Catalog" link. The slice never scrolls internally.
- **Catalog scale.** The full bookcase on Catalog handles about 500 Books (about 15 rows at 1280px). The page scrolls normally. Every spine is present in the page (lightweight elements, no lazy rows), so find-in-page and keyboard navigation reach all of them. The library meter stays one bar.
- **Highlight after add.** After **Add book** saves, the panel closes, the Catalog scrolls the new spine into view in the current sort, and shows the highlight ring briefly; instant under reduced motion. In List view the new row is highlighted the same way. If a search or filter would hide the new Book, it is cleared first.
- **Keyboard.** The bookcase is a `list` named "Bookcase, 73 books" (on Home "Bookcase slice, N rows" with the actual row count, for example "Bookcase slice, 3 rows"), each spine a button in a list item. It is one Tab stop (roving `tabindex`; Tab returns to the last focused spine). Left and Right move to the previous and next spine in sort order, crossing rows. Up and Down move to the spine in the row above or below whose horizontal center is nearest. Home and End go to the first and last spine of the bookcase. No type-ahead (Search titles does that job). Enter and Space open the popover. If the focused spine is filtered out or deleted, focus moves to its nearest remaining neighbor in sort order, or to Search titles when none remains. The same model applies to Home's slice, except that the arrow keys and Home/End follow the rows as displayed (Main book's row first), not bookcase order.
- **Ebooks** stand on the shelf like any Book.

## Tiles

Tiles show the library as a grid of covers, so the user can find a Book by its cover (FR-25). It is the third Catalog view, next to the bookcase and the list. Visuals: DESIGN.md → Catalog tile; layout: DESIGN.md → Layout & Spacing → Tiles. Mock: [key-catalog-tiles](mockups/key-catalog-tiles.html).

- **Ordering.** Tiles follow the Sort select and its direction, left to right, row by row, like spines. Search titles and the filter chips hide tiles that don't match (`hidden`), and the grid closes up. The same `status` counts are announced as in the other views.
- **Tile.** Each tile is one link to Book detail, covering the cover, the title and the author. Its only button is the favourite star, which sits over the cover's top left but is a sibling of the link in the list item, never inside it (Favourite star). There is no popover; the Spine popover belongs to the bookcase.
- **Name.** The link's accessible name is the spine's name: "*Title* by *First author*, *status*", with the same "and N others" rule, the same status strings (Book states table), the same twin disambiguation and the same ", favourite" ending. So the cut title and author never hide information, and status never depends on the ribbon or the bar alone. The cover image inside the link has empty `alt`; the ribbon and the reading bar are `aria-hidden`.
- **Status marks.** Finished ribbon: the Book has a finished Reading. Reading bar: the Book has an unfinished Reading (Main or paused), filled to its reading percentage, the same number as the spine fill and the gauge. A re-read shows both. Up next, Waiting for you and Side read have no mark of their own on a tile; they are in the name. The favourite star is a control, not a status mark (Favourite star).
- **Keyboard.** The grid is a `list` named "Tiles, 73 books", each tile a link in a list item and a normal Tab stop, in sort order (like the List view's title links), followed by its favourite star. Enter opens Book detail.
- **Covers.** Every tile is in the page (no virtual rows), so find-in-page and Tab reach all of them. Cover images load lazily as they near the viewport; the box keeps its size while they load, so nothing moves. A cover that fails to load is replaced by the typeset cover. With 500 Books with covers, the first screen of tiles appears in about 1 second (FR-25).
- **Highlight after add.** As in the bookcase: after **Add book** saves, the new tile is scrolled into view in the current sort, focused, and gets the highlight ring briefly (instant under reduced motion). If a search or filter would hide it, that is cleared first.
- **After a delete.** Back on Catalog, focus goes to **Search titles**, as in the other views.
- **Empty and no matches.** The same states as the bookcase and the list (State Patterns): the empty shelf with **New book**, "No titles match “query”.", and "No books match these filters." with "Clear filters", shown in place of the grid.
- **Remembered.** Tiles is remembered as the Catalog view on this computer, like the other two, and a restore neither brings nor replaces that choice.

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First run, no Books | Home | No Main book card, no panes. Empty state: bare planks, "Your shelf is empty. Add your first book.", **New book** (goes to Catalog, opens the panel). Library meter hidden. |
| No Books | Catalog | Same empty state; toolbar shows only **New book**. |
| Books, no Main book, Up next set | Home | The empty Main book card shows "No Main book." and the Up next Book with **Start reading** (or **Resume**), which opens the Start dialog. The Up next pane is hidden (the card already suggests that Book); Waiting for you and On the side show as usual. |
| Books, no Main book, no Up next | Home | "No Main book." and a link "Choose a book in the Catalog". The Up next pane is hidden. |
| Main book, no Up next | Home | Up next pane shows "Nothing up next." with a link to Catalog. |
| Waiting for you: none | Home | Pane hidden. |
| Waiting for you: one | Home | Heading "Waiting for you (1)", one row. |
| Waiting for you: many | Home | All rows, longest paused first, no cap; the side column grows and the page scrolls. |
| On the side: none, or 1–3 | Home | Hidden when none; otherwise rows. |
| Main book at page 0 | Home | Gauge 0%, "p.0 of M"; "Last updated" counts from the start. |
| Main book at its last page (finish cancelled) | Home | Gauge 100%; "~N days left" hidden; the spine keeps the Main-book marker so it still differs from a finished spine. **Update** with the same page reopens the Finish dialog. |
| No Main book, Last export | Home | "Last export: N days ago" moves to the right end of the Home header line. |
| Never exported | Home, Backup | "No export yet", muted. |
| No cover | Main book card, Up next, Book detail, catalog tile | No-cover placeholder; spine uses its curated color when read; "From cover" option absent in color pickers.. A catalog tile shows the typeset cover instead (DESIGN.md → Catalog tile); so does a tile whose cover image fails to load. |
| Validation error | New book panel | Nothing saved, panel stays open. Each invalid field: `aria-invalid="true"`, message linked by `aria-describedby` ("Pages is required."). `alert` region: "Not saved. 2 fields need attention: Pages, Language." Focus moves to the first invalid field. No red. |
| Validation error | Page field, Card note panel, Finish dialog, Start dialog | Inline message, nothing saved, value kept; `aria-invalid`, `aria-describedby`, message announced in `alert`. Messages: see Validation messages (other forms). |
| Couldn't save | Any save (New book panel, page field, Card note, color, favourite, Finish, Start, Pause, Set as Up next, Side read, Edit Purpose, delete) | The write to storage failed (storage full, unavailable, or cleared). `alert` region: "Couldn't save. Your data wasn't changed." in `ink`, one line below the action, never red. One-click buttons (Set as Up next, Mark as Side read, Remove from side) show the line directly below the button, with focus kept on it. Confirm dialogs (Pause, Delete book, Delete card note) show it inside the dialog above its buttons and stay open. Restore's Confirm dialog closes on confirm, so its couldn't-save line shows under **Restore from file…** instead (see Confirm dialog). The panel or dialog stays open with every typed value kept, so the user can retry. Nothing on screen claims a change that didn't happen. For where the favourite star's line shows, see Favourite star → Couldn't save. |
| Couldn't load | Any page | A view fetch failed before the page had any data. The page body shows "Couldn't load. Is bookvie still running?" in an `alert` region with a **Try again** button, never red. A failed background refetch keeps the last data on screen silently. Before the first view response, only the header and nav render. |
| Duplicate warning | New book panel | Duplicate dialog (Don't add, Add anyway; in edit mode Don't save, Save anyway). Don't add or Don't save returns to the panel unchanged. |
| Saved | New book panel | `status` "Added *Title*." (edit: "Saved *Title*."); highlight after add. |
| Search, no matches | Catalog | Empty shelf area with "No titles match “query”." and the count "0 books match." |
| Filters, no matches | Catalog | Empty shelf area with "No books match these filters." and a "Clear filters" link. |
| Favourites on, nothing starred | Catalog | The same "No books match these filters." with "Clear filters"; the chip is never hidden or disabled because nothing is starred. |
| Search, no matches | Card notes, List view or the open box | "No card notes contain “query”." |
| Search, no matches | Card notes, Boxes view | Every box fades; the count line reads "No card notes contain “query”." Nothing is hidden. |
| Search, some matches | Card notes, Boxes view | Matching boxes lift with "M of N"; the others fade; "14 card notes in 4 Books contain “query”." (Card notes shelf). |
| No Card notes | Card notes (all or scoped) | "No card notes yet." Scoped view adds an **Add card note** button. Unscoped: no view toggle, no count line, no boxes. The open box of a Book with no notes still shows its open box strip. |
| Carried search | Card notes, open box or unscoped | The field arrives holding the text carried in from the shelf or back from the open box, already applied; the count is announced once after focus settles (Card notes shelf). |
| No Card notes | Book detail | Card notes block shows "No card notes yet."; no search field, no pile or "See all card notes" links (**Add card note** is in the action stack). |
| Card notes search, no matches | Book detail | "No card notes contain “query”." inside the block. |
| Stats, empty range | Stats | Numbers show 0; bars empty, none of them a button; no finished list; "No books finished in this range." |
| Stats, All time, nothing finished | Stats | Numbers show 0; no bars; no finished list; "No books finished yet." |
| Stats, a bar selected | Stats | The selected bar is ringed and pressed, the other bars' fills are dimmed, and the list shows only that period under "Finished in March 2026" with **Show the whole range** (Stats → Choosing a bar). |
| Stats, bad address | Stats | Falls back quietly (Stats → Bad address); no message. |
| Restore, not a bookvie file or damaged | Backup | Refused before anything changes: "This file isn't a bookvie export, or it's damaged. Nothing was changed." |
| Restore, newer version | Backup | Refused: "This export is from a newer version of bookvie. Nothing was changed." |
| Restore, older version | Backup | Accepted; the data is migrated to the current format, then replaces the current data. |
| `app-info` not loaded yet, or never loaded | Every page, Backup | The header and title look like production, no update notice, no About this copy card; nothing says it failed. Everything else works. |
| `app-info` refetch failed after a success | Every page, Backup | The last data stays: the DEV pill, the `DEV · ` title, the About this copy card and any update notice keep showing as they were. Nothing says it failed. |
| Versions differ | Every page | Update notice under the top nav until the tab reloads. |
| Dropbox backup none, failed, uploaded, skipped | Backup | See Component Patterns → Dropbox backup line. |
| Restore done | Backup → Home | `status` "Restored." The app goes to Home with the restored data; focus on Home's `h1`. |
| Finish moment | Home shelf slice | After **Done** in the Finish dialog for the Main book, the slice first scrolls the finished spine into view if needed, then the spine fills with its color from its current fill to full, bottom to top, **about 600 ms ease-out**, with the highlight ring; then it stays solid. Under reduced motion the fill is instant. It **never replays** (not on reload, not on revisit). The library meter updates, and one quiet line "Finished *X*." appears in the bookcase header; it is gone on the next visit to Home. Once focus has settled (see Focus after close), the `status` region announces "Finished *X*. 25 of 73 finished." The Main book card switches to the no-Main-book state with Up next suggested. No sound, no confetti. |
| Finish moment, re-read | Home shelf slice | The spine is already full color: only the highlight ring plays. Header line "Finished *X* again."; the meter count does not change. |

### Validation messages (other forms)

Messages for forms outside the Form Names validation table. Each is shown under its field and announced in `alert`.

| Form | Field | Rule | Message |
|---|---|---|---|
| Main book card | Page field | 0 to the Book's page count | "Page must be between 0 and N." |
| Start dialog | Which page? | Required when shown | "Which page? is required." |
| Card note panel | Note | Not empty | "Note is required." |
| Card note panel | Page | Not empty | "Page is required." |
| Card note panel | Page | 1 to the Book's page count | "Page must be between 1 and N." |
| Card note panel | Page | A range runs from low to high | "The first page must come before the last." |
| Card note panel | Page | One page or one range | "Use one page or one range." |
| Finish dialog | Finished on | Not in the future | "Finished on can't be in the future." |
| Finish dialog | Finished on | Not before the Reading's start date | "Finished on can't be before *date*, when this reading started." |
| New book panel (edit) | Finished on | Can't be cleared once set | "A finish date can't be removed here." |
| New book panel (edit) | Finished on | Not after the current Reading's start (active or paused) | "Finished on can't be after *date*, when the current reading started." |
| New book panel (edit) | Finished on | Not before another finished Reading's finish (a changed date; the same day is allowed) | "Finished on can't be before *date*, when an earlier reading finished." |

## Interaction Primitives

- **Click, Enter or Space** activate. A spine opens its popover. A book title is always a link to Book detail; a row's button opens its dialog.
- **Esc** closes the topmost popover, menu, dialog, panel, or pile (focus per Focus after close). In a search field with text, Esc clears it first.
- **No character-key shortcuts.** Search titles is the first control after the nav on Catalog.
- **Enter in the page field** saves (same as **Update**).
- **Cmd+Enter or Ctrl+Enter in the Card note panel's Note or Page field** saves (same as **Save note**). A modifier with Enter isn't a character-key shortcut.
- **Outside click** closes the spine popover and the "⋯" menu. Modal dialogs and the side panel close only through their buttons, ×, or Esc.
- **One level of stacking.** Overlays stack at most one level above a panel, and only in two places: the Duplicate dialog over the New book (or Edit book) panel, and the Delete card note Confirm dialog over the Edit card note panel. A dialog opened from the spine popover or the "⋯" menu replaces it: the popover or menu closes first.
- **Motion.** Three intentional motions exist: the finish fill, the highlight ring and a Card note box's lift and fade over 150 ms while the shelf search changes. Panels, popovers, menus and dialogs appear with at most a 150 ms fade. Under `prefers-reduced-motion: reduce`, every transition and animation is off: the fill and ring are instant, panels and popovers appear without fading or sliding, a box's lift and fade are instant, the gauge and meters jump to their new value, and every scroll into view (new spine, finish moment, pile return), and the Back to top scroll, uses `behavior: 'auto'`.
- **Banned:** drag and drop, hover-only affordances (one exception: an unstarred Book's outline star on a tile or List row, which keyboard focus also shows; Favourite star), auto-starting any Reading, notifications outside the app, streak counters, greetings, confetti, red states, auto-playing animation on load.

## Accessibility Floor

Behavioral. Visual contrast lives in DESIGN.md → Colors.

- WCAG 2.2 AA target, both themes, with two documented deviations (Reflow and faded Card note boxes, below).
- **Structure.** `header` (with `nav`), `main`, and one `h1` per page ("Home" visually hidden on Home; "Catalog", "Stats", "Card notes", "Backup"; the Book title on Book detail). Each route sets `document.title` ("Catalog — bookvie"; "DEV · Catalog — bookvie" on a dev server). On a route change, focus moves to the new page's `h1`. A "Skip to content" link is the first focusable element.
- **Keyboard.** Every action is reachable and operable by keyboard. Tab order follows reading order: top nav → **Reload** in the update notice, when shown → page content left to right, top to bottom. The bookcase is one Tab stop with arrow-key movement (see Bookcase → Keyboard), and so is the Stats chart (Stats → Choosing a bar).
- **Focus.** Visible sage focus ring on every focusable element, never suppressed; spines use the two-tone ring. Dialogs trap focus. Controls that can't act right now stay focusable with `aria-disabled="true"` and a description saying why, never natively disabled (except the Export and Restore busy state).
- **Esc.** See Interaction Primitives → Esc.
- **Names.** Every control has a visible label, and its accessible name is exactly that label, or starts with it when it adds the Book title ("Resume The Left Hand of Darkness"). Markers such as "(required)" sit outside the label element; requiredness is exposed with `required`. Spines carry full title, author, and status in their names, so a label cut with an ellipsis never hides information. Catalog tiles carry the same names as spines. The favourite star has no visible text; its name is "Favourite", or "Favourite *Title*" on a tile or List row (Favourite star). A Stats bar shows only its page total and a short period ("912", "Mar"); its name spells them out ("March 2026, 3 books, 912 pages", stats plan D9), which is an accepted exception to "starts with the label". Toggle groups have group names ("Theme", "Catalog view", "Card notes view", "Order"), and the Sort select with its direction toggle is a group named "Sort". A Card note box's name starts with the Book's full title and says its count, or during a search its match ("*Atomic Habits*, 3 of 12 card notes match"; "*Refactoring*, 4 card notes, no match"), so the fade never carries meaning alone.
- **Live regions.** One polite `status` region per page for outcomes (page saved, book added or saved, Card note saved, finished, paused, set as Up next, side read added or removed, color set, favourite set or cleared, search and filter counts, Stats totals, a Stats bar selected or released, restored). One-click actions announce: "*X* is Up next." (Set as Up next), "*X* is on the side." (Mark as Side read), "*X* is off the side." (Remove from side), "Paused *X* at p.120. It's Up next." (Pause without a Confirm dialog). After them, focus moves to Book detail's `button-primary` (its `h1` when there is none); from a spine popover, focus returns to the spine. One `alert` region for blocking outcomes (validation failure, couldn't save). Before every save attempt and when a panel or dialog opens, both regions are emptied; new text is set after a short tick (about 100 ms), so repeated identical messages are announced again and old text is never mistaken for a new outcome. Messages that follow a focus change are set after focus has settled. The Duplicate and Confirm dialogs are `alertdialog`. The update notice is announced once, through the polite `status` region, with its sentence, when it first appears in a tab; a refetch that finds the same server version doesn't announce it again, and a later, different server version announces the new sentence once. The notice element itself is not a live region. Two cases go unannounced, and the announcement isn't retried for that version: another message is already pending in the tick (the notice yields to it), or the regions are emptied within the tick, by any later message or by a panel or dialog opening (for example a save whose own refetch finds the new version: the save's message replaces the notice's). That's accepted, because the notice stays on screen and **Reload** is a Tab stop.
- **Progress.** Gauge, library meter, and mini bars are progressbars with `aria-valuemin`, `aria-valuemax`, and text values; markers never carry meaning by color alone.
- **Reduced motion.** Global rule in Interaction Primitives → Motion.
- **Forced colors.** Read and unread spines, fills and markers stay distinct (DESIGN.md → Colors → Forced colors).
- **Reflow — documented deviation from WCAG 2.2 SC 1.4.10.** bookvie is desktop-only with a 1024px minimum width; below that, including at 200–400% zoom, pages scroll horizontally instead of reflowing. The user accepted this deviation: bookvie has one user, who is also the builder, and PRD §6.3 lists phone layouts as Won't. The spine popover is still capped at the viewport width minus 32px.
- **Faded Card note boxes — documented deviation from WCAG 2.2 SC 1.4.3.** During a shelf search, a box without a match shows at 0.38 opacity, so its title and count fall below 4.5:1 (DESIGN.md → Colors → Contrast). The user picked this fade over two options that pass AA (Oleg, 2026-11-23). What still holds: a faded box stays a link and a Tab stop, its focus ring is never faded, its accessible name says "no match", a matching box differs by its "M of N" pill and lift as well as by opacity, and the count line states the totals in text. Esc or an empty field brings every box back to full strength. The deviation covers forced colors too, where the fade still applies.
- **Every outcome is announced.** Every outcome of the add-book form — saved, duplicate warning, validation error, couldn't save — is exposed by role, accessible name, and live-region text, not only by visual cues. Names: Form Names.

### Focus after close

When a panel, dialog, popover or menu closes, focus goes to:

| Closed | Outcome | Focus goes to |
|---|---|---|
| New book panel | Added | The new spine (its row is in the page before focus moves); List view: the new row's title link |
| New book panel (edit) | Saved | **Edit** on Book detail |
| New book panel | Cancel, Close or Esc | The opener (**New book** or **Edit**) |
| Duplicate dialog | Don't add | Title field in the panel |
| Duplicate dialog | Add anyway | As "Added" |
| Duplicate dialog (edit) | Don't save | **Save changes** in the panel |
| Duplicate dialog (edit) | Save anyway | As "Saved" |
| Spine popover | Any close | Its spine |
| Spine popover | Unstarred with Favourites on (the spine is hidden) | The next remaining spine in sort order, else the previous, else **Search titles** |
| A dialog opened from the popover | Cancel or Esc | The originating spine, or its nearest neighbor if it is gone |
| "⋯" menu | Esc or outside click | "⋯" |
| Start dialog | Confirmed | Home, the Main book title link (the app navigates to Home if needed) |
| Start dialog | Cancel or Esc | The opener |
| Finish dialog (Main book) | Done | Home, **Start reading** for the suggested Up next; else the "No Main book." heading |
| Finish dialog (other Reading) | Done | Book detail `h1` |
| Finish dialog | Cancel or Esc | The page field, or the opener on Book detail |
| Pause | Done (from Home) | **Start reading** or **Resume** in the empty Main book card |
| Pause | Done (from Book detail) | **Resume** on Book detail |
| Card note panel | Save (Add another off, or edit mode) or Cancel | The opener (**Add card note** or the note's Edit) |
| Card note panel, Add another on | Saved (the panel stays open) | Note, now empty |
| Confirm, Delete book | Deleted | Catalog, **Search titles**; when the Catalog is now empty, the empty state's **New book** |
| Confirm, Delete card note | Deleted | Closes the Edit card note panel too; the next note's Edit button, else the group heading |
| Confirm, Delete card note | Cancel or Esc | **Delete** in the Edit card note panel |
| Confirm, Restore | Restored | Home `h1` |
| Any Confirm | Cancel or Esc | The opener |
| Pile | Close or Esc | The last viewed note's Edit button if the list shows it (a search, or Book detail's first-three cut, can hide it), else that Book's "Go through as a pile" (on the Card notes page a search can hide the whole group), else the page `h1` |
| Anything whose opener no longer exists | — | The page `h1` |

## Form Names

Formerly the Agent Label Contract. Since 2026-11-19 agents use the agent tools (PRD FR-28) and no agent drives these forms (FR-2 retired; spine AD-17). This table is the single source for the labels, accessible names and roles of the New book panel, the Duplicate dialog and Search titles; the e2e tests find these controls by them. Renaming one is an ordinary change: this table, the component and the e2e tests change together. Other controls (for example, the Pile's Close) follow Accessibility Floor → Names. Mock of the panel and the Duplicate dialog: [key-catalog](mockups/key-catalog.html) (Alternates B1, B2).

**Lookup rule.** The tests match labels **exactly** (for example, Playwright `getByLabel('Title', { exact: true })`). Substring matching is not supported: "Title" must never match "Subtitle". The accessible name of every field is exactly its label below; "(required)" is outside the label.

| Label / accessible name | Element | Role | Required | Notes |
|---|---|---|---|---|
| New book | Catalog button that opens the panel | `button` | — | Also on the empty state. Distinct from the submit button. |
| New book / Edit book | The panel | `dialog` | — | Name changes in edit mode. |
| Title | Field | `textbox` | Yes | |
| Subtitle | Field | `textbox` | No | |
| Pages | Field | `spinbutton` (`input type=number`) | Yes | Whole number, 1 or more. Page count, ebooks included. |
| Author(s) | Field | `textbox` | Yes | One field. Several authors separated by semicolons ("Ursula K. Le Guin; Brian Attebery"). |
| Edition | Field | `spinbutton` | Yes | Whole number, 1 or more. Prefilled 1. |
| Language | Field | `textbox` | Yes | Free text. |
| Publisher | Field | `textbox` | Yes | |
| Type | Field | `combobox` (native `select`) | Yes | Empty first option; then exactly "Paperback", "Hardcover", "Ebook". |
| ISBN | Field | `textbox` | No | Hyphens and spaces allowed. |
| Year | Field | `spinbutton` | No | Year of the edition. |
| Finished on | Field | date (`input type=date`) | No | Empty means not read. A date (`YYYY-MM-DD`) creates a finished Reading on that date. Not in the future. |
| Tags | Field | `combobox` (text input with suggestions) | No | Comma-separated free text. |
| Cover | Field | file input (`input type=file`) | No | Image file: JPEG, PNG or WebP, 20 MB or smaller. |
| Remove cover | Edit book panel, beside Cover | `button` | — | Edit mode only, when the Book has a cover. Clears the cover on **Save changes**. |
| Spine color | Field | `textbox` | No | `#RRGGBB` or empty (empty means automatic: cover-derived or curated). Stored and shown exactly as entered; no contrast adjustment. |
| From cover; Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone | Swatch buttons beside Spine color | `button` with `aria-pressed` | — | Shortcuts that fill Spine color (From cover empties it). From cover only when a cover exists. |
| Add book | Panel submit (new) | `button` | — | |
| Save changes | Panel submit (edit) | `button` | — | |
| Cancel | Panel footer | `button` | — | Closes the panel without saving. The only "Cancel" exposed while the panel is open. |
| Close | Panel × | `button` | — | Same as Cancel. |
| Don't add | Duplicate dialog | `button` | — | Closes the warning; typed fields kept; nothing saved. |
| Add anyway | Duplicate dialog | `button` | — | Saves despite the match. |
| Don't save | Duplicate dialog (edit) | `button` | — | Default focus. Returns to the Edit book panel unchanged; nothing saved. |
| Save anyway | Duplicate dialog (edit) | `button` | — | Saves the changes despite the match. |
| Search titles | Catalog search | `searchbox` | — | Visible label. Used after saving to confirm the Book exists. |

Validation rules and messages (each shown under its field and listed in the `alert` text):

| Field | Rule | Message |
|---|---|---|
| Any required field | Not empty | "*Label* is required." |
| Pages | Whole number, 1 or more | "Pages must be a whole number, 1 or more." |
| Pages (edit) | At least the current page of an active or paused Reading | "Pages can't be less than 300, the page you're on." |
| Pages (edit) | At least the highest Card note page | "Pages can't be less than 270, where a card note is." |
| Edition | Whole number, 1 or more | "Edition must be a whole number, 1 or more." |
| Year | Four digits, not after next year | "Year must be a year, like 1965." |
| ISBN | 10 or 13 digits (last may be X) after removing hyphens and spaces | "ISBN must have 10 or 13 digits." |
| Finished on | A valid date, not in the future | "Finished on can't be in the future." |
| Spine color | `#RRGGBB` or empty | "Spine color must be #RRGGBB or empty." |
| Cover | An image file | "Cover must be an image file." |
| Cover | JPEG, PNG or WebP | "Cover must be a JPEG, PNG or WebP image." |
| Cover | 20 MB or smaller | "Cover must be 20 MB or smaller." |

Outcome signals (all within the page, no visual inspection needed; the e2e tests and a screen reader rely on them). Both live regions are emptied at each **Add book** press, so any text present afterwards belongs to this attempt.

- **Panel open:** `dialog` named "New book".
- **Saved:** panel closes; `status` text "Added *Title*.". To verify, a test types the title into **Search titles** and looks for a spine whose accessible name begins "*Title* by", or a List view row whose title equals *Title* exactly. It does not rely on the match count (a search for "Dune" also matches "Dune Messiah").
- **Duplicate:** `alertdialog` named "Possible duplicate"; its description names the existing Book(s); the panel behind is inert.
- **Validation error:** panel stays open; `alert` text "Not saved. N fields need attention: …"; each failing field has `aria-invalid="true"` and a described-by message.
- **Couldn't save:** panel stays open with all values; `alert` text "Couldn't save. Your data wasn't changed."

**Changing a name.** Renaming, removing, or changing the role of any entry above, or an outcome signal's role or name, updates this table, the component and the e2e tests in the same change. No changelog note is needed: no agent depends on them (spine AD-17). Visible label and accessible name always stay identical.

## Key Flows

### Flow 1 — Catalog a shelf (UJ-1)

Oleg, Thursday evening, 20 books from the hallway shelf.

Mock: [key-catalog](mockups/key-catalog.html).

Precondition: bookvie is running, and Claude Code has the `bookvie` agent tools (PRD FR-28). The catalog holds 54 Books, 23 of them finished.

1. Oleg stacks 20 books by the laptop, asks Claude Code to add them with the `bookvie-new-book` skill, giving it each book's store link, and goes to make dinner.
2. For each book the skill looks up its metadata and front cover, then checks the catalog with `find_book` (title and ISBN).
3. It calls `add_book` with the fields and the cover's web address. bookvie downloads the cover and saves the Book; the skill reads it back with `get_book` and reports it in the terminal.
4. Book 14 is a second copy of a book already cataloged. `find_book` returns it, and `add_book` would be refused with `duplicate_book`. The skill shows Oleg the match in the terminal and adds nothing; it moves on to book 15.
5. Book 17 has no page count on its store page. The skill adds it with the placeholder page count and the `0-pages` tag, as the skill's own rules say, so Oleg can fill it in later.
6. Book 19's cover address answers with an error page. `add_book` is refused on `coverUrl` and nothing is saved; the skill offers to add it without a cover and leaves it for Oleg's answer.
7. **Climax:** Oleg comes back with dinner. The Catalog bookcase has 18 new outlined spines in author order among the colored ones, and the meter reads "23 of 72 finished". Two questions wait in the terminal: book 14 and book 19.

Failure path: if Oleg had told the skill to add book 14 anyway, it would resend with `confirmDuplicate`. To undo it, Oleg opens the copy's spine → **Open book →** → Book detail → **Delete** → Confirm dialog "Delete *X*?" → **Delete book**. The original stays. No agent can delete a Book.

### Flow 2 — Catch up after three busy days (UJ-2)

Oleg, Friday lunch. UJ-2 as amended by D9.

Mock: [key-home](mockups/key-home.html) (Canonical).

1. Tuesday to Thursday were full of work; Oleg read a little each night but never opened the app.
2. At Friday lunch, Oleg opens bookvie. Home shows *The Left Hand of Darkness*, gauge at 57%, "p.188 of 330", and "Last updated 3 days ago".
3. Oleg clicks the page field, types 212, and presses **Update**.
4. **Climax:** The gauge moves to 64%, the Main book spine on the shelf slice fills a little higher, and the line now reads "Last updated today · ~7 days left". Two interactions, well under 30 seconds.

Failure path: Oleg types 2120 by mistake → "Page must be between 0 and 330." under the field, nothing saved; they correct it and press Enter.

### Flow 3 — Start an urgent work book (UJ-3)

Oleg, Monday morning, a work book needed by Friday.

Mocks: [key-catalog](mockups/key-catalog.html) (bookcase), [key-home](mockups/key-home.html) (Alternate 2, the popover on an unread spine).

1. Oleg's team lead asks Oleg to read *Accelerate* before Friday's planning.
2. Oleg opens Catalog, clicks **Search titles**, and types "accel".
3. One outlined spine remains. Oleg opens its popover: unread, primary **Set as Up next**, link "Start reading".
4. Oleg clicks "Start reading". The popover closes and the Start dialog asks: "Start *Accelerate*? This pauses *The Left Hand of Darkness* at p.212 (64%). *Project Hail Mary* returns to the catalog."
5. Oleg types a Purpose: "Argue for the four key metrics at planning." and clicks **Start reading**.
6. **Climax:** Home shows *Accelerate* as Main book at 0%. *The Left Hand of Darkness* sits in Up next with **Resume** and its page kept; its spine carries the sky dot. *Project Hail Mary*, never started, is back in the catalog, as the dialog said. Nothing was lost.

Failure path: Oleg reconsiders at step 4 and clicks **Cancel**; nothing changes. Alternative entry: from Book detail, **Start reading** opens the same dialog.

### Flow 4 — Finish a book (UJ-4)

Oleg, Sunday afternoon on the sofa.

Mock: [key-home](mockups/key-home.html) (Alternate 1, the state just after the finish).

1. Oleg reads the last pages of *Thinking in Systems*, opens Home, types 240 (the last page) and presses **Update**.
2. The Finish dialog opens with **Finished on** set to today. It quotes Oleg's Purpose ("See feedback loops in my team's planning") and asks "Purpose fulfilled?". Oleg picks **partly**, gives 4 stars, and clicks **Done**.
3. The dialog closes.
4. **Climax:** On the shelf slice, the spine of *Thinking in Systems* fills with its teal from 58% to the top in about 600 ms, ringed briefly in sage, then stands solid among its neighbors. The header reads "Finished Thinking in Systems." and the meter "25 of 73 finished". Once, and never again.
5. The Main book card now says "No Main book." and suggests Up next *Designing Data-Intensive Applications* with **Start reading**, which has focus.

Failure path: Oleg entered 240 by mistake at step 1 → **Cancel** in the Finish dialog; the Reading stays active at p.240 and they correct the page.

### Flow 5 — Ask "how long until…" (UJ-5)

Oleg, a quiet evening, looking at the unread shelves.

1. Oleg opens Catalog and looks at the outlined spines.
2. Oleg clicks "How long until…?". The calculator expands with the field prefilled at Oleg's Measured pace, 17.0 pages/day, showing "About 16 months · February 2028".
3. Oleg types 30.
4. **Climax:** As Oleg types, the result changes to "About 9 months · July 2027". The unread library has an end date.

Failure path: Oleg clears the field or types 0 → the result disappears; no error.

### Flow 6 — Add a Card note on a coffee break

Oleg, Wednesday 10:30, kitchen.

Mocks: [key-home](mockups/key-home.html) (Main book card actions), [key-book-detail](mockups/key-book-detail.html) (Card notes block, Pile), [epic14-options](mockups/epic14-options.html) (Card note boxes).

1. On a coffee break Oleg reads a line in *The Left Hand of Darkness* worth keeping.
2. Oleg opens Home and clicks **Add card note**. A small index-card panel opens with Page prefilled "212".
3. Oleg types the quote, changes Page to "212–213", and clicks **Save note**.
4. **Climax:** The card closes; Oleg is still on Home with the reading progress in view, and the button reads "See card notes · 7". Back to work in under a minute.
5. That evening Oleg clicks **See card notes · 7**. The Card notes page opens scoped "In *The Left Hand of Darkness*", with a strip in the Book's spine color across the top: the open box. Oleg types "ice" in **Search card notes** and sees two notes with the word highlighted, then clicks "Go through as a pile" and steps through all seven with **Next**.

Failure path: Oleg types page 400 in a 330-page book → "Page must be between 1 and 330."; nothing saved.

Variant, two lines on one spread: Oleg checks **Add another** (it was off; from now on it stays on), types the first quote, changes Page to "212–213" and presses Cmd+Enter. The card stays open, Note is empty with the cursor in it, Page still reads "212–213", and "1 note saved" shows beside the checkbox. Oleg types the second quote, presses Cmd+Enter ("2 notes saved"), then presses Esc. Both notes are kept, and "See card notes · N" behind the card counts them. Failure path: the second save can't be written → "Couldn't save. Your data wasn't changed." above the buttons, the second quote stays in Note, the count stays at "1 note saved", and Oleg can retry.

Variant, hunting across the boxes (Sunday morning, at the desk): Oleg wants everything he has kept about habits.

1. He clicks **Card notes** in the nav. The shelf opens in the remembered Boxes view, with nine boxes and "139 card notes in 9 Books". *Designing Data-Intensive Applications* has the tallest pile.
2. He types "habit" in **Search card notes**. Five boxes fade; four lift, *Atomic Habits* showing "3 of 12" and *Deep Work* "5 of 27". The line reads "14 card notes in 4 Books contain “habit”."
3. He opens *Deep Work*. The open box has the Book's spine color across the top, "habit" is still in the field, and the five notes show with the word highlighted.
4. He changes the text to "habits", reads two notes, and presses Back.
5. **Climax:** The shelf is back with "habits" in the field and the matching boxes lifted, so he opens the next box without retyping a word. Removing the "In *X*" chip there instead would have done the same.

Failure path: he types "zettel" on the shelf. Every box fades, and the line reads "No card notes contain “zettel”." Esc brings every box back.

### Flow 7 — Close the month

Oleg, 31 October, Saturday morning.

1. Oleg opens Stats. This year is selected: 11 books, 3,940 pages, bars for January to October.
2. Oleg picks **This month**: 2 books, 610 pages. Under the chart, "Finished this month" lists them, newest first, each with its cover, date, pages and stars.
3. Oleg opens Backup, sees "Last export: 24 days ago", and clicks **Export all data**. The button reads "Exporting…" for a moment.
4. **Climax:** The file lands in Downloads and the line reads "Last export: today". A year of reading is safe on a second disk.

Failure path: storage can't be read for the export → "Couldn't export. Your data wasn't changed."; "Last export" keeps its old value.

### Flow 8 — Restore on a new laptop

Oleg, after replacing the old laptop.

1. Oleg opens bookvie on the new laptop; Home shows "Your shelf is empty."
2. Oleg opens Backup, clicks **Restore from file…**, and picks last month's export.
3. The Confirm dialog says "Replace all data with this file?". Oleg clicks **Replace all data**.
4. **Climax:** "Restored." Home shows the same Main book at its page, the same Up next, and the shelf slice in color, exactly as before.

Failure path: Oleg picks the wrong file, or a truncated one → "This file isn't a bookvie export, or it's damaged. Nothing was changed."

### Flow 9 — Back-fill read books

Oleg, Thursday 21:30, the paper diary open.

Mock: [key-book-detail](mockups/key-book-detail.html) (a back-filled Reading in the Readings list).

1. The skill has cataloged the hallway shelf, so most new spines are outlined, but Oleg read many of these books years ago. The paper diary says Oleg finished *Dune* on 14 August 2019.
2. On Catalog, Oleg types "Dune" in **Search titles**, opens the spine named "Dune by Frank Herbert, not read yet", and follows **Open book →**.
3. On Book detail, Oleg clicks **Mark finished**. The Finish dialog opens with **Finished on** set to today and no Purpose question (there is no Reading).
4. Oleg sets **Finished on** to 14 August 2019, picks 5 stars, and clicks **Done**.
5. **Climax:** Oleg stays on Book detail. The Readings list shows "Finished 14 Aug 2019 · ★★★★★" with no start date, the status region says "Finished Dune.", and back on Catalog the *Dune* spine stands in full color; the meter reads "24 of 73 finished". Stats for 2019 now include *Dune*; this month's Stats and Oleg's Measured pace are unchanged.
6. For the next books Oleg uses the faster route: **Edit** on Book detail, fill **Finished on**, **Save changes**.

Failure path: Oleg types 2091 by mistake → "Finished on can't be in the future." under the field; nothing saved.

### Flow 10 — Pause and resume

Oleg, a work trip, then home again.

Mocks: [key-home](mockups/key-home.html) (Alternate 3, the "⋯" menu), [key-book-detail](mockups/key-book-detail.html) (a paused Reading).

1. *Accelerate* is the Main book at p.150 (58%); *The Left Hand of Darkness* is Up next, paused at p.212. Oleg is leaving for a week and wants no Main book while away.
2. On Home, Oleg opens "⋯" on the Main book card and picks **Pause**. Because an Up next exists, the Confirm dialog says: "Pause *Accelerate* at p.150 (58%)? *The Left Hand of Darkness* moves to Waiting for you." Oleg clicks **Pause**.
3. Home shows "No Main book." with *Accelerate* suggested as Up next with **Resume** (the Up next pane is hidden while there is no Main book), and *The Left Hand of Darkness* in "Waiting for you (1)" at "p.212 of 330".
4. A week later Oleg clicks **Resume** on *The Left Hand of Darkness* in Waiting for you. The Start dialog asks "Resume *The Left Hand of Darkness*?" with its Purpose prefilled; there is no Main book, so no trade-off line. Oleg clicks **Resume**.
5. **Climax:** Home shows *The Left Hand of Darkness* at p.212, 64%, "Last updated today". *Accelerate* is back in the Up next pane, page kept. Nothing was lost and nothing started on its own.

Failure path: at step 2 Oleg clicks **Cancel**; nothing changes. Alternative entry: **Pause** on the Main book's Book detail.

### Flow 11 — Two bookvies side by side

Oleg, an evening of work on a new story in a worktree, with the real library open in another tab.

1. An agent starts `bookvie --dev` for the worktree. It runs on port 8766 with `~/bookvie-data-dev`; the real bookvie keeps running on 8765.
2. Oleg has two bookvie tabs open. One has the sage shelf favicon and the title "Catalog — bookvie"; the other has the amber shelf and "DEV · Catalog — bookvie".
3. Oleg switches to the amber tab. Its header reads "bookvie DEV" with the amber pill, so Oleg knows this is the scratch library before reading anything else.
4. Oleg adds three test books, deletes one, and checks the new screen.
5. **Climax:** to be sure, Oleg opens Backup in the dev tab. About this copy says "bookvie 1.1.0 (a1b2c3d) · Development server" and, under it, "Data folder: ~/bookvie-data-dev". Back in the sage tab, the real catalog hasn't changed.

Failure path: an agent passes `--dev --data-dir ~/bookvie-data` out of habit. The server refuses to start ("bookvie: --dev won't use your real library…", plan D2); no tab ever opens on the real library in dev.

### Flow 12 — Come back to an old tab

Oleg, the morning after installing a new release.

1. Last night Oleg ran `npm run install:local`, which updated bookvie to 1.2.0. This morning's Home tab was opened last week, on 1.1.0.
2. Oleg switches to the tab. The views refetch on focus.
3. A band appears under the top nav: "bookvie was updated to 1.2.0. Reload to use it." with **Reload**. A screen reader hears the sentence once (unless another message takes the `status` region in the same moment; see Accessibility Floor → Live regions).
4. Oleg saves today's page first. The old tab still works, and the notice blocks nothing; it only pushed the page down once, when it appeared.
5. **Climax:** Oleg clicks **Reload**. The page comes back on 1.2.0, the notice is gone, and About this copy on Backup reads "bookvie 1.2.0".

Failure path: bookvie is restarting when Oleg switches tabs and `app-info` fails. No notice appears and nothing complains; the notice shows on the next successful refetch.

### Flow 13 — Fix a failed backup

Oleg, a Saturday morning, two months after setting up the Dropbox backup.

Precondition: Oleg last ran `/bookvie-backup` on Thursday, 21 Nov, and it failed; the last good upload was on 19 Nov.

1. Oleg opens Backup to check something else. Under "Last export: 41 days ago" the line reads "Dropbox backup: failed on 21 Nov · Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal. Last upload on 19 Nov."
2. Oleg opens Terminal, runs `bookvie-dropbox auth`, and signs in to Dropbox in the browser that opens.
3. Oleg runs `/bookvie-backup` in Claude Code again.
4. **Climax:** back in the tab, the page refetches on focus: "Dropbox backup: last upload today at 10:14 · 3 copies in Dropbox". Nothing in Dropbox was lost while it was failing.

### Flow 14 — Restore through an agent

Oleg, after a script run against the wrong library on Thursday evening.

Precondition: bookvie is running, the `bookvie` and Dropbox agent tools are set up, and the `ask` rule for `restore_backup` is in Claude Code's settings (plan D15).

1. Oleg tells Claude Code: "restore my library from Thursday morning's backup". The skill lists the backups, newest first, and suggests the newest; Oleg picks the 19 Nov, 09:02 Dropbox copy instead.
2. The skill downloads it and shows the preview: "3 books: …; 18 card notes", and "Everything else changed since 19 Nov, 09:02, such as pages reached, goes back to how it was then." (Agent conversations → Restore, step 2).
3. The skill asks in the chat; Oleg says yes. Claude Code asks permission for `restore_backup`; Oleg allows it.
4. bookvie's own question appears in Claude Code: "Replace all data with the backup from 19 Nov, 09:02? …". Oleg accepts.
5. **Climax:** "Restored from the backup of 19 Nov, 09:02. Safety copy: ~/bookvie-backups/bookvie-pre-restore-2026-11-21T1004.zip". The open bookvie tab shows the restored library on its next refetch.

Failure path: at step 4 Oleg reads "Atomic Habits" in the list, remembers adding it on purpose, and declines → "Not restored. Nothing was changed." The skill doesn't ask again. To undo a restore later, Oleg restores the safety copy the same way.

### Flow 15 — Star the Books that mattered

Oleg, a Sunday evening, after a friend asked which books changed how he works.

Precondition: about 500 Books in the Catalog, none starred yet. Oleg finished *Thinking in Systems* last month and is a third of the way into *Atomic Habits*.

1. Oleg opens Book detail for *Thinking in Systems* and presses the outline star beside the title. It turns gold at once; `status` says "*Thinking in Systems* is a favourite."
2. He opens Catalog in Tiles view. Moving the pointer over *Refactoring*'s cover shows an outline star at the top left; he clicks it; it turns gold and stays gold when the pointer leaves. *Thinking in Systems* already shows its gold star; the rest of the grid is plain covers.
3. He switches to Bookcase, opens *Atomic Habits*' spine popover and presses the star after the title. It isn't finished, and that's fine: the first chapters were enough. The star turns gold; after the popover closes, the spine shows a small star at its foot.
4. He edits *Refactoring*'s publisher in the Edit book panel and saves. The star is still there: editing never touches it.
5. **Climax:** he presses **★ Favourites**, first in the filter row. The shelf closes up, leaving three Books and the `status` region says "3 books match." He switches back to Tiles, and the three covers sit together: the answer to his friend's question.
6. He reloads the page later; the chip is off again, like every filter.

Failure path: if a save fails (bookvie was stopped), the star stays as it was and "Couldn't save. Your data wasn't changed." shows under the title (Book detail) or under the filter row (Tiles).

### Flow 16 — What did I read last spring?

Oleg, a weekday evening in November 2026, asked by a colleague what Oleg read before switching teams in April.

Precondition: 40 finishes in 2026, three of them in March; *Refactoring* was finished in February and again in April.

1. Oleg opens Stats, which opens on This year. Under the chart, "Finished this year" lists 40 rows, newest first.
2. Oleg picks **Custom** and sets From 1 February 2026 and To 15 April 2026. The numbers read 9 books, 2,410 pages; the bars run February to April. The list heading reads "Finished 1 February – 15 April 2026", and *Refactoring* appears twice, once for each date.
3. Oleg tabs into the chart. Focus lands on April, the latest bar with finishes. Left moves to March, which is named "March 2026, 3 books, 912 pages". Oleg presses Enter.
4. March gets the ring and the other bars dim. `status` says "Finished in March 2026: 3 books." The list's heading reads "Finished in March 2026" over three rows; March is the tallest bar because *Designing Data-Intensive Applications* alone added 611 pages.
5. Oleg clicks *Designing Data-Intensive Applications* to check its card notes, then presses Back.
6. **Climax:** Stats comes back exactly as Oleg left it: Custom, 1 February to 15 April, March selected, the same three Books. The answer for the colleague is on one screen.
7. Oleg presses **Show the whole range**. The list widens to the nine finishes, focus lands on the March bar, now released, and `status` says "9 books, 2,410 pages." Pressing Back once more leaves Stats for the page Oleg opened it from.

Failure path: Oleg pastes an old link, `/stats?range=custom&from=2026-02-01` with no To. Stats opens on This year with no bar and no message.

## Agent conversations

Agents have no screens, but two outcomes reach Oleg as text: the restore conversation in Claude Code (FR-30) and the backup run's report (FR-29). Same voice as the app (Voice and Tone): short, plain, no exclamation marks, no praise. A backup is named by its date and time, "19 Nov, 09:02" (Foundation → Dates), because a safety copy and a daily backup can share a day. File names appear only in the preview's first line, the safety copy's path and the run report.

### Restore

The `bookvie-restore` skill and bookvie's `restore_backup` speak in this order (plan D19). Every count and title comes from `preview_restore` for the exact file being restored (plan D14).

1. **Pick list** (chat), newest first, numbered:
   ```
   Backups you can restore:
     1. 21 Nov, 09:02 · daily backup · this computer and Dropbox · 73 MB
     2. 20 Nov, 09:01 · daily backup · Dropbox · 73 MB
     3. 19 Nov, 09:02 · daily backup · Dropbox · 72 MB
     4. 17 Nov, 18:40 · safety copy (before a restore) · this computer · 72 MB
   The newest is 1. Which one?
   ```
   - Newest first, by the time each backup was made. A daily backup that is both on this computer and in Dropbox (same content) is one row, restored from this computer without a download.
   - The 10 newest, then "and N older. Say show all to see them."
   - The skill suggests the newest and waits; it never picks.
   - Dropbox can't be reached: the list shows this computer's backups, then "Couldn't reach Dropbox: *reason*." (sign-in expired: "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."). No backups anywhere: "No backups found on this computer or in Dropbox. Nothing was changed."
2. **Preview** (chat):
   ```
   Restore bookvie-backup-2026-11-19.zip (Dropbox, 19 Nov, 09:02)?
     This backup: 212 books · 1,304 card notes · 198 covers
     Now:         215 books · 1,322 card notes · 201 covers
   You'd lose what was added since 19 Nov, 09:02:
     3 books: Designing Data-Intensive Applications; Thinking in Systems; Atomic Habits
     18 card notes
   Everything else changed since 19 Nov, 09:02, such as pages reached, goes back to how it was then.
   A safety copy of your current library is saved first.
   ```
   - Up to 5 titles, then "and N more" ("7 books: A; B; C; D; E; and 2 more"). "1 book", "1 card note".
   - Nothing lost beyond other changes: the "You'd lose" block becomes "No books or card notes were added since 19 Nov, 09:02." and the "Everything else" line stays, because pages reached and edits still go back.
   - Then the skill asks in the chat, in its own words. That question is not a gate (plan D15).
3. **bookvie's confirmation** (the dialog Claude Code shows for bookvie's request, plain text, one paragraph):
   "Replace all data with the backup from 19 Nov, 09:02? You'd lose 3 books added since (Designing Data-Intensive Applications, Thinking in Systems, Atomic Habits), 18 card notes, and every other change since then. A safety copy of your current library is saved first."
   - Same title rule as the preview. With nothing added: "Replace all data with the backup from 19 Nov, 09:02? Every change since then goes back, such as pages reached. A safety copy of your current library is saved first."
   - It always repeats the counts itself, so it's true even if the chat preview was skipped. No markdown: the dialog shows plain text.
4. **Outcome** (chat, from the tool's result):

| Outcome | Text |
|---|---|
| Restored | "Restored from the backup of 19 Nov, 09:02. Safety copy: ~/bookvie-backups/bookvie-pre-restore-2026-11-21T1004.zip" |
| Declined, cancelled, or the client can't show bookvie's question (`restore_not_confirmed`) | "Not restored. Nothing was changed." Only when the client can't ask, the skill adds: "Run it in the Claude Code terminal, not VS Code or claude -p." (note for architecture: the result says which of declined, cancelled or unsupported it was). It never retries on its own. |
| Not a bookvie file, damaged, or unsafe (`restore_invalid`, `restore_unsafe`) | "This file isn't a bookvie export, or it's damaged. Nothing was changed." (as on Backup) |
| Newer version (`restore_newer_version`) | "This export is from a newer version of bookvie. Nothing was changed." (as on Backup) |
| The restore couldn't be written (`couldnt_save`) | "Couldn't save. Your data wasn't changed." (as everywhere) |
| Dropbox download failed (sign-in, network) | "Couldn't download the backup from Dropbox: *reason*. Nothing was changed." |
| Safety copy failed | "Couldn't save a safety copy, so nothing was restored." |
| Path outside the backups folder | "bookvie restores only from its backups folder. Nothing was changed." |
| Download didn't match Dropbox's copy | "The download didn't match the copy in Dropbox, so nothing was restored. Try again." |

Paths are written with `~` for the home folder, as in About this copy.

### Backup run report

`/bookvie-backup` (Flow 13) shows its report in the chat; the line on Backup is what Oleg sees later. The report states the outcome in one line, in the same words as that line's state and reason ("Uploaded bookvie-backup-2026-11-21.zip · 3 copies in Dropbox, deleted bookvie-backup-2026-11-18.zip", "Nothing new since the last upload; skipped.", "Failed: Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."). When deleting the older copies didn't finish after a checked upload, the run is still an upload, with the number of copies Dropbox now holds, and the line adds a note: "Uploaded bookvie-backup-2026-11-21.zip · 4 copies in Dropbox. Older copies remain: deleting them didn't finish, and a later upload deletes them."

## Inspiration & Anti-patterns

The user offered no external references; the visual reference is the user's own bookshelves at home. Anti-patterns come from the addendum's competitive digest and from choices rejected during this design session.

- **Streak apps (Bookly, Basmo, StoryGraph's opt-in streak).** Streaks are unforgiving: late logging breaks them, and people read to protect the streak. bookvie has no streaks, no days-in-a-row figure, nothing that resets.
- **Guilt mechanics.** No "you missed a day", no reproachful elapsed time, no red failure states (PRD Tone). Status facts such as "Last updated 3 days ago" are muted and informational.
- **Fiddly logging** (Goodreads edition bugs, Basmo goals that don't accept pages). Progress is one absolute page field and **Update**.
- **Day types and a Reading calendar.** Dropped by the user as "extra effort that does not have any outcomes".
- **Celebration.** No confetti, sound, or praise.
- **Greetings.** No time-of-day greeting; the Home header is the date.

### Rejected

- A left rail: the top bar leaves the bookcase more width.
- "Open existing" in the duplicate warning.
- The pale decorative unread outline: replaced by an outline of at least 3:1.
- A separate "Last time: p.N" fact on the re-entry line: redundant with the gauge label and "Last updated".
- An "Add pages" button: redundant with the page field.
- The "/" shortcut for search: it conflicted with speech input and dialogs, and Search titles is the first control after the nav on Catalog.

## Open Questions

1. **Shared storage across browsers.** Resolved by architecture: one local server owns the data folder (spine AD-1), and agents reach it through the agent tools (AD-21), not a browser.
