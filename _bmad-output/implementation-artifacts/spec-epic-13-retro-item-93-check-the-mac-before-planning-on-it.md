---
title: 'Check the Mac before planning on it'
type: 'chore'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: 'd6bbd4043059349f823f2d6f6eea02800195f15f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
  - '{project-root}/_bmad/custom/bmad-create-epics-and-stories.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 93 (E13-P1; sprint item `epic-13-retro-item-93-check-the-mac-before-planning-on-it`), due before Epic 14 planning. Story 13.5's 09:00 launchd job was built, reviewed and merged on 2026-11-22 (`3fbe4bd`, `c3cc1a8`, `36589e1`, about 2,000 lines with tests). On install the plist vanished: the Mac's administration policy removes LaunchAgents. A correct course dropped the job the next morning and a removal story took it out. Planning treated launchd as a build risk (`dropbox-backup-plan-2026-11-21.md:102`), not as a question of whether the machine allows it, although the same epic already put Story 13.1 first because its gate 2 was "the one part nobody has seen work".

**Approach:** a persistent fact in a new `_bmad/custom/bmad-create-epics-and-stories.toml`. Anything a story needs from the Mac itself that nobody has seen work there gets a manual check by Oleg before that story's ATDD, the epic orders the story first, and a failed check stops the story for Oleg's decision.

</frozen-after-approval>

## Implementation Notes

- **One fact** in the new `_bmad/custom/bmad-create-epics-and-stories.toml` (the skill's `customize.toml` has an empty `persistent_facts`, so this is the only one).
  - Applies in step 2 (Step B's Implementation Notes) and step 3 (each story's ACs); step 4's final validation checks it.
  - Examples, from the retro item and Epic 13: a scheduler or LaunchAgent, a system service or login item, a Keychain prompt, a fixed local port, a client feature (Claude Code's terminal CLI, VS Code, `claude -p`; MCP elicitation was one), an OS permission or policy-managed setting.
  - "Seen" means Oleg says he ran it on this Mac or a spec records the run. Documented, or working elsewhere, doesn't count. Planning asks Oleg about each item.
  - For each unseen item, the epic gets: the story ordered first (or as early as its dependencies allow) with the reason; a `**Mac check before Story N.M:**` line naming the check, what passes, and where the result goes (under that line in `epics.md`, dated); and an `**If the Mac check fails for Story N.M:**` line in the shape of Epic 13's "If gate 2 fails in Story 13.1", stopping that story and its dependants for Oleg's decision.
- **Not changed:** the skill's step files (upstream); `bmad-correct-course`, which the retro item doesn't name; Epic 13's text (the launchd story is already removed).
- **Checks:** the TOML parses with `tomllib` (1 persistent fact).
- **Sprint item 93** is marked `done` in `sprint-status.yaml` in the same commit.
