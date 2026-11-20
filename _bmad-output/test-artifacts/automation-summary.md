---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-20'
storyId: '12.8'
storyKey: '12-8-add-a-book-through-the-agent-tools'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-8-add-a-book-through-the-agent-tools.md (Boundaries, I/O matrix, Review Findings, Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-12-8-add-a-book-through-the-agent-tools.md
  - _bmad-output/implementation-artifacts/epic-12-context.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-8 done)
  - _bmad/tea/config.yaml
  - .claude/skills/bookvie-new-book/SKILL.md
  - backend/bookvie/agent/tools.py (`_book_tool.run`); backend/bookvie/intents/add_book.py, book_form.py (`valid_fields`, `cover_failures`), cover_fetch.py; backend/bookvie/views/find_book.py
  - backend/tests/test_new_book_skill.py; backend/tests/test_agent_cover_url.py (the `past-the-cap` and `undecodable-jpeg` cases); backend/tests/conftest.py (`connect_mcp`); backend/tests/agent_client.py; backend/tests/helpers.py (`library_bytes`, `image_bytes`)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.8 Add a book through the agent tools

## Preflight

- **Stack:** `fullstack` (auto). The story changes a skill's text, its evals and one README line, and deletes two scripts; there is no page to explore, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the spec with its two review records and the ATDD checklist's seven green-phase follow-ups.
- **Order:** this run started after the code review's commit `513c443` landed, with a clean tree and the story `done`.
- **Generation:** sequential, in this session, as for Stories 12.3 to 12.7: two leaves in one pytest module at one level.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` are off and don't apply: no Playwright test, no Pact artifacts.

## Coverage plan

The build and the review pin the skill's text: the three tools, the start and reconnect steps, the two tag rules, the report, each I/O matrix row, and the field names it reads in real `find_book`, `add_book` and `get_book` answers. Already owned elsewhere: `cover_too_large` with its field on `coverUrl` (Story 12.5, `test_agent_cover_url.py` case `past-the-cap`), and `find_book`'s ISBN and initials matching (Story 12.2). Two things were still checked only by wording.

| Target | Level | Priority | Why |
|---|---|---|---|
| Step 4's JSON example is accepted by `add_book` as written (cover downloaded, `hasCover: true`); every `add_book` key in step 3's field table is in the tool's input schema; the three lower-case `type` values and Pages `"1"` with the `0-pages` tag are taken | API (MCP tools, `connect_mcp`) + static (SKILL.md) | P2 | The agent copies the example and the keys. A renamed tool key or an example the server refuses would leave every wording leaf green and the skill failing on its first save. |
| The refusal order the review patch wrote into step 4: an image that downloads but doesn't decode comes with the other bad fields in one `invalid_fields`; a refused download comes first, then the resend without `coverUrl` is refused on `pages`, then as `duplicate_book`; nothing is saved until `confirmDuplicate: true` | API (MCP `add_book`, `find_book`, the real downloader for `http://`) | P2 | Step 4's new paragraph describes the server's order (`_book_tool.run` downloads before the handler's field and duplicate checks). If that order changes, the paragraph is wrong and the agent asks the wrong question first. |

Not automated:
- An agent following the skill (AC-4) and the three manual follow-ups (a duplicate asked about, a refused cover offered without one, the CDNs' answer to bookvie's download). Only a real Claude Code session against `--dev` shows them; they stay open for Oleg.

## Files

- `backend/tests/test_new_book_skill.py`: two leaves, one helper and one pattern.
  - `test_step_4s_example_and_field_keys_are_what_add_book_takes`
  - `test_a_cover_refusal_comes_with_other_fields_or_ahead_of_them_as_step_4_says`
  - `_BytesFetcher`: a cover downloader that answers every address with the same bytes (an image, or bytes that don't decode).
  - `ADD_BOOK_KEY`: the `add_book` key in a field-table row ("| **Title** (`title`) |").
- `_bmad-output/test-artifacts/atdd-checklist-12-8-add-a-book-through-the-agent-tools.md`: three follow-ups ticked, one retired, three left for AC-4's manual run.

## Validation

- **New leaves:** `uv run pytest tests/test_new_book_skill.py` gave 14 passed.
- **Mutation checks** (each a `sed` edit, a run, and the reverse `sed`; `git status` showed only the test file changed afterwards):
  - Step 4's example sends `"pages": 234` (a number): the example leaf fails (not every value is a string).
  - The field table's `authors` key renamed `author`: the example leaf fails (the key set loses `authors`).
  - `add_book` validating without `cover_failures(cover)`: the refusal-order leaf fails (`['pages'] == ['coverUrl', 'pages']`).
- **Lint and format:** `ruff check` and `ruff format` are clean on the file.
- **Full check:** `npm run check` exited 0 in this run: pytest 2163 passed (the review's 2161 plus these 2), coverage gates domain 100.00% and intents+store 97.62%, unit 388 passed, e2e 800 passed, smoke ok.
- **Checklist:** no CLI or browser session was opened. Temporary files stayed in the session scratchpad, not the repo.

## ATDD checklist

Ticked: the tool names and answer fields (the build's leaf, plus this run's example leaf), the README setup and reconnect lines, the evals. Retired: the `coverUrl` message check, since SKILL.md quotes no server message; the refusal-order leaf covers step 4's cover handling instead. Remaining `[ ]` lines: 3 (`grep -cF '[ ]'`), all manual and planned for AC-4's real session against `--dev` (Oleg).

## Risks and assumptions

- The skill's behaviour is still checked only through its text and the tool answers it relies on. AC-4, a real agent run on an amazon.com and a leanpub.com book, is open for Oleg; it also settles `deferred-work.md`'s Story 12.5 entry (whether those CDNs accept bookvie's download).
- The example leaf adds the example's book to a temporary library through a fake downloader; the example's cover address is a placeholder (`<image>.jpg`) and is never fetched for real.
- The evals still reach only the production entry (deferred by the build).

## Next

- Story 12.8 is complete apart from AC-4's manual run, and it closes Epic 12.
- Before Epic 13: the Epic 12 retrospective (`bmad-retrospective`), then its before-next-epic items: `bmad-testarch-trace` for Epic 12 (trace and gate) and the spine reconciliation of Epic 12's "spine drift" entries in `deferred-work.md` (AGENTS.md, "Architecture spine" and "Epic boundaries").
