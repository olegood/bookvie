---
title: 'Envelope body-parse failures and test the real intent routes'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When Starlette or FastAPI can't parse an intent's body, it raises `HTTPException(400)`, and nothing on `/api` handles it. The browser then gets FastAPI's `{detail}` instead of the AD-9 envelope (F-R2). Examples: broken multipart framing, a missing boundary, an `intent` part over 1 MB, or more than 1000 fields. This breaks the story 1.5 rule that `{detail}` never reaches the browser from an `/api` route. There is also no evidence on the real intent and cover routes. No test sends a malformed body to them (VG2), and the Host/Origin guard is tested only against `/api/health` and a probe route (VG1). Epic 1 retro action item 8.

**Approach:** On `/api`, answer a 400 body-parse `HTTPException` with the same 422 `invalid_fields` on `intent` that a malformed `intent` part already gets (the shared `malformed()`). Any other `HTTPException`, and any path outside `/api`, keeps FastAPI's default handler. Add contract tests that send each malformed body to all four real intent routes. Add guard tests that send a foreign Host or Origin to the real intent routes and to `/media/covers/*`, including middleware order (the guard runs before `CoverSizeCap`).

</frozen-after-approval>

## Implementation Notes

- **Status and code:** a body-parse failure is answered with 422 `invalid_fields` on `intent`, using the shared `malformed()`. That function is exported from `bookvie.intents` as `malformed_intent`. No new error code is added and the TS schema doesn't change. The client already shows this refusal for a malformed `intent` part.
- **Scope of the handler:** `_http_error` in `backend/bookvie/http/api.py` is registered for Starlette's `HTTPException`, so it catches FastAPI's too. It envelopes only a 400 on an `/api/intents/<name>` path, the only routes that parse a body, and writes the parser's reason to stderr as one `bookvie:` line. Every other `HTTPException` still goes to FastAPI's `http_exception_handler`, as the module docstring already says: a 400 on any other path, unknown `/api` paths (404 through the SPA route), 405s with their `Allow` header, and `/media` 404s.
- **F-R6:** it stays accepted as the retro decided, with no new body cap on `delete-book` or `set-spine-color`. Starlette's 1 MB part limit and 1000-field limit now answer with the envelope on every route, and the tests cover that.
- **Before the fix (from probing):** all four routes answered `{detail}` 400 to broken framing, a missing boundary, an `intent` part over 1 MB, more than 1000 fields, and a urlencoded field over 1 MB. A truncated multipart body that is otherwise valid already got the 422.
- **Tests:** `backend/tests/test_intent_routes.py`, 48 tests before review, 20 of which fail with the handler unregistered. Review added more. They cover the bad bodies (6 after review) × 4 routes, a missing `intent` part, the unenveloped 404/405 controls, a direct handler call for a 400 outside `/api`, a foreign Host, a foreign Origin and `null` Origin × 4 intent routes plus GET/HEAD of a real cover (each with an own-origin control), and guard-before-`CoverSizeCap` (a foreign oversized body gets 403, the own one gets 413).
- **Verification:** `npm run check` exit 0 before review: 737 pytest at 98% coverage, 162 e2e, smoke ok. Load was 5.7 on 14 cores with sleep prevented (PL-1). After the review patches, `npm run check:py` exit 0 with 749 passed.
- **Files:** `backend/bookvie/http/api.py`, `backend/bookvie/intents/__init__.py`, `backend/tests/test_intent_routes.py`.

## Review Triage Log

Blind Hunter, 9 findings:

- Every `/api` 400 became `malformed_intent`, including views and any future deliberate 400. **Low**, patched. The handler now matches only `/api/intents/<name>`, and a test pins that a 400 on `/api/views/home`, `/api/intents` and `/media/x` keeps `{detail}`. This is narrower than the frozen Approach's "on `/api`" but has the same intent: only intent routes parse a body.
- The docstring said "a part over 1 MB", but covers are file parts. **Low**, patched to "a non-file part over 1 MB". The frozen Problem statement keeps the old wording.
- Starlette's `max_files` limit was not tested. **Low**, patched with a `too-many-files` bad body.
- The user-visible message changes from Couldn't save to "Not saved. 1 field needs attention: intent." **Low**, accepted. The panels already show exactly this for a malformed `intent` part (no field is marked, since `intent` is not a panel key). The app's own client never sends these bodies.
- The 404/405 controls missed unknown-path POST/HEAD and the `Allow` header. **Low**, patched.
- The guard-before-cap test covered one caller and didn't check the library. The cover test also seeded twice. **Low**, patched: all three foreign callers, library bytes unchanged, and a `cover_file` fixture.
- The off-`/api` test calls the handler directly, not through the app. **Low**, rejected. No route outside the intents parses a body, so the app can't produce that 400. Registration itself is covered by the 24 envelope tests that fail without it.
- Tracking docs are not updated. **False.** Spec status and `sprint-status.yaml` are set at finalize. The retro is a dated record and isn't edited.
- Body-parse failures leave no trace. **Low**, patched: one `bookvie:` stderr line with the method, path and parser reason, asserted in the tests.
