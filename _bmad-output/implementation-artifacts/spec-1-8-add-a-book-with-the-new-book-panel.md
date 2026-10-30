---
title: 'Story 1.8: Add a book with the New book panel'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: 'da7f0148df894687106e176573d32f3ffecd232a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-8-add-a-book-with-the-new-book-panel.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The server accepts `add-book` (1.7), but Catalog has no way to call it: **New book** does nothing, a non-empty library shows nothing, and the cataloging skill can't confirm a save by title.

**Approach:** Build the New book side panel (every Agent Label Contract field, Tags suggestions, swatches, add / invalid / couldn't-save / close outcomes, in-flight guard), the List view table and **Search titles** on Catalog, and turn on the 12 ATDD scaffolds in `e2e/new-book-panel.spec.ts` and `e2e/catalog-list.spec.ts`. The criteria are epics.md → Story 1.8, AC-1…AC-12 in the checklist.

## Boundaries & Constraints

**Always:** Labels, roles and copy exactly per EXPERIENCE.md's Agent Label Contract. The server owns every refusal message: field messages are `fields[].message`, and the alert is the server's top-level `message`. `<form noValidate>`: no native bubbles, the server validates. The frontend imports only `api/`. `aria-disabled` (via `Button.disabledReason`), never native `disabled`. No red; invalid = 2px ink border. Live regions go only through `announce`/`clearAnnouncements`, cleared at panel open and at each **Add book** press. Un-skip the scaffolds without weakening them.

Decisions: the panel is a native `<dialog>` opened with `showModal()`. Because that makes the shell's live regions inert, the regions' host element moves into the open dialog and back on close (see Design Notes). The non-empty Catalog shows only the List view, and the Bookcase/List toggle is 1.10. Search titles shows only when the library has Books. The empty state keeps its single toolbar **New book** (no second button). Type option values are lowercase, with capitalized labels. A picked tag replaces the segment being typed and appends ", ". List view Status reads "Finished" / "Not read yet". Date added is `30 Oct 2026` (en-GB, short month). The highlight ring (DESIGN.md `highlight-ring` box-shadow) stays on the new row for 2 s. The search count reads "1 book matches." for one match, otherwise "N books match.". Title cells are focusable (`tabIndex=0`) until 1.11 makes them links. Added: the search is cleared, the panel closes, the refetched list renders, the new row scrolls into view, its title gets focus, then `announce('status', 'Added <Title>.')`.

**Never:** No Bookcase, view toggle, Sort or filters (1.10, Epic 7). No duplicate dialog (1.9), no Cover field (1.13), no edit mode (1.11). No server or contract changes. No edits to planning docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add | required fields | panel closes, "Added Dune.", row focused + ringed | N/A |
| Add under search | search "Neuro", add Dune | search cleared before focus | N/A |
| Invalid | Pages, Language empty | alert = server message; Pages focused; both `aria-invalid` + described-by | values kept |
| Couldn't save | 503 or network failure | alert + in-panel ink line "Couldn't save. Your data wasn't changed." | values kept |
| Double press | press while in flight | ignored; one POST | `aria-disabled="true"` |
| Search | "DUNE"; then "zzz" | 3 rows + "3 books match." after ~500 ms; "No titles match “zzz”." + "0 books match." | Esc clears |

</frozen-after-approval>

## Code Map

- `frontend/src/pages/CatalogPage.tsx` (+ `.module.css`) -- toolbar (Search titles first in DOM, then **New book**), the empty state, failure state. Host the panel and the list here; keep the failure/loading behaviour.
- `frontend/src/components/AppShell.tsx` -- renders the two live regions; switch to a portal into a movable host (below).
- `frontend/src/lib/announce.ts` -- `registerRegion`, `announce`, `clearAnnouncements` (100 ms tick). Reuse; add the region-host move helpers here or in a sibling `lib/` module.
- `frontend/src/components/TextField.tsx` -- labelled input with "(required)" outside the label, `error` → `aria-invalid` + described-by, ink styles already in CSS. Reuse for text/number/date fields; Type `<select>` and Tags combobox need the same label/message layout.
- `frontend/src/components/Button.tsx` -- `disabledReason` gives `aria-disabled` and swallows clicks. Use it for the in-flight guard.
- `frontend/src/components/FailureMessage.tsx` -- the in-panel couldn't-save line.
- `frontend/src/api/{intents,envelope,views,index}.ts` -- `sendIntent(client, verb, FormData)` resolves after the views refetch; `IntentResult` is `ok` (`ids.bookId`), `refusal` (`message`, `fields`) or `couldnt_save`. `CatalogView` has `books[]` (`id,title,firstAuthor,authors,pages,createdAt,finished`) and `tags`. Add `addBook(client, fields)` here.
- `frontend/src/styles/tokens.css` -- `--color-scrim`, `--shadow-overlay`, `--color-spine-*` hexes, `--font-book-title-sm-*`, `--font-panel-heading-*`; add `--side-panel-width: 440px`.
- `backend/bookvie/domain/book_fields.py` -- intent keys (camelCase) and form order; don't change.
- `frontend/e2e/{new-book-panel,catalog-list}.spec.ts` -- 12 skipped scaffolds; `fixtures.ts` `seededServer`.
- `frontend/scripts/copy.test.mjs` -- tone guard over all client strings; new copy must pass.
- `frontend/playwright.config.ts`, root `package.json` `check:e2e` -- deferred e2e TZ pin.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `frontend/playwright.config.ts` -- `TZ=Europe/Madrid` on `check:e2e`; `use.timezoneId: 'Europe/Madrid'`.
- [x] `frontend/src/lib/announce.ts`, `components/AppShell.tsx` -- regions rendered into a region host that `SidePanel` can move into its dialog and back; unit tests in `announce.test.ts`.
- [x] `frontend/src/components/SidePanel.tsx` (+ css) -- native dialog, `showModal`, `aria-labelledby` heading, × **Close**, scrollable body with `scroll-padding-bottom` = footer height, sticky footer, `::backdrop` scrim, right-anchored 440px full height, `cancel` event → onClose, focus returns to the opener.
- [x] `frontend/src/components/{SelectField,TagsCombobox,SwatchRow}.tsx` (+ css) -- Type select; Tags combobox/listbox (prefix match on the last comma segment ignoring case, Up/Down/Enter/Esc, Enter never submits); eight `aria-pressed` swatches that fill Spine color.
- [x] `frontend/src/api/books.ts`, `api/index.ts` -- `addBook(client, fields)` builds a `FormData` `intent` JSON of the raw strings, then `sendIntent('add-book')`.
- [x] `frontend/src/pages/NewBookPanel.tsx` (+ css) -- the form in contract order, Edition `1`; the outcomes per Boundaries; first invalid field focused in form order.
- [x] `frontend/src/pages/CatalogList.tsx`, `SearchTitles.tsx` (+ css), `lib/catalog.ts` (+ `catalog.test.ts`) -- collator sort (first author, then title), title predicate, count copy, date format; table, `hidden` rows, no-match line, 500 ms debounced count, Esc clears.
- [x] `frontend/src/pages/CatalogPage.tsx` -- wire the panel, list, search, and the add-success sequence.
- [x] `frontend/e2e/{new-book-panel,catalog-list}.spec.ts` -- un-skip all 12.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- Clock item: e2e TZ/`timezoneId` resolved in 1.8; `page.clock` + `--fake-today` wiring remains until a test needs it.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with the 12 Story 1.8 scaffolds active, and the 1.6 empty-shelf and shell tests still pass.
- Given the open panel, when a screen reader is in use, then the `alert`/`status` regions are inside the dialog (not inert), and after close they are back in the shell.

## Implementation Notes

- The couldn't-save line in the panel is the `alert` region itself, which `SidePanel` places in a slot above the footer buttons and un-hides in ink (`showAlert`). A separate `FailureMessage` would leave two elements with that text in the panel, and AC-7's `getByText(..., {exact:true})` would fail strict mode. Every other time the regions stay visually hidden.
- The Tags listbox is named "Tag suggestions". With the name "Tags", `getByLabel('Tags', {exact:true})` matched both elements.
- The sticky footer needed `flex-shrink: 0`, found in a screenshot of the couldn't-save state. `scroll-padding-bottom` follows the footer height through a ResizeObserver.
- Added an e2e test for the second acceptance criterion: the regions are in the dialog and not inert, and back outside `main` after close.
- Verification: `npm run check` exits 0 (pytest 468, node 0 skipped, e2e 66 incl. 13 for 1.8, smoke ok). The I/O matrix's network-failure case is covered by `intents.test.ts` (same `couldnt_save` path as AC-7).

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | SidePanel handles only `cancel`, not the dialog's native `close` (blind, edge) | low | patch | Per the close-watcher rules, Esc without history-action activation skips `cancel` and closes directly, so `panelOpen` stays true and New book can't reopen. One `onClose` prop fixes it. |
| 2 | Refusal with no known field gives no visible feedback (blind, edge, verification) | low | patch | `showAlert` is set only for couldnt_save; a refusal whose fields are all dropped (e.g. `intent`) shows nothing on screen. Direct fix: show the alert line whenever no field error is mapped. |
| 3 | `type=number` sanitizes "1e" to '' so the server says "required" (blind, edge ×2) | low | reject | The Agent Label Contract mandates `spinbutton (input type=number)` for Pages, Edition, Year; Finished on is a date picker that can't hold invalid text. |
| 4 | Cancel/Close/Esc during a save; reopen and send a second add (blind, edge ×2) | low | reject | Needs a cancel inside a local request's millisecond window, then a full re-entry; the save that does land is announced truthfully; the guard would add state across panel instances; 1.9's duplicate check is the backstop. |
| 5 | `ok` without `ids.bookId` leaves `added` stuck (blind, edge, verification) | false | reject | `add-book` always returns `ids.bookId` (1.7, `OkResponse(ids={"bookId": …})`); no reachable response omits it. |
| 6 | `added` effect has no exit when the row never appears (blind, edge) | low | reject | Only reachable when the server dies between commit and refetch; the Book is saved; fix adds a settled-refetch branch. |
| 7 | `adopt/releaseRegions` assume one modal (blind) | low | reject | No second modal exists in this story; Story 1.9's Duplicate dialog must stack parents when it adds one. |
| 8 | Screen readers may stop tracking moved live regions (blind) | maybe-false | defer | Medium if true. Settled by a manual NVDA + VoiceOver check of "Not saved…" in the panel and "Added …" after close. |
| 9 | `regionHost()` mutates the DOM during render; HMR leaves a stale host (blind) | low | reject | Dev-only; production never empties `body`; fix adds lifecycle code. |
| 10 | `tabIndex=0` on every title cell adds tab stops (blind) | false | reject | Spec decision; Story 1.11 turns them into links, which are tab stops too. |
| 11 | Highlight and panel fades ignore reduced motion (blind) | false | reject | `base.css:38` zeroes every transition and animation under `prefers-reduced-motion: reduce`. |
| 12 | `box-shadow` on `<tr>` may not render in WebKit (blind) | maybe-false | reject | Would be low only; settled by checking Safari with `border-collapse: separate`. |
| 13 | Field errors stay after the user fixes the field (blind) | low | reject | EXPERIENCE validates on each press; clearing on edit is a new behaviour. |
| 14 | Swatch hexes duplicated beside their tokens (blind) | low | reject | Palette is fixed by DESIGN.md and also mirrored in the backend; the fix adds a cross-file test. |
| 15 | No unit tests for refusal/couldnt_save in `books.ts`, `useAddBook`, TagsCombobox keys, UTC date (blind) | low | reject | Outcomes are covered end to end by AC-3/6/7; the specific Esc gap is #19; TZ is pinned in e2e. |
| 16 | Search input `width: 280px` overflows narrow windows/zoom (blind) | false | reject | The app's minimum width is 1024px and narrower windows scroll by design (Reflow is the accepted deviation); the toolbar fits at 1024px. |
| 17 | Enter in Tags never submits even with nothing selected (blind) | low | patch | `preventDefault` runs on every Enter; EXPERIENCE says only that Enter picks a suggestion. Direct fix: swallow Enter only when an option is active. |
| 18 | Stale couldn't-save text left in the alert region after close (edge) | low | reject | The next panel open and every save press empty both regions; clearing on close isn't specified, and the ordering with "Added …" would be fragile. |
| 19 | Esc in an open Tags list (closes the list, not the panel) untested (verification) | low | patch | No e2e presses Escape in Tags; deleting the branch would discard the form unnoticed. Add the step to AC-3. |
| 20 | Duplicate tags give duplicate React keys (edge) | false | reject | `CatalogView.tags` is merged ignoring case on the server (1.7), so it has no duplicates. |
| 21 | Unparseable `createdAt` makes Intl throw (edge) | false | reject | `createdAt` is a Pydantic `AwareDatetime`, always ISO. |
| 22 | List view cell contents (Author, Pages, Status, Date added) untested (verification) | medium | patch | AC-9's prefix regex never reads past the title; a swapped Status ternary or a raw date would pass, and the TZ pin guards nothing. Assert a finished and an unread row's cells exactly. |
| 23 | Search titles on the empty shelf not ruled out by any test (verification) | low | patch | `catalog-empty.spec.ts:85` checks `textbox`, but a search input is `searchbox`. Add one count-0 assertion. |
| 24 | Pending search count cancelled at panel open / add is untested (verification) | low | defer | Timing-dependent; needs a dedicated timed test (reviewer's disposition). |

## Design Notes

Region host: `AppShell` portals both regions into one `div` created outside React's tree (`document.body`). `SidePanel` calls `adoptRegions(dialog)` after `showModal()` and `releaseRegions()` on close. React only owns the portal's children, so moving the host is safe, and there is still exactly one `status` and one `alert` in the document. 1.9's Duplicate dialog reuses it.

Add sequence (focus must settle before the announcement):
```ts
clearAnnouncements(); setBusy(true)
const result = await addBook(client, values)   // resolves after refetch
if (result.kind === 'ok') { onAdded(result.ids.bookId, values.title.trim()) } // page: clear search, close, then after render focus+ring+announce
```

## Verification

**Commands:**
- `npm run build && npm --prefix frontend run e2e -- e2e/new-book-panel.spec.ts e2e/catalog-list.spec.ts` -- expected: 12 passed, 0 skipped.
- `npm run check` -- expected: exit 0.
