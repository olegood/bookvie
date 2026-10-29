---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-29'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-1-scaffold-and-install-bookvie.md
  - _bmad-output/implementation-artifacts/epic-1-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md
  - _bmad-output/planning-artifacts/epics.md (Story 1.1)
  - _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (Stack)
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad/tea/config.yaml
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 1.1, Scaffold and install bookvie

**Execution mode:** BMad-Integrated (story spec + epic ACs + system test design)
**Detected stack:** fullstack, run scoped to **backend** (see Assumptions)
**Subagent execution:** SEQUENTIAL (4 small targets; parallel workers would cost more than they save)
**Playwright Utils mandate:** not applicable (no Playwright tests generated)
**Pact.js Utils mandate:** not applicable (no contract testing in this repo)
**Total tests added:** 40 (suite 37 → 77, all green; 5 burn-in runs, ~1.2 s each)

## Baseline

The story shipped with 37 pytest tests at 99 % line coverage (`cli.py:101`, the `__main__` guard, is the only miss). Every I/O-matrix row, the CLI flags and the layer direction were already covered. The gaps were acceptance criteria that no test checked, plus `hatch_build.py`, which is not counted by coverage at all.

## Coverage Plan by Test Level and Priority

| Target (AC / constraint) | Level | Priority | Tests | File |
|---|---|---|---|---|
| Every dependency stays inside the Spine → Stack series (declared range and locked version) | Unit (static contract) | P1 | 36 | `backend/tests/test_stack_pins.py` (new) |
| The built SPA ships in the wheel; the build hook refuses a wheel without it | Integration (real `uv build`) | P1 | 2 | `backend/tests/test_wheel_build.py` (new) |
| Vite dev proxy sends `/api` and `/media` to the CLI's `HOST:DEFAULT_PORT`, dev server on :5173 | Unit (static contract) | P2 | 1 | `backend/tests/test_packaging.py` (updated) |
| "Logs go to stderr only": startup writes nothing to stdout | Unit | P2 | 1 | `backend/tests/test_cli.py` (updated) |

| Level | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| Unit | 0 | 36 | 2 | 0 | 38 |
| Integration | 0 | 2 | 0 | 0 | 2 |
| **Total** | 0 | 38 | 2 | 0 | **40** |

Scope: **selective**. Only ACs with no automated check got tests. Story 1.1 carries no P0 risk; FND-API-005 (bind 127.0.0.1) is already asserted in `test_cli.py`.

## Files Created/Updated

### Created
- `backend/tests/test_stack_pins.py`: parses the Stack table in ARCHITECTURE-SPINE.md, so the Spine stays the single source of truth. It fails if a Spine row is not mapped to a manifest entry, if a Python specifier admits the next or the previous series, if an npm range is not `~X.Y.` or `^X.`, or if `uv.lock` or `package-lock.json` resolves outside the series.
- `backend/tests/test_wheel_build.py`: builds real wheels with `uv build` from a copy of `backend/` that sits under the repo `.gitignore`. Each build takes about 0.5 s. Skips only when `uv` is not on PATH.

### Updated
- `backend/tests/test_packaging.py`: adds `test_vite_dev_proxy_targets_the_cli_server`.
- `backend/tests/test_cli.py`: adds `test_start_writes_nothing_to_stdout`.

No fixtures, factories or conftest were needed. The tests reuse the existing `fake_server` and `opened` fixtures, plus `tmp_path`.

## Validation

- **Mutation check.** Each new test was run against a deliberately broken source and failed:
  - `fastapi<0.164` and `react ^19.3.1` failed the pin tests.
  - Disabling the hook guard failed the refusal test.
  - Moving the proxy to :8000 failed the proxy test.
  - Sending the banner to stdout failed the stdout test.
- **Burn-in.** 5 full-suite runs, 77 passed each time, no flakes.
- **Isolation.** All writes go to `tmp_path`. No test touches `~/bookvie-data`.
- **Quality checklist.**
  - No hard waits, no conditionals in test bodies, no committed skips.
  - Assertions sit in the test bodies, and the remaining skips each name the condition they wait for.
  - Priority lives in this summary, not in `[P1]` tags, because the existing suite uses none.

## Key Assumptions and Risks

1. **Frontend is out of scope for this run.** `frontend/` has no `playwright.config.ts` or unit runner. The spec's Never list puts e2e fixtures, the smoke test and `npm run check` in Story 1.3. These frontend ACs stay unautomated until then:
   - `tsc -b` passes and reports 5.9.x
   - React Router library mode
   - one CSS Module per component over `tokens.css`
   - frontend directory layout
   - the frontend calls the server only through `src/api/`
2. **The `artifacts` rule is not load-bearing today (finding).** I removed `artifacts = ["bookvie/http/static/**"]` and built the real `backend/`. The wheel still contained `static/`, because hatchling 1.33 does not apply the repo-root `.gitignore` pattern `backend/bookvie/http/static/` to this build. `test_packaging.py::test_wheel_ships_the_served_folder` asserts the config line exists. `test_wheel_build.py` asserts the outcome. Either way the SPA ships, but the rule would only matter if someone added a `backend/.gitignore`. Worth a one-line note in the spec, or nothing.
3. **`~/bookvie-data` exists on this machine.** It was created empty at 2026-10-29 18:06, before this run. Story 1.1 verification says never to create it. No current test creates it (`test_defaults` points `HOME` at `tmp_path`). Most likely a manual `bookvie` run during development created it. Delete it if it was not intentional. FND-UNIT-003 (Story 1.3) will guard this for e2e.
4. **The wheel build test needs uv.** It also needs hatchling 1.33 in the uv cache, or network access. It is offline-safe once the cache is warm.
5. **Deferred work is unchanged.** The build → isolated install → `GET /` smoke test (FND-SMOKE-001) still belongs to Story 1.3. `test_wheel_build.py` covers the build half, not install or serve.

## Next Recommended Workflow

- `bmad-testarch-test-review` on `backend/tests/`, or `bmad-testarch-trace` for Story 1.1 to record AC → test mapping and a gate decision.
- Story 1.3 picks up the frontend checks listed in Assumption 1 and FND-SMOKE-001.
