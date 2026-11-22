"""Epic 13: ``docs/dropbox-backup.md``, the guide that ships with the backup and restore.

Story 13.1 starts it with the Restoring section: the ``ask`` rule (gate 1),
the two prompts, the safety copy and how to undo a restore with it, and one
troubleshooting entry per refusal. The README's Agent tools section links to it.
Story 13.2 adds the setup (registering the Dropbox app, ``bookvie-dropbox
auth``, both MCP servers), troubleshooting for the sign-in and for a failed
MCP server, and the check that every ``bookvie`` and ``bookvie-dropbox``
command in the guide's code blocks parses with the CLI. Later stories add the
badge states.
"""

import json
import re
import shlex
from pathlib import Path

import pytest

from bookvie import cli as bookvie_cli
from tests.agent_client import ImportFailed, import_or_fail

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "dropbox-backup.md"
README = ROOT / "README.md"


ASK_RULE = {"mcp__bookvie__restore_backup", "mcp__bookvie-dev__restore_backup"}
TROUBLESHOOTING_CODES = (
    "restore_not_confirmed",
    "restore_invalid",
    "restore_unsafe",
    "restore_newer_version",
    "safety_copy_failed",
    "restore_outside_backups",
)
_JSON_BLOCK = re.compile(r"^```json\n(.*?)^```", re.M | re.S)
_SHELL_BLOCK = re.compile(r"^```(?:sh|bash|shell|console|zsh)\n(.*?)^```", re.M | re.S)
_SHELL_OPERATORS = {"|", "||", "&&", ";", ">", ">>", "<", "&"}
_HEADING = re.compile(r"^(#+) (.+)$", re.M)


def section(text: str, title: str) -> str:
    """The Markdown section headed ``title`` (any level), up to the next heading at its level or above."""
    match = re.search(rf"^(#+) {re.escape(title)}\b.*$", text, re.M)
    if match is None:
        return ""
    level = len(match.group(1))
    rest = text[match.end() :]
    end = re.search(rf"^#{{1,{level}}} ", rest, re.M)
    return rest[: end.start()] if end else rest


def test_the_guide_says_how_to_restore_and_the_readme_links_to_it() -> None:
    # [P2] AC-12
    assert GUIDE.is_file(), GUIDE

    restoring = section(GUIDE.read_text(encoding="utf-8"), "Restoring")
    assert restoring, "no Restoring section"
    rules = [json.loads(block) for block in _JSON_BLOCK.findall(restoring)]
    asked = [set(rule.get("permissions", {}).get("ask", [])) for rule in rules]
    assert any(ASK_RULE <= names for names in asked), asked
    for code in TROUBLESHOOTING_CODES:
        assert f"`{code}`" in restoring, code
    for words in ("bookvie-pre-restore-", "VS Code", "claude -p"):
        assert words in restoring, words

    agent_tools = section(README.read_text(encoding="utf-8"), "Agent tools")
    assert "Daily backup to Dropbox, and restore" in agent_tools
    assert "(docs/dropbox-backup.md)" in agent_tools


def shell_lines(text: str) -> list[str]:
    """Every command line in ``text``'s shell code blocks, without a ``$ `` prompt, joined
    across a trailing backslash."""
    lines: list[str] = []
    for block in _SHELL_BLOCK.findall(text):
        pending = ""
        for raw in block.splitlines():
            line = pending + raw.strip().removeprefix("$ ")
            if line.endswith("\\"):
                pending = line[:-1] + " "
                continue
            pending = ""
            if line and not line.startswith("#"):
                lines.append(line)
    return lines


def guide_commands(text: str) -> list[tuple[str, list[str]]]:
    """Each ``bookvie`` or ``bookvie-dropbox`` command the guide shows, as (program, args).

    A command is a line whose program is ``bookvie`` or ``bookvie-dropbox``, by
    name or by a path ending in it, or what follows ``--`` in a ``claude mcp add``
    line (``claude mcp add … bookvie-dropbox -- /path/bookvie-dropbox serve``).
    Arguments stop at a shell operator; a ``<placeholder>`` stands for a value.
    """
    found: list[tuple[str, list[str]]] = []
    for line in shell_lines(text):
        try:
            tokens = shlex.split(line, comments=True)
        except ValueError:
            continue
        if tokens[:1] == ["claude"]:
            if "--" not in tokens:
                continue
            tokens = tokens[tokens.index("--") + 1 :]
        if not tokens:
            continue
        program = tokens[0].rsplit("/", 1)[-1]
        if program not in {"bookvie", "bookvie-dropbox"}:
            continue
        args: list[str] = []
        for token in tokens[1:]:
            if token in _SHELL_OPERATORS:
                break
            args.append("x" if token.startswith("<") else token)
        found.append((program, args))
    return found


def headed(text: str, pattern: str) -> list[str]:
    """The sections whose heading matches ``pattern`` (case-insensitive), each with its heading."""
    sections = []
    for match in _HEADING.finditer(text):
        if re.search(pattern, match.group(2), re.I):
            sections.append(match.group(2) + section(text[match.start() :], match.group(2)))
    return sections


def _parses(parse: object, args: list[str]) -> str | None:
    """``None`` when ``parse(args)`` accepts them (``--help`` exits 0), else why not."""
    try:
        parse(args)  # type: ignore[operator]
    except SystemExit as exc:
        return None if exc.code in (0, None) else f"exit {exc.code}"
    except Exception as exc:  # noqa: BLE001 - reported to the assertion
        return f"{type(exc).__name__}: {exc}"
    return None


def test_the_guide_sets_up_the_dropbox_backup_in_order_and_its_commands_match_the_cli(
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P1] AC-13
    text = GUIDE.read_text(encoding="utf-8")
    setup = section(text, "Setup")

    assert setup, "no Setup section"
    auth = import_or_fail("bookvie_dropbox.auth")
    dropbox_cli = import_or_fail("bookvie_dropbox.cli")
    redirect = "unbuilt" if isinstance(auth, ImportFailed) else auth.REDIRECT_URI

    # Registering the app, then signing in, then adding both servers, then checking them.
    registering = [
        setup.find(words)
        for words in (
            "App folder",
            "/Apps/bookvie/",
            "`files.metadata.read`",
            "`files.content.write`",
            redirect,
        )
    ]
    assert -1 not in registering, registering
    steps = [
        max(registering),
        *(setup.find(w) for w in ("bookvie-dropbox auth", "claude mcp add", "claude mcp list")),
    ]
    assert -1 not in steps and steps == sorted(steps), steps
    adds = [line for line in shell_lines(setup) if line.startswith("claude mcp add")]
    assert any(
        "--scope user" in line
        and "http://127.0.0.1:8765/mcp" in line
        and " bookvie " in f" {line} "
        for line in adds
    ), adds
    dropbox_adds = [shlex.split(line) for line in adds if "bookvie-dropbox" in line]
    assert any(
        "--scope user" in " ".join(tokens)
        and "--" in tokens
        and tokens[tokens.index("--") + 1].startswith("/")
        and tokens[tokens.index("--") + 1].endswith("/bookvie-dropbox")
        and tokens[tokens.index("--") + 2 :] == ["serve"]
        for tokens in dropbox_adds
    ), dropbox_adds

    # Troubleshooting: an expired sign-in, and an MCP server shown as failed.
    signin = headed(text, r"sign-in|signed out|sign in")
    assert any("bookvie-dropbox auth" in entry for entry in signin), signin
    failed = headed(text, r"failed")
    assert any(
        all(words in entry for words in ("claude mcp list", "/mcp", "started", "`uv`", "path"))
        for entry in failed
    ), failed

    # Every bookvie and bookvie-dropbox command shown parses with its CLI.
    commands = guide_commands(text)
    assert ("bookvie-dropbox", ["auth"]) in commands, commands
    assert ("bookvie-dropbox", ["serve"]) in commands, commands
    refused = {
        f"{program} {' '.join(args)}": why
        for program, args in commands
        if (
            why := _parses(
                bookvie_cli.parse_args if program == "bookvie" else dropbox_cli.parse_args, args
            )
        )
    }
    capsys.readouterr()
    assert refused == {}

    agent_tools = section(README.read_text(encoding="utf-8"), "Agent tools")
    assert "bookvie-dropbox" in agent_tools
    assert "(docs/dropbox-backup.md)" in agent_tools
