---
title: 'Reconcile the UX wording with what Epic 11 accepted'
type: 'chore'
created: '2026-11-17'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-retro-2026-11-17.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-4-tell-me-when-a-tab-is-older-than-the-app.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 11 retro item 79 (E11-S1; sprint item `epic-11-retro-item-79-reconcile-ux-wording-with-epic-11`), due before Epic 12. Story 11.4's AC-6 and EXPERIENCE.md say the update notice is announced once per new version, but what shipped and was accepted is weaker. The notice skips its announcement when another message is pending (`shouldAnnounce` / `isAnnouncing()`). When an intent's own refetch finds the new version, the intent's `announce()` clears the notice's announcement. Neither case is retried: the band and **Reload** stay. The 11.4 review called the AC-6 wording "a spec edit, out of scope here" and never filed it. Separately, EXPERIENCE.md's About this copy row says its `h2` is "like the page's other headings", but Backup has only that one `h2`.

**Approach:**
- EXPERIENCE.md: the update notice's **Announcement** bullet and the Live regions paragraph say the notice is announced once per new server version, unless another message is pending, or an intent's own message follows it. In both cases the band and **Reload** stay and the announcement is not retried.
- epics.md: Story 11.4's AC-6 says the same, and so does UX-DR70, which it traces to.
- EXPERIENCE.md About this copy row: drop "like the page's other headings". It is the page's only `h2`, under the `h1` "Backup".
- Wording only. No code, test or spine changes.

</frozen-after-approval>

## Implementation Notes

- Behavior to describe (from `frontend/src/components/UpdateNotice.tsx`, `lib/updateNotice.ts` `shouldAnnounce`, `lib/announce.ts` `isAnnouncing`, `api/intents.ts:49`): the notice announces when the version it shows changes. It skips that announcement while another message is pending in the tick. When a save or another intent's refetch finds the version, the notice announces first, and the intent's own `announce()` then empties the regions and replaces it. An opening panel empties them too. The effect is keyed on the shown version, so it never retries.
- **Changed:** EXPERIENCE.md, in the Update notice **Announcement** bullet, the Live regions paragraph, the About this copy row (now "an `h2` under the `h1` "Backup"", with no count, so it doesn't go stale), and Flow 12 step 3 ("hears the sentence once" now points at Live regions). epics.md, in UX-DR70, and Story 11.4, where AC-6 keeps its happy path and a new Given/When/Then states the unannounced cases. The exception covers any message or panel/dialog opening within the tick, not only an intent's, because `announce()` and `clearAnnouncements()` empty the regions for every caller. "Once per server version" became "each time it appears or names a new server version", because the effect is keyed on the shown version, so a hide and re-appearance announces again (settled as per-appearance in the 11.4 review).
- `deferred-work.md:1107` (Story 11.3 review, About this copy wording) gets a `resolved:` line.
- Not changed: FR-27 ("announced once, never on every check" is an upper bound and still holds), `epic-11-context.md` (a derived cache for a finished epic), the spine (item 75 already recorded the yield in AD-7), `spec-11-4-…md` (a closed story spec, kept as its historical record), and the doc comments in `UpdateNotice.tsx`/`announce.ts` (wording-only item, no code; `isAnnouncing`'s comment already names any waiting message).
- Checks: grep over `_bmad-output/planning-artifacts` finds no "other headings", no unqualified "hears the sentence once.", and no "announced once per server version".
- Sprint item 79 is marked `done` in `sprint-status.yaml` in the same commit. The commit type is `docs:`, because every file is Markdown or `sprint-status.yaml`.

## Review Triage Log

### 2026-11-17: Blind Hunter, pass 1

Floor N = 5 (about 20 kB). It reported 10 findings.

- `[low]` `[patch]` Flow 12 step 3 still promised "hears the sentence once". Qualified, with a pointer to Live regions.
- `[low]` `[patch]` `deferred-work.md:1107` (the About this copy wording) had no `resolved:` line. Added.
- `[low]` `[patch]` "An intent's own message follows it" was too narrow: `announce()` clears the regions for every caller (counts, Stats, panels), and a panel opening sets no message. Reworded to "the regions are emptied within the tick, by any later message or a panel or dialog opening".
- `[low]` `[patch]` The four places listed different cases. They now name the same ones.
- `[low]` `[patch]` AC-6's nested "then" was hard to parse. AC-6 is restored to its happy path, and the exception is its own Given/When/Then.
- `[low]` `[patch]` "Once per new server version" was too strong: a hide and re-appearance announces again (`[shown]` effect). Now "each time it appears or names a new server version".
- `[false]` The spec claimed a `sprint-status.yaml` change it hadn't made: Finalize sets it before the commit, as in item 78.
- `[low]` rejected: no verification step. A grep check is now recorded in Implementation Notes, and a oneshot spec has no AC section.
- `[low]` `[patch]` The "Not changed" list omitted `spec-11-4` and the `UpdateNotice` comment. Both are now named, with reasons.
- `[low]` `[patch]` "The page's only `h2`" would go stale. The count is dropped.
