---
title: 'Reconcile the architecture spine with as-built Epic 12'
type: 'chore'
created: '2026-11-20'
status: 'done'
route: 'oneshot'
baseline_commit: '0924867'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 12's stories deferred 27 "spine drift" entries to `deferred-work.md` (from `spec-12-1` … `spec-12-8`), and retro item 84 added a 28th (the skills' `/mcp` probe relying on the stateless mount). The spine still marks AD-21, the `mcp`/`httpx2` Stack rows, the Seed's `agent/`, `views/find_book`, `intents/cover_fetch`, `intents/backup_file` and the FR-28 map row as planned. It also names `MCPServer`, a bare `find_book` list, and the cataloging skill as an HTTP client (Epic 12 retro item 82; sprint item `epic-12-retro-item-82-reconcile-the-spine-with-epic-12`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so it states what the code does, checking each statement against the code and citing stories 12.1 to 12.8 and retro items 84 and 87. That covers everything item 82 lists:
  - AD-21 built. Low-level `Server` + `_McpRoute`. `find_book`'s `{"books": [...]}` shape, ranking and blank-query refusal. `parse_view_arguments`. `intents/answers.py`. `edit_book`'s missing-key refusal and `editForm`, with item 87's parity table. The downloader's extra rules, `http.client` with `httpx2`'s TLS context, and the `cover_fetcher` seam. The backup's folder creation, fsync and the `backups_dir` keyword.
  - AD-1. The AD-8 skill notes. AD-9's stats copy location. The agent-side summary status (AD-6/AD-19).
  - The `views → intents.contract` edge. The Seed and its `AG` node. The Stack table. The FR-28 row. The Title-ordering exception. The Deferred bullets.
- Correct `epic-12-context.md`'s Mount paragraph (1 MiB, other `/mcp…` paths 404) and its now-stale "Spine lag" bullet.
- Close all 28 entries with a `resolved:` line.
- No code changes. The agent-side summary status is recorded as an accepted agent-side derivation, not moved into `get_book` (that would be code, outside a docs item). Oleg reviews the spine diff before it's final; sprint item 82 is marked `done` only after that.

</frozen-after-approval>

## Implementation Notes

- **Count:** 28 open drift entries, each closed with a `resolved:` line naming where the spine now says it. They are the retro's 27, whose line numbers have shifted by one from `:1252` on, plus item 84's `/mcp` probe entry. Item 87 had already closed `:1246`. A case-insensitive scan finds no unresolved "spine drift" entry left in `deferred-work.md`.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-20). Each statement was checked against the code at `0924867`:
  - **Paradigm:** the skills are MCP clients (12.7, 12.8). The dependency line gains `views → intents.contract` only (`test_layers.py` `ALLOWED_MODULES`).
  - **AD-1:** the backup creates its folder and writes a `.bookvie-backup-<date>.zip.tmp*` beside the zip (`backup_file.write_backup`, `_write_atomic`).
  - **AD-3:** `edit_book`'s missing-key refusal is the one check a tool adds (`tools._refuse_missing`).
  - **AD-6:**
    - `editForm` (`views/shelf._edit_form`) is held equal to `toPanelFields` by `editForm.cases.json` (`test_edit_form_parity.py`, item 87). The panel keeps `toPanelFields` (`BookDetailPage.tsx`).
    - The notes skill's status and Purpose choice is an accepted agent-side derivation (SKILL.md step 2).
  - **AD-8:**
    - The skills read and write only through the tools; `add_book.py`, `check_catalog.py` and `fetch_notes.py` are deleted.
    - The `/api/health` and `/mcp` probe dependencies are pinned by `tests/helpers.check_the_older_bookvie_probe`.
    - The reconnect step and the `bookvie`/`bookvie-dev` entries are recorded (both skills' step 1).
  - **AD-9:** stats parsing lives in `views/stats.py` (`IsoDate`, `check_stats_range`; the route calls it at `http/api.py` `stats_view`). `find_book`'s blank query gives `BLANK_QUERY_MESSAGE`.
  - **AD-19 Status:** points to AD-6.
  - **AD-21:**
    - **Mount:** `agent/server.py` (`mcp.server.lowlevel.Server`). `http/app.py` covers `_McpRoute`, the 404 for other `/mcp…` paths, `streamable_http_app` called for its manager, and `MCP_BODY_CAP` 1 MiB. The route is appended before `/api/health` and the rest; FastAPI's own `/openapi.json` is added at construction, so the spine says "before the API, media, asset and favicon routes and the SPA catch-all", not "every route".
    - **Read tools:** `parse_view_arguments`, and the strict `IntentModel` that refuses `null`. `StatsArguments` is `strict=False`.
    - **Answers:** `intents/answers.py` has four functions for twelve routes, and `server._success` treats a non-object answer as a bug.
    - **Edits are whole:** `BOOK_FORM_KEYS` and `EDIT_BOOK`'s description.
    - **Find, never guess:** `views/find_book.py` docstring and `BLANK_QUERY_MESSAGE`.
    - **Cover by URL:** `cover_fetch.py`, which covers `is_public`, `_exchange`, `_read_capped`, `fetch`'s empty check, `_default_ssl_context` and the `CoverFetcher` seams. `_book_tool` gives the order. `conftest._on_the_machine`.
    - **Backup:** `backup_file.py` docstring, `write_backup` and `_write_atomic`. `create_app` covers `backups_dir`.
    - **Descriptions:** tests read them from `epics.md` (`agent_client.py`, item 87).
  - **Conventions:** the Title ordering row gains the `find_book` exception. The Testing row names the temp `HOME`, `_on_the_machine` and the three case tables.
  - **Stack:** `mcp` (low-level `Server`) and `httpx2` (TLS context only). The pins are `mcp>=2.3.0,<2.4` and `httpx2>=2.16.2,<2.17`.
  - **Seed:** the `AG` node is folded into the Claude Code node as "Claude Code and the bookvie skills". The `agent/`, `http/`, `intents/` and `views/` lines are updated.
  - **Map:** the preamble says every row is built. FR-28's row names the new modules and the skills.
  - **Deferred:** the "`find_book`'s ranking" and "Skills on the agent tools" bullets are removed, since both are settled and recorded in AD-21 and AD-8.
- **`epic-12-context.md`:**
  - The Mount line names `_McpRoute` and the 404 for other `/mcp…` paths, and corrects "1 MB" to the code's 1 MiB.
  - The "Spine lag" bullet now says the spine was reconciled.
  - The rest already matched the code. The retro gave no specific error, so I compared the Mount line with `http/app.py` line by line.
- **Not changed:**
  - The IDs convention's `cardNoteId` note ("drop it if none does once those skills exist"): no drift entry names it. No skill adds Card notes, so it stays a question for Oleg.
  - AD-16's mentions of "the cataloging skill/agent": they still hold.
  - No code changed.

- **Verification:**
  - The drift scan parses `deferred-work.md` into entries (a line starting `- ` and its indented lines). It counts each entry whose text contains "spine drift" in any case and has no `resolved:` line. 28 before, 0 after.
  - `npm --prefix frontend run format:check`, `uv run ruff format --check .` and `uv run ruff check .` all exit 0.
  - The tests that read the spine pass: `test_stack_pins.py` (it parses the Stack table), `test_layers.py`, `test_new_book_skill.py`, `test_agent_shutdown.py`, `test_invariants.py` and `test_ordering.py`, 250 passed.
- **Review patches:**
  - AD-9's `{detail}` sentence now names `_McpRoute`'s 404 and the SDK's own answers.
  - AD-21 One validator names `get_app_info` and `export_backup` (`NoArguments`), and AD-21 Binds add AD-6 and AD-20.
  - The AD-6 bullet is narrowed to the one accepted derivation and moved after Days left.
  - Both skills' versions are given, and AD-16 names the skills.
  - The `find_book` initials rule matches the code (`_find_book` keeps the query's letters and digits).
  - Test paths are repo-rooted.
  - The Paradigm mentions the `/mcp` probe.
  - The context's Cover by URL line points to AD-21.
  - The `cardNoteId` question is deferred to `deferred-work.md`.

## Review Triage Log

- low, patch: AD-9 "No real route answers `{detail}`" contradicted `_McpRoute`'s `JSONResponse({"detail": "Not Found"}, 404)` (`http/app.py:191`).
- low, reject: AD-9's "a part over 1 MB" next to AD-21's 1 MiB. The two limits are different (a multipart part, a request body), and the unit is cosmetic.
- low, patch: `get_app_info` uses `parse_arguments(NoArguments, …)`, not `parse_view_arguments` (`tools.py:220`).
- low, patch: AD-21 Binds lacked AD-6 (`editForm`) and AD-20 (`Clock`).
- medium, patch: the AD-6 bullet granted a general permission against AD-6's Prevents. It is narrowed to the one case.
- low, patch: the AD-6 bullet sat before Days left, a server number. Moved after it.
- low, reject: AD-8 carrying the skills' step-1 details. Deliberate: it replaces the removed Deferred bullet, which asked for them to be settled, and it is one sentence.
- low, patch: AD-8 versioned only `bookvie-new-book`.
- low, patch: AD-16 named one skill.
- low, defer: the IDs row's `cardNoteId` condition. A decision for Oleg, recorded in `deferred-work.md`.
- low, patch: the context's Cover by URL bullet trailed the spine. It now points to AD-21; the file is a cache for a finished epic.
- low, patch: initials matching ignores the query's other characters (`find_book.py:93`).
- low, patch: mixed `tests/` and `backend/tests/` paths.
- low, patch: the Paradigm said `/api/health` was the only HTTP call.
- low, patch: the spec didn't record how its claims were checked. Verification is added above, and the spine is added to `context`.
- false: "the old 12.1 `resolved:` line is wrong". Story 12.4's `dfa22d9` did make the Mount line name `_McpRoute`, and Story 12.5's `448ede5` later compressed it away (`git log -p` on `epic-12-context.md`).
