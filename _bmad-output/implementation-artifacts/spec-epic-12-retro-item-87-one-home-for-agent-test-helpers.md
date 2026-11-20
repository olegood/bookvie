---
title: 'One home for the agent-test helpers'
type: 'chore'
created: '2026-11-20'
status: 'done'
route: 'oneshot'
baseline_commit: 'd10b22f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/backend/tests/agent_client.py'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 12 retro item 87 (E12-D1, E12-D2, E12-B4, the stale test name; sprint item `epic-12-retro-item-87-one-home-for-agent-test-helpers`), due before Epic 13. The agent tool list was re-assembled in about ten places across five test files, each description lived in `epics.md`, `tools.py` and a per-file test constant, and there were four ways to read a tool's answer. Nothing checked that `editForm` (server) and `toPanelFields` (client) build the same form. Nothing pinned `cli.main`'s own shutdown config. `test_the_only_tool_is_get_app_info_…` had a stale name. Item 78's helper-reuse fact covered `frontend/e2e/*.ts` only.

**Approach:** in `backend/tests/agent_client.py`, keep one cumulative tool list, the 20 descriptions read from `epics.md` Epic 12 (each "Description:" line, plus the 12.5 addition), one answer unwrapper and one error reader. Use them in every `test_agent_*.py` and both skill tests, with no assertion changes. Rename the stale test and resolve its `deferred-work.md` entry. Add an `editForm`/`toPanelFields` parity check (one case table read by pytest and node's test runner, as `pace.cases.json` is). Add the `cli.main` shutdown-config pin. Extend item 78's helper-reuse fact to `backend/tests/*.py`.

</frozen-after-approval>

## Implementation Notes

- **`backend/tests/agent_client.py`** now holds:
  - `EARLIER_TOOL_NAMES`, `WRITE_TOOL_NAMES`, `BOOK_TOOL_NAMES`, `EXPORT_BACKUP` and `AGENT_TOOL_NAMES`, their concatenation.
  - `DESCRIPTIONS`, a mapping parsed on first use (not at import, since `conftest.py` imports the module) from `epics.md`'s Epic 12 section. The "Description:" lines come in tool-list order, each inside its tool's `### Story 12.x` section, and a bulleted line also names its tool. The parse fails with a message naming the problem unless there are exactly 20 lines, each in the expected story, and one "Description addition", which ends both book tools' descriptions. The parsed text equals the 20 literals it replaces, character for character (checked before the literals were deleted). A copy of `epics.md` with one line broken, or with Story 12.6's heading renumbered, fails the parse with its message.
  - `structured_of`, which was `test_agent_read._structured`, next to `error_of` and `text_of`.
- **Callers:**
  - `test_agent_mount`, `_read`, `_write`, `_book_write`, `_cover_url` and `_backup` import the list, groups and descriptions instead of defining or re-importing them from `test_agent_write`. Every `EARLIER + WRITE + BOOK + ["export_backup"]` is now `AGENT_TOOL_NAMES`.
  - `_tool_answer` uses `structured_of`.
  - `test_agent_backup` drops its lenient `_backup`/`_error_code` (red-phase helpers that never raised): calls are `client.call_tool(EXPORT_BACKUP)`, and `_error_code(a) == c` is `error_of(a)["code"] == c`, which also asserts `isError`. Error bodies read with `error_of`, as does `test_agent_book_write`'s missing-keys refusal.
  - Both skill tests import `structured_of` from `agent_client`, not `_structured` from `test_agent_read`.
  - Direct `result["structuredContent"]` reads in leaves are left as they are: changing them would change assertions.
- **Rename:** `test_the_tool_list_is_epic_12s_and_get_app_info_returns_the_app_info_view`. The Story 12.1 and 12.2 ATDD checklists, the Story 12.2 and 12.3 specs and the Epic 12 retro keep the old name as history.
- **Parity:** `frontend/src/lib/editForm.cases.json` has three cases: absent values; every optional value with one finish; the latest of several finishes, no tags, a non-ASCII title and an ebook.
  - `backend/tests/test_edit_form_parity.py` checks each case's `book` has exactly `EditableBook`'s 13 keys, seeds it with `LibraryBuilder` (`write` checks the invariants), then checks the `book` view's prefill fields against the case's `book` and its `editForm` against `fields`, key order included.
  - `bookDetail.test.ts` runs `toPanelFields` on each `book`.
- **Shutdown pin:** `test_cli.py::test_main_waits_for_in_flight_calls_and_releases_the_lock_under_the_write_lock` runs `cli.main` with the fake server. It asserts `timeout_graceful_shutdown is None`. It then calls `release()` with `instance.release_lock` wrapped to record whether `app.state.write_lock` is held at that moment, and asserts it was held, is free afterwards, and `bookvie.lock` is gone.
- **ATDD fact:** item 78's helper-reuse fact in `_bmad/custom/bmad-testarch-atdd.toml` gains a pytest paragraph (a `grep` that also finds tuple and annotated constants, `agent_client.py` first, then `helpers.py`, `builder.py`, `servers.py`, `conftest.py`; a new tool joins `agent_client.py`, and its description is read from `epics.md`). Its validate-mode clause covers the shared `backend/tests/` modules.
- **`deferred-work.md`:** `resolved:` lines on the stale-name entry (Story 12.2 code review) and the `cli.main` pin entry (Story 12.3 code review).
- **Mutation checks (2026-11-20)**, each edit reverted by hand right after, with `git status` clean for the source:
  - "catalog" → "catalogue" in `list_catalog`'s registered description fails `test_list_catalog_returns_the_catalog_view`.
  - `"; "` → `";"` for authors fails the parity check: 2 of node's cases with `bookDetail.ts` mutated, and 2 pytest cases with `views/shelf.py` mutated.
  - `timeout_graceful_shutdown=5` in `cli.main`'s `Config` fails the pin, and so does `release()` without the write lock.
- **Not changed:** `bookvie/` source, and the e2e `callTool`/`smoke.mjs` handshakes (E12-D2's handshake copies), which are outside this item's file list.
- **Sprint item 87** is marked `done` in `sprint-status.yaml` in the same commit.

## Review Triage Log

### 2026-11-20: blind reviewer, pass 1

It found no weakened assertion and re-ran the touched files (474 pytest, 22 node), then reported 8 findings, all patched:

- **`[medium]` The descriptions were parsed at import, and `conftest.py` imports `agent_client`,** so a malformed `epics.md` would stop collection of the whole backend suite. `DESCRIPTIONS` is now a mapping that parses on first use, with messages that say what's wrong.
- **`[low]` Un-bulleted description lines were matched by position only.** Each line must now also sit in its tool's story section.
- **`[low]` `test_each_write_tools_description_is_the_storys_text` silently widened to all 20 tools** once `DESCRIPTIONS` held them all. It is restricted to `WRITE_TOOL_NAMES` again.
- **`[low]` The cover-URL `endswith(COVER_URL_SENTENCE)` check became always true,** since the expected text is built by appending that sentence. Dropped, together with the `COVER_URL_SENTENCE` export; the equality check remains.
- **`[low]` The rename's `resolved:` line named the wrong documents.** Reworded.
- **`[low]` The ATDD fact's `grep` missed tuple and annotated constants.** Widened.
- **`[low]` A parity case could leave out a key unnoticed.** Each case's `book` must have exactly `EditableBook`'s keys.
- **`[low]` The `cli` pin relied on a 0.3 s join** and could pass on a loaded machine if `release()` lost the write lock. It now records `write_lock.locked()` inside a wrapped `release_lock`, which is deterministic; the no-lock mutation still fails it.

- **Full check after the patches (2026-11-20):** `npm run check` exit 0: 2,168 pytest, 389 node unit, 800 e2e, smoke. A run before the patches also exited 0, with the same counts.
