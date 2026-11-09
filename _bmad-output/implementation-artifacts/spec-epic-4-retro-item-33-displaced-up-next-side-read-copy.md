---
title: 'State the truth when a displaced Up next is also a Side read'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
baseline_commit: '12a8fe43c8df0d80ba7ac555d9dee7b94e476b6b'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When an Up next *Z* with no paused Reading is displaced, the Start and Pause dialogs say "*Z* returns to the catalog." If *Z* is also a Side read that is untrue: *Z* stays in On the side. `StartDialog.tsx` also writes the line inline instead of using `displacementLine` from `lib/pause.ts`, so the two dialogs can drift.

Source: Epic 4 retro F-R3 (`epic-4-retro-2026-11-09.md`), sprint item `epic-4-retro-item-33-state-the-truth-when-a-displaced-up-next`.

**Decision (Oleg, 2026-11-09):** the line is "*Z* stays on the side.", matching the "*X* is on the side." status line.

**Approach:** Add that line for a displaced Up next with no paused Reading that is a Side read, and have both dialogs read one shared function. The server says whether the Up next is a Side read (AD-6), as it does for shelf and detail views.

## Boundaries & Constraints

**Always:** The title keeps its serif `bookTitle` span in the Start dialog. The dialog's accessible description reads the full line.

**Never:** No change to what any intent stores. No change to "*Z* moves to Waiting for you.", which stays true for a paused Side read, since it shows in both panes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paused | *Z* has a paused Reading, Side read or not | "*Z* moves to Waiting for you." | N/A |
| Not paused, not a Side read | | "*Z* returns to the catalog." | N/A |
| Not paused, Side read | | "*Z* stays on the side." | N/A |
| Same in Pause | Pause's Confirm dialog, each state above | same line as Start | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookvie/views/models.py:74` `HomeUpNext` -- add `side_read: bool` beside `paused`.
- `backend/bookvie/views/shelf.py:129` -- set it from `library.side_read_book_ids`.
- `frontend/src/api/generated/schema.d.ts` -- regenerate with `npm --prefix frontend run api:gen`; never format it.
- `frontend/src/lib/pause.ts:16` `displacementLine` -- the one place for the copy. Add an export that returns the text after the title, and build `displacementLine` from it, so `StartDialog` can keep the title in its span.
- `frontend/src/components/StartDialog.tsx:173` -- replace the inline ternary. `usePauseFlow.tsx:184` already uses `displacementLine`, so it needs no change.
- `frontend/src/lib/pause.test.ts` -- unit tests; existing inputs gain `sideRead`.
- `frontend/e2e/side-reads.spec.ts` seeds and `up-next.spec.ts:277` show the pattern; `pause.spec.ts:295` is the Pause equivalent.

## Tasks & Acceptance

**Execution:**
- [x] `backend/tests/test_side_reads.py` -- home view's `upNext.sideRead` is true for a Side read and false otherwise -- red first.
- [x] `backend/bookvie/views/models.py`, `shelf.py` -- add and set `side_read`.
- [x] `frontend/src/api/generated/schema.d.ts` -- regenerate.
- [x] `frontend/src/lib/pause.ts`, `pause.test.ts` -- add the third case, with unit tests.
- [x] `frontend/src/components/StartDialog.tsx` -- use the shared copy; update its doc comment.
- [x] `frontend/e2e/up-next.spec.ts` -- Start dialog with a not-paused Side read Up next shows "*Z* stays on the side.", and after confirming it is still in On the side.
- [x] `frontend/e2e/pause.spec.ts` -- the same line in Pause's Confirm dialog.
- [x] `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md` -- lines 176 and 222, and the copy table at line 95 if it lists these lines.

**Acceptance Criteria:**
- Given a not-paused Up next that is a Side read, when a start or pause would displace it, then both dialogs show "*Z* stays on the side." and never "returns to the catalog".
- Given the confirmed displacement, then the Book is still in On the side and no longer Up next.

## Implementation Notes

- `lib/pause.ts` gained `displacementOutcome`, the text after the title, so `StartDialog` keeps the title in its serif span; `displacementLine` is built from it.
- `backend/tests/test_up_next.py` compares `upNext` exactly, so it gained `"sideRead": false`.

## Review Triage Log

Four layers: Blind Hunter, Edge Case Hunter (none), Verification Gap (none), Spine Check (none).

- medium, patched: the PRD (FR-5, FR-7), DESIGN.md and epics.md still gave two outcomes, and FR-7 stated the claim this fix calls untrue. All now have the third case.
- low, patched: the `StartDialog.tsx` doc comment was left unwrapped.
- low, rejected: no finished Up next that is also a Side read. The copy sees the same `paused: false, sideRead: true` as the never-started case, and `paused` for a finished Book is covered in `test_up_next.py`.
- low, rejected: no e2e of a paused Side read being displaced. The line's copy is unit-tested, the intents don't change, and `side-reads.spec.ts` shows such a Book in both panes.
- low, rejected: "*Z* stays on the side." doesn't say *Z* leaves Up next. That wording is Oleg's recorded decision in the frozen block.
- low, rejected: the Code Map omits `test_up_next.py`. The fix would be editing this spec after the change.
- false: the title-to-outcome join can drift. Both e2e tests assert the full line in each dialog.
- false: `sprint-status.yaml` wasn't updated. It was still to come in this workflow's last step. The Set as Up next path says only "Replaces the current Up next.", which stays true.

## Verification

**Commands:**
- `npm run check:py` -- expected: exit 0.
- `npm run check:api` -- expected: exit 0.
- `npm --prefix frontend run e2e` -- expected: all pass.
