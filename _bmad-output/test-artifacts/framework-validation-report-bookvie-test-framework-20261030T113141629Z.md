---
validation_scope: bookvie-test-framework
run_timestamp: 20261030T113141629Z
validated_artifacts:
  - frontend/playwright.config.ts
  - frontend/e2e/fixtures.ts
  - frontend/e2e/guard.ts
  - frontend/e2e/global-setup.ts
  - frontend/e2e/global-teardown.ts
  - frontend/e2e/shell.spec.ts
  - frontend/e2e/seed.spec.ts
  - frontend/e2e/server-fixture.spec.ts
  - frontend/e2e/dev-proxy.spec.ts
  - frontend/e2e/guard.spec.ts
  - frontend/package.json
  - backend/pyproject.toml
  - backend/tests/conftest.py
  - backend/tests/builder.py
  - backend/scripts/coverage_gate.py
  - package.json
status: COMPLETE
---

# Test Framework Validation Report: bookvie

**Checklist:** `.claude/skills/bmad-testarch-framework/checklist.md`
**Validated by:** Murat (Master Test Architect), for Oleg
**Date:** 2026-10-30
**Frameworks:** Playwright 1.64 (e2e, Chromium) and pytest 9 with pytest-cov and Hypothesis (backend)

## Verdict

**PASS WITH WARNINGS (CONCERNS).** The framework works and is well built: 317 pytest tests and 29 Playwright tests pass, the type check and lint are clean, and `npm run check` ties everything together. The checklist was written for a greenfield scaffold, so many items assume a layout (`tests/support/`, faker factories, `.env.example`) that bookvie replaced with deliberate, documented alternatives. Those count as **PASS (deviation)**.

The real gaps are configuration hardening and TEA tooling that was never installed:

| # | Gap | Severity |
|---|-----|----------|
| G1 | `playwright.config.ts` sets no trace, screenshot or video, so a failing test leaves no artifacts | WARN (high value) |
| G2 | Console reporter only (`list`); no HTML or JUnit report for CI or debugging | WARN |
| G3 | No CI-specific `retries`/`workers`, and no explicit action, navigation or expect timeouts | WARN |
| G4 | Node version not pinned (`.nvmrc` or `engines`); this machine runs Node v26.12.1 | WARN |
| G5 | TEA write-time enforcement hook not installed (`.claude/hooks/tea-enforce.cjs`, `.tea/enforce-config.json`, `.claude/settings.json`) | FAIL (tooling) |
| G6 | `tea_use_playwright_utils: true` but `@seontechnologies/playwright-utils` is not used | FAIL (config mandate) |
| G7 | No `tests/README.md`-style test guide; running instructions live only in the root README | WARN |
| G8 | `StarletteDeprecationWarning`: `starlette.testclient` with `httpx` is deprecated in favour of `httpx2` | WARN |
| G9 | Three specs import `test` from `@playwright/test` while the rest use `./fixtures.ts` | INFO |

No critical issues and no blockers.

---

## Section Results

### Prerequisites: PASS (with one expected FAIL)

| Item | Result | Evidence |
|------|--------|----------|
| Valid project manifest | PASS | root `package.json`, `frontend/package.json`, `backend/pyproject.toml` |
| No conflicting framework | FAIL (expected) | The framework already exists; this is a validation, not a scaffold |
| Project type identifiable | PASS | React 19 SPA + FastAPI (Python 3.14) |
| Bundler identifiable | PASS | Vite 8 (`frontend/vite.config.ts`) |
| Write permissions | PASS | Report written |

### Process Step 1 (Preflight): PASS
Stack detected as `fullstack`. Manifests read. Architecture docs found (`_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md`, test design under `_bmad-output/test-artifacts/`). The "no conflicts" item is N/A for validation.

### Process Step 2 (Framework Selection): PASS
Playwright (frontend) and pytest (backend) match `config.test_framework: auto` and the architecture's stack. The rationale is in the README stack line and the test design docs.

### Process Step 3 (Directory Structure): PASS (deviation)
- There is no `tests/support/` tree. E2E lives in `frontend/e2e/` with helpers next to the specs (`fixtures.ts`, `guard.ts`). Backend tests live in `backend/tests/` with `conftest.py` and `builder.py`.
- The checklist itself says organization is flexible. For a suite of this size (6 specs) a `support/` split adds nothing yet. **Recommendation:** move to `e2e/support/` once the suite has more than one fixture module or page objects.

### Process Step 4 (Configuration Files): WARN
| Item | Result | Evidence / note |
|------|--------|-----------------|
| Config file created, TypeScript | PASS | `frontend/playwright.config.ts` |
| Timeouts (action 15s, nav 30s, test 60s) | WARN | None set; Playwright defaults apply (test 30s, no action/nav limit). Fixture timeouts are explicit (`START_TIMEOUT_MS + STOP_TIMEOUT_MS`). **G3** |
| Base URL with env fallback | PASS (deviation) | `baseURL` comes from the worker-scoped `server` fixture, which starts a server per worker. This is stronger than an env var, because it gives isolated data per worker. |
| Trace / screenshot / video on failure | WARN | Not configured. **G1** |
| Multiple reporters (HTML + JUnit + console) | WARN | `reporter: 'list'` only. **G2** |
| Parallel execution | PASS | Default worker parallelism across files; per-worker servers make it safe. `fullyParallel` is not set (tests within a file run serially), which is acceptable. |
| CI settings (retries, workers) | WARN | Only `forbidOnly: !!process.env.CI`. **G3** |
| Config compiles | PASS | `tsc -b` is clean |

### Process Step 5 (Environment Configuration): WARN
- `.env.example`, `TEST_ENV`, `BASE_URL`, `API_URL`: **N/A**. Nothing in the suite reads env config except `BOOKVIE_E2E_RUN_ID` (set by global setup) and `CI`. bookvie is a single-user, local-only app with no remote environments.
- Auth and feature-flag variables: **N/A**. There is no auth and there are no flags.
- `.nvmrc`: **WARN**. It's missing, and neither package.json has `engines`. **G4**

### Process Step 6 (Fixture Architecture): PASS
- `test = base.extend<{}, WorkerFixtures>` is typed and worker-scoped (`server`, `serverDev` option), and overrides `baseURL`.
- Auto-cleanup: the server is stopped, its data dir removed and its stdout asserted empty on teardown. Global teardown removes the run folder.
- Pure helpers (`startServer`, `seedLibrary`, `freePort`, `safeDataDir`) are exported and reused directly by specs. This matches the "pure function → fixture" half of `fixture-architecture.md`.
- `mergeTests`: **N/A** while there is a single fixture module.
- Safety beyond the checklist: the path guard (`guard.ts`, FND-UNIT-003) refuses `~/bookvie-data` in every spelling (symlinks, case, `..`), and is covered by 20+ tests.

### Process Step 7 (Data Factories): PASS (deviation)
- The factory is `LibraryBuilder` (`backend/tests/builder.py`), shared by pytest (the `library_builder` fixture) and Playwright (`seedLibrary` → `python -m tests.builder`). One source of truth across both stacks.
- It uses **deterministic** defaults instead of `@faker-js/faker`. That's a deliberate improvement: reproducible timestamps and colours, and overrides name only what the test cares about (`data-factories.md`).
- Cleanup goes through data-dir removal rather than per-entity `cleanup()`, which fits a file-backed store.

### Process Step 8 (Sample Tests): PASS (deviation)
- Real specs instead of `example.spec.ts`. `shell.spec.ts` uses the fixture; `seed.spec.ts` shows factory usage.
- Selectors: `getByRole(...)` instead of `data-testid`. Accessible-role locators are the more resilient choice (`selector-resilience.md`) and fit the Agent Label Contract.
- Given-When-Then: not written as comments, but the test names state the behaviour. INFO.
- Network interception: **N/A** so far. Specs use a real backend.

### Process Step 9 (Helper Utilities): PASS
API access goes through Playwright's `request` and `fetch`. No network mocking or auth is needed yet. Helpers are functional and give descriptive errors (stderr attached to startup failures).

### Process Step 10 (Documentation): WARN
The root `README.md` covers setup (`npm install`), running (`npm run check`, the per-step scripts), the e2e architecture (per-worker server, data dir under `$TMPDIR/bookvie-e2e/<run-id>/`) and the safety guarantees. There is no test guide with sections for best practices, CI, knowledge-base references and troubleshooting. **G7**

### Process Step 11 (Build & Test Scripts): PASS
`frontend`: `e2e`. Root: `check`, `check:py`, `check:api`, `check:e2e`, `check:smoke`. The `postinstall` script installs Chromium. Dependencies and types are present.

### Process Step 12 (Write-Time Enforcement Hook): FAIL
`.claude/hooks/tea-enforce.cjs`, `.tea/enforce-config.json` and `.claude/settings.json` don't exist. **G5**. If installed, the globs must cover the detected stacks: `frontend/e2e/**/*.spec.ts` and `backend/tests/**/*.py`.

### Output Validation, Configuration: PASS
The config loads, `tsc -b` and `oxlint` are clean, paths resolve (`testDir: 'e2e'`, setup/teardown). `test-results/` and `playwright-report/` are already in `.gitignore`.

### Output Validation, Test Execution: PASS (with WARN)
| Run | Result |
|-----|--------|
| `uv run pytest` (backend) | 317 passed, 1 warning in 8.6s |
| `npm --prefix frontend run check:api` | clean |
| `npm run check:e2e` | build OK, 29 passed in 2.9s |

- Artifacts on failure: not produced (**G1**). Report file: none (**G2**).
- Warning: `StarletteDeprecationWarning` from `fastapi/testclient.py`, which asks for `httpx2` instead of `httpx`. **G8**

### Output Validation, Directory Structure: PASS
Conventional and free of duplicates: `frontend/e2e/`, `backend/tests/`.

### Output Validation, File Integrity: PASS
Syntax is valid, imports resolve, no TODO/FIXME, no credentials, and `node:path` is used for paths.

### Quality Checks, Code Quality: PASS
Types are strict, with no stray `any` in e2e. Lint is clean, the style is consistent, and comments explain intent.

### Quality Checks, Best Practices: PASS (with notes)
- Fixture pattern and auto-cleanup: PASS.
- Network-before-navigate: N/A (no interception yet).
- Selectors: role-based (see Step 8). PASS (deviation).
- Artifacts captured only on failure: **WARN**, nothing is captured at all (**G1**).
- No hard waits: PASS. The only `setTimeout`s are the 100 ms health-poll interval inside a deadline loop and the SIGKILL escalation timer, both in fixture code. No `waitForTimeout` in specs.
- Import consistency: `guard.spec.ts`, `seed.spec.ts` and `server-fixture.spec.ts` import `test` from `@playwright/test`. They don't need the `server` fixture, and worker fixtures are lazy, so importing from `./fixtures.ts` would cost nothing and keep one entry point. **G9** (INFO)

### Quality Checks, Playwright Utils Scaffold: FAIL
`tea_use_playwright_utils: true` in `_bmad/tea/config.yaml`, but the package is not installed and there are no `merged-fixtures.ts` or `network-error-monitor`. **G6**. Auth-fixture items are N/A (no auth). **Decision needed:** adopt playwright-utils (`network-error-monitor` and `interceptNetworkCall` are most useful once the UI calls the API), or set `tea_use_playwright_utils: false` so the TEA workflows stop requiring it.

### Quality Checks, Knowledge Base Alignment: PASS (partial)
- `fixture-architecture.md`: aligned.
- `data-factories.md`: aligned (overrides, seeding).
- `test-quality.md`: aligned (isolation, determinism, fast runs).
- `network-first.md`: N/A so far.
- `playwright-config.md`: partial (G1–G3).
- `playwright-utils-mandate.md`: not met (G6).

### Quality Checks, Pact Consumer CDC: N/A
`tea_use_pactjs_utils: true`, but frontend and backend ship together from one repo and one wheel. The contract is already enforced by OpenAPI-generated types (`openapi-typescript`) plus the `check:api` drift check. A Pact broker would add infrastructure without lowering any risk. **Recommendation:** set `tea_use_pactjs_utils: false` for this project.

### Quality Checks, Security: PASS
No credentials or secrets, and no `.env` is needed. The real-library protection is defence in depth: pytest's autouse `_isolated_home` sets a temp `HOME`, the e2e `safeDataDir` guard runs before every spawn, and `tests.builder` refuses `~/bookvie-data`.

### Integration Points: PASS (with notes)
- Status file: framework setup is recorded in the story 1.3 spec and README, not in a "Quality & Testing Progress" section. INFO.
- Knowledge base: the relevant fragments were identified from `tea-index.csv` (fixture-architecture, data-factories, playwright-config, network-first, test-quality, playwright-utils-mandate).
- Downstream workflows: compatible with `ci` (scripts exist; no CI pipeline yet, since there's no `.github/`), `test-design` (already done), `atdd` and `automate`.

### Version Compatibility: WARN
Playwright 1.64 works on Node v26.12.1 and TypeScript 5.9 matches the tooling. Python is pinned (`>=3.14,<3.15`). Node is not pinned (**G4**).

---

## Completion Criteria

| Criterion | Status |
|-----------|--------|
| Prerequisites passed | PASS (conflict item N/A for validation) |
| Process steps complete | PASS except Step 12 (hook) |
| Output validations | PASS |
| Quality checks | PASS except Playwright Utils (G6) |
| Integration points | PASS |
| Sample tests execute | PASS |
| Test command runs cleanly | PASS (`npm run check:e2e`, `uv run pytest`) |
| Documentation complete | WARN (G7) |
| No critical issues or blockers | PASS |

## Recommended Actions (priority order)

1. **G1–G3, config hardening (small, high value).** In `playwright.config.ts`: `use: { trace: 'retain-on-failure-and-retries', screenshot: 'only-on-failure', video: 'retain-on-failure', actionTimeout: 15_000, navigationTimeout: 30_000 }`, `expect: { timeout: 10_000 }`, `retries: process.env.CI ? 2 : 0`, `workers: process.env.CI ? 2 : undefined`, and reporters `[['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]`.
2. **Decide on the TEA flags (G6, Pact N/A).** Either adopt `@seontechnologies/playwright-utils` or set `tea_use_playwright_utils: false`. Set `tea_use_pactjs_utils: false`.
3. **G4.** Add `.nvmrc` and `engines.node` matching the Node version you support.
4. **G8.** Track the `httpx2` migration in `deferred-work.md`, or filter the warning on purpose in `[tool.pytest.ini_options]`.
5. **G5.** Install the TEA enforcement hook if you want write-time rule checks.
6. **G7, G9.** Add a short `frontend/e2e/README.md` (patterns, guard, troubleshooting) and make all specs import `test` from `./fixtures.ts`.

The edits in items 1, 3, 6 and 2 (playwright-utils) can go through **[E] Edit** mode of this workflow. Run `bmad-testarch-ci` next to add a CI pipeline.
