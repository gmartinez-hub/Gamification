from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "Downloads" / "ChatGPT Image 27 jun 2026, 12_45_20 p.m..png"

SPRITES = [
    ("planet-tech-white", (35, 55, 365, 350)),
    ("planet-ocean-cyber", (390, 55, 710, 350)),
    ("planet-ringed-white", (750, 45, 1110, 355)),
    ("planet-dark-magenta", (1135, 55, 1475, 355)),
    ("asteroid-tech-left", (35, 400, 300, 640)),
    ("asteroid-tech-hollow", (335, 390, 610, 640)),
    ("asteroid-tech-round", (660, 405, 920, 650)),
    ("asteroid-dark-small", (955, 420, 1220, 635)),
    ("asteroid-dark-tiny", (1240, 425, 1500, 640)),
    ("meteor-white-magenta", (55, 660, 690, 1015)),
    ("meteor-dark-cyan", (540, 650, 1115, 1015)),
    ("meteor-ice-cyan", (970, 655, 1536, 1015)),
]


def chroma_key_green(image):
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            green_dominance = g - max(r, b)
            green_strength = g

            if green_strength > 115 and green_dominance > 36:
                alpha = max(0, min(255, int((92 - green_dominance) * 4.0)))
                if alpha < 12:
                    alpha = 0

                if alpha == 0:
                    pixels[x, y] = (r, g, b, 0)
                    continue

                clean_g = min(g, int((r + b) * 0.62))
                pixels[x, y] = (r, clean_g, b, alpha)

    return rgba


def trim_alpha(image, padding=12):
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


def keep_largest_component(image):
    rgba = image.copy()
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    components = []

    def index(x, y):
        return y * width + x

    for y in range(height):
        for x in range(width):
            idx = index(x, y)
            if visited[idx] or alpha_pixels[x, y] == 0:
                continue

            visited[idx] = 1
            queue = deque([(x, y)])
            component = []

            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_idx = index(nx, ny)
                    if visited[next_idx] or alpha_pixels[nx, ny] == 0:
                        continue

                    visited[next_idx] = 1
                    queue.append((nx, ny))

            components.append(component)

    if not components:
        return rgba

    largest = set(max(components, key=len))
    pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] and (x, y) not in largest:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)

    return rgba


def make_preview(image):
    background = Image.new("RGBA", image.size, (4, 7, 24, 255))
    return Image.alpha_composite(background, image)


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    out_dir = ROOT / "assets" / "space" / "trimmed"
    debug_dir = ROOT / "assets" / "space" / "debug"
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    atlas = Image.open(SOURCE)

    for name, box in SPRITES:
        cut = keep_largest_component(chroma_key_green(atlas.crop(box)))
        trimmed = trim_alpha(cut)
        trimmed.save(out_dir / f"{name}.png")
        make_preview(trimmed).save(debug_dir / f"{name}-on-space.png")
        print(f"{name}: {trimmed.size}")


if __name__ == "__main__":
    main()
