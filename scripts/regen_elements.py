#!/usr/bin/env python3
"""
Regenerate specific element icons that need improvement.
"""

import os
from pathlib import Path

try:
    import torch
    from diffusers import StableDiffusionPipeline
    from PIL import Image
    HAS_DEPS = True
except ImportError as e:
    HAS_DEPS = False
    IMPORT_ERROR = str(e)

PROJECT_ROOT = Path(__file__).parent.parent
ELEMENTS_DIR = PROJECT_ROOT / "assets" / "images" / "elements"
ELEMENTS_DIR.mkdir(parents=True, exist_ok=True)

# Improved prompts for problematic elements
ELEMENTS_TO_REGEN = {
    "water": {
        "prompt": "single large crystalline water droplet, teardrop shape, floating and suspended in midair, glowing blue magical energy surrounding it, highly detailed water reflections and refractions inside droplet, centered composition, dark background with soft blue glow, fantasy realism, photorealistic water, epic lighting, digital art, 4k",
        "negative": "ocean, waves, river, splash, multiple droplets, rain, text, complex scene, busy, cluttered, watermark, blurry, low quality"
    },
    "fire": {
        "prompt": "single bright orange and yellow flame, dancing fire flame floating in midair, warm glowing light, centered composition, dark background with orange glow, highly detailed realistic fire, fantasy realism, photorealistic flame, epic dramatic lighting, digital art, 4k",
        "negative": "campfire, torch, candle, bonfire, fireplace, text, complex scene, busy, cluttered, watermark, blurry, low quality, multiple flames"
    },
    "magic": {
        "prompt": "elegant wooden magic wand with glowing purple crystal tip, sparkling magical energy and particles flowing from the wand tip, swirling purple and blue magical aura, centered composition, dark mystical background, fantasy realism, highly detailed, epic dramatic lighting, digital art, 4k",
        "negative": "wizard, person, hand, text, words, letters, writing, complex scene, busy, cluttered, watermark, blurry, low quality, staff"
    }
}

MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"


def get_device():
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def setup_pipeline(device):
    print(f"Loading model: {MODEL_ID}")
    print(f"Device: {device}")

    if device == "mps":
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_ID, torch_dtype=torch.float32, safety_checker=None,
        )
    else:
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            safety_checker=None,
        )

    pipe = pipe.to(device)
    if hasattr(pipe, 'enable_attention_slicing'):
        pipe.enable_attention_slicing()

    print("Pipeline ready!")
    return pipe


def generate_element_image(pipe, element_name, element_data):
    print(f"\nRegenerating: {element_name}")
    print(f"  Prompt: {element_data['prompt'][:80]}...")

    output = pipe(
        prompt=element_data["prompt"],
        negative_prompt=element_data["negative"],
        guidance_scale=7.5,
        num_inference_steps=50,
        height=512,
        width=512,
    )

    image = output.images[0]
    output_path = ELEMENTS_DIR / f"{element_name}.png"
    image.save(output_path)
    print(f"  Saved: {output_path}")
    return output_path


def main():
    if not HAS_DEPS:
        print(f"Missing dependencies: {IMPORT_ERROR}")
        return

    print("=" * 50)
    print("Element Icon Regeneration")
    print("=" * 50)
    print(f"Output: {ELEMENTS_DIR}")
    print(f"Regenerating: {', '.join(ELEMENTS_TO_REGEN.keys())}")

    device = get_device()
    pipe = setup_pipeline(device)

    for element_name, element_data in ELEMENTS_TO_REGEN.items():
        try:
            generate_element_image(pipe, element_name, element_data)
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "=" * 50)
    print("REGENERATION COMPLETE")
    print("=" * 50)


if __name__ == "__main__":
    main()
