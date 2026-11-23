---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-23'
storyId: '13.5'
storyKey: '13-5-take-out-the-morning-job'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-135-take-out-the-morning-job'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-5-take-out-the-morning-job.md'
generatedTestFiles:
  - 'backend/tests/test_morning_job_removed.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 13.5 "Take out the morning job"; Story 13.4 note)'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Dropbox backup line, Failed reasons table)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md (format, red-run precedent)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-backup/SKILL.md, docs/dropbox-backup.md, README.md (AI skills)'
  - 'backend/bookvie/cli.py, backend/bookvie/http/app.py, backend/bookvie/http/api.py, backend/bookvie/views/backup.py, backend/bookvie/views/models.py, frontend/src/api/generated/schema.d.ts'
  - 'backend/tests/test_backup_skill.py, test_dropbox_backup_guide.py, test_views.py, test_export.py, test_autobackup.py, helpers.py, test_agent_backup_upload*.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the bookvie CLI, when bookvie autobackup install, uninstall or run is run, then it is not a command (argparse''s usage error); cli.py has no launchd label, plist writer, launchctl seam, claude runner or tool-list constants.' }
  - { id: AC-2, idSource: generated, text: 'Given create_app and views/backup, when the app is created and views/backup is read, then create_app takes no launchd_probe keyword, nothing runs launchctl, and views/backup carries only lastExportAt (AutoBackupView is gone; api:gen regenerated); and local-state.json''s autoBackup group, record_backup_upload and export_backup''s unchangedSinceUpload behave exactly as before (their tests pass unchanged).' }
  - { id: AC-3, idSource: generated, text: 'Given the bookvie-backup skill, when it is read, then its description and body say it runs by hand (/bookvie-backup) and never mention launchd, 09:00, claude -p or a headless run; the headless stop in step 1 is gone; the upload_incomplete line reads "Failed: the last upload didn''t finish. Nothing in Dropbox was deleted; run /bookvie-backup again."; its frontmatter tools, steps and other report lines are unchanged; and in the same change EXPERIENCE.md''s Failed-reasons table drops its "Pending Story 13.5" note, its header becomes After "failed *when* · ", its upload_incomplete row takes the new wording, and tests/helpers.py''s failing_reasons reads the new header.' }
  - { id: AC-4, idSource: generated, text: 'Given docs/dropbox-backup.md and the README, when this story lands, then the guide has no "Install the daily job" step and no "Troubleshooting the daily job" section; "How it works" describes a run started by hand; "Uninstalling" has no job lines and has one note for a Mac where the job was installed before (launchctl bootout gui/$(id -u)/com.bookvie.autobackup, then delete ~/Library/LaunchAgents/com.bookvie.autobackup.plist and ~/Library/Logs/bookvie/); README → AI skills no longer says the daily job runs the skill; and the docs pytest passes with no autobackup command in the guide.' }
  - { id: AC-5, idSource: generated, text: 'Given the tests, when npm run check runs, then backend/tests/test_autobackup.py is gone, no test refers to the autobackup command, launchd or launchd_probe (the stored autoBackup group is unchanged), and the check is green.' }
---

# ATDD Checklist: Story 13.5 Take out the morning job

## Preflight

- **Stack:** `fullstack`, auto-detected (pytest and Playwright in place). The story removes a CLI command, an API field, and skill and docs wording. The frontend never read `autoBackup` (only `schema.d.ts` has it), so there is no UI and every leaf is pytest.
- **Story:** `epics.md` Story 13.5 (rewritten by `sprint-change-proposal-2026-11-23.md`) has 5 Given/When/Then criteria with no ids, numbered AC-1 to AC-5 in source order. `sprint-status.yaml` reads `13-5-take-out-the-morning-job: backlog`. There's no spec file yet; the proposal names it `spec-13-5-take-out-the-morning-job.md`, which the build writes. It isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`. No Pact.
- **What exists today (commit `95323af`):** `cli.py` has the `autobackup install|uninstall|run` subcommand (the parser's only subcommand) and its code. `create_app(launchd_probe=…)` and `views/backup` return `{lastExportAt, autoBackup: {installed}}`. The skill, the guide (Setup step 5, Troubleshooting the daily job, How it works, Uninstalling, and stray "09:00" lines) and README describe the job. `test_autobackup.py` tests it.
- **Worktree:** this run happened in the git worktree `hogback-creosote`, not in the shared checkout. The build has to see this module and checklist. Land them on `master` first, or run the build in this worktree.

## Generation Mode

**AI generation**, sequential, in this session. There's no UI, so nothing was recorded.

## Test Strategy

This is a removal story. Each leaf checks that something is gone, so each first assertion fails on today's code. Every leaf lives in one new module, `backend/tests/test_morning_job_removed.py`. It's the only test that names the removed things, and AC-5's scan leaves out that one file.

| AC | Level | Priority | Leaf (first assertion in bold) | Why |
|---|---|---|---|---|
| AC-1 | Unit (CLI parser) | P0 | `test_bookvie_autobackup_is_not_a_command_and_cli_has_none_of_the_jobs_code`. **`_parses(parse_args, ["autobackup", a])` is `"exit 2"` for `install`, `uninstall` and `run`.** Then stderr is argparse's usage error: it holds `usage: bookvie`, `error:` and `autobackup`. Either "invalid choice" or "unrecognized arguments" passes, since `autobackup` was the only subcommand and the build may drop the subparsers. `cli` has none of `JOB_NAMES`: the label, the tool lists, `LAUNCHCTL`, `launchd_job_installed`, `_launchctl`, `_launchd_domain`, `_launch_agent_plist`, `_autobackup_*`, `_refuses_dev`, `_stop`, `_wait_for_health`, `_now` and `plistlib`. `cli.py`'s source doesn't contain `autobackup`, `launchd`, `launchctl`, `plist` or `claude`, case-insensitively. | The command is the criterion. The names and words catch leftover dead code. |
| AC-2 | API | P0 | `test_views_backup_carries_only_last_export_and_nothing_asks_launchd`. **`GET /api/views/backup` (via `api_client`) is exactly `{"lastExportAt": None}`.** Then `create_app`'s signature has no `launchd_probe`, and `bookvie.views` has no `AutoBackupView`, neither as an attribute nor in `__all__`. No `.py` under `backend/bookvie` contains `launchd` or `launchctl`, case-insensitively. `schema.d.ts` has neither `AutoBackupView` nor `autoBackup`, which needs `api:gen`. | The view's shape is the criterion. The "behaves exactly as before" half is covered by the existing `test_agent_backup_upload*.py` and `test_export.py` leaves, which must pass unchanged. |
| AC-3 | Text | P1 | `test_the_backup_skill_says_it_runs_by_hand_and_never_mentions_the_morning_job`. **The skill, lower-cased, contains none of `launchd`, `09:00`, `claude -p` and `headless`.** Then the description (the frontmatter before `allowed-tools:`) and the body each hold `/bookvie-backup` and "by hand". "can't run shell commands" is gone with the headless stop. The exact line `` - `upload_incomplete`: "Failed: the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again." `` is there. `allowed-tools` is still the four tools. EXPERIENCE.md has no "Pending Story 13.5", has the header `| Cause | After "failed *when* · " |`, and `failing_reasons()[1]` is the new wording. | The forbidden words are the criterion. EXPERIENCE.md and the helper change together, as the AC says. |
| AC-4 | Docs | P1 | `test_the_guide_and_readme_describe_a_run_by_hand_and_how_to_remove_an_old_job`. **No heading matches "Install the daily job".** Then no heading matches "Troubleshooting the daily job", and `guide_commands` holds no `autobackup` command. The text has no "bookvie autobackup" and no "09:00" anywhere. "How it works" holds `/bookvie-backup` and "by hand", and none of `launchd`, `claude -p` or `headless`. "Uninstalling" holds the `launchctl bootout …` line, the plist path and `~/Library/Logs/bookvie/`. `launchctl bootout` appears exactly once in the guide. Outside "Uninstalling", the guide has no "launchd" and no "daily job". README → AI skills' `bookvie-backup` entry has no "09:00" and no "job". | The removed setup step is the criterion. |
| AC-5 | Repo scan | P1 | `test_no_test_refers_to_the_autobackup_command_or_launchd`. **`backend/tests/test_autobackup.py` doesn't exist.** Then no test file contains `[Ll]aunchd` or a lower-case `autobackup`. The files scanned are `backend/tests/**/*.py`, `frontend/e2e/**/*.ts` and `frontend/src/**/*.test.ts(x)`, except this module. The camel-case `autoBackup` (the stored group) is still allowed. | `npm run check` green is the build's final step, not a leaf. |

**Primary branch per criterion:** AC-1 the parser refuses `autobackup`. AC-2 the view's shape. AC-3 the forbidden words in the skill. AC-4 no install step. AC-5 `test_autobackup.py` gone.

**My readings (for the review to confirm):**
- **AC-5 vs. this module.** "No test refers to … `launchd`" is read as "no test exercises the job". The absence checks have to name what they check, so the scan leaves out `test_morning_job_removed.py` (`_THIS_MODULE`), and the module's docstring says why.
- **AC-4 "09:00" and "daily job".** The AC lists the two sections and How it works. The leaf also bans "09:00" anywhere in the guide, and "launchd" or "daily job" outside Uninstalling. The guide has stray job lines outside those sections: line 7's "The daily 09:00 job runs the same skill.", "Your first run"'s "before the daily job takes over", and the `upload_incomplete` entry's "or leave it to the next 09:00 run" (the probe caught this one). The story's "So that bookvie has no … docs … for a job" covers them.
- **AC-1 "claude runner".** That's `_autobackup_run` and the helpers only it uses: `_stop`, `_wait_for_health`, `_now` and `_refuses_dev`. None of them is called outside the job today (grep).

**Open for the build (not pinned):**
- `http/app.py`'s `_is_real_backups_folder` may exist only to gate the probe. If so, remove it. Nothing pins it.
- Whether the parser keeps an empty subparsers group. Both outcomes pass AC-1.
- The skill's other "auto-backup" wording ("so the Backup page can say whether auto-backup works", "the Backup page's auto-backup line") is Story 13.6's Dropbox backup line. 13.5 doesn't pin it, and it's fine to fix it now.

## Existing leaves this story changes (for the build)

These pass today and pin the job. The build updates or deletes them in the same change:

- `test_autobackup.py`: delete it (AC-5).
- `test_views.py`'s three `test_backup_view_*` leaves and `test_export.py:546` expect `"autoBackup": {"installed": False}`. They become `{"lastExportAt": …}` only (AC-2).
- `test_dropbox_backup_guide.py`:
  - `test_the_guide_installs_and_uninstalls_the_job_and_troubleshoots_launchd` and its `LAUNCHD_LOGS` and `_entries` helpers: delete them. If the Uninstalling part (`claude mcp remove`, Keychain, revoke) is still wanted, keep it without the job.
  - `test_the_guide_says_how_the_backup_works_…` requires "09:00", "launchd" and "claude -p" in How it works. Drop those three and keep `` `--dev` ``, export, verify, delete, 3, skip and "never upload(s)".
  - The module docstring.
- `test_backup_skill.py`:
  - `test_headless_with_bookvie_not_running_…`: delete it.
  - `test_each_failed_line_says_failed_once_…`'s closing-note regex: drop "and the headless stop in step 1".
  - The module docstring and `SKILL_TOOLS`' docstring mention `claude -p` and 13.5's headless run.
  - Comment line 282 ("the headless run never starts bookvie").
- `helpers.py`'s `failing_reasons`: the header string becomes `| Cause | After "failed *when* · " |`, and its docstring changes too (AC-3). `test_backup_skill.py`'s AC-3 leaf then reads the new `upload_incomplete` reason, so the skill line and the EXPERIENCE row must change together.
- `test_dropbox_backup_guide.py::test_the_guide_says_how_to_restore…` still requires "claude -p" in Restoring. That stays: it's about restore clients, not the job. AC-5's scan doesn't look for "claude -p".

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **AC-2:** re-run `test_agent_backup_upload.py`, `test_agent_backup_upload_follow_ups.py` and `test_export.py`, except the one `views/backup` assertion above, unchanged. That shows the `autoBackup` group, `record_backup_upload` and `unchangedSinceUpload` are untouched.
- [ ] **AC-2:** `check:api` byte-compares the regenerated `schema.d.ts`, which `npm run check` runs.
- [ ] **AC-4:** the existing guide-commands leaf (`test_the_guide_sets_up_…_commands_match_the_cli`) still parses every remaining `bookvie`/`bookvie-dropbox` command after the removal.

## Helper probes

Helpers reused: `api_client`, `EXPERIENCE_MD`, `failing_reasons` (`helpers.py`); `_skill`, `_body`, `_frontmatter`, `allowed_tools`, `SKILL_TOOLS` (`test_backup_skill.py`); `section`, `headed`, `guide_commands`, `_parses`, `GUIDE`, `README`, `BACKUP_SKILL_LINK` (`test_dropbox_backup_guide.py`). They live only in those modules, so they're imported rather than copied, as 13.4 did.

Helpers added:
- `_test_files()` and `_REMOVED_IN_TESTS` (`test_morning_job_removed.py`) list the repo's test files and match the removed names. No existing helper scans test files.
- `_flat` (`test_morning_job_removed.py`) is a one-line whitespace flattener, like 13.4's `_flat` in `test_backup_skill.py`. I wrote my own rather than import a private one-liner. Merge them if the review prefers.

**Probes** (temporary `backend/tests/test_atdd_13_5_probe.py`, `uv run pytest -q -p no:cacheprovider tests/test_atdd_13_5_probe.py`, removed with `rm`). **16 passed.** It took three runs:
- **Run 1** failed on the known-good guide. The AC-4 leaf correctly found "the next 09:00 run" in the `upload_incomplete` entry, which my sample hadn't fixed. That was a sample fix, and the real guide has the same line for the build.
- **Run 2** failed on the README variant: the probe rewrote the patched temp README with itself. That was a probe bug.
- **Run 3:** all 16 passed. No leaf changed after its probe.

What the probes showed:
- **AC-3, known good.** A copy of today's skill with the job lines rewritten, plus EXPERIENCE.md with the new header, row and no note, read by a new-header `failing_reasons`, passes the leaf. **5 broken variants each fail it:** "headless" re-added, the old `upload_incomplete` ending, the "Pending Story 13.5" note back, `Bash` added to `allowed-tools`, and "by hand" dropped from the description.
- **AC-4, known good.** Today's guide with Setup step 5 and Troubleshooting the daily job cut, How it works and the stray lines rewritten, and Uninstalling's job lines replaced by the bootout note, plus the README entry without its job sentence, passes the leaf. **6 broken variants each fail it:** an "Install the daily job" heading, `bookvie autobackup uninstall` back, "launchd" in How it works, today's README, the plist path missing from the note, and "daily job" outside Uninstalling.
- **AC-5 scan.** `_test_files()` includes `test_autobackup.py`, `test_views.py`, e2e `.ts` and `src` `.test.ts` files, and leaves out this module. Today it flags `test_autobackup.py` and `test_dropbox_backup_guide.py`. `_REMOVED_IN_TESTS` matches `launchd_probe=` and `bookvie autobackup run`, and doesn't match `{"autoBackup": …}` or `AUTO_BACKUP_KEY`.
- **AC-1 usage error.** A parser with no subcommands (prog `bookvie`) refuses `autobackup install` with exit 2, and its stderr holds `usage: bookvie`, `error:` and `autobackup`. Today's `cli.parse_args` accepts it (`None`), and `--port x` gives `exit 2`, so `_parses` tells the two apart.
- **AC-1/AC-2 reads.** `inspect.signature(create_app)` lists `data_dir` and, today, `launchd_probe`. Every name in `JOB_NAMES` is on `cli` today, and a made-up name isn't.

Shipped numbers: none quoted (no UI).
Storage keys: no new localStorage key.
Fractional borders: none (no UI).
Render-before-read: no leaf reads a page. Each file is read whole, and the API read comes after its request.

## TDD Red Phase

Generated: 5 pytest leaves in `backend/tests/test_morning_job_removed.py`, all `@pytest.mark.skip(reason=RED_13_5)`, each with a comment above it saying when to un-skip.

The red run came after the probes last passed. It used a throwaway un-skipped copy, `tests/test_morning_job_removed_redrun_probe.py`, removed with `rm`. **5 failed**, each at its first assertion:
- **AC-1:** `refused` is `{install: None, uninstall: None, run: None}`, because the command still parses.
- **AC-2:** the view is `{lastExportAt: None, autoBackup: {installed: False}}`.
- **AC-3:** the skill mentions `launchd`, `09:00`, `claude -p` and `headless`.
- **AC-4:** the "5. Install the daily job" heading.
- **AC-5:** `test_autobackup.py` exists.

Afterwards the related suites (`test_morning_job_removed.py`, `test_backup_skill.py`, `test_dropbox_backup_guide.py`, `test_views.py`, `test_autobackup.py`, `test_agent_backup_upload.py`, `test_agent_backup_upload_follow_ups.py`) gave **113 passed, 5 skipped**. `uv run ruff format --check` and `ruff check` are clean on the new module. `git status` lists only the new module (and this checklist), with no `*probe*` file.

## For the build

1. `cli.py`: remove the `autobackup` subcommand and all the job's code and imports (`plistlib`, and `shutil` or `subprocess` if nothing else uses them). Drop `launchd_probe=launchd_job_installed` from the `create_app` call.
2. `http/app.py` and `http/api.py`: remove `launchd_probe`, `app.state.launchd_probe` and the probe reader. In `views/models.py`, `views/backup.py` and `views/__init__.py`, remove `AutoBackupView` and `BackupView.auto_backup`. Then run `npm --prefix frontend run api:gen`.
3. The skill: rewrite the description, the intro paragraph, step 1 (delete the headless stop) and the `upload_incomplete` line, and drop "and the headless stop in step 1" from the closing note. In the same change, update EXPERIENCE.md's table (note, header, row) and `helpers.failing_reasons`' header.
4. The guide: delete Setup step 5 and "Troubleshooting the daily job". Rewrite How it works's opening and its "next morning" line, line 7, "Your first run", the `upload_incomplete` entry's 09:00 ending, and Uninstalling, which gets the one bootout note. In the README, delete the AI skills entry's "The daily 09:00 job runs the same skill."
5. Tests: the list under "Existing leaves this story changes", then un-skip the 5 leaves.
6. Spine: the correct-course pass already rewrote AD-22 ("No schedule"), so nothing here should be spine drift.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove a leaf's skip when its task starts. Suggested order: AC-1, AC-2, AC-3, AC-4, then AC-5 last, since it needs every other test cleaned.
2. Run `cd backend && uv run pytest -q tests/test_morning_job_removed.py tests/test_backup_skill.py tests/test_dropbox_backup_guide.py tests/test_views.py tests/test_export.py`.
3. Finish with `npm run check`.
