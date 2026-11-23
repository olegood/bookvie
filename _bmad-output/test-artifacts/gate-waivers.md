# Gate waivers

Waiver requests filed against a `bmad-testarch-trace` gate, one `## {ID}: {title}` heading per waiver, with the fields of `trace-template.md` → "Waiver Details". The trace reads and validates each waiver. A waiver never changes the derived gate decision (step 5, rule 6), and the gap it covers stays in the gap analysis and in every coverage percentage.

## W-13-1: Epic 13 gate, 13.1 AC-11's manual record

- **Gate:** Epic 13 trace, `_bmad-output/test-artifacts/traceability/epic-13-traceability-matrix.md` (gap G4).
- **Covers:** 13.1 · AC-11 (P0), the manual gate-2 run in a Claude Code terminal session.

**Original Decision:** ❌ FAIL

**Reason for Failure:**

- The AC asks the spec to record "the runs, the message as shown, and what VS Code and `claude -p` do with the same call".
- `spec-13-1-restore-my-library-through-an-agent-with-two-confirmations.md:258` records run A (accept) in detail.
- Runs B and C (decline bookvie's question, deny the permission prompt), VS Code and `claude -p` are recorded only as Oleg's "everything is ok" (`:259-260`).
- The message as shown is not transcribed.

**Waiver Information:**

- **Waiver Reason:** this is a gap in the record, not in the behavior.
  - The runs were made and passed (Oleg, 2026-11-22).
  - What the message says is pinned by tests: `test_agent_restore.py:332`, `:691` and `:707` (13.1 AC-5, FULL) assert that the elicitation text equals `confirmation_text` for the exact file, as plain text.
  - Every decline path is covered by `test_agent_restore.py:525` and `:799` (13.1 AC-6, FULL): each one changes nothing.
  - On 2026-11-23 the retro's real-server probe (`epic-13-retro-2026-11-23.md:212`) captured the message bookvie sends, word for word.
  - Repeating runs B and C now would only re-record what was already seen.
- **Waiver Approver:** Oleg Anastassov, product owner and sole user.
- **Approval Date:** 2026-11-23
- **Waiver Expiry:** 2026-12-23. It covers the Epic 13 gate only, and never a later epic's gate.

**Monitoring Plan:**

- Oleg's first real restore through `/bookvie-restore` (retro E13-B9, the first production restore from a Dropbox pick) is the next run of bookvie's question in a terminal. Record what it showed.
- Escalation criteria: if any restore in a real session shows a message that differs from `confirmation_text`, or a decline that changes anything, treat it as a P0 defect and reopen 13.1.

**Remediation Plan:**

- **Fix Target:** the Epic 13 re-trace after retro items 89 to 92 land, or the first real restore, whichever comes first.
- **Due Date:** 2026-12-23
- **Owner:** Oleg
- **Verification:** `spec-13-1`'s "Manual runs (AC-11)" section quotes the message as shown in the terminal, and says what a decline at each prompt showed. A re-trace then counts 13.1 AC-11 FULL, and this waiver is closed with a `closed:` line.

**Business Justification:**
bookvie is a single-user app, and the only user is the one who ran and approved the manual runs. The automated tests already establish the AC's safety content: the message's text, the fail-closed declines and the unchanged library. What is missing is a transcript, not evidence that the confirmation works. Holding the gate on the transcript alone would delay Epic 14 without reducing any risk. The waiver keeps the gap visible, time-boxed and tied to the next real restore.
