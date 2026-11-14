# Spine Pair Review — bookvie

## Overall verdict
This Update is a clean, small contract for the faster card note entry. Every new token reference resolves. Plan decisions D1–D8 all land in EXPERIENCE.md → Card note panel, with matching rows in Keyboard, Focus after close, Forced colors, Components and a Flow 6 variant. No critical or high findings. The medium gaps are edge behaviors that rapid entry makes more likely: what "busy state" means for **Save note** (Foundation says only Export and Restore have one), Cancel or Esc while a save is out, and where the checkbox's dark tint comes from.

## 1. Flow coverage — adequate
Checked: FR-17 (prd.md, not yet amended; plan step 3 is pending) and D1–D8 against Flow 6 and its new variant. The variant has the named protagonist (Oleg), the one-time check of **Add another**, two Cmd+Enter saves, the "1 note saved" / "2 notes saved" count, Esc, and the outcome ("See card notes · N" counts both). It reads as a variant paragraph, not numbered steps, which fits a variant of an existing numbered flow.
### Findings
- **low** The variant has no failure path. A couldn't-save on the second note is the case that tests D8 (the panel stays open, the count stays at 1, the text is kept). (EXPERIENCE §Flow 6, Variant). *Fix:* Add one clause, for example: "If the second save fails, the card stays open with the quote kept and the count still reads '1 note saved'."
- **low** The variant says Page "still reads '212–213'", but it starts with Oleg checking **Add another**, not with Page set to "212–213". Read alone, the variant takes the range from step 3 without saying so. (EXPERIENCE §Flow 6, Variant). *Fix:* "…types the first quote, sets Page to '212–213' and presses Cmd+Enter."

## 2. Token completeness — strong
Checked: the new frontmatter (`components.checkbox`: `{colors.accent}`, `{typography.body-sm}`, `{colors.ink}`, `{spacing.2}`; `components.card-note.saved-count` / `saved-count-color`: `{typography.meta}`, `{colors.ink-tertiary}`) and the prose references `{components.checkbox}`, `{components.focus-ring}` and `{components.card-note.saved-count}`. All resolve: `accent` and `ink-tertiary` at DESIGN frontmatter lines 16 and 15, `spacing.2` at 168, `components.focus-ring` at 408. `control: native` and `size: 16px` are literal component values, which components are allowed to hold. `meta`/`ink-tertiary` on `surface` is the same pair the page ref already uses, so it is already covered by the contrast table.
### Findings
- None.

## 3. Component coverage — strong
Checked: every component the change names. The **Checkbox** has a DESIGN Components row and a frontmatter entry. Its behavior is native and specified where it's used: EXPERIENCE → Card note panel → **Add another** says what it controls, its default, that it is remembered, and that it shows in add mode only. The **Card note panel** row in DESIGN and its EXPERIENCE section agree on placement (under Page), add mode only, the count on the same line, and edit mode having neither. **Save note**'s `aria-keyshortcuts` follows the Pile's precedent.
### Findings
- **low** `aria-keyshortcuts="Meta+Enter Control+Enter"` sits on **Save note**, but the keys work only while focus is in Note. The Pile's shortcuts work anywhere in the pile. A screen reader user on **Save note** or in Page hears a shortcut that does nothing there. (Cmd+Enter in Page isn't specified either.) (EXPERIENCE §Card note panel → Keyboard save). *Fix:* Either accept this and say so ("the shortcut applies in Note"), or put the attribute on the Note field. The plan's D1 chose the button, so changing it is Oleg's call.

## 4. State coverage — adequate
Checked: empty (opening focus on Note, prefilled Page), validation error, couldn't save (State Patterns row lists Card note; "Failures never close it" matches D8), after save with Add another off (closes, as before) and on (stays open, Note empties, Page kept, errors cleared, focus on Note, announced again), edit mode (no checkbox, Cmd+Enter works), storage unreadable (off), running count (starts empty on each opening, not a live region). The live-region rule (empty both regions, set text after about 100 ms) makes the repeated "Card note saved." announce again, which matches the plan.
### Findings
- **medium** The saving state isn't defined, and the new text contradicts Foundation. Keyboard save says Cmd+Enter has "the same … busy state" as **Save note**. But Foundation says "The only busy states are Export and Restore", and no section describes **Save note** while a save is out. The code makes **Save note** `aria-disabled` during the save; the spine never says so. (EXPERIENCE §Card note panel → Keyboard save; §Foundation → Local-first; §Accessibility Floor → Focus). *Fix:* State the panel's in-flight behavior in one line, for example "While a save is out, **Save note** is `aria-disabled` and further presses, Cmd+Enter included, are ignored; its label doesn't change". Then narrow Foundation's sentence to "the only busy labels are Export and Restore".
- **medium** Cancel or Esc while a save is out isn't specified. Rapid entry ("Cmd+Enter, Esc") makes this likely. The plan records that Esc is ignored in flight today. Without that in the spine, a builder could close the panel mid-save, and the save would then land, or fail, with no panel left to show the couldn't-save line. (EXPERIENCE §Card note panel → Cancel after saves; §Interaction Primitives → Esc). *Fix:* Add "Cancel and Esc are ignored while a save is out; once it lands, the panel follows Add another as usual."
- **low** Storage edges are only partly covered. "Storage that can't be read means off" covers a read that throws. D3 also says empty or junk reads as off, and nothing says what happens when the write fails while toggling (presumably the checkbox still toggles for this opening, silently). (EXPERIENCE §Card note panel → Add another). *Fix:* "A missing, unreadable or unrecognized value means off; if it can't be stored, the choice still applies until the page reloads."
- **low** "**Save note** saves and closes" is still stated without a condition, two bullets above the exception for Add another being on. A reader skimming top-down meets the absolute rule first. (EXPERIENCE §Card note panel, the Save note bullet; Focus after close row "Card note panel | Save or Cancel"). *Fix:* "**Save note** saves and closes (unless Add another is on, below)", and in Focus after close: "Save (Add another off, or edit mode) or Cancel".
- **low** Edit mode with the remembered choice on: it's clear only by inference that an edit save closes even when the stored value is on. (EXPERIENCE §Card note panel → Add another; Edit mode). *Fix:* Add "In edit mode the remembered choice is ignored and a save closes" to the Edit mode bullet.

## 5. Visual reference coverage — strong
Checked: Flow 6 still links key-home and key-book-detail. Neither mock shows the checkbox or the count. Both spines say the spine wins over a mock (DESIGN line 417, EXPERIENCE line 17), and the change adds no new mock or link, so nothing is orphaned.
### Findings
- None.

## 6. Bloat & overspecification — strong
The additions are short, and each traces to a decision. The storage key name (`bookvie.cardNoteAddAnother`) stays in the plan and architecture, not the spine, which is the right altitude. "Page keeps exactly what was typed ('212–213' stays '212–213')" is load-bearing (it rules out normalizing to "pp.212–213"), not bloat.
### Findings
- **low** The Forced colors bullet for the checkbox is fine, but the list has a blank line before the Catalog tiles bullet, so it renders as two lists. This predates the change; the new bullet only lands in the first list. (DESIGN §Colors → Forced colors). *Fix:* Optional: remove the blank line.

## 7. Inheritance discipline — adequate
Names are used verbatim across both spines: **Add another**, **Save note**, **Cancel**, "Card note saved.", "N notes saved", Checkbox, `card-note`. Cross-references resolve: State Patterns → Couldn't save, Interaction Primitives → One level of stacking, Focus after close. The Voice and Tone of the new copy fits: "1 note saved" / "2 notes saved" is plain and factual, with no praise or exclamation mark, and it pluralizes correctly.
### Findings
- **medium** The Checkbox row says "the dark theme's `color-scheme: dark` gives the dark box and the `accent` dark twin". `color-scheme` gives only the dark box. The dark twin of `accent` comes from the theme's token swap (tokens.css redefines `--accent` under the dark selectors), so `accent-color` must reference the token variable, not a literal. Someone following the sentence literally could hard-code `#557059` and expect `color-scheme` to swap it. (DESIGN §Components → Checkbox). *Fix:* "…`accent-color: var(--accent)`, so the dark theme's token swap gives the `accent` dark twin, and `color-scheme: dark` gives the dark box."
- **low** Backup page lists the local-only preferences as "(theme, Catalog view, sort)" and doesn't include Add another, though the Card note panel section says it is never part of an export or a restore. The two lists should agree. (EXPERIENCE §Component Patterns → Backup page). *Fix:* Add "Add another" to that parenthesis.

## 8. Shape fit — strong
The change follows the pair's existing shape. Behavior bullets go under the component's EXPERIENCE section. The visual spec goes in the DESIGN Components table with a frontmatter entry. The keyboard rule sits next to "Enter in the page field". The focus row is in the Focus after close table. The flow change is a variant paragraph after the failure path, not a new flow, which suits a one-requirement Update and is consistent with the shape examples.
### Findings
- None.

## Mechanical notes
- New `{…}` references checked: 9. Unresolved: 0.
- Components named in the change: Checkbox, Card note panel, Save note (button). All have a DESIGN row. The behavior lives in EXPERIENCE → Card note panel.
- Plan D1–D8 coverage: D1 Keyboard save + Interaction Primitives; D2 Add another (add mode, under Page); D3 remembered, never exported, unreadable means off (junk not explicit); D4 stay open, Note empties, Page kept, errors cleared, focus on Note, announced, counts update; D5 Running count; D6 Cancel after saves; D7 Add another off; D8 failures never close.
- PRD FR-17 doesn't yet carry the new consequences. That's expected: plan step 3 (`bmad-prd`) comes after this Update. EXPERIENCE `sources:` now lists the plan.
- "No character-key shortcuts" holds: the new line says a modifier with Enter isn't a character-key shortcut, and plain Enter in Note stays a newline.
- Not raised: Safari/Firefox checkbox rendering and focus (out of scope per AGENTS.md → Supported browser), and tokens.css parity for the new component tokens (only colors, typography, rounded and spacing are compared).
- Findings: 0 critical, 0 high, 3 medium, 8 low.
