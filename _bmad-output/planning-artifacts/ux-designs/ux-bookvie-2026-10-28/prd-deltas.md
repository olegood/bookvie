---
title: PRD deltas from the bookvie UX run
status: applied
updated: 2026-10-29
applied: PRD commit c78da40 (2026-10-29); A1–A6 carried to the PRD addendum as architecture handoff
for: bmad-correct-course
targets:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
ux: ./DESIGN.md, ./EXPERIENCE.md
---

# PRD deltas — bookvie UX run, 2026-10-28

Every change the UX spines imply for the PRD and addendum. Rationale cites `.memlog.md` in this folder. Items 1–13 are one change (Day types and Reading calendar removed) and its ripples.

## For architecture

Not PRD changes: expectations the UX spines place on the architecture (for bmad-architecture). Item A1 is top priority and blocks architecture.

| # | Topic | Expectation | Rationale |
|---|---|---|---|
| A1 | **Shared storage across browsers** | The AI cataloging skill drives its own automated browser. If storage is browser-local (IndexedDB / localStorage), the skill writes to a different store than the user's browser and UJ-1 never lands in the user's catalog. Storage must be shared by every browser on the machine (for example a local server plus a file), or the skill must be guaranteed to use the user's browser profile. | memlog change: architecture handoff (top priority). |
| A2 | **Two tabs or browsers at once** | UX rule: last write wins; reloading shows the current data. No live cross-tab sync and no "open elsewhere" notice are required. | Edge-case review; EXPERIENCE.md → Foundation. |
| A3 | **Failed writes are detectable** | Every save must report success or failure to the UI, so it can show "Couldn't save. Your data wasn't changed." and keep the user's input. No partial writes. | NFR Data safety; EXPERIENCE.md → State Patterns → Couldn't save. |
| A4 | **Stored, not recomputed** | Store on the Book: its resolved spine color (exactly as chosen, derived or assigned; no contrast adjustment) and its curated color, assigned at creation. Store on each finished Reading: its finish date as a local date, and the page count it finished with (Stats never change when Pages is edited later). Back-filled Readings have no start date. | DESIGN.md → Spine colors; D28, D40. |
| A5 | **Covers downscaled on upload** | Long edge 1200px, so ~500 covers keep the export a manageable single file. | Edge-case review (export size). |
| A6 | **Versioned export** | The export carries a format version. Restore validates the whole file before replacing anything; older versions are migrated; newer versions and damaged files are refused with nothing changed. "Last export" and UI preferences (theme, Catalog view, sort) stay local and are not exported. | EXPERIENCE.md → State Patterns → Restore. |

## A. Day types and the Reading calendar removed

Rationale for 1–13: memlog override — user drops Day types and the Reading calendar entirely ("extra effort that does not have any outcomes"); IA change — Calendar screen removed, Home loses the Day type picker, Stats = books + pages only, Catch-up = entering the current page.

| # | Location | Change |
|---|---|---|
| 1 | §4.4 FR-12 Set Day type, including Catch-up | Delete. |
| 2 | §4.4 FR-13 Reading calendar | Delete. Delete the §4.4 heading and intro ("The Day type is a fun, honest record…"). |
| 3 | §4.7 FR-16 Stats | Remove "and the count of each Day type". FR-16 = date range → Books finished and pages finished. Optionally note UX presets (This month / This year / Last year / All time / custom) and a bar per month. |
| 4 | §3 Glossary | Delete **Day type** and **Reading calendar**. Redefine **Catch-up**: "entering, on a later visit, the current page reached." |
| 5 | §1 Vision, para 1 | "entering the page reached and the type of each day" → "entering the page reached". |
| 6 | §1 Vision, pillar **Conscious reading** | Remove "a Day type each day". New: "You set a Purpose when you start a book and answer 'fulfilled?' when you finish." |
| 7 | §2.1 JTBD 3 ("record what kind of reading day it was…") | Delete. |
| 8 | §2.1 JTBD 4 | "my Readings and Reading calendar" → "my Readings and Card notes" (or "my reading data"). |
| 9 | §2.3 UJ-2 | Rewrite: "The user catches up after three busy days. The user opens bookvie, enters p.212, and presses Update. The gauge jumps to 64%, and '~7 days left' appears next to it." (See also item 17.) |
| 10 | §7 SM-1 | Remove the Reading calendar clause: "The app's current page stays up to date at least weekly for 3 months. Validates FR-10." |
| 11 | §7 SM-C1 | Reword without Day types / Rest: "the number of visits or page updates. More updates aren't the goal; see §5 Tone." |
| 12 | §5 NFR **Speed** | "Catch-up for a few days (Day types plus a page update) takes under 30 seconds" → "Catch-up (one page update) takes under 30 seconds and at most 2 interactions after opening the app." |
| 13 | §4.10 FR-22 export list; addendum "Gaps bookvie can own" | FR-22: remove "Day types" from the exported data. Addendum: delete the gap "Day-type check-in with no streak". |

## B. Bookcase and spine color

| # | Location | Change | Rationale |
|---|---|---|---|
| 14 | §6.2 Later "Progress visuals"; addendum "Progress visuals"; new Must FR in §4.1 (or §4.3) | Move into MVP: a **bookcase** of spines on the main screen (slice) and catalog (full), ordered by catalog sort, **unread = outlined, read = full color**, Main book spine filled to its reading percentage, overall meter "X of Y finished". Remaining Later items: cover filling, wishlist outline, dust layer, re-read badge. "Shelves" (physical location) stays Later. | memlog override: grey-unread / color-read shelf is MVP (user A1); decision: shelf atmospheric, ordered by catalog sort, not physical location; v2 render accepted (Main book spine filled to its %). |
| 15 | §4.1 FR-1 Optional fields | Add **spine color** (optional; empty = automatic). Consequence: a read Book's spine color is the user's choice, else derived from the cover, else from a curated palette. | memlog decision: read-book spine color customizable per Book; change: new Book attribute → FR-1 optional field. |
| 16 | §4.10 FR-22 | Add spine color to the exported Book data. | memlog change: per-Book spine color → FR-22 export. |

## C. Progress and re-entry

| # | Location | Change | Rationale |
|---|---|---|---|
| 17 | §4.3 FR-11; §2.3 UJ-2 | "~7 evenings" → "~7 days left"; replace "One evening is one day at Measured pace" with "Days left = pages left ÷ Measured pace, rounded up." | memlog override: re-entry copy reads "~N days left" (user reads during the day too). |
| 18 | §3 Glossary **Reading**; §4.3 FR-10 and FR-11; §4.10 FR-22 | A Reading records the time of its **last progress update**. FR-10: saving the page sets it. FR-11: re-entry shows "Last updated N days ago" (muted, never a warning). FR-22: include it in the export. | memlog decision: "Last updated N days ago" line; change: Reading needs a last-progress-update timestamp (include in export). |
| 19 | §4.10 FR-22 | Record the time of the last export and show "Last export: N days ago" on Backup and on the main screen; informational only. Whether the timestamp itself is exported is for architecture. | memlog decision: quiet "Last export" line; concern-scan: on Backup and Home. |

## D. Agent-facing form contract

| # | Location | Change | Rationale |
|---|---|---|---|
| 20 | Addendum "AI entry is UI-only" label list | Add **"New book"** (catalog button that opens the form) to the published label table; "Add book" stays the form's submit button. Also add **"Spine color"** (item 15), **"Cancel"** (panel only), **"Add anyway"**; see item 38 for the rest. Point to EXPERIENCE.md → Agent Label Contract as the single source. | memlog event: "Add book" collided between opener and submit; decision: opener = "New book", submit = "Add book". |
| 21 | §4.1 FR-2 Consequences | Add: "Every outcome of the form (saved, duplicate warning, validation error) is exposed through roles, accessible names, and live-region text, because cataloging runs unattended." | memlog decision: UJ-1 is unattended; outcomes machine-readable. |
| 22 | §4.1 FR-3 | No rule change. Clarify: the warning offers exactly two choices, **Don't add** (closes the warning, keeps the typed fields) and **Add anyway** (no "open existing"). The form behind is inert while the warning is open. | memlog decisions: only two choices; override: "Don't add" replaces "Cancel". |

## E. Card notes and starting a Reading

| # | Location | Change | Rationale |
|---|---|---|---|
| 23 | §4.8 header (Should); §6.1 | The main screen shows **Add card note** and **See card notes** from the first release. Promote FR-17 (add/edit/delete), FR-18 (pile) and FR-19 (Card notes page with all-Books and per-Book search) from Should to Must: Card notes ship fully in the MVP. | memlog override: main screen shows Add card note and See card notes from the start; override: Card notes fully in MVP (FR-17..19 Must). |
| 24 | §4.2 FR-5, FR-9 | The Start confirmation is shown on every start or resume (not only when a Main book exists), because it carries the optional Purpose field; the trade-off line appears only when a Main book exists. | memlog decision: Purpose is an optional field in the Start dialog, which shows the pause trade-off when a Main book exists. |
| 25 | §4.3 FR-10 | No rule change. Note: no separate "add pages" control; progress is the absolute page field plus Update. | memlog decision: "Add pages" removed as redundant. |

## F. Cross-cutting

| # | Location | Change | Rationale |
|---|---|---|---|
| 26 | §5 NFRs | Add: UI is English only; minimum viewport 1024px (horizontal scroll below, no phone layout); light / dark / system theme. See item 41 for the accessibility deviation this creates. | memlog concern-scan defaults; theme decision. |
| 27 | §5 NFR **Tone** | Add: no greetings, no exclamation marks, no praise; finish copy is "Finished *X*."; the finish moment is a single ~600ms spine fill that never replays. | memlog concern-scan voice; finish-moment decision. |

## G. Back-filling and finishing

| # | Location | Change | Rationale |
|---|---|---|---|
| 28 | §4.5 FR-14; §4.1 FR-1; §4.10 FR-22 | The finish date is user-editable: the finish flow has a **Finished on** date, default today, not in the future and not before the Reading's start. The add/edit form gets an optional **Finished on** field (empty = not read); a date creates a finished Reading on that date with **no start date** (a back-filled Reading). FR-22 exports it. | memlog decision: back-fill via "Finished on"; validation report Critical finding. |
| 29 | §3 Glossary **Measured pace**; §4.3 FR-11; §4.6 FR-15 | Measured pace excludes back-filled Readings (no start date) and counts days inclusively (same-day start and finish = 1 day). "~N days left" is whole days rounded up, minimum "~1 day left", hidden when there is no Measured pace or no pages left. | memlog assumption: back-filled Readings excluded from Measured pace; edge-case review (divide by zero). |
| 30 | §4.7 FR-16 | A back-filled Reading counts in the period of its Finished on date. "All time" starts at the earliest finished Reading. A finish counts by its local date. | memlog decision: Stats count back-fills in that period. |
| 31 | §4.5 FR-14 | "The user marks the Reading finished" applies to any Reading, not only the Main book, from Book detail, through the same finish flow. Finishing a Reading that isn't Main leaves the Main book unchanged and removes the Book from Up next and Waiting for you. Marking a Book with no Reading finished creates a back-filled Reading. Only finishing the Main book leads to "no Main book" and the Up next suggestion. | Edge-case review; user brief (finish on non-Main allowed). |

## H. State precedence

| # | Location | Change | Rationale |
|---|---|---|---|
| 32 | §3 Glossary **Waiting for you**; §4.2 FR-7 | Waiting for you lists every paused Reading **except the Up next Book's**: a paused Book that is Up next appears only in Up next, with Resume. | memlog decision: state precedence (2). |
| 33 | §4.2 FR-5, FR-7 | The start confirmation names any Up next displacement: "*Z* moves to Waiting for you." (paused Reading) or "*Z* returns to the catalog." (never started). | memlog decision: state precedence (3). |
| 34 | §4.2 FR-8 | A Side read that becomes the Main book, or is finished, leaves the Side reads automatically. "Which page?" is asked whenever a Side read is started, by any route. | memlog decision: state precedence (4). |
| 35 | §4.2 FR-6 | Pause is offered on Book detail and in the Main book card's "⋯" menu. When pausing would displace an Up next, a confirmation states it first. | User brief; validation report (Pause had no surface). |
| 36 | §6.2 Later "re-read badge"; item 14 | A re-read of a finished Book keeps its full-color spine and gets the Main-book marker (not an outline filled to its %). The Later re-read badge is unaffected. | memlog decision: state precedence (1). |

## I. Organizing

| # | Location | Change | Rationale |
|---|---|---|---|
| 37 | §4.9 FR-20 | Specified: **Sort** Author (default) / Title / Date added / Pages; the bookcase reorders its spines. **Filter chips** Read / Unread, Type, Language, Tag; non-matching Books are hidden (the shelf closes up), not dimmed. **Tags**: a free-text, comma-separated field on the add/edit form with suggestions from existing tags, shown on Book detail. Priority (Should) unchanged. | memlog decision: FR-20 specified. |

## J. Agent-facing form contract (additions)

| # | Location | Change | Rationale |
|---|---|---|---|
| 38 | Addendum "AI entry is UI-only" label list | Add **"Finished on"**, **"Tags"**, **"Don't add"** (duplicate warning), **"Save changes"** (edit-form submit), **"Close"** (panel ×), and the swatch names. Confirm: **Author(s)** is one field, semicolon-separated; **Type** is a select with exactly Paperback / Hardcover / Ebook. "(required)" sits outside the label, so the accessible name equals the label. The contract requires exact-match label lookup ("Title" never matches "Subtitle"). The skill confirms a save by an exact title match, not a result count. | memlog decision: label contract confirmed; override: "Don't add". |
| 39 | §4.1 FR-3 | Matching detail: authors compared ignoring case and surrounding spaces, as a set of semicolon-separated names; ISBNs compared after removing hyphens and spaces and converting ISBN-10 to ISBN-13. The check runs on edit only when title, author or ISBN changed. | Edge-case review. |
| 40 | §4.1 FR-1 | Editing Pages below the current page of an active or paused Reading, or below the highest Card note page, is refused with a message. Finished Readings keep the page count they finished with. | Edge-case review. |

## K. Cross-cutting (additions)

| # | Location | Change | Rationale |
|---|---|---|---|
| 41 | §5 NFRs (with item 26) | Record the accepted accessibility deviation: the 1024px minimum width does not meet WCAG 2.2 SC 1.4.10 Reflow (horizontal scroll at 200–400% zoom). Accepted: single user, desktop-only, phone layouts are Won't (§6.3). | memlog decision: reflow deviation accepted. |
| 42 | §5 NFR **Data safety** | Add: a save that fails is never silent; the UI says "Couldn't save. Your data wasn't changed." and keeps the user's input. | Validation report (no failed-save state). |
| 43 | §4.8 FR-19; §4.3 FR-11 | FR-19 "search inside a Book … or browsing its pile": the pile has no search; the Card notes list scoped to one Book covers search inside a Book. FR-11 "the page the user last reached" is the gauge's "p.N of M" label; no separate "Last time" fact (accepted). | Rubric review (dropped without a delta). |

