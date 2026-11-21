---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-21'
storyId: 'agent-tools-advertise-value-types'
storyKey: 'agent-tools-advertise-value-types'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md (Boundaries, I/O matrix, AC-2 runs, Review Findings, Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-agent-tools-advertise-value-types.md
  - _bmad/tea/config.yaml
  - backend/bookvie/agent/tools.py (`JSON_VALUE_TYPES`, `input_schema`, `_drop_unused_json_value`)
  - backend/bookvie/intents/update_page.py (`valid_page`), start_reading.py (the page branch)
  - backend/tests/test_agent_value_types.py; backend/tests/test_agent_write.py (the `CASES` twin table); backend/tests/conftest.py (`mcp_client`, `connect_mcp`)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Agent tools advertise the type of every value they take

## Preflight

- **Stack:** `fullstack` (auto). The fix is in the agent layer's listed schema, so every target is pytest over `/mcp`. There is no page to explore, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the standalone pipeline spec (status `done`; AC-2 passed in run 2 on 2026-11-21) and the ATDD checklist's four green-phase follow-ups.
- **Order:** this run started after the review's commit `2d20b3a`, with a clean tree.
- **Generation:** sequential, in this session, as for Stories 12.3 to 12.8: three leaves and two table cases in two existing pytest modules.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off and don't apply: there is no Playwright test and no Pact artifact.

## Coverage plan

The build and the review pin these:
- the five listed types, including the `default: null` on `start_reading.page`;
- no untyped property in any tool;
- the `update_page` string/integer round trip;
- the `"rating": "4"` refusal;
- the null round trips.

Two gaps were left: no test showed the listed schemas working as a client would use them, and the "no coercion" rule was pinned for only one of the two `page` properties.

| Target | Level | Priority | Why |
|---|---|---|---|
| Every listed `inputSchema` is valid JSON Schema (Draft 2020-12). | API (MCP `tools/list`) | P1 | A client builds its validator from this. `json_types` reads the shapes it knows, but a typo such as `"type": "text"` or a dangling `$ref` after `$defs.JsonValue` is dropped would pass it. |
| The listed schemas, validated the way a schema-following client would, accept each value the server saves: pages 120, 0 and 40, a null `start_reading.page`, each `purposeFulfilled` answer, and null rating and answer. They also reject each value the server refuses, each on its own property: `"120"`, null page, `"40"`, `"4"`, null `finishedOn`, `"maybe"` and `"null"`. | API (MCP `tools/list` + `jsonschema`) | P1 | This is the fix's actual claim: a client that follows the schema corrects `"120"` before it calls. The existing leaf checks the type sets. These tests check behaviour under a real validator, including the enum through `anyOf`. |
| `start_reading` with `"page": "40"` on an unread Book is refused on `page`, and `finish_reading` with `"rating": "4"` is refused on `rating`, identically through the tool and the HTTP route. | API (the `CASES` twin table) | P2 | This is the "no coercion" rule for the second `page`, plus tool/route parity for the rating, which `test_agent_value_types.py` doesn't check. An unread Book is used, not a Side read, so the refusal comes from the string and not from a Side read's required page. |

Not automated:
- `120.0` passes JSON Schema's `integer` but is refused by `valid_page`. That is an accepted limit (spec Residual risks), and pinning it would pin a known mismatch.
- A real client's `finish_reading` call. AC-2 covered `update_page` only (see the ATDD checklist below).

## Files

- `backend/tests/test_agent_value_types.py`: three leaves, one helper and two tables.
  - `test_every_listed_schema_is_valid_json_schema`
  - `test_the_listed_schema_takes_each_value_the_server_takes`
  - `test_the_listed_schema_rules_out_each_value_the_server_refuses`
  - `_validators`: a `Draft202012Validator` per listed tool.
  - `_FOLLOWS_THE_SCHEMA`, `_BREAKS_THE_SCHEMA`: the calls, and for each refused one the property it must fail on.
- `backend/tests/test_agent_write.py`: two `CASES` rows, `start_reading-page-as-a-string` and `finish_reading-rating-as-a-string`.
- `_bmad-output/test-artifacts/atdd-checklist-agent-tools-advertise-value-types.md`: three follow-ups ticked and one retired.

`jsonschema` (4.26.0) is already installed through `mcp`, so no dependency was added.

## Validation

- **New leaves:** `uv run pytest tests/test_agent_value_types.py tests/test_agent_write.py` gave 163 passed.
- **Mutation checks:** each one edited `backend/bookvie/agent/tools.py`, ran the tests, then restored the file from a scratchpad copy. `cmp` confirmed the restore, and `git status` showed only the test files changed afterwards.
  - `update_page.page` listed as integer or null: the rules-out leaf fails (null page accepted).
  - `JSON_VALUE_TYPES` not applied: the rules-out leaf fails (`"120"` accepted by the untyped `JsonValue`).
  - `"maybe"` added to the `purposeFulfilled` enum: the rules-out leaf fails.
  - `notYet` dropped from the enum: the takes leaf fails.
  - `_STRING` written as `{"type": "text"}`: the valid-schema leaf fails.
- **Lint and format:** `ruff format` and `ruff check` are clean on both files.
- **Full check:** `npm run check` exited 0 in this run:
  - pytest: 2179 passed (the review's 2174 plus these 5).
  - Coverage gates: domain 100.00%, intents+store 97.62%.
  - Unit: 389 passed.
  - e2e: 800 passed.
  - Smoke: ok.
  - The 3 pytest warnings come from `test_cover.py` and `test_restore_refusals.py`, not from these tests.
- **Checklist:** no CLI or browser session was opened. The temporary `tools.py` copy stayed in the session scratchpad, not the repo.

## ATDD checklist

- **Ticked:** the `rating-as-a-string` and `start_reading` `page-as-a-string` cases, and the jsonschema validation of the listed schemas.
- **Retired:** the manual `finish_reading` call in AC-2's session. AC-2 asks only for `update_page`, which passed on the first call (run 2). The rating's listed type and its success and refusal values are now pinned against the listed schema.
- **Remaining `[ ]` lines:** 0 (`grep -cF '[ ]'`).

## Risks and assumptions

- The validator tests use `jsonschema`'s Draft 2020-12 semantics. Claude Code's own validation may differ in detail, but run 2 of AC-2 showed it reading `"type": "integer"` and sending a number.
- `120.0` is still the accepted mismatch between the listed `integer` and the parsers.
- The fix reaches the installed app only through a release after 2.0.0 (Oleg's call).

## Next

- The spec's pipeline is complete.
- Its two "spine drift" entries (AD-21, AD-8) in `deferred-work.md` are reconciled before the next epic's first story (AGENTS.md, "Architecture spine").
