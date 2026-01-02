#!/usr/bin/env python3
"""
Stable Diffusion Image Generation for Monster Ghost Army Cards

Uses Hugging Face's diffusers library to generate fantasy-style card images
from preprocessed card artwork using img2img pipeline.

Usage:
    python scripts/sd_generate.py --test     # Generate for test batch
    python scripts/sd_generate.py --single <card_id>  # Generate single card
    python scripts/sd_generate.py --dry-run  # Show setup without generating

Requirements:
    pip install diffusers transformers accelerate torch
"""

import os
import json
import argparse
from pathlib import Path
from datetime import datetime

try:
    import torch
    from diffusers import StableDiffusionImg2ImgPipeline, StableDiffusionPipeline
    from PIL import Image
    HAS_DIFFUSERS = True
except ImportError as e:
    HAS_DIFFUSERS = False
    IMPORT_ERROR = str(e)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ASSETS_DIR = PROJECT_ROOT / "assets" / "images"
CROPPED_DIR = ASSETS_DIR / "cropped"
GENERATED_DIR = ASSETS_DIR / "generated"

# Ensure directories exist
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# Model configuration
MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"
# Alternative models to try:
# MODEL_ID = "runwayml/stable-diffusion-v1-5"
# MODEL_ID = "stabilityai/stable-diffusion-2-1"


def get_device():
    """Get the best available device for inference."""
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"  # Apple Silicon
    else:
        return "cpu"


def load_cards():
    """Load card data from cards.json"""
    with open(DATA_DIR / "cards.json", "r") as f:
        cards = json.load(f)
        return {card["id"]: card for card in cards}


def load_gemini_prompts():
    """Load pre-generated prompts (reusing from gemini prompts)"""
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


def get_cropped_image_path(card_id):
    """Get path to cropped image for a card"""
    cropped_path = CROPPED_DIR / f"{card_id}_cropped.png"
    if cropped_path.exists():
        return cropped_path
    return None


def build_sd_prompt(card_data, base_prompt):
    """
    Build a Stable Diffusion optimized prompt.

    SD prompts work best when concise and keyword-focused.
    Creates DRAMATIC FANTASY card art, full-frame composition.
    """
    name = card_data["name"]
    visual_desc = card_data.get("visual_description", "")
    elements = card_data.get("elements", [])
    tier = card_data.get("tier", "common")
    biography = card_data.get("biography", "")

    # Epic fantasy style keywords - FULL BLEED, edge to edge, character only
    style_words = "epic fantasy creature portrait, dramatic lighting, magical aura, highly detailed, digital painting, artstation, concept art, sharp focus, full bleed edge to edge, character fills entire frame, no margins, zoomed in close up"

    if tier == "legendary":
        style_words += ", legendary creature, golden divine light, god-like power, mythical, awe-inspiring"
    elif tier == "weak":
        style_words += ", cute but fierce, underdog energy"
    else:
        style_words += ", powerful warrior creature, battle-ready"

    # Element-specific dramatic effects
    element_effects = {
        "fire": "wreathed in dramatic flames, fiery explosion background, molten lava",
        "water": "surrounded by swirling water, ocean waves, ice crystals",
        "earth": "emerging from cracked earth, rocky armor, mountain backdrop",
        "air": "floating in storm clouds, lightning crackling, tornado winds",
        "plant": "overgrown with mystical vines, glowing forest, nature magic",
        "mecha": "gleaming chrome armor, steam and gears, cybernetic enhancements",
        "magic": "arcane symbols, purple energy, mystical runes floating",
        "universe": "cosmic nebula background, stars and galaxies, void energy"
    }

    element_desc = ", ".join([element_effects.get(e, e) for e in elements])

    # Build the prompt - focus on the CHARACTER concept, not the drawing style
    prompt = f"epic fantasy creature portrait of {name}, {visual_desc}, {element_desc}, {style_words}"

    # Strong negative prompt - NO cards, NO text, NO borders, creature only
    negative_prompt = "trading card, card frame, card border, card game, playing card, text, title, name, label, watermark, signature, logo, words, letters, numbers, realistic photo, amateur, childish drawing, sketch, doodle, hand-drawn, crayon, simple, flat colors, white background, border, frame, margins, empty space, cropped"

    return prompt, negative_prompt


def setup_pipeline(device, mode="img2img"):
    """Initialize the Stable Diffusion pipeline."""
    print(f"Loading Stable Diffusion model: {MODEL_ID}")
    print(f"Device: {device}, Mode: {mode}")

    PipelineClass = StableDiffusionPipeline if mode == "txt2img" else StableDiffusionImg2ImgPipeline

    # Load pipeline with appropriate dtype for device
    if device == "mps":
        # Apple Silicon - use float32 for stability
        pipe = PipelineClass.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float32,
            safety_checker=None,  # Disable for speed (kid-friendly content anyway)
        )
    elif device == "cuda":
        pipe = PipelineClass.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16,
            safety_checker=None,
        )
    else:
        pipe = PipelineClass.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float32,
            safety_checker=None,
        )

    pipe = pipe.to(device)

    # Enable memory efficient attention if available
    if hasattr(pipe, 'enable_attention_slicing'):
        pipe.enable_attention_slicing()

    print("Pipeline loaded successfully!")
    return pipe


def generate_image(pipe, card_id, card_data, prompt_data, reference_image_path,
                   strength=0.65, guidance_scale=7.5, num_inference_steps=50, mode="img2img"):
    """
    Generate a fantasy image using img2img or txt2img.

    Args:
        pipe: Stable Diffusion Pipeline
        card_id: Card identifier
        card_data: Full card data dictionary
        prompt_data: Pre-generated base prompt
        reference_image_path: Path to cropped reference image (ignored for txt2img)
        strength: How much to transform (0=keep original, 1=full generation) - img2img only
        guidance_scale: How closely to follow the prompt
        num_inference_steps: Number of denoising steps
        mode: "img2img" or "txt2img"

    Returns:
        dict: Generation results
    """
    result = {
        "card_id": card_id,
        "card_name": card_data["name"],
        "timestamp": datetime.now().isoformat(),
        "mode": mode,
    }

    try:
        # Build prompt
        prompt, negative_prompt = build_sd_prompt(card_data, prompt_data)
        result["prompt"] = prompt
        result["negative_prompt"] = negative_prompt

        if mode == "txt2img":
            print(f"  Generating pure text-to-image...")
            # Pure text-to-image - dramatic fantasy art from description
            output = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
                height=512,
                width=512,
            )
        else:
            # img2img mode
            result["reference_image"] = str(reference_image_path)

            # Load and prepare input image
            init_image = Image.open(reference_image_path).convert("RGB")

            # Resize to 512x512 for SD (preserving aspect ratio with padding)
            target_size = 512
            init_image.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)

            # Create square canvas
            new_image = Image.new("RGB", (target_size, target_size), (255, 255, 255))
            paste_x = (target_size - init_image.width) // 2
            paste_y = (target_size - init_image.height) // 2
            new_image.paste(init_image, (paste_x, paste_y))
            init_image = new_image

            print(f"  Generating with strength={strength}...")

            output = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=init_image,
                strength=strength,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
            )

        generated_image = output.images[0]

        # Save the generated image
        output_path = GENERATED_DIR / f"{card_id}_generated.png"
        generated_image.save(output_path)

        result["generated_path"] = str(output_path)
        result["success"] = True
        print(f"  SUCCESS: Saved to {output_path}")

    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        print(f"  ERROR: {e}")

    return result


def generate_batch(card_ids, cards_dict, prompts_dict, dry_run=False,
                   strength=0.65, guidance_scale=7.5, mode="img2img"):
    """
    Generate images for a batch of cards.
    """
    results = []

    if dry_run:
        print("\n=== DRY RUN MODE ===")
        print(f"Would process {len(card_ids)} cards")
        print(f"Device: {get_device()}")
        print(f"Model: {MODEL_ID}")
        print(f"Mode: {mode}")
        print(f"Strength: {strength}, Guidance: {guidance_scale}")

        for card_id in card_ids:
            card_data = cards_dict.get(card_id, {})
            prompt_data = prompts_dict.get(card_id, "")
            ref_image = get_cropped_image_path(card_id)

            prompt, neg = build_sd_prompt(card_data, prompt_data)
            print(f"\n--- {card_data.get('name', card_id)} ---")
            print(f"Prompt: {prompt[:100]}...")
            print(f"Reference: {ref_image}")

        return results

    # Set up pipeline
    device = get_device()
    pipe = setup_pipeline(device, mode=mode)

    for i, card_id in enumerate(card_ids):
        print(f"\n{'='*50}")
        print(f"[{i+1}/{len(card_ids)}] {card_id}")
        print(f"{'='*50}")

        card_data = cards_dict.get(card_id)
        if not card_data:
            print(f"  SKIP: Card data not found")
            results.append({"card_id": card_id, "error": "Card data not found"})
            continue

        prompt_data = prompts_dict.get(card_id, "")

        ref_image = get_cropped_image_path(card_id)
        if mode == "img2img" and not ref_image:
            print(f"  SKIP: No cropped image found (required for img2img)")
            results.append({"card_id": card_id, "error": "No cropped image"})
            continue

        if ref_image:
            print(f"  Reference: {ref_image.name}")
        else:
            print(f"  Mode: txt2img (no reference image)")

        result = generate_image(
            pipe, card_id, card_data, prompt_data, ref_image,
            strength=strength, guidance_scale=guidance_scale, mode=mode
        )
        results.append(result)

    return results


def get_existing_generated_ids():
    """Get IDs of cards that already have generated images."""
    existing = set()
    if GENERATED_DIR.exists():
        for f in GENERATED_DIR.iterdir():
            if f.suffix == '.png' and f.name.endswith('_generated.png'):
                card_id = f.name.replace('_generated.png', '')
                existing.add(card_id)
    return existing


def get_regen_card_ids():
    """Get IDs of cards in the regen folder that need regeneration."""
    regen_dir = GENERATED_DIR / "regen"
    regen_ids = []
    if regen_dir.exists():
        for f in regen_dir.iterdir():
            if f.suffix == '.png' and f.name.endswith('_generated.png'):
                card_id = f.name.replace('_generated.png', '')
                regen_ids.append(card_id)
    return regen_ids


def main():
    parser = argparse.ArgumentParser(description="Generate card images with Stable Diffusion")
    parser.add_argument("--test", action="store_true", help="Generate for test batch")
    parser.add_argument("--all", action="store_true", help="Generate all remaining cards")
    parser.add_argument("--regen", action="store_true", help="Regenerate cards in the regen folder")
    parser.add_argument("--single", type=str, help="Generate single card by ID")
    parser.add_argument("--dry-run", action="store_true", help="Show setup without generating")
    parser.add_argument("--strength", type=float, default=0.65,
                        help="Transform strength 0-1 (default: 0.65)")
    parser.add_argument("--guidance", type=float, default=7.5,
                        help="Guidance scale (default: 7.5)")
    parser.add_argument("--txt2img", action="store_true",
                        help="Use text-to-image (no reference image) for dramatic fantasy style")
    args = parser.parse_args()

    if not HAS_DIFFUSERS:
        print("ERROR: Required packages not installed.")
        print(f"Import error: {IMPORT_ERROR}")
        print("\nInstall with:")
        print("  pip install diffusers transformers accelerate torch")
        return

    # Load data
    cards_dict = load_cards()
    prompts_dict = load_gemini_prompts()

    print(f"Loaded {len(cards_dict)} cards")
    print(f"Loaded {len(prompts_dict)} prompts")

    # Determine which cards to generate
    if args.single:
        card_ids = [args.single]
        print(f"Generating single card: {args.single}")
    elif args.regen:
        card_ids = get_regen_card_ids()
        if not card_ids:
            print("No cards in regen folder. Move images to assets/images/generated/regen/ to regenerate them.")
            return
        print(f"Regenerating {len(card_ids)} cards from regen folder")
    elif args.all:
        existing = get_existing_generated_ids()
        card_ids = [cid for cid in cards_dict.keys() if cid not in existing]
        print(f"Generating ALL REMAINING: {len(card_ids)} cards (skipping {len(existing)} existing)")
    elif args.test:
        card_ids = load_test_batch_ids()
        # Filter to only those with cropped images for img2img mode
        if not args.txt2img:
            card_ids = [cid for cid in card_ids if get_cropped_image_path(cid)]
        print(f"Generating TEST BATCH: {len(card_ids)} cards")
    else:
        print("Usage:")
        print("  python sd_generate.py --all --txt2img     # Generate ALL remaining cards")
        print("  python sd_generate.py --regen --txt2img   # Regenerate cards in regen folder")
        print("  python sd_generate.py --test --txt2img    # Generate test batch only")
        print("  python sd_generate.py --single <id>       # Generate single card")
        print("  python sd_generate.py --dry-run --all     # Preview without generating")
        print("\nRegen workflow:")
        print("  1. Move bad images to: assets/images/generated/regen/")
        print("  2. Run: python sd_generate.py --regen --txt2img")
        print("\nOptions:")
        print("  --txt2img          # Pure text-to-image for dramatic fantasy style")
        print("  --strength 0.65    # How much to transform (img2img only)")
        print("  --guidance 7.5     # Prompt adherence (higher=stricter)")
        return

    # Determine mode
    mode = "txt2img" if args.txt2img else "img2img"

    # Generate
    results = generate_batch(
        card_ids, cards_dict, prompts_dict,
        dry_run=args.dry_run,
        strength=args.strength,
        guidance_scale=args.guidance,
        mode=mode
    )

    # Summary
    if not args.dry_run and results:
        successful = [r for r in results if r.get("success")]
        failed = [r for r in results if not r.get("success") and "error" in r]

        print(f"\n{'='*50}")
        print(f"GENERATION COMPLETE")
        print(f"{'='*50}")
        print(f"Successful: {len(successful)}/{len(results)}")
        print(f"Failed: {len(failed)}/{len(results)}")

        # Save results
        results_file = DATA_DIR / "sd_generation_results.json"
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
