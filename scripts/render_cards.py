#!/usr/bin/env python3
"""
Monster Ghost Army Cards - High-Quality Card Renderer

Renders high-resolution PNG images with professional trading card game quality.
Uses Google Fonts (MedievalSharp, Cinzel) for fantasy styling.

Output:
- assets/images/cards/{card_id}_front.png
- assets/images/cards/{card_id}_back.png

Resolution: 600x840 pixels (5:7 ratio)

Usage:
    python scripts/render_cards.py [--card-id CARD_ID] [--force]

Options:
    --card-id CARD_ID   Render only the specified card (for testing)
    --force             Re-render all cards even if they already exist
"""

import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import argparse
import textwrap
import math


# ============================================================================
# Configuration
# ============================================================================

CARD_WIDTH = 600
CARD_HEIGHT = 840

# Layout constants
PADDING = 16
BORDER_WIDTH = 8
BORDER_RADIUS = 30
IMAGE_CORNER_RADIUS = 20

# Element colors from CSS :root variables
ELEMENT_COLORS = {
    'air': '#87CEEB',
    'water': '#4169E1',
    'fire': '#FF4500',
    'earth': '#8B4513',
    'universe': '#9400D3',
    'plant': '#228B22',
    'mecha': '#C0C0C0',
    'magic': '#FF69B4',
}

# Tier styling
TIER_BORDER_COLORS = {
    'weak': '#8B5A2B',
    'common': '#5f9ea0',
    'strong': '#9400D3',
    'legendary': '#FFD700',
}

TIER_BADGE_GRADIENTS = {
    'legendary': ('#FFD700', '#FFA500'),
    'strong': ('#9400D3', '#6B238E'),
    'common': ('#C0C0C0', '#A8A8A8'),
    'weak': ('#CD7F32', '#8B5A2B'),
}

TIER_BADGE_TEXT_COLORS = {
    'legendary': '#1a1a2e',
    'strong': '#ffffff',
    'common': '#1a1a2e',
    'weak': '#ffffff',
}

TIER_BG_GRADIENTS = {
    'legendary': [(255, 215, 0, 90), (255, 140, 0, 77), (255, 215, 0, 64)],
    'strong': [(148, 0, 211, 90), (180, 50, 255, 77), (148, 0, 211, 64)],
    'common': [(70, 130, 180, 90), (100, 149, 237, 77), (70, 130, 180, 64)],
    'weak': [(139, 90, 43, 90), (160, 110, 60, 77), (139, 90, 43, 64)],
}

# Tier glow colors for effects
TIER_GLOW_COLORS = {
    'legendary': (255, 215, 0),      # Gold
    'strong': (148, 0, 211),         # Purple
    'common': (70, 130, 180),        # Steel blue
    'weak': (139, 90, 43),           # Brown
}

# Stat colors
STAT_HP_COLOR = '#44ff44'
STAT_ATK_COLOR = '#FF4500'
STAT_DEF_COLOR = '#4169E1'

# UI Colors
BG_PRIMARY = '#1a1a2e'
BG_SECONDARY = '#16213e'
BG_TERTIARY = '#0f3460'
TEXT_PRIMARY = '#eaeaea'
TEXT_SECONDARY = '#b8b8b8'
TEXT_ACCENT = '#e94560'


# ============================================================================
# Font Loading
# ============================================================================

def load_fonts(project_root):
    """Load Google Fonts from assets/fonts directory."""
    fonts = {}

    fonts_dir = project_root / 'assets' / 'fonts'

    # Font file paths
    medieval_sharp = fonts_dir / 'MedievalSharp-Regular.ttf'
    cinzel_variable = fonts_dir / 'Cinzel-Variable.ttf'

    # User library fallbacks
    user_medieval = Path('/Users/jmanning/Library/Fonts/MedievalSharp.ttf')
    user_cinzel = Path('/Users/jmanning/Library/Fonts/Cinzel[wght].ttf')

    # System fallbacks
    fallback_serif = [
        '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
        '/System/Library/Fonts/Supplemental/Georgia.ttf',
    ]
    fallback_body = [
        '/System/Library/Fonts/Supplemental/Georgia.ttf',
    ]

    def get_font(preferred_paths, fallbacks, size):
        """Load font with fallback support."""
        if not isinstance(preferred_paths, list):
            preferred_paths = [preferred_paths]

        for preferred_path in preferred_paths:
            if isinstance(preferred_path, Path):
                if preferred_path.exists():
                    try:
                        return ImageFont.truetype(str(preferred_path), size)
                    except Exception as e:
                        print(f"Warning: Could not load {preferred_path}: {e}")
            elif os.path.exists(preferred_path):
                try:
                    return ImageFont.truetype(preferred_path, size)
                except Exception as e:
                    print(f"Warning: Could not load {preferred_path}: {e}")

        for fb in fallbacks:
            if os.path.exists(fb):
                try:
                    return ImageFont.truetype(fb, size)
                except:
                    continue

        return ImageFont.load_default()

    cinzel_sources = [cinzel_variable, user_cinzel]
    medieval_sources = [medieval_sharp, user_medieval]

    # LARGER FONT SIZES as requested
    # Card name: 48-56pt at 600px width
    fonts['name_large'] = get_font(cinzel_sources, fallback_serif, 52)
    fonts['name_medium'] = get_font(cinzel_sources, fallback_serif, 44)
    fonts['name_small'] = get_font(cinzel_sources, fallback_serif, 36)

    # Section headers (ATTACKS, DEFENSES): 28-32pt
    fonts['section_title'] = get_font(cinzel_sources, fallback_serif, 30)

    # Stats: 26-30pt
    fonts['stats'] = get_font(medieval_sources, fallback_body, 28)
    fonts['stat_label'] = get_font(medieval_sources, fallback_body, 26)

    # Bio text: 20-24pt
    fonts['bio'] = get_font(medieval_sources, fallback_body, 22)

    # Section items
    fonts['section_item'] = get_font(medieval_sources, fallback_body, 22)

    # Badge and element labels
    fonts['tier_badge'] = get_font(cinzel_sources, fallback_serif, 20)
    fonts['element_label'] = get_font(cinzel_sources, fallback_serif, 18)

    return fonts


# ============================================================================
# Color Utilities
# ============================================================================

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def hex_to_rgba(hex_color, alpha=255):
    """Convert hex color to RGBA tuple."""
    rgb = hex_to_rgb(hex_color)
    return rgb + (alpha,)


def blend_colors(c1, c2, t):
    """Blend two colors. t=0 gives c1, t=1 gives c2."""
    return tuple(int(c1[i] * (1-t) + c2[i] * t) for i in range(len(c1)))


def lighten_color(color, factor=0.3):
    """Lighten a color by blending with white."""
    if len(color) == 3:
        white = (255, 255, 255)
    else:
        white = (255, 255, 255, color[3])
    return blend_colors(color, white, factor)


def darken_color(color, factor=0.3):
    """Darken a color by blending with black."""
    if len(color) == 3:
        black = (0, 0, 0)
    else:
        black = (0, 0, 0, color[3])
    return blend_colors(color, black, factor)


# ============================================================================
# Drawing Utilities
# ============================================================================

def create_rounded_rectangle_mask(size, radius):
    """Create a mask with rounded corners."""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)

    w, h = size
    r = min(radius, w // 2, h // 2)

    # Draw filled rounded rectangle
    draw.rectangle([r, 0, w-r, h], fill=255)
    draw.rectangle([0, r, w, h-r], fill=255)
    draw.ellipse([0, 0, r*2, r*2], fill=255)
    draw.ellipse([w-r*2, 0, w, r*2], fill=255)
    draw.ellipse([0, h-r*2, r*2, h], fill=255)
    draw.ellipse([w-r*2, h-r*2, w, h], fill=255)

    return mask


def draw_rounded_rect_filled(img, xy, radius, fill):
    """Draw a filled rounded rectangle."""
    x1, y1, x2, y2 = xy
    w = x2 - x1
    h = y2 - y1

    if w <= 0 or h <= 0:
        return

    mask = create_rounded_rectangle_mask((w, h), radius)
    fill_rgba = fill if len(fill) == 4 else fill + (255,)

    fill_layer = Image.new('RGBA', (w, h), fill_rgba)
    fill_masked = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    fill_masked.paste(fill_layer, mask=mask)
    img.paste(fill_masked, (x1, y1), fill_masked)


def draw_rounded_rect_outline(img, xy, radius, outline, width=2):
    """Draw a rounded rectangle outline."""
    draw = ImageDraw.Draw(img)
    x1, y1, x2, y2 = xy
    r = radius
    outline_color = outline if len(outline) == 4 else outline + (255,)

    # Draw using rounded_rectangle method
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, outline=outline_color, width=width)


def create_gradient_layer(width, height, colors, direction='vertical'):
    """Create a gradient layer. Colors are list of RGBA tuples."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    pixels = img.load()

    if direction == 'vertical':
        for y in range(height):
            t = y / max(height - 1, 1)

            if len(colors) == 2:
                color = blend_colors(colors[0], colors[1], t)
            elif len(colors) == 3:
                if t < 0.5:
                    color = blend_colors(colors[0], colors[1], t * 2)
                else:
                    color = blend_colors(colors[1], colors[2], (t - 0.5) * 2)
            else:
                color = colors[0]

            for x in range(width):
                pixels[x, y] = tuple(int(c) for c in color)

    elif direction == 'diagonal':
        for y in range(height):
            for x in range(width):
                t = (x / max(width - 1, 1) + y / max(height - 1, 1)) / 2

                if len(colors) == 2:
                    color = blend_colors(colors[0], colors[1], t)
                elif len(colors) == 3:
                    if t < 0.5:
                        color = blend_colors(colors[0], colors[1], t * 2)
                    else:
                        color = blend_colors(colors[1], colors[2], (t - 0.5) * 2)
                else:
                    color = colors[0]

                pixels[x, y] = tuple(int(c) for c in color)

    return img


def create_badge_gradient(width, height, tier):
    """Create a gradient for tier badge."""
    gradient_colors = TIER_BADGE_GRADIENTS.get(tier, TIER_BADGE_GRADIENTS['common'])
    c1 = hex_to_rgba(gradient_colors[0])
    c2 = hex_to_rgba(gradient_colors[1])
    return create_gradient_layer(width, height, [c1, c2], 'diagonal')


def create_diagonal_stripes(width, height, stripe_width=4, gap=8, color=(255, 255, 255, 30)):
    """Create a diagonal stripe pattern for card backs."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw diagonal stripes from top-left to bottom-right
    total_lines = (width + height) // (stripe_width + gap) + 2

    for i in range(total_lines):
        offset = i * (stripe_width + gap)
        # Line from (offset, 0) to (0, offset) - rotated 45 degrees
        for s in range(stripe_width):
            x_start = offset + s - height
            y_start = 0
            x_end = offset + s
            y_end = height

            # Clip to visible area
            draw.line([(x_start, y_start), (x_end, y_end)], fill=color, width=1)

    return img


def apply_card_texture(img, project_root, opacity=0.10):
    """Apply card texture overlay at specified opacity (default 10%)."""
    texture_path = project_root / 'assets' / 'images' / 'card-texture.png'

    if not texture_path.exists():
        return img

    try:
        texture = Image.open(texture_path).convert('RGBA')
        texture = texture.resize(img.size, Image.Resampling.LANCZOS)

        # Adjust opacity
        r, g, b, a = texture.split()
        a = ImageEnhance.Brightness(a).enhance(opacity)
        texture = Image.merge('RGBA', (r, g, b, a))

        result = Image.alpha_composite(img, texture)
        return result
    except Exception as e:
        print(f"Warning: Could not apply texture: {e}")
        return img


def draw_text_with_shadow(draw, xy, text, font, fill, shadow_color=(0, 0, 0, 128), shadow_offset=(2, 2), anchor=None):
    """Draw text with a subtle shadow for better readability."""
    x, y = xy
    sx, sy = shadow_offset

    # Draw shadow
    draw.text((x + sx, y + sy), text, fill=shadow_color, font=font, anchor=anchor)
    # Draw main text
    draw.text((x, y), text, fill=fill, font=font, anchor=anchor)


def draw_element_icon(img, x, y, size, element, project_root, border_width=3):
    """Draw an element icon with circular border."""
    element_color = hex_to_rgb(ELEMENT_COLORS.get(element, '#888888'))
    draw = ImageDraw.Draw(img)

    # Draw outer border circle
    for offset in range(border_width):
        draw.ellipse([x + offset, y + offset,
                     x + size - offset, y + size - offset],
                    outline=element_color)

    # Draw inner background
    inner_margin = border_width
    draw.ellipse([x + inner_margin, y + inner_margin,
                 x + size - inner_margin, y + size - inner_margin],
                fill=hex_to_rgb(BG_SECONDARY))

    # Try to load element icon
    icon_path = project_root / 'assets' / 'images' / 'elements' / f'{element}.png'
    if icon_path.exists():
        try:
            icon = Image.open(icon_path).convert('RGBA')
            icon_size = size - border_width * 2 - 4
            icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

            paste_x = x + (size - icon_size) // 2
            paste_y = y + (size - icon_size) // 2
            img.paste(icon, (paste_x, paste_y), icon)
        except Exception:
            # Fallback: draw letter
            draw.text((x + size // 2, y + size // 2),
                     element[0].upper(), fill='white', anchor='mm')
    else:
        # Draw element initial
        draw.text((x + size // 2, y + size // 2),
                 element[0].upper(), fill=element_color, anchor='mm')


def add_inner_shadow(img, xy, radius, shadow_size=8, shadow_color=(0, 0, 0, 100)):
    """Add an inner shadow/glow effect to an area."""
    x1, y1, x2, y2 = xy
    w = x2 - x1
    h = y2 - y1

    shadow_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)

    for i in range(shadow_size):
        alpha = int(shadow_color[3] * (1 - i / shadow_size))
        r = max(1, radius - i)
        shadow_draw.rounded_rectangle(
            [i, i, w - i, h - i],
            radius=r,
            outline=(shadow_color[0], shadow_color[1], shadow_color[2], alpha)
        )

    img.paste(shadow_layer, (x1, y1), shadow_layer)


def add_tier_glow(img, tier, border_width=3):
    """Add tier-specific glow effect around the card border."""
    if tier not in TIER_GLOW_COLORS:
        return img

    glow_color = TIER_GLOW_COLORS[tier]
    glow_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow_layer)

    # Different glow intensity based on tier
    if tier == 'legendary':
        glow_strength = 50
        glow_layers = 6
    elif tier == 'strong':
        glow_strength = 35
        glow_layers = 4
    else:
        glow_strength = 20
        glow_layers = 3

    for i in range(glow_layers):
        alpha = int(glow_strength * (1 - i / glow_layers))
        offset = i * 2
        draw.rounded_rectangle(
            [border_width + offset, border_width + offset,
             CARD_WIDTH - border_width - offset, CARD_HEIGHT - border_width - offset],
            radius=max(1, BORDER_RADIUS - offset),
            outline=(glow_color[0], glow_color[1], glow_color[2], alpha),
            width=2
        )

    return Image.alpha_composite(img, glow_layer)


def create_stats_gradient(width, height):
    """Create a subtle gradient for the stats bar."""
    return create_gradient_layer(
        width, height,
        [hex_to_rgba(BG_PRIMARY, 230), hex_to_rgba(BG_SECONDARY, 230)],
        'vertical'
    )


# ============================================================================
# Card Front Rendering
# ============================================================================

def render_card_front(card, fonts, project_root):
    """Render the front of a card with professional quality."""
    tier = card.get('tier', 'common')

    # Create base with background
    img = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), hex_to_rgba(BG_TERTIARY))

    # Apply tier gradient background
    bg_gradient_colors = TIER_BG_GRADIENTS.get(tier, TIER_BG_GRADIENTS['common'])
    gradient = create_gradient_layer(CARD_WIDTH, CARD_HEIGHT, bg_gradient_colors, 'diagonal')
    img = Image.alpha_composite(img, gradient)

    draw = ImageDraw.Draw(img)

    # Draw main border
    border_color = hex_to_rgb(TIER_BORDER_COLORS.get(tier, '#3a3a5a'))
    draw_rounded_rect_outline(img, (0, 0, CARD_WIDTH-1, CARD_HEIGHT-1),
                              BORDER_RADIUS, border_color, BORDER_WIDTH)

    # =========== TIER BADGE (top right) ===========
    tier_label = tier.capitalize()
    badge_padding_x = 20
    badge_padding_y = 8

    bbox = draw.textbbox((0, 0), tier_label, font=fonts['tier_badge'])
    badge_text_w = bbox[2] - bbox[0]
    badge_text_h = bbox[3] - bbox[1]
    badge_w = badge_text_w + badge_padding_x * 2
    badge_h = badge_text_h + badge_padding_y * 2

    badge_x = CARD_WIDTH - PADDING - badge_w - 8
    badge_y = PADDING + 8

    # Badge shadow
    shadow_offset = 3
    draw_rounded_rect_filled(img,
                             (badge_x + shadow_offset, badge_y + shadow_offset,
                              badge_x + badge_w + shadow_offset, badge_y + badge_h + shadow_offset),
                             8, (0, 0, 0, 80))

    # Badge gradient background
    badge_gradient = create_badge_gradient(badge_w, badge_h, tier)
    badge_mask = create_rounded_rectangle_mask((badge_w, badge_h), 8)
    badge_masked = Image.new('RGBA', (badge_w, badge_h), (0, 0, 0, 0))
    badge_masked.paste(badge_gradient, mask=badge_mask)
    img.paste(badge_masked, (badge_x, badge_y), badge_masked)

    # Badge border
    draw_rounded_rect_outline(img, (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
                              8, darken_color(hex_to_rgb(TIER_BADGE_GRADIENTS[tier][1]), 0.2), 2)

    # Badge text with shadow
    text_color = TIER_BADGE_TEXT_COLORS.get(tier, TEXT_PRIMARY)
    draw_text_with_shadow(draw,
                          (badge_x + badge_w // 2, badge_y + badge_h // 2),
                          tier_label, fonts['tier_badge'], text_color,
                          shadow_offset=(1, 1), anchor='mm')

    # =========== CARD IMAGE AREA ===========
    image_margin = 20
    image_top = badge_y + badge_h + 16
    image_height = 380  # Fixed height for consistency
    image_width = CARD_WIDTH - PADDING * 2 - image_margin * 2
    image_left = PADDING + image_margin

    # Image area background
    draw_rounded_rect_filled(img,
                             (image_left, image_top, image_left + image_width, image_top + image_height),
                             IMAGE_CORNER_RADIUS, hex_to_rgba(BG_SECONDARY))

    # Load and draw card image - FILL THE AREA (object-fit: cover)
    card_image_path = project_root / 'assets' / 'images' / 'generated' / f"{card['id']}_generated.png"
    if card_image_path.exists():
        try:
            card_img = Image.open(card_image_path).convert('RGBA')

            # Calculate scale to FILL the area (cover), not fit
            img_ratio = card_img.width / card_img.height
            target_ratio = image_width / image_height

            if img_ratio > target_ratio:
                # Image is wider - scale by height, crop width
                new_height = image_height
                new_width = int(image_height * img_ratio)
            else:
                # Image is taller - scale by width, crop height
                new_width = image_width
                new_height = int(image_width / img_ratio)

            card_img = card_img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # Center crop to fill area
            crop_x = (new_width - image_width) // 2
            crop_y = (new_height - image_height) // 2
            card_img = card_img.crop((crop_x, crop_y, crop_x + image_width, crop_y + image_height))

            # Create mask for rounded corners
            img_mask = create_rounded_rectangle_mask((image_width, image_height), IMAGE_CORNER_RADIUS)

            # Paste with mask
            img.paste(card_img, (image_left, image_top), img_mask)

        except Exception as e:
            print(f"Warning: Could not load image for {card['id']}: {e}")
            draw.text((image_left + image_width // 2, image_top + image_height // 2),
                     "No Image", fill=TEXT_SECONDARY, font=fonts['bio'], anchor='mm')
    else:
        draw.text((image_left + image_width // 2, image_top + image_height // 2),
                 "No Image", fill=TEXT_SECONDARY, font=fonts['bio'], anchor='mm')

    # Inner shadow on image area
    tier_shadow = {
        'legendary': (255, 215, 0, 120),
        'strong': (148, 0, 211, 100),
        'common': (70, 130, 180, 80),
        'weak': (139, 90, 43, 70),
    }
    shadow_color = tier_shadow.get(tier, (0, 0, 0, 80))
    add_inner_shadow(img, (image_left, image_top, image_left + image_width, image_top + image_height),
                     IMAGE_CORNER_RADIUS, shadow_size=10, shadow_color=shadow_color)

    # =========== CARD INFO SECTION ===========
    info_y = image_top + image_height + 20

    # Card name - LARGE and prominent
    name = card.get('name', 'Unknown')
    if len(name) < 12:
        name_font = fonts['name_large']
    elif len(name) < 18:
        name_font = fonts['name_medium']
    else:
        name_font = fonts['name_small']

    draw_text_with_shadow(draw, (CARD_WIDTH // 2, info_y), name,
                          name_font, TEXT_PRIMARY, anchor='mt')

    name_bbox = draw.textbbox((0, 0), name, font=name_font)
    info_y += name_bbox[3] - name_bbox[1] + 16

    # Element icons (centered)
    elements = card.get('elements', [])
    element_size = 40
    element_gap = 12
    total_elements_width = len(elements) * element_size + max(0, len(elements) - 1) * element_gap
    element_x = (CARD_WIDTH - total_elements_width) // 2

    for element in elements:
        draw_element_icon(img, element_x, info_y, element_size, element, project_root, border_width=4)
        element_x += element_size + element_gap

    info_y += element_size + 16

    # Biography (italic, centered)
    bio = card.get('biography', '')
    if bio:
        max_chars = 42
        wrapped = textwrap.fill(bio, width=max_chars)
        lines = wrapped.split('\n')[:3]

        for line in lines:
            draw.text((CARD_WIDTH // 2, info_y), line, fill=TEXT_SECONDARY,
                     font=fonts['bio'], anchor='mt')
            line_bbox = draw.textbbox((0, 0), line, font=fonts['bio'])
            info_y += line_bbox[3] - line_bbox[1] + 4

    # =========== STATS BAR ===========
    stats_height = 50
    stats_y = CARD_HEIGHT - PADDING - stats_height - 8
    stats_padding = 16
    stats_left = PADDING + stats_padding
    stats_right = CARD_WIDTH - PADDING - stats_padding
    stats_width = stats_right - stats_left

    # Stats bar with gradient
    stats_gradient = create_stats_gradient(stats_width, stats_height)
    stats_mask = create_rounded_rectangle_mask((stats_width, stats_height), 10)
    stats_masked = Image.new('RGBA', (stats_width, stats_height), (0, 0, 0, 0))
    stats_masked.paste(stats_gradient, mask=stats_mask)
    img.paste(stats_masked, (stats_left, stats_y), stats_masked)

    # Stats border
    draw_rounded_rect_outline(img, (stats_left, stats_y, stats_right, stats_y + stats_height),
                              10, hex_to_rgb(BG_TERTIARY), 2)

    # Calculate stats
    hp = card.get('hp', 0)
    attacks = card.get('attacks', [])
    defenses = card.get('defenses', [])
    avg_atk = int(sum(a.get('base_damage', 0) for a in attacks) / len(attacks)) if attacks else 0
    avg_def = int(sum(d.get('base_protection', 0) for d in defenses) / len(defenses)) if defenses else 0

    def format_stat(value):
        if value >= 1000000:
            return f'{value/1000000:.1f}M'
        elif value >= 1000:
            return f'{value/1000:.0f}K'
        return str(value)

    stats_text_y = stats_y + stats_height // 2

    # HP (green) - left
    hp_text = f'HP: {format_stat(hp)}'
    draw_text_with_shadow(draw, (stats_left + 20, stats_text_y), hp_text,
                          fonts['stat_label'], STAT_HP_COLOR, anchor='lm')

    # ATK (fire color) - centered
    atk_text = f'ATK: {format_stat(avg_atk)}'
    draw_text_with_shadow(draw, (CARD_WIDTH // 2, stats_text_y), atk_text,
                          fonts['stat_label'], STAT_ATK_COLOR, anchor='mm')

    # DEF (water color) - right
    def_text = f'DEF: {format_stat(avg_def)}'
    draw_text_with_shadow(draw, (stats_right - 20, stats_text_y), def_text,
                          fonts['stat_label'], STAT_DEF_COLOR, anchor='rm')

    # Apply tier glow effect
    img = add_tier_glow(img, tier)

    # Apply card texture at 10% opacity
    img = apply_card_texture(img, project_root, opacity=0.10)

    return img


# ============================================================================
# Card Back Rendering
# ============================================================================

def render_card_back(card, fonts, project_root):
    """Render the back of a card with attacks, defenses, and special abilities."""
    tier = card.get('tier', 'common')

    # Create base with background
    img = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), hex_to_rgba(BG_TERTIARY))

    # Apply tier gradient background
    bg_gradient_colors = TIER_BG_GRADIENTS.get(tier, TIER_BG_GRADIENTS['common'])
    gradient = create_gradient_layer(CARD_WIDTH, CARD_HEIGHT, bg_gradient_colors, 'diagonal')
    img = Image.alpha_composite(img, gradient)

    # Add diagonal stripe pattern
    stripes = create_diagonal_stripes(CARD_WIDTH, CARD_HEIGHT,
                                      stripe_width=4, gap=8,
                                      color=(255, 255, 255, 25))  # 10-15% alpha
    img = Image.alpha_composite(img, stripes)

    draw = ImageDraw.Draw(img)

    # Draw border
    border_color = hex_to_rgb(TIER_BORDER_COLORS.get(tier, '#3a3a5a'))
    draw_rounded_rect_outline(img, (0, 0, CARD_WIDTH-1, CARD_HEIGHT-1),
                              BORDER_RADIUS, border_color, BORDER_WIDTH)

    # =========== LAYOUT CALCULATION ===========
    # Calculate exact heights for each section to prevent overlap

    # Header section: badge + name + elements
    header_start = PADDING + 12

    # Tier badge
    tier_label = tier.capitalize()
    badge_padding_x = 20
    badge_padding_y = 8
    bbox = draw.textbbox((0, 0), tier_label, font=fonts['tier_badge'])
    badge_text_w = bbox[2] - bbox[0]
    badge_text_h = bbox[3] - bbox[1]
    badge_w = badge_text_w + badge_padding_x * 2
    badge_h = badge_text_h + badge_padding_y * 2

    badge_x = CARD_WIDTH - PADDING - badge_w - 8
    badge_y = header_start

    # Badge shadow
    shadow_offset = 3
    draw_rounded_rect_filled(img,
                             (badge_x + shadow_offset, badge_y + shadow_offset,
                              badge_x + badge_w + shadow_offset, badge_y + badge_h + shadow_offset),
                             8, (0, 0, 0, 80))

    # Badge gradient
    badge_gradient = create_badge_gradient(badge_w, badge_h, tier)
    badge_mask = create_rounded_rectangle_mask((badge_w, badge_h), 8)
    badge_masked = Image.new('RGBA', (badge_w, badge_h), (0, 0, 0, 0))
    badge_masked.paste(badge_gradient, mask=badge_mask)
    img.paste(badge_masked, (badge_x, badge_y), badge_masked)

    # Badge border
    draw_rounded_rect_outline(img, (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
                              8, darken_color(hex_to_rgb(TIER_BADGE_GRADIENTS[tier][1]), 0.2), 2)

    # Badge text
    text_color = TIER_BADGE_TEXT_COLORS.get(tier, TEXT_PRIMARY)
    draw_text_with_shadow(draw,
                          (badge_x + badge_w // 2, badge_y + badge_h // 2),
                          tier_label, fonts['tier_badge'], text_color,
                          shadow_offset=(1, 1), anchor='mm')

    # Content starts below badge
    content_y = badge_y + badge_h + 20
    content_padding = PADDING + 24

    # =========== CARD NAME ===========
    name = card.get('name', 'Unknown')
    if len(name) < 12:
        name_font = fonts['name_large']
    elif len(name) < 18:
        name_font = fonts['name_medium']
    else:
        name_font = fonts['name_small']

    draw_text_with_shadow(draw, (CARD_WIDTH // 2, content_y), name,
                          name_font, TEXT_PRIMARY, anchor='mt')

    name_bbox = draw.textbbox((0, 0), name, font=name_font)
    content_y += name_bbox[3] - name_bbox[1] + 16

    # =========== ELEMENT ICONS ===========
    elements = card.get('elements', [])
    element_size = 36
    element_gap = 10
    total_elements_width = len(elements) * element_size + max(0, len(elements) - 1) * element_gap
    element_x = (CARD_WIDTH - total_elements_width) // 2

    for element in elements:
        draw_element_icon(img, element_x, content_y, element_size, element, project_root, border_width=3)
        element_x += element_size + element_gap

    content_y += element_size + 24

    # =========== SECTIONS ===========
    # Calculate available space for sections
    bottom_margin = PADDING + 20
    available_height = CARD_HEIGHT - content_y - bottom_margin

    # Count sections
    attacks = card.get('attacks', [])
    defenses = card.get('defenses', [])
    special_abilities = card.get('special_abilities', [])

    section_count = sum([bool(attacks), bool(defenses), bool(special_abilities)])
    if section_count == 0:
        section_count = 1

    # Section heights
    section_title_height = 35
    item_height = 28
    section_gap = 20

    def format_stat(value):
        if value >= 1000000:
            return f'{value/1000000:.1f}M'
        elif value >= 1000:
            return f'{value/1000:.0f}K'
        return str(value)

    def draw_section_item(x, y, element, text, value_text):
        """Draw a section item with element icon, name, and value."""
        icon_size = 22
        item_x = x

        if element:
            draw_element_icon(img, item_x, y - 2, icon_size, element, project_root, border_width=2)
            item_x += icon_size + 8

        # Truncate text if needed
        full_text = f"{text} ({value_text})" if value_text else text
        max_width = CARD_WIDTH - item_x - content_padding

        while draw.textbbox((0, 0), full_text, font=fonts['section_item'])[2] > max_width and len(full_text) > 10:
            text = text[:-2]
            full_text = f"{text}... ({value_text})" if value_text else f"{text}..."

        draw_text_with_shadow(draw, (item_x, y), full_text,
                              fonts['section_item'], TEXT_PRIMARY,
                              shadow_color=(0, 0, 0, 80), shadow_offset=(1, 1))

        return item_height

    # =========== ATTACKS SECTION ===========
    if attacks:
        # Section title - bold and clear
        draw_text_with_shadow(draw, (CARD_WIDTH // 2, content_y), 'ATTACKS',
                              fonts['section_title'], TEXT_ACCENT,
                              shadow_color=(0, 0, 0, 120), shadow_offset=(2, 2), anchor='mt')
        content_y += section_title_height

        # Sort by damage descending
        sorted_attacks = sorted(attacks, key=lambda a: a.get('base_damage', 0), reverse=True)

        for attack in sorted_attacks[:4]:
            damage = attack.get('base_damage', attack.get('damage', 0))
            content_y += draw_section_item(
                content_padding, content_y,
                attack.get('element'),
                attack.get('name', 'Unknown'),
                f"{format_stat(damage)} dmg"
            )

        content_y += section_gap

    # =========== DEFENSES SECTION ===========
    if defenses:
        draw_text_with_shadow(draw, (CARD_WIDTH // 2, content_y), 'DEFENSES',
                              fonts['section_title'], TEXT_ACCENT,
                              shadow_color=(0, 0, 0, 120), shadow_offset=(2, 2), anchor='mt')
        content_y += section_title_height

        sorted_defenses = sorted(defenses, key=lambda d: d.get('base_protection', 0), reverse=True)

        for defense in sorted_defenses[:3]:
            protection = defense.get('base_protection', defense.get('protection', 0))
            content_y += draw_section_item(
                content_padding, content_y,
                defense.get('element'),
                defense.get('name', 'Unknown'),
                f"-{format_stat(protection)}"
            )

        content_y += section_gap

    # =========== SPECIAL ABILITIES SECTION ===========
    if special_abilities:
        draw_text_with_shadow(draw, (CARD_WIDTH // 2, content_y), 'SPECIAL ABILITIES',
                              fonts['section_title'], TEXT_ACCENT,
                              shadow_color=(0, 0, 0, 120), shadow_offset=(2, 2), anchor='mt')
        content_y += section_title_height

        for ability in special_abilities[:3]:
            if isinstance(ability, dict):
                ability_name = ability.get('name', 'Unknown')
                element = ability.get('element')
                uses = ability.get('uses', '')
                value_text = f"{uses}x" if uses else ''
            else:
                ability_name = str(ability)
                element = None
                value_text = ''

            content_y += draw_section_item(
                content_padding, content_y,
                element,
                ability_name,
                value_text
            )

    # Apply tier glow effect
    img = add_tier_glow(img, tier)

    # Apply card texture at 10% opacity
    img = apply_card_texture(img, project_root, opacity=0.10)

    return img


# ============================================================================
# Main Rendering Functions
# ============================================================================

def render_card(card, fonts, project_root, output_dir, force=False):
    """Render front and back of a single card."""
    card_id = card.get('id', 'unknown')

    front_path = output_dir / f'{card_id}_front.png'
    back_path = output_dir / f'{card_id}_back.png'

    # Check if already rendered
    if not force and front_path.exists() and back_path.exists():
        print(f"  Skipping {card_id} (already exists)")
        return True

    try:
        # Render front
        print(f"  Rendering {card_id} front...")
        front_img = render_card_front(card, fonts, project_root)
        front_img.save(front_path, 'PNG', optimize=True)

        # Render back
        print(f"  Rendering {card_id} back...")
        back_img = render_card_back(card, fonts, project_root)
        back_img.save(back_path, 'PNG', optimize=True)

        return True
    except Exception as e:
        print(f"  ERROR rendering {card_id}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Render high-quality card images for Monster Ghost Army Cards')
    parser.add_argument('--card-id', help='Render only the specified card')
    parser.add_argument('--force', action='store_true', help='Re-render even if files exist')
    args = parser.parse_args()

    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Load cards
    cards_path = project_root / 'data' / 'cards.json'
    if not cards_path.exists():
        print(f"ERROR: Cards file not found at {cards_path}")
        sys.exit(1)

    with open(cards_path, 'r') as f:
        cards = json.load(f)

    print(f"Loaded {len(cards)} cards from {cards_path}")

    # Create output directory
    output_dir = project_root / 'assets' / 'images' / 'cards'
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")

    # Load fonts
    print("Loading fonts...")
    fonts = load_fonts(project_root)

    # Filter cards if specific ID requested
    if args.card_id:
        cards = [c for c in cards if c.get('id') == args.card_id]
        if not cards:
            print(f"ERROR: Card '{args.card_id}' not found")
            sys.exit(1)

    # Render all cards
    print(f"\nRendering {len(cards)} cards...")
    success_count = 0
    error_count = 0

    for i, card in enumerate(cards, 1):
        card_id = card.get('id', 'unknown')
        print(f"[{i}/{len(cards)}] {card.get('name', card_id)}")

        if render_card(card, fonts, project_root, output_dir, args.force):
            success_count += 1
        else:
            error_count += 1

    print(f"\nComplete! {success_count} cards rendered successfully, {error_count} errors.")

    if error_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
