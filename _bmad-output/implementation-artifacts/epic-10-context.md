# Epic 10 Context: Reverse the catalog order

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Oleg reverse the Catalog's order and see which order is in effect. A Sort direction toggle, joined to the Sort select, flips the current key's natural direction, so the longest book, the oldest additions or authors from Z are one click away instead of at the end of the shelf. The choice is remembered on this computer, resets when the key changes, and Home's bookcase slice follows it. With the toggle not pressed, every order is exactly what it is today, so nothing changes on upgrade.

## Stories

- Story 10.1: Reverse the catalog order

## Requirements & Constraints

- **Natural directions are unchanged:** Author A–Z (first listed author), Title A–Z, Date added newest first, Pages fewest first. The toggle reverses the current key's direction. The existing directions are already mixed (Date added is descending), so "reversed" is relative to each key, not "descending".
- **Labels per key:** Author and Title "A–Z" ⇄ "Z–A"; Date added "Newest first" ⇄ "Oldest first"; Pages "Fewest first" ⇄ "Most first". Arrow ↑ in the natural direction, ↓ when reversed.
- **Ties never flip:** in both directions, ties break by title A–Z, then `createdAt` older first, then Book id. Only the primary compare reverses.
- **Key change resets** the direction to the new key's natural order and stores that, so a reload shows the natural order.
- **Remembered per browser:** the reversal lives in its own `localStorage` key, `bookvie.catalogSortReversed`. A missing, empty, junk or unreadable value reads as not reversed; so does a stored `bookvie.catalogSort` that isn't one of the four keys (which reads as Author). A failed write still reverses for this visit, with no message. Neither key is exported, and a restore neither brings nor replaces them.
- **Upgrade safety:** with only `bookvie.catalogSort = "dateAdded"` stored, the Catalog is newest first and the toggle reads "↑ Newest first". With nothing stored, Author A–Z, "↑ A–Z".
- **All views follow:** bookcase, list, tiles and the bookcase's arrow-key order use one sorted array, so all reflect the reversal. Home's slice packs its rows in the reversed order before choosing them. Home has no toggle of its own.
- **Visibility:** the toggle shows only when the Sort select does (not on an empty Catalog). Search and filter chips are unaffected.
- **Epic gate:** per-epic quality gates, and the existing catalog and home-slice e2e specs pass unchanged with the toggle not pressed.
- Supported browser is desktop Chrome only; Safari/Firefox-only behavior is out of scope.

## Technical Decisions

- `sortBooks(books, key, reversed = false)` in `lib/catalog` negates only the primary compare; the shared `Intl.Collator` (`numeric: true`) and the tie-break chain stay as they are.
- `lib/catalogSort` owns both preferences: add read/write helpers for the reversal using the same try/catch pattern as the key, and a per-key direction label map. The format of `bookvie.catalogSort` must not change (no migration).
- The reversal is a UI preference only: client-side, never sent to the backend, no API or schema change.
- A new `components/SortDirectionToggle` sits right after `SortSelect` in `CatalogPage`. Choosing a key resets the reversal and writes both preferences. `HomePage` reads both when it mounts and passes them to the slice packing.
- Unit tests sit next to the existing `catalog` and `catalogSort` tests; the e2e test goes in a catalog sort spec.
- The spine already describes the reversal as planned (sorting, the UI preferences, the toggle component). If the built code differs from it, record it as spine drift in `deferred-work.md` rather than editing the spine during the story.

## UX & Interaction Patterns

- **Compound field:** the toggle is joined to the Sort select's right edge: same height and border, the shared edge drawn once (the toggle has no left border; the select's right corners are square; the outer right corners use `rounded.md`). `surface-inset` fill so it reads as a button next to a field. Content: an `ink-secondary` arrow, then the order's text in `body-sm`/`ink`. No new tokens.
- **Stable width:** minimum width fits the wider of the current key's two labels, so pressing it never moves the controls to its right; only a key change may change its width.
- **States:** no hover change. Focus: the shared edge turns `accent` when the select has focus; the toggle gets the standard focus ring; whichever half has focus is raised (`position: relative; z-index: 1`) so its ring isn't hidden. Under `forced-colors: active` the toggle is `ButtonFace` with `ButtonText` text, border and arrow, and the shared edge stays visible.
- **Semantics:** a plain `button` with no `aria-pressed`; its accessible name is its visible text, with the arrow `aria-hidden`. The select and toggle sit in a `role="group"` labelled by the visible "Sort" label.
- **Behavior:** click, Enter or Space reverses in place; focus stays on the button; the `status` region stays silent (the new name is the only feedback). It is the next Tab stop after the Sort select.
- The Catalog mockups predate the toggle; the design document's component spec is authoritative.
