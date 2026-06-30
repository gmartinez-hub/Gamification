from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "assets" / "runtime"

DIRECTIONS = {
    "up_left": ("rear_right_iso", "direct"),
    "up": ("top", "up"),
    "up_right": ("rear_left_iso", "direct"),
    "left": ("side", "direct"),
    "idle": ("rest", "direct"),
    "right": ("side", "mirror"),
    "down_left": ("front_left_iso", "direct"),
    "down": ("top", "down"),
    "down_right": ("front_left_iso", "mirror"),
}

STAGE_OVERRIDES = {
    "stage2": {
        "up_left": ("rear_left_iso", "mirror"),
    },
    "stage3": {
        "up_left": ("rear_left_iso", "mirror"),
    },
}


def transform(image: Image.Image, mode: str) -> Image.Image:
    if mode == "mirror":
        return ImageOps.mirror(image)
    if mode == "up":
        return image.rotate(-90, expand=True, resample=Image.Resampling.BICUBIC)
    if mode == "down":
        return image.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    return image


def main() -> None:
    manifest_path = RUNTIME / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    manifest["directions"] = {}

    for stage in ("stage1", "stage2", "stage3"):
        stage_dir = RUNTIME / stage
        out_dir = stage_dir / "directions"
        out_dir.mkdir(parents=True, exist_ok=True)
        manifest["directions"][stage] = {}

        for direction, default_mapping in DIRECTIONS.items():
            source_name, transform_name = STAGE_OVERRIDES.get(stage, {}).get(direction, default_mapping)
            source = Image.open(stage_dir / f"{source_name}.png").convert("RGBA")
            output = transform(source, transform_name)
            path = out_dir / f"{direction}.png"
            output.save(path)
            manifest["directions"][stage][direction] = {
                "path": str(path.relative_to(ROOT)),
                "width": output.width,
                "height": output.height,
                "aspect": output.width / output.height,
                "source": source_name,
                "transform": transform_name,
            }

    manifest["version"] = "runtime-demo-v3-stage-directions"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest["directions"], indent=2))


if __name__ == "__main__":
    main()
