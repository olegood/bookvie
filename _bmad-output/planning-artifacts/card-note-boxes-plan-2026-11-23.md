---
title: Card note boxes — plan
status: agreed
created: 2026-11-23
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: GitHub issue #17 "Bookboxes for card notes"
mockups: https://claude.ai/artifact/8uoT5W7w4JQPjCZZ3b1k1p (private to Oleg)
---

# Card note boxes — plan

The Card notes page shows **one box per Book**, drawn as a box in the Book's spine color with a pile of cards in it. Clicking a box opens that Book's notes. A **Boxes · List** toggle keeps today's page as the List view. While Oleg searches on the shelf, boxes without a match fade back and boxes with matches show "3 of 12". The search goes into the box he opens and comes back out with him. The page keeps the name **Card notes**.

## 1. What already exists

- **Most of the issue's suggestions already ship.** `/card-notes` groups every note by Book (`CardNotesView.groups`, one `h2` per Book, by title key then Book id, AD-6). Each group has "Go through as a pile" (Story 5.4, `usePileFlow`) with Page order and Shuffled. The search is as-you-type across all notes (FR-19). `?book=<id>` scopes the page to one Book, with an "In *X*" chip that can be removed. So "open a box" and "go through the pile" are today's scoped page. The new part is the shelf.
- `backend/bookvie/views/models.py`: `CardNotesGroup` has `book_id`, `title` and `notes`. `CardNotesScope` has `book_id` and `title`. Neither has the spine color.
- `frontend/src/pages/CardNotesPage.tsx:132`: a new scope (Remove In *X*, Back, Forward, a link) starts with an empty search, and the search "lives in this page's state, never in the URL". As built, clicking a box would lose the search.
- `frontend/src/lib/catalogView.ts` and `components/ViewToggle.tsx`: the Catalog's remembered view (`bookvie.catalogView`, read and written inside try/catch, junk means the default) and its segmented `aria-pressed` toggle. The Card notes toggle copies both.
- Fourteen e2e files mention "Card notes". The nav label and the route don't change, so most of those references stay as they are.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **One box per Book, holding only that Book's notes.** There are no boxes the user packs and no notes shared across Books. | Oleg's call. Mary read "bookboxes" as user-packed boxes. Winston and Murat: that would be a new entity and a backup format change. |
| D2 | **The page keeps its name, "Card notes".** The route stays `/card-notes`, and "Card note" stays the domain and MCP term (`add_card_note`, `get_card_notes`). **This overrides issue #17's note "Rename the Card notes page".** | Oleg's call, over Sally's Bookboxes, Card boxes and Slip box. Amelia: "Slip box" promises a Zettelkasten we don't build. |
| D3 | **A Boxes · List toggle, remembered** in `bookvie.cardNotesView` (`"boxes"` / `"list"`), with the same try/catch pattern as `catalogView.ts`. Never exported, and restore doesn't touch it (AD-15). The toggle shows on the unscoped page only, and only when there are notes. | Oleg's call, over Amelia's search-as-the-switch, Sally's always-land-on-Boxes, and John's toggle plus search-driven matches. He uses both modes: sitting with one Book's ideas, and hunting across all cards. |
| D4 | **List is today's unscoped page, unchanged**: groups, search, highlights, the count, Edit, piles, Back to top. | Nothing he uses today goes away. |
| D5 | **Boxes is the default** when nothing valid is stored. | Oleg's call (Sally, Mary), over Murat's List. Precedent: the Catalog defaults to its visual view. |
| D6 | **The box:** the Book's spine color on the front, a label with the serif title (`book-title-sm`, at most 2 lines) and "N card notes" ("1 card note"), and cards peeking out of the top. The pile has **four height steps**: 1 note → 1 card, 2–5 → 3, 6–20 → 5, 21 or more → 7. | Oleg's calls. Murat: fixed steps, so a test checks a step, not a pixel. Sally: four reads as few, some, lots, a lot. |
| D7 | **Box order** is the groups' order: title key, then Book id (AD-6), the same as List, so switching views never reshuffles anything. **Only Books with notes get a box.** A page with no notes keeps today's empty state. | Room default (Sally). |
| D8 | **Each box is a link** to `/card-notes?book=<id>`. Its accessible name says what the lid shows: "*Atomic Habits*, 12 card notes". | Room default (Sally). |
| D9 | **The shelf shows a count line** when nothing is searched: "139 card notes in 9 Books". | Drawn in the mockups, which Oleg approved. Amelia: one sum over the loaded groups. Strike it here if it isn't wanted. |
| D10 | **The search on the shelf filters the boxes.** Boxes without a match fade back, and boxes with matches lift slightly and show a pill, "3 of 12", in place of the count. The status line reads "14 card notes in 4 Books contain “habit”." and "No card notes contain “…”." when nothing matches, with today's matching rules and about 500 ms timing. | Oleg's call, (iii), Sally's fade and badge. |
| D11 | **The fade is never the only signal.** A faded box stays a link with a full-strength focus ring. During a search, every box's accessible name carries its match: "*Atomic Habits*, 3 of 12 card notes match" or "*Refactoring*, no match" (superseded by Epic 14 retro item 98: "*Refactoring*, 4 card notes, no match"). The lift is instant under reduced motion. The fade strength is picked by eye at the UX step, then checked. | Murat: at 0.38 opacity the faded title is about 2:1. Sally: opacity plus the count, never color alone. |
| D12 | **The search goes with Oleg into the box and back out**, never in the URL. The architecture spine's AD-7 (Carried Card notes search) supersedes "through router state": the page holds the text, and router state carries only which shelf entry a box was opened from. Opening a box from the shelf with "habit" typed opens the scoped page with "habit" in the field, its matches highlighted and filtered as today. Going back to the shelf, by browser Back or by removing the "In *X*" chip, brings back the text in the field at that moment, with the same boxes faded. Every other way into the page (nav, a Book detail link, a reload, Forward to a fresh entry) starts empty, as today. | Oleg's call. Amelia found the gap at `CardNotesPage.tsx:132`. Murat: both directions are ACs. Winston: router state keeps the "never in the URL" rule. Treating the chip like Back is the room's default and open to Oleg. |
| D13 | **Switching Boxes ⇄ List keeps the search text.** It's the same page and the same field. | Room default. |
| D14 | **The open box is today's scoped page plus a spine-color strip** (8px, full width, under the top bar), using the Book's spine color. It has no toggle. Everything else (the chip, search, Add card note, the grid, "Go through as a pile") is unchanged. | Oleg's call (Sally). Amelia: a scoped page for a Book with no notes still needs the color, so the scope carries it too. |
| D15 | **Data:** `spineColor` (the resolved `Book.spine_color`) on both `CardNotesGroup` and `CardNotesScope`. No other server change, no data change and no backup format change. | Winston. Amelia's catch puts it on the scope too. |

Out of scope: boxes the user packs across Books (D1), renaming the page (D2), a quick pile button on the box itself (the open box already has one), and anything Safari- or Firefox-only (AGENTS.md → Supported browser).

## 3. Changes, in order

Each step is its own skill run, in a fresh context.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 14's first story: confirm no unresolved "spine drift" entries remain in `deferred-work.md` (AGENTS.md → Architecture spine). | — |
| 1 | EXPERIENCE.md | **Card notes** screen row and Flow 6: the Boxes · List toggle and its default (D3–D5), the shelf (D7–D9), the shelf search and its wording (D10, D11), the carried search (D12, D13), the open box (D14). Add `bookvie.cardNotesView` wherever the remembered preferences are listed. | `bmad-ux` (update) |
| 2 | DESIGN.md | A **Card note box** component: front in the spine color, the label strip, the four pile steps, the lift and fade, the match pill, focus, and light, dark and forced-colors states. The **Card notes view toggle** reuses the Catalog view toggle. The open box's **spine strip**. Use the mockups as the reference. Pick and record the fade value (D11). | `bmad-ux` (update) |
| 3 | PRD | **FR-19** amendment: the unscoped view can show the Books as boxes, one per Book, or as today's list. The choice is remembered on this computer and isn't exported. In box view the search shows which Books match and how many, and it's kept when a Book is opened and when the user comes back. Not a new FR. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | AD-15: add `bookvie.cardNotesView`. The `card-notes` view's shape: `spineColor` on group and scope. The carried search as router state, not URL (AD-6 or wherever the page's search is described). Not a new AD. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 14: See card notes as boxes**, covering the FR-19 amendment, with three stories (below). Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 14 and Stories 14.1–14.5. | `bmad-sprint-planning` |
| 7 | Stories 14.1–14.5 | Each: ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 14 retro after 14.5. | per story |
| 8 | Issue #17 | Link this plan. Close it when Epic 14 is done. | — |

## 4. Story cut (Epic 14)

**Split on 2026-11-24** (`bmad-create-epics-and-stories`, Oleg) into five stories, so each fits one build session: 14.1 as below; 14.2 below without the open box's spine strip; **14.3** the open box's spine strip (D14); **14.4** below's 14.3 without the carried search (D10, D11, D13); **14.5** the carried search (D12). `epics.md` holds the five stories and their ACs. The three-story cut below is kept as the room agreed it.

Three stories, each depending only on the one before it (John, over Amelia's two: a schema change in its own story lands `api:gen` and the byte-for-byte check green before anyone touches the shelf, Murat).

**14.1 The spine color in the card-notes view.** D15. `spineColor` on `CardNotesGroup` and `CardNotesScope` in `views/models.py` and wherever the view is built. Regenerate `frontend/src/api/generated/schema.d.ts` with `npm --prefix frontend run api:gen`. pytest for both fields, including a scoped Book with no notes. Nothing visible changes.

**14.2 Boxes on the Card notes page.** D3–D9, D14. `lib/cardNotesView.ts` (read/write `bookvie.cardNotesView`, like `catalogView.ts`). The toggle on the unscoped page, a new box component and the shelf grid, the count line, the open box's spine strip. List renders today's page. With text in the search, Boxes view shows today's flat matches until 14.3. The e2e fixture sets `list` for the existing Card notes specs.

**14.3 Search the boxes.** D10–D13. Fade, lift and the "3 of 12" pill, the status line, the accessible names during a search, and the search carried into the box and back out as AD-7 specifies (by Back and by removing the chip). The search kept across Boxes ⇄ List.

## 5. Tests

Murat's risks, for the ATDD:

- **Unchanged List** (P0): one fixture sets `bookvie.cardNotesView = "list"` for the existing Card notes specs, and they pass untouched. It's set in one place, not in fourteen files.
- **Default and storage** (P0): with nothing stored, a junk value, or storage that throws, the page opens in Boxes. The choice survives a reload. The key never appears in an export.
- **Spine color in the view** (P0, 14.1): every group carries its Book's resolved spine color, and so does the scope, including a scoped Book with no notes.
- **Boxes** (P1): one box per Book with notes, in the List's group order. The title and "N card notes" ("1 card note"). The pile step at its edges: 1, 2, 5, 6, 20, 21 notes. Each box links to `?book=<id>` and has the accessible name from D8.
- **Shelf search** (P0): matching boxes show "M of N" and the others fade. The status line and the "No card notes contain" case. Accessible names carry the match. A faded box still takes focus and shows a full focus ring. Reduced motion means no animation.
- **Carried search** (P0): type "habit", open a matching box: the field holds "habit" and only the matching notes show, highlighted. Change it to "habits" and go back: the shelf shows "habits" with the matching boxes. The same works through the "In *X*" chip. Entering from the nav, from a Book detail link, or by a reload starts empty.
- **Open box** (P1): the spine strip in the Book's color, no toggle, and today's scoped page otherwise. Add card note, Edit and the pile still work, and focus still returns as today.
- **Toggle** (P1): the segmented `aria-pressed` group, as in the Catalog. Switching keeps the search text and keeps focus on the pressed button. Back to top works in both views.
