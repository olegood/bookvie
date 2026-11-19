---
title: 'Story 12.3: Let an agent record my reading'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_revision: 'ee842a7c3271f51cdad0db0b929a8847d0f6a74f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-3-let-an-agent-record-my-reading.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-21, Structural Seed), reconciled before the next epic: the success mapping the routes and the write tools share lives in the new intents/answers.py, which the spine names nowhere.
    evidence: |-
      backend/bookvie/intents/answers.py (ok, page_answer, card_note_answer); http/api.py's ten routes and agent/tools.py answer through it; the Seed's intents/ line lists only book_form, intent_model, commit, cover, contract (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-21; Structural Seed, intents/
    severity: low
  - summary: >-
      The pause tool's description (epics.md Story 12.3) says the paused Book "stays in Waiting for you", but pause makes it Up next, so an agent tells the user the wrong place.
    evidence: |-
      backend/bookvie/intents/pause.py pause sets up_next_book_id; views give it role upNext, not waiting. AC-3 pins the text character for character, so change epics.md first, then DESCRIPTIONS and tools.py (Blind Hunter).
    location: >-
      _bmad-output/planning-artifacts/epics.md Story 12.3, pause; backend/bookvie/agent/tools.py PAUSE
    severity: medium
---

<intent-contract>

## Intent

**Problem:** An agent in Claude Code can read the library through `/mcp` (Stories 12.1, 12.2) but can't record anything, so "I'm on page 212 of DDIA" still means opening the app.

**Approach:** Register ten write tools (`start_reading`, `update_page`, `finish_reading`, `pause`, `set_up_next`, `edit_purpose`, `add_card_note`, `edit_card_note`, `mark_side_read`, `unmark_side_read`) after `get_stats`, in that order. Each tool takes its intent's JSON body as its arguments, parses them with the route's own `parse_*_intent`, calls the route's handler on `state.store` (and `state.clock` where the route passes it), and answers with the route's `OkResponse`. One shared mapping in `intents/` turns a handler's result into that `OkResponse`, for the route and the tool alike.

## Boundaries & Constraints

**Always:**
- Each tool's description is its Story 12.3 text character for character (`DESCRIPTIONS` in `backend/tests/test_agent_write.py`).
- Each tool's model is its intent model (`StartReadingIntent`, …), so its schema is `input_schema(<IntentModel>)`.
- Each tool answers like its route: the same `ids` and `reachedLastPage` (`reachedLastPage` only when true), the same AD-9 error, and `couldnt_save` on a write fault.
- `agent/` imports only `intents` and `views`, never `http` (`test_layers.py`).
- The routes keep their behaviour, and the OpenAPI document (`check:api`) stays byte-identical.

**Never:**
- Never register `delete_book`, `delete_card_note`, `restore` or `set_spine_color`.
- Never add a second validator in front of `parse_*_intent`, or coerce arguments.
- Never mint ids outside the intent modules. The contract test patches `uuid` in `bookvie.intents.start_reading`, `finish_reading` and `add_card_note`.
- No frontend change, and no README change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Page update | `update_page {bookId: MAIN, page: 212}` | `{ok: true}`; Reading at 212 | — |
| Last page | `update_page` at the page count | `{ok: true, reachedLastPage: true}` | — |
| New note | `add_card_note` valid | `{ok: true, ids: {cardNoteId}}` | — |
| No-op | `set_up_next` for current Up next | `{ok: true}`, bytes unchanged | — |
| Bad args | `"212"`, unknown key, missing key, `{}` | the route's identical error | `isError`, AD-9 JSON |
| State refusal | e.g. `pause` a non-Main book | `not_main_book` | `isError`, library unchanged |
| Write fault | FaultyFs at write | `couldnt_save` | library.json byte-identical, no temp file |
| Destructive | `delete_book` etc. | JSON-RPC -32602 "Unknown tool" | nothing changes |

</intent-contract>

## Code Map

- `backend/bookvie/agent/tools.py` -- `AgentTool`, `input_schema`, the read tools, and `TOOLS` (the cumulative tuple, 7 tools now). This is where the ten write tools and their helper go.
- `backend/bookvie/agent/server.py` -- `_answer`/`_success`/`_error`. `_success` already drops `None` from an `OkResponse`, an `IntentError` becomes the AD-9 error, and anything else is logged and answered `couldnt_save(500)`. Needs no change.
- `backend/bookvie/http/api.py:485-702` -- the ten routes. Each runs `parse_*_intent(intent)`, then its handler, then an `OkResponse`: `start_reading`/`update_page` give `reached_last_page=True if reached else None`, `add_card_note` gives `ids={"cardNoteId": note_id}`, and the others give `OkResponse(ok=True)`. Clock-taking handlers: `start_reading`, `update_page`, `finish_reading`, `pause`, `add_card_note`.
- `backend/bookvie/intents/__init__.py` -- exports every model, `parse_*_intent` and handler. A new `intents/answers.py` (exported here) holds the shared result→`OkResponse` mapping.
- `backend/bookvie/intents/contract.py` -- `OkResponse` (`ids`, `reached_last_page`).
- `backend/tests/test_agent_write.py` -- the 4 red leaves (`@pytest.mark.skip(reason=RED)` at the 4 tests) and the 87 contract cases.
- `backend/tests/test_agent_mount.py:46` -- `AGENT_TOOL_NAMES` (7) becomes the cumulative 17.
- `backend/tests/conftest.py` `connect_mcp`; `backend/tests/agent_client.py` `McpClient`; `backend/tests/test_cli.py` (a `cli._Server` / `uvicorn.Server` pattern) -- reuse for the shutdown test.
- `backend/bookvie/http/app.py:222` `lifespan` (`session_manager.run()`); `backend/bookvie/cli.py:180-193,316` (`_Server.shutdown`, which releases `bookvie.lock` under `write_lock`) -- the context for the shutdown entry.

Deferred-work intake:
- `deferred-work.md:1202-1204` (a call in flight when the session manager exits, holding the AD-4 lock; "settle in Story 12.3 with a shutdown-during-call test") -- task: a test where a real uvicorn server is told to exit during a write tool call. AC below.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/intents/answers.py` (new) and `intents/__init__.py` -- `ok()`, `page_answer(reached: bool)` (`reachedLastPage` only when true) and `card_note_answer(note_id)`. They are the one mapping the routes and the tools share.
- `backend/bookvie/http/api.py` -- the ten routes return through the `answers` functions. No signature, description or OpenAPI change.
- `backend/bookvie/agent/tools.py` -- add a `_write_tool(name, description, model, parse, call)` helper: `run` = `call(state, parse(json.dumps(arguments)))`. Add the ten tools, with their descriptions verbatim, and append them to `TOOLS` after `GET_STATS` in the AC's order. Update the module docstring.
- `backend/bookvie/agent/__init__.py` -- keep the exports coherent (no new public name needed beyond what the tests use).
- `backend/tests/test_agent_write.py` -- remove the four skip markers and the `RED` constant.
- `backend/tests/test_agent_mount.py` -- `AGENT_TOOL_NAMES` becomes the cumulative 17.
- `backend/tests/test_agent_shutdown.py` (new) -- a uvicorn server on a free port, in a thread, runs `create_app` with a wrapped `update_page` tool that blocks on an event after it has been entered. The test calls the tool, sets `should_exit`, releases the event, and asserts the deferred-work AC.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- add `resolved:` to entry 1202-1204 at Finalize.

**Acceptance Criteria:**
- Given the ten write tools, when a client lists them, then each schema equals its intent model's by alias, and the list is exactly 12.1's and 12.2's seven tools plus these ten (AC-1).
- Given the 87-case contract test, when each input goes through the tool and through `POST /api/intents/<verb>` on twin seeded libraries, then the answers and the stored `library.json` are identical, including no-ops, refusals and a write fault (AC-2, TR8).
- Given the registered tools, when their descriptions are listed, then each equals its Story 12.3 text (AC-3).
- Given `delete_book`, `delete_card_note`, `restore` or `set_spine_color`, when a client calls one, then the call fails as an unknown tool, nothing changes, and none of them is listed (AC-4).
- Given a write tool call in flight on a real uvicorn server, when the server is asked to exit, then shutdown waits for the call: the agent gets the tool's `{ok: true}` answer, `library.json` holds the committed page, and the lifespan (with the session manager) exits only after that (deferred-work 1202-1204).

### Review Findings

Code review, 2026-11-19 (`aeeeadd..a627357`). Layers: Blind Hunter, Edge Case Hunter (returned no findings), Verification Gap, Acceptance Auditor, Spine Check.

- [x] [Review][Patch] The `resolved:` note on the Story 12.1 shutdown entry claims more than the shutdown test pins [_bmad-output/implementation-artifacts/deferred-work.md:1205] — It says the test "pins it" and that the lock is "still released only after" the commit on a force exit "since `cli.py` releases it under `app.state.write_lock`". But the test uses its own copy of `cli.main`'s `release()` and `uvicorn.Config`, it blocks before `update_page.run`, so the AD-4 lock is never held during shutdown, no test covers a force exit, and the `timeout_graceful_shutdown` mutation isn't in the repo. Narrow the note: the test pins the graceful order; the force-exit and the release under the write lock are read from `cli.py`, not tested. (blind-hunter+verification-gap+acceptance-auditor)
- [x] [Review][Defer] The shutdown test doesn't run `cli.main`'s own `uvicorn.Config` and `release` [backend/bookvie/cli.py:315] — deferred: pre-existing `cli.main` code. Adding `timeout_graceful_shutdown`, or dropping `with app.state.write_lock:` from `release`, would pass every test. Add a `test_cli.py` test that pins both, at the Epic 12 retro. Low. (verification-gap+blind-hunter+acceptance-auditor)
- [x] [Review][Defer] The `set_up_next` description says the Book "can be unread or paused", but a finished Book can be Up next for a re-read [backend/bookvie/agent/tools.py:369] — deferred: the text is pinned by AC-3 from `epics.md` Story 12.3. `set_up_next.py` refuses only an unknown Book and the Main book, and AD-6 names a finished Book queued for a re-read, so an agent may wrongly refuse a re-read. Change `epics.md` first, with the `pause` text. Low. (spine-check)
- [x] [Review][Defer] The `pause` description says the Book "stays in Waiting for you", but it becomes Up next [backend/bookvie/agent/tools.py:352] — deferred: already recorded by the build review (`deferred-work.md`, "build-auto review of spec-12-3", medium). It isn't spine drift: the spine (AD-6, AD-19) is right and the text is wrong. It is fixed in `epics.md` first, because AC-3 pins it. No new entry. (blind-hunter+spine-check+acceptance-auditor+verification-gap)
- [x] [Review][Defer] Spine drift (AD-21, Structural Seed): `intents/answers.py` is named nowhere in the spine [backend/bookvie/intents/answers.py:1] — deferred: already recorded by the build review, reconciled before the next epic. No new entry. (spine-check+acceptance-auditor)

- 2026-11-19: full `npm run check` after the patch: exit 0. ruff clean, 1805 pytest passed, 388 unit passed, 799 e2e passed, smoke ok.

Rejected:
- `low`: three tools take a `lambda` and seven take a named wrapper (Blind Hunter). Nobody is harmed, and the fix adds a parameter or adapter. The build review rejected this too.
- `false`: the bare `ok` export is too generic (Blind Hunter). No module that imports it has a local `ok` that shadows it (`http/api.py`, `agent/tools.py`), and it names the `{ok: true}` answer it builds.
- `false`: `answers.py` covers only part of the routes, so Story 12.4 might build a second mapping (Blind Hunter). The docstring states that scope exactly ("The other intent routes build their `OkResponse` themselves"). Story 12.4's spec decides its own routes.
- `low`: `test_the_only_tool_is_get_app_info_…` is a stale name for a 17-tool assertion (Blind Hunter). It is already deferred to the Epic 12 retro (`deferred-work.md`, Story 12.2), and a rename means editing the Story 12.1 documents.
- `low`: the README doesn't say an agent can write (Blind Hunter). Stories don't update `README.md` (Oleg, 2026-11-14).
- `false`: a duplicate key in the arguments could differ between the tool and the route (Blind Hunter). The JSON-RPC body is parsed (last key wins) before `arguments` exists, so the tool never sees a duplicate. The route's `parse_form_intent` also parses through pydantic, where the last key wins.
- `false`: `answers.py`'s docstring cites AD-9 for a success answer (Acceptance Auditor). AD-9 is the whole answer envelope, `ok` and `ids` included (spine AD-8 rule: "the AD-9 envelope (`ok`, `ids.bookId`, …)").
- `low`: no test calls a tool with `arguments` absent (Acceptance Auditor). `server.call_tool` maps `None` to `{}`, which the `{}` cases already cover. The ATDD checklist hands it to `bmad-testarch-automate`.

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- verdicts: 15 findings — high 0, medium 1, low 10, false 4, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine Check: Spine drift (AD-21, Structural Seed). The shared success mapping lives in the new `intents/answers.py`, which the spine names nowhere. — The code is right and the spine is stale. Deferred to `deferred-work.md` with the spine-drift marker.
  - `[low]` `[patch]` Edge Case Hunter: the `resolved:` note claims the call always finishes, but a second Ctrl-C (force exit) drops the answer. — Patched: the note now says the graceful wait has no limit, and that on a force exit the answer is dropped while the commit stays atomic and the lock is released after it, under the write lock.
  - `[low]` `[reject]` Edge Case Hunter: `_free_port` races with another process before uvicorn binds. — A rare local-only flake, and the fix (pre-bound sockets passed to `serve`) adds structure. Not worth it.
  - `[low]` `[reject]` Edge Case Hunter: there's no `try/finally` when an assertion fails before `go_on.set()`. — It only matters once the test has already failed: the threads are daemons and the wait is bounded by `WAIT`. The fix adds structure.
  - `[low]` `[reject]` Blind Hunter: the shutdown test builds its own `uvicorn.Config`, so a future `timeout_graceful_shutdown` in `cli.py` wouldn't be caught. — It would only matter after a change nobody plans. Pinning `cli.main`'s config would need a new test, not a direct correction.
  - `[low]` `[patch]` Blind Hunter: the graceful wait is unbounded and the resolution doesn't say so. — Same root cause as the force-exit row, patched with it.
  - `[low]` `[reject]` Blind Hunter: no cleanup on failure in the shutdown test. — Same as the Edge Case Hunter row above, rejected for the same reason.
  - `[low]` `[patch]` Blind Hunter: the `answers.py` docstring claims every intent, but six routes still build `OkResponse` inline. — Patched: the docstring is narrowed to the ten intents the write tools share.
  - `[low]` `[patch]` Blind Hunter: the `tools.py` docstring implies every non-destructive intent is now a tool. — Patched: it now says `add_book` and `edit_book` come in Story 12.4.
  - `[low]` `[reject]` Blind Hunter: eight near-identical handler-then-`ok()` wrappers. — No caller is harmed, and the fix adds a parameter or flag to `_write_tool`.
  - `[low]` `[reject]` Blind Hunter: `state` is typed `Any`. — This is 12.1's existing `AgentTool.run` convention, and the 87 contract cases call every tool, so a typo can't ship unseen.
  - `[medium]` `[defer]` Blind Hunter: the `pause` description says the Book "stays in Waiting for you", but `pause.py` makes it Up next (`views/models.py` role `upNext`, not `waiting`). — Real, but the text is quoted character for character in the intent (AC-3), and descriptions change in `epics.md` first. Deferred for Oleg.
  - `[false]` `[reject]` Blind Hunter: most descriptions don't say where `bookId` comes from. — `find_book`'s description says "Every other tool takes the Book's id from here", and the texts are fixed by AC-3.
  - `[false]` `[reject]` Blind Hunter: `EARLIER_TOOL_NAMES` duplicates `AGENT_TOOL_NAMES`. — Deliberate: a test module must not import another (ATDD checklist, `tests/helpers.py`), and AC-1 asserts the cumulative list, so the lists can't drift silently.
  - `[false]` `[reject]` Blind Hunter: no test runs a call with `arguments` absent. — The behaviour is identical: `server.call_tool` maps `None` to `{}`, `parse_form_intent` refuses `"{}"` with `malformed()` because the required keys are missing, and a missing route part gives the same `malformed()`. The `pause` missing-`bookId` case sends exactly `{}`. The explicit no-`arguments` leaf is an ATDD green-phase follow-up for `bmad-testarch-automate`.

## Design Notes

The tool calls the route's own `parse_*_intent` on `json.dumps(arguments)`, not `parse_arguments(model, …)`, so a parser that later adds a rule applies to both. Both forms are the same `parse_form_intent` today. Missing `arguments` reach the tool as `{}`, which the model refuses as malformed, as the route refuses a missing `intent` part.

```python
UPDATE_PAGE = _write_tool("update_page", "...", UpdatePageIntent, parse_update_page_intent,
    lambda state, intent: page_answer(update_page(state.store, state.clock, intent)))
```

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_write.py tests/test_agent_mount.py tests/test_agent_shutdown.py tests/test_layers.py --no-cov` -- expected: all pass.
- `npm run check` (repo root) -- expected: green, OpenAPI and schema unchanged.

## Auto Run Result

Status: in-review

**Summary.** Ten MCP write tools (`start_reading`, `update_page`, `finish_reading`, `pause`, `set_up_next`, `edit_purpose`, `add_card_note`, `edit_card_note`, `mark_side_read`, `unmark_side_read`) are registered after `get_stats`, with their Story 12.3 descriptions. Each one parses with its route's `parse_*_intent`, calls the route's handler, and answers through `intents/answers.py`, which the ten routes now share. The destructive intents stay unregistered. The deferred-work entry on a call in flight at shutdown is settled by a real-uvicorn test.

**Files changed:**
- `backend/bookvie/intents/answers.py` (new): `ok`, `page_answer`, `card_note_answer`, the answer mapping the routes and tools share.
- `backend/bookvie/intents/__init__.py`: exports them.
- `backend/bookvie/http/api.py`: the ten routes answer through `answers`. OpenAPI is unchanged.
- `backend/bookvie/agent/tools.py`: the `_write_tool` helper, the ten tools, a cumulative `TOOLS` of 17, and the docstring.
- `backend/tests/test_agent_write.py`: the four ATDD leaves are un-skipped.
- `backend/tests/test_agent_mount.py`: `AGENT_TOOL_NAMES` has the cumulative 17.
- `backend/tests/test_agent_shutdown.py` (new): a write call in flight during shutdown finishes and answers, then the lifespan exits, then the lock is released.
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` on the Story 12.1 shutdown entry, and this review's deferrals.

**Review.** 15 findings. 4 patched, all low and all text (the resolution note, the `answers.py` docstring, the `tools.py` docstring; two rows share one root cause). 2 deferred: spine drift for AD-21 and the Structural Seed (low), and the `pause` description's "Waiting for you" wording (medium, fixed by AC-3, change `epics.md` first). 9 rejected, with the reasons in the Review Triage Log: 5 low (the port race, no try/finally twice, an unpinned cli config, wrapper duplication, `state: Any`) and 4 false (the `bookId` hints, the duplicated name list, missing `arguments`).

**Follow-up review recommended:** false. No high or medium finding was patched (patched: high 0, medium 0, low 4).

**Verification.**
- The spec's pytest command: 202 passed, before and after the patches.
- `npm run check` after the patches: exit 0. ruff clean, 1805 pytest passed, `schema.d.ts is up to date`, 799 e2e passed, smoke ok (`POST /mcp initialize` with tools).
- The matrix audit: every row is covered by an AC-2 case or by an AC-4 leaf that ran.

**Residual risks.**
- A force exit (second Ctrl-C) during a write call drops the agent's answer. The commit stays atomic.
- The `pause` description misnames where the Book goes, until `epics.md` changes.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
