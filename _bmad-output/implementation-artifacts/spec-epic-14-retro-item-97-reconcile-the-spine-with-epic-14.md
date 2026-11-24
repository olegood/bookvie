---
title: 'Reconcile the architecture spine and the planning text with as-built Epic 14'
type: 'chore'
created: '2026-11-24'
status: 'done'
route: 'oneshot'
baseline_commit: 'c2ca001e8c182bcfc6e5739b45cd6c5516ffdae6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-retro-2026-11-24.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 14's stories deferred seven "spine drift" entries to `deferred-work.md` (from `spec-14-2` … `spec-14-5`), and the spine still marks Boxes · List, the open box strip, the shelf search and the carried search as planned. `epics.md` still holds UX-DR92's temporary staging and three wording slips, and DESIGN.md doesn't say what a pale spine does to the open box strip (Epic 14 retro E14-SP1, E14-S1, E14-S2, E14-S4; item 97; sprint item `epic-14-retro-item-97-reconcile-the-spine-with-epic-14`).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so it states what the code does, checked against the code: the Capability → Architecture Map's lead-in and FR-17 to FR-19 row as built; the Structural Seed's `components/` line with `ViewToggle` generic (Catalog's and the Card notes toolbar's) and the `lib/` line with `cardNotes`' box match counts, pill and shelf sentence, `useSearchCount`'s two lines and `carriedSearch`; the client presentation list's search item (line 118) naming the shelf sentence; AD-7's "Where the text lives" recording the second scroll after a client-side POP.
- Add a `resolved:` line to the seven drift entries (`deferred-work.md:1757`, `:1760`, `:1766`, `:1781`, `:1793`, `:1799`, `:1811`) and to the closed test-gap entry at `:1808` (closed by `carried-search-automate.spec.ts:225`, `:248`, `:350`).
- `epics.md`: retire UX-DR92 (line 357) as removed by Story 14.4; fix Story 14.3's "reached from Book detail" to the Main book card (`:3554`), Story 14.4's "14 card notes" example to 17 (`:3585`), and the gate's "pass unchanged" to name Story 14.5's AC-3 exception (`:3416`). Resolve `deferred-work.md:1769`, `:1784`, `:1802`.
- DESIGN.md → Open box strip (line 813): record that a spine close to the page color reads faintly, and the "In *X*" chip names the box (Oleg's decision in the Epic 14 retro, 2026-11-24). Resolve `deferred-work.md:1775`.
- Fix the stale pointer in `atdd-checklist-14-2-see-my-card-notes-as-boxes.md:115` (`card-note-boxes-automate.spec.ts:258` → `:265`; trace gap G5).
- Out of scope: item 98 (the stale-cache fixes, the faded box's name, EXPERIENCE.md, `deferred-work.md:1787`), item 99 (the spine's stale-cache rule), any code. `README.md` is not edited.

</frozen-after-approval>

## Implementation Notes

- **Count:** 7 open "spine drift" entries, each closed with a `resolved:` line naming where the spine now says it. The same scan as items 82 and 89 (an entry is a line starting `- ` and its indented lines; count those whose text holds "spine drift" in any case and that have no `resolved:` line) gives 7 before and 0 after. Five non-drift entries are also resolved (`:1769`, `:1775`, `:1784`, `:1802`, `:1808`). The two Epic 14 entries left open are the 14.1 `back-to-top.spec.ts:290` flake (watch) and the faded box's name (`:1787`, item 98).
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` already 2026-11-24). Each statement was checked against the code at `c2ca001`:
  - **Client presentation list, search item (line 118):** the client counts matching notes for "N notes match." on the List and the open box, and for the shelf sentence (`shelfCountLine`) in Boxes view, which `status` reads from the view shown when the pause ends (`countLine` read by `useSearchCount` in `CardNotesPage.tsx`).
  - **AD-7, Where the text lives:** the second scroll after a client-side POP, once the view is `ready` and on the next frame, only after a POP (`restored`, `scrolledReady` in `CardNotesPage.tsx`).
  - **Structural Seed, `lib/`:** `cardNotes` gains the shelf's pile step, box name, "M of N" count and pill, count line and shelf sentence; `useSearchCount` the shelf sentence; a new `carriedSearch` entry (`useCarriedSearch`, `carryState`, AD-7).
  - **Structural Seed, `components/`:** `ViewToggle` is the generic toggle (`label`, `options`) used by Catalog's and the Card notes toolbar.
  - **Map:** the lead-in says every row is built, FR-19's Boxes view in Epic 14; the FR-17 to FR-19 row names `ViewToggle`, the shelf search's functions, the strip (`CardNotesFrame`, `--open-box-strip-height`) and `lib/carriedSearch`, with no "planned".
- **`epics.md`:** UX-DR92 marked `[Retired 2026-11-24 …]` in the style of FR-2's retirement, its text kept as history; Story 14.3's strip AC names the Main book card; Story 14.4's AC-2 example says 17; the gate names Story 14.5's AC-3 exception. The other UX-DR92 mentions (Story 14.2's requirements and AC, Story 14.4's "staging is gone" AC) are history of what those stories did and stay.
- **DESIGN.md → Open box strip:** one sentence accepting the faint strip for a pale spine. The token block is untouched, so `e2e/app-shell.spec.ts`'s token comparison is unaffected.
- **ATDD:** `atdd-checklist-14-2-…md` line 115 now cites `card-note-boxes-automate.spec.ts:265`, where the AC-11 Back to top axe leaf is (trace gap G5).
- **Not changed:** code, EXPERIENCE.md, `README.md`; item 98's and item 99's scope.
- **Review patches:** AD-7 gains "The module" (`lib/carriedSearch.ts`, `useCarriedSearch`, `carryState`), which the 14.5 drift entry also named. The search item (line 118) and the Seed's `useSearchCount` say the hook is generic and the page's `countLine` picks the line, also read once for a carried search's announcement. The Seed's `components/` line is reworded so "Catalog's toolbar" labels SortSelect, SortDirectionToggle and FilterChips. `epic-14-context.md`'s "List is unchanged" bullet names Story 14.5's chip-leaf exception, as `deferred-work.md`'s gate entry asked. The matching `resolved:` lines are updated.
- **Verification:** drift scan 7 before, 0 after (re-run after the patches). Format and lint check before the commit (below).

## Review Triage Log

Blind Hunter (8 findings):

- `medium`, patch: AD-7's carried-search bullets didn't name `lib/carriedSearch.ts`, though the 14.5 drift entry (`deferred-work.md:1799`) asked for it. Fixed with "The module" bullet.
- `medium`, patch: the Seed and line 118 gave `useSearchCount` the shelf sentence, but the hook is generic (`lib/useSearchCount.ts`, `line(query)`); `countLine` in `CardNotesPage.tsx:226-229` picks the line, and the carried announcement reads it too (`:264`). Reworded, with the two `resolved:` lines.
- `low`, patch: `epic-14-context.md:19` still said the Card notes specs pass "with no edit to their files", which the gate entry (`deferred-work.md:1802`) names. One clause added.
- `low`, patch: the Seed's `components/` line read as if FilterChips were "Catalog's toolbar". Reworded.
- `false`: "no Verification section, still in progress". The spec was mid-run; this log, the verification line and `status: done` are written at finalize, as item 89's were.
- `low`, rejected: the ATDD pointer fix is outside the retro's Changes list. It is in this spec's frozen intent (trace gap G5) and is a one-line pointer.
- `low`, rejected: Story 14.2's and 14.4's requirement lines list UX-DR92 without a marker. Their history is what those stories did, and the retirement is on the requirement's own line, as FR-2's is; the Epic 14 trace already treats 14.2 AC-10 as superseded.
- `low`, rejected: `resolved:` lines name sections, not line numbers. Line numbers shift with every spine edit; the sections are named.
