"""Generate web-optimised derivatives of the source disease images.

Creates:
  images/thumbs/<slug>.webp   ~760px  (card previews)
  images/large/<slug>.webp    ~1500px (pop-up illustrations)

Source files are left untouched.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images"
THUMBS = SRC / "thumbs"
LARGE = SRC / "large"

SLUGS = {
    "шизофрения": "schizophrenia",
    "инфаркт": "myocardial-infarction",
    "инсульт": "stroke",
    "рак горла": "throat-cancer",
    "гангрена": "gangrene",
    "слепота": "blindness",
    "недоношенность": "prematurity",
    "эмфизема легких": "emphysema",
}


def resize(img: Image.Image, target_w: int) -> Image.Image:
    if img.width <= target_w:
        return img.copy()
    h = round(img.height * target_w / img.width)
    return img.resize((target_w, h), Image.LANCZOS)


def main() -> int:
    THUMBS.mkdir(parents=True, exist_ok=True)
    LARGE.mkdir(parents=True, exist_ok=True)

    missing = []
    for raw_name, slug in SLUGS.items():
        path = SRC / f"{raw_name}.png"
        if not path.exists():
            missing.append(path.name)
            continue

        with Image.open(path) as im:
            im = im.convert("RGB")
            # Bump contrast / saturation a touch so the art reads well on a
            # light UI while keeping the scientific look.
            im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=3))

            thumbs = resize(im, 760)
            thumbs.save(THUMBS / f"{slug}.webp", "WEBP", quality=82, method=6)

            large = resize(im, 1500)
            large.save(LARGE / f"{slug}.webp", "WEBP", quality=86, method=6)

        print(f"ok  {raw_name:<22} -> {slug}")

    if missing:
        print("MISSING:", ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
