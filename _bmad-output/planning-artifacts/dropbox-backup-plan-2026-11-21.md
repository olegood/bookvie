---
title: Daily backup to Dropbox, and restore through an agent — plan
status: agreed
created: 2026-11-21
updated: 2026-11-21 (restore added: D13–D20, Stories 13.1, 13.7, 13.8; mechanics superseded by spine AD-22, see §6; stories renumbered restore-first, see §6)
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: GitHub issue #7 → "Daily backup to Dropbox"
---

# Daily backup to Dropbox, and restore through an agent — plan

Back up the library once a day and upload it to Dropbox, so a copy exists off this machine without exporting by hand. A launchd job runs a new `bookvie-backup` skill headless every morning. The skill writes the backup with bookvie's `export_backup` and uploads it through a small Dropbox MCP server of our own, which verifies the upload and keeps the last 3 copies. The Backup page shows whether auto-backup is on and working.

A second skill, `bookvie-restore`, restores the library from a Dropbox or local backup, with a human in the loop: it shows what the restore will lose, and two gates the model can't skip (a Claude Code permission prompt and the server's own confirmation dialog) must both be accepted. A safety copy of the current library is written first.

## 1. What already exists

- **`export_backup`** (Story 12.6, spine AD-21): an agent tool that writes `bookvie-backup-YYYY-MM-DD.zip` (the same zip as `GET /api/export`: `library.json` and `covers/`) into `~/bookvie-backups` (`~/bookvie-backups-dev` with `--dev`, `<data folder>-backups` otherwise), returns `{path, size, createdAt}`, and records `lastExportAt` in `local-state.json`. A second backup on the same day replaces that day's file (`backend/bookvie/intents/backup_file.py`).
- **Size.** `~/bookvie-data` is about 73 MB on 2026-11-21, almost all of it `covers/`, and it grows. A single Dropbox upload request is capped at 150 MB.
- **No Dropbox MCP is configured.** Dropbox's official MCP server (`https://mcp.dropbox.com/mcp`) is remote: it can't read the local disk, so a file would have to pass through tool arguments, and its help pages list only ListFolder, Sign and Paper tools. Community local servers exist; some take a `local_path`, others only base64.
- **The skills** `bookvie-new-book` and `bookvie-notes-summary` check `/api/health` and start `bookvie` when it isn't running, then use the bookvie MCP tools (Epic 12).
- **The Backup page** shows "Last export" from `views/backup`.
- **Restore** is the intent `POST /api/intents/restore` (`intents/restore.py`, AD-4, AD-14): under one lock it stages and validates the whole archive (zip safety, schema version and migration, every referenced cover decodable) before `Store.replace_all`. It writes no pre-restore backup ("the archive is the backup") and never touches `local-state.json`.
- **Restore is banned from MCP today** (Epic 12 plan D6, spine AD-21), with delete-book and delete-card-note. This plan lifts the ban for restore only (D13).
- **MCP elicitation**: Claude Code's terminal CLI shows a server's elicitation request as a dialog. There are reports of it auto-declining in VS Code and in print mode; Story 13.1 checks the current behavior and the SDK's API, not from memory.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Our own local Dropbox MCP server**, in this repo: a small stdio server (Python, `uv`) that Claude Code starts. It reads the zip from disk by path and calls the Dropbox API itself. No file bytes pass through the model. | Oleg's call (a2). The official server can't see the disk; 73 MB of base64 in tool arguments isn't possible (Amelia). A community package would hold a Dropbox write token with read access to the home folder (Mary). |
| D2 | *(Mechanics superseded by AD-22, §6.)* **Retention lives in code, in one tool: `upload_backup(local_path, keep=3)`.** It uploads under a temporary name with a chunked upload session, checks that Dropbox's `size` and `content_hash` match the local file, renames it to its final name, and **only then** deletes the oldest `bookvie-backup-*.zip` beyond 3. A failed or mismatched upload deletes nothing. It returns what it uploaded, kept and deleted. | Oleg's call (Murat, Winston). "Delete only after a successful upload" is the core rule, so it belongs where pytest can cover it, not in a SKILL.md. "No error" isn't success; a matching hash is (Murat). Temp name then rename: a half-finished overwrite must not cost a copy (Amelia). Chunked sessions remove the 150 MB limit. |
| D3 | **The server has no delete tool and nothing outside `.backups`.** Its tools are `upload_backup` (D2) and, for restore, `list_backups` and `download_backup` (D18). Pruning only touches `bookvie-backup-*.zip` in the backups folder. | Amelia, Murat. A server that can't delete arbitrary files can't be talked into it. |
| D4 | **App-folder Dropbox app; backups in `/Apps/bookvie/.backups/`.** The token can reach nothing outside `/Apps/bookvie/`. On the Mac the folder appears as `~/Dropbox/Apps/bookvie/.backups/`. | Oleg's call (Mary). Scopes limit the kind of action, not the location; only App folder still holds after a token leaks (Murat). The access type can't be changed later; changing it means a new app and a new `auth`. |
| D5 | **One-time sign-in: `bookvie-dropbox auth`** opens the browser (OAuth with PKCE, no app secret), and the refresh token goes into **macOS Keychain**. Nothing in the repo, `.env`, `~/.claude.json` or library data. Access tokens are refreshed automatically. A dead refresh token fails with a message that names the `auth` command. | Sally, Murat. The issue: credentials stay out of the library and the repo. Short-lived Dropbox tokens must refresh by themselves, or backups quietly stop. |
| D6 | *(The plist runs `bookvie autobackup run`, §6.)* **Trigger: a launchd user agent at 09:00** runs `claude -p "/bookvie-backup"` headless. launchd runs a missed job on wake. The plist uses the absolute path to `claude`, `--allowedTools` listing exactly the bookvie and Dropbox tools the skill needs, and `--disallowedTools` naming `restore_backup` (both servers), so the unattended run can never reach a restore. `bookvie autobackup install` / `uninstall` write and remove the plist. | Oleg's call (Winston). Cloud routines can't reach `127.0.0.1`; `/loop` needs an open session. launchd has no `claude` on its `PATH`, and a headless run can't answer a permission prompt (Amelia). |
| D7 | *(Unchanged detection settled in §6.)* **The `bookvie-backup` skill**: start `bookvie` if it isn't running (as the other skills do), `export_backup`, skip the upload when the library hasn't changed since the last upload, otherwise `upload_backup`, then `record_backup_upload` with the outcome. It reports every outcome, including a skip and a failure. | Oleg's call: skip when unchanged. A silent skip would show as Stalled after 26 h (Murat). With keep=3, skipping means the 3 copies cover the last 3 changes, not the last 3 days (Winston). How "unchanged" is detected (a hash of the zip or of `library.json` + covers, stored with the last upload) is settled in the architecture step. |
| D8 | **`--dev` never uploads.** The skill and `upload_backup` refuse a dev backup (the `-dev` backups folder or a dev server). | Amelia. A dev library in `.backups` would push out a real copy. |
| D9 | *(Shape superseded by AD-22, §6.)* **A new bookvie agent tool, `record_backup_upload({ok, skipped?, dropboxPath?, kept?, error?})`**, writes the last run's outcome and time into `local-state.json`, next to `lastExportAt` and separate from it. It's device state, not library data, so a restore doesn't touch it. A manual Export doesn't count as an upload. | Amelia, Murat. |
| D10 | **The backend checks launchd**: `launchctl print gui/$UID/<label>` says whether the job is installed. It's macOS-only; anywhere else it reports "not installed". | Oleg's call: both signals (Winston). |
| D11 | **The Backup page shows an auto-backup badge** next to "Last export", from both signals, with words and no tooltip: | Oleg's call (both). Sally's states; Murat's 26 h staleness, which catches a run that crashed before it could report. |

| launchd job | Last run | Badge |
|---|---|---|
| not installed | anything | ⚪ **Off**: "Auto-backup isn't set up" |
| installed | never ran | 🔵 **Waiting**: "First backup at 09:00" |
| installed | verified upload or reported skip < 26 h ago | 🟢 **On**: "Last upload today 09:02 · 3 copies in .backups" |
| installed | the last run reported an error | 🟠 **Failing**: the reason in plain words, and the fix (for example "Dropbox sign-in expired. Run `bookvie-dropbox auth`.") |
| installed | no success or skip in 26 h, no error reported | 🟠 **Stalled**: "No backup since Nov 19" |

| # | Decision | Why |
|---|---|---|
| D12 | **Setup and troubleshooting docs ship with the code.** A new `docs/dropbox-backup.md` holds the full guide; README → Agent tools gets a short "Daily backup to Dropbox" paragraph with the `claude mcp add` line and a link to it. Each story adds the docs for what it introduces, as acceptance criteria, so no story is done with undocumented setup. The guide is checked by following it from scratch (13.3's real run and 13.4's install), not just read. | Oleg's call. John: docs written at the end describe what was meant, not what shipped. Murat: a setup guide is only right if someone ran it. |
| D13 | **Restore is exposed through MCP, behind gates.** This lifts Epic 12's ban (D6, spine AD-21) for restore only; delete-book and delete-card-note stay banned. bookvie gets two tools: `preview_restore(path)` (read-only, D14) and `restore_backup(path)` (D15–D17). Both use the same staging and validation as the restore intent, and `restore_backup` applies through the same handler (Epic 12 D5). | Oleg's call: restore is a must-have for the agent. Sally, who asked for the ban, agreed on the condition that "are you sure?" really means it. |
| D14 | **`preview_restore(path)` says what will be lost.** It validates the archive without applying it and returns the backup's date, its counts (books, card notes, covers), the current library's counts, and what the current library has that the backup lacks: the Books added since (titles) and the number of card notes. A refused archive gives the same refusal codes as the restore intent (`restore_invalid`, `restore_unsafe`, `restore_newer_version`). | Mary. "This will overwrite your library" is a warning nobody reads; "3 books and 18 card notes added since Nov 19 will be lost" is one people read. |
| D15 | *(Gate 2's transport settled in §6.)* **Two gates the model can't skip, both required.** (1) A Claude Code **`ask` permission rule** on `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup`, in user settings, so the harness prompts on every call. (2) **Server-side MCP elicitation**: `restore_backup` asks the user directly, with D14's summary, before it changes anything. Anything but an explicit accept (decline, cancel, a client without elicitation, an auto-decline in print mode) is a refusal, `restore_not_confirmed`, and nothing changes. The skill's own preview and question in the chat come first, but they are not a gate. | Oleg's call (both; Winston). Murat: a skill asking is a suggestion; the model can skip it or be talked out of it. Elicitation fails closed, so a client that auto-declines can't restore, which is the safe failure. |
| D16 | *(Timing superseded by AD-22, §6.)* **A safety copy before every restore.** After both gates and before the restore takes the lock, `restore_backup` writes the current library to `bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip` in the backups folder, with the same atomic write as `export_backup`. If the safety copy fails, there is no restore. The result names the safety copy's path. Safety copies are local only, never uploaded, and their name doesn't match the prune pattern. | Murat. Amelia's trap: an `export_backup` safety copy would be named `bookvie-backup-<today>.zip` and overwrite today's backup, possibly the very file being restored. |
| D17 | **`restore_backup` reads only from the backups folder** (the one that follows the data folder: AD-21) and its `from-dropbox/` subfolder. Any other path, a symlink out of it, or `..` is refused before anything is read. | Murat. A restore tool that reads any path is a way to load an arbitrary file into the server. |
| D18 | *(Signature superseded by AD-22, §6.)* **The Dropbox server gets `list_backups()` and `download_backup(name)`.** `list_backups` returns the `bookvie-backup-*.zip` files in `.backups` with date, size and `content_hash`. `download_backup` accepts only such a name, downloads it atomically into `<backups folder>/from-dropbox/`, checks `content_hash`, and returns the local path. Still no delete (D3). | Oleg's call: restore from Dropbox **and** local backups. Downloads get their own folder so a same-day name never collides (Amelia). |
| D19 | **A separate `bookvie-restore` skill.** It starts `bookvie` if needed, lists both sources (local backups and safety copies, Dropbox backups), lets the user pick (it suggests the newest but never picks on its own), downloads a Dropbox one, runs `preview_restore` and shows the summary, asks in the chat, then calls `restore_backup`, which brings up both gates. It reports the result and the safety copy's path. It never retries a refused or unconfirmed restore by itself. | Oleg's call (Amelia over John's restore mode in `bookvie-backup`). The headless backup skill's tool list stays narrow, with nothing that invites widening it. |
| D20 | **Restore works in `--dev` too**, on the dev library only (the `-dev` backups folder). Downloading a Dropbox backup into the dev folder is allowed, so a restore can be tried on real data without touching the real library. | Amelia. Uploading from dev stays banned (D8). |

**The guide (`docs/dropbox-backup.md`)** covers:

1. **Setup**, in order: register the Dropbox app (App folder access, its name making the folder `/Apps/bookvie/`, the scopes it needs, the PKCE redirect URI); `bookvie-dropbox auth`; adding **both** MCP servers to Claude Code with `--scope user` (`bookvie` and the Dropbox one, with the exact command for each) and checking them with `claude mcp list`; `bookvie autobackup install`; a first manual run of `/bookvie-backup`; what the badge should say afterwards.
2. **How it works**, in five lines: 09:00 launchd, headless `claude -p`, export, verify-then-prune, keep 3, skip when unchanged, `--dev` never uploads.
3. **Troubleshooting**, one entry per badge state and per known failure, each with the symptom, the cause and the fix:
   - Off: the job isn't installed → `bookvie autobackup install`; checking with `launchctl print gui/$UID/<label>`.
   - Waiting that doesn't turn On after 09:00 → the launchd log location, running the job now with `launchctl kickstart`.
   - Failing, "Dropbox sign-in expired" → `bookvie-dropbox auth`.
   - Failing, hash mismatch or upload error → it deletes nothing; rerun; what to check in Dropbox.
   - Stalled → the run crashed before it could report: where its output goes, the usual causes (`claude` not found on launchd's `PATH` after a Claude Code reinstall or move; a tool missing from `--allowedTools` so the headless run stopped at a permission prompt; Claude Code signed out).
   - An MCP server shows as failed in `claude mcp list` or `/mcp` → bookvie isn't running, or started after the session (reconnect from `/mcp`); the Dropbox server's command path moved; `uv` not found.
   - The Mac was asleep at 09:00 → launchd runs it on wake; nothing to do.
   - Dropbox is full, or `.backups` holds more than 3 copies (a failed run left the new one in place without pruning; the next good run catches up).
   - Uninstalling: `bookvie autobackup uninstall`, `claude mcp remove`, deleting the Keychain item, and revoking the app in Dropbox's settings.
4. **Restoring**: the `bookvie-restore` skill, step by step, with the `ask` rule to add to `~/.claude/settings.json` (`permissions.ask` for both `restore_backup` tools) and how to check it's active; what the two prompts look like; where the safety copy goes and how to restore from it to undo a restore. Troubleshooting: "restore_not_confirmed" (the elicitation dialog was declined, or the client auto-declined it: run the skill in the terminal CLI, not VS Code or `-p`), a refused archive (each refusal code in plain words), a failed safety copy, a path outside the backups folder. The manual fallback: download a zip from `~/Dropbox/Apps/bookvie/.backups/` and use the Backup page's restore.

The badge's Failing and Stalled messages (D11) name the fix in a sentence; the guide holds the detail.

Out of scope: other cloud providers, choosing the folder or `keep` in the UI, weekly or monthly tiers, restoring from Dropbox in the Backup page's UI (the agent restores; the page's restore takes a downloaded zip), pruning safety copies or `from-dropbox/` (the guide says how to tidy them), delete-book and delete-card-note through MCP, Linux or Windows schedulers, running the upload inside the bookvie server without an agent.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 13's first story: check `deferred-work.md` for unresolved "spine drift" entries and reconcile them (AGENTS.md → Architecture spine). | `bmad-architecture` (update) |
| 1 | PRD | **FR-29 Daily off-machine backup to Dropbox** (D2, D4, D6–D9, D11) and **FR-30 Restore through an agent, with confirmation** (D13–D20). Bump `updated:`. | `bmad-prd` (update) |
| 2 | Architecture spine | New **AD-22 Dropbox backup**: the local Dropbox MCP as a separate process outside the bookvie server (D1, D3), verify-then-prune (D2), App-folder scope and Keychain token (D4, D5), launchd and the headless run (D6), "unchanged" detection (D7), the upload state in `local-state.json` (D9, amending AD-15), the launchctl probe (D10), restore through MCP (D13–D20: amend AD-21's banned list to delete-book and delete-card-note only; the gates, the safety copy, the allowed restore folders; elicitation in the MCP SDK). Stack: the Dropbox SDK or plain HTTP, pinned. Capability map: FR-29, FR-30. | `bmad-architecture` (update) |
| 3 | EXPERIENCE.md / DESIGN.md | The auto-backup badge on the Backup page (D11): its five states, wording, placement next to "Last export". The restore conversation (D14, D19): the preview summary's wording and the elicitation dialog's text. | `bmad-ux` (update) |
| 4 | Epics (`epics.md`) | New **Epic 13: Daily backup to Dropbox, and restore**, covering FR-29 and FR-30, with the eight stories below. | `bmad-create-epics-and-stories` |
| 5 | Sprint status | Add Epic 13 and Stories 13.1–13.8. | `bmad-sprint-planning` |
| 6 | Stories 13.1–13.8 | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 13 retro. | per story |
| 7 | Issue #7 | Link this plan and Epic 13 (backup and restore). | — |

## 4. Story cut (Epic 13)

Eight stories. The backup is five (Amelia's cut over John's four: launchd install and probe is its own macOS-specific risk); restore adds three (13.1, 13.7, 13.8). Restore's tools come first, 13.1, so gate 2 is proved before the rest (epics step, 2026-11-21); the backup stories shifted to 13.2–13.6.

**13.1 Restore tools in bookvie** (D13–D17, D20). Needs nothing in this epic (Epic 12's tool helper).

- `preview_restore(path)` and `restore_backup(path)`: the allowed folders, D14's summary, the elicitation gate (look up the pinned `mcp` SDK's elicitation API and Claude Code's current behavior in the CLI, VS Code and `-p`, and record what the story found), `restore_not_confirmed`, the safety copy, then the restore intent's handler. Tool descriptions say the user must confirm and that the agent must never call it on its own initiative.
- Spine AD-21 amended: restore leaves the banned list.
- Docs (D12): the `ask` rule for `~/.claude/settings.json`, and the restore troubleshooting entries.

**13.2 Local Dropbox MCP server** (D1–D5, D8). Needs nothing.

- `bookvie-dropbox auth` (PKCE, Keychain), token refresh, the stdio server with `upload_backup` only: chunked upload, temp name, size and `content_hash` check, rename, prune to 3. A fake Dropbox in tests; no test touches the network or the real Keychain.
- Docs (D12): start `docs/dropbox-backup.md` with registering the Dropbox app, `auth`, the `claude mcp add` line and `claude mcp list` check; troubleshooting for the token and for a failed MCP server. README → Agent tools links to it.

**13.3 Record the upload in bookvie** (D9). Needs nothing.

- `record_backup_upload` agent tool, the upload state in `local-state.json`, and the fields in `views/backup`.

**13.4 The `bookvie-backup` skill** (D7, D8). Needs 13.2, 13.3.

- Start step, export, unchanged check, upload, record. Every outcome reported. Oleg verifies a real run by following the guide's setup from scratch.
- Docs (D12): the first manual run, "How it works", and troubleshooting for failed and mismatched uploads. README → AI skills lists `bookvie-backup`.

**13.5 Schedule it with launchd** (D6, D10). Needs 13.4.

- `bookvie autobackup install` / `uninstall` (plist with the absolute `claude` path, `--allowedTools`, and `--disallowedTools` naming both `restore_backup` tools from the start, before they exist), and the backend's launchctl probe in `views/backup`.
- Docs (D12): install, uninstall, the log location, `launchctl kickstart`, and the launchd troubleshooting entries (`PATH`, `--allowedTools`, sleep, signed out). Oleg follows them on a real install.

**13.6 Auto-backup badge on the Backup page** (D11). Needs 13.3, 13.5.

- The five states from the two signals, with the 26 h rule computed on the backend against the injected clock.
- Docs (D12): one troubleshooting entry per badge state, matching the badge's wording, and the guide's closing check that every state has one.

**13.7 Dropbox downloads** (D3, D18). Needs 13.2.

- `list_backups` and `download_backup(name)` into `from-dropbox/`, with the hash check. A fake Dropbox in tests.

**13.8 The `bookvie-restore` skill** (D19). Needs 13.1, 13.7.

- Both sources, the user's pick, download, preview, the chat question, then `restore_backup` with both gates. Oleg verifies a real run against `--dev`: one from a local backup, one from Dropbox, one declined at each gate, and an undo from the safety copy.
- Docs (D12): the guide's Restoring section, followed from scratch. README → AI skills lists `bookvie-restore`.

## 5. Tests

Murat's risks, for the ATDD:

- **Verify then prune** (P0, pytest with a fake Dropbox): a hash mismatch, a failed chunk, a failed rename or a timeout deletes nothing and returns an error; a good upload with 3 existing copies deletes exactly the oldest; with fewer than 3, nothing is deleted. Ordering is by the date in the name, parsed as a date, not by string sort or upload time.
- **Prune scope** (P0): files in the folder that don't match `bookvie-backup-*.zip` are never deleted; the server exposes no other write tool.
- **Same-day rerun** (P0): a second upload on the same day replaces that day's copy only after the new one verifies.
- **Over 150 MB** (P1): a large file goes through the chunked session.
- **Dev refusal** (P0): a dev backup is refused before any network call.
- **Token** (P0): an expired access token refreshes; a revoked refresh token fails with the `auth` message. No token in the repo, logs or tool results.
- **Skip reports** (P0): an unchanged library records a skip, which keeps the badge On.
- **Badge states** (P0, pytest + Playwright): each of the five states from a stubbed probe and stored state, including exactly 26 h on either side of the boundary; a manual Export doesn't move the upload time.
- **Restore ignores upload state** (P1): a restore leaves the upload fields in `local-state.json` as they were.
- **Docs match the code** (P1): every command in `docs/dropbox-backup.md` exists with the flags shown (a pytest that parses the guide's code blocks and checks each `bookvie`/`bookvie-dropbox` subcommand against the CLI), and every badge state has a troubleshooting entry with its exact wording.
- **Gates fail closed** (P0, pytest with the MCP test client): `restore_backup` with the elicitation declined, cancelled, timed out, or a client that doesn't support elicitation is `restore_not_confirmed`, and the library, covers and backups folder are unchanged. Only an explicit accept goes on.
- **Elicitation shows the truth** (P0): the dialog's text carries D14's counts and lost Books for the exact file being restored.
- **Safety copy** (P0): it's written before the restore and restores back to the pre-restore library; a failed safety copy means no restore; it never overwrites `bookvie-backup-<today>.zip`, and pruning never touches it.
- **Allowed folders** (P0): a path outside the backups folder, `..`, or a symlink out of it is refused before any read.
- **Same handler** (P0): a restore through the tool and through the intent route give the same result and refusal codes; `local-state.json`'s upload state is unchanged after either.
- **`download_backup`** (P0, fake Dropbox): only `bookvie-backup-*.zip` names; a hash mismatch leaves no file; a same-day name never lands in the backups folder itself.
- **Headless can't restore** (P0): the plist's `--disallowedTools` contains both `restore_backup` names (a test reads the generated plist).
- **Still banned** (P0): delete-book and delete-card-note are absent from the tool list.
- **Headless run** (P1, manual): the installed job runs once with the Mac awake and once after wake, with no permission prompt.

## 6. Changed by the architecture (spine AD-22, 2026-11-21)

Step 2 settled the open mechanics and changed some of the decisions above. Where this plan and AD-22 differ, AD-22 wins. Stories build from AD-22.

- **D2 upload:** no temporary name and no rename. Dropbox's `files_move_v2` can't overwrite, so a second upload on the same day would fail. `upload_backup(localPath)` finishes the chunked session directly to the final name with overwrite and the whole file's `content_hash`, so Dropbox refuses a mismatch, then checks the size and hash, then prunes. It never prunes the name it just wrote. There is no `keep` argument; keep is fixed at 3. It accepts only a daily name directly in `~/bookvie-backups/`, which makes D8 structural.
- **D6 trigger:** the plist runs `bookvie autobackup run`. It starts `bookvie --no-browser` when it isn't running, runs `claude -p "/bookvie-backup"`, and stops bookvie only if it started it, because a headless `claude -p` can't start bookvie and then connect to its tools. `--allowedTools` is one constant of MCP tool names, with no Bash. Install refuses a git worktree, and the plist sets `PATH`. The Dropbox MCP entry is named `bookvie-dropbox`.
- **D7 unchanged:** the fingerprint is the SHA-256 of the backup's `library.json`. bookvie compares, not the skill: `export_backup` returns `libraryHash` and `unchangedSinceUpload`. The daily run calls `export_backup({forUpload: true})`, which doesn't move "Last export" (PRD FR-28, FR-29).
- **D9 record:** `record_backup_upload({outcome, path?, copies?, contentHash?, cause?})`. `outcome` is `uploaded`, `skipped` or `failed`, and `cause` comes from a closed enum matching the UX's Failing reasons. bookvie hashes the uploaded file itself. The state is `autoBackup {lastReport, lastOk, lastUpload}`.
- **D15 gate 2:** MCP 2026-07-28 elicitation (`InputRequiredResult`) on the stateless `/mcp` mount, with a single-use `requestState` sealed over the file's and the library's hashes. A connection below 2026-07-28 is `restore_not_confirmed`, reason `unsupported`. It works in the Claude Code terminal CLI only.
- **D16 safety copy:** written inside the restore's own lock hold, after the archive validates and before it is applied, so it is exactly the library being replaced, and a refused archive leaves none.
- **D18 download:** `download_backup(name, target)`, where `target` is `bookvie` or `bookvie-dev` (D20).
- **New tool:** `list_local_backups` in bookvie, for the restore skill's pick list (Story 13.1).
- **Dropbox package:** `backend/bookvie_dropbox/`, in the same wheel as `bookvie`. It uses the official `dropbox` SDK and `keyring`.
- **Story order (epics step, 2026-11-21):** restore's tools moved first, as Story 13.1, to prove gate 2 early; the backup stories are 13.2–13.6, Dropbox downloads 13.7, the restore skill 13.8. One epic; `epics.md` is authoritative for the ACs.
