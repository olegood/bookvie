---
title: 'Story 12.4: Let an agent add and edit a Book'
type: 'feature'
created: '2026-11-19'
status: 'in-review'
baseline_revision: '51466692153354c36bcfe9cd6923b298db412c4f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md'
warnings: []
deferred:
  - summary: >-
      edit_book's story-mandated description says "Call get_book first and send every field", but get_book answers in view shapes, not form shapes.
    evidence: |-
      BookDetailView (backend/bookvie/views/models.py:244-266) gives authors and tags as lists, pages, edition and year as integers, latestFinishDate rather than finishedOn, and spineColor as the resolved color (spineColorUser is the override). Wrong types are refused safely on intent, but an agent that copies spineColor pins a curated or cover color as the user's color. The description text is fixed verbatim by the story's AC-2, so the fix (amend the description, or give get_book form-shaped fields) is Oleg's call.
    location: >-
      backend/bookvie/agent/tools.py EDIT_BOOK
    severity: medium
  - summary: >-
      Spine drift (AD-21, AD-3), reconciled before the next epic: edit_book's tool-side missing-key refusal is the one exception to "the route's parser is the only validator" and "exactly as the route".
    evidence: |-
      _write_tool's required check refuses a partial edit with invalid_fields (one "Field required" per missing key, in schema order) before parse_edit_book_intent runs; the route accepts it. AD-21 "Edits are whole" only says the schema requires every key (Spine Check, build-auto review of Story 12.4).
    location: >-
      backend/bookvie/agent/tools.py _write_tool
    severity: low
---

<intent-contract>

## Intent

**Problem:** An agent can read the library and record reading (12.2, 12.3), but it can't add a Book or correct one. Cataloging from Claude Code needs the New book panel's checks, so it can't create duplicates or half-filled Books.

**Approach:** Register `add_book` and `edit_book` write tools after `unmark_side_read`, each with the story's description verbatim. They parse with the route's `parse_add_book_intent` / `parse_edit_book_intent` and call the route's handlers, so they store, answer and refuse as `POST /api/intents/add-book` / `edit-book` do. `edit_book` is a whole edit: its schema requires every form key plus `bookId`, and a call missing any of them is refused with `invalid_fields` before the handler runs.

## Boundaries & Constraints

**Always:** The add-book tool advertises `input_schema(AddBookIntent)` unchanged. The edit-book tool advertises `input_schema(EditBookIntent)` with `required` = every form key plus `bookId`; nothing else in its schema differs. The route's parser is the only validator of a call that has every required key (a wrong type, `null` or an unknown key is the route's `intent` refusal). Answers are the routes': `{ok: true, ids: {bookId}}` and `{ok: true}`, built by shared `intents.answers` functions the routes use too. `agent/` imports only `intents` and `views`.

**Never:** No `coverUrl` (Story 12.5). No change to the routes' behavior or to the OpenAPI contract (`check:api` stays byte-identical). No merge with the stored Book in `edit_book`. No `delete_book` tool. No edit to existing leaves' assertions beyond the cumulative tool lists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add | valid form keys | Book stored, `{ok, ids: {bookId}}` | — |
| Edit, whole | every form key + `bookId` | Book replaced, `{ok: true}`; an unchanged edit still commits | — |
| Edit, partial | `{bookId, title}` | nothing stored | `invalid_fields`, one field per missing key named by its key, message "Field required", in schema order |
| Invalid / duplicate / not found / pages floor / fault | as the route | as the route | the route's AD-9 error |

</intent-contract>

## Code Map

- `backend/bookvie/agent/tools.py` -- `AgentTool` (name, description, model, run); `input_schema(model)`; `_write_tool(name, description, model, parse, call)` (12.3); `TOOLS` tuple ends at `UNMARK_SIDE_READ`. Module docstring says add/edit "come in Story 12.4".
- `backend/bookvie/agent/server.py:42` -- lists each tool with `input_schema(tool.model)`; must list the tool's advertised schema instead.
- `backend/bookvie/agent/__init__.py` -- exports.
- `backend/bookvie/intents/answers.py` -- `ok`, `page_answer`, `card_note_answer`; docstring says "ten intents". Exported from `intents/__init__.py:7`.
- `backend/bookvie/http/api.py:403-445` -- `add_book_intent` answers `OkResponse(ok=True, ids={"bookId": …})`, `edit_book_intent` answers `OkResponse(ok=True)` inline.
- `backend/bookvie/intents/add_book.py:42-47`, `edit_book.py:83-100` -- `AddBookIntent` (= `BookFormIntent`: 13 form keys `str | None = None`, `confirmDuplicate`), `EditBookIntent` (+ `bookId: str`, `removeCover`); parsers take a raw JSON string (`has_cover=False` for the tool).
- `backend/tests/test_agent_write.py:707-970` -- 4 red leaves (`@pytest.mark.skip(reason=RED)`), `FORM_KEYS`, `BOOK_TOOL_NAMES`, `BOOK_CASES`; `:427` and `:692` assert `EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES`.
- `backend/tests/test_agent_mount.py:46` -- `AGENT_TOOL_NAMES` (17).
- `_bmad-output/implementation-artifacts/epic-12-context.md:34` -- Mount line still names `MCPServer`.
- Deferred-work intake: `deferred-work.md:1196` (epic-12-context's Mount line names `MCPServer`, read by "Stories 12.2–12.4") -- taken: correct the line (task below). No other entry names story 12.4.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/intents/answers.py` (+ `intents/__init__.py`) -- add `book_answer(book_id)` returning `ids.bookId`; docstring now covers twelve intents -- route and tool share the answer.
- `backend/bookvie/http/api.py` -- `add_book_intent` returns `book_answer(book_id)`, `edit_book_intent` returns `ok()` -- same JSON, one source.
- `backend/bookvie/agent/tools.py` -- add `required: tuple[str, ...] = ()` to `AgentTool` (keys the tool requires though its model leaves them optional) and `advertised_schema(tool)`: `input_schema(tool.model)` with `required` extended in property order. `_write_tool` takes `required`; its `run` refuses missing keys with `invalid_fields` before `parse`. Add `ADD_BOOK` and `EDIT_BOOK` (required = the 13 form keys) and append both to `TOOLS`; update the docstring.
- `backend/bookvie/agent/server.py`, `agent/__init__.py` -- list `advertised_schema(tool)`; export it.
- `backend/tests/test_agent_mount.py`, `backend/tests/test_agent_write.py` -- tool lists become the cumulative 19; un-skip the 4 leaves and drop `RED`.
- `_bmad-output/implementation-artifacts/epic-12-context.md` -- Mount line names the low-level `Server` (`agent.build_mcp_server`) served through `_McpRoute`.

**Acceptance Criteria:**
- Given `add_book`, when a client lists it, then its schema equals `input_schema(AddBookIntent)` (no `coverUrl`) and its description is the story's text.
- Given `edit_book`, when a client lists it, then its schema is `input_schema(EditBookIntent)` with every form key and `bookId` required, and its description is the story's text.
- Given the 20 `BOOK_CASES`, when each runs through the tool and through its route on twin libraries, then answers and `library.json` bytes are equal.
- Given Dune with a subtitle, ISBN, tags and spine color, when `edit_book` gets only `bookId` and `title`, then it is refused with `invalid_fields` naming the 12 missing keys and the Book is unchanged.

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- verdicts: 18 findings — high 0, medium 2, low 11, false 5, maybe-false 0
- findings:
  - `[medium]` `[defer]` (edge 1) Agent echoes get_book's resolved spineColor into edit_book, pinning it as spineColorUser — verified in BookDetailView; the description is the story's verbatim AC-2 text, so the fix is a product decision; deferred.
  - `[medium]` `[defer]` (edge 2) get_book's view types (int pages, list authors, latestFinishDate) don't match edit_book's string form — same root as above; refused safely on intent; deferred with it.
  - `[low]` `[reject]` (edge 3) A partial call with an unknown key reports only the missing keys — the spec orders the missing-key check first; the agent gets the other refusal on retry, harmless.
  - `[false]` `[reject]` (edge 4) removeCover advertised but undocumented — AC-2 itself requires removeCover in the schema as optional.
  - `[low]` `[defer]` (spine) Spine drift (AD-21, AD-3): the tool-side required-key refusal isn't in the spine — deferred as spine drift per AGENTS.md.
  - `[medium]` `[patch]` (verification-gap) No tool-vs-route case on a Book with a cover, or with removeCover — added `Case.cover`, passed to `_seed` in `_twins`, and two cases `keeps-cover` (unchanged) and `remove-cover` (ok); both pass.
  - `[false]` `[reject]` (intent) AC-4 "invalid arguments" could mean a JSON-RPC error — the epic context says the SDK doesn't validate and every refusal is an AD-9 `isError` result; ATDD pins that surface.
  - `[medium]` `[defer]` (blind 1) Following edit_book's description round-trips get_book wrongly — grouped with edge 1/2.
  - `[medium]` `[defer]` (blind 2) No test runs the get_book → edit_book round trip — grouped with edge 1/2; the ATDD checklist already lists it as a follow-up for automate.
  - `[false]` `[reject]` (blind 3) removeCover is an undocumented destructive option — AC-2 mandates it; removing a cover isn't one of the destructive intents AD-21 excludes.
  - `[medium]` `[patch]` (blind 4) Nothing tests that edit_book keeps an existing cover — same root as verification-gap; fixed by its `keeps-cover` case.
  - `[low]` `[reject]` (blind 5) Descriptions omit spineColor/finishedOn formats, and "empty is cleared" is wrong for finishedOn — both descriptions are the story's verbatim text; emptying finishedOn is refused, not destructive.
  - `[false]` `[reject]` (blind 6) add_book's schema has no required array though the description lists required fields — AC-1 says "every form key optional, as in the route".
  - `[low]` `[reject]` (blind 7) epic-12-context.md edits beyond the Mount line — they come from step-01's regeneration of the stale context; the dropped versions are in backend/pyproject.toml.
  - `[low]` `[reject]` (blind 8) A fifth test not in the spec's Tasks — it covers the I/O matrix's partial-edit row (message and order), required by the matrix test audit.
  - `[low]` `[reject]` (blind 9) A partial edit for a deleted Book answers invalid_fields, not book_not_found — the route never sees a partial edit from the tool; refusing early is the spec's design.
  - `[low]` `[reject]` (blind 10) BOOK_FORM_KEYS, MISSING_MESSAGE and _required_schema duplicate other definitions — reusing book_form's private `_FORM_FIELDS` would couple modules; no caller diverges today.
  - `[low]` `[reject]` (blind 11) The 12.3 test name still says "ten"; the real-process test doesn't check edit_book's required — renaming touches 12.3 docs; the in-process leaf checks the same `build_mcp_server` path.

## Design Notes

The required-key check lives on the tool, not the model: `EditBookIntent` stays the route's model, so the route keeps treating an omitted key as empty. `required` holds aliases; the check is `[k for k in schema["required"] if k not in arguments]`, so `bookId` (already required by the model) is named too when missing.

## Verification

**Commands:**
- `cd backend && uv run pytest -q --no-cov tests/test_agent_write.py tests/test_agent_mount.py tests/test_layers.py` -- expected: all pass, none skipped for 12.4.
- `npm run check` -- expected: green, OpenAPI unchanged.

## Auto Run Result

Status: in-review

**Summary:** Agents get `add_book` and `edit_book` MCP write tools, appended after `unmark_side_read` with the story's descriptions verbatim. Both parse with the route's parser, call the route's handler, and answer through shared `intents.answers` functions (`book_answer` is new; the routes use it and `ok()` too). `edit_book` is a whole edit: `AgentTool.required` and `advertised_schema` require the 13 form keys plus `bookId`, and a call missing any of them is refused with `invalid_fields` ("Field required", in schema order) before the parser runs.

**Files changed:**
- `backend/bookvie/agent/tools.py` -- `AgentTool.required`, `advertised_schema`, the missing-key check in `_write_tool`, `ADD_BOOK`, `EDIT_BOOK`, `BOOK_FORM_KEYS`.
- `backend/bookvie/agent/server.py`, `agent/__init__.py` -- list tools by `advertised_schema`; export it.
- `backend/bookvie/intents/answers.py`, `intents/__init__.py` -- `book_answer`.
- `backend/bookvie/http/api.py` -- add-book and edit-book routes answer through `book_answer` / `ok()` (same JSON).
- `backend/tests/test_agent_write.py` -- 4 ATDD leaves un-skipped, cumulative lists, a partial-edit order/message leaf, `Case.cover` and two cover cases.
- `backend/tests/test_agent_mount.py` -- `AGENT_TOOL_NAMES` is 19.
- `_bmad-output/implementation-artifacts/epic-12-context.md` -- regenerated (stale); Mount line names the low-level `Server`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- line 1196 resolved; this review's two deferrals.

**Review:** 18 findings. 1 patch (the cover cases, grouping 2 findings, medium); 2 deferrals (the get_book → edit_book round trip, medium; spine drift AD-21/AD-3, low); 13 rejected with reasons in the triage log.

**Follow-up review recommended:** false. Patched this pass: high 0, medium 1, low 0.

**Verification:** `uv run pytest -q --no-cov tests/test_agent_write.py tests/test_agent_mount.py tests/test_layers.py`: 291 passed, none skipped. `npm run check`: exit 0 (`smoke: ok`), run again after the patch.

**Residual risks:** An agent that follows edit_book's description literally can pin a Book's resolved spine color as the user's color, or get refused for sending get_book's list or integer shapes (deferred, medium; needs Oleg's decision on the description or the view). The ATDD checklist's other follow-ups (fsync/replace faults, the real-process add_book, more partial-edit shapes) are for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
