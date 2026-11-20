---
title: 'Agent tools advertise the type of every value they take'
type: 'bugfix'
created: '2026-11-20'
status: 'in-review'
baseline_revision: 'df3cd5f668b73f0f8e56b69979290701385eb253'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: the spine says each tool's schema is generated from its model by alias, but `JSON_VALUE_TYPES` in `agent/tools.py` now declares the type of every `JsonValue` property (with the `purposeFulfilled` enum and integer-only `update_page.page`), and a test pins that every listed property has a JSON type.
    evidence: |-
      backend/bookvie/agent/tools.py JSON_VALUE_TYPES and input_schema; spine-check layer, review pass 2.
    location: >-
      backend/bookvie/agent/tools.py
    severity: low
  - summary: >-
      Spine drift (AD-8), reconciled before the next epic: "the tools' advertised schemas are generated from the same Pydantic models" no longer covers the agent-layer type declarations for `JsonValue` fields.
    evidence: |-
      backend/bookvie/agent/tools.py JSON_VALUE_TYPES; spine-check layer, review pass 2.
    location: >-
      backend/bookvie/agent/tools.py
    severity: low
  - summary: >-
      A wrong-type page ("120") is refused with "Page must be between 0 and 670.", which misstates the cause (the value is text, not out of range); this spec's contract forbids changing refusal copy, so it needs its own change.
    evidence: |-
      Pre-existing: valid_page returns None for any non-int, and update_page/start_reading answer page_message(pages); noted in the item 83 deferred entry and pinned by test_agent_value_types.py.
    location: >-
      backend/bookvie/intents/update_page.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** `update_page` can't save a page from Claude Code. Epic 12 retro item 83's real session (2026-11-20, `bookvie --dev` 2.0.0) called it with page 120 on a 670-page Main book and was refused twice with "Page must be between 0 and 670.". A raw `tools/call` with `"page": 120` succeeds, and one with `"page": "120"` is refused the same way. `tools/list` advertises `page` as a bare `{"$ref": "#/$defs/JsonValue"}` with no `type`, so Claude Code sends the value as a string, and `valid_page` deliberately accepts only a JSON integer. Four more properties are advertised the same way: `start_reading.page`, and `finish_reading`'s `rating`, `purposeFulfilled` and `finishedOn`. Recording a page is the most common thing an agent does in bookvie. Source: `deferred-work.md`, "Deferred from: Epic 12 retro item 83 manual runs".

**Approach:** advertise each of these five properties with the JSON type the server accepts: `page` and `rating` as integers, and `purposeFulfilled` and `finishedOn` as strings, plus `null` where `null` is a valid value: `start_reading.page` (not asked) and `finish_reading`'s `rating` and `purposeFulfilled` (the user didn't say), never `update_page.page` or `finishedOn`. The change belongs in the agent layer's advertised input schema. The intents' parsing and refusals stay as they are, so a wrong type is still a field error, never a coercion.

## Boundaries & Constraints

**Always:**
- Every property of every tool in `tools/list` has a `type`, or an `anyOf`/`enum` whose members each have one. A test pins this for all tools, so a future `JsonValue` field can't ship untyped.
- `null` is advertised only where it is a valid value: `start_reading.page`, and `finish_reading`'s `rating` and `purposeFulfilled`. `finishedOn` is string only: `_finished_on` refuses `null` as a format error, since a finish always needs a date. `update_page.page` is integer only, although `UpdatePageIntent.nullable` holds `page`. There, `nullable` only makes an explicit `null` a field error rather than a malformed intent, and that refusal stays.
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
| Listed finish fields | `tools/list` | `rating` integer or null; `purposeFulfilled` enum `yes`/`partly`/`notYet` or null; `finishedOn` string only (no null) | N/A |
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

### 2026-11-20 — Amendment after attempt 1 (intent_gap)
- **Trigger:** review of attempt 1 found `finishedOn` advertised as string-or-null while `_finished_on` (`backend/bookvie/intents/finish_reading.py:88-89`) refuses `null` (triage log, `[high]` `[intent_gap]`).
- **Amended (Oleg chose option a, 2026-11-20):** Approach, Always bullet 2 and the I/O row "Listed finish fields" now advertise `finishedOn` as string only, no null.
- **Known-bad state avoided:** a listed schema that invites `finishedOn: null`, which the server always refuses.
- **KEEP:** declare the types in the agent layer (a per-model mapping read by `input_schema`, applied after the null handling, keeping the property's other keys such as `default`, and dropping the then-unused `$defs.JsonValue`); build the `purposeFulfilled` enum from `_ANSWERS`; change no parser, refusal copy, description or HTTP intent. Tests in `backend/tests/test_agent_value_types.py` (the ATDD file): the all-tools "every property has a JSON type" listing test, the `update_page` round trip (`"120"` refused unchanged, then `120` saved), and the `finish_reading` `"rating": "4"` refusal. Add a round trip that sends `null` to every property advertised as nullable and checks the call isn't refused on that field. CHANGELOG Fixed line and the deferred-work `resolved:` line as before, worded so they don't claim more than was verified.

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 21 findings — high 4, medium 0, low 11, false 6, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) Spine drift (AD-21, AD-8), reconciled before the next epic: the spine says each tool's schema is generated from its model by alias (plus `coverUrl`, null dropped, closed), but the change adds an agent-layer `JSON_VALUE_TYPES` override, the `purposeFulfilled` enum and integer-only `update_page.page` — moot this pass (code reverted on intent_gap); re-raise if the re-derived code still overrides types.
  - `[high]` `[intent_gap]` (edge-case) `finishedOn` advertised as string-or-null, but `_finished_on` (`backend/bookvie/intents/finish_reading.py:88-89`) refuses every non-string, `None` included, with FINISHED_ON_FORMAT_MESSAGE — verified in the code and by the verification-gap layer's `/mcp` probe (`isError`, `invalid_fields` on `finishedOn`). The intent-contract itself requires `finishedOn` "string or null" (Approach, Always bullet 2, I/O row "Listed finish fields"), so it can't be fixed without changing the contract. Attempt-1 patch kept outside the repo (session scratchpad); its approach is recorded under the Spec Change Log KEEP line.
  - `[low]` `[reject]` (edge-case) A stale `JSON_VALUE_TYPES` key raises a bare `KeyError` when the tools are listed — any rename fails every `tools/list` test at once, so a developer meets it immediately with a clear traceback; the fix adds a guard.
  - `[low]` `[reject]` (edge-case) JSON Schema `integer` admits `120.0`, which `valid_page`/`_rating_failure` refuse as a Python float — clients serialize integer-typed values as integers in everyday use; a fix would need a coercion the intent bans or new schema keywords.
  - `[high]` `[intent_gap]` (edge-case, claim) Readers believe a null `finishedOn` is accepted; the parser always refuses it — same root cause as the `finishedOn` intent_gap above.
  - `[high]` `[intent_gap]` (edge-case, claim) The `JSON_VALUE_TYPES` docstring ("null only where it is a valid value") is contradicted by `finishedOn` — same root cause as the `finishedOn` intent_gap.
  - `[low]` `[reject]` (blind) The CHANGELOG line ("say which values are numbers", "work from Claude Code") is broader than the tests and narrower than the change (two fields are strings) — moot: the CHANGELOG edit was reverted with the code; the re-derived build rewrites it.
  - `[low]` `[reject]` (blind) No test sends an explicit `null` to `update_page.page` — verified: `tests/test_agent_write.py:232-238` has no null case; the parser is unchanged, so the refusal can't regress through this change; moot after the revert, worth adding when the code is re-derived.
  - `[false]` `[reject]` (blind) Importing private `_ANSWERS` can be "silently" broken by a rename — a rename fails loudly with `ImportError` at import time of `bookvie.agent.tools`, so nothing is silent.
  - `[low]` `[reject]` (blind) `rating` and `page` are advertised without `minimum`/`maximum` — the tool descriptions state the ranges, and the intent asks only for the JSON type; adding bounds is new surface.
  - `[false]` `[reject]` (blind) `finishedOn` has no format, so an agent can send "today" — `finish_reading`'s description (`backend/bookvie/agent/tools.py` ~535) states "finishedOn (YYYY-MM-DD, not in the future)", so the agent is told the format.
  - `[low]` `[reject]` (blind) `_drop_unused_json_value` finds references by substring and a hard-coded def name — at worst a Pydantic rename leaves a dead `$defs` entry, which is harmless to clients; rewriting it adds code.
  - `[low]` `[reject]` (blind) The merge `{**declared, **rest}` lets a future model-side `type`/`anyOf` override the declared type — hypothetical, no field has one; the guard adds complexity.
  - `[false]` `[reject]` (blind) The spec's Verification commands miss the new test file — the fix is an edit to this build's spec, which triage rejects; `npm run check` runs the file anyway.
  - `[low]` `[reject]` (blind) No direct unit test of `input_schema` without MCP — the `/mcp` listing test pins the same output; a locator test is a nicety, not a defect.
  - `[false]` `[reject]` (intent-alignment) No automated test shows Claude Code sending an integer — by design: that is manual AC-2, which `bmad-code-review` holds open until the run is recorded.
  - `[low]` `[reject]` (intent-alignment) The CHANGELOG states the outcome as fact before AC-2 runs — same text as the blind CHANGELOG row; moot after the revert.
  - `[low]` `[reject]` (intent-alignment) The `deferred-work.md` `resolved:` line marks the item resolved before the real run — moot: reverted with the code.
  - `[false]` `[reject]` (intent-alignment) Raw-call tests pin pre-existing behaviour, not the fix — the I/O matrix asks exactly for those rows (refusals unchanged), and the listing test is the one that fails without the fix; that is the intended coverage.
  - `[high]` `[intent_gap]` (verification-gap) `finishedOn` advertised nullable but `null` always refused, and the listing test pins the wrong contract (`types(...) == {"string", "null"}`) — pre-verified; same root cause as the `finishedOn` intent_gap.
  - `[false]` `[reject]` (verification-gap, other) "The spec is where the error starts" — not a separate defect: it is the root-cause statement of the `finishedOn` intent_gap, recorded there.

### 2026-11-21 — Review pass (attempt 2, after the finishedOn amendment)
- verdicts: 28 findings — high 0, medium 0, low 15, false 13, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) Spine drift (AD-21), reconciled before the next epic: the "One validator" bullet says schemas are generated from the model by alias; `JSON_VALUE_TYPES` now declares the `JsonValue` types — deferred to `deferred-work.md`.
  - `[low]` `[defer]` (spine-check) Spine drift (AD-8), reconciled before the next epic: "generated from the same Pydantic models" no longer covers the agent-layer declarations — deferred to `deferred-work.md`.
  - `[false]` `[reject]` (intent-alignment) No test shows Claude Code sending an integer — carried: by design, manual AC-2, held open by `bmad-code-review`.
  - `[low]` `[reject]` (intent-alignment) CHANGELOG and the `resolved:` line state the Claude Code outcome as fact — the `resolved:` line says AC-2 is still to be recorded, and the CHANGELOG describes the fix and its cause, not a verified session; not worth more wording.
  - `[low]` `[patch]` (intent-alignment) CHANGELOG wording looser than the listed schema (no null, `purposeFulfilled` as "text") — patched: the line now names whole number or nothing, yes/partly/not yet or nothing, and `finishedOn` as a date written as text.
  - `[low]` `[patch]` (intent-alignment) The null test is narrower than its name — patched: renamed `test_value_typed_properties_list_null_only_where_it_is_taken`.
  - `[false]` `[reject]` (intent-alignment) The invariant is kept by a test, not derivation — the contract says "A test pins this"; that is what was built.
  - `[low]` `[defer]` (intent-alignment) The test pins the misleading "Page must be between 0 and 670." copy for a string page — pre-existing copy the contract forbids changing; deferred as its own change.
  - `[low]` `[defer]` (blind) No spine drift entry for the type override — same root cause as the spine-check drift rows; recorded in `deferred-work.md` at Finalize.
  - `[false]` `[reject]` (blind) The spec's run record is stale (`Auto Run Result` says blocked, no pass-2 triage entry) — Finalize rewrites both; not a defect in the change.
  - `[false]` `[reject]` (blind) The Code Map line range for `input_schema` is wrong — the fix edits this build's spec.
  - `[false]` `[reject]` (blind) The Verification commands leave out `test_agent_value_types.py` — carried: the fix edits this build's spec; `npm run check` runs the file.
  - `[low]` `[patch]` (blind) The null test doesn't cover every nullable property despite its name — same root cause as the intent-alignment "narrower than its name" row; patched by the rename.
  - `[low]` `[patch]` (blind) The test comment "The five value-typed properties: null only where the parser takes it" contradicts the assertions — patched: reworded to three nullable, two not.
  - `[low]` `[patch]` (blind) No `/mcp` null round trip for `update_page.page` and `finishedOn` — patched: the null test now sends `null` to each and asserts `invalid_fields` with `page_message(670)` / `FINISHED_ON_FORMAT_MESSAGE`.
  - `[low]` `[defer]` (blind) The misleading refusal copy is neither fixed nor deferred — same root cause as the intent-alignment copy row; deferred.
  - `[low]` `[patch]` (blind) The CHANGELOG line understates the schema — same root cause as the intent-alignment CHANGELOG row; patched.
  - `[low]` `[reject]` (blind) The `resolved:` line closes the entry before AC-2 — same as the intent-alignment records row; the line names AC-2 as pending.
  - `[false]` `[reject]` (blind) Cross-module import of private `_ANSWERS` — carried: a rename fails loudly at import.
  - `[low]` `[reject]` (blind) `_drop_unused_json_value` uses a full-schema string search, and `$defs` removal is unpinned — carried: at worst a dead `$defs` entry, harmless to clients; the listing test fails if a still-used def is removed (verification-gap layer).
  - `[low]` `[reject]` (blind) `_current_page` reads `library.json` instead of reading back over `/mcp` — the store file is the saved state the matrix row asks about; a style preference with no named harm.
  - `[low]` `[reject]` (edge-case) JSON Schema `integer` admits `120.0`, which the parsers refuse — carried: clients send integers in everyday use; the fix needs a coercion the contract bans or new schema keywords.
  - `[low]` `[reject]` (edge-case) A stale `JSON_VALUE_TYPES` key raises a bare `KeyError` — carried: every listing test fails at once with a traceback.
  - `[low]` `[reject]` (edge-case) A property already carrying `anyOf`/`type` lets `rest` override the declared type — carried (merge-order row): hypothetical, no such field; the listing test would catch an untyped `$ref`.
  - `[false]` `[reject]` (edge-case) `start_reading` on a Side read with `page: null` is refused though listed nullable — `null` is valid for every other Book, and the description says "When the Book is a Side read, also send page" (`backend/bookvie/agent/tools.py:512`); the schema can't express that condition.
  - `[false]` `[reject]` (edge-case) The null round trip never covers the Side read path — the Side read refusal is pre-existing parser behaviour this change doesn't touch; the claim the test makes is about the listed types.
  - `[false]` `[reject]` (edge-case) `finishedOn` has no format — carried: the description states YYYY-MM-DD.
  - `[false]` `[reject]` (edge-case, claim) "the JSON type the server accepts" is false because of `120.0` — same as the `120.0` row; the server accepts every JSON integer a client sends as one.

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
- With a dev server built from this checkout, `tools/list` on 8766 shows `"type": "integer"` for `update_page.page`. A real Claude Code session's `update_page` call is recorded under `## Auto Run Result

Status: in-review

**Summary.** The agent tools now list a JSON type for every value they take. `input_schema` applies a per-model declaration, `JSON_VALUE_TYPES`, after the null handling, keeps other keys such as `default`, and drops the unused `$defs.JsonValue`:
- `update_page.page`: integer, no null.
- `start_reading.page`, `finish_reading.rating`: integer or null.
- `purposeFulfilled`: enum `yes`/`partly`/`notYet` (from `_ANSWERS`) or null.
- `finishedOn`: string only (spec amendment, attempt 2).

No parser, refusal copy, tool description or HTTP intent changed, and nothing is coerced. Attempt 1 stopped on an intent gap (`finishedOn` was to list null, which the parser refuses). Oleg chose string-only, and this run re-derived the code from the amended spec.

**Files changed:**
- `backend/bookvie/agent/tools.py`: `JSON_VALUE_TYPES`, applied in `input_schema`, plus `_drop_unused_json_value`.
- `backend/tests/test_agent_value_types.py`: un-skipped ATDD listing test (`finishedOn` string only), the `update_page` string/integer round trip, the `"rating": "4"` refusal, and the null test. The null test checks that the three nullable properties take null and that `update_page.page` and `finishedOn` still refuse it.
- `CHANGELOG.md`: Fixed line under `[Unreleased]`.
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` on the item 83 entry, plus this review's deferrals.

**Review findings (pass 2): 28.**
- **Patched (5 entries, all `low`):** CHANGELOG wording, test comment, test name, and null round trips for the two non-nullable properties.
- **Deferred (3):** spine drift on AD-21, spine drift on AD-8, and the misleading wrong-type page copy.
- **Rejected:** every other finding, each with its reason in the Review Triage Log above.

**Follow-up review recommended:** false. 0 high and 0 medium patched; 5 low patched.

**Verification:**
- `uv run pytest -q tests/test_agent_write.py tests/test_agent_mount.py tests/test_agent_value_types.py`: 206 passed after the patches.
- `npm run check`: exit 0, smoke ok.
- `schema.d.ts`: unchanged.
- I/O matrix rows: each covered by a passing test in `test_agent_value_types.py`.

**Residual risks:**
- AC-2 is still manual and open. A real Claude Code session must save a page through the `bookvie-dev` tools on the first call, and that run must be recorded here. The `bookvie-dev` MCP server was unreachable in this session.
- The fix reaches the installed app only with a release after 2.0.0.
- A JSON `120.0` passes the schema but is refused (accepted limit).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
