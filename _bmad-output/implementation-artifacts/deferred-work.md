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
  evidence: `backend/bookvie/views/models.py` `_View`, `StatsBucket`, `StatsView`; `frontend/src/api/generated/schema.d.ts` `StatsBucket` (Blind Hunter and Acceptance Auditor, code review of 6.4). The AD-6 drift that this review's Spine Check also found is the build-auto entry above (resolved by Epic 6 retro item 52); it is not repeated here.

## Deferred from: spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6 (2026-11-11)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6.md`
  summary: Spine drift (Design Paradigm, AD-6, AD-8), found by item 52's review beyond the eight entries. The Paradigm paragraph said every client renders views and showed only the browser. AD-6 didn't name `pace.cases.json` as the table that keeps the calculator's rounding in step with the server's days left. AD-8's skill sentence left out the AD-9 envelope keys and codes the skill reads, and the skill's copied duplicate rule.
  evidence: `.claude/skills/bookvie-new-book/scripts/add_book.py` (`ok`, `ids.bookId`, `error.code`, `duplicates`, `fields`, `message`); `check_catalog.py` ("Applies the same rules as the server's duplicate check"); `frontend/src/lib/pace.test.ts` and `backend/tests/test_pace_calculator.py` both read `pace.cases.json` (Blind Hunter, item 52).
  resolved: spine reconciliation before Epic 7 (Epic 6 retro item 52, 2026-11-11). The Paradigm says clients send intents and read views, which the browser renders, and that the skill calls `http/` like the browser. AD-6's calculator bullet names the shared case table. AD-8 lists the envelope keys and codes and records the duplicate rule as a known gap (the entry below).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-6-retro-item-52-reconcile-the-spine-with-epic-6.md`
  summary: The cataloging skill's duplicate pre-check (`check_catalog.py`) re-implements `domain/duplicates`' rule (ISBN normalisation, title and author-set match) with no shared check, so a change to the server's rule leaves the skill's pre-check silently different. It only decides what the skill asks the user: the server still refuses a duplicate with 409 `duplicate_book` unless `confirmDuplicate` is sent. A shared case table read by both, as `pageField.cases.json` does for AD-3, would close it. Low.
  evidence: `.claude/skills/bookvie-new-book/scripts/check_catalog.py` docstring and `normalize_isbn`; `backend/bookvie/domain/duplicates.py`. AD-8 records it as a known gap.
  resolved: Story 12.8 (2026-11-20). `check_catalog.py` is deleted, with `add_book.py`. The skill checks the catalog with the `find_book` agent tool, which lists likely matches and doesn't claim to be the duplicate rule, and the only duplicate rule it relies on is the server's own: `add_book` refuses with `duplicate_book` and its `duplicates` unless `confirmDuplicate: true` is sent. `backend/tests/test_new_book_skill.py` pins that the scripts are gone and nothing in the skill's folder names them.

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

## Deferred from: review of spec-epic-8-retro-item-65-one-module-for-the-tiles-e2e-helpers (2026-11-14)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-8-retro-item-65-one-module-for-the-tiles-e2e-helpers.md`
  summary: No kept test guards the stricter `coversLoaded` (`frontend/e2e/tiles.ts`). Dropping `images.length > 0` or the `opacity === '1'` clause would bring back E8-R2's early pass, and no leaf would fail, because every caller seeds a cover that eventually loads. A kept probe spec with an empty grid, a held transparent cover and a loaded one would catch that. The repo has no tests of its own e2e helpers yet, so this is a new pattern. Low.
  evidence: item 65's verification was a one-time `covers-loaded.probe.spec.ts`, removed afterwards (spec Implementation Notes). `grep -rn coversLoaded frontend/e2e` finds only the definition, the re-export and its callers (Verification Gap layer, review of item 65).

## Deferred from: code review of spec-9-1-save-a-card-note-with-cmd-enter (2026-11-14)

- source_spec: `_bmad-output/implementation-artifacts/spec-9-1-save-a-card-note-with-cmd-enter.md`
  summary: For Story 9.2. A held Cmd+Enter auto-repeats, and `saveFromKeys` calls `requestSubmit()` on every repeat. `save()`'s `inFlight` guard drops repeats only while a request is out, so once a 422 or couldn't-save returns, the next repeat sends the request again. In 9.1 only refused requests repeat, because a success closes the panel. With 9.2's Add another the panel stays open after a save, so a held key would save duplicate notes. 9.2 must ignore `event.repeat`, or otherwise guarantee one note per press. The epic context's "pressed twice or held gives one note" test risk covers it. Low in 9.1.
  evidence: `frontend/src/components/CardNotePanel.tsx:136-141` (`saveFromKeys`, no `event.repeat` check); the spec's Residual risks (Edge Case Hunter + Blind Hunter, code review of Story 9.1).
  resolved: Story 9.2, `frontend/src/components/CardNotePanel.tsx` `saveFromKeys` ignores `event.repeat`; held Meta+Enter leaf in `frontend/e2e/card-note-add-another.spec.ts` (AC-3).
- source_spec: `_bmad-output/implementation-artifacts/spec-9-1-save-a-card-note-with-cmd-enter.md`
  summary: For Story 9.2's ATDD. `epic-9-context.md` Test risks still says "Use Playwright `ControlOrMeta+Enter`, plus one explicit `Control+Enter` test". 9.1's ATDD rejected that: `ControlOrMeta` presses Control on Linux CI, so Meta would go untested there. It presses `Meta+Enter` and `Control+Enter` by name instead. Update the context, or have 9.2's ATDD follow 9.1's checklist. Low.
  evidence: `_bmad-output/implementation-artifacts/epic-9-context.md:25`; `_bmad-output/test-artifacts/atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md` Test Strategy (Blind Hunter, code review of Story 9.1).
  resolved: Story 9.2, ATDD (`_bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md` Preflight): the 9.2 leaves press `Meta+Enter` and `Control+Enter` by name, as 9.1's checklist does.
- source_spec: `_bmad-output/implementation-artifacts/spec-9-1-save-a-card-note-with-cmd-enter.md`
  summary: Spine drift (Capability → Architecture Map FR-17 to FR-19 row, Structural Seed `lib/`, AD-15), reconciled before the next epic. The map, whose heading says "Every row below is built", names `components/CardNotePanel` "(keyboard save, Add another) with `lib/cardNoteAddAnother`". The Seed lists `cardNoteAddAnother` as a `lib/` module, and AD-15 lists the Card note panel's Add another among the `localStorage` preferences. None of these exists after Story 9.1. The spine got ahead of the code in `450510a`; Story 9.2 is planned to build them. If 9.2 doesn't, reconcile the spine at the Epic 9 retro. Low.
  evidence: ARCHITECTURE-SPINE.md:210, :212, :382, :402; no `frontend/src/lib/cardNoteAddAnother.ts` (Spine Check, code review of Story 9.1).
  resolved: Story 9.2, `frontend/src/lib/cardNoteAddAnother.ts` and the Add another checkbox in `frontend/src/components/CardNotePanel.tsx` now exist as the spine describes; no spine edit needed.
- source_spec: `_bmad-output/implementation-artifacts/spec-align-select-arrow.md`
  summary: Add an e2e check that the select chevron sits --space-3 from the right in both themes and falls back to the native arrow under forced colors.
  evidence: The arrow fix has only manual screenshot verification; nothing stops a `background` shorthand from wiping the chevron again.

## Deferred from: build-auto review of spec-10-1-reverse-the-catalog-order (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-10-1-reverse-the-catalog-order.md`
  summary: Spine drift (AD-6, Structural Seed, Capability map FR-4/FR-20/FR-24 row), reconciled before the next epic. The spine marks the catalog sort's reversal and `SortDirectionToggle` "Story 10.1, planned". Story 10.1 built it. The toggle renders inside `SortSelect`'s `role="group"`, which owns the "Sort" label; the spine doesn't say where it goes (it only lists it among Catalog's toolbar components), so placement needs no spine edit. "After `SortSelect` in `CatalogPage`" came from `catalog-sort-direction-plan-2026-11-15.md:61` and `epic-10-context.md`, not the spine (corrected in the code review of Story 10.1). The rules (only the primary compare flips, `bookvie.catalogSortReversed`, reset on a key change, Home's slice follows) match the code. Low.
  evidence: ARCHITECTURE-SPINE.md lines 98, 383 and 395; `frontend/src/components/SortSelect.tsx` renders `SortDirectionToggle` (spine check and intent audit, build-auto review of Story 10.1).
  resolved: Epic 10 retro item 72 (2026-11-16): AD-6's catalog sort bullet, the Seed's `components/` line and the FR-4/FR-20/FR-24 map row no longer call the reversal or `SortDirectionToggle` planned; AD-6 names `components/SortDirectionToggle.tsx` and story 10.1. Placement stays out of the spine, as the entry says.

## Deferred from: code review of spec-10-1-reverse-the-catalog-order (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-10-1-reverse-the-catalog-order.md`
  summary: Spine drift (AD-15), reconciled before the next epic. AD-15 says a missing or junk `bookvie.catalogSortReversed`, or a stored `bookvie.catalogSort` that isn't one of the four, reads as not reversed. The code also reads not reversed when no key is stored at all (`readCatalogSortReversed` requires a valid stored key, where Author is only a fallback), so `reverse()` in `CatalogPage` stores the shown key along with the reversal. The code follows the spec; AD-15 should say both. Low.
  evidence: `frontend/src/lib/catalogSort.ts` `readCatalogSortReversed`; `frontend/src/pages/CatalogPage.tsx` `reverse()`; the e2e leaf "[P1] AC-6 a reversal made with nothing stored survives a reload…" (spine check, code review of Story 10.1).
  resolved: Epic 10 retro item 72 (2026-11-16): AD-15 now says that no stored sort key at all also reads as not reversed (Author is then only the fallback), so reversing stores the shown key too.

## Deferred from: implementation of spec-epic-10-retro-item-73-one-module-for-the-copied-e2e-helpers (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-10-retro-item-73-one-module-for-the-copied-e2e-helpers.md`
  summary: Item 73 moved the named copies of `bookId`, `sortSelect` and the DESIGN.md colors into `frontend/e2e/library.ts`, but copies written inline remain. Accent, surface-inset, ink-tertiary, ink and spine-unread-text appear as `rgb(…)` literals inside `catalog-empty.spec.ts`, `backup.spec.ts`, `app-shell.spec.ts`, `restore.spec.ts` and `book-states.spec.ts`. `bookcase-details.spec.ts` builds the Sort select's locator inline, and `finish-moment.spec.ts` builds the `bookId` id template inline (with `n + 1`). A token change still has to find these by hand. Low.
  evidence: they existed before item 73, whose name-based grep can't see an inline literal (Blind Hunter, review of item 73). Fix: replace each literal with the `library.ts` import, and add `library.ts` constants for the dark twins that are still copied across files (`ACCENT_SOFT*`, `SPINE_UNREAD_TEXT_DARK`).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-10-retro-item-73-one-module-for-the-copied-e2e-helpers.md`
  summary: The colors in `frontend/e2e/library.ts` are typed by hand. Nothing checks them against `frontend/src/styles/tokens.css`, so after a token change the e2e expectations could go stale without any test failing. A small leaf could compare each `library.ts` color with its `--color-*` value in `tokens.css`, the way `app-shell.spec.ts` compares `tokens.css` with DESIGN.md. Medium, unverified.
  evidence: a new check, outside item 73's move-only intent (Blind Hunter, review of item 73). The idea would be proven worth doing if a token change ever left an e2e color constant stale.

## Deferred from: build-auto review of spec-11-1-a-favicon-for-bookvie (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md`
  summary: Spine drift (AD-16, Structural Seed `public/`), reconciled before the next epic. AD-16's Favicon bullet still reads "(Epic 11, planned)" and the Seed lists `public/` as "favicon.svg, favicon-dev.svg (planned)". Story 11.1 built the production half: the dedicated `GET`/`HEAD` `/favicon.svg` route before the SPA catch-all (`image/svg+xml`, `Cache-Control: no-cache`), `frontend/public/favicon.svg` and the one icon link in `index.html`. The dev half (`favicon-dev.svg`, the `--dev` switch, the Vite proxy) is Story 11.2's, so the bullet stays partly planned until then. Low.
  evidence: ARCHITECTURE-SPINE.md:230 and :387; `backend/bookvie/http/app.py` `favicon` route; `frontend/public/favicon.svg` (spine check, build-auto review of Story 11.1).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-16 Favicon bullet cites stories 11.1 and 11.2 and names the `GET`/`HEAD` route; Seed `public/` drops "(planned)" in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md`
  summary: Spine drift (Consistency Conventions → Testing row, Structural Seed "Build and install"), reconciled before the next epic. The spine describes the install smoke test as build, `uv tool install`, start, load `/`, proving the SPA is in the installed tool. It now also fetches `/favicon.svg` from the installed wheel and checks 200, `image/svg+xml` and the built file's bytes. An extension, not a contradiction. Low.
  evidence: `scripts/smoke.mjs` (the `/favicon.svg` block after the SPA routes) (spine check, build-auto review of Story 11.1).
  resolved: Epic 11 retro item 75 (2026-11-17): the Testing row and Seed "Build and install" name the smoke test's favicon checks in ARCHITECTURE-SPINE.md.

## Deferred from: code review of spec-11-1-a-favicon-for-bookvie (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md`
  summary: Spine drift (AD-16, Capability → Architecture Map), reconciled before the next epic. The map's preamble still reads "Every row below is built, except FR-26 and FR-27 (Epic 11, planned)", and the FR-26 row lists `GET /favicon.svg` in `http/` and `frontend/public/` favicons, which Story 11.1 built. The rest of FR-26 (dev defaults, `app_info` `mode`, the Vite proxy, the DEV pill, the title prefix) is Stories 11.2 to 11.4's. Neither of the build's two spine drift entries names the map. Low.
  evidence: ARCHITECTURE-SPINE.md:399 and :415; `backend/bookvie/http/app.py` `favicon` route; `frontend/public/favicon.svg` (spine check, code review of Story 11.1).
  resolved: Epic 11 retro item 75 (2026-11-17): the Capability map preamble reads "Every row below is built." in ARCHITECTURE-SPINE.md.

## Deferred from: build-auto review of spec-11-2-keep-development-apart-from-the-real-library (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: Spine drift (AD-6, "App info" bullet), reconciled before the next epic. The bullet still reads "(Epic 11, planned)"; Story 11.2 built `GET /api/views/app-info` (`views/app_info.py` `AppInfoView`, the route in `http/api.py`, `app.state.app_info` from `create_app`, `version`/`commit` passed by the CLI because `views` can't import the package's top level). Low.
  evidence: ARCHITECTURE-SPINE.md:98; `backend/bookvie/views/app_info.py`, `backend/bookvie/http/api.py` `app_info_view` (spine check, build-auto review of Story 11.2).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-6 App info cites story 11.2 and names `app.state.app_info` and the CLI passing `version` and `commit` in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: Spine drift (AD-7, "App info is an ordinary view"), reconciled before the next epic. The line still reads "(Epic 11, planned)"; Story 11.2 built the client half (`useAppInfo` keyed `['view','app-info']`, read by `AppShell.tsx` and `lib/page.ts`). The version comparison and update notice stay planned for Stories 11.3 and 11.4. Low.
  evidence: ARCHITECTURE-SPINE.md:121; `frontend/src/api/views.ts` `useAppInfo` (spine check, build-auto review of Story 11.2).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-7 App info cites stories 11.2 to 11.4 and names its readers (`AppShell`, `lib/page`, About this copy, `UpdateNotice`) in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: Spine drift (AD-16, "Binding" and "Real library refused" bullets), reconciled before the next epic. Both still read "(Epic 11, planned)"; Story 11.2 built them in `cli.py` (`DEV_PORT`, `DEV_DATA_DIR`, defaults filled after parsing, `_refuses_real_library` through `instance.same_folder` so case variants and firmlinks are refused too, exit 2 before the lock or store). The spine says "resolved"; the code also compares by file identity. Low.
  evidence: ARCHITECTURE-SPINE.md:223, :224; `backend/bookvie/cli.py` (spine check, build-auto review of Story 11.2).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-16 Binding cites story 11.2; Real library refused records the file-identity comparison (`instance.same_folder`) and item 76's case-insensitive fallback in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: Spine drift (Structural Seed `views/`), reconciled before the next epic. The Seed lists "app_info (planned)"; `backend/bookvie/views/app_info.py` now exists. Low.
  evidence: ARCHITECTURE-SPINE.md:382 (spine check, build-auto review of Story 11.2).
  resolved: Epic 11 retro item 75 (2026-11-17): the Seed's `views/` lists `app_info` without "(planned)" in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: Spine drift (AD-16 Favicon bullet and Seed `public/`; Capability map FR-26 row; Testing row and Seed "Build and install"), reconciled before the next epic. These extend the Story 11.1 entries above: 11.2 finished the dev half of the favicon (`favicon-dev.svg`, the route's `--dev` switch, the Vite `/favicon.svg` proxy), the whole FR-26 row is now built (only FR-27 stays planned), and `scripts/smoke.mjs` also checks that the installed package carries `static/favicon-dev.svg` with the built file's bytes. Low.
  evidence: ARCHITECTURE-SPINE.md:230, :297, :346, :387, :399, :415; `frontend/public/favicon-dev.svg`, `frontend/vite.config.ts`, `scripts/smoke.mjs` (spine check, build-auto review of Story 11.2).
  resolved: Epic 11 retro item 75 (2026-11-17): ARCHITECTURE-SPINE.md marks AD-16 Favicon and Seed `public/` built, has no Epic 11 exception in the map preamble, and adds the installed `favicon-dev.svg` check to the Testing row and Seed "Build and install"; the FR-26 row names `instance.same_folder` and the SPA catch-all's icon exclusion.

## Deferred from: code review of spec-11-2-keep-development-apart-from-the-real-library (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md`
  summary: The case-variant refusal of the real library is never exercised in CI. The `case` form of `test_dev_refuses_the_real_library_before_the_lock_or_the_store` and `test_instance.py` `test_same_folder_sees_case_variant` skip on a case-sensitive disk, and every CI job runs on ubuntu-latest, so a revert of `_refuses_real_library` to a resolved-path comparison would pass CI. They run in the local `npm run check` on macOS, which is the gate today. If CI becomes the gate, add a disk-independent leaf (fake `os.path.samefile`, assert exit 2). Low.
  evidence: `backend/tests/test_dev_mode.py:144`, `backend/tests/test_instance.py:269`, `.github/workflows/test.yml` (verification gap, code review of Story 11.2).

## Deferred from: build-auto review of spec-11-3-show-the-version-on-the-backup-page (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-3-show-the-version-on-the-backup-page.md`
  summary: Spine drift (AD-6, AD-7, AD-8, Capability → Architecture Map, FR-27 row and preamble), reconciled before the next epic. The preamble still reads "Every row below is built, except FR-26 and FR-27 (Epic 11, planned)", which covers the FR-27 row's `pages/BackupPage` About this copy (the row itself doesn't say "planned"); Story 11.3 built the card, with its line rules in a new `lib/aboutThisCopy` (`versionLine`, `folderLine`) that the row doesn't name. Low.
  evidence: ARCHITECTURE-SPINE.md:399, :416; `frontend/src/pages/BackupPage.tsx`, `frontend/src/lib/aboutThisCopy.ts` (spine check, build-auto review of Story 11.3).
  resolved: Epic 11 retro item 75 (2026-11-17): the map preamble has no Epic 11 exception; the FR-27 row names `lib/aboutThisCopy` in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-3-show-the-version-on-the-backup-page.md`
  summary: Spine drift (Structural Seed `frontend/src/lib/`), reconciled before the next epic. The Seed lists the client-rule and presentation modules in `lib/` but not `aboutThisCopy`, which builds Backup's two About this copy lines from the `app-info` view. Low.
  evidence: ARCHITECTURE-SPINE.md:392; `frontend/src/lib/aboutThisCopy.ts` (spine check, build-auto review of Story 11.3).
  resolved: Epic 11 retro item 75 (2026-11-17): the Seed's `lib/` lists `aboutThisCopy` in ARCHITECTURE-SPINE.md.

## Deferred from: code review of spec-11-3-show-the-version-on-the-backup-page (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-3-show-the-version-on-the-backup-page.md`
  summary: Spine drift (AD-6 "App info" bullet, AD-7 "App info is an ordinary view"), reconciled before the next epic. Both still read "(Epic 11, planned)". This extends the Story 11.2 AD-6 and AD-7 entries above: Story 11.3 is a second consumer of `useAppInfo`, the Backup page's About this copy card (shown only while the view has data, kept after a failed refetch, line rules in `lib/aboutThisCopy`), so the reconciliation should mark it built and leave only Story 11.4's version comparison and update notice planned. Low.
  evidence: ARCHITECTURE-SPINE.md:98, :121; `frontend/src/pages/BackupPage.tsx`, `frontend/src/lib/aboutThisCopy.ts` (spine check, code review of Story 11.3).
  resolved: Epic 11 retro item 75 (2026-11-17): in ARCHITECTURE-SPINE.md, AD-6 and AD-7 cite their stories, and AD-7 names About this copy (lines from `lib/aboutThisCopy`, shown only while the view has data).
- source_spec: `_bmad-output/implementation-artifacts/spec-11-3-show-the-version-on-the-backup-page.md`
  summary: EXPERIENCE.md's About this copy row says the card's `h2` is "like the page's other headings below the `h1`", but Backup has no other `h2`: Export and Restore are `aria-label`led sections with no visible heading. AC-5 of Story 11.3 ("the headings run `h1` Backup, `h2` About this copy") confirms the single `h2` is intended, so only the UX wording is off. Fix the row's wording in the next UX pass. Low.
  evidence: `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:154`; `frontend/src/pages/BackupPage.tsx` (Blind Hunter, code review of Story 11.3).
  resolved: Epic 11 retro item 79 (2026-11-17): the About this copy row in EXPERIENCE.md now calls the heading an `h2` under the `h1` "Backup", with no count of other headings.

## Deferred from: build-auto review of spec-11-4-tell-me-when-a-tab-is-older-than-the-app (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: Spine drift (AD-7, "App info is an ordinary view"), reconciled before the next epic. The line still reads "(Epic 11, planned)"; Story 11.4 built the version comparison and update notice on `useAppInfo`, and its once-per-new-version `status` announcement (skipped while another message waits for its tick, `isAnnouncing()`) is not in the bullet. Low.
  evidence: `frontend/src/components/UpdateNotice.tsx`, `frontend/src/lib/updateNotice.ts`, `frontend/src/lib/announce.ts` (spine check, build-auto review of Story 11.4).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-7 records the once-per-new-version `status` announcement and its yield to a waiting message (`isAnnouncing()`) in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: Spine drift (AD-8, "One version"), reconciled before the next epic. The bullet still reads "(Epic 11, planned)"; Story 11.4 bakes `__BOOKVIE_VERSION__` from frontend/package.json through a Vite `define` (declared in `src/globals.d.ts`), and `scripts/version.test.mjs` checks the four copies in `check:api`. Low.
  evidence: `frontend/vite.config.ts`, `frontend/src/globals.d.ts`, `frontend/scripts/version.test.mjs` (spine check, build-auto review of Story 11.4).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-8 One version cites story 11.4 and names `__BOOKVIE_VERSION__`, `src/globals.d.ts` and `frontend/scripts/version.test.mjs` in `check:api` in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: Spine drift (AD-6, AD-7, AD-8, Capability → Architecture Map preamble and FR-27 row), reconciled before the next epic. After Story 11.4 nothing in FR-27 is planned, but the preamble still excepts FR-26 and FR-27 as "(Epic 11, planned)", and the row doesn't name `lib/updateNotice` or `components/UpdateNotice`. Extends the 11.3 entry for the same row. Low.
  evidence: the Story 11.4 diff (spine check, build-auto review of Story 11.4).
  resolved: Epic 11 retro item 75 (2026-11-17): the map preamble has no Epic 11 exception; the FR-27 row names `lib/updateNotice` and `components/UpdateNotice` in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: Spine drift (Structural Seed `frontend/src/lib/`), reconciled before the next epic. The Seed's `lib/` listing doesn't name `updateNotice` (the version comparison and the notice sentence). Low.
  evidence: `frontend/src/lib/updateNotice.ts` (spine check, build-auto review of Story 11.4).
  resolved: Epic 11 retro item 75 (2026-11-17): the Seed's `lib/` lists `updateNotice`; `components/` lists `UpdateNotice` in ARCHITECTURE-SPINE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: The e2e version literals flip meaning at the next version bump. `update-notice.spec.ts` uses `NEWER = '1.2.0'`, and the Story 11.3 fixtures (`about-this-copy*.spec.ts`) fulfil '1.1.0' and '1.2.0' as fixed strings. When `release.sh` sets 1.2.0, the "another version" leaves stop showing the notice (AC-3, AC-6 and the AC-2 witness fail) and the "same version" fixtures start showing it. Derive the differing versions from `BUNDLE_VERSION` (`e2e/update-notice.ts`) in Story 11.4's automate step. Medium.
  evidence: `frontend/e2e/update-notice.spec.ts:36-38`; `about-this-copy-automate.spec.ts:26-27`, `about-this-copy-dev.spec.ts:20,32`, `about-this-copy.spec.ts:110` (Blind Hunter, build-auto review of Story 11.4).
  resolved: Story 11.4's automate step (2026-11-17): `e2e/update-notice.ts` derives `NEWER_VERSION` and `NEWEST_VERSION` from `BUNDLE_VERSION` (its minor plus 1 and 2) and fixes `OLDER_VERSION = '0.0.0'`; `update-notice.spec.ts` and the three `about-this-copy*.spec.ts` files use `BUNDLE_VERSION` for the same version and `NEWER_VERSION` for another, so no e2e literal names a release version.

## Deferred from: code review of spec-11-4-tell-me-when-a-tab-is-older-than-the-app (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md`
  summary: Extends the build-auto entry above on the e2e version literals. They block a release, not only a later run: `scripts/release.sh` sets the version (step 3) and then runs `npm run check` (step 4), so `release.sh 1.2.0` stops on AC-3, AC-6, the AC-2 witness and the save-collision leaf unless `--skip-check`. The review also adds one more literal: `about-this-copy-automate.spec.ts:152` removes `noticeText('1.2.0')`. Fix it in Story 11.4's automate step, before any release. Medium.
  evidence: `scripts/release.sh:8-9,115-129`; `frontend/e2e/update-notice.spec.ts:36`; `frontend/e2e/about-this-copy-automate.spec.ts:152` (Blind Hunter and Verification Gap, code review of Story 11.4).
  resolved: Story 11.4's automate step (2026-11-17): `e2e/update-notice.ts` derives `NEWER_VERSION` and `NEWEST_VERSION` from `BUNDLE_VERSION` (its minor plus 1 and 2) and fixes `OLDER_VERSION = '0.0.0'`; `update-notice.spec.ts` and the three `about-this-copy*.spec.ts` files use `BUNDLE_VERSION` for the same version and `NEWER_VERSION` for another, so no e2e literal names a release version.

## Deferred from: implementation of spec-epic-11-retro-item-76-close-dev-mode-refusal-and-serving-gaps (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-11-retro-item-76-close-dev-mode-refusal-and-serving-gaps.md`
  summary: Spine drift, AD-16 (reconciled before the next epic, with item 75). The "SPA routes" line says only that `index.html` is the fallback. It doesn't say that `index.html` is served with `Cache-Control: no-cache`, or that the catch-all never serves `index.html`, `favicon.svg` or `favicon-dev.svg` as is, in any letter case. Item 75's text names only the refusal's case-insensitive fallback (which now also normalizes Unicode and fails closed when the disk probe errors).
  evidence: `ARCHITECTURE-SPINE.md:229`; `backend/bookvie/http/app.py` `INDEX_CACHE_CONTROL`, `_NEVER_AS_IS`; `backend/bookvie/cli.py` `_refuses_real_library`, `_case_insensitive_disk` (Blind Hunter, bmad-build review of epic 11 retro item 76).
  resolved: Epic 11 retro item 75 (2026-11-17): AD-16 SPA routes records `index.html`'s `Cache-Control: no-cache` and the files the catch-all never serves as is; Real library refused records the NFC/casefold fallback and the fail-closed probe in ARCHITECTURE-SPINE.md.

## Deferred from: implementation of spec-epic-11-retro-item-80-second-dev-server-from-another-checkout (2026-11-17)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-11-retro-item-80-second-dev-server-from-another-checkout.md`
  summary: Spine drift, AD-5 and AD-16 (reconciled before the next epic). The Structural Seed's `instance.py` and `cli.py` lines and the FR-26 row of the Capability map don't name `instance.probe_checkout`, `cli._checkout_folder` and the other-checkout refusal, or `create_app`'s `checkout` keyword. Low.
  evidence: `ARCHITECTURE-SPINE.md` Structural Seed and Capability map; `backend/bookvie/instance.py` `probe_checkout`; `backend/bookvie/cli.py` `_checkout_folder`, `_other_checkout` (Spine Check, bmad-build review of epic 11 retro item 80).
  resolved: spine reconciliation before Epic 12 (2026-11-19). The Seed's `cli.py` line names the other-checkout refusal through `_checkout_folder`, `instance.py` names `probe_checkout`, and `http/` names `create_app`'s `checkout` keyword; the FR-26 map row names the refusal through `instance.probe_checkout` and `_checkout_folder` and `create_app`'s `checkout`.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-11-retro-item-80-second-dev-server-from-another-checkout.md`
  summary: Only one Vite dev stack can run at a time. `frontend/vite.config.ts` always proxies to port 8766 with `strictPort` on 5173, and `DEV_ORIGINS` allows only 5173. So a second worktree that follows the refusal's advice (`--port`, `--data-dir`) gets a backend, but its `npm run dev` can't start, or would proxy to the first worktree. Making the proxy target and Vite port configurable (for example from an environment variable) would let two worktrees each run a full dev stack. Medium.
  evidence: `frontend/vite.config.ts:18,34-36`; `backend/bookvie/http/app.py:74` (Blind Hunter, bmad-build review of epic 11 retro item 80). The README now says one Vite dev stack runs at a time.

## Deferred from: build-auto review of spec-back-to-top-button (2026-11-18)

- source_spec: `_bmad-output/implementation-artifacts/spec-back-to-top-button.md`
  summary: Spine drift, AD-6 (reconciled before the next epic). The Structural Seed's `frontend/src/lib/` listing doesn't name `motion` (the shared `prefersReducedMotion`, which replaced the copies in `CatalogPage.tsx`, `useFinishMoment.ts` and `usePileFlow.tsx`). Low.
  evidence: `frontend/src/lib/motion.ts`; `ARCHITECTURE-SPINE.md` Structural Seed (Spine Check, build-auto review of spec-back-to-top-button).
  resolved: spine reconciliation before Epic 12 (2026-11-19). The Seed's `lib/` listing names `motion` (`prefersReducedMotion`).
- source_spec: `_bmad-output/implementation-artifacts/spec-back-to-top-button.md`
  summary: Spine drift, AD-6 (reconciled before the next epic). The Capability map rows for Catalog (FR-4, FR-20, FR-24) and Card notes (FR-17 to FR-19), and the Seed's `components/` line, don't name `components/BackToTop`. Low.
  evidence: `frontend/src/components/BackToTop.tsx`, mounted in `CatalogPage.tsx` and `CardNotesPage.tsx`; `ARCHITECTURE-SPINE.md` Capability map (Spine Check, build-auto review of spec-back-to-top-button).
  resolved: spine reconciliation before Epic 12 (2026-11-19). The Seed's `components/` line and the FR-4/FR-20/FR-24 and FR-17 to FR-19 map rows name `components/BackToTop`.

## Deferred from: code review of spec-back-to-top-button (2026-11-18)

- source_spec: `_bmad-output/implementation-artifacts/spec-back-to-top-button.md`
  summary: No test proves that the spine popover (`z-index: 20`) paints above the shown Back to top button (`z-index: 10`), as DESIGN.md → Back to top button says. AC-7's `coveredBy` checks only overlap with `main` content at the page bottom. If either value changed, the button could cover popover content with no test failing. Low.
  evidence: `frontend/src/components/BackToTop.module.css:16`; `frontend/src/components/SpinePopover.module.css:5-6`; `frontend/e2e/back-to-top.ts:75-91` (Verification Gap, code review of spec-back-to-top-button). A test needs a seed and placement that put a popover below a spine in the button's corner; `e2e/sort-direction.ts:160-182` has an effective z-index helper. For `bmad-testarch-automate`.
  resolved: `frontend/e2e/back-to-top-automate.spec.ts:129` (bmad-testarch-automate, 2026-11-18). The leaf moves the open popover over the shown button and checks the popover is painted there. Raising the button's z-index to 30 made it fail (`self`).
- source_spec: `_bmad-output/implementation-artifacts/spec-back-to-top-button.md`
  summary: Spine drift entries from a standalone spec (not an epic story) can slip through reconciliation. The retro lists "this epic's stories'" entries, and the next-epic gate matches `source_spec` `spec-{N-1}-*`. Neither picks up `spec-back-to-top-button.md`'s two AD-6 entries above, so the spine may stay stale on `lib/motion` and `components/BackToTop`. The next spine reconciliation should also sweep unresolved "spine drift" entries from standalone specs, or the filters should include them. Low.
  evidence: `_bmad/custom/bmad-build-auto.toml:18`, `_bmad/custom/bmad-build.toml:15`, `_bmad/custom/bmad-retrospective.toml:8` (Blind Hunter, code review of spec-back-to-top-button).
  resolved: spine reconciliation before Epic 12 (2026-11-19). The reconciliation swept every unresolved "spine drift" entry, so the two AD-6 entries above and item 80's AD-5/AD-16 entry (a retro-item spec, which `spec-{N-1}-*` also misses) are closed. The next-epic gate in `bmad-build-auto.toml` and `bmad-build.toml` now matches every unresolved "spine drift" entry whatever its `source_spec`, and the retrospective's reconciliation item lists them too.

## Deferred from: build-auto review of spec-12-1-mount-the-mcp-server (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: Spine drift (AD-21), reconciled before the next epic: AD-21 Mount and the Stack row for `mcp` name the SDK's `MCPServer` and a mount of its streamable-HTTP app, but the build uses the low-level `mcp.server.lowlevel.Server` and a custom `_McpRoute`. `MCPServer`'s tool registration validates and coerces arguments and wraps errors as "Error executing tool", which AD-21 One validator forbids, and a `Mount` at `/mcp` redirects `/mcp` to `/mcp/`. Low.
  evidence: `backend/bookvie/agent/server.py` `build_mcp_server`; `backend/bookvie/http/app.py` `_McpRoute` (Spine Check, build-auto review of Story 12.1).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Mount names the low-level `Server`, why not `MCPServer`, and `_McpRoute`; the Stack's `mcp` row too.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: Spine drift (AD-21), reconciled before the next epic: the spine still marks AD-21's rule, the `mcp` and `httpx2` Stack rows, the Structural Seed's `agent/` and the capability map's FR-28 row as planned, though Story 12.1 pins both packages, creates `agent/` and mounts `/mcp` with `get_app_info`. Low.
  evidence: `backend/pyproject.toml` (`mcp>=2.3.0,<2.4`, `httpx2>=2.16.2,<2.17`); `backend/bookvie/agent/`; `backend/tests/test_layers.py` `LAYERS` (Spine Check, build-auto review of Story 12.1).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 is headed built in Epic 12; the `mcp` and `httpx2` Stack rows, the Seed's `agent/` and the Capability map's FR-28 row no longer say planned.

## Deferred from: code review of spec-12-1-mount-the-mcp-server (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: Spine drift (AD-21), reconciled before the next epic: the Design Paradigm paragraph still says "agent tools at `/mcp` (AD-21, planned for Epic 12)", a further "planned" mention the build-auto review's second AD-21 entry doesn't list. Low.
  evidence: `ARCHITECTURE-SPINE.md:28` (Spine Check, code review of Story 12.1).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Design Paradigm paragraph no longer says planned, and names the skills as agent clients.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: `epic-12-context.md` (Technical Decisions, Mount) still says the app "builds a fresh SDK `MCPServer` and mounts its streamable-HTTP app at exactly `/mcp`". Stories 12.2–12.4 read it as build context, and the code deliberately uses the low-level `Server` and `_McpRoute` (Story 12.1's Never list forbids `MCPServer.tool`). Correct it alongside the AD-21 spine reconciliation, or note the deviation in the file before Story 12.2. Low.
  evidence: `_bmad-output/implementation-artifacts/epic-12-context.md`; `backend/bookvie/agent/server.py` (Blind Hunter, code review of Story 12.1).
  resolved: Story 12.4 (2026-11-19). The Mount line in `epic-12-context.md` now says each `create_app` builds a fresh low-level SDK `Server` (`agent.build_mcp_server`, never `MCPServer`) and serves its streamable-HTTP app through `_McpRoute` at exactly `/mcp`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: `_success` passes any `model_dump` result as `structuredContent`. A `RootModel` or list view (as `find_book`'s candidates may be) dumps to a JSON array, which MCP doesn't allow for structured content. For Story 12.2: wrap a non-object answer in an object, or refuse it. Low.
  evidence: `backend/bookvie/agent/server.py` `_success` (Edge Case Hunter, code review of Story 12.1).
  resolved: Story 12.2 (2026-11-19). `find_book` answers the object `{"books": [...]}` (`views.FindBookView`), and `_success` now raises on a body that isn't a JSON object, so such an answer is logged and refused as `couldnt_save`; `backend/tests/test_agent_read.py::test_an_answer_that_is_not_a_json_object_is_refused_as_couldnt_save` pins it (without the guard the SDK answers JSON-RPC -32603).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: Unverified, medium if true once write tools exist: a tool call still running when the lifespan's session manager exits keeps its worker thread (holding the AD-4 lock from Story 12.3) but its answer is dropped, and nothing says what the agent gets or how `cli.py`'s lock-waiting shutdown orders with the manager's teardown. Settle in Story 12.3 with a shutdown-during-call test.
  evidence: `backend/bookvie/http/app.py` `lifespan`; `backend/bookvie/agent/server.py` `call_tool` (Blind Hunter, code review of Story 12.1).
  resolved: Story 12.3 (2026-11-19). uvicorn's graceful shutdown waits for the in-flight `/mcp` request before it runs the lifespan's shutdown, so the call finishes, the agent gets its answer (`{ok: true}`), the commit lands, and only then does the session manager exit and `cli._Server.shutdown` release `bookvie.lock` under the AD-4 write lock. `backend/tests/test_agent_shutdown.py::test_shutdown_waits_for_a_write_tool_call_in_flight` pins that order on a real uvicorn server, for a graceful shutdown, with the call blocked before its commit and the test's own copy of `cli.main`'s `uvicorn.Config` and `release` (a one-off run with `timeout_graceful_shutdown` forced low dropped the answer and failed the test; that mutation isn't in the repo). The graceful wait is unbounded. The rest is read from the code, not tested: on a force exit (a second Ctrl-C) uvicorn stops waiting and the agent's answer is dropped, the commit stays atomic, and `bookvie.lock` is released only after it, since `cli.main`'s `release` takes `app.state.write_lock`. Pinning `cli.main`'s own `Config` and `release` is deferred (code review of Story 12.3).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: Any non-`IntentError` failure in a tool answers `couldnt_save` ("Couldn't save. Your data wasn't changed."), as Story 12.1's spec says; for a read tool that wording is wrong. Decide the read tools' unexpected-error answer before Story 12.2. Low.
  evidence: `backend/bookvie/agent/server.py` `_answer` (Blind Hunter, code review of Story 12.1).
  resolved: Story 12.2 (2026-11-19), decided to keep `couldnt_save`: the view routes answer an unexpected failure with the same `couldnt_save` (`http/api.py` `_unexpected_error`), so a read tool refuses as its route does. `backend/tests/test_agent_read.py::test_a_read_tools_unexpected_failure_is_couldnt_save_as_its_route_answers` pins it for `list_catalog` against `GET /api/views/catalog`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md`
  summary: A malformed tool call reports the `malformed()` error on `field: "intent"` (the multipart part's name, via `parse_form_intent`), a field the tool's advertised schema doesn't have, so an agent is told to fix an argument that doesn't exist. Spec-mandated for 12.1; decide before Story 12.2's first tool with arguments whether the agent error should name the argument instead. Low.
  evidence: `backend/bookvie/agent/tools.py` `parse_arguments` (Blind Hunter, code review of Story 12.1).
  resolved: Story 12.2 (2026-11-19) for the read tools: `parse_view_arguments` in `backend/bookvie/agent/tools.py` answers `invalid_fields` with one field per validation error, named by the argument's alias path, with Pydantic's message, as a view route names a bad query parameter. `parse_arguments` (on `intent`) stays for `get_app_info` and for Story 12.3's intent tools, which share the intent routes' parser. `backend/tests/test_agent_read.py::test_the_read_tools_refuse_a_bad_argument_by_naming_it` pins it.

## Deferred from: build-auto review of spec-12-2-let-an-agent-read-my-library (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-21), reconciled before the next epic: AD-21 "Find, never guess" says `find_book` returns a bare `[{id, title, subtitle, authors, edition, type, role}]`, but MCP 2025-11-25 structured content is a JSON object, so the tool answers `{"books": [...]}` with those candidates inside (Oleg's decision, ATDD checklist for Story 12.2). Low.
  evidence: `backend/bookvie/views/models.py` `FindBookView`; `backend/bookvie/views/find_book.py`; spine AD-21 "Find, never guess" (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Find, never guess gives the `{"books": [...]}` shape and why.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-21), reconciled before the next epic: the Design Paradigm's dependency-direction line has no `views → intents` edge, but AD-21 and AD-9 put the views' refusals (book not found, the stats range rules, `find_book`'s blank query) in `views/`, which raise `bookvie.intents.contract`'s errors. `intents` never imports `views`; `backend/tests/test_layers.py` lets `views` import `bookvie.intents.contract` only (`ALLOWED_MODULES`), every other `intents` module stays forbidden. Low.
  evidence: `backend/bookvie/views/shelf.py` `require_book_detail`, `views/card_notes.py` `require_card_notes`, `views/stats.py` `check_stats_range`, `views/find_book.py`; `backend/tests/test_layers.py` `ALLOWED_MODULES`; spine Design Paradigm, dependency direction (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Design Paradigm's dependency line adds `views → intents.contract` only, citing `test_layers.py` `ALLOWED_MODULES`; the Seed's `intents/` line marks `contract` as the one module views may import.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-21), reconciled before the next epic: AD-21 doesn't record the `find_book` ranking and matching Story 12.2 settled (exact title, ISBN, title prefix, title part or initials, author, subtitle; ties by `title_key`, edition, id; no cap; typographic folding as the duplicates rule; initials from 2 characters; ISBN only for an ISBN-10/13-shaped query), and the spine's Deferred list still says Story 12.2 decides it. Low.
  evidence: `backend/bookvie/views/find_book.py` module docstring; spine AD-21, Deferred ("`find_book`'s ranking and match details") (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Find, never guess records the matching and ranking; the Deferred `find_book` bullet is removed.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-21), reconciled before the next epic: the Structural Seed still lists `find_book` under `views/` as planned, though Story 12.2 adds `views/find_book.py`. Low.
  evidence: `backend/bookvie/views/find_book.py`; spine Structural Seed, `views/` line (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Seed's `views/` line lists `find_book` as built.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-9), reconciled before the next epic: AD-9 says the stats refusal copy is in `http/api.py` `stats_view`; it now lives in `views/stats.py` (`IsoDate`, `check_stats_range`), shared by the route and `get_stats`. Low.
  evidence: `backend/bookvie/views/stats.py`; `backend/bookvie/http/api.py` `stats_view`; spine AD-9, the stats `invalid_fields` sentence (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-9 names `views/stats.py` (`IsoDate`, `check_stats_range`), shared by the route and `get_stats`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-9, AD-21), reconciled before the next epic: neither AD-9's list of refusing views nor AD-21 names `find_book`'s refusal of a blank query (422 `invalid_fields` on `query`, "Give part of a title, an author or an ISBN."). Low.
  evidence: `backend/bookvie/views/find_book.py` `find_book`; spine AD-9 Binds, AD-21 "Find, never guess" (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-9 Binds lists `find_book`, and AD-9 and AD-21 give its blank-query refusal and copy.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (AD-21), reconciled before the next epic: AD-21's "One validator" covers only the write tools; the read tools parse their arguments with `parse_view_arguments`, which names each failing argument by alias with Pydantic's message (as a view route names a bad query parameter), refuses an explicit `null` and coerces nothing but `get_stats`' date strings. Low.
  evidence: `backend/bookvie/agent/tools.py` `parse_view_arguments`, `StatsArguments`; spine AD-21 "Same handler, same answers" (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 One validator describes `parse_view_arguments` for the read tools.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: Spine drift (Consistency Conventions), reconciled before the next epic: the "Title ordering (server)" convention breaks title ties by Book id; `find_book`'s ranked candidates break them by edition, then id. A ranked list isn't a title-ordered one; the convention can name the exception. Low.
  evidence: `backend/bookvie/views/find_book.py` `find_book` sort; spine Consistency Conventions, Title ordering (server) (Spine Check, build-auto review of Story 12.2).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Title ordering (server) convention names `find_book`'s ranked ties (title key, edition, id).

## Deferred from: code review of spec-12-2-let-an-agent-read-my-library (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md`
  summary: `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` now asserts the cumulative tool list (seven tools after Story 12.2), so its name is stale and will mislead every later Epic 12 story. Renaming it means editing the Story 12.1 spec and documents that cite it; do it at the Epic 12 retro or with the AD-21 spine reconciliation. Low.
  evidence: `backend/tests/test_agent_mount.py` (Blind Hunter, code review of Story 12.2). The review's 9 spine drift findings are already recorded under "Deferred from: build-auto review of spec-12-2" and Story 12.1's entries, so they are not repeated here.
  resolved: Epic 12 retro item 87 (2026-11-20). Renamed to `test_the_tool_list_is_epic_12s_and_get_app_info_returns_the_app_info_view`; it asserts `agent_client.AGENT_TOOL_NAMES`, the one cumulative list. The Story 12.1 and 12.2 ATDD checklists, the Story 12.2 and 12.3 specs and the Epic 12 retro keep the old name as history.

## Deferred from: build-auto review of spec-12-3-let-an-agent-record-my-reading (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-3-let-an-agent-record-my-reading.md`
  summary: Spine drift (AD-21, Structural Seed), reconciled before the next epic: the success mapping that the ten intent routes and their agent write tools share lives in the new `intents/answers.py` (`ok`, `page_answer`, `card_note_answer`). AD-21 says the tool returns "the route's `OkResponse`", and the Seed's `intents/` line names no `answers` module. Low.
  evidence: `backend/bookvie/intents/answers.py`; `backend/bookvie/http/api.py` (the ten routes); `backend/bookvie/agent/tools.py` `_write_tool` (Spine Check, build-auto review of Story 12.3).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Same handler names `intents/answers.py` and its four functions for the twelve routes with a tool; the Seed's `intents/` line lists `answers`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-3-let-an-agent-record-my-reading.md`
  summary: The `pause` tool's description (epics.md Story 12.3) says the paused Book "stays in Waiting for you until the user picks it up again", but `pause` makes it Up next (role `upNext`, not `waiting`), so an agent tells the user the wrong place. AC-3 pins the text character for character, so change `epics.md` first, then `DESCRIPTIONS` in `test_agent_write.py` and `PAUSE` in `agent/tools.py`. Medium.
  evidence: `backend/bookvie/intents/pause.py` `pause` (sets `up_next_book_id`); `backend/bookvie/views/models.py` `Role` (Blind Hunter, build-auto review of Story 12.3).
  resolved: standalone fix (2026-11-19). `epics.md` Story 12.3, `PAUSE` in `backend/bookvie/agent/tools.py` and `DESCRIPTIONS` in `backend/tests/test_agent_write.py` now say: "Pause the Main book at its current page. It becomes Up next, in place of any Book that was Up next."

## Deferred from: code review of spec-12-3-let-an-agent-record-my-reading (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-3-let-an-agent-record-my-reading.md`
  summary: `test_agent_shutdown.py` builds its own `uvicorn.Config` and copies `cli.main`'s `release()`, so nothing pins the production shutdown. If `cli.main` set `timeout_graceful_shutdown`, or `release` stopped taking `app.state.write_lock`, every test would still pass. Add a `test_cli.py` test that pulls `cli.main`'s `Config` and `release` and asserts both. Do it at the Epic 12 retro. Low.
  evidence: `backend/bookvie/cli.py:315-321`; `backend/tests/test_agent_shutdown.py` `release`, `config` (Verification Gap, Blind Hunter, Acceptance Auditor, code review of Story 12.3).
  resolved: Epic 12 retro item 87 (2026-11-20). `backend/tests/test_cli.py::test_main_waits_for_in_flight_calls_and_releases_the_lock_under_the_write_lock` runs `cli.main` with the fake server and pins its own `Config` (`timeout_graceful_shutdown` is `None`) and `release` (it waits while the test holds `app.state.write_lock`, then removes `bookvie.lock`). Setting a timeout, or dropping the write lock from `release`, each fails it.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-3-let-an-agent-record-my-reading.md`
  summary: The `set_up_next` tool's description (epics.md Story 12.3) says the Book "can be unread or paused, but not the Main book". But `set_up_next` accepts any Book except the Main book, and AD-6 names a finished Book queued for a re-read, so an agent may refuse a re-read it could make. AC-3 pins the text, so change `epics.md` first, together with the `pause` text above, then `DESCRIPTIONS` and `SET_UP_NEXT`. Low.
  evidence: `backend/bookvie/intents/set_up_next.py` `set_up_next`; spine AD-6 (Spine Check, code review of Story 12.3).
  resolved: standalone fix (2026-11-19). `epics.md` Story 12.3, `SET_UP_NEXT` in `backend/bookvie/agent/tools.py` and `DESCRIPTIONS` in `backend/tests/test_agent_write.py` now say: "Choose the Book to read next: any Book except the Main book, including a finished one to re-read. It replaces the current Up next, which keeps its state." The PRD glossary's Up next entry now names a finished Book queued for a re-read too.

## Deferred from: build-auto review of spec-12-4-let-an-agent-add-and-edit-a-book (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md`
  summary: The `edit_book` description (epics.md Story 12.4, AC-2, pinned verbatim) says "Call get_book first and send every field", but `get_book` answers in view shapes, not form shapes. `authors` and `tags` are lists; `pages`, `edition` and `year` are integers; the finish date is `latestFinishDate`, not `finishedOn`; `spineColor` is the resolved color (the override is `spineColorUser`). Wrong types are refused safely on `intent`, but an agent that copies `spineColor` pins a curated or cover color as the user's color. Decide whether to amend the description in `epics.md` first (then `EDIT_BOOK` and `BOOK_DESCRIPTIONS`), or to give `get_book` form-shaped fields. Medium.
  evidence: `backend/bookvie/views/models.py:244-266` `BookDetailView`; `backend/bookvie/agent/tools.py` `EDIT_BOOK` (Edge Case Hunter, Blind Hunter, build-auto review of Story 12.4).
  resolved: Story 12.4, review loop (2026-11-19). Oleg decided to fold the fix in: `get_book` and `GET /api/views/book` carry `editForm`, the panel's prefill as strings with `spineColor` the user's own color or empty; `edit_book`'s description (epics.md amended) says to send it back with `bookId`. `test_agent_edit_form.py` round-trips every seeded Book and a several-author, cover-colored Book byte for byte.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md`
  summary: Spine drift (AD-21, AD-3), reconciled before the next epic: `edit_book`'s tool-side missing-key refusal (`invalid_fields`, one "Field required" per missing key in schema order, before `parse_edit_book_intent` runs) is the one exception to AD-21's "the route's own `parse_*_intent` is the only validator" and AD-3's "exactly as the route does". AD-21 "Edits are whole" names only the required schema. Record the refusal and say the contract test doesn't cover partial edits. Also, Story 12.3's `intents/answers.py` drift entry says "ten intent routes"; it is twelve now. Low.
  evidence: `backend/bookvie/agent/tools.py` `_write_tool`, `EDIT_BOOK`; `backend/bookvie/intents/answers.py` (Spine Check, build-auto review of Story 12.4).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Edits are whole and One validator, and AD-3's agent-tools bullet, record the missing-key refusal as the one check a tool adds, and that the contract tests cover whole edits only; the answers count is twelve.

## Deferred from: build-auto review pass 2 of spec-12-4-let-an-agent-add-and-edit-a-book (2026-11-19)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md`
  summary: Spine drift (AD-21, AD-6), reconciled before the next epic: AD-21 "Edits are whole" still says `edit_book`'s description tells the agent to "send every field"; it now says to send `get_book`'s `editForm` with `bookId`, and names the `finishedOn` and `removeCover` rules. Neither AD-21 nor AD-6 names the book view's `editForm`, a server copy of the client's `toPanelFields` with no shared check between them (no case table like `pace.cases.json`); record it, and decide whether the panel should read `editForm` instead. Low.
  evidence: `ARCHITECTURE-SPINE.md:307`; `backend/bookvie/views/shelf.py` `_edit_form`; `frontend/src/lib/bookDetail.ts` `toPanelFields` (Spine Check, Blind Hunter, Intent Alignment, build-auto review pass 2 of Story 12.4).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Edits are whole gives the `editForm` description; AD-6 names the book view's `editForm`. The panel keeps `toPanelFields`, held equal by `editForm.cases.json` (Epic 12 retro item 87).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md`
  summary: A Book whose latest finish date is after today (the clock went back, or a restored backup) can't be saved unchanged: `parse_finished_on` refuses a future date before `edit_book`'s unchanged-date rules run, so the panel and the `editForm` round trip are both refused on `finishedOn`. Pre-existing. Low.
  evidence: `backend/bookvie/domain/finished_on.py:64` `parse_finished_on`; `backend/bookvie/intents/edit_book.py` `_finished_on_failure` (Edge Case Hunter, build-auto review pass 2 of Story 12.4).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md`
  summary: The store invariants check trimming only for title, authors, language, publisher and tags, so a stored subtitle or ISBN that is untrimmed or "" (if restore or a hand edit can load one) changes when saved unchanged through the panel or the `editForm` round trip. Unverified whether restore admits such values. Low.
  evidence: `backend/bookvie/domain/invariants.py:76-135` (Edge Case Hunter, build-auto review pass 2 of Story 12.4).

## Deferred from: build-auto review of spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: Spine drift (AD-21, Stack table), reconciled before the next epic: the spine lists `httpx2` as "the cover download", but `cover_fetch` downloads with `http.client` over its own socket; `httpx2` only supplies the TLS context (`create_ssl_context(trust_env=False)`). Low.
  evidence: `backend/bookvie/intents/cover_fetch.py` `_default_ssl_context`, `_Connection` (Spine Check, build-auto review of Story 12.5).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Cover by URL says the download uses `http.client` over bookvie's socket and `httpx2` supplies only the TLS context; the Stack's `httpx2` row too.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: Spine drift (AD-21 Cover by URL), reconciled before the next epic: the downloader enforces rules AD-21 doesn't list. Multicast, IPv4-compatible `::/96` and scoped IPv6 addresses are refused. A `Content-Encoding` other than identity is refused, as are an empty body, a `Content-Length` past the cap (before reading) and a body shorter than its `Content-Length`. The OS trust store is used, with `SSL_CERT_FILE` and the like ignored. The DNS lookup is bounded by the deadline. Low.
  evidence: `backend/bookvie/intents/cover_fetch.py` `is_public`, `_exchange`, `_read_capped`, `_resolved`, `_default_ssl_context` (Spine Check, build-auto review of Story 12.5).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Cover by URL lists the extra address, encoding, length, empty-body, trust-store and DNS-deadline rules.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: Spine drift (AD-21, Structural Seed), reconciled before the next epic: the Seed's `intents/` line still lists `cover_fetch` as planned; it now exists. Low.
  evidence: `backend/bookvie/intents/cover_fetch.py` (Spine Check, build-auto review of Story 12.5).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Seed's `intents/` line lists `cover_fetch` as built.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: Spine drift (AD-21, Structural Seed `http/` line, Consistency Conventions Testing row), reconciled before the next epic: the spine names none of three things. `create_app`'s `cover_fetcher` seam (`app.state.cover_fetcher`). The tool's first step, which refuses a non-string `coverUrl` as the malformed intent on `intent`. The autouse pytest guard `_on_the_machine`, which keeps in-process lookups and connections on the machine. Low.
  evidence: `backend/bookvie/http/app.py` `create_app`; `backend/bookvie/agent/tools.py` `_book_tool`; `backend/tests/conftest.py` `_on_the_machine` (Spine Check, build-auto review of Story 12.5).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Cover by URL names the `cover_fetcher` seam, the non-string `coverUrl` refusal and `_on_the_machine`; the Seed's `http/` line and the Testing row name them too.

## Deferred from: code review of spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: `cryptography` is a transitive dependency (through `mcp`) that only the test helper `tests/cover_server.py` imports, to make its local TLS certificates. The spec's Design Notes call it "Deferred, not added": declaring it as a dev dependency needs a lock change, and the pin test covers declared dependencies only. If `mcp` drops it, the cover tests break at import. Low.
  evidence: `backend/tests/cover_server.py` imports; spec Design Notes (Blind Hunter, code review of Story 12.5).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`
  summary: No test runs a successful cover download through the real DNS, `socket.create_connection` and the OS trust store, or percent-encodes a real-world cover URL; AC-5 forbids one. Story 12.8's session against `--dev` makes the first real download: check there that a real cover (Amazon, Manning, Leanpub, O'Reilly) downloads and is stored, and note any CDN that refuses `User-Agent: bookvie` or answers `Accept: image/*` with a format the sniffer refuses. Low.
  evidence: `backend/bookvie/intents/cover_fetch.py` `_default_resolve`, `_default_connect`, `_default_ssl_context`, `_exchange` (Blind Hunter, code review of Story 12.5).
  resolved: Epic 12 retro item 83 (2026-11-20). Story 12.8's AC-4 runs against `--dev` downloaded and stored real covers from Amazon (`m.media-amazon.com`, JPEG) and Leanpub (CloudFront `og:image` with a query string and no extension); neither CDN refused bookvie's request. Recorded in `spec-12-8`'s Auto Run Result.

## Deferred from: build-auto review of spec-12-6-let-an-agent-back-up-my-library-to-disk (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: Spine drift (AD-21, Structural Seed, Capability map), reconciled before the next epic: the Seed's `intents/` line still lists `backup_file` as planned, the `agent/` line calls `export_backup` planned, AD-21 is headed "planned for Epic 12", and the Capability map says FR-28 is planned. With this story every AD-21 tool group is built. Low.
  evidence: `backend/bookvie/intents/backup_file.py`; `EXPORT_BACKUP` in `backend/bookvie/agent/tools.py` (Spine Check, build-auto review of Story 12.6).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Seed's `intents/` and `agent/` lines, AD-21's heading and the Capability map no longer say planned.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: Spine drift (AD-21 Backup, Structural Seed `http/` line), reconciled before the next epic: the spine says only that `cli.py` resolves the backups folder. `create_app` also takes a `backups_dir` keyword, stores `app.state.backups_dir`, and derives the folder from `data_dir` with the same rule when none is passed. Low.
  evidence: `backend/bookvie/http/app.py` `create_app` (Spine Check, build-auto review of Story 12.6).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Backup and the Seed's `http/` line name `create_app`'s `backups_dir` keyword and its derived default.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: Spine drift (AD-21 Backup, AD-9), reconciled before the next epic: the backup also creates the folder with its parents (a failure is `couldnt_save`), fsyncs the folder after the rename (a failure is only logged), only logs a failed `lastExportAt` record after the rename, and answers `couldnt_save` when the app has no backups folder. AD-21 says none of this. Low.
  evidence: `backend/bookvie/intents/backup_file.py` `write_backup`, `_write_atomic` (Spine Check, build-auto review of Story 12.6).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Backup records the folder creation, the folder fsync, the logged-only failures after the rename, and the missing backups folder as `couldnt_save`.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: Spine drift (AD-1), reconciled before the next epic: AD-1 says the one file written outside the data folder is the backup zip, but `export_backup` also creates the backups folder (and its parents) and a `.bookvie-backup-<date>.zip.tmp*` temp file beside the zip. Low.
  evidence: `backend/bookvie/intents/backup_file.py` `write_backup`, `_write_atomic` (Spine Check, build-auto review of Story 12.6).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-1 names the backups folder creation and the `.bookvie-backup-<date>.zip.tmp*` temp file.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: Spine drift (Deferred "Skills on the agent tools", AD-8), reconciled before the next epic: the spine says Story 12.6 settles the reconnect step and the `bookvie`/`bookvie-dev` tool names, and AD-8 says the cataloging-skill notes hold until Story 12.7. The plan moves the skills in 12.7 (`bookvie-notes-summary`) and 12.8 (`bookvie-new-book`); 12.6 is the backup tool. Low.
  evidence: `_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md` §5, D15 (Spine Check, build-auto review of Story 12.6).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-8 now describes both skills as agent clients (12.7 and 12.8) with their reconnect step and entry names; the Deferred "Skills on the agent tools" bullet is removed.

## Deferred from: code review of spec-12-6-let-an-agent-back-up-my-library-to-disk (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: No e2e test observes the HOME a server started without `home` actually ran with. `agent-backup.spec.ts` checks the `Server.home` that `startServer` returns, so a regression such as `HOME: home ?? process.env.HOME` would put the ordinary e2e servers back on the real home with every assertion passing. Closing it needs an observation point (no endpoint reports HOME). Low.
  evidence: `frontend/e2e/fixtures.ts` `startServer`; `frontend/e2e/agent-backup.spec.ts` (Verification Gap, code review of Story 12.6).
- source_spec: `_bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md`
  summary: No test fails the backup's temp-file cleanup on top of a failed write step; `FaultyFs` fails exactly one step. Dropping the `try/except` around `fs.remove(temp)` in `_write_atomic` would turn a double fault into an internal error instead of `couldnt_save`. `Store._write_atomic`'s cleanup has the same coverage. Low.
  evidence: `backend/bookvie/intents/backup_file.py` `_write_atomic`; `backend/tests/helpers.py` `FaultyFs` (Verification Gap, code review of Story 12.6).
  resolved: Story 12.6, test automation (2026-11-20). `test_a_write_failure_whose_cleanup_fails_too_reports_the_first_fault` (`backend/tests/test_agent_backup.py`, four write steps) fails each step and then the remove. The entry's consequence was overstated: an escaping `OSError` would still read `couldnt_save`, through `agent/server.py`'s catch-all. What the cleanup guard keeps is the intent's log line naming the first fault, and the leaf pins that line. Dropping the guard fails all four cases.

## Deferred from: build-auto review of spec-12-7-summarize-a-book-s-notes-through-the-agent-tools (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-7-summarize-a-book-s-notes-through-the-agent-tools.md`
  summary: Spine drift (AD-8, Deferred "Skills on the agent tools"), reconciled before the next epic: AD-8 says the skill notes hold until Story 12.7, but 12.7 moved only `bookvie-notes-summary` (`bookvie-new-book` moves in 12.8), and the Deferred bullet says 12.6 settles the reconnect step and the per-entry tool names, which 12.7 wrote into the notes skill. Overlaps the 12.6 entry above. Low.
  evidence: `.claude/skills/bookvie-notes-summary/SKILL.md` steps 1–2 (Spine Check, build-auto review of Story 12.7).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, as the 12.6 entry above: AD-8 and the removed Deferred bullet.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-7-summarize-a-book-s-notes-through-the-agent-tools.md`
  summary: Spine drift (AD-19, AD-6), reconciled before the next epic: the skill's step 2 has the agent derive the summary status (in progress, finished, not started) and choose which Reading's Purpose to use from `get_book`, a client-side derivation the spine reserves to the server. The deleted `fetch_notes.py` did the same. The spine should name it as an accepted agent-side rule, or `get_book` should carry it. Low.
  evidence: `.claude/skills/bookvie-notes-summary/SKILL.md` step 2 "Work out the summary's inputs" (Spine Check, build-auto review of Story 12.7).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-6 records the notes-summary skill's status and Purpose choice as an accepted agent-side derivation, and AD-19 Status says it isn't the Reading status; `get_book` would compute it if a second client needed it.

## Deferred from: build-auto review of spec-12-8-add-a-book-through-the-agent-tools (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md`
  summary: Spine drift (AD-8), reconciled before the next epic: AD-8 still says the cataloging skill's scripts build the `add-book` body, read the `catalog` and `book` views and the AD-9 envelope by key, and calls its duplicate pre-check (`check_catalog.py`) an open known gap. Story 12.8 deletes both scripts, moves the skill onto `find_book`, `add_book` and `get_book`, and resolves that gap. Low.
  evidence: deleted `.claude/skills/bookvie-new-book/scripts/add_book.py` and `check_catalog.py`; the copied-rule entry above now has its `resolved:` line (Spine Check, build-auto review of Story 12.8).
  resolved: Epic 12 reconciliation follow-up (2026-11-21). Item 82 had already rewritten AD-8: the skills are agent clients, `add_book.py`, `check_catalog.py` and `fetch_notes.py` are deleted, and the duplicate pre-check gap is gone. This line was missing.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md`
  summary: Spine drift (Design Paradigm, Structural Seed), reconciled before the next epic: the Paradigm says the skill calls the HTTP API directly (skill 2.0.0) and calls `http/` like the browser, and the Seed's `AG` node reads "cataloging skill (HTTP client of the intent API)". Skill 3.0.0 is an MCP client of `agent/` (AD-21) and never calls the HTTP API for a book. Low.
  evidence: `.claude/skills/bookvie-new-book/SKILL.md` Rules and step 1 (Spine Check, build-auto review of Story 12.8).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, the Design Paradigm names the skills as MCP clients, and the Seed's `AG` node is replaced by "Claude Code and the bookvie skills (MCP clients of agent/ at /mcp)".
- source_spec: `_bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md`
  summary: Spine drift (Deferred "Skills on the agent tools"), reconciled before the next epic: the bullet still leaves the reconnect step and the `bookvie`/`bookvie-dev` tool names open; both skills now carry them (Stories 12.7 and 12.8). Folds into the 12.6 and 12.7 entries above. Low.
  evidence: `.claude/skills/bookvie-new-book/SKILL.md` step 1 (Spine Check, build-auto review of Story 12.8).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, as the 12.6 entry above.
- source_spec: `_bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md`
  summary: The new-book evals allow only the production entry's tools (`mcp__bookvie__*`), so an eval run adds books to the real library on port 8765, as the 2.0.0 HTTP evals did. Pointing them at `bookvie-dev` needs the dev entry's tool names and prompts that ask for the dev library. Low.
  evidence: `.claude/skills/bookvie-new-book/evals/*/prompt.md` `allowed_tools` (Blind Hunter, Edge Case Hunter, Intent Alignment, build-auto review of Story 12.8).

## Deferred from: code review of spec-12-8-add-a-book-through-the-agent-tools (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md`
  summary: Spine drift (AD-3, AD-8 known gap), reconciled before the next epic: the copied-rule entry's `resolved:` line says the skill relies only on the server's duplicate rule, but `bookvie-new-book` step 2 keeps an agent-side same-book judgement (an ISBN hit, or the same title, a shared author, the same edition and type) that differs from `domain/duplicates.is_duplicate`. It only decides what the skill asks the user; `add_book`'s `duplicate_book` stays the guard. When AD-8 is reconciled, restate its known-gap note for that judgement rather than removing it. Low.
  evidence: `.claude/skills/bookvie-new-book/SKILL.md` step 2 "The same book" (Spine Check, code review of Story 12.8).
  resolved: Epic 12 reconciliation follow-up (2026-11-21). AD-8 now carries a known-gap note for `bookvie-new-book` step 2's same-book judgement (it differs from `domain/duplicates.is_duplicate`; `add_book`'s `duplicate_book` stays the guard), and AD-3 says that question isn't a pre-check.

## Deferred from: build review of spec-epic-12-retro-item-84-ship-mcp-and-skills-detect-older-bookvie (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-12-retro-item-84-ship-mcp-and-skills-detect-older-bookvie.md`
  summary: Spine drift (AD-21, and the Deferred bullet "Skills on the agent tools"), reconciled before the next epic: both skills' step 1 now probes `/mcp` with a hand-written `curl` POST of a sessionless `tools/call get_app_info` (no `initialize`), which relies on the mount being stateless with JSON responses. AD-21 says Claude Code is the only supported client and gives stateless mode only as the reason a restart strands no session; neither AD-21, AD-8's skill notes nor the Deferred bullet records that the skills depend on it to tell an older bookvie apart. Folds into item 82's reconciliation. Low.
  evidence: `.claude/skills/bookvie-new-book/SKILL.md` and `.claude/skills/bookvie-notes-summary/SKILL.md` step 1, pinned by `check_the_older_bookvie_probe` (Spine Check, build review of retro item 84).
  resolved: Epic 12 retro item 82 (2026-11-20). In the spine, AD-21 Mount says a client can call `tools/call` without `initialize` and that the skills' probe relies on it; AD-8 describes the probe and its pin.

## Deferred from: build of spec-epic-12-retro-item-82-reconcile-the-spine-with-epic-12 (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-12-retro-item-82-reconcile-the-spine-with-epic-12.md`
  summary: The spine's IDs convention keeps `add-card-note`'s `cardNoteId` "because the agent skills that write to bookvie are expected to" read it, and says to drop it "if none does once those skills exist". Both skills now exist and neither adds a Card note, though the `add_card_note` tool returns the id. Oleg should decide whether to keep it (an agent may add a note and then edit it) or drop it. Low.
  evidence: ARCHITECTURE-SPINE.md Consistency Conventions, IDs row; `backend/bookvie/intents/answers.py` `card_note_answer`; `.claude/skills/*/SKILL.md` (Blind Hunter, build review of retro item 82).
  resolved: Kept (Oleg, 2026-11-21). The agent is the reader: `add_card_note` returns `cardNoteId` so a follow-up `edit_card_note` can target the note just added. The spine's IDs row now gives that reason instead of the skills.

## Deferred from: Epic 12 retro item 83 manual runs (2026-11-20)

- source_spec: `_bmad-output/implementation-artifacts/spec-12-7-summarize-a-book-s-notes-through-the-agent-tools.md`
  summary: `update_page` can't save a page from Claude Code. The tool advertises `page` as an untyped `JsonValue` (no `type` in its input schema), so Claude Code sends `"120"`, a string; `valid_page` accepts only a JSON integer, so every call is refused with "Page must be between 0 and 670.", which also misstates the cause. A raw `tools/call` with `"page": 120` succeeds. `start_reading`'s `page` and `finish_reading`'s `finishedOn`, `purposeFulfilled` and `rating` are `JsonValue` too and likely fail the same way (not run). Fix in the agent layer (advertise `integer`/`boolean` in the input schema, or coerce a whole-number string for the agent only), keeping the HTTP intents' wrong-type refusals. High: the agent's most common write doesn't work.
  evidence: `backend/bookvie/intents/update_page.py` `UpdatePageIntent.page`, `valid_page`; `backend/bookvie/agent/tools.py` `input_schema`; seeding for 12.7 AC-3 (Epic 12 retro item 83).
  resolved: 2026-11-21 by `spec-agent-tools-advertise-value-types.md`: `input_schema` now lists `update_page.page` as integer, `start_reading.page` and `rating` as integer or null, `purposeFulfilled` as an enum or null and `finishedOn` as string (`JSON_VALUE_TYPES` in `backend/bookvie/agent/tools.py`); the parsers still refuse `"120"`. Pinned over `/mcp` by `backend/tests/test_agent_value_types.py`. A real Claude Code session's first-call save (that spec's AC-2) passed on 2026-11-21 (page 213 on `bookvie --dev`) and is recorded in that spec.

## Deferred from: build-auto review of spec-agent-tools-advertise-value-types (2026-11-21)

- source_spec: `_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md`
  summary: Spine drift (AD-21), reconciled before the next epic: the "One validator" bullet says each tool's schema is generated from its model by alias (plus `coverUrl`, null dropped, closed), but `JSON_VALUE_TYPES` in `agent/tools.py` now declares the type of every `JsonValue` property (the `purposeFulfilled` enum, integer-only `update_page.page`, string-only `finishedOn`), and `test_agent_value_types.py` pins that every listed property has a JSON type.
  evidence: `backend/bookvie/agent/tools.py` `JSON_VALUE_TYPES`, `input_schema`; spine-check review layer.
  resolved: Epic 12 reconciliation follow-up (2026-11-21). AD-21 One validator now records `JSON_VALUE_TYPES`: the declared type of each `JsonValue` property, `null` only where the parser takes it, nothing coerced, pinned by `test_agent_value_types.py`.
- source_spec: `_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md`
  summary: Spine drift (AD-8), reconciled before the next epic: "The tools' advertised schemas are generated from the same Pydantic models" no longer covers the agent-layer type declarations for `JsonValue` fields.
  evidence: `backend/bookvie/agent/tools.py` `JSON_VALUE_TYPES`; spine-check review layer.
  resolved: Epic 12 reconciliation follow-up (2026-11-21). AD-8 now names the `JsonValue` types in `JSON_VALUE_TYPES` as the one hand-written part of the advertised schemas.
- source_spec: `_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md`
  summary: A page sent with the wrong type (`"120"`) is refused with "Page must be between 0 and 670.", which misstates the cause; the spec's contract forbids changing refusal copy, so a clearer message needs its own change (agent and HTTP alike).
  evidence: `backend/bookvie/intents/update_page.py` `valid_page` / `page_message`, also used by `start_reading`; pinned by `backend/tests/test_agent_value_types.py`.

## Deferred from: faster `npm run check` (2026-11-22)

- source_spec: none (party-mode session 2026-11-22, "make npm run check faster")
  summary: Spine drift (Stack, AD Testing row): `check:py` now runs pytest on every core with pytest-xdist (`-n auto`), a new dev dependency, and `npm run check` runs `check:api`, then `check:py` and `check:e2e` together, then `check:smoke` (`scripts/check.mjs`).
  evidence: `backend/pyproject.toml` dev group, `package.json` `check` and `check:py`, `scripts/check.mjs`, `backend/tests/test_packaging.py`.
  resolved: 2026-11-22 in the same change: the Stack table gains `pytest-xdist (dev) 3.8.x`, mapped in `backend/tests/test_stack_pins.py`. The Testing row's "`npm run check` runs them all" still holds.

## Deferred from: build of spec-13-1-restore-my-library-through-an-agent-with-two-confirmations (2026-11-21)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-21, AD-9), reconciled before the next epic: `list_local_backups`, `preview_restore` and `restore_backup` are built (AD-21's Tools list still says "planned for Epic 13"), and the three codes `restore_outside_backups`, `restore_not_confirmed` (with `reason`) and `safety_copy_failed` are in `ErrorCode` (AD-9 still says "planned"). The Agent-tools rule in Consistency Conventions still calls `restore_backup` planned. Low.
  evidence: `backend/bookvie/agent/tools.py` `TOOLS`; `backend/bookvie/intents/contract.py`; spine lines for AD-21 Tools, AD-9 and "Agent tools are a second way in".
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-21 Tools lists the five backup and restore tools as built, AD-9's three restore codes are marked story 13.1, and AD-3's agent-tools rule no longer says planned.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-22 Lock-free cores), reconciled before the next epic: the core is `write_export_zip(store, out, now)` and `build_export(store, now)` takes the backup time, because one `clock.now()` stamps `library.json`'s entry (local `date_time` plus a 0x5455 extended-timestamp field with the UTC instant) and names the backup. The spine gives `write_export_zip(store, out)` and doesn't name the 0x5455 field; `backup_time()` in `intents/export.py` reads it, falling back to `date_time` as local time. Low.
  evidence: `backend/bookvie/intents/export.py` `write_export_zip`, `extended_timestamp`, `backup_time`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Lock-free cores gives `write_export_zip(store, out, now)` and `build_export(store, now)`, and AD-22 Backup time names the 0x5455 field and `backup_time`'s fallback to `date_time`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-22 Restore through an agent), reconciled before the next epic: the spine gives the preview's contents but not its keys, now `{backupTime, backup: {books, cardNotes, covers}, current: {...}, booksAddedSince, cardNotesAddedSince}`; the gate is `agent/restore_gate.RestoreGate`, one per app (`app.state.restore_gate`), so a second `create_app` refuses the first's tokens as `expired`; the token is `<process nonce hex>.<base64url JSON payload>.<base64url HMAC>`, checked process nonce, MAC, expiry (the nonce is spent either way), nonce not issued or spent, then the answer (corrected by the code review of 2026-11-22: the build-auto review patch moved the expiry check before the issued-nonce check), then the path, then the hashes under the lock; the input request's key is `confirm`. Low.
  evidence: `backend/bookvie/agent/restore_gate.py`; `backend/bookvie/agent/tools.py` `_restore_backup`; `backend/bookvie/intents/restore_file.py` `RestorePreview`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 `preview_restore` gives `RestorePreview`'s keys; Gate 2 gives the token format, one `RestoreGate` per app (`app.state.restore_gate`), the `confirm` key and the check order (expiry before the issued nonce); Apply checks the library hash before reading the file.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-22 Allowed files), reconciled before the next epic, or a decision for Oleg: the spine allows "a daily name or a safety-copy name" in the backups folder or its `from-dropbox/`. The build accepts a safety-copy name only directly in the backups folder, and only daily names in `from-dropbox/`, matching AC-1's listing ("the `from-dropbox/` daily backups") so every restorable file is listable. A named file in the backups folder that can't be read as a zip holding `library.json` is left out of `list_local_backups` and logged; `preview_restore` on its path still names the refusal. Low.
  evidence: `backend/bookvie/intents/backup_file.py` `resolve_backup_path`, `_kind_in_from_dropbox`, `list_local_backups`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Allowed files now says a safety-copy name only directly in the backups folder and only daily names in `from-dropbox/`, and `list_local_backups` says an unreadable file is left out and logged.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: UX-DR80 doesn't word bookvie's question when only Books, or only Card notes, were added since the backup. The build says "You'd lose N books added since (…), and every other change since then." and "You'd lose N card notes added since, and every other change since then." (spec Design Notes). Oleg or the UX should confirm or reword it in EXPERIENCE.md, then `tests/helpers.confirmation_text` follows. Low.
  evidence: `backend/bookvie/agent/restore_gate.py` `confirmation_text`; `backend/tests/test_agent_restore.py::test_only_books_or_only_card_notes_added_names_just_those`.

## Deferred from: build-auto review of spec-13-1-restore-my-library-through-an-agent-with-two-confirmations (2026-11-21)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (Structural Seed, Capability → Architecture Map), reconciled before the next epic: two new modules, `intents/restore_file.py` (`prepare_restore`, `apply_confirmed_restore`, `RestorePreview`, `Sealed`) and `agent/restore_gate.py` (`RestoreGate`, `confirmation_text`). The seed's `intents/` line names only `backup_file` for the restore pieces and its `agent/` line only `server.py` and `tools.py`; the FR-30 map row names `intents/restore` and `intents/backup_file` and still says "(planned)". Low.
  evidence: build-auto review spine-check layer, finding 5.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Modules names `intents/restore_file` and `agent/restore_gate`; the Seed's `agent/` and `intents/` lines and the FR-30 map row name them and no longer say planned.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-21 One validator), reconciled before the next epic: `restore_backup` is a write tool whose arguments are `{path}` (`PathArguments`), not an intent's JSON body, and it and `preview_restore` parse them with `parse_view_arguments`. AD-21 says a write tool's arguments are its intent's body parsed by the route's `parse_*_intent`; AD-22 doesn't state the exception. Low.
  evidence: build-auto review spine-check layer, finding 6; `backend/bookvie/agent/tools.py` `_restore_backup`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-21 One validator says `preview_restore` and `restore_backup` parse `PathArguments` (`{path}`) with `parse_view_arguments`, as `list_local_backups` and `export_backup` parse theirs.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: In Story 13.3 (AR48, its AC on `backups_dir` being `None`): a non-default data folder whose sibling rule gives `~/bookvie-backups` or `~/bookvie-backups-dev` (for example `~/bookvie`) still gets that folder from `backups_folder`. Until 13.3 lands, a server on such a folder lists and restores the real library's backups and writes its safety copies there, since 13.1's tools read `backups_dir`. Medium.
  evidence: build-auto review spine-check layer, finding 7; `backend/bookvie/intents/backup_file.py` `backups_folder`; epics.md Story 13.3.
  resolved: Story 13.3. `backups_folder` answers `None` when the sibling lands on either default backups folder (samefile, then resolved paths case-folded); `test_agent_backup_upload.py` AC-7 leaf (in-process and a real `bookvie --data-dir ~/bookvie`) and `test_agent_backup.py` folder-rule leaf.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: In Story 13.2 or 13.7: `dropbox_content_hash` (`intents/backup_file.py`) is only tested on files under one 4 MiB block, against a test helper written the same way. Add Dropbox's published example vector, or an over-4-MiB and exactly-8-MiB file, when the `bookvie_dropbox` copy and the compare test land. Medium (unverified against Dropbox).
  evidence: build-auto review verification-gap layer finding 3 and blind-hunter finding 7.
  resolved: Story 13.2, `backend/tests/test_dropbox_contracts.py` (both copies on 0 … 12 MiB+5 bytes against the helper, and Dropbox's published block digests give its published hash). The 9.7 MB `milky-way-nasa.jpg` itself isn't committed (Oleg's call).

## Deferred from: code review of spec-13-1-restore-my-library-through-an-agent-with-two-confirmations (2026-11-21)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-21 Same handler, same answers), reconciled before the next epic: AD-21's error-object list omits `reason`, which `restore_not_confirmed` carries (AD-9 has it); AD-21 doesn't mention an interactive tool's `InputRequiredResult` answer or the `interactive`/`ToolCall` path in `_answer`; and `list_local_backups`/`preview_restore` return `LocalBackups` and `RestorePreview` from `intents/`, not `views/` models, where AD-21 says a read tool returns its view's model. Low.
  evidence: `backend/bookvie/agent/server.py` `_answer`, `_tool_call`; code review spine-check finding 8.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-21 Same handler lists `reason` in the error object, describes an interactive tool's `ToolCall` and `InputRequiredResult`, and says the restore tools return `intents/` models (`LocalBackups`, `RestorePreview`).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-1, Stack, Structural Seed, Consistency Conventions), reconciled before the next epic: lines outside AD-21/AD-9 still say "planned" for what 13.1 built: AD-1's "(planned, AD-22) … the backups listing", the Stack `mcp` row's "planned: `InputRequiredResult`", the seed's `docs/dropbox-backup.md # planned`, and the Testing row's "planned, AD-22" gates, safety copy and lock-free cores. (The build's first entry names a Consistency Conventions "Agent-tools rule"; the Testing row is the one that says it.) Low.
  evidence: code review spine-check finding 9.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-1, the Stack `mcp` row, the Seed's `docs/dropbox-backup.md` and the Testing row no longer say planned.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: Spine drift (AD-1, AD-22 Apply), reconciled before the next epic: `write_safety_copy` creates the backups folder (with parents) when it's missing and resolves it through symlinks; AD-1 says only that `export_backup` creates it. Low.
  evidence: `backend/bookvie/intents/backup_file.py` `write_safety_copy`; code review spine-check finding 10.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-1 says `write_safety_copy` creates the folder with its parents and resolves it through symlinks.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md`
  summary: `docs/dropbox-backup.md` states client behavior AC-11 hasn't observed yet: that Claude Code's permission prompt names `restore_backup` and the backup's path, and that the terminal CLI can show bookvie's question while VS Code, the desktop app and `claude -p` can't. Medium if wrong, unverified; settled by AC-11's recorded run, after which the guide is corrected if the run disagrees.
  evidence: `docs/dropbox-backup.md` "The two prompts"; code review blind-hunter finding 6 and acceptance-auditor finding 1.
  resolved: 2026-11-22, AC-11's manual runs (spec "Manual runs (AC-11)") behaved as the guide says; no guide change.

## Deferred from: build-auto review of spec-13-2-upload-a-backup-to-my-dropbox (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Dropbox tools), reconciled before the next epic: `upload_backup` can't finish with "the whole file's `content_hash` (Dropbox refuses a mismatch)": the SDK's `content_hash` is per request and `CommitInfo` has none. The code sends Dropbox's per-request hash (`auto_content_hash`) and checks the returned `size` and `content_hash` against the bytes sent, before any prune; AC-6's wording needs the same fix. Low.
  evidence: spine-check finding 1, intent-alignment divergence 2; ATDD checklist "For the build" 1; `backend/bookvie_dropbox/upload.py` `_upload`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Dropbox tools says every request carries Dropbox's per-request content hash (`auto_content_hash`) and the returned `size` and `content_hash` are checked against the bytes sent, before any prune. In `epics.md`, Story 13.2 AC-6 says the same (Oleg's decision in the Epic 13 trace).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Dropbox scope and sign-in), reconciled before the next epic: there is no `DropboxApi` seam. The seam is `build_server(connect=…)`, whose `connect()` returns the SDK's `dropbox.Dropbox`; `upload.py` calls the SDK's own `files_*` methods and tests fake the SDK client (`tests/dropbox_fakes.py` `FakeDropbox`), as the ATDD pinned. Low.
  evidence: spine-check finding 2; `backend/bookvie_dropbox/server.py` `build_server`, `dropbox_api.py` `connect`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Seam names `build_server(connect=…)`, the SDK's `dropbox.Dropbox` and `FakeDropbox`; the Seed and the Testing row no longer name `DropboxApi`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Dropbox tools, "Any failure deletes nothing"), reconciled before the next epic: a prune that fails after a verified upload answers `other` (the message says the upload was verified and names any name already deleted), so it may have deleted some older dailies. The spine should narrow "deletes nothing" to failures before the verify. Low.
  evidence: spine-check finding 3; spec I/O matrix row "Prune fails after verify"; `tests/test_dropbox_upload_edges.py`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 "What a failure leaves" narrows "deletes nothing" to failures before the finish, and says a prune that fails after the verify answers `other`, naming any backup already deleted.
  note: Epic 13 retro item 91 (2026-11-23) changed the behavior (Oleg's decision): a delete that fails in the prune after a verified upload now answers the upload, with the real `copies`, the names `deleted` and `pruneFailed`, and the skill records `uploaded`; a failed listing there is still `other`, since the count isn't known. AD-22 "What a failure leaves" says so.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Causes, AD-9), reconciled before the next epic: `upload_backup`'s failure is `isError` with one JSON text `{cause, message}`, not AD-9's error object (`kind`, `code`, `message`), while AD-9's binding names "the agent tools' errors (AD-21, AD-22)". Low.
  evidence: spine-check finding 4; `backend/bookvie_dropbox/server.py` `_error`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Causes "Error shape" gives `bookvie-dropbox`'s `{cause, message}`, and AD-9's Binds say its tools answer that instead of AD-9's error object.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: In Story 13.3: the cause enum `CAUSES` exists only in `bookvie_dropbox/contracts.py`; AD-22's copied-contracts rule wants bookvie's copy (13.3's `record_backup_upload` cause) and a test comparing the two. 13.3's AC already asks for it ("bookvie's equals `bookvie_dropbox`'s (Story 13.2)"). Low.
  evidence: spine-check finding 5; epics.md Story 13.3.
  resolved: Story 13.3. `bookvie.intents.backup_file.CAUSES`; `test_dropbox_contracts.py::test_bookvie_keeps_the_same_cause_enum_as_bookvie_dropbox` compares the copies.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Dropbox scope and sign-in, Consistency Conventions Config), reconciled before the next epic: the fixed loopback redirect is `http://127.0.0.1:8790/dropbox-auth` (`REDIRECT_PORT` 8790), a second fixed listener beside bookvie's 8765/8766 (AD-16); the spine names no port. Low.
  evidence: spine-check finding 6; `backend/bookvie_dropbox/auth.py`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Dropbox scope and sign-in names port 8790 (`REDIRECT_PORT`) beside AD-16's 8765 and 8766, and the Config row names the port.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (Stack), reconciled before the next epic: `requests` (2.34.x) is now a declared runtime dependency of `bookvie_dropbox` (it imports it directly in `auth.py` and `upload.py`), with no Stack row, like httpx2's note. Low.
  evidence: spine-check finding 7 (the undeclared import was patched in pyproject.toml); `backend/pyproject.toml`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, the Stack table has a `requests` 2.34.x row, mapped in `backend/tests/test_stack_pins.py`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (Design Paradigm, AD-22, Consistency Conventions Config, Stack, Structural Seed), reconciled before the next epic: lines still say "planned" for what 13.2 built: the Design Paradigm's "(Epic 13, planned)", the mermaid "MCP over stdio (planned)", the Config row's `bookvie-dropbox auth` and `serve`, the Stack `dropbox`, `keyring` and `mcp` stdio rows, and the Structural Seed's wheel packages, smoke check, `bookvie_dropbox/` and `docs/dropbox-backup.md`. Low.
  evidence: spine-check finding 8.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, the Design Paradigm's mermaid, the Config row, the Stack `dropbox`, `keyring` and `mcp` rows (now checked by `test_stack_pins.py`) and the Seed's wheel packages, smoke check, `bookvie_dropbox/` and `docs/dropbox-backup.md` no longer say planned. The Paradigm's "(Epic 13, planned)" was already gone.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Before Story 13.4's manual run: `APP_KEY` in `backend/bookvie_dropbox/dropbox_api.py` is the placeholder `REPLACE-WITH-YOUR-DROPBOX-APP-KEY` (the app wasn't registered when the build ran). Oleg registers the Dropbox app as the guide's Setup says and commits the real key. `bookvie-dropbox auth` refuses to start until then. Medium.
  evidence: spec Design Notes "App key"; blind-hunter finding 2, edge-case finding 3, intent-alignment divergence 1.
  resolved: Story 13.2, 2026-11-22: Oleg registered the app and gave its key; `APP_KEY` in `backend/bookvie_dropbox/dropbox_api.py` holds it, and the guide's Setup step 6 says so.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: A refresh refused with something other than 400 `invalid_grant` (for example an unknown app key) becomes the SDK's `BadInputError`, which `upload_backup` answers as `other`, not `dropbox_signin`. Medium if Dropbox answers a wrong app key that way, unverified; settled by Story 13.4's first real run or a check of Dropbox's token-endpoint errors. Medium (unverified).
  evidence: verification-gap other finding 2; `.venv/.../dropbox/dropbox_client.py` `raise_dropbox_error_for_resp`.
  note: Story 13.4's first real run (2026-11-22) refreshed and uploaded with the real app key, so the placeholder-key case is gone; a refused refresh wasn't exercised, so the mapping itself stays unverified and open.

## Deferred from: code review of spec-13-2-upload-a-backup-to-my-dropbox (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-8, AD-21 One validator), reconciled before the next epic: `upload_backup`'s input schema is a hand-written dict, not generated from a Pydantic model, and a bad argument answers cause `other`, not `invalid_fields`; AD-8 and AD-21 describe the rule for bookvie's `agent/` tools only, and AD-22 says neither that `bookvie_dropbox` is exempt nor how its arguments are validated. Low.
  evidence: `backend/bookvie_dropbox/server.py` `UPLOAD_BACKUP_SCHEMA`, `_answer`; code review spine-check finding 5.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-8 says `bookvie_dropbox`'s three tools have hand-written schemas and check their own arguments, a wrong set being cause `other`; AD-22 Causes says the same.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: AC-10's red leaf asserts only `cause in CAUSES` for a refused path, so a per-branch change of one refusal's cause passes; add a parametrised `== "other"` check over every AC-10 case in `test_dropbox_upload_edges.py` (the leaf itself can't change). For `bmad-testarch-automate`. Low.
  evidence: `backend/tests/test_dropbox_upload.py:477`; code review verification-gap finding 5.
  resolved: Story 13.2 automate (2026-11-22). `backend/tests/test_dropbox_follow_ups.py::test_every_refused_path_is_other_before_any_dropbox_call` asserts `cause == "other"`, a `Not uploaded:` message, `connect` never called and no Dropbox call over AC-10's 10 cases plus a NUL, a symlink loop and an unreadable file; `test_arguments_outside_the_schema_are_other_before_any_dropbox_call` covers a number, an empty path, no `localPath` and an extra argument. The leaf went in a new module, not `test_dropbox_upload_edges.py`. A mutation that changed the refusal's cause to `backup_write` failed it.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: `cli.main`'s `auth` branch has no test: `AuthFailed` → stderr and exit 1, `KeyboardInterrupt` → exit 130. For `bmad-testarch-automate`. Low.
  evidence: `backend/bookvie_dropbox/cli.py` `main`; code review verification-gap other finding 1.
  resolved: Story 13.2 automate (2026-11-22). `backend/tests/test_dropbox_cli_follow_ups.py::test_a_failed_or_cancelled_auth_exits_non_zero_with_one_line_on_stderr` pins `AuthFailed` → exit 1 and `KeyboardInterrupt` → exit 130, each with one stderr line and nothing on stdout; two more leaves pin that `auth` returns without serving and `serve` never signs in. Mutations to exit 0 and exit 1 each failed it.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md`
  summary: Spine drift (AD-22 Dropbox tools), reconciled before the next epic: `upload_backup` finishes straight to `/.backups/<name>` with `WriteMode.overwrite` and checks `size`/`content_hash` after the commit, so a finish answering a mismatch has already replaced an earlier same-day copy. epics.md AC-9 ("a failed second upload leaves the first in place") and the tool description ("A failed or mismatched upload deletes nothing") hold only for faults before the finish; narrow AD-22 and epics.md (the description changes in epics.md first). Oleg's call in review: an honest mismatch message, not a temp name plus `files_move_v2` (which can't overwrite, so it leaves a moment with no copy). Medium.
  evidence: `backend/bookvie_dropbox/upload.py` `_upload`; code review blind-hunter 1, edge-case 1, acceptance-auditor 1.
  resolved: Epic 13 retro item 89 (2026-11-23). The spine side only: AD-22 "What a failure leaves" says a mismatch after the finish has already replaced that day's copy (Oleg's honest-message call). The `epics.md` side (Story 13.2 AC-9 and the `upload_backup` description) goes with Epic 13 retro item 91, as does the open non-drift Medium entry on the messages.
  resolved: Epic 13 retro item 91 (2026-11-23). The `epics.md` side and the messages: Story 13.2's `upload_backup` **Description:** (and `bookvie_dropbox/server.py`'s registered text, equal to it), AC-8 and AC-9, AR47 and FR-29 (and the PRD's FR-29) no longer say a mismatched upload deletes nothing or leaves the first copy in place; they say no older backup is deleted and a mismatch after the finish has already replaced that day's copy. The skill line, the Backup page and the guide say the same for `upload_incomplete` (EXPERIENCE.md's Failed reasons: "No older backup in Dropbox was deleted, but that day's copy there may be damaged"), and keep "Nothing in Dropbox was deleted" only for `dropbox_signin` and `dropbox_full`, which come before Dropbox writes anything.

## Deferred from: build-auto review of spec-13-3-record-each-upload-in-bookvie (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-15 State that is not exported), reconciled before the next epic: an unreadable `local-state.json` (an OSError other than not-found) is now `CouldntSave` and left as it is, so the next export no longer overwrites it; AD-15 still says the next export overwrites an unreadable or malformed file. A malformed one is still replaced. Low.
  evidence: spine-check finding 1; `backend/bookvie/store/local_state.py` `LocalStateWriter.update`; `backend/tests/test_export.py` `test_an_unreadable_local_state_reads_as_no_export_and_an_export_leaves_it_as_it_was`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-15 Damaged files says an unreadable file is `CouldntSave` for the writer and left as it is; only a malformed one is replaced.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-15, AD-4 readers of `local-state.json`), reconciled before the next epic: `export_backup` (`intents/backup_file` `_last_upload_hash`, through `read_group`) now reads `local-state.json` outside the AD-4 lock to answer `unchangedSinceUpload`; AD-15 and AD-4 list only `views/backup` and `views/shelf` as readers. Low.
  evidence: spine-check finding 2; `backend/bookvie/intents/backup_file.py` `_last_upload_hash`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-4 and AD-15 list `export_backup` (`_last_upload_hash`, through `read_group`) as the third reader.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-22 `record_backup_upload`), reconciled before the next epic: an argument the outcome doesn't need is refused as `invalid_fields` (`skipped` with any other argument, `failed` with `path`/`copies`/`contentHash`, `uploaded` with `cause`), `copies` must be at least 1 and `contentHash` 64 lowercase hex; AD-22 states only what each outcome needs. Low.
  evidence: spine-check finding 4; `backend/bookvie/intents/backup_file.py` `_WANTED`, `_argument_errors`; spec Design Notes "Extra arguments are refused".
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 `record_backup_upload` lists the refused extra arguments, `copies` at least 1 and `contentHash` 64 lowercase hex.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-1, AD-3, AD-15, AD-21 Tools/One validator/Backup, AD-22, Structural Seed, Capability Map FR-29), reconciled before the next epic: lines still say "planned" for what 13.3 built (`record_backup_upload`, `forUpload`, `libraryHash` and `unchangedSinceUpload`, the one local-state writer, the `None` backups folder), and AD-21's tool list puts `record_backup_upload` before the restore tools while `TOOLS` registers it last. Low.
  evidence: spine-check finding 5; `backend/bookvie/agent/tools.py` `TOOLS`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-1, AD-3, AD-15, AD-21 (Tools, One validator, Backup), AD-22, the Seed and the FR-29 row no longer say planned, and AD-21's tool list follows `TOOLS`' order.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Pre-existing flaky tests (from Story 13.2's automate commit `b64f901`): under `npm run check` (`pytest -n auto` with coverage, beside the e2e run), `test_dropbox_cli_follow_ups.py` and `test_dropbox_auth.py` sign-in leaves that bind the fixed redirect port 8790 intermittently fail with "Port 8790 … is in use" or a fake browser that visited nothing (`[] == [200]`). Both files pass serially (20/20, twice). Grouping them on one xdist worker (`xdist_group` + `--dist loadgroup`) didn't help (10 failures), so the cause isn't only cross-worker; likely a too-tight wait or a listener not yet released under load. The baseline `609cd19` shows it too (16 failures against the 13 expected red ones on one of three runs). It failed 4 of 7 full checks in this build. Medium.
  evidence: build-auto verification runs 2026-11-22 (check logs in the build's scratchpad); `backend/tests/test_dropbox_cli_follow_ups.py` `Browser`, `backend/tests/test_dropbox_auth.py:355` port-holder leaf; `bookvie_dropbox/auth.py` `_Redirect`.
  resolved: Epic 13 retro item 92 (`spec-epic-13-retro-item-92-stop-the-port-8790-flake.md`), 2026-11-23. The cause was not a wait or a slow release: every sign-in test listened on the same 127.0.0.1:8790 from parallel xdist processes (`pytest -n 8` on the two files failed 9 or 10 of 20 every run; `-n 1` and serial passed every run). `run_auth` now has a keyword-only `port` test seam the CLI never passes, and every sign-in test but the AC-4 fixed-port one uses a free port. 5 green `npm run check` runs in a row are recorded in the spec.

## Deferred from: code review of spec-13-3-record-each-upload-in-bookvie (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-15 State that is not exported), reconciled before the next epic: `read_last_export` now reads a JSON object with no `lastExportAt` (`{}`, or a file holding only `autoBackup`) as no export without a log; AD-15 says only that an unreadable or malformed file is logged, and the `{}` case left `test_store.py`'s malformed list. The spine should say a missing key is valid and silent. Low.
  evidence: code review spine-check finding 5 and acceptance-auditor finding 4; `backend/bookvie/store/local_state.py` `read_last_export`; `backend/tests/test_agent_backup_upload.py` `test_a_state_file_with_only_the_upload_group_reads_as_no_export_without_a_log`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-15 Damaged files says a JSON object with no `lastExportAt` is valid and silent.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-3-record-each-upload-in-bookvie.md`
  summary: Spine drift (AD-21 One validator), reconciled before the next epic: after the code review (Oleg's decision, 2026-11-22), `export_backup` parses its arguments with `parse_view_arguments`, so a bad `forUpload` or an unknown argument is `invalid_fields` naming that argument; AD-21 still says `export_backup` refuses as the malformed intent on `intent` "until Epic 13 gives it the optional `forUpload`", and doesn't say which parser it uses after. Low.
  evidence: `backend/bookvie/agent/tools.py` `_export_backup`; `backend/tests/test_agent_backup.py` `test_an_argument_is_refused_and_no_file_is_written`; `backend/tests/test_agent_backup_upload.py` `test_for_upload_that_isnt_a_boolean_is_refused_and_writes_no_file`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-21 One validator says `export_backup` parses `ExportBackupArguments` with `parse_view_arguments` (Oleg's decision in story 13.3's review).

## Deferred from: build-auto review of spec-13-4-back-up-to-dropbox-with-one-skill (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-back-up-to-dropbox-with-one-skill.md`
  summary: Spine drift (AD-8, Design Paradigm, Capability Map FR-28), reconciled before the next epic: bookvie-backup is a third skill with the same step 1, cut to the `bookvie` entry (8765) only and never `bookvie-dev`; the spine still says "the two bookvie skills", "both skills carry the same step 1" and that the skills use `bookvie-dev` when asked. Low.
  evidence: spine-check finding 1; .claude/skills/bookvie-backup/SKILL.md step 1; README AI skills now lists three skills.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, the Design Paradigm, AD-8 and the FR-28 row name all four skills; AD-8 says `bookvie-backup`'s step 1 is cut to the `bookvie` entry.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-back-up-to-dropbox-with-one-skill.md`
  summary: Spine drift (AD-22 bookvie-backup skill), reconciled before the next epic: the skill reads `get_app_info`'s `mode` and stops on `"dev"` (and on any answer other than `"production"`) before `export_backup`, uploading and recording nothing; AD-22 lists `get_app_info` only as a reachability check. Low.
  evidence: spine-check finding 2; SKILL.md step 2; test_on_a_dev_server_the_skill_uploads_nothing_records_nothing_and_says_so.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 `bookvie-backup` skill "Before the export" gives the `mode` stop.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-back-up-to-dropbox-with-one-skill.md`
  summary: Spine drift (AD-22 bookvie-backup skill), reconciled before the next epic: AD-22 says `record_backup_upload` is called always; the skill records nothing on a dev stop, an unreadable `get_app_info`, or a headless run without bookvie's tools, records `failed`/`other` when the `upload_backup` tool is missing, and never sends a refused report twice. Low.
  evidence: spine-check finding 3, intent-alignment divergence (extra no-record exceptions); SKILL.md steps 1, 2, 4, 5; spec I/O matrix.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 `bookvie-backup` skill gives the stops that record nothing (dev, unreadable app info, an older bookvie), `failed`/`other` for a missing `upload_backup`, and no second report. The headless stop is gone since Story 13.5.

## Deferred from: code review of spec-13-4-back-up-to-dropbox-with-one-skill (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-4-back-up-to-dropbox-with-one-skill.md`
  summary: Spine drift (AD-22 Causes), reconciled before the next epic: the skill records `other` for an `upload_backup` error whose text isn't JSON, has no `cause`, or names an unknown one (an MCP timeout on the client side, say); AD-22 puts "a timeout" in `upload_incomplete`, which is bookvie-dropbox's own timeout, and says nothing of a call the skill gets no answer from. Low.
  evidence: code review spine-check finding 4; `.claude/skills/bookvie-backup/SKILL.md` step 4.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Causes says `upload_incomplete` is `bookvie-dropbox`'s own fault and the skill records `other` for an error with no usable cause.

## Deferred from: build-auto review of spec-13-5-run-the-backup-every-morning (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (AD-22 Auto-backup state), reconciled before the next epic: `views/backup` carries `autoBackup: {installed: bool}` (Oleg's ATDD decision, 2026-11-22); AD-22 lists only `state`, `offReason`, `reportAt`, `lastOkAt`, `lastUploadAt`, `copies` and `cause`. Low.
  evidence: build-auto review spine-check finding 1; `backend/bookvie/views/models.py` `AutoBackupView`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (AD-22, Source tree, Structural Seed), reconciled before the next epic: `cli.py`'s `autobackup install|uninstall|run`, `create_app`'s `launchd_probe` and the seed diagram's launchd 09:00 are built, but the spine still marks them "(planned)". Low.
  evidence: build-auto review spine-check finding 2.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (Consistency Conventions Config row, AD-22 The schedule), reconciled before the next epic: the Config row lists only `bookvie autobackup install` and `uninstall` as planned; `run` exists too. Low.
  evidence: build-auto review spine-check finding 3; `backend/bookvie/cli.py` `parse_args`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (AD-1), reconciled before the next epic: AD-1 says the one thing written outside the data folder is an agent's backup; `bookvie autobackup install` also writes `~/Library/LaunchAgents/com.bookvie.autobackup.plist` and creates `~/Library/Logs/bookvie/`. Low.
  evidence: build-auto review spine-check finding 4; `backend/bookvie/cli.py` `_autobackup_install`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).

## Deferred from: code review of spec-13-5-run-the-backup-every-morning (2026-11-22)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: `_stop`'s SIGKILL fallback (a server that ignores SIGTERM for 30 s) has no test; removing the `except subprocess.TimeoutExpired` block would let `TimeoutExpired` escape the `finally` and leave the server running. The real server stops on SIGTERM. Low.
  evidence: code review verification-gap finding 5; `backend/bookvie/cli.py` `_stop`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (Consistency Conventions Testing row, Capability Map FR-29), reconciled before the next epic: the Testing row still lists the generated plist, `autobackup run` and the guide's commands checked against the CLI as "planned, AD-22", and the FR-29 row and the "Every row below is built, except FR-29 and FR-30" line still say planned for the `cli.py` and `launchd_probe` parts Story 13.5 built. Low.
  evidence: code review spine-check finding 5; `backend/tests/test_autobackup.py`, `backend/tests/test_dropbox_backup_guide.py`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-run-the-backup-every-morning.md`
  summary: Spine drift (AD-22 `bookvie autobackup run` steps 1-4), reconciled before the next epic: the run waits at most 60 s for health and stops a started server that never answers or exits early, caps `claude` at 30 minutes, refuses before starting anything when `claude` is missing, and exits 1 for a signal-killed `claude`; the AD's steps state none of this. Low.
  evidence: code review spine-check finding 6; `backend/bookvie/cli.py` `_autobackup_run`.
  resolved: obsolete. `sprint-change-proposal-2026-11-23.md` drops the morning job (the Mac's administration policy doesn't allow a LaunchAgent); the spine's AD-22 schedule and auto-backup-state text is replaced in that pass, and Story 13.5 "Take out the morning job" removes the code (2026-11-23).

## Deferred from: build-auto review of spec-13-5-take-out-the-morning-job (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`
  summary: Spine drift (AD-22 Causes), reconciled before the next epic: AD-22 still says "The UX's Failing line has one sentence per cause"; EXPERIENCE.md's table is now the Failed reasons of the Dropbox backup line, read after `failed *when* · `. Low.
  evidence: spine-check finding 1; `ARCHITECTURE-SPINE.md:360`; EXPERIENCE.md's Dropbox backup line table header; `backend/tests/helpers.py` `failing_reasons`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Causes names EXPERIENCE.md's Failed reasons, read after `failed *when* · `.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`
  summary: "daily backup run" wording survives in agent tool descriptions and docstrings (`export_backup`'s forUpload "which only the daily backup run sends", `record_backup_upload` "Record how a daily backup run ended", `backup_file.py` and `local_state.py` docstrings), which now hints at a schedule. The two descriptions are copied from `epics.md` (lines 3168, 3173) and pinned by the description test, so a fix starts in `epics.md`. Low.
  evidence: build-auto blind-hunter finding 4; `backend/bookvie/agent/tools.py:775,889`; pre-existing since Story 13.3.
  resolved: Epic 13 retro item 89 (2026-11-23). `epics.md` Story 13.3's two Description lines say "a Dropbox backup run", and `backend/bookvie/agent/tools.py` registers the same text; the `tools.py`, `backup_file.py` and `local_state.py` docstrings say it too.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`
  summary: Before Story 13.6: EXPERIENCE.md's Failed-reasons rows mix a capitalised start ("Dropbox sign-in expired.", "Dropbox is full.") with a lowercase one ("the last upload didn't finish.", "bookvie couldn't write…", "the last run stopped…") after "failed *when* · "; 13.6 renders them and should settle the casing. Low.
  evidence: build-auto blind-hunter finding 11; `EXPERIENCE.md` Dropbox backup line table.
  resolved: kept as is, and the rule recorded in Story 13.6's spec (Design Notes): after "failed *when* · " a reason starts lowercase, like the line's other parts after "·" ("none yet · run…"), while the names Dropbox and bookvie keep their usual spelling, so the rows are already consistent. `frontend/src/lib/dropboxBackupLine.ts` renders them word for word (2026-11-23).


## Deferred from: build-auto review of spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md`
  summary: Spine drift (AD-22 Copied contracts), reconciled before the next epic: bookvie now has a second copy of the cause enum, `views.models.DropboxCause`, because `views` may not import `intents` beyond `intents.contract`; AD-22 says each copied contract exists once on each side. Alternative at reconciliation: move `CAUSES` into `intents.contract`. Low.
  evidence: spine-check finding 1; `test_dropbox_backup_line.py::test_the_views_copy_of_the_causes_matches_intents` keeps the copies equal.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Copied contracts records `views.models.DropboxCause` and the test that keeps it equal; `CAUSES` stays out of `intents.contract`.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md`
  summary: Spine drift (AD-22 Dropbox backup line), reconciled before the next epic: the spine doesn't define "unreadable" per field. The code reads as `none` a report with an unknown outcome, an `at` without an offset, a failure without a known cause, or an upload or skip without a valid `lastUpload`; a failure with a bad `lastUpload` keeps its report and only drops the last upload. Low.
  evidence: spine-check finding 2; `backend/bookvie/views/backup.py` `dropbox_backup`; the spec's I/O matrix.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Dropbox backup line "Unreadable" lists the cases.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md`
  summary: Spine drift (AD-22, AD-15, Testing row, Capability map FR-29, Structural Seed), reconciled before the next epic: the Dropbox backup line is built, but the spine still marks it planned ("planned for Epic 13", AD-15's "Epic 13 (planned)", the Testing row's "planned, AD-22: … the Dropbox backup line's states", the FR-29 row, the Seed's `local_state.py (planned …)`). Partly inherited from 13.1–13.5. Low.
  evidence: spine-check finding 3.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22, AD-15, the Testing row, the FR-29 row and the Seed's `local_state.py` no longer say planned.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md`
  summary: Spine drift (AD-6, Structural Seed), reconciled before the next epic: the Seed's `lib/` line and the FR-29 row don't name `lib/dropboxBackupLine` (nor `relativeDay`), and AD-6's App info sentence "`mode` is the only dev signal the client may read" should allow AD-22's server-decided `dropboxBackup.state === "dev"`. Low.
  evidence: spine-check finding 4; `frontend/src/lib/dropboxBackupLine.ts`; `backend/bookvie/http/api.py` `backup_view`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, the Seed's `lib/` line and the FR-29 row name `dropboxBackupLine` and `relativeDay`, and AD-6 App info allows `dropboxBackup.state` `dev`.

## Deferred from: build-auto review of spec-13-7-fetch-a-backup-from-my-dropbox (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-7-fetch-a-backup-from-my-dropbox.md`
  summary: Spine drift (AD-22 Backup time, Dropbox tools), reconciled before the next epic: `list_backups` reports and orders by the `client_modified` that `upload_backup` stamped, not the zip entry's time; it lists only daily `FileMetadata`, newest first, as `{"backups": [...]}`, and a missing folder as `[]`. `download_backup` also checks the size, refuses a symlinked `from-dropbox`, fsyncs the folder, and maps `ApiError` to `other` and transfer faults to `download_incomplete`. Low.
  evidence: build-auto review spine-check findings 1-3, intent-alignment divergence 2; `backend/bookvie_dropbox/download.py`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Backup time and Dropbox tools give `list_backups`' order, shape and empty folder, and `download_backup`'s size check, symlink refusal, folder fsync and causes.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-7-fetch-a-backup-from-my-dropbox.md`
  summary: Spine drift (AD-22 Causes, Copied contracts; AD-9), reconciled before the next epic: `DOWNLOAD_CAUSES` (`dropbox_signin`, `download_incomplete`, `other`) is a `bookvie_dropbox`-only cause set beside the closed five-cause enum, and `list_backups`/`download_backup` answer `{cause, message}` with a bad argument set as `other`, not AD-9's error object (widens the `upload_backup` entries). Low.
  evidence: build-auto review spine-check findings 4 and 6; `backend/bookvie_dropbox/download.py` `DOWNLOAD_CAUSES`, `server.py` `_error`.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22 Causes and Copied contracts name `DOWNLOAD_CAUSES` as `bookvie_dropbox`'s alone, and the Error shape covers all three tools.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-7-fetch-a-backup-from-my-dropbox.md`
  summary: Spine drift (AD-1; Structural Seed, Capability map, Testing row), reconciled before the next epic: `download_backup`'s `mkdir(parents=True)` can create a missing backups folder, not only `from-dropbox/`; and the spine still marks `list_backups`/`download_backup` planned, with `list_backups` under FR-29 rather than FR-30. Low.
  evidence: build-auto review spine-check findings 5 and 7.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-1 and AD-22 say `download_backup` can create a missing backups folder; the Seed, the map and the Testing row no longer say planned, and `list_backups` is on the FR-30 row.

## Deferred from: build-auto review of spec-13-8-restore-with-one-skill-from-this-computer-or-dropbox (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md`
  summary: Spine drift (Design Paradigm, AD-8, Capability map FR-28), reconciled before the next epic: the spine names only `bookvie-new-book` and `bookvie-notes-summary` as agent-client skills that share step 1 ("both skills carry the same step 1"); `bookvie-restore` is a fourth one with the same step 1, and unlike `bookvie-backup` it uses `bookvie-dev` when asked (widens the `bookvie-backup` third-skill entry). Low.
  evidence: build-auto review spine-check finding 1; `.claude/skills/bookvie-restore/SKILL.md` step 1; README → AI skills.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, the Design Paradigm, AD-8 and the FR-28 row name all four skills, and AD-8 says `bookvie-restore` uses `bookvie-dev` when asked.
- source_spec: `_bmad-output/implementation-artifacts/spec-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md`
  summary: Spine drift (AD-22, Capability map FR-30, Structural Seed), reconciled before the next epic: the `bookvie-restore` skill and the guide's skill walkthrough are built, but the spine still marks them planned (AD-22's "planned for Epic 13", the FR-30 row's "Restore through an agent (planned)", the Seed's `docs/dropbox-backup.md` "planned (AD-22, plan D12)"); widens the 13.6 and 13.7 planned-marker entries. Low.
  evidence: build-auto review spine-check finding 2.
  resolved: Epic 13 retro item 89 (2026-11-23). In the spine, AD-22's header, the FR-30 row and the Seed's `docs/dropbox-backup.md` no longer say planned.

## Deferred from: build of spec-epic-13-retro-item-89-reconcile-the-spine-with-epic-13 (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-13-retro-item-89-reconcile-the-spine-with-epic-13.md`
  summary: For Epic 13 retro item 91: besides Story 13.2 AC-9 and the `upload_backup` description, three more places still promise "nothing deleted" after a mismatched upload, which the narrowed AD-22 contradicts: `epics.md` AR47 ("any failure deletes nothing"), Story 13.4's guide AC ("troubleshooting for a failed or mismatched upload (nothing deleted; …)"), and `docs/dropbox-backup.md:131`. Also `docs/dropbox-backup.md:5` still calls `bookvie-dropbox` an MCP server "with one tool, `upload_backup`", stale since Story 13.7. Low.
  evidence: item 89's Blind Hunter review; AD-22 "What a failure leaves"; `bookvie_dropbox/upload.py` `_upload` (the mismatch message says the earlier same-day copy was replaced).
  resolved: Epic 13 retro item 91 (2026-11-23). `epics.md` AR47 and Story 13.4's guide AC now say no older backup is deleted and a mismatch may have replaced that day's copy; `docs/dropbox-backup.md`'s How it works step 4 says the same, and its opening says bookvie-dropbox has three tools (`upload_backup`, `list_backups`, `download_backup`).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-13-retro-item-89-reconcile-the-spine-with-epic-13.md`
  summary: `epic-13-traceability-matrix.md` (lines 57, 83–85, 97, 402–403) and `epic-13-gate-decision.json` still list Story 13.2 AC-3 and AC-6 as open gaps that "action 89" will reword. Item 89 reworded them in `epics.md`; the trace artifacts should say so (or be re-traced) before the Epic 14 gate reads them. Low.
  evidence: item 89's Blind Hunter review; `epics.md` Story 13.2 AC-3 and AC-6 now carry "Reworded 2026-11-23" notes.
  resolved: Epic 13 retro item 88's re-trace (`d6bbd40`, 2026-11-23). `epic-13-traceability-matrix.md` lists 13.2 AC-3 and AC-6 as FULL, reworded by item 89 (gaps G2 and G3 closed by `b7fe93a`), and `epic-13-gate-decision.json` names only 13.1 AC-11 as the P0 gap.

## Deferred from: build of spec-epic-13-retro-item-95-split-backup-file-and-agent-tools (2026-11-23)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-13-retro-item-95-split-backup-file-and-agent-tools.md`
  summary: Spine drift (AD-4, AD-8, AD-21, AD-22, Structural Seed, Capability map), reconciled before the next epic: the spine still names `intents/backup_file` and `agent/tools.py`, which item 95 split. `intents/backup_file` is gone: the names and the folder rule are in `intents/backup_names`, the listing and hashes in `intents/backup_listing`, `export_backup`'s file (and `_last_upload_hash`, with the `autoBackup` part names) in `intents/backup_daily`, the allowed restore files and the safety copy in `intents/backup_restore`, and `record_backup_upload` with `CAUSES`, `_WANTED` and `_argument_errors` in `intents/backup_upload`. `agent/tools.py` holds only `TOOLS`: `ToolCall`, `AgentTool`, `JSON_VALUE_TYPES` and `parse_view_arguments` are in `agent/tool_base.py`, and the tools in `agent/read_tools.py`, `write_tools.py`, `book_tools.py` and `backup_tools.py`. Stale mentions: AD-4's `local-state.json` readers, AD-8's `JSON_VALUE_TYPES`, AD-21 One validator, Same handler and Backup, AD-22 Copied contracts, the argument rules and Modules, the Seed's `agent/` and `intents/` lines, and the FR-28, FR-29 and FR-30 rows. Low.
  evidence: `backend/bookvie/intents/backup_*.py`, `backend/bookvie/agent/{tool_base,read_tools,write_tools,book_tools,backup_tools,tools}.py`; `grep -n "backup_file\|agent/tools" ARCHITECTURE-SPINE.md`.
  resolved: Epic 13 retro item 95 spine reconciliation (2026-11-23). The spine names the new modules: AD-4's readers (`intents/backup_daily` `_last_upload_hash`), AD-8 and AD-21 One validator (`agent/tool_base.py` `JSON_VALUE_TYPES`), AD-21 Same handler (`intents/backup_listing` `LocalBackups`, `agent/tool_base` `AgentTool`) and Backup (`intents/backup_daily`, `intents/backup_names`), AD-22 Copied contracts, the argument rules (`intents/backup_upload`) and Modules (`intents/backup_restore`, `intents/backup_listing`), the Seed's `agent/` and `intents/` lines, and the FR-28, FR-29 and FR-30 rows. `grep -n "backup_file\|agent/tools"` finds only the Seed's "split from backup_file" note.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-13-retro-item-95-split-backup-file-and-agent-tools.md`
  summary: `intents/backup_listing.py` is 89% covered on its own: `_candidates`' error paths (a backups folder that can't be resolved, a folder that can't be listed and logged, an entry whose `is_file` raises) have no test. The restore-path gate passes summed (94.06%), and these lines were uncovered inside `backup_file.py` before item 95's split too. Low.
  evidence: item 95's `check:py` coverage report, `backup_listing.py` 89% (66 statements, 7 missed): in `_candidates`, the backups folder that can't be resolved, the folder that can't be listed (logged), and the entry whose `is_file` raises.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-13-retro-item-95-split-backup-file-and-agent-tools.md`
  summary: Besides the spine, the planning and trace artifacts still cite the modules item 95 split: `epics.md`, `dropbox-backup-plan-2026-11-21.md`, `epic-13-traceability-matrix.md`, `epic-13-e2e-trace-summary.json` and Epic 12–13 ATDD checklists name `intents/backup_file` or `agent/tools.py`. The trace artifacts and checklists record the code as it was when they were written. `epics.md` should point at the new modules (`intents/backup_*`, `agent/*_tools.py`) when the spine is reconciled before Epic 14. Low.
  evidence: item 95's Blind Hunter review; `grep -rln "backup_file\|agent/tools" _bmad-output/planning-artifacts _bmad-output/test-artifacts`.
  resolved: 2026-11-23, after the item 95 spine reconciliation. `epics.md` AR42 now names `intents/backup_daily` and `intents/backup_names`; it was the only mention left in `epics.md`. `dropbox-backup-plan-2026-11-21.md`, the trace artifacts and the ATDD checklists stay as written: they record the plan and the code as they were, and AD-22 wins where the plan differs.

## Deferred from: code review of spec-14-1-carry-each-book-s-spine-color-in-the-card-notes-view (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-1-carry-each-book-s-spine-color-in-the-card-notes-view.md`
  summary: `frontend/e2e/back-to-top.spec.ts:290` ("[P2] AC-8 … short window") failed once in Story 14.1's full `npm run check`, on `/stats`, with a scroll height of 0. It looks like a timing flake: the page wasn't tall yet when the test scrolled. It passed 30 of 30 with `--repeat-each=3`, and the next full run exited 0. The test predates this story, and 14.1 doesn't touch `/stats`. If it fails again, wait for the page's content before scrolling. Low.
  evidence: the spec's Auto Run Result, Verification and Residual risks (the build's `npm run check` after its patches); Blind Hunter, code review of Story 14.1.

## Deferred from: build-auto review of spec-14-2-see-my-card-notes-as-boxes (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-see-my-card-notes-as-boxes.md`
  summary: Spine drift (AD-6, AD-15), reconciled before the next epic. The Capability → Architecture Map's lead-in still says "except FR-19's Boxes view, which Epic 14 plans", and its FR-17 to FR-19 row still lists Boxes · List with `lib/cardNotesView` and `components/CardNoteBox` as "Epic 14, planned". Story 14.2 built them. The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of Story 14.2; `frontend/src/lib/cardNotesView.ts`, `frontend/src/components/CardNoteBox.tsx`.
  resolved: 2026-11-24, Epic 14 retro item 97. The Capability → Architecture Map's lead-in says FR-19's Boxes view is built in Epic 14, and the FR-17 to FR-19 row lists Boxes · List with `lib/cardNotesView`, `components/ViewToggle` and `components/CardNoteBox` without "planned" (`ARCHITECTURE-SPINE.md`).
- source_spec: `_bmad-output/implementation-artifacts/spec-14-2-see-my-card-notes-as-boxes.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The Structural Seed's `components/` line ties `ViewToggle` to Catalog's toolbar, and the FR-17 to FR-19 row doesn't list it for the Card notes page. Story 14.2 made `ViewToggle` generic (`label`, `options`), and both Catalog and the Card notes toolbar use it. Low.
  evidence: Spine Check, build-auto review of Story 14.2; `frontend/src/components/ViewToggle.tsx`, `frontend/src/pages/CatalogPage.tsx`, `frontend/src/pages/CardNotesPage.tsx`.
  resolved: 2026-11-24, Epic 14 retro item 97. The Structural Seed's `components/` line calls `ViewToggle` the generic view toggle (`label`, `options`) used by Catalog's toolbar and the Card notes toolbar, and the FR-17 to FR-19 row lists it (`ARCHITECTURE-SPINE.md`).

## Deferred from: build-auto review of spec-14-3-see-the-open-box-in-its-book-s-color (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-3-see-the-open-box-in-its-book-s-color.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The Capability → Architecture Map's FR-17 to FR-19 row still lists "the open box strip … Epic 14, planned", and its lead-in still calls FR-19's Boxes view something Epic 14 plans. Story 14.3 built the strip (`CardNotesFrame`'s `.strip` in `frontend/src/pages/CardNotesPage.tsx`, `--open-box-strip-height` in `tokens.css`). This widens the 14.2 entry above: the reconciliation should drop "planned" from the strip too, leaving only the carried search (14.5) and the shelf search (14.4) planned. The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of Story 14.3; ARCHITECTURE-SPINE.md lines 556 and 568.
  resolved: 2026-11-24, Epic 14 retro item 97. The FR-17 to FR-19 row lists the open box strip as built (`CardNotesFrame` in `pages/CardNotesPage`, `--open-box-strip-height`), and the lead-in no longer calls the Boxes view planned (`ARCHITECTURE-SPINE.md`).
- source_spec: `_bmad-output/implementation-artifacts/spec-14-3-see-the-open-box-in-its-book-s-color.md`
  summary: Story 14.3's AC-1 in `epics.md` says the open box of a Book with no notes is "reached from Book detail", but Book detail links "See all card notes" only when the Book has notes (`frontend/src/pages/CardNotesBlock.tsx`, the `notes.length > 0` branch; `card-notes.spec.ts:571`). The ATDD leaf reaches that open box through the Main book card's bare "See card notes", the same `/card-notes?book=<id>`. Fix the AC's wording ("reached from the Main book card") when `epics.md` is next touched, for example in the Epic 14 retro. The wording predates the story; no code is wrong. Low.
  evidence: the ATDD checklist's "Wording for the review"; Intent Alignment and Blind Hunter, build-auto review of Story 14.3.
  resolved: 2026-11-24, Epic 14 retro item 97. Story 14.3's AC in `epics.md` says the empty open box is reached from the Main book card's "See card notes", and that Book detail links the Card notes page only when the Book has notes.

## Deferred from: code review of spec-14-3-see-the-open-box-in-its-book-s-color (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-3-see-the-open-box-in-its-book-s-color.md`
  summary: A near-white spine on the light page, or a near-black one on the dark page, makes the open box strip nearly invisible. DESIGN.md → Components → Open box strip says "No edge, no label, no shadow. Same in both themes", and `spine_color` can be any hex color, so for such a Book only the "In *X*" chip tells Oleg which box he is in. The box front handles near-white with its shadow (DESIGN.md → Card note box → Front); the strip has nothing. Decide in the Epic 14 retro whether to accept this in DESIGN.md or give the strip an edge, like the read spine's edge line. No code is wrong against today's DESIGN.md. Low.
  evidence: Blind Hunter, code review of Story 14.3; DESIGN.md lines 813 and 909; the ATDD checklist's "near-white color" follow-up.
  resolved: 2026-11-24, Epic 14 retro item 97 (Oleg's decision in the Epic 14 retro). Accepted: DESIGN.md → Open box strip records that a spine close to the page color makes the strip faint, and that the strip is decoration and the "In *X*" chip names the box. No edge is added.

## Deferred from: build-auto review of spec-14-4-search-the-boxes (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-4-search-the-boxes.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The Capability → Architecture Map's FR-17 to FR-19 row and its lead-in still call the shelf search something Epic 14 plans, and the Structural Seed's `lib/` line still describes `useSearchCount` only as "N notes match." and `cardNotes` without the box match counts and the shelf sentence. Story 14.4 built them (`boxMatches`, `boxMatchPill`, `shelfCountLine` in `frontend/src/lib/cardNotes.ts`; the Boxes-view `useSearchCount` line in `frontend/src/pages/CardNotesPage.tsx`). This widens the 14.2 and 14.3 entries above: after it, only the carried search (14.5) is planned. The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of Story 14.4; ARCHITECTURE-SPINE.md lines 549, 556 and 568.
  resolved: 2026-11-24, Epic 14 retro item 97. The FR-17 to FR-19 row lists the shelf search (`lib/cardNotes` `boxMatches`, `boxMatchPill`, `shelfCountLine`), and the Structural Seed's `lib/` line gives `cardNotes` the box match counts, the pill, the count line and the shelf sentence, and `useSearchCount` the generic count line the page passes, the shelf sentence in Boxes view (`ARCHITECTURE-SPINE.md`, Structural Seed `lib/` and the Map's FR-17 to FR-19 row).
- source_spec: `_bmad-output/implementation-artifacts/spec-14-4-search-the-boxes.md`
  summary: Story 14.4's AC-2 in `epics.md` quotes "14 card notes in 4 Books contain “habit”.", but AC-1's own seed (3 of 12, 12 of 12, 1 of 12 and 1 of 1) adds up to 17 notes in 4 Books, and `search-boxes.spec.ts:44` asserts 17. The sentence is computed by `shelfCountLine`, so no code is wrong. Fix the AC's example when `epics.md` is next touched, for example in the Epic 14 retro. Low.
  evidence: the ATDD checklist's "Wording for the review"; Intent Alignment and Blind Hunter, build-auto review of Story 14.4.
  resolved: 2026-11-24, Epic 14 retro item 97. Story 14.4's AC-2 in `epics.md` quotes "17 card notes in 4 Books contain “habit”.", the sum of AC-1's seed.
- source_spec: `_bmad-output/implementation-artifacts/spec-14-4-search-the-boxes.md`
  summary: During a search, a faded box shows "4 card notes" but is named "*Refactoring*, no match", so its visible count isn't in its accessible name (WCAG 2.5.3, label in name), and the comment in `frontend/src/components/CardNoteBox.tsx` that the space keeps the visible text in the name now holds only at rest and for boxes with matches. The name is the exact string the story's AC-2 and EXPERIENCE.md → Card notes shelf → Search on the shelf prescribe, and `search-boxes.spec.ts` asserts it, so a change (for example "*Refactoring*, 4 card notes, no match") is a UX decision for the Epic 14 retro, not a build fix. Low.
  evidence: Edge Case Hunter, build-auto review of Story 14.4; `cardNoteBoxName` in `frontend/src/lib/cardNotes.ts`.
  resolved: 2026-11-24, Epic 14 retro item 98. A faded box is named "*Title*, N card notes, no match" ("*Refactoring*, 4 card notes, no match"; `cardNoteBoxName` in `frontend/src/lib/cardNotes.ts`), so its visible count is in its name. EXPERIENCE.md, UX-DR90, Story 14.4's AC-2 and `epic-14-context.md` say so, `card-note-boxes-plan-2026-11-23.md` D11 notes it supersedes the plan, and the axe leaf in `search-boxes-automate.spec.ts` runs `label-content-name-mismatch` and expects no violation.

## Deferred from: code review of spec-14-4-search-the-boxes (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-4-search-the-boxes.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The client presentation list's `lib/cardNotes.ts`, `lib/useSearchCount.ts` item still says the client counts matching notes only for "N notes match.". In Boxes view, `status` now reads the shelf sentence from `shelfCountLine` (`frontend/src/pages/CardNotesPage.tsx`). Line 121 already allows "M of N" and the shelf sentence, so this is stale wording only. Reconcile it with the build's 14.4 entry above. Low.
  evidence: Spine Check, code review of Story 14.4; ARCHITECTURE-SPINE.md line 118.
  resolved: 2026-11-24, Epic 14 retro item 97. The client presentation list's search item says the client counts matching notes for "N notes match." on the List and the open box, and for the shelf sentence (`shelfCountLine`) in Boxes view; the page's `countLine` picks the line, `useSearchCount` reads it when the typing pause ends, and a carried search's announcement reads it once the view is `ready` (`ARCHITECTURE-SPINE.md`, the client presentation list's search item).

## Deferred from: build-auto review of spec-14-5-keep-the-search-when-i-open-a-box-and-come-back (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-keep-the-search-when-i-open-a-box-and-come-back.md`
  summary: Spine drift (AD-6, AD-7), reconciled before the next epic. The Capability → Architecture Map's FR-17 to FR-19 row (line 568) still lists "the carried search, Epic 14, planned", and neither the Structural Seed's `lib/` line (549) nor AD-7's carried-search bullets name the new module `frontend/src/lib/carriedSearch.ts` (`useCarriedSearch`, `carryState`). Story 14.5 built the carried search, so after it nothing in that row is planned. It is the last entry in the chain of 14.2, 14.3 and 14.4 entries above, which stay open until the reconciliation pass adds their `resolved:` lines. The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of Story 14.5; ARCHITECTURE-SPINE.md lines 549 and 568.
  resolved: 2026-11-24, Epic 14 retro item 97. The FR-17 to FR-19 row lists the carried search (`lib/carriedSearch`) as built, with nothing planned, the Structural Seed's `lib/` line names `carriedSearch` (`useCarriedSearch`, `carryState`, AD-7; story 14.5), and AD-7's carried-search bullets gain "The module", naming `lib/carriedSearch.ts`, `useCarriedSearch` and `carryState` (`ARCHITECTURE-SPINE.md`).
- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-keep-the-search-when-i-open-a-box-and-come-back.md`
  summary: The Epic 14 gate in `epics.md` (line 3416, "the existing Card notes e2e specs pass unchanged in List view") and `epic-14-context.md` ("with no edit to their files") don't allow for Story 14.5's AC-3. Removing the "In *X*" chip now carries the search into the wider view, in List view too, so `frontend/e2e/card-notes.spec.ts`'s Story 5.3 chip leaf was rewritten to expect "spice" carried (the ATDD checklist planned it). No code is wrong. Narrow the gate's wording to name 14.5's exception, for example in the Epic 14 retro or its trace and gate. Low.
  evidence: Intent Alignment and Blind Hunter, build-auto review of Story 14.5; the ATDD checklist's "Existing leaves this story changes".
  resolved: 2026-11-24, Epic 14 retro item 97. The Epic 14 gate in `epics.md` names the one exception: Story 14.5's AC-3 rewrote the Story 5.3 chip leaf in `card-notes.spec.ts`, because removing the chip now carries the search. `epic-14-context.md`'s "List is unchanged" bullet says the same.

## Deferred from: code review of spec-14-5-keep-the-search-when-i-open-a-box-and-come-back (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-keep-the-search-when-i-open-a-box-and-come-back.md`
  summary: Keying the Card notes body by `location.key` is not verified by any test. The only same-`bookId` key change, the nav link on the shelf (a REPLACE), now empties the field through `useCarriedSearch`, so `carried-search.spec.ts` AC-4's nav-link branch also passes with `key={bookId ?? ''}`. A fresh pile or panel, a dropped pending count and the scroll to the top after that REPLACE are unpinned, and the ATDD checklist's line 83 ("covered by AC-4's nav-link branch") is out of date. The checklist's green follow-up "E2E, AC-5 fresh body" plans the leaf for `bmad-testarch-automate`; it should also scroll the shelf down before the click and assert `scrollY` 0 after it. Low.
  evidence: Verification Gap, code review of Story 14.5; `frontend/src/pages/CardNotesPage.tsx` (the route component's `key={location.key}`).
  resolved: 2026-11-24, Epic 14 retro item 97. Closed by Story 14.5's automate step: `carried-search-automate.spec.ts:225` (the nav link on the shelf gives a fresh body: back at the top, the view refetched, a waiting count never announced; `scrollY` 0 at `:248`) and `:350` (a two-step Back between two shelf entries drops an open pile).
- source_spec: `_bmad-output/implementation-artifacts/spec-14-5-keep-the-search-when-i-open-a-box-and-come-back.md`
  summary: Spine drift (AD-7), reconciled before the next epic. "Where the text lives" says each key scrolls to the top before the `h1` takes focus, but doesn't record the second scroll after a client-side POP (once the view is ready, and on the next frame) that Story 14.5 added against the browser's own Back scroll restoration, limited to a POP because a first load's queued frame undid a later scroll. The code is right and the spine is out of date. Low.
  evidence: Spine Check, code review of Story 14.5; ARCHITECTURE-SPINE.md line 135; `frontend/src/pages/CardNotesPage.tsx` (`restored`, `scrolledReady`).
  resolved: 2026-11-24, Epic 14 retro item 97. AD-7's "Where the text lives" records the second scroll after a client-side POP, once the view is `ready` and on the next frame, and why it runs only after a POP (`ARCHITECTURE-SPINE.md`).

## Deferred from: build-auto review of spec-epic-14-retro-item-98-fresh-carried-search-and-faded-box-name (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-14-retro-item-98-fresh-carried-search-and-faded-box-name.md`
  summary: Spine drift (AD-7), reconciled before the next epic. AD-7's Carried Card notes search says the carried line is announced "from the new entry's view once it is `ready`" and that "While the view has no groups, the text is dropped". Item 98 made both wait for a settled view (ready and not fetching: `useCardNotesView`'s `fetching`, `noGroups` and `carriedLine` in `frontend/src/pages/CardNotesPage.tsx`), and typing or opening Edit, Add, the pile or the chip first drops a pending carried line (`silence()`). Item 99 records the announcement rule; this entry also covers the `noGroups` half and the drop. The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of item 98; ARCHITECTURE-SPINE.md lines 137 and 140.
  resolved: 2026-11-24, Epic 14 retro item 99. AD-7's carried-search bullets say the text is dropped only while the view is settled (ready and not fetching) with no groups, and the announcement waits for a settled view (`useCardNotesView`'s `fetching`), with typing or opening Edit, Add, the pile or the chip dropping a pending carried line first (`silence()`). AD-7 gains the general rule "One-shot reads on arrival read a settled view" (`ARCHITECTURE-SPINE.md`).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-14-retro-item-98-fresh-carried-search-and-faded-box-name.md`
  summary: Spine drift (AD-6), reconciled before the next epic. The client presentation list's search item says a carried search's one announcement reads the count line "once the view is `ready`"; since item 98 it reads it once the view is settled (ready and not fetching). The code is right and the spine is out of date. Low.
  evidence: Spine Check, build-auto review of item 98; ARCHITECTURE-SPINE.md line 118.
  resolved: 2026-11-24, Epic 14 retro item 99. The client presentation list's search item says a carried search's one announcement reads the count line once the view is settled, ready and not fetching (AD-7) (`ARCHITECTURE-SPINE.md`).

## Deferred from: code review of spec-epic-14-retro-item-98-fresh-carried-search-and-faded-box-name (2026-11-24)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-14-retro-item-98-fresh-carried-search-and-faded-box-name.md`
  summary: Item 98's "settled" means not fetching, not fetched. Two cases are accepted for now: a failed refetch ends fetching and keeps the cached copy, so a carried search announces the stale count, or a stale empty open box clears the carried text for good (E14-R2 again, but only on a refetch error); and the typed path reads whatever copy is shown when its 500 ms pause ends, so a refetch longer than the pause can make it speak a stale count. Both need a local server that errors or stalls during a Back or a box press. Accepted in the spec's Design Notes; recorded here so a later epic that reads a view on arrival (item 99's rule) can decide whether "settled" should mean "fetched". Low.
  evidence: Edge Case Hunter and Blind Hunter, code review of item 98; `frontend/src/pages/CardNotesPage.tsx` (`noGroups`, `settled`, `carriedLine`), `frontend/src/api/views.ts` (`fetching`), `frontend/src/lib/useSearchCount.ts`.

## Deferred from: code review of spec-15-1-carry-the-publisher-in-the-catalog-view (2026-11-25)

- source_spec: `_bmad-output/implementation-artifacts/spec-15-1-carry-the-publisher-in-the-catalog-view.md`
  summary: No pipeline step moves an epic's status out of `backlog`. `sprint-status.yaml`'s header says an epic moves to `in-progress` when its first story starts (via the build's sprint sync), but `epic-15` reads `backlog` while Story 15.1 is in review, and `epic-14` still reads `backlog` with every story and `epic-14-retrospective` done (Epics 12 and 13 read `done`). Either the build's sprint sync and the retrospective should set the epic's status, or the header should drop the rule. Pre-existing, not caused by Story 15.1. Low.
  evidence: Acceptance Auditor, code review of Story 15.1; `_bmad-output/implementation-artifacts/sprint-status.yaml` lines 26, 144 and 152; no epic-status write in `.claude/skills/bmad-build-auto`.
  resolved: 2026-11-25, Epic 15 retro item 103. `epic-14` and `epic-15` read `done` in `sprint-status.yaml`. `bmad-build-auto`'s spec-status fact (`_bmad/custom/bmad-build-auto.toml`) now moves a `backlog` parent epic to `in-progress` when it sets a story to `review`, since the story skips `in-progress`, which is where `bmad-build`'s sync does it. `bmad-retrospective` gains a persistent fact (`_bmad/custom/bmad-retrospective.toml`): Phase 5 sets `epic-{N}: done` when no story is pending, in the retro's commit. The header's rule stays as written, now true.

## Deferred from: code review of spec-15-2-filter-the-catalog-by-publisher (2026-11-25)

- source_spec: `_bmad-output/implementation-artifacts/spec-15-2-filter-the-catalog-by-publisher.md`
  summary: `rawFilters` in `CatalogPage.tsx` keeps a checked Language, Tag or Publisher key after `liveFilters` drops it as gone, so the filter comes back if a Book is edited back to that value within the same Catalog visit (the chip then reads "Publisher: 1" again). Pre-existing since Story 7.2; Story 15.2 extends it to Publisher, the field most likely to be fixed by an edit. Fix: prune `rawFilters` when `liveFilters` drops a key. Low.
  evidence: code review of Story 15.2; `frontend/src/pages/CatalogPage.tsx` (`rawFilters`, the `filters` memo), `frontend/src/lib/catalogFilter.ts` (`liveFilters`).
  resolved: 2026-11-25, Epic 15 retro item 105 (`_bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md`). `CatalogPage.tsx` sets its filter state to `liveFilters`'s result during render when the view is `ready` and a key was dropped, so a dropped check is forgotten for the rest of the visit, for all three list chips. Pinned by the "Epic 15 retro item 105 Forget a dropped filter check" leaves in `frontend/e2e/catalog-publisher-filter.spec.ts` (Publisher, Tag, partly dropped, and a failed refetch, which keeps the last Books and so the check).

## Deferred from: build-auto review of spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key (2026-11-25)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md`
  summary: Spine drift (AD-6), reconciled before the next epic: the filter-chips item says checked values no Book has any more after a refetch are ignored (`liveFilters`) and that filters reset only when Catalog unmounts or a Book is added; a dropped key is now also forgotten from page state once the view is ready, so it doesn't come back when a Book gets the value again.
  evidence: Spine Check, build-auto review of item 105; `ARCHITECTURE-SPINE.md` AD-6, the catalog filter chips bullet; `frontend/src/pages/CatalogPage.tsx`, the render-time prune after the `filters` memo.
