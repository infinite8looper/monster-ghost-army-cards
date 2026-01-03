#!/usr/bin/env python3
"""
Remove redundant attacks from cards in data/cards.json

For each card, if multiple attacks share the same element, keep only the
strongest one (highest base_damage). The weaker attacks with the same element
would never be used in gameplay.
"""

import json
from pathlib import Path

def remove_redundant_attacks(cards: list) -> tuple[list, dict]:
    """
    Remove redundant attacks from cards.

    Args:
        cards: List of card dictionaries

    Returns:
        Tuple of (modified cards list, stats dictionary)
    """
    stats = {
        "cards_processed": 0,
        "cards_modified": 0,
        "attacks_removed": 0,
        "details": []
    }

    for card in cards:
        stats["cards_processed"] += 1
        original_attacks = card.get("attacks", [])

        if not original_attacks:
            continue

        # Group attacks by element
        attacks_by_element = {}
        for attack in original_attacks:
            element = attack.get("element", "unknown")
            if element not in attacks_by_element:
                attacks_by_element[element] = []
            attacks_by_element[element].append(attack)

        # For each element, keep only the strongest attack
        filtered_attacks = []
        removed_from_card = []

        for element, attacks in attacks_by_element.items():
            if len(attacks) == 1:
                # Only one attack with this element, keep it
                filtered_attacks.append(attacks[0])
            else:
                # Multiple attacks with same element - keep strongest
                sorted_attacks = sorted(attacks, key=lambda a: a.get("base_damage", 0), reverse=True)
                strongest = sorted_attacks[0]
                filtered_attacks.append(strongest)

                # Track removed attacks
                for attack in sorted_attacks[1:]:
                    removed_from_card.append({
                        "name": attack.get("name"),
                        "element": element,
                        "damage": attack.get("base_damage"),
                        "kept": strongest.get("name"),
                        "kept_damage": strongest.get("base_damage")
                    })

        if removed_from_card:
            stats["cards_modified"] += 1
            stats["attacks_removed"] += len(removed_from_card)
            stats["details"].append({
                "card_id": card.get("id"),
                "card_name": card.get("name"),
                "removed_attacks": removed_from_card
            })

            # Update the card with filtered attacks
            # Preserve original order as much as possible
            card["attacks"] = filtered_attacks

    return cards, stats


def main():
    # Load the cards.json file
    cards_path = Path(__file__).parent.parent / "data" / "cards.json"

    print(f"Loading cards from: {cards_path}")

    with open(cards_path, "r") as f:
        cards = json.load(f)

    print(f"Loaded {len(cards)} cards")

    # Process the cards
    modified_cards, stats = remove_redundant_attacks(cards)

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Cards processed: {stats['cards_processed']}")
    print(f"Cards modified: {stats['cards_modified']}")
    print(f"Total attacks removed: {stats['attacks_removed']}")

    if stats["details"]:
        print("\n" + "-" * 60)
        print("DETAILED CHANGES")
        print("-" * 60)
        for detail in stats["details"]:
            print(f"\n{detail['card_name']} ({detail['card_id']}):")
            for removed in detail["removed_attacks"]:
                print(f"  - Removed: {removed['name']} ({removed['element']}, {removed['damage']} dmg)")
                print(f"    Kept: {removed['kept']} ({removed['kept_damage']} dmg)")

    # Save the modified cards
    print("\n" + "=" * 60)
    print(f"Saving modified cards to: {cards_path}")

    with open(cards_path, "w") as f:
        json.dump(modified_cards, f, indent=2)

    print("Done!")


if __name__ == "__main__":
    main()
