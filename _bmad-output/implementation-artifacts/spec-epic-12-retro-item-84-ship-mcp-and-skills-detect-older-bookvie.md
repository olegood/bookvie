---
title: 'Ship the MCP server, and make the skills recognize an older bookvie'
type: 'chore'
created: '2026-11-20'
status: 'done'
route: 'dispatch'
baseline_commit: 'e538f9d1a4d653a48523d96c0e0b905ab02400ae'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-retro-2026-11-20.md'
  - '{project-root}/docs/release.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 12 retro item 84 (E12-S2, E12-B2; sprint item `epic-12-retro-item-84-ship-mcp-and-skills-detect-older-bookvie`), due before Epic 13. Oleg's installed bookvie (`~/.local/bin/bookvie`, 1.2.0) answers `/api/health` with 200 but `POST /mcp` with 405, and the Epic 12 build also reports 1.2.0, so nothing tells them apart. Both skills' step 1 checks only `/api/health` and then gives the reconnect and `claude mcp add` advice, which is wrong when the entry is configured and the server is simply too old. `bookvie-new-book/SKILL.md:143` also misstates the server's order: it says the cover is downloaded "before it checks the other fields and the catalog", but the missing-key check and the field parse run first (`agent/tools.py:430-432`), and only the domain checks and the duplicate check come after the download (`:438-440`).

**Approach:** in both skills' step 1, after the health check, call `get_app_info` over `/mcp` with one `curl` POST. A 200 means an MCP build; anything else (405 from 1.2.0) means "an older bookvie is running: stop it and start the new one", and the skill stops there, without the reconnect or `claude mcp add` advice. Fix line 143's order. Pin both with the skill tests. Record Epic 12 and this change under `[Unreleased]` in `CHANGELOG.md`, so a release after 1.2.0 has its notes and `get_app_info` reports the new version.

## Boundaries & Constraints

**Always:** the probe is a read (`get_app_info`), sent to the port of the entry being used (8765 `bookvie`, 8766 `bookvie-dev`). The skills' rule "never fall back to bookvie's HTTP API" stays: the probe is the MCP endpoint, never `/api/intents/*` or `/api/books`. The probe runs only after `/api/health` answers.

**Never:** the skills don't stop or restart a running bookvie themselves. No change to the server's `/mcp` behavior. No release, push, tag or reinstall without Oleg's say-so.

**Decision (Oleg, 2026-11-20): the new version is 2.0.0.** It ships through the project's release, `scripts/release.sh 2.0.0` (`docs/release.md`), run after this build's commit as its own step and only on Oleg's go: it moves `[Unreleased]` to `[2.0.0]`, sets the version in all six files, tags `v2.0.0`, and asks before pushing master and creating the GitHub Release. Then the wheel is reinstalled with `uv tool install --reinstall` and bookvie on 8765 restarted. This build doesn't edit the version files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| MCP build | `/api/health` 200, probe 200 | Skill goes on to the tools (reconnect step still applies if the session lacks them) | N/A |
| Older bookvie | `/api/health` 200, probe 405 (or 404, or no answer) | Skill says "an older bookvie is running: stop it and start the new one" and stops | No reconnect, no `claude mcp add` line |
| Not running | `/api/health` fails | Skill starts bookvie as now, then runs the probe | As today |

</frozen-after-approval>

## Code Map

- `.claude/skills/bookvie-new-book/SKILL.md:35-53` -- step 1 (health check, start, reconnect, setup line). Add the probe after the health check; its failure path goes before the reconnect paragraph.
- `.claude/skills/bookvie-new-book/SKILL.md:143` -- the order sentence to correct: field parse, then download, then domain checks and the duplicate check. Keep the existing phrases "One refusal can name `coverUrl` and other fields together", "a resend without `coverUrl` can come back as `invalid_fields`" and "or as `duplicate_book`" (pinned at `test_new_book_skill.py:392-396`).
- `.claude/skills/bookvie-notes-summary/SKILL.md:25-35` -- step 1, same change.
- `backend/tests/test_new_book_skill.py:98-104`, `test_notes_summary_skill.py:82-88` -- "every curl is the health check": widen to the health check or the `/mcp` `get_app_info` probe, and still ban any other curl. `:416` (never the HTTP API) stays.
- `backend/tests/test_new_book_skill.py:488` -- already pins the real order against the server (http:// refusal first, then pages, then duplicate); reuse it as the evidence for line 143.
- `backend/bookvie/agent/tools.py:424-440` -- the order, read-only reference.
- `backend/bookvie/http/app.py:166-186` -- `_McpRoute`; a stateless JSON POST of `tools/call get_app_info` answers 200 with the version (probed on a `--dev` server from this checkout: `{"version":"1.2.0","mode":"dev",...}`); the installed 1.2.0 on 8765 answers 405 `{"detail":"Method Not Allowed"}`. Don't use GET `/mcp` as the probe: on the MCP build it opens a stream and hangs.
- `CHANGELOG.md:7-9` -- `[Unreleased]` holds "Nothing yet."; `scripts/changelog.sh draft` lists Epic 12's feat/fix commits and the back-to-top button since `v1.2.0`.
- `docs/release.md`, `scripts/release.sh` -- the release that sets the version (run after this commit; read-only here).

## Tasks & Acceptance

**Execution:**
- [x] `.claude/skills/bookvie-new-book/SKILL.md` -- add the probe to step 1 with its failure message and stop; correct line 143's order -- E12-S2, E12-B2
- [x] `.claude/skills/bookvie-notes-summary/SKILL.md` -- add the same probe and failure path to step 1 -- E12-S2
- [x] `backend/tests/test_new_book_skill.py`, `backend/tests/test_notes_summary_skill.py` -- pin: the probe's curl (POST to the entry's `/mcp`, `get_app_info`) for both ports, that it comes after the health check and before the reconnect paragraph, the "older bookvie" message and its stop, and (new-book) the corrected order sentence; widen the curl-only-health assertions -- the item's "skill tests pin the new step"
- [x] `CHANGELOG.md` -- `[Unreleased]` entries for Epic 12 (agent tools at `/mcp`, the two skills on them, `export_backup`, cover by address), the back-to-top button, and the skills' older-bookvie message -- the next release's notes

**Acceptance Criteria:**
- Given bookvie 1.2.0 on 8765, when the probe from the new-book skill's step 1 runs verbatim, then it prints a non-200 code (405), and the step tells the skill to say the older-bookvie message and stop.
- Given a `--dev` bookvie from this checkout on 8766, when the dev variant of the probe runs verbatim, then it prints 200.
- Given `npm run check`, when it runs, then it passes.

## Implementation Notes

- **Probe:** both skills' step 1 has one `curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST …/mcp` line per port (8765, 8766), a sessionless `tools/call get_app_info`. `200` goes on; `405`, `404` or `000` gives "An older bookvie is running: stop it and start the new one." and a stop; if the skill started bookvie itself in this step, it says instead to update the installed `bookvie` with `npm run install:local`; any other code is reported and the skill stops. No reconnect or `claude mcp add` advice in those cases, and the skill never stops or restarts bookvie.
- **Order sentence (new-book step 4):** shape check, then the download, then the value checks and the catalog; `duplicate_book` comes after the download, and the `confirmDuplicate` resend downloads again.
- **Tests:** the shared probe check (`check_the_older_bookvie_probe`, `curl_lines`, `is_health_or_probe`, `PROBE_PORTS`, `OLDER_BOOKVIE`, `INSTALLED_IS_OLDER`) lives in `backend/tests/helpers.py`; it pins the order health → probe → older message → reconnect, the wording, and sends each probe's headers and body to this checkout's `/mcp` (200 with `version` and `mode`). The curl-only-health assertions accept the probe and nothing else; the tool-name checks allow `get_app_info`.
- **CHANGELOG:** `[Unreleased]` holds Epic 12, the back to top button, the skills' change, and an upgrade line (restart, `claude mcp add` once).
- **Verified (2026-11-20):** the probe lines copied from each SKILL.md print `405` against the installed 1.2.0 on 8765, and `200` against a `--dev` server from this checkout; the two skill test files pass (29); `npm run check` exits 0.
- **Still open for item 84:** the release and reinstall (frozen decision), so the sprint item stays `in-progress` until `scripts/release.sh 2.0.0` and the reinstall are done.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | spine-check | Skills' step 1 is a hand-written MCP client relying on the stateless mount; AD-21 doesn't record it | low | Code matches the mount; the spine is silent | defer (spine drift, AD-21) |
| 2 | edge-case, blind | Any non-200 (500, 400, a timeout) is called "older bookvie" | low | Frozen matrix names 405/404/no answer only; a 500 from a current build would get the wrong advice | patch: only 405/404/000 are older; other codes are reported and stop |
| 3 | blind | The skill may start the installed (older) `bookvie` itself, then tell the user to "start the new one" | low | `~/.local/bin/bookvie` is 1.2.0 until the release; step 1 starts it from the PATH | patch: one sentence pointing to `npm run install:local` |
| 4 | edge-case | `probes` dict keyed by line hides a duplicated probe line | low | `{line: port}` collapses identical lines | patch: list of pairs |
| 5 | edge-case, blind | Test claims to run the probe "as written" but sends only headers and body | low | `client.http.post(client.path, ...)`; `-o`, `-m` unchecked (method and path are checked by `_probe_port`'s regex) | patch: reword, assert `-o`/`-m` |
| 6 | blind | New shared helpers live in a test module and are imported from there | low | `tests/helpers.py` docstring: "import from here, never from another test module"; item 87 just made that the rule | patch: move the new names to `tests/helpers.py` |
| 7 | blind | CHANGELOG gives a 1.2.0 user no upgrade step for the agent tools | low | `[Unreleased]` becomes the 2.0.0 release notes | patch: one Changed bullet |
| 8 | edge-case, blind | A 200 is trusted without reading the body | low | Health already answered as bookvie; another app answering POST /mcp with 200 on 8765 is unlikely, and a body check adds parsing to the skill | reject |
| 9 | blind | No automated test of the non-200 path | low | Needs a fake pre-MCP app; the 405 was checked live against 1.2.0 | reject |
| 10 | blind | Probe text copied in both skills with no parity test | false | `check_the_older_bookvie_probe` pins the same lines and phrases in both | reject |
| 11 | blind | `get_app_info` allowed anywhere in the skills | low | Adding a location guard for an unlikely misuse | reject |
| 12 | blind | Spec has no slot for manual results; stale Code Map lines | — | Fix edits this build's spec | reject |
| 13 | blind | Order sentence doesn't say what to do about the second download or name the shape refusal | low | The sentence states the behavior; the refusal handling bullets above cover the codes | reject |
| 14 | verification-gap | No gaps found | — | — | — |
| 15 | blind | Pre-existing `HTTP_CLIENT`/`_skill_files` import from a test module | low | Present before this change (`e538f9d`) | reject (not caused here) |

## Verification

**Commands:**
- `cd backend && uv run pytest tests/test_new_book_skill.py tests/test_notes_summary_skill.py` -- expected: pass
- `npm run check` -- expected: pass
- the probe lines copied from each SKILL.md against 8765 (expect 405) and a `--dev` server (expect 200)
