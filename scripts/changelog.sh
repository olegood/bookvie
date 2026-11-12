#!/usr/bin/env bash
# Keep CHANGELOG.md's [Unreleased] section up to date.
#
#   scripts/changelog.sh add <section> "<entry>"   add a bullet under [Unreleased]
#   scripts/changelog.sh draft                     list feat/fix commits since the last tag
#   scripts/changelog.sh show                      print the [Unreleased] section
#
# <section> is one of: added, changed, deprecated, removed, fixed, security.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGELOG="$ROOT/CHANGELOG.md"

usage() {
  sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

cmd="${1:-}"
case "$cmd" in
  add)
    [[ $# -eq 3 ]] || usage 1
    section="$(tr '[:upper:]' '[:lower:]' <<<"$2")"
    case "$section" in
      added|changed|deprecated|removed|fixed|security) ;;
      *) echo "error: unknown section '$2'" >&2; usage 1 ;;
    esac
    python3 -I - "$CHANGELOG" "$section" "$3" <<'PY'
import re, sys

path, section, entry = sys.argv[1], sys.argv[2].capitalize(), sys.argv[3].strip()
order = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]
text = open(path, encoding="utf-8").read()

m = re.search(r"^## \[Unreleased\][^\n]*\n", text, re.M)
if not m:
    sys.exit("error: CHANGELOG.md has no '## [Unreleased]' section")
start = m.end()
nxt = re.search(r"^(## \[|\[[^\]]+\]: )", text[start:], re.M)
end = start + nxt.start() if nxt else len(text)
body = re.sub(r"^Nothing yet\.\s*$", "", text[start:end], flags=re.M).strip("\n")

bullet = f"- {entry}"
lines = body.split("\n") if body else []
heading = f"### {section}"
if heading in lines:
    i = lines.index(heading) + 1
    # insert before the next ### or #### heading, or at the end of the section
    j = i
    while j < len(lines) and not lines[j].startswith("### "):
        if lines[j].startswith("#### "):
            break
        j += 1
    while j > i and lines[j - 1] == "":
        j -= 1
    lines.insert(j, bullet)
else:
    # place the new section in Keep a Changelog order
    pos = len(lines)
    for k, line in enumerate(lines):
        if line.startswith("### ") and line[4:] in order and order.index(line[4:]) > order.index(section):
            pos = k
            break
    block = [heading, "", bullet]
    if pos < len(lines):
        block.append("")
    elif lines:
        block.insert(0, "")
    lines[pos:pos] = block

new_body = "\n".join(lines).strip("\n")
open(path, "w", encoding="utf-8").write(text[:start] + "\n" + new_body + "\n\n" + text[end:])
print(f"Added to [Unreleased] / {section}: {entry}")
PY
    ;;
  draft)
    if last="$(git -C "$ROOT" describe --tags --abbrev=0 --match 'v*' 2>/dev/null)"; then
      range="$last..HEAD"
      echo "feat/fix commits since $last:"
    else
      range="HEAD"
      echo "feat/fix commits (no release tag yet):"
    fi
    git -C "$ROOT" log --format='%s' "$range" | grep -E '^(feat|fix)(\(.+\))?!?: ' || echo "(none)"
    ;;
  show)
    awk '/^## \[Unreleased\]/{f=1; next} /^## \[/ || /^\[.*\]: /{f=0} f' "$CHANGELOG" | sed -e '/./,$!d'
    ;;
  -h|--help|help|"") usage 0 ;;
  *) echo "error: unknown command '$cmd'" >&2; usage 1 ;;
esac
