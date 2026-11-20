# Epic 12 Context: Talk to bookvie from Claude Code

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let an AI agent in Claude Code read and update the bookvie library through MCP tools mounted inside the running app at `/mcp`, with nothing extra to start. A production server (port 8765) and a `--dev` server (port 8766, dev data folder) each expose their own tools against their own library, so an agent trying something out never writes to the real one. Through the tools an agent finds a Book without guessing, reads the library, records Readings and Card notes, adds and edits Books (with a cover bookvie downloads from a web address), and writes a dated backup to disk. It does all of this under the same rules as the UI, and it cannot delete or restore anything. The two bookvie skills (`bookvie-notes-summary`, `bookvie-new-book`) then move from HTTP calls onto the tools.

## Stories

- Story 12.1: Mount the MCP server
- Story 12.2: Let an agent read my library
- Story 12.3: Let an agent record my reading
- Story 12.4: Let an agent add and edit a Book
- Story 12.5: Let an agent fetch a Book's cover from its address
- Story 12.6: Let an agent back up my library to disk
- Story 12.7: Summarize a book's notes through the agent tools
- Story 12.8: Add a book through the agent tools

## Requirements & Constraints

- **Always on, local only:** the tools exist whenever bookvie runs, in both modes; when it isn't running they aren't available. Claude Code is the only supported client. No stdio transport, no subcommand, no auth beyond local trust, tools only (no MCP resources or prompts). A foreign `Origin` or `Host`, or a `Sec-Fetch-Site` other than `same-origin`/`none`, is refused with 403 exactly as `/api` refuses it; a loopback request with no `Origin` (what Claude Code sends) is served.
- **Same rules as the UI:** a write validates, refuses and commits exactly as its intent route does, with the same codes, messages and fields. A likely duplicate is refused until the agent sends `confirmDuplicate: true`.
- **No destructive tools:** `delete_book`, `delete_card_note`, `restore` and `set_spine_color` are never registered; calling one fails as an unknown tool. Tests assert the exact cumulative tool list.
- **Find, never guess:** every tool that names a Book takes its `bookId`; `find_book` returns candidates, never a pick.
- **No planning tools:** reading plans and reading order are prompts the agent answers from the read tools. Books have no topics, only titles, tags, purposes and Card notes.
- **Tool descriptions are the interface:** each registered description must equal, character for character, the text quoted in its story's ACs, and a test checks it. Changing a description means changing `epics.md` first.
- **Standard intent ACs** apply to the write tools: a filesystem fault gives `couldnt_save` with "Couldn't save. Your data wasn't changed." and leaves `library.json` byte-identical.
- **Epic gate:** P0 risks green (guard on `/mcp`; mounted in both modes, dev on the dev folder; same handler per write tool, errors included; no destructive tools; `find_book` candidates; the downloader's refusals against local fakes with no network; `export_backup` into a temporary `HOME`). Existing pytest and e2e pass unchanged. `npm run check` never touches `~/bookvie-data` or a real `~/bookvie-backups*` folder.

## Technical Decisions

- **Mount:** each `create_app` builds a fresh low-level SDK `Server` (not `MCPServer`, which coerces arguments and prefixes errors) served at exactly `/mcp` by a custom route (`http/app` `_McpRoute`): any other `/mcp…` path (`/mcp/mcp`, `/MCP`, `/mcp/x`) is 404, and there is no redirect to `/mcp/`. Registered before the SPA catch-all; `mcp` is a server prefix the catch-all never serves. Session manager in the app's lifespan; stateless with JSON responses, so a restart strands no session. Bodies capped at the intents' 1 MiB. The SDK's DNS-rebinding check is off, so the AD-16 guard is the only guard and refusals are 403, never 421.
- **Layout:** code lives in `backend/bookvie/agent/`; it imports `intents/` and `views/`, never `http/api`. Logic a tool needs that sits in a route moves into `views/` (or `intents/`) first and both share it. `views/` may import only `intents.contract` (for its errors). New modules: `views/find_book`, `intents/cover_fetch`, `intents/backup_file`; shared success mapping is in `intents/answers.py`.
- **Dependencies:** `mcp` and `httpx2` are pinned runtime deps; `httpx` stays dev-only. Look up SDK APIs in the pinned version, not from memory.
- **Naming:** a tool is the snake_case of its intent or view (`update-page` → `update_page`, `views/book` → `get_book`). Write-tool arguments are the intent's JSON body with the same camelCase keys.
- **One registration helper** (12.1) used by every tool: input schema generated from the model by alias, no extra properties, `null` omitted where the parser refuses it; the SDK neither validates nor coerces (`"212"` for an integer reaches the parser and is refused); `parse_*_intent` is the only validator for writes (read tools use `parse_view_arguments`); the body runs in one worker-thread call (handlers block on the AD-4 lock). Success: `OkResponse` (`ids`, `reachedLastPage`) or the view, by alias, as structured content plus identical JSON text; a no-op is a success. `IntentError`: `isError` with one text content holding the AD-9 `error` object (`kind`, `code`, `message`, `fields`, `duplicates`), no "Error executing tool" prefix. Any other exception: `couldnt_save`. No HTTP status crosses MCP.
- **Contract tests:** each write tool sends the same input through the tool and `POST /api/intents/<verb>` on two identical seeded libraries and compares stored `library.json` and the result or error. A shared pytest fixture gives an MCP client on a real app (with lifespan) on a temporary data folder.
- **`find_book`:** structured content is `{"books": [{id, title, subtitle, authors, edition, type, role}]}`; empty list when nothing matches; blank query is `invalid_fields` on `query`. Matches title, subtitle, authors, normalized ISBN (hyphens optional) and title initials ("DDIA").
- **Whole edits:** `edit_book` requires every form key (only `removeCover`, `confirmDuplicate`, `coverUrl` optional) and never merges with the stored Book; missing keys are refused as `invalid_fields` before parsing. `get_book` carries `editForm` (the Edit panel's 13 fields as strings, as the panel prefills them) that `edit_book` accepts back unchanged. A stale browser tab undoing an agent's edit is accepted.
- **Cover by URL** (order matters): take `coverUrl` out; run `parse_*_intent` with `has_cover` set (so `removeCover` + `coverUrl` is refused before download); `edit_book` checks the Book exists; download outside the AD-4 lock; call the handler with an ordinary `UploadedCover`. Rules: `https` on every hop, manual redirects (max 3); every resolved address on every hop must be global (IPv4-mapped, 6to4, NAT64, Teredo unwrapped first); connect to the checked address with TLS verified against the hostname; proxy env ignored; `Accept-Encoding: identity`; 30 s total deadline; 20 MB cap while streaming (`cover_too_large`); bytes sniffed for JPEG/PNG/WebP, `Content-Type` ignored. Every cover failure, decode included, is reported on `coverUrl` and nothing is saved. No host allow-list. Resolver and connection seams keep every test on the machine. This is bookvie's only outbound request. The full as-built rules (missing-key check first, `Content-Encoding`, length and empty-body refusals, `http.client` with `httpx2`'s TLS context) are in the spine's AD-21 Cover by URL.
- **Backup:** `export_backup` builds the same zip as `GET /api/export` under the AD-4 lock, releases it, then writes `bookvie-backup-YYYY-MM-DD.zip` (date from the injected `Clock`) atomically: unique temp file, fsync, rename over that day's file. Only then does it record `lastExportAt`, returning `{path, size, createdAt}` with an absolute path. Read failure `couldnt_export`, write failure `couldnt_save`; no partial file, `lastExportAt` unmoved. Folder follows the data folder, not the mode: `~/bookvie-backups` for `~/bookvie-data`, `~/bookvie-backups-dev` for `~/bookvie-data-dev`, sibling `<data folder>-backups` otherwise; `cli.py` resolves it and passes it to `create_app`. No flag, no retention. pytest sets a temporary `HOME` for every test; Playwright servers get one too.
- **Spine:** AD-21 was reconciled with the built code after the epic (Epic 12 retro item 82, 2026-11-20). Any new gap a story finds is logged as "spine drift" in `deferred-work.md`; don't edit the spine inside a story.

## Cross-Story Dependencies

- 12.1 comes first: mount, registration helper, shared MCP client fixture, and the recorded Claude Code reconnect step that the README and skills use.
- 12.2 → 12.3 → 12.4 → 12.5 build on each other; each extends the exact tool-list test. 12.5 adds `coverUrl` to 12.4's tools and appends "coverUrl is the https address of the front cover image; bookvie downloads it. If the download fails, nothing is saved: tell the user why." to both descriptions.
- 12.6 needs only 12.1.
- 12.7 needs 12.2; 12.8 needs 12.5 and deletes the skill's `add_book.py` and `check_catalog.py`, closing their `deferred-work.md` entry. Both skills keep their start step (check `/api/health`, start `bookvie`, then 12.1's reconnect step), make no `curl`/HTTP calls to `/api/views/*` or `/api/intents/*`, keep their outputs and rules, and are verified by Oleg in a real session against `--dev`.
