---
title: 'Split Bookcase.tsx into hooks and book_fields.py into modules (Epic 3 retro item 26)'
type: 'refactor'
created: '2026-11-07'
status: 'done'
baseline_commit: 'a294ccb126a710ee7e80265bc4cccbbe373dc4ca'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `frontend/src/pages/Bookcase.tsx` grew from 304 to 613 lines in Epic 3. It holds the keyboard model, the spine popover and Start dialog, row packing, the Home slice and the finish-moment phase machine. Story 4.6 will grow it again. `backend/bookvie/domain/book_fields.py` (316 lines) mixes the form parser with labels, Finished-on rules and spine colors (Epic 3 retro F-A1, PL-10, action 7; Epic 1 retro item 9).

**Approach:** Behavior-preserving extraction. Bookcase gets three hooks in `frontend/src/lib/`: `useSpinePopover`, `useFinishMoment` and `useSliceRows`. Three leaf domain modules are split out of `book_fields.py`, and the importers are updated directly.

## Boundaries & Constraints

**Always:**
- No behavior change. Rendered markup, class names, aria attributes, focus order, timings and the copy stay byte-for-byte the same.
- The existing tests pass unchanged. The only test edits allowed are import paths: `tests/test_edit_book.py` imports `long_date` and moves to `finished_on`.
- Hook calls stay at the position of the code they replace, so the order of layout effects, passive effects and render-time setStates is preserved:
  - capacity measuring comes before focus-follow;
  - focus-follow comes before label-height measuring;
  - the phase setState comes before the stopId setState, which comes before the openId setState.
- The hooks live in `.ts` files with named exports, following `lib/useAlertDialog.ts`: an `Options` input type, a typed return and a prose header comment.
- Inline lint-disable comments move with their code, keeping their reasons, including `anchor`'s deliberate `rows` dependency.
- Format only the changed files, with the pinned tools (AGENTS.md).

**Never:**
- New features, renamed CSS classes, or changed public props of `Bookcase`.
- A re-export shim for moved Python names.
- Touching `Bookcase.module.css` or any e2e spec.
- Moving the keyboard model (`keyDown`, `verticalNeighbour`, `MOVES`), the focus-follow and label-measuring layout effects, or `spineButton` out of Bookcase. They stay; 4.6 will reshape `spineButton`.

</frozen-after-approval>

## Code Map

- `frontend/src/pages/Bookcase.tsx`. The parts that move out:
  - finish block: types `FinishMoment` (exported, l.45) and `MomentPhase`; constants and helpers l.61-74; state and render setState l.222-232; effects l.236-295; the per-spine moment logic in `spineButton` l.444-460 and the `onTransitionEnd`/`onAnimationEnd` handler l.488-495.
  - popover block:
    - state `openId` (182), `startingId` (185), `refocusId` (334);
    - refs `popoverRef`, `closedByPress`; `shelf` (189);
    - the close-on-hidden render setState (307); `openBook`;
    - `anchor` (310-313); `closePopover`, `openStart`, `cancelStart`, `fallbackTarget` (315-347);
    - effects 349-359 and 361-383 (outside pointerdown, `FOCUSABLE`);
    - in `spineButton`: `open` (454), the click handler (496-501).
  - slice block: `capacity`, `allIds`, `mainId`, `rows`, `ids`, `byId` (191-201) and the ResizeObserver layout effect (207-219).
  - What stays in Bookcase: `buttons`, `shelfRef` and `focusTargets` (passed into the hooks as refs), `stopId`, `visibleIds`/`visible`, `keyDown`, the focus-follow and label layout effects (385-423), `spineButton`, the JSX, and the finish line in the header (545, which reads raw `finishing`).
- `frontend/src/lib/slice.ts`: pure `rowCapacity`/`sliceRows`, reused as they are by `useSliceRows`.
- `frontend/src/lib/useAlertDialog.ts`: the convention for the hook files.
- `frontend/src/pages/HomePage.tsx:16`: imports `Bookcase, { type FinishMoment }`. Bookcase re-exports the type, so HomePage doesn't change.
- `frontend/src/pages/CatalogPage.tsx`: imports the default `Bookcase` and `Bookcase.module.css`. Unchanged.
- `backend/bookvie/domain/book_fields.py`. Map:
  - `LABELS` 18-35; `CURATED_SPINE_COLORS` 37-47;
  - regexes 53-58; messages 60-72; `_MONTHS`/`long_date` 74-92;
  - message builders 95-112; `BookFields`/`FieldFailure`/`FinishedOnRule` 115-135;
  - list parsers 138-157; private parsers 160-188;
  - `parse_finished_on` 191-201; `in_form_order` 204-207;
  - `parse_book_fields` 210-301; spine colors 304-316.
- The importers (11): `intents/{book_form, intent_model, contract, cover, set_spine_color, finish_reading, edit_book, add_book}.py`, `views/shelf.py`, `domain/duplicates.py`, and the tests `test_book_fields.py`, `test_duplicate_book.py:313` and `test_edit_book.py:28`. None imports a private name, and nothing patches these symbols by string.
- `backend/scripts/coverage_gate.py`: domain ≥ 90% as one package; every domain file is at 100% now. `tests/test_clock.py:88` and `tests/test_layers.py` pick up the new files automatically.
- `ARCHITECTURE-SPINE.md:340`: the domain module list names `book_fields`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/useFinishMoment.ts` -- new. It owns the phase machine, play-once (`momentStarted`, the `finishing` identity), the scroll, the fill and ring timers, reduced motion and the ring-only re-read, and the `FinishMoment` type.
  - Inputs: `finishing`, `inSlice` and `buttons`.
  - It returns the per-book look for `spineButton` (fill style or class, plus the ring) and the fill-end handler.
- [x] `frontend/src/lib/useSpinePopover.ts` -- new. It owns the popover and Start-dialog state, the anchor, close, refocus and outside-press logic, and a click handler that keeps `closedByPress` private.
  - Inputs: `books`, `visible`, `ids`, `rows` (to renew `anchor`), `buttons` and `shelfRef`.
- [x] `frontend/src/lib/useSliceRows.ts` -- new. It covers capacity measuring and slice selection (191-219) and returns `rows`, `ids` and `byId`.
- [x] `frontend/src/pages/Bookcase.tsx` -- call the three hooks where their code was, re-export `type FinishMoment`, and delete the moved code -- the target is a readable component (aim at or below about 380 lines).
- [x] `backend/bookvie/domain/labels.py` -- new, holding `LABELS`, `FieldFailure`, `required_message`, `in_form_order` and the COVER_* messages.
- [x] `backend/bookvie/domain/finished_on.py` -- new, holding:
  - `_MONTHS` and `long_date`;
  - `_DATE`, `_date` and `parse_finished_on`;
  - `FinishedOnRule`;
  - the FINISHED_ON_* messages and `FINISH_DATE_REMOVED_MESSAGE`;
  - the two finished-* message builders.
- [x] `backend/bookvie/domain/spine_color.py` -- new, holding `CURATED_SPINE_COLORS`, `_HEX_COLOR`, `SPINE_COLOR_MESSAGE`, `is_hex_color`, `curated_spine_color` and `resolve_spine_color`.
- [x] `backend/bookvie/domain/book_fields.py` -- keep the parser and its own rules, import from the new modules, and update the module docstring.
- [x] The importers listed in the Code Map -- import each name from its new home, and fix the docstrings that name `book_fields` (`add_book.py:4`, `book_form.py:49,72`).
- [x] `ARCHITECTURE-SPINE.md:340` -- add `labels`, `finished_on` and `spine_color` to the domain list. This is a module map, not an AD change, and lands in the reconciliation window before Epic 4.

**Acceptance Criteria:**
- Given the refactor, when `npm run check` runs (with the full e2e run capped at 4 workers) and the smoke check runs, then every test passes, and the only edited test line is the import in `test_edit_book.py`.
- Given `Bookcase.tsx`, when it's read, then the popover, the finish moment and the slice packing are each one hook call, and the keyboard model, the focus effects and `spineButton` remain.
- Given `book_fields.py`, when it's read, then it holds only `BookFields` parsing. The three new modules import nothing from it, so there's no cycle.

## Implementation Notes

- The three hooks are in `frontend/src/lib/` (`useSliceRows.ts`, `useFinishMoment.ts`, `useSpinePopover.ts`). `Bookcase.tsx` dropped from 613 to 377 lines and re-exports `type FinishMoment`. `cssLength` moved into `useSliceRows`, and `FOCUSABLE` into `useSpinePopover`.
- `useFinishMoment` takes `inSlice` as `(id) => boolean` and returns `spineMoment(book, height)` → `{ fill, ring, onTransitionEnd }`. The fill-end handler is now one stable `useCallback`, not an inline function on every render. `spineButton` reads `height` before `filling`; it's a pure read, so the output is the same.
- The hook dependency arrays now include the stable refs that arrive as inputs (`buttons`, `shelfRef`). `anchor` keeps `[openId, rows]` and its lint-disable comment.
- Backend: `labels.py`, `finished_on.py` and `spine_color.py` are leaves, and none of them imports `book_fields`. The intents import from the new homes, with no shim. `views/shelf.py` (`merge_tags`) and `domain/duplicates.py` (`BookFields`) were unchanged.
- Also fixed: the stale comment at `frontend/src/api/books.ts:15`, which said "backend `book_fields.LABELS`" and now says "`domain/labels.LABELS`".
- Verified: `check:py` passed 1034, with domain coverage at 100%. `check:api` passed, Playwright passed 289 at `--workers=4`, and smoke ok. The only test edit is the `test_edit_book.py` import.

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). The layers were blind-hunter (BH), edge-case-hunter (ECH), verification-gap (VG) and spine-check (SC).

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | SC | No spine findings (AD-3, AD-6, AD-7, AD-11, AD-18 checked); the spine's `updated:` was not bumped | low | `ARCHITECTURE-SPINE.md:10` still says `2026-11-06`, though the diff edits l.340 | patch |
| 2 | ECH | `book_form.py:45` docstring says `:func:\`parse_book_fields\`` unqualified | false | `parse_book_fields` is imported in that module (l.13), so the reference resolves; it was unchanged by this diff and is correct | reject |
| 3 | ECH, VG, BH | Spec task "The importers…" left `[ ]` | false (spec bookkeeping) | Every importer and docstring is updated in the diff; the box is ticked; a fix to this build's spec is not a finding | reject |
| 4 | VG | No test proves the fill ends on `transitionend` rather than the 1000 ms fallback | medium (gap) | `finish-moment.spec.ts` only polls that the ring comes on and goes off within 4 s; a broken `onTransitionEnd` would still pass. The gap predates this diff, which only moved the handler | defer |
| 5 | BH | Moved names still import from `book_fields` (an implicit shim) | low | `book_fields` imports them for its own use, so Python exposes them; no code imports them from there. A guard test adds complexity for a developer-only risk | reject |
| 6 | BH | The "no cycle" acceptance criterion isn't enforced by a test | false | A cycle between domain modules fails at import, so every test run fails loudly; `test_layers.py` keeps the domain layer's imports in check | reject |
| 7 | BH | The new domain modules and hooks have no unit tests of their own | low | Domain coverage is 100% through the existing tests, and the spec keeps the tests unchanged; new test files are more than a direct fix | reject |
| 8 | BH | `finished_on.py` says `FinishedOnRule` serves "finishing a reading" | low | Only `book_form.valid_fields`, via edit-book, takes a rule; `finish_reading.py` calls `parse_finished_on` directly | patch |
| 9 | BH | `labels.py` is misnamed, and it holds the Cover messages | false | `LABELS` is the form's order and labels, which edit-book shares; the docstring states why the Cover messages live there | reject |
| 10 | BH | AC "holds only BookFields parsing" vs `merge_tags` and the `pages_below_*` builders; the docstring omits Title | low | `merge_tags` is used by `split_tags`, and the spec task kept "the parser and its own rules"; the wording is a nit | reject |
| 11 | BH | The finish moment is described twice (Bookcase JSDoc and the `useFinishMoment` header) | low | `Bookcase.tsx:114-122` repeats the hook header almost verbatim; the copies will drift at 4.6; the fix is a deletion | patch |
| 12 | BH | `useSliceRows` takes both `sliceMode` and `priority` | false | Original l.191-219 had the same two inputs; it was moved unchanged, and Bookcase derives both from `props.slice` | reject |
| 13 | BH | `useSpinePopover` returns ten members; its type shares a name with the component; `clickSpine` isn't wrapped in `useCallback` | low | The type is not exported, so there is no clash; `clickSpine` mirrors the original inline handler; style only | reject |
| 14 | BH | The spine's `lib/` line omits the hooks; sprint-status isn't closed | false | The `lib/` line lists 3 of 18 modules by design (the AD-governed ones); retro items are marked done in their own commit after review | reject |
| 15 | BH | The `inSlice` arrow is new on every render | low | It's safe only because the hook calls it during render; a doc note is a direct fix | patch |

## Design Notes

Hooks that share state take refs rather than owning them. `buttons` (a Map of book id to button) serves the keys, the popover, the moment and focus-follow, so Bookcase creates it and passes it on. The moment's fill must already show `from` on the first render, so `useFinishMoment` is called before `spineButton` is built and keeps its render-time setState.

## Verification

**Commands:**
- `npm run check:py` -- expected: ruff clean, all pytest pass, coverage gates ok.
- `npm run check:api` -- expected: contract, Prettier, tsc, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- --workers=4` -- expected: all specs pass, with the same count as before (289).
- `npm run check:smoke` -- expected: ok.
- `git diff --stat -- backend/tests frontend/e2e` -- expected: only `test_edit_book.py`.
