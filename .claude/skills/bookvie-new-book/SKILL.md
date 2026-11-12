---
name: bookvie-new-book
description: >
  Add a new book to the user's bookvie catalog (the local app at http://127.0.0.1:8765/). 
  Starts the `bookvie` server, checks the catalog for the book first, 
  looks up the book's metadata and front cover on amazon.com, manning.com, leanpub.com or oreilly.com, 
  saves it with bookvie's add-book API call, tags it `added-by-skill`, and reports the result in the terminal. 
  Use this whenever the user asks to add, catalog, log or record a book in their catalog or library, 
  says they need to add a book to bookvie, pastes a book link from one of those sites, 
  or names a book and says they bought or got it, even if they don't mention bookvie.
metadata:
  version: 2.0.0
---

# Add a book to the bookvie catalog

bookvie is a local app for a home library. This skill adds one book at a time. It saves the book with the same intent the app's **New book** form sends, `POST /api/intents/add-book` (architecture spine AD-3), and tags it `added-by-skill`. The tag is the user's marker for books to come back to and review.

The job has five steps: start bookvie, check the catalog, gather the metadata, add the book, and report.

## Rules

- **bookvie is reached only through its HTTP API,** never through a browser. Don't use the Playwright MCP tools (`mcp__playwright__*`), because they open a visible window.
- **External sites are read with `lookup.mjs`.** It runs a headless Chromium from the repo's own Playwright and closes it when done, so nothing shows on screen.
- **Start bookvie with `--no-browser`,** so it doesn't open the user's browser.

Run the scripts from the repo root. `$SKILL` below is this skill's directory, `.claude/skills/bookvie-new-book`. Each script prints JSON on stdout.

| Script | Does |
|---|---|
| `python3 -I $SKILL/scripts/check_catalog.py --title T [--author A ...] [--isbn I]` | Lists catalog books that are duplicates (by the server's rules) or similar. Exit 0 when nothing matched, 3 when something did, 2 when bookvie is down. |
| `node $SKILL/scripts/lookup.mjs --amazon-search "<query>"` | Lists Amazon's top results, each with its Paperback, Hardcover and Kindle links. |
| `node $SKILL/scripts/lookup.mjs --page <url>` | Reads one page: its og:* tags, Amazon's product block (title, byline, Product details, full-size cover URL), or else the first 6000 characters of the page text. |
| `python3 -I $SKILL/scripts/add_book.py --book <book.json> [--confirm-duplicate]` | Sends the add-book intent with the cover, then reads the new book back from `GET /api/views/book` to confirm it. |

## 1. Start bookvie

Check whether bookvie is already running:

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background from the repo root with the Bash tool's `run_in_background` (the command keeps serving, so it never returns by itself):

```bash
bookvie --no-browser
```

If `bookvie` isn't on the PATH, run `backend/.venv/bin/bookvie --no-browser`, or else `cd backend && uv run bookvie --no-browser`. Then poll the health URL until it answers.

## 2. Check the catalog first

Before any lookup, check whether the book is already there. Use what the user gave you, the title and any author:

```bash
python3 -I $SKILL/scripts/check_catalog.py --title "<title as the user gave it>" --author "<author>"
```

- **`duplicates` isn't empty:** the book is already in the catalog. Stop. Don't look it up and don't add it. Tell the user which book matched (title, authors, ISBN, type, year) and ask whether to add another copy anyway, for example in a different format. Continue only if they say yes, and then pass `--confirm-duplicate` in step 4.
- **Only `similar` books:** the user may have typed a partial or slightly different title, as in "one minute architect" for "The One Minute Architect". Gather the metadata (step 3) and run the check again with the full title, the authors and the ISBN. If the second check finds a duplicate, handle it as above. If it finds only similar books that are clearly different (another book in a series, say), go on and mention them in the report.
- **Nothing matched:** go on.

After step 3, always run the check once more with the exact Title, every author (one `--author` each) and the ISBN. A user-typed title can miss a match that the ISBN catches.

## 3. Gather the metadata

Work out which book the user means. They may give a URL, a title, or a title plus an author. Look it up on these sources, in this order of preference:

1. The URL the user gave, if any.
2. The publisher's own page: **manning.com**, **oreilly.com** (also learning.oreilly.com) or **leanpub.com**.
3. **amazon.com**. The print edition's product page holds the "Product details" block with publisher, language, print length, ISBN-13 and publication date. To find it, run `lookup.mjs --amazon-search "<title> <author>"`, pick the right result, and read its format's page with `lookup.mjs --page <url>`.

Use more than one source when one lacks a field. For example, Manning pages often omit the ISBN, which Amazon has. Amazon and O'Reilly often refuse plain HTTP fetches, so read them with `lookup.mjs`.

Collect each field as follows:

| Field (book.json key) | What to enter |
|---|---|
| **Title** (`title`) | The text before the first `:` of the full title, trimmed. Remove an edition suffix such as ", Second Edition" or "(3rd Edition)", because the edition has its own field. |
| **Subtitle** (`subtitle`) | Everything after the first `:`, trimmed. Leave it empty when the title has no `:`. |
| **Pages** (`pages`) | The print length as a whole number. For an ebook-only book, use the page count the source gives (Leanpub states one). |
| **Author(s)** (`authors`) | Every author, in the order the source lists them, in the format "First Last". **Separate several authors with semicolons** (`Jane Doe; John Roe`). The server splits on `;`, so a comma would save "Jane Doe, John Roe" as one author. Leave out editors, translators and foreword writers unless they're the only names given. |
| **Edition** (`edition`) | A whole number: "2nd Edition" → `2`. Use `1` when no edition is stated. |
| **Language** (`language`) | The language's full English name: `English`, `Spanish` or `Russian`. |
| **Publisher** (`publisher`) | The publisher's name without the imprint's legal suffix, for example `Manning`, `O'Reilly Media`, `Packt Publishing`, `Leanpub`, `No Starch Press`. |
| **Type** (`type`) | `Paperback`, `Hardcover` or `Ebook`. Use the format the user names. Otherwise use the format of the listing you read (Amazon's selected format, or Kindle → Ebook). Leanpub books are `Ebook`. When it's still unclear, use `Paperback` and mention it in the report. |
| **ISBN** (`isbn`) | ISBN-13 when the source has one (digits, with or without hyphens). Use ISBN-10 only when there's no ISBN-13. Leave it empty when there's neither, as with most Leanpub books. Use the ISBN of the same format as Type. |
| **Year** (`year`) | The four-digit year this edition was published. |
| **Tags** (`tags`) | `added-by-skill`. If the user asks for other tags, add them after it, comma-separated: `added-by-skill, kubernetes`. |
| **Cover** (`cover`) | The absolute path of the downloaded front-cover image (see below). |

Leave **Finished on** (`finishedOn`, `YYYY-MM-DD`) and **Spine color** (`spineColor`) empty unless the user gives them. Spine color is derived from the cover when it's empty.

Example: "Spec-Driven Development with BMAD: Master Agentic Workflows using Cursor, BMAD, and Context Engineering" gives Title `Spec-Driven Development with BMAD` and Subtitle `Master Agentic Workflows using Cursor, BMAD, and Context Engineering`.

Don't invent values. When a required field (Title, Pages, Author(s), Language, Publisher, Type) can't be found on any source, ask the user for it instead of guessing.

### The cover

Find the largest front-cover image the source offers:

- **Amazon:** `lookup.mjs --page` returns it as `amazon.cover`.
- **Manning, O'Reilly, Leanpub:** the page's `og:image` is usually the cover. On O'Reilly, `https://learning.oreilly.com/library/cover/<ISBN-13>/` also works.

Download it into a fresh folder under the session's scratchpad directory when there is one, or else under `$TMPDIR`:

```bash
mkdir -p "$DIR/bookvie-cover" && curl -sSL -A "Mozilla/5.0" -o "$DIR/bookvie-cover/cover.jpg" "<image-url>"
file "$DIR/bookvie-cover/cover.jpg"
```

Check with `file` that the download is really a JPEG, PNG or WebP image (not an HTML error page), and that it is 20 MB or smaller. Rename the file to match its real type if needed, because `add_book.py` sends the content type from the extension. For any other format (AVIF, GIF), convert it with `sips -s format jpeg <in> --out <out>.jpg`. If no cover can be had, leave `cover` out, add the book without one, and say so in the report.

## 4. Add the book

Write the values to `book.json` in the same folder as the cover:

```json
{
  "title": "The One Minute Architect",
  "subtitle": "The Story of the Most Invisible Job in Software",
  "pages": 234,
  "authors": "Karol Wiszowaty",
  "edition": 1,
  "language": "English",
  "publisher": "Arpeggia.studio",
  "type": "Paperback",
  "isbn": "978-8398263603",
  "year": 2026,
  "tags": "added-by-skill",
  "cover": "/abs/path/bookvie-cover/cover.jpg"
}
```

Then run:

```bash
python3 -I $SKILL/scripts/add_book.py --book "$DIR/bookvie-cover/book.json"
```

The script turns the values into the intent's wire form: every value a string, as the form would send it, Type in lower case, and empty values left out. It posts them with the cover, and on success reads the book back. Act on its `outcome`:

- **`saved`:** `book` is the stored book as the book view returns it. `verified: true` means its title and tags match what was sent and the cover is there. If `verified` is false, say what differs in the report.
- **`duplicate`:** 409 `duplicate_book`. The server's own duplicate check matched, despite step 2. Nothing was saved. Tell the user which books matched (`duplicates`) and ask. Rerun with `--confirm-duplicate` only if they say to add it anyway.
- **`invalid`:** 422 `invalid_fields`. Each failing field and its message (the copy the app shows) is in `fields`. Fix the values from your sources and run the script again. If the fix needs information you don't have, ask the user.
- **`failed`:** "Couldn't save. Your data wasn't changed." Report it. Don't retry in a loop.
- **`error`:** the script itself failed (bookvie down, a bad `book.json`). Report `message`.

## 5. Report in the terminal

Give the result as plain text in your reply. Don't open the app, a screenshot or an artifact to show it. Include:

- the outcome in one line: added, already in the catalog, or not saved and why;
- a table of the stored values from `book`: Title, Subtitle, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Pages, Tags;
- whether a cover was attached;
- the source URLs;
- any field you had to guess or leave empty, and any similar books the catalog check found.

When the book was already in the catalog, report the existing book's details instead.

Leave the bookvie server running, because the user may add more books.
