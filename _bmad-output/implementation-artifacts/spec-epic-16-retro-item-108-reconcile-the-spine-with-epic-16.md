---
title: 'Reconcile the architecture spine with as-built Epic 16'
type: 'chore'
created: '2026-11-26'
status: 'done'
route: 'oneshot'
baseline_commit: 'd5c7e9242a071fea9d0bdd6ca615f4ba87946911'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 16 left three unresolved "spine drift" entries in `deferred-work.md`: Story 16.1's (`:1867`, the FR-31 row and the Structural Seed don't name `components/FavouriteStar` or `lib/useFavourite`), Story 16.2's (`:1873`, `useFavourite`'s `onSaved` hand-off to `pages/CatalogPage` isn't named), and item 107's (`:1883`, AD-6's filter chips item doesn't say when a pending unstar is dropped or that focus moves only when the render took it away). The Map's lead-in still says Epic 16 builds FR-31 (Epic 16 retro item 108; sprint item `epic-16-retro-item-108-reconcile-the-spine-with-epic-16`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so it states what the code does at `d5c7e92`, checked against the code:
  - FR-31 Map row: name `components/FavouriteStar` (the star button and `StarIcon`, also drawn by the Favourites chip and the spine mark) and `lib/useFavourite` (the save flow, its inline and row failure slots, `onSaved`). Lead-in: every row is built, FR-31 in Epic 16.
  - Structural Seed: `lib/` gains `useFavourite`; `components/` gains `FavouriteStar`.
  - AD-7's favourite star bullet: the flow's announcement after the refetch, its failure slots, and the `onSaved` hand-off that lets `pages/CatalogPage` own the unstar-with-Favourites-on line.
  - AD-6's filter chips item, last sentence: a search, a filter change, a star press or a New book save drops a pending unstar silently; once the refetched view no longer shows the Book, focus moves only when the render took it away (`focusTakenAway`: `body`, `main` or a hidden element), and the combined line is spoken. No plain star line when the chip goes off first.
  - Frontmatter `updated: '2026-11-26'`.
- Add a `resolved:` line to each of the three entries (`:1867`, `:1873`, `:1883`).
- Out of scope: items 109 to 111, EXPERIENCE.md, `epics.md`, `README.md`, any code.

</frozen-after-approval>

## Implementation Notes

- **Count:** the scan of items 82, 89 and 97 (an entry is a line starting `- ` and its indented lines; count those whose text holds "spine drift" in any case and have no `resolved:` line) gives 3 before (`:1867`, `:1873`, `:1883`). Expected 0 after.
- **Code facts at `d5c7e92`:**
  - `components/FavouriteStar.tsx`: default `FavouriteStar` (icon `button`, `aria-pressed`, never disabled; variants `detail`, `popover`, `row`, `tile`, the tile's paper halo) and `StarIcon` (`aria-hidden` SVG), which `components/FilterChips` (Favourites chip) and `pages/Bookcase` (the spine mark) also draw.
  - `lib/useFavourite.ts`: `press` sends the value (never a toggle); on `ok`, `status` says "*Title* is (not) a favourite." after the refetch; on failure the `alert` line shows in the inline slot rendered at the press (Book detail, an open popover), else the row slot under Catalog's filter row; it moves to the row for good when the inline slot goes; cleared at the next attempt and on `clear()` (a filter change). `onSaved(book, favourite)` returning true takes over the line. Users: `BookDetailPage` (own flow), `pages/CatalogPage` (one flow for all three views, passed to `Bookcase`, `CatalogList`, `CatalogTiles`, `SpinePopover`), `Bookcase`'s own flow for Home's slice.
  - `pages/CatalogPage.tsx`: `onSaved` returns true only for an unstar with Favourites on, stores `pendingUnstar`; `dropPendingUnstar()` runs in `search`, `changeFilters` (so Clear filters too), the wrapped `press` and the New book `onSaved`; the layout effect, once `shown` lacks the Book, focuses next / previous / Search titles only if `focusTakenAway()`, cancels a waiting count and announces the combined line.

- **Spine edits** (`ARCHITECTURE-SPINE.md`): `updated` 2026-11-26; AD-6's filter chips item (the `onSaved` take-over, the pending unstar, `focusTakenAway`, the four drops, no star line when the chip goes off first); AD-7's favourite star bullet (the flow, the button, the status line, the two failure slots, `onSaved`, which pages run their own flow); the Seed's `lib/` line (`useFavourite`) and `components/` line (`FavouriteStar`, `StarIcon`); the Map's lead-in and FR-31 row.
- **`deferred-work.md`:** a `resolved:` line on `:1867`, `:1873` and `:1883`. The Story 16.2 automate entry's `resolved:` line, which cites the leaf item 107 deleted, is left as history; item 107's own entry already says so. Drift scan: 3 before, 0 after.
- **Not changed:** code, EXPERIENCE.md (its "With the Favourites chip on" bullet describes the pressed case, which still holds), `epics.md`, `README.md`.
- **Scope:** the retro and its sprint item name two drift entries; item 107's build added a third (`:1883`, AD-6) after the retro was written, and it is closed here too, since the next epic's gate counts every unresolved entry.
- **Review patches:** AD-6 now puts the focus move before the line, says the line is spoken either way after a waiting Search titles count is cancelled, and lists "nothing" among `focusTakenAway`'s cases; AD-7 says the inline slot takes a failure only while the press's slot is still rendered, and that Home's slice, with no row slot, leaves the line in the shell's regions. The `:1883` `resolved:` line matches. One deferral: EXPERIENCE.md's unstar bullet.
- **Verification:** drift scan 3 before, 0 after (re-run after the patches). Format and lint check before the commit.

## Review Triage Log

Blind Hunter (9 findings):

- `low`, patch: AD-6 said the line, then focus "but only when…", reversing the code's order (focus, then `announce`) and reading as if the condition governed the line. Reordered.
- `low`, patch: AD-6 left out `cancelCount()` before the combined line. Added.
- `low`, patch: AD-7's inline-slot rule ("rendered when the press was made") missed that the same slot must still be rendered at the failure (`slotAtPress`, `inlineNow` in `useFavourite.ts`). Reworded.
- `low`, patch: Home's `Bookcase` flow renders no row slot, so a failure after its popover closed has no slot and stays in the shell's regions. Stated.
- `low`, patch: `focusTakenAway` also counts `activeElement === null`. Added.
- `medium`, defer: EXPERIENCE.md line 260 still moves focus with no condition. A UX-doc edit outside item 108's Changes; `deferred-work.md` entry added.
- `low`, rejected: a "superseded" note on the Story 16.2 verification-gap entry. Old entries aren't edited; item 107's entry already records that its leaf and branch are gone.
- `false`: tracking unfinished (spec `in-progress`, sprint item open, no verification). The spec was mid-run; status, this log, the verification line and the sprint item are written at finalize. The two-vs-three scope is recorded above.
- `low`, rejected: split AD-6's filter chips item into sub-bullets. A restructure beyond reconciling drift; nothing is wrong in it.
