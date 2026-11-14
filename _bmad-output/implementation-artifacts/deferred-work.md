- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-and-install-bookvie.md`
  summary: Add an automated build → install → `GET /` smoke check proving Vite `outDir`, `STATIC_DIR` and the wheel `artifacts` rule name the same folder.
  evidence: Changing `outDir` or `artifacts` leaves every pytest test green; only the manual curl step in Story 1.1 Verification catches it. Belongs with the Story 1.3 smoke test.
  resolved: Story 1.3, `scripts/smoke.mjs` (`npm run check:smoke`).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md`
  summary: Before `GET /api/export` (Epic 2) ships, reject cross-site simple GETs (e.g. `Sec-Fetch-Site: cross-site`) or make sure no GET route has side effects such as recording "Last export".
  evidence: The Host/Origin guard passes a cross-site `<img>`/no-cors GET because it sends `Host: 127.0.0.1:<port>` and no Origin. The page can't read the response, but a full export download would record "Last export".
  resolved: `spec-refuse-cross-site-simple-gets.md`; `HostOriginGuard` refuses any `Sec-Fetch-Site` other than `same-origin`/`none` on `/api` and `/media` (AD-16). A browser that sends no `Sec-Fetch-Site` still passes; see the story 2.1 entry below.

## Deferred from: code review of spec-1-2-run-one-safe-instance (2026-10-29)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md`
  summary: Verify the Vite proxy end to end: a request through `npm run dev` with `changeOrigin: true` must pass the Host/Origin guard. Today `test_packaging.py` only regex-matches `frontend/vite.config.ts`.
  evidence: If Vite ignored or misplaced the option, every proxied dev request would get 403 and pytest would stay green. Belongs with the Story 1.3 e2e harness.
  resolved: Story 1.3, `frontend/e2e/dev-proxy.spec.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Inject time (AD-20, TR2): a `Clock` protocol in `domain/clock.py` with system and fake-today implementations, `--fake-today YYYY-MM-DD` accepted only with `--no-browser`, `TZ=Europe/Madrid` pinned for `check:py` and `check:e2e`, the Playwright fixture setting `timezoneId` and `page.clock` to the fake day, DST tests on the last Sundays of March and October, and a test that `domain/` reads the clock only through `Clock`.
  evidence: Split from Story 1.4 at planning (spec ~2,650 tokens vs the 1,600 target). It is the one part of the story independent of the store; Story 1.4's last acceptance-criteria block stays open until it lands, and it must ship before any intent that reads "today" (Story 1.7's Finished on).
  resolved: partly, Story 1.7 (server Clock, --fake-today, TZ pin) and Story 1.8 (`TZ=Europe/Madrid` on `check:e2e`, Playwright `use.timezoneId: 'Europe/Madrid'`); the `page.clock` + `--fake-today` wiring in the e2e fixture remains until a test needs it.

## Deferred from: build review of spec-1-4-keep-the-library-in-one-safe-file (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Add uniqueness invariants to AD-18 and `check_invariants()`: unique Book IDs, unique Reading and Card note IDs within a Book, no repeated ID in `sideReadBookIds`, and the Up next book not also a Side read.
  evidence: `check_invariants` builds a set of Book IDs, so duplicates pass, and `sideReadBookIds: ["a","a"]` counts as two Side reads. AD-18's rule list doesn't name these rules. Needed before Story 1.7 creates IDs.
  resolved: Story 1.7 (unique Book IDs; unique Reading and Card note IDs within a Book) and spec-unique-side-reads-and-directory-fsync (2026-11-01), rule `unique_side_reads` (no repeated ID in `sideReadBookIds`). Rejected: "the Up next book not also a Side read". Epic 4 and EXPERIENCE.md allow a Side read to be Up next too ("a Side read stays in On the side as well").
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-keep-the-library-in-one-safe-file.md`
  summary: Decide whether commits on macOS need `fcntl(F_FULLFSYNC)` instead of `os.fsync`.
  evidence: Unverified, medium if true. `os.fsync` on darwin doesn't flush the drive's write cache. Settled by whether APFS can leave `library.json` empty or torn after a power cut when write → fsync → rename was done (SQLite uses `F_FULLFSYNC` for this reason).
  resolved: spec-router-error-screen-and-full-fsync (2026-10-30), `OsFileSystem.fsync` uses `F_FULLFSYNC` with an `os.fsync` fallback.

## Deferred from: test framework validation (2026-10-30)

- source_spec: `_bmad-output/test-artifacts/framework-validation-report-bookvie-test-framework-20261030T113141629Z.md`
  summary: Move the FastAPI/Starlette test client from `httpx` to `httpx2`, or filter the warning on purpose in `[tool.pytest.ini_options]`.
  evidence: Every `uv run pytest` prints `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` from `fastapi/testclient.py`. `httpx` is a Spine Stack row checked by `test_stack_pins.py`, so the switch needs a Spine change too.

## Deferred from: build review of spec-1-5-speak-one-api-contract (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-speak-one-api-contract.md`
  summary: Cover `useHomeView`/`useCatalogView` with a test that each hook queries `['view', <its noun>]` and fetches `/api/views/<its noun>`.
  evidence: No test calls either hook, and `HomeView`/`CatalogView` are structurally identical, so swapping them passes `tsc` and every test. No page uses them yet; Story 1.6 (first consumer) should pin it with its page or e2e test.
  resolved: Story 1.6 (catalog-empty.spec.ts AC-6 pins GET /api/views/catalog) and Story 3.1 (`e2e/home.spec.ts` intercepts `**/api/views/home` and asserts Home-only fields through `useHomeView`, HomePage being its first consumer, and `HomeView` now differs from `CatalogView` by `mainBook` and `lastExportAt`).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-open-bookvie-to-an-empty-shelf.md`
  summary: Give the router a generic error element so a render crash isn't shown as "Page not found".
  evidence: The layout route's `errorElement` in `frontend/src/main.tsx` renders `NotFoundPage` for any thrown error, including an exception inside `CatalogPage`; the pre-1.6 router did the same on `/`. Distinguish `isRouteErrorResponse` 404s from other errors.
  resolved: spec-router-error-screen-and-full-fsync (2026-10-30), `RouteErrorPage` in `frontend/src/pages/ErrorPage.tsx`.

## Deferred from: code review of spec-1-6-open-bookvie-to-an-empty-shelf (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-open-bookvie-to-an-empty-shelf.md`
  summary: Extends the generic-error-element item above. If `AppShell` (or `ThemeToggle`) itself throws, the layout's `errorElement` renders `AppShell` again, so the router falls back to its default error screen. The fix should add a root-level error element that does not render the shell.
  evidence: `frontend/src/main.tsx:23-27` wraps `NotFoundPage` in `<AppShell>` as the layout route's own `errorElement`.
  resolved: spec-router-error-screen-and-full-fsync (2026-10-30), root route's `BareErrorPage`.

## Deferred from: code review of spec-1-7-accept-a-new-book-only-when-it-is-complete (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-accept-a-new-book-only-when-it-is-complete.md`
  summary: The ATDD checklist's green-phase follow-up — a Hypothesis property test that any accepted add-book leaves a library `check_invariants()` accepts and that round-trips through `serialize` — was not added. Not a spec task; pick up with `bmad-testarch-automate`.
  evidence: no such test in `backend/tests/test_add_book.py`; listed in `_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md`.
  note: partly done by Epic 4 retro item 36 (`a773997`): the `add` rule in `backend/tests/test_reading_state_machine.py` checks `check_invariants()` and the on-disk round trip after every accepted add-book, but it varies only Pages and Finished on; fuzzing the other fields (ISBN, tags, spine color, year, subtitle) remains.

## Deferred from: build review of spec-1-8-add-a-book-with-the-new-book-panel (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-add-a-book-with-the-new-book-panel.md`
  summary: Check with NVDA and VoiceOver that the live regions still announce after they move into the open New book panel and back (medium, unverified).
  evidence: The regions' host node is reparented on open and close; some screen reader and browser pairs stop tracking a moved live region. The e2e test checks only where the regions sit in the DOM.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-add-a-book-with-the-new-book-panel.md`
  summary: Add a timed e2e test that a pending "N books match." count is cancelled when the panel opens and when a book is added.
  evidence: `cancelCount()` in `CatalogPage` `openPanel`/`onAdded` has no reliable test; AC-5 starts recording after the 500 ms timer may already have fired.

## Deferred from: build review of spec-1-9-get-warned-about-duplicates (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md`
  summary: Story 1.9 green-phase follow-up tests are missing — axe in both themes with the Duplicate dialog open, Add anyway double-press guard, editing the ISBN after Don't add then saving, 10 matches, a Book matching both rules listed once, stored authors repeating a name, and the dialog's Tab/Shift+Tab trap.
  evidence: The behaviour is implemented (inFlight guard, find_duplicates list comprehension, keepFocusInside) but the ATDD checklist follow-up lines remain unticked and no test exercises these cases.
  resolved: bmad-testarch-automate for Story 1.9 (2026-10-30); see `_bmad-output/test-artifacts/automation-summary.md`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md`
  summary: No concurrency test proves two simultaneous identical add-book requests yield exactly one 200 and one 409.
  evidence: The duplicate check sits inside `change()` under the store lock deliberately (add_book.py), but every duplicate test is sequential, so moving the check before `commit` would pass the suite; a barrier test like test_store.py's test_concurrent_apply_loses_nothing would pin it.
  resolved: bmad-testarch-automate for Story 1.9 (2026-10-30), `test_two_simultaneous_identical_adds_save_one_book_and_refuse_the_other`.

## Deferred from: review of spec-router-error-screen-and-full-fsync (2026-10-30)

- source_spec: `_bmad-output/implementation-artifacts/spec-router-error-screen-and-full-fsync.md`
  summary: Fsync the data directory after the commit's rename, so an acknowledged commit survives a power cut (add a directory-fsync step to the `FileSystem` protocol).
  evidence: `Store._write_atomic` (`backend/bookvie/store/store.py`) does write → fsync → close → replace and never fsyncs the directory, so after a power cut the rename may be lost and the old `library.json` returns. Existed before this change; AD-2 names only temp-file fsync + rename.
  resolved: spec-unique-side-reads-and-directory-fsync (2026-11-01), `FileSystem.fsync_dir` runs after the rename in `Store._write_atomic` (a failure is logged; the rename is the commit); AD-2 updated.

## Deferred from: code review of spec-1-10-see-the-library-as-a-bookcase (2026-10-30)

- Exact 168px spine height pinned in `frontend/e2e/bookcase.spec.ts` (AC-3 scaffold line 215 and the hidden-then-shown test) was measured with macOS system fonts; on the `ubuntu-latest` CI runner the `system-ui` stack falls back to another font and the label's length may cross an 8px step. Unverified (medium if true); the first CI run after pushing story 1.10 settles it. **Closed 2026-11-01**: the `ubuntu-latest` Test workflow has been green on every run since Story 1.10, including run 41293213733 on 2026-11-01.

## Deferred from: bmad-testarch-automate for Story 1.10 (2026-10-31)

- The unread spine's 1.5px outline (DESIGN.md → Spine) renders as 1px in Chromium. In Playwright 1.64's Chromium, `getComputedStyle` gives `1px` for a `1.5px` border at `deviceScaleFactor: 2` as well as 1, and a plain `div` behaves the same, so this is the browser, not `Bookcase.module.css`. The ATDD note assumed DPR 2 would keep 1.5px; it doesn't. The unread outline still differs from the read edge in color, and AC-3 and AC-11 pass. Decide whether 1px is acceptable (update DESIGN.md) or the outline needs another technique (for example a 2px border or an inset box-shadow). No test pins the width until then.

## Deferred from: code review of spec-1-11-open-and-edit-a-book.md (2026-10-31)

- The edit-mode Tags suggestions wiring is untested. `BookDetailPage.tsx` passes `useCatalogView().tags` to the Edit book panel, but none of the `book-detail.spec.ts` tests types into Tags or checks the listbox, so dropping the catalog query would go unnoticed. Suggestion logic itself is covered by New book (`new-book-panel.spec.ts` AC-3). Close it by extending the AC-2 e2e with a Tags typing check. **Closed 2026-10-31** by `book-detail.spec.ts` "[P2] AC-2 Tags suggests existing tags in edit mode and the picked tag is saved" (testarch-automate).

## Deferred from: build review of spec-1-13-add-a-cover.md (2026-10-31)

- Check whether a cover over 20 MiB shows "Cover must be 20 MB or smaller." on Cover in a real browser, rather than "Couldn't save" from a connection reset. Unverified; medium if true. `CoverSizeCap` answers 413 before reading the body, then uvicorn closes the connection with unread data, which Chromium can surface as a reset before it reads the response. Only ASGI-level and TestClient tests cover the 413. The real client always sends `Content-Length`, so for it only the header branch runs. Settle it with a Playwright upload of a file over 20 MiB against the built bookvie. **Closed 2026-11-01**: it doesn't reproduce. `cover.spec.ts` "[P1] AC-2 a cover over 20 MB shows "Cover must be 20 MB or smaller." on Cover in a real browser" uploads 21 MiB (refused on the header) and 20 MiB + 1 byte (refused on the part). Chromium reads both 413s, and the panel shows the Cover error (testarch-automate).

## Deferred from: review of spec-unique-side-reads-and-directory-fsync (2026-11-01)

- source_spec: `_bmad-output/implementation-artifacts/spec-unique-side-reads-and-directory-fsync.md`
  summary: Fsync the parent folder after creating `data_dir`, `covers/` and `.staging/`, so a fresh setup's first commit survives a power cut.
  evidence: `Store.open` (`backend/bookvie/store/store.py` lines 91 and 164) calls `mkdir` without flushing the parent. A rename inside `covers/` can be durable while `covers/` itself is not. This existed before the change.
  resolved: `spec-fsync-parent-after-mkdir.md`; `ensure_writable` and `Store.open` fsync the data folder's parent and the data folder on every start (and the parent of any ancestor they create).

## Deferred from: build review of spec-1-14-change-a-book-s-color-from-the-shelf.md (2026-11-01)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-14-change-a-book-s-color-from-the-shelf.md`
  summary: Verify the Spine popover's "press inside" focus branch (`SpinePopover.tsx` `blur`, the `pressing` check) in a browser that doesn't focus a pressed button (WebKit/Safari).
  evidence: Unverified; medium if true. `playwright.config.ts` defines only a Chromium project, and Chromium focuses a clicked button, so `relatedTarget` is inside the card and the branch never runs. Without it, a swatch click in Safari would close the popover before the pick lands. Settle it by adding a WebKit project (a repo-wide CI decision), or with a test that sends `focusout` with no related target while a press is active.
  resolved: moot, Epic 7 retro item 59 (`e5cc01c`): `AGENTS.md` → Supported browser makes bookvie Chrome-only and puts a Safari click that doesn't focus the pressed button out of scope, so the `pressing` branch needs no WebKit check.

## Deferred from: code review of spec-1-14-change-a-book-s-color-from-the-shelf.md (2026-11-02)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-14-change-a-book-s-color-from-the-shelf.md`
  summary: Run the Spine popover's AC-1 checks (inside the viewport, at most 992px wide, pointer at the spine, shifted inward at the edges) on Home's bookcase slice.
  evidence: Home's bookcase is still a placeholder until Stories 3.1/3.5, so `e2e/spine-popover.spec.ts` opens spines on Catalog (`/`) only. The checklist line "AC-1 (deferred): the same checks on Home's slice" is unticked. Close it when Story 3.1 or 3.5 renders the slice, by running the same geometry checks there.
  note: partly done by Story 3.5: `frontend/e2e/home-slice.spec.ts` opens a slice popover, closes it with Esc and follows its spine on resize; the AC-1 geometry checks (inside the viewport, at most 992px, pointer at the spine, inward shift) on Home's slice remain.

- source_spec: none
  summary: Fsync the parent folder after `mkdir` of the data folder, `covers/` and `.staging/` (Epic 1 retro action item 3, part b; same as the 2026-11-01 entry above).
  evidence: Split from the cross-site GET guard build (retro action item 3) because it is an independent store durability change; do it as the next build.
  resolved: `spec-fsync-parent-after-mkdir.md`; `ensure_writable` and `Store.open` fsync the data folder's parent and the data folder on every start (and the parent of any ancestor they create).

## Deferred from: review of spec-refuse-cross-site-simple-gets (2026-11-03)

- source_spec: `_bmad-output/implementation-artifacts/spec-refuse-cross-site-simple-gets.md`
  summary: In story 2.1, decide how `GET /api/export` records "Last export" so that a cross-site GET from a browser that sends no `Sec-Fetch-Site` (Safari before 16.4, old Firefox) can't trigger it — e.g. record it with a separate POST after the download, or require the header on that route.
  evidence: The guard passes requests without `Sec-Fetch-Site`, so an `<img src=".../api/export">` from such a browser still reaches the route. Medium for story 2.1 only; no GET route has a side effect today.
  resolved: `spec-require-sec-fetch-site-on-export.md`; `HostOriginGuard` requires exactly one `X-Bookvie-Export: 1` on `/api/export`, which the app's export fetch sends and no cross-site simple request can carry, so a request without it is 403 (AD-16). Requiring `Sec-Fetch-Site` itself was dropped: the same old browsers would leave it off the app's own export.

- source_spec: `_bmad-output/implementation-artifacts/spec-consolidate-test-helpers-and-cover-fault-tests.md`
  summary: Add TR8 fault tests on remove-cover and delete-book of a Book with a cover for the create_temp, close and fsync_dir steps, and for a failed post-commit remove (200, logged, swept at startup), which only edit-book's cover replace has today.
  evidence: The F-S4 tests cover write, fsync and replace only; FaultyFs supports the other steps, and test_ac6 (CoverRemoveFaultFs) exercises the post-commit remove only through edit-book.
- source_spec: `_bmad-output/implementation-artifacts/spec-consolidate-test-helpers-and-cover-fault-tests.md`
  summary: Share the remaining e2e duplicates (AXE_TAGS in 4 specs, COULDNT_SAVE in 5, COULDNT_SAVE_BODY in 2, DUNE_ISBN13 in 2) and rename new-book-panel's route-glob ADD_BOOK so it can't be confused with intents.ts's path.
  evidence: The retro's F-A9 list didn't name them; the Blind Hunter review of this spec found them after consolidation.

## Deferred from: review of spec-reconcile-architecture-spine-with-epic-1 (2026-11-03)

- source_spec: `_bmad-output/implementation-artifacts/spec-reconcile-architecture-spine-with-epic-1.md`
  summary: Bring the spine's Structural Seed and Capability → Architecture Map in line with the as-built modules (the lock is in `instance.py`, not `store/`; views are `views/shelf.py` + `views/models.py`, not `views/catalog`/`views/home`; covers are `intents/cover.py` + `store.py`).
  evidence: Retro item 2 named only the AD drift; the review of this spec found the seed and map lag too. Low; they mislead navigation, not rules.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); the Structural Seed names `instance.py`, the as-built `views/` and `store/` modules, and the Capability Map rows for FR-4, FR-21, FR-22/23 and A1 match the code.
- source_spec: `_bmad-output/implementation-artifacts/spec-reconcile-architecture-spine-with-epic-1.md`
  summary: On a same-folder port conflict where health reports no usable `pid`, the launch skips the hand-over and its `finally: release_lock` deletes the lock, leaving the live server without one; decide whether to leave the lock in place instead.
  evidence: `cli.py:139-142` hands over only when `probe_pid` returns a live pid; `release_lock` removes a lock naming this launch. Reachable only if a bookvie without `pid` in health (pre-1.2) holds the port. Low, unverified by a test.
  resolved: `spec-keep-the-lock-when-health-has-no-pid.md` (2026-11-12); the same-folder branch leaves `bookvie.lock` in place instead of deleting it, tested in `test_cli.py`, and AD-16 says so.

- source_spec: `_bmad-output/implementation-artifacts/spec-sync-spec-status-and-spine-check.md`
  summary: When bmad-code-review sends a story back to `in-progress`, its unresolved patch findings stay only in the review output; bmad-build's step-03 implements from the spec alone, so the rework has no defined path into the spec.
  evidence: Blind Hunter round 2 on retro item 11; `bmad-code-review/steps/step-04-present.md:92` leaves patches "as action items" and bmad-build `step-03-implement.md` treats the spec as the sole source of truth.

- source_spec: `_bmad-output/implementation-artifacts/spec-readme-local-run-friction.md`
  summary: Serve the SPA's `index.html` with `Cache-Control: no-cache` so a reinstall shows the new bundle without a hard reload; then drop the hard-reload step from the README (retro PL-8).
  evidence: `backend/bookvie/http/app.py` `spa` returns `FileResponse(index)` with no `Cache-Control`, so browsers may reuse a cached `index.html` pointing at the old hashed bundle.

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-1-trace-and-gate.md`
  summary: Rotate the curated spine color from the last Book's curated color, not `len(library.books)`, and add a test that deletes a Book before an add (retro F-R4).
  evidence: `backend/bookvie/intents/add_book.py:65` passes the Book count, which shrinks on delete, so the next new Book can repeat a neighbour's color. `backend/tests/test_add_book.py:523` pins the count only on a library that already has Books. The retro deferred F-R4 but never recorded it here; the Story 1.7 checklist line is retired to this entry. Low, cosmetic.
  resolved: `_bmad-output/implementation-artifacts/spec-curated-color-follows-the-last-book.md` (add-book follows the last Book's curated color; delete-then-add tests in `backend/tests/test_add_book.py`).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-1-trace-and-gate.md`
  summary: Add an on-load animation guard (`document.getAnimations()` is empty right after load) once something animates, with Epic 3's finish fill.
  evidence: Story 1.6 checklist (AC-14 and the AC-10 follow-up) planned it; no test exists at `06014dc`. Today the only animation is the popover fade, which runs on user action. Low.
  note: partly done by the Story 3.7 tests: `frontend/e2e/finish-moment.spec.ts` "[P1] AC-2 once played, the finish moment never plays again…" checks the finished spine doesn't animate after a reload, and `stats-bars.spec.ts` asserts no animations after a range change; a page-wide `document.getAnimations()`-empty-on-load guard remains.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-1-trace-and-gate.md`
  summary: Add one e2e that adds a Book through the New book panel with every optional field (Subtitle, ISBN with spaces, Year, Tags, Spine color, Finished on) and reads each value back.
  evidence: Story 1.8 checklist AC-5. The UI add tests fill only the required fields plus Tags (`frontend/e2e/new-book-panel.spec.ts:213`); the optional fields are pinned at the API (`backend/tests/test_add_book.py:362`) and in edit mode. Low; CAT-E2E-002 itself is covered.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-export-all-data-with-one-click.md`
  summary: Reconcile ARCHITECTURE-SPINE with Story 2.1's export. Four places differ. AD-1: `intents/export.py` reads `library.json` and covers itself instead of through `store/`; either route the reads through a store helper or amend AD-1. AD-4: `Store.record_export` writes `local-state.json` outside the lock. AD-14: only referenced covers are exported. AD-2/AD-15: the `local-state.json.tmp*` atomic write and its startup sweep are not described.
  evidence: The spine-check review of Story 2.1 found the code and spine disagree on each of these. AD-1 matters before Story 2.2, whose restore also touches the data folder from `intents/`.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); AD-1 amended (export's packaging read, under the lock), AD-4 and AD-15 describe the `local-state.json` write outside the lock, AD-14 exports referenced covers only, AD-2 sweeps `local-state.json.tmp*`.

## Deferred from: code review of spec-2-1-export-all-data-with-one-click (2026-11-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-export-all-data-with-one-click.md`
  summary: Spine drift for AD-1, AD-4, AD-14 and AD-2/AD-15 was re-confirmed by a second review. It is the same item as the "Reconcile ARCHITECTURE-SPINE with Story 2.1's export" entry above, not a new one.
  evidence: The spine-check layer of the 2026-11-04 review reports the same four places.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); same resolution as the 2.1 entry above.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: Story 2.3 should refuse archive cover names that collide case-insensitively (`covers/A.jpg` and `covers/a.jpg`) together with duplicate names.
  evidence: On macOS both map to one staged file, so one Book could get the other's bytes; only a crafted archive reaches it (minted names are lowercase UUIDs). Triage #15/#52.
  resolved: Story 2.3, `store/restore.py` `_check_entries` refuses names equal under `casefold()` and covers that differ only in case from one in `covers/` (`restore_unsafe`); AD-14 records it (spec-reconcile-architecture-spine-with-epic-2.md).
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: A `coverFile` that isn't `covers/<plain-name>` passes model validation (startup and restore) and is a dangling reference.
  evidence: `Book.cover_file` is any string; `cover_name` returns None so the presence check skips it. Pre-existing at startup; restore now lets such a file in too. Triage #16.
  resolved: `spec-restore-refuses-dangling-covers-and-odd-book-fields.md` (2026-11-12): `check_invariants` refuses a non-null `coverFile` that `cover_name` (moved to `domain/cover_file.py`) doesn't accept (`book_cover_file_in_covers`), so startup and restore refuse it; AD-18 records it.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: Reconcile ARCHITECTURE-SPINE with Story 2.2: interim `restore_invalid` catch-all and limits pending 2.3 (AD-9/AD-14), AD-12's outdated "Until restore exists" sentence, the no-overwrite rule winning over byte-identical restore for a differing same-name cover, and restored covers exempt from AD-12's re-encode output rules.
  evidence: Spine-check findings in both review passes; each is a deliberate spec decision with no spine edit. Triage #21, #22, #31–#33.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); AD-9 names the three restore codes, AD-12 drops "Until restore exists" and adds the restored-covers rule (stored unchanged, never overwritten), AD-14's round trip records the no-overwrite exception.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: The Backup page reads the whole export into memory (`requestInit` → `arrayBuffer()`) before uploading; consider streaming the FormData for restore alongside Story 2.3's 1 GB limit.
  evidence: `frontend/src/api/intents.ts` encodes any file form to bytes for test visibility; an export with many covers can be hundreds of MB in the tab. Triage #38.
  resolved: won't fix (2026-11-12, Oleg). At a library of about 400 Books the export is a few MB, and streaming the upload would need an AD-14 change.

## Deferred from: code review of spec-2-2-restore-my-library-from-an-export (2026-11-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: Automate the browser half of Story 2.2 AC-10 ("Restored." is shown after a post-commit cleanup fault) and BKP-E2E-001's full browser round trip (export → restore into a fresh folder → same shelf).
  evidence: `frontend/e2e/restore.spec.ts` has no fault-injection case, and AC-6 is checked only at the API level (`test_restore.py`). The spec's Implementation Notes list both as not automated. Fault injection needs a seam under the e2e server.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: Add this to the Story 2.3 case-collision item above: on a case-insensitive filesystem, `Store.replace_all`'s `os.path.lexists` treats `covers/A.jpg` as already present when `covers/a.jpg` exists. `_sweep_covers` then deletes `a.jpg`, because its keep set compares names exactly. The restored Book is left with a dangling cover.
  evidence: `backend/bookvie/store/store.py` `replace_all` and `_sweep_covers`. Only a crafted archive reaches it, because minted names are lowercase UUIDs. Refusing archive names that collide case-insensitively with each other or with existing `covers/` entries closes both.
  resolved: Story 2.3, by the same existing-name casefold refusal, so `replace_all` never meets a case-only alias. Unicode-normalization aliases were closed by Epic 2 retro action 2 (`spec-harden-restore-archive-names.md`): names compare under NFC + casefold.

## Deferred from: code review of spec-2-3-refuse-damaged-hostile-or-newer-files (2026-11-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md`
  summary: Reconcile ARCHITECTURE-SPINE AD-14 with Story 2.3: duplicate names compare under casefold and against existing `covers/` names, an entry that inflates past its declared size is `restore_unsafe` even under the cap, and the limits are 1 GiB.
  evidence: Spine-check findings #4–#6; each is a deliberate spec rule with no spine edit. Fold into the existing "Reconcile ARCHITECTURE-SPINE with Story 2.2" item.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); AD-14 and `epic-2-context.md` state the casefold and existing-name duplicate rules, the declared-size rule and the 1 GiB limits.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md`
  summary: Unverified (would be medium): the 422 `restore_unsafe` body cap answers before the upload is read, which a real browser may surface as a failed fetch ("Couldn't save") instead of the refusal line.
  evidence: Only `TestClient`/ASGI tests cover the cap. Settle with an E2E that lowers the cap (or uploads past it) against the real uvicorn server and checks the ink line. The 413 cover cap uses the same pattern.

## Deferred from: code review of spec-2-3-refuse-damaged-hostile-or-newer-files (2026-11-04, pass 2)

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md`
  summary: A `library.json` up to the 1 GiB extraction budget is read whole (`read_bytes`) and JSON-parsed in memory, which can use several GB.
  evidence: `backend/bookvie/store/restore.py` `stage_archive` (`library_path.read_bytes()`) then `load_library`. Within the spec-approved limit; a smaller `library.json` cap needs an AD-14 decision.
  resolved: won't fix (2026-11-12, Oleg). Within the spec-approved 1 GiB budget; a library of about 400 Books gives a `library.json` well under 1 MB, and a smaller cap would need an AD-14 decision.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-refuse-damaged-hostile-or-newer-files.md`
  summary: Add to the AD-14 reconcile item above: the spine and `epic-2-context.md` (l.40–42) also lack the refusal precedence (not a zip → invalid; unsafe; missing library.json; unpacking; newer version; rest) and the restore body cap (422 `restore_unsafe` at upload limit + 64 KiB framing slack, before the lock).
  evidence: Pass-2 spine-check and acceptance-auditor findings; both are frozen spec rules with no spine/context edit.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); AD-14 adds the refusal precedence, AD-9 the restore body cap, and `epic-2-context.md` both.

## Deferred from: review of spec-reconcile-architecture-spine-with-epic-2 (2026-11-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-reconcile-architecture-spine-with-epic-2.md`
  summary: `epics.md` Story 2.3 AC-3 still says "an upload over 1 GB, or more than 1 GB extracted" and "an entry other than `library.json` or `covers/<name>`", where the spine now says 1 GiB and allows the `covers/` directory entry.
  evidence: Blind Hunter finding on this spec. `epics.md` is the planning record of the requirement and was left out of the Epic 1 reconcile too; edit it only if planning docs are meant to track as-built detail.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md`
  summary: Add `domain/progress` (percent, current_reading) to the architecture spine's Structural Seed `domain/` listing.
  evidence: Story 3.1 added `backend/bookvie/domain/progress.py`; the seed still lists "model, invariants, book_fields, duplicates, cover_color, clock; reading_status and pace planned" (spine check SC2).
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); the Structural Seed's `domain/` line lists `progress`.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md`
  summary: Name gauge tick placement (0 · Math.round(pages/2) · total, half dropped under 4 pages) in AD-6's list of client presentation arithmetic.
  evidence: `frontend/src/lib/gauge.ts` gaugeTicks computes it on the client as the 3.1 I/O matrix specifies; AD-6's list does not mention it (spine check SC3).
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-6 lists the gauge ticks as client presentation.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md`
  summary: Record in AD-4/AD-15 and the FR-22 map row that the home view also reads `local-state.json` ("Last export") from disk.
  evidence: `views.home_for` calls `read_last_export(store.data_dir)` (story 3.1); the spine names only `views/backup` (spine check SC4).
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-4, AD-15 and the FR-22 map row name the home view as a `local-state.json` reader.

## Deferred from: code review of spec-3-1-see-my-main-book-on-home (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md`
  summary: Decide Book detail's Current reading block for an Up-next Book with a paused Reading (today it gets none, while ShelfBook still carries its percent and currentPage).
  evidence: `views/shelf.py` `_role_reading` returns ("upNext", None) before it looks at the Reading. AD-19 still counts that Reading as paused, and FR-7 shows a paused Up next only in Up next with Resume. Up next can't be set until Story 4.1.
  resolved: `spec-4-1-keep-the-interrupted-book-as-up-next.md` (2026-11-07); `_role_reading` returns the Up next Book's current Reading, and `CurrentReading.status` is `upNext` ("Up next, paused at page N").

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-start-reading-a-book.md`
  summary: `start-reading` for an Up next or Side-read Book fails `main_not_up_next`/`main_not_side_read` with 500, and for an Up next Book with a paused Reading the dialog says "Start" (views give no `currentReading` for `upNext`) while the server resumes and overwrites the Purpose with the empty field.
  evidence: Unreachable in Epic 3 (no intent sets Up next or Side read; seeds only). Story 4.1 must clear `upNextBookId` (and side reads) in the same commit, make `book_detail` expose the Up next Book's paused Reading, and derive the opener label and dialog mode from one source (`lib/startReading.ts` vs `StartDialog`).
  resolved: `spec-4-1-keep-the-interrupted-book-as-up-next.md` (2026-11-07), for Up next: `start-reading` moves `upNextBookId` in the same commit (FR-7), and `lib/startReading.ts` decides Start or Resume for every opener and the Start dialog. The Side-read half (`main_not_side_read`) stays open for Story 4.7, which owns starting a Side read ("Which page?").
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-start-reading-a-book.md`
  summary: ARCHITECTURE-SPINE.md drift from story 3.2: the Structural Seed's `intents/` and `domain/` lines miss `start_reading`, `edit_purpose` and `domain/purpose`; the IDs convention says server-minted UUIDs come back in success `ids`, but `start-reading` mints a Reading id and returns `{ok: true}`.
  evidence: Spine Check pass 1 (SC2, SC3). No consumer needs a Reading id; reconcile the spine wording at the next spine reconciliation.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); the seed lists `start_reading`, `edit_purpose` and `domain/purpose`; the IDs convention returns only ids a client needs.

## Deferred from: code review of spec-3-2-start-reading-a-book (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-start-reading-a-book.md`
  summary: README's "Test automation summary (currently story 2.3)" pointer (README.md:180) is stale; `automation-summary.md` is at story 3.1. Pre-existing. Pass 2 also re-raised the Up next/Side-read start and spine-drift items above; they stay as recorded.
  resolved: README.md's pointer no longer names a story (it went stale after every automate pass); `automation-summary.md`'s title names the story it covers.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-3-catch-up-with-one-page-update.md`
  summary: ARCHITECTURE-SPINE.md AD-3/AD-9 say domain rules and refusal copy live only on the server, but story 3.3's page field pre-validates the page range and holds its own "Page must be between 0 and N." copy (`frontend/src/lib/pageField.ts`), as the story requires.
  evidence: Spine Check pass 1 (SC1, SC2); the frozen intent mandates the client pre-check, so either the spine gains an exception for client pre-checks that mirror a server refusal or the client sends and renders the 422.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-3 allows a client pre-check that mirrors a server refusal with the same copy.

## Deferred from: code review of spec-3-3-catch-up-with-one-page-update (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-3-catch-up-with-one-page-update.md`
  summary: Pass 2 (spine-check, acceptance-auditor) re-raised the AD-3/AD-9 spine drift for the client page pre-check and its copy; it stays as recorded above (SC1/SC2). No new deferrals.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); see the AD-3 entry above.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: Reconcile ARCHITECTURE-SPINE with Story 3.4 — Structural Seed should list `domain/pace.py` (and `progress`), AD-20 should state that pace skips a Reading finished before it started and counts a missing `finishedPages` as 0, and AD-6 should state when the server's days left is null (no pace, pace 0, no pages left).
  evidence: Spine-check review of 3.4 (SC1–SC3); the code defines these rules but the spine doesn't, so a later Quick pace calculator could diverge from the server's days left.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); the seed lists `pace` and `progress`; AD-20 states the pace edge rules; AD-6 states when days left is null.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: AD-19 lists `lastProgressUpdate` as a plain timestamp, but the stored model and (since 3.4) the home view allow `null`, and the re-entry line omits "Last updated" for it.
  evidence: Spine-check review of 3.4 (SC4); `domain/model.py:40` is `AwareDatetime | None`, which predates this story.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-19 lists `lastProgressUpdate|null`.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: README status line still says "19 of 41 stories done" though stories 3.1–3.3 are done (20).
  evidence: Blind-hunter review of 3.4 (BH2); epics 1 and 2 have 14 + 3 stories and sprint-status shows 3.1–3.3 done; the count wasn't changed when 3.3 was marked done.
  resolved: `e783831` (docs: bring the README up to Epic 3 done); README.md's status line now counts stories correctly (41 of 41).

## Deferred from: code review of spec-3-4-see-where-i-left-off-and-how-long-is-left (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: Spine-check re-raised the Structural Seed / AD-20 / AD-6 / AD-19 drift for pace, `daysLeft` and nullable `lastProgressUpdate`; it stays as recorded above (SC1–SC4). Blind-hunter re-raised the stale "19 of 41 stories done" count; it stays as recorded above.
  resolved: spine part only, by `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06). The README story count stays open (Epic 3 retro action 6).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: README's "Test automation summary (currently story 3.2)" pointer (README.md:182) is stale; `automation-summary.md` is at story 3.3. Pre-existing.
  resolved: README.md's pointer no longer names a story (it went stale after every automate pass); `automation-summary.md`'s title names the story it covers.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-see-my-reading-on-home-s-shelf.md`
  summary: ARCHITECTURE-SPINE AD-6 says the server picks "which Books form the Home bookcase slice and in what row priority"; Story 3.5 sends a Book-id `slicePriority` and the client chooses, fills and orders rows.
  evidence: Spine-check finding SC1 in Story 3.5's review; the spine is reconciled per epic.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-6 says the server sends a Book-id `slicePriority` and the client chooses, fills and orders the rows.

## Deferred from: code review of spec-3-5-see-my-reading-on-home-s-shelf (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-see-my-reading-on-home-s-shelf.md`
  summary: No test pins the negative refocus case on Home's slice: focus a spine, drop focus to `body` (blank click), resize so the rows repack, and assert no slice spine takes focus. The `onBlur` `isConnected` branch in `Bookcase.tsx` is unguarded by tests.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-5-see-my-reading-on-home-s-shelf.md`
  summary: Spine-check re-raised the AD-6 wording drift (client chooses slice rows from an id priority); it stays as recorded above.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); see the AD-6 entry above.
- source_spec: `_bmad-output/implementation-artifacts/spec-gh-run-42099788891-pin-e2e-server-tz.md`
  summary: Fix the `.github/workflows/test.yml:58` comment that calls the e2e job "check:e2e" though it runs `npm --prefix frontend run e2e` directly.
  evidence: That mismatch is why CI skipped the root script's TZ prefix (run 42099788891); the spec was told not to edit test.yml.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-see-the-finish-on-the-shelf.md`
  summary: Update AD-7 in the architecture spine so the finish moment covers the scroll into view, the ring-only re-read and the instant reduced-motion variant, not only "a single ~600ms spine fill".
  evidence: Story 3.7 implements UX-DR42 and the epic ACs (re-read ring only, reduced motion instant, scroll first); the spine check found AD-7's parenthetical out of date.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); AD-7 describes the full finish moment.

## Deferred from: code review of spec-3-7-see-the-finish-on-the-shelf (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-see-the-finish-on-the-shelf.md`
  summary: Automate the ATDD checklist's remaining green-phase follow-ups for the finish moment: the ring and fill in dark theme and under forced colors; a second `browser.newContext()`; Back to Book detail and Forward to Home playing nothing; a 503 on the first Done, then the moment once after the retry; the re-read finished from Book detail's Mark finished; focusing "No Main book." not scrolling the spine back out of view; the AC-5 tone checks under reduced motion and on a re-read; pixel-sampling "from its current fill".
  evidence: `_bmad-output/test-artifacts/atdd-checklist-3-7-see-the-finish-on-the-shelf.md` → Green-Phase Follow-ups. The 3.7 leaves cover the scroll order, the smooth default, the `fromPercent` start (keyframe, not pixels) and the same-mount refetch; the rest has no test. Run `bmad-testarch-automate` for 3.7.
  note: partly done by the Story 3.7 automate pass (`9cd094d`): `frontend/e2e/finish-moment.spec.ts` covers the below-the-fold scroll and the forced-colors ring; that pass's automation summary declined the rest with reasons (dark theme, a second `newContext`, Back/Forward, 503-then-retry, the re-read from Mark finished, the AC-5 tone checks, pixel sampling).

## Deferred from: review of spec-epic-3-retro-item-21-bound-edit-finished-on (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-21-bound-edit-finished-on.md`
  summary: Edit book can move the latest finish (for example a back-fill) before another finished Reading's finish or start, so finished Readings overlap or swap and `latestFinishDate` jumps to another Reading.
  evidence: `edit_book._finished_on_failure` checks the latest finish only against its own `startDate` and the current Reading. This predates the fix (story 1.11).
  resolved: `spec-finished-on-keeps-readings-in-order.md` (2026-11-12); edit-book now refuses a changed latest finish before another finished Reading's `finishDate`.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-21-bound-edit-finished-on.md`
  summary: Add the "not after the current Reading's start" Finished on rule to story 1.11's ACs in `epics.md` during the Epic 3 spine reconciliation (retro action 4).
  evidence: EXPERIENCE.md now carries the rule and its copy, and `epics.md` 1.11 still lists only the "can't be removed" and "before start" rules.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); story 1.11's ACs in `epics.md` now include the Finished on bound.

## Deferred from: review of spec-epic-3-retro-item-22-stale-client-hand-offs (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-22-stale-client-hand-offs.md`
  summary: The Start dialog's "This pauses *Y* at p.N (P%)." line reads `useHomeView()`, which can be a stale cached copy when the dialog opens from Book detail or Catalog after another tab changed the Main book. It should wait for a home view fetched after it opens, as it now does for the `book` view.
  evidence: `StartDialog.tsx` passes `home.data.mainBook` straight through. Only active views refetch after an intent (`api/intents.ts:53`), and the home view is inactive away from Home.
  resolved: `spec-dialogs-wait-for-a-fresh-home-view.md` (2026-11-12); the Start dialog waits for a home view fetched after it opens (`useFreshHomeView`), with `e2e/stale-home-view.spec.ts` covering a Main book changed in a second browser context.

## Deferred from: review of spec-reconcile-architecture-spine-with-epic-3 (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-reconcile-architecture-spine-with-epic-3.md`
  summary: Align `OkResponse.ids`'s docstring ("The ids the intent minted") in `backend/bookvie/intents/contract.py`, and the OpenAPI description generated from it, with the spine's IDs convention: only ids a client needs are returned.
  evidence: The spine's IDs convention now says `start-reading` does not return its new Reading id. The docstring still says every minted id comes back, and this spec makes no code changes.

## Recorded from: Epic 3 retro item 29, load-sensitive specs (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/epic-3-retro-2026-11-06.md` (PL-5)
  summary: `home-slice.spec.ts` "[P2] AC-2 an open slice popover follows its spine when a resize repacks the rows" failed under load. It polled `rowCapacity`, which reads the list's width. The width changes as soon as the viewport is resized, but the app repacks the rows (and re-places the popover) in a ResizeObserver callback on the next frame, so `placed` was sometimes read before the repack. The product was right; the test raced it.
  evidence: Burn-in at load about 65: 5 of 30 failed, with the popover at x 764 before and x 61 after the scroll re-placement. The leaf now waits for the rendered rows (`sliceRows`), as its sibling at `:467` already did. After the fix: 50 of 50 at load about 45, and both whole files 5 times over, 155 of 155.
  resolved: test fix in `frontend/e2e/home-slice.spec.ts` (Epic 3 retro item 29, 2026-11-06).
- source_spec: `_bmad-output/implementation-artifacts/epic-3-retro-2026-11-06.md` (PL-5)
  summary: `spine-popover.spec.ts` "[P1] AC-1 at 1024px every popover is inside the viewport …" was reported as failing once under load in story 3.5. It did not reproduce: 30 of 30 at load about 65, 50 of 50 at about 45, and every run of the 5-times file burn-in passed. No race was found in it, so it is unchanged. If it fails again, keep the trace (`test-results/…/trace.zip`) and reopen this entry.
  evidence: Burn-ins on 2026-11-06 at commit `614887c` plus the home-slice fix, `--workers=4 --retries=0`.

## Deferred from: review of spec-epic-3-retro-item-26-split-bookcase-and-book-fields (2026-11-07)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-26-split-bookcase-and-book-fields.md`
  summary: No test proves the finish moment's fill ends on the spine's `height` `transitionend` rather than `FILL_FALLBACK_MS` (1000 ms). If `useFinishMoment`'s `onTransitionEnd` broke, the finished spine would stay "filling" about 400 ms too long and the ring hold would start late, and every check would still pass.
  evidence: Verification-gap review of item 26. `frontend/e2e/finish-moment.spec.ts` checks the fill motion's duration and easing, and polls that the ring comes on and goes off within 4 s. None of its checks measures when the fill ends. The gap predates the refactor, which only moved the handler; a timing assertion (`finishing` class gone well before 1000 ms) fits Story 4.6's `spineButton` work.
  note: Story 4.6 declined it (spec Code Map, deferred-work intake). A wall-clock assertion under 1000 ms is load-sensitive (see the story 3.5 flake entry), and the marker work doesn't touch the fill path. Still open; the Epic 4 retrospective decides its owner.

## Deferred from: Epic 2 retro item 18, the stale Epic 2 ATDD checklists (2026-11-07)

- source_spec: `_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md` (AC-4 follow-up)
  summary: No test covers a restore whose cover copy-in fails and whose undo then fails to remove the cover it already wrote.
  evidence: `backend/bookvie/store/store.py:343-351` (`_remove_covers`) logs each failed removal, but `backend/tests/test_restore.py:433` covers only a cleanup that fails after the commit. Low: the leftover cover is unreferenced and the next startup sweeps it.
- source_spec: `_bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md` (AC-4 follow-up)
  summary: Nothing checks that the Busy button is the only native-`disabled` control (Story 1.6 AC-14's interaction guard).
  evidence: The rule lives only in `frontend/src/components/Button.tsx:14-18,50`; `frontend/scripts/copy.test.mjs` doesn't look for `disabled`, so a new `disabled` control would pass every check. Low.

## Deferred from: implementation of spec-4-1-keep-the-interrupted-book-as-up-next (2026-11-07)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Story 4.7 must make `start-reading` for a Side-read Book remove it from `sideReadBookIds` in the same commit (today the commit fails `main_not_side_read` with 500), with the required "Which page?".
  evidence: Split from the spec-3-2 entry above, whose Up next half Story 4.1 closed. No UI reaches a Side read before Story 4.7 (seeds only).
  resolved: Story 4.7, `spec-4-7-keep-a-few-side-reads.md`; `intents/start_reading.py` drops the Book from `sideReadBookIds` in the same commit and requires `page` ("Which page?") for a Side read (`tests/test_side_reads.py`).

## Deferred from: code review of spec-4-1-keep-the-interrupted-book-as-up-next (2026-11-07)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Story 4.6 must name a paused Up next spine "Up next, paused at page N" (and "not read yet, Up next" / "finished, Up next"); since 4.1 the interrupted Main book is Up next and its spine reads "…, not read yet" though its page is kept, where Epic 3 said "waiting for you, page N".
  evidence: Blind-hunter review of 4.1 (BH1). `frontend/src/lib/catalog.ts` `spineStatus` handles only `main` and `waiting`; 4.1's intent puts spine names in Story 4.6, and `start-reading.spec.ts`/`stale-hand-offs.spec.ts` dropped or widened their spine-name asserts with "Story 4.6's" comments.
  resolved: Story 4.6, `frontend/src/lib/catalog.ts` `spineStatus` (Up next names); exact asserts restored in `start-reading.spec.ts`, `stale-hand-offs.spec.ts`, `set-up-next.spec.ts`; every row pinned in `e2e/book-states.spec.ts`
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (AD-19), reconciled before the next epic: the Starting bullet should state the FR-7 pointer move (the interrupted Main book becomes `upNextBookId`; with no Main book it stays unless it was the started Book, then `null`; a displaced Up next only loses the pointer).
  evidence: Spine-check review of 4.1 (SC1); `intents/start_reading.py` applies it in the same commit, and the spine names only the pause.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-19's Starting bullet states FR-7's pointer moves: the interrupted Main book becomes Up next, with no Main book Up next stays unless it was the started Book, and a displaced Up next only loses the pointer.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (AD-7), reconciled before the next epic: the known-gap sentence and the Deferred "Stale confirmation guard" should say the Start dialog's displacement line also reads the cached home view (`upNext.id`, `upNext.paused`), so a stale dialog can name the wrong Up next.
  evidence: Spine-check review of 4.1 (SC2); `StartDialog.tsx` reads `home.data.upNext`, as the spec's Design Notes accept.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-7's known gap names the Start dialog's trade-off and displacement lines (`upNext.id`, `upNext.paused`), and the Deferred stale confirmation guard gives a wrong Up next as a reason to revisit. The behavior itself stays open as its own entry (item 38 review).
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (Capability → Architecture Map, AD-6), reconciled before the next epic: the "FR-5 to FR-9" row should list `views/shelf` (home `upNext` with its server-decided `paused`) and Home's Up next pane, and cite AD-6.
  evidence: Spine-check review of 4.1 (SC3); the row's "Lives in" names only the intents.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the "FR-5 to FR-9" row lists `views/shelf` (home `upNext` with `paused`) and Home's panes and cites AD-6; AD-6 lists `upNext.paused` as server-computed.

## Deferred from: code review of spec-4-1-keep-the-interrupted-book-as-up-next (2026-11-07, pass 2)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Book detail's Delete Confirm for a paused Up next reads "It is Up next." and no longer gives the page kept, where Epic 3's interrupted (`waiting`) Book read "It is waiting for you at p.120." Story 4.6, which owns the role lines, should carry the page for a paused Up next.
  evidence: `frontend/src/lib/bookDetail.ts:170` `roleLine` returns a fixed string for `upNext`; spec 4.1's Code Map froze `roleLine` ("Do not change").
  resolved: Story 4.6, `frontend/src/lib/bookDetail.ts` `roleLine` ("It is Up next, paused at p.120.")

## Deferred from: implementation of spec-4-2-see-every-paused-book-in-waiting-for-you (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-see-every-paused-book-in-waiting-for-you.md`
  summary: Spine drift (Capability → Architecture Map, AD-6), reconciled before the next epic: the "FR-5 to FR-9" row (it holds FR-7) should name `views/shelf` (home `waiting`, the server-ordered Waiting for you list: `pausedAt` ascending, then title key, then Book id, never sending `pausedAt`) and Home's Waiting for you pane (`WaitingPane`), and its "Governed by" should add AD-6. Wording tightened by the code review of spec-4-2 (2026-11-08).
  evidence: Story 4.2 adds `HomeView.waiting` (`backend/bookvie/views/shelf.py` `_waiting`) and `frontend/src/components/WaitingPane.tsx`; the map's "FR-5 to FR-9" row names neither.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the "FR-5 to FR-9" row lists `views/shelf` (`waiting`) and the Waiting for you pane and cites AD-6; AD-6 states the Waiting set and order (`pausedAt`, none first, then title key, then Book id; `pausedAt` never sent).

## Deferred from: implementation of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Check in Safari and Firefox on macOS that a mouse click on a "⋯" menu item (Pause, Open book) and on "⋯" itself lands. Unverified; high if it fails. There a press doesn't focus the button, so the menu's blur has a null `relatedTarget`. The code review of 4.3 holds the blur off during a pointer press on an item or "⋯" (`pressing` in `MoreActionsMenu.tsx`), which should remove the race, but the e2e suite runs Chromium only.
  evidence: Spec 4.3 frontmatter `deferred`, item 1. Settle it with a manual check, or a Playwright webkit/firefox project run of `pause.spec.ts`.
  resolved: not needed (Epic 4 retro item 38, 2026-11-10; retro open question 3): Oleg uses Chrome, which the Chromium e2e run covers, so the Safari and Firefox check is dropped.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: No test covers a pause that fails after the page has unmounted (the late `alert` announcement in `usePauseFlow`). Low.
  evidence: Spec 4.3 frontmatter `deferred`, item 2. Cover it with the app's other unmount-after-request cases (`PageField`, `EditPurpose`).

## Deferred from: code review of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (AD-19), reconciled before the next epic: AD-19 describes only how `start-reading` pauses a Book; it should also state the standalone `pause` intent (pauses the current Reading, overwriting `pausedAt`, clears `mainBookId`, makes the Book `upNextBookId`, a displaced Up next only loses the pointer). Extends the 4.1 AD-19 entry above.
  evidence: Spine-check review of 4.3; `backend/bookvie/intents/pause.py`, and `start_reading.py` now imports `pause_main` from it.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-19's "Pausing and Up next" bullet states the standalone `pause` intent.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (AD-7), reconciled before the next epic: the known-gap sentence should name the Pause Confirm dialog too; its displacement line, and whether the dialog shows at all, read `useHomeView()` as cached when Pause is pressed. Extends the 4.1 AD-7 entry above.
  evidence: Spine-check review of 4.3; `frontend/src/lib/usePauseFlow.tsx` `request()` reads `home.data.upNext`, as the spec's Design Notes accept.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-7's known gap names the Pause Confirm dialog (whether it shows, and its displacement line, read the cached home view in `usePauseFlow`); the behavior stays open as its own entry (item 38 review).
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (Structural Seed, Capability → Architecture Map preface), reconciled before the next epic: the seed's `intents/` module list should add `pause`, and the map's preface should stop giving `intents/pause` as an example of a module not built yet.
  evidence: Spine-check review of 4.3; `backend/bookvie/intents/pause.py` and `POST /intents/pause` in `backend/bookvie/http/api.py`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the seed's `intents/` list adds `pause`, and the map's preface gives `views/stats` and `views/card_notes` as unbuilt examples.

## Deferred from: test automation of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: After a stale-tab refusal (`not_main_book`) of Pause on Book detail, the refusal is invisible and focus is lost. The refusal's refetch makes the Book Up next, so Pause and its slot unmount before `usePauseFlow` sets `failed` and focuses the opener (`opener.current` is null). Focus falls to `body`, and "This book isn't your Main book anymore." lives only in the shell's visually hidden `alert` region, where the spec has the line below Pause with focus kept there. Home is likely the same once the card empties. Medium: a screen reader hears it, but a sighted user sees Pause turn into Resume with no message. A fix should move focus to Book detail's Resume (or the empty card's) and show the line near it.
  evidence: A probe during `bmad-testarch-automate` for 4.3 found `document.activeElement` = `BODY` and the alert's box 1×1 at x=-1. `frontend/e2e/pause.spec.ts` "[P1] a Book paused in another tab: …" asserts only the announcement and the swap.
  resolved: 2026-11-08, follow-up fix. `usePauseFlow` records whether an immediate-path failure was a refusal; when the refusal's refetch takes the Book out of Main, focus moves to the owner's `fallback` (Book detail's Resume, the empty card's Resume, else "No Main book.") and the line shows in the slot below it (Book detail's slot now stays rendered below Pause or Resume; the empty card renders one after its suggestion). A couldn't-save line still goes when the Book stops being Main for another reason, and a moved line goes once there is a Main book again. Both stale-tab tests in `pause.spec.ts` assert the focus and the line's position, and fail on the old code.

## Deferred from: code review of spec-4-4-choose-what-to-read-next (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: Spine drift (Capability → Architecture Map, Structural Seed), reconciled before the next epic: the "FR-5 to FR-9" row (it holds FR-7) should name `intents/set_up_next` (`POST /intents/set-up-next`), and the seed's `intents/` module list should add `set_up_next`.
  evidence: Story 4.4 adds `backend/bookvie/intents/set_up_next.py` and its route in `backend/bookvie/http/api.py`; the ATDD checklist for 4.4 ("Spine drift to expect") names this row.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the seed's `intents/` list adds `set_up_next`; the map row already listed it (see the correction below).
- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: Spine drift (AD-9, AD-2), reconciled before the next epic: AD-9's "set-up-next for the current Up next is a 200 no-op that commits nothing" should name the mechanism, a change returning `store.UNCHANGED` so `Store.apply` skips the commit under the AD-4 lock (new files removed again), and AD-2's commit description should allow that no-write outcome.
  evidence: `backend/bookvie/store/store.py` `UNCHANGED` and `_apply_locked`; `backend/tests/test_store_commits.py::test_apply_unchanged_writes_nothing`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-9's no-op bullet names `store.UNCHANGED` and `Store.apply` skipping the commit under the AD-4 lock, and AD-2 allows that no-write outcome.

## Deferred from: code review of spec-4-5-mark-any-book-finished-from-its-page (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-5-mark-any-book-finished-from-its-page.md`
  summary: Spine drift (AD-7, AD-19, FR-14 map row), reconciled before the next epic: AD-7 describes only the Main finish carried to Home as router state; it should say a finish of a Book that wasn't Main when the Finish dialog opened stays on Book detail (focus to the `h1`, then "Finished *X*.", no finish moment). AD-19's "Finishing" bullet should say `finish-reading` back-fills a Reading (`startDate` null) for a Book with no Readings, and clears `upNextBookId` and the Book's `sideReadBookIds` entry in the same commit.
  evidence: `backend/bookvie/intents/finish_reading.py` (back-fill, pointer clearing); `frontend/src/components/FinishDialog.tsx` `onFinishedHere`; `backend/tests/test_finish_any_book.py`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-7 says a non-Main finish stays on Book detail (focus to the `h1`, then "Finished *X*.", no moment); AD-19's Finishing bullet states the back-fill and the pointer clearing; the FR-14 row change is the entry further down.

## Deferred from: code review of spec-4-6-see-each-book-s-state-on-the-shelf-and-its-page (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-6-see-each-book-s-state-on-the-shelf-and-its-page.md`
  summary: `stale-hand-offs.spec.ts` "[P1] F-R4 a refusal that removes Edit Purpose still reads in alert" is flaky. In about 1 run in 8, `getByRole('alert')` stays empty (`Received: ""`) for 10 s instead of reading "This reading is already finished.".
  evidence: Seen in the review's `npm run check` (1 failure in 372), then reproduced at `b6e10d8` without the review's patches: 1 of 5 with `--repeat-each=5`, and 1 of 8 twice with `--repeat-each=8 --retries=0`. Story 4.6 doesn't touch Edit Purpose, the finish intent or the alert. Next step: keep the trace and check whether the refusal's alert renders before the Edit Purpose field unmounts, or whether a home or book refetch replaces it.
  resolved: `spec-epic-4-retro-item-42-refusal-reads-after-edit-purpose-unmounts.md` (Epic 4 retro item 42, 2026-11-10); a product race, not a test bug: `EditPurpose`'s unmount cleanup cancelled the refusal's pending `announce`. 8 of 40 failed before the fix, 0 of 120 after.

## Deferred from: review of spec-4-7-keep-a-few-side-reads (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: Spine drift (Capability → Architecture Map "FR-5 to FR-9" row, AD-18, AD-6), reconciled before the next epic: the "FR-5 to FR-9" row (FR-8 Side reads) names `mark_side_read`, but the code is `intents/side_reads.py` with `mark_side_read` and `unmark_side_read` (unmark isn't in the spine); AD-18/AD-6 don't name the views' Side-read fields `HomeView.sideReads`, `ShelfBook.sideRead`, `BookDetailView.sideRead` and `sideReadsFull`, nor `start-reading`'s `page` ("Which page?") and its `reachedLastPage`.
  evidence: Review of 4.7; `ARCHITECTURE-SPINE.md:362` ("FR-5 to FR-9" row); `backend/bookvie/intents/side_reads.py`, `intents/start_reading.py`, `views/models.py`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the "FR-5 to FR-9" row names `side_reads` (mark, unmark) and `views/shelf` (`sideReads`). Per the correction below, view fields stay with the Pydantic models (AD-8, Deferred); `page` and `reachedLastPage` are in AD-19.

## Deferred from: review of spec-epic-4-retro-item-34-back-fill-drops-side-read (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-34-back-fill-drops-side-read.md`
  summary: Spine drift (AD-19), reconciled before the next epic (retro item 38): AD-19's "Back-filled finishes in edit" bullet should say a back-fill on a Book with no Readings also removes it from `sideReadBookIds` in the same commit, and that `upNextBookId` stays. Its "Finishing" bullet's "only `finish-reading` sets `finishDate`" should allow for edit-book's back-fill.
  evidence: `ARCHITECTURE-SPINE.md:236-237`; `backend/bookvie/intents/edit_book.py` (`edit_book`'s `change`).
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-19's back-fill bullet says a back-fill on a Book with no Readings leaves `sideReadBookIds` and `upNextBookId` stays; the Finishing bullet allows edit-book's back-fill; AD-18's pointer list repeats it.

## Deferred from: spec-epic-4-retro-item-35-count-only-tracked-pages (2026-11-09)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-35-count-only-tracked-pages.md`
  summary: Spine drift (AD-18, AD-19, AD-20), reconciled before the next epic (retro item 38): the document is now `schemaVersion` 2. AD-19's Reading fields should list `startPage` (after `startDate`; a whole number from 0, the page a new Reading starts at, 0 on a back-fill, unchanged by a resume). AD-18's invariant "card-note pages and unfinished Reading pages are within the Book's page count" should say it applies to `currentPage`, not `startPage`, which is deliberately unbounded. AD-20's Measured pace should say it sums `max(finishedPages − startPage, 0)`, with the days unchanged.
  evidence: `backend/bookvie/domain/model.py` (`SCHEMA_VERSION`, `Reading.start_page`); `backend/bookvie/store/migrations/__init__.py` (`STEPS[1]`); `backend/bookvie/domain/pace.py`; `backend/bookvie/intents/start_reading.py`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-19's Fields list `startPage` (`schemaVersion` 2); AD-18's page invariant names `currentPage` and says `startPage` is deliberately not bounded; AD-20's Measured pace sums max(`finishedPages` − `startPage`, 0). The resume-pages entry below is not drift and stays open.

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-35-count-only-tracked-pages.md`
  summary: Measured pace still counts pages skipped on a resume: resuming a paused Reading at a higher "Which page?" doesn't change `startPage`, so a Reading started at 0, paused at 20 and resumed at 300 counts all the pages. Lowering the page below `startPage` (a mistyped start, later corrected) undercounts in the same way.
  evidence: Item 35 stores the page a *new* Reading starts at, and its approved spec says a resume never changes `startPage`. `backend/bookvie/intents/start_reading.py` (resume branch), `backend/bookvie/domain/pace.py`. Fixing it would need the pages tracked per resume, a new decision.
  resolved: `spec-pace-counts-only-pages-read.md` (2026-11-12). Schema v3: a resume at a page other than `currentPage` closes the segment into the Reading's new `earlierSegments` and moves `startPage` to the sent page; Measured pace sums each segment's pages (at least 0 each). The v2→v3 step adds `earlierSegments: []`, so existing Readings keep their pace; invariants `reading_segments_need_start_date` and `reading_segment_starts_at_new_page`; AD-18, AD-19 and AD-20 record the decision, replacing item 35's "a resume never changes `startPage`".

## Deferred from: code review of spec-4-4-choose-what-to-read-next, second pass (2026-11-09, retro item 43)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: Spine drift (AD-3, AD-12), reconciled before the next epic (retro item 38): AD-3 allows an intent only to commit once or refuse, but `set-up-next` on the current Up next (and the no-op Side-read intents) is a 200 with no commit and no `check_invariants()`. AD-12 says files always go write, commit, delete, but a change returning `UNCHANGED` with `new_files` writes and removes them with no commit. No intent sends both today. The AD-9 and AD-2 entry above doesn't name either decision.
  evidence: `ARCHITECTURE-SPINE.md:65` (AD-3); `backend/bookvie/store/store.py:464`; `backend/bookvie/intents/set_up_next.py:45`; `backend/bookvie/intents/side_reads.py:60`, `:77`; `backend/tests/test_store_commits.py::test_apply_unchanged_writes_nothing`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-3 allows a 200 no-op that commits nothing and runs no `check_invariants()`, and AD-12 says a no-op's new files are deleted again with nothing committed.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: Spine drift correction for retro item 38: the entry above saying the Capability Map's "FR-5 to FR-9" row should name `intents/set_up_next` is half wrong. The row already lists `set_up_next`, and it names no routes. Only the Structural Seed's `intents/` list needs it.
  evidence: `ARCHITECTURE-SPINE.md:362`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); applied with the entry it corrects: only the Structural Seed needed `set_up_next`.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: For retro item 36: the spine popover's in-flight state has no test (the hint frozen by `hintAtPress`, `aria-disabled` with its reason, a second press sending nothing). With no earlier Up next, the refetch would otherwise show "Replaces the current Up next." during the request.
  evidence: `frontend/src/components/SpinePopover.tsx:81-85`; the only held-route leaf is on Book detail, `frontend/e2e/set-up-next.spec.ts:324`.
  resolved: Epic 4 retro item 36, `frontend/e2e/set-up-next.spec.ts` ("in flight in the spine popover…" and "with an Up next, the popover keeps…"): the answer is held while a refetch shows the Book as Up next; no hint appears, `aria-disabled` and its reason stay, and a second press sends nothing.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: For retro item 36: two green-phase follow-ups in 4.4's ATDD checklist have no test and no recorded decision: AC-2 in the browser (a stale tab presses, gets 200 and the `status` line) and refetch on focus (AD-7).
  evidence: `_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md:366-367`.
  resolved: Epic 4 retro item 36, `frontend/e2e/set-up-next.spec.ts` ("[P1] AC-2 a stale tab sets the current Up next again…" and "[P2] refetch on focus (AD-7)…"); both checklist lines ticked.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md`
  summary: The e2e helpers `watchStatus`, `statusSeen`, `routeCouldntSave`, `detailButton`, `topOf` and `bottomOf` were due to move to a shared module in 4.4's green phase or in 4.5. They didn't, and are now copied across `pause`, `set-up-next`, `side-reads` and `finish-any-book` (`detailButton` also in `start-reading`).
  evidence: `_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md:265`; `frontend/e2e/set-up-next.spec.ts:61-113`.

## Deferred from: code review of spec-4-5-mark-any-book-finished-from-its-page, second pass (2026-11-10, retro item 43)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-5-mark-any-book-finished-from-its-page.md`
  summary: Spine drift (Capability → Architecture Map FR-14 row, AD-18), reconciled before the next epic (retro item 38): the 4.5 entry above names the "FR-14 map row" but says nothing to change in it. `finish-reading` now writes the root pointers AD-18 defines (it clears `upNextBookId` and the Book's `sideReadBookIds` entry), so the row, which lists only AD-7, AD-11, AD-19 and AD-20, should add AD-18, and AD-18's pointer rules should cover a finish as well as a delete.
  evidence: `ARCHITECTURE-SPINE.md:364`; `backend/bookvie/intents/finish_reading.py` (pointer clearing).
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the FR-14 row cites AD-18, and AD-18's pointer list covers `finish-reading` as well as delete.

## Deferred from: code review of spec-4-7-keep-a-few-side-reads, second pass (2026-11-10, retro item 43)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: Spine drift (AD-3, AD-9), reconciled before the next epic (retro item 38): AD-3 calls the page field's range check "the one sanctioned pre-check" and AD-9 "the one exception" for copy. The Start dialog's "Which page?" also pre-checks an empty value with its own copy of "Which page? is required.", and reuses the range check. The shared case table `pageField.cases.json` covers neither.
  evidence: `frontend/src/components/StartDialog.tsx:30`, `:103-110`; `backend/bookvie/intents/start_reading.py`; `frontend/src/lib/pageField.cases.json`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-3 lists two sanctioned pre-checks (the page field's range, and the Start dialog's "Which page?" for both empty and out-of-range values), and AD-9 points at both. The empty-value copy has no shared check. It is a known gap in AD-3, kept open as its own entry (item 38 review).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: Spine drift (AD-19), reconciled before the next epic (retro item 38): AD-19's Starting bullet lists only resume or create and pausing the previous Main book. It should state that a sent `page` becomes `currentPage` (even below the paused page), a Side read without one gets 422 on `page`, and the Book leaves `sideReadBookIds` in the same commit. Its Finishing bullet limits `reachedLastPage` to "a Side read's starting page", but `start-reading` accepts `page` for any Book.
  evidence: `backend/bookvie/intents/start_reading.py`; `backend/tests/test_side_reads.py::test_p1_a_page_sent_for_a_book_that_isnt_a_side_read_is_honored`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-19's Starting bullet says a sent `page` becomes `currentPage` (even below the paused page) and a new Reading's `startPage`, is required for a Side read (422) and honored for any Book, and the Book leaves `sideReadBookIds`; the Finishing bullet says `reachedLastPage` follows any `start-reading` with a `page`.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: Spine drift (Structural Seed), reconciled before the next epic (retro item 38): the seed says `intents/` has "one module per intent", but `intents/side_reads.py` holds `mark_side_read` and `unmark_side_read`.
  evidence: `backend/bookvie/intents/side_reads.py`.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); the seed's `intents/` line says one module per intent except `side_reads` (mark-side-read and unmark-side-read).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: Spine drift correction for retro item 38: the 4.7 entry above for the "FR-5 to FR-9" row, AD-18 and AD-6 lists the views' Side-read fields as drift, but AD-18 covers the document shape and the spine's Deferred section leaves view fields to the Pydantic models (AD-8). `reachedLastPage` is already named in AD-19. The real disagreements are the AD-19 entry just above.
  evidence: `ARCHITECTURE-SPINE.md` (AD-18, AD-19, Deferred); `deferred-work.md` entry for 4.7's "FR-5 to FR-9" row.
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); applied with the entry it corrects.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: For retro item 36 (retro F-R5): the last-page hand-off carries no Book id. `StartedState` has only `reachedLastPage` and `savedLine`, and Home opens Finish for whatever `mainId` the view shows. If the refetch fails after the start, or another tab changes Main, Finish opens for the wrong Book. The finish hand-off below it compares `handed.id`; this one doesn't.
  evidence: `frontend/src/components/StartDialog.tsx:25`, `:121-124`; `frontend/src/pages/HomePage.tsx:165-170`.
  resolved: Epic 4 retro item 36, `spec-epic-4-retro-item-36-last-page-finish-for-the-started-book.md`. The probe showed it real: with Home's refetch failing, Finish opened for Dune and Done finished Dune's paused Reading. The hand-off now carries the Book's id, and Home opens Finish only once its view shows that Book as Main (`frontend/e2e/side-reads.spec.ts`, "[P0] F-R5 …").

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: For retro item 36: a last-page start is tested only from the On the side pane and Home's slice, not from Book detail or Catalog, where navigation remounts Home. Nothing pins that Finish doesn't reopen on Back or reload (`lastPageOpened`, `clearHandOffState`).
  evidence: `frontend/e2e/side-reads.spec.ts:440`; `frontend/e2e/home-slice.spec.ts:668`.
  resolved: Epic 4 retro item 36, `frontend/e2e/side-reads.spec.ts` (the "Epic 4 retro item 36: Which page? and the last page from every route" block): Book detail, the Catalog's spine popover, the Up next pane, the empty card and a Waiting row each open Finish on Home; a reload, Back and Forward don't reopen it.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-7-keep-a-few-side-reads.md`
  summary: For retro item 41 (F-A2): `useOneClickFlow` lives in `useSetUpNextFlow.ts`, returns `SetUpNextFlow`, takes `SetUpNextBook` and calls its callback `onSet`, while Side reads use it for mark and remove. Neutral names and its own module would stop the next one-click intent inheriting them.
  evidence: `frontend/src/lib/useSetUpNextFlow.ts:36`, `:53`.
  resolved: Epic 4 retro item 41 (`09976ce`): the hook moved to `frontend/src/lib/useOneClickFlow.ts` with neutral names (`OneClickBook`, `OneClickFlow`, an `onDone` callback).

## Deferred from: spec-epic-4-retro-item-42-refusal-reads-after-edit-purpose-unmounts (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-42-refusal-reads-after-edit-purpose-unmounts.md`
  summary: `ChangeColor`'s unmount cleanup has the same shape as the Edit Purpose race: when a refusal's refetch closes the popover or removes the Book within 100 ms of `announce`, `if (failed.current) clearAnnouncements()` can cancel the message. Found by reading the code, not reproduced.
  evidence: `frontend/src/components/ChangeColor.tsx:44`, `:70-72`; the cause is in `spec-epic-4-retro-item-42-refusal-reads-after-edit-purpose-unmounts.md`.
  resolved: `spec-change-color-refusal-reads-after-unmount.md` (2026-11-12). The unmount cleanup clears only a couldn't-save line, so a refusal survives the popover closing, and a pick that resolves after the block is gone announces a non-ok result, as Edit Purpose does. On the baseline, the new leaves in `spine-popover.spec.ts` failed 3 of 3.

## Deferred from: spec-epic-4-retro-item-36-last-page-finish-for-the-started-book (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-36-last-page-finish-for-the-started-book.md`
  summary: The other last-page path has the same shape as F-R5: `openFinish`, which the Main book card's page field calls on `reachedLastPage`, opens Finish for whatever `mainId` the view shows, not the Book the save was for. It needs another tab to change Main between the save landing and Home's refetch rendering. Low, predates this change; `PageField` already has the `bookId` to pass.
  evidence: `frontend/src/pages/HomePage.tsx` (`openFinish`); `frontend/src/components/PageField.tsx:146`.
  resolved: `spec-last-page-finish-opens-for-the-saved-book.md` (2026-11-12). The page field passes the saved Book's id, and Home opens Finish for it only when the view rendered after the save still shows it as Main. On the baseline, the closure opened Finish for the saved Book, not the view's Main book; the new leaf in `stale-hand-offs.spec.ts` fails there.

## Deferred from: spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4 (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md`
  summary: Spine drift (AD-7, AD-19), found by item 38's comparison of the Epic 4 diffs (F-S3): item 36's last-page start hands Home the started Book's id, and Home opens Finish only for that Book, once per history entry. AD-19's Finishing bullet said only "The client then opens the Finish dialog."
  evidence: `frontend/src/components/StartDialog.tsx` (`StartedState`); `frontend/src/pages/HomePage.tsx` (`reachedLastPage`); `frontend/e2e/side-reads.spec.ts` ("[P0] F-R5 …").
  resolved: `spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md` (Epic 4 retro item 38, 2026-11-10); AD-7's "Last-page start" bullet, and AD-19's Finishing bullet points to it.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md`
  summary: Nothing keeps "Which page? is required." in step between the Start dialog's pre-check and `start-reading`. Each side's tests hard-code their own copy, and the e2e test never reaches the server, because the client refuses first. Changing one side's copy leaves both suites green. Add an empty-value case that both sides read, for example in `pageField.cases.json` or a sibling table. Low.
  evidence: `frontend/src/components/StartDialog.tsx` `PAGE_REQUIRED`; `backend/bookvie/intents/start_reading.py` `PAGE_REQUIRED_MESSAGE`; `backend/tests/test_side_reads.py`; `frontend/e2e/side-reads.spec.ts`. AD-3 records it as a known gap.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-38-reconcile-the-spine-with-epic-4.md`
  summary: The Start dialog's displacement line (`upNext.id`, `upNext.paused`) and the Pause Confirm dialog read the home view as cached, so a dialog opened away from Home after another tab changed Up next can name the wrong Up next. The Pause flow can also skip or show its Confirm wrongly. This widens the Epic 3 entry on the Start dialog's "This pauses *Y*…" line, which covers only `mainBook`. The intent still applies to the current state (A2), so only the copy is wrong. Low.
  evidence: `frontend/src/components/StartDialog.tsx` (`home.data.upNext`); `frontend/src/lib/usePauseFlow.tsx` `request()`. AD-7 records it as a known gap. The spine drift entries for 4.1 and 4.3 closed only the spine wording.
  resolved: `spec-dialogs-wait-for-a-fresh-home-view.md` (2026-11-12); the Start dialog waits for a fresh home view (`useFreshHomeView`), and Pause fetches one on the press and decides its Confirm from it (`useFetchFreshHomeView`), with `e2e/stale-home-view.spec.ts` covering Up next set or removed in a second browser context.

## Deferred from: spec-epic-4-retro-item-41-split-book-detail-flows-into-hooks (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-41-split-book-detail-flows-into-hooks.md`
  summary: No e2e test holds `mark-side-read` or `unmark-side-read` open on Book detail, so the in-flight reason ("Marking the book as a Side read." / "Removing the book from the side.") and the ignored second press are unpinned. Swapping the ternary in `useDetailSideRead` or dropping its in-flight branch leaves every spec green. Add a `[P2]` test in `e2e/side-reads.spec.ts` modelled on `set-up-next.spec.ts:325`. Low.
  evidence: `frontend/src/lib/useDetailSideRead.ts` (`sideReadReason`); `e2e/side-reads.spec.ts` checks `aria-disabled` only at 3 Side reads; no e2e matches "Marking the book" or "Removing the book". Item 41 barred e2e edits.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-retro-item-41-split-book-detail-flows-into-hooks.md`
  summary: No e2e test holds `set-up-next` open on Book detail while another Book is Up next, so keeping "Replaces the current Up next." in the description during the request (`hintAtPress`) is pinned only for the spine popover. Add a `[P2]` Book detail counterpart to `set-up-next.spec.ts:629`. Low.
  evidence: `frontend/src/lib/useDetailSetUpNext.ts` `press` and `showHint`; `set-up-next.spec.ts:325-354` seeds no Up next; `:629-662` covers only `SpinePopover`. Item 41 barred e2e edits.

## Deferred from: build review of spec-5-1-add-a-card-note-while-reading (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-add-a-card-note-while-reading.md`
  summary: Spine drift (Structural Seed, Capability map FR-17 to FR-19, AD-6, AD-18), reconciled before the next epic. The Structural Seed's `intents/` and `domain/` lines don't list `add_card_note` or `note_pages`. The FR-17 to FR-19 row names only `views/card_notes`, but Book detail's notes come from `views/shelf.book_detail` (`BookDetailView.cardNotes`). AD-6's server list lacks the Card notes order (`pageStart`, then `createdAt`), and its client list lacks the block's first-three cut. AD-18 doesn't say that `pageEnd: null` means one page (never `pageEnd == pageStart`) or that `pageStart ≤ pageEnd`.
  evidence: The spine-check layer of Story 5.1's build review. In each case the code is right and ARCHITECTURE-SPINE.md is out of date (AGENTS.md → Architecture spine).
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); the Structural Seed lists `add_card_note` (with the shared `check_card_note_fields`) and `domain/note_pages`; the FR-17 to FR-19 row names `views/shelf` (Book detail's `cardNotes`) beside `views/card_notes`; AD-6's server list has the Card notes order (`pageStart`, then `createdAt`) and its client list the block's first-three cut; AD-18 says `pageEnd` is null for one page and otherwise greater than `pageStart`, never equal to it.
- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-add-a-card-note-while-reading.md`
  summary: The README Status line is stale. It still says "Epic 4 is in progress, with Stories 4.1-4.7 done", "31 of 41 stories done" and "All three retrospectives are done", but Epic 4, its retro, trace and gate are complete. Update it when bmad-code-review moves 5.1 to done.
  evidence: `README.md:8` against `sprint-status.yaml` (`epic-4-retrospective: done`, the epic 4 retro items done). It predates Story 5.1, and a story leaves the count to bmad-code-review.
  resolved: Story 5.1 code review (2026-11-10), `README.md:8` Status line (Epics 1-4 complete, 32 of 41, four retros and gates).

## Deferred from: code review of spec-5-1-add-a-card-note-while-reading (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-add-a-card-note-while-reading.md`
  summary: Book detail's Card notes block has no clamp, so one long note makes its card and its grid row arbitrarily tall and pushes Readings down the page. Decide on a line clamp or a max height for the block's preview cards with 5.3/5.4, where the full text lives in the list and the pile.
  evidence: `frontend/src/pages/BookDetailPage.module.css` (`.cardNote`, `.cardNoteText`) sets no clamp, and DESIGN.md → Book detail specifies none. Note has no length limit.
  note (Story 5.3 build, 2026-11-10): not resolved in 5.3, moved to 5.4. A clamp would hide the `<mark>`s that 5.3's in-block Search card notes puts past it, and 5.4's pile is where a long note is read from the block, so decide both together in 5.4.
  resolved: Story 5.4, 2026-11-10. Book detail's block clamps each card's text to 6 lines while its search is empty (`.cardNotes[data-clamped='true'] .cardNoteText` in `BookDetailPage.module.css`); while the search holds text nothing is clamped, so every `<mark>` shows. The full text is read in the pile; the Card notes page never clamps.
- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-add-a-card-note-while-reading.md`
  summary: Spine drift (Consistency Conventions → IDs, AD-9), reconciled before the next epic. `add-card-note` returns `ids.cardNoteId`, which no client reads yet. The IDs convention says an id no client uses is not returned. Oleg chose to keep it, so record the exception in the spine, naming its expected readers: the agent skills that write to bookvie, and Story 5.2's edit.
  evidence: `backend/bookvie/http/api.py` (`add_card_note_intent`); `frontend/src/lib/useCardNoteFlow.tsx` and `CardNotePanel.tsx` ignore `result.ids`. The spec and the ATDD contract pin `cardNoteId`, and the code review decision (2026-11-10) was to keep it.
  note (Story 5.2 build, 2026-11-10): not resolved in 5.2. Story 5.2's edit and delete read note ids from Book detail's `BookDetailView.cardNotes`, not from the add response, so when this spine drift is reconciled, name only the agent skills as `cardNoteId`'s reader.
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); the IDs convention records `add-card-note`'s `cardNoteId` as its one exception, naming the agent skills that write to bookvie as its reader.

## Deferred from: build-auto review of spec-5-2-edit-or-delete-a-card-note (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-edit-or-delete-a-card-note.md`
  summary: Spine drift (AD-9, AD-19 Targeting, Structural Seed), reconciled before the next epic. AD-9's list of 409 targeting refusals doesn't name the new `card_note_not_found` (a note gone from a Book that is still there, checked after `book_not_found` and before the fields, for `edit-card-note` and `delete-card-note`). AD-19's Targeting rule names `bookId` and `readingId` but not `cardNoteId`. AD-9's general rule (spine line 65) calls asking for what is already so a 200 no-op, but `edit-card-note` commits an unchanged edit, as `edit-book` does. The Structural Seed's `intents/` line doesn't list `edit_card_note` or `delete_card_note` (nor 5.1's `add_card_note`), nor the shared `check_card_note_fields`, and its `lib/` line doesn't list `cardNotes.ts`.
  evidence: `backend/bookvie/intents/contract.py` (`ErrorCode.CARD_NOTE_NOT_FOUND`, `card_note_not_found()`), `backend/bookvie/intents/edit_card_note.py`, `delete_card_note.py`, `add_card_note.py` (`check_card_note_fields`), `frontend/src/lib/cardNotes.ts`. The code follows the ATDD contract decided with Oleg (2026-11-10), including the commit on an unchanged edit; ARCHITECTURE-SPINE.md is out of date (AGENTS.md → Architecture spine).
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); AD-9's 409 list names `card_note_not_found` (after `book_not_found`, before the fields), and its no-op rule, and AD-3's, say `edit-book` and `edit-card-note` commit an unchanged edit; AD-19 Targeting names `cardNoteId`; the Structural Seed's `intents/` line lists `add_card_note`, `edit_card_note`, `delete_card_note` and `check_card_note_fields`, and its `lib/` line `cardNotes.ts`.

## Deferred from: code review of spec-5-2-edit-or-delete-a-card-note (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-edit-or-delete-a-card-note.md`
  summary: Spine drift (AD-9, AD-19 Targeting, Structural Seed), reconciled before the next epic. The code review's spine check found the same five items that the "build-auto review of spec-5-2-edit-or-delete-a-card-note" entry above already records: `card_note_not_found`, which is missing from AD-9's 409 list; AD-9's no-op rule against the commit on an unchanged edit; `cardNoteId` targeting under AD-19; and the Seed's `intents/` and `lib/` lines. Resolve both entries together.
  evidence: the code-review spine-check layer (2026-11-10), against `a4ecc34..7a49901`.
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); closed with the build-auto entry above, the same five items.

## Deferred from: build-auto review of spec-5-3-find-a-note-across-all-my-books (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-find-a-note-across-all-my-books.md`
  summary: Spine drift (AD-6, AD-9, Structural Seed), reconciled before the next epic. AD-6's server list names neither the `card-notes` view's selections (only Books with notes get a group; groups by `title_key`, then Book id; the `?book=<id>` scope) nor Home's `HomeMainBook.cardNoteCount`. AD-6's client list already names Search card notes, but not the `<mark>` highlighting, the client-counted "N notes match." line, or the block's first-three cut that a search lifts. AD-9 names only `views/book` as a view that answers 404 `book_not_found`; `views/card-notes?book=<id>` does too. The Structural Seed's `views/` line lacks `card_notes` (the Capability map's FR-17 to FR-19 row already names it), and its `lib/` line lacks both `cardNotes.ts` and `useSearchCount.ts`.
  evidence: `backend/bookvie/views/card_notes.py`, `backend/bookvie/http/api.py` (`card_notes_view`), `backend/bookvie/views/models.py` (`HomeMainBook.card_note_count`), `frontend/src/lib/cardNotes.ts` (`highlightParts`), `frontend/src/lib/useSearchCount.ts`, `frontend/src/pages/BookDetailPage.tsx` (`blockNotes`); the spine-check layer of Story 5.3's build-auto review. The code follows the ATDD contract decided with Oleg (2026-11-10); ARCHITECTURE-SPINE.md is out of date (AGENTS.md → Architecture spine).
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); AD-6's server list has the `card-notes` view's groups (Books with notes, title key then Book id, the `?book=<id>` scope) and Home's `cardNoteCount`, and its client list the `<mark>` highlighting, the client-counted "N notes match." and the first-three cut a search lifts; AD-9's 404 names `views/card-notes?book=<id>`; the Structural Seed's `views/` line lists `card_notes` and its `lib/` line `cardNotes.ts` and `useSearchCount.ts`.

## Deferred from: code review of spec-5-3-find-a-note-across-all-my-books (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-find-a-note-across-all-my-books.md`
  summary: No test checks that `count.cancel()` before Edit (Card notes page, Book detail's block) stops a pending "N notes match." from being announced over the open Card note panel. Removing the cancel would leave every test green, because the tests only check `status` after the save.
  evidence: `frontend/src/pages/CardNotesPage.tsx` (`openEdit`), `frontend/src/pages/BookDetailPage.tsx` (`openNoteEdit`), `frontend/e2e/card-notes.spec.ts` (the two "edit while searching" leaves). Verification-gap layer. Deferred because the e2e is timing-sensitive: revisit it if a shared announce-timing helper lands. The review's spine-check findings are the ones already recorded in the build-auto entry above; there is no new entry for them.
  resolved: 2026-11-10, bmad-testarch-automate for Story 5.3. Playwright's clock, paused before the page loads, makes the pause deterministic: `frontend/e2e/card-notes.spec.ts:737` (Card notes page) and `:766` (Book detail's block). Each fails when its cancel is removed.

## Deferred from: code review of spec-5-4-go-through-a-book-s-notes-as-a-pile (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-4-go-through-a-book-s-notes-as-a-pile.md`
  summary: The pile's reduced-motion return scroll (`scrollBehavior()` gives `'auto'` under `prefers-reduced-motion: reduce`) and its forced-colors styles (the segment's `Highlight` bar, `GrayText` ends) have no e2e test. AC-6's retrying `toBeInViewport` passes whether the scroll is smooth or instant.
  evidence: `frontend/src/lib/usePileFlow.tsx` (`scrollBehavior`), `frontend/src/components/CardNotesPile.module.css`; the verification-gap and blind-hunter layers. Deferred because the spec accepts the gap. A dependable test needs `page.emulateMedia({ reducedMotion: 'reduce' })` with a spy on `scrollIntoView`, and `forcedColors: 'active'` screenshots.
  resolved: 2026-11-10, bmad-testarch-automate for Story 5.4. A `scrollIntoView` spy installed before `goto` records `{ block: 'nearest', behavior: 'smooth' }`, then `'auto'` under `reducedMotion: 'reduce'`: `frontend/e2e/card-notes-pile.spec.ts:774`. Forced colors compare the checked segment's bar with the resolved `Highlight` and a disabled end with `GrayText`: `:834`. Each leaf fails when its production rule is removed (mutation checked, then restored).
- source_spec: `_bmad-output/implementation-artifacts/spec-5-4-go-through-a-book-s-notes-as-a-pile.md`
  summary: EXPERIENCE.md → Pile disagrees with Story 5.4's decisions. It says "The note sits in a polite live region" and quotes "Note 3 of 7, p.42: *text*." with a final period. The pile uses its own `status`, which is empty on open, and adds no period (the ATDD decision). The Focus after close row gives the Card notes page no fallback; the code falls back to the group's "Go through as a pile", then the `h1`, when a search hides the note's Edit.
  evidence: `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:261,396`; `frontend/src/components/CardNotesPile.tsx`, `frontend/src/lib/cardNotes.ts` (`pileAnnouncement`), `frontend/src/lib/usePileFlow.tsx`. Also, DESIGN.md → Pile doesn't show the page ref under the note text in the pile card (`CardNotesPile.tsx`, `styles.ref`), which Oleg chose to keep (code review, 2026-11-10). Blind-hunter and acceptance-auditor layers. Deferred because the fix is a UX doc edit; fold it into the Epic 5 retro's doc reconciliation.
  resolved: `spec-epic-5-retro-item-45-update-the-ux-docs-to-match-story-5-4.md` (Epic 5 retro item 45, 2026-11-11); EXPERIENCE.md → Pile, Role states the pile's own `status`, empty on open (the dialog's description reads the note and "N of M"), and the announcement with no final period; the Focus after close Pile row falls back to that Book's "Go through as a pile", then the page `h1`, on the Card notes page too; DESIGN.md → Pile shows the page ref under the note text.

## Deferred from: code review of spec-pile-arrow-key-navigation (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-pile-arrow-key-navigation.md`
  summary: bmad-build-auto marked this standalone spec `done` before bmad-code-review ran, and its spec rewrite dropped the "Pipeline: ATDD → bmad-build-auto → bmad-code-review → bmad-testarch-automate" note. Build-auto's persistent facts treat any spec with no `story_key` as non-story work and set `done`, although a standalone spec can ask for the full story pipeline (AGENTS.md "Story pipeline"). Fix: when a spec declares the story pipeline, have build-auto end at `in-review`, without needing a `story_key`.
  evidence: commit `c792de6` sets `status: 'done'`; the spec's original Implementation Notes "Pipeline" line (commit `8c313aa`); `_bmad/custom/bmad-build-auto*.toml` persistent facts ("When `story_key` is empty, set the spec `status` to `done`"). Edge-case-hunter and blind-hunter layers. Deferred because the fix edits build-auto's customization (agent context). This review confirmed `done`, so nothing reached a user.
  resolved: `spec-epic-5-retro-item-46-build-auto-ends-in-review-for-pipeline-specs.md` (Epic 5 retro item 46, 2026-11-11); `_bmad/custom/bmad-build-auto.toml` defines a pipeline spec: no `story_key`, and a `- **Pipeline:**` line naming `bmad-code-review` after `bmad-build-auto` (or, before the spec exists, a prompt asking for the story pipeline). It ends at `in-review` with `Status: in-review` under `## Auto Run Result` and no sprint-status write, is parked for bmad-code-review on re-invocation, and step-02 keeps its Pipeline line as the first bullet of `## Design Notes`. Its deferrals reach this file.

## Deferred from: spine reconciliation of spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5 (2026-11-10)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md`
  summary: Spine drift (AD-6, AD-18, AD-19, Capability map preface), found while reconciling Epic 5 and resolved in the same pass so the record stays complete. AD-6 didn't say the pile's shuffle takes an injectable random source (story 5.4), that ties in the Card notes order keep stored order, or that Search card notes matches unnormalised text (E5-R3). AD-18 didn't name the Card note invariant gaps E5-R1 and E5-R2. AD-19's and AD-6's Binds lacked FR-17. The Capability map's preface still gave `views/card_notes` as unbuilt, and the FR-17 to FR-19 row lacked AD-7, AD-9 and AD-19.
  evidence: `frontend/src/lib/cardNotes.ts` (`shuffled`); `backend/bookvie/views/shelf.py` (`card_note_views`); `backend/bookvie/domain/invariants.py:40-45`, `:95-102`; the Blind Hunter review of item 44.
  resolved: `spec-epic-5-retro-item-44-reconcile-the-spine-with-epic-5.md` (Epic 5 retro item 44, 2026-11-10); each is stated in the spine. The invariant gaps themselves stay open as Epic 5 retro item 49.

## Deferred from: review of spec-epic-5-retro-item-46-build-auto-ends-in-review-for-pipeline-specs (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-46-build-auto-ends-in-review-for-pipeline-specs.md`
  summary: bmad-build still marks a pipeline spec `done`. Its "Spec status ownership" fact sets `done` whenever `story_key` is empty, so a spec with a `- **Pipeline:**` line built with bmad-build skips bmad-code-review, which is the PL-2 failure through the other skill.
  evidence: `_bmad/custom/bmad-build.toml` (the spec-status fact). Item 46 changed only `bmad-build-auto.toml`. Item 47 makes bmad-build flag that story work uses build-auto, which steers users away but doesn't guard the status. Fix: mirror the pipeline-spec facts in `bmad-build.toml`, or have bmad-build stop on a pipeline spec.
  resolved: `spec-epic-5-retro-item-47-code-review-in-its-own-session.md` (Epic 5 retro item 47, 2026-11-11); `_bmad/custom/bmad-build.toml` stops at a pipeline spec, as at a story, and points to `bmad-build-auto`. If the user continues anyway, "Spec status ownership" ends a pipeline spec at `in-review`, and "Parked story specs" parks it.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-46-build-auto-ends-in-review-for-pipeline-specs.md`
  summary: bmad-code-review offers "Start the next story" after a pipeline spec reaches `done`, not `bmad-testarch-automate`. Its "Epic boundary" fact replaces option 1 only when `story_key` is set, so the automate step (AGENTS.md "Story pipeline", step 4) can be skipped.
  evidence: `_bmad/custom/bmad-code-review.toml` (the "Epic boundary" fact). Fix: when the spec has a `- **Pipeline:**` line, replace option 1 with **Run test automation**, as for a story that didn't close its epic. Deferred because item 46's change list is build-auto only.


## Deferred from: review of spec-epic-5-retro-item-48-shared-card-note-item (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-48-shared-card-note-item.md`
  summary: No test shows that the Card notes page keeps a long note unclamped. Since item 48, the page shares `CardNoteItem`'s `clamped` switch with Book detail's block, and it relies on the default `clamped = false`.
  evidence: the only clamp test, `frontend/e2e/card-notes-pile.spec.ts:489`, opens Book detail only, and `card-notes.spec.ts` seeds short notes. If the default flipped or `Group` passed `clamped`, no test would fail. Fix: a `[P2]` case that seeds a 10-line note, opens the Card notes page and asserts the paragraph's `scrollHeight <= clientHeight`. Deferred because item 48 froze the e2e specs.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-48-shared-card-note-item.md`
  summary: No test pins each card's **Edit** to the bottom of its cell in Book detail's 3-column grid (`margin-top: auto` on `CardNoteItem.module.css` `.edit`).
  evidence: no e2e compares the list Edit buttons' positions; dropping the rule would misalign Edit in shorter cards unnoticed. This was untested before item 48 too. Fix: a `[P2]` layout case in `card-notes-pile.spec.ts` asserting equal bottom edges for Dune's three seeded notes.

## Deferred from: spec-epic-5-retro-item-49-harden-card-note-invariants (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-5-retro-item-49-harden-card-note-invariants.md`
  summary: Spine drift, AD-18: `check_invariants()` now enforces the Card note rules that the spine lists as known gaps, and Card note ids are unique in the library rather than per Book. Reconcile before the next epic:
  - At l.227, state the `pageEnd` rule (null, or greater than `pageStart`) as enforced (`card_note_page_end_after_start`), and add non-blank `text` (`card_note_text_required`) and trimmed `text` (`card_note_text_trimmed`, as `str.strip()`). Drop the "Known gap" sentence.
  - At l.229, rewrite the bullet: Reading ids are unique within their Book, and Card note ids are unique in the library (`unique_card_note_ids`). Drop its "Known gap" sentence.
  - Startup refuses such a `library.json` too, since startup and restore share `validate_document`.
  evidence: `ARCHITECTURE-SPINE.md:227` ("Known gap: `check_invariants()` doesn't check this, nor a non-blank `text`") and `:229` ("Reading and Card note ids are unique within their Book … Known gap: a Card note id repeated across two Books passes"); `backend/bookvie/domain/invariants.py`.
  resolved: spine reconciliation before Epic 6 (2026-11-11). AD-18's document-shape bullet now states that a Card note's `text` is non-blank and trimmed (`str.strip()`, as both intents store it), and that `check_invariants()` enforces the `pageEnd` rule and both `text` rules (`card_note_page_end_after_start`, `card_note_text_required`, `card_note_text_trimmed`). Restore and startup share `validate_document`, so both refuse such a file. The ids bullet keeps Reading ids unique per Book and makes Card note ids unique in the library (`unique_card_note_ids`). Both "Known gap" sentences are gone.

## Deferred from: Epic 5 retro item 51, the untracked waiting-for-you flake (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-edit-or-delete-a-card-note.md` (Verification, "Flaky test")
  summary: `frontend/e2e/waiting-for-you.spec.ts` "[P1] AC-6 Cancel on a row's Start dialog returns focus to that row's Resume, and nothing is sent" failed once in one `npm run check` during Story 5.2's build and passed in every later run. It was recorded only in that spec's triage (Epic 5 retro PL-6).
  evidence: `spec-5-2…md:227`; `frontend/e2e/waiting-for-you.spec.ts:278`. The failure's output wasn't kept.
  resolved: Epic 5 retro item 51 (2026-11-11). A 30× burn-in (`--repeat-each=30 --retries=0`) reproduced it once in 450 runs: `rowTitles(pane)` read the rows with a one-shot `allTextContents()` that ran before Home had rendered them and got `[]`. The test raced, not the app. `frontend/e2e/home.ts` now has `rowLinks(pane)` (a locator), and every caller in `waiting-for-you.spec.ts`, `side-reads.spec.ts` and `set-up-next.spec.ts` asserts with the retrying `await expect(rowLinks(pane)).toHaveText([...])`. Burn-in after the fix: those three specs at `--repeat-each=30 --retries=0`, 1740 passed.

## Deferred from: build-auto review of spec-6-1-see-when-this-book-will-be-finished (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md`
  summary: Spine drift (AD-6, FR-15 map row), reconciled before the next epic: the spine doesn't record the Book-scope pages left rule or where it lives. An unfinished Reading gives max(pages − currentPage, 0), a Book never started gives all its pages, and only finished Readings give 0. AD-6 should name `domain/progress` `pages_left` on the `book` view with `measuredPace` (story 6.1), and the FR-15 map row should name `views/shelf` (book detail), `lib/pace` and `components/PaceCalculator`.
  evidence: `backend/bookvie/domain/progress.py` (`pages_left`); `backend/bookvie/views/models.py` (`BookDetailView.pages_left`, `measured_pace`); `ARCHITECTURE-SPINE.md` AD-6 and the Capability map's FR-15 row (spine-check review of 6.1).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). AD-6 gains a Pages left bullet: the rule, `domain/progress` `pages_left`, the `book` view's `pagesLeft` and `measuredPace` (story 6.1). The FR-15 map row names `domain/progress`, `views/shelf`, `lib/pace` and `components/PaceCalculator`.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md`
  summary: Spine drift (AD-6), reconciled before the next epic: the Quick pace calculator bullet omits the rules the client now owns. Months = round(days ÷ 30.4375), and years = round(months ÷ 12) from 24 months. Only plain decimals are accepted (no sign, exponent or comma). A finish date out of range gives no result. The prefill is rounded to one decimal and drops ".0". AD-6 should state them, or point to EXPERIENCE.md → Pace calculator, which now records them.
  evidence: `frontend/src/lib/pace.ts` (`paceResult`, `pacePrefill`); `EXPERIENCE.md` → Pace calculator (spine-check review of 6.1).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). AD-6's calculator bullet states the months and years rounding, plain decimals only, no result for an out-of-range finish date, and the one-decimal prefill without ".0", and still points to EXPERIENCE.md → Pace calculator.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md`
  summary: Spine drift (Structural Seed), reconciled before the next epic: the seed's `domain/` line lists progress (percent, current_reading, reading_status) without `pages_left`.
  evidence: `backend/bookvie/domain/progress.py` defines and exports `pages_left` (story 6.1).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The Seed's `domain/` line lists `pages_left` under progress.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md`
  summary: Spine drift (Structural Seed), reconciled before the next epic: the seed's `frontend/src/lib/` line omits `pace` (the calculator's arithmetic and line, AD-6).
  evidence: `frontend/src/lib/pace.ts` is new in story 6.1. `lib/today.ts` now exports `MONTHS` for it.
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The Seed's `lib/` line lists `pace` (+ `.cases.json`).

## Deferred from: code review of spec-6-1-see-when-this-book-will-be-finished (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md`
  summary: No test covers the pace calculator switching to "Nothing left to read." when the Book is finished on its own Book detail page. `PaceCalculator` stays mounted (keyed by `book.id`) and reads `pagesLeft` from the refetched view on every render, so the code is right today; a change that captured `pagesLeft` at mount, as the prefill captures `measuredPace`, would pass every current leaf. Add a leaf in `bmad-testarch-automate` for 6.1: seed `PACED`, open Dune, Mark finished through the Finish dialog, then assert "Nothing left to read." and no textbox in the "How long until…?" region.
  evidence: `frontend/src/components/PaceCalculator.tsx` (`pagesLeft <= 0` branch); `frontend/src/pages/BookDetailPage.tsx:339`; `frontend/e2e/pace-calculator.spec.ts` (every leaf reads `pagesLeft` only at first load).
  resolved: `bmad-testarch-automate` for story 6.1 (2026-11-11). `frontend/e2e/pace-calculator.spec.ts:208` "[P1] finishing a never-started Book from its Book detail turns the result into \"Nothing left to read.\" with no reload" finishes Dune through the Finish dialog and asserts the line, no textbox and no `output`. It fails when `PaceCalculator`'s `pagesLeft <= 0` branch is changed to `< 0`.

## Deferred from: build-auto review of spec-6-2-see-when-my-whole-unread-library-will-be-finished (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: Spine drift (AD-6, FR-15 map row), reconciled before the next epic: the spine doesn't say the catalog view carries the library-scope pages left (the sum of every Book's `pages_left`) and `measuredPace`, or that `CatalogPage` hosts `PaceCalculator` behind "How long until…?". The 6.1 entry above names only the book view; reconcile both together.
  evidence: `backend/bookvie/views/shelf.py` `catalog()` (`pages_left`, `measured_pace`); `frontend/src/pages/CatalogPage.tsx` `LibraryPace`; `ARCHITECTURE-SPINE.md` AD-6 and the Capability map's FR-15 row (Blind Hunter, build-auto review of 6.2).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). AD-6's Pages left bullet says the `catalog` view carries the library's `pagesLeft`, the sum of every Book's, and `measuredPace`. The calculator bullet says Catalog hosts `PaceCalculator` behind "How long until…?", and the FR-15 row names both views.

## Deferred from: code review of spec-6-2-see-when-my-whole-unread-library-will-be-finished (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: No test covers the expanded Catalog calculator following a catalog view refetch. `LibraryPace` reads `pagesLeft` from `view.data` on every render, so the code is right today; a change that captured it on expand would pass every current leaf. Add a leaf in `bmad-testarch-automate` for 6.2: seed `NO_PACE`, expand, type 30, add a Book through New book, then assert the new duration and that "30" stays.
  evidence: `frontend/src/pages/CatalogPage.tsx` `LibraryPace` (l.257-259); `frontend/e2e/catalog-pace-calculator.spec.ts` (every leaf reads `pagesLeft` only at first load).
  resolved: `bmad-testarch-automate` for story 6.2 (2026-11-11). `frontend/e2e/catalog-pace-calculator.spec.ts:264` "[P1] an add on Catalog refetches the view and the expanded calculator counts the new Book, keeping the typed pace" adds Swing Time (300) through New book. It asserts "About 24 days · 21 November", that "30" stays and that the calculator stays expanded. It fails when `LibraryPace` captures `pagesLeft` on mount, and when `PaceCalculator` is keyed by `pagesLeft`.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: Nothing asserts that the expanded calculator comes before the bookcase or list (spec: "inline, directly below that row and before the bookcase or list"). Moving it below `<Bookcase>`/`<CatalogList>` passes every leaf. Add a `compareDocumentPosition` or Tab-order leaf with the calculator expanded in `bmad-testarch-automate` for 6.2.
  evidence: `frontend/e2e/catalog-pace-calculator.spec.ts:103-108` (meter before toggle only); `bookcase-details.spec.ts:72-91` and `bookcase.spec.ts:297` (collapsed only).
  resolved: `bmad-testarch-automate` for story 6.2 (2026-11-11). Bookcase: the expanded Tab order link → field → first spine at `frontend/e2e/catalog-pace-calculator.spec.ts:296`. List: the field comes before the table in document order at `frontend/e2e/catalog-pace-calculator.spec.ts:170`. Both fail when `<LibraryPace>` is moved after the Bookcase/List branch, or when the `output` gets a tab stop.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: Four ATDD green-phase follow-ups are still open: Enter and Space on the toggle with focus kept on it, the never-below-0 clamp at library scope, PAC-UNIT-002's 8100 cases in `pace.cases.json` (30 → 270 days, 17 → 477 days), and the expanded state across a view switch and a revisit. The code is right by construction (native `<button>`, 6.1's pinned `pages_left` clamp, the same `paceResult`, React state). Add the leaves in `bmad-testarch-automate` for 6.2.
  evidence: ATDD checklist "Green-phase follow-ups"; `frontend/src/lib/pace.cases.json` has no 8100 case.
  resolved: `bmad-testarch-automate` for story 6.2 (2026-11-11).
  - Keyboard: `frontend/e2e/catalog-pace-calculator.spec.ts:296` (Enter and Space, focus kept).
  - The library clamp: `backend/tests/test_library_pages_left.py:184`. It calls the views directly, because the store refuses the state; that also makes the clamp defensive only.
  - View switch and in-app revisit: `frontend/e2e/catalog-pace-calculator.spec.ts:330`.
  - PAC-UNIT-002's 8100 cases are retired in the checklist. The shared table is days-only, and 270 and 477 days read in months. AC-2 and AC-3 pin the exact 8,100 lines in the browser.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: The 6.2 ATDD checklist is stale. It still has Piranesi as a never-started Up next at 245 with `pagesLeft` 1710, the leaves "Skipped as committed", and an unchecked Implementation Checklist. The build re-seeded AC-4 to a paused Up next (200, total 1665) and turned every leaf on. `bmad-testarch-automate` for 6.2 should bring it up to date, as 6.1's did (110de76).
  evidence: `_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md:112-114,146-149,245`; `backend/tests/test_library_pages_left.py` (1665).
  resolved: `bmad-testarch-automate` for story 6.2 (2026-11-11). Every line is ticked or retired (0 `[ ]`). The AC-4 seed table and the first assertion now read Piranesi paused at p.45 (200) and 1665. A "Since then (green)" note records the build's activation and re-seed.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md`
  summary: DESIGN.md's contrast table records the library meter only against `shelf-wall`, but on Catalog it now sits on `page`. The fill (`accent`) against `page` is 4.96 (light) / 7.68 (dark), already shown in the focus-ring row, so it passes 3:1. Only the documentation row is missing; add it with the next DESIGN.md pass.
  evidence: `DESIGN.md` contrast table (l.494-495); `frontend/src/pages/CatalogPage.tsx` `LibraryPace` outside the `shelf-wall` card.
  resolved: DESIGN.md pass of Epic 6 retro item 52 (2026-11-11). The non-text contrast table adds `library-meter` fill vs `page` (4.96 / 7.68) and, for symmetry, the decorative track (`line`) vs `page` (1.21 / 1.45), computed from the tokens.

## Deferred from: build-auto review of spec-6-3-see-what-i-finished-in-any-period (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-3-see-what-i-finished-in-any-period.md`
  summary: Spine drift (AD-6, AD-9, Structural Seed and the FR-16 map row), reconciled before the next epic. The spine doesn't record any of these:
  - that the stats view is built (`views/stats`, `frontend/src/lib/stats`), though the map's preface still gives `views/stats` as an example of an unbuilt module;
  - the bucket rule's details: calendar months touched, both ends included; All time from the earliest finish to the latest; `month` with no finishes;
  - Custom's handling in the client: the earlier date sent as `from`, the silent swap, and no request while a field is empty;
  - that the stats view refuses a half range, a value that isn't a date, or a `to` before `from` with 422 `invalid_fields`, while AD-9 names only 404 `book_not_found` as a view refusal.
  evidence: `backend/bookvie/views/stats.py`; `backend/bookvie/http/api.py` `stats_view`; `frontend/src/lib/stats.ts`; `frontend/src/pages/StatsPage.tsx`; `ARCHITECTURE-SPINE.md` AD-6, AD-9, Structural Seed and the Capability map's FR-16 row (spine check, build-auto review of 6.3).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The map preface no longer calls `views/stats` unbuilt; the Seed lists `views/stats` and `lib/stats`. AD-6's Stats view bullet states the bucket rules and the presets. AD-3's pre-checks gain Custom (no request while a field is empty or invalid, the earlier date as `from`, the silent swap; Epic 6 retro F-S2). AD-9 names the stats view's 422 `invalid_fields`. The FR-16 row names the modules and adds AD-3 and AD-9.

## Deferred from: bookvie-new-book skill 2.0.0, the switch to the add-book API (2026-11-11)

- source_spec: `.claude/skills/bookvie-new-book/SKILL.md` (version 2.0.0; no story, decided with Oleg in a Winston discussion)
  summary: Spine drift (AD-3, AD-16), reconciled before the next epic. The cataloging skill no longer drives a browser. It saves a book with one `POST /api/intents/add-book` (multipart, `intent` JSON part plus `cover`), confirms it through `GET /api/views/book`, and reads the catalog through `GET /api/views/catalog` for its duplicate pre-check. The code follows AD-3 (one intent per action) and AD-16 (a header-less local client, which AD-16 already names as "the cataloging agent"). Two descriptive passages are out of date:
  - the Overview's "Browsers (the user's and the cataloging agent's) are clients" should name the agent as an HTTP client of the intent API;
  - the Structural Seed diagram's `AG[agent's automated browser] --> S` node should read as the cataloging skill calling the API.
  FR-2 and AD-17 stay as they are: the New book form must still be fillable by its labels, and the e2e suite still enforces the Agent Label Contract. The skill is now a second client of the add-book intent body (AD-8), so a renamed intent key breaks it; the reconciliation may add one line saying so.
  evidence: `.claude/skills/bookvie-new-book/scripts/add_book.py`; `.claude/skills/bookvie-new-book/scripts/check_catalog.py`; `ARCHITECTURE-SPINE.md` Overview paragraph and the Structural Seed diagram (`AG` node).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The Overview names the cataloging skill as a client calling the HTTP API with no browser; the Seed's `AG` node reads "cataloging skill (HTTP client of the intent API)". AD-8 says the skill is a second client of the `add-book` body, the `catalog` and `book` views and the AD-9 envelope, so a renamed key or code breaks it without failing `check:api`. FR-2 and AD-17 are unchanged.

## Deferred from: build-auto review of spec-6-4-see-my-reading-month-by-month (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-4-see-my-reading-month-by-month.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The spine doesn't record either of these:
  - the stats buckets' rules: `period` is `YYYY-MM` or `YYYY`; buckets come oldest first, one per calendar month (or year) from `from` to `to`, with empty ones as 0 books and 0 pages; and `[]` is only for All time with nothing finished;
  - the Stats bars' client presentation, which AD-6's list of client calculations doesn't name: each fill's height is pages over the range's largest, the chart is `aria-hidden` with a visually hidden table (Period, Books, Pages), and the bar labels read "Jan", with the year on the first bar and each January.
  evidence: `backend/bookvie/views/stats.py` `_period`, `_periods`; `backend/bookvie/views/models.py` `StatsBucket`; `frontend/src/lib/stats.ts` `barShare`, `barLines`, `periodName`; `frontend/src/components/StatsBars.tsx`; `ARCHITECTURE-SPINE.md` AD-6 (spine check, build-auto review of 6.4).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). AD-6's Stats view bullet states `period` (`YYYY-MM` or `YYYY`), oldest first, empty periods as 0 and 0, and `[]` only for All time with nothing finished. AD-6's client list gains the Stats bars (height share, "Jan" labels with the year on the first bar and each January, `aria-hidden` chart with a visually hidden table).

## Deferred from: code review of spec-6-4-see-my-reading-month-by-month (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-4-see-my-reading-month-by-month.md`
  summary: The `StatsBucket.period` and `StatsView.buckets` field docstrings never reach the OpenAPI. `_View` doesn't set `use_attribute_docstrings`, and no view model uses `Field(description=…)`, so `schema.d.ts` still reads `/** Period */`. The `YYYY-MM` / `YYYY` format the client's `splitPeriod` depends on is documented only in Python. Turning the flag on changes every view model's schema, so it is a project-wide choice, not a story fix. The spec's Code Map assumed the docstrings would reach it.
  evidence: `backend/bookvie/views/models.py` `_View`, `StatsBucket`, `StatsView`; `frontend/src/api/generated/schema.d.ts` `StatsBucket` (Blind Hunter and Acceptance Auditor, code review of 6.4). The AD-6 spine drift that this review's Spine Check also found is the build-auto entry above; it is not repeated here.

## Deferred from: spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6 (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6.md`
  summary: Spine drift (Design Paradigm, AD-6, AD-8), found by item 52's review beyond the eight entries. The Paradigm paragraph said every client renders views and showed only the browser. AD-6 didn't name `pace.cases.json` as the table that keeps the calculator's rounding in step with the server's days left. AD-8's skill sentence left out the AD-9 envelope keys and codes the skill reads, and the skill's copied duplicate rule.
  evidence: `.claude/skills/bookvie-new-book/scripts/add_book.py` (`ok`, `ids.bookId`, `error.code`, `duplicates`, `fields`, `message`); `check_catalog.py` ("Applies the same rules as the server's duplicate check"); `frontend/src/lib/pace.test.ts` and `backend/tests/test_pace_calculator.py` both read `pace.cases.json` (Blind Hunter, item 52).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The Paradigm says clients send intents and read views, which the browser renders, and that the skill calls `http/` like the browser. AD-6's calculator bullet names the shared case table. AD-8 lists the envelope keys and codes and records the duplicate rule as a known gap (the entry below).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6.md`
  summary: The cataloging skill's duplicate pre-check (`check_catalog.py`) re-implements `domain/duplicates`' rule (ISBN normalisation, title and author-set match) with no shared check, so a change to the server's rule leaves the skill's pre-check silently different. It only decides what the skill asks the user: the server still refuses a duplicate with 409 `duplicate_book` unless `confirmDuplicate` is sent. A shared case table read by both, as `pageField.cases.json` does for AD-3, would close it. Low.
  evidence: `.claude/skills/bookvie-new-book/scripts/check_catalog.py` docstring and `normalize_isbn`; `backend/bookvie/domain/duplicates.py`. AD-8 records it as a known gap.

## Deferred from: Epic 6 retro item 53, the untracked add-card-note flake (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-6-3-see-what-i-finished-in-any-period.md` (Verification) and `spec-6-4-see-my-reading-month-by-month.md` (Verification)
  summary: `frontend/e2e/add-card-note.spec.ts` "[P1] AC-1 from Book detail: Page is empty with no Reading, and a save returns focus to that Add card note" failed once in Story 6.3's build check and once in Story 6.4's review check, and passed when run alone (5 of 5, 3 of 3). It was recorded only in those two specs (Epic 6 retro PL-4).
  evidence: `spec-6-3…md:272`; `spec-6-4…md:125`; `frontend/e2e/add-card-note.spec.ts:193`. The failures' output wasn't kept.
  resolved: Epic 6 retro item 53 (2026-11-11). A 30× burn-in of the spec alone (`--repeat-each=30 --retries=0`) passed 450 of 450, so the flake needs the full suite's load. The cause was found by a probe instead: the test read the action stack with a one-shot `main.getByRole('button').allTextContents()` right after `page.goto`, before Book detail had rendered, so it got `[]`, both `indexOf` calls returned -1, and the difference was 0, not 1. Delaying the `book` view by 500 ms made it fail every time with exactly that (`Expected: 1, Received: 0`, `add-card-note.spec.ts:206`). The test raced, not the app, the same lesson as item 51. The order check now polls with `expect.poll` until the two buttons are adjacent. `pause.spec.ts:304` had the same one-shot read; it failed the same probe (`Expected: >= 0, Received: -1`) and got the same fix. Both fixed leaves pass under the 500 ms delay. Burn-in after the fix: `add-card-note.spec.ts` and `pause.spec.ts` at `--repeat-each=30 --retries=0`, 1080 passed. A first after-fix burn-in lost 6 runs to `ENOENT` on its own trace files, because another Playwright run started in the same `test-results/` folder; it was re-run with its own `--output` and nothing beside it.

## Deferred from: Epic 6 trace (retro item 54), a new card-notes-pile flake (2026-11-11)

- source_spec: `_bmad-output/test-artifacts/traceability/epic-6-traceability-matrix.md` (Run evidence)
  summary: `frontend/e2e/card-notes-pile.spec.ts:590` "[P2] AC-1 opening and closing the pile leaves the shell's status as it was" failed once in the trace's first `npm run check` (557 passed, 1 failed), with nothing else running. `searchField(main).pressSequentially('spice')` timed out after 15 s: the page snapshot shows the Card notes `h1` only, with no search field, no notes and no "Couldn't load", so the card-notes view's first load never rendered. The test calls `pausedClock(page)` (`page.clock.install` then `pauseAt` 1 s later) before `page.goto`. The same helper is in `card-notes.spec.ts:625`. Suspect: something the first load needs, such as a timer, doesn't run under the paused clock in some runs. Not confirmed. Burn it in (`--repeat-each=30 --retries=0`), find the cause with a probe as items 51 and 53 did, then fix it or close the entry with the run as evidence.
  evidence: The failure's call log and page snapshot, from the trace's first run (`error-context.md` for that test). `card-notes-pile.spec.ts:68` (`pausedClock`), `:590`-`:597`.
  resolved: after the Epic 6 retro items (2026-11-11). Cause confirmed by a probe. TanStack Query hands each query result to React through a global `setTimeout(cb, 0)` (`notifyManager`, `systemSetTimeoutZero`), and `page.clock` fakes it. `pausedClock` paused the clock before `page.goto`, so a first load that answered after the pause took effect was never delivered, and the page kept only its `h1`. Delaying the `card-notes` view by 500 ms failed the test every time with the same signature; the same delay without the paused clock passed. The test raced, not the app. Six tests used the helper: `card-notes.spec.ts` (three) and `card-notes-pile.spec.ts` (three). Both specs now use `openPaused(page, url, loaded)`, which installs the clock, opens the page, waits for a locator that shows the view's data, then pauses a minute ahead (the same day). No other spec pauses the clock. The fixed test passes under the 500 ms delay. Burn-in: both specs at `--repeat-each=30 --retries=0`, own `--output`, nothing beside it, 1500 passed.

## Deferred from: build-auto review of spec-7-1-sort-my-catalog (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-sort-my-catalog.md`
  summary: Spine drift (AD-6, Structural Seed), reconciled before the next epic. The spine doesn't record either of these:
  - AD-6's client presentation names only "catalog sort, using `Intl.Collator`". It doesn't record the four keys (Author, Title, Date added newest first, Pages fewest first), the tie-break chain (title, then `createdAt` older first as instants, then Book id by code unit), or that Home's slice packs its rows in the remembered Catalog sort before `slicePriority` picks them. AD-6's other client rules name their module and story; this one names none (`lib/catalog.ts` `sortBooks`, `lib/catalogSort.ts`, story 7.1).
  - The Seed's `frontend/src/lib/` line omits `catalogSort` (and, before this story, `catalog` and `catalogView`).
  evidence: `frontend/src/lib/catalog.ts` `sortBooks`, `PRIMARY`; `frontend/src/lib/catalogSort.ts`; `frontend/src/pages/HomePage.tsx` `HomeSlice`; `ARCHITECTURE-SPINE.md` AD-6 and Structural Seed (spine check, build-auto review of 7.1).
  resolved: spine reconciliation with Epic 7 (Epic 7 retro item 57, 2026-11-12). AD-6's catalog sort bullet records the four keys, the numeric collator, the tie-break chain (title, `createdAt` older first as instants, Book id by code unit), the remembered choice (AD-15) and Home's slice packing its rows in it before `slicePriority`, naming `lib/catalog.ts` `sortBooks`, `lib/catalogSort.ts`, `components/SortSelect.tsx` and story 7.1. The Seed's `lib/` line names `catalog`, `catalogSort` and `catalogView`.

## Deferred from: code review of spec-7-1-sort-my-catalog (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-sort-my-catalog.md`
  summary: Spine drift (AD-6, Structural Seed), reconciled before the next epic. The code review's spine check confirmed the entry above ("Deferred from: build-auto review of spec-7-1-sort-my-catalog") and found nothing new; reconcile both together.
  evidence: Spine check, code review of 7.1 (2026-11-12): `ARCHITECTURE-SPINE.md` AD-6 and the Structural Seed's `frontend/src/lib/` line are unedited in `a7f8d76..6689ecc`.
  resolved: with the entry above (Epic 7 retro item 57, 2026-11-12).

## Deferred from: build-auto review of spec-7-2-filter-my-catalog (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-filter-my-catalog.md`
  summary: Spine drift (AD-6, Structural Seed), reconciled before the next epic. AD-6's client presentation says only "filter chips". It doesn't record the rules (OR within a group, AND across groups and with Search titles, Read is `finished`, an untagged Book never matches a Tag filter, checked values no Book has are ignored), that the client builds the Language and Tag value lists itself with a `toLocaleLowerCase` key (the server's `merge_tags` uses `casefold`, so ß/SS pairs can differ), or that filters are page state only. The Seed's `frontend/src/lib/` line omits `catalogFilter`, and no entry names `components/FilterChips`.
  evidence: `frontend/src/lib/catalogFilter.ts` (`filterKey`, `filterValues`, `matchesFilters`, `liveFilters`); `frontend/src/components/FilterChips.tsx`; `backend/bookvie/domain/book_fields.py` `merge_tags`; `ARCHITECTURE-SPINE.md` AD-6 and Structural Seed (spine check, build-auto review of 7.2).
  resolved: spine reconciliation with Epic 7 (Epic 7 retro item 57, 2026-11-12). AD-6's filter chips bullet records the rules (OR within a group, AND across groups and with Search titles, Read is `finished`, an untagged Book never matches a Tag filter, checked values no Book has are ignored), the client-built value lists with their `toLocaleLowerCase` key against `merge_tags`' `casefold`, and filters as page state only that never reach Home's slice or the meter, naming `lib/catalogFilter.ts`, `components/FilterChips.tsx` and story 7.2. The Seed's `lib/` line names `catalogFilter`, and its `components/` comment names `FilterChips` and `SortSelect`.

## Deferred from: code review of spec-7-2-filter-my-catalog (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-filter-my-catalog.md`
  summary: Spine drift (AD-6, Structural Seed), reconciled before the next epic. The code review's spine check confirmed the entry above ("Deferred from: build-auto review of spec-7-2-filter-my-catalog"). It also found that the FR-20 row of the Capability → Architecture Map says only "client presentation" and names neither `lib/catalogFilter` nor `components/FilterChips`, while the FR-15 and FR-16 rows name their modules. Reconcile both together.
  evidence: Spine check, code review of 7.2 (2026-11-12): `ARCHITECTURE-SPINE.md` AD-6, the Structural Seed's `frontend/src/lib/` line and the FR-20 map row are unedited in `a63cd01..7d8ce92`.
  resolved: with the build-auto entry above (Epic 7 retro item 57, 2026-11-12). The FR-4, FR-20, FR-24 row of the Capability → Architecture Map names `lib/catalog`, `lib/catalogSort`, `lib/catalogFilter`, `components/SortSelect`, `components/FilterChips` and `pages/CatalogPage`, and `ShelfBook`'s filter fields.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-filter-my-catalog.md`
  summary: Test gaps for the automate step. (1) No e2e test seeds a Language or Tag value whose spellings differ only by case, so nothing checks end to end that the list shows one checkbox with the library-first spelling and that checking it matches both Books. (2) No e2e test checks that focus falls back to Search titles when the filters hide every spine while a spine has focus (the ATDD checklist's green-phase "AC-6 none remain" item).
  evidence: `frontend/src/pages/CatalogPage.tsx` `languages`/`tags` memos; `frontend/src/pages/Bookcase.tsx` `visibleIds`; `frontend/e2e/catalog-filter.spec.ts` (`FILTER_SHELF` has no values that differ only by case).
  resolved: automate run for story 7.2 (2026-11-12). (1) `catalog-filter.spec.ts:655` seeds "Classic" first in library order and "classic" first under the Author sort. It checks one checkbox in the library-first spelling, and that checking it shows both Books. It fails when the Tag values are built from `sorted`. (2) A chip click takes focus in Chromium, so through the UI no spine holds real focus when filters change. `catalog-filter.spec.ts:548` pins that focus stays on the control that hid the last spine. `:582` uses a click that moves no focus, the spec's model of a macOS Safari click: it hides the focused spine and the last one, and focus moves to Search titles. It fails when the fallback is removed. Real WebKit was not run.

## Deferred from: Epic 7 retrospective, behavior check (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-10-see-the-library-as-a-bookcase.md` (spine naming), seen in `epic-7-retro-2026-11-12.md` (Behavior verification, observation d)
  summary: Two editions with the same title and authors get identical spine names ("Dune by Frank Herbert, not read yet"), so a screen reader can't tell them apart on the bookcase. The List view and Book detail do tell them apart. One fix: when two shown spines share a name, add the edition or year to the name. Low.
  evidence: `frontend/src/lib/catalog.ts` `spineName` (`catalog.test.ts:202-217`); reproduced live in the Epic 7 retro's behavior check with Dune ed. 1 (hardcover, 412 pages) and ed. 2 (paperback, 500 pages).
  resolved: `spec-spine-names-tell-editions-apart.md` (2026-11-12). The bookcase names twin spines (equal full names, over every Book, so the name is the same on Catalog under any search or filter and on Home) with "edition N", else the year, else "N pages" between the author part and the status. `ShelfBook` carries `edition`; `spineNames` in `frontend/src/lib/catalog.ts`; EXPERIENCE.md's Spine row states the rule.

## Deferred from: Epic 7 retro item 59, the browser decision (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-filter-my-catalog.md` (Review Findings, the Esc patch) and `spec-epic-7-retro-item-59-write-down-the-browser-decision.md`
  summary: Commit `0383cbc` ("close the filter lists on Esc after a Safari click", story 7.2) focuses the chip and each checkbox on click so that Esc reaches the list in macOS Safari, where a click doesn't focus a button. The Safari behavior it targets was never run in WebKit, and Safari is out of scope (AGENTS.md → Supported browser). Its leaves `catalog-filter.spec.ts:471` and `:582` model a focusless click with `dispatchEvent` in Chromium.
  evidence: Epic 7 retro PL-2; `f711d290` 13:01:20 ("only run in Chromium"); `frontend/src/components/FilterChips.tsx` (`onClick` focusing the chip and checkboxes); the Epic 4 decision under "Deferred from: implementation of spec-4-3-pause-my-main-book".
  resolved: kept as it is (Epic 7 retro item 59, 2026-11-12). Focusing the pressed control on click is also correct in Chromium, the change is small, and both leaves pass. AGENTS.md → Supported browser lists them as kept, not as a precedent. Nothing is left to verify while Chrome is the only supported browser.

## Deferred from: review of spec-epic-7-retro-item-60-blank-language-and-tag-values (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-7-retro-item-60-blank-language-and-tag-values.md`
  summary: Other Book field values that no intent can produce are still accepted by `check_invariants`, so a restored or hand-edited `library.json` can carry them. These are a tag containing a comma, two tags in one Book equal ignoring case, and a blank or untrimmed `title`, `publisher` or author. A comma tag would be split into two on the Book's next edit, because the Edit form joins tags with ", " and `split_tags` splits on ",". A duplicate tag would show twice on Book detail. A padded title changes the Catalog sort and Search titles. Item 60 covered only `language` and tags' whitespace (E7-R1). Rules in the same style (`book_tag_no_comma`, `book_tags_unique`, `book_title_trimmed`, …) with startup and restore cases would close it. Low.
  evidence: `backend/bookvie/domain/book_fields.py` (`parse_book_fields` strips every field and requires title and publisher; `merge_tags`; `split_tags`); `frontend/src/lib/bookDetail.ts:96` (`book.tags.join(', ')`); `backend/bookvie/domain/invariants.py` (no such rules); Blind Hunter, review of item 60.
  resolved: `spec-restore-refuses-dangling-covers-and-odd-book-fields.md` (2026-11-12): `book_title_required`, `book_title_trimmed`, `book_authors_required`, `book_author_required`, `book_author_trimmed`, `book_author_no_semicolon`, `book_publisher_required`, `book_publisher_trimmed`, `book_tag_no_comma` and `book_tags_unique` (casefold, as `merge_tags`), with invariant, startup and restore tests; AD-18 records them. Subtitle, ISBN, year and the spine colors are a separate entry below.

## Deferred from: build-auto review of spec-restore-refuses-dangling-covers-and-odd-book-fields (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-restore-refuses-dangling-covers-and-odd-book-fields.md`
  summary: `subtitle`, `isbn`, `year` and the spine-color fields can still hold values no intent produces (a blank or untrimmed subtitle or ISBN, a malformed ISBN or year, a non-hex color), and `check_invariants` accepts them at startup and restore. Rules in the same style (`book_subtitle_trimmed`, …) with startup and restore cases would close it. Low.
  evidence: `backend/bookvie/domain/book_fields.py` `parse_book_fields` stores subtitle and ISBN trimmed or null and checks the ISBN, Year and Spine color formats; `backend/bookvie/domain/invariants.py` checks none of them. Neither source entry of the spec listed these fields (Blind Hunter, Edge Case Hunter). The real library has no blank or untrimmed subtitle or ISBN (scan, 2026-11-12).

## Deferred from: build-auto review of spec-dialogs-wait-for-a-fresh-home-view (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-dialogs-wait-for-a-fresh-home-view.md`
  summary: Spine drift (AD-7, AD-19), reconciled before the next epic: AD-7's "Dialogs read fresh views" bullet says only the `book` view is fetched after a dialog opens, and its known gap, like the Deferred section's "Stale confirmation guard" trigger, still says the Start and Pause dialogs read the cached home view. The code now waits for a fresh home view in the Start dialog and fetches one on Pause's press. Low.
  evidence: `frontend/src/api/views.ts` (`useFreshHomeView`, `useFetchFreshHomeView`); `frontend/src/components/StartDialog.tsx`; `frontend/src/lib/usePauseFlow.tsx` (`decide`); Spine Check, build-auto review of this spec.
  resolved: spine reconciled before Epic 8 (2026-11-13): AD-7 "Dialogs read fresh views" records the Start dialog's fresh home view and Pause's fetch on press, and Deferred → Stale confirmation guard's trigger now names only a change between that fetch and the intent.

## Deferred from: build-auto review of spec-last-page-finish-opens-for-the-saved-book (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-last-page-finish-opens-for-the-saved-book.md`
  summary: Spine drift (AD-7, AD-19), reconciled before the next epic: AD-7's "Last-page start" bullet records item 36's rule for the start hand-off, but nothing records the page-field save's rule. Home now opens the Finish dialog for the saved Book only when the view rendered after the save still shows it as Main, with no at-last-page check, so a failed refetch still opens it. AD-19's Finishing bullet still says "The client then opens the Finish dialog for that Book (AD-7)" with no condition. Low.
  evidence: `frontend/src/pages/HomePage.tsx` (`lastPageSave`, `openFinish`); `frontend/src/components/PageField.tsx` (`onReachedLastPage(bookId, savedLine)`); Spine Check, build-auto review of this spec.
  resolved: spine reconciled before Epic 8 (2026-11-13): AD-7 "Last-page start" records the page-field save's rule (still Main in the rendered view, no at-last-page check, no other-dialog guard), and AD-19's Finishing bullet points to it.
- source_spec: `_bmad-output/implementation-artifacts/spec-last-page-finish-opens-for-the-saved-book.md`
  summary: The page field's last-page Finish has no other-dialog guard. If a Start or Pause dialog is opened while the save is in flight, the Finish dialog opens on top of it, and Home renders both. This predates the change, since the old `openFinish` also set `finishing` unconditionally. Item 36's start path drops its hand-off in that case. Low; found by reading, not reproduced.
  evidence: `frontend/src/pages/HomePage.tsx`: the item-36 block checks `otherDialog`, and the `lastPageSave` block does not.

## Deferred from: build-auto review of spec-spine-names-tell-editions-apart (2026-11-12)

- source_spec: `_bmad-output/implementation-artifacts/spec-spine-names-tell-editions-apart.md`
  summary: Spine drift (AD-6), reconciled before the next epic: AD-6's list of client presentation rules doesn't name `lib/catalog` `spineNames` (twin spine names over every Book, so Catalog and Home agree whatever the search, filter or slice), and the FR-4 row of the Capability → Architecture Map doesn't list `ShelfBook.edition` next to `type`, `language` and `tags`.
  evidence: Spine check of the build-auto review (2026-11-12); `ARCHITECTURE-SPINE.md` is unedited by the change; `frontend/src/pages/Bookcase.tsx` `spineNames(books)`, `backend/bookvie/views/models.py` `ShelfBook.edition`.
  resolved: spine reconciled before Epic 8 (2026-11-13): AD-6's client presentation names `spineName`/`spineNames` over every Book (bookcase, Home's slice and the Tiles view share names), and the FR-4 map row lists `ShelfBook.edition`.
- source_spec: `_bmad-output/implementation-artifacts/spec-spine-names-tell-editions-apart.md`
  summary: The finish line and status ("Finished Dune."), the Spine popover heading and the Start dialog name a Book by title only, so two editions still sound alike there, although their spines are now told apart. Low.
  evidence: `frontend/src/lib/catalog.ts` `finishLine` and `finishStatus` take only the title; pre-existing, outside the spine-name fix.

## Deferred from: build-auto review of spec-8-1-see-my-catalog-as-covers (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md`
  summary: A tile's visible caption (title, then the first author on its own line) isn't a contiguous word run of the link's accessible name, the spine's name ("Dune by Frank Herbert, not read yet"), so axe's `label-content-name-mismatch` (WCAG 2.5.3, Label in Name) flags every tile. DESIGN.md (caption: first author only, no "by") and EXPERIENCE.md (name: the spine's name) together can't satisfy the rule; a visually hidden " by " doesn't help, since axe reads only on-screen text. The build disabled that one rule for the Tiles pass of the Catalog axe test. Options: show "by" in the caption, drop the author from the visible caption's text run, or accept the finding. Needs a design decision. Medium.
  evidence: `frontend/e2e/catalog-pace-calculator.spec.ts` (`disableRules(['label-content-name-mismatch'])` for `tiles`); `frontend/src/pages/CatalogTiles.tsx` (the caption); `axe-core` `isLabelContainedInName`.
  decision: code review of Story 8.1 (2026-11-13): Oleg accepted it as designed. A single-user app whose user doesn't use voice control; the caption stays title + first author (DESIGN.md), and `label-content-name-mismatch` stays off for the tile links only. Reopen only if Oleg asks.
- source_spec: `_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md`
  summary: Spine drift (AD-6, AD-15, Structural Seed, Capability map FR-25, Deferred → Cover thumbnails), reconciled before the next epic. The spine still calls the Tiles view planned and not built. It writes the cover URL as `/media/covers/<coverFile>`, although `coverFile` is the stored `covers/<name>` served at `/media/<coverFile>` (as in Home's and Book detail's views). It lists only Bookcase · List for `lib/catalogView` in the Seed, omits `pages/CatalogTiles`, and doesn't record that Epic 8's cover speed check passed (median 58 ms, zero layout shift). Low.
  evidence: ARCHITECTURE-SPINE.md lines 102, 382, 395-396 and 415; `backend/bookvie/views/models.py` `ShelfBook.cover_file`; `frontend/src/pages/CatalogTiles.tsx` (`coverSrc`); `frontend/src/lib/catalogView.ts` (spine check, build-auto review of Story 8.1).
  resolved: Epic 8 retro item 61 (2026-11-13): AD-6's Tiles bullet is built and gives the cover as `/media/<coverFile>` with `coverFile` the stored `covers/<name>`; the Seed's `lib/` line names Bookcase · List · Tiles for `catalogView` and the `pages/` line names `CatalogTiles`; the FR-25 map row is built; Deferred → Cover thumbnails records the passed check (median 58 ms, zero layout shift). AD-15's Binds already named Tiles, and AD-12's `/media/covers/<file>` (a bare name) was already right.

## Deferred from: code review of spec-8-1-see-my-catalog-as-covers (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md`
  summary: Nothing tests the Tiles forced-colors rules: the loading box's and the cover's `CanvasText` hairlines, and the `Highlight` focus and highlight rings on the cover box. Deleting the `@media (forced-colors: active)` block in `CatalogTiles.module.css` leaves every test green. For `bmad-testarch-automate`: the ATDD checklist's open "E2E, AC-4 forced colors" item, a `catalog-tiles.spec.ts` leaf with `emulateMedia({ forcedColors: 'active' })` reusing `coverBox` and AC-4's held route. Low.
  evidence: `frontend/src/pages/CatalogTiles.module.css:120`; no `forcedColors` in `frontend/e2e/catalog-tiles.spec.ts` or the Tiles axe pass (Verification Gap layer, code review of Story 8.1).
  resolved: bmad-testarch-automate for Story 8.1 (2026-11-13): `frontend/e2e/catalog-tiles-automate.spec.ts:244` (the `CanvasText` hairlines, loading and loaded) and `:274` (the `Highlight` focus and highlight rings), each failing when its forced-colors rule is removed.
- source_spec: `_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md`
  summary: `epic-8-context.md`'s Covers line (and Story 8.1's Code Map) writes the cover URL as `/media/covers/<coverFile>`; `coverFile` is the stored `covers/<name>`, and `lib/bookDetail.ts` `coverSrc` builds `/media/<coverFile>`, which is right. Fix it with the Epic 8 spine reconciliation, next to AD-6's same wording (the spine drift entry above), so Stories 8.2 and 8.3 don't copy it. Low.
  evidence: `_bmad-output/implementation-artifacts/epic-8-context.md` (Covers, Source); `frontend/src/lib/bookDetail.ts:75` (Blind Hunter and Acceptance Auditor, code review of Story 8.1).
  resolved: Epic 8 retro item 61 (2026-11-13): `epic-8-context.md`'s Covers line now reads `/media/<coverFile>`. Story 8.1's spec is a closed story record and stays as written; Stories 8.2 and 8.3 kept `coverSrc` and built no cover URL.

## Deferred from: build-auto review of spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md`
  summary: Spine drift (AD-6, Capability map FR-25), reconciled before the next epic. The spine still calls the Tiles view "Epic 8, planned" and the FR-25 row "not built", while Stories 8.1 and 8.2 have built the tiles, the finished ribbon and the reading bar. Low.
  evidence: ARCHITECTURE-SPINE.md AD-6 Tiles bullet and the FR-25 map row; `frontend/src/pages/CatalogTiles.tsx` (`Ribbon` from `finished`, `ReadingBar` from `percent` as is) (spine check, build-auto review of Story 8.2).
  resolved: Epic 8 retro item 61 (2026-11-13): AD-6 no longer calls the Tiles view planned, and the FR-25 map row is built and names `pages/CatalogTiles` (ribbon, reading bar).

## Deferred from: build-auto review of spec-8-3-give-books-without-a-cover-a-typeset-cover (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-3-give-books-without-a-cover-a-typeset-cover.md`
  summary: Spine drift (AD-6), reconciled before the next epic. AD-6's Tiles bullet lists what a tile reads from the catalog view (packing, the ribbon from `finished`, the bar from `percent`, the name, the cover URL) and says nothing of Story 8.3's typeset cover, its read = `finished` rule, or the failed-cover fallback. The code follows AD-6 (client presentation only). Low.
  evidence: ARCHITECTURE-SPINE.md AD-6 Tiles bullet; `frontend/src/pages/CatalogTiles.tsx` `TypesetCover` (reads `finished`, `spineColor`, `title`, `firstAuthor` as is) (spine check, build-auto review of Story 8.3).
  resolved: Epic 8 retro item 61 (2026-11-13): AD-6's Tiles bullet adds the typeset cover (read = `finished`: the exact `spineColor` with a plate; unread: `spine-unread-*`, no plate), the failed-cover fallback, and that it applies in Tiles only.

## Deferred from: code review of spec-8-3-give-books-without-a-cover-a-typeset-cover (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-3-give-books-without-a-cover-a-typeset-cover.md`
  summary: Nothing tests the typeset cover's `overflow: hidden` guard. Removing it from `.typeset` leaves every leaf green, because at default fonts the plate never reaches the box bottom; under a large minimum font or user text spacing the plate would paint over the reading bar and caption unnoticed. For `bmad-testarch-automate`: an `[automate]` leaf in `catalog-typeset-covers.spec.ts` with a large-font / text-spacing stylesheet (as in `bookcase-details.spec.ts:43-45`) asserting the plate's paint stays inside the 2:3 box. Low.
  evidence: `frontend/src/pages/CatalogTiles.module.css` `.typeset` (`overflow: hidden`); no font-size or text-spacing override in the Tiles specs (Verification Gap layer, code review of Story 8.3).
  resolved: bmad-testarch-automate for Story 8.3 (2026-11-13): `frontend/e2e/catalog-typeset-covers-automate.spec.ts:175` (a 120px font on the box text; every caption line and the bar slot hit-test outside the box), failing when `overflow: hidden` is removed from `.typeset`.

## Deferred from: Epic 8 retrospective (2026-11-13)

- source_spec: `_bmad-output/implementation-artifacts/spec-8-3-give-books-without-a-cover-a-typeset-cover.md`
  summary: Two editions of a Book without a cover look identical in Tiles: the typeset cover and the caption show the same title and first author, and only the link's accessible name carries the edition. It extends the twin-names entry above (finish line, popover heading and Start dialog name a Book by title only) to the visible tiles. Low.
  evidence: `frontend/src/pages/CatalogTiles.tsx:69-72,186-189`; the Epic 8 retro behavior check (two Persuasion editions) and E8-R5 in `epic-8-retro-2026-11-13.md`.

## Deferred from: review of spec-epic-8-retro-item-64-no-tree-wide-git-state-changes-in-story-steps (2026-11-14)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-8-retro-item-64-no-tree-wide-git-state-changes-in-story-steps.md`
  summary: The ban on tree-wide git commands is prose only. A `permissions.deny` list (`Bash(git stash:*)`, `Bash(git restore:*)`, `Bash(git reset:*)`, `Bash(git clean:*)`, `Bash(git checkout -- *)`) or a PreToolUse Bash hook in `.claude/settings.json` would enforce it, subagents included. It would also block those commands outside story steps, so the call is Oleg's. Medium.
  evidence: Epic 8 PL-2 was stopped by the auto-mode classifier, not by an instruction; `.claude/settings.json` has hooks (`tea-enforce.cjs`) but no git deny rule (Blind Hunter, review of item 64).
