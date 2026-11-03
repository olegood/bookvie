---
title: 'Keep spec status in sync with sprint-status, and check the spine in story reviews'
type: 'chore'
created: '2026-11-03'
status: 'done'
baseline_commit: '41b7444f9936521d722c662eb9441f7b08c97a52'
route: 'dispatch'
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A story's spec frontmatter `status` and its `development_status` in `sprint-status.yaml` disagree (retro PL-3): bmad-build ends a story with the spec at `done` and sprint-status at `review`, and bmad-code-review then writes only sprint-status (it updates a "Status section" that bmad-build specs don't have), so a review that reopens a story leaves the spec at `done`. Separately, story specs changed architecture decisions without updating the spine, and no review checked (F-S2). Epic 1 retro action item 11.

**Approach:** Use the BMAD customization overrides (`_bmad/custom/bmad-build.toml`, `_bmad/custom/bmad-code-review.toml`), not edits to the installed skills, which are overwritten on update. Make one step own each status transition so the spec and sprint-status are always written together, and add a spine check to story reviews.

## Boundaries & Constraints

**Always:** overrides only; installed `.claude/skills/*` and `_bmad/render/*` are untouched. Non-story work (no `story_key`, e.g. retro items) keeps today's behaviour.

**Never:** a script or hook to enforce sync; changes to sprint-status's status vocabulary.

**Decisions (Oleg, 2026-11-03):**
- bmad-code-review is the only step that marks a story `done`. When `story_key` is set, bmad-build ends with spec `in-review` and sprint `review`; bmad-code-review then sets the spec frontmatter `status` and sprint-status together, both to `done` or both back to `in-progress`.
- The spine check runs in bmad-code-review and in bmad-build's full (dispatch) review. It does not run in bmad-build's oneshot review.

</frozen-after-approval>

## Code Map

- `.claude/skills/bmad-build/customize.toml` -- override surface: `persistent_facts`, `on_complete`, `review_layers` (merge by `id`), `oneshot_review_layers`. Do not edit.
- `.claude/skills/bmad-build/step-05-present.md:15-17`, `step-oneshot.md:76-79` -- spec `done`, sprint `review` today.
- `.claude/skills/bmad-code-review/customize.toml` -- same surface plus a `when` gate on layers.
- `.claude/skills/bmad-code-review/steps/step-04-present.md:85-107` -- sets `new_status` (`done`/`in-progress`), writes sprint-status and a story "Status section".
- `_bmad/custom/config.toml` -- example of the committed override location.
- `.claude/skills/bmad-build/step-01-clarify-and-route.md:23,31-36,67` -- routes `in-review` specs to step-04, lists them as active and HALTs, and loads only `done` specs for previous-story continuity.
- `.claude/skills/bmad-build/step-01-clarify-and-route.md:40-44` -- Story-key resolution (spec filename → `development_status` key by epic and story number); reuse its wording in the code-review fact.
- `.claude/skills/bmad-code-review/steps/step-01-gather-context.md:20-46,71-80` -- Tier 1/2 set `spec_file` but never `story_key`; Tier 3 sets `story_key` but never `spec_file`, and step 5 then asks for a spec path.
- `.claude/skills/bmad-code-review/steps/step-02-review.md:24` -- a reviewer child's working directory is not the parent's; paths passed to it must be absolute. `{skill-root}`, `{diff_file}`, `{claims_file}`, `{spec_file}` are substituted; `{project-root}` is not substituted inside layer instructions.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad/custom/review-prompts/spine-check.md` -- new; the one spine-check reviewer prompt. The reviewer reads `ARCHITECTURE-SPINE.md` at the absolute path its launch prompt gives, then the diff. For each change that alters or adds behaviour an AD governs, it cites the AD and says whether the diff updates the spine to match; it reports spine edits that contradict the code; if a spec or claims file is given, it reports a spec that says an AD changed without a matching spine edit. Findings only, as a Markdown list; an unreadable spine is reported and the reviewer stops.
- [x] `_bmad/custom/bmad-build.toml` -- new. `persistent_facts`: (1) when `story_key` is set, every step that would set the spec `status` to `done` sets it to `in-review` instead (sprint stays `review`); with no `story_key`, `done` as today. (2) in step-01, a story spec at `in-review` whose sprint-status entry is `review` is parked for bmad-code-review: it is not listed as active work, an explicit request to resume it is answered by pointing to bmad-code-review (not by running step-04), and it counts as finished for previous-story continuity. `[[workflow.review_layers]]` `id = "spine-check"`: launch a context-free subagent that reads `_bmad/custom/review-prompts/spine-check.md` and follows it, with the diff at `{diff_file}`, the claims file `{claims_file}`, and both the prompt file and the spine given as absolute paths the parent resolves from the project root before launch. Not added to `oneshot_review_layers`.
- [x] `_bmad/custom/bmad-code-review.toml` -- new. `persistent_facts`: (1) before step 4 §6, resolve the pair: with `spec_file` set and `story_key` empty, resolve `story_key` from the spec filename as bmad-build's Story-key resolution does; with `story_key` set and `spec_file` empty, set `spec_file` to the single `{implementation_artifacts}/spec-{story_key}.md` or `spec-{epic}-{story}-*.md` match (none or several → warn). (2) a bmad-build spec's status is its frontmatter `status:` (no Status section). With both `story_key` and `spec_file`, write `new_status` to the spec frontmatter and to sprint-status in the same pass; if the sprint key is missing, write neither and say why. With no `story_key`, update the spec status as today. The same `spine-check` layer, passing `{spec_file}` as the spec.
- [x] Verify both resolve: `python3 _bmad/scripts/resolve_customization.py` for each skill shows the facts and `spine-check` appended to the default layers (bmad-build `oneshot_review_layers` unchanged). Record the output summary in Implementation Notes.

**Acceptance Criteria:**
- Given a story build in bmad-build, when it finishes, then the spec is `in-review` and sprint-status is `review`.
- Given bmad-code-review on that story, when it ends with `done` or `in-progress`, then the spec frontmatter and sprint-status show the same value.
- Given a retro item or other non-story build, when it finishes, then the spec is `done`, as today.
- Given a story diff that changes an AD-governed rule without touching the spine, when either full review runs, then the spine-check layer reports it.

## Implementation Notes

- Resolver output (`python3 _bmad/scripts/resolve_customization.py -s <abs skill dir> -p <project root>`, 2026-11-03):
  - bmad-build: `persistent_facts` = 2 (status ownership; parked `in-review` story specs); `review_layers` = blind-hunter, edge-case-hunter, verification-gap, spine-check; `oneshot_review_layers` = blind-hunter (unchanged).
  - bmad-code-review: `persistent_facts` = 2 (spec/story pair resolution; paired status writes); `review_layers` = blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check.
- `{project-root}` is not substituted in layer instructions, so both `spine-check` layers use a literal `<project-root>` token the parent replaces with the absolute project root before launch and pass it as `root:`. The spine path appears once, relative to that root, in `_bmad/custom/review-prompts/spine-check.md`.
- In bmad-build, step-04 sets `{claims_file}` = `{spec_file}`, so the spine checker gets the spec through `{claims_file}` (made absolute by the parent); in bmad-code-review it gets `{spec_file}` only, never the commit-message claims file.
- bmad-code-review resolves the spec/story pair right after step-01 Tiers 1–3 (before instruction 5), asking for the spec path when a story key has no single matching spec.
- Not exercised by a real story run; whether the facts win over the steps' literal "set done" is only observable then (see triage log).

## Spec Change Log

- **Iteration 1 (review, bad_spec).** Trigger: (a) bmad-code-review never sets `spec_file` from sprint tracking or `story_key` from a spec path, so the first version's "write neither without a key" left reviewed stories at `review`/`in-review` forever and skipped §6 entirely; (b) bmad-build step-01 treats `in-review` specs as active (lists them and HALTs, resumes into its own step-04) and skips them for previous-story continuity. Amended: Code Map (step-01 lines, code-review tiers, child working directory); tasks now resolve the spec/story pair in code review, keep today's behaviour with no key, and park `in-review` story specs in bmad-build step-01; the spine-check prompt lives once in `_bmad/custom/review-prompts/spine-check.md` with absolute paths and gets the spec/claims file. Avoids: a status sync that never fires in the normal flow, and every finished story blocking the next build. KEEP: overrides only; the `persistent_facts` approach; the spine-check layer's two checks (AD-governed change without a spine update; spine edit contradicting code); `spine-check` appended by a new `id`, absent from `oneshot_review_layers`; the status-ownership wording of fact (1) in bmad-build.

## Review Triage Log

- Code review never resolves `spec_file` from `story_key` or `story_key` from a spec path, so sync never fires: high. Verified in `step-01-gather-context.md` Tiers 1–3 and step 5. bad_spec.
- "Write neither" with no `story_key` breaks today's behaviour for non-story reviews, against the Always rule: medium. Same root cause as above (pair resolution). bad_spec.
- bmad-build step-01 lists `in-review` specs as active and HALTs, resumes them into step-04, and skips them for continuity (oneshot resume included): medium. Verified at `step-01-clarify-and-route.md:23,31-36,67`. bad_spec.
- Spine path relative; the child's working directory differs: medium. Verified (`step-02-review.md:24`). Folded into the amended tasks.
- Spine-check prompt copied into two files: low. Folded into the amended tasks (one prompt file).
- Spine checker gets no spec context, so it can't catch "spec says the AD changed, spine didn't": low. Folded into the amended tasks.
- Spine path pinned to a dated folder: low. One literal in one prompt file after the amendment; reject.
- No `when` gate on spine-check: low. The decision is "every full review"; a docs-only diff can still change the spine. Rejected.
- The fact may lose to the step's literal "set done": maybe-false. Only a real story run would show it; inherent to the override approach the intent chose. Rejected.
- No recorded verification / missing ACs for both-or-neither and oneshot: low. Fixes edit this spec; the amended tasks require recording the resolver output. Rejected as findings.
- Existing Epic 1 drift not reconciled: false. All 14 Epic 1 specs and sprint entries are `done`.
- A non-bmad-build story file with a Status section gets the wrong field: low. No such files in this repo. Rejected.
- First write succeeds, second fails: low. Rare save failure; a rollback guard adds complexity. Rejected.
- Verification-gap layer: no gaps (instruction-only change; resolver merge confirmed).
- Round 2 (iteration 1 code):
  - Pair fact reads `epic_num`/`story_num` from frontmatter that bmad-build specs lack: medium. Verified (`spec-1-*` frontmatter has neither). Patched: derive from the filename or title.
  - Both spec patterns match the same file (e.g. `spec-1-1-scaffold-and-install-bookvie.md`), counted as "several": medium. Verified. Patched: count distinct files.
  - Pair resolved only before §6, so Tier 3 still asks for a spec and the spec-aware layers run without it: medium. Patched: resolve before step-01 §5; ask for the path when no single file matches.
  - Sprint key or sprint-status file missing → "write neither" leaves the spec `in-review` with no `review` entry, so bmad-build lists it as active: medium. Patched: write the spec only and say the sprint sync was skipped.
  - "Update the spec status as today" ambiguous for non-story bmad-build specs: low and cheap. Patched: frontmatter `status:`, no sprint sync.
  - Hard-coded sprint-status path instead of `{sprint_status}`: low and cheap. Patched.
  - Spine-check sees the code-review claims file, which is staged for one layer only: low. Patched: code review passes only `{spec_file}`. In bmad-build the claims file is the spec, which the amended task requires; the prompt reads it only after its own diff pass.
  - bmad-build passes `{claims_file}` possibly relative: low and cheap. Patched.
  - Spine path literal duplicated in both TOMLs (the iteration-1 rejection said "one literal in one prompt file", which wasn't true); child has no root for working-tree reads: low. Patched: the TOMLs pass `root`, and the spine path lives once in `spine-check.md`.
  - No-findings output lists ADs that triage may read as findings: low and cheap. Patched to one sentence.
  - No path for rework when code review reopens a story (`in-progress`): low. Today's code review leaves the same action items in its output; unchanged by this change. Deferred.
  - ACs missing for parking, pair resolution and oneshot; ACs not exercised beyond the resolver: low. Fixes edit this spec, or need a real story run (the next Epic 2 story). Rejected.
  - Verification-gap layer: no gaps.
