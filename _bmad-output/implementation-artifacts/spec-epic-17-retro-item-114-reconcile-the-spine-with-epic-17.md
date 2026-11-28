---
title: 'Reconcile the architecture spine with as-built Epic 17'
type: 'chore'
created: '2026-11-28'
status: 'done'
route: 'oneshot'
baseline_commit: 'ff72d8df5484645816bb56eab1377ae20d52db28'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-retro-2026-11-27.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 17 left nine unresolved "spine drift" entries in `deferred-work.md` (Epic 17 retro item 114; sprint item `epic-17-retro-item-114-reconcile-the-spine-with-epic-17`). The retro listed five:
- `:1898` (AD-7, same-page bullet): it says `PageHeading`, `StatsPage`'s page key and scroll all call the one `lib/page` function, but only `main.tsx` calls `isSamePageReplace`.
- `:1901` (AD-6, Seed `components/` line, FR-16 row): `components/RatingStars` and `lib/catalog`'s `authorPart` aren't named.
- `:1904` (AD-6, Stats address → Who writes): the parse shape `{ range, from, to, period }` is stale.
- `:1913` (AD-7, FR-16 row): it names `lib/page` and `PageHeading`, not `AppShell`'s `StatsNavLink` or the `main.tsx` subscription.
- `:1919` (AD-6, Stats finished list): it says the heading carries the bucket's count.

Item 112 added four more:
- `:1936`: the rescue covers any removed Stats control.
- `:1939`: the rescue also runs at once on a failed fetch.
- `:1942`: a drop after a shown period empties the status region.
- `:1951` (AD-7, update notice): a status clear can cancel the notice.

**Approach:** Edit `ARCHITECTURE-SPINE.md` so each named place says what the code does at `ff72d8d`. Then add a `resolved:` line to each of the nine entries, naming what changed, as Epic 16 retro item 108 did.

</frozen-after-approval>

## Implementation Notes

- **Scope:** the retro and the sprint item name five entries. This pass closes nine, adding the four that item 112 wrote after the retro, because the next epic's spine gate counts every unresolved "spine drift" entry, whoever wrote it. That is the same reason item 108 closed its later entry. The sprint item's `action` text still says five, and this note records the difference.
- **Line numbers:** the Intent cites `deferred-work.md` at the baseline `ff72d8d`. Each entry gained a `resolved:` line, so the later entries now sit further down.
- **Drift scan:** every `deferred-work.md` entry containing "spine drift" (any case) with no `resolved:` line. 9 before, 0 after.
- **Code facts at `ff72d8d`, checked:**
  - Only `main.tsx` calls `isSamePageReplace`.
  - `PageHeading` and `StatsPage` read the page key through `useNavigatedHere`, and `CardNotesPage` reads only `navigated` (its body is keyed by `location.key`).
  - `StatsNavLink` sits in `components/AppShell`.
  - `StatsFinishedList` uses `RatingStars`, and `lib/stats` uses `lib/catalog` `authorPart`.
  - `parseStatsAddress` returns `StatsSelection`, `parsePeriod` reads `period`, and `arrivalSearch` sits in `lib/stats`.
  - `periodHeading` has no count, and `periodLine` carries the bucket's books.
  - The rescue is `lostFocus` with `settled || failed`, and `failed` means no kept copy (`api/views.ts` `toViewState`).
  - `clearStatus` and `pendingKind` sit in `lib/announce`, and `UpdateNotice` announces through `announce('status', …)`.
- **Spine edits** (`ARCHITECTURE-SPINE.md`, `updated:` 2026-11-28):
  - AD-6: the finished-list item, and the Stats address bullets Who writes, The period and Announcements.
  - AD-7: the same-page bullet and the App info bullet.
  - The Seed's `lib/` line (stats, catalog, announce, page, and the AD tag) and its `components/` line (RatingStars).
  - The FR-16 row.
  - No AD changes its decision; the wording follows the code.
- **Not changed:** code, EXPERIENCE.md, DESIGN.md, `epics.md` and README.
- `deferred-work.md`: a `resolved:` line on each of the nine entries.
- `sprint-status.yaml`: item 114 set to `done`.
- **Verification:**
  - The drift scan above gives 0.
  - `npm --prefix frontend run format:check`, then ruff `format --check` and `check` in `backend/`, before the commit.

## Review Triage Log

### 2026-11-28 — Review pass (Blind Hunter)
- `medium` `patch`: The period said the rescue runs "when the fetch failed", while a failed refetch's kept copy counts as settled. `failed` means no data at all (`toViewState`). It now says "when the view failed with no kept copy". The `:1939` resolved line was matched to it.
- `medium` `patch`: the same-page bullet said `CardNotesPage` reads the page key. It reads only `navigated` (`CardNotesPage.tsx:251`) and keys its body by `location.key` (`:194`). The bullet and the `:1898` resolved line now say so.
- `low` `patch`: the inserted "moves the page key on every other change" repeated the bullet's later `markNavigated` sentence. Deleted.
- `low` `patch`: The period's control list was cut off from "any removed Stats control". It now sits in a parenthesis after it.
- `low` `patch`: "marker" also names AD-7's same-page marker. Now "flag (`lostFocus`)".
- `low` `patch`: the App info sentence called a `clearStatus` release "a later message". Reworded.
- `low` `patch`: the Seed `lib/` tag lacked `announce` under AD-7, and `page` didn't name the page key. Both added.
- `low` `patch`: the spec was thin next to item 108's (no scope note, scan count, code facts or verification). Added above.
- `low` `patch`: the scope widening from five to nine had no reason recorded. It's in the Scope note.
- `low` `patch`: the Intent's line numbers go stale after the inserts. The note says they cite the baseline, and the frozen Intent is unchanged.
- `false`: tracking unfinished (status, triage log, sprint item). This finalize step writes them.
- `low` `patch`: Who writes didn't say `arrivalSearch` keeps `period` only when `range` parsed as given, and its "it" became unclear. Both fixed ("reads the address").
