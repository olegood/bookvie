"""Print the app's OpenAPI schema as stable JSON (the API contract source).

``frontend/scripts/api-contract.mjs`` turns it into
``frontend/src/api/generated/schema.d.ts``.

Usage: ``uv run python scripts/openapi.py``
"""

import json
import sys

from bookvie.http.app import create_app


def main() -> int:
    schema = create_app().openapi()
    sys.stdout.write(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
