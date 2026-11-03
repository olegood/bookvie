---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-01'
storyId: '1.14'
storyKey: '1-14-change-a-book-s-color-from-the-shelf'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-114-change-a-books-color-from-the-shelf'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md'
generatedTestFiles:
  - 'backend/tests/test_set_spine_color.py'
  - 'frontend/e2e/spine-popover.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.14, Conventions for every story → TR8, Seeded states)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-8, AD-9, AD-11)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states, Spine, Spine popover, Book detail → Change color, Keyboard, Live regions, Focus after close, Reflow)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (spine-popover tokens, Spine colors, Spine popover, Book detail → Change color)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-API-002, CAT-UNIT-003)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-13-add-a-cover.md'
  - 'backend/bookvie/intents/delete_book.py, edit_book.py, commit.py, contract.py; http/api.py; views/models.py, views/shelf.py; domain/book_fields.py'
  - 'backend/tests/builder.py, test_add_book.py, test_delete_book.py, test_cover.py (_seed_dune_with_cover), test_store.py (FaultyFs)'
  - 'frontend/e2e/fixtures.ts, bookcase.ts, bookcase.spec.ts, cover.spec.ts, book-detail.spec.ts, delete-book.spec.ts'
  - 'frontend/src/pages/Bookcase.tsx, BookDetailPage.tsx; components/SwatchRow.tsx; lib/catalog.ts, lib/bookDetail.ts'
  - 'frontend/playwright.config.ts, _bmad/tea/config.yaml'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a spine, when I click it or press Enter or Space, then a non-modal dialog popover labeled by the Book''s title opens above the spine with a pointer (below on the top row, shifted inward at viewport edges, at most viewport width − 32px), the spine gets aria-haspopup="dialog" and aria-expanded="true", and only one popover is open at a time (UX-DR28)' }
  - { id: AC-2, idSource: generated, text: 'Given an open popover, when it opens, then focus moves to its first actionable control, and Tab from the last control (or Shift+Tab from the first) closes it; and Esc, an outside click, × or focus leaving it close it, returning focus to the spine' }
  - { id: AC-3, idSource: generated, text: 'Given the popover, when I read it, then it shows title, subtitle, authors, "N pages · year", the status line and the color line, plus an "Open book →" link to Book detail; and it has no primary action until Stories 3.2 and 4.4 add them' }
  - { id: AC-4, idSource: generated, text: 'Given the Change color block in the popover and on Book detail, when I pick "From cover" (only when a cover exists) or one of Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone (toggle buttons with aria-pressed), then set-spine-color saves at once, with "From cover" clearing the user color, and the status region reads "Color set to Teal."; and the color line names where the color comes from ("Color: Teal, from cover", "Color: Sage", "Color: set by you"); and on an unread Book the block heading adds "· shown once read" (UX-DR29)' }
  - { id: AC-5, idSource: generated, text: 'Given a color change that can''t be saved, when the server answers couldnt_save, then the failure line "Couldn''t save. Your data wasn''t changed." appears and the previous selection stays shown' }
  - { id: AC-6, idSource: generated, text: 'The standard intent ACs (TR8) hold for set-spine-color' }
---

# ATDD Checklist - Epic 1, Story 1.14: Change a book's color from the shelf

**Date:** 2026-11-01
**Author:** Oleg
**Primary test levels:** E2E (Playwright against a real seeded `bookvie`) for the Spine popover and the Change color block; API (pytest, `TestClient` against `create_app` with a real `Store` on `tmp_path`) for `set-spine-color` and TR8

---

## Story Summary

As Oleg, I want to open a spine and change its color, so that each read book keeps the color I associate with it.

The client half: a spine opens a non-modal Spine popover (UX-DR28) with the Book's details, an "Open book →" link and the **Change color** block. Book detail gets the same block (UX-DR29). The server half: one new intent, `set-spine-color`, that sets or clears `spineColorUser` and re-resolves `spineColor` (AD-11). There are no new error codes.

**Story source:** `epics.md` → Story 1.14. **Spec:** [`spec-1-14-change-a-book-s-color-from-the-shelf.md`](../implementation-artifacts/spec-1-14-change-a-book-s-color-from-the-shelf.md), which settles the assumptions below (nearest curated name for a cover color, "Color: set by you" for any user color, × last in tab order, a repeat pick of the stored color commits, a re-pick of the pressed swatch sends nothing, lowercase hex stored as sent). When this checklist was written there was no spec yet (`sprint-status.yaml` had `1-14-change-a-book-s-color-from-the-shelf: backlog`). The scaffolds took their names from the criteria, EXPERIENCE.md, DESIGN.md and the 1.13 code. The spec should adopt the names under "Contract the Scaffolds Pin" or change the scaffolds with it.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false, so the spec uses the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.13.

**Generation mode:** AI generation from the criteria, the UX and architecture docs and the existing code. No browser recording, because the popover and Change color block don't exist yet. Every locator comes from a role and name the criteria or EXPERIENCE.md pin. Execution was **sequential** with a single author, as in Stories 1.6 to 1.13. The context was already loaded, and one author keeps the helpers consistent with `bookcase.ts`, `cover.spec.ts` and `test_delete_book.py`.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-6 in source order (one per Given/When/Then block, with the closing TR8 line as AC-6, as in earlier stories). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Click / Enter / Space → one non-modal `dialog` named by title; above, below on top row, inside viewport, ≤ 100vw − 32px; `aria-haspopup`, `aria-expanded` | E2E | P1 | `[P1] AC-1` |
| AC-2 | Focus to first control; Tab past last / Shift+Tab from first, Esc, outside click, × close; focus back to the spine | E2E | P1 | `[P1] AC-2` |
| AC-3 | Title, subtitle, authors, "N pages · year", status, color line, "Open book →"; no primary action | E2E | P1 | `[P1] AC-3` |
| AC-4 | Swatch (or From cover) → `set-spine-color` at once; "Color set to Teal."; color line names the source; "· shown once read" on unread; popover and Book detail | E2E | P0 | `[P0] AC-4` |
| AC-5 | `couldnt_save` → failure line, previous selection kept | E2E | P1 | `[P1] AC-5` |
| AC-6 | TR8: faults → 503 + byte-identical; invariants after success; `book_not_found`; no new code | API | P0 | `test_ac6_p0_…` |

Priorities: P0 is the story's purpose and its one write: AC-4 (the color is saved and the user can tell where it comes from) and AC-6 (R-03: one commit or none, for a new intent). AC-1, AC-2, AC-3 and AC-5 are P1. Their failures are visible and recoverable: a misplaced or sticky popover, a focus slip, a missing line, a stale selection after a failed save.

**Level split (no duplicate coverage):** what the popover and block show and send is E2E: role, name, geometry, focus, the request body, live regions. What the server does with the request is API: which stored fields change, how `spineColor` resolves, faults, invariants, `book_not_found`. AC-4's data rules (From cover clears the user color; user > cover > curated) are in the AC-6 leaf's success branch and the API follow-ups. AC-4's E2E leaf covers the user's journey.

---

## Story Integration Metadata

- **Story ID:** `1.14`
- **Story Key:** `1-14-change-a-book-s-color-from-the-shelf`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 1.14)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md`
- **Generated Test Files:** `backend/tests/test_set_spine_color.py`, `frontend/e2e/spine-popover.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all. The backend leaf has `@pytest.mark.skip(reason=RED)` and its name carries `ac6_p0`. E2E leaves use `test.skip(...)` and their titles carry `[P#] AC-n`. Each was un-skipped once on the current code and failed at its first assertion, as listed.

### API Tests (1 test): `backend/tests/test_set_spine_color.py`

- `[P0] AC-6` primary: with a fault at `write`, `fsync` or `replace`, `set-spine-color` gives **503** with the exact `couldnt_save` envelope, and `library.json` is byte-identical. On success, Dune has a stored cover (`#A85A4A`) and curated Sage. Teal → 200 `{ok: true}`, stored `(user, fromCover, curated, spineColor)` = `(Teal, #A85A4A, Sage, Teal)`. `null` → `(None, #A85A4A, Sage, #A85A4A)`. A Book with no cover and a user Teal → `null` gives curated Slate. Invariants hold after each. An unknown id → 409 `book_not_found` with nothing changed. The OpenAPI schema has the path, and `book_not_found` is the code. *Red today: 405 ≠ 503 (no route).*

### E2E Tests (5 tests): `frontend/e2e/spine-popover.spec.ts`

- `[P1] AC-1` primary: clicking Dune's spine shows **`dialog` "Dune"**. Then `aria-haspopup="dialog"`, `aria-expanded="true"`, no `aria-modal="true"`. Its box sits above the spine, inside the viewport, no wider than viewport − 32. Opening Neuromancer's leaves exactly one dialog, and Dune goes back to `aria-expanded="false"`. Enter and Space open it. On a shelf of 82 Books, Book 001 (top row, left edge) gets its popover below the spine and inside the viewport. *Red today: no dialog.*
- `[P1] AC-2` primary: on open, **"Open book →" is focused**. Then Esc, Shift+Tab from it, Tab past the last control, × ("Close") and a click on the "Bookcase" heading each close the popover with Dune's spine focused. *Red today: no link.*
- `[P1] AC-3` primary: the popover shows **"412 pages · 1965"**. Then "Dune", "Book One", "Frank Herbert", "finished", "Color: Sage". The only buttons are × and the eight swatches (Sage pressed, no From cover). Neuromancer shows "271 pages · 1984", "not read yet" and "Color: Slate". "Open book →" has `href="/book/<id>"` and leads to Book detail with `h1` Dune. *Red today: no text.*
- `[P0] AC-4` primary: in Dune's popover, **Teal is a toggle with `aria-pressed="false"`**. Then clicking it sends exactly one `set-spine-color` `{bookId, spineColor: "#4B7C7B"}`, `status` = "Color set to Teal.", the popover stays open with Teal pressed and Sage not, "Color: set by you" shows, and the spine's fill is Teal. On Book detail, the "Change color" region has its heading, "Color: set by you" and Teal pressed. Sage there sends the second request and announces "Color set to Sage.". Neuromancer (unread) has the heading "Change color · shown once read" with "Color: Slate" on Book detail, and the same heading text in its popover. *Red today: no swatch.*
- `[P1] AC-5` primary: with `set-spine-color` routed to a 503 `couldnt_save`, **Sage is pressed before the attempt**. Then clicking Teal shows "Couldn't save. Your data wasn't changed." inside the popover and in `alert`. `status` stays empty, the popover stays open, Sage stays pressed and Teal not, "Color: Sage" stays, and the spine is still Sage. *Red today: no swatch.*

**Note on AC-4 and AC-5:** their first assertion is the swatch's `aria-pressed` state before the click. Both criteria name it ("toggle buttons with `aria-pressed`", "the previous selection stays shown"). Without it, the first failure on today's code would be the click itself, a setup step and not an assertion.

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): `LibraryBuilder()` and `_seed_dune_with_cover` in pytest, `seededServer({…})` with `finished()` and `shelfOf()` from `bookcase.ts` in Playwright, with explicit ids.

## Fixtures Created

None shared. `test_set_spine_color.py` reuses `_client`, `_library_bytes` and `_stored_book` from `test_add_book.py`, `DUNE_ID` and `_seed_dune_with_cover` from `test_cover.py`, and `FaultyFs` from `test_store.py`. The E2E file has spec-local helpers in the 1.13 style: `popover`, `swatch`, `changeColor`, `rgbOf`, `requestsTo` and `intentOf`. If a later story reuses `popover`, `rgbOf` and `requestsTo` (Stories 3.2 and 4.4 add popover actions), move them into `bookcase.ts`.

## Mock Requirements

One. AC-5 routes `set-spine-color` to a 503 `couldnt_save` body, as `book-detail.spec.ts` AC-12 does for `edit-book`. A real seam fault isn't reachable from the browser. Real faults are proven at API level in AC-6.

## Contract the Scaffolds Pin (names the implementation must use)

- **Intent:** `POST /api/intents/set-spine-color`, `multipart/form-data` with a JSON part `intent` = `{"bookId": "<id>", "spineColor": "#RRGGBB" | null}`. `null` is "From cover": it clears `spineColorUser`. Success is exactly `{ok: true}`. Only `spineColorUser` and `spineColor` change, with `spineColor` = user, else from cover, else curated (AD-11). 409 `book_not_found` for a Book that's gone. There are no new error codes. The swatches send their DESIGN.md hex as `SwatchRow` spells it (`#4B7C7B`).
- **Spine:** the existing `button` gains `aria-haspopup="dialog"` and `aria-expanded` (`"true"` only while its popover is open). Its name and fill are unchanged.
- **Popover:** a non-modal `dialog` (no `aria-modal="true"`) whose name is exactly the title (`aria-labelledby`). At most one is in the page. It sits above the spine, or below it when its row is the top row, and stays inside the viewport at ≤ `100vw − 32px`. Its lines, each its own text node: title, subtitle (when set), authors (`; `-joined, as Book detail), "N pages · year", the status ("finished" / "not read yet", the spine name's status part) and the color line. Then the `link` "Open book →" to `/book/<id>`, the Change color block, and a `button` "Close" (×). Focus goes to "Open book →" on open (no primary action yet). It is first in tab order, so Shift+Tab from it closes. Tabbing past the last control closes.
- **Change color block** (popover and Book detail): a heading "Change color", which on an unread Book also reads "· shown once read". Then "From cover" (only with a cover) and the eight swatches as `SwatchRow` draws them: `button`s named Sage … Stone with `aria-pressed`. The pressed one is the swatch whose hex equals the resolved `spineColor`, or "From cover" when there is no user color and a cover exists. On Book detail it is a `region` (a `section` with `aria-labelledby` on its `h2`, like Readings) whose name starts "Change color".
- **Color line:** "Color: set by you" when `spineColorUser` is set. "Color: *Name*" for a curated color. "Color: *Name*, from cover" for a cover color (see the assumption below).
- **Outcomes:** success → `status` "Color set to *Name*." and the popover stays open. `couldnt_save` → the failure line (`FailureMessage`) in the popover or block, the same text in `alert`, nothing in `status`, and the previous selection, line and spine fill kept (no optimistic update, or a rollback).
- **Views:** the popover needs `subtitle`, `year`, the color source and whether a cover exists for each spine. Either `ShelfBook` gains `subtitle`, `year`, `spineColorUser`, `spineColorFromCover` and `hasCover` (or `coverFile`), or the popover reads `/api/views/book`. Book detail needs the resolved `spineColor` (`BookDetailView` lacks it today). Regenerate types with `npm run check:api`.

**Assumptions for the spec to confirm:**
- **"Color: Teal, from cover".** A cover color is any hex, not one of the eight. The spec must say how it is named: the nearest curated name (suggested), or the hex. The scaffolds don't pin this line; it is a follow-up.
- **"Color: set by you"** is the whole line for a user color, even when the user picked a named swatch. The scaffolds follow the three examples literally.
- **× is not first in tab order**, so that "Open book →" is both the first actionable control and the one Shift+Tab closes from. If the spec puts × first, AC-2's Shift+Tab branch starts from × instead.
- **The "· shown once read" heading** is matched with `\s*` between "Change color" and "·", so a `<span>` inside the heading may or may not add a space to its accessible name.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_set_spine_color.py`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/spine-popover.spec.ts -g "AC-1 "`.

### AC-6 the intent (do first)
- [x] `intents/set_spine_color.py`: `SetSpineColorIntent` (`book_id: str`, `spine_color: str | None`, strict, `extra="forbid"`, `spineColor` required but nullable). `parse_form_intent`. `#RRGGBB` checked with `book_fields._HEX_COLOR`, else 422 `invalid_fields` on `spineColor` with `SPINE_COLOR_MESSAGE`
- [x] `commit(store, change)`: `book_not_found` inside the change; set `spine_color_user`, then `spine_color = resolve_spine_color(user, from_cover, curated)`
- [x] `http/api.py` route `/intents/set-spine-color` (`OkResponse`, `response_model_exclude_none=True`) beside `delete-book`; export from `intents/__init__.py`
- [x] Activate AC-6

### AC-1 / AC-2 / AC-3 the popover
- [x] Views: the popover fields (see "Views" above); regenerate `schema.d.ts`
- [x] `components/SpinePopover.tsx`: non-modal dialog (not `<dialog>.showModal()`), `aria-labelledby` the title, the lines, "Open book →" `Link`, `SwatchRow`, × "Close". Position: measure the spine and popover, place above with the 14px pointer, flip below on the top row, clamp to `[16px, 100vw − 16px]`, `max-width: calc(100vw - 32px)`, 500px wide (DESIGN.md `spine-popover`)
- [x] `Bookcase.tsx`: one `openId` state; click, Enter and Space open it (a native button's click covers all three); `aria-haspopup="dialog"`, `aria-expanded`. Close on Esc, outside `pointerdown`, ×, `focusout` leaving the popover (which covers Tab past the last and Shift+Tab from the first), then focus the spine. Don't steal focus when the outside click lands on something focusable (see follow-ups)
- [x] Activate AC-1, AC-2, then AC-3

### AC-4 / AC-5 Change color
- [x] `api/`: a `useSetSpineColor()` mutation that refetches `home`, `catalog` and `book` on success
- [x] A shared `ChangeColor` block: heading (+ "· shown once read" in `ink-tertiary` when unread), color line with a 16px swatch, `SwatchRow` with `value` = the resolved `spineColor` (or empty for From cover). Picking sends at once, clears both live regions first, then announces "Color set to *Name*." On `couldnt_save`, shows `FailureMessage` and announces `alert`
- [x] Use it in `SpinePopover` and in `BookDetailPage` (a `section` with `aria-labelledby` after Readings)
- [x] Activate AC-4, then AC-5

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1:** the 14px pointer points at the spine's center (above and flipped); right-edge shift (the last spine on a full row); at a 1024px viewport the popover is ≤ 992px wide; it follows its spine on scroll. Under `prefers-reduced-motion` there is no fade (CSS only: no e2e assertion). The spine's `aria-expanded` is `"false"` (not absent) while closed
- ~~**AC-1 (deferred):** the same checks on Home's slice, once Stories 3.1/3.5 render it~~ **Retired:** deferred until Story 3.1 or 3.5 renders Home's slice (`_bmad-output/implementation-artifacts/deferred-work.md:122`)
- [x] **AC-2:** an outside click on a focusable control (e.g. Search titles) closes the popover and leaves focus on that control. Decide in the spec: EXPERIENCE says "Any close → Its spine", but stealing focus from a field the user clicked would be wrong. Opening another spine's popover moves focus into it. A search that hides the open spine closes its popover, and focus follows the Bookcase rule. Axe AA on the open popover in both themes
- [x] **AC-3:** a Book with no subtitle shows no empty line; no year → "N pages" with no " · "; several authors are joined with "; "; a long title wraps in the popover (the full title, never cut; CSS `overflow-wrap` only, no e2e assertion). A Main / Up next / paused status line comes later with Stories 3.x / 4.x
- [x] **AC-4 (UI):** with a cover (seed through `edit-book` as `cover.spec.ts` `attachCover` does), "From cover" with its dot is first. Pressing it sends `spineColor: null`, the line reads "Color: *Name*, from cover", and From cover is pressed. With a black-and-white cover, From cover has no dot and gives the curated color (unit test only: `lib/spineColor.test.ts`; no e2e assertion). Picking the already-pressed swatch sends nothing (decided: nothing is sent). A pick made while one is in flight is ignored: one request goes out and the first pick ends up pressed (the in-flight follow-up test). The swatch row keyboard: Tab reaches each swatch, and Space/Enter toggles it. Focus stays on the pressed swatch after a save. An unread Book's spine stays outlined after a pick, and the color shows once it's finished (by the existing `.read`/`.unread` styling; no e2e assertion). Book detail with a cover: From cover first and pressed, a swatch then From cover sends `spineColor: null`
- [x] **AC-4 (API):** `#4b7c7b` lowercase is accepted (decided: stored as sent). `"Teal"`, `"#12345"`, `""` → 422 `invalid_fields` on `spineColor`, "Spine color must be #RRGGBB or empty.", summary "Not saved. 1 field needs attention: Spine color.". A missing `spineColor` key, an extra key, `bookId: null` or a non-JSON part → 422 on `intent`. A pick equal to the current user color still commits (decided: it commits and returns 200). `spineColorFromCover` and `spineColorCurated` are untouched in every case (CAT-UNIT-003)
- [x] **AC-5:** a 500 `couldnt_save` behaves the same. The failure line is cleared by the next pick and by closing the popover. On Book detail the failure line shows under the block

---

## Notes

- **The spine's fill:** `Bookcase.module.css` sets `background: var(--spine-color)` only on `.read`, so AC-4 and AC-5 read the spine's `background-color` on finished Dune. An unread spine has no fill to check.
- **Shelf size:** AC-1 seeds 82 Books so the shelf wraps at the default 1280px viewport: Book 001 is on the top row and Dune on a lower one. The leaf checks that before it relies on it.
- **Popover scope:** Home's bookcase is still the placeholder slice (Story 3.1/3.5), so the scaffolds open spines on Catalog (`/`). The popover component should not depend on the page.

## Validation (step 5)

- Prerequisites: story criteria clear; Playwright and pytest configured; dev environment ran both suites.
- 6 criteria and 6 leaves: every leaf title carries exactly one declared `AC-n`, and every criterion has exactly one leaf.
- Every leaf is skipped (`1 skipped` in pytest, `5 skipped` in Playwright). Un-skipped on today's code, each fails at its first assertion, the criterion-defining one, as listed above. No placeholder assertions.
- Unimplemented setup stays opaque: the API leaf reads stored state only after the call under test, and no E2E leaf reads an intent response.
- State transitions (pick, clear, failed save, open/close) are exercised in their primary leaf.
- `ruff check` and `ruff format --check` pass on `test_set_spine_color.py`. `oxlint` and `tsc -b` pass on `spine-popover.spec.ts`. No browser or CLI sessions left open. The red-check copies and `test-results/` were deleted.
