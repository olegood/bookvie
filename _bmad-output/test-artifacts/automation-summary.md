---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-20'
storyId: '12.6'
storyKey: '12-6-let-an-agent-back-up-my-library-to-disk'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-6-let-an-agent-back-up-my-library-to-disk.md (Boundaries, I/O matrix, Review Findings, Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-6 done)
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 12.6 entries)
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/backup_file.py (`write_backup`, `_write_atomic`); backend/bookvie/agent/server.py (`_answer`)
  - backend/tests/test_agent_backup.py; backend/tests/helpers.py (`FaultyFs`, `RecordingLock`); frontend/e2e/agent-backup.spec.ts; frontend/e2e/fixtures.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.6 Let an agent back up my library to disk

## Preflight

- **Stack:** `fullstack` (auto). The story's only browser-side change is the e2e fixture's temporary HOME, which `agent-backup.spec.ts` already covers. Every new test is pytest in `backend/tests/`. No browser session was opened, and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the spec with its review records, the ATDD checklist's ten green-phase follow-ups, and the review's two deferred verification gaps.
- **Order:** this run started after the code review's commit `b7a34c1` landed, with a clean tree and the story `done`.
- **Generation:** sequential, in this session, as for Stories 12.3 to 12.5. It is one Python module at one test level.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` don't apply: the run wrote no Playwright test, and the repo has no Pact artifacts.

## Coverage plan

The build and the review already cover all ten ATDD follow-ups, plus the midnight read (the review's patch). This run added leaves for what was still open.

| Target | Level | Priority | Why |
|---|---|---|---|
| An app with no backups folder refuses before it takes the AD-4 lock (no zip built) | API (MCP tool, `create_app` + `TestClient`) | P2 | It pins the review's reorder. Moving the check back below `build_export` holds the lock for nothing, and turns an unreadable cover into `couldnt_export`. |
| A write step fails and removing the temp file fails too: still `couldnt_save`, nothing committed, and the log names the first fault | API (MCP tool, `connect_mcp`), 4 cases | P2 | The review deferred this gap. `FaultyFs` fails one step only, so no leaf reached the cleanup guard. |

Not automated:
- The HOME a Playwright server started without `home` actually ran with. That needs an observation point no endpoint offers, and it stays deferred in `deferred-work.md`.

## Files

- `backend/tests/test_agent_backup.py`: two leaves and one fs double.
  - `test_an_app_with_no_backups_folder_refuses_before_it_takes_the_lock` (1 test).
  - `test_a_write_failure_whose_cleanup_fails_too_reports_the_first_fault` (4 cases: `write`, `fsync`, `close`, `replace`).
  - `_CleanupFailsFs`: a `FaultyFs` whose `remove` always fails.
- `_bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md`: all ten follow-ups ticked, each with its test.
- `_bmad-output/implementation-artifacts/deferred-work.md`: a `resolved:` line on the double-fault entry.

## Finding while automating

The review's deferred entry said that dropping the guard around `fs.remove(temp)` would turn a double fault into an internal error. It wouldn't. `agent/server.py`'s `_answer` maps any escaping exception to `couldnt_save(500)`, so the agent's answer is the same either way.

The first draft of the leaf asserted only the answer, and the mutation (dropping the guard) survived it. What the guard really keeps is the intent's log line naming the first fault: "couldn't save the backup: can't write … injected <step> fault". The leaf now asserts that line, and the mutation fails all four cases. The `resolved:` line in `deferred-work.md` records the correction.

## Validation

- **New leaves:** `uv run pytest tests/test_agent_backup.py` gave 35 passed. The new leaves, together with the review's midnight leaf (6 tests), ran 10 times in a row with 6 passed each time, at about 0.3 s per run.
- **Mutation checks** (each an edit, a run, and a revert of that same edit; `cmp` against a saved copy confirmed `backup_file.py` was restored):
  - The `backups_dir is None` check moved back below `build_export`: the lock leaf fails.
  - The `try/except` around `fs.remove(temp)` dropped: all four double-fault cases fail.
- **Lint and format:** `ruff check` and `ruff format` are clean on the file.
- **Full check:** `npm run check` exited 0 in this run.
  - pytest: 2135 passed (the review's 2130 plus these 5).
  - Coverage: intents+store 97.62%.
  - Unit tests: 388 passed.
  - e2e: 800 passed.
  - Smoke test: ok.

  No `~/bookvie-backups*` folder exists in the real home afterwards.
- **Checklist:** no CLI or browser session was opened. Temporary scripts stayed in the session scratchpad, not the repo.

## ATDD checklist

All ten green-phase follow-ups are `[x]`, each pointing at its test. Remaining `[ ]` lines: 0 (`grep -cF '[ ]'`).

## Risks and assumptions

- The double-fault leaf leaves a temp file in the test's backups folder, because its removal is the injected failure. pytest's `tmp_path` cleans it up.
- The test suite still never runs a real backup of a large library. The spec's residual risk stands: the first one will be Oleg's.

## Next

- Story 12.6 is complete. Story 12.7 (`summarize-a-book-s-notes-through-the-agent-tools`) is next in Epic 12.
- `bmad-testarch-trace` for Epic 12 comes after its last story (12.8), before the retrospective.
