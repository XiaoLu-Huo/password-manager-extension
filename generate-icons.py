#!/usr/bin/env python3
"""Generate password manager extension icons with three colored keys on dark background."""

from PIL import Image, ImageDraw
import math
import os

def draw_key(draw, cx, cy, size, color, angle_deg=0):
    """Draw a key shape at (cx, cy) with given size and color, rotated by angle_deg."""
    # Key dimensions relative to size
    head_r = size * 0.22
    shaft_w = size * 0.08
    shaft_len = size * 0.42
    tooth_w = size * 0.06
    tooth_h = size * 0.10
    hole_r = head_r * 0.32

    angle = math.radians(angle_deg)
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)

    def rot(x, y):
        return (cx + x * cos_a - y * sin_a, cy + x * sin_a + y * cos_a)

    # Draw key head (circle)
    pts_head = []
    for i in range(36):
        a = math.radians(i * 10)
        px = head_r * math.cos(a)
        py = -shaft_len / 2 + head_r * math.sin(a) * (-1)  # head at top
        # Head center is at (0, -shaft_len/2)
        hx = head_r * math.cos(a)
        hy = -shaft_len / 2 + head_r * math.sin(a)
        pts_head.append(rot(hx, hy))
    draw.polygon(pts_head, fill=color)

    # Draw hole in head
    hole_pts = []
    for i in range(36):
        a = math.radians(i * 10)
        hx = hole_r * math.cos(a)
        hy = -shaft_len / 2 + hole_r * math.sin(a)
        hole_pts.append(rot(hx, hy))
    draw.polygon(hole_pts, fill=(40, 40, 50))

    # Draw shaft (rectangle from head bottom to key bottom)
    s = shaft_w / 2
    shaft_pts = [
        rot(-s, -shaft_len / 2 + head_r * 0.5),
        rot(s, -shaft_len / 2 + head_r * 0.5),
        rot(s, shaft_len / 2),
        rot(-s, shaft_len / 2),
    ]
    draw.polygon(shaft_pts, fill=color)

    # Draw teeth (2 teeth on the right side of shaft)
    for i, ty in enumerate([shaft_len * 0.15, shaft_len * 0.35]):
        t_pts = [
            rot(s, ty),
            rot(s + tooth_w, ty),
            rot(s + tooth_w, ty + tooth_h),
            rot(s, ty + tooth_h),
        ]
        draw.polygon(t_pts, fill=color)


def draw_rounded_rect(draw, bbox, radius, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = bbox
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * radius, y0 + 2 * radius], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * radius, y0, x1, y0 + 2 * radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * radius, x0 + 2 * radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * radius, y1 - 2 * radius, x1, y1], 0, 90, fill=fill)


def create_icon(size, filename):
    """Create a password manager icon at the given size."""
    # Use 4x supersampling for anti-aliasing
    ss = 4
    s = size * ss
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark rounded background
    margin = int(s * 0.04)
    radius = int(s * 0.22)
    draw_rounded_rect(draw, [margin, margin, s - margin, s - margin], radius, (35, 35, 45))

    # Three keys with slight overlap and tilt
    key_size = s * 0.7
    colors = [
        (234, 190, 63),   # Gold/Yellow
        (76, 195, 108),   # Green
        (74, 158, 235),   # Blue
    ]
    offsets = [
        (-s * 0.14, s * 0.02, -12),  # left key, tilted left
        (0, 0, 0),                     # center key, straight
        (s * 0.14, s * 0.02, 12),     # right key, tilted right
    ]

    center_x = s / 2
    center_y = s / 2 + s * 0.02

    for (dx, dy, angle), color in zip(offsets, colors):
        draw_key(draw, center_x + dx, center_y + dy, key_size, color, angle)

    # Downsample for anti-aliasing
    img = img.resize((size, size), Image.LANCZOS)
    img.save(filename, 'PNG')


os.makedirs('icons', exist_ok=True)
os.makedirs('dist/icons', exist_ok=True)

for size in [16, 48, 128]:
    fname = f'icons/icon{size}.png'
    create_icon(size, fname)
    # Also copy to dist
    create_icon(size, f'dist/icons/icon{size}.png')
    print(f'Created {fname} ({size}x{size})')

print('Done!')
