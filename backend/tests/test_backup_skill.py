"""Story 13.4: ``bookvie-backup``, one skill for every backup run (AD-22, AR51, UX-DR82).

The skill (``.claude/skills/bookvie-backup/SKILL.md``) checks bookvie with
``get_app_info``, calls ``export_backup({forUpload: true})``, calls
``upload_backup`` unless ``unchangedSinceUpload``, and always ends with exactly
one ``record_backup_upload``. Its frontmatter's ``allowed-tools`` lists exactly
its four MCP tools, and nothing else. It is run by hand, with ``/bookvie-backup``.

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

from bookvie.intents.backup_upload import CAUSES
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
    FaultyFs,
    SetClock,
    check_the_older_bookvie_probe,
    curl_lines,
    failing_reasons,
    is_health_or_probe,
)
from tests.test_agent_mount import _section
from tests.test_dropbox_upload import Connect, upload

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
"""The skill's tools, AR51: exactly what its frontmatter lists."""

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


def _skill(path: Path = SKILL_MD) -> str:
    """A skill's text (by default ``bookvie-backup``'s), or ``""`` while it doesn't exist
    (so a red leaf fails at its assertion)."""
    return path.read_text(encoding="utf-8") if path.is_file() else ""


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


def test_run_by_hand_the_skill_starts_bookvie_as_the_other_skills_do_and_goes_on(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-4
    skill = _skill()
    start = _section(skill, START_STEP, numbered=True) or ""
    health = start.find("curl -fsS http://127.0.0.1:8765/api/health")
    assert -1 < start.find("`get_app_info`") < health, start[:400]

    # Run by hand, in an interactive session, so it may start bookvie (AR51).
    assert re.search(r"\b(?:by hand|interactive)\b", start, re.I)
    assert "--no-browser" in start
    # The other skills' start, for the `bookvie` entry only: never the dev one.
    check_the_older_bookvie_probe(skill, START_STEP, connect_mcp(), ports=[PROBE_PORTS["bookvie"]])
    assert "8766" not in skill
    assert "mcp__bookvie-dev__" not in skill
    # Then it goes on with the run.
    assert re.search(r"\bgo on\b|\bcontinue\b", _flat(start), re.I)


# --- Follow-ups (ATDD green phase, and the spec's I/O matrix) ---------------------------

README_MD = REPO_ROOT / "README.md"


def _paragraphs(text: str) -> list[str]:
    return [_flat(p) for p in re.split(r"\n[ \t]*\n", text)]


def test_the_skills_setup_and_reconnect_steps_match_the_readme() -> None:
    # [P2] AC-1 (ATDD follow-up). Step 1 repeats the README's one-time setup line for the
    # `bookvie` entry and its reconnect step; one wording, no drift.
    readme = _section(README_MD.read_text(encoding="utf-8"), "Agent tools")
    assert readme is not None
    start = _section(_skill(), START_STEP, numbered=True)
    assert start is not None
    start = _flat(start)

    setup = re.findall(r"claude mcp add [^\n`]*/mcp", readme)
    assert setup and "http://127.0.0.1:8765/mcp" in setup[0], setup
    assert setup[0] in start
    assert all(line not in start for line in setup[1:]), "only the bookvie entry"

    assert "run `/mcp` in Claude Code, pick the entry and choose reconnect" in readme
    assert re.search(
        r"run `/mcp` in Claude Code, pick the entry \(`bookvie`\) and choose reconnect", start
    )


def test_an_export_that_fails_is_recorded_as_failed_with_backup_write(
    connect_mcp: Callable[..., McpClient], _isolated_home: Path
) -> None:
    # [P1] AC-1 (ATDD follow-up). The skill's cause for a refused export is accepted.
    # A data folder with no backups folder (`~/bookvie`): the export is couldnt_save.
    folder = _isolated_home / "bookvie"
    LibraryBuilder().write(folder)
    client = connect_mcp(data_dir=folder, clock=SetClock(NOW))
    refused = client.call_tool(EXPORT_BACKUP, {"forUpload": True})
    assert error_of(refused).get("code") == "couldnt_save", refused
    recorded = client.call_tool(
        RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": "backup_write"}
    )
    assert recorded.get("isError") is not True, recorded

    # A write that fails while the zip is renamed into place: couldnt_save too.
    client = _connect_default(connect_mcp, _isolated_home)
    store = client.http.app.state.store
    fs = store.fs
    store.fs = FaultyFs("replace")
    refused = client.call_tool(EXPORT_BACKUP, {"forUpload": True})
    store.fs = fs
    assert error_of(refused).get("code") == "couldnt_save", refused
    recorded = client.call_tool(
        RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": "backup_write"}
    )
    assert recorded.get("isError") is not True, recorded

    # The skill says so, on the export's line.
    assert any(
        "`export_backup` answers an error" in line and "`backup_write`" in line
        for line in _body(_skill()).splitlines()
    )


@pytest.mark.parametrize(
    ("fault", "cause"),
    [
        pytest.param("signin", "dropbox_signin", id="signin"),
        pytest.param("refuse_hash", "upload_incomplete", id="upload_incomplete"),
        pytest.param("full", "dropbox_full", id="dropbox_full"),
        pytest.param("unexpected", "other", id="other"),
    ],
)
def test_each_upload_cause_is_recorded_as_failed_with_that_cause(
    connect_mcp: Callable[..., McpClient],
    _isolated_home: Path,
    fakes: Any,
    fault: str,
    cause: str,
) -> None:
    # [P1] AC-1 (ATDD follow-up). The `cause` upload_backup answers is one record accepts.
    client = _connect_default(connect_mcp, _isolated_home)
    export = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    fake = fakes.FakeDropbox(fault=fault)

    refused = error_of(upload(export["path"], Connect(fake)))

    assert refused["cause"] == cause, refused
    assert fake.deletes() == []
    recorded = client.call_tool(RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": cause})
    assert recorded.get("isError") is not True, recorded


def test_an_upload_that_deleted_nothing_drops_the_deleted_part_of_the_line() -> None:
    # [P2] AC-3 (the spec's empty-`deleted` row).
    skill = _skill()
    assert re.search(r'"Uploaded [^"·]+ · \d+ copies in Dropbox"', skill)
    assert any(
        "`deleted` is empty" in line and "leave out the deleted part" in line
        for line in skill.splitlines()
    )
    assert re.search(r'joined with ", "', skill)


def test_with_no_dropbox_tools_the_run_fails_with_other_and_says_bookvie_dropbox_isnt_connected() -> (
    None
):
    # [P2] AC-1 (the spec's Dropbox-tools-missing row).
    body = _body(_skill())
    upload_step = _section(body, "Upload unless unchanged", numbered=True) or ""
    assert any(
        "`upload_backup` tool isn't available" in p and "`other`" in p
        for p in _paragraphs(upload_step)
    ), upload_step
    report = _section(body, "Report in one line", numbered=True) or ""
    assert any(
        line.lstrip().startswith("- `other`:")
        and "bookvie-dropbox isn't connected" in line
        and "Setup, step 3" in line
        for line in report.splitlines()
    ), report


def test_a_refused_report_still_gives_the_outcome_and_is_never_sent_twice() -> None:
    # [P2] AC-1 (the spec's report-refused row).
    body = _body(_skill())
    record = _flat(_section(body, "Record what happened", numbered=True) or "")
    assert re.search(
        r"If `record_backup_upload` itself answers an error[^.]*don't call it again", record
    ), record
    report = _flat(_section(body, "Report in one line", numbered=True) or "")
    assert re.search(
        r"When `record_backup_upload` answered an error, still give the outcome line", report
    )
    assert "bookvie couldn't save this report" in report
    assert "Don't call any tool to fix it." in report


def test_an_older_bookvie_without_record_backup_upload_stops_the_run_before_the_export(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-1 (code review, 2026-11-22): a bookvie from before 13.3 has `get_app_info`
    # but no `record_backup_upload`, and its `export_backup` refuses `forUpload`.
    body = _body(_skill())
    step = _section(body, "Never from development", numbered=True) or ""
    (stop,) = [p for p in _paragraphs(step) if "older than this skill" in p]
    assert "`record_backup_upload`" in stop and re.search(r"\bstop here\b", stop), stop
    assert re.search(r"\b(?:don't|do not|never) call\b", stop), stop
    for tool in ("`export_backup`", "`upload_backup`", "`record_backup_upload`"):
        assert tool in stop, tool
    assert '"Failed: this bookvie is older than the backup skill' in stop
    assert "npm run install:local" in stop and "Nothing is recorded" in stop
    flat = _flat(body)
    assert flat.index(stop) < flat.index(EXPORT_CALL)

    # The tool the skill checks for is the one this bookvie serves.
    names = {tool["name"] for tool in connect_mcp().list_tools()}
    assert RECORD_BACKUP_UPLOAD in names, sorted(names)


# --- Automate (2026-11-22): the review's wording, and a prune that fails --------------


def test_app_info_that_is_neither_production_nor_dev_stops_before_the_export() -> None:
    # [P1] AC-1/AC-2 (review patch, build pass): an error, no `mode` or another value.
    body = _body(_skill())
    step = _section(body, "Never from development", numbered=True) or ""
    (stop,) = [p for p in _paragraphs(step) if "Any other answer" in p]
    assert '`"production"`' in stop and "go on" in stop, stop
    assert re.search(r"an error, or no `mode`, or another value", stop), stop
    assert "no export, upload or report" in stop, stop
    assert "\"Failed: bookvie's app info couldn't be read, so nothing was backed up.\"" in stop
    flat = _flat(body)
    assert flat.index(stop) < flat.index(EXPORT_CALL)


def test_an_upload_error_without_a_usable_cause_is_other_and_claims_nothing_about_deletes() -> None:
    # [P1] AC-1 (review patches): the cause mapping, and which causes delete nothing.
    upload_step = _section(_body(_skill()), "Upload unless unchanged", numbered=True) or ""
    (errors,) = [p for p in _paragraphs(upload_step) if "If `upload_backup` answers an error" in p]
    assert re.search(
        r"isn't JSON, has no `cause`, or names a cause outside those four[^.]*"
        r"the run failed with the cause `other`",
        errors,
    ), errors
    assert "Don't retry the upload." in errors
    # Nothing deleted: said only for the causes that come before Dropbox writes anything.
    (before,) = re.findall(r"After ([^.]*), nothing in Dropbox was deleted\.", errors)
    assert set(re.findall(r"`(\w+)`", before)) == {"dropbox_signin", "dropbox_full"}, before
    # `upload_incomplete` can come after the finish replaced today's copy (Epic 13 retro
    # item 91, E13-B1): no older backup was deleted, but today's copy may not match.
    assert re.search(
        r"After `upload_incomplete`, no older backup was deleted, but today's copy in Dropbox "
        r"may have been replaced",
        errors,
    ), errors
    assert "Without a usable `cause`, don't say whether anything was deleted." in errors
    assert "Nothing in Dropbox was deleted." not in errors


def test_a_prune_that_fails_after_a_checked_upload_is_recorded_as_uploaded_with_its_real_count(
    connect_mcp: Callable[..., McpClient], _isolated_home: Path, fakes: Any
) -> None:
    # [P1] Epic 13 retro item 91 (E13-B2, Oleg's decision 2026-11-23), driven for real: a
    # prune that fails after a checked upload is still the upload. The skill records
    # `uploaded` with the copies Dropbox holds (more than 3 here), bookvie takes it, the
    # next export sees the library as uploaded, and the skill line notes the older copies.
    class SecondDeleteFails(fakes.FakeDropbox):  # type: ignore[name-defined,misc]
        deleted = 0

        def files_delete_v2(self, path: str, parent_rev: Any = None) -> Any:
            self.deleted += 1
            if self.deleted == 2:
                raise RuntimeError("the connection dropped")
            return super().files_delete_v2(path, parent_rev)

    client = _connect_default(connect_mcp, _isolated_home)
    export = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    fake = SecondDeleteFails()
    older = [f"bookvie-backup-2026-11-{day}.zip" for day in (15, 16, 17, 18, 19)]
    for name in older:
        fake.put(name, name.encode())

    answer = structured_of(upload(export["path"], Connect(fake)))

    assert answer["deleted"] == [older[0]], answer
    assert answer["copies"] == 5 == len(fake.names()), (answer, fake.names())
    assert f"It deleted {older[0]}." in answer["pruneFailed"], answer
    recorded = client.call_tool(
        RECORD_BACKUP_UPLOAD,
        {
            "outcome": "uploaded",
            "path": export["path"],
            "copies": answer["copies"],
            "contentHash": answer["contentHash"],
        },
    )
    assert recorded.get("isError") is not True, recorded
    again = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert again["unchangedSinceUpload"] is True, again

    upload_step = _flat(_section(_body(_skill()), "Upload unless unchanged", numbered=True) or "")
    assert "adds `pruneFailed`" in upload_step and "That run is still an upload." in upload_step
    # Only a failed listing stays `other`: its count of copies isn't known.
    assert re.search(
        r"An `other` can also come after a checked upload whose listing of the older backups "
        r"failed",
        upload_step,
    ), upload_step
    report = _flat(_section(_body(_skill()), "Report in one line", numbered=True) or "")
    assert re.search(
        r"When the answer has `pruneFailed`, add on the same line: \"Older copies remain: "
        r"deleting them didn't finish, and a later upload deletes them\.\"",
        report,
    ), report
    # With a name deleted too, the note follows the deleted part.
    assert re.search(
        r"\"Uploaded [^\"·]+ · 4 copies in Dropbox, deleted [^\"]+\.zip\. Older copies remain: ",
        report,
    ), report


def test_each_failed_line_says_failed_once_and_a_codeless_refused_report_drops_the_parentheses() -> (
    None
):
    # [P2] AC-3 (review patches): step 6's lines as an agent would write them.
    report = _section(_body(_skill()), "Report in one line", numbered=True) or ""
    assert all(line.count("Failed:") <= 1 for line in report.splitlines()), report
    assert "**Failed:** the line for the run's cause, word for word:" in report
    flat = _flat(report)
    assert '"bookvie couldn\'t save this report (*code*)."' in flat
    assert "or without the parentheses when the error has none" in flat
    # The closing note names every stop that has its own line.
    assert re.search(
        r"The stops in step 2 \(a development library, unreadable app info, an older bookvie\) "
        r"have their own lines",
        flat,
    ), flat
