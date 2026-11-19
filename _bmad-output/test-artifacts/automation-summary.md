---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-19'
storyId: '12.1'
storyKey: '12-1-mount-the-mcp-server'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md (Intent, Always/Never rules, I/O matrix, Review Findings, Auto Run Result residual risks)
  - _bmad-output/test-artifacts/atdd-checklist-12-1-mount-the-mcp-server.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-1 done)
  - _bmad/tea/config.yaml
  - backend/bookvie/agent/tools.py; backend/bookvie/agent/server.py; backend/bookvie/http/app.py (`_McpRoute`, `create_app`, lifespan)
  - backend/tests/test_agent_mount.py; backend/tests/agent_client.py; backend/tests/conftest.py
  - scripts/smoke.mjs
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.1, Mount the MCP server

The previous version of this file held the summary for the back to top button spec. It's in git history (`171c3f0`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Backend: pytest (`backend/tests/conftest.py`); frontend: Playwright. Both frameworks are in place. The story changes only the backend and the install smoke: no page calls `/mcp`.
- **Mode:** BMad-Integrated. The story is `done` after `bmad-code-review` (`3ff761e`). The spec and ATDD checklist are present.
- **Picked-up work:** an earlier automate attempt for this story was interrupted before its summary and commit. It left uncommitted leaves in `test_agent_mount.py`, a `/mcp` step in `scripts/smoke.mjs` and a ticked checklist. This run treated them as candidates: it read each one against the code, mutation-probed the ones that guard a branch, re-ran everything, and corrected two checklist citations (below). Nothing from the earlier attempt is cited as evidence.
- **Config:** `tea_use_playwright_utils: false`, `tea_use_pactjs_utils: false`. No test in this run runs on the Playwright runner, so no Playwright fragments load; there are no Pact artifacts. Core fragments only.
- **Inputs to cover:**
  - The ATDD checklist's 10 green-phase follow-ups.
  - The spec's residual risks (lifespan never run, a chunked body past 1 MiB).
  - Branches of `bookvie/agent/` that no leaf pins, found by reading the code.

## Coverage Plan

Every target is backend: integration through the real app with `connect_mcp`/`mcp_client` (MCP over `TestClient`), unit for `input_schema`, and the installed-wheel smoke. No E2E: the browser never speaks MCP. Scope is selective: one leaf per open follow-up, plus the two unpinned branches; nothing re-proves what the ATDD leaves own.

| # | Target | Level | Priority | Source |
|---|---|---|---|---|
| 1 | An app whose lifespan never ran doesn't answer `initialize`; one app's lifespan runs once | Integration | P2 | ATDD follow-up AC-2 lifespan |
| 2 | The `2026-07-28` stateless envelope (no handshake) is served; an `initialize` asking for it falls back to `2025-11-25` | Integration | P2 | ATDD follow-up AC-2 revision |
| 3 | A `--dev` app serves both Vite origins on `/mcp` and still refuses a foreign one | Integration | P1 | ATDD follow-up AC-3 `--dev` |
| 4 | GET and DELETE on `/mcp` with every `REFUSED` header set: the guard's 403 | Integration | P1 | ATDD follow-up AC-3 GET/DELETE |
| 5 | A chunked body past 1 MiB is refused while it streams (not every chunk read), no tool runs; a chunked one under the cap is served | Integration | P1 | ATDD follow-up AC-4 chunked; spec residual risk |
| 6 | An `IntentError` with `fields`, and one with `duplicates` (`isbn: null` kept), comes back whole | Integration | P1 | ATDD follow-up AC-5 |
| 7 | The fixture's app never reaches the real home or `~/bookvie-data` | Integration | P1 | ATDD follow-up AC-7 |
| 8 | The installed `bookvie` answers `initialize` at `/mcp` with a `tools` capability | Smoke | P1 | ATDD follow-up Smoke |
| 9 | `_without_null` with two branches left keeps the `anyOf` without `null`, drops a `None` default and keeps a real one | Unit | P2 | code read, `tools.py:_without_null` |
| 10 | An unexpected failure is logged with the tool name and traceback, not only answered `couldnt_save` | Integration | P2 | code read, `server.py:_answer`; spec "logged" |

Not new tests:
- **AC-5 view result** is already proved by the ATDD leaves: `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` (a view keeps `commit: null`) and `test_the_tool_helper_advertises_the_models_schema_and_answers_like_the_routes` (an `OkResponse` drops its `None`).
- **AC-6 unknown tool** is the review's `test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing` (whole-folder snapshot).

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session: most leaves already existed and needed checking, not generating, and the two additions are a dozen lines each. The output contract is unchanged.
- **Production code untouched:** `git status` lists only `backend/tests/test_agent_mount.py`, `scripts/smoke.mjs` and the artifacts below. Each mutation edited one source file and was reverted by copying the saved file back; no git command changed the tree.

## Tests Added

`backend/tests/test_agent_mount.py` (25 → 48 cases):

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 569 | `test_an_app_whose_lifespan_never_ran_answers_no_mcp_request_and_runs_its_lifespan_once` | P2 | not mutated |
| 616 | `test_the_2026_07_28_stateless_envelope_is_served_and_its_handshake_falls_back` | P2 | not mutated |
| 641 | `test_a_dev_app_serves_the_vite_origins_on_mcp_and_still_refuses_a_foreign_one` | P1 | not mutated |
| 656 | `test_the_guard_refuses_a_cross_origin_get_or_delete_on_mcp_too` (14 cases) | P1 | not mutated |
| 734 | `test_a_chunked_body_past_1_mb_is_refused_while_it_streams_and_no_tool_runs` | P1 | `max_request_body_size=MCP_BODY_CAP * 100` in `app.py`: failed |
| 790 | `test_an_intent_error_with_fields_or_duplicates_comes_back_whole` (2 cases) | P1 | not mutated |
| 805 | `test_the_mcp_fixture_never_reaches_the_real_home_or_its_library` | P1 | not mutated |
| 831 | `test_a_union_keeps_its_other_branches_and_a_real_default_once_null_is_dropped` (new this run) | P2 | `anyOf: kept` → `anyOf: branches` failed; dropping the `None`-default filter failed |
| 843 | `test_an_unexpected_failure_is_logged_with_the_tool_name` (new this run) | P2 | `logger.exception(...)` → `pass` in `server.py`: failed |

`scripts/smoke.mjs:162`: after the favicon step, `POST /mcp` `initialize` against the installed wheel must answer 200 with `protocolVersion` `2025-11-25` and a `tools` capability.

Priority coverage: P0 0, P1 19 cases (+ smoke), P2 4, P3 0. The story's P0 paths are the ATDD leaves.

Fixtures: none new. The leaves use the existing `connect_mcp`, `mcp_client` and `_isolated_home` (`conftest.py`); `_counting_tool`, `_raising_tool`, `_post_chunked` and `_post_modern` are file-local helpers.

## Validation

- `uv run pytest -q tests/test_agent_mount.py`: 48 passed. `ruff format` and `ruff check` clean on the file.
- Burn-in: the 23 automation cases, 10 consecutive runs (`-p no:randomly`): 23 passed every time, 0 flaky.
- Mutation probes: 4 mutants, 4 killed (table above); source restored and `git status` checked after.
- Full `npm run check` (2026-11-19, this run, with every change above): exit 0. pytest 1693 passed (1670 at the review plus this run's 23), coverage gates ok, ruff, API contract, Prettier, `tsc`, oxlint (3 existing warnings, none in files this run touched), unit 388 passed, e2e 799 passed, smoke ok including `POST /mcp initialize -> 200, protocol 2025-11-25 with tools`.
- No CLI browser session was opened. Temp artifacts are in the session scratchpad only.
- ATDD checklist: all 10 green-phase follow-ups and the 6 implementation lines are ticked with test lines. This run corrected two: the smoke citation (`:164` → `:162`), and the AC-2 revision line, which claimed Claude Code's real session "connected over the handshake" when the spec records only that it connected and called `get_app_info`. `grep -cF '[ ]'` gives 0.

## Risks and Assumptions

- Which protocol revision Claude Code actually sends isn't recorded. Both paths (the `2025-11-25` handshake and the `2026-07-28` envelope) are served, so either works today.
- The chunked leaf drives the ASGI app directly with a hand-built scope on the `TestClient`'s portal, since `TestClient` always sends a `Content-Length`. It proves the SDK's streaming cap, not uvicorn's request parsing.
- The lifespan leaf pins the SDK's "can only be called once" `RuntimeError` text. An SDK upgrade that rewords it fails the leaf, not the app.
- The review's deferred items for 12.2 and 12.3 (a non-object structured result, shutdown during a call, the read-tool error wording, `field: "intent"`) aren't automated here; they belong to those stories.

## Next

- Story 12.2: `bmad-testarch-atdd` for "Let an agent read my library", in a new session.
- The AD-21 spine-drift entries stay open until the reconciliation after the Epic 12 retro.
