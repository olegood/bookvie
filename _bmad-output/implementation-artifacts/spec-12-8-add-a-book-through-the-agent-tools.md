---
title: 'Story 12.8: Add a book through the agent tools'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '3ece967269c7183593448289efd525dc1f30ca67'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-8-add-a-book-through-the-agent-tools.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-8), reconciled before the next epic: AD-8 still says the cataloging skill's scripts build the add-book body, read the catalog and book views and the AD-9 envelope by key, and calls its duplicate pre-check (check_catalog.py) an open known gap; Story 12.8 deletes both scripts, moves the skill onto find_book, add_book and get_book, and resolves that gap.
    evidence: |-
      Deleted .claude/skills/bookvie-new-book/scripts/add_book.py and check_catalog.py; deferred-work.md copied-rule entry now resolved (Spine Check, build-auto review of Story 12.8).
    location: >-
      ARCHITECTURE-SPINE.md AD-8
    severity: low
  - summary: >-
      Spine drift (Design Paradigm, Structural Seed), reconciled before the next epic: the Paradigm says the skill calls the HTTP API directly (skill 2.0.0) and calls http/ like the browser, and the Seed's AG node reads "cataloging skill (HTTP client of the intent API)"; skill 3.0.0 is an MCP client of agent/ (AD-21) and never calls the HTTP API for a book.
    evidence: |-
      .claude/skills/bookvie-new-book/SKILL.md Rules and step 1 (Spine Check, build-auto review of Story 12.8).
    location: >-
      ARCHITECTURE-SPINE.md Design Paradigm, Structural Seed
    severity: low
  - summary: >-
      Spine drift (Deferred "Skills on the agent tools"), reconciled before the next epic: the bullet still leaves the reconnect step and the bookvie/bookvie-dev tool names open; both skills now carry them (12.7 and 12.8). Folds into the open 12.6 and 12.7 drift entries.
    evidence: |-
      .claude/skills/bookvie-new-book/SKILL.md step 1 (Spine Check, build-auto review of Story 12.8).
    location: >-
      ARCHITECTURE-SPINE.md Deferred
    severity: low
  - summary: >-
      The new-book evals allow only the production entry's tools (mcp__bookvie__*), so an eval run adds books to the real library on port 8765, as the HTTP evals did before; pointing them at bookvie-dev needs the dev entry's tool names and a prompt that asks for the dev library.
    evidence: |-
      .claude/skills/bookvie-new-book/evals/*/prompt.md allowed_tools; pre-existing (the 2.0.0 evals posted to 8765) (Blind Hunter, Edge Case Hunter, Intent Alignment).
    location: >-
      .claude/skills/bookvie-new-book/evals/*/prompt.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** `bookvie-new-book` adds a Book over HTTP: `check_catalog.py` reads `/api/views/catalog` and `/api/views/book` with its own copy of the server's duplicate rule, the skill downloads the cover with `curl`, and `add_book.py` posts a multipart `POST /api/intents/add-book`. Epic 12 moves the skills onto the agent tools (FR-28, FR-3, D15).

**Approach:** Delete `add_book.py` and `check_catalog.py`, and rewrite SKILL.md (3.0.0) so the agent checks with `find_book`, adds with `add_book` passing the cover's https address as `coverUrl` (bookvie downloads it), and verifies with `get_book`. Server refusals drive the flow: `duplicate_book` → show `duplicates`, ask; a refusal on `coverUrl` → say why, offer to add without a cover. `lookup.mjs`, the field rules and the terminal report stay.

## Boundaries & Constraints

**Always:** Keep step 1 (health check, `bookvie --no-browser` in the background, poll) and add Story 12.1's reconnect step in the README's wording, plus the `--dev`/`bookvie-dev` variant, as the notes skill has it. Keep the `added-by-skill` tag, the field rules (title split at `:`, semicolon authors, edition, type, ISBN) and step 5 "Report in the terminal" with its six items. Write the `not-finished` rule (tag a Book its source says is under 100% complete, e.g. Leanpub's "NN% complete") and the `0-pages` rule (no page count on any source → Pages `1` and tag `0-pages`, don't ask) into SKILL.md (Oleg's ATDD decision, 2026-11-20). Every `add_book` value is a string; `type` lower case; empty values left out. `confirmDuplicate: true` only on the user's say-so.

**Never:** No `curl`/`wget`/HTTP call to `/api/views/*` or `/api/intents/*`, no cover download by the skill, no HTTP client in a script, no Playwright MCP tool. No new tool and no change to a tool description or to backend code. No `edit_book` or any other write tool than `add_book`. No README edits beyond the AI skills line describing this skill.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New book | not in catalog, cover found | `find_book` (title, then ISBN) empty → `add_book` with `coverUrl` → `get_book` shows title, tags, `hasCover: true` → report | — |
| Already there | `find_book` candidate is the same book | stop before lookup; show it; ask whether to add another copy | add only if user says yes, with `confirmDuplicate: true` |
| Server duplicate | `add_book` → `duplicate_book` | show each of `duplicates` (title, authors, ISBN); ask | resend with `confirmDuplicate: true` only if user says so |
| Cover refused | `add_book` → `invalid_fields` on `coverUrl` | nothing saved; tell the user the message (why); offer to add without a cover | on yes, resend without `coverUrl` |
| Other invalid field | `invalid_fields` not on `coverUrl` | fix from sources and resend; ask if info is missing | — |
| Can't save | `couldnt_save` | report it; no retry loop | — |
| No cover found | no image on any source | add without `coverUrl`; say so in the report | — |
| Tools missing | bookvie started after the session | ask the user to reconnect `/mcp`; if that fails give the README setup line and stop | never fall back to HTTP |

</intent-contract>

## Code Map

- `.claude/skills/bookvie-new-book/SKILL.md` -- rewrite: description, Rules, script table (only `lookup.mjs`), steps 1–4; step 5 kept (only "from `book`" → "from `get_book`"); version 3.0.0.
- `.claude/skills/bookvie-new-book/scripts/add_book.py`, `scripts/check_catalog.py` -- delete. `scripts/lookup.mjs` stays (Playwright, no HTTP client).
- `.claude/skills/bookvie-new-book/evals/*/graders/*` -- 06/07 ("check_catalog.py ran before add_book.py…"), splits 04 (cover path in book.json) and 05 (`verified`) name the old scripts; rewrite onto the tools.
- `.claude/skills/bookvie-new-book/evals/*/prompt.md` -- `allowed_tools` frontmatter: add `mcp__bookvie__find_book`, `mcp__bookvie__add_book`, `mcp__bookvie__get_book`.
- `.claude/skills/bookvie-notes-summary/SKILL.md:25-35` -- step 1 wording to reuse (health, `--dev`, reconnect, setup line, never fall back).
- `backend/bookvie/agent/tools.py:287-310,396-400,604-620` -- `find_book` (`books[]`: `id,title,subtitle,authors,edition,type,role`; whole query vs one field), `get_book`, `add_book` (string fields, lower-case type, `confirmDuplicate`, `coverUrl`; answer `ids.bookId`). Read-only.
- `backend/bookvie/intents/contract.py:65-79` -- error body: `code`, `message`, `fields[]{field,message}`, `duplicates[]{title,authors,isbn}`. Read-only.
- `backend/bookvie/intents/cover_fetch.py:63-74,106` -- the `coverUrl` messages (https only, private address, not JPEG/PNG/WebP…). Read-only.
- `README.md:105-112` (setup and reconnect wording), `README.md:118` (AI skills line: "saves the book through the add-book API" → the `add_book` tool).
- `backend/tests/test_new_book_skill.py` -- the three red leaves; add follow-ups. Reuse `_seeded_tools`/`connect_mcp` pattern and the README check from `test_notes_summary_skill.py:239-350`.
- `_bmad-output/implementation-artifacts/deferred-work.md:836` -- the copied-rule entry: add `resolved:`.
- Deferred-work intake:
  - `deferred-work.md:836` (the skill's `check_catalog.py` re-implements `domain/duplicates`' rule) -- task below; AC-1 closes it.
  - `deferred-work.md:1312` (first real cover download, Story 12.5) -- AC-4 task: Oleg's real `--dev` run records it; resolved only once recorded, not by the build.
  - `deferred-work.md:1330`, `:1346` (Spine drift, AD-8, skills on the agent tools) -- not in this story: spine drift, reconciled before the next epic.

## Tasks & Acceptance

**Execution:**
- `.claude/skills/bookvie-new-book/scripts/add_book.py`, `scripts/check_catalog.py` -- delete -- AC-1.
- `.claude/skills/bookvie-new-book/SKILL.md` -- rewrite onto `find_book`/`add_book`/`get_book` per the matrix, with the two rules -- AC-1..3.
- `.claude/skills/bookvie-new-book/evals/**` -- graders and `allowed_tools` onto the tools -- AC-1.
- `README.md:118` -- the skill saves the book with the `add_book` agent tool -- keep docs true.
- `deferred-work.md:836` -- `resolved: Story 12.8, …` -- AC-1.
- `backend/tests/test_new_book_skill.py` -- unskip the three leaves; add: SKILL.md's backticked tool names are registered and are only `find_book`, `add_book`, `get_book`; the fields it reads (`ids.bookId`, `hasCover`, `tags`, `duplicates`) resolve in real tool answers on a seeded library; setup/reconnect lines match the README; graders name the tools and `allowed_tools` includes them; README's skills line no longer says "add-book API"; one leaf per matrix row with a rule in text (stop before lookup on a same-book candidate, other invalid field, `couldnt_save`, no cover found, never fall back to HTTP).

**Acceptance Criteria:**
- Given `.claude/skills/bookvie-new-book/`, when this story lands, then it checks with `find_book`, adds with `add_book` and `coverUrl`, verifies with `get_book`, has no `add_book.py`/`check_catalog.py`, downloads no cover, makes no HTTP call to `/api/views/*` or `/api/intents/*`, and keeps `added-by-skill`, the `not-finished` and `0-pages` rules and the terminal report; the copied-rule `deferred-work.md` entry is resolved.
- Given `add_book` refuses with `duplicate_book`, when the skill gets it, then it shows the `duplicates` and sends `confirmDuplicate: true` only if the user says so.
- Given a refusal on `coverUrl`, when the skill gets it, then it tells the user why and offers to add the Book without a cover.
- Given a `--dev` server, when Oleg runs the skill in a real Claude Code session on an amazon.com book and a leanpub.com book, then both are added with covers and this spec records the runs (manual; open after the build).

### Review Findings

Code review, 2026-11-20 (`bmad-code-review`, new session; diff `3ece967..HEAD`, the build commit; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check). 30 findings: 6 patch entries (9 findings), 1 new spine drift deferral, 3 spine drift items already deferred by the build, 17 rejected. Verification Gap found no gaps.

- [x] [Review][Patch] Step 4's refusal branches assume one refusal at a time. A failed download on `coverUrl` is raised before the other fields are validated and before the duplicate check (`agent/tools.py` `_book_tool.run`: `fetch` runs before `call`), so a resend without the cover can still come back as `invalid_fields` on another field or as `duplicate_book`. An image that downloads but doesn't decode is a `RefusedCover` merged by `valid_fields` with every other field failure into one `invalid_fields` (`intents/add_book.py:51`, `book_form.py` `valid_fields`), so one refusal can name `coverUrl` and other fields together. This reverses the build review's rejection "`coverUrl` and another field refused together" (Blind Hunter + Edge Case Hunter ×3, low). Fixed: step 4 says one refusal can name `coverUrl` and other fields together (fix those, ask about the cover once) and a resend without `coverUrl` can still come back as `invalid_fields` or `duplicate_book`; leaf `test_a_cover_refusal_can_come_with_other_fields_and_a_resend_can_be_refused_again` [.claude/skills/bookvie-new-book/SKILL.md:139]
- [x] [Review][Patch] Step 2's pre-lookup check never uses an ISBN the user gave: it queries only the title, so its "a candidate the ISBN query found" clause can't fire before the lookup (Blind Hunter, low). Fixed: step 2 also queries the ISBN when the user gave one [.claude/skills/bookvie-new-book/SKILL.md:57]
- [x] [Review][Patch] Step 2 queries "the title as the user gave it": a prompt such as "DDIA 2nd edition paperback" or a title with its subtitle is not a substring of any stored field, so `find_book` returns nothing and the stop-before-lookup check is skipped (Edge Case Hunter, low). Fixed: step 2 queries the title without an edition, a format or anything after a `:` [.claude/skills/bookvie-new-book/SKILL.md:57]
- [x] [Review][Patch] The same-book rule compares `type` only "when the user named a format"; in the re-check after step 3 the Type is known, so a hardcover or ebook candidate is still called the same book as the paperback being added and the skill stops and asks needlessly (Edge Case Hunter, low). Fixed: `type` is compared when the format is known (the user named it, or step 3 found it) [.claude/skills/bookvie-new-book/SKILL.md:61]
- [x] [Review][Patch] The rules the build review patched into step 2 have no leaf: same `edition` and `type`, skip the check for a URL-only prompt, "show each of them", "Don't ask again" — a later edit could drop any of them with every test green (Blind Hunter, low). Fixed: `test_a_same_book_candidate_stops_the_skill_before_the_lookup_and_asks` pins all four, and the patches above [backend/tests/test_new_book_skill.py:358]
- [x] [Review][Patch] The field-names leaf checks `get_book`'s keys for eight of step 5's report columns but not Author(s) and Tags (Blind Hunter, low). Fixed: the loop checks `authors` and `tags` too [backend/tests/test_new_book_skill.py:253]
- [x] [Review][Defer] Spine drift (AD-3, AD-8 known gap), reconciled before the next epic: the copied-rule entry's `resolved:` line says the skill relies only on the server's duplicate rule, but step 2 keeps an agent-side same-book judgement (ISBN hit, or same title, a shared author, same edition and type) that differs from `domain/duplicates`. It only decides what the skill asks; `add_book`'s `duplicate_book` stays the guard. AD-8's known-gap note should be restated for that judgement rather than removed [.claude/skills/bookvie-new-book/SKILL.md:61] — deferred: spine drift, reconciled before the next epic.
- [x] [Review][Defer] Spine drift (AD-8; Design Paradigm and Structural Seed; Deferred "Skills on the agent tools") [.claude/skills/bookvie-new-book/SKILL.md] — deferred: already in `deferred-work.md` from the build's review; no new entry.

**Rejected:**
- Blind Hunter: "go back to step 1" after a timeout can add the book twice — low; an MCP call outlasting a 30 s download is unlikely, the resend would most often get `duplicate_book` and ask, and the fix adds a branch.
- Blind Hunter: `cover_too_large` has no test against the real tool — low; `test_contract.py` covers the 413 `cover_too_large` body and Story 12.5 owns the tool's cover path; the skill only names the code.
- Blind Hunter: AVIF/GIF covers lose 2.0.0's conversion with no "try another source" step — low; rejected by the build review on the same grounds (the agent can already pick another address), and AC-4's runs will show whether it bites.
- Blind Hunter: no eval exercises duplicates, cover refusal, the tag rules or a Leanpub book — low; new evals are more than a direct fix, and AC-4's real runs are the behavioral evidence.
- Blind Hunter: the README AI skills preamble doesn't mention the MCP setup — false as a defect: the "Agent tools" section just above gives the setup, the skills are still served from `127.0.0.1:8765`, and stories don't edit the README beyond the skill's line.
- Blind Hunter: the Auto Run Result's patch counts don't match the triage log — the fix edits the spec under review.
- Blind Hunter: the I/O matrix lacks rows for `cover_too_large`, URL-only and the tag rules — the fix edits the spec under review.
- Blind Hunter: comparing the stored title with "what you sent" can give false mismatches — false: the server only trims (`parse_book_fields`), which an agent comparing text reads as the same title; nothing folds quotes.
- Blind Hunter: "Call no other bookvie tool that changes the library" still allows read tools — false: the spec's Never bans only other write tools ("No `edit_book` or any other write tool than `add_book`").
- Edge Case Hunter: the no-cover resend may drop `confirmDuplicate` — false: "the same values again" means the call just refused, which carried it.
- Edge Case Hunter / Acceptance Auditor: a step-2 "yes" sends `confirmDuplicate: true`, so a different server match is never shown — low; the user already chose to add another copy of that book, and the alternative re-asks, against "Don't ask again".
- Acceptance Auditor: AC-4's real runs aren't recorded — not a code defect: AC-4 is manual by the story's text and stays open for Oleg, as Story 12.7's AC-3 did at `done`.
- Acceptance Auditor: the same-book rule is narrower than the Design Note (same edition and type) — the build review chose it deliberately (different editions have different ISBNs, which the server never matches); aligning the note edits the spec under review.
- Acceptance Auditor: two matrix rows share one leaf — low; cosmetic, both rows are pinned.
- Acceptance Auditor: ATDD item "the `coverUrl` messages SKILL.md quotes" is unaddressed — false: SKILL.md quotes no server message, so the item's condition doesn't apply.
- Acceptance Auditor: evals can't reach `bookvie-dev` — already deferred by the build.

**Full check after the patches** (2026-11-20, this review session, after the last patch): `npm run check` exit 0 — pytest 2161 passed, unit 388 passed, e2e 800 passed, smoke ok.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- `find_book` is not the server's duplicate rule; `add_book`'s `duplicate_book` is. The pre-check only saves a pointless lookup: query the user's title before step 3, then the exact Title and the ISBN (separately) after it. A candidate with the same title and an author in common is a likely copy → stop and ask; others are mentioned in the report.
- A cover the old flow converted (AVIF, GIF) is now refused on `coverUrl` and goes through the AC-3 offer.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_new_book_skill.py tests/test_notes_summary_skill.py` -- expected: all pass.
- `npm run check` -- expected: green.

**Manual checks (if no CLI):**
- AC-4: Oleg's two real runs against `--dev` (amazon.com, leanpub.com), recorded here with the tools called and `hasCover: true`; also a duplicate and a refused cover address if convenient, and whether Amazon/Leanpub CDNs accept bookvie's download (closes `deferred-work.md:1312`).

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 33 findings — high 0, medium 6, low 23, false 4, maybe-false 0
- findings:
  - `[false]` `[reject]` Intent: AC-1..3 are tested at the skill-text and tool-contract surfaces, not by running an agent — the skill is agent instructions; the epic makes AC-4's real `--dev` run the behavioral evidence, left open for Oleg.
  - `[false]` `[reject]` Intent: the `not-finished`/`0-pages` rules are new to SKILL.md, not "as they are" — Oleg chose in the ATDD run (2026-11-20) to write them in; they existed only in his memory.
  - `[medium]` `[patch]` Intent: step 2's same-book judgement is a looser client-side rule than the server's — grouped with the same-book rule entry below; fixed there.
  - `[false]` `[reject]` Intent: scope beyond the epic text (`/api/views/*` ban, reconnect step, README line, `cover_too_large`) — all within the epic context's skill rules and the spec.
  - `[low]` `[defer]` Intent: evals reach only the production entry — grouped with the evals-real-library deferral.
  - `[low]` `[defer]` Spine: AD-8 still describes the deleted scripts and an open duplicate-rule gap — spine drift, deferred.
  - `[low]` `[defer]` Spine: Design Paradigm says the skill calls the HTTP API (2.0.0) — spine drift, deferred.
  - `[low]` `[defer]` Spine: Structural Seed `AG` node is an HTTP client — spine drift, deferred with the Paradigm entry.
  - `[low]` `[defer]` Spine: Deferred "Skills on the agent tools" bullet is now settled — spine drift, folds into the 12.6/12.7 entries.
  - `[low]` `[patch]` Spine: SKILL.md says find_book matches "only" title/subtitle/author/ISBN, omitting initials — added "or the title's initials, such as DDIA".
  - `[medium]` `[patch]` Blind: same-book rule ignores edition, so the 2nd edition of a book stops on the 1st (server never matches two different ISBNs, domain/duplicates.py) — same book now needs the same edition (and type when named); a different edition or format is another book.
  - `[medium]` `[patch]` Blind: an ISBN-query hit isn't called the same book — a candidate the ISBN query found is now the same book.
  - `[low]` `[patch]` Blind: the re-check after step 3 says "as above", which means "stop before the lookup" — now stops before `add_book`, shows the match and asks.
  - `[medium]` `[patch]` Blind: a URL-only prompt has no title for the pre-lookup check — skip it and rely on the checks after step 3.
  - `[low]` `[patch]` Blind: find_book's initials match not described — same fix as the Spine row.
  - `[low]` `[reject]` Blind: no fallback to another cover source before the no-cover offer — negligible (the agent can still pick a better address) and the fix adds a branch to the AC-3 flow.
  - `[low]` `[patch]` Blind: tags verification compares a string to a list — get_book's `tags` must contain each sent tag, ignoring case and order.
  - `[low]` `[defer]` Blind: evals write to the real library — pre-existing; deferred.
  - `[low]` `[patch]` Blind: grader 02 "Paperback" vs lower-case `type`; no grader for the new rules or error paths — grader now "paperback"; extra graders rejected (text leaves pin the rules, AC-4 runs the paths).
  - `[low]` `[reject]` Blind: no test of the "no other write tool" sentence — the leaf already pins that SKILL.md names exactly the three tools; a sentence check adds nothing.
  - `[low]` `[reject]` Blind: the spec's matrix lacks rows for the two rules and the re-check — the fix edits this build's spec.
  - `[low]` `[patch]` Blind: unused `tmp_path`; README check duplicated across the two skills' tests — `tmp_path` removed; sharing a helper rejected as low-value churn.
  - `[medium]` `[patch]` Edge: URL-only prompt in step 2 — grouped with the Blind URL-only row; fixed.
  - `[medium]` `[patch]` Edge: candidate with a different edition/type is called the same book — grouped with the same-book rule; fixed.
  - `[low]` `[patch]` Edge: several same-book candidates, only one shown — "show each of them".
  - `[low]` `[patch]` Edge: user asked twice after saying yes — "Don't ask again about a book the user already said to add anyway".
  - `[false]` `[reject]` Edge: `coverUrl` and another field refused together — `_book_tool` parses (refusing other fields) before it downloads, so a cover refusal never comes with another field's refusal (agent/tools.py `run`).
  - `[low]` `[reject]` Edge: a non-string value gets a malformed-intent refusal with no book field — the skill states every value is a string with an example; unlikely, and the fix adds a branch.
  - `[low]` `[patch]` Edge: tags compared case-sensitively despite merge_tags — fixed with the Blind tags row.
  - `[low]` `[patch]` Edge: grader 02 expects "Paperback" — fixed.
  - `[low]` `[defer]` Edge: evals can't reach `bookvie-dev` — grouped with the evals deferral.
  - `[low]` `[patch]` Edge: initials claim — fixed with the Spine row.
  - `[low]` `[reject]` Edge: more duplicates now surface only after the lookup — by design (Design Notes): the server's `duplicate_book` is the rule; the pre-check only saves a pointless lookup.

## Auto Run Result

Status: in-review

**Summary.** `bookvie-new-book` 3.0.0 reaches bookvie only through the agent tools: `find_book` before and after the lookup (title, then ISBN), `add_book` with string values and the cover's https address as `coverUrl` (bookvie downloads it), and `get_book` to verify title, tags and `hasCover`. It handles `duplicate_book` (show `duplicates`, `confirmDuplicate: true` only on the user's say-so), a refusal on `coverUrl` (say why, offer to add without a cover), other `invalid_fields` and `couldnt_save`. The `not-finished` and `0-pages` rules are now in SKILL.md. Step 1 gains the `/mcp` reconnect step, the `--dev`/`bookvie-dev` variant and the README setup line.

**Files changed.**
- `.claude/skills/bookvie-new-book/SKILL.md` -- rewritten onto the tools (3.0.0).
- `.claude/skills/bookvie-new-book/scripts/add_book.py`, `scripts/check_catalog.py` -- deleted.
- `.claude/skills/bookvie-new-book/evals/**` -- graders name the tools; `allowed_tools` adds the three `mcp__bookvie__*` tools; grader 02 lower-case type.
- `README.md` -- AI skills line: saves with the `add_book` agent tool.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- copied-rule entry resolved; this review's deferrals appended.
- `backend/tests/test_new_book_skill.py` -- three ATDD leaves unskipped, eight follow-ups (tool names and answer fields on a seeded library, `http://` cover refused on `coverUrl` with nothing saved, README setup/reconnect lines, evals, matrix rows).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 12-8 → review.

**Review.** 33 findings: 7 patch entries applied (2 medium: the same-book rule, the URL-only prompt; 5 low: the re-check wording, initials, tags compare, grader case, unused fixture), 4 deferred (3 spine drift, evals on the real library), the rest rejected with reasons in the triage log.

**Follow-up review recommended: true.** Two medium entries were patched (high 0, medium 2, low 5). Unverified risk: the rewritten same-book rule and URL-only path are agent instructions checked only by wording; AC-4's real run is the first behavioral evidence.

**Verification.** `cd backend && uv run pytest -q tests/test_new_book_skill.py tests/test_notes_summary_skill.py`: 24 passed. `npm run check` exit 0 before and after the patches (2160 pytest passed, 800 e2e passed, smoke ok).

**Residual risks / open.** AC-4 is manual and open: Oleg runs the skill against `--dev` on an amazon.com and a leanpub.com book and records the runs here; that run also settles `deferred-work.md`'s Story 12.5 real-download entry (whether those CDNs accept bookvie's request). AVIF/GIF covers, which 2.0.0 converted, are now refused on `coverUrl` and go to the no-cover offer.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
