"""The single ordered migration chain (AD-13).

``STEPS[n]`` upgrades a raw document from ``schemaVersion`` n to n + 1. Startup
and restore both run :func:`migrate`. Every persisted-shape change adds exactly
one step and bumps ``CURRENT_VERSION``.
"""

import copy
from collections.abc import Callable

CURRENT_VERSION = 3


def _add_start_page(doc: dict) -> dict:
    """v1 to v2: every stored Reading counts from page 0, since its real start is unknown."""
    for book in doc["books"]:
        for reading in book["readings"]:
            reading["startPage"] = 0
    doc["schemaVersion"] = 2
    return doc


def _add_earlier_segments(doc: dict) -> dict:
    """v2 to v3: every stored Reading is one segment from its ``startPage``, so its pace is unchanged.

    ``earlierSegments`` goes right after ``startPage``, the key order the model writes.
    """
    for book in doc["books"]:
        readings = []
        for reading in book["readings"]:
            upgraded = {}
            for key, value in reading.items():
                upgraded[key] = value
                if key == "startPage":
                    upgraded["earlierSegments"] = []
            readings.append(upgraded)
        book["readings"] = readings
    doc["schemaVersion"] = 3
    return doc


STEPS: dict[int, Callable[[dict], dict]] = {1: _add_start_page, 2: _add_earlier_segments}


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
