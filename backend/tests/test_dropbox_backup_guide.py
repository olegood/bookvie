"""Epic 13: ``docs/dropbox-backup.md``, the guide that ships with the backup and restore.

Story 13.1 starts it with the Restoring section: the ``ask`` rule (gate 1),
the two prompts, the safety copy and how to undo a restore with it, and one
troubleshooting entry per refusal. The README's Agent tools section links to it.
Later stories add the setup and the badge states, and a test that the guide's
commands match the CLI.
"""

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "dropbox-backup.md"
README = ROOT / "README.md"

RED = "Story 13.1 red phase (ATDD): docs/dropbox-backup.md isn't written yet"

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


def section(text: str, title: str) -> str:
    """The Markdown section headed ``title`` (any level), up to the next heading at its level or above."""
    match = re.search(rf"^(#+) {re.escape(title)}\b.*$", text, re.M)
    if match is None:
        return ""
    level = len(match.group(1))
    rest = text[match.end() :]
    end = re.search(rf"^#{{1,{level}}} ", rest, re.M)
    return rest[: end.start()] if end else rest


@pytest.mark.skip(reason=RED)
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
