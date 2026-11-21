---
title: Daily backup to Dropbox — plan
status: agreed
created: 2026-11-21
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: GitHub issue #7 → "Daily backup to Dropbox"
---

# Daily backup to Dropbox — plan

Back up the library once a day and upload it to Dropbox, so a copy exists off this machine without exporting by hand. A launchd job runs a new `bookvie-backup` skill headless every morning. The skill writes the backup with bookvie's `export_backup` and uploads it through a small Dropbox MCP server of our own, which verifies the upload and keeps the last 3 copies. The Backup page shows whether auto-backup is on and working.

## 1. What already exists

- **`export_backup`** (Story 12.6, spine AD-21): an agent tool that writes `bookvie-backup-YYYY-MM-DD.zip` (the same zip as `GET /api/export`: `library.json` and `covers/`) into `~/bookvie-backups` (`~/bookvie-backups-dev` with `--dev`, `<data folder>-backups` otherwise), returns `{path, size, createdAt}`, and records `lastExportAt` in `local-state.json`. A second backup on the same day replaces that day's file (`backend/bookvie/intents/backup_file.py`).
- **Size.** `~/bookvie-data` is about 73 MB on 2026-11-21, almost all of it `covers/`, and it grows. A single Dropbox upload request is capped at 150 MB.
- **No Dropbox MCP is configured.** Dropbox's official MCP server (`https://mcp.dropbox.com/mcp`) is remote: it can't read the local disk, so a file would have to pass through tool arguments, and its help pages list only ListFolder, Sign and Paper tools. Community local servers exist; some take a `local_path`, others only base64.
- **The skills** `bookvie-new-book` and `bookvie-notes-summary` check `/api/health` and start `bookvie` when it isn't running, then use the bookvie MCP tools (Epic 12).
- **The Backup page** shows "Last export" from `views/backup`.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Our own local Dropbox MCP server**, in this repo: a small stdio server (Python, `uv`) that Claude Code starts. It reads the zip from disk by path and calls the Dropbox API itself. No file bytes pass through the model. | Oleg's call (a2). The official server can't see the disk; 73 MB of base64 in tool arguments isn't possible (Amelia). A community package would hold a Dropbox write token with read access to the home folder (Mary). |
| D2 | **Retention lives in code, in one tool: `upload_backup(local_path, keep=3)`.** It uploads under a temporary name with a chunked upload session, checks that Dropbox's `size` and `content_hash` match the local file, renames it to its final name, and **only then** deletes the oldest `bookvie-backup-*.zip` beyond 3. A failed or mismatched upload deletes nothing. It returns what it uploaded, kept and deleted. | Oleg's call (Murat, Winston). "Delete only after a successful upload" is the core rule, so it belongs where pytest can cover it, not in a SKILL.md. "No error" isn't success; a matching hash is (Murat). Temp name then rename: a half-finished overwrite must not cost a copy (Amelia). Chunked sessions remove the 150 MB limit. |
| D3 | **The server has no delete, list-anything or download tool.** Pruning only touches `bookvie-backup-*.zip` in the backups folder. | Amelia, Murat. A server that can't delete arbitrary files can't be talked into it. |
| D4 | **App-folder Dropbox app; backups in `/Apps/bookvie/.backups/`.** The token can reach nothing outside `/Apps/bookvie/`. On the Mac the folder appears as `~/Dropbox/Apps/bookvie/.backups/`. | Oleg's call (Mary). Scopes limit the kind of action, not the location; only App folder still holds after a token leaks (Murat). The access type can't be changed later; changing it means a new app and a new `auth`. |
| D5 | **One-time sign-in: `bookvie-dropbox auth`** opens the browser (OAuth with PKCE, no app secret), and the refresh token goes into **macOS Keychain**. Nothing in the repo, `.env`, `~/.claude.json` or library data. Access tokens are refreshed automatically. A dead refresh token fails with a message that names the `auth` command. | Sally, Murat. The issue: credentials stay out of the library and the repo. Short-lived Dropbox tokens must refresh by themselves, or backups quietly stop. |
| D6 | **Trigger: a launchd user agent at 09:00** runs `claude -p "/bookvie-backup"` headless. launchd runs a missed job on wake. The plist uses the absolute path to `claude` and `--allowedTools` listing exactly the bookvie and Dropbox tools the skill needs. `bookvie autobackup install` / `uninstall` write and remove the plist. | Oleg's call (Winston). Cloud routines can't reach `127.0.0.1`; `/loop` needs an open session. launchd has no `claude` on its `PATH`, and a headless run can't answer a permission prompt (Amelia). |
| D7 | **The `bookvie-backup` skill**: start `bookvie` if it isn't running (as the other skills do), `export_backup`, skip the upload when the library hasn't changed since the last upload, otherwise `upload_backup`, then `record_backup_upload` with the outcome. It reports every outcome, including a skip and a failure. | Oleg's call: skip when unchanged. A silent skip would show as Stalled after 26 h (Murat). With keep=3, skipping means the 3 copies cover the last 3 changes, not the last 3 days (Winston). How "unchanged" is detected (a hash of the zip or of `library.json` + covers, stored with the last upload) is settled in the architecture step. |
| D8 | **`--dev` never uploads.** The skill and `upload_backup` refuse a dev backup (the `-dev` backups folder or a dev server). | Amelia. A dev library in `.backups` would push out a real copy. |
| D9 | **A new bookvie agent tool, `record_backup_upload({ok, skipped?, dropboxPath?, kept?, error?})`**, writes the last run's outcome and time into `local-state.json`, next to `lastExportAt` and separate from it. It's device state, not library data, so a restore doesn't touch it. A manual Export doesn't count as an upload. | Amelia, Murat. |
| D10 | **The backend checks launchd**: `launchctl print gui/$UID/<label>` says whether the job is installed. It's macOS-only; anywhere else it reports "not installed". | Oleg's call: both signals (Winston). |
| D11 | **The Backup page shows an auto-backup badge** next to "Last export", from both signals, with words and no tooltip: | Oleg's call (both). Sally's states; Murat's 26 h staleness, which catches a run that crashed before it could report. |

| launchd job | Last run | Badge |
|---|---|---|
| not installed | anything | ⚪ **Off**: "Auto-backup isn't set up" |
| installed | never ran | 🔵 **Waiting**: "First backup at 09:00" |
| installed | verified upload or reported skip < 26 h ago | 🟢 **On**: "Last upload today 09:02 · 3 copies in .backups" |
| installed | the last run reported an error | 🟠 **Failing**: the reason in plain words, and the fix (for example "Dropbox sign-in expired. Run `bookvie-dropbox auth`.") |
| installed | no success or skip in 26 h, no error reported | 🟠 **Stalled**: "No backup since Nov 19" |

| D12 | **Setup and troubleshooting docs ship with the code.** A new `docs/dropbox-backup.md` holds the full guide; README → Agent tools gets a short "Daily backup to Dropbox" paragraph with the `claude mcp add` line and a link to it. Each story adds the docs for what it introduces, as acceptance criteria, so no story is done with undocumented setup. The guide is checked by following it from scratch (13.3's real run and 13.4's install), not just read. | Oleg's call. John: docs written at the end describe what was meant, not what shipped. Murat: a setup guide is only right if someone ran it. |

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
4. **Restoring from Dropbox**: download a zip from `~/Dropbox/Apps/bookvie/.backups/` (or dropbox.com) and use the Backup page's restore.

The badge's Failing and Stalled messages (D11) name the fix in a sentence; the guide holds the detail.

Out of scope: other cloud providers, choosing the folder or `keep` in the UI, weekly or monthly tiers, restoring from Dropbox (download the zip and use the Backup page's restore), Linux or Windows schedulers, running the upload inside the bookvie server without an agent.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 13's first story: check `deferred-work.md` for unresolved "spine drift" entries and reconcile them (AGENTS.md → Architecture spine). | `bmad-architecture` (update) |
| 1 | PRD | **FR-29 Daily off-machine backup to Dropbox** (D2, D4, D6–D9, D11). Bump `updated:`. | `bmad-prd` (update) |
| 2 | Architecture spine | New **AD-22 Dropbox backup**: the local Dropbox MCP as a separate process outside the bookvie server (D1, D3), verify-then-prune (D2), App-folder scope and Keychain token (D4, D5), launchd and the headless run (D6), "unchanged" detection (D7), the upload state in `local-state.json` (D9, amending AD-15), the launchctl probe (D10). Stack: the Dropbox SDK or plain HTTP, pinned. Capability map: FR-29. | `bmad-architecture` (update) |
| 3 | EXPERIENCE.md / DESIGN.md | The auto-backup badge on the Backup page (D11): its five states, wording, placement next to "Last export". | `bmad-ux` (update) |
| 4 | Epics (`epics.md`) | New **Epic 13: Daily backup to Dropbox**, covering FR-29, with the five stories below. | `bmad-create-epics-and-stories` |
| 5 | Sprint status | Add Epic 13 and Stories 13.1–13.5. | `bmad-sprint-planning` |
| 6 | Stories 13.1–13.5 | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 13 retro. | per story |
| 7 | Issue #7 | Link this plan and Epic 13. | — |

## 4. Story cut (Epic 13)

Five stories (Amelia's cut over John's four: launchd install and probe is its own macOS-specific risk).

**13.1 Local Dropbox MCP server** (D1–D5, D8). Needs nothing.

- `bookvie-dropbox auth` (PKCE, Keychain), token refresh, the stdio server with `upload_backup` only: chunked upload, temp name, size and `content_hash` check, rename, prune to 3. A fake Dropbox in tests; no test touches the network or the real Keychain.
- Docs (D12): start `docs/dropbox-backup.md` with registering the Dropbox app, `auth`, the `claude mcp add` line and `claude mcp list` check; troubleshooting for the token and for a failed MCP server. README → Agent tools links to it.

**13.2 Record the upload in bookvie** (D9). Needs nothing.

- `record_backup_upload` agent tool, the upload state in `local-state.json`, and the fields in `views/backup`.

**13.3 The `bookvie-backup` skill** (D7, D8). Needs 13.1, 13.2.

- Start step, export, unchanged check, upload, record. Every outcome reported. Oleg verifies a real run by following the guide's setup from scratch.
- Docs (D12): the first manual run, "How it works", and troubleshooting for failed and mismatched uploads. README → AI skills lists `bookvie-backup`.

**13.4 Schedule it with launchd** (D6, D10). Needs 13.3.

- `bookvie autobackup install` / `uninstall` (plist with the absolute `claude` path and `--allowedTools`), and the backend's launchctl probe in `views/backup`.
- Docs (D12): install, uninstall, the log location, `launchctl kickstart`, and the launchd troubleshooting entries (`PATH`, `--allowedTools`, sleep, signed out). Oleg follows them on a real install.

**13.5 Auto-backup badge on the Backup page** (D11). Needs 13.2, 13.4.

- The five states from the two signals, with the 26 h rule computed on the backend against the injected clock.
- Docs (D12): one troubleshooting entry per badge state, matching the badge's wording, and the guide's closing check that every state has one.

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
- **Headless run** (P1, manual): the installed job runs once with the Mac awake and once after wake, with no permission prompt.
