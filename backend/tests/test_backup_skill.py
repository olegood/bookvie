"""Story 13.4: ``bookvie-backup``, one skill for every backup run (AD-22, AR51, UX-DR82).

The skill (``.claude/skills/bookvie-backup/SKILL.md``) checks bookvie with
``get_app_info``, calls ``export_backup({forUpload: true})``, calls
``upload_backup`` unless ``unchangedSinceUpload``, and always ends with exactly
one ``record_backup_upload``. Its frontmatter's ``allowed-tools`` lists exactly
its four MCP tools, the list the headless ``claude -p`` run gets (Story 13.5).

Run by hand with bookvie not running, its step 1 falls back to the other
skills' start (the health check, ``bookvie --no-browser``, the ``/mcp`` probe,
reconnect), which Claude Code asks permission for. That Bash fallback is the
only place a ``curl`` or a shell command may appear, and it probes only the
``bookvie`` entry (Oleg's decision in the ATDD run, 2026-11-22).

A skill is instructions for an agent, so most of what it does is checked in
its text. The tools it chains are then driven for real: bookvie's in-process
over ``/mcp``, ``bookvie-dropbox``'s in-process over a fake Dropbox, so the
fields the skill hands from one tool to the next are the ones the tools give
and take. The real run twice by hand (AC-5) is Oleg's, recorded in the spec.
Every test runs with ``HOME`` set to a temporary folder (``conftest.py``).
"""

import importlib
import re
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents.backup_file import CAUSES
from tests.agent_client import (
    DROPBOX_TOOL_NAMES,
    EXPORT_BACKUP,
    RECORD_BACKUP_UPLOAD,
    UPLOAD_BACKUP,
    McpClient,
    error_of,
    structured_of,
)
from tests.builder import LibraryBuilder
from tests.helpers import (
    PROBE_PORTS,
    SetClock,
    check_the_older_bookvie_probe,
    curl_lines,
    failing_reasons,
    is_health_or_probe,
)
from tests.test_agent_mount import _section
from tests.test_dropbox_upload import Connect, upload

# Story 13.4's leaves, in the red phase: un-skip each one when the build starts its task.
RED = "Story 13.4 red phase: the bookvie-backup skill doesn't exist yet"

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_MD = REPO_ROOT / ".claude" / "skills" / "bookvie-backup" / "SKILL.md"
START_STEP = "Make sure bookvie is running"

BOOKVIE = "mcp__bookvie__"
DROPBOX = "mcp__bookvie-dropbox__"
SKILL_TOOLS = [
    f"{BOOKVIE}get_app_info",
    f"{BOOKVIE}{EXPORT_BACKUP}",
    f"{BOOKVIE}{RECORD_BACKUP_UPLOAD}",
    f"{DROPBOX}{UPLOAD_BACKUP}",
]
"""The skill's tools, AR51: what its frontmatter lists and ``claude -p`` is allowed (13.5)."""

# The calls, as the skill writes them (the notation epics.md uses).
EXPORT_CALL = "`export_backup({forUpload: true})`"
UPLOAD_CALL = "`upload_backup({localPath: path})`"
RECORD_UPLOADED = '`record_backup_upload({outcome: "uploaded", path, copies, contentHash})`'
RECORD_SKIPPED = '`record_backup_upload({outcome: "skipped"})`'
RECORD_FAILED = '`record_backup_upload({outcome: "failed", cause})`'

# UX-DR82's one-line reports.
UPLOADED_LINE = re.compile(r'"Uploaded [^"·]+ · [^"]+ in Dropbox, deleted [^"]+"')
SKIPPED_LINE = '"Nothing new since the last upload; skipped."'
DEV_LINE = re.compile(r"a development library is never uploaded", re.I)

NOW = datetime(2026, 11, 20, 9, 1, 36).astimezone()
"""The run's time, 09:01:36 in Madrid."""


def _skill() -> str:
    """The skill's text, or ``""`` while it doesn't exist (so a red leaf fails at its assertion)."""
    return SKILL_MD.read_text(encoding="utf-8") if SKILL_MD.is_file() else ""


def _frontmatter(text: str) -> str:
    found = re.match(r"---\n(.*?)\n---\n", text, re.S)
    return found.group(1) if found else ""


def _body(text: str) -> str:
    """The skill without its frontmatter, whose description may name the tools in any order."""
    found = re.match(r"---\n.*?\n---\n", text, re.S)
    return text[found.end() :] if found else text


def _flat(text: str) -> str:
    return " ".join(text.split())


def allowed_tools(text: str) -> list[str] | None:
    """The frontmatter's ``allowed-tools``, as names; ``None`` when the key is missing.

    Claude Code reads it as one line (names separated by commas or spaces, or a
    ``[…]`` flow list) or as a block list of ``- name`` lines.
    """
    front = _frontmatter(text)
    key = re.search(r"^allowed-tools:[ \t]*(.*)$", front, re.M)
    if key is None:
        return None
    inline = key.group(1).strip()
    if inline:
        inline = inline.removeprefix("[").removesuffix("]")
        return [
            name for name in (part.strip("'\" ") for part in re.split(r"[,\s]+", inline)) if name
        ]
    names: list[str] = []
    for line in front[key.end() :].splitlines()[1:]:
        item = re.match(r"^\s+-\s+(.+?)\s*$", line)
        if item is None:
            break
        names.append(item.group(1).strip("'\""))
    return names


@pytest.fixture
def fakes() -> Any:
    return importlib.import_module("tests.dropbox_fakes")


def _connect_default(connect_mcp: Callable[..., McpClient], home: Path) -> McpClient:
    """bookvie on ``~/bookvie-data``, writing into ``~/bookvie-backups`` (the folder
    ``upload_backup`` accepts), with one Book in it."""
    folder = home / "bookvie-data"
    builder = LibraryBuilder()
    builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(folder)
    return connect_mcp(data_dir=folder, backups_dir=home / "bookvie-backups", clock=SetClock(NOW))


# --- AC-1: the run, and its tools -----------------------------------------------------


# Un-skip when the build writes the skill's run steps and frontmatter.
@pytest.mark.skip(reason=RED)
def test_the_skill_exports_for_upload_uploads_unless_unchanged_and_always_ends_with_one_report(
    connect_mcp: Callable[..., McpClient], _isolated_home: Path, fakes: Any
) -> None:
    # [P0] AC-1
    skill = _skill()
    body = _body(skill)
    flat = _flat(body)

    # The order: check bookvie, export for upload, branch on the flag, upload.
    order = [
        flat.find(w) for w in ("`get_app_info`", EXPORT_CALL, "`unchangedSinceUpload`", UPLOAD_CALL)
    ]
    assert -1 not in order and order == sorted(order), order

    # One report, always, after the export: uploaded, skipped, or failed with a cause.
    reports = [flat.find(call) for call in (RECORD_UPLOADED, RECORD_SKIPPED, RECORD_FAILED)]
    assert -1 not in reports and min(reports) > order[1], reports
    assert re.search(r"\b[Aa]lways\b[^.]*\bexactly one `record_backup_upload`", flat), flat[:400]
    lines = body.splitlines()
    # The cause: `backup_write` when the export failed, the upload's own otherwise.
    assert any("`export_backup`" in line and "`backup_write`" in line for line in lines)
    assert any("`upload_backup`" in line and "`cause`" in line for line in lines)

    # Only MCP tools: exactly the four in the frontmatter, and no other tool named.
    assert sorted(allowed_tools(skill) or []) == sorted(SKILL_TOOLS)
    assert set(re.findall(r"mcp__[\w-]+__\w+", skill)) <= set(SKILL_TOOLS)
    # A curl only in step 1's fallback, and only the health check or the probe.
    start = _section(skill, START_STEP, numbered=True)
    assert start is not None, START_STEP
    curls = curl_lines(skill)
    assert all(is_health_or_probe(line) and line in start for line in curls), curls
    after_start = body[body.index(start) + len(start) :]
    assert re.search(r"^```(?:sh|bash|shell|console|zsh)?\n", after_start, re.M) is None
    assert "--no-browser" not in after_start

    # The chain, run for real: the fields the skill hands on are the ones the tools give.
    client = _connect_default(connect_mcp, _isolated_home)
    registered = {tool["name"] for tool in client.list_tools()}
    assert {n.removeprefix(BOOKVIE) for n in SKILL_TOOLS if n.startswith(BOOKVIE)} <= registered
    assert {n.removeprefix(DROPBOX) for n in SKILL_TOOLS if n.startswith(DROPBOX)} <= set(
        DROPBOX_TOOL_NAMES
    )
    export = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert export["unchangedSinceUpload"] is False
    uploaded = structured_of(upload(export["path"], Connect(fakes.FakeDropbox())))
    assert set(uploaded) == {"name", "copies", "deleted", "contentHash"}
    recorded = client.call_tool(
        RECORD_BACKUP_UPLOAD,
        {
            "outcome": "uploaded",
            "path": export["path"],
            "copies": uploaded["copies"],
            "contentHash": uploaded["contentHash"],
        },
    )
    assert recorded.get("isError") is not True, recorded

    again = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert again["unchangedSinceUpload"] is True
    skipped = client.call_tool(RECORD_BACKUP_UPLOAD, {"outcome": "skipped"})
    assert skipped.get("isError") is not True, skipped

    refused = error_of(upload(again["path"], Connect(fakes.FakeDropbox(fault="signin"))))
    assert refused["cause"] in CAUSES, refused
    failed = client.call_tool(
        RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": refused["cause"]}
    )
    assert failed.get("isError") is not True, failed


# --- AC-2: never from development -----------------------------------------------------


# Un-skip when the build writes the skill's dev check.
@pytest.mark.skip(reason=RED)
def test_on_a_dev_server_the_skill_uploads_nothing_records_nothing_and_says_so(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P0] AC-2
    body = _body(_skill())
    paragraphs = [_flat(p) for p in re.split(r"\n[ \t]*\n", body)]
    dev = [p for p in paragraphs if '`"dev"`' in p and "`mode`" in p]
    assert any(DEV_LINE.search(p) for p in dev), dev

    # The check stops the run before the export: no export, no upload, no report.
    (check,) = [p for p in dev if DEV_LINE.search(p)]
    assert re.search(r"\bstop\b", check, re.I), check
    assert re.search(r"\b(?:don't|do not|never) call\b", check, re.I), check
    for tool in ("`export_backup`", "`upload_backup`", "`record_backup_upload`"):
        assert tool in check, tool
    flat = _flat(body)
    assert flat.index(check) < flat.index(EXPORT_CALL)

    # `get_app_info` tells the two apart, as the skill reads it.
    assert structured_of(connect_mcp(dev=True).call_tool("get_app_info"))["mode"] == "dev"
    assert structured_of(connect_mcp().call_tool("get_app_info"))["mode"] == "production"


# --- AC-3: one line per outcome -------------------------------------------------------


# Un-skip when the build writes the skill's report step.
@pytest.mark.skip(reason=RED)
def test_the_skill_reports_each_outcome_in_one_line_in_the_auto_backup_lines_words() -> None:
    # [P1] AC-3
    skill = _skill()
    assert UPLOADED_LINE.search(skill), "no Uploaded line"

    assert SKIPPED_LINE in skill
    assert re.search(r"\bone line\b", skill, re.I)
    assert re.search(r"\b1 copy\b", skill)

    # A failure: "Failed: " and the Backup page's reason for its cause, on the cause's line.
    reasons = failing_reasons()
    assert len(reasons) == len(CAUSES), reasons
    missing = [
        cause
        for cause, reason in zip(CAUSES, reasons, strict=True)
        if not any(
            f"`{cause}`" in line and f"failed: {reason}".lower() in line.lower()
            for line in skill.splitlines()
        )
    ]
    assert missing == []


# --- AC-4: started by hand, with bookvie not running ------------------------------------


# Un-skip when the build writes the skill's step 1.
@pytest.mark.skip(reason=RED)
def test_run_by_hand_the_skill_starts_bookvie_as_the_other_skills_do_and_goes_on(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-4
    skill = _skill()
    start = _section(skill, START_STEP, numbered=True) or ""
    health = start.find("curl -fsS http://127.0.0.1:8765/api/health")
    assert -1 < start.find("`get_app_info`") < health, start[:400]

    # Only when run by hand: the headless run never starts bookvie (AR51).
    assert re.search(r"\b(?:by hand|interactive)\b", start, re.I)
    assert "--no-browser" in start
    # The other skills' start, for the `bookvie` entry only: never the dev one.
    check_the_older_bookvie_probe(skill, START_STEP, connect_mcp(), ports=[PROBE_PORTS["bookvie"]])
    assert "8766" not in skill
    assert "mcp__bookvie-dev__" not in skill
    # Then it goes on with the run.
    assert re.search(r"\bgo on\b|\bcontinue\b", _flat(start), re.I)
