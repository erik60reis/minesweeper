# Minesweeper Game

A 10x10 Minesweeper game with daily challenges, leaderboard, and replay functionality.

## Features

- 10x10 grid with mines
- Daily seed that resets at midnight (same mine layout for all players each day)
- Replay system that records clicks and timing
- Leaderboard sorted by completion time
- Players can only submit one score per day
- Replay viewer to watch how others completed the game

## How to Play

1. Left-click to reveal a cell
2. Right-click to flag a potential mine
3. Reveal all non-mine cells to win
4. If you hit a mine, game over!
5. After winning, enter your username to save your score

## Technical Details

- The game uses a deterministic random number generator (ISAAC CSPRNG) with a daily seed
- Replays store the cell index and time of each click (e.g., "16-0.1-17-0.2-20-1.8")
- All replays and the daily seed reset at midnight
- Players are prevented from submitting multiple scores in a single day

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3001`

## Development

For development with auto-restart:
```
npm run dev
```

## Database

The game uses SQLite by default. To use MySQL instead, update the `.env` file with your MySQL credentials and set `DB_TYPE=mysql`.