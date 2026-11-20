"""Story 12.7: ``bookvie-notes-summary`` reads a Book through the agent tools (D15).

The skill (``.claude/skills/bookvie-notes-summary/``) finds the Book with
``find_book``, reads it with ``get_book`` and ``get_card_notes`` (or ``get_home``
for the Main book), and makes no ``curl`` or HTTP call to ``/api/views/*`` or
``/api/intents/*``. It keeps its start step (check ``/api/health``, start
``bookvie`` when it isn't running, then Story 12.1's ``/mcp`` reconnect step),
and its output, the one-page .docx, is unchanged.

The old script read a finished Book's Purpose from ``library.json``, because
the book view gave a Purpose only on ``currentReading``. Through the tools,
``get_book`` carries each Reading's ``purpose`` instead (Oleg's decision in the
ATDD run, 2026-11-20).

A skill is instructions for an agent, so most of what it does is checked in
the text: these leaves pin what the text must say and must not say. AC-3, a
real run against ``--dev``, is Oleg's, recorded in the story spec. Every test
runs with ``HOME`` set to a temporary folder (``conftest.py``).
"""

import hashlib
import re
from collections.abc import Callable
from pathlib import Path

from tests.agent_client import McpClient
from tests.builder import LibraryBuilder
from tests.test_agent_mount import _section
from tests.test_agent_read import _structured

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = REPO_ROOT / ".claude" / "skills" / "bookvie-notes-summary"
SKILL_MD = SKILL_DIR / "SKILL.md"

# The output (AC-1, "unchanged in content and layout"): the .docx builder and the
# skill's steps that write, build, check and save the summary, as they stood at
# commit 43e9260. To see a change, diff against `git show 43e9260:<path>`.
BUILD_DOCX = SKILL_DIR / "scripts" / "build_docx.cjs"
BUILD_DOCX_SHA256 = "c65baac3bb43507f93fd08f8e33f54a23114224183bff90d47717cf1a1d3bd21"
OUTPUT_SECTIONS_SHA256 = {
    "Write the summary": "192d745e1ca96b058a2c1acfdaced43df750e2edabb5a2189479013854feeaba",
    "Build the document": "501c450c6ab394995561df9fec92955a0866fceaecc53ec2943e04d24be3793d",
    "Check how it renders": "7b337a8d47de5dc8050903b23276a2e38ba7c3e1b0125e8ff9de46ced3f0faca",
    "Save and report": "3562b618ec4c29faf84042c5261edb40fe9b2f2f3cc9c2d73820292c1d1a3b9d",
}

# An HTTP client in a script: Python's, Node's, or a shell's.
HTTP_CLIENT = re.compile(
    r"^\s*(?:import|from)\s+(?:urllib|http\.client|requests|httpx)\b"
    r"|\bfetch\(|\brequire\(['\"](?:node:)?https?['\"]\)|\bfrom ['\"](?:node:)?https?['\"]"
    r"|\b(?:curl|wget)\s",
    re.M,
)


def _skill_files() -> dict[str, str]:
    """Every file in the skill's folder, by path relative to it, with its text."""
    return {
        path.relative_to(SKILL_DIR).as_posix(): path.read_text(encoding="utf-8")
        for path in sorted(SKILL_DIR.rglob("*"))
        if path.is_file() and "__pycache__" not in path.parts
    }


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# --- AC-1: the tools, the start step, the same output -----------------------------


def test_the_skill_reads_the_book_through_the_tools_keeps_its_start_step_and_its_output(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-1.
    files = _skill_files()
    calls = {
        name: sorted(set(re.findall(r"/api/(?:views|intents)/[\w-]*", text)))
        for name, text in files.items()
    }
    assert {name: found for name, found in calls.items() if found} == {}

    # No script talks HTTP, and every curl in the skill is the health check.
    scripts = {name: text for name, text in files.items() if name.startswith("scripts/")}
    assert {name for name, text in scripts.items() if HTTP_CLIENT.search(text)} == set()
    skill = SKILL_MD.read_text(encoding="utf-8")
    # A curl command line, not the word in prose ("makes no `curl` call").
    curls = re.findall(r"\bcurl\s+(?:-|https?://)[^\n`]*", skill)
    assert curls and all("/api/health" in line for line in curls), curls

    # The Book comes from the tools.
    for tool in ("find_book", "get_book", "get_card_notes", "get_home"):
        assert f"`{tool}`" in skill, tool

    # The start step stays: the health check, starting bookvie without a browser,
    # then Story 12.1's reconnect step (`/mcp`, pick the entry, reconnect).
    assert "/api/health" in skill
    assert "--no-browser" in skill
    assert "`/mcp`" in skill
    assert re.search(r"\breconnect\b", skill, re.I)

    # The output is unchanged: the same builder and the same writing, building,
    # checking and saving steps.
    assert hashlib.sha256(BUILD_DOCX.read_bytes()).hexdigest() == BUILD_DOCX_SHA256
    sections = {title: _section(skill, title, numbered=True) for title in OUTPUT_SECTIONS_SHA256}
    assert {
        title: None if text is None else _sha256(text) for title, text in sections.items()
    } == OUTPUT_SECTIONS_SHA256

    # A finished Book's Purpose, which the old script read from library.json,
    # comes from get_book: each Reading carries its own.
    folder = tmp_path / "library"
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(
        dune,
        start_date="2026-03-01",
        finish_date="2026-04-10",
        current_page=412,
        finished_pages=412,
        purpose="Why Arrakis",
    )
    builder.card_note(dune, text="Fear is the mind-killer.", page_start=8)
    builder.write(folder)
    client = connect_mcp(data_dir=folder)

    book = _structured(client.call_tool("get_book", {"bookId": dune}))
    assert [reading.get("purpose") for reading in book["readings"]] == ["Why Arrakis"]
    assert book["currentReading"] is None


# --- AC-2: two editions -----------------------------------------------------------


def test_the_skill_asks_which_edition_when_find_book_returns_several_and_never_picks() -> None:
    # [P1] AC-2. That find_book returns both editions is Story 12.2's leaf
    # (test_agent_read.py, test_find_book_returns_every_candidate_...); what the
    # agent does with them is in the skill's text, and AC-3's real run shows it.
    skill = SKILL_MD.read_text(encoding="utf-8")
    assert re.search(r"\bnever (?:pick|choose|guess)", skill, re.I)

    assert "`find_book`" in skill
    assert re.search(r"\bask which one\b", skill, re.I)
    assert re.search(r"\bedition\b", skill, re.I)
    # The candidate list shows what tells the editions apart, the type included.
    assert re.search(r"title, subtitle, authors, edition and type", skill)


# --- The agent's rules in step 2 (the I/O matrix): the skill text is their only surface --


def _step_2() -> str:
    section = _section(
        SKILL_MD.read_text(encoding="utf-8"), "Find the book and read its notes", numbered=True
    )
    assert section is not None
    return " ".join(section.split())


def test_with_no_book_named_the_skill_reads_the_main_book_from_get_home() -> None:
    step = _step_2()
    assert "`get_home`" in step
    assert "`mainBook.id`" in step
    assert re.search(r"`mainBook` is `null`.*ask the user for a title", step)


def test_with_one_match_the_skill_uses_its_id() -> None:
    step = _step_2()
    assert re.search(r"\*\*One match:\*\* use its `id`", step)


def test_with_no_match_the_skill_asks_for_a_fuller_title_or_the_author() -> None:
    step = _step_2()
    assert re.search(
        r"\*\*No match\*\* \(an empty list\): ask the user for a fuller title or the author", step
    )


def test_a_finished_books_purpose_comes_from_get_books_readings() -> None:
    step = _step_2()
    assert "`currentReading.purpose`" in step
    assert "`readings[]`" in step
    assert re.search(
        r"finished book has `currentReading` `null`, so its Purpose always comes from `readings\[\]`",
        step,
    )
    assert "`latestFinishDate`" in step
    assert re.search(r"no `startDate` counts as the earliest", step)
    assert re.search(r"same start date keep their `readings\[\]` order", step)
    assert re.search(r"Status and current page:\*\* follow the Reading the Purpose came from", step)


def test_with_no_card_notes_or_a_tool_error_the_skill_stops_and_says_why() -> None:
    step = _step_2()
    assert re.search(r"empty `groups` \(`\[\]`\) means the book has no card notes", step)
    assert re.search(r"If a tool answers with an error.*tell the user what it says", step)
    assert re.search(r"stopped answering, go back to step 1", step)


def test_a_missing_prerequisite_stops_with_no_document() -> None:
    step = _step_2()
    assert re.search(
        r"Purpose is missing, or `get_card_notes` gives no notes, don't build a document", step
    )
    assert "**No purpose:**" in step
    assert "**No card notes:**" in step
