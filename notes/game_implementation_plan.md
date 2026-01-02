# Monster Ghost Army Cards - Full Game Implementation Plan

**Status**: In Progress
**Date**: 2026-01-02
**Last Updated**: Session start

## Overview

Building a complete 2-8 player deck-building battle game with:
1. Player setup screen
2. Card drafting phase (10 rounds)
3. Battle phase
4. AI players
5. Sound effects

## Current State

- All 96 cards have generated images in `assets/images/generated/`
- 8 element icons in `assets/images/elements/`
- Card data in `data/cards.json` with stats (hp, attacks, defenses, elements, tiers)
- Basic HTML structure exists but needs expansion
- Basic game.js has demo mode, needs full game flow

## Game Phases

### Phase 1: Player Setup
- [ ] Add setup screen HTML (modal or screen)
- [ ] Player count selector (2-8)
- [ ] Player name inputs
- [ ] AI player toggles
- [ ] "Start Game" button
- [ ] Store player configs in gameState

### Phase 2: Card Drafting (10 rounds)
- [ ] Drafting screen HTML
- [ ] Card gallery with all 96 cards
- [ ] Scrollable card display
- [ ] Card sorting (by health, attack, defense, element, tier)
- [ ] Card filtering by element
- [ ] Click to select card
- [ ] Selected cards panel for each player
- [ ] Turn-based selection (random order each round)
- [ ] AI auto-select (random from available)
- [ ] Visual feedback for selected/unavailable cards
- [ ] Round counter
- [ ] "Confirm Selection" button

### Phase 3: Battle
- [ ] Turn order display
- [ ] Current player's cards at bottom (large, interactive)
- [ ] Other players' cards organized by player (selectable targets)
- [ ] Attack flow:
  1. Select attacking card
  2. Select attack move
  3. Select target card from another player
  4. Execute attack
  5. Defender prompted to select defense (or skip)
  6. Calculate damage with element modifiers
  7. Update HP
  8. Check for defeated cards
  9. Check for eliminated players
  10. Check for winner
- [ ] Special ability tracking (limited uses)
- [ ] Bounce back mechanics
- [ ] Teleport dodge mechanics
- [ ] Slime spike mechanics

### Phase 4: AI Logic
- [ ] Simple random AI
- [ ] AI selects random card from their hand
- [ ] AI selects random valid attack
- [ ] AI selects random target from opponents
- [ ] AI selects random defense (or skip)

### Phase 5: Polish
- [ ] Sound effects library
- [ ] Attack sounds
- [ ] Defense sounds
- [ ] UI click sounds
- [ ] Victory/defeat sounds
- [ ] Card flip sounds
- [ ] Battle background image
- [ ] Animations for attacks

## File Changes Needed

### HTML (index.html)
- Add player setup screen
- Add drafting screen
- Improve battle screen layout

### CSS (css/styles.css)
- Setup screen styles
- Drafting gallery styles
- Card sorting/filtering UI
- Multi-player card layouts

### JavaScript
- `js/game.js` - Game state and flow
- `js/setup.js` - Player setup logic (NEW)
- `js/drafting.js` - Card drafting phase (NEW)
- `js/battle.js` - Battle calculations (EXISTS, needs expansion)
- `js/ai.js` - AI player logic (NEW)
- `js/audio.js` - Sound effects (NEW)
- `js/cards.js` - Card data (EXISTS)
- `js/ui.js` - UI helpers (EXISTS, needs expansion)

## Element Interactions (Reference)

**Opposites (50% damage reduction):**
- Air ↔ Earth
- Water ↔ Fire
- Mecha ↔ Universe
- Plant ↔ Magic

**Complements (50% damage increase):**
- Air → Universe
- Water → Plant
- Magic → Fire
- Mecha → Earth

**Defense Interactions (reversed):**
- Opposite attack/defense: +25% damage
- Complementary attack/defense: -25% damage

## Special Abilities

| Ability | Uses | Notes |
|---------|------|-------|
| Black Hole | (players - 2) | Cannot be bounced back |
| Summon Ghost Army | (players - 2) | Cannot be bounced back |
| Bounce Back | 2 | Reflects 75% damage |
| Teleport | 1 | Dodges attack entirely |
| Slime Spikes | varies | Reduces mecha attack efficacy by 75% permanently |

## Progress Tracking

- [x] Commit element images
- [ ] Create setup screen
- [ ] Create drafting interface
- [ ] Implement battle mechanics
- [ ] Add AI players
- [ ] Add sound effects
- [ ] Full testing
