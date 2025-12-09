// Roll For It! - Web Game Implementation

// ==================== CARD DEFINITIONS ====================
const CARD_DEFINITIONS = [
    // Easy (Blue) - 10 cards, 2-4 points
    { required: [1, 1], points: 2, difficulty: 'easy' },
    { required: [2, 2], points: 2, difficulty: 'easy' },
    { required: [3, 3], points: 2, difficulty: 'easy' },
    { required: [4, 4], points: 2, difficulty: 'easy' },
    { required: [5, 5], points: 2, difficulty: 'easy' },
    { required: [6, 6], points: 2, difficulty: 'easy' },
    { required: [1, 2], points: 3, difficulty: 'easy' },
    { required: [3, 4], points: 3, difficulty: 'easy' },
    { required: [5, 6], points: 3, difficulty: 'easy' },
    { required: [2, 5], points: 4, difficulty: 'easy' },

    // Medium (Green) - 12 cards, 5-10 points
    { required: [1, 1, 1], points: 5, difficulty: 'medium' },
    { required: [2, 2, 2], points: 5, difficulty: 'medium' },
    { required: [3, 3, 3], points: 5, difficulty: 'medium' },
    { required: [4, 4, 4], points: 5, difficulty: 'medium' },
    { required: [5, 5, 5], points: 5, difficulty: 'medium' },
    { required: [6, 6, 6], points: 5, difficulty: 'medium' },
    { required: [1, 2, 3], points: 6, difficulty: 'medium' },
    { required: [2, 3, 4], points: 6, difficulty: 'medium' },
    { required: [3, 4, 5], points: 6, difficulty: 'medium' },
    { required: [4, 5, 6], points: 6, difficulty: 'medium' },
    { required: [1, 1, 6, 6], points: 8, difficulty: 'medium' },
    { required: [2, 2, 5, 5], points: 8, difficulty: 'medium' },

    // Hard (Purple) - 8 cards, 10-15 points
    { required: [1, 1, 1, 1], points: 10, difficulty: 'hard' },
    { required: [3, 3, 3, 3], points: 10, difficulty: 'hard' },
    { required: [6, 6, 6, 6], points: 10, difficulty: 'hard' },
    { required: [1, 2, 3, 4, 5], points: 12, difficulty: 'hard' },
    { required: [2, 3, 4, 5, 6], points: 12, difficulty: 'hard' },
    { required: [1, 1, 1, 6, 6, 6], points: 15, difficulty: 'hard' },
    { required: [2, 2, 2, 2, 2], points: 15, difficulty: 'hard' },
    { required: [5, 5, 5, 5, 5], points: 15, difficulty: 'hard' },
];

const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'];

// ==================== GAME STATE ====================
let gameState = {
    players: [],
    deck: [],
    activeCards: [],
    currentPlayerIndex: 0,
    winScore: 40,
    gameOver: false,
    winner: null,
    phase: 'setup', // setup, take-back, roll, match, score, game-over
    currentRoll: [],
    selectedDie: null, // { index, value }
};

// ==================== UTILITY FUNCTIONS ====================

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function createDeck() {
    return shuffle(CARD_DEFINITIONS.map((def, index) => ({
        id: `card-${index}`,
        required: [...def.required],
        points: def.points,
        difficulty: def.difficulty,
        placedDice: {}, // { playerId: [values] }
    })));
}

function getCurrentPlayer() {
    return gameState.players[gameState.currentPlayerIndex];
}

function getPlayerDiceOnCards(playerId) {
    let count = 0;
    for (const card of gameState.activeCards) {
        if (card.placedDice[playerId]) {
            count += card.placedDice[playerId].length;
        }
    }
    return count;
}

function getAvailableDice(playerId) {
    return 6 - getPlayerDiceOnCards(playerId);
}

// ==================== DOM HELPERS ====================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function showScreen(screenId) {
    $$('.screen').forEach(screen => screen.classList.add('hidden'));
    $(`#${screenId}`).classList.remove('hidden');
}

function showPhase(phaseName) {
    $$('.phase').forEach(phase => phase.classList.add('hidden'));
    const phaseEl = $(`#${phaseName}-phase`);
    if (phaseEl) {
        phaseEl.classList.remove('hidden');
    }

    // Update phase indicator
    const phaseTexts = {
        'take-back': 'Phase 0: Take Back Decision',
        'roll': 'Phase 1: Roll Your Dice',
        'match': 'Phase 2: Match Dice to Cards',
        'score': 'Scoring...',
    };
    $('#turn-phase').textContent = phaseTexts[phaseName] || '';
}

function createDieElement(value, playerColor = null, small = false) {
    const die = document.createElement('div');
    die.className = 'die';
    if (playerColor) {
        die.classList.add(`player-${playerColor}`);
    }
    if (small) {
        die.classList.add('small');
    }
    die.dataset.value = value;

    // Create 9 dot positions
    for (let i = 0; i < 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        die.appendChild(dot);
    }

    return die;
}

function addLogEntry(message, playerColor = null) {
    const logEntries = $('#log-entries');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (playerColor) {
        entry.classList.add(`player-${playerColor}`);
    }
    entry.innerHTML = message;
    logEntries.insertBefore(entry, logEntries.firstChild);

    // Keep only last 20 entries
    while (logEntries.children.length > 20) {
        logEntries.removeChild(logEntries.lastChild);
    }
}

// ==================== RENDERING ====================

function renderPlayersBar() {
    const playersBar = $('#players-bar');
    playersBar.innerHTML = '';

    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-info';
        if (index === gameState.currentPlayerIndex && !gameState.gameOver) {
            playerDiv.classList.add('active');
        }

        const availableDice = getAvailableDice(player.id);

        playerDiv.innerHTML = `
            <div class="color-indicator" style="background: var(--player-${player.color})"></div>
            <span class="player-name">${player.name}</span>
            <span class="player-score">${player.score}</span>
            <span class="dice-count">${availableDice}/6 dice</span>
        `;

        playersBar.appendChild(playerDiv);
    });
}

function renderActiveCards() {
    const cardsArea = $('#active-cards');
    cardsArea.innerHTML = '';

    gameState.activeCards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = `score-card difficulty-${card.difficulty}`;
        cardDiv.dataset.cardId = card.id;

        // Check if current player can complete this card
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer && canCompleteCard(card, currentPlayer.id)) {
            cardDiv.classList.add('completable');
        }

        // Build required dice display with slots
        const slotsHtml = buildCardSlots(card);

        // Build progress indicators showing which players have dice on this card
        const progressHtml = buildProgressIndicators(card);

        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="card-points">${card.points} pts</span>
                <span class="card-difficulty">${card.difficulty}</span>
            </div>
            <div class="card-required">
                ${slotsHtml}
            </div>
            <div class="card-progress">
                ${progressHtml}
            </div>
        `;

        cardsArea.appendChild(cardDiv);
    });
}

function buildCardSlots(card) {
    // Create a map of which requirements are matched by which player
    const matchedSlots = [];

    // For each required value, track if it's matched and by whom
    const requiredCounts = {};
    card.required.forEach(val => {
        requiredCounts[val] = (requiredCounts[val] || 0) + 1;
    });

    // Track placed dice per value per player
    const placedByPlayer = {};
    for (const [playerId, dice] of Object.entries(card.placedDice)) {
        placedByPlayer[playerId] = {};
        dice.forEach(val => {
            placedByPlayer[playerId][val] = (placedByPlayer[playerId][val] || 0) + 1;
        });
    }

    // Build slots HTML
    let html = '';
    const usedPerValue = {};

    card.required.forEach((reqValue, slotIndex) => {
        usedPerValue[reqValue] = usedPerValue[reqValue] || 0;

        // Check if any player has matched this slot
        let matchedByPlayer = null;
        for (const [playerId, diceByValue] of Object.entries(placedByPlayer)) {
            const playerPlacedCount = diceByValue[reqValue] || 0;
            if (playerPlacedCount > usedPerValue[reqValue]) {
                matchedByPlayer = playerId;
                break;
            }
        }

        const isMatched = matchedByPlayer !== null;
        const slotClass = isMatched ? 'card-slot matched' : 'card-slot';

        html += `<div class="${slotClass}" data-slot-index="${slotIndex}" data-required-value="${reqValue}">`;
        html += `<span class="slot-requirement">${reqValue}</span>`;

        if (isMatched) {
            const player = gameState.players.find(p => p.id === matchedByPlayer);
            const dieHtml = createDieElement(reqValue, player?.color, true).outerHTML;
            html += `<div class="placed-die">${dieHtml}</div>`;
            usedPerValue[reqValue]++;
        }

        html += `</div>`;
    });

    return html;
}

function buildProgressIndicators(card) {
    let html = '';

    for (const [playerId, dice] of Object.entries(card.placedDice)) {
        if (dice.length > 0) {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
                for (let i = 0; i < dice.length; i++) {
                    html += `<div class="progress-indicator" style="background: var(--player-${player.color}); border-color: var(--player-${player.color})"></div>`;
                }
            }
        }
    }

    return html;
}

function renderCurrentPlayerTurn() {
    const player = getCurrentPlayer();
    $('#current-player-name').textContent = `${player.name}'s Turn`;
    $('#current-player-name').style.color = `var(--player-${player.color})`;
}

function renderRolledDice() {
    const diceContainer = $('#rolled-dice');
    diceContainer.innerHTML = '';

    const player = getCurrentPlayer();

    gameState.currentRoll.forEach((dieValue, index) => {
        if (dieValue !== null) { // null means die was placed
            const dieEl = createDieElement(dieValue, player.color);
            dieEl.dataset.index = index;

            if (gameState.selectedDie && gameState.selectedDie.index === index) {
                dieEl.classList.add('selected');
            }

            dieEl.addEventListener('click', () => handleDieClick(index, dieValue));
            diceContainer.appendChild(dieEl);
        }
    });
}

function updateGameInfo() {
    $('#deck-count').textContent = `Deck: ${gameState.deck.length}`;
    $('#target-score').textContent = `Target: ${gameState.winScore}`;
}

// ==================== GAME LOGIC ====================

function canCompleteCard(card, playerId) {
    const playerDice = card.placedDice[playerId] || [];
    if (playerDice.length !== card.required.length) return false;

    // Check if all required values are matched
    const requiredSorted = [...card.required].sort();
    const placedSorted = [...playerDice].sort();

    return requiredSorted.every((val, i) => val === placedSorted[i]);
}

function getUnmatchedRequirements(card, playerId) {
    const playerDice = card.placedDice[playerId] || [];
    const required = [...card.required];

    // Remove matched values
    playerDice.forEach(dieVal => {
        const idx = required.indexOf(dieVal);
        if (idx !== -1) {
            required.splice(idx, 1);
        }
    });

    return required;
}

function canPlaceDieOnCard(card, playerId, dieValue) {
    const unmatched = getUnmatchedRequirements(card, playerId);
    return unmatched.includes(dieValue);
}

function placeDieOnCard(card, playerId, dieValue) {
    if (!card.placedDice[playerId]) {
        card.placedDice[playerId] = [];
    }
    card.placedDice[playerId].push(dieValue);
}

function returnDiceFromCard(card) {
    // Return all dice to their owners
    for (const playerId of Object.keys(card.placedDice)) {
        card.placedDice[playerId] = [];
    }
}

function drawCard() {
    if (gameState.deck.length === 0) return null;
    return gameState.deck.pop();
}

function takeBackAllDice(playerId) {
    gameState.activeCards.forEach(card => {
        if (card.placedDice[playerId]) {
            card.placedDice[playerId] = [];
        }
    });
}

function checkForScoredCards() {
    const currentPlayer = getCurrentPlayer();
    const scoredCards = [];

    gameState.activeCards.forEach(card => {
        if (canCompleteCard(card, currentPlayer.id)) {
            scoredCards.push(card);
        }
    });

    return scoredCards;
}

function scoreCards(cards) {
    const currentPlayer = getCurrentPlayer();
    let totalPoints = 0;

    cards.forEach(card => {
        // Add points
        currentPlayer.score += card.points;
        totalPoints += card.points;

        // Return all dice to owners
        returnDiceFromCard(card);

        // Remove card and draw replacement
        const cardIndex = gameState.activeCards.indexOf(card);
        const newCard = drawCard();
        if (newCard) {
            gameState.activeCards[cardIndex] = newCard;
        } else {
            gameState.activeCards.splice(cardIndex, 1);
        }

        addLogEntry(`<span class="player-name">${currentPlayer.name}</span> scored ${card.points} points!`, currentPlayer.color);
    });

    return totalPoints;
}

function checkWinCondition() {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer.score >= gameState.winScore) {
        gameState.gameOver = true;
        gameState.winner = currentPlayer;
        return true;
    }
    return false;
}

function nextPlayer() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.phase = 'take-back';
    gameState.selectedDie = null;
    gameState.currentRoll = [];
}

// ==================== PHASE HANDLERS ====================

function startTakeBackPhase() {
    gameState.phase = 'take-back';
    const player = getCurrentPlayer();
    const diceOnCards = getPlayerDiceOnCards(player.id);

    renderCurrentPlayerTurn();

    // If player has no dice on cards, skip to roll phase
    if (diceOnCards === 0) {
        startRollPhase();
        return;
    }

    // If player has all 6 dice on cards, must take back
    if (diceOnCards === 6) {
        handleTakeBack();
        return;
    }

    showPhase('take-back');
}

function handleTakeBack() {
    const player = getCurrentPlayer();
    takeBackAllDice(player.id);
    addLogEntry(`<span class="player-name">${player.name}</span> took back all dice`, player.color);
    renderActiveCards();
    renderPlayersBar();
    startRollPhase();
}

function handleSkipTakeBack() {
    startRollPhase();
}

function startRollPhase() {
    gameState.phase = 'roll';
    const player = getCurrentPlayer();
    const availableDice = getAvailableDice(player.id);

    $('#available-dice-count').textContent = availableDice;
    showPhase('roll');
}

function handleRoll() {
    const player = getCurrentPlayer();
    const availableDice = getAvailableDice(player.id);

    // Roll the dice
    gameState.currentRoll = [];
    for (let i = 0; i < availableDice; i++) {
        gameState.currentRoll.push(rollDie());
    }

    // Log the roll
    const rollStr = gameState.currentRoll.join(', ');
    addLogEntry(`<span class="player-name">${player.name}</span> rolled: ${rollStr}`, player.color);

    // Animate dice
    const diceContainer = $('#rolled-dice');
    diceContainer.innerHTML = '';

    gameState.currentRoll.forEach((value, index) => {
        const dieEl = createDieElement(value, player.color);
        dieEl.dataset.index = index;
        dieEl.classList.add('rolling');
        diceContainer.appendChild(dieEl);
    });

    // After animation, start match phase
    setTimeout(() => {
        startMatchPhase();
    }, 600);
}

function startMatchPhase() {
    gameState.phase = 'match';
    gameState.selectedDie = null;
    showPhase('match');
    renderRolledDice();
    updateCardSlotClickability();
}

function handleDieClick(index, value) {
    if (gameState.phase !== 'match') return;

    // Toggle selection
    if (gameState.selectedDie && gameState.selectedDie.index === index) {
        gameState.selectedDie = null;
    } else {
        gameState.selectedDie = { index, value };
    }

    renderRolledDice();
    updateCardSlotClickability();
}

function updateCardSlotClickability() {
    // Remove previous click handlers and classes
    $$('.card-slot').forEach(slot => {
        slot.classList.remove('can-place');
        slot.onclick = null;
    });

    if (!gameState.selectedDie) return;

    const player = getCurrentPlayer();
    const dieValue = gameState.selectedDie.value;

    // Check each card for valid placements
    gameState.activeCards.forEach(card => {
        if (canPlaceDieOnCard(card, player.id, dieValue)) {
            // Find unmatched slots for this value
            const cardEl = $(`.score-card[data-card-id="${card.id}"]`);
            const slots = cardEl.querySelectorAll(`.card-slot[data-required-value="${dieValue}"]:not(.matched)`);

            if (slots.length > 0) {
                const slot = slots[0]; // Take first available slot
                slot.classList.add('can-place');
                slot.onclick = () => handleSlotClick(card, dieValue);
            }
        }
    });
}

function handleSlotClick(card, dieValue) {
    if (!gameState.selectedDie) return;

    const player = getCurrentPlayer();

    // Place the die
    placeDieOnCard(card, player.id, dieValue);

    // Remove die from current roll
    gameState.currentRoll[gameState.selectedDie.index] = null;
    gameState.selectedDie = null;

    // Re-render
    renderActiveCards();
    renderRolledDice();
    renderPlayersBar();
    updateCardSlotClickability();

    // Check if card can be scored
    checkAndScoreCards();
}

function checkAndScoreCards() {
    const scoredCards = checkForScoredCards();

    if (scoredCards.length > 0) {
        showScoreAnimation(scoredCards);
    }
}

function showScoreAnimation(cards) {
    const player = getCurrentPlayer();
    const totalPoints = cards.reduce((sum, c) => sum + c.points, 0);

    gameState.phase = 'score';
    showPhase('score');
    $('#score-message').textContent = `+${totalPoints} Points!`;

    setTimeout(() => {
        scoreCards(cards);
        renderActiveCards();
        renderPlayersBar();
        updateGameInfo();

        // Check win condition
        if (checkWinCondition()) {
            showVictoryScreen();
            return;
        }

        // Return to match phase if player still has dice
        const remainingDice = gameState.currentRoll.filter(d => d !== null);
        if (remainingDice.length > 0) {
            startMatchPhase();
        } else {
            // No dice left, check for any remaining scorable cards then end turn
            endTurn();
        }
    }, 1500);
}

function handleDoneMatching() {
    // Final check for any scorable cards
    const scoredCards = checkForScoredCards();
    if (scoredCards.length > 0) {
        showScoreAnimation(scoredCards);
        return;
    }

    endTurn();
}

function endTurn() {
    nextPlayer();
    renderPlayersBar();
    startTakeBackPhase();
}

// ==================== VICTORY ====================

function showVictoryScreen() {
    const winner = gameState.winner;

    $('#winner-announcement').innerHTML = `
        <span class="winner-name" style="color: var(--player-${winner.color})">${winner.name}</span> wins with ${winner.score} points!
    `;

    // Sort players by score
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    let scoresHtml = '<h3>Final Scores</h3>';
    sortedPlayers.forEach((player, index) => {
        const isWinner = player.id === winner.id;
        scoresHtml += `
            <div class="final-score-entry ${isWinner ? 'winner' : ''}" style="color: var(--player-${player.color})">
                <span>${player.name}</span>
                <span>${player.score} pts</span>
            </div>
        `;
    });

    $('#final-scores').innerHTML = scoresHtml;
    showScreen('victory-screen');
}

// ==================== GAME INITIALIZATION ====================

function initializeGame(numPlayers, playerNames, winScore) {
    // Create players
    gameState.players = [];
    for (let i = 0; i < numPlayers; i++) {
        gameState.players.push({
            id: `player-${i}`,
            name: playerNames[i] || `Player ${i + 1}`,
            color: PLAYER_COLORS[i],
            score: 0,
        });
    }

    // Create and shuffle deck
    gameState.deck = createDeck();

    // Deal 3 active cards (4 if 5+ players, but we max at 4)
    gameState.activeCards = [];
    for (let i = 0; i < 3; i++) {
        const card = drawCard();
        if (card) {
            gameState.activeCards.push(card);
        }
    }

    // Set win score
    gameState.winScore = winScore;

    // Determine first player (random)
    gameState.currentPlayerIndex = Math.floor(Math.random() * numPlayers);

    // Reset game state
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.currentRoll = [];
    gameState.selectedDie = null;

    // Clear log
    $('#log-entries').innerHTML = '';
    addLogEntry('Game started!');
    addLogEntry(`<span class="player-name">${getCurrentPlayer().name}</span> goes first!`, getCurrentPlayer().color);

    // Render initial state
    renderPlayersBar();
    renderActiveCards();
    updateGameInfo();

    // Show game screen and start first turn
    showScreen('game-screen');
    startTakeBackPhase();
}

// ==================== SETUP SCREEN ====================

function updatePlayerInputs() {
    const numPlayers = parseInt($('#num-players').value);
    const inputs = $$('.player-name-input');

    inputs.forEach((input, index) => {
        if (index < numPlayers) {
            input.style.display = 'flex';
        } else {
            input.style.display = 'none';
        }
    });
}

function setupEventListeners() {
    // Setup screen
    $('#num-players').addEventListener('change', updatePlayerInputs);

    $('#start-game').addEventListener('click', () => {
        const numPlayers = parseInt($('#num-players').value);
        const winScore = parseInt($('#win-score').value);

        const playerNames = [];
        for (let i = 1; i <= numPlayers; i++) {
            const input = $(`#player-${i}-name`);
            playerNames.push(input.value.trim() || `Player ${i}`);
        }

        initializeGame(numPlayers, playerNames, winScore);
    });

    // Game phase buttons
    $('#btn-take-back').addEventListener('click', handleTakeBack);
    $('#btn-skip-take-back').addEventListener('click', handleSkipTakeBack);
    $('#btn-roll').addEventListener('click', handleRoll);
    $('#btn-done-matching').addEventListener('click', handleDoneMatching);

    // Victory screen
    $('#play-again').addEventListener('click', () => {
        showScreen('setup-screen');
    });
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePlayerInputs();
    showScreen('setup-screen');
});
