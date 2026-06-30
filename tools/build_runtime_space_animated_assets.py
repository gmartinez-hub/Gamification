from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path("/Users/gabrielmartinez/Downloads")
OUT_ROOT = ROOT / "assets/runtime/space-animated"
MANIFEST_PATH = ROOT / "assets/runtime/manifest.json"

ASSET_NAMES = [
    "planet_tech",
    "planet_ocean",
    "planet_dark",
    "asteroid_core",
    "asteroid_hollow",
    "asteroid_ring",
    "asteroid_blue",
    "asteroid_magenta",
    "meteor_neon",
]


def chroma_key_green(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if g > 130 and r < 120 and b < 130 and g > r * 1.35 and g > b * 1.25:
                pixels[x, y] = (r, g, b, 0)
            elif g > 105 and r < 135 and b < 145 and g > r * 1.18 and g > b * 1.12:
                pixels[x, y] = (r, g, b, int(a * 0.22))

    return image


def connected_components(image: Image.Image) -> list[tuple[int, tuple[int, int, int, int], list[tuple[int, int]]]]:
    alpha = image.getchannel("A")
    data = alpha.load()
    width, height = image.size
    seen = bytearray(width * height)
    components: list[tuple[int, tuple[int, int, int, int], list[tuple[int, int]]]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if seen[start_index] or data[start_x, start_y] < 20:
                continue

            stack = [(start_x, start_y)]
            seen[start_index] = 1
            area = 0
            points: list[tuple[int, int]] = []
            min_x = max_x = start_x
            min_y = max_y = start_y

            while stack:
                x, y = stack.pop()
                area += 1
                points.append((x, y))
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        index = ny * width + nx
                        if not seen[index] and data[nx, ny] >= 20:
                            seen[index] = 1
                            stack.append((nx, ny))

            if area > 1500:
                components.append((area, (min_x, min_y, max_x + 1, max_y + 1), points))

    return components


def component_crop(
    image: Image.Image,
    box: tuple[int, int, int, int],
    points: list[tuple[int, int]],
    pad: int = 28,
) -> Image.Image:
    x0, y0, x1, y1 = box
    crop_box = (
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(image.width, x1 + pad),
        min(image.height, y1 + pad),
    )
    out = Image.new("RGBA", (crop_box[2] - crop_box[0], crop_box[3] - crop_box[1]), (0, 0, 0, 0))
    src = image.load()
    dst = out.load()
    dx = crop_box[0]
    dy = crop_box[1]

    for x, y in points:
        if crop_box[0] <= x < crop_box[2] and crop_box[1] <= y < crop_box[3]:
            dst[x - dx, y - dy] = src[x, y]

    return out


def frame_entry(path: Path, image: Image.Image) -> dict[str, object]:
    return {
        "path": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "aspect": image.width / image.height,
    }


def main() -> None:
    files = sorted(DOWNLOADS.glob("ChatGPT Image 29 jun 2026, 10_42_*.png"))
    if len(files) < len(ASSET_NAMES):
        raise RuntimeError(f"Expected {len(ASSET_NAMES)} new background files, got {len(files)}")

    manifest = json.loads(MANIFEST_PATH.read_text())
    manifest["spaceAnimated"] = {}

    for key, source_path in zip(ASSET_NAMES, files):
        keyed = chroma_key_green(Image.open(source_path))
        components = connected_components(keyed)
        components = sorted(components, key=lambda item: (item[1][0] + item[1][2]) / 2)
        if len(components) < 3:
            raise RuntimeError(f"{source_path.name}: expected 3 views, got {len(components)}")

        out_dir = OUT_ROOT / key
        out_dir.mkdir(parents=True, exist_ok=True)
        frames = []
        for index, (_, box, points) in enumerate(components[:3]):
            frame = component_crop(keyed, box, points, 30)
            path = out_dir / f"{index + 1:02d}.png"
            frame.save(path)
            frames.append(frame_entry(path, frame))

        manifest["spaceAnimated"][key] = {
            "fps": 1.7 if key.startswith("planet") else 2.3,
            "frames": frames,
        }

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built space animated assets: {', '.join(ASSET_NAMES)}")


if __name__ == "__main__":
    main()
