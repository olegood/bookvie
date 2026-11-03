---
title: 'Reconcile the architecture spine with as-built Epic 1'
type: 'chore'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The architecture spine lags decisions that Epic 1 stories made and tested (F-S2, F-R5). AD-18 doesn't list the ID-uniqueness invariants. AD-3 says only file-carrying intents are multipart, but every intent is. AD-5 shows health without `pid`, and AD-16 has no same-folder hand-over. AD-9 knows `book_not_found` only as a 409, not as the book view's 404. AD-2 and AD-12 don't mention the startup refusal when `library.json` is missing but `covers/` holds files. And `.staging/` is created and swept, but nothing in Epic 1 uses it. `epic-1-context.md:48` repeats the old multipart rule. Epic 1 retro action item 2.

**Approach:** Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does, citing the decision it came from, and fix the same claims in `epic-1-context.md`. For F-R5, keep `.staging/` (the structural seed reserves it for restore scratch, AD-14) and say in AD-12 that covers aren't staged: they're written as `covers/<name>.tmp*` and renamed. No code changes.

</frozen-after-approval>

## Implementation Notes

- **Spine** (`_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md`, `updated` 2026-11-03):
  - AD-2: startup refusal when `library.json` is missing and `covers/` has any entry (story 1.13).
  - AD-3: every intent is multipart.
  - AD-5: health carries `pid`; the young-lock "starting" state.
  - AD-9: the book view's 404 `book_not_found` (story 1.11), body-parse 422 (retro item 8), and unknown `/api` paths not enveloped.
  - AD-12: no staging for covers, `.staging/` reserved for restore (F-R5), and the sweep removing `covers/*.tmp*`.
  - AD-16: the conditional same-folder hand-over (story 1.2).
  - AD-18: the ID-uniqueness invariants.
- **Context** (`epic-1-context.md`): fixed the same claims in the CLI, Store, Intents and views, Response envelope and Covers bullets, including the stale line 48.
- **Scope kept:** retro item 7 (AD-3 last-writer-wins) is its own item and is not in this change. No code changes.

## Review Triage Log

- Spec unfinished, item still open: false. The finalize step does both.
- Hand-over written as unconditional; `--no-browser` left out: medium. Patched in AD-16 and the context. The lockless-server edge when health has no `pid` is deferred (pre-existing code, low).
- `hand_over_lock` doesn't fsync: low. The lock is runtime state, not data. Rejected.
- AD-5 leaves out the young-lock "starting" state: medium. Patched.
- AD-9 and the context miss the body-parse 422, unknown `/api` 404/405, and the 404 in the envelope bullet: medium. Patched.
- `PAGES_BELOW_CARD_NOTE` isn't in the spine: low. AD-9 lists codes as "e.g.", and the code belongs to Card notes (Epic 5). Rejected.
- Item 7 is missing from AD-3: false. It is a separate retro item, done next in order.
- Missing citations on AD-3, AD-5, AD-12 and AD-18: low and cheap. Patched (AD-3 cites nothing because it records as-built behaviour from 1.12/1.14).
- Context only partly reconciled (invariants, cover temp names): low. Patched.
- Startup refusal stated loosely ("holds files", "anything in the folder"): low and cheap. Patched to "any entry" and "before `library.json` or `covers/` changes".
- Structural Seed and Capability Map lag the modules: low, outside item 2. Deferred.
- No spine change log: low. The git history and this spec trace it. Rejected.
