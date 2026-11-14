---
title: 'Have ATDD probe every new measuring helper, and check render-before-read, before the red run'
type: 'chore'
created: '2026-11-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-retro-2026-11-13.md'
  - '{project-root}/.claude/skills/bmad-testarch-atdd/steps-c/step-04c-aggregate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 8 retro item 66 (PL-3; sprint item `epic-8-retro-item-66-…`), due before the next story. All 7 red leaves of Story 8.2 "fail at their first assertion", but the pixel-sampling helper had three bugs that build 8.2 fixed without changing any assertion. Separately, an 8.1 leaf read tile names right after `goto`, and build 8.2 hit and fixed that race. ATDD's red check (step-03 §4, step-04c) only proves that a leaf fails first at its criterion assertion. It can't tell a missing feature from a broken helper, or from a read that ran too early. bookvie has no `bmad-testarch-atdd` override yet.

**Approach:**
- **New `_bmad/custom/bmad-testarch-atdd.toml`** with persistent facts:
  - Before the red run, every measuring helper the run adds or changes (pixel sampling, geometry, a wait) is probed on a known-good input and gives the expected value.
  - No leaf reads the page before it has rendered.
  - The probe is recorded in the ATDD checklist.
- No code or test changes.

</frozen-after-approval>

## Implementation Notes

- **Three facts**, all due in step 5 before the checklist is finalized and before any red run, whether or not a red run happens:
  - **Probe:** it covers sampling, geometry, waits and rendered-text parsers that the run adds or changes, in e2e or unit tests. The known-good input is a `page.setContent` fixture or a part of the app that already ships. The probe also checks a value the helper should reject, so a helper that always passes is caught. It runs under the leaves' own viewport, scale, color scheme and forced-colors settings. It lives in a temporary `*.probe.spec.ts` (or `*.probe.test.ts`), removed with `rm`, never a git command (item 64), and `git status` must show none left. Any later change to a probed helper voids its probe and the red results recorded since.
  - **Render-before-read:** a one-shot read waits first, on something that already ships and that the read depends on, or the read becomes the web-first criterion assertion itself. That keeps step-04c's rule that the criterion assertion is the first operation that can fail. An absence read waits on the rendered container.
  - **Checklist:** `## Helper probes` goes before the red-phase section (`## TDD Red Phase`, or the template's `## Red-Phase Test Scaffolds Created`). It has one line per helper and the render-before-read line. Red claims cite only runs made after the probes. Edit mode keeps the section up to date, and validate mode fails without it.
- **Probe file location:** `frontend/e2e/` is Playwright's `testDir`, so a probe there runs with the project's config and fixtures. The `.probe.` name makes a leftover easy to spot before the commit.
- **Not changed:** the skill's step files (upstream) and AGENTS.md. The action names only the new override, which loads in every ATDD run. The build (`bmad-build-auto`) doesn't get these facts. A helper fix it makes is checked by its own review, by `bmad-code-review` and by automate. Extending the probe to the build is left for a later retro, if a helper bug gets past those.
- **Checks (2026-11-14):** the TOML parses with `tomllib` (3 persistent facts) and `resolve_customization.py --key workflow` for bmad-testarch-atdd returns all three. Both were re-run after the review patches. The file isn't git-ignored. The behaviour isn't exercised here. Epic 9's first ATDD is the first live check.
- **Sprint item 66** is marked `done` with `sprint_status.py update --set-action-status` in the same commit, approved by Oleg on 2026-11-14.

## Review Triage Log

### 2026-11-14: Blind Hunter, pass 1

Floor N = 3 (about 6.3 kB). It reported 11 findings.

- **`[high]` `[patch]` Render-before-read clashed with step-04c.** A wait on the new feature would fail before the criterion assertion does. The wait is now on something that already ships, or the read becomes the web-first criterion assertion.
- **`[medium]` `[patch]` Absence reads had no rule.** They wait on the rendered container, then assert the absence.
- **`[medium]` `[patch]` Probes didn't match the leaves' conditions** (scale, color scheme, forced colors). Probes now run once per setting the leaves use.
- **`[medium]` `[patch]` A helper changed after its probe was not covered.** The change voids the probe and the red results recorded since.
- **`[medium]` `[patch]` A leftover probe file could be committed and run in CI.** It is now named `*.probe.*`, removed with `rm`, and `git status` must show none.
- **`[low]` `[patch]` `## TDD Red Phase` isn't a template heading.** Fallback added: the template's `## Red-Phase Test Scaffolds Created`.
- **`[low]` `[patch]` The render check had no deadline when no red run happens.** Both checks are now due in step 5.
- **`[low]` `[patch]` Edit and validate modes weren't covered.** Edit mode keeps the section up to date, and validate mode fails without it.
- **`[low]` `[patch]` The facts covered Playwright only.** Unit helpers are in scope, with a `*.probe.test.ts` probe.
- **`[low]` `[patch]` The spec had no context and cited checks before running them.** Added the retro and step-04c to the spec's context, and re-ran the checks after the patches.
- **`[low]` rejected: AGENTS.md and build-auto aren't changed.** The action scopes this to the ATDD override. The reason is recorded under Not changed.
