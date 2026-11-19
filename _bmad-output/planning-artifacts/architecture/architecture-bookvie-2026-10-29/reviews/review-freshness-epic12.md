# Freshness review: AD-21 and the Stack table (Epic 12, MCP)

- **Date:** 2026-11-19
- **Scope:** the facts that `ARCHITECTURE-SPINE.md` (AD-21, Stack table, line 133) asserts about the MCP Python SDK (`mcp`), httpx and Claude Code, checked against PyPI, the SDK docs, the `mcp` 2.3.0 wheel's source, `backend/pyproject.toml` / `backend/uv.lock`, and live probes.
- **Verdict:** the decisions hold and the versions are right. One Stack-table choice is questionable (httpx 0.28 vs the `httpx2` that `mcp` 2.x already pulls in), and four API details the spine implies need wording or a design note before Story 12.1.

## Method

- PyPI JSON API for `mcp`, `mcp-types`, `httpx`, `httpx2`, `httpcore2`, `sse-starlette`; GitHub releases via `gh api`.
- Downloaded `mcp-2.3.0-py3-none-any.whl` and read `mcp/server/mcpserver/server.py`, `mcp/server/lowlevel/server.py`, `mcp/server/streamable_http_manager.py`, `mcp/server/transport_security.py`, `mcp/server/mcpserver/exceptions.py`, `mcp/server/mcpserver/tools/base.py`, `mcp/server/mcpserver/utilities/func_metadata.py`.
- `uv pip compile` (dry run, scratchpad) of the current runtime pins plus `mcp>=2.3,<2.4` and `httpx>=0.28,<0.29` on Python 3.14.
- Starlette `Mount` trailing-slash probe in `backend/.venv` (Starlette 1.10.0).
- Live capture of the headers Claude Code 2.1.328 sends to an HTTP MCP server (a local Node echo server and `claude --strict-mcp-config --mcp-config`).

## Findings

### 1. `mcp` version, stable line, Python 3.14 — CONFIRMED

- Latest is **2.3.0** (2026-10-02). 2.x is the stable line: 2.0.0 shipped 2026-07-28 after a1–a3, b1–b2, rc1; classifier `Development Status :: 5 - Production/Stable`. A 1.x maintenance line continues in parallel (1.30.0, 2026-09-07); 2.x is what to pin.
- `requires_python >=3.10`, classifier `Programming Language :: Python :: 3.14`. It has 3.14-specific floors (`anyio>=4.10`, `starlette>=0.48.0`), which the lock already exceeds (anyio 4.15.1, Starlette 1.10.0).
- Dry-run resolution with FastAPI 0.162.0 / Starlette 1.10.0 / Pydantic 2.14.2 / Uvicorn 0.54 succeeds: `mcp==2.3.0`, `mcp-types==2.3.0`, `sse-starlette==3.7.0`, `httpx2==2.16.2`, `httpcore2==2.16.2`, `truststore==0.10.5`, plus `pyjwt[crypto]`, `jsonschema`, `opentelemetry-api`. That is a sizeable new runtime tree for an app with five runtime deps; worth a sentence in Story 12.1.
- Note for 12.1: in 2.x `FastMCP` is gone. The class is `mcp.server.mcpserver.MCPServer`; importing `mcp.server.fastmcp` raises `ModuleNotFoundError` pointing at the migration guide. Anything written from v1 memory will be wrong (the plan's D16 already says to look it up then).
- Sources: https://pypi.org/project/mcp/2.3.0/ , https://pypi.org/pypi/mcp/json , https://github.com/modelcontextprotocol/python-sdk/releases , https://py.sdk.modelcontextprotocol.io/v2/migration/#fastmcp-renamed-to-mcpserver

### 2. Mount as a streamable-HTTP ASGI sub-app, session manager in the host lifespan — CONFIRMED, with a path caveat

- API: `MCPServer.streamable_http_app(*, streamable_http_path="/mcp", json_response=False, stateless_http=False, event_store=None, retry_interval=None, max_request_body_size=4 MiB, session_idle_timeout=..., max_sessions=..., transport_security=None, host="127.0.0.1") -> Starlette`. The session manager is `MCPServer.session_manager` (a `StreamableHTTPSessionManager`), available only after `streamable_http_app()` has been called. The host lifespan must enter `async with mcp.session_manager.run():`; the migration guide states that a mounted sub-app's own lifespan never runs.
- **Caveat A (path):** the returned Starlette app holds one `Route(streamable_http_path, ...)`. `Mount("/mcp", app=mcp.streamable_http_app())` with the default path serves `/mcp/mcp`. With `streamable_http_path="/"`, Starlette answers `POST /mcp` with **307 → `/mcp/`** (probed on Starlette 1.10.0), and Claude Code posts to the exact URL you register (`.../mcp`). The SDK docs' own example mounts at `"/"`. That is awkward in bookvie, whose SPA catch-all also lives at the root. Story 12.1 should pick one of these: register the SDK's endpoint as a plain route at `/mcp` (take the `Route` from the returned app), or `Mount("/", ...)` placed after `/api`, `/media` and the SPA routes are handled, with a test that `POST /mcp` gets no redirect. The spine's "mounts ... at `/mcp`" is fine as intent, but shouldn't be read as `app.mount("/mcp", ...)` literally.
- **Caveat B (one run per instance):** `StreamableHTTPSessionManager.run()` "can only be called once per instance" and raises `RuntimeError` on a second call. `create_app` must build a fresh `MCPServer` (and app) per call. The pytest suite builds many apps, so a module-level `MCPServer` would break the second test.
- In 2.x, sync (`def`) tool handlers run on a worker thread, which matches AD-21's "calls the same handler in a worker thread".
- Sources: wheel `mcp/server/mcpserver/server.py` (`streamable_http_app`, `session_manager`), `mcp/server/lowlevel/server.py` (route and `lifespan=lambda app: session_manager.run()`), `mcp/server/streamable_http_manager.py` (`run`), https://py.sdk.modelcontextprotocol.io/v2/migration/ ("For mounted apps", "Sync handlers run on a worker thread")

### 3. Stateless mode with JSON responses — CONFIRMED

- `stateless_http: bool` and `json_response: bool` are keyword arguments of `streamable_http_app()` (and `run()`). They moved off the constructor in 2.x, and `MCPServer(json_response=...)` is a `TypeError`. Stateless mode builds a fresh transport per request with no `Mcp-Session-Id`, so the spine's "a restart never strands a client's session" holds. The guide notes that each flag removes the server-to-client channel (sampling and elicitation raise `NoBackChannelError`), which is irrelevant to a tools-only server.
- 2.3.0 also serves protocol **2026-07-28**, which is sessionless by design (`_streamable_http_modern.py`). Claude Code 2.1.328 tries it first (see 7).
- Sources: https://py.sdk.modelcontextprotocol.io/v2/migration/ ("Transport-specific parameters moved"), wheel `streamable_http_manager.py` (`_handle_stateless_request`)

### 4. The SDK's DNS-rebinding Host/Origin check, and turning it off — CONFIRMED (setting named); rationale imprecise

- Setting: `transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False)` (import from `mcp.server.transport_security`), passed to `streamable_http_app()`.
- **Passing nothing does not turn it off.** When `transport_security is None` and `host` is `127.0.0.1`, `localhost` or `::1` (and `host` defaults to `"127.0.0.1"`), the SDK enables it with `allowed_hosts=["127.0.0.1:*","localhost:*","[::1]:*"]` and matching `http://` origins. A rejected Host gets **421** "Invalid Host header", and a Host with no port (for example `testserver` / `localhost` from in-process test clients) is rejected.
- **Rationale wording:** the spine says the two lists would "disagree under `--port`". The SDK's default uses wildcard ports, so it wouldn't disagree on port. It would disagree on status (421 vs AD-16's 403), on the bare-Host test client, and on hosts AD-16 may allow. The decision is right. Suggested reason: "so there is one guard, with AD-16's hosts and 403, not a second one with its own list and 421."
- Sources: wheel `mcp/server/transport_security.py`, `mcp/server/lowlevel/server.py` lines ~752-758; https://py.sdk.modelcontextprotocol.io/v2/migration/ (DNS rebinding note, 421)

### 5. Tool errors and structured output — CONFIRMED, two details to pin down

- **Errors:** a tool can `raise ToolError(msg)` (from `mcp.server.mcpserver.exceptions`), which gives `CallToolResult(is_error=True)`. But the SDK prefixes the text with `"Error executing tool <name>: "`. Any other exception becomes a generic `"Error executing tool <name>"` with the details withheld, and `MCPError` becomes a JSON-RPC protocol error instead of `isError`. For AD-21's "a tool error whose content is the AD-9 `error` object", the tool should **return** `CallToolResult(is_error=True, content=[TextContent(type="text", text=<AD-9 error JSON>)])` (optionally also `structured_content`). That is supported, and output-schema validation is skipped when `is_error` is set. Raising `ToolError` would put the prefix in front of the JSON.
- **Structured output:** supported. A Pydantic return annotation yields `output_schema` and `structured_content`, dumped with `mode="json", by_alias=True`, so camelCase aliases survive. `structured_output=` on `@mcp.tool()` / `add_tool()` controls it. Field renames in the 2.x types are snake_case in Python (`is_error`, `structured_content`) and camelCase on the wire.
- **Arguments (unconfirmed design, line 133 and "same handler"):** `MCPServer` builds a tool's input schema from the function signature and **validates the arguments before the tool body runs**. Two consequences:
  - (a) A wrong-typed argument is refused by the SDK as a `ToolError` with Pydantic text. It never becomes AD-9 `invalid_fields` from `parse_*_intent`, so the "same error" contract test would fail for type errors unless the declared schema is loose (for example one `dict`/`Any` body) or the tool is registered with a hand-built `Tool(parameters=<intent model JSON schema>)`.
  - (b) Using the intent Pydantic model as a single parameter nests the body under the parameter name instead of taking the intent's camelCase keys at top level.

  The spine's "arguments are its intent's JSON body, with the same camelCase keys" and "schemas come from the same Pydantic models" are achievable, but not with the plain decorator. Story 12.1/12.3 must choose how.
- Sources: wheel `mcp/server/mcpserver/exceptions.py` (`ToolError`, `UnexpectedToolError`), `tools/base.py` (`run`), `server.py` (`_handle_call_tool`), `utilities/func_metadata.py` (`convert_result`); https://py.sdk.modelcontextprotocol.io/v2/migration/ ("Lowlevel tool exceptions no longer become isError", camelCase→snake_case table)

### 6. httpx — version CONFIRMED; choice QUESTIONABLE; pre-resolved IP CONFIRMED

- httpx **0.28.1** (2024-12-06) is still the latest stable release; only `1.0.dev1`–`dev6` pre-releases followed. `backend/uv.lock` has httpx 0.28.1 / httpcore 1.0.9 as a **dev** dependency only.
- **`mcp` 2.x does not depend on httpx.** It depends on **`httpx2>=2.10.0`** (Pydantic's fork, 2.16.2 released 2026-11-16, with `httpcore2`, `truststore`). The migration guide's heading is "httpx and httpx-sse replaced by httpx2". `mcp` 1.x depended on `httpx<1.0.0,>=0.27.1`. Also, Starlette 1.10's `TestClient` warns on import: "Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead." (seen in `backend/.venv`).
- Implication: as the spine stands, Epic 12 ships **two** HTTP client stacks at runtime (httpx 0.28 for covers, httpx2 via `mcp`). The plan's D16 says "any HTTP client the downloader needs (for example `httpx`)". Using `httpx2` for the cover download avoids a second runtime dependency, and the dev `httpx` can follow when tests move to httpx2. Recommend changing the Stack row to `httpx2 | 2.16.x` (or recording why httpx 0.28 is kept).
- **Pre-resolved IP with SNI/Host kept:** yes, in both. Request the checked IP literal (`https://<ip>/...`), set `Host: <hostname>`, and pass `extensions={"sni_hostname": "<hostname>"}`. httpcore passes `sni_hostname` as `server_hostname` to TLS, so SNI is sent and the certificate is verified against the original hostname. Present in httpcore 1.0.9 (`_async/connection.py`) and in httpcore2 2.16.2 (`_async/connection.py`, `_sync/connection.py`). Redirects must be followed by hand (`follow_redirects=False`), re-resolving and re-checking each hop, which matches AD-21's "again after every redirect (at most 3)". A custom transport or resolver is not needed.
- Sources: https://pypi.org/project/httpx/ , https://github.com/encode/httpx/releases , https://pypi.org/project/httpx2/ , https://github.com/pydantic/httpx2 , https://py.sdk.modelcontextprotocol.io/v2/migration/ ("httpx and httpx-sse replaced by httpx2"), https://www.encode.io/httpcore/extensions/ (`sni_hostname`)

### 7. Claude Code: `claude mcp add --transport http <name> <url>`, and Origin — CONFIRMED (syntax); CONFIRMED by probe (no Origin)

- Syntax: the docs show "Basic syntax: `claude mcp add --transport http <name> <url>`". The plan's README lines are correct.
- **Scope:** the default scope is **local**: "A local-scoped server loads only in the project where you added it." The README line as planned registers bookvie only for the project it's run in. Both bookvie skills and general use want `--scope user` (`claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp`). This is plan/README text, not spine text, but worth fixing before 12.1.
- **Headers (probe, Claude Code 2.1.328):** three requests to `http://127.0.0.1:<port>/mcp`:
  - `POST` with `mcp-method: server/discover` and `mcp-protocol-version: 2026-07-28`;
  - a legacy `POST`;
  - `GET` with `accept: text/event-stream` (the SSE fallback probe).

  Headers on all three: `host: 127.0.0.1:<port>`, `user-agent: claude-code/2.1.328 (sdk-cli)`, `accept`, `content-type`, `accept-encoding: identity`. There was **no `Origin`, no `Sec-Fetch-Site`, no `Sec-Fetch-Mode`**. So AD-16's guard (a missing Origin passes, a missing `Sec-Fetch-Site` passes) admits Claude Code with no exception. The Host matches the registered URL, so registering `127.0.0.1` rather than `localhost` matters if AD-16 allows only one of them. Not documented, so this is behavior and could change. The `/mcp` guard tests should include a request shaped like this one.
- The `GET /mcp` probe gets 405 from a stateless JSON server. Expected and harmless, but don't let AD-16 or the SPA fallback answer it with `index.html`.
- Sources: https://code.claude.com/docs/en/mcp (Option 1: remote HTTP server; Local scope), local probe (scratchpad `echo2.mjs`, `probe.json`)

## Spine edits suggested (for the reconciliation pass, not made here)

1. Stack: replace `httpx (the cover download; planned) | 0.28.x` with `httpx2 (the cover download; already required by mcp 2.x) | 2.16.x`, or add a note on why both stacks are kept.
2. AD-21 Guard: name the setting (`TransportSecuritySettings(enable_dns_rebinding_protection=False)`; passing none leaves it on for 127.0.0.1) and replace the `--port` rationale with the 421-vs-403 / second-list reason.
3. AD-21 Mount: "serves `/mcp` exactly (no redirect); a fresh `MCPServer` per `create_app`, since its session manager runs once".
4. AD-21 Same handler: an `IntentError` is *returned* as `CallToolResult(is_error=True)` carrying the AD-9 JSON (not raised as `ToolError`, which prefixes the text), and the SDK's own argument validation must not pre-empt `parse_*_intent` (a loose input schema or a hand-built `Tool(parameters=...)`).
5. Plan D3 / README (not spine): `--scope user`.
