---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-19'
storyId: '12.3'
storyKey: '12-3-let-an-agent-record-my-reading'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-123-let-an-agent-record-my-reading'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-3-let-an-agent-record-my-reading.md'
generatedTestFiles:
  - 'backend/tests/test_agent_write.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 12 intro, Conventions for every story (TR8), Story 12.3; AR36, AR37, AR38)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D5, D6, D13; §5 story cut; §6 tests)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-3 backlog, 12-2 done)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (Story 12.1 and 12.2 entries)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-2-let-an-agent-read-my-library.md (format, fixtures)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/__init__.py, agent/tools.py, agent/server.py'
  - 'backend/bookvie/intents/__init__.py, intent_model.py, commit.py, contract.py, start_reading.py, update_page.py, finish_reading.py, pause.py, set_up_next.py, edit_purpose.py, add_card_note.py, edit_card_note.py, side_reads.py'
  - 'backend/bookvie/http/api.py (the ten intent routes, _intent_error)'
  - 'backend/tests/conftest.py (connect_mcp, mcp_client), agent_client.py, builder.py, helpers.py (FaultyFs, library_bytes, temp_files, assert_invariants), test_agent_mount.py, test_agent_read.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the ten write tools start_reading, update_page, finish_reading, pause, set_up_next, edit_purpose, add_card_note, edit_card_note, mark_side_read, unmark_side_read, when a client lists them, then each one''s input schema equals its intent model''s by alias (bookId, page, purpose, finishedOn, purposeFulfilled, rating, cardNoteId, text), and the tool list holds exactly 12.1''s and 12.2''s tools plus these ten.' }
  - { id: AC-2, idSource: generated, text: 'Given one parametrized contract test over the ten tools, when each case sends the same input through the tool and through POST /api/intents/<verb> on two identical seeded libraries, then both give the same stored library.json and the same result: the same ok, ids and reachedLastPage, or the same kind, code, message and fields; and the cases include, per tool where it applies: success; a no-op success (set_up_next for the Book already Up next, mark_side_read for a Side read, unmark_side_read for a Book that isn''t one); book_not_found; invalid_fields with its fields; a wrong JSON type, an unknown key and a missing key refused as the route refuses them; and the state refusals (not_main_book, already_main, reading_already_finished, main_cannot_be_up_next, main_cannot_be_side_read, side_reads_full, card_note_not_found); and a filesystem fault at write gives couldnt_save and an unchanged library.json through the tool too (TR8).' }
  - { id: AC-3, idSource: generated, text: 'Given the descriptions, when the tools are registered, then each equals its text in Story 12.3 (start_reading, update_page, finish_reading, pause, set_up_next, edit_purpose, add_card_note, edit_card_note, mark_side_read, unmark_side_read, quoted in DESCRIPTIONS in backend/tests/test_agent_write.py character for character).' }
  - { id: AC-4, idSource: generated, text: 'Given the tool list, when a client calls delete_book, delete_card_note, restore or set_spine_color, then the call fails as an unknown tool and nothing changes, and a test asserts none of them is listed.' }
---

# ATDD Checklist: Story 12.3 Let an agent record my reading

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. The story has no UI, so every leaf is pytest.
- **Story:** `epics.md` Story 12.3 has 4 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-4 in source order (registry above). Each "And" line belongs to the criterion above it, and AC-3's ten descriptions are part of AC-3. `sprint-status.yaml` reads `backlog` for 12.3 and `done` for 12.2.
- **Epic gate:** 12.3 isn't Epic 12's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `bookvie.agent.TOOLS` holds 12.1's and 12.2's seven tools. `AgentTool`, `input_schema` and `parse_arguments` (which runs `parse_form_intent` on the JSON of the arguments, so a malformed argument object is refused on `intent` exactly as the route refuses a malformed part) are the 12.1 helper. `server._success` drops `None` from an `OkResponse`, as the routes' `response_model_exclude_none` does, and `_answer` turns an `IntentError` into the AD-9 `error` object and anything else into `couldnt_save`.
  - Each of the ten intents has a model (`StartReadingIntent`, …) and a `parse_*_intent(raw)` in `bookvie.intents`, and a handler the route calls: `start_reading(store, clock, …) -> bool` and `update_page(store, clock, …) -> bool` (`reachedLastPage`), `add_card_note(store, clock, …) -> str` (`ids.cardNoteId`), `finish_reading(store, clock, …)`, `pause(store, clock, …)`, and `set_up_next`, `edit_purpose`, `edit_card_note`, `mark_side_read`, `unmark_side_read` with `(store, …)`.
  - **The route's answers.** `start-reading` and `update-page` add `reachedLastPage: true` when the page sent is the Book's last (each turns its handler's bool into `True if reached else None`). `add-card-note` adds `ids: {cardNoteId}`. The others answer `{ok: true}`. AC-2 compares the tool with the route, so the tool must map each handler's result exactly as its route does.
  - Three intents mint ids with `uuid.uuid4()`: `start_reading` (a new Reading), `finish_reading` (a back-filled Reading) and `add_card_note`.

## Generation Mode

**AI generation**, sequential, in this session. No recording: there's no UI. The leaves reuse 12.1's `McpClient` and `connect_mcp`, and compare each tool with its own route on a twin app.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (pytest, `mcp_client`) | P0 | `test_the_ten_write_tools_advertise_their_intent_models_schemas_and_join_the_tool_list`. **The listed names are exactly 12.1's and 12.2's seven, then the ten write tools in the AC's order.** Then each write tool's `inputSchema` equals `bookvie.agent.input_schema(<its intent model>)`, is a closed object, has exactly the AC's keys by alias, and requires exactly the keys the model requires; `purpose` admits `null` on `start_reading` and `edit_purpose`; `bookId` is a plain string everywhere. | The test names each tool's model, so a tool wired to the wrong model fails. `input_schema` itself is 12.1's, tested there. |
| AC-2 | API (pytest, two `connect_mcp` apps on copies of one seed) | P0 | `test_each_write_tool_stores_and_answers_exactly_as_its_intent_route`, parametrized over 87 cases. **The tool's answer equals the route's: `("ok", body)` or `("error", error)`.** Then the two `library.json` files are byte-identical. Then the case is checked against the route: the expected `ok` / no-op / `reachedLastPage` or the expected `code` and field names; invariants hold after a success; a refusal or fault leaves `library.json` as it was and no temporary file. | P0 risk "same handler" (plan §6). Comparing with the route on a twin app keeps the leaf from restating each intent's rules. |
| AC-3 | API (pytest) | P1 | `test_each_write_tools_description_is_the_storys_text`. **The ten listed descriptions equal the AC's texts, as one dict.** | Descriptions are the interface (D13). |
| AC-4 | API (pytest, seeded) | P0 | `test_the_destructive_intents_stay_unlisted_and_calling_one_changes_nothing`. **Of the ten write tools and the four destructive names, exactly the ten are listed.** Then `delete_book`, `delete_card_note`, `restore` and `set_spine_color`, each with arguments its route would act on, are a JSON-RPC `-32602` naming the tool, and `library.json` and the folder's file list are unchanged. | P0 risk "no destructive tools". 12.1's `test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing` already covers three of the names on an empty library; this leaf asserts it next to the write tools, on a seeded one, with `set_spine_color` too. |

**The AC-2 cases** (`CASES` in `backend/tests/test_agent_write.py`). Seed: Main book at page 120 of 616 with a Purpose and one Card note; Up next never started; a paused Book at page 200 of 448 with no Purpose; a finished Book; an unread Book; two Side reads (three for `side_reads_full`).

| Tool | Cases |
|---|---|
| `start_reading` | new Reading (Up next); resume a paused Book at its last page (`reachedLastPage`); a Side read with `page`; a Side read without `page` (`invalid_fields` `page`); `page` past the end (`page`); `already_main`; `book_not_found`; wrong type, unknown key, missing `purpose` (`intent`) |
| `update_page` | success; last page (`reachedLastPage`); past the end and `"212"` (`page`); `not_main_book`; `book_not_found`; wrong type, unknown key, missing `page` |
| `finish_reading` | finish the Main book; back-fill an unread Book (a minted Reading id); every field wrong (`finishedOn`, `purposeFulfilled`, `rating`); `purposeFulfilled` without a Purpose; `reading_already_finished`; `book_not_found`; wrong type, unknown key, missing `rating` |
| `pause` | success; `not_main_book`; `book_not_found`; wrong type, unknown key, missing `bookId` |
| `set_up_next` | success (the paused Book); no-op for the Book already Up next; `main_cannot_be_up_next`; `book_not_found`; wrong type, unknown key, missing `bookId` |
| `edit_purpose` | success on the Main book (trimmed); success on a paused Book; `null` clears it; `reading_already_finished`; `book_not_found`; wrong type, unknown key, missing `purpose` |
| `add_card_note` | success (`ids.cardNoteId`, minted); Note and Page wrong (`text`, `page`); `book_not_found`; a numeric `page` (`intent`, strict string); wrong type, unknown key, missing `text` |
| `edit_card_note` | success; Page past the end (`page`); `card_note_not_found`; `book_not_found`; wrong type, unknown key, missing `cardNoteId` |
| `mark_side_read` | success; no-op for a Side read; `main_cannot_be_side_read`; `side_reads_full`; `book_not_found`; wrong type, unknown key, missing `bookId` |
| `unmark_side_read` | success; no-op for a Book that isn't one; `book_not_found`; wrong type, unknown key, missing `bookId` |
| every tool (TR8) | its success input with `FaultyFs("write")` on both apps: `couldnt_save`, `library.json` byte-identical, no temporary file |

**Primary branch per criterion.** AC-1's newly promised fact is the cumulative tool list; AC-2's is the tool's answer equal to the route's; AC-3's the ten descriptions; AC-4's the ten write tools listed without their destructive siblings.

**What the leaves pin (the contract for the build):**
- `TOOLS` gains the ten write tools after `get_stats`, in the AC's order, each with the AC's description character for character.
- Each write tool's model is its intent's model, so its schema is `input_schema(<IntentModel>)`.
- Each write tool parses its arguments as the route parses its `intent` part and calls the route's handler with the app's `store` (and `clock` where the route passes it). Its success is the route's `OkResponse`, with `ids` and `reachedLastPage` exactly as the route sets them; its refusal is the route's AD-9 `error`; a write fault is `couldnt_save`.
- The four destructive names stay unregistered.

**Open for the build (not pinned):**
- How the tools are declared: one `AgentTool` per intent, or a small table of `(name, description, model, parse, handler, answer)` in `agent/`. Keep `agent/` free of `http/api` imports (`test_layers.py`, 12.2's AC-7 leaf).
- Where the shared "handler result to `OkResponse`" mapping lives, so the route and the tool can't drift (for example a function in `intents/` that both call).

## Existing leaves this story changes (for the build)

- `backend/tests/test_agent_mount.py`'s `AGENT_TOOL_NAMES` (asserted at `:213`, `:246`, `:432`, `:631`) becomes the cumulative 17: the seven it lists now, then the ten write tools. This run didn't change it, since those leaves would fail until the tools exist. `EARLIER_TOOL_NAMES` in `test_agent_write.py` duplicates its current value on purpose (a test module must not import another one, `tests/helpers.py`); the build may move the list into `tests/helpers.py` and share it.
- 12.1's `test_an_unknown_tool_is_a_json_rpc_error_and_changes_nothing` must still pass unchanged.
- The OpenAPI contract (`check:api`) must stay byte-identical: the routes don't change.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-2 `null` where refused:** `bookId: null` on every tool, and `text: null` on `add_card_note`, are refused on `intent` by tool and route alike.
- [ ] **Pytest, AC-2 no arguments:** a `tools/call` with no `arguments` on a write tool is refused like the route's missing `intent` part (both `malformed`), and changes nothing.
- [ ] **Pytest, AC-2 the paused Book's segment:** `start_reading` resuming at a page other than its current one closes a segment (`earlierSegments`), on tool and route alike.
- [ ] **Pytest, AC-2 unexpected failure:** a handler that raises something other than `IntentError` (monkeypatched) answers `couldnt_save` through the tool, as the route's 500 does, and is logged with the tool's name.
- [ ] **Pytest, AC-2 other fault steps:** `fsync` and `replace` faults (TR8 names write, fsync and rename) give `couldnt_save` and an unchanged `library.json` through the tool.
- [ ] **Pytest, AC-2 book gone mid-session:** a Book `find_book` returned and then deleted through the UI route is refused with `book_not_found` by each write tool (the standard intent AC).
- [ ] **Pytest, AC-1 schemas from a real server:** the cumulative list and one write tool's schema on a `bookvie` subprocess (12.1's `_start`), not only `TestClient`.
- [ ] **Pytest, AC-4 every name:** `delete_book`, `delete_card_note`, `restore` and `set_spine_color` also leave `local-state.json` and `covers/` untouched.

## Helper probes

Helpers reused: `McpClient`, `error_of`, `text_of` (`tests/agent_client.py`); `connect_mcp`, `mcp_client` (`tests/conftest.py`); `LibraryBuilder` (`tests/builder.py`); `FaultyFs`, `library_bytes`, `temp_files`, `assert_invariants` (`tests/helpers.py`). None was extended.

Helpers added, in `backend/tests/test_agent_write.py`:
- `_seed`: the library the contract cases need (a Main book with a note, Up next, a paused, a finished and an unread Book, two or three Side reads). No existing seed has all of these.
- `Case`, `_malformed`, `CASES`: the case table, and the three malformed variants of a valid input.
- `same_ids`: a fixture that makes the three minting intents (`start_reading`, `finish_reading`, `add_card_note`) mint from a counter, restarted before each call. No existing helper does this; `test_add_book.py:593` fixes one id inline.
- `_twins`: two apps on byte-identical copies of the seed, optionally both with a `FaultyFs`.
- `_route_answer`: `POST /api/intents/<verb>` as the UI sends it, as `("ok", body)` or `("error", error)`.
- `_tool_answer`: the tool's answer in the same shape. It checks the text is the structured content's JSON, as 12.2's `_structured` does; that helper is local to `test_agent_read.py` and also checks `isError`, which this one branches on instead.

Shipped numbers: none quoted. The ACs quote no size or count for shipped UI. Pages and dates are the seed's own values.

Probes ran from a temporary `backend/tests/test_agent_write_probe.py` (`uv run pytest -q -p no:cacheprovider tests/test_agent_write_probe.py --no-cov`, 92 passed), which was then removed with `rm`. They ran against today's routes, on the file as it is now (after ruff).
- **`_seed`, `_twins`, `same_ids`, `_route_answer`, `CASES`:** every one of the 87 cases ran the leaf's body with the tool call replaced by the same route on the twin app. Both answers were equal, both `library.json` files byte-identical, and every case reached the branch it names (its `ok`, no-op, `reachedLastPage`, or its `code` and fields), with invariants holding after each success and nothing changed after each refusal or fault. For example `add_card_note-success` answered `{"ok": true, "ids": {"cardNoteId": "b0000000-0000-4000-8000-000000000001"}}`, `update_page-success-last-page` and `start_reading-success-resume-at-last-page` `{"ok": true, "reachedLastPage": true}`, and `pause-fault-at-write` the `couldnt_save` error with "Couldn't save. Your data wasn't changed.".
- **Correction recorded during the probes:** the first probe run failed on `edit_purpose-success-clear-a-paused-books`: the paused Book had no Purpose, so clearing it wrote the same bytes and the case wasn't a success that changes anything. The case was replaced by `success-a-paused-books` (sets a Purpose) and `success-null-clears-it` (clears the Main book's), and the probes ran again: 92 passed.
- **Refusals:** without restarting the counter, and without `same_ids` at all, a `start_reading` on the twins left different `library.json` files (the minted Reading ids differ), so the leaf can't pass by accident. `_route_answer` told a no-op `set_up_next` (`("ok", {"ok": true})`) from a refused one (`main_cannot_be_up_next`).
- **`_tool_answer`:** on the shipped `get_app_info` it returned `("ok", <the app-info view>)` and, with `{"x": 1}`, `("error", <malformed>)`; on a tool that doesn't exist yet it raised (`McpClient.result`'s assertion).
- **`_seed`'s Side reads:** `side_reads=2` and `3` gave two and three `sideReadBookIds`, with the same Main book and Up next.
- **Not probed:** `Case.id` and `_malformed` are plain data. No border or outline width is read (no UI), so Epic 10 retro item 71 (E10-R1) doesn't apply.

**Render-before-read:** no leaf reads a page. Every read is an MCP or HTTP response from an app whose lifespan is running (`connect_mcp`) or a file in its data folder. No leaf needed a fix.

## TDD Red Phase

4 skipped leaves in `backend/tests/test_agent_write.py`, each `@pytest.mark.skip(reason=RED)` with its `[P*] AC-n` in its first comment line:

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `backend/tests/test_agent_write.py:376` `test_the_ten_write_tools_advertise_their_intent_models_schemas_and_join_the_tool_list` | P0 |
| AC-2 | `backend/tests/test_agent_write.py:407` `test_each_write_tool_stores_and_answers_exactly_as_its_intent_route` (87 cases) | P0 |
| AC-3 | `backend/tests/test_agent_write.py:446` `test_each_write_tools_description_is_the_storys_text` | P1 |
| AC-4 | `backend/tests/test_agent_write.py:460` `test_the_destructive_intents_stay_unlisted_and_calling_one_changes_nothing` | P0 |

**Red today.** This run came after the probes above last passed, on the file as it is now. The leaves ran from a throwaway `tests/test_agent_write_red.py` with the skip lines deleted (`uv run pytest -q -p no:cacheprovider tests/test_agent_write_red.py --no-cov`), which was then removed with `rm`. Result: 90 failed (3 leaves and 87 cases):
- **AC-1:** the tool list is the seven earlier tools: "Right contains 10 more items, first extra item: 'start_reading'".
- **AC-2:** every case fails at its tool call, `tools/call: {'code': -32602, 'message': 'Unknown tool: <name>'}`, the JSON-RPC error `McpClient.result` asserts against (the route call before it is the reference, not an assertion). Once the tool exists, the first assertion is the tool-equals-route one.
- **AC-3:** `assert {} == {...}`: none of the ten descriptions is listed.
- **AC-4:** `assert [] == ['add_card_note', ...]`: no write tool is listed yet.

With the skips in place, `uv run pytest -q -p no:cacheprovider --no-cov` (the full backend suite) gave 1713 passed, 90 skipped. Ruff format and check are clean on the file, and `git status` lists only `backend/tests/test_agent_write.py` and this checklist: no `*_probe.py` file and no throwaway copy.

**Storage keys:** no new localStorage key. The story has no frontend change.

**No real library:** every leaf runs under `conftest.py`'s temporary `HOME`, on folders under `tmp_path`.

## Implementation checklist (for `bmad-build-auto`)

- [ ] Add the ten write tools to `TOOLS` after `get_stats`, each with its intent model and the AC's description (AC-1, AC-3).
- [ ] Each tool: parse the arguments as the route parses `intent`, call the route's handler with `state.store` (and `state.clock` where the route passes it), and answer the route's `OkResponse` (AC-2).
- [ ] Keep `delete_book`, `delete_card_note`, `restore` and `set_spine_color` unregistered (AC-4).
- [ ] Update `AGENT_TOOL_NAMES` in `test_agent_mount.py` to the cumulative 17.
- [ ] Un-skip the 4 leaves and see them pass, then run `npm run check` with no other existing leaf's assertions edited.

## Next

`bmad-build-auto` for Story 12.3, then `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.
