"""The single ordered migration chain (AD-13).

``STEPS[n]`` upgrades a raw document from ``schemaVersion`` n to n + 1. Startup
and restore both run :func:`migrate`. Every persisted-shape change adds exactly
one step and bumps ``CURRENT_VERSION``.
"""

import copy
from collections.abc import Callable

CURRENT_VERSION = 2


def _add_start_page(doc: dict) -> dict:
    """v1 to v2: every stored Reading counts from page 0, since its real start is unknown."""
    for book in doc["books"]:
        for reading in book["readings"]:
            reading["startPage"] = 0
    doc["schemaVersion"] = 2
    return doc


STEPS: dict[int, Callable[[dict], dict]] = {1: _add_start_page}


def migrate(doc: dict) -> dict:
    """Run every step from ``doc``'s version up to ``CURRENT_VERSION``, in memory.

    The input is never modified. A step that raises propagates its exception.
    """
    doc = copy.deepcopy(doc)
    version = doc["schemaVersion"]
    while version < CURRENT_VERSION:
        step = STEPS.get(version)
        if step is None:
            raise ValueError(f"no migration step from schemaVersion {version}")
        doc = step(doc)
        version += 1
        if doc.get("schemaVersion") != version:
            raise ValueError(f"the migration step to schemaVersion {version} did not set it")
    return doc
