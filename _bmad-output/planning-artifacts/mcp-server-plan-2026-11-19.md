---
title: bookvie MCP server — plan
status: agreed
created: 2026-11-19
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: docs/ideas.md → "bookvie MCP server"
---

# bookvie MCP server — plan

Expose bookvie to Claude Code as an MCP server, so an agent can read the library and update reading progress without a script: "I'm on page 212 of DDIA", "which books can I finish on topic X in two months?", "what order should I read X, Y and Z in?". The server is mounted inside the running app, so starting `bookvie` starts it. Destructive operations stay out. The two bookvie skills move onto it in the same epic.

## 1. What already exists

- **One server per data folder.** AD-5: `bookvie.lock` (exclusive-create) in the data folder, so a second process can't open the Store. A stdio MCP server that Claude Code launches would be that second process. That's why the MCP goes inside the running server (D1).
- **Mutations arrive only as intents** (AD-3): `POST /api/intents/*` in `backend/bookvie/http/api.py`, each a thin route that parses its form and calls a handler. For example `update_page_intent` (`api.py:558`) calls `parse_update_page_intent` and then `update_page(store, clock, parsed)`. Intents today: add-book, edit-book, delete-book, set-spine-color, start-reading, edit-purpose, update-page, finish-reading, pause, set-up-next, add-card-note, edit-card-note, delete-card-note, mark-side-read, unmark-side-read, restore.
- **Typed views** (AD-6, AD-8): `GET /api/views/{home,catalog,book,card-notes,stats,backup,app-info}`. `BookDetailView` already carries `pages_left` and `measured_pace`, and `ShelfBook` carries `tags`, `role`, `current_page` and `percent`. So the time-boxed reading plan needs no new domain code.
- **There are no "topics".** A Book has a title, subtitle, authors, publisher, year, tags, a reading purpose and card notes. It has no description or table of contents. An agent picking "books for skill X" matches titles and tags and fills in from its own knowledge of the books (Mary). That's accepted, not a gap to fill in this epic.
- **The Host/Origin guard** (AD-16, `HostOriginGuard` in `http/app.py`) rejects a foreign Host and any foreign Origin on every request.
- **`--dev`** runs on port `8766` against `~/bookvie-data-dev` and refuses `~/bookvie-data` (Epic 11, AD-16).
- **Export** (`GET /api/export`, with the `X-Bookvie-Export: 1` header) returns a zip of `library.json` and `covers/`. The Backup page's "Last export" is `lastExportAt` in `local-state.json` (AD-15, `store/local_state.py`).
- **The backend makes no outbound requests today.** `httpx` is only a dev dependency (tests). Downloading covers (D7) adds the first one.
- **The skills** `bookvie-new-book` and `bookvie-notes-summary` (`.claude/skills/`) `curl /api/health`, start `bookvie` when it isn't running, and call the HTTP API. `bookvie-new-book` downloads the cover itself and posts it as a multipart form (`scripts/add_book.py`, up to 20 MB).

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **The MCP server is mounted in the running app at `/mcp`**, as a streamable-HTTP sub-app of the Python MCP SDK, with its session manager wired into the app's lifespan. No stdio shim, no `bookvie mcp` subcommand. It's on whenever the app is. | Oleg's call (Winston's option b). One process, one lock, nothing extra to start. |
| D2 | **`/mcp` sits behind `HostOriginGuard`.** A request with a foreign Origin or Host is refused, like any other route. | Murat. The MCP spec asks local HTTP servers to check Origin, because of DNS rebinding. The guard already does it. |
| D3 | **Claude Code is the only supported client.** The README gives the two setup lines: `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp` and `claude mcp add --transport http --scope user bookvie-dev http://127.0.0.1:8766/mcp` (`--scope user`, because the default scope loads the server in one project only). | Oleg's call. Claude Desktop and other clients are out of scope. |
| D4 | **On in `--dev` too**, on `8766` against the dev data folder. It's a separate `bookvie-dev` entry in Claude Code. | Amelia. An agent trying out a skill must not write to the real library. |
| D5 | **Tools run in-process and call the same handlers as the intent routes**: the same parse function, the same domain call, the same error codes. They never call the app over loopback HTTP. Each write tool has a contract test that sends the same input through the tool and through the route and asserts the same outcome and errors. | Winston, Murat. An MCP write that validates differently from its intent is a second set of domain rules (AD-3). |
| D6 | **No destructive tools.** `delete-book` and `restore` are never exposed through MCP. `delete-card-note` is left out too. Delete stays in the UI, behind its confirm dialog. | Oleg's call (Sally). An agent "cleaning up duplicates" mustn't remove an edition. |
| D7 | **`add_book` and `edit_book` take a `cover_url`, and the server downloads the cover.** A cover never passes through tool arguments as base64. | Oleg's call. Tool arguments are text the model writes, so a 20 MB image can't go there (Amelia). Beat Mary's split (MCP for metadata, the HTTP form for the cover) and a `cover_path` the server reads from disk. |
| D8 | **The cover downloader's rules:** `https` only. Resolve the host and refuse loopback, private, link-local and cloud-metadata addresses, **again after every redirect**, with a small redirect limit. Connect and read timeouts. A **20 MB cap enforced while streaming**. **Sniff the bytes** for JPEG, PNG or WebP and ignore `Content-Type`. Then the same image path the form's upload takes. | Murat. A 302 to `127.0.0.1:8765/api/intents/restore` must stay unreachable. Amazon often sends `binary/octet-stream`. |
| D9 | **No host allow-list** for covers. | Oleg's call (Amelia over Winston): an allow-list breaks the day a publisher moves its images, and D8 already blocks the internal addresses. |
| D10 | **`export_backup` writes a dated zip to disk and returns its path**: `~/bookvie-backups/bookvie-backup-YYYY-MM-DD.zip` (`~/bookvie-backups-dev/` with `--dev`; any other data folder gets a sibling `<data folder>-backups/`, so a scratch server never replaces a real backup: spine AD-21). It returns `{path, size, createdAt}`. It updates `lastExportAt` like the Backup page's export does. | Oleg's call: backup stays available for the future Dropbox upload. Mary: the zip can't go back through the tool result either. Murat: "Last export" must not say "never" while backups exist. Amelia: dev zips stay apart from real ones. |
| D11 | **The backup folder is fixed** for now. Choosing a folder, retention (keep the last N), "skip when nothing changed" and the upload itself belong to the "Daily backup to Dropbox" idea. A second export on the same day replaces that day's file. | Oleg's call (John: keep the epic small). |
| D12 | **`find_book` returns candidates, never a guess.** It matches a free-text query ("DDIA", an author, part of a title) and returns a short ranked list of `{id, title, subtitle, authors, edition, type, role}`. Every tool that takes a Book takes its **id**. | Sally. Logging a page on the wrong edition is the failure to design out. |
| D13 | **Tool descriptions are the interface.** Each story's acceptance criteria state what its tools' descriptions promise. For example `update_page`: "Use the Book's id from `find_book`; never guess a Book from its title." Errors come back as the intent's error code and message, for example `book_not_found` or `invalid_fields` with the fields. | Sally. |
| D14 | **No planning tools.** "Reading list for skill X", "what can I read in two months" and "reading order" are prompts, not tools. The read tools give the agent what it needs: tags, purposes, card notes, pages left and measured pace. | John. |
| D15 | **The skills keep their start step**: check `/api/health` and start `bookvie` when it isn't running, before using the MCP tools. When the app isn't running, Claude Code shows the MCP server as failed. | John. |
| D16 | **Pin the `mcp` SDK in Story 12.1** to the version current when the story runs, and look up its streamable-HTTP mount API then, not from memory. Any HTTP client the downloader needs (`httpx2`, which `mcp` 2.x already depends on: spine Stack) becomes a runtime dependency, pinned like the others. | Murat. |

Out of scope: Claude Desktop and other clients, a stdio transport, authentication beyond the local-trust guard, MCP resources and prompts (tools only), planning tools (D14), destructive tools (D6), backup retention and upload (D11).

## 3. Tools

| Tool | Story | Backed by |
|---|---|---|
| `ping` (or `get_app_info`) | 12.1 | `views/app-info` |
| `find_book` | 12.2 | new search over the library (D12) |
| `get_book` | 12.2 | `views/book` |
| `list_catalog` | 12.2 | `views/catalog` |
| `get_card_notes` | 12.2 | `views/card-notes` (all, or one Book's) |
| `get_home` | 12.2 | `views/home` |
| `get_stats` | 12.2 | `views/stats` (optional `from` / `to`) |
| `start_reading`, `update_page`, `finish_reading`, `pause`, `set_up_next`, `edit_purpose`, `add_card_note`, `edit_card_note`, `mark_side_read`, `unmark_side_read` | 12.3 | the matching intents (D5) |
| `add_book`, `edit_book` (with `cover_url`) | 12.4 | add-book, edit-book + the downloader (D7, D8) |
| `export_backup` | 12.5 | the export (D10) |

Exact tool names and argument shapes are settled in the architecture step. Leaving out `set-spine-color` is also decided there.

## 4. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 12's first story: reconcile the spine. `deferred-work.md` still has unresolved "spine drift" entries: AD-5/AD-16 (other-checkout refusal, `probe_checkout`, `create_app`'s `checkout`), and AD-6 (`lib/motion`, `components/BackToTop`) from the standalone back-to-top spec, which the next-epic gate doesn't pick up on its own (AGENTS.md → Architecture spine). | `bmad-architecture` (update) |
| 1 | PRD | **FR-28 Agents read and update the library through MCP** (D1, D3, D4, D6, D7, D10, D12–D14), with the use cases from the idea. Bump `updated:`. | `bmad-prd` (update) |
| 2 | Architecture spine | New **AD-21 MCP surface**: mounted in-process behind the guard (D1, D2, D4), tools share the intent handlers (D5, and a note in AD-3 that MCP tools are a second way in for the same intents), no destructive tools (D6), the outbound cover fetch and its rules (D8, D9), the backup folder (D10). Stack: the `mcp` SDK and the HTTP client (D16). Structural Seed: the MCP module. Capability map: FR-28. | `bmad-architecture` (update) |
| 3 | Epics (`epics.md`) | New **Epic 12: bookvie MCP server**, covering FR-28, with the eight stories below. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 4 | Sprint status | Add Epic 12 and Stories 12.1–12.8. | `bmad-sprint-planning` |
| 5 | Stories 12.1–12.8 | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. Then the Epic 12 retro. | per story |
| 6 | `docs/ideas.md` | Status → `planned`, linking Epic 12 and this plan. Done with this plan. | — |

No DESIGN.md or EXPERIENCE.md change: the epic has no UI. (The Backup page's "Last export" picks up MCP exports through D10 with no change.)

## 5. Story cut (Epic 12)

Eight stories. The cut was refined on 2026-11-19 (advanced elicitation, pre-mortem and problem decomposition): 12.1 also builds the shared tool helper, the MCP test client and the reconnect probe; add/edit and the cover download are split so the security-heavy downloader gets its own review; tool descriptions are verbatim ACs.

**12.1 Mount the MCP server** (D1–D4, D16). Needs nothing.

- Add and pin the `mcp` SDK and `httpx2`. Mount at `/mcp` inside `HostOriginGuard`, session manager in the lifespan, the same in `--dev` (spine AD-21).
- The one tool-registration helper in `agent/` every later tool uses: explicit input schema from a model, no SDK validation, `OkResponse` / AD-9 `error` results, worker thread, any other exception as `couldnt_save`. Proved with `get_app_info` and a test-only tool that takes arguments and fails.
- The pytest MCP client fixture (the SDK client against the real app and its lifespan) that every later ATDD reuses.
- Probe and record how Claude Code behaves when `/mcp` comes up after a session started, and the start-step pattern the skills will use.
- README: the two `claude mcp add --scope user` lines (D3), and that the app must be running.

**12.2 Read tools** (D12–D14). Needs 12.1.

- `find_book` (candidates), `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`; the stats range parsing and the views' not-found refusal move into `views/`.

**12.3 Daily-loop write tools** (D5, D6, D13). Needs 12.2 (`find_book` gives the ids).

- The ten reading and card-note tools, with one parametrized tool-vs-route contract test.

**12.4 Add and edit a Book** (D5, D12). Needs 12.3.

- `add_book` and `edit_book` without a cover: whole edits, the duplicate refusal and `confirmDuplicate`.

**12.5 Fetch a cover from its address** (D7–D9). Needs 12.4.

- `coverUrl` on both tools and the downloader with D8's rules, with resolver and connection seams so no test touches the network.

**12.6 Export a backup to disk** (D10, D11). Needs 12.1.

- `export_backup`, the backup folder that follows the data folder, `lastExportAt`, and `HOME` isolation in pytest and Playwright.

**12.7 Move `bookvie-notes-summary` onto MCP** (D15). Needs 12.2.

- Replace its HTTP calls with the tools; keep the start step. Oleg verifies a real run against `--dev`.

**12.8 Move `bookvie-new-book` onto MCP** (D15). Needs 12.5.

- `find_book` (the duplicate check), `add_book` with `coverUrl`, `get_book` to verify. The skill no longer downloads covers. The `added-by-skill` tag and the report stay. Oleg verifies a real run against `--dev`.

## 6. Tests

Murat's risks, for the ATDD:

- **Cross-origin refused** (P0, pytest): `/mcp` with a foreign `Origin` or `Host` gets 403, like `/api`. Requests without an Origin from the loopback address work.
- **Mounted in both modes** (P0): `/mcp` answers on a production server and on a `--dev` server, and the dev one reads the dev data folder.
- **Same handler** (P0, per write tool): the same input through the tool and through the intent route gives the same stored result and the same error code and fields, including `book_not_found` and `invalid_fields`.
- **No destructive tools** (P0): the tool list contains no delete-book, restore or delete-card-note, and calling such a name fails.
- **`find_book`** (P0): an ambiguous query ("Designing", two editions) returns every candidate with its edition and type. An unknown query returns an empty list, not an error.
- **Cover downloader** (P0, pytest with a local fake server and a patched resolver): `http` refused; a loopback, private, link-local or metadata address refused, including when reached through a redirect from a public one; too many redirects refused; a body over 20 MB stops at the cap while streaming; a non-image body refused whatever its `Content-Type`; a JPEG served as `binary/octet-stream` accepted. A failed download leaves the Book unsaved (add) or unchanged (edit), with a clear error.
- **`export_backup`** (P0): it writes `bookvie-backup-YYYY-MM-DD.zip` in the backup folder (the `-dev` folder with `--dev`), the zip restores through the existing restore check, `lastExportAt` moves, and a second export the same day replaces the file. No test writes to the real `~/bookvie-backups`.
- **Skills** (P1): each reworked skill runs end to end against a `--dev` server with the MCP tools only. No `curl` to `/api/intents/*` is left in the skill.
