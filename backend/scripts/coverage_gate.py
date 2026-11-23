"""Per-group line-coverage gate for ``npm run check:py``.

Reads the JSON report written by ``pytest --cov-report=json:<path>`` and sums
statements and covered lines per group, matched by path segments: a group of
packages (``bookvie/domain/...``, or the whole ``bookvie_dropbox/...`` package),
or a group of named modules (``bookvie/intents/restore_file.py``). Prints each
group's percentage and exits 1 when any group is below its threshold. A group
whose files have 0 statements passes; a group that matched no file at all fails,
since nothing was measured, and so does a module group missing any of its modules.

Usage: ``python scripts/coverage_gate.py [backend/.coverage.json]``
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


@dataclass(frozen=True)
class Gate:
    name: str
    packages: tuple[str, ...]
    threshold: float  # percent
    modules: tuple[str, ...] = ()
    """Module paths (``bookvie/agent/restore_gate.py``) matched by their trailing path
    segments. When set, the gate measures these files and ignores ``packages``."""


DROPBOX_PACKAGE = "bookvie_dropbox"
"""bookvie-dropbox's package (Story 13.2), gated whole: Epic 13's gate asks for 90%."""

RESTORE_PATH = (
    "bookvie/agent/restore_gate.py",
    "bookvie/intents/restore_file.py",
    "bookvie/intents/backup_names.py",
    "bookvie/intents/backup_daily.py",
    "bookvie/intents/backup_listing.py",
    "bookvie/intents/backup_restore.py",
)
"""The agent's restore path (Story 13.1), gated as whole modules: Epic 13's gate asks for
90% (retro item 90). Of the backup modules (retro item 95), the restore half: the allowed
names, the listing, and the path and safety-copy rules, and ``backup_daily.py``, because
the safety copy writes through its ``_write_atomic``. Only ``backup_upload.py`` counts
solely in intents+store."""

GATES = (
    Gate("domain", ("domain",), 90.0),
    Gate("intents+store", ("intents", "store"), 80.0),
    Gate(DROPBOX_PACKAGE, (DROPBOX_PACKAGE,), 90.0),
    Gate("restore path", (), 90.0, modules=RESTORE_PATH),
)


@dataclass(frozen=True)
class Result:
    gate: Gate
    statements: int
    covered: int
    files: int = 0
    unmatched: tuple[str, ...] = ()
    """The gate's named modules that matched no file."""

    @property
    def percent(self) -> float:
        return 100.0 if self.statements == 0 else 100.0 * self.covered / self.statements

    @property
    def passed(self) -> bool:
        if self.files == 0 or self.unmatched:
            return False  # nothing (or not everything) measured: a path or --cov target mistake
        # Integer comparison, so 89.99% never rounds up to a pass.
        return self.covered * 100 >= self.gate.threshold * self.statements


def _parts(path: str) -> tuple[str, ...]:
    return PurePosixPath(path.replace("\\", "/")).parts


def _package_of(path: str) -> str | None:
    """The group key of a measured file: ``bookvie/<layer>/...`` -> ``<layer>``, and
    ``bookvie_dropbox/...`` -> ``bookvie_dropbox``."""
    parts = _parts(path)
    # The innermost package segment wins; an outer ``bookvie`` may be the repo.
    for i in reversed(range(len(parts) - 1)):
        if parts[i] == DROPBOX_PACKAGE:
            return DROPBOX_PACKAGE
        if parts[i] == "bookvie" and i < len(parts) - 2:
            return parts[i + 1]
    return None


def _module_of(path: str, modules: tuple[str, ...]) -> str | None:
    """The named module ``path`` is, by its trailing path segments, or ``None``."""
    parts = _parts(path)
    for module in modules:
        wanted = _parts(module)
        if parts[-len(wanted) :] == wanted:
            return module
    return None


def _where(package: str) -> str:
    return f"{package}/" if package == DROPBOX_PACKAGE else f"bookvie/{package}/"


def evaluate(report: dict, gates: tuple[Gate, ...] = GATES) -> list[Result]:
    totals = {gate.name: [0, 0, 0] for gate in gates}
    seen: dict[str, set[str]] = {gate.name: set() for gate in gates}
    for path, data in report.get("files", {}).items():
        package = _package_of(path)
        summary = data["summary"]
        for gate in gates:
            if gate.modules:
                module = _module_of(path, gate.modules)
                if module is None:
                    continue
                seen[gate.name].add(module)
            elif package not in gate.packages:
                continue
            totals[gate.name][0] += summary["num_statements"]
            totals[gate.name][1] += summary["covered_lines"]
            totals[gate.name][2] += 1
    return [
        Result(
            gate,
            *totals[gate.name],
            unmatched=tuple(m for m in gate.modules if m not in seen[gate.name]),
        )
        for gate in gates
    ]


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    path = Path(args[0] if args else "backend/.coverage.json")
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"coverage gate: cannot read {path}: {exc}", file=sys.stderr)
        return 1
    failed = False
    for result in evaluate(report):
        if result.unmatched:
            print(
                f"coverage gate: {result.gate.name} FAIL: "
                f"{', '.join(result.unmatched)} not measured"
            )
            failed = True
            continue
        if result.files == 0:
            packages = ", ".join(_where(p) for p in result.gate.packages)
            print(f"coverage gate: {result.gate.name} FAIL: nothing under {packages} was measured")
            failed = True
            continue
        verdict = "ok" if result.passed else "FAIL"
        line = (
            f"coverage gate: {result.gate.name} {result.percent:.2f}% "
            f"({result.covered}/{result.statements} lines, "
            f"needs >= {result.gate.threshold:g}%) {verdict}"
        )
        print(line)
        failed |= not result.passed
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
