---
title: Descending catalog sort — plan
status: agreed
created: 2026-11-15
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: docs/ideas.md → "Descending catalog sort"
---

# Descending catalog sort — plan

Let Oleg reverse the Catalog order. A **direction toggle** next to the Sort select flips the current key's order, and the button's text says what the order is ("↓ Z–A", "↑ Oldest first"). Each key keeps the direction it has today, so nothing changes until Oleg presses the toggle.

## 1. What already exists

- `frontend/src/lib/catalog.ts` `sortBooks(books, key)`: one primary compare per key, then fixed tie-breakers (Title A–Z with the shared `Intl.Collator`, then `createdAt` older first, then Book id).
- **The idea note is wrong about the current order.** Not every key sorts ascending: Author A–Z, Title A–Z, Pages fewest first, but **Date added newest first** (`catalog.ts:34`, `byCreatedAt(b, a)`). The direction is already mixed. What's missing is a way to see it and to flip it.
- `frontend/src/lib/catalogSort.ts`: the key is remembered in `bookvie.catalogSort`, read and written inside try/catch, and junk or a storage error reads as `author`.
- `frontend/src/components/SortSelect.tsx`: a native `select` labelled "Sort", rendered by `CatalogPage.tsx` only when the catalog isn't empty.
- **Home's slice also reads the remembered sort** (`HomePage.tsx:70`). EXPERIENCE.md → Sort select: "The choice is remembered on this computer and is shared with Home's slice."
- EXPERIENCE.md → Sort select spells out each key's order. DESIGN.md → Sort select describes the control. There's no single-button toggle component: every toggle so far is a segmented control with `aria-pressed`.
- The spine's AD-6 bullet (the catalog sort) and AD-15 (UI preferences in `localStorage`) describe the sort and the remembered key.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **A direction toggle button** right after the Sort select, in the same toolbar row. It isn't a set of descending entries inside the select. | Oleg's call, over Winston's eight-entry select. The direction is visible and takes one click. |
| D2 | **Each key keeps its natural direction:** Author A–Z, Title A–Z, Date added newest first, Pages fewest first. The toggle **reverses** that. | Oleg's call. With the toggle not pressed, the order is exactly what it is today (Murat: no silent change on upgrade). |
| D3 | **The button shows an arrow and text.** The text names the current order for the current key: Author and Title "A–Z" ⇄ "Z–A", Date added "Newest first" ⇄ "Oldest first", Pages "Fewest first" ⇄ "Most first". The arrow is ↑ for the natural direction and ↓ when reversed (exact glyphs per DESIGN.md). | Oleg's call. A bare arrow on Date added is a riddle. |
| D4 | **The visible text is the accessible name.** The button has **no `aria-pressed`**: its label already states the order, and "Z–A, pressed" means nothing. Pressing it re-sorts in place and keeps focus on the button. | Murat. One name, one meaning. |
| D5 | **Changing the sort key resets the direction** to the new key's natural order. | Oleg's call. "Reversed" means nothing outside the key it was set for: Author Z–A and Date added oldest first aren't the same intent. |
| D6 | **Remembered in its own key, `bookvie.catalogSortReversed`** (`"true"` / absent), next to `bookvie.catalogSort`, with the same try/catch pattern. A missing value, junk or a storage error reads as **not reversed**. The format of `bookvie.catalogSort` doesn't change. Never exported, and restore doesn't touch it (AD-15). | Winston: no format migration for a boolean. An old browser reads exactly as before. |
| D7 | **Tie-breakers don't flip:** Title A–Z, then `createdAt` older first, then id, in both directions. Only the primary compare reverses. | Amelia. Flipping the tie-breakers would just reorder Books with equal keys. |
| D8 | **Home's slice follows the direction too**, because it already follows the remembered sort. It has no toggle of its own. | Oleg's call. EXPERIENCE.md already says the sort is shared with Home's slice. |
| D9 | The toggle shows **only when the Sort select does** (not on an empty catalog). Search and the filter chips are unaffected. | Same rule as the select. |

Out of scope: catalog grouping (not built; if it's picked up later, it decides whether the direction orders the groups). Mary's "Pages most first by default" is parked: the toggle covers it with one click.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 10's first story: confirm no unresolved "spine drift" entries from Epic 9 remain in `deferred-work.md` (AGENTS.md → Architecture spine). | — |
| 1 | EXPERIENCE.md | **Sort select** row: correct the existing text and add the direction toggle (D2–D5, D7–D9). Add a **Sort direction** row to the controls table: a button with no `aria-pressed`, its label, what happens to focus, the reset on key change. Note `catalogSortReversed` where the remembered preferences are listed (Backup page row). | `bmad-ux` (update) |
| 2 | DESIGN.md | **Sort direction toggle** component: `button-secondary` styling at the Sort select's height, arrow glyph plus `body-sm` text, its place right after the select in Catalog toolbar row 1, and its light, dark and forced-colors states. No new tokens expected. | `bmad-ux` (update) |
| 3 | PRD | **FR-20** Sort consequence: each key has a natural direction (as in D2), the user can reverse it, and the reversal is remembered on this computer and resets when the key changes. An amendment, not a new FR. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | AD-6's catalog sort bullet: an optional reversal that flips only the primary compare. AD-15: add `bookvie.catalogSortReversed` to the UI preferences. Seed: `catalogSort` also holds the direction. Not a new AD. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 10: Reverse the catalog order**, covering the FR-20 amendment, with one story (below). Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 10 and Story 10.1. | `bmad-sprint-planning` |
| 7 | Story 10.1 | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 10 retro, since 10.1 closes the epic. | per story |
| 8 | `docs/ideas.md` | Status → `planned`, linking Epic 10 and this plan, and the note's "every sort is ascending only" corrected. Done with this plan. | — |

## 4. Story cut (Epic 10)

**10.1 Reverse the catalog order.** D1–D9:

- `lib/catalogSort.ts` gains `readCatalogSortReversed()` / `writeCatalogSortReversed()` and a per-key direction label (`CATALOG_SORT_DIRECTION_LABELS`).
- `lib/catalog.ts` `sortBooks(books, key, reversed = false)` negates only the primary compare.
- A new `components/SortDirectionToggle.tsx` sits after `SortSelect` in `CatalogPage`.
- `chooseSort` resets the reversal and writes both keys. `HomePage` reads both.
- Unit tests sit next to `catalog.test.ts` and `catalogSort.test.ts`. The e2e test goes in a catalog sort spec.

## 5. Tests

Murat's risks, for the ATDD:

- **Upgrade** (P0): with only `bookvie.catalogSort = "dateAdded"` stored (no reversal key), the Catalog is newest first and the button reads "Newest first". With nothing stored, it's Author A–Z.
- **Reverse per key** (P0): for each of the four keys, pressing the toggle gives exactly the reversed primary order, and the button text changes as in D3. Pressing it again restores the original order.
- **Ties stay put** (P1): two Books with the same author keep Title A–Z order in both directions, and twins (same title) keep `createdAt` older first.
- **Reset on key change** (P0): Author reversed (Z–A), then select Pages: the order is fewest first, the button reads "Fewest first", and storage holds "not reversed".
- **Remembered** (P1): the reversal survives a reload. Storage that throws, or a junk value, reads as not reversed and the catalog still sorts. Neither key appears in an export.
- **All three views and Home** (P1): Bookcase, List and Tiles follow the reversed order, and so does the bookcase keyboard order (Left/Right). Home's slice packs its rows in the reversed order (D8).
- **Accessibility** (P1): the button is a plain `button` with no `aria-pressed`. Its accessible name equals its visible text. Focus stays on it after a press. It's reachable by Tab right after the Sort select.
- **Unchanged** (P1): the existing catalog and home-slice e2e specs pass untouched with the toggle not pressed.
