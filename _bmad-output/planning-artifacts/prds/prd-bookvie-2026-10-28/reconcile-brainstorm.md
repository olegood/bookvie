---
title: Reconcile brainstorm-intent vs PRD
created: 2026-10-28
source: _bmad-output/brainstorming/brainstorm-personal-library-tracker-2026-10-27/brainstorm-intent.md
target: prd.md, addendum.md (later decisions per .memlog.md)
---

# Reconcile: brainstorm-intent.md vs bookvie PRD

Scope: what the brainstorm contains that the PRD silently dropped or distorted. Changes recorded in `.memlog.md` were treated as intentional and are not reported. These include: the required fields, deferring shelves, no per-day page logs, no dated progress events, no local API, duplicate matching on title + author, language and publisher being required, type affecting donation only, wishlist as a separate list, Cards shipping with flash cards, and the downgraded paper-logging risk.

Severity: **High** = a behaviour rule lost or contradicted. **Medium** = a rule weakened or left ambiguous. **Low** = detail or tone lost.

## Spot-checked examples (from the request)

| Item | Brainstorm | PRD | Verdict |
|---|---|---|---|
| Side reads have no nudges | "Side reads are an untracked 'also reading' marker: no logs, no stats, no nudges." | Glossary §3 "Side read" says "no nudges". FR-8 lists only "no progress, logs or stats". | Partly covered. See F-9. |
| Sequence's next book only suggested as Up next | "The reader always chooses the main book. A sequence's next book is only suggested as Up next." | Missing from §6.2 Sequences. §4.2 says "Nothing starts automatically" only in general terms. | Gap. See F-2. |
| Donated unread books greyed out | "A donated unread book stays in its sequences, greyed out, and its pages are excluded from sequence progress." | §6.2 Donation, and FR-15 Sequence scope. | Covered. |
| Re-reading welcome | "A full re-read of a finished book is a new Reading. Re-reading is welcome." | FR-5 has the mechanics. The "welcome" intent is missing. | Gap (tone). See F-4. |
| Rest days may include card review | "Day type is the reader's own choice. Rest days may include card review." | FR-19: "A Rest day may still include card review." | Covered. |
| Marathon recap | "Marathon (with recap card)" | §6.2: "and a recap card". | Covered. The recap's content is undefined, which is fine for Later. |

## Findings

### F-1 (High): The Main book returning as Up next after a Marathon was dropped
- **Brainstorm:** "Starting a marathon pauses the main book, which returns as Up next afterwards."
- **PRD:** §6.2 Sequences says only "Starting a Marathon pauses the Main book." What happens when the Marathon ends is missing.
- **Why it matters:** this is exactly the "paused book is never resumed" failure the product exists to fix. A Marathon is a planned interruption.
- **Fix:** in §6.2 Marathons, append: "When the Marathon ends or is paused, the previously paused Main book returns as Up next (an existing Up next is handled as in FR-7)."

### F-2 (High): "A sequence's next book is only suggested" is missing
- **Brainstorm:** "The reader always chooses the main book. A sequence's next book is only suggested as Up next." Also: "The reader always chooses the main book. Nothing auto-starts."
- **PRD:** missing from §6.2 Sequences. §4.2 says "Nothing starts automatically; Oleg always chooses", but only for the Main book flow, not for Sequences.
- **Why it matters:** when Sequences are built later, the obvious implementation is to auto-advance to the next book, which breaks the conscious-reading pillar.
- **Fix:** add to §6.2 Sequences: "Finishing a Book in a Sequence never starts the next one. The Sequence's next Book is only offered as Up next, and Oleg confirms through FR-5."

### F-3 (Medium): "Waiting for you" is redefined in a way that conflicts with the brainstorm
- **Brainstorm:** "Waiting for you: a visible list of paused items, oldest first, with no cap." Also: "Anything can be paused, books and marathons alike."
- **PRD:** the Glossary and FR-7 call it "the list of paused **Readings**", which leaves out paused Marathons. FR-7 also adds "If something was already Up next, that Book moves to Waiting for you." An Up next Book that was never started has no paused Reading, so by the PRD's own definition it does not belong in that list.
- **Fix:** define Waiting for you as "paused items (Readings and, later, Marathons)". For a displaced Up next Book that was never started, either return it to the catalog with no state, or say explicitly that Waiting for you can also hold displaced Up next Books. Choose one and make FR-7 and the Glossary agree.

### F-4 (Medium): The intent that re-reading is welcome and moves progress is missing
- **Brainstorm:** "Re-reading is welcome." The problem statement: "re-reading feels like no progress, motivation drops". Pillar: "Every real reading effort must visibly move something."
- **PRD:** FR-5 only covers the mechanics ("Starting a finished Book creates a new Reading"). Nothing says re-reading is encouraged. FR-10 does not say what happens when Oleg sets a lower current page, for example to re-read lost context after an interruption. The gauge would drop, which is a failure signal the pillar forbids. Review pages and rewind are Later, which matches the brainstorm's buckets, but the MVP behaviour of a lowered page is undefined.
- **Fix:** (a) In §1 pillars or §5 Tone, add: "Re-reading is welcome. A re-read is a full Reading, counted again in stats (FR-17), and is never shown as lost progress." (b) In FR-10, state what a lower current page does. Suggested: allowed, with no red or negative display. Alternatively, the percentage stays at the highest page reached until the current page passes it again.

### F-5 (Medium): Topic and Marathon sequence rules were dropped
- **Brainstorm:**
  - "Sequences (optional, for focus and fun; can be created as plans up front)"
  - "Topic: open-ended, no clock. Books can be skipped or reordered unless already read."
  - "Marathon: a reading-time budget (e.g. 24h of total reading). It can be extended or paused."
  - "Progress lives on the Book/Reading, not on a sequence."
- **PRD:** §6.2 lists Topic sequences, Marathons and Weekend sprints. It keeps "no overrun penalty", time chips, and membership in many Sequences. It drops creation as plans up front, skip and reorder (and the rule that read Books are locked in place), Marathon extension, and the rule that progress lives on the Reading. The Glossary has Marathon pause only.
- **Fix:** expand the §6.2 Sequences bullets. Topic: "skip or reorder any Book not yet read". Marathon: "time budget (e.g. 24h), extendable and pausable". Add: "Sequences can be created as plans before any Book in them is started", and "a Sequence holds no progress of its own; it is derived from its Books' Readings".

### F-6 (Low): Check-in no longer leads to the next action
- **Brainstorm:** "Deep and Light open page logging, Cards opens card review, Rest only marks the day."
- **PRD:** FR-12 and FR-19 keep Day types separate from pages, which `.memlog.md` decided ("Reading calendar decoupled from pages"). That decision removes per-day page attribution. It does not clearly remove the convenience flow (Deep or Light → current-page field, Cards → card review), and nothing replaces it.
- **Why it matters:** the fast catch-up target (<30 s, §5) and the "logging slower than paper" risk both benefit from that flow.
- **Fix:** in FR-12, add: "Choosing Deep or Light for today offers the FR-10 page field; choosing Cards offers card review (once FR-19 ships). Neither is required." If the decoupling decision was also meant to remove this flow, note that in `.memlog.md`.

### F-7 (Low): Donation destination types are not listed
- **Brainstorm:** "The record holds a destination type (university, public library shelf, gift, public place) + a free-text note + a date."
- **PRD:** §6.2 says "a destination type, a note and a date" without the four values.
- **Fix:** list the four destination types in §6.2 Donation.

### F-8 (Low): Detail lost on the Later items that carry the intent
- **Brainstorm:**
  - "Colour-filling cover as progress bar (wishlist outline, grey unread, filling while reading, vivid when read)"
  - "Smart shelves (saved filters, can seed a marathon pile)"
  - "'What I can do now' wall of fulfilled purposes"
  - "Dust layer on long-unread books"
- **PRD:** §6.2 keeps only the names: "colour-filling cover progress", "smart shelves", "a 'What I can do now' wall", "a dust layer". The wall dropping "of fulfilled purposes" is the most significant loss. It is the payoff of the conscious-reading pillar (Purpose → fulfilled? → wall).
- **Fix:** restore the parenthetical definitions in §6.2. They are short and keep the intent for whoever builds them later.

### F-9 (Low): Side read constraints are incomplete in FR-8
- **Brainstorm:** "no logs, no stats, no nudges" and "Only the main book counts toward goals and stats."
- **PRD:** the Glossary has "no nudges" and Main-only stats and goals. FR-8 Consequences omit nudges and goals. FR-8 also does not say that promoting a Side read while a Main book exists goes through the FR-5 confirmation.
- **Fix:** in FR-8, add: "No nudges (FR-11 does not apply), and no contribution to goals. Promotion uses the FR-5 confirmation when a Main book exists."

### F-10 (Low): The PRD's framing of history clashes with "Simplicity beats completeness of history"
- **Brainstorm:** "Simplicity beats completeness of history." Also: "Dropping a book = exclude it from the sequence. No history of the exclusion is kept."
- **PRD:** JTBD §2.1 says "Never lose my reading history", and §5 says "no action silently deletes reading history". The Won't list does keep "no history of abandons or exclusions", so the rules agree. The prominent framing, though, puts history first, which can push later design toward audit trails.
- **Fix:** in §1 Simplicity or §5 Data safety, add: "History is kept for Readings, finishes and donations only; simplicity beats completeness, so exclusions, abandons and per-day page logs are deliberately not recorded."

### F-11 (Low): Reading time has no home outside Marathons
- **Brainstorm:** "Reading time: entered by hand only (quick chips like +15m/+30m/+1h). Approximate, for fun." This sits in the core domain model, not under Marathon.
- **PRD:** reading time appears only inside §6.2 Marathons. It is not in the Glossary, it is not in the FR-22 export list, and it is not in stats.
- **Fix:** add a Glossary entry for "Reading time (hand-entered, approximate, for fun)". State whether it is Marathon-only or general (Later), and include it in the FR-22 export once it exists.

## Covered and consistent (no action)
Pillars, the urgency-chain problem, Book → Readings, one Main book with the start-confirmation wording, Pause keeping the page, Up next receiving an interrupted Main book, an uncapped list oldest-first, Day types picked by Oleg and never inferred, a calendar with no streak that never resets, owned/donated with no borrowed books, physical-only donation that keeps history, a donated unread Book greyed out, many-Sequence membership with read-in-one counting as read-in-all, drop = exclude, audiobook as pages with no format, Purpose wording, a finish ceremony with yes/partly/not yet plus 1–5 stars, in-app next-visit nudges only, flash cards in order or shuffled, Rest that may include cards, Cards tied to flash cards, the Goals bundle, the marathon recap and overrun with no penalty, a near-finish guard that only advises, user-uploaded covers, free-form tags, and the Won't list.
