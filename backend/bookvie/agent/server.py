"""The MCP server the agent tools are served from (AD-21).

It is the SDK's low-level ``Server``: its handlers get the arguments as sent,
so no SDK model validates or coerces them, and an error is never wrapped as
"Error executing tool". Each call to :func:`build_mcp_server` builds a new
one, since an SDK session manager runs only once.

Answers follow the intent and view routes: an ``OkResponse`` without its
``None`` fields, a view as is, both by alias as structured content with the
same JSON as the one text content; an answer that isn't a JSON object is
refused as unexpected. An ``IntentError`` is ``isError`` with
the AD-9 ``error`` object as JSON; anything else is ``couldnt_save``.

An interactive tool (``restore_backup``) also gets the call's
:class:`~bookvie.agent.tool_base.ToolCall`, and its ``InputRequiredResult`` is
passed through unchanged.
"""

import json
import logging
from collections.abc import Mapping, Sequence
from typing import Any

import anyio.to_thread
import mcp_types
from mcp.server.lowlevel import Server
from mcp.shared.exceptions import MCPError
from pydantic import BaseModel

from bookvie.intents import IntentError, OkResponse, couldnt_save

from .tool_base import AgentTool, ToolCall, advertised_schema

logger = logging.getLogger(__name__)

SERVER_NAME = "bookvie"


def build_mcp_server(state: Any, tools: Sequence[AgentTool], *, version: str = "") -> Server:
    """A fresh MCP server listing ``tools``, each run against ``state`` (``app.state``)."""
    by_name = {tool.name: tool for tool in tools}
    if len(by_name) != len(tools):
        raise ValueError("two agent tools share a name")
    listed = [
        mcp_types.Tool(
            name=tool.name, description=tool.description, input_schema=advertised_schema(tool)
        )
        for tool in tools
    ]

    async def list_tools(ctx: Any, params: Any) -> mcp_types.ListToolsResult:
        return mcp_types.ListToolsResult(tools=listed)

    async def call_tool(
        ctx: Any, params: mcp_types.CallToolRequestParams
    ) -> mcp_types.CallToolResult | mcp_types.InputRequiredResult:
        tool = by_name.get(params.name)
        if tool is None:
            raise MCPError(mcp_types.INVALID_PARAMS, f"Unknown tool: {params.name}")
        arguments = params.arguments if params.arguments is not None else {}
        call = _tool_call(ctx, params) if tool.interactive else None
        # One worker-thread call: handlers block on the AD-4 write lock.
        return await anyio.to_thread.run_sync(_answer, tool, state, arguments, call)

    return Server(SERVER_NAME, version=version, on_list_tools=list_tools, on_call_tool=call_tool)


def _tool_call(ctx: Any, params: mcp_types.CallToolRequestParams) -> ToolCall:
    """The call as an interactive tool sees it: the envelope's protocol version and client
    capabilities, and a retry's answers (each as its JSON object) and request state."""
    meta = getattr(ctx, "meta", None)
    capabilities = (
        meta.get(mcp_types.CLIENT_CAPABILITIES_META_KEY) if isinstance(meta, Mapping) else None
    )
    responses = None
    if params.input_responses is not None:
        responses = {
            key: response.model_dump(mode="json", by_alias=True, exclude_none=True)
            for key, response in params.input_responses.items()
        }
    return ToolCall(
        protocol_version=getattr(ctx, "protocol_version", None),
        capabilities=capabilities if isinstance(capabilities, Mapping) else None,
        input_responses=responses,
        request_state=params.request_state,
    )


def _answer(
    tool: AgentTool, state: Any, arguments: dict[str, Any], call: ToolCall | None = None
) -> mcp_types.CallToolResult | mcp_types.InputRequiredResult:
    try:
        result = (
            tool.run(state, arguments, call) if tool.interactive else tool.run(state, arguments)
        )
        if isinstance(result, mcp_types.InputRequiredResult):
            # The question goes out unchanged: the client answers it and retries.
            return result
        return _success(result)
    except IntentError as err:
        return _error(err)
    except Exception:
        logger.exception("agent tool %s failed", tool.name)
        return _error(couldnt_save(500))


def _success(result: BaseModel) -> mcp_types.CallToolResult:
    # The intent routes leave out None (`response_model_exclude_none`); the view routes keep it.
    body = result.model_dump(
        mode="json", by_alias=True, exclude_none=isinstance(result, OkResponse)
    )
    if not isinstance(body, dict):
        # MCP structured content is a JSON object; a list or scalar view is a bug (AD-21).
        raise TypeError(f"an agent tool answered a {type(body).__name__}, not an object")
    return mcp_types.CallToolResult(
        content=[mcp_types.TextContent(text=json.dumps(body))], structured_content=body
    )


def _error(err: IntentError) -> mcp_types.CallToolResult:
    text = json.dumps(err.response_body()["error"])
    return mcp_types.CallToolResult(content=[mcp_types.TextContent(text=text)], is_error=True)
