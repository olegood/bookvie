"""``bookvie-dropbox``: bookvie's Dropbox side, a second process (AD-22).

It is a stdio MCP server that Claude Code starts (``bookvie-dropbox serve``),
plus the one-time sign-in (``bookvie-dropbox auth``). It ships in bookvie's
wheel but never imports ``bookvie``, and ``bookvie`` never imports it, nor
``dropbox`` or ``keyring``. The two meet only in skills, through files in the
backups folder; the few rules both need are copied in :mod:`.contracts`.
"""
