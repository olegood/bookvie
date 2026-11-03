---
title: 'Refuse cross-site simple GETs to server routes'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Host/Origin guard (AD-16) lets a cross-site `<img>` or no-cors GET through, because it carries the right `Host` and no `Origin`. The page can't read the answer, but once `GET /api/export` (story 2.1) records "Last export", any website could trigger that side effect. Epic 1 retro action item 3a (F-S8, `deferred-work.md` story 1.2 entry) requires this to land before story 2.1.

**Approach:** In `HostOriginGuard`, refuse requests to server paths (`/api/*`, `/media/*`) with 403 unless `Sec-Fetch-Site` is absent, `same-origin` or `none`. A missing header (curl, the cataloging agent, older clients, tests) still passes. SPA routes and `/assets` stay reachable from cross-site links, because they are static and have no side effects. Record the rule in AD-16.

</frozen-after-approval>

## Implementation Notes

- **Policy:** fail-closed on server paths. `cross-site`, `same-site` (another app on another loopback port is same-site, since ports don't count toward a site), unknown values and duplicate headers are all refused. Header values are compared case-insensitively. `Sec-Fetch-Mode` is ignored: a cross-site top-level navigation to `/api/export` would still have the side effect.
- **Server paths:** reuse `_is_server_path`, so `//api/x` and `/API/x` are guarded too.
- **Dev:** the Vite proxy forwards the browser's own `Sec-Fetch-Site: same-origin`, so `--dev` needs no exception.
- **Files:** `backend/bookvie/http/app.py` (guard + docstrings), `backend/tests/test_guard.py`, AD-16 in `ARCHITECTURE-SPINE.md`, `deferred-work.md`.
- **Surprise:** `TestClient` rewrites `//api/x` into a network-path URL (host `api`), so odd server paths are tested by calling the ASGI guard directly.
- **Verification:** `npm run check` exit 0 (660 pytest, 98% coverage, 162 e2e including `dev-proxy.spec.ts`, smoke ok); `test_guard.py` 70 passed after review patches.

## Review Triage Log

Blind Hunter, 10 findings:

- Missing `Sec-Fetch-Site` from old browsers still passes, and the docs overstated the fix — **medium**, patched the docstring, AD-16 and the deferred "resolved" note; story 2.1's "Last export" recording deferred to `deferred-work.md`.
- The new fsync deferred entry duplicates the 2026-11-01 one — **false**: the workflow requires a new entry for a split goal and forbids editing old ones; it cites retro item 3.
- Retro item 3 is only half done — **false**: `epic-1-retro-item-3` stays `open` in `sprint-status.yaml` until the fsync part lands.
- The spec has no ACs or Verification section — **false**: the oneshot route drops those sections by design; status is set at finalize.
- The real-routes test has no control — **low**, patched (same request with `same-origin` is not 403).
- The SPA test asserts only `!= 403` — **low**, patched (200 + body; asset 404).
- The raw-ASGI test only checks refusal — **low**, patched (allowed cases reach the inner app). WebSocket part rejected: no WebSocket routes exist.
- A comma-combined header value isn't tested — **low**, patched (one parametrize case).
- The `same-site` reason isn't documented — **low**, patched in AD-16 and the guard docstring.
- `--dev` isn't in AD-16 and the e2e proxy isn't confirmed — **low**, AD-16 patched; `dev-proxy.spec.ts` passed in `npm run check`.
