# Blackjack Transcender - Project Documentation

## Overview

Full-stack multiplayer Blackjack game built for the 42 ft-transcender project. Features real-time gameplay via WebSockets, user authentication with JWT cookies, PostgreSQL database, Docker-based deployment, and AI opponent powered by machine learning.

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL 15 |
| Real-time | Socket.io 4.8 |
| Auth | JWT (httpOnly cookies) |
| ML Service | Python 3.13 + Flask + TensorFlow |
| Deployment | Docker Compose + Nginx |

### Services (Docker)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │───▶│  Frontend   │───▶│   Backend   │
│   :8080     │    │   :5173     │    │   :3000     │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  PostgreSQL │
                                        │   :5432     │
                                        └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ ML Service  │
                                        │   :5000     │
                                        └─────────────┘
```

---

## Database Schema

### `users` Table
```sql
id            SERIAL PRIMARY KEY
username      VARCHAR(50) UNIQUE NOT NULL
email         VARCHAR(100) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
balance       DECIMAL(10,2) DEFAULT 1000.00
games_played  INTEGER DEFAULT 0
games_won     INTEGER DEFAULT 0
games_lost     INTEGER DEFAULT 0
games_pushed   INTEGER DEFAULT 0
blackjacks    INTEGER DEFAULT 0
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `game_history` Table
```sql
id          SERIAL PRIMARY KEY
user_id     INT REFERENCES users(id)
result      VARCHAR(20)
amount_won  DECIMAL(10,2)
game_data   JSONB
played_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## Backend API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register new user, returns JWT in httpOnly cookie |
| POST | `/login` | Public | Login, returns JWT in httpOnly cookie |
| POST | `/logout` | Public | Clear JWT cookie |
| GET | `/verify` | JWT | Verify token, return user data |
| GET | `/balance` | JWT | Get current balance |
| POST | `/balance` | JWT | Deposit/withdraw (body: `{ amount, type }`) |
| GET | `/stats` | JWT | Get player statistics |
| POST | `/stats` | JWT | Update player statistics |

### WebSocket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `game_update` | `{gameState}` | Full game state broadcast |
| `lobby_state` | `[{roomId, playersCount, ...}]` | Lobby rooms info |
| `join_result` | `{role, success, ...}` | Join confirmation |
| `add_ai_result` | `{success, reason, player}` | Result of adding AI player |
| `remove_ai_result` | `{success, reason}` | Result of removing AI player |

### WebSocket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_game` | `{roomId, user, maxPlayers, preferredRole}` | Join a table |
| `start_round` | `roomId` | Host starts round (all bets required) |
| `place_bet` | `{roomId, amount}` | Place a bet |
| `clear_bet` | `roomId` | Clear current bet |
| `action_hit` | `roomId` | Request a card |
| `action_stand` | `roomId` | End turn |
| `reset_round` | `roomId` | Host resets for next round |
| `add_ai_player` | `{roomId, botId, botName}` | Add AI opponent to table |
| `remove_ai_player` | `{roomId, botId}` | Remove AI opponent from table |

---

## Game Logic

### BlackjackGame Class (`backend/game/BlackjackGame.js`)

**Key Properties:**
- `id`: Room identifier
- `maxPlayers`: Maximum players (default 6)
- `deck`: 6-deck shoe (312 cards)
- `players`: Map of userId → player object
- `playerOrder`: Array of active player IDs
- `spectators`: Array of spectator objects
- `dealerHand`: Dealer's cards
- `gameState`: `"waiting" | "playing" | "finished"`
- `turn`: Current player userId or `"dealer"`
- `onAITurn`: Callback function for AI decision-making
- `syncBalance`: Callback function for syncing balance with database

**Player Object:**
```javascript
{
  id, username, avatar, socketId,
  hand: [{value, suit}],
  score: number,
  status: "waiting" | "playing" | "blackjack" | "busted" | "stood",
  result: "win" | "lose" | "push" | null,
  bet: number,
  chips: number,
  isDisconnected: boolean,
  isAI: boolean,          // NEW: AI opponent flag
  isSpectator: boolean
}
```

**Key Methods:**
- `addPlayer(userId, socketId, username, avatar, preferredRole)` - Join table
- `addAIPlayer(botId, botName)` - Add AI opponent to table
- `removeAIPlayer(botId)` - Remove AI opponent from table
- `removePlayer(userId, socketId)` - Handle disconnect
- `placeBet(userId, amount)` - Place wager (async, syncs with DB)
- `clearBet(userId)` - Clear current bet
- `canStartRound()` - Check if all players have bets
- `startRound(requestingUserId)` - Deal cards, start gameplay
- `hit(userId)` - Draw a card
- `stand(userId)` - End turn
- `playDealerTurn()` - Dealer plays (hit on <17)
- `resolveWinners()` - Calculate results
- `getPublicState()` - Return sanitized state for clients
- `resetRound()` - Prepare for next round
- `calculateKellyBet(userId)` - Calculate bet using Kelly Criterion
- `aiPlaceBets()` - Automatically place bets for AI players
- `calculateAdvantage()` - Calculate player advantage using Hi-Lo system
- `getDeckInfo()` - Get remaining cards in deck

**Kelly Criterion Implementation:**
- Uses Quarter-Kelly fraction (0.25) for conservative betting
- Base advantage: -0.005 (house edge)
- Hi-Lo card counting for true count calculation
- Bet sizing: `minBet <= KellyBet <= maxBet`

**Special Behaviors:**
- AI opponents auto-bet when round starts
- AI players are automatically removed when out of chips
- Auto-promote spectators to players when seats open
- 15-second turn timer (auto-stand on timeout)
- 20-second disconnect grace period
- Skip players with 21 natural on turn start

---

## ML Service

### Overview

Python microservice for AI decision-making in Blackjack. Provides predictions for hit/stand decisions and can be extended with trained DQN models.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Get AI decision (hit/stand) |

### Predict Request/Response

**Request:**
```json
{
  "player_hand": [{"value": "K", "suit": "hearts"}],
  "dealer_visible": {"value": "5", "suit": "hearts"},
  "player_score": 10
}
```

**Response:**
```json
{
  "action": "hit",
  "confidence": 0.5,
  "player_score": 10,
  "dealer_visible": {"value": "5", "suit": "hearts"}
}
```

### Future: DQN Training

The ML service is designed to integrate with a trained DQN model for better decision-making:

- **Input**: (player_score, dealer_visible, usable_ace)
- **Output**: Q(hit), Q(stand)
- **Architecture**: 3-layer dense network (32→32→2)
- **Training**: Q-learning with experience replay

---

## Frontend Structure

### Pages (`frontend/src/pages/`)

- **Home.jsx** - Landing page
- **Login.jsx** - User login form
- **Register.jsx** - User registration form
- **Profile.jsx** - User stats and logout
- **Lobby.jsx** - Table selection carousel
- **Game.jsx** - Main blackjack table UI

### Components (`frontend/src/components/`)

- **Navbar.jsx** - Navigation header
- **Footer.jsx** - Site footer
- **Card.jsx** - 3D card rendering with flip animation
- **ProtectedRoute.jsx** - Route guard for authenticated pages

### Game UI Features

- Real-time multiplayer gameplay
- Player betting with chip animations
- AI opponent integration with "Add AI" button
- Remove AI button (for host)
- AI badge indicator
- Wallet modal for deposit/withdraw

### State Management

- Auth: JWT via httpOnly cookies + localStorage cache
- Game state: Socket.io + React useState
- Balance/stats: API calls to backend

---

## Key Files

```
backend/
├── server.js              # Express + Socket.io entry point
├── routes/auth.js        # Auth API routes
├── controllers/authController.js  # Auth logic
├── middleware/authMiddleware.js  # JWT verification
└── game/
    ├── BlackjackGame.js  # Core game logic
    └── Deck.js           # 6-deck shoe

ml_service/
├── app.py               # Flask API with /health and /predict
├── requirements.txt     # flask, gunicorn
├── Dockerfile           # Python 3.10-alpine
└── train/               # DQN training scripts (future)
    └── dqn_agent.py

frontend/
├── src/
│   ├── App.jsx          # React Router setup
│   ├── main.jsx         # Entry point
│   ├── socket.js        # Socket.io client instance
│   ├── pages/           # Route components
│   ├── components/      # Reusable UI
│   └── styles/          # CSS files
└── package.json

database/
└── init.sql             # Schema initialization

docker-compose.yml        # Service orchestration
Makefile                  # Dev commands
```

---

## Development Commands

```bash
# Start all services
make up         # or just 'make'

# View logs
make logs

# Stop services
make stop

# Full reset (including DB)
make fclean

# Rebuild and restart
make re

# Check container status
make ps
```

---

## Environment Variables (.env)

```
# Database
POSTGRES_USER=blackjack_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=blackjack_db
DB_HOST=db

# JWT Secret (genera uno seguro con: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here

# Data path for Docker volumes (no trailing slash)
DATA_PATH=./data

# Backend runs on port 3000
# Frontend runs on port 5173
# ML Service runs on port 5000
# Nginx runs on port 8080 (HTTP)
```

---

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT stored in httpOnly cookies (XSS protected)
- CORS restricted to `https://blackjack.local`
- SameSite=strict for CSRF protection
- Input validation on all endpoints

---

## Known Limitations

- Double/Split actions not implemented in backend
- No actual money or real payments
- Single table per room (not tournament mode)
- No chat between players

---

## AI Opponent Features

### Current Implementation
- DQN-trained hit/stand decision (77% accuracy)
- Kelly Criterion betting strategy
- Hi-Lo card counting for advantage calculation
- Automatic bet placement before round starts
- Automatic removal when out of chips
- Manual removal by host

### Future Enhancements
- DQN-trained model for better decisions
- Multiple difficulty levels
- Learning from player behavior

### DQN Implementation (In Progress)

#### State Representation
- **Input State**: `(player_score, dealer_upcard, usable_ace, true_count)`
- **Dimensions**: 4 input neurons
- **Example**: `(15, 9, False, 2)` → player has 15, dealer shows 9, no usable ace, true count +2

#### DQN Architecture
```
Input: 4 neurons (score, dealer_card, usableAce, trueCount)
    ↓
Dense: 32 neurons (ReLU)
    ↓
Dense: 32 neurons (ReLU)
    ↓
Output: 2 neurons (Q-hit, Q-stand)
```

#### Training Configuration
- **States generated**: 500,000
- **Framework**: NumPy (custom neural network, no external ML dependencies)
- **Model format**: NumPy (`.npz`) for production
- **Training location**: Local machine (outside Docker)

#### Pipeline
1. Generate 500K states with optimal action (basic strategy)
2. Train NumPy neural network (~5-10 min on CPU)
3. Save as `.npz` format
4. Integrate with `app.py` `/predict` endpoint

#### Files Created
```
ml_service/
├── app.py                  # Flask API with DQN model loaded
├── train/
│   └── train.py           # Training script (NumPy neural network)
│   └── blackjack_dqn.npz # Trained model (11.4 KB)
└── simulator/
    ├── __init__.py
    ├── blackjack.py       # Deck, cards, scoring
    └── basic_strategy.py  # Basic strategy lookup table
```
