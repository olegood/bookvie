---
title: 'Story 13.1: Restore my library through an agent, with two confirmations'
type: 'feature'
created: '2026-11-21'
status: 'in-progress'
baseline_revision: '1815bff46b3520689c62178b8b2a3e957467849f'
review_loop_iteration: 0
followup_review_recommended: false
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
