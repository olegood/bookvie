"""The single ordered migration chain (AD-13).

``STEPS[n]`` upgrades a raw document from ``schemaVersion`` n to n + 1. Startup
and restore both run :func:`migrate`. The chain is empty at version 1; every
persisted-shape change adds exactly one step and bumps ``CURRENT_VERSION``.
"""

import copy
from collections.abc import Callable

CURRENT_VERSION = 1

STEPS: dict[int, Callable[[dict], dict]] = {}


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
