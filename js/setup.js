/**
 * Monster Ghost Army Cards - Player Setup Module
 *
 * Handles the player setup screen where players configure:
 * - Number of players (2-8)
 * - Player names
 * - AI player toggles
 */

// Setup state
const setupState = {
    playerCount: 2,
    deckSize: 10,
    totalCards: 96,  // Default, will be updated after cards.json loads
    players: []
};

/**
 * Update the total cards available (called after cards.json loads)
 * @param {number} count - Actual number of cards in the deck
 */
function setTotalCards(count) {
    setupState.totalCards = count;
    updateDeckSizeConstraints();
    updateDeckSizeDisplay();
}

// DOM element references
let setupScreen = null;
let playerInputsContainer = null;
let countButtons = null;
let startGameButton = null;
let deckSizeSlider = null;
let deckSizeValue = null;
let deckSizeWarning = null;
let totalCardsNeeded = null;

/**
 * Initialize the setup module
 * Called once when the module loads
 */
function initSetup() {
    setupScreen = document.getElementById('setup-screen');
    playerInputsContainer = document.getElementById('player-inputs');
    startGameButton = document.getElementById('btn-start-game');
    countButtons = document.querySelectorAll('.count-btn');
    deckSizeSlider = document.getElementById('deck-size-slider');
    deckSizeValue = document.getElementById('deck-size-value');
    deckSizeWarning = document.getElementById('deck-size-warning');
    totalCardsNeeded = document.getElementById('total-cards-needed');

    if (!setupScreen || !playerInputsContainer || !startGameButton) {
        console.error('Setup: Required DOM elements not found');
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Initialize with default values
    setPlayerCount(2);
    updateDeckSizeDisplay();
}

/**
 * Set up all event listeners for the setup screen
 */
function setupEventListeners() {
    // Player count buttons
    countButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.count, 10);
            setPlayerCount(count);
        });
    });

    // Deck size slider
    if (deckSizeSlider) {
        deckSizeSlider.addEventListener('input', () => {
            setupState.deckSize = parseInt(deckSizeSlider.value, 10);
            updateDeckSizeDisplay();
        });
    }

    // Start game button
    startGameButton.addEventListener('click', handleStartGame);
}

/**
 * Set the number of players and update UI
 * @param {number} count - Number of players (2-8)
 */
function setPlayerCount(count) {
    // Validate count
    count = Math.max(2, Math.min(8, count));
    setupState.playerCount = count;

    // Update button states
    countButtons.forEach(btn => {
        const btnCount = parseInt(btn.dataset.count, 10);
        btn.classList.toggle('active', btnCount === count);
    });

    // Update deck size constraints based on player count
    updateDeckSizeConstraints();

    // Generate player input rows
    renderPlayerInputs();
}

/**
 * Update deck size slider constraints based on player count
 */
function updateDeckSizeConstraints() {
    if (!deckSizeSlider) return;

    // Calculate max deck size: floor(totalCards / playerCount)
    // Cap at 25 max cards per player, or available cards / players
    const maxDeckSize = Math.floor(setupState.totalCards / setupState.playerCount);
    const newMax = Math.min(25, maxDeckSize);
    deckSizeSlider.max = newMax;

    // If current deck size exceeds new max, adjust it
    if (setupState.deckSize > newMax) {
        setupState.deckSize = newMax;
        deckSizeSlider.value = newMax;
    }

    updateDeckSizeDisplay();
}

/**
 * Update the deck size display and validation messages
 */
function updateDeckSizeDisplay() {
    if (!deckSizeValue || !totalCardsNeeded) return;

    const needed = setupState.playerCount * setupState.deckSize;
    const available = setupState.totalCards;

    // Update display
    deckSizeValue.textContent = setupState.deckSize;
    totalCardsNeeded.textContent = `${needed} of ${available} cards needed`;

    // Show warning if close to limit
    if (deckSizeWarning) {
        if (needed > available) {
            deckSizeWarning.textContent = '⚠ Not enough cards!';
            deckSizeWarning.classList.remove('hidden');
            startGameButton.disabled = true;
        } else if (needed > available * 0.9) {
            deckSizeWarning.textContent = '⚠ Using most cards';
            deckSizeWarning.classList.remove('hidden');
            startGameButton.disabled = false;
        } else {
            deckSizeWarning.classList.add('hidden');
            startGameButton.disabled = false;
        }
    }
}

/**
 * Render player input rows based on current player count
 */
function renderPlayerInputs() {
    // Clear existing inputs using safe DOM method
    while (playerInputsContainer.firstChild) {
        playerInputsContainer.removeChild(playerInputsContainer.firstChild);
    }

    // Create input row for each player
    for (let i = 1; i <= setupState.playerCount; i++) {
        const row = createPlayerInputRow(i);
        playerInputsContainer.appendChild(row);
    }
}

/**
 * Create a player input row
 * @param {number} playerNum - Player number (1-indexed)
 * @returns {HTMLElement} The player input row element
 */
function createPlayerInputRow(playerNum) {
    const isFirstPlayer = playerNum === 1;

    const row = document.createElement('div');
    row.className = 'player-input-row' + (isFirstPlayer ? ' human-player' : '');
    row.dataset.playerNum = playerNum;

    // Player number badge
    const numberBadge = document.createElement('div');
    numberBadge.className = 'player-number';
    numberBadge.textContent = playerNum;

    // Player name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'player-name-input';
    nameInput.id = 'player-name-' + playerNum;
    nameInput.placeholder = 'Enter name...';
    nameInput.value = 'Player ' + playerNum;
    nameInput.maxLength = 20;

    // Focus handler to select all text
    nameInput.addEventListener('focus', () => {
        nameInput.select();
    });

    // Build the row
    row.appendChild(numberBadge);
    row.appendChild(nameInput);

    // AI toggle for all players (shared device mode)
    const aiLabel = document.createElement('label');
    aiLabel.className = 'ai-toggle-label';
    aiLabel.htmlFor = 'ai-toggle-' + playerNum;

    const aiCheckbox = document.createElement('input');
    aiCheckbox.type = 'checkbox';
    aiCheckbox.className = 'ai-checkbox';
    aiCheckbox.id = 'ai-toggle-' + playerNum;
    aiCheckbox.checked = false; // Default to human

    const toggleSwitch = document.createElement('span');
    toggleSwitch.className = 'ai-toggle-switch';

    const toggleText = document.createElement('span');
    toggleText.className = 'ai-toggle-text';
    toggleText.textContent = 'AI';

    aiLabel.appendChild(aiCheckbox);
    aiLabel.appendChild(toggleSwitch);
    aiLabel.appendChild(toggleText);
    row.appendChild(aiLabel);

    return row;
}

/**
 * Show the setup screen
 */
function showSetupScreen() {
    if (!setupScreen) {
        initSetup();
    }

    setupScreen.classList.remove('hidden');

    // Focus the first player name input
    setTimeout(() => {
        const firstInput = document.getElementById('player-name-1');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }, 100);
}

/**
 * Hide the setup screen
 */
function hideSetupScreen() {
    if (setupScreen) {
        setupScreen.classList.add('hidden');
    }
}

/**
 * Get the current player configurations
 * @returns {Array} Array of player config objects
 */
function getPlayerConfigs() {
    const configs = [];

    for (let i = 1; i <= setupState.playerCount; i++) {
        const nameInput = document.getElementById('player-name-' + i);
        const aiCheckbox = document.getElementById('ai-toggle-' + i);

        const name = nameInput ? nameInput.value.trim() || ('Player ' + i) : ('Player ' + i);
        const isAI = i === 1 ? false : (aiCheckbox ? aiCheckbox.checked : false);

        configs.push({
            id: 'player' + i,
            name: name,
            isAI: isAI,
            cards: []
        });
    }

    return configs;
}

/**
 * Handle the start game button click
 */
function handleStartGame() {
    const playerConfigs = getPlayerConfigs();

    // Validate player names are not empty
    const validNames = playerConfigs.every(config => config.name.length > 0);
    if (!validNames) {
        console.warn('Setup: Some player names are empty');
        // Names will default to "Player X" in getPlayerConfigs
    }

    // Hide setup screen
    hideSetupScreen();

    // Dispatch custom event with player data
    const event = new CustomEvent('gameSetupComplete', {
        detail: {
            players: playerConfigs,
            playerCount: setupState.playerCount,
            deckSize: setupState.deckSize
        }
    });

    document.dispatchEvent(event);

    console.log('Setup complete:', playerConfigs);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSetup);
} else {
    initSetup();
}

// Export functions for use by other modules
export {
    showSetupScreen,
    hideSetupScreen,
    getPlayerConfigs,
    setPlayerCount,
    setTotalCards
};
