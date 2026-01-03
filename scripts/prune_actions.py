#!/usr/bin/env python3
"""
Prune card actions to max 5 per card.
Rules:
- Max 5 actions (attacks + defenses) per card
- If actions have same effect (same strength, same element, no special effects),
  either delete one or adjust strength to differentiate
- Sort by strength descending, then by element alphabetically
"""

import json
from pathlib import Path

MAX_ACTIONS = 5  # Max total attacks + defenses

def sort_actions(actions, strength_key):
    """Sort actions by strength descending, then element alphabetically."""
    return sorted(
        actions,
        key=lambda a: (-a.get(strength_key, 0), a.get('element', ''))
    )

def dedupe_actions(actions, strength_key):
    """Remove or differentiate duplicate actions (same strength and element)."""
    seen = {}  # (strength, element) -> list of indices
    result = []

    for action in actions:
        strength = action.get(strength_key, 0)
        element = action.get('element', '')
        has_special = action.get('limited_uses') or action.get('special_type')

        key = (strength, element, has_special)

        if key in seen and not has_special:
            # Duplicate found - adjust strength by small amount to differentiate
            # Add 5-10% variance
            existing = seen[key]
            variance = int(strength * 0.05) + 1
            action[strength_key] = strength - variance

        seen[key] = action
        result.append(action)

    return result

def prune_card_actions(card):
    """Prune a single card's actions to max 5 total."""
    attacks = card.get('attacks', [])
    defenses = card.get('defenses', [])

    # Sort both lists
    attacks = sort_actions(attacks, 'base_damage')
    defenses = sort_actions(defenses, 'base_protection')

    # Dedupe within each category
    attacks = dedupe_actions(attacks, 'base_damage')
    defenses = dedupe_actions(defenses, 'base_protection')

    total_actions = len(attacks) + len(defenses)

    if total_actions > MAX_ACTIONS:
        # Calculate how many to keep
        # Prioritize keeping at least 1 defense if present
        min_defenses = min(1, len(defenses)) if defenses else 0
        max_attacks = MAX_ACTIONS - min_defenses

        # Keep top attacks up to max_attacks
        attacks = attacks[:max_attacks]

        # Keep remaining slots for defenses
        remaining_slots = MAX_ACTIONS - len(attacks)
        defenses = defenses[:remaining_slots]

    # Re-sort after any modifications
    card['attacks'] = sort_actions(attacks, 'base_damage')
    card['defenses'] = sort_actions(defenses, 'base_protection')

    return card

def main():
    cards_path = Path(__file__).parent.parent / 'data' / 'cards.json'

    with open(cards_path, 'r') as f:
        cards = json.load(f)

    pruned_count = 0
    for card in cards:
        original_count = len(card.get('attacks', [])) + len(card.get('defenses', []))
        card = prune_card_actions(card)
        new_count = len(card.get('attacks', [])) + len(card.get('defenses', []))

        if new_count < original_count:
            pruned_count += 1
            print(f"Pruned {card['name']}: {original_count} -> {new_count} actions")

    # Write back
    with open(cards_path, 'w') as f:
        json.dump(cards, f, indent=2)

    print(f"\nPruned {pruned_count} cards")
    print(f"Saved to {cards_path}")

if __name__ == '__main__':
    main()
