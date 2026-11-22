---
title: 'Story 13.1: Restore my library through an agent, with two confirmations'
type: 'feature'
created: '2026-11-21'
status: 'in-review'
baseline_revision: '1815bff46b3520689c62178b8b2a3e957467849f'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-1-restore-my-library-through-an-agent-with-two-confirmations.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** An agent can't restore the library. AD-21 bans `restore` as a tool because nothing stops an agent from wiping the library on its own, and no safety copy is kept.

**Approach:** Add three agent tools (AD-22): `list_local_backups`, `preview_restore(path)` and `restore_backup(path)`. `restore_backup` asks the user itself through MCP 2026-07-28 form elicitation, using a hand-sealed `requestState`. Only an explicit accept on a valid token goes on. Then, in one hold of the store lock, it checks the hashes, stages and validates, writes a safety copy and applies through the same lock-free cores that `POST /api/intents/restore` uses. The story also ships the Restoring section of `docs/dropbox-backup.md` and a README paragraph.

## Boundaries & Constraints

**Always:**
- Story 13.1 in `epics.md` is the source of truth for the acceptance criteria, and AD-22 for the design.
- The red leaves in `backend/tests/test_agent_restore.py` and `test_dropbox_backup_guide.py` are the contract. Unskip them; don't weaken them.
- Each new tool's description is the exact `Description:` text from Story 13.1.
- `restore_backup` checks in this order: arguments, then `unsupported` (protocol below `2026-07-28`, or no form elicitation), then the allowed path, then everything else. Nothing is built before `unsupported`.
- The HMAC key, the process nonce and the issued single-use nonces belong to each app, never to the module. A second `create_app` is a restart.
- On accept, in one `store.lock` hold:
  1. Check the library's SHA-256.
  2. Read the file once into a spool and check its SHA-256.
  3. Stage and validate.
  4. Write the safety copy (`write_export_zip` plus the atomic write through `store.fs`).
  5. Run `apply_staged`.
- `.staging/` is emptied afterwards, whatever happened.
- `local-state.json` is never written by any restore path.
- Error objects carry `reason` only on `restore_not_confirmed`, and no new code carries `fields`.

**Never:**
- Install the SDK's `RequestStateBoundary`.
- Call `build_export`, `write_backup` or `record_export` from the safety copy.
- Take `store.lock` twice.
- Change `POST /api/intents/restore`'s behavior or the Backup page.
- Make `restore`, `delete_book`, `delete_card_note` or `set_spine_color` a tool.
- Touch Dropbox (Stories 13.2 to 13.8).
- Edit the spine (spine drift goes to deferred-work).
- Edit `README.md` beyond the one paragraph.
- Run any banned git command (AGENTS.md, Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List | The backups folder has daily, safety and `from-dropbox/` daily files, plus junk, a folder and symlinks | `{backups: [{path, kind, backupTime, size, contentHash}]}`, newest first. Junk, `.tmp*` files, folders and symlinks are left out. | A missing or empty folder gives `[]`. A named file that can't be read as a zip with `library.json` is left out and logged. |
| Preview | A valid path | `{backupTime, backup:{books,cardNotes,covers}, current:{…}, booksAddedSince:[titles in current order], cardNotesAddedSince}`. Nothing changes. | 422 `restore_invalid` / `restore_unsafe` / `restore_newer_version`, as the route answers |
| Disallowed path | A path that is relative, has `..`, points outside, is a symlink out, a folder, nested, or has a non-backup name | 422 `restore_outside_backups`, checked before the file is opened | Nothing changes |
| Ask | A 2026-07-28 client with form elicitation, and no input responses | `InputRequiredResult`: one `elicitation/create` form request whose message is the UX-DR80 text, an `object` schema with nothing required, and a sealed `requestState` | Nothing changes |
| Answer not accepted | Decline, cancel, a tampered or reused token, more than 5 minutes later, a restart, another path, or a changed library or archive | 409 `restore_not_confirmed` with `reason` `declined`, `cancelled`, `changed`, `changed`, `expired`, `expired`, `changed`, `changed` | Byte-identical folders |
| Unsupported | Protocol below 2026-07-28, no `elicitation`, or url-only elicitation | 409 `restore_not_confirmed`, `reason: unsupported`, before any preview | — |
| Accept | A valid token, and nothing has changed | `{restoredFrom, backupTime, safetyCopy}`. The safety copy is `bookvie-pre-restore-<YYYY-MM-DDTHHMM>[-N].zip`. | A safety-copy write fault gives 503 `safety_copy_failed` (kind `couldnt_save`), with no partial file and nothing restored. A commit fault gives 503 `couldnt_save`, as the route answers. |

</intent-contract>

## Code Map

- `backend/bookvie/intents/contract.py` -- Add `ErrorCode` members `restore_outside_backups`, `restore_not_confirmed` and `safety_copy_failed`. Add `RestoreNotConfirmedReason` (`declined`, `cancelled`, `unsupported`, `expired`, `changed`) and an optional `ErrorBody.reason`. Add three factories with the UX-DR81 messages (ATDD checklist, "What the leaves pin"). The OpenAPI schema changes, so run `api:gen`.
- `backend/bookvie/intents/export.py` -- `_write_zip` becomes the lock-free `write_export_zip(store, out, now)`, which `build_export(store, now)` wraps. `library.json`'s entry gets `date_time` from `now`'s local wall time, plus an Info-ZIP extended-timestamp extra field (0x5455, the UTC mtime). Callers: `http/api.py:331` (passes `clock.now()`) and `backup_file.write_backup` (passes its `now`).
- `backend/bookvie/intents/restore.py` -- Split into the lock-free `stage_and_validate(store, archive) -> StagedRestore` and `apply_staged(store, staged)`. Both map exceptions to the same IntentErrors as today, through one shared mapping. `restore()` takes the lock, then runs stage, apply, and `empty_staging(quiet=True)`.
- `backend/bookvie/intents/backup_file.py` -- New pieces:
  - The daily and safety name regexes, and `FROM_DROPBOX`.
  - `resolve_backup_path(backups_dir, raw) -> Path`, raising `restore_outside_backups`.
  - `dropbox_content_hash(path)`, stdlib only, in 4 MiB blocks.
  - `backup_time(zipfile)`: the 0x5455 field when present, else `date_time` read as local time.
  - `list_local_backups(backups_dir) -> LocalBackups`.
  - The lock-free `write_safety_copy(store, now, backups_dir) -> Path`, which reuses `_write_atomic` with a `refusal` factory, so the safety copy fails as `safety_copy_failed` and the daily backup as `couldnt_save`.
- `backend/bookvie/intents/restore_file.py` (new) -- Restoring from a file in the backups folder:
  - `library_sha256(store)`.
  - `preview_restore(store, path) -> RestorePreview`, under the lock, staging emptied after.
  - `apply_confirmed_restore(store, clock, backups_dir, path, sealed: Sealed) -> RestoredBackup`. It runs the AD-22 apply order. A hash that moved raises `restore_not_confirmed("changed")`.
- `backend/bookvie/intents/__init__.py` -- Export the new names.
- `backend/bookvie/agent/restore_gate.py` (new) --
  - `RestoreGate`, one per app: a key from `secrets.token_bytes(32)`, a process nonce, and the issued nonces with their expiry.
  - `seal(...) -> str` and `open(token, now) -> Sealed` (raises `expired` or `changed`).
  - `confirmation_text(preview, today)`, which follows `tests/helpers.confirmation_text`.
  - `elicitation_supported(protocol_version, capabilities)`.
- `backend/bookvie/agent/tools.py` -- Add `ToolCall` (protocol version, capabilities, input responses, request state) and an `AgentTool.interactive` flag; `run(state, args, call)` takes the call when the flag is set. Add the three tools, and append them to `TOOLS` after `EXPORT_BACKUP`. `PathArguments(IntentModel): path: str`.
- `backend/bookvie/agent/server.py` -- `call_tool` builds `ToolCall` from `ctx.protocol_version`, `ctx.meta[CLIENT_CAPABILITIES_META_KEY]`, `params.input_responses` and `params.request_state`. It passes an `InputRequiredResult` through unchanged.
- `backend/bookvie/http/app.py:251` -- Add `app.state.restore_gate = RestoreGate()`.
- `docs/dropbox-backup.md` (new) and `README.md` (the `## Agent tools` section) -- AC-12.
- Read-only evidence:
  - `store/store.py:488` `replace_all` (the caller holds the lock).
  - `store/restore.py:286` `stage_archive` (it empties staging first).
  - `tests/helpers.py` (`confirmation_text`, `backup_zip`, `SetClock`).
  - `tests/agent_client.py` (the 2026-07-28 wire).
  - The mcp 2.3.0 SDK: `mcp_types.InputRequiredResult`, `ElicitRequest`, `ElicitRequestFormParams`, and `ServerRequestContext.protocol_version` and `.meta`.
- Deferred-work intake: no entry names story 13.1 or Epic 13. Checked `deferred-work.md` for "13.1" and "Epic 13": none.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/intents/contract.py` -- Add the codes, the reason and the factories -- AC-4, AC-6, AC-8, AC-10.
- `backend/bookvie/intents/export.py`, `backup_file.py`, `http/api.py` -- Add the clocked `write_export_zip` and `build_export` -- AC-2.
- `backend/bookvie/intents/restore.py` -- Split out the lock-free cores, keeping the route's behavior -- AC-7, AC-9.
- `backend/bookvie/intents/backup_file.py` -- Names, allowed path, content hash, backup time, listing, safety copy -- AC-1, AC-4, AC-8.
- `backend/bookvie/intents/restore_file.py` -- Preview and confirmed apply -- AC-3, AC-7, AC-9.
- `backend/bookvie/agent/restore_gate.py`, `tools.py`, `server.py`, `http/app.py` -- The gate, the three tools and the call context -- AC-5, AC-6, AC-10.
- `backend/tests/test_agent_restore.py`, `test_dropbox_backup_guide.py` -- Remove each `@pytest.mark.skip(reason=RED)` and drop the unused `RED`.
- Add green-phase leaves to `test_agent_restore.py` for:
  - the "nothing added" message and more than 5 titles;
  - `{"elicitation": {"form": {}}}` counting as form;
  - a response under the wrong key, or no response with a token (`cancelled`);
  - the export route's zip carrying the extended timestamp.
- `frontend/src/api/generated/schema.d.ts` -- Regenerate with `npm --prefix frontend run api:gen` (never format it).
- `docs/dropbox-backup.md`, `README.md` -- The Restoring section and the README paragraph -- AC-12.

**Acceptance Criteria:**
- Given Story 13.1's AC-1 to AC-10 and AC-12, when `uv run pytest -q tests/test_agent_restore.py tests/test_dropbox_backup_guide.py` runs with no skips, then every leaf passes. The 10 existing tool-list sites are green with no edit.
- Given the whole repo, when `npm run check` runs, then it passes, including `api:gen`'s byte compare, ruff, Prettier, oxlint and the e2e suite.
- Given AC-11 (manual, Oleg's terminal runs), when this build ends, then the story is `in-review`, with AC-11 recorded as pending Oleg's manual run. It can't be marked done until the runs are recorded (Epic 12 retro item 85).

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 29 findings — high 0, medium 7, low 15, false 3, maybe-false 4 (the intent-alignment audit reported divergences, not findings: it reads the diff as this story's build step, with AC-11 pending)
- findings:
  - `medium` `patch` Edge case: a non-ASCII `requestState` makes `compare_digest` or `_mac` raise, so the tool answers `couldnt_save`, not `changed` — `RestoreGate.open` refuses a non-str or non-ASCII token as `changed` first; `test_restore_backup_edges.py` (d).
  - `low` `reject` Edge case: `extended_timestamp` packs an int32, so a clock after 2038 raises `struct.error` — not met in everyday use, and the fix adds a branch.
  - `medium` `patch` Edge case: a symlinked backups folder lists nothing while `resolve_backup_path` accepts its files — `_candidates` and `write_safety_copy` use the resolved folder, and the symlink skip applies only to `from-dropbox/`; test (c).
  - `low` `reject` Edge case: on a retry the path is checked before the token, so a deleted backup gives `restore_outside_backups`, not `changed`, and the nonce waits for expiry — the spec fixes that order (arguments, unsupported, path), the restore is still refused and nothing changes, and the nonce expires harmlessly.
  - `low` `patch` Edge case: a file swapped for a FIFO after the `lstat` check blocks `os.open` while holding the store lock — `_read_once` adds `O_NONBLOCK`; the `fstat` regular-file check stays.
  - `maybe-false` `reject` Edge case: a version string that isn't a date but sorts after `2026-07-28` passes `elicitation_supported` — whether the SDK lets an unknown revision reach the handler is unchecked; if true it's low, and the fix adds a guard.
  - `medium` `patch` Verification gap: nothing pins `backup_time` reading the 0x5455 field (whole-minute times pass with the fallback) — test (a) writes at 09:02:37 and asserts the seconds.
  - `medium` `patch` Verification gap: no case with `from-dropbox/` as a symlink to an outside folder — test (b): preview and restore are `restore_outside_backups`, the listing is empty.
  - `maybe-false` `defer` Verification gap: `dropbox_content_hash` is tested only under one 4 MiB block, against a helper written the same way — deferred to 13.2/13.7 (medium, unverified): settled by Dropbox's published vector or an over-4-MiB file.
  - `low` `defer` Spine: AD-21, AD-9 and AD-3 still call the three tools and codes planned — spine drift, already in deferred-work.md.
  - `low` `defer` Spine: AD-22 gives `write_export_zip(store, out)` with no `now` and no 0x5455 field — spine drift, already logged.
  - `low` `defer` Spine: AD-22 doesn't name the preview keys, the per-app gate or the token format — spine drift, already logged.
  - `low` `defer` Spine: AD-22 Allowed files allows safety-copy names in `from-dropbox/`; the build doesn't — spine drift or a decision for Oleg, already logged.
  - `low` `defer` Spine: the Structural Seed and FR-30 map row don't name `intents/restore_file.py` or `agent/restore_gate.py` — spine drift, logged.
  - `low` `defer` Spine: AD-21 One validator says a write tool's arguments are its intent's body; `restore_backup` takes `{path}` through `parse_view_arguments` — spine drift, logged.
  - `medium` `defer` Spine: `~/bookvie` still gets `~/bookvie-backups`, so 13.1's tools would read and write the real library's backups there — that rule is Story 13.3's AC (AR48); logged as an interim gap for 13.3.
  - `low` `patch` Blind: an expired token reads `changed` once a later `seal()` purged its nonce — `open` checks the MAC-verified `expiresAt` before the issued-set lookup, still spending the nonce; test (d).
  - `medium` `patch` Blind: a non-ASCII `requestState` gives `couldnt_save` — the same defect as the edge-case finding; same fix.
  - `low` `reject` Blind: the 2038 limit in the extended timestamp — the same as the edge-case finding; rejected there.
  - `low` `reject` Blind: no size limit before spooling the file — `stage_archive` still refuses above `MAX_UPLOAD_BYTES`; a 1 GiB file in the backups folder is unlikely, and the fix adds a guard.
  - `low` `reject` Blind: a read failure during preview is `couldnt_save` — AD-9's generic fault, with "Your data wasn't changed" true; renaming it would add a code.
  - `medium` `patch` Blind: listed paths (`absolute()`) differ from the resolved `restoredFrom` — the same root cause as the symlinked backups folder; same fix, and test (c) asserts they're equal.
  - `maybe-false` `defer` Blind: no known-answer or multi-block test for the content hash — grouped with the verification-gap finding; deferred.
  - `false` `reject` Blind: the README heading promises Dropbox backup — AC-12 prescribes the heading "Daily backup to Dropbox, and restore"; the guide says later sections add the upload.
  - `low` `patch` Blind: the docs don't say why a backup is missing from the list — added the troubleshooting entry "A backup is missing from the list".
  - `false` `reject` Blind: no recorded manual gate-2 run — AC-11 is pending by design, and the story stays in review until it is recorded (Epic 12 retro item 85).
  - `false` `reject` Blind: titles joined with ", " are ambiguous — UX-DR80 prescribes the ", " join and the count wording.
  - `maybe-false` `reject` Blind: string comparison of protocol versions — the same as the edge-case finding; rejected there.
  - `low` `reject` Blind: the path is checked before the token on a retry — the same as the edge-case finding; rejected there.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Token format:** `<process nonce hex>.<base64url JSON payload>.<base64url HMAC>`, with the MAC computed over the first two parts.
  - Opening it checks, in order:
    1. An unknown process nonce is `expired` (that's a restart).
    2. A bad MAC or bad JSON is `changed`.
    3. A nonce that isn't in the issued set is `changed`. It is popped from the set either way, so any answer spends it.
    4. `now > expiry` is `expired`.
  - Then the action: decline gives `declined`. Cancel, a missing response or a non-accept gives `cancelled`.
  - Then: a path that resolves elsewhere is `changed`, and under the lock a library or archive hash that moved is `changed`.
  - The payload is the longest part, so `_tamper`'s middle character lands in it and reads as `changed`.
- **Zip time:** `date_time` is local wall time, so older readers and `backup_zip` agree. The 0x5455 field records the exact instant, which Story 13.2's `bookvie_dropbox` can read the same way.
- **Confirmation text, for a mix UX-DR80 doesn't word:**
  - Books added but no card notes: "You'd lose N books added since (…), and every other change since then."
  - Card notes only: "You'd lose N card notes added since, and every other change since then."
  - This is recorded as a deferral for Oleg to confirm.
- **Unreadable named file in the listing:** left out and logged. It can't be restored anyway, and `preview_restore` on its path still names the reason.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_restore.py tests/test_dropbox_backup_guide.py` -- expected: all pass, 0 skipped.
- `cd backend && uv run pytest -q` -- expected: all pass.
- `npm run check` (repo root) -- expected: exit 0.

**Manual checks (if no CLI):**
- AC-11: Oleg, in a real Claude Code terminal session on `bookvie --dev` with the `ask` rule set, makes three calls: one accept, one decline of bookvie's question and one decline of Claude Code's permission prompt. Record the runs, and what VS Code and `claude -p` do, under `## Auto Run Result` or a Manual runs section.

## Auto Run Result

Status: in-review

**Summary.** Three agent tools, `list_local_backups`, `preview_restore` and `restore_backup` (AD-22):

- `restore_backup` asks the user itself through MCP 2026-07-28 form elicitation, with a hand-sealed `requestState`: a per-app HMAC key, a single-use nonce and a 5-minute expiry.
- An accepted restore runs in one hold of the store lock: the library and archive hashes, stage and validate, the `bookvie-pre-restore-*` safety copy, then apply.
- `POST /api/intents/restore` wraps the same lock-free cores and is unchanged.
- Export zips carry the backup time: `clock.now()`, with a 0x5455 extended timestamp.
- New codes: `restore_outside_backups`, `restore_not_confirmed` (with `reason`) and `safety_copy_failed`.

**Files changed:**
- `backend/bookvie/intents/contract.py`: the three codes, `RestoreNotConfirmedReason` and `ErrorBody.reason`.
- `backend/bookvie/intents/export.py`: `write_export_zip(store, out, now)`, `build_export(store, now)`, and `backup_time` reading the 0x5455 field.
- `backend/bookvie/intents/restore.py`: the lock-free `stage_and_validate` and `apply_staged`, which `restore()` wraps.
- `backend/bookvie/intents/backup_file.py`: the name rules, `resolve_backup_path`, `dropbox_content_hash`, `list_local_backups` and `write_safety_copy`.
- `backend/bookvie/intents/restore_file.py` (new): preview, and the confirmed apply.
- `backend/bookvie/agent/restore_gate.py` (new): `RestoreGate`, `elicitation_supported` and `confirmation_text`.
- `backend/bookvie/agent/tools.py`, `server.py`: `ToolCall`, the interactive flag and the three tools.
- `backend/bookvie/http/app.py`: one gate per app. `backend/bookvie/http/api.py`: the export route passes `clock.now()`.
- `frontend/src/api/generated/schema.d.ts`: regenerated.
- `docs/dropbox-backup.md` (new): the Restoring section. `README.md`: the Agent tools paragraph.
- Tests:
  - `test_agent_restore.py`: unskipped, plus green-phase leaves.
  - `test_restore_backup_edges.py` (new): the review's edge cases.
  - `test_dropbox_backup_guide.py`: unskipped.
  - `test_contract.py`: the error-code list.
- `deferred-work.md`: the deferrals.

**Review:** 29 findings: high 0, medium 7, low 15, false 3, maybe-false 4.
- **Patched (6 entries):**
  - a non-ASCII token gave `couldnt_save` (medium);
  - a symlinked backups folder listed nothing, and listed paths differed from `restoredFrom` (medium);
  - no test pinned reading 0x5455 (medium);
  - no test with `from-dropbox/` as a symlink out (medium);
  - an expired token read `changed` after a purge (low);
  - FIFO `O_NONBLOCK` (low);
  - the docs entry "A backup is missing from the list" (low).
- **Deferred:**
  - the spine drift entries (AD-21/9/3, AD-22 cores, gate, allowed files, Structural Seed, One validator);
  - the `~/bookvie` backups-folder rule for Story 13.3 (medium);
  - the multi-block content-hash test for 13.2/13.7 (medium, unverified).
- **Rejected:**
  - the 2038 int32 limit (unlikely; the fix adds a branch);
  - path checked before the token on a retry (the spec fixes that order, and it's still refused);
  - version-string comparison (unverified; low if true);
  - no size cap before spooling (`stage_archive` still refuses; unlikely);
  - a read failure being `couldnt_save` (AD-9's generic fault);
  - the README heading (AC-12 prescribes it);
  - no recorded manual run (AC-11 is pending by design);
  - ambiguous comma-joined titles (UX-DR80 prescribes them).

**Follow-up review recommended: true.** Patched entries by verdict: medium 4, low 3. The unverified risk: the review patches changed how the backups folder is resolved for the listing and the safety copy, and the token's check order. Only the new edge tests and the existing suite cover them; no reviewer has read the patched code.

**Verification.**
- `uv run pytest -q tests/test_agent_restore.py tests/test_dropbox_backup_guide.py`: 45 passed, before the patch.
- The implementer's run of the restore, edge, guide and backup tests: 90 passed.
- `npm run check` on the final tree: exit 0. That covers ruff, 2236 pytest passed with the coverage gate ok, `api:gen` compare, Prettier, tsc, oxlint, 800 e2e passed and the smoke test ok.

**Residual risks.**
- AC-11 (manual) isn't run: Oleg's real Claude Code terminal session on `bookvie --dev` with the `ask` rule. It needs one accept, one decline of bookvie's question and one decline of the permission prompt, plus what VS Code and `claude -p` do. The story stays in review until that is recorded here.
- If the terminal can't show bookvie's question, Stories 13.7 and 13.8 stop for Oleg's decision.
- The UX wording when only Books or only Card notes were added is pending Oleg's confirmation (deferred-work.md).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").

### Review Findings

Code review (bmad-code-review, new session), 2026-11-21. Diff `1815bff..9dc90dc`. Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check; none failed.

- [x] [Review][Patch] A zip whose `library.json` has an impossible DOS date (month 0) passes staging, then `backup_time` raises `ValueError`, so `preview_restore` and `restore_backup` answer the generic `couldnt_save`, not `restore_invalid`; `_stage`'s "this can't be refused" comment is wrong, and `list_local_backups` already treats it as unreadable. Probed in this session: `prepare_restore` raised `ValueError: month must be in 1..12, not 0`. Low. [backend/bookvie/intents/restore_file.py:_stage]
- [x] [Review][Patch] `DAILY_NAME`/`SAFETY_NAME` use `re.match` with `$`, which accepts a trailing newline (`bookvie-backup-2026-11-19.zip\n` matched in this session's probe), and `\d` accepts non-ASCII digits; use `fullmatch` and `re.ASCII`. Low. [backend/bookvie/intents/backup_file.py:176]
- [x] [Review][Patch] No test pins the order `unsupported` before the path check: every unsupported case uses an allowed path and every outside-path case a supported client, so swapping the two checks passes the suite. Add an unsupported client with an outside path → `restore_not_confirmed`/`unsupported`, library unchanged. Medium. Added as `test_an_unsupported_client_is_unsupported_even_for_a_path_outside_the_backups`. [backend/tests/test_restore_backup_edges.py]
- [x] [Review][Patch] No test reaches `write_safety_copy`'s `_ZIP_ERRORS` branch (the library can't be read, e.g. a referenced cover missing from `covers/`); removing the `try/except` turns it into `couldnt_save` with no test failing. Add a leaf next to AC-8's: assert `safety_copy_failed`, no `bookvie-pre-restore-*` or temp file left, library unchanged. Medium. Added as `test_a_safety_copy_that_cant_read_the_library_is_safety_copy_failed`, in the edges file since `test_agent_restore.py` is at the 1000-line limit (TEA H5). [backend/tests/test_restore_backup_edges.py]
- [x] [Review][Patch] The guide's Troubleshooting has no `couldnt_save` entry, though an agent restore can answer it (the backup or library can't be read, or the commit fails, possibly after the safety copy is written). Low. [docs/dropbox-backup.md:52]
- [x] [Review][Patch] The build's `deferred-work.md` spine-drift entry (AD-22 Restore through an agent) gives the token checks as "process nonce, MAC, nonce spent, expiry", but `RestoreGate.open` checks the expiry before the issued nonce since the build-auto review patch; the reconciliation would copy the wrong order. Low. [_bmad-output/implementation-artifacts/deferred-work.md:1450]
- Mutation check, 2026-11-22: each new leaf fails when its fix is undone (the `_stage` mapping, `DAILY_NAME.fullmatch`, the `unsupported`-before-path order, `write_safety_copy`'s `_ZIP_ERRORS` catch); each mutation reverted.
- Full check, 2026-11-22: `npm run check` exit 0 after the last patch — pytest 2243 passed, unit 389 passed, e2e 800 passed, smoke ok.
- [x] [Review][Defer] Spine drift (AD-21 Same handler, same answers) — deferred: spine drift, reconciled before the next epic. [backend/bookvie/agent/server.py:_answer]
- [x] [Review][Defer] Spine drift (AD-1, Stack `mcp` row, Structural Seed, Consistency Conventions Testing row still say "planned") — deferred: spine drift, reconciled before the next epic. [backend/bookvie/agent/tools.py]
- [x] [Review][Defer] Spine drift (AD-1, AD-22 Apply: the safety copy creates the backups folder) — deferred: spine drift, reconciled before the next epic. [backend/bookvie/intents/backup_file.py:write_safety_copy]
- [x] [Review][Defer] The guide states client behavior AC-11 hasn't observed (the permission prompt names the tool and path; the terminal CLI can show bookvie's question, VS Code, the desktop app and `claude -p` can't) — deferred: maybe-false, medium if wrong; settled by AC-11's recorded run. [docs/dropbox-backup.md:31]

Rejected:

- `low` Orphan safety copy after a failed commit (Blind, Edge): the copy is a valid backup that `list_local_backups` lists as `safety`; reporting it on the error adds error surface for a rare commit failure.
- `low` Safety-copy name race with another process (Blind): one bookvie per data folder and backups folder, and daily names can't collide with safety names.
- `low` FIFO swapped in between `scandir` and the listing's open (Edge): needs a local actor racing the listing; it isn't under the store lock, so only that one call would block.
- `low` `list_local_backups` reads each file twice (Blind): backups are small library zips; no named harm.
- `low` The question doesn't name which file (Blind): UX-DR80's wording; same-minute candidates hold the same library.
- `low` Empty `inputResponses: {}` with no `requestState` gets `changed` (Acceptance): a safe refusal, and no client sends that on a first call.
- `low` Non-default data folders missing from the guide (Blind): only the two documented folders are in real use; the interim Story 13.3 gap is already deferred.
- `false` Two time sources disagree (Blind): `Clock.now()` is local, aware time by contract (`SystemClock` returns `datetime.now().astimezone()`), so the names and `short_when` share one source.
- `false` A bad first token segment reads `expired` (Blind): the spec's own rule, "an unknown process nonce is `expired` (a restart)".
- `false` No test of a mismatched path on the answer (Blind): `test_agent_restore.py:609` `_another_path`, case `another_path` → `changed` at `:673`.
- `false` A path through a symlinked folder into the backups folder is accepted (Acceptance): the resolved file really is in the backups folder; AC-4 bans what resolves elsewhere.
- `reject` The spec's Design Notes give the old check order, and its Auto Run Result miscounts its patches (Blind, Edge): the fix edits the spec under review.
- `reject` Partial-only question wording, safety names in `from-dropbox/`, spine items 1–7 (Acceptance, Spine): already recorded in `deferred-work.md` by the build.
- `reject` Code Map names differ (Acceptance): informational, covered by the existing spine-drift entries.
- `reject` AC-11 not run (Acceptance): handled by the manual-AC gate below.

Manual-AC gate, 2026-11-22: AC-11 (Oleg's real Claude Code terminal session on `bookvie --dev` with the `ask` rule: one accept, one decline of bookvie's question, one decline of the permission prompt, plus what VS Code and `claude -p` do) has no recorded result. The review asked for it and none was given, so the story stays `in-review` (sprint-status `review`) until it is recorded and this review runs again.
