"""Second half of render.sh: name, size-check and write the listing assets to clockin/store/.

The store icon is the app's own mark (assets/brand/xorr-app-icon.png, 1254 px, the source of assets/icon.png)
downscaled to 512. App icons and app.json belong to the app's builder and are not written here.
"""
import os
import sys

from PIL import Image

TMP, OUT = sys.argv[1], sys.argv[2]
ROOT = os.path.normpath(os.path.join(OUT, "..", ".."))
MAX_BYTES = 3 * 1024 * 1024  # Publisher Portal: jpg/png/webp up to 3 MB per preview image
NAMES = {1: "welcome", 2: "clock-in-brief", 3: "cap-held", 4: "ask-agent", 5: "skr", 6: "stop-trading"}


def save_preview(img: Image.Image, stem: str) -> str:
    for ext in (".png", ".jpg"):
        if os.path.exists(stem + ext):
            os.remove(stem + ext)
    png = stem + ".png"
    img.save(png, optimize=True)
    if os.path.getsize(png) <= MAX_BYTES:
        return png
    os.remove(png)
    jpg = stem + ".jpg"
    img.convert("RGB").save(jpg, quality=92, subsampling=0, optimize=True)
    return jpg


written = []
for n, name in NAMES.items():
    img = Image.open(os.path.join(TMP, f"shot-{n}.png")).convert("RGB")
    assert img.size == (1080, 2400), img.size
    written.append(save_preview(img, os.path.join(OUT, "screenshots", f"{n:02d}-{name}")))

banner = Image.open(os.path.join(TMP, "banner.png")).convert("RGB")
assert banner.size == (1200, 600), banner.size
written.append(save_preview(banner, os.path.join(OUT, "banner-1200x600")))

icon = Image.open(os.path.join(ROOT, "assets", "brand", "xorr-app-icon.png")).convert("RGB")
icon.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-512.png"), optimize=True)
written.append(os.path.join(OUT, "icon-512.png"))

for p in written:
    im = Image.open(p)
    print(f"{os.path.relpath(p, ROOT):48s} {im.size[0]}x{im.size[1]} {im.mode:4s} {os.path.getsize(p) / 1024:7.0f} KB")
