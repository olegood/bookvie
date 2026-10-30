---
title: 'Story 1.7: Accept a new book only when it is complete'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '166f637c4325025c830a7dc7f6131d22db7f9b71'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way to add a Book: no `add-book` intent, no field validation, no injected Clock for "today", and the catalog view lacks authors, pages, `createdAt` and the library's tags.

**Approach:** Land the AD-20 Clock (server side), then `POST /api/intents/add-book` that trims, validates every field against the Agent Label Contract table, normalizes authors/tags, assigns the curated spine color, back-fills Finished on, and commits once through `commit()`. Extend the catalog view and turn on the 8 ATDD scaffolds in `backend/tests/test_add_book.py`.

## Boundaries & Constraints

**Always:** Messages are the EXPERIENCE.md table's exact copy; `fields` lists every failure in form order (Title, Subtitle, Pages, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Finished on, Tags, Spine color), one entry per field, keyed by the camelCase intent key. Validate fully before touching the store; nothing is saved on 422. Layer rules hold (`http` imports neither `domain` nor `store`). `domain/` reads time only through `Clock`. Generated TS types stay in sync (`npm run api:gen`).

Decisions: the top-level 422 message names fields by **label** ("Not saved. 2 fields need attention: Pages, Language.", per E:300), other intents keep keys. An omitted `edition` is 1; an empty one is "Edition is required.". An invalid Type value → "Type must be Paperback, Hardcover or Ebook."; a Finished on that isn't a `YYYY-MM-DD` date → "Finished on must be a date, like 2026-03-14." (table has no row; UI can't reach either). ISBN, subtitle and spine color are stored trimmed as entered, empty → null; ISBN-13 may not end in X. Curated color is `CURATED[len(books) % 8]`. Catalog `tags` merges ignoring case, first spelling in library order. A malformed `intent` part (missing, not a JSON object, unknown key, non-string value) is 422 `invalid_fields` with field `intent`, message "The intent must be a JSON object of the form's fields.".

**Never:** No cover upload (Story 1.13), no duplicate check (1.9), no UI (1.8). No Playwright clock/`timezoneId` wiring (deferred to 1.8, first e2e that needs it). No edits to planning docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid add | required fields only | 200 `{ok, ids:{bookId}}`; Book stored with defaults | N/A |
| Everything wrong | AC-3 payload | 422, 11 field messages, file byte-identical | nothing committed |
| Rule edges | pages 1, ISBN `0 8044 2957 X`, year next year, Finished on today, `#a1B2c3` | 200 | N/A |
| Number rules | pages `abc`, `12.5`, `-3`, `007` | first three refused ("…whole number, 1 or more."); `007` → 7 | N/A |
| Year | `65`, `19650`, today+2 years | "Year must be a year, like 1965." | N/A |
| Seam fault | write/fsync/replace fails | 503 `couldnt_save`, file unchanged | via `commit()` |

</frozen-after-approval>

## Code Map

- `backend/bookvie/domain/model.py` -- `Book`, `Reading`, `BookType`; strict, `extra="forbid"`. Reuse as is.
- `backend/bookvie/domain/invariants.py` -- `check_invariants`; add ID uniqueness (deferred-work, Story 1.4 review).
- `backend/bookvie/intents/contract.py` -- `OkResponse.ids: list[str]` → `dict[str, str]`; `invalid_fields(errors)` builds the top message from keys.
- `backend/bookvie/intents/commit.py` -- `commit(store, change)`; maps faults to 503/500. Don't change.
- `backend/bookvie/store/store.py:216` -- `apply(change)` deep-copies, re-validates, checks invariants under the lock.
- `backend/bookvie/http/api.py` -- `router`, `EXTRA_SCHEMAS` (drop `OkResponse` once a route returns it), handlers; `_validation_error` maps FastAPI errors.
- `backend/bookvie/http/app.py:87` -- `create_app(...)`; add `clock` kwarg kept on `app.state.clock`.
- `backend/bookvie/cli.py:25,163` -- `parse_args`, `create_app` call.
- `backend/bookvie/views/{models,shelf}.py` -- `ShelfBook`, `CatalogView`, `catalog()`; `home()` reuses `_shelf_book`.
- `backend/tests/test_add_book.py` -- 8 skipped scaffolds; un-skip, don't weaken. Pins `FakeClock(today)` in `bookvie.domain.clock`, `create_app(clock=)`.
- `backend/tests/{test_contract,test_views,test_cli,test_layers,test_invariants}.py`, `builder.py` (`CURATED`) -- update/extend.
- `frontend/src/api/envelope.ts` (+ tests `envelope.test.ts`, `intents.test.ts`) -- parses `ids` as `string[]`; becomes `Record<string,string>`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/clock.py` -- `Clock` protocol (`now()` aware local, `today()`), `SystemClock`, `FakeClock(today)` (now = local noon on today); export from `domain`.
- [x] `backend/tests/conftest.py`, `package.json` `check:py` -- pin `TZ=Europe/Madrid` (+ `time.tzset()`); test DST days 2026-03-29/2026-10-25 keep the local date; `test_layers.py`-style AST test: no `datetime.now`/`date.today`/`time.time` in `domain/` outside `clock.py`.
- [x] `backend/bookvie/cli.py` -- `--fake-today YYYY-MM-DD`, error unless `--no-browser`; pass `FakeClock`/`SystemClock` to `create_app`; tests in `test_cli.py`.
- [x] `backend/bookvie/domain/invariants.py` -- unique Book IDs; unique Reading and Card note IDs within a Book; tests.
- [x] `backend/bookvie/domain/book_fields.py` -- pure parse/validate of the raw strings → normalized values or ordered `(key, message)` failures; labels map; curated palette constant.
- [x] `backend/bookvie/intents/add_book.py` -- `AddBookIntent` (optional `str` fields, camelCase, `extra="forbid"`, strict); `add_book(store, clock, intent) -> str` validates, then `commit()` appends the Book (uuid4, `clock.now()`, curated, resolved color, back-fill Reading) and returns its id.
- [x] `backend/bookvie/intents/contract.py` -- `ids: dict[str, str] | None`; `invalid_fields(errors, labels=None)`.
- [x] `backend/bookvie/http/{api,app}.py` -- route reading form part `intent` (str), JSON-parse → `AddBookIntent`, malformed → `intent` field error; returns `OkResponse(ids={"bookId": …})`. Clock via `app.state.clock` (default `intents.SystemClock`, re-exported).
- [x] `backend/bookvie/views/{models,shelf}.py` -- `ShelfBook.authors`, `pages`, `created_at`; `CatalogView.tags`.
- [x] `backend/tests/test_add_book.py` -- un-skip all 8; add a table test for the matrix rows and the decided messages, label-based top message, malformed `intent`, unknown key, two adds get distinct ids.
- [x] `frontend/src/api/envelope.ts` + tests; `npm run api:gen` -- `ids` as object.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark Clock item `resolved: partly, Story 1.7 (server Clock, --fake-today, TZ pin); Playwright timezoneId/page.clock remain for Story 1.8`, and uniqueness item partly resolved (ID rules; side-read rules remain).

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 8 ATDD tests active, coverage gates met, and `~/bookvie-data` unchanged.
- Given `bookvie --fake-today 2026-10-30` without `--no-browser`, when parsed, then it exits with a usage error.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `--fake-today` accepts ISO week dates (`2026-W44-5`) | low | patch | Verified: `date.fromisoformat("2026-W44-5")` → 2026-10-30 and the length check passes; fix is a strict regex. |
| 2 | Deeply nested `intent` JSON → `RecursionError` → 500, not 422 | low | patch | Verified: `json.loads('['*200000)` raises RecursionError, which `parse_add_book_intent` doesn't catch; fix adds it to the except. |
| 3 | Year `0000` accepted | low | patch | `_year` has no lower bound and `Book.year: int \| None`; "0" isn't a year "like 1965". Direct fix: `1 <= year`. |
| 4 | Time-read AST guard misses `datetime.today()` | low | patch | `_FORBIDDEN` lacks `("datetime","today")`, which reads the clock; one-entry addition. |
| 5 | AST guard misses aliased imports, `time_ns`, `fromtimestamp` etc. | low | reject | No such code exists in domain/; alias resolution adds complexity for an unlikely pattern. |
| 6 | DST tests only check noon; comment says "every hour that exists" but loops hour 2 on 2026-03-29 | low | patch | Noon-only is what the spec asked ("DST days keep the local date"); comment is inaccurate, fix the wording only. |
| 7 | Deferred-work note under-reports: `check:e2e` TZ pin still open | low | patch | `package.json` pins TZ only on `check:py`; note should say `check:e2e` TZ pin remains for 1.8. |
| 8 | Unbounded Pages/Edition loses precision in JS | low | reject | Needs a new max constant the spec doesn't define; not met in everyday use. |
| 9 | `intent` part sent as a file gets pydantic message, not the decided one | low | reject | Only reachable by a hand-crafted client; fix adds UploadFile handling. |
| 10 | http reaches domain's Clock via `intents` re-export; `FakeClock` exported | false | reject | The spec prescribes this ("default `intents.SystemClock`, re-exported"); layer test passes by design. |
| 11 | `intent` documented as optional in OpenAPI | low | reject | Cosmetic contract wording; fixing needs a custom missing-field mapping. |
| 12 | No frontend helper for the multipart body | false | reject | UI is 1.8 (Never list); `intents.ts` already sends `FormData` bodies. |
| 13 | No length/count limits on text fields | low | reject | Not in intent or EXPERIENCE table; local single-user app; adds new rules. |
| 14 | Authors not deduplicated | low | reject | Spec decides only tag merging; author duplicates are rare and a new rule. |
| 15 | User spine color stored in typed case | false | reject | Spec decision: "stored trimmed as entered". |
| 16 | Spec vs sprint-status status mismatch | false | reject | Workflow sets both; sprint-status syncs at presentation. |
| 17 | Empty `EXTRA_SCHEMAS` kept; unused `reading_id` minted | low | reject | Mechanism kept for future contract-only models; an unused uuid is harmless. |

## Design Notes

Validation is pure and runs outside the store lock; only Book construction (curated color depends on `len(books)`) runs inside the `apply` change. Keeping parse/validate in `domain/book_fields.py` lets `edit-book` (1.11) and duplicate detection (1.9) reuse it.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_add_book.py -v` -- expected: 8+ pass, 0 skipped.
- `npm run check:py && npm run check:api` -- expected: exit 0.
- `npm run check` -- expected: exit 0.
