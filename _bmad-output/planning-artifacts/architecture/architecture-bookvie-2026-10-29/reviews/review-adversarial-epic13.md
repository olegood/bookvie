# Adversarial review: AD-22 and the Epic 13 amendments

- **Target:** `ARCHITECTURE-SPINE.md` (uncommitted working copy, 2026-11-21): AD-22, and the Epic 13 ("planned") edits to AD-1, AD-4, AD-9, AD-15, AD-21, the stack, the tree and the capability map.
- **Context read:** `dropbox-backup-plan-2026-11-21.md` (D1–D20, §4 story cut), EXPERIENCE.md (Auto-backup line, Agent conversations → Restore, Flow 14), `store/local_state.py`, `store/store.py` (`record_export`, `lock`), `intents/backup_file.py`, `intents/export.py`, `intents/restore.py`, `agent/tools.py`, `http/app.py`, the two existing bookvie skills.
- **Method:** for each pair of units, assume both obey every AD to the letter and ask whether they still build incompatibly. Then attack the safety claims directly.

**Verdict:** AD-22 is detailed and mostly coherent, but it is not ready to bind Epic 13. One finding is critical: the claim that the unattended run can't restore depends on blocking two MCP tool names, while the skills already send raw `curl` requests to `/mcp`. Three findings are high: the existing folder rule can route a scratch library into the production upload folder; the existing whole-file `record_export` wipes the upload state; and a safety copy built "like `export_backup`'s file" inside the restore's lock hold deadlocks on the lock, which isn't reentrant. Each finding below ends with a proposed AD-22 sentence.

---

## F1 (critical): the gates guard the MCP tool, not the server, and the headless run can reach the server through Bash

**Units:** Story 13.4 (the plist's `--allowedTools` / `--disallowedTools`) and Story 13.3 (the `bookvie-backup` skill), together with the existing skill pattern and the stateless `/mcp` mount (AD-21).

- AD-22 says the skill "starts bookvie when it isn't running", like the other two skills. Those skills do this with Bash: `curl -fsS …/api/health`, `bookvie --no-browser` in the background, and a raw `curl -X POST …/mcp … tools/call` probe (`.claude/skills/bookvie-new-book/SKILL.md:40-56`). So the plist's "exactly the skill's tools" has to include Bash, and the spine doesn't say how narrowly.
- `/mcp` is stateless and needs no `initialize` (AD-21, on purpose). Under MCP 2026-07-28, gate 2's "answer" is just the client's second `tools/call`, which carries `requestState` and `inputResponses`. Any local HTTP client can be that client. Two `curl` calls do the whole job: the first gets the sealed `requestState`, and the second sends it back with `{"action":"accept"}`. The seal proves that bookvie asked the question. It doesn't prove that a person answered it.
- `--disallowedTools mcp__bookvie__restore_backup` and the `ask` rule (gate 1) match only the MCP tool name. Neither one matches `Bash(curl … restore_backup …)`. Neither matches `curl -F archive=@… /api/intents/restore` either: the UI route has no gate at all, and the Host/Origin guard lets through a request with no Origin header.
- So a headless `claude -p` run whose Bash allow-list is broad (for example `Bash(curl:*)`), or a prompt-injected run, can restore with neither gate. That breaks FR-30 and the "Prevents: the unattended run reaching a restore" line.

**Proposed AD-22 sentences:**
> The plist's `--allowedTools` grants Bash only as exact commands: the health `curl` for port 8765 and `bookvie --no-browser` (`Bash(curl -fsS http://127.0.0.1:8765/api/health)`, `Bash(bookvie --no-browser)`), never `Bash` or `Bash(curl:*)`. The `bookvie-backup` skill drops the raw `/mcp` probe and checks the tools with `get_app_info`. A test reads the generated plist and fails on any Bash entry that isn't one of those exact commands.

> The two gates protect the agent tool path only. They don't protect against a local process that speaks HTTP to bookvie, which can already restore through `POST /api/intents/restore`. That process is outside FR-30's threat model (AD-16's local trust boundary), and the guide says so.

---

## F2 (high): a scratch library named `~/bookvie` writes to, and uploads from, the production backups folder

**Units:** the existing `intents.backups_folder` (Story 12.6) and Story 13.1 (`upload_backup` trusts "in `~/bookvie-backups` ⇒ production").

- `backups_folder` gives the sibling `<resolved name>-backups` for any data folder that isn't one of the two defaults (`backup_file.py:62-63`). With `bookvie --data-dir ~/bookvie`, the sibling is `~/bookvie-backups`, which is exactly the production folder.
- That server's `export_backup` then replaces the real `bookvie-backup-<today>.zip`. `upload_backup` accepts the file, because it meets every rule in AD-22: a daily name, directly in the resolved `~/bookvie-backups`. A good copy is then pushed out of Dropbox. The scratch server's `list_local_backups` and `restore_backup` also see the real library's backups.
- AD-22's sentence "A development, scratch, e2e or test server's backups are in other folders, so they can never upload (D8)" is false for this data folder. The same goes for any path that resolves to `~/bookvie`, such as a symlink. The dev folder can't collide this way, because no name plus `-backups` gives `bookvie-backups-dev`. But a scratch folder named `~/bookvie` is an easy name to pick.

**Proposed sentence (Folder rule, AD-21 Backup, cross-referenced from AD-22):**
> When the sibling rule would give `~/bookvie-backups` for a data folder that isn't that folder's default, there is no backups folder (`backups_dir=None`, so `export_backup` is `couldnt_save`, and the restore tools refuse). Only `~/bookvie-data` ever writes into `~/bookvie-backups`, and a test pins `~/bookvie` → no folder.

---

## F3 (high): the existing `record_export` writes the whole file, so the first export after 13.2 wipes `autoBackup`

**Units:** the existing `Store.record_export` / `local_state_bytes` (Stories 2.1 and 12.6) and Story 13.2 (the upload state). Story 13.5 reads the result.

- `Store.record_export` writes `local_state_bytes(now)`, which is `{"lastExportAt": …}` and nothing else, through `_write_atomic` (`store.py:587-598`, `local_state.py:24-26`). AD-15 now says "One writer in `store/local_state` … read-modify-writes only the group it changes". Story 13.2's scope (plan §4) is "`record_backup_upload`, the upload state, the fields in `views/backup`". Converting the old writer isn't listed. A 13.2 that adds a new RMW writer for `autoBackup` and leaves `Store.record_export` alone obeys the letter of its story. The next daily `export_backup` (which records `lastExportAt`) then erases `autoBackup` every morning, so the line reads Waiting forever.
- The lock: AD-15 says "under a lock in the process". If that lock is `store.lock` (AD-4), then `record_backup_upload` and `record_export` wait behind a restore's lock hold, which covers a 73 MB staging and the safety copy. That's harmless. If it is a second lock, it must be the only lock that `record_export` takes too.

**Proposed AD-15 / AD-22 sentence:**
> Story 13.2 turns `Store.record_export` into a call to `store/local_state`'s one read-modify-write writer. That writer holds its own `threading.Lock`, not the AD-4 lock, and `local_state_bytes` with its whole-file shape is removed. A test records an upload, then an export, then an upload, and asserts that both groups survive each step.

---

## F4 (high): "built and written like `export_backup`'s file" inside the restore's lock hold deadlocks, and it moves "Last export"

**Units:** Story 13.6 (Apply step 2) and the existing `build_export` / `write_backup` (Story 12.6), with the existing `restore()` (Story 2.x).

- `Store.lock` is a plain `threading.Lock` (`store.py:250`), and `replace_all` documents that it "is not reentrant". `build_export` takes `store.lock` itself (`export.py:106`). AD-22 says the safety copy is written "inside the restore's own lock hold … built and written like `export_backup`'s file". The obvious reuse, `build_export` or `write_backup`, hangs the restore and then every intent after it.
- `write_backup` also calls `store.record_export(now)` and uses `backup_name`, which gives the daily name. Reusing it moves "Last export", which contradicts "a restore touches neither" (AD-22 Upload state, EXPERIENCE "A restore changes neither"). It would also overwrite today's daily file, which is plan D16's trap.
- `intents/restore.restore()` takes the lock and runs `_restore_locked` in one block, so there's no seam between staging and `replace_all`. 13.6 has to split the core so that the route gets no safety copy and the tool gets one, while staying "the same core". The spine doesn't name that seam, and the contract test compares only results.

**Proposed sentence (AD-22 Apply step 2):**
> The safety copy is written with the lock-free zip writer (`intents/export`'s `_write_zip`, which the caller runs while holding `store.lock`) and the shared atomic file write. It never calls `build_export`, `write_backup` or `record_export`. `intents/restore` exposes `restore_locked(store, archive, before_apply=None)`: the route passes `None`, and the tool passes the safety-copy step. A test asserts that `lastExportAt` and `autoBackup` are byte-identical after a tool restore.

---

## F5 (medium-high): gate 2's seal doesn't bind the library it describes, isn't single-use, and doesn't pin the retried path

**Units:** Story 13.6's first call (the question) and its retry (the apply). Also the browser, other agent tools and the 09:00 run, which can change the library or the file between the two.

- **Stale truth.** The confirmation text ("You'd lose 3 books … 18 card notes") is computed from the library as it is at question time. The seal covers `{path, file SHA-256, expiry}`. Suppose a Book is added in the browser, or by `bookvie-new-book` in another session, during the 5 minutes. The user then accepts a sentence that no longer describes what will be lost. EXPERIENCE requires the dialog to be "true even if the chat preview was skipped".
- **Replay.** Nothing consumes the seal. Inside 5 minutes, the same `requestState` together with `accept` can be sent again (by a retrying client, or by F1's curl). That gives a second restore and a second safety copy, and it wipes edits made in between without anyone being asked.
- **Redirect.** The retry carries the tool arguments again. AD-22 says bookvie "hashes the file again" but doesn't say which file. An implementation that verifies the sealed path and then applies `arguments.path`, or the reverse, restores a file nobody approved.
- **TOCTOU.** `export_backup` writes outside the AD-4 lock (AD-4) and can replace `bookvie-backup-<today>.zip` between the re-hash and the staging read. Then the bytes that get staged aren't the bytes that were hashed.

**Proposed sentences (Gate 2):**
> The seal covers `{path (resolved), the file's SHA-256, the current library.json's SHA-256, a random nonce, expiry}`. On the retry, bookvie refuses with `changed` when the retry's `path` doesn't resolve to the sealed path, when the library's hash has moved, or when the nonce has already been used. Nonces live in process memory and are consumed by the first retry that verifies. Apply reads the file once, under the lock, into the staging spool, and compares the SHA-256 of those same bytes with the sealed hash before anything is unpacked.

---

## F6 (medium-high): the stored upload state can't produce the Stalled sentence

**Units:** Story 13.2 (the `autoBackup` shape) and Story 13.5 (EXPERIENCE's Stalled detail).

- EXPERIENCE's Stalled detail is "no backup since *the latest upload or skip*". AD-22 stores `lastReport`, which a failure replaces, and `lastUpload`. Take the sequence: skip Monday, skip Tuesday, fail Wednesday, no run Thursday. The latest upload-or-skip is Tuesday, but `lastReport` now holds Wednesday's failure and `lastUpload` holds last week's upload. The view fields (`reportAt`, `lastUploadAt`, `copies`, `cause`) can't say "since Tuesday". 13.5 would either show the wrong date or need a field that 13.2 didn't store.

**Proposed sentence (Upload state):**
> `autoBackup` also stores `lastOk: {at, outcome: "uploaded" | "skipped"}`, which an upload or a skip replaces and a failure keeps. The view adds `lastOkAt`, and Stalled's detail uses it ("since it was set up" when it is missing).

---

## F7 (medium): a backup's time is computed three ways, and the zip's way ignores the injected Clock

**Units:** the existing `build_export` (zip entry time), `export_backup` (name and `createdAt`), Story 13.1 (`client_modified`), Story 13.6 (`list_local_backups`, the preview's "backup time") and Story 13.8 (merging rows and sorting newest first).

- `build_export` stamps `library.json` with `_zip_time()`, which is `time.localtime()`: the system clock, not the AD-20 `Clock` (`export.py:58-62`). The daily name and `createdAt` come from the injected `Clock`. Under `--fake-today` (the e2e suite and dev tries, D20), `bookvie-backup-2026-01-05.zip` says the real today inside. The safety copy's `<YYYY-MM-DDTHHMM>` (from the Clock) and its own entry time can also fall on different minutes.
- `bookvie_dropbox` can't import bookvie, so 13.1 has to choose a time for `client_modified`. It might use the file's mtime, the zip entry (naive local time with 2-second resolution and no offset) or the upload time. `list_backups` returns "its time" and `list_local_backups` returns "backup time", and nothing pins them to the same instant or the same format. 13.8 then sorts and merges a Dropbox time in UTC with a naive local time. A row that is on both sides shows two times, for example 09:02 and 09:03.
- `lastUpload.at` is the time of the record, which comes some minutes after a 73 MB upload. So the line's "last upload today at 09:04" names a backup that the pick list calls "21 Nov, 09:02".

**Proposed sentences:**
> A backup's time is one instant: `build_export(store, now)` stamps `library.json` with the injected `Clock`'s `now`, and the file's name date and `createdAt` come from that same `now`. Every tool that reports a backup's time (`list_backups`, `list_local_backups`, `preview_restore`) returns it as ISO-8601 with an offset. `bookvie_dropbox` reads it from the zip's `library.json` entry by the copied rule (pinned with the other copies) and sets `client_modified` to that time in UTC. `lastUpload` also stores `backupAt`, and the line's "last upload" shows `backupAt`.

---

## F8 (medium): the daily-name pattern is a glob in some places and a parse in others

**Units:** Story 13.1 (upload allowlist, temporary name, prune), Story 13.7 (`list_backups`, `download_backup`), Story 13.6 (allowed restore files, `list_local_backups`) and Story 13.2 (`record_backup_upload`'s path check).

- The prune deletes "`bookvie-backup-*.zip` … ordered by the date parsed from the name", and `list_backups` returns "`bookvie-backup-*.zip`". Dropbox makes names like `bookvie-backup-2026-11-21 (Oleg's conflicted copy 2026-11-21).zip`, which match the glob, and the temporary upload name might match it too. A unit that globs counts such files toward the 3 and may prune a real copy to make room for them. A unit that parses strictly fails on them, or skips them. The spine names "the daily name" among the copied contracts, but as a format string, not as the matching rule.

**Proposed sentence (Two processes):**
> The daily name is the one regex `^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$` with a valid calendar date, and it is copied and pinned like the others. Every unit that selects, counts, prunes, lists, downloads or accepts a daily backup uses it. A name that doesn't match is never counted and never deleted. The temporary upload name (`.bookvie-upload-<uuid>.tmp`) and the safety-copy name never match it.

---

## F9 (medium): "replace that day's copy" can't be one Dropbox call, so the failure path can delete the only copy of the day

**Units:** Story 13.1's replace step and the claim that a failure "deletes nothing but its own temporary file".

- Dropbox's `files/move_v2` doesn't overwrite. To replace the same day's copy, 13.1 has to delete it first and then move the temporary file in. A failure between those two calls leaves no copy for that day. The rule then says the run deletes its temporary file, which is the only verified copy of the day. The older copies survive, but the claim "a failed upload costs no copy" is false for that day.
- **Clock jump.** If the machine date is behind, the new name sorts as the oldest, and "delete the oldest beyond 3" deletes the file that was just uploaded.

**Proposed sentences:**
> To replace the same day's copy, the old copy is first moved aside to `.bookvie-replaced-<uuid>.tmp`, then the verified temporary file is moved to the final name, and only then is the aside copy deleted. A failure moves the aside copy back and keeps the verified temporary file. The prune never deletes the name it just wrote.

---

## F10 (medium): `record_backup_upload` hashes the file at record time, which may not be the file that was uploaded

**Units:** Story 13.3 (the order: export, upload, record) and Story 13.2 (bookvie reads the zip's `library.json` when `record_backup_upload` is called).

- Between `upload_backup` returning and `record_backup_upload` being called, any `export_backup`, from an interactive agent or from a second manual `/bookvie-backup`, can replace `bookvie-backup-<today>.zip` with a newer library. bookvie then stores the newer library's hash as `lastUpload.libraryHash` while Dropbox holds the older one. The next run sees `unchangedSinceUpload: true` and skips, and that change never reaches Dropbox until the library changes again.

**Proposed sentence:**
> `upload_backup` returns the uploaded file's Dropbox `contentHash`. `record_backup_upload(uploaded)` also takes `contentHash`, and bookvie checks that the zip at `path` still has that hash (by the copied algorithm) before it stores the zip's `library.json` hash. When it doesn't, the call is refused with `invalid_fields` and nothing is stored, so the agent never vouches for a hash that bookvie hasn't checked.

---

## F11 (low-medium): the launchd probe is per machine, but the upload state is per library

**Units:** Story 13.4 (`launchd_probe`, one label) and Story 13.5 (the state from each server's own `local-state.json`), with the e2e servers.

- A production-mode server on a non-default data folder (`bookvie --data-dir /tmp/x`) sees the real job as installed and its own state as empty, so it shows "Waiting · first backup at 09:00" forever, for a library that the job never backs up.
- Playwright servers get a temporary `HOME`, but `launchctl print gui/<uid>/…` reads the real user's launchd. So the e2e expected state depends on whether Oleg's machine has the job installed, unless every e2e server stubs the probe. The spine stubs it only through a `create_app` keyword, which the e2e servers (started by the CLI) can't pass.

**Proposed sentence (Auto-backup state):**
> `autoBackup.state` is `off` unless this server's backups folder is the production `~/bookvie-backups`. A `--dev` server and a server on any other data folder are both `off` (reason `dev` or `other_library`), and only those servers skip the probe, so the e2e servers never run `launchctl`.

---

## F12 (low): gate 1 depends on the session's permission mode

- The `ask` rule doesn't apply under `--dangerously-skip-permissions` / `bypassPermissions`. Under auto mode a classifier stands in for the prompt. In those modes gate 2 is the only gate, and both gates are still claimed. This is acceptable, because it's the user's own choice of mode, the same reasoning AD-22 already applies to an Elicitation hook. But the spine should say it.

**Proposed sentence:**
> Gate 1 holds only in permission modes that show prompts. A bypass or auto mode is the user's own configuration, like an Elicitation hook, and leaves gate 2 as the one gate bookvie enforces.

---

## Checked and holding

- **The safety copy can't be uploaded or pruned.** Its name isn't a daily name, `upload_backup` and the prune select only daily names (made exact by F8), and it is written under the lock with `-2`, `-3` and so on. Within one process the lock serializes the check and the rename. F2 is the only way a second process could write the same folder.
- **An unattended restore through the MCP tool** is blocked twice: by `--disallowedTools` on both names, and because print mode can't answer an elicitation. The hole is the Bash path (F1), not the MCP path.
- **The 26-hour rule** is computed only in `views/backup`, against the Clock, from one stored time (`lastReport.at`), with the edge cases stated. Two computations can't disagree, provided both datetimes are offset-aware (aware subtraction gives an absolute difference, so DST is safe). Add "compared as instants" if you want it explicit. The real gap is the missing field (F6).
- **Restore and `local-state.json`.** `replace_all` never touches it, and an archive entry with that name is `restore_unsafe` (AD-15). The hazard to the upload state comes from export (F3), not from restore.
- **A dev backup reaching Dropbox** through the dev folders: blocked by the fixed production-folder check. F2 is the exception.
