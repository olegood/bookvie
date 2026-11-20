---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-20'
storyId: '12.8'
storyKey: '12-8-add-a-book-through-the-agent-tools'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-128-add-a-book-through-the-agent-tools'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-8-add-a-book-through-the-agent-tools.md'
generatedTestFiles:
  - 'backend/tests/test_new_book_skill.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 12.8)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Cross-Story Dependencies: the skills keep their start step)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D15, §5 12.8)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (the copied duplicate rule entry under spec-epic-6-retro-item-52; the 12.5 real-download entry)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-8 backlog, 12-7 done)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md (format, a manual AC with no leaf)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-new-book/SKILL.md, scripts/add_book.py, scripts/check_catalog.py, scripts/lookup.mjs, evals/*'
  - 'backend/bookvie/agent/tools.py (find_book, get_book, add_book and their descriptions, COVER_URL_SENTENCE), intents/cover_fetch.py (on_cover_url)'
  - 'backend/tests/test_notes_summary_skill.py (_skill_files, HTTP_CLIENT), test_agent_mount.py (_section), test_agent_book_write.py (the duplicate_book case), test_agent_cover_url.py'
  - 'Oleg''s Claude memory: not-finished-tag.md, zero-pages-tag.md (the two rules the AC names)'
  - 'knowledge: test-quality, test-levels-framework, test-priorities-matrix'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given .claude/skills/bookvie-new-book/, when this story lands, then it checks for the book with find_book, adds it with add_book and its coverUrl, and verifies it with get_book; it no longer downloads the cover itself, and its multipart add_book.py post and its duplicate pre-check copy (check_catalog.py) are gone, closing that deferred-work.md entry; it makes no curl or HTTP call to /api/intents/*; and the added-by-skill tag, the not-finished and 0-pages rules, and the terminal report stay as they are.' }
  - { id: AC-2, idSource: generated, text: 'Given add_book refuses with duplicate_book, when the skill gets that result, then it shows the user the matching Books and adds with confirmDuplicate: true only on the user''s say-so.' }
  - { id: AC-3, idSource: generated, text: 'Given a cover download refused on coverUrl, when the skill gets that result, then it tells the user why, and offers to add the Book without a cover.' }
  - { id: AC-4, idSource: generated, text: 'Given a --dev server, when Oleg runs the skill in a real Claude Code session on a book from amazon.com and one from leanpub.com, then both are added with their covers, and the spec records the runs (manual verification).' }
---

# ATDD Checklist: Story 12.8 Add a book through the agent tools

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. This story needs only pytest.
- **Story:** no spec file exists yet (the build writes it), so the source is `epics.md` Story 12.8. Its 4 Given/When/Then criteria have no ids, so they are numbered AC-1 to AC-4 in source order (registry above). `sprint-status.yaml` reads `backlog` for 12.8 and `done` for 12.7.
- **Epic gate:** 12.8 isn't Epic 12's first story, so the spine-drift gate doesn't apply. 12.8 is Epic 12's last story: after its review, `bmad-testarch-automate`, then the Epic 12 retro (AGENTS.md, "Epic boundaries").
- **Config:** `tea_use_playwright_utils: false`, no Pact, `tea_browser_automation: auto`. No page is involved.
- **What exists today:**
  - **The skill (2.0.0).** Step 1 starts bookvie (`curl -fsS http://127.0.0.1:8765/api/health`, `bookvie --no-browser`); it has no `/mcp` reconnect step. Step 2 runs `check_catalog.py` (urllib, `GET /api/views/catalog` and `/api/views/book`, its own copy of `domain/duplicates`' rule; `duplicates` → stop and ask, `similar` → look up and re-check). Step 3 gathers metadata with `lookup.mjs` (headless Chromium via `page.goto`, no HTTP client) and downloads the cover with `curl -sSL -A "Mozilla/5.0" -o …/cover.jpg`, checked with `file` and converted with `sips`. Step 4 writes `book.json` and runs `add_book.py` (multipart `POST /api/intents/add-book`, then `GET /api/views/book`; outcomes `saved`/`duplicate`/`invalid`/`failed`/`error`; `--confirm-duplicate`). Step 5 is the terminal report.
  - **The evals.** `evals/*/graders/*` name `check_catalog.py` and `add_book.py` (graders 06/07 "check_catalog.py ran before add_book.py saved the book…", 05 "add_book.py's `verified`"). `case.yaml`'s `allowed_tools` has no MCP tool.
  - **The tools.** `find_book` returns candidates `{id, title, subtitle, authors, edition, type, role}` ("likely" matches, not the server's duplicate rule). `add_book` takes every field as a string, `type` in lower case, tags comma-separated, optional `coverUrl` and `confirmDuplicate`; a duplicate is refused with `duplicate_book` and `duplicates` (Story 12.4); a cover failure is refused with its message on `coverUrl` and nothing saved (Story 12.5, `on_cover_url`). `get_book` gives `hasCover`, `tags` and the fields.
  - **The two rules (decided).** `not-finished` (tag a book whose source says it isn't finished, e.g. Leanpub's "NN% complete" under 100) and `0-pages` (no page count anywhere → Pages 1 and tag `0-pages`, don't ask) are **not in SKILL.md** or any committed file; they live only in Oleg's Claude memory. **Oleg chose (2026-11-20, in this run) to write both into SKILL.md**, so the AC's "stay as they are" holds for any session. The alternative was leaving them in memory, with no leaf.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 12.7. There are no UI journeys and no recording. The two worker subagents would have one small pytest file between them, and both need this session's reading of the skill and the tools.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Static (the skill's folder, `deferred-work.md`) | P1 | `test_the_skill_adds_through_the_tools_and_keeps_its_start_step_rules_and_report` (`backend/tests/test_new_book_skill.py:79`). **No file in the skill's folder names a `/api/views/…` or `/api/intents/…` path.** Then: `scripts/add_book.py` and `scripts/check_catalog.py` don't exist, and no file in the folder (evals included) names either; no script matches `HTTP_CLIENT`; every `curl`/`wget` command line in SKILL.md is the `/api/health` check (the cover download is gone); SKILL.md names `` `find_book` ``, `` `add_book` ``, `` `coverUrl` `` and `` `get_book` ``; it keeps `/api/health` and `--no-browser`, and adds `` `/mcp` `` and "reconnect"; it names `` `added-by-skill` ``, a line with `` `not-finished` `` says "complete", a line with `` `0-pages` `` names pages and `1`; the "Report in the terminal" section keeps its six items (`REPORT_ITEMS`); the `deferred-work.md` entry about the copied duplicate rule has a `resolved:` line. | A skill is instructions to an agent, so the leaf checks the text it runs on. How the tools behave is Stories 12.2, 12.4 and 12.5's. |
| AC-2 | Static (SKILL.md) | P1 | `test_on_duplicate_book_the_skill_shows_the_matches_and_confirms_only_on_the_users_say_so` (`:143`). **SKILL.md has a line naming `` `confirmDuplicate` `` (or `` `confirmDuplicate: true` ``).** Then one such line says "only if/when … user"; SKILL.md names `` `duplicate_book` `` and `` `duplicates` ``, and no longer `--confirm-duplicate`. | The refusal and `confirmDuplicate` are Story 12.4's leaf (`test_agent_book_write.py`, `duplicate-book` and `success-confirm-duplicate` cases). What the agent does with them is in the text, and AC-4's real run shows it. |
| AC-3 | Static (SKILL.md) | P1 | `test_on_a_cover_refused_on_cover_url_the_skill_says_why_and_offers_to_add_without_a_cover` (`:166`). **SKILL.md has a line that offers … "without a/the/its cover".** Then that line names `` `coverUrl` `` and says "why". | The refusal on `coverUrl`, nothing saved, is Story 12.5's leaf (`test_agent_cover_url.py`). |
| AC-4 | Manual (Oleg, a real Claude Code session against `--dev`) | P1 | No automated leaf, as for Story 12.1's AC-8 and Story 12.7's AC-3. Oleg runs the skill on an amazon.com book and a leanpub.com book against `--dev`; the spec records both runs: the book, the tools called, the cover stored (`get_book` `hasCover: true`). | Only a real session shows an agent following the skill, and it makes bookvie's first real cover download. |

**Primary branch per criterion.** AC-1: no `/api/views` or `/api/intents` path left in the skill. AC-2: `confirmDuplicate` replaces `--confirm-duplicate`, sent only on the user's say-so. AC-3: the offer to add without a cover. AC-4: manual.

**What the leaves pin (the contract for the build):**
- No file under `.claude/skills/bookvie-new-book/` (any extension, `__pycache__` ignored, evals included) names `/api/views/` or `/api/intents/`, `add_book.py` or `check_catalog.py`. The two scripts are deleted. Under `scripts/`, no HTTP client (`lookup.mjs` passes today). In SKILL.md, every `curl`/`wget` command line contains `/api/health`. Prose such as "makes no `curl` call" is fine.
- SKILL.md names `find_book`, `add_book`, `coverUrl` and `get_book` in backticks; keeps `/api/health` and `--no-browser`; gives the reconnect step with `` `/mcp` `` and the word "reconnect".
- SKILL.md names `` `added-by-skill` ``; states the `` `not-finished` `` rule on a line with the word "complete"; states the `` `0-pages` `` rule on a line naming pages and `1`. A rule is one bullet or paragraph (one line in the file).
- Step 5's heading is "Report in the terminal" (numbered or not) and its text still holds the six `REPORT_ITEMS`, whitespace-normalized. The rest of it may change (for example "the stored values from `book`" → from `get_book`).
- `deferred-work.md`: the bullet containing "re-implements `domain/duplicates`' rule" gains an indented `resolved:` line.
- One line names `` `confirmDuplicate` `` and says it is sent only if (or when) the user says so. `duplicate_book` and `duplicates` are named.
- One line offers to add the Book without a cover, and names `` `coverUrl` `` and "why".

**Open for the build (not pinned):**
- The order of the checks: whether `find_book` runs on the user's title before the lookup (as `check_catalog.py` did) and again on the exact title or ISBN after it, and what the skill does with `find_book` candidates (it's no longer the server's rule: `add_book`'s `duplicate_book` is). `find_book` matches its whole query against one field, so "title author" finds nothing (Story 12.7's review finding): query the title, and the ISBN separately.
- The field table's `book.json` keys become `add_book` arguments: every value a string, `type` in lower case, empty values left out, `coverUrl` the image's https address. Whether a JSON file stays at all.
- How the skill verifies with `get_book` (title, tags and `hasCover`, as `add_book.py`'s `verified` did) and what it reads from the `add_book` answer (`ids.bookId`).
- What it does on `invalid_fields` (other than `coverUrl`) and `couldnt_save`, as `add_book.py`'s `invalid` and `failed` outcomes did.
- A cover the old flow converted (AVIF, GIF with `sips`): bookvie's sniffer takes only JPEG, PNG and WebP, so such a cover is now refused on `coverUrl` and goes through AC-3's offer.
- The evals: graders that name the old scripts must be rewritten (the AC-1 leaf fails while they name them), and `case.yaml`'s `allowed_tools` needs the bookvie MCP tools for an eval run to reach them.
- The `metadata.version` bump (3.0.0?), the description's "saves it with bookvie's add-book API call", and README.md:118 ("saves the book through the add-book API").
- The `--dev` entry name and port (`bookvie-dev`, 8766) and the setup line when reconnecting brings no tools, as Story 12.7's skill does.

## Existing leaves this story changes (for the build)

None fail. `backend/tests/test_agent_book_write.py` names `confirm-duplicate` only as a case id. No test reads the new-book skill today.

This run extended one shared helper. Its existing callers still pass (`npm run check:py`: 2149 passed, 3 skipped):
- `_skill_files` (`backend/tests/test_notes_summary_skill.py:56`) gained `folder` (default: the notes skill's folder). Story 12.7's leaf calls it without the argument, so its behavior is unchanged.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Pytest, AC-1:** every tool name SKILL.md names is registered, and it names only `find_book`, `add_book`, `get_book` (plus `get_app_info` if the build uses it), never `edit_book` or another write tool; the fields it reads (`ids.bookId`, `hasCover`, `tags`, `duplicates`, `fields`) resolve in real tool answers, as Story 12.7's `test_every_name_the_skill_reads_is_in_the_tools_answers_and_it_names_only_the_read_tools`. (done: backend/tests/test_new_book_skill.py:219 `test_every_name_the_skill_reads_is_in_the_tools_answers_and_it_names_only_its_three_tools`; step 4's example and `add_book` keys against the real tool: backend/tests/test_new_book_skill.py:438 `test_step_4s_example_and_field_keys_are_what_add_book_takes`)
- [x] **Pytest, AC-1:** the skill's setup and reconnect lines match the README's Agent tools section (as `test_the_skills_setup_and_reconnect_steps_match_the_readme` does for the notes skill), and README.md's AI skills line no longer says "add-book API". (done: backend/tests/test_new_book_skill.py:310 `test_the_skills_setup_and_reconnect_steps_match_the_readme`)
- [x] **Pytest, AC-1:** the evals' graders name the tools, not the old scripts, and `allowed_tools` lets an eval call them. (done: backend/tests/test_new_book_skill.py:342 `test_the_evals_grade_the_tools_and_may_call_them`)
- ~~**Pytest, AC-3:** the `coverUrl` messages the skill tells the user are the ones `on_cover_url` reports (if SKILL.md quotes any).~~ **Retired:** SKILL.md quotes no server message; step 4 tells the agent to relay "the field's own message" (code review of Story 12.8, Rejected list in the spec's Review Findings). The refusal order step 4 describes is pinned instead: backend/tests/test_new_book_skill.py:487 `test_a_cover_refusal_comes_with_other_fields_or_ahead_of_them_as_step_4_says`.
- [ ] **Manual, AC-2:** in AC-4's session, add a book already in the `--dev` library and record that the agent shows the matches and asks before sending `confirmDuplicate`.
- [ ] **Manual, AC-3:** in AC-4's session, give a cover address that is refused (e.g. an `http://` one) and record the message and the offer.
- [ ] **Manual, AC-4:** close the Story 12.5 `deferred-work.md` entry (first real cover download): record whether the Amazon and Leanpub CDNs accept `User-Agent: bookvie` and `Accept: image/*`.

## Helper probes

Helpers reused: `_section` (`backend/tests/test_agent_mount.py`); `HTTP_CLIENT` (`backend/tests/test_notes_summary_skill.py`). Extended, probed: `_skill_files` (`backend/tests/test_notes_summary_skill.py`, `folder`).

Helpers added (all in `backend/tests/test_new_book_skill.py`):
- `_command_lines`: `curl` or `wget` command lines in a text. Story 12.7's leaf has the `curl` pattern inline; this one adds `wget`, since the cover download is the thing it must catch.
- `_lines_with`: the lines matching a pattern, so a rule's words are checked on the same bullet. No existing helper does this.
- `_deferred_entry`: one `deferred-work.md` bullet by a marker in its text. No existing test reads `deferred-work.md`.
- `_skill`: reads SKILL.md. A one-liner.

Shipped numbers: none quoted. The ACs give no size; the `0-pages` rule's Pages 1 is the server's minimum ("Pages must be a whole number, 1 or more."), not UI.

Storage keys: no new localStorage key.

Render-before-read: no Playwright leaf, and no leaf reads a rendered page. The leaves read files from disk. No leaf was changed for it.

Border widths: none asserted.

The probe ran from a temporary file, then removed with `rm`: `backend/tests/test_new_book_skill_probe.py` (`cd backend && uv run pytest -q -p no:cacheprovider --no-cov tests/test_new_book_skill_probe.py`, 7 passed on the second run). The first run's one failure was the probe's own bug, not a helper: it looked up `` `confirmDuplicate` `` in a fixture that says `` `confirmDuplicate: true` ``, and its "negative" sentence ("… Only if asked by the user.") in fact states the rule. The probe was corrected; no helper or leaf pattern changed.
- **`_skill_files(folder)`:** on the new-book folder it gave `SKILL.md`, `scripts/add_book.py` and the graders (`evals/manning-second-edition/graders/07-g.md`); without the argument it gave the same files as with the notes folder (`SKILL.md`, `scripts/build_docx.cjs`); on a temp folder it gave only `a.md`. **Refused:** a file under `__pycache__`.
- **`HTTP_CLIENT` on the new-book scripts:** matched exactly `scripts/add_book.py` and `scripts/check_catalog.py` (urllib). **Refused:** `scripts/lookup.mjs` (Playwright `page.goto`).
- **`_command_lines`:** on today's SKILL.md it gave the health check and the cover download (`-A "Mozilla/5.0"`), so "every line is the health check" is false today; `wget https://x/y.jpg` was found. **Refused:** "makes no `curl` or HTTP call" and "the curl command".
- **`_lines_with`:** gave exactly the `not-finished` bullet of a fixture, case-insensitively. **Refused:** a pattern absent from the text.
- **`_deferred_entry`:** found the copied-rule bullet (starts `- source_spec: …spec-epic-6-retro-item-52`, names `check_catalog.py`, holds one bullet and no heading) with no `resolved:` line today, and the bullet above it with its `resolved:` line. **Refused:** an ambiguous marker (`source_spec`, many bullets) and an absent one (both `None`).
- **`REPORT_ITEMS` on today's step 5:** all six present. **Refused:** "Leave the server running" (not the wording).
- **The AC patterns:** on today's SKILL.md, no `not-finished`, `0-pages`, `confirmDuplicate` or "offer … without a cover" line; `duplicate_book` and `--confirm-duplicate` present. Matched: "Tag `not-finished` when Leanpub says the book is under 100% complete.", "No page count: Pages 1 and tag `0-pages`.", "Send `confirmDuplicate: true` only if the user says to add it anyway.", "Pass `confirmDuplicate` too." (the line pattern), "If `coverUrl` is refused, tell the user why and offer to add it without a cover." **Refused:** "Tag `not-finished` sometimes.", "Tag `0-pages` with 10 pages.", "Send `confirmDuplicate: true` to add it again; the user only sees it if they look.", "Add the book without one, and say so.", "Offer it. Add without a cover."

No helper changed after its probe passed. `ruff format` then reflowed `test_new_book_skill.py` (layout only), and the red run below was repeated after it.

## TDD Red Phase

Generated: 3 pytest leaves, all `@pytest.mark.skip(reason=RED)`. `npm run check:py` stays green with them skipped (2149 passed, 3 skipped). The red run below ran after the probe above last passed and after formatting, on a throwaway un-skipped copy that was then removed with `rm` (`backend/tests/test_new_book_skill_redrun_probe.py`):
- **AC-1** fails at its first assertion: `{'SKILL.md': ['/api/intents/add-book', '/api/views/book'], 'scripts/add_book.py': ['/api/intents/add-book', '/api/views/book'], 'scripts/check_catalog.py': ['/api/views/book', '/api/views/catalog']} == {}`.
- **AC-2** fails at its first assertion: `assert confirm` (`[]`: no line names `` `confirmDuplicate` ``).
- **AC-3** fails at its first assertion: `assert offers` (`[]`: no line offers to add without a cover).
- **AC-4** has no leaf (manual).

`git status` after the runs lists no `*.probe.*` file and no throwaway copy.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove `@pytest.mark.skip(reason=RED)` from a leaf when its task starts.
2. Run it and see it fail at its first assertion, then implement until it passes: `cd backend && uv run pytest -q tests/test_new_book_skill.py`.
3. Delete `scripts/add_book.py` and `scripts/check_catalog.py`, rewrite SKILL.md onto the tools (with the two rules), update the evals, and add the `resolved:` line to the `deferred-work.md` entry.
4. Leave AC-4 open in the spec for Oleg's real sessions against `--dev`, as Story 12.7 did for its AC-3.
5. Finish with `npm run check`.
