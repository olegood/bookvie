"""The Dropbox client bookvie-dropbox uses, built from the Keychain's refresh token (AD-22).

bookvie's Dropbox app is an App-folder app signed in with OAuth PKCE, so it
has an app key and no app secret. The refresh token lives only in the
Keychain, under :data:`KEYRING_SERVICE` / :data:`KEYRING_ACCOUNT`; the SDK
turns it into short-lived access tokens itself, and refreshes an expired one.
"""

from typing import Any

import dropbox
import keyring
import keyring.errors

APP_KEY_PLACEHOLDER = "REPLACE-WITH-YOUR-DROPBOX-APP-KEY"
APP_KEY = APP_KEY_PLACEHOLDER
"""The app key of bookvie's Dropbox app (its Settings page, "App key"). A PKCE app key
isn't a secret. Until the app is registered this is a placeholder: paste the key here
and reinstall (docs/dropbox-backup.md, Setup)."""

KEYRING_SERVICE = "bookvie-dropbox"
KEYRING_ACCOUNT = "refresh-token"

SIGNIN_COMMAND = "bookvie-dropbox auth"


class SigninError(Exception):
    """bookvie-dropbox isn't signed in to Dropbox, or can't read its sign-in.

    Its message never holds a token."""


def read_refresh_token() -> str:
    """The Keychain's refresh token; :class:`SigninError` when it is missing or unreadable."""
    try:
        token = keyring.get_password(KEYRING_SERVICE, KEYRING_ACCOUNT)
    except keyring.errors.KeyringError as exc:
        raise SigninError(
            f"Couldn't read the Dropbox sign-in from the Keychain ({type(exc).__name__})."
        ) from None
    if not token:
        raise SigninError("bookvie-dropbox isn't signed in to Dropbox.")
    return token


def connect(*, session: Any = None) -> dropbox.Dropbox:
    """A Dropbox client that refreshes its access token from the Keychain's refresh token.

    ``session`` is a ``requests.Session`` for the SDK (tests mount a fake on one). Raises
    :class:`SigninError` before any request when the Keychain has no readable token.
    """
    return dropbox.Dropbox(
        oauth2_refresh_token=read_refresh_token(),
        app_key=APP_KEY,
        session=session,
        # The SDK's default retries a 429 forever, which would hang upload_backup.
        max_retries_on_rate_limit=3,
    )
