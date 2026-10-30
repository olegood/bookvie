"""The one commit path every intent goes through.

:func:`commit` runs a change through :meth:`Store.apply` and maps every
failure to the envelope: an :class:`IntentError` raised by the change (a
refusal) passes through; a broken AD-18 rule, a re-validation error or any
unexpected exception is 500 ``couldnt_save``; a failed write is 503
``couldnt_save``. Nothing is committed in any of these cases, and each
``couldnt_save`` logs one ``bookvie: …`` line to stderr.
"""

import sys
from collections.abc import Callable

from pydantic import ValidationError

from bookvie.domain import InvariantViolation, Library
from bookvie.store import CouldntSave, Store

from .contract import IntentError, couldnt_save

Change = Callable[[Library], Library | None]


def log(message: str) -> None:
    print(f"bookvie: {message}", file=sys.stderr, flush=True)


def commit(store: Store, change: Change) -> Library:
    """Apply ``change`` and commit it once, or raise :class:`IntentError`."""
    try:
        return store.apply(change)
    except IntentError:
        raise
    except InvariantViolation as exc:
        log(f"couldn't save: library rule {exc.rule} failed: {exc.message}")
        raise couldnt_save(500) from exc
    except ValidationError as exc:
        first = exc.errors()[0]
        where = ".".join(str(part) for part in first["loc"]) or "library"
        log(f"couldn't save: the library is not valid: {where}: {first['msg']}")
        raise couldnt_save(500) from exc
    except CouldntSave as exc:
        log(f"couldn't save: {exc}")
        raise couldnt_save(503) from exc
    except Exception as exc:  # noqa: BLE001 - any failure commits nothing
        log(f"couldn't save: unexpected {type(exc).__name__}: {exc}")
        raise couldnt_save(500) from exc
