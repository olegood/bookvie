---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-20'
storyId: '12.6'
storyKey: '12-6-let-an-agent-back-up-my-library-to-disk'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-126-let-an-agent-back-up-my-library-to-disk'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md'
generatedTestFiles:
  - 'backend/tests/test_agent_backup.py'
  - 'frontend/e2e/agent-backup.spec.ts'
  - 'frontend/e2e/agent-backup.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 12.6)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Backup, Epic gate)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-4, AD-14, AD-15, AD-16 Real library refused, AD-21 Backup)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D10, D11; the export_backup P0 test)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-6 backlog, 12-5 done)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/intents/export.py (build_export, record_export, _ZIP_ERRORS), store/local_state.py, store/store.py (record_export, _write_atomic), store/fs.py (FileSystem seam), intents/contract.py (COULDNT_SAVE_MESSAGE, COULDNT_EXPORT_MESSAGE)'
  - 'backend/bookvie/agent/tools.py (AgentTool, NoArguments, TOOLS), http/app.py (create_app), cli.py (DEFAULT_DATA_DIR, DEV_DATA_DIR, main)'
  - 'backend/tests/conftest.py (_isolated_home, connect_mcp), agent_client.py, helpers.py (FaultyFs, api_client, post_restore, covers_in, library_bytes, temp_files, image_bytes), test_agent_write.py (_seed, running_bookvie, the tool-name lists), test_export.py (the chmod read fault)'
  - 'frontend/playwright.config.ts, e2e/fixtures.ts (startServer, Server), e2e/guard.ts, e2e/library.ts'
  - 'knowledge: test-quality (skips, assertions that cannot fail), test-levels-framework, test-priorities-matrix, selector-resilience and timing-debugging (no page here, so render-before-read has nothing to wait on)'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a server on the default ~/bookvie-data, a --dev server on the default ~/bookvie-data-dev, and a server on any other --data-dir (with HOME a temporary folder), when export_backup is called on 2026-11-19 (fake clock), then it writes bookvie-backup-2026-11-19.zip into ~/bookvie-backups/, ~/bookvie-backups-dev/, or <data folder>-backups/ respectively, creating the folder, and returns {path, size, createdAt} with the absolute path. Description: "Write a dated backup of the whole library (library.json and covers, the same file as the Backup page''s Export) to the backups folder, and return its path, size and time. A second backup on the same day replaces that day''s file. It counts as the library''s last export."' }
  - { id: AC-2, idSource: generated, text: 'Given the backup file, when it is restored through the existing restore check, then it is accepted and reproduces the library (AD-14 round trip).' }
  - { id: AC-3, idSource: generated, text: 'Given a backup already written today, when export_backup runs again the same day, then that day''s file is replaced, no other file in the folder changes, and no temp file is left behind.' }
  - { id: AC-4, idSource: generated, text: 'Given a successful backup, when the backup and home views are read, then "Last export" is the backup''s time; a failed backup leaves it unchanged.' }
  - { id: AC-5, idSource: generated, text: 'Given a read failure while building the zip, or a write failure in the backup folder (filesystem seam), when export_backup runs, then it returns couldnt_export or couldnt_save respectively, the folder holds no partial file, and lastExportAt doesn''t move.' }
  - { id: AC-6, idSource: generated, text: 'Given pytest and Playwright, when npm run check runs, then every pytest test has HOME set to a temporary folder and every Playwright server gets a temporary HOME, and no real ~/bookvie-backups* folder is created or changed.' }
---

# ATDD Checklist: Story 12.6 Let an agent back up my library to disk

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place.
- **Story:** no spec file exists yet (the build writes it, as in 12.4 and 12.5), so the source is `epics.md` Story 12.6. Its 6 Given/When/Then criteria have no ids, so they are numbered AC-1 to AC-6 in source order (registry above). The "Description" belongs to AC-1. `sprint-status.yaml` reads `backlog` for 12.6 and `done` for 12.5.
- **Epic gate:** 12.6 isn't Epic 12's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, no Pact, `tea_browser_automation: auto`. The one Playwright leaf opens no page, so there is nothing to record.
- **What exists today:**
  - **Export.** `intents/export.build_export(store)` builds the zip into a spooled temp file under `store.lock` and raises `couldnt_export` (503) on a read failure. `record_export(store, clock)` writes `local-state.json` through `Store.record_export` and only logs a failure. The zip entries' times come from `time.localtime()`, not the `Clock`, so two exports aren't byte-identical: the leaves compare entries, never whole files.
  - **The filesystem seam.** `Store._write_atomic` writes through `store.fs` (`create_temp`, `write`, `fsync`, `close`, `replace`, then `fsync_dir`, whose failure is only logged). `FaultyFs(step)` fails one step.
  - **Folders.** `cli.py` has `DEFAULT_DATA_DIR = "~/bookvie-data"` and `DEV_DATA_DIR = "~/bookvie-data-dev"` and resolves `--data-dir`. `create_app` takes no backups folder, and there is no `export_backup` tool and no `intents/backup_file`.
  - **HOME.** pytest: `conftest._isolated_home` (autouse, Story 11.2) already gives every test a fresh `HOME` and asserts it. Playwright: `startServer` (`e2e/fixtures.ts`) spawns `uv run ... bookvie` with the runner's own environment, so its `HOME` is the real one. Every e2e server passes `--data-dir` inside the e2e root, so today no server resolves `~`.
  - **No `/mcp` client in e2e.** No e2e module calls an agent tool.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 12.5. No recording, since the AC-6 leaf has no page. The config's `auto` would launch the two worker subagents, but both workers need this session's reading of the export, the seam and the fixtures, and the E2E worker has one leaf.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API, real process (pytest, `running_bookvie`) | P0 | `test_export_backup_writes_the_dated_file_into_the_backups_folder_that_follows_the_data_folder` (`backend/tests/test_agent_backup.py:172`), parametrized `default`, `dev`, `other`. **The backups folder lists exactly `bookvie-backup-2026-11-19.zip`.** Then the answer is `{path, size, createdAt}` and nothing else: `path` is the file's absolute path, `size` its size on disk, `createdAt` equal to `FakeClock(2026-11-19).now()`, and the JSON text equals the structured content. Neither of the other two candidate folders was created. The tool is listed after `edit_book`, with `input_schema(NoArguments)` and the description character for character. | `cli.py` resolves the folder, so only a real `bookvie` process exercises the rule. P0 on the plan's list. |
| AC-2 | API (`connect_mcp`, then the restore route on a fresh folder) | P0 | `test_the_backup_file_restores_through_the_restore_check_and_reproduces_the_library` (`:226`). **`POST /api/intents/restore` with the backup's bytes answers 200.** Then the restored `library.json` and `covers/` equal the source's (the cover included), and the backup's entries equal `GET /api/export`'s, by name and bytes. | AD-14's round trip, through the existing check. |
| AC-3 | API (`connect_mcp`) | P1 | `test_a_second_backup_on_the_same_day_replaces_that_days_file_and_nothing_else` (`:253`). Backup, `update_page`, backup again. **The `library.json` inside today's file equals the library on disk after the change.** Then the folder lists exactly yesterday's backup, a user file and today's (so no temp file is left), the two others are byte-identical, and the second answer's `path` and `size` match today's file. | |
| AC-4 | API (`connect_mcp`, views over HTTP and `get_home`) | P1 | `test_a_backup_is_the_last_export_in_the_backup_and_home_views_and_a_failed_one_is_not` (`:284`). `local-state.json` starts at an earlier time. **`GET /api/views/backup`'s `lastExportAt` equals the clock's now.** Then the home view, `get_home` and the answer's `createdAt` say the same. A backup the next day that fails (`FaultyFs("replace")`) is `couldnt_save` and leaves both views at the first time. | The views read `local-state.json` from disk, so this needs the app. |
| AC-5 | API (`connect_mcp`) | P0 | `test_a_read_or_write_failure_is_refused_and_leaves_no_partial_file_and_no_new_last_export` (`:330`), parametrized: `read-unreadable-cover` (chmod 000; skipped as root) is `couldnt_export`, and `write-create_temp`, `-write`, `-fsync`, `-close`, `-replace` (`FaultyFs` on `store.fs`) are `couldnt_save`. **The error's code is the case's code.** Then `kind` equals the code, the message is the route's (`COULDNT_EXPORT_MESSAGE`, `COULDNT_SAVE_MESSAGE`), the backups folder lists only yesterday's file with its bytes, `local-state.json` is byte-identical and the backup view still shows the earlier time, and `library.json`, `covers/` and the data folder's temp files are unchanged. | `FaultyFs("write")` writes half before failing, so a temp file the build forgets to remove would show. |
| AC-6 | E2E (Playwright, no page) | P0 | `[P0] AC-6 every e2e server runs with a temporary HOME, and no real ~/bookvie-backups* folder changes` (`frontend/e2e/agent-backup.spec.ts:15`). A server started on `<home>/bookvie-data` with `home` as its HOME, `--fake-today 2026-11-19`. **`export_backup`'s `path`, resolved, equals `<home>/bookvie-backups/bookvie-backup-2026-11-19.zip`.** The folder is `~/bookvie-backups` only when the server's HOME is `home`; with any other HOME it would be the sibling `bookvie-data-backups`. Then `server.home` equals `home` and no sibling folder exists. A server started with no `home` reports a `home` that exists, lies inside the e2e root, and isn't the account's home. Last, the account's real `bookvie-backups*` folders (names, contents, mtimes) are the same as before. | The Playwright half is the new work; pytest's half already holds (`conftest._isolated_home`, asserted in every test). |

**Primary branch per criterion.** AC-1: the dated file in the folder the rule picks. AC-2: the restore accepts the backup. AC-3: today's file carries the second backup's library. AC-4: the backup view's "Last export" is the backup's time. AC-5: the failure's code. AC-6: the backup lands in the `~` of the HOME the server was given.

**What the leaves pin (the contract for the build):**
- A tool `export_backup`, listed after `edit_book`, taking no arguments (`input_schema(NoArguments)`), with AC-1's description character for character.
- `create_app(..., backups_dir=Path)`: the folder `export_backup` writes into. `cli.py` resolves it from the data folder and passes it. `connect_mcp(backups_dir=...)` passes it through; this run added that parameter.
- The rule, through a real process: `~/bookvie-data` gives `~/bookvie-backups`, `~/bookvie-data-dev` gives `~/bookvie-backups-dev` (with `--dev`), anything else `<data folder>-backups`. The folder is created when missing.
- The answer is exactly `{path, size, createdAt}`: `path` absolute, `size` the file's size in bytes, `createdAt` the clock's `now()` (compared as a time, so any ISO-8601 with an offset passes). It is the same JSON as text.
- The file is `bookvie-backup-<clock.today()>.zip`, with the same entries as `GET /api/export`.
- The write goes through `app.state.store.fs`, the seam `FaultyFs` replaces. A fault at `create_temp`, `write`, `fsync`, `close` or `replace` is `couldnt_save` and leaves no file of its own in the folder.
- A read failure while the zip is built is `couldnt_export` with the export route's message.
- `lastExportAt` is written only after a successful backup, with the backup's time.
- Playwright: `startServer(dataDir, { ..., home })` runs the server with `HOME` set to `home`, and with no `home` it creates a temporary one under the e2e root. `Server.home` names it. The leaf reaches these through the cast in `frontend/e2e/agent-backup.ts:12-14` (`HomeServer`, `StartOptions`, `startWithHome`), so the skipped scaffold type-checks today. The build adds the option and the field to `e2e/fixtures.ts` and deletes the cast, and the spec then calls `startServer`.

**Open for the build (not pinned):**
- Where the folder rule lives (a `cli.py` function, or `intents/backup_file`), and how "the default" is compared (`instance.same_folder`, as the `--dev` refusal does, is the obvious choice). An explicit `--data-dir ~/bookvie-data` without `--dev` should get `~/bookvie-backups` too: see the follow-ups.
- What `create_app` does with no `backups_dir` (only tests build one without it): derive it with the same rule, or refuse the tool.
- The temp file's name and how the zip reaches `fs.write` (whole or in chunks), and whether the folder is fsynced after it is created.
- How the Playwright HOME is made and cleaned up (per server, per worker or per run). A new HOME also moves uv's cache unless `UV_CACHE_DIR` and `UV_PYTHON_INSTALL_DIR` are pinned to the real ones, as `conftest._real_uv_dirs` does for pytest. Without that, `uv run` in `startServer` would start from a cold cache and may try the network.
- Whether `export_backup` takes the AD-4 lock itself or relies on `build_export` (the spine: the lock while building, released before writing).

## Existing leaves this story changes (for the build)

`export_backup` joins the tool list, so these exact-list assertions fail until the build appends it:
- `backend/tests/test_agent_write.py:449` and `:704` (`EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES`).
- `backend/tests/test_agent_book_write.py:255` and `:508`.
- `backend/tests/test_agent_cover_url.py:363`.
- `backend/tests/test_agent_mount.py:46`, `AGENT_TOOL_NAMES`, compared in full at `:225`, `:258`, `:444` and `:643`.

This run changed these shared helpers. The existing agent leaves still pass on them (339 passed, 12 skipped across `test_agent_write`, `test_agent_book_write`, `test_agent_mount`, `test_agent_cover_url` and the new file):
- `connect_mcp` (`backend/tests/conftest.py`) gained `backups_dir`. It is passed to `create_app` only when given, so every existing call is unchanged.
- `running_bookvie` (`backend/tests/test_agent_write.py:715`) gained `flags` (added to the command line) and `default_folder` (leaves out `--data-dir`). The defaults keep every existing call unchanged.
- `frontend/e2e/library.ts` gained `callTool` and `ToolResult`, and imports `APIRequestContext`.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-1:** `--data-dir ~/bookvie-data` given explicitly (no `--dev`) and a symlink or `..` spelling of it get `~/bookvie-backups`; a folder merely named `bookvie-data` elsewhere gets its sibling `-backups`.
- [ ] **Pytest, AC-1:** the folder is created with its parents when missing (the `other` case already creates `scratch-backups`; add a nested data folder).
- [ ] **Pytest, AC-1:** `--dev --data-dir <scratch>` gets `<scratch>-backups`, not `~/bookvie-backups-dev`: the folder follows the data folder, not the mode.
- [ ] **Pytest, AC-3/AC-5:** a fault at `fsync_dir` after the rename is logged, and the backup still succeeds and records `lastExportAt` (as `Store._write_atomic` treats a commit).
- [ ] **Pytest, AC-5:** a backups folder that can't be created (a file in its place, or a read-only parent) is `couldnt_save`, and `lastExportAt` doesn't move.
- [ ] **Pytest, AC-5:** a failure recording `lastExportAt` after the rename is logged, and the backup still answers success (as `record_export` does for a download).
- [ ] **Pytest, AD-4:** the zip is built under the lock and the file is written after it is released (`RecordingLock`).
- [ ] **Pytest, AD-21:** `export_backup` with an argument is refused as `NoArguments` refuses one.
- [ ] **Pytest, AC-2:** a library with no covers round-trips (`covers/` present and empty).
- [ ] **Playwright, AC-6:** a `--dev` server in the suite (`serverDev`) gets a temporary HOME too, and `startServer` leaves no HOME folder behind after `stop`.

## Helper probes

Helpers reused: `McpClient`, `text_of` (`backend/tests/agent_client.py`); `connect_mcp`, `_isolated_home` (`backend/tests/conftest.py`); `FaultyFs`, `api_client`, `post_restore`, `covers_in`, `library_bytes`, `temp_files`, `image_bytes`, `TODAY` (`backend/tests/helpers.py`); `_seed`, `MAIN`, `UNREAD_COVER`, `UPDATE`, `EARLIER_TOOL_NAMES`, `WRITE_TOOL_NAMES`, `BOOK_TOOL_NAMES` (`backend/tests/test_agent_write.py`); `NoArguments`, `input_schema` (`bookvie.agent`); `FakeClock` (`bookvie.domain.clock`); `COULDNT_EXPORT_MESSAGE`, `COULDNT_SAVE_MESSAGE` (`bookvie.intents.contract`); `startServer`, `freePort`, `Server`, `test`, `expect` (`frontend/e2e/fixtures.ts`); `e2eRoot`, `runDir` (`frontend/e2e/guard.ts`). Extended, probed: `connect_mcp` (`backups_dir`), `running_bookvie` (`flags`, `default_folder`).

Helpers added:
- `backend/tests/test_agent_backup.py`: `_names` (a folder's exact listing, `[]` when missing), `_member` and `_members` (zip entries), `_when` (an ISO time or `None`), `_backup` (calls `export_backup` through `McpClient.rpc` and returns a JSON-RPC error as an `isError` result: `McpClient.call_tool` asserts on a JSON-RPC error, so an unknown tool would fail the setup call before the criterion), `_error_code` (the AD-9 code, never raising), `_seed_with_cover` (`_seed` with a real PNG cover, which restore accepts), `_connect`. No existing helper lists a folder exactly, reads a zip member from a path, or calls a tool without asserting. `test_export.py`'s `_last_export_at` reads `local-state.json` raw; these leaves read the views instead, as AC-4 asks.
- `frontend/e2e/library.ts`: `callTool`, `ToolResult`. No e2e module calls `/mcp`. It mirrors `agent_client.McpClient`'s handshake, and returns a JSON-RPC error as an `isError` result for the same reason as `_backup`.
- `frontend/e2e/agent-backup.ts`: `realHome` (the account's home whatever `$HOME` says; `guard.ts`'s `libraries()` reads both but isn't exported and returns library paths), `backupFolders`, `inside` (strictly inside, after resolving symlinks; `guard.ts`'s `within` isn't exported, doesn't resolve, and counts the folder itself as within), and the red-phase cast `HomeServer`, `StartOptions`, `startWithHome`.

Shipped numbers: none quoted. The ACs give dates and file names, no size for shipped UI.

Storage keys: no new localStorage key.

Render-before-read: the one Playwright leaf opens no page and reads nothing rendered. Every read is a server answer (`callTool` returns the whole JSON-RPC answer) or the filesystem after the server returned. No leaf was changed for it.

Border widths: none asserted.

Probes ran from temporary files, then removed with `rm`:
- `backend/tests/test_agent_backup_probe.py` (`cd backend && uv run pytest -q -p no:cacheprovider --no-cov -s tests/test_agent_backup_probe.py`, 10 passed on the second run). Its first run had 3 failures in the probe's own expectations, none in a helper: `get_app_info` shows a folder under HOME as `~/bookvie-data` (the server ran under the temporary HOME), and `call_tool` asserts on an unknown tool. That second finding led to `_backup`.
  - **`_names`:** a missing folder gave `[]`. A folder with `b.zip` and `a.zip` gave `["a.zip", "b.zip"]`. **Refused:** `["b.zip", "a.zip"]` and `["a.zip"]`.
  - **`_member` and `_members`:** a zip of `library.json`, `covers/` and `covers/c.png` gave `b"LIB"` for `library.json` and `None` for a missing entry or a missing file. `_members` gave the 3 entries, with `covers/` as `b""`. **Refused:** `b"LIB2"`, and the map without the directory entry.
  - **`_when`:** `"2026-10-30T12:00:00+01:00"` equals `FakeClock(TODAY).now()`, and so does the same instant at `+00:00`. `None` gave `None`. **Refused:** the next day, and the next day's `now()`.
  - **`_backup` and `_error_code`:** on today's app, `export_backup` came back as `{"isError": True, ...}` holding `{"code": -32602, "message": "Unknown tool: export_backup"}`, with no exception. `_error_code` gave `-32602`. A real refusal (`get_book` with a missing id) gave `"book_not_found"`, a JSON text `{"code": "couldnt_save"}` gave `"couldnt_save"`, and a success or a non-JSON text gave `None`. With the tool name patched to `get_app_info`, `_backup` returned the success result, and `_error_code` gave `None`. **Refused:** `"couldnt_export"` for the `couldnt_save` text, and `"couldnt_save"` for the unknown tool.
  - **`connect_mcp(backups_dir=...)`:** raised `TypeError: ... 'backups_dir'` from `create_app`, so the value reaches it. Without it, the client works.
  - **`running_bookvie`:** with `default_folder=True` and `--dev --fake-today 2026-11-19` on `~/bookvie-data-dev`, health answered for that folder and `get_app_info` gave `mode: dev`, `dataDir: ~/bookvie-data-dev`. Without `--dev`, on `~/bookvie-data`, it gave `production` and `~/bookvie-data`. **Refused:** `default_folder=True` with a folder that isn't the default failed with "server never answered health".
  - **`_seed_with_cover`, the restore and the read fault:** `GET /api/export` of the seeded library restored onto an empty folder with 200, with the same `library.json`. Its entries are `covers/`, `covers/neuromancer.png` and `library.json`. **Refused:** an empty body (422). With the cover at chmod 000, the export answered 503 `couldnt_export`.
- `frontend/e2e/agent-backup.probe.spec.ts` (`cd frontend && TZ=Europe/Madrid npx playwright test e2e/agent-backup.probe.spec.ts`, 2 passed on the second run). The first run's one failure was the probe's own expectation, not the helper: it compared the server's `dataDir` with the unresolved `$TMPDIR` path (`/var/...` against `/private/var/...`). That is why the AC-6 leaf compares resolved paths.
  - **`callTool`:** against a real server, `get_app_info` gave `dataDir` equal to `server.dataDir`. `export_backup` gave `isError: true` with "Unknown tool: export_backup" and no structured content, without throwing. `get_book` with a missing id gave `isError` with code `book_not_found`. **Refused:** `server.dataDir + 'x'`.
  - **`backupFolders`:** an empty folder gave `[]`. One with `bookvie-backups/{b,a}.zip` and an unrelated `bookvie-data` gave one line, `bookvie-backups <mtime> a.zip,b.zip`. Adding `bookvie-backups-dev` gave both names in order. **Refused:** after adding `c.zip`, the line no longer equals the first.
  - **`inside`:** a child of the e2e root is inside. **Refused:** the root itself, `os.tmpdir()`, and a parent of the folder named.
  - **`realHome`:** it equals `os.userInfo().homedir` (here also `os.homedir()`). **Refused:** a scratch folder.

No helper changed after its probe passed.

## TDD Red Phase

Generated: 12 pytest cases in 5 leaves, and 1 Playwright leaf, all skipped. The pytest leaves carry `@pytest.mark.skip(reason=RED)`, and the Playwright leaf is `test.skip`. `npm run check` stays green with them skipped. The red runs below ran after the probes above last passed, on throwaway un-skipped copies that were then removed with `rm` (`backend/tests/test_agent_backup_redrun_probe.py`, `frontend/e2e/agent-backup-redrun.probe.spec.ts`):
- **AC-1** (3 cases) fails at its first assertion: `assert [] == ['bookvie-backup-2026-11-19.zip']`, with the answer `Unknown tool: export_backup` as the message.
- **AC-2 to AC-5** (9 cases) fail first in setup, at `create_app() got an unexpected keyword argument 'backups_dir'`, the seam this story adds. A second red run took the seam out of the way (an autouse fixture in the copy that dropped `backups_dir` before `create_app`). Then each failed at its criterion assertion:
  - AC-2: `assert 422 == 200` (`restore_invalid` for the missing file's empty bytes).
  - AC-3: `assert None == b'{...library.json...}'` (no file for today).
  - AC-4: the backup view's `lastExportAt` is still `2026-10-01T09:30:00+02:00`, not `2026-10-30T12:00`.
  - AC-5: `assert -32602 == 'couldnt_export'` / `'couldnt_save'` in all 6 cases.
- **AC-6** fails at its first assertion (`agent-backup.spec.ts:38`): `Received: undefined` for the expected `<home>/bookvie-backups/bookvie-backup-2026-11-19.zip`. No `bookvie-backups*` folder appeared in the real home.

`git status` after the runs lists no `*.probe.*` file and no throwaway copy.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove `@pytest.mark.skip(reason=RED)` from a leaf (or `test.skip` from the Playwright leaf) when its task starts.
2. Run it and see it fail at its first assertion, then implement until it passes:
   - `cd backend && uv run pytest -q tests/test_agent_backup.py`
   - `cd frontend && npx playwright test e2e/agent-backup.spec.ts`
3. Update the exact tool-list assertions listed above, and delete the red-phase cast in `e2e/agent-backup.ts` once `startServer` has `home`.
4. Finish with `npm run check`.
