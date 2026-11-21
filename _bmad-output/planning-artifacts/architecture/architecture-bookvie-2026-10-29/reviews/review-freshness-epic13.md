# Freshness review: AD-22, the planned Stack rows, and AD-21's MCP 2026-07-28 sentence (Epic 13)

- **Date:** 2026-11-21
- **Scope:** the technical claims in `ARCHITECTURE-SPINE.md` AD-22, the Stack rows `dropbox 12.2.x` and `keyring 25.7.x` (planned), and AD-21 Mount's sentence "Claude Code 2.1.330 negotiates MCP 2026-07-28 with this mount (`server/discover`, checked 2026-11-21)". Each was checked against PyPI, the `dropbox` 12.2.5 and `keyring` 25.7.0 wheels, the installed `mcp` 2.3.0 and `mcp_types` 2.3.0 in `backend/.venv`, live probes, Claude Code's docs and its issue tracker.
- **Verdict:** the versions are current, the libraries resolve with the project's pins and do what AD-22 needs, and the Gate 2 mechanism works on the installed SDK over stateless JSON HTTP (probed). Three claims need fixing before Epic 13's stories: `files_move_v2` can't replace an existing file; the unattended `-p` run can't start bookvie and then use its tools; a non-UTC `client_modified` is refused. Four smaller points need a line or a decision.

## Method

- PyPI JSON API for `dropbox`, `keyring`, `stone`, `requests`.
- `uv pip compile` (dry run, scratchpad) of `backend/pyproject.toml`'s runtime pins plus `dropbox>=12.2,<12.3` and `keyring>=25.7,<25.8`, Python 3.14, macOS.
- Downloaded `dropbox-12.2.5-py3-none-any.whl` and `keyring-25.7.0-py3-none-any.whl` into the scratchpad and read `dropbox/base.py`, `dropbox/dropbox_client.py`, `dropbox/oauth.py`, `dropbox/content_hash.py`, `dropbox/files.py`.
- Import and behavior probes in a throwaway `uv run --isolated` env on CPython 3.14.7 (not the project env): content hash against a stdlib version, `CommitInfo(client_modified=...)` serialization, client construction with a refresh token and no secret, `keyring.get_keyring()`.
- Read `mcp/server/request_state.py`, `mcp/server/context.py`, `mcp/server/connection.py`, `mcp/server/runner.py`, `mcp/server/lowlevel/server.py`, `mcp/server/_streamable_http_modern.py`, `mcp_types/_types.py`, `mcp_types/methods.py` in `backend/.venv`.
- A live MRTR probe with the installed SDK (`backend/.venv`, `uv run --no-sync python -I`): a low-level `Server` whose `on_call_tool` returns `InputRequiredResult` with one form elicitation, served in-process and through `streamable_http_app(json_response=True, stateless_http=True)` on uvicorn, called by the SDK `Client` in `auto` and `legacy` modes.
- `launchctl print gui/<uid>/<label>` exit codes on this Mac; `man launchd.plist`, `man launchctl`.
- Claude Code docs: permissions, permission modes, headless, hooks, tools reference. Claude Code issues via `gh` (`anthropics/claude-code`). `claude --version` → 2.1.330.

## Findings

### 1. `dropbox` 12.2.x: current, imports on 3.14, resolves with the pins: CONFIRMED, with a note on the transitive tree

- Latest is **12.2.5** (2026-11-13); 12.2.1–12.2.5 shipped July–November 2026. `requires_python >=3.11`. The classifiers stop at **3.13** (no 3.14 classifier), but it imports and runs on CPython 3.14.7 (probe).
- Runtime deps: `requests>=2.16.2`, `stone>=3.5.3,<4`. `stone` 3.5.5 is imported at runtime (`from stone.backends.python_rsrc import stone_base`) and itself pulls **`Jinja2` and `packaging>=26.3`**. The dry-run resolve with FastAPI 0.162, Pydantic 2.14, mcp 2.3 and httpx2 2.16 succeeds and adds: `dropbox 12.2.5`, `stone 3.5.5`, `requests 2.34.2`, `urllib3 2.8.0`, `charset-normalizer 3.5.2`, `jinja2 3.1.6`, `markupsafe 3.0.4`, `packaging 26.3`, plus keyring's `keyring 25.7.0`, `jaraco-classes`, `jaraco-context`, `jaraco-functools`, `more-itertools`. `certifi` and `idna` were already in the tree. No pin moved. That's 13 new runtime packages in the one wheel that also ships bookvie; worth a sentence in the story, since `bookvie` itself never imports them (AD-22's layer rule).
- `dropbox_client.py` and `oauth.py` call `datetime.utcnow()`, deprecated since 3.12, so refreshes emit a `DeprecationWarning` on 3.14. Harmless unless pytest is ever run with `-W error` (it isn't; `[tool.pytest.ini_options]` has no `filterwarnings`), and AD-22's tests use a fake `DropboxApi` anyway.
- Packaging note (not a freshness issue): `[tool.hatch.build.targets.wheel] packages = ["bookvie"]` will need `bookvie_dropbox` added for "shipped in the same wheel", and `[project.scripts]` the second console script.
- Sources: https://pypi.org/project/dropbox/12.2.5/ , https://pypi.org/pypi/dropbox/json , https://pypi.org/pypi/stone/json ; wheel `dropbox/_version.py`, `dropbox/account.py` lines 7–8.

### 2. PKCE with a refresh token and no app secret: CONFIRMED; the loopback redirect needs a fixed, registered port

- `DropboxOAuth2Flow(consumer_key, redirect_uri, session, csrf_token_session_key, consumer_secret=None, ..., token_access_type=None, use_pkce=False, ...)`; the base refuses only when neither `use_pkce` nor a secret is given. `token_access_type="offline"` returns a refresh token.
- `Dropbox(oauth2_refresh_token=..., app_key=...)` constructs with no secret (probe), and `refresh_access_token` sends `client_secret` only when one is set; `check_and_refresh_access_token` refreshes when the token is missing or close to expiry. So "the SDK refreshes access tokens" holds.
- **Loopback redirect:** Dropbox requires the redirect URI to match a URI registered in the App Console exactly, port and host string included (`localhost` and `127.0.0.1` are different URIs); it has no RFC 8252 any-port loopback. `bookvie-dropbox auth` therefore needs a fixed port (or a few registered ones), and the guide has to say which URI to register. Alternative: `DropboxOAuth2FlowNoRedirect` (user pastes the code).
- Sources: wheel `dropbox/oauth.py` lines 131–166, 287–387; `dropbox/dropbox_client.py` lines 166–224, 444–500; https://www.dropboxforum.com/discussions/101000014/redirect-uri-with-variable-loopback-port/197621 , https://www.dropboxforum.com/t5/API-support/How-do-I-set-the-Redirect-URI-port-number/m-p/243556 (forum, 2016–2024; the official docs page wasn't fetched).

### 3. Upload session, `content_hash`, `client_modified`: CONFIRMED, with one refusal to plan for

- `files_upload_session_start(f, close=False, session_type=None, content_hash=None)`, `files_upload_session_append_v2(f, cursor, close=False, content_hash=None)`, `files_upload_session_finish(f, cursor, commit, content_hash=None)` all exist. The per-call `content_hash` covers only that call's bytes ("a hash of the file content uploaded in this call"), so the whole-file check AD-22 describes (compare the returned `FileMetadata.content_hash` and `size` with the local file) is still needed, and it's right.
- `CommitInfo(path, mode, autorename, client_modified, mute, property_groups, strict_conflict)` takes `client_modified`. **A timezone-aware datetime that isn't UTC is refused**: `stone` raises `ValidationError: timestamp should have either a UTC timezone or none set at all` (probe). A naive one is sent as UTC with a `Z`. AD-22 says the backup time is the zip entry's time, which is **local**, so `upload_backup` must convert it to UTC first. It's also second-granularity.
- Sources: wheel `dropbox/base.py` lines 3370, 3456, 3605; `dropbox/files.py` `CommitInfo`; scratchpad probe `ts.py`.

### 4. `files_move_v2` "replacing that day's copy": WRONG as stated

- `files_move_v2(from_path, to_path, allow_shared_folder=False, autorename=False, allow_ownership_transfer=False)` has **no write mode**. Moving onto an existing path fails with `RelocationError` `to/conflict` (or, with `autorename=True`, makes `bookvie-backup-2026-11-21 (1).zip`, which breaks the name pattern). A second upload on the same day, after the library changed, would fail at the move every time and report `upload_incomplete`.
- Two ways to keep D2's "a half-finished overwrite must not cost a copy":
  - **(a)** Finish the session straight to the final name with `CommitInfo(mode=WriteMode.overwrite, client_modified=...)` and pass the whole-file hash as `files_upload_session_finish`'s `content_hash`. Dropbox commits only when the bytes match, and the commit is atomic on Dropbox's side. Then check the returned metadata as now. This drops the temporary name.
  - **(b)** Keep the temporary name. Then, when the final name exists, `files_delete_v2` it (or move it aside to a second temporary name) before `files_move_v2`. A failure between the two steps costs that day's old copy, though the previous days' copies survive.
- Suggested spine fix for (a): "It uploads through a chunked upload session and commits to the final name with overwrite mode, passing the file's content hash so Dropbox refuses a mismatch; it then checks the returned `size` and `content_hash`." Drop "temporary name" and "move".
- Source: wheel `dropbox/base.py` lines 2613–2655 (`files_move_v2`), `RelocationArg`.

### 5. The Dropbox content hash: CONFIRMED

- The SDK's own `dropbox/content_hash.py` (`DropboxContentHasher`, adapted from `dropbox-api-content-hasher`) uses `BLOCK_SIZE = 4 * 1024 * 1024`, SHA-256 per block, then SHA-256 over the concatenated block digests, hex-encoded. A stdlib version written from the spine's sentence matched it on a 9 MiB + 123 byte random file, and on an empty file both give `sha256(b"")` = `e3b0c442…b855` (probe). Pin the empty-file case in the copied-contract test.
- Note: `bookvie_dropbox` could use the SDK's hasher, but bookvie can't import `dropbox` (AD-22), so the stdlib copy on the bookvie side is still needed and the comparison test is the right guard.
- Sources: wheel `dropbox/content_hash.py`; https://www.dropbox.com/developers/reference/content-hash (cited by the module).

### 6. App-folder path wording: MINOR

- With App-folder access, API paths are relative to the app folder: the API path is `/.backups/...`, not `/Apps/bookvie/.backups/...`. `/Apps/bookvie/` is where the user sees it, and the folder is named after the app (and can be localized or renamed). Suggest: "the backups live in `/.backups/` of the app folder (shown to the user as `Apps/bookvie/.backups/`)". Otherwise an implementer may put `/Apps/bookvie` into API paths.

### 7. `keyring` 25.7.x and the macOS Keychain from a `uv tool install`ed script: version CONFIRMED; unattended access is a RISK to name

- Latest is **25.7.0** (2025-11-16); nothing newer. `requires_python >=3.9`; on macOS it has no platform deps beyond `jaraco.*`. On CPython 3.14.7 `keyring.get_keyring()` returns `keyring.backends.macOS.Keyring (priority: 5)` (probe), so the backend loads from a plain venv, which is what `uv tool install` makes.
- **Risk:** a Keychain item's access list records the binary that created it. The `uv tool` venv's `python` is a symlink to a uv-managed CPython under a versioned path. After a Python patch upgrade or a tool reinstall onto a new interpreter, macOS sees a different binary and shows an "allow access" dialog. In the 09:00 launchd run nobody answers it, so the stdio server blocks until Claude Code's MCP timeout. This is documented user experience in keyring's and pgAdmin's trackers, not Dropbox- or uv-specific; that it applies to `uv tool upgrade` is an inference.
- Suggested spine/guide line: a Keychain read that fails or is denied is cause `dropbox_signin` (so the Failing line names `bookvie-dropbox auth`), and the guide says to re-run `auth` (or choose "Always Allow") after upgrading Python or reinstalling the tool.
- Sources: https://pypi.org/project/keyring/25.7.0/ ; https://github.com/jaraco/keyring/issues/619 ; https://github.com/pgadmin-org/pgadmin4/issues/7076 ; https://developer.apple.com/forums/thread/734689

### 8. MCP 2026-07-28 Gate 2 on the installed SDK: CONFIRMED by a live probe, with three implementation notes

- `mcp_types.InputRequiredResult(result_type="input_required", input_requests: dict | None, request_state: str | None)`, which needs at least one of them. `CallToolRequestParams` carries `input_responses` and `request_state`. The low-level `Server`'s `on_call_tool` is typed `Awaitable[CallToolResult | InputRequiredResult]` (`mcp/server/lowlevel/server.py` line 153).
- **The handler learns the protocol and the capability** from its `ServerRequestContext`: `ctx.protocol_version` (a string) and `ctx.session.client_capabilities` (on 2026-07-28 it's filled from the request's `_meta["io.modelcontextprotocol/clientCapabilities"]`; the SDK docstring says to prefer it over `client_params`, which is absent without `initialize`).
- **Probe result:** over in-process and over `streamable_http_app(json_response=True, stateless_http=True)` + uvicorn, the SDK client in `auto` mode negotiated `2026-07-28`. The first call got `InputRequiredResult`, the elicitation callback ran, and the retry reached the handler with `request_state='SEALED-BY-BOOKVIE'` byte for byte and `input_responses={'confirm': ElicitResult(action='accept', content={})}`. The handler saw `ElicitationCapability(form=..., url=...)`. So "works over stateless streamable HTTP with JSON responses" is confirmed.
- **Note A, legacy connections:** returning `InputRequiredResult` on a `2025-11-25` connection is **not** turned into anything useful. The runner's result sieve rejects it ("Handler returned an invalid result", a JSON-RPC error; probe in `legacy` mode). AD-22's `unsupported` reason is right, but the handler must check `ctx.protocol_version` itself and return the 409 refusal **before** it builds an `InputRequiredResult`. Suggest adding "checked before the question is built" to the `unsupported` bullet.
- **Note B, form capability:** `Connection.check_capability(ClientCapabilities(elicitation=...))` checks only that `elicitation` is present, not `form`. "A client without form elicitation" should be tested as `elicitation.form is not None`, or (spec back-compat) an empty `elicitation: {}`, which means form only.
- **Note C, the SDK's own `requestState` sealing:** 2.3.0 ships `mcp.server.request_state.RequestStateBoundary` with `RequestStateSecurity.ephemeral()`: AES-256-GCM, a TTL, and binding to the tool name and an argument digest. `MCPServer` installs it by default; the low-level `Server` does **not** (its `middleware` is `[OpenTelemetryMiddleware()]`), so on bookvie's server the handler sees the raw string, and the spine's own HMAC seal is the only one (probe). Keeping it hand-rolled is defensible: the boundary refuses a bad or expired seal as JSON-RPC `-32602 "Invalid or expired requestState"`, which would erase AD-22's `expired` and `changed` reasons and the 409 contract. Suggest the spine say so in a clause ("not the SDK's `RequestStateBoundary`, whose refusals are protocol errors"), so nobody appends it to `server.middleware` and double-seals.
- Sources: `backend/.venv/.../mcp/server/request_state.py` (module docstring, `RequestStateSecurity.ephemeral`, `RequestStateBoundary`), `mcp/server/context.py` lines 31–49, `mcp/server/session.py` lines 65–75, `mcp/server/connection.py` lines 452–476, `mcp/server/runner.py` lines 341–385, `mcp_types/_types.py` lines 310–328 and 2074–2097; scratchpad probe `mrtr.py`.

### 9. Claude Code 2.1.330 and form elicitation: AD-21's sentence CONSISTENT; the full round trip in Claude Code is not yet shown

- `claude --version` here is 2.1.330. The author's capture (`server/discover` at 2026-07-28 with `elicitation: {form:{}, url:{}}`, fallback to `initialize` 2025-11-25) matches the tracker: **#88075** (Claude Code 2.1.237 sent `elicitation: {}`, so URL mode was never usable; closed 2026-10-12) affected **URL mode only**, and its fix is the `{form, url}` advertisement captured.
- Open issues that do affect **form** mode, all outside the terminal CLI:
  - **#98256** (open): the VS Code extension declares elicitation and auto-declines every request (logged as "print mode").
  - **#105334** (open): the desktop app's Code tab declines in about 0.5 s with no dialog; the terminal CLI shows it.
  - **#94806** (open): Cowork drops MRTR elicitation through the print-mode branch and the call hangs 180 s.
  - **#88901** (open): embedded Claude Code (Desktop/Cowork) never renders it.
  - Fixed in the TUI: **#62319** (form auto-declined as "print mode", closed 2026-08-16) and **#85442** (remote HTTP form elicitation lost, closed 2026-10-04).
- Effect on AD-22: fail-closed holds (a decline is `declined`, nothing changes), but in VS Code or the desktop app the user sees "declined" for a question they never saw. The plan's guide already says "run the skill in the terminal CLI". The spine's "Claude Code is the only supported client" should read "the Claude Code terminal CLI", at least for `restore_backup`.
- The capture shows the handshake, not an `InputRequiredResult` round trip in Claude Code. The Story's own probe (plan line 128) should record one accept and one decline through the real CLI against a 2026-07-28 mount.
- Sources: https://github.com/anthropics/claude-code/issues/88075 , /98256 , /105334 , /94806 , /88901 , /62319 , /85442

### 10. Gate 1, the `ask` rule in user settings: CONFIRMED

- "Rules are evaluated in order: deny, then ask, then allow… a matching ask rule prompts even when a more specific allow rule also matches", and deny and ask from any scope are evaluated before allow from any scope. Ask rules are among the "actions no mode auto-approves", including `bypassPermissions` and auto mode. PreToolUse hooks can't skip them. Exception: a mod's `tool.check` approval can skip an ask prompt in some setups (managed settings, org login); not bookvie's setup, but the guide's "how to check it's active" could mention `/permissions`.
- MCP rule names: `mcp__bookvie__restore_backup` and `mcp__bookvie-dev__restore_backup` are the right form. As deny or ask rules, a server-prefix name also covers longer server names, so the per-tool form is the right choice.
- Sources: https://code.claude.com/docs/en/permissions (Manage permissions, Settings precedence, Precedence among rules, hooks, and mods, MCP), https://code.claude.com/docs/en/permission-modes (Actions no mode auto-approves)

### 11. Elicitation hooks: CONFIRMED

- `Elicitation` ("When an MCP server requests user input during a tool call") and `ElicitationResult` (before the response goes back) exist and match on the server name. Exit 2 declines; `hookSpecificOutput` on exit 0 can answer. AD-22's "a hook that answers for the user is the user's own configuration" is accurate. The docs don't say whether they fire for MRTR `inputRequests`. In `-p` with `--permission-prompts none`, an elicitation no hook answers is cancelled.
- Sources: https://code.claude.com/docs/en/hooks , https://code.claude.com/docs/en/headless (Turn off permission prompts in unattended runs)

### 12. launchd, `launchctl print`, `claude -p "/skill"`: CONFIRMED, but the unattended run has a gap AD-22 doesn't cover

- `man launchd.plist`: "Unlike cron which skips job invocations when the computer is asleep, launchd will start the job the next time the computer wakes up. If multiple intervals transpire… coalesced into one event." That's **sleep only**: a Mac that's shut down or logged out at 09:00 doesn't run it at boot or login. The 26-hour Stalled rule covers that. Worth a word in the guide.
- `launchctl print gui/<uid>/<label>`: exit 0 for a loaded service, **113** for a missing one (probed). `man launchctl` warns the *output* "is NOT API", so the probe should use only the exit status, as AD-22's "any error reads as not installed" implies. Install should use `launchctl bootstrap gui/<uid> <plist>` / `bootout`; the spine's "load or unload" reads as the legacy `load`/`unload` subcommands.
- `claude -p "/bookvie-backup"`: "User-invoked skills and custom commands work. Include `/skill-name` in the prompt string and Claude Code expands it before running." `--allowedTools` uses permission-rule syntax; in a Manual-mode `-p` run (the default since 2.1.302) anything needing approval that isn't allowed is denied, which is what keeps the run narrow. `--disallowedTools` with bare MCP tool names removes them.
- **Gap, starting bookvie in the `-p` run (HIGH):** AD-22 says the skill "starts bookvie when it isn't running". The other skills do that with `run_in_background` and, when the tools aren't there because bookvie started after the session, tell the user to reconnect from `/mcp` (`bookvie-new-book/SKILL.md` lines 43, 67). Neither works unattended:
  - MCP servers connect at session start. A `-p` run that started bookvie itself has no one to run `/mcp` reconnect, so `mcp__bookvie__export_backup` may simply be missing. (The docs describe lazy connect only for a remote server with a cached tool list, which isn't guaranteed.)
  - "While a command that the main conversation started is still running, a run… with the `-p` flag stays open after its result until that command exits or reaches its time limit", which is 10 minutes in a text-prompt `-p` run. Then Claude Code stops it. So every run that starts bookvie idles 10 minutes and then kills the server.
  - `--allowedTools` must also list the Bash commands the start and the `curl` probe use, not only the MCP tools ("listing exactly the skill's tools").

  Suggested fix: the launchd job starts bookvie itself, before `claude`. For example, the plist runs `bookvie autobackup run`, which starts `bookvie --no-browser` when `/api/health` doesn't answer, waits for health, runs `claude -p`, and stops only a server it started. Or the job is skipped (reported as failed or stalled) when bookvie isn't running. The skill then never starts bookvie in `-p`.
- **PATH:** launchd's default `PATH` is `/usr/bin:/bin:/usr/sbin:/sbin`. The absolute `claude` path is resolved, but the stdio entry `bookvie-dropbox serve` (and `bookvie`, if anything starts it) live in `~/.local/bin`. The plan's troubleshooting mentions "`uv` not found", but the spine should pin either an absolute command in the MCP entry or `EnvironmentVariables.PATH` in the plist, and the plist test should check it.
- Sources: `man launchd.plist` (StartCalendarInterval), `man launchctl` (print, bootstrap); https://code.claude.com/docs/en/headless (Basic usage, Background tasks at exit, Auto-approve tools, the note on skills in `-p`), https://code.claude.com/docs/en/tools-reference (Time limit for background commands); `.claude/skills/bookvie-new-book/SKILL.md`.

## Summary of suggested spine edits

| # | Severity | Edit |
|---|---|---|
| 4 | High | Replace "temporary name … move to its final name, replacing that day's copy" with a commit to the final name in overwrite mode, with the whole-file `content_hash`, then the metadata check (or spell out the delete-before-move). |
| 12 | High | The launchd job, not the `-p` skill, ensures bookvie is running before `claude` starts; the skill doesn't start bookvie in `-p`. Pin `PATH` (or absolute commands) for the stdio server. |
| 3 | Medium | `client_modified` is the backup time converted to UTC. |
| 7 | Medium | A Keychain read that fails or is denied is `dropbox_signin`; the guide covers re-running `auth` after a Python or tool upgrade. |
| 8 | Medium | `unsupported` is decided from `ctx.protocol_version` and `client_capabilities.elicitation.form` before an `InputRequiredResult` is built; the HMAC seal is bookvie's, not the SDK's `RequestStateBoundary`. |
| 9 | Low | "Claude Code" → "the Claude Code terminal CLI" for Gate 2; the story records a real accept/decline round trip. |
| 2, 6, 12 | Low | Fixed registered loopback port; API path `/.backups/`; `bootstrap`/`bootout`; the probe uses the exit status only; launchd catches up after sleep, not shutdown. |
| 1 | Info | Note the 13 new runtime packages (incl. `stone` → `Jinja2`, `packaging`); add `bookvie_dropbox` to the wheel's `packages`. |
