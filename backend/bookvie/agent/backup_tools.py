"""The backup and restore tools (AD-21, AD-22).

``export_backup`` (Story 12.6) writes a dated backup of the library, the
same zip as ``GET /api/export``, into the app's ``backups_dir`` through
:func:`~bookvie.intents.write_backup`, records it as "Last export", and
answers the file's ``{path, size, createdAt, libraryHash,
unchangedSinceUpload}``. Its one optional argument, ``forUpload`` (Story
13.3), is sent only by a Dropbox backup run (the ``bookvie-backup`` skill):
the file is written the same way, but "Last export" doesn't move.

``record_backup_upload`` (Story 13.3, AD-22), listed last, stores how a
Dropbox backup run ended (uploaded, skipped or failed) in ``local-state.json``
under ``autoBackup`` through :func:`~bookvie.intents.record_backup_upload`,
and answers ``{ok: true}``. A bad argument is ``invalid_fields`` naming it,
and nothing is stored.

The restore tools (Story 13.1, AD-22) read the app's ``backups_dir``.
``list_local_backups`` lists the backups a restore can use;
``preview_restore(path)`` says what restoring one would lose, changing
nothing; ``restore_backup(path)`` is the one interactive tool: it gets the
call's :class:`ToolCall` and asks the user itself, through form elicitation
(:mod:`bookvie.agent.restore_gate`), before it restores. Its checks run in
this order: the arguments; ``unsupported`` (a client below MCP 2026-07-28, or
without form elicitation), before anything is read; the allowed path; then
the question, or, on the retry, the token, the answer and the restore.
"""

import copy
from collections.abc import Mapping
from typing import Any

import mcp_types
from pydantic import BaseModel

from bookvie.intents import (
    BackupFile,
    OkResponse,
    RecordBackupUploadArguments,
    RestoreNotConfirmedReason,
    Sealed,
    apply_confirmed_restore,
    list_local_backups,
    prepare_restore,
    record_backup_upload,
    resolve_backup_path,
    restore_not_confirmed,
    write_backup,
)
from bookvie.intents.intent_model import IntentModel

from .restore_gate import confirmation_text, elicitation_supported
from .tool_base import AgentTool, NoArguments, ToolCall, parse_view_arguments


class ExportBackupArguments(IntentModel):
    # A comment, not a docstring: a model's docstring becomes its input schema's description.
    for_upload: bool = False


def _export_backup(state: Any, arguments: dict[str, Any]) -> BackupFile:
    args = parse_view_arguments(ExportBackupArguments, arguments)
    return write_backup(state.store, state.clock, state.backups_dir, for_upload=args.for_upload)


EXPORT_BACKUP = AgentTool(
    name="export_backup",
    description=(
        "Write a dated backup of the whole library (library.json and covers, the same file as the "
        "Backup page's Export) to the backups folder, and return its path, size, time, "
        "libraryHash and unchangedSinceUpload. A second backup on the same day replaces that "
        "day's file. It counts as the library's last export, except when forUpload is true, "
        "which only a Dropbox backup run sends."
    ),
    model=ExportBackupArguments,
    run=_export_backup,
)


class PathArguments(IntentModel):
    # A comment, not a docstring: a model's docstring becomes its input schema's description.
    path: str


def _list_local_backups(state: Any, arguments: dict[str, Any]) -> BaseModel:
    parse_view_arguments(NoArguments, arguments)
    return list_local_backups(state.backups_dir)


LIST_LOCAL_BACKUPS = AgentTool(
    name="list_local_backups",
    description=(
        "The backups on this computer that a restore can use, newest first: the daily backups, "
        "the safety copies saved before a restore, and the backups downloaded from Dropbox. Each "
        "has its path, its kind (daily, safety or from_dropbox), the time the backup was made, its "
        "size and its Dropbox content hash. Show them to the user and let the user pick; never "
        "pick one yourself."
    ),
    model=NoArguments,
    run=_list_local_backups,
)


def _preview_restore(state: Any, arguments: dict[str, Any]) -> BaseModel:
    args = parse_view_arguments(PathArguments, arguments)
    path, _kind = resolve_backup_path(state.backups_dir, args.path)
    return prepare_restore(state.store, path).preview


PREVIEW_RESTORE = AgentTool(
    name="preview_restore",
    description=(
        "Check a backup from list_local_backups without changing anything, and say what "
        "restoring it would lose: the backup's time and counts, the current library's counts, "
        "the titles of the Books added since and the number of Card notes added since. Show this "
        "to the user before you ask about restoring. A file bookvie can't restore is refused "
        "with the same reason as the Backup page."
    ),
    model=PathArguments,
    run=_preview_restore,
)

CONFIRM_KEY = "confirm"
"""The key of ``restore_backup``'s one input request."""
CONFIRM_SCHEMA: dict[str, Any] = {"type": "object", "properties": {}}
"""The question's form: nothing to fill in, so an accept is the whole answer."""


def _restore_backup(
    state: Any, arguments: dict[str, Any], call: ToolCall
) -> BaseModel | mcp_types.InputRequiredResult:
    args = parse_view_arguments(PathArguments, arguments)
    if not elicitation_supported(call.protocol_version, call.capabilities):
        raise restore_not_confirmed(RestoreNotConfirmedReason.UNSUPPORTED)
    path, _kind = resolve_backup_path(state.backups_dir, args.path)
    gate = state.restore_gate
    if call.input_responses is None and call.request_state is None:
        prepared = prepare_restore(state.store, path)
        token = gate.seal(
            Sealed(str(path), prepared.archive_sha256, prepared.library_sha256),
            state.clock.now(),
        )
        question = mcp_types.ElicitRequest(
            params=mcp_types.ElicitRequestFormParams(
                message=confirmation_text(prepared.preview, state.clock.today()),
                requested_schema=copy.deepcopy(CONFIRM_SCHEMA),
            )
        )
        return mcp_types.InputRequiredResult(
            input_requests={CONFIRM_KEY: question}, request_state=token
        )
    sealed = gate.open(call.request_state, state.clock.now())
    answer = (call.input_responses or {}).get(CONFIRM_KEY)
    action = answer.get("action") if isinstance(answer, Mapping) else None
    if action == "decline":
        raise restore_not_confirmed(RestoreNotConfirmedReason.DECLINED)
    if action != "accept":
        raise restore_not_confirmed(RestoreNotConfirmedReason.CANCELLED)
    if sealed.path != str(path):
        raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
    return apply_confirmed_restore(state.store, state.clock, state.backups_dir, path, sealed)


RESTORE_BACKUP = AgentTool(
    name="restore_backup",
    description=(
        "Replace the whole library with a backup from list_local_backups. Call it only when the "
        "user has asked for this restore and said yes to its preview_restore summary; never on "
        "your own initiative, and never again after a refusal unless the user asks. bookvie then "
        "asks the user directly to confirm; anything but an explicit yes is restore_not_confirmed "
        "and nothing changes. Before replacing anything it saves a safety copy of the current "
        "library and returns its path."
    ),
    model=PathArguments,
    run=_restore_backup,
    interactive=True,
)


def _record_backup_upload(state: Any, arguments: dict[str, Any]) -> OkResponse:
    return record_backup_upload(state.store, state.clock, state.backups_dir, arguments)


RECORD_BACKUP_UPLOAD = AgentTool(
    name="record_backup_upload",
    description=(
        "Record how a Dropbox backup run ended, so the Backup page can show it: uploaded (with the "
        "path from export_backup, and copies and contentHash from upload_backup), skipped (when "
        "export_backup said unchangedSinceUpload), or failed (with its cause). Call it once at "
        "the end of every run, for a skip or a failure too."
    ),
    model=RecordBackupUploadArguments,
    run=_record_backup_upload,
)
