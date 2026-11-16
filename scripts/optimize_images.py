#!/usr/bin/env python3
"""Ohhgood! image helper (idempotent, safe to re-run).

* Creates a small grid thumbnail for every raster product image:
    assets/<name>.webp  ->  assets/thumbs/<name>.webp  (longest side <= THUMB_MAX)
* Records it on the product as "thumb" so product grids load ~20-40 KB instead of ~100-300 KB.
* Never touches PNG masters and never deletes anything.

Usage:  python3 scripts/optimize_images.py          # generate / refresh
        python3 scripts/optimize_images.py --check  # exit 1 if something is missing (used by CI)
"""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
THUMB_MAX = 720
QUALITY = 80
RASTER = (".webp", ".png", ".jpg", ".jpeg")


def thumb_for(image: str) -> str | None:
    p = Path(image)
    if p.suffix.lower() not in RASTER or p.parts[:2] == ("assets", "thumbs"):
        return None
    return f"assets/thumbs/{p.stem}.webp"


def main(check_only: bool) -> int:
    path = ROOT / "content" / "products.json"
    products = json.loads(path.read_text(encoding="utf-8"))
    problems, changed = [], False
    (ROOT / "assets" / "thumbs").mkdir(parents=True, exist_ok=True)
    for item in products:
        src_rel = item.get("image", "")
        src = ROOT / src_rel
        want = thumb_for(src_rel)
        if not want or not src.is_file():
            continue
        dst = ROOT / want
        stale = (not dst.is_file()) or dst.stat().st_mtime < src.stat().st_mtime
        if stale:
            if check_only:
                problems.append(f"missing/stale thumbnail: {want}")
            else:
                with Image.open(src) as im:
                    im = ImageOps.exif_transpose(im)
                    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
                    im.thumbnail((THUMB_MAX, THUMB_MAX), Image.Resampling.LANCZOS)
                    im.save(dst, "WEBP", quality=QUALITY, method=6)
                print(f"thumb  {want}  {dst.stat().st_size/1024:.0f} KB")
        if item.get("thumb") != want:
            if check_only:
                problems.append(f"{item['id']}: thumb field should be {want}")
            else:
                item["thumb"] = want
                changed = True
    if changed:
        path.write_text(json.dumps(products, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("updated content/products.json (thumb fields)")
    for line in problems:
        print("ERROR:", line)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
