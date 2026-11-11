---
title: 'Make build-auto end at in-review for a standalone spec that declares the story pipeline'
type: 'chore'
created: '2026-11-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** bmad-build-auto marked `spec-pile-arrow-key-navigation.md` `done` before bmad-code-review ran (Epic 5 retro PL-2, sprint item `epic-5-retro-item-46-…`, `deferred-work.md:664`, the retro's `:656`).
- The spec had no `story_key`, so build-auto's persistent facts (`_bmad/custom/bmad-build-auto.toml`) treated it as non-story work and set `done`.
- Yet its Implementation Notes declared the full story pipeline: "**Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate`" (commit `8c313aa`, l.61).
- step-02 then rewrote the draft from the template, which has no Implementation Notes section, so the "Pipeline" line was lost (commit `c792de6`).

**Approach:**
- In `_bmad/custom/bmad-build-auto.toml`'s persistent facts, define a *pipeline spec*: a spec with no `story_key` that declares the story pipeline.
- A pipeline spec ends at `in-review`, like story work, but doesn't touch sprint-status, since it has no key.
- When build-auto is re-invoked on a parked pipeline spec, it stops for bmad-code-review instead of reviewing again.
- step-02's rewrite keeps the "Pipeline" line verbatim, so later runs and bmad-code-review still see it.
- Story-number rules (the spine gate, deferred-work intake, README) stay story-only.
- Add a `resolved:` line to `deferred-work.md:664`, the retro's `:656`.
- No code changes. bmad-build's own facts are out of scope: per AGENTS.md, story builds use build-auto, and item 47 flags that in bmad-build.

</frozen-after-approval>

## Implementation Notes

- **`_bmad/custom/bmad-build-auto.toml`** (persistent facts, now 10):
  - **New "Pipeline specs":** the definition, decided from the spec before step-02 writes it, or from the invocation prompt when there is no spec yet. The story-number rules don't apply to a pipeline spec.
  - **New "Keep the Pipeline line":** step-02 carries the line verbatim as the first bullet of `## Design Notes`. The template has `## Design Notes` but no Implementation Notes. Because the line still starts `- **Pipeline:**`, later runs detect the spec the same way.
  - **"Spec status ownership":** a pipeline spec ends `in-review` like story work, writes no sprint-status, and starts `## Auto Run Result` with `Status: in-review`.
  - **"Parked story specs, or a pipeline spec":** with no sprint entry to check, parking reads the `Status: in-review` line that Finalize writes. HALT alone doesn't write a literal `Status:` line when the spec exists (`workflow.md` → HALT, case 2), which is why Finalize writes it explicitly. Without the line, it's an interrupted review and resumes at step-04.
- **bmad-code-review needs no change:** its "Status writes" fact already writes `done` to the frontmatter of a spec with no `story_key` and skips the sprint sync.
- **`deferred-work.md:664`:** a `resolved:` line.
- **After review:**
  - The AGENTS.md-reference trigger is dropped from existing specs. It was loose, and step-02 wouldn't keep it. A prompt that asks for the story pipeline still counts when there is no spec yet, and step-02 then writes the Pipeline line.
  - step-04 deletes an old `Status: in-review` line when a new review starts.
  - `## Design Notes` is kept even when the line is its only content.
  - Deferrals from a pipeline spec reach `deferred-work.md`.
  - The TOML header notes that bmad-build differs.
- **Checks:** the TOML parses (`tomllib`), and `resolve_customization.py --key workflow` resolves the merged facts. Both passed after the patches. The behaviour isn't exercised here. The next pipeline spec built with build-auto is the live check: it should end `in-review` with the Pipeline line in `## Design Notes`.

## Review Triage Log

### 2026-11-11: Blind Hunter, pass 1

Floor N = 4 (about 11.5 kB). It reported 12 findings.

- **`[medium]` `[patch]` A stale `Status: in-review` line could park a spec whose rework was never reviewed.** This happens after code review sends the spec back and a second review is interrupted. Patched: step-04 deletes the old line when a new review starts.
- **`[medium]` `[patch]` A pipeline spec decided from the prompt got no Pipeline line,** so a resumed run or bmad-code-review couldn't detect it. Patched: step-02 writes the line in that case.
- **`[low]` `[patch]` The AGENTS.md-reference trigger was loose and wasn't kept by the rewrite.** It is dropped for existing specs, and the prompt case covers it.
- **`[low]` `[patch]` The template's "DELETE THIS ENTIRE SECTION" could remove the line, and a `bad_spec` loopback wasn't covered.** Patched: the section is kept, and the rule covers every step-02 write.
- **`[low]` `[patch]` Pipeline-spec deferrals didn't reach `deferred-work.md`.** That fact needs no story number, so it now applies to pipeline specs too.
- **`[low]` `[defer]` bmad-code-review offers "Start the next story", not automate, after a pipeline spec.** The fix edits `bmad-code-review.toml`, which is outside item 46's change list. Recorded in `deferred-work.md`.
- **`[low]` `[defer]` bmad-build still sets `done` on a pipeline spec.** Item 47 only steers story work to build-auto. Recorded in `deferred-work.md`; the spec's out-of-scope reasoning stands as written.
- **`[low]` `[reject]` Sprint item 46 is still `open`.** It is set to `done` when Oleg approves, in the same commit (items 44 and 45).
- **`[low]` `[reject]` The item, spec and resolved line cite different lines.** The `resolved:` line sits on the entry itself. The Intent records both `:664` and the retro's `:656`.
- **`[low]` `[patch]` The spec was `in-progress` with no recorded check outcome.** It is now `done`, with the check results above. The oneshot route has no Verification section.
- **`[low]` `[patch]` The `resolved:` line read as three alternatives.** Reworded as "no `story_key`, and a Pipeline line".
- **`[low]` `[patch]` The TOML header said the rules mirror `bmad-build.toml`.** It now notes the divergence.

