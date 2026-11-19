"""agent layer: the MCP tools served at ``/mcp`` (AD-21).

Named ``agent`` so it isn't confused with the SDK's ``mcp``. It imports only
``intents`` and ``views``, never ``http``.
"""

from .server import build_mcp_server
from .tools import GET_APP_INFO, TOOLS, AgentTool, NoArguments, input_schema, parse_arguments

__all__ = [
    "GET_APP_INFO",
    "TOOLS",
    "AgentTool",
    "NoArguments",
    "build_mcp_server",
    "input_schema",
    "parse_arguments",
]
