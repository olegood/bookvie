---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-03'
storyId: '2.1'
storyKey: '2-1-export-all-data-with-one-click'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-21-export-all-data-with-one-click'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md'
generatedTestFiles:
  - 'backend/tests/test_export.py'
  - 'frontend/e2e/backup.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 2.1, Conventions for every story)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-4, AD-9, AD-14, AD-15)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Backup page, Busy button, Top nav)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Backup page, Flow 7, State patterns)'
  - '_bmad-output/test-artifacts/test-design-qa.md (BKP-API-002, BKP-E2E-003, FND-API-006)'
  - 'backend/tests/conftest.py, backend/tests/helpers.py, backend/tests/builder.py'
  - 'backend/bookvie/intents/contract.py, backend/bookvie/http/app.py, backend/bookvie/store/store.py'
  - 'frontend/playwright.config.ts, frontend/e2e/fixtures.ts, frontend/e2e/README.md, frontend/e2e/app-shell.spec.ts'
  - 'docs/ci.md, scripts/e2e-count.mjs'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'A Backup item is added at the end of the top nav (Catalog · Backup until Home, Stats and Card notes arrive), leading to a Backup page whose h1 is "Backup" (UX-DR53)' }
  - { id: AC-2, idSource: generated, text: 'The Backup page shows two surface cards: Export (Export all data as button-primary, "Last export: N days ago" or "No export yet" below in meta / ink-tertiary) and Restore (Restore from file… as button-secondary with a one-line explanation)' }
  - { id: AC-3, idSource: generated, text: 'Export all data: GET /api/export returns one .zip holding exactly library.json and covers/ (a directory entry even with no covers), downloaded as bookvie-export-<YYYY-MM-DD>.zip; under the AD-4 lock the zip is built into a spooled temp file (~10 MB in memory, then disk), the lock is released, then the file is sent (AD-14)' }
  - { id: AC-4, idSource: generated, text: 'An export taking longer than ~300 ms shows "Exporting…" and the button is disabled until it finishes, at 60% opacity with no spinner (the one allowed native-disabled case)' }
  - { id: AC-5, idSource: generated, text: 'After the last byte is sent with no client disconnect the server records the time in local-state.json in the data folder, never inside the export (AD-14, AD-15); an aborted download or a HEAD request records nothing (API tests for both); the line reads "Last export: today" in every browser on this machine' }
  - { id: AC-6, idSource: generated, text: 'An export that fails (e.g. a cover cannot be read) fails while the zip is built, before any response header, with 503 kind and code couldnt_export (API test); the page shows "Couldn''t export. Your data wasn''t changed." as a failure line and "Last export" keeps its previous value' }
---

# ATDD Checklist - Epic 2, Story 2.1: Export all data with one click

**Date:** 2026-11-03
**Author:** Oleg
**Primary test levels:** API (pytest against the app, plus an in-process ASGI harness) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to export my whole library to one file with a single action, so that a dead disk can never take my readings and notes with it.

**The server half:**
- `GET /api/export` packages the data folder (AD-14): `library.json` plus `covers/`.
- The zip is built under the AD-4 lock and sent after the lock is released.
- "Last export" is recorded in `local-state.json` (AD-15) only after a complete download.
- A read failure becomes 503 `couldnt_export`.

**The client half:**
- The Backup nav item and the page at `/backup`.
- The Export and Restore cards.
- The "Last export" line.
- The busy "Exporting…" button.

**Story source:** `epics.md` → Story 2.1. There is no spec file yet: `sprint-status.yaml` has `2-1-export-all-data-with-one-click: backlog`. When `spec-2-1-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`). The spec should adopt the names under "Contract the Scaffolds Pin" or change the scaffolds along with them.

**Stack:** `fullstack` (`backend/pyproject.toml` and `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.14.

**Generation mode:** AI generation from the criteria, the UX and architecture docs, and the existing code. There was no browser recording, because the Backup page doesn't exist yet. Every locator comes from a role and name the criteria pin. Execution was **sequential** with one author, as in Stories 1.6 to 1.14: `tea_execution_mode: auto` would have chosen subagents, but the context was already loaded and one author keeps the harness and helpers consistent.

**Decisions confirmed with Oleg (2026-11-03):**
- `local-state.json` is `{"lastExportAt": "<ISO-8601 with offset>"}`, written from the injected clock's `now()`.
- The page route is `/backup`.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Backup last in the nav, leading to `/backup` with `h1` "Backup" | E2E | P1 | `[P1] AC-1` |
| AC-2 | Export and Restore cards; "No export yet" or "Last export: N days ago" | E2E | P2 | `[P2] AC-2` |
| AC-3 | Zip of exactly `library.json` and `covers/`; built under the lock, sent after it is released | API | P0 | `test_ac3_p0_…` |
| AC-4 | "Exporting…", natively disabled, 60% opacity, no spinner | E2E | P2 | `[P2] AC-4` |
| AC-5 | Recorded in `local-state.json` only after a complete download; abort or HEAD records nothing | API | P1 | `test_ac5_p1_…` |
| AC-6 | Read failure → 503 `couldnt_export` before any header; nothing changes | API | P1 | `test_ac6_p1_…` |

**Priorities:**
- **AC-3 is P0.** It is the backup itself (R-02), and the consistent AD-4 snapshot is FND-API-006, which is P0.
- **AC-5 and AC-6 are P1.** A wrong "Last export" or a silent failure misleads but loses nothing (BKP-API-002 is P1).
- **AC-1 is P1,** the only way into the page.
- **AC-2 and AC-4 are P2:** presentation and the busy state (BKP-E2E-003 is P3, rounded up because the line is the user's only backup reminder).

**Level split (no duplicate coverage):**
- **API:** what the server sends, records and refuses.
- **E2E:** what the page shows.
- **AC-5 and AC-6 explicitly ask for API tests,** so their primary leaves are API. Their browser halves ("Last export: today" in every browser; the failure line) are green-phase follow-ups below.

---

## Story Integration Metadata

- **Story ID:** `2.1`
- **Story Key:** `2-1-export-all-data-with-one-click`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 2.1)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md`
- **Generated Test Files:** `backend/tests/test_export.py`, `frontend/e2e/backup.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **Backend leaves** have `@pytest.mark.skip(reason=RED)`, and their names carry `acN_pN`.
- **E2E leaves** use `test.skip(...)`, and their titles carry `[P#] AC-n`.
- **Red check:** each was un-skipped once on the current code (in a temporary copy, since deleted) and failed at its first assertion, as listed below.
- **Skipped as committed:** `pytest tests/test_export.py` gives 3 skipped, and `playwright test e2e/backup.spec.ts` gives 3 skipped. Ruff, oxlint and `tsc -b` are clean.

### API Tests (3 tests): `backend/tests/test_export.py`

**`[P0] AC-3`: `test_ac3_p0_export_is_one_zip_of_library_json_and_covers_built_under_the_lock`**

Setup:
- Dune, with a stored cover and a back-filled Reading (no start date, finished 2025-03-14), plus an unread Neuromancer.
- `local-state.json` and `.staging/leftover.json` are present.

The leaf checks, in order:
1. **`GET /api/export` → 200** (the first assertion).
2. `application/zip`.
3. Sorted names are exactly `["covers/", "covers/<name>", "library.json"]`, and `covers/` is a directory entry.
4. `library.json` and the cover are byte-identical to disk.
5. A library with no covers gives exactly `["covers/", "library.json"]`.
6. With a `RecordingLock` swapped in for `store.lock` and `app.state.write_lock`, the event log starts `lock acquired → lock released → http.response.start`, with one acquire.

*Red today: 404 ≠ 200.*

**`[P1] AC-5`: `test_ac5_p1_only_a_complete_download_records_last_export_in_local_state`**

The leaf checks, in order:
1. After a complete download through the harness, **`lastExportAt` == `2026-10-30T12:00:00+01:00`** (the first assertion). The file is exactly that object, and `library.json` is unchanged.
2. **Aborted download:** with a 1 MB incompressible cover, the client leaves after the first body chunk. The run must have aborted, and an earlier `local-state.json` stays byte-identical.
3. **HEAD:** a HEAD request writes nothing on a fresh folder and keeps an earlier record byte-identical.

*Red today: `None` ≠ `'2026-10-30T12:00:00+01:00'`.*

**`[P1] AC-6`: `test_ac6_p1_an_unreadable_cover_fails_the_export_with_503_couldnt_export`**

With the referenced cover at `chmod 000`, the leaf checks, in order:
1. The harness saw response starts **`[503]`** (the first assertion), so no 200 header went out first.
2. The body is exactly `{error: {kind: "couldnt_export", code: "couldnt_export", message: "Couldn't export. Your data wasn't changed."}}`.
3. The earlier `local-state.json` and `library.json` are byte-identical.
4. `couldnt_export` is in the `ErrorKind` and `ErrorCode` OpenAPI enums, and `/api/export` documents a 503.

It is also `skipif` root, since root can read a 000 file. *Red today: `[404]` ≠ `[503]`.*

### E2E Tests (3 tests): `frontend/e2e/backup.spec.ts`

**`[P1] AC-1`** (on the worker's server):
1. **Main nav links are exactly `["Catalog", "Backup"]`** (the first assertion).
2. Clicking Backup goes to `/backup`, with `aria-current="page"` on Backup and not on Catalog.
3. The one `h1` is "Backup" and is focused.
4. The title is "Backup — bookvie".

*Red today: received `["Catalog"]`.*

**`[P2] AC-2`:**
1. On a fresh seeded server, **`button` "Export all data" is visible** (the first assertion).
2. "No export yet" shows, `button` "Restore from file…" shows, and no "Last export:" line.
3. On a server started with `local-state.json` set to local noon three days ago: "Last export: 3 days ago", and no "No export yet".

*Red today: element not found (the NotFound page).*

**`[P2] AC-4`:**
1. `/api/export` is held by a route that waits on a promise the test resolves, so there is no timer.
2. **"Export all data" is enabled before the click** (the first assertion).
3. After the click, `button` "Exporting…" is disabled, with the native `disabled` property `true`, opacity `0.6`, `animation-name: none` and no `progressbar`.
4. After releasing the route and receiving the download, "Export all data" is enabled again at opacity `1`.

*Red today: element not found.*

**About AC-4's first assertion:** it is the idle state before the click. The criterion is a transition (enabled → busy → enabled), and without it the first failure on today's code would be the click, which is a setup step, not an assertion. Story 1.14's AC-4 and AC-5 did the same.

### The ASGI harness (`_run` in `test_export.py`)

`TestClient` buffers whole responses, so it can't abort a download halfway or show the order of headers and lock. `_run` calls the app directly, the way **uvicorn 0.54** (ASGI spec 2.3, the pinned server) does:
- `receive` blocks until the client is gone, then returns `http.disconnect`.
- Once the client is gone, `send` returns without sending.
- Each `send` yields once to the event loop, as uvicorn's flow control does.

**Checked against throwaway Starlette apps:**
- A `StreamingResponse` that records "done" in a `BackgroundTask` **still records after an abort**: Starlette 1.10 runs the background task anyway. The AC-5 leaf fails that implementation, as it should.
- Recording after the generator's last `yield` records on a complete run and not on an abort.

---

## Data Factories Created

None new. The seeded state goes through the existing `LibraryBuilder` (TC-1):
- **pytest:** `LibraryBuilder` plus `image_bytes` from `tests/helpers.py`, wrapped in the spec-local `_seed_rich_library` (Dune with a cover and a back-filled Reading, plus Neuromancer). This seed was checked separately: it passes `check_invariants` and survives `Store.open` (the cover is referenced, so the startup sweep keeps it).
- **Playwright:** `seededServer({ books: [DUNE] })`, and `seedLibrary` plus `startServer` for the one server that needs `local-state.json` before it starts.

## Fixtures Created

None shared.
- `test_export.py` has spec-local `RecordingLock`, `Run` and `_run`.
- `backup.spec.ts` has spec-local `serverWithLastExport(testInfo, iso)`, which seeds, writes `local-state.json` and starts a server. The caller stops it and removes the folder in `finally`, as `seed.spec.ts` does.
- `localNoonDaysAgo(n)` gives local noon, so the date can't straddle midnight; the Node process runs with `TZ=Europe/Madrid`.

If Story 2.2 or 3.1 needs `serverWithLastExport` (Home's "Last export" line), move it into `fixtures.ts`.

## Mock Requirements

One. AC-4 holds `/api/export` with `page.route` until the test releases it, then `route.continue()`s to the real server. A real export of a tiny library is too fast for the 300 ms busy threshold. Everything else runs against the real `bookvie`. AC-6's fault is a real unreadable file, not a stub.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text. The labels are part of the Agent Label Contract.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Route:** `GET /api/export`.
- **Success:** 200 with `content-type: application/zip`. The archive holds exactly:
  - `library.json`, byte-identical to the stored file;
  - `covers/` as a directory entry (`ZipInfo.is_dir()`), even with no covers;
  - `covers/<name>` for each cover, byte-identical.
- **Never in the archive:** `local-state.json`, `.staging/`, or anything else.
- **The lock:** the zip is built while holding `store.lock`, the same object as `app.state.write_lock`. It is acquired exactly once and released before `http.response.start`.
- **Streaming:** the body goes out in more than one body message (a 1 MB cover must not be one `send`), so a client can abort it.

**`local-state.json`:**
- **Format:** exactly `{"lastExportAt": "<clock.now().isoformat()>"}` in the data folder.
- **When it is written:** only after the last body chunk went out with no `http.disconnect`.
- **Never written by:** a HEAD request, an aborted download, or a failed export. An existing file stays byte-identical.

**Failure:**
- **When:** any read error while building the zip.
- **Response:** 503 with exactly `{error: {kind: "couldnt_export", code: "couldnt_export", message: "Couldn't export. Your data wasn't changed."}}`, decided before any header is sent.
- **AD-9:** `couldnt_export` joins both `ErrorKind` and `ErrorCode`, and the route documents 503 in its responses.

**Page:**
- **Route and nav:** `/backup`, a `NavLink` "Backup" after "Catalog" in the Main nav.
- **Heading and title:** `h1` "Backup" (focused on arrival) and title "Backup — bookvie".
- **Buttons:**
  - `button` "Export all data";
  - `button` "Restore from file…", with U+2026, not three dots;
  - while busy, `button` "Exporting…" with the native `disabled` attribute, opacity 0.6, no animation, and no `progressbar`.
- **Last export line:** "No export yet", or "Last export: today", "Last export: N days ago" through the `relativeDay` helper.

**Assumptions for the spec to confirm:**
- **How the page reads "Last export".** The scaffolds pin only the text. The suggestion is a new view, `GET /api/views/backup` → `{lastExportAt: string | null}` (Home's re-entry line in Story 3.1 can add the same field to `HomeView`). Regenerate types with `npm run check:api`.
- **Which covers are exported.** The suggestion is the referenced covers (`referenced_covers(library)`), not every file in `covers/`. The startup sweep already removes unreferenced ones, and Story 2.3 refuses a restore whose `library.json` references a missing cover, so the two agree. A stray `covers/<name>.tmp*` must never be exported.
- **The download name.** The suggestion is that the server sends `Content-Disposition: attachment; filename="bookvie-export-<clock.today()>.zip"` and the client uses it. The name is checked only in the E2E follow-up below, so the server or the client may own it.
- **The Restore explanation line.** The copy isn't in the UX docs. The scaffolds don't pin it; the spec must (for example "Replaces everything here with the contents of an export file."). No "!" (copy test, Story 1.6 AC-14).
- **Restore from file… before Story 2.2.** The button is shown (AC-2) but does nothing yet. The spec must say whether it is `aria-disabled` with a reason (UX-DR11: never natively disabled) or hidden until 2.2. The AC says it is shown.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_export.py -k ac3`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/backup.spec.ts -g "AC-1 "`

### AC-3 / AC-6 the export route (do first)
- [x] `intents/contract.py`: `ErrorKind.COULDNT_EXPORT`, `ErrorCode.COULDNT_EXPORT`, `COULDNT_EXPORT_MESSAGE`, and a `couldnt_export()` error (status 503). (done: backend/bookvie/intents/contract.py:21, :35, :46, :289 (`couldnt_export()` is 503))
- [x] `intents/export.py`: (done: backend/bookvie/intents/export.py:71 `build_export`)
  - [x] Under `store.lock`, write `library.json` (as stored), the `covers/` directory entry and the covers into a `tempfile.SpooledTemporaryFile(max_size=10 * 1024 * 1024)`. (done: backend/bookvie/intents/export.py:51-80, `SPOOL_MEMORY_LIMIT` at :30)
  - [x] Turn any `OSError` into `couldnt_export`. (done: backend/bookvie/intents/export.py:35, :82-85)
  - [x] Release the lock, then return the spooled file. (done: backend/bookvie/intents/export.py:79-89)
- [x] `http/api.py`: `GET /export` (outside `/api/intents/`, AD-1 layering), with the 503 in its documented responses. Stream the file in chunks. (done: backend/bookvie/http/api.py:305 (router prefix `/api` at :103), 503 at :301, 64 KiB chunks at :268-272)
- [x] Activate AC-3, then AC-6. (done: backend/tests/test_export.py:199 `test_ac3_p0_…` and :301 `test_ac6_p1_…`, both unskipped (only a root `skipif` on AC-6))

### AC-5 "Last export"
- [x] Write `local-state.json` atomically through the store's filesystem seam (temp, fsync, rename, `fsync_dir`). (done: backend/bookvie/store/store.py:576 `record_export` through `_write_atomic` at :592)
- [x] Record only after the last chunk has gone out with no disconnect: (done: backend/bookvie/http/api.py:213 `ExportResponse`; aborted download in backend/tests/test_export.py `test_ac5_p1_only_a_complete_download_records_last_export_in_local_state`)
  - [x] **Not** in a Starlette `BackgroundTask`. It runs even after an abort; see "The ASGI harness". (done: backend/bookvie/http/api.py:281-282, `on_complete` runs after the task group, not as a `BackgroundTask`)
  - [x] Record after the streaming generator's last `yield`, or check for a disconnect explicitly. (done: backend/bookvie/http/api.py:252-256 disconnect watcher, :277 `complete = not gone`)
- [x] A HEAD request records nothing. (done: backend/tests/test_export.py:280-294 in `test_ac5_p1_…`)
- [x] If the record itself can't be written after a complete download, the response is already sent: log it to stderr. A spec decision; there is no red leaf for it. (done: backend/bookvie/intents/export.py:92-97; backend/tests/test_export.py `test_a_failed_record_is_logged_and_the_download_still_succeeds`)
- [x] Activate AC-5. (done: backend/tests/test_export.py:254 `test_ac5_p1_…`, unskipped)

### AC-1 / AC-2 / AC-4 the Backup page
- [x] **Change the existing test:** `frontend/e2e/app-shell.spec.ts:120` asserts there is no `Backup` link. Drop `'Backup'` from that list in the same change that adds the nav item, or AC-2 of Story 1.6 goes red. (done: frontend/e2e/app-shell.spec.ts:122 now expects `['Home', 'Catalog', 'Backup']`)
- [x] `AppShell.tsx`: a `NavLink` "Backup" to `/backup` after Catalog. `main.tsx`: the `/backup` route. (done: frontend/src/components/AppShell.tsx:45, frontend/src/main.tsx:37)
- [x] `pages/BackupPage.tsx`: `PageHeading` "Backup", the title, and two surface cards. (done: frontend/src/pages/BackupPage.tsx:166-181)
  - [x] **Export card:** `Button` primary "Export all data", with the "Last export" line in `meta` / `ink-tertiary` below. (done: frontend/src/pages/BackupPage.tsx:168-171, frontend/src/pages/BackupPage.module.css:40-47)
  - [x] **Restore card:** `Button` secondary "Restore from file…" and the explanation line. (done: frontend/src/pages/BackupPage.tsx:175-179 (`Button` defaults to `secondary`))
- [x] A view for "Last export" (see Assumptions); regenerate `schema.d.ts`. (done: backend/bookvie/http/api.py:322 `GET /api/views/backup`, backend/bookvie/views/backup.py:8; frontend/src/api/generated/schema.d.ts:45)
- [x] Export: `fetch('/api/export')`. (done: frontend/src/api/export.ts:52 (with the `X-Bookvie-Export` header))
  - [x] After ~300 ms with no answer, set the label to "Exporting…" with native `disabled` and opacity 0.6 (DESIGN.md Busy button). (done: frontend/src/pages/BackupPage.tsx:103-106, :169; frontend/src/components/Button.tsx:50; frontend/src/components/Button.module.css:34-35)
  - [x] On 200: blob, object URL, `<a download>` click. Then refetch the "Last export" view. (done: frontend/src/api/export.ts:54-66; frontend/src/pages/BackupPage.tsx:120 `refreshLastExport`)
  - [x] On a 503: show `FailureMessage` with the server's message under Export, and announce it in `alert`. (done: frontend/src/pages/BackupPage.tsx:111-114, :172)
- [x] Activate AC-1, AC-2, then AC-4. (done: frontend/e2e/backup.spec.ts:70 `[P1] AC-1`, :87 `[P2] AC-2`, :111 `[P2] AC-4`, none skipped)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-2:** the Restore explanation line, once the spec fixes its copy. The Export button has `button-primary` and the Restore button `button-secondary` (computed background against the tokens, as Story 1.6 AC-9 does). The "Last export" line color is `ink-tertiary`. Axe AA on `/backup` in both themes. (done: frontend/e2e/backup.spec.ts:172 `AC-2 the Restore card explains itself`, :184 `AC-2 … use their tokens`, :309 `AC-2 axe finds nothing on /backup in both themes`)
- [x] **AC-3, E2E:** the download is named `bookvie-export-<today>.zip`, using the local date the browser sees, and starts with `PK\x03\x04`. (done: frontend/e2e/backup.spec.ts:196 `[P1] AC-3 AC-5 a real export downloads bookvie-export-<today>.zip…`)
- ~~**AC-4:** an export faster than ~300 ms never shows "Exporting…" (watch the button name through a fast real export). The busy state is the only native-disabled control (copy and interaction guard, Story 1.6 AC-14).~~ **Retired:** the fast-export half is done (`frontend/e2e/backup.spec.ts:228` `[P2] AC-4 a fast export never shows "Exporting…"`); the guard that the busy state is the only native-disabled control is not automated: `frontend/scripts/copy.test.mjs` doesn't scan for `disabled`, and the rule lives only in `frontend/src/components/Button.tsx:14-18,50`; deferred to `_bmad-output/implementation-artifacts/deferred-work.md:368`
- [x] **AC-5, E2E:** after a real download, "Last export: today". A second browser context (fresh `localStorage`) on the same server also reads "Last export: today". (done: frontend/e2e/backup.spec.ts:196 `[P1] AC-3 AC-5 …` (second browser context at :216-223))
- [x] **AC-6, E2E:** on a seeded server with an earlier `local-state.json`, set a referenced cover to `chmod 000`, then press Export. "Couldn't export. Your data wasn't changed." appears under Export and in `alert`, `status` stays empty, "Last export: 3 days ago" is unchanged, and the button is back to "Export all data". (done: frontend/e2e/backup.spec.ts:251 `[P1] AC-6 an export that fails shows the couldn't-export line and keeps Last export`)
- ~~**AC-3, not automated:** the spooled temp file and its ~10 MB in-memory threshold. Check in code review.~~ **Retired:** a "check in code review" line, never automated; the code is `backend/bookvie/intents/export.py:30` (`SPOOL_MEMORY_LIMIT = 10 * 1024 * 1024`) and :77 (`SpooledTemporaryFile(max_size=SPOOL_MEMORY_LIMIT)`)

---

## Running Tests

```bash
# API scaffolds (3 skipped today)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_export.py

# E2E scaffolds (3 skipped today), against the last build
npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/backup.spec.ts

# Everything, as CI does
npm run check
```

**CI note:** `scripts/e2e-count.mjs` fails the CI E2E job when Playwright lists more tests than it runs (`docs/ci.md`: "A skipped test … fails the job"). The 3 skipped scaffolds in `backup.spec.ts` turn the GitHub Actions E2E and burn-in jobs red from the commit that adds them until the last one is activated. Local `npm run check` is unaffected. Either land the scaffolds with the Story 2.1 implementation, or accept the red CI E2E job until then, as with Story 1.14's scaffolds.

---

## Red-Green-Refactor Workflow

- **RED (done):** 6 leaves, all skipped. Each fails at its first assertion when activated on today's code.
- **GREEN (dev):** activate one leaf, implement the smallest change that passes it, then the next. Order: AC-3 → AC-6 → AC-5 → AC-1 → AC-2 → AC-4. Then add the follow-ups.
- **REFACTOR:** with everything green, move shared helpers out of spec files only once a second user appears (`serverWithLastExport` for Home's line in 3.1; `_run` for restore's streaming upload in 2.2).

---

## Knowledge Base References Applied

- **test-quality:** one concern per leaf, assertions in the test bodies, no hard waits (the route gate stands in for a delay), no conditionals.
- **timing-debugging / network-first:** the route is held on a promise, not a timer; the clock is pinned in the API tests (`FakeClock`), and E2E dates use local noon.
- **data-factories:** `LibraryBuilder` with named literals (`LAST_EXPORT_NOW`, `EARLIER_EXPORT`, `BIG_COVER_BYTES`).
- **selector-resilience:** role and exact name only.
- **fixture-architecture:** spec-local helpers until a second user appears.
- **test-levels-framework / test-priorities-matrix:** the API/E2E split and the P0–P2 assignment above.
- **ci-burn-in:** the `e2e-count` interaction noted above.

---

## Notes

- **Data safety:** export only reads the library. The AC-5 and AC-6 leaves assert that `library.json` is byte-identical after an export, and that `local-state.json` is never touched by a failed, aborted or HEAD export.
- **Why the harness pins the ASGI spec:** a future uvicorn that advertises ASGI spec 2.4 raises on `send` after a disconnect instead of dropping it silently. Update `_run` if the `uvicorn` pin moves past 0.54.

**Generated by BMad TEA Agent** - 2026-11-03
