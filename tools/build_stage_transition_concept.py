from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RUNTIME = ASSETS / "runtime"
DOWNLOADS = Path.home() / "Downloads"

REST_SOURCES = {
    "stage1": DOWNLOADS / "ChatGPT Image 28 jun 2026, 10_14_58 p.m..png",
    "stage2": DOWNLOADS / "ChatGPT Image 28 jun 2026, 10_14_50 p.m. (2).png",
    "stage3": DOWNLOADS / "ChatGPT Image 28 jun 2026, 10_14_49 p.m. (1).png",
}

FX_SOURCES = {
    "ring": ASSETS / "04_spaceship_fx_energy_ring_sequence.gif",
    "burst": ASSETS / "01_spaceship_fx_energy_burst_sequence.gif",
    "streak": ASSETS / "10_spaceship_fx_neon_streak_sequence.gif",
}

REST_DISPLAY_WIDTHS = {
    "stage1": 180,
    "stage2": 220,
    "stage3": 350,
}

STORY_DISPLAY_WIDTHS = {
    "stage1": 150,
    "stage2": 185,
    "stage3": 285,
}

TRANSITIONS = [
    ("stage1", "stage2"),
    ("stage2", "stage3"),
    ("stage3", "stage1"),
]

DIRECTION_GRID = [
    ("ARRIBA IZQ.", "rear_right_iso", "direct"),
    ("ARRIBA", "top", "up"),
    ("ARRIBA DER.", "rear_left_iso", "direct"),
    ("IZQUIERDA", "side", "direct"),
    ("REPOSO", "rest", "direct"),
    ("DERECHA", "side", "mirror"),
    ("ABAJO IZQ.", "front_left_iso", "direct"),
    ("ABAJO", "top", "down"),
    ("ABAJO DER.", "front_left_iso", "mirror"),
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_LABEL = font(26)
FONT_SMALL = font(18)


def chroma_key_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            dominance = g - max(r, b)
            if g > 96 and dominance > 24:
                alpha = max(0, min(255, int((86 - dominance) * 4.6)))
                if alpha < 18:
                    alpha = 0
                pixels[x, y] = (r, min(g, int((r + b) * 0.52)), b, alpha)

    alpha = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(0.45))
    rgba.putalpha(alpha)
    return rgba


def alpha_mask(image: Image.Image) -> tuple[bytearray, int, int]:
    alpha = image.getchannel("A")
    width, height = image.size
    data = alpha.tobytes()
    return bytearray(1 if value > 18 else 0 for value in data), width, height


def largest_component_box(mask: bytearray, width: int, height: int) -> tuple[int, int, int, int]:
    visited = bytearray(width * height)
    best_area = 0
    best_box = (0, 0, width, height)

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if visited[idx] or not mask[idx]:
                continue

            visited[idx] = 1
            queue = deque([(x, y)])
            area = 0
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if not visited[nidx] and mask[nidx]:
                        visited[nidx] = 1
                        queue.append((nx, ny))

            if area > best_area:
                best_area = area
                best_box = (min_x, min_y, max_x + 1, max_y + 1)

    return best_box


def trim_to_component(image: Image.Image, padding: int = 40) -> Image.Image:
    box = largest_component_box(*alpha_mask(image))
    left, top, right, bottom = box
    crop_box = (
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    )
    return image.crop(crop_box)


def resize_width(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    height = max(1, round(image.height * ratio))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def fit_image(image: Image.Image, max_width: int, max_height: int, preferred_width: int | None = None) -> Image.Image:
    target_width = min(preferred_width or max_width, max_width)
    fitted = resize_width(image, target_width)
    if fitted.height <= max_height:
        return fitted
    ratio = max_height / fitted.height
    return fitted.resize((max(1, round(fitted.width * ratio)), max_height), Image.Resampling.LANCZOS)


def tint_alpha(image: Image.Image, color: tuple[int, int, int], opacity: float) -> Image.Image:
    alpha = image.getchannel("A").point(lambda value: int(value * opacity))
    tint = Image.new("RGBA", image.size, (*color, 0))
    tint.putalpha(alpha)
    return tint


def add_glow(canvas: Image.Image, image: Image.Image, center: tuple[int, int], color: tuple[int, int, int], scale: float = 1.0) -> None:
    width = max(1, round(image.width * scale))
    glow_source = resize_width(image, width)
    glow = tint_alpha(glow_source, color, 0.52).filter(ImageFilter.GaussianBlur(18))
    paste_center(canvas, glow, center)


def add_energy_ring(canvas: Image.Image, center: tuple[int, int], width: int, height: int, opacity: float = 1.0) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    for index, color in enumerate(((38, 220, 255), (227, 64, 245), (142, 95, 255))):
        inset = index * 9
        alpha = int((130 - index * 24) * opacity)
        box = (
            cx - width // 2 + inset,
            cy - height // 2 + inset,
            cx + width // 2 - inset,
            cy + height // 2 - inset,
        )
        draw.ellipse(box, outline=(*color, alpha), width=3)
    glow = layer.filter(ImageFilter.GaussianBlur(9))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer)


def paste_center(canvas: Image.Image, image: Image.Image, center: tuple[int, int], opacity: float = 1.0) -> None:
    layer = image
    if opacity < 1:
        layer = image.copy()
        layer.putalpha(layer.getchannel("A").point(lambda value: int(value * opacity)))
    x = round(center[0] - layer.width / 2)
    y = round(center[1] - layer.height / 2)
    canvas.alpha_composite(layer, (x, y))


def build_background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    bg = Image.new("RGBA", size, (5, 8, 26, 255))
    pixels = bg.load()
    for y in range(height):
        for x in range(width):
            nx = x / max(1, width - 1)
            ny = y / max(1, height - 1)
            magenta = max(0, 1 - math.hypot(nx - 0.18, ny - 0.15) * 1.85)
            cyan = max(0, 1 - math.hypot(nx - 0.82, ny - 0.82) * 1.65)
            violet = max(0, 1 - math.hypot(nx - 0.52, ny - 0.52) * 1.45)
            r = int(5 + 42 * magenta + 18 * violet)
            g = int(8 + 34 * cyan + 7 * violet)
            b = int(26 + 54 * cyan + 45 * magenta + 24 * violet)
            pixels[x, y] = (r, g, b, 255)

    draw = ImageDraw.Draw(bg)
    for i in range(70):
        x = (i * 179 + 37) % width
        y = (i * 263 + 91) % height
        alpha = 30 + (i * 17) % 85
        radius = 1 if i % 5 else 2
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(175, 224, 255, alpha))

    return bg


def load_fx_frame(name: str, index: int) -> Image.Image:
    source = Image.open(FX_SOURCES[name])
    frames = list(ImageSequence.Iterator(source))
    frame = frames[min(index, len(frames) - 1)]
    return trim_to_component(chroma_key_green(frame), padding=24)


def make_stage_assets() -> dict[str, Image.Image]:
    result = {}
    manifest_path = RUNTIME / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    for stage, source_path in REST_SOURCES.items():
        source = Image.open(source_path)
        cutout = trim_to_component(chroma_key_green(source), padding=54)
        out_path = RUNTIME / stage / "rest.png"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cutout.save(out_path)
        result[stage] = cutout
        manifest.setdefault(stage, {})["rest"] = {
            "path": str(out_path.relative_to(ROOT)),
            "width": cutout.width,
            "height": cutout.height,
            "aspect": cutout.width / cutout.height,
        }

    manifest["version"] = "runtime-demo-v2-rest-views"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return result


def draw_label(draw: ImageDraw.ImageDraw, position: tuple[int, int], label: str) -> None:
    x, y = position
    bbox = draw.textbbox((x, y), label, font=FONT_LABEL)
    pad_x, pad_y = 12, 8
    rect = (bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y)
    draw.rounded_rectangle(rect, radius=12, fill=(31, 44, 88, 225), outline=(98, 134, 236, 210), width=1)
    draw.text((x, y), label, font=FONT_LABEL, fill=(244, 248, 255, 255))


def transform_direction(image: Image.Image, transform: str) -> Image.Image:
    if transform == "mirror":
        return ImageOps.mirror(image)
    if transform == "up":
        return image.rotate(-90, expand=True, resample=Image.Resampling.BICUBIC)
    if transform == "down":
        return image.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    return image


def make_direction_maps() -> list[Path]:
    outputs = []
    cell_w, cell_h = 360, 280
    for stage in ("stage1", "stage2", "stage3"):
        canvas = Image.new("RGBA", (cell_w * 3, cell_h * 3), (4, 7, 24, 255))
        draw = ImageDraw.Draw(canvas)
        for index, (label, asset_name, transform) in enumerate(DIRECTION_GRID):
            col = index % 3
            row = index // 3
            left = col * cell_w
            top = row * cell_h
            draw.rectangle((left, top, left + cell_w, top + cell_h), outline=(55, 72, 124, 255), width=1)
            draw_label(draw, (left + 18, top + 20), label)
            image = Image.open(RUNTIME / stage / f"{asset_name}.png").convert("RGBA")
            image = transform_direction(image, transform)
            preferred = REST_DISPLAY_WIDTHS[stage] if asset_name == "rest" else 245
            fitted = fit_image(image, cell_w - 58, cell_h - 78, preferred)
            add_glow(canvas, fitted, (left + cell_w // 2, top + cell_h // 2 + 18), (158, 68, 255), 1.0)
            paste_center(canvas, fitted, (left + cell_w // 2, top + cell_h // 2 + 18))
        out = ROOT / f"qa-{stage}-direction-tags-v6.png"
        canvas.save(out)
        outputs.append(out)
    return outputs


def make_rest_qa(stages: dict[str, Image.Image]) -> Path:
    cell_w, cell_h = 460, 560
    canvas = build_background((cell_w * 3, cell_h))
    draw = ImageDraw.Draw(canvas)
    for index, stage in enumerate(("stage1", "stage2", "stage3")):
        left = index * cell_w
        draw.rounded_rectangle((left + 18, 18, left + cell_w - 18, cell_h - 18), radius=26, outline=(73, 91, 151, 180), width=2)
        draw_label(draw, (left + 42, 42), stage.upper())
        ship = resize_width(stages[stage], REST_DISPLAY_WIDTHS[stage])
        center = (left + cell_w // 2, 300)
        add_glow(canvas, ship, center, (186, 67, 255), 1.03)
        paste_center(canvas, ship, center)
        draw.text((left + 42, 500), "reposo nuevo recortado", font=FONT_SMALL, fill=(171, 190, 232, 240))

    out = ROOT / "qa-stage-rest-replacements-v1.png"
    canvas.save(out)
    return out


def compose_transition_cell(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    from_stage: str,
    to_stage: str,
    phase: str,
    stages: dict[str, Image.Image],
    fx: dict[str, Image.Image],
) -> None:
    left, top, right, bottom = box
    cell = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
    center = (cell.width // 2, cell.height // 2 + 22)
    draw = ImageDraw.Draw(cell)
    draw.rounded_rectangle((12, 12, cell.width - 12, cell.height - 12), radius=24, fill=(3, 6, 22, 70), outline=(67, 91, 159, 150), width=1)

    from_ship = fit_image(stages[from_stage], cell.width - 76, cell.height - 96, STORY_DISPLAY_WIDTHS[from_stage])
    to_ship = fit_image(stages[to_stage], cell.width - 76, cell.height - 96, STORY_DISPLAY_WIDTHS[to_stage])

    if phase == "origin":
        add_glow(cell, from_ship, center, (32, 216, 255), 0.98)
        paste_center(cell, from_ship, center)
        title = f"{from_stage.upper()}"
    elif phase == "ring":
        paste_center(cell, from_ship, center, opacity=0.72)
        ring_w = min(cell.width - 58, max(from_ship.width, to_ship.width) + 62)
        ring_h = min(cell.height - 78, max(from_ship.height, to_ship.height) + 54)
        add_energy_ring(cell, center, ring_w, ring_h, opacity=0.95)
        title = "anillo / carga"
    elif phase == "burst":
        burst = resize_width(fx["burst"], max(from_ship.width, to_ship.width) + 96)
        ring = resize_width(fx["ring"], max(from_ship.width, to_ship.width) + 32)
        paste_center(cell, ring, center, opacity=0.20)
        paste_center(cell, burst, center, opacity=0.42)
        title = "sprite transicion"
    elif phase == "materialize":
        paste_center(cell, to_ship, (center[0] + 10, center[1]), opacity=0.74)
        burst = resize_width(fx["burst"], max(from_ship.width, to_ship.width) + 32)
        paste_center(cell, burst, center, opacity=0.18)
        title = "materializa"
    else:
        streak = resize_width(fx["streak"], max(to_ship.width + 96, 260))
        paste_center(cell, streak.rotate(-18, expand=True, resample=Image.Resampling.BICUBIC), (center[0] + 8, center[1] + 2), opacity=0.20)
        add_glow(cell, to_ship, center, (222, 62, 245), 1.0)
        paste_center(cell, to_ship, center)
        title = f"{to_stage.upper()}"

    draw.text((28, 28), title, font=FONT_SMALL, fill=(226, 234, 255, 240))
    canvas.alpha_composite(cell, (left, top))


def make_transition_storyboard(stages: dict[str, Image.Image]) -> Path:
    fx = {
        "ring": load_fx_frame("ring", 1),
        "burst": load_fx_frame("burst", 2),
        "streak": load_fx_frame("streak", 2),
    }
    cell_w, cell_h = 340, 330
    header_h = 88
    row_h = cell_h
    width = cell_w * 5
    height = header_h + row_h * len(TRANSITIONS)
    canvas = build_background((width, height))
    draw = ImageDraw.Draw(canvas)

    draw.text((32, 26), "CONCEPTO DE TRANSICION ENTRE MODELOS", font=FONT_LABEL, fill=(246, 248, 255, 255))
    draw.text((32, 58), "mismo patron para boton manual: 1 -> 2, 2 -> 3, 3 -> 1", font=FONT_SMALL, fill=(169, 192, 235, 230))

    for row, (from_stage, to_stage) in enumerate(TRANSITIONS):
        top = header_h + row * row_h
        for col, phase in enumerate(("origin", "ring", "burst", "materialize", "destination")):
            box = (col * cell_w, top, (col + 1) * cell_w, top + cell_h)
            compose_transition_cell(canvas, box, from_stage, to_stage, phase, stages, fx)
        draw.text((18, top + cell_h - 32), f"{from_stage} -> {to_stage}", font=FONT_SMALL, fill=(156, 235, 255, 205))

    out = ROOT / "qa-stage-transition-storyboard-v1.png"
    canvas.save(out)
    return out


def make_transition_gif(stages: dict[str, Image.Image]) -> Path:
    fx_ring = [trim_to_component(chroma_key_green(frame), padding=24) for frame in ImageSequence.Iterator(Image.open(FX_SOURCES["ring"]))]
    fx_burst = [trim_to_component(chroma_key_green(frame), padding=24) for frame in ImageSequence.Iterator(Image.open(FX_SOURCES["burst"]))]
    fx_streak = [trim_to_component(chroma_key_green(frame), padding=24) for frame in ImageSequence.Iterator(Image.open(FX_SOURCES["streak"]))]

    size = (900, 720)
    center = (size[0] // 2, size[1] // 2 + 26)
    base_bg = build_background(size)
    from_ship = resize_width(stages["stage1"], 230)
    to_ship = resize_width(stages["stage2"], 280)
    frames: list[Image.Image] = []

    for i in range(28):
        t = i / 27
        canvas = base_bg.copy()
        draw = ImageDraw.Draw(canvas)
        draw.text((34, 32), "STAGE 1 -> STAGE 2", font=FONT_LABEL, fill=(246, 248, 255, 245))
        draw.text((34, 64), "preview de transicion, no runtime final", font=FONT_SMALL, fill=(169, 192, 235, 220))

        if t < 0.22:
            pulse = 1 + math.sin(t * math.pi / 0.22) * 0.025
            add_glow(canvas, from_ship, center, (32, 216, 255), pulse)
            paste_center(canvas, from_ship, center)
        elif t < 0.48:
            local = (t - 0.22) / 0.26
            paste_center(canvas, from_ship, center, opacity=1 - local * 0.28)
            add_energy_ring(canvas, center, 320 + int(local * 90), 390 + int(local * 100), opacity=0.55 + local * 0.35)
        elif t < 0.61:
            local = (t - 0.48) / 0.13
            ring = resize_width(fx_ring[min(len(fx_ring) - 1, int(local * len(fx_ring)))], 400)
            burst = resize_width(fx_burst[min(len(fx_burst) - 1, int(local * len(fx_burst)))], 420 + int(local * 70))
            paste_center(canvas, ring, center, opacity=0.22)
            paste_center(canvas, burst, center, opacity=0.44)
        elif t < 0.76:
            local = (t - 0.61) / 0.15
            paste_center(canvas, to_ship, (center[0] + int((1 - local) * 24), center[1]), opacity=0.28 + local * 0.72)
            burst = resize_width(fx_burst[min(len(fx_burst) - 1, int(local * len(fx_burst)))], 330 + int((1 - local) * 70))
            paste_center(canvas, burst, center, opacity=0.24 - local * 0.12)
        else:
            local = (t - 0.76) / 0.24
            streak = resize_width(fx_streak[min(len(fx_streak) - 1, int(local * len(fx_streak)))], 420)
            paste_center(canvas, streak.rotate(-16, expand=True, resample=Image.Resampling.BICUBIC), (center[0] + 10, center[1] + 4), opacity=max(0, 0.26 - local * 0.18))
            add_glow(canvas, to_ship, center, (222, 62, 245), 1.0)
            paste_center(canvas, to_ship, center)

        frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=256))

    out = ROOT / "qa-stage-transition-concept-v1.gif"
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=42, loop=0, disposal=2)
    return out


def main() -> None:
    for source in REST_SOURCES.values():
        if not source.exists():
            raise FileNotFoundError(source)
    for source in FX_SOURCES.values():
        if not source.exists():
            raise FileNotFoundError(source)

    stages = make_stage_assets()
    outputs = {
        "rest_qa": str(make_rest_qa(stages)),
        "storyboard": str(make_transition_storyboard(stages)),
        "gif": str(make_transition_gif(stages)),
        "direction_maps": [str(path) for path in make_direction_maps()],
    }
    print(json.dumps(outputs, indent=2))


if __name__ == "__main__":
    main()
