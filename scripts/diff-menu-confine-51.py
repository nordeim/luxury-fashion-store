#!/usr/bin/env python3
"""Session-51 confine check for clone-mobile-menu-open: the drawer panel is
w-80 (320px). If the x[0..320) crop is byte-identical, every changed pixel
lives in the page-behind-drawer column (x[320..390]) — the animated
hero-carousel/countdown strip the documented timing class names."""
import subprocess, io, sys
from PIL import Image, ImageChops

path = "docs/screenshots/clone-mobile-menu-open.png"
old_bytes = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, check=True).stdout
old = Image.open(io.BytesIO(old_bytes)).convert("RGB")
new = Image.open(path).convert("RGB")

# Drawer region (x < 320)
old_d = old.crop((0, 0, 320, old.size[1]))
new_d = new.crop((0, 0, 320, new.size[1]))
drawer_bbox = ImageChops.difference(old_d, new_d).getbbox()
print("drawer crop (x<320) diff bbox:", drawer_bbox, "-> byte-identical" if drawer_bbox is None else "-> CHANGED (NOT the timing class!)")

# Behind-drawer column rows histogram
old_b = old.crop((320, 0, 390, old.size[1]))
new_b = new.crop((320, 0, 390, old.size[1]))
diff_b = ImageChops.difference(old_b, new_b)
px = list(diff_b.getdata())
rows = {}
for i, p in enumerate(px):
    if p != (0, 0, 0):
        y = i // old_b.size[0]
        rows[y] = rows.get(y, 0) + 1
if rows:
    ys = sorted(rows)
    print(f"behind-drawer column: {sum(rows.values())} px across y[{ys[0]}..{ys[-1]}] in {len(ys)} rows")
sys.exit(0 if drawer_bbox is None else 1)
