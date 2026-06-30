from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def font(size: int):
    for path in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    files = sorted((ROOT / "assets").glob("ChatGPT Image 28 jun 2026, 09_57_*.png"))
    cell_w, cell_h = 260, 220
    columns = 4
    rows = (len(files) + columns - 1) // columns
    out = Image.new("RGB", (cell_w * columns, cell_h * rows), (4, 7, 24))
    draw = ImageDraw.Draw(out)
    label_font = font(14)

    for index, path in enumerate(files):
        image = Image.open(path).convert("RGB")
        image.thumbnail((cell_w - 20, cell_h - 48), Image.Resampling.LANCZOS)
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        out.paste(image, (x + (cell_w - image.width) // 2, y + 8))
        draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=(50, 62, 92), width=1)
        label = path.name.replace("ChatGPT Image 28 jun 2026, ", "")
        draw.text((x + 8, y + cell_h - 34), label[:35], font=label_font, fill=(235, 239, 255))

    out.save(ROOT / "qa-new-assets-astronaut-source-v1.png")


if __name__ == "__main__":
    main()
