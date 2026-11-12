"""Fetch one bookvie book with its reading purpose and card notes, for summarizing.

Picks the book in this order: --id; else --title (and optional --author),
matched against the catalog; else the current Main book. Any book in the
catalog can be chosen: in progress, paused, a side read, finished or unread.

Book details and card notes come from GET /api/views/book. That view only
carries the Purpose of an unfinished Reading of the Main, Up next or a
waiting Book, so for any other Book (finished, a side read) the Purpose is
read from the data directory's library.json, whose path comes from
GET /api/health. The file is only read, never written.

When the Book has several Readings, the latest one with a Purpose is used
(an unfinished Reading first, then by start date).

Prerequisites for a summary: the Book has a Purpose and at least one card
note. When either is missing the script says which, under "missing".

Usage:
    python3 -I fetch_notes.py [--id ID | [--title "part of title"] [--author "name"]] \
        [--base-url http://127.0.0.1:8765]

Prints JSON. Exit codes: 0 ok; 2 bookvie can't be reached; 3 no book
chosen (no Main book, or the title matched zero or several books, listed
under "candidates"); 4 a prerequisite is missing (see "missing").
"""

import argparse
import json
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

_TYPOGRAPHIC = str.maketrans({"‘": "'", "’": "'", "ʼ": "'", "“": '"', "”": '"', "–": "-", "—": "-"})


def key(text: str | None) -> str:
    folded = unicodedata.normalize("NFKC", text or "").translate(_TYPOGRAPHIC)
    return " ".join(folded.split()).casefold()


def get(base: str, path: str, **params: str) -> dict:
    url = base.rstrip("/") + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.load(resp)


def out(payload: dict, code: int) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    sys.exit(code)


def brief(b: dict) -> dict:
    return {"id": b["id"], "title": b.get("title"), "subtitle": b.get("subtitle"),
            "authors": b.get("authors"), "year": b.get("year")}


def choose_by_title(base: str, title: str | None, author: str | None) -> str:
    books = get(base, "/api/views/catalog")["books"]
    needle = key(title)
    if author:
        a = key(author)
        books = [b for b in books if any(a in key(n) for n in b.get("authors") or [])]

    def full(b: dict) -> str:
        return key(f"{b.get('title') or ''}: {b['subtitle']}" if b.get("subtitle") else b.get("title"))

    exact = [b for b in books if needle in (key(b.get("title")), full(b))]
    hits = exact or [b for b in books if needle in full(b)]
    if len(hits) != 1:
        reason = "no book matches" if not hits else "several books match"
        what = " ".join(x for x in (f"'{title}'" if title else "", f"by '{author}'" if author else "") if x)
        out({"error": f"{reason} {what}",
             "candidates": [brief(b) for b in hits[:20]]}, 3)
    return hits[0]["id"]


def stored_reading(base: str, book_id: str) -> dict | None:
    """The latest Reading with a Purpose from library.json, or None."""
    data_dir = get(base, "/api/health").get("dataDir")
    if not data_dir:
        return None
    path = Path(data_dir) / "library.json"
    try:
        library = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    book = next((b for b in library.get("books", []) if b.get("id") == book_id), None)
    if not book:
        return None
    with_purpose = [r for r in book.get("readings") or [] if (r.get("purpose") or "").strip()]
    if not with_purpose:
        return None
    with_purpose.sort(key=lambda r: (r.get("finishDate") is None, r.get("startDate") or ""))
    return with_purpose[-1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id")
    ap.add_argument("--title")
    ap.add_argument("--author")
    ap.add_argument("--base-url", default="http://127.0.0.1:8765")
    a = ap.parse_args()

    try:
        book_id = a.id
        if not book_id and (a.title or a.author):
            book_id = choose_by_title(a.base_url, a.title, a.author)
        if not book_id:
            main_book = get(a.base_url, "/api/views/home").get("mainBook")
            if not main_book:
                out({"error": "there is no Main book; name a book by title"}, 3)
            book_id = main_book["id"]
        b = get(a.base_url, "/api/views/book", id=book_id)

        current = b.get("currentReading") or {}
        purpose = (current.get("purpose") or "").strip() or None
        current_page = current.get("currentPage")
        finish_date = None
        if purpose is None:
            reading = stored_reading(a.base_url, book_id)
            if reading:
                purpose = reading["purpose"].strip()
                finish_date = reading.get("finishDate")
                current_page = None if finish_date else reading.get("currentPage")
    except urllib.error.HTTPError as exc:
        out({"error": f"bookvie answered {exc.code} for book {book_id}"}, 3)
    except (urllib.error.URLError, OSError) as exc:
        out({"error": f"bookvie unreachable at {a.base_url}: {exc}"}, 2)

    notes = sorted(b.get("cardNotes") or [],
                   key=lambda n: (n.get("pageStart") or 0, n.get("createdAt") or ""))
    if finish_date is None and current_page is None:
        finish_date = b.get("latestFinishDate")
    status = "finished" if finish_date and current_page is None else (
        "in progress" if current_page is not None else "not started")

    missing = []
    if not purpose:
        missing.append("purpose")
    if not notes:
        missing.append("cardNotes")

    payload = {
        **brief(b),
        "pages": b.get("pages"),
        "role": b.get("role"),
        "sideRead": b.get("sideRead"),
        "status": status,
        "currentPage": current_page,
        "finishDate": finish_date,
        "purpose": purpose,
        "noteCount": len(notes),
        # Pages are kept only so notes read in book order; the document omits them.
        "notes": [{"page": n.get("pageStart"), "text": n["text"]} for n in notes],
    }
    if missing:
        payload = {"error": "prerequisite missing", "missing": missing, **payload}
    out(payload, 4 if missing else 0)


if __name__ == "__main__":
    main()
