from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa-scale-depth-fx-concept-v2.png"


def font(size: int, bold: bool = False):
    paths = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    )
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


TITLE = font(34, True)
LABEL = font(22, True)
SMALL = font(15)


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
    return rgba


def trim_alpha(image: Image.Image, padding: int = 32) -> Image.Image:
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


def load_rgba(path: Path, green: bool = False) -> Image.Image:
    image = Image.open(path)
    if green:
        image = chroma_key_green(image)
    return trim_alpha(image.convert("RGBA"), 36)


def resize_width(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    return image.resize((width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)


def paste_center(canvas: Image.Image, image: Image.Image, center: tuple[int, int], opacity: float = 1) -> None:
    layer = image
    if opacity < 1:
        layer = image.copy()
        layer.putalpha(layer.getchannel("A").point(lambda value: int(value * opacity)))
    canvas.alpha_composite(layer, (round(center[0] - layer.width / 2), round(center[1] - layer.height / 2)))


def glow(canvas: Image.Image, image: Image.Image, center: tuple[int, int], color=(180, 64, 255), radius=22, opacity=0.36) -> None:
    alpha = image.getchannel("A").point(lambda value: int(value * opacity))
    layer = Image.new("RGBA", image.size, (*color, 0))
    layer.putalpha(alpha)
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    paste_center(canvas, layer, center)


def make_space_background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    canvas = Image.new("RGBA", size, (4, 6, 22, 255))
    pix = canvas.load()
    for y in range(height):
        yy = y / height
        for x in range(width):
            xx = x / width
            nebula = math.sin(xx * 7.2 + yy * 3.1) * 0.5 + 0.5
            corridor = max(0, 1 - abs((xx - 0.46) * 1.2 + (yy - 0.68) * 0.55) * 2.4)
            r = int(5 + 35 * yy + 54 * corridor + 18 * nebula * yy)
            g = int(8 + 20 * yy + 20 * corridor)
            b = int(28 + 56 * yy + 88 * corridor + 16 * nebula)
            pix[x, y] = (r, g, b, 255)
    draw = ImageDraw.Draw(canvas)
    for i in range(190):
        x = (i * 347) % width
        y = (i * 193 + 71) % height
        size_px = 1 + (i % 4 == 0) + (i % 17 == 0)
        opacity = 70 + (i * 29) % 120
        draw.ellipse((x, y, x + size_px, y + size_px), fill=(190, 220, 255, opacity))
    return canvas.filter(ImageFilter.GaussianBlur(0.18))


def make_planet(diameter: int) -> Image.Image:
    size = diameter + 220
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(c)
    cx = cy = size // 2
    for r in range(diameter // 2, 0, -1):
        t = r / (diameter / 2)
        color = (
            int(22 + 44 * (1 - t)),
            int(62 + 120 * (1 - t)),
            int(132 + 80 * (1 - t)),
            int(255 * min(1, 1.4 - t * 0.35)),
        )
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    draw.ellipse((cx - diameter // 2, cy - diameter // 2, cx + diameter // 2, cy + diameter // 2), outline=(74, 214, 255, 120), width=5)
    atmosphere = Image.new("RGBA", c.size, (0, 0, 0, 0))
    ad = ImageDraw.Draw(atmosphere)
    ad.ellipse((cx - diameter // 2 - 28, cy - diameter // 2 - 28, cx + diameter // 2 + 28, cy + diameter // 2 + 28), outline=(100, 198, 255, 118), width=30)
    atmosphere = atmosphere.filter(ImageFilter.GaussianBlur(18))
    c = Image.alpha_composite(atmosphere, c)
    return c


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], title: str, detail: str) -> None:
    x, y = xy
    bbox = draw.textbbox((x, y), title, font=LABEL)
    draw.rounded_rectangle((bbox[0] - 12, bbox[1] - 8, bbox[2] + 12, bbox[3] + 31), radius=10, fill=(4, 8, 28, 190), outline=(91, 134, 255, 120), width=1)
    draw.text((x, y), title, font=LABEL, fill=(246, 249, 255, 255))
    draw.text((x, y + 25), detail, font=SMALL, fill=(164, 190, 244, 255))


def main() -> None:
    canvas = make_space_background((1600, 980))
    draw = ImageDraw.Draw(canvas)

    planet = make_planet(520)
    paste_center(canvas, planet, (1320, 210), opacity=0.64)

    comet = load_rgba(ROOT / "assets" / "runtime" / "fx" / "speed_streak" / "03.png")
    comet = resize_width(comet.rotate(-20, expand=True, resample=Image.Resampling.BICUBIC), 520)
    paste_center(canvas, comet, (1180, 715), opacity=0.46)

    asteroid = load_rgba(ROOT / "assets" / "space" / "trimmed" / "asteroid-dark-small.png")
    asteroid = resize_width(asteroid, 125)
    paste_center(canvas, asteroid, (1210, 545), opacity=0.72)

    ship1 = resize_width(load_rgba(ROOT / "assets" / "runtime" / "stage1" / "directions" / "idle.png"), 165)
    ship2 = resize_width(load_rgba(ROOT / "assets" / "runtime" / "stage2" / "directions" / "idle.png"), 218)
    ship3 = resize_width(load_rgba(ROOT / "assets" / "runtime" / "stage3" / "directions" / "idle.png"), 510)

    for img, center in ((ship1, (392, 620)), (ship2, (660, 602)), (ship3, (1040, 548))):
        glow(canvas, img, center, radius=28, opacity=0.28)
        paste_center(canvas, img, center)

    astronaut = load_rgba(Path.home() / "Downloads" / "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (1).png", green=True)
    astronaut = resize_width(astronaut, 62)
    glow(canvas, astronaut, (505, 535), color=(62, 220, 255), radius=18, opacity=0.28)
    paste_center(canvas, astronaut, (505, 535))

    draw.text((54, 44), "Nave - escala, profundidad y FX", font=TITLE, fill=(248, 250, 255, 255))
    draw.text((56, 88), "Stage 1 < Stage 2 < Stage 3. Astronauta pequeno, planetas lejanos y cometas como capa de velocidad.", font=SMALL, fill=(178, 198, 245, 255))

    label(draw, (305, 755), "Stage 1", "1.00x protagonista")
    label(draw, (590, 765), "Stage 2", "1.35x upgrade")
    label(draw, (940, 790), "Stage 3", "1.85x nave completa")
    label(draw, (540, 482), "Astronauta", "0.18x aprox de Stage 1")
    label(draw, (1184, 432), "Asteroide", "medio plano / parallax")
    label(draw, (1174, 812), "Cometa/FX", "fondo rapido, no turbina")
    label(draw, (1220, 470), "Planeta 3D", "enorme, lejano, baja velocidad")

    canvas.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
