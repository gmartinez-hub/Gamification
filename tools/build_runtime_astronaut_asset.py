from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (1).png"
OUT = ROOT / "assets" / "runtime" / "astronaut" / "float.png"
MANIFEST = ROOT / "assets" / "runtime" / "manifest.json"


def chroma_key_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            dominance = g - max(r, b)
            if g > 105 and dominance > 30:
                alpha = max(0, min(255, int((92 - dominance) * 4.5)))
                if alpha < 18:
                    alpha = 0
                pixels[x, y] = (r, min(g, int((r + b) * 0.55)), b, alpha)
    alpha = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(0.25))
    rgba.putalpha(alpha)
    return rgba


def trim_alpha(image: Image.Image, padding: int = 42) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image = trim_alpha(chroma_key_green(Image.open(SOURCE)))
    image.save(OUT)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["astronaut"] = {
        "float": {
            "path": str(OUT.relative_to(ROOT)),
            "width": image.width,
            "height": image.height,
            "aspect": image.width / image.height,
        }
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
