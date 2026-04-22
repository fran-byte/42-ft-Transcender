# Blackjack Transcender - Project Documentation

## Overview

Full-stack multiplayer Blackjack game built for the 42 ft-transcender project. Features real-time gameplay via WebSockets, user authentication with JWT cookies, PostgreSQL database, and Docker-based deployment.

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
| Deployment | Docker Compose + Nginx |

### Services (Docker)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │───▶│  Frontend   │───▶│   Backend   │
│   :80/443   │    │   :5173     │    │   :3000     │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  PostgreSQL │
                                        │   :5432     │
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
games_lost    INTEGER DEFAULT 0
games_pushed  INTEGER DEFAULT 0
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

**Player Object:**
```javascript
{
  id, username, avatar, socketId,
  hand: [{value, suit}],
  score: number,
  status: "waiting" | "playing" | "blackjack" | "busted" | "stood",
  result: "win" | "lose" | "push" | null,
  bet: number,
  isDisconnected: boolean
}
```

**Key Methods:**
- `addPlayer(userId, socketId, username, avatar, preferredRole)` - Join table
- `removePlayer(userId, socketId)` - Handle disconnect
- `placeBet(userId, amount)` - Place wager
- `canStartRound()` - Check if all players have bets
- `startRound(requestingUserId)` - Deal cards, start gameplay
- `hit(userId)` - Draw a card
- `stand(userId)` - End turn
- `playDealerTurn()` - Dealer plays (hit on <17)
- `resolveWinners()` - Calculate results
- `getPublicState()` - Return sanitized state for clients
- `resetRound()` - Prepare for next round

**Special Behaviors:**
- Auto-promote spectators to players when seats open
- 15-second turn timer (auto-stand on timeout)
- 20-second disconnect grace period
- Skip players with 21 natural on turn start

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

### State Management

- Auth: JWT via httpOnly cookies + localStorage cache
- Game state: Socket.io + React useState
- Balance/stats: API calls to backend

---

## Key Files

```
backend/
├── server.js           # Express + Socket.io entry point
├── routes/auth.js      # Auth API routes
├── controllers/authController.js  # Auth logic
├── middleware/authMiddleware.js    # JWT verification
└── game/
    ├── BlackjackGame.js  # Core game logic
    └── Deck.js           # 6-deck shoe

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
└── init.sql            # Schema initialization

docker-compose.yml      # Service orchestration
Makefile                # Dev commands
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
POSTGRES_USER=transcendence
POSTGRES_PASSWORD=transcendence
POSTGRES_DB=transcendence
JWT_SECRET=your_secret_here
DATA_PATH=./data
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