"""Story 13.8: ``bookvie-restore``, one skill that restores from this computer or Dropbox
(AD-22, plan D19, UX-DR78 to UX-DR81).

The skill (``.claude/skills/bookvie-restore/SKILL.md``) starts bookvie as the
other skills do, lists the backups on this computer (``list_local_backups``)
and in Dropbox (``list_backups``) as one pick list, one row per content hash,
and waits for the user to pick. It downloads a Dropbox pick with
``download_backup`` into the bookvie it restores into, shows
``preview_restore``'s summary, asks in the chat, and calls ``restore_backup``
only after a yes. It reports each outcome in UX-DR81's words and never retries
a refused or unconfirmed restore. Asked to work on development, it uses the
``bookvie-dev`` tools and never touches the real library.

A skill is instructions for an agent, so most of what it does is checked in
its text, as Story 13.4 does for ``bookvie-backup``. The tools it chains are
then driven for real: bookvie in-process over ``/mcp`` and ``bookvie-dropbox``
in-process over a fake Dropbox, so the fields the skill reads and hands on are
the ones the tools give and take. The restores in a real Claude Code terminal
(AC-6) are Oleg's, recorded in the spec. Every test runs with ``HOME`` set to a
temporary folder (``conftest.py``).
"""

import re
from collections.abc import Callable
from pathlib import Path

import pytest

from tests.agent_client import (
    DOWNLOAD_BACKUP,
    EXPORT_BACKUP,
    LIST_BACKUPS,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    McpClient,
    structured_of,
)
from tests.dropbox_fakes import FakeDropbox, daily_zip
from tests.helpers import (
    SetClock,
    backup_zip,
    check_the_older_bookvie_probe,
    curl_lines,
    is_health_or_probe,
    restore_outcomes,
)
from tests.restore_scene import BACKUP_AT, DAILY, NOW, Scene, write_library
from tests.test_agent_mount import _section
from tests.test_backup_skill import (
    REPO_ROOT,
    START_STEP,
    _body,
    _connect_default,
    _flat,
    _paragraphs,
    _skill,
    allowed_tools,
)
from tests.test_dropbox_download import content_of, dropbox_call
from tests.test_dropbox_upload import Connect, daily, upload

SKILL_MD = REPO_ROOT / ".claude" / "skills" / "bookvie-restore" / "SKILL.md"

RED = "red phase (Story 13.8): there is no .claude/skills/bookvie-restore/SKILL.md"

# UX-DR78: the pick list.
PICK_HEADER = "Backups you can restore:"
WHICH_ONE = "The newest is 1. Which one?"
OLDER = re.compile(r"and \*?N\*? older\. Say show all to see them\.")
UNREACHABLE = re.compile(r"Couldn't reach Dropbox: \*?reason\*?\.")
SIGNIN = "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."
NONE_ANYWHERE = "No backups found on this computer or in Dropbox. Nothing was changed."

# UX-DR79: the preview, in its order.
PREVIEW_LINES = (
    "This backup:",
    "Now:",
    "You'd lose what was added since",
    "Everything else changed since",
    "A safety copy of your current library is saved first.",
)
PREVIEW_FIRST = re.compile(r"Restore \S+ \([^()\n]+\)\?")
EVERYTHING_ELSE = re.compile(
    r"Everything else changed since .+?, such as pages reached, goes back to how it was then\."
)

# UX-DR81: each outcome's line names its codes (or the tool) and EXPERIENCE.md's words.
RESTORED = re.compile(r'"Restored from the backup of [^"\n]+\. Safety copy: ~/[^"\n]+"')
OUTCOME_CODES = {
    "Declined": ["restore_not_confirmed"],
    "Not a bookvie file": ["restore_invalid", "restore_unsafe"],
    "Newer version": ["restore_newer_version"],
    "The restore couldn't be written": ["couldnt_save"],
    "Dropbox download failed": ["download_backup"],
    "Safety copy failed": ["safety_copy_failed"],
    "Path outside": ["restore_outside_backups"],
    "Download didn't match": ["download_incomplete"],
}
"""EXPERIENCE.md's Outcome cell (its start) → what the skill's line for it names in backticks."""


def _restore_skill() -> str:
    return _skill(SKILL_MD)


def text_on(line: str, text: str) -> bool:
    """Whether ``line`` holds ``text``; a ``*reason*`` in it stands for any words."""
    pattern = re.escape(text).replace(re.escape("*reason*"), r"\*?[^.]+?\*?")
    return re.search(pattern, line) is not None


# --- AC-1: every backup, one pick list, and the user picks ------------------------------


# Un-skip when the skill lists both sources as UX-DR78's pick list.
@pytest.mark.skip(reason=RED)
def test_the_skill_lists_this_computers_and_dropboxs_backups_as_one_pick_list_and_waits(
    connect_mcp: Callable[..., McpClient], _isolated_home: Path
) -> None:
    # [P0] AC-1
    skill = _restore_skill()
    body = _body(skill)
    flat = _flat(body)

    # Both lists, then the pick list, then the question.
    tools = [flat.find("`list_local_backups`"), flat.find("`list_backups`")]
    header, which = flat.find(PICK_HEADER), flat.find(WHICH_ONE)
    assert -1 not in tools and max(tools) < header < which, (tools, header, which)

    # The rows: "date, time · daily backup | safety copy (before a restore) · source · size".
    for words in ("daily backup", "safety copy (before a restore)", "this computer and Dropbox"):
        assert words in flat, words
    # One row per content hash; a backup here and in Dropbox is restored from here.
    assert any(
        "`contentHash`" in p
        and re.search(r"\bone row\b", p)
        and re.search(r"\bwithout (?:a )?download", p)
        for p in _paragraphs(body)
    )
    assert re.search(r"\b10 newest\b", flat) and OLDER.search(flat)
    # It suggests the newest and waits; it never picks.
    assert re.search(r"\bsuggest", flat, re.I) and re.search(r"\bwait", flat, re.I)
    assert re.search(r"\bnever picks?\b", flat, re.I)
    # Dropbox out of reach: this computer's rows, then why. Nothing anywhere: say so.
    assert UNREACHABLE.search(flat)
    assert any("`dropbox_signin`" in line and SIGNIN in line for line in body.splitlines())
    assert NONE_ANYWHERE in flat

    # It starts bookvie as the other skills do, for either entry.
    check_the_older_bookvie_probe(skill, START_STEP, connect_mcp())

    # The fields it merges on are the ones both lists give: a daily backup uploaded from
    # here has one content hash in both, and an older one only in Dropbox has another.
    for field in ("`contentHash`", "`backupTime`", "`kind`", "`size`"):
        assert field in body, field
    client = _connect_default(connect_mcp, _isolated_home)
    export = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    fake = FakeDropbox()
    fake.put(daily("2026-11-19"), daily_zip(BACKUP_AT), client_modified=BACKUP_AT)
    upload(export["path"], Connect(fake))
    here = structured_of(client.call_tool(LIST_LOCAL_BACKUPS))["backups"]
    there = structured_of(dropbox_call(LIST_BACKUPS, {}, Connect(fake)))["backups"]
    assert all({"contentHash", "backupTime", "kind", "size"} <= set(e) for e in here), here
    assert all({"contentHash", "backupTime", "size", "name"} <= set(e) for e in there), there
    shared = {e["contentHash"] for e in here} & {e["contentHash"] for e in there}
    assert len(shared) == 1 and len(there) == 2, (here, there)


# --- AC-2: a Dropbox pick is downloaded, then previewed ---------------------------------


# Un-skip when the skill downloads a Dropbox pick and previews the downloaded file.
@pytest.mark.skip(reason=RED)
def test_a_dropbox_pick_is_downloaded_into_the_bookvie_it_restores_into_then_previewed(
    connect_mcp: Callable[..., McpClient], _isolated_home: Path, tmp_path: Path
) -> None:
    # [P0] AC-2
    body = _body(_restore_skill())
    download = [
        p
        for p in _paragraphs(body)
        if "`download_backup`" in p
        and "`target`" in p
        and -1 < p.find("`download_backup`") < p.find("`preview_restore`")
    ]
    assert download, "no paragraph that downloads, then previews"

    # The target is the bookvie it restores into; the local `path` goes to preview_restore.
    assert any(re.search(r"\brestores? into\b", p) and "`path`" in p for p in download), download

    # The chain, run for real: download_backup's `path` is one preview_restore reads.
    then = tmp_path / "then"
    write_library(then, grown=False)
    fake = FakeDropbox()
    fake.put(DAILY, backup_zip(then, BACKUP_AT), client_modified=BACKUP_AT)
    data_dir = tmp_path / "library"
    write_library(data_dir, grown=True)
    backups = _isolated_home / "bookvie-backups"
    backups.mkdir()
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    downloaded = structured_of(
        dropbox_call(DOWNLOAD_BACKUP, {"name": DAILY, "target": "bookvie"}, Connect(fake))
    )
    preview = client.answer(PREVIEW_RESTORE, {"path": downloaded["path"]})
    assert preview.get("isError") is not True, preview
    assert content_of(preview)["booksAddedSince"], preview


# --- AC-3: the preview, a question in the chat, and only then restore_backup ------------


# Un-skip when the skill shows UX-DR79's preview and asks before restore_backup.
@pytest.mark.skip(reason=RED)
def test_the_skill_shows_the_preview_in_its_words_and_calls_restore_backup_only_after_a_yes(
    tmp_path: Path, connect_mcp: Callable[..., McpClient]
) -> None:
    # [P0] AC-3
    skill = _restore_skill()
    body = _body(skill)
    flat = _flat(body)

    lines = [flat.find(line) for line in PREVIEW_LINES]
    assert -1 not in lines and lines == sorted(lines), lines

    assert PREVIEW_FIRST.search(flat), "no Restore *file* (*source*, *date, time*)? line"
    assert EVERYTHING_ELSE.search(flat)
    assert "No books or card notes were added since" in flat
    assert re.search(r"\bup to 5\b", flat, re.I) and re.search(r"and \*?N\*? more", flat)
    assert re.search(r"\b1 book\b", flat) and re.search(r"\b1 card note\b", flat)

    # Then it asks in the chat, in its own words, and restores only after a yes.
    assert re.search(r"\bown words\b", flat)
    after_yes = [
        p
        for p in _paragraphs(body)
        if "`restore_backup`" in p and re.search(r"\bonly\b[^.]*\byes\b", p, re.I)
    ]
    assert any(flat.find(p) > lines[-1] for p in after_yes), after_yes

    # Nothing gets around Claude Code's permission prompt or bookvie's question.
    assert not [name for name in allowed_tools(skill) or [] if name.endswith("restore_backup")]
    assert "/api/intents/restore" not in skill
    start = _section(skill, START_STEP, numbered=True) or ""
    assert all(is_health_or_probe(line) and line in start for line in curl_lines(skill))

    # The preview's fields the skill reads are the ones preview_restore answers.
    for field in ("`booksAddedSince`", "`cardNotesAddedSince`"):
        assert field in body, field
    scene = Scene(tmp_path, connect_mcp)
    preview = structured_of(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(DAILY)}))
    assert {"backupTime", "backup", "current", "booksAddedSince", "cardNotesAddedSince"} <= set(
        preview
    ), preview


# --- AC-4: each outcome in UX-DR81's words, and never a retry ---------------------------


# Un-skip when the skill reports each outcome of restore_backup and download_backup.
@pytest.mark.skip(reason=RED)
def test_the_skill_reports_each_outcome_in_its_words_and_never_retries_by_itself() -> None:
    # [P1] AC-4
    body = _body(_restore_skill())
    assert RESTORED.search(body), "no Restored line with a ~ path"

    outcomes = restore_outcomes()
    lines = body.splitlines()
    missing = []
    for start, names in OUTCOME_CODES.items():
        (texts,) = [t for label, t in outcomes.items() if label.startswith(start)]
        if not any(
            text_on(line, texts[0]) and all(f"`{n}`" in line for n in names) for line in lines
        ):
            missing.append(start)
    assert missing == []

    # The terminal advice, only for `reason` `unsupported`.
    (declined,) = [t for label, t in outcomes.items() if label.startswith("Declined")]
    advice = declined[1]
    assert [line for line in lines if advice in line and "`unsupported`" in line], advice
    assert re.search(r"\bonly\b[^.]*`unsupported`|`unsupported`[^.]*\bonly\b", _flat(body))
    assert "`reason`" in body and "`safetyCopy`" in body
    # Paths with `~` for the home folder; never a retry of its own.
    assert any("`~`" in line and "home folder" in line for line in lines)
    assert re.search(r"\b(?:never|don't|do not)\b[^.]*\bretr(?:y|ies)\b", _flat(body), re.I)


# --- AC-5: development uses the bookvie-dev tools, never the real library ---------------


# Un-skip when the skill works on bookvie-dev when asked to.
@pytest.mark.skip(reason=RED)
def test_on_development_the_skill_uses_the_bookvie_dev_tools_and_never_the_real_library() -> None:
    # [P0] AC-5
    skill = _restore_skill()
    body = _body(skill)
    dev = [
        p
        for p in _paragraphs(body)
        if "`bookvie-dev`" in p and "`download_backup`" in p and "`target`" in p
    ]
    assert any(re.search(r"\bnever\b[^.]*\breal library\b", p, re.I) for p in dev), dev

    # Started for development, it is the --dev server on 8766.
    start = _section(skill, START_STEP, numbered=True) or ""
    assert "bookvie --dev --no-browser" in start
    assert "curl -fsS http://127.0.0.1:8766/api/health" in start
