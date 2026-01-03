# Legendary Cards Missing Special Moves

**Date:** 2026-01-03

## Summary
Out of 21 legendary cards in the game, only 2 have special abilities defined. The remaining 19 legendary cards need special moves added to be consistent with the rules stating "legendary cards each have unique special abilities."

## Cards WITH Special Moves (2)
1. **Infinite Duo** (`2_combined_infinite`) - HP: 1874
   - Ghost Army Caller: "Summons a spectral army to attack. Usable (players - 2) times. Cannot be reflected."
   - Doubler: "Double the effect of your next attack or defense."

2. **Universe Elemental** (`universe_elemental`) - HP: 1635
   - Ghost Army Caller: "Summons a spectral army to attack. Usable (players - 2) times. Cannot be reflected."

## Cards MISSING Special Moves (19)

### Spike Wall Series (7 cards)
| Card ID | Name | HP | Suggested Special Move |
|---------|------|-----|------------------------|
| spike_wall | Spike Wall | 1699 | Spike Shield (reflects 50% physical damage) |
| electric_spike_wall | Electric Spike Wall | 1629 | Chain Lightning (damage spreads to adjacent cards) |
| universe_spike_wall | Universe Spike Wall | 1867 | Cosmic Barrier (immune to one attack type) |
| water_spike_wall | Water Spike Wall | 1825 | Tidal Wave (hits all enemy cards for reduced damage) |
| fire_spike_wall | Fire Spike Wall | 1580 | Flame Aura (burn damage over time) |
| plant_spike_wall | Plant Spike Wall | 1969 | Regrowth (heal HP each turn) |
| earth_spike_wall | Earth Spike Wall | 1585 | Earthquake (stun opponent, skip their turn) |

### Elemental Trio Series (3 cards)
| Card ID | Name | HP | Suggested Special Move |
|---------|------|-----|------------------------|
| elemental_trio_water_lurker | Elemental Trio: Water Lurker | 1856 | Undertow (reduce enemy defense) |
| elemental_trio_earth_shaker | Elemental Trio: Earth Shaker | 1604 | Tremor (chance to stun) |
| elemental_trio_fire_starter | Elemental Trio: Fire Starter | 1532 | Ignite (burn damage over time) |

### Other Legendary Cards (9 cards)
| Card ID | Name | HP | Suggested Special Move |
|---------|------|-----|------------------------|
| galaxy_black_hole | Galaxy Black Hole | 1694 | Gravity Well (pull enemy cards, reduce dodge) |
| innercore_monster | Innercore Monster | 1977 | Core Meltdown (massive damage, damages self) |
| earthquake | Earthquake | 1993 | Aftershock (extra damage next turn) |
| fire_spike | Fire Spike | 1306 | Ember Storm (area damage) |
| goopy_ghost | Goopy Ghost | 1579 | Phase Shift (50% chance to avoid damage) |
| key_master | Key Master | 1641 | Unlock Potential (buff ally card) |
| snot_monster | Snot Monster | 1342 | Sticky Trap (slow enemy, reduce their attack) |
| tornado_terror | Tornado Terror | 1662 | Whirlwind (shuffle enemy card order) |
| wiggly_worm | Wiggly Worm | 1393 | Burrow (avoid next attack, auto-dodge) |

## Recommended Action
Add special_abilities to the cards.json file for each of these 19 legendary cards. Each special ability should:
1. Have a unique name fitting the card's theme
2. Include a description of the effect
3. Follow the limit pattern: most abilities usable 1-2 times per card

## Data Location
- File: `/Users/jmanning/monster-ghost-army-cards/data/cards.json`
- Each card needs a populated `special_abilities` array
