---
title: 'Run code review in its own session, and flag bmad-build for story work'
type: 'chore'
created: '2026-11-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 5 retro item 47 (PL-3, PL-4; sprint item `epic-5-retro-item-47-…`). Due before story 6.1. It covers two problems:
- **PL-3:**
  - Code review for stories 5.1–5.3 and the pile spec ran in the build's session.
  - The pile review reused the build's browser probe, which read the scroll before Chromium's smooth scroll started. Both passes rejected the real "Home on a radio scrolls" bug, and automate caught it.
  - AGENTS.md "Story pipeline" doesn't say where step 3 runs.
- **PL-4:**
  - Story 5.1 ran interactive `bmad-build`, not `bmad-build-auto`. Its approval question waited over an hour.
  - Nothing in `bmad-build` flags that the story pipeline uses build-auto.
  - Related (`deferred-work.md:678`, from item 46's review): bmad-build still marks a pipeline spec `done`, skipping code review.

**Approach:**
- **AGENTS.md "Story pipeline":**
  - Step 3 runs in a new session, never the one that ran step 2.
  - It re-runs any probe or check it relies on, rather than citing the build's results.
- **`_bmad/custom/bmad-build.toml`, new step-01 fact:**
  - It applies when `story_key` is set, or the spec is a pipeline spec (build-auto's definition: no `story_key`, and a `- **Pipeline:**` line naming `bmad-code-review` after `bmad-build-auto`).
  - Before planning, it stops and says that the story pipeline builds with `bmad-build-auto`. It continues only if the user says to keep going with bmad-build, and records that in the spec.
- **`_bmad/custom/bmad-build.toml`, existing facts:** extend "Spec status ownership" and "Parked story specs" to pipeline specs, as item 46 did for build-auto. A pipeline spec ends at `in-review`, with no sprint-status write.
- **`deferred-work.md`:** add a `resolved:` line to entry `:678`. Entry `:681` (code review's next step) stays open, since it is outside this item.
- No code changes.

</frozen-after-approval>

## Implementation Notes

- **AGENTS.md "Story pipeline":** two paragraphs. The first: step 3 runs in a new session and re-runs whatever it relies on, so no build results, Auto Run Result or earlier probe count as evidence. The second: step 2 is build-auto, bmad-build stops at a story, and the same goes for a pipeline spec. Agents read AGENTS.md through `CLAUDE.md`, so bmad-code-review sees the rule without a code-review fact.
- **`_bmad/custom/bmad-build.toml`:**
  - **New first fact, "Story builds use bmad-build-auto":** step-01 stops before step-02 for a story or a pipeline spec, and offers to stop or to continue. It continues only on the user's word, in reply or in the invocation prompt, and records the choice in the spec. Retro items and other non-story work skip it, so this run isn't affected.
  - **"Spec status ownership":** a pipeline spec ends at `in-review` with no sprint write, and keeps its Pipeline line.
  - **"Parked story specs":** a pipeline spec at `in-review` is parked unless the user says its review was interrupted. bmad-build is interactive, so it asks rather than reading build-auto's `Status: in-review` marker.
  - **Header:** points to build-auto's definition of a pipeline spec.
- **`deferred-work.md:678`:** a `resolved:` line. `:681` (code review's next step after a pipeline spec) stays open.
- **Not changed:** `bmad-code-review.toml`. Nothing in it detects that the review runs in the build's session. The AGENTS.md rule is the control, and a session can't reliably tell which earlier sessions ran.
- **After review:**
  - **bmad-build:** it now copies build-auto's pipeline-spec definition word for word, as its own first fact, and keeps the Pipeline line on either route (Implementation Notes on oneshot, Design Notes on full).
  - **The stop:** it also fires for an epic story whose key didn't resolve, and only explicit words count as consent. A pipeline spec ends with the `Status: in-review` marker that build-auto parks on; without it, the default step-01 resume applies.
  - **`bmad-build-auto.toml`:** an `in-review` HALT ends with "Next: run `bmad-code-review` in a new session", so the hand-off says it where the mistake happens. That is one sentence outside the Intent's change list, added because it serves PL-3 directly.
  - **AGENTS.md:** a compacted or resumed session isn't new, step 4 re-runs its checks too, and bmad-build "stops and asks".
- **Line refs:** after the edit, the open code-review entry is at `deferred-work.md:682`, not `:681` as the Intent says.
- **Checks:** both TOMLs parse (`tomllib`), and `resolve_customization.py --key workflow` resolves for both bmad-build and bmad-build-auto. The behaviour isn't exercised here. Story 6.1's build is the first live check.

## Review Triage Log

### 2026-11-11: Blind Hunter, pass 1

Floor N = 4 (about 14 kB). It reported 13 findings.

- **`[low]` `[patch]` bmad-build's pipeline-spec definition was a partial copy.** It is now build-auto's word for word, and the header says to change both together.
- **`[medium]` `[patch]` The oneshot route deletes Design Notes, so bmad-build would lose the Pipeline line.** The line now goes into Implementation Notes on oneshot, or Design Notes on full.
- **`[medium]` `[patch]` bmad-build never wrote build-auto's park marker,** so build-auto would review the spec again. bmad-build now writes `Status: in-review` under `## Auto Run Result` and parks on it too.
- **`[low]` `[patch]` The "review interrupted" escape had no outcome.** It now takes the default step-01 resume.
- **`[low]` `[patch]` The continue choice had no section to go in before a spec exists.** It is carried into step-02's write, next to the Pipeline line.
- **`[medium]` `[patch]` An epic story whose key didn't resolve skipped the stop.** It now fires on `epic_num` and `story_num`.
- **`[low]` `[patch]` AGENTS.md said bmad-build "stops", not that it asks and can continue.** Reworded.
- **`[low]` `[patch]` build-auto's `in-review` hand-off didn't say to use a new session.** One sentence added.
- **`[low]` `[patch]` A compacted session didn't clearly count as not new.** Said explicitly (5.3's case).
- **`[low]` `[patch]` Step 4 wasn't addressed.** "Step 4 likewise re-runs what it relies on." It can share step 3's session, since automate is offered there.
- **`[low]` `[patch]` The Intent's `:681` was stale after the edit.** Recorded under Line refs. The Intent is frozen.
- **`[low]` `[reject]` The spec is unfinished and the sprint item still open.** The spec is now `done`. The sprint item is set when Oleg approves, in the same commit (items 44–46).
- **`[medium]` `[patch]` A prompt naming bmad-build could count as consent (the PL-4 scenario).** Only an explicit "continue with bmad-build" counts. `/bmad-build 5.1` is named as not consent.

