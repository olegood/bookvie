---
title: 'Story 13.5: Run the backup every morning'
type: 'feature'
created: '2026-11-22'
baseline_revision: '3fbe4bd203267fc2617f10b65ab67cfd6ee92e73'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-5-run-the-backup-every-morning.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-22 Auto-backup state), reconciled before the next epic: `views/backup` carries `autoBackup: {installed: bool}` (Oleg's ATDD decision, 2026-11-22); AD-22 lists only `state`, `offReason`, `reportAt`, `lastOkAt`, `lastUploadAt`, `copies` and `cause`, with the probe as an input to `state`.
    evidence: |-
      spine-check finding 1; backend/bookvie/views/models.py AutoBackupView; ATDD checklist "Oleg's decision".
    location: >-
      backend/bookvie/views/models.py
    severity: low
  - summary: >-
      Spine drift (AD-22, Source tree, Structural Seed), reconciled before the next epic: `cli.py`'s `autobackup install|uninstall|run`, `create_app`'s `launchd_probe` and the seed diagram's launchd 09:00 are built, but the spine still marks them "(planned)".
    evidence: |-
      spine-check finding 2; ARCHITECTURE-SPINE.md source tree lines for cli.py and http/, diagram "launchd 09:00 (planned)".
    location: >-
      backend/bookvie/cli.py
    severity: low
  - summary: >-
      Spine drift (Consistency Conventions Config row, AD-22 The schedule), reconciled before the next epic: the Config row lists only `bookvie autobackup install` and `uninstall` as planned; `run` exists too and none is planned any more.
    evidence: |-
      spine-check finding 3; cli.py parse_args subparser.
    location: >-
      backend/bookvie/cli.py
    severity: low
  - summary: >-
      Spine drift (AD-1), reconciled before the next epic: AD-1 says the one thing written outside the data folder is an agent's backup; `bookvie autobackup install` also writes `~/Library/LaunchAgents/com.bookvie.autobackup.plist` and creates `~/Library/Logs/bookvie/`.
    evidence: |-
      spine-check finding 4; cli.py _autobackup_install.
    location: >-
      backend/bookvie/cli.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** The `bookvie-backup` skill (13.4) works only when Oleg remembers to run it. Nothing schedules it, and the Backup page can't tell whether a schedule exists.

**Approach:** `bookvie autobackup install|uninstall|run` in `cli.py`. Install writes and bootstraps a launchd user agent that runs `bookvie autobackup run` at 09:00. The run starts bookvie if needed, runs `claude -p "/bookvie-backup"` headless with a fixed MCP-only tool list, and stops only what it started. `create_app` gains a `launchd_probe` seam, and `views/backup` carries `autoBackup: {installed}` (Oleg's ATDD decision) on the real library's server only. The guide gains install, uninstall, logs, kickstart and the launchd troubleshooting.

## Boundaries & Constraints

**Always:**
- Every subcommand refuses `--dev` (AD-22, production only) before it writes anything or calls `launchctl`.
- Install refuses, in this order and before any write or `launchctl` call: `--dev`, a linked worktree (cwd's `.git` is a file), a cwd without `.claude/skills/bookvie-backup/SKILL.md`, then each of `bookvie`, `bookvie-dropbox`, `claude` that `shutil.which` can't find. Each message names its cause.
- `launchctl` runs only through `subprocess.run` (the test seam), as `/bin/launchctl`.
- `AUTOBACKUP_ALLOWED_TOOLS` equals the skill's `allowed-tools`. `Bash` never appears in it, in the argv, or in the plist. There's no `--dangerously-skip-permissions` and no `bypassPermissions`.
- The probe is asked on each read of `views/backup`, only when not `--dev` and `backups_dir` resolves to `~/bookvie-backups`. A probe that raises reads as `false`.
- `schema.d.ts` only through `npm --prefix frontend run api:gen`.

**Never:**
- No Auto-backup state, line or UI (13.6). No edit to the skill, the spine or `bookvie_dropbox`.
- `run` never `exec`s: the server and `claude` are child processes. It never SIGTERMs a server it didn't start.
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First install | main checkout, three commands on PATH | logs folder, plist, `bootout` (ignored), `bootstrap gui/<uid> <plist>`, exit 0 | — |
| Reinstall | plist exists | new plist from freshly resolved paths, `bootout` before `bootstrap` | — |
| Bootstrap fails | `launchctl bootstrap` non-zero or OSError | message naming launchctl, exit 1, never "installed" | — |
| Uninstall, none | no plist, `bootout` non-zero | "isn't installed" message, exit 0 | — |
| Run, bookvie down | health silent | start `bookvie --no-browser`, wait ≤ 60 s, `claude`, SIGTERM + wait, exit `claude`'s status | — |
| Run, never healthy | health silent 60 s, or server exits early | stop what it started, no `claude`, exit 1 | message on stderr |
| Run, no `claude` | `which claude` is None | nothing started, exit 1 | message |
| Run, `claude` hangs | over 30 min | kill it, stop the server, exit 1 | message |
| Probe | exit 0 / non-zero / timeout / OSError / not darwin | True / False / False / False / False (no call) | — |

</intent-contract>

## Code Map

- `backend/bookvie/cli.py` -- `parse_args` (flags only today; add an optional `autobackup` subparser, `dest="command"`, required action) and `main` (dispatch to autobackup before `_refuses_real_library`/`ensure_writable`, so a refusal writes nothing; pass `launchd_probe=launchd_job_installed` to `create_app` at line ~306). `_say` prints to stderr with the caller's prefix.
- `backend/bookvie/instance.py:152` -- `probe_health(port, timeout)` returns the data folder or None; the run's health check (tests monkeypatch `instance.probe_health`, so call it through the module).
- `backend/bookvie/http/app.py:194-251` -- `create_app` keywords and `app.state.backups_dir`; add `launchd_probe` and store the gated probe on `app.state`.
- `backend/bookvie/intents/backup_file.py:72` -- `DEFAULT_BACKUPS_NAME` for the real-library gate.
- `backend/bookvie/http/api.py:345` -- `views/backup` route (sync def, runs in the threadpool; the probe's ≤ 2 s timeout is fine there).
- `backend/bookvie/views/backup.py`, `views/models.py:326` -- `BackupView`; add `AutoBackupView{installed: bool}` and `auto_backup`.
- `backend/tests/test_autobackup.py` -- 6 red leaves (`RED`); fakes for `launchctl`, PATH commands, health; `_backup_client` drops `launchd_probe` until the seam exists.
- `backend/tests/test_dropbox_backup_guide.py:268-333` -- AC-8 leaf (`RED_13_5`); headings it reads: `\buninstall`, `\bPATH\b`, `--allowedTools|permission prompt`, `signed out`, `\bmoved?\b`, `asleep|sleep`; `bookvie autobackup install` must come after `claude mcp list` in Setup.
- `backend/tests/test_views.py:348-368`, `backend/tests/test_export.py` (`view.json() == {"lastExportAt": None}`) -- exact-equality views gain `"autoBackup": {"installed": False}`.
- `.claude/skills/bookvie-backup/SKILL.md:9-13` -- the four tools the constant copies.
- `docs/dropbox-backup.md` -- Setup steps 1-4, "Your first run", "Troubleshooting the setup", "How it works" (line ~116 says installing comes "in a later update").
- Deferred-work intake: none name story 13.5.

## Tasks & Acceptance

**Execution:**
1. `backend/bookvie/cli.py` -- the constants (`AUTOBACKUP_LABEL = "com.bookvie.autobackup"`, the two tool tuples), `launchd_job_installed()` (2 s timeout), the subparser, and `_autobackup_install/uninstall/run` per the matrix; install creates `~/Library/Logs/bookvie/` and writes the plist with `plistlib` (temp file, then `os.replace`); `PATH` is the three folders then `/usr/bin:/bin:/usr/sbin:/sbin`, deduplicated.
2. `backend/bookvie/http/app.py`, `views/models.py`, `views/backup.py`, `http/api.py` -- the `launchd_probe` seam and `autoBackup.installed`; then `npm --prefix frontend run api:gen`.
3. `backend/tests/test_autobackup.py`, `test_dropbox_backup_guide.py` -- un-skip the 7 leaves; add the checklist's follow-ups: a failed bootstrap, a subfolder cwd refused, `--dev` uninstall and run refused, a never-healthy run, `claude` missing at run time, a raising probe answering 200 with `false`. `test_views.py`, `test_export.py` -- expect the new field.
4. `docs/dropbox-backup.md` -- Setup "### 5. Install the daily job" after step 4 (`bookvie autobackup install` from the main checkout, what it writes, logs under `~/Library/Logs/bookvie/`, `launchctl kickstart -k gui/$(id -u)/com.bookvie.autobackup` to run now); How it works drops "later update"; "## Uninstalling" (`bookvie autobackup uninstall`, `claude mcp remove`, delete the Keychain item, revoke the app in Dropbox); "### Troubleshooting the daily job" with the five entries.

**Acceptance Criteria:**
- Given the 7 ATDD leaves un-skipped and the follow-ups added, when `cd backend && uv run pytest -q tests/test_autobackup.py tests/test_dropbox_backup_guide.py tests/test_views.py tests/test_export.py tests/test_cli.py` runs, then all pass.
- Given `npm run check`, when it runs, then it passes.
- Given AC-7 (manual: Oleg installs by the guide, then two 09:00 runs, one awake and one after waking from sleep, with no permission prompt), when the build ends, then the Auto Run Result lists it as pending and the story stays in review until it is recorded here with the log lines.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 31 findings — high 0, medium 3, low 22, false 6, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine) `autoBackup.installed` isn't in AD-22's field list — spine drift (AD-22), Oleg's ATDD decision; deferred.
  - `[low]` `[defer]` (spine) The spine still marks the schedule, `launchd_probe` and the diagram's launchd as planned — spine drift (AD-22, source tree); deferred.
  - `[low]` `[defer]` (spine) Config row lists install and uninstall only, as planned — spine drift; deferred.
  - `[low]` `[defer]` (spine) AD-1's "one thing written outside the data folder" — spine drift (AD-1); deferred.
  - `[medium]` `[patch]` (edge 1) A bootstrap right after bootout can fail with error 5 on reinstall — grouped with blind 2; the failure message now says no job is loaded and to install again, and the guide says a second install succeeds. A retry loop would guard a state not shown here.
  - `[low]` `[reject]` (edge 2) Uninstall says "uninstalled" when launchctl can't run at all — needs a missing or hung `/bin/launchctl`; the fix adds a branch.
  - `[low]` `[reject]` (edge 3) A stray `.plist.tmp` after a failed write — rare (full disk or a read-only `~/Library`); the next install overwrites it.
  - `[low]` `[reject]` (edge 4) MCP children orphaned after a timed-out `claude` — stdio servers exit on EOF when `claude` dies; the fix needs process groups.
  - `[medium]` `[patch]` (edge 5) SIGTERM to `run` skips its `finally` — grouped with blind 1; the documented trigger was the guide's `kickstart -k`, now `kickstart` without `-k`. launchd's own bootout during a run stays rare.
  - `[false]` `[reject]` (edge 6) A bookvie on 8765 serving another library gets backed up — its backups folder isn't `~/bookvie-backups`, and `upload_backup` refuses any other path before a network call, so the run fails rather than uploading another library.
  - `[low]` `[reject]` (edge 7) `--port`, `--data-dir`, `--fake-today` are ignored with `autobackup` — nobody passes them to a launchd subcommand; a refusal adds guards.
  - `[low]` `[reject]` (edge 8) A non-git folder with the skill is accepted — a copy holding the skill is a valid place to run; the spec's worktree rule is the `.git` file.
  - `[medium]` `[patch]` (blind 1) `kickstart -k` kills a run mid-upload — grouped with edge 5; guide fixed.
  - `[medium]` `[patch]` (blind 2) Reinstall can leave no job loaded after a failed bootstrap — grouped with edge 1; message and guide fixed.
  - `[low]` `[patch]` (blind 3) Uninstalling removes the `bookvie` MCP entry unconditionally — now only if bookvie's agent tools aren't used otherwise.
  - `[low]` `[patch]` (blind 4) The log description is inaccurate — now says a started server's lines land there too, and an early stop says why instead of "finished".
  - `[low]` `[patch]` (blind 5) A moved `bookvie` leaves both logs empty — guide now points at `launchctl print`'s last exit code and installing again.
  - `[medium]` `[patch]` (blind 6) The Keychain prompt after a reinstall hangs the 09:00 run — step 5 now says to run `/bookvie-backup` by hand once after each reinstall and choose Always Allow.
  - `[low]` `[reject]` (blind 7) The headless run starts every user MCP server — the allowlist keeps the run to the four tools; `--strict-mcp-config` needs a generated config, more than a direct fix.
  - `[low]` `[reject]` (blind 8) Global flags ignored — grouped with edge 7.
  - `[false]` `[reject]` (blind 9) `run` backs up whatever library is on 8765 — grouped with edge 6; `upload_backup` refuses it.
  - `[low]` `[reject]` (blind 10) An unchecked `capsys` and missing tests — the signal and uninstall gaps were patched with verification 2 and 3; the unchecked `capsys` is cosmetic.
  - `[false]` `[reject]` (blind 11) Inconsistencies: inline domain string, exit 2 for `--dev`, a case-sensitive compare — exit 2 matches `main`'s existing `--dev` refusal; `backups_folder` returns `~/bookvie-backups` exactly for the real library, so the case can't differ; the inline string is the same value.
  - `[low]` `[patch]` (verification 1) The `samefile` branch never ran — test added with an existing `~/bookvie-backups`.
  - `[low]` `[patch]` (verification 2) A signal-killed `claude` → 1 untested — test added.
  - `[low]` `[patch]` (verification 3) Uninstall with no plist and a successful bootout untested — test added.
  - `[low]` `[patch]` (verification 4) `run` with no `bookvie` untested — test added.
  - `[false]` `[reject]` (intent 1) The 09:00 runs on the real Mac aren't exercised — by design: AC-7 is manual and pending; the story stays in review.
  - `[low]` `[reject]` (intent 2) `claude` is resolved at run time from the plist's PATH, so an earlier folder's `claude` could win — the PATH holds only the three resolved folders before the system ones; reinstall resolves again.
  - `[false]` `[reject]` (intent 3) `--dev` refused for uninstall and run, beyond the AC — AD-22 says every subcommand is production only.
  - `[false]` `[reject]` (intent 4) A failed bootstrap leaves the plist — not a listed refusal; the message now says no job is loaded and to install again.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Intent source:** this run was started with no prompt. Story 13.5 was taken as the intent because 13.4 is `done` and the last commit is 13.5's ATDD.
- **Tool lists** are comma-joined into one value each (`--allowedTools a,b,c,d`), and placed after the prompt, so Claude Code's variadic flag can't take the prompt as a tool.
- **Bootout on every install** (exit status ignored) covers a job that is loaded but has no plist. Uninstall counts the job as present when the plist exists or `bootout` succeeded.
- **`autoBackup.installed`** isn't in AD-22's field list. That's Oleg's ATDD decision; a review finding on it is spine drift (AD-22).

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_autobackup.py tests/test_dropbox_backup_guide.py` -- expected: all pass, none skipped
- `npm run check` -- expected: exit 0

**Manual checks:**
- AC-7: Oleg's install and two 09:00 runs (awake, after sleep), recorded here with the log lines.

## Auto Run Result

Status: in-review

**Summary.** `bookvie autobackup install|uninstall|run` in `cli.py`. Install refuses `--dev`, a linked worktree, a folder without the skill, or a missing `bookvie`, `bookvie-dropbox` or `claude`, all before any write. It then writes `~/Library/LaunchAgents/com.bookvie.autobackup.plist`: 09:00, `bookvie autobackup run` by absolute path, the checkout as `WorkingDirectory`, a `PATH` of the three folders, and logs in `~/Library/Logs/bookvie/`. It boots out any old job and bootstraps the new one. Uninstall boots the job out and removes the plist, or says it isn't installed. Run starts `bookvie --no-browser` when health is silent (60 s wait) and runs `claude -p /bookvie-backup --allowedTools <the skill's four> --disallowedTools <both restore_backup>` (30 min cap). It SIGTERMs only a server it started and exits with `claude`'s status. `create_app(launchd_probe=…)` and `views/backup` → `autoBackup: {installed}`, asked on each read and only on the real library's server. The guide gains Setup step 5, Troubleshooting the daily job (five entries) and Uninstalling.

**Files changed.**
- `backend/bookvie/cli.py` — constants, `launchd_job_installed`, the subparser, install, uninstall and run.
- `backend/bookvie/http/app.py`, `http/api.py` — the `launchd_probe` seam, gated to the real library; a raising probe reads `false`.
- `backend/bookvie/views/models.py`, `views/backup.py`, `views/__init__.py` — `AutoBackupView{installed}`.
- `frontend/src/api/generated/schema.d.ts` — regenerated with `api:gen`.
- `backend/tests/test_autobackup.py` — 6 ATDD leaves un-skipped; follow-ups and review tests (bootstrap failure, logs folder, subfolder, `--dev`, never healthy, early exit, no `claude`, no `bookvie`, hung and signal-killed `claude`, raising probe, existing `~/bookvie-backups`, a loaded job with no plist).
- `backend/tests/test_dropbox_backup_guide.py` — AC-8 leaf un-skipped. `test_views.py`, `test_export.py` — expect `autoBackup`.
- `docs/dropbox-backup.md` — install, kickstart, logs, daily-job troubleshooting, Uninstalling.
- `_bmad-output/implementation-artifacts/deferred-work.md` — four spine-drift entries. `sprint-status.yaml` — 13-5 → review.

**Review.** 31 findings: 0 high, 3 medium entries (5 rows), 22 low, 6 false. Patched in one round:
- medium ×3: a reinstall's failed bootstrap now says no job is loaded; `kickstart` without `-k`; the Keychain prompt after a reinstall.
- low ×7: uninstalling `bookvie` only when it's unused; the log wording; a moved `bookvie`; four tests.

Deferred: four spine-drift entries (AD-22 `installed`; AD-22 and the source tree still say "planned"; the Config row; AD-1). Rejected, with reasons in the Review Triage Log:
- launchctl unavailable during uninstall
- a stray temp plist
- MCP orphans after a timeout
- the other-library run (`upload_backup` refuses it)
- ignored global flags
- a non-git folder
- every user MCP server starting
- small inconsistencies
- AC-7 by design
- run-time `claude` resolution
- `--dev` on every subcommand (AD-22)
- the plist left after a failed bootstrap

**Follow-up review recommended: false.** This was the first pass: 0 high and 3 medium entries were patched, but every medium patch is guide wording or a message, with no unverified code path left.

**Verification.**
- `cd backend && uv run pytest -q tests/test_autobackup.py tests/test_dropbox_backup_guide.py tests/test_views.py tests/test_export.py tests/test_cli.py`: 125 passed before the patches. After them, the first two files gave 30 passed.
- `npm run check` before the patches: the first run failed 3 tests in `test_dropbox_cli_follow_ups.py` because port 8790 was briefly in use (the known 13.2 flake; the file passes alone). The re-run exited 0.
- `npm run check` after the patches: exit 0 (pytest 2443 passed, e2e 800 passed, smoke ok).
- Matrix Test Audit: every row is covered by a passing test.

**Manual AC (AC-7): pending.** Oleg installs by the guide (`bookvie autobackup install` from the main checkout), then lets the job run at 09:00 once with the Mac awake and once after waking it from sleep. Neither run may show a permission prompt. Record both runs and the log lines from `~/Library/Logs/bookvie/` here. The story stays in review until then.

**Residual risks.**
- No test reaches the real launchd, `claude` or Dropbox.
- Whether `claude -p` accepts comma-joined `--allowedTools` headless is shown only by AC-7.
- A bootstrap right after a bootout may fail with error 5 on some macOS versions; a second install succeeds.
- The headless run starts every user-scoped MCP server.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
