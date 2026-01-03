/**
 * Monster Ghost Army Cards - Card Drafting Module
 *
 * This module handles the card drafting phase where players take turns
 * selecting cards to build their 10-card decks.
 */

import { getAllCards, ELEMENTS, formatHP, createElementIcon, getCardById } from './cards.js';
import { openCardModal } from './ui.js';

// Drafting state
const draftingState = {
    players: [],                // All players in the game
    currentRound: 1,            // Current drafting round (1-3)
    totalRounds: 3,             // Total selection rounds (fixed at 3)
    deckSize: 10,               // Total cards per player
    cardsThisRound: 0,          // Cards drafted by current player this round
    cardsPerRound: 4,           // Target cards per round (deckSize / 3)
    roundOrder: [],             // Randomized player order for current round
    currentPlayerIndex: 0,      // Index in roundOrder for current turn
    availableCards: [],         // Cards still available for drafting
    takenCardIds: new Set(),    // Set of card IDs already drafted
    selectedCardId: null,       // Currently selected card for confirmation
    currentFilter: 'all',       // Current element filter
    currentSort: 'name',        // Current sort field
    sortAscending: true,        // Sort direction

    // UI elements
    elements: null
};

// Tier order for sorting (highest to lowest)
const TIER_ORDER = {
    'legendary': 1,
    'strong': 2,
    'common': 3,
    'weak': 4
};

/**
 * Calculate average attack damage from a card's attacks array
 * @param {Object} card - Card object with attacks array
 * @returns {number} Average base_damage or 0 if no attacks
 */
function getAvgAttack(card) {
    const attacks = card.attacks || [];
    if (attacks.length === 0) return 0;
    const total = attacks.reduce((sum, atk) => sum + (atk.base_damage || 0), 0);
    return Math.round(total / attacks.length);
}

/**
 * Calculate average defense protection from a card's defenses array
 * @param {Object} card - Card object with defenses array
 * @returns {number} Average base_protection or 0 if no defenses
 */
function getAvgDefense(card) {
    const defenses = card.defenses || [];
    if (defenses.length === 0) return 0;
    const total = defenses.reduce((sum, def) => sum + (def.base_protection || 0), 0);
    return Math.round(total / defenses.length);
}

/**
 * Initialize the drafting phase
 * @param {Array} players - Array of player objects with { id, name, isAI, cards: [] }
 * @param {number} deckSize - Number of cards each player will draft (default 10)
 */
export function startDraftingPhase(players, deckSize = 10) {
    console.log('Starting drafting phase with players:', players, 'Deck size:', deckSize);

    // Initialize drafting state
    draftingState.players = players.map(p => ({
        ...p,
        cards: []  // Reset cards for fresh draft
    }));
    draftingState.currentRound = 1;
    draftingState.totalRounds = 3;  // Fixed at 3 selection rounds
    draftingState.deckSize = deckSize;
    draftingState.cardsPerRound = Math.ceil(deckSize / 3);  // Divide cards across 3 rounds
    draftingState.cardsThisRound = 0;
    draftingState.availableCards = [...getAllCards()];
    draftingState.takenCardIds = new Set();
    draftingState.selectedCardId = null;
    draftingState.currentFilter = 'all';
    draftingState.currentSort = 'name';
    draftingState.sortAscending = true;

    // Initialize UI elements
    initDraftingUI();

    // Generate random order for first round
    generateRoundOrder();

    // Show drafting screen
    showDraftingScreen();

    // Render initial state
    renderDraftingState();

    // Start first turn
    startCurrentTurn();
}

/**
 * Initialize UI element references
 */
function initDraftingUI() {
    draftingState.elements = {
        screen: document.getElementById('drafting-screen'),
        roundDisplay: document.getElementById('drafting-round'),
        playerDisplay: document.getElementById('drafting-player'),
        gallery: document.getElementById('drafting-gallery'),
        draftedCards: document.getElementById('drafted-cards'),
        draftedCount: document.getElementById('drafted-count'),
        confirmBtn: document.getElementById('confirm-selection-btn'),
        sortDropdown: document.getElementById('sort-by'),
        sortOrderBtn: document.getElementById('sort-order-btn'),
        filterButtons: document.querySelectorAll('.element-filter-btn')
    };

    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners for controls
 */
function setupEventListeners() {
    const { sortDropdown, sortOrderBtn, filterButtons, confirmBtn } = draftingState.elements;

    // Sort dropdown
    if (sortDropdown) {
        sortDropdown.addEventListener('change', (e) => {
            draftingState.currentSort = e.target.value;
            renderCardGallery();
        });
    }

    // Sort order button
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', () => {
            draftingState.sortAscending = !draftingState.sortAscending;
            sortOrderBtn.classList.toggle('desc', !draftingState.sortAscending);
            renderCardGallery();
        });
    }

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            draftingState.currentFilter = btn.dataset.element;
            renderCardGallery();
        });
    });

    // Confirm button
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmSelection);
    }

    // Set up drop zone on sidebar for drag-and-drop card selection
    const { draftedCards } = draftingState.elements;
    if (draftedCards) {
        draftedCards.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            draftedCards.classList.add('drag-over');
        });
        draftedCards.addEventListener('dragleave', () => {
            draftedCards.classList.remove('drag-over');
        });
        draftedCards.addEventListener('drop', (e) => {
            e.preventDefault();
            draftedCards.classList.remove('drag-over');
            const cardId = e.dataTransfer.getData('text/plain');
            if (cardId && !draftingState.takenCardIds.has(cardId)) {
                // Select and immediately draft the card
                draftingState.selectedCardId = cardId;
                draftCard(cardId, getCurrentPlayer());
            }
        });
    }
}

/**
 * Show the drafting screen
 */
function showDraftingScreen() {
    const { screen } = draftingState.elements;
    if (screen) {
        screen.classList.remove('hidden');
    }
}

/**
 * Hide the drafting screen
 */
function hideDraftingScreen() {
    const { screen } = draftingState.elements;
    if (screen) {
        screen.classList.add('hidden');
    }
}

/**
 * Generate a random player order for the current round
 */
function generateRoundOrder() {
    draftingState.roundOrder = shuffleArray([...draftingState.players]);
    draftingState.currentPlayerIndex = 0;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get the current player for this turn
 * @returns {Object} Current player object
 */
function getCurrentPlayer() {
    return draftingState.roundOrder[draftingState.currentPlayerIndex];
}

/**
 * Render the current drafting state
 */
function renderDraftingState() {
    updateHeader();
    renderCardGallery();
    renderDraftedCards();
    updateConfirmButton();
}

/**
 * Update the header display
 */
function updateHeader() {
    const { roundDisplay, playerDisplay } = draftingState.elements;
    const currentPlayer = getCurrentPlayer();

    if (roundDisplay) {
        roundDisplay.textContent = 'Round: ' + draftingState.currentRound + ' / ' + draftingState.totalRounds;
    }

    if (playerDisplay && currentPlayer) {
        playerDisplay.textContent = 'Current Player: ' + currentPlayer.name;

        // Update styling for AI vs human
        if (currentPlayer.isAI) {
            playerDisplay.classList.remove('current-player');
            playerDisplay.style.background = 'linear-gradient(135deg, #708090, #555)';
        } else {
            playerDisplay.classList.add('current-player');
            playerDisplay.style.background = '';
        }
    }
}

/**
 * Render the card gallery with current filters and sorting
 */
function renderCardGallery() {
    const { gallery } = draftingState.elements;
    if (!gallery) return;

    // Get and process cards
    let cards = getFilteredCards();
    cards = getSortedCards(cards);

    // Build HTML using DOM methods for security
    gallery.textContent = '';

    cards.forEach(card => {
        const cardElement = createDraftingCardElement(card);
        gallery.appendChild(cardElement);
    });
}

/**
 * Get cards filtered by current element filter
 * @returns {Array} Filtered cards
 */
function getFilteredCards() {
    const { currentFilter, availableCards } = draftingState;

    if (currentFilter === 'all') {
        return availableCards;
    }

    return availableCards.filter(card =>
        card.elements.includes(currentFilter)
    );
}

/**
 * Get cards sorted by current sort option
 * @param {Array} cards - Cards to sort
 * @returns {Array} Sorted cards
 */
function getSortedCards(cards) {
    const { currentSort, sortAscending } = draftingState;
    const sorted = [...cards];

    sorted.sort((a, b) => {
        let comparison = 0;

        switch (currentSort) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'hp':
                comparison = (a.hp || 0) - (b.hp || 0);
                break;
            case 'attack':
                comparison = getAvgAttack(a) - getAvgAttack(b);
                break;
            case 'defense':
                comparison = getAvgDefense(a) - getAvgDefense(b);
                break;
            case 'element':
                comparison = (a.elements[0] || '').localeCompare(b.elements[0] || '');
                break;
            case 'tier':
                comparison = (TIER_ORDER[a.tier] || 99) - (TIER_ORDER[b.tier] || 99);
                break;
            default:
                comparison = 0;
        }

        return sortAscending ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Create a DOM element for a drafting card with flip animation
 * @param {Object} card - Card data
 * @returns {HTMLElement} Card element
 */
function createDraftingCardElement(card) {
    const isUnavailable = draftingState.takenCardIds.has(card.id);
    const isSelected = draftingState.selectedCardId === card.id;
    const tierClass = 'tier-' + (card.tier || 'common');

    // Create main card div
    const cardDiv = document.createElement('div');
    cardDiv.className = 'drafting-card ' + tierClass;
    if (isUnavailable) cardDiv.classList.add('unavailable');
    if (isSelected) cardDiv.classList.add('selected-for-draft');
    cardDiv.dataset.cardId = card.id;

    // Tier badge (outside flipper - always visible)
    const tierBadge = document.createElement('span');
    tierBadge.className = 'tier-badge ' + (card.tier || 'common');
    tierBadge.textContent = capitalizeFirst(card.tier || 'common');
    cardDiv.appendChild(tierBadge);

    // Info button (outside flipper - always visible)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'card-info-btn';
    infoBtn.textContent = 'i';
    infoBtn.title = 'Flip card for details';
    infoBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card selection
        cardDiv.classList.toggle('flipped');
    });
    cardDiv.appendChild(infoBtn);

    // Create flipper container
    const flipper = document.createElement('div');
    flipper.className = 'card-flipper';

    // === FRONT FACE ===
    const frontFace = document.createElement('div');
    frontFace.className = 'card-front';

    // Card image container
    const imageDiv = document.createElement('div');
    imageDiv.className = 'card-image';

    const img = document.createElement('img');
    img.src = 'assets/images/generated/' + card.id + '_generated.png';
    img.alt = card.name;
    img.onerror = function() {
        this.style.display = 'none';
        const placeholder = document.createElement('span');
        placeholder.style.fontSize = '0.6rem';
        placeholder.style.color = 'var(--text-secondary)';
        placeholder.textContent = 'No Image';
        this.parentElement.appendChild(placeholder);
    };
    imageDiv.appendChild(img);
    frontFace.appendChild(imageDiv);

    // Card info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';

    // Card name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = card.name;
    infoDiv.appendChild(nameDiv);

    // Element icons
    const elementsDiv = document.createElement('div');
    elementsDiv.className = 'card-elements';
    card.elements.forEach(el => {
        const elementConfig = ELEMENTS[el];
        if (elementConfig) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'element-icon ' + el;
            iconSpan.title = el;
            const iconImg = document.createElement('img');
            iconImg.src = `assets/images/elements/${el}.png`;
            iconImg.alt = el;
            iconImg.loading = 'lazy';
            iconSpan.appendChild(iconImg);
            elementsDiv.appendChild(iconSpan);
        }
    });
    infoDiv.appendChild(elementsDiv);

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
    frontFace.appendChild(infoDiv);
    flipper.appendChild(frontFace);

    // === BACK FACE ===
    const backFace = document.createElement('div');
    backFace.className = 'card-back';

    // Back header with name and elements
    const backHeader = document.createElement('div');
    backHeader.className = 'card-back-header';

    const backName = document.createElement('div');
    backName.className = 'card-name';
    backName.textContent = card.name;
    backHeader.appendChild(backName);

    const backElements = document.createElement('div');
    backElements.className = 'card-elements';
    card.elements.forEach(el => {
        const elementConfig = ELEMENTS[el];
        if (elementConfig) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'element-icon ' + el;
            iconSpan.title = el;
            const iconImg = document.createElement('img');
            iconImg.src = `assets/images/elements/${el}.png`;
            iconImg.alt = el;
            iconImg.loading = 'lazy';
            iconSpan.appendChild(iconImg);
            backElements.appendChild(iconSpan);
        }
    });
    backHeader.appendChild(backElements);
    backFace.appendChild(backHeader);

    // Attacks section
    if (card.attacks && card.attacks.length > 0) {
        const attackSection = document.createElement('div');
        attackSection.className = 'card-back-section';
        const attackTitle = document.createElement('h4');
        attackTitle.textContent = 'Attacks';
        attackSection.appendChild(attackTitle);
        const attackList = document.createElement('ul');
        card.attacks.forEach(atk => {
            const li = document.createElement('li');
            const damage = atk.base_damage || atk.damage || 0;
            li.textContent = atk.name + ' (' + formatHP(damage) + ' dmg)';
            attackList.appendChild(li);
        });
        attackSection.appendChild(attackList);
        backFace.appendChild(attackSection);
    }

    // Defenses section
    if (card.defenses && card.defenses.length > 0) {
        const defenseSection = document.createElement('div');
        defenseSection.className = 'card-back-section';
        const defenseTitle = document.createElement('h4');
        defenseTitle.textContent = 'Defenses';
        defenseSection.appendChild(defenseTitle);
        const defenseList = document.createElement('ul');
        card.defenses.forEach(def => {
            const li = document.createElement('li');
            const protection = def.base_protection || def.protection || 0;
            li.textContent = def.name + ' (-' + formatHP(protection) + ')';
            defenseList.appendChild(li);
        });
        defenseSection.appendChild(defenseList);
        backFace.appendChild(defenseSection);
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
            li.textContent = ability.name + (ability.uses ? ' (' + ability.uses + 'x)' : '');
            specialList.appendChild(li);
        });
        specialSection.appendChild(specialList);
        backFace.appendChild(specialSection);
    }

    // Biography
    if (card.biography) {
        const bioDiv = document.createElement('div');
        bioDiv.className = 'card-back-bio';
        bioDiv.textContent = card.biography;
        backFace.appendChild(bioDiv);
    }

    flipper.appendChild(backFace);
    cardDiv.appendChild(flipper);

    // Add click and drag handlers if not unavailable
    if (!isUnavailable) {
        // Single click to select
        cardDiv.addEventListener('click', (e) => {
            // Only select card if clicking front face (not when flipped)
            if (!cardDiv.classList.contains('flipped')) {
                selectCard(card.id);
            }
        });

        // Double-click to open modal with larger view
        cardDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openCardModal(card, {});
        });

        // Make card draggable
        cardDiv.draggable = true;
        cardDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            cardDiv.classList.add('dragging');
        });
        cardDiv.addEventListener('dragend', () => {
            cardDiv.classList.remove('dragging');
        });
    }

    return cardDiv;
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render the drafted cards sidebar for current player
 */
function renderDraftedCards() {
    const { draftedCards, draftedCount } = draftingState.elements;
    const currentPlayer = getCurrentPlayer();

    if (!draftedCards || !currentPlayer) return;

    const playerCards = currentPlayer.cards;
    const totalSlots = draftingState.deckSize;

    // Show round progress: "X / Y this round (Z / total)"
    const roundTarget = Math.min(
        draftingState.cardsPerRound,
        totalSlots - (playerCards.length - draftingState.cardsThisRound)
    );

    // Update count to show round progress and total
    if (draftedCount) {
        draftedCount.textContent = playerCards.length + ' / ' + totalSlots;
    }

    // Clear and rebuild drafted cards using DOM methods
    draftedCards.textContent = '';

    // Render actual drafted cards
    playerCards.forEach(cardId => {
        const card = draftingState.availableCards.find(c => c.id === cardId)
            || getAllCards().find(c => c.id === cardId);
        if (card) {
            draftedCards.appendChild(createMiniCardElement(card));
        }
    });

    // Only show empty slots for remaining cards needed THIS ROUND (cleaner UI)
    const cardsNeededThisRound = roundTarget - draftingState.cardsThisRound;
    for (let i = 0; i < cardsNeededThisRound; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'drafted-slot-empty';
        emptyDiv.textContent = 'Empty Slot';
        draftedCards.appendChild(emptyDiv);
    }
}

/**
 * Create a mini card element for the sidebar
 * @param {Object} card - Card data
 * @returns {HTMLElement} Mini card element
 */
function createMiniCardElement(card) {
    const tierClass = 'tier-' + (card.tier || 'common');
    const miniCard = document.createElement('div');
    miniCard.className = 'drafted-mini-card ' + tierClass;

    // Mini image
    const imageDiv = document.createElement('div');
    imageDiv.className = 'mini-image';

    const img = document.createElement('img');
    img.src = 'assets/images/generated/' + card.id + '_generated.png';
    img.alt = card.name;
    img.onerror = function() { this.style.display = 'none'; };
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
        const elementConfig = ELEMENTS[el];
        if (elementConfig) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'element-icon element-icon-sm ' + el;
            iconSpan.title = el;
            const iconImg = document.createElement('img');
            iconImg.src = `assets/images/elements/${el}.png`;
            iconImg.alt = el;
            iconImg.loading = 'lazy';
            iconSpan.appendChild(iconImg);
            elementsDiv.appendChild(iconSpan);
        }
    });
    infoDiv.appendChild(elementsDiv);
    miniCard.appendChild(infoDiv);

    return miniCard;
}

/**
 * Select a card for drafting
 * @param {string} cardId - ID of the card to select
 */
function selectCard(cardId) {
    const currentPlayer = getCurrentPlayer();

    // Only allow human players to select cards manually
    if (currentPlayer.isAI) return;

    // Toggle selection
    if (draftingState.selectedCardId === cardId) {
        draftingState.selectedCardId = null;
    } else {
        draftingState.selectedCardId = cardId;
    }

    // Update UI
    updateCardSelection();
    updateConfirmButton();
}

/**
 * Update card selection visual state
 */
function updateCardSelection() {
    const { gallery } = draftingState.elements;
    if (!gallery) return;

    // Remove selection from all cards
    gallery.querySelectorAll('.drafting-card').forEach(card => {
        card.classList.remove('selected-for-draft');
    });

    // Add selection to selected card
    if (draftingState.selectedCardId) {
        const selectedCard = gallery.querySelector('[data-card-id="' + draftingState.selectedCardId + '"]');
        if (selectedCard) {
            selectedCard.classList.add('selected-for-draft');
        }
    }
}

/**
 * Update confirm button state
 */
function updateConfirmButton() {
    const { confirmBtn } = draftingState.elements;
    const currentPlayer = getCurrentPlayer();

    if (!confirmBtn) return;

    // Enable only if a card is selected and it's a human player's turn
    const isEnabled = draftingState.selectedCardId !== null && !currentPlayer?.isAI;
    confirmBtn.disabled = !isEnabled;
}

/**
 * Confirm the current card selection
 */
function confirmSelection() {
    const currentPlayer = getCurrentPlayer();
    const cardId = draftingState.selectedCardId;

    if (!cardId || !currentPlayer || currentPlayer.isAI) return;

    // Draft the card
    draftCard(cardId, currentPlayer);
}

/**
 * Draft a card for a player
 * @param {string} cardId - ID of the card to draft
 * @param {Object} player - Player drafting the card
 */
function draftCard(cardId, player) {
    // Add card to player's deck
    player.cards.push(cardId);

    // Mark card as taken
    draftingState.takenCardIds.add(cardId);

    // Remove from available cards
    draftingState.availableCards = draftingState.availableCards.filter(c => c.id !== cardId);

    // Track cards drafted this round
    draftingState.cardsThisRound++;

    // Clear selection
    draftingState.selectedCardId = null;

    console.log(player.name + ' drafted card: ' + cardId + ' (' + draftingState.cardsThisRound + '/' + draftingState.cardsPerRound + ' this round)');

    // Check if player has drafted enough cards for this round or has full deck
    const targetCards = Math.min(draftingState.cardsPerRound, draftingState.deckSize - (player.cards.length - draftingState.cardsThisRound));
    if (draftingState.cardsThisRound >= targetCards || player.cards.length >= draftingState.deckSize) {
        // Move to next player
        advanceTurn();
    } else {
        // Same player continues drafting
        renderDraftingState();
        startCurrentTurn();
    }
}

/**
 * Advance to the next turn (next player or next round)
 */
function advanceTurn() {
    // Reset cards drafted this round counter
    draftingState.cardsThisRound = 0;
    draftingState.currentPlayerIndex++;

    // Check if all players have drafted this round
    if (draftingState.currentPlayerIndex >= draftingState.roundOrder.length) {
        // Round complete, move to next round
        draftingState.currentRound++;

        // Check if drafting is complete (all players have full decks)
        const allPlayersComplete = draftingState.players.every(p => p.cards.length >= draftingState.deckSize);
        if (allPlayersComplete || draftingState.currentRound > draftingState.totalRounds) {
            completeDrafting();
            return;
        }

        // Start new round with new random order
        draftingState.currentPlayerIndex = 0;
        generateRoundOrder();
    }

    // Update UI and start next turn
    renderDraftingState();
    startCurrentTurn();
}

/**
 * Start the current player's turn
 */
function startCurrentTurn() {
    const currentPlayer = getCurrentPlayer();

    if (!currentPlayer) {
        console.error('No current player found');
        return;
    }

    console.log('Starting turn for ' + currentPlayer.name + ' (AI: ' + currentPlayer.isAI + ')');

    if (currentPlayer.isAI) {
        // AI player: auto-select after delay
        handleAITurn();
    } else {
        // Human player: wait for selection
        updateConfirmButton();
    }
}

/**
 * Handle AI player's turn
 */
function handleAITurn() {
    const { confirmBtn, gallery } = draftingState.elements;

    // Show AI thinking indicator
    if (confirmBtn) {
        confirmBtn.textContent = '';

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'ai-thinking';

        const textSpan = document.createElement('span');
        textSpan.textContent = 'AI Thinking';
        thinkingDiv.appendChild(textSpan);

        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'ai-thinking-dots';
        for (let i = 0; i < 3; i++) {
            dotsDiv.appendChild(document.createElement('span'));
        }
        thinkingDiv.appendChild(dotsDiv);

        confirmBtn.appendChild(thinkingDiv);
        confirmBtn.disabled = true;
    }

    // Add a slight delay for UX
    const thinkingTime = 800 + Math.random() * 700; // 800-1500ms

    setTimeout(() => {
        const selectedCard = selectAICard();
        if (selectedCard) {
            // Briefly highlight the selected card
            if (gallery) {
                const cardEl = gallery.querySelector('[data-card-id="' + selectedCard.id + '"]');
                if (cardEl) {
                    cardEl.classList.add('selected-for-draft');
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            // Draft after a short delay to show the selection
            setTimeout(() => {
                draftCard(selectedCard.id, getCurrentPlayer());

                // Reset confirm button
                if (confirmBtn) {
                    confirmBtn.textContent = 'Confirm Selection';
                }
            }, 400);
        }
    }, thinkingTime);
}

/**
 * Select a card for the AI player
 * Uses a simple strategy: prefer higher tier cards, then higher stats
 * @returns {Object|null} Selected card or null
 */
function selectAICard() {
    const availableCards = draftingState.availableCards.filter(
        card => !draftingState.takenCardIds.has(card.id)
    );

    if (availableCards.length === 0) {
        console.warn('No cards available for AI to select');
        return null;
    }

    // Score each card
    const scoredCards = availableCards.map(card => {
        let score = 0;

        // Tier bonus
        switch (card.tier) {
            case 'legendary': score += 100; break;
            case 'strong': score += 60; break;
            case 'common': score += 30; break;
            case 'weak': score += 10; break;
        }

        // Stat bonuses (scaled for 1M HP / 600K ATK / 60K DEF average)
        score += (card.hp || 0) / 10000;
        score += getAvgAttack(card) / 5000;
        score += getAvgDefense(card) / 1000;

        // Small random factor for variety
        score += Math.random() * 20;

        return { card, score };
    });

    // Sort by score (highest first)
    scoredCards.sort((a, b) => b.score - a.score);

    // Select top card (or random from top 3 for variety)
    const topCards = scoredCards.slice(0, Math.min(3, scoredCards.length));
    const selectedIndex = Math.floor(Math.random() * topCards.length);

    return topCards[selectedIndex].card;
}

/**
 * Complete the drafting phase
 */
function completeDrafting() {
    console.log('Drafting complete!');
    console.log('Final player decks:', draftingState.players.map(p => ({
        name: p.name,
        cards: p.cards
    })));

    // Hide drafting screen
    hideDraftingScreen();

    // Dispatch completion event with player data
    const event = new CustomEvent('draftingComplete', {
        detail: {
            players: draftingState.players.map(p => ({
                id: p.id,
                name: p.name,
                isAI: p.isAI,
                cards: [...p.cards]  // Copy the cards array
            }))
        }
    });

    document.dispatchEvent(event);
}

/**
 * Get the current drafting state (for debugging)
 * @returns {Object} Current state
 */
export function getDraftingState() {
    return { ...draftingState };
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.draftingState = draftingState;
    window.startDraftingPhase = startDraftingPhase;
}
