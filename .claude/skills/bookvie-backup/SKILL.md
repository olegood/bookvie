---
name: bookvie-backup
description: >
  Back up the user's bookvie library to bookvie's own Dropbox App folder, once, and tell bookvie how the run went.
  Checks the local bookvie app with get_app_info and never backs up a --dev server, exports today's daily backup with export_backup, uploads it with bookvie-dropbox's upload_backup unless the library is unchanged since the last upload, and always ends with one record_backup_upload report.
  Reports the outcome in one line: what was uploaded and how many copies Dropbox keeps, that nothing was new, or why it failed and how to fix it.
  The 09:00 launchd job runs this skill headless with claude -p; the user can also run /bookvie-backup by hand.
  Use this whenever the user asks to back up bookvie or their library to Dropbox now, to run the daily backup by hand, or to check that the Dropbox backup works.
allowed-tools:
  - mcp__bookvie__get_app_info
  - mcp__bookvie__export_backup
  - mcp__bookvie__record_backup_upload
  - mcp__bookvie-dropbox__upload_backup
metadata:
  version: 1.0.0
---

# Back up the bookvie library to Dropbox

bookvie is the user's local home-library app. This skill makes one backup run: it writes today's daily backup on this computer, uploads it to bookvie's own folder in the user's Dropbox, and tells bookvie how the run went, so the Backup page can say whether auto-backup works. The setup (the Dropbox app, the sign-in, both MCP servers) is in `docs/dropbox-backup.md`.

The run uses only four tools, the ones in the frontmatter: bookvie's `get_app_info`, `export_backup` and `record_backup_upload`, and bookvie-dropbox's `upload_backup`. bookvie-dropbox checks that Dropbox's copy matches the file before it deletes the oldest daily backups beyond 3, so a failed upload deletes nothing. The skill never restores, never retries a failed upload, and never calls bookvie's HTTP API for the backup.

The 09:00 launchd job runs this skill headless (`claude -p`), allowed only those four tools, with bookvie already started. Run by hand (`/bookvie-backup`), step 1 may also start bookvie, and Claude Code asks permission for each of its shell commands.

## 1. Make sure bookvie is running

Call `get_app_info` on the `bookvie` entry. When it answers, go on to step 2 and skip the rest of this step.

When the `bookvie` tools aren't there and you can't run shell commands (the headless run), report one line, "Failed: bookvie's tools aren't available (bookvie isn't running, or its `bookvie` entry isn't connected in Claude Code), so nothing was backed up. Start bookvie or reconnect the entry, then run /bookvie-backup again.", and stop. Don't call any other tool: nothing is recorded, because bookvie is the one that records a run.

Only when the skill is run by hand, in an interactive session, start bookvie as the other bookvie skills do. Check it first:

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background with the Bash tool's `run_in_background`: run `bookvie --no-browser`, or `backend/.venv/bin/bookvie --no-browser` when `bookvie` isn't on the PATH. Then poll the health URL. Use `--no-browser` and never Playwright: the user doesn't want windows opening. Never start a development server for this skill.

Then make sure the running bookvie serves the agent tools: ask it for `get_app_info`, a read, at `/mcp` on the `bookvie` entry's port (8765):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST http://127.0.0.1:8765/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'
```

It prints `200` when bookvie has the agent tools. `405` or `404`, or `000` when it doesn't answer, means an older bookvie, from before the agent tools, is running. Tell the user "An older bookvie is running: stop it and start the new one." and stop. If you started bookvie yourself in this step, the installed `bookvie` is older: tell the user instead to update it with `npm run install:local` (the README's Updating), and stop. Any other code: tell the user the code bookvie answered and stop, without the older-bookvie message. In each of these cases, don't give the reconnect or `claude mcp add` advice below: the entry is set up, the server is the problem. Don't stop or restart bookvie yourself.

If the tools aren't available because bookvie started after this Claude Code session did, ask the user to run `/mcp` in Claude Code, pick the entry (`bookvie`) and choose reconnect. Then call `get_app_info` and go on with step 2. If reconnecting doesn't bring the tools (the entry was never added, or its URL is wrong), give the user the README's one-time setup line, `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp`, and stop. Never fall back to calling bookvie's HTTP API for the backup.

## 2. Never from development

Read `mode` in `get_app_info`'s answer. When it is `"dev"`, this is a `--dev` server, whose library is for development: stop here, and don't call `export_backup`, `upload_backup` or `record_backup_upload`. Tell the user in one line: "Stopped: a development library is never uploaded to Dropbox." Nothing is recorded, so the Backup page of the real library doesn't change.

When `mode` is `"production"`, go on. Any other answer (an error, or no `mode`, or another value) stops the run the same way, with no export, upload or report: tell the user in one line, "Failed: bookvie's app info couldn't be read, so nothing was backed up."

Then check that bookvie's tools include `record_backup_upload`. When it isn't there, the running bookvie is older than this skill, and its `export_backup` doesn't take `forUpload`: stop here, and don't call `export_backup`, `upload_backup` or `record_backup_upload`. Tell the user in one line: "Failed: this bookvie is older than the backup skill, so nothing was backed up. Update it with npm run install:local, restart it, then run /bookvie-backup again." Nothing is recorded, because this bookvie can't record a run.

## 3. Export

Call `export_backup({forUpload: true})`. It writes today's daily backup, `bookvie-backup-<YYYY-MM-DD>.zip`, into the backups folder, replacing an earlier one from today, and answers its `path`, `size`, `createdAt`, `libraryHash` and `unchangedSinceUpload`. A backup for upload doesn't move "Last export" on the Backup page.

If `export_backup` answers an error (any code, `couldnt_save` say), don't upload: the run failed with the cause `backup_write`. Go to step 5.

## 4. Upload unless unchanged

When `unchangedSinceUpload` is `true`, the library hasn't changed since the last upload bookvie recorded: don't upload, and go to step 5 as skipped. bookvie compares the library itself; only branch on the flag.

Otherwise call `upload_backup({localPath: path})`, with the `path` that `export_backup` answered. It uploads the file to `/Apps/bookvie/.backups` in Dropbox, checks Dropbox's copy, deletes the oldest daily backups beyond 3, and answers the uploaded file's `name`, the `copies` now in Dropbox, the names it `deleted` (a list, often empty) and Dropbox's `contentHash`.

If `upload_backup` answers an error, its text is JSON with a `cause` (`dropbox_signin`, `upload_incomplete`, `dropbox_full` or `other`) and a `message`: the run failed with that `cause`. When the error's text isn't JSON, has no `cause`, or names a cause outside those four (an MCP timeout, say), the run failed with the cause `other`. Don't retry the upload. After `dropbox_signin`, `upload_incomplete` or `dropbox_full`, nothing in Dropbox was deleted. An `other` can come after a checked upload whose deleting of older backups didn't finish: its `message` says so and names any it already deleted. Without a usable `cause`, don't say whether anything was deleted.

If the `upload_backup` tool isn't available at all (bookvie-dropbox isn't connected in Claude Code), don't upload any other way: the run failed with the cause `other`.

## 5. Record what happened

Always end the run with exactly one `record_backup_upload`, whatever happened after the export, so bookvie's Backup page can show it:

- **Uploaded:** `record_backup_upload({outcome: "uploaded", path, copies, contentHash})`, with the `path` that `export_backup` answered and the `copies` and `contentHash` that `upload_backup` answered. bookvie checks the file against the hash itself.
- **Skipped:** `record_backup_upload({outcome: "skipped"})`, when `unchangedSinceUpload` was `true`.
- **Failed:** `record_backup_upload({outcome: "failed", cause})`. The cause is `backup_write` when `export_backup` failed, the `cause` that `upload_backup` answered when the upload failed, and `other` when the `upload_backup` tool wasn't there.

If `record_backup_upload` itself answers an error (`couldnt_save`, say), don't call it again and don't retry anything: the run's outcome stands, and step 6 adds that bookvie couldn't save the report.

## 6. Report in one line

Tell the user the outcome in one line, in the words of the Backup page's auto-backup line. Write names as they are, with no Markdown around them.

- **Uploaded:** "Uploaded *name* · *N* copies in Dropbox, deleted *name*", with the upload's `name`, its `copies` and the names it `deleted`, joined with ", " when there are several. For example "Uploaded bookvie-backup-2026-11-21.zip · 3 copies in Dropbox, deleted bookvie-backup-2026-11-18.zip". When `deleted` is empty, leave out the deleted part: "Uploaded bookvie-backup-2026-11-21.zip · 2 copies in Dropbox". Write "1 copy" when `copies` is 1.
- **Skipped:** "Nothing new since the last upload; skipped."
- **Failed:** the line for the run's cause, word for word:
  - `dropbox_signin`: "Failed: Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal."
  - `upload_incomplete`: "Failed: the last upload didn't finish. Nothing in Dropbox was deleted; the next 09:00 run tries again."
  - `dropbox_full`: "Failed: Dropbox is full. Nothing in Dropbox was deleted; free some space there."
  - `backup_write`: "Failed: bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting."
  - `other`: "Failed: the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting." When the cause was that the `upload_backup` tool wasn't there, add on the same line: "bookvie-dropbox isn't connected in Claude Code: see docs/dropbox-backup.md → Setup, step 3."

When `record_backup_upload` answered an error, still give the outcome line, and add on the same line "bookvie couldn't save this report (*code*)." with the error's code, or without the parentheses when the error has none. Don't call any tool to fix it.

The stops in step 2 (a development library, unreadable app info, an older bookvie) and the headless stop in step 1 have their own lines, given there.
