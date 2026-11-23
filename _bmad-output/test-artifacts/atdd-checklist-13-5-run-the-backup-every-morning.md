---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-22'
storyId: '13.5'
storyKey: '13-5-run-the-backup-every-morning'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-135-run-the-backup-every-morning'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-5-run-the-backup-every-morning.md'
generatedTestFiles:
  - 'backend/tests/test_autobackup.py'
  - 'backend/tests/test_dropbox_backup_guide.py (AC-8 leaf)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 13.5; AR52, AR53, AR54)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D6, D10, D12, §4 13.5, §6)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-22 The schedule, Auto-backup state; Config; source tree cli.py and http/)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-4-back-up-to-dropbox-with-one-skill.md (format)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-backup/SKILL.md (allowed-tools)'
  - 'docs/dropbox-backup.md'
  - 'backend/bookvie/cli.py, backend/bookvie/instance.py, backend/bookvie/http/app.py (create_app), backend/bookvie/http/api.py (views/backup), backend/bookvie/views/backup.py, backend/bookvie/views/models.py (BackupView)'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, test_cli.py, test_views.py, test_backup_skill.py, test_dropbox_backup_guide.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given bookvie autobackup install, run in the main checkout (the folder holding .claude/skills/bookvie-backup/SKILL.md), when it runs (with launchctl behind a seam in tests), then it writes ~/Library/LaunchAgents/<label>.plist (the label one constant, shared with the probe) and loads it with launchctl bootstrap; and the plist runs bookvie autobackup run by absolute path at 09:00 (StartCalendarInterval), sets WorkingDirectory to the checkout, sets PATH to include the folders of the resolved bookvie, bookvie-dropbox and claude, and sends output to ~/Library/Logs/bookvie/autobackup.log and autobackup.err.log; and installing over an existing job replaces it, resolves every path again and reloads it.' }
  - { id: AC-2, idSource: generated, text: 'Given a linked git worktree, a folder without the skill, --dev, or a claude, bookvie or bookvie-dropbox that can''t be found, when install runs, then it refuses with a message naming the cause and writes nothing.' }
  - { id: AC-3, idSource: generated, text: 'Given bookvie autobackup uninstall, when it runs, then it unloads the job with launchctl bootout and removes the plist; with no job installed it says so and succeeds.' }
  - { id: AC-4, idSource: generated, text: 'Given bookvie autobackup run, when /api/health doesn''t answer, then it starts bookvie --no-browser, waits for health, runs the resolved claude -p "/bookvie-backup" with --allowedTools and --disallowedTools, stops the server with SIGTERM only because it started it, and exits with claude''s status; and when bookvie is already running, it leaves it running.' }
  - { id: AC-5, idSource: generated, text: 'Given the generated plist and the claude arguments, when a test reads them, then --allowedTools is the one constant in cli.py, holds MCP tool names only (never Bash in any form) and equals the tools in bookvie-backup''s frontmatter; and --disallowedTools names mcp__bookvie__restore_backup and mcp__bookvie-dev__restore_backup.' }
  - { id: AC-6, idSource: generated, text: 'Given views/backup on the server whose backups folder is ~/bookvie-backups, when it is read, then it carries whether the job is installed, from create_app''s launchd_probe seam: only the exit status of launchctl print gui/<uid>/<label> with a short timeout; any error, a timeout, or a system that isn''t macOS reads as not installed; and a --dev server, or a server on another library, never runs the probe.' }
  - { id: AC-7, idSource: generated, text: 'Given the real Mac, when Oleg installs the job by following the guide, then lets it run at 09:00 once with the Mac awake and once after waking it from sleep, then both runs back up with no permission prompt, and the spec records them and the log lines (manual verification).' }
  - { id: AC-8, idSource: generated, text: 'Given the guide, when this story lands, then docs/dropbox-backup.md has install, uninstall (with claude mcp remove, deleting the Keychain item and revoking the app in Dropbox), the log location, running the job now with launchctl kickstart, and the launchd troubleshooting entries: claude not found on launchd''s PATH after a reinstall or move, a tool missing from --allowedTools, Claude Code signed out, a moved checkout (install again), and a Mac asleep at 09:00 (runs on wake); and the docs pytest covers the new commands.' }
---

> **Superseded 2026-11-23** by `sprint-change-proposal-2026-11-23.md`: the morning job was dropped; Story 13.5 is now "Take out the morning job". Kept as history.

# ATDD Checklist: Story 13.5 Run the backup every morning

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest and Playwright are in place. The story adds CLI subcommands, a seam on `create_app`, one field on `views/backup` and docs. There is no UI (13.6 draws the line), so every leaf is pytest.
- **Story:** `epics.md` Story 13.5 has 8 Given/When/Then criteria with no ids. They're numbered AC-1 to AC-8 in source order (the registry above). `sprint-status.yaml` reads `backlog`. It isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`. No Pact.
- **What exists today:** 13.4's `bookvie-backup` skill is done. Its `allowed-tools` lists the four MCP tools. `cli.py` has no subcommands. `parse_args` is flags only, and `main(["autobackup", …])` is an argparse usage error (exit 2). `create_app` has no `launchd_probe`. `views/backup` is `{lastExportAt}`. The guide has no install, uninstall or launchd entries.
- **Oleg's decision (2026-11-22):** the AC says `views/backup` "carries whether the job is installed" and names no field. It's **`autoBackup: {installed: bool}`**. 13.6 adds its fields (`state`, `offReason`, …) to the same object and may keep `installed`. On `--dev` and on another library it's `false`, because the probe never runs there.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 13.4. Nothing is recorded, because there is no UI.

## Test Strategy

The seams, chosen so that no test can touch the real launchd, the real `claude` or port 8765:

- **`launchctl`** runs through `subprocess.run`. An autouse fixture replaces `subprocess.run` with a recorder that answers any `launchctl` call (by program basename) without running it, and passes every other command to the real `run`. It also replaces `subprocess.Popen` with a guard that refuses to start a `launchctl`, so a build that started it any other way fails closed instead of loading a real job.
- **`claude`, `bookvie`, `bookvie-dropbox`** are fake `sh` scripts in three separate temporary folders on `PATH`, next to `/usr/bin:/bin:/usr/sbin:/sbin` for `git` and `sleep`. Install resolves them from `PATH`, and so does the run. The fake `claude` writes its argv and whether the fake server was up, then exits with `FAKE_CLAUDE_STATUS`. The fake `bookvie` writes its argv and pid, traps SIGTERM into a marker file, and loops.
- **Health** is `bookvie.instance.probe_health`, monkeypatched, because the real 8765 may be Oleg's running bookvie.
- **The checkout** is a real `git init` in `tmp_path`, holding a committed copy of the skill. The linked worktree is a `git worktree add` of it. Both use temporary repos, never the shared checkout.
- **`HOME`** is temporary (conftest), so `~/Library/LaunchAgents` and `~/Library/Logs` are under it.

| AC | Level | Priority | Leaf (first assertion in bold) | Why |
|---|---|---|---|---|
| AC-1 | CLI integration | P0 | `test_install_writes_the_plist_and_bootstraps_it_and_installing_again_replaces_it` (`test_autobackup.py`). **`~/Library/LaunchAgents/` holds exactly one `.plist`.** Then: its name is `<AUTOBACKUP_LABEL>.plist` and its `Label` is the constant. `launchctl bootstrap gui/<uid> <plist>` was called. `ProgramArguments` is `[<resolved fake bookvie>, "autobackup", "run"]`, with an absolute first item. `StartCalendarInterval` is `{Hour: 9, Minute: 0}`. `WorkingDirectory` is the checkout. `EnvironmentVariables.PATH` holds all three fake folders. `StandardOutPath` and `StandardErrorPath` are `~/Library/Logs/bookvie/autobackup.log` and `autobackup.err.log`. Install exits 0. **Again:** `claude` is moved to a fourth folder and install runs again. There is still one plist, its `PATH` holds the new folder and not the old one, and the `launchctl` calls after the first install include a `bootout` before a `bootstrap`. | The criterion is the plist on disk, loaded. |
| AC-2 | CLI integration | P0 | `test_install_refuses_and_writes_nothing` (`test_autobackup.py`), parametrized over six cases: `worktree`, `no_skill`, `dev` (`bookvie --dev autobackup install`), `no_claude`, `no_bookvie`, `no_bookvie_dropbox`. **The refusal message names the cause.** The message is stderr without argparse's usage lines and without the `bookvie: ` prefix, so a red usage error can't pass by echoing `[--dev]` or `bookvie`. The causes are `worktree`, `bookvie-backup`, `--dev`, and the missing command as a whole word. Then: the exit code isn't 0, `~/Library` doesn't exist, and `launchctl` wasn't called. | One leaf, one assertion per cause. |
| AC-3 | CLI integration | P1 | `test_uninstall_boots_the_job_out_and_removes_the_plist_and_with_none_says_so` (`test_autobackup.py`). After an unasserted install: **a `launchctl bootout gui/<uid>…` call was recorded.** Then: the plist is gone and the exit code is 0. A second uninstall exits 0, and its stderr or stdout says the job isn't installed (`not installed`, `isn't installed` or `no … job`). | |
| AC-4 | CLI integration | P0 | `test_run_starts_bookvie_when_health_does_not_answer_runs_claude_and_stops_only_what_it_started` (`test_autobackup.py`). With health silent until the fake `bookvie` has started: **the fake `bookvie` got exactly `["--no-browser"]`.** Then: `claude` ran while that server was up, its argv holds `-p` followed by `/bookvie-backup`, `--allowedTools` and `--disallowedTools`, the fake `bookvie` had handled SIGTERM by the time `run` returned (no poll: `run` waits for the server it stopped), and `run` returned `claude`'s status (7). **Already running:** health answers at once. No `bookvie` is started, `claude` runs, and `run` returns its status (0). | The transition branch (it starts and stops a server) is primary; the already-running branch follows. |
| AC-5 | Unit + CLI | P0 | `test_the_headless_tool_lists_are_the_skills_tools_and_never_bash_or_a_restore` (`test_autobackup.py`). **`sorted(cli.AUTOBACKUP_ALLOWED_TOOLS)` equals `sorted(allowed_tools(SKILL))`.** Then: each name matches `^mcp__(bookvie\|bookvie-dropbox)__[a-z_]+$`, none mentions `bash` in any case, and the list has no duplicates. `set(cli.AUTOBACKUP_DISALLOWED_TOOLS)` is the two `restore_backup` names. In the real argv of `run`, `--allowedTools` equals the constant and `--disallowedTools` equals the two, with no `bash` anywhere, no `--dangerously-skip-permissions` and no `bypassPermissions`. The installed plist's bytes contain no `bash`. | AR53: the one constant, tied to 13.4's frontmatter. |
| AC-6 | API (create_app) + unit | P0 | `test_the_backup_view_carries_whether_the_job_is_installed_and_only_the_real_library_probes` (`test_autobackup.py`). On `create_app(backups_dir=~/bookvie-backups, launchd_probe=spy→True)`: **`GET /api/views/backup` has `autoBackup.installed is True`.** Then: a probe answering `False` gives `false`, and each read asks again. On `--dev`, on another backups folder, and with no backups folder, the view says `false` and the spy was never called. The default probe `cli.launchd_job_installed()` runs `launchctl print gui/<uid>/<AUTOBACKUP_LABEL>` with a `timeout` from 0 to 5 s. Exit 0 is `True`. Exit 113, `TimeoutExpired` and `OSError` are `False`. On a non-macOS `sys.platform` (and `platform.system()`) it's `False` and doesn't run. `cli.main` on a production start passes `launchd_probe=cli.launchd_job_installed` to `create_app`. | The seam and the gate are the criterion. The default probe's branches are the AC's own "any error, a timeout, not macOS". |
| AC-7 | Manual (Oleg) | P0 | No automated leaf, as in 13.4 AC-5. Oleg installs by the guide, then lets the job run at 09:00 twice: once with the Mac awake and once after waking it from sleep. Neither run may show a permission prompt. The spec records both runs and the log lines. The story stays in review until this is recorded. | Only the real launchd shows it. |
| AC-8 | Docs | P1 | `test_the_guide_installs_and_uninstalls_the_job_and_troubleshoots_launchd` (`test_dropbox_backup_guide.py`). **`("bookvie", ["autobackup", "install"])` is in `guide_commands(text)`.** Then: `uninstall` is there too. `autobackup install`, `uninstall` and `run` all parse with `bookvie_cli.parse_args`. In Setup, `bookvie autobackup install` comes after `claude mcp list`. A shell line starts with `launchctl kickstart`. `~/Library/Logs/bookvie/` appears. An Uninstall section holds `bookvie autobackup uninstall`, `claude mcp remove`, "Keychain", and "revok…" with "Dropbox". Each troubleshooting entry is its own heading: `PATH` with `claude` and `bookvie autobackup install`; ``--allowedTools``; Claude Code signed out (`Claude Code` with log in or sign in); a moved checkout with `bookvie autobackup install`; asleep or sleep with wake. | AR61: the docs ship with the code. |

**Primary branch per criterion:**
- AC-1: the first install.
- AC-2: the cause sentence.
- AC-3: the bootout.
- AC-4: the start, run and stop.
- AC-5: the constant equals the frontmatter.
- AC-6: `installed` on the real library.
- AC-7: manual.
- AC-8: the install command in the guide.

**What the leaves pin (the contract for the build):**
- **Subcommands** are a subparser on `cli.parse_args`: `bookvie autobackup install|uninstall|run`. `--dev` is the existing top-level flag, `bookvie --dev autobackup install`. `parse_args([])` and every existing flag still parse as before. `cli.main` returns the exit code.
- **Names in `cli.py`:**
  - `AUTOBACKUP_LABEL` (str), the one label, used by install, uninstall and the probe
  - `AUTOBACKUP_ALLOWED_TOOLS` and `AUTOBACKUP_DISALLOWED_TOOLS` (sequences of str)
  - `launchd_job_installed() -> bool`, the default probe that `main` passes to `create_app`
- **`create_app(…, launchd_probe=None)`:** a `Callable[[], bool]`. With none, the view reads not installed. The app calls the probe on each read of `views/backup`, and only when the server isn't `--dev` and its backups folder resolves to `Path.home() / "bookvie-backups"`.
- **The wire** is `views/backup` → `autoBackup: {installed: bool}`, through Pydantic and then `api:gen`.
- **Seams:**
  - `launchctl` goes through `subprocess.run`. The leaves record `bootstrap gui/<uid> <plist>`, `bootout gui/<uid>…` (either form) and `print gui/<uid>/<label>`.
  - `claude`, `bookvie` and `bookvie-dropbox` are resolved from `PATH`, as `shutil.which` does.
  - The run's health check is `instance.probe_health` on 8765.
  - The run starts the server and runs `claude` as child processes, never with `exec`.
  - The run waits for the server it SIGTERMed to exit before it returns.

**Open for the build (not pinned):**
- The label's value. Reverse-DNS is usual, for example `com.bookvie.autobackup`.
- Whether install creates `~/Library/Logs/bookvie/`. launchd may not create a missing log folder, so creating it is likely right. The spec should say.
- How long the run waits for health, and what it reports when bookvie never answers. AD-22 says the line then goes Stalled.
- Whether `--allowedTools` is one comma-joined value or several arguments. The leaves read both.
- Whether the view also catches an exception from the probe. AD-22 says any error reads as not installed, so that's a follow-up below.

## Existing leaves this story changes (for the build)

- `test_views.py::test_backup_view_before_any_export`, `test_backup_view_reads_local_state` and `test_backup_view_reads_malformed_local_state_as_no_export` assert `response.json() == {"lastExportAt": …}`. With the new field, each gets `"autoBackup": {"installed": False}` too.
- `test_export.py::test_an_unreadable_local_state_reads_as_no_export_…` asserts `view.json() == {"lastExportAt": None}`, which needs the same change.
- The guide's `test_the_guide_sets_up_…_commands_match_the_cli` parses every `bookvie` command in the guide's code blocks. Add the subparser before the guide shows `bookvie autobackup …` in a code block, or that leaf goes red.
- `frontend/src/api/generated/schema.d.ts` changes through `npm --prefix frontend run api:gen`. Never edit it by hand. The two e2e `page.route('**/api/views/backup', …)` fakes return no `autoBackup`, which is fine until 13.6 reads it.
- `test_cli.py`'s `expose_data_dir` fixture forwards `**rest` to `create_app`, so `launchd_probe` passes through.

## Green-phase follow-ups (secondary branches, not red leaves)

- ~~**AC-1:** install creates `~/Library/Logs/bookvie/`, once the spec decides that it should.~~ **Retired:** there is no `autobackup install` any more; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). `bookvie autobackup` is not a command (`backend/tests/test_morning_job_removed.py:98`).
- ~~**AC-1:** a `bootstrap` that fails (`launchctl` exits non-zero) makes install fail with a message, and it doesn't claim success.~~ **Retired:** no install, no `launchctl bootstrap`; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). Nothing in bookvie runs `launchctl` (`backend/tests/test_morning_job_removed.py:123`).
- ~~**AC-2:** a cwd that's a subfolder of the main checkout is refused, because the skill isn't in that folder.~~ **Retired:** no install, so no checkout check; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). (`backend/tests/test_morning_job_removed.py:98`)
- ~~**AC-3:** uninstall with `--dev` is refused (AD-22: every subcommand is production only). The same goes for `run`.~~ **Retired:** no `uninstall` or `run` subcommand; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). The skill's own dev refusal is Story 13.4 AC-2 (`backend/tests/test_backup_skill.py:222`).
- ~~**AC-4:** a bookvie that never answers health: `run` gives up within its wait, stops what it started, doesn't run `claude`, and exits non-zero.~~ **Retired:** no `autobackup run`; the skill runs by hand and starts bookvie itself in step 1; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). (`backend/tests/test_morning_job_removed.py:98`)
- ~~**AC-4:** when `claude` can't be found at run time, `run` stops a server it started and exits non-zero.~~ **Retired:** no `autobackup run` and no `claude` runner; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). (`backend/tests/test_morning_job_removed.py:98`)
- ~~**AC-6:** a `launchd_probe` that raises reads as not installed, and the view still answers 200.~~ **Retired:** `create_app` has no `launchd_probe` and `views/backup` has no `autoBackup`; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). (`backend/tests/test_morning_job_removed.py:123`)
- ~~**AC-6:** `GET /api/views/backup` keeps `lastExportAt` beside `autoBackup`. The contract test (`test_contract.py`) still passes after `api:gen`.~~ **Retired:** `autoBackup` is gone from the view; it now carries `lastExportAt` and 13.6's `dropboxBackup`; the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). (`backend/tests/test_morning_job_removed.py:123`, `backend/tests/test_dropbox_backup_line.py:73`)
- ~~**AC-8:** the Off entry's `launchctl print gui/$UID/<label>` check belongs to 13.6, with the badge states.~~ **Retired:** the Off state and its `launchctl print` check were dropped with the job (13.6 shrunk to a plain Dropbox backup line); the morning job was removed by `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-23.md` and Story 13.5 "Take out the morning job" (`_bmad-output/implementation-artifacts/spec-13-5-take-out-the-morning-job.md`; retro E13-S2). The successor per-cause entries are proved by `backend/tests/test_dropbox_backup_line.py:155`.

## Helper probes

Helpers reused:
- `SKILL_MD`, `allowed_tools` (`test_backup_skill.py`). They live only there, so they're imported rather than copied, as 13.4 imported from `test_dropbox_upload.py`.
- `RESTORE_BACKUP` (`agent_client.py`)
- `BASE_URL`, `TODAY` (`helpers.py`)
- `section`, `headed`, `shell_lines`, `guide_commands`, `_parses`, `GUIDE`, `bookvie_cli` (`test_dropbox_backup_guide.py`)
- `create_app` (`bookvie.http.app`), `Store`, `FakeClock`. The real ones, as `api_client` uses them. `api_client` itself isn't reused, because it can't pass `dev`, `backups_dir` or `launchd_probe`.

Helpers added (all in `test_autobackup.py`, story-local, since no existing helper fakes a subprocess or a command on `PATH`):
- the `launchctl` autouse fixture with `Launchctl`, `_argv` and `_is_launchctl`. It records and answers `launchctl` through `subprocess.run`, honouring `check=True`, and a `Popen` guard refuses any other way to start it. Nothing faked a subprocess before.
- `Tools`, `_command`, `_use_path`, `_use_log`, `FAKE_CLAUDE`, `FAKE_BOOKVIE`, `FAKE_BOOKVIE_DROPBOX`: the fake commands on `PATH`, and the `tools` fixture, which also kills a fake server that was left running.
- `_git`, `_repo`, `checkout`: a temporary main checkout, and a linked worktree made from it.
- `_main`: `cli.main`'s exit code, also when argparse exits.
- `_plists`, `_agents`, `_files_under`, `_lines`, `_resolved`
- `_messages`: stderr without argparse's usage lines and without the `bookvie: ` prefix
- `_flag_values`: a flag's names in any of the three argv forms
- `_health`: `instance.probe_health` faked, and the ports it was asked
- `ProbeSpy`, `_backup_client`, `_installed`: the app with a `launchd_probe` once the seam exists. The keyword is dropped while it doesn't exist, so the red leaf fails at its assertion and not with a `TypeError`.
- `_entries` (`test_dropbox_backup_guide.py`): `headed`'s sections, each on one line, as 13.4's leaf did inline.

**Probes** (temporary `backend/tests/test_atdd_13_5_probe.py`, `uv run pytest -q -p no:cacheprovider tests/test_atdd_13_5_probe.py`, removed with `rm`). **47 passed** on the first run. A second run printed where each broken variant fails, and each fails at the assertion meant for it.
- **`_flag_values`** reads `a,b`, `a b` and `=a, b`. It stops at the next `-` flag, and it gives `[]` for a missing flag. Like claude, it swallows a prompt that comes after a variadic list.
- **`_messages`** drops the real usage error of `bookvie --dev autobackup install`, so no `REFUSALS` pattern matches it, even though the usage shows `[--dev]`. It keeps "refused with --dev". The `no_bookvie` pattern matches "can't find bookvie" and refuses "can't find bookvie-dropbox".
- **The `launchctl` fake** records `bootstrap`. With exit 113 it raises `CalledProcessError` under `check=True`, it answers `shell=True` strings, and it refuses `Popen` and `check_call`. It passes `/bin/echo` through to the real `run`.
- **The temporary repos:** the checkout has a `.git` folder and the skill. `git worktree add` gives a `.git` file and the committed skill.
- **A known-good sample** passes every leaf: `cli.main` and the constants patched in, and `create_app` wrapped with a gated `views/backup`. That's AC-1, AC-2 (all six cases), AC-3, AC-4, AC-5, AC-6 and AC-8. In AC-8, `parse_args` is a sample subparser and `GUIDE` is a sample guide.
- **Broken samples, each failing its leaf at the intended line:**

  | AC | Broken sample | Fails at |
  |---|---|---|
  | AC-1 | `Hour: 10` | `test_autobackup.py:354` |
  | AC-1 | no reload | `:379` |
  | AC-2 | a vague worktree message | `:434` |
  | AC-2 | `--dev` writes `~/Library` before refusing | `:436` |
  | AC-3 | no `bootout` | `:461` |
  | AC-3 | silent when there's no job | `:472` |
  | AC-4 | an extra `--port` | `:495` |
  | AC-4 | the prompt swallowed after `-p` | `:498` |
  | AC-4 | no SIGTERM | `:502` |
  | AC-4 | exit 0 instead of claude's status | `:503` |
  | AC-5 | `Bash` added | `:540` |
  | AC-5 | one disallowed name | `:541` |
  | AC-5 | the prompt swallowed | `:541` |
  | AC-6 | an ungated probe on `--dev` | `:619` |
  | AC-6 | no timeout | `:629` |
  | AC-6 | probing off macOS | `:641` |
  | AC-8 | Keychain removed | `test_dropbox_backup_guide.py:308` |
  | AC-8 | uninstall command removed | `:289` |
  | AC-8 | `--allowedTools` removed | `:323` |
  | AC-8 | log in removed | `:325` |
  | AC-8 | wake removed | `:333` |

- **A TEA hook change:** the hook (`.claude/hooks/tea-enforce.cjs`, rule H1) blocked a `time.sleep` poll for the SIGTERM marker. AC-4 now checks the marker as soon as `run` returns, which pins that `run` waits for the server it stopped. The sample implementation's own wait uses `threading.Event().wait`.

Shipped numbers: AC-1 quotes 09:00 for the job's start time, and AC-6 quotes a "short" timeout. Neither is shipped UI. 09:00 is asserted as `{Hour: 9, Minute: 0}`, as AD-22 gives it. The timeout is bounded at 5 s, the ceiling this checklist chose. Nothing measured.
Storage keys: no new localStorage key.
Fractional borders: none (no UI).
Render-before-read: no leaf reads a page. Each read of a file the code under test writes (the plist, the fake commands' logs, the guide) comes after the `cli.main` call that writes it returns. The view is read after the `TestClient` request returns.

## TDD Red Phase

Generated: 12 pytest cases across 7 leaves, all `@pytest.mark.skip`, each with a comment above it saying when to un-skip:
- 6 leaves in `test_autobackup.py` (`reason=RED`). AC-2 is one leaf parametrized over 6 cases.
- 1 leaf in `test_dropbox_backup_guide.py` (`reason=RED_13_5`)

Each leaf carries exactly one `AC-N` in its `# [P…]` comment. AC-7 is manual.

The red run came after the probes last passed. It used throwaway un-skipped copies, `tests/test_autobackup_redrun_probe.py` and `tests/test_dropbox_backup_guide_redrun_probe.py` (only the 13.5 leaf ran), removed with `rm`. **12 failed**, each at its criterion assertion:
- **AC-1:** `assert 0 == 1`. No plist; the usage error is in the message.
- **AC-2:** `assert None`, six times. No refusal names its cause.
- **AC-3:** `assert False`. No `bootout`.
- **AC-4:** `None == ['--no-browser']`. No server started.
- **AC-5:** `[] == [the four tools]`. No constant.
- **AC-6:** `None is True`. No `autoBackup`.
- **AC-8:** `('bookvie', ['autobackup', 'install']) in […]`. Not in the guide.

The related suites afterwards (`test_autobackup.py`, `test_dropbox_backup_guide.py`, `test_backup_skill.py`, `test_cli.py`, `test_views.py`) gave **98 passed, 12 skipped**. `uv run ruff format --check` and `ruff check` are clean on both files. `git status` lists only the two test files and this checklist, with no `*probe*` file. The temporary git repos lived under `tmp_path`, and no git command ran in the shared checkout.

## For the build

1. **`cli.py`:**
   - the `autobackup` subparser: `install`, `uninstall`, `run`
   - `AUTOBACKUP_LABEL`, `AUTOBACKUP_ALLOWED_TOOLS` (the skill's four) and `AUTOBACKUP_DISALLOWED_TOOLS` (the two `restore_backup` names)
   - `launchd_job_installed()`
   - **install:** `--dev`, worktree, skill and `which` refusals, all before any write. Then the plist through `plistlib`, then `bootout` when replacing, then `bootstrap`.
   - **uninstall:** `bootout`, then remove the plist, or say it isn't installed.
   - **run:** health on 8765, `bookvie --no-browser` from `PATH`, wait for health, `claude -p "/bookvie-backup" --allowedTools … --disallowedTools …`, `terminate()` and `wait()` only what it started, and exit with `claude`'s status.
   - `main` passes `launchd_probe=launchd_job_installed` to `create_app`.
2. **`create_app(launchd_probe=None)`:** `views/backup` gains `autoBackup: {installed}` (Pydantic, then `npm --prefix frontend run api:gen`). The probe is asked on each read, only when the server isn't `--dev` and its backups folder resolves to `~/bookvie-backups`.
3. **The existing leaves listed above:** `test_views.py` and `test_export.py` expect the new field.
4. **`docs/dropbox-backup.md`:**
   - install as a Setup step after `claude mcp list`
   - the log location and `launchctl kickstart`
   - an Uninstalling section
   - the five troubleshooting headings
5. **AC-7:** Oleg installs by the guide and lets the job run at 09:00 twice, once awake and once after sleep, with no permission prompt. The spec records both runs and the log lines. The story stays in review until they're recorded.
6. **Spine:** `autoBackup.installed` isn't in AD-22's view list (`state`, `offReason`, …). That's Oleg's decision above, so if the review raises it, defer it as spine drift (AD-22) rather than block on it.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove a leaf's skip when its task starts. Suggested order: AC-5 (the constants), AC-2, AC-1, AC-3, AC-4, AC-6, AC-8.
2. Run `cd backend && uv run pytest -q tests/test_autobackup.py tests/test_dropbox_backup_guide.py`.
3. Finish with `npm run check`.
