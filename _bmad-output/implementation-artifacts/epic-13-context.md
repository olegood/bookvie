# Epic 13 Context: Back up to Dropbox, and restore through an agent

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give Oleg an off-machine copy of his library and a safe way back from a bad day. When he runs the `bookvie-backup` skill by hand, the library goes to bookvie's own Dropbox App folder: 3 copies, the oldest deleted only after a checked upload, an unchanged library skipped, and a development library never uploaded. The Backup page says in words how the last Dropbox backup went. An agent can restore from a backup on this computer or in Dropbox, but only after showing what the restore will lose, passing two confirmations it can't skip, and saving a safety copy first. Setup and a fix for each failure ship in `docs/dropbox-backup.md`. There is no scheduled run: the 09:00 launchd job was dropped on 2026-11-23 because the Mac's administration policy forbids it.

## Stories

- Story 13.1: Restore my library through an agent, with two confirmations
- Story 13.2: Upload a backup to my Dropbox
- Story 13.3: Record each upload in bookvie
- Story 13.4: Back up to Dropbox with one skill
- Story 13.5: Take out the morning job
- Story 13.6: See on the Backup page how the last Dropbox backup went
- Story 13.7: Fetch a backup from my Dropbox
- Story 13.8: Restore with one skill, from this computer or Dropbox

## Requirements & Constraints

- **Backup by hand only.** No schedule, headless run, `bookvie autobackup` command, launchd, `launchd_probe`, time-out or 26-hour rule. "Daily backup" survives only as the file kind (`bookvie-backup-<YYYY-MM-DD>.zip`).
- **Three copies, verify then prune.** The oldest Dropbox copy is deleted only after the new upload's size and content hash check out; any failure deletes nothing. A same-day rerun replaces that day's copy only once the new one verifies. An unchanged library uploads nothing and records a skip.
- **bookvie's folder only.** Nothing outside `/Apps/bookvie/.backups/` is read or deleted; no delete tool. The refresh token lives only in the macOS Keychain, never in a log, tool result, file or the repo.
- **Never from development.** `upload_backup` accepts only a daily-named regular file directly in `~/bookvie-backups/`.
- **Uploads aren't exports.** A recorded upload never moves "Last export", a manual export never moves the Dropbox line, a restore moves neither.
- **Restore safety.** The user always picks the backup (the agent suggests the newest, never picks). Restore only from the backups folder or its `from-dropbox/`. Two gates: Claude Code's `ask` permission rule, then bookvie's own form elicitation; anything but an explicit yes changes nothing. A safety copy is written first; if it fails, nothing is restored. The agent never retries a refused or unconfirmed restore by itself.
- **Tool descriptions.** Each new tool's registered description (in `bookvie` and `bookvie-dropbox`) equals its story's "Description:" text, enforced by a test. Changing one means changing `epics.md` first. Delete tools and plain `restore` stay unregistered (`AGENT_TOOL_NAMES`).
- **Docs ship with code.** Each story adds its part of `docs/dropbox-backup.md`; a pytest checks the guide's `bookvie`/`bookvie-dropbox` commands against the CLI and that every failure cause has a troubleshooting entry quoting the line's exact words. README links the guide and lists both skills.
- **Gate:** per-epic gates, coverage ≥ 90% on `bookvie_dropbox/` and `agent/`'s restore path, P0 risks green against fakes (including the Dropbox line's states). No test touches the network, the real Keychain, `~/bookvie-data` or a real backups folder (temporary `HOME`). Manual runs (13.1 gate 2, 13.4 first run, 13.8 restores) are recorded in their specs; a story whose manual AC isn't recorded stays in review.

## Technical Decisions

- **Two processes.** `bookvie_dropbox` (console script `bookvie-dropbox`: `auth`, `serve`) is a stdio MCP server in the same wheel. `bookvie` and `bookvie_dropbox` never import each other; nothing under `bookvie/` imports `dropbox` or `keyring` (`test_layers.py`). They meet only in the skills, through files in a backups folder. The Dropbox SDK sits behind a `DropboxApi` seam; tests use a fake.
- **Copied contracts** (one copy per side, a test compares): daily-name regex `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$` with a valid date; the backups folders and `from-dropbox/`; the cause enum `dropbox_signin`, `upload_incomplete`, `dropbox_full`, `backup_write`, `other`; the Dropbox content hash (stdlib).
- **Upload state** in `local-state.json` under the historical key `autoBackup: {lastReport: {outcome, at, cause?}, lastOk, lastUpload: {at, backupAt, name, copies, libraryHash}}`; keep the name. One writer in `store/local_state` with its own lock, read-modify-writing only its group. Times come from the server `Clock`.
- **Dropbox backup line data:** `views/backup` carries `lastExportAt` and `dropboxBackup: {state, reportAt, lastUploadAt, copies, cause}` (Pydantic, then `npm --prefix frontend run api:gen`). Server computes `state`, first match wins: `dev` on a `--dev` server whatever is stored; `none` when no report or state missing/unreadable; else the latest report's outcome (`failed`, `uploaded`, `skipped`). `reportAt` = `lastReport.at`; `lastUploadAt` = upload's `backupAt`; `copies` = last upload's count (a skip keeps it). The client only formats.
- **Restore tools** (`agent/`): `list_local_backups`, `preview_restore(path)`, `restore_backup(path)`. Path checks before any read (422 `restore_outside_backups`). Gate 2 is MCP 2026-07-28 form elicitation with a hand-sealed HMAC `requestState`; failures are 409 `restore_not_confirmed` with `reason` (`declined`, `cancelled`, `unsupported`, `expired`, `changed`). Safety copy `bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`; failure 503 `safety_copy_failed`. `POST /api/intents/restore` is unchanged.
- **Dropbox tools:** `upload_backup` → `{name, copies, deleted, contentHash}`; `list_backups` → `{name, backupTime, size, contentHash}` from `client_modified`; `download_backup(name, target)` with target `bookvie` or `bookvie-dev`, into `from-dropbox/` via temp file, fsync and rename only after the hash matches (causes `dropbox_signin`, `download_incomplete`, `other`).
- **Skills:** `bookvie-backup` (run by hand: `get_app_info`, `export_backup({forUpload: true})`, `upload_backup` unless `unchangedSinceUpload`, always one `record_backup_upload`). `bookvie-restore` (lists both sources, one row per content hash, downloads a Dropbox pick, previews, asks in chat, then `restore_backup`; `bookvie-dev` tools for development).
- Where `dropbox-backup-plan-2026-11-21.md` and the spine differ, spine AD-22 wins.

## UX & Interaction Patterns

- **Dropbox backup line:** a second `meta` line in the Backup page's Export card, directly under "Last export"; never on Home. First match wins:
  - Dev: "Dropbox backup: never from a development server"
  - None: "Dropbox backup: none yet · run /bookvie-backup in Claude Code"
  - Failed: "Dropbox backup: failed *when* · *reason and fix*", then " Last upload *when*." only if there has been an upload
  - Uploaded: "Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox"
  - Skipped: "Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox"
- **When:** "today at 09:02", "yesterday at 09:02", otherwise "on 19 Nov" ("19 Nov 2025" outside the current year); local calendar days, 24-hour time, recomputed on focus. "1 copy" / "N copies". No time-out: the line never becomes a warning as time passes.
- **Failed reasons** (after "failed *when* · "): `dropbox_signin` "Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal."; `upload_incomplete` "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again."; `dropbox_full` "Dropbox is full. Nothing in Dropbox was deleted; free some space there."; `backup_write` "bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting."; `other` "the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting." `tests/helpers.py`'s `failing_reasons` reads this table from EXPERIENCE.md by its header.
- **Look and behavior:** Failed in `ink`, every other state `ink-tertiary`; text only (no dot, icon, badge, tint, color); commands in the body font. Not a control, link, Tab stop or live region; refetched on focus without announcement. Part of `views/backup`, so a load failure is the page's usual "Couldn't load". axe passes in both themes.
- **Backup run report** (chat, one line): "Uploaded *name* · N copies in Dropbox, deleted *name*", "Nothing new since the last upload; skipped.", "Failed: *reason and fix*".
- **Restore in chat:** numbered pick list, newest first ("date, time · kind · where · size"; 10 newest, then "and N older. Say show all to see them."; "The newest is 1. Which one?"); "Couldn't reach Dropbox: *reason*." or "No backups found on this computer or in Dropbox. Nothing was changed."; a preview with "This backup:"/"Now:" counts, what would be lost (up to 5 titles then "and N more"), the "Everything else changed since…" line and the safety-copy line; the skill's own chat question; then bookvie's plain-text one-paragraph confirmation; then a one-line outcome per code, paths with `~`. Backups are named by date and time ("19 Nov, 09:02"). Exact wording: EXPERIENCE.md → Agent conversations → Restore.

## Cross-Story Dependencies

- 13.1–13.5 are done; their tools, upload state and skill stay as built. 13.5 removed the job, `launchd_probe` and `AutoBackupView`, leaving `views/backup` with only `lastExportAt`.
- 13.6 adds `dropboxBackup` to that slimmed view, the frontend line, and one guide troubleshooting entry per cause. It relies on 13.3's `record_backup_upload` and stored `autoBackup` group behaving unchanged.
- 13.7 (`list_backups`, `download_backup`) feeds 13.8's `bookvie-restore` skill, which also builds on 13.1's restore tools; downloaded files must list as `from_dropbox` with the same `contentHash`. If 13.1's gate 2 can't be shown in the terminal CLI, 13.7 and 13.8 stop for Oleg's decision.
- Epic 12's MCP mount (stateless JSON, MCP 2026-07-28) and `export_backup` underlie every tool here.
