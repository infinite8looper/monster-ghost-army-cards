#!/usr/bin/env python3
"""
Monster Ghost Army Cards - High-Quality Card Renderer

Renders high-resolution PNG images with professional trading card game quality.
Clean, readable layouts with proper spacing and large fonts.

Output:
- assets/images/cards/{card_id}_front.png
- assets/images/cards/{card_id}_back.png

Resolution: 1200x1680 pixels (5:7 ratio)
"""

import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import argparse
import textwrap


# ============================================================================
# Configuration
# ============================================================================

CARD_WIDTH = 1200
CARD_HEIGHT = 1680

PADDING = 40
BORDER_WIDTH = 12
BORDER_RADIUS = 48
CORNER_RADIUS = 32

# Element colors
ELEMENT_COLORS = {
    'air': '#87CEEB',
    'water': '#4169E1',
    'fire': '#FF4500',
    'earth': '#8B4513',
    'universe': '#9400D3',
    'plant': '#228B22',
    'mecha': '#708090',
    'magic': '#FF69B4',
}

# Tier styling
TIER_COLORS = {
    'weak': ('#8B5A2B', '#CD853F'),
    'common': ('#4682B4', '#5F9EA0'),
    'strong': ('#8B008B', '#9932CC'),
    'legendary': ('#DAA520', '#FFD700'),
}

TIER_TEXT_COLORS = {
    'legendary': '#1a1a2e',
    'strong': '#ffffff',
    'common': '#1a1a2e',
    'weak': '#ffffff',
}

# UI Colors
BG_DARK = (26, 26, 46)
BG_CARD = (35, 35, 55)
TEXT_LIGHT = '#f0e6d3'
TEXT_DIM = '#c0b0a0'

# Bright stat colors
STAT_COLORS = {
    'hp': '#44ff44',
    'atk': '#ff6666',
    'def': '#66aaff',
}

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
ASSETS_DIR = PROJECT_ROOT / 'assets'
IMAGES_DIR = ASSETS_DIR / 'images'
GENERATED_DIR = IMAGES_DIR / 'generated'
CARDS_OUTPUT_DIR = IMAGES_DIR / 'cards'
ELEMENTS_DIR = IMAGES_DIR / 'elements'
DATA_FILE = PROJECT_ROOT / 'data' / 'cards.json'
FONTS_DIR = ASSETS_DIR / 'fonts'
TEXTURE_PATH = IMAGES_DIR / 'card-texture.png'


# ============================================================================
# Font loading
# ============================================================================

def load_fonts():
    """Load fonts at various sizes."""
    fonts = {}

    cinzel_path = FONTS_DIR / 'Cinzel-Variable.ttf'
    medieval_path = FONTS_DIR / 'MedievalSharp-Regular.ttf'

    try:
        # Large name fonts
        fonts['name_xl'] = ImageFont.truetype(str(cinzel_path), 96)
        fonts['name_lg'] = ImageFont.truetype(str(cinzel_path), 80)
        fonts['name_md'] = ImageFont.truetype(str(cinzel_path), 64)
        fonts['name_sm'] = ImageFont.truetype(str(cinzel_path), 52)

        # Other fonts
        fonts['tier'] = ImageFont.truetype(str(cinzel_path), 36)
        fonts['bio'] = ImageFont.truetype(str(medieval_path), 42)
        fonts['stat'] = ImageFont.truetype(str(cinzel_path), 56)
        fonts['stat_label'] = ImageFont.truetype(str(cinzel_path), 36)
        fonts['section'] = ImageFont.truetype(str(cinzel_path), 48)
        fonts['move'] = ImageFont.truetype(str(medieval_path), 42)

    except Exception as e:
        print(f"Warning: Could not load custom fonts: {e}")
        for key in fonts.keys():
            fonts[key] = ImageFont.load_default()

    return fonts


# ============================================================================
# Drawing utilities
# ============================================================================

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_rounded_mask(size, radius):
    """Create anti-aliased rounded rectangle mask."""
    scale = 4
    large = (size[0] * scale, size[1] * scale)

    mask = Image.new('L', large, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, large[0]-1, large[1]-1],
                          radius=radius * scale, fill=255)

    return mask.resize(size, Image.Resampling.LANCZOS)


def apply_rounded_corners(image, radius):
    """Apply rounded corners with transparency."""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    mask = create_rounded_mask(image.size, radius)
    r, g, b, a = image.split()
    a = Image.composite(a, Image.new('L', image.size, 0), mask)

    return Image.merge('RGBA', (r, g, b, a))


def get_text_size(draw, text, font):
    """Get text bounding box size."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def fit_text_font(text, max_width, fonts, draw):
    """Find best font to fit text in width."""
    for key in ['name_xl', 'name_lg', 'name_md', 'name_sm']:
        font = fonts[key]
        w, _ = get_text_size(draw, text, font)
        if w <= max_width:
            return font
    return fonts['name_sm']


def draw_text_centered(draw, text, y, font, fill, width=CARD_WIDTH):
    """Draw centered text with shadow."""
    tw, th = get_text_size(draw, text, font)
    x = (width - tw) // 2
    draw.text((x + 3, y + 3), text, fill=(0, 0, 0, 180), font=font)
    draw.text((x, y), text, fill=fill, font=font)
    return th


def load_image_cover(path, size):
    """Load image and crop to cover size."""
    try:
        img = Image.open(path).convert('RGBA')

        img_ratio = img.width / img.height
        target_ratio = size[0] / size[1]

        if img_ratio > target_ratio:
            new_h = size[1]
            new_w = int(new_h * img_ratio)
        else:
            new_w = size[0]
            new_h = int(new_w / img_ratio)

        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        left = (new_w - size[0]) // 2
        top = (new_h - size[1]) // 2
        return img.crop((left, top, left + size[0], top + size[1]))

    except Exception as e:
        print(f"  Warning: Could not load {path}: {e}")
        return None


def load_element_icon(element, size=80):
    """Load element icon at specified size."""
    path = ELEMENTS_DIR / f'{element}.png'
    try:
        icon = Image.open(path).convert('RGBA')
        return icon.resize((size, size), Image.Resampling.LANCZOS)
    except:
        return None


def draw_element_icon(canvas, element, pos, size=80, border_color=None, border_width=4):
    """Draw circular element icon with border."""
    icon = load_element_icon(element, size - border_width * 2 if border_color else size)
    if not icon:
        return

    x, y = pos
    draw = ImageDraw.Draw(canvas)

    if border_color:
        for i in range(border_width):
            draw.ellipse([x + i, y + i, x + size - i, y + size - i],
                        outline=border_color)

    icon_size = icon.size[0]
    mask = Image.new('L', (icon_size, icon_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, icon_size - 1, icon_size - 1], fill=255)

    icon_x = x + border_width if border_color else x
    icon_y = y + border_width if border_color else y
    canvas.paste(icon, (icon_x, icon_y), mask)


def format_stat(value):
    """Format large numbers with K/M suffix."""
    if value >= 1000000:
        return f"{value / 1000000:.1f}M".rstrip('0').rstrip('.')
    elif value >= 1000:
        return f"{value / 1000:.1f}K".rstrip('0').rstrip('.')
    return str(value)


def load_texture():
    """Load card texture."""
    try:
        if TEXTURE_PATH.exists():
            return Image.open(TEXTURE_PATH).convert('RGBA')
    except:
        pass
    return None


def apply_texture(canvas, texture, alpha=0.1):
    """Apply texture overlay."""
    if not texture:
        return canvas

    tex = texture.resize(canvas.size, Image.Resampling.LANCZOS)
    r, g, b, a = tex.split()
    a = a.point(lambda x: int(x * alpha))
    tex = Image.merge('RGBA', (r, g, b, a))

    return Image.alpha_composite(canvas, tex)


# ============================================================================
# Card Front
# ============================================================================

def render_front(card, fonts, texture):
    """Render card front with clean layout."""
    tier = card.get('tier', 'common')
    border_color = hex_to_rgb(TIER_COLORS[tier][0])
    accent_color = hex_to_rgb(TIER_COLORS[tier][1])

    canvas = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    card_bg = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (*BG_CARD, 255))
    draw = ImageDraw.Draw(card_bg)

    # === Tier Badge (top right, inside image area) ===
    tier_text = tier.upper()
    tier_font = fonts['tier']
    tw, th = get_text_size(draw, tier_text, tier_font)
    badge_pad_x = 20
    badge_pad_y = 12
    badge_w = tw + badge_pad_x * 2
    badge_h = th + badge_pad_y * 2
    badge_x = CARD_WIDTH - badge_w - PADDING - 20
    badge_y = PADDING + 20

    # === Character Image ===
    img_margin = PADDING + 8
    img_top = PADDING + 8
    img_width = CARD_WIDTH - img_margin * 2
    img_height = 680

    char_path = GENERATED_DIR / f"{card['id']}_generated.png"
    if char_path.exists():
        char_img = load_image_cover(char_path, (img_width - 16, img_height - 16))
        if char_img:
            char_img = apply_rounded_corners(char_img, CORNER_RADIUS)
            card_bg.paste(char_img, (img_margin + 8, img_top + 8), char_img)

    draw.rounded_rectangle(
        [img_margin, img_top, img_margin + img_width, img_top + img_height],
        radius=CORNER_RADIUS + 4,
        outline=border_color,
        width=8
    )

    # Draw tier badge on top of image
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=14,
        fill=accent_color,
        outline=border_color,
        width=4
    )
    # Center text in badge
    text_x = badge_x + (badge_w - tw) // 2
    text_y = badge_y + (badge_h - th) // 2
    draw.text((text_x, text_y), tier_text,
              fill=hex_to_rgb(TIER_TEXT_COLORS[tier]), font=tier_font)

    # === Card Name (large) ===
    name = card.get('name', 'Unknown')
    name_y = img_top + img_height + 32
    name_font = fit_text_font(name, CARD_WIDTH - 100, fonts, draw)
    name_h = draw_text_centered(draw, name, name_y, name_font, TEXT_LIGHT)

    # === Element Icons (below name with gap) ===
    elements = card.get('elements', [])
    icon_size = 80
    icon_gap = 20
    total_w = len(elements) * icon_size + (len(elements) - 1) * icon_gap
    icon_x = (CARD_WIDTH - total_w) // 2
    icon_y = name_y + name_h + 24  # Clear gap below name

    for i, elem in enumerate(elements):
        x = icon_x + i * (icon_size + icon_gap)
        draw_element_icon(card_bg, elem, (x, icon_y), icon_size,
                         border_color=accent_color, border_width=4)

    draw = ImageDraw.Draw(card_bg)

    # === Biography (larger text) ===
    bio = card.get('biography', '')
    bio_y = icon_y + icon_size + 32
    bio_font = fonts['bio']

    if bio:
        wrapped = textwrap.fill(bio, width=34)
        lines = wrapped.split('\n')[:3]

        for line in lines:
            lw, lh = get_text_size(draw, line, bio_font)
            lx = (CARD_WIDTH - lw) // 2
            draw.text((lx + 2, bio_y + 2), line, fill=(0, 0, 0, 140), font=bio_font)
            draw.text((lx, bio_y), line, fill=TEXT_DIM, font=bio_font)
            bio_y += lh + 8

    # === Stats Bar (large readable text) ===
    stats_h = 160
    stats_y = CARD_HEIGHT - stats_h - PADDING - 8
    stats_margin = PADDING + 20
    stats_w = CARD_WIDTH - stats_margin * 2

    draw.rounded_rectangle(
        [stats_margin, stats_y, stats_margin + stats_w, stats_y + stats_h],
        radius=24,
        fill=(*BG_DARK, 240),
        outline=border_color,
        width=6
    )

    # Calculate stats
    hp = card.get('hp', 0)
    attacks = card.get('attacks', [])
    avg_atk = sum(a.get('base_damage', 0) for a in attacks) // len(attacks) if attacks else 0
    defenses = card.get('defenses', [])
    avg_def = sum(d.get('base_protection', 0) for d in defenses) // len(defenses) if defenses else 0

    stat_w = stats_w // 3
    stat_font = fonts['stat']
    label_font = fonts['stat_label']

    stats_data = [
        ('HP', hp, STAT_COLORS['hp']),
        ('ATK', avg_atk, STAT_COLORS['atk']),
        ('DEF', avg_def, STAT_COLORS['def']),
    ]

    for i, (label, value, color) in enumerate(stats_data):
        cx = stats_margin + stat_w * i + stat_w // 2

        # Large value
        val_text = format_stat(value)
        vw, vh = get_text_size(draw, val_text, stat_font)
        draw.text((cx - vw // 2, stats_y + 30), val_text,
                  fill=hex_to_rgb(color), font=stat_font)

        # Bright label
        lw, lh = get_text_size(draw, label, label_font)
        draw.text((cx - lw // 2, stats_y + 30 + vh + 10), label,
                  fill=hex_to_rgb(color), font=label_font)

    # === Card Border ===
    draw.rounded_rectangle(
        [0, 0, CARD_WIDTH - 1, CARD_HEIGHT - 1],
        radius=BORDER_RADIUS,
        outline=border_color,
        width=BORDER_WIDTH
    )

    card_bg = apply_texture(card_bg, texture, 0.08)
    return apply_rounded_corners(card_bg, BORDER_RADIUS)


# ============================================================================
# Card Back
# ============================================================================

def render_back(card, fonts, texture):
    """Render card back with moves and abilities."""
    tier = card.get('tier', 'common')
    border_color = hex_to_rgb(TIER_COLORS[tier][0])
    accent_color = hex_to_rgb(TIER_COLORS[tier][1])

    canvas = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    card_bg = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (*BG_CARD, 255))
    draw = ImageDraw.Draw(card_bg)

    # === Diagonal Stripes ===
    stripe_layer = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    stripe_draw = ImageDraw.Draw(stripe_layer)

    for i in range(-CARD_HEIGHT, CARD_WIDTH + CARD_HEIGHT, 56):
        stripe_draw.line([(i, 0), (i + CARD_HEIGHT, CARD_HEIGHT)],
                        fill=(255, 255, 255, 18), width=8)

    card_bg = Image.alpha_composite(card_bg, stripe_layer)

    # === Character Overlay (grayscale, faint) - BEFORE section backgrounds ===
    char_path = GENERATED_DIR / f"{card['id']}_generated.png"
    if char_path.exists():
        char_img = load_image_cover(char_path, (CARD_WIDTH - 120, CARD_HEIGHT - 120))
        if char_img:
            gray = ImageOps.grayscale(char_img).convert('RGBA')
            r, g, b, a = gray.split()
            a = a.point(lambda x: int(x * 0.12))
            overlay = Image.merge('RGBA', (r, r, r, a))
            card_bg.paste(overlay, (60, 60), overlay)

    draw = ImageDraw.Draw(card_bg)

    # === Header: Name (large) ===
    name = card.get('name', 'Unknown')
    name_y = PADDING + 28
    name_font = fit_text_font(name, CARD_WIDTH - 120, fonts, draw)
    name_h = draw_text_centered(draw, name, name_y, name_font, TEXT_LIGHT)

    # === Element Icons (below name with clear gap) ===
    elements = card.get('elements', [])
    icon_size = 64
    icon_gap = 16
    total_w = len(elements) * icon_size + (len(elements) - 1) * icon_gap
    icon_x = (CARD_WIDTH - total_w) // 2
    icon_y = name_y + name_h + 20

    for i, elem in enumerate(elements):
        x = icon_x + i * (icon_size + icon_gap)
        draw_element_icon(card_bg, elem, (x, icon_y), icon_size,
                         border_color=accent_color, border_width=3)

    draw = ImageDraw.Draw(card_bg)

    # === Collect Sections ===
    sections = []

    attacks = card.get('attacks', [])
    if attacks:
        sorted_atks = sorted(attacks, key=lambda x: x.get('base_damage', 0), reverse=True)
        items = [(a.get('element', 'magic'), f"{a['name']} ({format_stat(a.get('base_damage', 0))} dmg)")
                 for a in sorted_atks]
        sections.append(('ATTACKS', items))

    defenses = card.get('defenses', [])
    if defenses:
        sorted_defs = sorted(defenses, key=lambda x: x.get('base_protection', 0), reverse=True)
        items = [(d.get('element', 'magic'), f"{d['name']} (-{format_stat(d.get('base_protection', 0))})")
                 for d in sorted_defs]
        sections.append(('DEFENSES', items))

    abilities = card.get('special_abilities', [])
    if abilities:
        items = []
        for ab in abilities:
            if isinstance(ab, str):
                items.append(('magic', ab))
            else:
                name_str = ab.get('name', 'Unknown')
                if ab.get('uses'):
                    name_str += f" ({ab['uses']}x)"
                items.append(('magic', name_str))
        sections.append(('SPECIAL', items))

    # === Draw Sections - sized to content ===
    section_margin = PADDING + 24
    section_width = CARD_WIDTH - section_margin * 2
    section_gap = 24

    section_font = fonts['section']
    move_font = fonts['move']
    icon_sm = 48
    item_h = 58  # Fixed height per item
    title_padding = 20
    content_padding = 16

    # Calculate total height needed
    total_needed = 0
    for title, items in sections:
        tw, th = get_text_size(draw, title, section_font)
        section_h = title_padding + th + content_padding + len(items) * item_h + content_padding
        total_needed += section_h
    total_needed += (len(sections) - 1) * section_gap

    # Center all sections vertically
    section_start_y = icon_y + icon_size + 40
    available_h = CARD_HEIGHT - section_start_y - PADDING - 20
    start_offset = max(0, (available_h - total_needed) // 2)

    current_y = section_start_y + start_offset

    for title, items in sections:
        tw, th = get_text_size(draw, title, section_font)
        section_h = title_padding + th + content_padding + len(items) * item_h + content_padding

        # Section background (semi-transparent so character shows through)
        draw.rounded_rectangle(
            [section_margin, current_y, section_margin + section_width, current_y + section_h],
            radius=16,
            fill=(26, 26, 46, 180),
            outline=border_color,
            width=4
        )

        # Section title (centered, with shadow for visibility)
        title_x = (CARD_WIDTH - tw) // 2
        title_y = current_y + title_padding
        draw.text((title_x + 2, title_y + 2), title, fill=(0, 0, 0, 180), font=section_font)
        draw.text((title_x, title_y), title, fill=TEXT_LIGHT, font=section_font)

        # Calculate centering for items
        max_item_w = 0
        for elem, text in items:
            text_w, _ = get_text_size(draw, text, move_font)
            item_w = icon_sm + 16 + text_w
            max_item_w = max(max_item_w, item_w)

        content_x = (CARD_WIDTH - max_item_w) // 2
        content_start_y = title_y + th + content_padding

        # Draw items
        for i, (elem, text) in enumerate(items):
            item_y = content_start_y + i * item_h

            # Element icon (vertically centered with text)
            draw_element_icon(card_bg, elem,
                             (content_x, item_y + (item_h - icon_sm) // 2),
                             icon_sm, border_width=2)

            draw = ImageDraw.Draw(card_bg)
            text_x = content_x + icon_sm + 16
            text_y = item_y + (item_h - 42) // 2
            draw.text((text_x + 2, text_y + 2), text, fill=(0, 0, 0, 120), font=move_font)
            draw.text((text_x, text_y), text, fill=TEXT_LIGHT, font=move_font)

        current_y += section_h + section_gap

    # === Card Border ===
    draw.rounded_rectangle(
        [0, 0, CARD_WIDTH - 1, CARD_HEIGHT - 1],
        radius=BORDER_RADIUS,
        outline=border_color,
        width=BORDER_WIDTH
    )

    card_bg = apply_texture(card_bg, texture, 0.08)
    return apply_rounded_corners(card_bg, BORDER_RADIUS)


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Render card images')
    parser.add_argument('--card-id', help='Render only this card')
    parser.add_argument('--force', action='store_true', help='Re-render all cards')
    args = parser.parse_args()

    CARDS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(DATA_FILE, 'r') as f:
        cards = json.load(f)

    if args.card_id:
        cards = [c for c in cards if c['id'] == args.card_id]
        if not cards:
            print(f"Card not found: {args.card_id}")
            return 1

    print("Loading fonts...")
    fonts = load_fonts()

    print("Loading texture...")
    texture = load_texture()

    total = len(cards)
    rendered = 0
    errors = 0

    for i, card in enumerate(cards):
        card_id = card['id']
        front_path = CARDS_OUTPUT_DIR / f"{card_id}_front.png"
        back_path = CARDS_OUTPUT_DIR / f"{card_id}_back.png"

        if not args.force and front_path.exists() and back_path.exists():
            continue

        print(f"[{i+1}/{total}] {card['name']}")

        try:
            front = render_front(card, fonts, texture)
            front.save(front_path, 'PNG', optimize=True)

            back = render_back(card, fonts, texture)
            back.save(back_path, 'PNG', optimize=True)

            rendered += 1

        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            errors += 1

    print(f"\nDone! Rendered {rendered} cards, {errors} errors.")
    return 0 if errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
