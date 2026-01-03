/**
 * Monster Ghost Army Cards - Unified Card Component
 *
 * This module provides a single, unified card rendering function that uses
 * pre-rendered card images. All card views (drafting, battle, arena, modal,
 * mini cards) use this component with different size options.
 */

import { formatHP, ELEMENTS } from './cards.js';

/**
 * Card size presets for different contexts
 */
export const CARD_SIZES = {
    // Drafting gallery cards
    drafting: {
        scale: 1.0,
        width: 160,
        height: 224
    },
    // Battle cards in player/opponent hands
    battle: {
        scale: 0.85,
        width: 160,
        height: 224
    },
    // Arena cards (attacker/defender slots)
    arena: {
        scale: 1.3,
        width: 160,
        height: 224
    },
    // Modal detail view
    modal: {
        scale: 2.5,
        width: 160,
        height: 224
    },
    // Mini cards in sidebar
    mini: {
        scale: 0.5,
        width: 160,
        height: 224
    }
};

/**
 * Check if pre-rendered card images exist
 * Falls back to generated images if not available
 * @param {string} cardId - Card ID
 * @returns {Object} Image paths for front and back
 */
function getCardImagePaths(cardId) {
    // Primary: pre-rendered card images
    const preRenderedFront = `assets/images/cards/${cardId}_front.png`;
    const preRenderedBack = `assets/images/cards/${cardId}_back.png`;

    // Fallback: generated images (old format)
    const generatedImage = `assets/images/generated/${cardId}_generated.png`;

    return {
        front: preRenderedFront,
        back: preRenderedBack,
        fallbackImage: generatedImage,
        // Flag to indicate we should check if pre-rendered exists
        usePreRendered: true
    };
}

/**
 * Create a unified card element
 * Uses pre-rendered front/back images when available, falls back to DOM rendering
 *
 * @param {Object} card - Card data object
 * @param {Object} options - Rendering options
 * @param {string} options.size - Size preset: 'drafting', 'battle', 'arena', 'modal', 'mini'
 * @param {Object} options.gameState - Game state for HP tracking (optional)
 * @param {Function} options.onCardClick - Click handler (optional)
 * @param {Function} options.onInfoClick - Info button click handler (optional)
 * @param {boolean} options.showHP - Whether to show external HP bar (default: true for battle/arena)
 * @param {boolean} options.draggable - Whether card is draggable (default: false)
 * @param {string} options.dragType - Drag type: 'player' or 'opponent'
 * @param {string} options.additionalClasses - Additional CSS classes
 * @param {boolean} options.startFlipped - Whether to start in flipped state
 * @param {Function} options.onClose - Callback when modal closes (modal only)
 * @returns {HTMLElement} Card container element
 */
export function createCardElement(card, options = {}) {
    const {
        size = 'drafting',
        gameState = {},
        onCardClick = null,
        onInfoClick = null,
        showHP = ['battle', 'arena'].includes(size),
        draggable = false,
        dragType = 'player',
        additionalClasses = '',
        startFlipped = false,
        onClose = null
    } = options;

    const sizeConfig = CARD_SIZES[size] || CARD_SIZES.drafting;
    const imagePaths = getCardImagePaths(card.id);
    const tierClass = `tier-${card.tier || 'common'}`;
    const currentHP = gameState.cardHP?.[card.id] ?? card.hp;

    // Create container wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `card-container ${tierClass} card-size-${size} ${additionalClasses}`.trim();
    wrapper.dataset.cardId = card.id;
    wrapper.style.setProperty('--card-scale', sizeConfig.scale);

    // Create the flipping card structure
    const cardDiv = document.createElement('div');
    cardDiv.className = 'unified-card';
    cardDiv.dataset.cardId = card.id;
    cardDiv.dataset.tier = card.tier || 'common';
    if (startFlipped) {
        cardDiv.classList.add('flipped');
    }

    const flipper = document.createElement('div');
    flipper.className = 'card-flipper';

    // === FRONT FACE ===
    const frontFace = document.createElement('div');
    frontFace.className = 'card-front';

    // Try pre-rendered image first
    const frontImg = document.createElement('img');
    frontImg.className = 'card-face-image';
    frontImg.alt = card.name;
    frontImg.loading = 'lazy';

    // Use pre-rendered or fall back to DOM rendering
    frontImg.src = imagePaths.front;
    frontImg.onerror = function() {
        // Pre-rendered not available, render DOM-based front
        this.style.display = 'none';
        const domFront = createDOMCardFront(card, sizeConfig);
        frontFace.appendChild(domFront);
    };
    frontFace.appendChild(frontImg);

    // Info button (always present as overlay)
    const frontInfoBtn = createInfoButton(() => {
        cardDiv.classList.toggle('flipped');
        if (onInfoClick) onInfoClick(card, cardDiv.classList.contains('flipped'));
    });
    frontFace.appendChild(frontInfoBtn);

    // Tier badge overlay
    const frontTierBadge = createTierBadge(card.tier);
    frontFace.appendChild(frontTierBadge);

    flipper.appendChild(frontFace);

    // === BACK FACE ===
    const backFace = document.createElement('div');
    backFace.className = 'card-back';

    // Try pre-rendered back image first
    const backImg = document.createElement('img');
    backImg.className = 'card-face-image';
    backImg.alt = `${card.name} details`;
    backImg.loading = 'lazy';

    backImg.src = imagePaths.back;
    backImg.onerror = function() {
        // Pre-rendered not available, render DOM-based back
        this.style.display = 'none';
        const domBack = createDOMCardBack(card, sizeConfig);
        backFace.appendChild(domBack);
    };
    backFace.appendChild(backImg);

    // Info button on back (to flip back)
    const backInfoBtn = createInfoButton(() => {
        cardDiv.classList.toggle('flipped');
        if (onInfoClick) onInfoClick(card, cardDiv.classList.contains('flipped'));
    });
    backFace.appendChild(backInfoBtn);

    // Tier badge overlay on back
    const backTierBadge = createTierBadge(card.tier);
    backFace.appendChild(backTierBadge);

    flipper.appendChild(backFace);
    cardDiv.appendChild(flipper);
    wrapper.appendChild(cardDiv);

    // === HP BAR (external, below card) ===
    if (showHP) {
        const hpDisplay = createHPDisplay(card, currentHP);
        wrapper.appendChild(hpDisplay);
    }

    // === EVENT HANDLERS ===

    // Click handler (select card, but not when flipped to back)
    if (onCardClick) {
        cardDiv.addEventListener('click', (e) => {
            // Only trigger selection on front face (not flipped)
            if (!cardDiv.classList.contains('flipped')) {
                onCardClick(card.id, card);
            }
        });

        // Double-click opens modal
        cardDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (window.handleCardDoubleClick) {
                window.handleCardDoubleClick(card.id);
            }
        });
    }

    // Drag and drop
    if (draggable) {
        setupDragHandlers(wrapper, cardDiv, card, dragType);
    }

    return wrapper;
}

/**
 * Create the info button that flips the card
 */
function createInfoButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'card-info-btn';
    btn.textContent = 'i';
    btn.title = 'Flip card for details';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return btn;
}

/**
 * Create tier badge element
 */
function createTierBadge(tier) {
    const badge = document.createElement('span');
    badge.className = `tier-badge ${tier || 'common'}`;
    badge.textContent = capitalizeFirst(tier || 'common');
    return badge;
}

/**
 * Create external HP display below card
 */
function createHPDisplay(card, currentHP) {
    const hpDisplay = document.createElement('div');
    hpDisplay.className = 'external-hp-display';
    hpDisplay.dataset.cardId = card.id;

    const hpPercent = Math.max(0, Math.min(100, (currentHP / card.hp) * 100));

    const hpBar = document.createElement('div');
    hpBar.className = 'external-hp-bar';

    const hpFill = document.createElement('div');
    hpFill.className = 'external-hp-fill';
    hpFill.style.width = `${hpPercent}%`;
    hpBar.appendChild(hpFill);
    hpDisplay.appendChild(hpBar);

    const hpText = document.createElement('div');
    hpText.className = 'external-hp-text';
    hpText.textContent = `${formatHP(currentHP)} / ${formatHP(card.hp)}`;
    hpDisplay.appendChild(hpText);

    return hpDisplay;
}

/**
 * Create DOM-based card front (fallback when pre-rendered not available)
 */
function createDOMCardFront(card, sizeConfig) {
    const container = document.createElement('div');
    container.className = 'card-dom-content card-dom-front';

    // Card image
    const imageDiv = document.createElement('div');
    imageDiv.className = 'card-image';
    const img = document.createElement('img');
    img.src = `assets/images/generated/${card.id}_generated.png`;
    img.alt = card.name;
    img.onerror = function() {
        this.style.display = 'none';
        const placeholder = document.createElement('span');
        placeholder.className = 'no-image-placeholder';
        placeholder.textContent = 'No Image';
        this.parentElement.appendChild(placeholder);
    };
    imageDiv.appendChild(img);
    container.appendChild(imageDiv);

    // Card info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';

    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = card.name;
    infoDiv.appendChild(nameDiv);

    // Elements
    const elementsDiv = document.createElement('div');
    elementsDiv.className = 'card-elements';
    card.elements.forEach(el => {
        elementsDiv.appendChild(createElementIcon(el));
    });
    infoDiv.appendChild(elementsDiv);

    // Biography (on front, below elements)
    if (card.biography) {
        const bioDiv = document.createElement('div');
        bioDiv.className = 'card-front-bio';
        bioDiv.textContent = card.biography;
        infoDiv.appendChild(bioDiv);
    }

    // Stats
    const statsDiv = document.createElement('div');
    statsDiv.className = 'card-stats';

    const hpSpan = document.createElement('span');
    hpSpan.className = 'stat stat-hp';
    hpSpan.textContent = 'HP: ' + formatHP(card.hp || 0);
    statsDiv.appendChild(hpSpan);

    const atkSpan = document.createElement('span');
    atkSpan.className = 'stat stat-atk';
    atkSpan.textContent = 'ATK: ' + formatHP(getAvgAttack(card));
    statsDiv.appendChild(atkSpan);

    const defSpan = document.createElement('span');
    defSpan.className = 'stat stat-def';
    defSpan.textContent = 'DEF: ' + formatHP(getAvgDefense(card));
    statsDiv.appendChild(defSpan);

    infoDiv.appendChild(statsDiv);
    container.appendChild(infoDiv);

    return container;
}

/**
 * Create DOM-based card back (fallback when pre-rendered not available)
 */
function createDOMCardBack(card, sizeConfig) {
    const container = document.createElement('div');
    container.className = 'card-dom-content card-dom-back';

    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = card.name;
    container.appendChild(nameDiv);

    // Elements
    const elementsDiv = document.createElement('div');
    elementsDiv.className = 'card-elements';
    card.elements.forEach(el => {
        elementsDiv.appendChild(createElementIcon(el));
    });
    container.appendChild(elementsDiv);

    // Attacks section
    if (card.attacks && card.attacks.length > 0) {
        const sortedAttacks = [...card.attacks].sort((a, b) =>
            (b.base_damage || 0) - (a.base_damage || 0)
        );
        const attackSection = document.createElement('div');
        attackSection.className = 'card-back-section';

        const attackTitle = document.createElement('h4');
        attackTitle.textContent = 'Attacks';
        attackSection.appendChild(attackTitle);

        const attackList = document.createElement('ul');
        sortedAttacks.forEach(atk => {
            const li = document.createElement('li');
            const elementIcon = createElementIcon(atk.element, 'small');
            if (elementIcon) li.appendChild(elementIcon);
            const textSpan = document.createElement('span');
            textSpan.textContent = `${atk.name} (${formatHP(atk.base_damage || 0)} dmg)`;
            li.appendChild(textSpan);
            attackList.appendChild(li);
        });
        attackSection.appendChild(attackList);
        container.appendChild(attackSection);
    }

    // Defenses section
    if (card.defenses && card.defenses.length > 0) {
        const sortedDefenses = [...card.defenses].sort((a, b) =>
            (b.base_protection || 0) - (a.base_protection || 0)
        );
        const defenseSection = document.createElement('div');
        defenseSection.className = 'card-back-section';

        const defenseTitle = document.createElement('h4');
        defenseTitle.textContent = 'Defenses';
        defenseSection.appendChild(defenseTitle);

        const defenseList = document.createElement('ul');
        sortedDefenses.forEach(def => {
            const li = document.createElement('li');
            const elementIcon = createElementIcon(def.element, 'small');
            if (elementIcon) li.appendChild(elementIcon);
            const textSpan = document.createElement('span');
            textSpan.textContent = `${def.name} (-${formatHP(def.base_protection || 0)})`;
            li.appendChild(textSpan);
            defenseList.appendChild(li);
        });
        defenseSection.appendChild(defenseList);
        container.appendChild(defenseSection);
    }

    // Special abilities section
    if (card.special_abilities && card.special_abilities.length > 0) {
        const specialSection = document.createElement('div');
        specialSection.className = 'card-back-section';

        const specialTitle = document.createElement('h4');
        specialTitle.textContent = 'Special Abilities';
        specialSection.appendChild(specialTitle);

        const specialList = document.createElement('ul');
        card.special_abilities.forEach(ability => {
            const li = document.createElement('li');
            const abilityName = typeof ability === 'string' ? ability : ability.name;
            const uses = typeof ability === 'object' && ability.uses ? ` (${ability.uses}x)` : '';
            li.textContent = abilityName + uses;
            specialList.appendChild(li);
        });
        specialSection.appendChild(specialList);
        container.appendChild(specialSection);
    }

    return container;
}

/**
 * Create element icon
 */
function createElementIcon(element, size = 'medium') {
    if (!element) return null;
    const elementConfig = ELEMENTS[element];
    if (!elementConfig) return null;

    const iconSpan = document.createElement('span');
    iconSpan.className = `element-icon ${element}${size === 'small' ? ' element-icon-sm' : ''}`;
    iconSpan.title = element;

    const iconImg = document.createElement('img');
    iconImg.src = `assets/images/elements/${element}.png`;
    iconImg.alt = element;
    iconImg.loading = 'lazy';
    iconSpan.appendChild(iconImg);

    return iconSpan;
}

/**
 * Setup drag and drop handlers
 */
function setupDragHandlers(wrapper, cardDiv, card, dragType) {
    wrapper.draggable = true;
    wrapper.dataset.cardType = dragType;
    let currentDragImage = null;

    wrapper.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.setData('application/x-card-type', dragType);
        e.dataTransfer.effectAllowed = 'move';
        wrapper.classList.add('dragging');

        // Create custom drag image
        const dragImage = wrapper.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.left = '-9999px';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'scale(0.7)';
        dragImage.style.pointerEvents = 'none';
        dragImage.classList.remove('dragging');
        document.body.appendChild(dragImage);
        currentDragImage = dragImage;

        const rect = wrapper.getBoundingClientRect();
        e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);

        // Highlight valid drop zones
        const slotId = dragType === 'player' ? 'attacker-slot' : 'defender-slot';
        const slot = document.getElementById(slotId);
        if (slot) {
            slot.classList.add('drag-target');
        }
    });

    wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        if (currentDragImage && currentDragImage.parentNode) {
            currentDragImage.parentNode.removeChild(currentDragImage);
            currentDragImage = null;
        }

        // Remove drop zone highlights
        const attackerSlot = document.getElementById('attacker-slot');
        const defenderSlot = document.getElementById('defender-slot');
        if (attackerSlot) {
            attackerSlot.classList.remove('drag-target', 'drag-over');
        }
        if (defenderSlot) {
            defenderSlot.classList.remove('drag-target', 'drag-over');
        }
    });
}

/**
 * Create a mini card element (simplified version for sidebar)
 */
export function createMiniCardElement(card, options = {}) {
    const {
        onDoubleClick = null
    } = options;

    const tierClass = `tier-${card.tier || 'common'}`;
    const miniCard = document.createElement('div');
    miniCard.className = `drafted-mini-card ${tierClass}`;
    miniCard.dataset.cardId = card.id;

    // Try pre-rendered mini image first, fall back to generated
    const imageDiv = document.createElement('div');
    imageDiv.className = 'mini-image';

    const img = document.createElement('img');
    // Try pre-rendered front (it will be scaled down)
    img.src = `assets/images/cards/${card.id}_front.png`;
    img.alt = card.name;
    img.onerror = function() {
        // Fall back to generated image
        this.src = `assets/images/generated/${card.id}_generated.png`;
        this.onerror = function() {
            this.style.display = 'none';
        };
    };
    imageDiv.appendChild(img);
    miniCard.appendChild(imageDiv);

    // Mini info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'mini-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'mini-name';
    nameDiv.textContent = card.name;
    infoDiv.appendChild(nameDiv);

    const elementsDiv = document.createElement('div');
    elementsDiv.className = 'mini-elements';
    card.elements.forEach(el => {
        const iconSpan = createElementIcon(el, 'small');
        if (iconSpan) {
            elementsDiv.appendChild(iconSpan);
        }
    });
    infoDiv.appendChild(elementsDiv);
    miniCard.appendChild(infoDiv);

    // Double-click handler
    if (onDoubleClick) {
        miniCard.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            onDoubleClick(card);
        });
        miniCard.style.cursor = 'pointer';
        miniCard.title = 'Double-click for details';
    }

    return miniCard;
}

/**
 * Update HP display for a card
 */
export function updateCardHPDisplay(cardId, currentHP, maxHP) {
    const percent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

    // Update all HP displays for this card
    const displays = document.querySelectorAll(`.external-hp-display[data-card-id="${cardId}"]`);
    displays.forEach(display => {
        const fill = display.querySelector('.external-hp-fill');
        const text = display.querySelector('.external-hp-text');

        if (fill) {
            fill.style.width = `${percent}%`;
        }
        if (text) {
            text.textContent = `${formatHP(currentHP)} / ${formatHP(maxHP)}`;
        }
    });
}

// === HELPER FUNCTIONS ===

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getAvgAttack(card) {
    const attacks = card.attacks || [];
    if (attacks.length === 0) return 0;
    const total = attacks.reduce((sum, atk) => sum + (atk.base_damage || 0), 0);
    return Math.round(total / attacks.length);
}

function getAvgDefense(card) {
    const defenses = card.defenses || [];
    if (defenses.length === 0) return 0;
    const total = defenses.reduce((sum, def) => sum + (def.base_protection || 0), 0);
    return Math.round(total / defenses.length);
}

// Export for use by other modules
export { getAvgAttack, getAvgDefense };
