---
title: Rubric review of ARCHITECTURE-SPINE.md (bookvie)
reviewed: _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
against: prd.md (final 2026-10-29), prd-deltas.md A1-A6, EXPERIENCE.md Agent Label Contract, .memlog.md
date: 2026-10-29
verdict: pass-with-fixes
---

# Rubric review: bookvie architecture spine

**Verdict:** A strong, mostly well-aimed spine. The paradigm (server-owned domain, intent API, server views) closes the biggest divergence risks. It still leaves the binary/non-JSON surface (covers, export, restore), the validation-error shape, and several operational behaviors unfixed. Units built independently against it would diverge on those points.

## Scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Fixes the real divergence points, misses none | Partial: binary endpoints, the validation shape, Reading identity, and the refetch scope are open |
| 2 | Every Rule enforceable and effective | Mostly: AD-7, AD-9, AD-12, AD-14 and AD-16 have gaps |
| 3 | Nothing under Deferred lets units diverge | Mostly: the data-fetching library plus the "views it affects" wording is a leak |
| 4 | Every PRD FR covered | Yes for IDs. FR-1 cover-on-add and FR-18 shuffle are under-placed |
| 5 | Every owned dimension decided, deferred or open | Partial: install build step, upgrade backup, shutdown, port conflict and restore-input safety are silent. There is no Open Questions section |
| 6 | Terse, no rationale, valid mermaid | Mostly: 3 mermaid blocks are valid; a few rationale sentences and inconsistent [ADOPTED] tags |

## Findings

### F1 [High] Binary / non-JSON endpoints have no home (covers, export, restore)
- **Location:** Design Paradigm dependency rule; Consistency Conventions → Naming; AD-3; AD-12; AD-14; Capability map rows FR-21 and FR-22/23.
- **Problem:** The rules say the API is "HTTP JSON", that mutations are `/api/intents/<verb>`, that views are `/api/views/<name>`, and that `http` imports only `intents, views`. But:
  - The New book panel has a **Cover** file input (Agent Label Contract), so `add-book` must carry an image.
  - The cover must be written as `covers/<book-id>.<ext>` before the commit (AD-12), yet the server mints `book-id` inside the same intent.
  - Export is a zip download, restore is a zip upload, and covers must be served as images.
  - The capability map places export and restore in `store/`, which `http` may not import.
  - One builder will do add-book as a JSON intent followed by a separate cover upload. That is two calls for one user action, and it can half-fail, which AD-3 forbids. Another builder will use multipart.
  - Cover URLs are undefined, so a replaced cover that keeps the same filename is served stale from the browser cache.
- **Fix:** Add an AD such as "Binary payloads":
  - Intents that carry a file (`add-book`, `edit-book`, `restore`) are `multipart/form-data`, with a JSON `intent` part plus a file part. They are still one intent and one commit.
  - Export is `GET /api/export` (a zip), and `export`/`restore` are modules under `intents/` that call `store/`.
  - Covers are served at `/covers/<filename>`, where the filename is stored on the Book and includes a content hash (`<book-id>-<hash8>.<ext>`), so a replaced cover gets a new URL.
  - Update the dependency rule and the map to match.

### F2 [High] Validation errors: FastAPI's own 422 shape and the single `field` break AD-9
- **Location:** AD-9; AD-3; Agent Label Contract validation table.
- **Problem:**
  - Pydantic and FastAPI return `422 {"detail":[...]}` for body validation, which bypasses the envelope.
  - The UX lists **every** failing field in one `alert` ("*Label* is required." per field), but the envelope allows only one `field`.
  - It is unstated whether field rules run on the client. AD-3 forbids putting them there, so the server must return all of them at once.
  - "409 or 422" is left to each endpoint.
- **Fix:** Amend AD-9:
  - Add `fields?: [{field, code, message}]` (or replace `field` with it).
  - Register a `RequestValidationError` handler that maps to `kind: refusal, code: invalid_fields` with the list.
  - Use 422 for field/shape refusals and 409 for state-rule refusals (`duplicate_book`, page below current, and so on).
  - The client renders server messages only and does no client-side rule checks.

### F3 [Medium] Reading identity and status derivation are ambiguous
- **Location:** Structural Seed ER diagram and the status sentence; AD-11; AD-3.
- **Problem:**
  - The root holds `mainBookId`/`upNextBookId`, but a Book can hold finished Readings plus one active or paused Reading, and FR-1 lets a back-filled Reading be added beside a current one.
  - "Status derived from dates and whether it is the Main book's current Reading" doesn't define "current Reading". It doesn't say whether two unfinished Readings may coexist, or whether `pausedAt` or Main membership decides paused.
  - Intents like `update-page`/`finish-reading` could target "whatever is Main now" or an explicit Reading. Under A2 (two tabs), the "Start X? This pauses Y" confirmation can silently pause Z.
- **Fix:** Add invariants:
  - (a) A Book has at most one unfinished Reading.
  - (b) Status is `finished` if `finishDate` is set, `active` if it is the Main book's unfinished Reading, and `paused` otherwise (with `pausedAt` required).
  - (c) Every intent names its target by id (`bookId`/`readingId`), never "the current Main". Intents with a displayed trade-off carry `expectedMainBookId`/`expectedUpNextBookId` and refuse with `stale_view` on mismatch. Or log explicitly in the memlog that A2 accepts silent displacement.

### F4 [Medium] Operational envelope partly silent: install build, upgrade safety, shutdown, port conflict, restore input safety
- **Location:** Stack / Structural Seed ("ships the built `frontend/dist`"); AD-5; AD-13; AD-14; AD-16; Deferred. There is no Open Questions section.
- **Problem:**
  - **Install:** who builds `frontend/dist` before `uv tool install`? A build hook or a committed `dist`? Without it the installed tool has no SPA.
  - **Upgrade:** startup migration rewrites `library.json` with no pre-migration copy. That conflicts with "No action silently deletes data". The upgrade command (`uv tool install --reinstall` / `uv tool upgrade`) is unstated.
  - **Operations:** shutdown (Ctrl-C/SIGTERM) and whether lock removal and in-flight writes complete are unstated. Behavior when 8765 is held by another program is undefined, and the agent skill depends on that URL.
  - **Security:**
    - Restore input is unbounded: zip-slip paths, a zip bomb, non-image files in `covers/`.
    - Uploads have no size limit.
    - "No auth, any local process can call the API" is an implicit trade-off, not recorded.
    - Dev mode breaks AD-16: browser requests through the Vite proxy carry `Origin: http://localhost:5173`, which AD-16 rejects.
- **Fix:** Add an "Operations" block or ADs:
  - The package build runs `npm ci && npm run build` (hatch build hook), and `dist` is not committed.
  - Before any migration, copy `library.json` to `library.v<N>.bak.json`.
  - SIGINT/SIGTERM waits for the write lock, then removes `bookvie.lock`.
  - If the port is busy and not ours, exit with a clear message (no silent fallback).
  - Restore accepts only `library.json` and `covers/<name>` entries, rejects `..`/absolute paths, and caps the total uncompressed size. Covers are re-validated with Pillow, and uploads are capped.
  - `--dev` adds `localhost:5173` to the Origin allowlist.
  - Record "no auth: any local user/process is trusted" as an explicit decision.
  - Add an Open Questions section, even if empty.

### F5 [Medium] AD-14 restore swap isn't crash-safe; "byte-identical" conflicts with migration
- **Location:** AD-14; AD-12 (startup orphan sweep); the data-folder tree.
- **Problem:**
  - "Replace the covers folder, then the document" is two renames. A crash between them leaves new covers with the old document, and the startup orphan sweep (AD-12) then **deletes** the new covers that the old document doesn't reference. That is silent data loss.
  - The staging folder name isn't in the fixed layout, and startup doesn't clean it.
  - The "byte-identical library.json" round trip can't hold when restoring an older `schemaVersion`, because migration rewrites it.
  - Deterministic serialization (key order, indent, encoding) isn't fixed, so export → restore → export may differ by unit.
- **Fix:**
  - Fix the staging name `.restore-staging/`, and add it plus `covers.old/` to the tree.
  - Swap sequence: rename `covers` → `covers.old`, staging covers → `covers`, document via AD-2, then delete `covers.old`.
  - Startup: if `covers.old/` exists, roll back or roll forward based on which covers the document references, before the orphan sweep, and delete stale staging.
  - Fix serialization (`sort_keys` off, Pydantic field order, 2-space indent, UTF-8, trailing newline).
  - Scope "byte-identical" to same-`schemaVersion` round trips.

### F6 [Medium] AD-7 "refetches the views it affects" plus a deferred fetching library lets units diverge; AD-6 is silent on filter chips and shuffle
- **Location:** AD-7; AD-6; Deferred first bullet; FR-18 and FR-20 rows.
- **Problem:**
  - Which views an intent "affects" is left to each feature. With TanStack Query keys chosen per story, a Card-note intent might not refresh the Home or stats views, which is a stale UI.
  - AD-6 says every domain ordering is server-side but lists only text filtering as a client allowance. It is unclear whether Read/Unread/Type/Language/Tag chips are server query parameters or client filters, and whether the pile shuffle (FR-18) is client or server.
- **Fix:**
  - Simplify AD-7 to "after every intent response, invalidate **all** cached views". That is cheap at this scale.
  - Fix the query-key convention to `['view', <name>, params]`.
  - In AD-6, state that sort and chip filters are query parameters of `views/catalog` (the server returns ordered and filtered Books and bookcase spines), and that the pile's shuffle order is ephemeral client presentation.

### F7 [Low] Quick pace calculator rounding differs from days-left rounding
- **Location:** AD-6 (c); FR-11; FR-15.
- **Problem:** The client computes the calculator's result while the server computes "~N days left", and the rounding and finish-date rule (ceil, today + N, whether today counts) aren't fixed. At the Measured pace, the two can disagree by a day.
- **Fix:** Add to AD-6 (c): days = ceil(pagesLeft / pace), finish date = local today + days, the same formula as FR-11. Or have the view return a small `pace` helper spec.

### F8 [Low] Contract freshness check and e2e clock are unspecified
- **Location:** AD-8 ("the check fails"); Testing convention; Deferred CI.
- **Problem:** No command or hook is named for the stale-types check, so it may never run. Tests of "not in the future", "N days ago" and stats need a controllable clock across server and browser.
- **Fix:** Name the check (for example `uv run bookvie-gen-types --check` in a pre-commit hook or in `just check`). Add a test-only `--today YYYY-MM-DD` server flag, or an injected clock in `domain/`, and match it with Playwright's `clock.install`.

### F9 [Low] Terseness and status hygiene
- **Location:** Structural Seed paragraph under the ER diagram ("They aren't flags scattered across Books, so 'at most one' is enforced structurally"); Deferred CI ("none is required for a single-user local app"); AD tags.
- **Problem:**
  - Those sentences are rationale and belong in the memlog.
  - The `[ADOPTED]` tags don't match the memlog. AD-16 is tagged ADOPTED, but the memlog records it as a "Distill addition" (not user-adopted). AD-12 mixes an accepted lean (downscale) with a distill addition (write order). AD-17 appears in the memlog only as part of a lean.
  - There are no template comments. All three mermaid diagrams (two flowcharts, one erDiagram) are syntactically valid.
- **Fix:**
  - Move the two sentences to the memlog.
  - Reconcile the tags: either have the user adopt the distill additions, or drop `[ADOPTED]` from AD-16.
  - Make sure every AD has a matching memlog line.

## FR coverage check

| FR | In `binds` | In map | Note |
|---|---|---|---|
| FR-1 | yes | yes | Cover on add needs F1. Finished-on back-fill is covered by AD-11. Pages-below-current refusal: add a code to the AD-9 enum list |
| FR-2 | yes | yes | AD-17 is good. Outcome exposure depends on F2 (multi-field) |
| FR-3 | yes | yes | AD-10 is solid |
| FR-4, FR-20, FR-24 | yes | yes | Chip filter placement: F6 |
| FR-5 to FR-9 | yes | yes | Reading identity and stale confirmation: F3 |
| FR-10, FR-11 | yes | yes | Rounding: F7 |
| FR-14 | yes | yes | "Not before start" uses the server clock; fine (same machine) |
| FR-15 | yes | yes | `views/` is vague; name the view (for example `views/pace`) |
| FR-16 | yes | yes | ok |
| FR-17 to FR-19 | yes | yes | Shuffle owner: F6 |
| FR-21 | yes | yes | Serving URL: F1 |
| FR-22, FR-23 | yes | yes | Endpoint and layer: F1; crash safety: F5 |
| FR-12, FR-13 | retired | n/a | correct |

## Dimension coverage (criterion 5)

| Dimension | Status |
|---|---|
| Paradigm / layering | Decided |
| Data model and storage | Decided (gaps: F3, F5) |
| API contract and errors | Decided (gaps: F1, F2) |
| Client state / caching | Decided (gap: F6) |
| Concurrency | Decided (AD-4, AD-5); multi-tab staleness: F3 |
| Deployment / environments | Dev and prod topology decided; dev Origin conflict (F4) |
| Install / upgrade | Install decided; build step and upgrade backup silent (F4) |
| Operations (logs, start/stop, ports) | Logs decided; shutdown and port conflict silent (F4) |
| Security | Loopback and Host/Origin decided; restore and upload input safety, plus the no-auth trade-off, silent (F4) |
| Testing | Decided; clock and check command gaps (F8) |
| Performance | Deferred with a threshold; fine |
| Open questions | Section missing |
