"""Story 12.1: the agent tools are mounted at ``/mcp`` in the running app (AD-21).

The MCP server is part of the app: on in production and ``--dev``, behind the
AD-16 guard, stateless with JSON responses, and built fresh by every
``create_app``. One registration helper in ``bookvie.agent`` gives every tool
its schema and its answers; ``get_app_info`` is the only tool so far.

The tests speak MCP's wire format through :class:`tests.agent_client.McpClient`
(the ``mcp_client`` and ``connect_mcp`` fixtures), and every one runs with
``HOME`` set to a temporary folder (``conftest.py``).
"""

import asyncio
import json
import re
import subprocess
import sys
import tomllib
from collections.abc import Callable
from pathlib import Path
from typing import Any, ClassVar

import httpx
import pytest
from packaging.requirements import Requirement
from packaging.version import Version
from pydantic import BaseModel

from bookvie import instance
from bookvie.intents import OkResponse, book_not_found
from bookvie.intents.intent_model import IntentModel, malformed, parse_form_intent
from tests.agent_client import PROTOCOL_VERSION, SESSION_HEADER, McpClient, error_of, text_of
from tests.helpers import BASE_URL, COULDNT_SAVE_BODY
from tests.servers import wait_for_health

BACKEND_ROOT = Path(__file__).resolve().parents[1]
README = BACKEND_ROOT.parent / "README.md"

APP_INFO_DESCRIPTION = (
    "Which bookvie this is: its version, whether it is the real app (production) or a "
    "development server (dev), and the library folder it uses. Call it first to check you "
    "are talking to the bookvie you mean."
)
APP_INFO_KEYS = {"version", "mode", "dataDir", "commit"}
# The tool list, cumulative across Epic 12's stories (each story extends it).
AGENT_TOOL_NAMES = [
    "get_app_info",
    "find_book",
    "get_book",
    "list_catalog",
    "get_card_notes",
    "get_home",
    "get_stats",
    "start_reading",
    "update_page",
    "finish_reading",
    "pause",
    "set_up_next",
    "edit_purpose",
    "add_card_note",
    "edit_card_note",
    "mark_side_read",
    "unmark_side_read",
    "add_book",
    "edit_book",
]
# The intents' cap on a body part (Starlette's multipart limit), 1 MiB.
BODY_CAP = 1024 * 1024
OWN = "http://127.0.0.1:8765"


def _initialize_message(size: int | None = None) -> bytes:
    """An ``initialize`` request as bytes, padded with JSON whitespace to ``size``."""
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "bookvie-tests", "version": "0"},
            },
        }
    ).encode()
    if size is None:
        return body
    assert len(body) < size
    return body[:-1] + b" " * (size - len(body)) + b"}"


def _post_initialize(
    client: McpClient, headers: dict[str, str] | None = None, *, size: int | None = None
) -> httpx.Response:
    """POST an ``initialize`` to ``/mcp`` as Claude Code would, plus ``headers``."""
    return client.http.post(
        client.path,
        content=_initialize_message(size),
        headers={
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            **(headers or {}),
        },
        follow_redirects=False,
    )


def _post_unread(app: Any, content_length: int) -> tuple[int, int]:
    """POST ``/mcp`` straight into the ASGI ``app`` declaring ``content_length``.

    Returns the response status and how many times the app called ``receive``:
    0 means it answered before reading any of the body.
    """
    reads = 0
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        nonlocal reads
        reads += 1
        return {"type": "http.request", "body": b" " * 65536, "more_body": True}

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/mcp",
        "raw_path": b"/mcp",
        "query_string": b"",
        "root_path": "",
        "headers": [
            (b"host", b"127.0.0.1:8765"),
            (b"content-type", b"application/json"),
            (b"accept", b"application/json, text/event-stream"),
            (b"content-length", str(content_length).encode()),
        ],
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8765),
    }
    asyncio.run(app(scope, receive, send))
    starts = [m for m in sent if m["type"] == "http.response.start"]
    assert len(starts) == 1, sent
    return starts[0]["status"], reads


def _section(text: str, title: str) -> str | None:
    """The Markdown section headed ``## title`` or ``### title``, up to the next
    heading of the same or a higher level; ``None`` when there is none."""
    heading = re.search(rf"^(#{{2,3}}) {re.escape(title)}[ \t]*$", text, re.M)
    if heading is None:
        return None
    rest = text[heading.end() :]
    end = re.search(rf"^#{{1,{len(heading.group(1))}}} ", rest, re.M)
    return rest[: end.start()] if end else rest


# --- AC-1: the dependencies ------------------------------------------------


def test_mcp_and_httpx2_are_pinned_runtime_dependencies_and_httpx_stays_dev_only() -> None:
    # [P1] AC-1. Current on PyPI on 2026-11-19: mcp 2.3.0, httpx2 2.16.2.
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    runtime = {
        Requirement(e).name.lower(): Requirement(e) for e in pyproject["project"]["dependencies"]
    }
    dev = {Requirement(e).name.lower() for e in pyproject["dependency-groups"]["dev"]}
    assert {"mcp", "httpx2"} <= runtime.keys(), sorted(runtime)
    for name, current, below, above in (
        ("mcp", "2.3.0", "2.2.999", "2.4.0"),
        ("httpx2", "2.16.2", "2.15.999", "2.17.0"),
    ):
        spec = runtime[name].specifier
        assert spec.contains(current), f"{name} {spec} refuses {current}"
        assert not spec.contains(below) and not spec.contains(above), f"{name} {spec}"
        assert name not in dev
    assert "httpx" not in runtime
    assert "httpx" in dev

    lock = tomllib.loads((BACKEND_ROOT / "uv.lock").read_text(encoding="utf-8"))
    locked = {p["name"]: p for p in lock["package"]}
    for name, current, series in (("mcp", "2.3.0", (2, 3)), ("httpx2", "2.16.2", (2, 16))):
        version = Version(locked[name]["version"])
        assert version >= Version(current) and version.release[:2] == series, (name, version)
    bookvie_deps = {d["name"] for d in locked["bookvie"]["dependencies"]}
    assert {"mcp", "httpx2"} <= bookvie_deps
    assert "httpx" not in bookvie_deps


# --- AC-2: mounted at exactly /mcp, in both modes ---------------------------


def _start(data_dir: Path, *, dev: bool) -> tuple[subprocess.Popen, int]:
    sock = instance.bind_socket(0)
    port = sock.getsockname()[1]
    sock.close()
    cmd = [sys.executable, "-m", "bookvie.cli", "--no-browser", "--port", str(port)]
    cmd += ["--data-dir", str(data_dir), *(["--dev"] if dev else [])]
    server = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        wait_for_health(server, port, data_dir)
    except BaseException:
        server.kill()
        server.wait()
        raise
    return server, port


def test_a_production_and_a_dev_server_both_answer_mcp_at_exactly_slash_mcp(
    tmp_path: Path,
) -> None:
    # [P0] AC-2. Real processes, as Claude Code reaches them on 127.0.0.1:<port>/mcp.
    for mode, dev in (("production", False), ("dev", True)):
        data_dir = tmp_path / f"{mode}-library"
        server, port = _start(data_dir, dev=dev)
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
                client = McpClient(http)
                init = client.initialize()
                assert init["protocolVersion"] == PROTOCOL_VERSION, (mode, init)
                assert "tools" in init["capabilities"], (mode, init)
                assert [tool["name"] for tool in client.list_tools()] == AGENT_TOOL_NAMES
                info = client.call_tool("get_app_info")["structuredContent"]
                assert info["mode"] == mode
                assert info["dataDir"] == str(data_dir.resolve())
                assert http.post("/mcp/mcp", content=_initialize_message()).status_code == 404
        finally:
            server.terminate()
            server.wait(timeout=20)


def test_each_app_builds_its_own_stateless_json_mcp_server_and_a_restart_needs_no_new_session(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-2. Two apps open at once: a shared MCP server could run only one
    # session manager, so both answering proves each create_app built its own.
    first = connect_mcp(data_dir=tmp_path / "first")
    second = connect_mcp(data_dir=tmp_path / "second")
    for client in (first, second):
        init = client.initialize()
        assert init["protocolVersion"] == PROTOCOL_VERSION
        assert "tools" in init["capabilities"]

    # Stateless, with JSON responses: no session id, never an event stream.
    answer = first.post({"jsonrpc": "2.0", "id": 5, "method": "tools/list"})
    assert answer.status_code == 200
    assert answer.headers["content-type"].split(";")[0] == "application/json"
    assert SESSION_HEADER not in answer.headers
    assert SESSION_HEADER not in _post_initialize(second).headers

    # A restart: a new app on the same folder. The client goes on with no new
    # handshake and no session id, as Claude Code would after `bookvie` restarts.
    restarted = connect_mcp(data_dir=tmp_path / "first")
    first.http = restarted.http
    assert [tool["name"] for tool in first.list_tools()] == AGENT_TOOL_NAMES
    assert first.call_tool("get_app_info").get("isError") in (None, False)

    # Exactly /mcp: no /mcp/mcp, and /mcp is never redirected to /mcp/.
    assert first.http.post("/mcp/mcp", content=_initialize_message()).status_code == 404
    direct = _post_initialize(first)
    assert direct.status_code == 200, direct.headers


# --- AC-3: the AD-16 guard, and no SDK refusal -------------------------------


REFUSED = [
    pytest.param({"Origin": "https://evil.example"}, id="foreign-origin"),
    pytest.param({"Origin": "http://127.0.0.1:5173"}, id="vite-origin-without-dev"),
    pytest.param({"Origin": "null"}, id="null-origin"),
    pytest.param({"Host": "evil.example"}, id="foreign-host"),
    pytest.param({"Host": "127.0.0.1:8766"}, id="other-port-host"),
    pytest.param({"Sec-Fetch-Site": "cross-site"}, id="cross-site"),
    pytest.param({"Sec-Fetch-Site": "same-site"}, id="same-site"),
]

SERVED = [
    {},  # Claude Code: loopback, no Origin
    {"Origin": OWN},
    {"Origin": "http://localhost:8765"},
    {"Sec-Fetch-Site": "same-origin"},
    {"Sec-Fetch-Site": "none"},
    # AD-16 lowercases the Host; the SDK's own check would answer this with 421.
    {"Host": "LOCALHOST:8765"},
]


@pytest.mark.parametrize("headers", REFUSED)
def test_the_ad16_guard_refuses_cross_origin_mcp_requests_with_its_403(
    mcp_client: McpClient, headers: dict[str, str]
) -> None:
    # [P0] AC-3.
    refused = _post_initialize(mcp_client, headers)
    served = _post_initialize(mcp_client)
    assert (refused.status_code, refused.text, served.status_code) == (403, "Forbidden\n", 200)
    for extra in SERVED:
        answer = _post_initialize(mcp_client, extra)
        assert answer.status_code == 200, (extra, answer.status_code, answer.text[:200])
        assert answer.json()["result"]["protocolVersion"] == PROTOCOL_VERSION


# --- AC-4: a server prefix, and the body cap --------------------------------


def test_the_spa_never_answers_an_mcp_path_and_a_body_over_1_mb_is_refused_unread(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-4.
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<p>spa</p>")
    client = connect_mcp(static_dir=static)
    for path in ("/mcp/anything", "/mcp/", "/MCP", "/Mcp/x", "/mcp/mcp", "//mcp/x"):
        # Absolute URL: httpx would read a bare `//mcp/x` as host `mcp`, path `/x`.
        answer = client.http.get(f"{BASE_URL}{path}", follow_redirects=False)
        assert answer.status_code == 404, (path, answer.status_code)
        assert "<p>spa</p>" not in answer.text, path

    # Exactly 1 MiB is read and served; one byte more is refused.
    at_cap = _post_initialize(client, size=BODY_CAP)
    assert at_cap.status_code == 200, at_cap.text[:200]
    assert _post_initialize(client, size=BODY_CAP + 1).status_code == 413

    # Before it is read: a Content-Length over the cap is refused with no receive.
    assert _post_unread(client.http.app, 2 * BODY_CAP) == (413, 0)


# --- AC-5: the registration helper -------------------------------------------


class ProbeIntent(IntentModel):
    """The test-only tool's arguments: an int, a str, and both kinds of optional."""

    nullable: ClassVar[frozenset[str]] = frozenset({"purpose"})

    book_id: str
    page: int
    note: str | None = None
    purpose: str | None = None


PROBE_NAME = "probe_tool"


def _on_event_loop() -> bool:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True


def _probe_tool(calls: list[dict[str, Any]]) -> Any:
    """A test-only tool: the route pattern (parse, then a handler) with every outcome.

    Page 13 is refused with ``book_not_found``, page 99 raises an unexpected
    error, and any other valid page succeeds with the Book's id.
    """
    from bookvie.agent import AgentTool

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        calls.append({"state": state, "arguments": arguments, "on_event_loop": _on_event_loop()})
        intent = parse_form_intent(ProbeIntent, json.dumps(arguments))
        if intent.page == 13:
            raise book_not_found()
        if intent.page == 99:
            raise RuntimeError("the probe tool broke")
        return OkResponse(ok=True, ids={"bookId": intent.book_id})

    return AgentTool(name=PROBE_NAME, description="Test only.", model=ProbeIntent, run=run)


def _types(schema: dict[str, Any]) -> set[str]:
    """Every JSON type a property schema admits, through ``anyOf``/``oneOf``."""
    found = {schema["type"]} if isinstance(schema.get("type"), str) else set(schema.get("type", []))
    for key in ("anyOf", "oneOf"):
        for branch in schema.get(key, []):
            found |= _types(branch)
    return found


def test_the_tool_helper_advertises_the_models_schema_and_answers_like_the_routes(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P0] AC-5. A test-only tool, registered only here.
    from bookvie.agent import TOOLS

    calls: list[dict[str, Any]] = []
    client = connect_mcp(tools=(*TOOLS, _probe_tool(calls)))

    # The advertised schema is the model's, by alias, closed, no null where refused.
    schema = client.tool(PROBE_NAME)["inputSchema"]
    model = ProbeIntent.model_json_schema(by_alias=True)
    assert schema["properties"].keys() == {"bookId", "page", "note", "purpose"}
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False
    assert sorted(schema["required"]) == ["bookId", "page"]
    for key in ("bookId", "page", "purpose"):
        assert schema["properties"][key] == model["properties"][key], key
    assert _types(schema["properties"]["note"]) == {"string"}
    assert _types(schema["properties"]["purpose"]) == {"string", "null"}

    # Success: the OkResponse by alias as structured content, the same JSON as text.
    ok = client.call_tool(PROBE_NAME, {"bookId": "b1", "page": 212})
    assert ok.get("isError") in (None, False), ok
    assert ok["structuredContent"] == {"ok": True, "ids": {"bookId": "b1"}}
    assert json.loads(text_of(ok)) == ok["structuredContent"]
    (call,) = calls
    assert call["state"] is client.http.app.state
    assert call["on_event_loop"] is False

    # Neither validated nor coerced by the SDK: "212" and an extra key reach the
    # body as sent, and the model refuses them as the route's parser would.
    for sent in ({"bookId": "b1", "page": "212"}, {"bookId": "b1", "page": 212, "extra": 1}):
        refused = client.call_tool(PROBE_NAME, sent)
        assert error_of(refused) == malformed().response_body()["error"], sent
        assert calls[-1]["arguments"] == sent

    # An IntentError: the AD-9 error object, no "Error executing tool" prefix.
    refusal = client.call_tool(PROBE_NAME, {"bookId": "b1", "page": 13})
    assert error_of(refusal) == book_not_found().response_body()["error"]
    assert not text_of(refusal).startswith("Error executing tool")

    # Anything else: couldnt_save.
    broken = client.call_tool(PROBE_NAME, {"bookId": "b1", "page": 99})
    assert error_of(broken) == COULDNT_SAVE_BODY["error"]

    # One worker-thread call per tool call, never on the event loop.
    assert len(calls) == 5
    assert not any(c["on_event_loop"] for c in calls)


# --- AC-6: the tool list ------------------------------------------------------


def test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-6.
    tools = mcp_client.list_tools()
    assert [tool["name"] for tool in tools] == AGENT_TOOL_NAMES
    tool = mcp_client.tool("get_app_info")
    assert tool["description"] == APP_INFO_DESCRIPTION
    assert tool["inputSchema"]["type"] == "object"
    assert tool["inputSchema"].get("properties", {}) == {}
    assert tool["inputSchema"]["additionalProperties"] is False

    result = mcp_client.call_tool("get_app_info")
    view = mcp_client.http.get("/api/views/app-info").json()
    assert set(view) == APP_INFO_KEYS
    assert result.get("isError") in (None, False), result
    assert result["structuredContent"] == view
    assert json.loads(text_of(result)) == view
    assert view["mode"] == "production"
    assert view["dataDir"] == str(mcp_client.data_dir.resolve())


# --- AC-7: the shared fixture -------------------------------------------------


def test_the_shared_mcp_client_reaches_a_real_app_on_a_temporary_folder(
    mcp_client: McpClient, tmp_path: Path
) -> None:
    # [P1] AC-7. The fixture later stories' agent-tool tests use.
    info = mcp_client.call_tool("get_app_info")["structuredContent"]
    assert info["dataDir"] == str(mcp_client.data_dir.resolve())
    assert mcp_client.data_dir.resolve().is_relative_to(tmp_path.resolve())
    assert (mcp_client.data_dir / "library.json").is_file()
    assert mcp_client.http.app.state.store.data_dir == mcp_client.data_dir


# --- AC-9: the README ---------------------------------------------------------


def test_the_readme_says_how_to_add_bookvie_and_bookvie_dev_to_claude_code() -> None:
    # [P2] AC-9. The reconnect step's wording comes from AC-8 (Oleg's real session).
    section = _section(README.read_text(encoding="utf-8"), "Agent tools")
    assert section is not None, "no Agent tools section"
    assert (
        "claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp" in section
    )
    assert (
        "claude mcp add --transport http --scope user bookvie-dev http://127.0.0.1:8766/mcp"
        in section
    )
    assert "running" in section


# --- The spec's I/O matrix: an unknown tool -------------------------------------


@pytest.mark.parametrize("name", ["delete_book", "restore", "delete_card_note", "nope"])
def test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing(
    mcp_client: McpClient, name: str
) -> None:
    # Spec I/O matrix "Unknown tool": no tool runs, the data folder is unchanged.
    before = _tree(mcp_client.data_dir)
    mcp_client.ensure_initialized()
    body = mcp_client.rpc("tools/call", {"name": name, "arguments": {"bookId": "b1"}})
    assert "result" not in body, body
    assert body["error"]["code"] == -32602, body
    assert name in body["error"]["message"]
    assert _tree(mcp_client.data_dir) == before


def _tree(folder: Path) -> dict[str, bytes]:
    """Every file under ``folder``, by relative path, with its bytes."""
    return {
        path.relative_to(folder).as_posix(): path.read_bytes()
        for path in sorted(folder.rglob("*"))
        if path.is_file()
    }


# --- The registration helper: more of its edges ----------------------------------


class _MultiWordIntent(IntentModel):
    """A nullable and a non-nullable optional field, both with a camelCase alias."""

    nullable: ClassVar[frozenset[str]] = frozenset({"spine_color"})

    spine_color: str | None = None
    cover_note: str | None = None


def test_the_schema_matches_nullable_by_python_field_name_not_alias() -> None:
    from bookvie.agent import input_schema

    properties = input_schema(_MultiWordIntent)["properties"]
    assert properties.keys() == {"spineColor", "coverNote"}
    assert _types(properties["spineColor"]) == {"string", "null"}
    assert _types(properties["coverNote"]) == {"string"}
    assert "default" not in properties["coverNote"]


def test_a_tool_call_without_arguments_is_an_empty_object(mcp_client: McpClient) -> None:
    # MCP lets a client leave `arguments` out; the tool then gets `{}`, not `None`.
    mcp_client.ensure_initialized()
    body = mcp_client.rpc("tools/call", {"name": "get_app_info"})
    assert "error" not in body, body
    result = body["result"]
    assert result.get("isError") in (None, False), result
    assert result["structuredContent"] == mcp_client.http.get("/api/views/app-info").json()


def test_get_app_info_refuses_an_argument(mcp_client: McpClient) -> None:
    refused = mcp_client.call_tool("get_app_info", {"x": 1})
    assert error_of(refused) == malformed().response_body()["error"]


def test_two_tools_with_one_name_are_refused(tmp_path: Path) -> None:
    from bookvie.agent import GET_APP_INFO
    from bookvie.http.app import create_app

    with pytest.raises(ValueError, match="share a name"):
        create_app(tmp_path / "no-static", tools=(GET_APP_INFO, GET_APP_INFO))


class _UnserializableView(BaseModel):
    value: Any


@pytest.mark.parametrize(
    "answer",
    [
        pytest.param(lambda: {"ok": True}, id="not-a-model"),
        # A real model whose `model_dump(mode="json")` raises PydanticSerializationError.
        pytest.param(lambda: _UnserializableView(value=object()), id="model-dump-fails"),
    ],
)
def test_an_answer_that_cannot_be_serialized_is_couldnt_save(
    connect_mcp: Callable[..., McpClient], answer: Callable[[], Any]
) -> None:
    from bookvie.agent import TOOLS, AgentTool, NoArguments

    def run(state: Any, arguments: dict[str, Any]) -> Any:
        return answer()

    broken = AgentTool(name="broken_tool", description="Test only.", model=NoArguments, run=run)
    client = connect_mcp(tools=(*TOOLS, broken))
    assert error_of(client.call_tool("broken_tool")) == COULDNT_SAVE_BODY["error"]


# --- Automation (bmad-testarch-automate): the ATDD green-phase follow-ups --------


def test_an_app_whose_lifespan_never_ran_answers_no_mcp_request_and_runs_its_lifespan_once(
    tmp_path: Path,
) -> None:
    # [P2] AC-2. The session manager starts in the lifespan, and an SDK manager runs once.
    from fastapi.testclient import TestClient

    from bookvie.http.app import create_app

    app = create_app(tmp_path / "no-static", data_dir=tmp_path / "library")
    not_started = TestClient(app, base_url=BASE_URL, raise_server_exceptions=False)
    answer = _post_initialize(McpClient(not_started))
    assert answer.status_code == 500, (answer.status_code, answer.text[:200])
    assert PROTOCOL_VERSION not in answer.text

    with TestClient(app, base_url=BASE_URL) as started:
        assert _post_initialize(McpClient(started)).status_code == 200
    with pytest.raises(RuntimeError, match="only be called once"), TestClient(app):
        pass


MODERN_VERSION = "2026-07-28"
_MODERN_META = {
    "io.modelcontextprotocol/protocolVersion": MODERN_VERSION,
    "io.modelcontextprotocol/clientCapabilities": {},
}


def _post_modern(
    client: McpClient, method: str, params: dict[str, Any], *, name: str | None = None
) -> dict[str, Any]:
    """One 2026-07-28 request: no handshake, the envelope in ``_meta`` and the headers."""
    headers = {"MCP-Protocol-Version": MODERN_VERSION, "Mcp-Method": method}
    if name is not None:
        headers["Mcp-Name"] = name
    message = {
        "jsonrpc": "2.0",
        "id": 7,
        "method": method,
        "params": {**params, "_meta": _MODERN_META},
    }
    answer = client.post(message, headers=headers)
    assert answer.status_code == 200, (answer.status_code, answer.text[:300])
    assert answer.headers["content-type"].split(";")[0] == "application/json"
    assert SESSION_HEADER not in answer.headers
    return answer.json()


def test_the_2026_07_28_stateless_envelope_is_served_and_its_handshake_falls_back(
    mcp_client: McpClient,
) -> None:
    # [P2] AC-2. A newer client sends no `initialize`: every request carries its envelope.
    listed = _post_modern(mcp_client, "tools/list", {})
    assert [tool["name"] for tool in listed["result"]["tools"]] == AGENT_TOOL_NAMES
    called = _post_modern(
        mcp_client, "tools/call", {"name": "get_app_info", "arguments": {}}, name="get_app_info"
    )
    view = mcp_client.http.get("/api/views/app-info").json()
    assert called["result"]["isError"] is False, called
    assert called["result"]["structuredContent"] == view

    # An `initialize` asking for it is answered with the handshake revision instead.
    answer = mcp_client.rpc(
        "initialize",
        {
            "protocolVersion": MODERN_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "bookvie-tests", "version": "0"},
        },
    )
    assert answer["result"]["protocolVersion"] == PROTOCOL_VERSION, answer


def test_a_dev_app_serves_the_vite_origins_on_mcp_and_still_refuses_a_foreign_one(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-3. AD-16's dev origins reach /mcp only on a --dev app (REFUSED covers production).
    client = connect_mcp(dev=True)
    for origin in ("http://127.0.0.1:5173", "http://localhost:5173"):
        answer = _post_initialize(client, {"Origin": origin})
        assert answer.status_code == 200, (origin, answer.status_code)
        assert answer.json()["result"]["protocolVersion"] == PROTOCOL_VERSION
    refused = _post_initialize(client, {"Origin": "https://evil.example"})
    assert (refused.status_code, refused.text) == (403, "Forbidden\n")


@pytest.mark.parametrize("method", ["GET", "DELETE"])
@pytest.mark.parametrize("headers", REFUSED)
def test_the_guard_refuses_a_cross_origin_get_or_delete_on_mcp_too(
    mcp_client: McpClient, method: str, headers: dict[str, str]
) -> None:
    # [P1] AC-3. Not only POST: the guard answers before the MCP app sees the method.
    answer = mcp_client.http.request(
        method, "/mcp", headers={"Accept": "application/json, text/event-stream", **headers}
    )
    assert (answer.status_code, answer.text) == (403, "Forbidden\n")


def _counting_tool(calls: list[dict[str, Any]]) -> Any:
    from bookvie.agent import AgentTool, NoArguments

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        calls.append(arguments)
        return OkResponse(ok=True)

    return AgentTool(name="counting_tool", description="Test only.", model=NoArguments, run=run)


def _chunked_tool_call(size: int) -> list[bytes]:
    """A ``tools/call`` of ``counting_tool`` padded with whitespace to ``size``, in 64 KiB chunks."""
    body = json.dumps(
        {"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {"name": "counting_tool"}}
    ).encode()
    body = body[:-1] + b" " * (size - len(body)) + b"}"
    return [body[i : i + 65536] for i in range(0, len(body), 65536)]


def _post_chunked(client: McpClient, chunks: list[bytes]) -> tuple[int, int, bytes]:
    """POST ``chunks`` to ``/mcp`` with no Content-Length, on the app's own event loop.

    Returns the status, how many chunks the app read, and the response body.
    """
    app = client.http.app
    pending = list(chunks)
    reads = 0
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        nonlocal reads
        reads += 1
        chunk = pending.pop(0)
        return {"type": "http.request", "body": chunk, "more_body": bool(pending)}

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/mcp",
        "raw_path": b"/mcp",
        "query_string": b"",
        "root_path": "",
        "headers": [
            (b"host", b"127.0.0.1:8765"),
            (b"content-type", b"application/json"),
            (b"accept", b"application/json, text/event-stream"),
            (b"mcp-protocol-version", PROTOCOL_VERSION.encode()),
            (b"transfer-encoding", b"chunked"),
        ],
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8765),
    }

    async def call() -> None:
        await app(scope, receive, send)

    client.http.portal.call(call)
    (start,) = [m for m in sent if m["type"] == "http.response.start"]
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return start["status"], reads, body


def test_a_chunked_body_past_1_mb_is_refused_while_it_streams_and_no_tool_runs(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-4. No Content-Length to refuse up front: the cap counts the bytes as they come.
    calls: list[dict[str, Any]] = []
    client = connect_mcp(tools=(_counting_tool(calls),))
    client.ensure_initialized()

    over = _chunked_tool_call(4 * BODY_CAP)
    status, reads, _ = _post_chunked(client, over)
    assert status == 413
    assert reads < len(over), (reads, len(over))
    assert calls == []

    # The same call under the cap, chunked too, is served and runs the tool once.
    status, _, body = _post_chunked(client, _chunked_tool_call(BODY_CAP // 2))
    assert status == 200, body[:300]
    assert json.loads(body)["result"]["structuredContent"] == {"ok": True}
    assert calls == [{}]


def _raising_tool(error: Any) -> Any:
    from bookvie.agent import AgentTool, NoArguments

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        raise error

    return AgentTool(name="raising_tool", description="Test only.", model=NoArguments, run=run)


def _with_fields() -> Any:
    from bookvie.intents import FieldError, invalid_fields

    return invalid_fields(
        [
            FieldError(field="pages", message="Enter a whole number."),
            FieldError(field="authors.0", message="Enter an author."),
        ]
    )


def _with_duplicates() -> Any:
    from bookvie.intents import DuplicateMatch, duplicate_book

    return duplicate_book(
        [
            DuplicateMatch(title="Refactoring", authors=["Martin Fowler"], isbn=None),
            DuplicateMatch(title="Refactoring", authors=["Martin Fowler"], isbn="9780134757599"),
        ]
    )


@pytest.mark.parametrize(
    "build",
    [pytest.param(_with_fields, id="fields"), pytest.param(_with_duplicates, id="duplicates")],
)
def test_an_intent_error_with_fields_or_duplicates_comes_back_whole(
    connect_mcp: Callable[..., McpClient], build: Callable[[], Any]
) -> None:
    # [P1] AC-5. The AD-9 error object as the routes send it, `isbn: null` kept.
    error = build()
    client = connect_mcp(tools=(_raising_tool(error),))
    sent = error_of(client.call_tool("raising_tool"))
    assert sent == error.response_body()["error"]
    assert set(sent) & {"fields", "duplicates"}
    for match in sent.get("duplicates", []):
        assert "isbn" in match
    if "duplicates" in sent:
        assert sent["duplicates"][0]["isbn"] is None


def test_the_mcp_fixture_never_reaches_the_real_home_or_its_library(
    mcp_client: McpClient, tmp_path_factory: pytest.TempPathFactory
) -> None:
    # [P1] AC-7. The temp HOME (`_isolated_home`), and the app's folder is the test's own.
    import os
    import pwd

    real_home = Path(pwd.getpwuid(os.getuid()).pw_dir).resolve()
    home = Path.home().resolve()
    assert home != real_home
    assert home.is_relative_to(tmp_path_factory.getbasetemp().resolve())

    info = mcp_client.call_tool("get_app_info")["structuredContent"]
    data_dir = Path(info["dataDir"])
    assert not data_dir.is_relative_to(real_home), data_dir
    assert data_dir != home / "bookvie-data"
    assert not (home / "bookvie-data").exists()


class _UnionIntent(IntentModel):
    """Non-nullable optional fields: a two-type union, and one with a real default."""

    either: int | str | None = None
    count: int | None = 5


def test_a_union_keeps_its_other_branches_and_a_real_default_once_null_is_dropped() -> None:
    # [P2] AC-5. `_without_null` with two branches left, and a default that isn't None.
    from bookvie.agent import input_schema

    properties = input_schema(_UnionIntent)["properties"]
    either = properties["either"]
    assert sorted(branch["type"] for branch in either["anyOf"]) == ["integer", "string"]
    assert "default" not in either
    assert _types(properties["count"]) == {"integer"}
    assert properties["count"]["default"] == 5


def test_an_unexpected_failure_is_logged_with_the_tool_name(
    connect_mcp: Callable[..., McpClient], caplog: pytest.LogCaptureFixture
) -> None:
    # [P2] AC-5. Anything but an IntentError is couldnt_save, and logged with its traceback.
    client = connect_mcp(tools=(_raising_tool(RuntimeError("the tool broke")),))
    with caplog.at_level("ERROR", logger="bookvie.agent.server"):
        answer = client.call_tool("raising_tool")
    assert error_of(answer) == COULDNT_SAVE_BODY["error"]
    (record,) = [r for r in caplog.records if r.name == "bookvie.agent.server"]
    assert record.getMessage() == "agent tool raising_tool failed"
    assert record.exc_info is not None
    assert str(record.exc_info[1]) == "the tool broke"
