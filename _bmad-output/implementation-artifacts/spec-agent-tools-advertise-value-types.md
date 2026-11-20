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

## Auto Run Result

Status: blocked
Blocking condition: intent gap

**What happened.** The implementation advertised the five `JsonValue` properties with JSON types in `backend/bookvie/agent/tools.py` (`JSON_VALUE_TYPES`, applied in `input_schema`). It also un-skipped and extended `backend/tests/test_agent_value_types.py`, and edited `CHANGELOG.md` and `deferred-work.md`. `npm run check` passed (exit 0), the spec's pytest commands passed (205), and the I/O matrix rows were all covered by passing tests.

The review found the contract itself is wrong on one field. `finishedOn` is required to be advertised "string or null", but `_finished_on` (`backend/bookvie/intents/finish_reading.py:88-89`) refuses `null` as a format error, so the schema would invite a value the server always refuses. That is the same class of bug this spec fixes. A fix contradicts the intent-contract (Approach, Always bullet 2, I/O row "Listed finish fields"), so the code was reverted per step-04's intent_gap branch.

**Saved patch:** kept outside the repo (session scratchpad); its approach is the Spec Change Log KEEP line. It holds every code, test, CHANGELOG and deferred-work change from this run. Reverted with `git apply -R`; `git status` shows only this spec and the patch.

**Unresolved question for Oleg.** Should `finishedOn` be advertised as `{"type": "string"}` only, since `finish_reading` always needs a date? The tool description already treats it as required and offers null only for `purposeFulfilled` and `rating`. Or should the parser start accepting `null` (for example, meaning today), which would change `_finished_on`, a "Never" in this spec? If string-only: amend the Approach, Always bullet 2 and the I/O row, then re-run `bmad-build-auto` on this spec. The saved patch needs only `finishedOn`'s entry and its test assertion changed. Consider also a round-trip test that sends `null` to each field advertised as nullable, so this can't recur.

**Deferred (recorded in the triage log):** spine drift on AD-21 and AD-8, moot until the code is re-derived.
