---
title: Adversarial review of AD-21 (agent tools over MCP) and its edits
reviewed: ARCHITECTURE-SPINE.md, uncommitted diff of 2026-11-19 (AD-1, AD-3, AD-8, AD-9, AD-14, AD-16, AD-17, AD-21, conventions, stack, seed, map)
background: mcp-server-plan-2026-11-19.md; backend/bookvie/ as of 72c31c6
method: build two Epic 12 units, each obeying every AD to the letter, and show where they still don't fit together
date: 2026-11-19
---

# Adversarial review: AD-21 and Epic 12

**Verdict: not ready for Story 12.1.** AD-21 picks the right shape: in-process, same handlers, behind the guard, no destructive tools. But eleven places leave two compliant stories free to build things that don't fit. Five of them are high or critical: edit-book's replace-everything semantics exposed to an agent, nobody named as the owner of argument validation, tool result and error shapes left open, `coverUrl` against edit-book's existing cover fields, and gaps in the downloader's SSRF rule. One more risks real data: the backup folder is keyed on the mode, not the data folder. Each hole below has proposed rule text.

Severity: **Critical**: data loss or a security hole within the epic. **High**: two stories will very likely build incompatibly. **Medium**: likely rework or a flaky boundary. **Low**: a wording or ownership gap.

---

## H1 (Critical): `edit_book` is a full replace, and an agent will send part of a Book

**Facts in code.** `BookFormIntent` (`intents/book_form.py:22`) makes every form key optional with default `None`, and `edit_book` (`intents/edit_book.py`) writes every field from `valid_fields(intent, …)`. An omitted `subtitle`, `edition`, `publisher`, `isbn`, `year`, `tags` or `spineColor` becomes empty and is **stored empty**. An omitted `finishedOn` on a finished Book is refused, and so is an omitted `title`, but the optional fields clear without a word. The form gets away with this because the panel always sends every field prefilled.

**The pair.**
- *12.4, to the letter:* "a write tool's arguments are its intent's JSON body". So `edit_book`'s input schema is `EditBookIntent`'s, where every key is optional.
- *12.7 or any agent, to the letter:* "fix the cover of DDIA" becomes `edit_book({bookId, coverUrl})` or `edit_book({bookId, tags: "…"})`. The schema accepts it, the handler commits, and the Book loses its subtitle, ISBN, publisher, year, tags and the user's spine color. That's a 200, with a no-error tool result.

AD-3 also names this exact trigger: "Revisit, with a document `revision` and an `expectedRevision` refusal, if the cataloging agent ever edits an existing Book while the app is open in a tab." AD-21 makes that happen (`edit_book`, and `update_page` and the others against an open Edit panel) and doesn't revisit it.

**Proposed rule (AD-21, Same handler):**
> `edit_book`'s input schema marks every form key of `EditBookIntent` **required** (plus `bookId`). Only `removeCover`, `confirmDuplicate` and `coverUrl` stay optional. A call that omits a form key is refused before the handler runs (`invalid_fields` on each missing key, AD-9). Its description says: "Send every field. Read them from `get_book` first; an empty string clears a field." The tool never merges with the stored Book, because a merge would be a second edit semantics (AD-3).

**And (AD-3, Concurrency across tabs), replace the last sentence:**
> The agent tools (AD-21) make the revisit condition true. Decision for Epic 12: accepted as is, because the agent's `edit_book` sends a full form it read from `get_book` moments before, and the stale-tab loss is the same one A2 already accepts. Re-open it if an agent ever edits on a schedule, without the user present.

(Or add the `revision` now. Either way the spine must say which.)

---

## H2 (High): Two owners of argument validation, the MCP SDK and `parse_*_intent`

**The pair.**
- *12.1/12.2, to the letter of AD-8* ("the tools' argument and result schemas come from the same Pydantic models"): register tools the idiomatic FastMCP way, `@mcp.tool() def update_page(intent: UpdatePageIntent)` or with typed keyword parameters. The SDK builds its own argument model and **validates before the function runs**. It is lax, not `strict=True`, so it coerces `"212"` to `212` and may pre-parse JSON-in-strings. It nests the body under the parameter name (`{"intent": {...}}` rather than flat camelCase). And it answers a bad argument with **its own** error text, not AD-9.
- *12.3, to the letter of AD-21* ("serializes its arguments, passes them to the route's own `parse_*_intent`"): takes a raw `dict`, so the SDK advertises an untyped schema and the agent guesses at keys.

Neither is wrong under the rules, but together they give two validators and two error shapes, and AD-8's promise of a schema that can't drift is broken either way.

A second clash, inside the model: `BookFormIntent` declares `title: str | None`, so `model_json_schema()` advertises `anyOf: [string, null]`. But `IntentModel._no_null` refuses an explicit `null` as a **malformed intent** (field `intent`). An agent that follows the advertised schema and sends `"subtitle": null` to clear a field gets a refusal that names no field. Likewise `pages` is a string in the intent (`"350"`), and the agent's natural `350` is malformed under `strict=True`.

**Proposed rule (AD-21, Same handler, replace the second sentence):**
> Each tool is registered with an explicit `inputSchema`: its intent model's `model_json_schema(by_alias=True)`, with `additionalProperties: false`, and with `null` removed from every field not in the model's `nullable`. The MCP SDK does no argument validation of its own. The handler receives the raw `arguments` object, `json.dumps` it, and calls the route's `parse_*_intent`. So `parse_*_intent` is the only validator, and a type mismatch is the same 422 the route gives. A test checks, per tool, that every instance of the advertised schema (Hypothesis, `hypothesis-jsonschema` or a hand-made case table) is either accepted or refused with field-level `fields`, never with the `intent` malformed message. Each form field's description says it is a string as typed in the form, for example `"pages": "350"`.

---

## H3 (High): Tool result and error shapes are open

AD-21 says only "an `IntentError` becomes a tool error whose content is the AD-9 `error` object: the same `kind`, `code`, `message` and `fields`."

**Pairs.**
1. *Inner or outer object, text or structured.* 12.3 returns `CallToolResult(isError=True, content=[TextContent(json.dumps(exc.body))])`, the inner object. 12.2 raises `ToolError(json.dumps(exc.response_body()))`, the outer `{"error": …}` that FastMCP wraps in its own text. 12.7's skill parses one and breaks on the other. With an `outputSchema` declared (FastMCP does that for typed returns), the SDK also expects `structuredContent` to match the output schema, which an error object doesn't.
2. *`duplicates` dropped.* The list "`kind`, `code`, `message` and `fields`" leaves out `duplicates`, which `IntentError.response_body()` adds (`intents/contract.py:106`) and which AD-8 lists as part of what the skill reads. A 12.3 implementer who builds the object from that list gives 12.7 a `duplicate_book` refusal with no way to say *which* Book matched.
3. *Success shape.* Nothing says what a write tool returns. 12.3 returns `OkResponse` (`{ok, ids?, reachedLastPage?}`), 12.4 returns `{bookId}`, and someone else returns the Book view. 12.7 needs `bookId`, and an agent logging a page needs `reachedLastPage` to offer finish-reading.
4. *Unexpected exceptions.* The route's `_unexpected_error` maps any stray exception to 500 `couldnt_save` and logs it to stderr. In a tool, the SDK turns it into `isError` with `str(exc)`: a Python message, no AD-9 shape, possibly a path.
5. *HTTP status is lost.* 404 and 409 `book_not_found` (view and intent) look the same, which is fine, but say so.

**Proposed rule (AD-21, new bullet "Results"):**
> - **Success:** a write tool returns `structuredContent` equal to the route's `OkResponse` serialized by alias with `exclude_none` (`{"ok": true, "ids"?: …, "reachedLastPage"?: true}`), and the same JSON as one `TextContent`. A read tool returns its view the same way. `export_backup` returns a `BackupFileResult` model (`path`, `size`, `createdAt`) defined in `views/models` (AD-8).
> - **Failure:** `isError: true`, no `structuredContent`, and one `TextContent` whose text is `json.dumps(exc.response_body()["error"])`, the **inner** AD-9 object with every key `response_body()` emits, `duplicates` included. The HTTP status isn't carried; `code` is the contract.
> - **Unexpected:** every tool body is wrapped in one decorator in `agent/` that logs like `_unexpected_error` and returns `couldnt_save` (kind `couldnt_save`) in that shape. No exception reaches the SDK. JSON-RPC errors are used only for protocol faults (unknown tool, bad JSON-RPC), never for a refusal.

---

## H4 (High): `coverUrl` against edit-book's `cover` and `removeCover`, and the order of errors

**Facts in code.** `IntentModel` has `extra="forbid"`, so `coverUrl` inside the JSON passed to `parse_edit_book_intent` is a malformed intent. `parse_edit_book_intent(raw, has_cover=…)` refuses `removeCover: true` together with a cover, on field `intent`. A refused image is a `RefusedCover`, which `cover_failures` turns into a failure on field **`cover`**, merged in form order with the other field failures. A cover over 20 MB is **413 `cover_too_large`** on the route. `edit_book` checks `book_not_found` before writing a cover file.

**The pair.**
- *12.4a, to the letter* ("the result is an ordinary `UploadedCover` for the existing path"): passes `prepare_cover(bytes)` through. An undecodable download comes back as `invalid_fields` on **`cover`**, merged with, say, a bad `pages`, and the message reads "Not saved. 2 fields need attention: Pages, Cover."
- *12.4b, to the letter* ("Any failure is 422 `invalid_fields` on `coverUrl`"): raises at once with one field, `coverUrl`, even when the Book is gone (`book_not_found` should win) and even when the intent is malformed. A 30 MB body is 422 here and 413 on the route. `coverUrl` has no entry in `LABELS`, so the summary names the raw key.

And unwritten in both: does `coverUrl` count as `has_cover` (so `coverUrl` plus `removeCover: true` is refused)? Is `coverUrl` stripped before `parse_*` (it must be, or every call is malformed)? Is `""` absent or refused? The contract test "same input through tool and route" can't be built for a `coverUrl` call, because the route has no such field.

**Proposed rule (AD-21, replace the Cover download's last sentences):**
> The tool pops `coverUrl` from the arguments before parsing, then runs in this order. (1) `parse_*_intent` on the rest, with `has_cover=True` whenever `coverUrl` is present, so `coverUrl` with `removeCover: true` is the route's malformed-intent refusal. (2) For `edit_book`, `book_not_found` if the Book is gone, before any download. (3) The download, outside the lock. (4) The handler. Every download failure, and an image `prepare_cover` refuses, is a field failure on **`coverUrl`** with the copy the form uses for `cover` ("Cover must be 20 MB or smaller.", the not-an-image copy) plus the download copies ("Couldn't download the cover.", "The cover URL must be https."). It goes to the handler as `extra` (generalize `cover_failures` to take the field name), so it is listed in form order with the other field failures in one 422 `invalid_fields`; a body over 20 MB is that field failure too, never 413. `LABELS` gets `coverUrl: "Cover URL"`. An empty `coverUrl` counts as absent. The contract test for these two tools compares a `coverUrl` call (served by the fake server) with a route call that sends the same bytes as the `cover` part: same stored Book, same cover bytes, and the same error with `cover` renamed to `coverUrl`.

---

## H5 (High): SSRF holes in the cover download rule

The rule reads: `https` only; resolve; refuse loopback, private, link-local, unspecified and metadata addresses, again after every redirect (at most 3); "the connection goes to the address that was checked"; timeouts; a 20 MB cap while streaming; byte sniffing. Each gap below is a way for a compliant 12.4 to stay exploitable:

1. **Pinning versus TLS.** httpx has no "connect to this IP" option. The easy compliant-looking builds are (a) check with `getaddrinfo`, then `client.get(url)`, which resolves again and is open to DNS rebinding between check and connect; (b) rewrite the URL to the IP with a `Host` header, which breaks SNI and certificate checks, so the implementer sets `verify=False`. The rule must say how to pin **and** keep verification.
2. **Several A/AAAA records.** "The host is resolved" doesn't say *all* addresses. Checking the first and connecting to whatever the OS picks is a bypass.
3. **IPv6 and the gaps between lists.** The named classes miss `::ffff:127.0.0.1` (IPv4-mapped, which Python's `is_loopback` doesn't flag on every version), NAT64 `64:ff9b::/96`, 6to4 `2002::/16` and Teredo `2001::/32` with private IPv4 inside, ULA `fc00::/7`, deprecated site-local `fec0::/10`, CGNAT `100.64.0.0/10` (not `is_private` on older Pythons), multicast, `0.0.0.0/8`, `240.0.0.0/4` and broadcast. A deny list will always be one short. An allow rule closes them.
4. **Proxies.** httpx's default `trust_env=True` honors `HTTPS_PROXY` and `ALL_PROXY` and reads `.netrc`. The connection then goes to the proxy, so the check is moot and credentials can leak.
5. **The scheme on redirect.** "`https` only" is stated once. A 302 to `http://…` must be refused too, and `follow_redirects` must be off so each hop is checked.
6. **A trickle.** A read timeout limits the gap *between* reads, not the total. One byte every few seconds holds a worker thread from anyio's shared pool of 40 (the same pool FastAPI's sync routes use, H9) for hours.
7. **Decoded size.** A gzip-encoded body can pass a 20 MB cap counted on the wire. Count the bytes after decoding, or send `Accept-Encoding: identity` and refuse any `Content-Encoding`.

**Proposed rule (AD-21, Cover download, replace the first three sentences):**
> `https` URLs only, on the first request and on every redirect. Redirects are followed by hand (`follow_redirects=False`), at most 3. For each hop, the host is resolved with `getaddrinfo`, and **every** returned address must be globally routable: after unwrapping IPv4-mapped, 6to4 and Teredo addresses to their IPv4, `ipaddress.ip_address(a).is_global` is true and `is_multicast` is false. Otherwise the hop is refused. The connection is made to one of those checked addresses through a pinned transport (a custom `httpcore` network backend, or the `sni_hostname` extension), with TLS verified against the URL's hostname. `verify` is never turned off. The client is created with `trust_env=False` (no proxies, no `.netrc`). The request sends `Accept-Encoding: identity`, and any `Content-Encoding` other than `identity` is refused. Timeouts: 5 s to connect, 10 s per read, and a **total deadline of 30 s** for the whole download, redirects included. The 20 MB cap counts the bytes received. Tests cover each refused class (including `::ffff:127.0.0.1`, `64:ff9b::7f00:1`, `100.64.0.1`, `169.254.169.254`, `fd00::1`), a host whose second A record is private, an `http` redirect, a proxy variable set in the environment, and a trickling server that hits the deadline.

---

## H6 (High): The backup folder is keyed on the mode, so a scratch server overwrites the real day's backup

**The pair.**
- *12.5, to the letter:* production mode writes `~/bookvie-backups/bookvie-backup-<today>.zip` and "replaces that day's file".
- *Any production-mode server on another data folder:* `bookvie --data-dir /tmp/try --port 9000`, the install smoke test, an e2e or pytest server started without `--dev`, or a second real library. One `export_backup` call replaces **today's real backup** with a backup of the scratch library. With no retention, the real backup for that day is gone. Two production servers on two data folders overwrite each other daily.

The isolation rule "No test writes the real folder: tests set `HOME`" depends on every test remembering. `backend/tests/conftest.py` has no autouse `HOME` fixture, and Playwright's `webServer` sets no `HOME` (only `e2e/guard.spec.ts` does, locally). The skill runs in 12.6 and 12.7 (P1, "against a `--dev` server") write the real `~/bookvie-backups-dev`.

**Proposed rule (AD-21, Backup, replace the folder sentence):**
> The folder follows the data folder, not the mode. When the data folder is the mode's default (`instance.same_folder` with `~/bookvie-data`, or with `~/bookvie-data-dev` under `--dev`), backups go to `~/bookvie-backups` or `~/bookvie-backups-dev`. For any other data folder they go to its sibling `<data-folder>-backups`. So no server writes another library's backup folder. `app-info` reports the folder (AD-6). `backend/tests/conftest.py` gets an autouse fixture that sets `HOME` to a temporary folder, and Playwright's `webServer.env` sets `HOME` to a temporary folder for every server it starts. A test asserts that `export_backup` against a temporary data folder writes only under that folder's sibling.

---

## H7 (Medium): export_backup's failure codes, temp file and AD-4

- **Failure code.** A zip build failure is 503 `couldnt_export` (`build_export`). Writing the file to `~/bookvie-backups` can also fail (disk full, permissions, a file in the folder's place), and nothing names that code. 12.5 picks `couldnt_save`, while a later story (Dropbox) picks `couldnt_export`.
- **Temp name.** "temp file, fsync, rename". Two same-day calls, or an agent retry, with a fixed temp name (`…zip.tmp`) write over each other's temp file before the rename. A crash leaves a temp file with nothing to sweep it.
- **Folder fsync.** On APFS a rename isn't durable until the folder is fsynced. AD-2 does that for `library.json`. Say whether the backup does.
- **AD-4 still says** "The one write outside the lock is `local-state.json`". The backup file is now a second write outside the lock, and AD-4 isn't edited.
- **`lastExportAt` meaning.** AD-14's added clause makes "Last export" true once a file lands on the same disk as the library. That's acceptable (D10), but the Backup page can no longer show whether the user ever took a copy *off* the machine. Record the source, or accept it explicitly.
- **Locking.** `store.lock` is a non-reentrant `threading.Lock` (`store/store.py:250`). A 12.5 that wraps "build, then record" in `with store.lock:` around `build_export` deadlocks.

**Proposed rule (AD-21, Backup, add):**
> `export_backup` calls `build_export` (which takes and releases the lock itself) and never takes `store.lock` in `agent/`. The zip is copied to a temp file made with `mkstemp(dir=<backups folder>, prefix=".bookvie-backup-", suffix=".tmp")`, fsynced, renamed over `bookvie-backup-YYYY-MM-DD.zip`, and then the folder is fsynced. The folder is created on demand with mode `0700`. Any failure after the zip is built (mkdir, write, fsync, rename) removes the temp file and is 503 `couldnt_export` with the message "Couldn't write the backup.", and records nothing. Leftover `.bookvie-backup-*.tmp` files are removed by the next `export_backup`. `lastExportAt` is recorded only after the rename. A failure to record it is logged and the tool still succeeds (as `record_export` does). `path` is absolute and has `~` expanded.

**AD-4, edit:** "The writes outside the lock are `local-state.json` ("Last export", AD-15) and an agent's backup file (AD-21), both made after the zip is built, and neither touches `library.json` or `covers/`."

---

## H8 (Medium): Who owns the MCP instance, the lifespan, routing order and `/mcp` versus `/mcp/`

**Pairs.**
1. *One module-level FastMCP, or one per app.* 12.1 writes `mcp = FastMCP("bookvie")` at module level and decorates tools onto it (the SDK's examples do). The SDK's `StreamableHTTPSessionManager.run()` can run **once per instance**, so the second `with TestClient(create_app(...))` in a pytest session fails. Tools that read a module global can't tell one test app's `store` from another's.
2. *Lifespan.* `create_app` has no lifespan today, and Starlette doesn't run a mounted app's lifespan. 12.1 adds one. Existing tests use `TestClient(app)` without `with`, so no lifespan runs, and any `/mcp` test written that way fails with "task group not initialized". The rule doesn't say so.
3. *Routing.* `create_app` ends with the SPA catch-all `/{path:path}` for GET/HEAD, and `_SERVER_PREFIXES = ("api", "media")`. A mount added after the catch-all, or with `"mcp"` left out of `_SERVER_PREFIXES`, means `GET /mcp` serves `index.html`, and the `Sec-Fetch-Site` check that AD-16 now promises for `/mcp` silently doesn't run (`_is_server_path` decides it).
4. *Trailing slash.* Mounting at `/mcp` a sub-app whose route is `/mcp` serves `/mcp/mcp`. With the route at `/`, `POST /mcp` gets a 307 to `/mcp/`. README's `http://127.0.0.1:8765/mcp` and 12.1's tests can each be right on their own and still disagree.
5. *Body cap.* `BodySizeCap` covers three paths, so an `/mcp` JSON-RPC body is unlimited. It's a local DoS only, but `add_book` arguments have no limit, while the route's are capped by multipart.
6. *`store=None`.* `create_app` allows no store (tests). Tools must answer something defined.

**Proposed rule (AD-21, Mount, replace):**
> `agent.create_agent(store, clock, app_info, backups_dir)` builds a **new** MCP server and session manager for each `create_app` call. `agent/` has no module-level server or state. `create_app` mounts its ASGI app at `/mcp` **before** the SPA catch-all, adds `"mcp"` to `_SERVER_PREFIXES`, and runs the session manager in the app's own lifespan. The endpoint is exactly `/mcp`: `POST /mcp` answers without a redirect, and a test asserts it. Tests that touch `/mcp` use `with TestClient(app)`. `BodySizeCap` caps `/mcp` bodies at 1 MiB (refused as JSON-RPC parse error -32700 with HTTP 413). With no store, every tool returns `couldnt_save`.

---

## H9 (Medium): Threads, and async tools that block the loop

"calls the same handler in a worker thread" is stated only for write tools.

- A 12.2 read tool written as `async def get_home(...)` calls `views.home_for(store)`, which **reads `local-state.json` from disk** (AD-4). That's a blocking read on the event loop. Harmless at this size, but it is the sync-in-async pattern the route layer avoids with plain `def`.
- The download (H5) and the backup file write are blocking I/O too. If 12.4 does the download with `httpx.AsyncClient` on the loop and then `to_thread` for the handler, and 12.5 does everything in one thread, both comply. But they differ in what a client disconnect cancels: an async download is cancelled, a thread isn't.
- All of these share anyio's default limiter (40 tokens) with FastAPI's sync routes, so 40 slow tool calls stall the UI's views.

**Proposed rule (AD-21, Same handler, add):**
> Every tool body, read or write, runs as one `anyio.to_thread.run_sync` call, and the download and backup write run inside it, synchronously. A client that disconnects doesn't cancel a tool already in its thread: a write completes or refuses as usual. The total deadline (H5) bounds the longest tool.

---

## H10 (Medium): Moving the skills onto MCP (12.6, 12.7)

1. **The start step doesn't bring the tools.** D15 keeps "curl `/api/health`, start `bookvie` if needed". But Claude Code connects to MCP servers when the session starts. If `bookvie` wasn't running then, the server is marked failed and its tools aren't in that session's tool list, so starting `bookvie` from the skill doesn't make `mcp__bookvie__*` appear. A 12.7 that passes its P1 test (server already up) fails on a cold start.
2. **Tool names differ by entry.** Tools appear as `mcp__bookvie__add_book` or `mcp__bookvie-dev__add_book`. The P1 test runs the skill "against a `--dev` server with the MCP tools only", so either the shipped skill names the dev tools, or the test exercises a skill that isn't the shipped one.
3. **The duplicate check gets weaker.** `find_book` matches title, subtitle and authors, **not ISBN**, and returns no `isbn`. `check_catalog.py` (AD-8's known gap) checks by ISBN. 12.7 replaces it with `find_book`, so a new edition with a different title can't be caught before the server's 409. The 409's `duplicates` is then the only source, and H3.2 shows it can be dropped.
4. **AD-8's new sentence**, "Both notes about the skill hold until Story 12.7", implies the duplicate-rule gap closes at 12.7. It doesn't, unless `find_book` or the 409 covers ISBN.

**Proposed rule (AD-21, new bullet "Skills"):**
> A skill names the production tools (`mcp__bookvie__*`). Its P1 test registers the dev server under the name `bookvie` in a temporary Claude Code config, so it runs the shipped text. When the tools are missing from the session, the skill starts `bookvie` and then tells the user to run `/mcp` and reconnect, or retries once if Claude Code reconnects on its own (Story 12.6 checks which and fixes the text). `find_book` also matches a query that is an ISBN (digits and hyphens, compared like `domain/duplicates`), and its result items carry `isbn`. 12.7's duplicate step relies on `find_book` plus the 409's `duplicates` (H3), and AD-8's known gap is closed only when `check_catalog.py` is deleted.

---

## H11 (Low): Two owners left in `http/api.py`

AD-21 moves "the stats range" into `views/` first, but two more pieces a tool needs live only in `http/api.py`, which `agent/` may not import:
- `_uploaded_cover` (the 20 MB read cap plus `prepare_cover`). 12.4 copies it, and now the cap has two owners.
- The `book_not_found(404)` raise for `views.book_detail(...) is None` and `card_notes(...) is None`. 12.2 re-derives it, and the decision of whether a view refuses has two owners.

Also, "moves into `views/` first" doesn't say the **route** must then call the moved function. A 12.2 that copies the range check into `views/stats` and leaves the route's own check in place complies with the letter, and now there are two copies.

**Proposed rule (AD-21, Same handler, replace the moving sentence):**
> Any parsing or refusal a tool needs that now lives in `http/api.py` moves into `intents/` or `views/`, and the route then calls the moved function, so each has one owner: the stats range check (`views/stats.parse_range`), the cover read cap (`intents/cover.read_cover(data_or_stream)`), and the not-found refusal of `book` and `card-notes` (`views` raises `book_not_found(404)`; the route only returns). `test_layers.py` asserts that `agent/` imports neither `bookvie.http` nor `fastapi`.

---

## Checked and holding

- **Guard and Claude Code.** Claude Code's HTTP transport sends `Host: 127.0.0.1:<port>`, no `Origin` and no `Sec-Fetch-Site`, so it passes. A cross-site browser POST carries an `Origin` and is refused. A cross-site fetch with `Content-Type: application/json` needs a preflight, which is refused too. Turning off the SDK's own rebinding check is right, because a second allow list would disagree under `--port` and `--dev`'s Vite origin. Just be aware that the Vite origin can now reach `/mcp`, which is harmless.
- **No destructive tools.** The exact-list test plus the never-registered list is enough.
- **Single process.** No stdio and no subcommand, so AD-5 is untouched.
- **AD-17's narrowing** is consistent with FR-2's retirement.

## Summary of proposed edits

| # | Sev | Where | Change |
|---|---|---|---|
| H1 | Critical | AD-21 Same handler; AD-3 concurrency | `edit_book` requires every form key; record the AD-3 revisit decision |
| H2 | High | AD-21 Same handler | explicit `inputSchema` with null stripped; SDK doesn't validate; schema-to-parse test |
| H3 | High | AD-21 new "Results" | success, error (inner object, `duplicates` kept) and unexpected shapes |
| H4 | High | AD-21 Cover download | pop `coverUrl`; `has_cover`; error order; field `coverUrl` merged in form order; no 413; contract test |
| H5 | High | AD-21 Cover download | `is_global` allow rule over every address; pinned TLS-verified transport; `trust_env=False`; https per hop; total deadline; identity encoding |
| H6 | High | AD-21 Backup; testing | backups folder follows the data folder; autouse `HOME` in pytest and Playwright |
| H7 | Medium | AD-21 Backup; AD-4 | `couldnt_export` on write failure; `mkstemp`; folder fsync; AD-4's writes outside the lock |
| H8 | Medium | AD-21 Mount | per-app factory; lifespan; mount before the catch-all; `mcp` in `_SERVER_PREFIXES`; exact `/mcp`; body cap |
| H9 | Medium | AD-21 Same handler | every tool body in one worker-thread call |
| H10 | Medium | AD-21 new "Skills"; AD-8 | cold start, tool naming, ISBN in `find_book`, the gap's real closure |
| H11 | Low | AD-21 Same handler | one owner for the cover cap, view not-found and the stats range |
