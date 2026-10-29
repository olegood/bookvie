# PRD Quality Review (post-UX update): bookvie

Reviewed: `prd.md` (updated 2026-10-29) and `addendum.md`, after the 43 UX deltas were applied. Judged at hobby, single-user rigor, with a target of about 2 pages and overflow in the addendum. FR IDs are stable on purpose, so the FR-12/FR-13 gaps are not counted as defects. The earlier review is in `review-rubric.md` and is unchanged.

## Overall verdict
The update made the PRD clearly better. Most of the earlier high findings are fixed: FR-7 is now Must, SM-3 tests the thesis, Measured pace has a complete formula with cold-start rules, the FR-15 library scope no longer double-counts, FR-10 has page bounds and a cancellable finish, and the FR-3 matching rules and Book deletion are specified. Removing Day types also makes the Simplicity pillar more believable. The remaining risks come mostly from the new material. The new Must FR-24 Bookcase leaves the main-screen "slice" and the look of paused Books undefined. The thesis metric SM-3, and the "oldest first" order in Waiting for you, depend on a pause date that the PRD deliberately doesn't store. And Card notes became Must with no stated reason and no metric.

## Previously raised, now resolved
- FR-16 Must with no MVP scope: deadline pace moved to Later, and FR-16 is now Stats.
- Thesis feature (FR-7) was Should: it's now Must.
- No SM for the thesis: SM-3 added.
- Pillars without Must features: §1 line 31 now says the gap is deliberate.
- Measured pace undefined or distorted: the formula, inclusive days, back-filled exclusion and cold start are now defined, and the pause distortion is accepted in the addendum's Design rationale.
- FR-15 double-counting and re-read contradiction: fixed.
- FR-10 bounds and accidental finish: fixed (0..pages, lower page allowed, cancel keeps the Reading active).
- FR-3 match rule: fixed.
- Book deletion not addressed: fixed (FR-1, with confirmation and cascade).
- Up next Book versus Waiting for you Readings: fixed (FR-5, FR-7).
- Label contract not written down: it now points to EXPERIENCE.md → Agent Label Contract.
- FR-20 sort keys and FR-1 type list: fixed.
- Monthly stats spikes not acknowledged: addendum Design rationale.

## Decision-readiness — strong
Decisions read as decisions, and the cost of each is now usually stated. The addendum's Design rationale says what was given up in each case: "Stats spike in the month a Book is finished… Don't add page logs back just to smooth the chart", "Measured pace counts paused days as reading days… the user accepted the distortion", and "Day types and the Reading calendar were removed… extra effort with no outcome". §5 carries an explicitly accepted WCAG 1.4.10 deviation together with its justification. That is good practice and rare. Nothing is left open, which is believable for a solo tool, and `.memlog.md` records the user approving the 43-delta batch.

### Findings
- **[low]** Front matter says "assumptions: all confirmed by the user on 2026-10-28" (prd.md line 9), but the document changed substantially on 2026-10-29. `.memlog.md` shows the batch was approved ("Batch of 43 UX deltas approved as is"). *Fix:* Change the line to "confirmed 2026-10-28; UX deltas approved 2026-10-29".

## Substance over theater — strong
There's still almost no furniture. The Tone NFR is now concrete product copy ("Finished *X*.", "a single ~600ms spine fill that never replays", "no greetings, exclamation marks, or praise"), not an adjective. The Data safety NFR quotes the exact failure message. The Display NFR gives a real bound (1024px minimum). There are no personas. The competitive digest still feeds the "Gaps bookvie can own" list.

### Findings
None worth raising.

## Strategic coherence — adequate
The thesis is intact and now has a metric: SM-3, "Most Readings paused by an urgent book are finished within 6 months". Must scope follows the thesis (FR-5 to FR-7 are Must), and SM-C1 is still a well-chosen counter-metric. Two weaker spots remain. The thesis metric can't be computed from data the product stores, and the one large scope promotion (Card notes) has no link to the thesis or the pillars.

### Findings
- **[high]** SM-3, and the "oldest first" order in Waiting for you, depend on data bookvie doesn't keep (§7 SM-3, §4.2 FR-7, addendum Design rationale). To evaluate SM-3 you need to know (a) which pauses were caused by an urgent book and (b) when each pause happened. Neither is stored. Glossary "Pause… also covers interruption by an urgent book" merges FR-5 interruption with an FR-6 deliberate pause. The addendum rejects storing pause and resume dates ("the alternative was storing pause and resume dates"). The FR-7 consequence "Waiting for you lists every paused Reading… oldest first" has the same problem, because oldest by what isn't defined. The only timestamp a Reading has is its last progress update (§3 Reading, FR-10). As written, the thesis metric can only be judged from memory, and the Waiting for you order is open to interpretation. *Fix:* Either store a single "paused at" timestamp per Reading (one field, not a pause/resume history, so it doesn't contradict the Measured pace rationale) and define "oldest = earliest paused at", or define "oldest = earliest last progress update" and restate SM-3 as "no Reading stays in Waiting for you more than 6 months without being finished or resumed", which the stored data can check. If urgency is meant to matter, drop "by an urgent book", since the product can't tell the two kinds of pause apart.
- **[medium]** Card notes were promoted to Must with no rationale and no metric (§4.7, §1 line 31, §7). §1 says "The Must features (§6.1) deliver Visible progress and Simplicity". Card notes (FR-17 to FR-19) deliver neither pillar. They serve only JTBD 3 ("Don't lose my Readings and Card notes"), and that JTBD is really about backup. The promotion adds a lot of Must surface: a pile with shuffle and jump, a separate Card notes view, as-you-type search with highlighting, and two search scopes. `.memlog.md` records only "promoted Should->Must" from the UX deltas, with no reason given. No SM touches Card notes. *Fix:* Add one sentence of rationale (for example, to the addendum's Design rationale) saying why Card notes are needed from day one, and add a JTBD line for them ("Let me find where in a Book I wrote a thought"). Optionally, keep FR-17 and FR-19 search as Must and move FR-18's shuffle and jump to Should.

## Done-ness clarity — adequate
Most FRs are now very testable. Good examples: FR-3's ISBN normalization and author-set matching, FR-10's 0..pages bound, FR-11's "rounded up, at least '~1 day left', hidden when…", FR-15's empty, zero and NaN behaviour, and FR-1's Pages edit floor. The new Must FR-24 is the clear exception, and the move from Finished-on to back-filled Readings opened a gap around editing.

### Findings
- **[high]** FR-24 Bookcase leaves two Must behaviours undefined (§4.3 FR-24, §3 Bookcase). (1) "The main screen shows a slice of the bookcase": nothing says which Books, how many, or where the slice starts (the Main book's neighbourhood? the first N in sort order? recently read?). An engineer has to invent the main screen's main visual. (2) The states cover only unread (outlined), read (spine color) and the Main book (filled to %). A Book with a paused Reading at 64% that was never finished is, by §3, unread, so it shows as a plain outline, the same as a Book never touched. That contradicts §1's "keeps every paused book in view" and the Visible progress pillar right where the thesis lives. Paused re-reads and Side reads are also not addressed. *Fix:* Define the slice (for example, "the N spines around the Main book in sort order, N = what fits at 1024px"). Add a consequence for paused Readings: either "a paused Reading's spine is filled to its percentage, like the Main book's but without the marker", or state on purpose that paused Books look unread on the bookcase and are made visible only by Up next and Waiting for you.
- **[medium]** Editing "Finished on", and correcting a Reading, are undefined (§4.1 FR-1, §4.4 FR-14). FR-1 puts **Finished on** on the create *and* edit form: "An empty Finished on means not read. A date… creates a back-filled Reading." For a Book that already has Readings, nothing says what editing the field does. Does clearing it delete the back-filled Reading, which would be a silent delete forbidden by §5 Data safety? Does changing the date edit that Reading or create a second one? What does the field show for a Book finished through FR-14 with a real start date? More generally, a wrong Reading can't be corrected (wrong finish date, a mistaken finish, a wrong back-fill from unattended UJ-1 entry) except by deleting the whole Book together with its Card notes. *Fix:* Add an FR-1 consequence: "Finished on is editable only on the add form; on edit it's read-only and shows the latest finish." Or: "on edit it changes only the back-filled Reading; clearing it deletes that Reading after confirmation." Then add one line saying the user can edit a finished Reading's finish date, or delete a Reading after confirmation, from Book detail. If that isn't wanted, list it under Won't.
- **[low]** The main screen with no Main book is no longer specified (§4.3 FR-10, FR-14). The retired FR-12 contained "page field only when a Main book exists" (`.memlog.md`), and that rule went with it. FR-14 says only that bookvie "suggests the Up next Book". *Fix:* Add an FR-10 consequence: "With no Main book, the page field is hidden and the main screen offers Up next (or the catalog when there's no Up next)."
- **[low]** The FR-4 title search has no match rule (§4.1 FR-4). The addendum says the skill confirms a save by "an exact title match in Search titles", but FR-4 doesn't say whether search uses substring or exact matching, or whether case matters. *Fix:* "Case-insensitive substring match on title; results update as the user types."
- **[low]** A Card note page range has no ordering rule (§4.7 FR-17). "pp.45–42" isn't ruled out. *Fix:* "In a range, the first page must not be greater than the second."

## Scope honesty — adequate
The Won't list remains specific and honest. The removal of Day types is stated openly, with its reason, in the addendum. Ownership being single-valued in the MVP is now explicit ("*owned*, or *donated* once Donation ships"). The remaining issue is that one requirement the product visibly depends on lives only in a section labeled "not in the PRD".

### Findings
- **[medium]** Shared storage is a product requirement that sits only in architecture notes (addendum, Implementation notes A1; §5 Local-first; UJ-1, SM-2). The addendum says A1 "blocks architecture": if storage is browser-local, "UJ-1's Books [go] in a store the user never sees". That is a user-visible failure of a Must journey, not only an implementation choice. Yet §5 Local-first ("runs in a browser… all data lives locally") reads as if IndexedDB would meet it. `.memlog.md` records the user's decision to keep the Local-first wording, and the note reaches architecture, so this is medium rather than high. *Fix:* Add one product-level sentence to §5 Local-first, without changing the existing wording: "A Book saved from any browser on the machine (including the AI skill's automated browser) appears in every other."
- **[low]** "Should items follow in priority order" (§6.1) names an order that isn't given. *Fix:* List the Should FRs in order (for example: FR-11, FR-14 prompts, FR-9, FR-20, FR-8, FR-21), or drop the phrase.
- **[low]** §6.2 says "The addendum has the full rules", but several Later items have no addendum entry: Shelves, Resuming, Near-finish guard, language stats, author and publisher groups, and cross-scope shuffling of Card notes. The addendum has a Reading time entry that §6.2 doesn't list. *Fix:* Change it to "The addendum has the rules where the brainstorm produced them", and add Reading time to §6.2.

## Downstream usability — adequate
The Glossary is good and applied consistently. New terms (Bookcase, Spine color, Back-filled Reading, Catch-up, Card note) are defined before use. The Agent Label Contract now has one source of truth. The UJs use a generic protagonist ("The user"), which is fine for a single-user product because §0 says the builder is the only user. A1–A6 give architecture a clear handoff.

### Findings
- **[low]** "Book detail" and "Main book card" are used as UI surfaces (FR-6, FR-14, FR-20) but aren't defined anywhere. For the main-screen card, "Main book card" plus "⋯" menu is UX detail inside an FR. *Fix:* Optional. Add "Book detail" to the Glossary, or leave it to EXPERIENCE.md and say so in §0.
- **[low]** Two UJs mix Must and Should behaviour without marking it (§2.3 UJ-2, UJ-4). UJ-2's "~7 days left" is FR-11 (Should), and UJ-4's Purpose and rating prompts are FR-14 Should. In a Must-only build, someone using the UJs as acceptance examples will find those parts missing. *Fix:* Add "(Should)" after those clauses.
- **[low]** In the addendum, "Paused Marathons join Waiting for you" (Later backlog → Sequences) conflicts with the Glossary, where Waiting for you is "the list of paused Readings". A Marathon isn't a Reading. *Fix:* Note that Waiting for you would extend to paused Marathons when Sequences ship.

## Shape fit — adequate
The shape is right: capability-spec FRs, five short UJs with concrete numbers, a glossary, no personas, and Later and research material moved to the addendum. The PRD is still well over the agreed size, though, and the update added more than it removed.

### Findings
- **[low]** Length is about 3,700 words over 295 lines, roughly 5 pages against a target of about 2 (whole document). Most of it is earned. The biggest movable blocks are §6.2 (the Later list, which repeats the addendum), FR-19's scope details, and the UI copy in FR-5 and FR-7. *Fix:* Optional. Cut §6.2 to a single line of names that points to the addendum, and move the copy strings to EXPERIENCE.md.
- **[low]** FR-21 "Cover on the main screen" sits under §4.8 Organizing, where it doesn't belong. *Fix:* Move it to §4.3 Progress next to FR-24, keeping its Should tag.

## Mechanical notes
- **ID continuity:** FR-1 to FR-11, FR-14 to FR-24. The FR-12 and FR-13 gaps are intentional, but nothing in prd.md says so; only `.memlog.md` records it. Add a line to §0 or §4: "FR-12 and FR-13 retired (Day types, Reading calendar); IDs are stable." FR-24 appears between FR-11 and FR-14 in §4.3. That's fine with stable IDs, but worth knowing for anyone scanning in order. UJ-1 to UJ-5 and SM-1 to SM-3 plus SM-C1 are contiguous.
- **Cross-references:** All resolve. FR-1 points to FR-14 and FR-20, FR-5 to FR-9, FR-7 to FR-5 and FR-6, FR-8 to FR-5, FR-10 to FR-14, FR-24 to FR-1 and FR-20, FR-15 to §3, and §6.2 to FR-24. There are no leftover references to Day types, the Reading calendar or "evenings" in prd.md. The addendum mentions them only in its removal note.
- **Glossary drift:** "Up next Book" and "Up next" are used interchangeably, which is harmless. "Read Books" in FR-24 and the §3 Bookcase entry depends on §3 Reading ("counts as read if any of its Readings is finished"), which is consistent. Spine color is defined twice, in §3 and in FR-1, with the same wording; that's fine.
- **Assumptions Index roundtrip:** There are no inline `[ASSUMPTION]` tags and no index. This matches the front matter. `.memlog.md` line 67 has an assumption marked "to confirm", but line 68 resolves it. Consistent.
- **Required sections:** All present for hobby stakes.
