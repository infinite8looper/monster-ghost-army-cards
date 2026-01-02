#!/usr/bin/env python3
"""
Merge extracted card batches into a single comprehensive cards.json file.
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

def normalize_card_id(name):
    """Convert card name to a valid ID."""
    # Handle special cases
    if name is None:
        return "unnamed_creature"

    # Convert to lowercase and replace spaces/special chars with underscores
    card_id = name.lower()
    card_id = re.sub(r'[^a-z0-9]+', '_', card_id)
    card_id = card_id.strip('_')

    # Handle some specific cases
    if card_id.startswith('10000000'):
        card_id = 'ultra_fog_lurker'
    elif card_id == 'h13253312':
        card_id = 'h13253312'
    elif 'sluuuuuu' in card_id:
        card_id = 'fog_slurper'
    elif card_id.startswith('teleportation_bounce'):
        card_id = 'double_duty_unlimited_teleportation'
    elif card_id == 'ssslithering_sssssnake':
        card_id = 'sslithering_snake_poison'

    return card_id

def infer_elements(card_data):
    """Infer card elements from name and attacks."""
    elements = []
    name = (card_data.get('card_name') or card_data.get('name') or '').lower()
    visual = (card_data.get('visual_description') or '').lower()

    # All attacks as text
    attacks_text = ''
    attacks = card_data.get('attacks', [])
    for a in attacks:
        if isinstance(a, dict):
            attacks_text += ' ' + (a.get('name') or '')
        else:
            attacks_text += ' ' + str(a)
    attacks_text = attacks_text.lower()

    # Fire indicators
    if any(x in name + attacks_text + visual for x in ['fire', 'flame', 'lava', 'burn', 'heat', 'magma', 'candle']):
        elements.append('fire')

    # Water indicators
    if any(x in name + attacks_text + visual for x in ['water', 'tsunami', 'ocean', 'ice', 'freeze', 'frost', 'frigid', 'ice cream']):
        elements.append('water')

    # Earth indicators
    if any(x in name + attacks_text + visual for x in ['earth', 'rock', 'mud', 'mountain', 'quake', 'dirt']):
        elements.append('earth')

    # Air indicators
    if any(x in name + attacks_text + visual for x in ['air', 'wind', 'fog', 'tornado', 'hurricane', 'cloud', 'storm']):
        elements.append('air')

    # Plant indicators
    if any(x in name + attacks_text + visual for x in ['plant', 'flower', 'garden', 'vine', 'leaf', 'pea', 'cactus', 'tree']):
        elements.append('plant')

    # Mecha indicators
    if any(x in name + attacks_text + visual for x in ['mecha', 'robot', 'robo', 'electric', 'lightning', 'laser', 'technology']):
        elements.append('mecha')

    # Magic indicators
    if any(x in name + attacks_text + visual for x in ['magic', 'spell', 'ghost', 'demon', 'teleport', 'confusion', 'rainbow']):
        elements.append('magic')

    # Universe indicators
    if any(x in name + attacks_text + visual for x in ['universe', 'space', 'star', 'galaxy', 'black hole', 'cosmic', 'shooting star']):
        elements.append('universe')

    # Default to magic if no elements found
    if not elements:
        elements = ['magic']

    # Limit to 2 elements max
    return elements[:2]

def determine_tier(card_data):
    """Determine card tier based on power level."""
    name = (card_data.get('card_name') or card_data.get('name') or '').lower()
    attacks = card_data.get('attacks', [])
    special = card_data.get('special_abilities', [])

    # Count powerful moves
    has_black_hole = False
    has_ghost_army = False
    attack_count = len(attacks)

    for a in attacks:
        aname = (a.get('name') if isinstance(a, dict) else str(a)).lower()
        if 'black hole' in aname:
            has_black_hole = True
        if 'ghost army' in aname:
            has_ghost_army = True

    for s in special:
        sname = (s.get('name') if isinstance(s, dict) else str(s)).lower()
        if 'black hole' in sname:
            has_black_hole = True
        if 'ghost army' in sname:
            has_ghost_army = True

    # Legendary tier
    if has_black_hole and has_ghost_army:
        return 'legendary'
    if 'spike wall' in name and attack_count >= 8:
        return 'legendary'
    if any(x in name for x in ['innercore', 'galaxy', 'combined infinite', 'elemental trio']):
        return 'legendary'

    # Strong tier
    if has_black_hole or has_ghost_army:
        return 'strong'
    if attack_count >= 5:
        return 'strong'

    # Weak tier
    if attack_count <= 1:
        return 'weak'
    if 'box' in name:
        return 'weak'

    # Common tier (default)
    return 'common'

def process_attacks(attacks):
    """Normalize attacks to consistent format."""
    processed = []
    for a in attacks:
        if isinstance(a, dict):
            name = a.get('name', '')
            desc = a.get('description', '')
        else:
            name = str(a)
            desc = ''

        processed.append({
            'name': name,
            'description': desc or ''
        })
    return processed

def process_defenses(defenses):
    """Normalize defenses to consistent format."""
    processed = []
    for d in defenses:
        if isinstance(d, dict):
            name = d.get('name', '')
            desc = d.get('description', '')
        else:
            name = str(d)
            desc = ''

        processed.append({
            'name': name,
            'description': desc or ''
        })
    return processed

def main():
    # Load all batch files
    all_cards = []

    for batch_num in [1, 2, 3, 4]:
        batch_file = DATA_DIR / f"extracted_batch{batch_num}.json"
        if batch_file.exists():
            with open(batch_file, 'r') as f:
                data = json.load(f)
                # Handle different formats
                if isinstance(data, dict) and 'cards' in data:
                    all_cards.extend(data['cards'])
                elif isinstance(data, list):
                    all_cards.extend(data)
            print(f"Loaded batch {batch_num}: {len(data if isinstance(data, list) else data.get('cards', []))} cards")

    print(f"Total raw cards: {len(all_cards)}")

    # Process cards into final format
    final_cards = []
    seen_ids = set()

    for i, card in enumerate(all_cards):
        name = card.get('card_name') or card.get('name')
        if not name:
            name = f"Unnamed Creature {i+1}"

        card_id = normalize_card_id(name)

        # Handle duplicates by adding suffix
        original_id = card_id
        suffix = 2
        while card_id in seen_ids:
            card_id = f"{original_id}_{suffix}"
            suffix += 1
        seen_ids.add(card_id)

        attacks = process_attacks(card.get('attacks', []))
        defenses = process_defenses(card.get('defenses', []))
        special = card.get('special_abilities', [])
        if special:
            special = process_attacks(special)  # Same format

        elements = infer_elements(card)
        tier = determine_tier(card)

        # Build biography from visual description
        visual = card.get('visual_description', '')
        biography = f"A {tier} creature. {visual}"

        final_card = {
            'id': card_id,
            'name': name,
            'visual_description': visual,
            'elements': elements,
            'tier': tier,
            'attacks': attacks,
            'defenses': defenses,
            'special_abilities': special,
            'biography': biography,
            'original_image': card.get('filename') or card.get('image_file', ''),
            'hp': 100 if tier == 'legendary' else (80 if tier == 'strong' else (50 if tier == 'weak' else 70)),
            'attack_power': 25 if tier == 'legendary' else (20 if tier == 'strong' else (10 if tier == 'weak' else 15)),
            'defense_power': 20 if tier == 'legendary' else (15 if tier == 'strong' else (5 if tier == 'weak' else 10))
        }

        final_cards.append(final_card)

    print(f"\nProcessed {len(final_cards)} unique cards")

    # Count by tier
    tiers = {}
    for c in final_cards:
        t = c['tier']
        tiers[t] = tiers.get(t, 0) + 1
    print(f"Tiers: {tiers}")

    # Save to cards.json
    output_file = DATA_DIR / "cards.json"
    with open(output_file, 'w') as f:
        json.dump(final_cards, f, indent=2)
    print(f"\nSaved to: {output_file}")

    # Also save a backup of the old file
    old_file = DATA_DIR / "cards_old.json"
    if output_file.exists():
        import shutil
        # Already saved new, so no backup needed

    # Print sample cards
    print("\n--- Sample Cards ---")
    for card in final_cards[:5]:
        print(f"\n{card['name']} ({card['tier']}):")
        print(f"  ID: {card['id']}")
        print(f"  Elements: {card['elements']}")
        print(f"  Attacks: {[a['name'] for a in card['attacks']]}")
        if card['defenses']:
            print(f"  Defenses: {[d['name'] for d in card['defenses']]}")

if __name__ == '__main__':
    main()
