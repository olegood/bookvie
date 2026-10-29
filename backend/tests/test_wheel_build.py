"""The wheel ships the built SPA, and the build hook refuses a wheel without it.

Builds a real wheel with ``uv build`` from a copy of the backend sources, so
the packaging config and ``hatch_build.py`` run as they do on install.
"""

import shutil
import subprocess
import zipfile
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.skipif(shutil.which("uv") is None, reason="needs uv on PATH")


@pytest.fixture
def source(tmp_path: Path) -> Path:
    """The backend sources without any built SPA, under the repo's .gitignore.

    The copy keeps the repo layout so hatchling sees the same ignore rules as
    a real ``uv tool install ./backend``.
    """
    shutil.copy(BACKEND_ROOT.parent / ".gitignore", tmp_path)
    src = tmp_path / "backend"
    src.mkdir()
    shutil.copy(BACKEND_ROOT / "pyproject.toml", src)
    shutil.copy(BACKEND_ROOT / "hatch_build.py", src)
    shutil.copytree(
        BACKEND_ROOT / "bookvie",
        src / "bookvie",
        ignore=shutil.ignore_patterns("__pycache__", "static"),
    )
    return src


def _build_wheel(src: Path, out: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(out), str(src)],
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_wheel_contains_the_built_spa(source: Path, tmp_path: Path) -> None:
    static = source / "bookvie" / "http" / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<p>spa</p>")
    (static / "assets" / "index-abc123.js").write_text("console.log(1)")

    result = _build_wheel(source, tmp_path / "out")

    assert result.returncode == 0, result.stderr
    (wheel,) = (tmp_path / "out").glob("bookvie-*.whl")
    names = set(zipfile.ZipFile(wheel).namelist())
    assert "bookvie/http/static/index.html" in names
    assert "bookvie/http/static/assets/index-abc123.js" in names
    assert "bookvie/cli.py" in names


def test_build_refuses_without_the_spa(source: Path, tmp_path: Path) -> None:
    result = _build_wheel(source, tmp_path / "out")

    assert result.returncode != 0
    assert "npm run build" in result.stderr
    assert not list((tmp_path / "out").glob("*.whl"))
