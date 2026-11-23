---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-23'
storyId: '13.7'
storyKey: '13-7-fetch-a-backup-from-my-dropbox'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-137-fetch-a-backup-from-my-dropbox'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-7-fetch-a-backup-from-my-dropbox.md'
generatedTestFiles:
  - 'backend/tests/test_dropbox_download.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 13 notes, "Tool descriptions"; Story 13.2; Story 13.7)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-22: copied contracts, Dropbox tools, list_local_backups)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie_dropbox/server.py, upload.py, contracts.py, dropbox_api.py'
  - 'backend/bookvie/intents/backup_file.py (FROM_DROPBOX, list_local_backups, _locate_backup), intents/restore_file.py (RestorePreview)'
  - 'dropbox SDK in backend/.venv (base.py files_download, files_download_to_file)'
  - 'mcp in backend/.venv (Client.call_tool raising MCPError for an unknown tool, probed)'
  - 'backend/tests/agent_client.py, dropbox_fakes.py, conftest.py (_isolated_home, connect_mcp), helpers.py, restore_scene.py, test_dropbox_upload.py, test_backup_skill.py, test_agent_restore.py, test_dropbox_contracts.py'
  - '_bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md, atdd-checklist-13-3-record-each-upload-in-bookvie.md, atdd-checklist-13-6-see-on-the-backup-page-how-the-last-dropbox-backup-went.md (format and precedent)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the stdio server, when a client lists tools after this story, then it holds exactly upload_backup, list_backups and download_backup, and still no tool that deletes, moves or reads outside /Apps/bookvie/.backups/.' }
  - { id: AC-2, idSource: generated, text: 'Given daily backups and other files in .backups (fake Dropbox), when the agent calls list_backups, then it returns only the daily backups, newest first, each as {name, backupTime, size, contentHash}, with backupTime from the file''s client_modified as ISO-8601 with an offset. Description: "The daily backups in bookvie''s Dropbox folder, newest first, each with its name, the time the backup was made, its size and its Dropbox content hash. A backup with the same content hash as one from list_local_backups is the same backup."' }
  - { id: AC-3, idSource: generated, text: 'Given a daily name from list_backups and target bookvie or bookvie-dev, when the agent calls download_backup, then it downloads into ~/bookvie-backups/from-dropbox/ or ~/bookvie-backups-dev/from-dropbox/ (creating it), through a temporary file, fsync and rename, only once the file''s content hash matches Dropbox''s, and returns the local path; and a same-day name never lands in the backups folder itself, and an existing from-dropbox/ file of that name is replaced only by a verified download. Description: "Download a daily backup from bookvie''s Dropbox folder into this computer''s backups, by its name from list_backups. target is bookvie for the real library or bookvie-dev for a development server: use the one you will restore into. The file appears only once it matches Dropbox''s copy. Returns the local path; pass it to preview_restore."' }
  - { id: AC-4, idSource: generated, text: 'Given a name that isn''t a daily name (a safety-copy name, .., a path), or a target other than the two, when download_backup is called, then it is refused before any network call, and no file is written.' }
  - { id: AC-5, idSource: generated, text: 'Given a fake Dropbox that returns other bytes, or breaks the transfer, when download_backup runs, then it is cause download_incomplete, no file and no temporary file are left; a sign-in failure is dropbox_signin; anything else is other.' }
  - { id: AC-6, idSource: generated, text: 'Given a downloaded file, when Story 13.1''s list_local_backups and preview_restore read it, then it is listed as from_dropbox with the same contentHash as in list_backups, and previews like any daily backup.' }
---

# ATDD Checklist: Story 13.7 Fetch a backup from my Dropbox

## Preflight

- **Stack:** `fullstack` by auto-detection (pytest and Playwright are both set up). This story is backend only: two tools on the `bookvie-dropbox` stdio server, read back by bookvie's existing restore tools. It has no UI, so it has no e2e leaf.
- **Story:** `epics.md` Story 13.7. Its 6 Given/When/Then criteria have no ids, so they are numbered AC-1 to AC-6 in source order. `sprint-status.yaml` reads `13-7-fetch-a-backup-from-my-dropbox: backlog`. No spec file exists yet; the build writes it.
- **Gates:**
  - This isn't the epic's first story, so the spine-drift gate doesn't apply.
  - Story 13.1 is `done` and its gate 2 passed, so the epics.md stop ("If gate 2 fails in Story 13.1") doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, and there's no Pact.
- **What exists today (commit `76173fa`):**
  - `bookvie_dropbox/server.py` registers only `upload_backup`, and an unknown tool name raises `MCPError(INVALID_PARAMS)`.
  - Every refusal and failure is `isError` with one JSON text `{cause, message}`. `UploadRefused` asserts its cause is in `contracts.CAUSES`, which has no `download_incomplete`.
  - `upload._list_backups(dbx)` already pages `/.backups` and reads a missing folder as empty.
  - bookvie's side is already built in Story 13.1. `FROM_DROPBOX`, `list_local_backups` lists `from-dropbox/` daily files as `from_dropbox` with `contentHash`, and `preview_restore` accepts a path in `from-dropbox/`.
- **Worktree:** this run happened in the git worktree `hogback-creosote`, not in the shared checkout. The build has to see these files: land them on `master` first, or run the build in this worktree.

## Generation Mode

AI generation. The criteria are clear and the story has no UI, so nothing needed recording. The run was **sequential** in this session, with no subagents. There is only an API/integration level (no e2e worker). The context the leaves need (the fake's SDK surface, `call_in_process`, the restore scene) would have had to be copied into a brief, and E11-D1 asks for one de-duplicated helper set anyway.

## Test Strategy

| AC | Level | Priority | Leaf (`backend/tests/test_dropbox_download.py`) | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | Integration (real `bookvie-dropbox serve` over stdio) | P0 | `:113` `test_the_stdio_server_lists_upload_list_and_download_backup_with_their_descriptions` | the listed names equal `DROPBOX_TOOL_NAMES`, which is `[upload_backup, list_backups, download_backup]` |
| AC-2 | API (in-process server, `FakeDropbox`) | P0 | `:152` `test_list_backups_returns_only_the_daily_backups_newest_first_with_their_time_size_and_hash` | the names are 19, 18 and 17 Nov, in that order, out of 3 dailies, 6 non-daily files and a daily-named folder, at 2 entries a page |
| AC-3 | API + file system | P0 | `:202` `test_download_backup_writes_a_verified_copy_into_from_dropbox_and_returns_its_path` | the answer's `path` is `~/bookvie-backups/from-dropbox/bookvie-backup-2026-11-20.zip` |
| AC-4 | API | P0 | `:293` `test_download_backup_refuses_a_name_that_isnt_daily_or_another_target_before_any_call` | each of 19 bad argument sets is a tool error with cause `other` |
| AC-5 | API + file system | P0 | `:320` `test_a_download_that_doesnt_match_or_breaks_off_leaves_no_file_and_says_why` | a download of other bytes is cause `download_incomplete` |
| AC-6 | Integration (both servers: `bookvie-dropbox` in-process, then bookvie's `connect_mcp`) | P1 | `:371` `test_a_downloaded_backup_lists_as_from_dropbox_with_its_hash_and_previews_like_a_daily` | bookvie's `list_local_backups` lists the downloaded path, with kind `from_dropbox` |

**After the first assertion, in each leaf:**
- **AC-1:**
  - Both new descriptions equal `DESCRIPTIONS[...]`, which is read from epics.md.
  - `list_backups` takes no arguments (`additionalProperties: false`).
  - `download_backup` takes exactly `name` and `target`, both strings and both required, with `additionalProperties: false`.
  - No tool name contains delete, move, remove, rename or restore.
- **AC-2:**
  - Each entry has exactly `{name, backupTime, size, contentHash}`.
  - `backupTime` parses with a UTC offset and equals `client_modified`. Size and hash are the stored file's.
  - The listing makes only list calls, and `connect` runs once.
  - A folder that nothing was ever uploaded to lists `{"backups": []}`.
- **AC-3** (the transition: a stale `from-dropbox/` file is replaced):
  - The file holds Dropbox's bytes.
  - The same-day file in `~/bookvie-backups/` is untouched.
  - Only that one file is in `from-dropbox/`, so no temporary file is left.
  - Exactly one download call is made.
  - Exactly one rename (`os.replace` or `os.rename`) lands on the final name. Its source is another name in `from-dropbox/`, and an `os.fsync` comes before it.
  - `bookvie-dev` creates `~/bookvie-backups-dev/from-dropbox/` and lands there.
  - A later `other_bytes` download leaves the verified file as it was.
- **AC-4:**
  - For each argument set, `connect` is never called and the fake records no call.
  - No file under `HOME` changes, and neither `from-dropbox/` folder is created.
- **AC-5:**
  - Nothing is left in `from-dropbox/`, and the mismatch was found by downloading.
  - `broken_transfer` is `download_incomplete`, with nothing left.
  - The fake's `signin` and the real connect over the failing Keychain are both `dropbox_signin`.
  - `unexpected`, and a daily name that Dropbox doesn't hold, are both `other`.
- **AC-6:**
  - `contentHash` is equal on both sides and equals the bytes' hash. `backupTime` is the same instant on both sides.
  - `preview_restore` of the downloaded path equals `preview_restore` of the same bytes as a daily backup in the folder itself.

**Assumptions the spec should confirm (the leaves encode them):**
- **`list_backups` answers `{"backups": [...]}`.** MCP structured content must be an object, so a bare list isn't possible. The key mirrors `list_local_backups`.
- **`download_backup` answers `{"path": ...}`.** The key is the one `preview_restore` takes. The leaf checks only `path`, compared after `resolve()`, so a resolved or unresolved `HOME` both pass.
- **A refusal is cause `other`.** `upload_backup`'s refusals use the same cause, and AD-22 gives `download_backup` only `dropbox_signin`, `download_incomplete` and `other`.
- **`download_incomplete` stays out of `contracts.CAUSES`.** That enum is the one `record_backup_upload` accepts, and the copied-contracts test pins it at 5 causes. The build needs a download cause set or exception of its own, since `UploadRefused` asserts membership.
- **"Newest first" orders by backup time.** In the leaf, name order and `client_modified` agree; see the follow-ups.

## Existing leaves this story changes (for the build)

- **`tests/test_dropbox_upload.py:115`** `test_the_stdio_server_lists_exactly_upload_backup_with_its_story_description`:
  - It asserts the names equal `DROPBOX_TOOL_NAMES`, which this run extended, so **it is red until the build registers both tools**.
  - This run already changed its `(tool,) = listed["tools"]` to pick `upload_backup` by name, so it needs no further edit.
  - Its name keeps "exactly" because the 13.2 checklist cites it.
- `tests/test_backup_skill.py:187` checks the skill's `bookvie-dropbox` tools as a subset of `DROPBOX_TOOL_NAMES`, so it stays green.
- `tests/test_dropbox_contracts.py` pins `CAUSES` at AD-22's 5 and needs no change unless the spec moves `download_incomplete` into that enum. Don't.

## Green-phase follow-ups (secondary branches, not red leaves)

These are for `bmad-testarch-automate` after the story is `done`:
- [x] **`list_backups` failures:** a sign-in failure is `dropbox_signin`, and a listing that breaks is `other` (the spec's pick). A list failure creates no file. (done: backend/tests/test_dropbox_download_edges.py:29 and :42; backend/tests/test_dropbox_download_follow_ups.py:151 `test_a_failed_listing_or_download_writes_no_file`, ids `list_signin` and `list_other`)
- [x] **Order when name and `client_modified` disagree:** the spec orders by backup time (`client_modified`), then by name, descending. (done: backend/tests/test_dropbox_download_follow_ups.py:39 `test_list_backups_orders_by_upload_time_when_the_names_disagree` with 13.2's `seed_three_older`; :55 `test_list_backups_breaks_a_tie_in_upload_time_by_name_newest_first`)
- [x] **`download_backup` with an extra argument:** refused with `other` before `connect()`. (done: backend/tests/test_dropbox_download.py:283, `REFUSED_ARGUMENTS` gains `{name, target, path}`, run by :287)
- [x] **A `from-dropbox` that is a symlink, or a file, or a backups folder that is itself a symlink:** a symlinked or file `from-dropbox` is refused before any call and nothing is written outside it; a symlinked backups folder is followed, and the answered path is the one bookvie lists and previews. (done: backend/tests/test_dropbox_download_edges.py:56; backend/tests/test_dropbox_download_follow_ups.py:87 `test_a_download_into_a_symlinked_backups_folder_is_the_path_bookvie_lists_and_previews`)
- [x] **The `signin` message names `bookvie-dropbox auth`,** as the upload's does. (done: backend/tests/test_dropbox_download_edges.py:29 for the listing; backend/tests/test_dropbox_download_follow_ups.py:151, ids `list_signin` and `download_signin`)
- ~~**No message or log holds a token** (the plan's "token" P0 risk).~~ **Retired:** `download.py` never reads a token. Its messages are fixed strings plus exception type names, and the one exception text it passes on is `SigninError`'s, which Story 13.2's tests own (`backend/tests/test_dropbox_upload.py:307`, `no_token_in_the_keychain`).
- ~~**`files_download_to_file` versus `files_download`:** if the build uses `_to_file`, a broken transfer leaves a partial file at the temporary path.~~ **Retired:** the build streams `files_download` into its own temporary file (`backend/bookvie_dropbox/download.py:183`), and AC-5's `broken_transfer` (backend/tests/test_dropbox_download.py:312) checks that nothing is left.
- [x] **A large download (over one 4 MiB hash block):** it verifies across blocks. (done: backend/tests/test_dropbox_download_follow_ups.py:67 `test_a_download_larger_than_one_hash_block_is_verified_and_lands_whole`, 8 MiB plus a partial block, not sparse)
- [x] **The response is closed** (`FakeDownload.closed`) after both a success and a failure. (done: backend/tests/test_dropbox_download.py:244 and :337, added by the build's review)
- [x] **Coverage:** the epic gate wants ≥ 90% on `bookvie_dropbox/`. (done: `npm run check:py` in this run, `bookvie_dropbox` 95.39%)

## Helper probes

- **Helpers reused:**
  - `DESCRIPTIONS` (extended, probed), `DROPBOX_TOOL_NAMES` (extended), `LIST_LOCAL_BACKUPS`, `PREVIEW_RESTORE`, `McpClient` (`answer`), `ImportFailed`, `import_or_fail`, `list_stdio_tools`, `error_of`, `structured_of` (`tests/agent_client.py`)
  - `call_in_process` (`tests/agent_client.py`, extended, probed: optional `rpc_errors`, default `False`, which keeps every caller's behavior)
  - `FakeDropbox` (`tests/dropbox_fakes.py`, extended, probed: `StoredFile.data`, `put` keeps the bytes, `files_download`, `files_download_to_file`, `downloads()`, faults `other_bytes` and `broken_transfer`, and `unexpected` now also applies to a download), `daily_zip`, `put_folder`
  - `Connect`, `daily`, `FAIL_KEYRING` (`tests/test_dropbox_upload.py`, imported as `test_backup_skill.py` imports them)
  - `backup_zip`, `dropbox_content_hash`, `files_under`, `SetClock` (`tests/helpers.py`)
  - `write_library`, `BACKUP_AT`, `NOW` (`tests/restore_scene.py`)
  - `_isolated_home`, `connect_mcp` (`tests/conftest.py`)
- **Helpers added:**
  - `LIST_BACKUPS`, `DOWNLOAD_BACKUP` (`agent_client.py`): the new tool names, in `DROPBOX_TOOL_NAMES` and in `_EPIC_13_STORY_OF` as Story 13.7's, so `DESCRIPTIONS` reads their epics.md lines.
  - `FakeDownload` (`dropbox_fakes.py`): the `requests.Response` that `files_download` returns. No fake answered a download before.
  - Spec-local in `test_dropbox_download.py`:
    - `dropbox_call`: `test_dropbox_upload.upload` is fixed to `upload_backup` and to `localPath`, and it raises on an unknown tool. This one takes any tool and passes `rpc_errors=True`.
    - `content_of`: reads structured content without asserting, so a setup answer stays opaque until the criterion.
    - `seed_three_dailies`: real backup zips with `client_modified`. 13.2's `seed_three_older` stores plain bytes, with 17 Nov uploaded last, on purpose.
    - `from_dropbox`, `same_path`.
    - AC-3's inline `os.fsync` and `os.replace`/`os.rename` recorder.
- **Shipped numbers: none quoted.** There's no UI, and the leaves assert no size, token or color.
- **Widths:** no border or outline width is asserted, so E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key.

All probes ran in one temporary pytest module, `tests/test_dropbox_download_probe.py`. The command was `uv run pytest -q -p no:cacheprovider tests/test_dropbox_download_probe.py` (5 passed), and the file was then removed with `rm`.

- **`FakeDropbox` download surface:**
  - It returns the stored metadata: the name with the stored case, the size, `content_hash` equal to `dropbox_content_hash(data)`, and `client_modified` as the UTC instant. It returns the exact bytes through `iter_content`, `content` and `files_download_to_file`. `downloads()` lists the 3 calls, and a path in another case finds the file.
  - **The first probe failed.** Reading `content` didn't consume the stream, while real `requests` does. The fake was fixed (`content` caches and consumes, and `iter_content` then yields the cached body) and probed again, so it passes.
  - It refuses or mismatches as designed:
    - `other_bytes` has the same length and different bytes, and its hash differs from the metadata's.
    - `broken_transfer` gives exactly the first half, then `ChunkedEncodingError`, through `iter_content` and through `content`. `_to_file` leaves exactly that half on disk.
    - `signin` raises `AuthError`, and `unexpected` raises `RuntimeError`.
    - A missing name, or a daily-named folder, raises `ApiError`.
- **`call_in_process(rpc_errors=True)`:**
  - An unknown tool returns exactly `{"rpcError": {"code": -32602, "message": "Unknown tool: list_backups"}}`, and `error_of` refuses that answer (`AssertionError`).
  - Without the flag it still raises.
  - A registered tool (`upload_backup` with a bad path) answers the same tool error, cause `other`, with and without the flag.
- **`DESCRIPTIONS`:**
  - `list_backups` starts "The daily backups in bookvie's Dropbox folder, newest first" and ends "is the same backup.".
  - `download_backup` starts "Download a daily backup from bookvie's Dropbox folder" and ends "pass it to preview_restore.".
  - `upload_backup` is still read, and the two new texts differ.
- **`same_path`:** it is true for the path itself and for a `..` spelling of it. It is false for a sibling file, `None` and `5`.
- **AC-3's fsync and rename recorder:**
  - Around a known atomic writer (a temporary file, `os.fsync`, then `Path.replace`), it records exactly one rename, `tmp -> final`, with the fsync before it. It catches `Path.rename` too.
  - It refuses a direct `write_bytes`: no rename and no fsync are recorded.
- **Render-before-read:** this doesn't apply. No leaf reads a page; every read is a tool answer or a file read after the call returned.

## TDD Red Phase

There are 6 skipped pytest leaves in `backend/tests/test_dropbox_download.py`, each with exactly one `[P*] AC-n` and `@pytest.mark.skip(reason=RED_13_7)`, under a comment that says when to un-skip it.

**Red today.** The red run came after the probes above last passed, on the files as they are now (after ruff). The leaves were un-skipped in a throwaway copy, `tests/test_dropbox_download_red.py`, which was then removed with `rm`. The command was `uv run pytest -p no:cacheprovider tests/test_dropbox_download_red.py`: **6 failed**, each at its first criterion assertion (line numbers in the real file):

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `:125` | the stdio server lists only `upload_backup` |
| AC-2 | `:173` | `{'rpcError': {'code': -32602, 'message': 'Unknown tool: list_backups'}}` gives no names |
| AC-3 | `:235` | `Unknown tool: download_backup`, so there's no `path` |
| AC-4 | `:306` | `error_of` refuses the `rpcError` (not a tool error) on the first argument set |
| AC-5 | `:332` | the same, so there's no `download_incomplete` |
| AC-6 | `:396` | bookvie lists no file at `from-dropbox/bookvie-backup-2026-11-19.zip` (`[]`) |

AC-6's setup calls (`list_backups`, `download_backup`) stay opaque until its assertion. bookvie's side is already built, so this leaf goes green as soon as AC-2 and AC-3 do.

**Suite after this run** (`npm run check:py`, after the probes and the red run):
- ruff format and lint are clean.
- pytest gives **1 failed, 2429 passed, 6 skipped** (30 s). The 6 skipped are this run's leaves.
- The one failure is the expected one, `test_dropbox_upload.py:115`: the exact tool list, red until the build registers `list_backups` and `download_backup` (13.3's precedent for a grown tool list).
- Because pytest failed, `check:py` stopped before `scripts/coverage_gate.py`, so the gate wasn't reached in this run.
- The frontend wasn't touched, so `check:api` wasn't run.

## Implementation checklist (for `bmad-build-auto`)

- [x] `bookvie_dropbox`, in a module of its own (for example `download.py`): (done: backend/bookvie_dropbox/download.py; backend/tests/test_dropbox_download.py:146)
  - `list_backups(connect)`: pages `/.backups` (reuse `upload._list_backups`) and keeps `FileMetadata` entries with `daily_date(name)`.
  - It returns them newest first as `{name, backupTime, size, contentHash}`, with `backupTime` being `client_modified` as aware UTC `isoformat()`.
- [x] `download_backup(name, target, connect, home=None)`: (done: backend/tests/test_dropbox_download.py:194, :287 and :312; backend/tests/test_dropbox_download_edges.py:118 and :136)
  - Before `connect()`, check the name and target:
    - `name` is a `str` with `daily_date(name)` (so no `/`, no `..`, no NUL), and `target` is in `("bookvie", "bookvie-dev")`.
    - Anything else is refused with cause `other`.
  - Make `~/<folder>/from-dropbox/` (`parents=True`). Download to a temporary file in it, hashing with `ContentHasher` while writing, then flush and `os.fsync`.
  - Compare with the metadata's `content_hash` (and size). Only then `os.replace` onto `<name>`, and fsync the folder.
  - On any failure, remove the temporary file and close the response.
  - Causes:
    - `AuthError` or `SigninError` is `dropbox_signin`, with a message naming `bookvie-dropbox auth`.
    - A mismatch, `requests` errors, `OSError` mid-transfer or a rate limit is `download_incomplete`.
    - Anything else (an `ApiError` not-found included) is `other`.
- [x] A download failure type or cause set that holds `download_incomplete` without adding it to `contracts.CAUSES`. (done: `DOWNLOAD_CAUSES` in backend/bookvie_dropbox/download.py:30; `tests/test_dropbox_contracts.py` still pins `CAUSES` at 5, green in this run)
- [x] `server.py`: (done: backend/tests/test_dropbox_download.py:109 over real stdio)
  - Register `list_backups` (no arguments, `additionalProperties: false`) and `download_backup` (`name` and `target`, both strings and both required, `additionalProperties: false`) after `upload_backup`.
  - Each description is epics.md's text verbatim.
  - Dispatch by name in `call_tool`, keeping the `{cause, message}` error shape.
- [x] `docs/dropbox-backup.md`, if the story's spec asks for it (13.8 owns the Restoring section and the download troubleshooting). `tests/test_dropbox_backup_guide.py` checks any `bookvie-dropbox` command it shows. (done: `docs/dropbox-backup.md` "Restoring"; tests/test_dropbox_backup_guide.py green in this run)
- [x] Un-skip the 6 leaves, then run `npm run check`. (done: no `RED_13_7` left; the code review's `npm run check` after `0e1281a`'s patch exited 0)

## Next

1. Run `bmad-build-auto` for Story 13.7 (in this worktree, or after landing these files on `master`).
2. Then `bmad-code-review` in a new session, then `bmad-testarch-automate`.
