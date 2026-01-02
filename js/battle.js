/**
 * Monster Ghost Army Cards - Battle Calculation Logic Module
 *
 * This module handles damage calculations, element interactions,
 * and special ability effects.
 */

import { ELEMENTS, SPECIAL_ABILITIES } from './cards.js';

// Damage modifiers based on element relationships
const ELEMENT_MODIFIERS = {
    OPPOSITE: 0.5,    // Opposite elements reduce damage by 50%
    COMPLEMENT: 1.5,  // Complementary elements increase damage by 50%
    SAME: 1.0,        // Same elements deal base damage
    NEUTRAL: 1.0      // No relationship = neutral damage
};

// Defense modifiers (work opposite to attack modifiers)
const DEFENSE_MODIFIERS = {
    OPPOSITE: 1.25,   // Opposite defense/attack increases damage by 25%
    COMPLEMENT: 0.75, // Complementary defense reduces damage by 25%
    SAME: 1.0         // Same element defends by base amount
};

// Special ability constants
const BOUNCE_BACK_MULTIPLIER = 0.75;
const SLIME_SPIKE_REDUCTION = 0.75;

/**
 * Get the relationship between two elements
 * @param {string} element1 - First element
 * @param {string} element2 - Second element
 * @returns {string} Relationship type: 'opposite', 'complement', 'same', or 'neutral'
 */
export function getElementRelationship(element1, element2) {
    if (element1 === element2) {
        return 'same';
    }

    const config = ELEMENTS[element1];
    if (!config) {
        return 'neutral';
    }

    if (config.opposite === element2) {
        return 'opposite';
    }

    if (config.complement === element2) {
        return 'complement';
    }

    return 'neutral';
}

/**
 * Calculate attack damage modifier based on attacker and defender elements
 * @param {string} attackElement - Element of the attack
 * @param {Array<string>} defenderElements - Elements of the defending card
 * @returns {Object} Object with modifier value and description
 */
export function calculateAttackModifier(attackElement, defenderElements) {
    let bestModifier = ELEMENT_MODIFIERS.NEUTRAL;
    let relationship = 'neutral';

    // Check against each defender element, use the most favorable for the attacker
    for (const defElement of defenderElements) {
        const rel = getElementRelationship(attackElement, defElement);

        if (rel === 'complement') {
            // Complement = more damage, best for attacker
            if (ELEMENT_MODIFIERS.COMPLEMENT > bestModifier) {
                bestModifier = ELEMENT_MODIFIERS.COMPLEMENT;
                relationship = 'complement';
            }
        } else if (rel === 'opposite') {
            // Opposite = less damage, worst for attacker (unless we already have complement)
            if (relationship !== 'complement' && ELEMENT_MODIFIERS.OPPOSITE < bestModifier) {
                bestModifier = ELEMENT_MODIFIERS.OPPOSITE;
                relationship = 'opposite';
            }
        } else if (rel === 'same') {
            // Same = base damage
            if (relationship === 'neutral') {
                bestModifier = ELEMENT_MODIFIERS.SAME;
                relationship = 'same';
            }
        }
    }

    const descriptions = {
        opposite: 'Opposite element - 50% damage reduction!',
        complement: 'Complementary element - 50% bonus damage!',
        same: 'Same element - base damage',
        neutral: 'Neutral matchup'
    };

    return {
        modifier: bestModifier,
        relationship,
        description: descriptions[relationship]
    };
}

/**
 * Calculate defense modifier
 * @param {string} defenseElement - Element of the defense
 * @param {string} attackElement - Element of the incoming attack
 * @returns {Object} Object with modifier value and description
 */
export function calculateDefenseModifier(defenseElement, attackElement) {
    const relationship = getElementRelationship(defenseElement, attackElement);

    let modifier;
    switch (relationship) {
        case 'opposite':
            modifier = DEFENSE_MODIFIERS.OPPOSITE;
            break;
        case 'complement':
            modifier = DEFENSE_MODIFIERS.COMPLEMENT;
            break;
        default:
            modifier = DEFENSE_MODIFIERS.SAME;
    }

    const descriptions = {
        opposite: 'Opposite defense - damage increased by 25%!',
        complement: 'Complementary defense - damage reduced by 25%!',
        same: 'Same element defense - base protection',
        neutral: 'Neutral defense matchup'
    };

    return {
        modifier,
        relationship,
        description: descriptions[relationship]
    };
}

/**
 * Calculate damage from an attack
 * @param {Object} attack - Attack object with base_damage and element
 * @param {Object} attacker - Attacker card object
 * @param {Object} defender - Defender card object
 * @param {Object} defense - Defense object (optional)
 * @param {Object} gameState - Current game state for tracking special effects
 * @returns {Object} Calculation result with damage and breakdown
 */
export function calculateDamage(attack, attacker, defender, defense = null, gameState = {}) {
    let baseDamage = attack.base_damage;
    let breakdown = [];

    // Start with base damage
    breakdown.push({
        label: 'Base Damage',
        value: baseDamage
    });

    // Apply attack element modifier
    const attackMod = calculateAttackModifier(attack.element, defender.elements);
    let damage = baseDamage * attackMod.modifier;

    if (attackMod.modifier !== 1.0) {
        breakdown.push({
            label: attackMod.description,
            value: Math.round(damage - baseDamage),
            modifier: attackMod.modifier
        });
    }

    // Check for slime spike effect (reduces mecha attack efficacy)
    if (gameState.slimeSpikeTargets?.includes(attack.name) && attack.element === 'mecha') {
        const reduction = damage * SLIME_SPIKE_REDUCTION;
        damage -= reduction;
        breakdown.push({
            label: 'Slime Spike effect (mecha attack weakened)',
            value: -Math.round(reduction),
            modifier: 1 - SLIME_SPIKE_REDUCTION
        });
    }

    // Apply defense if present
    if (defense) {
        const defenseMod = calculateDefenseModifier(defense.element, attack.element);
        let protection = defense.base_protection;

        // Modify protection based on element relationship
        // Note: defense modifier affects the FINAL damage, not protection
        const protectionEffect = protection;
        damage = Math.max(0, damage - protectionEffect);

        breakdown.push({
            label: `${defense.name} (${defense.element})`,
            value: -protectionEffect
        });

        // Apply defense element modifier to remaining damage
        if (defenseMod.modifier !== 1.0) {
            const prevDamage = damage;
            damage = damage * defenseMod.modifier;
            breakdown.push({
                label: defenseMod.description,
                value: Math.round(damage - prevDamage),
                modifier: defenseMod.modifier
            });
        }
    }

    // Ensure damage is non-negative
    damage = Math.max(0, Math.round(damage));

    return {
        finalDamage: damage,
        breakdown,
        attackModifier: attackMod,
        isCritical: attackMod.relationship === 'complement',
        isResisted: attackMod.relationship === 'opposite'
    };
}

/**
 * Check if an attack can be bounced back
 * @param {Object} attack - Attack object
 * @returns {boolean} True if attack can be bounced back
 */
export function canBounceBack(attack) {
    // Black Hole and Summon Ghost Army cannot be bounced back
    const unblockabl = [SPECIAL_ABILITIES.BLACK_HOLE, SPECIAL_ABILITIES.SUMMON_GHOST_ARMY];
    return !unblockabl.includes(attack.name);
}

/**
 * Calculate bounce back damage
 * @param {number} originalDamage - Original damage that would have been dealt
 * @returns {number} Damage reflected back to attacker
 */
export function calculateBounceBackDamage(originalDamage) {
    return Math.round(originalDamage * BOUNCE_BACK_MULTIPLIER);
}

/**
 * Process a teleport defense (complete dodge)
 * @returns {Object} Result of teleport action
 */
export function processTeleport() {
    return {
        dodged: true,
        damage: 0,
        message: 'Teleported away! Attack completely dodged!'
    };
}

/**
 * Process bounce back defense
 * @param {Object} attack - Attack object
 * @param {number} originalDamage - Damage that would have been dealt
 * @returns {Object} Result of bounce back
 */
export function processBounceBack(attack, originalDamage) {
    if (!canBounceBack(attack)) {
        return {
            success: false,
            message: `${attack.name} cannot be bounced back!`,
            damage: originalDamage
        };
    }

    const reflectedDamage = calculateBounceBackDamage(originalDamage);
    return {
        success: true,
        reflectedDamage,
        message: `Attack bounced back! Attacker takes ${reflectedDamage} damage!`
    };
}

/**
 * Process slime spike defense against mecha attacks
 * @param {Object} attack - Attack object
 * @param {Object} gameState - Game state to modify
 * @returns {Object} Result of slime spike
 */
export function processSlimeSpike(attack, gameState) {
    if (attack.element !== 'mecha') {
        return {
            success: false,
            message: 'Slime Spike only works against mecha attacks!'
        };
    }

    // Add attack to permanently weakened list
    if (!gameState.slimeSpikeTargets) {
        gameState.slimeSpikeTargets = [];
    }
    gameState.slimeSpikeTargets.push(attack.name);

    return {
        success: true,
        message: `${attack.name} covered in slime! Mecha attack permanently weakened by 75%!`
    };
}

/**
 * Check if a special ability can still be used
 * @param {Object} card - Card object
 * @param {string} abilityName - Name of the ability
 * @param {Object} gameState - Current game state
 * @returns {boolean} True if ability can be used
 */
export function canUseSpecialAbility(card, abilityName, gameState) {
    const usageKey = `${card.id}_${abilityName}`;
    const uses = gameState.abilityUses?.[usageKey] || 0;

    // Find the ability on the card
    const ability = card.special_abilities?.find(a => a.name === abilityName);
    if (!ability) {
        // Check defenses for special types
        const defense = card.defenses?.find(d => d.special_type === abilityName);
        if (!defense) return false;

        // Bounce Back can be used twice
        if (abilityName === SPECIAL_ABILITIES.BOUNCE_BACK) {
            return uses < 2;
        }
        // Teleport can be used once
        if (abilityName === SPECIAL_ABILITIES.TELEPORT) {
            return uses < 1;
        }
    }

    // For attacks with limited uses (Black Hole, Summon Ghost Army)
    const attack = card.attacks?.find(a => a.name === abilityName);
    if (attack?.limited_uses) {
        return uses < attack.limited_uses;
    }

    return true;
}

/**
 * Record usage of a special ability
 * @param {Object} card - Card object
 * @param {string} abilityName - Name of the ability
 * @param {Object} gameState - Game state to modify
 */
export function recordAbilityUse(card, abilityName, gameState) {
    const usageKey = `${card.id}_${abilityName}`;
    if (!gameState.abilityUses) {
        gameState.abilityUses = {};
    }
    gameState.abilityUses[usageKey] = (gameState.abilityUses[usageKey] || 0) + 1;
}

/**
 * Get remaining uses for a special ability
 * @param {Object} card - Card object
 * @param {string} abilityName - Name of the ability
 * @param {Object} gameState - Current game state
 * @param {number} playerCount - Number of players (affects some abilities)
 * @returns {number} Remaining uses
 */
export function getRemainingAbilityUses(card, abilityName, gameState, playerCount = 2) {
    const usageKey = `${card.id}_${abilityName}`;
    const used = gameState.abilityUses?.[usageKey] || 0;

    // Check for limited use attacks
    const attack = card.attacks?.find(a => a.name === abilityName);
    if (attack?.limited_uses !== null && attack?.limited_uses !== undefined) {
        // Powerful attacks use (playerCount - 2) uses
        const maxUses = Math.max(1, playerCount - 2);
        return Math.max(0, maxUses - used);
    }

    // Check for special defense abilities
    if (abilityName === SPECIAL_ABILITIES.BOUNCE_BACK) {
        return Math.max(0, 2 - used);
    }
    if (abilityName === SPECIAL_ABILITIES.TELEPORT) {
        return Math.max(0, 1 - used);
    }

    return Infinity; // No limit
}

/**
 * Simulate a battle outcome (for AI or preview)
 * @param {Object} attacker - Attacker card
 * @param {Object} attack - Attack to use
 * @param {Object} defender - Defender card
 * @param {Object} defense - Defense to use (optional)
 * @returns {Object} Predicted outcome
 */
export function simulateBattle(attacker, attack, defender, defense = null) {
    const result = calculateDamage(attack, attacker, defender, defense);

    return {
        damage: result.finalDamage,
        wouldKill: result.finalDamage >= defender.hp,
        effectiveness: result.attackModifier.relationship,
        isCritical: result.isCritical,
        isResisted: result.isResisted
    };
}

/**
 * Get all valid attack options for a card
 * @param {Object} card - Card object
 * @param {Object} gameState - Current game state
 * @param {number} playerCount - Number of players
 * @returns {Array} Array of valid attacks with remaining uses
 */
export function getValidAttacks(card, gameState = {}, playerCount = 2) {
    if (!card.attacks) return [];

    return card.attacks.map(attack => {
        const remaining = attack.limited_uses !== null
            ? getRemainingAbilityUses(card, attack.name, gameState, playerCount)
            : Infinity;

        return {
            ...attack,
            remainingUses: remaining,
            canUse: remaining > 0
        };
    }).filter(attack => attack.canUse);
}

/**
 * Get all valid defense options for a card
 * @param {Object} card - Card object
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of valid defenses with remaining uses
 */
export function getValidDefenses(card, gameState = {}) {
    if (!card.defenses) return [];

    return card.defenses.map(defense => {
        let remaining = Infinity;

        if (defense.special_type === SPECIAL_ABILITIES.BOUNCE_BACK) {
            remaining = getRemainingAbilityUses(card, SPECIAL_ABILITIES.BOUNCE_BACK, gameState);
        } else if (defense.special_type === SPECIAL_ABILITIES.TELEPORT) {
            remaining = getRemainingAbilityUses(card, SPECIAL_ABILITIES.TELEPORT, gameState);
        }

        return {
            ...defense,
            remainingUses: remaining,
            canUse: remaining > 0
        };
    }).filter(defense => defense.canUse);
}
