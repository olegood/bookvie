---
title: Reconciliation of PRD against UX deltas
date: 2026-10-29
inputs:
  - prd.md
  - addendum.md
  - ../../ux-designs/ux-bookvie-2026-10-28/prd-deltas.md (items 1–43, A1–A6)
  - ../../ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (context only)
---

# Reconciliation: PRD vs UX deltas 1–43

**Result:** 41 applied, 2 partial, 0 missing. A1–A6 appear only as a handoff note in the addendum (addendum l.40), as intended.

Known intentional choices were not reported: FR-12/FR-13 retired with stable IDs and the bookcase as FR-24; §4.5–4.10 renumbered to §4.4–4.9; "Last export" not exported (A6); bookcase ordered by Author until FR-20 ships; the Local-first NFR keeps "no database server".

Leftover-wording sweep (grep for Day type, calendar, evening, Cancel, FR-12/13, §4.x, "Last time"): no leftovers that contradict a delta. The only remaining hits are fine: the addendum design-rationale note on the removal (l.47), "Weekend sprint: a calendar window" (l.60, a Later feature, unrelated), the panel "Cancel" in the label contract (l.36, correct per item 20), "If the user cancels it" for the finish flow (FR-10, l.150), and "by the end of the evening" in UJ-1 (l.44, a narrative and not the re-entry copy, so it can stay).

## Per-delta status

| # | Target | Status | Evidence / note |
|---|---|---|---|
| 1 | FR-12 deleted | Applied | No FR-12 left; ID retired. |
| 2 | FR-13 + §4.4 heading/intro deleted | Applied | §4.4 is now "Finishing"; no Day-type intro left. |
| 3 | FR-16 books + pages only | Applied | l.194, with presets and a bar per month. |
| 4 | Glossary: Day type, Reading calendar removed; Catch-up redefined | Applied | l.61. |
| 5 | Vision para 1 | Applied | l.20 "by entering the page reached." |
| 6 | Pillar Conscious reading | Applied | l.26. |
| 7 | JTBD 3 deleted | Applied | §2.1 now has 3 jobs. |
| 8 | JTBD 4 wording | Applied | l.38 "Readings and Card notes". |
| 9 | UJ-2 rewrite | Applied | l.45, verbatim. |
| 10 | SM-1 | Applied | l.292. |
| 11 | SM-C1 | Applied | l.295. |
| 12 | NFR Speed | Applied | l.256. |
| 13 | FR-22 drop Day types; addendum gap removed | Applied | l.241; addendum gaps l.19–23 have no Day-type gap. |
| 14 | Bookcase into MVP; Later list trimmed | Applied | FR-24 (l.159–165); §6.2 l.272; addendum l.82–86. Shelves stays Later. |
| 15 | FR-1 spine color | Applied | l.77, l.84; glossary l.63. |
| 16 | FR-22 spine color | Applied | l.241. |
| 17 | "~N days left", formula | Applied | FR-11 l.153; UJ-2 l.45. |
| 18 | Last progress update (glossary, FR-10, FR-11, FR-22) | Applied | l.53, l.149, l.153/156, l.241. |
| 19 | "Last export: N days ago" | Applied | FR-22 l.243 (Backup page and main screen; informational). |
| 20 | Addendum labels: New book, Spine color, Cancel, Add anyway; pointer to EXPERIENCE.md | Applied | Addendum l.33–36. |
| 21 | FR-2 machine-readable outcomes | Applied | l.93. See inconsistency I-4 (no "couldn't save" outcome listed). |
| 22 | FR-3 two choices; inert form | Applied | l.101. |
| 23 | Card notes Must; main screen entry points | Applied | §4.7 header "(Must)", l.201. |
| 24 | Start confirmation on every start/resume | **Partial** | FR-5 l.111 and FR-9 l.138 are updated, but FR-8 l.134 still reads "If there's already a Main book, the FR-5 confirmation applies", which is the old conditional wording. See I-1. |
| 25 | FR-10 no "add pages" | Applied | l.147. |
| 26 | Display NFR | Applied | l.254. |
| 27 | Tone additions | Applied | l.258. |
| 28 | Finished on (finish flow, form, export) | **Partial** | Finish flow l.173, FR-1 l.77/85, and FR-22 l.241 are present. But FR-1 states only creation semantics, so its behavior on the edit form is undefined or contradictory. See I-2. |
| 29 | Measured pace exclusions, inclusive days; days-left rules | Applied | Glossary l.65; FR-11 l.157; FR-15 l.189 refers to §3. |
| 30 | Stats period rules | Applied | l.196–197. |
| 31 | Finish any Reading | Applied | l.174–175, l.178. |
| 32 | Waiting for you excludes Up next | Applied | Glossary l.59; FR-7 l.127. |
| 33 | Displacement named in confirmation | Applied | FR-5 l.115; FR-7 l.126. |
| 34 | Side read exit; "Which page?" by any route | Applied | l.134–135 (but see I-1 on the same line). |
| 35 | Pause surfaces + confirmation | Applied | l.118–120. |
| 36 | Re-read keeps full color + Main marker | Applied | FR-24 l.163; addendum l.86. |
| 37 | FR-20 specified | Applied | l.231–233; still Should. |
| 38 | Addendum label additions, field rules, lookup | Applied | Addendum l.35–38. Minor: the "Edit book" dialog name is missing (I-6). |
| 39 | FR-3 matching detail | Applied | l.99–102. |
| 40 | FR-1 Pages edit floor | Applied | l.86. |
| 41 | Reflow deviation | Applied | l.255. |
| 42 | Data safety: failed save | Applied | l.257. |
| 43 | FR-19 pile no search; FR-11 gauge label | Applied | l.223; l.153 "p.N of M". |

## Inconsistencies

### I-1 (Medium): FR-8 contradicts FR-5's "every start" rule
- FR-5 (l.111): "The confirmation is shown on every start or resume and holds the optional Purpose field (FR-9)."
- FR-8 (l.134): "Starting a Side read, by any route, asks "Which page?", and tracking starts from that page. If there's already a Main book, the FR-5 confirmation applies."
- Reading FR-8 literally, starting a Side read with no Main book skips the confirmation, and with it the Purpose field.
- **Fix:** "Starting a Side read, by any route, asks "Which page?" in the FR-5 confirmation, and tracking starts from that page."

### I-2 (Medium): FR-1 "Finished on" is defined only for creation
- FR-1 (l.85): "An empty **Finished on** means not read. A date, not in the future, creates a back-filled Reading finished on that date."
- The same field is on the edit form (delta 28; label contract). Read literally, this has three problems:
  - Clearing the field on a read Book means "not read", which implies deleting a finished Reading. That conflicts with Data safety ("No action silently deletes data").
  - Each save with a date could create another back-filled Reading.
  - It doesn't say what happens to a Book with an active or paused Reading.
- EXPERIENCE.md (New book panel → Finished on) settles all three: in edit mode the field shows the most recent finish date, and editing it changes that date. Clearing it is refused ("A finish date can't be removed here."). Filling it on a Book with an active or paused Reading adds a past Reading and leaves the current one untouched.
- **Fix:** add an FR-1 consequence: "On edit, Finished on shows the Book's most recent finish date; changing it changes that date, and it can't be cleared. On a Book with an active or paused Reading, a date adds a past back-filled Reading and leaves the current Reading untouched."

### I-3 (Low): Must FRs carry Should-tier content
- FR-5 (Must) "holds the optional Purpose field (FR-9)", and FR-9 is Should. Delta 24's reason for showing the confirmation on every start is the Purpose field. Until FR-9 ships, a start with no Main book shows a confirmation with nothing to confirm.
  - **Fix:** "Until FR-9 ships, the confirmation is shown only when there's a Main book or an Up next displacement to name", or promote FR-9 to Must.
- FR-1 (Must) lists "tags (FR-20)" as an optional field, and FR-20 is Should. The label contract also includes Tags.
  - **Fix:** mark it "tags (FR-20, Should; the field ships with FR-20)", or note that the Tags field ships with the MVP form and only filtering and sorting wait for FR-20.

### I-4 (Low): FR-2 outcome list omits the failed-save outcome
- FR-2 (l.93): "Every outcome of the form (saved, duplicate warning, validation error) is exposed…"
- The label contract and NFR Data safety (l.257) add a fourth outcome the skill reads: "Couldn't save. Your data wasn't changed."
- **Fix:** "(saved, duplicate warning, validation error, couldn't save)".

### I-5 (Low): Placement and traceability of new Must items
- FR-24 Bookcase sits under §4.3 Progress ("Progress is the current page of the Main book's Reading … Realizes UJ-2"). Its scope covers the whole library, and the overall "X of Y finished" meter serves JTBD 1 ("through my whole unread library").
  - **Fix:** acceptable as is. Optionally add to §4.3's intro: "FR-24 shows progress across the library."
- §4.7 Card notes is now Must but has no "Realizes" line, and no JTBD or UJ covers it.
  - **Fix:** optional. Add a one-line job ("Let me find where in a Book I wrote a thought"), or note that Card notes have no UJ.

### I-6 (Low): Label-contract summary in the addendum drops one entry
- EXPERIENCE.md's contract includes the panel's dialog name, "New book" / "Edit book" (role `dialog`, which the skill reads as "Panel open"). The addendum's summary (l.34–36) doesn't list it.
  - **Fix:** add "Panel: dialog named "New book" ("Edit book" in edit mode)" to the addendum list. The addendum already names EXPERIENCE.md as the single source, so this is cosmetic.

### I-7 (Info): UI terms used without definition
- "Book detail", "Main book card", "finish flow", "pile", and "Backup page" are used in FRs but aren't in §3. They are UI surfaces defined in EXPERIENCE.md, and their meaning is clear in context.
- **Fix:** none required. Optionally add a §0 sentence: "Screen names (Book detail, Backup, …) follow EXPERIENCE.md."

## Cross-reference check
- FR references: FR-1, FR-2, FR-3, FR-5, FR-6, FR-7, FR-9, FR-10, FR-14, FR-20, FR-22, FR-23, and FR-24 are cited and all resolve. There are no references to FR-12 or FR-13.
- Section references: §3, §5 Tone, §6.1, §6.2, and §6.3 resolve. There are no stale §4.x references in the PRD or the addendum.
- SM-1 validates FR-10, SM-2 validates FR-1 to FR-3, and SM-3 validates FR-5 to FR-7. All are still valid after renumbering.
