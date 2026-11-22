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

A client built with ``protocol_version=MODERN_PROTOCOL_VERSION`` speaks MCP
2026-07-28 instead (Story 13.1): no ``initialize``, and every request carries
its envelope in ``params._meta`` (the protocol version and ``capabilities``)
with the ``Mcp-Method`` and ``Mcp-Name`` headers. That is the revision whose
``InputRequiredResult`` carries ``restore_backup``'s question (AD-22).

``bookvie-dropbox`` (Story 13.2) is a second MCP server, over stdio. Its tool
group is :data:`DROPBOX_TOOL_NAMES`, its descriptions are in
:data:`DESCRIPTIONS` too, and :func:`call_in_process` and
:func:`list_stdio_tools` reach it through the SDK's own ``Client``.
:func:`import_or_fail` stands in for a package a story hasn't built yet.
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
MODERN_PROTOCOL_VERSION = "2026-07-28"
"""The stateless revision: no handshake, the envelope on every request (Story 13.1)."""
PROTOCOL_VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
CLIENT_CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"
CLIENT_INFO_KEY = "io.modelcontextprotocol/clientInfo"
CLIENT_INFO = {"name": "bookvie-tests", "version": "0"}
FORM_ELICITATION: dict[str, Any] = {"elicitation": {}}
"""Client capabilities that can show a form: an empty ``elicitation`` object counts as form."""

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
LIST_LOCAL_BACKUPS = "list_local_backups"
PREVIEW_RESTORE = "preview_restore"
RESTORE_BACKUP = "restore_backup"
RESTORE_TOOL_NAMES = [LIST_LOCAL_BACKUPS, PREVIEW_RESTORE, RESTORE_BACKUP]
"""Story 13.1's three restore tools (AD-22)."""
RECORD_BACKUP_UPLOAD = "record_backup_upload"
"""Story 13.3's tool (AD-22), listed after the restore tools."""
EPIC_12_TOOL_NAMES = [*EARLIER_TOOL_NAMES, *WRITE_TOOL_NAMES, *BOOK_TOOL_NAMES, EXPORT_BACKUP]
"""Every tool Epic 12 added."""
AGENT_TOOL_NAMES = [*EPIC_12_TOOL_NAMES, *RESTORE_TOOL_NAMES, RECORD_BACKUP_UPLOAD]
"""Every tool, cumulative across Epics 12 and 13: what ``tools/list`` must list, in order."""

UPLOAD_BACKUP = "upload_backup"
DROPBOX_TOOL_NAMES = [UPLOAD_BACKUP]
"""``bookvie-dropbox``'s tools, cumulative (Story 13.2; Story 13.7 adds ``list_backups`` and
``download_backup``): what its stdio server must list, in order. Not bookvie's tools."""

EPICS_MD = Path(__file__).resolve().parents[2] / "_bmad-output" / "planning-artifacts" / "epics.md"
# A note in parentheses may follow the quote ("(Superseded by Story 13.3's description once
# 13.3 lands.)" on Story 12.6's line), or come before it ("(replaces Story 12.6's, and the
# description test reads this one)" on Story 13.3's); it isn't part of the description.
_DESCRIPTION = re.compile(
    r'^(?:- `(\w+)` )?\*\*Description:\*\* (?:\([^"]*\) )?"(.+)"(?: \([^"]*\))?$', re.M
)
_ADDITION = re.compile(
    r'^\*\*Description addition:\*\* both tools\' descriptions end with: "(.+)"$', re.M
)


def _epic(number: int) -> str:
    """Epic ``number``'s section of ``epics.md``: from its heading to the next epic's."""
    text = EPICS_MD.read_text(encoding="utf-8")
    start = text.index(f"\n## Epic {number}:")
    end = text.find("\n## Epic ", start + 1)
    return text[start : end if end != -1 else len(text)]


# The story whose section of epics.md holds each tool's "Description:" line, in Epic 12.
_STORY_OF = {
    "get_app_info": "12.1",
    **dict.fromkeys(EARLIER_TOOL_NAMES[1:], "12.2"),
    **dict.fromkeys(WRITE_TOOL_NAMES, "12.3"),
    **dict.fromkeys(BOOK_TOOL_NAMES, "12.4"),
    EXPORT_BACKUP: "12.6",
}
# Epic 13's described tools, from both servers, in the order epics.md quotes them, each with
# its story. Story 13.3 quotes export_backup again: its line replaces Story 12.6's.
_EPIC_13_STORY_OF = {
    **dict.fromkeys(RESTORE_TOOL_NAMES, "13.1"),
    UPLOAD_BACKUP: "13.2",
    EXPORT_BACKUP: "13.3",
    RECORD_BACKUP_UPLOAD: "13.3",
}
_EPIC_13_DESCRIBED = list(_EPIC_13_STORY_OF)
_STORY_HEADING = re.compile(r"^### Story (\d+\.\d+):", re.M)


def _story_at(epic: str, offset: int) -> str | None:
    """The number of the ``### Story N.x`` section that holds ``offset``."""
    headings = [m for m in _STORY_HEADING.finditer(epic) if m.start() < offset]
    return headings[-1].group(1) if headings else None


def _parse_descriptions() -> dict[str, str]:
    """Each tool's description, as ``epics.md`` quotes it; fails, saying why, on another shape.

    The "Description:" lines come in tool-list order, each in its tool's story;
    a bulleted one also names its tool. Story 12.5's "Description addition"
    ends both book tools' descriptions. Every Epic 12 line is a bookvie tool's.
    Epic 13 also quotes the ``bookvie-dropbox`` server's tools, and stories not
    built yet, so only the lines in the stories that added a listed tool count.
    An Epic 13 line for an Epic 12 tool (Story 13.3's ``export_backup``) replaces it.
    """
    epic = _epic(12)
    found = list(_DESCRIPTION.finditer(epic))
    assert len(found) == len(EPIC_12_TOOL_NAMES), (
        f"{EPICS_MD} Epic 12 has {len(found)} Description lines, expected {len(EPIC_12_TOOL_NAMES)}: "
        f"{[m.group(1) or m.group(2)[:40] for m in found]}"
    )
    epic_13 = _epic(13)
    stories_13 = set(_EPIC_13_STORY_OF.values())
    found_13 = [
        match
        for match in _DESCRIPTION.finditer(epic_13)
        if _story_at(epic_13, match.start()) in stories_13
    ]
    assert len(found_13) == len(_EPIC_13_DESCRIBED), (
        f"{EPICS_MD} Epic 13 Stories {sorted(stories_13)} have {len(found_13)} Description lines, "
        f"expected {len(_EPIC_13_DESCRIBED)}: {[m.group(1) or m.group(2)[:40] for m in found_13]}"
    )
    descriptions: dict[str, str] = {}
    pairs = [
        *(
            (tool, match, epic, _STORY_OF)
            for tool, match in zip(EPIC_12_TOOL_NAMES, found, strict=True)
        ),
        *(
            (tool, match, epic_13, _EPIC_13_STORY_OF)
            for tool, match in zip(_EPIC_13_DESCRIBED, found_13, strict=True)
        ),
    ]
    for tool, match, section, story_of in pairs:
        named, text = match.group(1), match.group(2)
        assert named in (None, tool), f"{tool}'s Description line names {named}"
        story = _story_at(section, match.start())
        assert story == story_of[tool], (
            f"{tool}'s Description line is in Story {story}, expected {story_of[tool]}"
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
"""Every tool's description, character for character (``epics.md``, "Tool descriptions"
in Epics 12 and 13), with Story 12.5's sentence ending ``add_book``'s and ``edit_book``'s,
and ``export_backup``'s from Story 13.3, which replaces Story 12.6's."""


class McpClient:
    """JSON-RPC calls to ``path`` through ``http``; see the module docstring.

    ``protocol_version`` is the revision it speaks: a handshake revision
    (:data:`PROTOCOL_VERSION` by default, as before) or
    :data:`MODERN_PROTOCOL_VERSION`. ``capabilities`` are the client
    capabilities it declares, in ``initialize`` or in each modern request's
    envelope; none by default.
    """

    def __init__(
        self,
        http: httpx.Client,
        *,
        path: str = MCP_PATH,
        data_dir=None,
        protocol_version: str = PROTOCOL_VERSION,
        capabilities: dict[str, Any] | None = None,
    ) -> None:
        self.http = http
        self.path = path
        self.data_dir = data_dir
        """The app's data folder, when a fixture built the app."""
        self.protocol_version = protocol_version
        self.capabilities: dict[str, Any] = dict(capabilities or {})
        self.modern = protocol_version == MODERN_PROTOCOL_VERSION
        """No handshake: the envelope goes on every request."""
        self.initialized = False
        self._next_id = 0

    def speaking(
        self, protocol_version: str, capabilities: dict[str, Any] | None = None
    ) -> McpClient:
        """Another client on the same app, speaking ``protocol_version`` with ``capabilities``."""
        return McpClient(
            self.http,
            path=self.path,
            data_dir=self.data_dir,
            protocol_version=protocol_version,
            capabilities=capabilities,
        )

    def post(self, message: Any, *, headers: dict[str, str] | None = None) -> httpx.Response:
        """POST one JSON-RPC message as is, with the protocol's headers plus ``headers``."""
        versioned = self.initialized or self.modern
        sent = {
            "Accept": ACCEPT,
            "Content-Type": "application/json",
            **({"MCP-Protocol-Version": self.protocol_version} if versioned else {}),
            **(headers or {}),
        }
        return self.http.post(
            self.path, content=json.dumps(message), headers=sent, follow_redirects=False
        )

    def rpc(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        *,
        error_status: bool = False,
        **post: Any,
    ) -> dict[str, Any]:
        """The JSON-RPC response to one request, after checking the HTTP answer.

        A 2026-07-28 server maps a JSON-RPC error to an HTTP status (an unknown
        tool is 400); ``error_status`` accepts a 4xx whose body is such an error.
        """
        self._next_id += 1
        message: dict[str, Any] = {"jsonrpc": "2.0", "id": self._next_id, "method": method}
        if self.modern:
            params = {
                **(params or {}),
                "_meta": {
                    PROTOCOL_VERSION_KEY: self.protocol_version,
                    CLIENT_CAPABILITIES_KEY: self.capabilities,
                    CLIENT_INFO_KEY: CLIENT_INFO,
                },
            }
            headers = {"Mcp-Method": method, **(post.pop("headers", None) or {})}
            if method == "tools/call":
                headers["Mcp-Name"] = params["name"]
            post["headers"] = headers
        if params is not None:
            message["params"] = params
        response = self.post(message, **post)
        refused = error_status and 400 <= response.status_code < 500
        assert response.status_code == 200 or refused, (
            f"{method}: HTTP {response.status_code} {response.headers.get('content-type')!r} "
            f"{response.text[:300]!r}"
        )
        media_type = response.headers.get("content-type", "").split(";")[0].strip()
        assert media_type == "application/json", f"{method}: {media_type!r} {response.text[:300]!r}"
        body = response.json()
        assert body.get("jsonrpc") == "2.0" and body.get("id") == self._next_id, body
        assert response.status_code == 200 or "error" in body, (response.status_code, body)
        return body

    def result(self, method: str, params: dict[str, Any] | None = None, **post: Any) -> Any:
        """The ``result`` of one request; fails on a JSON-RPC ``error``."""
        if method != "initialize" and not self.modern:
            self.ensure_initialized()
        body = self.rpc(method, params, **post)
        assert "error" not in body, f"{method}: {body['error']}"
        return body["result"]

    def initialize(self) -> dict[str, Any]:
        """The ``initialize`` handshake; returns its result."""
        result = self.result(
            "initialize",
            {
                "protocolVersion": self.protocol_version,
                "capabilities": self.capabilities,
                "clientInfo": CLIENT_INFO,
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

    def call_tool(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
        *,
        input_responses: dict[str, Any] | None = None,
        request_state: str | None = None,
    ) -> dict[str, Any]:
        """The ``tools/call`` result (``content``, ``structuredContent``, ``isError``).

        ``input_responses`` and ``request_state`` answer a 2026-07-28
        ``InputRequiredResult`` (sent only when given): its ``inputRequests``
        answered by key, and its ``requestState`` echoed byte for byte.
        """
        return self.result(
            "tools/call", self.call_params(name, arguments, input_responses, request_state)
        )

    @staticmethod
    def call_params(
        name: str,
        arguments: dict[str, Any] | None = None,
        input_responses: dict[str, Any] | None = None,
        request_state: str | None = None,
    ) -> dict[str, Any]:
        """The ``tools/call`` params, with the retry's fields only when given."""
        params: dict[str, Any] = {"name": name, "arguments": arguments or {}}
        if input_responses is not None:
            params["inputResponses"] = input_responses
        if request_state is not None:
            params["requestState"] = request_state
        return params

    def answer(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
        *,
        input_responses: dict[str, Any] | None = None,
        request_state: str | None = None,
    ) -> dict[str, Any]:
        """A ``tools/call``'s ``result``, or ``{"rpcError": ...}`` for a JSON-RPC error.

        Unlike :meth:`call_tool` it doesn't fail on an unknown tool, so a
        red-phase leaf reaches its criterion assertion first.
        """
        if not self.modern:
            self.ensure_initialized()
        body = self.rpc(
            "tools/call",
            self.call_params(name, arguments, input_responses, request_state),
            error_status=True,
        )
        return {"rpcError": body["error"]} if "error" in body else body["result"]


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


# --- bookvie-dropbox's server (Story 13.2) -----------------------------------------


def _result_dict(result: Any) -> dict[str, Any]:
    """An SDK result model as the JSON the wire carries, by alias, without ``None``s."""
    return result.model_dump(by_alias=True, mode="json", exclude_none=True)


def call_in_process(server: Any, tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Call ``tool`` on an in-process MCP ``server`` (``mcp.Client(server)``) and return the
    result as wire JSON, for :func:`structured_of` and :func:`error_of`.

    ``server`` may be an :class:`ImportFailed` (the package isn't there yet); the
    answer is then an error result naming why, so a red leaf fails at its first
    assertion rather than here.
    """
    if isinstance(server, ImportFailed):
        return {
            "isError": True,
            "content": [{"type": "text", "text": json.dumps({"unavailable": str(server)})}],
        }

    import anyio
    from mcp import Client

    async def call() -> dict[str, Any]:
        async with Client(server, raise_exceptions=True) as client:
            return _result_dict(await client.call_tool(tool, arguments))

    return anyio.run(call)


def list_stdio_tools(command: str, args: list[str], env: dict[str, str]) -> dict[str, Any]:
    """Start ``command args`` as a stdio MCP server with exactly ``env`` added to the SDK's
    default environment, list its tools, and stop it.

    Returns ``{"tools": [tool, ...]}`` (each a wire-JSON ``Tool``), or ``{"error": why}``
    when the server can't be started or listed, so a red leaf fails at its assertion.
    """
    import anyio
    from mcp import Client, StdioServerParameters

    async def listed() -> dict[str, Any]:
        params = StdioServerParameters(command=command, args=args, env=env)
        async with Client(params, read_timeout_seconds=30) as client:
            result = await client.list_tools()
            return {"tools": [_result_dict(tool) for tool in result.tools]}

    try:
        return anyio.run(listed)
    except Exception as exc:  # noqa: BLE001 - reported to the assertion
        return {"error": f"{type(exc).__name__}: {exc}"}


class ImportFailed:
    """What :func:`import_or_fail` returns for a module that can't be imported: any
    attribute read fails the test with an ``AssertionError`` that names the module."""

    def __init__(self, name: str, error: BaseException) -> None:
        self._name = name
        self._error = error

    def __getattr__(self, attribute: str) -> Any:
        raise AssertionError(f"{self._name}.{attribute}: {self}")

    def __str__(self) -> str:
        return f"{self._name} can't be imported: {type(self._error).__name__}: {self._error}"


def import_or_fail(name: str) -> Any:
    """Module ``name``, or an :class:`ImportFailed` standing in for it.

    For a package a story adds (``bookvie_dropbox``): the red leaf's first read of
    it is then its first failing assertion, not a collection error.
    """
    import importlib

    try:
        return importlib.import_module(name)
    except ImportError as exc:
        return ImportFailed(name, exc)
