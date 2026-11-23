# Rubric review: Epic 14 delta (card note boxes)

Scope: the Epic 14 diff to `ARCHITECTURE-SPINE.md`, judged against `card-note-boxes-plan-2026-11-23.md` D1–D15, EXPERIENCE.md → Card notes shelf, and the code as of 2026-11-23. Companion: `review-freshness-epic14.md`.

## Checklist

| Criterion | Verdict |
| --- | --- |
| Fixes the real divergence points for 14.1–14.3 | Mostly. The wire shape (14.1), the remembered view key (14.2), group order, one matcher, the color source, and the carried-search mechanism (14.3) are all pinned. One gap remains in the carried-search trigger (R-H1). |
| Every Rule enforceable and prevents its stated divergence | Yes for AD-6 and AD-15. AD-7's rule can be tested with Playwright (PUSH/POP/reload), except the REPLACE case (R-H1). |
| Nothing left unsaid that lets two units diverge | R-H1 and R-M2. |
| Ratifies, not contradicts, existing code | Yes. `spine_color`, `noteMatches`, the `catalogView` pattern and the one-route page all exist. AD-7 deliberately supersedes the "new scope starts empty" comment at `CardNotesPage.tsx:132`, and that is the intent. |
| Covers plan D1–D15 (architecture-relevant parts) | Yes: D1/D7 (groups, order), D3/D5 (AD-15), D6/D9 (lib/ step and totals), D10/D11 (one matcher), D12/D13 (AD-7), D14/D15 (`spineColor` on group and scope). D2, D4, D8 and D11's a11y wording are UX-only and correctly left out. |
| Terse, decisions not rationale; no UX bloat | Mostly. A few duplications of EXPERIENCE/DESIGN detail and one broken sentence (R-M1, R-L1, R-L2). |

## Findings

### High

**R-H1. AD-7's trigger ("on a `?book=` change") misses a same-URL REPLACE.** In react-router 8.5.1, clicking the nav **Card notes** link on the unscoped shelf is a REPLACE with a new `location.key` but no `?book=` change. Under AD-7 the text stays, but EXPERIENCE.md → Starts empty says "the nav" empties it. Story 14.3's ATDD and build could pick opposite readings.
*Fix:* reword the trigger to "on each location change while mounted (a new `location.key`)", and add "a REPLACE" to the starts-empty list. Details are in freshness F-H1.

### Medium

**R-M1. The AD-6 "server computes" list is broken by the inserted sentences.** After "…story 5.3)." come two new sentences, then "The Main book's note count on Home (`cardNoteCount`, story 5.3), the Home bookcase slice's priority, stats …, and the `book` view's `editForm` …" This is now a verbless fragment, so it's unclear whether those items are still server-computed.
*Fix:* keep the list intact and attach the color as a parenthetical on the `card-notes` item: "…the `card-notes` view's groups (…; story 5.3), each group and the scope carrying `spineColor`, the Book's stored resolved color (AD-11) as stored, the scope even with no notes (story 14.1), the Main book's note count …".

**R-M2. Where the text lives is underspecified against today's keyed body.** `CardNotesBody` is remounted per `?book=` by its `key`. "Lives only in the Card notes page's React state" leaves two ways to build it: lift the text above the key, or drop the key. Dropping the key changes the reset of `useSearchCount`, the add/edit/pile flows and the refs per scope.
*Fix:* add one clause to AD-7: "held in `CardNotesPage` above the per-scope body, which still remounts per `?book=`." (Freshness F-M1.)

### Low

**R-L1. The pile height steps are duplicated from EXPERIENCE/DESIGN.** "1 note → 1 card, 2–5 → 3, 6–20 → 5, 21 or more → 7" also appears in EXPERIENCE.md → A box and plan D6. The architectural decision is only *where* it is computed (`lib/`).
*Fix:* "The pile's height step (EXPERIENCE.md → Card notes shelf) and the count line's totals … are computed in `lib/`."

**R-L2. AD-7 carries rationale inline.** "because the browser keeps a history entry's state across a reload" and "since the shelf and the open box are one route" are reasons, not decisions. The first one is load-bearing, but it could be a clause in Prevents.
*Fix:* optional. Trim to "never in the URL, in storage or in `history.state` (which survives a reload)".

**R-L3. AD-21 isn't touched, though `get_card_notes` gains `spineColor`.** The memlog records that the MCP read tool returns the same view, but the spine doesn't say so. It is additive and harmless (no MCP output schema; `test_agent_read.py:252-279` asserts only ids and lengths), but plan D15 says "No other server change".
*Fix:* append "(`get_card_notes` returns it too, AD-21)" to the AD-6 `spineColor` clause.

**R-L4. "Tiles' `spine-unread-*` colors" is the wrong owner.** The unread styling is shared by Bookcase, Tiles, SpinePopover and Cover.
*Fix:* "never the unread spine styling (`--color-spine-unread-*`)". (Freshness F-L1.)

**R-L5. Which `spineColor` the open box strip uses.** The strip uses "the view's `spineColor`". On the scoped page both the scope and its single group carry it, and for a Book with no notes only the scope does.
*Fix:* "the open box strip uses `scope.spineColor`".

**R-L6. Carried text when the open box loses its field.** If the open box's last note is deleted while searching, the field is no longer rendered (`shownQuery` is `''` without groups), but `query` state persists. Removing the chip then carries invisible text back to the shelf. EXPERIENCE says "the text in the field at that moment".
*Fix:* one clause: "a page with no notes carries an empty text", or accept the edge in Deferred.

**R-L7. Follow-up outside the spine.** EXPERIENCE.md → Card notes shelf → Temporary → *Notes for architecture* is removed "until the architecture spine records them". This delta records all four, so the note's condition is met once this lands.
*Fix:* remove that note in the next UX touch, or in story 14.1's docs pass.

## Not findings (checked)

- `spineColor` non-null: `Book.spine_color: str` is always resolved, so a required string in the schema is correct.
- AD-15 wording matches `catalogView.ts` behavior exactly. Export/restore exclusion follows from "UI preferences live in localStorage".
- The map row and the seed (`lib/cardNotesView`, `components/CardNoteBox`) are consistent with the plan's story cut, and "planned" is marked.
