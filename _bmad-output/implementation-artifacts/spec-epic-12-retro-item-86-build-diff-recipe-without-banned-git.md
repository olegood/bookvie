---
title: 'Give the builds a diff recipe with no banned git command'
type: 'chore'
created: '2026-11-20'
status: 'done'
route: 'oneshot'
baseline_commit: '526ec37169e1a25fd333f3d18c9a8d05b93ba33c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/_bmad/custom/bmad-build-auto.toml'
  - '{project-root}/_bmad/custom/bmad-build.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 12 retro item 86 (E12-P1; sprint item `epic-12-retro-item-86-build-diff-recipe-without-banned-git`), due before Epic 13. `bmad-build-auto` for Stories 12.4, 12.6 and 12.8 captured the diff with untracked files as `git add -N . && git diff <baseline> > $D; git reset -q`. AGENTS.md (Epic 8 item 64) bans `git reset` in any form during story steps. It only reset the index, but an index the user had staged would have been wiped. The step files ask for a diff "untracked files included" with no recipe, and the item 64 override gave none.

**Approach:** add to the item 64 fact in both build overrides a recipe for "all changes since the baseline, untracked included": `git diff <baseline>` plus `git ls-files --others --exclude-standard -z | xargs -0 -I{} git diff --no-index /dev/null {}`, written to the temp file. Name `git add -N` followed by `git reset` as banned.

</frozen-after-approval>

## Implementation Notes

- **`_bmad/custom/bmad-build-auto.toml`:** the item 64 fact gains a "Diff recipe" paragraph with `{baseline_revision}`, run from the repo root (`git ls-files` lists paths below the current folder only). It is two commands, not the retro's one line: `git diff <baseline> > "$DIFF_FILE"` must exit 0 with an empty stderr, then `git ls-files --others --exclude-standard -z | xargs -0 -n1 git diff --no-index -- /dev/null >> "$DIFF_FILE"` may exit 1 but must leave stderr empty. The review below explains why it departs from the retro's `-I{}` form.
- **`_bmad/custom/bmad-build.toml`:** it had no item 64 fact (only the shared-checkout guard points to item 64), so a new fact carries the banned-command reminder and the same recipe with `{baseline_commit}`, the variable bmad-build's steps use.
- Both say exit 1 from the second command is expected when untracked files exist, since `git diff --no-index` exits 1 when files differ.
- **Recipe probes (2026-11-20),** in throwaway repos: a staged-and-modified file, a staged new file, and untracked files named with a space and with a leading `-`. Every file appeared in the diff, the index was unchanged (`git status --porcelain` the same before and after), and `git diff deadbeef` exits 128, which the first command's check catches.
- **Not changed:** the skills' step files (upstream).
- **Checks:** both TOML files parse with `tomllib` (11 persistent facts each).
- **Sprint item 86** is marked `done` in `sprint-status.yaml` in the same commit.

## Review Triage Log

### 2026-11-20: blind reviewer, pass 1

- **`[high]` `[patch]` `-I{}` dropped untracked files without warning.** A file named `-dash` was read as an option, and macOS xargs `-I` refuses a command over 255 bytes, so a long path was skipped. Either way the line still exited 1, as a good run does. The recipe now uses `xargs -0 -n1 git diff --no-index -- /dev/null`, says to keep `-n1` and `--`, and stops on any stderr. This also takes `{}` out of the TOML.
- **`[medium]` `[patch]` "Judge by content, not the exit status" hid a failed `git diff <baseline>`.** A bad baseline left only the untracked diffs, with the same exit 1. The two commands now run separately, and the first must exit 0 with an empty stderr.
