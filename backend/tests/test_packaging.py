"""The SPA build output, the served folder and the wheel contents must agree."""

import re
import tomllib
from pathlib import Path

import pytest

from bookvie.http.app import STATIC_DIR

BACKEND_ROOT = Path(__file__).resolve().parents[1]
VITE_CONFIG = BACKEND_ROOT.parent / "frontend" / "vite.config.ts"


def test_vite_builds_into_the_served_folder() -> None:
    if not VITE_CONFIG.is_file():
        pytest.skip("frontend sources are not next to the backend")
    match = re.search(r"outDir:\s*'([^']+)'", VITE_CONFIG.read_text(encoding="utf-8"))
    assert match, "vite.config.ts has no outDir"
    assert (VITE_CONFIG.parent / match.group(1)).resolve() == STATIC_DIR


def test_wheel_ships_the_served_folder() -> None:
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    wheel = pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]
    static = STATIC_DIR.relative_to(BACKEND_ROOT).as_posix()
    assert f"{static}/**" in wheel["artifacts"]
    assert "custom" in wheel["hooks"], "the SPA build hook is not registered"
