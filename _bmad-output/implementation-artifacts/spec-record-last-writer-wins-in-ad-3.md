---
title: 'Record in AD-3 that intents are last-writer-wins'
type: 'chore'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-3 says nothing about concurrent intents from several tabs (F-R1). No intent carries a version or precondition, so every field is last-writer-wins: a stale Edit panel in one tab silently undoes a color change made in another, and a stale "Remove cover" removes a cover uploaded later. PRD assumption A2 ("Last write wins across tabs") and AD-19's Targeting bullet already imply this, but AD-3, which owns intents, doesn't state it. Epic 1 retro action item 7.

**Approach:** Add a concurrency clause to AD-3 in `ARCHITECTURE-SPINE.md`: intents carry no version or precondition and apply to the server's current state, so the last intent wins per field across tabs. Record it as an accepted deviation for single-tab use (Oleg, 2026-11-03), closing F-R1, with the revisit trigger: the cataloging agent editing while the app is open in a tab. Docs only; no code changes. Update `epic-1-context.md` only if it states the rule.

</frozen-after-approval>

## Implementation Notes

- **Spine** (`ARCHITECTURE-SPINE.md`): added a **Concurrency across tabs** bullet to AD-3 after its Rule. It cites AD-4 (serialization) and A2 (PRD addendum: "Last write wins across tabs"), names both F-R1 cases, notes the modal Edit panel prevents it within one tab, records the acceptance (Oleg, 2026-11-03; closes F-R1), and gives the revisit trigger and the fix shape from the adversarial review (`revision` + `expectedRevision`).
- **Deferred:** extended "Stale confirmation guard" (name kept, so R-11 in `test-design-progress-system.md` and `epics.md` still resolves) to a version precondition on intents, with the fix shape, F-R1, and both revisit triggers.
- **Prevents:** narrowed AD-3's "stale whole-document writes" to "whole-library writes", which is what AD-3 prevents; a stale form intent can still overwrite fields, as the new bullet says.
- **Context:** `epic-1-context.md` doesn't state the concurrency rule (its Concurrency bullet covers only the in-process lock), so it is unchanged.
- **VG3** (no multi-tab stale-edit test) needs no test now: the behaviour is accepted, not guarded.

## Review Triage Log

- Cataloging agent already a client, so the trigger is today's reality: low. The agent adds Books, which a stale Edit panel can't overwrite; only editing an existing Book is the risk. Patched the trigger to "edits an existing Book".
- "Accepted deviation" names no baseline; LWW is A2 itself: medium. Patched: the bullet says this is A2 as written and that the silent loss (F-R1) is the accepted deviation.
- Prevents line ("stale whole-document writes") conflicts with the bullet: low and cheap. Patched to "whole-library writes".
- No link to AD-19 Targeting: low and cheap. Patched. Bullet sits beside Rule rather than under it, with no marker: false; the AD is already `[ADOPTED]` and other ADs use sibling bullets.
- Mechanism (open form keeps its values; AD-7 refetch doesn't refresh it) and the reload remedy missing: low and cheap. Patched.
- Renaming the Deferred entry breaks R-11's reference: medium. Patched by keeping the old name.
- Deferred entry lacks the fix shape and F-R1: low and cheap. Patched.
- Sprint-status still open, spec still in-progress: false. The finalize step does both in this commit.
- VG3 closed by implication; the two-context refetch AC is untested: false for this change. That AC (`epics.md:1440`) belongs to an Epic 2 start-reading story, and VG3 is about the stale overwrite, which is now accepted.
- Missing cases (stale Start dialog, edit on a Book deleted elsewhere): low. The Start dialog is in the Deferred entry; an edit on a deleted Book is a 409 `book_not_found` refusal (AD-9), not last-writer-wins. Rejected.
