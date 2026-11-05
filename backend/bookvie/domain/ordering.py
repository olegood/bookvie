"""The server's one title ordering key (ARCHITECTURE-SPINE "Title ordering")."""

import unicodedata


def title_key(title: str) -> str:
    """NFKD normalized, combining marks stripped, casefolded: "Émile" and "emile" share a key.

    Callers break ties by Book id.
    """
    decomposed = unicodedata.normalize("NFKD", title)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return stripped.casefold()
