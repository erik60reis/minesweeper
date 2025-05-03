const express = require('express');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up database connection
let sequelize;

if (process.env.DB_TYPE === 'mysql') {
  // MySQL configuration
  sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE,
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    logging: false
  });
  console.log('Using MySQL database');
} else {
  // SQLite configuration (default)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, process.env.SQLITE_STORAGE || 'database.sqlite'),
    logging: false
  });
  console.log('Using SQLite database');
}

// Define Score model for Minesweeper
const Score = sequelize.define('Score', {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  time: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  seed: {
    type: DataTypes.STRING,
    allowNull: false
  },
  replayData: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Function to generate daily seed
function generateDailySeed() {
  const date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  let result = btoa(date);
  
  return result;
}

// Global variable to store the daily seed
let dailySeed = generateDailySeed();

// Function to check if we need to reset the seed and scores
function checkAndResetDaily() {
  const now = new Date();
  
  // If it's midnight (0:00), generate a new seed and clear scores
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    console.log('Midnight reset: Generating new seed and clearing scores');
    dailySeed = generateDailySeed();
    
    // Clear all scores from today
    Score.destroy({
      where: {
        createdAt: {
          [Sequelize.Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }
      }
    }).then(count => {
      console.log(`Cleared ${count} scores from today`);
    }).catch(err => {
      console.error('Error clearing scores:', err);
    });
  }
}

// Check for reset every minute
setInterval(checkAndResetDaily, 60000);

// Initial check on server start
checkAndResetDaily();

// Sync database
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Routes
app.get('/', (req, res) => {
  res.render('game', { dailySeed });
});

app.get('/replay/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const userScore = await Score.findOne({ where: { username } });
    
    if (!userScore) {
      return res.status(404).render('error', { message: 'User not found' });
    }
    
    res.render('replay', { 
      username: userScore.username,
      time: userScore.time,
      seed: userScore.seed,
      replayData: userScore.replayData
    });
  } catch (error) {
    console.error('Error fetching replay:', error);
    res.status(500).render('error', { message: 'Server error' });
  }
});

// API routes
app.get('/api/scores', async (req, res) => {
  try {
    const scores = await Score.findAll({
      order: [['time', 'ASC']], // Sort by time ascending (faster times are better)
      limit: 10
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/seed', (req, res) => {
  res.json({ seed: dailySeed });
});

app.post('/api/scores', async (req, res) => {
  try {
    const { username, time, seed, replayData } = req.body;
    
    // Check if user already has a score today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingScore = await Score.findOne({ 
      where: { 
        username,
        createdAt: {
          [Sequelize.Op.gte]: today
        }
      } 
    });
    
    if (existingScore) {
      return res.status(400).json({ error: 'You have already submitted a score today' });
    }
    
    // Create new score
    const newScore = await Score.create({ 
      username, 
      time, 
      seed, 
      replayData,
      date: new Date()
    });
    
    res.status(201).json(newScore);
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Minesweeper server running on http://localhost:${PORT}`);
});