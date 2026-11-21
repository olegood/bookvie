---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-20'
storyId: 'agent-tools-advertise-value-types'
storyKey: 'agent-tools-advertise-value-types'
storyFile: '_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-agent-tools-advertise-value-types.md'
generatedTestFiles:
  - 'backend/tests/test_agent_value_types.py'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md (the "Epic 12 retro item 83 manual runs" entry)'
  - '_bmad-output/implementation-artifacts/spec-12-7-summarize-a-book-s-notes-through-the-agent-tools.md (the AC-3 run and the seeding finding)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/agent/tools.py (input_schema, advertised_schema, START_READING, UPDATE_PAGE, FINISH_READING)'
  - 'backend/bookvie/intents/update_page.py, start_reading.py, finish_reading.py (the JsonValue fields, valid_page, _rating_failure, _ANSWERS)'
  - 'backend/tests/agent_client.py (McpClient), conftest.py (mcp_client), test_agent_write.py (the schema leaf, the Case table)'
  - 'knowledge: test-quality, test-levels-framework, test-priorities-matrix'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given npm run check, when it runs, then it passes, and schema.d.ts is unchanged.' }
  - { id: AC-2, idSource: generated, text: 'Given bookvie --dev built from this change and a Main book, when Oleg (or Claude, on Oleg''s say-so) asks Claude Code in a real session to set the page through the bookvie-dev tools, then update_page saves it on the first call, and the spec records the call and its answer (manual).' }
---

# ATDD Checklist: Agent tools advertise the type of every value they take

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright are in place. This spec needs only pytest. No page is involved.
- **Story:** a standalone pipeline spec (`- **Pipeline:**` line in its Design Notes), status `ready-for-dev` when this checklist was written, with no `story_key`. Its two criteria have no ids, so they are numbered AC-1 and AC-2 in source order (registry above). AC-1 ("`npm run check` passes") carries the behavior its Tasks and I/O matrix describe. The leaf pins that behavior, so the check passing means the fix is in. AC-2 is manual.
- **Epic gate:** not an epic story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, no Pact. Execution: AI generation, **sequential** in this session, as in Stories 12.3 to 12.8. It is one small pytest file with no E2E surface, so a worker subagent per level would only re-read what this session already read.
- **What exists today:**
  - `tools/list` lists five properties as a bare `{"$ref": "#/$defs/JsonValue"}` with no `type`: `update_page.page`, `start_reading.page` (with `"default": null`), and `finish_reading`'s `rating`, `purposeFulfilled` and `finishedOn`. Every other property is typed (the probe below lists them).
  - `test_agent_write.py:394` pins `listed == input_schema(model)` for the ten write tools, and `:647` pins it for a real process. Both compare with the function, so they move with the fix and don't fail.
  - The server's wrong-type refusals are already pinned: `Case("update_page", "page-as-a-string", …"212"…)` (`:235`) and `every-field-wrong` for `finish_reading` (`:242`). An integer page saves (`UPDATE`, `:198`).

## Generation Mode

**AI generation.** There are no UI journeys and nothing to record.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API (MCP `tools/list` over the real app, the `mcp_client` fixture) | P0 | `test_every_tool_property_advertises_its_json_type` (`backend/tests/test_agent_value_types.py`). **`update_page.page` admits exactly `{"integer"}`.** Then `start_reading.page` and `finish_reading.rating` are `{integer, null}`; `finishedOn` is `{string}` and `purposeFulfilled` is `{string, null}` (amended 2026-11-20, see below); `purposeFulfilled`'s non-null enum is `set(_ANSWERS)` (`yes`, `partly`, `notYet`); and no property of any tool admits no type. | The defect is what the client reads, so the leaf reads `tools/list` the way Claude Code does. |
| AC-2 | Manual (a real Claude Code session against `--dev`) | P0 | No automated leaf. The spec records the `update_page` call and its answer. Under Epic 12 retro item 85, `bmad-code-review` keeps the spec in review until the run is recorded. | Only a real client shows the client now sends a number. |

**What the leaf pins (the contract for the build):**
- Types are read semantically by `json_types`, which handles `type` (a string or a list), `enum`/`const` (by their values' types), `anyOf`/`oneOf` (the union, empty if any member is untyped), and a local `$ref` resolved against `$defs`. Any of these shapes passes. For example, `{"type": "integer"}`, `{"anyOf": [{"type": "integer"}, {"type": "null"}]}` and `{"type": ["integer", "null"]}` are all fine.
- `update_page.page` admits no `null`, even though `UpdatePageIntent.nullable` holds `page`, so `input_schema` keeps `null` for it today. The spec's Always rule was corrected during this ATDD run (2026-11-20): `null` is advertised only where it is a valid value, and `nullable` there only turns an explicit `null` into a field error. The build must not loosen the leaf to `{integer, null}`.
- `purposeFulfilled`'s values come from `_ANSWERS`, not a literal.
- **Amended 2026-11-20 (spec Change Log, after build attempt 1):** `finishedOn` is listed as string only, with no `null`, because `_finished_on` refuses `null`. The leaf asserts `types("finish_reading", "finishedOn") == {"string"}`; this replaces the earlier `{string, null}`.

**Open for the build (not pinned):**
- Where the type is declared: a per-model mapping read by `input_schema`, `json_schema_extra` on the field, or a typed alias in place of `JsonValue`. Either way, the HTTP intents' parsing and `schema.d.ts` must not change (AC-1, `check:api`).
- Whether `finishedOn` also gets `"format": "date"` (not required).

## Existing leaves this spec changes (for the build)

None fail. `test_agent_write.py:394` and `:647` compare with `input_schema(model)` and follow the fix. `test_agent_cover_url.py:328` compares with `advertised_schema(tool)` and follows it too.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Pytest, I/O "Rating as string":** add `Case("finish_reading", "rating-as-a-string", {..., "rating": "4"}, "invalid_fields", ("rating",))` to `test_agent_write.py`'s table, next to `page-as-a-string`. It passes today; it guards the "no coercion" rule. (done: backend/tests/test_agent_write.py:243, `{**FINISH, "rating": "4"}`; the twin table also checks that the HTTP route refuses it the same way)
- [x] **Pytest:** `Case("start_reading", "page-as-a-string", {"bookId": SIDE1, "purpose": None, "page": "40"}, "invalid_fields", ("page",))`, the same guard for the other `page`. (done: backend/tests/test_agent_write.py:228, on `UNREAD` instead of `SIDE1`, so the refusal comes from the string and not from a Side read's required page)
- [x] **Pytest:** the listed schema for each of the five properties validates its own success values and rejects a string page. For example, `jsonschema.validate({"bookId": …, "page": 212}, schema)` passes and `"212"` fails, if `jsonschema` is already a dependency (through `mcp`). Don't add a dependency for it. (done: backend/tests/test_agent_value_types.py:265 `test_the_listed_schema_takes_each_value_the_server_takes` and :277 `test_the_listed_schema_rules_out_each_value_the_server_refuses`, plus :258 `test_every_listed_schema_is_valid_json_schema`; `jsonschema` 4.26.0 comes through `mcp`, no dependency added)
- ~~**Manual, AC-2:** also call `finish_reading` with a rating in the same session and record that it's accepted.~~ **Retired:** AC-2 asks only for `update_page`, and it passed on the first call (spec `spec-agent-tools-advertise-value-types.md`, AC-2 run 2, 2026-11-21). The listed `rating` (integer or null), the success value `4` and the refusal of `"4"` are now pinned against the listed schema (`backend/tests/test_agent_value_types.py:265`, `:277`), and `FINISH` with `"rating": 4` saves over `/mcp` (`backend/tests/test_agent_write.py`, case `finish_reading-success`).

## Helper probes

Helpers reused: `McpClient` (`backend/tests/agent_client.py`); the `mcp_client` fixture (`backend/tests/conftest.py`). `_ANSWERS` (`bookvie/intents/finish_reading.py`) is read from the code, not copied.

Helpers added (all in `backend/tests/test_agent_value_types.py`):
- `json_types`: the JSON types a listed property admits. No existing helper reads a property's type: `test_agent_write.py` compares whole schemas with `input_schema`, which can't tell an untyped property from a typed one.
- `enum_values`: the non-null values a property is limited to. No existing helper.
- `_resolve`, `_value_type`: the two helpers' internals.

Shipped numbers: none quoted.

Storage keys: no new localStorage key.

Render-before-read: no Playwright leaf, and no leaf reads a rendered page. The leaf reads `tools/list` from the app. No leaf was changed for it.

Border widths: none asserted.

The probe ran from a temporary file, `backend/tests/test_agent_value_types_probe.py`, which was then removed with `rm`. Command: `cd backend && uv run pytest -q -p no:cacheprovider --no-cov tests/test_agent_value_types_probe.py`. Result: 3 passed on the first run.
- **`json_types`:** `{"type": "string"}` gave `{string}`. `{"type": ["integer","null"]}` and `anyOf` integer+null gave `{integer, null}`. `enum ["yes","partly","notYet",null]` gave `{string, null}`. A `$ref` to a typed def gave `{integer}`. **Refused (empty set):** `$ref` to the untyped `JsonValue` def, with and without `"default": null`; an `anyOf` with one untyped member; `{}`. **Refused (off by one):** `anyOf` integer+null is not `{integer}`.
- **`enum_values`:** a flat enum with null and an `anyOf` enum+null both gave `{yes, partly, notYet}`. **Refused:** `["yes","maybe"]` didn't match; `{"type": "string"}` gave `None`.
- **On today's `tools/list`** (the `mcp_client` fixture, the same conditions as the leaf): `update_page.page` gave the empty set, `bookId` gave `{string}`, and `start_reading.purpose` gave `{string, null}`. The full list of untyped properties was exactly the five named in Preflight.

No helper changed after its probe passed. `ruff format` then reflowed the test file (layout only), and the red run below ran after it.

## TDD Red Phase

Generated: 1 pytest leaf, `@pytest.mark.skip(reason=RED)`.
- **Red run** (after the probe and formatting, on a throwaway un-skipped copy removed with `rm`, `backend/tests/test_agent_value_types_redrun_probe.py`): **AC-1** fails at its first assertion with `assert set() == {'integer'}` (`update_page.page` untyped).
- **AC-2:** no leaf (manual).
- **With the leaf skipped:** `tests/test_agent_value_types.py tests/test_agent_write.py` gave 154 passed, 1 skipped. `npm run check:py` exit 0 (2170 passed, 1 skipped; coverage gates ok).

`git status` after the runs lists only `backend/tests/test_agent_value_types.py` as new: no `*.probe.*` file and no throwaway copy.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove `@pytest.mark.skip(reason=RED)` when the schema task starts. See it fail at `update_page.page`, then implement until it passes: `cd backend && uv run pytest -q tests/test_agent_value_types.py tests/test_agent_write.py tests/test_agent_cover_url.py`.
2. Add the `CHANGELOG.md` line and the `deferred-work.md` `resolved:` line (spec Tasks).
3. Finish with `npm run check`, and confirm `frontend/src/api/generated/schema.d.ts` is unchanged.
4. Leave AC-2 open in the spec for the real session.
