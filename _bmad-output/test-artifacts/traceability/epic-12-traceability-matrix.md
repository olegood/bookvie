---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-20'
workflowType: 'testarch-trace'
traceTarget: 'epic 12'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :198; Epic 12 gate :2649; Stories 12.1-12.8 :2653-2960)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (Murat''s P0 risks :123-131)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Epic gate :29)'
  - '_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md (action 81)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-{1..8}-*.md (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '0d000cd'
---

# Traceability Matrix & Gate Decision: Epic 12, Talk to bookvie from Claude Code

**Target:** Epic 12, Stories 12.1 to 12.8 (gate type: epic). This is Epic 12 retro action 81 (`epic-12-retro-2026-11-20.md:171`).
**Date:** 2026-11-20
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `0d000cd`.
- That commit is the last story commit `d434a07` (12.8), plus the retro (`526ec37`, docs only) and retro actions 85 (`e1ecf37`), 86 (`d10b22f`), 87 (`e538f9d`, the agent-test helpers, the `editForm` parity case table and the shutdown-config pin), 84 (`6150bc9` and the 2.0.0 release `7c68a46`, `0924867`) and 82 (`0d000cd`, spine reconciliation, docs only).
- This trace changed no product code and added no test.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:198`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 12 gate** (`epics.md:2649`, `epic-12-context.md:29`): TR7, plus the plan's P0 risks green (cross-origin refused on `/mcp`; mounted in production and `--dev`, the dev one on the dev data folder; same handler per write tool, errors included; no destructive tools; `find_book` candidates; the cover downloader's refusals against local fakes with no network; `export_backup` into a temporary `HOME`), every tool's registered description equal to its story's AC text, the existing pytest and e2e passing unchanged, and `~/bookvie-data` and the real backup folders untouched by `npm run check`.

**Machine-readable:** `epic-12-e2e-trace-summary.json` and `epic-12-gate-decision.json`, both in this folder.

**Live verification results:** none on file. Story 12.1 AC-8, a run by Oleg in a real Claude Code session, is recorded by hand in its spec (`spec-12-1-mount-the-mcp-server.md:177`, Oleg's real session on 2026-11-19; the review decision at `:100`), not as a live results file. It is counted as a recorded manual check, as Epic 11 counted 11.1 AC-5. Stories 12.7 AC-3 and 12.8 AC-4, the other two manual runs, have no record anywhere (retro E12-S1).

**Waiver register:** none on file.

**Tests added by this trace:** none.

---

## Gate Decision: CONCERNS

**Rationale:**
- P0 coverage is 100% (26/26).
- P1 coverage is 87.5% (14/16). That is under both TR7's 95% and the workflow's 90% PASS line, and above the 80% minimum, so the workflow's rule 5 gives CONCERNS.
- The two P1 gaps are the two manual ACs nobody has run: 12.7 AC-3 (`bookvie-notes-summary` in a real session against `--dev`) and 12.8 AC-4 (`bookvie-new-book` on an amazon.com and a leanpub.com book, with their covers). Retro action 83, owned by Oleg, records both. No automated test can close them: they are the only planned check that the skills work in a real agent session, and 12.8 AC-4 is also the only check of a real cover download (the suite blocks every connection off the machine, by 12.5 AC-5).
- Overall coverage is 95.3% (41/43), against the minimum of 80%.
- Every plan P0 risk is green (table below), every registered description equals its AC text, and Epic 12 added no error code. `check:api` is clean and the coverage gates hold.
- The existing pytest and e2e pass with no assertion changed (see "Existing tests unchanged" below).
- `~/bookvie-data` and the real `~/bookvie-backups*` folders were untouched by this trace's `npm run check`.

**What turns this into PASS:** Oleg's two runs (retro action 83) recorded in `spec-12-7-…md` and `spec-12-8-…md`, and the five open manual lines in the 12.7 and 12.8 ATDD checklists ticked from them. With both ACs FULL, P1 is 16/16 and every other clause already holds. A re-trace then only needs to update the two rows and the counts.

### TR7 criteria and the Epic 12 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 26/26 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 14/16 FULL = 87.5%. Missing: 12.7 AC-3 and 12.8 AC-4, both manual and unrecorded | ⚠️ NOT MET (workflow: PARTIAL, 80-89%) |
| Every error code has an API test | "Error codes" below: Epic 12 added none | ✅ MET |
| `check:api` clean | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; 3 warnings, `usePauseFlow.tsx:86`, `:105` and `BackToTop.tsx:41`, all predate Epic 12); node tests 389 passed, 0 failed, 0 skipped | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (468/468 lines), intents+store 97.38% (2008/2062) | ✅ MET |
| Plan P0 risks green | "Epic 12 P0 risks" below: all seven green in this run | ✅ MET |
| Every registered description equals its AC text | `agent_client.py:98` parses each "Description:" line (and the 12.5 addition) from `epics.md` Epic 12, so a changed AC fails the test. Compared for every tool: `test_agent_mount.py` (`get_app_info`), `test_agent_read.py` (the six read tools), `test_agent_write.py:451` (the ten write tools), `test_agent_book_write.py` (`add_book`, `edit_book`), `test_agent_cover_url.py:293` (the `coverUrl` addition), `test_agent_backup.py` (`export_backup`): 20 of 20 | ✅ MET |
| Existing pytest and e2e pass unchanged | "Existing tests unchanged" below; all green in the run below | ✅ MET |
| `~/bookvie-data` and the real backup folders untouched by `npm run check` | The run went from 22:24:55 to 22:30:45. Read-only `find ~/bookvie-data -newermt '2026-11-20 22:24:55'` afterwards listed nothing; the folder's newest file is `library.json` at 17:56:32 and its lock at 22:10:20, both from Oleg's running app before the run. No `~/bookvie-backups*` folder exists at all. Every pytest test's `HOME` is a temp folder (`conftest.py:78`, asserted), and every e2e server gets a temp `HOME` and `--data-dir` (`agent-backup.spec.ts:15`) | ✅ MET |

### Epic 12 P0 risks

The plan (`mcp-server-plan-2026-11-19.md:123-131`) names seven P0 risks.

| Risk | Matrix items | Key tests | Status |
|---|---|---|---|
| Cross-origin refused on `/mcp` (foreign `Origin` or `Host`, `Sec-Fetch-Site`; loopback with no `Origin` served; never 421) | 12.1 · AC-3 | `test_agent_mount.py:277` (7 refused cases, plus `LOCALHOST`, which the SDK alone would answer 421), `:648`, `:663` (14 cases) | ✅ green |
| Mounted in production and `--dev`, the dev one on the dev data folder | 12.1 · AC-2 | `test_agent_mount.py:197` (real `bookvie` processes in both modes: handshake, tool list, `get_app_info` `mode` and `dataDir` each on its own folder), `:220`, `:576`, `:623` | ✅ green |
| Same handler per write tool, errors included | 12.3 · AC-2, 12.4 · AC-3 | `test_agent_write.py:413` (tool against `POST /api/intents/<verb>` on twin libraries: the same `library.json` and the same result or `kind`/`code`/`message`/`fields`; every no-op, `book_not_found`, `invalid_fields`, wrong type, unknown and missing key, all seven state refusals, and `couldnt_save` at write, fsync and replace), `:538`, `:558`, `:612`; `test_agent_book_write.py:275` (`BOOK_CASES`) | ✅ green |
| No destructive tools | 12.3 · AC-4, 12.1 · AC-6 | `test_agent_write.py:464`; `test_agent_mount.py:481` (`delete_book`, `delete_card_note`, `restore`, `set_spine_color` are unlisted, fail as unknown tools and change nothing) | ✅ green |
| `find_book` candidates (both editions, empty list for no match, a blank query refused) | 12.2 · AC-1 | `test_agent_read.py:149`, `:456`, `:480`, `:504`, `:519`, `:539`, `:663` | ✅ green |
| The cover downloader's refusals, against local fakes, no network | 12.5 · AC-2, AC-3, AC-4, AC-5 | `test_agent_cover_url.py:394` (`COVER_CASES`: every refusal AC-4 lists, item by item), `:339`, `:365`; `test_cover_fetch.py` (74 cases, incl. `:432`, `:447`, `:466`, the 30 s default); `conftest.py:164` (the autouse off-machine guard) and `test_agent_cover_url.py:474` | ✅ green |
| `export_backup` into a temporary `HOME` (dated file, `-dev` folder with `--dev`, restores, `lastExportAt` moves, same-day replace) | 12.6 · AC-1 to AC-6 | `test_agent_backup.py` (35 cases: `:226` same-day replace, `:256` last export, `:301` `couldnt_export`); `conftest.py:78` (every pytest test's `HOME` is a temp folder, asserted); `agent-backup.spec.ts:15` (the e2e servers, `--dev` too, get a temp `HOME`; the real folders unchanged) | ✅ green |

### Run evidence

**Commit:** `0d000cd`, clean working tree.

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other), started 22:24:55.

**Result:** exit code 0 (npm's own status, written to the log after the run), on the first run. It ended at 22:30:45.

| Check | Outcome |
|---|---|
| pytest | 2170 passed (3 warnings, none from Epic 12: a PIL size warning in `test_cover.py` and two `zipfile` duplicate-name warnings in `test_restore_refusals.py`) |
| Coverage gates | `coverage_gate.py`: domain 100.00% (468/468 lines), intents+store 97.38% (2008/2062) |
| `check:api` | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; 3 warnings that predate Epic 12); 389 passed, 0 failed, 0 skipped |
| Playwright | 800 passed (2.8 m), none flaky, retried or skipped. That is the count in the retro's acceptance evidence: this trace added no test. |
| Smoke | isolated install served `/`, a deep link and `/favicon.svg` (the built file), the installed `favicon-dev.svg` is the built file, and `POST /mcp` `initialize` answered 200 with protocol 2025-11-25 and tools: ok |

### Existing tests unchanged

`git diff 56a7f37^..HEAD` (`56a7f37` is the first Story 12.1 commit) modifies 11 test files that predate Epic 12. None changes an assertion about earlier behavior:

- **Added only:** `conftest.py` (+162: the temp-`HOME` fixture and the off-machine guard), `helpers.py` (+94), `test_book_view.py` (+63, `editForm`), `test_cli.py` (+32, the shutdown-config pin), `test_stack_pins.py` (+2, the `mcp` and `httpx2` rows), `frontend/e2e/README.md` (+1), `frontend/src/api/views.test.ts` (+15).
- **`test_layers.py`** (+51 −10): the layer table gains `agent`, and the one allowed module edge `views → intents.contract`. The rules for the earlier layers are unchanged.
- **`frontend/e2e/fixtures.ts`** (+48 −5) and **`library.ts`** (+61 −1): the e2e server gets a temporary `HOME` (12.6 AC-6) and seeding gains the new fields; no spec's assertions change.
- **`frontend/src/lib/bookDetail.test.ts`** (+45 −11): the Reading fixtures gain `purpose: null`, the field `get_book`'s Readings now carry, and the `editForm` parity case (retro action 87). The expected values are unchanged.

---

## Oracle and scope

**Oracle.** TR7 states its percentages against the `test-design-qa.md` scenarios, which predate Epic 12 and have no MCP scenario. Epic 12's test design is Murat's section of the plan, which the epic's gate cites. So the priority-bearing oracle is each Story 12.1 to 12.8 AC from `epics.md`: 43 items. AC numbers follow each story's ATDD checklist. For 12.4 that differs from `epics.md`'s order, because `editForm` was added during the build: the checklist's AC-3, AC-4 and AC-5 are `epics.md`'s third, fourth and fifth paragraphs in the order contract test, partial edit, `editForm`.

**Priority.** An AC's priority is the higher of:
- the highest `[P0]`…`[P3]` marker among its tests (ATDD and automate), and
- the plan risk it carries.

The second rule raises two ACs the ATDD marked P1 to P0, because the plan's `export_backup` risk names them: 12.6 AC-3 (a same-day backup replaces the file) and 12.6 AC-4 (`lastExportAt` moves). Both are FULL, so this changes no result. It only puts them under the stricter threshold.

**Manual ACs.** Three ACs are runs by Oleg in a real Claude Code session. The trace counts a manual AC FULL only when its spec records the result:
- 12.1 AC-8: recorded (`spec-12-1:177`, `:100`). FULL. The Auto Run Result at `spec-12-1:200` still says "AC-8 is open". That text is stale, and retro action 83 corrects it.
- 12.7 AC-3 and 12.8 AC-4: not recorded (`spec-12-7:189`, `spec-12-8:217`). NONE.

**Out of scope, and why:**

- **XUI-E2E-001 to XUI-E2E-005** (couldn't save, two contexts, no optimistic UI, tone, empty states). Epic 12 adds no UI apart from `editForm` on the `book` view, which the panel doesn't read. A tool's write reaching an open tab is the same intent invalidation the earlier traces pinned.
- **A real cover download through real DNS and a real CDN.** 12.5 AC-5 forbids it in the suite. It belongs to 12.8 AC-4's manual run, which is a gap here, and to `deferred-work.md:1333`.
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser").

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 26             | 26            | 100%       | ✅ PASS |
| P1        | 16             | 14            | 87.5%      | ⚠️ CONCERNS |
| P2        | 1              | 1             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **43**         | **41**        | **95.3%**  | **⚠️ CONCERNS** |

**Tests mapped:** every Epic 12 test, plus the Epic 12 edits to older test files.

- **Backend, agent tools (pytest, collected cases):**
  - `test_agent_mount.py`: 48. `test_agent_read.py`: 18.
  - `test_agent_write.py`: 154. `test_agent_shutdown.py`: 1.
  - `test_agent_book_write.py`: 42. `test_agent_edit_form.py`: 18. `test_edit_form_parity.py`: 4.
  - `test_agent_cover_url.py`: 95. `test_cover_fetch.py`: 74.
  - `test_agent_backup.py`: 35.
  - The helper modules are `agent_client.py` (one tool list, the descriptions read from `epics.md`, one answer unwrapper and error reader) and `cover_server.py` (the local TLS fake).
- **Skills (pytest, static checks of the skill files):** `test_notes_summary_skill.py`: 14. `test_new_book_skill.py`: 15.
- **Unit (frontend):** `lib/bookDetail.test.ts:92`, 1 case over the 3 rows of `editForm.cases.json`, the table `test_edit_form_parity.py` also reads.
- **e2e:** `agent-backup.spec.ts`: 1 (helpers in `agent-backup.ts`).
- **Epic 12 edits to older tests** (mapped, not counted): `test_layers.py`, `test_stack_pins.py`, `test_book_view.py`, `test_cli.py`, `conftest.py`, `fixtures.ts`, `library.ts`, `views.test.ts`, `bookDetail.test.ts`.

**By level:** the Epic 12 test cases number 520.

| Level | Tests (Epic 12) | Criteria covered |
|---|---|---|
| API / integration (pytest, agent tools) | 489 | 35 (every item of 12.1 but AC-8, and all of 12.2 to 12.6) |
| Other (pytest, static skill checks) | 29 | 5 (12.7 AC-1, AC-2; 12.8 AC-1, AC-2, AC-3) |
| Unit (frontend `lib/`) | 1 | 1 (12.4 AC-5, with pytest) |
| e2e | 1 | 1 (12.6 AC-6, with pytest) |
| Manual, recorded in a spec | n/a | 1 (12.1 AC-8) |

**Skipped, fixme or pending:** one conditional skip. `test_agent_backup.py:301[read-unreadable-cover]` skips itself only when run as root, because root can read an unreadable file. As Oleg it ran.

**Rejected evidence:** none. Every mapped test was read against its criterion. The skill tests pin the skill files' instructions, not an agent's behavior. They are accepted for 12.7 AC-1 and AC-2 and 12.8 AC-1 to AC-3, whose deliverable is the skill text, and they are not counted toward 12.7 AC-3 or 12.8 AC-4.

### Detailed Mapping

pytest files are in `backend/tests/` and e2e in `frontend/e2e/`, unless shown in full. Line numbers are at `0d000cd`.

#### Story 12.1: Mount the MCP server

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.1 · AC-1 | P1 | `mcp` and `httpx2` runtime deps pinned to the day's versions (2.3.0, 2.16.2, recorded in the spec); `httpx` dev-only; `uv.lock` updated | `test_agent_mount.py:149` (both in runtime deps; each range admits today's version and refuses the series either side; neither in dev; `httpx` dev, not runtime; `uv.lock` versions and the `bookvie` entry's deps); `test_stack_pins.py` `STACK_ROWS` maps `mcp` (`:39`) | FULL |
| 12.1 · AC-2 | P0 | `/mcp` initializes and lists tools on a production and a `--dev` server; no `/mcp/mcp`, no redirect to `/mcp/`; a fresh MCP server per `create_app`; session manager in the lifespan; stateless, JSON; a restart needs no new session | `test_agent_mount.py:197` (real `bookvie` processes, production and `--dev`: handshake, tool list, `get_app_info` `mode` and `dataDir` = each server's own folder, `/mcp/mcp` 404); `:220` (two apps live at once, no session id, `application/json`, a restarted app served with no new handshake, `/mcp` 200 with no redirect); `:576` (an app whose lifespan never ran serves no MCP request; a second lifespan is refused); `:623` (the 2026-07-28 stateless envelope served) | FULL |
| 12.1 · AC-3 | P0 | Foreign `Origin`, foreign `Host`, or `Sec-Fetch-Site` other than `same-origin`/`none` → the AD-16 guard's 403; loopback with no `Origin` served; SDK check off, never 421 | `test_agent_mount.py:277` (×7 refused headers: `(403, "Forbidden\n")`, while no-Origin, own Origins, `same-origin`, `none` and `Host: LOCALHOST:8765` (the SDK's 421 case) are 200); `:663` (×14: GET and DELETE on `/mcp` refused the same way); `:648` (a dev app serves the Vite origins and still refuses a foreign one) | FULL |
| 12.1 · AC-4 | P1 | `GET /mcp/anything`, `/MCP` never answered by the SPA; an `/mcp` body over 1 MB refused before it is read | `test_agent_mount.py:293` (six `mcp` paths 404 with no `index.html`; exactly 1 MiB served, one byte more 413; a declared 2 MiB `Content-Length` 413 with `receive` never called); `:741` (a chunked body past 1 MiB refused while streaming, the tool never runs) | FULL |
| 12.1 · AC-5 | P0 | Registration helper: schema from the model by alias, closed, `null` dropped where refused; no SDK validation or coercion; one worker-thread call; success by alias as structured content + same JSON text; `IntentError` → `isError` AD-9 object; other exception → `couldnt_save`; a test-only tool proves all four and isn't registered outside tests | `test_agent_mount.py:370` (test-only `probe_tool`: schema equals the model's, `"212"` and an extra key reach the body uncoerced and are refused as `malformed()`, `book_not_found` without "Error executing tool", a `RuntimeError` as `couldnt_save`, five calls all off the event loop); `:515` (nullable matched by Python field name); `:525` (no `arguments` = `{}`); `:540` (duplicate names refused); `:560` (×params: an answer that can't be serialized is `couldnt_save`); `:797` (×params: `fields` and `duplicates` come back whole); `:838` (a union keeps its other branches once `null` is dropped); `:850` (an unexpected failure is logged with the tool name); the probe tool is absent from the production list (`:424`, `:197`) | FULL |
| 12.1 · AC-6 | P0 | The tool list holds exactly `get_app_info` (after this story); `get_app_info` returns the `app-info` view by alias; its description equals the AC text | `test_agent_mount.py:424` (renamed by retro item 87 from `test_the_only_tool_is_get_app_info_…`: the list is the cumulative `AGENT_TOOL_NAMES`, as 12.2-12.6 extended it; description equals `DESCRIPTIONS["get_app_info"]`, read from `epics.md`; closed empty schema; structured content and text equal `GET /api/views/app-info`, keys `version`, `mode`, `dataDir`, `commit`); `:535` (an argument is refused); `:481` (×4: `delete_book`, `restore`, `delete_card_note`, `nope` are JSON-RPC errors and change nothing) | FULL |
| 12.1 · AC-7 | P1 | A shared fixture gives later stories an MCP client on a real app (lifespan running) on a temp data folder; this story's tests use it | `test_agent_mount.py:449` (`get_app_info`'s `dataDir` is the fixture's folder, under `tmp_path`, holding `library.json`, the store's `data_dir`); `:812` (the fixture never reaches the real home or its library); `connect_mcp`/`mcp_client` in `conftest.py`, used by every `test_agent_*.py` | FULL |
| 12.1 · AC-8 | P1 | Manual: `bookvie-dev` added while no server runs, `bookvie --dev` started after the session; the spec records what Claude Code does and the skills' start step, verified by Oleg | Manual, recorded: `spec-12-1-mount-the-mcp-server.md:177` (Verification, 2026-11-19, Oleg's real session: `/mcp` → `bookvie-dev` → reconnect connects, `get_app_info` reports `dev`; the start step for the skills) and `:100` (review decision resolved). `:200` still says "AC-8 is open": stale text, retro item 83 corrects it | FULL |
| 12.1 · AC-9 | P2 | README "Agent tools": both `claude mcp add … --scope user` lines (8765 `bookvie`, 8766 `bookvie-dev`), bookvie must be running, the reconnect step AC-8 found | `test_agent_mount.py:463` (section exists; both exact commands; "running"); the reconnect sentence (`README.md:112`: "run `/mcp` in Claude Code, pick the entry and choose reconnect") matches AC-8's recorded result, checked by hand in the review (`spec-12-1:100`), and here | FULL |

#### Story 12.2: Let an agent read my library

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.2 · AC-1 | P0 | `find_book` by "DDIA", "Designing", "Kleppmann", an ISBN with or without hyphens returns every match as `{id, title, subtitle, authors, edition, type, role}`, both editions; no match is an empty list; an empty query is `invalid_fields` on `query`; description equals the AC | `test_agent_read.py:149` ("Designing" gives both DDIA editions and "Designing Interfaces"; exact seven keys with each edition's own `edition`, `type`, `role`; "DDIA", "Kleppmann", hyphenated and plain ISBN-13; "Neuromancer" → `[]`; `""` → `invalid_fields` on `query`; description; schema `{query}` required, closed); `:456` (case and accents fold, subtitle word, co-author); `:480` (ISBN-10 finds its ISBN-13; a whitespace query refused like `""`); `:504` (ISBN-10 ending in X); `:519` (`waiting` and `null` roles); `:539` (deterministic order); `:663` (typographic dashes, apostrophes, runs of spaces); `:573` (×params: extra, missing, non-string arguments refused by name) | FULL |
| 12.2 · AC-2 | P0 | `get_book` with `bookId` returns the `book` view (same model as `GET /api/views/book`, by alias); unknown id `book_not_found` as the route; description equals the AC | `test_agent_read.py:209` (structured content equals the route for both editions; unknown id equals the route's 404 `error`, `book_not_found`; description; schema `{bookId}` required, closed); `:573` (non-string and missing `bookId` refused, not coerced) | FULL |
| 12.2 · AC-3 | P1 | `list_catalog` returns the `catalog` view by alias; description | `test_agent_read.py:238` (equals `GET /api/views/catalog`; the four seeded Books; description; no arguments) | FULL |
| 12.2 · AC-4 | P1 | `get_card_notes` with no arguments or `bookId` returns the `card-notes` view for all or one Book; unknown `bookId` `book_not_found`; description | `test_agent_read.py:255` (no arguments equals the route; `bookId` equals `?book=`, scoped, one group; a Book with no notes `groups: []`; unknown id equals the route's 404 `error`; description; `bookId` optional, closed) | FULL |
| 12.2 · AC-5 | P1 | `get_home` returns the `home` view by alias; description | `test_agent_read.py:288` (equals `GET /api/views/home`; Main book and Up next; description; no arguments); `:726` (after an export, `lastExportAt` equals the route's) | FULL |
| 12.2 · AC-6 | P0 | `get_stats` with no range or `from`/`to` returns the `stats` view as the route does; a half range, a non-date, `to` before `from` → `invalid_fields` on `from`/`to` with the route's copy; the parsing lives in `views/`, shared by route and tool; description | `test_agent_read.py:367` (a 2026 range, no range and an empty range each equal the route; 8 bad ranges refused by tool and route with the same AD-9 object, copy included; description; `from`/`to` optional, closed); `:573` (a number and `null` for `from` refused, not coerced; two bad fields in the route's order); `:417` (the copy and parsing live in `views/`) | FULL |
| 12.2 · AC-7 | P1 | `agent/` imports nothing from `http/api`; the views' not-found refusal and the stats range parsing live in `views/` | `test_agent_read.py:417` (no stats copy in `http/api.py`, all three in `views/`; the view routes contain no `raise`; importing `bookvie.agent` loads no `http.api`); `test_layers.py:32` (`agent` may import only `intents` and `views`) | FULL |

#### Story 12.3: Let an agent record my reading

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.3 · AC-1 | P0 | The ten write tools' input schemas equal their intent models' by alias; the tool list is 12.1's and 12.2's tools plus these ten | `test_agent_write.py:383` (each schema `== input_schema(model)`, closed, exact keys and required, `purpose` nullable, `bookId` a plain string; the list is exactly `AGENT_TOOL_NAMES`); `:637` (a real `bookvie` process advertises and commits a write tool) | FULL |
| 12.3 · AC-2 | P0 | One parametrized contract test: tool and `POST /api/intents/<verb>` on twin libraries give the same `library.json` and the same result or error. Cases: success, no-ops, `book_not_found`, `invalid_fields`, wrong type, unknown key, missing key, the seven state refusals, and a write fault as `couldnt_save` with `library.json` unchanged (TR8) | `test_agent_write.py:413` (`CASES` at `:222`: success for all ten; no-ops `set_up_next-noop-already-up-next`, `mark_side_read-noop-already-a-side-read`, `unmark_side_read-noop-not-a-side-read`; `book_not_found` per tool; `invalid_fields` with fields; `_malformed` (wrong type, unknown key, missing key) for every tool; `not_main_book`, `already_main`, `reading_already_finished`, `main_cannot_be_up_next`, `main_cannot_be_side_read`, `side_reads_full`, `card_note_not_found`; `fault-at-{write,fsync,replace}` for each tool, with `library.json` unchanged and no temp file); `:538` (no `arguments`, refused as the route refuses no intent part); `:558` (an unexpected handler failure is `couldnt_save`, as the route's 500); `:612` (a Book deleted after `find_book` is `book_not_found` for each tool); `:519` (resume at another page) | FULL |
| 12.3 · AC-3 | P1 | Each write tool's registered description equals the story's text | `test_agent_write.py:451` (the ten descriptions, as one dict, equal `DESCRIPTIONS`, which `agent_client.py:147` reads from epics.md's "Description:" lines) | FULL |
| 12.3 · AC-4 | P0 | `delete_book`, `delete_card_note`, `restore` and `set_spine_color` aren't listed; calling one fails as an unknown tool and changes nothing | `test_agent_write.py:464` (none is listed next to the ten; each call, with arguments its route would act on, is JSON-RPC `-32602` naming the tool; every file under the folder, including `covers/` and `local-state.json`, is byte-identical); `test_agent_mount.py:481` (unknown tools on an empty library) | FULL |

#### Story 12.4: Let an agent add and edit a Book

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.4 · AC-1 | P0 | `add_book`'s schema equals the `add-book` intent model's by alias (every key optional, plus `confirmDuplicate`), with no `coverUrl` yet; its description is the story's text | `test_agent_book_write.py:215` (schema `== input_schema(AddBookIntent)`, no required keys, 13 string form keys plus `confirmDuplicate`, the description, the tool list); `:480` (a real process advertises it and commits an add). After 12.5 the schema with `coverUrl` removed is still this one: `test_agent_cover_url.py:293` | FULL |
| 12.4 · AC-2 | P0 | `edit_book`'s schema is the `edit-book` model's, but every form key is required; only `removeCover` and `confirmDuplicate` are optional; its description is the story's text | `test_agent_book_write.py:240` (`required` is exactly the 13 form keys plus `bookId`; the rest equals `input_schema(EditBookIntent)`; the description); `:480` (the real process's `required`); `:456` (the description's find, get, edit flow changes only what was asked) | FULL |
| 12.4 · AC-3 | P0 | A contract test over both tools, as in 12.3. Cases: success with the new `bookId`; `invalid_fields` with every failing field; `duplicate_book` with `duplicates`, then success with `confirmDuplicate`; `pages_below_current_page`; `book_not_found` on edit; an unchanged edit that still commits; a filesystem fault as `couldnt_save` (TR8) | `test_agent_book_write.py:275` (`BOOK_CASES` at `:172`: every listed case, plus `pages_below_card_note`, null keys, `keeps-cover` and `remove-cover`, a back-filled Side read, and `fault-at-{write,fsync,replace}` through both tools, including an unchanged edit that faults); `:402` (no arguments); `:427` (an unexpected handler failure is `couldnt_save`); `:440` (a finish date on a Side read takes it off the Side reads) | FULL |
| 12.4 · AC-4 | P0 | `edit_book` with only `bookId` and `title`, on a Book with a subtitle, ISBN, tags and a spine color, is refused as invalid arguments naming the missing keys; the Book is unchanged | `test_agent_book_write.py:318` (`invalid_fields` naming exactly the 12 missing keys, never `intent`; `library.json` byte-identical; the subtitle, ISBN, tags and spine color are kept); `:343` (keys in schema order, `bookId` too when it's missing, with Pydantic's message); `:382` (×4: `{bookId}` alone, `{}`, every key but `spineColor`, and an extra `coverUrl`) | FULL |
| 12.4 · AC-5 | P0 | `get_book` and `GET /api/views/book` carry `editForm`: the panel's 13 fields as strings (authors joined by "; ", tags by ", ", the latest finish date, the user's own spine color or empty); `edit_book` with that `editForm` and `bookId` commits the Book unchanged | `test_agent_edit_form.py:42` (×16: every seeded Book, with and without a cover, round-trips unchanged); `:68` (the panel's prefill as strings, both surfaces); `:99` (several authors and tags, the latest of two finishes, a cover-colored Book's spine color empty); `test_edit_form_parity.py:47` (×3) and `frontend/src/lib/bookDetail.test.ts:92` (one case table, `editForm.cases.json`: server `editForm` == client `toPanelFields`, retro item 87) | FULL |

#### Story 12.5: Let an agent fetch a Book's cover from its address

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.5 · AC-1 | P0 | `add_book` and `edit_book` take an optional `coverUrl` string, included in the schema tests; both descriptions end with the coverUrl sentence | `test_agent_cover_url.py:293` (`coverUrl` is type `string`, no null, not required; the schemas without it are 12.4's; each equals `advertised_schema`; both descriptions are `DESCRIPTIONS`, read from epics.md plus the 12.5 addition); `test_cover_fetch.py:432` (×8: a non-string `coverUrl` is the malformed-intent refusal); `:447` (an empty `coverUrl` is refused, not treated as absent) | FULL |
| 12.5 · AC-2 | P0 | `edit_book` with `removeCover: true` and a `coverUrl` is refused as the route refuses `removeCover` with a file, before any download | `test_agent_cover_url.py:339` (equal to the route with a `cover` part: `invalid_fields` on `intent`; the resolver, connect seam and server saw nothing; library and covers unchanged); `test_cover_fetch.py:466` (refused first even with a bad `coverUrl`) | FULL |
| 12.5 · AC-3 | P0 | `edit_book` for a missing Book with a `coverUrl` is `book_not_found`, and nothing is downloaded | `test_agent_cover_url.py:365` (equal to the route: `book_not_found`; nothing resolved, connected or requested; nothing written); `test_cover_fetch.py:466` | FULL |
| 12.5 · AC-4 | P0 | Through local TLS fakes and a test resolver: a JPEG served as `binary/octet-stream` is stored as an uploaded JPEG would be. These are refused on `coverUrl` with nothing saved: `http`; a non-global address (also when one record of several is, or through mapped, 6to4, NAT64 or Teredo forms); a redirect to such an address or to `http`; a 4th redirect; a body that isn't JPEG, PNG or WebP; a download past 30 s. A body past 20 MB stops at the cap as `cover_too_large`. An undecodable image is reported on `coverUrl`. The connection goes to the checked address, with TLS verified for the hostname, `Accept-Encoding: identity`, and proxies ignored. A refused add adds nothing, and a refused edit changes nothing | `test_agent_cover_url.py:394`, parametrized over `COVER_CASES` (`:202`). **Stored:** `jpeg-as-octet-stream` (both tools), PNG served as text, WebP with no type, an IPv6 host, three redirects, exactly the cap, DNS rebinding. **Refused:** `http` (both tools); `redirect-to-http`. `BAD_HOSTS` (`:93`): loopback ×3, private 10/172/192/fd00, link-local v4 and v6, shared `100.64/10`, unspecified v4 and v6, metadata v4 and v6, four mixed record sets, mapped, 6to4, NAT64 and Teredo. `BAD_LITERALS` (`:127`). A redirect to each bad host or literal. `four-redirects` (the 4th never followed). HTML served as JPEG (both tools), GIF, an empty body, a 404, an unknown host. `past-the-deadline` (1 s deadline; the default is asserted to be 30). `past-the-cap` (`cover_too_large`, bytes sent ≤ 20 MiB plus socket slack). `undecodable-jpeg` on `coverUrl` (both tools). A certificate for another host, and an untrusted certificate. **Every case asserts:** connections only to checked public addresses on 443; a proxy trap on every proxy variable with 0 accepts; SNI equals Host; `accept-encoding: identity`; a refusal leaves library, covers and temp files unchanged. Also `test_cover_fetch.py`: `:137` (`Content-Length` past the cap), `:186`, `:264`, `:604` ×2 (deadline at lookup, trickle, stalled handshake and headers), `:213`, `:223` ×4, `:230` (redirect handling), `:276` (compressed answer), `:297` ×9 (multicast, broadcast, reserved, documentation and others), `:326` ×15 (`is_public` unwrapping), `:344` ×5 (not an https URL), `:384` (default TLS context checks the certificate and the hostname), `:489` (an undecodable cover on `coverUrl`, in form order), `:637`, `:647`, `:661` (address fallthrough; a certificate failure isn't retried) | FULL |
| 12.5 · AC-5 | P0 | No test in the whole suite opens a connection off the machine | `conftest.py:164` (`_on_the_machine`, autouse: refuses every in-process lookup and IPv4/IPv6 connect that isn't loopback); `test_agent_cover_url.py:474` (the guard refuses `192.0.2.1`, `2001:db8::1` and `getaddrinfo("example.com")`, and lets loopback through) | FULL (see the scope note) |

#### Story 12.6: Let an agent back up my library to disk

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.6 · AC-1 | P0 | `export_backup` on 2026-11-19 (fake clock) writes `bookvie-backup-2026-11-19.zip` into `~/bookvie-backups/`, `~/bookvie-backups-dev/` or `<data folder>-backups/` (default, `--dev`, other `--data-dir`; `HOME` a temp folder), creating the folder; returns `{path, size, createdAt}` with the absolute path; description equals the AC | `test_agent_backup.py:147` (×3 `default`, `dev`, `other`; a real `bookvie` process, so `cli.py`'s rule runs; the folder lists exactly the dated file; the answer is exactly `{path, size, createdAt}`, absolute path, on-disk size, `createdAt` = the fake clock; JSON text = structured; no other candidate folder created; listed after `edit_book`, `input_schema(NoArguments)`, description = `DESCRIPTIONS[export_backup]` read from epics.md); `:364` (×3: the default folder named explicitly, by symlink, by `..` still gets `~/bookvie-backups`); `:392` (×2: `--dev --data-dir <scratch>` gets the sibling, so the folder follows the data folder, not the mode); `:410` (created with its parents); `:424`, `:436` (the rule when no `backups_dir` is passed; another folder named `bookvie-data` gets its sibling); `:480` (one clock read across midnight); `:566` (an argument is refused and no file is written) | FULL |
| 12.6 · AC-2 | P0 | The backup file is accepted by the existing restore check and reproduces the library (AD-14 round trip) | `test_agent_backup.py:200` (`POST /api/intents/restore` with the backup's bytes is 200; the restored `library.json` and `covers/` equal the source's, cover included; entries equal `GET /api/export`'s by name and bytes); `:582` (no covers); `:603` (larger than one chunk, written whole, restores) | FULL |
| 12.6 · AC-3 | P0 | A second backup the same day replaces that day's file, no other file changes, no temp file left | `test_agent_backup.py:226` (backup, `update_page`, backup again: today's `library.json` is the changed one; the folder lists exactly yesterday's file, a user file and today's; the other two are byte-identical; the second answer's `path` and `size` match); `:447` (a failed folder flush after the rename is logged, and the backup succeeds) | FULL |
| 12.6 · AC-4 | P0 | After a backup, "Last export" in the `backup` and `home` views is its time; a failed backup leaves it unchanged | `test_agent_backup.py:256` (the backup view's `lastExportAt`, the home view, `get_home` and the answer's `createdAt` agree; the next day's `FaultyFs("replace")` backup is `couldnt_save` and both views keep the first time); `:498` (a failure recording the last export after the rename is logged, and the backup succeeds) | FULL |
| 12.6 · AC-5 | P0 | A read failure building the zip gives `couldnt_export`; a write failure in the backup folder gives `couldnt_save`; no partial file; `lastExportAt` unchanged | `test_agent_backup.py:301` (×6: `read-unreadable-cover` is `couldnt_export`; `write-create_temp`, `-write`, `-fsync`, `-close`, `-replace` are `couldnt_save`; kind, code and the route's message; the folder holds only yesterday's file; `local-state.json` is byte-identical; `library.json`, `covers/` and the data folder's temp files are unchanged); `:521` (×2: a backups folder that can't be created); `:633`, `:653` (an app with no backups folder refuses before it takes the lock); `:680` (×4: a failed cleanup doesn't replace the first fault); `:539` (the zip is built under the lock and written after the lock is released) | FULL |
| 12.6 · AC-6 | P0 | Every pytest test has `HOME` set to a temp folder, every Playwright server gets a temp `HOME`, and no real `~/bookvie-backups*` folder is created or changed | `backend/tests/conftest.py:78` (`_isolated_home`, autouse: every test's `HOME` is a fresh temp folder, and it asserts `Path("~").expanduser()` is that folder); `agent-backup.spec.ts:15` (a server given `home` backs up to `<home>/bookvie-backups/…`; a server started with no `home`, plain or `--dev`, gets its own temp `HOME` under the e2e root, never the account's; `stop()` removes it; the account's real `bookvie-backups*` folders, with their names, contents and mtimes, are equal before and after); `fixtures.ts:119` (`startServer` sets `HOME: serverHome` for every server). This trace's own before/after look at the real folders around `npm run check` is the run-level evidence | FULL |

#### Story 12.7: Summarize a book's notes through the agent tools

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.7 · AC-1 | P1 | The skill reads the Book through `find_book`, `get_book`, `get_card_notes` (or `get_home`), with no `curl`/HTTP to `/api/views/*` or `/api/intents/*`; keeps its start step (`/api/health`, start `bookvie`, then 12.1's reconnect); the .docx is unchanged in content and layout | `test_notes_summary_skill.py:72` (no `/api/views\|intents` anywhere in the folder; no script talks HTTP; every `curl` is the health check or the `get_app_info` probe; names the four tools; `/api/health`, `--no-browser`, `` `/mcp` ``, reconnect; `build_docx` and the output sections pinned by SHA-256; with `connect_mcp`, `get_book`'s Readings carry the finished Book's `purpose`); `:269` (every field the skill reads is in the tools' real answers, and it names only the read tools); `:313` (an in-progress Purpose from `currentReading`); `:340` (setup and reconnect lines match the README); `:233` (step 1 probes `get_app_info` after the health check and stops on an older bookvie: retro item 84); `:160`, `:167`, `:172`, `:179`, `:193`, `:200`, `:209`, `:220` (step 2's rules: Main book from `get_home`, one match, no match, a finished Book's purpose, no notes or a tool error, a missing prerequisite, title plus author, no tools after reconnect) | FULL (at the skill-text and tool-contract surfaces. The behavior in a real session is AC-3) |
| 12.7 · AC-2 | P1 | A title matching two editions: the skill asks which one and never picks | `test_notes_summary_skill.py:135` (SKILL.md: "never pick/choose/guess", "ask which one", edition, and the candidate list shows "title, subtitle, authors, edition and type"); `test_agent_read.py:149` (`find_book` returns both DDIA editions, each with its edition and type: Story 12.2's leaf) | FULL (instruction surface: the skill text is the story's whole deliverable. The real session where an agent asks is the open manual line `atdd-checklist-12-7…:86`, part of AC-3's run) |
| 12.7 · AC-3 | P1 | On a `--dev` server with a seeded Book that has a Purpose and Card notes, Oleg runs the skill in a real Claude Code session, the summary is produced, and the spec records the run | None. Manual. `spec-12-7-…md:167` lists it under "Manual checks" and `:189` says "AC-3 is open … Nothing in this run called the tools from a real agent session". No run is recorded. The static leaves above prove the instructions and the tool contract, not that a real session produces the document | NONE (manual, unrecorded; retro E12-S1, item 83, owner Oleg) |

#### Story 12.8: Add a book through the agent tools

| ID | Pri | Requirement | Tests | Coverage |
|---|---|---|---|---|
| 12.8 · AC-1 | P1 | The skill checks with `find_book`, adds with `add_book` and `coverUrl`, and verifies with `get_book`; it no longer downloads the cover; `add_book.py` and `check_catalog.py` are gone and the `deferred-work.md` entry is closed; no `curl`/HTTP to `/api/intents/*`; the `added-by-skill`, `not-finished` and `0-pages` rules and the terminal report are kept | `test_new_book_skill.py:81` (no `/api/views\|intents`; the old scripts are absent and nothing names them; no script talks HTTP; every `curl` is the health check or the probe; `find_book`, `add_book`, `coverUrl`, `get_book`; start step and reconnect; the three tag rules; every report item; the deferred entry has `resolved:`); `:220` (every field it reads is in the real answers, and it names only its three tools); `:463` (step 4's example and keys are what `add_book` accepts, through the real tool with a fake fetcher); `:314` (README setup and reconnect); `:346` (the evals allow the tools); `:374` (a same-book candidate stops before the lookup); `:415` (the older-bookvie probe, item 84); `:423`, `:430`, `:440` (another invalid field, `couldnt_save` with no retry loop, no cover found means adding without `coverUrl`, never falling back to the HTTP API) | FULL (skill-text and tool-contract surfaces) |
| 12.8 · AC-2 | P1 | On `duplicate_book`, the skill shows the matching Books and sends `confirmDuplicate: true` only on the user's say-so | `test_new_book_skill.py:145` (a `confirmDuplicate` line says "only if/when … user"; names `duplicate_book` and `duplicates`; no `--confirm-duplicate`); `:512` (a cover refusal can come with or ahead of other fields, as step 4 says); `test_agent_book_write.py` (the `duplicate_book` refusal with `duplicates`, then success with `confirmDuplicate: true`: Story 12.4's contract leaf) | FULL (instruction surface. The real-session duplicate is the open manual line `atdd-checklist-12-8…:92`) |
| 12.8 · AC-3 | P1 | On a cover download refused on `coverUrl`, the skill tells the user why and offers to add the Book without a cover | `test_new_book_skill.py:167` (an "offer … without a/the/its cover" line names `coverUrl` and "why"); `:297` (a real `add_book` with an `http://` `coverUrl` is refused on `coverUrl` and nothing is saved, so the skill's field test matches the tool); `:395` (a cover refusal with other fields, and a resend refused again); `:512` | FULL (instruction surface plus a real tool refusal. The real-session refusal is the open manual line `atdd-checklist-12-8…:93`) |
| 12.8 · AC-4 | P1 | On a `--dev` server, Oleg runs the skill in a real session on an amazon.com book and a leanpub.com book; both are added with covers, and the spec records the runs | None. Manual. `spec-12-8-…md:153` lists it under "Manual checks" and `:217` says "AC-4 is manual and open". No run is recorded, and `deferred-work.md`'s 12.5 real-download entry is still open. No static leaf proves a real CDN accepts bookvie's download: `test_new_book_skill.py:463` uses a fake fetcher, and the whole suite blocks off-machine connections (`conftest.py`, `OffTheMachineError`) | NONE (manual, unrecorded; retro E12-S1, item 83, owner Oleg) |

**12.5 · AC-5 scope.** The autouse guard (`conftest.py:164`) covers tests running inside the pytest process. The `bookvie` subprocesses and Playwright servers are outside it, and they reach no network because no subprocess or e2e test sends a `coverUrl`. The 12.5 review accepted that scope (`spec-12-5:153`), and UDP `sendto`, `getnameinfo` and the `_socket` module were rejected as low (`spec-12-5:128`). FULL on the AC as the review read it.

### Error codes

TR7 requires an API test for every error code.

- `ErrorCode` (`backend/bookvie/intents/contract.py`) is unchanged. `git diff 56a7f37^..HEAD -- backend/bookvie/intents/contract.py` is empty.
- Epic 12 sends existing codes down new paths, each with a test:
  - every intent's refusals through its tool: the 12.3 and 12.4 contract cases, against the route's own answer.
  - `book_not_found` from the read tools: `test_agent_read.py:209`, `:255`.
  - `invalid_fields` on `coverUrl` and `cover_too_large` from the downloader: `test_agent_cover_url.py:394` (`COVER_CASES`, `past-the-cap`). The route's `cover_too_large` test is `test_contract.py:298`.
  - `couldnt_save` through the tools: the `fault-at-*` cases in 12.3 and 12.4, and `test_agent_read.py:621`, `:646`.
  - `couldnt_export` from `export_backup`: `test_agent_backup.py:301`.
- The codes were confirmed in the Epic 1 to 11 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to Epic 12. R-04 (the Host/Origin guard, FND-API-004) now covers `/mcp` too: `test_agent_mount.py:277`, `:663`. Epic 12 closes the plan's seven P0 risks (table above). It leaves one risk only a manual run can close: a real CDN refusing bookvie's cover download (`deferred-work.md:1333`, 12.8 AC-4).

### Coverage heuristics

- **Endpoints.** Epic 12 added one route, `/mcp`, and 20 tools behind it, plus `editForm` on `GET /api/views/book`. Each tool has calls in its story's tests; `/mcp` has its guard, path, body-cap and lifespan tests (12.1 AC-2 to AC-4); `editForm` has `test_agent_edit_form.py` and `test_book_view.py`. Gaps: 0.
- **Auth/authz negative paths.** bookvie has no login. The AD-16 guard's negative paths on `/mcp` are pinned (12.1 AC-3), and so is the absence of every destructive tool (12.3 AC-4). Status: present.
- **Error paths.** Every refusal through a tool equals the route's; filesystem faults at write give `couldnt_save`; the downloader's refusals, the cap and the deadline; the backup's read and write faults; a read tool's unexpected failure. Status: present.
- **UI journeys and states.** Not applicable (formal oracle; Epic 12 adds no screen).

### Gap analysis

| Category | Count | Items |
|---|---|---|
| Critical (P0) | 0 | |
| High (P1) | 2 | 12.7 AC-3, 12.8 AC-4: manual runs not recorded (retro E12-S1, action 83, owner Oleg) |
| Medium (P2) | 0 | |
| Low (P3) | 0 | |
| Partial | 0 | |
| Unit-only | 0 | |

---

## ATDD checklists

The checklists' open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-12-1-mount-the-mcp-server.md` | 0 | 0 | |
| `atdd-checklist-12-2-let-an-agent-read-my-library.md` | 0 | 0 | |
| `atdd-checklist-12-3-let-an-agent-record-my-reading.md` | 0 | 0 | |
| `atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md` | 0 | 0 | |
| `atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md` | 0 | 0 | |
| `atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md` | 0 | 0 | |
| `atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md` | 2 | 2 | `:86` (two editions: the agent asks), `:87` (a finished Book's summary lines), both in 12.7 AC-3's real session |
| `atdd-checklist-12-8-add-a-book-through-the-agent-tools.md` | 3 | 3 | `:92` (a duplicate: the agent shows the matches and asks), `:93` (a refused cover address: the message and the offer), `:94` (the Amazon and Leanpub CDNs accept bookvie's download), all in 12.8 AC-4's real session |

The five open lines are gaps, listed under 12.7 AC-3 and 12.8 AC-4. They ask for the behavior in a real agent session, which no test in the suite runs, so the trace neither ticks nor retires them. They close with Oleg's runs (retro action 83).

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro, a story spec or `deferred-work.md`.

- **A stale "AC-8 is open"** at `spec-12-1:200`, though `:100` records the run. Retro action 83 corrects it.
- **The deferred Epic 12 lows** (retro "Deferred, no item"): an agent edit overwriting a browser edit (E12-B1), the `intent` field on `coverUrl` + `removeCover` (E12-B3), the smaller test copies (E12-D3), the e2e seeding call with the real `HOME` (E12-S6). All low, recorded for the next story that touches `edit_book` or the e2e fixtures.
- **`agent/tools.py` size** (retro E12-A2, watch).
- **Flaky specs.** None in this trace's run (800 passed, none retried).

---

## Next actions

1. **HIGH:** retro action 83. Oleg runs `bookvie-notes-summary` and `bookvie-new-book` (one amazon.com and one leanpub.com book) against `bookvie --dev` in a real Claude Code session, and records the runs in the 12.7 and 12.8 specs and the five checklist lines. Then re-run this trace's gate: 12.7 AC-3 and 12.8 AC-4 become FULL and the gate PASS, if the runs pass. A failed run becomes a fix first.
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 12 suites. `test_agent_write.py`, `test_agent_mount.py` and `test_cover_fetch.py` are the largest.
3. Sprint item `epic-12-retro-item-81-trace-and-gate-epic-12` is marked done with this trace. The gate it records is CONCERNS until action 83 lands.

---

## Gate decision summary

```text
🚨 GATE DECISION: CONCERNS

📊 Coverage Analysis:
- P0 Coverage: 100% (26/26) (Required: 100%) → MET
- P1 Coverage: 87.5% (14/16) (TR7 target: 95%, PASS line 90%, minimum: 80%) → PARTIAL
- Overall Coverage: 95.3% (41/43) (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100% and overall coverage is 95.3% (minimum: 80%), but P1 coverage is 87.5% (TR7 target: 95%). The two P1 gaps are the manual runs Oleg hasn't made: 12.7 AC-3 (the notes skill in a real session against --dev) and 12.8 AC-4 (the new-book skill on an amazon.com and a leanpub.com book with covers). The plan's seven P0 risks are green, every registered description equals its AC text, Epic 12 added no error code, no existing test's assertions changed, check:api is clean, the coverage gates hold, and ~/bookvie-data and the real backup folders were untouched.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)
⚠️ High Gaps: 2 (12.7 AC-3, 12.8 AC-4; retro action 83)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-12-traceability-matrix.md

⚠️ GATE: CONCERNS - Epic 12 meets every TR7 clause but P1; record retro action 83's two runs to reach PASS
```
