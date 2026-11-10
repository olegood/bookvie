---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: 'pile-arrow-key-navigation'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-pile-arrow-key-navigation.md (Intent, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-pile-arrow-key-navigation.md
  - _bmad-output/implementation-artifacts/deferred-work.md (code review of spec-pile-arrow-key-navigation, 2026-11-10)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/card-notes-pile-keys.spec.ts; frontend/e2e/card-notes-pile.spec.ts; frontend/e2e/pile.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Pile arrow keys (spec-pile-arrow-key-navigation)

The previous version of this file held the summary for Story 5.4. It's in git history (`b654c32`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest. Both frameworks are in place. This change touched only the frontend.
- **Mode:** BMad-integrated. The spec is `done` after bmad-code-review (`be51001`). It's a standalone spec with no `sprint-status.yaml` entry.
- **Flags:**
  - `tea_use_playwright_utils: false`, so the traditional fixture and network patterns apply (`e2e/fixtures.ts`).
  - `tea_use_pactjs_utils: false`, and there's no contract testing.
  - `tea_browser_automation: auto`, but `playwright-cli` isn't installed.
- **Knowledge:** I read test-quality in full. For test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, fixture-architecture, network-first and playwright-cli, I read only the headings.
- **Existing coverage:**
  - **Keys:** `card-notes-pile-keys.spec.ts` has 8 leaves, AC-1 to AC-8, all active and green. They use Dune (4 notes) and Neuromancer (1 note) on the Card notes page.
  - **Story 5.4:** `card-notes-pile.spec.ts` (25 leaves) holds the Tab-trap leaf, which presses ArrowRight on the radios, and the axe leaf in light and dark.

## Coverage Plan

**Browser exploration:** skipped. `playwright-cli` isn't installed, and the 8 keys leaves already drive the pile. The targets come from the code, the ATDD checklist's green-phase follow-ups, and the two reviews' triage logs.

**Source and API analysis:** there's no backend or contract change (spec, Never), so there are no API or backend targets.

**Gaps and targets** (selective: only what the checklist and the reviews left open, with no duplicate coverage):

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| G1 | On Book detail's pile, Right, End and Home step, and the move is announced. It's the same component as on Card notes, so one smoke leaf is enough. | E2E | P2 | ATDD follow-up "AC-1: the keys work on Book detail's pile too". The 8 leaves only open the pile from the Card notes page. |
| G2 | At a short viewport (360×300, where the dialog overflows) with a 30-note list behind the pile: End and Home from Next leave both `window.scrollY` and the dialog's `scrollTop` unchanged, while the note moves. Home on the focused Page order radio leaves `scrollTop` unchanged too. | E2E | P2 | ATDD follow-up "AC-6, scroll". Both reviews noted that AC-6 was proven only through `defaultPrevented`, and that the "Home on a radio doesn't scroll" result was a one-off probe. This leaf turns the probe into a regression test. |
| G3 | Holding Right (auto-repeat keydowns) stops at "4 of 4" with no wrap. | E2E | P2 | ATDD follow-up "AC-1, held key". It's the realistic way to reach an end. |

**Covered already (tick with evidence, no new test):**
- **AC-7, axe:** the `[P2] axe` leaf in `card-notes-pile.spec.ts` ran green with the attributes in place (33/33 at build and review).
- **AC-4, Shuffled:** the AC-4 leaf already picks Shuffled with Right, then Page order with Left, staying at "1 of 4".
- **The build lines** (handler, `aria-keyshortcuts`, EXPERIENCE bullet, activation, 5.4 re-run): done in `c792de6`.

**Not automated:**
- AC-5's full 4-keys × 4-modifiers matrix, and a `keyTarget` unit test. Both reviews rejected these as low. AC-1, AC-2, AC-5 and AC-8 already fail on each guard or mapping mutation (verification-gap layer).

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API) and 3B-backend:** not launched. There are no targets, because the change touched no backend code or contract.
  - **3B-e2e:** G1 to G3.
- **Fixtures:** none added to `e2e/fixtures.ts`. The spec gained three local helpers:
  - `pageRefButton` and `cardNotesBlock`, copied from `card-notes-pile.spec.ts`, where they're private.
  - `scrollState(dialog)`, which reads `window.scrollY` and the dialog's `scrollTop` once both have stayed the same for 30 animation frames.
- **Review of the worker's output:**
  - The worker found that **Home on a focused Order radio scrolls an overflowing dialog**. I re-probed with a wait for the scroll to settle: `scrollTop` went 64 → 0. Both reviews had rejected this as `false` because of my earlier probe, which read the position before Chromium's smooth keyboard scroll started.
  - Oleg chose to fix it now:
    - `stepByKey` now `preventDefault`s Home and End on a radio and still doesn't step. The arrows stay native.
    - G2 now asserts that the dialog doesn't scroll there.
    - The spec has a Spec Change Log entry, and its two triage logs carry correction notes.

## Tests Added

**E2E** (`frontend/e2e/card-notes-pile-keys.spec.ts`, describe "Pile arrow keys automate"): 3 tests, all P2.
- "AC-1 on Book detail's pile, Right, End and Home step the pile, announced, with focus kept on Next" (:383), for G1. It also asserts that the opener in `main` is the Card notes block's own.
- "AC-6 in an overflowing pile over a scrollable page, Home and End step without scrolling the dialog or the page, and Home on a radio neither steps nor scrolls" (:410), for G2. It uses 30 notes at 360×300, with a precondition that both the dialog and the page can scroll. Scroll is read only once it settles.
- "AC-1 holding Right auto-repeats to the last note and stops there, with no wrap" (:455), for G3. It records `event.repeat` as `[false, true×7]`, so the test really exercises auto-repeat.

**Totals:** 3 tests. `card-notes-pile-keys.spec.ts` now has 11.

**Defects found: 1, fixed.** Home and End on a focused Order radio scrolled an overflowing dialog. `CardNotesPile.tsx`'s `stepByKey` now `preventDefault`s them there and still doesn't step. Oleg chose the fix.

## Validation

- **`TZ=Europe/Madrid npm run check`: exit 0.**
  - pytest: 1320 passed, backend coverage 98%.
  - Unit: 281 passed.
  - e2e: 507 passed.
  - ruff, Prettier, oxlint, `tsc` and the `api:gen` byte check are all clean.
- **Stability:** the new block passed `--repeat-each=5`, 15 of 15 runs, both before and after the fix.
- **Mutation checks:** each leaf fails with its production rule broken. Every file was restored afterwards, and the only `frontend/src` change left is the fix.
  - G1: Home returning `index`.
  - G2: `preventDefault` removed for handled keys (the worker's check), and the radio Home/End `preventDefault` removed (my check).
  - G3: ArrowRight wrapping (`(index + 1) % total`).
- **Quality checklist:**
  - No hard waits: `scrollState` waits on animation frames, not on time.
  - No conditionals, and explicit assertions in the test bodies.
  - G2 and G3 carry precondition assertions.
  - Seeded through `seededServer`, and parallel-safe.
  - No `.only` or skips.
- **No CLI sessions were opened.** The worker's JSON output is in this session's scratchpad, not in the repo.

## ATDD Checklist

`atdd-checklist-pile-arrow-key-navigation.md`:
- 10 lines ticked: 5 build lines and 5 green-phase follow-ups, each with evidence.
- **Remaining `[ ]`: 0.**

## Deferred Work

- No test deferrals.
- The code review's open entry (build-auto marked a standalone spec `done` before code review) is a workflow-customization item. It stays open.

## Assumptions and Risks

- G2 depends on Chromium's smooth keyboard scrolling settling within 30 stable frames. A read that's too early would pass vacuously. The mutation checks show the leaf does catch the scroll when it happens.
- The radio Home/End fix reads EXPERIENCE.md's "Home and End do nothing" on the radios as "not even scroll". The arrows keep their native behaviour, so AC-4 is unchanged.

## Next

The pile arrow keys have finished the pipeline: ATDD, build, code review and automate. Epic 5 was already closed by Story 5.4. Next is the **Epic 5 retrospective** (`bmad-retrospective`), then the epic's trace and gate and the spine reconciliation, before Epic 6's first story.
