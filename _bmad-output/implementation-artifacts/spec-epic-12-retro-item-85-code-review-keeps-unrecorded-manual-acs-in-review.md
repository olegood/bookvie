---
title: 'Code review keeps a story in review while a manual AC is unrecorded'
type: 'chore'
created: '2026-11-20'
status: 'done'
route: 'oneshot'
baseline_commit: '526ec37169e1a25fd333f3d18c9a8d05b93ba33c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/_bmad/custom/bmad-code-review.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 12 retro item 85 (E12-S1, E12-P3; sprint item `epic-12-retro-item-85-code-review-keeps-unrecorded-manual-acs-in-review`), due before Epic 13. Story 12.7's AC-3 (a real skill run against `--dev`) and Story 12.8's AC-4 (real amazon.com and leanpub.com runs) were still "open" when the reviews marked both stories `done`. Each review dismissed the gap as "not a code defect: manual … stays open for Oleg", citing the previous story's open AC as precedent.

**Approach:** add a persistent fact to `_bmad/custom/bmad-code-review.toml`. When an AC requires a run by Oleg (a real session, a real site), the review checks the spec for a recorded result. If there is none, it asks Oleg for the result, or leaves the story in `review` with the AC named. It never dismisses the gap by citing an earlier story's open AC.

</frozen-after-approval>

## Implementation Notes

- **One fact** in `_bmad/custom/bmad-code-review.toml`, placed before "Review commit type". It asks in step 4 after §3's summary and before §4, so a failed run goes through §4/§5 and item 63's full-check gate like any finding; the hold is applied in §6.
  - A manual AC is one that needs a real Claude Code session, a real website, the installed app or a manual check. A recorded result has the date, what ran and what happened. "Open", "stays open for Oleg" or "manual, pending" is not a result.
  - Oleg gives the result: it is recorded under the AC in the spec, and a failed run becomes a `patch` or `decision_needed` finding in `### Review Findings`.
  - No result: `new_status` = `review`. The spec frontmatter gets `in-review` and `development_status` gets `review` (the values build-auto parks on); with no `story_key` or no entry, only the spec frontmatter. No `done`. The completion summary names each AC, and §7 offers only recording the result and re-running the review, not the next story or automate.
  - Two existing facts amended to match: "Status writes" lists `review` (written `in-review` in the spec) as a third `new_status`, and "Epic boundary" keeps option 1 only for `in-progress` and defers to this fact for `review`.
  - Dismissing the gap as "not a code defect", or citing an earlier story's open manual AC, is named as the defect.
- **Not changed:** the skill's step files (upstream), Epic 12's specs (item 83 records their runs).
- **Checks:** the TOML parses with `tomllib` (8 persistent facts).
- **Sprint item 85** is marked `done` in `sprint-status.yaml` in the same commit.

## Review Triage Log

### 2026-11-20: blind reviewer, pass 1

- **`[medium]` `[patch]` The fact wrote two status values without setting `new_status`, against "Status writes"** (`done` or `in-progress`, the same value in both files). It now sets `new_status` = `review`, and "Status writes" lists `review` with its `in-review` spec spelling.
- **`[medium]` `[patch]` "Epic boundary" kept option 1 ("Start the next story") whenever `new_status` isn't `done`,** which contradicted this fact's §7 rule. It now keeps option 1 for `in-progress` only and defers to this fact for `review`.
- **`[low]` `[patch]` A failed manual run found in §6 had no way back through §4/§5 and the full check.** The question now comes before §4, and `decision-needed` is spelled `decision_needed` as elsewhere in the file.
- **`[low]` `[patch]` No rule for a spec with no `story_key`.** It writes the spec frontmatter only, as "Status writes" does.
