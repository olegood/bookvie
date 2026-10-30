"""The filesystem seam (TC-3).

Every write the store makes goes through a :class:`FileSystem`, so tests can
inject a fault at any step of a commit. :class:`OsFileSystem` is the real one.
"""

import errno
import fcntl
import os
import tempfile
from pathlib import Path
from typing import Protocol


# What a filesystem that doesn't do F_FULLFSYNC answers; anything else is a real I/O failure.
_FULLFSYNC_UNSUPPORTED = {errno.ENOTSUP, errno.EINVAL, errno.ENOTTY}


class FileSystem(Protocol):
    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]: ...
    def write(self, fd: int, data: bytes) -> None: ...
    def fsync(self, fd: int) -> None: ...
    def close(self, fd: int) -> None: ...
    def replace(self, src: Path, dst: Path) -> None: ...
    def remove(self, path: Path) -> None: ...


class OsFileSystem:
    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        fd, name = tempfile.mkstemp(dir=directory, prefix=prefix)
        return fd, Path(name)

    def write(self, fd: int, data: bytes) -> None:
        view = memoryview(data)
        while view:
            written = os.write(fd, view)
            view = view[written:]

    def fsync(self, fd: int) -> None:
        # On macOS os.fsync doesn't flush the drive's write cache; F_FULLFSYNC
        # does. Filesystems that don't support it fall back to os.fsync.
        full_fsync = getattr(fcntl, "F_FULLFSYNC", None)
        if full_fsync is not None:
            try:
                fcntl.fcntl(fd, full_fsync)
                return
            except OSError as error:
                if error.errno not in _FULLFSYNC_UNSUPPORTED:
                    raise
        os.fsync(fd)

    def close(self, fd: int) -> None:
        os.close(fd)

    def replace(self, src: Path, dst: Path) -> None:
        os.replace(src, dst)

    def remove(self, path: Path) -> None:
        os.remove(path)
