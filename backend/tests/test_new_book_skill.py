"""Story 12.8: ``bookvie-new-book`` adds a Book through the agent tools (D15).

The skill (``.claude/skills/bookvie-new-book/``) checks for the book with
``find_book``, adds it with ``add_book`` and its ``coverUrl`` (bookvie downloads
the cover), and verifies it with ``get_book``. Its multipart ``add_book.py``
post and its copy of the server's duplicate rule (``check_catalog.py``) are
gone, closing that ``deferred-work.md`` entry, and it makes no ``curl`` or HTTP
call to ``/api/views/*`` or ``/api/intents/*``. It keeps its start step (check
``/api/health``, start ``bookvie --no-browser``, then Story 12.1's ``/mcp``
reconnect step), the ``added-by-skill`` tag and the terminal report.

The ``not-finished`` and ``0-pages`` rules were only in Oleg's own Claude
memory, never in the skill. Oleg chose (ATDD run, 2026-11-20) to write them into
SKILL.md, so they hold in any session.

How ``add_book`` refuses a duplicate or a cover is Stories 12.4 and 12.5's
(``test_agent_book_write.py``, ``test_agent_cover_url.py``). A skill is
instructions for an agent, so these leaves pin what its text must say and must
not say. AC-4, real runs against ``--dev``, is Oleg's, recorded in the story spec.
"""

import re
from pathlib import Path

import pytest

from tests.test_agent_mount import _section
from tests.test_notes_summary_skill import HTTP_CLIENT, _skill_files

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = REPO_ROOT / ".claude" / "skills" / "bookvie-new-book"
SKILL_MD = SKILL_DIR / "SKILL.md"
DEFERRED_WORK = REPO_ROOT / "_bmad-output" / "implementation-artifacts" / "deferred-work.md"

RED = "Story 12.8 red phase: the skill still adds books over HTTP"

OLD_SCRIPTS = ("add_book.py", "check_catalog.py")

# The terminal report as it stands (step 5, "Report in the terminal"): what it holds.
REPORT_ITEMS = (
    "Don't open the app",
    "Title, Subtitle, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Pages, Tags",
    "whether a cover was attached",
    "the source URLs",
    "any field you had to guess or leave empty",
    "Leave the bookvie server running",
)

# The deferred-work.md entry this story closes: the skill's copy of the duplicate rule.
COPIED_RULE_ENTRY = "re-implements `domain/duplicates`' rule"


def _skill() -> str:
    return SKILL_MD.read_text(encoding="utf-8")


def _command_lines(text: str) -> list[str]:
    """``curl`` or ``wget`` command lines, not the words in prose ("makes no `curl` call")."""
    return re.findall(r"\b(?:curl|wget)\s+(?:-|https?://)[^\n`]*", text)


def _lines_with(text: str, pattern: str) -> list[str]:
    """The lines of ``text`` (a bullet or a paragraph each, in SKILL.md) matching ``pattern``."""
    return [line for line in text.splitlines() if re.search(pattern, line, re.I)]


def _deferred_entry(marker: str) -> str | None:
    """The ``deferred-work.md`` bullet (``- source_spec:`` to the next one) whose text has ``marker``."""
    text = DEFERRED_WORK.read_text(encoding="utf-8")
    entries = re.split(r"(?m)^(?=- source_spec:|## )", text)
    found = [entry for entry in entries if marker in entry]
    return found[0] if len(found) == 1 else None


# --- AC-1: find_book, add_book with coverUrl, get_book; the old scripts gone -------


@pytest.mark.skip(reason=RED)
def test_the_skill_adds_through_the_tools_and_keeps_its_start_step_rules_and_report() -> None:
    # [P1] AC-1.
    files = _skill_files(SKILL_DIR)
    calls = {
        name: sorted(set(re.findall(r"/api/(?:views|intents)/[\w-]*", text)))
        for name, text in files.items()
    }
    assert {name: found for name, found in calls.items() if found} == {}

    # The multipart post and the copied duplicate rule are gone, and nothing in
    # the folder (SKILL.md, the evals' graders) still names them.
    assert [name for name in OLD_SCRIPTS if (SKILL_DIR / "scripts" / name).exists()] == []
    assert {
        name: [script for script in OLD_SCRIPTS if script in text]
        for name, text in files.items()
        if any(script in text for script in OLD_SCRIPTS)
    } == {}

    # It no longer downloads the cover: no script talks HTTP (lookup.mjs reads
    # pages through a headless Chromium), and every curl in SKILL.md is the health check.
    scripts = {name: text for name, text in files.items() if name.startswith("scripts/")}
    assert {name for name, text in scripts.items() if HTTP_CLIENT.search(text)} == set()
    skill = _skill()
    commands = _command_lines(skill)
    assert commands and all("/api/health" in line for line in commands), commands

    # The tools: find_book to check, add_book with coverUrl to add, get_book to verify.
    for name in ("find_book", "add_book", "coverUrl", "get_book"):
        assert f"`{name}`" in skill, name

    # The start step stays: the health check, bookvie without a browser, then
    # Story 12.1's reconnect step (`/mcp`, pick the entry, reconnect).
    assert "/api/health" in skill
    assert "--no-browser" in skill
    assert "`/mcp`" in skill
    assert re.search(r"\breconnect\b", skill, re.I)

    # The rules: the added-by-skill tag, and (now in the skill) not-finished for a
    # book its source says isn't complete, 0-pages with Pages 1 when no source gives a count.
    assert "`added-by-skill`" in skill
    assert any(
        re.search(r"\bcomplete\b", line, re.I) for line in _lines_with(skill, r"`not-finished`")
    )
    assert any(
        re.search(r"\bpages?\b", line, re.I) and re.search(r"\b1\b", line)
        for line in _lines_with(skill, r"`0-pages`")
    )

    # The terminal report stays as it is.
    report = _section(skill, "Report in the terminal", numbered=True)
    assert report is not None
    report = " ".join(report.split())
    assert [item for item in REPORT_ITEMS if item not in report] == []

    # The copied duplicate rule's deferred-work.md entry is closed.
    entry = _deferred_entry(COPIED_RULE_ENTRY)
    assert entry is not None
    assert re.search(r"(?m)^\s+resolved:", entry), entry


# --- AC-2: a duplicate_book refusal -----------------------------------------------


@pytest.mark.skip(reason=RED)
def test_on_duplicate_book_the_skill_shows_the_matches_and_confirms_only_on_the_users_say_so() -> (
    None
):
    # [P1] AC-2. That add_book refuses with duplicate_book and its `duplicates`, and
    # takes confirmDuplicate, is Story 12.4's leaf (test_agent_book_write.py); what
    # the agent does with the refusal is in the skill's text, and AC-4's real run shows it.
    skill = _skill()
    confirm = _lines_with(skill, r"`confirmDuplicate(?:: true)?`")
    assert confirm

    assert any(re.search(r"\bonly (?:if|when)\b[^.]*\buser\b", line, re.I) for line in confirm), (
        confirm
    )
    assert "`duplicate_book`" in skill
    # The matching Books the refusal carries, shown to the user.
    assert "`duplicates`" in skill
    assert "--confirm-duplicate" not in skill


# --- AC-3: a cover download refused on coverUrl -----------------------------------


@pytest.mark.skip(reason=RED)
def test_on_a_cover_refused_on_cover_url_the_skill_says_why_and_offers_to_add_without_a_cover() -> (
    None
):
    # [P1] AC-3. That a failed download is refused on coverUrl with nothing saved is
    # Story 12.5's leaf (test_agent_cover_url.py); the skill's answer to it is text.
    skill = _skill()
    offers = _lines_with(skill, r"\boffer\b[^.]*\bwithout (?:a|the|its) cover\b")
    assert offers

    assert any("`coverUrl`" in line for line in offers), offers
    assert any(re.search(r"\bwhy\b", line, re.I) for line in offers), offers


# AC-4 (a real Claude Code session against --dev, one amazon.com book and one
# leanpub.com book, both added with their covers) is manual: Oleg runs it and the
# story spec records the runs, as Story 12.1's AC-8 and Story 12.7's AC-3.
