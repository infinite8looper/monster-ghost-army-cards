# Monster Ghost Army Cards

A fantasy deck-building battle game for 2-8 players featuring 96 hand-drawn monster and ghost cards. Build your army, clash with opponents, and become the last player standing!

**[Play the Game](https://infinite8looper.github.io/monster-ghost-army-cards/)**

---

## Play the Game

Visit the live game at: https://infinite8looper.github.io/monster-ghost-army-cards/

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/infinite8looper/monster-ghost-army-cards.git
cd monster-ghost-army-cards

# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

For development with live reload, you can use any static file server of your choice.

---

## Project Structure

```
monster-ghost-army-cards/
├── index.html              # Main game entry point
├── css/
│   └── styles.css          # Game styling with fantasy theme
├── js/
│   ├── game.js             # Core game state management
│   ├── cards.js            # Card loading and rendering
│   ├── battle.js           # Combat mechanics and damage calculation
│   ├── drafting.js         # Card selection/drafting phase
│   ├── setup.js            # Game initialization
│   ├── ui.js               # User interface interactions
│   └── ai.js               # AI opponent logic
├── data/
│   └── cards.json          # Card definitions (stats, attacks, elements)
├── assets/
│   └── images/
│       ├── generated/      # AI-generated card artwork (96 cards)
│       └── elements/       # Element type icons (8 elements)
├── scripts/                # Python utilities for card management
└── images/
    └── orig/               # Original hand-drawn card photos
```

---

## Creating New Cards

1. **Add card image** to `assets/images/generated/` with naming format: `card_name_generated.png`

2. **Edit `data/cards.json`** with card details:
```json
{
  "id": "card_id",
  "name": "Card Name",
  "elements": ["fire", "magic"],
  "tier": "common",
  "hp": 1000000,
  "attacks": [
    {
      "name": "Attack Name",
      "description": "What it does",
      "base_damage": 700000,
      "element": "fire"
    }
  ],
  "defenses": [],
  "special_abilities": [],
  "biography": "A brief fantasy-style description..."
}
```

3. **Run rebalance script** if needed:
```bash
python3 scripts/rebalance_cards.py
```

---

## Editing Existing Cards

Card data is stored in `data/cards.json`. Each card includes:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (lowercase, underscores) |
| `name` | Display name |
| `elements` | Array of 1-2 elements |
| `tier` | Power level: `weak`, `common`, `strong`, `legendary` |
| `hp` | Hit points |
| `attacks` | Array of attack objects |
| `defenses` | Array of defense objects |
| `special_abilities` | Special moves (bounce back, teleport, etc.) |
| `biography` | Flavor text for the card |

### Stat Ranges by Tier

| Tier | HP Range | Attack Damage | Defense |
|------|----------|---------------|---------|
| Weak | 600K - 800K | 450K - 600K | 20K - 50K |
| Common | 850K - 1.1M | 550K - 800K | 35K - 85K |
| Strong | 1.1M - 1.35M | 700K - 1M | 50K - 110K |
| Legendary | 1.5M - 2M | 1M - 1.4M | 80K - 160K |

### Elements

Eight elements available: `air`, `water`, `fire`, `earth`, `universe`, `plant`, `mecha`, `magic`

**Opposite pairs** (50% damage reduction): air/earth, water/fire, mecha/universe, plant/magic

**Complementary pairs** (50% damage increase): air/universe, water/plant, magic/fire, mecha/earth

---

## Utility Scripts

All scripts are in the `scripts/` directory. Run from project root.

| Script | Description |
|--------|-------------|
| `rebalance_cards.py` | Rebalance all card stats based on tier configurations |
| `simulate_balance.py` | Simulate battles to test game balance (target: 30-40 turns) |
| `extract_card_data.py` | Extract card data from hand-drawn images using Gemini Vision |
| `preprocess_images.py` | Rotate and crop original card photos |
| `generate_elements.py` | Generate element icons using Stable Diffusion |
| `generate_prompts.py` | Create AI prompts for card art generation |
| `gemini_generate.py` | Generate card artwork using Gemini |
| `sd_generate.py` | Generate card artwork using Stable Diffusion |
| `generate_bios.py` | Generate fantasy biographies for cards |
| `enhance_cards.py` | Enhance card data with additional details |
| `add_new_cards.py` | Add new cards to the dataset |
| `merge_extracted_cards.py` | Merge extracted card batches |

### Example Usage

```bash
# Rebalance all cards to target stats
python3 scripts/rebalance_cards.py

# Simulate 100 games to check balance
python3 scripts/simulate_balance.py

# Extract card data from a new image
python3 scripts/extract_card_data.py --single PXL_20260101_190708125.jpg

# Preprocess all card images
python3 scripts/preprocess_images.py --all
```

---

## Game Rules

### Setup
1. Each player drafts 10 cards from the deck (random turn order each round)
2. Players take turns selecting one available card until all have 10

### Gameplay
1. Turns proceed in rounds with consistent player order
2. On your turn: select one of your cards to attack any opponent's card
3. Damage is calculated based on attack power, elements, and defenses
4. Cards at 0 HP are eliminated
5. Players with no cards remaining are out
6. Last player standing wins!

### Special Moves
- **Black Hole / Summon Ghost Army**: Powerful attacks, usable (num_players - 2) times
- **Bounce Back**: Reflects 75% damage to attacker, usable twice (cannot reflect Black Hole/Ghost Army)
- **Teleport**: Dodge attack entirely, usable once

For complete rules, see the **[How to Play](https://infinite8looper.github.io/monster-ghost-army-cards/how-to-play.html)** page.

---

## Contributing

Contributions are welcome! Here's how to help:

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test locally
4. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines
- Test all changes locally before submitting
- Ensure cards are balanced using `simulate_balance.py`
- Follow existing code style and naming conventions
- Update documentation for any new features

---

## License

This project is open source. Card artwork is AI-generated based on original hand-drawn designs.

---

## Credits

- Original hand-drawn card designs: The Monster Ghost Army team
- Game development: Built with vanilla JavaScript, HTML5, and CSS3
- AI artwork: Generated using Stable Diffusion and Google Gemini
