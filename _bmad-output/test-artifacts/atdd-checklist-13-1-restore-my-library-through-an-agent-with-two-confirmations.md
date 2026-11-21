---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-21'
storyId: '13.1'
storyKey: '13-1-restore-my-library-through-an-agent-with-two-confirmations'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-131-restore-my-library-through-an-agent-with-two-confirmations'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-1-restore-my-library-through-an-agent-with-two-confirmations.md'
generatedTestFiles:
  - 'backend/tests/test_agent_restore.py'
  - 'backend/tests/test_dropbox_backup_guide.py'
  - 'backend/tests/agent_client.py (2026-07-28 mode, RESTORE_TOOL_NAMES, Epic 13 descriptions, answer())'
  - 'backend/tests/helpers.py (SetClock, files_under, dropbox_content_hash, backup_zip, short_when, confirmation_text)'
  - 'backend/tests/conftest.py (connect_mcp clock=)'
  - 'backend/tests/test_stack_pins.py (STACK_ROWS: dropbox, keyring planned)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 13 intro, gate and tool-description rule; Story 13.1; AR55-AR59; UX-DR80, UX-DR81)'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D13-D20, §5 tests, §6 AD-22 changes)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-9 new codes, AD-14, AD-15, AD-21, AD-22 Restore through an agent)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Flow 14; Agent conversations, Restore; Foundation, Dates)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (Epic 13 backlog, Epic 12 retro items done)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (spine drift gate: 0 unresolved)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/server.py, http/app.py, intents/restore.py, intents/export.py, intents/backup_file.py, intents/contract.py, store/store.py, domain/clock.py'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, builder.py, test_agent_backup.py, test_agent_mount.py, test_restore_refusals.py, test_dev_mode.py'
  - 'mcp 2.3.0 / mcp-types 2.3.0 in backend/.venv (mcp_types/_v2026_07_28, mcp/server/_streamable_http_modern.py, mcp/shared/inbound.py, mcp/client/_input_required.py)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a server''s backups folder holding daily backups, safety copies, from-dropbox/ files and other files, when the agent calls list_local_backups, then it returns the daily backups (valid calendar date), the safety copies (with or without -2, -3…) and the from-dropbox/ daily backups, newest first by backup time, each {path, kind, backupTime, size, contentHash}; a non-matching name, a .tmp* file, a folder or a symlink is never listed; no folder or an empty one is an empty list. Description quoted.' }
  - { id: AC-2, idSource: generated, text: 'Given the export zip, when build_export writes it (fake clock), then its library.json entry is stamped with the same clock.now() that names the daily backup and gives createdAt, and list_local_backups reads backupTime from that entry (an older zip''s entry time is read as local time).' }
  - { id: AC-3, idSource: generated, text: 'Given yesterday''s backup and a library with 3 Books and 18 Card notes added since, when the agent calls preview_restore, then it returns the backup''s time and counts, the current counts, the titles of the Books added since and the number of Card notes added since; library.json, covers/ and the backups folder are unchanged; a damaged, unsafe or newer archive is refused with the restore intent''s code and fields. Description quoted.' }
  - { id: AC-4, idSource: generated, text: 'Given a path outside the backups folder and its from-dropbox/, with .., a symlink out, a folder, or a non-backup name, when preview_restore or restore_backup is called with it, then it is 422 restore_outside_backups (no fields) before the file is opened, and nothing changes.' }
  - { id: AC-5, idSource: generated, text: 'Given a client on MCP 2026-07-28 with form elicitation, when restore_backup is called with no input responses, then bookvie returns an InputRequiredResult with one form elicitation whose message is UX-DR80''s text for that file and library, plain text; its requestState is sealed by hand (no RequestStateBoundary); nothing has changed yet. Description quoted.' }
  - { id: AC-6, idSource: generated, text: 'Given the MCP test client answering, when it declines, cancels, tampers, reuses, answers after 5 minutes or a restart, with a path elsewhere, or after the library or archive changed, then each is 409 restore_not_confirmed with reason declined, cancelled, changed, changed, expired, expired, changed, changed, and library.json, covers/, local-state.json and the backups folder are byte-identical; a client below 2026-07-28 or without form elicitation is unsupported before any preview (an empty elicitation object counts as form); only an explicit accept on a valid token goes on.' }
  - { id: AC-7, idSource: generated, text: 'Given an accepted confirmation, when restore_backup applies, then in one hold of the store lock it checks the SHA-256, stages and validates, writes the safety copy bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip (-2, -3… when taken) atomically, then apply_staged; it returns {restoredFrom, backupTime, safetyCopy}, and restoring that copy gives back the library; no bookvie-backup-*.zip is replaced, lastExportAt doesn''t move, local-state.json is byte-identical; a test with a timeout proves it finishes.' }
  - { id: AC-8, idSource: generated, text: 'Given a failure writing the safety copy, when restore_backup applies, then it is 503 safety_copy_failed (kind couldnt_save), no partial safety copy is left, and the library isn''t restored.' }
  - { id: AC-9, idSource: generated, text: 'Given one contract test, when the same archive goes through restore_backup (accepted) and POST /api/intents/restore on two identical libraries, then both give the same library.json and covers/, every route refusal has the same kind, code, message and fields through the tool, the route and the Backup page are unchanged (no safety copy, no new gate), and a filesystem fault at write gives couldnt_save and an unchanged library.json through the tool too (TR8).' }
  - { id: AC-10, idSource: generated, text: 'Given the tool list, when a client lists tools, then it holds exactly Epic 12''s tools plus list_local_backups, preview_restore and restore_backup (AGENT_TOOL_NAMES); delete_book, delete_card_note, set_spine_color and restore are still unknown; each new error code has a test.' }
  - { id: AC-11, idSource: generated, text: 'Given a --dev server with a seeded library and a backup in ~/bookvie-backups-dev/, when Oleg in a real Claude Code terminal session with the ask rule calls restore_backup accepting, declining bookvie''s question, and declining the permission prompt, then the accept restores and names the safety copy, both declines change nothing, and the spec records the runs, the message as shown, and what VS Code and claude -p do (manual). If bookvie''s question can''t be shown, the story stops for Oleg''s decision.' }
  - { id: AC-12, idSource: generated, text: 'Given docs/dropbox-backup.md (new) and the README, when Oleg reads them, then the guide''s Restoring section gives the ask rule for ~/.claude/settings.json and how to check it, the two prompts, where the safety copy goes and how to undo with it, and one troubleshooting entry each for restore_not_confirmed, a refused archive (each code), a failed safety copy and a path outside the backups folder; the README''s Agent tools section gets a "Daily backup to Dropbox, and restore" paragraph linking to the guide.' }
---

# ATDD Checklist: Story 13.1 Restore my library through an agent, with two confirmations

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 13.1 has 12 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-12 in source order (registry above). Each "And" line and "Description:" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for 13.1 and `epic-13`.
- **Epic gate:** 13.1 is Epic 13's first story. `deferred-work.md` has no unresolved "spine drift" entry (checked by script: 0), and every Epic 12 retro action item is `done`. AD-22 already plans everything this story adds.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **The SDK on the wire (mcp 2.3.0, probed in a scratch server):** a 2026-07-28 request carries no `initialize`. Its `params._meta` holds `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`, and the headers `MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name` (for `tools/call`) must agree with the body. A low-level `on_call_tool` handler may return `mcp_types.InputRequiredResult(input_requests={key: ElicitRequest(...)}, request_state=...)`. That goes out as `{"resultType": "input_required", "inputRequests": {key: {"method": "elicitation/create", "params": {"message", "mode": "form", "requestedSchema"}}}, "requestState": ...}`. The retry arrives as `params.input_responses` (`{key: ElicitResult(action=...)}`) and `params.request_state`. The handler sees `ctx.protocol_version` and the envelope's capabilities in `ctx.meta`. **At 2026-07-28 a JSON-RPC error has an HTTP status:** an unknown tool is HTTP 400, not 200 as on the handshake revision.
- **What exists today:** no `list_local_backups`, `preview_restore` or `restore_backup`. `build_export` stamps `library.json` with the real `time.localtime()` and takes no clock. `restore()` stages, validates and applies in one lock hold with no lock-free core. No `docs/dropbox-backup.md`. The README's `## Agent tools` section has no Dropbox paragraph.
- **Master is red in two places before this story:**
  1. Commit `e0f6d42` added "(Superseded by Story 13.3's description once 13.3 lands.)" after the closing quote of Story 12.6's description in `epics.md`. The description parser in `agent_client.py` required the line to end at the quote, so `DESCRIPTIONS` raised and every description and tool-list leaf failed. **This run fixed it:** the parser now accepts a note in parentheses after the quote, and leaves it out of the description (probed below).
  2. Commit `297760a` added `dropbox` and `keyring` rows to the spine's Stack table. `test_stack_pins.py::test_every_spine_row_is_mapped` fails because nothing maps them; Story 13.2 adds those packages. **Fixed here at Oleg's request:** both rows map to `None` until 13.2 (see "For the build").

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 12.6. No recording: there is no UI. The config's `auto` would launch the two worker subagents. The E2E worker has nothing to write, and the API worker needs this session's reading of the SDK's 2026-07-28 wire, the restore intent and the fixtures.

## Test Strategy

All leaves are in `backend/tests/test_agent_restore.py`, except AC-12 (`backend/tests/test_dropbox_backup_guide.py`). The shared `_Scene` (fixture `scene`) writes yesterday's library into `then/` and backs it up as `backups/bookvie-backup-2026-11-19.zip` (entry time 19 Nov, 09:02 local). It writes the grown library into `library/`: 3 Books and 18 Card notes added (5 on each new Book, 3 on Piranesi), and Dune's page 50 → 120. It seeds `local-state.json` with an earlier export. The clock is a `SetClock` at 20 Nov 2026, 10:04 (Europe/Madrid). `scene.client` speaks the handshake revision; `scene.modern` speaks 2026-07-28 with `{"elicitation": {}}`.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (`connect_mcp`) | P0 | `test_list_local_backups_returns_the_daily_backups_safety_copies_and_downloads_newest_first` (`:301`). **The `(path relative to the backups folder, kind)` list equals, in order: 20 Nov daily, 19 Nov daily, `from-dropbox/` 18 Nov, safety `…T1840-2` (18:40:40), safety `…T1840` (18:40).** Then each entry has exactly the five keys, an absolute `path`, a `backupTime` with an offset equal to its entry time, `size` and `contentHash` equal to `dropbox_content_hash` of the bytes. None of these is listed: `notes.txt`, `bookvie-backup-2026-02-30.zip`, `…zip.bak`, `bookvie-pre-restore-2026-11-17.zip`, `.bookvie-backup-…zip.tmpk3j2`, `from-dropbox/notes.txt`, a folder with a daily name, a symlink out and a symlink in. A missing or an empty backups folder gives `{"backups": []}`. | The tool reads a real folder. |
| AC-2 | API (`connect_mcp`, `export_backup`) | P0 | `test_a_backup_zip_carries_its_time_and_list_local_backups_reads_it_from_there` (`:348`). Clock at 19 Nov 09:02:00. **The `library.json` entry's `date_time` in the zip `export_backup` wrote is `(2026, 11, 19, 9, 2, 0)`.** Then `createdAt` and `list_local_backups`' `backupTime` equal `clock.now()`. A hand-made older zip stamped 17 Nov 18:40 with no time zone reads as 18:40 local. | `build_export` is reached through the tool the daily run uses. |
| AC-3 | API (`connect_mcp`, then the restore route) | P0 | `test_preview_restore_names_what_would_be_lost_and_changes_nothing` (`:393`). **`booksAddedSince` (sorted) equals the 3 added titles.** Then `cardNotesAddedSince` is 18, `backupTime` is 19 Nov 09:02, `backup` is `{books: 2, cardNotes: 2, covers: 1}`, `current` is `{books: 5, cardNotes: 20, covers: 1}`, the data and backups folders are byte-identical, and `.staging/` is empty. A damaged, an unsafe (`../evil.txt`) and a newer (`schemaVersion` 99) daily file give `restore_invalid`, `restore_unsafe` and `restore_newer_version`, each error object equal to `POST /api/intents/restore`'s for the same bytes. | |
| AC-4 | API (`connect_mcp`) | P0 | `test_a_path_outside_the_backups_folder_is_refused_before_it_is_read` (`:456`), parametrized: 2 tools × `outside`, `dotdot`, `symlink_out`, `folder`, `not_a_backup_name`, `nested` (`from-dropbox/deeper/`) = 12 cases. Each points at a restorable zip, so a missing check would restore. **The error's code is `restore_outside_backups`.** Then the object is exactly `{kind: refusal, code, message}` (no `fields`) and nothing changed. `restore_backup` is called by the form-elicitation client, so `unsupported` can't win. | |
| AC-5 | API (`connect_mcp`, 2026-07-28) | P0 | `test_restore_backup_asks_with_one_form_elicitation_and_changes_nothing_yet` (`:479`). **`resultType` is `input_required`.** Then there is exactly one input request: `elicitation/create`, mode `form`, its message equal to `confirmation_text(19 Nov 09:02, preview's titles in preview's order, 18, today)`, with no newline, `*`, `` ` ``, `#`, `_` or `[`, and a `requestedSchema` of type `object` with nothing required. `requestState` is a non-empty string, nothing changed, and no `bookvie/agent/*.py` names `RequestStateBoundary`. | |
| AC-6 | API (`connect_mcp`, 2026-07-28) | P0 | `test_anything_but_an_accept_on_a_valid_token_is_restore_not_confirmed_and_changes_nothing` (`:673`), parametrized, 12 cases. The 9 answer cases are `declined`, `cancelled`, `tampered` (one character of `requestState` changed) → `changed`, `reused` (the token answered with decline, then with accept) → `changed`, `after_five_minutes` (the clock moved 5 min 1 s) → `expired`, `after_a_restart` (the token sent to a second app on the same folders) → `expired`, `another_path` → `changed`, `library_changed` (`update_page` between the calls) → `changed`, and `archive_changed` (the file rewritten) → `changed`. The 3 unsupported cases are `handshake_revision` (2025-11-25 with elicitation), `no_elicitation` and `url_elicitation_only`, each on a **damaged** file, so a preview built first would answer `restore_invalid`. **`(code, reason)` equals `("restore_not_confirmed", <reason>)`.** Then the object is exactly `{kind: refusal, code, message, reason}`, `kept()` (data folder without `.staging/`, plus the backups folder) is byte-identical to its state just before the final call, and `.staging/` is empty. | One leaf, each case pinned. |
| AC-7 | API (`connect_mcp`, 2026-07-28) | P0 | `test_an_accepted_restore_saves_a_safety_copy_then_restores_and_the_copy_undoes_it` (`:696`). Today's daily (20 Nov 09:01) is also in the folder. The accept runs inside `_within(30 s)`. **`library.json` equals the backup's bytes.** Then the answer is exactly `{restoredFrom, backupTime, safetyCopy}`: `restoredFrom` is the daily file, `backupTime` is 19 Nov 09:02, `safetyCopy` is `bookvie-pre-restore-2026-11-20T1004.zip`. `covers/` equals the backup's and `.staging/` is empty. The safety copy holds the pre-restore `library.json` and covers. The only new file in the backups folder is the safety copy, every earlier file (today's daily included) is byte-identical, and `local-state.json` is unchanged. Restoring the safety copy the same way gives back the pre-restore `library.json` and covers, and its own safety copy is `…T1004-2.zip`. | |
| AC-8 | API (`connect_mcp`, `_FaultIn` on `store.fs`) | P0 | `test_a_safety_copy_that_cant_be_written_is_safety_copy_failed_and_nothing_is_restored` (`:741`), parametrized `create_temp`, `write` (half written), `fsync`, `replace`, failing only writes into the backups folder. **The code is `safety_copy_failed`.** Then the object is exactly `{kind: couldnt_save, code, message}`, `kept()` is byte-identical (no partial copy, no temp file, not restored), and `.staging/` is empty. | The fault seam is the store's `fs`, as for `export_backup`. |
| AC-9 | API (tool plus the restore route, two copies of one library) | P0 | `test_the_tool_and_the_restore_route_restore_alike_and_refuse_alike` (`:765`). **The tool-restored `library.json` equals the route-restored one.** Then the route answers 200, the covers are equal, and no `route-backups` folder was created (the route writes no safety copy). The three refused archives give equal error objects through `restore_backup` and the route. A grown-library archive restored with `_FaultIn(<data folder>, "replace")` (the commit) is `couldnt_save` through both, with equal error objects and both `library.json` files unchanged. | The contract test AD-21 asks for. |
| AC-10 | API (`mcp_client`) | P0 | `test_the_tool_list_adds_the_three_restore_tools_and_still_bans_the_destructive_ones` (`:809`). **The listed names equal `AGENT_TOOL_NAMES` (Epic 12's 20, then `list_local_backups`, `preview_restore`, `restore_backup`).** Then each new tool's description equals `DESCRIPTIONS` (read from Story 13.1 in `epics.md`). `list_local_backups`' schema equals `input_schema(NoArguments)`. The other two take exactly a required string `path`, with `additionalProperties: false`. `delete_book`, `delete_card_note`, `set_spine_color` and `restore` are JSON-RPC -32602 unknown tools. Each new code has its own leaf: AC-4, AC-6, AC-8. | |
| AC-11 | Manual (Oleg, a real Claude Code terminal session) | P0 | No automated leaf. With the `ask` rule in `~/.claude/settings.json`, on `bookvie --dev` with a backup in `~/bookvie-backups-dev/`: one accept, one decline of bookvie's question, one decline of Claude Code's permission prompt. Then try the same call in VS Code and `claude -p`. The spec records the runs and the message as shown. If the terminal can't show bookvie's question, the story stops for Oleg (epic gate). The story stays in review until this is recorded (Epic 12 retro item 85). | Only a real client shows gate 2. |
| AC-12 | Static (pytest, Markdown) | P2 | `test_the_guide_says_how_to_restore_and_the_readme_links_to_it` (`test_dropbox_backup_guide.py:46`). **`docs/dropbox-backup.md` exists.** Then its `Restoring` section has a `json` block whose `permissions.ask` holds both `restore_backup` names. It names each of the six codes in backticks, and mentions `bookvie-pre-restore-`, `VS Code` and `claude -p`. The README's `Agent tools` section holds "Daily backup to Dropbox, and restore" and a link `(docs/dropbox-backup.md)`. | The wording beyond that is the review's to read. |

**Primary branch per criterion.** AC-1: the listed set and order. AC-2: the entry's stamped time. AC-3: the titles added since. AC-4: the code. AC-5: `input_required`. AC-6: the code and reason. AC-7: the restored `library.json`. AC-8: the code. AC-9: tool and route restore the same bytes. AC-10: the tool list. AC-11: manual. AC-12: the guide exists.

**What the leaves pin (the contract for the build):**
- `list_local_backups` answers `{"backups": [...]}`, because structured content is an object, as `find_book`'s `{"books": [...]}`. Each entry is `{path, kind, backupTime, size, contentHash}`, with `path` absolute and `contentHash` lowercase hex.
- **`preview_restore`'s answer, named by this run** (AD-22 gives the contents, not the keys): `{backupTime, backup: {books, cardNotes, covers}, current: {books, cardNotes, covers}, booksAddedSince: [title, ...], cardNotesAddedSince: N}`. Extra keys (say, `path`) wouldn't fail a leaf. Renaming means changing AC-3's and AC-5's leaves and recording it in the spec.
- The covers count is the number of covers the library references.
- The new codes' messages are UX-DR81's outcome words, since the skill reports the answer's message:
  - `restore_outside_backups`: "bookvie restores only from its backups folder. Nothing was changed."
  - `restore_not_confirmed`: "Not restored. Nothing was changed."
  - `safety_copy_failed`: "Couldn't save a safety copy, so nothing was restored."

  `restore_not_confirmed` is `kind: refusal`, `safety_copy_failed` is `kind: couldnt_save`, and no `fields` appear on any of the three.
- The question accepts `{"action": "accept", "content": {}}`: the form requires no property.
- The confirmation message is `confirmation_text` (`tests/helpers.py`): EXPERIENCE.md's sentence; the date as "19 Nov, 09:02" (year added when it isn't the clock's year); titles joined with ", " in `preview_restore`'s order; past 5, ", and N more"; "1 book" and "1 card note"; thousands with a comma.
- "A restart" in-process is a second `create_app` on the same folders. So the HMAC key, process nonce and used-nonce store must belong to each app (each `build_mcp_server`), not to the module. A module-level key would accept the first app's token in the second. Either satisfies "a key that exists only in this process".
- Expiry reads `app.state.clock`. At 5 min 1 s the token is `expired`; exactly 5 minutes isn't pinned.
- A nonce is spent by any answer, so a decline can't be replayed as an accept (`reused`).
- The safety copy's atomic write goes through `app.state.store.fs`, the seam `_FaultIn` replaces, as `export_backup`'s does. The commit's `library.json` replace in the data folder is a separate seam step, so the two faults can be told apart.
- The zip's `library.json` entry carries the local wall time in `date_time` (whatever extra field the build adds), and a time-zone-less entry reads as local time.

**Open for the build (not pinned):**
- The order of titles in `booksAddedSince` (the leaves sort it, and the message follows it).
- The token's format and the input request's key.
- How `ctx.protocol_version` and the capabilities reach the tool body through `build_mcp_server`'s worker-thread call.
- Where `write_export_zip`, `stage_and_validate` and `apply_staged` split, as long as `build_export` and `restore()` wrap them and AC-7's 30-second guard holds.
- What `list_local_backups` does with a correctly named file that isn't a zip, or has no `library.json` (see follow-ups).

## Existing leaves this story changes (for the build)

The three tools join `AGENT_TOOL_NAMES`, so these exact-list assertions fail until the build registers them. This run already updated the shared list; the leaves need no edit:
- `backend/tests/test_agent_backup.py:192`, `test_agent_book_write.py:237` and `:490`, `test_agent_cover_url.py:333`, `test_agent_mount.py:210`, `:243`, `:429` and `:628`, `test_agent_write.py:392` and `:647`.
- Full suite after this run: 36 skipped (this run's leaves), and 12 failed, all of them the tool-list assertions above (10 sites, 3 of them parametrized `default`, `dev`, `other`). `test_stack_pins.py::test_every_spine_row_is_mapped`, red on master, passes once the two rows are mapped (see "For the build").

This run changed these shared helpers. Every existing call keeps its behavior:
- `McpClient` (`agent_client.py`) gained `protocol_version` and `capabilities`, both keeping their old defaults; `speaking()`; `call_tool(..., input_responses=, request_state=)`, sent only when given; `answer()`; and `rpc(..., error_status=)`, `False` by default. `initialize` sends `self.capabilities`, which defaults to `{}` as before.
- `DESCRIPTIONS` now also reads Story 13.1's three lines, and accepts a trailing note in parentheses.
- `AGENT_TOOL_NAMES` is now `EPIC_12_TOOL_NAMES + RESTORE_TOOL_NAMES`.
- `connect_mcp` gained `clock`, defaulting to `FakeClock(TODAY)` as before.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **AC-1:** a daily-named file that isn't a zip, or a zip without `library.json`: decide (skip it, or list it with no `backupTime`) and pin it. Also a `from-dropbox/` file with a safety-copy name (the leaves don't say whether it is listed).
- [ ] **AC-1/AC-2:** the content hash of a file over 4 MiB through the tool (`dropbox_content_hash` is probed on 4 MiB + 1).
- [ ] **AC-2:** the safety copy's entry is stamped with the same `now` as its name.
- [ ] **AC-3:** `preview_restore` of a safety copy and of a `from-dropbox/` file. Card notes added on old Books only, and Books added with no Card notes (UX-DR80 doesn't word a message for that mix: ask Oleg or the UX, then extend `confirmation_text`).
- [ ] **AC-5:** the "nothing added" message (restore a backup of the current library), more than 5 titles ("and N more"), and a backup from another year ("19 Nov 2025, 09:02").
- [ ] **AC-6:** `{"elicitation": {"form": {}}}` counts as form. An accept whose `content` carries junk. A response under a key that wasn't asked. A `requestState` from another `path` resolving to the same file through `from-dropbox/..`.
- [ ] **AC-7:** with `RecordingLock`, one acquire and one release around the hash check, staging, safety copy and apply. A third safety copy in the same minute is `-3`. A restore of a `from-dropbox/` file.
- [ ] **AC-8:** a fault at `close`, and a failed folder fsync after the rename (logged only; the restore goes on, as `export_backup` treats it).
- [ ] **AC-9:** a fault while copying covers in (`_StepFault` in `test_restore_refusals.py`) through the tool.
- [ ] **AC-10:** each new tool with an extra or missing argument is `invalid_fields` or the malformed intent, as AD-21's One validator says.
- [ ] **Epic gate:** add `agent/`'s restore path (and later `bookvie_dropbox/`) to `scripts/coverage_gate.py` at 90%.

## Helper probes

Helpers reused: `connect_mcp`, `mcp_client`, `_isolated_home` (`backend/tests/conftest.py`); `McpClient`, `DESCRIPTIONS`, `AGENT_TOOL_NAMES`, `EXPORT_BACKUP` (`backend/tests/agent_client.py`); `api_client`, `post_restore`, `zip_archive`, `covers_in`, `staging_in`, `library_bytes`, `image_bytes` (`backend/tests/helpers.py`); `LibraryBuilder` (`backend/tests/builder.py`); `NoArguments`, `input_schema` (`bookvie.agent`); `OsFileSystem`, `referenced_covers` (`bookvie.store`). Extended, probed: `McpClient` (`protocol_version`, `capabilities`, `speaking`, `call_tool` retry fields, `answer`, `rpc(error_status=)`), `_parse_descriptions` (Epic 13, trailing note), `connect_mcp` (`clock`).

Helpers added:
- `SetClock` (`helpers.py`): an instant that moves on `advance`. `FakeClock` is fixed at noon; `test_agent_backup._MidnightClock` is test-local and does one thing.
- `files_under` (`helpers.py`): the same job as the private `_tree` copies in `test_agent_mount.py:494` and `test_agent_read.py:687`, moved to the shared module (which says never to import from a test module). It also reads a missing folder as `{}`. Those two can switch to it in automate.
- `dropbox_content_hash` (`helpers.py`): no hash helper existed.
- `backup_zip` (`helpers.py`): an export with a chosen entry time. `_Source` in `test_restore_refusals.py` goes through the export route, which stamps the real time.
- `short_when`, `confirmation_text` (`helpers.py`): UX-DR80's text.
- `MODERN_PROTOCOL_VERSION` (`agent_client.py`): `test_agent_mount.py` keeps its own `MODERN_VERSION`, `_MODERN_META` and `_post_modern`. They differ on purpose: they assert the raw HTTP answer (no session header).
- `_Scene`, `_FaultIn`, `_within`, `_error`, `_retry_with`, `_confirm`, `_members` (`test_agent_restore.py`): story-specific. `_FaultIn` differs from `FaultyFs` by failing only writes into one folder, so a safety-copy fault isn't also a commit fault.

Shipped numbers: none quoted (no UI). The "5 minutes" and "4 MiB" are AD-22's rules, not shipped UI.
Storage keys: no new localStorage key.
Fractional borders: none (no UI).

Each probe ran from a temporary `backend/tests/test_atdd_13_1_probe.py` (`uv run pytest -q -p no:cacheprovider tests/test_atdd_13_1_probe.py`), Europe/Madrid, removed with `rm`. 6 passed, on the last run after the last helper change.
- **`dropbox_content_hash`:** `b""` gave `sha256(b"")`. `b"a"` gave `sha256(sha256(b"a"))`. 4 MiB + 1 byte gave `sha256(sha256(block) + sha256(b"x"))`, and exactly 4 MiB one block. It is refused as plain `sha256(data)` (not equal).
- **`confirmation_text`, `short_when`:**
  - EXPERIENCE.md's two example sentences (3 titles and 18 card notes; nothing added) came back character for character.
  - 7 titles gave "(A, B, C, D, E, and 2 more)", and 1 and 1 gave "1 book added since (A), 1 card note,".
  - A 2026 time seen in 2027 gave "19 Nov 2026, 09:02", and seen in 2026 didn't.
  - Books with no card notes raised.
- **`backup_zip`:** the entry stamped 17 Nov 18:40 read `(2026, 11, 17, 18, 40, 0)`, not 18:41. `POST /api/intents/restore` accepted it (200) and reproduced the source's `library.json`. The grown library counts 5 Books and 20 Card notes. The scene's daily file restores through the route too (200).
- **`McpClient` at 2026-07-28:**
  - `get_app_info` answered with `resultType: complete`, `isError: false` and no `initialize` sent.
  - A mismatched `Mcp-Method` header was refused (HTTP 400). The first version of this probe sent a mismatched `Mcp-Name`, which `rpc` overwrote. It proved nothing and was replaced.
  - `answer()` on an unknown tool first failed: at 2026-07-28 an unknown tool is HTTP 400, and `rpc` required 200. `rpc(error_status=True)` fixed that, and the probe and the red run were redone after it. `answer()` now returns `{"rpcError": ...}`, `_error` names it, and `_retry_with` stays opaque on it.
  - `connect_mcp(clock=SetClock(NOW))` reached the app: `export_backup`'s `createdAt` equalled `NOW`.
- **`_FaultIn`:** on the backups folder at each of `create_temp`, `write`, `fsync` and `replace`, `export_backup` was `couldnt_save`, with the folder byte-identical. On another folder it let the backup through.
- **`_within`:** returned 42 from a quick call, and failed with "didn't finish" on a call blocked on an `Event` past 0.3 s.
- **Description parser:** 23 descriptions, in `AGENT_TOOL_NAMES` order. Story 12.6's text ends at "last export." without the note. A line with a trailing parenthetical matches; one with other trailing text doesn't.

Render-before-read: no leaf reads a page (no UI). Each one-shot read of a tool answer comes after the call that produces it, and every red leaf's first operation that can fail is its criterion assertion (below).

## TDD Red Phase

Generated: 35 pytest cases in 10 leaves (`test_agent_restore.py`) and 1 leaf (`test_dropbox_backup_guide.py`), all `@pytest.mark.skip(reason=RED)`. AC-11 has no leaf (manual). The red run ran after the probes above last passed, on throwaway unskipped copies (`backend/tests/test_agent_restore_redrun_probe.py`, `backend/tests/test_dropbox_backup_guide_redrun_probe.py`), then removed with `rm`. 36 failed, each at its criterion assertion:
- **AC-1** `assert [...] == [...]`, the answer being `Unknown tool: list_local_backups`.
- **AC-2** `assert (2026, 11, 21, 19, 4, 58) == (2026, 11, 19, 9, 2, 0)`: today's `build_export` stamps the real time.
- **AC-3** `booksAddedSince`, with `Unknown tool: preview_restore`.
- **AC-4** (12 cases) code `Unknown tool: preview_restore` / `restore_backup` ≠ `restore_outside_backups`.
- **AC-5** `resultType`, with `Unknown tool: restore_backup`.
- **AC-6** (12 cases) `(code, reason)`, with `Unknown tool: restore_backup`.
- **AC-7** the restored `library.json`, with `Unknown tool: restore_backup`.
- **AC-8** (4 cases) code ≠ `safety_copy_failed`.
- **AC-9** tool and route `library.json` differ; the route answered `{"ok":true}`.
- **AC-10** the listed names lack the three tools.
- **AC-12** `docs/dropbox-backup.md` doesn't exist.

`git status` after the runs lists only `backend/tests/agent_client.py`, `conftest.py` and `helpers.py` (modified), and `test_agent_restore.py` and `test_dropbox_backup_guide.py` (new). It lists no `*probe*` file and no throwaway copy.

## For the build

1. **`test_stack_pins.py::test_every_spine_row_is_mapped` failed on master** (the spine's `dropbox` and `keyring` rows, from `297760a`). Oleg's decision: mapped in 13.1. This run maps both rows to `None` in `STACK_ROWS`, as `uv` is, because no manifest has them yet. Story 13.2 adds the packages and maps them to `("pypi", "dropbox")` and `("pypi", "keyring")`, which turns on their series checks.
2. Spine: AD-21's Tools line moves the three tools from "planned" to built. That and anything the leaves pin that the spine doesn't say (the preview's keys, the per-app key) are "spine drift" entries in `deferred-work.md`, not spine edits.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove `@pytest.mark.skip(reason=RED)` from a leaf when its task starts. A suggested order: AC-10, AC-2, AC-1, AC-4, AC-3, AC-5, AC-6, AC-7, AC-8, AC-9, AC-12.
2. Run it, see it fail at its first assertion, then implement until it passes:
   - `cd backend && uv run pytest -q tests/test_agent_restore.py`
   - `cd backend && uv run pytest -q tests/test_dropbox_backup_guide.py`
3. The tool-list leaves listed above go green once the three tools are registered, with no edit.
4. AC-11: Oleg's terminal runs, recorded in the spec, before review can mark the story done.
5. Finish with `npm run check`.
