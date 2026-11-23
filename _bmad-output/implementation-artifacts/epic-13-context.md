# Epic 13 Context: Back up to Dropbox, and restore through an agent

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give Oleg an off-machine copy of his library and a safe way back from a bad day. When he runs the `bookvie-backup` skill by hand, the library goes to bookvie's own Dropbox App folder: 3 copies, the oldest deleted only after a checked upload, an unchanged library skipped, and a development library never uploaded. The Backup page says in words how the last Dropbox backup went. An agent can restore from a backup on this computer or in Dropbox, but only after showing what the restore will lose, passing two confirmations it can't skip, and saving a safety copy first. Setup and a fix for each failure ship in `docs/dropbox-backup.md`. There is no scheduled run: the 09:00 launchd job was dropped on 2026-11-23 because the managed Mac's policy forbids user LaunchAgents.

## Stories

- Story 13.1: Restore my library through an agent, with two confirmations (done)
- Story 13.2: Upload a backup to my Dropbox (done)
- Story 13.3: Record each upload in bookvie (done)
- Story 13.4: Back up to Dropbox with one skill (done)
- Story 13.5: Take out the morning job
- Story 13.6: See on the Backup page how the last Dropbox backup went
- Story 13.7: Fetch a backup from my Dropbox
- Story 13.8: Restore with one skill, from this computer or Dropbox

## Requirements & Constraints

- **Backup by hand only.** No schedule, no headless run, no `bookvie autobackup` command, no launchd, no `launchd_probe`, no 26-hour or "Stalled"/"Waiting" states. "Daily backup" survives only as the file kind (`bookvie-backup-<YYYY-MM-DD>.zip`).
- **Three copies, verify then prune.** Dropbox keeps the last 3 daily backups; the oldest is deleted only after the new upload's size and content hash check out; any failure deletes nothing. A same-day rerun replaces that day's copy only once the new one checks out. An unchanged library uploads nothing and reports a skip.
- **bookvie's folder only.** Nothing outside `/Apps/bookvie/.backups/` is read or deleted; no delete tool. The refresh token lives only in the macOS Keychain, never in a log, tool result, export or the repo.
- **Never from development.** `upload_backup` accepts only a daily-named regular file directly in `~/bookvie-backups/`; dev backups never upload.
- **Uploads aren't exports.** An upload never moves "Last export"; `export_backup({forUpload: true})` doesn't record it; a manual export never moves the upload state; a restore touches neither.
- **Restore safety.** The user always picks the backup (agent may suggest newest, never picks). Restore is only from the backups folder or its `from-dropbox/`. Two gates: Claude Code's `ask` permission rule, then bookvie's own MCP form elicitation; anything but an explicit yes changes nothing. A safety copy is written first; if it fails, nothing is restored. The agent never retries a refused or unconfirmed restore by itself. The backup run can never restore.
- **Tool descriptions.** Each new tool's registered description (in `bookvie` and `bookvie-dropbox`) equals the text its story quotes under "Description:"; a test enforces it. Changing a description means changing `epics.md` first. Delete tools and the plain `restore` stay unregistered (`AGENT_TOOL_NAMES`).
- **Docs ship with code.** Each story adds its part of `docs/dropbox-backup.md`; a pytest checks the guide's `bookvie`/`bookvie-dropbox` commands against the CLI and that every Dropbox-line failure cause has a troubleshooting entry with its exact wording. README → Agent tools links the guide; README → AI skills lists both skills.
- **Gate:** per-epic gates (P0 100%, P1 ≥ 95%, every error code tested, `check:api` clean), coverage ≥ 90% on `bookvie_dropbox/` and on `agent/`'s restore path. No test touches the network, the real Keychain, `~/bookvie-data` or a real backups folder (temporary `HOME`; `_on_the_machine` refuses off-machine connections). Manual runs (13.1 gate 2, 13.4 first run, 13.8 restores) are recorded in their specs; a story whose manual AC isn't recorded stays in review.
- If gate 2 can't be shown in the Claude Code terminal CLI, 13.7 and 13.8 stop for Oleg's decision.

## Technical Decisions

- **Two processes.** `bookvie_dropbox` (console script `bookvie-dropbox` with `auth` and `serve`) is a stdio MCP server in the same wheel. `bookvie` and `bookvie_dropbox` never import each other; nothing under `bookvie/` imports `dropbox` or `keyring` (`test_layers.py`). They meet only in the skills, through files in a backups folder. The `dropbox` SDK sits behind a `DropboxApi` seam; tests use a fake.
- **Copied contracts** (one copy each side, a test compares): the daily-name regex `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$` with a valid date; the backups folders and their `from-dropbox/`; the cause enum `dropbox_signin`, `upload_incomplete`, `dropbox_full`, `backup_write`, `other`; the Dropbox content hash (SHA-256 of per-4-MiB-block SHA-256s, stdlib).
- **Dropbox tools:** `upload_backup(localPath)` → `{name, copies, deleted, contentHash}`; `list_backups()`; `download_backup(name, target)` with target `bookvie` or `bookvie-dev`, atomic write only after the hash matches (failures `dropbox_signin`, `download_incomplete`, `other`).
- **Upload state** in `local-state.json` under the historical key `autoBackup: {lastReport, lastOk, lastUpload}` (keep the name; renaming breaks existing state). One writer in `store/local_state` with its own lock, read-modify-writing only its group. Timestamps come from the server `Clock`, never the agent. `record_backup_upload({outcome, path?, copies?, contentHash?, cause?})` is a tool-only writer; bookvie checks the zip's hash and stores the `library.json` fingerprint itself; `export_backup` returns `libraryHash` and `unchangedSinceUpload`.
- **Dropbox backup line data** (`views/backup`): `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}`, `state` ∈ `dev`, `none`, `uploaded`, `skipped`, `failed`, computed on the server (`dev` on a `--dev` server regardless of state; `none` when no report or unreadable state; else latest outcome). `lastUploadAt` is the upload's `backupAt`. Client only formats. Pydantic model, then `npm --prefix frontend run api:gen`.
- **Backup time** is one `Clock` instant: it names the daily file, gives `createdAt`, and stamps the zip's `library.json` entry; tools report ISO-8601 with an offset.
- **Restore tools** (`agent/`): `list_local_backups`, `preview_restore(path)`, `restore_backup(path)`. Path checks happen before any read (422 `restore_outside_backups`). Gate 2 is MCP 2026-07-28 elicitation over the stateless JSON mount with a hand-sealed HMAC `requestState` (5-minute expiry, single-use nonce, path and hashes); failures are 409 `restore_not_confirmed` with `reason` (`declined`, `cancelled`, `unsupported`, `expired`, `changed`). Apply runs in one hold of the store lock using lock-free cores (`write_export_zip`, `stage_and_validate`, `apply_staged`); safety copy `bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip` (`-2`, `-3`…); failure 503 `safety_copy_failed`. `POST /api/intents/restore` is unchanged; a contract test compares tool and route. Safety copies and `from-dropbox/` files are never pruned or uploaded.
- **Skills:** `bookvie-backup` (`get_app_info`, `export_backup({forUpload: true})`, `upload_backup` unless unchanged, always `record_backup_upload`; only `mcp__bookvie__` and `mcp__bookvie-dropbox__` tools; run by hand). `bookvie-restore` (lists both sources, one row per content hash, downloads a Dropbox pick, previews, asks in chat, calls `restore_backup`, uses `bookvie-dev` tools when working on development).
- When the dropbox plan (`dropbox-backup-plan-2026-11-21.md`) and the spine differ, spine AD-22 wins.

## UX & Interaction Patterns

- **Dropbox backup line** (Backup page Export card, a second `meta` line directly under "Last export"; never on Home). Pattern "Dropbox backup: *detail*"; first match wins: Dev "never from a development server"; None "none yet · run /bookvie-backup in Claude Code"; Failed "failed *when* · *reason and fix*" plus " Last upload *when*." if any; Uploaded "last upload today at 09:02 · 3 copies in Dropbox"; Skipped "checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox". Failed in `ink`, others `ink-tertiary`; text only (no icon, badge, tint); commands in body font; not a control, link, Tab stop or live region; refetch on focus, unannounced. When: "today at", "yesterday at", "on 19 Nov", "19 Nov 2025" outside the current year, 24-hour local time; "1 copy"/"N copies".
- **Failure reasons by cause:** `dropbox_signin` "Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal."; `upload_incomplete` "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again."; `dropbox_full` "Dropbox is full. Nothing in Dropbox was deleted; free some space there."; `backup_write` and `other` point to `docs/dropbox-backup.md → Troubleshooting`.
- **Backup run report** (chat, one line): "Uploaded *name* · N copies in Dropbox, deleted *name*", "Nothing new since the last upload; skipped.", "Failed: *reason and fix*".
- **Restore in chat:** a numbered pick list newest first (10 newest, then "and N older. Say show all to see them.", "The newest is 1. Which one?"), a preview with "This backup:"/"Now:" counts and what would be lost (up to 5 titles then "and N more"), the skill's own chat question, then bookvie's plain-text one-paragraph confirmation, then a one-line outcome per code, paths written with `~`. Exact wording lives in EXPERIENCE.md → Agent conversations → Restore.

## Cross-Story Dependencies

- 13.1–13.4 are done; their tools, upload state and skill stay as built.
- 13.5 is a removal: it deletes the `autobackup` CLI subcommands, `create_app`'s `launchd_probe`, `AutoBackupView`/`BackupView.auto_backup` (then `api:gen`), `test_autobackup.py` and the job's docs, and rewords the `bookvie-backup` skill, the guide, the README and EXPERIENCE.md's failed-reasons note. The `autoBackup` stored group, `record_backup_upload` and `unchangedSinceUpload` must behave exactly as before.
- 13.6 runs after 13.5 is `done` and adds `dropboxBackup` to the slimmed `views/backup`, plus one guide troubleshooting entry per cause.
- 13.7 (`list_backups`, `download_backup`) feeds 13.8's `bookvie-restore` skill, which also builds on 13.1's restore tools. Both depend on 13.1's gate 2 working in the terminal CLI.
- Epic 12's MCP mount (stateless JSON, MCP 2026-07-28) and `export_backup` are the foundation for every tool here.
