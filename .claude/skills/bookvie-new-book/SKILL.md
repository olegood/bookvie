---
name: bookvie-new-book
description: >
  Add a new book to the user's bookvie catalog (the local app at http://127.0.0.1:8765/). 
  Starts the `bookvie` server, checks the catalog for the book first, 
  looks up the book's metadata and front cover on amazon.com, manning.com, leanpub.com or oreilly.com, 
  saves it through the local bookvie app's agent tools (find_book, add_book with the cover's address, get_book), tags it `added-by-skill`, and reports the result in the terminal. 
  Use this whenever the user asks to add, catalog, log or record a book in their catalog or library, 
  says they need to add a book to bookvie, pastes a book link from one of those sites, 
  or names a book and says they bought or got it, even if they don't mention bookvie.
metadata:
  version: 3.0.0
---

# Add a book to the bookvie catalog

bookvie is a local app for a home library. This skill adds one book at a time. It saves the book through bookvie's agent tools, which run under the same rules as the app's **New book** form, and tags it `added-by-skill`. The tag is the user's marker for books to come back to and review.

The job has five steps: start bookvie, check the catalog, gather the metadata, add the book, and report.

## Rules

- **bookvie is reached only through its agent tools:** `find_book` to check the catalog, `add_book` to save the book, and `get_book` to read it back. Call no other bookvie tool that changes the library. Never call bookvie's HTTP API for a book, and never download the cover yourself: pass its https address as `coverUrl` and bookvie downloads it.
- **No browser.** Don't use the Playwright MCP tools (`mcp__playwright__*`), because they open a visible window.
- **External sites are read with `lookup.mjs`.** It runs a headless Chromium from the repo's own Playwright and closes it when done, so nothing shows on screen.
- **Start bookvie with `--no-browser`,** so it doesn't open the user's browser.

Run the script from the repo root. `$SKILL` below is this skill's directory, `.claude/skills/bookvie-new-book`. It prints JSON on stdout.

| Script | Does |
|---|---|
| `node $SKILL/scripts/lookup.mjs --amazon-search "<query>"` | Lists Amazon's top results, each with its Paperback, Hardcover and Kindle links. |
| `node $SKILL/scripts/lookup.mjs --page <url>` | Reads one page: its og:* tags, Amazon's product block (title, byline, Product details, full-size cover URL), or else the first 6000 characters of the page text. |

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

The book is saved through bookvie's agent tools, which the running app serves at `/mcp`: the `bookvie` entry in Claude Code for port 8765. When the user asks to try the skill on the dev library, use `bookvie --dev --no-browser` instead, check `curl -fsS http://127.0.0.1:8766/api/health`, and call the tools of the `bookvie-dev` entry.

If the tools aren't available because bookvie started after this Claude Code session did, ask the user to run `/mcp` in Claude Code, pick the entry (`bookvie` or `bookvie-dev`) and choose reconnect. Then go on. If reconnecting doesn't bring the tools (the entry was never added, or its URL is wrong), give the user the README's one-time setup line for that entry, `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp` (or `bookvie-dev` with `http://127.0.0.1:8766/mcp`), and stop. Never fall back to calling bookvie's HTTP API.

## 2. Check the catalog first

Before any lookup, check whether the book is already there. Call `find_book` with the title as the user gave it. When the user gave only a URL, there is no title yet: skip this check and rely on the checks after step 3. It returns candidates under `books`, each with `id`, `title`, `subtitle`, `authors`, `edition`, `type` and `role`, or an empty list. A book matches only when the whole query is part of its title, its subtitle or one author (or is its ISBN or the title's initials, such as DDIA), so send one thing at a time: the title, never "title author".

`find_book` lists likely matches; it is not the server's duplicate check (`add_book` runs that one, in step 4). Judge its candidates:

- **The same book:** a candidate the ISBN query found, or a candidate with the same title, an author in common (when an author is known), the same `edition` (1 when none is stated) and, when the user named a format, the same `type`. A different edition or format is another book. Stop before the lookup: don't look the book up and don't add it. Call `get_book` with its `id` and tell the user which book matched (title, authors, edition, type, ISBN, year); when several candidates are the same book, show each of them. Ask whether to add another copy anyway, for example in a different format. Continue only if they say yes, and then send `confirmDuplicate: true` in step 4.
- **Only other books:** the user may have typed a partial or slightly different title, as in "one minute architect" for "The One Minute Architect", or the candidates are other books (another in a series, say). Go on, and mention them in the report.
- **No candidates** (an empty list): go on.

After step 3, call `find_book` again with the exact Title, and once more with the ISBN when there is one. A user-typed title can miss a match that the ISBN catches. On a same-book candidate (judged as above), stop before `add_book`: show the match and ask whether to add another copy, and send `confirmDuplicate: true` only if the user says yes. Don't ask again about a book the user already said to add anyway. Mention the other candidates in the report.

## 3. Gather the metadata

Work out which book the user means. They may give a URL, a title, or a title plus an author. Look it up on these sources, in this order of preference:

1. The URL the user gave, if any.
2. The publisher's own page: **manning.com**, **oreilly.com** (also learning.oreilly.com) or **leanpub.com**.
3. **amazon.com**. The print edition's product page holds the "Product details" block with publisher, language, print length, ISBN-13 and publication date. To find it, run `lookup.mjs --amazon-search "<title> <author>"`, pick the right result, and read its format's page with `lookup.mjs --page <url>`.

Use more than one source when one lacks a field. For example, Manning pages often omit the ISBN, which Amazon has. Amazon and O'Reilly often refuse plain HTTP fetches, so read them with `lookup.mjs`.

Collect each field as follows. The key in brackets is the `add_book` argument:

| Field (`add_book` key) | What to enter |
|---|---|
| **Title** (`title`) | The text before the first `:` of the full title, trimmed. Remove an edition suffix such as ", Second Edition" or "(3rd Edition)", because the edition has its own field. |
| **Subtitle** (`subtitle`) | Everything after the first `:`, trimmed. Leave it out when the title has no `:`. |
| **Pages** (`pages`) | The print length as a whole number. For an ebook-only book, use the page count the source gives (Leanpub states one). With no page count on any source, see the `0-pages` rule below. |
| **Author(s)** (`authors`) | Every author, in the order the source lists them, in the format "First Last". **Separate several authors with semicolons** (`Jane Doe; John Roe`). The server splits on `;`, so a comma would save "Jane Doe, John Roe" as one author. Leave out editors, translators and foreword writers unless they're the only names given. |
| **Edition** (`edition`) | A whole number: "2nd Edition" → `2`. Use `1` when no edition is stated. |
| **Language** (`language`) | The language's full English name: `English`, `Spanish` or `Russian`. |
| **Publisher** (`publisher`) | The publisher's name without the imprint's legal suffix, for example `Manning`, `O'Reilly Media`, `Packt Publishing`, `Leanpub`, `No Starch Press`. |
| **Type** (`type`) | `paperback`, `hardcover` or `ebook`, in lower case. Use the format the user names. Otherwise use the format of the listing you read (Amazon's selected format, or Kindle → ebook). Leanpub books are `ebook`. When it's still unclear, use `paperback` and mention it in the report. |
| **ISBN** (`isbn`) | ISBN-13 when the source has one (digits, with or without hyphens). Use ISBN-10 only when there's no ISBN-13. Leave it out when there's neither, as with most Leanpub books. Use the ISBN of the same format as Type. |
| **Year** (`year`) | The four-digit year this edition was published. |
| **Tags** (`tags`) | `added-by-skill`, then `not-finished` and `0-pages` when their rules below apply, then any tags the user asks for, comma-separated: `added-by-skill, kubernetes`. |
| **Cover** (`coverUrl`) | The https address of the front-cover image (see below). |

Leave out **Finished on** (`finishedOn`, `YYYY-MM-DD`) and **Spine color** (`spineColor`) unless the user gives them. Spine color is derived from the cover when it's empty.

Two tag rules:

- **Tag `not-finished`** when the book's source says it isn't complete yet, for example a Leanpub book whose page says "NN% complete" with NN under 100.
- **Tag `0-pages`** when no source gives a page count: enter Pages as `1` (the smallest the server takes) and add the `0-pages` tag. Don't ask the user for the page count.

Example: "Spec-Driven Development with BMAD: Master Agentic Workflows using Cursor, BMAD, and Context Engineering" gives Title `Spec-Driven Development with BMAD` and Subtitle `Master Agentic Workflows using Cursor, BMAD, and Context Engineering`.

Don't invent values. When a required field (Title, Author(s), Language, Publisher, Type) can't be found on any source, ask the user for it instead of guessing. Pages is the exception: the `0-pages` rule covers it.

### The cover

Find the largest front-cover image the source offers, and keep its address. Don't download it: bookvie does.

- **Amazon:** `lookup.mjs --page` returns it as `amazon.cover`.
- **Manning, O'Reilly, Leanpub:** the page's `og:image` is usually the cover. On O'Reilly, `https://learning.oreilly.com/library/cover/<ISBN-13>/` also works.

bookvie takes only an `https://` address of a public host, follows at most 3 redirects, and stores only a JPEG, PNG or WebP image of 20 MB or less. If no cover can be found on any source, leave `coverUrl` out, add the book without one, and say so in the report.

## 4. Add the book

Call `add_book` with the values from step 3. Every value is a string, as the form would send it (`"pages": "234"`, `"edition": "1"`), `type` is in lower case, and an empty value is left out rather than sent as `""`. `confirmDuplicate` is the one non-string argument: send `confirmDuplicate: true` only if the user said to add the book anyway (step 2 or below). For example:

```json
{
  "title": "The One Minute Architect",
  "subtitle": "The Story of the Most Invisible Job in Software",
  "pages": "234",
  "authors": "Karol Wiszowaty",
  "edition": "1",
  "language": "English",
  "publisher": "Arpeggia.studio",
  "type": "paperback",
  "isbn": "978-8398263603",
  "year": "2026",
  "tags": "added-by-skill",
  "coverUrl": "https://m.media-amazon.com/images/I/<image>.jpg"
}
```

On success the answer is `{"ok": true, "ids": {"bookId": "…"}}`. Otherwise it is an error whose text is an object with `code`, `message`, and, depending on the code, `fields` (each with `field` and `message`, the copy the app shows) or `duplicates`. Nothing was saved on any error. Act on it:

- **Saved:** take `ids.bookId` and call `get_book` with it. Check that its `title` is what you sent and that its `tags` list contains each tag you sent, ignoring case and order (`added-by-skill` among them) and, when you sent a `coverUrl`, that `hasCover` is `true`. If something differs, say what in the report.
- **`duplicate_book`:** the server's own duplicate check matched, despite step 2. Show the user each book in `duplicates` (title, authors, ISBN) and ask whether to add this one anyway. Send the same values again with `confirmDuplicate: true` only if the user says to add it.
- **A refusal on `coverUrl`** (a field in `fields` is `coverUrl`: `invalid_fields`, or `cover_too_large` for an image over 20 MB): bookvie couldn't take the cover, for example an `http://` address, a host it couldn't reach, or an AVIF or GIF image. Tell the user why in the field's own message, and offer to add the book without a cover with `coverUrl` left out. On yes, send the same values again without `coverUrl`; otherwise stop.
- **`invalid_fields` on another field:** fix the values from your sources and call `add_book` again. If the fix needs information you don't have, ask the user.
- **`couldnt_save`:** "Couldn't save. Your data wasn't changed." Report it. Don't retry in a loop.

If the tools stop answering, go back to step 1. Never fall back to calling bookvie's HTTP API.

## 5. Report in the terminal

Give the result as plain text in your reply. Don't open the app, a screenshot or an artifact to show it. Include:

- the outcome in one line: added, already in the catalog, or not saved and why;
- a table of the stored values from `get_book`: Title, Subtitle, Author(s), Edition, Language, Publisher, Type, ISBN, Year, Pages, Tags;
- whether a cover was attached;
- the source URLs;
- any field you had to guess or leave empty, and any similar books the catalog check found.

When the book was already in the catalog, report the existing book's details instead.

Leave the bookvie server running, because the user may add more books.
