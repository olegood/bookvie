"""The ``bookvie-dropbox`` command: ``auth`` signs in once, ``serve`` runs the MCP server."""

import argparse
import sys
from collections.abc import Sequence

# Imported here, not on demand, so `--help` loads dropbox, keyring (through auth's
# dropbox_api) and mcp: the install smoke test runs `bookvie-dropbox --help` to prove they ship.
from .auth import AuthFailed, run_auth
from .server import serve


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="bookvie-dropbox",
        description="Back bookvie up to its Dropbox App folder (an MCP server for Claude Code).",
    )
    commands = parser.add_subparsers(dest="command", required=True, metavar="{auth,serve}")
    commands.add_parser(
        "auth",
        help="sign in to Dropbox once; the sign-in is kept in the Keychain",
        description="Sign in to Dropbox in the browser and keep the sign-in in the Keychain.",
    )
    commands.add_parser(
        "serve",
        help="run the MCP server over stdio (Claude Code starts it)",
        description="Run bookvie-dropbox's MCP server over stdin and stdout.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)
    if args.command == "auth":
        try:
            run_auth()
        except AuthFailed as exc:
            print(f"bookvie-dropbox: {exc}", file=sys.stderr)
            sys.exit(1)
        except KeyboardInterrupt:
            print("bookvie-dropbox: sign-in cancelled; nothing was saved.", file=sys.stderr)
            sys.exit(130)
        return
    serve()


if __name__ == "__main__":
    main()
