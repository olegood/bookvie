---
name: bookvie-notes-summary
description: >
  Turn the card notes of any book in the user's bookvie catalog into a printable one-page Word (.docx) summary of what they learned from it.
  The book can be in progress, paused, a side read or finished: the user names it by title (or author), and when they don't, the current Main book is used.
  The book must have a reading purpose and at least one card note.
  Reads the book and its notes, read-only, through the local bookvie app's agent tools (find_book, get_book, get_card_notes, get_home), groups the notes by theme into short takeaways without page numbers, builds the .docx, checks how it renders and saves it to ~/Documents.
  Use this whenever the user asks to summarize, recap, digest or print their card notes, highlights or "what I learned" from a book in bookvie, or wants a handout or study sheet from their reading notes, even if they don't say "Word" or "bookvie".
metadata:
  version: 2.0.0
---

# Summarize a book's card notes into a printable Word document

bookvie is the user's local home-library app. While reading, the user captures **card notes**: short quotes or paraphrases, each tied to a page. This skill turns them into a one-page summary of *what was learned*, for printing. The user cares about the ideas, not where they came from, so the document **leaves out page numbers**.

It works for **any book in the catalog**, whatever its state: the Main book, Up next, a paused (waiting) book, a side read or a finished one. When the user doesn't say which book, use the current Main book.

This skill only reads from bookvie. It never changes the catalog: it calls only the read tools `find_book`, `get_book`, `get_card_notes` and `get_home`, and step 1 checks the server with the read `get_app_info`.

**Prerequisites:** the book must have a **reading purpose** and **at least one card note**. The purpose frames the whole summary ("Why I am reading this"), and the notes are its content. Without either there's nothing faithful to write, so stop instead of making one up.

`$SKILL` below is this skill's directory, `.claude/skills/bookvie-notes-summary`. Run the commands from the repo root. Put working files in a fresh folder `$DIR` under the session's scratchpad directory (or `$TMPDIR` when there is none).

## 1. Make sure bookvie is running

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background with the Bash tool's `run_in_background`: run `bookvie --no-browser`, or `backend/.venv/bin/bookvie --no-browser` when `bookvie` isn't on the PATH. Then poll the health URL. Use `--no-browser` and never Playwright: the user doesn't want windows opening.

The book is read through bookvie's agent tools, which the running app serves at `/mcp`: the `bookvie` entry in Claude Code for port 8765. When the user asks to try the skill on the dev library, use `bookvie --dev --no-browser` instead, check `curl -fsS http://127.0.0.1:8766/api/health`, and call the tools of the `bookvie-dev` entry.

Then make sure the running bookvie serves the agent tools: ask it for `get_app_info`, a read, at `/mcp` on the entry's port. For the `bookvie` entry (8765):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST http://127.0.0.1:8765/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'
```

For `bookvie-dev` (8766):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -m 5 -X POST http://127.0.0.1:8766/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_app_info","arguments":{}}}'
```

It prints `200` when bookvie has the agent tools. `405` or `404`, or `000` when it doesn't answer, means an older bookvie, from before the agent tools, is running. Tell the user "An older bookvie is running: stop it and start the new one." and stop. If you started bookvie yourself in this step, the installed `bookvie` is older: tell the user instead to update it with `npm run install:local` (the README's Updating), and stop. Any other code: tell the user the code bookvie answered and stop, without the older-bookvie message. In each of these cases, don't give the reconnect or `claude mcp add` advice below: the entry is set up, the server is the problem. Don't stop or restart bookvie yourself.

If the tools aren't available because bookvie started after this Claude Code session did, ask the user to run `/mcp` in Claude Code, pick the entry (`bookvie` or `bookvie-dev`) and choose reconnect. Then go on. If reconnecting doesn't bring the tools (the entry was never added, or its URL is wrong), give the user the README's one-time setup line for that entry, `claude mcp add --transport http --scope user bookvie http://127.0.0.1:8765/mcp` (or `bookvie-dev` with `http://127.0.0.1:8766/mcp`), and stop. Never fall back to calling bookvie's HTTP API for the book.

## 2. Find the book and read its notes

**Find the book.**

- **No book named** ("my current book", "what I'm reading", or nothing at all): call `get_home` and take `mainBook.id`. When `mainBook` is `null`, there's no Main book: ask the user for a title.
- **A title or an author:** call `find_book` with the words the user used (part of the title or subtitle, an author, an ISBN, or initials such as DDIA). It returns candidates under `books`, each with `id`, `title`, `subtitle`, `authors`, `edition`, `type` and `role`. A book matches only when the whole query is part of its title, its subtitle or one author (or is its ISBN or the title's initials), so send one thing at a time: when the user gives both a title and an author ("the Dune book by Herbert"), query the title and keep only the candidates whose `authors` include that author; then go on as below.
  - **One match:** use its `id`.
  - **Several matches** (two editions of one title, say): never pick one yourself, even when one looks likelier. List each with its title, subtitle, authors, edition and type, ask which one, and use the `id` of the one the user names.
  - **No match** (an empty list): ask the user for a fuller title or the author, and search again.

**Read it.** Call `get_book` with the `bookId`, then `get_card_notes` with the same `bookId`. The notes are in `groups[0].notes`, already in page order; keep that order. An empty `groups` (`[]`) means the book has no card notes, and the prerequisite check below stops.

If a tool answers with an error (an unknown book, say), tell the user what it says. If bookvie stopped answering, go back to step 1. Never fall back to calling bookvie's HTTP API.

**Work out the summary's inputs** from `get_book`'s answer:

- **Title, subtitle, authors, pages:** the book's `title`, `subtitle`, `authors` and `pages`.
- **Purpose:** `currentReading.purpose` when `currentReading` isn't `null` and has one. Otherwise take it from `readings[]`, which carries each Reading's `purpose` (`null` when it has none): of the Readings with a Purpose, order the finished ones by `startDate` (a finished Reading with no `startDate` counts as the earliest, and Readings with the same start date keep their `readings[]` order) and put an unfinished one (no `finishDate`) after them, then use the last. A finished book has `currentReading` `null`, so its Purpose always comes from `readings[]`.
- **Status and current page:** follow the Reading the Purpose came from. `in progress` at `currentReading.currentPage` when it came from `currentReading`. `finished` on that Reading's `finishDate` (or the book's `latestFinishDate` when it has none) when it came from a finished Reading in `readings[]`. Otherwise `not started`, with no current page.

**Check the prerequisites.** When the Purpose is missing, or `get_card_notes` gives no notes, don't build a document. Tell the user which book you found (title and edition) and what it lacks:

- **No purpose:** the purpose is set when a reading starts, and the user can edit it on the book's page while the reading is in progress.
- **No card notes:** they're added from the book's page as the user reads.

## 3. Write the summary

This is the part that needs judgment. The goal is a sheet the user can reread later and get the ideas back quickly.

- **Group by theme, not by page.** Read all the notes, find the 3–6 ideas they cluster around, and give each cluster a short plain heading (for example "What a domain is", "Working with experts"). Order the sections so the argument builds: why it matters, then the core concepts, then the practice.
- **One point per idea.** Each point has a bold lead-in that states the lesson in a few words, then a sentence or two that explains it. Merge notes that say the same thing; split a note that holds two ideas.
- **Stay faithful to the notes.** Rephrase for clarity, but don't add claims, examples or facts that aren't in them. A memorable phrase the user wrote down (a script for a meeting, say) is worth keeping in quotes.
- **No page numbers** anywhere in the body.
- **Purpose:** include it, lightly tightened, as "Why I am reading this". For a finished book, use the past tense: set `"purposeHeading": "Why I read this"`.
- **Key takeaway:** end with two or three sentences that tie the sections together.
- **Progress line:** "What I have learned so far (through page N of M)" while the book is in progress, "What I learned (finished <Month YYYY>)" when it's finished, or "What I have learned so far" when there's no current page.
- Aim for one A4 page. With many notes (30 or more), two pages is fine. Tighten wording before you drop ideas.

Write it to `$DIR/summary.json` in the format `scripts/build_docx.cjs` documents at its top:

```json
{
  "title": "How to Understand Almost Anything",
  "subtitle": "A Practitioner's (updated) Guide to Domain Analysis",
  "authors": ["Markus Voelter"],
  "progress": "What I have learned so far (through page 61 of 230)",
  "purpose": "To learn a repeatable way to understand an unfamiliar domain ...",
  "sections": [
    { "heading": "What a domain is",
      "points": [{ "lead": "A domain", "text": "is a bounded area of knowledge and expertise." }] }
  ],
  "takeaway": "Understanding a domain is deliberate, collaborative work. ..."
}
```

## 4. Build the document

The `docx` npm package isn't installed in the repo, so install it into `$DIR` (once per session) and point `NODE_PATH` at it:

```bash
npm install --prefix "$DIR" docx --silent
NODE_PATH="$DIR/node_modules" node $SKILL/scripts/build_docx.cjs "$DIR/summary.json" "$DIR/<Title-With-Hyphens>-summary.docx"
```

The layout is fixed in the script: A4, Georgia, teal section headings, bullet points with bold lead-ins, and a thin rule under the header. Change it only if the user asks.

## 5. Check how it renders

Look at the page before handing it over, because a printout is the whole point:

```bash
qlmanage -t -s 1400 -o "$DIR" "$DIR/<file>.docx" >/dev/null 2>&1   # macOS Quick Look, renders page 1 as PNG
```

Read the PNG. Check that the headings, bullets and bold lead-ins render, that no text is cut off, and that the page fits. If LibreOffice is available (`soffice`), converting to PDF shows every page. Quick Look shows only the first.

## 6. Save and report

Copy the file to `~/Documents/<Title-With-Hyphens>-summary.docx`. If a file with that name exists, look at it first and ask before you overwrite it. Then report in a few lines:

- the full path of the file;
- the section headings, with a one-line gist of each;
- how many notes it covers, and the page reached;
- anything left out or merged, and why.
