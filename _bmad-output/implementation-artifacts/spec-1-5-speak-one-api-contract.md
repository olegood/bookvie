---
title: 'Story 1.5: Speak one API contract'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '3ebd4a1e2dbb59f3a914254daab78861f990fc0c'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The server has no response envelope, error codes, views or generated TS types. FastAPI's `{detail}` would reach the browser, and the frontend `api/` module is a bare `fetch` with no query keys, invalidation or result typing.

**Approach:** Add the AD-9 envelope and error-code enum in `intents/`, with a shared commit path that maps store failures to `couldnt_save`. Add global handlers in `http/`, the `home` and `catalog` views, and an OpenAPI → `openapi-typescript` contract that `check:api` regenerates and diffs. Build the frontend `api/` module: the envelope parser, intent sender with invalidate-all, view queries with failed-load state, and focus/visibility refetch.

## Boundaries & Constraints

**Always:** Every `/api` error body is `{error: {kind, code, message, fields?}}`; `ErrorCode` and `ErrorKind` are enums in OpenAPI. A failed `check_invariants()`, a re-validation error or any unexpected exception in an intent → 500 `couldnt_save`, nothing committed, one `bookvie: …` line to stderr naming the rule or exception. `CouldntSave` → 503 `couldnt_save`. Message copy is server-owned: `couldnt_save` = "Couldn't save. Your data wasn't changed." Views are side-effect-free GETs reading only `store.library`. Generated types are never hand-edited. The client never patches cached data; every intent response, success or refusal, invalidates every `['view', …]` query and resolves only after the refetch. A network failure or a non-envelope body counts as `couldnt_save`.

**Never:** No real intents, field rules or field-label copy (Story 1.7). No refusal codes beyond `invalid_fields` and `couldnt_save`; later stories add each code with its test. No page or UI changes (Story 1.6 consumes the views). No new runtime or dev dependency. No `data-testid`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bad body | Missing field, wrong type or bad JSON to an intent route | 422 `invalid_fields`, `fields` lists every error by camelCase path; no `detail` key | N/A |
| Invariant fails | Change breaks an AD-18 rule | 500 `couldnt_save`; file byte-identical; stderr names the rule | N/A |
| Seam fault | Fails at write, fsync or rename | 503 `couldnt_save`; file byte-identical | N/A |
| Unexpected | Change raises `RuntimeError` | 500 `couldnt_save` envelope | N/A |
| Empty views | Empty library | `home` and `catalog`: `books: []`, meter 0 of 0 | N/A |
| Seeded views | 3 Books, one with a back-filled finish | Meter 1 of 3; each Book has id, title, first author, author count, spine color, finished | N/A |
| Contract drift | Model changed, types not regenerated | `npm run check:api` fails naming the file | N/A |
| Network down | `fetch` rejects | Intent → `couldnt_save`; view with no data → `failed`; view with data → keeps it, reports nothing | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookvie/http/app.py` -- `create_app(...)`; `app.state.store` holds the `Store` (duck-typed: `http` may not import `store`, see `tests/test_layers.py`). Unknown `/api` paths raise `HTTPException(404)`; leave that as is.
- `backend/bookvie/store/store.py:216` -- `Store.apply(change)` raises `InvariantViolation` (`.rule`), pydantic `ValidationError`, `CouldntSave`, or whatever `change` raises, all with nothing committed.
- `backend/bookvie/domain/model.py` -- `Library`, `Book` (`authors`, `spine_color`, `readings`), `Reading` (`finished_on`). Reuse the camelCase alias config for new models.
- `backend/tests/builder.py`, `conftest.py` -- `library_builder`; `test_store.py` shows the fault-injecting `FileSystem`.
- `frontend/src/api/client.ts` -- current `apiFetch`; replace. `src/main.tsx` builds the `QueryClient`.
- `frontend/tsconfig.{app,node}.json` -- app has `types: ["vite/client"]`; node has `types: ["node"]`, `module: nodenext`.
- TanStack v5 `focusManager` listens only to `visibilitychange`; add `focus` with `focusManager.setEventListener`.
- `.github/workflows/test.yml` lint job runs `npm run check:api`; the setup action already installs uv and Python.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/contract.py` -- `ErrorKind` (`refusal`, `couldnt_save`), `ErrorCode` (`invalid_fields`, `couldnt_save`), `FieldError`, `ErrorBody`, `ErrorResponse`, `OkResponse{ok: true, ids?, reachedLastPage?}`; `IntentError(status, body)` exception; `invalid_fields(errors)` builder. Message: "Not saved. N field(s) need attention: a, b."
- [x] `backend/bookvie/intents/commit.py` -- `commit(store, change)`: calls `store.apply`, maps failures per the Always rules into `IntentError`.
- [x] `backend/bookvie/views/{models,shelf}.py` -- `LibraryMeter{finished, total}`, `ShelfBook{id, title, firstAuthor, authorCount, spineColor, finished}`, `HomeView{meter, books}`, `CatalogView{meter, books}`; `home(library)` and `catalog(library)`. Finished = at least one Reading with `finishedOn`.
- [x] `backend/bookvie/http/app.py` (+ `http/api.py` if cleaner) -- `GET /api/views/home|catalog` with response models; a router-level `responses` mapping 422/409/500/503 to `ErrorResponse` (suppresses FastAPI's `HTTPValidationError`); handlers for `IntentError`, `RequestValidationError` and unexpected `Exception` on `/api`; `separate_input_output_schemas=False`.
- [x] `backend/scripts/openapi.py` -- prints `create_app().openapi()` as stable JSON.
- [x] `frontend/scripts/api-contract.mjs` -- runs the dump through `uv run --project ../backend`, converts it with the `openapi-typescript` Node API, and writes `src/api/generated/schema.d.ts` (`--write`) or exits 1 naming the file if it differs. Commit the generated file and drop `.gitkeep`.
- [x] `frontend/package.json` -- `api:gen`; `check:api` = contract check, `tsc -b`, `oxlint`, `node --test` on `src/api/*.test.ts`.
- [x] `frontend/src/api/{envelope,intents,views,queryClient,index}.ts` -- `parseIntentResponse` → `{kind: 'ok'|'refusal'|'couldnt_save', …}`; `sendIntent(client, verb, body)` (JSON or `FormData`) awaits `invalidateQueries({queryKey: ['view']})`; `viewKey`, `useHomeView`/`useCatalogView` returning `loading | failed(retry) | ready(data)` via a pure `toViewState`; `createQueryClient()` (`retry: false`, focus + visibility refetch). Update `main.tsx`; delete `client.ts`.
- [x] `frontend/tsconfig.*.json` -- exclude `*.test.ts` from app; include them in node.
- [x] `backend/tests/test_contract.py`, `test_views.py` + `frontend/src/api/*.test.ts` -- every matrix row (backend rows use test-only routes on a `create_app` instance); the OpenAPI enum values; envelope parsing, invalidate-all after success and refusal, `toViewState`, focus listener.

**Acceptance Criteria:**
- Given any `/api` validation failure or refusal, when the response is read, then it never has a top-level `detail` key.
- Given a fresh checkout, when `npm run check:api` runs, then it passes; after editing a view model without `api:gen`, it fails.
- Given `npm run check`, when it runs, then it exits 0, coverage gates hold, and `~/bookvie-data` is unchanged.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Iteration 0 (blind-hunter, edge-case-hunter, verification-gap):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | edge-case | Default TanStack `networkMode: 'online'` pauses queries while `navigator.onLine` is false | medium | `query-core/retryer.js` `canFetch` returns `onlineManager.isOnline()` for `online`; an offline laptop leaves views `loading` and `sendIntent` awaiting a paused refetch, against the "Network down" row | patch |
| 2 | verification-gap | `createQueryClient` focus-listener wiring never exercised | low | `typeof window` branch never runs under `node --test`; deleting `setEventListener` passes every test | patch |
| 3 | verification-gap, blind | Non-`/api` branch of `_unexpected_error` untested | low | No test raises outside `/api`; dropping the `_is_api` guard passes | patch |
| 4 | blind | 503 seam-fault test never checks the `bookvie:` stderr line | low | `test_seam_fault_is_503` asserts status/body/bytes only | patch |
| 5 | blind | `test_intent_error_body_omits_absent_fields` uses impossible 409 + `invalid_fields` | low | `invalid_fields` is always 422; direct correction | patch |
| 6 | verification-gap, blind | `.github/actions/setup/action.yml` says check:api never runs uv | low | `api-contract.mjs` now runs `uv run --project ../backend` | patch |
| 7 | verification-gap | `useHomeView`/`useCatalogView` bindings untested | low | Swapping nouns passes `tsc` and tests; no page consumes them yet | defer |
| 8 | blind | `uv run` without `--locked` in contract check | low | Same convention as existing `check:py`; rejected (pre-existing convention, unlikely) | reject |
| 9 | blind | Drift test repeats the standalone check | false | The passing case runs the `API_CONTRACT_TARGET` override path, which the standalone step does not, and is the control for the drift case | reject |
| 10 | blind | View GETs document 409/422/503 | low | Spec task mandates a router-level mapping; fix would edit the spec | reject |
| 11 | blind | `error.code as ErrorCode` accepts unknown codes | low | Server and SPA ship together; needs version skew; fix adds runtime validation | reject |
| 12 | blind | `COULDNT_SAVE_MESSAGE` duplicated client/server | low | Client copy only shows when no server message arrives; guard needs a cross-language test | reject |
| 13 | blind | `retry()` keeps showing `failed` while refetching | low | Local server answers fast; fix adds a `fetchStatus` branch; UI states belong to Story 1.6 | reject |
| 14 | blind, edge-case | `fetchView` / view data not shape-checked; 204 / null body | false | Any throw lands in query `error` → `failed`; server never returns 204 or null for views/intents | reject |
| 15 | blind | Spec `in-review` vs sprint `in-progress` | false | Workflow syncs sprint status at presentation | reject |
| 16 | blind | Two stderr `bookvie:` loggers | low | No named harm beyond style | reject |
| 17 | blind | `DOM` lib now on for e2e | low | e2e `page.evaluate` callbacks legitimately need DOM types | reject |
| 18 | blind | `createQueryClient` mutates global `focusManager` | false | `setEventListener` replaces the listener idempotently; one client per app | reject |
| 19 | blind, edge-case | `sendIntent` verb unencoded/unvalidated; no timeout | low | No callers yet; verbs are code constants; local server | reject |
| 20 | edge-case | 404/405 on `/api` return `{detail}` | low | Client already maps non-envelope bodies to `couldnt_save` (tested); enveloping needs a code the intent forbids adding | reject |
| 21 | edge-case | View with `store is None` → 500 | false | CLI always opens a store; only the schema dump builds a storeless app and never serves | reject |
| 22 | edge-case | Empty `loc` / empty `invalid_fields` list → "attention: ." | false | FastAPI locs always start with a source; no caller passes an empty list | reject |
| 23 | edge-case | `EXTRA_SCHEMAS` nested `$defs` dangle | false | `OkResponse` has no nested models | reject |
| 24 | edge-case | Misleading uv signal/ENOBUFS message; CRLF drift | low | Cosmetic / repo not checked out with autocrlf | reject |

## Design Notes

- **Envelope lives in `intents/`.** Intents raise refusals and `http` may import only `intents`/`views`, so `http` maps `IntentError` to JSON and never touches `store` exceptions.
- **Home view is a placeholder slice.** Until Stories 3.1/3.5 define the Home slice, `home` returns the same books and meter as `catalog`; only the empty case is contractual now.
- **`node:test`, not vitest.** Node 24 runs `.ts` natively, so `api/` logic is unit-tested without a new dependency.
- **`retry: false`.** The server is local; retries only delay the "Couldn't load" state.

## Verification

**Commands:**
- `npm run check:py` -- expected: all pass; coverage gates hold.
- `npm run check:api` -- expected: exit 0, no diff in `src/api/generated/`.
- `npm run check` -- expected: exit 0; `~/bookvie-data` untouched.
