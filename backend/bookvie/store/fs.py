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

# What a filesystem that can't open or fsync a folder answers; the flush is skipped.
_DIR_FSYNC_UNSUPPORTED = {errno.ENOTSUP, errno.EINVAL, errno.EBADF}


class FileSystem(Protocol):
    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]: ...
    def write(self, fd: int, data: bytes) -> None: ...
    def fsync(self, fd: int) -> None: ...
    def close(self, fd: int) -> None: ...
    def replace(self, src: Path, dst: Path) -> None: ...
    def fsync_dir(self, directory: Path) -> None: ...
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

    def fsync_dir(self, directory: Path) -> None:
        # Makes a rename in ``directory`` survive a power cut. Filesystems that
        # can't open or fsync a folder skip it; real I/O failures raise.
        try:
            fd = os.open(directory, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        except OSError as error:
            if error.errno in _DIR_FSYNC_UNSUPPORTED:
                return
            raise
        try:
            self.fsync(fd)
        except OSError as error:
            if error.errno not in _DIR_FSYNC_UNSUPPORTED:
                raise
        finally:
            os.close(fd)

    def remove(self, path: Path) -> None:
        os.remove(path)
