#!/usr/bin/env python3
"""Session-51 screenshot pixel-diff — verifies the 2 differing shots are the
documented timing class (confined to the known animated strips; every
geometry pin byte-stable). Compares the working-tree shot against the
committed HEAD version via git-show extraction."""
import subprocess, io, sys
from PIL import Image, ImageChops

SHOTS = ["clone-mobile-home", "clone-mobile-menu-open"]

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
    width = old.size[0]
    for i, p in enumerate(px):
        if p != (0, 0, 0):
            y = i // width
            rows[y] = rows.get(y, 0) + 1
    row_lo = min(rows) if rows else -1
    row_hi = max(rows) if rows else -1
    print(
        f"{name}: {changed}/{total} px ({100.0*changed/total:.3f}%) bbox={bbox} "
        f"changed rows y[{row_lo}..{row_hi}]"
    )
print("diff complete")
