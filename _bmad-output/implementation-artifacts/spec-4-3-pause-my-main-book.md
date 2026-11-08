---
title: 'Story 4.3: Pause my Main book'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_commit: '70e3e71c73117c88921cab1ce7889e4ed52cf146'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      The "⋯" menu may close before a mouse click on an item lands in Safari and Firefox on macOS.
    evidence: |-
      MoreActionsMenu's onBlur closes the menu when relatedTarget is outside it. Where a mouse
      press doesn't focus the item button, relatedTarget is null, so the menu can unmount before
      `click` fires. The item buttons carry tabindex="-1", which WebKit may treat as mouse-focusable,
      so the claim is unverified: the e2e suite runs Chromium only. Settle it with a manual check, or
      a Playwright webkit/firefox run, of clicking Pause and Open book.
    location: >-
      frontend/src/components/MoreActionsMenu.tsx
    severity: high (unverified)
  - summary: >-
      No test covers a pause that fails after the page has unmounted (the late `alert` announcement).
    evidence: |-
      usePauseFlow announces a non-ok result when `mounted.current` is false, but no e2e test
      navigates away while a routed 503 is pending. The window is one local request; cover it with
      the app's other unmount-after-request cases.
    location: >-
      frontend/src/lib/usePauseFlow.tsx
    severity: low
  - summary: >-
      README's Status line still reads "with Story 4.1 done" and "26 of 41 stories done".
    evidence: |-
      This was already stale before this story, since 4.2 is done. The done count is updated when
      code review marks stories done.
    location: >-
      README.md:9
    severity: low
---

<intent-contract>

## Intent

**Problem:** The only way to stop reading the Main book is to start another one. A user who wants to step away entirely has no way to do it, and their place is only kept by accident (FR-6).

**Approach:** Add a `pause` intent. It keeps the page, sets `pausedAt` to today, clears `mainBookId` and makes the Book Up next, all in one commit, following 4.1's displacement rule. Offer **Pause** in a new "⋯" menu on the Main book card and on the Main book's Book detail. When an Up next already exists, a Confirm dialog states the displacement first.

## Boundaries & Constraints

**Always:**
- `pause` request: `{"bookId"}` in the `intent` form part. Refusals are checked inside the commit, in this order: 409 `book_not_found`, then 409 `not_main_book` (this includes the case where there is no Main book). In one commit: the Book's current Reading gets `pausedAt` = today (overwritten if it was already set) and nothing else of it changes; `mainBookId` = `null`; `upNextBookId` = the Book. A displaced Up next *Z* has only its pointer cleared and its Readings are not touched, so a paused *Z* shows in Waiting for you and any other *Z* is back in the catalog.
- `pausedAt` is never cleared. A resume (`start-reading`) and a finish keep it as it is.
- Standard intent ACs: a write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`; `check_invariants()` holds after every success; a refusal changes nothing.
- The Confirm dialog shows only when the fresh-enough home view has an Up next (it can't be the Main book). Heading: "Pause *X* at p.150 (58%)?", using the Main book's own `currentPage` and server `percent`. Line: "*Z* moves to Waiting for you." when `upNext.paused`, else "*Z* returns to the catalog.". Confirm label **Pause**. **Cancel** has the default focus. Cancel or Esc sends nothing.
- On success, after the refetched views have rendered, focus moves first and then `status` reads "Paused *X* at p.150. It's Up next." This happens on both paths, with or without the dialog. From Home, focus goes to the empty Main book card's **Resume**. From Book detail, it goes to that page's **Resume**.
- Couldn't save, or a refusal: in the dialog, it stays open and shows its `alert` line above the buttons. On the immediate path (no dialog), the `alert` line shows directly below **Pause** on Book detail, or below "⋯" on Home, with focus kept on that button, and nothing changes.
- "⋯" menu: a `button-secondary` 32×32 icon button at the right end of the "MAIN BOOK" eyebrow row, named "More actions", with `aria-haspopup="menu"` and `aria-expanded`. It opens a `role="menu"` list (also named "More actions") with the menuitems **Pause** and **Open book** (which goes to `/book/<id>`). Opening it focuses the first item. ArrowDown and ArrowUp move with wrap, and Home and End jump to the first and last item. Esc, or a press outside the menu, closes it and returns focus to "⋯". Tab closes it. Choosing an item closes the menu before anything else, so there is only ever one overlay level.
- Book detail: a secondary **Pause** button shows only for the Main book, placed before **Mark finished**.

**Never:** Set as Up next (4.4), non-Main finish (4.5), markers, spine names or role lines (4.6), Side reads (4.7), Add card note or See card notes on the card (Epic 5). No change to `start-reading`'s behaviour. No guilt cues. The paused-at date is never shown. No hand edits to `tokens.css` or `schema.d.ts`, and no spine edits (defer any drift).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No Up next | Main X at p.150, `upNextBookId: null` | X's Reading `pausedAt` = today, page kept; `mainBookId: null`; `upNextBookId` = X; no dialog | N/A |
| Paused Up next | Main X, Up next Z with a paused Reading | Confirm "… Z moves to Waiting for you."; on confirm Z is in `waiting`, X is Up next | Cancel/Esc: nothing sent |
| Unstarted Up next | Main X, Up next Z with no current Reading | Confirm "… Z returns to the catalog."; on confirm Z has no role | N/A |
| Re-pause | X already has `pausedAt` from an earlier pause | overwritten with today | N/A |
| Stale target | `pause` for a Book that isn't Main, or with no Main book | nothing changes | 409 `not_main_book` |
| Gone | `pause` for a deleted Book | nothing changes | 409 `book_not_found` |
| Fault | write, fsync or rename fails | file byte-identical | 503 `couldnt_save`; UI alert line |
| Resume then finish | paused X resumed, then finished | `pausedAt` keeps the last pause's date after each step | N/A |

</intent-contract>

## Code Map

- `backend/bookvie/intents/start_reading.py:51` `_pause_main`: move it to the new `intents/pause.py` as the public `pause_main(library, clock)`, and import it back here. Its behaviour doesn't change.
- `backend/bookvie/intents/pause.py` (new; the spine names `intents/pause`): `PauseIntent(book_id: str)` and `parse_pause_intent` (copy `delete_book`'s parse), plus `pause(store, clock, intent)`. Use `commit()`, `book_not_found()`, and `not_main_book()` from `contract.py:213`, which already exists. Update that docstring to say "`update-page` or `pause`". The module docstring follows the format of `start_reading.py`'s.
- `backend/bookvie/intents/__init__.py`: export `PauseIntent`, `parse_pause_intent` and `pause`.
- `backend/bookvie/http/api.py:441`: add `POST /intents/pause`, shaped like `delete_book_intent` but passing the clock.
- `backend/tests/helpers.py:47`: `PAUSE = "/api/intents/pause"`. `test_contract.py:339,366`: add pause to both operation lists. `test_intent_routes.py:33,107`: add `"pause": {"bookId": DUNE_ID}`, and have `_ready` start Dune for `pause`.
- `backend/tests/test_reading_state_machine.py`: add a `pause` rule. The expected refusal is `book_not_found`, else `not_main_book` when `book_id != main_book_id`. After an accepted pause: `self.up_next = book_id`, `main_book_id is None`, only the current Reading's `pausedAt` changes to today, and every other Book is unchanged. Update the docstring, and drop "pause" from "Later intents". The start and finish rules already assert that `pausedAt` is kept, through their whole-record equality.
- `backend/tests/builder.py`: `LibraryBuilder.book/reading/main/up_next` seed the states.
- `frontend/src/api/books.ts`: `pauseForm(bookId)` (the same shape as `deleteBookForm`), `pause(client, bookId)` through `sendIntent(client, 'pause', …)`, and `usePause()`. Export them from `api/index.ts`, and add a unit test in `books.test.ts`.
- `frontend/src/lib/pause.ts` (+ `pause.test.ts`, new): `pauseHeading(title, page, percent)` → "Pause X at p.150 (58%)?", `displacementLine(upNext)` → "Z moves to Waiting for you." / "Z returns to the catalog.", and `pausedStatus(title, page)` → "Paused X at p.150. It's Up next.".
- `frontend/src/lib/usePauseFlow.ts` (new): `usePauseFlow({ book: {id,title,currentPage,percent}, onPaused })`. It reads `useHomeView()` for `upNext`, and a press is ignored until the view is ready. `request()` either opens the Confirm dialog or sends at once. It has an in-flight guard, `busy`, a `failed` flag, and a `regionSlot` ref that adopts the live regions after an immediate-path failure (the pattern at `PageField.tsx:105-113`). It returns the `ConfirmDialog` element to render (`components/ConfirmDialog.tsx`, using `lines` and `showAlert`), with Cancel focusing the opener. On `ok` it calls `onPaused(title, page)`, and the caller then focuses and announces.
- `frontend/src/components/MoreActionsMenu.tsx` + `.module.css` (new): the menu button and the menu. Its items are `{label, onSelect}`, and it calls `onSelect` after the menu has closed. The outside-press logic follows `lib/useSpinePopover.ts`. Styles come from the key-home mockup (`.more`, `.menu` at `ux-designs/…/mockups/key-home.html:154,186`) and use tokens only.
- `frontend/src/components/MainBookCard.tsx`: put the eyebrow and the menu in one row, with the alert slot under it. New props: `onPause` (or pass a pause flow through), and `moreRef` for the opener focus.
- `frontend/src/pages/HomePage.tsx`: host `usePauseFlow` for the Main book. Its `onPaused` sets a pending pause record. An effect runs once the view has no Main book: it focuses `suggestButton` (**Resume**) and then announces. Update the docblock.
- `frontend/src/pages/BookDetailPage.tsx:191`: add a **Pause** button (`aria-disabled` while in flight, reason "Pausing the book.") before **Mark finished** when `book.role === 'main'`, with the slot below it. `onPaused` makes the page focus `startButton` once `primary === 'Resume'`, then announce. Update the docblock.
- `frontend/e2e/intents.ts`: `PAUSE`. Use `e2e/home.ts` and `library.ts` for the seeds. For the patterns to copy (routed 503, axe, the focus event), see `waiting-for-you.spec.ts` and `up-next.spec.ts`.
- Deferred-work intake: none names story 4.3.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/pause.py`, `start_reading.py`, `__init__.py`, `contract.py` docstring, `http/api.py`: add the intent and its route. Then run `npm --prefix frontend run api:gen`.
- [x] `backend/tests/test_pause.py` (new): every row of the matrix as API tests through `api_client`, plus 503 faults (write, fsync, rename; copy the fault helpers `test_start_reading.py` uses), `check_invariants` after each success, and an Epic 3 library (Main and a paused Book, `upNextBookId: null`).
- [x] `backend/tests/test_contract.py`, `test_intent_routes.py`, `helpers.py`, `test_reading_state_machine.py`: register pause and add the pause rule.
- [x] `frontend/src/api/books.ts` (+ test), `api/index.ts`, `lib/pause.ts` (+ test), `lib/usePauseFlow.ts`.
- [x] `frontend/src/components/MoreActionsMenu.tsx`, `.module.css`, `MainBookCard.tsx` (+ css): the menu and the card row.
- [x] `frontend/src/pages/HomePage.tsx`, `BookDetailPage.tsx`: wire Pause, focus and the announcement.
- [x] `frontend/e2e/pause.spec.ts` (new): the menu's keyboard, Esc, outside press and Open book; both paths from Home and from Book detail; Confirm with both displacement lines, Cancel and Esc sending nothing (focus back on "⋯" or **Pause**); the focus targets and the `status` line; a routed 503 on both paths, checking the alert line position, the focus kept and the library unchanged; the menu closing before the dialog opens; and axe on the open menu and the dialog in both themes.
- [x] `README.md`: the Status line gains Pause. Add the spec link after 4.2's.

**Acceptance Criteria:**
- Given the Main book card, when I press "⋯", then a menu with **Pause** and **Open book** opens with focus on **Pause**, the arrow keys move between them, and Esc or an outside click closes it, returning focus to "⋯".
- Given a Main book and no Up next, when I choose **Pause** from the menu or from Book detail, then it applies with no dialog, the Book is Up next, and `status` reads "Paused *X* at p.150. It's Up next." after focus lands on **Resume**.
- Given a Main book and an Up next *Z*, when I choose **Pause**, then the menu has closed and an `alertdialog` "Pause *X* at p.150 (58%)?" with the *Z* line and Cancel focused shows. Confirming applies it, and *Z* moves as stated. Cancel or Esc changes nothing.
- Given a server answering 503, when Pause is sent, then "Couldn't save. Your data wasn't changed." shows in the dialog above its buttons, or below **Pause** or "⋯" with focus kept there, and the library is unchanged.
- Given a paused Reading, when it is resumed and later finished, then `pausedAt` still equals its last pause date.

### Review Findings

Code review of 2026-11-08 (layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check).

- [x] [Review][Patch] Menu `onBlur` treats every focus move onto "⋯" as a pointer toggle: Shift+Tab from an item leaves the menu open (`aria-expanded="true"`) with focus on "⋯", where Esc does nothing; in a browser where a press doesn't focus the button (Safari/Firefox macOS), `relatedTarget` is null, so a press on "⋯" closes then reopens the menu, and a press on an item may unmount it before `click` (the deferred high-unverified item). Track a pointer press inside the menu or on "⋯" (set in the capture `pointerdown`), skip `onBlur` while it is set, and otherwise close on any focus move out, including onto "⋯" (acceptance-auditor+edge-case-hunter+blind-hunter) [frontend/src/components/MoreActionsMenu.tsx:104]
- [x] [Review][Patch] No test covers the EC1 fix that releases the live regions when the Book stops being Main after a failed immediate-path pause; reverting `holdsRegions` to `failed` passes every test while later `status` lines go to a detached slot. Add an e2e: 503 once, press Pause, unroute, finish the Book, assert the finish `status` line and that the regions are no longer inside `main` (verification-gap+blind-hunter) [frontend/e2e/pause.spec.ts]
- [x] [Review][Patch] AC5's test pauses, resumes and finishes all on `TODAY`, so it can't tell `pausedAt` kept from `pausedAt` overwritten with today; resume and finish on a later `FakeClock` date (acceptance-auditor) [backend/tests/test_pause.py:245]
- [x] [Review][Patch] A landed pause whose refetched view doesn't reach the expected state (another tab started a Book) leaves `pausedLine` pending, so a later unrelated finish or resume steals focus and announces a stale "Paused X" line; consume the line on the first render after `onPaused`, announcing only when the state matches (blind-hunter+edge-case-hunter) [frontend/src/pages/HomePage.tsx:196, frontend/src/pages/BookDetailPage.tsx:166]
- [x] [Review][Patch] Book detail renders **Pause** under `canFinish`, Mark finished's flag, which Story 4.5 widens to non-Main Books; give Pause its own `canPause = book.role === 'main'` (acceptance-auditor+blind-hunter) [frontend/src/pages/BookDetailPage.tsx:219]
- [x] [Review][Patch] The story's deferrals live only in the spec frontmatter; nothing reaches `deferred-work.md`, where the retro and the next-epic gate look (blind-hunter) [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] README's Status line, edited by this diff, still says "with Story 4.1 done" and "26 of 41 stories done" (acceptance-auditor+blind-hunter) [README.md:8]
- [x] [Review][Defer] Spine drift (AD-19): the spine describes only `start-reading`'s pause, not the standalone `pause` intent (clears `mainBookId`, makes the Book `upNextBookId`) [backend/bookvie/intents/pause.py] — deferred: spine drift, reconciled before the next epic
- [x] [Review][Defer] Spine drift (AD-7): the known-gap sentence names only the Start dialog; the Pause Confirm's displacement line, and whether it shows at all, also read the cached home view, as Design Notes accept [frontend/src/lib/usePauseFlow.tsx:114] — deferred: spine drift, reconciled before the next epic
- [x] [Review][Defer] Spine drift (Structural Seed, Capability → Architecture Map preface): the `intents/` module list omits `pause`, and the preface still gives `intents/pause` as not built yet [backend/bookvie/intents/pause.py] — deferred: spine drift, reconciled before the next epic

**Rejected:**
- `low`/spec edit: an outside press on another control keeps focus there, not on "⋯" as AC1 reads. The Design Notes chose it (as the spine popover does); the fix is a spec edit.
- spec edit: the Code Map and Tasks name `lib/usePauseFlow.ts` (the file is `.tsx`), and the Boundaries' outside-press rule has no exception.
- `false`: a successful pause after the page unmounts isn't announced. That is the app's convention (`PageField.tsx:133`, `EditPurpose.tsx:93` announce only failures); the success shows in the refetched views.
- `low`: a refetch that empties the card while the menu is open drops focus to body. Needs a cross-tab change mid-menu, and the fix is a new unmount guard.
- `low`: the double-click tests may pass for the wrong reason. `inFlight` is set synchronously on the first click, and the fetch and refetch can't finish between Playwright's back-to-back clicks.
- `low`: raw px in `MoreActionsMenu.module.css`. They're the mockup's values and match the codebase (`FinishDialog.module.css:167`, `MainBookCard.module.css:14`); no named harm.
- `low`: the "⋯" overhang of the title margin isn't visually checked. It's a residual the spec records, with no defect shown.
- `low`: axe doesn't run on Book detail's Pause or the visible couldn't-save lines. The spec scopes axe to the menu and the dialog, and the line reuses the existing alert styles.
- `low`: Book detail fetches the home view on every mount. It's one local request, and the fix adds an `enabled` parameter.
- `low`: the Pause item does nothing without `onPause`. Home, its only caller, always passes it.
- `false`: `pause_main` is a silent no-op without a current Reading. `pause` refuses `not_main_book` first, and the invariant `main_has_unfinished_reading` guarantees a current Reading.
- `false`: the spec's `status: done` vs sprint `review`. This review's status write sets both to the same value.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- verdicts: 35 findings — high 0, medium 3, low 21, false 10, maybe-false 1
- findings:
  - `[false]` `[reject]` IA: `pausedAt` survival test runs on one day — the state machine's `days_pass` rule plus whole-record equality in its start and finish rules would fail if either overwrote `pausedAt`.
  - `[low]` `[reject]` IA: no UI test drives a 409 refusal — rare (it needs a stale second tab), and it shares the alert path the routed-503 tests cover.
  - `[low]` `[reject]` IA: each displacement line is tested from one entry point only — one shared `usePauseFlow` produces both lines.
  - `[low]` `[patch]` IA: the README 4.3 link splits the 4.2 pair — moved after the 4.2 ATDD line.
  - `[false]` `[reject]` IA: sprint-status and spec status not updated — finalization and code review update them.
  - `[low]` `[patch]` BH: README link order (the stale done count is deferred) — link moved.
  - `[low]` `[patch]` BH: the docblocks cite `usePauseFlow.ts` — now `.tsx`.
  - `[false]` `[reject]` BH: regions adopted after a failure make later unrelated alerts show under "⋯" — `adoptRegions` stacks, so PageField and the dialogs adopt on top and their alerts land in their own slots; the next announce clears the old text. The detached-slot case is EC1.
  - `[maybe-false]` `[defer]` BH: menu item clicks may fail in Safari and Firefox (null relatedTarget on blur) — unverified because e2e runs Chromium only; deferred as high (unverified).
  - `[low]` `[reject]` BH: ArrowDown/ArrowUp on "⋯" and typeahead missing — the spec's menu behaviour doesn't call for them, and the menu has two items.
  - `[low]` `[reject]` BH: Home doesn't pass `busy` to the menu — a local request takes milliseconds, and the `inFlight` guard already drops a repeat press.
  - `[low]` `[reject]` BH: Pause is a no-op until the home view loads — the spec chose this, and Book detail fetches the home view on mount.
  - `[low]` `[reject]` BH: no UI test for a stale-tab refusal — same as the IA row above.
  - `[false]` `[reject]` BH: backend tests use only single-Reading Books — the state machine's seed (Emma finished, and re-reads) checks pause with whole-record equality across several Readings.
  - `[low]` `[reject]` BH: no tests for cover, spine color, catalog role or an extra intent field — whole-record equality covers the stored fields, and extra-field handling is the generic IntentModel's.
  - `[low]` `[reject]` BH: the alert-line CSS is duplicated on two pages — cosmetic; earlier panes copy CSS too (story 4.2).
  - `[false]` `[reject]` BH: Home's empty slot div sits in the flow — `.info` is neither flex nor grid, so an empty div adds no space.
  - `[false]` `[reject]` BH: `pause_main` is in the wrong module, and returns silently with no Reading — the spec put it in `intents/pause`, and the `main_has_unfinished_reading` invariant rules out the silent case.
  - `[low]` `[patch]` BH: `__all__` and import order slips — fixed; the route docstring citing only FR-6 is rejected, since other routes cite one FR each.
  - `[false]` `[reject]` BH: the uncleared setTimeout, and the double ring — `button.current?.focus()` does nothing once unmounted; the expanded outline is the mockup's `.more.open`.
  - `[low]` `[reject]` BH: only the client enforces Confirm — the spec's Design Notes record this as an accepted known gap.
  - `[medium]` `[patch]` VG: no test that a double press sends one pause — added double-click tests on Book detail's immediate path and on the dialog's confirm.
  - `[low]` `[patch]` VG: no test for an outside press on a control — added a step: clicking the page field keeps focus there.
  - `[low]` `[defer]` VG: no test for a failure after unmount — deferred, as the layer filed it.
  - `[low]` `[patch]` VG: `__all__` order — the same fix as the BH ordering row.
  - `[medium]` `[patch]` EC1: when the slot unmounts while `failed` stays true, the regions stay in a detached div and later announcements are lost — the layout effect is now keyed on `failed && book !== null`, so the regions are released when the Book stops being Main.
  - `[false]` `[reject]` EC2: unrelated alerts render under "⋯" — same refutation as the BH regions row.
  - `[medium]` `[patch]` EC3: pressing "⋯" while the menu is open reopens it (blur closes it, then the click toggles) — `onBlur` ignores a move to "⋯"; an e2e step was added.
  - `[low]` `[reject]` EC4: no feedback when the home view fails — rare, and the spec chose to ignore the press.
  - `[low]` `[reject]` EC5: focus falls to body after a refusal removes the opener — only reachable with a stale second tab, and fixing it adds a fallback branch.
  - `[low]` `[reject]` EC6: the dialog's displacement line is a snapshot — only reachable from another tab, which AD-4's last-write-wins accepts, and the server still applies FR-7.
  - `[low]` `[reject]` EC7: no busy indicator on Home — same as the BH busy row.
  - `[false]` `[reject]` EC8: the card shows a dead Pause item without `onPause` — HomePage, the only caller, always passes it.
  - `[false]` `[reject]` EC9: an outside press on a control keeps focus — the spec's Design Notes choose this.
  - `[low]` `[patch]` EC10: README link order — the same fix as the IA row.

## Auto Run Result

Status: done

**Summary:** Story 4.3 adds the `pause` intent. In one commit it keeps the page, sets `pausedAt` to today, clears `mainBookId` and makes the Book Up next, with refusals `book_not_found` and then `not_main_book`. The Main book card gets a "⋯" More actions menu (Pause, Open book), and Book detail gets a Pause button for the Main book. When an Up next exists, a Confirm dialog states the displacement first. After a pause, focus lands on Resume and then `status` reads "Paused *X* at p.N. It's Up next."

**Files changed:**
- `backend/bookvie/intents/pause.py`: new intent; `pause_main` moved here from `start_reading.py`.
- `backend/bookvie/intents/start_reading.py`, `__init__.py`, `contract.py`, `http/api.py`: import, exports, docstring and the route.
- `backend/tests/test_pause.py` (new), `test_reading_state_machine.py` (pause rule), `test_contract.py`, `test_intent_routes.py`, `helpers.py`.
- `frontend/src/api/books.ts` (+ test), `api/index.ts`, `api/generated/schema.d.ts` (regenerated).
- `frontend/src/lib/pause.ts` (+ test): the copy. `lib/usePauseFlow.tsx`: the flow. `lib/useSpinePopover.ts`: exports `FOCUSABLE`.
- `frontend/src/components/MoreActionsMenu.tsx` + css (new), `MainBookCard.tsx` + css.
- `frontend/src/pages/HomePage.tsx`, `BookDetailPage.tsx` + css.
- `frontend/e2e/pause.spec.ts` (new, 13 tests), `e2e/intents.ts`. `README.md`.

**Review:**
- 35 findings. Patched: 3 medium (EC1 region release, EC3 "⋯" toggle, VG double press) and 7 low (merged into four fixes: link order, docblock names, ordering, the control outside-press test).
- Deferred: 3. A Safari/Firefox menu click (high, unverified), a failure after unmount (low), and README's stale done count (low).
- Rejected: everything else, with the reasons in the triage log above.

**Follow-up review recommended:** true. Three medium findings were patched (0 high). The named unverified risk is the menu's blur-close behaviour in non-Chromium browsers, and the region-release fix after a refusal refetch, which no test exercises.

**Verification:** `TZ=Europe/Madrid npm run check` exited 0 both before and after the patches. Ruff and format are clean. pytest: 1079 passed. Coverage: domain 100%, intents+store 97.78%. Prettier, oxlint and tsc are clean, the node unit tests pass, e2e is 335 passed (13 of them in `pause.spec.ts`), and the smoke test is ok.

**Residual risks:**
- The "⋯" button's wrapper has zero height, so the button overhangs the title margin by about 8px; it was not visually checked.
- Menu items have no hover style, because the copy guard forbids hover-only styles.
- Book detail reads a possibly stale home view to decide whether to show Confirm.

## Design Notes

- **Announcing on both paths:** EXPERIENCE.md ties the line to the no-dialog case, but the epic's rule is that every success is announced in `status`. Announcing after the Confirm path too keeps one outcome per action. The dialog already said what would happen, and the line confirms that it did.
- **Up next source:** the flow reads the home view. Home has it live. Book detail's `useHomeView()` refetches on mount (staleTime 0) and on focus. The gap is the same as the Start dialog's: another tab can set an Up next between the refetch and the press. The server still applies FR-7 correctly; only the Confirm step is skipped.
- **Outside press:** it returns focus to "⋯", except when the press lands on another control, which then keeps the focus (`FOCUSABLE` in `useSpinePopover.ts`). This matches the spine popover.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest`: all tests pass, including `test_pause.py` and the state machine.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/pause.spec.ts e2e/home.spec.ts e2e/up-next.spec.ts e2e/waiting-for-you.spec.ts e2e/book-detail.spec.ts e2e/finish-reading.spec.ts e2e/start-reading.spec.ts`: all pass.
- `npm run check`: clean (formatters, oxlint, tsc, `schema.d.ts` in sync, coverage gates).
