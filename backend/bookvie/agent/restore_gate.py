"""bookvie's own confirmation before an agent's restore (AD-22's gate 2).

``restore_backup`` asks the user through MCP 2026-07-28 form elicitation: it
answers an ``InputRequiredResult`` whose ``requestState`` this module seals
by hand. The SDK's request-state boundary isn't used, because it would turn
every reason below into a protocol error.

A :class:`RestoreGate` belongs to one app (``app.state.restore_gate``): its
HMAC key, its process nonce and the single-use nonces it issued exist only
in that process, so a second app, like a restarted server, refuses the
first one's tokens as ``expired``.

A token is ``<process nonce hex>.<base64url JSON payload>.<base64url HMAC>``,
the MAC (HMAC-SHA256) taken over the first two parts. The payload holds the
single-use nonce, the resolved path, the archive's and ``library.json``'s
SHA-256 and the expiry, :data:`TOKEN_LIFETIME` ahead. :meth:`RestoreGate.open`
checks, in order: an unknown process nonce is ``expired`` (a restart); a bad
MAC or payload is ``changed``; a nonce not issued, or already spent, is
``changed`` (any answer spends it); past the expiry is ``expired``.
"""

import base64
import binascii
import hashlib
import hmac
import json
import secrets
import threading
from collections.abc import Mapping, Sequence
from datetime import date, datetime, timedelta
from typing import Any

from bookvie.intents import RestoreNotConfirmedReason, RestorePreview, Sealed, restore_not_confirmed

TOKEN_LIFETIME = timedelta(minutes=5)
"""How long the user has to answer bookvie's question."""
MODERN_PROTOCOL_VERSION = "2026-07-28"
"""The first MCP revision whose ``InputRequiredResult`` can carry the question."""
SHOWN_TITLES = 5
"""The most added titles the question names; the rest are "and N more"."""

_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


class RestoreGate:
    """The sealing key, process nonce and issued nonces of one app; see the module docstring."""

    def __init__(self) -> None:
        self._key = secrets.token_bytes(32)
        self._process = secrets.token_hex(16)
        self._issued: dict[str, datetime] = {}
        self._lock = threading.Lock()

    def _mac(self, signed: str) -> str:
        return _b64(hmac.new(self._key, signed.encode("ascii"), hashlib.sha256).digest())

    def seal(self, sealed: Sealed, now: datetime) -> str:
        """A single-use token for ``sealed``, valid for :data:`TOKEN_LIFETIME` from ``now``."""
        nonce = secrets.token_hex(16)
        expiry = now + TOKEN_LIFETIME
        payload = {
            "nonce": nonce,
            "path": sealed.path,
            "archiveSha256": sealed.archive_sha256,
            "librarySha256": sealed.library_sha256,
            "expiresAt": expiry.isoformat(),
        }
        signed = f"{self._process}.{_b64(json.dumps(payload).encode('utf-8'))}"
        with self._lock:
            # Forget the tokens nobody answered in time, so the set stays small.
            for old in [n for n, at in self._issued.items() if at < now]:
                del self._issued[old]
            self._issued[nonce] = expiry
        return f"{signed}.{self._mac(signed)}"

    def open(self, token: str | None, now: datetime) -> Sealed:
        """What ``token`` sealed, spending its nonce; ``restore_not_confirmed`` otherwise."""
        parts = token.split(".") if isinstance(token, str) else []
        if len(parts) == 3 and not hmac.compare_digest(parts[0], self._process):
            raise restore_not_confirmed(RestoreNotConfirmedReason.EXPIRED)
        if len(parts) != 3 or not hmac.compare_digest(
            parts[2], self._mac(f"{parts[0]}.{parts[1]}")
        ):
            raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
        try:
            payload = json.loads(_unb64(parts[1]))
            nonce = payload["nonce"]
            sealed = Sealed(
                path=payload["path"],
                archive_sha256=payload["archiveSha256"],
                library_sha256=payload["librarySha256"],
            )
            if not all(isinstance(v, str) for v in (nonce, *vars(sealed).values())):
                raise TypeError("a sealed value isn't a string")
        except binascii.Error, ValueError, KeyError, TypeError:
            raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED) from None
        with self._lock:
            expiry = self._issued.pop(nonce, None)
        if expiry is None:
            raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
        if now > expiry:
            raise restore_not_confirmed(RestoreNotConfirmedReason.EXPIRED)
        return sealed


def elicitation_supported(protocol_version: str | None, capabilities: Any) -> bool:
    """Whether the client can show bookvie's question: MCP 2026-07-28 or later, with form
    elicitation (an empty ``elicitation`` object counts as form; ``url`` alone doesn't)."""
    if not isinstance(protocol_version, str) or protocol_version < MODERN_PROTOCOL_VERSION:
        return False
    if not isinstance(capabilities, Mapping):
        return False
    elicitation = capabilities.get("elicitation")
    if not isinstance(elicitation, Mapping):
        return False
    return not elicitation or isinstance(elicitation.get("form"), Mapping)


def short_when(at: datetime, today: date) -> str:
    """ "19 Nov, 09:02", or "19 Nov 2025, 09:02" when it isn't this year (local time)."""
    local = at.astimezone()
    year = "" if local.year == today.year else f" {local.year}"
    return f"{local.day} {_MONTHS[local.month - 1]}{year}, {local:%H:%M}"


def _titles(titles: Sequence[str]) -> str:
    shown = ", ".join(titles[:SHOWN_TITLES])
    more = len(titles) - SHOWN_TITLES
    return f"{shown}, and {more} more" if more > 0 else shown


def confirmation_text(preview: RestorePreview, today: date) -> str:
    """UX-DR80's question for ``preview``, one plain-text paragraph.

    "Replace all data with the backup from 19 Nov, 09:02? You'd lose 3 books
    added since (A, B, C), 18 card notes, and every other change since then.
    A safety copy of your current library is saved first." With nothing
    added, the middle sentence is "Every change since then goes back, such as
    pages reached."; with only Books or only Card notes added, it names only
    those.
    """
    when = short_when(preview.backup_time, today)
    titles = preview.books_added_since
    count = preview.card_notes_added_since
    books = "1 book" if len(titles) == 1 else f"{len(titles):,} books"
    notes = "1 card note" if count == 1 else f"{count:,} card notes"
    if titles and count:
        lost = (
            f"You'd lose {books} added since ({_titles(titles)}), {notes}, "
            "and every other change since then."
        )
    elif titles:
        lost = f"You'd lose {books} added since ({_titles(titles)}), and every other change since then."
    elif count:
        lost = f"You'd lose {notes} added since, and every other change since then."
    else:
        lost = "Every change since then goes back, such as pages reached."
    return (
        f"Replace all data with the backup from {when}? {lost} "
        "A safety copy of your current library is saved first."
    )
