---
title: 'Require an export header on GET /api/export'
type: 'bugfix'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GET /api/export` is the only GET route with a side effect: a complete download records "Last export" in `local-state.json`. The AD-16 guard refuses a foreign `Sec-Fetch-Site`, but it lets a request with no such header through. So a cross-site `<img>` or no-cors GET from a browser that doesn't send the header (Safari before 16.4, old Firefox) can still record an export the user never made. This is the open deferred-work entry from the review of spec-refuse-cross-site-simple-gets (2026-11-03).

**Approach:** On `/api/export`, `HostOriginGuard` requires exactly one `X-Bookvie-Export: 1` header, which the app's export `fetch` sends. Without it the request is refused with the guard's usual 403 `text/plain`. A cross-site simple request can't carry a custom header, and a cross-site fetch that sets one needs a CORS preflight, whose foreign Origin the guard refuses. Every other path is unchanged.

**Decisions (Oleg, 2026-11-04):**
- Oleg first asked to "require the Sec-Fetch-Site header on /api/export". Review found that the browsers without the header would also leave it off the app's own export, so Export all data would fail for them. Oleg then chose the custom header instead: it works in every browser.

</frozen-after-approval>

## Implementation Notes

**Decisions:**
- **Where the rule lives:** in the guard, beside the other AD-16 rules. `EXPORT_PATH`, `EXPORT_HEADER` and `EXPORT_HEADER_VALUE` are in `http/app.py`. The client constant is `EXPORT_HEADERS` in `frontend/src/api/export.ts`.
- **Path match:** exact, on the routed path. `/API/export` and `//api/export` 404 without reaching the route, so they have no side effect.
- **Other rules still apply:** the existing `Sec-Fetch-Site` rule still runs, so the header with `cross-site` is still 403.
- **HEAD:** a HEAD without the header is 403 too. It had no side effect before (404), so nothing is lost.
- **Not in OpenAPI:** the header isn't documented there. The 403 comes from the guard, not the route, so it is documented in README and AD-16 instead.
- **Scripts:** curl and other scripts add `-H 'X-Bookvie-Export: 1'`.

**Files:**
- `backend/bookvie/http/app.py`
- `frontend/src/api/export.ts` and `export.test.ts`
- `backend/tests/test_export.py`:
  - `_client` sends the header;
  - `_run` takes it from `EXPORT_HEADERS`;
  - tests that only need `.app` use `api_client`;
  - refusal and allow cases.
- `backend/tests/test_guard.py`
- `README.md`
- ARCHITECTURE-SPINE AD-16
- `deferred-work.md` (resolved)

**Surprise:** the first build required `Sec-Fetch-Site`. Blind review found that it broke export in exactly the old browsers it targeted. The spec went back to Oleg, who chose the custom header.

## Review Triage Log

Blind Hunter, one pass, on the first build (it required `Sec-Fetch-Site`):

| # | Finding | Verdict | Evidence | Action |
|---|---|---|---|---|
| 1 | The browsers without `Sec-Fetch-Site` also leave it off the app's own `fetch('/api/export')`, so Export all data fails for them | high | `export.ts` sent no header, and the guard refused a missing one. It broke FR-22 in exactly the browsers it targeted. | HALT. Oleg chose `X-Bookvie-Export`, and the guard was rebuilt around it. |
| 2 | A 403 shows the generic "Couldn't export" | false | After #1 the app always sends the header. Only a hand-made request gets the 403. | reject |
| 3 | README still says "a plain `GET /api/export`" | medium | `README.md:63`. Scripts would hit a 403 without the header. | patch: README names the header, with a curl line |
| 4 | Spec `in-progress` while deferred-work already says `resolved:` | false | The spec was mid-run. Finalize sets it to `done`. | reject |
| 5 | No acceptance criteria or verification section; the E2E run unstated | false | The oneshot template drops those sections. `npm run check` ran in full: E2E 176 passed, including the real-download test. | reject |
| 6 | The `/api/export?x=1` case duplicates `/api/export` | low | The query string isn't part of `scope["path"]`. | patch: replaced by an `/API/export` variant test (404) |
| 7 | "only on export" checks a single control path | low | Only `/api/health` was checked. | patch: also checks `/api/probe-handler` reaching its handler; test renamed |
| 8 | The guarded path is a hand-kept string | low | Renaming the route fails every export test (403 or 404). A second side-effecting GET is future work, and AD-16 now names the rule. | reject |
| 9 | HEAD without the header is now 403 | low | HEAD was a 404 with no side effect, so nothing is lost. Recorded in Implementation Notes. | reject |
| 10 | `_client(...).app` in tests that use `_run` is noise | low | `_run` builds its own scope. | patch: those tests use `api_client`; `_run` takes its header from `EXPORT_HEADERS` |
| 11 | The "twice" case may be merged by httpx | low | Either way the guard sees something other than exactly `["1"]` ("1, 1" or two entries) and refuses it, so the case asserts the right outcome. | reject |
