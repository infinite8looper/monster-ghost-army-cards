/**
 * Monster Ghost Army Cards - Battle Calculation Logic Module
 *
 * This module handles damage calculations, element interactions,
 * and special ability effects.
 */

import { ELEMENTS } from './cards.js';

// Special abilities that have limited uses
export const SPECIAL_ABILITIES = {
    BLACK_HOLE: 'Black Hole',
    SUMMON_GHOST_ARMY: 'Summon Ghost Army',
    BOUNCE_BACK: 'Bounce Back',
    TELEPORT: 'Teleport'
};

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

// Default attack/defense values (for cards without explicit values)
// Balanced for ~1M HP cards, ~35 turn games
const DEFAULT_ATTACK_DAMAGE = 650000;
const DEFAULT_DEFENSE_PROTECTION = 60000;

/**
 * Get the relationship between two elements
 * @param {string} element1 - First element
 * @param {string} element2 - Second element
 * @returns {string} Relationship type: 'opposite', 'complement', 'same', or 'neutral'
 */
export function getElementRelationship(element1, element2) {
    if (!element1 || !element2) return 'neutral';

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
    if (!attackElement || !defenderElements || defenderElements.length === 0) {
        return {
            modifier: ELEMENT_MODIFIERS.NEUTRAL,
            relationship: 'neutral',
            description: 'Neutral matchup'
        };
    }

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
    if (!defenseElement || !attackElement) {
        return {
            modifier: DEFENSE_MODIFIERS.SAME,
            relationship: 'neutral',
            description: 'Neutral defense matchup'
        };
    }

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
        description: descriptions[relationship] || descriptions.neutral
    };
}

/**
 * Normalize an attack object to ensure it has all required fields
 * @param {Object} attack - Attack object from card data
 * @param {Object} card - Card the attack belongs to
 * @returns {Object} Normalized attack object
 */
export function normalizeAttack(attack, card) {
    // Determine element: use attack's element or first card element
    const element = attack.element || (card.elements && card.elements[0]) || 'magic';

    // Determine base damage - use attack's base_damage or default
    let baseDamage = attack.base_damage;
    if (baseDamage === undefined || baseDamage === null) {
        baseDamage = DEFAULT_ATTACK_DAMAGE;
    }

    // Determine limited uses for special attacks
    let limitedUses = attack.limited_uses;
    if (limitedUses === undefined) {
        // Check if this is a powerful attack that should have limited uses
        const powerfulAttacks = [
            SPECIAL_ABILITIES.BLACK_HOLE,
            SPECIAL_ABILITIES.SUMMON_GHOST_ARMY,
            'Black Hole',
            'Summon Ghost Army',
            'White Hole'
        ];
        if (powerfulAttacks.some(name => attack.name.toLowerCase().includes(name.toLowerCase()))) {
            limitedUses = true; // Will be calculated based on player count
        } else {
            limitedUses = null;
        }
    }

    return {
        ...attack,
        element,
        base_damage: baseDamage,
        limited_uses: limitedUses
    };
}

/**
 * Normalize a defense object to ensure it has all required fields
 * @param {Object} defense - Defense object from card data
 * @param {Object} card - Card the defense belongs to
 * @returns {Object} Normalized defense object
 */
export function normalizeDefense(defense, card) {
    // Determine element: use defense's element or first card element
    const element = defense.element || (card.elements && card.elements[0]) || 'magic';

    // Determine base protection - use defense's base_protection or default
    let baseProtection = defense.base_protection;
    if (baseProtection === undefined || baseProtection === null) {
        baseProtection = DEFAULT_DEFENSE_PROTECTION;
    }

    // Determine special type
    let specialType = defense.special_type;
    if (!specialType) {
        const name = defense.name.toLowerCase();
        if (name.includes('bounce') || name.includes('reflect')) {
            specialType = SPECIAL_ABILITIES.BOUNCE_BACK;
        } else if (name.includes('teleport') || name.includes('dodge') || name.includes('phase')) {
            specialType = SPECIAL_ABILITIES.TELEPORT;
        }
    }

    return {
        ...defense,
        element,
        base_protection: baseProtection,
        special_type: specialType || null
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
    // Normalize the attack
    const normalizedAttack = normalizeAttack(attack, attacker);

    let baseDamage = normalizedAttack.base_damage;
    let breakdown = [];

    // Start with base damage
    breakdown.push({
        label: 'Base Damage',
        value: baseDamage
    });

    // Apply attack element modifier
    const attackMod = calculateAttackModifier(normalizedAttack.element, defender.elements);
    let damage = baseDamage * attackMod.modifier;

    if (attackMod.modifier !== 1.0) {
        breakdown.push({
            label: attackMod.description,
            value: Math.round(damage - baseDamage),
            modifier: attackMod.modifier
        });
    }

    // Check for slime spike effect (reduces mecha attack efficacy)
    if (gameState.slimeSpikeTargets?.includes(normalizedAttack.name) && normalizedAttack.element === 'mecha') {
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
        const normalizedDefense = normalizeDefense(defense, defender);
        const defenseMod = calculateDefenseModifier(normalizedDefense.element, normalizedAttack.element);
        let protection = normalizedDefense.base_protection;

        // Subtract protection from damage
        const protectionEffect = protection;
        damage = Math.max(0, damage - protectionEffect);

        breakdown.push({
            label: `${defense.name} (${normalizedDefense.element})`,
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
        attack: normalizedAttack,
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
    const unbounceable = [
        SPECIAL_ABILITIES.BLACK_HOLE,
        SPECIAL_ABILITIES.SUMMON_GHOST_ARMY,
        'Black Hole',
        'Summon Ghost Army',
        'White Hole'
    ];

    const attackName = attack.name.toLowerCase();
    return !unbounceable.some(name => attackName.includes(name.toLowerCase()));
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
        damage: 0, // Defender takes no damage
        message: `Attack bounced back! Attacker takes ${reflectedDamage.toLocaleString()} damage!`
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
 * @param {number} playerCount - Number of players in the game
 * @returns {boolean} True if ability can be used
 */
export function canUseSpecialAbility(card, abilityName, gameState, playerCount = 2) {
    const usageKey = `${card.id}_${abilityName}`;
    const uses = gameState.abilityUses?.[usageKey] || 0;

    // Check for powerful attacks (Black Hole, Summon Ghost Army)
    // These can be used (playerCount - 2) times, minimum 1
    const powerfulAttacks = [
        SPECIAL_ABILITIES.BLACK_HOLE,
        SPECIAL_ABILITIES.SUMMON_GHOST_ARMY,
        'Black Hole',
        'Summon Ghost Army',
        'White Hole'
    ];

    const isPowerfulAttack = powerfulAttacks.some(name =>
        abilityName.toLowerCase().includes(name.toLowerCase())
    );

    if (isPowerfulAttack) {
        const maxUses = Math.max(1, playerCount - 2);
        return uses < maxUses;
    }

    // Check for special defense abilities
    if (abilityName === SPECIAL_ABILITIES.BOUNCE_BACK || abilityName.toLowerCase().includes('bounce')) {
        return uses < 2;
    }

    if (abilityName === SPECIAL_ABILITIES.TELEPORT || abilityName.toLowerCase().includes('teleport')) {
        return uses < 1;
    }

    return true; // No limit for regular abilities
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
 * @returns {number} Remaining uses (Infinity if unlimited)
 */
export function getRemainingAbilityUses(card, abilityName, gameState, playerCount = 2) {
    const usageKey = `${card.id}_${abilityName}`;
    const used = gameState.abilityUses?.[usageKey] || 0;

    // Check for powerful attacks
    const powerfulAttacks = [
        SPECIAL_ABILITIES.BLACK_HOLE,
        SPECIAL_ABILITIES.SUMMON_GHOST_ARMY,
        'Black Hole',
        'Summon Ghost Army',
        'White Hole'
    ];

    const isPowerfulAttack = powerfulAttacks.some(name =>
        abilityName.toLowerCase().includes(name.toLowerCase())
    );

    if (isPowerfulAttack) {
        const maxUses = Math.max(1, playerCount - 2);
        return Math.max(0, maxUses - used);
    }

    // Check for special defense abilities
    if (abilityName === SPECIAL_ABILITIES.BOUNCE_BACK || abilityName.toLowerCase().includes('bounce')) {
        return Math.max(0, 2 - used);
    }

    if (abilityName === SPECIAL_ABILITIES.TELEPORT || abilityName.toLowerCase().includes('teleport')) {
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
 * @param {Object} gameState - Current game state
 * @returns {Object} Predicted outcome
 */
export function simulateBattle(attacker, attack, defender, defense = null, gameState = {}) {
    const result = calculateDamage(attack, attacker, defender, defense, gameState);
    const currentHP = gameState.cardHP?.[defender.id] ?? defender.hp;

    return {
        damage: result.finalDamage,
        wouldKill: result.finalDamage >= currentHP,
        currentHP,
        remainingHP: Math.max(0, currentHP - result.finalDamage),
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
    if (!card.attacks || card.attacks.length === 0) {
        // Generate a default attack based on card stats
        const defaultAttack = {
            name: `${card.name} Strike`,
            element: card.elements[0] || 'magic',
            base_damage: DEFAULT_ATTACK_DAMAGE,
            limited_uses: null
        };
        return [{
            ...defaultAttack,
            remainingUses: Infinity,
            canUse: true
        }];
    }

    return card.attacks.map(attack => {
        const normalized = normalizeAttack(attack, card);

        // Check for limited uses
        let remaining = Infinity;
        if (normalized.limited_uses) {
            remaining = getRemainingAbilityUses(card, attack.name, gameState, playerCount);
        }

        return {
            ...normalized,
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
    if (!card.defenses || card.defenses.length === 0) {
        // Some cards may not have defenses
        return [];
    }

    return card.defenses.map(defense => {
        const normalized = normalizeDefense(defense, card);
        let remaining = Infinity;

        // Check for special defense types with limited uses
        if (normalized.special_type === SPECIAL_ABILITIES.BOUNCE_BACK ||
            defense.name.toLowerCase().includes('bounce')) {
            remaining = getRemainingAbilityUses(card, SPECIAL_ABILITIES.BOUNCE_BACK, gameState);
        } else if (normalized.special_type === SPECIAL_ABILITIES.TELEPORT ||
            defense.name.toLowerCase().includes('teleport')) {
            remaining = getRemainingAbilityUses(card, SPECIAL_ABILITIES.TELEPORT, gameState);
        }

        return {
            ...normalized,
            remainingUses: remaining,
            canUse: remaining > 0
        };
    }).filter(defense => defense.canUse);
}

/**
 * Process a complete attack including defense response
 * @param {Object} attacker - Attacking card
 * @param {Object} attack - Attack being used
 * @param {Object} defender - Defending card
 * @param {Object} defense - Defense being used (optional)
 * @param {Object} gameState - Current game state
 * @param {number} playerCount - Number of players
 * @returns {Object} Complete battle result
 */
export function processBattleRound(attacker, attack, defender, defense, gameState, playerCount = 2) {
    const result = {
        attacker,
        defender,
        attack,
        defense,
        damageToDefender: 0,
        damageToAttacker: 0,
        defenderDefeated: false,
        attackerDefeated: false,
        specialEffects: [],
        log: []
    };

    // Record attack ability use if it's limited
    const normalizedAttack = normalizeAttack(attack, attacker);
    if (normalizedAttack.limited_uses) {
        recordAbilityUse(attacker, attack.name, gameState);
        result.log.push(`${attacker.name} used ${attack.name}! (Limited use expended)`);
    }

    // Handle special defense types first
    if (defense) {
        const normalizedDefense = normalizeDefense(defense, defender);

        // Teleport - complete dodge
        if (normalizedDefense.special_type === SPECIAL_ABILITIES.TELEPORT) {
            recordAbilityUse(defender, SPECIAL_ABILITIES.TELEPORT, gameState);
            const teleportResult = processTeleport();
            result.log.push(teleportResult.message);
            result.specialEffects.push('teleport');
            return result; // No damage dealt
        }

        // Bounce Back
        if (normalizedDefense.special_type === SPECIAL_ABILITIES.BOUNCE_BACK) {
            recordAbilityUse(defender, SPECIAL_ABILITIES.BOUNCE_BACK, gameState);

            // Calculate what damage would have been
            const previewDamage = calculateDamage(attack, attacker, defender, null, gameState);
            const bounceResult = processBounceBack(attack, previewDamage.finalDamage);

            if (bounceResult.success) {
                result.damageToAttacker = bounceResult.reflectedDamage;
                result.log.push(bounceResult.message);
                result.specialEffects.push('bounce_back');

                // Check if attacker is defeated by bounce back
                const attackerHP = gameState.cardHP?.[attacker.id] ?? attacker.hp;
                if (bounceResult.reflectedDamage >= attackerHP) {
                    result.attackerDefeated = true;
                    result.log.push(`${attacker.name} was defeated by their own attack!`);
                }

                return result; // Defender takes no damage from bounce back
            } else {
                result.log.push(bounceResult.message);
                // Fall through to normal damage calculation
            }
        }
    }

    // Normal damage calculation
    const damageResult = calculateDamage(attack, attacker, defender, defense, gameState);
    result.damageToDefender = damageResult.finalDamage;
    result.breakdown = damageResult.breakdown;
    result.isCritical = damageResult.isCritical;
    result.isResisted = damageResult.isResisted;

    // Log damage modifiers
    if (damageResult.isCritical) {
        result.log.push('CRITICAL HIT! Complementary element bonus!');
        result.specialEffects.push('critical');
    } else if (damageResult.isResisted) {
        result.log.push('Resisted! Opposite element reduced damage.');
        result.specialEffects.push('resisted');
    }

    // Check if defender is defeated
    const defenderHP = gameState.cardHP?.[defender.id] ?? defender.hp;
    if (damageResult.finalDamage >= defenderHP) {
        result.defenderDefeated = true;
        result.log.push(`${defender.name} has been defeated!`);
    }

    // Record defense ability use if applicable
    if (defense) {
        const normalizedDefense = normalizeDefense(defense, defender);
        if (normalizedDefense.special_type) {
            recordAbilityUse(defender, normalizedDefense.special_type, gameState);
        }
    }

    return result;
}
