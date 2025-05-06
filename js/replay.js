// Game constants
const GRID_SIZE = 10;
const CELL_SIZE = 30;
const MINE_COUNT = 12; // Must match the value in game.js
const REPLAY_SPEED = 500; // milliseconds

// Game variables
let grid = [];
let mines = [];
let revealed = [];
let flagged = [];
let replayInterval;
let currentMoveIndex = 0;
let isPaused = true;
let parsedReplayData = [];
let currentReplayTime = 0;

// DOM elements
const gameBoard = document.getElementById('game-board');
const playPauseButton = document.getElementById('play-pause');
const restartButton = document.getElementById('restart');
const currentMoveElement = document.getElementById('current-move');
const totalMovesElement = document.getElementById('total-moves');
const elapsedTimeElement = document.getElementById('elapsed-time');

// Initialize the replay
function initReplay() {
  // Clear previous game state
  clearInterval(replayInterval);
  gameBoard.innerHTML = '';
  grid = [];
  mines = [];
  revealed = [];
  flagged = [];
  currentMoveIndex = 0;
  isPaused = true;
  currentReplayTime = 0;
  
  // Update play/pause button
  playPauseButton.textContent = 'Play';
  
  // Make sure we're using the exact same seed from the original game
  console.log('Using seed for replay:', gameSeed);
  rng = new IsaacCSPRNG(gameSeed);
  
  // Parse the replay data
  parseReplayData();
  
  // Create game grid
  createGameGrid();
  
  // Place mines - this must match the original game exactly
  placeMines();
  
  // Update move counter
  currentMoveElement.textContent = '0';
  totalMovesElement.textContent = parsedReplayData.length;
  elapsedTimeElement.textContent = '0.0';
  
  // Set up event listeners
  playPauseButton.addEventListener('click', togglePlayPause);
  restartButton.addEventListener('click', initReplay);
  
  console.log('Replay initialized with seed:', gameSeed);
  console.log('Replay data length:', parsedReplayData.length);
  console.log('Mine positions:', mines.map(m => `(${m.x},${m.y})`).join(', '));
}

// Parse the replay data string into an array of moves with timestamps
function parseReplayData() {
  parsedReplayData = [];
  
  if (!replayData) return;
  
  const moves = replayData.split('-');
  
  for (let i = 0; i < moves.length; i += 2) {
    const cellOrAction = moves[i];
    const time = parseFloat(moves[i + 1]);
    
    // Check if it's a flag action (starts with 'f')
    if (cellOrAction.startsWith('f')) {
      const cellIndex = parseInt(cellOrAction.substring(1));
      const x = cellIndex % GRID_SIZE;
      const y = Math.floor(cellIndex / GRID_SIZE);
      
      parsedReplayData.push({
        type: 'flag',
        x,
        y,
        time
      });
    } else {
      // Regular click
      const cellIndex = parseInt(cellOrAction);
      const x = cellIndex % GRID_SIZE;
      const y = Math.floor(cellIndex / GRID_SIZE);
      
      parsedReplayData.push({
        type: 'click',
        x,
        y,
        time
      });
    }
  }
  
  // Sort by time just to be safe
  parsedReplayData.sort((a, b) => a.time - b.time);
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

// Toggle play/pause
function togglePlayPause() {
  isPaused = !isPaused;
  
  if (isPaused) {
    clearInterval(replayInterval);
    playPauseButton.textContent = 'Play';
  } else {
    playPauseButton.textContent = 'Pause';
    replayInterval = setInterval(replayNextMove, REPLAY_SPEED);
  }
}

// Replay the next move
function replayNextMove() {
  if (currentMoveIndex >= parsedReplayData.length) {
    // End of replay
    clearInterval(replayInterval);
    isPaused = true;
    playPauseButton.textContent = 'Play';
    return;
  }
  
  // Get the next move from replay data
  const move = parsedReplayData[currentMoveIndex];
  
  // Remove highlight from all cells
  document.querySelectorAll('.highlight').forEach(cell => {
    cell.classList.remove('highlight');
  });
  
  // Update elapsed time display
  currentReplayTime = move.time;
  elapsedTimeElement.textContent = currentReplayTime.toFixed(1);
  
  // Highlight the current cell
  const cell = document.getElementById(`cell-${move.x}-${move.y}`);
  if (cell) {
    cell.classList.add('highlight');
  }
  
  if (move.type === 'click') {
    // Handle click
    if (grid[move.y][move.x] === -1) {
      // Clicked on a mine
      revealCell(move.x, move.y);
      revealAllMines();
      clearInterval(replayInterval);
      isPaused = true;
      playPauseButton.textContent = 'Play';
    } else {
      // Reveal the cell
      revealCell(move.x, move.y);
      
      // If the cell has no adjacent mines, reveal adjacent cells
      if (grid[move.y][move.x] === 0) {
        revealAdjacentCells(move.x, move.y);
      }
    }
  } else if (move.type === 'flag') {
    // Handle flag
    toggleFlag(move.x, move.y);
  }
  
  // Update move counter
  currentMoveIndex++;
  currentMoveElement.textContent = currentMoveIndex;
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

// Toggle flag on a cell
function toggleFlag(x, y) {
  // Ignore if already revealed
  if (revealed[y][x]) return;
  
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

// Initialize the replay when the page loads
window.addEventListener('DOMContentLoaded', initReplay);