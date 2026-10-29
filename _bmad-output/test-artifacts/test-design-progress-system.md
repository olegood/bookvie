---
runScope: 'system-level'
runKey: 'system'
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/reviews/review-adversarial.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
  - _bmad/tea/config.yaml
  - knowledge/adr-quality-readiness-checklist.md
  - knowledge/nfr-criteria.md
  - knowledge/test-levels-framework.md
  - knowledge/risk-governance.md
  - knowledge/test-quality.md
  - knowledge/playwright-cli.md
lastSaved: '2026-10-29'
---

# Test Design Progress — system

## Step 1: Mode & Prerequisites

- **Mode:** System-Level (explicit user intent; PRD + architecture final, no epics/sprint-status).
- **Inputs found:**
  - PRD: `_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md` (status: final) + `addendum.md`
  - Architecture/ADRs: `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md` (status: final; ADs inline)
  - UX: `ux-bookvie-2026-10-28/DESIGN.md`, `EXPERIENCE.md` (final; Agent Label Contract), `prd-deltas.md` (applied)

## Step 2: Context Loaded

- **Config:** playwright_utils=true, pactjs_utils=true (not applicable — no Pact deps, single in-process API, contract testing not relevant), browser_automation=auto, test_stack_type=auto, risk_threshold=p1.
- **Detected stack:** `fullstack` (greenfield; no code yet). Per architecture: Python 3.14 / FastAPI / Pydantic backend + React 19 / TS 5.9 / Vite / TanStack Query frontend; pytest 9 + Playwright 1.64 named in the spine.
- **Integration points:** browser ↔ FastAPI over 127.0.0.1:8765 (intent + view API); store ↔ filesystem (`library.json`, `covers/`, lock, staging); Pillow for cover decode; OpenAPI → TS generation; external AI cataloging skill via the Agent Label Contract (UI-only).
- **NFRs:** local-first/no network; ≥1024px desktop only; catch-up < 30 s and ≤ 2 interactions; data safety (no silent delete, confirmation on destructive, "Couldn't save" on failed write, input kept); tone (no red/guilt, finish moment ~600 ms, never replays); export→restore identical; sized for ~500 Books / few thousand Card notes (~10 MB).
- **Missing thresholds:** no latency target for views/intents; no explicit max library size enforced; no a11y conformance level stated beyond Accessibility Floor + accepted 1.4.10 deviation.
- **Epics:** none yet (system-level run precedes epic breakdown).
- **Browser exploration:** skipped — no running app.

## Step 3: Testability & Risk

### 🚨 Testability Concerns

| # | Concern | Evidence | Ask |
|---|---|---|---|
| TC-1 | **No seeding path for e2e state.** All writes are intents (AD-3) and there's no whole-document write endpoint. Building "finished Book, paused re-read, Up next, 3 Side reads, 5 Waiting" through the UI is slow and brittle. | AD-3, AD-18; ADR checklist 1.3 | Test-only fixture builder (Python, uses `store.serialize()` + `check_invariants`) that writes `library.json` into the temp `--data-dir` **before** the server starts. Plus an API-level `request` helper that calls intents for shorter setups. No seeding endpoint in the product. |
| TC-2 | **"Today" is controllable in pytest but not in e2e.** `Clock` is injected into `domain/` (AD-20), but the e2e server runs on the real clock. Relative copy ("Last updated 3 days ago", "~7 days left"), the "Finished on not in the future" rule, the This-month stats and the Waiting order all depend on today. Playwright `page.clock` moves only the browser, so the browser's "today" and the server's would differ. | AD-20, AD-6 (client formats "N days ago"), FR-11/14/16 | Decide one of: (a) a test-only `--fake-today`/env override wired into `Clock` (refused unless `--no-browser`), or (b) seed all dates relative to the real today and never assert across midnight. Recommend (a). Pin `TZ` for the server and `timezoneId` for the browser to the same zone either way. |
| TC-3 | **No designed way to force `couldnt_save`.** AD-2 promises "the original is untouched", and the NFR requires "Couldn't save. Your data wasn't changed." with input kept. Nothing says how a test makes the write fail. | AD-2, AD-7, PRD §5 Data safety | `store/` writes through a small fs seam (write/fsync/rename) that pytest can make fail at each step. e2e tests UI behaviour with `page.route` returning the AD-9 `couldnt_save` envelope (503), plus one real check with a read-only data dir. |
| TC-4 | **Parallel e2e needs one server per worker.** One instance per data folder (AD-5), default port 8765 (AD-16), and the Host guard checks `<host>:<port>`. | AD-5, AD-16 | Worker-scoped fixture: temp `--data-dir`, free `--port`, `--no-browser`; `baseURL = http://127.0.0.1:<port>`. |
| TC-5 | **Tests or dev runs can hit the real library.** `--data-dir` defaults to `~/bookvie-data`, and the install smoke test runs `uv tool install` globally. | Consistency Conventions → Config; Structural Seed | Harness refuses to start unless the data dir sits under a temp root. The smoke test uses an isolated `UV_TOOL_DIR`/`UV_TOOL_BIN_DIR` and `HOME`. |
| TC-6 | **Nondeterministic outputs:** curated palette assignment (algorithm deferred), Pile shuffle (client), UUIDs. | AD-11, Deferred, AD-6 | Curated assignment must be deterministic given document state (no RNG). Shuffle takes an injectable random source. Tests assert on IDs returned in `ids`, never on literal values. |

### ✅ Testability Assessment Summary (strong points)

- **Headless by design:** every business action is one `POST /api/intents/<verb>` and every number comes from a server view (AD-3, AD-6). Domain logic is fully testable without a browser (ADR 1.2 ✅).
- **Pure domain plus injected Clock:** `domain/` imports nothing, and time arrives through `Clock` (AD-20). That gives fast, deterministic pytest coverage of rules.
- **Single invariant gate:** `check_invariants()` runs before every commit (AD-18), so property-based tests can assert one oracle after any intent sequence.
- **Deterministic assertions:** the AD-9 envelope with an enum of `code` values makes refusals assertable by code, not by copy. The status and alert live regions make UI outcomes assertable by role and text.
- **Selectors are a spec:** the Agent Label Contract (AD-17) gives exact accessible names, so e2e has no test-ids and no CSS selectors.
- **No external dependencies:** no network, auth or third parties (PRD §5 Local-first), so nothing needs mocking at integration level.
- **Contract drift check:** `npm run check:api` regenerates the TS types and fails on diff (AD-8).

### ASRs (Architecturally Significant Requirements)

| ASR | Source | Status |
|---|---|---|
| Atomic commit; failure leaves the original untouched and returns `couldnt_save` | AD-2 | ACTIONABLE |
| One intent = all consequences + invariants + one commit, or nothing | AD-3, AD-18 | ACTIONABLE |
| Writes/export/restore serialized under one lock | AD-4 | ACTIONABLE |
| Single instance per data dir; stale-lock takeover; clean shutdown | AD-5 | ACTIONABLE |
| Server owns numbers; client calculator uses the same rounding | AD-6 | ACTIONABLE |
| No optimistic UI; invalidate all views after every response; finish moment only in the originating tab | AD-7 | ACTIONABLE |
| Uniform success/error envelope incl. 422 field list | AD-9 | ACTIONABLE |
| Duplicate = server refusal + `confirmDuplicate` | AD-10 | ACTIONABLE |
| Stored, not recomputed (spine colors, finishDate, finishedPages) | AD-11 | ACTIONABLE |
| Cover files before document, deletes after; immutable names | AD-12 | ACTIONABLE |
| Versioned doc; migration chain; `.bak` before rewrite; newer refused | AD-13 | ACTIONABLE |
| Restore: entry allow-list, no traversal, ≤2 GB, validate-then-apply; byte-identical round trip | AD-14 | ACTIONABLE |
| Loopback-only; Host/Origin guard | AD-16 | ACTIONABLE |
| Agent Label Contract is a public interface | AD-17 | ACTIONABLE |
| Injected local Clock; inclusive day count | AD-20 | ACTIONABLE |
| Generated TS types never hand-edited | AD-8 | FYI (covered by `check:api`) |
| Sized for ~500 Books / few thousand Card notes / ~10 MB | Deferred → Performance | FYI |

### Risk Register

Scale: Probability and Impact each 1–3; Score = P×I. **High ≥ 6**. Threshold from config: `p1`.

| ID | Cat | Risk (grounding) | P | I | Score | Mitigation | Owner | When |
|---|---|---|---|---|---|---|---|---|
| R-01 | DATA | **Reading-state transitions go wrong.** Start, Pause, Set Up next, Finish and Side read interact across four independent state parts (EXPERIENCE "Book states"). The adversarial review rated an earlier version of this Critical (H1). Wrong Main/Up next/Waiting membership or a second unfinished Reading breaks the product thesis (SM-3). | 2 | 3 | **6** | pytest state × intent matrix for `start-reading`, `pause`, `set-up-next`, `finish-reading`, `mark-side-read`, `delete-book`; property-based random intent sequences (Hypothesis) asserting `check_invariants()` + `reading_status()` consistency; e2e for UJ-3 and Flow 10. | Dev | Before the Main-book epic closes |
| R-02 | DATA | **Restore loses or corrupts data.** "Restore replaces the current data" and "export then restore reproduces identical data" (FR-23); restore must fail before commit without touching current data (AD-14). | 2 | 3 | **6** | Byte-identical round-trip test over a rich fixture (all states, covers, back-filled, card notes); fault injection at each restore phase (unpack, validate, cover write, commit, cleanup); damaged/truncated/non-bookvie/newer-version archives refused with nothing changed; `.staging/` emptied at startup. | Dev | Backup epic |
| R-03 | DATA | **Commit isn't atomic, or cover ordering leaves dangling refs.** Temp+fsync+rename (AD-2); files in before the document and out after it (AD-12); "No action silently deletes data" (PRD §5). | 2 | 3 | **6** | fs-seam fault injection at write/fsync/rename and between cover write and commit; assert original `library.json` bytes unchanged, error `couldnt_save`, no orphan reference; startup orphan-cover sweep test. | Dev | First persistence story |
| R-04 | SEC | **Cross-site requests to the loopback server.** No authentication; "anything on the machine that can reach the loopback port is trusted" (AD-16). A web page in the user's browser could POST intents (e.g. `restore`) unless the Host/Origin guard holds. | 2 | 3 | **6** | HTTP-level matrix: bad Host, foreign Origin, `Origin: null`, missing Origin with good Host (allowed), `--dev` origin only with `--dev`; assert 403 and no state change. Verify bind is 127.0.0.1 only. | Dev | Server skeleton story |
| R-05 | BUS | **Agent Label Contract drift silently breaks unattended cataloging.** "Cataloging runs unattended" (FR-2); a renamed label or a substring match ("Title" vs "Subtitle") writes wrong data or misses a duplicate dialog (AD-17). | 2 | 3 | **6** | A Playwright suite generated from (or checked against) the EXPERIENCE.md contract table: every label with `exact: true`, every role, every outcome signal (status "Added *Title*.", alertdialog "Possible duplicate", alert validation text, couldn't-save text); live regions emptied per press. Breaking-change rule enforced by that suite. | Dev | New book panel story |
| R-06 | OPS | **Tests or dev runs write to the real `~/bookvie-data`.** It's the default `--data-dir` (Config convention), and the install smoke test installs the global command. | 2 | 3 | **6** | Harness guard (temp root only); isolated `HOME`/`UV_TOOL_DIR` for the smoke test; never run e2e without explicit `--data-dir`. | Dev | Test framework setup |
| R-07 | TECH | **Date/time errors:** local-date finish, inclusive day count, "N days ago" in local calendar days, period boundaries, server/browser "today" mismatch (AD-20, AD-6, FR-16). | 2 | 2 | 4 | Fake-Clock pytest for boundaries (month edges, same-day start/finish = 1 day, DST change); e2e with pinned TZ and the TC-2 decision. | Dev | Progress & Stats epics |
| R-08 | DATA | **Duplicate detection misfires:** ISBN-10→13, hyphens/spaces, title case/whitespace, author-set overlap; edit-only-when-changed (FR-3, AD-10). | 2 | 2 | 4 | Table-driven unit tests of normalization + match; intent tests for 409 `duplicate_book` and `confirmDuplicate`; e2e Don't add / Add anyway. | Dev | Catalog epic |
| R-09 | DATA | **FR-1 edit consequences break:** Pages below current page or highest Card note page; Finished on edit/clear; back-filled Reading beside an active one (FR-1). | 2 | 2 | 4 | Intent tests per consequence with refusal codes; e2e Flow 9 (back-fill). | Dev | Catalog epic |
| R-10 | TECH | **Pace/stats numbers wrong:** Measured pace excludes back-filled; library scope rules; re-reads count again; Side reads never; days-left rounding (FR-11, FR-15, FR-16, AD-6). | 2 | 2 | 4 | Fake-Clock unit tests of `domain/` pace + stats; a parity test that client calculator arithmetic matches server rounding for shared fixtures. | Dev | Progress / Pace / Stats |
| R-11 | TECH | **Stale views across tabs; stale confirmation pauses the wrong book.** Guard deliberately not built (Deferred: Stale confirmation guard; A2 last-write-wins). AD-7 requires invalidate-all + focus refetch. | 2 | 2 | 4 | e2e two-context test: change in tab A visible in tab B after focus; finish moment only in originating tab. Accept stale-confirmation residual (documented). | Dev | Frontend data-layer story |
| R-12 | BUS | **Data-safety UX regresses:** couldn't-save not shown or input lost; destructive action without confirmation (PRD §5). | 2 | 2 | 4 | e2e with `page.route` 503 envelope on each save surface (panel, page field, card note, finish, start, pause, delete): input kept, alert text exact; confirm dialogs on delete/restore. | Dev | Each UI epic |
| R-13 | OPS | **Second instance or stale lock:** two writers or a failed start (AD-5). | 1 | 3 | 3 | Integration tests: live lock → second launch opens URL and exits; dead PID → takeover; SIGTERM waits for the write lock, removes `bookvie.lock`. | Dev | CLI story |
| R-14 | SEC | **Malicious restore archive or image:** path traversal, absolute paths, zip bomb, non-image cover (AD-14, AD-12). Single user supplying own files, so low likelihood. | 1 | 3 | 3 | Crafted-archive tests (`../`, absolute, extra entries, >2 GB declared), Pillow re-decode rejects non-images, 20 MB cap. | Dev | Backup epic |
| R-15 | DATA | **Migration chain destroys the only copy** (AD-13). MVP ships at `schemaVersion` 1, so there are no migrations yet. | 1 | 3 | 3 | Harness test that a fake v0→v1 migration writes `library.v0.bak.json` first; newer version refused unchanged. | Dev | First migration |
| R-16 | OPS | **Suites not run:** no CI provider; everything runs locally (Deferred: CI provider). | 2 | 2 | 4 | One `make check` / `just check` running pytest, `check:api`, Playwright, smoke; optional pre-push hook. Revisit with `bmad-testarch-ci`. | Dev | Test framework setup |
| R-17 | PERF | **Catch-up exceeds 2 interactions / 30 s, or full-document rewrite slows at size** (PRD §5 Speed; Deferred → Performance ~500 Books). | 1 | 2 | 2 | e2e counts interactions for UJ-2; pytest timing smoke with a 500-Book / 3,000-note fixture (informational). | Dev | Progress epic |
| R-18 | TECH | **Generated types drift from Pydantic** (AD-8). | 1 | 2 | 2 | `npm run check:api` in the check command. | Dev | Ongoing |

**High risks (≥ 6):** R-01, R-02, R-03, R-04, R-05, R-06. **No score-9 risks**, so no gate blockers.

### NFR Planning

| Category | In scope | Thresholds (source) | Unknown → clarification | Planned evidence |
|---|---|---|---|---|
| Security | Yes | Bind 127.0.0.1 only; Host/Origin allow-list; no auth by design (AD-16). Restore entry allow-list, no `..`/absolute, ≤ 2 GB uncompressed (AD-14). Covers re-decoded, ≤ 20 MB upload (AD-12). | — | pytest HTTP guard matrix; crafted-archive tests; `pip-audit`/`npm audit` (optional) |
| Reliability / Data integrity | Yes | Atomic commit (AD-2); all-or-nothing intent (AD-3); serialized writes (AD-4); single instance (AD-5); round trip byte-identical (AD-14); `.bak` before migration (AD-13); couldn't-save copy exact (PRD §5). | — | fs fault-injection pytest; property-based invariant tests; round-trip test; lock/CLI integration tests |
| Performance | Partly | Catch-up < 30 s and ≤ 2 interactions after opening (PRD §5). Sized for ~500 Books / few thousand Card notes / ~10 MB (Deferred). | **UNKNOWN:** intent or view latency target at 500 Books. | e2e interaction count; pytest timing smoke on a large fixture (report only until a target exists) |
| Accessibility (project-specific) | Yes | Accessibility Floor + Agent Label Contract (EXPERIENCE); 1.4.10 Reflow deviation accepted (PRD §5). | **UNKNOWN:** whether an automated scan (axe) is a gate, and at what level. | Label-contract e2e; optional `@axe-core/playwright` on key pages |
| Maintainability | Yes | pytest covers "every FR consequence, refusal code and `check_invariants` rule" (Consistency Conventions → Testing); `check:api` clean (AD-8). | **UNKNOWN:** a numeric coverage target. | Coverage report from pytest-cov; `check:api` |
| Scalability / Availability / DR beyond export | No (single-user local app) | — | — | — |
| Compliance | No | — | — | — |

### Clarifications (not risks)

- **Q1 (TC-2):** e2e time control: test-only `Clock` override vs. relative seeding? Recommendation: override.
- **Q2:** latency target for intents and views at ~500 Books (or keep it informational).
- **Q3:** coverage target for `domain/` + `intents/` (suggest ≥ 90% line on `domain/`, but this is the user's call).
- **Q4:** axe scan as a gate or advisory.

### Summary

Six high risks, no blockers. Four are data-integrity risks: state transitions, restore, atomic commit, and the real data dir. The other two are the loopback CSRF guard and label-contract drift. Most of them are cheap to cover at the pytest level, because the architecture is headless and the Clock is injected. The two design asks that make this work are a **fixture seeding path** (TC-1) and a **controllable "today" for e2e** (TC-2). Both should land in the test-framework story, before feature epics.

## Step 4: Coverage Plan

**Levels** (from the spine's Testing convention; no component-test tool is named, so none is planned):
- **UNIT:** pytest on `domain/` with a fake `Clock`. No I/O.
- **API:** pytest on FastAPI `TestClient` → intents/views → real `store/` on a temp data dir, with an fs seam for fault injection.
- **E2E:** Playwright against `bookvie --no-browser --data-dir <tmp> --port <free>`, selectors from the Agent Label Contract and roles.
- **SMOKE:** build → isolated `uv tool install` → start → GET `/`.

**ID format:** `<AREA>-<LEVEL>-<NNN>`. Epic-level designs will remap these to `{epic}.{story}-LEVEL-NNN`.

**Duplicate-coverage guard:** rules and numbers are proven at UNIT/API. E2E only proves the journey wiring, the label contract and UI-only behaviour (live regions, focus, invalidation, input kept on failure).

### Coverage Matrix

#### A. Foundation: store, server, CLI

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| FND-API-001 | Failure at temp-write / fsync / rename → original `library.json` byte-identical, `couldnt_save` 503 envelope | API | P0 | R-03 | fs seam |
| FND-API-002 | Cover written, then commit fails → document unchanged, new cover unreferenced and swept at next startup | API | P0 | R-03 | AD-12 order |
| FND-API-003 | Replacing a cover: new immutable name, old file deleted only after commit | API | P1 | R-03 | |
| FND-API-004 | Host/Origin guard matrix (bad Host, foreign Origin, `null` Origin, no Origin + good Host, `--dev` origin with and without `--dev`) → 403 + no state change | API | P0 | R-04 | Security-critical; API is the right level |
| FND-API-005 | Server binds 127.0.0.1 only (not 0.0.0.0) | API | P0 | R-04 | Socket check |
| FND-API-006 | Concurrent intents (threads) → both applied serially, none lost; export during intent sees a consistent snapshot | API | P1 | R-03 | AD-4 |
| FND-API-007 | Every refusal returns the AD-9 envelope; FastAPI validation → 422 `invalid_fields` with every failing field | API | P1 | R-05 | Contract shape the UI and agent depend on |
| FND-API-008 | Live lock → second launch opens the recorded URL and exits; dead PID → takeover; SIGTERM waits for the write lock then removes `bookvie.lock` | API | P1 | R-13 | Subprocess test |
| FND-API-009 | Port held by a non-bookvie process → exit message names port + `--port` | API | P2 | R-13 | |
| FND-API-010 | Startup with newer `schemaVersion` or invalid JSON → refused, file untouched | API | P0 | R-15 | |
| FND-API-011 | Migration harness: fake vN→vN+1 writes `library.vN.bak.json` before rewrite | API | P1 | R-15 | Needed once a migration exists |
| FND-UNIT-001 | `store.serialize()` determinism: same model → same bytes (key order, nulls, indent, UTF-8) | UNIT | P0 | R-02 | Basis for byte-identical round trip |
| FND-UNIT-002 | `check_invariants()`: one test per rule (dangling pointer, Main = Up next, Main = Side read, >3 Side reads, 2 unfinished Readings, Main without unfinished Reading, out-of-range pages) | UNIT | P0 | R-01 | |
| FND-SMOKE-001 | Build SPA → isolated `uv tool install` → start → `/` serves SPA; client route falls back to `index.html` | SMOKE | P1 | R-06, R-16 | Isolated HOME / UV_TOOL_DIR |
| FND-UNIT-003 | Test harness refuses a data dir outside the temp root | UNIT | P0 | R-06 | Guards the real library |
| FND-CHK-001 | `npm run check:api` clean | Static | P1 | R-18 | |

#### B. Catalog & entry (FR-1 to FR-4)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| CAT-API-001 | `add-book` required fields: each missing → 422 listing all missing fields; nothing saved | API | P1 | R-05 | |
| CAT-API-002 | Field rules: Pages ≥ 1 int, Edition ≥ 1, Year 4 digits ≤ next year, ISBN 10/13 digits (X allowed), Spine color `#RRGGBB`/empty, Finished on not future | API | P1 | R-09 | Table-driven |
| CAT-API-003 | Defaults: edition 1, ownership owned, curated color assigned deterministically, `createdAt` set | API | P2 | R-09 | TC-6 |
| CAT-API-004 | Finished on on create → back-filled Reading (`startDate: null`); on a Book with an active/paused Reading → adds past Reading, current untouched | API | P0 | R-09, R-01 | Data integrity |
| CAT-API-005 | Edit Finished on changes most recent finish date; clearing it is refused | API | P1 | R-09 | |
| CAT-API-006 | Edit Pages below current page / highest Card note page → 409 with the specific code; finished Readings keep `finishedPages` | API | P0 | R-09 | AD-11 |
| CAT-API-007 | Delete Book → Readings + Card notes gone; Main/Up next/Side pointers cleared in same commit; vacated slots stay empty | API | P0 | R-01 | AD-18 |
| CAT-API-008 | Cover upload: non-image refused, >20 MB refused, image downscaled ≤ 1200 px, `spineColorFromCover` computed once | API | P1 | R-14 | |
| CAT-UNIT-001 | ISBN normalization (hyphens, spaces, ISBN-10→13 incl. X check digit) | UNIT | P1 | R-08 | |
| CAT-UNIT-002 | Duplicate match: ISBN match; title (case/whitespace) + shared author when either lacks ISBN; author set split on `;` | UNIT | P1 | R-08 | |
| CAT-API-009 | `add-book` duplicate → 409 `duplicate_book`; resend with `confirmDuplicate` → saved. Edit triggers check only when title/author/ISBN changed | API | P1 | R-08 | |
| CAT-UNIT-003 | Spine color resolution: user > from-cover > curated; re-resolved only by intents that change inputs | UNIT | P2 | — | AD-11 |
| CAT-E2E-001 | **Label contract:** every label/role in the EXPERIENCE.md table found with `exact: true`; "Title" never resolves to Subtitle | E2E | P0 | R-05 | The contract is a public interface; only E2E sees the accessibility tree |
| CAT-E2E-002 | Agent flow (UJ-1): New book → fill by labels → Add book → status "Added *Title*." → Search titles finds spine "*Title* by…" | E2E | P0 | R-05 | |
| CAT-E2E-003 | Duplicate: alertdialog "Possible duplicate", form behind inert; Don't add keeps fields; Add anyway saves | E2E | P0 | R-05, R-08 | |
| CAT-E2E-004 | Validation: alert "Not saved. N fields need attention: …", `aria-invalid` + described-by, focus on first invalid; live regions emptied per press | E2E | P1 | R-05 | |
| CAT-E2E-005 | Couldn't save on Add book (routed 503) → alert text exact, panel open, every value kept | E2E | P0 | R-05, R-12 | Unattended agent must see it |
| CAT-E2E-006 | Delete Book requires confirmation; Cancel changes nothing | E2E | P1 | R-12 | |
| CAT-E2E-007 | Flow 9 back-fill via Mark finished and via Edit → Finished on; spine full color, meter updates | E2E | P2 | R-09 | Rules already at API |

#### C. Main book, Readings, pausing (FR-5 to FR-9)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| RDG-API-001 | `start-reading` × state matrix (none / Main exists / Up next displaced paused vs never started / finished → re-read / resume paused) → resulting pointers, Reading count, statuses | API | P0 | R-01 | Core thesis |
| RDG-API-002 | `pause` with/without Up next → previous Main becomes Up next; displaced Up next → Waiting (paused) or catalog (never started); `pausedAt` = today | API | P0 | R-01 | |
| RDG-API-003 | `set-up-next` displacement rules; Main can't be Up next | API | P1 | R-01 | |
| RDG-API-004 | Side reads: max 3 (4th refused), mark/unmark changes nothing else, start with "Which page?" tracks from that page, leaving on Main/finish | API | P1 | R-01 | Should |
| RDG-API-005 | Purpose: set on start, edit later, null allowed | API | P2 | — | |
| RDG-UNIT-001 | `reading_status()`: finished / active / paused; `pausedAt` ignored while active | UNIT | P0 | R-01 | |
| RDG-UNIT-002 | Property-based: random sequences of intents over random libraries → `check_invariants()` holds, at most one unfinished Reading per Book, Waiting = paused minus Up next | UNIT | P0 | R-01 | Hypothesis; highest-yield test |
| RDG-API-006 | Waiting for you order: oldest `pausedAt` first, no cap, Up next excluded | API | P1 | R-01 | Views |
| RDG-E2E-001 | UJ-3: Start *X* with Main *Y* → dialog copy names trade-off and Up next displacement → confirm → Home shows *X* Main, *Y* Up next | E2E | P1 | R-01 | Journey wiring only |
| RDG-E2E-002 | Flow 10: Pause via ⋯ with Up next → confirm copy → Resume from Waiting → Purpose prefilled, no trade-off line | E2E | P1 | R-01 | |
| RDG-E2E-003 | Cancel on Start/Pause confirmation changes nothing | E2E | P1 | R-12 | |

#### D. Progress & bookcase (FR-10, FR-11, FR-24)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| PRG-API-001 | `update-page` bounds 0..pages (out of range → 422), lower page allowed, `lastProgressUpdate` set | API | P1 | R-07 | |
| PRG-API-002 | `update-page` at last page → saved + `reachedLastPage: true`, Reading stays unfinished | API | P0 | R-01 | Only `finish-reading` finishes |
| PRG-UNIT-001 | Percentage; days left = ceil(pages left ÷ Measured pace), min 1; hidden with no pace or 0 left | UNIT | P1 | R-10 | |
| PRG-API-003 | Home view: bookcase slice rows (Main row, Up next row, recent finishes; ≤ 3), markers by priority, "X of Y finished" meter | API | P1 | R-10 | AD-6 server selection |
| PRG-E2E-001 | UJ-2: open app → type page → Update = ≤ 2 interactions; gauge %, "p.N of M", "~N days left" update after refetch | E2E | P0 | R-17, R-07 | Speed NFR + the product's core loop (SM-1) |
| PRG-E2E-002 | "Last updated N days ago" with controlled today (TC-2), muted, never warning styling | E2E | P2 | R-07 | |
| PRG-E2E-003 | Last page → Finish dialog opens; Cancel → Reading active at that page, gauge 100%, Update with the same page reopens dialog | E2E | P1 | R-01 | |
| PRG-E2E-004 | Spine accessible names carry status ("Main book, 64%", "waiting for you, page 120", ", on the side") | E2E | P2 | R-05 | |

#### E. Finishing (FR-14)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| FIN-API-001 | `finish-reading` Main → `finishDate`, `finishedPages` stored; no Main; Up next suggested | API | P0 | R-01 | |
| FIN-API-002 | Finish non-Main paused/Up next Reading → Main unchanged, removed from Up next/Waiting | API | P0 | R-01 | |
| FIN-API-003 | Finished on: default today, not future, not before start (exact refusal codes); no Reading → back-filled | API | P1 | R-07 | Fake Clock |
| FIN-API-004 | Purpose fulfilled asked only with Purpose; rating 1–5; both skippable | API | P2 | — | Should |
| FIN-E2E-001 | UJ-4 finish moment: status "Finished *X*. N of M finished.", plays once; reload → no replay; second tab → no animation (AD-7) | E2E | P2 | R-11 | Tone NFR; cosmetic if broken |
| FIN-E2E-002 | Reduced motion → instant fill | E2E | P3 | — | |

#### F–G. Pace & Stats (FR-15, FR-16)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| PAC-UNIT-001 | Measured pace: inclusive days, same-day = 1, back-filled excluded, none when no started+finished Reading | UNIT | P1 | R-10, R-07 | |
| PAC-API-001 | Pages left: Book scope (current Reading or all pages); library scope (never-started owned + active/paused incl. re-reads; finished w/o active excluded) | API | P1 | R-10 | |
| PAC-E2E-001 | UJ-5 calculator: prefilled with Measured pace; typing updates date + duration; 0/negative/NaN → no result, no error | E2E | P2 | R-10 | |
| PAC-UNIT-002 | Client arithmetic parity: ceil(pages ÷ ppd) and today + days match server rounding on shared fixtures | UNIT | P2 | R-10 | Vitest or a Playwright-evaluated check; tool choice to the framework story |
| STA-UNIT-001 | Stats: all pages in finish period, local-date boundaries (month edge, DST), back-filled by Finished on, re-reads count again, Side reads never | UNIT | P1 | R-07, R-10 | |
| STA-API-001 | Stats view for preset + custom range; per-month bars; All time starts at earliest finish; empty range zeros | API | P2 | R-10 | |
| STA-E2E-001 | Stats presets render and switch; empty range message | E2E | P3 | — | |

#### H. Card notes (FR-17 to FR-19)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| CRD-API-001 | Add/edit/delete; text required; page or range within page count; range low→high; one page or one range | API | P1 | R-09 | |
| CRD-E2E-001 | Flow 6: add a card note from Home → visible in Book detail block | E2E | P1 | — | Must; Home entry |
| CRD-E2E-002 | Card notes view: search across Books (case-insensitive, grouped, highlighted, title shown); scoped search; open result → pile at that note | E2E | P2 | — | Client-side search |
| CRD-E2E-003 | Pile: page order, shuffle (seeded), next/prev, jump | E2E | P2 | — | TC-6 |

#### I. Organizing (FR-20, FR-21, Should)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| ORG-E2E-001 | Sort Author/Title/Date added/Pages reorders bookcase; filter chips hide non-matches; "No books match these filters." + Clear | E2E | P2 | — | Client presentation |
| ORG-E2E-002 | Main book cover or placeholder on Home | E2E | P3 | — | |

#### J. Backup & restore (FR-22, FR-23)

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| BKP-API-001 | Export → restore on a rich fixture (every Book state, covers, back-filled, card notes) → byte-identical `library.json` + covers | API | P0 | R-02 | FR-23 promise |
| BKP-API-002 | Export zip contains only `library.json` + `covers/`; `local-state.json` excluded; last-export timestamp recorded | API | P1 | R-02 | AD-15 |
| BKP-API-003 | Restore refusals leave data unchanged: not a zip, truncated, missing `library.json`, invalid schema, invariant violation, missing/undecodable cover, newer version | API | P0 | R-02 | |
| BKP-API-004 | Malicious archives: `../`, absolute path, unexpected entry, >2 GB declared uncompressed → refused, nothing written outside `.staging/` | API | P0 | R-14 | Security; cheap |
| BKP-API-005 | Fault injection during restore apply (cover write, commit) → current data intact; `.staging/` emptied at startup | API | P0 | R-02, R-03 | |
| BKP-API-006 | Older-version export → migrated then applied | API | P1 | R-15 | When a v2 exists |
| BKP-E2E-001 | Flow 8: Restore from file → "Replace all data with this file?" → Replace → "Restored." → Home matches | E2E | P1 | R-02 | |
| BKP-E2E-002 | Wrong file → "This file isn't a bookvie export, or it's damaged. Nothing was changed." | E2E | P1 | R-02, R-12 | |
| BKP-E2E-003 | "Last export: N days ago" / "No export yet" on Home + Backup | E2E | P3 | — | |

#### K. Cross-cutting UI behaviour

| ID | Scenario | Level | Pri | Risk Link | Notes |
|---|---|---|---|---|---|
| XUI-E2E-001 | Couldn't save on page field, card note, finish, start, pause, delete (routed 503) → alert exact, input kept, no claimed change | E2E | P1 | R-12 | Parametrized; one test per surface |
| XUI-E2E-002 | Two browser contexts: intent in A → B shows it after focus/visibility (AD-7); a refusal also invalidates | E2E | P1 | R-11 | Mirrors the agent + user setup (A1) |
| XUI-E2E-003 | No optimistic UI: delayed intent response → UI doesn't change until refetched views render | E2E | P2 | R-11 | `page.route` delay |
| XUI-E2E-004 | Tone check: no exclamation marks in rendered copy on key pages; no red failure color tokens on error states | E2E | P3 | — | Cheap lint-style assertion |
| XUI-E2E-005 | Empty states (first run, no Main/no Up next, Waiting none/one/many) | E2E | P2 | — | |

### Risk → coverage check

All registered risks have at least one row: R-01 (FND-UNIT-002, RDG-*, FIN-API-001/002, PRG-API-002), R-02 (BKP-API-001/003/005, FND-UNIT-001), R-03 (FND-API-001/002/003/006, BKP-API-005), R-04 (FND-API-004/005), R-05 (CAT-E2E-001..005, FND-API-007), R-06 (FND-UNIT-003, FND-SMOKE-001), R-07 (PRG-*, FIN-API-003, STA-UNIT-001, PAC-UNIT-001), R-08 (CAT-UNIT-001/002, CAT-API-009, CAT-E2E-003), R-09 (CAT-API-002/004/005/006, CRD-API-001), R-10 (PRG-UNIT-001, PAC-*, STA-*), R-11 (XUI-E2E-002/003, FIN-E2E-001), R-12 (XUI-E2E-001, CAT-E2E-005/006, RDG-E2E-003), R-13 (FND-API-008/009), R-14 (BKP-API-004, CAT-API-008), R-15 (FND-API-010/011, BKP-API-006), R-16 (FND-SMOKE-001 + check command), R-17 (PRG-E2E-001), R-18 (FND-CHK-001).

**Counts:** P0 ≈ 27, P1 ≈ 38, P2 ≈ 18, P3 ≈ 5 (≈ 88 scenarios; many API rows are table-driven, so the actual test-function count is higher).

### NFR Coverage & Evidence Plan

| NFR | Scenarios | Tool | Evidence for `nfr-assess` | Gaps |
|---|---|---|---|---|
| Security | FND-API-004/005, BKP-API-004, CAT-API-008 | pytest | junit XML + guard matrix report | none |
| Reliability / data integrity | FND-API-001/002/006/008/010, BKP-API-001/003/005, RDG-UNIT-002 | pytest + Hypothesis | junit XML; Hypothesis stats | none |
| Performance | PRG-E2E-001 (interaction count), large-fixture timing smoke | Playwright, pytest | e2e report; timing log | **Latency threshold UNKNOWN (Q2)**: report only |
| Accessibility | CAT-E2E-001/004, PRG-E2E-004, optional axe | Playwright (+ axe) | e2e report; axe JSON | **Gate level UNKNOWN (Q4)** |
| Maintainability | coverage, `check:api` | pytest-cov, npm | coverage XML; check output | **Coverage target UNKNOWN (Q3)** |

### Execution Strategy

There's no CI (Deferred), so "PR" means the local `check` command, run before every push.

- **Every push (local `check`, target < 10 min):** all UNIT + API (seconds), `check:api`, the full Playwright suite (~31 e2e scenarios at 4 workers, est. 3–6 min).
- **Weekly / before release:** install smoke (FND-SMOKE-001), large-fixture timing, Hypothesis with a raised example count, axe scan.
- When a CI is chosen (`bmad-testarch-ci`), the same split maps to PR / nightly.

### Resource Estimates (single developer)

| Priority | Effort |
|---|---|
| P0 | ~25–40 h |
| P1 | ~25–40 h |
| P2 | ~10–20 h |
| P3 | ~2–5 h |
| Framework + harness (TC-1..TC-6: fixture builder, Clock override, fs seam, worker server fixture, guards, check command) | ~8–14 h |
| **Total** | **~70–120 h**, spread across the epics, roughly 25–35% on top of feature work |

### Quality Gates

- P0 pass rate = **100%**; P1 ≥ **95%** (every failure has an issue logged against it).
- All six high risks (R-01 to R-06) have their mitigation tests green before the MVP is "done".
- Coverage: **proposed** ≥ 90% line on `domain/`, ≥ 80% on `intents/` + `store/` (pending Q3). No frontend coverage gate.
- `check:api` clean; no committed `.only`/skip without a reason.
- An NFR evidence source exists for each in-scope category; PASS/CONCERNS/FAIL deferred to `bmad-testarch-nfr`.

## Step 5: Outputs

- **Execution mode:** sequential (all content already assembled in this context; one writer keeps the three docs consistent).
- **Outputs:**
  - `_bmad-output/test-artifacts/test-design-architecture.md` (233 lines; slightly above the ~200 target because of the full 18-row risk register)
  - `_bmad-output/test-artifacts/test-design-qa.md`
  - `_bmad-output/test-artifacts/test-design/bookvie-handoff.md`
- **Validation:** checklist reviewed. Two-document split respected (no scenarios, gates or tooling in the architecture doc). Interval estimates; PR/Nightly/Weekly with philosophy stated; every risk ID mapped to coverage; Not in Scope with mitigations; entry/exit criteria incl. bug gate. No browser sessions opened. Scenario counts re-verified against the tables (P0 27 / P1 38 / P2 18 / P3 5 = 88).
- **Open:** Q1 Clock override vs relative seeding; Q2 latency target; Q3 coverage target; Q4 axe gate. Approval wanted for Hypothesis dev dependency and TC-6 determinism constraint.
- **Completed:** 2026-10-29

## Decisions (2026-10-29, Oleg)

Q1 `--fake-today` flag · Q2 no latency target (report only) · Q3 coverage ≥ 90% `domain/`, ≥ 80% `intents/` + `store/` · Q4 axe report only · Hypothesis approved · deterministic curated palette approved · e2e isolated: per-worker data dirs under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`; harness refuses any other path, always `~/bookvie-data`. All three output docs updated.
