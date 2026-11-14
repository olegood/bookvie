# Validation Report — bookvie

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md`
- **Run at:** 2026-11-14T11:25+01:00

## Overall verdict
This Update is a clean, small contract for the faster card note entry. Every new token reference resolves. Plan decisions D1–D8 all land in EXPERIENCE.md → Card note panel, with matching rows in Keyboard, Focus after close, Forced colors, Components and a Flow 6 variant. No critical or high findings. The medium gaps are edge behaviors that rapid entry makes more likely: what "busy state" means for **Save note** (Foundation says only Export and Restore have one), Cancel or Esc while a save is out, and where the checkbox's dark tint comes from.

All 3 medium and all 8 low findings were fixed in the spines during this Update. FR-17 not yet carrying the new consequences in the PRD (a mechanical note, not a finding) is plan step 3 (`bmad-prd`).

## Category verdicts
- Flow coverage — adequate
- Token completeness — strong
- Component coverage — strong
- State coverage — adequate
- Visual reference coverage — strong
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### Critical (0)

### High (0)

### Medium (3)
**[State coverage]** — The saving state isn't defined, and the new text contradicts Foundation. Keyboard save says Cmd+Enter has "the same … busy state" as **Save note**. But Foundation says "The only busy states are Export and Restore", and no section describes **Save note** while a save is out. The code makes **Save note** `aria-disabled` during the save; the spine never says so. (§ EXPERIENCE §Card note panel → Keyboard save; §Foundation → Local-first; §Accessibility Floor → Focus)
Fix: State the panel's in-flight behavior in one line, for example "While a save is out, **Save note** is `aria-disabled` and further presses, Cmd+Enter included, are ignored; its label doesn't change". Then narrow Foundation's sentence to "the only busy labels are Export and Restore". (applied in this Update)

**[State coverage]** — Cancel or Esc while a save is out isn't specified. Rapid entry ("Cmd+Enter, Esc") makes this likely. The plan records that Esc is ignored in flight today. Without that in the spine, a builder could close the panel mid-save, and the save would then land, or fail, with no panel left to show the couldn't-save line. (§ EXPERIENCE §Card note panel → Cancel after saves; §Interaction Primitives → Esc)
Fix: Add "Cancel and Esc are ignored while a save is out; once it lands, the panel follows Add another as usual." (applied in this Update)

**[Inheritance discipline]** — The Checkbox row says "the dark theme's `color-scheme: dark` gives the dark box and the `accent` dark twin". `color-scheme` gives only the dark box. The dark twin of `accent` comes from the theme's token swap (tokens.css redefines `--accent` under the dark selectors), so `accent-color` must reference the token variable, not a literal. Someone following the sentence literally could hard-code `#557059` and expect `color-scheme` to swap it. (§ DESIGN §Components → Checkbox)
Fix: "…`accent-color: var(--accent)`, so the dark theme's token swap gives the `accent` dark twin, and `color-scheme: dark` gives the dark box." (applied in this Update)


### Low (8)
**[Flow coverage]** — The variant has no failure path. A couldn't-save on the second note is the case that tests D8 (the panel stays open, the count stays at 1, the text is kept). (§ EXPERIENCE §Flow 6, Variant)
Fix: Add one clause, for example: "If the second save fails, the card stays open with the quote kept and the count still reads '1 note saved'." (applied in this Update)

**[Flow coverage]** — The variant says Page "still reads '212–213'", but it starts with Oleg checking **Add another**, not with Page set to "212–213". Read alone, the variant takes the range from step 3 without saying so. (§ EXPERIENCE §Flow 6, Variant)
Fix: "…types the first quote, sets Page to '212–213' and presses Cmd+Enter." (applied in this Update)

**[Component coverage]** — `aria-keyshortcuts="Meta+Enter Control+Enter"` sits on **Save note**, but the keys work only while focus is in Note. The Pile's shortcuts work anywhere in the pile. A screen reader user on **Save note** or in Page hears a shortcut that does nothing there. (Cmd+Enter in Page isn't specified either.) (§ EXPERIENCE §Card note panel → Keyboard save)
Fix: Either accept this and say so ("the shortcut applies in Note"), or put the attribute on the Note field. The plan's D1 chose the button, so changing it is Oleg's call. (applied in this Update)

**[State coverage]** — Storage edges are only partly covered. "Storage that can't be read means off" covers a read that throws. D3 also says empty or junk reads as off, and nothing says what happens when the write fails while toggling (presumably the checkbox still toggles for this opening, silently). (§ EXPERIENCE §Card note panel → Add another)
Fix: "A missing, unreadable or unrecognized value means off; if it can't be stored, the choice still applies until the page reloads." (applied in this Update)

**[State coverage]** — "**Save note** saves and closes" is still stated without a condition, two bullets above the exception for Add another being on. A reader skimming top-down meets the absolute rule first. (§ EXPERIENCE §Card note panel, the Save note bullet; Focus after close row "Card note panel | Save or Cancel")
Fix: "**Save note** saves and closes (unless Add another is on, below)", and in Focus after close: "Save (Add another off, or edit mode) or Cancel". (applied in this Update)

**[State coverage]** — Edit mode with the remembered choice on: it's clear only by inference that an edit save closes even when the stored value is on. (§ EXPERIENCE §Card note panel → Add another; Edit mode)
Fix: Add "In edit mode the remembered choice is ignored and a save closes" to the Edit mode bullet. (applied in this Update)

**[Bloat & overspecification]** — The Forced colors bullet for the checkbox is fine, but the list has a blank line before the Catalog tiles bullet, so it renders as two lists. This predates the change; the new bullet only lands in the first list. (§ DESIGN §Colors → Forced colors)
Fix: Optional: remove the blank line. (applied in this Update)

**[Inheritance discipline]** — Backup page lists the local-only preferences as "(theme, Catalog view, sort)" and doesn't include Add another, though the Card note panel section says it is never part of an export or a restore. The two lists should agree. (§ EXPERIENCE §Component Patterns → Backup page)
Fix: Add "Add another" to that parenthesis. (applied in this Update)


## Reviewer files
- `review-rubric.md`
