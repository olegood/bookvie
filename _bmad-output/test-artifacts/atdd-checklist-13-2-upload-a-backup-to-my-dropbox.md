---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-22'
storyId: '13.2'
storyKey: '13-2-upload-a-backup-to-my-dropbox'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-132-upload-a-backup-to-my-dropbox'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md'
generatedTestFiles:
  - 'backend/tests/test_dropbox_upload.py'
  - 'backend/tests/test_dropbox_auth.py'
  - 'backend/tests/test_dropbox_contracts.py'
  - 'backend/tests/test_dropbox_package.py'
  - 'backend/tests/test_layers.py (AC-2 leaf, cross-package scanner and its self-test)'
  - 'backend/tests/test_dropbox_backup_guide.py (AC-13 leaf, shell_lines, guide_commands, headed)'
  - 'backend/tests/dropbox_fakes.py (new shared module: FakeDropbox, FakeDropboxHttp, keyrings, zips)'
  - 'backend/tests/agent_client.py (DROPBOX_TOOL_NAMES, upload_backup description, call_in_process, list_stdio_tools, import_or_fail)'
  - 'backend/tests/conftest.py (PYTHON_KEYRING_BACKEND fail backend for every test)'
  - 'backend/tests/test_stack_pins.py (STACK_ROWS: dropbox, keyring mapped to pypi)'
  - 'backend/tests/test_wheel_build.py (source fixture copies bookvie_dropbox)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 13 intro, gate and tool-description rule; Story 13.2)'
  - '_bmad-output/implementation-artifacts/epic-13-context.md'
  - '_bmad-output/planning-artifacts/dropbox-backup-plan-2026-11-21.md (D1-D5, D8, D12, §5 tests, §6)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-22, AD-21 Backup, Stack, Testing row)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (the content-hash vector entry for 13.2/13.7)'
  - '_bmad-output/test-artifacts/atdd-checklist-13-1-restore-my-library-through-an-agent-with-two-confirmations.md (format, helpers)'
  - '_bmad/tea/config.yaml'
  - 'backend/pyproject.toml, uv.lock, scripts/smoke.mjs, bookvie/cli.py, bookvie/intents/backup_file.py, bookvie/intents/export.py, bookvie/agent/server.py'
  - 'backend/tests/agent_client.py, conftest.py, helpers.py, test_layers.py, test_stack_pins.py, test_wheel_build.py, test_dropbox_backup_guide.py'
  - 'docs/dropbox-backup.md, README.md (Agent tools)'
  - 'PyPI JSON for dropbox (12.2.5, uploaded 2026-11-13) and keyring (25.7.0, uploaded 2025-11-16), checked 2026-11-22'
  - 'dropbox 12.2.5 wheel source, read in the scratchpad (base.py upload-session and files_list_folder signatures, dropbox_client.py refresh and retry, oauth.py PKCE flow, files.py CommitInfo, FileMetadata, error unions)'
  - 'mcp 2.3.0 in backend/.venv (mcp/client/client.py Client, _memory.py InMemoryTransport, stdio.py StdioServerParameters)'
  - 'docs.dropboxapi.com content-hash page (published example: milky-way-nasa.jpg, its three block digests and its hash), read by a web-fetch subagent'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given backend/pyproject.toml, when this story lands, then dropbox and keyring are runtime dependencies pinned to the versions current on the day (checked on PyPI and recorded in the spec), the wheel''s packages are ["bookvie", "bookvie_dropbox"], the console script bookvie-dropbox exists, uv.lock is updated, and the install smoke test checks that bookvie-dropbox --help runs from the installed tool.' }
  - { id: AC-2, idSource: generated, text: 'Given backend/tests/test_layers.py, when the import graph is checked, then nothing under bookvie/ imports bookvie_dropbox, dropbox or keyring, and nothing under bookvie_dropbox/ imports bookvie.' }
  - { id: AC-3, idSource: generated, text: 'Given the copied contracts, when a test compares the two sides, then bookvie_dropbox''s daily-name regex, its folders (~/bookvie-backups, ~/bookvie-backups-dev, from-dropbox) and its content hash equal bookvie''s (Story 13.1), and the content hash matches Dropbox''s published test vector.' }
  - { id: AC-4, idSource: generated, text: 'Given bookvie-dropbox auth, when it runs (against a fake OAuth server), then it runs OAuth with PKCE (the app key a constant, no secret) through a loopback redirect on the fixed registered port, opens the browser, and stores the refresh token only in the Keychain through keyring (service bookvie-dropbox, account refresh-token), replacing an old one; and no token is printed, logged, or written to any file.' }
  - { id: AC-5, idSource: generated, text: 'Given the stdio server (bookvie-dropbox serve) with a fake DropboxApi, when a client lists tools, then it holds exactly upload_backup. Description quoted.' }
  - { id: AC-6, idSource: generated, text: 'Given a regular file with a daily name directly in the resolved ~/bookvie-backups/, and 3 older daily backups in /Apps/bookvie/.backups/, when upload_backup is called with its path, then it uploads through a chunked upload session finished directly to the final name with WriteMode.overwrite, the whole file''s content_hash and client_modified set to the backup time in UTC (read from the zip''s library.json entry); and it checks the returned size and content_hash, then deletes exactly the oldest daily backup by the date parsed from the name (not string order, not upload time), never the name it just wrote; and it returns {name, copies, deleted, contentHash} with copies 3.' }
  - { id: AC-7, idSource: generated, text: 'Given fewer than 3 daily backups in Dropbox, or files in .backups that don''t match the daily name, when an upload succeeds, then nothing is deleted while there are at most 3, and a non-matching file is never deleted or counted.' }
  - { id: AC-8, idSource: generated, text: 'Given a fake Dropbox that refuses the hash, fails a chunk, times out, or returns a size or hash that doesn''t match, when upload_backup runs, then it deletes nothing and returns cause upload_incomplete; an insufficient-space error is dropbox_full; a refused refresh or a Keychain read that fails or is denied is dropbox_signin with a message naming bookvie-dropbox auth; anything else is other.' }
  - { id: AC-9, idSource: generated, text: 'Given today''s backup already in Dropbox, when a second upload of today''s file runs the same day, then that day''s copy is replaced only once the new one verifies; a failed second upload leaves the first in place.' }
  - { id: AC-10, idSource: generated, text: 'Given a path in ~/bookvie-backups-dev/, a from-dropbox/ file, a safety copy, a path outside ~/bookvie-backups/, .., a symlink out, or a missing file, when upload_backup is called with it, then it is refused before any network call, and nothing in Dropbox changes.' }
  - { id: AC-11, idSource: generated, text: 'Given a file over 150 MB (sparse, in a temporary HOME), when it is uploaded to the fake, then it goes through more than one chunk and verifies.' }
  - { id: AC-12, idSource: generated, text: 'Given an expired access token, when a tool call needs Dropbox, then the SDK refreshes it from the Keychain''s refresh token, and the call succeeds.' }
  - { id: AC-13, idSource: generated, text: 'Given the guide and the README, when Oleg follows them from scratch, then docs/dropbox-backup.md gives the setup in order: registering the Dropbox app (App folder access, the name that makes the folder /Apps/bookvie/, the scopes it needs, the redirect URI), bookvie-dropbox auth, adding both MCP servers with --scope user (the exact claude mcp add line for bookvie-dropbox with the command''s absolute path) and checking them with claude mcp list; and troubleshooting for an expired sign-in and for an MCP server shown as failed (bookvie not running or started after the session, a moved command path, uv not found); and a pytest parses the guide''s code blocks and checks every bookvie and bookvie-dropbox subcommand and flag shown against the CLI.' }
---

# ATDD Checklist: Story 13.2 Upload a backup to my Dropbox

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright are in place. The story has no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 13.2 has 13 Given/When/Then criteria with no ids, numbered AC-1 to AC-13 in source order (registry above). Each "And" line and the "Description:" line belong to the criterion above them. `sprint-status.yaml` reads `backlog` for 13.2. It isn't the epic's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **PyPI, 2026-11-22:** `dropbox` 12.2.5 (uploaded 2026-11-13, requires `requests>=2.16.2` and `stone>=3.5.3,<4`) and `keyring` 25.7.0 (uploaded 2025-11-16). Both are inside the spine's Stack series (12.2.x, 25.7.x). The spec must record these, or whatever is current on the build's day.
- **The SDK, read from its 12.2.5 source (not from memory):**
  - The upload session is `files_upload_session_start(f, close, session_type, content_hash)`, `files_upload_session_append_v2(f, cursor, close, content_hash)` and `files_upload_session_finish(f, cursor, commit, content_hash)`. `CommitInfo(path, mode, autorename, client_modified, mute, property_groups, strict_conflict)` returns a `FileMetadata` with `size` and `content_hash`.
  - **The `content_hash` of each call is "a hash of the file content uploaded in this call", not of the whole file, and `CommitInfo` has no hash field.** So Dropbox can't refuse a whole-file mismatch at the finish, as AD-22 and AC-6 say it does. What Dropbox does refuse is a chunk that doesn't match its own call's hash, and `Dropbox(auto_content_hash=True)`, the default, sends that hash on every upload call. The whole file is then checked against the returned `FileMetadata.content_hash`. See "For the build", 1.
  - A refresh posts `grant_type=refresh_token`, `refresh_token` and `client_id`, plus `client_secret` only when an app secret is set, to `https://api.dropboxapi.com/oauth2/token`. A 400 `invalid_grant` becomes `AuthError(invalid_access_token)`. On a 401 `expired_access_token`, `request_json_string_with_retry` refreshes once and retries. `Dropbox(session=...)` takes a `requests.Session`, and so does `DropboxOAuth2Flow*.requests_session` for the code exchange.
- **mcp 2.3.0:** `mcp.Client(server)` connects to a low-level `Server` in-process, and `mcp.Client(StdioServerParameters(command, args, env))` starts a stdio server. `env` is merged over the SDK's default environment.
- **Dropbox's published vector:** the content-hash page publishes one example, `milky-way-nasa.jpg` (9,711,423 bytes), with its three 4 MiB-block digests and the final hash `485291fa…b35e0`. It publishes no small-input vector.
- **What exists today:** no `bookvie_dropbox/`, no `dropbox` or `keyring` dependency, no `bookvie-dropbox` script. bookvie's side of the contracts is `intents/backup_file.py` (`DAILY_NAME`, used with `fullmatch` plus a calendar check; `DEFAULT_BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `FROM_DROPBOX`, `dropbox_content_hash(path)`). `docs/dropbox-backup.md` has only the Restoring section, and the README's Agent tools paragraph covers only restore.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 13.1. No recording: there is no UI. The E2E worker would have nothing to write, and the API leaves need this session's reading of the SDK source.

## Test Strategy

The seam is `bookvie_dropbox.server.build_server(connect=...)`. `connect()` returns a Dropbox client: in production the real `dropbox.Dropbox`, built from the Keychain's refresh token, and in tests `FakeDropbox`. The fake has the SDK's own `files_*` method names and takes and returns the SDK's types, so the build drives it exactly as it drives the SDK. It refuses any other SDK method. AC-4 and AC-12 run the real SDK over `FakeDropboxHttp`, a `requests` transport adapter, so there is no socket. `NOW` is 20 Nov 2026, 09:01:36 Madrid (08:01:36 UTC).

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Static (pytest, TOML) | P0 | `test_the_project_ships_bookvie_dropbox_with_its_command_and_both_dependencies` (`test_dropbox_package.py:30`). **The wheel's `packages` is `["bookvie", "bookvie_dropbox"]`.** Then: `bookvie_dropbox/__init__.py` exists. `dropbox` and `keyring` are runtime dependencies, not dev ones, and their ranges admit 12.2.5 and 25.7.0. `bookvie-dropbox` is a script in `bookvie_dropbox`. `uv.lock` holds both, at least at those versions, among bookvie's dependencies. `scripts/smoke.mjs` names `'bookvie-dropbox'` and `'--help'`. The series are `test_stack_pins.py`'s, now mapped. | The real install is the smoke test's job. This leaf says what it must run. |
| AC-2 | Static (AST) | P0 | `test_bookvie_and_bookvie_dropbox_never_import_each_other` (`test_layers.py:181`). **`bookvie_dropbox/__init__.py` exists.** Then no module under `bookvie/` imports `bookvie_dropbox`, `dropbox` or `keyring`, and none under `bookvie_dropbox/` imports `bookvie`, relative imports resolved. | |
| AC-3 | Unit | P0 | `test_bookvie_dropbox_copies_the_daily_name_the_folders_and_the_content_hash_exactly` (`test_dropbox_contracts.py:69`). **`contracts.is_daily_name` gives the 14-name table** (a leap day, 29 Feb in a common year, 30 Feb, month 13, a missing digit, `.bak`, a trailing newline, a prefix, `.ZIP`, upper case, fullwidth digits, a safety copy, a temp file). bookvie's `_is_daily_name` gives the same table. The pattern minus `^`/`$` equals bookvie's. The folder names are equal and equal the three literals. Both content hashes equal the test helper's on 0, 1, 4 MiB−1, 4 MiB, 4 MiB+1, 8 MiB and 12 MiB+5 bytes. Dropbox's three published block digests give its published hash, in blocks of `DROPBOX_BLOCK`. | |
| AC-4 | Integration (real SDK flow or the build's own exchange, `FakeDropboxHttp`, loopback) | P0 | `test_auth_signs_in_with_pkce_on_the_fixed_port_and_keeps_the_token_only_in_the_keychain` (`test_dropbox_auth.py:102`). The Keychain starts with an old token. **After `run_auth(open_browser=browser, session=…)`, the Keychain's `bookvie-dropbox`/`refresh-token` is the new token.** It is then the Keychain's only item. Then: the browser opened `https://www.dropbox.com/oauth2/authorize` once, with `client_id` `APP_KEY`, `response_type=code`, an S256 `code_challenge` and `token_access_type=offline`. Its `redirect_uri` is `REDIRECT_URI`, `http://127.0.0.1:REDIRECT_PORT/…`, and the redirect answered 200. There was one code exchange, with `code`, `code_verifier`, `client_id`, the same `redirect_uri` and no `client_secret`. The fake exchanges only a verifier that hashes to the URL's challenge. No token appears in stdout, stderr, the DEBUG log, or any file under `HOME` or `tmp_path`. | The browser and Dropbox are fakes; the loopback listener is real. |
| AC-5 | Integration (stdio subprocess) | P0 | `test_the_stdio_server_lists_exactly_upload_backup_with_its_story_description` (`test_dropbox_upload.py:124`). Runs `<venv>/bin/bookvie-dropbox serve` with a temporary `HOME` and `PYTHON_KEYRING_BACKEND=keyring.backends.fail.Keyring`. **The listed names are `DROPBOX_TOOL_NAMES` (`["upload_backup"]`).** Then the description equals `DESCRIPTIONS["upload_backup"]`, read from Story 13.2 in `epics.md`. The schema is an object requiring exactly a string `localPath`, with `additionalProperties: false`. | The epic asks for the list through the stdio server. A Keychain that fails proves that listing needs none. |
| AC-6 | API (in-process server, `FakeDropbox`) | P0 | `test_upload_backup_uploads_through_a_session_checks_the_copy_then_deletes_the_oldest` (`test_dropbox_upload.py:152`). Dropbox holds 17, 18 and 19 Nov; 17 Nov was uploaded last. **Dropbox then holds 18, 19 and 20 Nov.** Then: the upload calls are start, appends, finish, and nothing else. The one `CommitInfo` has `path` `/.backups/bookvie-backup-2026-11-20.zip`, `mode` overwrite and `client_modified` 08:01:36 UTC. The stored size and hash equal the file's. The delete comes after the finish and is exactly 17 Nov. The answer is `{name, copies: 3, deleted: [17 Nov], contentHash}`. | |
| AC-7 | API | P0 | `test_nothing_is_deleted_while_there_are_at_most_3_and_other_files_never_count` (`:260`), 4 cases: `one_older` (copies 2), `nothing_yet` (no `.backups` yet, copies 1), `two_older_among_other_files` (6 non-daily files and a folder named like a daily: nothing deleted, copies 3), `three_older_among_other_files` (only 17 Nov deleted). **Dropbox's names afterwards are the expected list.** Then the deletes and the answer's `deleted` and `copies`. | A build that counts a non-daily file deletes 18 Nov in the third case. |
| AC-8 | API | P0 | `test_a_failed_upload_deletes_nothing_and_returns_its_cause` (`:321`), 12 cases: `upload_incomplete` for a refused hash, a failed chunk, a timeout, a wrong size and a wrong hash; `dropbox_full` for insufficient space; `dropbox_signin` for a refused refresh and for a Keychain that is locked, denied or empty (the server's own `connect`, so the Keychain read is real); `other` for a server error and a `RuntimeError`. **The error object's `cause` is the expected one.** Then: a non-empty `message`, which names `bookvie-dropbox auth` for `dropbox_signin`. No delete, and 17, 18 and 19 Nov still there. Neither the Keychain token nor an access token appears in the answer. `contracts.CAUSES` is AD-22's tuple, in its order. | |
| AC-9 | API | P0 | `test_a_second_upload_the_same_day_replaces_that_days_copy_only_once_it_verifies` (`:362`). Dropbox holds 18, 19 and this morning's 20 Nov. **After the second upload, 20 Nov's content hash is the new file's.** Then nothing was deleted and copies is 3. A third upload with a failing chunk is `upload_incomplete`, and the second upload's copy stays, with nothing deleted. | |
| AC-10 | API | P0 | `test_any_other_path_is_refused_before_any_dropbox_call` (`:469`), 10 cases: `dev`, `from_dropbox`, `safety_copy`, `outside`, `dotdot` (`from-dropbox/../<today>`, a real daily file), `symlink_out`, `missing`, `folder`, `not_a_calendar_day` (`2026-02-30`), `relative`. Each target is a real backup zip, so a missing check would upload it. **The answer is an error whose `cause` is in AD-22's enum.** Then `FakeDropbox.calls` is empty and Dropbox's names are unchanged. | |
| AC-11 | API | P1 | `test_a_backup_over_150_mb_goes_up_in_more_than_one_chunk_and_verifies` (`:501`). A sparse file: 150 MiB + 1 byte of hole, then a backup zip (`zipfile` reads data before a zip). **More than one upload request carries data.** Then none is over 150 MiB (the fake refuses one like Dropbox, `payload_too_large`). The stored size and hash equal the file's, by bookvie's `dropbox_content_hash(path)`, and so does the answer's `contentHash`. | |
| AC-12 | Integration (real SDK, `FakeDropboxHttp`) | P0 | `test_an_expired_access_token_is_refreshed_from_the_keychains_refresh_token` (`:524`). The Keychain holds a refresh token, and the first access token issued has expired by the time it is used. **`connect(session=…).files_list_folder("/.backups")` returns an empty listing.** Then: two refreshes, each with the Keychain's token and `client_id` `APP_KEY` and no `client_secret`; the listing was sent with `access-1` and retried with `access-2`. | The refresh is the SDK's. This proves `connect` wires it: the refresh token from the Keychain, the app key, no secret. It runs one call below the tool, so the HTTP fake needs only two endpoints. |
| AC-13 | Static (pytest, Markdown, both CLIs) | P1 | `test_the_guide_sets_up_the_dropbox_backup_in_order_and_its_commands_match_the_cli` (`test_dropbox_backup_guide.py:146`). **The guide has a `Setup` section.** Then: "App folder", "/Apps/bookvie/", `` `files.metadata.read` ``, `` `files.content.write` `` and `REDIRECT_URI` all come before "bookvie-dropbox auth", which comes before "claude mcp add", which comes before "claude mcp list". There is a `claude mcp add` line with `--scope user` for `bookvie` (`http://127.0.0.1:8765/mcp`), and one for `bookvie-dropbox` ending `-- /<absolute>/bookvie-dropbox serve`. A heading on sign-in has a section naming `bookvie-dropbox auth`. A heading with "failed" has a section naming `claude mcp list`, `/mcp`, "started", `` `uv` `` and "path". Every `bookvie`/`bookvie-dropbox` command in a shell block parses with `bookvie.cli.parse_args` or `bookvie_dropbox.cli.parse_args`, and there are `bookvie-dropbox auth` and `serve`. The README's Agent tools section names `bookvie-dropbox` and still links the guide. | The wording beyond that is the review's to read. |

**Primary branch per criterion.** AC-1: the wheel's packages. AC-2: the package exists. AC-3: the daily-name table. AC-4: the new token in the Keychain. AC-5: the tool list. AC-6: Dropbox's names after the prune. AC-7: Dropbox's names. AC-8: the cause. AC-9: the replaced hash. AC-10: refused with a cause. AC-11: more than one data request. AC-12: the call succeeds. AC-13: the Setup section.

**What the leaves pin (the contract for the build):**
- `bookvie_dropbox.server.build_server(*, connect=None)` returns an MCP `Server` with the one tool. `connect()` is called when a call needs Dropbox, after the path checks. With no `connect`, it reads the Keychain and builds the SDK client.
- `bookvie_dropbox.dropbox_api`: `APP_KEY` (a non-empty string) and `connect(*, session=None)`. It reads `keyring.get_password("bookvie-dropbox", "refresh-token")` and returns `dropbox.Dropbox(oauth2_refresh_token=…, app_key=APP_KEY, session=session)`, with no app secret.
- `bookvie_dropbox.auth`: `REDIRECT_PORT`, `REDIRECT_URI` (`http://127.0.0.1:<REDIRECT_PORT>/…`), and `run_auth(*, open_browser, session=None)`. It listens on the port **before** it opens the browser (the fake browser visits once, at once). It exchanges the code through `session`, stores the refresh token with `keyring.set_password`, and returns.
- `bookvie_dropbox.contracts`: `DAILY_NAME`, `is_daily_name(name)`, `BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `FROM_DROPBOX`, `dropbox_content_hash(path)` and `CAUSES` (AD-22's five, in order).
- `bookvie_dropbox.cli.parse_args(argv)`, as bookvie's: `auth` and `serve`, with `--help` exiting 0.
- The tool is `upload_backup({localPath})`. Success is structured content equal to its one text content (`structured_of`): `{name, copies, deleted, contentHash}`, `deleted` holding names, not paths. Failure is `isError` with one JSON text content holding at least `cause` (AD-22's enum) and a non-empty `message`.
- The Dropbox path is `/.backups/<name>`: an App-folder app sees `/Apps/bookvie/` as `/`.
- The SDK calls the fake knows are the upload session's three, `files_list_folder` and `files_list_folder_continue` (the fake pages 2 entries at a time, so `has_more` must be followed), and `files_delete_v2`. `files_upload`, `files_move_v2`, `files_delete_batch` and the rest fail the test. `.backups` that was never uploaded to lists as `not_found`.
- `client_modified` is compared as a UTC instant, naive (the SDK's) or aware.

**Open for the build (not pinned):**
- The chunk size (only ≤ 150 MiB per request).
- The `cause` of a refused path (any of the five). `backup_write` or `other` both read sensibly; the spec should say which and why.
- How `run_auth` exchanges the code: the SDK's `DropboxOAuth2Flow` with `requests_session = session`, or its own POST through `session`. Whether it sends `state`. What the redirect page says.
- Whether the server reads `Path.home()` per call or at build time (every test's `HOME` is set before both).
- The exact `serve`/`auth` help text.

## Existing leaves this story changes (for the build)

- `test_stack_pins.py`: `dropbox` and `keyring` now map to `("pypi", …)`, turning on their series checks. `test_python_range_stays_in_series[dropbox|keyring]` and `test_uv_lock_resolves_in_series[dropbox|keyring]` fail (`KeyError`) until `pyproject.toml` and `uv.lock` have the packages. These are the only failures in the full suite after this run: **4 failed, 2263 passed, 36 skipped** (`uv run pytest -q -p no:cacheprovider`, 194 s).
- `test_wheel_build.py`'s `source` fixture copies `bookvie_dropbox/` when it exists. Without that, its wheel builds would fail once `packages` lists it. Its existing leaves keep their behavior.
- `conftest._isolated_home` sets `PYTHON_KEYRING_BACKEND=keyring.backends.fail.Keyring` for every test, and subprocesses inherit it. A keyring nobody set fails every read and never reaches the real Keychain. Until `keyring` is installed, the variable does nothing.
- `agent_client.DESCRIPTIONS` now also reads Story 13.2's `upload_backup` line (24 descriptions, checked). `AGENT_TOOL_NAMES`, bookvie's list, doesn't change.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **AC-1:** `test_wheel_build.py`: a wheel built from the copy holds `bookvie_dropbox/__init__.py`, and its `entry_points.txt` names `bookvie-dropbox`. Run `npm run check:smoke` once the smoke step exists, and see it fail with `--help` broken. (done: backend/tests/test_wheel_build.py:111 `test_wheel_ships_bookvie_dropbox_and_its_command`, every `bookvie_dropbox/*.py` and both console scripts; the automate run broke `cli.parse_args` and `check:smoke` exited 1, "bookvie-dropbox --help exited with 1", then passed on the restored file)
- ~~**AC-3:** Dropbox's full vector through `contracts.dropbox_content_hash`. That needs the 9.7 MB `milky-way-nasa.jpg` as test data. Oleg's call (see "Decisions for Oleg").~~ **Retired:** Oleg's call was not to commit the image; `deferred-work.md` (the `dropbox_content_hash` entry, its `resolved:` line) records it, and `test_dropbox_contracts.py:63` checks the published block digests and every block boundary instead.
- [x] **AC-4:** a refused exchange (wrong verifier, `invalid_grant`) leaves the old token in the Keychain and prints no token. A Keychain that can't be written is a clear error naming the Keychain. A second `auth` while the port is taken is a clear error. The redirect without `code` (the user pressed Cancel) stores nothing. (done: backend/tests/test_dropbox_auth.py:304 `refused` case, :328, :349, :287 `test_a_denied_access_redirect_saves_nothing`; plus backend/tests/test_dropbox_cli_follow_ups.py:237 an unreachable token endpoint and a non-JSON answer keep the old token, :188 a stray request is 404 and the sign-in still finishes)
- [x] **AC-6:** uploading a backup older than every copy in Dropbox (16 Nov over 17, 18 and 19) deletes 17 Nov, never the 16 Nov just written. A file several blocks long uploads in several appends whose cursors' offsets add up. An old-style zip (no 0x5455 field, `backup_zip`) gives `client_modified` from its local `date_time`. (done: backend/tests/test_dropbox_upload_edges.py:180; backend/tests/test_dropbox_follow_ups.py:261 an exact multiple, a 1-byte and a 517-byte tail with `CHUNK` at 1 KiB, request sizes and call order pinned, FakeDropbox checking each cursor's offset, and :292 a small file's empty finish; test_dropbox_upload_edges.py:58; also test_dropbox_follow_ups.py:306 an extra field before the 0x5455 one)
- [x] **AC-8:** a failure while listing or deleting after a verified upload: the upload stands and the answer says so. Decide whether that answer is a success with fewer deletions or a cause, and pin it. A rate limit (`RateLimitError`) is `other` or retried. (done: pinned as cause `other` naming the verified upload: backend/tests/test_dropbox_upload_edges.py:94 a delete fails halfway, backend/tests/test_dropbox_follow_ups.py:373 the listing fails; a rate limit is retried 3 times by the SDK, then `upload_incomplete`: test_dropbox_upload_edges.py:215 and :125)
- [x] **AC-10:** `~/bookvie-backups` itself a symlink ("the resolved ~/bookvie-backups/"); a daily name with a NUL; a zip without `library.json`, or a file that isn't a zip, with a daily name (no backup time: refused before any call?). (done: backend/tests/test_dropbox_follow_ups.py:241 a symlinked folder uploads from its target, and test_dropbox_upload_edges.py:77 one pointing at the dev folder is refused; test_dropbox_follow_ups.py:170 `nul`, with every refused path pinned to `other` and `connect` never called; test_dropbox_upload_edges.py:155 both, refused before connecting)
- [x] **AC-12:** a refused refresh through the real SDK over `FakeDropboxHttp` is `dropbox_signin` through the tool (AC-8 covers it with `FakeDropbox`'s `signin` fault). (done: backend/tests/test_dropbox_follow_ups.py:329, one refresh with the Keychain's token, no request beyond the token endpoint)
- [x] **AC-13:** the guide's `bookvie-dropbox` commands also parse when run as the installed command (`--help` from the smoke test). (done: backend/tests/test_dropbox_cli_follow_ups.py:119 `<venv>/bin/bookvie-dropbox auth|serve --help` exit 0, :131 an unknown subcommand exits 2)
- [x] **Epic gate:** `bookvie_dropbox/` at ≥ 90% in `scripts/coverage_gate.py`. (done: backend/scripts/coverage_gate.py `Gate("bookvie_dropbox", …, 90.0)`, `--cov=bookvie_dropbox` in the root `package.json` `check:py`, backend/tests/test_coverage_gate.py:49; `npm run check` on 2026-11-22: "bookvie_dropbox 96.36% (450/467 lines, needs >= 90%) ok")

## Helper probes

Helpers reused: `DESCRIPTIONS` (extended, probed by reading 24 descriptions), `structured_of`, `error_of` (`backend/tests/agent_client.py`); `dropbox_content_hash`, `DROPBOX_BLOCK` (`backend/tests/helpers.py`); `_isolated_home` (`backend/tests/conftest.py`, extended with the keyring variable, probed in `test_keyrings`); `_imported_modules` (`backend/tests/test_layers.py`); `section`, `GUIDE`, `README` (`backend/tests/test_dropbox_backup_guide.py`); `dropbox_content_hash`, `FROM_DROPBOX`, `DAILY_NAME`, `DEFAULT_BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `_is_daily_name`, `backup_time`, `extended_timestamp` (`bookvie.intents`); `parse_args` (`bookvie.cli`).

Helpers added:
- `dropbox_fakes.py`, a new shared module, because these fakes need packages the project doesn't have yet, so they can't live in `helpers.py`, which every test imports:
  - `FakeDropbox` and `StoredFile`: no fake Dropbox existed.
  - `ContentHasher` and `content_hash`: the content hash fed in pieces, so the fake never holds a 150 MiB file in memory. `helpers.dropbox_content_hash` takes all the bytes at once.
  - `FakeDropboxHttp`, `http_session` and `authorize_params`: no HTTP fake existed. `cover_server.py` is a real loopback server for cover downloads; this one is a socketless `requests` adapter for the SDK.
  - `MemoryKeyring` and `FailingKeyring`: no keyring existed.
  - `daily_zip`: a zip carrying the 0x5455 field, as bookvie writes since 13.1. `helpers.backup_zip` writes the older shape from a data folder.
  - `write_large_zip`: no sparse helper existed.
- `call_in_process`, `list_stdio_tools`, `ImportFailed` and `import_or_fail` (`agent_client.py`): `McpClient` speaks HTTP to bookvie's `/mcp`, and `bookvie-dropbox` speaks stdio.
- `_crossings` (`test_layers.py`): across packages, not layers. `_forbidden` knows only bookvie's layers.
- `shell_lines`, `guide_commands`, `headed` and `_parses` (`test_dropbox_backup_guide.py`): no guide parser existed; `section` finds one heading.
- `Browser` (`test_dropbox_auth.py`), `Connect`, `upload` and `utc` (`test_dropbox_upload.py`): story-specific.

Each probe ran from a temporary `backend/tests/test_atdd_13_2_probe.py`, in an ephemeral overlay with the two packages: `uv run --with dropbox==12.2.5 --with keyring==25.7.0 pytest -q -p no:cacheprovider tests/test_atdd_13_2_probe.py`, TZ Europe/Madrid. The file was removed with `rm`. 10 passed, on the first and only run; no helper changed after it.
- **`ContentHasher`, `content_hash`:** on 0, 1, 4 MiB−1, 4 MiB, 4 MiB+1 and 12 MiB+5 random bytes, fed whole and in 3 MiB+7 pieces, both equal `helpers.dropbox_content_hash`, with the right size. Plain `sha256(b"a")` is refused (not equal). bookvie's file hash of 4 MiB+9 bytes equals it too.
- **`daily_zip`, `write_large_zip`:** `backup_time` reads back exactly `NOW` (09:01:36), not 09:01:37. The large file is 150 MiB + 1 + the zip, takes under 10 MiB of disk (sparse), and `zipfile` reads its time.
- **`FakeDropbox`, driven as an uploader would, with the real SDK types:**
  - 20 MiB + 3 bytes in 8 MiB chunks: stored and answered size and hash equal the data's, `client_modified` 08:01:36 UTC. The calls are start, append, finish, with request sizes `[8 MiB, 8 MiB, 4 MiB + 3]`.
  - Each of these raises `ApiError`: a wrong offset, a request of 150 MiB + 1, `WriteMode.add` onto an existing name, and a chunk whose own `content_hash` doesn't match.
  - Paging 6 files 2 at a time returns all 6. `files_delete_v2` removes one. `files_upload` fails the test (`AssertionError`). A `.backups` never written to lists as `ApiError` (not found).
  - Faults: `signin` raises `AuthError`. `fail_chunk` raises on the second request and stores nothing. `wrong_size` answers 4 for 3 bytes. `refuse_hash` and `full` raise `ApiError`, and `full`'s is `path`/`insufficient_space`.
- **`FakeDropboxHttp`, under the real SDK 12.2.5:**
  - `Dropbox(oauth2_refresh_token, app_key, session)` lists `/.backups` as empty after two refreshes, with `access-1` then `access-2`.
  - A revoked refresh token raises `AuthError`. An app secret is refused (`BadInputError`).
  - `DropboxOAuth2FlowNoRedirect(use_pkce=True, token_access_type="offline")`, given the session, exchanges a code for its own challenge and gets the issued refresh token, with no secret. A second flow's verifier is refused for the first flow's challenge.
- **`MemoryKeyring`, `FailingKeyring`:** with no keyring set, `keyring.get_keyring()` is the `fail` backend (conftest's variable works). The memory backend replaces a password. The failing one raises `KeyringLocked`.
- **`call_in_process`, `list_stdio_tools`, `import_or_fail`:** against a tiny low-level server, a structured answer reads through `structured_of` and an error one through `error_of`. A missing module gives an `ImportFailed` whose attribute read raises `AssertionError` naming it, and an error result with no `cause`. `json` imports as itself. The same tiny server over stdio lists `echo` with its schema. A command that doesn't exist gives `{"error": …}` and no `tools`.
- **`guide_commands`, `shell_lines`, `headed`, `_parses`:** on a sample guide, prose and JSON blocks are ignored. A `$ ` prompt, a pipe, a comment, a backslash continuation and a `<placeholder>` are handled. `claude mcp add --transport http …` gives no command, and `… -- /Users/me/.local/bin/bookvie-dropbox serve` gives `serve`. Each heading's section stops at the next heading. `parse_args` accepts `--dev` and `--help` and refuses `--nope` and `--port x` (exit 2).
- **`Browser`:** against a listening loopback server it records `[200]`; against a closed port, one error string.
- **`_crossings`** has a permanent, passing self-test, `test_the_cross_package_scanner_catches_each_crossing` (`test_layers.py:188`): a bookvie module importing `dropbox`, `keyring` and `bookvie_dropbox` is flagged with all three, and one importing `dropbox_content_hash` from a sibling isn't. A `bookvie_dropbox` module importing `bookvie` or `bookvie.intents` is flagged, and one importing `dropbox`, `keyring` and a sibling isn't.

Shipped numbers: none quoted (no UI). The 150 MiB, 4 MiB and 3 copies are Dropbox's limits and AD-22's rules, not shipped UI.
Storage keys: no new localStorage key.
Fractional borders: none (no UI).

Render-before-read: no leaf reads a page (no UI). Each one-shot read of a tool answer, a fake's state or a file comes after the call that produces it. Every red leaf's first operation that can fail is its criterion assertion (below). `import_or_fail`, `call_in_process` and `list_stdio_tools` turn "not built yet" into a value the first assertion fails on, rather than an error in setup.

## TDD Red Phase

Generated: 36 pytest cases in 13 leaves, all `@pytest.mark.skip(reason=RED)`, each with a comment above it saying when to un-skip (the TEA hook's C1 rule). The red run came after the probes passed. It used throwaway un-skipped copies (`tests/<module>_redrun_probe.py` for the six modules), in the same overlay, then removed with `rm`. **36 failed**, each at its criterion assertion:
- **AC-1** `['bookvie'] == ['bookvie', 'bookvie_dropbox']`.
- **AC-2** `bookvie_dropbox/__init__.py` isn't a file.
- **AC-3** `contracts.is_daily_name`: `bookvie_dropbox.contracts can't be imported`.
- **AC-4** the Keychain's token, with no authorize URL, no visit and no request.
- **AC-5** the listed names, with `FileNotFoundError: …/bin/bookvie-dropbox`. In the overlay, `sys.executable` is the overlay's Python; under `uv run pytest` it is `.venv/bin/python`, beside the script `uv sync` installs.
- **AC-6** Dropbox's names, with `bookvie_dropbox.server can't be imported`.
- **AC-7** (4 cases) Dropbox's names.
- **AC-8** (12 cases) the `cause`.
- **AC-9** 20 Nov's content hash.
- **AC-10** (10 cases) refused with a cause.
- **AC-11** `([], …)`: no upload requests.
- **AC-12** `(None, [])`: no listing, no request.
- **AC-13** no Setup section.

`git status` after the runs lists only the files in `generatedTestFiles` above. It lists no `*probe*` file and no throwaway copy. `uv run ruff check .` and `uv run ruff format --check .` pass in `backend/`.

## For the build

1. **AC-6's "the whole file's `content_hash`" can't be done as written** (from the SDK's source, above). Build what the SDK allows: Dropbox's own per-call hash (on by default, `auto_content_hash`), then the whole-file check of the returned `FileMetadata.content_hash` and `size`, then the prune. The leaves pin exactly that. AD-22's "the whole file's `content_hash` (Dropbox refuses a mismatch)" is then spine drift on AD-22: the review records it in `deferred-work.md` with the words "spine drift", and the epic's reconciliation fixes the spine and the AC's wording.
2. **The app key:** `APP_KEY` is a constant and the app is Oleg's own Dropbox app. The build needs Oleg to register it (App folder access, the redirect URI it chose) and give the key, or must ship a placeholder that the guide says to replace. The leaves run with any non-empty `APP_KEY`. Ask Oleg in the build.
3. `requests` comes in with `dropbox`. The SDK calls `datetime.utcnow()`, which warns on Python 3.14 (`DeprecationWarning`). The suite doesn't treat warnings as errors, so nothing fails.
4. `deferred-work.md`'s entry for `dropbox_content_hash` ("Add Dropbox's published example vector, or an over-4-MiB and exactly-8-MiB file") is met by AC-3's leaf, apart from the full image. The review closes it or narrows it to the image.
5. `docs/dropbox-backup.md`'s opening paragraph says daily backups "come in later sections". Story 13.2 adds the first of them (Setup), so the intro changes too.

## Decisions for Oleg

- **Dropbox's full published vector:** AC-3 checks that Dropbox's published block digests give its published hash, and that both copies of the hash follow that rule on every boundary size. Running `contracts.dropbox_content_hash` on Dropbox's own 9.7 MB `milky-way-nasa.jpg` needs that image in the repo (or fetched, which no test may do). The leaf doesn't do it. Commit the image as test data if you want it.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove the skip from a leaf when its task starts. A suggested order: AC-1 (`uv add dropbox keyring` in the series, the package, the script, the smoke step), AC-2, AC-3, AC-5, AC-10, AC-6, AC-7, AC-9, AC-11, AC-8, AC-12, AC-4, AC-13.
2. Run it, see it fail at its first assertion, then implement until it passes:
   - `cd backend && uv run pytest -q tests/test_dropbox_upload.py tests/test_dropbox_auth.py tests/test_dropbox_contracts.py tests/test_dropbox_package.py`
   - `cd backend && uv run pytest -q tests/test_layers.py tests/test_dropbox_backup_guide.py tests/test_stack_pins.py`
3. The four `test_stack_pins.py` cases go green once the dependencies are in, with no edit.
4. Record in the spec the PyPI versions on the build's day, and the app key's origin.
5. Finish with `npm run check` (the smoke test installs the tool and runs `bookvie-dropbox --help`).
