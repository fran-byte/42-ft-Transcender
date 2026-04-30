# Blackjack Transcender - Project Documentation

## Overview

Full-stack multiplayer Blackjack game built for the 42 ft-transcender project. Features real-time gameplay via WebSockets, user authentication with JWT cookies, PostgreSQL database, Docker-based deployment, and AI opponent powered by a DQN model trained with NumPy.

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 |
| Backend | Node.js + Express 5 + nodemon |
| Database | PostgreSQL 15 |
| Real-time | Socket.io 4.8 |
| Auth | JWT (httpOnly cookies) |
| ML Service | Python 3.12 + Flask + NumPy + Gunicorn |
| Deployment | Docker Compose + Nginx |

### Services (Docker)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │───▶│  Frontend   │───▶│   Backend   │
│ :8080/:8443 │    │   :5173     │    │   :3000     │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              ┌──────────┐       ┌────────────┐
                              │PostgreSQL│       │ ML Service │
                              │  :5432   │       │   :5000    │
                              └──────────┘       └────────────┘
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
games_lost    INTEGER DEFAULT 0
games_pushed  INTEGER DEFAULT 0
blackjacks    INTEGER DEFAULT 0
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `game_history` Table
```sql
id           SERIAL PRIMARY KEY
user_id      INT REFERENCES users(id)
room_id      VARCHAR(50)
room_name    VARCHAR(100)
result       VARCHAR(20)
bet          DECIMAL(10,2)
player_score INTEGER
dealer_score INTEGER
chips_after  DECIMAL(10,2)
played_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
| GET | `/balance` | JWT | Get current balance from DB |
| POST | `/balance` | JWT | Deposit/withdraw (body: `{ amount, type }`) |
| GET | `/stats` | JWT | Get player statistics |
| POST | `/stats` | JWT | Update player statistics |
| GET | `/history` | JWT | Last 5 game history entries |
| GET | `/leaderboard` | JWT | Top 3 players by balance |

### WebSocket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `game_update` | `{gameState}` | Full game state broadcast |
| `lobby_state` | `[{roomId, playersCount, ...}]` | Lobby rooms info |
| `join_result` | `{role, success, roomConfig, ...}` | Join confirmation |
| `bet_error` | `{message, minBet, maxBet, chips}` | Bet rejected details |
| `add_ai_result` | `{success, reason, player}` | Result of adding AI player |
| `remove_ai_result` | `{success, reason}` | Result of removing AI player |

### WebSocket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_game` | `{roomId, user, preferredRole}` | Join a table |
| `start_round` | `roomId` | Host starts round (all bets required) |
| `place_bet` | `{roomId, amount}` | Add chips to bet |
| `clear_bet` | `roomId` | Clear current bet (refunds chips) |
| `action_hit` | `roomId` | Request a card |
| `action_stand` | `roomId` | End turn |
| `reset_round` | `roomId` | Host resets for next round |
| `sync_wallet_balance` | `{roomId, userId, balance}` | Sync in-game chips after deposit/withdraw |
| `add_ai_player` | `{roomId, botId, botName}` | Add AI opponent to table |
| `remove_ai_player` | `{roomId, botId}` | Remove AI opponent from table |
| `get_lobby_state` | — | Request current lobby state |

---

## Game Logic

### BlackjackGame Class (`backend/game/BlackjackGame.js`)

**Constructor:**
```javascript
new BlackjackGame(id, emitUpdate, config, onAITurn, syncBalance)
```
- `onAITurn(botId, botPlayer, dealerVisibleCard)` — callback fired when it's an AI player's turn
- `syncBalance` — removed from `placeBet`; balance is authoritative in-memory during a session

**Key Properties:**
- `id`: Room identifier
- `maxPlayers`, `minBet`, `maxBet`, `roomName`, `mode`
- `deck`: 6-deck shoe (312 cards, `Deck.js`)
- `players`: `{ [userId]: playerObject }`
- `playerOrder`: Array of active player IDs
- `spectators`: Array of spectator objects
- `dealerHand`: Dealer's cards
- `gameState`: `"waiting" | "playing" | "finished"`
- `turn`: Current player userId or `"dealer"`
- `onAITurn`: Callback for AI decision-making
- `syncBalance`: Stored but not used during betting (balance is in-memory during session)

**Player Object:**
```javascript
{
  id, username, avatar, socketId,
  hand: [{value, suit}],
  score: number,
  status: "waiting" | "playing" | "blackjack" | "busted" | "stood",
  result: "win" | "lose" | "push" | null,
  bet: number,
  chips: number,       // authoritative in-memory balance
  isDisconnected: boolean,
  isAI: boolean,
  isSpectator: boolean,
  socketIds: Set        // supports multiple tabs
}
```

**Key Methods:**
- `addPlayer(userId, socketId, username, avatar, preferredRole, chips)` — join table
- `addAIPlayer(botId, botName)` — add AI opponent
- `removeAIPlayer(botId)` — remove AI opponent
- `removePlayer(userId, socketId)` — handle disconnect
- `placeBet(userId, amount)` — place wager (in-memory only, no DB sync per-bet)
- `clearBet(userId)` — refund bet to chips
- `canStartRound()` — check all players have valid bets
- `startRound(requestingUserId)` — deal cards, begin gameplay
- `hit(userId)` — draw a card
- `stand(userId)` — end turn
- `playDealerTurn()` — dealer plays (hit on <17)
- `resolveWinners()` — calculate win/lose/push results and update `player.chips`
- `getPublicState()` — sanitized state for clients
- `resetRound()` — prepare for next round (resets hands/bets, promotes spectators)
- `getTrueCount()` — Hi-Lo card counting using remaining deck cards
- `calculateAdvantage()` — player advantage based on true count
- `calculateKellyBet(userId)` — Kelly Criterion bet sizing
- `aiPlaceBets()` — auto-bet for AI players using Kelly Criterion

**Balance flow:**
1. On `join_game`: `player.chips` is loaded from DB balance
2. During game: `player.chips` updated in-memory (bets, wins, losses)
3. On `finished`: `persistFinishedGame()` writes `player.chips` to DB **before** `emitUpdate`
4. Frontend reads `myPlayer.chips` from `game_update` — no separate API call needed
5. Wallet deposit/withdraw: updates DB via REST, then emits `sync_wallet_balance` → server updates `player.chips` in-memory

**Special Behaviors:**
- AI opponents auto-bet using Kelly Criterion before round start
- AI players removed when chips reach 0
- Auto-promote spectators to players when seats open
- 15-second turn timer (auto-stand on timeout)
- 20-second disconnect grace period

---

## ML Service

### Overview

Python microservice (`python:3.12-slim`) serving a DQN model trained with NumPy. Runs via Gunicorn in production.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + model load status |
| `/predict` | POST | Get AI decision (hit/stand) |

### Predict Request/Response

**Request:**
```json
{
  "player_score": 15,
  "dealer_visible": 9,
  "usable_ace": false,
  "true_count": 2
}
```

**Response:**
```json
{
  "action": "hit",
  "confidence": 0.73,
  "player_score": 15,
  "dealer_visible": 9,
  "usable_ace": false,
  "true_count": 2
}
```

### DQN Architecture
```
Input: 4 neurons (player_score, dealer_visible, usable_ace, true_count)
    ↓ ReLU
Dense: 32 neurons
    ↓ ReLU
Dense: 32 neurons
    ↓ Softmax
Output: 2 neurons (Q-hit, Q-stand)
```

Model stored as `ml_service/train/blackjack_dqn.npz`. Trained on 500K states using basic strategy as ground truth.

---

## Frontend Structure

### Pages (`frontend/src/pages/`)

- **Home.jsx** — Landing page
- **Login.jsx** — User login form
- **Register.jsx** — User registration form
- **Profile.jsx** — User stats, game history, leaderboard, logout
- **Lobby.jsx** — Table selection carousel (6 hardcoded tables)
- **Game.jsx** — Main blackjack table UI (1200+ lines, candidate for splitting)
- **Terms.jsx**, **Privacy.jsx** — Static pages

### Components (`frontend/src/components/`)

- **Navbar.jsx** — Navigation header
- **Footer.jsx** — Site footer
- **Card.jsx** — 3D card rendering with flip animation
- **ProtectedRoute.jsx** — Route guard (checks localStorage `username`/`email`)

### State Management

- Auth: JWT via httpOnly cookies + localStorage cache (`user`, `username`, `email`, `isLoggedIn`)
- Game state: Socket.io events → React useState
- Balance: `myPlayer.chips` from game state is source of truth; synced to `balance` state via `syncBalance()`
- Stats: fetched from backend on load, updated optimistically in frontend after each round

### Known Limitations / Not Implemented

- Double Down — button exists in UI but backend not implemented
- `frontend/src/services/socket.js` — empty placeholder file
- Route protection is client-side only (localStorage check)

---

## Key Files

```
backend/
├── server.js                    # Express + Socket.io entry, room management, game events
├── routes/auth.js               # Auth route definitions
├── controllers/authController.js # Auth + balance + stats + history + leaderboard
├── middleware/authMiddleware.js  # JWT verification
├── dj.js                        # Separate DB pool (candidate for consolidation)
└── game/
    ├── BlackjackGame.js         # Core game logic (players, deck, rounds, AI)
    └── Deck.js                  # 6-deck shoe with Fisher-Yates shuffle

ml_service/
├── app.py                       # Flask API (/health, /predict), DQN inference
├── requirements.txt             # flask==3.0.0, gunicorn==21.2.0, numpy==1.26.4
├── Dockerfile                   # python:3.12-slim, gunicorn CMD
└── train/
    ├── train.py                 # NumPy DQN training script
    └── blackjack_dqn.npz       # Trained model weights

frontend/
├── src/
│   ├── App.jsx                  # React Router setup
│   ├── main.jsx                 # Entry point
│   ├── socket.js                # Socket.io client (SOCKET_URL hardcoded to "")
│   ├── pages/                   # Route components
│   ├── components/              # Reusable UI
│   └── styles/                  # CSS files
└── vite.config.js               # Proxy to backend:3000, allowedHosts: blackjack.local

database/
└── init.sql                     # Schema + seed data

requirements/nginx/conf.d/
├── app.conf                     # Primary nginx config (routes /, /api, /socket.io, /ml)
└── blackjack.conf               # Alt config (missing /ml route, no HTTPS)

docker-compose.yml               # 5 services: backend, frontend, nginx, ml-service, db
Makefile                         # make up/down/logs/re/fclean/ps/prune
```

---

## Development Commands

```bash
make up       # Build & start all containers
make logs     # Stream logs
make stop     # Pause containers
make down     # Stop & remove containers (keeps DB data)
make fclean   # Full reset including DB volume
make re       # fclean + up
make ps       # Container status
make prune    # Docker cleanup
```

Access: `https://blackjack.local:8443` or `http://localhost:8080`
Add `127.0.0.1 blackjack.local` to `/etc/hosts` if needed.

---

## Environment Variables (`.env`)

```
POSTGRES_USER=blackjack_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=blackjack_db
DB_HOST=db
JWT_SECRET=your_jwt_secret_here   # generate: openssl rand -hex 32
DATA_PATH=./data
REACT_APP_API_URL=...             # defined but not used in code (hardcoded "")
VITE_WS_URL=...                   # defined but not used in code (hardcoded "")
VITE_API_URL=...                  # defined but not used in code (hardcoded "")
```

---

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT stored in httpOnly cookies (XSS protected), 7-day expiry
- CORS restricted to `https://blackjack.local`
- SameSite=strict on cookies
- Parameterized SQL queries (no injection risk)
- ML service internal only (not exposed to internet in production)

## Known Security Issues (pending fix)

- JWT_SECRET has insecure hardcoded fallback in `authController.js` and `authMiddleware.js`
- Route protection in frontend is localStorage-only (bypasseable)
- No rate limiting on API or Socket.io events
- Nginx missing security headers (CSP, X-Frame-Options, etc.)
- Sensitive user data stored in localStorage
- `VITE_API_URL` / `VITE_WS_URL` env vars defined but ignored in code

---

## Rooms Configuration

Defined in `backend/server.js` (`ROOM_CONFIGS`):

| Room ID | Name | Max Players | Min Bet | Max Bet | Mode |
|---------|------|-------------|---------|---------|------|
| `solo-table` | Solo Table | 1 | $5 | $200 | Solo |
| `gold-room` | Golden Table | 2 | $10 | $1000 | Versus |
| `emerald-room` | Emerald Room | 4 | $5 | $500 | Multiplayer |
| `royal-room` | Royal Lounge | 4 | $25 | $2000 | Multiplayer |
| `diamond-room` | Diamond Room | 5 | $35 | $3500 | Multiplayer |
| `velvet-room` | Velvet Room | 6 | $10 | $1000 | Multiplayer |
