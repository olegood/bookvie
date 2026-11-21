---
title: Review of the Epic 13 spine update (AD-22 and amendments)
reviewed: ARCHITECTURE-SPINE.md (working tree, 2026-11-21)
inputs:
  - _bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D1-D20, §5 Tests)
  - prds/prd-bookvie-2026-10-28/prd.md (FR-28, FR-29, FR-30, §5 Local-first, Data safety, Tone)
  - ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Auto-backup line, Agent conversations, Flows 13-14)
date: 2026-11-21
---

# Review: Epic 13 spine update

**Verdict:** AD-22 carries the plan faithfully and in more depth than the plan itself. Two places don't hold together yet: the daily run moves "Last export", and the unattended run has no way to start bookvie. A few quiet requirements are missing too, mostly in the `bookvie-restore` skill, which gets no rule of its own. The agreed deviations are stated consistently, with one exception: the wheel build line still lists `bookvie` alone (F4).

## Findings

### F1 (high): the daily run moves "Last export", which contradicts FR-29, D9 and Flow 13

- AD-21 Backup has `export_backup` record `lastExportAt`, and FR-28 says an agent's export "counts as the last export (FR-22)". AD-22's skill calls `export_backup` every morning.
- So once auto-backup is on, "Last export" reads "today" every day, on Backup and on Home's re-entry line.
- Flow 13 step 1 shows "Last export: 41 days ago" two months after setup. D9 and FR-29 say "a manual Export doesn't count as an upload" and "an upload doesn't change Last export". The UX Auto-backup line says "Export all data changes Last export, never this line, and an upload never changes Last export."
- AD-22's sentence "an upload never moves `lastExportAt`" is true of `upload_backup` alone. It hides the real effect, because the run's own export moves `lastExportAt`.
- **Fix (decide, then state it in AD-22 Upload state and AD-21 Backup):** either
  - (a) the skill's export doesn't record `lastExportAt`, for example through an argument on `export_backup` (it takes no arguments today, so AD-21's `NoArguments` rule changes) or a separate export entry point; or
  - (b) the daily run does count as an export, and Flow 13 and the UX line are amended.

  This is a product decision across PRD/UX, so it needs the owner.

### F2 (high): the headless run when bookvie isn't running: PATH, MCP connection and process lifetime

D6, D7 and FR-29 ("no app or agent session open") require the unattended run to start bookvie itself. The spine says only "starts bookvie when it isn't running", as the other skills do. That step doesn't work under launchd:

- **PATH.** launchd's job has a minimal `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`). The spine makes `claude` absolute, but not `bookvie`. The skills' fallbacks, `backend/.venv/bin/bookvie` and `uv run`, have the same problem. The `bookvie-dropbox serve` command that Claude Code launches for the stdio server has it too: plan §2 troubleshooting already names "uv not found" and "the Dropbox server's command path moved".
- **MCP connection.** The existing skills tell the user to run `/mcp` → reconnect when bookvie started after the session (`bookvie-new-book` SKILL.md §1). A headless `claude -p` can't do that. So at 09:00 with bookvie stopped, the `mcp__bookvie__*` tools may never connect, and the run can't call even `record_backup_upload`. The result is a Stalled line, not a Failing one.
- **Lifetime.** launchd kills a job's leftover process group when the job exits, unless `AbandonProcessGroup` is set. The spine should say whether a bookvie that the run started is meant to stop with the run, or to keep running.
- **Fix (AD-22, The schedule):**
  - The plist sets `EnvironmentVariables.PATH`, or install resolves every command the run needs to an absolute path.
  - The guide registers the Dropbox server with an absolute command (AD-22 should say so, since D12 checks commands).
  - The rule says how the headless run reaches bookvie's tools when bookvie wasn't running: start bookvie before `claude` from the plist or a wrapper, or verify that `-p` connects to an HTTP MCP server lazily. Record which.
  - The rule states whether the started bookvie is meant to outlive the job.
  - The `--allowedTools` bullet should say it includes the Bash commands of the start step (health `curl`, `bookvie --no-browser`), not only MCP tools.

### F3 (medium): the `bookvie-restore` skill has no rule; D19's "never" lines and FR-30's "never retries" are missing

AD-22 describes the `bookvie-backup` skill but not `bookvie-restore`, which appears only in the capability map. These lines don't land:

- the skill lists **both** sources and lets the user pick: it may suggest the newest but **never picks on its own** (D19, FR-30 "The user picks");
- it **never retries a refused or unconfirmed restore by itself** (D19; FR-30 "The agent never retries…"; Flow 14's failure path, "The skill doesn't ask again");
- the chat question comes first and is not a gate (stated under Gate 1/2 only through D15's citation);
- it uses `mcp__bookvie-dev__*` when asked to work on dev (D20), unlike `bookvie-backup`, which uses `mcp__bookvie__` only;
- it reports the result and the safety copy's path, and on `unsupported` points to the terminal CLI (UX outcome table). The wording belongs to UX, but the rule that `reason` drives the advice belongs here.
- **Fix:** add a "The `bookvie-restore` skill" bullet to AD-22, next to the `bookvie-backup` one. These are skill rules, but the spine already treats the backup skill as a unit with rules. The fail-closed gates make a retry safe, but they don't make it allowed.

### F4 (medium): the "second package in the same wheel" deviation is stated inconsistently

- AD-22 says `bookvie_dropbox` ships "in the same wheel", and the Structural Seed's `pyproject.toml` comment adds the console script.
- The Structural Seed's **Build and install** paragraph still reads `[tool.hatch.build.targets.wheel] packages = ["bookvie"]`, and the install smoke test still checks only `bookvie`.
- **Fix:**
  - Mark `packages = ["bookvie", "bookvie_dropbox"]` as planned.
  - Add to the smoke test (Testing row) that the installed tool provides `bookvie-dropbox`.
  - Say that `dropbox` and `keyring` become runtime dependencies of the one wheel, which the server never imports (`test_layers`).

### F5 (medium): Stalled's "no backup since" needs a time the stored state no longer holds

- UX: Stalled shows "no backup since *the latest upload or skip*".
- AD-22 stores `lastReport` (replaced by every report, failures included) and `lastUpload` (uploads only).
- Take this sequence: a skip on day 1, a failure on day 2, then nothing until day 4. The latest skip time is gone, so the line would show the older `lastUpload.at`, or the failure's time.
- The view's listed fields (`reportAt`, `lastUploadAt`, `copies`, `cause`) have nothing for "latest upload or skip".
- **Fix (AD-22 Upload state and Auto-backup state):** keep a `lastSuccessAt` (the latest upload or skip), or a `lastSkipAt`, and expose it in `views/backup`. Alternatively, amend the UX to say "since the last upload".

### F6 (medium): `preview_restore`'s "the number of such Card notes" is ambiguous

- D14, FR-30 and the UX ask for the number of Card notes the current library has that the backup lacks: "18 card notes". That includes notes added to Books that are in both.
- AD-22 says "the titles of the Books whose ids are in the current library and not in the backup, and the number of such Card notes". That reads as the notes of those Books only.
- **Fix:** "the number of Card notes, on any Book, whose ids are in the current library and not in the backup".

### F7 (low): smaller gaps and inconsistencies

- **D12 docs test.** Plan §5 "Docs match the code" (P1) parses `docs/dropbox-backup.md`'s code blocks against the CLI, and checks that every state has an entry with its exact wording. It's a cross-cutting check reading two units, but it's missing from Consistency Conventions → Testing. The README → Agent tools paragraph (D12) isn't mentioned either.
- **`download_backup` / `list_backups` errors.** The cause enum is said to cover `upload_backup` and `record_backup_upload` only. The UX restore outcomes tell a sign-in failure, a network failure and a hash mismatch apart ("Couldn't download… *reason*", "The download didn't match…"), so state that the download tools use the same enum, or name their codes.
- **Pinned copies.** "What both sides need is a copy on each side" lists `~/bookvie-backups` but not `~/bookvie-backups-dev`, which `download_backup`'s `bookvie-dev` target also hard-codes (D20).
- **AD-21 description rule.** "Each registered description equals its text in `epics.md` Epic 12": the Epic 13 tools' descriptions will live in Epic 13. Plan 13.6 also says the description must say the user confirms and that the agent never calls it on its own initiative. Say "its epic" instead.
- **AD-1 "the one thing written outside the data folder"** now has three exceptions: the backup, the safety copy, and `bookvie-dropbox`'s downloads. It still omits `bookvie autobackup install`'s plist in `~/Library/LaunchAgents/` and the log folder under `~/Library/Logs/bookvie/`. These are written by the CLI, not the server, so they may be out of AD-1's scope. If so, say so.
- **`upload_backup(local_path, keep=3)` → `upload_backup(localPath)`, keep fixed.** This is a fair tightening, but it isn't among the listed deviations. Record it in the memlog as a decision, so the 13.1 ATDD doesn't follow the plan's signature.
- **Stale preview at accept.** The seal covers the file's hash, not the current library. A change made in the 5 minutes between the question and the accept makes the dialog's "you'd lose…" stale. The risk is low for one user; say it is accepted.
- **Backup time across the round trip.** The zip entry time is local and has no offset, while Dropbox's `client_modified` is UTC. Name the conversion, so that `list_backups` and `list_local_backups` show the same time for one backup, which the UX's one-row merge relies on.
- **Stack.** The `mcp` row describes only the streamable-HTTP use. `bookvie_dropbox` uses the same SDK's stdio server, and `restore_backup` relies on 2026-07-28's `InputRequiredResult`. Say that 2.3.x carries both, or bump the pin.

## Checked and landed

These landed consistently with the inputs and the agreed deviations:

- **The two processes and the import ban:** D1, D3, the layers test.
- **Verify, then prune:** temp name, size and hash check, rename, prune by the date parsed from the name, a failure deletes nothing (D2, §5 P0).
- **Dropbox scope and sign-in:** App folder, PKCE, Keychain only, no token in a result or a log, a fake `DropboxApi` (D4, D5).
- **D6:** absolute `claude`, `--allowedTools` exactly, `--disallowedTools` on both `restore_backup` names, 09:00 with a run on wake, the plist test.
- **D8, folder-based:** a dev, scratch or test backup can't upload, refused before any network call.
- **Unchanged decided by bookvie:** SHA-256 of `library.json`; a skip is always recorded (D7, deviation).
- **D9 / AD-15:** a separate key group, one writer, a restore touches neither group, `at` from the Clock.
- **D10:** the launchctl probe as a seam; non-macOS reads as not installed.
- **The 26-hour edge:** at exactly 26 h still On or Failing, a future report time counts as now, unreadable state reads as no report, first-match order (UX supersedes D11), dev is Off.
- **D13 / AD-21:** restore is the only ban lifted; delete-book and delete-card-note stay banned; the same handler, with a tool-and-route contract test.
- **D14:** counts, lost titles, AD-14 refusal codes (apart from F6).
- **D15:** both gates; fail closed with `reason` (`declined`, `cancelled`, `unsupported`, `expired`, `changed`); "only an explicit accept goes on"; the Elicitation-hook acceptance; the 2025-11-25 fallback deferred (deviation stated consistently in AD-21, AD-22 and Deferred).
- **D16:** safety copy inside the lock hold after validation (deviation, consistent in AD-4 and AD-22); never a daily name; never pruned or uploaded; failure means no restore; the path is in the result; it never touches `local-state.json`.
- **D17:** allowed folders, `..` and symlinks refused before any read.
- **D18 / D20:** `download_backup` is atomic, hash-checked and lands in `from-dropbox/`; the dev target.
- **`list_local_backups`:** the deviation, with the content hash for the UX's one-row merge.
- **AD-9 codes:** `restore_outside_backups`, `restore_not_confirmed` with `reason`, `safety_copy_failed`.
- **PRD §5:** Local-first (bookvie makes no Dropbox call; the Logging row) and Data safety.
- **FR-28 amendments:** AD-21's tool list and binds.

## Skipped as UX copy or story detail

These are not spine material:

- the line's wording, `ink` vs `ink-tertiary`, "not a live region", Backup only and never Home;
- the "When" formatting and the `~` in paths;
- the pick list's 10-row cap and "show all";
- the preview layout and the "up to 5 titles" rule (the confirmation text is referenced as EXPERIENCE.md's, which is enough);
- the outcome sentences and the Auto-backup report's one-line wording;
- the guide's section list (D12 §1-4);
- 13.6's "record what Claude Code does in VS Code and `-p`";
- the manual real-run checks in 13.3, 13.4 and 13.8.
