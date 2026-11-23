# Spine Pair Review — bookvie, Epic 14 update (rubric walker)

Scope: the uncommitted Epic 14 "card note boxes" changes to `DESIGN.md` and `EXPERIENCE.md` (issue #17). In EXPERIENCE.md: the IA row, the Voice row, the Search field, Back to top and Backup page rows, the Card notes view toggle, Card note box, Open box strip and Card notes list rows, the new Component Patterns → Card notes shelf subsection, the State rows, Motion, Accessibility Floor (Names and the new faded-box deviation), and Flow 6 (open box step and the "hunting across the boxes" variant). In DESIGN.md: `components.card-notes-view-toggle`, `card-notes-count-line`, `card-note-box` and `open-box-strip`, the Card note box contrast table, the forced-colors bullet, Layout & Spacing → Card notes, the Elevation row, Shapes, the Typography row, the Components rows, the Card note box subsection and the Do/Don't row. Checked against `card-note-boxes-plan-2026-11-23.md` (D1–D15, sections 4 and 5), the 2026-11-23 `.memlog.md` entries, today's `CardNotesPage.tsx`, `lib/cardNotes.ts`, `lib/useSearchCount.ts`, `lib/catalogView.ts` and `components/ViewToggle.tsx`, and ARCHITECTURE-SPINE AD-6 and AD-15. Oleg's choices are settled and were checked only for consistency: fade A (whole box parts at 0.38, a documented SC 1.4.3 deviation), paper cards in both themes, no edge line on the front, the count line kept, and removing the chip acting like Back. Desktop Chrome only.

## Overall verdict

The update is usable by Stories 14.1–14.3. Every token reference resolves, every contrast number recomputes to the stated value, and the plan's decisions D1–D15 all land in both files with the same names. There are no critical or high findings. The seven medium findings sit where the 14.2 and 14.3 ATDD will need exact strings or exact behavior: the announcement on a carried arrival, the announcement when the carried text lands in List view, plurals in the box's accessible name during a search, what Boxes view shows with text before 14.3, whether the fade animates on arrival, how the fade is layered, and a sage dot that the Do/Don't table forbids.

## 1. Flow coverage — strong

Checked: Flow 6 keeps its protagonist and steps. Step 5 now names the open box strip. The new variant has a named protagonist and setting, five numbered steps, a climax (back on the shelf with "habits", no retyping) and a failure path ("zettel", every box fades, Esc). Its numbers fit: 9 boxes, 4 lifted and 5 faded, 3 + 5 of the 14 matches shown in two named boxes, and *Deep Work*'s five notes match its "5 of 27" pill.

### Findings
- **low** The variant covers Back but not the "In *X*" chip, which plan section 5 lists as a P0 path of the same carried-search test (EXPERIENCE.md → Flow 6, variant). *Fix:* add one line to the failure path or a step 6: "Removing the chip does the same."

## 2. Token completeness — adequate

Checked: every `{...}` reference in both files resolves, including all 34 `{components.card-note-box.*}` references in the prose and `{components.open-box-strip}`. Recomputed with WCAG relative luminance, alpha-composited over `page` `#F6F4EF` and `page-dark` `#191B18`: title on label 12.97, count `#5F635C` on label 5.78, pill text on `#E3EBE2` 11.30, pill dot 4.48, faded title 2.18 / 3.17, faded count 1.74 / 2.41, `ink-tertiary` count line 5.08 / 6.35, `accent` focus ring 4.96 / 7.68. All match the table. The 2-line title plus the pill fits the label (about 85px of the 88px inside the front). The grid math holds: 4 × 216 + 3 × 24 = 936px fits 1024 − 2 × 36 = 952px, and 5 columns fit at 1280px and 1440px. No new `colors` key is added, so `e2e/app-shell.spec.ts`'s token comparison and `tokens.css` don't change.

### Findings
- **low** Five literals in `components.card-note-box` equal light-theme tokens: `count-color` `#5F635C` is `ink-secondary`, `card-background` `#FFFFFF` is `surface`, the card border `#E4DFD5` is `line`, `pill-background` `#E3EBE2` is `accent-soft`, `pill-dot` `#557059` is `accent`. A builder who maps them to `var(--color-ink-secondary)` and the like gets dark-theme values on the paper label (`ink-secondary-dark` on `#FBF8F1` fails 4.5:1) (DESIGN.md → `components.card-note-box`). *Fix:* extend the YAML comment: "Fixed literals, not the light tokens: never use the theme's custom properties here."
- **low** Under forced colors the fade still applies, so a faded box is `CanvasText` at 0.38 over `Canvas`. The contrast table doesn't state that case, and the deviation text doesn't mention it (DESIGN.md → Forced colors bullet). *Fix:* add "The deviation covers forced colors too" to the bullet or the deviation.

## 3. Component coverage — adequate

Checked: Card notes view toggle, Card note box and Open box strip each have a DESIGN.md row (and the box its own subsection) and an EXPERIENCE.md row pointing to Card notes shelf, with the same names. The toggle matches today's `ViewToggle` pattern (`role="group"`, `aria-pressed`, text only), and `bookvie.cardNotesView` follows `catalogView.ts` (try/catch, junk means the default, a failed write still switches). Focus, motion, dark theme and forced colors are covered for the box.

### Findings
- **medium** The match pill's dot is sage (`#557059`, the `accent` value) and is called decorative in the contrast table. The Do/Don't table says "Use sage only for actions, progress, focus, selection" and lists "Use sage decoratively" and "Color … status badges" as Don'ts. A 14.3 review will raise this against the spine itself (DESIGN.md → `components.card-note-box.pill-dot`, Colors → Card note box pairs, Do's and Don'ts). The pill colors are a memlog assumption, not one of Oleg's decisions. *Fix:* either drop the dot (the pill's text and tint carry the match), or say in the Do/Don't row that a search match counts as selection, so the sage pill and dot are allowed there.
- **medium** "Shows its cards and front, label included, at 0.38 opacity" doesn't say whether the opacity sits on one wrapper or on each part. On each part, the faded front would show the cards' hidden lower halves through it, and the faded label would show the spine color behind it. The contrast table assumes one group composited over `page` (DESIGN.md → Card note box → Fade). *Fix:* "One inner wrapper holds the cards and the front and takes the opacity; the link around it is never faded."
- **low** DESIGN.md has a **Card notes count line** component and token, but EXPERIENCE.md calls it "Count line" inside the shelf subsection and has no Component Patterns row under that name (EXPERIENCE.md → Card notes shelf → Count line). *Fix:* rename the bullet "Card notes count line", or add a row pointing to the subsection.

## 4. State coverage — thin

Checked: empty (no notes: no toggle, no count line, no boxes; an open box with no notes keeps its strip), no match and some matches in Boxes view, the open box with a carried no-match query (today's "No card notes contain …" plus the scoped "Go through as a pile", which matches `CardNotesPage.tsx`), the remembered view with unreadable, junk or unwritable storage, switching views with text, Esc, and the "starts empty" list (nav, a box opened with an empty field, "See card notes", "See all card notes", reload, Forward, a typed URL).

### Findings
- **medium** A carried arrival on the open box announces "3 notes match., or the no-match sentence". Typing the same query on the open box announces "0 notes match." (`notesMatchCopy(0)` through `useSearchCount`; the visible line is the no-match sentence). One page then speaks two different strings for the same state, and the 14.3 P0 test has to pick one (EXPERIENCE.md → Card notes shelf → Into a box with the search). *Fix:* "announces the count once, exactly as typing would ("3 notes match.", "1 note matches.", "0 notes match.")", or change both cases to the no-match sentence and say the typed case changes too.
- **medium** Back or chip removal returns "in the remembered view" and then announces "the shelf sentence". When the remembered view is List (for example after removing the chip from an open box entered from Book detail), there is no shelf sentence: List's count is "N notes match." (EXPERIENCE.md → Card notes shelf → Back out with the search). *Fix:* "announces the view's own count once: the shelf sentence in Boxes, "N notes match." in List."
- **medium** The accessible names during a search have no singular or full-match forms. "*Atomic Habits*, 3 of 12 card notes match" leaves open "1 of 12 card notes match" or "matches", "1 of 1 card note matches", and whether "12 of 12" keeps the same shape. The idle name's singular ("1 card note") is given, and the count line's singulars are given, so this one stands out (EXPERIENCE.md → Card notes shelf → Search on the shelf; Accessibility Floor → Names). *Fix:* list them: "3 of 12 card notes match", "1 of 12 card notes matches", "1 of 1 card note matches", "12 of 12 card notes match".
- **medium** Staging for 14.2 says only that text in Boxes view "shows the List's grouped matches". It doesn't say whether the count line stays, changes or goes, what `status` announces ("N notes match." as in List?), or that clearing the field brings the boxes back. Story 14.2's ATDD needs those to be exact, and 14.3 must then change them (EXPERIENCE.md → Card notes shelf → Staging). *Fix:* "Until 14.3, Boxes view with non-blank text renders exactly the List view's results and announcements, hides the count line, and shows the boxes again once the field is blank."
- **medium** Arriving on the shelf with carried text (Back or chip removal) doesn't say whether the boxes fade and lift over 150 ms or appear already faded. Interaction Primitives → Banned lists "auto-playing animation on load". The same question applies to switching List → Boxes with text in the field (EXPERIENCE.md → Card notes shelf → Back out with the search; Motion). *Fix:* "On arrival and on a view switch the boxes render in their search state at once; the 150 ms transition runs only while the field changes."
- **low** "While the field holds text" doesn't say a blank or spaces-only query counts as empty. Today's matcher trims the query, and a blank query filters nothing and announces nothing (`noteMatches`, `useSearchCount`). The shelf sentence's quoted query isn't said to be trimmed either, while today's `noNotesMatchCopy` trims it (EXPERIENCE.md → Card notes shelf → Search on the shelf). *Fix:* "While the field holds non-blank text … the sentences quote the trimmed text."
- **low** History cases outside the list: Back *into* an open box (after removing its chip, which pushes a new entry, as today), and Back to the shelf from another page (Catalog, Book detail). "Every other way" covers them, but the chip's "acts like Back" could be read as `navigate(-1)` (EXPERIENCE.md → Card notes shelf → Starts empty, Back out with the search). *Fix:* add "Removing the chip pushes `/card-notes` as today; Back from there returns to the open box with an empty field. Back to the shelf from any other page starts empty."
- **low** Loading and failure of the view aren't covered for the new parts: whether the open box strip shows before the view loads (its color comes from the view) or under "Couldn't load", and that the toggle and count line wait for the view (EXPERIENCE.md → State Patterns). *Fix:* "The strip, the toggle and the count line appear only once the view has loaded; none shows under Couldn't load."
- **low** Back from the open box puts focus on the `h1` but says nothing about the shelf's scroll position. With many Books the opened box can be several rows down (EXPERIENCE.md → Card notes shelf → Back out with the search). *Fix:* state it: "the shelf opens at the top" or "the browser restores its scroll".

## 5. Visual reference coverage — adequate

Checked: `mockups/epic14-options.html` exists, is identical to its `.working/` copy, and is linked from EXPERIENCE.md (Card notes shelf, Flow 6 mocks) and DESIGN.md (Layout → Card notes, Card note box), each time with what it shows. The plan link `../../card-note-boxes-plan-2026-11-23.md` resolves. Spines-win is stated once per file, and the shelf subsection lists where the mocks differ (placeholder, sentence line, chip beside the `h1`, 32px gap).

### Findings
- **low** The claude.ai canvas is private and cited only by name, so a story builder can't open it. The spine is complete without it, but the citations read as if it were a reference to check. `epic14-options.html` also doesn't mark which option was picked in each of its three sections (DESIGN.md → Card note box; EXPERIENCE.md → Card notes shelf). *Fix:* add "(not needed to build; this spine and epic14-options are enough)" to the canvas citation, and name the picks next to the link: "fade A, paper cards, no edge" (DESIGN.md already does in one place).

## 6. Bloat & overspecification — adequate

Checked: the Card note box subsection's pixel values (card positions, rotations, pile steps) are all load-bearing for a test that checks a step rather than a pixel. The deviation text is short and gives its mitigations.

### Findings
- **low** **Staging** and **Notes for architecture (plan step 4)** are story-cut and architecture content. They will be stale once 14.3 ships and AD-15 and AD-6 are updated (EXPERIENCE.md → Card notes shelf). *Fix:* mark both "remove at the Epic 14 retro", or move the architecture note to the plan.
- **low** Motion still opens with "Two intentional motions exist", and then adds the box lift and fade as a third (EXPERIENCE.md → Interaction Primitives → Motion). *Fix:* "Three intentional motions exist: the finish fill, the highlight ring and a Card note box's lift and fade."

## 7. Inheritance discipline — adequate

Checked: `sources` lists the plan, and the path resolves. "Card notes", "Card note", "Book" and the route stay as in the PRD glossary and D2. Component names match in both files. `bookvie.cardNotesView` and its values match D3, the toggle's group name "Card notes view" appears in Names, and the preferences list on the Backup page row adds "Card notes view". Box order cites AD-6 as in D7. AD-15's key list isn't updated yet, which is plan step 4, and the spine says so.

### Findings
- **low** "The shelf" now names the Card notes Boxes view, but the spine already uses "shelf" for the Home shelf slice and the Catalog bookcase ("the shelf closes up" in the same Search field row). Test titles and story ACs may mix them up (EXPERIENCE.md → Card notes shelf, Search field row). *Fix:* say once in the subsection that "the shelf" here means the Card notes Boxes view, or use "Boxes view" in rows that also mention Catalog.
- **low** A faded box's name, "*Refactoring*, no match", drops its visible count ("12 card notes"), while a matching box's name contains its visible "3 of 12". The Names rule (starts with the label) still holds, and D11 sets the wording, so this is a note only (EXPERIENCE.md → Accessibility Floor → Names). *Fix:* none needed. If Oleg reopens D11, "*Refactoring*, 12 card notes, no match" keeps the visible text in the name.

## 8. Shape fit — strong

Checked: DESIGN.md's section order is unchanged, and every addition sits in its section (Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts). The new `### Card note box` subsection follows the existing per-component subsections. In EXPERIENCE.md, Card notes shelf is a Component Patterns subsection like Catalog tiles. The new deviation sits next to Reflow and uses the same form. No findings.

## Mechanical notes

- All `{...}` token references in both files resolve against DESIGN.md's frontmatter (scripted check).
- Contrast table: all nine pairs recompute to the stated values (to two decimals).
- Relative links resolve: `mockups/epic14-options.html` from both files, `../../card-note-boxes-plan-2026-11-23.md` from EXPERIENCE.md.
- `updated: 2026-11-23` is set in both frontmatters.
- Name check: "Card notes view toggle", "Card note box", "Open box strip", "Card notes list" match across both files. "Card notes count line" (DESIGN.md) vs "Count line" (EXPERIENCE.md), see 3.
- "D1–D15" next to the IA row's "D23, D43" is prefixed with "card-note-boxes plan", so it doesn't collide with the prd-deltas "D*n*" citations.
- No Mermaid in the changed text.
