"""The per-package coverage gate behind ``npm run check:py``."""

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
    "bookvie/cli.py": (100, 0),  # outside every gate
    "bookvie/http/app.py": (100, 0),
}


def test_all_groups_above_threshold_pass(tmp_path: Path) -> None:
    result = _run(_report(tmp_path, HEALTHY))
    assert result.returncode == 0, result.stdout + result.stderr
    assert "domain 95.00%" in result.stdout
    assert "intents+store 85.00%" in result.stdout


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
    files = {"bookvie/domain/__init__.py": (0, 0), "bookvie/store/__init__.py": (0, 0)}
    result = _run(_report(tmp_path, files))
    assert result.returncode == 0, result.stdout
    assert "domain 100.00% (0/0" in result.stdout
    assert "intents+store 100.00% (0/0" in result.stdout


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


def test_groups_match_by_path_segment_not_prefix(tmp_path: Path) -> None:
    files = {
        "bookvie/domainish/x.py": (10, 0),
        "bookvie/storefront.py": (10, 0),
        "/repo/bookvie/backend/bookvie/domain/a.py": (10, 10),
        "backend\\bookvie\\store\\b.py": (10, 8),
    }
    result = _run(_report(tmp_path, files))
    assert result.returncode == 0, result.stdout
    assert "domain 100.00% (10/10" in result.stdout
    assert "intents+store 80.00% (8/10" in result.stdout


def test_missing_report_fails(tmp_path: Path) -> None:
    result = _run(tmp_path / "absent.json")
    assert result.returncode == 1
    assert "cannot read" in result.stderr
