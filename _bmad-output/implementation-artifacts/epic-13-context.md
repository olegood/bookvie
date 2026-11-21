# Epic 13 Context: Back up to Dropbox every day, and restore through an agent

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give the library an off-machine copy and a safe way back. An agent can restore the library from a backup on this computer or in Dropbox, but only after the user has seen what the restore will lose and passed two confirmations the agent can't skip, and only after bookvie saves a safety copy of the current library. Every morning at 09:00, with nothing open, a launchd job uploads the library to bookvie's own Dropbox App folder. It keeps 3 copies, deletes the oldest only after a checked upload, skips an unchanged library and never uploads a development library. The Backup page says in words whether auto-backup is Off, Waiting, On, Failing or Stalled. Restore comes first (13.1) because its second gate, bookvie's own elicitation, is the part nobody has yet seen work.

## Stories

- Story 13.1: Restore my library through an agent, with two confirmations
- Story 13.2: Upload a backup to my Dropbox
- Story 13.3: Record each upload in bookvie
- Story 13.4: Back up to Dropbox with one skill
- Story 13.5: Run the backup every morning
- Story 13.6: See on the Backup page whether auto-backup works
- Story 13.7: Fetch a backup from my Dropbox
- Story 13.8: Restore with one skill, from this computer or Dropbox

## Requirements & Constraints

- **Data safety:** no agent tool deletes a Book or Card note (`delete_book`, `delete_card_note`, `set_spine_color`, `restore` stay unknown tools). A restore needs both confirmations and a safety copy. The daily run can never restore. The daily backup deletes only bookvie's older Dropbox daily backups, and only after a verified upload.
- **Uploads aren't exports:** the daily run never moves "Last export", a manual export never moves the upload state, and a restore touches neither. The upload state belongs to this computer and is never exported.
- **Local-first:** the bookvie process never calls Dropbox or holds Dropbox credentials. The Dropbox backup is optional and macOS only. Dropbox is the only provider, and the folder and copy count are fixed.
- **Tool descriptions:** each new tool's registered description, in `bookvie` and `bookvie-dropbox`, must equal the text quoted under "Description:" in its story in `epics.md`, and a test under `backend/tests/` enforces it (the `bookvie-dropbox` test reads the tool list through its stdio server). To change a description, change `epics.md` first.
- **Tests:** none may touch the network, the real Keychain, `~/bookvie-data` or a real backups folder. Every test's `HOME` is temporary. Dropbox goes through a fake `DropboxApi`, and `launchctl` and the clock go through seams.
- **Gate:** per-epic quality gates, plus at least 90% coverage on `bookvie_dropbox/` and on `agent/`'s restore path. The plan's P0 risks must be green against fakes: verify then prune, prune scope, same-day rerun, dev refusal, token, skip reports, the states on either side of 26 hours, gates fail closed, the confirmation shows the truth, safety copy, allowed folders, same handler, `download_backup`, headless can't restore, still banned.
- **Manual runs** (13.1 gate 2, 13.4 first run, 13.5 install plus a headless run awake and after wake, 13.8 restores) are recorded in their specs. A story whose manual AC isn't recorded stays in review.
- **Docs ship with the code:** `docs/dropbox-backup.md` grows story by story (setup, how it works, troubleshooting, restoring). A pytest checks that every `bookvie` and `bookvie-dropbox` subcommand and flag in its code blocks exists in the CLI, and that every auto-backup state and Failing cause has a troubleshooting entry with the exact wording. The README gets an Agent tools paragraph and lists both skills under AI skills.
- Standard intent ACs (filesystem fault gives `couldnt_save` with the library unchanged, invariants hold, new error codes tested) apply to the new writers.

## Technical Decisions

- **Two processes:** `backend/bookvie_dropbox/` (console script `bookvie-dropbox auth|serve`, same wheel, packages `["bookvie", "bookvie_dropbox"]`) is a stdio MCP server that Claude Code starts, added with `--scope user` and an absolute command path. `bookvie/` never imports `bookvie_dropbox`, `dropbox` or `keyring`, and `bookvie_dropbox` never imports `bookvie` (enforced in `test_layers.py`). They meet only in skills, through files in a backups folder. `dropbox` 12.2.x and `keyring` 25.7.x are pinned after a fresh PyPI check. `mcp` 2.3.x supplies `InputRequiredResult`.
- **Copied contracts** exist once on each side, and a test compares the copies:
  - the daily-name regex `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$`, with a valid calendar date;
  - the folders `~/bookvie-backups` and `~/bookvie-backups-dev`, with their `from-dropbox/`;
  - the cause enum `dropbox_signin | upload_incomplete | dropbox_full | backup_write | other`;
  - the Dropbox content hash: SHA-256 over the per-4-MiB-block SHA-256s, stdlib only.
- **Backup time:** one `clock.now()` stamps the zip's `library.json` entry and names the daily backup, `createdAt` and the safety copy. Times are reported as ISO-8601 with an offset, and an older zip's entry time is read as local time.
- **Backups folder:** only `~/bookvie-data` writes into `~/bookvie-backups`. A non-default data folder whose sibling rule would land on either default folder gets `backups_dir = None`.
- **Restore tools (bookvie, 13.1):**
  - `list_local_backups`, `preview_restore(path)` and `restore_backup(path)`.
  - A path must resolve to a regular file directly in the backups folder or its `from-dropbox/`, with a daily or safety-copy name (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>[-N].zip`). Anything else is 422 `restore_outside_backups` (no `fields`), refused before the file is read.
  - Preview refusals are the restore intent's codes (`restore_invalid`, `restore_unsafe`, `restore_newer_version`).
- **Gate 1** is Claude Code's `permissions.ask` rule on `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup`, set in user settings. bookvie can't see it.
- **Gate 2** is MCP 2026-07-28 form elicitation on the stateless `/mcp` mount:
  - **Unsupported first:** a connection below 2026-07-28, or a client without form elicitation, is `unsupported`, checked before any preview is built. An empty `elicitation` object counts as form.
  - **The question:** a call with no input responses returns an `InputRequiredResult` with one form elicitation.
  - **The token:** the `requestState` is sealed by hand with HMAC-SHA256 under a per-process key. It holds a process nonce, a single-use nonce, the resolved path, the archive SHA-256, the `library.json` SHA-256 and a 5-minute expiry. Don't install the SDK's `RequestStateBoundary`.
  - **The answer:** anything but an explicit accept is 409 `restore_not_confirmed` with `reason` `declined`, `cancelled`, `unsupported`, `expired` (time passed or restart) or `changed` (bad MAC, reused nonce, path elsewhere, library or archive moved). Nothing changes.
- **Apply runs in one hold of the store lock:**
  1. Read the file once into the staging spool and check its SHA-256 against the sealed hash.
  2. Stage and validate.
  3. Write the safety copy with `write_export_zip` and the atomic write. Never use `build_export`, `write_backup` or `record_export`. A failure is 503 `safety_copy_failed` (kind `couldnt_save`) and nothing is restored.
  4. Run `apply_staged` in the AD-12 order.
  - It returns `{restoredFrom, backupTime, safetyCopy}`.
  - The store lock isn't reentrant, so `write_export_zip`, `stage_and_validate` and `apply_staged` are lock-free cores that `build_export` and `restore()` wrap. A test with a timeout proves the restore finishes.
  - `local-state.json` stays byte-identical, and `lastExportAt` doesn't move.
  - `POST /api/intents/restore` is unchanged. A contract test compares the tool with the route.
- **Dropbox tools (only these, and no delete tool):**
  - `upload_backup(localPath)` accepts only a daily name directly in `~/bookvie-backups/` and refuses anything else before any network call. It uses a chunked session finished to the final name with `WriteMode.overwrite`, the whole-file `content_hash` and `client_modified` set to the backup time in UTC. It verifies `size` and hash, then prunes the oldest beyond 3 by the date parsed from the name, never the name it just wrote. Returns `{name, copies, deleted, contentHash}`.
  - `list_backups()` returns `{name, backupTime, size, contentHash}` for each daily backup.
  - `download_backup(name, target)` takes `target` `bookvie` or `bookvie-dev` and writes into that folder's `from-dropbox/` (temp file, fsync, rename, only after the hash matches). Its failures are `dropbox_signin`, `download_incomplete` or `other`.
  - The app is an App-folder app, and backups live in `/Apps/bookvie/.backups/`.
  - `auth` uses OAuth PKCE with no secret through a fixed loopback port. The refresh token is stored only in the Keychain (service `bookvie-dropbox`, account `refresh-token`). No token appears in output or logs.
- **Upload state:** stored in `local-state.json` as `autoBackup: {lastReport{outcome, at, cause?}, lastOk{at, outcome}, lastUpload{at, backupAt, name, copies, libraryHash}}`.
  - `at` always comes from the Clock.
  - A failure replaces `lastReport`; a skip replaces `lastReport` and `lastOk`; an upload replaces all three.
  - One writer under its own `threading.Lock` (not the store lock) read-modify-writes only the group it changes. `local_state_bytes` goes away.
- **Unchanged check:** `export_backup({forUpload: true})` skips `lastExportAt` and returns `libraryHash` (SHA-256 of `library.json`) and `unchangedSinceUpload`. bookvie compares, and the skill only branches on the flag.
- **`record_backup_upload({outcome, path?, copies?, contentHash?, cause?})`:** for an upload, bookvie re-hashes the zip itself. Bad arguments are `invalid_fields`, and a write failure is `couldnt_save`.
- **Schedule:** `bookvie autobackup install|uninstall|run` are production only and refused with `--dev`.
  - **Install:** refuses a git worktree or a folder without `.claude/skills/bookvie-backup/SKILL.md`. It writes the plist with one label constant (shared with the probe), a 09:00 `StartCalendarInterval`, `PATH` set from the resolved binaries, and logs in `~/Library/Logs/bookvie/`.
  - **Run:** starts `bookvie --no-browser` if health doesn't answer, then runs `claude -p "/bookvie-backup"`. It SIGTERMs only a server it started.
  - **Tool lists:** `--allowedTools` is one constant of MCP names (never Bash) and equals the skill's frontmatter. `--disallowedTools` names both `restore_backup` tools.
- **Auto-backup view:** `views/backup` gains `autoBackup{state, offReason, reportAt, lastOkAt, lastUploadAt, copies, cause}`, computed on the server (Pydantic, then `api:gen`).
  - States are checked first match wins: `off` (`dev`, `other_library`, `not_installed`), `waiting`, `on`, `failing`, `stalled`.
  - A report is Stalled after 26 h. Exactly 26 h is not stalled, and a future report counts as now.
  - Installed status comes from the `launchd_probe` seam, which reads only the exit status of `launchctl print` with a short timeout. Any error reads as not installed.

## UX & Interaction Patterns

- **Auto-backup line:**
  - A second `meta` line under "Last export" in the Export card, never on Home.
  - Its pattern is "Auto-backup: *State* · *detail*", using the exact strings for each state and Failing cause.
  - Off, Waiting and On are `ink-tertiary`; Failing and Stalled are `ink`. No icon, dot, badge or tint, and commands stay in the body font.
  - It is plain text: not a control, link, Tab stop or live region. It refreshes on focus without being announced.
  - Times read "today at 09:02", "yesterday at 09:02", "on 19 Nov" or "19 Nov 2025". Copies read "1 copy" or "N copies".
- **Backup skill report:** one line: "Uploaded *name* · N copies in Dropbox, deleted *name*", "Nothing new since the last upload; skipped." or "Failed: *reason and fix*".
- **Restore conversation (13.8):**
  - **Pick list:** newest first, one row per content hash, the 10 newest then "and N older…", ending "The newest is 1. Which one?". The skill never picks.
  - **Preview:** the counts, the Books added since (up to 5 titles then "and N more"), the "Everything else changed since…" line and the safety-copy line. Then the skill asks in its own words; that chat question is not a gate.
  - **Outcomes:** exact sentences for each code, paths written with `~`, and the terminal-CLI advice only for `unsupported`. A refused or unconfirmed restore is never retried.
- **Gate 2 message:** one plain-text paragraph, no markdown: "Replace all data with the backup from *date, time*? You'd lose N books added since (*titles*), N card notes, and every other change since then. A safety copy of your current library is saved first." When nothing was added, the middle sentence is replaced with "Every change since then goes back, such as pages reached."
- **Supported clients:** the Claude Code terminal CLI only. VS Code, the desktop app and `claude -p` fail closed.

## Cross-Story Dependencies

- **Before 13.1:** resolve any unresolved "spine drift" entry in `deferred-work.md`.
- **If gate 2 fails in 13.1** (the terminal CLI can't show bookvie's question), 13.7 and 13.8 stop for Oleg's decision, and 13.2–13.6 go on.
- **13.1** defines the content hash, the folder and name rules, and `list_local_backups`. 13.2 copies and compares them, and 13.7's downloads must list as `from_dropbox` with matching hashes.
- **13.3** replaces Story 12.6's `export_backup` description and needs 13.2's cause enum.
- **13.4** needs 13.2 and 13.3.
- **13.5** runs the 13.4 skill and supplies the probe that 13.6 reads.
- **13.8** needs 13.1 and 13.7.
- **Each new tool list** is the previous one plus the story's tools: bookvie's `AGENT_TOOL_NAMES` is Epic 12's tools plus the restore tools plus `record_backup_upload`, and `bookvie-dropbox` ends with exactly `upload_backup`, `list_backups` and `download_backup`.
- **Precedence:** where the plan (`dropbox-backup-plan-2026-11-21.md`) and spine AD-22 differ, AD-22 wins, and `epics.md` is authoritative for the ACs.
