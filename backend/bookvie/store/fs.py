"""The filesystem seam (TC-3).

Every write the store makes goes through a :class:`FileSystem`, so tests can
inject a fault at any step of a commit. :class:`OsFileSystem` is the real one.
"""

import os
import tempfile
from pathlib import Path
from typing import Protocol


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
        os.fsync(fd)

    def close(self, fd: int) -> None:
        os.close(fd)

    def replace(self, src: Path, dst: Path) -> None:
        os.replace(src, dst)

    def remove(self, path: Path) -> None:
        os.remove(path)
