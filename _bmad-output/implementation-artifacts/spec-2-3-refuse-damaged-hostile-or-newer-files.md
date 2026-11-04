---
title: 'Story 2.3: Refuse damaged, hostile or newer files'
type: 'feature'
created: '2026-11-04'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b3a13d9cc116110c3a4a805b7fb3785d890452ab'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-2-3-refuse-damaged-hostile-or-newer-files.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.2's restore refuses every bad file as one catch-all 422 `restore_invalid`, and it accepts hostile archives (symlinks, duplicates, case-colliding names, too many entries, oversized uploads or extractions) with 200, replacing the library.

**Approach:** Split two refusal codes out of the catch-all: `restore_newer_version` (its own copy) and `restore_unsafe` (`restore_invalid`'s copy). Enforce the AD-14 archive-safety rules and limits before anything is written outside `.staging/`, and turn on the 5 ATDD leaves (`backend/tests/test_restore_refusals.py`, `frontend/e2e/restore-refusals.spec.ts`). The criteria are epics.md → Story 2.3 = AC-1…AC-5 in the checklist, whose "Contract the Scaffolds Pin" fixes every name, value and copy string.

## Boundaries & Constraints

**Always:**
- **Precedence:** not a zip → `restore_invalid`; then every `restore_unsafe` rule (shape, paths, symlinks, duplicates, entry count, upload size), checked on `infolist()` before any entry is unpacked; then a missing `library.json` → invalid; then unpacking (extraction cap → unsafe, damage → invalid); then `schemaVersion` newer → `restore_newer_version`, which is decided before model validation and cover checks; then everything else → invalid.
- Limits are module attributes of `bookvie.store.restore`, read at call time: `MAX_UPLOAD_BYTES = 1024**3`, `MAX_ENTRIES = 5_000`, `MAX_EXTRACTED_BYTES = 1024**3`. 5,000 entries, and exactly-at-limit sizes, are allowed.
- The extracted size is counted on bytes actually written to `.staging/`, and extraction stops before writing the chunk that passes the cap. Headers are never trusted. An entry that inflates past its declared size is `restore_unsafe`, not damage.
- Duplicate names compare under `casefold()`. An archive cover whose casefolded name matches a differently-cased name already in `covers/` is also `restore_unsafe` (closes both 2.2 case-collision deferrals).
- The upload cap is enforced while the body streams in, before the route runs or the lock is taken, and checked exactly on the spooled file in `stage_archive`.
- Startup keeps its exact `StartupError` messages. Every refusal empties `.staging/`; `local-state.json` is never touched.

**Decisions (planning, confirming the ATDD checklist's assumptions; same user copy either way):**
- "1 GB" is 1 GiB.
- A body over the streaming cap is 422 `restore_unsafe`, not 413.

**Never:**
- Unicode-normalization (NFC/NFD) collisions; streaming the browser's FormData (deferred item); routing `.staging/` writes through the `FileSystem` seam; frontend production changes (the page already shows the server's message).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Newer version | `schemaVersion` = current + 1, unknown fields, covers missing | 422 `restore_newer_version` | Nothing changes |
| Hostile + broken | `../x` entry and bad `library.json` | 422 `restore_unsafe` | Nothing changes |
| Understated header | 2 MiB declared as 1,000 bytes, total past the cap | 422 `restore_unsafe`; staging never holds more than the cap | Nothing changes |
| Boundaries | 5,000 entries; upload or extraction exactly at the limit | 200 | N/A |
| Oversized body | Body > cap + framing slack | 422 `restore_unsafe`, lock never taken | Nothing changes |

</frozen-after-approval>

## Code Map

- `backend/bookvie/store/restore.py` -- `stage_archive`, `_copy_entry`, `ArchiveRefused`, `_READ_ERRORS`. Add the limits, `ArchiveUnsafe(ArchiveRefused)`, an `infolist()` safety pass, a running written-bytes budget, and the spooled-size check.
- `backend/bookvie/store/store.py:151` `parse_document` -- raises `LibraryRefused` on a newer version. Raise `LibraryNewer(LibraryRefused)` instead, with the same reason text, so startup is unchanged. `Store.replace_all` gets the existing-name casefold collision check, or `stage_archive` gets the `covers/` listing through a store method (AD-1: store owns the folder).
- `backend/bookvie/store/__init__.py` -- export `ArchiveUnsafe`, `LibraryNewer`.
- `backend/bookvie/intents/contract.py` -- `ErrorCode.RESTORE_NEWER_VERSION`/`RESTORE_UNSAFE`, `RESTORE_NEWER_VERSION_MESSAGE`, `restore_newer_version()`, `restore_unsafe()` (422, refusal), mirroring `restore_invalid()`.
- `backend/bookvie/intents/restore.py` -- `_restore_locked` exception mapping. Log lines: `couldn't restore: the file <reason>` (unsafe) and `couldn't restore: library.json is schemaVersion N, newer than M`. Expose `max_upload_bytes()` for http (http must not import store).
- `backend/bookvie/http/api.py:102` `CoverSizeCap` -- generalize to a body cap with per-route limit and refusal. Restore: limit `max_upload_bytes() + 64 KiB` read per request, refusal 422 `restore_unsafe`. Covers keep 413 and `BODY_LIMIT`. `test_the_cover_cap_does_not_apply_to_restore` must stay green. `http/app.py:162` installs it.
- `backend/tests/test_restore.py` -- delete `test_a_newer_schema_version_is_422_restore_invalid_until_story_2_3` and `test_a_zip_with_an_extra_entry_is_422_restore_invalid`. Repoint the docstring (l.20) and the section comment (l.463) to `test_restore_refusals.py`.
- `backend/tests/test_restore_refusals.py` -- remove the 4 `@pytest.mark.skip(reason=RED)` and the `RED` constant. Pin `restore_unsafe` in the understated-header block (its comment changes).
- `frontend/e2e/restore-refusals.spec.ts` -- `test.skip(` → `test(`. `frontend/src/api/generated/schema.d.ts` -- `npm run check:api` / `api:gen`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/store/store.py`, `store/__init__.py` -- `LibraryNewer`; existing-name collision check.
- [x] `backend/bookvie/store/restore.py` -- limits, `ArchiveUnsafe`, safety pass, byte budget (open each entry through a copied `ZipInfo` whose `file_size` is the remaining budget + 1; written > declared → unsafe), exact spooled-size check.
- [x] `backend/bookvie/intents/contract.py`, `intents/restore.py` -- codes, factories, mapping, `max_upload_bytes()`.
- [x] `backend/bookvie/http/api.py`, `http/app.py` -- generalized body cap on the restore route.
- [x] `frontend/src/api/generated/schema.d.ts` -- regenerate.
- [x] `backend/tests/test_restore.py`, `test_restore_refusals.py`, `test_contract.py`, `frontend/e2e/restore-refusals.spec.ts` -- activate the leaves, delete the two superseded tests, add the checklist's green-phase follow-ups: the four codes in the `ErrorCode`/OpenAPI enum; boundaries (5,000 entries, exact upload and extraction size restore); order (unsafe beats a broken or newer `library.json`); staging never exceeds the cap; an over-count archive stages nothing; the streaming cap refuses without the lock (`RecordingLock`); a newer export missing its covers is still `restore_newer_version`; the existing-name case collision; dark-theme ink + Axe with the line shown.
- [x] `README.md` -- mention that bad, hostile and newer files are refused (restore paragraph).

**Acceptance Criteria:**
- Given the 5 ATDD leaves un-skipped, when the suites run, then all pass, and `e2e-count` reports nothing skipped.
- Given any startup refusal, when the server starts, then its message is unchanged (existing pinned test stays green).
- Given an archive refused as `restore_unsafe`, when it is posted, then the `FileSystem` seam logs no rename or delete outside `.staging/`.

### Review Findings

Review pass 2 (2026-11-04): five layers (blind, edge, verification-gap, acceptance, spine) on `b3a13d9..9bb69cd`.

- [x] [Review][Patch] (from Decision, Oleg chose: add a central-directory size cap — refuse `restore_unsafe` before `ZipFile()` when the EOCD central-directory size exceeds `MAX_ENTRIES × 1 KiB`) The 5,000-entry cap runs only after `zipfile.ZipFile(upload)` has parsed the whole central directory — `ZipFile()` builds one `ZipInfo` per central-directory record before `_check_entries` sees `len(infos)`. Probe: 200,000 empty entries in a 17 MB zip peak at 117 MB (≈583 B/entry), so a 1 GiB upload of tiny entries (≈12–23 M records) needs ≈7–13 GB of memory and long parsing under the store lock. The EOCD entry count can't be trusted (`zipfile` loops on the central-directory *size*), so a pre-check needs a new bound, e.g. refuse when the EOCD central-directory size exceeds `MAX_ENTRIES × <per-entry allowance>`, read before `ZipFile()` is built. (blind+edge)
- [x] [Review][Patch] `intents/restore.py` docstring says `restore_unsafe` is "checked first", but "not a zip → `restore_invalid`" precedes it [backend/bookvie/intents/restore.py:13]
- [x] [Review][Patch] README restore paragraph omits two user-visible refusals: a cover that differs only in case from one already in `covers/`, and an entry that unpacks past its declared size [README.md:115]
- [x] [Review][Patch] `api.py` module docstring: "It also caps `restore`'s body…" reads as "the route"; name `BodySizeCap` [backend/bookvie/http/api.py:16]
- [x] [Review][Patch] Tests hard-code the 64 KiB framing slack instead of importing `FRAMING_SLACK` [backend/tests/test_contract.py:503, backend/tests/test_restore_refusals.py:638]
- [x] [Review][Defer] A `library.json` up to the 1 GiB extraction budget is read whole (`read_bytes`) and JSON-parsed in memory [backend/bookvie/store/restore.py:251] — deferred: within the spec-approved limit; a separate, smaller `library.json` cap would need a spec/AD-14 decision.
- [x] [Review][Defer] AD-14 (spine and `epic-2-context.md` l.40–42) still says "duplicate names", "1 GB", damaged → invalid, and gives neither the refusal precedence nor the restore body cap (422 at upload + 64 KiB slack) [_bmad-output/implementation-artifacts/epic-2-context.md:40] — deferred: extends the existing "Reconcile ARCHITECTURE-SPINE AD-14 with Story 2.3" item; spine/context edits are out of story scope.

**Rejected (pass 2):**
- NFC/NFD collisions (edge) — low: the frozen Never excludes them.
- `covers/` and `covers//` both accepted (blind) — false: directory entries are never written, so nothing collides.
- Existing-name casefold map can drop one of two case-variant names / casefold ≠ APFS folding (blind) — low: minted names are lowercase UUIDs; only hand-edited folders reach it, and the result is an over-refusal.
- `_unsafe_name` backslash/drive branches untested (blind) — low: any such name also fails the shape check, which is `ArchiveUnsafe` too, so no outcome changes.
- A newer export with a damaged cover gets `restore_invalid` (blind) — low: the frozen precedence puts unpacking before the version check; the fix edits the spec.
- `test_ac3_a_body_over_the_streaming_cap…` exercises the Content-Length branch (blind) — false: it pins the restore cap and "no lock"; the streamed branch is pinned in `test_contract.py`.
- `intents/restore.py` imports `bookvie.store.restore` directly (blind) — low: the module attribute must be read at call time for monkeypatching; layering allows `intents → store`.
- Spec `review_loop_iteration: 0` stale (blind) — rejected: the fix edits the spec.
- `epic-2-context.md` gains an unrelated "Export request guard" bullet (blind, acceptance) — low: it is accurate (AD-16, spine-checked) and harmless.
- `test_restore.py` docstring still says "catch-all" `restore_invalid` (acceptance) — false: `restore_invalid` is still the catch-all for the cases listed there.
- Damaged vs inflated entry decided by entry order (acceptance) — low: the spec doesn't rank them and the user copy is identical.

## Design Notes

**Catching understated headers:** `zipfile` stops after the declared `file_size` and then fails the CRC, so a bomb looks like damage. Opening the entry through `copy.copy(info)` with `file_size = budget + 1` lets the decompressor run to the real end of the stream (bounded by the budget). The copy carries no CRC, so `_copy_entry` checks it itself over the bytes written (see Implementation Notes). Probed on 3.14: 2 MiB declared as 1,000 gives 2,097,152 bytes read.

**Framing slack:** the multipart body is larger than the file, so the streaming cap is `MAX_UPLOAD_BYTES + 64 KiB`. The exact cap is the spooled file's size. This is how AC-3's "limit = export size − 1" case is refused.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, coverage gate OK.
- `npm run check` -- expected: py, api, e2e and smoke green; no skipped E2E.

## Implementation Notes

- **CRC with the budget copy:** with `file_size = budget + 1`, `zipfile` hits its own end at the budget and fails the CRC on the cut stream before the over-budget chunk is returned, so a bomb past the cap read as damage. The copied `ZipInfo` therefore has its `CRC` deleted, and `_copy_entry` computes `zlib.crc32` over the bytes written and compares it with the header's CRC once the stream ended within the budget (a mismatch is still `restore_invalid`, with the same `Bad CRC-32 for file '…'` log text).
- **Body cap:** `CoverSizeCap` became `BodySizeCap(app, caps=BODY_CAPS)` with a per-route `BodyCap(limit, refusal)`; `limit()` is read per request. `test_contract.py` was updated to the new name.
- **Case collision with `covers/`:** `Store.cover_names()` lists `covers/`; `stage_archive` refuses a cover whose casefolded name matches a differently-named existing file, before unpacking.

## Spec Change Log

## Review Triage Log

Review pass 1 (2026-11-04): four layers (blind, edge, verification-gap, spine) on `b3a13d9..` working tree, `_bmad-output/` and generated types excluded.

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | VG | The `cover_names()` OSError → 503 `couldnt_save` branch in `_check_entries` is untested | medium | No test makes listing `covers/` fail; dropping the wrap passes every test. | patch |
| 2 | blind, edge | `test_ac3_the_limits_themselves_are_allowed` reuses one target for two cases | low | `target-{len(limits)}-{len(archive)}` is the same for the upload and extraction cases; direct fix. | patch |
| 3 | edge | `test_intent_routes.py:204` comment names the removed `CoverSizeCap` | low | Direct text fix. | patch |
| 4 | spine | AD-14 says "no duplicate names"; code also folds case and checks existing `covers/` | low | Spec Always rule; spine text not updated. | defer |
| 5 | spine | AD-14 gives a damaged file to `restore_invalid`; an understated entry under the cap is `restore_unsafe` | low | Spec Always rule; spine text drift. | defer (with 4) |
| 6 | spine | AD-14 "1 GB" vs code 1 GiB | low | Spec decision; spine text drift. | defer (with 4) |
| 7 | blind, edge | Upload size is checked after `ZipFile(...)`, so an oversized non-zip is `restore_invalid` | false | The frozen precedence puts "not a zip" first; the middleware still bounds the body at limit + 64 KiB. | reject |
| 8 | blind | An entry that unpacks to fewer bytes than declared is accepted | low | CRC still matches the bytes written, so content is intact; crafted only, and the fix adds a branch. | reject |
| 9 | blind | `library.json` is parsed only after every cover is unpacked | low | 2.2's pipeline order; costs time on a refused archive, never data. | reject |
| 10 | blind, edge | `_is_symlink` ignores `create_system` | low | The checklist pins `external_attr >> 16`; exports and common zippers set Unix or zero high bits. | reject |
| 11 | blind | Missing tests: archive-vs-archive case dup, same-name different bytes | false | AC-3 case 9 covers archive case dups; 2.2's `test_restore.py` pins the kept differing cover. | reject |
| 12 | blind, edge | NFC/NFD collisions not caught | low | The frozen Never excludes them. | reject |
| 13 | blind | The 422 body cap may surface as a connection reset in a real browser | maybe-false | Same early-response pattern as the existing 413 cover cap; settle with an E2E upload over a lowered cap against uvicorn. | defer |
| 14 | blind | The middleware refusal logs nothing | low | The cover cap doesn't log either; adds behavior. | reject |
| 15 | blind | `os.geteuid` skip guard fails on Windows | low | bookvie is a local macOS/Linux app; existing tests use POSIX calls. | reject |
| 16 | blind | `test_every_restore_refusal_code_is_in_the_ad9_enum` duplicates `test_openapi_error_enums` | low | Checklist asked for it explicitly; harmless. | reject |
| 17 | blind | Test helper names still say "cover" (`_endless_cover`, …) | low | Cosmetic. | reject |
| 18 | blind | AxeBuilder import splits the `node:` imports | false | oxlint/`npm run check` is green; no sort rule fires. | reject |
| 19 | blind | Diff leaves out `schema.d.ts`, spec, sprint-status | false | Excluded on purpose (2.2 triage #11); `check:api` passed on the tree. | reject |
| 20 | edge | A newer export with a new top-level entry gets `restore_unsafe`, not `restore_newer_version` | low | The approved precedence puts the shape check first; only a future format that adds entries reaches it. | reject |
