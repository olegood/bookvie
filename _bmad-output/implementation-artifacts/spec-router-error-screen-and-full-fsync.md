---
title: 'Honest error screens and full fsync on macOS'
type: 'bugfix'
created: '2026-10-30'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) The layout route's `errorElement` in `frontend/src/main.tsx` shows "Page not found" for any thrown error, so a crash inside `CatalogPage` is reported as a missing page. If `AppShell` itself throws, that `errorElement` (which renders `AppShell` again) throws too, and React Router falls back to its default developer error screen. (2) `OsFileSystem.fsync` in `backend/bookvie/store/fs.py` calls `os.fsync`, which on macOS doesn't flush the drive's write cache, so a power cut after a commit's rename can leave `library.json` empty or torn.

**Approach:** (1) Route errors split two ways: a 404 route error response still shows `NotFoundPage`, and anything else shows a new generic error page ("Something went wrong", body "Reload the page to try again.", link "Back to the catalog"); both stay inside `AppShell`. A pathless root route above the layout gets its own error element that renders the same message without `AppShell` (plain `main` + `h1`, no shell components), so a shell crash still lands on a bookvie screen. (2) `OsFileSystem.fsync` uses `fcntl(fd, F_FULLFSYNC)` where the platform has it, and falls back to `os.fsync` when the constant is missing or the call raises `OSError` (filesystems that don't support it), as SQLite does. The `bookvie.lock` write in `instance.py` keeps `os.fsync`: a torn lock after a power cut is already treated as stale by `_parse`, so it needs no stronger flush. Both `deferred-work.md` entries (generic error element; its AppShell extension) and the `F_FULLFSYNC` entry get a `resolved:` line.

</frozen-after-approval>

## Implementation Notes

- E2E for the page crash: route-intercept `GET /api/views/catalog` with a body whose `books` is not an array so `CatalogPage` throws during render; expect title "Something went wrong — bookvie", the h1, the banner nav, and no "Page not found".
- E2E for the shell crash: an init script that makes `document.body.appendChild` throw for the regions host (`regionHost()` in `lib/announce.ts` runs during `AppShell` render) so both the layout and its errorElement throw; expect the bare h1 and no banner.
- Backend test: monkeypatch `fcntl.fcntl` / `fcntl.F_FULLFSYNC` / `os.fsync` to check the three paths (full fsync used; constant missing → `os.fsync`; `OSError` → `os.fsync`).
- Done as planned: `backend/bookvie/store/fs.py` (`fcntl` imported unconditionally; the getattr handles platforms without `F_FULLFSYNC`, and bookvie runs only on POSIX), `frontend/src/pages/ErrorPage.tsx` (new; reuses `NotFoundPage.module.css`), `frontend/src/main.tsx` (pathless root route), tests in `backend/tests/test_store.py` and `frontend/e2e/error-screens.spec.ts`.
- "Back to the catalog" on the error screens is a plain `<a href="/">` (full reload), not a client-side Link: the page that crashed may be the catalog.
- Surprise: the shell-crash injection first failed to stick. `regionHost()` assigned `host` before `body.appendChild`, so after one failed append React's automatic retry got a detached host back and rendered normally, with live regions no screen reader hears. `frontend/src/lib/announce.ts` now keeps the host only after it attaches; unit test added in `announce.test.ts`.
- Review patches: `F_FULLFSYNC` falls back to `os.fsync` only for not-supported errnos (`ENOTSUP`, `EINVAL`, `ENOTTY`) and re-raises real I/O failures (new test); the shell-crash e2e test also checks the body text and that "Page not found" is absent; the new `announce.test.ts` case restores `appendChild` in `finally`.

## Review Triage Log

- medium, patch: `fs.py` caught every `OSError` from `F_FULLFSYNC`, so an `EIO` fell back to `os.fsync` and the commit could report success. Now only not-supported errnos fall back.
- medium, defer: no directory fsync after the rename in `Store._write_atomic`; existed before this change, so it gets a new deferred-work entry.
- low, rejected: the 404 branch in `RouteErrorPage` is unreachable today (no loaders; `*` catches unknown paths). The frozen intent asks for it, and future loaders can throw 404s.
- false: "error screens don't log the error". React 19 reports errors caught by an error boundary through `onCaughtError`, which defaults to `console.error`, in production too.
- low, rejected: `BareErrorPage`'s `h1` takes no focus after a client-side navigation. It's reached only when the shell crashes; rare.
- low, patch: the shell-crash e2e test didn't assert the body text or the absence of "Page not found".
- low, rejected: the test patches `HTMLBodyElement.prototype.appendChild` page-wide. Test-only; the app appends to the body only for the region host.
- low, rejected: "Back to the catalog" duplicates Reload when the crash is on `/`. It still helps on other routes; a cosmetic copy question.
- low, rejected: `ErrorPage.tsx` reuses `NotFoundPage.module.css`. Same look on purpose; renaming it can wait for a third message page.
- false: the spec is unfinished. The oneshot route deliberately drops those sections, and the status is set at Finalize, after review.
- false: an empty or missing lock after a power cut. `_parse(b"")` hits `json.loads` → `ValueError` → `None` (stale), and a missing lock means the next launch simply acquires it.
- low, patch: the new announce unit test restores `body.appendChild` in `finally`.
