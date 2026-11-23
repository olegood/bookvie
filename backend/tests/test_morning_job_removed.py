"""Story 13.5: take out the morning job (sprint-change-proposal-2026-11-23).

The 09:00 launchd job can't run on Oleg's Mac, so everything built for it goes:
the ``bookvie autobackup`` command, ``create_app``'s ``launchd_probe`` and
``views/backup``'s ``autoBackup``, the skill's and the guide's mentions of a
headless morning run, and the tests of all of it. The ``bookvie-backup`` skill
stays and is run by hand; ``local-state.json``'s ``autoBackup`` group,
``record_backup_upload`` and ``unchangedSinceUpload`` stay as they are (their
own tests, unchanged, pin that).

This module names the removed things only to check that they are gone, so
AC-5's scan of the tests leaves this one file out (see ``_THIS_MODULE``).
"""

import inspect
import re
from pathlib import Path

import pytest

from bookvie import cli as bookvie_cli
from bookvie import views as bookvie_views
from bookvie.http.app import create_app
from tests.helpers import EXPERIENCE_MD, api_client, failing_reasons
from tests.test_backup_skill import SKILL_TOOLS, _body, _frontmatter, _skill, allowed_tools
from tests.test_dropbox_backup_guide import (
    BACKUP_SKILL_LINK,
    GUIDE,
    README,
    _parses,
    guide_commands,
    headed,
    section,
)

ROOT = Path(__file__).resolve().parents[2]
BACKEND_SOURCE = ROOT / "backend" / "bookvie"
SCHEMA_D_TS = ROOT / "frontend" / "src" / "api" / "generated" / "schema.d.ts"
_THIS_MODULE = Path(__file__).resolve()

NEW_UPLOAD_INCOMPLETE = (
    "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again."
)
NEW_REASONS_HEADER = '| Cause | After "failed *when* · " |'

# What a Mac that had the job installed still has to clean up (Uninstalling's note).
BOOTOUT = "launchctl bootout gui/$(id -u)/com.bookvie.autobackup"
OLD_PLIST = "~/Library/LaunchAgents/com.bookvie.autobackup.plist"
OLD_LOGS = "~/Library/Logs/bookvie/"

# The job's code in cli.py, by name: the label, the tool lists, the launchctl seam,
# the plist writer and the claude runner with its own helpers.
JOB_NAMES = (
    "AUTOBACKUP_LABEL",
    "AUTOBACKUP_ALLOWED_TOOLS",
    "AUTOBACKUP_DISALLOWED_TOOLS",
    "AUTOBACKUP_SKILL",
    "AUTOBACKUP_PROMPT",
    "LAUNCHCTL",
    "launchd_job_installed",
    "_launchctl",
    "_launchd_domain",
    "_launch_agent_plist",
    "_autobackup_logs",
    "_autobackup_install",
    "_autobackup_uninstall",
    "_autobackup_run",
    "_autobackup",
    "_refuses_dev",
    "_stop",
    "_wait_for_health",
    "_now",
    "plistlib",
)

# AC-5: what no other test may name. Case matters for "autobackup": the stored
# `autoBackup` group stays, and its tests keep naming it.
_REMOVED_IN_TESTS = re.compile(r"[Ll]aunchd|autobackup")


def _flat(text: str) -> str:
    return " ".join(text.split())


def _test_files() -> list[Path]:
    """Every backend and frontend test file, except this module."""
    files = [*(ROOT / "backend" / "tests").rglob("*.py")]
    files += [*(ROOT / "frontend" / "e2e").rglob("*.ts")]
    files += [
        p for p in (ROOT / "frontend" / "src").rglob("*") if re.search(r"\.test\.tsx?$", p.name)
    ]
    return sorted(p for p in files if p.resolve() != _THIS_MODULE)


# --- AC-1: no `bookvie autobackup` ----------------------------------------------------


def test_bookvie_autobackup_is_not_a_command_and_cli_has_none_of_the_jobs_code(
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P0] AC-1
    refused = {
        action: _parses(bookvie_cli.parse_args, ["autobackup", action])
        for action in ("install", "uninstall", "run")
    }
    assert refused == {"install": "exit 2", "uninstall": "exit 2", "run": "exit 2"}
    # argparse's usage error ("invalid choice" or "unrecognized arguments", depending on
    # whether any subcommand is left), naming the word it refused.
    err = capsys.readouterr().err
    assert "usage: bookvie" in err and "error:" in err and "autobackup" in err, err

    # None of the job's code is left behind, under any name.
    left = [name for name in JOB_NAMES if hasattr(bookvie_cli, name)]
    assert left == []
    source = Path(bookvie_cli.__file__).read_text(encoding="utf-8").lower()
    said = [w for w in ("autobackup", "launchd", "launchctl", "plist", "claude") if w in source]
    assert said == []


# --- AC-2: no launchd probe, and views/backup without autoBackup -------------------------


def test_views_backup_carries_only_last_export_and_nothing_asks_launchd(tmp_path: Path) -> None:
    # [P0] AC-2
    response = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/backup")
    assert response.json() == {"lastExportAt": None}

    assert "launchd_probe" not in inspect.signature(create_app).parameters
    assert not hasattr(bookvie_views, "AutoBackupView")
    assert "AutoBackupView" not in bookvie_views.__all__
    # Nothing in bookvie runs launchctl or speaks of launchd.
    named = [
        str(path.relative_to(ROOT))
        for path in sorted(BACKEND_SOURCE.rglob("*.py"))
        if re.search(r"launchd|launchctl", path.read_text(encoding="utf-8"), re.I)
    ]
    assert named == []
    # The generated API types follow (`npm --prefix frontend run api:gen`).
    schema = SCHEMA_D_TS.read_text(encoding="utf-8")
    assert "AutoBackupView" not in schema and "autoBackup" not in schema


# --- AC-3: the skill runs by hand ------------------------------------------------------


def test_the_backup_skill_says_it_runs_by_hand_and_never_mentions_the_morning_job() -> None:
    # [P1] AC-3
    skill = _skill()
    said = [w for w in ("launchd", "09:00", "claude -p", "headless") if w in skill.lower()]
    assert said == []

    # Run by hand, in the description and in the body.
    description = _flat(_frontmatter(skill).split("allowed-tools:")[0])
    assert "/bookvie-backup" in description and "by hand" in description, description
    body = _flat(_body(skill))
    assert "/bookvie-backup" in body and "by hand" in body
    # Step 1's headless stop is gone.
    assert "can't run shell commands" not in skill
    # The new `upload_incomplete` line, word for word.
    assert f'- `upload_incomplete`: "Failed: {NEW_UPLOAD_INCOMPLETE}"' in [
        line.strip() for line in skill.splitlines()
    ]
    # The frontmatter's tools are unchanged.
    assert sorted(allowed_tools(skill) or []) == sorted(SKILL_TOOLS)

    # EXPERIENCE.md's Failed-reasons table, as `failing_reasons` reads it.
    experience = EXPERIENCE_MD.read_text(encoding="utf-8")
    assert "Pending Story 13.5" not in experience
    assert NEW_REASONS_HEADER in experience
    assert failing_reasons()[1] == NEW_UPLOAD_INCOMPLETE


# --- AC-4: the guide and the README ----------------------------------------------------


def test_the_guide_and_readme_describe_a_run_by_hand_and_how_to_remove_an_old_job() -> None:
    # [P1] AC-4
    text = GUIDE.read_text(encoding="utf-8")
    assert headed(text, r"Install the daily job") == []

    assert headed(text, r"Troubleshooting the daily job") == []
    assert [args for program, args in guide_commands(text) if args[:1] == ["autobackup"]] == []
    assert "bookvie autobackup" not in text
    assert "09:00" not in text

    # How it works: a run started by hand.
    works = _flat(section(text, "How it works"))
    assert "/bookvie-backup" in works and "by hand" in works, works
    for words in ("launchd", "claude -p", "headless"):
        assert words not in works, words

    # Uninstalling: no job lines, and one note for a Mac that had the job.
    uninstalling = section(text, "Uninstalling")
    flat = _flat(uninstalling)
    for words in (BOOTOUT, OLD_PLIST, OLD_LOGS):
        assert words in flat, words
    assert text.count("launchctl bootout") == 1
    outside = text.replace(uninstalling, "").lower()
    assert "launchd" not in outside and "daily job" not in outside

    # README → AI skills: the skill's entry no longer speaks of the daily job.
    ai_skills = section(README.read_text(encoding="utf-8"), "AI skills")
    (entry,) = [line for line in ai_skills.splitlines() if BACKUP_SKILL_LINK in line]
    assert "09:00" not in entry and not re.search(r"\bjob\b", entry), entry


# --- AC-5: the tests ------------------------------------------------------------------


def test_no_test_refers_to_the_autobackup_command_or_launchd() -> None:
    # [P1] AC-5
    assert not (ROOT / "backend" / "tests" / "test_autobackup.py").exists()

    named = {
        str(path.relative_to(ROOT)): sorted(set(found))
        for path in _test_files()
        if (found := _REMOVED_IN_TESTS.findall(path.read_text(encoding="utf-8")))
    }
    assert named == {}
