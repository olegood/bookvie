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

## Deferred from: code review of spec-1-14-change-a-book-s-color-from-the-shelf.md (2026-11-02)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-14-change-a-book-s-color-from-the-shelf.md`
  summary: Run the Spine popover's AC-1 checks (inside the viewport, at most 992px wide, pointer at the spine, shifted inward at the edges) on Home's bookcase slice.
  evidence: Home's bookcase is still a placeholder until Stories 3.1/3.5, so `e2e/spine-popover.spec.ts` opens spines on Catalog (`/`) only. The checklist line "AC-1 (deferred): the same checks on Home's slice" is unticked. Close it when Story 3.1 or 3.5 renders the slice, by running the same geometry checks there.

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

- source_spec: `_bmad-output/implementation-artifacts/spec-sync-spec-status-and-spine-check.md`
  summary: When bmad-code-review sends a story back to `in-progress`, its unresolved patch findings stay only in the review output; bmad-build's step-03 implements from the spec alone, so the rework has no defined path into the spec.
  evidence: Blind Hunter round 2 on retro item 11; `bmad-code-review/steps/step-04-present.md:92` leaves patches "as action items" and bmad-build `step-03-implement.md` treats the spec as the sole source of truth.

- source_spec: `_bmad-output/implementation-artifacts/spec-readme-local-run-friction.md`
  summary: Serve the SPA's `index.html` with `Cache-Control: no-cache` so a reinstall shows the new bundle without a hard reload; then drop the hard-reload step from the README (retro PL-8).
  evidence: `backend/bookvie/http/app.py` `spa` returns `FileResponse(index)` with no `Cache-Control`, so browsers may reuse a cached `index.html` pointing at the old hashed bundle.

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-1-trace-and-gate.md`
  summary: Rotate the curated spine color from the last Book's curated color, not `len(library.books)`, and add a test that deletes a Book before an add (retro F-R4).
  evidence: `backend/bookvie/intents/add_book.py:65` passes the Book count, which shrinks on delete, so the next new Book can repeat a neighbour's color. `backend/tests/test_add_book.py:523` pins the count only on a library that already has Books. The retro deferred F-R4 but never recorded it here; the Story 1.7 checklist line is retired to this entry. Low, cosmetic.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-1-trace-and-gate.md`
  summary: Add an on-load animation guard (`document.getAnimations()` is empty right after load) once something animates, with Epic 3's finish fill.
  evidence: Story 1.6 checklist (AC-14 and the AC-10 follow-up) planned it; no test exists at `06014dc`. Today the only animation is the popover fade, which runs on user action. Low.
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
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: Reconcile ARCHITECTURE-SPINE with Story 2.2: interim `restore_invalid` catch-all and limits pending 2.3 (AD-9/AD-14), AD-12's outdated "Until restore exists" sentence, the no-overwrite rule winning over byte-identical restore for a differing same-name cover, and restored covers exempt from AD-12's re-encode output rules.
  evidence: Spine-check findings in both review passes; each is a deliberate spec decision with no spine edit. Triage #21, #22, #31–#33.
  resolved: `spec-reconcile-architecture-spine-with-epic-2.md` (Epic 2 retro item 1, 2026-11-04); AD-9 names the three restore codes, AD-12 drops "Until restore exists" and adds the restored-covers rule (stored unchanged, never overwritten), AD-14's round trip records the no-overwrite exception.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md`
  summary: The Backup page reads the whole export into memory (`requestInit` → `arrayBuffer()`) before uploading; consider streaming the FormData for restore alongside Story 2.3's 1 GB limit.
  evidence: `frontend/src/api/intents.ts` encodes any file form to bytes for test visibility; an export with many covers can be hundreds of MB in the tab. Triage #38.

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

## Deferred from: code review of spec-3-4-see-where-i-left-off-and-how-long-is-left (2026-11-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: Spine-check re-raised the Structural Seed / AD-20 / AD-6 / AD-19 drift for pace, `daysLeft` and nullable `lastProgressUpdate`; it stays as recorded above (SC1–SC4). Blind-hunter re-raised the stale "19 of 41 stories done" count; it stays as recorded above.
  resolved: spine part only, by `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06). The README story count stays open (Epic 3 retro action 6).
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md`
  summary: README's "Test automation summary (currently story 3.2)" pointer (README.md:182) is stale; `automation-summary.md` is at story 3.3. Pre-existing.

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

## Deferred from: review of spec-epic-3-retro-item-21-bound-edit-finished-on (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-21-bound-edit-finished-on.md`
  summary: Edit book can move the latest finish (for example a back-fill) before another finished Reading's finish or start, so finished Readings overlap or swap and `latestFinishDate` jumps to another Reading.
  evidence: `edit_book._finished_on_failure` checks the latest finish only against its own `startDate` and the current Reading. This predates the fix (story 1.11).
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-21-bound-edit-finished-on.md`
  summary: Add the "not after the current Reading's start" Finished on rule to story 1.11's ACs in `epics.md` during the Epic 3 spine reconciliation (retro action 4).
  evidence: EXPERIENCE.md now carries the rule and its copy, and `epics.md` 1.11 still lists only the "can't be removed" and "before start" rules.
  resolved: `spec-reconcile-architecture-spine-with-epic-3.md` (Epic 3 retro item 23, 2026-11-06); story 1.11's ACs in `epics.md` now include the Finished on bound.

## Deferred from: review of spec-epic-3-retro-item-22-stale-client-hand-offs (2026-11-06)

- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-retro-item-22-stale-client-hand-offs.md`
  summary: The Start dialog's "This pauses *Y* at p.N (P%)." line reads `useHomeView()`, which can be a stale cached copy when the dialog opens from Book detail or Catalog after another tab changed the Main book. It should wait for a home view fetched after it opens, as it now does for the `book` view.
  evidence: `StartDialog.tsx` passes `home.data.mainBook` straight through. Only active views refetch after an intent (`api/intents.ts:53`), and the home view is inactive away from Home.

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

## Deferred from: code review of spec-4-1-keep-the-interrupted-book-as-up-next (2026-11-07)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Story 4.6 must name a paused Up next spine "Up next, paused at page N" (and "not read yet, Up next" / "finished, Up next"); since 4.1 the interrupted Main book is Up next and its spine reads "…, not read yet" though its page is kept, where Epic 3 said "waiting for you, page N".
  evidence: Blind-hunter review of 4.1 (BH1). `frontend/src/lib/catalog.ts` `spineStatus` handles only `main` and `waiting`; 4.1's intent puts spine names in Story 4.6, and `start-reading.spec.ts`/`stale-hand-offs.spec.ts` dropped or widened their spine-name asserts with "Story 4.6's" comments.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (AD-19), reconciled before the next epic: the Starting bullet should state the FR-7 pointer move (the interrupted Main book becomes `upNextBookId`; with no Main book it stays unless it was the started Book, then `null`; a displaced Up next only loses the pointer).
  evidence: Spine-check review of 4.1 (SC1); `intents/start_reading.py` applies it in the same commit, and the spine names only the pause.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (AD-7), reconciled before the next epic: the known-gap sentence and the Deferred "Stale confirmation guard" should say the Start dialog's displacement line also reads the cached home view (`upNext.id`, `upNext.paused`), so a stale dialog can name the wrong Up next.
  evidence: Spine-check review of 4.1 (SC2); `StartDialog.tsx` reads `home.data.upNext`, as the spec's Design Notes accept.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Spine drift (Capability → Architecture Map, AD-6), reconciled before the next epic: the "FR-5 to FR-9" row should list `views/shelf` (home `upNext` with its server-decided `paused`) and Home's Up next pane, and cite AD-6.
  evidence: Spine-check review of 4.1 (SC3); the row's "Lives in" names only the intents.

## Deferred from: code review of spec-4-1-keep-the-interrupted-book-as-up-next (2026-11-07, pass 2)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md`
  summary: Book detail's Delete Confirm for a paused Up next reads "It is Up next." and no longer gives the page kept, where Epic 3's interrupted (`waiting`) Book read "It is waiting for you at p.120." Story 4.6, which owns the role lines, should carry the page for a paused Up next.
  evidence: `frontend/src/lib/bookDetail.ts:170` `roleLine` returns a fixed string for `upNext`; spec 4.1's Code Map froze `roleLine` ("Do not change").

## Deferred from: implementation of spec-4-2-see-every-paused-book-in-waiting-for-you (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-see-every-paused-book-in-waiting-for-you.md`
  summary: Spine drift (Capability → Architecture Map, AD-6), reconciled before the next epic: the "FR-5 to FR-9" row (it holds FR-7) should name `views/shelf` (home `waiting`, the server-ordered Waiting for you list: `pausedAt` ascending, then title key, then Book id, never sending `pausedAt`) and Home's Waiting for you pane (`WaitingPane`), and its "Governed by" should add AD-6. Wording tightened by the code review of spec-4-2 (2026-11-08).
  evidence: Story 4.2 adds `HomeView.waiting` (`backend/bookvie/views/shelf.py` `_waiting`) and `frontend/src/components/WaitingPane.tsx`; the map's "FR-5 to FR-9" row names neither.

## Deferred from: implementation of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Check in Safari and Firefox on macOS that a mouse click on a "⋯" menu item (Pause, Open book) and on "⋯" itself lands. Unverified; high if it fails. There a press doesn't focus the button, so the menu's blur has a null `relatedTarget`. The code review of 4.3 holds the blur off during a pointer press on an item or "⋯" (`pressing` in `MoreActionsMenu.tsx`), which should remove the race, but the e2e suite runs Chromium only.
  evidence: Spec 4.3 frontmatter `deferred`, item 1. Settle it with a manual check, or a Playwright webkit/firefox project run of `pause.spec.ts`.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: No test covers a pause that fails after the page has unmounted (the late `alert` announcement in `usePauseFlow`). Low.
  evidence: Spec 4.3 frontmatter `deferred`, item 2. Cover it with the app's other unmount-after-request cases (`PageField`, `EditPurpose`).

## Deferred from: code review of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (AD-19), reconciled before the next epic: AD-19 describes only how `start-reading` pauses a Book; it should also state the standalone `pause` intent (pauses the current Reading, overwriting `pausedAt`, clears `mainBookId`, makes the Book `upNextBookId`, a displaced Up next only loses the pointer). Extends the 4.1 AD-19 entry above.
  evidence: Spine-check review of 4.3; `backend/bookvie/intents/pause.py`, and `start_reading.py` now imports `pause_main` from it.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (AD-7), reconciled before the next epic: the known-gap sentence should name the Pause Confirm dialog too; its displacement line, and whether the dialog shows at all, read `useHomeView()` as cached when Pause is pressed. Extends the 4.1 AD-7 entry above.
  evidence: Spine-check review of 4.3; `frontend/src/lib/usePauseFlow.tsx` `request()` reads `home.data.upNext`, as the spec's Design Notes accept.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: Spine drift (Structural Seed, Capability → Architecture Map preface), reconciled before the next epic: the seed's `intents/` module list should add `pause`, and the map's preface should stop giving `intents/pause` as an example of a module not built yet.
  evidence: Spine-check review of 4.3; `backend/bookvie/intents/pause.py` and `POST /intents/pause` in `backend/bookvie/http/api.py`.

## Deferred from: test automation of spec-4-3-pause-my-main-book (2026-11-08)

- source_spec: `_bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md`
  summary: After a stale-tab refusal (`not_main_book`) of Pause on Book detail, the refusal is invisible and focus is lost. The refusal's refetch makes the Book Up next, so Pause and its slot unmount before `usePauseFlow` sets `failed` and focuses the opener (`opener.current` is null). Focus falls to `body`, and "This book isn't your Main book anymore." lives only in the shell's visually hidden `alert` region, where the spec has the line below Pause with focus kept there. Home is likely the same once the card empties. Medium: a screen reader hears it, but a sighted user sees Pause turn into Resume with no message. A fix should move focus to Book detail's Resume (or the empty card's) and show the line near it.
  evidence: A probe during `bmad-testarch-automate` for 4.3 found `document.activeElement` = `BODY` and the alert's box 1×1 at x=-1. `frontend/e2e/pause.spec.ts` "[P1] a Book paused in another tab: …" asserts only the announcement and the swap.
