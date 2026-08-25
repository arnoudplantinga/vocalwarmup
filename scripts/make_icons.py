#!/usr/bin/env python3
"""Generates the PWA icon set from a simple drawn piano-key motif.
One-off dev tool, not shipped/loaded by the app itself.
"""
from PIL import Image, ImageDraw

ACCENT = (18, 153, 111, 255)  # --accent
WHITE = (255, 255, 255, 255)
BLACK_KEY = (16, 19, 26, 255)  # --bg (dark), used for the black keys


def rounded_bg(size, color, corner_ratio=0.22):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * corner_ratio), fill=color)
    return img, draw


def draw_keys(draw, size, scale=1.0):
    # Piano keys centered in the icon: 5 white keys, 3 black keys on top.
    keys_w = size * 0.6 * scale
    keys_h = size * 0.46 * scale
    left = (size - keys_w) / 2
    top = (size - keys_h) / 2 + size * 0.03
    n = 5
    key_w = keys_w / n
    gap = key_w * 0.06
    radius = key_w * 0.18

    for i in range(n):
        x0 = left + i * key_w + gap / 2
        x1 = left + (i + 1) * key_w - gap / 2
        draw.rounded_rectangle([x0, top, x1, top + keys_h], radius=radius, fill=WHITE)

    black_h = keys_h * 0.6
    black_w = key_w * 0.55
    for i in [0, 1, 3]:  # gaps after key 0/1 and 3/4, skipping the 2-3 gap (like E-F)
        cx = left + (i + 1) * key_w
        x0 = cx - black_w / 2
        x1 = cx + black_w / 2
        draw.rounded_rectangle([x0, top, x1, top + black_h], radius=black_w * 0.2, fill=BLACK_KEY)


def make_icon(size, maskable=False, out_path=None):
    if maskable:
        # Safe zone is the center ~80%; keep the whole background solid (no rounding)
        # and shrink the artwork to fit comfortably inside that zone.
        img = Image.new("RGBA", (size, size), ACCENT)
        draw = ImageDraw.Draw(img)
        draw_keys(draw, size, scale=0.72)
    else:
        img, draw = rounded_bg(size, ACCENT)
        draw_keys(draw, size, scale=1.0)
    img.save(out_path)
    print(f"wrote {out_path} ({size}x{size})")


def make_favicon(out_path):
    # Multi-resolution .ico at the conventional root path: some icon-fetching
    # code (browser widgets, bookmark/shortcut caches) looks there directly
    # instead of parsing the page's <link rel="icon"> or the manifest.
    sizes = [16, 32, 48]
    img, draw = rounded_bg(max(sizes), ACCENT, corner_ratio=0.18)
    draw_keys(draw, max(sizes), scale=1.0)
    img.save(out_path, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"wrote {out_path} ({sizes})")


if __name__ == "__main__":
    make_icon(192, out_path="icons/icon-192.png")
    make_icon(512, out_path="icons/icon-512.png")
    make_icon(512, maskable=True, out_path="icons/icon-maskable-512.png")
    make_icon(180, out_path="icons/apple-touch-icon.png")
    make_favicon("favicon.ico")
