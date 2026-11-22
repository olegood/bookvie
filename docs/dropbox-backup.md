# Backing up to Dropbox, and restoring

bookvie keeps your library on this computer. This guide sets up daily backups to bookvie's own folder in your Dropbox, and covers getting the library back from a backup through an agent in Claude Code.

The Dropbox side is a second command, `bookvie-dropbox`, installed with bookvie. It is an MCP server that Claude Code starts by itself, with one tool, `upload_backup`: it uploads a daily backup from `~/bookvie-backups`, checks that Dropbox's copy matches the file, and only then deletes the oldest daily backups beyond 3. A failed or mismatched upload deletes nothing. It never uploads from `~/bookvie-backups-dev`, the folder of a `--dev` server.

An agent can restore your library only through bookvie's own tools, and only after two confirmations it can't skip. bookvie saves a safety copy of your current library first, so a restore can always be undone.

## Setup

Do these steps once, in this order.

### 1. Register bookvie's Dropbox app

bookvie uses its own Dropbox app, which you register yourself, so only bookvie's folder in your Dropbox is ever reachable.

1. Open the [Dropbox App Console](https://www.dropbox.com/developers/apps) and choose **Create app**.
2. Choose **Scoped access**, then **App folder** access, not Full Dropbox.
3. Name the app `bookvie`. Dropbox names the app's folder after it, so the backups go into `/Apps/bookvie/` in your Dropbox, in its `.backups` folder.
4. On the app's **Permissions** tab, tick these three scopes and choose **Submit**: `files.metadata.read`, `files.content.read` and `files.content.write`.
5. On the **Settings** tab, under **OAuth 2**, add this redirect URI, exactly: `http://127.0.0.1:8790/dropbox-auth`. Leave **Allow public clients (Implicit Grant & PKCE)** on. bookvie-dropbox signs in with PKCE, so it needs no app secret, and you never copy one anywhere.
6. Copy the **App key** from the **Settings** tab. In `backend/bookvie_dropbox/dropbox_api.py`, set `APP_KEY` to it, in place of the placeholder, and commit that change so a later checkout keeps it. An app key isn't a secret. Until it's set, `bookvie-dropbox auth` stops and points here. Then reinstall bookvie, which puts `bookvie-dropbox` on your PATH beside `bookvie`:

```sh
npm run install:local
```

### 2. Sign in

```sh
bookvie-dropbox auth
```

It opens Dropbox in your browser. Choose **Allow**, and the browser shows a page saying you can close the tab. bookvie-dropbox keeps the sign-in only in your macOS Keychain, under `bookvie-dropbox`. It never prints the sign-in or writes it to a file. Running `auth` again replaces the sign-in.

### 3. Add both MCP servers to Claude Code

Claude Code needs bookvie's tools and bookvie-dropbox's, both added for your user, so they work from any folder. bookvie's server is the running app. If you already added it from the README's Agent tools section, skip this line. The list in step 4 shows `bookvie` when it's there:

```sh
claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp
```

bookvie-dropbox is a command that Claude Code starts, so it needs the command's absolute path. Find it:

```sh
which bookvie-dropbox
```

Then add it with that path. For a path of `/Users/<you>/.local/bin/bookvie-dropbox`:

```sh
claude mcp add --scope user bookvie-dropbox -- /Users/<you>/.local/bin/bookvie-dropbox serve
```

### 4. Check them

```sh
claude mcp list
```

Both `bookvie` and `bookvie-dropbox` should read as connected. bookvie must be running for `bookvie` to connect.

### Troubleshooting the setup

#### `dropbox_signin`: the Dropbox sign-in expired or is missing

`upload_backup` answers `dropbox_signin` when Dropbox refuses bookvie-dropbox's sign-in, or when the Keychain has none or can't be read (it's locked, or access was denied). Nothing was uploaded or deleted. Run this in a terminal, and allow access in the browser:

```sh
bookvie-dropbox auth
```

If macOS asks whether a program may use the Keychain item `bookvie-dropbox`, choose **Always Allow**. The program it names is the Python of bookvie's install, not `bookvie-dropbox`, and macOS asks again after each reinstall.

#### An MCP server is shown as failed

When `claude mcp list` shows `bookvie` or `bookvie-dropbox` as failed:

- **bookvie isn't running, or started after the session.** Start `bookvie`. If you started it after the Claude Code session started, run `/mcp` in Claude Code, pick `bookvie` and choose reconnect.
- **The command path moved.** Claude Code starts bookvie-dropbox from the absolute path you added. If `which bookvie-dropbox` now prints another path (after reinstalling `uv`, for example), remove the entry with `claude mcp remove --scope user bookvie-dropbox` and add it again with the new path.
- **`uv` not found.** `npm run install:local` installs bookvie with `uv`. Install `uv`, then reinstall bookvie and check the path again.

## Restoring

bookvie gives agents three tools for this:

- `list_local_backups` lists the backups on this computer that a restore can use, newest first. Those are the daily backups and safety copies in the backups folder, and the backups downloaded from Dropbox into its `from-dropbox/` folder.
- `preview_restore` says what restoring a backup would lose, and changes nothing: the backup's time and counts, your library's counts now, the titles of the books added since and the number of card notes added since.
- `restore_backup` replaces the whole library with the backup, after both confirmations.

The backups folder is `~/bookvie-backups` for the real app and `~/bookvie-backups-dev` for a `--dev` server. bookvie restores only from that folder and its `from-dropbox/`, never from a file anywhere else.

### Set up the first confirmation (once)

The first confirmation is Claude Code's own permission prompt. Add an `ask` rule for both servers' `restore_backup` to `~/.claude/settings.json`, merging it into any `permissions` you already have:

```json
{
  "permissions": {
    "ask": ["mcp__bookvie__restore_backup", "mcp__bookvie-dev__restore_backup"]
  }
}
```

To check it's active, start a new Claude Code session and run `/permissions`. Both names should be listed under Ask. Without the rule, Claude Code may run `restore_backup` without asking you, and only bookvie's own question is left.

### The two prompts

When the agent calls `restore_backup`, you see two prompts, in this order:

1. **Claude Code's permission prompt**, from the `ask` rule. It names the tool, `restore_backup`, and the backup's path. Decline it and nothing is called.
2. **bookvie's question**, one paragraph of plain text with Accept and Decline:

   > Replace all data with the backup from 19 Nov, 09:02? You'd lose 3 books added since (Designing Data-Intensive Applications, Thinking in Systems, Atomic Habits), 18 card notes, and every other change since then. A safety copy of your current library is saved first.

   When nothing was added since the backup, the middle sentence reads "Every change since then goes back, such as pages reached." bookvie works out the counts and titles itself, from the exact file and your library as it is, so they're true even if the agent skipped its own preview.

Only Accept restores. Decline, closing the question, or waiting more than 5 minutes changes nothing. So does a library or backup file that changed after the question was asked, or a bookvie restarted in between. Ask the agent again to get a fresh question.

bookvie's question needs a client that can show it. The Claude Code terminal CLI can. VS Code, the desktop app and `claude -p` can't, and bookvie then refuses the restore and changes nothing.

### The safety copy, and undoing a restore

Before it replaces anything, bookvie saves your current library into the backups folder as `bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`, named by the time of the restore, for example `~/bookvie-backups/bookvie-pre-restore-2026-11-21T1004.zip`. A second safety copy in the same minute gets `-2`, then `-3`, and so on. A safety copy never replaces a daily backup, and it doesn't count as an export, so "Last export" on the Backup page doesn't move.

The agent's answer names the safety copy. To undo the restore, ask the agent to restore that safety copy. `list_local_backups` lists it with the kind `safety`, and it goes through the same two prompts. Restoring it saves another safety copy first.

### Troubleshooting

Each refusal leaves your library as it was.

#### `restore_not_confirmed`: "Not restored. Nothing was changed."

You declined or closed bookvie's question, or it couldn't go on. The answer's `reason` says which:

- `declined` or `cancelled`: you said no or closed the question. Ask again if you meant to restore.
- `unsupported`: the client can't show bookvie's question. Run the restore in the Claude Code terminal, not VS Code or `claude -p`.
- `expired`: more than 5 minutes passed, or bookvie restarted, before you answered. Ask again.
- `changed`: the library or the backup file changed after the question was asked, or the answer didn't match it. Ask again, and bookvie asks about the backup as it is now.

#### A refused backup: `restore_invalid`, `restore_unsafe`, `restore_newer_version`

The same refusals as the Backup page's **Restore from file…**:

- `restore_invalid`: the file isn't a bookvie export, or it's damaged. Pick another backup.
- `restore_unsafe`: the file breaks one of bookvie's safety rules for archives, such as a file name pointing outside the library or a size over the limit. bookvie shows it as damaged. Pick another backup.
- `restore_newer_version`: the backup was made by a newer bookvie. Update bookvie, then restore again.

#### `safety_copy_failed`: "Couldn't save a safety copy, so nothing was restored."

bookvie couldn't write the safety copy into the backups folder, so it didn't restore. Check that the disk isn't full and that the backups folder can be written, then try again. No partial safety copy is left behind.

#### `couldnt_save`: bookvie couldn't read or save

bookvie couldn't read the backup file or your library, or couldn't save the restored library, so your library is as it was. Check that the disk isn't full and that the data folder and the backups folder can be read and written, then try again. If it failed while saving the restored library, the safety copy may already be in the backups folder. It's a copy of your library as it still is, and you can delete it or keep it.

#### A backup is missing from the list

`list_local_backups` lists only files that keep their original name. Daily backups (`bookvie-backup-<YYYY-MM-DD>.zip`) are listed from the backups folder and from its `from-dropbox/`. Safety copies (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`, or with `-2`, `-3` and so on) are listed only directly in the backups folder. A file that is damaged, or isn't a bookvie export, isn't listed; bookvie logs why. Rename a renamed backup back, or move it into the right folder.

#### `restore_outside_backups`: "bookvie restores only from its backups folder. Nothing was changed."

The path isn't a backup in the backups folder or its `from-dropbox/`. A path elsewhere, one with `..`, a symlink, a folder, or a file whose name isn't a daily backup (`bookvie-backup-<YYYY-MM-DD>.zip`) or a safety copy (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`) is refused before bookvie opens it. Move or copy the backup into the backups folder under its original name, or pick one from `list_local_backups`.
