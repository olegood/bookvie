---
stepsCompleted: ['step-01-preflight', 'step-02-generate-pipeline', 'step-03-configure-quality-gates', 'step-04-validate-and-summary']
lastStep: 'step-04-validate-and-summary'
lastSaved: '2026-10-30'
---

# CI pipeline setup: bookvie

## Step 1: Preflight

- Git repo with remote `origin` → `github.com/olegood/bookvie` (public, default branch `master`).
- `test_stack_type`: **fullstack** (auto). Backend: pytest + Hypothesis via `backend/pyproject.toml` (Python 3.14, uv). Frontend: Playwright 1.64 (`frontend/playwright.config.ts`), Vite.
- `test_framework`: Playwright (e2e) + pytest (backend).
- Local run: `npm run check` passed (check:py, check:api, 29 e2e tests, smoke) in ~17 s.
- `ci_platform`: **github-actions**, inferred from the GitHub remote; no existing CI config.
- Environment: Node 24 (`.nvmrc`), npm lockfiles at root and `frontend/`; Python 3.14, `backend/uv.lock`; uv 0.13.6 locally.
- TEA flags: `tea_use_playwright_utils: false` (package not installed), `tea_use_pactjs_utils: false`, no contract tests present.

## Step 2: Pipeline

- Execution mode: auto; ran sequentially because the output is one workflow plus one composite action.
- Files: `.github/workflows/test.yml`, `.github/actions/setup/action.yml` (Node, uv + Python, npm/uv/Playwright caches, Chromium with system deps).
- Stages: lint (`check:api`) → backend (`check:py`), e2e (sharded matrix, `1/1`), smoke (`check:smoke`) → burn-in (PR / weekly / manual) → CI gate (summary + single required status).
- Actions pinned by SHA: checkout v7.0.1, setup-node v7.1.0, cache v6.1.0, upload-artifact v7.0.2, setup-uv v10.3.3.
- Security: `permissions: contents: read`; no `inputs.*` or `github.event.*` in `run:`; job results and run URL passed through `env:`.
- Validated: actionlint clean; `--shard=1/1` (29 passed) and `--repeat-each=10 --retries=0` (290 passed, ~21 s) run locally.

## Step 3: Quality gates

- Burn-in: whole e2e suite x10, retries off (`npm run e2e:burn-in`). No changed-spec selection: the suite is ~3 s and backend changes would escape `--only-changed`.
- Count reconciliation: `scripts/e2e-count.mjs` compares `playwright test --list` with the JUnit `tests - skipped`, in both e2e and burn-in. Verified pass (29/29, 290/290) and fail (29 vs 290).
- Pass rate: 100% for all tests (no P0/P1 tags exist yet); Playwright CI retries 2; coverage gates unchanged.
- Notifications: GitHub's built-in run notifications; the CI gate summary links to the run's artifacts. No Slack/email integration (solo project, no secrets).

## Step 4: Validation and summary

Checklist outcome:

- Met: config at the platform path, valid syntax, stack-correct commands and browser install, Node from `.nvmrc`, fail-fast off, burn-in x10 on PR + cron with failure artifacts, npm/uv/browser caching keyed on lockfiles, unique artifact names, retries 2, timeouts ≤ 30 min, no secrets, docs with troubleshooting and badge.
- Deliberate deviations:
  - 1 shard instead of 4: suite runs in ~3 s; scaling note in `docs/ci.md`.
  - No `scripts/ci-local.sh` / `test-changed.sh` / `burn-in.sh`: `npm run check` and `npm run e2e:burn-in` are the local equivalents.
  - No separate `docs/ci-secrets-checklist.md`: no secrets required (stated in `docs/ci.md`).
  - Playwright browser cache has no restore-keys: an older browser would not match the pinned Playwright.
  - Retention 14 days instead of 30; backend coverage uploads on every run (small, useful on success).
- Not yet verified: first run on GitHub (needs commit + push), cache hits, and job timings.

Next: push and open a PR to trigger the first run; then require **CI gate** in `master` branch protection.
