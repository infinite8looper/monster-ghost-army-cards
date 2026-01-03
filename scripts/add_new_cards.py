#!/usr/bin/env python3
"""
Add new cards to Monster Ghost Army Cards.
"""

import json
import subprocess
import os

NEW_CARDS = [
    {
        "id": "geode_splitter",
        "name": "Geode Splitter",
        "elements": ["earth", "mecha"],
        "tier": "strong",
        "visual_description": "A crystalline rock golem with glowing purple geode formations cracking open to reveal inner light, mechanical drill arms",
        "attacks": [
            {"name": "Crystal Shatter", "description": "Explosive crystal fragments"},
            {"name": "Drill Strike", "description": "Piercing mechanical drill attack"},
            {"name": "Geode Burst", "description": "Inner crystal explosion"}
        ],
        "defenses": [
            {"name": "Stone Shell", "description": "Hardens outer rock layer"}
        ],
        "special_abilities": [],
        "biography": "Born from the collision of ancient mining machines and primordial crystal caverns, the Geode Splitter reveals treasures—and devastation—within.",
        "hp": 75,
        "attack_power": 20,
        "defense_power": 12
    },
    {
        "id": "universe_3_combined_infinite",
        "name": "Universe 3 Combined Infinite",
        "elements": ["universe", "magic"],
        "tier": "legendary",
        "visual_description": "Three cosmic entities merged into one - swirling galaxies, nebulae, and infinite starfields forming a transcendent being of pure cosmic energy",
        "attacks": [
            {"name": "Infinite Collapse", "description": "Reality-bending cosmic implosion"},
            {"name": "Stellar Nova", "description": "Explosive star birth"},
            {"name": "Void Rip", "description": "Tears hole in space-time"},
            {"name": "Cosmic Ray", "description": "Concentrated universe energy beam"}
        ],
        "defenses": [
            {"name": "Event Horizon", "description": "Nothing escapes"},
            {"name": "Dimension Shift", "description": "Phases between realities"}
        ],
        "special_abilities": ["Summon Ghost Army"],
        "biography": "When three universe fragments aligned at the edge of infinity, they merged into a being whose power echoes across all dimensions simultaneously.",
        "hp": 100,
        "attack_power": 28,
        "defense_power": 18
    },
    {
        "id": "fire_spike",
        "name": "Fire Spike",
        "elements": ["fire", "earth"],
        "tier": "common",
        "visual_description": "A jagged volcanic spike creature made of obsidian and flowing lava, with flame-tipped protrusions",
        "attacks": [
            {"name": "Lava Spike", "description": "Molten rock projectile"},
            {"name": "Flame Thrust", "description": "Fiery piercing attack"},
            {"name": "Eruption", "description": "Volcanic explosion"}
        ],
        "defenses": [
            {"name": "Obsidian Armor", "description": "Volcanic glass protection"}
        ],
        "special_abilities": [],
        "biography": "Forged in volcanic vents where fire meets stone, Fire Spike's very existence is an eruption waiting to happen.",
        "hp": 60,
        "attack_power": 15,
        "defense_power": 8
    },
    {
        "id": "face_thwapper",
        "name": "Face Thwapper",
        "elements": ["air", "magic"],
        "tier": "common",
        "visual_description": "A comical floating hand-shaped creature with googly eyes, capable of delivering surprisingly powerful slaps from any direction",
        "attacks": [
            {"name": "Mega Slap", "description": "Devastating face-targeting slap"},
            {"name": "Wind-Up Thwap", "description": "Charged spinning slap"},
            {"name": "Multi-Thwap", "description": "Rapid-fire slap barrage"}
        ],
        "defenses": [
            {"name": "Dodge Float", "description": "Floats away from attacks"}
        ],
        "special_abilities": [],
        "biography": "Legend says the Face Thwapper was born from the collective frustration of a thousand wizards. Its slaps carry the weight of infinite annoyance.",
        "hp": 55,
        "attack_power": 14,
        "defense_power": 6
    }
]

def generate_image(card):
    """Generate an image for a card using the SD generation script."""
    prompt = f"fantasy monster card art, {card['visual_description']}, vibrant colors, detailed, game card illustration style, dark fantasy background"

    # Use the existing SD generation approach
    output_path = f"assets/images/generated/{card['id']}_generated.png"

    if os.path.exists(output_path):
        print(f"  Image already exists: {output_path}")
        return True

    try:
        # Call the SD generation script
        result = subprocess.run(
            ["python3", "scripts/sd_generate.py", "--prompt", prompt, "--output", output_path],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            print(f"  Generated: {output_path}")
            return True
        else:
            print(f"  Failed: {result.stderr[:100]}")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    # Load existing cards
    with open("data/cards.json", "r") as f:
        cards = json.load(f)

    existing_ids = {c["id"] for c in cards}

    print(f"Current card count: {len(cards)}")
    print(f"Adding {len(NEW_CARDS)} new cards...\n")

    added = 0
    for card in NEW_CARDS:
        if card["id"] in existing_ids:
            print(f"[SKIP] {card['name']} already exists")
            continue

        print(f"[ADD] {card['name']}")

        # Generate image
        # generate_image(card)  # Uncomment when SD is set up

        # Add to cards list
        cards.append(card)
        added += 1
        print(f"  Added card data")

    # Save updated cards
    with open("data/cards.json", "w") as f:
        json.dump(cards, f, indent=2)

    print(f"\nDone! Added {added} cards. New total: {len(cards)}")

if __name__ == "__main__":
    main()
