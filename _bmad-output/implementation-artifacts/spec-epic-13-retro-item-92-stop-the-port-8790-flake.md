---
title: 'Stop the port-8790 sign-in tests from flaking'
type: 'bugfix'
created: '2026-11-23'
status: 'done'
route: 'oneshot'
baseline_commit: '2cacf0ed44caa5320f35f28e7e7691b9299aaf30'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-retro-2026-11-23.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 13 retro item 92 (E13-V1; `deferred-work.md:1567`; sprint item `epic-13-retro-item-92-stop-the-port-8790-flake`), due before Epic 14. Under `npm run check` (`pytest -n auto`), the sign-in tests in `test_dropbox_auth.py` and `test_dropbox_cli_follow_ups.py` fail about half the time with "Port 8790 on 127.0.0.1 is in use" or a fake browser that visited nothing (`[] == [200]`). A red check that is "only the flake" teaches everyone to ignore red.

**Approach:** find the real cause first. Then give `run_auth` a keyword-only `port` test seam (default `REDIRECT_PORT`, 0 picks a free port) that the CLI never passes, so the redirect URI in the authorize URL and the code exchange follows the port actually bound. All sign-in tests use it except the one AC-4 test that proves the fixed registered port. The CLI keeps 8790 and its messages are unchanged. Prove it with 5 green `npm run check` runs in a row and resolve the deferred entry.

</frozen-after-approval>

## Implementation Notes

- **Root cause (measured at the baseline `2cacf0e`):** every sign-in test bound the same fixed `127.0.0.1:8790`, and xdist runs them in parallel processes. A listening socket can't share an address with another one in another process (`HTTPServer` sets `SO_REUSEADDR`, which only covers TIME_WAIT, so a released listener isn't the cause). So whichever test listened second got `AuthFailed: Port 8790 … is in use`. `[] == [200]` is the same failure seen from `_refused`: `run_auth` raised before it opened the fake browser, so the browser visited nothing.
  - `pytest -n 8` on the two files: 10, 9, 9, 9, 10, 9 failed out of 20 in six runs, every message "Port 8790 … is in use" or `[] == [200]`/`[] == [400]`.
  - The same two files serially: 20 passed, three times. With `-n 1` (one worker, still xdist): 20 passed, three times. So it is not a too-tight wait, a slow release or load; it is two processes on one port.
  - No other code or test binds 8790 (`grep` of `backend/`, `frontend/`, `scripts/`, `e2e/`); `test_dropbox_backup_guide.py` only reads `REDIRECT_URI`.
  - The retro's note that grouping on one xdist worker "didn't help" couldn't be reproduced; `-n 1` passes every time, so that experiment was likely not applied to both files. The seam fixes it without depending on scheduling.
- **Fix:**
  - `backend/bookvie_dropbox/auth.py`: `run_auth` takes a keyword-only `port` (default `REDIRECT_PORT`). `_Redirect(state, port)` binds it, and its `uri` property is the redirect URI on the address it actually listens on, so it equals `REDIRECT_URI` on 8790. `authorize_url` and `exchange_code` take that URI (defaulting to `REDIRECT_URI`), so Dropbox's rule that both carry the same redirect still holds on any port. The "Port … is in use" message names the port asked for. `cli.main` still calls `run_auth()` with no arguments, which `test_a_finished_auth_returns_without_serving` pins (its stand-in takes none), so users can't reach the seam.
  - `backend/tests/test_dropbox_auth.py` and `backend/tests/test_dropbox_cli_follow_ups.py`: every sign-in passes `port=FREE_PORT` (0), except `test_auth_signs_in_with_pkce_on_the_fixed_port_and_keeps_the_token_only_in_the_keychain`, which stays on 8790 as AC-4's proof of the registered port. It is now the suite's only listener on 8790, so the suite can't collide with itself. The taken-port test holds a free port and passes it. The idle-connection test preconnects to the redirect URI's port. A new `test_the_fixed_redirect_port_in_use_names_8790` keeps the default port's message under test without binding 8790. The stray-request test asserts that the seam's redirect is not 8790 and that the code exchange sends the same URI as the authorize URL.
  - After the fix, `pytest -n 8` on the two files plus `test_dropbox_backup_guide.py`: 24 passed, six runs in a row (25 after the review's added test).
  - Mutation: `exchange_code` sending `REDIRECT_URI` instead of the bound URI fails the stray-request test; the edit was reverted by hand.
- **Residual risk:** the one fixed-port test still binds 8790, so it fails if something outside the suite holds 8790 at that moment: a real `bookvie-dropbox auth` left open, or another checkout's `npm run check` running the same test at the same second. That is the product's own message for that state, and it can't happen inside one run.
- `deferred-work.md:1567` gets a `resolved:` line that corrects the recorded cause.
- **Proof, 2026-11-23:** 5 `npm run check` runs in a row on the final code (after the review patches; the backend diff hashed the same before and after the runs), each exit 0 with check:py at 2473 passed: 17:10–17:13, 17:13–17:17, 17:17–17:20, 17:20–17:24, 17:24–17:27 (check:e2e 803 passed). One earlier run, before the review patches, was green too and isn't counted.

## Review Triage Log

Blind Hunter (one layer; Edge Case Hunter and Acceptance Auditor are not in this oneshot's review), 12 findings:

- Stray `</content></invoke>` at the end of the spec: low, real. Patched (deleted).
- Spec has no ACs or verification section: false. The oneshot route keeps only Intent and Implementation Notes by design; the 5 runs are recorded below once they ran.
- Deferred entry and sprint item not closed yet: false at review time; both are closed before the commit that records the runs.
- The deferred entry's wrong guess at the cause stays on record: low, real. The `resolved:` line states the measured cause (old entries are not rewritten).
- The fixed-port test can still collide with something outside the suite: low, real. Kept on purpose as AC-4's proof; named under Residual risk above.
- Nothing stops a future test from calling `run_auth` without the seam: low. Rejected: the module docstrings say why, and a guard fixture would be more than a simple correction.
- The default port's "Port 8790 … is in use" message lost its test: medium, real. Patched with `test_the_fixed_redirect_port_in_use_names_8790` (the listener raises `EADDRINUSE`, nothing binds 8790).
- `FREE_PORT` is defined in two test modules: low. Rejected: a one-line constant; `dropbox_fakes.py` is outside this item's files.
- `_Redirect.uri` spelled the loopback host apart from the bind address: low, real, simple. Patched: `uri` reads host and port from `server_address`.
- Only the CLI follow-up test checks the redirect URI under the seam: low. Rejected: one test is enough to pin the plumbing, and the mutation above shows it catches a break.
- `test_dropbox_auth.py`'s docstring opening still said "on the fixed registered port": low, real. Patched.
- A failure on `port=0` would read "Port 0 … is in use": low. Rejected: `port=0` is test-only and an exhausted ephemeral range is not a state the suite reaches.
