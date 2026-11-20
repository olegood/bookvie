---
title: "Story 12.7: Summarize a book's notes through the agent tools"
type: 'feature'
created: '2026-11-20'
status: 'in-review'
baseline_revision: 'da68cca0bce78bb21279715ad9d04a06649bc8e0'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-8, Deferred "Skills on the agent tools"), reconciled before the next epic: AD-8 says the skill notes hold until Story 12.7, which moved only bookvie-notes-summary (bookvie-new-book moves in 12.8), and the Deferred bullet says 12.6 settles the reconnect step and per-entry tool names, which 12.7 wrote into the notes skill.
    evidence: |-
      .claude/skills/bookvie-notes-summary/SKILL.md steps 1-2; overlaps the open 12.6 entry at deferred-work.md:1330 (Spine Check, build-auto review of Story 12.7).
    location: >-
      .claude/skills/bookvie-notes-summary/SKILL.md
    severity: low
  - summary: >-
      Spine drift (AD-19, AD-6), reconciled before the next epic: the skill's step 2 has the agent derive a summary status (in progress, finished, not started) and choose which Reading's Purpose to use from get_book, a client-side derivation the spine reserves to the server; the deleted fetch_notes.py did the same, so the spine should name it as an accepted agent-side rule or get_book should carry it.
    evidence: |-
      .claude/skills/bookvie-notes-summary/SKILL.md step 2 "Work out the summary's inputs" (Spine Check, build-auto review of Story 12.7).
    location: >-
      .claude/skills/bookvie-notes-summary/SKILL.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** `bookvie-notes-summary` reads a Book with `scripts/fetch_notes.py`, which calls `/api/views/catalog`, `/api/views/home`, `/api/views/book` and `/api/health` over HTTP and reads a finished Book's Purpose straight from `library.json`. Epic 12 moves the skills onto the agent tools (FR-28, D15).

**Approach:** Give `get_book`'s `readings[]` each Reading's `purpose` (Oleg's ATDD decision, 2026-11-20), delete `fetch_notes.py`, and rewrite SKILL.md's step 2 so the agent finds the Book with `find_book` (or `get_home` for the Main book), reads it with `get_book` and its notes with `get_card_notes`, and applies the old script's rules itself. Steps 3–6 and `build_docx.cjs` stay byte-identical.

## Boundaries & Constraints

**Always:** Keep the start step (health check, `bookvie --no-browser` in the background, poll) and add Story 12.1's reconnect step in the README's wording (`/mcp`, pick the entry, reconnect). Never pick a Book when `find_book` returns several: list them with their edition and ask which one. Keep the prerequisites (a Purpose and at least one Card note) and the summary inputs the old script gave: title, subtitle, authors, pages, status, current page, finish date, Purpose (an unfinished Reading's first, then the latest by start date), notes in page order.

**Never:** No `curl`/HTTP call to `/api/views/*` or `/api/intents/*`, no HTTP client in a script, no reading `library.json`. No change to `build_docx.cjs` or to the sections "Write the summary", "Build the document", "Check how it renders", "Save and report" (step numbers may change). No new tool, no change to a tool description. No skill write to the catalog.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Main book | no book named | `get_home.mainBook.id` → `get_book` | no Main book: ask for a title |
| One match | `find_book` returns 1 | use its id | — |
| Two editions | `find_book` returns 2+ | list title, subtitle, authors, edition, type; ask which one; never pick | — |
| No match | `find_book` returns `[]` | ask for a fuller title or the author | — |
| Finished Book | `currentReading` null, finished Reading with Purpose | Purpose from that `readings[]` item, status finished, its finish date | — |
| Missing prereq | no Purpose or no notes | no document; say which Book and what it lacks | — |
| Reading with no Purpose | `get_book` | `readings[].purpose` is `null` | — |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:179` -- `BookReading`: add `purpose: str | None` (docstring: the Reading's stored Purpose; `null` when none).
- `backend/bookvie/views/shelf.py:345` -- `book_detail` builds `BookReading`; pass `purpose=r.purpose` (domain `Reading.purpose`, `domain/model.py:54`).
- `backend/tests/test_book_view.py:90` -- exact-keys `readings` check: add `"purpose": None` (old) and `"purpose": "Why Arrakis"` (new).
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen`; never hand-format. Fixtures typed on `BookReading` (`lib/bookDetail.test.ts`, `api/books.test.ts`) may need `purpose`; `tsc -b` shows it.
- `.claude/skills/bookvie-notes-summary/SKILL.md` -- steps 1–2 and the frontmatter description; steps 3–6 frozen (hashes in the test).
- `.claude/skills/bookvie-notes-summary/scripts/fetch_notes.py` -- delete; its rules move into SKILL.md step 2.
- `backend/bookvie/agent/tools.py:289-341` -- `find_book` (`{books:[{id,title,subtitle,authors,edition,type,role}]}`), `get_book` (`bookId`), `get_card_notes` (`bookId` → `groups[0].notes`, page order), `get_home` (`mainBook`). Read-only reference.
- `README.md:105-112` -- MCP entries `bookvie` (8765) and `bookvie-dev` (8766), and the reconnect wording to reuse.
- `backend/tests/test_notes_summary_skill.py` -- the two red leaves (remove `@pytest.mark.skip(reason=RED)`).
- Deferred-work intake: `deferred-work.md:1330` (Spine drift, AD-8, "cataloging-skill notes hold until Story 12.7") -- not in this story: spine drift, reconciled before the next epic; stories don't edit the spine.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- add and fill `BookReading.purpose` -- a finished Book's Purpose must come from `get_book`.
- `backend/tests/test_book_view.py` -- add `purpose` to the expected readings; add a leaf for a Book read twice (finished Reading's Purpose and the current one's, `null` for none) through `GET /api/views/book` and `get_book`.
- `frontend/src/api/generated/schema.d.ts` -- regenerate; fix any typed fixture.
- `.claude/skills/bookvie-notes-summary/scripts/fetch_notes.py` -- delete.
- `.claude/skills/bookvie-notes-summary/SKILL.md` -- rewrite step 1 (add the reconnect step, and the `--dev` server at 8766 with the `bookvie-dev` entry) and step 2 (tools, rules, never pick); reword the description's HTTP mention; bump `metadata.version` to 2.0.0.
- `backend/tests/test_notes_summary_skill.py` -- unskip both leaves; add one static leaf per agent-behavior matrix row (Main book via `get_home`'s `mainBook`, one match, no match asks for a fuller title or author, finished Book's Purpose from `readings[]`, missing prerequisite stops with no document) that checks SKILL.md step 2 states that rule; skill text is the only surface those rows have.

**Acceptance Criteria:**
- Given the skill folder, when this story lands, then it reads the Book through `find_book`, `get_book` and `get_card_notes` (or `get_home` for the Main book), has no `/api/views/`/`/api/intents/` path and no HTTP client, keeps its health check and `--no-browser` start plus the `/mcp` reconnect step, and `build_docx.cjs` and the four output sections are unchanged.
- Given a title that matches two editions, when the skill runs, then it asks which one and never picks.
- Given a finished Book with a Purpose, when `get_book` is called, then `readings[*].purpose` carries it and `currentReading` is `null`.
- Given a `--dev` server with a seeded Book that has a Purpose and Card notes, when Oleg runs the skill in a real Claude Code session, then the summary is produced and this spec records the run (manual; open until Oleg runs it).

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 28 findings — high 0, medium 3, low 13, false 12, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) `groups[0].notes` doesn't exist when a Book has no notes (`groups: []`) — SKILL.md step 2 now says an empty `groups` means no card notes and the prerequisite check stops.
  - `[false]` `[reject]` (blind) `get_card_notes` repeats `get_book.cardNotes` — AC-1 names `get_card_notes` as the notes source; the extra call is the story's requirement.
  - `[low]` `[patch]` (blind) the Purpose order leaves a `null` `startDate` undefined — SKILL.md: a finished Reading with no `startDate` counts as the earliest (the old `startDate or ""` key).
  - `[medium]` `[patch]` (blind) an in-progress Reading with no Purpose plus a finished one with a Purpose gave "in progress" with an old Purpose, where the old script said "finished" — status now follows the Reading the Purpose came from.
  - `[false]` `[reject]` (blind) "finished" shows the earlier Reading's date when only it has a Purpose — that is the old script's output, which AC-1 says stays unchanged.
  - `[low]` `[patch]` (blind) no instruction for a tool error — SKILL.md: tell the user what the error says; if bookvie stopped answering, go back to step 1; never fall back to HTTP.
  - `[low]` `[reject]` (blind) the spec's Design Notes word the Purpose order differently from SKILL.md — the fix edits this build's spec; SKILL.md and its test are the shipped rule.
  - `[low]` `[reject]` (blind) the new skill leaves check wording, not behavior — the skill text is the only surface an automated test has; AC-3's real run checks behavior.
  - `[low]` `[patch]` (blind) the several-matches leaf doesn't require `type` — the leaf now requires "title, subtitle, authors, edition and type".
  - `[false]` `[reject]` (blind) no test reads a finished Book through `get_book` — `test_the_skill_reads_the_book_through_the_tools_keeps_its_start_step_and_its_output` does, with `currentReading` `None`.
  - `[low]` `[reject]` (blind) the manual run has no record — the fix edits this spec; Auto Run Result records AC-3 as pending for Oleg.
  - `[false]` `[reject]` (blind) a whitespace-only Purpose is no longer dropped — `normalize_purpose` (`domain/purpose.py`) strips every stored Purpose and stores `None` for blank.
  - `[low]` `[patch]` (edge) empty `groups` — same root cause and fix as the first row.
  - `[low]` `[patch]` (edge) null `startDate` order — same fix as the third row.
  - `[low]` `[patch]` (edge) two finished Readings with the same `startDate` — SKILL.md: ties keep `readings[]` order (the old sort was stable).
  - `[false]` `[reject]` (edge) an in-progress Side read has `currentReading` `null` — `_role_reading` (`views/shelf.py:244`) gives any unfinished Reading that isn't Main or Up next the role `waiting` (`reading_status` is `paused`), so `currentReading` is set.
  - `[medium]` `[patch]` (edge) status vs Purpose source when `currentReading` has no Purpose — same root cause and fix as the fourth row.
  - `[false]` `[reject]` (edge) an in-progress Side read's status and page are lost — refuted as above (`views/shelf.py:244`, `domain/progress.py:39`).
  - `[false]` `[reject]` (edge) `BookReading` lacks `currentPage` for unfinished Readings outside main, Up next or waiting — no such Reading exists: every unfinished Reading is main, Up next or waiting.
  - `[medium]` `[patch]` (edge) old-script parity for a Main Reading without a Purpose — same root cause and fix as the fourth row.
  - `[false]` `[reject]` (intent) an in-progress Side read's progress line changes — refuted by `_role_reading` (`views/shelf.py:244`).
  - `[false]` `[reject]` (intent) `find_book` can ask where the old exact-title match picked one — AC-2 says the skill asks and never picks.
  - `[false]` `[reject]` (intent) whitespace trimming moved to prose — `normalize_purpose` already strips on every store.
  - `[low]` `[reject]` (intent) the spec and SKILL.md word the Purpose rule differently — both pick the same Reading (the auditor agrees); the fix would edit this spec.
  - `[false]` `[reject]` (intent) the `--dev`/`bookvie-dev` path isn't in the story — AC-3 runs the skill against a `--dev` server.
  - `[false]` `[reject]` (intent) AC-3's real run isn't recorded — it is a manual criterion for Oleg, recorded as pending under Auto Run Result.
  - `[low]` `[defer]` (spine) Spine drift (AD-8, Deferred "Skills on the agent tools") — deferred to deferred-work.md.
  - `[low]` `[defer]` (spine) Spine drift (AD-19, AD-6): agent-side status and Purpose choice — deferred to deferred-work.md.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- Deleting `fetch_notes.py` rather than keeping a pure JSON transform: the agent already holds the tool answers, and copying them into a file for a script is more error-prone than three short rules. The rules, for step 2:
  - Purpose: `currentReading.purpose`; else the last `readings[]` item with a Purpose, ordering unfinished first then by `startDate`.
  - Status: `in progress` with `currentReading.currentPage`; else `finished` with the chosen Reading's `finishDate` (or `latestFinishDate`); else `not started`.
  - Notes: `get_card_notes` with the `bookId`, already in page order.

## Verification

**Commands:**
- `cd backend && uv run pytest -q tests/test_notes_summary_skill.py tests/test_book_view.py` -- expected: pass
- `npm run check` -- expected: green

**Manual checks (if no CLI):**
- AC-3: Oleg runs the skill against `bookvie --dev` in a real session and the run is recorded here.

## Auto Run Result

Status: in-review

**Summary.** `bookvie-notes-summary` now reads the Book through the agent tools: `find_book` (or `get_home` for the Main book), `get_book` and `get_card_notes`. `scripts/fetch_notes.py`, which called `/api/views/*` and read `library.json`, is deleted, and SKILL.md step 2 gives the agent its rules. `get_book`'s `readings[]` carries each Reading's `purpose`, so a finished Book's Purpose comes from the tools. The start step keeps the health check and `--no-browser`, and adds the README's `/mcp` reconnect step and the `--dev`/`bookvie-dev` path. Steps 3–6 and `build_docx.cjs` are byte-identical (hash-pinned).

**Files changed.**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py`: `BookReading.purpose`.
- `frontend/src/api/generated/schema.d.ts`: regenerated; `frontend/src/lib/bookDetail.test.ts`: fixtures gain `purpose: null`.
- `.claude/skills/bookvie-notes-summary/SKILL.md`: description, version 2.0.0, steps 1–2 rewritten.
- `.claude/skills/bookvie-notes-summary/scripts/fetch_notes.py`: deleted.
- `backend/tests/test_book_view.py`: `purpose` in the exact readings; a leaf for three Readings' Purposes through the view and `get_book`.
- `backend/tests/test_notes_summary_skill.py`: both red leaves unskipped; static leaves for each step-2 rule.

**Review.** 28 findings: 9 patched (as 4 entries: empty `groups`, Purpose order for a null or tied `startDate`, status following the Purpose's Reading, tool errors; plus the `type` check in the test), 2 deferred as spine drift (AD-8; AD-19/AD-6) to `deferred-work.md`, 17 rejected with the reasons in the triage log. Patched by verdict: medium 1 entry (3 findings), low 4 entries. Follow-up review recommended: false.

**Verification.** `cd backend && uv run pytest -q --no-cov tests/test_notes_summary_skill.py tests/test_book_view.py`: 12 passed. `npm run check`: exit 0 (Python, API drift, lint, types, e2e, smoke ok), before and after the patches.

**Deferred-work intake.** `deferred-work.md:1330` (Spine drift, AD-8) stays open: spine drift is reconciled before the next epic.

**Residual risks.** AC-3 is open: Oleg runs the skill against `bookvie --dev` in a real Claude Code session, with a seeded Book that has a Purpose and Card notes, and ideally a title with two editions, and records the run here. Nothing in this run called the tools from a real agent session. The README's "AI skills" section may still describe the skills as calling 127.0.0.1:8765; stories don't edit the README.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
