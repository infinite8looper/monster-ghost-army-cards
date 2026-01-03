#!/usr/bin/env python3
"""
Fast card enhancement - no API calls.
Fixes attacks, adds power/element, generates template bios.
"""

import json
import random
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

# Bio templates
BIO_TEMPLATES = {
    "legendary": [
        "From the primordial chaos emerged {name}, a being of unfathomable {element} power. Legends say its awakening signals the end of ages.",
        "When reality itself trembled, {name} was born. Now it wields {element} forces that make even gods take pause.",
        "Ancient texts speak of {name} in hushed reverence. Its mastery of {element} has toppled empires and reshapen worlds.",
    ],
    "strong": [
        "Forged in conflict, {name} commands {element} with devastating precision. Few who face it survive to tell the tale.",
        "Warriors whisper of {name}'s {element} fury. It has turned the tide of countless battles across the realm.",
        "{name} emerged from the wilds bearing {element} power that rivals ancient beasts. Its strength grows with each victory.",
    ],
    "common": [
        "Among monster-kind stands {name}, a reliable wielder of {element}. What it lacks in legend, it makes up in determination.",
        "{name} channels {element} with practiced skill. Though not legendary, it has earned respect in countless skirmishes.",
        "Born of {element}, {name} seeks to prove itself among greater creatures. Underestimate it at your peril.",
    ],
    "weak": [
        "Often overlooked, {name} hides surprising {element} tricks. Those who dismiss it rarely make the same mistake twice.",
        "Small but scrappy, {name} wields {element} in unexpected ways. Size isn't everything in battle.",
        "{name} may seem humble, but its {element} spirit burns bright. Every giant fears the bite of the small.",
    ],
}

def fix_attack_name(name):
    """Fix typos and weird attack names."""
    fixes = {
        "Cry Loudly (Im Damage to Ears)": "Sonic Wail",
        "Causes All Attacks to Squelch": "Squelch Wave",
        "Plugs Its Enemies": "Energy Drain",
        "Ultra Fog Lurker": "Fog Strike",
        "Im Damage to Ears": "Sonic Shriek",
        "Stunk Attack": "Stench Blast",
        "": "Strike",
    }
    if name in fixes:
        return fixes[name]
    # Fix parenthetical mess
    if "(" in name and ")" in name:
        name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    return name.strip().title() if name else "Strike"

def get_attack_element(name, default_elem):
    """Guess element from attack name."""
    name_lower = name.lower()
    element_keywords = {
        "fire": ["fire", "flame", "burn", "heat", "lava", "inferno", "ember", "scorch"],
        "water": ["water", "ice", "frost", "bubble", "wave", "aqua", "splash", "freeze"],
        "earth": ["rock", "stone", "crystal", "quake", "mud", "boulder", "geo", "sand"],
        "air": ["wind", "thunder", "storm", "sonic", "gust", "cyclone", "lightning", "gale"],
        "plant": ["vine", "thorn", "seed", "spore", "leaf", "root", "bloom", "petal"],
        "magic": ["magic", "arcane", "spell", "hex", "mystic", "rune", "chaos", "enchant"],
        "mecha": ["laser", "metal", "circuit", "plasma", "gear", "rocket", "hack", "system"],
        "universe": ["void", "star", "cosmic", "black hole", "gravity", "nebula", "dark", "supernova"],
    }
    for elem, keywords in element_keywords.items():
        if any(kw in name_lower for kw in keywords):
            return elem
    return default_elem

def get_power(tier, base_min, base_max):
    """Get power value based on tier."""
    multipliers = {"legendary": 1.3, "strong": 1.1, "common": 1.0, "weak": 0.8}
    mult = multipliers.get(tier, 1.0)
    return int(random.randint(base_min, base_max) * mult)

def enhance_attacks(card):
    """Enhance attacks with power/element, add more if needed."""
    elements = card.get("elements", ["magic"])
    tier = card.get("tier", "common")
    attacks = card.get("attacks", [])

    enhanced = []
    used_names = set()

    for atk in attacks:
        name = fix_attack_name(atk.get("name", ""))
        if name in used_names:
            continue
        used_names.add(name)

        desc = atk.get("description", "")
        atk_element = get_attack_element(name, elements[0])
        power = get_power(tier, 10, 20)

        enhanced.append({
            "name": name,
            "description": desc if desc else f"{atk_element.title()} damage",
            "power": power,
            "element": atk_element
        })

    # Add more attacks to reach minimum of 3
    while len(enhanced) < 3:
        elem = random.choice(elements)
        pool = ATTACK_POOL.get(elem, ATTACK_POOL["magic"])
        available = [a for a in pool if a[0] not in used_names]

        if available:
            name, desc, min_pow, max_pow = random.choice(available)
            used_names.add(name)
            power = get_power(tier, min_pow, max_pow)
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
    """Enhance defenses with power/element."""
    elements = card.get("elements", ["magic"])
    tier = card.get("tier", "common")
    defenses = card.get("defenses", [])

    enhanced = []
    for defense in defenses:
        name = defense.get("name", "Guard")
        desc = defense.get("description", "")
        def_element = elements[0]
        value = get_power(tier, 8, 15)

        enhanced.append({
            "name": name,
            "description": desc if desc else "Reduces damage",
            "value": value,
            "element": def_element
        })

    # Add defense if none
    if not enhanced:
        elem = elements[0]
        pool = DEFENSE_POOL.get(elem, DEFENSE_POOL["magic"])
        name, desc, min_val, max_val = random.choice(pool)
        value = get_power(tier, min_val, max_val)
        enhanced.append({
            "name": name,
            "description": desc,
            "value": value,
            "element": elem
        })

    return enhanced

def generate_bio(card):
    """Generate template-based bio."""
    name = card["name"]
    elements = card.get("elements", ["magic"])
    tier = card.get("tier", "common")
    element_str = " and ".join(elements)

    # Check if already has good bio
    current = card.get("biography", "")
    if current and len(current) > 60:
        # Check it's not just the visual description
        if "visual" not in current.lower() and card.get("visual_description", "")[:30] not in current:
            return current

    templates = BIO_TEMPLATES.get(tier, BIO_TEMPLATES["common"])
    template = random.choice(templates)
    return template.format(name=name, element=element_str)

def main():
    with open("data/cards.json") as f:
        cards = json.load(f)

    print(f"Enhancing {len(cards)} cards (fast mode)...")

    for i, card in enumerate(cards):
        card["attacks"] = enhance_attacks(card)
        card["defenses"] = enhance_defenses(card)
        card["biography"] = generate_bio(card)

        if (i + 1) % 50 == 0:
            print(f"  Processed {i+1}/{len(cards)} cards")

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

    # Show sample enhanced card
    sample = cards[0]
    print(f"\nSample card: {sample['name']}")
    print(f"  Attacks ({len(sample['attacks'])}):")
    for atk in sample['attacks'][:3]:
        print(f"    - {atk['name']}: {atk['power']} {atk['element']} dmg")
    print(f"  Biography: {sample['biography'][:80]}...")

if __name__ == "__main__":
    main()
