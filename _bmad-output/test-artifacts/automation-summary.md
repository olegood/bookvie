---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-20'
storyId: '12.5'
storyKey: '12-5-let-an-agent-fetch-a-book-s-cover-from-its-address'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md (Boundaries, Review Findings, Review Triage Log, Design Notes)
  - _bmad-output/test-artifacts/atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-5 done)
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 12.5 entries)
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/cover_fetch.py (`CoverFetcher`, `_Clock`, `_open`, `_get`, `_exchange`); backend/bookvie/agent/tools.py (`_book_tool`)
  - backend/tests/test_cover_fetch.py; backend/tests/test_agent_cover_url.py; backend/tests/cover_server.py; backend/tests/helpers.py (`RecordingLock`); backend/tests/conftest.py (`connect_mcp`)
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.5 Let an agent fetch a Book's cover from its address

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI, so every new test is pytest in `backend/tests/`. No Playwright test was added, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the spec with its review records, and the ATDD checklist's seven green-phase follow-ups.
- **Order:** this run started after the code review's commit `b4fdceb` landed, with a clean tree, and the story `done`.
- **Generation:** sequential, in this session, as for Stories 12.3 and 12.4. It is one Python module and one test level.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` don't apply: the run wrote no Playwright test, and the repo has no Pact artifacts.

## Coverage plan

The build and the review already covered five of the seven follow-ups (`test_cover_fetch.py`). This run added leaves for what was still open, plus two seams the review rejected as "needs new seams in `Net`". Those turned out to need only a wrapper around `net.connect`.

| Target | Level | Priority | Why |
|---|---|---|---|
| The download runs outside the AD-4 lock; only the save takes it (both tools) | API (MCP tool, `connect_mcp`) | P1 | AD-21's order. A download under the lock would stall every other intent for up to 30 s. |
| A server that stalls the TLS handshake, or stalls after the request, is refused at the deadline | Unit (fetcher, local listener) | P1 | AD-21's one deadline. The lookup and body stages were already tested; these are the other two branches (`_open`, `_get`). |
| An address that refuses the connection falls through to the next checked one | Unit | P2 | `_open`'s loop, rejected in review as untestable without seams. |
| No checked address answers: "couldn't connect" | Unit | P2 | The loop's end. |
| A certificate failure is not retried on the next address | Unit | P2 | Retrying would show "couldn't connect" instead of the TLS reason. |
| A download refusal comes alone, not merged with a bad field | API (MCP tool) | P2 | The spec's Design Notes choice. It was untested, while the merged cover-path case was tested. |

Scope: selective. AC-1 to AC-5 are P0 and already covered by the 95 ATDD leaves and the review's additions. No duplicate of an existing level was added.

## Files

- **Updated:** `backend/tests/test_cover_fetch.py` gained 8 leaves in a new "Automation follow-ups" section (6 tests, 2 of them parametrized over 2 values) and 2 test hosts (`wrong-twice.example`, `hop5.example`). It also gained the `Staller` listener and the `_refusing` connect wrapper. The file is now 690 lines.
- **Updated:** `_bmad-output/test-artifacts/atdd-checklist-12-5-let-an-agent-fetch-a-book-s-cover-from-its-address.md`. All 7 follow-ups and the implementation checklist are resolved: 13 ticked, 2 retired. `grep -cF '[ ]'` gives **0**.
- No source file changed. No shared helper changed: `RecordingLock` is reused as it is, and `Store.open` is patched per test with `monkeypatch`.

## Validation

- **New leaves:** `uv run pytest tests/test_cover_fetch.py` gave 74 passed. The selected new and neighboring leaves ran 10 times in a row, 23 passed each time. The new leaves each take about 0.5 s or less: the two stall cases take 0.5 s, the deadline they test.
- **Mutation checks** (each an edit, a run, and a revert of that same edit; `shasum` confirmed both source files restored):
  - Fetching under the store lock in `_book_tool`: both lock leaves fail.
  - `_open` giving up after the first refused address: the fall-through leaf fails.
  - Dropping `_open`'s `SSLCertVerificationError` clause: the not-retried leaf fails.
  - Dropping the `clock.expired` check in `_open`: the handshake stall fails. Dropping it in `_get`: the headers stall fails. Each stage pins its own branch.
  - Not mutated: the comes-alone leaf. It pins the current order by its exact field list and summary, so any merge changes both.
- **Lint and format:** `ruff check` and `ruff format` are clean on the file.
- **Full check:** `npm run check` exited 0 in this run: pytest 2099 passed (the review's 2091 plus these 8), unit 388 passed, e2e 799 passed, and the smoke run reported ok. The 3 pytest warnings come from existing leaves in `test_cover.py` and `test_restore_refusals.py`, not from this run.
- **Checklist:** no CLI or browser session was opened. Temporary scripts stayed in the session scratchpad, not the repo.

## ATDD checklist

Remaining `[ ]` lines: **0**.
- **Retired:** "AC-4 through a real server". The CLI has no fetcher seam, so the call would reach the real network, which AC-5 forbids. The default fetcher is already run in-process through a tool, and the first real download is Story 12.8's (deferred-work entry from the code review).
- **Retired:** the `cryptography` decision. It is kept transitive, and its deferred-work entry carries it.

## Assumptions and risks

- The stall leaves assert `elapsed < 3` s against a 0.5 s deadline. The wide margin is deliberate: the message proves which branch refused, and the time bound only shows the OS timeout wasn't what fired.
- Still untested, as the review recorded: a successful download through the real DNS, connect and OS trust store. Story 12.8 is the first.

## Next

Story 12.5 has its four pipeline steps. Epic 12 continues with Story 12.6 (`backlog`), so the epic-boundary steps don't apply yet. Optional: `bmad-testarch-test-review` on `test_cover_fetch.py`, which has grown across three steps.
