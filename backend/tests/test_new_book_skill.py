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

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

from tests.agent_client import McpClient, error_of, structured_of
from tests.builder import LibraryBuilder
from tests.helpers import image_bytes, library_bytes
from tests.test_agent_mount import _section
from tests.test_notes_summary_skill import HTTP_CLIENT, _skill_files

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = REPO_ROOT / ".claude" / "skills" / "bookvie-new-book"
SKILL_MD = SKILL_DIR / "SKILL.md"
DEFERRED_WORK = REPO_ROOT / "_bmad-output" / "implementation-artifacts" / "deferred-work.md"

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


# --- Green-phase follow-ups: the skill's names against the tools, the README, the evals --

README = REPO_ROOT / "README.md"
TOOLS = {"find_book", "add_book", "get_book"}
EVALS = SKILL_DIR / "evals"


class _FakeFetcher:
    """A cover downloader that answers every address with one small PNG, and records them."""

    def __init__(self) -> None:
        self.urls: list[str] = []

    def fetch(self, url: str) -> bytes:
        self.urls.append(url)
        return image_bytes()


def _book_arguments(**overrides: Any) -> dict[str, Any]:
    """``add_book``'s arguments as step 4 sends them: strings, ``type`` lower case."""
    return {
        "title": "The Dispossessed",
        "pages": "387",
        "authors": "Ursula K. Le Guin",
        "edition": "1",
        "language": "English",
        "publisher": "Harper",
        "type": "paperback",
        "isbn": "9780061054884",
        "year": "1994",
        "tags": "added-by-skill",
        **overrides,
    }


def test_every_name_the_skill_reads_is_in_the_tools_answers_and_it_names_only_its_three_tools(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-1. The skill tells the agent which fields to read; a renamed field
    # would leave it reading nothing, with every wording leaf still green.
    skill = _skill()
    builder = LibraryBuilder()
    builder.book(title="Dune", authors=["Frank Herbert"], pages=412, isbn="9780441013593")
    folder = tmp_path / "library"
    builder.write(folder)
    fetcher = _FakeFetcher()
    client = connect_mcp(data_dir=folder, cover_fetcher=fetcher)

    # Of the registered tools, the skill names only find_book, add_book and get_book.
    registered = {tool["name"] for tool in client.list_tools()}
    named = set(re.findall(r"`([a-z]+(?:_[a-z]+)+)`", skill))
    assert named & registered == TOOLS

    # find_book's candidates carry exactly the fields the skill lists.
    listed = re.search(r"each with ((?:`\w+`(?:, | and )?)+), or an empty list", skill)
    assert listed is not None
    candidate = structured_of(client.call_tool("find_book", {"query": "Dune"}))["books"][0]
    assert set(re.findall(r"`(\w+)`", listed.group(1))) == set(candidate)
    assert structured_of(client.call_tool("find_book", {"query": "The Dispossessed"})) == {
        "books": []
    }

    # add_book with a coverUrl: ids.bookId, then get_book's title, tags and hasCover.
    cover_url = "https://covers.example/dispossessed.jpg"
    added = structured_of(
        client.call_tool("add_book", {**_book_arguments(), "coverUrl": cover_url})
    )
    assert fetcher.urls == [cover_url]
    book = structured_of(client.call_tool("get_book", {"bookId": added["ids"]["bookId"]}))
    assert book["title"] == "The Dispossessed"
    assert "added-by-skill" in book["tags"]
    assert book["hasCover"] is True
    for name in (
        "Subtitle",
        "Authors",
        "Edition",
        "Language",
        "Publisher",
        "Type",
        "ISBN",
        "Year",
        "Pages",
        "Tags",
    ):
        assert name.lower() in {key.lower() for key in book}, name

    # A duplicate: duplicate_book with its duplicates (title, authors, ISBN).
    dune = _book_arguments(title="Dune", authors="Frank Herbert", isbn="9780441013593")
    refusal = error_of(client.call_tool("add_book", dune))
    assert refusal["code"] == "duplicate_book"
    assert [(d["title"], d["authors"], d["isbn"]) for d in refusal["duplicates"]] == [
        ("Dune", ["Frank Herbert"], "9780441013593")
    ]
    # Another invalid field: invalid_fields with fields[].field.
    refusal = error_of(client.call_tool("add_book", _book_arguments(title="Other", pages="0")))
    assert refusal["code"] == "invalid_fields"
    assert [field["field"] for field in refusal["fields"]] == ["pages"]

    for path in (
        "`ids.bookId`",
        "`hasCover`",
        "`tags`",
        "`duplicates`",
        "`fields`",
        "`duplicate_book`",
        "`invalid_fields`",
        "`couldnt_save`",
    ):
        assert path in skill, path


def test_a_cover_refused_on_cover_url_is_named_by_its_field_and_nothing_is_saved(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P2] AC-3. The skill spots a cover refusal by a `fields` entry on `coverUrl`;
    # the real downloader refuses an http:// address before any connection.
    client = connect_mcp()
    refusal = error_of(
        client.call_tool("add_book", {**_book_arguments(), "coverUrl": "http://x.example/c.jpg"})
    )
    assert refusal["code"] == "invalid_fields"
    assert [field["field"] for field in refusal["fields"]] == ["coverUrl"]
    assert structured_of(client.call_tool("find_book", {"query": "The Dispossessed"})) == {
        "books": []
    }
    assert re.search(r"a field in `fields` is `coverUrl`", " ".join(_skill().split()))


def test_the_skills_setup_and_reconnect_steps_match_the_readme() -> None:
    # [P2] AC-1. The skill repeats the README's one-time setup lines and its reconnect step.
    readme_text = README.read_text(encoding="utf-8")
    readme = _section(readme_text, "Agent tools")
    assert readme is not None
    start = _section(_skill(), "Start bookvie", numbered=True)
    assert start is not None
    start = " ".join(start.split())

    setup = re.findall(r"claude mcp add [^\n`]*/mcp", readme)
    assert len(setup) == 2, setup
    assert setup[0] in start
    dev = re.search(r"--scope user (\S+) (\S+/mcp)", setup[1])
    assert dev is not None
    assert f"`{dev.group(1)}` with `{dev.group(2)}`" in start
    assert "bookvie --dev --no-browser" in start
    assert "curl -fsS http://127.0.0.1:8766/api/health" in start

    assert "run `/mcp` in Claude Code, pick the entry and choose reconnect" in readme
    assert re.search(
        r"run `/mcp` in Claude Code, pick the entry \([^)]*\) and choose reconnect", start
    )
    assert re.search(r"If reconnecting doesn't bring the tools.*and stop\.", start)

    # README's AI skills line names the tool, not the old API.
    skills = _section(readme_text, "AI skills")
    assert skills is not None
    line = next(line for line in skills.splitlines() if "bookvie-new-book" in line)
    assert "add-book API" not in line
    assert "`add_book`" in line


def test_the_evals_grade_the_tools_and_may_call_them() -> None:
    # [P2] AC-1. An eval run needs the bookvie tools allowed, and its graders
    # check the tools, not the deleted scripts.
    prompts = sorted(EVALS.glob("*/prompt.md"))
    assert prompts
    for prompt in prompts:
        allowed = re.search(r"^allowed_tools: \[([^\]]*)\]", prompt.read_text("utf-8"), re.M)
        assert allowed is not None, prompt
        tools = {name.strip() for name in allowed.group(1).split(",")}
        assert {f"mcp__bookvie__{name}" for name in TOOLS} <= tools, prompt
        graders = " ".join(
            path.read_text("utf-8") for path in sorted(prompt.parent.glob("graders/*.md"))
        )
        assert "find_book" in graders and "add_book" in graders, prompt
    graders = " ".join(path.read_text("utf-8") for path in EVALS.glob("*/graders/*.md"))
    assert "get_book" in graders
    assert "coverUrl" in graders


# --- The I/O matrix's other rows: the skill's text is their only surface ----------


def _flat(title: str) -> str:
    section = _section(_skill(), title, numbered=True)
    assert section is not None, title
    return " ".join(section.split())


def test_a_same_book_candidate_stops_the_skill_before_the_lookup_and_asks() -> None:
    step = _flat("Check the catalog first")
    assert "`find_book`" in step
    assert re.search(r"\*\*The same book:\*\*.*Stop before the lookup", step)
    assert re.search(r"Ask whether to add another copy", step)
    assert "`confirmDuplicate: true`" in step
    # find_book matches a whole query against one field: one thing at a time.
    assert re.search(r"send one thing at a time", step)
    assert re.search(r"exact Title, and once more with the ISBN", step)
    # Before the lookup: the bare title, and the ISBN when the user gave one.
    assert re.search(r"without an edition, a format or anything after a `:`", step)
    assert re.search(r"once more with the ISBN when the user gave one", step)
    assert re.search(r"only a URL, there is no title yet: skip this check", step)
    # The same book: same edition, and same type once the format is known.
    assert re.search(r"the same `edition` \(1 when none is stated\)", step)
    assert re.search(r"when the format is known \(the user named it, or step 3 found it\)", step)
    assert re.search(r"A different edition or format is another book", step)
    assert re.search(r"when several candidates are the same book, show each of them", step)
    assert re.search(r"Don't ask again about a book the user already said to add anyway", step)


def test_a_cover_refusal_can_come_with_other_fields_and_a_resend_can_be_refused_again() -> None:
    step = _flat("Add the book")
    assert re.search(r"One refusal can name `coverUrl` and other fields together", step)
    assert re.search(r"a resend without `coverUrl` can come back as `invalid_fields`", step)
    assert re.search(r"or as `duplicate_book`", step)


def test_another_invalid_field_is_fixed_and_couldnt_save_is_reported_without_a_retry_loop() -> None:
    step = _flat("Add the book")
    assert re.search(r"\*\*`invalid_fields` on another field:\*\* fix the values", step)
    assert re.search(r"If the fix needs information you don't have, ask the user", step)
    assert re.search(r"\*\*`couldnt_save`:\*\*.*Report it\. Don't retry in a loop\.", step)


def test_with_no_cover_found_the_skill_adds_without_cover_url_and_says_so() -> None:
    skill = " ".join(_skill().split())
    assert re.search(
        r"no cover can be found on any source, leave `coverUrl` out, add the book without one, "
        r"and say so in the report",
        skill,
    )
    assert re.search(r"Don't download it: bookvie does", skill)


def test_the_skill_never_falls_back_to_bookvies_http_api() -> None:
    skill = " ".join(_skill().split())
    assert len(re.findall(r"Never fall back to calling bookvie's HTTP API", skill)) >= 2
    assert re.search(r"Never call bookvie's HTTP API for a book", skill)


# --- Automation (Story 12.8): step 4's arguments and refusals against the real tools --

ADD_BOOK_KEY = re.compile(r"^\| \*\*[^*]+\*\* \(`(\w+)`\) \|", re.M)


class _BytesFetcher:
    """A cover downloader that answers every address with the same bytes."""

    def __init__(self, data: bytes) -> None:
        self.data = data
        self.urls: list[str] = []

    def fetch(self, url: str) -> bytes:
        self.urls.append(url)
        return self.data


def test_step_4s_example_and_field_keys_are_what_add_book_takes(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P2] AC-1. The agent copies step 4's example and step 3's `add_book` keys; a
    # renamed tool key or an example the server refuses would pass every wording leaf.
    step = _section(_skill(), "Add the book", numbered=True)
    assert step is not None
    block = re.search(r"```json\n(.*?)\n```", step, re.S)
    assert block is not None
    example = json.loads(block.group(1))
    assert all(isinstance(value, str) for value in example.values()), example

    fetcher = _BytesFetcher(image_bytes())
    client = connect_mcp(cover_fetcher=fetcher)
    schema = next(t for t in client.list_tools() if t["name"] == "add_book")["inputSchema"]
    properties = set(schema["properties"])

    gather = _section(_skill(), "Gather the metadata", numbered=True)
    assert gather is not None
    keys = set(ADD_BOOK_KEY.findall(gather))
    assert {"title", "authors", "pages", "type", "tags", "coverUrl"} <= keys, keys
    assert keys <= properties, keys - properties
    assert {"finishedOn", "spineColor", "confirmDuplicate"} <= properties

    # The example as written: saved, its cover downloaded from coverUrl.
    added = structured_of(client.call_tool("add_book", example))
    assert fetcher.urls == [example["coverUrl"]]
    book = structured_of(client.call_tool("get_book", {"bookId": added["ids"]["bookId"]}))
    assert book["title"] == example["title"]
    assert book["hasCover"] is True

    # Each lower-case type the table names, and Pages "1" (the 0-pages rule), are taken.
    types = re.findall(r"`(paperback|hardcover|ebook)`", gather)
    assert set(types) == {"paperback", "hardcover", "ebook"}
    for kind in sorted(set(types)):
        # No ISBN (an empty value is left out), so the three don't match each other.
        arguments = {
            key: value
            for key, value in _book_arguments(
                title=f"Type {kind}", type=kind, pages="1", tags="added-by-skill, 0-pages"
            ).items()
            if key != "isbn"
        }
        added = structured_of(client.call_tool("add_book", arguments))
        book = structured_of(client.call_tool("get_book", {"bookId": added["ids"]["bookId"]}))
        assert (book["type"], book["pages"]) == (kind, 1), book
        assert {"added-by-skill", "0-pages"} <= {tag.lower() for tag in book["tags"]}


def test_a_cover_refusal_comes_with_other_fields_or_ahead_of_them_as_step_4_says(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-2, AC-3. Step 4 says one refusal can name coverUrl and other fields, and a
    # resend without coverUrl can still be refused: pin the server order it describes.

    # An image that downloads but doesn't decode is refused with the other bad fields.
    broken = connect_mcp(
        data_dir=tmp_path / "broken", cover_fetcher=_BytesFetcher(b"\xff\xd8\xff not a jpeg")
    )
    refusal = error_of(
        broken.call_tool(
            "add_book", {**_book_arguments(pages="0"), "coverUrl": "https://x.example/c.jpg"}
        )
    )
    assert refusal["code"] == "invalid_fields"
    assert sorted(field["field"] for field in refusal["fields"]) == ["coverUrl", "pages"]
    assert structured_of(broken.call_tool("find_book", {"query": "The Dispossessed"})) == {
        "books": []
    }

    # A download refused (http://, the real downloader) comes before the field check and
    # the duplicate check: the resend without coverUrl is refused on pages, then as a duplicate.
    builder = LibraryBuilder()
    builder.book(title="Dune", authors=["Frank Herbert"], pages=412, isbn="9780441013593")
    folder = tmp_path / "library"
    builder.write(folder)
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)
    dune = _book_arguments(title="Dune", authors="Frank Herbert", isbn="9780441013593")

    first = error_of(
        client.call_tool("add_book", {**dune, "pages": "0", "coverUrl": "http://x.example/c.jpg"})
    )
    assert (first["code"], [field["field"] for field in first["fields"]]) == (
        "invalid_fields",
        ["coverUrl"],
    )
    second = error_of(client.call_tool("add_book", {**dune, "pages": "0"}))
    assert (second["code"], [field["field"] for field in second["fields"]]) == (
        "invalid_fields",
        ["pages"],
    )
    third = error_of(client.call_tool("add_book", dune))
    assert third["code"] == "duplicate_book"
    assert [d["title"] for d in third["duplicates"]] == ["Dune"]
    assert library_bytes(folder) == before

    # Only the user's say-so (confirmDuplicate: true) saves the copy.
    added = structured_of(client.call_tool("add_book", {**dune, "confirmDuplicate": True}))
    assert added["ok"] is True
    assert len(structured_of(client.call_tool("find_book", {"query": "Dune"}))["books"]) == 2
