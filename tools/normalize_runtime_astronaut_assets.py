from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets/runtime/manifest.json"
OUT_ROOT = ROOT / "assets/runtime/astronaut"

VIEW_SOURCES = {
    "front_left": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (1).png",
    "front": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (2).png",
    "front_right": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (3).png",
    "side_right": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (4).png",
    "rear": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (5).png",
    "rear_right": "assets/ChatGPT Image 28 jun 2026, 09_57_37 p.m. (6).png",
}

ANIMATION_KEYS = ("idle_hover", "jetpack_boost", "wave", "thumbs_up")
CANVAS_SIZE = 512
TARGET_HEIGHT = 430
BOTTOM_PAD = 28


def chroma_key_green(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            green_dominant = g > 105 and g > r * 1.16 and g > b * 1.16
            neon_green = g > 150 and r < 95 and b < 95
            if neon_green or green_dominant:
                pixels[x, y] = (r, g, b, 0)
    return image


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        return (0, 0, image.width, image.height)
    return box


def crop_alpha(image: Image.Image, pad: int = 4) -> Image.Image:
    x0, y0, x1, y1 = alpha_bbox(image)
    return image.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(image.width, x1 + pad),
            min(image.height, y1 + pad),
        )
    )


def normalize_frame(image: Image.Image, mirror: bool = False) -> Image.Image:
    cut = crop_alpha(chroma_key_green(image), 6)
    if mirror:
        cut = cut.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    scale = min((CANVAS_SIZE - 48) / cut.width, TARGET_HEIGHT / cut.height)
    new_size = (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
    cut = cut.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - cut.width) // 2
    y = CANVAS_SIZE - BOTTOM_PAD - cut.height
    canvas.alpha_composite(cut, (x, y))
    return canvas


def frame_entry(path: Path, image: Image.Image) -> dict[str, object]:
    return {
        "path": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "aspect": image.width / image.height,
    }


def save_view(manifest: dict, key: str, source_path: str, mirror: bool = False) -> dict[str, object]:
    image = normalize_frame(Image.open(ROOT / source_path), mirror=mirror)
    out_dir = OUT_ROOT / "views"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{key}.png"
    image.save(out_path)
    return frame_entry(out_path, image)


def normalize_existing_animation(manifest: dict, key: str) -> dict[str, object]:
    animation = manifest["astronaut"]["animations"][key]
    out_dir = OUT_ROOT / "animations" / key
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = []

    for index, frame in enumerate(animation["frames"], start=1):
        right_source = Image.open(ROOT / frame["right"]["path"])
        right = normalize_frame(right_source, mirror=False)
        left = right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

        right_path = out_dir / f"{index:02d}_right.png"
        left_path = out_dir / f"{index:02d}_left.png"
        right.save(right_path)
        left.save(left_path)
        frames.append({"right": frame_entry(right_path, right), "left": frame_entry(left_path, left)})

    return {"fps": animation["fps"], "frames": frames}


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    astronaut = manifest.setdefault("astronaut", {})

    views = {
        "front_left": save_view(manifest, "front_left", VIEW_SOURCES["front_left"]),
        "front": save_view(manifest, "front", VIEW_SOURCES["front"]),
        "front_right": save_view(manifest, "front_right", VIEW_SOURCES["front_right"]),
        "side_right": save_view(manifest, "side_right", VIEW_SOURCES["side_right"]),
        "side_left": save_view(manifest, "side_left", VIEW_SOURCES["side_right"], mirror=True),
        "rear": save_view(manifest, "rear", VIEW_SOURCES["rear"]),
        "rear_right": save_view(manifest, "rear_right", VIEW_SOURCES["rear_right"]),
        "rear_left": save_view(manifest, "rear_left", VIEW_SOURCES["rear_right"], mirror=True),
    }
    astronaut["views"] = views

    animations = astronaut.setdefault("animations", {})
    normalized = {}
    for key in ANIMATION_KEYS:
        if key in animations:
            normalized[key] = normalize_existing_animation(manifest, key)
    astronaut["animations"] = normalized

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print("Normalized astronaut views and animations")


if __name__ == "__main__":
    main()
