"""Enforce the layer import direction (ARCHITECTURE-SPINE: Design Paradigm).

Allowed edges: ``domain`` imports no other layer; ``store`` imports ``domain``;
``intents`` and ``views`` import ``domain`` and ``store``; ``http`` imports
``intents`` and ``views``. Every other cross-layer import is forbidden.

Outside the layers, the package holds only ``__init__``, ``cli`` (the
composition root) and ``instance`` (the single-instance lock it uses). No
layer may import them, so a top-level module can never become a side channel
between layers.
"""

import ast
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "bookvie"

LAYERS = {"http", "intents", "views", "domain", "store"}
TOP_LEVEL_MODULES = {"__init__", "cli", "instance"}
# Any `bookvie.<name>` that is not a layer is grouped under this target.
TOP_LEVEL = "toplevel"
ALLOWED: dict[str, set[str]] = {
    "domain": set(),
    "store": {"domain"},
    "intents": {"domain", "store"},
    "views": {"domain", "store"},
    "http": {"intents", "views"},
}


def _module_parts(path: Path, root: Path) -> list[str]:
    rel = path.relative_to(root.parent).with_suffix("")
    parts = list(rel.parts)
    if parts[-1] == "__init__":
        parts.pop()
    return parts


def _imported_modules(path: Path, root: Path = PACKAGE_ROOT) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    parts = _module_parts(path, root)
    package = parts if path.name == "__init__.py" else parts[:-1]
    found: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                base = package[: len(package) - (node.level - 1)]
                module = ".".join([*base, *([node.module] if node.module else [])])
            else:
                module = node.module or ""
            found.append(module)
            # `from bookvie import store` imports the layer by name.
            for alias in node.names:
                found.append(f"{module}.{alias.name}")
    return found


def _target_layer(module: str) -> str | None:
    parts = module.split(".")
    if parts[0] != "bookvie":
        return None
    if len(parts) < 2:
        return None
    return parts[1] if parts[1] in LAYERS else TOP_LEVEL


def _layer_sources() -> list[tuple[str, Path]]:
    return [
        (layer, path)
        for layer in sorted(LAYERS)
        for path in sorted((PACKAGE_ROOT / layer).rglob("*.py"))
    ]


def test_every_layer_package_exists() -> None:
    for layer in LAYERS:
        assert (PACKAGE_ROOT / layer / "__init__.py").is_file(), layer


def test_top_level_holds_only_cli_instance_and_layers() -> None:
    modules = {p.stem for p in PACKAGE_ROOT.glob("*.py")}
    packages = {p.parent.name for p in PACKAGE_ROOT.glob("*/__init__.py")}
    assert modules == TOP_LEVEL_MODULES
    assert packages == LAYERS


@pytest.mark.parametrize(
    ("layer", "path"),
    _layer_sources(),
    ids=lambda v: str(v.relative_to(PACKAGE_ROOT)) if isinstance(v, Path) else v,
)
def test_no_forbidden_import(layer: str, path: Path) -> None:
    forbidden = []
    for module in _imported_modules(path):
        target = _target_layer(module)
        if target is None or target == layer:
            continue
        if target not in ALLOWED[layer]:
            forbidden.append(module)
    assert not forbidden, f"{path.relative_to(PACKAGE_ROOT)} imports {forbidden}"


def test_scanner_catches_violations(tmp_path: Path) -> None:
    root = tmp_path / "bookvie"
    (root / "domain").mkdir(parents=True)
    bad = root / "domain" / "bad.py"
    bad.write_text(
        "from ..store import x\nimport bookvie.http.app\nfrom bookvie import views\n"
        "from bookvie import cli\nimport bookvie.util\n"
    )
    targets = {_target_layer(m) for m in _imported_modules(bad, root)} - {None}
    assert targets == {"store", "http", "views", TOP_LEVEL}
