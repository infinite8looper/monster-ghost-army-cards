#!/usr/bin/env python3
"""
Gemini Image Generation for Monster Ghost Army Cards

Uses Google's Gemini API to generate fantasy-style card images
from preprocessed card artwork and detailed prompts.

Usage:
    python scripts/gemini_generate.py --test     # Generate for test batch
    python scripts/gemini_generate.py --single <card_id>  # Generate single card
    python scripts/gemini_generate.py --dry-run  # Show prompts without generating

Requirements:
    pip install google-generativeai Pillow
    export GOOGLE_API_KEY=your_api_key
"""

import os
import json
import argparse
import base64
from pathlib import Path
from datetime import datetime

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    print("WARNING: google-generativeai not installed. Run: pip install google-generativeai")

try:
    from PIL import Image
    import io
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ASSETS_DIR = PROJECT_ROOT / "assets" / "images"
PROCESSED_DIR = ASSETS_DIR / "processed"
CROPPED_DIR = ASSETS_DIR / "cropped"
GENERATED_DIR = ASSETS_DIR / "generated"

# Ensure directories exist
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def load_cards():
    """Load card data from cards.json"""
    with open(DATA_DIR / "cards.json", "r") as f:
        cards = json.load(f)
        return {card["id"]: card for card in cards}


def load_gemini_prompts():
    """Load pre-generated Gemini prompts"""
    prompts_file = DATA_DIR / "gemini_prompts.json"
    if prompts_file.exists():
        with open(prompts_file, "r") as f:
            prompts = json.load(f)
            return {p["card_id"]: p["prompt"] for p in prompts}
    return {}


def load_test_batch_ids():
    """Load test batch card IDs"""
    with open(DATA_DIR / "test_batch.json", "r") as f:
        batch = json.load(f)
        return [card["id"] for card in batch["cards"]]


def get_processed_image_path(card_id):
    """Get path to processed/cropped image for a card"""
    # Prefer cropped version
    cropped_path = CROPPED_DIR / f"{card_id}_cropped.png"
    if cropped_path.exists():
        return cropped_path

    # Fall back to processed
    processed_path = PROCESSED_DIR / f"{card_id}_processed.png"
    if processed_path.exists():
        return processed_path

    # Fall back to rotated
    rotated_path = PROCESSED_DIR / f"{card_id}_rotated.png"
    if rotated_path.exists():
        return rotated_path

    return None


def image_to_base64(image_path):
    """Convert image file to base64 string"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def setup_gemini():
    """Initialize Gemini API"""
    if not HAS_GENAI:
        raise RuntimeError("google-generativeai package not installed")

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable not set")

    genai.configure(api_key=api_key)

    # Use Gemini Pro Vision for image understanding + generation
    # Or Gemini 2.0 Flash for image generation
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

    return model


def build_generation_prompt(card_data, base_prompt):
    """
    Build the full generation prompt for Gemini.

    Combines the base prompt with additional context about
    preserving the original character design.
    """
    return f"""{base_prompt}

IMPORTANT INSTRUCTIONS:
1. Study the reference image carefully - this is the ORIGINAL hand-drawn character
2. The enhanced version MUST be recognizable as the SAME character
3. Keep the same basic shape, features, and personality
4. Upgrade the art style to polished fantasy trading card quality
5. Add dramatic lighting, textures, and magical effects
6. Maintain the whimsical, kid-friendly tone
7. The character should be centered and take up most of the frame
8. Use a simple gradient or magical background (not busy/distracting)
9. Output as a square image suitable for a trading card
"""


def generate_image_with_gemini(model, card_id, card_data, prompt, reference_image_path=None, dry_run=False):
    """
    Generate an enhanced fantasy image using Gemini.

    Args:
        model: Gemini model instance
        card_id: Card identifier
        card_data: Full card data dictionary
        prompt: Generation prompt
        reference_image_path: Path to preprocessed reference image
        dry_run: If True, just show prompt without generating

    Returns:
        dict: Generation results
    """
    result = {
        "card_id": card_id,
        "card_name": card_data["name"],
        "timestamp": datetime.now().isoformat(),
    }

    full_prompt = build_generation_prompt(card_data, prompt)
    result["prompt"] = full_prompt

    if dry_run:
        print(f"\n--- DRY RUN: {card_data['name']} ---")
        print(f"Prompt preview (first 500 chars):")
        print(full_prompt[:500] + "...")
        if reference_image_path:
            print(f"Reference image: {reference_image_path}")
        result["dry_run"] = True
        return result

    try:
        # Prepare content for Gemini
        content_parts = []

        # Add reference image if available
        if reference_image_path and reference_image_path.exists():
            img = Image.open(reference_image_path)
            content_parts.append(img)
            content_parts.append("\nAbove is the original hand-drawn character design.\n\n")
            result["reference_image"] = str(reference_image_path)

        # Add the prompt
        content_parts.append(full_prompt)

        # Generate with Gemini
        print(f"  Generating with Gemini...")
        response = model.generate_content(
            content_parts,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 8192,
            }
        )

        # Check if response contains an image
        if response.parts:
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    # Save the generated image
                    image_data = part.inline_data.data
                    output_path = GENERATED_DIR / f"{card_id}_generated.png"

                    with open(output_path, "wb") as f:
                        f.write(base64.b64decode(image_data))

                    result["generated_path"] = str(output_path)
                    result["success"] = True
                    print(f"  SUCCESS: Saved to {output_path}")
                    return result

        # If no image in response, check for text response
        if response.text:
            result["response_text"] = response.text[:500]
            result["success"] = False
            result["error"] = "No image generated, got text response"
            print(f"  WARNING: Got text response instead of image")

    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        print(f"  ERROR: {e}")

    return result


def generate_batch(card_ids, cards_dict, prompts_dict, dry_run=False):
    """
    Generate images for a batch of cards.

    Args:
        card_ids: List of card IDs to generate
        cards_dict: Dict of card_id -> card_data
        prompts_dict: Dict of card_id -> prompt
        dry_run: If True, just show prompts

    Returns:
        list: Generation results for each card
    """
    results = []

    if not dry_run:
        try:
            model = setup_gemini()
        except Exception as e:
            print(f"ERROR setting up Gemini: {e}")
            return [{"error": str(e)}]
    else:
        model = None

    for i, card_id in enumerate(card_ids):
        print(f"\n{'='*50}")
        print(f"[{i+1}/{len(card_ids)}] {card_id}")
        print(f"{'='*50}")

        card_data = cards_dict.get(card_id)
        if not card_data:
            print(f"  SKIP: Card data not found")
            results.append({"card_id": card_id, "error": "Card data not found"})
            continue

        prompt = prompts_dict.get(card_id)
        if not prompt:
            print(f"  SKIP: No prompt found")
            results.append({"card_id": card_id, "error": "No prompt found"})
            continue

        # Get reference image
        ref_image = get_processed_image_path(card_id)
        if ref_image:
            print(f"  Reference image: {ref_image.name}")
        else:
            print(f"  WARNING: No reference image found")

        result = generate_image_with_gemini(
            model, card_id, card_data, prompt,
            reference_image_path=ref_image,
            dry_run=dry_run
        )
        results.append(result)

    return results


def main():
    parser = argparse.ArgumentParser(description="Generate card images with Gemini")
    parser.add_argument("--test", action="store_true", help="Generate for test batch")
    parser.add_argument("--single", type=str, help="Generate single card by ID")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without generating")
    parser.add_argument("--list-prompts", action="store_true", help="List all available prompts")
    args = parser.parse_args()

    # Load data
    cards_dict = load_cards()
    prompts_dict = load_gemini_prompts()

    print(f"Loaded {len(cards_dict)} cards")
    print(f"Loaded {len(prompts_dict)} prompts")

    if args.list_prompts:
        print("\nAvailable prompts:")
        for card_id in prompts_dict:
            card = cards_dict.get(card_id, {})
            print(f"  - {card_id}: {card.get('name', 'Unknown')}")
        return

    # Determine which cards to generate
    if args.single:
        card_ids = [args.single]
        print(f"Generating single card: {args.single}")
    elif args.test:
        card_ids = load_test_batch_ids()
        # Filter to only those with prompts
        card_ids = [cid for cid in card_ids if cid in prompts_dict]
        print(f"Generating TEST BATCH: {len(card_ids)} cards")
    else:
        print("Usage:")
        print("  python gemini_generate.py --test          # Generate test batch")
        print("  python gemini_generate.py --single <id>   # Generate single card")
        print("  python gemini_generate.py --dry-run       # Show prompts only")
        print("  python gemini_generate.py --list-prompts  # List available prompts")
        return

    # Generate
    results = generate_batch(card_ids, cards_dict, prompts_dict, dry_run=args.dry_run)

    # Summary
    if not args.dry_run:
        successful = [r for r in results if r.get("success")]
        failed = [r for r in results if not r.get("success") and "error" in r]

        print(f"\n{'='*50}")
        print(f"GENERATION COMPLETE")
        print(f"{'='*50}")
        print(f"Successful: {len(successful)}/{len(results)}")
        print(f"Failed: {len(failed)}/{len(results)}")

        # Save results
        results_file = DATA_DIR / "generation_results.json"
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
