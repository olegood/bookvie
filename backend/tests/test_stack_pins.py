"""Every dependency stays inside its ARCHITECTURE-SPINE.md → Stack series.

The Spine's Stack table is the source of truth: each row maps to a manifest
entry, and both the declared range and the locked version must sit inside
the row's series (``0.162.x``, ``5.x``, ``3.14``).
"""

import json
import re
import tomllib
from pathlib import Path

import pytest
from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet
from packaging.version import Version

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SPINE = (
    REPO_ROOT
    / "_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29"
    / "ARCHITECTURE-SPINE.md"
)
FRONTEND_PACKAGE = REPO_ROOT / "frontend" / "package.json"
FRONTEND_LOCK = REPO_ROOT / "frontend" / "package-lock.json"

# Spine row name (text before any parenthesis) -> (ecosystem, package).
# `uv` is the install tool, not a manifest entry.
STACK_ROWS: dict[str, tuple[str, str] | None] = {
    "Python": ("python", "python"),
    "uv": None,
    "hatchling": ("build", "hatchling"),
    "FastAPI": ("pypi", "fastapi"),
    "Pydantic": ("pypi", "pydantic"),
    "Uvicorn": ("pypi", "uvicorn"),
    "python-multipart": ("pypi", "python-multipart"),
    "Pillow": ("pypi", "pillow"),
    "pytest": ("pypi", "pytest"),
    "pytest-cov": ("pypi", "pytest-cov"),
    "Hypothesis": ("pypi", "hypothesis"),
    "httpx": ("pypi", "httpx"),
    "React": ("npm", "react"),
    "TypeScript": ("npm", "typescript"),
    "Vite": ("npm", "vite"),
    "openapi-typescript": ("npm", "openapi-typescript"),
    "TanStack Query": ("npm", "@tanstack/react-query"),
    "React Router": ("npm", "react-router"),
    "Playwright": ("npm", "@playwright/test"),
}

pytestmark = pytest.mark.skipif(
    not (SPINE.is_file() and FRONTEND_LOCK.is_file()),
    reason="needs the full repository checkout (Spine and frontend lock)",
)


def _spine_stack() -> dict[str, tuple[int, ...]]:
    text = SPINE.read_text(encoding="utf-8")
    section = text.split("## Stack", 1)[1].split("\n## ", 1)[0]
    rows: dict[str, tuple[int, ...]] = {}
    for name, version in re.findall(r"^\| ([^|]+?) \| ([\d.x]+) \|$", section, re.M):
        name = name.split(" (", 1)[0].strip()
        rows[name] = tuple(int(p) for p in version.removesuffix(".x").split("."))
    return rows


def _in_series(version: str, series: tuple[int, ...]) -> bool:
    return Version(version).release[: len(series)] == series


def _next_series(series: tuple[int, ...]) -> str:
    return ".".join(map(str, (*series[:-1], series[-1] + 1)))


def _python_specs() -> dict[str, SpecifierSet]:
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    entries = [
        *pyproject["project"]["dependencies"],
        *pyproject["dependency-groups"]["dev"],
        *pyproject["build-system"]["requires"],
    ]
    specs = {Requirement(e).name.lower(): Requirement(e).specifier for e in entries}
    specs["python"] = SpecifierSet(pyproject["project"]["requires-python"])
    return specs


def _uv_locked() -> dict[str, str]:
    lock = tomllib.loads((BACKEND_ROOT / "uv.lock").read_text(encoding="utf-8"))
    return {p["name"]: p["version"] for p in lock["package"]}


def _previous_series_top(series: tuple[int, ...]) -> str | None:
    if series[-1] == 0:
        return None
    return ".".join(map(str, (*series[:-1], series[-1] - 1, 999)))


def _stack_params(ecosystems: set[str]) -> list:
    if not SPINE.is_file():
        return []
    return [
        pytest.param(STACK_ROWS[row][1], series, id=row)
        for row, series in _spine_stack().items()
        if STACK_ROWS.get(row) and STACK_ROWS[row][0] in ecosystems
    ]


def test_every_spine_row_is_mapped() -> None:
    assert set(_spine_stack()) == set(STACK_ROWS)


@pytest.mark.parametrize(("package", "series"), _stack_params({"python", "build", "pypi"}))
def test_python_range_stays_in_series(package: str, series: tuple[int, ...]) -> None:
    spec = _python_specs()[package]
    assert not spec.contains(_next_series(series)), f"{package} {spec} admits the next series"
    previous = _previous_series_top(series)
    assert previous is None or not spec.contains(previous), f"{package} {spec} admits {previous}"


@pytest.mark.parametrize(("package", "series"), _stack_params({"npm"}))
def test_npm_range_stays_in_series(package: str, series: tuple[int, ...]) -> None:
    manifest = json.loads(FRONTEND_PACKAGE.read_text(encoding="utf-8"))
    declared = {**manifest["dependencies"], **manifest["devDependencies"]}[package]
    # `5.x` allows caret ranges; `19.3.x` needs a tilde range.
    operator = "^" if len(series) == 1 else "~"
    assert declared.startswith(f"{operator}{'.'.join(map(str, series))}."), f"{package} {declared}"


@pytest.mark.parametrize(("package", "series"), _stack_params({"pypi"}))
def test_uv_lock_resolves_in_series(package: str, series: tuple[int, ...]) -> None:
    locked = _uv_locked()[package]
    assert _in_series(locked, series), f"{package} locked at {locked}"


@pytest.mark.parametrize(("package", "series"), _stack_params({"npm"}))
def test_npm_lock_resolves_in_series(package: str, series: tuple[int, ...]) -> None:
    lock = json.loads(FRONTEND_LOCK.read_text(encoding="utf-8"))
    locked = lock["packages"][f"node_modules/{package}"]["version"]
    assert _in_series(locked, series), f"{package} locked at {locked}"


def test_series_helpers_reject_neighbours() -> None:
    assert _in_series("0.162.4", (0, 162))
    assert not _in_series("0.163.0", (0, 162))
    assert not _in_series("6.0.0", (5,))
    assert _next_series((3, 14)) == "3.15"
    assert _previous_series_top((13,)) == "12.999"
    assert _previous_series_top((0, 0)) is None
    # A range widened past its series is what the manifest test must catch.
    assert SpecifierSet(">=0.162,<0.164").contains(_next_series((0, 162)))
