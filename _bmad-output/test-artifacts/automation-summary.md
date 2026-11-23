---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-23'
storyId: '13.8'
storyKey: '13-8-restore-with-one-skill-from-this-computer-or-dropbox'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md (I/O matrix, Review Findings, Design Notes)
  - _bmad-output/test-artifacts/atdd-checklist-13-8-restore-with-one-skill-from-this-computer-or-dropbox.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - .claude/skills/bookvie-restore/SKILL.md
  - docs/dropbox-backup.md (Restoring, "Restore with the `bookvie-restore` skill"), README.md (Agent tools)
  - backend/tests/test_restore_skill.py, test_backup_skill.py, test_notes_summary_skill.py (the README-match precedent), test_agent_mount.py (_section), test_agent_restore.py, test_dropbox_download_follow_ups.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.8 Restore with one skill, from this computer or Dropbox

## Preflight

- **Stack:** `fullstack` (auto). The story adds a skill, guide text and a README entry, with no UI and no source change. Every target is a pytest leaf, so no browser session was opened and the Playwright fragments weren't loaded.
- **Where:** this worktree's branch (`hogback-creosote`). The story is `done` at `2c7322b`.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 8 open green-phase follow-ups and the spec's I/O matrix and Review Findings.
- **Generation:** sequential, in this session. There are 3 leaves in one file, all reusing the story's own helpers.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.

## Coverage plan

The ATDD leaves, the build's one-test-per-matrix-row leaves and the review's added leaf already cover every I/O matrix row. Of the 8 follow-ups, 5 were already pinned by those leaves or by 13.1 and 13.7, and are ticked with that evidence. Three had no test, and this run adds one each:

| Source | Priority | Level | Leaf (`backend/tests/test_restore_skill.py`) |
|---|---|---|---|
| AC-1 follow-up "setup and reconnect match the README for both entries" | P2 | Text | `:486` `test_the_skills_setup_and_reconnect_steps_match_the_readme_for_both_entries`: step 1 holds the README's `bookvie` setup line whole, names `bookvie-dev` by the name and URL the README gives (8766), and repeats the README's reconnect step for both entries. |
| AC-5 follow-up "dev path never names an `mcp__bookvie__` tool" | P1 | Text | `:507` `test_on_development_every_bookvie_tool_goes_to_the_dev_entry_and_none_is_named_in_full`: no `mcp__` name anywhere in the skill, and the Development paragraph sends exactly the bookvie tools the intro says the skill calls, in the same order, to `bookvie-dev`. |
| AC-7 follow-up "the guide's walkthrough names the skill's steps in order" | P2 | Docs | `:523` `test_the_guide_walks_through_the_skills_steps_in_the_skills_order`: the skill's `## N.` titles are the six expected ones, in order, and the guide's walkthrough has steps 1 to 6, each in words that match the skill's step with the same number. |

**Already covered (ticked, no new leaf):** the Dropbox sign-in refusal with the local list still answering (`:356`), "show all" (`:347`), each download cause's line (`:399`, plus 13.7's `test_dropbox_download_follow_ups.py:151` for nothing written), the nothing-added preview against a real preview (`:416`), and `reason: unsupported` (13.1's `test_agent_restore.py:525`, three cases, cited in the spec's Design Notes).

**Not added:** the review's rejected prose-fallback branches (a non-JSON download error, a missing tool, a `list_backups` error without a `message`). Both reviews rejected them as rare fallbacks of an LLM skill, and AC-6's six manual runs cover the live behavior.

## Files

- **Updated:** `backend/tests/test_restore_skill.py`, with 3 leaves plus `GUIDE_MD`, `README_MD` and the `GUIDE_STEPS` map. Nothing new was imported.
- **Updated:** the ATDD checklist. All 8 green-phase follow-ups are ticked with their evidence. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Each new leaf can fail.** Each hand edit below was made, run against `test_restore_skill.py`, then reverted:

  | Hand edit | Result |
  |---|---|
  | Skill's reconnect names only `bookvie` | 1 of 18 failed (README match) |
  | Skill's `bookvie-dev` setup URL set to 8765 | 1 of 18 failed (README match) |
  | Development paragraph drops `restore_backup` | 1 of 18 failed (dev routing) |
  | Step 5 calls `mcp__bookvie__restore_backup` | 1 of 18 failed (dev routing) |
  | Guide's walkthrough steps 4 and 5 swap their text, numbers kept | 1 of 18 failed (guide order) |
  | Skill's `## 4. Preview` renamed | 2 of 18 failed (guide order, and the existing nothing-added leaf) |

  A first guide edit didn't touch the walkthrough's step 4 enough and passed. It was a weak edit, not a gap, and the stronger swap above fails the leaf. `git status` showed only the test file changed afterwards.
- **Suite:** the first `npm run check:py` had 3 failures in `test_dropbox_cli_follow_ups.py`, a file this run didn't touch: the stray-request and the two no-token sign-in cases, which use the fixed sign-in port 8790. That file alone gave 10 passed, and a second full run exited 0 with **2472 passed** (2469 + 3), ruff clean and every coverage gate OK. `check:api` and `check:e2e` weren't re-run, because no frontend or source file changed. The review's full `npm run check` had unit at 395 passed and e2e at 803 passed.
- **Quality checklist:**
  - No hard waits or conditionals.
  - Every assert compares exact strings or lists.
  - The leaves read files only and are parallel-safe.
  - One subject per leaf.
  - No skips or focus.
- **No browser sessions** were opened, and no temp files are left in the repo. The mutation helper and the guide's backup copy are in the session scratchpad.

## Assumptions and risks

- The leaves pin the skill's text, the guide and the README, not an agent's live run. The live run is AC-6, and Oleg's six recorded runs cover it.
- `GUIDE_STEPS` holds the guide's words for each step by hand. A deliberate rewording of a guide step means editing the map, which is the point: the guide and the skill change together.
- The one-time `test_dropbox_cli_follow_ups.py` failure didn't come back. If it comes back, look for something else holding port 8790 during the run, such as another worktree's suite or a `bookvie-dropbox auth`.

## Next

13.8 closes Epic 13 (AGENTS.md → Epic boundaries). Next comes the Epic 13 retrospective (`bmad-retrospective`), then its before-next-epic items: the trace and gate, and the spine reconciliation of Epic 13's "spine drift" entries. Don't start Epic 14's first story before those.
