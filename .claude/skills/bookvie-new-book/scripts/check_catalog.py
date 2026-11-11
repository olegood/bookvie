"""Check whether a book is already in the bookvie catalog, before adding it.

Applies the same rules as the server's duplicate check
(backend/bookvie/domain/duplicates.py): two books are duplicates when both
have an ISBN and the normalized ISBNs are equal; when either lacks one, when
the titles match and at least one author is shared. Titles and names compare
NFKC-normalized, typographic quotes and dashes folded, whitespace collapsed,
casefolded.

It also lists "similar" books: the title of one contains the other's (a
leading "The"/"A"/"An" ignored), as when the user typed a partial title.
These aren't refused by the server, but the user should hear about them.

Usage:
    python3 -I check_catalog.py --title "The One Minute Architect" \
        [--author "Karol Wiszowaty" ...] [--isbn 978-8398263603] \
        [--base-url http://127.0.0.1:8765]

Prints JSON: {"duplicates": [...], "similar": [...]}. Exit codes: 0 when
nothing matched, 3 when a duplicate or similar book was found, 2 when
bookvie can't be reached.
"""

import argparse
import json
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

_WHITESPACE = re.compile(r"\s+")
_ARTICLE = re.compile(r"^(the|a|an) ")
_TYPOGRAPHIC = str.maketrans(
    {
        "‘": "'",
        "’": "'",
        "ʼ": "'",
        "“": '"',
        "”": '"',
        "–": "-",
        "—": "-",
    }
)


def key(text: str) -> str:
    folded = unicodedata.normalize("NFKC", text or "").translate(_TYPOGRAPHIC)
    return _WHITESPACE.sub(" ", folded.strip()).casefold()


def normalize_isbn(raw: str) -> str:
    compact = (raw or "").replace("-", "").replace(" ", "").upper()
    if len(compact) != 10:
        return compact
    stem = "978" + compact[:9]
    total = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(stem))
    return stem + str((10 - total % 10) % 10)


def get_json(base: str, path: str) -> dict:
    with urllib.request.urlopen(base + path, timeout=10) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--title", required=True)
    parser.add_argument("--author", action="append", default=[])
    parser.add_argument("--isbn", default="")
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    try:
        books = get_json(base, "/api/views/catalog")["books"]
        details = [
            get_json(base, "/api/views/book?id=" + urllib.parse.quote(b["id"])) for b in books
        ]
    except (urllib.error.URLError, OSError, KeyError, ValueError) as error:
        print(json.dumps({"error": f"bookvie not reachable at {base}: {error}"}))
        return 2

    title_key = key(args.title)
    short_key = _ARTICLE.sub("", title_key)
    author_keys = {k for k in (key(a) for a in args.author) if k}
    isbn = normalize_isbn(args.isbn)

    duplicates, similar = [], []
    for book in details:
        entry = {
            "id": book["id"],
            "title": book["title"],
            "subtitle": book.get("subtitle"),
            "authors": book.get("authors", []),
            "isbn": book.get("isbn"),
            "type": book.get("type"),
            "year": book.get("year"),
        }
        book_isbn = normalize_isbn(book.get("isbn") or "")
        book_title = key(book["title"])
        shared_author = bool(author_keys & {key(a) for a in book.get("authors", [])})
        if isbn and book_isbn:
            is_dup = isbn == book_isbn
        else:
            is_dup = title_key == book_title and shared_author
        if is_dup:
            duplicates.append(entry)
            continue
        book_short = _ARTICLE.sub("", book_title)
        if short_key and book_short and (short_key in book_short or book_short in short_key):
            entry["reason"] = "title overlaps" + (", shared author" if shared_author else "")
            similar.append(entry)

    print(json.dumps({"duplicates": duplicates, "similar": similar}, ensure_ascii=False, indent=1))
    return 3 if duplicates or similar else 0


if __name__ == "__main__":
    sys.exit(main())
