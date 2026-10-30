- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-and-install-bookvie.md`
  summary: Add an automated build → install → `GET /` smoke check proving Vite `outDir`, `STATIC_DIR` and the wheel `artifacts` rule name the same folder.
  evidence: Changing `outDir` or `artifacts` leaves every pytest test green; only the manual curl step in Story 1.1 Verification catches it. Belongs with the Story 1.3 smoke test.
  resolved: Story 1.3, `scripts/smoke.mjs` (`npm run check:smoke`).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-run-one-safe-instance.md`
  summary: Before `GET /api/export` (Epic 2) ships, reject cross-site simple GETs (e.g. `Sec-Fetch-Site: cross-site`) or make sure no GET route has side effects such as recording "Last export".
  evidence: The Host/Origin guard passes a cross-site `<img>`/no-cors GET because it sends `Host: 127.0.0.1:<port>` and no Origin. The page can't read the response, but a full export download would record "Last export".

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
  resolved: partly, Story 1.7 (unique Book IDs; unique Reading and Card note IDs within a Book); the sideReadBookIds rules (no repeated ID, Up next not also a Side read) remain.
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
  resolved: partly, Story 1.6 (catalog-empty.spec.ts AC-6 pins GET /api/views/catalog); query keys and useHomeView remain for Story 3.1.
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
