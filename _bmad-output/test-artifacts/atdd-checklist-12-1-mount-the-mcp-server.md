---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-19'
storyId: '12.1'
storyKey: '12-1-mount-the-mcp-server'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-121-mount-the-mcp-server'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-1-mount-the-mcp-server.md'
generatedTestFiles:
  - 'backend/tests/test_agent_mount.py'
  - 'backend/tests/agent_client.py'
  - 'backend/tests/conftest.py (connect_mcp, mcp_client)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 12 intro and gate, Story 12.1; AR35, AR37, AR38, AR43)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D1-D5, D15, D16, §5 story cut, §6 tests)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-21 Mount, Guard, One validator, Same handler; AD-16; Stack; Structural Seed agent/)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (Epic 11 retro items, Epic 12 backlog)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spine drift gate)'
  - '_bmad-output/test-artifacts/atdd-checklist-11-2-keep-development-apart-from-the-real-library.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/pyproject.toml, uv.lock, bookvie/http/app.py, http/api.py (BodySizeCap, app_info_view), intents/contract.py, intents/intent_model.py, intents/update_page.py, store/store.py'
  - 'backend/tests/conftest.py, helpers.py, servers.py, test_guard.py, test_layers.py, test_stack_pins.py, test_instance.py, test_cli.py, test_dev_mode.py'
  - 'README.md (headings)'
  - 'PyPI: mcp 2.3.0 (mcp-types 2.3.0), httpx2 2.16.2, read 2026-11-19; the mcp 2.3.0 wheel read in a scratch folder (MCPServer.streamable_http_app, TransportSecuritySettings, mcp_types.version)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given backend/pyproject.toml, when this story lands, then mcp and httpx2 are runtime dependencies pinned to the versions current on the day (checked on PyPI and recorded in the spec), httpx stays dev-only, and uv.lock is updated.' }
  - { id: AC-2, idSource: generated, text: 'Given a production server and a --dev server, when an MCP client connects to http://127.0.0.1:<port>/mcp, then it initializes and lists tools on both, with no /mcp/mcp path and no redirect to /mcp/; and create_app builds a fresh MCP server each time (two apps in one pytest run both work), the session manager runs in the app''s lifespan, the server is stateless with JSON responses, and a server restart needs no new session.' }
  - { id: AC-3, idSource: generated, text: 'Given a request to /mcp with a foreign Origin, a foreign Host, or a Sec-Fetch-Site other than same-origin or none, when it arrives, then the AD-16 guard refuses it with 403, as it does /api; and a request from the loopback address with no Origin (as Claude Code sends) is served; and the SDK''s own Host/Origin check is off, so no refusal is a 421.' }
  - { id: AC-4, idSource: generated, text: 'Given a GET to /mcp/anything or /MCP, when it reaches the server, then the SPA catch-all doesn''t answer it with index.html (mcp is a server prefix); and an /mcp body over 1 MB is refused before it is read.' }
  - { id: AC-5, idSource: generated, text: 'Given the tool-registration helper in agent/, when a tool is declared with an intent or argument model, then its advertised input schema is generated from the model by alias, with no extra properties and null left out where the parser refuses it, and the SDK neither validates nor coerces the arguments; and the tool body runs in one worker-thread call; and a success returns its OkResponse (or view) by alias as structured content with the same JSON as text; an IntentError returns isError with one text content holding the AD-9 error object as JSON; any other exception returns couldnt_save with "Couldn''t save. Your data wasn''t changed."; and a test-only tool with an argument proves all four: a schema equal to its model''s, a "212" sent for an integer refused by the model and not coerced, an IntentError as the AD-9 object without an "Error executing tool" prefix, and an unexpected exception as couldnt_save. The test-only tool isn''t registered outside tests.' }
  - { id: AC-6, idSource: generated, text: 'Given the tool list, when a client lists tools after this story, then it holds exactly get_app_info; and get_app_info returns the app-info view (version, mode, dataDir, commit) by alias. Description: "Which bookvie this is: its version, whether it is the real app (production) or a development server (dev), and the library folder it uses. Call it first to check you are talking to the bookvie you mean."' }
  - { id: AC-7, idSource: generated, text: 'Given the pytest suite, when a later story writes an agent-tool test, then a shared fixture gives it an MCP client connected to a real app (with its lifespan) on a temporary data folder, and this story''s tests use it.' }
  - { id: AC-8, idSource: generated, text: 'Given Claude Code with the bookvie-dev entry added while no server runs, when Oleg starts bookvie --dev after the session has started, then the spec records what Claude Code does (connects on its own, needs /mcp reconnect, or needs a new session) and the start step the skills will use, verified by Oleg in a real session.' }
  - { id: AC-9, idSource: generated, text: 'Given the README, when Oleg reads its new "Agent tools" section, then it gives claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp and the same for bookvie-dev on 8766, says bookvie must be running for the tools to appear, and gives the reconnect step this story found.' }
---

# ATDD Checklist: Story 12.1 Mount the MCP server

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI (plan §4: no DESIGN.md or EXPERIENCE.md change), so every leaf is pytest.
- **Story:** `epics.md` Story 12.1 has 9 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-9 in source order (registry above). Each "And" line belongs to the criterion above it; AC-6's "Description:" line belongs to AC-6. `sprint-status.yaml` reads `backlog` for 12.1 and `epic-12`.
- **Epic gate:** 12.1 is Epic 12's first story. `deferred-work.md` has no unresolved "spine drift" entry (the reconciliation before Epic 12, 2026-11-19, added `resolved:` to the last four), and every Epic 11 retro action item is `done` in `sprint-status.yaml`. The spine already plans everything this story adds (AD-21 Mount, Guard, One validator, Same handler; Stack rows `mcp` 2.3.x and `httpx2` 2.16.x; Structural Seed `agent/`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **PyPI on 2026-11-19:** `mcp` 2.3.0 (needs `httpx2>=2.10.0`, `mcp-types==2.3.0`, `starlette>=0.48.0` on 3.14) and `httpx2` 2.16.2. Both fit the spine's series.
- **What exists today:**
  - No `bookvie/agent/` package, no `mcp` or `httpx2` dependency. `httpx` is a dev dependency only.
  - `create_app` mounts nothing at `/mcp`. `_SERVER_PREFIXES` is `("api", "media")`. So a `POST /mcp` reaches the GET/HEAD-only catch-all and gets 405, and `GET /mcp/anything` gets `index.html`.
  - `HostOriginGuard` already refuses a foreign Host or Origin on every path, but it checks `Sec-Fetch-Site` only on server paths, so a cross-site `/mcp` passes it today.
  - `BodySizeCap` caps only `add-book`, `edit-book` and `restore`.
  - The README has no "Agent tools" section.
  - **`test_stack_pins.py::test_every_spine_row_is_mapped` already fails on master:** commit `589df83` added the `mcp` and `httpx2` rows to the spine's Stack table, but `STACK_ROWS` doesn't map them. The full suite reads 1637 passed, 1 failed (that one), 15 skipped (this run's leaves). See "Existing leaves this story changes".
- **What the SDK does by default** (read from the 2.3.0 wheel, probed below): `MCPServer.streamable_http_app(streamable_http_path="/mcp", json_response=..., stateless_http=..., max_request_body_size=..., transport_security=..., host="127.0.0.1")`. With `transport_security=None` and a loopback host, it turns on DNS-rebinding protection. That check matches Host case-sensitively (`127.0.0.1:*`, `localhost:*`) and answers a mismatch with 421. The default `@tool` decorator validates arguments with its own Pydantic model and wraps an unexpected exception as the text "Error executing tool <name>". AC-5 forbids both, so the build registers tools at a lower level. Handshake revisions are `2024-11-05` to `2025-11-25`; `2026-07-28` is the stateless "modern" envelope. The leaves speak `2025-11-25`.

## Generation Mode

**AI generation**, run in this session. No recording: there is no UI. The tests speak MCP's wire format (JSON-RPC 2.0 over streamable HTTP) through a small client of their own. That way they assert what Claude Code sees, they don't depend on the SDK's client API, and they import nothing from `mcp`, so they collect before the dependency exists.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Static (pytest, `pyproject.toml` + `uv.lock`) | P1 | `test_mcp_and_httpx2_are_pinned_runtime_dependencies_and_httpx_stays_dev_only`. **`{"mcp", "httpx2"} <= runtime dependencies`.** Then each range admits today's PyPI version (2.3.0, 2.16.2) and refuses the series either side (2.2.999 / 2.4.0, 2.15.999 / 2.17.0); neither is in the dev group; `httpx` isn't runtime and is still dev; `uv.lock` locks `mcp` ≥ 2.3.0 in 2.3 and `httpx2` ≥ 2.16.2 in 2.16; the lock's `bookvie` entry depends on both and not on `httpx`. | Manifests are files; the series rule matches `test_stack_pins.py`. |
| AC-2 | Integration (real `bookvie` processes) | P0 | `test_a_production_and_a_dev_server_both_answer_mcp_at_exactly_slash_mcp`. A production server and a `--dev` server, each on a free port and a temp `--data-dir`. **`initialize` at `/mcp` answers 200 `application/json`** (inside `McpClient.rpc`). Then `protocolVersion` is `2025-11-25` and `capabilities` has `tools`; `tools/list` is exactly `["get_app_info"]`; `get_app_info` says `mode` `production` / `dev` and `dataDir` is that server's folder (so the dev server is on its own folder); `POST /mcp/mcp` is 404. | The P0 risk "mounted in both modes" needs the real CLI path and a real port, as Claude Code connects. |
| AC-2 | Integration (pytest, `connect_mcp`) | P0 | `test_each_app_builds_its_own_stateless_json_mcp_server_and_a_restart_needs_no_new_session`. Two apps on two folders, both with their lifespans running at once. **Each `initialize` answers 200 `application/json`.** Then a `tools/list` answer is `application/json` with no `mcp-session-id`, nor has the second app's `initialize`. A third app on the first folder (a restart): the first client, rebound to it, lists tools and calls `get_app_info` with no new handshake and no session id. `POST /mcp/mcp` is 404, and `POST /mcp` answers 200 with no redirect. | An SDK session manager runs only once, so two live apps answering proves `create_app` built one each. In-process is the only place to hold two apps open in one run. |
| AC-3 | API (pytest, `mcp_client`), 7 parameters | P0 | `test_the_ad16_guard_refuses_cross_origin_mcp_requests_with_its_403`, parametrized over a foreign Origin, the Vite origin without `--dev`, `Origin: null`, a foreign Host, another port's Host, and `Sec-Fetch-Site` `cross-site` and `same-site`. **`(refused status, refused body, plain status) == (403, "Forbidden\n", 200)`**: the guard's own 403, while the same `initialize` without the header is served. Then each served case answers 200 with the handshake: no Origin (Claude Code), each own Origin, `Sec-Fetch-Site` `same-origin` and `none`, and `Host: LOCALHOST:8765`, which AD-16 accepts and the SDK's check would answer with 421. | The guard is ASGI middleware; `TestClient` sets every header exactly. |
| AC-4 | API (pytest, `connect_mcp` with a built `index.html`) | P1 | `test_the_spa_never_answers_an_mcp_path_and_a_body_over_1_mb_is_refused_unread`. **`GET /mcp/anything` is 404.** Then `/MCP`, `/Mcp/x`, `/mcp/mcp` and `//mcp/x` are all 404 with no `index.html` body. An `initialize` padded to exactly 1 MiB is served (200), and one byte more is 413. A raw ASGI POST declaring `Content-Length` 2 MiB is answered 413 with `receive` never called. | "Before it is read" can only be seen by counting `receive` calls at the ASGI level. |
| AC-5 | Integration (pytest, `connect_mcp(tools=...)`) | P0 | `test_the_tool_helper_advertises_the_models_schema_and_answers_like_the_routes`. Registers `probe_tool` (`ProbeIntent`: `bookId: str`, `page: int`, `note: str \| None` not nullable, `purpose: str \| None` nullable) next to `bookvie.agent.TOOLS`. **Its advertised `properties` keys are exactly `bookId`, `page`, `note`, `purpose`.** Then: `type` `object`, `additionalProperties` false, `required` `bookId`, `page`; `bookId`, `page` and `purpose` equal the model's own by-alias property schemas; `note` admits only `string`, `purpose` `string` and `null`. Page 212 succeeds: not `isError`, `structuredContent` `{"ok": true, "ids": {"bookId": "b1"}}`, the one text content is the same JSON; the body got `app.state` and ran off the event loop. `"212"`, and an extra key, each reach the body exactly as sent and come back as `malformed()`'s AD-9 object. Page 13 is `book_not_found`'s AD-9 object, with no "Error executing tool" prefix. Page 99 (a `RuntimeError`) is `COULDNT_SAVE_BODY["error"]`. Five calls, five body runs, none on the event loop. | The helper is what every later tool uses; a test-only tool with every outcome pins it once. |
| AC-6 | API (pytest, `mcp_client`) | P0 | `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view`. **The listed names are exactly `["get_app_info"]`.** Then its description is the AC's text exactly, its input schema is a closed object with no properties; `get_app_info`'s `structuredContent` and its text both equal `GET /api/views/app-info` on the same app, whose keys are `version`, `mode`, `dataDir`, `commit`; `mode` `production`, `dataDir` the fixture's folder. | Comparing with the route, not with `app.state.app_info`, keeps the leaf from being a tautology. |
| AC-7 | Integration (pytest, `mcp_client`) | P1 | `test_the_shared_mcp_client_reaches_a_real_app_on_a_temporary_folder`. **`get_app_info`'s `dataDir` is `mcp_client.data_dir`.** Then that folder is under the test's `tmp_path`, holds a `library.json`, and is the opened store's `data_dir`. | The fixture's contract for 12.2 onward. AC-3 and AC-6 use the same fixture. |
| AC-8 | Manual (Oleg, a real Claude Code session) | P1 | No automated leaf. Oleg adds `bookvie-dev` while no server runs, starts a Claude Code session, then `bookvie --dev`, and records which of the three outcomes happens, plus the start step the skills will use, in the story spec. | Only a real Claude Code session shows its reconnect behavior. |
| AC-9 | Static (pytest, `README.md`) | P2 | `test_the_readme_says_how_to_add_bookvie_and_bookvie_dev_to_claude_code`. **A `## Agent tools` or `### Agent tools` section exists.** Then it holds both `claude mcp add --transport http --scope user …` lines exactly (8765 `bookvie`, 8766 `bookvie-dev`) and the word "running". | The README is text; the exact commands are the AC's. The reconnect step's wording comes from AC-8, so the review checks it by hand. |

**Primary branch per criterion.** AC-1's newly promised scalar is the `mcp` runtime dependency; AC-2's is an `initialize` answered on a real server, and on two apps at once; AC-3's is the guard's 403 on `/mcp` with `/mcp` otherwise served; AC-4's is a 404 for `/mcp/anything`; AC-5's is the advertised schema's properties; AC-6's is the one-tool list; AC-7's is the fixture's folder in `get_app_info`; AC-9's is the README section.

**What the leaves pin (the contract for the build):**
- `bookvie.agent` exports `AgentTool` and `TOOLS`. `AgentTool(name=..., description=..., model=..., run=...)`, where `model` is the Pydantic model the input schema is generated from and `run(state, arguments)` is called once per tool call in a worker thread, with the app's `app.state` and the arguments dict exactly as sent. It returns a Pydantic model (an `OkResponse` or a view) or raises. `TOOLS` is the tuple of tools `create_app` registers by default. Today it is `get_app_info` alone.
- `create_app(..., tools=...)` takes the tools to register; leaving it out registers `bookvie.agent.TOOLS`. Only tests pass it. This is how the test-only tool stays out of every real server.
- A result: success has `structuredContent` = the returned model dumped by alias with `None` left out (the routes' `response_model_exclude_none`), and one text content with the same JSON. An error is `isError: true` with exactly one text content, `IntentError.response_body()["error"]` as JSON. Any other exception is the `couldnt_save` body.
- `/mcp` exactly: `POST /mcp` answers 200 `application/json` with no redirect and no `mcp-session-id`; `/mcp/mcp` and any other `/mcp/...` or `/MCP` path is 404, never `index.html`. A body declaring over 1 MiB (1,048,576 bytes, the intents' multipart part limit) is 413 before any `receive`; exactly 1 MiB is served.
- The guard: `/mcp` gets the `Sec-Fetch-Site` check (`mcp` among the server prefixes) and the guard's own `403 Forbidden\n`. The SDK's check is off, so `Host: LOCALHOST:8765` is served.
- The handshake answers `protocolVersion: "2025-11-25"` to a client that asks for it, with a `tools` capability.

**Open for the build (not pinned):**
- How the SDK app is mounted so the path is `/mcp` exactly (a `Mount` at `/mcp` redirects `/mcp` to `/mcp/`, which the leaves refuse), and where the session manager joins the lifespan.
- Where the 1 MiB cap lives (`BodySizeCap` with a refusal of its own, or the SDK's `max_request_body_size`, which answers 413 "Request body too large"). The leaves pin only the 413 and the unread body.
- `serverInfo`, `outputSchema`, and the advertised schema's `title` and `default` keys for a field whose `null` was dropped.
- The README's wording around the two commands, and the reconnect step from AC-8.
- How the pinned versions are written in `pyproject.toml` (the project's `>=X.Y,<X.Y+1` style fits), and the spec's record of the PyPI check.

## Existing leaves this story changes (for the build)

- `backend/tests/test_stack_pins.py` `STACK_ROWS`: add `"mcp": ("pypi", "mcp")` and `"httpx2": ("pypi", "httpx2")`. That turns `test_every_spine_row_is_mapped` green (it already fails on master) and adds the `mcp` and `httpx2` cases to `test_python_range_stays_in_series` and `test_uv_lock_resolves_in_series`. This run didn't add them: before the dependencies exist, those two new cases would fail with a `KeyError`, unskipped.
- `backend/tests/test_layers.py`: `agent` becomes a layer. Add it to `LAYERS`, with `ALLOWED["agent"] = {"intents", "views"}` (AD-21: `agent/` never imports `http/`), and add `"agent"` to `ALLOWED["http"]` (`create_app` mounts it). This run didn't add them: `test_every_layer_package_exists` would fail until `bookvie/agent/__init__.py` exists.
- `backend/tests/test_guard.py` passes unchanged. `/mcp` joining the server prefixes changes nothing it asserts.
- `backend/tests/test_instance.py::test_server_makes_no_outbound_connections` must still pass with `mcp` imported at startup (the SDK pulls in `opentelemetry-api`).
- `backend/tests/test_cli.py`'s autouse `expose_data_dir` wraps `cli.create_app` with a fixed keyword list. If the CLI passes `tools`, the wrapper must pass it on.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Pytest, AC-2 lifespan:** an app whose lifespan never ran (a `TestClient` not entered) doesn't serve `/mcp` as if it were up; the app's lifespan starts and stops the session manager (for example, entering and leaving the same app twice is refused or works, whichever the build chooses, and says so). (done: backend/tests/test_agent_mount.py:569 `test_an_app_whose_lifespan_never_ran_answers_no_mcp_request_and_runs_its_lifespan_once`: a TestClient not entered gets 500 with no `initialize` result; the same app's second lifespan raises the SDK's "can only be called once" `RuntimeError`, so entering twice is refused)
- [x] **Pytest, AC-2 Claude Code's revision:** the `2026-07-28` stateless envelope, if Claude Code sends it, is answered too (or refused with a clear JSON-RPC error). Check what Claude Code sends in AC-8's real session. (done: backend/tests/test_agent_mount.py:616 `test_the_2026_07_28_stateless_envelope_is_served_and_its_handshake_falls_back`: `tools/list` and `tools/call` with the 2026-07-28 `_meta` envelope and no handshake are served as JSON; an `initialize` asking for 2026-07-28 is answered with `2025-11-25`. AC-8's real session (spec Verification, 2026-11-19) connected and called `get_app_info`; which revision Claude Code sent isn't recorded, and both paths are served)
- [x] **Pytest, AC-3 `--dev`:** a dev app serves `Origin: http://127.0.0.1:5173` on `/mcp` (AD-16's dev origins) and still refuses a foreign one. (done: backend/tests/test_agent_mount.py:641 `test_a_dev_app_serves_the_vite_origins_on_mcp_and_still_refuses_a_foreign_one`)
- [x] **Pytest, AC-3 GET and DELETE:** a foreign Origin on `GET /mcp` and `DELETE /mcp` is the guard's 403 too. (done: backend/tests/test_agent_mount.py:656 `test_the_guard_refuses_a_cross_origin_get_or_delete_on_mcp_too` (GET and DELETE × every `REFUSED` header))
- [x] **Pytest, AC-4 chunked:** a body with no `Content-Length` that streams past 1 MiB is refused while it streams, and the tool never runs. (done: backend/tests/test_agent_mount.py:734 `test_a_chunked_body_past_1_mb_is_refused_while_it_streams_and_no_tool_runs`)
- [x] **Pytest, AC-5 view result:** a tool that returns a view model (not an `OkResponse`) gives that view by alias as structured content (`get_app_info` covers one; a view with `None` fields shows whether `None` is left out as in the view routes). (done: backend/tests/test_agent_mount.py:417 `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` (a production `AppInfoView` keeps `commit: null`: the structured content equals the view route's body, all four keys) and backend/tests/test_agent_mount.py:363 (an `OkResponse` leaves out its `None` `reachedLastPage`))
- [x] **Pytest, AC-5 `duplicates` and `fields`:** an `IntentError` with `fields` and with `duplicates` (an `isbn: null` match) comes back exactly as `IntentError.response_body()["error"]`, `isbn: null` kept. (done: backend/tests/test_agent_mount.py:790 `test_an_intent_error_with_fields_or_duplicates_comes_back_whole`)
- [x] **Pytest, AC-6 unknown tool:** `tools/call` for `delete_book`, `restore` or `delete_card_note` fails (a JSON-RPC error or `isError`), and nothing changes in the data folder. (done: backend/tests/test_agent_mount.py:474 `test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing`)
- [x] **Pytest, AC-7 isolation:** the fixture's app never touches `~/bookvie-data` or the real home (it runs under the temp `HOME`). (done: backend/tests/test_agent_mount.py:805 `test_the_mcp_fixture_never_reaches_the_real_home_or_its_library`, with `conftest.py` `_isolated_home`)
- [x] **Smoke:** the installed `bookvie` answers `initialize` at `/mcp` (`scripts/smoke.mjs`), so the wheel carries `mcp`. (done: scripts/smoke.mjs:162 (the installed `bookvie` answers `POST /mcp` `initialize` with `2025-11-25` and a `tools` capability))

## Helper probes

Helpers reused: `wait_for_health` (`tests/servers.py`), `BASE_URL`, `TODAY`, `COULDNT_SAVE_BODY` (`tests/helpers.py`), `FakeClock` (`bookvie.domain.clock`), `Store.open`, `instance.bind_socket`, `IntentModel`, `parse_form_intent`, `malformed`, `book_not_found`, `OkResponse` (`bookvie.intents`).

Helpers added:
- `McpClient`, `text_of`, `error_of` (`tests/agent_client.py`): no existing helper speaks MCP.
- `connect_mcp`, `mcp_client` (`tests/conftest.py`): AC-7's shared fixture. It's like `helpers.api_client`, but it runs the lifespan (`TestClient` entered), makes the data folder first, and passes `tools`.
- In `tests/test_agent_mount.py`:
  - `_initialize_message`: an exact-size JSON body.
  - `_post_initialize`: a raw `initialize` with chosen headers.
  - `_post_unread`: counts ASGI `receive` calls.
  - `_section`: a README section by heading.
  - `_types`: the JSON types a property schema admits.
  - `_on_event_loop`.
  - `_start`: a real server on a free port. It is like `test_instance._launch` plus `wait_for_health`, but it adds `--dev`. Test modules don't import each other (`helpers.py` docstring).
  - `ProbeIntent` and `_probe_tool`: AC-5's test-only tool.

Shipped numbers:
- AC-4 quotes 1 MB for the intents' body cap. Measured 1,048,576: Starlette's `Request.form` defaults to `max_part_size=1048576`, and the intent routes keep that default (`uv run python -c "…inspect.signature(starlette.requests.Request.form)"`). Asserted as measured (`BODY_CAP = 1024 * 1024`).
- AC-9 quotes ports 8765 and 8766, and AC-2 the `/mcp` URL. These are CLI defaults (AD-16), and the leaves assert them only as README text. Asserted as quoted.

Probes. The pure helpers ran from a temporary `backend/tests/test_agent_mount_probe.py`, with `uv run pytest -q tests/test_agent_mount_probe.py`, then removed with `rm`. Anything needing the SDK ran in a scratch venv outside the repo (`mcp==2.3.0`, `fastapi` 0.162.7, `httpx` 0.28, `bookvie` editable), against a real `MCPServer` streamable-HTTP app (stateless, JSON responses) inside a `TestClient` with its lifespan. The project's lockfile wasn't touched.

- **`McpClient`**, against `MCPServer("probe")` with an `add(a, b)` tool and a `fail()` tool:
  - It returned the known answers: `initialize` gave `protocolVersion` `2025-11-25` and capabilities with `tools`; `tools/list` gave `["add", "fail"]`; `add` gave `{"sum": 5}`; a fresh client marked initialized listed tools with no handshake; and the answers were `application/json` with no `mcp-session-id`.
  - It refused what it should: a 404 path (`HTTP 404 'text/plain…'`), a JSON-RPC error (`-32601 Method not found`) through `result`, the SDK's "Error executing tool fail" text through `error_of` (not JSON), a success through `error_of`, and an empty `content` through `text_of`.
  - Probed again after ruff reformatted the file: same results.
- **The 421 discriminator** (AC-3's `Host: LOCALHOST:8765` case): with the SDK's default security it answered 421, and with `enable_dns_rebinding_protection=False` it answered 200. So the served case fails if the build leaves the SDK's check on.
- **`_post_unread` and `_initialize_message` on a real cap** (the SDK's `max_request_body_size=1048576`): exactly 1 MiB gave 200, 1 MiB + 1 gave 413, and `_post_unread(app, 2 MiB)` gave `(413, 0)`.
- **`_post_unread` on local ASGI apps:** an app that answers 413 without reading gave `(413, 0)`. One that reads once first gave `(413, 1)`, so a cap that reads before refusing is caught. An app that sends nothing raised.
- **`_initialize_message`:** lengths exactly 1,048,576, 1,048,577 and 500, each valid JSON with `method` `initialize`. A size smaller than the message raised.
- **`_types`:** `{"string"}`, `{"string", "null"}` for an `anyOf`, and `{"integer", "null"}` for a type list. It returned `{"integer"}` (not `{"string"}`) for an integer schema.
- **`_on_event_loop`:** `True` inside `asyncio.run`, `False` in an `anyio.to_thread.run_sync` worker, `False` outside any loop.
- **`_section`:** it took a `## Agent tools` section up to the next `##` (its `###` subsection kept) and a `### Agent tools` up to the next `###`. It returned `None` for `## Agent toolsx` and for a text with no headings.
- **AC-5's expected values** (`ProbeIntent` with today's parser):
  - `{"page": 212}` parses.
  - `"212"`, an extra key, and `note: null` are each refused with an `IntentError`; `purpose: null` parses.
  - The model's own by-alias schema admits `null` for `note` too, so the leaf's `{"string"}` for `note` really does need the helper to drop it.
  - The model's schema already has `additionalProperties: false` and `required` `bookId`, `page`.
- **Not probed:** `_start` waits through the reused `wait_for_health`. `connect_mcp` and `mcp_client` are fixtures, not measurements, but the red run below exercised them. No border or outline width is read (no UI), so Epic 10 retro item 71 (E10-R1) doesn't apply.

**The red run found a fixture bug:** the first red run errored in `connect_mcp`'s setup (`StartupError: …/library/covers: can't be created`), because `Store.open` needs the folder to exist. The CLI creates it first in `ensure_writable`. The fixture now makes the folder first, and the red run below was redone after that fix.

**Render-before-read:** no leaf reads a page. Every read is an HTTP or ASGI response, a file, or a process's health, and the real servers are read only after `wait_for_health` returned. No leaf needed a fix.

## TDD Red Phase

15 skipped leaves in `backend/tests/test_agent_mount.py`, each `@pytest.mark.skip(reason=RED)` with its `[P*] AC-n` in its first comment line:

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_agent_mount.py:144` `test_mcp_and_httpx2_are_pinned_runtime_dependencies_and_httpx_stays_dev_only` | P1 |
| AC-2 | `backend/tests/test_agent_mount.py:193` `test_a_production_and_a_dev_server_both_answer_mcp_at_exactly_slash_mcp` | P0 |
| AC-2 | `backend/tests/test_agent_mount.py:217` `test_each_app_builds_its_own_stateless_json_mcp_server_and_a_restart_needs_no_new_session` | P0 |
| AC-3 | `backend/tests/test_agent_mount.py:275` `test_the_ad16_guard_refuses_cross_origin_mcp_requests_with_its_403` (7 parameters) | P0 |
| AC-4 | `backend/tests/test_agent_mount.py:292` `test_the_spa_never_answers_an_mcp_path_and_a_body_over_1_mb_is_refused_unread` | P1 |
| AC-5 | `backend/tests/test_agent_mount.py:369` `test_the_tool_helper_advertises_the_models_schema_and_answers_like_the_routes` | P0 |
| AC-6 | `backend/tests/test_agent_mount.py:424` `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` | P0 |
| AC-7 | `backend/tests/test_agent_mount.py:450` `test_the_shared_mcp_client_reaches_a_real_app_on_a_temporary_folder` | P1 |
| AC-8 | manual, recorded in the story spec by Oleg | P1 |
| AC-9 | `backend/tests/test_agent_mount.py:465` `test_the_readme_says_how_to_add_bookvie_and_bookvie_dev_to_claude_code` | P2 |

**Red today.** This run came after every probe above last passed, on the files as they are now (after ruff). The leaves ran from a throwaway `tests/test_agent_mount_red.py` with the skip lines deleted (`uv run pytest -q tests/test_agent_mount_red.py`), which was then removed with `rm`. Result: 15 failed, each at its first assertion:
- **AC-1:** `{'httpx2', 'mcp'}` aren't among the runtime dependencies (`fastapi`, `pillow`, `pydantic`, `python-multipart`, `uvicorn`).
- **AC-2, both leaves:** `initialize: HTTP 405 'application/json' '{"detail":"Method Not Allowed"}'`. `POST /mcp` reaches the GET/HEAD catch-all, on the real production server and in process.
- **AC-3, all 7:** each fails the tuple comparison. The five Host and Origin cases give `(403, 'Forbidden\n', 405)`: the guard already refuses them, but `/mcp` isn't served. The two `Sec-Fetch-Site` cases give `(405, …, 405)`, because `/mcp` isn't a server path for the guard yet.
- **AC-4:** `('/mcp/anything', 200)`: the SPA answers it.
- **AC-5:** `ModuleNotFoundError: No module named 'bookvie.agent'`, at the import of the helper the AC names (its Given), before any assertion. It is the only leaf whose first failure isn't an assertion. Once the module exists, its first assertion is the advertised schema's properties.
- **AC-6 and AC-7:** `initialize: HTTP 405`, at their first call.
- **AC-9:** "no Agent tools section".

With the skips in place: `uv run pytest -q` (the full backend suite) gave 1637 passed, 15 skipped, and 1 failed: `test_stack_pins.py::test_every_spine_row_is_mapped`, which fails on master already (see Preflight). Ruff format and check are clean on the three files, and `git status` lists no `*_probe.py` file and no throwaway copy.

**Storage keys:** no new localStorage key. The story has no frontend change.

**No real library:** every leaf runs under `conftest.py`'s temporary `HOME`. The real servers get a free port and a temp `--data-dir`, and `connect_mcp` builds its apps on folders under `tmp_path`. No leaf writes a backup (that's Story 12.6).

## Implementation checklist (for `bmad-build-auto`)

- [x] Check PyPI again, then add `mcp` and `httpx2` to `[project].dependencies` pinned to the current versions (2.3.0 and 2.16.2 on 2026-11-19), and record the check in the spec. Run `uv lock`. Map both in `test_stack_pins.py`'s `STACK_ROWS` (AC-1). (done: backend/tests/test_agent_mount.py:142 `test_mcp_and_httpx2_are_pinned_runtime_dependencies_and_httpx_stays_dev_only`; `test_stack_pins.py` `STACK_ROWS`)
- [x] `bookvie/agent/` with `AgentTool`, `TOOLS` (`get_app_info` with the AC's description) and the registration helper. The schema comes from the model by alias, closed, with `null` dropped where the model refuses it. The SDK doesn't validate. `run(state, arguments)` runs in one worker-thread call, and results follow AD-21. Then add the `agent` layer to `test_layers.py` (AC-5, AC-6). (done: backend/bookvie/agent/tools.py, server.py; backend/tests/test_agent_mount.py:363, :417; `test_layers.py` `agent`)
- [x] `create_app`: build a fresh `MCPServer` and mount it at exactly `/mcp`, before the catch-all, stateless, with JSON responses and `enable_dns_rebinding_protection=False`. Its session manager runs in the app's lifespan. Add `mcp` to `_SERVER_PREFIXES`, cap the body at 1 MiB before reading, and take the `tools=` keyword (AC-2, AC-3, AC-4). (done: backend/bookvie/http/app.py `create_app`, `_McpRoute`; backend/tests/test_agent_mount.py:190, :213, :270, :286. Built on the SDK's low-level `Server`, not `MCPServer` (spine drift AD-21, `deferred-work.md`))
- [x] Probe Claude Code with Oleg: the `bookvie-dev` entry added, then `bookvie --dev` started after the session. Record the outcome and the skills' start step in the spec (AC-8). (done: spec-12-1 Review Findings, AC-8 resolved 2026-11-19 by Oleg (`/mcp` → reconnect))
- [x] README "Agent tools" section: the two `claude mcp add` lines, that bookvie must be running, and the reconnect step (AC-9). (done: README.md `## Agent tools`; backend/tests/test_agent_mount.py:456)
- [x] Un-skip the 15 leaves and see them pass, then run `npm run check` with no existing leaf's assertions edited, apart from the `STACK_ROWS` and `LAYERS` entries above. (done: spec-12-1 Review Findings: full `npm run check` exit 0 after the review patches; leaves un-skipped)

## Next

`bmad-build-auto` for Story 12.1, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
