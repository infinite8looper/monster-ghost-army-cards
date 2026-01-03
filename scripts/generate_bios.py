#!/usr/bin/env python3
"""
Generate fantasy biographies for Monster Ghost Army Cards using Gemini.
"""

import json
import subprocess
import sys
import re

def generate_bio_prompt(card):
    """Create a prompt for generating a fantasy bio."""
    elements = ", ".join(card.get("elements", ["unknown"]))
    attacks = ", ".join([a["name"] for a in card.get("attacks", [])])
    tier = card.get("tier", "common")

    return f"""Generate a short, evocative fantasy biography (2-3 sentences max) for a monster card game creature.

Card Name: {card["name"]}
Elements: {elements}
Tier: {tier}
Attacks: {attacks}

Requirements:
- Write in third person, mysterious/epic tone
- Reference the creature's elemental powers
- Include a hint of their origin or legend
- Keep it under 50 words
- Do NOT describe physical appearance
- Make it sound like flavor text from Magic: The Gathering or Pokemon cards

Output ONLY the biography text, nothing else."""

def main():
    # Load cards
    with open("data/cards.json", "r") as f:
        cards = json.load(f)

    print(f"Generating bios for {len(cards)} cards...")

    updated = 0
    for i, card in enumerate(cards):
        # Skip if already has a good bio (not containing visual description keywords)
        current_bio = card.get("biography", "")
        if current_bio and "creature" not in current_bio.lower()[:20]:
            # Probably already has a custom bio
            continue

        prompt = generate_bio_prompt(card)

        try:
            # Call gemini CLI
            result = subprocess.run(
                ["gemini", "-p", prompt],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0 and result.stdout.strip():
                bio = result.stdout.strip()
                # Clean up any quotes or extra formatting
                bio = bio.strip('"\'')
                bio = re.sub(r'^Biography:\s*', '', bio, flags=re.IGNORECASE)
                bio = re.sub(r'^Bio:\s*', '', bio, flags=re.IGNORECASE)

                card["biography"] = bio
                updated += 1
                print(f"[{i+1}/{len(cards)}] {card['name']}: {bio[:60]}...")
            else:
                print(f"[{i+1}/{len(cards)}] {card['name']}: FAILED - {result.stderr[:50]}")

        except subprocess.TimeoutExpired:
            print(f"[{i+1}/{len(cards)}] {card['name']}: TIMEOUT")
        except Exception as e:
            print(f"[{i+1}/{len(cards)}] {card['name']}: ERROR - {e}")

    # Save updated cards
    with open("data/cards.json", "w") as f:
        json.dump(cards, f, indent=2)

    print(f"\nDone! Updated {updated} biographies.")

if __name__ == "__main__":
    main()
