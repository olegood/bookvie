---
title: "Story 1.14: Change a book's color from the shelf"
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e1d19c20cf24e904e7b2edc5793dd2008b064347'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Book's spine color can only be changed through the edit panel, and a spine on the shelf does nothing when pressed.

**Approach:** Add a `set-spine-color` intent that sets or clears `spineColorUser` and re-resolves `spineColor` (AD-11). Pressing a spine opens a non-modal Spine popover (UX-DR28) with the Book's details, "Open book →" and a shared **Change color** block. Book detail gets the same block (UX-DR29). Turn on the 6 ATDD scaffolds (`backend/tests/test_set_spine_color.py`, `frontend/e2e/spine-popover.spec.ts`). The criteria are epics.md → Story 1.14, AC-1…AC-6 in the checklist.

## Boundaries & Constraints

**Always:** Every name, role, text and request body in the checklist's "Contract the Scaffolds Pin". Only `spineColorUser` and `spineColor` change. The intent follows TR8 (one commit or none, 503 on fault, invariants, `book_not_found`). No new error codes. No optimistic update: the pressed swatch, the color line and the spine fill change only after the refetched views render. Un-skip the scaffolds without weakening them. The layer rule holds.

Decisions:
- `spineColor` is required and nullable. `#RRGGBB` (either case, stored as sent, like `edit-book`) or `null`. Anything else → 422 `invalid_fields` on `spineColor` with `SPINE_COLOR_MESSAGE`. A pick equal to the stored color still commits and returns 200.
- `ShelfBook` gains `subtitle`, `year`, `spineColorUser`, `spineColorFromCover` and `hasCover`, so the popover needs no extra fetch. `BookDetailView` gains the resolved `spineColor`.
- Pressed state: "From cover" when there is no user color and a cover exists. Otherwise, the swatch whose hex matches the resolved `spineColor`, ignoring case. Pressing the swatch that is already pressed sends nothing.
- Popover: rendered in `position: fixed`, 500px wide, max `calc(100vw - 32px)`, with a 14px pointer at the spine's centre. Above the spine with an 8px gap. Below when there is no room above. Clamped to 16px from each viewport edge. Repositions on scroll and resize. Fades in over at most 150 ms, with no fade under reduced motion. Its tab order: "Open book →", the Change color controls, × "Close". `focusout` to outside the popover closes it.
- Color line: "Color: set by you" when the user color is set. "Color: *Name*" for curated. "Color: *Name*, from cover" for a cover color, where *Name* is the nearest of the eight curated colors by RGB distance. It has a 16px dot in the resolved color.
- Outside click: the popover closes. If the click landed on a focusable control (e.g. Search titles), focus stays there. Otherwise focus returns to the spine. Every other close returns focus to the spine.
- On failure, show `FailureMessage` under the block and in `alert`. Clear it on the next pick or when the popover closes.

**Never:** No covers on spines or in the popover. No primary action, "Start reading" or hint in the popover (Stories 3.2 and 4.4). No changes to Home's placeholder slice. No `<dialog>.showModal()`. No change to the edit panel's Spine color field. No planning-doc edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pick swatch | Dune (cover `#A85A4A`, curated Sage), Teal | user Teal, `spineColor` Teal | N/A |
| From cover | `spineColor: null`, cover present | user null, `spineColor` = cover | N/A |
| From cover, no cover | user Teal, no cover, `null` | `spineColor` = curated | N/A |
| Bad value | `"Teal"`, `"#12345"`, `""` | 422 on `spineColor` | nothing changed |
| Bad shape | key missing, extra key, `bookId: null`, non-JSON | 422 on `intent` | nothing changed |
| Gone Book | unknown id | 409 `book_not_found` | nothing changed |
| Fault | write / fsync / replace | 503 `couldnt_save`, byte-identical | UI keeps the old selection |

</frozen-after-approval>

## Code Map

- `backend/bookvie/intents/delete_book.py:26-66` -- pattern for the new `set_spine_color.py`: `ConfigDict(alias_generator=to_camel, extra="forbid", strict=True)`. Apply `_no_null` to `book_id` only (`spine_color` is nullable but required, so no default). `parse_form_intent` (`book_form.py:87`), `book_not_found()` inside `change`, `commit(store, change)` (`commit.py:28`). `refuse_fields([("spineColor", SPINE_COLOR_MESSAGE)])` (`book_form.py:103`).
- `backend/bookvie/domain/book_fields.py:58,67,293` -- `_HEX_COLOR` (make it public or add `is_hex_color()`), `SPINE_COLOR_MESSAGE`, `resolve_spine_color`. `edit_book.py:204-227` shows the re-resolve via `model_copy(update=…)`.
- `backend/bookvie/intents/__init__.py:26-63` -- export `SetSpineColorIntent`, `parse_set_spine_color_intent`, `set_spine_color` (alphabetical `__all__`).
- `backend/bookvie/http/api.py:31-49,237` -- import, then a route beside `delete-book` (`OkResponse`, `response_model_exclude_none=True`, the same `intent` Form parameter, no `File`).
- `backend/bookvie/views/models.py:25-34,55-87` + `views/shelf.py:27-38,80-110` -- the `ShelfBook` and `BookDetailView` fields.
- `backend/tests/test_set_spine_color.py` (un-skip at :71), `test_views.py`, `test_contract.py`.
- `frontend/src/api/books.ts:95-110` -- copy `deleteBookForm`/`deleteBook`/`useDeleteBook` into `setSpineColor`/`useSetSpineColor`. `sendIntent` (`intents.ts:40`) already invalidates `['view']`. Export from `api/index.ts`. Run `npm run check:api` for `generated/schema.d.ts`.
- `frontend/src/components/SwatchRow.tsx:4-56` -- export a `swatchName(hex)` lookup from the `SWATCHES` table (uppercase hex, case-insensitive). `onPick('')` is From cover, so the block maps `''` → `null`.
- `frontend/src/components/ChangeColor.tsx` (new) -- heading (`h2` on Book detail, a smaller heading in the popover) + `<small>· shown once read</small>` when unread, the color line, `SwatchRow`, `FailureMessage`. Uses `announce`/`clearAnnouncements` (`api/announce.ts:84-100`) for "Color set to *Name*." / the failure. Use an in-flight ref guard like `BookDetailPage.tsx:65,88`.
- `frontend/src/components/SpinePopover.tsx` (+ `.module.css`, new) -- `role="dialog"`, `aria-labelledby` the title, the lines, a `Link` "Open book →" to `/book/<id>`, `ChangeColor`, × `aria-label="Close"`. Tokens and shadow come from DESIGN.md "Spine popover" (`surface`, `line`, 12px radius).
- `frontend/src/pages/Bookcase.tsx:90-217` -- one `openId` state. Spine `onClick` (covers Enter and Space) toggles it. Add `aria-haspopup="dialog"`, `aria-expanded`. Mount the popover after the `<ul>` and anchor it with the `buttons` ref rect. Close on Esc, outside `pointerdown`, ×, `focusout`. If a search hides the open spine, close the popover. The roving `stopId` stays on the spine.
- `frontend/src/pages/BookDetailPage.tsx:155-168` -- a `section` with `aria-labelledby` + `h2` "Change color", copying Readings, as the last block of `.info`.
- `frontend/src/lib/catalog.ts:40` -- status words. `lib/bookDetail.ts:82` joins authors with `'; '`.
- `frontend/e2e/spine-popover.spec.ts` -- un-skip all 5. `e2e/bookcase.ts` holds `spine`, `finished`, `shelfOf`, and `e2e/cover.spec.ts` `attachCover` seeds a cover.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/set_spine_color.py`, `__init__.py`, `domain/book_fields.py` -- the intent, its validation and its change.
- [x] `backend/bookvie/http/api.py` -- the route.
- [x] `backend/bookvie/views/{models,shelf}.py` -- the new view fields.
- [x] `backend/tests/test_set_spine_color.py`, `test_views.py` -- un-skip AC-6. Add the checklist's AC-4 (API) follow-ups: lowercase, the bad values and shapes, the repeat pick, from-cover/curated never touched. Cover the view fields.
- [x] `frontend/src/api/books.ts` (+ `books.test.ts`), `api/index.ts` -- `setSpineColor` with the body `{bookId, spineColor}`. Run `npm run check:api`.
- [x] `frontend/src/components/{SwatchRow,ChangeColor}.tsx`, `lib/` (+ test) -- `swatchName`, `nearestSwatchName`, the color-line and pressed-value helpers as pure functions in `lib/spineColor.ts`, unit-tested.
- [x] `frontend/src/components/SpinePopover.tsx` (+ CSS), `pages/Bookcase.tsx` (+ CSS) -- the popover, positioning, open and close.
- [x] `frontend/src/pages/BookDetailPage.tsx` (+ CSS) -- the Change color block.
- [x] `frontend/e2e/spine-popover.spec.ts` -- un-skip AC-1…AC-5. Add the checklist follow-ups: pointer centring and right-edge shift; no subtitle or year; From cover with a cover; re-pick sends nothing; outside click on Search titles keeps focus there; "Color: *Nearest*, from cover"; failure on Book detail; axe AA on the open popover in both themes.
- [x] `_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md` -- tick the implementation checklist and link this spec.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 6 Story 1.14 scaffolds active, every earlier test passing, and the coverage gates met.
- Given a 1024px viewport, when any spine's popover opens, then it is fully inside the viewport and its pointer points at that spine.

### Review Findings

Code review 2026-11-02 (blind hunter, edge-case hunter, verification gap, acceptance auditor) of `e1d19c2..0a64687`.

- [x] [Review][Patch] The open popover stays pinned on screen after its spine scrolls out of view. Decided (2026-11-02): the card scrolls away with its spine. Clamp `top` to the 16px margins only while the spine is at least partly in the viewport, and add a unit test for an off-screen spine. [frontend/src/lib/spineColor.ts:139]
- [x] [Review][Patch] Repositioning on viewport resize and on the popover's own size change is untested (V3 is only partly closed). Add a P2 test: open Dune's popover, call `setViewportSize`, then re-check the geometry. In the AC-5 failure follow-up, also check the card's bottom is still at or above the spine's top once the failure line shows. [frontend/e2e/spine-popover.spec.ts:649]
- [x] [Review][Patch] The E3 fix (`label` in `FOCUSABLE`) has no test. The outside-click test clicks the searchbox `<input>`, so removing `label` passes. Add a step: with the popover open, click the "Search titles" label text, then expect no dialog and the searchbox focused. [frontend/e2e/spine-popover.spec.ts:509]
- [x] [Review][Patch] The e2e geometry checks allow 0px from the viewport edges, not the spec's 16px. Vertically in the AC-1 follow-up; vertically and horizontally in the scroll follow-up. [frontend/e2e/spine-popover.spec.ts:401]
- [x] [Review][Patch] The ticked AC-4 (API) checklist line still says "decide" in two places. The spec decided both: stored as sent, and a repeat pick commits. [_bmad-output/test-artifacts/atdd-checklist-1-14-change-a-book-s-color-from-the-shelf.md:163]
- [x] [Review][Patch] The "AC-1 (deferred): the same checks on Home's slice" follow-up is only an unticked checklist line, with no `deferred-work.md` entry. [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] Found while verifying the patches: the AC-2 test's Tab loop (it pressed Tab while the card was visible) was flaky, 6 of 15 runs before this review's changes, because an extra Tab during the close moved focus off the spine. It now tabs until × has focus, then once more: 20 of 20 pass. [frontend/e2e/spine-popover.spec.ts:183]

Rejected:
- Spec `status: done` vs sprint `review`; the Code Map's `api/announce.ts` path; the placement change recorded in the Implementation Notes rather than the Change Log. All three fixes would edit the spec under review; the status is synced by this review.
- 422 message "…or empty." on `set-spine-color`, which refuses `""`: low. The spec's Decision says to reuse `SPINE_COLOR_MESSAGE`, so changing the message means editing the spec.
- The clamp pushing the card over its spine, and the pointer then pointing wrong: low. This needs a viewport where neither side fits, which is the already-rejected E10.
- No test for B9 (`awaiting` cleared at the start of `pick`): low. A one-line guard, and the same-root V2 in-flight test already covers the pick path.
- A search hiding the open spine leaves focus unchecked: low and hard to reach. Typing in Search titles first closes the popover through the outside press.
- Status words inlined in `SpinePopover.tsx`, and `pagesLine` in the component: low. The extraction adds surface and no caller diverges today.
- `attachCover`/`COVER_PNG` copied into `spine-popover.spec.ts`: low. A test-helper refactor with no wrong outcome now.
- WebKit "press inside" branch untested: already deferred (V4).
- The backend loop never checks the resolved color: false. `test_ac6_p0_…` asserts the resolved `spineColor` after TEAL, `None` (back to from-cover) and the curated fallback.
- OpenAPI `intent?` optional: low. It predates this story and is shared by all four intent routes; a missing part still gets 422.
- axe skips Book detail's Change color: false. `book-detail.spec.ts:562` runs axe on the whole Book detail page in both themes, and the block is rendered there.
- The popover's Change color `h3` has no labelled group: false. The heading names the block for heading navigation; no harm named.
- Book detail derives `finished` on the client: low. This is B3, already rejected; it matches `Reading.finished` (`finish_date is not None`) exactly.
- The color line is in the right column, not the left (DESIGN.md): low. The spec's Code Map puts it in `ChangeColor`, so the fix edits the spec.
- `FOCUSABLE` matches disabled controls and labels with no control: low. The Bookcase page has neither near the shelf, and the fix adds a branch.
- `epic-1-context.md` edits bundled into the diff: false. This is B14.
- The spine moves with no scroll, resize or size change: low and unproven. A color pick doesn't change layout, and a delete or search closes the popover.
- Popover unmounted while a pick is in flight, so the result is never announced: low. The user closed it, and with no optimistic update the spine shows the true color.
- Intent ok but the refetch fails, so nothing is announced: low. On localhost the refetch fails only if the server dies after the commit; the fix adds a fallback branch.
- A From cover pick after the cover was removed in another tab, so the success is not announced: low. It needs a second tab; the color is still right.

## Implementation Notes

- **Room above ends at the shelf.** `placePopover` (`lib/spineColor.ts`) puts the popover above only when it fits both 16px below the viewport top and below the shelf's top edge (the `<ul>`). Without that, a top-row spine with page space above got its popover over the "Bookcase" heading, which AC-2's outside-click branch clicks, and AC-1/DESIGN.md name the top row as the flip case.
- **`swatchName` lives in `lib/spineColor.ts`** with the name/hex table (`SWATCH_COLORS`); `SwatchRow` builds its swatches from it. Exporting a function from the `.tsx` would trip oxlint's `only-export-components`.
- **Pressing the open spine closes it.** The Bookcase's outside-`pointerdown` handler closes the popover on a press of its own spine, and the click that follows is ignored so it doesn't reopen.
- **Outside click.** "Focusable control" means a tabbable element: `main` and the page `h1` (`tabindex="-1"`) don't count, so a click there returns focus to the spine.
- **Focus leaving with no `relatedTarget`** (Tab past the end of the page, or a browser that doesn't focus a pressed button) is checked after a tick. A press inside the popover refocuses the popover root instead of closing it.
- **The announcement waits for the view.** "Color set to *Name*." is set once the refetched view shows the picked value as pressed, named from the new resolved `spineColor`. This also covers From cover on a black-and-white cover, where the color is the curated one.
- **Story 1.10's `bookcase-details.spec.ts` AC-7** ("Enter and Space on a spine do nothing yet") now asserts that they open the popover and that Esc returns focus to the spine.
- `test_edit_book.py`'s book-view snapshot gains `spineColor`; `test_contract.py` documents the new route's envelope statuses and that it has no 413.

## Spec Change Log

## Review Triage Log

Iteration 0 (blind hunter, edge-case hunter, verification gap):

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| V1 | Book detail's Change color block never tested on a Book with a cover | medium | patch | Pre-verified: every Book detail visit seeds cover-less Books; breaking `hasCover` in `BookDetailPage.tsx` fails nothing. |
| V2 | The in-flight pick guard is untested | low | patch | Pre-verified: every pick waits for its outcome before the next; deleting the guard fails nothing. Same root as B1. |
| V3 | Repositioning on scroll / resize / size change is untested | medium | patch | Pre-verified: all geometry assertions run right after opening; removing the listeners fails nothing. |
| V4 | Safari "press inside" focus branch never runs (Chromium-only project) | maybe-false (medium if true) | defer | Pre-verified gap; settling it needs a WebKit Playwright project, a repo-wide CI decision. |
| B1 | Checklist says rapid picks "send in order, last wins"; code drops a pick while one is in flight | low | patch | Verified `ChangeColor.tsx` `pick`: returns early on `inFlight`; the Code Map asks for that guard, so the ticked checklist line is wrong. Correct the line; V2's test pins the rule. |
| B2 | A Book without a cover can't go back to its curated color from the UI | false | reject | By design: epics and EXPERIENCE say "From cover" only when a cover exists, and "No cover means no From cover option". |
| B3 | Book detail computes `finished` on the client | low | reject | Matches `_finished` in `views/shelf.py` today; the fix adds a view field (public surface), and no current reading state makes them diverge. |
| B4 | Checklist follow-ups ticked with no test (reduced-motion fade, long title wrap, B&W cover dot, unread outline after pick, Home slice) | low | patch | Verified: no assertion covers them, and the Home slice is explicitly later. A direct correction of the checklist. |
| B5 | Popover `onBlur` may refocus the spine after an outside click on a control | maybe-false (low if true) | reject | The document `pointerdown` close is a discrete update flushed before mousedown moves focus, and the Search-titles e2e passes; it could only be low. |
| B6 | `pressing` stays true after a press dragged out of the popover | low | reject | Needs a drag-out followed by a focus loss with no target; rare, and the fix adds a document listener. Same as E1. |
| B7 | Popover heading order h1 → h3 | false | reject | `Bookcase.tsx:215` renders an `h2` for the bookcase, so the order is h1 → h2 → h3. |
| B8 | No narrow-screen layout | false | reject | 1024px is the minimum width; narrower windows scroll by requirement. |
| B9 | A success announcement whose refetch never shows the pick can fire late | low | patch | Verified: `awaiting` is cleared only on a match, never at the next pick; clearing it at the start of `pick` is a direct correction. Same as E5. |
| B10 | Spec `in-review` vs sprint `in-progress` | false | reject | Sprint status is synced in step 5. |
| B11 | `test_contract.py` selects routes by slice index | low | patch | Verified: `operations[:3] + operations[5:]`; the next route added changes the checked set silently. Naming the routes is direct. |
| B12 | Right/middle click and touch close the popover | low | reject | An outside press closing it is the specified behaviour; desktop-only app. Same as E2. |
| B13 | 409 `book_not_found` on a pick is untested in the UI | low | reject | Needs a delete in another tab without a refetch; the failure line path is shared with `couldnt_save`, which is tested. |
| B14 | `epic-1-context.md` change bundled into the diff | false | reject | It is the workflow's recompiled context file, not a planning doc; it will be committed separately. |
| B15 | AC-7 title says "never a modal" with no check | low | patch | Verified `bookcase-details.spec.ts`: no `aria-modal` assertion; adding one is direct. |
| E1 | = B6 | low | reject | See B6. |
| E2 | = B12 | low | reject | See B12. |
| E3 | An outside click on a `<label>` (Search titles has one) is not a control, so focus is pulled to the spine | medium | patch | Verified `SearchTitles.tsx:25` renders a visible `<label htmlFor>`; `FOCUSABLE` has no `label`, so the timeout steals focus from the field, against the spec's outside-click Decision. Add `label` to the selector. |
| E4 | A press on the open spine dragged off leaves `closedByPress`, ignoring Enter for 1s | low | reject | Rare gesture; the fix adds pointerup handling. |
| E5 | = B9 | low | patch | See B9. |
| E6 | Close and reopen during an in-flight pick allows two requests | low | reject | Needs a reopen within one request's time; the fix moves the guard out of the component. |
| E7 | No vertical clamp: a popover too tall for both sides goes off-screen | low | patch | Verified `placePopover`: only `left` is clamped, against the spec's "Clamped to 16px from each viewport edge". A one-line clamp of `top`. Same root as E9. |
| E8 | `anchor()` null on first layout leaves an invisible popover | false | reject | `openId` is only set from a spine's own click, so its button ref exists; a hidden spine closes the popover first. |
| E9 | = E7 | low | patch | See E7. |
| E10 | With no room on either side, a top-row popover goes above the shelf | low | reject | Only on very short viewports; the E7 clamp keeps it on-screen. |
| E11 | = E3 | medium | patch | See E3. |
| E12 | The pointer is clamped 20px inside the corners, so it misses a spine at the very edge | false | reject | At the 1024px minimum the first spine's centre is more than 36px in; the AC-1 follow-up asserts within 1px for the first and the right-edge spines and passes. |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_set_spine_color.py tests/test_views.py tests/test_contract.py` -- expected: all pass, none skipped.
- `npm --prefix frontend run check:api` -- expected: no diff afterwards; `tsc -b`, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/spine-popover.spec.ts e2e/bookcase.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
