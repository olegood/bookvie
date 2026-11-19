# Epic 12 Context: Talk to bookvie from Claude Code

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let an AI agent in Claude Code read and update the bookvie library through MCP tools mounted inside the running app at `/mcp`, with nothing extra to start. A production server and a `--dev` server each expose their own tools against their own library, so an agent trying something out never writes to the real one. Through the tools an agent finds a Book without guessing, reads the library, records Readings and Card notes, adds and edits Books (with a cover bookvie downloads from a web address), and writes a dated backup to disk. It does all of this under the same rules as the UI, and it cannot delete or restore anything. The two bookvie skills (`bookvie-notes-summary`, `bookvie-new-book`) then move from HTTP calls onto the tools.

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

- **Always on:** the tools are available whenever bookvie runs, in production (port 8765) and `--dev` (port 8766, dev data folder). When bookvie isn't running, the tools aren't available. Claude Code is the only supported client. There is no stdio transport, no subcommand, no auth beyond local trust, and the server exposes tools only (no MCP resources or prompts).
- **Local only:** a request with a foreign `Origin` or `Host`, or a bad `Sec-Fetch-Site`, is refused with 403, as `/api` refuses it. A loopback request with no `Origin` (what Claude Code sends) is served.
- **Same rules as the UI:** a write is validated, refused and committed exactly as its intent route does it, with the same codes, messages and fields. A likely duplicate is refused until the agent sends `confirmDuplicate: true` explicitly.
- **No destructive tools:** `delete-book`, `delete-card-note`, `restore` and `set-spine-color` are never registered. Calling one fails as an unknown tool.
- **Find, never guess:** every tool that names a Book takes its `bookId`, and `find_book` returns candidates rather than picking one.
- **No planning tools:** "what to read for X", reading plans and reading order are prompts the agent answers from the read tools. Books have no topics, only titles, tags, purposes and Card notes.
- **Tool descriptions are the interface:** each tool's registered description must equal, character for character, the text quoted in its story's ACs, and a test checks it. To change a description, change `epics.md` first.
- **Standard intent ACs (TR8)** apply to the write tools too: a filesystem fault gives `couldnt_save` with "Couldn't save. Your data wasn't changed." and leaves `library.json` byte-identical.
- **Epic gate:** the plan's P0 risks are green (guard on `/mcp`; mounted in both modes; same handler per write tool, errors included; no destructive tools; `find_book` candidates; the downloader's refusals against local fakes; `export_backup` into a temporary `HOME`). Existing pytest and e2e tests pass unchanged. `npm run check` never touches `~/bookvie-data` or a real `~/bookvie-backups*` folder.

## Technical Decisions

- **Mount:** each call to `create_app` builds a fresh SDK `MCPServer` and mounts its streamable-HTTP app at exactly `/mcp`: no `/mcp/mcp`, no redirect to `/mcp/`. It is registered before the SPA catch-all, and `mcp` joins the server prefixes the catch-all never serves. The session manager runs in the app's lifespan. The server is stateless with JSON responses, so a restart never strands a session. Bodies are capped at the intents' 1 MB. The SDK's own DNS-rebinding check is off (`enable_dns_rebinding_protection=False`), so the AD-16 guard is the only guard and every refusal is its 403 (never a 421).
- **Code location:** the code lives in the `backend/bookvie/agent/` package, named so it isn't confused with the SDK's `mcp`. `agent/` never imports `http/api`. Logic a tool needs that now sits in a route (the stats range parsing, a view's not-found refusal) moves into `views/` first, and the route and the tool then share it. New modules: `views/find_book`, `intents/cover_fetch` and `intents/backup_file`.
- **Dependencies:** `mcp` (2.3.x) and `httpx2` (2.16.x) become runtime dependencies, pinned in 12.1 after checking PyPI that day. Look up the SDK's mount API then, not from memory. `httpx` stays dev-only.
- **One registration helper** (built in 12.1, used by every tool):
  - The input schema is generated from the intent or argument model by alias. It allows no extra properties and leaves `null` out where the parser refuses it.
  - The SDK neither validates nor coerces arguments: a `"212"` sent for an integer reaches the parser as a string and is refused. The route's `parse_*_intent` is the only validator.
  - The whole body runs in one worker-thread call, because handlers block on the AD-4 lock.
  - Success returns the `OkResponse` (`ids`, `reachedLastPage`), or the view, by alias as structured content, with the same JSON as text. A no-op is still a success.
  - An `IntentError` returns `isError` with one text content: the AD-9 `error` object as JSON (`kind`, `code`, `message`, `fields`, `duplicates`), with no "Error executing tool" prefix.
  - Any other exception returns `couldnt_save`. No HTTP status crosses MCP.
- **Write tools:** a tool's arguments are its intent's JSON body, with the same camelCase keys. A parametrized contract test sends the same input through the tool and through `POST /api/intents/<verb>` on two identical seeded libraries and compares the stored `library.json` and the result or error.
- **Whole edits:** `edit_book` requires every form key; only `removeCover`, `confirmDuplicate` and `coverUrl` are optional. It never merges with the stored Book. A stale browser tab can undo an agent's edit, and that is accepted.
- **`find_book`:** matches the query against title, subtitle, authors, the normalized ISBN (with or without hyphens) and the initials of the title's words ("DDIA"). It returns `[{id, title, subtitle, authors, edition, type, role}]`: empty when nothing matches, and `invalid_fields` on `query` when the query is empty. Ranking and the number of candidates are for 12.2 to decide.
- **Cover by URL:** the steps run in this order:
  1. Take `coverUrl` out of the arguments.
  2. Run `parse_*_intent` with `has_cover` set, so `removeCover` with a `coverUrl` is refused before any download.
  3. For `edit_book`, check that the Book exists.
  4. Download the cover, outside the AD-4 lock.
  5. Call the handler with an ordinary `UploadedCover`.

  The download rules:
  - `https` on every hop, with redirects followed by hand (at most 3).
  - Every address the host resolves to, on every hop, must be global. IPv4-mapped, 6to4, NAT64 and Teredo addresses are unwrapped first.
  - The connection goes to the address that was checked, with TLS verified against the hostname.
  - Proxy environment variables are ignored, and requests send `Accept-Encoding: identity`.
  - The whole download has a 30-second deadline, and the body is capped at 20 MB while streaming.
  - The bytes are sniffed for JPEG, PNG or WebP, and `Content-Type` is ignored.

  A body over 20 MB is `cover_too_large`, and any other download failure is `invalid_fields`. Every cover failure, including a decode refusal, is reported on `coverUrl`, and nothing is saved. There is no host allow-list. The resolver and connection seams mean no test opens a connection off the machine. This download is bookvie's only outbound request.
- **Backup:**
  - `export_backup` builds the same zip as `GET /api/export` under the AD-4 lock, then releases the lock.
  - It writes `bookvie-backup-YYYY-MM-DD.zip` atomically, with the date from the injected `Clock`: a unique temp file, fsync, then a rename that replaces that day's file.
  - Only after the rename does it record `lastExportAt`. It then returns `{path, size, createdAt}` with an absolute path.
  - A read failure is `couldnt_export` and a write failure is `couldnt_save`. Either way, no partial file is left and `lastExportAt` doesn't move.
  - The folder follows the data folder, not the mode: `~/bookvie-backups` for `~/bookvie-data`, `~/bookvie-backups-dev` for `~/bookvie-data-dev`, and a sibling `<data folder>-backups` for any other folder. `cli.py` resolves it and passes it into `create_app`. There is no flag and no retention.
  - pytest sets `HOME` to a temporary folder for every test, and Playwright's servers get a temporary `HOME` too.

## Cross-Story Dependencies

- 12.1 comes first. It builds the mount, the registration helper and the shared pytest fixture (an MCP client against a real app with its lifespan, on a temporary data folder) that every later story's tests use. It also records how Claude Code behaves when `/mcp` comes up after a session has started, and the reconnect step the skills and the README use.
- 12.2 → 12.3 → 12.4 → 12.5 build on each other. Each story's tool-list test asserts the exact cumulative list, so a later story extends it. 12.5 adds `coverUrl` to 12.4's tools and appends a sentence to both descriptions.
- 12.6 needs only 12.1.
- 12.7 needs 12.2. 12.8 needs 12.5 and deletes `add_book.py` and `check_catalog.py`, which closes their `deferred-work.md` entry. Both skills keep their start step (check `/api/health`, start `bookvie`, then 12.1's reconnect step) and keep their outputs and rules unchanged. Oleg verifies each in a real session against `--dev`.
