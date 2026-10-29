# Validation Report — bookvie

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md`
- **Run at:** 2026-10-28T22:27:29+0100

## Overall verdict

The pair is a usable contract. Every token reference resolves, all 32 component names match across both spines, all five UJs have complete flows, and the Agent Label Contract is unusually well specified. Removing Day types and the Reading calendar was carried through cleanly. Four gaps would make downstream teams invent behavior: FR-20 (tags, sort, filter) is missing or unspecified; there is no state for a failed local save; the agent-facing form contract depends on three unconfirmed assumptions; and a few non-text contrast pairs on the bookcase fall below 3:1 and are not in the contrast table.

The extra reviewers shift the picture from "usable with four gaps" to "one more pass before epics". The edge-case reviewer found one critical gap: there is no way to back-fill finish dates for already-read books, so cataloguing the paper diary would land every historical finish in this month's Stats and zero out Measured pace from day one. It also found that overlapping Book states (re-read Main, paused Up next, Side read + paused) have no precedence rule. The accessibility reviewer confirmed every claimed text contrast pair, but found non-text contrast failures beyond the rubric's (form-field borders, segmented-control selection, markers, mini bars, the spine focus ring) and agent-contract collisions: "(required)" leaking into accessible names, Title/Subtitle substring matches, two simultaneous "Cancel" buttons with opposite effects, and stale live-region outcomes the unattended skill could read as success.

Across all three reviewers, 103 raw findings deduplicate to 81. Where the same issue was raised by more than one reviewer it appears once below, with every reviewer listed. Findings tagged *Needs user decision* are product or scope choices rather than mechanical spec fixes.

## Category verdicts
- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — adequate
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — adequate

## Findings by severity

### Critical (1)

**[Edge cases]** — The spines never say how already-read Books get finished Readings with past dates (EXPERIENCE.md § Component Patterns → Book detail, Finish dialog; PRD FR-14, FR-16, Glossary "Measured pace") *Needs user decision.*  
Flow 1 ends with "24 of 73 finished", yet the only finish paths are "enter the last page" and "Mark finished", and both stamp today. Back-filling the paper diary would put every historical Book into this month's Stats. It would also give Measured pace a start date equal to its finish date, so 0 days, or invent a start date. Pace, the "~N days left" line, and the library calculator would all be wrong from day one.  
Fix: Add an "Add past reading" (or "Mark as read before") action on Book detail with optional start and finish dates. Say how undated past Readings count: excluded from Stats periods and from Measured pace, but included in the "X of Y finished" meter. Record this in prd-deltas.md.

### High (17)

**[Rubric · Flow coverage / Rubric · Component coverage]** — FR-20 (tags, sort, filter) is missing or unspecified (EXPERIENCE §IA Pages, §Component Patterns; DESIGN §Layout → Catalog) *Needs user decision.*  
There are no free-form tags anywhere: no Tags field in the Agent Label Contract, no tag filter, no delta in prd-deltas.md. Sort and filter are named only in passing: "sort/filter" in the Catalog IA row (EXPERIENCE §IA), "sort chip" in the Bookcase header (DESIGN §Components → Bookcase), and the default sort (author) is an assumption. Nothing says which sort keys (title / author / date added / pages) or filters (tag / type / language / read status) exist, how they show, or how they combine with search. Neither spine has a component row for the Sort/filter control or a Tags field.  
Fix: Either add a Sort/filter control and a Tags field, with rows in both component tables, Agent Label Contract entries and a "filter, no matches" state, or record a prd-deltas item that defers FR-20 / tags.

**[Rubric · State coverage / Accessibility]** — No failed-save state, and outcome text can be stale (EXPERIENCE §Foundation → Local-first; §State Patterns; §Accessibility Floor → Live regions; §Agent Label Contract → Outcome signals)  
Storage write failure, quota exceeded (covers are images) and storage cleared/unavailable at load have no state, and "no sync, saving, or connection status is shown anywhere" rules one out — while NFR Data safety says no action silently loses data. Separately, the single polite `status` region keeps "Added X." from the previous book and won't re-announce identical text, so an unattended skill can read the last book's outcome and report success.  
Fix: Add a state row: alert "Couldn't save. Your change is still on screen." (calm, no red, value kept, panel stays open). Clear the `status`/`alert` regions when the panel opens and on every Add book press, and set new text after a tick. State that there is no loading state, and why.

**[Rubric · Inheritance discipline / Accessibility / Rubric · Component coverage]** — Agent Label Contract rests on three unconfirmed assumptions and omits controls the agent will meet (EXPERIENCE §Agent Label Contract; §Component Patterns → Spine popover) *Needs user decision.*  
Author(s) as one semicolon-separated field (OQ5), the exact Type option text, and the edit-mode "Save changes" are all [ASSUMPTION]s, and the contract's own breaking-change rule makes them costly to change later. The contract also omits: the panel close "×" (name it Close), the eight swatch buttons and "From cover" chip (no names, no `aria-pressed`), the "Edit book" dialog name, Pages accepting decimals, and the Card notes search name.  
Fix: Confirm the three assumptions with the user before architecture (if authors become repeatable, specify "Author 1"… and "Add author"). Add rows for every missing control, with names and states.

**[Accessibility]** — The "(required)" marker is likely to become part of the accessible name (DESIGN.md § Components → New book panel; EXPERIENCE.md § Agent Label Contract)  
DESIGN.md puts "(required)" next to the label. If it sits inside `<label>`, the name of Title becomes "Title (required)". That breaks the contract's rule "Visible label and accessible name always stay identical", and an exact `getByLabel('Title')` will miss it. Separately, the default substring match `getByLabel('Title')` also matches **Subtitle**, so the skill can hit an ambiguous or wrong field without anyone watching.  
Fix: Keep "(required)" outside the `<label>`, or wrap it in `aria-hidden="true"` and expose requiredness with `required`/`aria-required="true"`. State in the contract that the accessible name is exactly the bare label. Tell the skill and the tests to match labels exactly, and list Title/Subtitle as a known substring pair.

**[Accessibility]** — Two buttons named "Cancel" can be in the DOM at once, with opposite effects (EXPERIENCE.md § Agent Label Contract, § Duplicate dialog; DESIGN.md § Duplicate dialog)  
While the Duplicate `alertdialog` is open over the New book panel, the panel's footer **Cancel** (discard everything, close the panel) and the dialog's **Cancel** (go back to the panel with fields intact) share one name. The contract only says to "resolve within the open dialog", which pushes scoping onto the skill. If the skill picks the wrong one, the book is silently discarded.  
Fix: Give the duplicate's dismiss button a unique name such as **Don't add** or **Back to form**, and add it to the contract. Also require the panel to be `inert` (native `showModal()` stacking) while the alertdialog is open, so only one set of buttons is exposed.

**[Accessibility]** — The bookcase keyboard model for about 500 spines is only an [ASSUMPTION] and is underspecified (EXPERIENCE.md § Bookcase → Keyboard, Catalog scale, Highlight after add)  
Rows reflow with viewport width, so Up/Down has no stable meaning. These are all undefined: the container role (roving `tabindex` over buttons in a generic `div` is not a recognized composite), Home/End and PageUp/PageDown, position info ("12 of 500"), what happens when the focused spine is filtered out or the sort changes, and how focus "moves to the new spine" when that row is lazily unrendered.  
Fix: Decide the pattern and remove the [ASSUMPTION]. For example: container `role="list"` named "Bookcase, 54 books", spines as list items with buttons; one Tab stop; Left/Right step through spines; Up/Down move to the nearest spine in the visual row above or below; Home/End go to the row's ends and Ctrl+Home/End to the library's ends. If the focused spine disappears, focus moves to its nearest neighbor or to the search field. The target row is rendered before focus moves. Apply the same model to the Home slice.

**[Accessibility]** — Focus has no defined destination when a dialog removes its own trigger (EXPERIENCE.md § Interaction Primitives → Esc, § Finish dialog, § Start dialog, § Confirm dialog)  
After **Done** in the Finish dialog, the page field and **Update** are gone (no Main book). When finishing starts from Book detail, the app navigates to Home. Start reading may navigate to Home (Flow 3), Delete book removes the current page, Restore reloads Home, and a dialog opened from the popover has no popover to return to. "Return focus to the opener" can't work in any of these cases, so focus drops to `<body>`.  
Fix: Add a focus-destination table. Suggested targets: Finish Done → **Start reading** for the suggested Up next, or the "No Main book." heading. Start confirmed → the new Main book's page field or heading. Delete → Catalog search or the neighboring spine. Restore → Home `h1`. Popover-launched dialog closed → the originating spine.

**[Accessibility]** — The 1024px no-reflow floor fails WCAG 1.4.10 (Reflow) at 200–400% zoom (EXPERIENCE.md § Foundation, § State Patterns → Narrow window; DESIGN.md § Layout) *Needs user decision.*  
At 200% on a 1440px laptop, the CSS viewport is 720px. Every page, including text-only ones (Card notes, Backup, Stats, the New book form), then scrolls in two directions. The fixed 440px panel and 500px popover make it worse. The bookcase itself already reflows by row count, so the floor only hurts.  
Fix: Keep 1024px as the design target, not a hard floor. Below it, stack Home's two columns, let the panel go full width, cap the popover at `100vw - 32px`, and let the toolbar wrap. No phone *design* is needed, only a layout that doesn't break.

**[Edge cases / Rubric · State coverage]** — Overlapping Book states have no precedence rule (re-read Main book, paused Up next, Side read + paused…) (EXPERIENCE.md § Component Patterns → Spine, Spine popover; § Bookcase; DESIGN.md § Components → Spine)  
A Book can be finished and re-read as Main, finished and Up next, Up next with a paused Reading, a Side read and Up next, or a Side read with a paused Reading. The spine accessible name allows one status. The popover lists one primary action per state, and "Up next → Start reading" is wrong when the Up next has a paused Reading (it should be Resume). DESIGN draws one marker per spine. The re-read spine is "[ASSUMPTION] keeps its full color", but the Main-book rule says "outlined in its color, filled to %"; these contradict for a re-read Main book. The rubric flags the same re-read conflict, and notes Book detail has no per-state rows (never started, Main, paused, finished, re-read, Side read, no Readings) or visible actions per state.  
Fix: Add a state table to EXPERIENCE.md with orthogonal axes: read-ever (yes/no), Reading state (none, Main, paused), Up next (yes/no), Side read (yes/no). For each combination give the spine fill, the marker (one dot or two), the accessible-name status string (for example "finished, re-reading, 12%"), and the popover primary action. Derive a Book detail state table (visible actions per state) from it.

**[Edge cases]** — "Mark finished" on a Reading that isn't Main is undefined (EXPERIENCE.md § Component Patterns → Finish dialog, Book detail)  
Book detail offers Mark finished in some states, and Done always goes to Home, plays the fill on the slice, and switches the Main book card to no-Main-book. That's wrong when the finished Reading was paused, Up next, or never started. Book detail doesn't say which states show Mark finished. Finishing an Up-next or Waiting Book doesn't say whether it leaves Up next or Waiting. Finishing an unread Book with no Reading doesn't say whether a Reading is created, or with which start date.  
Fix: List the states where Mark finished appears. For a Reading that isn't Main: stay on Book detail, play no fill (or play it only if the spine is visible), leave the Main book alone, and remove the Book from Up next and Waiting. State what an unread Book finish creates.

**[Edge cases]** — Editing the page count below the current page is undefined (EXPERIENCE.md § Component Patterns → New book panel edit mode, Page field, Card note panel; PRD FR-10, FR-17)  
If a Reading sits at p.300 and Pages is edited to 250, the spines don't say whether the gauge reads 120%, whether the page clamps, or whether the Finish dialog opens. Card notes on pp.260–270 fall out of range, and the spines don't say whether they are refused, flagged, or kept. Stats use "all of a Reading's pages", so finished Readings would change retroactively.  
Fix: On Save changes, validate Pages ≥ the highest current page of any active or paused Reading and ≥ the highest Card note page, with an inline message. Alternatively, clamp the page and say so. Decide whether finished Readings store their own page count for Stats.

**[Edge cases]** — It's unclear whether a paused Up next Book also appears in Waiting for you (EXPERIENCE.md § Component Patterns → Section pane; PRD FR-7, Glossary)  
EXPERIENCE says Waiting lists "every paused Reading". FR-7 says a displaced Up next "moves to Waiting for you", which implies it wasn't there while Up next. Flow 3 puts the paused *Left Hand* in Up next only. If Waiting does include it, the Book appears twice on Home with two markers.  
Fix: Define Waiting for you as paused Readings excluding the Up next Book, and use the same definition for the "(N)" count, the spine marker, and the Library pace scope.

**[Edge cases]** — Starting a Book when an Up next exists displaces that Up next silently (EXPERIENCE.md § Component Patterns → Start dialog; Flow 3 step 6)  
Flow 3 sends the previous Up next "back to the catalog", but the Start dialog's trade-off line names only the paused Main book. That breaks the PRD's "every switch a deliberate, visible trade-off".  
Fix: Add a second trade-off line when an Up next exists and isn't the Book being started: "*Z* leaves Up next." (or "*Z* moves to Waiting for you.").

**[Edge cases]** — The slice rule doesn't include the Main book's row (EXPERIENCE.md § Bookcase → Home slice vs § Component Patterns → Page field, Flow 2 step 4)  
The rule is "row with Up next, then rows with recent finishes", but Flow 2 and the Page field rule say the Main book spine fill updates on the slice. With 500 Books, the Main book is usually on another row.  
Fix: Change the slice priority to the Main book row first, then the Up next row, then the most recent finishes, up to 3 rows.

**[Edge cases]** — Measured pace can divide by zero or produce extreme values (EXPERIENCE.md § Component Patterns → Re-entry line, Pace calculator; PRD Glossary "Measured pace", FR-15)  
A Reading started and finished the same day gives 0 days. Pace below 1 page/day gives "~1,240 days left". The calculator prefill doesn't say whether it is rounded or shown as 0.37. "About N months" has no rule for under 1 month or over several years. The Library scope with 0 pages left has no result rule.  
Fix: Count days inclusively (minimum 1). Prefill with one decimal. Format results as days under 60, months under 24, otherwise years. For 0 pages left show "Nothing left to read." or hide the result. Cap or round "~N days left" to weeks or months beyond 60 days.

**[Edge cases / Accessibility]** — Duplicate matching and the agent's confirmation step are fragile (EXPERIENCE.md § Component Patterns → Duplicate dialog; Agent Label Contract outcome signals; PRD FR-3)  
Author comparison rules aren't stated (FR-3 normalizes titles only). Semicolon splitting, case, and "Le Guin, Ursula" vs "Ursula Le Guin" are unspecified. ISBN-10 vs ISBN-13 of the same edition don't match. The dialog names "the existing Book" (singular) when there may be several matches. It isn't stated whether Save changes in edit mode runs the check. After the skill chooses **Add anyway**, or adds "Dune" when "Dune Messiah" exists, its documented check "1 book matches" fails, because search is substring-based. Accessibility adds: "1 book matches" also fails for substring titles (Dune vs Dune Messiah), and filtered-out spines must leave the accessibility tree.  
Fix: Normalize authors as titles are normalized (case, whitespace, per semicolon item). Optionally convert ISBN-10 to ISBN-13 before comparing. Name up to 3 matches plus "and N more". Run the check on edit only when title, author, or ISBN changed. Change the agent's success signal to the `status` text "Added *Title*." plus "a row whose title equals *Title*" rather than a count of 1. Confirm by the accessible name of the remaining spine/row; hide filtered spines with `hidden`; debounce the count announcement.

**[Edge cases]** — Two tabs, and the agent's browser, have no rules (EXPERIENCE.md § Foundation → Local-first, Users; Flow 1) *Needs user decision.*  
With local browser storage, two open tabs each hold stale state, and the last write wins (a lost page update or card note). More seriously, the cataloging skill drives a browser through Playwright, which by default uses its own profile. Unless the skill uses the user's profile, it writes to a separate local store, and Flow 1's climax ("Oleg comes back… 19 new spines") never happens.  
Fix: State the expectation for architecture: one shared store, with a cross-tab change listener such as a `storage` event or BroadcastChannel that reloads state, or a "bookvie is open in another tab" notice. Add to Flow 1 that the skill must run in the user's browser profile, or against the same local origin and store. Flag this in prd-deltas.

### Medium (38)

**[Rubric · Flow coverage / Edge cases]** — Pause (FR-6) and Side read promotion (FR-8) have no Key Flow, and Pause's consequences are undefined (EXPERIENCE §Component Patterns → Book detail; Open Questions 3)  
The Book detail row lists "Pause (Main book only, FR-6)" without its outcome (the paused Book becomes Up next, and the displaced Up next goes to Waiting for you or back to the catalog). Pause placement is still Open Question 3. The SM-3 thesis (paused Readings get finished) depends on this loop. Pause also has no confirmation and silently displaces an existing Up next.  
Fix: Close OQ3, state Pause's consequences in the Book detail row, and add a short flow for pause → Waiting for you → resume. Show the displacement line (or state the silent move) when Pause bumps an Up next.

**[Rubric · Flow coverage]** — FR-9 "edit it later" has no surface: a Purpose can't be edited after start (EXPERIENCE §Component Patterns → Book detail, Start dialog)  
Book detail shows Purpose read-only, and the Start dialog prefills it only on resume.  
Fix: Add an "Edit Purpose" action on Book detail's Reading row, or record a delta.

**[Rubric · Token completeness / Accessibility / Edge cases]** — Read and Main-book spines have no non-text contrast floor against the shelf wall (DESIGN §Components → Spine; §Colors → Spine colors, label rule; §Contrast)  
Main book outlines in `spine-sage` (2.92:1) and `spine-ochre` (2.63:1) fall below 3:1 on light `shelf-wall`; dark plum is 2.78 against a neighbouring unread fill. The colour nudge protects only label contrast, so a pale cover-derived colour (light) or near-black one (dark) makes a read spine vanish or read as unread.  
Fix: Add a second nudge constraint: spine fill/outline ≥ 3:1 against `shelf-wall` in both themes (relative luminance ≈0.142–0.242), or give every read spine a 1px edge in `spine-unread-outline` weight.

**[Rubric · Token completeness / Accessibility]** — Spine markers and Waiting-for-you mini bars fail non-text contrast and are missing from the contrast table (DESIGN §Colors → Contrast; §Spine → Markers; §Section pane)  
`marker-waiting` sand is 2.75:1 on light `spine-unread-fill`; on coloured spines (re-reads, paused finished books) sky and sand drop to 1.1–2.3:1. `accent-mid` on `accent-soft` mini bars is 2.11:1 in light, and the row shows only "p.N", so the proportion isn't available as text.  
Fix: Darken light sand to ≈`#8C7B5C` and ring each marker 1.5px in `spine-unread-fill`/`page`; use `accent` for mini-bar fill (4.48) or add "of M"/percent text; add marker, mini-bar and gauge rows to the table.

**[Rubric · Token completeness]** — Several rendered text roles have no typography token (DESIGN §Components → Main book card, New book panel, Pile; §Layout → Home)  
The Home header date line, the author on the Main book card ("16px"), the New book panel heading ("18px"), Pile note text ("17px [ASSUMPTION]") and the "Bookcase" heading. Developers will invent sizes.  
Fix: Add `page-header`, `author`, `panel-heading` and `pile-text` tokens, or map these roles to existing tokens.

**[Rubric · Token completeness / Edge cases]** — Spine colour resolution and persistence are undefined (DESIGN §Colors → Spine colors; EXPERIENCE §Spine popover; §Agent Label Contract → Spine color)  
The cover-derived colour has no algorithm, and nothing says whether it is computed once and stored or on every render. "From cover" could store a frozen hex or mean empty/automatic (re-derived when the cover changes); a user can't tell which. Cover-less curated colours are "stable per Book (e.g. from id)" but ids may change on restore. Invalid hex from the agent has no message.  
Fix: Store the resolved colour on the Book (survives export/restore), state the softening rule (HSL clamps), define "From cover" = automatic with an "Automatic" option for cover-less Books, and add "Spine color must be #RRGGBB or empty."

**[Rubric · Component coverage]** — The "No Main book." state of the Main book card area is specified behaviorally (State Patterns (DESIGN §Components → Main book card)  
Message plus the Up next Book with **Start reading**), but it has no visual spec. The same gap applies to the one-line "Finished *X*." in the bookcase header.  
Fix: Add a "Main book card — empty" row.

**[Rubric · Component coverage / Accessibility]** — Finish dialog rating and "Purpose fulfilled?" have no semantics, and the selected star is colour-only (EXPERIENCE §Component Patterns → Finish dialog; DESIGN §Finish dialog)  
Visual spec only: no role, keyboard operation, way to clear a choice, or definition of what "skipped" records. "Sage when selected" makes selection a colour-only change (WCAG 1.4.1).  
Fix: Native radio groups ("Rating", "Purpose fulfilled?") with named options ("4 stars") and "No rating" as default; show selected stars filled, not just recoloured.

**[Rubric · Component coverage]** — Book detail's layout is undecided (Open Question 1) (DESIGN §Components → Book detail; EXPERIENCE OQ1) *Needs user decision.*  
It hosts Pause, Mark finished, Edit, Delete, Readings and the per-Book pace calculator, and it can be reached from four places. Story development cannot size or build it with confidence.  
Fix: Decide the layout before epics: even a wireframe-level ordering is enough.

**[Edge cases / Rubric · State coverage]** — Restore failure modes collapse into one message (EXPERIENCE.md § State Patterns → Restore; prd-deltas #19)  
An older-version export (needs migration), a newer-version export, a truncated or corrupt file, and a valid bookvie file with broken references all have no rule. "Restore done: Home reloads" doesn't say whether the app navigates away from Backup. It isn't stated whether "Last export" after a restore comes from the file or stays local ("No export yet" on the new laptop would be misleading). Theme and Catalog view preferences aren't stated as included or excluded. The rubric also flags partially valid and older-version exports.  
Fix: Accept older versions through migration. Refuse newer versions with "This export is from a newer bookvie." Refuse corrupt files with "This file is damaged. Nothing was changed." Validate everything before replacing anything. After a restore, navigate to Home. Keep "Last export" local. Preferences are not restored.

**[Edge cases / Rubric · State coverage]** — Field validation beyond "required" has no messages, including Cover failures (EXPERIENCE.md § Agent Label Contract; § State Patterns → Validation error)  
Pages 0 or 1.5, Edition 0, Year 99999, ISBN with letters, and a non-image or 30 MB Cover file. The Type select has no placeholder rule, so "required" can never fail if Paperback is preselected. These are outcomes the unattended skill must read. The rubric independently flags the Cover field (not an image, oversized).  
Fix: Add a validation table with each rule and its exact message. Give the Type select an empty first option. Downscale covers on upload (for example, a long edge of 1200px) and refuse non-images with a message.

**[Rubric · Visual reference coverage]** — The only composition reference lives in `.working/` (unpromoted scratch) (DESIGN preamble; EXPERIENCE preamble)  
It is cited in the preambles only, never at the sections it illustrates (bookcase, popover, finish moment in dark).  
Fix: Promote it to `mockups/birch-v2.html` and add an inline pointer under DESIGN §Components → Bookcase / Spine popover and EXPERIENCE §State Patterns → Finish moment.

**[Rubric · Inheritance discipline]** — Flow titles are not the PRD UJ names verbatim (EXPERIENCE §Key Flows headings)  
"Cataloging a stack" vs "The user catalogs a shelf"; "Catch-up" vs "The user catches up after three busy evenings" (days, after delta 9); "Urgent switch" vs "An urgent work book arrives"; "Finishing a book" vs "The user finishes a book". The IDs are present, so the flows stay traceable.  
Fix: Use the PRD names, with the amended wording where deltas apply.

**[Rubric · Inheritance discipline]** — Two statements of how Book detail is reached contradict each other (EXPERIENCE §IA Pages → Book detail vs §Component Patterns → Section pane)  
IA says Book detail is reached from "a title in Home's panes", but Section pane says activating Up next and Waiting rows opens the Start dialog. Only the Main book card title links (an [ASSUMPTION]).  
Fix: Decide whether pane rows open the Start dialog, Book detail, or both (for example, the title opens Book detail and a Resume button opens the dialog).

**[Rubric · Inheritance discipline / Accessibility]** — "Search titles" is only a placeholder, and the Card notes search has no name (DESIGN §Components → Search field; EXPERIENCE §Accessibility Floor, §Agent Label Contract)  
The Accessibility Floor ("visible label equals accessible name") and the Agent Label Contract treat "Search titles" as a label, but a placeholder vanishes on typing and `getByLabel` doesn't match it.  
Fix: Give it `aria-label="Search titles"` (or a visible/visually hidden label), keep the placeholder decorative, and name the Card notes search "Search card notes".

**[Rubric · Shape fit]** — Inspiration & Anti-patterns is omitted, although sources trigger it (EXPERIENCE)  
The addendum names reference products (StoryGraph, Bookly, Basmo and their streaks), and the memlog records rejects: greeting, confetti, "Add pages", "Open existing", the left rail, and the pale decorative outline. These are scattered across the Banned list and the Don'ts, without reasons.  
Fix: Add a short section of 4–6 lifted/rejected bullets with one-line reasons, so future contributors don't re-add them.

**[Accessibility / Edge cases]** — The spine popover's focus model is undefined (EXPERIENCE.md § Spine popover; DESIGN.md § Spine popover)  
"Non-modal dialog" doesn't say where focus goes on open (the title, the primary action, or ×), whether Tab leaves the popover into the next page element or wraps, or what happens to an open popover when focus leaves it. The 500px popover anchored above a spine can also be clipped at the viewport edges, on the top shelf row, and under zoom. Edge cases adds: no flip rule for top-row/edge spines, and lazily rendered rows keep Cmd+F from reaching off-screen spines.  
Fix: On open, focus the first actionable control and give the dialog `aria-labelledby` pointing at the title. Tab past the last control closes the popover and continues after the spine. Close on focus-out. Add collision-aware placement (flip below, shift inward) with `max-width: calc(100vw - 32px)`. Consider rendering all ~500 spines as lightweight DOM.

**[Accessibility]** — The "/" shortcut fails WCAG 2.1.4 (Character Key Shortcuts) as written (EXPERIENCE.md § Interaction Primitives)  
It is a single printable-character shortcut with no way to turn it off or remap it, so speech-input users who dictate "slash" are affected. "Ignored while typing in a field" also doesn't cover `select`, `contenteditable`, IME composition, modifier keys, or an open modal or popover, where it would move focus out of a trapped dialog.  
Fix: Add a "Keyboard shortcut: / focuses search" on/off setting (default on), or require a modifier. Ignore the key while any modal or popover is open, inside editable or select elements, during composition, and with any modifier pressed.

**[Accessibility]** — There is no skip link and no landmark, heading, or page-title spec (WCAG 2.4.1, 2.4.2, 1.3.1) (EXPERIENCE.md § Accessibility Floor)  
Every page puts 8 tab stops first (5 nav items plus 3 theme options). Single-page-app route changes don't announce the new page or move focus.  
Fix: Add a "Skip to content" link, `header`/`nav`/`main` landmarks, one `h1` per page ("Home", "Catalog", and so on), a `document.title` per route, and move focus to the `h1` (or announce it) on route change.

**[Accessibility]** — Page-field and card-note errors are silent (EXPERIENCE.md § State Patterns → Validation error (Page field, Card note panel), § Page field)  
State Patterns says "Inline message, nothing saved, value kept", with no `aria-invalid`, no `aria-describedby`, and no announcement. That contradicts the Accessibility Floor ("One `alert` region for … validation failure"). "of M" is also not tied to the field.  
Fix: Apply the New book rules here: `aria-invalid`, a message linked with `aria-describedby`, and the message announced through the `alert` region. Link "of 330" to the field with `aria-describedby`.

**[Accessibility]** — Pile navigation isn't announced (EXPERIENCE.md § Pile)  
**Next** changes the note while focus stays on the button, so a screen reader hears nothing. The order toggle and "N of M" have no semantics.  
Fix: Put the card in an `aria-live="polite"` region (or announce "Note 3 of 7, p.42: …"). Make Page order · Shuffled two `aria-pressed` buttons, or a radio group named "Order".

**[Accessibility]** — Form-field boundaries are invisible (DESIGN.md § Page field, § New book panel, § Search field)  
The `line` border is 1.33:1 on `surface` and 1.26:1 on `surface-inset` (dark: 1.30 / 1.38). It is the only edge that marks the page field, search, all New book fields, the pace field, and the hex field, which fails 1.4.11.  
Fix: Add an `input-border` token at ≥ 3:1, for example `#8A8273` light (3.80 on surface) and `#767A6F` dark (3.53). Keep `line` for decorative hairlines only.

**[Accessibility]** — The selected state of segmented controls is barely visible (DESIGN.md § Theme toggle, § Catalog view toggle)  
Theme, Catalog view, Purpose fulfilled, Stats presets, and Pile order all show selection with an `accent-soft` fill (1.22:1 vs `surface`, 1.29 dark) plus weight 600.  
Fix: Add a non-color indicator with ≥ 3:1 contrast: a 2px `accent` underline or border on the selected option, or a check glyph.

**[Accessibility]** — The spine focus ring has weak contrast against its surroundings (DESIGN.md § Focus ring, § Layout → spine-gap)  
A 2px ring at 2px offset fills the entire 4px spine gap, so its outer edge touches neighboring spines (accent vs curated colors: 1.01–1.73 light, 1.40–2.38 dark). In dark theme, its bottom edge lies over the walnut plank (`accent-dark` vs `birch-plank-dark` 2.70). The inner edge against the wall passes (4.55 / 7.27), so this is borderline, but it affects the app's main interaction.  
Fix: Use a two-tone ring for spines, like the highlight ring (`0 0 0 2px page, 0 0 0 4px accent`), or widen the gap to 6px. Check the plank edge in dark theme.

**[Edge cases]** — Cancelling the Finish dialog leaves a loop (EXPERIENCE.md § Component Patterns → Page field, Re-entry line)  
The Reading sits at the last page, so the gauge reads 100%, the Main spine looks fully filled (like a finished Book), and "~0 days left" shows. Pressing Update again with the same value either reopens the dialog or does nothing; the spines say neither.  
Fix: Re-submitting the last page reopens the Finish dialog. Hide "~N days left" when 0 pages are left. Keep the Main-book marker so the spine stays distinguishable from a finished one.

**[Edge cases]** — The finish moment for a re-read has no defined effect (EXPERIENCE.md § State Patterns → Finish moment; § Component Patterns → Spine popover)  
The spine is already full color under the re-read assumption, the meter count doesn't change, and the live region still says "25 of 54 finished". Popover: a finished Book has "no primary action" and no "Start reading" link, so a re-read can start only from Book detail; the spines don't say whether that's intended.  
Fix: State that a re-read plays only the highlight ring (no fill), and that the line reads "Finished *X* again." or stays the same. Decide whether the popover offers "Read again" as a link.

**[Edge cases]** — Set as Up next exists only on unread Books in the popover (EXPERIENCE.md § Component Patterns → Spine popover, Book detail; PRD FR-7)  
Paused Books get Resume, finished Books get nothing, and Book detail has no Set as Up next. So FR-7 ("set one Book as Up next", "It can be unread or paused") can't be done for a paused Book, and a planned re-read can't be queued.  
Fix: Add Set as Up next to Book detail for any Book that isn't Main and isn't already Up next. Optionally add it as a link in the paused popover.

**[Edge cases]** — Side-read promotion conflicts with other states (EXPERIENCE.md § Component Patterns → Start dialog, Section pane; PRD FR-8)  
Promoting a Side read that already has a paused Reading would show both Resume (keep the page) and the required "Which page?" field. Starting a Side read from the Catalog popover or Book detail (not from On the side) doesn't say whether "Which page?" appears. After promotion, nothing says whether the Side read marker clears and frees a slot. A Side read that gets finished doesn't say whether it stays in On the side. "Which page?" = the last page doesn't say whether it finishes at once.  
Fix: "Which page?" appears whenever a Side-read Book is started by any route, prefilled with the paused page if one exists. Promotion and finishing both clear the Side read marker. The last page goes straight to the Finish dialog.

**[Edge cases / Rubric · State coverage]** — Deleting a Book in a special state is underspecified (EXPERIENCE.md § Component Patterns → Confirm dialog)  
The Confirm copy doesn't mention that the Book is the Main book, Up next, or waiting. Deleting Up next doesn't say whether Up next stays empty or gets a suggestion from Waiting. Deleting from Book detail doesn't say where the user lands. A pending "Finished *X*." header line for a deleted Book has no rule.  
Fix: Add the state to the Confirm copy ("Delete *X*? It is your Main book. Its readings and card notes are deleted too."). After deletion, go to Catalog and leave the vacated role empty (no auto-promotion, consistent with "nothing starts automatically").

**[Edge cases]** — Waiting for you with 20+ rows pushes the bookcase slice far below the fold, because the grid has no cap and the slice sits underneath (EXPERIENCE.md § State Patterns → Waiting for you: many, Finish moment; DESIGN.md § Layout → Home)  
The finish moment then plays off-screen and is lost forever ("never replays").  
Fix: Scroll the finished spine into view before playing the fill, or play it only once the spine is in the viewport. Optionally cap visible Waiting rows with "Show all (N)" without dropping the count.

**[Edge cases]** — Rows depend on viewport width, so the slice changes as the window is resized (EXPERIENCE.md § Bookcase → Ordering, Home slice; Open Question 7)  
"Catalog sort order" for the slice isn't tied to a stored sort: the spines don't say whether it is the last sort chosen on Catalog or always the default.  
Fix: The slice and the Catalog share one remembered sort. The slice recomputes on resize. State this.

**[Edge cases / Accessibility]** — The rules for long and non-Latin titles are incomplete (DESIGN.md § Layout → Spine sizing, § Typography; EXPERIENCE.md § Component Patterns → Spine)  
Two-line spine labels don't say how overflow ends (ellipsis or hard clip). `writing-mode: vertical-rl` sets CJK upright by default, which contradicts "spines rotate any script identically". No truncation rule exists for the 34px Main-book title, popover subtitles, or Waiting rows in a 320px column. A spine's accessible name with 8 authors isn't specified. Accessibility adds that px-computed spine heights from 10.5–11px vertical text clip or overflow under user text-spacing overrides (WCAG 1.4.12).  
Fix: Specify `text-orientation: sideways` (or accept upright CJK explicitly) and use an ellipsis on line 2. Clamp the Main title to 3 lines and pane titles to 2 lines, with the full text in a `title` attribute or the accessible name. Name the spine with the first author plus "and N others". Measure the rendered label for height and consider a 12px minimum.

**[Edge cases]** — "Sort by author" is undefined for multiple authors and name order (EXPERIENCE.md § Bookcase → Ordering; Agent Label Contract → Author(s))  
Authors are typed as "Ursula K. Le Guin" in one semicolon-separated field, so it's unclear whether the sort uses the first author's first or last word, how it handles diacritics and non-Latin scripts, and what the tie-breaker is.  
Fix: Sort by the first listed author string with locale-aware `Intl.Collator`, then by title. State that last-name sort is out of scope, or add a "Sort as" field.

**[Edge cases]** — "Last updated" baseline and clock rules are missing (EXPERIENCE.md § Component Patterns → Re-entry line; prd-deltas #18)  
It isn't stated whether resuming a paused Reading or a Side-read promotion resets the timestamp; if not, a book resumed after 60 days greets the user with "Last updated 60 days ago", which reads as reproach. Calendar days vs 24-hour periods isn't specified. A timestamp in the future (clock moved back, timezone change) would give "-1 days ago". Multi-year spans have no format.  
Fix: Start and resume set the timestamp. Compute local calendar days and clamp negatives to "today". Show "over a year ago" beyond 365 days. Apply the same rules to "Last export".

**[Edge cases]** — The page-range parsing rules are incomplete (EXPERIENCE.md § Component Patterns → Card note panel; Flow 6 failure path)  
Reversed ranges (45–42), equal ranges (42–42), spaced ranges ("42 – 45", "42 - 45"), a "p." prefix, and multiple ranges aren't specified. Flow 6 says the range minimum is 1 but the Page field allows 0, and the Card note panel prefills the current page, so at p.0 it prefills an invalid "0". The panel from Book detail on an unread Book has no current page to prefill.  
Fix: Trim whitespace and accept "p."/"pp." prefixes. Swap reversed ranges silently (or refuse them with a message) and store 42–42 as 42. The valid range is 1..Pages. Prefill with max(current page, 1), or leave it empty when there's no Reading.

**[Edge cases]** — Pile edge cases are undefined (EXPERIENCE.md § Component Patterns → Pile)  
It isn't clear whether "N of M" and "jump" follow the shuffled order or page order. Opening a search result may or may not reset Shuffled to Page order. Previous on 1 and Next on M could wrap or disable. A pile of 1, and editing or deleting a note while the pile is open, have no rules. An all-Books search result opens "its Book's pile", but the Esc return target isn't stated.  
Reviewers disagree: Accessibility ("A disabled control removes its explanation") asks that Pile Previous/Next stay focusable at the ends (`aria-disabled`) or wrap, rather than natively disabled.  
Fix: Index follows the current order. Opening a result opens in Page order. Previous and Next are disabled at the ends (no wrap). Edit and delete are allowed in the pile, and after a delete it moves to the next note. Esc returns to the list scroll position, with the last viewed note focused.

**[Edge cases / Rubric · State coverage]** — Custom range end before start, future ranges, partial months (15 Mar–10 Apr), and "All time" over many years (120+ monthly bars) are undefined (EXPERIENCE.md § Component Patterns → Stats range picker, Monthly bars)  
The start of "All time" isn't stated (first finish or first Book added). Whether a finish counts by local date or UTC timestamp isn't stated either.  
Fix: Swap reversed custom dates, or disable the end date before the start. Bar partial months by the dates in range. For ranges over 24 months, show one bar per year. All time starts at the first finished Reading. Store the finish as a local date.

**[Edge cases / Rubric · Flow coverage]** — Export size and duration aren't specified (EXPERIENCE.md § Component Patterns → Backup page; memlog "no loading state")  
500 covers at phone-photo size could make a single file of hundreds of MB. "No loading state, deliberate" doesn't hold for exporting or restoring that much data. "Last export: today" is set on click even if the download is cancelled or blocked, which shows false safety. The rubric flags the same gap as "Flow 7 has no failure path".  
Fix: Downscale covers on upload. Show a busy state ("Exporting…", button disabled) for operations over about 300ms. Set "Last export" only after the file has been generated and handed to the download. Note that the browser can't confirm the save.

### Low (25)

**[Rubric · Flow coverage / Rubric · Inheritance discipline]** — FR-19's in-Book/Pile search scope and FR-11's "page last reached" (OQ2) were dropped without a prd-delta (EXPERIENCE §Component Patterns → Pile, Card notes list; prd-deltas.md)  
The Pile has no search and Book detail has no notes search; only the scoped Card notes list covers FR-19.  
Fix: Record both as prd-deltas items 28–29, or add search to the Pile.

**[Rubric · Flow coverage]** — The meter figures across flows contradict each other (EXPERIENCE §Flow 1 step 8, §Flow 4 step 4)  
Flow 1 (Thursday) ends at "24 of 73 finished", but Flow 4 (Sunday) moves the meter to "25 of 54".  
Fix: Align the numbers, or drop the cross-flow implication.

**[Rubric · Token completeness]** — Component tokens hardcode values that are off the spacing scale (DESIGN frontmatter `components`)  
Padding `28px 32px` and `20px 22px`, gauge radius `7px`, widths 500/440/180/110px, plank 12px, marker 7px.  
Fix: Snap them to the scale, or add named spacing tokens.

**[Rubric · Token completeness]** — Shadows and the scrim (an [ASSUMPTION]) exist only as prose values, with no token names (DESIGN §Elevation & Depth, frontmatter `rounded`)  
`rounded.spine` is a multi-value string (`3px 3px 0 0`), which the spec type rules do not anticipate.  
Fix: Add `shadow-*` / `scrim` tokens, or note the exception.

**[Rubric · Component coverage]** — Editing and deleting a Card note is mentioned ("Edit and delete per note (delete confirms)"), but the Card note panel has no edit mode and the Confirm dialog lists only Restore and Delete book (EXPERIENCE §Component Patterns → Card notes list, Confirm dialog)  
Fix: Add an edit mode ("Save note") and a "Delete card note?" variant with its copy.

**[Rubric · Visual reference coverage]** — The three direction renders are orphans  
Fix: Leave them out of the hand-off, or add one line marking them as non-normative exploration.

**[Rubric · Bloat & overspecification]** — The EXPERIENCE §Bookcase section repeats DESIGN rules (EXPERIENCE §Bookcase bullets 2, 4)  
Spine sizing, color precedence, fixed width.  
Fix: Keep the ordering, slice, scale, highlight and keyboard behavior; for visuals, point to DESIGN.

**[Rubric · Inheritance discipline]** — "Traces to" cells cite "memlog …", a working log downstream consumers won't read (EXPERIENCE §IA tables)  
Fix: Cite prd-deltas item numbers instead.

**[Accessibility]** — The spine-to-popover relationship isn't exposed  
Fix: Spine buttons get `aria-haspopup="dialog"` and `aria-expanded`. Name the popover with `aria-labelledby` pointing at its title heading (EXPERIENCE.md § Spine, § Spine popover).

**[Accessibility]** — A disabled control removes its explanation (EXPERIENCE.md § Book detail, § Pile)  
The 4th "Mark as Side read" is disabled with the hint "Up to 3 side reads.", but a natively disabled button is skipped by Tab, so keyboard and screen-reader users never meet the hint. Pile **Previous**/**Next** disabling at either end also drops focus.  
Fix: Use `aria-disabled="true"` with `aria-describedby` pointing at the hint. Keep Pile buttons focusable at the ends, or wrap around.

**[Accessibility]** — The sticky panel footer can cover focused fields (WCAG 2.4.11 Focus Not Obscured)  
Fix: Add `scroll-padding-bottom` equal to the footer height in the New book panel (DESIGN.md § New book panel).

**[Accessibility]** — The finish announcement races focus changes (EXPERIENCE.md § State Patterns → Finish moment)  
The dialog closing, focus moving, the card re-rendering, and the "Finished *X*. 25 of 54 finished." message all happen at once, and screen readers often drop polite messages during a focus change.  
Fix: Announce after focus has settled on the new target (see the focus-destination fix), or make the new focus target's name include "Finished *X*".

**[Accessibility]** — Some dynamic results are not announced (EXPERIENCE.md § Pace calculator, § Stats range picker, § Card notes list)  
The Pace calculator result changing as you type, numbers after a Stats range change, and the Card notes search count. Only the Catalog search count is announced.  
Fix: Use `<output>` or a polite region for the pace result and a debounced "N notes match". Stats can announce "2 books, 610 pages this month".

**[Accessibility]** — Toggle groups have no names (EXPERIENCE.md § Theme toggle, § Catalog view toggle)  
The theme and Catalog-view toggles are groups of `aria-pressed` buttons with no group label.  
Fix: Use `role="group"` with `aria-label="Theme"` / `"Catalog view"`. The glyphs are `aria-hidden` and the text labels stay visible.

**[Accessibility]** — Spine color, a personal association by design, is never exposed, and the popover gives no current-color state (EXPERIENCE.md § Spine popover → Change color)  
Fix: Show the current color in the popover ("Color: teal, from cover"), name the swatches, and announce "Color set to Teal."

**[Accessibility]** — Mini bars and the gauge need complete progressbar attributes (EXPERIENCE.md § Gauge, § Accessibility Floor → Progress)  
Each "Waiting for you" mini bar is a progressbar but has no name. The gauge omits `aria-valuemin="0"`.  
Fix: Use `aria-labelledby` pointing at the row title, `aria-valuetext="page 120 of 330, 36%"`, and an explicit `aria-valuemin`.

**[Accessibility]** — The search-match highlight relies on a background that is barely visible (DESIGN.md § Card notes list)  
`accent-soft` vs `surface` is 1.22:1.  
Fix: Use `<mark>` with an underline or weight change in addition to the tint.

**[Accessibility]** — The library meter track can't be seen (DESIGN.md § Library meter)  
`line` vs `shelf-wall` is 1.11:1, so the bar's full length, and therefore the proportion, is invisible. The text "X of Y finished" makes up for it.  
Fix: Use a darker track, or accept it as decorative and document that.

**[Accessibility]** — The contrast table is missing pairs that are in use (DESIGN.md § Contrast)  
The placeholder text color, the star outline, the "×" close glyph against `surface`, and dark `ink-tertiary` on `accent-soft` (4.39, which fails if any hint ever sits in a selected option).  
Fix: Add these rows and set the placeholder and star outline to ≥ 4.5 and ≥ 3:1 respectively.

**[Accessibility]** — Forced-colors / Windows High Contrast isn't addressed  
Read spine fills, Main book partial fills, gauge fills, and markers are backgrounds that forced-colors mode removes, so read and unread look the same.  
Fix: Add `@media (forced-colors: active)` rules: read spines get `CanvasText`/`Highlight` fills via `forced-color-adjust: none` on the fill element, and gauges get a border.

**[Accessibility]** — Reduced-motion coverage is incomplete (EXPERIENCE.md § Interaction Primitives → Motion, § Bookcase → Highlight after add)  
"Only two motions exist" ignores motion the spines imply elsewhere: the side panel and popover appearing, the smooth scroll to the new spine after an add, the gauge moving 57→64%, the shelf reflowing during search, and theme-switch transitions.  
Fix: State a global rule. Under `prefers-reduced-motion: reduce`, all transitions and animations are none and `scrollIntoView` uses `behavior: 'auto'`. Panels and popovers appear without sliding.

**[Edge cases]** — For a 1-page Book, the gauge ticks "0 · half · total" read "0 · 0.5 · 1" (DESIGN.md § Components → Gauge)  
Fix: Round the half tick, or drop it when Pages < 4.

**[Edge cases]** — The Home header date and every relative time go stale when the tab stays open past midnight (EXPERIENCE.md § State Patterns; DESIGN.md § Layout → Home)  
Fix: Recompute on window focus or visibility change.

**[Edge cases]** — "See card notes · 0" when a Book has no notes, and the button's accessible name with the count, aren't specified (EXPERIENCE.md § Component Patterns → Main book card)  
Fix: Show "See card notes" without a count at 0, and name it "See card notes, 7 notes".

**[Edge cases]** — Edit mode reuses the New book panel, but the side panel is "anchored over the Catalog" while Edit opens from Book detail (EXPERIENCE.md § Component Patterns → New book panel; DESIGN.md § Layout → Side panel)  
Post-save behavior (live region text, highlight, where focus goes) is defined only for Add.  
Fix: The panel opens over the current page. On Save changes: status "Saved *Title*.", stay on Book detail, focus returns to Edit.

## Reviewer files

- `review-rubric.md`
- `review-accessibility.md`
- `review-edge-cases.md`
