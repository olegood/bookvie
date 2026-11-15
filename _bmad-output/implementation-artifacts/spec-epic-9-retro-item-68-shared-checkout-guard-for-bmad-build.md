---
title: 'Give bmad-build a shared-checkout guard and a format check before it commits'
type: 'chore'
created: '2026-11-15'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 9 retro action 68 (finding E9-R1; sprint item `epic-9-retro-item-68-…`), due before Epic 10. On 2026-11-14 an out-of-story `/bmad-build` (session `-backend/1dc39b70`) ran in the shared checkout while Story 9.2's automate step had uncommitted files there. It noticed them, set them aside as "uncommitted files from another session" and committed `9818c7b` anyway. That commit left `base.css` unformatted, which broke `npm run check` on master until `07a09c5`, and the automate step couldn't close on a green check. AGENTS.md "Story pipeline" (Epic 6 retro item 56) already forbids this, but `_bmad/custom/bmad-build.toml` had no gate for it. Step-01's generic "is the working tree clean?" check only asks, and a resumed spec skips it. A story that is `done` but still in automate also looks idle in `sprint-status.yaml`, so uncommitted changes the run didn't make are the only reliable signal.

**Approach:** two persistent facts in `_bmad/custom/bmad-build.toml`, with no code change.
- **(1) Shared-checkout guard, non-story work (empty `story_key`), at step-01.** Run `git status --porcelain`. If it shows changes this run didn't make, a story step may be running in the shared checkout. Stop, name the files, and offer two things: do the work in a `git worktree`, or wait. Continue in place only when the user explicitly says to.
- **(2) Format check before any commit**, on every route: `npm --prefix frontend run format:check` and `cd backend && uv run ruff format --check .`, or `npm run check`. Don't commit on a failure.
- Sprint item 68 is marked `done` in the same commit.

</frozen-after-approval>

## Implementation Notes

- **Files changed:** `_bmad/custom/bmad-build.toml` (two new persistent facts, now 10 in all); `sprint-status.yaml` (item 68 `done`); this spec.
- **Guard (fact 1).** Every run is guarded except one that stops in step-01 for `bmad-build-auto`.
  - **Order:** the build-auto stop is checked first. A story or pipeline spec the user tells to continue with bmad-build is guarded too.
  - **Where it runs:** it replaces the dirty-tree half of step-01's version-control check, and the branch-mismatch half stays. It also runs on the resume (early-exit) paths, which skip that check today.
  - **Which changes are the run's own:** none on a fresh start. On a resume, the spec and the paths it records as changed. A shared tracking file (`sprint-status.yaml`, `deferred-work.md`, `README.md`) counts only when the spec says the run edits it.
  - **The three choices:**
    - (a) A worktree. The run stops, and the user restarts bmad-build inside the worktree.
    - (b) Wait for the other work to be committed.
    - (c) Continue in place, only when the user explicitly says so, and recorded in the spec.
  - **Staging:** foreign paths are never staged. Commits add the run's own paths by name, and the banned commands are AGENTS.md's list, referenced rather than copied.
  - **Before the commit:** a second `git status --porcelain`. A foreign path that is new, or that wasn't accepted with (c), stops the commit. E9-R1's foreign files appeared during the run, after any step-01 check.
- **Check (fact 2).** Before every commit: `format:check`, then `ruff format --check .` and `ruff check .`, or `npm run check`.
  - **What it guards:** formatting and ruff lint only. `tsc -b`, oxlint and the tests stay with the run's own verification.
  - **When it blocks:** a failure in the run's own files blocks the commit until the run fixes it. A failure only in foreign paths accepted with (c) doesn't block, and the run reports those files. A red HEAD stops the run.
- **Checks (2026-11-15):**
  - `tomllib` parses the file, with 10 facts.
  - `resolve_customization.py --key workflow` returns both new facts.
  - A fresh `render_skill.py` render of bmad-build carries both into `workflow.md`.
  - The step names the facts cite match the real headings: step-oneshot "### Commit" and step-05 "### Commit and Complete".
- **Not changed, and the exposure that remains:**
  - `bmad-build-auto.toml`: the action names only bmad-build.
  - AGENTS.md: item 56 already states the rule.
  - Other skills that commit, and plain conversations (retro E9-R2), still have no guard and no format check. That is the retro's open question, so the next retro shouldn't treat it as covered.
- **During this run:** `docs/ideas.md` gained uncommitted changes from another session while the review ran. No story step was in progress (Epic 9 done, Epic 10 not started), so this run committed its own paths by name and left `docs/ideas.md` untouched and unstaged. That is the case the guard's second `git status` now catches.

## Review Triage Log

### 2026-11-15: Blind Hunter, pass 1

Floor N = 4 (about 9.1 kB). It reported 10 findings. All are real, and all were patched.

- **`[medium]` `[patch]` The guard ran only at step-01.** Foreign edits can appear mid-run, as they did in E9-R1. Fixed: a second `git status --porcelain` runs before the commit.
- **`[medium]` `[patch]` A whole-tree format check would block "continue in place"** when the foreign files are unformatted. Fixed: failures only in accepted foreign paths don't block, and the run reports them.
- **`[medium]` `[patch]` A resumed run counted every file the spec names as its own,** including shared tracking files. Fixed: only the paths the spec records as changed count, and tracking files only when the spec says it edits them. This spec now names `sprint-status.yaml`.
- **`[low]` `[patch]` Formatting only, no lint.** `ruff check .` was added. The fact says plainly that `tsc -b`, oxlint and the tests aren't covered.
- **`[low]` `[patch]` The worktree option didn't say what happens next.** Now the run stops, and the user restarts bmad-build in the worktree.
- **`[medium]` `[patch]` The story exemption missed a story build the user continues with bmad-build, and the order with the pipeline-spec stop was undefined.** Fixed: the build-auto stop comes first, and only a run that actually stops is exempt.
- **`[low]` `[patch]` "In place of its dirty-tree question" was vague.** The branch-mismatch half stays, and a tree dirty only with the run's own changes passes.
- **`[low]` `[patch]` No record of verification.** It is now under "Checks". The oneshot route has no Verification section.
- **`[low]` `[patch]` The ban lists differed between the spec, the fact and AGENTS.md.** The fact now refers to AGENTS.md's list.
- **`[low]` `[patch]` The remaining exposure wasn't stated.** It is now under "Not changed".
