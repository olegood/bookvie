---
name: bookvie-notes-summary
description: Turn the card notes of any book in the user's bookvie catalog into a printable one-page Word (.docx) summary of what they learned from it. The book can be in progress, paused, a side read or finished: the user names it by title (or author), and when they don't, the current Main book is used. The book must have a reading purpose and at least one card note. Reads the book and its notes from the local bookvie app (http://127.0.0.1:8765/), read-only, groups the notes by theme into short takeaways without page numbers, builds the .docx, checks how it renders and saves it to ~/Documents. Use this whenever the user asks to summarize, recap, digest or print their card notes, highlights or "what I learned" from a book in bookvie, or wants a handout or study sheet from their reading notes, even if they don't say "Word" or "bookvie".
metadata:
  version: 1.1.0
---

# Summarize a book's card notes into a printable Word document

bookvie is the user's local home-library app. While reading, the user captures **card notes**: short quotes or paraphrases, each tied to a page. This skill turns them into a one-page summary of *what was learned*, for printing. The user cares about the ideas, not where they came from, so the document **leaves out page numbers**.

It works for **any book in the catalog**, whatever its state: the Main book, Up next, a paused (waiting) book, a side read or a finished one. When the user doesn't say which book, use the current Main book.

This skill only reads from bookvie. It never changes the catalog.

**Prerequisites:** the book must have a **reading purpose** and **at least one card note**. The purpose frames the whole summary ("Why I am reading this"), and the notes are its content. Without either there's nothing faithful to write, so stop instead of making one up.

`$SKILL` below is this skill's directory, `.claude/skills/bookvie-notes-summary`. Run the commands from the repo root. Put working files in a fresh folder `$DIR` under the session's scratchpad directory (or `$TMPDIR` when there is none).

## 1. Make sure bookvie is running

```bash
curl -fsS http://127.0.0.1:8765/api/health
```

If it doesn't answer, start it in the background with the Bash tool's `run_in_background`: run `bookvie --no-browser`, or `backend/.venv/bin/bookvie --no-browser` when `bookvie` isn't on the PATH. Then poll the health URL. Use `--no-browser` and never Playwright: the user doesn't want windows opening.

## 2. Fetch the book and its notes

```bash
python3 -I $SKILL/scripts/fetch_notes.py --title "staff engineer"                     # by (part of) the title, or "Title: Subtitle"
python3 -I $SKILL/scripts/fetch_notes.py --title "domain" --author "voelter"            # narrow by an author
python3 -I $SKILL/scripts/fetch_notes.py --author "voelter"                             # by author alone
python3 -I $SKILL/scripts/fetch_notes.py --id <book-id>                                 # an exact book
python3 -I $SKILL/scripts/fetch_notes.py                                                # no book named: the Main book
```

Pass the words the user used for the book. "My current book", "what I'm reading" or no book at all means the Main book, so call the script with no arguments.

The script prints JSON with the title, subtitle, authors, pages, `status` (`in progress`, `finished` or `not started`), `currentPage`, `finishDate`, the reading `purpose`, and `notes` in book order.

The book view gives the purpose only for an unfinished reading of the Main, Up next or a waiting book. For any other book (a finished book, a side read), the script reads it, read-only, from `library.json` in bookvie's data directory. When a book has been read more than once, it uses the latest reading's purpose.

Act on its exit code:

- **0:** go on.
- **2:** bookvie is down. Go back to step 1.
- **3:** no book was chosen: there's no Main book, or the title matched zero books or several. Several matches come back as `candidates`: show them (title, authors, year) and ask which one, then rerun with `--id`. With zero matches, ask the user for a fuller title or the author.
- **4:** a prerequisite is missing. `missing` lists `purpose`, `cardNotes` or both. Don't build a document. Tell the user which book you found and what it lacks:
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
