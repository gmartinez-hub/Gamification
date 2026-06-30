from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
QA_VERSION = "draft-v3"
OUT_MANIFEST = ROOT / f"qa-visual-atlas-{QA_VERSION}.json"


DIRECT_SHIP = [
    {
        "id": "stage3_full_direct_a",
        "category": "ship",
        "component": "stage_3_full",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (1).png",
        "status": "runtime_candidate",
    },
    {
        "id": "stage1_cockpit_direct_a",
        "category": "ship",
        "component": "stage_1_cockpit",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (2).png",
        "status": "runtime_candidate",
    },
    {
        "id": "module_body_direct_a",
        "category": "ship",
        "component": "module_body",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_47 p.m. (3).png",
        "status": "runtime_candidate",
    },
    {
        "id": "module_wings_direct_a",
        "category": "ship",
        "component": "module_wings",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_48 p.m. (4).png",
        "status": "runtime_candidate",
    },
    {
        "id": "stage2_pod_body_direct_a",
        "category": "ship",
        "component": "stage_2_pod_body",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_48 p.m. (5).png",
        "status": "runtime_candidate",
    },
    {
        "id": "fx_energy_burst_direct_a",
        "category": "fx",
        "component": "energy_burst",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 01_25_48 p.m. (6).png",
        "status": "fx_candidate",
    },
    {
        "id": "stage3_full_direct_b",
        "category": "ship",
        "component": "stage_3_full",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 12_59_54 p.m. (1).png",
        "status": "runtime_candidate",
    },
    {
        "id": "stage1_cockpit_direct_b",
        "category": "ship",
        "component": "stage_1_cockpit",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 12_59_54 p.m. (2).png",
        "status": "runtime_candidate",
    },
    {
        "id": "module_body_direct_b",
        "category": "ship",
        "component": "module_body",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 12_59_55 p.m. (3).png",
        "status": "runtime_candidate",
    },
    {
        "id": "module_wings_direct_b",
        "category": "ship",
        "component": "module_wings",
        "view": "front_left_iso",
        "source": "ChatGPT Image 27 jun 2026, 12_59_55 p.m. (4).png",
        "status": "runtime_candidate",
    },
]

FULL_ANGLE_SOURCES = [
    ("stage3_full_angle_01", "front_left_iso", "ChatGPT Image 27 jun 2026, 01_04_42 p.m. (1).png"),
    ("stage3_full_angle_02", "front_iso", "ChatGPT Image 27 jun 2026, 01_04_42 p.m. (2).png"),
    ("stage3_full_angle_03", "front_right_iso", "ChatGPT Image 27 jun 2026, 01_04_43 p.m. (3).png"),
    ("stage3_full_angle_04", "rear_left_iso", "ChatGPT Image 27 jun 2026, 01_04_43 p.m. (4).png"),
    ("stage3_full_angle_05", "rear_iso", "ChatGPT Image 27 jun 2026, 01_04_44 p.m. (5).png"),
    ("stage3_full_angle_06", "rear_right_iso", "ChatGPT Image 27 jun 2026, 01_04_44 p.m. (6).png"),
    ("stage3_full_angle_07", "front_left_iso_alt", "ChatGPT Image 27 jun 2026, 01_04_44 p.m. (7).png"),
]

SHEET_SOURCES = [
    ("stage3_full_sheet", "stage_3_full", "ChatGPT Image 27 jun 2026, 01_36_14 p.m. (1).png"),
    ("stage1_cockpit_sheet", "stage_1_cockpit", "ChatGPT Image 27 jun 2026, 01_36_14 p.m. (2).png"),
    ("module_body_sheet", "module_body", "ChatGPT Image 27 jun 2026, 01_36_14 p.m. (3).png"),
    ("module_wings_sheet", "module_wings", "ChatGPT Image 27 jun 2026, 01_36_15 p.m. (4).png"),
    ("stage2_pod_body_sheet", "stage_2_pod_body", "ChatGPT Image 27 jun 2026, 01_36_15 p.m. (5).png"),
]

SHEET_VIEWS = [
    "front_left_iso",
    "front_right_iso",
    "rear_left_iso",
    "rear_right_iso",
    "side",
    "top",
]

REFERENCE_SHEETS = [
    ("reference_front", "ChatGPT Image 27 jun 2026, 12_59_56 p.m. (6).png"),
    ("reference_rear", "ChatGPT Image 27 jun 2026, 12_59_56 p.m. (7).png"),
    ("reference_top", "ChatGPT Image 27 jun 2026, 12_59_57 p.m. (10).png"),
    ("reference_left_side", "ChatGPT Image 27 jun 2026, 12_59_57 p.m. (8).png"),
    ("reference_right_side", "ChatGPT Image 27 jun 2026, 12_59_57 p.m. (9).png"),
]

FX_SEQUENCES = [
    ("energy_burst", "01_spaceship_fx_energy_burst_sequence.gif"),
    ("twin_explosion", "02_spaceship_fx_twin_explosion_sequence.gif"),
    ("large_explosion", "03_spaceship_fx_large_explosion_sequence.gif"),
    ("energy_ring", "04_spaceship_fx_energy_ring_sequence.gif"),
    ("particle_burst", "05_spaceship_fx_particle_burst_sequence.gif"),
    ("diagonal_streak", "06_spaceship_fx_diagonal_streak_sequence.gif"),
    ("engine_blast", "07_spaceship_fx_engine_blast_sequence.gif"),
    ("thruster_flame", "08_spaceship_fx_thruster_flame_sequence.gif"),
    ("comet_tail", "09_spaceship_fx_comet_tail_sequence.gif"),
    ("neon_streak", "10_spaceship_fx_neon_streak_sequence.gif"),
]

ASTRONAUT_DIRECT = [
    ("astronaut_single_01", "front_left_iso", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (1).png"),
    ("astronaut_single_02", "front", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (2).png"),
    ("astronaut_single_03", "front_right_iso", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (3).png"),
    ("astronaut_single_04", "side", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (4).png"),
    ("astronaut_single_05", "rear", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (5).png"),
    ("astronaut_single_06", "rear_right_iso", "ChatGPT Image 28 jun 2026, 09_57_37 p.m. (6).png"),
]

ASTRONAUT_SHEETS = [
    ("astronaut_sheet_01", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (1).png"),
    ("astronaut_sheet_02", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (2).png"),
    ("astronaut_sheet_03", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (3).png"),
    ("astronaut_sheet_04", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (4).png"),
    ("astronaut_sheet_05", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (5).png"),
    ("astronaut_sheet_06", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (6).png"),
    ("astronaut_sheet_07", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (7).png"),
    ("astronaut_sheet_08", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (8).png"),
    ("astronaut_sheet_09", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (9).png"),
    ("astronaut_sheet_10", "ChatGPT Image 28 jun 2026, 09_57_50 p.m. (10).png"),
]


def font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


LABEL_FONT = font(16)
SMALL_FONT = font(12)
TITLE_FONT = font(24)


def chroma_key_green(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            dominance = g - max(r, b)
            if g > 105 and dominance > 30:
                alpha = max(0, min(255, int((92 - dominance) * 4.5)))
                if alpha < 16:
                    alpha = 0
                if alpha == 0:
                    pixels[x, y] = (r, g, b, 0)
                else:
                    clean_g = min(g, int((r + b) * 0.56))
                    pixels[x, y] = (r, clean_g, b, alpha)
    return rgba


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def crop_alpha(image: Image.Image, padding: int = 28) -> Image.Image:
    bbox = alpha_bbox(image)
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


def components_from_mask(mask: bytearray, width: int, height: int) -> list[tuple[int, tuple[int, int, int, int]]]:
    visited = bytearray(width * height)
    components: list[tuple[int, tuple[int, int, int, int]]] = []

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

            components.append((area, (min_x, min_y, max_x + 1, max_y + 1)))

    return sorted(components, reverse=True, key=lambda item: item[0])


def crop_box(image: Image.Image, box: tuple[int, int, int, int], padding: int = 26) -> Image.Image:
    left, top, right, bottom = box
    source = chroma_key_green(image)
    cropped = source.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(source.width, right + padding),
            min(source.height, bottom + padding),
        )
    )
    return crop_alpha(cropped, padding=padding)


def largest_component_crop(path: Path) -> Image.Image:
    image = Image.open(path)
    components = components_from_mask(*non_green_mask(image))
    if not components:
        return crop_alpha(chroma_key_green(image))
    return crop_box(image, components[0][1], padding=34)


def sorted_grid_components(path: Path, min_area: int = 30000) -> list[tuple[int, tuple[int, int, int, int]]]:
    comps = [comp for comp in components_from_mask(*non_green_mask(Image.open(path))) if comp[0] >= min_area]
    return sorted(comps, key=lambda item: (item[1][1] // 260, item[1][0]))


def image_metrics(image: Image.Image) -> dict[str, object]:
    rgba = image.convert("RGBA")
    bbox = alpha_bbox(rgba)
    if not bbox:
        return {"size": rgba.size, "visible": False, "touches": []}
    left, top, right, bottom = bbox
    touches = []
    if left == 0:
        touches.append("left")
    if top == 0:
        touches.append("top")
    if right == rgba.width:
        touches.append("right")
    if bottom == rgba.height:
        touches.append("bottom")
    return {
        "size": rgba.size,
        "visible": True,
        "bbox": bbox,
        "margins": [left, top, rgba.width - right, rgba.height - bottom],
        "touches": touches,
    }


def card_image(entry: dict[str, object], image: Image.Image, size: tuple[int, int]) -> Image.Image:
    cell_w, cell_h = size
    card = Image.new("RGBA", size, (5, 8, 24, 255))
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 0, cell_w - 1, cell_h - 1), outline=(50, 62, 92, 255), width=1)

    label_h = 74
    preview_h = cell_h - label_h
    preview_w = cell_w - 24
    rgba = image.convert("RGBA")
    crop = rgba
    scale = min(preview_w / max(1, crop.width), (preview_h - 14) / max(1, crop.height), 1.0)
    preview = crop.resize((max(1, int(crop.width * scale)), max(1, int(crop.height * scale))), Image.Resampling.LANCZOS)
    px = (cell_w - preview.width) // 2
    py = 10 + (preview_h - preview.height) // 2
    card.alpha_composite(preview, (px, py))

    draw.rectangle((0, preview_h, cell_w, cell_h), fill=(12, 16, 36, 255))
    draw.text((10, preview_h + 8), str(entry["id"])[:38], fill=(235, 239, 255, 255), font=LABEL_FONT)
    draw.text((10, preview_h + 31), f'{entry["component"]} / {entry["view"]}'[:44], fill=(143, 214, 255, 255), font=SMALL_FONT)
    draw.text((10, preview_h + 50), str(entry["status"])[:44], fill=(247, 70, 198, 255), font=SMALL_FONT)
    return card


def render_sheet(title: str, entries: list[dict[str, object]], out_path: Path) -> None:
    cell = (290, 270)
    columns = 4
    rows = math.ceil(len(entries) / columns)
    header = 64
    sheet = Image.new("RGBA", (cell[0] * columns, header + cell[1] * rows), (3, 5, 18, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 18), title, fill=(244, 247, 255, 255), font=TITLE_FONT)

    for index, entry in enumerate(entries):
        card = card_image(entry, entry["_image"], cell)
        x = (index % columns) * cell[0]
        y = header + (index // columns) * cell[1]
        sheet.alpha_composite(card, (x, y))

    sheet.convert("RGB").save(out_path, quality=94)


def render_source_maps(out_path: Path) -> None:
    cell_w, cell_h = 520, 570
    columns = 2
    rows = math.ceil(len(SHEET_SOURCES) / columns)
    header = 70
    sheet = Image.new("RGBA", (cell_w * columns, header + cell_h * rows), (3, 5, 18, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 20), "Visual Atlas Source Map QA - Sheet Crop Boxes", fill=(244, 247, 255, 255), font=TITLE_FONT)

    for index, (id_prefix, component, source_name) in enumerate(SHEET_SOURCES):
        source = ASSETS / source_name
        image = Image.open(source).convert("RGBA")
        components = sorted_grid_components(source)

        scale = min((cell_w - 28) / image.width, (cell_h - 86) / image.height)
        preview = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
        x0 = (index % columns) * cell_w + 14
        y0 = header + (index // columns) * cell_h + 54
        sheet.alpha_composite(preview, (x0, y0))

        draw.rectangle((x0 - 1, y0 - 1, x0 + preview.width, y0 + preview.height), outline=(68, 82, 124, 255), width=1)
        title_x = (index % columns) * cell_w + 14
        title_y = header + (index // columns) * cell_h + 14
        draw.text((title_x, title_y), f"{id_prefix} / {component}", fill=(235, 239, 255, 255), font=LABEL_FONT)
        draw.text((title_x, title_y + 22), source_name[:64], fill=(143, 214, 255, 255), font=SMALL_FONT)

        for slot, (_, box) in enumerate(components[:6], start=1):
            left, top, right, bottom = box
            sx0 = x0 + int(left * scale)
            sy0 = y0 + int(top * scale)
            sx1 = x0 + int(right * scale)
            sy1 = y0 + int(bottom * scale)
            draw.rectangle((sx0, sy0, sx1, sy1), outline=(255, 234, 89, 255), width=3)
            draw.rectangle((sx0, sy0, sx0 + 35, sy0 + 24), fill=(255, 234, 89, 255))
            draw.text((sx0 + 7, sy0 + 4), f"{slot:02d}", fill=(3, 5, 18, 255), font=SMALL_FONT)

    sheet.convert("RGB").save(out_path, quality=94)


def build_ship_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []

    for spec in DIRECT_SHIP:
        source = ASSETS / spec["source"]
        if not source.exists():
            continue
        image = largest_component_crop(source)
        entry = dict(spec)
        entry["_image"] = image
        entry["metrics"] = image_metrics(image)
        entries.append(entry)

    for id_prefix, view, source_name in FULL_ANGLE_SOURCES:
        source = ASSETS / source_name
        if not source.exists():
            continue
        image = largest_component_crop(source)
        entry = {
            "id": id_prefix,
            "category": "ship",
            "component": "stage_3_full",
            "view": view,
            "source": source_name,
            "status": "runtime_candidate_needs_anchor",
            "_image": image,
            "metrics": image_metrics(image),
        }
        entries.append(entry)

    for id_prefix, component, source_name in SHEET_SOURCES:
        source = ASSETS / source_name
        if not source.exists():
            continue
        source_image = Image.open(source)
        components = sorted_grid_components(source)
        for index, (_, box) in enumerate(components[:6]):
            view = SHEET_VIEWS[index] if index < len(SHEET_VIEWS) else f"slot_{index + 1}"
            image = crop_box(source_image, box)
            entry = {
                "id": f"{id_prefix}_{index + 1:02d}",
                "category": "ship",
                "component": component,
                "view": view,
                "source": source_name,
                "source_box": box,
                "status": "sheet_crop_needs_human_qa",
                "_image": image,
                "metrics": image_metrics(image),
            }
            entries.append(entry)

    for id_prefix, source_name in REFERENCE_SHEETS:
        source = ASSETS / source_name
        if not source.exists():
            continue
        image = Image.open(source).resize((260, 260), Image.Resampling.LANCZOS).convert("RGBA")
        entry = {
            "id": id_prefix,
            "category": "reference",
            "component": "reference_sheet",
            "view": id_prefix.replace("reference_", ""),
            "source": source_name,
            "status": "reference_only_not_runtime",
            "_image": image,
            "metrics": image_metrics(image),
        }
        entries.append(entry)

    return entries


def build_space_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for path in sorted((ASSETS / "space" / "trimmed").glob("*.png")):
        image = Image.open(path).convert("RGBA")
        metrics = image_metrics(image)
        status = "needs_recut" if metrics.get("touches") else "runtime_candidate"
        entry = {
            "id": path.stem,
            "category": "space",
            "component": path.stem.split("-")[0],
            "view": "single",
            "source": str(path.relative_to(ROOT)),
            "status": status,
            "_image": image,
            "metrics": metrics,
        }
        entries.append(entry)
    return entries


def build_fx_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for component, source_name in FX_SEQUENCES:
        source = ASSETS / source_name
        if not source.exists():
            continue
        gif = Image.open(source)
        for index, frame in enumerate(ImageSequence.Iterator(gif), start=1):
            image = crop_alpha(chroma_key_green(frame), padding=20)
            metrics = image_metrics(image)
            status = "needs_padding" if metrics.get("touches") else "sequence_frame_candidate"
            entry = {
                "id": f"{component}_frame_{index:02d}",
                "category": "fx",
                "component": component,
                "view": f"frame_{index:02d}",
                "source": source_name,
                "status": status,
                "_image": image,
                "metrics": metrics,
            }
            entries.append(entry)

    for path in sorted((ASSETS / "fx" / "trimmed").glob("*.png")):
        image = Image.open(path).convert("RGBA")
        entry = {
            "id": path.stem,
            "category": "fx",
            "component": path.stem,
            "view": "single",
            "source": str(path.relative_to(ROOT)),
            "status": "runtime_candidate_single",
            "_image": image,
            "metrics": image_metrics(image),
        }
        entries.append(entry)

    return entries


def build_astronaut_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []

    for id_prefix, view, source_name in ASTRONAUT_DIRECT:
        source = ASSETS / source_name
        if not source.exists():
            continue
        image = largest_component_crop(source)
        entry = {
            "id": id_prefix,
            "category": "character",
            "component": "astronaut",
            "view": view,
            "source": source_name,
            "status": "character_view_candidate",
            "_image": image,
            "metrics": image_metrics(image),
        }
        entries.append(entry)

    for id_prefix, source_name in ASTRONAUT_SHEETS:
        source = ASSETS / source_name
        if not source.exists():
            continue
        image = Image.open(source).resize((260, 174), Image.Resampling.LANCZOS).convert("RGBA")
        entry = {
            "id": id_prefix,
            "category": "character",
            "component": "astronaut_animation_sheet",
            "view": "sheet_reference",
            "source": source_name,
            "status": "sheet_reference_needs_frame_map",
            "_image": image,
            "metrics": image_metrics(image),
        }
        entries.append(entry)

    return entries


def serializable(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    clean = []
    for entry in entries:
        copy = {k: v for k, v in entry.items() if k != "_image"}
        clean.append(copy)
    return clean


def main() -> None:
    ship_entries = build_ship_entries()
    space_entries = build_space_entries()
    fx_entries = build_fx_entries()
    astronaut_entries = build_astronaut_entries()

    ship_runtime_entries = [entry for entry in ship_entries if entry["category"] != "reference"]
    reference_entries = [entry for entry in ship_entries if entry["category"] == "reference"]

    render_sheet("Visual Atlas Draft QA - Ship / Modules / Views", ship_runtime_entries, ROOT / f"qa-visual-atlas-ship-{QA_VERSION}.png")
    render_sheet("Visual Atlas Draft QA - Reference Sheets", reference_entries, ROOT / f"qa-visual-atlas-reference-{QA_VERSION}.png")
    render_source_maps(ROOT / f"qa-visual-atlas-source-map-{QA_VERSION}.png")
    render_sheet("Visual Atlas Draft QA - Space Objects", space_entries, ROOT / f"qa-visual-atlas-space-{QA_VERSION}.png")
    render_sheet("Visual Atlas Draft QA - FX / GIF Frames", fx_entries, ROOT / f"qa-visual-atlas-fx-{QA_VERSION}.png")
    render_sheet("Visual Atlas Draft QA - Astronaut / Character", astronaut_entries, ROOT / f"qa-visual-atlas-astronaut-{QA_VERSION}.png")

    manifest = {
        "version": QA_VERSION,
        "note": "QA draft only. Not a final runtime atlas.",
        "ship": serializable(ship_entries),
        "space": serializable(space_entries),
        "fx": serializable(fx_entries),
        "character": serializable(astronaut_entries),
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"ship entries: {len(ship_entries)}")
    print(f"space entries: {len(space_entries)}")
    print(f"fx entries: {len(fx_entries)}")
    print(f"astronaut entries: {len(astronaut_entries)}")
    print(f"manifest: {OUT_MANIFEST}")


if __name__ == "__main__":
    main()
