from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

FX_ASSETS = [
    {
        "name": "motion-streak",
        "source": ROOT / "assets" / "ChatGPT Image 27 jun 2026, 06_10_25 p.m. (8).png",
        "slot": 2,
        "slots": 4,
    },
]


def chroma_key_green(image):
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            dominance = g - max(r, b)

            if g > 105 and dominance > 30:
                alpha = max(0, min(255, int((82 - dominance) * 4.8)))
                if alpha < 18:
                    alpha = 0
                pixels[x, y] = (r, min(g, int((r + b) * 0.56)), b, alpha)

    return rgba


def trim_alpha(image, padding=16):
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
    out_dir = ROOT / "assets" / "fx" / "trimmed"
    debug_dir = ROOT / "assets" / "fx" / "debug"
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    for asset in FX_ASSETS:
        source = Image.open(asset["source"])
        slot_width = source.width // asset["slots"]
        left = slot_width * asset["slot"]
        frame = source.crop((left, 0, left + slot_width, source.height))
        cutout = trim_alpha(chroma_key_green(frame))
        cutout.save(out_dir / f"{asset['name']}.png")
        make_preview(cutout).save(debug_dir / f"{asset['name']}-on-space.png")
        print(f"{asset['name']}: {cutout.size}")


if __name__ == "__main__":
    main()
