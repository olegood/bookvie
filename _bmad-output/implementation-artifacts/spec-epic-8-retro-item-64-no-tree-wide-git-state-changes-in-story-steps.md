---
title: 'Forbid tree-wide git state changes in story steps'
type: 'chore'
created: '2026-11-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 8 retro item 64 (PL-2; sprint item `epic-8-retro-item-64-…`), due before the next story. Build 8.2 ran `git stash -q` in the shared checkout, which failed with "not uptodate", then `git stash pop`. A build subagent ran `git stash push frontend/src` to test a baseline. In build 8.3, the auto-mode classifier blocked a `git checkout --` that would have discarded the story's uncommitted work. Nothing was lost, but these were near misses. AGENTS.md has no rule on `stash` or `checkout --`. Item 56's worktree rule covers work outside the story, not a story step's own commands.

**Approach:**
- **AGENTS.md "Story pipeline":** a paragraph after item 56's. ATDD, build, review and automate, and their subagents, never run `git stash`, `git checkout -- <path>`, `git restore` or `git reset` in the shared checkout. A mutation or baseline test edits the file and reverts that edit, or runs in a `git worktree`.
- **`_bmad/custom/bmad-build-auto.toml`:** a persistent fact with the same rule. It says how step-04's prescribed "revert code changes" (`intent_gap`, `bad_spec`) is done without those commands, and it requires the rule in every subagent prompt the build launches.
- No code changes.

</frozen-after-approval>

## Implementation Notes

- **AGENTS.md:** one paragraph after item 56's worktree paragraph, and it holds the full list of banned commands: `git stash` in any form, `git checkout [<rev>] -- <path>`, `git restore` except `--staged <path>` (which only unstages), `git reset`, `git clean`, and a branch change. Edit-and-revert is the default for a mutation or baseline test. A worktree is the alternative, with the warning that it starts with no `node_modules`, venv or story changes. A step's own uncommitted changes are undone by saving a patch, running `git apply -R` on it, deleting the files the step created and checking `git status`. If the step made commits, or the reverse apply fails, the step stops. A step that launches a subagent puts the rule in its prompt. That covers ATDD, code review and automate as well as build-auto. The paragraph ends with what happened in Stories 8.2 and 8.3.
- **`bmad-build-auto.toml`:** a new last persistent fact that points to the AGENTS.md list instead of copying it, so the two can't drift. It says how step-04's `intent_gap`/`bad_spec` revert is done. When this run made commits, or the reverse apply fails, it HALTs `blocked` (`revert needs a banned git command`) and leaves the tree as it is. Every subagent prompt gets the rule, the fixed-prompt review layers included.
- **Not changed:** the ATDD, code-review and automate overrides. Those skills run in the main session, which reads AGENTS.md through `CLAUDE.md`. AGENTS.md's subagent sentence covers the subagents they launch, and the action names only build-auto's TOML.
- **Checks (2026-11-14):** the TOML parses with `tomllib` (11 persistent facts), and `resolve_customization.py --key workflow` for bmad-build-auto returns the new fact. Markdown has no formatter, so nothing was formatted.
- **Sprint item 64** is marked `done` with `sprint_status.py update --set-action-status` in the same commit, approved by Oleg on 2026-11-14.

## Review Triage Log

### 2026-11-14: Blind Hunter, pass 1

Floor N = 3 (about 8.3 kB). It reported 10 findings.

- **`[medium]` `[patch]` AGENTS.md banned less than the TOML did,** and it is the only rule ATDD, review and automate get. The full list now lives in AGENTS.md, and the TOML points to it.
- **`[medium]` `[patch]` Subagents of the other three skills didn't get the rule.** AGENTS.md now says a step that launches a subagent puts the rule in its prompt.
- **`[medium]` `[patch]` `git apply -R` didn't cover run-made commits, created files, or a failed apply.** Created files are deleted. Commits or a failed apply mean stop (build-auto: HALT `blocked`), never a banned command.
- **`[low]` `[patch]` The rule clashed with the spine-check layer's fixed prompt.** The sentence is now appended to it.
- **`[low]` `[patch]` The cost of a worktree wasn't stated.** Edit-and-revert is the default, and the worktree caveat is stated.
- **`[low]` `[patch]` `git restore --staged` only unstages.** Allowed.
- **`[low]` `[patch]` AGENTS.md left out the `git status` check and the story numbers.** Added.
- **`[medium]` `[defer]` Nothing enforces the rule.** A `permissions.deny` list or a hook in `.claude/settings.json` would. That changes Oleg's settings and blocks the commands outside story steps too, so it is deferred to `deferred-work.md` for his call.
- **`[low]` rejected: no `baseline_revision` in the spec, and the sprint item still open.** The oneshot route has no baseline field, and the item is closed in the commit once Oleg approves, as for item 63.
