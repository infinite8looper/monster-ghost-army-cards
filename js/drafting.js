/**
 * Monster Ghost Army Cards - Card Drafting Module
 *
 * This module handles the card drafting phase where players take turns
 * selecting cards to build their 10-card decks.
 */

import { getAllCards, ELEMENTS, formatHP, createElementIcon, getCardById } from './cards.js';
import { openCardModal } from './ui.js';
import { createCardElement, createMiniCardElement, getAvgAttack, getAvgDefense } from './cardComponent.js';

// Drafting state
const draftingState = {
    players: [],                // All players in the game
    currentRound: 1,            // Current drafting round (1-3)
    totalRounds: 3,             // Total selection rounds (fixed at 3)
    deckSize: 10,               // Total cards per player
    cardsThisRound: 0,          // Cards drafted by current player this round
    cardsPerRound: 4,           // Target cards per round (deckSize / 3)
    turnOrder: [],              // Fixed turn order (indices into players array, set once at game start)
    roundOrder: [],             // Player objects in turn order (derived from turnOrder for each round)
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

// Note: getAvgAttack and getAvgDefense are imported from cardComponent.js

/**
 * Initialize the drafting phase
 * @param {Array} players - Array of player objects with { id, name, isAI, cards: [] }
 * @param {number} deckSize - Number of cards each player will draft (default 10)
 * @param {Array} turnOrder - Fixed turn order (indices into players array), established once at game start
 */
export function startDraftingPhase(players, deckSize = 10, turnOrder = null) {
    console.log('Starting drafting phase with players:', players, 'Deck size:', deckSize, 'Turn order:', turnOrder);

    // Initialize drafting state
    draftingState.players = players.map(p => ({
        ...p,
        cards: []  // Reset cards for fresh draft
    }));
    draftingState.currentRound = 1;
    draftingState.totalRounds = 3;  // Fixed at 3 selection rounds (1 card per round)
    draftingState.deckSize = deckSize;
    draftingState.cardsPerRound = 1;  // 1 card per player per round
    draftingState.manualSelectCount = 3;  // Players manually select 3 cards
    draftingState.cardsThisRound = 0;
    draftingState.availableCards = [...getAllCards()];
    draftingState.takenCardIds = new Set();
    draftingState.selectedCardId = null;
    draftingState.currentFilter = 'all';
    draftingState.currentSort = 'name';
    draftingState.sortAscending = true;

    // Store the fixed turn order (established once at game start)
    // If no turn order provided, generate one (fallback)
    draftingState.turnOrder = turnOrder || [...Array(players.length).keys()];
    console.log('Using fixed turn order for all drafting rounds:', draftingState.turnOrder.map(i => draftingState.players[i].name));

    // AUTO-ASSIGN: Randomly distribute (deckSize - 3) cards to each player
    const autoAssignCount = Math.max(0, deckSize - draftingState.manualSelectCount);
    if (autoAssignCount > 0) {
        autoAssignCards(autoAssignCount);
    }

    // Initialize UI elements
    initDraftingUI();

    // Set up round order using the FIXED turn order (same for ALL rounds)
    setRoundOrderFromTurnOrder();

    // Show drafting screen
    showDraftingScreen();

    // Render initial state
    renderDraftingState();

    // Start first turn
    startCurrentTurn();
}

/**
 * Auto-assign random cards to each player
 * @param {number} countPerPlayer - Number of cards to assign to each player
 */
function autoAssignCards(countPerPlayer) {
    console.log(`Auto-assigning ${countPerPlayer} cards per player`);

    // Shuffle available cards
    const shuffled = [...draftingState.availableCards].sort(() => Math.random() - 0.5);

    // Distribute cards round-robin to ensure fairness
    let cardIndex = 0;
    for (let i = 0; i < countPerPlayer; i++) {
        for (const player of draftingState.players) {
            if (cardIndex < shuffled.length) {
                const card = shuffled[cardIndex];
                player.cards.push(card.id);
                draftingState.takenCardIds.add(card.id);
                cardIndex++;
            }
        }
    }

    // Update available cards (remove taken ones)
    draftingState.availableCards = draftingState.availableCards.filter(
        c => !draftingState.takenCardIds.has(c.id)
    );

    console.log(`Auto-assigned ${cardIndex} total cards. ${draftingState.availableCards.length} cards remaining.`);
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
 * Set up round order using the FIXED turn order (same for ALL rounds)
 * This uses the turn order established once at game start, ensuring
 * all drafting rounds and battle rounds use the same consistent order.
 */
function setRoundOrderFromTurnOrder() {
    // Map turn order indices to player objects
    draftingState.roundOrder = draftingState.turnOrder.map(i => draftingState.players[i]);
    draftingState.currentPlayerIndex = 0;
}

/**
 * Generate a random player order for the current round
 * @deprecated Use setRoundOrderFromTurnOrder() instead - turn order is now fixed at game start
 */
function generateRoundOrder() {
    // Legacy function - now just calls setRoundOrderFromTurnOrder for consistent ordering
    setRoundOrderFromTurnOrder();
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
 * Create a DOM element for a drafting card using the unified card component
 * @param {Object} card - Card data
 * @returns {HTMLElement} Card element
 */
function createDraftingCardElement(card) {
    const isUnavailable = draftingState.takenCardIds.has(card.id);
    const isSelected = draftingState.selectedCardId === card.id;

    // Build additional classes
    const additionalClasses = [
        'drafting-card',
        isUnavailable ? 'unavailable' : '',
        isSelected ? 'selected-for-draft' : ''
    ].filter(Boolean).join(' ');

    // Use the unified card component
    const cardContainer = createCardElement(card, {
        size: 'drafting',
        showHP: false,  // Drafting cards don't show HP bars
        draggable: !isUnavailable,
        dragType: 'drafting',
        additionalClasses: additionalClasses,
        onCardClick: !isUnavailable ? (cardId, cardData) => {
            selectCard(cardId);
        } : null,
        onInfoClick: (cardData, isFlipped) => {
            // Info button handles flip internally
        }
    });

    // Get the unified-card div for adding double-click handler
    const cardDiv = cardContainer.querySelector('.unified-card');
    if (cardDiv && !isUnavailable) {
        // Double-click to open modal with larger view
        cardDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            // Get current flipped state from the card
            const isCurrentlyFlipped = cardDiv.classList.contains('flipped');
            // Open modal with the same flip state, and sync back when closed
            openCardModal(card, {}, {
                startFlipped: isCurrentlyFlipped,
                onClose: (isFlipped, closedCardId) => {
                    // Sync the flip state back to the draft card
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

        // Custom drag handlers for drafting (override the default ones)
        cardContainer.draggable = true;
        let currentDragImage = null;

        cardContainer.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            cardContainer.classList.add('dragging');

            // Create a custom drag image showing the whole card
            const dragImage = cardContainer.cloneNode(true);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-9999px';
            dragImage.style.left = '-9999px';
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'scale(0.8)';
            dragImage.style.pointerEvents = 'none';
            dragImage.classList.remove('dragging');
            document.body.appendChild(dragImage);
            currentDragImage = dragImage;

            const rect = cardContainer.getBoundingClientRect();
            e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);
        });

        cardContainer.addEventListener('dragend', () => {
            cardContainer.classList.remove('dragging');
            if (currentDragImage && currentDragImage.parentNode) {
                currentDragImage.parentNode.removeChild(currentDragImage);
                currentDragImage = null;
            }
        });
    }

    return cardContainer;
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

    // Update count to show progress
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
            draftedCards.appendChild(createDraftingMiniCard(card));
        }
    });

    // Show empty slots for ALL remaining cards needed to complete the deck
    const remainingSlots = totalSlots - playerCards.length;
    for (let i = 0; i < remainingSlots; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'drafted-slot-empty';
        emptyDiv.textContent = 'Empty Slot';
        draftedCards.appendChild(emptyDiv);
    }
}

/**
 * Create a mini card element for the sidebar (local wrapper for drafting context)
 * Uses the shared createMiniCardElement from cardComponent.js
 * @param {Object} card - Card data
 * @returns {HTMLElement} Mini card element
 */
function createDraftingMiniCard(card) {
    // Use the shared mini card component with drafting-specific double-click handler
    return createMiniCardElement(card, {
        onDoubleClick: (cardData) => {
            openCardModal(cardData, {});
        }
    });
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

        // Start new round with SAME fixed turn order (no re-randomization)
        // This ensures fairness: same player order for all drafting rounds
        draftingState.currentPlayerIndex = 0;
        // roundOrder already set from turnOrder, no need to regenerate
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
