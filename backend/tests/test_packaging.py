"""The SPA build output, the served folder and the wheel contents must agree."""

import json
import re
import tomllib
from pathlib import Path

import pytest

from bookvie.cli import DEFAULT_PORT, HOST
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
    assert match.group(1) == f"http://{HOST}:{DEFAULT_PORT}"
    assert re.search(r"'/api':\s*backend", config), "/api is not proxied"
    assert re.search(r"'/media':\s*backend", config), "/media is not proxied"
    assert re.search(r"port:\s*5173\b", config), "Vite dev server is not on :5173"


def test_wheel_ships_the_served_folder() -> None:
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    wheel = pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]
    static = STATIC_DIR.relative_to(BACKEND_ROOT).as_posix()
    assert f"{static}/**" in wheel["artifacts"]
    assert "custom" in wheel["hooks"], "the SPA build hook is not registered"


def test_root_check_runs_the_four_steps_in_order_and_stops_at_the_first_failure() -> None:
    package = BACKEND_ROOT.parent / "package.json"
    if not package.is_file():
        pytest.skip("the repo root is not next to the backend")
    scripts = json.loads(package.read_text(encoding="utf-8"))["scripts"]
    steps = ["check:py", "check:api", "check:e2e", "check:smoke"]
    assert scripts["check"] == " && ".join(f"npm run {step}" for step in steps)
    assert all(step in scripts for step in steps)
