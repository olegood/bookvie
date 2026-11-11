"""Add one book to bookvie with the add-book intent, then confirm it through the book view.

Sends one ``POST /api/intents/add-book`` (AD-3): a multipart body with the
form's fields as typed in a JSON part named ``intent``, and the cover in a
part named ``cover``. No browser is involved.

Usage:
    python3 -I add_book.py --book /abs/path/book.json [--confirm-duplicate] \
        [--base-url http://127.0.0.1:8765]

book.json holds the values by form field:
    {"title", "subtitle", "pages", "authors" ("A; B"), "edition", "language",
     "publisher", "type" ("Paperback" | "Hardcover" | "Ebook"), "isbn", "year",
     "tags" ("added-by-skill, x"), "cover" (absolute path to a JPEG/PNG/WebP),
     "finishedOn", "spineColor"}
Empty or missing optional values are left out.

Prints JSON with "outcome":
    saved      201/200 ok; "book" is the book view read back, "verified" is true
               when its title and tags match what was sent and the cover is there
    duplicate  409 duplicate_book; "duplicates" lists the matching books. Nothing
               was saved; rerun with --confirm-duplicate to add it anyway
    invalid    422 invalid_fields; "fields" lists each field and its message
    failed     couldn't save (5xx); the data wasn't changed
    error      the script itself failed (bookvie down, a bad book.json)
Exit code: 0 for saved and verified, 3 for duplicate, 1 otherwise.
"""

import argparse
import json
import mimetypes
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

# book.json key -> the add-book intent's key (camelCase, as the form sends it)
FIELDS = {
    "title": "title",
    "subtitle": "subtitle",
    "pages": "pages",
    "authors": "authors",
    "edition": "edition",
    "language": "language",
    "publisher": "publisher",
    "type": "type",
    "isbn": "isbn",
    "year": "year",
    "tags": "tags",
    "finishedOn": "finishedOn",
    "spineColor": "spineColor",
}
REQUIRED = ("title", "pages", "authors", "language", "publisher", "type")


def present(value: object) -> bool:
    return value is not None and str(value).strip() != ""


def build_intent(book: dict, confirm_duplicate: bool) -> dict:
    """The form's fields as strings, as typed; empty ones left out."""
    intent: dict[str, object] = {}
    for source, key in FIELDS.items():
        if present(book.get(source)):
            intent[key] = str(book[source]).strip()
    intent.setdefault("edition", "1")
    intent["type"] = str(intent["type"]).lower()
    if confirm_duplicate:
        intent["confirmDuplicate"] = True
    return intent


def multipart(intent: dict, cover: Path | None) -> tuple[bytes, str]:
    boundary = "bookvie-" + uuid.uuid4().hex
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="intent"\r\n'
        "Content-Type: application/json\r\n\r\n".encode()
        + json.dumps(intent, ensure_ascii=False).encode()
        + b"\r\n"
    ]
    if cover is not None:
        content_type = mimetypes.guess_type(cover.name)[0] or "application/octet-stream"
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="cover"; filename="{cover.name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n".encode()
            + cover.read_bytes()
            + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def post(base: str, path: str, body: bytes, content_type: str) -> tuple[int, dict]:
    request = urllib.request.Request(
        base + path, data=body, method="POST", headers={"Content-Type": content_type}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def get(base: str, path: str) -> dict:
    with urllib.request.urlopen(base + path, timeout=10) as response:
        return json.load(response)


def add(args: argparse.Namespace) -> dict:
    book = json.loads(Path(args.book).read_text(encoding="utf-8"))
    missing = [key for key in REQUIRED if not present(book.get(key))]
    if missing:
        return {"outcome": "error", "message": f"book.json lacks {', '.join(missing)}"}
    cover = Path(book["cover"]) if present(book.get("cover")) else None
    if cover is not None and not cover.is_file():
        return {"outcome": "error", "message": f"cover file not found: {cover}"}

    base = args.base_url.rstrip("/")
    intent = build_intent(book, args.confirm_duplicate)
    status, body = post(base, "/api/intents/add-book", *multipart(intent, cover))

    if status == 200 and body.get("ok"):
        book_id = body["ids"]["bookId"]
        view = get(base, "/api/views/book?id=" + urllib.parse.quote(book_id))
        sent_tags = {t.strip().casefold() for t in intent.get("tags", "").split(",") if t.strip()}
        verified = (
            view["title"] == intent["title"]
            and sent_tags <= {t.casefold() for t in view.get("tags", [])}
            and (cover is None or view.get("hasCover") is True)
        )
        kept = (
            "id",
            "title",
            "subtitle",
            "authors",
            "pages",
            "edition",
            "language",
            "publisher",
            "type",
        )
        summary = {
            key: view.get(key) for key in kept + ("isbn", "year", "tags", "hasCover", "spineColor")
        }
        return {
            "outcome": "saved",
            "addedAnyway": args.confirm_duplicate,
            "verified": verified,
            "book": summary,
        }

    error = body.get("error", {})
    code = error.get("code")
    if code == "duplicate_book":
        return {
            "outcome": "duplicate",
            "message": error.get("message"),
            "duplicates": error.get("duplicates", []),
        }
    if code == "invalid_fields":
        return {
            "outcome": "invalid",
            "message": error.get("message"),
            "fields": error.get("fields", []),
        }
    if code == "couldnt_save":
        return {"outcome": "failed", "message": error.get("message")}
    return {"outcome": "error", "message": f"HTTP {status}: {json.dumps(body)}"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--book", required=True)
    parser.add_argument("--confirm-duplicate", action="store_true")
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    args = parser.parse_args()
    try:
        result = add(args)
    except (urllib.error.URLError, OSError, ValueError, KeyError) as error:
        result = {"outcome": "error", "message": str(error)}
    print(json.dumps(result, ensure_ascii=False, indent=1))
    if result["outcome"] == "saved":
        return 0 if result["verified"] else 1
    return 3 if result["outcome"] == "duplicate" else 1


if __name__ == "__main__":
    sys.exit(main())
