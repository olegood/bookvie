"""bookvie-dropbox's MCP server, over stdio, with its one tool ``upload_backup`` (AD-22).

It is the SDK's low-level ``Server``, as bookvie's own: the handler gets the
arguments as sent. A success is structured content with the same JSON as its
one text content; a failure is ``isError`` with one JSON text content
``{cause, message}``. Listing the tools needs no Keychain and no Dropbox.
"""

import json
import logging
from collections.abc import Callable
from typing import Any

import anyio
import anyio.to_thread
import mcp_types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server
from mcp.shared.exceptions import MCPError

from . import dropbox_api
from .upload import UploadRefused, upload_backup

logger = logging.getLogger(__name__)

SERVER_NAME = "bookvie-dropbox"
UPLOAD_BACKUP = "upload_backup"
UPLOAD_BACKUP_DESCRIPTION = (
    "Upload a daily backup from ~/bookvie-backups (the path export_backup returned) to "
    "bookvie's Dropbox folder, check that Dropbox's copy matches the file, and only then "
    "delete the oldest daily backups beyond 3. A failed or mismatched upload deletes nothing "
    "and returns its cause. Returns the uploaded name, the number of copies, the names deleted "
    "and the content hash; pass them to record_backup_upload."
)
"""Story 13.2's "Description:" line in epics.md, verbatim."""
UPLOAD_BACKUP_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "localPath": {
            "type": "string",
            "description": "The absolute path of a daily backup in ~/bookvie-backups.",
        }
    },
    "required": ["localPath"],
    "additionalProperties": False,
}


def _version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("bookvie")
    except PackageNotFoundError:
        return ""


def build_server(*, connect: Callable[[], Any] | None = None) -> Server:
    """A fresh server whose ``upload_backup`` gets its Dropbox client from ``connect()``
    (by default the Keychain's sign-in and the real SDK)."""
    connect_to = dropbox_api.connect if connect is None else connect
    listed = [
        mcp_types.Tool(
            name=UPLOAD_BACKUP,
            description=UPLOAD_BACKUP_DESCRIPTION,
            input_schema=UPLOAD_BACKUP_SCHEMA,
        )
    ]

    async def list_tools(ctx: Any, params: Any) -> mcp_types.ListToolsResult:
        return mcp_types.ListToolsResult(tools=listed)

    async def call_tool(
        ctx: Any, params: mcp_types.CallToolRequestParams
    ) -> mcp_types.CallToolResult:
        if params.name != UPLOAD_BACKUP:
            raise MCPError(mcp_types.INVALID_PARAMS, f"Unknown tool: {params.name}")
        arguments = params.arguments if params.arguments is not None else {}
        return await anyio.to_thread.run_sync(_answer, arguments, connect_to)

    return Server(SERVER_NAME, version=_version(), on_list_tools=list_tools, on_call_tool=call_tool)


def _answer(arguments: Any, connect: Callable[[], Any]) -> mcp_types.CallToolResult:
    if not isinstance(arguments, dict) or set(arguments) != {"localPath"}:
        return _error(
            UploadRefused("other", "upload_backup takes exactly one argument, localPath.")
        )
    try:
        body = upload_backup(arguments["localPath"], connect).answer()
    except UploadRefused as refused:
        logger.warning("upload_backup failed: %s", refused.cause)
        return _error(refused)
    except Exception as exc:  # noqa: BLE001 - reported as other, without its details
        logger.error("upload_backup failed unexpectedly: %s", type(exc).__name__)
        return _error(UploadRefused("other", f"The upload failed ({type(exc).__name__})."))
    return mcp_types.CallToolResult(
        content=[mcp_types.TextContent(text=json.dumps(body))], structured_content=body
    )


def _error(refused: UploadRefused) -> mcp_types.CallToolResult:
    text = json.dumps({"cause": refused.cause, "message": refused.message})
    return mcp_types.CallToolResult(content=[mcp_types.TextContent(text=text)], is_error=True)


def serve() -> None:
    """Serve :func:`build_server` over stdin and stdout until the client closes it."""
    server = build_server()

    async def run() -> None:
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())

    anyio.run(run)
