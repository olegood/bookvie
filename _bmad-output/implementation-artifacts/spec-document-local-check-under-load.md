---
title: 'Document running the local check and burn-in under machine load'
type: 'chore'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In Epic 1, machine load caused most failed local runs, not logic (retro PL-1). At load averages of 12–33, `npm run check` took up to 49 minutes, focus assertions and health checks timed out, and one session died when the Mac went to sleep. On a quiet machine the same suite passed all 162 e2e tests. `docs/ci.md` says nothing about this. Epic 1 retro action item 10.

**Approach:** Add a section to `docs/ci.md` under "Running it locally": check the load first; on a quiet machine run `npm run check` (and burn-in) kept awake; when load is high, run the steps by hand with Playwright workers capped. Include the exact commands, and a troubleshooting entry for timeouts under load. Docs only; no script or config changes.

</frozen-after-approval>

## Implementation Notes

- **`docs/ci.md`**: added a "Machine load" subsection under "Running it locally" (check `uptime` against the core count; `caffeinate -i`; quiet vs busy; the capped commands for check and burn-in), and a troubleshooting entry that points to it.
- **Threshold:** busy means a 1-minute load average above half the core count. PL-1's failures were at 12–33 on a 14-core Mac, and Playwright's default is one worker per two logical cores; that rule flags all of them. Cap is 4 workers, from the PL-1 command Oleg gave when assigning the retro items (not in the retro file itself): about half the default 7, and twice CI's 2.
- **Burn-in under load:** `npm run e2e:burn-in -- --workers=4` would pass the flag to `e2e-count.mjs`, not Playwright, so the doc spells out the capped burn-in by hand. `e2e-count.mjs` doesn't need `--workers` (it only lists tests).
- `frontend/e2e/README.md`: the Config paragraph now says local runs have no retries and links to Machine load.
- **Verified:** ran the documented busy-machine check chain (`caffeinate -i sh -c '…'`, 4 workers) at a load average of 11–15 on a 14-core Mac: exit 0 in 1:22, 162 e2e passed, smoke ok. `node scripts/e2e-count.mjs` afterwards found `frontend/test-results/junit.xml` (discovered 162, executed 162), so the capped burn-in chain's count step reads the right report. The 10x burn-in itself was not run.

## Review Triage Log

- Capped commands never run: medium. Patched by running the documented check chain and `e2e-count.mjs` (see Implementation Notes).
- Hand-copied commands will drift from `package.json`: low and cheap. Patched with a "mirror these scripts" line. A `PW_WORKERS` env var in `playwright.config.ts` would remove the copies; it's a config change outside this docs item, so rejected for now.
- `caffeinate -i` covers only the first command of a `&&` chain: medium. Patched: both blocks are wrapped in `caffeinate -i sh -c '…'`.
- Keep-awake has no Linux equivalent: low and cheap. Patched (`systemd-inhibit --what=sleep`).
- The 4-worker cap's cited source isn't in the retro: low. True: it came from Oleg's PL-1 command in the session. Note corrected. Scaling the cap with load was rejected: one fixed command is simpler to follow, and the doc says to lower it if timeouts persist.
- Threshold flags loads of 8–9 that passed: low. Being "busy" only caps workers, which is harmless at those loads. Rejected. Efficiency-core note: rejected, too fine-grained.
- Single `uptime` check before a long run: low. Rejected; the troubleshooting entry already sends a timeout back to the load check.
- Spec status and sprint-status still open: false. The finalize step sets both in this commit.
- `context: []` despite depending on the retro: low. The Intent names the retro and PL-1. Rejected.
- `frontend/e2e/README.md` and `README.md` don't point to the section: low and cheap. Patched in the e2e README, which covers timeouts. `README.md` just links to `docs/ci.md`. Rejected.
- Doc text vaguer than the spec (no 162): low and cheap. Patched.
