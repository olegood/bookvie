---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-22'
storyId: '13.2'
storyKey: '13-2-upload-a-backup-to-my-dropbox'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-13-2-upload-a-backup-to-my-dropbox.md (Boundaries, Tasks & Acceptance, Review Findings and their two automate deferrals)
  - _bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md (Test Strategy, Green-phase follow-ups, Decisions for Oleg)
  - _bmad-output/implementation-artifacts/deferred-work.md (the two "For `bmad-testarch-automate`" entries, the `dropbox_content_hash` entry)
  - _bmad-output/implementation-artifacts/epic-13-context.md and epics.md (Epic 13's gate: 90% on `bookvie_dropbox/`)
  - _bmad/tea/config.yaml
  - backend/bookvie_dropbox/*.py; backend/scripts/coverage_gate.py; package.json `check:py`
  - backend/tests/test_dropbox_upload.py, test_dropbox_upload_edges.py, test_dropbox_auth.py, dropbox_fakes.py, agent_client.py, test_wheel_build.py, test_coverage_gate.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 13.2 Upload a backup to my Dropbox

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI. Every target is pytest: the in-process `bookvie-dropbox` server over `FakeDropbox`, the real SDK over `FakeDropboxHttp`, the installed console script, and a real wheel build. So no browser session was opened, and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The story is `done` (`c76354a`). The inputs were the ATDD checklist's 9 open follow-ups and the review's two deferrals to this step.
- **Generation:** sequential, in this session, as for Stories 12.3 to 13.1.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off, and there is no Pact artifact.
- **Baseline, measured in this run:** the Dropbox tests (123 passed) gave `bookvie_dropbox/` 89% line coverage: `cli.py` 50%, `server.py` 79%, `upload.py` 92%, `auth.py` 93%. `check:py` didn't measure the package at all (`--cov=bookvie` only).

## Coverage plan

The build and the review had already pinned all 13 ACs' primary branches. These follow-ups were pinned too:
- the older daily over three newer ones (`test_dropbox_upload_edges.py:180`);
- an old-style zip (`:58`);
- a prune that fails halfway (`:94`);
- the rate-limit paths (`:125`, `:215`);
- a non-bookvie zip (`:155`);
- auth's refused exchange, Keychain write, taken port and Cancel (`test_dropbox_auth.py:287`–`:349`).

This run added the rest:

| AC | Priority | Level | Leaf |
|---|---|---|---|
| AC-10 | P1 | API | 13 refused paths (AC-10's 10, plus a NUL, a symlink loop and an unreadable file). Each is `cause == "other"` with a `Not uploaded:` message, `connect` never called and no Dropbox call. This is the review's deferral. |
| AC-10, AC-5 | P2 | API | A number, an empty path, no `localPath`, and an extra argument next to a real daily path: each is `other`, with nothing connected. |
| AC-5 | P3 | API | An unknown tool name is an MCP protocol error, and nothing is connected. |
| AC-10 | P2 | API | `~/bookvie-backups` that is itself a symlink uploads from its target. |
| AC-6, AC-11 | P1 | API | With `CHUNK` at 1 KiB: an exact multiple, a 1-byte tail and a 517-byte tail. Pinned: the request sizes, start → appends → finish, and the fake's offset check on every cursor. Also pinned: a small file's empty finish. |
| AC-6 | P2 | API | A 0x7875 extra field before the 0x5455 one: `client_modified` is still the stamped UTC instant. |
| AC-12, AC-8 | P1 | Integration | A refused refresh through the real SDK is `dropbox_signin` through the tool. One refresh is sent with the Keychain's token, no request goes beyond the token endpoint, and no token appears in the answer. |
| AC-8 | P2 | API | A `connect()` fault that isn't the sign-in is `other`, and its message doesn't echo the exception text. |
| AC-8 | P1 | API | The listing fails after a verified upload: the answer is `other`, it says the backup was uploaded and verified, and nothing is deleted. |
| AC-7 | P3 | API | A `not_found` listing after the finish counts as empty (copies 1). |
| AC-4, AC-1 | P1 | Unit | `cli.main auth`: `AuthFailed` → exit 1 and `KeyboardInterrupt` → exit 130. Each prints one stderr line and nothing on stdout. This is the review's deferral. |
| AC-4, AC-5 | P2 | Unit | `auth` returns without serving, and `serve` never signs in. |
| AC-13, AC-1 | P2 | Integration | The installed `bookvie-dropbox auth|serve --help` exits 0. An unknown subcommand exits 2. |
| AC-4 | P2 | Integration | A stray `/favicon.ico` is answered 404, and the sign-in still finishes. |
| AC-4 | P1 | Integration | A token endpoint that can't be reached, or that answers 200 with HTML: `AuthFailed`, the old Keychain token stays, and no code or token is printed. |
| AC-1 | P1 | Build | A real `uv build` wheel holds every `bookvie_dropbox/*.py` and both console scripts. |
| Epic gate | P0 | Gate | `bookvie_dropbox/` is gated at 90% in `scripts/coverage_gate.py`, and `check:py` measures it. |

Scope: selective. These are the checklist's secondary branches, the review's deferrals and the epic gate, not new primary paths.

## Files

- `backend/tests/test_dropbox_follow_ups.py` (new): 11 leaves, 28 cases, all `upload_backup`.
- `backend/tests/test_dropbox_cli_follow_ups.py` (new): 7 leaves, 10 cases: `cli.main`, the installed command, and `auth`'s fault branches. Each file has its own small helpers (`Connect`, `Browser`), because a test module never imports from another.
- `backend/tests/test_wheel_build.py`: `test_wheel_ships_bookvie_dropbox_and_its_command`.
- `backend/scripts/coverage_gate.py`: a third gate, `bookvie_dropbox` at 90%. `_package_of` maps `bookvie_dropbox/...` to it (innermost package segment wins), and the "nothing measured" line names `bookvie_dropbox/`.
- `backend/tests/test_coverage_gate.py`: `HEALTHY` and the zero-statement, no-file and path-segment cases now include the package. There is a new leaf for 89% failing.
- `package.json`: `check:py` adds `--cov=bookvie_dropbox`.
- `_bmad-output/test-artifacts/atdd-checklist-13-2-upload-a-backup-to-my-dropbox.md`: the follow-ups are resolved.
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` lines on the two "For `bmad-testarch-automate`" entries.

No file under `bookvie_dropbox/` changed.

## Validation

- `uv run pytest -q tests/test_dropbox_follow_ups.py` gave 28 passed. The first run had 1 failure: the unknown-tool leaf expected a bare `MCPError`, but the in-process client re-raises it inside anyio's exception group. The leaf now uses `group_contains`.
- `tests/test_dropbox_cli_follow_ups.py`: 10 passed. `tests/test_wheel_build.py`: 5 passed. `tests/test_coverage_gate.py`: 12 passed.
- **Mutation probes:** a script in the scratchpad edited each source file, ran the targeted leaf, then wrote the original bytes back and checked their SHA-256. No git command was used. The final run killed 13 of 13:
  - a refused path's cause changed to `backup_write`;
  - the extra-field scan stopping at the first field;
  - a listing fault read as an empty folder;
  - an `AuthError` mapped to `upload_incomplete`;
  - an empty finish after a full last chunk;
  - extra arguments accepted;
  - a connect fault's text in the message;
  - `auth` exiting 0;
  - Ctrl-C exiting 1;
  - a stray request ending the wait;
  - the exchange fault's text in the message;
  - the gate at 89%;
  - `bookvie_dropbox` files not gated.

  The first run let "extra arguments accepted" survive, because that case's `localPath` was `"x"`, which the path check refuses anyway. The case now sends a real daily backup's path.
- **Smoke probe:** with `cli.parse_args` broken, `npm run check:smoke` exited 1 ("bookvie-dropbox --help exited with 1"). It was restored byte for byte.
- `git status` after the probes showed only this run's files.
- `npm run check` on the final tree (before the checklist and summary edits, which are Markdown only): exit 0. That covers:
  - ruff;
  - 2360 pytest passed;
  - the coverage gate: domain 100%, intents+store 96.45%, **bookvie_dropbox 96.36% (450/467)**;
  - the `api:gen` compare, Prettier, tsc and oxlint;
  - 800 e2e passed;
  - the smoke test, including `bookvie-dropbox --help`.
- Per-file coverage from that run: `auth.py` 100%, `contracts.py` 100%, `dropbox_api.py` 100%, `upload.py` 97%, `cli.py` 96%, `server.py` 82%. `server.serve()` runs only in the stdio subprocess of `test_dropbox_upload.py:120`, which coverage doesn't measure.

## ATDD checklist

All 9 open lines are resolved. 8 are ticked with their tests. 1 is retired: AC-3's full Dropbox vector, because Oleg chose not to commit the 9.7 MB image, and `deferred-work.md`'s `dropbox_content_hash` entry records that. `grep -cF '[ ]'` = 0.

## Risks and assumptions

- AC-8's "a failure after a verified upload" is pinned as cause `other`, with a message saying the upload was verified, not as a success. This follows the spec's matrix and Design Notes (13.4 then records a failure). Changing that is a spec edit.
- A rate limit is pinned as the SDK's 3 retries, then `upload_incomplete` (the build's `max_retries_on_rate_limit=3`).
- The unknown-tool leaf pins the MCP error as the in-process client surfaces it (an exception group). A different `mcp` release could change that wrapping without changing behavior.
- The unreadable-file case skips when the tests run as root.
- Adding a gate to `coverage_gate.py` means that, from now on, a `check:py` without `--cov=bookvie_dropbox` fails ("nothing under bookvie_dropbox/ was measured"). That is deliberate, as for the other gates.
- Story 13.1's checklist still has its open epic-gate line: `agent/`'s restore path at 90%. This run gated only `bookvie_dropbox/`. The restore path's files are still below 90% one by one (`backup_file.py` 89.7%, `restore_file.py` 87.9% at 13.1's run), and the epic gate needs a decision about which files count as the "restore path".

## Next

- Commit this run (`test:`, story 13.2).
- Story 13.3 (`record-each-upload-in-bookvie`) next. `bmad-testarch-trace` for Epic 13 at its gate, which also settles the restore-path coverage line from 13.1.
