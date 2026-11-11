---
name: bookvie-new-book
description: Add a new book to the user's bookvie catalog (the local app at http://127.0.0.1:8765/). Starts the `bookvie` server, looks up the book's metadata and front cover on amazon.com, manning.com, leanpub.com or oreilly.com, then fills and submits the Catalog's "New book" form in the browser through Playwright MCP, tags the book `added-by-skill`, and confirms it was saved. Use this whenever the user asks to add, catalog, log or record a book in their catalog or library, says they need to add a book to bookvie, pastes a book link from one of those sites, or names a book and says they bought or got it, even if they don't mention bookvie, the browser or Playwright.
metadata:
  version: 1.0.0
---

# Add a book to the bookvie catalog

bookvie is a local app for a home library. A book is added in the browser through the **New book** panel on the **Catalog** page. The form is designed for an AI operator: its labels, roles and success signals are a fixed contract (EXPERIENCE.md → "Agent Label Contract" in `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/`). Rely on that contract instead of guessing from screenshots.

The job has four steps: gather the metadata, start bookvie, fill the form, and confirm the save.

## 1. Gather the metadata

Work out which book the user means. They may give a URL, a title, or a title plus an author. Look it up on these sources, in this order of preference:

1. The URL the user gave, if any.
2. The publisher's own page: **manning.com**, **oreilly.com** (also learning.oreilly.com) or **leanpub.com**.
3. **amazon.com** (the print edition's product page holds the "Product details" block with publisher, language, print length, ISBN-13 and publication date).

Use more than one source when one lacks a field. For example, Manning pages often omit the ISBN, which Amazon has. Amazon and O'Reilly often refuse plain HTTP fetches. If a fetch fails, open the page in the Playwright browser and read it there (`browser_navigate`, then `browser_snapshot` or `browser_evaluate`).

Collect each field as follows:

| Form field | What to enter |
|---|---|
| **Title** | The text before the first `:` of the full title, trimmed. Remove an edition suffix such as ", Second Edition" or "(3rd Edition)", because the edition has its own field. |
| **Subtitle** | Everything after the first `:`, trimmed. Leave it empty when the title has no `:`. |
| **Pages** | The print length as a whole number. For an ebook-only book, use the page count the source gives (Leanpub states one). |
| **Author(s)** | Every author, in the order the source lists them, in the format "First Last". **Separate several authors with semicolons** (`Jane Doe; John Roe`). The server splits on `;`, so a comma would save "Jane Doe, John Roe" as one author. Leave out editors, translators and foreword writers unless they're the only names given. |
| **Edition** | A whole number: "2nd Edition" → `2`. Use `1` when no edition is stated. The field is prefilled with `1`. |
| **Language** | The language's full English name: `English`, `Spanish` or `Russian`. |
| **Publisher** | The publisher's name without the imprint's legal suffix, for example `Manning`, `O'Reilly Media`, `Packt Publishing`, `Leanpub`, `No Starch Press`. |
| **Type** | One of the dropdown's options: `Paperback`, `Hardcover` or `Ebook`. Use the format the user names. Otherwise use the format of the listing you read (Amazon's selected format, or Kindle → Ebook). Leanpub books are `Ebook`. When it's still unclear, use `Paperback` and mention it in the report. |
| **ISBN** | ISBN-13 when the source has one (digits, with or without hyphens). Use ISBN-10 only when there's no ISBN-13. Leave the field empty when there's neither, as with most Leanpub books. Use the ISBN of the same format as Type. |
| **Year** | The four-digit year this edition was published. |
| **Tags** | `added-by-skill`. If the user asks for other tags, add them after it, comma-separated: `added-by-skill, kubernetes`. |
| **Cover** | The front-cover image, downloaded to a file (see below). |

Leave **Finished on** and **Spine color** empty unless the user gives them. Spine color is derived from the cover when it's empty.

Example: "Spec-Driven Development with BMAD: Master Agentic Workflows using Cursor, BMAD, and Context Engineering" gives Title `Spec-Driven Development with BMAD` and Subtitle `Master Agentic Workflows using Cursor, BMAD, and Context Engineering`.

Don't invent values. When a required field (Title, Pages, Author(s), Language, Publisher, Type) can't be found on any source, ask the user for it instead of guessing.

### The cover

Find the largest front-cover image the source offers:

- **Amazon:** the `#landingImage` element. Its `data-old-hires` attribute, or the largest key in `data-a-dynamic-image`, is the full-size URL.
- **Manning, O'Reilly, Leanpub:** the page's `og:image` meta tag is usually the cover. On O'Reilly, `https://learning.oreilly.com/library/cover/<ISBN-13>/` also works.

Download it into a fresh folder. Store it under the session's scratchpad directory when there is one, or else under `$TMPDIR`:

```bash
mkdir -p "$DIR/bookvie-cover" && curl -sSL -A "Mozilla/5.0" -o "$DIR/bookvie-cover/cover.jpg" "<image-url>"
file "$DIR/bookvie-cover/cover.jpg"
```

Check with `file` that the download is really a JPEG, PNG or WebP image (not an HTML error page), and that it is 20 MB or smaller. Rename the file to match its real type if needed. For any other format (AVIF, GIF), convert it with `sips -s format jpeg <in> --out <out>.jpg`. If no cover can be had, add the book without one and say so in the report.

## 2. Start bookvie

Check whether bookvie is already running:

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background from the repo root with the Bash tool's `run_in_background` (the command keeps serving, so it never returns by itself):

```bash
bookvie
```

If `bookvie` isn't on the PATH, run `backend/.venv/bin/bookvie`, or else `cd backend && uv run bookvie`. Then poll the health URL until it answers. The command also opens the user's own browser on http://127.0.0.1:8765/, which is fine. You drive a separate Playwright browser.

## 3. Fill the New book form

Use the Playwright MCP tools. Load their schemas with ToolSearch first if they are deferred, for example `select:mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_click,mcp__playwright__browser_fill_form,mcp__playwright__browser_select_option,mcp__playwright__browser_file_upload,mcp__playwright__browser_type,mcp__playwright__browser_wait_for`.

1. Navigate to `http://127.0.0.1:8765/`.
2. Click **Catalog** in the top nav.
3. Click the **New book** button. A dialog named "New book" opens.
4. Take a snapshot and fill the fields by their exact labels. The label "Title" must never match "Subtitle". `browser_fill_form` can fill all the text fields in one call. Clear Edition's prefilled `1` before typing a different edition.
5. Choose **Type** with `browser_select_option`, using the option text (`Paperback`, `Hardcover` or `Ebook`).
6. Type the tags into **Tags**. A suggestion list may open under it; press Escape or move on, and don't press Enter while a suggestion is highlighted.
7. Upload the cover: click the **Cover** file input, then call `browser_file_upload` with the downloaded file's absolute path.
8. Click **Add book**.

## 4. Confirm the outcome

After **Add book**, read the page (a snapshot is enough; no screenshots needed). Both live regions are emptied at each press, so any text in them belongs to this attempt.

- **Saved:** the panel closes and a `status` region reads "Added *Title*.". To verify, type the title into **Search titles**. Look for a spine whose accessible name begins "*Title* by", or a List view row whose title equals the title exactly. Don't rely on the match count, because a search for "Dune" also matches "Dune Messiah".
- **Possible duplicate:** an `alertdialog` named "Possible duplicate" names the existing book(s). Don't choose **Add anyway** on your own. Tell the user which book matched and ask. If they want it added anyway, click **Add anyway**. Otherwise click **Don't add**, then **Cancel**.
- **Validation error:** the panel stays open with an `alert` "Not saved. N fields need attention: …", and each failing field has a message under it. Fix the values from your sources and press **Add book** again. If the fix needs information you don't have, ask the user.
- **Couldn't save:** the `alert` reads "Couldn't save. Your data wasn't changed." Report it to the user. Don't retry in a loop.

## Report

Finish with a short summary: the values you entered (Title, Subtitle, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Pages, Tags), whether a cover was attached, the source URLs, and the outcome. Mention any field you had to guess or leave empty.

Leave bookvie running and the browser open. The user may add more books.
