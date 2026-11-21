---
title: Rubric review of the Epic 13 spine update (AD-22, Dropbox backup and agent restore)
reviewed: _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (uncommitted diff on hogback-creosote, 2026-11-21)
against: dropbox-backup-plan-2026-11-21.md (D1-D20, §4 story cut, §5 tests); prd.md FR-29, FR-30, §5 NFRs; EXPERIENCE.md (Auto-backup line, restore conversation); backend/bookvie/store/local_state.py, store/store.py (lock, record_export), intents/export.py, intents/backup_file.py, intents/restore.py, agent/, tests/test_layers.py, pyproject.toml; .claude/skills/bookvie-new-book/SKILL.md (step 1), .claude/settings.json; the installed mcp 2.3.0 (mcp/server/request_state.py, mcp_types/version.py)
date: 2026-11-21
verdict: pass-with-fixes (one critical)
---

# Rubric review: Epic 13 spine update

**Verdict: pass-with-fixes, with one critical.** AD-22 is well aimed and mostly decisions: two processes with a test-enforced import wall, verify-then-prune with a fixed keep, a closed cause enum, bookvie owning the "unchanged" comparison, the upload state as its own key group with one read-modify-write writer, the 26-hour rule on the server, the allowed restore folder, a sealed stateless elicitation, and a safety copy inside the restore. The amendments to AD-1, AD-4, AD-9, AD-15 and AD-21 are in place and consistent with each other. But the headless run as written can't work when bookvie isn't already running, which FR-29 requires ("no app or agent session open"). Two more points would make stories break or diverge: the safety copy deadlocks against the code's non-reentrant lock, and the headless run's tool list and MCP entry names are a cross-story contract the spine doesn't fix.

## Scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Fixes the real divergence points for 13.1-13.8 | Partial: the `--allowedTools` list, the Dropbox MCP entry name (tool prefix), bookvie's lifetime in the headless run, the dev folder and `from-dropbox` names shared by both packages, the seal's restart-versus-tamper rule (F1, F2, F4, F6) |
| 2 | Every rule enforceable and effective | Mostly: the safety-copy rule deadlocks as written (F3); the backup time isn't on the injected clock (F5) |
| 3 | Nothing under Deferred lets two units diverge | Yes. The older-protocol item is a decision (refuse as `unsupported`); "Backup scope beyond AD-22" is plain out-of-scope |
| 4 | Ratifies, doesn't contradict, code and ADs | Mostly: AD-3, AD-21 and AD-1 sentences now contradict the new tools (F7); the SDK's own `RequestStateBoundary` is unaddressed (F4) |
| 5 | Operational envelope decided | Partial: install, macOS-only, logs folder, dev, Keychain and `claude` path at install are decided; runtime failure on a moved checkout or `claude`, PATH for `bookvie`/`bookvie-dropbox`/`uv`, project hooks and settings in the job, reinstall, log file names, the Keychain item name and the wheel's packages are not (F1, F2, F8) |
| 6 | Decisions, not rationale; terse | Mostly. AD-22 is long but nearly all of it is rule. Small trims in F9 |

## Findings

### F1 [Critical] The headless run can't reach bookvie's tools when bookvie isn't running at 09:00

- **Location:** AD-22 → The `bookvie-backup` skill ("starts bookvie when it isn't running"), → The schedule; FR-29 "no app or agent session open".
- **Problem:** The existing skills' step 1 (`.claude/skills/bookvie-new-book/SKILL.md` §1, AD-8) starts `bookvie --no-browser` in the background with Bash and then, because Claude Code connects to MCP servers only when a session starts, asks the user to reconnect the entry with `/mcp`. A `claude -p` run can't reconnect and has no user. So on any morning bookvie wasn't already open, the `bookvie` entry is failed for the whole run: `export_backup` and `record_backup_upload` are both missing, nothing is reported, and the line goes Stalled. The same step also needs the Bash tool (curl health, start bookvie), which the plist's "exactly the skill's tools" doesn't name, so the run would stop at a permission prompt. And a bookvie started inside the job is a child of launchd's job: when `claude` exits, launchd kills the job's process group by default (no `AbandonProcessGroup`), or, if it survives, it holds `bookvie.lock` and port 8765 with no terminal. Whether the job leaves bookvie running, stops it, or kills it is undecided.
- **Fix:** Move the start out of the skill and into the job. Decide: the plist runs `bookvie autobackup run` (a `cli.py` subcommand, production only), which checks `/api/health`, starts `bookvie --no-browser` when it doesn't answer and waits for health, then runs the resolved `claude -p "/bookvie-backup"` with the `--allowedTools`/`--disallowedTools` lists, then stops the server only when it started it (SIGTERM, the AD-5 shutdown) and exits with `claude`'s status. The skill's headless path never starts bookvie and needs no Bash. If bookvie can't start, `autobackup run` exits non-zero and the run shows as Stalled (or, better, it writes a `failed` report with cause `other` through the store directly, which is a decision to record). Add the test: the generated plist's `ProgramArguments` are `bookvie autobackup run` by absolute path.

### F2 [High] The headless tool list and the MCP entry names are an unfixed cross-story contract

- **Location:** AD-22 → The schedule ("`--allowedTools` listing exactly the skill's tools"), → Two processes; Consistency → Config.
- **Problem:** 13.3 writes the skill and 13.4 writes the plist; nothing says what the list is or which side owns it, so they will drift (a tool added to the skill makes the run stop at a prompt, which reads as Stalled). The tool names also depend on the names the user gives the entries in `claude mcp add`: the spine fixes `mcp__bookvie__` and `mcp__bookvie-dev__` (AD-8) but never the Dropbox entry's name, so `mcp__<?>__upload_backup` in the skill, the plist and the guide can differ. Finally, the Dropbox entry's command (`bookvie-dropbox serve`) runs from `~/.local/bin` (uv tool), which is on neither launchd's `PATH` nor necessarily the one Claude Code inherits from launchd, and the spine resolves only `claude`'s path.
- **Fix:** Fix in AD-22: the Dropbox entry is named `bookvie-dropbox`, added with `--scope user` and the absolute path of `bookvie-dropbox` (the guide's line prints it); the headless list is one constant in `cli.py`, exactly `mcp__bookvie__export_backup`, `mcp__bookvie__record_backup_upload`, `mcp__bookvie-dropbox__upload_backup` (plus `Skill` if the slash-command run needs it, checked by 13.4); the skill's `allowed-tools` frontmatter must equal it, and a test compares the two. The plist sets `EnvironmentVariables.PATH` to include the folder of the resolved `bookvie` and `claude`.

### F3 [High] The safety copy as written deadlocks on the store lock

- **Location:** AD-22 → Apply step 2 ("built and written like `export_backup`'s file", inside "one AD-4 lock hold"); AD-4; → `preview_restore` ("with the restore intent's own core, under the AD-4 lock").
- **Problem:** `Store.lock` is a `threading.Lock` (`store/store.py:250`), not reentrant. `build_export` takes it itself (`intents/export.py:71-80`), and so does `restore()` (`intents/restore.py`). A builder who follows "built like `export_backup`'s file" calls `build_export` inside the restore's hold and the tool hangs forever with the lock held, freezing every intent. `preview_restore` reusing "the restore intent's own core" has the same trap, since today the core and the lock are one function.
- **Fix:** Name the seams: `intents/export` gets a lock-free `write_export_zip(store, out)` (today's `_write_zip`) that `build_export` wraps; `intents/restore` splits into `stage_and_validate(store, archive)` and `apply_staged(store, staged)`, both "caller holds `store.lock`", with `restore()` wrapping them. `restore_backup` takes the lock once and calls stage, safety copy, apply; `preview_restore` takes it and calls stage only. Add a test with a timeout that `restore_backup` completes.

### F4 [Medium] Gate 2's seal: restart versus tamper is ambiguous, and the SDK has its own sealing boundary

- **Location:** AD-22 → Gate 2.
- **Problem:** (a) With a random per-process key, a token from before a restart fails verification exactly like a forged one, yet the rule maps restart to `expired` and a bad seal to `changed`. Two builders will pick different codes. (b) mcp 2.3.0 ships `mcp.server.request_state.RequestStateBoundary` (AES-GCM, its own expiry, a frozen -32602 "Invalid or expired requestState" protocol error), which its docstring tells low-level `Server` users to append to `server.middleware`. A builder who adds it gets a JSON-RPC error instead of `restore_not_confirmed`, and a double seal. (c) The seal covers the archive but not the current library, so a book added in a tab between the question and the accept makes the dialog's "will be lost" list false, which the plan's "Elicitation shows the truth" test is meant to prevent.
- **Fix:** State: bookvie seals by hand and does not install `RequestStateBoundary`. The token carries a clear process nonce plus the MAC; an unknown nonce is `expired`, a known nonce with a bad MAC is `changed`. Seal `{path, archive SHA-256, current library.json SHA-256, expiry}`; a moved library hash is `changed`.

### F5 [Medium] The backup time isn't on the injected clock

- **Location:** AD-22 → Backup time ("the `library.json` entry's time inside the zip (local; written by `build_export`)"); the safety copy's `<YYYY-MM-DDTHHMM>`.
- **Problem:** `_zip_time()` stamps `library.json` with `time.localtime()` (`intents/export.py:40-55`), the system clock, while the daily name uses the injected `Clock` (`backup_file.py`). Under `--fake-today` or a pytest fake clock, a backup named `bookvie-backup-2026-03-29.zip` carries today's real time, so `list_local_backups`, the preview's date and EXPERIENCE.md's "19 Nov, 09:02" disagree with the name, and tests on them can't be deterministic. The zip time also has 2-second resolution and no offset. The safety copy name's time source isn't stated.
- **Fix:** `build_export` takes the `Clock` and stamps the `library.json` entry with `clock.now()` (covers keep their mtimes); the safety copy's name uses the same `clock.now()`. State that a backup time is a local minute (no offset), shown as AD-20 formats it.

### F6 [Medium] The copied contracts miss names both packages need

- **Location:** AD-22 → Two processes (the pinned copies), → `download_backup`, → Allowed files.
- **Problem:** The pinned list is the daily name, `~/bookvie-backups`, the cause enum and the content hash. But `download_backup(target=bookvie-dev)` writes `~/bookvie-backups-dev/from-dropbox/`, and bookvie's allowed-files rule and `list_local_backups` read `from-dropbox/`: `bookvie-backups-dev` and `from-dropbox` are on both sides too, with no test tying them.
- **Fix:** Add `~/bookvie-backups-dev`, `from-dropbox` and the target names `bookvie`/`bookvie-dev` to the copied, test-compared list (bookvie's side is `intents/backup_file` `DEFAULT_BACKUPS_NAME`, `DEV_BACKUPS_NAME`).

### F7 [Medium] Existing AD sentences now contradict the new tools

- **Location:** AD-3 "Agent tools are a second way in"; AD-21 → Same handler, → Tools; AD-1.
- **Problem:** AD-3 says an agent write tool "is one intent call made in-process" and "No tool mutates through any other path"; AD-21 wants "a contract test per write tool" through the route, and every description "equals its text in `epics.md` Epic 12". `record_backup_upload` has no intent or route; `restore_backup` adds a gate and a safety copy around the handler; the Epic 13 tools' descriptions will live in Epic 13. AD-1 says the backup zip is "never read back except by a restore the user runs", but `record_backup_upload` and `list_local_backups` read zips. A reviewer applying AD-3 literally would reject 13.2.
- **Fix:** AD-3: "except the tool-only writers `export_backup` and `record_backup_upload` (AD-21, AD-22), which write only outside `library.json`, and `restore_backup`, which wraps the restore handler (AD-22)". AD-21: the contract test applies to tools with a route (`restore_backup` compares the applied result and refusals, as AD-22 says); descriptions come from `epics.md` Epic 12 or Epic 13. AD-1: "never read back except by a restore, the upload report's hash and the backups listing".

### F8 [Medium] Operational envelope gaps

- **Location:** AD-22 → The schedule, → Dropbox scope and sign-in, → `record_backup_upload`; Structural Seed (`pyproject.toml`).
- **Problem and fix**, one line each:
  - **Moved checkout or `claude` after install:** undecided at runtime. Decide: the job fails, nothing is reported, the line shows Stalled, and `bookvie autobackup install` again is the fix (the guide's Stalled entry).
  - **Reinstall:** say `install` over an existing job replaces the plist, re-resolves both paths and reloads it.
  - **Which checkout:** `WorkingDirectory` is the current folder, so an install from a worktree on a feature branch runs that branch's skill, and the checkout's `.claude/settings.json` (today the `tea-enforce` PreToolUse/PostToolUse/Stop hooks) runs in every headless job. Decide: install refuses a git worktree (or a non-`master` branch), and the job runs with `--setting-sources user` or the hooks are accepted.
  - **Logs:** name the files (`~/Library/Logs/bookvie/autobackup.log`, `.err`) in the rule, since the guide and the plist must agree.
  - **Keychain:** fix the `keyring` service and user names (one constant), which the guide's uninstall needs.
  - **`record_backup_upload` write failure:** AD-15 says a `local-state.json` write failure "is only logged, because the download already succeeded"; for a tool whose only effect is that write, decide `couldnt_save` (the skill can then say so) or logged-only.
  - **Packaging:** the wheel has `packages = ["bookvie"]`; shipping `bookvie_dropbox` in it needs `packages = ["bookvie", "bookvie_dropbox"]`, `dropbox` and `keyring` as runtime dependencies, and the install smoke test checking the `bookvie-dropbox` script.

### F9 [Low] Smaller points

- **Plan signatures superseded:** AD-22 changes D2 (`keep` gone), D9 (`{outcome, path, copies, cause}`) and D18 (`target`). Add "Where the plan differs, AD-22 wins" so 13.1, 13.2 and 13.7 don't build from the plan's signatures.
- **Gate 1 is advisory:** bookvie can't see it, and a session in bypass-permissions or auto mode may not prompt. State that Gate 2 is the only enforced gate and Gate 1 is the guide's setting.
- **`restore_outside_backups`:** say whether it carries `fields` on `path` (AD-9's 422 otherwise means `invalid_fields`).
- **Skip after a manual Dropbox delete:** `unchangedSinceUpload` keeps skipping if the user empties `.backups`. Record it as accepted (or have the skill check `list_backups`).
- **Trim:** AD-21 Mount's "Claude Code 2.1.330 negotiates MCP 2026-07-28 … checked 2026-11-21" is evidence; move it to the memlog or to Gate 2 as the decided minimum protocol. "The hash lets the skill show a backup that is on both sides as one row" and "so it survives the Dropbox round trip" are rationale and can go.

## What is already right

- The import wall (`bookvie` ↔ `bookvie_dropbox`, no `dropbox`/`keyring` under `bookvie/`) fits `test_layers.py`'s AST approach and is enforceable.
- `upload_backup`'s ordering (temp name, size and hash, rename, then prune by the parsed date), its path rule and the absence of a delete tool or a `keep` argument close D2/D3/D8 in code.
- The upload state's single writer that read-modify-writes its own group fixes the real trap in `Store.record_export`, which today writes `{lastExportAt}` alone and would wipe `autoBackup`.
- bookvie computing `unchangedSinceUpload` from `library.json`'s hash, and hashing the uploaded zip itself in `record_backup_upload`, keep the rule out of the skill.
- `views/backup` owning the five states, the 26-hour boundary and the future-time rule matches EXPERIENCE.md's Auto-backup line; the client only formats.
- The new AD-9 codes, the `reason` set and the UI route left unchanged are decided and consistent with AD-14.
