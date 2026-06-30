from __future__ import annotations

import json
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ZIP = Path("/Users/gabrielmartinez/Downloads/astronaut_gifs_QA_bundle.zip")
OUT_ROOT = ROOT / "assets/runtime/astronaut/animations"
MANIFEST_PATH = ROOT / "assets/runtime/manifest.json"

ANIMATIONS = {
    "idle_hover": "01_idle_hover_green.gif",
    "wave": "02_right_hand_wave_green.gif",
    "walk_cycle": "04_walk_cycle_green.gif",
    "jetpack_boost": "06_jetpack_hover_boost_green.gif",
    "salute": "07_salute_green.gif",
    "thumbs_up": "08_thumbs_up_bounce_green.gif",
}


def chroma_key_green(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if g > 120 and g > r * 1.28 and g > b * 1.28:
                pixels[x, y] = (r, g, b, 0)
            elif g > 90 and g > r * 1.08 and g > b * 1.08:
                pixels[x, y] = (r, min(g, max(r, b)), b, int(a * 0.36))

    return image


def crop_alpha(image: Image.Image, pad: int = 18) -> Image.Image:
    box = image.getbbox()
    if box is None:
        return image
    x0, y0, x1, y1 = box
    return image.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(image.width, x1 + pad),
            min(image.height, y1 + pad),
        )
    )


def frame_entry(path: Path, image: Image.Image) -> dict[str, object]:
    return {
        "path": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "aspect": image.width / image.height,
    }


def save_animation(zip_file: zipfile.ZipFile, key: str, name: str) -> dict[str, object]:
    source = Image.open(BytesIO(zip_file.read(name)))
    frames = []
    durations = []

    out_dir = OUT_ROOT / key
    out_dir.mkdir(parents=True, exist_ok=True)

    for index, raw_frame in enumerate(ImageSequence.Iterator(source)):
        frame = crop_alpha(chroma_key_green(raw_frame.copy()), 20)
        right_path = out_dir / f"{index + 1:02d}_right.png"
        left_path = out_dir / f"{index + 1:02d}_left.png"

        frame.save(right_path)
        frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(left_path)

        frames.append(
            {
                "right": frame_entry(right_path, frame),
                "left": frame_entry(left_path, frame),
            }
        )
        durations.append(max(70, int(raw_frame.info.get("duration", 90))))

    return {
        "fps": 1000 / (sum(durations) / len(durations)),
        "frames": frames,
    }


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    manifest.setdefault("astronaut", {})
    manifest["astronaut"]["animations"] = {}

    with zipfile.ZipFile(SOURCE_ZIP) as zip_file:
        for key, name in ANIMATIONS.items():
            manifest["astronaut"]["animations"][key] = save_animation(zip_file, key, name)

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built astronaut animations: {', '.join(ANIMATIONS)}")


if __name__ == "__main__":
    main()
