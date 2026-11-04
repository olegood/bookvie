"""Story 2.3, automation expansion: what goes wrong while an archive is unpacked.

Branch coverage after Story 2.3 left two paths of ``_copy_entry``
(:mod:`bookvie.store.restore`) untested:

- an entry that passes every safety rule but can't be inflated: a damaged
  deflate stream, an encrypted entry, an unsupported compression method. It
  must stay AC-1's ``restore_invalid``. The byte budget opens each entry
  through its own copy of the ``ZipInfo``, so a regression there could turn
  damage into ``restore_unsafe`` or a 500.
- a disk fault writing into ``.staging/``. It must be AC-4's 503
  ``couldnt_save``. These writes bypass the ``FileSystem`` seam (spec Never),
  so the test patches ``open`` in that module, as
  ``test_ac3_extraction_stops_before_staging_passes_the_cap`` does.

In both, the broken entry is the last cover, so ``library.json`` and Dune's
cover are already staged and must be emptied again. The seeds and the
"nothing changed" snapshot are ``test_restore_refusals.py``'s.
"""

import errno
import io
import struct
import zipfile
from pathlib import Path
from typing import Self

import pytest

import bookvie.store.restore as unpack
from tests.helpers import COULDNT_SAVE_BODY, api_client, post_restore
from tests.test_restore_refusals import (
    PIRANESI_COVER,
    RESTORE_INVALID_BODY,
    _seed_target,
    _Snapshot,
    _Source,
)

DAMAGED = f"covers/{PIRANESI_COVER}"
"""The last entry unpacked: the export's covers are written in name order."""


def _deflated_with(entries: dict[str, bytes], name: str, damage: str) -> bytes:
    """A deflated archive whose ``name`` entry is broken one way.

    ``"stream"`` overwrites the start of its compressed bytes with ``0xFF``
    (a reserved deflate block type). ``"encrypted"`` sets the encryption flag,
    and ``"method"`` sets compression method 99 (what AES zips write), in
    both the local header and the central directory.
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for entry, data in entries.items():
            zf.writestr(entry, data)
    raw = bytearray(buffer.getvalue())
    with zipfile.ZipFile(io.BytesIO(bytes(raw))) as zf:
        offset = zf.getinfo(name).header_offset
    if damage == "stream":
        name_length, extra_length = struct.unpack_from("<HH", raw, offset + 26)
        start = offset + 30 + name_length + extra_length
        raw[start : start + 8] = b"\xff" * 8
        return bytes(raw)
    # The field's offset in the local header and in the central directory record.
    if damage == "encrypted":
        local, central, update = 6, 8, lambda old: old | 0x1
    else:
        local, central, update = 8, 10, lambda _old: 99
    fields = [offset + local]
    position = raw.find(b"PK\x01\x02")
    while position != -1:
        name_length = struct.unpack_from("<H", raw, position + 28)[0]
        if raw[position + 46 : position + 46 + name_length] == name.encode():
            fields.append(position + central)
        position = raw.find(b"PK\x01\x02", position + 46)
    for at in fields:
        struct.pack_into("<H", raw, at, update(struct.unpack_from("<H", raw, at)[0]))
    return bytes(raw)


def test_ac1_an_entry_that_cannot_be_unpacked_is_restore_invalid_not_unsafe(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    files = {name: data for name, data in source.entries().items() if data is not None}
    damaged = f"couldn't restore: the file {DAMAGED} is damaged"
    unreadable = f"couldn't restore: the file {DAMAGED} can't be read"
    cases = {
        "a damaged deflate stream": ("stream", damaged),
        "an encrypted entry": ("encrypted", unreadable),
        "an unsupported compression method": ("method", unreadable),
    }
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    for case, (damage, logged) in cases.items():
        before = _Snapshot(target)
        capsys.readouterr()

        response = post_restore(client, _deflated_with(files, DAMAGED, damage))

        assert response.status_code == 422, case
        assert response.json() == RESTORE_INVALID_BODY, case
        _Snapshot.assert_unchanged(before, target, case)
        assert logged in capsys.readouterr().err, case


class _FullDisk:
    """The file ``_copy_entry`` writes to, on a disk that is full."""

    def __init__(self, file) -> None:
        self.file = file

    def write(self, data: bytes) -> int:
        raise OSError(errno.ENOSPC, "No space left on device")

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc: object) -> None:
        self.file.close()


def test_ac4_a_disk_fault_while_unpacking_into_staging_is_503_with_nothing_changed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    source = _Source(tmp_path)
    real_open = open

    def faulty_open(fault: str):
        def fake_open(path, mode="r", *args, **kwargs):
            if fault == "open":
                raise OSError(errno.EACCES, "Permission denied")
            file = real_open(path, mode, *args, **kwargs)
            return _FullDisk(file) if Path(path).name == PIRANESI_COVER else file

        return fake_open

    cases = {
        "opening .staging/library.json fails": ("open", "can't write .staging/library.json"),
        "the disk fills writing the last cover": ("write", f"can't write .staging/{DAMAGED}"),
    }
    target = tmp_path / "target"
    _seed_target(target)
    client = api_client(target)

    for case, (fault, logged) in cases.items():
        before = _Snapshot(target)
        capsys.readouterr()
        with monkeypatch.context() as patch:
            patch.setattr(unpack, "open", faulty_open(fault), raising=False)

            response = post_restore(client, source.export)

        assert response.status_code == 503, case
        assert response.json() == COULDNT_SAVE_BODY, case
        _Snapshot.assert_unchanged(before, target, case)
        assert f"couldn't save: {logged}" in capsys.readouterr().err, case

    # Nothing is left half-done: the same archive restores once the disk is back.
    assert post_restore(client, source.export).status_code == 200
    titles = sorted(book["title"] for book in client.get("/api/views/catalog").json()["books"])
    assert titles == ["Dune", "Piranesi"]
