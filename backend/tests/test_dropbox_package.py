"""Story 13.2: ``bookvie_dropbox`` ships in bookvie's wheel, with its own command (AD-22).

``backend/pyproject.toml`` gains the two runtime dependencies and the second
package and console script; ``uv.lock`` resolves them. The Stack series of
each is ``test_stack_pins.py``'s to check, and the wheel's contents
``test_wheel_build.py``'s. The install smoke test (``scripts/smoke.mjs``) runs
the installed ``bookvie-dropbox --help``.
"""

import re
import tomllib
from pathlib import Path

from packaging.requirements import Requirement
from packaging.version import Version

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SMOKE = BACKEND_ROOT.parent / "scripts" / "smoke.mjs"

# The versions on PyPI on 2026-11-22, when this story's ATDD ran (dropbox 12.2.5 was
# uploaded 2026-11-13, keyring 25.7.0 2025-11-16). The lock may be newer in their series.
CHECKED_ON_PYPI = {"dropbox": "12.2.5", "keyring": "25.7.0"}


def test_the_project_ships_bookvie_dropbox_with_its_command_and_both_dependencies() -> None:
    # [P0] AC-1
    pyproject = tomllib.loads((BACKEND_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    wheel = pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]

    assert wheel["packages"] == ["bookvie", "bookvie_dropbox"]
    assert (BACKEND_ROOT / "bookvie_dropbox" / "__init__.py").is_file()

    runtime = {
        Requirement(entry).name.lower(): Requirement(entry)
        for entry in pyproject["project"]["dependencies"]
    }
    dev = {Requirement(entry).name.lower() for entry in pyproject["dependency-groups"]["dev"]}
    for name, version in CHECKED_ON_PYPI.items():
        assert name in runtime, f"{name} is not a runtime dependency"
        assert name not in dev, f"{name} is a dev dependency too"
        assert runtime[name].specifier.contains(version), (name, str(runtime[name].specifier))

    scripts = pyproject["project"]["scripts"]
    assert scripts["bookvie"] == "bookvie.cli:main"
    module, _, function = scripts["bookvie-dropbox"].partition(":")
    assert module.split(".")[0] == "bookvie_dropbox" and function, scripts["bookvie-dropbox"]

    lock = tomllib.loads((BACKEND_ROOT / "uv.lock").read_text(encoding="utf-8"))
    locked = {package["name"]: package for package in lock["package"]}
    for name, version in CHECKED_ON_PYPI.items():
        assert Version(locked[name]["version"]) >= Version(version), (name, locked[name]["version"])
    project = locked["bookvie"]
    assert {d["name"] for d in project["dependencies"]} >= set(CHECKED_ON_PYPI), project[
        "dependencies"
    ]

    smoke = SMOKE.read_text(encoding="utf-8")
    assert re.search(r"['\"]bookvie-dropbox['\"]", smoke), "smoke.mjs never names bookvie-dropbox"
    assert re.search(r"['\"]--help['\"]", smoke), "smoke.mjs never runs --help"
