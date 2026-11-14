---
title: 'Align the dropdown arrow with the field padding'
type: 'bugfix'
created: '2026-11-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The arrow of the native `select`s (Catalog Sort select, New book panel Type field) is drawn by the browser right against the right border, about 4px in, while the text sits 12px (`--space-3`) from the left border, so the arrow looks misaligned. Padding does not move Chrome's native arrow.

**Approach:** Every `select` gets `appearance: none` and a drawn chevron, 12px from the right edge and vertically centered, in `ink-secondary` so it follows light and dark themes; the end padding leaves room for it. Forced-colors mode keeps the native arrow. Review every dropdown in the app for the same issue.

</frozen-after-approval>

## Implementation Notes

- Chrome draws the native arrow against the right border whatever the padding (checked live: padding-right 12/24/40px leaves it in place), so `select` in `frontend/src/styles/base.css` gets `appearance: none` and a chevron of two 5px gradient squares in `--color-ink-secondary`, `--space-3` from the right. `--select-padding-end` (34px) reserves its room; forced colors restore the native arrow and 12px padding.
- `SortSelect.module.css` and `TextField.module.css` switch `background` to `background-color` so the chevron survives, and take the end padding (`select.input` only, so text inputs are unchanged).
- Dropdown audit: only two native selects exist (Sort select, SelectField used by Type). Language ▾ / Tag ▾ chips use an inline glyph with symmetric padding (aligned); More actions is an icon button; Tags is a text combobox with no arrow. None need changes.
- Verified: screenshots of Sort and Type in light and dark; oxlint clean; e2e catalog-sort, new-book-panel, app-shell, duplicate-dialog pass. `tsc -b` fails only in the uncommitted, unrelated `e2e/card-note-add-another-automate.spec.ts`.

## Review Triage Log

- medium, patched: forced colors kept the 34px end padding beside the native arrow → reset `--select-padding-end` to `--space-3` there.
- low, patched: logical `padding-inline-end` vs physical `right` chevron position → both physical (app is LTR only).
- medium, deferred: no e2e test pins the chevron position or forced-colors fallback.
- low, rejected: chevron variables on `select` not `:root` → base.css is always loaded with the app; tokens.css must match DESIGN.md (app-shell AC-1).
- low, rejected: SortSelect `.select` duplicates TextField `.input` → pre-existing, documented by its comment.
- low, rejected: gradient chevron soft / px-sized → screenshots crisp at 2x; font sizes are px tokens too.
- false (out of scope): story 9.2 test findings (`watchFocusAtStatus`, storage stub, held Ctrl+Enter, `zipEntries`) → uncommitted files from another session, not this change.

