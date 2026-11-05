---
title: 'Pin TZ for servers spawned by Playwright'
type: 'bugfix'
created: '2026-11-05'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The CI E2E job (run 42099788891) fails 3 tests on every retry: `start-reading.spec.ts:115` (AC-2), `:152` (AC-5), and `update-page.spec.ts:115` (AC-2). `lastProgressUpdate` comes back as 12:00Z instead of 11:00Z. `FakeClock.now()` (`backend/bookvie/domain/clock.py:38`) returns local noon in the server process's own zone. `SERVER_NOW` (`frontend/e2e/home.ts:13`) assumes that zone is Europe/Madrid. Only the `TZ=Europe/Madrid` prefix on the root `check:e2e`/`e2e:burn-in` scripts pins the zone, and CI (`.github/workflows/test.yml:76`) runs `npm --prefix frontend run e2e` directly. So the bookvie servers spawned by `e2e/fixtures.ts` run in UTC there.

**Approach:** Pin the zone once, in `frontend/playwright.config.ts`, so the result no longer depends on how Playwright is started. Add `const TZ = 'Europe/Madrid'` and set `process.env.TZ = TZ` at the top level. Add a comment saying the servers and the seeding `spawnSync` in `e2e/fixtures.ts` inherit `process.env`, and that `SERVER_NOW` in `e2e/home.ts` assumes FakeClock's local noon is in this zone. Use `timezoneId: TZ` and update the comment next to it, which currently mentions "the zone check:e2e pins". Leave `test.yml` and the root `package.json` TZ prefixes unchanged (`check:py` still needs its own).

</frozen-after-approval>

## Implementation Notes

- Changed only `frontend/playwright.config.ts`. Reproduced the 3 failures with `TZ=UTC npm --prefix frontend run e2e -- e2e/start-reading.spec.ts e2e/update-page.spec.ts` before the fix. After it: that command gives 35 passed, `TZ=UTC npm --prefix frontend run e2e` gives 262 passed, `npm run check:e2e` gives 262 passed, and `npm run check:api` passes.

## Review Triage Log

- Root `TZ=` prefixes on check:e2e/e2e:burn-in are now redundant: low, rejected. The user decided to keep them, and they are harmless.
- No guard asserting the pin took effect: false. The SERVER_NOW assertions in start-reading/update-page fail loudly when the zone is wrong; that is how this bug surfaced.
- TZ constant not shared with e2e modules: low, rejected. This is a refactor beyond the fix; specs hardcode fixed offsets for fixed dates on purpose.
- Comment omits the runner's own local-time math (`backup.spec.ts:31` localNoonDaysAgo uses setHours): low, patched by naming it in the comment.
- SERVER_NOW offset depends on the date, not only the zone: false. `home.ts:11` already notes "CET: DST ended on 25 October".
- `test.yml:58` comment calls the job "check:e2e" though it runs Playwright directly: low, deferred. This is pre-existing, and the user said not to touch test.yml.
- Mutating process.env on config load is a side effect: low, rejected. It is intentional, and the comment explains why.
