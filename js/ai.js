/**
 * Monster Ghost Army Cards - AI Logic Module
 *
 * This module handles AI decision-making for attacks and defenses.
 * All choices are random from valid options with configurable delays.
 */

import { getValidAttacks, getValidDefenses, canBounceBack, SPECIAL_ABILITIES } from './battle.js';
import { getCardById } from './cards.js';

// AI delay configuration (in milliseconds)
const AI_DELAYS = {
    THINKING_MIN: 500,
    THINKING_MAX: 1500,
    BETWEEN_ACTIONS: 300
};

/**
 * Get a random delay for AI "thinking"
 * @returns {number} Random delay in milliseconds
 */
function getRandomDelay() {
    return Math.floor(
        Math.random() * (AI_DELAYS.THINKING_MAX - AI_DELAYS.THINKING_MIN) + AI_DELAYS.THINKING_MIN
    );
}

/**
 * Wait for a specified time (for AI delays)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a random element from an array
 * @param {Array} arr - Array to pick from
 * @returns {*} Random element
 */
function randomChoice(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get AI attack choice
 * @param {Object} player - AI player object with cards array
 * @param {Object} gameState - Current game state
 * @returns {Promise<Object|null>} Object with {attackingCard, attack, targetCard, targetPlayer} or null if no valid attack
 */
export async function getAIAttackChoice(player, gameState) {
    // Add thinking delay
    await delay(getRandomDelay());

    // Get all cards the AI player has that can attack
    const aiCards = player.cards
        .map(cardId => getCardById(cardId))
        .filter(card => card !== null);

    if (aiCards.length === 0) {
        return null;
    }

    // Find cards with valid attacks
    const cardsWithAttacks = [];
    for (const card of aiCards) {
        const validAttacks = getValidAttacks(card, gameState, gameState.players.length);
        if (validAttacks.length > 0) {
            cardsWithAttacks.push({
                card,
                attacks: validAttacks
            });
        }
    }

    if (cardsWithAttacks.length === 0) {
        return null;
    }

    // Randomly select an attacking card
    const attackerData = randomChoice(cardsWithAttacks);
    const attackingCard = attackerData.card;

    // Randomly select an attack from valid options
    const attack = randomChoice(attackerData.attacks);

    // Get all valid target cards (from other players who still have cards)
    const targetOptions = [];
    for (const otherPlayer of gameState.players) {
        if (otherPlayer.id === player.id) continue; // Skip self
        if (otherPlayer.cards.length === 0) continue; // Skip eliminated players

        for (const cardId of otherPlayer.cards) {
            const card = getCardById(cardId);
            if (card) {
                targetOptions.push({
                    card,
                    player: otherPlayer
                });
            }
        }
    }

    if (targetOptions.length === 0) {
        return null;
    }

    // Randomly select a target
    const targetData = randomChoice(targetOptions);

    return {
        attackingCard,
        attack,
        targetCard: targetData.card,
        targetPlayer: targetData.player
    };
}

/**
 * Get AI defense choice
 * @param {Object} card - The defending card
 * @param {Object} incomingAttack - The attack being defended against
 * @param {Object} gameState - Current game state
 * @returns {Promise<Object|null>} Defense object or null to skip defense
 */
export async function getAIDefenseChoice(card, incomingAttack, gameState) {
    // Add thinking delay
    await delay(getRandomDelay());

    // Get valid defenses for this card
    const validDefenses = getValidDefenses(card, gameState);

    if (validDefenses.length === 0) {
        return null; // No defenses available
    }

    // Filter out Bounce Back if the attack cannot be bounced
    const usableDefenses = validDefenses.filter(defense => {
        if (defense.special_type === SPECIAL_ABILITIES.BOUNCE_BACK) {
            return canBounceBack(incomingAttack);
        }
        return true;
    });

    if (usableDefenses.length === 0) {
        return null;
    }

    // AI has a chance to skip defense (adds unpredictability)
    // Higher chance to defend if the attack is powerful
    const skipChance = incomingAttack.base_damage > 300000 ? 0.1 : 0.3;

    if (Math.random() < skipChance) {
        return null; // AI chooses not to defend
    }

    // Randomly select a defense
    return randomChoice(usableDefenses);
}

/**
 * Get AI card selection for drafting
 * @param {Array} availableCards - Array of available card objects
 * @param {Array} draftedCards - Cards already drafted by this player
 * @param {Object} player - The AI player
 * @returns {Promise<Object|null>} Selected card or null
 */
export async function getAIDraftChoice(availableCards, draftedCards, player) {
    // Add thinking delay
    await delay(getRandomDelay());

    if (availableCards.length === 0) {
        return null;
    }

    // AI drafting strategy: weighted random selection
    // Higher tier cards have higher weight
    const weightedCards = availableCards.map(card => {
        let weight = 1;

        // Tier weights
        if (card.tier === 'legendary') weight = 5;
        else if (card.tier === 'strong') weight = 3;
        else if (card.tier === 'common') weight = 2;
        else if (card.tier === 'weak') weight = 0.5;

        // Bonus for having complementary elements with already drafted cards
        if (draftedCards.length > 0) {
            const draftedElements = new Set();
            draftedCards.forEach(c => c.elements.forEach(e => draftedElements.add(e)));

            // Check if this card adds element diversity
            const newElements = card.elements.filter(e => !draftedElements.has(e));
            if (newElements.length > 0) {
                weight *= 1.2;
            }
        }

        return { card, weight };
    });

    // Weighted random selection
    const totalWeight = weightedCards.reduce((sum, wc) => sum + wc.weight, 0);
    let random = Math.random() * totalWeight;

    for (const wc of weightedCards) {
        random -= wc.weight;
        if (random <= 0) {
            return wc.card;
        }
    }

    // Fallback to random selection
    return randomChoice(availableCards);
}

/**
 * Evaluate attack effectiveness (for smarter AI in the future)
 * @param {Object} attack - Attack to evaluate
 * @param {Object} attacker - Attacking card
 * @param {Object} target - Target card
 * @returns {number} Effectiveness score
 */
export function evaluateAttack(attack, attacker, target) {
    let score = attack.base_damage;

    // Check element matchup
    const attackElement = attack.element;

    for (const targetElement of target.elements) {
        // Check if complementary (bonus damage)
        const config = {
            air: { complement: 'universe', opposite: 'earth' },
            water: { complement: 'plant', opposite: 'fire' },
            fire: { complement: 'magic', opposite: 'water' },
            earth: { complement: 'mecha', opposite: 'air' },
            universe: { complement: 'air', opposite: 'mecha' },
            plant: { complement: 'water', opposite: 'magic' },
            mecha: { complement: 'earth', opposite: 'universe' },
            magic: { complement: 'fire', opposite: 'plant' }
        };

        if (config[attackElement]?.complement === targetElement) {
            score *= 1.5; // Complementary bonus
        } else if (config[attackElement]?.opposite === targetElement) {
            score *= 0.5; // Opposite penalty
        }
    }

    return score;
}

/**
 * Check if a player is controlled by AI
 * @param {Object} player - Player object
 * @returns {boolean} True if AI controlled
 */
export function isAIPlayer(player) {
    return player.isAI === true;
}

/**
 * Execute a full AI turn
 * @param {Object} player - AI player
 * @param {Object} gameState - Current game state
 * @param {Object} callbacks - Callback functions for UI updates
 * @returns {Promise<Object>} Result of the AI turn
 */
export async function executeAITurn(player, gameState, callbacks = {}) {
    const {
        onThinking,
        onSelectAttacker,
        onSelectAttack,
        onSelectTarget,
        onExecuteAttack,
        onComplete
    } = callbacks;

    // Show AI is thinking
    if (onThinking) {
        onThinking(player);
    }

    // Get attack choice
    const choice = await getAIAttackChoice(player, gameState);

    if (!choice) {
        // No valid attack available
        if (onComplete) {
            onComplete({ success: false, reason: 'No valid attacks available' });
        }
        return { success: false, reason: 'No valid attacks available' };
    }

    // Show attacker selection
    if (onSelectAttacker) {
        onSelectAttacker(choice.attackingCard);
        await delay(AI_DELAYS.BETWEEN_ACTIONS);
    }

    // Show attack selection
    if (onSelectAttack) {
        onSelectAttack(choice.attack);
        await delay(AI_DELAYS.BETWEEN_ACTIONS);
    }

    // Show target selection
    if (onSelectTarget) {
        onSelectTarget(choice.targetCard, choice.targetPlayer);
        await delay(AI_DELAYS.BETWEEN_ACTIONS);
    }

    // Execute the attack (defense will be handled separately)
    if (onExecuteAttack) {
        await onExecuteAttack(choice);
    }

    if (onComplete) {
        onComplete({ success: true, choice });
    }

    return { success: true, choice };
}
