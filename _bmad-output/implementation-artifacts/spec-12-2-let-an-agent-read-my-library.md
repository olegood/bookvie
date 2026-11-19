---
title: 'Story 12.2: Let an agent read my library'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_revision: '924904ef7058d3399cd8de4c9ff4b64faf8087f0'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-2-let-an-agent-read-my-library.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: AD-21 Find, never guess names a bare list; find_book answers {"books": [...]}.
    evidence: |-
      MCP structured content is an object (Oleg's ATDD decision). Code: backend/bookvie/views/models.py FindBookView (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-21 Find, never guess
    severity: low
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: the dependency direction has no views → intents.contract edge.
    evidence: |-
      views/ raise IntentError for the refusals AD-21/AD-9 place there; test_layers.py ALLOWED_MODULES admits only bookvie.intents.contract (Spine Check, Blind Hunter).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md Design Paradigm, dependency direction
    severity: low
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: AD-21 doesn't record find_book's ranking and matching, and the Deferred list still assigns them to Story 12.2.
    evidence: |-
      backend/bookvie/views/find_book.py module docstring (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-21; Deferred
    severity: low
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: the Structural Seed lists views/find_book as planned.
    evidence: |-
      backend/bookvie/views/find_book.py exists (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md Structural Seed, views/
    severity: low
  - summary: >-
      Spine drift (AD-9), reconciled before the next epic: AD-9 places the stats copy in http/api.py stats_view; it lives in views/stats.py.
    evidence: |-
      views/stats.py IsoDate, check_stats_range (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-9
    severity: low
  - summary: >-
      Spine drift (AD-9, AD-21), reconciled before the next epic: find_book's blank-query invalid_fields refusal is undescribed.
    evidence: |-
      views/find_book.py find_book (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-9 Binds; AD-21
    severity: low
  - summary: >-
      Spine drift (AD-21), reconciled before the next epic: AD-21 describes no field-naming argument parser for the read tools.
    evidence: |-
      agent/tools.py parse_view_arguments (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-21 Same handler, same answers
    severity: low
  - summary: >-
      Spine drift (Consistency Conventions), reconciled before the next epic: Title ordering (server) ties by Book id; find_book's ranked list ties by edition, then id.
    evidence: |-
      views/find_book.py sort key (Spine Check).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md Consistency Conventions, Title ordering (server)
    severity: low
---

<intent-contract>

## Intent

**Problem:** An agent connected at `/mcp` can only call `get_app_info`: it can't find a Book or read the library, so it would have to guess which Book Oleg means (FR-28, AD-21 Find never guess).

**Approach:** Add six read tools (`find_book`, `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`) to `agent/` that return the same views as their `GET /api/views/*` routes and refuse as the routes refuse. Move the routes' refusals (book not found, the stats range rules) into `views/` so the route and the tool share them, and add `views/find_book` for candidate search.

## Boundaries & Constraints

**Always:**
- Each tool's description equals the story's "Description:" text character for character (the ATDD file's `DESCRIPTIONS`).
- A view tool's structured content is its route's JSON exactly (by alias, `None` kept); its refusal is the route's AD-9 `error` object.
- `find_book` answers `{"books": [{id, title, subtitle, authors, edition, type, role}, ...]}` (Oleg's decision, ATDD checklist: MCP structured content is an object), no Book twice, `{"books": []}` for no match; a blank `query` (empty or whitespace) is `invalid_fields` with the one field `query`.
- Matching folds case and accents (`title_key`): a substring of the title, the subtitle or an author; the title-word initials, splitting words on anything not a letter or digit ("Data-Intensive" is two words), equal to the query with its non-alphanumerics removed (query at least 2 characters); the normalized ISBN, only when the query (hyphens/spaces removed) is 10 characters (digits, last may be `X`) or 13 digits, compared through `normalize_isbn` (so an ISBN-10 finds its ISBN-13).
- Order is deterministic: exact title, then ISBN, then title prefix, then title substring or initials, then author, then subtitle; ties by `title_key`, edition, id. Every match is returned (no cap).
- Read-tool arguments are parsed by a model whose `ValidationError`s become `invalid_fields`, one `FieldError` per error with `field` = the alias path and `message` = Pydantic's `msg` (as `http/api.py` `_validation_error` does for the routes), so the error names the argument, not `intent`. Explicit `null` is refused (IntentModel's `_no_null`); no argument is coerced except a date string by `get_stats`.
- The stats rules keep today's copy and order: `IsoDate` (`YYYY-MM-DD` only, any non-string refused, "Use YYYY-MM-DD."), then "Give both from and to." on the missing half, then "To is before From." on `to`. The route keeps its `from`/`to` query params (OpenAPI byte-identical).
- An unexpected failure in a read tool stays `couldnt_save`, because the view routes answer it (`_unexpected_error`): the tool refuses as its route does.
- `views/` may import `bookvie.intents.contract`'s error types; `test_layers.py` `ALLOWED["views"]` gains `intents` (no cycle: `intents` never imports `views`).

**Never:** no write tool and no destructive name; no change to `book_detail`/`card_notes`'s `None` return (existing tests use it); no edit to existing leaves' assertions except the four `["get_app_info"]` tool-list asserts in `test_agent_mount.py` (made the cumulative list) and the `ALLOWED` entry; no spine edits; `agent/` never imports `http`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ambiguous title | `find_book` "Designing" | both DDIA editions and "Designing Interfaces" | No error expected |
| Initials / ISBN | "DDIA"; `978-1-449-37332-0`; `1449373321` | both editions; the 1st edition; the 1st edition | No error expected |
| No match | "Neuromancer" | `{"books": []}` | No error expected |
| Blank query | `""`, `"   "` | — | `invalid_fields` on `query` |
| Unknown id | `get_book`/`get_card_notes` `bookId` unknown | — | route's 404 `book_not_found` object |
| Bad range | half range, non-date, `to < from`, number, `null` | — | `invalid_fields` on `from`/`to`, route's copy |
| Extra argument | `{"x": 1}` | — | `invalid_fields` on `x` ("Extra inputs are not permitted") |

</intent-contract>

## Code Map

- `backend/bookvie/agent/tools.py` -- `AgentTool`, `input_schema`, `parse_arguments` (malformed on `intent`, kept for 12.3's intents), `NoArguments`, `GET_APP_INFO`, `TOOLS`. Add the six tools here.
- `backend/bookvie/agent/server.py:72` `_success` -- dumps any model; add a guard that a non-object body raises (caught → `couldnt_save`, logged), closing deferred-work 1199.
- `backend/bookvie/http/api.py:349-418` -- `home_view`, `catalog_view`, `book_view` (raises `book_not_found(404)` on `None`), `card_notes_view` (same), `_ISO_DATE`/`_iso_date`/`_IsoDate` (l.386-396), `stats_view` (three `raise invalid_fields`). `_validation_error` (l.779) builds route field errors from `loc` minus `query`. `re`, `date`, `BeforeValidator` imports may become unused.
- `backend/bookvie/views/shelf.py:293` `book_detail` (None when missing), `_role` (l.260) for a candidate's role; `views/card_notes.py:17` `card_notes`; `views/stats.py` `stats(library, start, end)`; `views/models.py` `_View`, `Role`.
- `backend/bookvie/intents/contract.py` -- `book_not_found(status)`, `invalid_fields`, `FieldError`, `IntentError`.
- `backend/bookvie/intents/intent_model.py` -- `IntentModel` (strict, extra forbid, camel aliases, `_no_null`); a lax subclass via `model_config = ConfigDict(strict=False)` for dates.
- `backend/bookvie/domain/duplicates.py:34` `normalize_isbn` (int() on 10 chars: guard non-ISBN queries); `domain/ordering.py:6` `title_key`.
- `backend/tests/test_agent_read.py` -- 7 red leaves (`RED` skip); `test_agent_mount.py:203,236,422,621` tool-list asserts; `tests/test_layers.py:24` `ALLOWED`; `tests/test_stats.py::test_p1_a_bad_query_is_422_invalid_fields_naming_the_field` must pass unchanged.
- Deferred-work intake (`deferred-work.md`):
  - l.1196 `epic-12-context.md` still names `MCPServer` -- not in this story: a context-doc correction the 12.1 review folded into the AD-21 spine reconciliation.
  - l.1199 `_success` passes a non-object as structured content -- task: `find_book` wraps in `{books}`, `_success` refuses a non-object.
  - l.1205 read tools' unexpected error answers `couldnt_save` -- decided: keep `couldnt_save`, the view routes answer the same (`_unexpected_error`); a test pins it for a read tool.
  - l.1208 malformed call names `intent` -- task: read tools name the argument (field-naming parser).

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/shelf.py`, `views/card_notes.py` -- `require_book_detail(library, id)` next to `book_detail`, `require_card_notes(library, book_id)` next to `card_notes`, each raising `book_not_found(404)` on `None`; export from `views/__init__`.
- `backend/bookvie/views/stats.py` -- `IsoDate` (moved `_iso_date`, also refusing non-strings) and `check_stats_range(start, end)` with the three messages; export both.
- `backend/bookvie/views/find_book.py` (new) -- `BookCandidate`, `FindBookView` (models in `views/models.py`), `find_book(library, query) -> FindBookView` per the matching/order rules; blank query raises `invalid_fields` on `query` ("Give part of a title, an author or an ISBN.").
- `backend/bookvie/http/api.py` -- `book_view`, `card_notes_view` call the `require_*` functions; `stats_view` uses `views.IsoDate` and `views.check_stats_range`; no `raise` in the three, no stats copy left; unused imports removed.
- `backend/bookvie/agent/tools.py` -- field-naming `parse_view_arguments(model, arguments)`; argument models (`FindBookArguments` `query: str`; `BookArguments` `book_id: str`; `CardNotesArguments` `book_id: str | None = None`; `StatsArguments` lax, `start`/`end` aliased `from`/`to`, `views.IsoDate | None = None`); the six `AgentTool`s; `TOOLS` = `get_app_info`, `find_book`, `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`.
- `backend/bookvie/agent/server.py` -- `_success` refuses a non-object body.
- `backend/tests/test_layers.py` -- `ALLOWED["views"]` adds `"intents"`; docstring line updated.
- `backend/tests/test_agent_mount.py` -- four tool-list asserts become the cumulative list.
- `backend/tests/test_agent_read.py` -- remove the `RED` skips and constant; add tests: case/accents/subtitle/co-author, whitespace query, ISBN-10, waiting role, deterministic order, extra/missing/non-string/`null` arguments naming the argument, a read tool's unexpected failure is `couldnt_save`, non-object answer refused.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- Finalize: spine drift (AD-21) for `{books}` and for `views → intents` (spine line 52 dependency direction); `resolved:` on l.1199, 1205, 1208.

**Acceptance Criteria:**
- AC-1 to AC-7 as in `epics.md` Story 12.2, pinned by `backend/tests/test_agent_read.py` (each leaf names its AC).
- Given the route changes, when `npm run check` runs, then `check:api` finds the OpenAPI schema and generated types unchanged and `test_stats.py` passes unedited.

### Review Findings

Code review 2026-11-19 (`bmad-code-review`, new session; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check; diff `924904e..2b1ba0b`). 30 findings: 5 patch, 10 defer, 15 rejected.

- [x] [Review][Patch] A query made only of spacing accents (`´`, `¨`, `˜`, a lone combining mark) passes the blank check on `query.strip()` but folds to an empty key, and `title.startswith("")` makes every Book a title-prefix candidate (probed: `_fold("´") == ""`) — the blank check should run on the folded key (Edge Case Hunter) [backend/bookvie/views/find_book.py:91] — fixed: `find_book` refuses when the folded key is empty; `´`, `¨ ˜` and a lone U+0301 added to the blank-query loop; mutation probe (accent-only query not refused) fails it.
- [x] [Review][Patch] Nothing tests an ISBN-10 whose check digit is `X`/`x`: dropping `or compact[9] == "X"` or the `.upper()` in `_isbn_query` keeps every leaf green while such a query finds nothing (Verification Gap) [backend/tests/test_agent_read.py:516] — fixed: `test_find_book_finds_an_isbn_10_whose_check_digit_is_x_as_its_isbn_13` (`080442957X`, `0-8044-2957-x` → the Book stored as `9780804429573`); mutation probe (drop the `X` branch) fails it.
- [x] [Review][Patch] `_ISO_DATE` went from `\d` to `[0-9]`, which changes the stats route's answer for non-ASCII digits, but the Arabic-Indic case is only in the tool-only `cases` list, not in `_STATS_REFUSALS`, the list asserted against the route too (Blind Hunter) [backend/tests/test_agent_read.py:349] — fixed: the Arabic-Indic case added to `_STATS_REFUSALS`, so route and tool both answer "Use YYYY-MM-DD." on `from`.
- [x] [Review][Patch] `StatsArguments`' docstring is published as `get_stats`' `inputSchema.description` ("``from`` and ``to`` as the stats route takes them: lax, so a date string parses."): reST and an implementation note shown to the agent (Blind Hunter) [backend/bookvie/agent/tools.py:132] — fixed: a comment instead of the docstring; `get_stats`' `inputSchema` has no `description` now.
- [x] [Review][Patch] One new line of the `tools.py` module docstring is 111 characters, past the 100-column `line-length` (E501 is ignored, so nothing flags it) and unlike the reflowed lines around it (Blind Hunter) [backend/bookvie/agent/tools.py:13] — fixed: reflowed.
- [x] [Review][Defer] Spine drift (AD-21): `find_book` answers `{"books": [...]}`, not a bare list (Spine Check) [backend/bookvie/views/models.py] — deferred: spine drift, reconciled before the next epic; already in `deferred-work.md` (build-auto review of spec-12-2).
- [x] [Review][Defer] Spine drift (AD-21, AD-9): no `views → intents.contract` edge in the dependency direction (Spine Check) [backend/tests/test_layers.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-21): `find_book`'s ranking and matching unrecorded; the Deferred list still assigns them to 12.2 (Spine Check) [backend/bookvie/views/find_book.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-21): the Structural Seed lists `views/find_book` as planned (Spine Check) [backend/bookvie/views/find_book.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-9): the stats copy lives in `views/stats.py`, not `http/api.py` `stats_view` (Spine Check) [backend/bookvie/views/stats.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-9, AD-21): `find_book`'s blank-query refusal is undescribed (Spine Check) [backend/bookvie/views/find_book.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-21): "One validator" has no field-naming parser for the read tools (Spine Check) [backend/bookvie/agent/tools.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (Consistency Conventions): `find_book` breaks ties by edition before id (Spine Check) [backend/bookvie/views/find_book.py] — deferred: spine drift, already recorded.
- [x] [Review][Defer] Spine drift (AD-21): the rule, Seed `agent/`, Capability Map and Design Paradigm still say "planned for Epic 12" (Spine Check) [ARCHITECTURE-SPINE.md] — deferred: spine drift, covered by Story 12.1's entries.
- [x] [Review][Defer] `test_the_only_tool_is_get_app_info_and_it_returns_the_app_info_view` now asserts seven tools; renaming it means editing the Story 12.1 spec and documents that cite the name (Blind Hunter, Acceptance Auditor) [backend/tests/test_agent_mount.py] — deferred: edits other specs; rename at the Epic 12 retro or with the AD-21 reconciliation. Blind's suggestion to move `AGENT_TOOL_NAMES` to a shared module rides with it.

Full check after the patches, 2026-11-19: `npm run check` exit 0 — pytest 1711 passed, unit 388 passed, e2e 799 passed, smoke ok.

**Rejected:**
- `low` ×2 (Blind, Acceptance): `ALLOWED["views"]` wording in Always/Tasks/Never doesn't describe the narrowed `ALLOWED_MODULES` — the fix is an edit to the spec under review; the narrowing is recorded in the Review Triage Log.
- `low` ×2 (Blind, Acceptance): the matching rule names only `title_key`, not `fold_typography`, apostrophes or ISBN whitespace — spec edit; the code's docstring and the Triage Log record them.
- `low` ×2 (Blind, Acceptance): the Never boundary — `(tool,) = tools` became a by-name lookup, and `test_no_forbidden_import`'s body calls `_forbidden` — spec edit; both are forced by the cumulative tool list and the narrowed allowance.
- `low` Blind: the Auto Run Result's tallies differ from the Triage Log's line counts — spec edit; it counts fix entries, not lines.
- `low` Blind: add `dependentRequired` for "both or neither" to `get_stats`' schema — adds public schema surface; the description states the rule and the refusal names the missing half.
- `false` Blind: field naming is implemented twice and can drift (an empty `loc` gives `""`) — the argument models have no model-level validators, so no error has an empty `loc`; the parity tests pin the tool's refusals against the route's.
- `false` Blind: the tie-break uses `title_key`, not `_fold` — the order stays deterministic, as the spec requires; no candidate is lost or listed twice.
- `low` Blind: the `_ISBN` rank between exact title and title prefix is never exercised — an ISBN-shaped query can't be a real title's prefix in everyday use.
- `low` Blind: candidates carry no `isbn` — the seven-key shape is fixed by AD-21 and the ATDD checklist; `get_book` gives the rest.
- `low` Edge: an ISBN-10 with a wrong check digit still matches — rejected in the build review too: the 9-digit stem names the same Book.
- `low` Edge: fullwidth ISBN digits find nothing — not everyday, and the fix adds a normalization branch.
- `low` Acceptance: the `_success` guard's comment cites AD-21 rather than MCP's object rule — AD-21 governs the tool answers' shape; cosmetic.

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- verdicts: 30 findings — high 0, medium 4, low 22, false 4, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine: AD-21 Find never guess says `find_book` returns a bare list; the code answers `{"books": [...]}` — spine drift (AD-21), Oleg's ATDD decision; deferred.
  - `[low]` `[defer]` Spine: the dependency direction line has no `views → intents` edge — spine drift (AD-21/AD-9), deferred; worded for the narrowed `intents.contract` edge.
  - `[low]` `[defer]` Spine: AD-21 doesn't record the ranking, the Deferred line on `find_book` ranking remains, the Seed still says `find_book` and `agent/` planned — spine drift (AD-21), deferred (`agent/` planned already deferred by Story 12.1).
  - `[low]` `[defer]` Spine: AD-9 says the stats copy is in `http/api.py` `stats_view`; it is now in `views/stats.py` — spine drift (AD-9), deferred.
  - `[low]` `[defer]` Spine: AD-9/AD-21 don't list `find_book`'s blank-query `invalid_fields` refusal — spine drift (AD-9, AD-21), deferred.
  - `[low]` `[defer]` Spine: AD-21 describes no field-naming parser for read tools — spine drift (AD-21), deferred.
  - `[low]` `[defer]` Spine: Title ordering convention says ties by Book id; `find_book` breaks title ties by edition first — spine drift (Consistency Conventions): a ranked candidate list isn't a title-ordered list, the convention can name the exception; deferred.
  - `[low]` `[reject]` Intent: the description promises "an empty list" while the answer is `{"books": []}` — the description is fixed verbatim by `epics.md`; the list under `books` is empty; the shape is Oleg's recorded decision.
  - `[false]` `[reject]` Intent: "never guesses" is only tested server-side — the server's whole part is returning every candidate plus the description, both pinned; choosing is the client model's behavior.
  - `[medium]` `[patch]` Intent (same root as Blind 7): the layer test was widened to the whole `intents` layer — fixed: narrowed to `bookvie.intents.contract`.
  - `[false]` `[reject]` Intent: `_iso_date` now refuses non-strings — query values are always strings, so the route can't change; the spec asks the tool to refuse non-strings.
  - `[false]` `[reject]` Intent: read failures answer `couldnt_save` — decided in the spec (deferred-work 1205): the view routes answer the same; pinned against the route.
  - `[low]` `[reject]` Intent: read tools untested in `--dev` — the same `create_app` builds both; 12.1 tests the mount in both modes; a second run of every leaf adds no new path.
  - `[false]` `[reject]` Intent: ranking, initials minimum, ISBN-10, whitespace aren't in the intent — the spine's Deferred list assigns `find_book`'s ranking and match details to Story 12.2.
  - `[low]` `[patch]` Verification gap: the id tie-break in `find_book`'s order is unpinned — fixed: a same-title, same-edition pair of another type, asserted in id order.
  - `[medium]` `[patch]` Blind: `find_book` folds by `title_key` only, so typographic dashes/quotes and runs of whitespace miss — fixed: fold through the duplicates rule's typographic table and whitespace collapse (one shared domain function); tests added.
  - `[low]` `[reject]` Blind: "ISBN:" prefix, leading-article initials, subtitle initials — each adds a matching branch for queries an agent can phrase plainly ("TPP" works); not everyday.
  - `[low]` `[reject]` Blind: ISBN-10 check digit not validated — a wrong last digit still names the same 9-digit stem, i.e. the same Book; adding checksum branches buys nothing for a candidate search.
  - `[low]` `[patch]` Blind: test comment claims ten characters but sends 9 — fixed (comment/value corrected).
  - `[low]` `[patch]` Blind: `tools.py` docstring says every read tool answers its route; `find_book` has none — fixed in the docstring. The description's forward reference to `update_page`/`pause` is fixed text from `epics.md`: rejected.
  - `[low]` `[reject]` Blind: no per-argument schema descriptions — the tool descriptions already say where the id comes from; not required by any AC, adds surface for no defect.
  - `[medium]` `[patch]` Blind: `ALLOWED["views"]` admits every `intents` module, so a view importing a write intent passes the layer test — fixed: only `bookvie.intents.contract` allowed; a scanner case added.
  - `[low]` `[patch]` Blind: `_ISO_DATE` `\d` matches non-ASCII digits — fixed: `[0-9]`; test case added.
  - `[low]` `[patch]` Blind: the app-info test picks `tools[0]` — fixed: looked up by name (name kept, other docs cite it).
  - `[low]` `[reject]` Blind: the `_success` guard is tested for a list only — a scalar and `null` take the same `isinstance` branch; the test proves the branch.
  - `[low]` `[patch]` Blind: drift entries cite spine line numbers and bundle items — fixed in Finalize: entries cite section names, one item each.
  - `[medium]` `[patch]` Edge (same root as Blind 1): runs of whitespace and typographic quotes/dashes — same patch.
  - `[low]` `[reject]` Edge (same root as Blind 3): ISBN-10 wrong check digit — same reason.
  - `[low]` `[patch]` Edge: an ISBN with tabs or a no-break space is text — fixed: every whitespace character removed; test case added.
  - `[low]` `[patch]` Edge: an apostrophe inside a word breaks initials ("DMMT" for "Don't Make Me Think") — fixed: apostrophes dropped before splitting; test added.

## Design Notes

- **Why `views → intents`.** AD-21 and AD-9 ("the views that refuse") put the refusals in `views/`, which needs `IntentError`; the spine's dependency line (`views → domain, store`) forbids it. `intents.contract` imports only `domain`, so the edge makes no cycle. The code is right and the spine's line 52 is stale: spine drift (AD-21), deferred, not a spine edit.
- **Field-naming parser** (sketch):
  ```python
  try:
      return model.model_validate(arguments)
  except ValidationError as err:
      raise invalid_fields([FieldError(field=".".join(map(str, e["loc"])), message=e["msg"])
                            for e in err.errors()]) from None
  ```

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_agent_read.py tests/test_agent_mount.py tests/test_stats.py tests/test_layers.py` -- expected: all pass.
- `npm run check` (repo root) -- expected: exit 0, OpenAPI/types unchanged.

## Auto Run Result

**Summary.** Six read tools join `get_app_info` at `/mcp`: `find_book` (new `views/find_book.py`: candidates as `{"books": [...]}`, matched by folded title/subtitle/author substring, title initials and normalized ISBN, ranked deterministically, blank query refused on `query`), and `get_book`, `list_catalog`, `get_card_notes`, `get_home`, `get_stats`, each answering its `GET /api/views/*` route's view and refusing as the route does. The routes' refusals moved into `views/` (`require_book_detail`, `require_card_notes`, `IsoDate`, `check_stats_range`), shared by route and tool; the OpenAPI schema is unchanged. Read-tool arguments are refused by `parse_view_arguments`, naming the argument.

**Files changed.**
- `backend/bookvie/agent/tools.py`, `agent/__init__.py`: argument models, `parse_view_arguments`, the six tools, `TOOLS` of seven.
- `backend/bookvie/agent/server.py`: `_success` refuses a non-object answer (logged, `couldnt_save`).
- `backend/bookvie/views/find_book.py` (new), `views/models.py` (`BookCandidate`, `FindBookView`), `views/shelf.py` (`require_book_detail`, `role_of`), `views/card_notes.py` (`require_card_notes`), `views/stats.py` (`IsoDate`, `check_stats_range`), `views/__init__.py`.
- `backend/bookvie/domain/duplicates.py`: `fold_typography` shared by the duplicate key and `find_book`.
- `backend/bookvie/http/api.py`: the three view routes call `views/`; no `raise` or stats copy left.
- `backend/tests/test_agent_read.py`: 7 ATDD leaves un-skipped, plus tests for folding, ISBN-10 and whitespace, roles, order, argument refusals, `couldnt_save`, non-object answers.
- `backend/tests/test_agent_mount.py`: cumulative tool list; app-info tool looked up by name. `backend/tests/test_layers.py`: `ALLOWED_MODULES` lets `views` import `bookvie.intents.contract` only.
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` on the three 12.1 intake entries; 8 spine drift entries.

**Review.** 30 findings (high 0, medium 4, low 22, false 4). 13 patched in 9 fix entries: 2 medium entries (typographic/whitespace folding; the narrowed layer allowance) and 7 low (id tie-break test, apostrophes in initials, whitespace in ISBNs, ASCII-only dates, app-info lookup by name, a test comment and the tools docstring, drift entries by section name). 7 deferred as spine drift (8 entries). 10 rejected, with reasons in the Review Triage Log: the "empty list" description (fixed text), server-side "never guesses", `_iso_date` non-strings, `couldnt_save` for reads, `--dev` re-runs, intent-silent ranking choices, ISBN prefixes/leading-article initials, ISBN-10 check digits (twice), per-argument schema descriptions, and the scalar `_success` case.

**Follow-up review recommended: true.** Two medium entries were patched after the review read the code: `fold_typography` (now also inside the duplicate check's `_key`, meant to be behavior-identical) and `test_layers.py`'s `ALLOWED_MODULES` rule. Both have new tests, but no reviewer has read the patched code.

**Verification.** `uv run pytest -q tests/test_agent_read.py tests/test_agent_mount.py tests/test_stats.py tests/test_layers.py`: 164 passed before the patches; the patch round's covering tests 189 passed. `npm run check` after the patches (bytecode caches cleared first): exit 0, pytest 1710 passed, e2e 799 passed, `check:api` unchanged, install smoke ok. `test_stats.py` is unedited.

**Residual risks.**
- `find_book`'s ranking is a judgment call the ACs don't fix; a real Claude Code session hasn't exercised how an agent uses the candidates.
- A views file written `from bookvie.intents import contract` would be refused by the layer test (only the dotted module form is admitted).
- The `test_the_only_tool_is_get_app_info...` name is stale (kept because 12.1 documents cite it).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
