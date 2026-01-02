/**
 * Monster Ghost Army Cards - Main Game State and Logic Module
 *
 * This is the main entry point for the game. It manages game state,
 * coordinates between modules, and handles the game lifecycle.
 */

import { loadCards, getAllCards, getCardById, ELEMENTS, TIERS } from './cards.js';
import { calculateDamage, getValidAttacks, getValidDefenses } from './battle.js';
import {
    initUI,
    updateLoadingStatus,
    hideLoadingScreen,
    renderPlayerHand,
    renderOpponentCards,
    setAttackerCard,
    setDefenderCard,
    showAttackOptions,
    showDefenseOptions,
    hideActionPanel,
    showDamageAnimation,
    updateRoundCounter,
    updateTurnIndicator,
    addLogEntry,
    setControlStates,
    openCardModal,
    highlightCard,
    clearHighlights,
    updateCardHP,
    removeCard,
    showMessage,
    getElements
} from './ui.js';

// Game state object
const gameState = {
    // Game phase: 'loading', 'setup', 'drafting', 'playing', 'battle', 'ended'
    phase: 'loading',

    // Players
    players: [],
    currentPlayerIndex: 0,

    // Turn tracking
    round: 1,
    turnOrder: [],

    // Card tracking
    deck: [],           // Available cards in deck
    cardHP: {},         // Current HP for each card by ID

    // Battle state
    selectedAttacker: null,
    selectedDefender: null,
    selectedAttack: null,
    selectedDefense: null,

    // Special ability tracking
    abilityUses: {},        // { cardId_abilityName: usesCount }
    slimeSpikeTargets: [],  // Attacks weakened by slime spike

    // Settings
    playerCount: 2,
    cardsPerPlayer: 10
};

// UI element references
let uiElements = null;

/**
 * Initialize the game
 */
async function initGame() {
    console.log('Initializing Monster Ghost Army Cards...');

    try {
        // Initialize UI
        uiElements = initUI();

        // Set up control button listeners
        setupControlListeners();

        // Load card data
        updateLoadingStatus('Loading card data...');
        const cards = await loadCards();

        updateLoadingStatus('Preparing game...');

        // Initialize deck with all cards
        gameState.deck = [...cards];

        // Initialize HP tracking for all cards
        cards.forEach(card => {
            gameState.cardHP[card.id] = card.hp;
        });

        // Hide loading screen
        hideLoadingScreen();

        // Log successful load
        addLogEntry(`Loaded ${cards.length} cards successfully!`, 'system');
        addLogEntry('Welcome to Monster Ghost Army Cards!', 'system');

        // Move to setup phase
        gameState.phase = 'setup';

        // For now, set up a demo with placeholder cards
        setupDemoGame();

    } catch (error) {
        console.error('Failed to initialize game:', error);
        updateLoadingStatus(`Error: ${error.message}`);
    }
}

/**
 * Set up control button event listeners
 */
function setupControlListeners() {
    const { btnDraw, btnAttack, btnDefend, btnEndTurn, btnSpecial } = uiElements;

    if (btnDraw) {
        btnDraw.addEventListener('click', handleDrawCard);
    }
    if (btnAttack) {
        btnAttack.addEventListener('click', handleAttackButton);
    }
    if (btnDefend) {
        btnDefend.addEventListener('click', handleDefendButton);
    }
    if (btnEndTurn) {
        btnEndTurn.addEventListener('click', handleEndTurn);
    }
    if (btnSpecial) {
        btnSpecial.addEventListener('click', handleSpecialAbility);
    }
}

/**
 * Set up a demo game for testing the UI
 */
function setupDemoGame() {
    const allCards = getAllCards();

    if (allCards.length === 0) {
        addLogEntry('No cards available for demo', 'system');
        return;
    }

    // Use the 10 test cards that have generated images
    const testCardIds = [
        'spike_wall', 'dirty_diaper', 'fierce_cow', 'ice_cream_flinger', 'box',
        'shofario', 'the_scribbler', 'wonka_wacka_doodle_monster', 'robo_jolt', 'doublespike'
    ];

    // Filter to only cards that exist
    const testCards = testCardIds.filter(id => getCardById(id) !== null);

    // Create demo players using test cards (or fall back to first 10)
    const playerCards = testCards.length >= 5 ? testCards.slice(0, 5) : allCards.slice(0, 5).map(c => c.id);
    const opponentCards = testCards.length >= 10 ? testCards.slice(5, 10) : allCards.slice(5, 10).map(c => c.id);

    // Create demo players
    gameState.players = [
        {
            id: 'player1',
            name: 'Player 1',
            cards: playerCards
        },
        {
            id: 'player2',
            name: 'Player 2',
            cards: opponentCards
        }
    ];

    gameState.currentPlayerIndex = 0;
    gameState.phase = 'playing';

    // Render initial state
    renderGameState();

    addLogEntry('Demo game started!', 'system');
    addLogEntry('Click: select card | Double-click: view details', 'system');
}

/**
 * Render the current game state
 */
function renderGameState() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const opponent = gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length];

    // Get card objects for current player
    const playerCards = currentPlayer.cards
        .map(id => getCardById(id))
        .filter(card => card !== null);

    // Get card objects for opponent
    const opponentCards = opponent.cards
        .map(id => getCardById(id))
        .filter(card => card !== null);

    // Render player hand
    renderPlayerHand(playerCards, gameState, handleCardClick);

    // Render opponent cards (face-up for demo)
    renderOpponentCards(opponentCards, {
        faceDown: false,
        gameState,
        onCardClick: handleCardClick
    });

    // Update game info
    updateRoundCounter(gameState.round);
    updateTurnIndicator(currentPlayer.name);

    // Update control states
    updateControlStates();
}

/**
 * Update control button states based on game state
 */
function updateControlStates() {
    const hasAttacker = gameState.selectedAttacker !== null;
    const hasDefender = gameState.selectedDefender !== null;
    const hasAttack = gameState.selectedAttack !== null;

    setControlStates({
        draw: false, // Disabled for now
        attack: hasAttacker && hasDefender && hasAttack,
        defend: false, // Enabled when being attacked
        endTurn: true,
        special: false // Enabled when special ability available
    });
}

/**
 * Handle card click
 * @param {string} cardId - ID of clicked card
 * @param {string} source - 'player' or 'opponent'
 */
function handleCardClick(cardId, source) {
    const card = getCardById(cardId);
    if (!card) return;

    console.log(`Card clicked: ${card.name} (${source})`);

    if (gameState.phase !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (source === 'player' && currentPlayer.cards.includes(cardId)) {
        // Selecting attacker from own cards
        gameState.selectedAttacker = cardId;
        setAttackerCard(card, gameState);
        highlightCard(cardId);

        addLogEntry(`Selected ${card.name} as attacker`, 'system');

        // Show attack options
        const attacks = getValidAttacks(card, gameState, gameState.players.length);
        if (attacks.length > 0) {
            showAttackOptions(attacks, handleAttackSelect);
        }

    } else if (source === 'opponent') {
        // Selecting defender from opponent's cards
        gameState.selectedDefender = cardId;
        setDefenderCard(card, gameState);
        highlightCard(cardId);

        addLogEntry(`Targeting ${card.name}`, 'system');
    }

    updateControlStates();
}

/**
 * Handle card double-click to open detail modal
 * @param {string} cardId - ID of clicked card
 */
function handleCardDoubleClick(cardId) {
    const card = getCardById(cardId);
    if (!card) return;

    openCardModal(card, gameState);
}

/**
 * Handle attack selection
 * @param {string} attackName - Name of selected attack
 */
function handleAttackSelect(attackName) {
    const attacker = getCardById(gameState.selectedAttacker);
    if (!attacker) return;

    const attack = attacker.attacks.find(a => a.name === attackName);
    if (!attack) return;

    gameState.selectedAttack = attack;

    addLogEntry(`Selected attack: ${attack.name} (${attack.element})`, 'attack');

    hideActionPanel();
    updateControlStates();
}

/**
 * Handle draw card button
 */
function handleDrawCard() {
    addLogEntry('Draw card functionality coming soon!', 'system');
}

/**
 * Handle attack button
 */
function handleAttackButton() {
    if (!gameState.selectedAttacker || !gameState.selectedDefender || !gameState.selectedAttack) {
        addLogEntry('Select an attacker, target, and attack first!', 'system');
        return;
    }

    const attacker = getCardById(gameState.selectedAttacker);
    const defender = getCardById(gameState.selectedDefender);
    const attack = gameState.selectedAttack;

    if (!attacker || !defender) return;

    // Calculate damage
    const result = calculateDamage(attack, attacker, defender, null, gameState);

    // Apply damage
    gameState.cardHP[defender.id] = Math.max(0,
        (gameState.cardHP[defender.id] ?? defender.hp) - result.finalDamage
    );

    // Log the attack
    addLogEntry(`${attacker.name} uses ${attack.name} on ${defender.name}!`, 'attack');
    addLogEntry(`Dealt ${result.finalDamage.toLocaleString()} damage!`, 'damage');

    if (result.isCritical) {
        addLogEntry('CRITICAL HIT! Complementary element bonus!', 'special');
    } else if (result.isResisted) {
        addLogEntry('Resisted! Opposite element reduced damage.', 'defense');
    }

    // Show damage animation
    showDamageAnimation(result.finalDamage, result.isCritical, result.isResisted);

    // Update HP display
    updateCardHP(defender.id, gameState.cardHP[defender.id], defender.hp);

    // Check if defender is defeated
    if (gameState.cardHP[defender.id] <= 0) {
        addLogEntry(`${defender.name} has been defeated!`, 'damage');
        removeCard(defender.id);

        // Remove from opponent's cards
        const opponent = gameState.players.find(p => p.cards.includes(defender.id));
        if (opponent) {
            opponent.cards = opponent.cards.filter(id => id !== defender.id);
        }

        // Check for game over
        checkGameOver();
    }

    // Clear selections
    clearBattleSelections();

    // Re-render
    setTimeout(() => {
        renderGameState();
    }, 500);
}

/**
 * Handle defend button
 */
function handleDefendButton() {
    addLogEntry('Defense selection coming soon!', 'system');
}

/**
 * Handle end turn button
 */
function handleEndTurn() {
    // Clear selections
    clearBattleSelections();

    // Switch to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Increment round if we've gone through all players
    if (gameState.currentPlayerIndex === 0) {
        gameState.round++;
        addLogEntry(`--- Round ${gameState.round} ---`, 'system');
    }

    const nextPlayer = gameState.players[gameState.currentPlayerIndex];
    addLogEntry(`${nextPlayer.name}'s turn`, 'system');

    // Re-render
    renderGameState();
}

/**
 * Handle special ability button
 */
function handleSpecialAbility() {
    addLogEntry('Special abilities coming soon!', 'system');
}

/**
 * Clear battle selections
 */
function clearBattleSelections() {
    gameState.selectedAttacker = null;
    gameState.selectedDefender = null;
    gameState.selectedAttack = null;
    gameState.selectedDefense = null;

    setAttackerCard(null);
    setDefenderCard(null);
    clearHighlights();
    hideActionPanel();
}

/**
 * Check if the game is over
 */
function checkGameOver() {
    const activePlayers = gameState.players.filter(p => p.cards.length > 0);

    if (activePlayers.length <= 1) {
        gameState.phase = 'ended';

        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            addLogEntry(`${winner.name} WINS!`, 'special');
            showMessage(`${winner.name} is victorious!`, 5000);
        } else {
            addLogEntry('DRAW! All armies destroyed!', 'special');
            showMessage('Draw!', 5000);
        }
    }
}

/**
 * Reset the game to initial state
 */
function resetGame() {
    // Reset game state
    gameState.phase = 'setup';
    gameState.players = [];
    gameState.currentPlayerIndex = 0;
    gameState.round = 1;
    gameState.abilityUses = {};
    gameState.slimeSpikeTargets = [];

    // Reinitialize HP for all cards
    const allCards = getAllCards();
    allCards.forEach(card => {
        gameState.cardHP[card.id] = card.hp;
    });

    // Clear UI
    clearBattleSelections();

    addLogEntry('Game reset!', 'system');
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Export for debugging and UI callbacks
window.gameState = gameState;
window.resetGame = resetGame;
window.handleCardDoubleClick = handleCardDoubleClick;
