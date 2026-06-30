from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

ASSETS = [
    ("full", ROOT / "assets" / "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (1).png"),
    ("cockpit", ROOT / "assets" / "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (2).png"),
    ("body", ROOT / "assets" / "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (3).png"),
    ("wings", ROOT / "assets" / "ChatGPT Image 27 jun 2026, 01_25_48 p.m. (4).png"),
    ("pod-body", ROOT / "assets" / "ChatGPT Image 27 jun 2026, 01_25_48 p.m. (5).png"),
]


def chroma_key_green(image):
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            dominance = g - max(r, b)

            if g > 115 and dominance > 35:
                alpha = max(0, min(255, int((82 - dominance) * 5.0)))
                if alpha < 18:
                    alpha = 0

                clean_g = min(g, int((r + b) * 0.62))
                pixels[x, y] = (r, clean_g, b, alpha)

    return rgba


def trim_alpha(image, padding=24):
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


def make_preview(image):
    background = Image.new("RGBA", image.size, (4, 7, 24, 255))
    return Image.alpha_composite(background, image)


def main():
    out_dir = ROOT / "assets" / "ship-modules" / "trimmed"
    debug_dir = ROOT / "assets" / "ship-modules" / "debug"
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    for name, source in ASSETS:
        if not source.exists():
            raise FileNotFoundError(source)

        cutout = trim_alpha(chroma_key_green(Image.open(source)))
        cutout.save(out_dir / f"{name}.png")
        make_preview(cutout).save(debug_dir / f"{name}-on-space.png")
        print(f"{name}: {cutout.size}")


if __name__ == "__main__":
    main()
