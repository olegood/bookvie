---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-20'
storyId: '12.7'
storyKey: '12-7-summarize-a-book-s-notes-through-the-agent-tools'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-127-summarize-a-books-notes-through-the-agent-tools'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-7-summarize-a-book-s-notes-through-the-agent-tools.md'
generatedTestFiles:
  - 'backend/tests/test_notes_summary_skill.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 12.7)'
  - '_bmad-output/implementation-artifacts/epic-12-context.md (Cross-Story Dependencies: the skills keep their start step)'
  - '_bmad-output/planning-artifacts/mcp-server-plan-2026-11-19.md (D15, §5 12.7)'
  - '_bmad-output/implementation-artifacts/spec-12-1-mount-the-mcp-server.md (AC-8 result: the reconnect step)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (12-7 backlog, 12-6 done)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-6-let-an-agent-back-up-my-library-to-disk.md (format)'
  - '_bmad-output/test-artifacts/atdd-checklist-12-1-mount-the-mcp-server.md (a manual AC with no leaf)'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bookvie-notes-summary/SKILL.md, scripts/fetch_notes.py, scripts/build_docx.cjs'
  - 'backend/bookvie/agent/tools.py (find_book, get_book, get_card_notes, get_home and their descriptions), views/models.py (BookReading, CurrentReading, BookDetailView), views/shelf.py (BookReading built at :344)'
  - 'backend/tests/conftest.py (connect_mcp), agent_client.py, builder.py, test_agent_mount.py (_section, the README leaf), test_agent_read.py (_structured, the two-edition find_book leaf), test_book_view.py (the readings shape)'
  - 'knowledge: test-quality, test-levels-framework, test-priorities-matrix'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given .claude/skills/bookvie-notes-summary/, when this story lands, then it reads the Book through find_book, get_book and get_card_notes (or get_home for the Main book) and makes no curl or HTTP call to /api/views/* or /api/intents/*; it keeps its start step: check /api/health and start bookvie when it isn''t running, then the reconnect step Story 12.1 found; and the output (the one-page .docx) is unchanged in content and layout.' }
  - { id: AC-2, idSource: generated, text: 'Given a title that matches two editions, when the skill runs, then it asks which one, and never picks one itself.' }
  - { id: AC-3, idSource: generated, text: 'Given a --dev server with a seeded Book that has a Purpose and Card notes, when Oleg runs the skill in a real Claude Code session, then the summary is produced, and the spec records that run (manual verification).' }
---

# ATDD Checklist: Story 12.7 Summarize a book's notes through the agent tools

## Preflight

- **Stack:** `fullstack`, auto-detected. pytest (`backend/tests/conftest.py`) and Playwright (`frontend/playwright.config.ts`) are in place. This story needs only pytest.
- **Story:** no spec file exists yet (the build writes it), so the source is `epics.md` Story 12.7. Its 3 Given/When/Then criteria have no ids, so they are numbered AC-1 to AC-3 in source order (registry above). `sprint-status.yaml` reads `backlog` for 12.7 and `done` for 12.6.
- **Epic gate:** 12.7 isn't Epic 12's first story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, no Pact, `tea_browser_automation: auto`. No page is involved, so there is nothing to record.
- **What exists today:**
  - **The skill.** `SKILL.md` step 1 is the start step (`curl -fsS http://127.0.0.1:8765/api/health`, start `bookvie --no-browser` in the background, poll). It has no `/mcp` reconnect step. Step 2 runs `scripts/fetch_notes.py`, which calls `GET /api/views/catalog` (title match), `/api/views/home` (the Main book), `/api/views/book` and `/api/health` (for `dataDir`) with `urllib`, and reads `library.json` from disk for a finished Book's Purpose. When several Books match, it returns `candidates` with title, authors and year, and SKILL.md says to "ask which one". Steps 3 to 6 write `summary.json`, build the .docx with `scripts/build_docx.cjs`, check the render with Quick Look and save to `~/Documents`.
  - **The tools.** `find_book` returns candidates `{id, title, subtitle, authors, edition, type, role}` and its description already says "Never pick a Book for the user". `get_book` gives the book view, which also carries `cardNotes`, `latestFinishDate` and `readings`. `get_card_notes` gives the Card notes view. `get_home` gives `mainBook`.
  - **The gap (decided).** `get_book` gives a Purpose only on `currentReading`, which exists for the Main book, Up next and a waiting Book (a Side read included). `BookReading` (`readings[]`) has `id`, `startDate`, `finishDate`, `rating` and `purposeFulfilled`, but no `purpose`. So through the tools a finished Book's Purpose can't be read, and the old script read it from `library.json`. **Oleg chose (2026-11-20, in this run) to add `purpose` to `BookReading`**, so `get_book.readings[]` carries each Reading's Purpose. The alternatives were the skill reading `library.json` through `get_app_info`'s `dataDir`, or dropping the finished-book case.
  - **The reconnect step** (spec 12.1, AC-8, 2026-11-19): start `bookvie --dev` (or `bookvie`), then, if the session began before the server, `/mcp` → pick the entry → reconnect.

## Generation Mode

**AI generation**, sequential, in this session, as in Stories 12.3 to 12.6. There are no UI journeys and no recording. The two worker subagents would have one small pytest file between them, and both need this session's reading of the skill and the view.

## Test Strategy

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | Static (the skill's files) + API (`connect_mcp`, `get_book`) | P1 | `test_the_skill_reads_the_book_through_the_tools_keeps_its_start_step_and_its_output` (`backend/tests/test_notes_summary_skill.py:77`). **No file in the skill's folder names a `/api/views/…` or `/api/intents/…` path.** Then: no script imports or calls an HTTP client (`urllib`, `http.client`, `requests`, `httpx`, `fetch(`, Node's `http`/`https`, `curl`, `wget`); every `curl` command line in SKILL.md is the `/api/health` check; SKILL.md names `` `find_book` ``, `` `get_book` ``, `` `get_card_notes` `` and `` `get_home` ``; it keeps `/api/health` and `--no-browser`, and adds `` `/mcp` `` and "reconnect"; `build_docx.cjs` is byte-identical (sha256) and the sections "Write the summary", "Build the document", "Check how it renders" and "Save and report" are identical to commit `43e9260` (sha256 of each body; the step number may change). Last, through `get_book`, a Book finished with the Purpose "Why Arrakis" gives `readings[*].purpose == ["Why Arrakis"]` and `currentReading` `null`. | A skill is instructions to an agent, so the leaf checks the text it runs on. The Purpose tail checks the one thing the tools must newly give for the output to stay the same. |
| AC-2 | Static (SKILL.md) | P1 | `test_the_skill_asks_which_edition_when_find_book_returns_several_and_never_picks` (`:141`). **SKILL.md says "never pick", "never choose" or "never guess" (any ending: "never picking" passes).** Then it names `` `find_book` ``, says "ask which one", and mentions "edition". | That `find_book` returns both editions is Story 12.2's leaf (`test_agent_read.py:190`, `test_find_book_returns_every_candidate_with_its_edition_and_type_and_never_guesses`), not repeated. What the agent does with them is in the text, and AC-3's real run shows it. |
| AC-3 | Manual (Oleg, a real Claude Code session against `--dev`) | P1 | No automated leaf, as for Story 12.1's AC-8. Oleg seeds a `--dev` Book with a Purpose and Card notes, runs the skill in a real Claude Code session, and the spec records the run: the Book, the tools called, the .docx produced. | Only a real session shows an agent following the skill. |

**Primary branch per criterion.** AC-1: no `/api/views` or `/api/intents` path left in the skill. AC-2: the skill tells the agent never to pick. AC-3: manual.

**What the leaves pin (the contract for the build):**
- No file under `.claude/skills/bookvie-notes-summary/` (any extension, `__pycache__` ignored) names `/api/views/` or `/api/intents/`. Under `scripts/`, no HTTP client. In SKILL.md, every `curl` command line (`curl -…` or `curl http…`) contains `/api/health`. Prose such as "makes no `curl` call" is fine.
- SKILL.md names the four tools in backticks, keeps `/api/health` and `--no-browser`, and gives the reconnect step with `` `/mcp` `` and the word "reconnect".
- `scripts/build_docx.cjs` is byte-identical. The four output sections of SKILL.md are character-identical; the heading may be `## <n>. <title>` with any number, or `## <title>`.
- `get_book`'s `readings[]` items carry `purpose`: the Reading's stored Purpose, `null` when it has none.
- SKILL.md says the agent never picks a Book, says "ask which one", and mentions the edition.

**Open for the build (not pinned):**
- Whether `fetch_notes.py` is deleted, or turned into a pure helper that reads the tools' JSON (from stdin or a file) and prints the same summary input: `status`, `currentPage`, `finishDate`, the latest Purpose (an unfinished Reading first, then by start date), notes in book order, and `missing`. If it is kept, it must not import an HTTP client, and its exit codes 2 ("bookvie is down") and 3 change meaning. If it is deleted, SKILL.md must give the agent those rules.
- How the skill picks the Main book (`get_home`'s `mainBook`) and how it reaches the `--dev` tools for AC-3 (the `bookvie-dev` entry). The start step checks port 8765 today. The leaf doesn't pin a port.
- Where the Purpose comes from when a Book has several Readings: `currentReading.purpose`, else the latest `readings[]` item with a Purpose, as the old script did.
- What the candidate list shows to the user (the leaf pins only "edition" and "ask which one"). `find_book` has no `year`; the old list showed title, authors and year.
- The `metadata.version` bump in SKILL.md's frontmatter, and the description's "Reads the book and its notes from the local bookvie app (http://127.0.0.1:8765/)", which isn't an HTTP call but may want rewording.

## Existing leaves this story changes (for the build)

- `backend/tests/test_book_view.py:90` compares each `readings[]` item with exact keys. Adding `purpose` makes it fail until the build adds `"purpose": None` to the `old` Reading and `"purpose": "Why Arrakis"` to the `new` one.
- `frontend/src/api/generated/schema.d.ts` changes when `BookReading` gains `purpose`. Regenerate it with `npm --prefix frontend run api:gen` (`check:api` compares it byte for byte).
- The frontend's book-detail code (`frontend/src/lib/bookDetail.ts`, `pages/BookDetailPage.tsx`, `api/books.ts` and their unit tests) reads `readings[]`. A new optional field shouldn't break them, but a unit-test fixture typed against the generated `BookReading` would need `purpose`. `tsc -b` in `check:api` shows it.

This run extended one shared helper. The existing leaf that uses it still passes (`npm run check:py`: 2135 passed, 2 skipped):
- `_section` (`backend/tests/test_agent_mount.py:151`) gained `numbered` (keyword only, default `False`). With `numbered=True` it also matches a `<n>. ` step number before the title. The README leaf calls it without the parameter, so its behavior is unchanged.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **Pytest, AC-1:** `get_book.readings[*].purpose` for a Book read twice (the finished Reading's and the current one's), for a Reading with no Purpose (`null`), and that `GET /api/views/book` gives the same (the tool is the view).
- [ ] **Pytest, AC-1:** if `fetch_notes.py` (or a successor) is kept as a pure transform: fed `get_book` JSON for a finished Book, a Main book in progress, a Side read and a never-started Book, it gives the same `status`, `currentPage`, `finishDate`, `purpose`, notes order and `missing` as the old script gave for the same library.
- [ ] **Pytest, AC-1:** the README's Agent tools section and the skill name the same reconnect step (one wording, no drift).
- [ ] **Manual, AC-2:** in AC-3's real session, name a title with two editions in the `--dev` library (e.g. seed DDIA 1st and 2nd edition) and record that the agent lists both and asks.
- [ ] **Manual, AC-1:** in AC-3's real session, a finished Book's summary uses "Why I read this" and the "What I learned (finished <Month YYYY>)" progress line, as before.

## Helper probes

Helpers reused: `connect_mcp` (`backend/tests/conftest.py`); `McpClient` (`backend/tests/agent_client.py`); `LibraryBuilder` (`backend/tests/builder.py`); `_structured` (`backend/tests/test_agent_read.py`). Extended, probed: `_section` (`backend/tests/test_agent_mount.py`, `numbered`).

Helpers added (all in `backend/tests/test_notes_summary_skill.py`):
- `_skill_files`: every file in the skill's folder with its text. No existing helper reads a skill folder.
- `_sha256`: the sha256 of a text. A one-liner over `hashlib`, used to compare the pinned sections.
- `HTTP_CLIENT`, the `/api/(views|intents)/` scan and the `curl` command-line pattern: the three text matchers the AC-1 leaf uses. No existing test scans a script for HTTP clients.

Shipped numbers: none quoted. The ACs give no size; the pinned hashes are of files and sections as they ship at `43e9260`, computed in this run.

Storage keys: no new localStorage key.

Render-before-read: no Playwright leaf, and no leaf reads a rendered page. The leaves read files from disk and one tool answer (`get_book`, which `_structured` checks before the read). No leaf was changed for it.

Border widths: none asserted.

The probe ran from a temporary file, then removed with `rm`: `backend/tests/test_notes_summary_skill_probe.py` (`cd backend && uv run pytest -q -p no:cacheprovider --no-cov tests/test_notes_summary_skill_probe.py`, 4 passed on the second run). The first run's one failure was the probe's own expectation, not a helper: it expected `never (pick|choose|guess)` to refuse "never picking", but that phrasing should pass, so the probe was corrected and the pattern kept.
- **`_section(numbered=True)`:** on a fixture with `## 1. Start`, `## 3. Write the summary` (with a `### Sub` inside) and `## Plain`, it gave the body up to `## 4. Next`, `### Sub` included, and found `Plain` with or without `numbered`. **Refused:** the numbered heading without `numbered` (`None`, the old behavior), a partial title (`Write the`), and `## 3.Write the summary` with no space.
- **`_skill_files`:** gave exactly `SKILL.md`, `scripts/build_docx.cjs` and `scripts/fetch_notes.py`.
- **`_sha256` and the pins:** `_sha256("abc")` equals `hashlib.sha256(b"abc")`. The four sections of today's SKILL.md hash to `OUTPUT_SECTIONS_SHA256`, and `build_docx.cjs` to `BUILD_DOCX_SHA256`. **Refused:** `"abd"`, and "Build the document" with `Georgia` changed to `Arial`.
- **The `/api/(views|intents)/` scan:** `fetch_notes.py` gave `/api/views/book`, `/api/views/catalog`, `/api/views/home`, and SKILL.md gave none. **Refused:** `/api/health` and `/api/export`.
- **`HTTP_CLIENT`:** matched `import urllib.request`, `from urllib import parse`, `import httpx`, an indented `import requests`, `fetch(url)`, `require('https')`, `require("node:http")`, `from 'node:https'`, `curl -fsS …` and `wget …`, and `fetch_notes.py`. **Refused:** a comment with the word "requests", `require('fs')`, `import json`, prose "the user requests", "makes no `curl` call", `x.prefetch`, and `build_docx.cjs`.
- **The `curl` pattern:** SKILL.md gave exactly `curl -fsS http://127.0.0.1:8765/api/health`, and a fenced `curl http://…/api/views/home` was found. **Refused:** "makes no `curl` or HTTP call".
- **AC-2's patterns:** `never (pick|choose|guess)` matched "Never pick one yourself." and "never picking", and not today's SKILL.md. **Refused:** "pick the one that fits". `\bedition\b` matched "its edition and type". **Refused:** "editions", and today's SKILL.md. "ask which one" matches today's SKILL.md.

No helper changed after its probe passed.

## TDD Red Phase

Generated: 2 pytest leaves, both `@pytest.mark.skip(reason=RED)`. `npm run check:py` stays green with them skipped (2135 passed, 2 skipped). The red runs below ran after the probe above last passed, on a throwaway un-skipped copy that was then removed with `rm` (`backend/tests/test_notes_summary_skill_redrun_probe.py`):
- **AC-1** fails at its first assertion: `{'scripts/fetch_notes.py': ['/api/views/book', '/api/views/catalog', '/api/views/home']} == {}`.
- **AC-1's `get_book` tail**, run alone in a second copy with the static part removed, fails at `assert [None] == ['Why Arrakis']`. `_structured` passed first, so the tool answered and only `purpose` is missing.
- **AC-2** fails at its first assertion: `re.search('\\bnever (?:pick|choose|guess)', …)` is `None` on today's SKILL.md.
- **AC-3** has no leaf (manual).

`git status` after the runs lists no `*.probe.*` file and no throwaway copy.

## Next Steps (Task-by-Task Activation)

1. In `bmad-build-auto`, remove `@pytest.mark.skip(reason=RED)` from a leaf when its task starts.
2. Run it and see it fail at its first assertion, then implement until it passes: `cd backend && uv run pytest -q tests/test_notes_summary_skill.py`.
3. Add `purpose` to `BookReading`, update `test_book_view.py:90`, and regenerate the API types.
4. Leave AC-3 open in the spec for Oleg's real session against `--dev`, as Story 12.1 did for its AC-8.
5. Finish with `npm run check`.
