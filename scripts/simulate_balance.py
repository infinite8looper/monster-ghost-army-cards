#!/usr/bin/env python3
"""
Simulate battles to find the right balance for:
- 1M average HP
- Games lasting 3-4x deck size turns (30-40 turns for 10 cards, 2 players)
"""

import json
import random
from collections import defaultdict

# Load current cards for structure reference
with open('data/cards.json') as f:
    CARDS = json.load(f)

# Tier configurations - v5: final tuning for 30-40 turn games
# Each attack deals ~50-70% of same-tier HP, defense blocks ~10%
TIERS = {
    'weak': {'hp_range': (600_000, 800_000), 'atk_range': (450_000, 600_000), 'def_range': (20_000, 50_000)},
    'common': {'hp_range': (850_000, 1_100_000), 'atk_range': (550_000, 800_000), 'def_range': (35_000, 85_000)},
    'strong': {'hp_range': (1_100_000, 1_350_000), 'atk_range': (700_000, 1_000_000), 'def_range': (50_000, 110_000)},
    'legendary': {'hp_range': (1_500_000, 2_000_000), 'atk_range': (1_000_000, 1_400_000), 'def_range': (80_000, 160_000)},
}

# Element interaction modifiers (from game rules)
OPPOSITES = [('air', 'earth'), ('water', 'fire'), ('mecha', 'universe'), ('plant', 'magic')]
COMPLEMENTS = [('air', 'universe'), ('water', 'plant'), ('magic', 'fire'), ('mecha', 'earth')]

def get_attack_modifier(attack_element, defender_elements):
    """Calculate attack modifier based on element interactions."""
    for e1, e2 in OPPOSITES:
        if attack_element == e1 and e2 in defender_elements:
            return 0.5  # 50% damage reduction
        if attack_element == e2 and e1 in defender_elements:
            return 0.5

    for e1, e2 in COMPLEMENTS:
        if attack_element == e1 and e2 in defender_elements:
            return 1.5  # 50% damage increase
        if attack_element == e2 and e1 in defender_elements:
            return 1.5

    return 1.0

def get_defense_modifier(defense_element, attack_element):
    """Calculate defense modifier (reversed from attack)."""
    for e1, e2 in OPPOSITES:
        if defense_element == e1 and attack_element == e2:
            return 0.75  # Opposite defense vs attack: +25% damage taken
        if defense_element == e2 and attack_element == e1:
            return 0.75

    for e1, e2 in COMPLEMENTS:
        if defense_element == e1 and attack_element == e2:
            return 1.25  # Complementary defense: -25% damage taken
        if defense_element == e2 and attack_element == e1:
            return 1.25

    return 1.0

def generate_test_card(tier='common'):
    """Generate a test card with given tier stats."""
    config = TIERS[tier]
    elements = random.sample(['air', 'water', 'fire', 'earth', 'plant', 'mecha', 'magic', 'universe'],
                            random.choice([1, 2]))

    hp = random.randint(*config['hp_range'])

    # Generate 2-4 attacks
    num_attacks = random.randint(2, 4)
    attacks = []
    for _ in range(num_attacks):
        atk_element = random.choice(elements + ['magic'])  # Sometimes magic
        attacks.append({
            'element': atk_element,
            'damage': random.randint(*config['atk_range'])
        })

    # Generate 1-2 defenses
    num_defenses = random.randint(1, 2)
    defenses = []
    for _ in range(num_defenses):
        def_element = random.choice(elements)
        defenses.append({
            'element': def_element,
            'protection': random.randint(*config['def_range'])
        })

    return {
        'id': f'test_{random.randint(1000, 9999)}',
        'name': f'Test {tier.title()}',
        'tier': tier,
        'hp': hp,
        'max_hp': hp,
        'elements': elements,
        'attacks': attacks,
        'defenses': defenses
    }

def generate_deck(deck_size=10):
    """Generate a random deck with tier distribution."""
    # Tier distribution: 40% common, 25% weak, 25% strong, 10% legendary
    tiers = ['common'] * 4 + ['weak'] * 2 + ['strong'] * 3 + ['legendary'] * 1
    random.shuffle(tiers)

    deck = []
    for i in range(deck_size):
        tier = tiers[i % len(tiers)]
        deck.append(generate_test_card(tier))
    return deck

def simulate_attack(attacker_card, attack, defender_card, defense=None):
    """Simulate a single attack, return damage dealt."""
    base_damage = attack['damage']

    # Attack element modifier
    atk_mod = get_attack_modifier(attack['element'], defender_card['elements'])
    damage = base_damage * atk_mod

    # Apply defense if used
    if defense:
        protection = defense['protection']
        def_mod = get_defense_modifier(defense['element'], attack['element'])
        effective_protection = protection * def_mod
        damage = max(0, damage - effective_protection)

    return int(damage)

def simulate_game(deck_size=10, num_players=2, use_defense_prob=0.7):
    """
    Simulate a full game and return statistics.

    Rules simplified:
    - Players alternate turns
    - Each turn: pick an attacker card and a target
    - Defender may use a defense
    - When HP <= 0, card is eliminated
    - Game ends when one player has no cards left
    """
    # Generate decks
    players = []
    for p in range(num_players):
        deck = generate_deck(deck_size)
        players.append({
            'id': p,
            'cards': deck,
            'active_cards': deck.copy()
        })

    turn = 0
    current_player = 0
    attacks_made = 0
    cards_defeated = 0

    while True:
        turn += 1

        # Safety: prevent infinite games
        if turn > 500:
            break

        player = players[current_player]
        opponent = players[(current_player + 1) % num_players]

        # Check if game is over
        if not player['active_cards'] or not opponent['active_cards']:
            break

        # Pick random attacker and target
        attacker = random.choice(player['active_cards'])
        defender = random.choice(opponent['active_cards'])

        # Pick random attack
        attack = random.choice(attacker['attacks'])

        # Defender may use defense
        defense = None
        if defender['defenses'] and random.random() < use_defense_prob:
            defense = random.choice(defender['defenses'])

        # Calculate damage
        damage = simulate_attack(attacker, attack, defender, defense)
        defender['hp'] -= damage
        attacks_made += 1

        # Check if defender is defeated
        if defender['hp'] <= 0:
            opponent['active_cards'].remove(defender)
            cards_defeated += 1

        current_player = (current_player + 1) % num_players

    # Determine winner
    winner = None
    for p in players:
        if p['active_cards']:
            winner = p['id']

    return {
        'turns': turn,
        'attacks_made': attacks_made,
        'cards_defeated': cards_defeated,
        'winner': winner
    }

def run_simulations(num_games=1000, deck_size=10, num_players=2):
    """Run multiple game simulations and report statistics."""
    results = []

    for _ in range(num_games):
        result = simulate_game(deck_size, num_players)
        results.append(result)

    turns = [r['turns'] for r in results]
    attacks = [r['attacks_made'] for r in results]

    print(f"\n=== Simulation Results ({num_games} games) ===")
    print(f"Deck size: {deck_size}, Players: {num_players}")
    print(f"Target turns: {deck_size * 3}-{deck_size * 4} ({deck_size * 3} to {deck_size * 4})")
    print()
    print(f"Turns: min={min(turns)}, max={max(turns)}, avg={sum(turns)/len(turns):.1f}")
    print(f"Attacks: min={min(attacks)}, max={max(attacks)}, avg={sum(attacks)/len(attacks):.1f}")

    # Distribution
    short_games = sum(1 for t in turns if t < deck_size * 2)
    target_games = sum(1 for t in turns if deck_size * 3 <= t <= deck_size * 4)
    long_games = sum(1 for t in turns if t > deck_size * 5)

    print()
    print(f"Short games (<{deck_size * 2} turns): {short_games} ({short_games/num_games*100:.1f}%)")
    print(f"Target range ({deck_size * 3}-{deck_size * 4} turns): {target_games} ({target_games/num_games*100:.1f}%)")
    print(f"Long games (>{deck_size * 5} turns): {long_games} ({long_games/num_games*100:.1f}%)")

    return results

def analyze_cards():
    """Analyze current card distribution."""
    print("\n=== Current Card Analysis ===")

    tier_counts = defaultdict(int)
    for card in CARDS:
        tier_counts[card.get('tier', 'unknown')] += 1

    print(f"Total cards: {len(CARDS)}")
    for tier, count in sorted(tier_counts.items()):
        print(f"  {tier}: {count}")

def suggest_stats():
    """Print suggested stat ranges for each tier."""
    print("\n=== Suggested Stat Ranges ===")
    print("(All values in raw numbers, no need for 10000x multiplier)")
    print()

    for tier, config in TIERS.items():
        hp_min, hp_max = config['hp_range']
        atk_min, atk_max = config['atk_range']
        def_min, def_max = config['def_range']

        print(f"{tier.upper()}:")
        print(f"  HP: {hp_min:,} - {hp_max:,}")
        print(f"  Attack: {atk_min:,} - {atk_max:,}")
        print(f"  Defense: {def_min:,} - {def_max:,}")
        print()

if __name__ == '__main__':
    analyze_cards()
    suggest_stats()

    print("\n" + "="*50)
    print("Running simulations with proposed stats...")
    print("="*50)

    # Run simulations with different deck sizes
    for deck_size in [10, 15]:
        run_simulations(num_games=500, deck_size=deck_size, num_players=2)
