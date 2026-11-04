---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-04'
storyId: '2.2'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-2-2-restore-my-library-from-an-export.md (incl. Review Findings and Triage Log)
  - _bmad-output/implementation-artifacts/deferred-work.md (story 2.2 entries)
  - _bmad-output/test-artifacts/atdd-checklist-2-2-restore-my-library-from-an-export.md
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/restore.py, store/restore.py, store/store.py (replace_all, empty_staging, _remove_tree)
  - backend/tests/test_restore.py, helpers.py (existing coverage)
  - frontend/e2e/restore.spec.ts, frontend/e2e/backup.spec.ts, frontend/e2e/fixtures.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 2.2, Restore my library from an export

The Story 2.1 summary that used to live in this file is in git history (`6c2a9eb`).

**Execution mode:** BMad-Integrated (the story spec with its review findings and triage log, the deferred-work log, and the ATDD checklist).
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were three small API targets in one existing file, and none needed a browser.
**Total tests added:** 3 (API 3). Backend 844 → 847, all green, coverage gate OK. E2E unchanged.
**Browser exploration:** skipped. No E2E target was selected.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 2.2 already covers the 10 ATDD leaves, every refusal the triage log patched (#4–#7, #40–#43, #45, #56), the commit-fault rollback, the lock, and the E2E follow-ups. I found the gaps with a branch-coverage run (`--cov-branch`) over `intents/restore.py`, `store/restore.py` and `store/store.py`:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | A write fault on a later cover, before the commit, was never run. `replace_all`'s pre-commit `except BaseException: undo()` had no test. | `store.py` 505–507 uncovered. The only rollback test faults at the `library.json` commit, which runs `_commit_and_swap`'s undo instead. If that `undo()` were dropped, orphan covers would be left in `covers/` and the 503 "nothing changed" would be untrue until the next startup sweep. | API | P1 |
| G2 | An existing same-named cover that can't be read | `store.py` 501–502 uncovered. The `OSError` → `CouldntSave` → 503 mapping, plus the rollback of covers written earlier, had no test. | API | P2 |
| G3 | A `.staging/` leftover that can't be deleted (the state AC-10 leaves behind) | `store/restore.py` 90–91 and `store.py` 543 uncovered. The next restore must refuse with 503 and change nothing. A regression that ignored the failed pre-unpack cleanup would unpack over stale files. | API | P2 |

**Not selected:**
- `intents/restore.py` 83–85, `InvariantViolation` → 500. `load_library` already checks invariants, so the branch is defensive. Triage rejected it as "dead".
- Staging write faults (`store/restore.py` 58–59, 65–66, 82–83, 116–117, 127–128). Triage #37 says these writes bypass the `FileSystem` seam and Story 2.3 owns the fault tests.
- `covers/` mkdir failure and `empty_staging` on a symlinked or missing `.staging`. These need hand-made data-folder tampering (triage #14/#53).
- E2E: the four ATDD leaves and every reachable follow-up are already in `restore.spec.ts`. AC-4 already restores a real export into a fresh server. The browser half of AC-10 stays deferred because it needs a fault seam under the e2e server.

## Tests Added (`backend/tests/test_restore.py`)

1. **`test_a_fault_writing_a_later_cover_removes_the_covers_already_written`** (P1, G1). The rich export has two covers, written in name order. `_FailingCoverWrite`, a `RecordingFs` subclass, fails Piranesi's rename. The response is 503 `couldnt_save`. The seam log shows Dune's cover replaced and then removed. `library.json` and `covers/` are byte-identical, `.staging/` is empty, and the catalog still shows the old library.
2. **`test_an_unreadable_same_named_cover_is_503_and_removes_the_covers_already_written`** (P2, G2). A `chmod 000` file at Piranesi's name, placed after startup, gives 503 and the log line `couldn't save: can't read covers/<name>`. Dune's cover, written first, is removed again. Skipped under root, like the other `chmod` tests.
3. **`test_a_staging_leftover_that_cannot_be_deleted_is_503_and_changes_nothing`** (P2, G3). This is a `.staging/library.json` that `FaultyFs("remove")` can't delete. The response is 503, with `can't empty .staging/` and the `finally` cleanup's `couldn't delete .staging/library.json` logged. Nothing changes and the leftover stays. The next start sweeps it, and the restore then succeeds.

## Validation

- `npm run check:py`: 847 passed. The gate shows domain 100% and intents+store 96.89%, up from 95.52% (`store.py` 93% → 95%).
- Mutation check: removing `undo()` from `replace_all`'s pre-commit `except` fails tests 1 and 2. Making the pre-unpack `empty_staging()` quiet fails test 3. The source was restored afterwards (`git diff backend/bookvie/` is empty).
- `ruff check` is clean.
- Quality: no hard waits, and each test uses its own `tmp_path`. Assertions are explicit in the test body, and fault injection goes through the existing seam (`FaultyFs`, `RecordingFs`). Files that startup's sweep would remove are placed after `api_client` starts, and each test says so in a comment.

## Assumptions and Risks

- G3 pins today's behaviour: after a failed cleanup that keeps failing, every restore answers 503 until the next restart. That is safe because nothing changes, and it matches AC-10's "startup sweeps it". If quieter handling is wanted, test 3 is the place to change it.
- The browser half of AC-10 stays deferred (deferred-work.md, 2026-11-04).

## Next Steps

- Commit: `git add backend/tests/test_restore.py _bmad-output/test-artifacts/automation-summary.md && git commit -m "test: expand automation coverage for restoring from an export (story 2.2)"`
- Optional: `bmad-testarch-trace` for Epic 2 once 2.3 lands. 2.3's refusal and limit tests can reuse `_zip`, `_FailingCoverWrite` and `FaultyFs`.
