"""Enforce the layer import direction (ARCHITECTURE-SPINE: Design Paradigm).

Allowed edges: ``domain`` imports no other layer; ``store`` imports ``domain``;
``intents`` imports ``domain`` and ``store``; ``views`` imports ``domain``,
``store`` and, of ``intents``, only ``intents.contract`` (the AD-9 error
types, for the views that refuse);
``agent`` imports ``intents`` and ``views``; ``http`` imports ``agent``,
``intents`` and ``views``. Every other cross-layer import is forbidden.

Outside the layers, the package holds only ``__init__``, ``cli`` (the
composition root) and ``instance`` (the single-instance lock it uses). No
layer may import them, so a top-level module can never become a side channel
between layers.

``bookvie`` and ``bookvie_dropbox`` (Story 13.2, AD-22) never import each other,
and nothing under ``bookvie/`` imports ``dropbox`` or ``keyring``: the two
processes meet only through files in a backups folder.
"""

import ast
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "bookvie"
DROPBOX_ROOT = PACKAGE_ROOT.parent / "bookvie_dropbox"
BOOKVIE_NEVER_IMPORTS = {"bookvie_dropbox", "dropbox", "keyring"}
DROPBOX_NEVER_IMPORTS = {"bookvie"}

RED = "ATDD red phase (Story 13.2): bookvie_dropbox isn't built yet"

LAYERS = {"http", "agent", "intents", "views", "domain", "store"}
TOP_LEVEL_MODULES = {"__init__", "cli", "instance"}
# Any `bookvie.<name>` that is not a layer is grouped under this target.
TOP_LEVEL = "toplevel"
ALLOWED: dict[str, set[str]] = {
    "domain": set(),
    "store": {"domain"},
    "intents": {"domain", "store"},
    "views": {"domain", "store"},
    "agent": {"intents", "views"},
    "http": {"agent", "intents", "views"},
}
# Single modules (and the names they define) a layer may import from a layer it
# may not import as a whole.
ALLOWED_MODULES: dict[str, tuple[str, ...]] = {
    "views": ("bookvie.intents.contract",),
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


def _allowed_module(layer: str, module: str) -> bool:
    return any(
        module == allowed or module.startswith(f"{allowed}.")
        for allowed in ALLOWED_MODULES.get(layer, ())
    )


def _forbidden(layer: str, modules: list[str]) -> list[str]:
    """The imported ``modules`` that ``layer`` may not import."""
    forbidden = []
    for module in modules:
        target = _target_layer(module)
        if target is None or target == layer:
            continue
        if target not in ALLOWED[layer] and not _allowed_module(layer, module):
            forbidden.append(module)
    return forbidden


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
    forbidden = _forbidden(layer, _imported_modules(path))
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


def test_views_may_import_only_intents_contract_of_the_intents_layer(tmp_path: Path) -> None:
    root = tmp_path / "bookvie"
    (root / "views").mkdir(parents=True)
    view = root / "views" / "view.py"
    view.write_text(
        "from bookvie.intents.contract import book_not_found\n"
        "from bookvie.intents.add_book import add_book\n"
        "from bookvie.intents import commit\n"
        "import bookvie.intents.contracts_extra\n"
    )
    assert _forbidden("views", _imported_modules(view, root)) == [
        "bookvie.intents.add_book",
        "bookvie.intents.add_book.add_book",
        "bookvie.intents",
        "bookvie.intents.commit",
        "bookvie.intents.contracts_extra",
    ]


def _crossings(root: Path, banned: set[str]) -> dict[str, list[str]]:
    """Each module under ``root`` that imports a top-level package in ``banned``, with them."""
    found: dict[str, list[str]] = {}
    for path in sorted(root.rglob("*.py")):
        tops = {module.split(".")[0] for module in _imported_modules(path, root)}
        if tops & banned:
            found[str(path.relative_to(root.parent))] = sorted(tops & banned)
    return found


# Red phase: un-skip when the build adds bookvie_dropbox (Story 13.2).
@pytest.mark.skip(reason=RED)
def test_bookvie_and_bookvie_dropbox_never_import_each_other() -> None:
    # [P0] AC-2
    assert (DROPBOX_ROOT / "__init__.py").is_file(), DROPBOX_ROOT
    assert _crossings(PACKAGE_ROOT, BOOKVIE_NEVER_IMPORTS) == {}
    assert _crossings(DROPBOX_ROOT, DROPBOX_NEVER_IMPORTS) == {}


def test_the_cross_package_scanner_catches_each_crossing(tmp_path: Path) -> None:
    bookvie = tmp_path / "bookvie" / "intents"
    bookvie.mkdir(parents=True)
    (bookvie / "bad.py").write_text(
        "import dropbox\nfrom keyring import get_password\nimport bookvie_dropbox.server\n"
        "from . import commit\nimport json\n"
    )
    (bookvie / "fine.py").write_text("from .backup_file import dropbox_content_hash\n")
    dropbox_side = tmp_path / "bookvie_dropbox"
    dropbox_side.mkdir()
    (dropbox_side / "bad.py").write_text("from bookvie.intents import backup_file\n")
    (dropbox_side / "worse.py").write_text("import bookvie\n")
    (dropbox_side / "fine.py").write_text(
        "import dropbox\nimport keyring\nfrom . import contracts\n"
    )

    assert _crossings(tmp_path / "bookvie", BOOKVIE_NEVER_IMPORTS) == {
        "bookvie/intents/bad.py": ["bookvie_dropbox", "dropbox", "keyring"]
    }
    assert _crossings(dropbox_side, DROPBOX_NEVER_IMPORTS) == {
        "bookvie_dropbox/bad.py": ["bookvie"],
        "bookvie_dropbox/worse.py": ["bookvie"],
    }
