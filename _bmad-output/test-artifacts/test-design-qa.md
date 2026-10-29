---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-10-29'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md
  - _bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
  - _bmad-output/test-artifacts/test-design-architecture.md
---

# Test Design for QA: bookvie MVP

**Purpose:** The test execution recipe: what to test, at which level, how, and what the build has to provide.

**Date:** 2026-10-29
**Author:** Murat (TEA) for Oleg
**Status:** Draft
**Project:** bookvie

**Related:** `test-design-architecture.md` covers the testability concerns (TC-1 to TC-6), the full risk register and the mitigation plans.

---

## Executive Summary

**Scope:** The whole bookvie MVP: the `domain/` rules, intents and views over the real file store, the HTTP guard, the CLI lock, the React UI flows, the Agent Label Contract, and export/restore. Covers every Must FR plus the Should FRs bound in the spine (FR-8, FR-11, FR-14 prompts, FR-20, FR-21).

**Risk Summary:**

- Total risks: 18 (6 high ≥ 6, 9 medium, 3 low)
- Critical categories: **DATA** (R-01, R-02, R-03), then SEC (R-04), BUS (R-05) and OPS (R-06)

**Coverage Summary:**

- P0: ~27 (data integrity, security, the label contract, the core loop)
- P1: ~38 (core journeys, rules, refusals)
- P2: ~18 (Should features, secondary views)
- P3: ~5 (cosmetic, tone)
- **Total:** ~88 scenarios (~2–3.5 weeks of focused work for one developer, spread across the epics)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| Load / stress / soak testing (k6) | Single user, single local process; no throughput NFR | Large-fixture timing smoke (informational) |
| Multi-user, auth, phone layouts, borrowed books, in-app import | PRD §6.3 Won't | None needed |
| Later features (Shelves, Goals, Sequences, Donation, Wishlist) | PRD §6.2; each arrives with a new `schemaVersion` | Migration harness (FND-API-011) ready for them |
| Contract testing (Pact) | One in-process API with generated types; no independent consumers | `check:api` (AD-8) + API tests |
| Stale-confirmation guard | Deliberately not built (spine → Deferred, A2) | Residual risk R-11 accepted; invalidation is tested |
| Cross-browser matrix | Desktop, one user; the agent drives Chromium | Chromium for e2e; spot-check others by hand |
| Visual regression | Design tokens; no visual NFR beyond tone | Tone assertions (XUI-E2E-004) |

---

## Dependencies & Test Blockers

### Backend/Architecture Dependencies (Pre-Implementation)

Details are in the architecture doc's Quick Guide.

1. **TC-1 Fixture seeding path** (Dev, test framework story)
   - A Python builder that emits a valid `library.json` through `store.serialize()` and `check_invariants()`, written to the temp data dir before the server starts.
   - Without it, every complex state has to be clicked into place, which is slow and brittle.
2. **TC-2 Test-only `Clock` override** (Dev, server skeleton)
   - `--fake-today YYYY-MM-DD` (or an env var), refused without `--no-browser`. Pin `TZ`, and set the same zone in the Playwright `timezoneId`. The fixture also sets `page.clock` to the `--fake-today` date, so browser-side dates match (AD-20).
   - Without it, relative dates, "not in the future" and This-month stats can't be asserted reliably.
3. **TC-3 fs seam in `store/`** (Dev, first persistence story)
   - An injectable write/fsync/rename interface.
   - Without it, AD-2 and AD-12 atomicity (R-03) can't be proven.
4. **TC-5 Real-library guard** (Dev, test framework story)
   - **e2e data dir:** each Playwright worker gets a fresh, empty dir at `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/` (created with `mkdtemp`, removed at teardown; kept on failure for debugging). pytest uses `tmp_path`.
   - The harness resolves the path (following symlinks) and refuses to start a server unless it sits under `$TMPDIR/bookvie-e2e/`. It always refuses `~/bookvie-data` or anything inside it, and never starts `bookvie` without an explicit `--data-dir`.
   - Protects `~/bookvie-data` (R-06).

### QA Infrastructure Setup (Pre-Implementation)

1. **Test data builders** (Dev)
   - Python `LibraryBuilder` with chainable states: `.book(title=…, pages=…)`, `.main(...)`, `.paused(at_page=…, paused_at=…)`, `.finished(on=…)`, `.back_filled(on=…)`, `.up_next(...)`, `.side_read(...)`, `.card_note(...)`. Titles and authors are unique per test (faker), and dates are relative to the fake today.
   - The same builder makes the rich restore fixture (every state in EXPERIENCE "Book states", plus covers).
2. **Test environments**
   - **pytest:** a `tmp_path` data dir per test; `TestClient(app(data_dir, clock=FakeClock(...)))`.
   - **Playwright:** a worker-scoped fixture that writes the fixture, starts `bookvie --no-browser --data-dir $TMPDIR/bookvie-e2e/<run-id>/worker-<n> --port <free> --fake-today <date>`, waits for `/` to respond, and kills the server at teardown. `baseURL = http://127.0.0.1:<port>`. 4 workers.
   - **CI:** none (spine → Deferred). One local `check` command.

---

## Risk Assessment

Full details are in the architecture doc.

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| **R-01** | DATA | Reading-state transitions | **6** | FND-UNIT-002, RDG-UNIT-001/002, RDG-API-001..003, FIN-API-001/002, PRG-API-002 |
| **R-02** | DATA | Restore loses or corrupts data | **6** | FND-UNIT-001, BKP-API-001/003/005, BKP-E2E-001/002 |
| **R-03** | DATA | Non-atomic commit / cover ordering | **6** | FND-API-001/002/003/006, BKP-API-005 |
| **R-04** | SEC | Cross-site requests to loopback | **6** | FND-API-004/005 |
| **R-05** | BUS | Agent Label Contract drift | **6** | CAT-E2E-001..005, FND-API-007 |
| **R-06** | OPS | Tests touch the real data dir | **6** | FND-UNIT-003, FND-SMOKE-001 |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| R-07 | TECH | Date/time errors | 4 | PAC-UNIT-001, STA-UNIT-001, FIN-API-003, PRG-API-001, PRG-E2E-001/002 |
| R-08 | DATA | Duplicate detection misfires | 4 | CAT-UNIT-001/002, CAT-API-009, CAT-E2E-003 |
| R-09 | DATA | FR-1 edit consequences | 4 | CAT-API-002/004/005/006, CRD-API-001, CAT-E2E-007 |
| R-10 | TECH | Pace/stats numbers wrong | 4 | PRG-UNIT-001, PRG-API-003, PAC-*, STA-* |
| R-11 | TECH | Stale views across tabs | 4 | XUI-E2E-002/003, FIN-E2E-001 |
| R-12 | BUS | Data-safety UX regresses | 4 | XUI-E2E-001, CAT-E2E-005/006, RDG-E2E-003, BKP-E2E-002 |
| R-16 | OPS | Suites not run (no CI) | 4 | FND-SMOKE-001 + `check` command |
| R-13 | OPS | Second instance / stale lock | 3 | FND-API-008/009 |
| R-14 | SEC | Malicious archive / image | 3 | BKP-API-004, CAT-API-008 |
| R-15 | DATA | Migration destroys only copy | 3 | FND-API-010/011, BKP-API-006 |
| R-17 | PERF | Catch-up speed / size | 2 | PRG-E2E-001; timing smoke |
| R-18 | TECH | TS type drift | 2 | FND-CHK-001 |

---

## NFR Test Coverage Plan

| NFR Category | Requirement / Threshold | Planned Validation | Tool / Level | Evidence Artifact | Priority |
|---|---|---|---|---|---|
| Security | Loopback bind; Host/Origin allow-list; archive allow-list, no traversal, no symlinks, ≤ 1 GB upload, ≤ 5,000 entries, ≤ 1 GB extracted; image re-decode, ≤ 20 MB | Guard matrix; bind check; crafted archives; non-image upload | pytest API | `reports/pytest-junit.xml` | P0 |
| Reliability / data integrity | Atomic commit; all-or-nothing intent; serialized writes; single instance; byte-identical round trip; `.bak` before migration | Fault injection; concurrency; lock subprocess; round trip; Hypothesis invariants | pytest UNIT/API | junit XML; Hypothesis statistics | P0 |
| Performance | Catch-up ≤ 2 interactions, < 30 s; ~500 Books / ~10 MB | Interaction-count e2e; intent/view timing on a 500-Book / 3,000-note fixture | Playwright; pytest | Playwright HTML report; `reports/timing.txt` | P0 (interactions) / P3 (timing) |
| Accessibility | Accessibility Floor; Agent Label Contract | Contract suite; validation a11y attributes; spine names; optional axe | Playwright (+ `@axe-core/playwright`) | Playwright report; axe JSON | P0 (contract) / P3 (axe) |
| Maintainability | Every FR consequence, refusal code and invariant tested; types generated | Coverage; `check:api` | pytest-cov; npm | `reports/coverage.xml`; check output | P1 |

**Thresholds (decided 2026-10-29):** no latency target, timings report only (Q2); coverage ≥ 90% `domain/`, ≥ 80% `intents/` + `store/`, gated (Q3); axe report only (Q4).

---

## Entry Criteria

- [ ] TC-1, TC-2, TC-3 and TC-5 in place (see Dependencies)
- [ ] Playwright worker fixture and the `check` command exist
- [ ] `LibraryBuilder` covers every row of EXPERIENCE "Book states"
- [ ] `--fake-today` flag implemented (Q1 decided: flag)
- [ ] e2e harness creates per-worker dirs under `$TMPDIR/bookvie-e2e/` and its path guard is unit-tested (FND-UNIT-003)
- [ ] Feature runnable locally via `bookvie --no-browser --data-dir $TMPDIR/bookvie-e2e/<run-id>/worker-<n>`

## Exit Criteria

- [ ] All P0 passing (100%)
- [ ] P1 ≥ 95% passing; every failure has an issue logged against it
- [ ] No open bugs against P0 scenarios or high risks (R-01 to R-06)
- [ ] R-01 to R-06 mitigation tests green
- [ ] `check:api` clean; no committed `.only` or reasonless skip
- [ ] Coverage meets the agreed target (≥ 90% line `domain/`, ≥ 80% `intents/` + `store/`)
- [ ] `~/bookvie-data` untouched by a full `check` run
- [ ] An NFR evidence artifact exists for each in-scope category (verdict via `bmad-testarch-nfr`)

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level** (what to focus on if time is short), NOT execution timing. See "Execution Strategy" for when tests run.

**Levels:** UNIT = pytest on `domain/` with a fake Clock. API = pytest TestClient → intents/views → real store on a temp dir. E2E = Playwright against a real server, selectors from the Agent Label Contract and roles. SMOKE = build + isolated install. Rules are proven at UNIT/API; E2E proves wiring, the contract and UI-only behaviour (duplicate-coverage guard).

**IDs:** `<AREA>-<LEVEL>-<NNN>`. Epic-level designs remap them to `{epic}.{story}-LEVEL-NNN`.

### P0 (Critical)

**Criteria:** critical data-integrity, security or core-contract impact with no safe workaround.

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **FND-API-001** | Failure at temp-write / fsync / rename → original `library.json` byte-identical, 503 `couldnt_save` | API | R-03 | TC-3 seam |
| **FND-API-002** | Cover written, then commit fails → doc unchanged; new cover unreferenced and swept at startup | API | R-03 | AD-12 order |
| **FND-API-004** | Host/Origin guard matrix → 403, no state change | API | R-04 | Includes `Origin: null`, `--dev` |
| **FND-API-005** | Server binds 127.0.0.1 only | API | R-04 | |
| **FND-API-010** | Startup with newer `schemaVersion` or invalid JSON → refused, file untouched | API | R-15 | |
| **FND-UNIT-001** | `store.serialize()` determinism (key order, nulls, indent, UTF-8) | UNIT | R-02 | Basis for byte-identical round trip |
| **FND-UNIT-002** | `check_invariants()`: one test per rule | UNIT | R-01 | 7 rules (AD-18) |
| **FND-UNIT-003** | Harness guard: accepts only paths under `$TMPDIR/bookvie-e2e/`; refuses `~/bookvie-data`, paths inside it, symlinks resolving into it, and a missing `--data-dir` | UNIT | R-06 | e2e isolation (Oleg, 2026-10-29) |
| **CAT-API-004** | Finished on → back-filled Reading (`startDate: null`); on a Book with an active/paused Reading adds a past Reading, current untouched | API | R-09, R-01 | |
| **CAT-API-006** | Edit Pages below current page / highest card-note page → 409 with specific code; finished Readings keep `finishedPages` | API | R-09 | AD-11 |
| **CAT-API-007** | Delete Book → Readings + Card notes gone; all pointers cleared in the same commit | API | R-01 | AD-18 |
| **CAT-E2E-001** | Label contract: every label and role from EXPERIENCE.md, `exact: true`; "Title" ≠ Subtitle | E2E | R-05 | Only E2E sees the a11y tree |
| **CAT-E2E-002** | UJ-1 agent flow: New book → fill by labels → Add book → status "Added *Title*." → Search titles finds "*Title* by…" | E2E | R-05 | |
| **CAT-E2E-003** | Duplicate: alertdialog "Possible duplicate", panel inert; Don't add keeps fields; Add anyway saves | E2E | R-05, R-08 | |
| **CAT-E2E-005** | Couldn't save on Add book (routed 503) → exact alert, panel open, all values kept | E2E | R-05, R-12 | |
| **RDG-API-001** | `start-reading` × state matrix → pointers, Reading count, statuses | API | R-01 | Every EXPERIENCE state row |
| **RDG-API-002** | `pause` with/without Up next → displacement rules; `pausedAt` = today | API | R-01 | |
| **RDG-UNIT-001** | `reading_status()` finished/active/paused; `pausedAt` ignored while active | UNIT | R-01 | |
| **RDG-UNIT-002** | Property-based: random intent sequences → invariants hold; ≤ 1 unfinished Reading; Waiting = paused − Up next | UNIT | R-01 | Hypothesis |
| **PRG-API-002** | `update-page` at last page → saved + `reachedLastPage`, Reading stays unfinished | API | R-01 | Only `finish-reading` finishes |
| **PRG-E2E-001** | UJ-2: open → page → Update in ≤ 2 interactions; gauge, "p.N of M", "~N days left" after refetch | E2E | R-17, R-07 | Speed NFR; core loop (SM-1) |
| **FIN-API-001** | Finish Main → `finishDate` + `finishedPages` stored; no Main; Up next suggested | API | R-01 | |
| **FIN-API-002** | Finish non-Main → Main unchanged; removed from Up next/Waiting | API | R-01 | |
| **BKP-API-001** | Export → restore on the rich fixture → byte-identical `library.json` + covers | API | R-02 | FR-23 |
| **BKP-API-003** | Restore refusals (not zip, truncated, no `library.json`, bad schema, invariant violation, missing/undecodable cover, newer version) → data unchanged | API | R-02 | |
| **BKP-API-004** | Malicious archives (`../`, absolute, extra entry, symlink, duplicate name, > 5,000 entries, > 1 GB extracted including headers that understate sizes) → refused, nothing outside `.staging/` | API | R-14 | |
| **BKP-API-005** | Fault during restore apply → current data intact; `.staging/` emptied at startup | API | R-02, R-03 | |

**Total P0:** ~27

### P1 (High)

**Criteria:** core, frequent or complex behaviour with real user reach and limited workaround.

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **FND-API-003** | Cover replace: new immutable name; old deleted only after commit | API | R-03 | |
| **FND-API-006** | Concurrent intents serialized, none lost; export sees consistent snapshot | API | R-03 | AD-4 |
| **FND-API-007** | AD-9 envelope on every refusal; 422 `invalid_fields` lists every field | API | R-05 | |
| **FND-API-008** | Live lock → open URL + exit; dead PID → takeover; SIGTERM waits, removes lock | API | R-13 | Subprocess |
| **FND-API-011** | Migration harness writes `library.vN.bak.json` before rewrite | API | R-15 | |
| **FND-SMOKE-001** | Build → isolated `uv tool install` → start → `/` + SPA fallback | SMOKE | R-06, R-16 | |
| **FND-CHK-001** | `npm run check:api` clean | Static | R-18 | |
| **CAT-API-001** | Missing required fields → 422 listing all; nothing saved | API | R-05 | |
| **CAT-API-002** | Field rules (Pages, Edition, Year, ISBN, Spine color, Finished on) | API | R-09 | Table-driven |
| **CAT-API-005** | Edit Finished on changes latest finish; clearing refused | API | R-09 | |
| **CAT-API-008** | Cover: non-image refused, > 20 MB refused, ≤ 1200 px, from-cover color computed once | API | R-14 | |
| **CAT-API-009** | Duplicate 409 + `confirmDuplicate`; edit checks only on title/author/ISBN change | API | R-08 | |
| **CAT-UNIT-001** | ISBN normalization (hyphens, spaces, 10→13, X) | UNIT | R-08 | |
| **CAT-UNIT-002** | Duplicate match rules (ISBN; title + shared author; `;` author set) | UNIT | R-08 | |
| **CAT-E2E-004** | Validation alert text, `aria-invalid`, described-by, focus first invalid; live regions emptied per press | E2E | R-05 | |
| **CAT-E2E-006** | Delete requires confirmation; Cancel changes nothing | E2E | R-12 | |
| **RDG-API-003** | `set-up-next` displacement; Main can't be Up next | API | R-01 | |
| **RDG-API-004** | Side reads: max 3, no side effects, "Which page?", leave on Main/finish | API | R-01 | Should FR-8 |
| **RDG-API-006** | Waiting order: oldest `pausedAt` first, no cap, Up next excluded | API | R-01 | |
| **RDG-E2E-001** | UJ-3: trade-off + displacement copy → confirm → Home state | E2E | R-01 | |
| **RDG-E2E-002** | Flow 10: Pause via ⋯ → Resume from Waiting, Purpose prefilled | E2E | R-01 | |
| **RDG-E2E-003** | Cancel on Start/Pause confirmations changes nothing | E2E | R-12 | |
| **PRG-API-001** | `update-page` bounds, lower page allowed, `lastProgressUpdate` set | API | R-07 | |
| **PRG-API-003** | Home view: slice rows (Main, Up next, recent finishes, ≤ 3), marker priority, meter | API | R-10 | |
| **PRG-UNIT-001** | Percentage; days left = ceil(left ÷ pace), min 1, hidden rules | UNIT | R-10 | |
| **PRG-E2E-003** | Last page → Finish dialog; Cancel → active at 100%; same-page Update reopens | E2E | R-01 | |
| **FIN-API-003** | Finished on: default today, not future, not before start; no Reading → back-filled | API | R-07 | Fake Clock |
| **PAC-UNIT-001** | Measured pace: inclusive days, same-day = 1, back-filled excluded, none when none | UNIT | R-10, R-07 | |
| **PAC-API-001** | Pages left, Book scope and library scope rules | API | R-10 | |
| **STA-UNIT-001** | Stats: pages in finish period; month/DST edges; back-filled by date; re-reads count; Side reads never | UNIT | R-07, R-10 | |
| **CRD-API-001** | Card note CRUD; text required; page/range in bounds, low→high, single page or range | API | R-09 | |
| **CRD-E2E-001** | Flow 6: add card note from Home → shows in Book detail | E2E | — | Must; Home entry point |
| **BKP-API-002** | Export holds only `library.json` + `covers/`; `local-state.json` excluded; timestamp recorded | API | R-02 | AD-15 |
| **BKP-API-006** | Older-version export migrated then applied | API | R-15 | From v2 |
| **BKP-E2E-001** | Flow 8: Restore → confirm → "Restored." → Home matches | E2E | R-02 | |
| **BKP-E2E-002** | Wrong file → exact refusal copy, nothing changed | E2E | R-02, R-12 | |
| **XUI-E2E-001** | Couldn't save on page field, card note, finish, start, pause, delete → exact alert, input kept | E2E | R-12 | Parametrized |
| **XUI-E2E-002** | Two contexts: intent in A visible in B after focus; refusals also invalidate | E2E | R-11 | Mirrors agent + user (A1) |

**Total P1:** ~38

### P2 (Medium)

**Criteria:** secondary behaviour, narrower reach, acceptable workaround.

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **FND-API-009** | Port held by another process → message names port and `--port` | API | R-13 | |
| **CAT-API-003** | Defaults: edition 1, owned, deterministic curated color, `createdAt` | API | R-09 | TC-6 |
| **CAT-UNIT-003** | Spine color resolution: user > from-cover > curated; re-resolve only on input change | UNIT | — | AD-11 |
| **CAT-E2E-007** | Flow 9 back-fill via Mark finished and via Edit | E2E | R-09 | |
| **RDG-API-005** | Purpose set on start, editable, nullable | API | — | |
| **PRG-E2E-002** | "Last updated N days ago" with fake today; muted styling | E2E | R-07 | |
| **PRG-E2E-004** | Spine accessible names carry status | E2E | R-05 | |
| **FIN-API-004** | Purpose-fulfilled only with Purpose; rating 1–5; both skippable | API | — | Should |
| **FIN-E2E-001** | Finish moment: status copy, plays once, no replay on reload or in other tab | E2E | R-11 | Tone NFR |
| **PAC-E2E-001** | Calculator prefilled with pace; live update; 0/negative/NaN → no result, no error | E2E | R-10 | |
| **PAC-UNIT-002** | Client calculator rounding matches server on shared fixtures | UNIT | R-10 | Tool chosen in framework story |
| **STA-API-001** | Stats view: presets, custom range, per-month bars, All time start, empty range | API | R-10 | |
| **CRD-E2E-002** | Card notes search: across Books / scoped, grouped, highlighted, open in pile | E2E | — | |
| **CRD-E2E-003** | Pile: page order, seeded shuffle, next/prev, jump | E2E | — | TC-6 |
| **ORG-E2E-001** | Sort keys reorder bookcase; filter chips hide; no-match + Clear filters | E2E | — | Should FR-20 |
| **XUI-E2E-003** | No optimistic UI under delayed response | E2E | R-11 | `page.route` delay |
| **XUI-E2E-005** | Empty states (first run, no Main/Up next, Waiting 0/1/many) | E2E | — | |
| **Timing smoke** | Intent + view timings on a 500-Book / 3,000-note fixture | API | R-17 | Report only (no target, Q2) |

**Total P2:** ~18

### P3 (Low)

**Criteria:** cosmetic or rare, minimal impact, easy workaround.

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **FIN-E2E-002** | Reduced motion → instant fill | E2E | — | |
| **STA-E2E-001** | Stats presets render and switch; empty message | E2E | — | |
| **ORG-E2E-002** | Main book cover or placeholder on Home | E2E | — | Should FR-21 |
| **BKP-E2E-003** | "Last export: N days ago" / "No export yet" | E2E | — | |
| **XUI-E2E-004** | Tone: no "!" in rendered copy; no red tokens on error states | E2E | — | |

**Total P3:** ~5

---

## Execution Strategy

**Philosophy:** run everything on every PR if it takes under 15 minutes; defer only what is expensive or long. There's no CI provider yet, so "PR" means the local `check` command run before every push. Playwright runs in parallel (4 workers locally; hundreds of tests fit in 10–15 min on CI), so all functional tests run every time.

### Every push / PR: `check` (target < 10 min)

- pytest UNIT + API (all priorities), Hypothesis at its default example count: under a minute.
- `npm run check:api`.
- Playwright e2e, ~31 scenarios (~50 tests once parametrized), 4 workers, one server per worker: about 3–6 min.

### Nightly

- Not applicable until a CI exists. When `bmad-testarch-ci` runs, the weekly set below can move here.

### Weekly / before release

- FND-SMOKE-001 install smoke (needs a SPA build + `uv tool install`).
- Hypothesis with ≥ 500 examples (`--hypothesis-profile=thorough`).
- Large-fixture timing smoke; optional axe scan.

**Manual:** a quick look in a second browser (Firefox/Safari); the agent cataloging dry run with the real skill on 3 books before each release.

---

## QA Effort Estimate

The builder owns everything; this covers test development only.

| Priority | Count | Effort Range | Notes |
|---|---|---|---|
| Harness (TC-1..6, `check`) | — | ~1–2 days | Builder, worker server fixture, Clock flag, fs seam, guards |
| P0 | ~27 | ~1–1.5 weeks | Fault injection, property tests, contract suite |
| P1 | ~38 | ~1–1.5 weeks | Table-driven API + journey e2e |
| P2 | ~18 | ~2–3 days | |
| P3 | ~5 | ~0.5 day | |
| **Total** | ~88 | **~2–3.5 weeks** (~70–120 h) | Spread across the epics |

**Assumptions:** includes debugging and the `check` command; excludes ongoing maintenance (~10%); the harness is built first.

---

## Implementation Planning Handoff

| Work Item | Owner | Target Milestone | Dependencies/Notes |
|---|---|---|---|
| Test harness: `LibraryBuilder`, worker server fixture, data-dir guard, `check` command | Dev | First story (with the server skeleton) | TC-1, TC-4, TC-5, R-16 |
| `--fake-today` Clock flag + pinned TZ | Dev | Server skeleton | TC-2 |
| fs seam in `store/` | Dev | First persistence story | TC-3 |
| Host/Origin guard + its matrix | Dev | Server skeleton | R-04 |
| Label-contract Playwright suite | Dev | New book panel story | R-05 |
| Deterministic curated palette; injectable shuffle RNG | Dev | Catalog / Card-notes epics | TC-6 |

---

## Tooling & Access

| Tool or Service | Purpose | Access Required | Status |
|---|---|---|---|
| `hypothesis` (Python dev dep) | Property-based invariant tests (RDG-UNIT-002) | None | Approved |
| `pytest-cov` | Coverage evidence (gated targets) | None | Ready |
| `@axe-core/playwright` | A11y scan evidence (report only) | None | Ready |

No access requests.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope | Validation Steps |
|---|---|---|---|
| **External AI cataloging skill** | Drives the New book panel by label | CAT-E2E-001..005 must pass on every change to the panel, Duplicate dialog or Search titles | Contract suite; a label change follows the breaking-change rule (EXPERIENCE.md) |
| **Existing exports (user backups)** | Every future `schemaVersion` must still restore old files | BKP-API-006 + FND-API-011 with checked-in fixture exports per version | Keep one fixture export per released `schemaVersion` |

**Regression strategy:** the whole `check` suite runs before each push. Fixture exports from every released version become permanent regression inputs.

---

## Appendix A: Code Examples & Tagging

**pytest: atomic commit under failure (FND-API-001)**

```python
@pytest.mark.p0
@pytest.mark.parametrize("fail_at", ["write", "fsync", "rename"])
def test_commit_failure_leaves_library_untouched(tmp_data_dir, failing_fs, client_for, fail_at):
    before = (tmp_data_dir / "library.json").read_bytes()
    client = client_for(tmp_data_dir, fs=failing_fs(fail_at))

    res = client.post("/api/intents/add-book", files={"intent": (None, json.dumps(valid_book()))})

    assert res.status_code == 503
    assert res.json()["error"]["kind"] == "couldnt_save"
    assert (tmp_data_dir / "library.json").read_bytes() == before
```

**Playwright: label contract, exact names (CAT-E2E-002)**

```typescript
import { test } from './fixtures'; // worker-scoped bookvie server + LibraryBuilder
import { expect } from '@playwright/test';

test('@P0 @Contract agent adds a book by labels', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'New book', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'New book', exact: true });

  await panel.getByLabel('Title', { exact: true }).fill('The Dispossessed');
  await panel.getByLabel('Pages', { exact: true }).fill('387');
  await panel.getByLabel('Author(s)', { exact: true }).fill('Ursula K. Le Guin');
  await panel.getByLabel('Language', { exact: true }).fill('English');
  await panel.getByLabel('Publisher', { exact: true }).fill('Harper');
  await panel.getByLabel('Type', { exact: true }).selectOption('Paperback');
  await panel.getByRole('button', { name: 'Add book', exact: true }).click();

  await expect(page.getByRole('status')).toHaveText('Added The Dispossessed.');
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('The Dispossessed');
  await expect(page.getByRole('button', { name: /^The Dispossessed by/ })).toBeVisible();
});
```

With `tea_use_playwright_utils` enabled, short API setups inside e2e can use playwright-utils' `apiRequest` fixture to call `POST /api/intents/<verb>` instead of clicking. Larger states use the pre-start `LibraryBuilder`.

**Run by tag:**

```bash
npx playwright test --grep @P0          # e2e P0 only
uv run pytest -m p0                     # pytest P0 only
just check                              # everything (or make check)
```

---

## Appendix B: Knowledge Base References

- `risk-governance.md`: risk scoring
- `test-priorities-matrix.md`: P0–P3 criteria
- `test-levels-framework.md`: level selection, duplicate-coverage guard
- `test-quality.md`: Definition of Done (no hard waits, < 1.5 min, self-cleaning, parallel-safe)
- `nfr-criteria.md`, `adr-quality-readiness-checklist.md`: NFR planning

---

**Generated by:** BMad TEA Agent · **Workflow:** `bmad-testarch-test-design` · **Version:** 4.0 (BMad v6)
