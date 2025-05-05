// Game constants
const GRID_SIZE = 10;
const CELL_SIZE = 30;
const MINE_COUNT = 12; // Reduced from 15 to make the game easier

// Game variables
let grid = [];
let mines = [];
let revealed = [];
let flagged = [];
let gameStarted = false;
let gameOver = false;
let gameWon = false;
let startTime = 0;
let currentTime = 0;
let timerInterval;
let seed = '';
let replayData = '';
let rng; // ISAAC CSPRNG instance
let clickTimes = []; // Array to store timestamps of clicks

// DOM elements
const gameBoard = document.getElementById('game-board');
const timerElement = document.getElementById('timer');
const minesCountElement = document.getElementById('mines-count');
const gameOverElement = document.getElementById('game-over');
const gameWinElement = document.getElementById('game-win');
const finalTimeElement = document.getElementById('final-time');
const scoreFormElement = document.getElementById('score-form');
const usernameInput = document.getElementById('username');
const saveScoreButton = document.getElementById('save-score');
const resetGameButton = document.getElementById('reset-game');
const alreadyPlayedElement = document.getElementById('already-played');

// Initialize the game
async function initGame() {
  // Clear previous game state
  clearInterval(timerInterval);
  gameBoard.innerHTML = '';
  grid = [];
  mines = [];
  revealed = [];
  flagged = [];
  gameStarted = false;
  gameOver = false;
  gameWon = false;
  startTime = 0;
  currentTime = 0;
  replayData = '';
  clickTimes = [];
  
  // Update timer display
  timerElement.textContent = '0.0';
  
  // Hide game over/win messages
  gameOverElement.classList.add('hidden');
  gameWinElement.classList.add('hidden');
  scoreFormElement.classList.add('hidden');
  
  // Check if user has already played today
  checkIfAlreadyPlayed();
  
  // Generate a random seed for each game instead of using a daily seed
  try {
    // Generate a new random seed for each game
    seed = generateSeed(16);
    
    // Initialize the ISAAC CSPRNG with the seed
    rng = new IsaacCSPRNG(seed);
    
    // Create game grid
    createGameGrid();
    
    // Place mines
    placeMines();
    
    // Update mines count display
    minesCountElement.textContent = MINE_COUNT - flagged.length;
    
    // Set up event listeners
    resetGameButton.addEventListener('click', initGame);
    saveScoreButton.addEventListener('click', saveScore);
    
    // Load leaderboard
    loadLeaderboard();
  } catch (error) {
    console.error('Error initializing game:', error);
  }
}

// This function is now a placeholder since we allow multiple submissions
function checkIfAlreadyPlayed() {
  // Always hide the "already played" message since multiple submissions are allowed
  alreadyPlayedElement.classList.add('hidden');
  
  // Always return false to allow multiple submissions
  return false;
}

// Create the game grid
function createGameGrid() {
  // Initialize grid arrays
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    revealed[y] = [];
    flagged[y] = [];
    
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = 0;
      revealed[y][x] = false;
      flagged[y][x] = false;
    }
  }
  
  // Create the visual grid
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement('div');
      cell.classList.add('game-cell');
      cell.id = `cell-${x}-${y}`;
      cell.dataset.x = x;
      cell.dataset.y = y;
      
      // Add event listeners
      cell.addEventListener('click', () => handleCellClick(x, y));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleCellRightClick(x, y);
      });
      
      gameBoard.appendChild(cell);
    }
  }
  
  // Set the grid template
  gameBoard.style.display = 'grid';
  gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
  gameBoard.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`;
}

// Place mines on the grid
function placeMines() {
  // Reset mines array
  mines = [];
  
  // Place mines randomly using the ISAAC CSPRNG
  let minesPlaced = 0;
  while (minesPlaced < MINE_COUNT) {
    const x = Math.floor(rng.random() * GRID_SIZE);
    const y = Math.floor(rng.random() * GRID_SIZE);
    
    // Check if mine already exists at this position
    if (!mines.some(mine => mine.x === x && mine.y === y)) {
      mines.push({ x, y });
      grid[y][x] = -1; // -1 represents a mine
      minesPlaced++;
    }
  }
  
  // Calculate numbers for adjacent cells
  for (const mine of mines) {
    const { x, y } = mine;
    
    // Check all 8 adjacent cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip the mine itself
        
        const nx = x + dx;
        const ny = y + dy;
        
        // Check if the adjacent cell is within the grid
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          // Only increment if it's not a mine
          if (grid[ny][nx] !== -1) {
            grid[ny][nx]++;
          }
        }
      }
    }
  }
}

// Handle left click on a cell
function handleCellClick(x, y) {
  // Ignore clicks if game is over or cell is flagged
  if (gameOver || gameWon || flagged[y][x]) return;
  
  // Start the game on first click
  if (!gameStarted) {
    startGame();
  }
  
  // Record the click in replay data with timestamp
  const clickTime = (Date.now() - startTime) / 1000;
  clickTimes.push({ x, y, time: clickTime });
  
  // Add to replay data: cellIndex-timeInSeconds
  const cellIndex = y * GRID_SIZE + x;
  if (replayData.length > 0) {
    replayData += '-';
  }
  replayData += `${cellIndex}-${clickTime.toFixed(1)}`;
  
  // Check if clicked on a mine
  if (grid[y][x] === -1) {
    // Game over
    revealCell(x, y);
    revealAllMines();
    endGame(false);
    return;
  }
  
  // Reveal the cell
  revealCell(x, y);
  
  // If the cell has no adjacent mines, reveal adjacent cells
  if (grid[y][x] === 0) {
    revealAdjacentCells(x, y);
  }
  
  // Check if the game is won
  checkWinCondition();
}

// Handle right click on a cell (flag)
function handleCellRightClick(x, y) {
  // Ignore clicks if game is over or cell is revealed
  if (gameOver || gameWon || revealed[y][x]) return;
  
  // Start the game on first click
  if (!gameStarted) {
    startGame();
  }
  
  // Toggle flag
  flagged[y][x] = !flagged[y][x];
  
  // Update cell appearance
  const cell = document.getElementById(`cell-${x}-${y}`);
  if (flagged[y][x]) {
    cell.classList.add('flagged');
    cell.textContent = '🚩';
  } else {
    cell.classList.remove('flagged');
    cell.textContent = '';
  }
  
  // Update mines count display
  minesCountElement.textContent = MINE_COUNT - document.querySelectorAll('.flagged').length;
  
  // Record the flag in replay data with timestamp
  const clickTime = (Date.now() - startTime) / 1000;
  const cellIndex = y * GRID_SIZE + x;
  if (replayData.length > 0) {
    replayData += '-';
  }
  replayData += `f${cellIndex}-${clickTime.toFixed(1)}`; // 'f' prefix for flag actions
}

// Reveal a cell
function revealCell(x, y) {
  // Ignore if already revealed
  if (revealed[y][x]) return;
  
  // Mark as revealed
  revealed[y][x] = true;
  
  // Update cell appearance
  const cell = document.getElementById(`cell-${x}-${y}`);
  cell.classList.add('revealed');
  
  // Remove flag if present
  if (flagged[y][x]) {
    flagged[y][x] = false;
    cell.classList.remove('flagged');
    minesCountElement.textContent = MINE_COUNT - document.querySelectorAll('.flagged').length;
  }
  
  // Show content based on cell value
  if (grid[y][x] === -1) {
    // Mine
    cell.classList.add('mine');
    cell.textContent = '💣';
  } else if (grid[y][x] > 0) {
    // Number
    cell.textContent = grid[y][x];
    cell.classList.add(`color-${grid[y][x]}`);
  }
}

// Reveal adjacent cells (for empty cells)
function revealAdjacentCells(x, y) {
  // Check all 8 adjacent cells
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue; // Skip the cell itself
      
      const nx = x + dx;
      const ny = y + dy;
      
      // Check if the adjacent cell is within the grid and not revealed
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !revealed[ny][nx]) {
        revealCell(nx, ny);
        
        // Recursively reveal adjacent cells if this is also an empty cell
        if (grid[ny][nx] === 0) {
          revealAdjacentCells(nx, ny);
        }
      }
    }
  }
}

// Reveal all mines (when game is over)
function revealAllMines() {
  for (const mine of mines) {
    const { x, y } = mine;
    
    // Reveal the mine
    const cell = document.getElementById(`cell-${x}-${y}`);
    cell.classList.add('revealed');
    cell.classList.add('mine');
    cell.textContent = '💣';
    
    // Mark incorrectly flagged cells
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (flagged[y][x] && grid[y][x] !== -1) {
          const flaggedCell = document.getElementById(`cell-${x}-${y}`);
          flaggedCell.textContent = '❌';
        }
      }
    }
  }
}

// Start the game
function startGame() {
  gameStarted = true;
  startTime = Date.now();
  
  // Start the timer
  timerInterval = setInterval(() => {
    currentTime = (Date.now() - startTime) / 1000;
    timerElement.textContent = currentTime.toFixed(1);
  }, 100);
}

// End the game
function endGame(isWin) {
  gameOver = true;
  gameWon = isWin;
  clearInterval(timerInterval);
  
  if (isWin) {
    // Show win message
    gameWinElement.classList.remove('hidden');
    finalTimeElement.textContent = currentTime.toFixed(1);
    
    // Show score form if not already played today
    if (!checkIfAlreadyPlayed()) {
      scoreFormElement.classList.remove('hidden');
    }
  } else {
    // Show game over message
    gameOverElement.classList.remove('hidden');
  }
}

// Check if the game is won
function checkWinCondition() {
  // Game is won if all non-mine cells are revealed
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // If a non-mine cell is not revealed, game is not won yet
      if (grid[y][x] !== -1 && !revealed[y][x]) {
        return;
      }
    }
  }
  
  // If we get here, all non-mine cells are revealed
  endGame(true);
}

// Save score to the leaderboard
async function saveScore() {
  const username = usernameInput.value.trim();
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  // No need to check if already played since multiple submissions are allowed
  
  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        time: parseFloat(currentTime.toFixed(1)),
        seed,
        replayData
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Hide score form after submission
      scoreFormElement.classList.add('hidden');
      
      // Show a success message
      alert('Score submitted successfully!');
      
      // Reload leaderboard
      loadLeaderboard();
    } else {
      alert(`Error: ${data.error || 'Failed to save score'}`); 
    }
  } catch (error) {
    console.error('Error saving score:', error);
    alert('Failed to save score. Please try again.');
  }
}

// Load leaderboard from the server
async function loadLeaderboard() {
  try {
    const response = await fetch('/api/scores');
    const scores = await response.json();
    
    const leaderboardElement = document.getElementById('leaderboard');
    leaderboardElement.innerHTML = '';
    
    if (scores.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" class="py-3 px-6 text-center">No scores yet today</td>`;
      leaderboardElement.appendChild(row);
      return;
    }
    
    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-3 px-6">${index + 1}</td>
        <td class="py-3 px-6">${score.username}</td>
        <td class="py-3 px-6">${score.time.toFixed(1)}s</td>
        <td class="py-3 px-6">
          <a href="/replay/${score.username}" class="text-blue-500 hover:underline">Watch</a>
        </td>
      `;
      leaderboardElement.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// Generate a random seed
function generateSeed(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);