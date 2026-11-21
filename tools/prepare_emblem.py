"""Prepare the hero emblem from the generated source.

Crops the decorative margins, lifts contrast/saturation so the line art reads
on a light page, and exports a circular-friendly WebP plus a small preview.
"""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "emblem-source.jpg"
OUT = ROOT / "assets" / "emblem.webp"


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    w, h = im.size

    # keep the emblem, drop the hazy frame left by generation
    keep = 0.86
    side = int(min(w, h) * keep)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))

    im = ImageEnhance.Brightness(im).enhance(1.04)
    im = ImageEnhance.Contrast(im).enhance(1.16)
    im = ImageEnhance.Color(im).enhance(1.18)

    # deepen the navy backdrop while keeping the line art luminous
    gamma = 1.3
    lut = [min(255, round(((i / 255) ** gamma) * 255)) for i in range(256)]
    im = im.point(lut * 3)

    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))

    im = im.resize((900, 900), Image.LANCZOS)
    im.save(OUT, "WEBP", quality=90, method=6)

    print(f"saved {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
