/**
 * Monster Ghost Army Cards - Main Game State and Logic Module
 *
 * This is the main entry point for the game. It manages game state,
 * coordinates between modules, and handles the game lifecycle.
 */

import { loadCards, getAllCards, getCardById, ELEMENTS, TIERS, shuffleArray, formatHP } from './cards.js';
import {
    calculateDamage,
    getValidAttacks,
    getValidDefenses,
    processBattleRound,
    normalizeAttack,
    normalizeDefense,
    SPECIAL_ABILITIES,
    canBounceBack
} from './battle.js';
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
import { showSetupScreen, hideSetupScreen, getPlayerConfigs, setTotalCards } from './setup.js';
import { startDraftingPhase } from './drafting.js';
import { getAIAttackChoice, getAIDefenseChoice, isAIPlayer, delay } from './ai.js';

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
    turnIndex: 0,

    // Card tracking
    deck: [],           // Available cards in deck
    cardHP: {},         // Current HP for each card by ID

    // Battle state
    selectedAttacker: null,
    selectedDefender: null,
    selectedDefenderPlayer: null,
    selectedAttack: null,
    selectedDefense: null,
    pendingDefensePrompt: null,

    // Special ability tracking
    abilityUses: {},        // { cardId_abilityName: usesCount }
    slimeSpikeTargets: [],  // Attacks weakened by slime spike

    // Stats tracking
    stats: {
        totalDamageDealt: {},  // By player ID
        cardsDefeated: {},     // By player ID
        roundsPlayed: 0
    },

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

        // Update setup screen with actual card count
        setTotalCards(cards.length);

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

        // Listen for setup completion
        document.addEventListener('gameSetupComplete', handleGameSetupComplete);

        // Show the player setup screen
        showSetupScreen();

    } catch (error) {
        console.error('Failed to initialize game:', error);
        updateLoadingStatus(`Error: ${error.message}`);
    }
}

/**
 * Set up control button event listeners
 */
function setupControlListeners() {
    // Attack button
    const btnAttack = document.getElementById('btn-attack');
    if (btnAttack) {
        btnAttack.addEventListener('click', handleAttackButton);
    }

    // Skip defense button
    const btnSkipDefense = document.getElementById('btn-skip-defense');
    if (btnSkipDefense) {
        btnSkipDefense.addEventListener('click', handleSkipDefense);
    }

    // End turn button
    const btnEndTurn = document.getElementById('btn-end-turn');
    if (btnEndTurn) {
        btnEndTurn.addEventListener('click', handleEndTurn);
    }

    // New game button
    const btnNewGame = document.getElementById('btn-new-game');
    if (btnNewGame) {
        btnNewGame.addEventListener('click', handleNewGame);
    }

    // Play again button (in victory modal)
    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
        btnPlayAgain.addEventListener('click', handleNewGame);
    }

    // Skip defense in modal
    const btnSkipDefenseModal = document.getElementById('btn-skip-defense-modal');
    if (btnSkipDefenseModal) {
        btnSkipDefenseModal.addEventListener('click', () => {
            handleDefenseSelect(null);
        });
    }

    // Special ability button
    const btnSpecial = document.getElementById('btn-special');
    if (btnSpecial) {
        btnSpecial.addEventListener('click', handleSpecialAbility);
    }
}

/**
 * Handle the game setup completion event
 * @param {CustomEvent} event - The gameSetupComplete event with player data
 */
function handleGameSetupComplete(event) {
    const { players, playerCount, deckSize = 10 } = event.detail;

    console.log('Game setup complete:', players, 'Deck size:', deckSize);

    // Update game state with player configurations
    gameState.playerCount = playerCount;
    gameState.deckSize = deckSize;
    gameState.players = players.map((config, index) => ({
        id: config.id,
        name: config.name,
        isAI: config.isAI,
        cards: []
    }));

    // Log player setup
    addLogEntry(`Game configured with ${playerCount} players (${deckSize} cards each):`, 'system');
    players.forEach((player, index) => {
        const playerType = player.isAI ? 'AI' : 'Human';
        addLogEntry(`  ${index + 1}. ${player.name} (${playerType})`, 'system');
    });

    // Move to drafting phase
    gameState.phase = 'drafting';
    addLogEntry('Entering drafting phase...', 'system');
    addLogEntry('Each player will take turns drafting cards to build their deck.', 'system');

    // Listen for drafting completion
    document.addEventListener('draftingComplete', handleDraftingComplete, { once: true });

    // Start the drafting phase with deck size
    startDraftingPhase(players, deckSize);
}

/**
 * Handle the drafting phase completion event
 * @param {CustomEvent} event - The draftingComplete event with player data
 */
function handleDraftingComplete(event) {
    const { players } = event.detail;

    console.log('Drafting complete:', players);

    // Update game state with drafted cards
    gameState.players = players.map(player => ({
        id: player.id,
        name: player.name,
        isAI: player.isAI,
        cards: [...player.cards]
    }));

    // Log drafting results
    addLogEntry('Drafting phase complete!', 'system');
    players.forEach(player => {
        addLogEntry(`${player.name} drafted ${player.cards.length} cards`, 'system');
    });

    // Initialize turn order (randomized)
    gameState.turnOrder = shuffleArray([...Array(gameState.players.length).keys()]);
    gameState.turnIndex = 0;
    gameState.currentPlayerIndex = gameState.turnOrder[0];
    gameState.round = 1;

    // Initialize stats
    gameState.stats = {
        totalDamageDealt: {},
        cardsDefeated: {},
        roundsPlayed: 0
    };
    gameState.players.forEach(p => {
        gameState.stats.totalDamageDealt[p.id] = 0;
        gameState.stats.cardsDefeated[p.id] = 0;
    });

    // Move to playing phase
    gameState.phase = 'playing';

    // Reinitialize HP for drafted cards
    const allCards = getAllCards();
    allCards.forEach(card => {
        gameState.cardHP[card.id] = card.hp;
    });

    // Update player count display
    const playerCountDisplay = document.getElementById('player-count-display');
    if (playerCountDisplay) {
        playerCountDisplay.textContent = `Players: ${gameState.players.length}`;
    }

    // Render initial game state
    addLogEntry('--- Battle Phase Begins! ---', 'system');
    const firstPlayer = gameState.players[gameState.currentPlayerIndex];
    addLogEntry(`${firstPlayer.name}'s turn`, 'system');

    renderGameState();

    // If first player is AI, start their turn
    if (firstPlayer.isAI) {
        setTimeout(() => executeAITurn(firstPlayer), 800);
    }
}

/**
 * Set up a demo game with the configured players
 * @param {Array} playerConfigs - Array of player configuration objects
 */
function setupDemoGameWithPlayers(playerConfigs) {
    const allCards = getAllCards();

    if (allCards.length === 0) {
        addLogEntry('No cards available for game', 'system');
        return;
    }

    // Use the 10 test cards that have generated images
    const testCardIds = [
        'spike_wall', 'dirty_diaper', 'fierce_cow', 'ice_cream_flinger', 'box',
        'shofario', 'the_scribbler', 'wonka_wacka_doodle_monster', 'robo_jolt', 'doublespike'
    ];

    // Filter to only cards that exist
    const availableTestCards = testCardIds.filter(id => getCardById(id) !== null);

    // Distribute cards to players (5 cards each for demo)
    const cardsPerPlayer = Math.min(5, Math.floor(allCards.length / playerConfigs.length));

    playerConfigs.forEach((config, index) => {
        const startIndex = index * cardsPerPlayer;
        const playerCards = availableTestCards.length >= (index + 1) * cardsPerPlayer
            ? availableTestCards.slice(startIndex, startIndex + cardsPerPlayer)
            : allCards.slice(startIndex, startIndex + cardsPerPlayer).map(c => c.id);

        gameState.players[index] = {
            id: config.id,
            name: config.name,
            isAI: config.isAI,
            cards: playerCards
        };
    });

    gameState.currentPlayerIndex = 0;
    gameState.phase = 'playing';

    // Render initial state
    renderGameState();

    addLogEntry('Demo game started!', 'system');
    addLogEntry('Click: select card | Double-click: view details', 'system');
    addLogEntry(`${gameState.players[0].name}'s turn`, 'system');
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

    // Update title for current player
    const playerAreaTitle = document.getElementById('player-area-title');
    if (playerAreaTitle) {
        playerAreaTitle.textContent = `${currentPlayer.name}'s Army`;
    }

    // Get card objects for current player
    const playerCards = currentPlayer.cards
        .map(id => getCardById(id))
        .filter(card => card !== null);

    // Render player hand
    renderPlayerHand(playerCards, gameState, (cardId) => handleCardClick(cardId, 'player'));

    // Render all other players' cards in the opponents area
    renderAllOpponents();

    // Update game info
    updateRoundCounter(gameState.round);
    updateTurnIndicator(`${currentPlayer.name}${currentPlayer.isAI ? ' (AI)' : ''}`);

    // Update control states
    updateControlStates();
}

/**
 * Render all opponents in the opponents area (multi-player layout)
 */
function renderAllOpponents() {
    const container = document.getElementById('all-opponents-container');
    if (!container) return;

    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    gameState.players.forEach((player, index) => {
        // Skip current player
        if (index === gameState.currentPlayerIndex) return;

        const panel = document.createElement('div');
        panel.className = `player-panel ${player.cards.length === 0 ? 'eliminated' : ''}`;
        panel.dataset.playerId = player.id;

        const header = document.createElement('div');
        header.className = 'player-panel-header';

        const nameSpan = document.createElement('span');
        nameSpan.className = `player-panel-name ${player.isAI ? 'is-ai' : ''}`;
        nameSpan.textContent = player.name;

        const cardsSpan = document.createElement('span');
        cardsSpan.className = 'player-panel-cards';
        cardsSpan.textContent = `${player.cards.length} cards`;

        header.appendChild(nameSpan);
        header.appendChild(cardsSpan);
        panel.appendChild(header);

        const cardsRow = document.createElement('div');
        cardsRow.className = 'player-panel-cards-row';
        cardsRow.id = `cards-${player.id}`;
        panel.appendChild(cardsRow);

        container.appendChild(panel);

        // Render this player's cards
        const cards = player.cards
            .map(id => getCardById(id))
            .filter(card => card !== null);

        renderOpponentCardsInContainer(cards, {
            faceDown: false,
            gameState,
            onCardClick: (cardId) => handleCardClick(cardId, 'opponent', player)
        }, cardsRow);
    });
}

/**
 * Render opponent cards to a specific container using DOM methods
 */
function renderOpponentCardsInContainer(cards, options, container) {
    if (!container) return;

    const { faceDown = true, gameState: gs = {}, onCardClick = null } = options;

    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (cards.length === 0) {
        const noCards = document.createElement('div');
        noCards.className = 'no-cards';
        noCards.textContent = 'No cards';
        container.appendChild(noCards);
        return;
    }

    // Render each card using DOM methods
    cards.forEach(card => {
        const currentHP = gs.cardHP?.[card.id] ?? card.hp;
        const hpPercent = Math.max(0, Math.min(100, (currentHP / card.hp) * 100));
        const tierClass = card.tier ? `tier-${card.tier}` : 'tier-common';
        const imagePath = `assets/images/generated/${card.id}_generated.png`;

        const cardEl = document.createElement('div');
        cardEl.className = `game-card ${tierClass} opponent-card`;
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.tier = card.tier;
        cardEl.title = 'Click to target, double-click for details';

        // Info button
        const infoBtn = document.createElement('button');
        infoBtn.className = 'card-info-btn';
        infoBtn.title = 'View card details';
        infoBtn.setAttribute('aria-label', `View details for ${card.name}`);
        infoBtn.textContent = 'i';
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCardDoubleClick(card.id);
        });
        cardEl.appendChild(infoBtn);

        // Card image container
        const imageDiv = document.createElement('div');
        imageDiv.className = 'card-image';

        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = card.name;
        img.onerror = function() {
            this.style.display = 'none';
            this.nextElementSibling.style.display = 'flex';
        };

        const placeholder = document.createElement('div');
        placeholder.className = 'card-image-placeholder';
        placeholder.style.display = 'none';
        placeholder.textContent = 'No Image';

        imageDiv.appendChild(img);
        imageDiv.appendChild(placeholder);
        cardEl.appendChild(imageDiv);

        // Card name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'card-name';
        nameDiv.textContent = card.name;
        cardEl.appendChild(nameDiv);

        // Elements
        const elementsDiv = document.createElement('div');
        elementsDiv.className = 'card-elements';
        card.elements.forEach(el => {
            const iconSpan = document.createElement('span');
            iconSpan.className = `element-icon ${el}`;
            iconSpan.title = el;
            const config = ELEMENTS[el];
            iconSpan.textContent = config?.icon || el[0].toUpperCase();
            elementsDiv.appendChild(iconSpan);
        });
        cardEl.appendChild(elementsDiv);

        // HP bar
        const hpBar = document.createElement('div');
        hpBar.className = 'card-hp-bar';
        const hpFill = document.createElement('div');
        hpFill.className = 'card-hp-fill';
        hpFill.style.width = `${hpPercent}%`;
        hpBar.appendChild(hpFill);
        cardEl.appendChild(hpBar);

        // HP text
        const hpText = document.createElement('div');
        hpText.className = 'card-hp-text';
        hpText.textContent = `${formatHP(currentHP)} / ${formatHP(card.hp)}`;
        cardEl.appendChild(hpText);

        // Add click listeners
        if (onCardClick) {
            cardEl.addEventListener('click', () => onCardClick(card.id));
            cardEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                handleCardDoubleClick(card.id);
            });
        }

        container.appendChild(cardEl);
    });
}

/**
 * Update control button states based on game state
 */
function updateControlStates() {
    const hasAttacker = gameState.selectedAttacker !== null;
    const hasDefender = gameState.selectedDefender !== null;
    const hasAttack = gameState.selectedAttack !== null;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isHuman = currentPlayer && !currentPlayer.isAI;

    setControlStates({
        draw: false, // Disabled for now
        attack: isHuman && hasAttacker && hasDefender && hasAttack,
        defend: gameState.pendingDefensePrompt !== null,
        endTurn: isHuman && gameState.phase === 'playing',
        special: false // Enabled when special ability available
    });
}

/**
 * Handle card click
 * @param {string} cardId - ID of clicked card
 * @param {string} source - 'player' or 'opponent'
 * @param {Object} targetPlayer - Player object if clicking opponent card
 */
function handleCardClick(cardId, source, targetPlayer = null) {
    const card = getCardById(cardId);
    if (!card) return;

    if (gameState.phase !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Don't allow clicks if it's AI's turn
    if (currentPlayer.isAI) return;

    console.log(`Card clicked: ${card.name} (${source})`);

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
        if (!gameState.selectedAttacker) {
            addLogEntry('Select one of your cards first!', 'system');
            return;
        }

        // Find which player owns this card if not provided
        const ownerPlayer = targetPlayer || gameState.players.find(p =>
            p.cards.includes(cardId) && p.id !== currentPlayer.id
        );

        if (!ownerPlayer) return;

        gameState.selectedDefender = cardId;
        gameState.selectedDefenderPlayer = ownerPlayer;
        setDefenderCard(card, gameState);
        highlightCard(cardId);

        addLogEntry(`Targeting ${card.name} (${ownerPlayer.name})`, 'system');
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
 * Handle attack button
 */
async function handleAttackButton() {
    if (!gameState.selectedAttacker || !gameState.selectedDefender || !gameState.selectedAttack) {
        addLogEntry('Select an attacker, target, and attack first!', 'system');
        return;
    }

    const attacker = getCardById(gameState.selectedAttacker);
    const defender = getCardById(gameState.selectedDefender);
    const attack = gameState.selectedAttack;
    const defenderPlayer = gameState.selectedDefenderPlayer;

    if (!attacker || !defender || !defenderPlayer) return;

    addLogEntry(`${attacker.name} uses ${attack.name} on ${defender.name}!`, 'attack');

    // Check if defender has defenses and prompt for defense selection
    const validDefenses = getValidDefenses(defender, gameState);

    if (validDefenses.length > 0) {
        if (defenderPlayer.isAI) {
            // AI selects defense
            const defense = await getAIDefenseChoice(defender, attack, gameState);
            if (defense) {
                addLogEntry(`${defenderPlayer.name} defends with ${defense.name}!`, 'defense');
            }
            await executeBattle(attacker, attack, defender, defense, defenderPlayer);
        } else {
            // Show defense modal for human player
            promptDefenseSelection(attacker, attack, defender, defenderPlayer, validDefenses);
        }
    } else {
        // No defenses, execute attack directly
        await executeBattle(attacker, attack, defender, null, defenderPlayer);
    }
}

/**
 * Prompt the defending player to select a defense
 */
function promptDefenseSelection(attacker, attack, defender, defenderPlayer, validDefenses) {
    const modal = document.getElementById('defense-modal');
    if (!modal) {
        // Fallback: execute without defense
        executeBattle(attacker, attack, defender, null, defenderPlayer);
        return;
    }

    gameState.pendingDefensePrompt = {
        attacker, attack, defender, defenderPlayer, validDefenses
    };

    // Update modal content
    const attackInfo = document.getElementById('defense-attack-info');
    const damagePreview = document.getElementById('defense-damage-preview');
    const buttonsContainer = document.getElementById('defense-modal-buttons');

    if (attackInfo) {
        attackInfo.textContent = `${attacker.name} attacks with ${attack.name}!`;
    }

    // Calculate and show damage preview
    const previewResult = calculateDamage(attack, attacker, defender, null, gameState);
    if (damagePreview) {
        damagePreview.textContent = `Potential damage: ${formatHP(previewResult.finalDamage)}`;
    }

    // Generate defense buttons using DOM methods
    if (buttonsContainer) {
        while (buttonsContainer.firstChild) {
            buttonsContainer.removeChild(buttonsContainer.firstChild);
        }

        validDefenses.forEach(defense => {
            const btn = document.createElement('button');
            btn.className = 'action-btn defense-option';
            btn.dataset.defenseName = defense.name;
            if (!defense.canUse) btn.disabled = true;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'defense-name';
            nameSpan.textContent = defense.name;
            btn.appendChild(nameSpan);

            const protSpan = document.createElement('span');
            protSpan.className = 'defense-protection';
            protSpan.textContent = formatHP(defense.base_protection);
            btn.appendChild(protSpan);

            if (defense.special_type) {
                const specSpan = document.createElement('span');
                specSpan.className = 'special';
                specSpan.textContent = `[${defense.special_type}]`;
                btn.appendChild(specSpan);
            }

            if (defense.remainingUses !== Infinity) {
                const usesSpan = document.createElement('span');
                usesSpan.className = 'uses';
                usesSpan.textContent = `(${defense.remainingUses}x left)`;
                btn.appendChild(usesSpan);
            }

            if (!btn.disabled) {
                btn.addEventListener('click', () => {
                    handleDefenseSelect(defense);
                });
            }

            buttonsContainer.appendChild(btn);
        });
    }

    modal.classList.remove('hidden');
    updateControlStates();
}

/**
 * Handle defense selection (or skip)
 */
async function handleDefenseSelect(defense) {
    const modal = document.getElementById('defense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    if (!gameState.pendingDefensePrompt) return;

    const { attacker, attack, defender, defenderPlayer } = gameState.pendingDefensePrompt;
    gameState.pendingDefensePrompt = null;

    if (defense) {
        addLogEntry(`${defenderPlayer.name} defends with ${defense.name}!`, 'defense');
    } else {
        addLogEntry(`${defenderPlayer.name} takes the hit!`, 'system');
    }

    await executeBattle(attacker, attack, defender, defense, defenderPlayer);
}

/**
 * Handle skip defense button
 */
function handleSkipDefense() {
    handleDefenseSelect(null);
}

/**
 * Execute a battle with the given parameters
 */
async function executeBattle(attacker, attack, defender, defense, defenderPlayer) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Process the battle round
    const result = processBattleRound(
        attacker, attack, defender, defense,
        gameState, gameState.players.length
    );

    // Apply damage to defender
    if (result.damageToDefender > 0) {
        const oldHP = gameState.cardHP[defender.id] ?? defender.hp;
        gameState.cardHP[defender.id] = Math.max(0, oldHP - result.damageToDefender);

        addLogEntry(`Dealt ${formatHP(result.damageToDefender)} damage to ${defender.name}!`, 'damage');

        // Track stats
        gameState.stats.totalDamageDealt[currentPlayer.id] =
            (gameState.stats.totalDamageDealt[currentPlayer.id] || 0) + result.damageToDefender;

        // Show damage animation
        showDamageAnimation(result.damageToDefender, result.isCritical, result.isResisted);

        // Update HP display
        updateCardHP(defender.id, gameState.cardHP[defender.id], defender.hp);
    }

    // Log special effects
    result.log.forEach(msg => addLogEntry(msg, 'special'));

    // Apply damage to attacker (bounce back)
    if (result.damageToAttacker > 0) {
        const oldHP = gameState.cardHP[attacker.id] ?? attacker.hp;
        gameState.cardHP[attacker.id] = Math.max(0, oldHP - result.damageToAttacker);

        addLogEntry(`${attacker.name} takes ${formatHP(result.damageToAttacker)} reflected damage!`, 'damage');
        updateCardHP(attacker.id, gameState.cardHP[attacker.id], attacker.hp);
    }

    // Check for defeated cards
    await delay(300);

    if (result.defenderDefeated) {
        removeCard(defender.id);
        defenderPlayer.cards = defenderPlayer.cards.filter(id => id !== defender.id);
        gameState.stats.cardsDefeated[currentPlayer.id] =
            (gameState.stats.cardsDefeated[currentPlayer.id] || 0) + 1;
    }

    if (result.attackerDefeated) {
        removeCard(attacker.id);
        currentPlayer.cards = currentPlayer.cards.filter(id => id !== attacker.id);
    }

    // Clear selections
    clearBattleSelections();

    // Check for game over
    const gameOver = checkGameOver();

    if (!gameOver) {
        // Re-render
        await delay(500);
        renderGameState();

        // Auto-advance to next turn after attack
        await delay(300);
        advanceToNextTurn();
    }
}

/**
 * Handle end turn button
 */
function handleEndTurn() {
    // Clear selections
    clearBattleSelections();
    advanceToNextTurn();
}

/**
 * Advance to the next player's turn
 */
async function advanceToNextTurn() {
    gameState.turnIndex++;

    // Check if we've completed a round
    if (gameState.turnIndex >= gameState.turnOrder.length) {
        gameState.turnIndex = 0;
        gameState.round++;
        gameState.stats.roundsPlayed = gameState.round;
        addLogEntry(`--- Round ${gameState.round} ---`, 'system');
    }

    // Find next active player (skip eliminated players)
    let attempts = 0;
    while (attempts < gameState.players.length) {
        gameState.currentPlayerIndex = gameState.turnOrder[gameState.turnIndex];
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer && currentPlayer.cards.length > 0) {
            break; // Found active player
        }

        gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
        attempts++;
    }

    const nextPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!nextPlayer) return;

    addLogEntry(`${nextPlayer.name}'s turn`, 'system');

    // Re-render
    renderGameState();

    // If next player is AI, execute their turn
    if (nextPlayer.isAI && nextPlayer.cards.length > 0) {
        await delay(800);
        await executeAITurn(nextPlayer);
    }
}

/**
 * Execute a complete AI turn
 */
async function executeAITurn(player) {
    addLogEntry(`${player.name} is thinking...`, 'system');

    // Get AI attack choice
    const choice = await getAIAttackChoice(player, gameState);

    if (!choice) {
        addLogEntry(`${player.name} has no valid moves!`, 'system');
        await delay(500);
        advanceToNextTurn();
        return;
    }

    const { attackingCard, attack, targetCard, targetPlayer } = choice;

    // Show AI selections in UI
    gameState.selectedAttacker = attackingCard.id;
    setAttackerCard(attackingCard, gameState);
    highlightCard(attackingCard.id);
    await delay(400);

    gameState.selectedAttack = attack;
    addLogEntry(`${player.name} selects ${attack.name}`, 'attack');
    await delay(400);

    gameState.selectedDefender = targetCard.id;
    gameState.selectedDefenderPlayer = targetPlayer;
    setDefenderCard(targetCard, gameState);
    highlightCard(targetCard.id);
    await delay(400);

    addLogEntry(`${attackingCard.name} attacks ${targetCard.name} with ${attack.name}!`, 'attack');

    // Get defense choice from target player
    const validDefenses = getValidDefenses(targetCard, gameState);
    let defense = null;

    if (validDefenses.length > 0) {
        if (targetPlayer.isAI) {
            defense = await getAIDefenseChoice(targetCard, attack, gameState);
            if (defense) {
                addLogEntry(`${targetPlayer.name} defends with ${defense.name}!`, 'defense');
            }
        } else {
            // Prompt human player for defense
            promptDefenseSelection(attackingCard, attack, targetCard, targetPlayer, validDefenses);
            return; // Wait for human input
        }
    }

    await executeBattle(attackingCard, attack, targetCard, defense, targetPlayer);
}

/**
 * Handle new game button
 */
function handleNewGame() {
    // Hide victory modal
    const victoryModal = document.getElementById('victory-modal');
    if (victoryModal) {
        victoryModal.classList.add('hidden');
    }

    // Reset game state
    resetGame();

    // Show setup screen
    showSetupScreen();
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
    gameState.selectedDefenderPlayer = null;
    gameState.selectedAttack = null;
    gameState.selectedDefense = null;

    setAttackerCard(null);
    setDefenderCard(null);
    clearHighlights();
    hideActionPanel();
}

/**
 * Check if the game is over
 * @returns {boolean} True if game is over
 */
function checkGameOver() {
    const activePlayers = gameState.players.filter(p => p.cards.length > 0);

    if (activePlayers.length <= 1) {
        gameState.phase = 'ended';

        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            addLogEntry(`${winner.name} WINS!`, 'special');
            showVictoryScreen(winner);
        } else {
            addLogEntry('DRAW! All armies destroyed!', 'special');
            showMessage('Draw!', 5000);
        }

        return true;
    }

    return false;
}

/**
 * Show the victory screen
 */
function showVictoryScreen(winner) {
    const modal = document.getElementById('victory-modal');
    if (!modal) {
        showMessage(`${winner.name} is victorious!`, 5000);
        return;
    }

    // Update winner name
    const winnerName = document.getElementById('victory-player-name');
    if (winnerName) {
        winnerName.textContent = winner.name;
    }

    // Update stats using DOM methods
    const statsContainer = document.getElementById('victory-stats');
    if (statsContainer) {
        // Clear previous stats
        while (statsContainer.firstChild) {
            statsContainer.removeChild(statsContainer.firstChild);
        }

        const stats = [
            { label: 'Rounds Played:', value: gameState.stats.roundsPlayed || gameState.round },
            { label: 'Damage Dealt:', value: formatHP(gameState.stats.totalDamageDealt[winner.id] || 0) },
            { label: 'Cards Defeated:', value: gameState.stats.cardsDefeated[winner.id] || 0 },
            { label: 'Cards Remaining:', value: winner.cards.length }
        ];

        stats.forEach(stat => {
            const row = document.createElement('div');
            row.className = 'victory-stat-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'victory-stat-label';
            labelSpan.textContent = stat.label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'victory-stat-value';
            valueSpan.textContent = stat.value;

            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            statsContainer.appendChild(row);
        });
    }

    modal.classList.remove('hidden');
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
    gameState.turnIndex = 0;
    gameState.turnOrder = [];
    gameState.abilityUses = {};
    gameState.slimeSpikeTargets = [];
    gameState.pendingDefensePrompt = null;
    gameState.stats = {
        totalDamageDealt: {},
        cardsDefeated: {},
        roundsPlayed: 0
    };

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
