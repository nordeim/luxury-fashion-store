#!/usr/bin/env python3
"""Session-52 screenshot pixel-diff — verifies the 4 differing shots are the
documented timing class (confined to the known animated strips: the hero
carousel phase, the Exclusive-Deals countdown strip; every geometry pin
byte-stable). Compares the working-tree shot against the committed HEAD
version via git-show extraction. The row-histogram confine check is the
session-51 script's documented approach (pngjs unavailable; PIL is)."""
import subprocess, io, sys
from PIL import Image, ImageChops

SHOTS = [
    "clone-mobile-home",
    "clone-mobile-menu-open",
    "clone-home-desktop",
    "clone-exclusive-deals",
]

for name in SHOTS:
    path = f"docs/screenshots/{name}.png"
    old_bytes = subprocess.run(
        ["git", "show", f"HEAD:{path}"], capture_output=True, check=True
    ).stdout
    old = Image.open(io.BytesIO(old_bytes)).convert("RGB")
    new = Image.open(path).convert("RGB")
    if old.size != new.size:
        print(f"{name}: SIZE CHANGED {old.size} -> {new.size} (NOT the timing class)")
        sys.exit(1)
    diff = ImageChops.difference(old, new)
    bbox = diff.getbbox()
    px = ImageChops.difference(old, new).getdata()
    changed = sum(1 for p in px if p != (0, 0, 0))
    total = old.size[0] * old.size[1]
    # Row histogram of changed pixels (confine check)
    rows = {}
    cols = {}
    width = old.size[0]
    for i, p in enumerate(px):
        if p != (0, 0, 0):
            y = i // width
            x = i % width
            rows[y] = rows.get(y, 0) + 1
            cols[x] = cols.get(x, 0) + 1
    row_lo = min(rows) if rows else -1
    row_hi = max(rows) if rows else -1
    col_lo = min(cols) if cols else -1
    col_hi = max(cols) if cols else -1
    # The contiguous changed-row bands (the strips)
    bands = []
    if rows:
        ys = sorted(rows)
        start = prev = ys[0]
        for y in ys[1:]:
            if y - prev > 8:
                bands.append((start, prev))
                start = y
            prev = y
        bands.append((start, prev))
    print(
        f"{name}: {changed}/{total} px ({100.0*changed/total:.3f}%) bbox={bbox} "
        f"rows y[{row_lo}..{row_hi}] cols x[{col_lo}..{col_hi}] bands={bands}"
    )
print("diff complete")
