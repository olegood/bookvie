---
title: 'Story 13.5: Take out the morning job'
type: 'refactor'
created: '2026-11-23'
status: 'done'
baseline_revision: '08bb1adae588adc1f25167f614b8e4301d76749c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-5-take-out-the-morning-job.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-22 Causes), reconciled before the next epic: AD-22 still says "The UX's Failing line has one sentence per cause"; EXPERIENCE.md's table is now the Failed reasons of the Dropbox backup line, read after `failed *when* · `.
    evidence: |-
      spine-check finding 1; ARCHITECTURE-SPINE.md:360; EXPERIENCE.md Dropbox backup line table header; backend/tests/helpers.py failing_reasons.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:360
    severity: low
  - summary: >-
      "daily backup run" wording survives in agent tool descriptions and docstrings (export_backup's forUpload "which only the daily backup run sends", record_backup_upload "Record how a daily backup run ended", backup_file.py and local_state.py docstrings), which now hints at a schedule.
    evidence: |-
      blind-hunter finding 4; pre-existing since Story 13.3; the two tool descriptions are copied from epics.md (lines 3168, 3173) and pinned by the description test, so the fix starts in epics.md, outside this story.
    location: >-
      backend/bookvie/agent/tools.py:775,889
    severity: low
  - summary: >-
      EXPERIENCE.md's Failed-reasons rows mix a capitalised start ("Dropbox sign-in expired.", "Dropbox is full.") with a lowercase one ("the last upload didn't finish.", "bookvie couldn't write…", "the last run stopped…") after "failed *when* · ".
    evidence: |-
      blind-hunter finding 11; pre-existing rows (only upload_incomplete's ending changed here); Story 13.6 renders these sentences on the Backup page and should settle the casing.
    location: >-
      _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:212-216
    severity: low
---

<intent-contract>

## Intent

**Problem:** The old Story 13.5 built a 09:00 launchd job (`bookvie autobackup install|uninstall|run`, `create_app(launchd_probe)`, `views/backup.autoBackup`) that Oleg's managed Mac won't run. Its code, docs, skill wording and tests are dead weight. The sprint change of 2026-11-23 says he backs up by running `/bookvie-backup` by hand.

**Approach:** Remove the job's product code by returning `cli.py`, `http/app.py`, `http/api.py` and `views/{backup,models,__init__}.py` to their content before commit `c3cc1a8`. Only the two old 13.5 commits touched these files since then. Regenerate `schema.d.ts`. Rewrite the skill, guide, README entry and EXPERIENCE.md's Failed-reasons table for a run by hand. Delete or trim the tests that pin the job, and un-skip the 5 ATDD leaves in `test_morning_job_removed.py`.

## Boundaries & Constraints

**Always:**
- `local-state.json`'s `autoBackup` group, `record_backup_upload`, `export_backup`'s `unchangedSinceUpload`, `bookvie.store.local_state` and `intents/backup_file.py` stay as they are. Their tests pass unchanged.
- The skill's frontmatter `allowed-tools`, its steps 2 to 5 and its report lines stay the same, except the `upload_incomplete` line and the closing note.
- The skill's `upload_incomplete` line, EXPERIENCE.md's row and `helpers.failing_reasons` change in the same commit.
- The 5 ATDD leaves are not weakened. If a leaf seems wrong, the build records why in the spec rather than editing its assertion silently.

**Never:**
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64). A file's earlier content is read with `git show <rev>:<path>`, never `git checkout`/`git restore`.
- Don't touch the frontend UI, which never read `autoBackup`. Story 13.6's Dropbox backup line is out of scope.
- Don't edit the spine (AGENTS.md "Architecture spine"). Don't edit the README beyond the `bookvie-backup` entry's job sentence.
- No new feature, and nothing that replaces the job (no reminder, no cron).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Old command | `bookvie autobackup install` (also `uninstall`, `run`) | argparse usage error, exit 2 | Nothing is written. No plist, no launchctl. |
| Backup view | `GET /api/views/backup` | `{"lastExportAt": …}` only | Unreadable `local-state.json` gives `{"lastExportAt": null}`, as before 13.5 |
| Upload state | `local-state.json` holding `autoBackup` | kept, and read by `unchangedSinceUpload` as before | unchanged |
| Mac with the old job | the plist is still in `~/Library/LaunchAgents` | the guide's Uninstalling note: `launchctl bootout gui/$(id -u)/com.bookvie.autobackup`, then delete the plist and `~/Library/Logs/bookvie/` | none in code |

</intent-contract>

## Code Map

- `backend/bookvie/cli.py`: the job's constants (lines 42–67), the `autobackup` subparser in `parse_args` (118–135), the job code (309–564: `launchd_job_installed` … `_autobackup`), the dispatch in `main` (568–570), and `launchd_probe=launchd_job_installed` (622). The target is `git show c3cc1a8^:backend/bookvie/cli.py`.
- `backend/bookvie/http/app.py`: `_is_real_backups_folder`, which exists only for the probe, plus the `launchd_probe` keyword and docstring, `app.state.launchd_probe`, and the `Callable` and `DEFAULT_BACKUPS_NAME` imports. The target is `c3cc1a8^`.
- `backend/bookvie/http/api.py:345-361`: `backup_view` and `_auto_backup_installed`. The target is `c3cc1a8^`.
- `backend/bookvie/views/{backup,models,__init__}.py`: `AutoBackupView` and `BackupView.auto_backup`. The target is `c3cc1a8^`.
- `frontend/src/api/generated/schema.d.ts`: regenerate with `npm --prefix frontend run api:gen`. Never format it.
- `.claude/skills/bookvie-backup/SKILL.md`: description line 7, intro line 24, step 1's headless stop (line 30), the `upload_incomplete` line (92), and the closing note (99).
- `docs/dropbox-backup.md`: intro line 7, Setup "### 5. Install the daily job" (66–85), "Your first run" (89), the `upload_incomplete` entry's "next 09:00 run" (111), How it works (137, 145), "### Troubleshooting the daily job" (147–171), and Uninstalling (265–271).
- `README.md:126`: the `bookvie-backup` entry's "The daily 09:00 job runs the same skill."
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:208-216`: the "Pending Story 13.5" note, the header `| Cause | After "Failing · " |`, and the `upload_incomplete` row.
- `backend/tests/helpers.py:606-620`: the header string and docstring of `failing_reasons`.
- Tests:
  - Delete `test_autobackup.py`.
  - In `test_views.py` (the three `test_backup_view_*` leaves) and `test_export.py:546`, the expected view becomes `lastExportAt` only.
  - In `test_dropbox_backup_guide.py`, delete the "Story 13.5" block (lines 267 to the end). In the 13.4 How-it-works leaf, drop "09:00", "launchd" and "claude -p", and update the module docstring.
  - In `test_backup_skill.py`, delete `test_headless_with_bookvie_not_running_…`, drop "and the headless stop in step 1" from the last leaf's regex, and fix the docstrings at lines 7 and 67 and the comment at line 282.
  - In `test_morning_job_removed.py`, un-skip the 5 leaves.
- Deferred-work intake: none open name story 13.5. Lines 1597–1629 are old-13.5 entries, all already `resolved: obsolete` by the sprint change.
- Previous story: 13.4 (`spec-13-4-…`, done) built the skill and guide this story rewrites. Its constraint "no `bookvie autobackup …` in a guide code block" still holds, and now permanently.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/cli.py`, `backend/bookvie/http/app.py`, `backend/bookvie/http/api.py`, `backend/bookvie/views/backup.py`, `backend/bookvie/views/models.py`, `backend/bookvie/views/__init__.py`: write each from `git show c3cc1a8^:<path>`, then diff against HEAD to confirm that only job code went. This removes the command, the probe and `AutoBackupView` (AC-1, AC-2).
- `frontend/src/api/generated/schema.d.ts`: run `api:gen` (AC-2).
- `.claude/skills/bookvie-backup/SKILL.md`: say it runs by hand, delete the headless stop and all job wording, write the new `upload_incomplete` line, and fix the closing note (AC-3).
- `EXPERIENCE.md`, `backend/tests/helpers.py`: change the Failed-reasons note, header and row, and the `failing_reasons` header (AC-3).
- `docs/dropbox-backup.md`, `README.md`: remove the job, and add the one Uninstalling note for a Mac that had it (AC-4).
- The tests listed in the Code Map: update or delete them, then un-skip the ATDD leaves (AC-5).

**Acceptance Criteria:**
- Given the `bookvie` CLI, when `bookvie autobackup install`, `uninstall` or `run` is run, then argparse gives its usage error, and `cli.py` has none of the job's code.
- Given `create_app` and `views/backup`, when the app is created and the view is read, then there is no `launchd_probe`, nothing runs `launchctl`, and the view is `lastExportAt` only (with `api:gen` regenerated). The `autoBackup` group, `record_backup_upload` and `unchangedSinceUpload` tests pass unchanged.
- Given the skill, when it is read, then it says it runs by hand and never mentions launchd, 09:00, `claude -p` or a headless run. The `upload_incomplete` line reads "Failed: the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again.", and EXPERIENCE.md and `failing_reasons` match it.
- Given the guide and the README, when this story lands, then they hold no install step, no daily-job troubleshooting and no `autobackup` command. How it works describes a run by hand, and Uninstalling has the one old-job note.
- Given the tests, when `npm run check` runs, then `test_autobackup.py` is gone, no test other than `test_morning_job_removed.py` names launchd or the `autobackup` command, and the check is green.

### Review Findings

Code review of 2026-11-23, in a new session, on `08bb1ad..5c1b9ef`, with five layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor and spine-check. There were 19 findings: 0 decision-needed, 0 patch, 1 defer and 18 rejected. No patch was applied, so the full `npm run check` didn't need re-running. No AC needs a manual run: all five are covered by tests.

- [x] [Review][Defer] AD-22 "Causes" still says "the UX's Failing line", while EXPERIENCE.md and `failing_reasons` now use the header `After "failed *when* · "` [`ARCHITECTURE-SPINE.md:360`] — deferred: spine drift, reconciled before the next epic. It was already logged in `deferred-work.md` by the build ("Spine drift (AD-22 Causes)"), so no second entry was added.

**Rejected:**
- `false` (blind) The guide's "uses only its four MCP tools and never `restore_backup`" is now unenforced. The guide says MCP tools, which is true: step 1's Bash calls only start bookvie. The skill's "only four tools" sentence is unchanged since 13.4, which was already a run by hand.
- `low` (blind) Step 1 has no time limit when it polls a bookvie it started. That text is unchanged since 13.4 and matches the other bookvie skills, and the session is interactive, so the user can interrupt.
- `low` (blind) The closing note doesn't name step 1's stops. The note never listed them, even before this diff, and step 1 gives each stop's line in place, so it doesn't mislead.
- `false` (blind) The clause "since the skill is run by hand" in step 1 is redundant, and the test that matches it is vacuous. The clause states the reason step 1 may run shell commands (AC-3), and the leaf pins that statement. No behaviour is lost.
- `low` (blind+acceptance) The Uninstalling `rm -r` and `bootout` print errors when the job or files are already gone. The build's review patched this with `rm -f` and the "that's fine" sentence, and the policy removed the only installed job on 2026-11-22.
- `low` (blind+edge) The old-job cleanup is only under Uninstalling, with no pointer from Setup, and a loaded job would fail its runs. AC-4 places the note there, and the only Mac that had the job lost it to admin policy on 2026-11-22 (sprint change §1), so no Mac runs it.
- `low` (blind) "Daily copies" could be read as the last 3 calendar days. "Daily backup" names the file kind (one file per day), and the guide says the oldest daily backups beyond 3 are deleted. The build's review rejected the same point.
- `low` (blind) The guide doesn't say how often to back up or when the last upload was. That isn't in the intent, and Story 13.6 adds the Backup page line.
- `false` (blind) The Auto Run Result tally disagrees with the triage log. The duplicate edge patch row was grouped with the blind patch, giving 2 patch entries. The fix would edit the spec under review anyway.
- `low` (blind) The UX examples use 09:0x times. They are pre-existing illustrative times outside this diff and imply nothing about a schedule.
- `false` (blind) The test docstrings imply a headless path. "Falls back" means step 1 falls back to starting bookvie when `get_app_info` doesn't answer, and `SKILL_TOOLS` still cites AR51.
- `false` (blind) `deferred-work.md` ends with a blank line. Markdown renders the same, and nothing reads that file byte for byte.
- `false` (blind) The guide's intro "which you run by hand" is ambiguous. It can't attach to a folder, and "so you see a run work" still gives the first run its purpose.
- `false` (acceptance) The step 6 intro was reworded outside the allowed exceptions. The constraint covers steps 2 to 5 and the report lines, and step 6's intro is neither. AC-3 requires removing the "auto-backup" wording.
- `false` (acceptance) `epic-13-context.md` was added outside the Code Map. The Auto Run Result records it, and it is consistent with the sprint change.
- `low` (edge) A refused Bash prompt in step 1 has no outcome line. AC-3 removes that stop on purpose, and a refusal is the user's own choice in an interactive session. The build's review rejected the same point.
- `false` (blind) The Uninstalling intro "remove everything the setup added" conflicts with the old-job block. That block opens with "If this Mac had the old daily job installed", so it is clearly conditional.
- `false` (verification-gap) No gap was filed: the layer reported none.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 20 findings — high 0, medium 0, low 14, false 6, maybe-false 0
- findings:
  - `false` `reject` (blind) sprint-status still `backlog` and epic-13-context gives 13.5 no status — Finalize sets `review` in this commit; the epic context is not a status tracker.
  - `false` `reject` (blind) the spec records nothing about the build — this log and `## Auto Run Result` record it, written in Finalize.
  - `low` `reject` (blind) README's "Daily backup to Dropbox, and restore." heading implies a daily run — "daily backup" names the file kind (one per day, 3 daily copies kept); 13.1's leaf pins the heading; unlikely to mislead, and the job sentence is gone.
  - `low` `defer` (blind) "daily backup run" in tool descriptions and docstrings — pre-existing from 13.3; descriptions are copied from epics.md and pinned; deferred.
  - `low` `reject` (blind) the old-job note is only under Uninstalling — AC-4 puts it there; the only Mac that had the job lost it to policy on 2026-11-22 (sprint change §1); the fix is a new guide section.
  - `low` `patch` (blind) the Uninstalling commands error when the job or files are already gone — plist line is now `rm -f`, and a sentence after the block says such messages are fine.
  - `low` `reject` (blind) step 1 lost its stop for a run without a shell — AC-3 explicitly removes the headless stop; in an interactive session a refused permission prompt is the user's own choice and Claude Code reports it.
  - `low` `reject` (blind) the guide doesn't say how often to back up — not in the intent; Story 13.6 adds the Backup page line that shows when the last upload was.
  - `low` `patch` (blind) the guide's own How-it-works leaf no longer checks a run by hand — added `"/bookvie-backup"` and `"by hand"` assertions in `test_dropbox_backup_guide.py`.
  - `false` `reject` (blind) `_FAILING_ROW`/`failing_reasons` keep the old name; "Dropbox backup line" doesn't exist yet — AC-3 names `failing_reasons` and keeps it; EXPERIENCE.md already has the "Dropbox backup line" section this docstring cites.
  - `low` `defer` (blind) EXPERIENCE.md Failed-reasons rows mix capital and lowercase starts — pre-existing rows; deferred to 13.6, which renders them.
  - `low` `reject` (blind) Code Map line numbers go stale — the fix edits this build's spec.
  - `false` `reject` (blind) cleanup on Oleg's Mac isn't recorded — sprint-change-proposal-2026-11-23 §1 records that the 2026-11-22 install vanished; there is nothing left to clean, and no AC asks for a manual run.
  - `low` `reject` (edge) old-job note belongs in Setup too — same root cause and reason as the blind finding above (AC-4 places it in Uninstalling).
  - `low` `patch` (edge) bootout/rm print errors on a partly installed job — same entry as the blind patch: `rm -f` and the "that's fine" sentence.
  - `low` `reject` (edge) no defined outcome when the user denies the start's Bash prompt — same as the blind step-1 finding: AC-3 removes the stop.
  - `false` `reject` (intent) tracking file and spec disagree on status — same as the first row; Finalize sets `review`.
  - `false` `reject` (intent) AC-5's "no test refers to…" is narrowed to all tests but `test_morning_job_removed.py` — AC-1 and AC-2 require tests that name `autobackup` and `launchd_probe` to check they're gone, so AC-5 can't be absolute; the ATDD checklist records this reading for code review.
  - `low` `reject` (intent) the skill and docs are checked as text, not run — skills are agent instructions, and text checks are the project's method for them (12.7, 13.4); no harness runs a skill.
  - `low` `defer` (spine-check) AD-22 Causes still says "the UX's Failing line" — spine drift, deferred per AGENTS.md.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why go back to `c3cc1a8^` for product code:** `git log c3cc1a8^..HEAD -- backend/bookvie` lists only the two old 13.5 commits (`c3cc1a8`, `36589e1`). The pre-13.5 content is therefore exactly the code without the job. It isn't a `git revert` of the commits, which the sprint change ruled out, because that would also revert the docs and the review records.
- **AC-5 and `test_morning_job_removed.py`:** that module names launchd and `autobackup` only to check they're gone, so its scan leaves out that one file (the ATDD checklist's reading).

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_morning_job_removed.py tests/test_backup_skill.py tests/test_dropbox_backup_guide.py tests/test_views.py tests/test_export.py tests/test_agent_backup_upload.py tests/test_agent_backup_upload_follow_ups.py`: expected all pass, none skipped in `test_morning_job_removed.py`.
- `npm run check`: expected green, including `check:api`'s byte compare of `schema.d.ts`.

## Auto Run Result

Status: in-review

**Summary.** The 09:00 launchd job is gone. `bookvie autobackup` is no longer a command, `create_app` has no `launchd_probe`, and `views/backup` returns `lastExportAt` only, with `schema.d.ts` regenerated. The skill, guide, README entry and EXPERIENCE.md's Failed-reasons table now describe a run by hand. The job's tests are deleted or trimmed, and the 5 ATDD leaves pass with their assertions unchanged.

**Files changed:**
- `backend/bookvie/cli.py`, `http/app.py`, `http/api.py`, `views/backup.py`, `views/models.py`, `views/__init__.py`: each is back to its content at `c3cc1a8^`. `git diff c3cc1a8^` on these files is empty.
- `frontend/src/api/generated/schema.d.ts`: regenerated with `api:gen`. `AutoBackupView` and `autoBackup` are gone.
- `.claude/skills/bookvie-backup/SKILL.md`: the skill runs by hand. The headless stop is gone, `upload_incomplete` has the new line, and the closing note is trimmed.
- `docs/dropbox-backup.md`: no install step and no daily-job troubleshooting. How it works and the stray lines describe a run by hand. Uninstalling has the one old-job note, with commands that are safe when the job is already gone.
- `README.md`: the `bookvie-backup` entry no longer has its job sentence.
- `EXPERIENCE.md`: the Pending note is gone. The header is `After "failed *when* · "` and the `upload_incomplete` row is new.
- `backend/tests/helpers.py`: `failing_reasons` reads the new header.
- `backend/tests/test_autobackup.py`: deleted.
- `test_views.py`, `test_export.py`: the view's new shape.
- `test_dropbox_backup_guide.py`: the 13.5 block is deleted, and How it works checks a run by hand.
- `test_backup_skill.py`: the headless leaf is deleted, and the closing-note regex and docstrings are fixed.
- `test_morning_job_removed.py`: un-skipped.
- `epic-13-context.md`: recompiled after the sprint change. `sprint-status.yaml`: `review`. `deferred-work.md`: this pass's 3 deferrals.

**Review findings:** 20 in all.
- 2 patches, both low. One makes the Uninstalling commands safe when the job is already gone. The other restores the "by hand" check in the guide's own leaf.
- 3 deferred:
  - AD-22 spine drift ("Failing line").
  - "Daily backup run" wording in the tool descriptions and docstrings.
  - EXPERIENCE.md row casing, for 13.6.
- 15 rejected, each with its reason in the Review Triage Log.

**Follow-up review recommended:** false. 0 high and 0 medium patched, 2 low.

**Verification:**
- The spec's pytest set gave 110 passed, with none skipped in `test_morning_job_removed.py`.
- `npm run check` passed before and after the patches: check:api passed (including the byte compare of `schema.d.ts`), check:py passed, check:e2e gave 800 passed, and check:smoke passed.
- The I/O matrix rows are covered by:
  - AC-1's leaf.
  - `test_views.py` and AC-2's leaf.
  - `test_agent_backup_upload*.py`, unchanged.
  - AC-4's leaf.

**Residual risks:**
- The skill's new step 1 has no tested behavior for a refused permission prompt. That's by design (AC-3).
- The ATDD module is the only test that names launchd. Code review should confirm that reading of AC-5.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
