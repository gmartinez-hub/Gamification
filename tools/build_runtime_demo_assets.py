from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ASSETS / "runtime"
SPACE_SOURCE = Path.home() / "Downloads" / "ChatGPT Image 27 jun 2026, 12_45_20 p.m..png"


STAGE1_SOURCE = ASSETS / "ChatGPT Image 27 jun 2026, 01_36_14 p.m. (2).png"
STAGE1_VIEWS = [
    "front_left_iso",
    "front_right_iso",
    "rear_left_iso",
    "rear_right_iso",
    "side",
    "top",
]

SPACE_BOXES = [
    ("planet_tech_white", (0, 0, 405, 395)),
    ("planet_ocean_cyber", (330, 0, 760, 395)),
    ("planet_ringed_white", (675, 0, 1185, 420)),
    ("planet_dark_magenta", (1070, 0, 1536, 420)),
    ("asteroid_tech_left", (0, 335, 340, 700)),
    ("asteroid_tech_hollow", (280, 330, 650, 700)),
    ("asteroid_tech_round", (610, 340, 960, 710)),
    ("asteroid_dark_small", (900, 350, 1260, 695)),
    ("asteroid_dark_tiny", (1180, 350, 1536, 700)),
    ("meteor_white_magenta", (0, 600, 735, 1024)),
    ("meteor_dark_cyan", (470, 595, 1160, 1024)),
    ("meteor_ice_cyan", (900, 595, 1536, 1024)),
]

FX_SOURCES = [
    ("engine_blast", ASSETS / "07_spaceship_fx_engine_blast_sequence.gif"),
    ("thruster_flame", ASSETS / "08_spaceship_fx_thruster_flame_sequence.gif"),
    ("speed_streak", ASSETS / "10_spaceship_fx_neon_streak_sequence.gif"),
    ("reward_burst", ASSETS / "01_spaceship_fx_energy_burst_sequence.gif"),
]


def chroma_key_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            dominance = g - max(r, b)
            if g > 104 and dominance > 28:
                alpha = max(0, min(255, int((96 - dominance) * 4.4)))
                if alpha < 18:
                    alpha = 0
                if alpha == 0:
                    pixels[x, y] = (r, g, b, 0)
                else:
                    pixels[x, y] = (r, min(g, int((r + b) * 0.52)), b, alpha)
    return rgba


def trim_alpha(image: Image.Image, padding: int) -> Image.Image:
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


def non_green_mask(image: Image.Image) -> tuple[bytearray, int, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    mask = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_green = g > 115 and (g - max(r, b)) > 36
            if a > 0 and not is_green:
                mask[y * width + x] = 1
    return mask, width, height


def components(mask: bytearray, width: int, height: int) -> list[tuple[int, tuple[int, int, int, int]]]:
    visited = bytearray(width * height)
    found: list[tuple[int, tuple[int, int, int, int]]] = []
    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if not mask[idx] or visited[idx]:
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
                    next_idx = ny * width + nx
                    if mask[next_idx] and not visited[next_idx]:
                        visited[next_idx] = 1
                        queue.append((nx, ny))
            found.append((area, (min_x, min_y, max_x + 1, max_y + 1)))
    return sorted(found, reverse=True, key=lambda item: item[0])


def crop_component(source: Image.Image, box: tuple[int, int, int, int], padding: int) -> Image.Image:
    left, top, right, bottom = box
    keyed = chroma_key_green(source)
    cropped = keyed.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(keyed.width, right + padding),
            min(keyed.height, bottom + padding),
        )
    )
    return trim_alpha(cropped, padding)


def save_image(image: Image.Image, path: Path) -> dict[str, object]:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    return {
        "path": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "aspect": image.width / image.height,
    }


def build_stage1(manifest: dict[str, object]) -> None:
    source = Image.open(STAGE1_SOURCE)
    comps = [item for item in components(*non_green_mask(source)) if item[0] >= 30000]
    comps = sorted(comps[:6], key=lambda item: (item[1][1] // 260, item[1][0]))
    views = {}
    for name, (_, box) in zip(STAGE1_VIEWS, comps):
        image = crop_component(source, box, padding=46)
        views[name] = save_image(image, OUT / "stage1" / f"{name}.png")
    manifest["stage1"] = views


def build_space(manifest: dict[str, object]) -> None:
    source = Image.open(SPACE_SOURCE)
    entries = {}
    for name, box in SPACE_BOXES:
        image = crop_component(source, box, padding=64)
        entries[name] = save_image(image, OUT / "space" / f"{name}.png")
    manifest["space"] = entries


def build_fx(manifest: dict[str, object]) -> None:
    entries = {}
    for name, source_path in FX_SOURCES:
        gif = Image.open(source_path)
        frames = []
        for index, frame in enumerate(ImageSequence.Iterator(gif), start=1):
            image = trim_alpha(chroma_key_green(frame), padding=52)
            frames.append(save_image(image, OUT / "fx" / name / f"{index:02d}.png"))
        entries[name] = frames
    manifest["fx"] = entries


def main() -> None:
    manifest: dict[str, object] = {
        "version": "runtime-demo-v1",
        "source": "qa-visual-atlas-draft-v2",
    }
    build_stage1(manifest)
    build_space(manifest)
    build_fx(manifest)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
