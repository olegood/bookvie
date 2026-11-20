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

It is also the one home of what every agent test shares (Epic 12 retro item
87): the cumulative tool list and its story groups, each tool's description
read from ``epics.md`` on first use (the text the tool must register), and the readers of
a tool's answer, :func:`structured_of` and :func:`error_of`.
"""

import functools
import json
import re
from collections.abc import Iterator, Mapping
from pathlib import Path
from typing import Any

import httpx

MCP_PATH = "/mcp"
# A handshake revision: the client sends `initialize` first (MCP 2025-11-25).
PROTOCOL_VERSION = "2025-11-25"
ACCEPT = "application/json, text/event-stream"
SESSION_HEADER = "mcp-session-id"

# The tool list, in the order the server lists it, by the story that added each group.
EARLIER_TOOL_NAMES = [
    "get_app_info",  # Story 12.1
    "find_book",  # Story 12.2, through get_stats
    "get_book",
    "list_catalog",
    "get_card_notes",
    "get_home",
    "get_stats",
]
"""Stories 12.1's and 12.2's tools."""
WRITE_TOOL_NAMES = [
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
]
"""Story 12.3's ten write tools."""
BOOK_TOOL_NAMES = ["add_book", "edit_book"]
"""Story 12.4's two tools (Story 12.5 adds ``coverUrl`` to both)."""
EXPORT_BACKUP = "export_backup"
"""Story 12.6's tool."""
AGENT_TOOL_NAMES = [*EARLIER_TOOL_NAMES, *WRITE_TOOL_NAMES, *BOOK_TOOL_NAMES, EXPORT_BACKUP]
"""Every tool, cumulative across Epic 12: what ``tools/list`` must list, in order."""

EPICS_MD = Path(__file__).resolve().parents[2] / "_bmad-output" / "planning-artifacts" / "epics.md"
_DESCRIPTION = re.compile(r'^(?:- `(\w+)` )?\*\*Description:\*\* "(.+)"$', re.M)
_ADDITION = re.compile(
    r'^\*\*Description addition:\*\* both tools\' descriptions end with: "(.+)"$', re.M
)


def _epic_12() -> str:
    """Epic 12's section of ``epics.md``: from its heading to the next epic's."""
    text = EPICS_MD.read_text(encoding="utf-8")
    start = text.index("\n## Epic 12:")
    end = text.find("\n## Epic ", start + 1)
    return text[start : end if end != -1 else len(text)]


# The story whose section of epics.md holds each tool's "Description:" line.
_STORY_OF = {
    "get_app_info": "12.1",
    **dict.fromkeys(EARLIER_TOOL_NAMES[1:], "12.2"),
    **dict.fromkeys(WRITE_TOOL_NAMES, "12.3"),
    **dict.fromkeys(BOOK_TOOL_NAMES, "12.4"),
    EXPORT_BACKUP: "12.6",
}
_STORY_HEADING = re.compile(r"^### Story (12\.\d+):", re.M)


def _story_at(epic: str, offset: int) -> str | None:
    """The number of the ``### Story 12.x`` section that holds ``offset``."""
    headings = [m for m in _STORY_HEADING.finditer(epic) if m.start() < offset]
    return headings[-1].group(1) if headings else None


def _parse_descriptions() -> dict[str, str]:
    """Each tool's description, as ``epics.md`` quotes it; fails, saying why, on another shape.

    The "Description:" lines come in tool-list order, each in its tool's story;
    a bulleted one also names its tool. Story 12.5's "Description addition"
    ends both book tools' descriptions.
    """
    epic = _epic_12()
    found = list(_DESCRIPTION.finditer(epic))
    assert len(found) == len(AGENT_TOOL_NAMES), (
        f"{EPICS_MD} Epic 12 has {len(found)} Description lines, expected {len(AGENT_TOOL_NAMES)}: "
        f"{[m.group(1) or m.group(2)[:40] for m in found]}"
    )
    descriptions: dict[str, str] = {}
    for tool, match in zip(AGENT_TOOL_NAMES, found, strict=True):
        named, text = match.group(1), match.group(2)
        assert named in (None, tool), f"{tool}'s Description line names {named}"
        story = _story_at(epic, match.start())
        assert story == _STORY_OF[tool], (
            f"{tool}'s Description line is in Story {story}, expected {_STORY_OF[tool]}"
        )
        descriptions[tool] = text
    additions = _ADDITION.findall(epic)
    assert len(additions) == 1, (
        f"{EPICS_MD} Epic 12 has {len(additions)} Description additions, expected 1"
    )
    for tool in BOOK_TOOL_NAMES:
        descriptions[tool] = f"{descriptions[tool]} {additions[0]}"
    return descriptions


class _Descriptions(Mapping[str, str]):
    """Read ``epics.md`` on first use, not at import: ``conftest.py`` imports this
    module, so a parse failure fails only the tests that read a description."""

    @functools.cached_property
    def _parsed(self) -> dict[str, str]:
        return _parse_descriptions()

    def __getitem__(self, tool: str) -> str:
        return self._parsed[tool]

    def __iter__(self) -> Iterator[str]:
        return iter(self._parsed)

    def __len__(self) -> int:
        return len(self._parsed)


DESCRIPTIONS: Mapping[str, str] = _Descriptions()
"""Every tool's description, character for character (``epics.md``, "Tool descriptions"),
with Story 12.5's sentence ending ``add_book``'s and ``edit_book``'s."""


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


def structured_of(result: dict[str, Any]) -> Any:
    """A successful tool result's structured content, after checking its text is the same JSON."""
    assert result.get("isError") is not True, result
    structured = result["structuredContent"]
    assert json.loads(text_of(result)) == structured, (text_of(result)[:300], structured)
    return structured


def error_of(result: dict[str, Any]) -> dict[str, Any]:
    """The AD-9 ``error`` object an error result carries as its one text content."""
    assert result.get("isError") is True, result
    return json.loads(text_of(result))
