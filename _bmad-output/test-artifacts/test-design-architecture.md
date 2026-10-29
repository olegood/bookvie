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
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/reviews/review-adversarial.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md
---

# Test Design for Architecture: bookvie MVP

**Purpose:** The architectural concerns, testability gaps and NFR requirements that the build must address before test development starts. This is the contract between test design and the architecture spine.

**Date:** 2026-10-29
**Author:** Murat (TEA) for Oleg
**Status:** Reviewed. Decisions recorded 2026-10-29 (see Decisions Log)
**Project:** bookvie
**PRD Reference:** `_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md`
**ADR Reference:** `_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md` (AD-1 to AD-20)

---

## Executive Summary

**Scope:** The whole MVP system: the CLI launcher, the FastAPI server (intents, views, domain, store), the data folder, and the React client. Must FRs, plus the Should FRs that are bound in the spine.

**Business Context** (from PRD):

- **Impact:** A single user and a personal tool. Its value is trust: "the app is the single source of truth for reading progress" (§1). Lost or corrupted data defeats the product.
- **Problem:** The urgency chain loses paused books. bookvie keeps exactly one Main book and keeps every paused Reading visible (SM-3).
- **Launch:** MVP = every Must FR (§6.1). No date set.

**Architecture** (from the spine):

- **AD-1/2/3:** One local process owns `~/bookvie-data/`. One JSON document, written atomically. Every user action is one intent that commits once.
- **AD-6/7:** The server computes every domain number. The client never patches cached state and invalidates all views after each response.
- **AD-16/17:** Loopback only, with a Host/Origin guard and no authentication. The Agent Label Contract is a public interface for unattended AI cataloging.
- **Stack:** Python 3.14 / FastAPI / Pydantic, React 19 / TS 5.9 / Vite, pytest 9, Playwright 1.64.

**Expected Scale:** One user, about 500 Books and a few thousand Card notes, `library.json` up to about 10 MB (spine → Deferred → Performance).

**Risk Summary:**

- **Total risks:** 18
- **High-priority (≥ 6):** 6, all with planned mitigations. **No score-9 risks.**
- **Test effort:** about 88 scenarios, roughly 70–120 h for one developer (see the QA doc).

---

## Quick Guide

### 🚨 BLOCKERS: Decide Before Test Development

These need to land in the first (test-framework / server-skeleton) story. Without them the high-risk tests can't be written cheaply.

1. **TC-1: Fixture seeding path.** A test-only builder that writes a valid `library.json` (via `store.serialize()` + `check_invariants()`) into a temp `--data-dir` before the server starts. No seeding endpoint in the product. (Owner: Dev)
2. **TC-2: Controllable "today" for e2e.** The `Clock` override reaches only pytest today. Need a test-only `--fake-today` (or env var) that feeds `Clock`, accepted only together with `--no-browser`. Pin the server `TZ` and the browser `timezoneId` to the same zone, and have the Playwright fixture set the browser clock (`page.clock`) to the same date it passes as `--fake-today`, because the browser computes its own "today" for relative dates, the pace finish date and Stats presets (AD-20). (Owner: Dev)
3. **TC-3: fs seam in `store/`.** Write, fsync and rename (and cover writes) go through one small injectable interface, so tests can fail each step and prove AD-2/AD-12. (Owner: Dev)
4. **TC-5: Real-library guard.** e2e servers always run with an explicit `--data-dir` under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/` (pytest uses its own `tmp_path`). The harness refuses to start a server on any other path, and always on `~/bookvie-data`. The install smoke test uses an isolated `HOME`, `UV_TOOL_DIR` and `UV_TOOL_BIN_DIR`. (Owner: Dev)

**What we need:** these four items in place before the feature epics start.

### ⚠️ HIGH PRIORITY: Recommendation for Approval

1. **R-01 Reading-state transitions:** add a property-based invariant test (Hypothesis) over random intent sequences, in addition to the per-intent matrix. `hypothesis` approved as a dev dependency. (Main-book epic)
2. **R-04 Cross-site requests:** treat the Host/Origin guard as security-critical and give it its own test matrix in the server-skeleton story. (Server skeleton)
3. **TC-6 Determinism:** curated-palette assignment must be a pure function of document state (no RNG), and Pile shuffle must take an injectable random source. Approved. (Catalog / Card-notes epics)
4. **R-11 Stale confirmation:** accept the residual risk as documented (spine → Deferred). Tests cover invalidation only, not a stale-dialog guard. (Frontend data-layer story)

**Status:** all four approved by Oleg on 2026-10-29.

### 📋 INFO ONLY: Solutions Provided

1. **Test strategy:** rules and numbers tested at pytest UNIT/API level; Playwright e2e only for journeys, the label contract and UI-only behaviour. One install smoke test.
2. **Tooling:** pytest (+ Hypothesis, pytest-cov), FastAPI TestClient, Playwright with worker-scoped servers, `npm run check:api`.
3. **Execution:** no CI, so a single local `check` command runs everything (target under 10 min). Slow checks run weekly or before release.
4. **Coverage:** about 88 scenarios, P0 ≈ 27, P1 ≈ 38, P2 ≈ 18, P3 ≈ 5.
5. **Quality gates:** in the QA doc.

---

## For Architects and Devs: Open Topics 👷

### Risk Assessment

**Total risks identified:** 18 (6 high, 9 medium, 3 low)

#### High-Priority Risks (Score ≥ 6): Immediate Attention

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| **R-01** | **DATA** | Reading-state transitions (Start / Pause / Up next / Finish / Side read) leave wrong pointers or two unfinished Readings. Four independent state parts (EXPERIENCE "Book states"); the adversarial review rated an earlier version Critical (H1). | 2 | 3 | **6** | State × intent matrix + property-based invariants | Dev | Main-book epic |
| **R-02** | **DATA** | Restore loses or corrupts data. FR-23 promises "identical data"; AD-14 promises failure before commit leaves data untouched. | 2 | 3 | **6** | Byte-identical round trip; fault injection per restore phase; bad-archive refusals | Dev | Backup epic |
| **R-03** | **DATA** | Commit not atomic, or cover ordering leaves dangling references (AD-2, AD-12; PRD §5 "no action silently deletes data"). | 2 | 3 | **6** | fs-seam fault injection (TC-3); orphan sweep test | Dev | First persistence story |
| **R-04** | **SEC** | No auth; a web page in the user's browser could POST intents (e.g. `restore`) to the loopback port unless the Host/Origin guard holds (AD-16). | 2 | 3 | **6** | Guard matrix incl. `Origin: null`; bind-address check | Dev | Server skeleton |
| **R-05** | **BUS** | A label rename or substring match silently breaks unattended cataloging, or writes Title into Subtitle (FR-2, AD-17). | 2 | 3 | **6** | Contract-driven Playwright suite with `exact: true` and every outcome signal | Dev | New book panel story |
| **R-06** | **OPS** | Tests or dev runs write to the real `~/bookvie-data` (default `--data-dir`) or clobber the global `bookvie` install. | 2 | 3 | **6** | TC-5 guard; isolated smoke install | Dev | Test framework setup |

#### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-07 | TECH | Date/time errors: local finish dates, inclusive day count, "N days ago", period edges, server vs browser "today" (AD-20) | 2 | 2 | 4 | Fake-Clock boundary tests; TC-2 | Dev |
| R-08 | DATA | Duplicate detection misfires: ISBN-10→13, author set, edit-only-when-changed (FR-3, AD-10) | 2 | 2 | 4 | Table-driven unit + intent tests | Dev |
| R-09 | DATA | FR-1 edit consequences: Pages below current/card-note page, Finished on edit/clear, back-fill beside an active Reading | 2 | 2 | 4 | Intent tests per consequence | Dev |
| R-10 | TECH | Pace/stats numbers wrong: back-filled excluded, library scope, re-reads count, Side reads never (FR-11/15/16) | 2 | 2 | 4 | Domain unit tests; client/server rounding parity | Dev |
| R-11 | TECH | Stale views across tabs; stale confirmation pauses the wrong book (guard deferred; A2) | 2 | 2 | 4 | Two-context e2e on invalidation; residual accepted | Dev |
| R-12 | BUS | Couldn't-save not shown, or input lost; destructive action without confirmation (PRD §5) | 2 | 2 | 4 | Routed-503 e2e per save surface | Dev |
| R-16 | OPS | Suites not run because there is no CI (spine → Deferred) | 2 | 2 | 4 | One local `check` command; optional pre-push hook | Dev |
| R-13 | OPS | Second instance or stale lock → two writers or failed start (AD-5) | 1 | 3 | 3 | Subprocess lock tests | Dev |
| R-14 | SEC | Malicious restore archive or image: traversal, zip bomb, non-image (AD-14, AD-12) | 1 | 3 | 3 | Crafted-archive tests | Dev |
| R-15 | DATA | Migration destroys the only copy (AD-13); no migrations exist at v1 | 1 | 3 | 3 | `.bak`-first harness test | Dev |

#### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | P | I | Score | Action |
|---|---|---|---|---|---|---|
| R-17 | PERF | Catch-up > 2 interactions / 30 s, or full rewrite slow at ~500 Books | 1 | 2 | 2 | Document; interaction-count e2e + timing smoke |
| R-18 | TECH | Generated TS types drift from Pydantic (AD-8) | 1 | 2 | 2 | Document; `check:api` |

#### Risk Category Legend

TECH = architecture/integration · SEC = security · PERF = performance · DATA = data integrity · BUS = user-facing harm · OPS = operations/config

---

### NFR Testability Requirements

| NFR Category | Threshold / Requirement | Current Design Support | Gap / Decision Needed | Planned Evidence |
|---|---|---|---|---|
| Security | Loopback bind; Host/Origin allow-list; restore entry allow-list, no `..`, no symlinks, ≤ 1 GB upload, ≤ 5,000 entries, ≤ 1 GB extracted (counted on bytes written); covers re-decoded, ≤ 20 MB (AD-12/14/16) | Supported | None | pytest guard + crafted-archive results |
| Performance | Catch-up < 30 s, ≤ 2 interactions (PRD §5); sized for ~500 Books / ~10 MB | Partial | No latency target, by decision (Q2) | e2e interaction count; timing log (informational only) |
| Reliability / data integrity | Atomic commit; all-or-nothing intent; serialized writes; single instance; byte-identical round trip; `.bak` before migration | Supported, given TC-3 | fs seam (TC-3) | fault-injection + round-trip results; Hypothesis stats |
| Accessibility | Accessibility Floor + Agent Label Contract; 1.4.10 deviation accepted | Supported | axe scan is report-only (Q4) | label-contract e2e; axe JSON (advisory) |
| Maintainability | pytest covers every FR consequence, refusal code and invariant (spine → Testing); `check:api` clean | Supported | Target: ≥ 90% line `domain/`, ≥ 80% `intents/` + `store/` (Q3) | pytest-cov report; `check:api` output |

**Thresholds:** all resolved (see Decisions Log). Latency and axe are reported, not gated; coverage is gated.

**Assessment boundary:** final PASS/CONCERNS/FAIL belongs to `bmad-testarch-nfr` once implementation evidence exists.

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS**

#### 1. Blockers to Fast Feedback

| Concern | Impact | What Architecture Must Provide | Owner | Timeline |
|---|---|---|---|---|
| **TC-1 No seeding path** | Complex states (paused re-read, 3 Side reads, many Waiting) only reachable through slow UI chains | Pre-start fixture builder via `store.serialize()` + `check_invariants()`; API intent helper for short setups | Dev | Test framework story |
| **TC-2 Uncontrolled "today" in e2e** | Relative copy, "not in the future", This-month stats and Waiting order flake or can't be asserted; browser and server disagree | Test-only `Clock` override flag; pinned TZ | Dev | Server skeleton |
| **TC-3 No forced `couldnt_save`** | AD-2/AD-12 promises unproven | Injectable fs seam in `store/` | Dev | First persistence story |
| **TC-5 Default data dir is the real library** | One careless run corrupts the user's catalog | Dedicated e2e data dir `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/` + harness path guard; isolated smoke install | Dev | Test framework story |

#### 2. Architectural Improvements Needed

1. **TC-4 One server per e2e worker**
   - **Current problem:** fixed default port 8765, one instance per data folder (AD-5), and a Host guard that checks the port.
   - **Required change:** none to the product. The harness starts `bookvie --no-browser --data-dir $TMPDIR/bookvie-e2e/<run-id>/worker-<n> --port <free> --fake-today <date>` per worker and uses `http://127.0.0.1:<port>` as `baseURL`.
   - **Impact if not fixed:** e2e can't run in parallel.
   - **Owner / Timeline:** Dev, test framework story.
2. **TC-6 Deterministic outputs**
   - **Current problem:** curated-palette assignment is deferred and unconstrained; shuffle is random.
   - **Required change:** a pure assignment function and an injectable shuffle RNG.
   - **Impact if not fixed:** spine color and pile tests are flaky or can only assert loosely.
   - **Owner / Timeline:** Dev, Catalog and Card-notes epics.

---

### Testability Assessment Summary

#### What Works Well

- ✅ **Headless by design:** every action is one `POST /api/intents/<verb>` and every number is a server view (AD-3, AD-6), so rules are testable without a browser.
- ✅ **Pure `domain/` with an injected `Clock`** (AD-20) makes rule tests fast and deterministic.
- ✅ **One invariant oracle:** `check_invariants()` runs before every commit (AD-18), which makes property-based testing practical.
- ✅ **Deterministic error surface:** the AD-9 envelope has an enum of codes, and outcomes appear in live regions.
- ✅ **Selectors are specified:** the Agent Label Contract (AD-17) removes the need for test-ids.
- ✅ **No external dependencies:** no network, auth or third parties, so nothing needs mocking.

#### Accepted Trade-offs (No Action Required)

- **No stale-confirmation guard** (A2, spine → Deferred). Single user; revisit if it bites.
- **No authentication on loopback** (AD-16). Mitigated by the Host/Origin guard (R-04).
- **1.4.10 Reflow deviation** (PRD §5). Desktop-only by decision.

---

### Risk Mitigation Plans (High-Priority Risks ≥ 6)

All six are **Planned**, owned by Dev. The scenario detail is in the QA doc.

| Risk | Mitigation steps | Timeline | Verification |
|---|---|---|---|
| **R-01** State transitions | `reading_status()` + every invariant unit-tested; API matrix of lifecycle intent × EXPERIENCE "Book states" row; Hypothesis random intent sequences | Main-book epic | Property test ≥ 500 examples green (weekly) |
| **R-02** Restore | Byte-identical round trip on a fixture with every state + covers; fault at unpack / validate / cover write / commit / cleanup; bad-archive refusals | Backup epic | `library.json` + cover checksums unchanged on every failure case |
| **R-03** Atomic commit | TC-3 seam fails write / fsync / rename and between cover write and commit; startup orphan sweep | First persistence story | Fault-injection tests green |
| **R-04** Cross-site | Guard matrix (bad Host, foreign / `null` Origin, `--dev`); bind-address check | Server skeleton | Matrix green; manual `curl -H 'Origin: https://example.com'` → 403 |
| **R-05** Label contract | Playwright suite driven by the EXPERIENCE.md table, `exact: true`, every outcome signal | New book panel story | A deliberate rename on a scratch branch fails the suite |
| **R-06** Real data dir | Temp-root guard; isolated `HOME` / uv tool dirs for the smoke test | Test framework setup | `~/bookvie-data` mtime unchanged after a full `check` |

---

### Assumptions and Dependencies

#### Assumptions

1. Server and browser share the machine timezone (spine → Dates); tests pin it explicitly.
2. MVP ships at `schemaVersion` 1, so the migration chain is exercised only by a harness test until v2.
3. No dedicated QA; the builder owns every test.

#### Dependencies

1. TC-1, TC-2, TC-3 and TC-5: required before the first feature epic.
2. Q1–Q4: resolved 2026-10-29 (Decisions Log).

#### Risks to Plan

- **Risk:** TC-2 isn't built, so dates have to be seeded relative to real today.
  - **Impact:** midnight-adjacent flakes; some relative-copy assertions are dropped.
  - **Contingency:** seed relative dates and skip runs within 2 minutes of local midnight.

---

### Decisions Log (2026-10-29, Oleg)

| # | Question | Decision |
|---|---|---|
| Q1 | e2e time control | **`--fake-today` flag** feeding `Clock`, accepted only with `--no-browser`; TZ pinned for server and browser |
| Q2 | Latency target | **None.** Timings are reported only (R-17 stays informational) |
| Q3 | Coverage target | **≥ 90% line on `domain/`, ≥ 80% on `intents/` + `store/`** (gated) |
| Q4 | axe scan | **Report only**, not a gate |
| — | Hypothesis | **Approved** as a Python dev dependency |
| — | Curated palette | **Approved:** deterministic assignment from document state, no RNG (TC-6) |
| — | e2e isolation | **e2e never touches the real library.** Each worker runs on its own fresh dir under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`; the harness refuses any other `--data-dir`, and always refuses `~/bookvie-data` |

---

**End of Architecture Document.** Test scenarios, levels, tooling and gates are in `test-design-qa.md`.
