---
title: 'Story 13.2: Upload a backup to my Dropbox'
type: 'feature'
created: '2026-11-22'
status: 'in-review'
baseline_revision: '72ee0d6ebd5ff61ac0e7f11055c41aec046d7ecc'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-22 Dropbox tools), reconciled before the next epic: `upload_backup` can't finish with "the whole file's `content_hash` (Dropbox refuses a mismatch)": the SDK's `content_hash` is per request and `CommitInfo` has none. The code sends Dropbox's per-request hash (`auto_content_hash`) and checks the returned `size` and `content_hash` against the bytes sent, before any prune; AC-6's wording needs the same fix.
    evidence: |-
      spine-check finding 1, intent-alignment divergence 2; ATDD checklist "For the build" 1; `backend/bookvie_dropbox/upload.py` `_upload`.
    location: >-
      backend/bookvie_dropbox/upload.py
    severity: low
  - summary: >-
      Spine drift (AD-22 Dropbox scope and sign-in), reconciled before the next epic: there is no `DropboxApi` seam. The seam is `build_server(connect=…)`, whose `connect()` returns the SDK's `dropbox.Dropbox`; `upload.py` calls the SDK's own `files_*` methods and tests fake the SDK client (`tests/dropbox_fakes.py` `FakeDropbox`), as the ATDD pinned.
    evidence: |-
      spine-check finding 2; `backend/bookvie_dropbox/server.py` `build_server`, `dropbox_api.py` `connect`.
    location: >-
      backend/bookvie_dropbox/server.py
    severity: low
  - summary: >-
      Spine drift (AD-22 Dropbox tools, "Any failure deletes nothing"), reconciled before the next epic: a prune that fails after a verified upload answers `other` (the message says the upload was verified and names any name already deleted), so it may have deleted some older dailies. The spine should narrow "deletes nothing" to failures before the verify.
    evidence: |-
      spine-check finding 3; spec I/O matrix row "Prune fails after verify"; `tests/test_dropbox_upload_edges.py`.
    location: >-
      backend/bookvie_dropbox/upload.py
    severity: low
  - summary: >-
      Spine drift (AD-22 Causes, AD-9), reconciled before the next epic: `upload_backup`'s failure is `isError` with one JSON text `{cause, message}`, not AD-9's error object (`kind`, `code`, `message`), while AD-9's binding names "the agent tools' errors (AD-21, AD-22)".
    evidence: |-
      spine-check finding 4; `backend/bookvie_dropbox/server.py` `_error`.
    location: >-
      backend/bookvie_dropbox/server.py
    severity: low
  - summary: >-
      In Story 13.3: the cause enum `CAUSES` exists only in `bookvie_dropbox/contracts.py`; AD-22's copied-contracts rule wants bookvie's copy (13.3's `record_backup_upload` cause) and a test comparing the two. 13.3's AC already asks for it ("bookvie's equals `bookvie_dropbox`'s (Story 13.2)").
    evidence: |-
      spine-check finding 5; epics.md Story 13.3.
    location: >-
      backend/bookvie_dropbox/contracts.py
    severity: low
  - summary: >-
      Spine drift (AD-22 Dropbox scope and sign-in, Consistency Conventions Config), reconciled before the next epic: the fixed loopback redirect is `http://127.0.0.1:8790/dropbox-auth` (`REDIRECT_PORT` 8790), a second fixed listener beside bookvie's 8765/8766 (AD-16); the spine names no port.
    evidence: |-
      spine-check finding 6; `backend/bookvie_dropbox/auth.py`.
    location: >-
      backend/bookvie_dropbox/auth.py
    severity: low
  - summary: >-
      Spine drift (Stack), reconciled before the next epic: `requests` (2.34.x) is now a declared runtime dependency of `bookvie_dropbox` (it imports it directly in `auth.py` and `upload.py`), with no Stack row, like httpx2's note.
    evidence: |-
      spine-check finding 7 (the undeclared import was patched in pyproject.toml); `backend/pyproject.toml`.
    location: >-
      backend/pyproject.toml
    severity: low
  - summary: >-
      Spine drift (Design Paradigm, AD-22, Consistency Conventions Config, Stack, Structural Seed), reconciled before the next epic: lines still say "planned" for what 13.2 built: the Design Paradigm's "(Epic 13, planned)", the mermaid "MCP over stdio (planned)", the Config row's `bookvie-dropbox auth` and `serve`, the Stack `dropbox`, `keyring` and `mcp` stdio rows, and the Structural Seed's wheel packages, smoke check, `bookvie_dropbox/` and `docs/dropbox-backup.md`.
    evidence: |-
      spine-check finding 8.
    location: >-
      ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      Before Story 13.4's manual run: `APP_KEY` in `backend/bookvie_dropbox/dropbox_api.py` is the placeholder `REPLACE-WITH-YOUR-DROPBOX-APP-KEY` (the app wasn't registered when the build ran). Oleg registers the Dropbox app as the guide's Setup says and commits the real key. `bookvie-dropbox auth` refuses to start until then.
    evidence: |-
      spec Design Notes "App key"; blind-hunter finding 2, edge-case finding 3, intent-alignment divergence 1.
    location: >-
      backend/bookvie_dropbox/dropbox_api.py
    severity: medium
  - summary: >-
      A refresh refused with something other than 400 `invalid_grant` (for example an unknown app key) becomes the SDK's `BadInputError`, which `upload_backup` answers as `other`, not `dropbox_signin`. Medium if Dropbox answers a wrong app key that way, unverified; settled by Story 13.4's first real run or a check of Dropbox's token-endpoint errors.
    evidence: |-
      verification-gap other finding 2; `.venv/.../dropbox/dropbox_client.py` `raise_dropbox_error_for_resp`.
    location: >-
      backend/bookvie_dropbox/upload.py
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** The library has no off-machine copy. There is no Dropbox side at all: no `bookvie_dropbox` package, no `bookvie-dropbox` command, no sign-in and no upload tool (epics.md Story 13.2, spine AD-22).

**Approach:** Add a second package, `backend/bookvie_dropbox/`, shipped in bookvie's wheel with its own console script `bookvie-dropbox auth|serve`. `auth` signs in once with OAuth PKCE and keeps the refresh token only in the Keychain. `serve` is a stdio MCP server with exactly one tool, `upload_backup`, which uploads a daily backup through a chunked session, verifies Dropbox's copy, and only then prunes to 3 daily copies. The guide gets its Setup and troubleshooting. Story 13.2's 13 red-phase leaves (already committed, `@pytest.mark.skip(reason=RED)`) are the contract: un-skip each and make it pass.

## Boundaries & Constraints

**Always:**
- Nothing under `bookvie/` imports `bookvie_dropbox`, `dropbox` or `keyring`; nothing under `bookvie_dropbox/` imports `bookvie`. Copied contracts (`DAILY_NAME`, folder names, `dropbox_content_hash`, `CAUSES`) live once on each side.
- `upload_backup`'s registered description equals the "Description:" line of Story 13.2 in `epics.md`, verbatim (test reads it).
- Path checks run before `connect()` is called and before any Dropbox call. `connect()` is called at most once per tool call, only when the call needs Dropbox.
- Verify then prune: delete only after the finish answered a `size` equal to the file's size and a `content_hash` equal to the file's own content hash. Prune by the date parsed from daily names, keep the 3 newest, never delete the name just written, never count or delete a non-daily name or a folder.
- No token (refresh or access) in stdout, stderr, logs, files, or a tool answer.
- Tests never reach the network, the real Keychain, `~/bookvie-data` or a real backups folder.
- Follow AGENTS.md "Story pipeline": never run `git stash`, `git checkout -- <path>`, `git restore` (except `--staged`), `git reset`, `git clean` or a branch change; a subagent prompt carries this rule.

**Never:**
- No delete tool, no `list_backups`/`download_backup` (Story 13.7), no `record_backup_upload`, `export_backup` change or skill (13.3, 13.4), no launchd (13.5).
- Never `files_upload`, `files_move_v2`, `files_delete_batch` or any SDK call other than the upload session's three, `files_list_folder`, `files_list_folder_continue`, `files_delete_v2` (FakeDropbox fails the test on any other).
- No app secret anywhere. No token file. Don't edit `ARCHITECTURE-SPINE.md` (spine drift is deferred at review).
- No change to the red leaves' assertions; only remove the skip decorators (and the now-unused `RED` constant if ruff flags it).
- No README edits beyond the Agent tools paragraph (AC-13 reads it).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Good upload, 3 older | today's daily zip in `~/bookvie-backups/`; Dropbox has 17, 18, 19 Nov | start, appends, finish to `/.backups/<name>` (`WriteMode.overwrite`, `client_modified` = zip backup time in UTC); then delete 17 Nov only; `{name, copies: 3, deleted: ["…17.zip"], contentHash}` | — |
| ≤ 3 copies / other files | 0–2 older dailies, non-daily files, a folder with a daily name | nothing deleted while ≤ 3 dailies; others never counted | — |
| Same-day rerun | today's name already in Dropbox | overwritten only by the verified finish; `deleted` [] | a failed rerun leaves the earlier copy |
| Upload fault | refused hash, failed chunk (`ConnectionError`), `ReadTimeout`, wrong size, wrong hash | no delete | `cause: upload_incomplete` |
| Space | `path/insufficient_space` | no delete | `cause: dropbox_full` |
| Sign-in | `AuthError`; Keychain locked, denied (`KeyringError`) or empty | no Dropbox call beyond the failing one | `cause: dropbox_signin`, message names `bookvie-dropbox auth` |
| Other | `InternalServerError`, `RuntimeError`, any other exception | no delete | `cause: other` |
| Refused path | `~/bookvie-backups-dev/…`, `from-dropbox/…`, safety copy, outside, `..`, symlink out, missing, folder, `2026-02-30`, relative, NUL, zip without `library.json`/not a zip | refused, `connect` never called, Dropbox unchanged | `cause: other` |
| Prune fails after verify | list or delete raises after a verified finish | upload stands | `cause: other`, message says the upload was verified and the prune didn't finish |
| > 150 MB | sparse file of 150 MiB + 1 + zip | several data requests, each ≤ 150 MiB; verifies | — |

</intent-contract>

## Code Map

- `backend/tests/test_dropbox_package.py`, `test_layers.py:181`, `test_dropbox_contracts.py:69`, `test_dropbox_auth.py:102`, `test_dropbox_upload.py` (`:124`, `:152`, `:260`, `:321`, `:362`, `:469`, `:501`, `:524`), `test_dropbox_backup_guide.py:146` -- the 13 red leaves (AC-1..AC-13). Each pins names; read them before writing code.
- `backend/tests/dropbox_fakes.py` -- `FakeDropbox` (SDK method names and types; faults at `:152`; finish commits a wrong-size/hash file and answers it, so the check must be against the local file), `FakeDropboxHttp` (token + list_folder endpoints under the real SDK), `MemoryKeyring`, `FailingKeyring`, `daily_zip`, `write_large_zip`, `BACKUPS = "/.backups"`, `MAX_REQUEST`.
- `backend/tests/agent_client.py` -- `call_in_process(server, …)` uses `mcp.Client(server, raise_exceptions=True)` on a low-level `Server`; `structured_of` (structured content equals its one JSON text content); `error_of` (`isError`, one JSON text content with `cause`, `message`).
- `backend/tests/conftest.py:_isolated_home` -- temp `HOME`, `PYTHON_KEYRING_BACKEND=keyring.backends.fail.Keyring`.
- `backend/bookvie/agent/server.py:39` -- `build_mcp_server`: the low-level `Server(name, version, on_list_tools, on_call_tool)` pattern to mirror (no `MCPServer`; answer JSON text + structured content; errors as `isError`).
- `backend/bookvie/intents/backup_file.py:176-272` -- bookvie's side of the contracts to copy: `DAILY_NAME` (no anchors, `re.ASCII`, used with `fullmatch` + calendar check), `DEFAULT_BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `FROM_DROPBOX`, `dropbox_content_hash`, and `resolve_backup_path` (absolute, no `..`, no NUL, parent resolved == folder resolved, regular file not symlink) as the path-check model.
- `backend/bookvie/intents/export.py:76-99` -- `stamped_mtime` / `backup_time`: read `library.json`'s 0x5455 field as UTC epoch, else its `date_time` as local time. Copy this logic (stdlib) for `client_modified`.
- `backend/bookvie/cli.py` -- `parse_args(argv)` / `main` shape for `bookvie_dropbox.cli`.
- `backend/pyproject.toml` -- add deps, script, wheel package; `backend/uv.lock` via `uv add`.
- `scripts/smoke.mjs` -- after installing the tool, also run `<bin>/bookvie-dropbox --help` and require exit 0.
- `docs/dropbox-backup.md`, `README.md:103-115` -- guide Setup + troubleshooting; Agent tools paragraph.
- Deferred-work intake:
  - `deferred-work.md:1478` (content hash only tested under one 4 MiB block; add Dropbox's published vector or >4 MiB / 8 MiB files) -- turned into AC-3 (`test_dropbox_contracts.py` sizes 0…12 MiB+5 on both copies plus the published block digests). The full 9.7 MB image isn't committed (Oleg's call, ATDD "Decisions for Oleg"); Finalize marks it resolved and notes that.
- Not in this story: the `bookvie_dropbox/` ≥ 90% coverage gate in `scripts/coverage_gate.py` (epic gate; `bmad-testarch-automate` / trace), the ATDD's other green-phase follow-ups (automate step).

## Tasks & Acceptance

**Execution:**
- `backend/pyproject.toml`, `backend/uv.lock` -- check PyPI today (`uv pip index versions` or the PyPI JSON) and record versions in Design Notes; `cd backend && uv add "dropbox>=12.2.5,<12.3" "keyring>=25.7.0,<25.8"`; `[project.scripts] bookvie-dropbox = "bookvie_dropbox.cli:main"`; wheel `packages = ["bookvie", "bookvie_dropbox"]`; `uv sync` so `.venv/bin/bookvie-dropbox` exists -- AC-1, AC-5.
- `backend/bookvie_dropbox/__init__.py` -- package docstring (two processes, no import of `bookvie`).
- `backend/bookvie_dropbox/contracts.py` -- `DAILY_NAME`, `is_daily_name`, `BACKUPS_NAME`, `DEV_BACKUPS_NAME`, `FROM_DROPBOX`, `DROPBOX_BLOCK`, `dropbox_content_hash(path)`, `CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")`, each docstring naming bookvie's copy -- AC-3.
- `backend/bookvie_dropbox/dropbox_api.py` -- `APP_KEY` (see Design Notes), `KEYRING_SERVICE`, `KEYRING_ACCOUNT`, `connect(*, session=None)`: read `keyring.get_password`; `None` or any `keyring.errors.KeyringError` → a `SigninError`; return `dropbox.Dropbox(oauth2_refresh_token=…, app_key=APP_KEY, session=session)` with no secret -- AC-8, AC-12.
- `backend/bookvie_dropbox/upload.py` -- `resolve_upload_path(raw, home)`, `read_backup_time(path)` (zip's `library.json`, aware UTC), `upload_backup(dbx, path)`: chunked session (chunk size a constant ≤ 150 MiB, e.g. 8 MiB; start with the first chunk, appends, finish with the last chunk, or an empty finish), `CommitInfo(path="/.backups/<name>", mode=WriteMode.overwrite, client_modified=<naive UTC>)`, compare answered `size`/`content_hash` with the file's, then list `/.backups` (follow `has_more`; `not_found` = empty), prune; exception → cause mapping per the Matrix -- AC-6..AC-11.
- `backend/bookvie_dropbox/server.py` -- `build_server(*, connect=None) -> mcp.server.lowlevel.Server` with the one tool: description from epics.md, schema `{type: object, properties: {localPath: {type: string}}, required: ["localPath"], additionalProperties: false}`; success = structured content + same JSON as one text content; failure = `isError` + one JSON text `{cause, message}`; `serve()` runs it over stdio. Listing tools needs no Keychain -- AC-5.
- `backend/bookvie_dropbox/auth.py` -- `REDIRECT_PORT`, `REDIRECT_URI`, `run_auth(*, open_browser=webbrowser.open, session=None)`: bind `127.0.0.1:REDIRECT_PORT` first, then open `https://www.dropbox.com/oauth2/authorize` (`client_id`, `response_type=code`, S256 challenge, `token_access_type=offline`, `redirect_uri`, `state`), wait for one redirect (check `state`; answer 200 with a short "you can close this tab" page; no `code` → stop, store nothing), exchange the code through `session` (SDK `DropboxOAuth2Flow` with `requests_session`, or its own POST), `keyring.set_password`, print a token-free success line. Clear errors (no token in them) for a taken port, a refused exchange, a Keychain write failure -- AC-4.
- `backend/bookvie_dropbox/cli.py` -- `parse_args(argv)` (argparse, `auth` and `serve` subcommands, `--help` exits 0, unknown exits 2) and `main()` -- AC-1, AC-13.
- `backend/tests/*` (the 9 leaves) -- remove `@pytest.mark.skip(reason=RED)` and its comment; drop unused `RED` if ruff complains.
- `scripts/smoke.mjs` -- run the installed `bookvie-dropbox --help` and fail on non-zero -- AC-1.
- `docs/dropbox-backup.md` -- rewrite the intro (daily backups now start); add `## Setup` before `## Restoring`: register the app (Scoped access, **App folder**, name `bookvie` so the folder is `/Apps/bookvie/`, scopes `` `files.metadata.read` ``, `` `files.content.read` ``, `` `files.content.write` ``, the redirect URI exactly `REDIRECT_URI`, the app key into `APP_KEY` then reinstall), `bookvie-dropbox auth`, both `claude mcp add … --scope user` lines (bookvie's HTTP line with `http://127.0.0.1:8765/mcp`; `claude mcp add --scope user bookvie-dropbox -- /Users/<you>/.local/bin/bookvie-dropbox serve`, and how to find the path with `which bookvie-dropbox`), `claude mcp list`. Troubleshooting under `## Setup`: a heading on an expired sign-in (`dropbox_signin` → `bookvie-dropbox auth`) and a heading with "failed" (an MCP server shown as failed in `claude mcp list`: bookvie not running or started after the session → `/mcp` reconnect, a moved command path, `` `uv` `` not found) -- AC-13.
- `README.md` -- Agent tools paragraph: name `bookvie-dropbox` and keep the guide link -- AC-13.

**Acceptance Criteria:**
- Given the 13 Story 13.2 leaves un-skipped, when `cd backend && TZ=Europe/Madrid uv run pytest -q tests/test_dropbox_upload.py tests/test_dropbox_auth.py tests/test_dropbox_contracts.py tests/test_dropbox_package.py tests/test_layers.py tests/test_dropbox_backup_guide.py tests/test_stack_pins.py tests/test_wheel_build.py` runs, then every case passes (36 Story 13.2 cases, plus the 4 stack-pin cases).
- Given the installed tool, when `npm run check` runs from the repo root, then it passes, including the smoke step running `bookvie-dropbox --help`.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 47 findings (rows, counting each duplicate report once more) — high 0, medium 7, low 23, false 14, maybe-false 3
- findings:
  - `[low]` `[reject]` Intent: the real outcome lives in real Dropbox, but every test uses fakes and `APP_KEY` is a placeholder — the fakes are the epic's own test rule; the placeholder is grouped with blind-hunter 2 (patched guard) and deferred for Oleg's key.
  - `[low]` `[defer]` Intent: the whole-file hash is checked after the commit, not enforced by Dropbox — grouped with spine 1; spine drift, deferred.
  - `[low]` `[reject]` Intent: no test calls `upload_backup` through the installed `serve` — AC-5 asks for the tool list over stdio only, and the smoke now imports the server's modules (blind-hunter 4 patch); a stdio call adds a subprocess test for little.
  - `[low]` `[reject]` Intent: the guide gives a path template, and its intro says "sets up daily backups" before 13.4/13.5 ship them — `which bookvie-dropbox` plus a template is the exact line for any home folder; the guide grows story by story (epic rule).
  - `[false]` `[reject]` Intent: auth runs against a fake OAuth server — that is AC-4's stated surface.
  - `[false]` `[reject]` Intent: the refresh runs the real SDK over `FakeDropboxHttp` — same surface as AC-12.
  - `[false]` `[reject]` Intent: more refusals than the epic lists, and the zip is read before connecting — still no network call before the checks, which is AC-10's rule; the extras are the spec matrix's.
  - `[false]` `[reject]` Intent: the story is left in review — AGENTS.md "Story pipeline" step 2 ends there.
  - `[low]` `[defer]` Spine 1: AD-22's whole-file `content_hash` on the commit — spine drift, deferred.
  - `[low]` `[defer]` Spine 2: no `DropboxApi` seam — spine drift; the ATDD pinned `connect()` and an SDK fake.
  - `[low]` `[defer]` Spine 3: a failed prune after verify answers `other` though it may have deleted some — spine drift; the spec matrix pins it.
  - `[low]` `[defer]` Spine 4: `{cause, message}` isn't AD-9's error object — spine drift.
  - `[low]` `[defer]` Spine 5: `CAUSES` has no bookvie copy or compare test yet — Story 13.3's AC adds both.
  - `[low]` `[defer]` Spine 6: the fixed redirect port isn't in the spine — spine drift.
  - `[medium]` `[patch]` Spine 7: `bookvie_dropbox` imports `requests`, an undeclared transitive dependency — declared `requests>=2.34,<2.35` (uv add); the Stack row gap is deferred as spine drift.
  - `[low]` `[defer]` Spine 8: "planned" labels for what 13.2 built — spine drift.
  - `[false]` `[reject]` Blind 1 / edge 5: uploading an older daily deletes a newer copy — the AC prunes "the oldest daily backup by the date parsed from the name … never the name it just wrote", and the ATDD's follow-up pins exactly that (16 Nov over 17–19 deletes 17 Nov).
  - `[medium]` `[patch]` Blind 2 / edge 3: the placeholder `APP_KEY` isn't refused — `cli.main` refuses `auth` with exit 1 naming the guide's Setup while `APP_KEY` is `APP_KEY_PLACEHOLDER` (`run_auth` stays unguarded for AC-4); the key itself is deferred to Oleg.
  - `[low]` `[patch]` Blind 3: Setup step 6 doesn't say to commit the key — the guide now says to commit it.
  - `[medium]` `[patch]` Blind 4 / verification-gap other 1: `--help` never imports `dropbox`, `keyring` or `mcp`, so the smoke can't prove they ship — `cli.py` imports `.auth`, `.server` and `dropbox_api` at module level.
  - `[low]` `[reject]` Blind 5: troubleshooting lacks `upload_incomplete`, `dropbox_full`, `other` — epics.md gives that troubleshooting to Story 13.4's AC.
  - `[low]` `[patch]` Blind 6: the Keychain prompt names the program (Python of the install), not `bookvie-dropbox`, and comes back after a reinstall — guide line reworded.
  - `[medium]` `[patch]` Blind 7 / edge 4: a 429 retries forever (SDK default `max_retries_on_rate_limit=None`, checked in `dropbox_client.py:626`) and a final `RateLimitError` is `other` — `connect` passes `max_retries_on_rate_limit=3`, `_upload` maps `RateLimitError` to `upload_incomplete`; test added.
  - `[low]` `[reject]` Blind 7 (second part): an `AuthError` during the prune is `other` — the upload stood verified, so a sign-in cause ("Nothing was uploaded") would be wrong; a rare case.
  - `[low]` `[patch]` Blind 8: cause strings are never checked against `CAUSES` — `UploadRefused.__init__` asserts `cause in CAUSES`.
  - `[low]` `[patch]` Blind 9: the partial-prune message is untested — edge test with 4 older dailies, the second delete failing.
  - `[medium]` `[patch]` Blind 10: the redirect handler accepted a wrong `state` and showed success — the handler compares `state` and answers 400 to anything else, keeps waiting; tests added.
  - `[medium]` `[patch]` Blind 11 / edge 1: an idle preconnect socket blocks `handle_request` past `WAIT_SECONDS` — `_Handler.timeout = 10`.
  - `[low]` `[patch]` Blind 12: Setup step 3 always adds `bookvie`, which the README already had users add — the guide says to skip it when step 4's list shows it.
  - `[low]` `[reject]` Blind 13: `serve` doesn't catch Ctrl-C; `auth` prints a traceback for an unexpected error — rare, leaks nothing; Claude Code stops `serve` by closing stdin.
  - `[low]` `[reject]` Blind 14: any zip with a `library.json` passes — the upload only transports the file; bookvie validates a backup when restoring it.
  - `[low]` `[patch]` Edge 2: a 200 token answer whose JSON isn't an object raises `AttributeError` — `refresh_token` is read only from a dict; test added.
  - `[false]` `[reject]` Edge 6: `dbx.close()` raising replaces a verified result — the SDK's `close` only closes its `requests` session; nothing shows it raising.
  - `[false]` `[reject]` Edge 7: the spec says `upload_backup(dbx, path)` — the only caller is `server._answer`, which passes the right arguments; the fix would be a spec edit.
  - `[medium]` `[patch]` Verification gap 1: auth's failure branches (state, no code, refused exchange, Keychain write, taken port) are untested — 7 tests added in `test_dropbox_auth.py`, each checking the Keychain keeps `OLD_TOKEN` and no token is printed.
  - `[low]` `[patch]` Verification gap 2: `read_backup_time`'s local-time fallback is untested — edge test with an unstamped zip checks `client_modified`.
  - `[low]` `[patch]` Verification gap 3: the `folder == dev` guard is untested — edge test with `~/bookvie-backups` symlinked to the dev folder.
  - `[maybe-false]` `[defer]` Verification gap other 2: a refresh refused other than `invalid_grant` is `BadInputError` → `other` — would need Dropbox's real answer to a wrong app key; deferred, medium unverified.
  - `[maybe-false]` `[reject]` Intent: the guide's `which bookvie-dropbox` path may differ from `~/.local/bin` — the guide tells the user to use whatever `which` prints; if wrong only low.
  - `[maybe-false]` `[reject]` Blind 6 (second part): a Keychain prompt during a headless `serve` blocks the call — Story 13.5's run is where it would show; only low here, nothing headless ships yet.
  - `[false]` `[reject]` Spine "AD-22 met" items (path checks first, overwrite mode, client_modified, verify then prune, Keychain names) — confirmations, not defects.
  - `[false]` `[reject]` Intent short version restating divergences 1–3 — covered by the rows above.
  - `[false]` `[reject]` Edge 5 duplicate of blind 1 — same claim, same refutation.
  - `[false]` `[reject]` Edge 1 duplicate of blind 11 — patched there.
  - `[false]` `[reject]` Edge 3 duplicate of blind 2 — patched there.
  - `[false]` `[reject]` Edge 4 duplicate of blind 7 — patched there.
  - `[false]` `[reject]` Verification-gap other 1 duplicate of blind 4 — patched there.

## Design Notes

- **Versions (PyPI, 2026-11-22):** `dropbox` 12.2.5, `keyring` 25.7.0 (ATDD's check); the build re-checks and records the result here if newer. Build re-check (PyPI JSON, 2026-11-22): still `dropbox` 12.2.5 and `keyring` 25.7.0; `uv.lock` resolves exactly those.
- **App key:** Oleg's Dropbox app isn't registered yet, and an unattended build can't ask. Ship `APP_KEY` as a clearly named placeholder constant (non-empty), and the guide's Setup tells Oleg to paste the key from the app's Settings page into `backend/bookvie_dropbox/dropbox_api.py` and reinstall. A PKCE app key isn't a secret. Before Story 13.4's manual run, Oleg registers the app and commits the real key. Recorded in the Auto Run Result as a decision for Oleg.
- **Redirect:** `REDIRECT_PORT = 8790` (clear of bookvie's 8765/8766), `REDIRECT_URI = "http://127.0.0.1:8790/dropbox-auth"`; Dropbox allows `http` only for loopback.
- **Whole-file hash (ATDD "For the build" 1):** the SDK's `content_hash` is per call and `CommitInfo` has none, so leave `auto_content_hash` on (per-request hash) and check the returned `FileMetadata.content_hash` and `size` against the file. AD-22's "Dropbox refuses a mismatch" is spine drift for the review to defer.
- **Refused path cause:** `other`. `backup_write` means bookvie's export failed (13.4 records it); a refused path is a wrong argument, which is neither.
- **Prune after verify fails:** an error, `other`, whose message says the upload is verified and which names weren't deleted, so 13.4 records a failure rather than a silent extra copy.
- **Home:** read `Path.home()` per call (tests set `HOME` before both).

## Verification

**Commands:**
- `cd backend && uv run ruff format --check . && uv run ruff check .` -- expected: clean.
- the pytest command in Acceptance Criteria -- expected: all pass, no skips among Story 13.2 leaves.
- `npm run check` (repo root) -- expected: passes (format, lint, tsc, full pytest + coverage gate, e2e, smoke).

## Auto Run Result

Status: in-review

**Summary.** Story 13.2 adds `backend/bookvie_dropbox/`, shipped in bookvie's wheel with the console script `bookvie-dropbox auth|serve`. `auth` signs in once with OAuth PKCE on `http://127.0.0.1:8790/dropbox-auth` and keeps the refresh token only in the Keychain. `serve` is a stdio MCP server with exactly one tool, `upload_backup`: it accepts only a daily backup directly in `~/bookvie-backups/`, checked before any Dropbox call. It uploads through an upload session to `/.backups/<name>` (`WriteMode.overwrite`, `client_modified` from the zip's `library.json` time in UTC), checks Dropbox's `size` and `content_hash` against the bytes sent, and only then prunes to the 3 newest daily names. All 13 red-phase leaves are un-skipped and green.

**Files changed**
- `backend/pyproject.toml`, `backend/uv.lock`: `dropbox` 12.2.5, `keyring` 25.7.0, `requests` 2.34.x as runtime dependencies; the `bookvie-dropbox` script; wheel packages `["bookvie", "bookvie_dropbox"]`.
- `backend/bookvie_dropbox/__init__.py`: the package; it never imports `bookvie`.
- `backend/bookvie_dropbox/contracts.py`: the copied daily-name rule, folder names, content hash and `CAUSES`.
- `backend/bookvie_dropbox/dropbox_api.py`: `APP_KEY` (placeholder), the Keychain read, and `connect()` (no secret, at most 3 rate-limit retries).
- `backend/bookvie_dropbox/upload.py`: path checks, backup time, chunked upload, verify, prune, and the cause mapping.
- `backend/bookvie_dropbox/server.py`: the low-level MCP `Server` with `upload_backup` and its epics.md description, and `serve()` over stdio.
- `backend/bookvie_dropbox/auth.py`: the PKCE sign-in, with the loopback listener, `state` check and code exchange.
- `backend/bookvie_dropbox/cli.py`: `parse_args` and `main`; `auth` refuses the placeholder app key.
- `backend/tests/test_dropbox_*.py`, `test_layers.py`: skips removed (no assertion changed); `test_dropbox_auth.py` gains 7 failure-path tests.
- `backend/tests/test_dropbox_upload_edges.py` (new): the matrix's edge rows, plus the review's cases.
- `scripts/smoke.mjs`: runs the installed `bookvie-dropbox --help`.
- `docs/dropbox-backup.md`: new intro, Setup in order, and setup troubleshooting.
- `README.md`: the Agent tools paragraph names `bookvie-dropbox`.
- `_bmad-output/implementation-artifacts/deferred-work.md`: this review's 10 deferrals; the content-hash entry resolved.

**Review findings.** 47 rows: 17 patched (7 medium, 10 low), 10 deferred, 20 rejected. Each row in the Review Triage Log above gives its reason.
- **Patched:**
  - the redirect `state` check and idle-socket timeout;
  - the placeholder-key refusal;
  - `--help` now loading the server's dependencies;
  - rate-limit retries capped, with `RateLimitError` mapped to `upload_incomplete`;
  - `requests` declared;
  - the cause assertion;
  - the non-object token answer;
  - three guide fixes;
  - tests for auth's failure paths, the local-time fallback, the dev-folder symlink, a partial prune and a rate limit.
- **Deferred:**
  - 7 spine-drift entries (AD-22's whole-file hash, the `DropboxApi` seam, a failed prune after verify, `{cause, message}` against AD-9, the redirect port, `requests` in Stack, the "planned" labels);
  - `CAUSES`' bookvie copy, in Story 13.3;
  - the real app key, before Story 13.4;
  - the `BadInputError` cause for a non-`invalid_grant` refresh (unverified).
- **Rejected, notably:** uploading an older daily deletes the oldest other copy. The AC and the ATDD pin exactly that.

**Follow-up review recommended: true.** First pass, 7 medium entries patched, 0 high. The unverified risk is the patched sign-in against a real browser and real Dropbox: the `state`-checked handler, the 10 s connection timeout under Chrome's preconnects, and the code exchange. Only fakes have exercised these, and nothing will until Oleg registers the app.

**Verification**
- `uv run ruff format --check .` and `uv run ruff check .`: clean.
- The spec's pytest command, before the patches: 152 passed, 0 skipped. `tests/test_dropbox_upload_edges.py`: 5 passed.
- `npm run check`: exit 0, run before the patches and again after them. The second run: `check:py` passed, 800 e2e passed, and smoke passed, including `bookvie-dropbox --help -> 0`.
- Diff read in full: the review diff since `72ee0d6ebd5ff61ac0e7f11055c41aec046d7ecc`, untracked files included.

**Residual risks**
- **Placeholder key:** `APP_KEY` is still the placeholder, so the Dropbox side can't be used until Oleg registers the app and commits the key (deferred item).
- **No real run yet:** neither sign-in nor upload has run against real Dropbox. Story 13.4's manual run is the first.
- **Copy left on a failed check:** a same-day re-upload whose answer doesn't verify leaves the new bytes in Dropbox under today's name (answered `upload_incomplete`, nothing deleted).
- **SDK warning:** the SDK's `datetime.utcnow()` raises a `DeprecationWarning` on Python 3.14.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
