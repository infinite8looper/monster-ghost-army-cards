#!/usr/bin/env python3
"""
Generate element icons for Monster Ghost Army Cards.

Creates iconic fantasy realism images for each element type.
Designed to work well as small masked icons.
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

# Iconic element images - clear central subjects for small icon use
ELEMENTS = {
    "air": {
        "prompt": "dramatic wind gusts and swirling clouds against bright blue sky, wispy cloud formations being blown by powerful wind, centered composition, fantasy realism, high drama, epic lighting, digital art",
        "negative": "complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "water": {
        "prompt": "single perfect water droplet floating in glowing magical force field, suspended in air, centered composition, crystalline clarity, fantasy realism, high drama, epic lighting, digital art",
        "negative": "ocean, waves, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "fire": {
        "prompt": "single dancing flame floating in glowing magical force field, suspended fire, centered composition, orange and yellow flames, fantasy realism, high drama, epic lighting, digital art",
        "negative": "campfire, bonfire, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "earth": {
        "prompt": "single rough stone rock floating in glowing magical force field, levitating boulder, centered composition, brown and gray stone, fantasy realism, high drama, epic lighting, digital art",
        "negative": "mountain, landscape, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "plant": {
        "prompt": "single vibrant green leaf in foreground against soft grass meadow backdrop, nature icon, centered composition, fantasy realism, high drama, golden hour lighting, digital art",
        "negative": "forest, trees, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "mecha": {
        "prompt": "single metallic gear with electricity crackling around it, circuit board and lightning in background, technology icon, centered composition, chrome metal, fantasy realism, high drama, electric blue sparks, digital art",
        "negative": "robot, machine, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "magic": {
        "prompt": "glowing magic wand with purple magical energy flowing from tip, swirling colorful magical aura backdrop, arcane power, centered composition, fantasy realism, high drama, mystical lighting, digital art",
        "negative": "wizard, person, complex scene, busy, cluttered, text, watermark, blurry, low quality"
    },
    "universe": {
        "prompt": "glowing cosmic torus donut shape floating above the shell of a giant turtle, turtles all the way down concept, torus centered in view, turtle back visible at bottom, space and stars, fantasy realism, high drama, cosmic lighting, digital art",
        "negative": "planet, galaxy, complex scene, busy, cluttered, text, watermark, blurry, low quality"
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
    print(f"\nGenerating: {element_name}")

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
    print("Element Icon Generator (Iconic Style)")
    print("=" * 50)
    print(f"Output: {ELEMENTS_DIR}")
    print("Style: Iconic fantasy realism for small icon use")

    device = get_device()
    pipe = setup_pipeline(device)

    for element_name, element_data in ELEMENTS.items():
        try:
            generate_element_image(pipe, element_name, element_data)
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "=" * 50)
    print("COMPLETE")
    print("=" * 50)


if __name__ == "__main__":
    main()
