#!/usr/bin/env bash
# Release bookvie from master in one go.
#
#   scripts/release.sh <version> [--skip-check] [--yes]
#
# 1. Checks: on master, clean, up to date with origin, tag is free, [Unreleased] has entries.
# 2. Moves [Unreleased] in CHANGELOG.md to "## [<version>] - <today>" and updates the links.
# 3. Sets the version in pyproject.toml, __init__.py, uv.lock and both package(-lock).json.
# 4. Runs `npm run check` (skip with --skip-check).
# 5. Commits "chore: release <version>" and tags v<version>.
# 6. Builds the wheel with the SPA inside and tests it in a throwaway folder.
# 7. Asks, then pushes master and the tag and creates the GitHub Release with the wheel
#    (--yes skips the question).
#
# Nothing leaves your machine before step 7. If a step fails, the script prints how to undo.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() { sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

VERSION="" SKIP_CHECK=0 YES=0
for arg in "$@"; do
  case "$arg" in
    --skip-check) SKIP_CHECK=1 ;;
    --yes|-y) YES=1 ;;
    -h|--help) usage 0 ;;
    -*) echo "error: unknown option $arg" >&2; usage 1 ;;
    *) [[ -z "$VERSION" ]] || usage 1; VERSION="$arg" ;;
  esac
done
[[ -n "$VERSION" ]] || usage 1
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "error: version must look like 1.2.3" >&2; exit 1; }

TAG="v$VERSION"
WHEEL="backend/dist/bookvie-$VERSION-py3-none-any.whl"
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { echo "error: $*" >&2; exit 1; }

STAGE=preflight   # preflight -> changed -> committed -> publishing -> finished
on_exit() {
  local rc=$?
  [[ $rc -ne 0 && $STAGE != preflight ]] || return 0
  echo >&2
  case "$STAGE" in
    changed)
      echo "Release stopped before anything was committed or pushed." >&2
      echo "To undo:  git checkout -- . && rm -rf backend/dist" >&2 ;;
    committed)
      echo "Release stopped before anything was pushed." >&2
      echo "To undo:  git tag -d $TAG && git reset --hard HEAD~1" >&2 ;;
    publishing)
      echo "Publishing failed. Check 'git status', 'git ls-remote --tags origin $TAG' and" >&2
      echo "'gh release view $TAG', then finish the remaining step by hand (see docs/release.md)." >&2 ;;
  esac
}
trap on_exit EXIT

# --- 1. Preflight -----------------------------------------------------------
step "Checking the repository"
command -v gh >/dev/null || die "the GitHub CLI (gh) is not installed"
gh auth status >/dev/null 2>&1 || die "run 'gh auth login' first"
[[ "$(git branch --show-current)" == "master" ]] || die "switch to master first"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || die "commit or stash your changes first"
git fetch --quiet origin master --tags
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/master)" ]] \
  || die "master differs from origin/master; pull or push first"
! git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || die "tag $TAG already exists"

OLD_VERSION="$(sed -n 's/^version = "\(.*\)"/\1/p' backend/pyproject.toml)"
[[ "$OLD_VERSION" != "$VERSION" ]] || die "the version is already $VERSION"
PREV_TAG="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)"
UNRELEASED="$(scripts/changelog.sh show | grep -v '^Nothing yet\.$' || true)"
[[ -n "${UNRELEASED//[[:space:]]/}" ]] \
  || die "CHANGELOG.md [Unreleased] is empty; add entries with scripts/changelog.sh add"

REPO_URL="$(git remote get-url origin | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')"
echo "Releasing $OLD_VERSION -> $VERSION (previous tag: ${PREV_TAG:-none})"

# --- 2. Changelog -----------------------------------------------------------
STAGE=changed
step "Moving [Unreleased] to [$VERSION] in CHANGELOG.md"
python3 -I - CHANGELOG.md "$VERSION" "$(date +%F)" "$REPO_URL" "$PREV_TAG" <<'PY'
import re, sys

path, version, today, repo, prev_tag = sys.argv[1:6]
text = open(path, encoding="utf-8").read()

m = re.search(r"^## \[Unreleased\][^\n]*\n", text, re.M)
start = m.end()
nxt = re.search(r"^(## \[|\[[^\]]+\]: )", text[start:], re.M)
end = start + nxt.start() if nxt else len(text)
body = text[start:end].strip("\n")

head = text[:m.start()]
rest = text[end:]
text = (head + "## [Unreleased]\n\nNothing yet.\n\n"
        f"## [{version}] - {today}\n\n{body}\n\n" + rest)

# links: replace [Unreleased], add the new version above older ones
text = re.sub(r"^\[Unreleased\]: .*\n", "", text, flags=re.M)
new_link = (f"[{version}]: {repo}/compare/{prev_tag}...v{version}" if prev_tag
            else f"[{version}]: {repo}/releases/tag/v{version}")
links = f"[Unreleased]: {repo}/compare/v{version}...HEAD\n{new_link}\n"
first = re.search(r"^\[[^\]]+\]: ", text, re.M)
if first:
    text = text[:first.start()] + links + text[first.start():]
else:
    text = text.rstrip("\n") + "\n\n" + links
open(path, "w", encoding="utf-8").write(text)
PY

# --- 3. Version -------------------------------------------------------------
step "Setting the version to $VERSION"
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" backend/pyproject.toml
sed -i.bak "s/^__version__ = \".*\"/__version__ = \"$VERSION\"/" backend/bookvie/__init__.py
rm -f backend/pyproject.toml.bak backend/bookvie/__init__.py.bak
(cd backend && uv lock --quiet)
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
npm --prefix frontend version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
git --no-pager diff --stat

# --- 4. Check ---------------------------------------------------------------
if [[ $SKIP_CHECK -eq 1 ]]; then
  step "Skipping npm run check (--skip-check)"
else
  step "Running npm run check"
  npm run check
fi

# --- 5. Commit and tag ------------------------------------------------------
step "Committing and tagging $TAG"
git add CHANGELOG.md backend/pyproject.toml backend/uv.lock backend/bookvie/__init__.py \
        package.json package-lock.json frontend/package.json frontend/package-lock.json
git commit --quiet -m "chore: release $VERSION"
git tag -a "$TAG" -m "bookvie $VERSION"
STAGE=committed

# --- 6. Wheel ---------------------------------------------------------------
step "Building the wheel"
npm run build >/dev/null
(cd backend && rm -rf dist && uv build --wheel --quiet)
unzip -l "$WHEEL" | grep 'bookvie/http/static/index.html' >/dev/null || die "the wheel has no SPA (static/index.html)"

step "Testing the wheel in a throwaway folder"
T="$(mktemp -d)"
PORT="$(python3 -I -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')"
UV_TOOL_DIR="$T/tools" UV_TOOL_BIN_DIR="$T/bin" uv tool install --quiet "$WHEEL"
"$T/bin/bookvie" --no-browser --data-dir "$T/data" --port "$PORT" >"$T/log" 2>&1 &
SERVER=$!
ok=0
for _ in $(seq 30); do
  if curl -sf "http://127.0.0.1:$PORT/api/health" | grep '"app":"bookvie"' >/dev/null \
     && curl -sf "http://127.0.0.1:$PORT/" | grep '<title>bookvie' >/dev/null; then ok=1; break; fi
  sleep 0.5
done
kill "$SERVER" 2>/dev/null || true
wait "$SERVER" 2>/dev/null || true
rm -rf "$T"
[[ $ok -eq 1 ]] || die "the installed wheel did not serve /api/health and the SPA"
echo "The wheel installs and serves bookvie."

# --- 7. Publish -------------------------------------------------------------
NOTES="$(mktemp)"
awk -v v="$VERSION" '$0 ~ "^## \\[" v "\\]" {f=1; next} /^## \[/ || /^\[.*\]: / {f=0} f' CHANGELOG.md \
  | sed -e '/./,$!d' >"$NOTES"

if [[ $YES -ne 1 ]]; then
  step "Ready to publish"
  echo "This pushes master and $TAG to origin and creates the GitHub Release with $WHEEL."
  read -r -p "Publish $TAG now? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    STAGE=finished
    echo "Not published. The commit and tag are local. Publish later with:"
    echo "  git push --atomic origin master $TAG"
    echo "  gh release create $TAG $WHEEL --verify-tag --title 'bookvie $VERSION' --notes-file $NOTES"
    echo "Or undo with: git tag -d $TAG; git reset --hard HEAD~1"
    exit 0
  fi
fi

STAGE=publishing
step "Pushing master and $TAG"
git push --atomic origin master "$TAG"

step "Creating the GitHub Release"
gh release create "$TAG" "$WHEEL" --verify-tag --title "bookvie $VERSION" --notes-file "$NOTES"
rm -f "$NOTES"
STAGE=finished

echo
echo "Released bookvie $VERSION. Install it with:"
echo "  uv tool install --reinstall $REPO_URL/releases/download/$TAG/$(basename "$WHEEL")"
