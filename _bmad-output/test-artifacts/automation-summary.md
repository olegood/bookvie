---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-04'
storyId: '2.1'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-2-1-export-all-data-with-one-click.md (incl. Review Findings and Triage Log)
  - _bmad-output/implementation-artifacts/deferred-work.md (story 2.1 and spec-refuse-cross-site-simple-gets entries)
  - _bmad-output/test-artifacts/atdd-checklist-2-1-export-all-data-with-one-click.md
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/export.py, store/local_state.py, http/api.py (ExportResponse, /export, /views/backup)
  - backend/tests/test_export.py, test_store.py, test_views.py, test_contract.py, test_guard.py, helpers.py (existing coverage)
  - frontend/e2e/backup.spec.ts, frontend/src/pages/BackupPage.tsx, frontend/src/api/export.test.ts
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

# Automation Summary: Story 2.1, Export all data with one click

The Story 1.13 summary that used to live in this file is in git history (`8e4c1f2`).

**Execution mode:** BMad-Integrated (story spec with its review findings and triage log, the deferred-work log, and the ATDD checklist).
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were three small API targets in one existing file, and none needed a browser.
**Total tests added:** 4 (API 4: 3 functions, one parametrized ×2). Backend 790 → 794, all green, coverage gate OK. E2E unchanged.
**Browser exploration:** skipped. No E2E target was selected.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 2.1 left the ATDD leaves, every green-phase follow-up and the review patches (triage #2, #13, #14, #15, double-click guard) tested at the right level. The gaps came from a branch-coverage run plus a cross-check against `test_guard.py`:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | No test that `GET /api/export` is refused cross-site | It is the only GET route with a side effect (records "Last export"), and `test_cross_site_is_403_on_real_routes` doesn't list it. Deferred-work tied the AD-16 guard to this route. | API | P1 |
| G2 | A non-`OSError` failure mid-build (`except BaseException` in `build_export`) was never run | `export.py` lines 86–88 uncovered. A regression that left `store.lock` held would freeze every later intent. | API | P1 |
| G3 | An unreadable (not malformed) `local-state.json` was never read | `local_state.py` lines 39–41 uncovered. The spec says it reads as "No export yet" and the next export overwrites it. | API | P2 |

**Not selected:**
- Duplicates of E2E-pinned behaviour (busy state, refocus, failure-then-success, Couldn't load / Try again, Axe).
- A `Button` busy unit test. Triage #11 rejected it: AC-4 E2E asserts native `disabled` and opacity.
- A real-uvicorn abort. Triage #11: the `_run` harness mirrors uvicorn 0.54.

## Tests Added (`backend/tests/test_export.py`)

1. **`test_a_cross_site_export_is_refused_and_records_nothing[cross-site|same-site]`** (P1, G1). 403 `text/plain` with the earlier `local-state.json` kept byte-identical. Control: a `same-origin` fetch gets 200 and records.
2. **`test_an_unexpected_build_error_releases_the_lock_and_closes_the_spool`** (P1, G2). A `RuntimeError` from `referenced_covers` gives 500, the one spool is closed, `store.lock` is free, and nothing is recorded. After `monkeypatch.undo()` the next export is 200 and records.
3. **`test_an_unreadable_local_state_reads_as_no_export_and_the_next_export_replaces_it`** (P2, G3). With `chmod 000`, `/api/views/backup` gives `{"lastExportAt": null}` and logs "couldn't read local-state.json". A full export then replaces the file, and the view reads the new time. Skipped under root, as AC-6 is.

## Validation

- `npm run check:py`: 794 passed; `intents/export.py` and `store/local_state.py` 100% line coverage; gate `intents+store` 98.83%.
- Mutation check on test 2: dropping `out.close()` from the `BaseException` path fails it, and so does replacing `with store.lock:` with a bare acquire/release. Source restored afterwards (`git diff bookvie/` is empty).
- `ruff check` clean. `ruff format --check` flags this file, but the existing lines are flagged too and the gate doesn't run the formatter, so the file keeps its current style.
- Quality: no hard waits, no shared state across tests (each uses its own `tmp_path` subdir), explicit assertions in the test body, deterministic clock (`FakeClock(TODAY)`).

## Open Item (a decision, not a test gap)

Deferred-work (review of spec-refuse-cross-site-simple-gets, 2026-11-03) asked story 2.1 to decide how a cross-site GET from a browser that sends **no** `Sec-Fetch-Site` (Safari before 16.4, old Firefox) is kept from recording "Last export". That entry has no `resolved:` line, and the guard still lets header-less requests through (`test_own_fetch_site_reaches_server_path[None]`). G1 pins only the browsers that send the header. Either resolve the entry (for example, record with a separate POST, or require the header on `/api/export`) or note it as accepted risk.

## Next Steps

- Optional: `bmad-testarch-trace` for Epic 2 once 2.2 lands. Restore will reuse `_run` and the 2.1 fault harness.
