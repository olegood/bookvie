"""Helpers for tests that start a real ``bookvie`` process."""

import subprocess
import time
from pathlib import Path

from bookvie import instance

POLL_SECONDS = 0.1


def wait_for_health(server: subprocess.Popen, port: int, data_dir: Path, timeout: float = 20) -> None:
    """Return once ``/api/health`` on ``port`` answers for ``data_dir``.

    Fails with the server's stderr if it exits first, or after ``timeout``
    seconds. The pause between probes is a poll interval, not a hard wait:
    the loop ends on the condition, so a fast start returns at once.
    """
    deadline = time.monotonic() + timeout
    while not instance.same_folder(instance.probe_health(port, timeout=0.2), data_dir):
        assert server.poll() is None, server.stderr.read().decode()
        assert time.monotonic() < deadline, "server never answered health"
        time.sleep(POLL_SECONDS)
