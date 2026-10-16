#!/home/z/.venv/bin/python3
"""Wrap rendered PNGs into a single multi-size .ico (session-24, F-K).

Pillow's ICO save resamples from one base image; the exact per-size renders
deserve to ship verbatim. This writes the ICO container directly:

    ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes × N) + raw PNG blobs

PNG-in-ICO is valid from Vista onward (all browsers read it). The result is
verified by re-opening with Pillow and asserting the carried size set.
"""
import struct
import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: png-to-ico.py <tmp-dir> <out.ico>", file=sys.stderr)
        return 2
    tmp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    sizes = [16, 32, 48]

    frames = []
    for size in sizes:
        p = tmp / f"favicon-{size}.png"
        im = Image.open(p).convert("RGBA")
        if im.size != (size, size):
            print(f"[ico] unexpected frame size {im.size} for {p}", file=sys.stderr)
            return 1
        frames.append((size, p.read_bytes()))

    # ICONDIR: reserved=0, type=1 (icon), count=N
    header = struct.pack("<HHH", 0, 1, len(frames))
    # ICONDIRENTRY: width/height (0 means 256), colors=0, reserved=0,
    # planes=1, bitcount=32, bytes-in-resource, offset
    entries = b""
    offset = 6 + 16 * len(frames)
    for size, blob in frames:
        entries += struct.pack(
            "<BBBBHHII",
            size if size < 256 else 0,
            size if size < 256 else 0,
            0,
            0,
            1,
            32,
            len(blob),
            offset,
        )
        offset += len(blob)
    out.write_bytes(header + entries + b"".join(blob for _, blob in frames))

    # verify: Pillow must open it and carry all three entries
    with Image.open(out) as check:
        carried = sorted(check.info.get("sizes") or [])
        expect = sorted((s, s) for s in sizes)
        if carried != expect:
            print(f"[ico] verification failed: {carried} != {expect}", file=sys.stderr)
            return 1
    print(f"[ico] {out} carries {sizes} ({out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
