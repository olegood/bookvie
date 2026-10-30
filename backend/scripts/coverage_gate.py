"""Per-package line-coverage gate for ``npm run check:py``.

Reads the JSON report written by ``pytest --cov-report=json:<path>`` and sums
statements and covered lines per group of packages, matched by path segments
(``bookvie/domain/...``). Prints each group's percentage and exits 1 when any
group is below its threshold. A group whose files have 0 statements passes;
a group that matched no file at all fails, since nothing was measured.

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


GATES = (
    Gate("domain", ("domain",), 90.0),
    Gate("intents+store", ("intents", "store"), 80.0),
)


@dataclass(frozen=True)
class Result:
    gate: Gate
    statements: int
    covered: int
    files: int = 0

    @property
    def percent(self) -> float:
        return 100.0 if self.statements == 0 else 100.0 * self.covered / self.statements

    @property
    def passed(self) -> bool:
        if self.files == 0:
            return False  # nothing measured: a path or --cov target mistake
        # Integer comparison, so 89.99% never rounds up to a pass.
        return self.covered * 100 >= self.gate.threshold * self.statements


def _package_of(path: str) -> str | None:
    """The layer a measured file belongs to: ``bookvie/<layer>/...`` -> ``<layer>``."""
    parts = PurePosixPath(path.replace("\\", "/")).parts
    # The innermost ``bookvie`` segment is the package; an outer one may be the repo.
    for i in reversed(range(len(parts) - 2)):
        if parts[i] == "bookvie":
            return parts[i + 1]
    return None


def evaluate(report: dict, gates: tuple[Gate, ...] = GATES) -> list[Result]:
    totals = {gate.name: [0, 0, 0] for gate in gates}
    for path, data in report.get("files", {}).items():
        package = _package_of(path)
        summary = data["summary"]
        for gate in gates:
            if package in gate.packages:
                totals[gate.name][0] += summary["num_statements"]
                totals[gate.name][1] += summary["covered_lines"]
                totals[gate.name][2] += 1
    return [Result(gate, *totals[gate.name]) for gate in gates]


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
        if result.files == 0:
            packages = ", ".join(f"bookvie/{p}/" for p in result.gate.packages)
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
