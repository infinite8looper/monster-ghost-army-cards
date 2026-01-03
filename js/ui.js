/**
 * Monster Ghost Army Cards - UI Updates and Rendering Module
 *
 * This module handles all DOM manipulation, UI updates,
 * and user interface rendering.
 */

import { renderCard, renderCardPlaceholder, createCardDetailView, formatHP } from './cards.js';

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
 * Render player's hand
 * @param {Array} cards - Array of card objects
 * @param {Object} gameState - Current game state for HP tracking
 * @param {Function} onCardClick - Callback when a card is clicked
 */
export function renderPlayerHand(cards, gameState = {}, onCardClick = null) {
    if (!elements.playerCards) return;

    if (cards.length === 0) {
        setContent(elements.playerCards, renderCardPlaceholder('No cards in hand', 'player-card'));
        return;
    }

    const html = cards.map(card => {
        const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
        return renderCard(card, {
            currentHP,
            additionalClasses: 'player-card'
        });
    }).join('');

    setContent(elements.playerCards, html);

    // Add click listeners
    if (onCardClick) {
        elements.playerCards.querySelectorAll('.game-card').forEach(cardEl => {
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
                onCardClick(cardId, 'player');
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
 * Set a card in the attacker slot
 * @param {Object} card - Card object (or null to clear)
 * @param {Object} gameState - Current game state
 */
export function setAttackerCard(card, gameState = {}) {
    const slot = elements.attackerSlot?.querySelector('.card-placeholder, .game-card');
    if (!slot) return;

    if (card) {
        const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
        const parent = slot.parentElement;
        const newCard = document.createElement('div');
        newCard.innerHTML = renderCard(card, {
            currentHP,
            isLarge: true,
            additionalClasses: 'arena-card'
        });
        parent.replaceChild(newCard.firstElementChild, slot);
    } else {
        // Clear the slot
        const parent = slot.parentElement;
        setContent(parent, `
            <span class="slot-label">Attacker</span>
            <div class="card-placeholder arena-card">
                <span class="placeholder-text">Select a card to attack</span>
            </div>
        `);
    }
}

/**
 * Set a card in the defender slot
 * @param {Object} card - Card object (or null to clear)
 * @param {Object} gameState - Current game state
 */
export function setDefenderCard(card, gameState = {}) {
    const slot = elements.defenderSlot?.querySelector('.card-placeholder, .game-card');
    if (!slot) return;

    if (card) {
        const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
        const parent = slot.parentElement;
        const newCard = document.createElement('div');
        newCard.innerHTML = renderCard(card, {
            currentHP,
            isLarge: true,
            additionalClasses: 'arena-card'
        });
        parent.replaceChild(newCard.firstElementChild, slot);
    } else {
        // Clear the slot
        const parent = slot.parentElement;
        setContent(parent, `
            <span class="slot-label">Defender</span>
            <div class="card-placeholder arena-card">
                <span class="placeholder-text">Select a target</span>
            </div>
        `);
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
 */
export function openCardModal(card, gameState = {}) {
    if (!elements.cardModal || !elements.modalCardContainer) return;

    const container = elements.modalCardContainer;
    const frontFace = elements.modalCardFront;
    const backFace = elements.modalCardBack;

    // Clear flipped state
    container.classList.remove('flipped');

    // Set tier class on container for styling
    container.className = 'modal-card-container tier-' + (card.tier || 'common');

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

    const statsDiv = document.createElement('div');
    statsDiv.className = 'card-stats';
    const currentHP = gameState.cardHP?.[card.id] ?? card.hp;
    statsDiv.innerHTML = `
        <span class="stat stat-hp">HP: ${formatHP(currentHP)} / ${formatHP(card.hp)}</span>
    `;
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

    // Biography
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
        elements.cardModal.classList.add('hidden');
        // Reset flip state when closing
        if (elements.modalCardContainer) {
            elements.modalCardContainer.classList.remove('flipped');
        }
    }
}

/**
 * Highlight a card (for selection)
 * @param {string} cardId - Card ID to highlight
 */
export function highlightCard(cardId) {
    // Remove existing highlights
    document.querySelectorAll('.game-card.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Add highlight to selected card
    const card = document.querySelector(`.game-card[data-card-id="${cardId}"]`);
    if (card) {
        card.classList.add('selected');
    }
}

/**
 * Clear all card highlights
 */
export function clearHighlights() {
    document.querySelectorAll('.game-card.selected, .card-placeholder.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

/**
 * Update HP bar for a card
 * @param {string} cardId - Card ID
 * @param {number} currentHP - Current HP
 * @param {number} maxHP - Maximum HP
 */
export function updateCardHP(cardId, currentHP, maxHP) {
    const cards = document.querySelectorAll(`.game-card[data-card-id="${cardId}"]`);

    cards.forEach(card => {
        const hpFill = card.querySelector('.card-hp-fill');
        const hpText = card.querySelector('.card-hp-text');

        if (hpFill) {
            const percent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
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
