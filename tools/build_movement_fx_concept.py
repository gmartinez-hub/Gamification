from __future__ import annotations

import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RUNTIME = ASSETS / "runtime"


DIRECTIONS = [
    ("ARRIBA IZQ.", "rear_right_iso", "direct", (-0.24, 0.12), 45),
    ("ARRIBA", "top", "up", (0.0, 0.34), 90),
    ("ARRIBA DER.", "rear_left_iso", "direct", (0.24, 0.12), 135),
    ("IZQUIERDA", "side", "direct", (0.36, 0.0), 0),
    ("REPOSO", "rest", "direct", (0.0, 0.0), None),
    ("DERECHA", "side", "mirror", (-0.36, 0.0), 180),
    ("ABAJO IZQ.", "front_left_iso", "direct", (0.24, -0.18), -45),
    ("ABAJO", "top", "down", (0.0, -0.34), -90),
    ("ABAJO DER.", "front_left_iso", "mirror", (-0.24, -0.18), -135),
]


def font(size: int):
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


LABEL_FONT = font(25)
SMALL_FONT = font(16)


def chroma_key_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            dominance = g - max(r, b)
            if g > 90 and dominance > 20:
                alpha = max(0, min(255, int((86 - dominance) * 4.6)))
                if alpha < 20:
                    alpha = 0
                pixels[x, y] = (r, min(g, int((r + b) * 0.52)), b, alpha)
    alpha = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(0.35))
    rgba.putalpha(alpha)
    return rgba


def trim_alpha(image: Image.Image, padding: int = 24) -> Image.Image:
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


def resize_width(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    return image.resize((width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)


def fit_image(image: Image.Image, max_width: int, max_height: int, preferred_width: int) -> Image.Image:
    fitted = resize_width(image, min(max_width, preferred_width))
    if fitted.height <= max_height:
        return fitted
    ratio = max_height / fitted.height
    return fitted.resize((max(1, round(fitted.width * ratio)), max_height), Image.Resampling.LANCZOS)


def transform_ship(image: Image.Image, transform: str) -> Image.Image:
    if transform == "mirror":
        return ImageOps.mirror(image)
    if transform == "up":
        return image.rotate(-90, expand=True, resample=Image.Resampling.BICUBIC)
    if transform == "down":
        return image.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    return image


def paste_center(canvas: Image.Image, image: Image.Image, center: tuple[int, int], opacity: float = 1.0) -> None:
    layer = image
    if opacity < 1:
        layer = image.copy()
        layer.putalpha(layer.getchannel("A").point(lambda value: int(value * opacity)))
    canvas.alpha_composite(layer, (round(center[0] - layer.width / 2), round(center[1] - layer.height / 2)))


def add_glow(canvas: Image.Image, image: Image.Image, center: tuple[int, int]) -> None:
    alpha = image.getchannel("A").point(lambda value: int(value * 0.42))
    glow = Image.new("RGBA", image.size, (174, 68, 255, 0))
    glow.putalpha(alpha)
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    paste_center(canvas, glow, center)


def fx_frame(source_name: str, frame_index: int) -> Image.Image:
    gif = Image.open(ASSETS / source_name)
    frames = list(ImageSequence.Iterator(gif))
    frame = frames[min(frame_index, len(frames) - 1)]
    return trim_alpha(chroma_key_green(frame), padding=24)


def draw_label(draw: ImageDraw.ImageDraw, x: int, y: int, label: str) -> None:
    bbox = draw.textbbox((x, y), label, font=LABEL_FONT)
    rect = (bbox[0] - 12, bbox[1] - 8, bbox[2] + 12, bbox[3] + 8)
    draw.rounded_rectangle(rect, radius=10, fill=(31, 44, 88, 230), outline=(98, 134, 236, 210), width=1)
    draw.text((x, y), label, font=LABEL_FONT, fill=(244, 248, 255, 255))


def main() -> None:
    stage = "stage3"
    cell_w, cell_h = 390, 310
    canvas = Image.new("RGBA", (cell_w * 3, cell_h * 3), (4, 7, 24, 255))
    draw = ImageDraw.Draw(canvas)
    flame = fx_frame("08_spaceship_fx_thruster_flame_sequence.gif", 2)
    streak = fx_frame("10_spaceship_fx_neon_streak_sequence.gif", 2)

    for index, (label, asset_name, transform, offset, rotation) in enumerate(DIRECTIONS):
        col = index % 3
        row = index // 3
        left = col * cell_w
        top = row * cell_h
        center = (left + cell_w // 2, top + cell_h // 2 + 20)
        draw.rectangle((left, top, left + cell_w, top + cell_h), outline=(55, 72, 124, 255), width=1)
        draw_label(draw, left + 20, top + 22, label)

        ship = Image.open(RUNTIME / stage / f"{asset_name}.png").convert("RGBA")
        ship = transform_ship(ship, transform)
        ship = fit_image(ship, cell_w - 70, cell_h - 92, 270 if asset_name != "rest" else 310)

        if rotation is not None:
            fx_center = (
                center[0] + int(ship.width * offset[0]),
                center[1] + int(ship.height * offset[1]),
            )
            fx_angle = rotation
            flame_layer = resize_width(flame, max(120, int(ship.width * 0.40)))
            streak_layer = resize_width(streak, max(185, int(ship.width * 0.72)))
            flame_layer = flame_layer.rotate(fx_angle, expand=True, resample=Image.Resampling.BICUBIC)
            streak_layer = streak_layer.rotate(fx_angle, expand=True, resample=Image.Resampling.BICUBIC)
            paste_center(canvas, streak_layer, fx_center, opacity=0.22)
            paste_center(canvas, flame_layer, fx_center, opacity=0.42)
            draw.ellipse((fx_center[0] - 4, fx_center[1] - 4, fx_center[0] + 4, fx_center[1] + 4), fill=(50, 224, 255, 220))
        else:
            draw.text((left + 22, top + cell_h - 34), "sin fuego en reposo", font=SMALL_FONT, fill=(166, 188, 232, 220))

        add_glow(canvas, ship, center)
        paste_center(canvas, ship, center)

    out = ROOT / "qa-movement-fx-direction-concept-v1.png"
    canvas.save(out)


if __name__ == "__main__":
    main()
