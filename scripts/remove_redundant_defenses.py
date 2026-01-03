#!/usr/bin/env python3
"""
Remove redundant defenses from cards in data/cards.json

For each card, if multiple defenses share the same element, keep only the
strongest one (highest base_protection). The weaker defenses with the same element
would never be used in gameplay.
"""

import json
from pathlib import Path


def remove_redundant_defenses(cards: list) -> tuple[list, dict]:
    """
    Remove redundant defenses from cards.

    Args:
        cards: List of card dictionaries

    Returns:
        Tuple of (modified cards list, stats dictionary)
    """
    stats = {
        "cards_processed": 0,
        "cards_modified": 0,
        "defenses_removed": 0,
        "details": []
    }

    for card in cards:
        stats["cards_processed"] += 1
        original_defenses = card.get("defenses", [])

        if not original_defenses:
            continue

        # Group defenses by element
        defenses_by_element = {}
        for defense in original_defenses:
            element = defense.get("element", "unknown")
            if element not in defenses_by_element:
                defenses_by_element[element] = []
            defenses_by_element[element].append(defense)

        # For each element, keep only the strongest defense
        filtered_defenses = []
        removed_from_card = []

        for element, defenses in defenses_by_element.items():
            if len(defenses) == 1:
                # Only one defense with this element, keep it
                filtered_defenses.append(defenses[0])
            else:
                # Multiple defenses with same element - keep strongest
                sorted_defenses = sorted(defenses, key=lambda d: d.get("base_protection", 0), reverse=True)
                strongest = sorted_defenses[0]
                filtered_defenses.append(strongest)

                # Track removed defenses
                for defense in sorted_defenses[1:]:
                    removed_from_card.append({
                        "name": defense.get("name"),
                        "element": element,
                        "protection": defense.get("base_protection"),
                        "kept": strongest.get("name"),
                        "kept_protection": strongest.get("base_protection")
                    })

        if removed_from_card:
            stats["cards_modified"] += 1
            stats["defenses_removed"] += len(removed_from_card)
            stats["details"].append({
                "card_id": card.get("id"),
                "card_name": card.get("name"),
                "removed_defenses": removed_from_card
            })

            # Update the card with filtered defenses
            card["defenses"] = filtered_defenses

    return cards, stats


def main():
    # Load the cards.json file
    cards_path = Path(__file__).parent.parent / "data" / "cards.json"

    print(f"Loading cards from: {cards_path}")

    with open(cards_path, "r") as f:
        cards = json.load(f)

    print(f"Loaded {len(cards)} cards")

    # Process the cards
    modified_cards, stats = remove_redundant_defenses(cards)

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Cards processed: {stats['cards_processed']}")
    print(f"Cards modified: {stats['cards_modified']}")
    print(f"Total defenses removed: {stats['defenses_removed']}")

    if stats["details"]:
        print("\n" + "-" * 60)
        print("DETAILED CHANGES")
        print("-" * 60)
        for detail in stats["details"]:
            print(f"\n{detail['card_name']} ({detail['card_id']}):")
            for removed in detail["removed_defenses"]:
                print(f"  - Removed: {removed['name']} ({removed['element']}, {removed['protection']} protection)")
                print(f"    Kept: {removed['kept']} ({removed['kept_protection']} protection)")

    # Save the modified cards
    print("\n" + "=" * 60)
    print(f"Saving modified cards to: {cards_path}")

    with open(cards_path, "w") as f:
        json.dump(modified_cards, f, indent=2)

    print("Done!")


if __name__ == "__main__":
    main()
