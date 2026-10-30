# e2e suite

Playwright tests against a real `bookvie`, built from this checkout. Run them from the repo root:

```bash
npm run check:e2e              # builds the SPA, then runs the suite
npm --prefix frontend run e2e  # runs the suite against the last build
npm --prefix frontend run e2e -- e2e/shell.spec.ts   # one file
```

Node 24 or newer (see `.nvmrc`) and `uv` on `PATH` are required. `npm install` at the root installs Chromium.

## How it works

- **One server per worker.** `fixtures.ts` gives each worker its own `bookvie` on a free port, started with `uv run --project ../backend bookvie --no-browser`. Its data dir is `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`. `baseURL` is that server's URL, so `page.goto('/')` and `request.get('/api/health')` reach it. On teardown the server is stopped, its data dir removed, and the fixture fails if the server wrote anything to stdout.
- **One folder per run.** `global-setup.ts` creates `<run-id>` and exports `BOOKVIE_E2E_RUN_ID`. `global-teardown.ts` removes it.
- **The path guard.** `guard.ts` (`safeDataDir`) runs before every spawn and every seed. It accepts a data dir only when it is strictly inside `$TMPDIR/bookvie-e2e`, after resolving symlinks, and always refuses `~/bookvie-data` in any spelling. Never bypass it. `guard.spec.ts` covers it.
- **Seeding.** `seedLibrary(dataDir, partial)` writes `library.json` through the backend's `LibraryBuilder` (`python -m tests.builder`): give a partial camelCase library and every missing field gets a deterministic default. Seed before starting a server on that folder with `startServer(dataDir, { port: await freePort() })`, and `stop()` it in `finally` (see `seed.spec.ts`). The test fixture `seededServer(partial)` does all of this in one call: it seeds a fresh folder, starts a server, and after the test stops it, removes the folder and fails the test if the server wrote to stdout (see `new-book-panel.spec.ts`).
- **Dev mode.** `test.use({ serverDev: true })` starts the worker's server with `--dev`, so the Vite origin is allowed (see `dev-proxy.spec.ts`).

## Conventions

- Import `test` and `expect` from `./fixtures.ts`, never from `@playwright/test`. Worker fixtures are lazy: a test that doesn't ask for `server` doesn't start one.
- Locate by role and accessible name (`getByRole('heading', { name: 'Catalog' })`). The UI's labels are part of the Agent Label Contract, so tests that find elements by them also check that contract.
- Wait on conditions, never on the clock: web-first assertions (`await expect(locator).toBeVisible()`), not `waitForTimeout`. The TEA hook below blocks hard waits and `.only`.
- Give every test its own data. Use the worker's server for read-only checks, and a seeded per-test server under the run folder when a test needs specific library contents.

## Config and artifacts

`playwright.config.ts` sets a 60 s test timeout, 15 s per action, 30 s per navigation and 10 s for `expect`. In CI (`CI` set) it adds 2 retries and 2 workers, and fails on `.only`.

A failing test keeps a trace, a screenshot and a video in `test-results/`. Reports go to `playwright-report/` (HTML) and `test-results/junit.xml`. Both folders are gitignored. To inspect a failure:

```bash
npx --prefix frontend playwright show-report frontend/playwright-report
npx --prefix frontend playwright show-trace frontend/test-results/<test>/trace.zip
```

## Write-time enforcement (TEA hook)

`.claude/hooks/tea-enforce.cjs`, registered in `.claude/settings.json`, checks test files when Claude Code writes them. Its scope is set in `.tea/enforce-config.json` (`testGlobs`: `frontend/e2e/**/*.spec.{ts,js}` and `backend/tests/**/test_*.py`). It blocks focused tests (C2), tautological assertions (C3), hard waits (H1) and files over 1000 lines (H5), and warns on disabled tests (C1). The rules and their severities come from `bmad-testarch-test-review/steps-c/criteria-registry.md`, not from the hook. Don't edit the hook: `hookSha256` flags a modified copy. To turn a rule off, add its id to `disabledRules` and give the reason in the commit message.

## Troubleshooting

- **`BOOKVIE_E2E_RUN_ID is not set`**: the suite was started without `playwright.config.ts`. Run it through `npm --prefix frontend run e2e`.
- **`bookvie never answered health`** or **`exited (code 1)`**: the error includes the server's stderr. Check that `uv` works (`uv run --project backend bookvie --help`) and that the SPA was built (`npm run build`).
- **`e2e guard: refusing data dir ...`**: a test passed a data dir outside `$TMPDIR/bookvie-e2e`. Build paths with `runDir(process.env.BOOKVIE_E2E_RUN_ID!)`.
- **Leftover folders after a crash**: remove `$TMPDIR/bookvie-e2e/`. Nothing else is written.
