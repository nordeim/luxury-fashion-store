#!/usr/bin/env python3
"""Session-53 screenshot confine check (the PIL pixel-diff, cribbing the
session-52 method): the 2 differing shots are expected to be the documented
timing class (carousel phase / countdown) — confined to the animated strips
with every geometry pin byte-stable. Diffs the WORKTREE shot against the HEAD
shot; prints changed-pixel counts + bounding boxes + the confine verdicts."""
import subprocess, io, sys
from PIL import Image

def head_bytes(path):
    return subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, cwd=".").stdout

def diff(path, label, region=None):
    work = Image.open(path).convert("RGB")
    head = Image.open(io.BytesIO(head_bytes(path))).convert("RGB")
    assert work.size == head.size, f"{label}: size changed {head.size} -> {work.size}"
    w, h = work.size
    pw, ph = work.load(), head.load()
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            if pw[x, y] != ph[x, y]:
                xs.append(x); ys.append(y)
    n = len(xs)
    if n == 0:
        print(f"{label}: BYTE-IDENTICAL (0 px)")
        return
    box = (min(xs), min(ys), max(xs), max(ys))
    print(f"{label}: {n} px differ, bbox={box}")
    if region:
        x0, y0, x1, y1 = region
        outside = [1 for x, y in zip(xs, ys) if not (x0 <= x <= x1 and y0 <= y <= y1)]
        print(f"  confine[{x0}<=x<={x1}, {y0}<=y<={y1}]: {'OK — all inside' if not outside else str(len(outside)) + ' px OUTSIDE'}")

# The documented timing-class regions (the standing ledger):
#  - clone-mobile-home: the hero carousel strip (y ≈ 728..746)
#  - clone-mobile-menu-open: the behind-drawer column (x > 320) + the strip
diff("docs/screenshots/clone-mobile-home.png", "clone-mobile-home", region=(0, 728, 389, 746))
m = "docs/screenshots/clone-mobile-menu-open.png"
# drawer crop proof: x < 320 must be byte-identical
work = Image.open(m).convert("RGB"); head = Image.open(io.BytesIO(head_bytes(m))).convert("RGB")
w, h = work.size
diffs_left = sum(1 for y in range(h) for x in range(0, 320) if work.getpixel((x, y)) != head.getpixel((x, y)))
print(f"clone-mobile-menu-open drawer crop (x<320): {diffs_left} px differ {'— BYTE-IDENTICAL' if diffs_left == 0 else ''}")
diff(m, "clone-mobile-menu-open", region=(320, 0, w - 1, h - 1))
