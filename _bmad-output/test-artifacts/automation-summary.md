---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-19'
storyId: '12.4'
storyKey: '12-4-let-an-agent-add-and-edit-a-book'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-12-4-let-an-agent-add-and-edit-a-book.md (Review passes, Review Findings, Design Notes)
  - _bmad-output/test-artifacts/atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml (12-4 done)
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 12.4 entries)
  - _bmad/tea/config.yaml
  - backend/bookvie/agent/tools.py (`_write_tool`, `advertised_schema`, `ADD_BOOK`, `EDIT_BOOK`); backend/bookvie/agent/server.py; backend/bookvie/intents/edit_book.py (the Side-read back-fill)
  - backend/tests/test_agent_write.py; backend/tests/test_agent_edit_form.py; backend/tests/test_agent_mount.py; backend/tests/helpers.py; backend/tests/agent_client.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
---

# Automation Summary: Story 12.4 Let an agent add and edit a Book

## Preflight

- **Stack:** `fullstack` (auto). The story has no UI, so every new test is pytest in `backend/tests/`. No Playwright test was added, so no browser session was opened and the Playwright fragments weren't loaded.
- **Mode:** BMad-integrated. The inputs were the spec with its three review records, and the ATDD checklist's seven green-phase follow-ups.
- **Generation:** sequential, in this session, as for Story 12.3. It is one Python module and one test level.
- **Knowledge:** the six core fragments only. `tea_use_playwright_utils` and `tea_use_pactjs_utils` don't apply: the run wrote no Playwright test, and the repo has no Pact artifacts.

## Coverage plan

| Target (ATDD follow-up) | Level | Priority | Test |
|---|---|---|---|
| `pages_below_card_note`, a `null` form key | API (contract case) | P2 | `edit_book-pages-below-card-note`, `add_book-null-title`, `edit_book-null-title` (both nulls refused on `intent`, by tool and route alike) |
| `removeCover` on a Book with a cover | API (contract case) | P2 | Already covered by the build's review (`edit_book-remove-cover`, `edit_book-keeps-cover`) |
| TR8's other commit steps | API (contract case) | P1 | 4 cases: `fault-at-fsync` and `fault-at-replace` for both tools |
| A back-filled Side read leaves the Side reads | API (contract case and leaf) | P2 | `edit_book-success-back-fills-a-side-read`, and `test_a_finish_date_on_a_side_read_with_no_readings_takes_it_off_the_side_reads` |
| More partial edits | API | P1 | `test_each_partial_edit_book_is_refused_naming_exactly_its_missing_keys`: `{bookId}` alone, `{}`, every key but `spineColor`, and missing keys plus `coverUrl` (the missing-key refusal comes first) |
| A call without `arguments` | API | P2 | `test_book_tools_called_without_arguments_are_refused_as_an_empty_intent`: `add_book` answers as the route does for an `intent` of `{}`, and `edit_book` names all 14 required keys |
| find_book, then get_book, then edit_book | API | P1 | `test_find_book_then_get_book_then_edit_book_changes_only_what_was_asked`: the stored Book differs only in `publisher` |
| A handler raising something other than `IntentError` | API | P2 | `test_an_unexpected_failure_in_a_book_tools_handler_is_couldnt_save_as_the_routes_500` (2 tools) |
| Schemas and a commit on a real process | Integration (subprocess) | P1 | `test_a_real_bookvie_process_advertises_both_book_tools_and_commits_an_add`: both `advertised_schema`s, `edit_book`'s `required`, and an `add_book` commit |

**Scope:** selective. Where a case can express a target, it goes in the contract table, because the table already compares tool with route. The leaves cover only what the table can't: what was stored, a refusal the route never makes (missing keys), no `arguments`, a broken handler, the agent's three-call flow and a real process.

**No-arguments note.** Story 12.3's no-arguments leaf compares the tool with a route call that has no `intent` part. That comparison doesn't hold for `add_book`. Every one of its keys is optional, so `{}` reaches the handler and is refused field by field, while a route call with no part is refused on `intent`. The new leaf compares the tool with the route's answer to an `intent` of `{}`, which is the tool's actual input.

## Files

- **New:** `backend/tests/test_agent_book_write.py`. It holds Story 12.4's section, moved out of `test_agent_write.py`: the forms, `BOOK_CASES` and the six existing leaves. It also has the new follow-ups. The TEA enforcement hook refuses test files over 1000 lines, and `test_agent_write.py` would have reached 1028.
  - `BOOK_CASES` grew from 22 to 30.
  - 6 new leaves, 10 test items in all.
  - New constants: `MAIN_FORM`, `SIDE1_FORM`, `BOOK_SUCCESSES`, `SIDE1_FINISHED_ON`, `EDIT_REQUIRED`, `ALL_BUT_SPINE_COLOR`.
  - The module binds 12.3's `same_ids` fixture with `same_ids = test_agent_write.same_ids`. An import would make ruff flag the fixture parameter as F811.
- **Updated:** `backend/tests/test_agent_write.py` (725 lines).
  - Story 12.4's section is gone, and the docstring points to the new module.
  - `BOOK_TOOL_NAMES` stays here, because two 12.3 leaves assert the cumulative list.
  - Two helpers were extracted from 12.3 leaves without changing their assertions: `_assert_a_broken_handler_breaks_tool_and_route_alike` and the `running_bookvie` context manager.
- **Updated:** `backend/tests/test_agent_edit_form.py` imports `FINISHED_FORM` and `FORM_KEYS` from the new module.
- **Updated:** `_bmad-output/test-artifacts/atdd-checklist-12-4-let-an-agent-add-and-edit-a-book.md`. Its 7 follow-ups and 6 implementation lines are ticked with their tests, and a note records the move. `grep -cF '[ ]'` gives **0**.
- No source file changed.

## Validation

- `cd backend && uv run pytest -q -p no:cacheprovider --no-cov tests/test_agent_book_write.py tests/test_agent_write.py tests/test_agent_edit_form.py tests/test_agent_mount.py tests/test_layers.py`: 327 passed. The new module collects 44 items.
- The first run failed both null cases: the route refuses `title: null` on `intent`, not on `title`. The route is the reference, so the expectation changed to `("intent",)`. The tool and route answers were already equal.
- `uv run ruff format` and `uv run ruff check tests/` are clean.
- **Mutation probes.** Each was an edit followed by its exact reverse, and afterwards `git status` showed no source change.
  - Disabling the Side-read removal in `intents/edit_book.py` failed the back-fill leaf. The twin case still passed, as expected, because the route shares the handler.
  - Making `_write_tool` refuse only when 2 or more keys are missing failed `all-but-spine-color`.
- **Full check:** `npm run check` exited 0 after the tests were added.
  - ruff was clean.
  - pytest: 1931 passed. The build's last count was 1913 (1912, plus pass 2's editForm test), and this run adds 18: 8 contract cases and 10 leaf items.
  - Unit tests: 388 passed.
  - `schema.d.ts is up to date`.
  - e2e: 799 passed.
  - The smoke test was ok.
- No probe file, browser session or temporary artifact was left behind. The check log is in the session scratchpad, outside the repo.

## Assumptions and risks

- `same_ids` now lives in one module and is used from another through an assignment. If `test_agent_write.py` renames it, the new module fails at import, loudly.
- **Not covered, deferred by the reviews:**
  - `_edit_form` and the panel's `toPanelFields` have no shared check (spine drift AD-6/AD-21).
  - An unchanged future finish date doesn't round-trip, and neither does an untrimmed stored subtitle or ISBN (pre-existing, low).
  - All of these are in `deferred-work.md` under Story 12.4.

## Next

- Commit the automation changes: `test:` (story 12.4).
- Then Story 12.5 (`bmad-testarch-atdd`). Epic 12 is still in progress, so `trace` and the retro come at its last story.
