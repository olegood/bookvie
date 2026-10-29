---
name: bookvie
status: final
updated: 2026-10-29
design: ./DESIGN.md
sources:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
---

# bookvie — Experience Spine

Behavior. Visual specs live in [DESIGN.md](./DESIGN.md) under the same component names. Terms (Book, Reading, Main book, Side read, Pause, Up next, Waiting for you, Purpose, Card note, Measured pace, Quick pace calculator) are used exactly as defined in the PRD glossary, as amended in [prd-deltas.md](./prd-deltas.md) (cited below as "D*n*"). Where this spine departs from the PRD, the change is listed in prd-deltas.md and holds until the PRD is corrected.

Mocks illustrate this spine; they are not the contract. If a mock and a spine disagree, the spine wins. Key screens: [Home](mockups/key-home.html), [Catalog](mockups/key-catalog.html), [Book detail](mockups/key-book-detail.html). Direction reference: [Birch Morning v2](mockups/birch-v2-light-dark.html).

## Foundation

- **Platform.** Web app in a desktop or laptop browser. Minimum viewport 1024px; below that the page scrolls horizontally. No phone or tablet layout (PRD §6.3) (documented deviation: Accessibility Floor → Reflow).
- **UI system.** None named. Plain, semantic HTML controls styled by DESIGN.md tokens. Native elements (`button`, `input`, `select`, `dialog`) are preferred so roles and names come for free.
- **Local-first.** All data lives on this computer; no account, no network (PRD §5). No sync or connection status is shown. There is no loading state: local reads are instant. The only busy states are Export and Restore (see Backup page). A save that fails is never silent (see State Patterns → Couldn't save).
- **One store, two operators.** The user's browser and the cataloging skill's browser must see the same data. How they share it is an architecture decision (prd-deltas → For architecture). UX rule for two open tabs or browsers: last write wins; reloading shows the current data. No cross-tab warning is shown.
- **Theme.** Light · Dark · System toggle in the top nav. Default is System; the choice is remembered on this computer.
- **Users.** One person, who is also the builder. A browser-driven AI cataloging skill acts as a second, unattended operator of the add-book form (see Agent Label Contract).
- **Language.** UI is English only.
- **Dates.** Relative times ("today", "yesterday", "N days ago") count local calendar days. A timestamp in the future (clock change) shows as "today". Beyond 365 days: "over a year ago". All relative times and the Home date recompute when the window regains focus or becomes visible, so a tab left open past midnight stays right.

## Information Architecture

Top nav, left to right: **Home · Catalog · Stats · Card notes · Backup**, theme toggle on the right. A "Skip to content" link comes first. No left rail. Overlay stacking: see Interaction Primitives → One level of stacking.

### Pages

| Surface | Reached from | Purpose | Traces to | Journey |
|---|---|---|---|---|
| Home | App open; nav | Main book progress and actions, Up next, Waiting for you, On the side, bookcase slice, library meter, quiet status facts | FR-6–FR-11, FR-14, FR-21; D14, D17–D19 | Flows 2, 3, 4, 6, 10 |
| Catalog | Nav | The whole library: bookcase or list, Search titles, Sort, filters, New book, library meter, "How long until…?" | FR-1–FR-4, FR-15, FR-20; D14, D37 | Flows 1, 3, 5, 9 |
| Book detail | A book title anywhere (Main book card, Home panes, List view row); "Open book →" in the spine popover; "Open book" in the "⋯" menu | One Book's metadata, current Reading, its first Card notes with search and the pile, Readings, actions, per-Book pace, spine color | FR-1, FR-4–FR-9, FR-14, FR-15; D31, D35 | Flows 1, 9, 10 |
| Stats | Nav | Books finished and pages finished for a period, monthly bars | FR-16; D3, D30 | Flow 7 |
| Card notes | Nav (all Books); "See card notes" on the Main book card or "See all card notes" on Book detail (scoped to one Book) | Card notes grouped by Book, quick search, entry to the pile | FR-17–FR-19; D23, D43 | Flow 6 |
| Backup | Nav | Export, Restore, "Last export" | FR-22, FR-23; D19 | Flows 7, 8 |

Book detail is a page, not an overlay.

### Overlays

| Overlay | Opened from | Traces to | Journey |
|---|---|---|---|
| Spine popover | Click, Enter or Space on a spine (Home slice or Catalog) | D14 | Flows 1, 3 |
| "⋯" menu | Main book card | FR-6; D35 | Flow 10 |
| New book panel | **New book** button on Catalog (and on the empty state); **Edit** on Book detail | FR-1, FR-2; D20, D28, D38 | Flows 1, 9 |
| Duplicate dialog | **Add book** or **Save changes** when FR-3 matches | FR-3; D22, D39 | Flow 1 |
| Start dialog | Start reading or Resume anywhere | FR-5, FR-7–FR-9; D24, D33, D34 | Flows 3, 10 |
| Finish dialog | Entering the last page; **Mark finished** on Book detail | FR-14; D28, D31 | Flows 4, 9 |
| Card note panel | **Add card note** on the Main book card or Book detail; Edit on a note | FR-17 | Flow 6 |
| Pile | Card notes list or Book detail's Card notes block ("Go through as a pile", or opening a search result) | FR-18, FR-19 | Flow 6 |
| Confirm dialog | Restore; Delete book; Delete card note; Pause that displaces an Up next | FR-1, FR-6, FR-17, FR-23, NFR Data safety | Flows 8, 10 |

## Book states

A Book's state has four independent parts: **read-ever** (has a finished Reading), **Reading** (none, Main, paused), **Up next** (yes or no), **Side read** (yes or no). Precedence rules:

1. A re-read of a finished Book keeps its full-color spine and gets the Main-book marker.
2. A paused Book that is Up next shows **Resume** and appears only in Up next, never also in Waiting for you. Waiting for you means every paused Reading except the Up next Book's; its "(N)" count, the sand marker, and the Library pace scope use the same definition.
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

**Book detail actions.** One `button-primary`: **Resume** (paused) or **Start reading** (no active or paused Reading, not Main; on a finished Book this starts a re-read); none for the Main book. Secondary, shown only when they apply: **Set as Up next** (not Main, not already Up next), **Pause** (Main only), **Mark finished** (Main, paused, or never finished), **Mark as Side read** or **Remove from side** (not Main), **Edit Purpose** (active or paused Reading), and always **Add card note**, **Edit**, **Delete**. Always shown in the right column: the Card notes block, the Pace calculator, and **Change color**.

## Voice and Tone

Microcopy. Brand voice lives in DESIGN.md → Brand & Style. A calm librarian: short, plain, factual. No exclamation marks, no praise, no guilt.

| Do | Don't |
|---|---|
| "Finished Thinking in Systems." | "Congratulations! You finished a book! 🎉" |
| "Last updated 3 days ago" | "You haven't read in 3 days" |
| "~7 days left" | "Only 7 days to go — keep it up!" |
| "Last export: 12 days ago" | "Warning: backup overdue" |
| "Start *X*? This pauses *Y* at p.120 (64%)." | "Are you sure you want to switch books?" |
| "*Z* returns to the catalog." | "Your previous Up next will be lost!" |
| "Couldn't save. Your data wasn't changed." | "Error! Save failed." |
| "Your shelf is empty. Add your first book." | "Welcome! Let's build your library!" |
| "Possible duplicate: *X* by *Author* is already in your catalog." | "Error: duplicate detected" |
| "Page must be between 0 and 330." | "Invalid input!" |
| Waiting for you shows the page ("p.120 of 330") | Elapsed time since pause ("paused 41 days ago") |
| No greeting. The Home header is the date. | "Good morning, Oleg" |

## Component Patterns

Behavioral. Visual specs: DESIGN.md → Components, same names. Longer patterns follow the table as subsections.

| Component | Use | Behavioral rules |
|---|---|---|
| Top nav | Every page | `nav` landmark inside the `header`. Active item has `aria-current="page"`. "Skip to content" moves focus to `main`. |
| Theme toggle | Top nav | `role="group"` named "Theme" holding three toggle buttons (Light, Dark, System), `aria-pressed` on each; glyphs `aria-hidden`. Switching is instant; System follows the OS setting live. |
| Main book card | Home, when a Main book exists | Shows cover (or no-cover placeholder), title, author, edition only when it isn't 1, gauge, page field, re-entry line. The title is a link to Book detail. Actions: **Add card note** (opens Card note panel; the user stays on Home) and **See card notes · N** (opens Card notes scoped to this Book; accessible name "See card notes, 7 notes"; at 0 notes the label is just "See card notes"). Progress is only the page field. "⋯" button (name "More actions", `aria-haspopup="menu"`) opens a menu: **Pause** (see Book detail → Pause) and **Open book**. Arrow keys move within the menu; Esc closes it and returns focus to "⋯". |
| Page field | Main book card | Holds the absolute current page, prefilled with the last saved page; "of 330" is linked to the field by `aria-describedby`. **Update** (or Enter) saves. Saving takes at most two interactions after opening the app (focus is not auto-placed in the field, so a stray keypress never edits progress). Accepts whole numbers 0 to the Book's page count; a lower page than before is allowed and the gauge follows. Out-of-range or non-numeric: not saved, field keeps the typed value, `aria-invalid="true"`, inline message linked by `aria-describedby` and announced in the `alert` region. Entering the last page opens the Finish dialog; Cancel there leaves the Reading active at that page, and pressing **Update** again with the last page reopens the dialog. On save: gauge, percentage, re-entry line, and the Main book spine fill update together; the `status` region announces "Page 212 of 330, 64%." |
| Gauge | Main book card | Read-only progressbar: `aria-valuemin="0"`, `aria-valuenow` set to the page, `aria-valuemax` set to the page count, `aria-valuetext` "64%, page 212 of 330". The "p.N of M" label is the page last reached (FR-11). |
| Re-entry line | Main book card | Up to three muted facts. **"Last updated N days ago"**: time since the Reading's last progress update, which is set by every page save, by starting, and by resuming ("Last updated today", "yesterday", or "N days ago"); informational, never a warning, never colored. **"~N days left"**: pages left divided by Measured pace, rounded up to whole days, minimum "~1 day left"; hidden when there is no Measured pace, when Measured pace is 0, or when no pages are left. **"Last export: N days ago"**: see Backup page. |
| Measured pace | Re-entry line, Pace calculator | Total pages of finished Readings divided by total days from start to finish, counting days inclusively (a Reading started and finished the same day counts 1 day). Back-filled Readings (no start date) are excluded. With no qualifying Reading there is no Measured pace. |
| Section pane | Home side column | See [Section pane](#section-pane) below. |
| Library meter | Bookcase header on Home and Catalog | "X of Y finished": X is the number of Books with at least one finished Reading (back-filled included); Y is the number of all Books. Progressbar with `aria-valuetext` "24 of 73 finished". Updates the moment a Book is finished or added. |
| Bookcase | Home (slice), Catalog (full) | See section **Bookcase**. |
| Spine | Bookcase | A `button` in a list item, `aria-haspopup="dialog"`, `aria-expanded` while its popover is open. Accessible name: "*Title* by *First author*, *status*" — with more than one author, "by *First author* and N others". The name always carries the full title, even when the visible label is cut with an ellipsis. Status strings per Book states. Click, Enter or Space opens the Spine popover. |
| Spine popover | Spine | See [Spine popover](#spine-popover) below. |
| Catalog view toggle | Catalog toolbar | `role="group"` named "Catalog view": Bookcase (default) · List, two toggle buttons with `aria-pressed`. Search, Sort and filters apply to both views. The last view is remembered on this computer. |
| List view | Catalog | Table: Title, Author, Pages, Status, Date added. Column order fixed. The title in each row is a link to Book detail. Built for admin and cataloging checks. |
| Search field | Catalog; Card notes | Visible label "Search titles" (Catalog) or "Search card notes" (Card notes); the label is the accessible name; no placeholder. Filters as the user types, case-insensitive. On Catalog, matches by title (FR-4); non-matching spines and rows are removed (`hidden`) and the shelf closes up; the `status` region announces "N books match." after typing pauses (about 500 ms). Esc in a non-empty field clears it. No keyboard shortcut focuses it. |
| Sort select | Catalog toolbar | Native `select` labelled "Sort": **Author** (default), **Title**, **Date added**, **Pages**. Author sorts by the first listed author string with locale-aware collation (`Intl.Collator`), then by title; last-name sorting is out of scope. Title A–Z; Date added newest first; Pages fewest first; ties by title. The bookcase reorders its spines; the list reorders its rows. The choice is remembered on this computer and is shared with Home's slice. |
| Filter chips | Catalog toolbar | Groups: Status (**Read**, **Unread**), Type (**Paperback**, **Hardcover**, **Ebook**), **Language ▾**, **Tag ▾**. Chips are toggle buttons with `aria-pressed`; Language and Tag open a checkbox list of the values that exist in the library, in alphabetical order. Within a group, chips combine with OR; across groups, and with Search titles, with AND. Non-matching Books are hidden, not dimmed: the shelf closes up. "Clear filters" turns all off. The `status` region announces "N books match." Filters are not remembered between visits. |
| Book detail | Page | See [Book detail](#book-detail) below. |
| New book panel | Catalog; Book detail (edit) | See [New book panel](#new-book-panel) below. |
| Finished on | New book panel | Optional date field. Empty means the Book has not been read (the default, so cataloging never marks books read by accident). A date creates a finished Reading on that date with no start date (a back-filled Reading): the Book counts as read, its spine takes its color, Stats count it in that date's period, and Measured pace ignores it. Not in the future. In edit mode the field shows the Book's most recent finish date and editing it changes that date; clearing it is refused ("A finish date can't be removed here."): a finished Reading cannot be un-finished, and there is no "Remove this reading" action. Filling it on a Book with an active or paused Reading adds a past Reading and leaves the current one untouched. |
| Tags | New book panel; Book detail | Free-text field, tags separated by commas. Typing shows a suggestion list of existing tags that start with the typed text (`combobox` with `listbox`; arrow keys and Enter pick, typing anything else is always allowed). Tags are trimmed; duplicates are merged ignoring case, keeping the first spelling. Book detail shows them as plain chips (not interactive). |
| Duplicate dialog | Over the New book panel | See [Duplicate dialog](#duplicate-dialog) below. |
| Start dialog | Anywhere a Reading starts or resumes | See [Start dialog](#start-dialog) below. |
| Finish dialog | After the last page is entered; **Mark finished** on Book detail | See [Finish dialog](#finish-dialog) below. |
| Card note panel | Home (Main book card), Book detail; Card notes list (edit) | See [Card note panel](#card-note-panel) below. |
| Card notes list | Card notes page | All Books: notes grouped by Book (serif titles), search across all Books with results still grouped. Scoped (from "See card notes" or Book detail's "See all card notes"): only that Book's notes, scope chip "In *X*" with a clear button that widens to all Books, search covers that Book only. Results update while typing, case-insensitive, matching text in `<mark>`, page ref shown; `status` announces "N notes match." after typing pauses. Each group has "Go through as a pile"; opening a result opens the pile at that note. Each note has Edit (Card note panel in edit mode). |
| Pile | Over Card notes or Book detail | See [Pile](#pile) below. |
| Pace calculator | Catalog (library scope), Book detail (Book scope) | Catalog: collapsed behind the link "How long until…?"; activating it expands inline (`aria-expanded`). One "pages/day" field, prefilled with Measured pace rounded to one decimal when one exists, else empty. Result updates as the user types, in an `output` element: duration and date ("About 9 months · July 2027"). Duration in days under 60 days, months under 24 months, years beyond. When nothing is left to read: "Nothing left to read." Zero, negative, or non-numeric input: no result, no message. Scopes per FR-15. |
| Stats range picker | Stats | Presets This month · This year · Last year · All time, plus Custom ("From", "To" date fields). Default This year. If To is before From, the two dates swap silently. All time starts at the earliest finished Reading, back-filled ones included. A finish counts by its local date. Changing the range updates numbers and bars instantly and the `status` region announces "2 books, 610 pages." |
| Monthly bars | Stats | Two numbers: books finished, pages finished. One bar per month in the range, counting only finishes inside the range (a range from 15 March counts March from the 15th); over 24 months, one bar per year. Each bar has a text value. All of a Reading's pages count in the period it finished (FR-16), using the page count it finished with. Exposed as a table to assistive tech (period, books, pages). |
| Backup page | Backup | **Export all data** builds one file (FR-22) and hands it to the browser's download. When Export or Restore takes longer than about 300 ms, its button reads "Exporting…" or "Restoring…" and is disabled until it finishes; there is no spinner. "Last export: today" is set only once the file has been built and handed over; the browser cannot confirm the file was kept. **Restore from file…** opens a file picker, then the Confirm dialog. The whole file is checked before anything is replaced. "Last export: N days ago" also appears on Home's re-entry line; "No export yet" before the first export. "Last export" and preferences (theme, Catalog view, sort) stay local: a restore neither brings nor replaces them. "Last export" is never a warning. |
| Confirm dialog | Restore, Delete book, Delete card note, Pause | `alertdialog`. Restore: "Replace all data with this file? Your current books, readings and card notes will be replaced." with **Replace all data** and **Cancel**. Delete book: "Delete *X*? Its readings and card notes are deleted too." with the Book's role when it has one ("It is your Main book.", "It is Up next.", or "It is waiting for you at p.120."), then **Delete book** and **Cancel**. After deleting, the app goes to Catalog; a vacated Main book or Up next stays empty (nothing is promoted automatically). Delete card note: see Card note panel. Pause: see Book detail. Cancel has default focus. |
| Empty state | Home, Catalog (no Books) | Bare birch planks, "Your shelf is empty. Add your first book.", **New book** button. |
| No-cover placeholder | Main book card, Up next, Book detail | Stands in for a missing cover at the same size; not interactive; the Book's title is still given in text beside it. |
| Cover | New book panel | Image files only. On upload the image is downscaled to a long edge of 1200px before it is stored, so a library of phone photos stays a manageable export. |
| Focus ring | Every focusable element | Shown on keyboard focus (`:focus-visible`) and on an open spine; never suppressed. |
| Highlight ring | New spine or row; finish moment | Brief ring that fades over about 2 s; instant on and off under reduced motion. |
| Finish fill | Finished spine on Home's slice | See State Patterns → Finish moment. |

### Section pane

Use: Home side column.

- **Panes:** three, top to bottom. Each row's title is a link to Book detail, and each row's button opens the Start dialog. Buttons carry the title in their name ("Resume The Left Hand of Darkness").
- **Up next:** the single Up next Book, button **Start reading** (or **Resume** if it has a paused Reading).
- **Waiting for you (N):** every paused Reading except the Up next Book's, oldest first, no cap. Each row: title, mini bar, "p.N of M", and **Resume**. The mini bar is a progressbar named by the row title (`aria-labelledby`), with `aria-valuetext` "page 120 of 330, 36%".
- **On the side:** up to 3 Side reads. Each row: title, author, and **Start reading**, which opens the Start dialog with "Which page?".
- **Empty panes:** hidden, except Up next while a Main book exists ("Nothing up next."). With no Main book the Up next pane is hidden: the empty Main book card already suggests the Up next Book (see State Patterns).

### Spine popover

Use: Spine.

- **Role:** non-modal `dialog` with `aria-labelledby` pointing at its title. Only one popover is open at a time.
- **Focus:** on open, focus moves to the first actionable control (the primary action, else the first link). Tab moves through its controls; Tab from the last one, or Shift+Tab from the first, closes it and returns focus to the spine.
- **Closing:** Esc, outside click, ×, or focus leaving it; focus returns to the spine.
- **Read-only details:** title, subtitle, authors, pages, year, status, current color ("Color: Teal, from cover", "Color: Sage" or "Color: set by you").
- **Primary action:** at most one, state-aware (Book states table). Set as Up next displaces the current Up next per FR-7 (hint "Replaces the current Up next." when one exists). Start reading and Resume close the popover and open the Start dialog.
- **Always shown:** the "Open book →" link and **Change color**: From cover (when a cover exists) plus the eight curated swatches named Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone, each a toggle button with `aria-pressed`; on unread Books labelled "· shown once read". Color changes save immediately and announce "Color set to Teal."

### Book detail

Use: page.

- **Heading:** the `h1` is the Book title.
- **Content:** metadata, cover, Tags, current Reading (status, gauge, Purpose), Readings (start, finish, stars, Purpose fulfilled). Back-filled Readings show "Finished 14 Aug 2019" with no start.
- **Actions:** visible per state; see Book states → Book detail actions.
- **Pause** (Main book only): pauses the Reading at its current page; per FR-7 it becomes Up next. If another Book is Up next, the Confirm dialog first states the displacement ("Pause *X* at p.150 (58%)? *Z* moves to Waiting for you." or "*Z* returns to the catalog.") with **Pause** and **Cancel**. Otherwise Pause applies at once and `status` announces "Paused *X* at p.150. It's Up next."
- **Edit Purpose** (when a Reading is active or paused): turns the Purpose line into a one-line field with **Save** and **Cancel**; Enter saves, Esc cancels.
- **Mark finished:** opens the Finish dialog.
- **Mark as Side read:** When three Side reads already exist, **Mark as Side read** stays focusable with `aria-disabled="true"` and is described by the hint "Up to 3 side reads."
- **Edit:** opens the New book panel in edit mode over this page.
- **Card notes block** ("Card notes (N)"): the Book's first three notes in page order, each with Edit (Card note panel in edit mode).
  - A **Search card notes** field searches this Book's notes in place. While it holds text, the block shows every matching note (not only three), with matching text in `<mark>`, and `status` announces "N notes match." after typing pauses. Esc clears it.
  - "Go through as a pile" opens the Pile over Book detail with this Book's notes; opening a matching note opens the pile at that note.
  - "See all card notes" opens the Card notes page scoped to this Book.
  - With no notes, the block shows "No card notes yet." and no search field or links.
- **Change color:** same control and rules as the Spine popover; the current-color line updates.

### New book panel

Use: Catalog; Book detail (edit).

- **Role:** modal side panel (`dialog`, name "New book"; "Edit book" in edit mode). Fields and buttons per the Agent Label Contract.
- **Opening:** opens from **New book**; focus moves to Title. When opened from Home's empty state, the app first navigates to Catalog.
- **Submitting:** on every **Add book** or **Save changes** press, all rules in the validation table are checked.
- **Success (add):** the panel closes, `status` announces "Added *Title*.", and the Catalog scrolls the new spine into view in the current sort with the highlight ring.
- **Success (edit):** the panel closes, `status` announces "Saved *Title*.", and the page stays where it was.
- **Validation failure:** the panel stays open and nothing is saved (see State Patterns).
- **Closing without saving:** **Cancel**, **Close** (×) or Esc. If fields were typed in, closing discards them without a prompt.
- **Pages in edit mode:** setting Pages lower than the current page of an active or paused Reading, or lower than the highest Card note page, is refused (validation table). Finished Readings keep the page count they were finished with, so Stats never change retroactively.
- **Focus:** see Focus after close.

### Duplicate dialog

Use: over the New book panel.

- **Role:** `alertdialog`, name "Possible duplicate". The description names up to three matching Books (title, author, ISBN) and "and N more".
- **Stacking:** while it is open the panel behind is `inert` (native `showModal()` stacking), so only the dialog's two buttons are exposed.
- **Don't add** (default focus): closes the warning and returns to the panel with every typed field kept; nothing is saved.
- **Add anyway:** saves as normal. There is no "Open existing".
- **Matching:** titles normalized per FR-3; authors compared ignoring case and surrounding spaces, as a set of semicolon-separated names; ISBNs compared after removing hyphens and spaces and converting ISBN-10 to ISBN-13. A match on title and author, or on ISBN, triggers it. In edit mode the check runs only when Title, Author(s) or ISBN changed.
- **Focus:** see Focus after close.

### Start dialog

Use: anywhere a Reading starts or resumes.

- **Role:** modal. Heading "Start *X*?" (or "Resume *X*?" for a paused Reading). Shown even with no Main book, because it carries the Purpose field.
- **Trade-off lines**, each shown only when it applies: "This pauses *Y* at p.120 (64%)." when a Main book exists; and, when that pause will displace an Up next *Z* that is not *X*: "*Z* moves to Waiting for you." (*Z* has a paused Reading) or "*Z* returns to the catalog." (*Z* was never started).
- **Which page?:** a required number field whenever *X* is a Side read, by any route, prefilled with its paused page if it has one, else empty. A value equal to the last page opens the Finish dialog right after confirming.
- **Purpose:** optional field (one sentence, FR-9), prefilled with the existing Purpose when resuming.
- **Start reading** or **Resume** confirms: the previous Main book is paused and becomes Up next; the displaced Up next goes as stated. Starting a Side read removes it from On the side. Starting or resuming sets the Reading's "Last updated" to now. Starting a finished Book creates a re-read.
- **Cancel** or Esc: nothing changes.

### Finish dialog

Use: after the last page is entered; **Mark finished** on Book detail.

- **Role:** modal.
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
- **Fields:** Note (required) and Page, prefilled with the current page (at least 1), or empty when the Book has no Reading.
- **Page format:** accepts "42", "42–45", "42-45", "42 – 45", with or without "p." or "pp."; "42–42" is stored as 42. Valid pages are 1 to the Book's page count. A reversed range ("45–42") is refused: "The first page must come before the last." More than one range is refused: "Use one page or one range."
- **Errors:** `aria-invalid`, message linked by `aria-describedby`, announced in `alert`.
- **Save note** saves and closes; the "See card notes · N" count (on Book detail, the Card notes block) updates; `status` announces "Card note saved." The user never leaves the page they were on.
- **Edit mode** ("Edit card note") adds **Delete**, which opens the Confirm dialog "Delete this card note?" with **Delete card note** and **Cancel**.
- **Focus:** see Focus after close.

### Pile

Use: over Card notes or Book detail.

- **Role:** modal, named "Card notes pile, *X*". One note at a time. The note sits in a polite live region, so each move announces "Note 3 of 7, p.42: *text*."
- **Controls:** Previous and Next buttons, "N of M", and an "Order" radio group (Page order · Shuffled; shuffle reorders once per change). "N of M" follows the current order.
- **Ends:** at the first and last note, Previous and Next stay focusable with `aria-disabled="true"`; there is no wrap. A pile of one note has both disabled.
- **Entry:** opening a search result opens the pile in Page order at that note. To jump to a specific note, open it from the list behind the pile or from a search result.
- **Read-only:** editing happens in the list.
- **Closing:** a visible **Close** button (top right) and Esc both close it, returning to the list scrolled to the last viewed note.
- **Focus:** see Focus after close.

## Bookcase

The bookcase is the library drawn as birch shelves of spines. It is atmospheric: a picture of the collection, not a map of the user's physical shelves (PRD "Shelves" stays Later). Spine visuals, sizing and colors: DESIGN.md → Spine, Spine colors. Mocks: [key-home](mockups/key-home.html) (slice, popover, finish end state), [key-catalog](mockups/key-catalog.html) (full bookcase).

- **Ordering.** Spines follow the Sort select (default Author), left to right, row by row. Never by physical location. Changing sort or filters reorders or closes up the shelf.
- **Read in color, unread outlined.** Per the Book states table. A read spine shows the book's exact color (user-set, from cover, or curated), never lightened or darkened for contrast, so a book keeps the color the user associates with it. Legibility comes from the fixed edge line and the label strip the title sits on (DESIGN.md → Spine colors), not from the fill; any color the user picks is accepted.
- **Markers.** One dot per spine (Book states rule 5); a legend under the bookcase names every visual state.
- **Home slice.** Up to 3 shelf rows from the full bookcase in the remembered sort, chosen in this order: the row holding the Main book, then the row holding the Up next Book, then rows with the most recent finishes, newest first. With fewer qualifying rows, the first rows of the bookcase fill the rest. Display order: the Main book's row first, then the other chosen rows in bookcase order. With no Main book, all chosen rows are in bookcase order. The slice recomputes when the window is resized. Filters never apply to the slice. The header carries the library meter and a "See all in Catalog" link. The slice never scrolls internally.
- **Catalog scale.** The full bookcase on Catalog handles about 500 Books (about 15 rows at 1280px). The page scrolls normally. Every spine is present in the page (lightweight elements, no lazy rows), so find-in-page and keyboard navigation reach all of them. The library meter stays one bar.
- **Highlight after add.** After **Add book** saves, the panel closes, the Catalog scrolls the new spine into view in the current sort, and shows the highlight ring briefly; instant under reduced motion. In List view the new row is highlighted the same way. If a search or filter would hide the new Book, it is cleared first.
- **Keyboard.** The bookcase is a `list` named "Bookcase, 73 books" (on Home "Bookcase slice, 3 rows"), each spine a button in a list item. It is one Tab stop (roving `tabindex`; Tab returns to the last focused spine). Left and Right move to the previous and next spine in sort order, crossing rows. Up and Down move to the spine in the row above or below whose horizontal center is nearest. Home and End go to the first and last spine of the bookcase. No type-ahead (Search titles does that job). Enter and Space open the popover. If the focused spine is filtered out or deleted, focus moves to its nearest remaining neighbor in sort order, or to Search titles when none remains. The same model applies to Home's slice.
- **Ebooks** stand on the shelf like any Book.

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
| Waiting for you: many | Home | All rows, oldest first, no cap; the side column grows and the page scrolls. |
| On the side: none, or 1–3 | Home | Hidden when none; otherwise rows. |
| Main book at page 0 | Home | Gauge 0%, "p.0 of M"; "Last updated" counts from the start. |
| Main book at its last page (finish cancelled) | Home | Gauge 100%; "~N days left" hidden; the spine keeps the Main-book marker so it still differs from a finished spine. **Update** with the same page reopens the Finish dialog. |
| No Main book, Last export | Home | "Last export: N days ago" moves to the right end of the Home header line. |
| Never exported | Home, Backup | "No export yet", muted. |
| No cover | Main book card, Up next, Book detail | No-cover placeholder; spine uses its curated color when read; "From cover" option absent in color pickers. |
| Validation error | New book panel | Nothing saved, panel stays open. Each invalid field: `aria-invalid="true"`, message linked by `aria-describedby` ("Pages is required."). `alert` region: "Not saved. 2 fields need attention: Pages, Language." Focus moves to the first invalid field. No red. |
| Validation error | Page field, Card note panel, Finish dialog, Edit Purpose | Inline message, nothing saved, value kept; `aria-invalid`, `aria-describedby`, message announced in `alert`. Messages: see Validation messages (other forms). |
| Couldn't save | Any save (New book panel, page field, Card note, color, Finish, Start, Pause, delete) | The write to storage failed (storage full, unavailable, or cleared). `alert` region: "Couldn't save. Your data wasn't changed." in `ink`, one line below the action, never red. The panel or dialog stays open with every typed value kept, so the user (or the skill) can retry. Nothing on screen claims a change that didn't happen. |
| Duplicate warning | New book panel | Duplicate dialog (Don't add, Add anyway). Don't add returns to the panel unchanged. |
| Saved | New book panel | `status` "Added *Title*." (edit: "Saved *Title*."); highlight after add. |
| Search, no matches | Catalog | Empty shelf area with "No titles match “query”." and the count "0 books match." |
| Filters, no matches | Catalog | Empty shelf area with "No books match these filters." and a "Clear filters" link. |
| Search, no matches | Card notes | "No card notes contain “query”." |
| No Card notes | Card notes (all or scoped) | "No card notes yet." Scoped view adds an **Add card note** button. |
| No Card notes | Book detail | Card notes block shows "No card notes yet."; no search field, no pile or "See all card notes" links (**Add card note** is in the action stack). |
| Card notes search, no matches | Book detail | "No card notes contain “query”." inside the block. |
| Stats, empty range | Stats | Numbers show 0; bars empty; "No books finished in this range." |
| Restore, not a bookvie file or damaged | Backup | Refused before anything changes: "This file isn't a bookvie export, or it's damaged. Nothing was changed." |
| Restore, newer version | Backup | Refused: "This export is from a newer version of bookvie. Nothing was changed." |
| Restore, older version | Backup | Accepted; the data is migrated to the current format, then replaces the current data. |
| Restore done | Backup → Home | `status` "Restored." The app goes to Home with the restored data; focus on Home's `h1`. |
| Finish moment | Home shelf slice | After **Done** in the Finish dialog for the Main book, the slice first scrolls the finished spine into view if needed, then the spine fills with its color from its current fill to full, bottom to top, **about 600 ms ease-out**, with the highlight ring; then it stays solid. Under reduced motion the fill is instant. It **never replays** (not on reload, not on revisit). The library meter updates, and one quiet line "Finished *X*." appears in the bookcase header; it is gone on the next visit to Home. Once focus has settled (see Focus after close), the `status` region announces "Finished *X*. 25 of 73 finished." The Main book card switches to the no-Main-book state with Up next suggested. No sound, no confetti. |
| Finish moment, re-read | Home shelf slice | The spine is already full color: only the highlight ring plays. Header line "Finished *X* again."; the meter count does not change. |

### Validation messages (other forms)

Messages for forms outside the Agent Label Contract's validation table. Each is shown under its field and announced in `alert`.

| Form | Field | Rule | Message |
|---|---|---|---|
| Main book card | Page field | 0 to the Book's page count | "Page must be between 0 and N." |
| Card note panel | Page | 1 to the Book's page count | "Page must be between 1 and N." |
| Card note panel | Page | A range runs from low to high | "The first page must come before the last." |
| Card note panel | Page | One page or one range | "Use one page or one range." |
| Finish dialog | Finished on | Not in the future | "Finished on can't be in the future." |
| Finish dialog | Finished on | Not before the Reading's start date | "Finished on can't be before *date*, when this reading started." |
| New book panel (edit) | Finished on | Can't be cleared once set | "A finish date can't be removed here." |

## Interaction Primitives

- **Click, Enter or Space** activate. A spine opens its popover. A book title is always a link to Book detail; a row's button opens its dialog.
- **Esc** closes the topmost popover, menu, dialog, panel, or pile (focus per Focus after close). In a search field with text, Esc clears it first.
- **No character-key shortcuts.** Search titles is the first control after the nav on Catalog.
- **Enter in the page field** saves (same as **Update**).
- **Outside click** closes the spine popover and the "⋯" menu. Modal dialogs and the side panel close only through their buttons, ×, or Esc.
- **One level of stacking.** Overlays stack at most one level above a panel: the Duplicate dialog over the New book panel is the only stack. A dialog opened from the spine popover or the "⋯" menu replaces it: the popover or menu closes first.
- **Motion.** Two intentional motions exist: the finish fill and the highlight ring. Panels, popovers, menus and dialogs appear with at most a 150 ms fade. Under `prefers-reduced-motion: reduce`, every transition and animation is off: the fill and ring are instant, panels and popovers appear without fading or sliding, the gauge and meters jump to their new value, and every scroll into view (new spine, finish moment, pile return) uses `behavior: 'auto'`.
- **Banned:** drag and drop, hover-only affordances, auto-starting any Reading, notifications outside the app, streak counters, greetings, confetti, red states, auto-playing animation on load.

## Accessibility Floor

Behavioral. Visual contrast lives in DESIGN.md → Colors.

- WCAG 2.2 AA target, both themes, with one documented deviation (Reflow, below).
- **Structure.** `header` (with `nav`), `main`, and one `h1` per page ("Home" visually hidden on Home; "Catalog", "Stats", "Card notes", "Backup"; the Book title on Book detail). Each route sets `document.title` ("Catalog — bookvie"). On a route change, focus moves to the new page's `h1`. A "Skip to content" link is the first focusable element.
- **Keyboard.** Every action is reachable and operable by keyboard. Tab order follows reading order: top nav → page content left to right, top to bottom. The bookcase is one Tab stop with arrow-key movement (see Bookcase → Keyboard).
- **Focus.** Visible sage focus ring on every focusable element, never suppressed; spines use the two-tone ring. Dialogs trap focus. Controls that can't act right now stay focusable with `aria-disabled="true"` and a description saying why, never natively disabled (except the Export and Restore busy state).
- **Esc.** See Interaction Primitives → Esc.
- **Names.** Every control has a visible label, and its accessible name is exactly that label, or starts with it when it adds the Book title ("Resume The Left Hand of Darkness"). Markers such as "(required)" sit outside the label element; requiredness is exposed with `required`. Spines carry full title, author, and status in their names, so a label cut with an ellipsis never hides information. Toggle groups have group names ("Theme", "Catalog view", "Order").
- **Live regions.** One polite `status` region per page for outcomes (page saved, book added or saved, Card note saved, finished, paused, color set, search and filter counts, Stats totals, restored). One `alert` region for blocking outcomes (validation failure, couldn't save). Before every save attempt and when a panel or dialog opens, both regions are emptied; new text is set after a short tick (about 100 ms), so repeated identical messages are announced again and old text is never mistaken for a new outcome. Messages that follow a focus change are set after focus has settled. The Duplicate and Confirm dialogs are `alertdialog`.
- **Progress.** Gauge, library meter, and mini bars are progressbars with `aria-valuemin`, `aria-valuemax`, and text values; markers never carry meaning by color alone.
- **Reduced motion.** Global rule in Interaction Primitives → Motion.
- **Forced colors.** Read and unread spines, fills and markers stay distinct (DESIGN.md → Colors → Forced colors).
- **Reflow — documented deviation from WCAG 2.2 SC 1.4.10.** bookvie is desktop-only with a 1024px minimum width; below that, including at 200–400% zoom, pages scroll horizontally instead of reflowing. The user accepted this deviation: bookvie has one user, who is also the builder, and PRD §6.3 lists phone layouts as Won't. The spine popover is still capped at the viewport width minus 32px.
- **Unattended operation.** Cataloging runs with nobody watching. Every outcome of the add-book form — saved, duplicate warning, validation error, couldn't save — is exposed by role, accessible name, and live-region text, not only by visual cues. Contract: Agent Label Contract.

### Focus after close

When a panel, dialog, popover or menu closes, focus goes to:

| Closed | Outcome | Focus goes to |
|---|---|---|
| New book panel | Added | The new spine (its row is in the page before focus moves); List view: the new row's title link |
| New book panel (edit) | Saved | **Edit** on Book detail |
| New book panel | Cancel, Close or Esc | The opener (**New book** or **Edit**) |
| Duplicate dialog | Don't add | Title field in the panel |
| Duplicate dialog | Add anyway | As "Added" |
| Spine popover | Any close | Its spine |
| A dialog opened from the popover | Cancel or Esc | The originating spine, or its nearest neighbor if it is gone |
| "⋯" menu | Esc or outside click | "⋯" |
| Start dialog | Confirmed | Home, the Main book title link (the app navigates to Home if needed) |
| Start dialog | Cancel or Esc | The opener |
| Finish dialog (Main book) | Done | Home, **Start reading** for the suggested Up next; else the "No Main book." heading |
| Finish dialog (other Reading) | Done | Book detail `h1` |
| Finish dialog | Cancel or Esc | The page field, or the opener on Book detail |
| Pause | Done (from Home) | **Start reading** or **Resume** in the empty Main book card |
| Pause | Done (from Book detail) | **Resume** on Book detail |
| Card note panel | Save or Cancel | The opener (**Add card note** or the note's Edit) |
| Confirm, Delete book | Deleted | Catalog, **Search titles** |
| Confirm, Delete card note | Deleted | The next note's Edit button, else the group heading |
| Confirm, Restore | Restored | Home `h1` |
| Any Confirm | Cancel or Esc | The opener |
| Pile | Close or Esc | The last viewed note's Edit button in the list; on Book detail, that note's Edit if it is among the notes shown, else "Go through as a pile" |
| Anything whose opener no longer exists | — | The page `h1` |

## Agent Label Contract

The add-book and edit-book forms are an interface for the AI cataloging skill as well as for the user (FR-2). This table is the single source for labels, accessible names, and roles; tests read from it (addendum, "AI entry is UI-only"). It covers only what the skill operates: the New book panel, the Duplicate dialog and Search titles. Other controls (for example, the Pile's Close) follow Accessibility Floor → Names but are not part of the contract. Mock of the panel and the Duplicate dialog: [key-catalog](mockups/key-catalog.html) (Alternates B1, B2).

**Lookup rule.** The skill and the tests match labels **exactly** (for example, Playwright `getByLabel('Title', { exact: true })`). Substring matching is not supported: "Title" must never match "Subtitle". The accessible name of every field is exactly its label below; "(required)" is outside the label.

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
| Cover | Field | file input (`input type=file`) | No | Image file. |
| Spine color | Field | `textbox` | No | `#RRGGBB` or empty (empty means automatic: cover-derived or curated). Stored and shown exactly as entered; no contrast adjustment. |
| From cover; Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone | Swatch buttons beside Spine color | `button` with `aria-pressed` | — | Shortcuts that fill Spine color (From cover empties it). From cover only when a cover exists. |
| Add book | Panel submit (new) | `button` | — | |
| Save changes | Panel submit (edit) | `button` | — | |
| Cancel | Panel footer | `button` | — | Closes the panel without saving. The only "Cancel" exposed while the panel is open. |
| Close | Panel × | `button` | — | Same as Cancel. |
| Don't add | Duplicate dialog | `button` | — | Closes the warning; typed fields kept; nothing saved. |
| Add anyway | Duplicate dialog | `button` | — | Saves despite the match. |
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

Outcome signals the skill reads (all within the page, no visual inspection needed). Both live regions are emptied at each **Add book** press, so any text present afterwards belongs to this attempt.

- **Panel open:** `dialog` named "New book".
- **Saved:** panel closes; `status` text "Added *Title*.". To verify, the skill types the title into **Search titles** and looks for a spine whose accessible name begins "*Title* by", or a List view row whose title equals *Title* exactly. It does not rely on the match count (a search for "Dune" also matches "Dune Messiah").
- **Duplicate:** `alertdialog` named "Possible duplicate"; its description names the existing Book(s); the panel behind is inert.
- **Validation error:** panel stays open; `alert` text "Not saved. N fields need attention: …"; each failing field has `aria-invalid="true"` and a described-by message.
- **Couldn't save:** panel stays open with all values; `alert` text "Couldn't save. Your data wasn't changed."

**Breaking-change rule.** Renaming, removing, or changing the role of any entry above, or changing an outcome signal's role or name, is a breaking change: it needs a version note in the changelog and an update to this table and to the tests in the same change. Visible label and accessible name always stay identical. New optional fields may be added without breaking the contract.

## Key Flows

### Flow 1 — Catalog a shelf (UJ-1)

Oleg, Thursday evening, 20 books from the hallway shelf.

Mock: [key-catalog](mockups/key-catalog.html).

Precondition: the skill's browser reaches the same bookvie data as Oleg's own browser (prd-deltas → For architecture). The catalog holds 54 Books, 23 of them finished.

1. Oleg stacks 20 books by the laptop, opens bookvie on Catalog, starts the AI cataloging skill, and goes to make dinner.
2. The skill activates **New book**. The `dialog` "New book" opens with focus on **Title**.
3. It fills **Title**, **Pages**, **Author(s)**, **Edition**, **Language**, **Publisher**, **Type**, **ISBN**, **Year** by exact label, and attaches a photo to **Cover**. It leaves **Finished on** empty.
4. It activates **Add book**. The panel closes, the status region reads "Added *Title*.", the new outlined spine is scrolled into view with a brief sage ring.
5. It types the title into **Search titles**, finds the spine named "*Title* by …", clears the field, and moves to the next book.
6. Book 14 is a second copy of a book already cataloged. On **Add book**, the `alertdialog` "Possible duplicate" appears naming the existing Book. Following its own instructions, the skill activates **Don't add**, then **Cancel** on the panel; nothing is saved and it moves on to book 15.
7. Book 17 has no page count on the cover. The skill skips **Pages**; on **Add book** the `alert` reads "Not saved. 1 field needs attention: Pages." The skill finds the number inside the book, fills **Pages**, and saves.
8. **Climax:** Oleg comes back with dinner. The Catalog bookcase has 19 new outlined spines in author order among the colored ones, and the meter reads "23 of 73 finished". The hallway shelf is in the catalog.

Failure path: If the skill had chosen **Add anyway** on book 14, Oleg would open the copy's spine → **Open book →** → Book detail → **Delete** → Confirm dialog "Delete *X*?" → **Delete book**. The original stays.

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

Mocks: [key-home](mockups/key-home.html) (Main book card actions), [key-book-detail](mockups/key-book-detail.html) (Card notes block, Pile).

1. On a coffee break Oleg reads a line in *The Left Hand of Darkness* worth keeping.
2. Oleg opens Home and clicks **Add card note**. A small index-card panel opens with Page prefilled "212".
3. Oleg types the quote, changes Page to "212–213", and clicks **Save note**.
4. **Climax:** The card closes; Oleg is still on Home with the reading progress in view, and the button reads "See card notes · 7". Back to work in under a minute.
5. That evening Oleg clicks **See card notes · 7**. The Card notes page opens scoped "In *The Left Hand of Darkness*". Oleg types "ice" in **Search card notes** and sees two notes with the word highlighted, then clicks "Go through as a pile" and steps through all seven with **Next**.

Failure path: Oleg types page 400 in a 330-page book → "Page must be between 1 and 330."; nothing saved.

### Flow 7 — Close the month

Oleg, 31 October, Saturday morning.

1. Oleg opens Stats. This year is selected: 11 books, 3,940 pages, bars for January to October.
2. Oleg picks **This month**: 2 books, 610 pages.
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

1. **Shared storage across browsers.** The cataloging skill drives its own browser; it must reach the same data as the user's browser. Owned by architecture (prd-deltas → For architecture). *(Blocks architecture.)*
