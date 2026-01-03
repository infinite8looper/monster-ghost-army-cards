/**
 * Monster Ghost Army Cards - Legendary Special Abilities Module
 *
 * This module handles all legendary special moves, status effects,
 * buffs, debuffs, and ability tracking.
 */

import { formatHP } from './cards.js';

// ============================================================================
// SPECIAL ABILITY DEFINITIONS
// ============================================================================

/**
 * All special abilities with their configurations
 * Each ability has:
 * - name: Display name
 * - description: What it does
 * - type: 'damage_modifier' | 'defense_dodge' | 'debuff' | 'buff' | 'status' | 'unique'
 * - trigger: 'active' (button press) | 'passive' (auto-applies) | 'on_attack' | 'on_defense'
 * - uses: Maximum uses per card per game (null = unlimited)
 * - effect: Configuration for the effect
 */
export const LEGENDARY_ABILITIES = {
    // === DAMAGE MODIFIERS ===
    'spike_shield': {
        name: 'Spike Shield',
        description: 'Reflects 50% of physical damage back to attacker',
        type: 'damage_modifier',
        trigger: 'active',
        uses: 1,
        duration: 1, // Lasts for one incoming attack
        effect: {
            reflectPercent: 0.5,
            damageType: 'physical' // Only reflects physical (non-magic) damage
        }
    },
    'chain_lightning': {
        name: 'Chain Lightning',
        description: 'Hit additional enemy card for 50% damage',
        type: 'damage_modifier',
        trigger: 'on_attack',
        uses: 2,
        effect: {
            chainDamagePercent: 0.5,
            chainTargets: 1
        }
    },
    'core_meltdown': {
        name: 'Core Meltdown',
        description: 'Deal 200% damage but take 25% recoil',
        type: 'damage_modifier',
        trigger: 'active',
        uses: 1,
        effect: {
            damageMultiplier: 2.0,
            recoilPercent: 0.25
        }
    },
    'aftershock': {
        name: 'Aftershock',
        description: 'Next attack deals 50% bonus damage',
        type: 'damage_modifier',
        trigger: 'active',
        uses: 2,
        duration: 1, // Buff for next attack
        effect: {
            bonusDamagePercent: 0.5
        }
    },
    'ember_storm': {
        name: 'Ember Storm',
        description: '30% damage to all enemies',
        type: 'damage_modifier',
        trigger: 'active',
        uses: 1,
        effect: {
            aoeDamagePercent: 0.3,
            element: 'fire'
        }
    },
    'tidal_wave': {
        name: 'Tidal Wave',
        description: '40% damage to all enemies',
        type: 'damage_modifier',
        trigger: 'active',
        uses: 1,
        effect: {
            aoeDamagePercent: 0.4,
            element: 'water'
        }
    },

    // === DEFENSE/DODGE ===
    'cosmic_barrier': {
        name: 'Cosmic Barrier',
        description: 'Immune to next attack',
        type: 'defense_dodge',
        trigger: 'active',
        uses: 1,
        duration: 1, // Protects from next attack
        effect: {
            immuneToAttacks: 1
        }
    },
    'burrow': {
        name: 'Burrow',
        description: 'Auto-dodge next attack',
        type: 'defense_dodge',
        trigger: 'active',
        uses: 1,
        duration: 1,
        effect: {
            autoDodge: true
        }
    },
    'phase_shift': {
        name: 'Phase Shift',
        description: '50% chance to avoid attack',
        type: 'defense_dodge',
        trigger: 'passive', // Always active on this card
        uses: null, // Unlimited, but 50% chance
        effect: {
            dodgeChance: 0.5
        }
    },

    // === DEBUFFS ===
    'undertow': {
        name: 'Undertow',
        description: 'Reduce target defense by 50% for next defense',
        type: 'debuff',
        trigger: 'active',
        uses: 2,
        duration: 1, // Affects next defense
        effect: {
            defenseReduction: 0.5
        }
    },
    'sticky_trap': {
        name: 'Sticky Trap',
        description: 'Reduce target attack by 30% for next 2 attacks',
        type: 'debuff',
        trigger: 'active',
        uses: 1,
        duration: 2, // Affects 2 attacks
        effect: {
            attackReduction: 0.3
        }
    },
    'gravity_well': {
        name: 'Gravity Well',
        description: 'Prevent dodge/teleport for 2 turns',
        type: 'debuff',
        trigger: 'active',
        uses: 1,
        duration: 2, // 2 turns
        effect: {
            preventDodge: true,
            preventTeleport: true
        }
    },

    // === BUFFS ===
    'regrowth': {
        name: 'Regrowth',
        description: 'Heal 25% of max HP',
        type: 'buff',
        trigger: 'active',
        uses: 2,
        effect: {
            healPercent: 0.25
        }
    },
    'unlock_potential': {
        name: 'Unlock Potential',
        description: 'Boost ally attack by 50% for next attack',
        type: 'buff',
        trigger: 'active',
        uses: 1,
        duration: 1,
        effect: {
            attackBoost: 0.5,
            targetType: 'ally' // Must target ally card
        }
    },

    // === STATUS EFFECTS ===
    'flame_aura': {
        name: 'Flame Aura',
        description: 'Burn damage (20% of attack) for 3 turns',
        type: 'status',
        trigger: 'active',
        uses: 1,
        duration: 3,
        effect: {
            burnDamagePercent: 0.2, // Based on attacker's attack power
            element: 'fire'
        }
    },
    'ignite': {
        name: 'Ignite',
        description: 'Burn damage (15% of attack) for 3 turns',
        type: 'status',
        trigger: 'on_attack', // Applied when attacking
        uses: 2,
        duration: 3,
        effect: {
            burnDamagePercent: 0.15,
            element: 'fire'
        }
    },
    'earthquake_stun': {
        name: 'Earthquake',
        description: 'Stun (skip turn)',
        type: 'status',
        trigger: 'active',
        uses: 1,
        duration: 1, // Skip 1 turn
        effect: {
            stun: true
        }
    },
    'tremor': {
        name: 'Tremor',
        description: '50% chance stun',
        type: 'status',
        trigger: 'on_attack',
        uses: 2,
        effect: {
            stunChance: 0.5,
            stunDuration: 1
        }
    },

    // === UNIQUE ===
    'whirlwind': {
        name: 'Whirlwind',
        description: 'Shuffle card ownership among enemies (preserve card count per player, preserve all stats including current HP)',
        type: 'unique',
        trigger: 'active',
        uses: 1,
        effect: {
            shuffleOwnership: true
        }
    }
};

// ============================================================================
// STATUS EFFECT TRACKING
// ============================================================================

/**
 * Create an empty status effects tracker
 * @returns {Object} Empty status effects state
 */
export function createStatusEffectsState() {
    return {
        // Active buffs on cards: { cardId: [{ abilityId, remainingDuration, effect, sourceCardId }] }
        buffs: {},
        // Active debuffs on cards: { cardId: [{ abilityId, remainingDuration, effect, sourceCardId }] }
        debuffs: {},
        // Burn/DoT effects: { cardId: [{ abilityId, remainingDuration, damagePerTurn, sourceCardId }] }
        dots: {},
        // Stun effects: { cardId: { remainingTurns, sourceCardId } }
        stuns: {},
        // Immunity/dodge effects: { cardId: { abilityId, remainingCharges, effect } }
        shields: {},
        // Next attack modifiers: { cardId: [{ abilityId, modifier, remainingUses }] }
        attackModifiers: {},
        // Next defense modifiers: { cardId: [{ abilityId, modifier, remainingUses }] }
        defenseModifiers: {}
    };
}

/**
 * Apply a status effect to a card
 * @param {Object} statusEffects - Status effects state
 * @param {string} targetCardId - Card receiving the effect
 * @param {string} abilityId - Ability being applied
 * @param {string} sourceCardId - Card that applied the effect
 * @param {Object} effectConfig - Effect configuration
 */
export function applyStatusEffect(statusEffects, targetCardId, abilityId, sourceCardId, effectConfig) {
    const ability = LEGENDARY_ABILITIES[abilityId];
    if (!ability) return;

    const effectData = {
        abilityId,
        sourceCardId,
        remainingDuration: ability.duration || 1,
        effect: effectConfig || ability.effect,
        appliedAt: Date.now()
    };

    switch (ability.type) {
        case 'buff':
            if (!statusEffects.buffs[targetCardId]) {
                statusEffects.buffs[targetCardId] = [];
            }
            statusEffects.buffs[targetCardId].push(effectData);
            break;

        case 'debuff':
            if (!statusEffects.debuffs[targetCardId]) {
                statusEffects.debuffs[targetCardId] = [];
            }
            statusEffects.debuffs[targetCardId].push(effectData);
            break;

        case 'status':
            if (ability.effect.stun || ability.effect.stunChance) {
                // Check for stun chance
                if (ability.effect.stunChance && Math.random() > ability.effect.stunChance) {
                    return; // Stun didn't proc
                }
                statusEffects.stuns[targetCardId] = {
                    remainingTurns: ability.effect.stunDuration || ability.duration || 1,
                    sourceCardId
                };
            }
            if (ability.effect.burnDamagePercent) {
                if (!statusEffects.dots[targetCardId]) {
                    statusEffects.dots[targetCardId] = [];
                }
                statusEffects.dots[targetCardId].push({
                    ...effectData,
                    damagePercent: ability.effect.burnDamagePercent
                });
            }
            break;

        case 'defense_dodge':
            statusEffects.shields[targetCardId] = {
                abilityId,
                remainingCharges: ability.effect.immuneToAttacks || 1,
                effect: ability.effect
            };
            break;

        case 'damage_modifier':
            if (ability.effect.reflectPercent) {
                // Spike Shield type - add to shields
                statusEffects.shields[targetCardId] = {
                    abilityId,
                    remainingCharges: 1,
                    effect: ability.effect
                };
            }
            if (ability.effect.bonusDamagePercent) {
                // Aftershock type - add to attack modifiers
                if (!statusEffects.attackModifiers[targetCardId]) {
                    statusEffects.attackModifiers[targetCardId] = [];
                }
                statusEffects.attackModifiers[targetCardId].push({
                    abilityId,
                    modifier: 1 + ability.effect.bonusDamagePercent,
                    remainingUses: ability.duration || 1
                });
            }
            break;
    }
}

/**
 * Check if a card is stunned
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card to check
 * @returns {boolean} True if card is stunned
 */
export function isCardStunned(statusEffects, cardId) {
    const stun = statusEffects.stuns[cardId];
    return stun && stun.remainingTurns > 0;
}

/**
 * Check if a card has a shield (dodge/immunity)
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card to check
 * @returns {Object|null} Shield data or null
 */
export function getCardShield(statusEffects, cardId) {
    return statusEffects.shields[cardId] || null;
}

/**
 * Consume a shield charge
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card with shield
 */
export function consumeShieldCharge(statusEffects, cardId) {
    const shield = statusEffects.shields[cardId];
    if (shield) {
        shield.remainingCharges--;
        if (shield.remainingCharges <= 0) {
            delete statusEffects.shields[cardId];
        }
    }
}

/**
 * Get attack modifier for a card
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card to check
 * @returns {number} Damage multiplier (1.0 = no change)
 */
export function getAttackModifier(statusEffects, cardId) {
    let modifier = 1.0;

    // Check buffs (attack boosts)
    const buffs = statusEffects.buffs[cardId] || [];
    buffs.forEach(buff => {
        if (buff.effect.attackBoost) {
            modifier *= (1 + buff.effect.attackBoost);
        }
    });

    // Check attack modifiers (aftershock, etc)
    const atkMods = statusEffects.attackModifiers[cardId] || [];
    atkMods.forEach(mod => {
        modifier *= mod.modifier;
    });

    // Check debuffs (attack reductions)
    const debuffs = statusEffects.debuffs[cardId] || [];
    debuffs.forEach(debuff => {
        if (debuff.effect.attackReduction) {
            modifier *= (1 - debuff.effect.attackReduction);
        }
    });

    return modifier;
}

/**
 * Get defense modifier for a card
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card to check
 * @returns {number} Defense multiplier (1.0 = no change)
 */
export function getDefenseModifier(statusEffects, cardId) {
    let modifier = 1.0;

    // Check debuffs (defense reductions like undertow)
    const debuffs = statusEffects.debuffs[cardId] || [];
    debuffs.forEach(debuff => {
        if (debuff.effect.defenseReduction) {
            modifier *= (1 - debuff.effect.defenseReduction);
        }
    });

    return modifier;
}

/**
 * Check if a card can dodge/teleport
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card to check
 * @returns {boolean} True if card can dodge
 */
export function canCardDodge(statusEffects, cardId) {
    // Check for Gravity Well debuff
    const debuffs = statusEffects.debuffs[cardId] || [];
    for (const debuff of debuffs) {
        if (debuff.effect.preventDodge || debuff.effect.preventTeleport) {
            return false;
        }
    }
    return true;
}

/**
 * Process start of turn effects (DoTs, stun reduction, etc)
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card whose turn is starting
 * @param {Object} gameState - Game state for HP updates
 * @returns {Array} Array of log messages
 */
export function processStartOfTurn(statusEffects, cardId, gameState) {
    const logs = [];

    // Process DoT effects (burns)
    const dots = statusEffects.dots[cardId] || [];
    dots.forEach(dot => {
        if (dot.remainingDuration > 0) {
            // Calculate burn damage based on source card's attack
            const sourceCard = gameState.players
                ?.flatMap(p => p.cards)
                .find(c => c === dot.sourceCardId);

            // Use a base damage value if we can't find the source
            const baseDamage = 100000; // Default burn damage
            const burnDamage = Math.round(baseDamage * dot.damagePercent);

            // Apply burn damage
            if (gameState.cardHP[cardId] !== undefined) {
                gameState.cardHP[cardId] = Math.max(0, gameState.cardHP[cardId] - burnDamage);
                logs.push(`Burn deals ${formatHP(burnDamage)} damage!`);
            }

            dot.remainingDuration--;
        }
    });

    // Clean up expired DoTs
    statusEffects.dots[cardId] = dots.filter(d => d.remainingDuration > 0);

    // Reduce stun duration
    const stun = statusEffects.stuns[cardId];
    if (stun && stun.remainingTurns > 0) {
        stun.remainingTurns--;
        if (stun.remainingTurns <= 0) {
            delete statusEffects.stuns[cardId];
            logs.push('Stun wore off!');
        }
    }

    // Reduce buff durations
    const buffs = statusEffects.buffs[cardId] || [];
    buffs.forEach(buff => {
        if (buff.remainingDuration > 0) {
            buff.remainingDuration--;
        }
    });
    statusEffects.buffs[cardId] = buffs.filter(b => b.remainingDuration > 0);

    // Reduce debuff durations
    const debuffs = statusEffects.debuffs[cardId] || [];
    debuffs.forEach(debuff => {
        if (debuff.remainingDuration > 0) {
            debuff.remainingDuration--;
        }
    });
    statusEffects.debuffs[cardId] = debuffs.filter(d => d.remainingDuration > 0);

    return logs;
}

/**
 * Consume attack modifier after attack
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card that attacked
 */
export function consumeAttackModifier(statusEffects, cardId) {
    const mods = statusEffects.attackModifiers[cardId] || [];
    mods.forEach(mod => {
        mod.remainingUses--;
    });
    statusEffects.attackModifiers[cardId] = mods.filter(m => m.remainingUses > 0);

    // Also consume attack-based buffs
    const buffs = statusEffects.buffs[cardId] || [];
    buffs.forEach(buff => {
        if (buff.effect.attackBoost) {
            buff.remainingDuration--;
        }
    });
    statusEffects.buffs[cardId] = buffs.filter(b => b.remainingDuration > 0);

    // Consume debuffs that trigger on attack
    const debuffs = statusEffects.debuffs[cardId] || [];
    debuffs.forEach(debuff => {
        if (debuff.effect.attackReduction) {
            debuff.remainingDuration--;
        }
    });
    statusEffects.debuffs[cardId] = debuffs.filter(d => d.remainingDuration > 0);
}

/**
 * Consume defense modifier after defense
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card that defended
 */
export function consumeDefenseModifier(statusEffects, cardId) {
    // Consume defense-based debuffs
    const debuffs = statusEffects.debuffs[cardId] || [];
    debuffs.forEach(debuff => {
        if (debuff.effect.defenseReduction) {
            debuff.remainingDuration--;
        }
    });
    statusEffects.debuffs[cardId] = debuffs.filter(d => d.remainingDuration > 0);
}

// ============================================================================
// ABILITY USAGE TRACKING
// ============================================================================

/**
 * Check if a card can use a specific ability
 * @param {Object} card - Card object with special_abilities
 * @param {string} abilityId - Ability ID to check
 * @param {Object} gameState - Game state with abilityUses tracking
 * @returns {Object} { canUse: boolean, remainingUses: number, reason: string }
 */
export function canUseAbility(card, abilityId, gameState) {
    const ability = LEGENDARY_ABILITIES[abilityId];
    if (!ability) {
        return { canUse: false, remainingUses: 0, reason: 'Unknown ability' };
    }

    // Check if card has this ability
    const hasAbility = card.special_abilities?.some(a => {
        const name = typeof a === 'string' ? a : a.name;
        return name.toLowerCase().replace(/\s+/g, '_') === abilityId ||
               name.toLowerCase() === ability.name.toLowerCase();
    });

    if (!hasAbility) {
        return { canUse: false, remainingUses: 0, reason: 'Card does not have this ability' };
    }

    // Unlimited uses
    if (ability.uses === null) {
        return { canUse: true, remainingUses: Infinity, reason: '' };
    }

    // Check usage count
    const usageKey = `${card.id}_${abilityId}`;
    const used = gameState.abilityUses?.[usageKey] || 0;
    const remaining = ability.uses - used;

    if (remaining <= 0) {
        return { canUse: false, remainingUses: 0, reason: 'No uses remaining' };
    }

    return { canUse: true, remainingUses: remaining, reason: '' };
}

/**
 * Record usage of a special ability
 * @param {Object} card - Card using the ability
 * @param {string} abilityId - Ability being used
 * @param {Object} gameState - Game state to modify
 */
export function recordSpecialAbilityUse(card, abilityId, gameState) {
    const usageKey = `${card.id}_${abilityId}`;
    if (!gameState.abilityUses) {
        gameState.abilityUses = {};
    }
    gameState.abilityUses[usageKey] = (gameState.abilityUses[usageKey] || 0) + 1;
}

/**
 * Get all available special abilities for a card
 * @param {Object} card - Card object
 * @param {Object} gameState - Game state
 * @returns {Array} Array of available abilities with usage info
 */
export function getAvailableAbilities(card, gameState) {
    if (!card.special_abilities || card.special_abilities.length === 0) {
        return [];
    }

    const available = [];

    card.special_abilities.forEach(ability => {
        const abilityName = typeof ability === 'string' ? ability : ability.name;

        // Try to match to a known legendary ability
        const abilityId = Object.keys(LEGENDARY_ABILITIES).find(id => {
            const legendary = LEGENDARY_ABILITIES[id];
            return legendary.name.toLowerCase() === abilityName.toLowerCase() ||
                   id === abilityName.toLowerCase().replace(/\s+/g, '_');
        });

        if (abilityId) {
            const usageInfo = canUseAbility(card, abilityId, gameState);
            const legendary = LEGENDARY_ABILITIES[abilityId];

            available.push({
                id: abilityId,
                name: legendary.name,
                description: legendary.description,
                type: legendary.type,
                trigger: legendary.trigger,
                canUse: usageInfo.canUse,
                remainingUses: usageInfo.remainingUses,
                reason: usageInfo.reason,
                effect: legendary.effect
            });
        }
    });

    return available;
}

// ============================================================================
// ABILITY EXECUTION
// ============================================================================

/**
 * Execute a special ability
 * @param {Object} params - Execution parameters
 * @param {Object} params.card - Card using the ability
 * @param {string} params.abilityId - Ability to use
 * @param {Object} params.target - Target card (if applicable)
 * @param {Object} params.targetPlayer - Player owning target card
 * @param {Object} params.gameState - Game state
 * @returns {Object} Result of ability execution
 */
export function executeSpecialAbility({ card, abilityId, target, targetPlayer, gameState }) {
    const ability = LEGENDARY_ABILITIES[abilityId];
    if (!ability) {
        return { success: false, message: 'Unknown ability', logs: [] };
    }

    const usageInfo = canUseAbility(card, abilityId, gameState);
    if (!usageInfo.canUse) {
        return { success: false, message: usageInfo.reason, logs: [] };
    }

    // Initialize status effects if not present
    if (!gameState.statusEffects) {
        gameState.statusEffects = createStatusEffectsState();
    }

    const result = {
        success: true,
        message: '',
        logs: [],
        damageDealt: {},  // { cardId: damageAmount }
        healing: {},      // { cardId: healAmount }
        effectsApplied: []
    };

    // Record the ability use
    recordSpecialAbilityUse(card, abilityId, gameState);
    result.logs.push(`${card.name} uses ${ability.name}!`);

    // Execute based on ability type
    switch (abilityId) {
        case 'spike_shield':
            applyStatusEffect(gameState.statusEffects, card.id, abilityId, card.id, ability.effect);
            result.logs.push(`${card.name} raises a Spike Shield! (Reflects 50% damage)`);
            result.effectsApplied.push({ cardId: card.id, effect: 'spike_shield' });
            break;

        case 'chain_lightning':
            // Applied during attack, just mark as ready
            if (!gameState.pendingChainLightning) {
                gameState.pendingChainLightning = {};
            }
            gameState.pendingChainLightning[card.id] = true;
            result.logs.push(`${card.name}'s next attack will chain to another target!`);
            break;

        case 'core_meltdown':
            // Applied during attack
            if (!gameState.pendingCoreMeltdown) {
                gameState.pendingCoreMeltdown = {};
            }
            gameState.pendingCoreMeltdown[card.id] = true;
            result.logs.push(`${card.name} prepares Core Meltdown! (200% damage, 25% recoil)`);
            break;

        case 'aftershock':
            applyStatusEffect(gameState.statusEffects, card.id, abilityId, card.id, ability.effect);
            result.logs.push(`${card.name} prepares an Aftershock! (Next attack +50% damage)`);
            break;

        case 'ember_storm':
        case 'tidal_wave': {
            // AoE damage to all enemies
            const damagePercent = ability.effect.aoeDamagePercent;
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];

            // Get base damage from card's strongest attack
            const baseAttack = card.attacks?.reduce((max, atk) =>
                Math.max(max, atk.base_damage || 0), 0) || 500000;
            const aoeDamage = Math.round(baseAttack * damagePercent);

            gameState.players.forEach(player => {
                if (player.id === currentPlayer.id) return; // Skip self

                player.cards.forEach(cardId => {
                    if (gameState.cardHP[cardId] > 0) {
                        gameState.cardHP[cardId] = Math.max(0, gameState.cardHP[cardId] - aoeDamage);
                        result.damageDealt[cardId] = aoeDamage;
                    }
                });
            });
            result.logs.push(`${ability.name} deals ${formatHP(aoeDamage)} to all enemies!`);
            break;
        }

        case 'cosmic_barrier':
            applyStatusEffect(gameState.statusEffects, card.id, abilityId, card.id, ability.effect);
            result.logs.push(`${card.name} raises a Cosmic Barrier! (Immune to next attack)`);
            result.effectsApplied.push({ cardId: card.id, effect: 'cosmic_barrier' });
            break;

        case 'burrow':
            applyStatusEffect(gameState.statusEffects, card.id, abilityId, card.id, ability.effect);
            result.logs.push(`${card.name} burrows underground! (Auto-dodge next attack)`);
            result.effectsApplied.push({ cardId: card.id, effect: 'burrow' });
            break;

        case 'undertow':
            if (!target) {
                return { success: false, message: 'Must select a target', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name}'s defense reduced by 50%!`);
            result.effectsApplied.push({ cardId: target.id, effect: 'undertow' });
            break;

        case 'sticky_trap':
            if (!target) {
                return { success: false, message: 'Must select a target', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name} is caught in a Sticky Trap! (Attack -30% for 2 attacks)`);
            result.effectsApplied.push({ cardId: target.id, effect: 'sticky_trap' });
            break;

        case 'gravity_well':
            if (!target) {
                return { success: false, message: 'Must select a target', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name} is trapped in a Gravity Well! (Cannot dodge for 2 turns)`);
            result.effectsApplied.push({ cardId: target.id, effect: 'gravity_well' });
            break;

        case 'regrowth': {
            // Find the card object to get max HP
            const maxHP = card.hp;
            const healAmount = Math.round(maxHP * ability.effect.healPercent);
            const currentHP = gameState.cardHP[card.id] || 0;
            const newHP = Math.min(maxHP, currentHP + healAmount);
            gameState.cardHP[card.id] = newHP;
            result.healing[card.id] = healAmount;
            result.logs.push(`${card.name} heals for ${formatHP(healAmount)} HP!`);
            break;
        }

        case 'unlock_potential':
            if (!target) {
                return { success: false, message: 'Must select an ally card', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name}'s potential unlocked! (Next attack +50% damage)`);
            result.effectsApplied.push({ cardId: target.id, effect: 'unlock_potential' });
            break;

        case 'flame_aura':
            if (!target) {
                return { success: false, message: 'Must select a target', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name} is engulfed in flames! (Burn for 3 turns)`);
            result.effectsApplied.push({ cardId: target.id, effect: 'flame_aura' });
            break;

        case 'earthquake_stun':
            if (!target) {
                return { success: false, message: 'Must select a target', logs: [] };
            }
            applyStatusEffect(gameState.statusEffects, target.id, abilityId, card.id, ability.effect);
            result.logs.push(`${target.name} is stunned by the Earthquake! (Skips next turn)`);
            result.effectsApplied.push({ cardId: target.id, effect: 'stun' });
            break;

        case 'whirlwind': {
            // Shuffle card ownership among enemies
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            const enemyPlayers = gameState.players.filter(p => p.id !== currentPlayer.id && p.cards.length > 0);

            if (enemyPlayers.length < 2) {
                result.logs.push('Whirlwind has no effect - not enough enemy players!');
                break;
            }

            // Collect all enemy cards with their current HP
            const allEnemyCards = [];
            const cardCounts = {};
            enemyPlayers.forEach(player => {
                cardCounts[player.id] = player.cards.length;
                player.cards.forEach(cardId => {
                    allEnemyCards.push({
                        cardId,
                        hp: gameState.cardHP[cardId]
                    });
                });
            });

            // Shuffle the cards
            for (let i = allEnemyCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allEnemyCards[i], allEnemyCards[j]] = [allEnemyCards[j], allEnemyCards[i]];
            }

            // Redistribute cards maintaining counts
            let cardIndex = 0;
            enemyPlayers.forEach(player => {
                const count = cardCounts[player.id];
                player.cards = [];
                for (let i = 0; i < count && cardIndex < allEnemyCards.length; i++) {
                    const cardData = allEnemyCards[cardIndex++];
                    player.cards.push(cardData.cardId);
                    // HP is already preserved in gameState.cardHP
                }
            });

            result.logs.push('Whirlwind shuffles enemy card ownership!');
            break;
        }

        default:
            result.logs.push(`${ability.name} effect not yet implemented`);
            break;
    }

    return result;
}

/**
 * Process chain lightning after an attack
 * @param {Object} params - Parameters
 * @returns {Object} Chain lightning result
 */
export function processChainLightning({ attacker, attack, defender, originalDamage, gameState }) {
    if (!gameState.pendingChainLightning?.[attacker.id]) {
        return null;
    }

    // Clear the pending flag
    delete gameState.pendingChainLightning[attacker.id];

    const ability = LEGENDARY_ABILITIES['chain_lightning'];
    const chainDamage = Math.round(originalDamage * ability.effect.chainDamagePercent);

    // Find another enemy card to chain to
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    let chainTarget = null;

    for (const player of gameState.players) {
        if (player.id === currentPlayer.id) continue;

        for (const cardId of player.cards) {
            if (cardId !== defender.id && gameState.cardHP[cardId] > 0) {
                chainTarget = { cardId, player };
                break;
            }
        }
        if (chainTarget) break;
    }

    if (!chainTarget) {
        return { success: false, message: 'No valid chain target', logs: ['Chain Lightning fizzles - no other targets!'] };
    }

    gameState.cardHP[chainTarget.cardId] = Math.max(0, gameState.cardHP[chainTarget.cardId] - chainDamage);

    return {
        success: true,
        targetCardId: chainTarget.cardId,
        damage: chainDamage,
        logs: [`Chain Lightning arcs to another enemy for ${formatHP(chainDamage)} damage!`]
    };
}

/**
 * Process core meltdown damage modification
 * @param {Object} params - Parameters
 * @returns {Object} Modified damage result
 */
export function processCoreMeltdown({ attacker, originalDamage, gameState }) {
    if (!gameState.pendingCoreMeltdown?.[attacker.id]) {
        return null;
    }

    // Clear the pending flag
    delete gameState.pendingCoreMeltdown[attacker.id];

    const ability = LEGENDARY_ABILITIES['core_meltdown'];
    const boostedDamage = Math.round(originalDamage * ability.effect.damageMultiplier);
    const recoilDamage = Math.round(boostedDamage * ability.effect.recoilPercent);

    // Apply recoil to attacker
    gameState.cardHP[attacker.id] = Math.max(0, gameState.cardHP[attacker.id] - recoilDamage);

    return {
        boostedDamage,
        recoilDamage,
        logs: [
            `Core Meltdown! Damage boosted to ${formatHP(boostedDamage)}!`,
            `${attacker.name} takes ${formatHP(recoilDamage)} recoil damage!`
        ]
    };
}

/**
 * Check for passive phase shift dodge
 * @param {Object} defender - Defending card
 * @param {Object} gameState - Game state
 * @returns {boolean} True if attack is dodged
 */
export function checkPhaseShift(defender, gameState) {
    const hasPhaseShift = defender.special_abilities?.some(a => {
        const name = typeof a === 'string' ? a : a.name;
        return name.toLowerCase().includes('phase shift') ||
               name.toLowerCase() === 'phase_shift';
    });

    if (!hasPhaseShift) return false;

    // 50% chance to dodge
    return Math.random() < 0.5;
}

/**
 * Check for ignite/tremor on-attack effects
 * @param {Object} attacker - Attacking card
 * @param {Object} defender - Defending card
 * @param {Object} gameState - Game state
 * @returns {Array} Log messages from on-attack effects
 */
export function processOnAttackEffects(attacker, defender, gameState) {
    const logs = [];

    if (!gameState.statusEffects) {
        gameState.statusEffects = createStatusEffectsState();
    }

    // Check for Ignite
    const hasIgnite = attacker.special_abilities?.some(a => {
        const name = typeof a === 'string' ? a : a.name;
        return name.toLowerCase().includes('ignite');
    });

    if (hasIgnite) {
        const usageInfo = canUseAbility(attacker, 'ignite', gameState);
        if (usageInfo.canUse) {
            recordSpecialAbilityUse(attacker, 'ignite', gameState);
            applyStatusEffect(gameState.statusEffects, defender.id, 'ignite', attacker.id);
            logs.push(`${defender.name} is ignited! (Burn for 3 turns)`);
        }
    }

    // Check for Tremor
    const hasTremor = attacker.special_abilities?.some(a => {
        const name = typeof a === 'string' ? a : a.name;
        return name.toLowerCase().includes('tremor');
    });

    if (hasTremor) {
        const usageInfo = canUseAbility(attacker, 'tremor', gameState);
        if (usageInfo.canUse) {
            recordSpecialAbilityUse(attacker, 'tremor', gameState);
            applyStatusEffect(gameState.statusEffects, defender.id, 'tremor', attacker.id);
            if (gameState.statusEffects.stuns[defender.id]) {
                logs.push(`Tremor stuns ${defender.name}!`);
            }
        }
    }

    return logs;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
    LEGENDARY_ABILITIES as ABILITIES
};
