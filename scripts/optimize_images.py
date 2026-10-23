#!/usr/bin/env python3
"""Generate lighter WebP assets and update Ohhgood! references. PNGs remain masters."""
from pathlib import Path
from PIL import Image, ImageOps
import json

ASSETS = {
    "hero-homepage": (1600, 82),
    "category-desk": (860, 79),
    "category-on-the-go": (860, 79),
    "category-desk-break": (860, 79),
    "joyroom-cable-calm": (800, 80),
    "lamicall-desk-lift": (800, 80),
    "oxo-desk-reset": (800, 80),
    "bagsmart-pack-neat": (800, 80),
    "Joyroom": (960, 79),
    "Lamicall": (960, 79),
    "Bagsmart": (960, 79),
    "mascot-curator": (650, 87),
    "mascot-primary": (650, 87),
    "logo-tagline": (660, 88),
    "CTA-primary": (460, 85),
    "CTA-primary-resize": (320, 86),
    "CTA-secondary": (460, 85),
    "CTA-product card": (400, 85),
}
root = Path(__file__).resolve().parent.parent
savings = 0
for name, (max_width, quality) in ASSETS.items():
    source = root / "assets" / (name + ".png")
    if not source.is_file():
        raise FileNotFoundError(source)
    target = source.with_suffix(".webp")
    with Image.open(source) as src:
        img = ImageOps.exif_transpose(src)
        if img.width > max_width:
            img = img.resize((max_width, max(1, round(img.height * max_width / img.width))), Image.Resampling.LANCZOS)
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        img.save(target, format="WEBP", quality=quality, method=6)
    old, new = source.stat().st_size, target.stat().st_size
    savings += old - new
    print(f"{name}: {old/1024:.0f} KB -> {new/1024:.0f} KB")
    if new >= old:
        raise RuntimeError(f"WebP did not shrink: {name}")

for filename in ("styles.css", "index.html", "content/products.json"):
    path = root / filename
    original = path.read_text(encoding="utf-8")
    updated = original
    for name in ASSETS:
        updated = updated.replace("assets/" + name + ".png", "assets/" + name + ".webp")
        updated = updated.replace("assets/" + name.replace(" ", "%20") + ".png", "assets/" + name.replace(" ", "%20") + ".webp")
    if updated != original:
        path.write_text(updated, encoding="utf-8")
# Activate newly approved marketing images in CMS after WebP files exist.
products_path = root / "content" / "products.json"
products = json.loads(products_path.read_text(encoding="utf-8"))
new_images = {
    "joyroom": "assets/Joyroom.webp",
    "lamicall": "assets/Lamicall.webp",
    "bagsmart": "assets/Bagsmart.webp",
    "oxo": "assets/Oxodesk.webp",
}
for item in products:
    if item.get("id") in new_images:
        selected = new_images[item["id"]]
        if not (root / selected).is_file():
            raise FileNotFoundError(root / selected)
        item["image"] = selected
products_path.write_text(json.dumps(products, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
print(f"Total asset savings: {savings/1048576:.2f} MiB")
