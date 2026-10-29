---
title: 'Story 1.2: Run one safe instance'
type: 'feature'
created: '2026-10-29'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '28f0bfae3f81d905240131a148df92acd4462411'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `bookvie` starts a server every time it runs. Two launches can serve the same data folder, a busy port gives a raw traceback, and any `Host`/`Origin` is accepted, so a web page could reach the loopback API.

**Approach:** Add a health-checked `bookvie.lock` (AD-5), a pre-bound loopback socket with clear port-conflict messages, `GET /api/health`, and a Host/Origin guard middleware (AD-16). Shutdown on SIGINT/SIGTERM waits for the write lock, then removes `bookvie.lock`.

## Boundaries & Constraints

**Always:** Bind `127.0.0.1` only. The lock is JSON `{"pid", "port"}`, created with `O_CREAT|O_EXCL`. Only the process that owns the lock removes it, and only if the file still names its PID. Messages and logs go to stderr. Tests never touch `~/bookvie-data`: they pass `--data-dir` under `tmp_path`. Health compares resolved data-folder paths.

**Never:** No store, `library.json` or real intents (1.4). No error envelope or handler (1.5): the guard answers plain-text 403. No `--fake-today` (1.4). No `npm run check` wiring (1.3). No outbound calls other than loopback health probes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First start | No lock | Writes `bookvie.lock` `{pid, port}`, serves | N/A |
| Live lock | PID alive, health answers for this folder | Opens browser at recorded URL (prints it with `--no-browser`), exit 0, no server | N/A |
| Stale lock | Dead PID, or a lock older than 5 s whose health doesn't answer for this folder, or unreadable and older than 5 s | Takes the lock over and serves | N/A |
| Simultaneous start | Lock younger than 5 s, PID alive or file still empty | Polls health every 100 ms up to 5 s; answers → open URL, exit 0 | No answer → exit 1, "bookvie is starting in another window; try again." |
| Port held by non-bookvie | Bind fails, health doesn't answer as bookvie | Exit 1, message names the port and `--port` | Own lock removed |
| Port held by bookvie, other folder | Health answers with a different `dataDir` | Exit 1, message says bookvie is already running for that folder | Own lock removed |
| Shutdown | SIGINT or SIGTERM | Waits for the write lock, removes `bookvie.lock`, exits | N/A |
| Guard | `Host` not `127.0.0.1:<port>`/`localhost:<port>`, or `Origin` present (including `null`) and not `http://` + one of those | 403, handler not run | N/A |
| Guard, dev | `--dev` | Also accepts `Origin` `http://127.0.0.1:5173` and `http://localhost:5173`; without `--dev` they get 403 | N/A |
| Health | `GET /api/health` | 200 `{"app": "bookvie", "dataDir": "<resolved path>"}` | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookvie/cli.py` -- `main()` runs `uvicorn.Server(config).run()` with no lock or socket. `FakeServer` in tests replaces `uvicorn.Server`. uvicorn 0.54 `capture_signals()` re-raises the captured SIGTERM after `serve()` returns, which kills the process before any `finally` in `main`. Cleanup must therefore run inside `Server.shutdown()`.
- `backend/bookvie/http/app.py` -- `create_app(static_dir)`. The SPA catch-all 404s `/api/*`, so `/api/health` must be registered before it. Keep the SPA rules as they are.
- `backend/tests/test_app.py` -- `TestClient(create_app(static_dir))` sends `Host: testserver`, which the guard will reject. Use `base_url="http://127.0.0.1:8765"`.
- `backend/tests/test_layers.py` -- `TOP_LEVEL_MODULES = {"__init__", "cli"}`. Add `instance`.
- `frontend/vite.config.ts` -- the proxy forwards `Host: 127.0.0.1:5173`. Set `changeOrigin: true` so `Host` becomes `127.0.0.1:8765`. `Origin` stays the Vite origin, which `--dev` allows.
- `_bmad-output/test-artifacts/test-design-progress-system.md:161-166` -- FND-API-004 matrix (bad Host, foreign Origin, `null` Origin, no Origin with a good Host, the dev origin with and without `--dev`), FND-API-005, 008 and 009.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/instance.py` -- new. `LockInfo(pid, port)`, `acquire_lock(data_dir, port) -> LockInfo | None` (exclusive create, write JSON, fsync), `read_lock`, `release_lock(data_dir, pid)`, `pid_alive(pid)` (`os.kill(pid, 0)`; `PermissionError` means alive), `probe_health(port, timeout) -> str | None` (urllib to `127.0.0.1`, returns `dataDir` only when `app == "bookvie"`), `bind_socket(port)`. This is the AD-5 logic, kept out of `cli` so it can be unit-tested.
- [x] `backend/bookvie/http/app.py` -- `create_app(static_dir=STATIC_DIR, *, data_dir=None, port=8765, dev=False)`. Set `app.state.write_lock = threading.Lock()` (the AD-4 lock that Story 1.4 adopts). Add `GET /api/health` and a pure-ASGI Host/Origin guard middleware. Health and guard implement the matrix rows.
- [x] `backend/bookvie/cli.py` -- startup order: mkdir, resolve the lock (live → open URL, exit 0; starting → poll, then exit 0 or 1; stale → take over), bind the socket (on conflict: probe, message, release, exit 1), then run a `uvicorn.Server` subclass whose `shutdown()` acquires `app.state.write_lock` and releases the lock. Also release on any exception after acquiring.
- [x] `backend/tests/test_instance.py`, `test_guard.py`, `test_cli.py`, `test_app.py`, `test_layers.py` -- unit-test every matrix row: the guard matrix parametrized through `TestClient`; lock states with fake PIDs and a monkeypatched `probe_health`; the port conflict with a real bound socket. One subprocess test (FND-API-008) starts `python -m bookvie.cli --no-browser --port <free> --data-dir tmp`, waits for health, runs a second launch (exit 0, no new server), sends SIGTERM, then asserts the lock is gone. A socket test (FND-API-005) checks that the bound address is `127.0.0.1`.
- [x] `frontend/vite.config.ts` -- `changeOrigin: true` on both proxies.

**Acceptance Criteria:**
- Given a running server, when the data folder is inspected, then `bookvie.lock` holds its PID and port, and after SIGTERM the file is gone.
- Given two `main()` calls racing on an empty folder, when both try to create the lock, then exactly one creates it.
- Given the full suite, when `uv run --project backend pytest` runs, then it passes with no file created under `~/bookvie-data`.

### Review Findings

- [x] [Review][Patch] Same-folder port conflict leaves the running server without a lock — resolved by decision: add `pid` to `/api/health`, and on a same-folder port conflict rewrite `bookvie.lock` as the running server's `{pid, port}` instead of deleting it [backend/bookvie/cli.py:107]
- [x] [Review][Patch] `same_folder` compares path strings, so case variants of one folder on case-insensitive APFS count as different folders. A live server's lock gets taken over, the message says "already running for <same folder>", and a launch with another `--port` serves the folder twice. Use `os.path.samefile`. [backend/bookvie/instance.py:131]
- [x] [Review][Patch] `pid_alive` crashes with `OverflowError` (not an `OSError`) when the lock holds a PID above the C int range, so every launch tracebacks until the lock is deleted by hand [backend/bookvie/instance.py:100]
- [x] [Review][Patch] `probe_health` follows HTTP redirects (default `HTTPRedirectHandler`), so a foreign listener on the port can send the probe to a non-loopback host. This breaks the Never rule "no outbound calls other than loopback health probes". [backend/bookvie/instance.py:117]
- [x] [Review][Patch] No `main()` test shows that a dev Origin is rejected without `--dev`; `main` could pass the wrong `dev` value and the suite would stay green [backend/tests/test_cli.py:218]
- [x] [Review][Defer] Vite `changeOrigin: true` is checked only by a source-text regex; nothing proves a proxied request gets past the guard [frontend/vite.config.ts:1] — deferred: needs the Vite toolchain / e2e harness from Story 1.3

**Rejected:**
- AC3 not enforced suite-wide (no `HOME` isolation fixture), raised by two reviewers: low. No current test writes to `~/bookvie-data`, and a fixture would only guard future tests.
- `bind_socket` connect pre-check is "not a health probe": false. It is a loopback-only TCP connect, which is within the constraint's intent (triage #19).
- Starting poll can take up to 5 s past the lock's own 5 s age: low. Worst case is a ~10 s wait in a rare race.
- Same-folder port conflict exits 0, but the Execution task says exit 1: rejected because the fix would be a spec edit (behaviour comes from triage #2).
- Health returns `"dataDir": null` without `data_dir`, and the probe reads it as "another program", raised by two reviewers: low. The CLI always passes `data_dir`, so only tests can reach it.
- Takeover during the old server's shutdown window, and the `release_lock` read-then-unlink race: low. It needs a narrow interleaving, there are no writes before 1.4, and related races were accepted in triage #4/#18.
- Exception path releases the lock without `write_lock`: low. There are no writes before Story 1.4, and `app` may not exist yet on that path.
- Spec `status: done` vs sprint `review`, raised by two reviewers: rejected because the fix would be a spec edit.
- Spec Implementation Notes / Change Log don't record the post-triage behaviour: rejected because the fix would be a spec edit.
- `write`/`fsync` failure leaves an empty lock: low. It needs ENOSPC/EIO, and launches after 5 s take the lock over.
- `bookvie.lock` as a directory or unreadable file tracebacks: low. The program fails loudly on a state it never creates.
- Unbounded `write_lock` acquire can hang shutdown, raised by two reviewers: low. Nothing holds `write_lock` before Story 1.4.
- Pre-bind probe timeout on a full-backlog listener: low. A 0.2 s loopback connect timeout needs a saturated listener.
- No real-process race test (the threads share a PID): low. It is a coverage gap with no defect shown.
- `test_server_runs_on_pre_bound_loopback_socket` doesn't assert the host: low. The bound address is already covered by the FND-API-005 socket test.
- `test_packaging.py` Vite regex fragile to reformatting: low. It fails loudly (false red), never silently.
- README doesn't mention `bookvie.lock` / exit codes: low. It is documentation polish with no behavioural harm.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap | `main`'s `release` closure never tested to wait for `app.state.write_lock` | medium | Pre-verified: the shutdown test passes its own release; `FakeServer.release` is never called. | patch (test) |
| 2 | verification-gap, blind, edge | `_port_conflict` same-folder branch: exits 1 with "already running" though the live-lock path exits 0 and opens the URL; untested | low | The branch is reached after taking over an old lock whose health probe failed. Making it show the URL and exit 0, like the live-lock path, is a direct correction. Each later launch converges on the same outcome. | patch |
| 3 | verification-gap | Vite `changeOrigin` checked only by a source regex | low | Real, but it needs the Vite toolchain; the e2e harness lands in 1.3. | reject |
| 4 | blind | Stale-lock takeover compare-then-unlink isn't atomic | low | Real, but it needs two launches with different `--port` values racing on a stale lock. The Design Notes accept this narrow race, and a rename-based fix adds machinery. | reject |
| 5 | blind | Guard docstring says a web page "cannot reach" the API; no-cors GETs carry no Origin | low | Simple cross-site GETs send `Host: 127.0.0.1:<port>` and no Origin, so they pass. The page can't read the response. Docstring correction now; side-effecting GETs deferred. | patch (docstring) + defer |
| 6 | blind, edge | `--port` unvalidated: >65535 raises `OverflowError` traceback; 0 or out of range writes a lock `_parse` rejects, so `release_lock` never removes it | low | Reproduced in code: `bind` raises `OverflowError`, not `OSError`, and `_parse` refuses port 0. Range check in `parse_args` is a direct correction. | patch |
| 7 | blind | `--port 80` (`EACCES`) is reported as "in use by another program" | low | Real, rarely met; distinguishing errnos adds branches. | reject |
| 8 | blind | Exhausted takeover retries say "starting in another window" | low | Requires the lock to reappear 4 times in a row; a new claim kind adds surface. | reject |
| 9 | blind | README still says `--dev` is "not used yet" | low | `README.md:92` confirmed. Direct correction. | patch |
| 10 | blind | Duplicated constants (8765, 127.0.0.1, 5173) across `cli`/`http`/vite | low | The layer rule stops `http` importing `instance`; a shared module adds surface with no named divergence yet. | reject |
| 11 | blind | Guard untested for WebSocket close, duplicate Host/Origin, OPTIONS | low | The FND-API-004 matrix doesn't list these; the code handles them explicitly. | reject |
| 12 | blind | Real-process test sends only SIGTERM; the AC says SIGINT or SIGTERM | low | Confirmed; parametrizing the signal is a direct addition. | patch (test) |
| 13 | blind | Subprocess test pipes output without draining; free-port race | low | A short test emits far under 64 KB; port reuse in the bind-close gap is rare. | reject |
| 14 | blind | Test helper `_write_lock` duplicated; in-function import; `app.state` test attribute | low | Test-only tidiness with no named harm. | reject |
| 15 | blind | `test_layers.py` docstring line too long | low | Confirmed; direct correction. | patch |
| 16 | blind | Windows: `os.kill(pid, 0)` terminates; `SO_REUSEADDR` semantics | false | bookvie targets macOS/POSIX only; no Windows support exists or is planned. | reject |
| 17 | edge | `probe_health` lets `http.client.HTTPException` escape on a garbage-speaking listener | medium | Reproduced: a listener replying `GARBAGE` raises `BadStatusLine` from `probe_health`, so `_port_conflict` crashes with a traceback. | patch |
| 18 | edge | Old lock, alive PID, health slower than 0.5 s → takeover → second server on a different `--port` | low | Health is an async handler with no locks; a >0.5 s loopback stall is unlikely, and only a different `--port` leads to a double serve. | reject |
| 19 | edge | macOS: `SO_REUSEADDR` lets the 127.0.0.1 bind succeed while another program listens on `0.0.0.0:<port>` | medium | Reproduced on darwin: `bind_socket` succeeded beside a 0.0.0.0 listener. Requests could split between programs, and the port-conflict AC fails on the user's platform. | patch |
| 20 | edge | Lock mtime in the future → every launch waits 5 s, then "starting" | low | Needs the clock to move back plus a reused alive PID. | reject |
| 21 | edge | `claim_lock` OSError (read-only folder, ENOSPC) → traceback | low | Rare; the preceding `mkdir` raises the same way. | reject |
| 22 | edge | Startup failure with a captured SIGTERM skips `shutdown()`, leaving the lock | low | The lock left behind names a dead PID, so the next launch takes it over. | reject |
| 23 | edge | Vite falls back to 5174 when 5173 is busy | false | `vite.config.ts` sets `strictPort: true`. | reject |
| 24 | edge | `read_bytes`/`stat` race in `claim_lock` pairs a new mtime with old bytes | low | A sub-millisecond window, and the worst case is one extra poll or a retry. | reject |
| 25 | edge (claim) | Exception paths leave a lock with an out-of-range port | low | Same root cause as #6. | patch (with #6) |
| 26 | edge (claim) | Slow health lets two servers serve one folder | low | Same as #18. | reject |

## Design Notes

AD-5 calls an alive-but-silent PID stale, while the race AC says the loser waits for the winner. The lock's mtime decides between them. A lock younger than 5 s belongs to a server that is still starting, so the loser polls. An older lock is checked once: live → open, otherwise take over. A takeover re-reads the lock and unlinks it only when its bytes are unchanged, then retries the exclusive create, at most 3 times.

Lock cleanup lives in `Server.shutdown()`, because uvicorn re-raises SIGTERM after `serve()` returns:

```python
class _Server(uvicorn.Server):
    async def shutdown(self, sockets=None):
        await super().shutdown(sockets=sockets)
        await asyncio.to_thread(self._release)  # takes write_lock, then removes bookvie.lock
```

## Verification

**Commands:**
- `uv run --project backend pytest` -- expected: all pass.
- `bookvie --no-browser --data-dir <scratchpad>/d --port 8799 &`, then a second identical run -- expected: it prints the URL and exits 0. `curl -H 'Host: evil:8799' 127.0.0.1:8799/` → 403. `kill %1` → `<scratchpad>/d/bookvie.lock` is gone.
