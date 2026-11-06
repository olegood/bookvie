# CI

`.github/workflows/test.yml` runs the four steps of `npm run check` as separate GitHub Actions jobs, plus a Playwright burn-in. Every job calls the npm script you run locally, so a red job reproduces with that script.

## Jobs

| Job | Runs | When |
| --- | --- | --- |
| Lint (check:api) | `npm run check:api`: API contract diff, `prettier --check`, `tsc -b`, oxlint, the `src/api` unit tests and the contract drift test | every run; the other jobs wait for it |
| Backend (check:py) | `npm run check:py`: `ruff format --check` and `ruff check`, then pytest with the 90% `domain` and 80% `intents`+`store` coverage gates | every run |
| E2E (shard 1/1) | `npm run build`, the Playwright suite, then `scripts/e2e-count.mjs` | every run |
| Install smoke (check:smoke) | `npm run check:smoke`: `uv tool install` into a temp dir, start, fetch the SPA | every run |
| Burn-in (e2e x10) | `npm run e2e:burn-in`: every e2e test 10 times with retries off | pull requests, Sundays 02:00 UTC, manual runs |
| CI gate | writes the run summary; fails unless all four checks passed and burn-in passed or was skipped | every run |

Triggers: pushes to `master`, pull requests into `master`, the weekly schedule, and **Run workflow** (`workflow_dispatch`). A new push to a PR cancels that PR's previous run; pushes to `master` always run to the end.

Setup is shared through `.github/actions/setup`: Node from `.nvmrc`, uv 0.13.6 with Python 3.14, the npm and uv caches, and, for e2e and burn-in, Chromium via the root `npm ci` postinstall plus `playwright install-deps chromium`. Actions are pinned to commit SHAs, with the release tag in a comment.

## Quality gates

- **Every test must pass.** The suite has no P0/P1 tags yet, so the gate is stricter than a priority split: a single failure fails the run. Playwright still retries a failing test twice in CI (`retries: CI ? 2 : 0`), so one flaky failure doesn't block a merge; burn-in is what catches the flake.
- **Every discovered test must run.** `scripts/e2e-count.mjs` lists the tests Playwright finds for the same arguments and compares that count with the JUnit report (`tests - skipped`). A skipped test, or a suite that quietly stopped running part of itself, fails the job.
- **Burn-in has no retries.** `--repeat-each=10 --retries=0` runs each test 10 times; a test that only passes on retry fails. The whole suite takes about 20 s this way, so no changed-spec selection is used (it would also miss backend changes, which e2e tests depend on).
- **Coverage gates** come from `backend/scripts/coverage_gate.py`, unchanged.
- **One required check.** In branch protection for `master`, require **CI gate** rather than each job.

## Artifacts

| Artifact | Contents | Uploaded |
| --- | --- | --- |
| `backend-coverage` | `backend/.coverage.json` | always |
| `e2e-<n>` | `frontend/playwright-report/` and `frontend/test-results/` (trace, screenshot, video, `junit.xml`) | on failure |
| `burn-in-failures` | same folders, from the burn-in run | on failure |

Retention is 14 days. The CI gate's run summary links to them. To open a downloaded report or trace:

```bash
npx --prefix frontend playwright show-report <artifact>/playwright-report
npx --prefix frontend playwright show-trace <artifact>/test-results/<test>/trace.zip
```

## Secrets and notifications

No secrets are needed: the pipeline only reads the repo, and its token is limited to `permissions: contents: read`. Failure notifications are GitHub's own (email or the GitHub app for the person who triggered the run, per your notification settings).

## Running it locally

```bash
npm run check          # all four checks, as the CI jobs run them
npm run e2e:burn-in    # the burn-in job
CI=1 npm --prefix frontend run e2e   # the e2e suite with CI settings (2 workers, 2 retries, forbidOnly)
```

### Machine load

Run the full check and burn-in on a quiet machine. Locally, Playwright starts a worker for every two logical cores (7 on a 14-core Mac), and retries are off (`retries: CI ? 2 : 0`), so a test that times out under load fails the run. In Epic 1, most failed local runs came from load, not from the code: at load averages of 12–33, `npm run check` took up to 49 minutes, focus assertions and the server health check timed out, and a run died when the Mac went to sleep. On a quiet machine, the full suite (162 e2e tests at the end of Epic 1) passed first time.

1. **Check the load first.** Run `uptime` and compare the 1-minute load average with the core count (`sysctl -n hw.ncpu` on macOS, `nproc` on Linux). If the load is above half the core count, treat the machine as busy.
2. **Keep the machine awake.** On macOS, prefix the run with `caffeinate -i`, for example `caffeinate -i npm run check`. A prefix covers only one command, so wrap a `&&` chain in `sh -c`, as below. On Linux, use `systemd-inhibit --what=sleep` the same way. Don't let the laptop sleep or close its lid mid-run.
3. **Quiet machine:** run `npm run check` and `npm run e2e:burn-in` as usual.
4. **Busy machine:** run the steps by hand with Playwright capped at 4 workers. Extra arguments to `npm run check` or `e2e:burn-in` don't reach Playwright, so call it directly. These blocks mirror the `check` and `e2e:burn-in` scripts in `package.json`; change them together:

   ```bash
   caffeinate -i sh -c 'npm run check:py && npm run check:api && npm run build &&
     (cd frontend && TZ=Europe/Madrid npx playwright test --workers=4) &&
     npm run check:smoke'

   # burn-in, capped
   caffeinate -i sh -c 'npm run build &&
     (cd frontend && TZ=Europe/Madrid npx playwright test --repeat-each=10 --retries=0 --workers=4) &&
     node scripts/e2e-count.mjs --repeat-each=10'
   ```

   If tests still time out, stop the other load, or lower `--workers` further, rather than raising timeouts or adding retries.

## Scaling

- **Sharding.** The suite runs in seconds, so the e2e matrix has one shard (`"1/1"`). When a shard passes about 5 minutes, change the matrix to `["1/2", "2/2"]`. The count check already takes the same `--shard`.
- **Burn-in time.** If burn-in grows past about 10 minutes, select changed specs (Playwright's `--only-changed=origin/master`) instead of the whole suite.

## Troubleshooting

- **`e2e-count: executed count does not match`**: a test was skipped (`test.skip`, `test.fixme`) or didn't run. Remove the skip, or delete the test.
- **Local timeouts in focus assertions or the server health check, or a very slow `npm run check`**: usually machine load, not a bug. Check `uptime` and follow [Machine load](#machine-load) before debugging the test.
- **Passes locally, fails in CI**: run `CI=1 npm --prefix frontend run e2e` to get CI's worker and retry settings, then open the failure's trace from the `e2e-<n>` artifact.
- **Burn-in fails, E2E passes**: the test is flaky. The `burn-in-failures` artifact has the trace of the failing repetition. See [`frontend/e2e/README.md`](../frontend/e2e/README.md) for the suite's conventions.
- **Chromium missing or cache stale**: the browser cache is keyed on `frontend/package-lock.json`. Bumping Playwright changes the key, and the next run downloads the matching browser.
