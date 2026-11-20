---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-20'
storyId: '12.7'
storyKey: '12-7-summarize-a-book-s-notes-through-the-agent-tools'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-7-summarize-a-book-s-notes-through-the-agent-tools.md (Boundaries, I/O matrix, Review Findings, Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md
  - _bmad-output/implementation-artifacts/epic-12-context.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-7 done)
  - _bmad/tea/config.yaml
  - .claude/skills/bookvie-notes-summary/SKILL.md; README.md ("Agent tools")
  - backend/bookvie/views/shelf.py (`_role_reading`, `book_detail`); backend/bookvie/views/find_book.py; backend/bookvie/views/models.py (`BookCandidate`, `CardNotesView`)
  - backend/tests/test_notes_summary_skill.py; backend/tests/test_book_view.py; backend/tests/test_agent_read.py (`_structured`, the scoped `get_card_notes` leaf); backend/tests/builder.py; backend/tests/agent_client.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.7 Summarize a book's notes through the agent tools

## Preflight

- **Stack:** `fullstack` (auto). The story changes a skill's text, one view field (`BookReading.purpose`) and the generated types; there is no page to explore, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the spec with its review records and the ATDD checklist's five green-phase follow-ups.
- **Order:** this run started after the code review's commit `c2027fa` landed, with a clean tree and the story `done`.
- **Generation:** sequential, in this session, as for Stories 12.3 to 12.6: one pytest module at one level.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` don't apply: no Playwright test, no Pact artifacts.

## Coverage plan

The build covers the `purpose` field through the view and `get_book`, and the step-2 rules in the skill's text; the review added the title-plus-author and MCP-setup leaves. The scoped `get_card_notes` (one group, `[]` with no notes) is Story 12.2's leaf (`test_agent_read.py:296`). What was still open is drift between the skill's text and the things it names.

| Target | Level | Priority | Why |
|---|---|---|---|
| Every field and path step 2 reads (`mainBook.id`, `groups[0].notes`, `currentReading.purpose`/`.currentPage`, `latestFinishDate`, `readings[]` with `startDate`/`finishDate`/`purpose`, `find_book`'s candidate fields) is in the real tool answers, and the only registered tools the skill names are the four read tools | API (MCP tools, `connect_mcp`) + static (SKILL.md) | P2 | The wording leaves pass if a view field is renamed, and the agent would then read nothing. The tool-name check also pins "no skill write to the catalog". |
| An unfinished Reading on an Up next, Side read or paused Book is `currentReading`, with its Purpose and page | API (MCP `get_book`), 3 roles | P2 | Step 2's status rule (and two of the review's refutations) rest on it: anything not from `currentReading` or a finished Reading is "not started". |
| The skill's `claude mcp add` line and reconnect step match the README's "Agent tools" section | Static (SKILL.md, README.md) | P2 | ATDD follow-up 3: one wording, no drift. |

Not automated:
- An agent following the skill (AC-3) and the two manual follow-ups (two editions asked about; a finished Book's "Why I read this" line). Only a real Claude Code session against `--dev` shows them; they stay open for Oleg.

## Files

- `backend/tests/test_notes_summary_skill.py`: three leaves and one helper.
  - `test_every_name_the_skill_reads_is_in_the_tools_answers_and_it_names_only_the_read_tools`
  - `test_an_unfinished_reading_off_the_main_book_is_still_current_reading_with_its_purpose`
  - `test_the_skills_setup_and_reconnect_steps_match_the_readme`
  - `_seeded_tools`: a client on a library whose Main book has a finished Reading, a current one and a note.
- `_bmad-output/test-artifacts/atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md`: two follow-ups ticked, one retired, two left for AC-3's manual run.

## Validation

- **New leaves:** `uv run pytest tests/test_notes_summary_skill.py` gave 13 passed.
- **Mutation checks** (each an edit, a run, and a copy-back of the saved file; `git status` showed only the test file changed afterwards):
  - `edition` dropped from the skill's candidate list: the names leaf fails.
  - A write tool (`update_page`) named in step 2: the names leaf fails.
  - `_role_reading` returning no role for a paused Book: the `currentReading` leaf fails (`currentReading` is `None`).
  - The README's reconnect wording changed: the README leaf fails.
  - The README's `bookvie-dev` port changed: the README leaf fails.
- **Lint and format:** `ruff check` and `ruff format` are clean on the file.
- **Python check:** `npm run check:py` exited 0 in this run: ruff clean, pytest 2149 passed (the review's 2146 plus these 3), coverage gates domain 100.00% and intents+store 97.62%. Only a pytest file changed, so the frontend, e2e and smoke layers weren't re-run; the review's full `npm run check` (exit 0) covers them at `c2027fa`.
- **Checklist:** no CLI or browser session was opened. Temporary files stayed in the session scratchpad, not the repo.

## ATDD checklist

Ticked: the `purpose` through the view and `get_book` (the build's leaf) and the README reconnect wording (this run). Retired: the pure-transform comparison, since `fetch_notes.py` is deleted. Remaining `[ ]` lines: 2 (`grep -cF '[ ]'`), both manual and planned for AC-3's real session against `--dev` (Oleg).

## Risks and assumptions

- The skill's behaviour is still checked only through its text and the tool answers it names. AC-3, a real agent run, is open for Oleg.
- The names leaf checks the paths the skill names today; a new path added to step 2 needs adding to its list.

## Next

- Story 12.7 is complete apart from AC-3's manual run. Story 12.8 (`add-a-book-through-the-agent-tools`) is next in Epic 12.
- `bmad-testarch-trace` for Epic 12 comes after its last story (12.8), before the retrospective.
