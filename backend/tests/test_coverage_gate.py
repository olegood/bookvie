"""The per-group coverage gate behind ``npm run check:py``: packages, and the restore path's modules."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

GATE = Path(__file__).resolve().parents[1] / "scripts" / "coverage_gate.py"


def _file(statements: int, covered: int) -> dict:
    return {"summary": {"num_statements": statements, "covered_lines": covered}}


def _report(tmp_path: Path, files: dict[str, tuple[int, int]]) -> Path:
    path = tmp_path / "coverage.json"
    payload = {"files": {name: _file(*counts) for name, counts in files.items()}}
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _run(report: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(GATE), str(report)], capture_output=True, text=True, timeout=30
    )


HEALTHY = {
    "bookvie/domain/a.py": (100, 95),
    "bookvie/intents/b.py": (50, 45),
    "bookvie/store/c.py": (50, 40),
    "bookvie_dropbox/upload.py": (80, 76),
    "bookvie_dropbox/auth.py": (20, 19),
    # The restore path's modules. The two in intents/ count in intents+store too, so they
    # have 0 statements here and leave that group's sums as they are.
    "bookvie/agent/restore_gate.py": (100, 96),
    "bookvie/intents/restore_file.py": (0, 0),
    "bookvie/intents/backup_file.py": (0, 0),
    "bookvie/agent/tools.py": (100, 0),  # agent/ outside the restore path
    "bookvie/cli.py": (100, 0),  # outside every gate
    "bookvie/http/app.py": (100, 0),
}


def test_all_groups_above_threshold_pass(tmp_path: Path) -> None:
    result = _run(_report(tmp_path, HEALTHY))
    assert result.returncode == 0, result.stdout + result.stderr
    assert "domain 95.00%" in result.stdout
    assert "intents+store 85.00%" in result.stdout
    assert "bookvie_dropbox 95.00% (95/100 lines, needs >= 90%) ok" in result.stdout
    assert "restore path 96.00% (96/100 lines, needs >= 90%) ok" in result.stdout


def test_bookvie_dropbox_just_below_90_fails_and_names_it(tmp_path: Path) -> None:
    # Epic 13's gate: 90% on bookvie_dropbox/, summed over its files (Story 13.2).
    files = HEALTHY | {"bookvie_dropbox/upload.py": (80, 70), "bookvie_dropbox/auth.py": (20, 19)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    fail = [line for line in result.stdout.splitlines() if "FAIL" in line]
    assert len(fail) == 1 and "bookvie_dropbox 89.00%" in fail[0]


def test_domain_at_89_percent_fails_and_names_domain(tmp_path: Path) -> None:
    files = HEALTHY | {"bookvie/domain/a.py": (100, 89)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    fail = [line for line in result.stdout.splitlines() if "FAIL" in line]
    assert fail == [fail[0]] and "domain 89.00%" in fail[0]


def test_domain_just_below_90_is_not_rounded_up(tmp_path: Path) -> None:
    files = HEALTHY | {"bookvie/domain/a.py": (10000, 8999)}
    assert _run(_report(tmp_path, files)).returncode == 1


def test_domain_exactly_90_passes(tmp_path: Path) -> None:
    files = HEALTHY | {"bookvie/domain/a.py": (10, 9)}
    assert _run(_report(tmp_path, files)).returncode == 0


def test_intents_and_store_combined_at_79_percent_fails(tmp_path: Path) -> None:
    files = HEALTHY | {"bookvie/intents/b.py": (50, 40), "bookvie/store/c.py": (50, 39)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    fail = [line for line in result.stdout.splitlines() if "FAIL" in line]
    assert len(fail) == 1 and "intents+store 79.00%" in fail[0]


def test_intents_and_store_are_summed_not_averaged(tmp_path: Path) -> None:
    # Averaged per package: (100% + 60%) / 2 = 80% would pass; summed it is 63.6%.
    files = HEALTHY | {"bookvie/intents/b.py": (10, 10), "bookvie/store/c.py": (100, 60)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    assert "intents+store 63.64%" in result.stdout


def test_groups_whose_files_have_zero_statements_pass(tmp_path: Path) -> None:
    files = {
        "bookvie/domain/__init__.py": (0, 0),
        "bookvie/store/__init__.py": (0, 0),
        "bookvie_dropbox/__init__.py": (0, 0),
        "bookvie/agent/restore_gate.py": (0, 0),
        "bookvie/intents/restore_file.py": (0, 0),
        "bookvie/intents/backup_file.py": (0, 0),
    }
    result = _run(_report(tmp_path, files))
    assert result.returncode == 0, result.stdout
    assert "domain 100.00% (0/0" in result.stdout
    assert "intents+store 100.00% (0/0" in result.stdout
    assert "bookvie_dropbox 100.00% (0/0" in result.stdout
    assert "restore path 100.00% (0/0" in result.stdout


@pytest.mark.parametrize(
    "files",
    [{}, {"bookvie/cli.py": (10, 0)}],
    ids=["no-files", "only-ungated"],
)
def test_groups_that_match_no_file_fail(tmp_path: Path, files: dict) -> None:
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    assert "domain FAIL: nothing under bookvie/domain/ was measured" in result.stdout
    assert (
        "intents+store FAIL: nothing under bookvie/intents/, bookvie/store/ was measured"
        in result.stdout
    )
    assert "bookvie_dropbox FAIL: nothing under bookvie_dropbox/ was measured" in result.stdout
    assert (
        "restore path FAIL: bookvie/agent/restore_gate.py, "
        "bookvie/intents/restore_file.py, bookvie/intents/backup_file.py not measured"
    ) in result.stdout


def test_groups_match_by_path_segment_not_prefix(tmp_path: Path) -> None:
    files = {
        "bookvie/domainish/x.py": (10, 0),
        "bookvie/storefront.py": (10, 0),
        "/repo/bookvie/backend/bookvie/domain/a.py": (10, 10),
        "backend\\bookvie\\store\\b.py": (10, 8),
        "bookvie/bookvie_dropbox_notes.py": (10, 0),
        "/repo/bookvie/backend/bookvie_dropbox/upload.py": (10, 9),
        "backend\\bookvie_dropbox\\auth.py": (10, 10),
        "bookvie/agent/my_restore_gate.py": (10, 0),
        "other/agent/restore_gate.py": (10, 0),
        "bookvie/agent/restore_gate.py.orig": (10, 0),
        "/repo/bookvie/backend/bookvie/agent/restore_gate.py": (10, 9),
        "backend\\bookvie\\intents\\restore_file.py": (0, 0),
        "bookvie/intents/backup_file.py": (0, 0),
    }
    result = _run(_report(tmp_path, files))
    assert result.returncode == 0, result.stdout
    assert "domain 100.00% (10/10" in result.stdout
    assert "intents+store 80.00% (8/10" in result.stdout
    assert "bookvie_dropbox 95.00% (19/20" in result.stdout
    assert "restore path 90.00% (9/10" in result.stdout


def test_the_restore_path_sums_its_three_modules(tmp_path: Path) -> None:
    # Epic 13's gate: 90% on the agent's restore path, summed over its modules (retro item 90).
    files = HEALTHY | {
        "bookvie/agent/restore_gate.py": (100, 96),
        "bookvie/intents/restore_file.py": (100, 88),
        "bookvie/intents/backup_file.py": (100, 95),
    }
    result = _run(_report(tmp_path, files))
    assert "restore path 93.00% (279/300 lines, needs >= 90%) ok" in result.stdout
    # The two intents/ modules count in intents+store too: (45 + 40 + 88 + 95) / 300.
    assert "intents+store 89.33% (268/300 lines" in result.stdout


def test_the_restore_path_just_below_90_fails_and_names_it(tmp_path: Path) -> None:
    files = HEALTHY | {"bookvie/agent/restore_gate.py": (100, 89)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    fail = [line for line in result.stdout.splitlines() if "FAIL" in line]
    assert len(fail) == 1 and "restore path 89.00%" in fail[0]


def test_a_restore_path_module_that_was_not_measured_fails_and_names_it(tmp_path: Path) -> None:
    # A renamed or moved module must not drop out of the gate unnoticed.
    files = {k: v for k, v in HEALTHY.items() if k != "bookvie/intents/restore_file.py"}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 1
    fail = [line for line in result.stdout.splitlines() if "FAIL" in line]
    assert fail == [
        "coverage gate: restore path FAIL: bookvie/intents/restore_file.py not measured"
    ]


def test_missing_report_fails(tmp_path: Path) -> None:
    result = _run(tmp_path / "absent.json")
    assert result.returncode == 1
    assert "cannot read" in result.stderr
