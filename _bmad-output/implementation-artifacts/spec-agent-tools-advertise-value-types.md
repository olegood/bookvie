---
title: 'Agent tools advertise the type of every value they take'
type: 'bugfix'
created: '2026-11-20'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `update_page` can't save a page from Claude Code. Epic 12 retro item 83's real session (2026-11-20, `bookvie --dev` 2.0.0) called it with page 120 on a 670-page Main book and was refused twice with "Page must be between 0 and 670.". A raw `tools/call` with `"page": 120` succeeds, and one with `"page": "120"` is refused the same way. `tools/list` advertises `page` as a bare `{"$ref": "#/$defs/JsonValue"}` with no `type`, so Claude Code sends the value as a string, and `valid_page` deliberately accepts only a JSON integer. Four more properties are advertised the same way: `start_reading.page`, and `finish_reading`'s `rating`, `purposeFulfilled` and `finishedOn`. Recording a page is the most common thing an agent does in bookvie. Source: `deferred-work.md`, "Deferred from: Epic 12 retro item 83 manual runs".

**Approach:** advertise each of these five properties with the JSON type the server accepts: `page` and `rating` as integers, and `purposeFulfilled` and `finishedOn` as strings, plus `null` where `null` is a valid value: `start_reading.page` (not asked) and the three `finish_reading` fields (the user didn't say), never `update_page.page`. The change belongs in the agent layer's advertised input schema. The intents' parsing and refusals stay as they are, so a wrong type is still a field error, never a coercion.

## Boundaries & Constraints

**Always:**
- Every property of every tool in `tools/list` has a `type`, or an `anyOf`/`enum` whose members each have one. A test pins this for all tools, so a future `JsonValue` field can't ship untyped.
- `null` is advertised only where it is a valid value: `start_reading.page`, `finish_reading`'s `rating`, `purposeFulfilled` and `finishedOn`. `update_page.page` is integer only, although `UpdatePageIntent.nullable` holds `page`. There, `nullable` only makes an explicit `null` a field error rather than a malformed intent, and that refusal stays.
- `purposeFulfilled` is advertised as an `enum` of `yes`, `partly` and `notYet` (plus `null`), taken from `_ANSWERS` (`get_args(PurposeFulfilled)`), the constant `_purpose_fulfilled_failure` checks.
- The listed schema stays equal to `advertised_schema(tool)` / `input_schema(model)` (`test_agent_write.py:647`, `test_agent_cover_url.py:328`).

**Never:**
- Don't coerce `"120"` to `120` anywhere.
- Don't change `valid_page`, `_rating_failure`, `_finished_on` or `_purpose_fulfilled_failure`, any refusal copy, or the HTTP intents (`/api/intents/*` still refuse a wrong type as a field error, which their tests pin).
- Don't change any tool description. The 20 descriptions are pinned to `epics.md` through `agent_client.py`.
- No new tool, and no change to the browser.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Listed page | `tools/list` | `update_page.page` is `{"type": "integer"}`, and `start_reading.page` is integer or null | N/A |
| Listed finish fields | `tools/list` | `rating` integer or null; `purposeFulfilled` enum `yes`/`partly`/`notYet` or null; `finishedOn` string or null | N/A |
| Integer page | `update_page` with `"page": 120` on a 670-page Main book | `ok`, current page 120 | No error expected |
| String page | `update_page` with `"page": "120"` (a client ignoring the schema) | Refused as today: `invalid_fields` on `page` | Unchanged copy |
| Rating as string | `finish_reading` with `"rating": "4"` | Refused as today on `rating` | Unchanged copy |

</intent-contract>

## Code Map

- `backend/bookvie/agent/tools.py:129-145` -- `input_schema`: where the model's JSON schema becomes the advertised one. `_without_null` already drops `null` for non-nullable fields. The type has to be advertised here, or come from a per-model declaration it reads.
- `backend/bookvie/intents/update_page.py:36-42`, `start_reading.py:66-74`, `finish_reading.py:70-78` -- the three models with `JsonValue` fields, and the parsers whose refusals stay unchanged.
- `backend/bookvie/intents/finish_reading.py` `_ANSWERS` -- the `purposeFulfilled` values to use for the enum.
- `backend/tests/agent_client.py` -- the shared agent-test helpers (Epic 12 retro item 87). Reuse them; don't copy a new unwrapper.
- `backend/tests/test_agent_write.py:394-410`, `:640-650` -- existing schema assertions for the write tools.
- `frontend/src/api/generated/schema.d.ts` -- generated from OpenAPI. The intents' HTTP schema must not change, so `npm --prefix frontend run api:gen` should leave it byte-identical.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/agent/tools.py` (and the three intent models only if the declaration lives there) -- advertise the five properties' types as above -- the bug.
- `backend/tests/test_agent_write.py` (or a new `test_agent_schema.py` using `agent_client.py`) -- pin the five listed schemas. Pin "no untyped property in any tool". Add a round-trip over `/mcp` for an integer page (ok) and a string page (refused, unchanged copy) -- the I/O matrix.
- `CHANGELOG.md` -- under `[Unreleased]`, replace "Nothing yet." with a Fixed line: the agent tools now say which values are numbers, so `update_page`, `start_reading` and `finish_reading` work from Claude Code -- the next release's notes.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- add a `resolved:` line to the "Epic 12 retro item 83 manual runs" entry -- close its source.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it passes, and `schema.d.ts` is unchanged.
- Given `bookvie --dev` built from this change and a Main book, when Oleg (or Claude, on Oleg's say-so) asks Claude Code in a real session to set the page through the `bookvie-dev` tools, then `update_page` saves it on the first call. The spec records the call and its answer (manual: `bmad-code-review` keeps this spec in review until the run is recorded, Epic 12 retro item 85).

## Spec Change Log

## Review Triage Log

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why the schema and not coercion:** the server's wrong-type refusal is a deliberate contract, shared with the HTTP intents and pinned by their tests. The defect is that the agent was never told the type. A typed schema fixes it for every MCP client and leaves one parser.
- **Why all five:** `finishedOn` and `purposeFulfilled` already work when sent as strings. But untyped, a client may send `"null"` for "the user didn't say", which `finish_reading`'s description asks for. Typing them costs nothing and closes that case.
- **Shipping:** the fix reaches Oleg's real app only through a release after 2.0.0 (`docs/release.md`). That release is Oleg's call and is not part of this spec. The build adds a `[Unreleased]` line to `CHANGELOG.md`.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_write.py tests/test_agent_mount.py` -- expected: pass
- `npm run check` -- expected: exit 0

**Manual checks (if no CLI):**
- With a dev server built from this checkout, `tools/list` on 8766 shows `"type": "integer"` for `update_page.page`. A real Claude Code session's `update_page` call is recorded under `## Auto Run Result`.
