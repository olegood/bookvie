# Backing up to Dropbox, and restoring

bookvie keeps your library on this computer. This guide covers getting it back from a backup through an agent in Claude Code. Daily backups to Dropbox come in later sections.

An agent can restore your library only through bookvie's own tools, and only after two confirmations it can't skip. bookvie saves a safety copy of your current library first, so a restore can always be undone.

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

#### A backup is missing from the list

`list_local_backups` lists only files that keep their original name. Daily backups (`bookvie-backup-<YYYY-MM-DD>.zip`) are listed from the backups folder and from its `from-dropbox/`. Safety copies (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`, or with `-2`, `-3` and so on) are listed only directly in the backups folder. A file that is damaged, or isn't a bookvie export, isn't listed; bookvie logs why. Rename a renamed backup back, or move it into the right folder.

#### `restore_outside_backups`: "bookvie restores only from its backups folder. Nothing was changed."

The path isn't a backup in the backups folder or its `from-dropbox/`. A path elsewhere, one with `..`, a symlink, a folder, or a file whose name isn't a daily backup (`bookvie-backup-<YYYY-MM-DD>.zip`) or a safety copy (`bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`) is refused before bookvie opens it. Move or copy the backup into the backups folder under its original name, or pick one from `list_local_backups`.
