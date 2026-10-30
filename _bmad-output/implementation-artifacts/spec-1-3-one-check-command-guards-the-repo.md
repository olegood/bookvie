---
title: 'Story 1.3: One check command guards the repo'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '65ba966a8d928d2e8691424794e7380132d8eeed'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no single command that proves the repo is healthy. Pytest, the frontend checks, browser tests and the install are run by hand, there are no coverage gates, and nothing stops a test from touching `~/bookvie-data`.

**Approach:** The root `npm run check` chains `check:py` (pytest plus a per-package coverage gate), `check:api`, `check:e2e` (Playwright with a worker-scoped `bookvie` fixture behind a data-dir path guard) and `check:smoke` (build, isolated `uv tool install`, start, `GET /`). Each step runs only if the one before it passed.

## Boundaries & Constraints

**Always:** Every server a check starts uses `--no-browser`, a free port and a data dir under a temp root. E2E data dirs are `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`. Smoke runs with its own `HOME`, `UV_TOOL_DIR` and `UV_TOOL_BIN_DIR`, and reuses the real uv cache and Python install dir so it needs no network. Coverage gates: ≥ 90% line on `bookvie/domain/`, ≥ 80% on `bookvie/intents/` + `bookvie/store/` combined. A package with 0 statements passes. Servers write nothing to stdout.

**Never:** No `TZ` pin or `--fake-today` (Story 1.4). No OpenAPI generate-and-diff (Story 1.5); for now `check:api` runs the frontend type check and lint, and 1.5 adds the diff in front. No CI provider, no pre-push hook. No `data-testid`. No change to app behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All green | `npm run check` | Four steps in order, exit 0 | N/A |
| Step fails | Any step exits non-zero | Later steps don't run, `check` exits non-zero | N/A |
| Coverage low | `domain/` 89%, or `intents/`+`store/` 79% | `check:py` fails and names the package group and its % | N/A |
| Empty packages | 0 statements | Passes | N/A |
| Guard: temp | `<root>/<run>/worker-0` | Accepted | N/A |
| Guard: outside | `/tmp/x`, `<root>` itself, `<root>/../x`, a symlink out of the root | Throws before any spawn | Test fails with the path named |
| Guard: real library | `~/bookvie-data` or a path inside it | Always throws, even if a test sets the root to `~` | Same |
| Server dies | The fixture's `bookvie` exits before health answers | Fixture fails with the captured stderr | N/A |
| Smoke | Built SPA, isolated install | `GET /` and `GET /catalog/x` return the HTML with `<div id="root">` | Exits non-zero, temp dirs removed |

</frozen-after-approval>

## Code Map

- `package.json` -- root scripts (`postinstall`, `build`, `dev`). Add `check` and the four `check:*`.
- `frontend/package.json` -- has `build` (`tsc -b && vite build`) and `lint` (oxlint). `@playwright/test` 1.64 is installed, and Chromium is in `~/Library/Caches/ms-playwright`. Add `check:api` and `e2e`.
- `frontend/e2e/.gitkeep` -- empty e2e folder; replace it.
- `frontend/vite.config.ts` -- `strictPort` 5173, proxy target `http://127.0.0.1:8765` with `changeOrigin: true`. Leave it unchanged. The proxy test overrides the port and target through Vite's `createServer` inline config, which deep-merges, so `changeOrigin` still comes from the file.
- `backend/bookvie/cli.py` -- `main(argv)`. Default data dir `~/bookvie-data`. `python -m bookvie.cli` works.
- `backend/tests/test_instance.py:401-440` -- `_launch` plus a real-process test that already uses `HOME=tmp`. Reuse this pattern for the outbound test.
- `backend/hatch_build.py` -- refuses a non-editable wheel without `static/index.html`, so smoke must build first.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- Stories 1.1 (smoke) and 1.2 (Vite proxy end to end) deferred work to this story; both are done here.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `check` = `npm run check:py && npm run check:api && npm run check:e2e && npm run check:smoke`. `check:py` = pytest `--cov=bookvie --cov-report=term --cov-report=json:backend/.coverage.json`, then the gate script. `check:api` = `npm --prefix frontend run check:api`. `check:e2e` = `npm run build && npm --prefix frontend run e2e`. `check:smoke` = `node scripts/smoke.mjs`.
- [x] `backend/scripts/coverage_gate.py` -- reads the coverage JSON, sums statements and covered lines per group by path segments `bookvie/domain/...`, prints each group's %, and exits 1 below a threshold. Groups with 0 statements pass.
- [x] `backend/tests/test_coverage_gate.py` -- the coverage matrix rows, using fixture JSON in `tmp_path`.
- [x] `backend/tests/conftest.py` -- an autouse fixture sets `HOME` to a temp dir, so a default `--data-dir` can never reach the real library.
- [x] `backend/tests/test_instance.py` -- the real-process test also asserts the server's stdout is empty. A new test launches the server with a `sys.addaudithook` that reports any `socket.connect` to a non-loopback address, sends health and `/` requests, sends SIGTERM, and asserts no reports.
- [x] `frontend/package.json` -- `check:api` = `tsc -b && oxlint`. `e2e` = `playwright test`.
- [x] `frontend/playwright.config.ts` -- `testDir: 'e2e'`, Chromium, a `globalSetup` that sets `BOOKVIE_E2E_RUN_ID`, and a `globalTeardown` that removes that run's folder.
- [x] `frontend/e2e/guard.ts` -- `e2eRoot()` and `safeDataDir(dir, root)`: realpath-resolve and require `dir` strictly inside `root`. Always refuse `~/bookvie-data` and anything inside it.
- [x] `frontend/e2e/fixtures.ts` -- a worker-scoped `server` fixture: get a free port, guard the data dir, spawn `uv run --project ../backend bookvie --no-browser --port <p> --data-dir <d>` (adding `--dev` when the worker option `serverDev` is true), poll `/api/health` until it answers with this `dataDir`, and override `baseURL`. Teardown sends SIGTERM, waits, asserts stdout was empty, and removes the dir.
- [x] `frontend/e2e/guard.spec.ts` (FND-UNIT-003), `shell.spec.ts` (`/` shows heading "Catalog"; an unknown path falls back to the SPA), `dev-proxy.spec.ts` (with `serverDev`, starts Vite on a free port proxying to the fixture; `GET /api/health` through Vite answers 200).
- [x] `scripts/smoke.mjs` -- FND-SMOKE-001: `npm run build`; `uv tool install --reinstall ./backend` with the isolated env vars; start `<UV_TOOL_BIN_DIR>/bookvie` on a temp data dir and a free port; wait for health; check both `GET`s; SIGTERM; assert stdout is empty; remove the temp dirs in `finally`.
- [x] `README.md` -- the Tests paragraph points to `npm run check` and its four steps. Update the status line.

**Acceptance Criteria:**
- Given the repo root, when `npm run check` runs, then it exits 0 and `~/bookvie-data` is neither created nor modified (compare `ls -la` and recursive mtimes before and after).
- Given a failing `check:py`, when `npm run check` runs, then `check:api`, `check:e2e` and `check:smoke` do not run.
- Given the Playwright suite with 2 workers, when it runs, then each worker gets its own port and data dir under `$TMPDIR/bookvie-e2e/<run-id>/`.

## Implementation Notes

- `check:py` runs from `backend/` (`cd backend && uv run pytest ...`): from the repo root pytest finds no config and would also collect tests under `.claude/skills`.
- Added `frontend/e2e/server-fixture.spec.ts` (the "Server dies" row and guard-before-spawn) and a `check` order test in `backend/tests/test_packaging.py`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind | No step installs Chromium; `check:e2e` fails on a fresh clone | medium | `postinstall` only runs `npm --prefix frontend ci`; README never mentions `playwright install`. | patch |
| 2 | blind, edge | `startServer` adds an `exit` listener on every poll | low | `exited(child)` is called inside the loop; a normal start polls more than 10 times. Direct correction. | patch |
| 3 | blind | Pipe deadlock in `test_instance.py` real-process tests | low | The `stderr.read()` in the assert message runs only after the process exited; >64 KB of stderr in a short test is not plausible. | reject |
| 4 | blind, verification-gap, edge | Audit hook watches only `socket.connect`; DNS lookups and UDP `sendto` go unreported | low | Confirmed: `_AUDIT` returns early on every other event. Adding two events is a direct widening. | patch |
| 5 | blind, verification-gap, edge | Coverage gate passes 0/0 when nothing under a gated package was measured | medium | The real report lists `bookvie/{domain,intents,store}/__init__.py`, so "no file matched" means mis-measurement; today that passes silently. The malformed-report traceback part is low and loud. | patch |
| 6 | blind | `npm run check` builds the frontend 2-3 times | low | The spec has `check:e2e` and `check:smoke` each build; changing it is a spec edit. | reject |
| 7 | blind, edge | Smoke ignores the shutdown exit status, never checks lock removal or `HOME`, and a non-JSON 200 health body throws a bare `SyntaxError` | medium | `smoke.mjs` only rejects SIGKILL; `JSON.parse` is outside the `.catch`. Direct corrections. | patch |
| 8 | blind | `conftest.py` keeps `XDG_*`; the e2e server runs with the real `HOME` | low | The data dir is explicit and guarded; bookvie reads `~` only for the default data dir. The fix adds env plumbing. | reject |
| 9 | blind | Crashed e2e runs leave `$TMPDIR/bookvie-e2e/<run>` behind | low | Temp dir only; cleanup logic adds surface. | reject |
| 10 | blind | Hard-coded `/tmp` paths in guard and fixture specs | low | They are refused for the intended reason (outside the root); a pre-existing `/tmp/bookvie-e2e-should-not-exist` is unlikely. | reject |
| 11 | blind, verification-gap | The `check` order test matches source text | low | It fails loudly on a harmless edit, never silently. | reject |
| 12 | blind | `check:api` name doesn't match its contents | false | Spec decision: Story 1.5 adds the contract diff to this step. | reject |
| 13 | blind | Spec and sprint status missing from the reviewed diff | false | Excluded from the review diff on purpose. | reject |
| 14 | blind | Playwright config has no `workers`/`trace`/`outputDir`; `forbidOnly` uses an unset `CI` | low | No named failure; the fixture-timeout part is #16. | reject |
| 15 | verification-gap | The "symlink to the real library" guard test passes via the dangling-symlink branch when `~/bookvie-data` doesn't exist | medium | Pre-verified: `toThrow(link)` also matches the dangling-symlink message. | patch (test) |
| 16 | edge | The worker fixture uses Playwright's default 30 s fixture timeout while `START_TIMEOUT_MS` is 60 s | medium | A slow first `uv run` sync aborts the fixture before `stop()`, orphaning the server. One fixture option fixes it. | patch |
| 17 | edge | SIGKILL hits the `uv run` wrapper, orphaning bookvie | low | Needs bookvie to ignore SIGTERM for 15 s; process-group handling adds machinery. | reject |
| 18 | edge | `freePort` releases the port before bookvie or Vite binds; workers can collide | low | OS ephemeral ports are not reused at once; a retry loop adds surface. | reject |
| 19 | edge | A dangling `~/bookvie-data` symlink makes every e2e run fail | low | Loud failure on a state bookvie never creates. | reject |
| 20 | edge | Smoke health `JSON.parse` on a non-JSON 200 | low | Same root cause as #7. | patch (with #7) |
| 21 | edge | Smoke ignores a non-zero exit on shutdown | medium | Same as #7. | patch (with #7) |
| 22 | edge | Smoke port race | low | Same as #18. | reject |
| 23 | edge | Audit hook misses `sendto`/`getaddrinfo` | low | Same as #4. | patch (with #4) |
| 24 | edge | Temp `HOME` in `conftest.py` drops a user `~/.config/uv/uv.toml` | low | No such file here (only `uv-receipt.json`); the fix adds more pinning. | reject |
| 25 | edge | Coverage gates pass vacuously | medium | Same as #5. | patch (with #5) |
| 26 | edge (claim) | Smoke isn't forced `--offline` although the spec says it needs no network | low | A warm cache makes it work offline; `--offline` would break a cold first run. | reject |
| 27 | edge (claim) | A separate port per worker isn't guaranteed | low | Same as #18. | reject |
| 28 | verification-gap (other) | No test runs the gate on a real pytest-cov report | low | Covered by #5: the real run fails when no gated file matches. | patch (with #5) |

## Design Notes

The guard runs before any spawn and also inside the fixture, so a test can't skip it. Refusing `~/bookvie-data` is a separate check from "inside the root", so a wrong root can never allow the real library. `check:e2e` builds first because the fixture's server serves the built SPA.

## Verification

**Commands:**
- `npm run check` -- expected: four steps in order, exit 0.
- `npm run check:py` with `bookvie/domain/_probe.py` holding an untested function -- expected: exit 1 naming `domain`. Then delete the file.
