"""Refuse to build an installable wheel that does not contain the SPA."""

from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class SpaBuildHook(BuildHookInterface):
    def initialize(self, version: str, build_data: dict) -> None:
        # Editable installs (`uv sync`) serve the SPA from the source tree.
        if version == "editable":
            return
        index = Path(self.root) / "bookvie" / "http" / "static" / "index.html"
        if not index.is_file():
            raise RuntimeError(
                "The bookvie web app has not been built. "
                "Run `npm run build` in the repository root, then install again."
            )
