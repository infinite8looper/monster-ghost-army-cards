#!/usr/bin/env python3
"""
Enhance all cards with:
1. Fixed/improved attack names
2. Attack power values and element types
3. Additional attacks for cards with <3
4. Generated biographies
"""

import json
import random
import subprocess
import re

# Attack templates by element with power ranges
ATTACK_POOL = {
    "fire": [
        ("Flame Burst", "Explosive fire eruption", 12, 18),
        ("Inferno Wave", "Sweeping flames", 15, 22),
        ("Ember Storm", "Rain of burning embers", 10, 15),
        ("Lava Splash", "Molten rock spray", 14, 20),
        ("Heat Ray", "Concentrated fire beam", 16, 24),
        ("Combustion", "Spontaneous explosion", 18, 25),
        ("Scorch Strike", "Burning melee attack", 10, 14),
        ("Wildfire", "Spreading flames", 12, 18),
    ],
    "water": [
        ("Tidal Crush", "Overwhelming water pressure", 14, 20),
        ("Frost Bite", "Icy piercing attack", 12, 18),
        ("Bubble Barrage", "Rapid bubble assault", 8, 14),
        ("Whirlpool", "Spinning water vortex", 15, 22),
        ("Ice Shard", "Frozen crystal projectile", 12, 16),
        ("Tsunami", "Massive wave attack", 18, 26),
        ("Aqua Jet", "High-pressure water blast", 14, 18),
        ("Freeze Ray", "Crystallizing beam", 10, 16),
    ],
    "earth": [
        ("Boulder Smash", "Heavy rock impact", 16, 24),
        ("Quake", "Ground-shaking tremor", 14, 20),
        ("Crystal Lance", "Sharp mineral projectile", 12, 18),
        ("Mud Slide", "Engulfing earth flow", 10, 16),
        ("Stone Barrage", "Multiple rock projectiles", 12, 18),
        ("Seismic Slam", "Devastating ground pound", 18, 26),
        ("Sand Storm", "Blinding earth attack", 8, 14),
        ("Geode Burst", "Exploding crystals", 14, 20),
    ],
    "air": [
        ("Gale Force", "Powerful wind blast", 12, 18),
        ("Thunder Strike", "Lightning bolt", 16, 24),
        ("Cyclone", "Spinning wind attack", 14, 20),
        ("Sonic Boom", "Sound wave damage", 15, 22),
        ("Wind Blade", "Cutting air slash", 10, 16),
        ("Storm Surge", "Electrified wind", 18, 26),
        ("Vacuum Slice", "Air pressure attack", 12, 18),
        ("Gust Punch", "Wind-powered strike", 8, 14),
    ],
    "plant": [
        ("Vine Lash", "Whipping vines", 10, 16),
        ("Spore Cloud", "Toxic spore release", 12, 18),
        ("Thorn Barrage", "Sharp thorn projectiles", 14, 20),
        ("Root Crush", "Entangling roots", 12, 18),
        ("Petal Storm", "Razor petal assault", 10, 16),
        ("Nature's Wrath", "Overgrowth attack", 16, 24),
        ("Seed Bomb", "Explosive seeds", 14, 20),
        ("Bloom Burst", "Flowering explosion", 12, 18),
    ],
    "magic": [
        ("Arcane Bolt", "Pure magical energy", 12, 18),
        ("Hex Blast", "Cursed projectile", 14, 20),
        ("Mystic Pulse", "Reality-warping wave", 16, 24),
        ("Enchant Strike", "Magic-infused attack", 10, 16),
        ("Spell Surge", "Overflow of magic", 18, 26),
        ("Illusion Break", "Mind-shattering attack", 14, 20),
        ("Rune Blast", "Ancient symbol power", 12, 18),
        ("Chaos Orb", "Unpredictable magic", 15, 22),
    ],
    "mecha": [
        ("Laser Beam", "Focused energy blast", 14, 20),
        ("Gear Grind", "Mechanical crushing", 12, 18),
        ("Circuit Shock", "Electrical discharge", 16, 24),
        ("Rocket Punch", "Propelled fist strike", 15, 22),
        ("Plasma Cannon", "Superheated projectile", 18, 26),
        ("System Overload", "Energy explosion", 20, 28),
        ("Metal Storm", "Shrapnel barrage", 12, 18),
        ("Hack Attack", "Digital disruption", 10, 16),
    ],
    "universe": [
        ("Void Strike", "Dark matter damage", 14, 20),
        ("Star Burst", "Cosmic explosion", 16, 24),
        ("Gravity Well", "Crushing force", 18, 26),
        ("Nebula Blast", "Space dust attack", 12, 18),
        ("Black Hole", "All-consuming void", 22, 30),
        ("Cosmic Ray", "Universal energy", 15, 22),
        ("Dark Matter", "Shadow damage", 14, 20),
        ("Supernova", "Stellar explosion", 20, 28),
    ],
}

# Defense templates
DEFENSE_POOL = {
    "fire": [("Heat Shield", "Fiery barrier", 8, 15), ("Flame Cloak", "Burning aura", 6, 12)],
    "water": [("Ice Armor", "Frozen shell", 10, 16), ("Mist Veil", "Obscuring fog", 6, 12)],
    "earth": [("Stone Wall", "Rocky defense", 12, 18), ("Crystal Guard", "Gem shield", 8, 14)],
    "air": [("Wind Barrier", "Deflecting gusts", 8, 14), ("Thunder Guard", "Electric shield", 10, 16)],
    "plant": [("Bark Skin", "Natural armor", 10, 16), ("Thorn Shield", "Spiked defense", 8, 14)],
    "magic": [("Magic Ward", "Arcane protection", 10, 18), ("Spell Shield", "Anti-magic barrier", 12, 18)],
    "mecha": [("Metal Plating", "Mechanical armor", 12, 20), ("Force Field", "Energy barrier", 10, 16)],
    "universe": [("Void Cloak", "Shadow concealment", 10, 16), ("Dimensional Shift", "Reality dodge", 8, 14)],
}

# Typo fixes for attack names
TYPO_FIXES = {
    "Cry Loudly (Im Damage to Ears)": "Sonic Wail",
    "Causes All Attacks to Squelch": "Squelch Wave",
    "Plugs Its Enemies": "Energy Drain",
    "Ultra Fog Lurker": "Fog Strike",
    "Im Damage to Ears": "Sonic Shriek",
    "Stunk Attack": "Stench Blast",
    "": "Strike",  # Empty attack names
}

def fix_attack_name(name):
    """Fix typos and weird attack names."""
    if name in TYPO_FIXES:
        return TYPO_FIXES[name]
    # Fix parenthetical mess
    if "(" in name and ")" in name:
        name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    # Capitalize properly
    return name.strip().title() if name else "Strike"

def get_attack_power(tier, base_min, base_max):
    """Get attack power based on tier."""
    multipliers = {"legendary": 1.3, "strong": 1.1, "common": 1.0, "weak": 0.8}
    mult = multipliers.get(tier, 1.0)
    return int(random.randint(base_min, base_max) * mult)

def enhance_attacks(card):
    """Enhance existing attacks and add more if needed."""
    elements = card.get("elements", ["magic"])
    tier = card.get("tier", "common")
    attacks = card.get("attacks", [])

    # Fix existing attacks
    enhanced = []
    for atk in attacks:
        name = fix_attack_name(atk.get("name", ""))
        desc = atk.get("description", "")

        # Assign element based on attack name keywords or card element
        atk_element = elements[0]
        for elem, keywords in [("fire", ["fire", "flame", "burn", "heat", "lava"]),
                               ("water", ["water", "ice", "frost", "bubble", "wave"]),
                               ("earth", ["rock", "stone", "crystal", "quake", "mud"]),
                               ("air", ["wind", "thunder", "storm", "sonic", "gust"]),
                               ("plant", ["vine", "thorn", "seed", "spore", "leaf"]),
                               ("magic", ["magic", "arcane", "spell", "hex", "mystic"]),
                               ("mecha", ["laser", "metal", "circuit", "plasma", "gear"]),
                               ("universe", ["void", "star", "cosmic", "black hole", "gravity"])]:
            if any(kw in name.lower() for kw in keywords):
                atk_element = elem
                break

        # Calculate power
        power = get_attack_power(tier, 10, 20)

        enhanced.append({
            "name": name,
            "description": desc if desc else f"{atk_element.title()} damage",
            "power": power,
            "element": atk_element
        })

    # Add more attacks if needed (minimum 3)
    while len(enhanced) < 3:
        # Pick random element from card's elements
        elem = random.choice(elements)
        pool = ATTACK_POOL.get(elem, ATTACK_POOL["magic"])

        # Find unused attack
        used_names = {a["name"] for a in enhanced}
        available = [a for a in pool if a[0] not in used_names]

        if available:
            name, desc, min_pow, max_pow = random.choice(available)
            power = get_attack_power(tier, min_pow, max_pow)
            enhanced.append({
                "name": name,
                "description": desc,
                "power": power,
                "element": elem
            })
        else:
            break

    return enhanced

def enhance_defenses(card):
    """Enhance defenses with power values."""
    elements = card.get("elements", ["magic"])
    tier = card.get("tier", "common")
    defenses = card.get("defenses", [])

    enhanced = []
    for defense in defenses:
        name = defense.get("name", "Guard")
        desc = defense.get("description", "")

        # Assign element
        def_element = elements[0]

        # Calculate defense value
        mult = {"legendary": 1.3, "strong": 1.1, "common": 1.0, "weak": 0.8}.get(tier, 1.0)
        value = int(random.randint(8, 15) * mult)

        enhanced.append({
            "name": name,
            "description": desc if desc else "Reduces damage",
            "value": value,
            "element": def_element
        })

    # Add defense if none exists
    if not enhanced:
        elem = elements[0]
        pool = DEFENSE_POOL.get(elem, DEFENSE_POOL["magic"])
        name, desc, min_val, max_val = random.choice(pool)
        mult = {"legendary": 1.3, "strong": 1.1, "common": 1.0, "weak": 0.8}.get(tier, 1.0)
        value = int(random.randint(min_val, max_val) * mult)
        enhanced.append({
            "name": name,
            "description": desc,
            "value": value,
            "element": elem
        })

    return enhanced

def generate_bio(card):
    """Generate a bio using Gemini or fallback."""
    name = card["name"]
    elements = ", ".join(card.get("elements", ["unknown"]))
    tier = card.get("tier", "common")

    # Check if already has good bio
    current = card.get("biography", "")
    if current and len(current) > 50 and "visual_description" not in current.lower():
        if "creature" not in current[:20].lower():  # Not auto-generated filler
            return current

    prompt = f'''Write a 2-sentence fantasy biography for "{name}", a {tier} {elements} creature in a monster card game. Be mysterious and epic. Output ONLY the bio text.'''

    try:
        result = subprocess.run(
            ["gemini", "-p", prompt],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode == 0 and result.stdout.strip():
            bio = result.stdout.strip().strip('"\'')
            return bio
    except:
        pass

    # Fallback bio
    tier_phrases = {
        "legendary": "Ancient legends speak of",
        "strong": "Warriors whisper tales of",
        "common": "Among monster kind stands",
        "weak": "Often overlooked,"
    }
    return f"{tier_phrases.get(tier, 'Known throughout the realm,')} {name}, wielder of {elements} power. Its true origins remain a mystery."

def main():
    with open("data/cards.json") as f:
        cards = json.load(f)

    print(f"Enhancing {len(cards)} cards...")

    for i, card in enumerate(cards):
        # Enhance attacks
        card["attacks"] = enhance_attacks(card)

        # Enhance defenses
        card["defenses"] = enhance_defenses(card)

        # Generate bio (with rate limiting for API)
        if i % 10 == 0:
            print(f"  Processing card {i+1}/{len(cards)}: {card['name']}")

        card["biography"] = generate_bio(card)

    # Save
    with open("data/cards.json", "w") as f:
        json.dump(cards, f, indent=2)

    print(f"\nDone! Enhanced {len(cards)} cards.")

    # Summary
    attack_counts = {}
    for card in cards:
        n = len(card.get("attacks", []))
        attack_counts[n] = attack_counts.get(n, 0) + 1

    print("\nNew attack distribution:")
    for count, num in sorted(attack_counts.items()):
        print(f"  {count} attacks: {num} cards")

if __name__ == "__main__":
    main()
