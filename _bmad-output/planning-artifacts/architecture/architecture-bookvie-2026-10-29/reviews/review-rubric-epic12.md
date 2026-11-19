---
title: Rubric review of the Epic 12 spine update (AD-21, MCP surface)
reviewed: _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (uncommitted diff on hogback-creosote, 2026-11-19)
against: mcp-server-plan-2026-11-19.md (D1-D16, §5 story cut, §6 tests); prd.md FR-28 and §5 NFRs; backend/bookvie/http/api.py, http/app.py, intents/ (intent_model, contract, cover, book_form, add_book, edit_book, export), views/; frontend/e2e/fixtures.ts
date: 2026-11-19
verdict: pass-with-fixes
---

# Rubric review: Epic 12 spine update

**Verdict: pass-with-fixes.** AD-21 is well aimed. It places the mount, the guard, the exact tool list, the "same parse and same handler" rule, the downloader's SSRF rules and the backup file, and it covers every plan decision and FR-28 consequence by ID. Most of it ratifies the code as it is: `parse_*_intent(raw)`, `IntentError`, `add_book(store, clock, intent, cover)`, `build_export`/`record_export`, `HostOriginGuard`'s `_SERVER_PREFIXES`. But six points would make stories diverge or break as written. Two are high: the backup folder is keyed only on `--dev`, so every production-mode scratch server (all e2e servers, the install smoke test) writes into the real `~/bookvie-backups` and replaces that day's real backup; and the "serialize the arguments and hand them to `parse_*_intent`" rule clashes with `IntentModel`'s `extra="forbid"`/`strict=True` once `coverUrl` and SDK-side argument validation are involved.

## Scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Fixes the real divergence points for 12.1-12.7, misses none | Partial: the tool result encoding (success and error), the `coverUrl` handling in front of `parse_*_intent`, the cover failure field, the mount path and order, and how `get_stats` names `from`/`to` are open |
| 2 | Every AD-21 rule enforceable and effective | Mostly: the backup-folder rule doesn't prevent its stated divergence (scratch servers write the real folder); the SSRF list is an enumeration rather than "global only" |
| 3 | Nothing under Deferred lets two stories diverge | Mostly: `find_book`'s match details are deferred, but FR-28/UJ-6's abbreviation case ("DDIA") is a requirement, not a ranking detail |
| 4 | Ratifies, doesn't contradict, the code | Mostly: `parse_edit_book_intent(raw, has_cover=)` isn't mentioned; `IntentModel` forbids unknown keys; cover refusals land on `cover` via `cover_failures`, not on `coverUrl`; the book/card-notes "view refusal" is raised by the route, not the view |
| 5 | Covers every plan decision and FR-28 consequence | Yes by ID (D1-D14, D16; D15 is skill-level and needs no AD). AD-3's own revisit trigger for concurrency is now met by `edit_book` and isn't addressed |
| 6 | Operational (dev vs prod, tests never touch real folders) | Partial: see F1; lifespan in tests (F9) |

## Findings

### F1 [High] The backup folder leaks scratch libraries into the real `~/bookvie-backups`

- **Location:** AD-21 → Backup; Structural Seed data-folder note; Consistency → Testing.
- **Problem:** The folder is `~/bookvie-backups/` unless `--dev`. A production-mode server on a scratch `--data-dir` is common: every Playwright server (`frontend/e2e/fixtures.ts` spawns `bookvie --no-browser --port N --data-dir <tmp>` with the real `HOME`, `dev` false by default), the install smoke test, and any manual `bookvie --data-dir /tmp/x`. Its `export_backup` writes `~/bookvie-backups/bookvie-backup-<today>.zip`, and because a same-day export *replaces* that day's file (D11), it overwrites today's real backup with a scratch library. "Tests set `HOME`, as for AD-16" is true of the pytest CLI tests, not of e2e servers, and nothing enforces it for a future test or a skill run against a scratch server. The Prevents line ("a development agent writing to ... the real backups") is therefore only half delivered.
- **Fix:** Make the folder an injected value, not a lookup inside `intents/backup_file`: `cli.py` resolves it and passes `backup_dir` to `create_app` (pytest passes `tmp_path`). Rule: the resolved default real library → `~/bookvie-backups`; the default dev library → `~/bookvie-backups-dev`; any other data folder → a sibling `<data-dir>-backups` (or refuse `export_backup` with a clear error). Report it in `app-info` (or the tool result) so it's visible. Extend the e2e data-dir guard to the backups folder.

### F2 [High] "Serialize the arguments, pass them to `parse_*_intent`" doesn't survive `coverUrl`, `has_cover`, or SDK-side validation

- **Location:** AD-21 → Same handler; AD-8 (new last sentence).
- **Problem:** Three concrete clashes with the code:
  1. `IntentModel` is `extra="forbid", strict=True` (`intents/intent_model.py`). A tool that serializes *all* its arguments, `coverUrl` included, gets 422 `invalid_fields` on `intent` ("The intent must be a JSON object of the form's fields.") for every `add_book`/`edit_book` with a cover URL.
  2. `parse_edit_book_intent(raw, has_cover=False)` refuses `removeCover: true` together with a cover. The rule doesn't say the tool passes `has_cover=coverUrl is not None`, so 12.4 can silently accept "remove and replace" that the route refuses.
  3. If the SDK builds the tool's argument model from a typed function signature (the usual decorator path), it validates and *coerces* before the tool body runs (`"212"` → `212`, unknown keys dropped or refused with the SDK's own error shape). The tool then accepts inputs the strict route refuses and refuses others with a non-AD-9 error. AD-8's new claim that the schemas "can't drift" is not enforced by anything.
- **Fix:** Pin it in AD-21: each write tool takes its arguments as a raw JSON object; the advertised `inputSchema` is the intent model's `model_json_schema(by_alias=True)` plus `coverUrl` for the two book tools, and the SDK does no validation or coercion of its own. The tool removes `coverUrl`, `json.dumps` the rest into `parse_*_intent`, and passes `has_cover` for `edit_book`. The contract tests include a wrong-type value, an unknown key, and `removeCover` + `coverUrl`. Add a test that each tool's `inputSchema` equals its model's schema, so AD-8's "can't drift" is checked.

### F3 [Medium] The tool result encoding isn't fixed, and 12.2, 12.3, 12.4 and 12.7 each depend on it

- **Location:** AD-21 → Same handler.
- **Problem:** "An `IntentError` becomes a tool error whose content is the AD-9 `error` object" leaves open: is it `isError: true` with one text block holding JSON, `structuredContent`, or both? Is it the inner object or the `{error: …}` envelope? Are `duplicates` (with `isbn: null`, which `IntentError.response_body()` deliberately keeps) included? The success result of a write tool isn't specified at all, yet 12.7 needs `ids.bookId` from `add_book`, `add_card_note` returns `ids.cardNoteId`, and `start_reading`/`update_page` return `reachedLastPage`. 12.3 and 12.4 can each pick a different shape, and 12.6/12.7's skills parse whatever comes out.
- **Fix:** Write tool success = the route's `OkResponse`, serialized by alias with `exclude_none` (as the route does). Failure = `isError: true`, one text block containing `json.dumps(err.response_body())` (the full envelope, so `duplicates` round-trip), with the same object as `structuredContent`. A read tool's "view refusal" is the route's: `views.book_detail`/`views.card_notes` return `None`, and the tool raises `book_not_found` exactly as `book_view`/`card_notes_view` do.

### F4 [Medium] Cover-failure field and ordering are left to 12.4

- **Location:** AD-21 → Cover download.
- **Problem:** "Any failure is 422 `invalid_fields` on `coverUrl`" covers the downloader's own failures, but the result is then handed to "the existing `add_book` and `edit_book` path", where a byte stream that sniffs as JPEG yet fails Pillow's decode (or is HEIF) becomes a `RefusedCover`, which `book_form.cover_failures` reports on field **`cover`**, merged with the other field failures. The order isn't fixed either: the route parses the intent, then prepares the cover, then the handler reports field and cover failures together. A tool that downloads first reports only the URL error for an input the route would refuse on several fields, and spends a download on an intent that was malformed anyway.
- **Fix:** Order: parse the intent → download → `prepare_cover` → handler. Say which field a decode refusal uses: either keep `cover` (same field as the UI; the agent's description says so) or remap `cover` → `coverUrl` in the tool, and state which. Give `coverUrl` a `LABELS` entry or say the summary uses the key.

### F5 [Medium] `find_book` as specified can't satisfy FR-28's abbreviation case

- **Location:** AD-21 → Find, never guess; Deferred → `find_book`'s ranking and match details.
- **Problem:** FR-28 ("an abbreviation, an author, part of a title") and UJ-6 ("DDIA") make the abbreviation a requirement. AD-21 says the query matches "title, subtitle and authors", and Deferred hands "match details" to 12.2. A substring match on those fields never finds "DDIA", so 12.2 can pass its own ACs while UJ-6 fails, or invent a rule the skills (12.6, 12.7) don't expect.
- **Fix:** Fix the match rule in AD-21: the normalized query (the server's title-ordering key: NFKD, strip marks, casefold) matches a substring of the title, subtitle or any author, **or** the initials of the title's words (with or without stop words), **or** the normalized ISBN. Leave only ranking and the candidate cap to 12.2. The ISBN match also lets 12.7's duplicate check stop copying `domain/duplicates` (AD-8's known gap).

### F6 [Medium] AD-3's own "revisit" trigger now fires

- **Location:** AD-3 → Concurrency across tabs.
- **Problem:** AD-3 accepts last-write-wins for single-tab use and says "Revisit … if the cataloging agent ever edits an existing Book while the app is open in a tab." AD-21 adds `edit_book` (and `edit_card_note`, `edit_purpose`) for an agent, which is exactly that case. The spine change doesn't re-decide it. An Edit panel open in a tab while the agent edits the same Book silently undoes the agent's change on save, or vice versa.
- **Fix:** Add one sentence: either re-accept the deviation explicitly for agent edits (Oleg, date), or schedule the `revision` / `expectedRevision` refusal. AD-7's refetch on focus covers stale *views*, not open forms.

### F7 [Low] The `/mcp` mount path and route order are open in 12.1

- **Location:** AD-21 → Mount.
- **Problem:** The SDK's streamable-HTTP app typically carries its own `/mcp` route; mounting it under `/mcp` yields `/mcp/mcp`, or a Starlette `Mount` redirects `/mcp` → `/mcp/` (307), which some clients don't follow for POST. Registered after `create_app`'s SPA catch-all, a `GET /mcp` gets `index.html`.
- **Fix:** State that the public endpoint is exactly `/mcp` (the README URL), with no redirect, registered before the SPA catch-all. Add a test for `POST /mcp` and `GET /mcp` (not the SPA) on both modes.

### F8 [Low] `get_stats`'s `from`/`to` and the stats parse move

- **Location:** AD-21 → Tools, Same handler.
- **Problem:** `from` is a Python keyword, so a signature-derived tool can't name its argument `from` (ties into F2's raw-object rule). "The stats range moves into `views/`" doesn't say whether the `YYYY-MM-DD` check moves too. Today that check is a FastAPI `Query` type (`_IsoDate`), whose 422 message comes from Pydantic through `_validation_error`, so a tool's message for a bad date would differ from the route's.
- **Fix:** Add `views.parse_stats_range(from_, to) -> (date | None, date | None)` that does the format check and the half-range and order checks with fixed messages. The route and the tool both call it, with a contract test like the write tools'. The tool's schema uses the literal keys `from`/`to` (raw object, F2).

### F9 [Low] Smaller enforceability gaps

- **SSRF list.** "Loopback, private, link-local, unspecified and cloud-metadata" misses multicast, reserved, CGNAT `100.64/10`, and IPv4-mapped/compatible IPv6 (`::ffff:127.0.0.1`). Say "refuse unless every resolved address is `ipaddress.ip_address(...).is_global` after unmapping IPv4-mapped IPv6". Also require `trust_env=False` (an `HTTPS_PROXY` in the environment would bypass the address check) and an overall deadline (per-read timeouts let a trickling server hold the worker thread). Pinning the connection to the checked address needs a custom transport with SNI/Host kept. Name it so 12.4 doesn't assume plain `httpx` does it.
- **Body cap on `/mcp`.** Intent routes refuse a non-file part over 1 MB; `/mcp` has no `BodySizeCap` entry, so a tool accepts a multi-MB `text` the route refuses. That breaks "same rules" at the edge. Add `/mcp` to `BODY_CAPS` at 1 MB plus slack.
- **Lifespan in tests.** `create_app` has no lifespan today, and tests build `TestClient(app)` without `with`, so the session manager never starts. Say the `/mcp` tests enter the lifespan (`with TestClient(...)`).
- **Backup write failures.** `build_export` gives 503 `couldnt_export`. A failed file write isn't specified: name it (`couldnt_export`?), and say `lastExportAt` is recorded only after the rename succeeds.
- **Stack.** `mcp 2.3.x` is asserted while D16 says to pin "the version current when the story runs". Mark it as an expectation 12.1 confirms, or drop the number.
- **Skills.** Only the cataloging skill is named. Add a line that after 12.6/12.7 both skills use `/api/health` (start step, D15) plus the tools only, and that AD-8's two skill notes are removed when 12.7 lands.

## Coverage check

| Input | Where in the spine | Status |
|---|---|---|
| D1 mount in-process, lifespan | AD-21 Mount | Covered (F7 for path and order) |
| D2 behind the guard | AD-21 Guard, AD-16 Fetch metadata | Covered; SDK rebinding check off is a good single-list call |
| D3 Claude Code only | AD-21 Mount | Covered |
| D4 on in `--dev` | AD-21 Mount, Backup | Covered (F1 for scratch prod servers) |
| D5 same parse and handler, contract test | AD-3 bullet, AD-21 Same handler | Covered (F2, F3) |
| D6 no destructive tools | AD-21 Tools + exact-list test | Covered |
| D7 `cover_url`, no base64 | AD-21 Same handler, Cover download | Covered (F2, F4) |
| D8 downloader rules | AD-21 Cover download | Covered (F9 hardening) |
| D9 no allow-list | AD-21 | Covered |
| D10 dated zip, `lastExportAt` | AD-21 Backup, AD-14, AD-1 | Covered (F1) |
| D11 fixed folder, replace same day | AD-21, Deferred | Covered |
| D12 `find_book` candidates, ids | AD-21 Find | Covered (F5) |
| D13 descriptions, error codes | AD-21 Find, Same handler | Covered (F3) |
| D14 no planning tools | exact tool list | Covered |
| D15 skills keep start step | not in spine | Acceptable (skill-level); see F9 |
| D16 pin SDK, httpx runtime | Stack | Covered (F9 version note) |
| FR-28 "duplicate refused until confirmed" | implicit via the intent body's `confirmDuplicate` (AD-10) | Covered; worth naming in `add_book`'s description AC |
| FR-28 "Stats for any period" | `get_stats` | Covered (F8) |
| §5 "only outbound request" | AD-21, Consistency → Logging | Covered |
| §5 "no agent tool deletes data" | AD-21 Tools | Covered |
| FR-2 retired, AD-17 narrowed | binds, AD-1/9/16/17, map | Consistent; no dangling FR-2 reference |

## What is right and should stay

- Naming the package `agent/`, not `mcp/`, and the dependency rule `agent → intents, views`, never `http/api`.
- Turning the SDK's own DNS-rebinding check off so `HostOriginGuard` is the single host list.
- Running handlers in a worker thread because they block on the AD-4 lock.
- The download before the lock; the exact-tool-list test; `set-spine-color` excluded by decision.
- Building the backup through the existing `build_export` under the lock and writing outside it, atomically, with the `Clock` date.
