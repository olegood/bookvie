---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-22'
storyId: '13.3'
storyKey: '13-3-record-each-upload-in-bookvie'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-133-record-each-upload-in-bookvie'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-3-record-each-upload-in-bookvie.md'
generatedTestFiles:
  - 'backend/tests/test_agent_backup_upload.py'
  - 'backend/tests/test_dropbox_contracts.py (AC-5 leaf)'
  - 'backend/tests/agent_client.py (RECORD_BACKUP_UPLOAD in AGENT_TOOL_NAMES; DESCRIPTIONS reads Story 13.3''s two lines, export_backup''s replacing Story 12.6''s)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 13 intro, gate and tool-description rule; Story 13.3; Story 12.6''s export_backup line)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D7, D9, §6)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-15, AD-22 Upload state, Unchanged, record_backup_upload, Backups folder, Causes; AD-4)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md, atdd-checklist-13-1-…md (format, the shared-list precedent)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/store/local_state.py, store/store.py (record_export, _write_atomic), store/fs.py, intents/backup_file.py, intents/contract.py, agent/tools.py, http/app.py, cli.py, views/backup.py, views/shelf.py; bookvie_dropbox/contracts.py'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, restore_scene.py, test_agent_backup.py, test_agent_write.py, test_dropbox_contracts.py, test_store.py, test_export.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given export_backup with forUpload: true, when it writes the day''s backup, then lastExportAt doesn''t move, and "Last export" on Backup and Home is unchanged; and without forUpload, or with false, it records lastExportAt as before; and both return libraryHash (the SHA-256 of the zip''s library.json bytes) and unchangedSinceUpload (true exactly when it equals autoBackup.lastUpload.libraryHash). Description quoted (replaces Story 12.6''s).' }
  - { id: AC-2, idSource: generated, text: 'Given the tool list, when a client lists tools after this story, then it holds Story 13.1''s tools plus record_backup_upload. Description quoted.' }
  - { id: AC-3, idSource: generated, text: 'Given record_backup_upload({outcome: "uploaded", path, copies, contentHash}), when path is a daily backup in this server''s backups folder whose Dropbox content hash equals contentHash, then bookvie stores lastReport, lastOk and lastUpload (at from the Clock, backupAt from the zip, name, copies, and the libraryHash bookvie computes from that zip) in local-state.json under autoBackup; and a hash that doesn''t match, a path outside the backups folder or not a daily name, or a missing copies is invalid_fields on that argument, and nothing is stored.' }
  - { id: AC-4, idSource: generated, text: 'Given outcome: "skipped" (no other argument), or outcome: "failed" with a cause, when it is recorded, then a skip replaces lastReport and lastOk, a failure only lastReport (with its cause), and lastUpload stays as it was; and a cause outside dropbox_signin, upload_incomplete, dropbox_full, backup_write, other, a failure without one, or an unknown outcome is invalid_fields.' }
  - { id: AC-5, idSource: generated, text: 'Given the cause enum, when a test compares the two sides, then bookvie''s equals bookvie_dropbox''s (Story 13.2).' }
  - { id: AC-6, idSource: generated, text: 'Given store/local_state, when an upload, an export, then an upload are recorded, then lastExportAt and autoBackup both survive each write: one writer under its own threading.Lock (not the AD-4 lock) read-modify-writes only the group it changes, Store.record_export calls it, and local_state_bytes is gone; and a malformed local-state.json is replaced with the written group alone and the loss is logged; and a write failure (filesystem seam) is couldnt_save for record_backup_upload and leaves the file as it was; and an export file and a restore (Story 13.1 and the route) never touch autoBackup.' }
  - { id: AC-7, idSource: generated, text: 'Given a data folder that isn''t one of the two defaults but whose sibling rule would give ~/bookvie-backups or ~/bookvie-backups-dev (for example ~/bookvie), when the server starts, then it has no backups folder (backups_dir is None), export_backup is couldnt_save with no file written, and list_local_backups is empty; only ~/bookvie-data writes into ~/bookvie-backups.' }
---

# ATDD Checklist: Story 13.3 Record each upload in bookvie

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright are in place. The story has no UI: the Backup page's line is Story 13.6. So every leaf is pytest.
- **Story:** `epics.md` Story 13.3 has 7 Given/When/Then criteria with no ids, numbered AC-1 to AC-7 in source order (registry above). Each "And" line and "Description:" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog` for 13.3. It isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `local-state.json` is written whole by `Store.record_export` through `local_state_bytes(now)`, as `{"lastExportAt": …}`. It goes through `Store._write_atomic` on the store's filesystem seam, and no lock is taken.
  - `export_backup` takes no arguments (`NoArguments`, closed) and answers `{path, size, createdAt}`.
  - `backups_folder(data_dir, home)` always returns a path, `<data folder>-backups` for any non-default folder, so `~/bookvie` gets `~/bookvie-backups`.
  - `bookvie_dropbox.contracts.CAUSES` is AD-22's tuple. bookvie has no copy yet.
- **`epics.md`:** Story 13.3's `export_backup` line puts its note *before* the quote: `**Description:** (replaces Story 12.6's, and the description test reads this one) "…"`. The parser accepted a note only after the quote. **This run extends it** (below).

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 13.2. No recording: there is no UI. The E2E worker would have nothing to write, and the API leaves rely on this session's reading of `store/`, `intents/backup_file.py` and `agent/tools.py`.

## Test Strategy

The leaves drive the real app through `connect_mcp` (in-process, the tools over `/mcp`), with a `SetClock` at `NOW`, 20 Nov 2026, 09:01:36 Madrid. Its backups folder is `<tmp_path>/library-backups`. AC-7 also starts a real `bookvie` process (`running_bookvie`), because `cli.py` resolves the backups folder itself. The clock moves 2 minutes between calls, so every stored time is told apart. Times are compared as instants (`_instants`).

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (`connect_mcp`) | P0 | `test_export_backup_for_upload_writes_the_day_but_leaves_last_export_and_says_if_unchanged` (`test_agent_backup_upload.py:147`). "Last export" starts at 1 Oct. **`export_backup({forUpload: true})` writes `bookvie-backup-2026-11-20.zip`.** Then "Last export" is still 1 Oct on Backup and Home, and `local-state.json` is byte-identical. The answer is exactly `{path, size, createdAt, libraryHash, unchangedSinceUpload}`, with `libraryHash` the SHA-256 of the zip's `library.json` (equal to the one on disk) and `unchangedSinceUpload` false. After `record_backup_upload` of that zip, the same library answers true. After `update_page` it answers false, with a new hash, and "Last export" is still 1 Oct. With `{}` and with `{forUpload: false}`, "Last export" moves to the clock, and both answer the hash and false. The description is `DESCRIPTIONS["export_backup"]`, now Story 13.3's. The schema's one property is a boolean `forUpload`, with nothing required and `additionalProperties: false`. | The transition (a backup that isn't an export) is the primary branch. |
| AC-2 | API (`mcp_client`) | P0 | `test_the_tool_list_adds_record_backup_upload_after_the_restore_tools` (`:215`). **The listed names equal `AGENT_TOOL_NAMES`, which is Epic 12's 20, the three restore tools, then `record_backup_upload`.** Then the description equals `DESCRIPTIONS["record_backup_upload"]`. The schema is an object with exactly `outcome`, `path`, `copies`, `contentHash`, `cause`. It requires only `outcome`, sets `additionalProperties: false`, makes `copies` an integer and the rest strings. | 13.1's leaf still checks the destructive tools are unknown. |
| AC-3 | API | P0 | `test_an_upload_is_recorded_with_the_clocks_time_the_zips_time_and_bookvies_own_hash` (`:241`). The day's zip is written at `NOW` (setup, through 12.6's tool), and the report comes 2 minutes later. **`autoBackup` is exactly `{lastReport: {outcome: uploaded, at}, lastOk: {at, outcome: uploaded}, lastUpload: {at, backupAt: NOW, name, copies: 3, libraryHash}}`, with `at` the clock's report time and `libraryHash` the zip's `library.json` hash.** Then the call isn't an error, and `lastExportAt` doesn't move. Six refusals are each `invalid_fields` with exactly that argument in `fields`, and `local-state.json` stays byte-identical. A mismatched hash names `contentHash`. These name `path`: a daily copy outside the folder, one in `from-dropbox/`, a safety copy's name, and a daily name with no file. A call with no `copies` names `copies`. | |
| AC-4 | API | P0 | `test_a_skip_replaces_the_report_and_the_last_ok_and_a_failure_only_the_report` (`:302`). The hand-written prior state is 19 Nov's upload plus a 1 Oct "Last export". **After `{outcome: skipped}`, `lastOk` is `{at: now, outcome: skipped}`.** Then `lastReport` is the skip, and `lastUpload` and `lastExportAt` are unchanged. `{failed, cause: dropbox_full}` replaces only `lastReport`, with its cause, and `lastOk` stays the skip's. Each of AD-22's five causes is accepted. These are each `invalid_fields` on the named argument, with `local-state.json` byte-identical: an unknown cause (`cause`), a failure without one (`cause`), an unknown outcome (`outcome`) and no outcome (`outcome`). | Skip is the transition-bearing branch. |
| AC-5 | Unit (contracts) | P0 | `test_bookvie_keeps_the_same_cause_enum_as_bookvie_dropbox` (`test_dropbox_contracts.py:112`). **`tuple(bookvie.intents.backup_file.CAUSES) == tuple(bookvie_dropbox.contracts.CAUSES)`.** Then both equal AD-22's tuple, in order. | The copied contracts' home (Story 13.2). |
| AC-6 | API + store | P0 | `test_last_export_and_the_upload_state_survive_each_others_writes` (`test_agent_backup_upload.py:372`). The sequence is an export (setup), then an upload, an export, an upload, and a full `GET /api/export` download. **After each of the four writes, `local-state.json`'s keys are `["autoBackup", "lastExportAt"]`.** Then `lastExportAt` is the download's time, and `lastUpload.at` and `lastReport.at` are the second upload's. `local_state.local_state_bytes` no longer exists. While a thread holds `store.lock`, a skip report finishes within 5 s (`within`), so the writer's lock isn't AD-4's. After a route restore (`POST /api/intents/restore`), `local-state.json` is byte-identical. `FaultyFs` at `create_temp`, `write`, `fsync` and `replace` (on `store.fs`) gives `couldnt_save`, with the file byte-identical and no `local-state.json.tmp*`. Over `{not json`, a skip leaves exactly `{autoBackup: {lastReport, lastOk}}`, and stderr names `local-state.json`. | The tools and the route are the writers' real callers. |
| AC-7 | API + real process | P0 | `test_a_data_folder_whose_sibling_is_the_default_backups_folder_gets_no_backups_folder` (`:455`). The data folder is `~/bookvie`, and `~/bookvie-backups` already holds a real daily backup. **The in-process app's `backups_dir` is `None`.** Then `export_backup` is `couldnt_save`, `list_local_backups` is `{backups: []}`, `~/bookvie-backups` is unchanged and there's no `local-state.json`. The same holds for a real `bookvie --data-dir ~/bookvie` (cli.py's own folder rule), and `~/bookvie-backups-dev` isn't created. | `create_app` and `cli.py` each call `backups_folder`; both must refuse. |

**Primary branch per criterion:**
- AC-1: the forUpload backup file is written.
- AC-2: the tool list.
- AC-3: the stored `autoBackup`.
- AC-4: the skip's `lastOk`.
- AC-5: the two enums are equal.
- AC-6: both keys after each write.
- AC-7: `backups_dir is None`.

**What the leaves pin (the contract for the build):**
- `export_backup` takes an optional boolean `forUpload` (closed object). It answers `{path, size, createdAt, libraryHash, unchangedSinceUpload}`. With `forUpload: true` it never calls `record_export`.
- `libraryHash` is the lowercase-hex SHA-256 of the zip's `library.json` bytes, which are the bytes on disk. `unchangedSinceUpload` compares it with `autoBackup.lastUpload.libraryHash` as read from `local-state.json` (false when there is none).
- `record_backup_upload` is listed last, after `restore_backup`. Its schema has the five string or integer properties above, requires `outcome` and sets `additionalProperties: false`. Success is any non-error result; its shape is open.
- `autoBackup` in `local-state.json`:
  - `lastReport` is `{outcome, at}`, with `cause` only for a failure.
  - `lastOk` is `{at, outcome}`.
  - `lastUpload` is `{at, backupAt, name, copies, libraryHash}`, where `name` is the file name, not a path.
  - Times are ISO-8601 with an offset, compared as instants.
  - `backupAt` is the zip's `library.json` time (`backup_time`).
  - A skip or a failure writes no `lastUpload` key when there was none before.
- Refusals are `invalid_fields` whose `fields` hold exactly one entry, named by the argument's key (`path`, `contentHash`, `copies`, `cause`, `outcome`).
- **The writer:**
  - It goes through `state.store.fs`, so `FaultyFs` reaches it.
  - It doesn't take `store.lock`.
  - `local_state.local_state_bytes` is removed.
  - A malformed file is replaced with the written group alone, and stderr names `local-state.json`.
- bookvie's enum is `bookvie.intents.backup_file.CAUSES`, a tuple of the five strings in AD-22's order.
- `backups_folder(home / "bookvie", home)` gives no folder. `create_app` and `cli.py` then both end with `backups_dir is None`, and the existing `None` paths answer `couldnt_save` and `[]`.

**Open for the build (not pinned):**
- `record_backup_upload`'s success answer, such as `{ok: true}` or the stored report. The spec should say which.
- Whether `outcome` and `cause` advertise an `enum` in the schema. Recommended, because the agent then sees the closed sets. The leaf checks only `type: string`.
- Whether `skipped` with extra arguments (`path`, `cause`) is refused or ignored, and whether `failed` with `path` is. "(no other argument)" reads as a refusal. The spec should decide.
- `copies` bounds (0, negative, over 3), a non-integer `copies`, and a `contentHash` that isn't 64 hex characters. The leaves cover only "missing".
- The writer's function name and signature in `store/local_state`, and whether `read_last_export` reads through it.
- Where the comparison of a `path` happens (`resolve_backup_path`'s rules or a daily-only variant). `from-dropbox/` and safety copies must be refused.

## Existing leaves this story changes (for the build)

`record_backup_upload` joins `AGENT_TOOL_NAMES`, so these exact-list assertions fail until the build registers it. This run already updated the shared list, and these leaves need no edit:
- `test_agent_backup.py:192` (3 cases: `default`, `dev`, `other`)
- `test_agent_book_write.py:237`, `:490`
- `test_agent_cover_url.py:333`
- `test_agent_mount.py:210`, `:243`, `:429`, `:628`
- `test_agent_restore.py:663`
- `test_agent_write.py:392`, `:647`

The full suite after this run: **13 failed, 2347 passed, 7 skipped** (`uv run pytest -q -p no:cacheprovider`, 159 s). All 13 failures are those tool-list assertions, and the 7 skipped tests are this run's leaves.

The build must also edit these leaves, which assert 12.6's shape:
- `test_agent_backup.py:146`, `test_export_backup_writes_the_dated_file_…`, has `set(structured) == {"path", "size", "createdAt"}` (before the list check). It must add `libraryHash` and `unchangedSinceUpload`. `listed[EXPORT_BACKUP]["inputSchema"] == input_schema(NoArguments)` must become the forUpload model's schema. `DESCRIPTIONS[EXPORT_BACKUP]` is now 13.3's text, so the registered description must change with the build.
- `test_agent_backup.py:566`, `test_an_argument_is_refused_…`, sends `{"folder": "/tmp"}`. That is still refused, so no edit is needed.
- The `test_store.py` `record_export` leaves (`:250`, `:262`) still hold: an export over a file with no `autoBackup` writes exactly `{"lastExportAt": …}`.

`agent_client.py`:
- `RECORD_BACKUP_UPLOAD` and `AGENT_TOOL_NAMES = [*EPIC_12_TOOL_NAMES, *RESTORE_TOOL_NAMES, RECORD_BACKUP_UPLOAD]`.
- `_DESCRIPTION` accepts a parenthesized note before the quote too.
- Epic 13's lines are matched through `_EPIC_13_STORY_OF` (13.1's three, 13.2's `upload_backup`, then 13.3's `export_backup` and `record_backup_upload`). An Epic 13 line for an Epic 12 tool replaces its Epic 12 text, so `DESCRIPTIONS` has 25 entries.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **AC-1:**
  - [x] `forUpload` as `"true"`, `1` or `null` is refused (`invalid_fields` or the malformed intent, the spec's choice), with no file. (done: backend/tests/test_agent_backup_upload.py:650 `test_for_upload_that_isnt_a_boolean_is_refused_and_writes_no_file`, on `forUpload` after the review's patch)
  - [x] A forUpload backup over a malformed `local-state.json` answers `unchangedSinceUpload: false` and leaves the file alone. (done: backend/tests/test_agent_backup_upload.py:632 for `[1, 2]`; backend/tests/test_agent_backup_upload_follow_ups.py:115 for invalid JSON and an unreadable file, and :85 for six malformed `autoBackup` shapes)
  - [x] A failed forUpload write (`FaultyFs`) is `couldnt_save` and moves nothing. (done: backend/tests/test_agent_backup_upload.py:685 `test_a_failed_for_upload_write_is_couldnt_save_and_moves_nothing`)
  - [x] The hash of a library with covers changes only with `library.json`. AD-22 accepts that covers have immutable names. (done: backend/tests/test_agent_backup_upload_follow_ups.py:52 `test_the_next_days_backup_of_an_unchanged_library_is_unchanged_since_the_upload`, which also pins the next day's file as unchanged)
- [x] **AC-3:**
  - [x] Refusals of `copies` as 0, -1 or `"3"`, of a non-hex `contentHash`, and of a missing `path` or `contentHash`. (done: backend/tests/test_agent_backup_upload.py:482 `test_extra_bad_and_null_arguments_are_each_refused_by_key_and_store_nothing`)
  - [x] A symlink in the folder pointing at a daily file elsewhere. (done: backend/tests/test_agent_backup_upload.py:533 `test_a_symlink_or_an_unreadable_daily_file_is_refused_on_path`)
  - [x] A daily-named file that isn't a zip, or has no `library.json`. Is it refused, and on which argument? (done: backend/tests/test_agent_backup_upload.py:533, refused on `path`, a corrupt deflated one too; :570 for one that can't be opened)
  - [x] Two refusals in one call name both arguments, in order. (done: backend/tests/test_agent_backup_upload.py:482, cases `two_failing_in_order` and `upload_missing_two`)
- [x] **AC-4:**
  - [x] `skipped` with `path`, or with `cause`, and `failed` with `copies`, each once the spec decides refuse or ignore. (done: backend/tests/test_agent_backup_upload.py:482, refused per the spec's Design Notes; a skip over a malformed group: backend/tests/test_agent_backup_upload_follow_ups.py:182)
  - [x] A failure with no earlier state writes `lastReport` alone. (done: backend/tests/test_agent_backup_upload.py:611 `test_a_failure_with_no_earlier_state_writes_the_report_alone_and_keeps_unknown_keys`)
- [x] **AC-6:**
  - [x] A race: 50 threads alternating `record_export` and a skip report, with both groups present at the end and the file valid JSON. (done: backend/tests/test_agent_backup_upload.py:699 `test_exports_and_skips_racing_on_fifty_threads_keep_both_groups`)
  - [x] A `fsync_dir` fault after the rename is logged and the report succeeds. (done: backend/tests/test_agent_backup_upload_follow_ups.py:214 `test_a_failed_folder_flush_after_the_state_rename_is_logged_and_the_report_is_stored`)
  - ~~`restore_backup`, the tool, leaves `autoBackup` byte-identical (13.1's leaf checks only `lastExportAt`).~~ **Retired:** `test_agent_restore.py:577,584` pin `local-state.json` byte for byte after the tool's restore, so any write fails them, and the handler never calls the writer. The code review rejected a new leaf as duplicate coverage (spec-13-3 Review Findings, "Rejected").
  - [x] A malformed file followed by an export gives `{lastExportAt}` alone (already `test_export.py:533`; re-check it with the new writer). (done: backend/tests/test_agent_backup_upload_follow_ups.py:156 `test_each_writer_replaces_a_file_that_isnt_a_json_object_with_its_group_alone`, both writers over invalid JSON and four non-object files)
  - [x] Unknown top-level keys in `local-state.json` survive both writers ("keeps every other key as it read it", AD-15). (done: backend/tests/test_agent_backup_upload.py:611; unknown keys inside `autoBackup`: backend/tests/test_agent_backup_upload_follow_ups.py:182)
- [x] **AC-7:**
  - [x] The spellings: `~/elsewhere/../bookvie`, a symlink to `~/bookvie`, a case variant on a case-insensitive disk, and a `HOME` that is itself a symlink (`/var` → `/private/var`). Each gets no backups folder. (done: backend/tests/test_agent_backup_upload_follow_ups.py:237 `test_other_spellings_of_the_bookvie_folder_get_no_backups_folder`; the case variant: backend/tests/test_agent_backup.py:457)
  - [x] `~/bookvie-data` still gets `~/bookvie-backups`, and `~/bookvie-data-dev` `~/bookvie-backups-dev`. These are the existing `test_agent_backup.py` leaves. (done: backend/tests/test_agent_backup.py:447-448; through a symlinked `HOME`: backend/tests/test_agent_backup_upload_follow_ups.py:237)
  - [x] `test_the_folder_rule_names_…` gains the `None` case. (done: backend/tests/test_agent_backup.py:453-461)
- [x] **Epic gate:** the plan's "skip reports" P0 risk is AC-4's leaf, and "token" isn't this story's. The coverage gate doesn't change. (done: backend/tests/test_agent_backup_upload.py:297 `test_a_skip_replaces_the_report_and_the_last_ok_and_a_failure_only_the_report`; `scripts/coverage_gate.py` unchanged by this story)

## Helper probes

Helpers reused:
- `connect_mcp`, `mcp_client`, `_isolated_home` (`backend/tests/conftest.py`)
- `McpClient` with `answer` and `tool`, plus `DESCRIPTIONS` (extended, probed), `AGENT_TOOL_NAMES` (extended, probed), `EXPORT_BACKUP`, `LIST_LOCAL_BACKUPS`, `error_of`, `structured_of`, `import_or_fail` (`backend/tests/agent_client.py`)
- `FaultyFs`, `SetClock`, `backup_zip`, `dropbox_content_hash`, `post_restore` (`backend/tests/helpers.py`)
- `members`, `within` (`backend/tests/restore_scene.py`)
- `EARLIER_EXPORT`, `EARLIER_EXPORT_AT`, `EXPORT_HEADERS`, `LOCAL_STATE`, `_names`, `_seed_with_cover`, `_when`, `backup_name` (`backend/tests/test_agent_backup.py`)
- `UPDATE`, `running_bookvie` (`backend/tests/test_agent_write.py`)
- `OsFileSystem` (`bookvie.store.fs`)

Helpers added (story-specific, in `test_agent_backup_upload.py`):
- `_state`: parses `local-state.json` to a dict. `test_export._local_state` returns bytes, which the byte-identity checks still use directly.
- `_instants`: reads an `autoBackup` group's times as instants. No helper compared nested groups.
- `_library_hash`: hashes the zip's `library.json`. `restore_scene.members` is reused inside it.
- `_uploaded`: builds the upload arguments.
- `_field_names`: reads the names of an `invalid_fields` error. `tests/helpers.field_messages` reads an HTTP response, not a tool result.
- `_connect`: `test_agent_backup._connect` with a `SetClock` and a fourth return value. That one takes no clock, and extending it would change its callers' tuple.
- `_record_skip`, `PRIOR_UPLOAD`, `PRIOR_STATE`, `CAUSES`, `OTHER_HASH`, `NOW`, `STEP`.
- `CAUSES` also appears in `test_dropbox_contracts.py`, as in `test_dropbox_upload.py:41`. It is a literal of AD-22's tuple on purpose: the leaf checks both copies against the spine's text, not against each other alone.

The probes ran from a temporary `backend/tests/test_atdd_13_3_probe.py` (`uv run pytest -q -p no:cacheprovider tests/test_atdd_13_3_probe.py`), TZ Europe/Madrid. The file was removed with `rm`. **3 passed.** The first run failed on the probe's own input: `update_page` with a non-uuid `bookId` is `book_not_found`, not `invalid_fields`. It passed again with a real Book id. No helper changed.
- **`DESCRIPTIONS`, `AGENT_TOOL_NAMES`:**
  - 25 descriptions, with the first 20 in Epic 12's order. `AGENT_TOOL_NAMES` has 24 entries and ends with `record_backup_upload`.
  - `export_backup`'s text is 13.3's: it starts "Write a dated backup", names "libraryHash and unchangedSinceUpload", ends "which only the daily backup run sends." and doesn't carry the "(replaces" note.
  - `record_backup_upload`'s text starts "Record how a daily backup run ended" and ends "for a skip or a failure too.". `upload_backup`'s text is still read.
  - The regex reads a note before the quote, a note after it, a bulleted line with both, and a note on both sides. It refuses trailing text and a note holding a quote.
- **`_state`, `_instants`:**
  - A missing file reads as `{}`.
  - `08:01:36Z` and `09:01:36+01:00` both equal `NOW`, nested at both group levels, and non-time keys are kept.
  - It refuses `09:01:37+01:00` and `09:01:36+02:00`.
- **`_connect`, `_library_hash`, `_uploaded`, `_field_names`, `_record_skip`:**
  - The clock reads `NOW`, and the export writes `<backups>/bookvie-backup-2026-11-20.zip`.
  - `_library_hash` equals the SHA-256 of the `library.json` on disk, and refuses a 1-byte change.
  - `_uploaded` gives the four keys, with a 64-hex content hash equal to `helpers.dropbox_content_hash`.
  - `_field_names` gives `["page"]`-containing names for a real `invalid_fields` answer (`update_page`, page `"nope"`), and `[]` for a `book_not_found` one.
  - `_record_skip` returns today's unknown-tool `rpcError` without raising.
  - `advance` moves the clock by `STEP`.

Shipped numbers: none quoted (no UI). The 3 copies and the 26 h are AD-22's rules, not shipped UI, and this story asserts neither.
Storage keys: no new localStorage key. The `local-state.json` keys are server-side.
Fractional borders: none (no UI).

Render-before-read: no leaf reads a page (no UI). Each one-shot read of a tool answer, `local-state.json`, a folder or a zip comes after the call that produces it. An unimplemented call (`record_backup_upload`, `export_backup({forUpload})`) goes through `McpClient.answer`, which returns an unknown tool or a refusal as a value. Its answer is only passed to the first assertion's message, never parsed before it.

## TDD Red Phase

Generated: 7 pytest leaves, all `@pytest.mark.skip`, each with a comment above it saying when to un-skip (the TEA hook's C1 rule):
- 6 in `test_agent_backup_upload.py` (`reason=RED`)
- 1 in `test_dropbox_contracts.py` (`reason=RED_13_3`)

The red run came after the probes passed. It used throwaway un-skipped copies, `tests/test_agent_backup_upload_redrun_probe.py` and `tests/test_dropbox_contracts_redrun_probe.py` (only the AC-5 leaf ran), removed with `rm`. **7 failed**, each at its criterion assertion:
- **AC-1:** `[] == ['bookvie-backup-2026-11-20.zip']`. `forUpload` is refused today as the malformed intent.
- **AC-2:** the list is missing `record_backup_upload`.
- **AC-3:** `None == {lastReport…}`. Only `lastExportAt` is stored, and the call is `Unknown tool: record_backup_upload`.
- **AC-4:** `lastOk` is still 19 Nov's `uploaded`.
- **AC-5:** `() == ('dropbox_signin', …)`.
- **AC-6:** `[['lastExportAt']] * 4`.
- **AC-7:** `backups_dir` is `<HOME>/bookvie-backups`.

`git status` after the runs lists only the three files in `generatedTestFiles`. It lists no `*probe*` file and no throwaway copy. `uv run ruff check` and `uv run ruff format --check` pass on all three.

## For the build

1. **The description change:** `DESCRIPTIONS["export_backup"]` already reads 13.3's text. The registered description in `agent/tools.py` must change to it, word for word.
2. **The writer and `views`:** `views/backup` and `views/shelf` read `read_last_export`. A file holding `autoBackup` too must still read its `lastExportAt`. The current reader does, since it only `get`s the key, but keep it that way.
3. **`backups_folder` returning `None`:** callers that today assume a path (`cli.py:314`, `http/app.py:249`) already accept `None` downstream, through `write_backup`, `list_local_backups`, `resolve_backup_path` and `write_safety_copy`. The existing `test_the_folder_rule_…` leaf's cases keep their paths.
4. **The AD-4 lock and `local-state.json`:** AD-4's text says the `local-state.json` writes are outside the lock. AC-6's leaf proves the report doesn't take it.
5. **Spine:** none of these leaves contradicts AD-15 or AD-22. Anything the build settles under "Open for the build" goes in the spec. It is spine drift only if it contradicts AD-22's text.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove the skip from a leaf when its task starts. A suggested order: AC-5 (the enum), AC-7 (the folder rule), AC-6 (the writer, with `record_export` moved onto it), AC-2 (the tool registered), AC-4, AC-3, AC-1 (`forUpload`, `libraryHash`, `unchangedSinceUpload`, the new description).
2. Run it, see it fail at its first assertion, then implement until it passes:
   - `cd backend && uv run pytest -q tests/test_agent_backup_upload.py tests/test_dropbox_contracts.py`
   - `cd backend && uv run pytest -q tests/test_agent_backup.py tests/test_agent_mount.py tests/test_agent_restore.py tests/test_store.py tests/test_export.py`
3. The 13 tool-list cases go green once `record_backup_upload` is registered, with no edit. `test_agent_backup.py:146` needs the edits above.
4. Finish with `npm run check`.
