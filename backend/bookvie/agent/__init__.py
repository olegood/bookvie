"""agent layer: the MCP tools served at ``/mcp`` (AD-21).

Named ``agent`` so it isn't confused with the SDK's ``mcp``. It imports only
``intents`` and ``views``, never ``http``.
"""

from .backup_tools import ExportBackupArguments
from .read_tools import GET_APP_INFO
from .restore_gate import RestoreGate
from .server import build_mcp_server
from .tool_base import (
    AgentTool,
    NoArguments,
    ToolCall,
    advertised_schema,
    input_schema,
    parse_arguments,
    parse_view_arguments,
)
from .tools import TOOLS

__all__ = [
    "GET_APP_INFO",
    "TOOLS",
    "AgentTool",
    "ExportBackupArguments",
    "NoArguments",
    "RestoreGate",
    "ToolCall",
    "advertised_schema",
    "build_mcp_server",
    "input_schema",
    "parse_arguments",
    "parse_view_arguments",
]
