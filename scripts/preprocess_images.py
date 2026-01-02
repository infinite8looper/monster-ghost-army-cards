#!/usr/bin/env python3
"""
Image Preprocessing for Monster Ghost Army Cards

Handles:
1. Rotation detection and correction (some photos are landscape/rotated)
2. Cropping to the character box (removing title and ability text)

Usage:
    python scripts/preprocess_images.py --test    # Process test batch
    python scripts/preprocess_images.py --all     # Process all mapped cards
    python scripts/preprocess_images.py --single <card_id>  # Process single card
"""

import os
import json
import argparse
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageEnhance
    import numpy as np
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("WARNING: Pillow not installed. Run: pip install Pillow numpy")

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
ORIG_IMAGES = PROJECT_ROOT / "images" / "orig"
DATA_DIR = PROJECT_ROOT / "data"
ASSETS_DIR = PROJECT_ROOT / "assets" / "images"
PROCESSED_DIR = ASSETS_DIR / "processed"
CROPPED_DIR = ASSETS_DIR / "cropped"

# Ensure directories exist
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
CROPPED_DIR.mkdir(parents=True, exist_ok=True)


def load_card_image_mapping():
    """Load card-to-image mapping"""
    mapping_file = DATA_DIR / "card_image_mapping.json"
    if mapping_file.exists():
        with open(mapping_file, "r") as f:
            data = json.load(f)
            # Handle nested structure with 'mappings' key
            if isinstance(data, dict) and "mappings" in data:
                return data["mappings"]
            return data
    return {}


def load_test_batch_ids():
    """Load test batch card IDs"""
    with open(DATA_DIR / "test_batch.json", "r") as f:
        batch = json.load(f)
        return [card["id"] for card in batch["cards"]]


def detect_rotation(image):
    """
    Detect if image needs rotation based on aspect ratio.

    Cards should be portrait (taller than wide).
    If width > height, the image is likely rotated 90 degrees.

    Returns:
        int: Rotation angle needed (0, 90, -90, or 180)
    """
    width, height = image.size

    # If landscape orientation, needs 90 degree rotation
    if width > height:
        # Rotate 90 degrees CLOCKWISE (-90 in PIL's counter-clockwise convention)
        # This brings the left side of landscape to the top of portrait
        return -90

    return 0


def rotate_image(image, angle):
    """
    Rotate image by specified angle.

    Args:
        image: PIL Image
        angle: Rotation angle in degrees (positive = counter-clockwise)

    Returns:
        PIL Image: Rotated image
    """
    if angle == 0:
        return image

    # PIL's rotate uses counter-clockwise, expand=True to avoid cropping
    return image.rotate(angle, expand=True)


def find_character_box(image, was_landscape=False, card_id=None, debug=False):
    """
    Find the character box (colored rectangular border) in the card image.

    The character box typically:
    - Has a colored border (cyan, pink, purple, orange, etc.)
    - Is roughly in the center-upper portion of the card
    - Takes up about 40-60% of the card height

    Args:
        image: PIL Image
        was_landscape: True if image was originally landscape and has been rotated
        card_id: Optional card ID for card-specific handling
        debug: Enable debug output

    Returns:
        tuple: (left, top, right, bottom) bounding box, or None if not found
    """
    if not HAS_PIL:
        return None

    # Convert to numpy array for analysis
    img_array = np.array(image)
    height, width = img_array.shape[:2]

    # Special cases for specific cards
    if card_id == "the_scribbler":
        # The Scribbler has art intentionally extending outside the box
        # Use more generous margins to capture overflow
        top_margin = int(height * 0.05)
        bottom_margin = int(height * 0.40)
        left_margin = int(width * 0.03)
        right_margin = int(width * 0.03)
    elif was_landscape:
        # Cards that were originally landscape have different layout after rotation
        # Character box is more centered, abilities wrap around differently
        top_margin = int(height * 0.08)
        bottom_margin = int(height * 0.08)
        left_margin = int(width * 0.15)
        right_margin = int(width * 0.35)  # Asymmetric - more abilities on right
    else:
        # Standard portrait cards: title at top, character box, abilities below
        top_margin = int(height * 0.10)       # Skip title area
        bottom_margin = int(height * 0.45)    # Skip abilities area
        left_margin = int(width * 0.06)       # Small side margins
        right_margin = int(width * 0.06)

    box = (
        left_margin,
        top_margin,
        width - right_margin,
        height - bottom_margin
    )

    return box


def find_colored_border_box(image, min_saturation=50, debug=False):
    """
    Find the character box by detecting colored borders.

    Looks for saturated (colorful) pixels that form a rectangular boundary.

    Args:
        image: PIL Image in RGB mode
        min_saturation: Minimum saturation value (0-255) to consider "colored"
        debug: If True, save debug images

    Returns:
        tuple: (left, top, right, bottom) bounding box
    """
    if not HAS_PIL:
        return None

    # Convert to HSV for better color detection
    img_hsv = image.convert('HSV')
    img_array = np.array(img_hsv)

    height, width = img_array.shape[:2]

    # Extract saturation channel
    saturation = img_array[:, :, 1]

    # Create mask of "colorful" pixels (high saturation)
    color_mask = saturation > min_saturation

    # Find bounding box of colorful region
    rows_with_color = np.any(color_mask, axis=1)
    cols_with_color = np.any(color_mask, axis=0)

    if not np.any(rows_with_color) or not np.any(cols_with_color):
        # Fall back to heuristic approach
        return find_character_box(image, debug)

    # Find first and last rows/cols with color
    row_indices = np.where(rows_with_color)[0]
    col_indices = np.where(cols_with_color)[0]

    top = row_indices[0]
    bottom = row_indices[-1]
    left = col_indices[0]
    right = col_indices[-1]

    # Add small padding
    padding = 5
    top = max(0, top - padding)
    bottom = min(height, bottom + padding)
    left = max(0, left - padding)
    right = min(width, right + padding)

    # Sanity check: box should be reasonable size
    box_height = bottom - top
    box_width = right - left

    if box_height < height * 0.2 or box_width < width * 0.2:
        # Box too small, fall back to heuristic
        return find_character_box(image, debug)

    if box_height > height * 0.95 or box_width > width * 0.95:
        # Box too large (probably detected whole card), use heuristic
        return find_character_box(image, debug)

    return (left, top, right, bottom)


def crop_to_character_box(image, method='heuristic', was_landscape=False, card_id=None):
    """
    Crop image to just the character box area.

    Args:
        image: PIL Image
        method: 'heuristic' for ratio-based, 'color' for border detection
        was_landscape: True if image was originally landscape (affects crop ratios)
        card_id: Optional card ID for card-specific handling

    Returns:
        PIL Image: Cropped image
    """
    if method == 'color':
        box = find_colored_border_box(image)
    else:
        box = find_character_box(image, was_landscape=was_landscape, card_id=card_id)

    if box is None:
        return image

    return image.crop(box)


def enhance_image(image):
    """
    Apply light enhancement to improve image quality.

    Args:
        image: PIL Image

    Returns:
        PIL Image: Enhanced image
    """
    # Slight contrast boost
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.1)

    # Slight sharpening
    image = image.filter(ImageFilter.SHARPEN)

    return image


def preprocess_single_image(image_path, card_id, output_dir=None, crop=True, enhance=True):
    """
    Preprocess a single card image.

    Args:
        image_path: Path to source image
        card_id: Card identifier
        output_dir: Output directory (defaults to PROCESSED_DIR)
        crop: Whether to crop to character box
        enhance: Whether to apply image enhancement

    Returns:
        dict: Processing results with paths and metadata
    """
    if not HAS_PIL:
        return {"error": "Pillow not installed"}

    if output_dir is None:
        output_dir = PROCESSED_DIR

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load image
    image = Image.open(image_path)
    original_size = image.size

    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # Check if original image was landscape (width > height)
    was_landscape = original_size[0] > original_size[1]

    result = {
        "card_id": card_id,
        "source_image": str(image_path),
        "original_size": original_size,
        "was_landscape": was_landscape,
        "rotated": False,
        "rotation_angle": 0,
    }

    # Step 1: Detect and correct rotation
    rotation_angle = detect_rotation(image)
    if rotation_angle != 0:
        image = rotate_image(image, rotation_angle)
        result["rotated"] = True
        result["rotation_angle"] = rotation_angle
        result["size_after_rotation"] = image.size
        print(f"  Rotated {rotation_angle} degrees (was landscape: {was_landscape})")

    # Save rotated (but not cropped) version
    rotated_path = output_dir / f"{card_id}_rotated.png"
    image.save(rotated_path)
    result["rotated_path"] = str(rotated_path)

    # Step 2: Crop to character box
    # Pass was_landscape so cropping uses appropriate ratios
    if crop:
        cropped = crop_to_character_box(
            image,
            method='heuristic',
            was_landscape=was_landscape,
            card_id=card_id
        )
        result["cropped_size"] = cropped.size

        # Save cropped version
        cropped_path = CROPPED_DIR / f"{card_id}_cropped.png"
        cropped.save(cropped_path)
        result["cropped_path"] = str(cropped_path)
        print(f"  Cropped to {cropped.size} (landscape-aware: {was_landscape})")

        # Use cropped for enhancement
        image = cropped

    # Step 3: Enhance
    if enhance:
        image = enhance_image(image)

    # Save final processed version
    final_path = output_dir / f"{card_id}_processed.png"
    image.save(final_path, quality=95)
    result["final_path"] = str(final_path)
    result["final_size"] = image.size

    return result


def preprocess_batch(card_ids, image_mapping):
    """
    Preprocess a batch of cards.

    Args:
        card_ids: List of card IDs to process
        image_mapping: Dict mapping card_id -> image filename

    Returns:
        list: Processing results for each card
    """
    results = []

    for card_id in card_ids:
        print(f"\n{'='*50}")
        print(f"Processing: {card_id}")
        print(f"{'='*50}")

        image_file = image_mapping.get(card_id)
        if not image_file:
            print(f"  SKIP: No image mapping for {card_id}")
            results.append({"card_id": card_id, "error": "No image mapping"})
            continue

        image_path = ORIG_IMAGES / image_file
        if not image_path.exists():
            print(f"  ERROR: Image not found: {image_path}")
            results.append({"card_id": card_id, "error": f"Image not found: {image_file}"})
            continue

        result = preprocess_single_image(image_path, card_id)
        results.append(result)

        if "error" in result:
            print(f"  ERROR: {result['error']}")
        else:
            print(f"  SUCCESS: {result['final_path']}")

    return results


def rotate_only(card_ids, image_mapping):
    """
    Pass 1: Only rotate images to correct orientation.
    Saves rotated images without cropping.

    Returns:
        list: Results with rotation info for each card
    """
    results = []
    ROTATED_DIR = ASSETS_DIR / "rotated"
    ROTATED_DIR.mkdir(parents=True, exist_ok=True)

    for card_id in card_ids:
        print(f"\n{'='*50}")
        print(f"Rotating: {card_id}")
        print(f"{'='*50}")

        image_file = image_mapping.get(card_id)
        if not image_file:
            print(f"  SKIP: No image mapping")
            results.append({"card_id": card_id, "error": "No image mapping"})
            continue

        image_path = ORIG_IMAGES / image_file
        if not image_path.exists():
            print(f"  ERROR: Image not found")
            results.append({"card_id": card_id, "error": "Image not found"})
            continue

        image = Image.open(image_path)
        original_size = image.size
        was_landscape = original_size[0] > original_size[1]

        if image.mode != 'RGB':
            image = image.convert('RGB')

        result = {
            "card_id": card_id,
            "source_image": str(image_path),
            "original_size": original_size,
            "was_landscape": was_landscape,
        }

        rotation_angle = detect_rotation(image)
        if rotation_angle != 0:
            image = rotate_image(image, rotation_angle)
            result["rotated"] = True
            result["rotation_angle"] = rotation_angle
            result["rotated_size"] = image.size
            print(f"  Rotated {rotation_angle} degrees")
        else:
            result["rotated"] = False
            result["rotated_size"] = original_size
            print(f"  No rotation needed")

        # Save rotated image
        rotated_path = ROTATED_DIR / f"{card_id}_rotated.png"
        image.save(rotated_path)
        result["rotated_path"] = str(rotated_path)
        print(f"  Saved: {rotated_path.name}")

        results.append(result)

    return results


def apply_custom_crops(card_ids, bounding_boxes):
    """
    Pass 3: Apply custom bounding box crops from detected boxes.

    Args:
        card_ids: List of card IDs to process
        bounding_boxes: Dict mapping card_id -> {"left": %, "top": %, "right": %, "bottom": %}
    """
    ROTATED_DIR = ASSETS_DIR / "rotated"
    results = []

    for card_id in card_ids:
        print(f"\nCropping: {card_id}")

        rotated_path = ROTATED_DIR / f"{card_id}_rotated.png"
        if not rotated_path.exists():
            print(f"  ERROR: Rotated image not found")
            results.append({"card_id": card_id, "error": "Rotated image not found"})
            continue

        box = bounding_boxes.get(card_id)
        if not box:
            print(f"  ERROR: No bounding box defined")
            results.append({"card_id": card_id, "error": "No bounding box"})
            continue

        image = Image.open(rotated_path)
        width, height = image.size

        # Convert percentages to pixels
        left = int(width * box["left"] / 100)
        top = int(height * box["top"] / 100)
        right = int(width * (100 - box["right"]) / 100)
        bottom = int(height * (100 - box["bottom"]) / 100)

        cropped = image.crop((left, top, right, bottom))

        # Save cropped
        cropped_path = CROPPED_DIR / f"{card_id}_cropped.png"
        cropped.save(cropped_path)

        # Also save enhanced version
        enhanced = enhance_image(cropped)
        processed_path = PROCESSED_DIR / f"{card_id}_processed.png"
        enhanced.save(processed_path)

        print(f"  Cropped to {cropped.size}")
        results.append({
            "card_id": card_id,
            "cropped_path": str(cropped_path),
            "processed_path": str(processed_path),
            "crop_box": box
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Preprocess card images")
    parser.add_argument("--test", action="store_true", help="Process test batch only")
    parser.add_argument("--all", action="store_true", help="Process all mapped cards")
    parser.add_argument("--single", type=str, help="Process single card by ID")
    parser.add_argument("--rotate-only", action="store_true", help="Pass 1: Only rotate, no cropping")
    parser.add_argument("--apply-crops", action="store_true", help="Pass 3: Apply crops from bounding_boxes.json")
    parser.add_argument("--no-crop", action="store_true", help="Skip cropping step")
    parser.add_argument("--no-enhance", action="store_true", help="Skip enhancement step")
    args = parser.parse_args()

    if not HAS_PIL:
        print("ERROR: Pillow is required. Install with: pip install Pillow numpy")
        return

    # Load image mapping
    image_mapping = load_card_image_mapping()

    if not image_mapping:
        print("ERROR: No card-to-image mapping found!")
        print("Run the image mapping agent first.")
        return

    print(f"Loaded image mapping with {len(image_mapping)} cards")

    # Determine which cards to process
    if args.single:
        card_ids = [args.single]
        print(f"Processing single card: {args.single}")
    elif args.test:
        card_ids = load_test_batch_ids()
        print(f"Processing TEST BATCH: {len(card_ids)} cards")
    elif args.all:
        card_ids = list(image_mapping.keys())
        print(f"Processing ALL MAPPED: {len(card_ids)} cards")
    else:
        print("Usage: python preprocess_images.py --test OR --all OR --single <card_id>")
        print("  --rotate-only   Pass 1: Only rotate images")
        print("  --apply-crops   Pass 3: Apply crops from bounding_boxes.json")
        return

    # Handle different processing modes
    if args.rotate_only:
        # Pass 1: Just rotate
        print("\n=== PASS 1: ROTATION ONLY ===")
        results = rotate_only(card_ids, image_mapping)

        # Save rotation results
        rotation_file = DATA_DIR / "rotation_results.json"
        with open(rotation_file, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nRotation results saved to: {rotation_file}")
        print(f"Next step: Run bounding box detection on rotated images")
        return

    if args.apply_crops:
        # Pass 3: Apply custom bounding boxes
        print("\n=== PASS 3: APPLYING CUSTOM CROPS ===")
        bbox_file = DATA_DIR / "bounding_boxes.json"
        if not bbox_file.exists():
            print(f"ERROR: {bbox_file} not found!")
            print("Run bounding box detection first (Pass 2)")
            return

        with open(bbox_file, "r") as f:
            bounding_boxes = json.load(f)

        results = apply_custom_crops(card_ids, bounding_boxes)

        # Save crop results
        crop_file = DATA_DIR / "crop_results.json"
        with open(crop_file, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nCrop results saved to: {crop_file}")
        return

    # Default: Full preprocessing pipeline
    results = preprocess_batch(card_ids, image_mapping)

    # Summary
    successful = [r for r in results if "error" not in r]
    failed = [r for r in results if "error" in r]

    print(f"\n{'='*50}")
    print(f"PREPROCESSING COMPLETE")
    print(f"{'='*50}")
    print(f"Successful: {len(successful)}/{len(results)}")
    print(f"Failed: {len(failed)}/{len(results)}")

    if failed:
        print(f"\nFailed cards:")
        for r in failed:
            print(f"  - {r['card_id']}: {r.get('error', 'Unknown error')}")

    # Save results
    results_file = DATA_DIR / "preprocessing_results.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
