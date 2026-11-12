"""Where a Book's cover lives: ``covers/<name>`` in the data folder.

The store resolves ``coverFile`` with :func:`cover_name`, and the AD-18
invariant ``book_cover_file_in_covers`` accepts exactly what it accepts.
"""

COVERS_DIR = "covers"


def cover_name(cover_file: str) -> str | None:
    """The file name in ``covers/`` that ``cover_file`` names, or ``None`` if it names none.

    Only ``covers/<name>`` with a plain name counts, so a hand-edited
    ``coverFile`` can never reach a file outside ``covers/``.
    """
    prefix = f"{COVERS_DIR}/"
    if not cover_file.startswith(prefix):
        return None
    name = cover_file[len(prefix) :]
    if not name or name in (".", "..") or "/" in name or "\\" in name or "\0" in name:
        return None
    return name
