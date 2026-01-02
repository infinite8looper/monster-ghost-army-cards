#!/usr/bin/env python3
"""
Rebalance all cards with new stats targeting:
- Average HP: ~1,000,000
- Game length: 30-40 turns for 10-card deck
"""

import json
import random

# Load current cards
with open('data/cards.json') as f:
    cards = json.load(f)

# Balanced tier configurations (from v5 simulation)
TIERS = {
    'weak': {
        'hp_range': (600_000, 800_000),
        'atk_range': (450_000, 600_000),
        'def_range': (20_000, 50_000)
    },
    'common': {
        'hp_range': (850_000, 1_100_000),
        'atk_range': (550_000, 800_000),
        'def_range': (35_000, 85_000)
    },
    'strong': {
        'hp_range': (1_100_000, 1_350_000),
        'atk_range': (700_000, 1_000_000),
        'def_range': (50_000, 110_000)
    },
    'legendary': {
        'hp_range': (1_500_000, 2_000_000),
        'atk_range': (1_000_000, 1_400_000),
        'def_range': (80_000, 160_000)
    },
}

# Special powerful attacks that should do more damage
POWERFUL_ATTACKS = [
    'black hole', 'white hole', 'supernova', 'big bang',
    'summon ghost army', 'elemental black hole', 'growing black hole',
    '1000000000000000000 damage', 'googleplex'
]

def is_powerful_attack(name):
    """Check if attack name suggests a powerful move."""
    return any(p in name.lower() for p in POWERFUL_ATTACKS)

def rebalance_card(card):
    """Apply balanced stats to a single card."""
    tier = card.get('tier', 'common')
    config = TIERS.get(tier, TIERS['common'])

    # Set HP
    card['hp'] = random.randint(*config['hp_range'])

    # Process attacks - give each attack a specific base_damage
    attacks = card.get('attacks', [])
    for attack in attacks:
        if is_powerful_attack(attack.get('name', '')):
            # Powerful attacks do 1.5-2x damage
            min_dmg = int(config['atk_range'][0] * 1.5)
            max_dmg = int(config['atk_range'][1] * 2.0)
        else:
            min_dmg, max_dmg = config['atk_range']

        attack['base_damage'] = random.randint(min_dmg, max_dmg)

        # Ensure attack has an element (default to card's first element)
        if 'element' not in attack:
            attack['element'] = card.get('elements', ['magic'])[0]

    # Process defenses - give each defense a specific base_protection
    defenses = card.get('defenses', [])
    for defense in defenses:
        defense['base_protection'] = random.randint(*config['def_range'])

        # Ensure defense has an element
        if 'element' not in defense:
            defense['element'] = card.get('elements', ['magic'])[0]

    # Remove old attack_power and defense_power fields (we now use per-attack values)
    if 'attack_power' in card:
        del card['attack_power']
    if 'defense_power' in card:
        del card['defense_power']

    return card

def main():
    print(f"Rebalancing {len(cards)} cards...")

    # Track stats for verification
    hp_by_tier = {}
    atk_by_tier = {}

    for card in cards:
        rebalance_card(card)

        tier = card.get('tier', 'common')
        if tier not in hp_by_tier:
            hp_by_tier[tier] = []
            atk_by_tier[tier] = []

        hp_by_tier[tier].append(card['hp'])
        for atk in card.get('attacks', []):
            atk_by_tier[tier].append(atk.get('base_damage', 0))

    # Save updated cards
    with open('data/cards.json', 'w') as f:
        json.dump(cards, f, indent=2)

    print("\n=== Rebalancing Complete ===")
    print("\nStats by tier:")
    for tier in ['weak', 'common', 'strong', 'legendary']:
        if tier in hp_by_tier:
            hp_avg = sum(hp_by_tier[tier]) / len(hp_by_tier[tier])
            atk_avg = sum(atk_by_tier[tier]) / len(atk_by_tier[tier]) if atk_by_tier[tier] else 0
            print(f"  {tier.upper()}: HP avg={hp_avg:,.0f}, ATK avg={atk_avg:,.0f}")

    # Overall average HP
    all_hp = [card['hp'] for card in cards]
    print(f"\nOverall HP average: {sum(all_hp)/len(all_hp):,.0f}")

    # Show sample card
    sample = cards[0]
    print(f"\nSample card: {sample['name']} ({sample['tier']})")
    print(f"  HP: {sample['hp']:,}")
    print(f"  Attacks:")
    for atk in sample.get('attacks', [])[:3]:
        print(f"    - {atk['name']}: {atk.get('base_damage', 0):,} dmg ({atk.get('element', 'unknown')})")
    if sample.get('defenses'):
        print(f"  Defenses:")
        for defense in sample.get('defenses', [])[:2]:
            print(f"    - {defense['name']}: {defense.get('base_protection', 0):,} protection")

if __name__ == '__main__':
    main()
