#!/usr/bin/env python3
"""
Add missing cards that have images but no JSON entries.
Auto-generates appropriate stats based on naming patterns.
"""

import json
import random

# Element keywords for auto-assignment
ELEMENT_KEYWORDS = {
    "fire": ["fire", "flame", "burn", "volcano", "lava", "inferno", "heat", "ember"],
    "water": ["water", "bubble", "splash", "wave", "ocean", "rain", "ice", "frost", "frosty"],
    "earth": ["rock", "stone", "earth", "crystal", "geo", "mud", "dirt", "boulder", "marble"],
    "air": ["wind", "air", "cloud", "tornado", "breeze", "sky", "float", "thunder"],
    "plant": ["leaf", "plant", "tree", "vine", "flower", "grass", "cotton", "candy"],
    "magic": ["magic", "spell", "wizard", "ghost", "phantom", "spirit", "glow", "glitter", "rainbow", "disco"],
    "mecha": ["robot", "bot", "mech", "metal", "gear", "pixel", "battery", "button", "coin", "tape", "zipper"],
    "universe": ["star", "cosmic", "space", "gravity", "time", "void", "shadow", "dark"]
}

# Attack templates by element
ATTACK_TEMPLATES = {
    "fire": [("Flame Burst", "Explosive fire attack"), ("Heat Wave", "Scorching area damage"), ("Ember Shot", "Rapid fire projectiles")],
    "water": [("Splash Attack", "Drenching water strike"), ("Frost Bite", "Icy damage"), ("Tidal Wave", "Overwhelming water surge")],
    "earth": [("Rock Throw", "Heavy stone projectile"), ("Quake Slam", "Ground-shaking attack"), ("Crystal Strike", "Sharp crystal damage")],
    "air": [("Wind Slash", "Cutting air blade"), ("Thunder Clap", "Sonic boom attack"), ("Cyclone Spin", "Spinning wind attack")],
    "plant": [("Vine Whip", "Entangling strike"), ("Spore Cloud", "Toxic spore release"), ("Leaf Storm", "Razor sharp leaves")],
    "magic": [("Arcane Blast", "Pure magical energy"), ("Hex Bolt", "Cursed projectile"), ("Mystic Pulse", "Reality-warping attack")],
    "mecha": [("Laser Beam", "Focused energy blast"), ("Gear Grind", "Mechanical crushing"), ("Circuit Shock", "Electrical discharge")],
    "universe": [("Void Strike", "Darkness damage"), ("Star Burst", "Cosmic explosion"), ("Gravity Well", "Crushing force")]
}

DEFENSE_TEMPLATES = {
    "fire": ("Heat Shield", "Fiery barrier"),
    "water": ("Ice Armor", "Frozen protection"),
    "earth": ("Stone Wall", "Rocky defense"),
    "air": ("Wind Barrier", "Deflecting gusts"),
    "plant": ("Bark Skin", "Natural armor"),
    "magic": ("Magic Ward", "Arcane protection"),
    "mecha": ("Metal Plating", "Mechanical defense"),
    "universe": ("Void Cloak", "Shadow concealment")
}

def name_to_display(card_id):
    """Convert card_id to display name."""
    return card_id.replace("_", " ").title()

def guess_elements(card_id):
    """Guess elements based on card name keywords."""
    name_lower = card_id.lower()
    elements = []

    for element, keywords in ELEMENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name_lower:
                if element not in elements:
                    elements.append(element)
                break

    # If no matches, assign random elements
    if not elements:
        all_elements = list(ELEMENT_KEYWORDS.keys())
        elements = random.sample(all_elements, random.choice([1, 2]))

    # Limit to 2 elements max
    return elements[:2]

def guess_tier(card_id):
    """Guess tier based on name patterns."""
    name_lower = card_id.lower()

    if any(word in name_lower for word in ["ultimate", "mega", "supreme", "infinite", "ancient", "legendary"]):
        return "legendary"
    elif any(word in name_lower for word in ["giant", "thunder", "shadow", "crystal", "dragon"]):
        return "strong"
    elif any(word in name_lower for word in ["little", "tiny", "baby", "mini", "silly"]):
        return "weak"
    else:
        return "common"

def generate_stats(tier):
    """Generate HP, ATK, DEF based on tier."""
    if tier == "legendary":
        return random.randint(90, 100), random.randint(25, 30), random.randint(15, 20)
    elif tier == "strong":
        return random.randint(70, 85), random.randint(18, 24), random.randint(10, 15)
    elif tier == "weak":
        return random.randint(40, 55), random.randint(8, 12), random.randint(3, 8)
    else:  # common
        return random.randint(55, 70), random.randint(12, 18), random.randint(6, 12)

def generate_attacks(elements, tier):
    """Generate attacks based on elements."""
    attacks = []
    num_attacks = {"legendary": 4, "strong": 3, "common": 3, "weak": 2}[tier]

    for element in elements:
        templates = ATTACK_TEMPLATES.get(element, ATTACK_TEMPLATES["magic"])
        for name, desc in random.sample(templates, min(2, len(templates))):
            if len(attacks) < num_attacks:
                attacks.append({"name": name, "description": desc})

    # Fill remaining with random attacks
    while len(attacks) < num_attacks:
        element = random.choice(list(ATTACK_TEMPLATES.keys()))
        templates = ATTACK_TEMPLATES[element]
        name, desc = random.choice(templates)
        if not any(a["name"] == name for a in attacks):
            attacks.append({"name": name, "description": desc})

    return attacks[:num_attacks]

def generate_defense(elements):
    """Generate defense based on primary element."""
    element = elements[0] if elements else "magic"
    name, desc = DEFENSE_TEMPLATES.get(element, DEFENSE_TEMPLATES["magic"])
    return [{"name": name, "description": desc}]

def generate_bio(name, elements, tier):
    """Generate a simple biography."""
    element_str = " and ".join(elements)
    tier_phrases = {
        "legendary": "An ancient legend speaks of",
        "strong": "Warriors tremble at the sight of",
        "common": "Among the monster ranks stands",
        "weak": "Often underestimated,"
    }
    return f"{tier_phrases[tier]} {name}, a creature of {element_str} power. Its origins remain shrouded in mystery."

def main():
    # Get missing card IDs
    missing_ids = """balloon_beast
battery_bot
bounceback
bubble_beast
bubblegum_blob
burp_beast
button_basher
candy_crusher
cheese_monster
coin_collector
confusion_injecting
cotton_candy_cloud
crayon_creature
crystal_monster
dice_roller
domino_effect
eraser_head
eyeball_monster
flame_head
frosty_phantom
giant_squid
glitter_bomb
glow_worm
goopy_ghost
gravity_ghost
jellyfish_jolt
key_master
leaf_leaper
magnet_monster
marble_madness
muddy_buddy
paint_splatter
pillow_fighter
pixel_pete
popcorn_popper
porcupine_pal
puzzle_piece
rainbow_blob
rock_monster
rubber_band
scribble_monster
shadow_creeper
silly_string
snot_monster
sock_monster
sound_wave
sparky
spike_ball
spinner_spirit
sprinkle_spirit
star_striker
sticky_note
tape_monster
the_bone_chiller
the_stomper
thunder_cloud
time_twister
tornado_terror
unnamed_creature
volcano_monster
wiggly_worm
zig_zag
zipper_zapper""".strip().split("\n")

    # Load existing cards
    with open("data/cards.json", "r") as f:
        cards = json.load(f)

    existing_ids = {c["id"] for c in cards}

    print(f"Current cards: {len(cards)}")
    print(f"Missing cards to add: {len(missing_ids)}")

    added = 0
    for card_id in missing_ids:
        if card_id in existing_ids:
            continue

        name = name_to_display(card_id)
        elements = guess_elements(card_id)
        tier = guess_tier(card_id)
        hp, atk, defense = generate_stats(tier)

        card = {
            "id": card_id,
            "name": name,
            "elements": elements,
            "tier": tier,
            "visual_description": f"A {tier} creature called {name}",
            "attacks": generate_attacks(elements, tier),
            "defenses": generate_defense(elements),
            "special_abilities": [],
            "biography": generate_bio(name, elements, tier),
            "hp": hp,
            "attack_power": atk,
            "defense_power": defense
        }

        cards.append(card)
        added += 1
        print(f"  Added: {name} ({', '.join(elements)}) - {tier}")

    # Save
    with open("data/cards.json", "w") as f:
        json.dump(cards, f, indent=2)

    print(f"\nDone! Added {added} cards. New total: {len(cards)}")

if __name__ == "__main__":
    main()
