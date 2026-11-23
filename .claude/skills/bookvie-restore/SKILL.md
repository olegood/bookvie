---
name: bookvie-restore
description: >
  Restore the user's bookvie library from a backup on this computer or in bookvie's own Dropbox App folder, in one conversation.
  Starts the local bookvie app if needed, lists this computer's backups (list_local_backups) and Dropbox's (bookvie-dropbox's list_backups) as one numbered pick list, newest first, and lets the user pick; it suggests the newest and never picks.
  Downloads a Dropbox pick with download_backup, shows what the restore would lose with preview_restore, asks in the chat, and calls restore_backup only after a yes; Claude Code's permission prompt and bookvie's own question then confirm it, and bookvie saves a safety copy first.
  Reports the outcome in one line and never retries a refused or unconfirmed restore by itself.
  Use this whenever the user asks to restore bookvie or their library from a backup, to go back to an earlier backup or a Dropbox copy, or to undo a restore from its safety copy.
metadata:
  version: 1.0.0
---

# Restore the bookvie library from a backup

bookvie is the user's local home-library app. This skill restores its whole library from one backup, either a backup on this computer or one in bookvie's own folder in the user's Dropbox. The setup (the Dropbox app, the sign-in, both MCP servers and the `ask` rule for `restore_backup`) is in `docs/dropbox-backup.md`.

A restore replaces everything, so the user decides every step. The skill lists the backups and lets the user pick; it suggests the newest and never picks one itself. It shows what the restore would lose before it asks. Then two confirmations it can't skip follow: Claude Code's permission prompt for `restore_backup`, and bookvie's own question. Anything but an explicit yes changes nothing, and the skill never asks again or retries by itself.

The skill uses bookvie's `list_local_backups`, `preview_restore` and `restore_backup`, and bookvie-dropbox's `list_backups` and `download_backup`. It never calls bookvie's HTTP API for the restore; the only bookvie HTTP calls it makes are step 1's health check and probe. It has no `allowed-tools`, so Claude Code asks before each tool call that its settings don't already allow.

## 1. Make sure bookvie is running

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background with the Bash tool's `run_in_background`: run `bookvie --no-browser`, or `backend/.venv/bin/bookvie --no-browser` when `bookvie` isn't on the PATH. Then poll the health URL. Use `--no-browser` and never Playwright: the user doesn't want windows opening.

The backups are listed and restored through bookvie's agent tools, which the running app serves at `/mcp`: the `bookvie` entry in Claude Code for port 8765. When the user asks to work on the dev library, use `bookvie --dev --no-browser` instead, check `curl -fsS http://127.0.0.1:8766/api/health`, and call the tools of the `bookvie-dev` entry.

Then make sure the running bookvie serves the agent tools: ask it for `get_app_info`, a read, at `/mcp` on the entry's port. For the `bookvie` entry (8765):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST http://127.0.0.1:8765/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'
```

For `bookvie-dev` (8766):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST http://127.0.0.1:8766/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'
```

It prints `200` when bookvie has the agent tools. `405` or `404`, or `000` when it doesn't answer, means an older bookvie, from before the agent tools, is running. Tell the user "An older bookvie is running: stop it and start the new one." and stop. If you started bookvie yourself in this step, the installed `bookvie` is older: tell the user instead to update it with `npm run install:local` (the README's Updating), and stop. Any other code: tell the user the code bookvie answered and stop, without the older-bookvie message. In each of these cases, don't give the reconnect or `claude mcp add` advice below: the entry is set up, the server is the problem. Don't stop or restart bookvie yourself.

If the tools aren't available because bookvie started after this Claude Code session did, ask the user to run `/mcp` in Claude Code, pick the entry (`bookvie` or `bookvie-dev`) and choose reconnect. Then go on. If reconnecting doesn't bring the tools (the entry was never added, or its URL is wrong), give the user the README's one-time setup line for that entry, `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp` (or `bookvie-dev` with `http://127.0.0.1:8766/mcp`), and stop. Never fall back to calling bookvie's HTTP API for the restore.

## 2. List the backups

Call bookvie's `list_local_backups` and bookvie-dropbox's `list_backups`.

- `list_local_backups` answers `backups`, each with its `path`, its `kind` (`daily`, `safety` or `from_dropbox`), its `backupTime`, its `size` in bytes and its `contentHash`.
- `list_backups` answers `backups`, each with its `name`, its `backupTime`, its `size` in bytes and its `contentHash`, Dropbox's content hash, which is the same hash bookvie computes for the same file.

**Merge them into rows.** Show one row per `contentHash`: a backup that is both on this computer and in Dropbox is one row, restored from this computer's file, by its local `path`, without a download. That holds for a backup downloaded from Dropbox earlier (kind `from_dropbox`) too.

- **When:** the `backupTime` of the local file when there is one, otherwise Dropbox's. When several local files share a content hash, use the newest of them (by `backupTime`) for the row's time, kind and `path`.
- **Kind:** "daily backup" for `daily` and `from_dropbox`, and for a row only in Dropbox; "safety copy (before a restore)" for `safety`.
- **Where:** "this computer and Dropbox" when the content hash is in both lists, "this computer" when it is only in `list_local_backups` (a `from_dropbox` file no longer in Dropbox included), and "Dropbox" when it is only in `list_backups`.
- **Size:** the `size` in megabytes (1,000,000 bytes), rounded, as "73 MB"; under 1 MB, in kilobytes, as "640 KB".

Write each time as bookvie names a backup, in the user's local time, 24-hour: "19 Nov, 09:02", and "19 Nov 2025, 09:02" when it isn't this year.

**Show the pick list,** newest first by `backupTime`, numbered, in these words:

```
Backups you can restore:
  1. 21 Nov, 09:02 · daily backup · this computer and Dropbox · 73 MB
  2. 20 Nov, 09:01 · daily backup · Dropbox · 73 MB
  3. 19 Nov, 09:02 · daily backup · Dropbox · 72 MB
  4. 17 Nov, 18:40 · safety copy (before a restore) · this computer · 72 MB
The newest is 1. Which one?
```

- Show the 10 newest rows. When there are more, add "and *N* older. Say show all to see them." after the tenth row, with *N* the rows not shown, before the question. When the user says show all, list every row in the same format, numbered 1 to the last, so each row keeps its number, then ask "The newest is 1. Which one?" again.
- The skill suggests the newest and waits for the user's answer. It never picks a backup itself, even the newest, and never takes "restore my library" alone as a pick. When the user names a backup by date or time instead of a number, and more than one row fits, ask which.

**When Dropbox can't be reached,** show this computer's rows as above (the pick list and its question), and after them one line:

- `list_backups` answers an error whose text is JSON with the `cause` `dropbox_signin`: "Dropbox sign-in expired. Run bookvie-dropbox auth in Terminal."
- any other `cause`: "Couldn't reach Dropbox: *reason*.", with the error's `message` as *reason*, its final period left out. When the error's text isn't JSON or has no `message`, use the text as it is.
- the `list_backups` tool isn't there at all (bookvie-dropbox isn't connected in Claude Code): "Couldn't reach Dropbox: bookvie-dropbox isn't connected in Claude Code."

Don't call `list_backups` again by yourself; the user can fix Dropbox and ask again.

**When there are no backups anywhere** (this computer has none and Dropbox answered with an empty list), say "No backups found on this computer or in Dropbox. Nothing was changed." and stop. When this computer has none and Dropbox couldn't be reached, give only the matching line above (the sign-in line, "Couldn't reach Dropbox: *reason*." or the not-connected line) and stop.

If `list_local_backups` itself answers an error, tell the user its `message` and stop. If bookvie stopped answering, go back to step 1.

## 3. Download a Dropbox pick

A row on this computer (alone or with Dropbox) needs no download: go to step 4 with its local `path`.

A row only in Dropbox is downloaded first. Call `download_backup` as `download_backup({name, target})`, with the row's `name` from `list_backups` and the `target` of the bookvie it restores into: `"bookvie"` for the real library, `"bookvie-dev"` on development. It downloads the backup into that bookvie's backups folder, under `from-dropbox/`, checks it against Dropbox's copy and answers its local `path`. Then call `preview_restore` with that `path`, in step 4.

If `download_backup` answers an error, its text is JSON with a `cause` and a `message`. Nothing was downloaded, so stop with one line and don't download again by yourself:

- `download_incomplete` (`download_backup`'s copy didn't match Dropbox's): "The download didn't match the copy in Dropbox, so nothing was restored. Try again."
- `dropbox_signin` (`download_backup`): "Couldn't download the backup from Dropbox: Dropbox sign-in expired; run bookvie-dropbox auth in Terminal. Nothing was changed."
- `other`, any other cause, an error whose text isn't JSON or has no `cause`, or the tool missing (`download_backup`): "Couldn't download the backup from Dropbox: *reason*. Nothing was changed.", with the error's `message` (or its text) as *reason*, its final period left out.

## 4. Preview

Call `preview_restore({path})` with the pick's local `path`. It changes nothing, and answers the backup's `backupTime`, the counts of the `backup` and of the library as it is now (`current`), each with `books`, `cardNotes` and `covers`, the titles of the Books added since (`booksAddedSince`) and the number of Card notes added since (`cardNotesAddedSince`).

Show the preview in these words, with the file's name from its `path`, the row's where words ("this computer", "Dropbox" or "this computer and Dropbox") and the backup's time. Write `backupTime` as step 2 does, wherever it appears here (the first line, the "You'd lose" line and the "Everything else" line): "19 Nov, 09:02", in local time, 24-hour, with the year when it isn't this year:

```
Restore bookvie-backup-2026-11-19.zip (Dropbox, 19 Nov, 09:02)?
  This backup: 212 books · 1,304 card notes · 198 covers
  Now:         215 books · 1,322 card notes · 201 covers
You'd lose what was added since 19 Nov, 09:02:
  3 books: Designing Data-Intensive Applications; Thinking in Systems; Atomic Habits
  18 card notes
Everything else changed since 19 Nov, 09:02, such as pages reached, goes back to how it was then.
A safety copy of your current library is saved first.
```

- Counts with a thousands comma. "1 book", "1 card note", "1 cover".
- Up to 5 titles from `booksAddedSince`, in its order, separated by "; ", then "and *N* more": "7 books: A; B; C; D; E; and 2 more". Leave out the books line when `booksAddedSince` is empty, and the card notes line when `cardNotesAddedSince` is 0.
- When `booksAddedSince` is empty and `cardNotesAddedSince` is 0, the "You'd lose" block becomes one line, "No books or card notes were added since 19 Nov, 09:02.", and the "Everything else" line stays, because pages reached and other edits still go back.

If `preview_restore` answers an error, report it as step 6 says and stop.

## 5. Ask, then restore

Then ask in the chat, in your own words, whether to restore this backup, and wait. This question isn't one of the two confirmations; it lets the user stop before them.

Call `restore_backup({path})`, with the same `path` as the preview, only after the user says yes to this preview. Anything else (no, a question, silence) isn't a yes: don't call `restore_backup`, say "Not restored. Nothing was changed." and stop. When the user picks another backup instead, go back to step 3 with it.

After the call, Claude Code asks permission for `restore_backup` (the `ask` rule), then bookvie asks its own question, with the counts it works out itself. Leave both to the user: don't explain how to get around them. When the user declines Claude Code's prompt, the tool isn't called: say "Not restored. Nothing was changed." and stop.

## 6. Report the outcome

Tell the user the outcome in one line, from `restore_backup`'s answer or the error's `code`. Write paths with `~` for the home folder, as in "~/bookvie-backups/…", never the full `/Users/…` path.

- **Restored:** "Restored from the backup of *when*. Safety copy: *path*", with the answer's `backupTime` as *when*, written as step 2 does ("19 Nov, 09:02", local time, 24-hour, the year when it isn't this year), and its `safetyCopy` as *path*. For example "Restored from the backup of 19 Nov, 09:02. Safety copy: ~/bookvie-backups/bookvie-pre-restore-2026-11-21T1004.zip". The open bookvie tab shows the restored library on its next refetch. To undo, the user restores that safety copy with this skill.
- `restore_not_confirmed`: "Not restored. Nothing was changed." The error's `reason` says why (`declined`, `cancelled`, `unsupported`, `expired` or `changed`).
  - `unsupported` (the client can't show bookvie's question): "Not restored. Nothing was changed. Run it in the Claude Code terminal, not VS Code or claude -p." Add that advice only when the `reason` is `unsupported`.
- `restore_invalid`, `restore_unsafe`: "This file isn't a bookvie export, or it's damaged. Nothing was changed."
- `restore_newer_version`: "This export is from a newer version of bookvie. Nothing was changed."
- `couldnt_save`: "Couldn't save. Your data wasn't changed."
- `safety_copy_failed`: "Couldn't save a safety copy, so nothing was restored."
- `restore_outside_backups`: "bookvie restores only from its backups folder. Nothing was changed."
- Any other error: its `message`, as it is, or the error's text when it has no `message`.

The download's own failures have their lines in step 3. Never retry a refused, declined or unconfirmed restore, or a failed download, by yourself, and don't ask again: the user can ask for the restore again.

## Development

When the user asks to work on development (the dev library, a `--dev` server, `bookvie-dev`), step 1 starts and probes the `--dev` server on 8766, and every bookvie call (`list_local_backups`, `preview_restore`, `restore_backup`) goes to the `bookvie-dev` entry, which lists and restores `~/bookvie-backups-dev`. A Dropbox pick is downloaded with `download_backup` and the `target` `"bookvie-dev"`, into `~/bookvie-backups-dev/from-dropbox/`. On development, never call a tool of the `bookvie` entry and never download with the `target` `"bookvie"`, so the skill never touches the real library.
