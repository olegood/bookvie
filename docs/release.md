# Releasing bookvie

A release is a `vX.Y.Z` tag on master and a GitHub Release with:

- that version's notes, taken from `CHANGELOG.md`
- a wheel, `bookvie-X.Y.Z-py3-none-any.whl`, that already contains the built SPA, so you can install it without Node

GitHub Packages isn't used. It has no Python registry, and both `package.json` files are `private`.

## While you work: keep `[Unreleased]` current

Whenever a change is worth telling a reader about, add a line to `CHANGELOG.md`. Write it for the person using bookvie, not as a commit message.

```sh
scripts/changelog.sh add added "Filter the catalog by status, type, language and tag."
scripts/changelog.sh add fixed "Finish opens for the Book whose last page was saved."
```

Sections: `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`. The script creates a section under `[Unreleased]` if it doesn't exist yet, in Keep a Changelog order.

Two helpers:

```sh
scripts/changelog.sh draft   # feat/fix commit subjects since the last tag, so nothing gets missed
scripts/changelog.sh show    # what [Unreleased] holds now
```

You can also edit `CHANGELOG.md` by hand, for example to group entries under `####` subheadings.

## Release

From an up-to-date, clean master:

```sh
scripts/release.sh 1.2.0
```

Choose the version using [Semantic Versioning](https://semver.org/): use a patch for fixes only, a minor for new features, and a major for changes that break the library file or the API.

The script then does the following:

1. **Checks** that you are on master, the tree is clean, master matches `origin/master`, the tag is free, `gh` is logged in and `[Unreleased]` has entries.
2. **Changelog:** it moves `[Unreleased]` to `## [1.2.0] - <today>`, leaves `Nothing yet.` under `[Unreleased]` and updates the compare links at the bottom.
3. **Version:** it sets the version in `backend/pyproject.toml`, `backend/bookvie/__init__.py`, `backend/uv.lock`, and the root and frontend `package.json` and `package-lock.json`.
4. **Check:** it runs `npm run check`.
5. **Commit and tag:** it commits `chore: release 1.2.0` on master and creates the `v1.2.0` tag.
6. **Wheel:** it builds the SPA and the wheel, installs the wheel into a throwaway folder, and confirms it serves `/api/health` and the app.
7. **Publish:** it asks first, then pushes master and the tag together and runs `gh release create` with the wheel and the notes.

Nothing leaves your machine before step 7. If a step fails, the script prints the command to undo what it has done so far.

Options:

- `--skip-check` skips `npm run check`, for example when you've just run it.
- `--yes` publishes without asking.

If you answer *no* at step 7, the commit and tag stay local. The script prints the two commands to publish later and the command to undo.

## After the release

Install the released wheel (this replaces your local `bookvie`):

```sh
uv tool install --reinstall \
  https://github.com/olegood/bookvie/releases/download/v1.2.0/bookvie-1.2.0-py3-none-any.whl
```

Then restart a running `bookvie` and hard-reload any open tabs.

## If something goes wrong after publishing

- **Wrong notes or wheel:** fix them with `gh release edit v1.2.0 --notes-file <file>` or `gh release upload v1.2.0 <wheel> --clobber`.
- **Wrong release:** if nobody has installed it yet, delete it with `gh release delete v1.2.0 --yes && git push --delete origin v1.2.0 && git tag -d v1.2.0`, fix master, and release again. Once it has been installed, release a new patch version instead.
