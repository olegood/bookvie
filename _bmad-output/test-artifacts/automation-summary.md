---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-19'
storyId: '12.2'
storyKey: '12-2-let-an-agent-read-my-library'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-2-let-an-agent-read-my-library.md (Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-12-2-let-an-agent-read-my-library.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-2 done)
  - _bmad-output/implementation-artifacts/deferred-work.md (AD-21 drift entries for 12.2)
  - _bmad/tea/config.yaml
  - backend/bookvie/agent/tools.py; backend/bookvie/views/find_book.py; backend/bookvie/views/shelf.py (`home_for`); backend/bookvie/store/local_state.py
  - backend/tests/test_agent_read.py; backend/tests/test_agent_mount.py; backend/tests/test_layers.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.2, Let an agent read my library

The previous version of this file held the summary for Story 12.1. It's in git history (`26dd7e3`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Backend: pytest (`backend/tests/conftest.py`); frontend: Playwright. The story changes only the backend: no page calls `/mcp`.
- **Mode:** BMad-Integrated. The story is `done` after `bmad-code-review` (`e345d5e`). The spec and ATDD checklist are present.
- **Config:** `tea_use_playwright_utils: false`, `tea_use_pactjs_utils: false`. No test in this run runs on the Playwright runner, so no Playwright fragments load; there are no Pact artifacts. Core fragments only.
- **Inputs to cover:** the ATDD checklist's 11 green-phase follow-ups and its 7 implementation lines.

## Coverage Plan

Every target is backend integration through the real app with `connect_mcp` (MCP over `TestClient`). No E2E: the browser never speaks MCP. Scope is selective. The build and review already added leaves for 9 of the 11 follow-ups (`test_agent_read.py:497-704`); this run read each against the code and ticked it. Two follow-ups had no leaf:

| Follow-up | Level | Priority | Leaf |
|---|---|---|---|
| AC-2 to AC-5 read only | Integration (pytest) | P1 | `backend/tests/test_agent_read.py:737` `test_the_read_tools_write_nothing_when_they_answer_or_refuse`: 13 calls across all six read tools, answers and refusals (blank query, extra key, unknown id, reversed range); the data folder is byte-identical after each, with no `local-state.json`. |
| AC-5 last export | Integration (pytest) | P1 | `backend/tests/test_agent_read.py:767` `test_get_home_reports_the_last_export_as_its_route_does`: `lastExportAt` is `null` before, set after `GET /api/export`, and `get_home` equals `GET /api/views/home`. |

## Validation

- **Mutation probes** (each edit reverted by copying the file back; `git diff` on `backend/bookvie` empty afterwards):
  - `_list_catalog` writing `local-state.json` fails the read-only leaf.
  - `home_for` passing `None` for the last export fails the last-export leaf.
- **Runs:** `uv run pytest tests/test_agent_read.py` 18 passed; `npm run check:py` 1713 passed, coverage gates ok. Ruff format and check clean on the file.
- **Hygiene:** no probe or throwaway file left; no browser session opened; no git state changed.

## Files

- Updated: `backend/tests/test_agent_read.py` (2 leaves and a `_tree` helper; the same helper as `test_agent_mount.py:497`, kept local as the file's other helpers are).
- Updated: `_bmad-output/test-artifacts/atdd-checklist-12-2-let-an-agent-read-my-library.md` (18 lines ticked with evidence; `grep -cF '[ ]'` is 0).

## Assumptions and Risks

- The read-only leaf checks the data folder only. A read tool writing elsewhere is out of its reach; no read tool's code path opens a file outside it.
- The stale name `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` stays, deferred by the review to the Epic 12 retro (`deferred-work.md`).

## Next

Story 12.3 (`12-3-let-an-agent-record-my-reading`) with `bmad-testarch-atdd`. Epic 12 isn't closed, so there's no retro yet.
