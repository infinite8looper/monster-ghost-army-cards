# Session Notes: Battle Card Visual Consistency

**Date:** 2026-01-03

## Summary
Fixed battle mode cards to be visually consistent with draft mode cards.

## Issues Addressed

1. **Scrolling issue in battle mode** - Cards were too large, making it impossible to scroll down to select attack cards.

2. **Card appearance mismatch** - Battle mode cards had an HP bar ON the card, while draft mode cards have stats (HP/ATK/DEF) at the bottom.

3. **HP display location** - Moved current health display to BELOW each card (external), not on the card itself.

4. **Info button behavior** - Made the info button flip the card over (like draft mode) instead of opening a modal.

## Files Modified

### `/Users/jmanning/monster-ghost-army-cards/js/game.js`
- Added `createBattleCardElement()` function - creates cards with flip animation matching draft mode
- Added helper functions: `capitalizeFirst()`, `getAvgAttack()`, `getAvgDefense()`
- Updated `renderOpponentCardsInContainer()` to use the new battle card element

### `/Users/jmanning/monster-ghost-army-cards/css/styles.css`
Added new CSS section "Battle Mode Cards - Consistent with Draft Mode" with:
- `.battle-card-wrapper` - wrapper for card + external HP display
- `.battle-card` - 120x165px cards (smaller than draft 160x220px for better fit)
- `.battle-card .card-flipper` - 3D flip animation support
- `.battle-card .card-front/back` - front and back face styles
- `.external-hp-display` - HP bar and text displayed below cards
- Tier styling for battle cards (weak, common, strong, legendary)
- Card texture overlay

### `/Users/jmanning/monster-ghost-army-cards/js/ui.js`
- Updated `highlightCard()` to support both `.game-card` and `.battle-card` elements
- Updated `clearHighlights()` to clear both card types
- Updated `updateCardHP()` to update both old-style HP bars and new external HP displays

## Card Structure Comparison

### Draft Mode Card (160x220px)
```
+------------------+
| [i]     [Tier]   |
|                  |
|   [Card Image]   |
|                  |
|    Card Name     |
|   [Elements]     |
| HP: xx ATK: DEF: |
+------------------+
```

### Battle Mode Card (120x165px)
```
+------------------+
| [i]     [Tier]   |
|   [Card Image]   |
|    Card Name     |
|   [Elements]     |
| HP: xx ATK: DEF: |
+------------------+
    [====HP====]
    123K / 500K
```

## Key Design Decisions

1. Battle cards are smaller (120x165px vs 160x220px) to fit more cards on screen without scrolling
2. HP is displayed externally below cards so cards look identical in all views
3. Info button flips card to show back (attacks, defenses, specials) - consistent with draft mode
4. All card styling (tiers, textures, animations) matches draft mode exactly
