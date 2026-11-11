---
title: 'Update the UX docs to match Story 5.4'
type: 'chore'
created: '2026-11-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** the UX docs disagree with Story 5.4's decisions on the pile (Epic 5 retro F-A4, sprint item `epic-5-retro-item-45-…`, `deferred-work.md:651`). The disagreements are:
- **EXPERIENCE.md → Pile, Role** (l.261):
  - It says "The note sits in a polite live region" and quotes "Note 3 of 7, p.42: *text*." with a final period.
  - The pile has its own polite `status`, which is empty on open; the dialog's description reads the note and "N of M" instead.
  - Each move sets the status to the announcement, which has no final period (the ATDD decision; `pileAnnouncement`).
- **EXPERIENCE.md → Focus after close, Pile row** (l.397):
  - It gives the Card notes page no fallback.
  - The code (`usePileFlow`) goes to the last viewed note's Edit if it is shown, else that Book's "Go through as a pile", else the page `h1`. A search can hide the Edit, and can hide the group too.
- **DESIGN.md → Pile:** it doesn't show the page ref under the note text in the pile card. The code renders it in `meta`, `ink-tertiary` (`CardNotesPile.tsx` `styles.ref`), and Oleg chose to keep it (5.4 code review).

**Approach:**
- Edit the three passages so they state what the code does.
- Add a `resolved:` line to `deferred-work.md:651`.
- No code changes. Oleg reviews the diff before it's final.

</frozen-after-approval>

## Implementation Notes

- **Checked against the code:**
  - `CardNotesPile.tsx`: the `status` is set by `move` and emptied by `pickOrder`; `aria-describedby` points at the note and position; the `styles.ref` paragraph sits under `styles.text`.
  - `CardNotesPile.module.css` `.ref`: `meta`, `ink-tertiary`.
  - `lib/cardNotes.ts` `pileAnnouncement`: no final period.
  - `lib/usePileFlow.tsx`: the focus target is `editButton(noteId)`, then `fallback(bookId)`, then `main h1`.
  - The fallbacks: `CardNotesPage.tsx` uses the group's opener from `pileOpeners`; `BookDetailPage.tsx` uses `pileOpener`.
- **EXPERIENCE.md:**
  - Pile → Role now says what the code does.
  - The Focus after close Pile row gives one chain for both pages.
  - The Keyboard bullet already quotes the announcement without a period, so it is unchanged.
- **DESIGN.md → Pile:** the page ref under the note text, as plain `meta` text, not the list's chip button.
- **`deferred-work.md:651`:** a `resolved:` line.
- **Pile mock:** DESIGN.md → Pile notes that `key-book-detail.html` predates Story 5.4. The mock's card is a live region and repeats the Book title. The mock itself is unchanged, as with Birch Morning v2 (DESIGN.md's last section).
- **Line refs:** `deferred-work.md:651` (from the retro) is the section heading. The entry closed here is its second, at `:657`. The Intent's l.397 is the row's line after this change, l.396 before it. The Intent is frozen, so it is noted here.
- **No code changes.** No test that reads these docs covers the Pile sections. `e2e/app-shell.spec.ts` reads DESIGN.md's frontmatter tokens, and the Agent Label Contract covers only the New book panel, the Duplicate dialog and Search titles.


## Review Triage Log

### 2026-11-11: Blind Hunter, pass 1

Floor N = 4 (about 11 kB). It reported 11 findings.

- **`[low]` `[patch]` Sprint item 45 stays open, and the spec is `in-progress`.** The spec is set to `done`. The item is marked `done` with `sprint_status.py --set-action-status` when Oleg approves, in the same commit (item 44's precedent).
- **`[low]` `[patch]` The pile mock contradicts the new text.** Its card has `aria-live="polite"` and shows the Book title. DESIGN.md → Pile now says the mock predates Story 5.4 on both points.
- **`[low]` `[patch]` The description on open omits the page ref.** `aria-describedby` points at the card, which holds `.text` and `.ref`. Patched.
- **`[low]` `[patch]` "which is empty on open" could attach to the shell's regions.** Reworded with a semicolon.
- **`[low]` `[patch]` The focus row's parentheticals don't match the code.** A search hides the Edit on Book detail too, and the row didn't say why the `h1` step exists. Reworded: a search or Book detail's first-three cut can hide the Edit; a search on the Card notes page can hide the whole group.
- **`[low]` `[reject]` The row leaves out `#main`, the last fallback.** It is a last resort when `main h1` is missing, and every page has one. The table's last row already states the `h1` convention.
- **`[low]` `[patch]` The story citation, and the restart at "1 of M".** "(Story 5.4)" is dropped (EXPERIENCE.md cites stories only for staging). The restart at "1 of M" is added (`pickOrder` sets the index to 0).
- **`[low]` `[patch]` Initial focus isn't documented.** "Next takes focus on open" is added (`initialFocus: nextButton`).
- **`[low]` `[patch]` `:651` is the section heading, not the entry.** Recorded in the Implementation Notes. The Intent is frozen.
- **`[low]` `[patch]` "The only tests that read these docs" overstated it.** Reworded to "no test that reads these docs covers the Pile sections".
- **`[low]` `[reject]` The Intent's l.397 is the post-edit line.** The Intent is frozen and the retro gave that line. It is noted under Line refs.
