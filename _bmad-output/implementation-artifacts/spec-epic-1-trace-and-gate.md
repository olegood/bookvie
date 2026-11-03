---
title: 'Epic 1 trace and quality gate against TR7'
type: 'chore'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No epic-level trace or gate exists for Epic 1 (F-S1). The only trace covers story 1.9, with a P1 target of 90%, while TR7 requires P0 = 100% and P1 ≥ 95% (`epics.md:154`). The ATDD checklists for 1.6-1.8 were never ticked, though the work shipped (F-S6). Epic 1 retro action item 1. It runs last, so the trace covers the tests that items 3, 5 and 8 added.

**Approach:** Run `bmad-testarch-trace` with gate type epic over Epic 1. The oracle is the Epic-1-scoped `test-design-qa.md` scenarios, since TR7 states its percentages against them; story ACs come in through the ATDD checklists. Gate against TR7. Record the decision, tick or retire every stale checklist line, update the retro's TR7 row if it changes, and set item 1 to done.

</frozen-after-approval>

## Implementation Notes

- **Outputs:** in `_bmad-output/test-artifacts/traceability/`: `epic-1-traceability-matrix.md`, `epic-1-e2e-trace-summary.json` and `epic-1-gate-decision.json`. That is the configured `trace_output` folder, so the story 1.9 `traceability-matrix.md` and `gate-decision.json` stay as they were.
- **Gate:** PASS at `06014dc`. P0 15/15, P1 17/17, P2 4/4; 149 unique tests mapped. TR7's other clauses hold too: every error code has an API test, `check:api` is clean, and coverage is domain 100% / intents+store 98.67%.
- **Gap found and closed:** at `7b768a0`, FND-UNIT-003's "refuses a missing `--data-dir`" had no test, so P0 was 93% and the gate FAIL. The code already refused it. Oleg chose to add the tests and re-gate: `06014dc` adds three tests in `frontend/e2e/guard.spec.ts` and `server-fixture.spec.ts`, as a separate test-only commit.
- **Run:** the load average was 11.1 on 14 cores, so the full check ran capped at 4 Playwright workers per `docs/ci.md` → Machine load. It exited 0 at `7b768a0`: 756 pytest, 139 unit, 162 e2e, smoke ok. The two changed specs then passed at `06014dc`.
- **Checklists (F-S6):** 113 stale lines; 101 ticked with `path:line` evidence and 12 retired with reasons. Three sub-agents did the reconciliation; all 185 pointers were checked mechanically and a sample was checked by hand. Two generous ticks became retirements: `useNow` recompute (1-6) and rotation after a delete (1-7).
- **Deferred:** three new entries in `deferred-work.md`: F-R4 rotation (the retro deferred it but never recorded it), the on-load animation guard, and an add with every optional field through the panel.
- **Retro:** the TR7 row changes from "partly" to "yes". The verdict stays `accepted-with-open-items`, because item 9 is still open until just before Epic 3.

## Review Triage Log

- Trace output location differs from the workflow default (`traceability-matrix.md`): intended. The default would overwrite the story 1.9 trace; the config's `trace_output` names the folder used.
- Gate uses a 95% P1 target, not the workflow's 90%: intended (TR7).
- XUI-E2E-003 (no optimistic UI) has no delayed-response e2e: recorded as out of scope (R-11, the Epic 4 gate), not counted.
