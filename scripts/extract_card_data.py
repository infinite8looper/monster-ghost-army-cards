#!/usr/bin/env python3
"""
Extract Card Data from Original Hand-Drawn Images

Uses Google Gemini Vision to read card names, attacks, defenses, and abilities
directly from the photographed hand-drawn cards.

Usage:
    python scripts/extract_card_data.py --all       # Process all images
    python scripts/extract_card_data.py --single <filename>  # Process one
    python scripts/extract_card_data.py --list      # List all image files
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime
import time

try:
    import google.generativeai as genai
    from PIL import Image
    HAS_DEPS = True
except ImportError as e:
    HAS_DEPS = False
    IMPORT_ERROR = str(e)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
IMAGES_DIR = PROJECT_ROOT / "images" / "orig"
DATA_DIR = PROJECT_ROOT / "data"

# Output file
OUTPUT_FILE = DATA_DIR / "extracted_cards.json"


def setup_gemini():
    """Initialize Gemini API"""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable not set")

    genai.configure(api_key=api_key)
    # Use Gemini 2.0 Flash for vision tasks
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    return model


def get_all_image_files():
    """Get all original card image files"""
    files = []
    for f in sorted(IMAGES_DIR.iterdir()):
        if f.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            files.append(f)
    return files


EXTRACTION_PROMPT = """Analyze this hand-drawn game card image carefully.

This is a photographed hand-drawn trading card. Read ALL text on the card exactly as written.

Extract and return a JSON object with these fields:
{
    "card_name": "The name of the card (exactly as written at the top)",
    "visual_description": "Brief description of the creature drawn on the card",
    "attacks": [
        {"name": "Attack name", "description": "Attack description if any"}
    ],
    "defenses": [
        {"name": "Defense name", "description": "Defense description if any"}
    ],
    "special_abilities": ["Any special abilities listed"],
    "element_hints": ["Any elements suggested by the card (fire, water, air, earth, plant, mecha, magic, universe)"],
    "raw_text": "All text visible on the card, exactly as written"
}

IMPORTANT:
- Read the handwritten text EXACTLY as it appears (including misspellings, creative names)
- Include ALL attacks and defenses listed on the card
- If text is hard to read, provide your best interpretation
- The card name is usually at the top in larger letters
- Attacks are often labeled or listed with damage/effects
- Defenses/abilities may be listed separately

Return ONLY the JSON object, no other text."""


def extract_card_data(model, image_path, retry_count=3):
    """
    Extract card data from a single image using Gemini Vision.

    Args:
        model: Gemini model instance
        image_path: Path to the card image
        retry_count: Number of retries on failure

    Returns:
        dict: Extracted card data
    """
    result = {
        "image_file": image_path.name,
        "timestamp": datetime.now().isoformat(),
    }

    for attempt in range(retry_count):
        try:
            # Load the image
            img = Image.open(image_path)

            # Send to Gemini
            response = model.generate_content(
                [img, EXTRACTION_PROMPT],
                generation_config={
                    "temperature": 0.1,  # Low temp for accurate extraction
                    "max_output_tokens": 2048,
                }
            )

            # Parse the response
            response_text = response.text.strip()

            # Try to extract JSON from the response
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            try:
                card_data = json.loads(response_text)
                result.update(card_data)
                result["success"] = True
                result["raw_response"] = response_text
                return result
            except json.JSONDecodeError:
                # Store raw response if JSON parsing fails
                result["raw_response"] = response_text
                result["parse_error"] = "Could not parse JSON from response"
                if attempt < retry_count - 1:
                    print(f"    Retry {attempt + 1}: JSON parse failed")
                    time.sleep(1)
                    continue

        except Exception as e:
            result["error"] = str(e)
            if attempt < retry_count - 1:
                print(f"    Retry {attempt + 1}: {e}")
                time.sleep(2)
                continue

    result["success"] = False
    return result


def process_all_images(model, image_files, skip_existing=True):
    """
    Process all image files and extract card data.

    Args:
        model: Gemini model instance
        image_files: List of image file paths
        skip_existing: Skip images already in output file

    Returns:
        list: All extracted card data
    """
    # Load existing data if any
    existing_data = {}
    if skip_existing and OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r") as f:
            existing = json.load(f)
            existing_data = {c["image_file"]: c for c in existing if c.get("success")}
        print(f"Loaded {len(existing_data)} existing extractions")

    results = list(existing_data.values())

    for i, image_path in enumerate(image_files):
        print(f"\n[{i+1}/{len(image_files)}] {image_path.name}")

        # Skip if already processed successfully
        if image_path.name in existing_data:
            print("  SKIP: Already processed")
            continue

        result = extract_card_data(model, image_path)

        if result.get("success"):
            card_name = result.get("card_name", "Unknown")
            print(f"  SUCCESS: {card_name}")
            if result.get("attacks"):
                print(f"    Attacks: {[a['name'] for a in result['attacks']]}")
        else:
            print(f"  FAILED: {result.get('error', result.get('parse_error', 'Unknown error'))}")

        results.append(result)

        # Save progress after each image
        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2, default=str)

        # Rate limiting - be nice to the API
        time.sleep(0.5)

    return results


def main():
    parser = argparse.ArgumentParser(description="Extract card data from original images")
    parser.add_argument("--all", action="store_true", help="Process all images")
    parser.add_argument("--single", type=str, help="Process single image by filename")
    parser.add_argument("--list", action="store_true", help="List all image files")
    parser.add_argument("--no-skip", action="store_true", help="Don't skip already processed images")
    args = parser.parse_args()

    if not HAS_DEPS:
        print("ERROR: Required packages not installed.")
        print(f"Import error: {IMPORT_ERROR}")
        print("\nInstall with:")
        print("  pip install google-generativeai Pillow")
        return

    image_files = get_all_image_files()
    print(f"Found {len(image_files)} original card images")

    if args.list:
        print("\nImage files:")
        for f in image_files:
            print(f"  - {f.name}")
        return

    if args.single:
        # Find the specified file
        target = None
        for f in image_files:
            if args.single in f.name:
                target = f
                break
        if not target:
            print(f"ERROR: Image file containing '{args.single}' not found")
            return
        image_files = [target]
    elif not args.all:
        print("\nUsage:")
        print("  python extract_card_data.py --all           # Process all images")
        print("  python extract_card_data.py --single <name> # Process one image")
        print("  python extract_card_data.py --list          # List all images")
        print("  python extract_card_data.py --no-skip       # Reprocess all")
        return

    # Setup and process
    model = setup_gemini()
    results = process_all_images(model, image_files, skip_existing=not args.no_skip)

    # Summary
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]

    print(f"\n{'='*50}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*50}")
    print(f"Successful: {len(successful)}/{len(results)}")
    print(f"Failed: {len(failed)}/{len(results)}")
    print(f"\nResults saved to: {OUTPUT_FILE}")

    if failed:
        print(f"\nFailed images:")
        for r in failed:
            print(f"  - {r['image_file']}: {r.get('error', r.get('parse_error', 'Unknown'))}")


if __name__ == "__main__":
    main()
