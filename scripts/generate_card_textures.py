#!/usr/bin/env python3
"""
Generate card texture and card back images for Monster Ghost Army Cards.

Creates:
1. card-texture.png - A subtle paper/linen texture overlay (200x300 grayscale)
2. card-back.png - A themed card back design with ghost army motif (200x300)
"""

import os
import random
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Ensure output directory exists
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets', 'images')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_card_texture(width=200, height=300):
    """
    Generate a subtle paper/linen texture that can be overlaid on cards.
    Uses Perlin-like noise for a natural paper feel.
    """
    # Create base grayscale image with mid-gray
    img = Image.new('L', (width, height), 128)
    pixels = img.load()

    # Add multiple layers of noise at different scales for organic texture
    random.seed(42)  # Reproducible results

    # Layer 1: Fine grain noise (paper fiber)
    for y in range(height):
        for x in range(width):
            # Add subtle random variation
            noise = random.randint(-15, 15)
            base_val = 128 + noise
            pixels[x, y] = max(0, min(255, base_val))

    # Layer 2: Medium-scale variation (linen weave pattern)
    for y in range(height):
        for x in range(width):
            # Create subtle horizontal and vertical lines like linen
            h_pattern = math.sin(x * 0.5) * 3
            v_pattern = math.sin(y * 0.5) * 3
            # Add cross-hatch effect
            cross = math.sin(x * 0.3 + y * 0.3) * 2

            current = pixels[x, y]
            adjustment = int(h_pattern + v_pattern + cross)
            pixels[x, y] = max(0, min(255, current + adjustment))

    # Layer 3: Larger-scale variation (paper grain)
    for y in range(height):
        for x in range(width):
            # Gradual variation across the surface
            large_noise = math.sin(x * 0.05) * math.cos(y * 0.05) * 5
            current = pixels[x, y]
            pixels[x, y] = max(0, min(255, int(current + large_noise)))

    # Apply slight blur to soften the texture
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    # Normalize to center around 128 (neutral gray)
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            val = pixels[x, y]
            # Reduce contrast to make it very subtle
            normalized = 128 + int((val - 128) * 0.4)
            pixels[x, y] = max(0, min(255, normalized))

    return img


def generate_card_back(width=200, height=300):
    """
    Generate a themed card back design with ghost army motif.
    Uses the game's color scheme: deep purples, dark blues, gold accents.
    """
    # Color scheme from the game CSS
    bg_primary = (26, 26, 46)      # #1a1a2e
    bg_secondary = (22, 33, 62)   # #16213e
    bg_tertiary = (15, 52, 96)    # #0f3460
    accent_gold = (255, 215, 0)   # #FFD700
    accent_dark_gold = (255, 140, 0)  # #FF8C00
    text_accent = (233, 69, 96)   # #e94560
    color_magic = (255, 105, 180) # #FF69B4
    color_universe = (148, 0, 211) # #9400D3

    # Create RGBA image
    img = Image.new('RGBA', (width, height), bg_primary + (255,))
    draw = ImageDraw.Draw(img)

    # Create gradient background
    for y in range(height):
        ratio = y / height
        # Blend from top to bottom
        r = int(bg_secondary[0] + (bg_tertiary[0] - bg_secondary[0]) * ratio)
        g = int(bg_secondary[1] + (bg_tertiary[1] - bg_secondary[1]) * ratio)
        b = int(bg_secondary[2] + (bg_tertiary[2] - bg_secondary[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Add border
    border_width = 8
    # Outer gold border
    draw.rectangle([0, 0, width-1, height-1], outline=accent_gold, width=3)
    # Inner decorative border
    draw.rectangle([6, 6, width-7, height-7], outline=accent_dark_gold, width=2)

    # Add corner decorations
    corner_size = 20
    corners = [
        (12, 12),  # top-left
        (width - 12, 12),  # top-right
        (12, height - 12),  # bottom-left
        (width - 12, height - 12)  # bottom-right
    ]

    for cx, cy in corners:
        # Draw small diamond shapes at corners
        diamond_points = [
            (cx, cy - corner_size//2),
            (cx + corner_size//2, cy),
            (cx, cy + corner_size//2),
            (cx - corner_size//2, cy)
        ]
        draw.polygon(diamond_points, fill=accent_gold, outline=accent_dark_gold)

    # Central ghost motif - stylized ghost shape
    center_x, center_y = width // 2, height // 2

    # Draw mystical circle pattern
    for i in range(3):
        radius = 60 - i * 15
        alpha = 150 - i * 40
        # Draw circle with gradient effect
        for r in range(radius, radius - 3, -1):
            circle_color = (color_universe[0], color_universe[1], color_universe[2], alpha)
            draw.ellipse(
                [center_x - r, center_y - r, center_x + r, center_y + r],
                outline=circle_color,
                width=1
            )

    # Draw ghost silhouette in center
    ghost_width = 50
    ghost_height = 70
    gx = center_x - ghost_width // 2
    gy = center_y - ghost_height // 2

    # Ghost body (rounded top, wavy bottom)
    ghost_points = []

    # Top arc
    for angle in range(180, 360):
        rad = math.radians(angle)
        x = center_x + (ghost_width // 2) * math.cos(rad)
        y = gy + ghost_height // 3 + (ghost_height // 3) * math.sin(rad)
        ghost_points.append((x, y))

    # Right side down
    for i in range(10):
        x = center_x + ghost_width // 2
        y = gy + ghost_height // 3 + i * 4
        ghost_points.append((x, y))

    # Wavy bottom
    for i in range(20):
        x = center_x + ghost_width // 2 - i * (ghost_width / 20)
        wave = math.sin(i * 0.8) * 8
        y = gy + ghost_height + wave
        ghost_points.append((x, y))

    # Left side up
    for i in range(10):
        x = center_x - ghost_width // 2
        y = gy + ghost_height - i * 4
        ghost_points.append((x, y))

    # Draw ghost with semi-transparency
    if len(ghost_points) > 2:
        draw.polygon(ghost_points, fill=(255, 255, 255, 80), outline=(255, 255, 255, 150))

    # Ghost eyes
    eye_y = center_y - 15
    eye_size = 6
    draw.ellipse([center_x - 12 - eye_size, eye_y - eye_size,
                  center_x - 12 + eye_size, eye_y + eye_size],
                 fill=(0, 0, 0, 200))
    draw.ellipse([center_x + 12 - eye_size, eye_y - eye_size,
                  center_x + 12 + eye_size, eye_y + eye_size],
                 fill=(0, 0, 0, 200))

    # Add eye glow
    draw.ellipse([center_x - 12 - 2, eye_y - 2,
                  center_x - 12 + 2, eye_y + 2],
                 fill=color_magic)
    draw.ellipse([center_x + 12 - 2, eye_y - 2,
                  center_x + 12 + 2, eye_y + 2],
                 fill=color_magic)

    # Add floating particles/stars around the ghost
    random.seed(123)
    for _ in range(30):
        px = random.randint(20, width - 20)
        py = random.randint(20, height - 20)
        # Avoid drawing over the ghost
        if abs(px - center_x) > 40 or abs(py - center_y) > 50:
            size = random.randint(1, 3)
            alpha = random.randint(80, 200)
            star_color = (255, 255, 255, alpha) if random.random() > 0.5 else (accent_gold[0], accent_gold[1], accent_gold[2], alpha)
            draw.ellipse([px - size, py - size, px + size, py + size], fill=star_color)

    # Add title text at top
    try:
        # Try to use a fantasy-style font if available
        font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Papyrus.ttc", 14)
    except:
        font_title = ImageFont.load_default()

    # Title "MONSTER" at top
    title_text = "MONSTER"
    bbox = draw.textbbox((0, 0), title_text, font=font_title)
    text_width = bbox[2] - bbox[0]
    draw.text((center_x - text_width // 2, 25), title_text,
              fill=accent_gold, font=font_title)

    # "GHOST ARMY" at bottom
    subtitle = "GHOST ARMY"
    bbox2 = draw.textbbox((0, 0), subtitle, font=font_title)
    text_width2 = bbox2[2] - bbox2[0]
    draw.text((center_x - text_width2 // 2, height - 45), subtitle,
              fill=accent_gold, font=font_title)

    # Add subtle diagonal pattern overlay
    pattern_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    pattern_draw = ImageDraw.Draw(pattern_img)

    for i in range(-height, width + height, 20):
        pattern_draw.line([(i, 0), (i + height, height)],
                         fill=(255, 255, 255, 8), width=1)
        pattern_draw.line([(i + 10, 0), (i + height + 10, height)],
                         fill=(0, 0, 0, 8), width=1)

    # Composite the pattern
    img = Image.alpha_composite(img, pattern_img)

    # Convert to RGB for saving as PNG without alpha issues
    final_img = Image.new('RGB', (width, height), bg_primary)
    final_img.paste(img, mask=img.split()[3])

    return final_img


def main():
    print("Generating card textures...")

    # Generate card texture
    texture = generate_card_texture(200, 300)
    texture_path = os.path.join(OUTPUT_DIR, 'card-texture.png')
    texture.save(texture_path)
    print(f"Saved card texture to: {texture_path}")

    # Generate card back
    card_back = generate_card_back(200, 300)
    card_back_path = os.path.join(OUTPUT_DIR, 'card-back.png')
    card_back.save(card_back_path)
    print(f"Saved card back to: {card_back_path}")

    print("Done!")


if __name__ == '__main__':
    main()
