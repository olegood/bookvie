---
title: 'README: dev server needs the backend; reload after install:local'
type: 'chore'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Oleg hit two local-run snags in Epic 1 that the README doesn't cover (retro PL-8). `npm run dev` started without the backend, so every `/api` call failed. After `npm run install:local`, the browser kept showing the old app until a hard reload. Epic 1 retro action item 12.

**Approach:** In README "Getting started", say that `npm run dev` only serves the SPA and needs `bookvie --dev --no-browser` running on `:8765`, and what you see when it isn't. Under the `install:local` paragraph, say to restart a running `bookvie` and hard-reload the open tab. Docs only.

</frozen-after-approval>

## Implementation Notes

- **`README.md` Getting started:** a paragraph after `install:local`: restart a running `bookvie` (the old process keeps the old server code), then hard-reload (Cmd/Ctrl+Shift+R). The **Development** paragraph now says Vite serves only the SPA, to start `bookvie --dev --no-browser` first in another terminal, what a missing backend looks like (`COULDNT_LOAD` copy from `frontend/src/lib/copy.ts`, Vite's proxy ECONNREFUSED), what a missing `--dev` does (saves carry the `:5173` Origin and get 403, per `HostOriginGuard` with `DEV_ORIGINS` in `backend/bookvie/http/app.py`; GETs carry no Origin and pass), and the URL to open.
- **Why a hard reload:** the SPA route returns `index.html` via `FileResponse` with no `Cache-Control` (`app.py` `spa`), so the browser may reuse a cached `index.html` that points at the previous hashed bundle. Sending `Cache-Control: no-cache` on `index.html` would remove the need; it's a code change, outside this docs item.
- **Not verified live:** starting Vite without the backend to capture its log line was blocked in this session, so the README words it loosely ("a proxy error with `ECONNREFUSED`").
- **Review patches:** stop a normal `bookvie` before the `--dev` one (verified in `cli.py`: `claim.kind == "running"` reopens and exits 0; another folder on 8765 is refused); `--data-dir` for scratch saves; fixed proxy target; Safari's reload shortcut; "keep running" instead of "start first"; why Ctrl+C before re-running `bookvie`.

## Review Triage Log

- A normal `bookvie` already running makes the `--dev` launch reopen it and exit, so saves still get 403: medium. Verified (`cli.py` `main`, `_port_conflict`). Patched.
- Dev instructions default to the real library: low and cheap. Patched (`--data-dir`). Fixed proxy target noted with it.
- Cmd+Shift+R is Reader in Safari: low and cheap. Patched.
- Cache-Control root cause not recorded for pickup: low and cheap. Deferred to `deferred-work.md`.
- README states the Vite log line as exact though unverified: low and cheap. Patched to looser wording.
- "Start the backend first" overstates ordering: low and cheap. Patched to "keep … running".
- Restart reason missing (re-running `bookvie` only reopens the old one): low and cheap. Patched.
- Spec's Origin explanation omits `Sec-Fetch-Site`: low. Fix edits this spec only. Rejected.
- Sprint-status and spec status still open: false. The finalize step sets both in this commit.
