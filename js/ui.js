/**
 * Monster Ghost Army Cards - UI Updates and Rendering Module
 *
 * This module handles all DOM manipulation, UI updates,
 * and user interface rendering.
 */

import { renderCard, renderCardPlaceholder, createCardDetailView, formatHP, ELEMENTS } from './cards.js';
import { createCardElement, createMiniCardElement as createMiniCardFromComponent, updateCardHPDisplay } from './cardComponent.js';

// DOM element references (cached for performance)
let elements = {};

/**
 * Initialize UI by caching DOM element references
 */
export function initUI() {
    elements = {
        // Main areas
        gameContainer: document.getElementById('game-container'),
        opponentCards: document.getElementById('opponent-cards'),
        playerCards: document.getElementById('player-cards'),
        battleArena: document.getElementById('battle-arena'),

        // Arena slots
        attackerSlot: document.getElementById('attacker-slot'),
        defenderSlot: document.getElementById('defender-slot'),
        battleEffects: document.getElementById('battle-effects'),
        damageDisplay: document.getElementById('damage-display'),
        damageAmount: document.getElementById('damage-amount'),
        vsIndicator: document.getElementById('vs-indicator'),

        // Action panel
        actionPanel: document.getElementById('action-panel'),
        attackButtons: document.getElementById('attack-buttons'),
        defenseButtons: document.getElementById('defense-buttons'),

        // Controls
        btnDraw: document.getElementById('btn-draw'),
        btnAttack: document.getElementById('btn-attack'),
        btnDefend: document.getElementById('btn-defend'),
        btnEndTurn: document.getElementById('btn-end-turn'),
        btnSpecial: document.getElementById('btn-special'),

        // Game info
        roundCounter: document.getElementById('round-counter'),
        turnIndicator: document.getElementById('turn-indicator'),

        // Log
        logContent: document.getElementById('log-content'),

        // Modal
        cardModal: document.getElementById('card-modal'),
        modalCardContainer: document.getElementById('modal-card-container'),
        modalCardFront: document.getElementById('modal-card-front'),
        modalCardBack: document.getElementById('modal-card-back'),
        modalClose: document.querySelector('.modal-close'),
        modalOverlay: document.querySelector('.modal-overlay'),

        // Loading
        loadingScreen: document.getElementById('loading-screen'),
        loadingStatus: document.getElementById('loading-status')
    };

    // Set up event listeners for modal
    setupModalListeners();

    // Set up drop zones for battle arena
    setupBattleDropZones();

    return elements;
}

/**
 * Set up modal event listeners
 */
function setupModalListeners() {
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', closeModal);
    }
    if (elements.modalOverlay) {
        elements.modalOverlay.addEventListener('click', closeModal);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Set up drag and drop zones for battle arena slots
 */
function setupBattleDropZones() {
    const attackerSlot = elements.attackerSlot;
    const defenderSlot = elements.defenderSlot;

    // Set up attacker slot as drop zone for player cards
    if (attackerSlot) {
        attackerSlot.addEventListener('dragover', (e) => {
            const cardType = e.dataTransfer.types.includes('application/x-card-type');
            // Only allow player cards to be dropped on attacker slot
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            attackerSlot.classList.add('drag-over');
        });

        attackerSlot.addEventListener('dragleave', (e) => {
            // Only remove if leaving the slot entirely (not entering child)
            if (!attackerSlot.contains(e.relatedTarget)) {
                attackerSlot.classList.remove('drag-over');
            }
        });

        attackerSlot.addEventListener('drop', (e) => {
            e.preventDefault();
            attackerSlot.classList.remove('drag-over');

            const cardId = e.dataTransfer.getData('text/plain');
            const cardType = e.dataTransfer.getData('application/x-card-type');

            // Only accept player cards for attacker slot
            if (cardId && cardType === 'player') {
                // Trigger card selection through the game's handleCardClick
                if (window.handleBattleCardDrop) {
                    window.handleBattleCardDrop(cardId, 'attacker');
                }
            }
        });
    }

    // Set up defender slot as drop zone for opponent cards
    if (defenderSlot) {
        defenderSlot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            defenderSlot.classList.add('drag-over');
        });

        defenderSlot.addEventListener('dragleave', (e) => {
            // Only remove if leaving the slot entirely (not entering child)
            if (!defenderSlot.contains(e.relatedTarget)) {
                defenderSlot.classList.remove('drag-over');
            }
        });

        defenderSlot.addEventListener('drop', (e) => {
            e.preventDefault();
            defenderSlot.classList.remove('drag-over');

            const cardId = e.dataTransfer.getData('text/plain');
            const cardType = e.dataTransfer.getData('application/x-card-type');

            // Only accept opponent cards for defender slot
            if (cardId && cardType === 'opponent') {
                // Trigger card selection through the game's handleCardClick
                if (window.handleBattleCardDrop) {
                    window.handleBattleCardDrop(cardId, 'defender');
                }
            }
        });
    }
}

/**
 * Update loading screen status
 * @param {string} message - Status message to display
 */
export function updateLoadingStatus(message) {
    if (elements.loadingStatus) {
        elements.loadingStatus.textContent = message;
    }
}

/**
 * Hide the loading screen
 */
export function hideLoadingScreen() {
    if (elements.loadingScreen) {
        elements.loadingScreen.classList.add('hidden');
    }
}

/**
 * Show the loading screen
 */
export function showLoadingScreen() {
    if (elements.loadingScreen) {
        elements.loadingScreen.classList.remove('hidden');
    }
}

/**
 * Safely set innerHTML - data comes from trusted local JSON
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content
 */
function setContent(element, html) {
    if (element) {
        element.innerHTML = html;
    }
}

/**
 * Render player's hand using battle card elements with flip capability
 * @param {Array} cards - Array of card objects
 * @param {Object} gameState - Current game state for HP tracking
 * @param {Function} onCardClick - Callback when a card is clicked
 */
export function renderPlayerHand(cards, gameState = {}, onCardClick = null) {
    if (!elements.playerCards) return;

    // Clear container
    while (elements.playerCards.firstChild) {
        elements.playerCards.removeChild(elements.playerCards.firstChild);
    }

    if (cards.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder player-card';
        const placeholderText = document.createElement('span');
        placeholderText.className = 'placeholder-text';
        placeholderText.textContent = 'No cards in hand';
        placeholder.appendChild(placeholderText);
        elements.playerCards.appendChild(placeholder);
        return;
    }

    // Render each card using battle card element with flip support
    cards.forEach(card => {
        const cardWrapper = createPlayerBattleCardElement(card, gameState, onCardClick, 'player-card');
        elements.playerCards.appendChild(cardWrapper);
    });
}

/**
 * Create a battle card element for the player's hand using the unified card component
 * @param {Object} card - Card data
 * @param {Object} gs - Game state for HP tracking
 * @param {Function} onCardClick - Click handler
 * @param {string} additionalClasses - Additional CSS classes
 * @returns {HTMLElement} Card wrapper element with flip capability
 */
function createPlayerBattleCardElement(card, gs, onCardClick, additionalClasses = '') {
    // Use the unified card component
    const cardContainer = createCardElement(card, {
        size: 'battle',
        gameState: gs,
        showHP: true,
        draggable: true,
        dragType: 'player',
        additionalClasses: `battle-card-wrapper ${additionalClasses}`,
        onCardClick: onCardClick ? (cardId, cardData) => {
            onCardClick(cardId);
        } : null
    });

    return cardContainer;
}

/**
 * Render opponent's cards
 * @param {Array} cards - Array of card objects (or count for face-down)
 * @param {Object} options - Rendering options
 * @param {boolean} options.faceDown - Show cards face-down
 * @param {Object} options.gameState - Current game state
 * @param {Function} options.onCardClick - Callback when a card is clicked
 */
export function renderOpponentCards(cards, options = {}) {
    const { faceDown = true, gameState = {}, onCardClick = null } = options;

    if (!elements.opponentCards) return;

    if (cards.length === 0) {
        setContent(elements.opponentCards, renderCardPlaceholder('No opponent cards', 'opponent-card'));
        return;
    }

    let html;
    if (faceDown) {
        // Render face-down cards
        html = cards.map((card, index) => `
            <div class="card-placeholder opponent-card" data-card-id="${card.id || index}">
                <div class="card-back">
                    <span class="card-back-text">?</span>
                </div>
            </div>
        `).join('');
    } else {
        // Render face-up cards (revealed)
        html = cards.map(card => {
            const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
            return renderCard(card, {
                currentHP,
                additionalClasses: 'opponent-card'
            });
        }).join('');
    }

    setContent(elements.opponentCards, html);

    // Add click listeners
    if (onCardClick) {
        elements.opponentCards.querySelectorAll('.card-placeholder, .game-card').forEach(cardEl => {
            const cardId = cardEl.dataset.cardId;

            // Info button click opens detail modal
            const infoBtn = cardEl.querySelector('.card-info-btn');
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.handleCardDoubleClick) {
                        window.handleCardDoubleClick(cardId);
                    }
                });
            }

            cardEl.addEventListener('click', () => {
                onCardClick(cardId, 'opponent');
            });
            // Double-click opens detail modal
            cardEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (window.handleCardDoubleClick) {
                    window.handleCardDoubleClick(cardId);
                }
            });
        });
    }
}

/**
 * Create an arena card element using the unified card component
 * @param {Object} card - Card data
 * @param {Object} gameState - Game state for HP tracking
 * @returns {HTMLElement} Arena card element with flip capability
 */
function createArenaCardElement(card, gameState = {}) {
    // Use the unified card component with arena size
    const cardContainer = createCardElement(card, {
        size: 'arena',
        gameState: gameState,
        showHP: true,
        draggable: false,
        additionalClasses: 'arena-card-wrapper'
    });

    // Add double-click handler to open modal (with flip state sync)
    const cardDiv = cardContainer.querySelector('.unified-card');
    if (cardDiv) {
        cardDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const isCurrentlyFlipped = cardDiv.classList.contains('flipped');
            openCardModal(card, gameState, {
                startFlipped: isCurrentlyFlipped,
                onClose: (isFlipped, closedCardId) => {
                    // Sync the flip state back to the arena card
                    if (closedCardId === card.id) {
                        if (isFlipped) {
                            cardDiv.classList.add('flipped');
                        } else {
                            cardDiv.classList.remove('flipped');
                        }
                    }
                }
            });
        });
    }

    return cardContainer;
}

/**
 * Set a card in the attacker slot
 * @param {Object} card - Card object (or null to clear)
 * @param {Object} gameState - Current game state
 */
export function setAttackerCard(card, gameState = {}) {
    if (!elements.attackerSlot) return;

    // Clear the slot first
    while (elements.attackerSlot.firstChild) {
        elements.attackerSlot.removeChild(elements.attackerSlot.firstChild);
    }

    // Add slot label
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = 'Attacker';
    elements.attackerSlot.appendChild(label);

    if (card) {
        // Create arena card with flip support
        const arenaCard = createArenaCardElement(card, gameState);
        elements.attackerSlot.appendChild(arenaCard);
    } else {
        // Show placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder arena-card';
        const placeholderText = document.createElement('span');
        placeholderText.className = 'placeholder-text';
        placeholderText.textContent = 'Select a card to attack';
        placeholder.appendChild(placeholderText);
        elements.attackerSlot.appendChild(placeholder);
    }
}

/**
 * Set a card in the defender slot
 * @param {Object} card - Card object (or null to clear)
 * @param {Object} gameState - Current game state
 */
export function setDefenderCard(card, gameState = {}) {
    if (!elements.defenderSlot) return;

    // Clear the slot first
    while (elements.defenderSlot.firstChild) {
        elements.defenderSlot.removeChild(elements.defenderSlot.firstChild);
    }

    // Add slot label
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = 'Defender';
    elements.defenderSlot.appendChild(label);

    if (card) {
        // Create arena card with flip support
        const arenaCard = createArenaCardElement(card, gameState);
        elements.defenderSlot.appendChild(arenaCard);
    } else {
        // Show placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder arena-card';
        const placeholderText = document.createElement('span');
        placeholderText.className = 'placeholder-text';
        placeholderText.textContent = 'Select a target';
        placeholder.appendChild(placeholderText);
        elements.defenderSlot.appendChild(placeholder);
    }
}

/**
 * Show attack options in the action panel
 * @param {Array} attacks - Array of attack options
 * @param {Function} onSelect - Callback when an attack is selected
 */
export function showAttackOptions(attacks, onSelect) {
    if (!elements.attackButtons || !elements.actionPanel) return;

    const html = attacks.map(attack => `
        <button class="action-btn attack-option"
                data-attack-name="${attack.name}"
                data-attack-element="${attack.element}"
                ${!attack.canUse ? 'disabled' : ''}>
            <span class="attack-name">${attack.name}</span>
            <span class="attack-damage">${formatHP(attack.base_damage)}</span>
            <span class="element-icon ${attack.element}"><img src="assets/images/elements/${attack.element}.png" alt="${attack.element}" loading="lazy"></span>
            ${attack.remainingUses !== Infinity ? `<span class="uses">(${attack.remainingUses}x)</span>` : ''}
        </button>
    `).join('');

    setContent(elements.attackButtons, html);

    // Add click listeners
    elements.attackButtons.querySelectorAll('.attack-option').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                const attackName = btn.dataset.attackName;
                onSelect(attackName);
            });
        }
    });

    elements.actionPanel.classList.remove('hidden');
}

/**
 * Show defense options in the action panel
 * @param {Array} defenses - Array of defense options
 * @param {Function} onSelect - Callback when a defense is selected
 */
export function showDefenseOptions(defenses, onSelect) {
    if (!elements.defenseButtons || !elements.actionPanel) return;

    const html = defenses.map(defense => `
        <button class="action-btn defense-option"
                data-defense-name="${defense.name}"
                data-defense-element="${defense.element}"
                ${!defense.canUse ? 'disabled' : ''}>
            <span class="defense-name">${defense.name}</span>
            <span class="defense-protection">${formatHP(defense.base_protection)}</span>
            <span class="element-icon ${defense.element}"><img src="assets/images/elements/${defense.element}.png" alt="${defense.element}" loading="lazy"></span>
            ${defense.special_type ? `<span class="special">[${defense.special_type}]</span>` : ''}
            ${defense.remainingUses !== Infinity ? `<span class="uses">(${defense.remainingUses}x)</span>` : ''}
        </button>
    `).join('');

    setContent(elements.defenseButtons, html);

    // Add click listeners
    elements.defenseButtons.querySelectorAll('.defense-option').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                const defenseName = btn.dataset.defenseName;
                onSelect(defenseName);
            });
        }
    });

    elements.actionPanel.classList.remove('hidden');
}

/**
 * Hide the action panel
 */
export function hideActionPanel() {
    if (elements.actionPanel) {
        elements.actionPanel.classList.add('hidden');
    }
    // Also hide special abilities panel
    const specialPanel = document.getElementById('special-abilities-panel');
    if (specialPanel) {
        specialPanel.classList.add('hidden');
    }
}

/**
 * Show special ability options
 * @param {Array} abilities - Array of available ability objects
 * @param {Function} onSelect - Callback when an ability is selected
 */
export function showSpecialAbilityOptions(abilities, onSelect) {
    // Find or create special abilities panel
    let specialPanel = document.getElementById('special-abilities-panel');
    if (!specialPanel) {
        specialPanel = document.createElement('div');
        specialPanel.id = 'special-abilities-panel';
        specialPanel.className = 'special-abilities-panel';

        // Add it after the action panel
        const actionPanel = elements.actionPanel || document.getElementById('action-panel');
        if (actionPanel && actionPanel.parentNode) {
            actionPanel.parentNode.insertBefore(specialPanel, actionPanel.nextSibling);
        } else {
            document.body.appendChild(specialPanel);
        }
    }

    // Build abilities HTML
    const abilitiesHtml = abilities.map(ability => {
        const typeClass = `ability-type-${ability.type}`;
        const usesText = ability.remainingUses === Infinity ? '' :
            ` (${ability.remainingUses} use${ability.remainingUses !== 1 ? 's' : ''} left)`;
        const disabledClass = ability.canUse ? '' : 'disabled';

        return `
            <button class="special-ability-btn ${typeClass} ${disabledClass}"
                    data-ability-id="${ability.id}"
                    ${!ability.canUse ? 'disabled' : ''}>
                <span class="ability-name">${ability.name}</span>
                <span class="ability-description">${ability.description}</span>
                <span class="ability-uses">${usesText}</span>
            </button>
        `;
    }).join('');

    specialPanel.innerHTML = `
        <div class="special-abilities-header">
            <h3>Special Abilities</h3>
        </div>
        <div class="special-abilities-list">
            ${abilitiesHtml}
        </div>
    `;

    // Add click listeners
    specialPanel.querySelectorAll('.special-ability-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                const abilityId = btn.dataset.abilityId;
                onSelect(abilityId);
            });
        }
    });

    specialPanel.classList.remove('hidden');
}

/**
 * Show status effects on cards (visual indicators)
 * @param {Object} statusEffects - Status effects state
 * @param {string} cardId - Card ID to show effects for
 */
export function showStatusEffects(statusEffects, cardId) {
    if (!statusEffects) return;

    const cardWrapper = document.querySelector(`.battle-card-wrapper[data-card-id="${cardId}"]`);
    if (!cardWrapper) return;

    // Remove existing status indicators
    const existingIndicators = cardWrapper.querySelectorAll('.status-indicator');
    existingIndicators.forEach(el => el.remove());

    const indicators = [];

    // Check for buffs
    const buffs = statusEffects.buffs?.[cardId] || [];
    buffs.forEach(buff => {
        indicators.push({
            type: 'buff',
            icon: '+',
            title: buff.abilityId
        });
    });

    // Check for debuffs
    const debuffs = statusEffects.debuffs?.[cardId] || [];
    debuffs.forEach(debuff => {
        indicators.push({
            type: 'debuff',
            icon: '-',
            title: debuff.abilityId
        });
    });

    // Check for shields
    const shield = statusEffects.shields?.[cardId];
    if (shield) {
        indicators.push({
            type: 'shield',
            icon: 'S',
            title: shield.abilityId
        });
    }

    // Check for stuns
    const stun = statusEffects.stuns?.[cardId];
    if (stun && stun.remainingTurns > 0) {
        indicators.push({
            type: 'stun',
            icon: '!',
            title: 'Stunned'
        });
    }

    // Check for DoTs
    const dots = statusEffects.dots?.[cardId] || [];
    dots.forEach(dot => {
        if (dot.remainingDuration > 0) {
            indicators.push({
                type: 'dot',
                icon: 'F',
                title: 'Burning'
            });
        }
    });

    // Add indicators to card
    if (indicators.length > 0) {
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'status-indicators';

        indicators.forEach(ind => {
            const indicator = document.createElement('span');
            indicator.className = `status-indicator status-${ind.type}`;
            indicator.textContent = ind.icon;
            indicator.title = ind.title;
            indicatorContainer.appendChild(indicator);
        });

        cardWrapper.appendChild(indicatorContainer);
    }
}

/**
 * Show damage animation
 * @param {number} damage - Damage amount
 * @param {boolean} isCritical - Whether this was a critical hit
 * @param {boolean} isResisted - Whether damage was resisted
 */
export function showDamageAnimation(damage, isCritical = false, isResisted = false) {
    if (!elements.damageDisplay || !elements.damageAmount) return;

    elements.damageAmount.textContent = `-${formatHP(damage)}`;

    // Add appropriate styling
    elements.damageDisplay.className = 'animate-damage';
    if (isCritical) {
        elements.damageAmount.style.color = '#FFD700';
        elements.damageAmount.style.fontSize = '2rem';
    } else if (isResisted) {
        elements.damageAmount.style.color = '#87CEEB';
        elements.damageAmount.style.fontSize = '1.2rem';
    } else {
        elements.damageAmount.style.color = '#FF4500';
        elements.damageAmount.style.fontSize = '1.5rem';
    }

    elements.damageDisplay.classList.remove('hidden');

    // Hide after animation
    setTimeout(() => {
        elements.damageDisplay.classList.add('hidden');
    }, 2000);
}

/**
 * Apply shake animation to an element
 * @param {HTMLElement} element - Element to shake
 */
export function shakeElement(element) {
    element.classList.add('animate-shake');
    setTimeout(() => {
        element.classList.remove('animate-shake');
    }, 500);
}

/**
 * Update the round counter
 * @param {number} round - Current round number
 */
export function updateRoundCounter(round) {
    if (elements.roundCounter) {
        elements.roundCounter.textContent = `Round: ${round}`;
    }
}

/**
 * Update the turn indicator
 * @param {string} playerName - Name of current player
 */
export function updateTurnIndicator(playerName) {
    if (elements.turnIndicator) {
        elements.turnIndicator.textContent = `Current Turn: ${playerName}`;
    }
}

/**
 * Add an entry to the game log
 * @param {string} message - Log message
 * @param {string} type - Log type: 'system', 'attack', 'defense', 'damage', 'special'
 */
export function addLogEntry(message, type = 'system') {
    if (!elements.logContent) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = message;

    elements.logContent.appendChild(entry);

    // Auto-scroll to bottom
    elements.logContent.scrollTop = elements.logContent.scrollHeight;
}

/**
 * Clear the game log
 */
export function clearLog() {
    if (elements.logContent) {
        elements.logContent.textContent = '';
    }
}

/**
 * Enable/disable control buttons
 * @param {Object} states - Object with button states { draw, attack, defend, endTurn, special }
 */
export function setControlStates(states) {
    if (states.draw !== undefined && elements.btnDraw) {
        elements.btnDraw.disabled = !states.draw;
    }
    if (states.attack !== undefined && elements.btnAttack) {
        elements.btnAttack.disabled = !states.attack;
    }
    if (states.defend !== undefined && elements.btnDefend) {
        elements.btnDefend.disabled = !states.defend;
    }
    if (states.endTurn !== undefined && elements.btnEndTurn) {
        elements.btnEndTurn.disabled = !states.endTurn;
    }
    if (states.special !== undefined && elements.btnSpecial) {
        elements.btnSpecial.disabled = !states.special;
    }
}

/**
 * Open the card detail modal with flip animation
 * @param {Object} card - Card object
 * @param {Object} gameState - Current game state
 * @param {Object} options - Modal options
 * @param {boolean} options.startFlipped - Whether to start in flipped state
 * @param {Function} options.onClose - Callback when modal closes, receives isFlipped state
 */
export function openCardModal(card, gameState = {}, options = {}) {
    if (!elements.cardModal || !elements.modalCardContainer) return;

    const { startFlipped = false, onClose = null } = options;

    const container = elements.modalCardContainer;
    const frontFace = elements.modalCardFront;
    const backFace = elements.modalCardBack;

    // Store the onClose callback and card id for when modal closes
    elements.cardModal._onCloseCallback = onClose;
    elements.cardModal._currentCardId = card.id;

    // Set tier class on container for styling (do this first, then add flipped if needed)
    container.className = 'modal-card-container tier-' + (card.tier || 'common');

    // Set initial flipped state based on option
    if (startFlipped) {
        container.classList.add('flipped');
    }

    // Clear existing content
    frontFace.innerHTML = '';
    backFace.innerHTML = '';

    // Helper to create tier badge
    function createTierBadge() {
        const badge = document.createElement('span');
        badge.className = 'tier-badge ' + (card.tier || 'common');
        badge.textContent = (card.tier || 'common').charAt(0).toUpperCase() + (card.tier || 'common').slice(1);
        return badge;
    }

    // Helper to create info button
    function createInfoBtn() {
        const btn = document.createElement('button');
        btn.className = 'card-info-btn';
        btn.textContent = 'i';
        btn.title = 'Flip card for details';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('flipped');
        });
        return btn;
    }

    // Helper to create element icon
    function createElementIcon(element, size = 'medium') {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'element-icon ' + element + (size === 'small' ? ' element-icon-sm' : '');
        iconSpan.title = element;
        const iconImg = document.createElement('img');
        iconImg.src = `assets/images/elements/${element}.png`;
        iconImg.alt = element;
        iconImg.loading = 'lazy';
        iconSpan.appendChild(iconImg);
        return iconSpan;
    }

    // === RENDER FRONT FACE ===
    frontFace.appendChild(createTierBadge());
    frontFace.appendChild(createInfoBtn());

    // Card image
    const imageDiv = document.createElement('div');
    imageDiv.className = 'card-image';
    const img = document.createElement('img');
    img.src = 'assets/images/generated/' + card.id + '_generated.png';
    img.alt = card.name;
    img.onerror = function() {
        this.style.display = 'none';
        const placeholder = document.createElement('span');
        placeholder.textContent = 'No Image';
        this.parentElement.appendChild(placeholder);
    };
    imageDiv.appendChild(img);
    frontFace.appendChild(imageDiv);

    // Card info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = card.name;
    infoDiv.appendChild(nameDiv);

    const elementsDiv = document.createElement('div');
    elementsDiv.className = 'card-elements';
    card.elements.forEach(el => {
        elementsDiv.appendChild(createElementIcon(el));
    });
    infoDiv.appendChild(elementsDiv);

    // NO biography on front - matches drafting card structure (bio is on back only)

    // Stats (matching drafting card layout: HP, ATK, DEF)
    const statsDiv = document.createElement('div');
    statsDiv.className = 'card-stats';
    const currentHP = gameState.cardHP?.[card.id] ?? card.hp;

    // Calculate average attack and defense (same as drafting.js)
    const attacks = card.attacks || [];
    const avgAtk = attacks.length > 0
        ? Math.round(attacks.reduce((sum, atk) => sum + (atk.base_damage || 0), 0) / attacks.length)
        : 0;
    const defenses = card.defenses || [];
    const avgDef = defenses.length > 0
        ? Math.round(defenses.reduce((sum, def) => sum + (def.base_protection || 0), 0) / defenses.length)
        : 0;

    // HP stat
    const hpSpan = document.createElement('span');
    hpSpan.className = 'stat stat-hp';
    hpSpan.textContent = 'HP: ' + formatHP(currentHP);
    statsDiv.appendChild(hpSpan);

    // ATK stat
    const atkSpan = document.createElement('span');
    atkSpan.className = 'stat stat-atk';
    atkSpan.textContent = 'ATK: ' + formatHP(avgAtk);
    statsDiv.appendChild(atkSpan);

    // DEF stat
    const defSpan = document.createElement('span');
    defSpan.className = 'stat stat-def';
    defSpan.textContent = 'DEF: ' + formatHP(avgDef);
    statsDiv.appendChild(defSpan);

    infoDiv.appendChild(statsDiv);

    frontFace.appendChild(infoDiv);

    // === RENDER BACK FACE ===
    backFace.appendChild(createTierBadge());
    backFace.appendChild(createInfoBtn());

    // Name
    const backName = document.createElement('div');
    backName.className = 'card-name';
    backName.textContent = card.name;
    backFace.appendChild(backName);

    // Biography (matches drafting card back structure: name, bio, elements, attacks, defenses, specials)
    if (card.biography) {
        const bioDiv = document.createElement('div');
        bioDiv.className = 'card-back-bio';
        bioDiv.textContent = card.biography;
        backFace.appendChild(bioDiv);
    }

    // Elements
    const backElements = document.createElement('div');
    backElements.className = 'card-elements';
    card.elements.forEach(el => {
        backElements.appendChild(createElementIcon(el));
    });
    backFace.appendChild(backElements);

    // Attacks section (sorted by damage descending)
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
            li.appendChild(createElementIcon(atk.element, 'small'));
            const textSpan = document.createElement('span');
            textSpan.textContent = `${atk.name} (${formatHP(atk.base_damage || 0)} dmg)`;
            li.appendChild(textSpan);
            attackList.appendChild(li);
        });
        attackSection.appendChild(attackList);
        backFace.appendChild(attackSection);
    }

    // Defenses section (sorted by protection descending)
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
            li.appendChild(createElementIcon(def.element, 'small'));
            const textSpan = document.createElement('span');
            textSpan.textContent = `${def.name} (${formatHP(def.base_protection || 0)} block)`;
            li.appendChild(textSpan);
            defenseList.appendChild(li);
        });
        defenseSection.appendChild(defenseList);
        backFace.appendChild(defenseSection);
    }

    // Special abilities
    if (card.special_abilities && card.special_abilities.length > 0) {
        const specialSection = document.createElement('div');
        specialSection.className = 'card-back-section';
        const specialTitle = document.createElement('h4');
        specialTitle.textContent = 'Special';
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
        backFace.appendChild(specialSection);
    }

    elements.cardModal.classList.remove('hidden');
    elements.cardModal.dataset.currentCardId = card.id;
}

/**
 * Close the card detail modal
 */
export function closeModal() {
    if (elements.cardModal) {
        // Get the current flipped state before closing
        const isFlipped = elements.modalCardContainer?.classList.contains('flipped') || false;
        const cardId = elements.cardModal._currentCardId;
        const onCloseCallback = elements.cardModal._onCloseCallback;

        elements.cardModal.classList.add('hidden');

        // Call the onClose callback if provided
        if (onCloseCallback && typeof onCloseCallback === 'function') {
            onCloseCallback(isFlipped, cardId);
        }

        // Clear stored callback and card id
        elements.cardModal._onCloseCallback = null;
        elements.cardModal._currentCardId = null;

        // Reset flip state when closing
        if (elements.modalCardContainer) {
            elements.modalCardContainer.classList.remove('flipped');
        }
    }
}

/**
 * Highlight a card (for selection) - clears all highlights then adds to selected card
 * @param {string} cardId - Card ID to highlight
 */
export function highlightCard(cardId) {
    // Remove existing highlights
    document.querySelectorAll('.game-card.selected, .battle-card.selected, .card-container.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Add highlight to selected card (support old game-card, battle-card, and new unified card-container)
    const gameCard = document.querySelector(`.game-card[data-card-id="${cardId}"]`);
    if (gameCard) {
        gameCard.classList.add('selected');
    }

    const battleCard = document.querySelector(`.battle-card[data-card-id="${cardId}"]`);
    if (battleCard) {
        battleCard.classList.add('selected');
    }

    const cardContainer = document.querySelector(`.card-container[data-card-id="${cardId}"]`);
    if (cardContainer) {
        cardContainer.classList.add('selected');
    }
}

/**
 * Highlight a card as the attacker (player's card)
 * @param {string} cardId - Card ID to highlight as attacker
 */
export function highlightAttackerCard(cardId) {
    // Add highlight to selected card (support old game-card, battle-card, and new unified card-container)
    const gameCard = document.querySelector(`.game-card[data-card-id="${cardId}"]`);
    if (gameCard) {
        gameCard.classList.add('selected', 'selected-attacker');
    }

    const battleCard = document.querySelector(`.battle-card[data-card-id="${cardId}"]`);
    if (battleCard) {
        battleCard.classList.add('selected', 'selected-attacker');
    }

    const cardContainer = document.querySelector(`.card-container[data-card-id="${cardId}"]`);
    if (cardContainer) {
        cardContainer.classList.add('selected', 'selected-attacker');
    }
}

/**
 * Clear attacker card highlight only
 */
export function clearAttackerHighlight() {
    document.querySelectorAll('.game-card.selected-attacker, .battle-card.selected-attacker, .card-container.selected-attacker').forEach(el => {
        el.classList.remove('selected', 'selected-attacker');
    });
}

/**
 * Highlight a card as the defender (opponent's card)
 * @param {string} cardId - Card ID to highlight as defender
 */
export function highlightDefenderCard(cardId) {
    // Add highlight to selected card (support old game-card, battle-card, and new unified card-container)
    const gameCard = document.querySelector(`.game-card[data-card-id="${cardId}"]`);
    if (gameCard) {
        gameCard.classList.add('selected', 'selected-defender');
    }

    const battleCard = document.querySelector(`.battle-card[data-card-id="${cardId}"]`);
    if (battleCard) {
        battleCard.classList.add('selected', 'selected-defender');
    }

    const cardContainer = document.querySelector(`.card-container[data-card-id="${cardId}"]`);
    if (cardContainer) {
        cardContainer.classList.add('selected', 'selected-defender');
    }
}

/**
 * Clear defender card highlight only
 */
export function clearDefenderHighlight() {
    document.querySelectorAll('.game-card.selected-defender, .battle-card.selected-defender, .card-container.selected-defender').forEach(el => {
        el.classList.remove('selected', 'selected-defender');
    });
}

/**
 * Clear all card highlights
 */
export function clearHighlights() {
    document.querySelectorAll('.game-card.selected, .battle-card.selected, .card-container.selected, .card-placeholder.selected').forEach(el => {
        el.classList.remove('selected', 'selected-attacker', 'selected-defender');
    });
}

/**
 * Update HP bar for a card
 * @param {string} cardId - Card ID
 * @param {number} currentHP - Current HP
 * @param {number} maxHP - Maximum HP
 */
export function updateCardHP(cardId, currentHP, maxHP) {
    // Use the unified HP update function from cardComponent
    updateCardHPDisplay(cardId, currentHP, maxHP);

    const percent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

    // Update old-style game-card HP (if any still exist)
    const gameCards = document.querySelectorAll(`.game-card[data-card-id="${cardId}"]`);
    gameCards.forEach(card => {
        const hpFill = card.querySelector('.card-hp-fill');
        const hpText = card.querySelector('.card-hp-text');

        if (hpFill) {
            hpFill.style.width = `${percent}%`;
        }
        if (hpText) {
            hpText.textContent = `${formatHP(currentHP)} / ${formatHP(maxHP)}`;
        }
    });
}

/**
 * Remove a card from the display (when defeated)
 * @param {string} cardId - Card ID to remove
 */
export function removeCard(cardId) {
    const cards = document.querySelectorAll(`[data-card-id="${cardId}"]`);
    cards.forEach(card => {
        card.classList.add('battle-damage-received');
        setTimeout(() => {
            card.remove();
        }, 500);
    });
}

/**
 * Show a temporary message overlay
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds
 */
export function showMessage(message, duration = 2000) {
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message;
    overlay.appendChild(content);

    // Add styles inline for the overlay
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 2rem 3rem;
        border-radius: 12px;
        border: 2px solid var(--text-accent);
        z-index: 3000;
        font-family: var(--font-heading);
        font-size: 1.5rem;
        color: var(--text-primary);
        text-align: center;
        animation: damage-pop 0.3s ease-out;
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
    }, duration);
}

/**
 * Get cached DOM elements
 * @returns {Object} Cached DOM element references
 */
export function getElements() {
    return elements;
}
