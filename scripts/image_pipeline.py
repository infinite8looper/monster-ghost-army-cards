#!/usr/bin/env python3
"""
Image Processing Pipeline for Monster Ghost Army Cards

This pipeline:
1. Detects and corrects image rotation
2. Crops to the character box (removing surrounding text)
3. Prepares images for Gemini enhancement
4. Post-processes to consistent dimensions

Usage:
    python scripts/image_pipeline.py --test  # Run on 10 test cards
    python scripts/image_pipeline.py --all   # Run on all 96 cards
"""

import os
import json
import argparse
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
ORIG_IMAGES = PROJECT_ROOT / "images" / "orig"
DATA_DIR = PROJECT_ROOT / "data"
ASSETS_DIR = PROJECT_ROOT / "assets" / "images"
PROCESSED_DIR = ASSETS_DIR / "processed"
GENERATED_DIR = ASSETS_DIR / "generated"

# Ensure directories exist
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def load_cards():
    """Load card data from cards.json"""
    with open(DATA_DIR / "cards.json", "r") as f:
        return json.load(f)


def load_test_batch():
    """Load test batch card IDs"""
    with open(DATA_DIR / "test_batch.json", "r") as f:
        batch = json.load(f)
        return [card["id"] for card in batch["cards"]]


def load_card_image_mapping():
    """Load or create card-to-image mapping"""
    mapping_file = DATA_DIR / "card_image_mapping.json"
    if mapping_file.exists():
        with open(mapping_file, "r") as f:
            return json.load(f)
    return {}


def save_card_image_mapping(mapping):
    """Save card-to-image mapping"""
    mapping_file = DATA_DIR / "card_image_mapping.json"
    with open(mapping_file, "w") as f:
        json.dump(mapping, f, indent=2)


def list_original_images():
    """List all original images"""
    return sorted([f.name for f in ORIG_IMAGES.glob("*.jpg")])


def preprocess_image(image_path, card_id, card_data):
    """
    Preprocess a single card image:
    1. Detect rotation and correct
    2. Crop to character box

    This is a placeholder - actual implementation will use Claude Code agent
    or image processing library.
    """
    output_path = PROCESSED_DIR / f"{card_id}_processed.png"

    # TODO: Implement rotation detection
    # TODO: Implement character box cropping

    print(f"  Preprocessing: {image_path.name} -> {output_path.name}")
    return output_path


def generate_enhanced_image(processed_path, card_id, card_data):
    """
    Use Gemini to generate enhanced fantasy-style image.

    This is a placeholder - actual implementation will use Gemini API.
    """
    output_path = GENERATED_DIR / f"{card_id}_enhanced.png"

    # Build prompt from card data
    prompt = build_gemini_prompt(card_data)

    print(f"  Gemini prompt ready for: {card_id}")
    print(f"    Name: {card_data['name']}")
    print(f"    Elements: {', '.join(card_data['elements'])}")
    print(f"    Tier: {card_data['tier']}")

    return output_path, prompt


def build_gemini_prompt(card_data):
    """Build a detailed prompt for Gemini image generation"""
    name = card_data["name"]
    visual_desc = card_data.get("visual_description", "")
    elements = card_data.get("elements", [])
    tier = card_data.get("tier", "common")
    biography = card_data.get("biography", "")

    # Get attack/defense names for flavor
    attacks = [a["name"] for a in card_data.get("attacks", [])]
    defenses = [d["name"] for d in card_data.get("defenses", [])]
    special = card_data.get("special_abilities", [])

    prompt = f"""Create a fantasy trading card illustration for "{name}".

ORIGINAL DESCRIPTION: {visual_desc}

STYLE REQUIREMENTS:
- Whimsical, kid-friendly fantasy art style
- Vibrant colors matching the elements: {', '.join(elements)}
- {'Epic, legendary quality with golden aura' if tier == 'legendary' else 'Standard fantasy card art' if tier == 'common' else 'Simple, understated design'}
- Retain the humor and charm of the original hand-drawn concept
- Add dramatic fantasy details while keeping it family-friendly

CHARACTER ABILITIES:
- Attacks: {', '.join(attacks) if attacks else 'None'}
- Defenses: {', '.join(defenses) if defenses else 'None'}
- Special: {', '.join(special) if special else 'None'}

LORE: {biography}

The image should be suitable for a trading card game, with the character centered and dynamic.
"""
    return prompt


def postprocess_image(generated_path, card_id, target_size=(512, 512)):
    """
    Post-process generated image to consistent dimensions.

    This is a placeholder - actual implementation will resize/crop.
    """
    output_path = GENERATED_DIR / f"{card_id}_final.png"

    print(f"  Post-processing to {target_size[0]}x{target_size[1]}")

    return output_path


def process_card(card_id, cards_dict, image_mapping):
    """Process a single card through the full pipeline"""
    print(f"\n{'='*60}")
    print(f"Processing: {card_id}")
    print(f"{'='*60}")

    # Get card data
    card_data = cards_dict.get(card_id)
    if not card_data:
        print(f"  ERROR: Card data not found for {card_id}")
        return None

    # Get source image
    source_image = image_mapping.get(card_id)
    if not source_image:
        print(f"  WARNING: No image mapping for {card_id}")
        print(f"  Will need to identify source image")
        return None

    source_path = ORIG_IMAGES / source_image
    if not source_path.exists():
        print(f"  ERROR: Source image not found: {source_path}")
        return None

    # Step 1: Preprocess
    processed_path = preprocess_image(source_path, card_id, card_data)

    # Step 2: Generate enhanced image
    enhanced_path, prompt = generate_enhanced_image(processed_path, card_id, card_data)

    # Step 3: Post-process
    final_path = postprocess_image(enhanced_path, card_id)

    return {
        "card_id": card_id,
        "source_image": source_image,
        "processed_path": str(processed_path),
        "enhanced_path": str(enhanced_path),
        "final_path": str(final_path),
        "prompt": prompt
    }


def main():
    parser = argparse.ArgumentParser(description="Image processing pipeline")
    parser.add_argument("--test", action="store_true", help="Process test batch only")
    parser.add_argument("--all", action="store_true", help="Process all cards")
    parser.add_argument("--list-images", action="store_true", help="List all original images")
    parser.add_argument("--generate-prompts", action="store_true", help="Generate Gemini prompts only")
    args = parser.parse_args()

    if args.list_images:
        images = list_original_images()
        print(f"Found {len(images)} original images:")
        for img in images:
            print(f"  {img}")
        return

    # Load data
    cards = load_cards()
    cards_dict = {card["id"]: card for card in cards}
    image_mapping = load_card_image_mapping()

    # Determine which cards to process
    if args.test:
        card_ids = load_test_batch()
        print(f"Processing TEST BATCH: {len(card_ids)} cards")
    elif args.all:
        card_ids = list(cards_dict.keys())
        print(f"Processing ALL: {len(card_ids)} cards")
    else:
        print("Usage: python image_pipeline.py --test OR --all")
        return

    if args.generate_prompts:
        print("\n" + "="*60)
        print("GENERATING GEMINI PROMPTS ONLY")
        print("="*60)

        prompts_output = []
        for card_id in card_ids:
            card_data = cards_dict.get(card_id)
            if card_data:
                prompt = build_gemini_prompt(card_data)
                prompts_output.append({
                    "card_id": card_id,
                    "name": card_data["name"],
                    "prompt": prompt
                })
                print(f"\n--- {card_data['name']} ---")
                print(prompt[:200] + "...")

        # Save prompts
        prompts_file = DATA_DIR / "gemini_prompts.json"
        with open(prompts_file, "w") as f:
            json.dump(prompts_output, f, indent=2)
        print(f"\nSaved {len(prompts_output)} prompts to {prompts_file}")
        return

    # Check for image mapping
    if not image_mapping:
        print("\nWARNING: No card-to-image mapping found!")
        print("Need to create mapping first. Run card image identification.")
        print(f"Available images: {len(list_original_images())}")
        return

    # Process cards
    results = []
    for card_id in card_ids:
        result = process_card(card_id, cards_dict, image_mapping)
        if result:
            results.append(result)

    print(f"\n{'='*60}")
    print(f"PIPELINE COMPLETE")
    print(f"Processed: {len(results)}/{len(card_ids)} cards")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
