# Session Notes: Implementing Legendary Special Abilities

**Date:** 2026-01-03

## Summary

Implemented a complete special abilities system for legendary cards in Monster Ghost Army Cards.

## Files Created/Modified

### New File: `/js/specialAbilities.js`
A comprehensive module that handles all legendary special moves including:

**LEGENDARY_ABILITIES Definitions:**
- Damage Modifiers: spike_shield, chain_lightning, core_meltdown, aftershock, ember_storm, tidal_wave
- Defense/Dodge: cosmic_barrier, burrow, phase_shift
- Debuffs: undertow, sticky_trap, gravity_well
- Buffs: regrowth, unlock_potential
- Status Effects: flame_aura, ignite, earthquake_stun, tremor
- Unique: whirlwind (shuffle card ownership)

**Status Effect Tracking System:**
- `createStatusEffectsState()` - Initialize tracking
- `applyStatusEffect()` - Apply buffs/debuffs/shields/stuns/DoTs
- `isCardStunned()` - Check stun status
- `getCardShield()` / `consumeShieldCharge()` - Shield management
- `getAttackModifier()` / `getDefenseModifier()` - Status-based modifiers
- `canCardDodge()` - Check for Gravity Well prevention
- `processStartOfTurn()` - Handle DoTs, reduce durations

**Ability Tracking:**
- `canUseAbility()` - Check remaining uses
- `recordSpecialAbilityUse()` - Track usage
- `getAvailableAbilities()` - Get usable abilities for a card
- `executeSpecialAbility()` - Execute with full effect processing

### Modified: `/js/battle.js`
- Imported special abilities functions
- Updated `calculateDamage()` to apply status effect modifiers (buffs/debuffs)
- Updated `processBattleRound()` to handle:
  - Phase Shift passive dodge (50% chance)
  - Active shields (Cosmic Barrier, Burrow)
  - Gravity Well prevention of teleport
  - Core Meltdown damage boost and recoil
  - Spike Shield reflection
  - Chain Lightning processing
  - On-attack effects (Ignite, Tremor)
  - Status effect consumption after attacks/defenses
- Added new export: `processCardTurnStart()` for DoT/stun handling

### Modified: `/js/game.js`
- Imported special abilities functions and LEGENDARY_ABILITIES
- Added `statusEffects`, `pendingChainLightning`, `pendingCoreMeltdown`, `pendingAbility` to game state
- Initialize `statusEffects` on game start
- Show special abilities panel when selecting a card with abilities
- New functions:
  - `handleSpecialAbilitySelect()` - Process ability selection
  - `executeAbility()` - Execute ability with full UI feedback
- Updated `handleCardClick()` to handle pending ability targeting
- Updated `executeAITurn()` to consider using special abilities
- Updated `resetGame()` to clear all new state

### Modified: `/js/ai.js`
- Imported `getAvailableAbilities` and `LEGENDARY_ABILITIES`
- New export: `getAISpecialAbilityChoice()` - AI decision making for abilities
- Added `evaluateAbilityUse()` for smarter ability selection

### Modified: `/js/ui.js`
- New export: `showSpecialAbilityOptions()` - Display ability buttons
- New export: `showStatusEffects()` - Visual status effect indicators
- Updated `hideActionPanel()` to also hide special abilities panel

### Modified: `/css/styles.css`
Added styles for:
- `.special-abilities-panel` - Container for ability buttons
- `.special-ability-btn` - Individual ability buttons with type-based colors
- `.ability-type-*` - Color coding by ability type
- `.status-indicators` - Container for effect icons
- `.status-*` - Status effect indicator badges (buff, debuff, shield, stun, dot)
- `.log-special` - Special log entry styling

## Ability Usage Limits

| Ability | Uses |
|---------|------|
| Most abilities | 1-2 |
| Phase Shift | Unlimited (50% chance passive) |
| Regrowth | 2 |
| Aftershock | 2 |
| Undertow | 2 |
| Ignite | 2 |
| Tremor | 2 |

## Cards with Special Abilities (21 Legendary)

All 21 legendary cards in cards.json already have special abilities defined:
- Spike Wall series (7): spike_shield, chain_lightning, cosmic_barrier, tidal_wave, flame_aura, regrowth, earthquake
- Elemental Trio (3): undertow, tremor, ignite
- Other legendaries (11): gravity_well, core_meltdown, aftershock, ember_storm, phase_shift, unlock_potential, sticky_trap, whirlwind, burrow, ghost_army_caller, doubler

## Testing Notes

The system is designed with:
- Real damage calculations (no mocks)
- Proper status effect duration tracking
- AI decision making for special abilities (30% chance to use)
- Visual feedback through UI status indicators
- Battle log integration

## Next Steps

1. Test special abilities in actual gameplay
2. Add sound effects for ability activation
3. Consider visual animations for specific abilities
4. Balance ability power levels based on playtesting
