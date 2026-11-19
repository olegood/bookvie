"""A small MCP client for the agent-tool tests (AD-21).

It speaks the protocol's own wire format, JSON-RPC 2.0 over streamable HTTP,
through any ``httpx.Client``: a ``TestClient`` on an app built in the test
(the ``mcp_client`` and ``connect_mcp`` fixtures in ``conftest.py``) or a
plain client on a real ``bookvie`` process. It uses the handshake revision
Claude Code speaks, initializes on first use, and never follows a redirect,
so a test sees exactly what the server answers.

Every call checks the HTTP answer of a JSON-response server (200,
``application/json``) and the JSON-RPC envelope before it returns, and fails
with what came back otherwise.
"""

import json
from typing import Any

import httpx

MCP_PATH = "/mcp"
# A handshake revision: the client sends `initialize` first (MCP 2025-11-25).
PROTOCOL_VERSION = "2025-11-25"
ACCEPT = "application/json, text/event-stream"
SESSION_HEADER = "mcp-session-id"


class McpClient:
    """JSON-RPC calls to ``path`` through ``http``; see the module docstring."""

    def __init__(self, http: httpx.Client, *, path: str = MCP_PATH, data_dir=None) -> None:
        self.http = http
        self.path = path
        self.data_dir = data_dir
        """The app's data folder, when a fixture built the app."""
        self.initialized = False
        self._next_id = 0

    def post(self, message: Any, *, headers: dict[str, str] | None = None) -> httpx.Response:
        """POST one JSON-RPC message as is, with the protocol's headers plus ``headers``."""
        sent = {
            "Accept": ACCEPT,
            "Content-Type": "application/json",
            **({"MCP-Protocol-Version": PROTOCOL_VERSION} if self.initialized else {}),
            **(headers or {}),
        }
        return self.http.post(
            self.path, content=json.dumps(message), headers=sent, follow_redirects=False
        )

    def rpc(self, method: str, params: dict[str, Any] | None = None, **post: Any) -> dict[str, Any]:
        """The JSON-RPC response to one request, after checking the HTTP answer."""
        self._next_id += 1
        message: dict[str, Any] = {"jsonrpc": "2.0", "id": self._next_id, "method": method}
        if params is not None:
            message["params"] = params
        response = self.post(message, **post)
        assert response.status_code == 200, (
            f"{method}: HTTP {response.status_code} {response.headers.get('content-type')!r} "
            f"{response.text[:300]!r}"
        )
        media_type = response.headers.get("content-type", "").split(";")[0].strip()
        assert media_type == "application/json", f"{method}: {media_type!r} {response.text[:300]!r}"
        body = response.json()
        assert body.get("jsonrpc") == "2.0" and body.get("id") == self._next_id, body
        return body

    def result(self, method: str, params: dict[str, Any] | None = None, **post: Any) -> Any:
        """The ``result`` of one request; fails on a JSON-RPC ``error``."""
        if method != "initialize":
            self.ensure_initialized()
        body = self.rpc(method, params, **post)
        assert "error" not in body, f"{method}: {body['error']}"
        return body["result"]

    def initialize(self) -> dict[str, Any]:
        """The ``initialize`` handshake; returns its result."""
        result = self.result(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "bookvie-tests", "version": "0"},
            },
        )
        notified = self.post({"jsonrpc": "2.0", "method": "notifications/initialized"})
        assert notified.status_code == 202, (notified.status_code, notified.text[:300])
        self.initialized = True
        return result

    def ensure_initialized(self) -> None:
        if not self.initialized:
            self.initialize()

    def list_tools(self) -> list[dict[str, Any]]:
        """Every tool the server lists, following ``nextCursor``."""
        tools: list[dict[str, Any]] = []
        params: dict[str, Any] = {}
        while True:
            page = self.result("tools/list", params or None)
            tools.extend(page["tools"])
            cursor = page.get("nextCursor")
            if not cursor:
                return tools
            params = {"cursor": cursor}

    def tool(self, name: str) -> dict[str, Any]:
        """The listed tool called ``name``; fails when there isn't exactly one."""
        found = [tool for tool in self.list_tools() if tool["name"] == name]
        assert len(found) == 1, [tool["name"] for tool in self.list_tools()]
        return found[0]

    def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        """The ``tools/call`` result (``content``, ``structuredContent``, ``isError``)."""
        return self.result("tools/call", {"name": name, "arguments": arguments or {}})


def text_of(result: dict[str, Any]) -> str:
    """The one text content of a tool result; fails on any other shape."""
    content = result["content"]
    assert len(content) == 1 and content[0]["type"] == "text", content
    return content[0]["text"]


def error_of(result: dict[str, Any]) -> dict[str, Any]:
    """The AD-9 ``error`` object an error result carries as its one text content."""
    assert result.get("isError") is True, result
    return json.loads(text_of(result))
