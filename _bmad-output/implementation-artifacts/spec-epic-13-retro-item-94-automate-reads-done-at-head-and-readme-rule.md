---
title: 'Automate reads done at HEAD, the review commits its record, and the README rule'
type: 'chore'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: 'b195044'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
  - '{project-root}/_bmad/custom/bmad-testarch-automate.toml'
  - '{project-root}/_bmad/custom/bmad-code-review.toml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 94 (E13-P2, E13-S3; sprint item `epic-13-retro-item-94-automate-reads-done-at-head-and-readme-rule`), due before Epic 14.

- **E13-P2.** Review session `ce07ccd5` recorded Story 13.1's AC-11 and set `done` in the working tree, then ended without committing. Automate session `ed93b05a` saw the uncommitted `done`, generated tests and committed `a8c47d3` while HEAD still said `review`. It then committed the review's record as `1b38535`. For 13.4 and 13.6 the check refused correctly, but only because HEAD and the working tree agreed: it read the working tree.
- **E13-S3.** The review's "No README updates from stories" fact forbids README edits unless the story is about the README. Yet Epic 13's ACs required README paragraphs (Stories 13.1, 13.2, 13.4, 13.5, 13.8), and six commits made them. The ACs are right.

**Approach:**

- `bmad-testarch-automate` treats a story as `done` only when `sprint-status.yaml` at HEAD says so. Uncommitted review edits mean it stops and asks for the review to be committed.
- `bmad-code-review` commits its own record before its session ends, including the manual-AC record that moves a story to `done`.
- The README fact gains "unless an AC asks for a README change".

</frozen-after-approval>

## Implementation Notes

- **`_bmad/custom/bmad-testarch-automate.toml`: a new first fact, "A story is `done` only at HEAD".**
  - It runs before step-01's stack detection.
  - It reads `development_status[{story_key}]` with `git show HEAD:…/sprint-status.yaml`, matching keys by exact numeric equality.
  - If HEAD isn't `done` but the working tree is, it stops, names the uncommitted paths and asks for the review to be committed. If neither is `done`, it stops because the story isn't done.
  - It never commits, stages or edits the review's record. Its own commits stage its own files by name.
  - Note: automate has no built-in story-status check. The 13.4 and 13.6 refusals came from AGENTS.md "Story pipeline" step 4, applied by hand.
- **`_bmad/custom/bmad-code-review.toml`: a new fact, "Commit the review's record before the session ends".** It sits before "Review commit type".
  - It runs at the end of §6, after the completion summary and before §7. It applies to every `new_status`, and again when a later manual-AC record moves the story to `done`.
  - It commits after the full-check gate. It stages by name and leaves out paths the review didn't touch.
  - "Review commit type" no longer says the skill has no commit step. It adds a subject for a review that leaves the story in review or in progress.
- **The README fact** gains "or one of its ACs asks for a README change; then the edit covers only what the AC asks". Beyond the retro item's named files, the same fact is copied in `_bmad/custom/bmad-build.toml` and `_bmad/custom/bmad-build-auto.toml`, so it changes there too. Otherwise a build would refuse a README edit that its AC asks for and the review accepts. Only the review's copy adds that an unasked README edit is still a finding.
- **Not changed:** the skills' step files (upstream) and AGENTS.md (its "Story pipeline" already says automate runs only after `done`).
- **Checks:** all four TOMLs parse with `tomllib` (code-review 9 facts, automate 2).
- **Sprint item 94** is marked `done` in `sprint-status.yaml` in the same commit.
