---
title: 'Every Playwright run builds the SPA first'
type: 'chore'
created: '2026-11-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The e2e servers serve the built SPA from `backend/bookvie/http/static`, but only the root scripts (`check:e2e`, `e2e:burn-in`) build it first. A direct `npm --prefix frontend run e2e` or `npx playwright test` silently tests whatever bundle is on disk. In Epic 3 that happened 3 times (sessions `74c3b1d2`, `eb797eb4` and `26a9638a`; Epic 3 retro PL-2), and once it happened after a failed build. Sprint item: `epic-3-retro-item-27-make-the-e2e-entry-point-build-or-verify`.

**Approach:**
- Playwright's `globalSetup` runs the project's own `vite build` (from `frontend/node_modules/.bin`) before any worker starts. A failed build fails the run with Vite's output.
- The type check is not repeated here, because `check:api` and the root `build` own it.
- The e2e README stops describing a direct run as "against the last build".

</frozen-after-approval>

## Implementation Notes

- Changed:
  - `frontend/e2e/global-setup.ts`: `buildSpa()`, which runs `node_modules/vite/bin/vite.js build` with `process.execPath` before the run folder is made.
  - `frontend/e2e/README.md`: the run commands, "How it works" and the troubleshooting entry.
- The root `check:e2e`, `e2e:burn-in` and CI still run `npm run build` first. That build adds `tsc -b`, so on those paths Vite runs twice (about 0.1 s each), which is intended. A direct run skips the type check; `check:api` owns it.
- Build rather than verify: a full Vite build takes about 0.1 s, and an mtime freshness check would miss deleted files and any changes outside `src/`.
- Verified:
  - With `backend/bookvie/http/static` deleted, `npx playwright test e2e/shell.spec.ts` rebuilt it and passed 3 tests.
  - With a syntax error planted in `src/main.tsx`, the run stopped at setup with "vite build failed (exit 1)". The file was then restored.
  - `playwright test --list` (used by `scripts/e2e-count.mjs`) doesn't run setup.
  - `check:api` passed (199 tests).

## Review Triage Log

Blind Hunter, pass 1. Floor N = 2; it reported 13 findings.

- **Double build on the scripted paths: `low`, kept by design.** The root build adds the type check. The README now says so.
- **Stale troubleshooting line, missing "How it works" note, unclear run-command comments: `low`, patched** in `frontend/e2e/README.md`.
- **`emptyOutDir` empties the static folder under concurrent runs or `--list`: `false` for `--list`, which doesn't run global setup. Concurrent runs: `low`, rejected.** The root scripts already rebuild the same folder, so this is not new.
- **"exit null" on a signal kill: `low`, patched.** The message now names the signal.
- **Raw ENOENT when Vite isn't installed: `low`, patched.** A missing Vite now gives a hint to run `npm install`.
- **Windows `.bin` shim: `low`, patched.** Setup now runs `vite.js` with `process.execPath`.
- **Builds run even for server-less specs, with no opt-out: `low`, rejected.** A build takes about 0.1 s.
- **The spec is unfinished: `false`.** It is finalized here.
- **The type-check tradeoff is unstated: `low`, patched.** It is recorded above.
- **Sprint tracking not updated: `false`.** That is done separately once Oleg confirms.
- **The doc comment overstated the guarantee for UI and watch mode: `low`, patched.**
