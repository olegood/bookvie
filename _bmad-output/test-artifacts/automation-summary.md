---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-22'
storyId: '13.4'
storyKey: '13-4-back-up-to-dropbox-with-one-skill'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-4-back-up-to-dropbox-with-one-skill.md (Boundaries, I/O matrix, Review Findings, AC-5 result)
  - _bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (13.4's entries; none is addressed to this step)
  - _bmad/tea/config.yaml
  - .claude/skills/bookvie-backup/SKILL.md
  - backend/bookvie_dropbox/upload.py (`_prune`)
  - backend/tests/test_backup_skill.py, test_dropbox_upload.py, test_dropbox_upload_edges.py, dropbox_fakes.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.4 Back up to Dropbox with one skill

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI and no product code: it ships a skill (`SKILL.md`), its guide and README lines. Every target is pytest: text leaves on the skill, plus the tools it chains driven for real (bookvie in process over `/mcp`, `bookvie-dropbox` over `FakeDropbox`). No browser session was opened, and the Playwright fragments weren't loaded.
- **Where:** this worktree's branch (`hogback-creosote`). The story is `done` at `1e97fe0`, the review commit.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 7 open follow-ups and the review's rejected "no leaf" findings (blind-hunter 4 and 5), which it handed to this step.
- **Generation:** sequential, in this session.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.
- **Coverage tool:** not used. A skill is text, so line coverage says nothing about it. The mutation probes below take its place.

## Coverage plan

The build and the review had already covered 5 of the 7 follow-ups (see ATDD checklist). This run adds leaves for the wording the review patched and the build's patches left unpinned:

| AC | Priority | Level | Leaf |
|---|---|---|---|
| AC-1, AC-2 | P1 | Text | `get_app_info` answering an error, no `mode` or another value stops before the export with its own Failed line, and no export, upload or report. |
| AC-1 | P1 | Text | An upload error that isn't JSON, has no `cause` or names an unknown one is `other`. "Nothing in Dropbox was deleted" is said only after `dropbox_signin`, `upload_incomplete` and `dropbox_full`. Without a usable `cause`, the skill makes no claim. |
| AC-1 | P1 | Integration | Export from bookvie, then a prune that fails after a checked upload: `other`, whose message names the backup already deleted. bookvie accepts `failed`/`other`, and step 4 says the message names what was deleted. |
| AC-3 | P2 | Text | No line of step 6 says "Failed:" twice. A refused report without a code drops the parentheses. The closing note names every stop that has its own line. |

The review's older-bookvie stop already has its leaf (`test_an_older_bookvie_without_record_backup_upload_stops_the_run_before_the_export`, added with the patch).

Scope: selective. These are secondary branches of a text artifact, not new primary paths.

Not automated:
- An agent actually running the skill. That is AC-5's manual run, which passed on 2026-11-22 (spec, Acceptance Criteria).
- The frontmatter list against `--allowedTools` (13.5) and the per-state troubleshooting entries (13.6): later stories' work.

## Files

- `backend/tests/test_backup_skill.py`: 4 new leaves under "Automate (2026-11-22)", each with a `# [Pn] AC-n` tag. They reuse the file's `_skill`, `_body`, `_section`, `_paragraphs`, `_flat` and `_connect_default`, and 13.2's `upload`/`Connect`/`FakeDropbox`. The prune fault subclasses `FakeDropbox`, as `test_dropbox_upload_edges.py` does.
- `_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md`: 5 follow-ups ticked.

No file under `backend/bookvie/`, `backend/bookvie_dropbox/` or `.claude/skills/` changed.

## Validation

- `uv run pytest -q tests/test_backup_skill.py`: 19 passed on the first run.
- **Mutation probes:** a shell function edited `SKILL.md`, ran `test_backup_skill.py`, then copied the original back from the scratchpad. `cmp` confirmed the original bytes. No git command was used. **6 of 6 killed**, each by the leaf it targets:
  - the old blanket "Nothing in Dropbox was deleted." back in step 4;
  - `other` added to the nothing-deleted causes;
  - the old `"Failed: " and the reason` intro in step 6;
  - the codeless-suffix clause removed;
  - the unreadable-app-info stop replaced by "go on.";
  - "names any it already deleted" removed.
- `git status` after the probes showed only this run's test file.
- `npm run check:py`, first run: 1 failed, 2415 passed. The failure was the `bookvie-dropbox auth` redirect-port flake ("Port … on 127.0.0.1 is in use"), in a file this run didn't touch. Re-run of the whole pytest suite: **2416 passed**.
- `npm run check` on the final tree (before this line, which is Markdown only): **exit 0**. ruff, 2416 pytest passed with the coverage gate (total 97%), api, 800 e2e passed, and the smoke test.

## ATDD checklist

5 of 7 follow-ups ticked. Each cites the passing leaf that proves it; the AC-2 dev-folder line cites 13.2's `test_any_other_path_is_refused_before_any_dropbox_call[dev]`. `grep -cF '[ ]'` = **2**, both planned for later stories:
- the frontmatter list equals `--allowedTools` in `cli.py`: Story 13.5;
- each auto-backup state's troubleshooting entry: Story 13.6.

## Risks and assumptions

- The skill is checked as text and through the tools it chains. Nothing automated runs an agent on it; AC-5's manual run is the behavioral check, and 13.5's headless run will be the next.
- The text leaves pin exact sentences. That is deliberate, since the skill's wording is its behavior, but a rewording of `SKILL.md` must update them.
- The port flake in `bookvie-dropbox auth`'s tests (`deferred-work.md`, 13.3's medium entry) still fails full runs at random.

## Next

- Commit this run (`test:`, story 13.4).
- Story 13.5 (`run-the-backup-every-morning`): ATDD, `bmad-build-auto`, then `bmad-code-review` in a new session.
- Fixing the port flake would keep 13.5's full checks from failing at random.
