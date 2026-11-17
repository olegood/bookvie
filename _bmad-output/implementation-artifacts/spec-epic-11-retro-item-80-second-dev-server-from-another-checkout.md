---
title: 'A second --dev from another checkout does not silently join the first (E11-S2)'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '35db5d3f1ffbcab78582338e55d4e82e00d0e1ac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 11 retro item 80 (E11-S2; sprint item `epic-11-retro-item-80-second-dev-server-from-another-checkout`), due before Epic 12. bookvie is worked on from several git worktrees. With a `--dev` server already running from worktree A, `bookvie --dev` in worktree B finds A's live lock on `~/bookvie-data-dev`, prints "bookvie is already running at …" and exits 0. B's `npm run dev` then proxies to A's backend code without saying so.

**Approach:** a `--dev` server reports which checkout it runs from. When a `--dev` launch finds a live dev server on its data folder (through the lock, or through a port conflict on the same folder), it compares that server's checkout with its own. When they differ, it doesn't join. When they match, it keeps today's "already running" behaviour. Production launches don't change.

**Decisions (Oleg, 2026-11-17):**
- **Refuse:** a different checkout prints `bookvie: a --dev server from another checkout (<its checkout>) is already running on port <port> with <data folder>. Stop it, or start this one with --port <number> --data-dir <folder>.` and exits 1. Paths are shown as `display_path` shows them (`~` for home).
- **Identity is the checkout folder:** the resolved folder the `bookvie` package is imported from, compared with `instance.same_folder`. The commit is not compared.
- **No reported checkout counts as another checkout** (fail closed). The message then shows `an unknown checkout` in place of the path.

## Boundaries & Constraints

**Always:** the comparison runs only with `--dev`. The message names the other server's checkout, `--port` and `--data-dir`. Nothing touches the real `~/bookvie-data`, and tests set `HOME` to a temporary folder (as `test_dev_mode.py` does). The lock format (`{pid, port}`) is unchanged.

**Never:** no change to the `app-info` view or its OpenAPI schema (so no `api:gen`). No new defaults (no per-worktree port or folder). No change for production launches.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same checkout | dev server from checkout A is live; `--dev` from A | "bookvie is already running at …", exit 0 (unchanged) | N/A |
| Other checkout | dev server from A is live; `--dev` from B, same data folder | refused, exit 1, message names A's checkout, `--port` and `--data-dir` | lock and A's server untouched |
| Other checkout, port conflict | B took over the lock, then the bind failed, and health on the port answers for this folder from A | same as the row above; the lock is handed back to A as today | N/A |
| Old server | a live dev server whose health reports no checkout | refused as another checkout ("an unknown checkout") | N/A |
| Production | `bookvie` with a live production server | unchanged | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookvie/http/app.py:190` `health()` -- the AD-5 probe, outside the OpenAPI schema. Add a `checkout` field (the resolved package folder) only when `dev`. `create_app` takes it as a new keyword, like `commit`.
- `backend/bookvie/instance.py` `_health`, `probe_health`, `probe_pid` -- add `probe_checkout(port)` beside them, in the same style. `same_folder` compares checkout folders.
- `backend/bookvie/cli.py:233` `main` -- `claim.kind == "running"` (:247) and the same-folder branch of `_port_conflict` (:203) are the two join points. `_checkout_commit` (:134) already reads from `Path(__file__).resolve().parent`. Reuse that folder (`_checkout_folder()`) as the identity and pass it to `create_app`.
- `backend/tests/test_dev_mode.py` -- `home` and `start` fixtures, `_CapturedServer`, and `exit_code`. Fake the running server by monkeypatching `instance.claim_lock` and `instance.probe_checkout`, or with a real lock and a stand-in health. Never start a real server on 8766.
- `backend/tests/test_app.py:148` -- the health payload assertion stays exact for production; add the dev variant.
- `README.md:97` -- the Development paragraph.
- `ARCHITECTURE-SPINE.md:223` -- AD-16 Binding. One sentence on the other-checkout rule. This edit is the item's own scope, so it is not spine drift.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/http/app.py` -- health reports `checkout` with `--dev` -- the identity a second launch reads.
- [x] `backend/bookvie/instance.py` -- `probe_checkout(port)`.
- [x] `backend/bookvie/cli.py` -- compare at both join points with `--dev`, and refuse per the decisions.
- [x] `backend/tests/test_dev_mode.py`, `backend/tests/test_app.py` -- one leaf per matrix row, plus the health payload per mode.
- [x] `README.md`, `ARCHITECTURE-SPINE.md` -- the rule in one sentence each.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- item 80 `done` at finalize.

**Acceptance Criteria:**
- Given a production app, when `/api/health` is read, then the payload is exactly `{app, dataDir, pid}` as today.
- Given the source change is reverted, when the new leaves run, then each fails.

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_dev_mode.py tests/test_app.py tests/test_cli.py -q` -- expected: all pass.
- `npm run check` -- expected: exit 0.

## Review Triage Log

- medium, patched: AD-16's Port conflict bullet still said the same-folder branch always exits 0, which contradicts the new Binding rule. It now gets a qualifier, and the Binding text is split into a rule sentence and a message sentence (spine check, blind).
- medium, patched: AD-5 still gave the health answer as exactly `{app, dataDir, pid}` and said a live lock always means "open and exit". AD-6 said health "doesn't change". Both are reworded to name the dev-only `checkout` and the other-checkout refusal. The item's own scope covers the spine edit for this rule (spine check, blind).
- medium, patched (README) and deferred (Vite): following the refusal's advice (`--port`, `--data-dir`) gives a second worktree a backend, but not a working `npm run dev`. `vite.config.ts` proxies only to 8766, with `strictPort` 5173, and `DEV_ORIGINS` allows only 5173. The README now says one Vite stack runs at a time, and a configurable proxy is deferred (blind).
- low, deferred (spine drift, AD-5 and AD-16): the Structural Seed and the Capability map don't name `probe_checkout`, `_checkout_folder` or `create_app(checkout=)` (spine check).
- low, rejected: a second health request (0.5 s) can time out on a busy same-checkout server, so the launch refuses as "an unknown checkout". It is rare, since health answered a moment earlier. Telling "unreachable" apart from "no checkout" would add a sentinel and branches, and failing closed was decided (verification-gap other finding, edge E1-E3, blind).
- low, rejected: a production bookvie holding `~/bookvie-data-dev` gets a refusal worded as "a --dev server". It is rare, and the fix adds a branch (edge E4, blind).
- false: a relative or empty `checkout`, or `resolve()` raising on a symlink loop. Only bookvie's own `/api/health` supplies the value, and that is always an absolute resolved folder (edge E5, E6).
- false: two checkouts sharing one install, or worktree B running A's editable `bookvie`, join silently. Both launches then run the same package code, so joining serves the same backend. The silent join item 80 targets is a different code base (edge E7, blind).
- false: no production test on the port-conflict path. The existing production port-conflict tests (`test_cli.py:405`, `:431`, `:454`) don't fake `probe_checkout` and would fail with exit 1 if production compared (verification gap).
- low, rejected: no `--dev` test for a port conflict with no live pid (pre-1.2 servers only); no test of a symlinked path to the same checkout (`same_folder` is tested on its own); no pid in the message; the package folder shown instead of the repo root (still names the worktree) (blind).
- low, rejected: `test_production_never_compares_checkouts` passes with only `cli.py` reverted. It guards unchanged behaviour, and the fix would be to edit this spec's acceptance criterion (edge E8).
- false: `sprint-status.yaml` marked `done` before review. Nothing is committed yet, and finalize sets the same value. A retro item isn't a story, so the rule that only code review marks it done doesn't apply (blind).
