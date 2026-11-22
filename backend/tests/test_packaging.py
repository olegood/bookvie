"""The SPA build output, the served folder and the wheel contents must agree."""

import json
import re
import shutil
import subprocess
import tomllib
from pathlib import Path

import pytest

from bookvie.cli import DEV_PORT, HOST
from bookvie.http.app import STATIC_DIR

BACKEND_ROOT = Path(__file__).resolve().parents[1]
VITE_CONFIG = BACKEND_ROOT.parent / "frontend" / "vite.config.ts"


def test_vite_builds_into_the_served_folder() -> None:
    if not VITE_CONFIG.is_file():
        pytest.skip("frontend sources are not next to the backend")
    match = re.search(r"outDir:\s*'([^']+)'", VITE_CONFIG.read_text(encoding="utf-8"))
    assert match, "vite.config.ts has no outDir"
    assert (VITE_CONFIG.parent / match.group(1)).resolve() == STATIC_DIR


def test_vite_dev_proxy_targets_the_cli_server() -> None:
    if not VITE_CONFIG.is_file():
        pytest.skip("frontend sources are not next to the backend")
    config = VITE_CONFIG.read_text(encoding="utf-8")
    match = re.search(r"const backend = \{\s*target: '([^']+)',\s*changeOrigin: true\s*\}", config)
    assert match, "vite.config.ts has no backend target with changeOrigin: true"
    # Vite runs beside `bookvie --dev`, which defaults to its own port (Story 11.2).
    assert match.group(1) == f"http://{HOST}:{DEV_PORT}"
    assert re.search(r"'/api':\s*backend", config), "/api is not proxied"
    assert re.search(r"'/media':\s*backend", config), "/media is not proxied"
    assert re.search(r"'/favicon.svg':\s*backend", config), "/favicon.svg is not proxied"
    assert re.search(r"port:\s*5173\b", config), "Vite dev server is not on :5173"


def test_wheel_ships_the_served_folder() -> None:
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    wheel = pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]
    static = STATIC_DIR.relative_to(BACKEND_ROOT).as_posix()
    assert f"{static}/**" in wheel["artifacts"]
    assert "custom" in wheel["hooks"], "the SPA build hook is not registered"


def test_root_check_runs_the_four_steps_in_phases_and_stops_at_the_first_failure() -> None:
    """check:api first, then check:py and check:e2e together, then check:smoke.

    ``scripts/check.mjs --plan`` prints the phases without running them.
    check:smoke must come after check:e2e: its build empties static/, which the
    e2e servers serve.
    """
    root = BACKEND_ROOT.parent
    package = root / "package.json"
    if not package.is_file() or shutil.which("node") is None:
        pytest.skip("needs the repo root next to the backend, and node")
    scripts = json.loads(package.read_text(encoding="utf-8"))["scripts"]
    assert scripts["check"] == "node scripts/check.mjs"
    plan = subprocess.run(
        ["node", "scripts/check.mjs", "--plan"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    phases = json.loads(plan.stdout)
    assert phases == [["check:api"], ["check:py", "check:e2e"], ["check:smoke"]]
    assert all(step in scripts for phase in phases for step in phase)
