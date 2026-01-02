#!/usr/bin/env python3
"""
Generate Stable Diffusion prompts for all cards in cards.json.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

def build_prompt(card):
    """Build a SD-optimized prompt for a card."""
    name = card['name']
    visual = card.get('visual_description', '')
    elements = card.get('elements', [])
    tier = card.get('tier', 'common')

    # Base prompt
    prompt = f"Generate a dramatic fantasy creature portrait of {name}. {visual}"

    return prompt

def main():
    # Load cards
    with open(DATA_DIR / "cards.json", 'r') as f:
        cards = json.load(f)

    # Generate prompts
    prompts = []
    for card in cards:
        prompt = build_prompt(card)
        prompts.append({
            "card_id": card['id'],
            "card_name": card['name'],
            "prompt": prompt
        })

    # Save
    output = DATA_DIR / "gemini_prompts.json"
    with open(output, 'w') as f:
        json.dump(prompts, f, indent=2)

    print(f"Generated {len(prompts)} prompts")
    print(f"Saved to: {output}")

if __name__ == '__main__':
    main()
