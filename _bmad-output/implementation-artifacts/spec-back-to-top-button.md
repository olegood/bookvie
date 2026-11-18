---
title: 'Back to top button on Catalog and Card notes'
type: 'feature'
created: '2026-11-18'
status: 'draft'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-back-to-top-button.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Catalog (about 500 Books: about 15 bookcase rows at 1280px, longer in List and Tiles) and Card notes are long pages. Mouse and trackpad users have no quick way back to the search field, filter chips and sort at the top. The Home key helps only keyboard users, and only while focus isn't in the bookcase (whose roving focus takes Home).

**Approach:** One `BackToTop` component, mounted by the Catalog page and the Card notes page, each passing a ref to its search field. It shows a fixed button, an up arrow plus the words "Back to top", in the bottom-right corner once the page is scrolled more than one window height. Pressing it scrolls to the top (smooth, instant under reduced motion) and moves focus to the page's search field. Source: `docs/ideas.md` → "Back to top button"; party-mode session 2026-11-18 with Oleg.

Oleg's decisions (2026-11-18):
- **D1** On Catalog **and** Card notes, not in the app shell and not on other pages.
- **D2** After a press, focus goes to the page's search field ("Search titles" / "Search card notes").
- **D3** Smooth scroll; an instant jump under `prefers-reduced-motion: reduce`.
- **D4** The button shows an up arrow (`aria-hidden`) plus the visible text "Back to top", which is its accessible name. Not an icon-only circle.
- **D5** A standalone pipeline spec, not an epic. No new FR.

## Boundaries & Constraints

**Always:**
- Shown when `window.scrollY` is greater than `window.innerHeight`; otherwise not rendered or `hidden`, so it is never a Tab stop or an accessible node while invisible. Re-evaluated on scroll (passive listener, at most once per animation frame) and on resize.
- Works the same in all three Catalog views (Bookcase, List, Tiles) and with a search or filter active.
- In DOM order it comes after the page's content, so it is the last Tab stop of `main`.
- Focus moves with `focus({ preventScroll: true })`, so the focus call never cuts the smooth scroll short. The search field keeps its text; nothing is cleared.
- A secondary-button look (DESIGN.md `button-secondary`), with the existing focus ring. Light and dark from tokens, and forced-colors keeps a visible border.
- At the very bottom of the page the button covers no Book, row, tile, card note or control: the page leaves room for it below its content.
- DESIGN.md gets a "Back to top button" component entry and EXPERIENCE.md a row in its component table, both matching what ships.

**Never:**
- No announcement in the live regions (the focus move is the feedback).
- No keyboard shortcut, no change to the Home key or to the bookcase's roving focus.
- Not on Home, Stats, Backup or Book detail. No app-shell change.
- Not shown above an open side panel or dialog (the page behind them is inert and covered).
- No workaround for Safari or Firefox behavior (AGENTS.md → Supported browser).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Top of page | Catalog with many Books, `scrollY = 0` | No button | N/A |
| Scrolled past one window | `scrollY > innerHeight` | Button "Back to top" visible bottom-right | N/A |
| Back near the top | Scrolled down, then up to `scrollY <= innerHeight` | Button hidden again | N/A |
| Short page | Catalog or Card notes shorter than two windows, scrolled to the bottom | Button never shows | N/A |
| Press | Button clicked, or Enter/Space on it | Page scrolls to the top; focus on the search field, its text kept | N/A |
| Reduced motion | `prefers-reduced-motion: reduce`, press | Page jumps to the top instantly; same focus | N/A |
| Resize | Window made taller so `scrollY <= innerHeight` | Button hides without a scroll | N/A |
| Empty pages | Empty catalog, or Card notes with no notes | No search field and no long page; no button, no error | N/A |

</frozen-after-approval>

## Tasks & Acceptance

**Acceptance Criteria:**
- **AC-1** Given the Catalog with enough Books to scroll more than two window heights (in Bookcase, List and Tiles), when the page is at the top, then there is no "Back to top" button; when it is scrolled more than one window height, then a button named "Back to top" with the visible text "Back to top" is shown fixed in the bottom-right corner; when it is scrolled back to within one window height of the top, then it is hidden again.
- **AC-2** Given the button is shown on Catalog, when it is pressed (click, Enter or Space), then the page scrolls to `scrollY = 0` and focus is on "Search titles", which keeps any typed search text.
- **AC-3** Given Card notes with enough notes to scroll more than two window heights, the button behaves as in AC-1 and AC-2, and focus lands on "Search card notes".
- **AC-4** Given `prefers-reduced-motion: reduce`, when the button is pressed, then the page reaches the top without a smooth animation (instantly); otherwise the scroll is smooth and still ends at the top with focus on the search field.
- **AC-5** Given a Catalog or Card notes page shorter than two window heights, when it is scrolled to the bottom, then the button never shows.
- **AC-6** Given the button is hidden, then it isn't focusable and isn't in the accessibility tree; given it is shown, then it is the last Tab stop inside `main` and shows the focus ring on keyboard focus.
- **AC-7** Given the page is scrolled to its very bottom, then the button doesn't overlap the last Book (spine, row or tile), the last card note, or any control.
- **AC-8** Given Home, Stats, Backup or Book detail, then no "Back to top" button is rendered there.
- **AC-9** DESIGN.md and EXPERIENCE.md describe the button (look, placement, threshold, focus target, reduced motion) as it ships; `npm run check` passes.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- Catalog already holds `searchRef` (`CatalogPage.tsx:165`) and passes it to `SearchTitles` as `inputRef`; Card notes renders `SearchTitles` (`CardNotesPage.tsx:282`) without a ref yet. When the ref is null the component renders nothing.
- Reduced motion is already read with `matchMedia('(prefers-reduced-motion: reduce)')` in `CatalogPage.tsx:94`, `lib/usePileFlow.tsx:33` and `lib/useFinishMoment.ts:35`; reuse or share one helper rather than adding a fourth copy.

## Verification

**Commands:**
- `npm run check` -- expected: passes (formatters, lint, types, unit and e2e).
