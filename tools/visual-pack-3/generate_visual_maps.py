#!/usr/bin/env python3
"""Derive non-destructive visual maps from current PNG assets.

Run from repo root:
  python path/to/generate_visual_maps.py

Outputs to assets/runtime/v3-derived, preserving source relative paths.
Does not replace albedo files.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np

ROOT = Path.cwd()
SOURCE_DIRS = [
    ROOT / "assets/runtime/stage1/directions",
    ROOT / "assets/runtime/stage2/directions",
    ROOT / "assets/runtime/stage3/directions",
    ROOT / "assets/runtime/astronaut/views",
]
SOURCE_FILES = [ROOT / "assets/runtime/astronaut/float.png"]
OUT = ROOT / "assets/runtime/v3-derived"

def normal_from_height(height, alpha, strength=2.0):
    h = height.astype(np.float32) / 255.0
    gy, gx = np.gradient(h)
    nx = -gx * strength
    ny = -gy * strength
    nz = np.ones_like(h)
    length = np.sqrt(nx*nx + ny*ny + nz*nz)
    n = np.stack((nx/length, ny/length, nz/length), axis=-1)
    rgb = ((n * 0.5 + 0.5) * 255).clip(0,255).astype(np.uint8)
    return np.dstack((rgb, alpha))

def derive(path):
    im = Image.open(path).convert("RGBA")
    rgba = np.asarray(im)
    rgb = rgba[:,:,:3].astype(np.float32)
    alpha = rgba[:,:,3]
    lum = (rgb[:,:,0]*0.2126 + rgb[:,:,1]*0.7152 + rgb[:,:,2]*0.0722)
    alpha_im = Image.fromarray(alpha, "L")

    # Height/depth preserves exact silhouette.
    depth = ImageOps.autocontrast(Image.fromarray(lum.astype(np.uint8),"L"))
    depth = depth.filter(ImageFilter.GaussianBlur(max(1, min(im.size)/180)))
    depth_np = np.asarray(depth)
    depth_np = (depth_np.astype(np.float32)*0.55 + alpha.astype(np.float32)*0.45).clip(0,255).astype(np.uint8)

    normal = normal_from_height(depth_np, alpha, 2.35)

    # Rough hull, smoother dark cockpit and emissive details.
    rough = np.full(alpha.shape, 185, dtype=np.uint8)
    dark = lum < 62
    rough[dark] = 55
    rough[alpha == 0] = 255

    r,g,b = rgb[:,:,0], rgb[:,:,1], rgb[:,:,2]
    cyan = (b > 130) & (g > 105) & (r < 150) & (alpha > 0)
    magenta = (r > 125) & (b > 110) & (g < 145) & (alpha > 0)
    emissive = np.zeros_like(rgba)
    emissive[cyan,0:3] = [55,230,255]
    emissive[magenta,0:3] = [240,60,255]
    emissive[:,:,3] = np.where(cyan|magenta, alpha, 0)

    cockpit = np.zeros_like(rgba)
    cockpit_mask = dark & (b >= r*0.75) & (alpha > 0)
    cockpit[cockpit_mask,0:3] = [255,255,255]
    cockpit[:,:,3] = np.where(cockpit_mask, alpha, 0)

    shell = np.array(alpha_im.filter(ImageFilter.GaussianBlur(2)))
    shell_rgba = np.dstack((shell,shell,shell,alpha))

    rel = path.relative_to(ROOT/"assets/runtime")
    dst = OUT / rel.parent / rel.stem
    dst.mkdir(parents=True, exist_ok=True)
    Image.fromarray(normal,"RGBA").save(dst/"normal.png")
    Image.fromarray(np.dstack((rough,rough,rough,alpha)),"RGBA").save(dst/"roughness.png")
    Image.fromarray(emissive,"RGBA").save(dst/"emissive.png")
    Image.fromarray(cockpit,"RGBA").save(dst/"cockpit_mask.png")
    Image.fromarray(shell_rgba.astype(np.uint8),"RGBA").save(dst/"depth_mask.png")

def main():
    files = [path for path in SOURCE_FILES if path.exists()]
    for root in SOURCE_DIRS:
        if root.exists():
            files.extend(root.rglob("*.png"))
    if not files:
        raise SystemExit("No source PNGs found. Run from the repository root after updating main.")
    for path in sorted(set(files)):
        derive(path)
    print(f"Generated maps for {len(files)} files in {OUT}")

if __name__ == "__main__":
    main()
