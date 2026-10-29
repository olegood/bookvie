# Spine Pair Review — bookvie

## Overall verdict
The pair is a usable contract. Every token reference resolves, all 32 component names match across both spines, all five UJs have complete flows, and the Agent Label Contract is unusually well specified. Removing Day types and the Reading calendar was carried through cleanly. Four gaps would make downstream teams invent behavior:
- FR-20 (tags, sort, filter) is missing or unspecified.
- There is no state for a failed local save.
- The agent-facing form contract depends on three unconfirmed assumptions.
- A few non-text contrast pairs on the bookcase fall below 3:1 and are not in the contrast table.

## 1. Flow coverage — adequate
Checked: UJ-1 to UJ-5 (PRD §2.3, as amended by prd-deltas 9/17) and FR-1 to FR-23 (minus the removed FR-12/13) against Key Flows, Component Patterns and State Patterns. Each of UJ-1 to UJ-5 maps to a flow (Flows 1–5) with a named protagonist (Oleg), numbered steps, a **Climax** beat and a failure path. Flows 6–8 cover Card notes, Stats + Export and Restore.
### Findings
- **high** FR-20 is missing. There are no free-form tags anywhere: no Tags field in the Agent Label Contract, no tag filter, no delta in prd-deltas.md. Sort and filter are named only in passing: "sort/filter" in the Catalog IA row (EXPERIENCE §IA), "sort chip" in the Bookcase header (DESIGN §Components → Bookcase), and the default sort (author) is an assumption. Nothing says which sort keys (title / author / date added / pages) or filters (tag / type / language / read status) exist, how they show, or how they combine with search. (EXPERIENCE §IA Pages, §Component Patterns; DESIGN §Layout → Catalog). *Fix:* Either add a Sort/filter control and a Tags field, with rows in both component tables, Agent Label Contract entries and a "filter, no matches" state, or record a prd-deltas item that defers FR-20 / tags.
- **medium** FR-6 Pause and FR-8 Side read promotion have no Key Flow. The Book detail row lists "Pause (Main book only, FR-6)" without its outcome (the paused Book becomes Up next, and the displaced Up next goes to Waiting for you or back to the catalog). Pause placement is still Open Question 3. The SM-3 thesis (paused Readings get finished) depends on this loop. (EXPERIENCE §Component Patterns → Book detail; Open Questions 3). *Fix:* Close OQ3, state Pause's consequences in the Book detail row, and add a short flow for pause → Waiting for you → resume.
- **medium** FR-9 "edit it later": no surface lets the user edit a Purpose after start. Book detail shows Purpose read-only, and the Start dialog prefills it only on resume. (EXPERIENCE §Component Patterns → Book detail, Start dialog). *Fix:* Add an "Edit Purpose" action on Book detail's Reading row, or record a delta.
- **low** FR-19 says "search inside a Book… when viewing a Book or browsing its pile". The Pile has no search and Book detail has no notes search; only the scoped Card notes list covers it. This is not in prd-deltas. (EXPERIENCE §Component Patterns → Pile, Card notes list). *Fix:* Record it as delta 28, or add search to the Pile.
- **low** Flow 7 has no failure path. If the download is cancelled or blocked, does "Last export" still update? This decides when the export timestamp is written. (EXPERIENCE §Flow 7). *Fix:* One line: the timestamp updates when the file is generated, or is never updated on cancel.
- **low** The meter figures across flows contradict each other. Flow 1 (Thursday) ends at "24 of 73 finished", but Flow 4 (Sunday) moves the meter to "25 of 54". (EXPERIENCE §Flow 1 step 8, §Flow 4 step 4). *Fix:* Align the numbers, or drop the cross-flow implication.

## 2. Token completeness — adequate
Checked: every frontmatter token and every `{path}` reference. The script found 0 unresolved references. All colors have hex values, and light/dark pairs exist for every chrome color. Read-spine colors are deliberately theme-independent, and the spine says so. The contrast table covers 15 pairs in both themes.
### Findings
- **medium** The Main book spine is "outlined in its spine color" on `shelf-wall`. Computed non-text contrast in light: `spine-sage` 2.92:1 and `spine-ochre` 2.63:1, both below the 3:1 floor that the spine sets for unread outlines. The label rule nudges only label contrast, never outline vs wall. (DESIGN §Components → Spine; §Colors → Spine colors). *Fix:* Add an "outline vs `shelf-wall` ≥ 3:1" rule for Main book outlines, or outline the Main book with `spine-unread-outline` and fill in its color.
- **medium** Contrast pairs are missing for markers and mini bars. `marker-waiting` (light, `#A8987A`) on `spine-unread-fill` = 2.75:1. `accent-mid` on `accent-soft` (Waiting-for-you mini bars) = 2.11:1 light. Neither is in the table. Text redundancy covers meaning, but the sand dot is the only visual difference from the sky dot. (DESIGN §Colors → Contrast). *Fix:* Darken `marker-waiting` in light, add the marker, mini-bar and gauge track/fill rows to the table, or state explicitly that these graphics are decorative because a text equivalent exists.
- **medium** Several rendered text roles have no typography token: the Home header date line, the author on the Main book card ("16px"), the New book panel heading ("18px"), Pile note text ("17px [ASSUMPTION]") and the "Bookcase" heading. Developers will invent sizes. (DESIGN §Components → Main book card, New book panel, Pile; §Layout → Home). *Fix:* Add `page-header`, `author`, `panel-heading` and `pile-text` tokens, or map these roles to existing tokens.
- **medium** The cover-derived spine color ("dominant cover hue, softened toward the birch palette") has no algorithm. The spine also doesn't say whether the color is computed once and stored or computed on every render. Architecture needs this for storage, export (delta 16) and the "never changes color between visits" promise, which is itself an [ASSUMPTION]. (DESIGN §Colors → Spine colors). *Fix:* Store the resolved color on the Book when the cover is set, and state the softening rule (for example, HSL lightness/saturation clamps).
- **low** Component tokens hardcode values that are off the spacing scale: padding `28px 32px` and `20px 22px`, gauge radius `7px`, widths 500/440/180/110px, plank 12px, marker 7px. (DESIGN frontmatter `components`). *Fix:* Snap them to the scale, or add named spacing tokens.
- **low** Shadows and the scrim (an [ASSUMPTION]) exist only as prose values, with no token names. `rounded.spine` is a multi-value string (`3px 3px 0 0`), which the spec type rules do not anticipate. (DESIGN §Elevation & Depth, frontmatter `rounded`). *Fix:* Add `shadow-*` / `scrim` tokens, or note the exception.

## 3. Component coverage — adequate
Checked: 32 components appear in both DESIGN §Components and EXPERIENCE §Component Patterns, with identical names and real rules. Primitives (`button-primary`/`secondary`, `link`, `chip`) are frontmatter-only, which is acceptable.
### Findings
- **medium** No component row exists in either spine for the Sort/filter control and the Tags field (see 1). (both spines).
- **medium** The "No Main book." state of the Main book card area is specified behaviorally (State Patterns: message plus the Up next Book with **Start reading**), but it has no visual spec. The same gap applies to the one-line "Finished *X*." in the bookcase header. (DESIGN §Components → Main book card). *Fix:* Add a "Main book card — empty" row.
- **medium** The Finish dialog's star rating and "Purpose fulfilled?" control have a visual spec but no behavioral or accessibility spec. Missing: the role (radio group?), keyboard operation, clearing a chosen star, and what "skipped" records. (EXPERIENCE §Component Patterns → Finish dialog). *Fix:* Specify both as native radio groups with "No rating" as the default.
- **medium** Book detail's layout is undecided (Open Question 1). It hosts Pause, Mark finished, Edit, Delete, Readings and the per-Book pace calculator, and it can be reached from four places. Story development cannot size or build it with confidence. (DESIGN §Components → Book detail; EXPERIENCE OQ1). *Fix:* Decide the layout before epics: even a wireframe-level ordering is enough.
- **low** Editing and deleting a Card note is mentioned ("Edit and delete per note (delete confirms)"), but the Card note panel has no edit mode and the Confirm dialog lists only Restore and Delete book. (EXPERIENCE §Component Patterns → Card notes list, Confirm dialog). *Fix:* Add an edit mode ("Save note") and a "Delete card note?" variant with its copy.
- **low** The color swatch buttons (popover and panel) have no stated accessible names (for example "Sage", "Clay") and no selected-state rule (`aria-pressed`). (EXPERIENCE §Component Patterns → Spine popover; §Agent Label Contract → Spine color).

## 4. State coverage — adequate
Checked surfaces: Home, Catalog, Book detail, Stats, Card notes, Backup, and every overlay. Empty, first-run, validation, duplicate, no-match, reduced-motion, theme and narrow-window states are well covered. Offline and permission-denied correctly don't apply.
### Findings
- **high** There is no state for a failed local save: storage write fails, quota exceeded (covers are images), or storage cleared or unavailable at load. The spine says "No sync, saving, or connection status is shown anywhere", and NFR Data safety says no action silently loses data. Together these leave architecture with no UX contract for failed persistence, and the unattended agent with no signal for it. The memlog notes "no loading state (local-first, deliberate)", but the spines never state it. (EXPERIENCE §Foundation → Local-first; §State Patterns). *Fix:* Add one row: "Couldn't save. Your change is still on screen." in the `alert` region, value kept, no red. Also add a line saying there is no loading state, with the reason.
- **medium** A re-read that is the Main book gets two conflicting rules. Bookcase says "a re-read of a finished Book keeps its full color [ASSUMPTION]", while Spine says the Main book is "outlined in its color and filled to its percentage". (EXPERIENCE §Bookcase; DESIGN §Components → Spine). *Fix:* Pick one rule and add a State Patterns row.
- **medium** Book detail has no state rows: never started, Main book, paused, finished, re-read, Side read, no Readings. Deleting the current Main book or Up next has no stated effect on Home. (EXPERIENCE §State Patterns). *Fix:* Add a Book detail state table with visible actions per state, plus the delete consequences.
- **medium** The Cover field has no failure states (not an image, oversized), and Restore has none for a partially valid or older-version export. (EXPERIENCE §Agent Label Contract → Cover; §State Patterns → Restore). *Fix:* Add the rows, and keep the copy calm.
- **low** Missing smaller states: a Stats Custom range with the end before the start, and a cancelled export (see 1).

## 5. Visual reference coverage — adequate
`mockups/` and `wireframes/` are absent, and `imports/` is empty. The single cited reference is `.working/birch-v2-light-dark.html`. Both spine preambles cite it, list what it superseded, and state that the spine wins. `.working/` also holds three direction renders (lamplight-study, birch-morning, reading-room-ledger) that neither spine references.
### Findings
- **medium** The only composition reference lives in `.working/` (unpromoted scratch). It is cited in the preambles only, never at the sections it illustrates (bookcase, popover, finish moment in dark). (DESIGN preamble; EXPERIENCE preamble). *Fix:* Promote it to `mockups/birch-v2.html` and add an inline pointer under DESIGN §Components → Bookcase / Spine popover and EXPERIENCE §State Patterns → Finish moment.
- **low** The three direction renders are orphans. *Fix:* Leave them out of the hand-off, or add one line marking them as non-normative exploration.

## 6. Bloat & overspecification — strong
EXPERIENCE is tight and table-driven. DESIGN prose carries editorial voice only in Brand & Style. Personas and FRs are referenced, not restated.
### Findings
- **low** The EXPERIENCE §Bookcase section repeats DESIGN rules: spine sizing, color precedence, fixed width. (EXPERIENCE §Bookcase bullets 2, 4). *Fix:* Keep the ordering, slice, scale, highlight and keyboard behavior; for visuals, point to DESIGN.

## 7. Inheritance discipline — adequate
Checked:
- Both `sources` paths resolve.
- The `design: ./DESIGN.md` link resolves.
- Glossary terms are used as defined, with the "Catch-up" redefinition carried by delta 4.
- Component names are identical in all four tables.
- EXPERIENCE refers to visuals by DESIGN token or alias name ("sage" = `accent`, "sky dot" = `marker-up-next`, "teal" = `spine-teal`), and all of them resolve.
- Removing Day types and the calendar is consistent: no residue in either spine.
### Findings
- **high** The Agent Label Contract depends on three [ASSUMPTION]s: Author(s) as one semicolon-separated field (OQ5), the exact Type option text ("Paperback" / "Hardcover" / "Ebook"), and the edit-mode submit "Save changes". The contract's own breaking-change rule makes these costly to change once tests and the AI skill bind to them. (EXPERIENCE §Agent Label Contract). *Fix:* Confirm all three with the user before architecture. If several authors become repeatable fields, specify their labels ("Author 1"…) and an "Add author" button.
- **medium** Flow titles are not the PRD UJ names verbatim: "Cataloging a stack" vs "The user catalogs a shelf"; "Catch-up" vs "The user catches up after three busy evenings" (days, after delta 9); "Urgent switch" vs "An urgent work book arrives"; "Finishing a book" vs "The user finishes a book". The IDs are present, so the flows stay traceable. (EXPERIENCE §Key Flows headings). *Fix:* Use the PRD names, with the amended wording where deltas apply.
- **medium** Two statements of how Book detail is reached contradict each other. IA says Book detail is reached from "a title in Home's panes", but Section pane says activating Up next and Waiting rows opens the Start dialog. Only the Main book card title links (an [ASSUMPTION]). (EXPERIENCE §IA Pages → Book detail vs §Component Patterns → Section pane). *Fix:* Decide whether pane rows open the Start dialog, Book detail, or both (for example, the title opens Book detail and a Resume button opens the dialog).
- **medium** "Search titles" is a placeholder in DESIGN, but the Accessibility Floor ("visible label equals accessible name") and the Agent Label Contract treat it as a label. Placeholders are not visible labels once the user types. The Card notes search has no label at all. (DESIGN §Components → Search field; EXPERIENCE §Accessibility Floor, §Agent Label Contract). *Fix:* Add a visible (or `aria-label` plus magnifier) label "Search titles", and name the Card notes search ("Search card notes").
- **low** "Traces to" cells cite "memlog …", a working log downstream consumers won't read. (EXPERIENCE §IA tables). *Fix:* Cite prd-deltas item numbers instead.
- **low** prd-deltas is missing two spine departures: dropping FR-11's separate "page last reached" (OQ2) and FR-19's in-Book and Pile search scope (see 1). *Fix:* Add them as items 28–29 once triaged.

## 8. Shape fit — adequate
DESIGN sections are in canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts). EXPERIENCE has all required defaults. Responsive & Platform is omitted, which is defensible: there is one desktop surface, and the 1024px minimum is stated in Foundation plus the "Narrow window" state. The invented sections (Bookcase, Agent Label Contract, Open Questions) earn their place.
### Findings
- **medium** Inspiration & Anti-patterns is omitted, although sources trigger it. The addendum names reference products (StoryGraph, Bookly, Basmo and their streaks), and the memlog records rejects: greeting, confetti, "Add pages", "Open existing", the left rail, and the pale decorative outline. These are scattered across the Banned list and the Don'ts, without reasons. (EXPERIENCE). *Fix:* Add a short section of 4–6 lifted/rejected bullets with one-line reasons, so future contributors don't re-add them.

## Mechanical notes
- **Token references:** a script check found 0 unresolved `{path}` references in DESIGN. Dark twins appear only in frontmatter and in the hex columns of the Colors table, which is acceptable.
- **Component names:** the 32 names are identical across DESIGN §Components, the DESIGN frontmatter keys (where present) and EXPERIENCE §Component Patterns.
- **Frontmatter:**
  - DESIGN: name, description, status `draft`, updated.
  - EXPERIENCE: name, status `draft`, updated, design, sources. Both sources resolve.
  - Both are still `draft`.
- **Mermaid:** none.
- **Memlog:** it is stale. It says "27 [ASSUMPTION]", but the spines now carry about 31. Update it at triage.
- **Spines-win statement:** it appears in both preambles. That is harmless; the rubric expects it once.
- **Copy:** Card note page-range copy is "between 1 and 330", while the page field says "between 0 and 330". This is intentional (a note page can't be 0), but the 1-based copy is marked [ASSUMPTION copy]; confirm it.
- **Removed features:** Day types, the Reading calendar and the Calendar screen are correctly absent from both spines, as the memlog override requires.
- **Load-bearing [ASSUMPTION]s for downstream:**
  - Agent contract trio (§7, high).
  - Pause placement (OQ3, §1).
  - Book detail as a page and its layout (OQ1, §3).
  - Stable or derived spine color (§2).
  - Home slice rule (EXPERIENCE §Bookcase).
  - Re-read color (§4).

  The rest (default theme System, default sort author, default Stats range, ~2s highlight fade, "No export yet" copy) are safe defaults that can be confirmed in a batch.
