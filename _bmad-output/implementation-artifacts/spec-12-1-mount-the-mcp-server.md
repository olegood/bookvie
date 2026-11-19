---
title: 'Story 12.1: Mount the MCP server'
type: 'feature'
created: '2026-11-19'
status: 'in-review'
baseline_revision: 'f9cf49bb1ad755f56aea9d877bd1f3a33e8fdc79'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-1-mount-the-mcp-server.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: AD-21 Mount and the Stack row for mcp name the SDK's MCPServer and a mount of its streamable-HTTP app, but the build uses the low-level mcp.server.lowlevel.Server and a custom _McpRoute.
    evidence: |-
      MCPServer's tool registration validates and coerces arguments and wraps errors as "Error executing tool", which AD-21 One validator forbids; a Mount at /mcp redirects /mcp to /mcp/. Code: backend/bookvie/agent/server.py build_mcp_server, backend/bookvie/http/app.py _McpRoute (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-21 Mount, Stack
    severity: low
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: the spine still marks AD-21, the mcp and httpx2 Stack rows, the Structural Seed's agent/ and FR-28's capability-map row as planned, though Story 12.1 pins both packages, creates agent/ and mounts /mcp with get_app_info.
    evidence: |-
      backend/pyproject.toml pins mcp>=2.3.0,<2.4 and httpx2>=2.16.2,<2.17; backend/bookvie/agent/ exists; test_layers.py LAYERS has agent (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** Claude Code can't reach bookvie: nothing answers at `/mcp`, so an agent has no way into the library without a second process (FR-28, AD-21).

**Approach:** Every `create_app` builds a fresh, stateless, JSON-response MCP server and serves it at exactly `/mcp`, behind the AD-16 guard, in production and `--dev`. One registration helper in a new `bookvie/agent/` layer gives each tool its schema (from its model) and its answers (the routes' JSON and AD-9 errors). `get_app_info` is the only tool. Pin `mcp` and `httpx2`, and document the `claude mcp add` lines in the README.

## Boundaries & Constraints

**Always:**
- `/mcp` exactly: `POST /mcp` is served with no redirect; `/mcp/mcp`, `/mcp/<anything>`, `/MCP` are 404, never `index.html`. `mcp` joins `_SERVER_PREFIXES`.
- Stateless with JSON responses: no `mcp-session-id`, never an event stream; the session manager runs in the FastAPI app's lifespan.
- The SDK's own Host/Origin check is off (`TransportSecuritySettings(enable_dns_rebinding_protection=False)`), so every refusal is AD-16's `403 Forbidden\n`; `/mcp` gets the `Sec-Fetch-Site` check.
- Body cap 1 MiB (1,048,576 bytes): a declared `Content-Length` over it is 413 before any `receive`; exactly 1 MiB is served.
- Tool input schema = `model.model_json_schema(by_alias=True)`, with `null` removed from every property whose field isn't in the model's `nullable`; `additionalProperties: false`. The SDK never validates or coerces arguments: the tool's `run` gets the arguments dict exactly as sent.
- `run(state, arguments)` runs in one `anyio.to_thread.run_sync` call, with the app's `app.state`.
- Success: an `OkResponse` dumped `mode="json", by_alias=True, exclude_none=True` (the intent routes' `response_model_exclude_none`); a view dumped `mode="json", by_alias=True` (the view routes keep `null`). It is `structuredContent`, and the one text content is the same JSON. `IntentError` → `isError: true`, one text content = `json.dumps(err.response_body()["error"])`. Any other exception → the same for `couldnt_save(500)`, logged.
- `agent/` imports only `intents`, `views` (and third-party); never `http`.
- `get_app_info` description, verbatim: "Which bookvie this is: its version, whether it is the real app (production) or a development server (dev), and the library folder it uses. Call it first to check you are talking to the bookvie you mean." Its arguments model has no fields (closed object); it returns `state.app_info`.

**Never:** no stdio transport or subcommand; no `MCPServer.tool`/`add_tool` (they validate with their own model and wrap errors as "Error executing tool"); no test-only tool in `TOOLS`; no edits to existing leaves' assertions beyond the `STACK_ROWS` and `LAYERS`/`ALLOWED` entries; no spine edits (AGENTS.md "Architecture spine").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Claude Code connects | `POST /mcp` initialize, no Origin, `2025-11-25` | 200 JSON, `protocolVersion` `2025-11-25`, `tools` capability | No error expected |
| Restart | client re-posts `tools/list` with no handshake to a new app | served | No error expected |
| Foreign Origin/Host, cross-site/same-site fetch | header set | 403 `Forbidden\n` | guard, never 421 |
| Unknown tool | `tools/call` `delete_book` | JSON-RPC error (invalid params), nothing changes | SDK `MCPError` |
| Wrong type | `page: "212"` to a tool | the model's `malformed()` AD-9 object, `isError` | parser refuses |
| Body > 1 MiB | `Content-Length` 2 MiB | 413, body unread | SDK cap |

</intent-contract>

## Code Map

- `backend/bookvie/http/app.py` -- `create_app` (l.150): add `tools` keyword (default `bookvie.agent.TOOLS`), FastAPI `lifespan`, mount the MCP route before `install_api`/catch-all; `_SERVER_PREFIXES` (l.39); docstring names `/mcp`.
- `backend/bookvie/http/api.py:153` -- `BodySizeCap` caps only intents; leave it: the SDK's `max_request_body_size=1048576` already refuses a declared oversize with 413 before `receive` (ATDD probe: `(413, 0)`).
- `backend/bookvie/intents/intent_model.py` -- `IntentModel` (`nullable`, strict, extra forbid), `malformed`, `parse_form_intent`; reuse for `get_app_info`'s empty arguments model.
- `backend/bookvie/intents/contract.py` -- `IntentError.response_body()`, `couldnt_save(status)`, `OkResponse`.
- `backend/bookvie/views/app_info.py` -- `AppInfoView`; `app.state.app_info` is built in `create_app`.
- `backend/bookvie/cli.py:303` -- calls `create_app` without `tools`: unchanged (default applies).
- `backend/tests/test_agent_mount.py` -- the 15 red leaves (skip `RED`); `tests/agent_client.py`, `conftest.py` `connect_mcp`/`mcp_client` (passes `tools=` only when given).
- `backend/tests/test_layers.py:20-30` -- `LAYERS`, `ALLOWED`.
- `backend/tests/test_stack_pins.py:30` -- `STACK_ROWS` lacks `mcp`, `httpx2` (already failing on master).
- SDK 2.3.0 (probed in a scratch venv): `mcp.server.lowlevel.Server(name, version=..., on_list_tools=..., on_call_tool=...)`; `server.streamable_http_app(json_response=True, stateless_http=True, max_request_body_size=..., transport_security=...)` returns a Starlette app whose single route is `Route("/mcp", StreamableHTTPASGIApp)`; append that route to FastAPI's router and run `server.session_manager.run()` in the lifespan. Handlers get raw `params.arguments`; return `mcp_types.CallToolResult(content=[TextContent(text=...)], structured_content=..., is_error=...)`, `ListToolsResult(tools=[Tool(name, description, input_schema)])`. Two apps' managers run at once.
- PyPI check (2026-11-19, `pypi.org/pypi/<name>/json`): `mcp` 2.3.0 (needs `httpx2>=2.10.0`, `mcp-types==2.3.0`), `httpx2` 2.16.2.
- Deferred-work intake: none name story 12.1 (the "Epic 12" entries all carry `resolved:`).

## Tasks & Acceptance

**Execution:**
- `backend/pyproject.toml`, `backend/uv.lock` -- add `"mcp>=2.3.0,<2.4"`, `"httpx2>=2.16.2,<2.17"` to `[project].dependencies`; `uv lock` -- AC-1.
- `backend/tests/test_stack_pins.py` -- add `"mcp": ("pypi", "mcp")`, `"httpx2": ("pypi", "httpx2")` to `STACK_ROWS` -- the spine's Stack rows.
- `backend/bookvie/agent/__init__.py` (+ modules as fits, e.g. `tools.py`, `server.py`) -- `AgentTool(name, description, model, run)` (frozen dataclass), `input_schema(model)`, `build_mcp_server(state, tools) -> lowlevel Server`, `NoArguments` model, `GET_APP_INFO`, `TOOLS = (GET_APP_INFO,)` -- AC-5, AC-6.
- `backend/bookvie/http/app.py` -- `tools: Sequence[AgentTool] | None = None`; build the server and its Starlette sub-app per call; append its `/mcp` route before the other routes; `lifespan` runs `session_manager.run()`; `"mcp"` in `_SERVER_PREFIXES`; docstrings -- AC-2, AC-3, AC-4.
- `backend/tests/test_layers.py` -- `"agent"` in `LAYERS`; `ALLOWED["agent"] = {"intents", "views"}`; `"agent"` added to `ALLOWED["http"]`.
- `backend/tests/test_agent_mount.py` -- remove the 15 `@pytest.mark.skip(reason=RED)` lines and the `RED` constant; assertions unchanged.
- `README.md` -- `## Agent tools` section: both `claude mcp add --transport http --scope user …` lines (8765 `bookvie`, 8766 `bookvie-dev`), that bookvie must be running for the tools to appear, and the reconnect step (`/mcp` → reconnect, pending AC-8) -- AC-9.

**Acceptance Criteria:**
- AC-1 to AC-7 and AC-9: as in `epics.md` Story 12.1, pinned by `backend/tests/test_agent_mount.py` (each leaf names its AC).
- AC-8 (manual): Given Claude Code with `bookvie-dev` added while no server runs, when Oleg starts `bookvie --dev` after the session started, then this spec records what Claude Code does and the start step the skills will use, verified by Oleg in a real session. An unattended build can't run it: it stays open for Oleg before `bmad-code-review` closes the story.

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- verdicts: 29 findings — high 0, medium 3, low 19, false 7, maybe-false 0
- findings:
  - `[medium]` `[patch]` Blind: `_answer` serialized the result outside the `try`, so a non-model answer or a failed `model_dump` escaped as a JSON-RPC internal error, not `couldnt_save` — moved `_success(tool.run(...))` inside the `try`; new test `test_an_answer_that_cannot_be_serialized_is_couldnt_save`.
  - `[low]` `[reject]` Blind: the SDK's 413 for an `/mcp` body over 1 MiB is plain text, not AD-9 JSON — no HTTP status or body crosses MCP as a tool answer (AD-21); a 1 MiB tool call is not everyday use and routing `/mcp` through `BodySizeCap` adds a cap path.
  - `[low]` `[patch]` Blind: a non-nullable optional field advertised `"default": null` after its null branch was dropped — `_without_null` drops a `None` default; asserted in `test_the_schema_matches_nullable_by_python_field_name_not_alias`.
  - `[low]` `[reject]` Blind: `input_schema` doesn't rewrite nested `$defs`, and sets `additionalProperties` for any `BaseModel` — no tool has a nested or non-intent model yet; the fix adds a schema walker for a case no caller reaches.
  - `[low]` `[patch]` Blind: the unknown-tool test compared only `library.json` — it now snapshots the whole data folder (`_tree`).
  - `[low]` `[patch]` Blind: the duplicate-name `ValueError` was untested — `test_two_tools_with_one_name_are_refused`.
  - `[low]` `[reject]` Blind: the README's reconnect step is unverified — it is AC-8, recorded open in this spec and in the Auto Run Result for Oleg; the fix is a manual session, not code.
  - `[low]` `[patch]` Blind: README wording ("local trust only", only Origin/Host, `/mcp` exactness) — reworded: exactly `/mcp` with no trailing slash, refused by the API's guard (foreign Origin or Host, cross-site `Sec-Fetch-Site`).
  - `[low]` `[patch]` Blind: no test for `/mcp/` — added `"/mcp/"` to AC-4's 404 path tuple (HEAD on `/mcp` rejected: the SDK's own method handling, no story requirement).
  - `[low]` `[patch]` Blind: comment "First, before every other route" on an `append` after FastAPI's `/openapi.json` — reworded to "Before every route registered below".
  - `[low]` `[reject]` Blind: `url_path_for` lacks a return annotation, and `lifespan` closes over `mcp_server` defined later — cosmetic; the closure resolves at call time, after `create_app` returns.
  - `[false]` `[reject]` Blind: spine drift not in `deferred-work.md` — Finalize appends it (this pass).
  - `[false]` `[reject]` Blind: the diff is incomplete (`uv.lock`, the spec) — the generated lock and the spec were left out of the review diff on purpose; AC-1's leaf reads `uv.lock` and passes.
  - `[medium]` `[patch]` Edge (same root as Blind 1): serialization failure escapes as an internal error — same patch.
  - `[low]` `[patch]` Edge (same root as Blind 3): contradictory `default: null` — same patch.
  - `[low]` `[reject]` Edge: entering one app's lifespan twice raises `RuntimeError` — uvicorn and `TestClient` enter it once per `create_app`; documented in `server.py` ("an SDK session manager runs only once").
  - `[low]` `[reject]` Edge: `/mcp` on an app whose lifespan never ran is a bare 500 — `cli.py` runs uvicorn with its lifespan; not reachable in use, and a guard adds a branch.
  - `[medium]` `[patch]` Verification gap: `input_schema`'s match of `nullable` by Python name, not alias, was unpinned (mutating to the alias kept every test green) — new `test_the_schema_matches_nullable_by_python_field_name_not_alias` with `spine_color` / `cover_note`.
  - `[low]` `[patch]` Verification gap: `get_app_info` refusing an argument was untested (removing the parse kept 24 tests green) — new `test_get_app_info_refuses_an_argument`.
  - `[low]` `[patch]` Verification gap (same root as Blind 6): duplicate-name guard untested — same test.
  - `[low]` `[reject]` Intent: the headline outcome and AC-8 live in a real Claude Code session the tests don't touch — AC-8 is manual by the story's own text; recorded open.
  - `[false]` `[reject]` Intent: AC-1's PyPI record isn't in the diff — it is in this spec's Code Map (2026-11-19: mcp 2.3.0, httpx2 2.16.2).
  - `[low]` `[reject]` Intent: no chunked over-cap body test — the ATDD checklist lists it as a `bmad-testarch-automate` follow-up; the SDK's middleware counts streamed bytes.
  - `[false]` `[reject]` Intent: "restart" is tested at protocol level — that is AC-2's own wording ("needs no new session"), tested by a new app on the same folder.
  - `[false]` `[reject]` Intent: "as Claude Code sends" uses synthetic headers — same AC-8 manual scope; no defect in the code.
  - `[false]` `[reject]` Intent: the test-only tool stays out of real servers only by construction — AC-6's leaf and the real-process AC-2 leaf both assert the list is exactly `get_app_info`.
  - `[false]` `[reject]` Intent: additions beyond the epic text (unknown-tool test, `agent` layer rule) — both come from AD-21 and the spec; not a divergence from intent.
  - `[low]` `[defer]` Spine: AD-21 Mount names `MCPServer` and a mount; the code uses the low-level `Server` and `_McpRoute` — spine drift (AD-21), deferred.
  - `[low]` `[defer]` Spine: AD-21, Stack, Seed and capability map still say "planned" — spine drift (AD-21), deferred.

## Design Notes

- **Low-level `Server`, not `MCPServer`.** AD-21 Mount names "the SDK's `MCPServer`", but its tool registration builds a Pydantic model from the function signature, validates and coerces with it, and wraps exceptions as "Error executing tool …", which AD-21 One validator and AC-5 forbid. The low-level `mcp.server.lowlevel.Server` takes `on_list_tools`/`on_call_tool` handlers and passes arguments through raw. This is spine drift for the review to defer (AD-21 Mount), not a decision change.
- **Null removal** (AC-5): for each property whose Python field is not in `model.nullable`, drop `{"type": "null"}` branches from `anyOf` (collapse a single remaining branch into the property, keeping `title`/`default`), so `note: str | None` advertises `string` and `purpose` (nullable) keeps the model's schema as is.
- **Unknown tool name:** raise the SDK's `MCPError` with `INVALID_PARAMS` ("Unknown tool: <name>"), so no tool runs.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_mount.py` -- expected: 15 passed.
- `cd backend && uv run pytest -q` -- expected: all pass (incl. `test_stack_pins.py`, `test_layers.py`, `test_instance.py::test_server_makes_no_outbound_connections`).
- `npm run check` (repo root) -- expected: passes.

**Manual checks:**
- AC-8 in a real Claude Code session (Oleg).

## Auto Run Result

Status: in-review

**Summary.** Every `create_app` builds a fresh, stateless, JSON-response MCP server (the SDK's low-level `Server`) and serves it at exactly `/mcp` through `_McpRoute`, behind the AD-16 guard, with its session manager in the app's lifespan and the SDK's 1 MiB body cap. The new `bookvie/agent/` layer holds `AgentTool`, `input_schema` (by alias, closed, `null` dropped outside `nullable`), the answer wrapper (OkResponse or view as structured content and text; `IntentError` as the AD-9 object; anything else `couldnt_save`) and `TOOLS = (get_app_info,)`. `mcp` 2.3.0 and `httpx2` 2.16.2 are pinned runtime dependencies.

**Files changed.**
- `backend/pyproject.toml`, `backend/uv.lock`: `mcp>=2.3.0,<2.4`, `httpx2>=2.16.2,<2.17`.
- `backend/bookvie/agent/__init__.py`, `tools.py`, `server.py`: the agent layer, the helper, `get_app_info`.
- `backend/bookvie/http/app.py`: `tools=` keyword, lifespan, `_McpRoute`, `mcp` in `_SERVER_PREFIXES`, SDK Host/Origin check off.
- `backend/tests/test_agent_mount.py`: the 15 ATDD leaves un-skipped (one request made absolute for `//mcp/x`, `/mcp/` added to AC-4's path list; no assertion changed) plus 5 new tests (unknown tool, nullable by name, `get_app_info` refuses an argument, duplicate names, unserializable answer).
- `backend/tests/test_layers.py`, `backend/tests/test_stack_pins.py`: the `agent` layer; the `mcp` and `httpx2` Stack rows.
- `README.md`: `## Agent tools`.

**Review.** 29 findings: 9 patch entries applied (2 medium entries, 7 low; 3 medium and 10 low finding rows), 2 deferred as spine drift (AD-21), 18 rejected with reasons in the Review Triage Log.

**Follow-up review recommended: true.** Two medium entries were patched: the serialization-failure path in `_answer` and the `nullable`-by-name schema rule. Both are now covered by new tests, but no reviewer has read the patched code itself.

**Verification.** `uv run pytest -q tests/test_agent_mount.py`: 23 passed. `npm run check`: exit 0 after the patches (backend 1668 passed; ruff, API check, lint, tsc, unit, Playwright e2e, install smoke all passed).

**Residual risks.**
- **AC-8 is open.** Oleg still has to add `bookvie-dev` while no server runs, start `bookvie --dev` after a Claude Code session started, and record here what Claude Code does and the start step the skills will use. The README's reconnect step (`/mcp`, pick the entry, reconnect) is unconfirmed until then.
- An app whose lifespan never ran answers `/mcp` with 500; one app's lifespan can run only once.
- No test sends a chunked `/mcp` body past 1 MiB (an automate follow-up in the ATDD checklist).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
