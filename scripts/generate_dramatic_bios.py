#!/usr/bin/env python3
"""
Generate dramatic one-liner bios like Ascension/MTG flavor text.
Short, evocative, mysterious.
"""

import json
import random

# Dramatic one-liner templates - {name} and {element} can be substituted
DRAMATIC_BIOS = [
    # Ominous/Dark
    "Where {name} walks, silence follows.",
    "They say its shadow arrived three days before it did.",
    "The last thing they saw. The last thing they'll remember.",
    "It doesn't hunt. It simply... arrives.",
    "Some doors should never be opened. {name} is what waits behind them.",
    "Born from the void between stars.",
    "When the {element} dies, {name} feeds.",
    "It has no beginning. It will have no end.",
    "The ancient texts warned of this. We didn't listen.",
    "Even nightmares fear what {name} dreams.",

    # Epic/Powerful
    "Worlds have burned at its passing.",
    "The ground trembles. The sky weeps. {name} has awakened.",
    "Forged in the heart of a dying sun.",
    "A thousand armies fell. Only {name} remained standing.",
    "It speaks in thunder. It walks in flame.",
    "The gods themselves once knelt before {name}.",
    "When mountains crumble, they whisper its name.",
    "Reality bends. {name} does not.",
    "The storm doesn't rage around it. The storm IS it.",
    "Legends are born from lesser things.",

    # Mysterious/Cryptic
    "Some say it's ancient. Others say it was never young.",
    "It remembers the first dawn. It will witness the last.",
    "Questions have answers. {name} only has questions.",
    "The wise flee. The foolish learn.",
    "Three riddles. Three chances. No survivors yet.",
    "It exists between moments, feeding on forgotten seconds.",
    "The mirror shows what you fear. {name} shows what you are.",
    "Every path leads to {name}. Every path leads away from salvation.",
    "It knows your name. It has always known.",
    "Time flows around it like water around stone.",

    # Elemental/Nature
    "The {element} chose its champion. You're looking at it.",
    "When {element} needs a weapon, it calls upon {name}.",
    "Pure {element}. Pure destruction.",
    "The essence of {element} made manifest.",
    "A {element} storm given form and fury.",
    "Nature's answer to humanity's arrogance.",
    "The {element} does not negotiate. Neither does {name}.",
    "From the primal {element}, vengeance was born.",
    "Where {element} is strongest, {name} is absolute.",
    "The wild {element} cannot be tamed. Only unleashed.",

    # Threatening/Combat
    "Mercy is not in its vocabulary.",
    "It doesn't win battles. It ends them.",
    "Your armor means nothing. Your prayers mean less.",
    "Run if you wish. It enjoys the chase.",
    "The battlefield is its garden. Blood is its rain.",
    "It counts its victories in extinction events.",
    "Surrender is not an option it recognizes.",
    "The last sound is always the same: silence.",
    "War has many soldiers. {name} is war itself.",
    "It has never known defeat. It never will.",

    # Weird/Surreal
    "It smiles with mouths that aren't there.",
    "Reality is just a suggestion it ignores.",
    "The laws of nature filed a restraining order. It was denied.",
    "It dreams in colors that don't exist.",
    "Sanity is the first casualty.",
    "Looking at it too long invites... changes.",
    "It speaks backwards and time listens.",
    "The impossible is its native tongue.",
    "Logic breaks. {name} thrives in the fragments.",
    "It exists because reality forgot to say no.",

    # Short & Punchy
    "No mercy. No escape.",
    "The end begins here.",
    "Witness. Tremble. Fall.",
    "Unstoppable. Inevitable.",
    "Fear given form.",
    "Chaos incarnate.",
    "The reckoning arrives.",
    "All will kneel.",
    "Resistance is nostalgia.",
    "Hope dies screaming.",

    # Poetic/Beautiful
    "Beauty and devastation share the same face.",
    "A symphony of destruction, conducting itself.",
    "Grace and annihilation dancing as one.",
    "Poetry written in the language of ruin.",
    "The most beautiful endings are still endings.",
    "Elegance. Precision. Oblivion.",
    "Art and apocalypse are the same brushstroke.",
    "Perfection has teeth.",
    "The dance of death has found its partner.",
    "Flowers bloom where it weeps. Nothing else survives.",
]

def generate_bio(card):
    """Generate a dramatic one-liner bio."""
    name = card["name"]
    elements = card.get("elements", ["magic"])
    element = elements[0] if elements else "magic"

    # Pick a random template
    template = random.choice(DRAMATIC_BIOS)

    # Substitute placeholders
    bio = template.format(name=name, element=element)

    return bio

def main():
    with open("data/cards.json") as f:
        cards = json.load(f)

    print(f"Generating dramatic bios for {len(cards)} cards...")

    # Make sure we don't repeat too many templates
    random.shuffle(DRAMATIC_BIOS)

    for i, card in enumerate(cards):
        card["biography"] = generate_bio(card)

        if (i + 1) % 50 == 0:
            print(f"  Processed {i+1}/{len(cards)}")

    with open("data/cards.json", "w") as f:
        json.dump(cards, f, indent=2)

    print("\nDone! Sample bios:")
    for card in random.sample(cards, 5):
        print(f'  {card["name"]}: "{card["biography"]}"')

if __name__ == "__main__":
    main()
