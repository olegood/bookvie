"""The one Purpose rule (FR-9): stored trimmed, ``None`` when nothing is left.

Both ``start-reading`` and ``edit-purpose`` store a Purpose through
:func:`normalize_purpose`.
"""


def normalize_purpose(purpose: str | None) -> str | None:
    """``purpose`` stripped of surrounding whitespace; ``None`` when empty or ``None``."""
    if purpose is None:
        return None
    return purpose.strip() or None
