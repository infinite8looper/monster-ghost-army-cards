/**
 * Monster Ghost Army Cards - Card Loading and Management Module
 *
 * This module handles loading card data from JSON, card rendering,
 * and card-related utilities.
 */

// Element configuration with colors and relationships
export const ELEMENTS = {
    air: {
        color: '#87CEEB',
        opposite: 'earth',
        complement: 'universe',
        icon: 'A'
    },
    water: {
        color: '#4169E1',
        opposite: 'fire',
        complement: 'plant',
        icon: 'W'
    },
    fire: {
        color: '#FF4500',
        opposite: 'water',
        complement: 'magic',
        icon: 'F'
    },
    earth: {
        color: '#8B4513',
        opposite: 'air',
        complement: 'mecha',
        icon: 'E'
    },
    universe: {
        color: '#9400D3',
        opposite: 'mecha',
        complement: 'air',
        icon: 'U'
    },
    plant: {
        color: '#228B22',
        opposite: 'magic',
        complement: 'water',
        icon: 'P'
    },
    mecha: {
        color: '#C0C0C0',
        opposite: 'universe',
        complement: 'earth',
        icon: 'M'
    },
    magic: {
        color: '#FF69B4',
        opposite: 'plant',
        complement: 'fire',
        icon: '*'
    }
};

// Tier configuration
export const TIERS = {
    legendary: {
        borderClass: 'tier-legendary',
        hpMultiplier: 1.0,
        label: 'Legendary'
    },
    strong: {
        borderClass: 'tier-strong',
        hpMultiplier: 1.0,
        label: 'Strong'
    },
    common: {
        borderClass: 'tier-common',
        hpMultiplier: 1.0,
        label: 'Common'
    },
    weak: {
        borderClass: 'tier-weak',
        hpMultiplier: 1.0,
        label: 'Weak'
    }
};

// Special abilities that have limited uses
export const SPECIAL_ABILITIES = {
    BLACK_HOLE: 'Black Hole',
    SUMMON_GHOST_ARMY: 'Summon Ghost Army',
    BOUNCE_BACK: 'Bounce Back',
    TELEPORT: 'Teleport'
};

// Card data storage
let allCards = [];
let cardsByElement = {};
let cardsByTier = {};

/**
 * Load card data from JSON file
 * @returns {Promise<Array>} Array of card objects
 */
export async function loadCards() {
    try {
        const cacheBuster = Date.now();
        const response = await fetch(`data/cards.json?v=${cacheBuster}`);
        if (!response.ok) {
            throw new Error(`Failed to load cards: ${response.status}`);
        }
        allCards = await response.json();

        // Index cards by element and tier for quick lookup
        indexCards();

        console.log(`Loaded ${allCards.length} cards successfully`);
        return allCards;
    } catch (error) {
        console.error('Error loading cards:', error);
        throw error;
    }
}

/**
 * Index cards by element and tier for quick filtering
 */
function indexCards() {
    cardsByElement = {};
    cardsByTier = {};

    allCards.forEach(card => {
        // Index by element
        card.elements.forEach(element => {
            if (!cardsByElement[element]) {
                cardsByElement[element] = [];
            }
            cardsByElement[element].push(card);
        });

        // Index by tier
        const tier = card.tier || 'common';
        if (!cardsByTier[tier]) {
            cardsByTier[tier] = [];
        }
        cardsByTier[tier].push(card);
    });
}

/**
 * Get all loaded cards
 * @returns {Array} All card objects
 */
export function getAllCards() {
    return allCards;
}

/**
 * Get card by ID
 * @param {string} id - Card ID
 * @returns {Object|null} Card object or null if not found
 */
export function getCardById(id) {
    return allCards.find(card => card.id === id) || null;
}

/**
 * Get cards by element
 * @param {string} element - Element name
 * @returns {Array} Cards with the specified element
 */
export function getCardsByElement(element) {
    return cardsByElement[element] || [];
}

/**
 * Get cards by tier
 * @param {string} tier - Tier name (legendary, common, weak)
 * @returns {Array} Cards with the specified tier
 */
export function getCardsByTier(tier) {
    return cardsByTier[tier] || [];
}

/**
 * Format HP value for display (e.g., 1000000 -> "1M", 250000 -> "250K")
 * @param {number} hp - HP value
 * @returns {string} Formatted HP string
 */
export function formatHP(hp) {
    if (hp >= 1000000) {
        return (hp / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (hp >= 1000) {
        return (hp / 1000).toFixed(0) + 'K';
    }
    return hp.toString();
}

/**
 * Create element icon HTML
 * @param {string} element - Element name
 * @returns {string} HTML string for element icon
 */
export function createElementIcon(element, size = 'medium') {
    const config = ELEMENTS[element];
    if (!config) return '';

    const sizeClass = size === 'small' ? 'element-icon-sm' : size === 'large' ? 'element-icon-lg' : '';
    return `<span class="element-icon ${element} ${sizeClass}" title="${element}">
        <img src="assets/images/elements/${element}.png" alt="${element}" loading="lazy">
    </span>`;
}

/**
 * Render a card as HTML
 * @param {Object} card - Card data object
 * @param {Object} options - Rendering options
 * @param {number} options.currentHP - Current HP (defaults to card.hp)
 * @param {boolean} options.showBack - Show back of card
 * @param {boolean} options.isLarge - Render as large card (for arena)
 * @param {string} options.additionalClasses - Additional CSS classes
 * @returns {string} HTML string for the card
 */
export function renderCard(card, options = {}) {
    const {
        currentHP = card.hp,
        showBack = false,
        isLarge = false,
        additionalClasses = ''
    } = options;

    const tierClass = TIERS[card.tier]?.borderClass || 'tier-common';
    const hpPercent = Math.max(0, Math.min(100, (currentHP / card.hp) * 100));
    const sizeClass = isLarge ? 'card-large' : '';

    // Element icons
    const elementIcons = card.elements.map(el => createElementIcon(el)).join('');

    // Image path - use generated images if available
    const imagePath = `assets/images/generated/${card.id}_generated.png`;

    if (showBack) {
        return renderCardBack(card, { tierClass, sizeClass, additionalClasses });
    }

    return `
        <div class="game-card ${tierClass} ${sizeClass} ${additionalClasses}"
             data-card-id="${card.id}"
             data-tier="${card.tier}"
             title="Click to select, double-click for details">
            <button class="card-info-btn" title="View card details" aria-label="View details for ${card.name}">i</button>
            <div class="card-image">
                <img src="${imagePath}"
                     alt="${card.name}"
                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="card-image-placeholder" style="display:none;">No Image</div>
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-elements">${elementIcons}</div>
            <div class="card-hp-bar">
                <div class="card-hp-fill" style="width: ${hpPercent}%"></div>
            </div>
            <div class="card-hp-text">${formatHP(currentHP)} / ${formatHP(card.hp)}</div>
        </div>
    `;
}

/**
 * Sort actions by: strength descending, then element count, then element name alphabetically
 * @param {Array} actions - Array of attack or defense objects
 * @param {string} strengthKey - Key for strength value ('base_damage' or 'base_protection')
 * @returns {Array} Sorted array
 */
function sortActions(actions, strengthKey) {
    return [...actions].sort((a, b) => {
        // Primary: strength descending
        const strengthDiff = (b[strengthKey] || 0) - (a[strengthKey] || 0);
        if (strengthDiff !== 0) return strengthDiff;

        // Secondary: element name alphabetically
        const elemA = a.element || '';
        const elemB = b.element || '';
        return elemA.localeCompare(elemB);
    });
}

/**
 * Render the back of a card (bio, attacks, defenses, specials)
 * @param {Object} card - Card data object
 * @param {Object} options - Rendering options
 * @returns {string} HTML string for card back
 */
export function renderCardBack(card, options = {}) {
    const { tierClass = '', sizeClass = '', additionalClasses = '' } = options;

    // Sort attacks by strength (descending)
    const sortedAttacks = sortActions(card.attacks || [], 'base_damage');
    const attacksHTML = sortedAttacks.map(attack => `
        <div class="card-attack">
            <span class="attack-name">${attack.name}</span>
            <span class="attack-element element-icon element-icon-sm ${attack.element}">
                <img src="assets/images/elements/${attack.element}.png" alt="${attack.element}" loading="lazy">
            </span>
            <span class="attack-damage">${formatHP(attack.base_damage)}</span>
            ${attack.limited_uses ? `<span class="attack-uses">(${attack.limited_uses}x)</span>` : ''}
        </div>
    `).join('');

    // Sort defenses by protection (descending)
    const sortedDefenses = sortActions(card.defenses || [], 'base_protection');
    const defensesHTML = sortedDefenses.map(defense => `
        <div class="card-defense">
            <span class="defense-name">${defense.name}</span>
            <span class="defense-element element-icon element-icon-sm ${defense.element}">
                <img src="assets/images/elements/${defense.element}.png" alt="${defense.element}" loading="lazy">
            </span>
            <span class="defense-protection">${formatHP(defense.base_protection)}</span>
            ${defense.special_type ? `<span class="defense-special">[${defense.special_type}]</span>` : ''}
        </div>
    `).join('');

    // Render special abilities
    const specialsHTML = card.special_abilities && card.special_abilities.length > 0
        ? card.special_abilities.map(ability => {
            const abilityName = typeof ability === 'string' ? ability : ability.name;
            const uses = typeof ability === 'object' && ability.uses ? `(${ability.uses}x)` : '';
            return `<div class="card-special"><span class="special-name">${abilityName}</span>${uses}</div>`;
        }).join('')
        : '';

    // Order: name, bio, elements, attacks, defenses, specials
    return `
        <div class="game-card card-back-view ${tierClass} ${sizeClass} ${additionalClasses}"
             data-card-id="${card.id}">
            <div class="card-back-content">
                <div class="card-back-name">${card.name}</div>

                ${card.biography ? `
                    <div class="card-biography">
                        <p>${card.biography}</p>
                    </div>
                ` : ''}

                <div class="card-elements-back">${card.elements.map(el => createElementIcon(el)).join('')}</div>

                ${sortedAttacks.length > 0 ? `
                    <div class="card-attacks-section">
                        <h4>Attacks</h4>
                        ${attacksHTML}
                    </div>
                ` : ''}

                ${sortedDefenses.length > 0 ? `
                    <div class="card-defenses-section">
                        <h4>Defenses</h4>
                        ${defensesHTML}
                    </div>
                ` : ''}

                ${specialsHTML ? `
                    <div class="card-specials-section">
                        <h4>Special</h4>
                        ${specialsHTML}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render a card placeholder
 * @param {string} text - Placeholder text
 * @param {string} additionalClasses - Additional CSS classes
 * @returns {string} HTML string for placeholder
 */
export function renderCardPlaceholder(text = 'Empty Slot', additionalClasses = '') {
    return `
        <div class="card-placeholder ${additionalClasses}">
            <span class="placeholder-text">${text}</span>
        </div>
    `;
}

/**
 * Create a card detail view for the modal
 * @param {Object} card - Card data object
 * @param {Object} gameState - Current game state for HP tracking
 * @returns {Object} Object with front and back HTML
 */
export function createCardDetailView(card, gameState = {}) {
    const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
    const tierClass = TIERS[card.tier]?.borderClass || 'tier-common';

    return {
        front: renderCard(card, { currentHP, isLarge: true }),
        back: renderCardBack(card, { tierClass, isLarge: true })
    };
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (mutates original)
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Draw random cards from the deck
 * @param {number} count - Number of cards to draw
 * @param {Array} excludeIds - Card IDs to exclude
 * @returns {Array} Array of drawn card objects
 */
export function drawRandomCards(count, excludeIds = []) {
    const available = allCards.filter(card => !excludeIds.includes(card.id));
    const shuffled = shuffleArray([...available]);
    return shuffled.slice(0, count);
}
