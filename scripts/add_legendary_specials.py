#!/usr/bin/env python3
"""Add special moves to legendary cards that are missing them."""

import json
from pathlib import Path

# Path to cards.json
CARDS_FILE = Path(__file__).parent.parent / "data" / "cards.json"

# Special moves to add to legendary cards (card_id -> special_abilities)
LEGENDARY_SPECIALS = {
    # Spike Wall Series
    "spike_wall": [
        {
            "name": "Spike Shield",
            "description": "Reflects 50% of physical damage back to attacker. Usable once per game.",
            "element": "mecha"
        }
    ],
    "electric_spike_wall": [
        {
            "name": "Chain Lightning", 
            "description": "Lightning arcs to hit an additional enemy card for 50% damage. Usable twice per game.",
            "element": "mecha"
        }
    ],
    "universe_spike_wall": [
        {
            "name": "Cosmic Barrier",
            "description": "Become immune to the next attack regardless of element. Usable once per game.",
            "element": "universe"
        }
    ],
    "water_spike_wall": [
        {
            "name": "Tidal Wave",
            "description": "Hits all enemy cards for 40% of normal attack damage. Usable once per game.",
            "element": "water"
        }
    ],
    "fire_spike_wall": [
        {
            "name": "Flame Aura",
            "description": "Inflicts burn damage equal to 20% of attack each turn for 3 turns. Usable once per game.",
            "element": "fire"
        }
    ],
    "plant_spike_wall": [
        {
            "name": "Regrowth",
            "description": "Heal 25% of max HP. Usable twice per game.",
            "element": "plant"
        }
    ],
    "earth_spike_wall": [
        {
            "name": "Earthquake",
            "description": "Stuns target opponent, causing them to skip their next turn. Usable once per game.",
            "element": "earth"
        }
    ],
    
    # Elemental Trio Series
    "elemental_trio_water_lurker": [
        {
            "name": "Undertow",
            "description": "Reduces target's defense by 50% for their next defense. Usable twice per game.",
            "element": "water"
        }
    ],
    "elemental_trio_earth_shaker": [
        {
            "name": "Tremor",
            "description": "50% chance to stun opponent, making them skip their turn. Usable twice per game.",
            "element": "earth"
        }
    ],
    "elemental_trio_fire_starter": [
        {
            "name": "Ignite",
            "description": "Sets target ablaze, dealing 15% of attack damage for 3 turns. Usable once per game.",
            "element": "fire"
        }
    ],
    
    # Other Legendary Cards
    "galaxy_black_hole": [
        {
            "name": "Gravity Well",
            "description": "Target cannot dodge or teleport for their next 2 turns. Usable once per game.",
            "element": "universe"
        }
    ],
    "innercore_monster": [
        {
            "name": "Core Meltdown",
            "description": "Deal 200% damage but take 25% recoil damage. Usable once per game.",
            "element": "fire"
        }
    ],
    "earthquake": [
        {
            "name": "Aftershock",
            "description": "Your next attack deals 50% bonus damage. Usable twice per game.",
            "element": "earth"
        }
    ],
    "fire_spike": [
        {
            "name": "Ember Storm",
            "description": "Rain fire on all enemies, dealing 30% damage to each. Usable once per game.",
            "element": "fire"
        }
    ],
    "goopy_ghost": [
        {
            "name": "Phase Shift",
            "description": "50% chance to completely avoid the next attack. Usable twice per game.",
            "element": "magic"
        }
    ],
    "key_master": [
        {
            "name": "Unlock Potential",
            "description": "Boost another friendly card's attack by 50% for their next attack. Usable once per game.",
            "element": "magic"
        }
    ],
    "snot_monster": [
        {
            "name": "Sticky Trap",
            "description": "Target's attack is reduced by 30% for their next 2 attacks. Usable twice per game.",
            "element": "plant"
        }
    ],
    "tornado_terror": [
        {
            "name": "Whirlwind",
            "description": "Randomly swap the order of opponent's cards, disrupting their strategy. Usable once per game.",
            "element": "air"
        }
    ],
    "wiggly_worm": [
        {
            "name": "Burrow",
            "description": "Automatically dodge the next attack completely. Usable once per game.",
            "element": "earth"
        }
    ]
}

def main():
    # Load cards
    with open(CARDS_FILE, 'r') as f:
        cards = json.load(f)
    
    modified_count = 0
    
    for card in cards:
        card_id = card.get('id')
        
        if card_id in LEGENDARY_SPECIALS:
            existing_specials = card.get('special_abilities', [])
            new_specials = LEGENDARY_SPECIALS[card_id]
            
            # Check if already has these specials
            existing_names = {s.get('name') for s in existing_specials}
            specials_to_add = [s for s in new_specials if s['name'] not in existing_names]
            
            if specials_to_add:
                card['special_abilities'] = existing_specials + specials_to_add
                print(f"Added to {card['name']}: {[s['name'] for s in specials_to_add]}")
                modified_count += 1
    
    # Save cards
    with open(CARDS_FILE, 'w') as f:
        json.dump(cards, f, indent=2)
    
    print(f"\nModified {modified_count} legendary cards with special abilities.")

if __name__ == '__main__':
    main()
