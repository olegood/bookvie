"""The ``app-info`` view: which bookvie this is, in which mode, on which folder (AD-6)."""

from pathlib import Path
from typing import Literal

from .models import _View

Mode = Literal["dev", "production"]


class AppInfoView(_View):
    """Which bookvie answers: its version, mode, data folder and (dev only) commit."""

    version: str
    """``bookvie.__version__``, passed in by the CLI (``views`` can't import the package's top level)."""
    mode: Mode
    """``dev`` exactly when the server was started with ``--dev``."""
    data_dir: str
    """The resolved data folder for display: ``~`` for the home folder, else absolute."""
    commit: str | None
    """The short git hash read once at a ``--dev`` start; ``None`` in production or without git."""


def display_path(folder: Path, home: Path) -> str:
    """``folder`` with the home folder shown as ``~``; absolute when outside it."""
    folder = folder.resolve()
    home = home.resolve()
    if folder == home:
        return "~"
    if folder.is_relative_to(home):
        return "~/" + folder.relative_to(home).as_posix()
    return str(folder)


def app_info(*, version: str, dev: bool, data_dir: Path | None, commit: str | None) -> AppInfoView:
    return AppInfoView(
        version=version,
        mode="dev" if dev else "production",
        data_dir=display_path(data_dir, Path.home()) if data_dir is not None else "",
        commit=commit,
    )
