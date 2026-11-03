---
title: 'Book detail gets finished and hasCover from the server'
type: 'refactor'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Book detail feeds the ChangeColor block with `finished` and `hasCover` that it works out on the client (`BookDetailPage.tsx:178-179`, added in 1.14). The shelf gets the same two flags from the server in `ShelfBook`. So one block has two sources of truth, and AD-6 keeps domain derivations on the server. This will drift once Reading rules arrive in Epic 3 (F-A7). Epic 1 retro action item 6.

**Approach:** Add `finished` and `hasCover` to `BookDetailView`, computed by the same server code that fills `ShelfBook`. Book detail passes them through to ChangeColor and stops deriving them. Regenerate the TS schema and add tests that pin the two flags on the book view and keep them equal to the shelf's.

</frozen-after-approval>

## Implementation Notes

- **Backend:** `backend/bookvie/views/models.py` adds `has_cover` and `finished` to `BookDetailView`. The `has_cover` docstring calls it the domain flag and `cover_file` the render path. `backend/bookvie/views/shelf.py` fills both in `book_detail` from `_finished` and a new `_has_cover` helper, and `_shelf_book` now uses `_has_cover` too. One helper per flag means the two views can't disagree.
- **Contract:** `npm --prefix frontend run api:gen` regenerated `frontend/src/api/generated/schema.d.ts`.
- **Frontend:** `BookDetailPage.tsx` passes the whole view to ChangeColor, `<ChangeColor book={book} level={2} headingId={colorId} />`, the same way the Spine popover passes its `ShelfBook`. The props type (`ColoredBook & {id, finished}`) is still checked at the call site. The cover image still renders from `coverFile !== null`, since that is the path, not a domain flag. The `dune` fixture in `frontend/src/api/views.test.ts` gets the two fields.
- **Tests:** a new test in `backend/tests/test_views.py` covers all four finished × cover combinations over `/api/views/book`, so a swap of the two flags would fail. It also checks the result equals the catalog's flags, keyed by id. The exact-body test in `backend/tests/test_edit_book.py` gets the two keys. The e2e tests already cover Change color on Book detail (`frontend/e2e/spine-popover.spec.ts`: "shown once read", and "From cover" with a cover).
- **Verification:** load 3.9 on 14 cores, so `npm run check` ran uncapped (PL-1).

## Review Triage Log

- Test can't tell a swap of `has_cover`/`finished` apart: medium. Patched with all four combinations.
- Two test books do the same job: low, same root cause. Patched together with the above.
- Shelf comparison depends on order: low and cheap. Patched by keying on id.
- No frontend test that Book detail uses the server flags: false. The e2e tests at `spine-popover.spec.ts:280-288` and `:573` cover both on Book detail.
- Passing the whole `book` widens coupling: false. TS checks the props at the call site, and the Spine popover already does the same. Implementation Notes updated.
- Wrong schema path in the spec; notes don't match `_has_cover`; status not done: low (spec). Fixed here.
- The cover image still keys on `coverFile`: low. Today `has_cover` is exactly `cover_file is not None`, and the image needs the path anyway. Rejected.
- `has_cover` true when the file is missing: false as a regression. It is the same meaning `ShelfBook` has had since 1.14 (a cover is recorded), now documented in the docstring.
- The `has_cover` docstring duplicates `spine_color_from_cover`'s: low and cheap. Reworded.
