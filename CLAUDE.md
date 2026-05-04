# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All development is Docker-based. There are no local build steps outside containers.

```bash
make up       # Build & start all 5 containers (detached)
make logs     # Stream all container logs
make stop     # Pause containers (preserves state)
make down     # Stop & remove containers (DB volume persists)
make re       # Full reset: fclean + up
make fclean   # Nuclear: removes containers, images, volumes, and ./data/postgres
make ps       # Container status
make prune    # Reclaim Docker disk space
```

Access: `https://localhost:8443` or `http://localhost:8080`  
Add `127.0.0.1 blackjack.local` to `/etc/hosts` for domain-based access.

**Frontend linting (inside container or with local Node):**
```bash
cd frontend && npm run lint
```

No test suite exists — `npm test` in backend exits with error by design.

## Environment Setup

Copy `.env` from `secrets/` or create one with:
```
POSTGRES_USER=blackjack_user
POSTGRES_PASSWORD=<password>
POSTGRES_DB=blackjack_db
DB_HOST=db
JWT_SECRET=<openssl rand -hex 32>
DATA_PATH=./data
```

SSL certs must exist at `secrets/certs/blackjack.local.crt` and `secrets/certs/blackjack.local.key`.

## Architecture

Five Docker services communicate via an internal Docker network:

```
Nginx (:8080/:8443) → Frontend (:5173) → Backend (:3000) → PostgreSQL (:5432)
                                        ↘ ML Service (:5000)
```

- **Nginx** (`requirements/nginx/conf.d/app.conf`) — reverse proxy routing `/api` and `/socket.io` to backend, `/` to frontend, `/ml` to ml-service. Note: `blackjack.conf` (currently active) is missing the `/ml` route.
- **Backend** (`backend/server.js`) — Express 5 + Socket.io. Handles room management, game events, and REST auth/stats routes. Uses `nodemon` in dev (hot reload via volume mount).
- **Frontend** (`frontend/`) — React 19 + Vite 7. Socket URL is hardcoded to `""` (same origin via Nginx proxy) in `src/socket.js`. VITE env vars are defined but unused.
- **ML Service** (`ml_service/app.py`) — Flask + Gunicorn serving a NumPy DQN model. Called from backend via HTTP (`ML_SERVICE_URL=http://ml-service:5000`).
- **PostgreSQL** — Schema initialized from `database/init.sql`. Data persisted at `./data/postgres`.

## Backend Structure

```
backend/
├── server.js                    # Entry: Express setup, Socket.io, ROOM_CONFIGS, all socket event handlers
├── routes/auth.js               # Route definitions mounting authController
├── controllers/authController.js # register/login/logout/verify/balance/stats/history/leaderboard
├── middleware/authMiddleware.js  # JWT cookie verification
├── dj.js                        # Second DB pool (duplicate of pool in authController — candidate for consolidation)
└── game/
    ├── BlackjackGame.js         # All game logic: players, deck, rounds, AI bets, turn timers
    └── Deck.js                  # 6-deck shoe (312 cards) with Fisher-Yates shuffle
```

### Game State Flow

1. Player joins → `player.chips` loaded from DB balance
2. Bets placed → in-memory only (no DB writes per bet)
3. Round finishes → `persistFinishedGame()` writes `player.chips` to DB **before** broadcasting `game_update`
4. Frontend reads `myPlayer.chips` from `game_update` socket event — no separate balance API call needed
5. Wallet deposit/withdraw → REST `/api/auth/balance` → client emits `sync_wallet_balance` → server updates `player.chips` in-memory

### Room Configs (`ROOM_CONFIGS` in `server.js`)

| Room ID | Max Players | Min/Max Bet |
|---------|-------------|-------------|
| `solo-table` | 1 | $5/$200 |
| `gold-room` | 2 | $10/$1000 |
| `emerald-room` | 4 | $5/$500 |
| `royal-room` | 4 | $25/$2000 |
| `diamond-room` | 5 | $35/$3500 |
| `velvet-room` | 6 | $10/$1000 |

### AI Players

AI players use a DQN model via HTTP call to ml-service (`/predict`). Bets are sized with Kelly Criterion (`calculateKellyBet`). AI is auto-removed when chips reach 0. The `onAITurn(botId, botPlayer, dealerVisibleCard)` callback in `BlackjackGame.js` triggers the ML service request.

## Frontend Structure

```
frontend/src/
├── App.jsx          # React Router: all routes defined here
├── socket.js        # Socket.io client singleton (URL = "" → same origin)
├── pages/           # Home, Login, Register, Profile, Lobby, Game, Terms, Privacy
├── components/      # Navbar, Footer, Card (3D flip), ProtectedRoute
└── styles/          # CSS per-component
```

Auth state: JWT in httpOnly cookie (server) + `username`/`email`/`isLoggedIn` in localStorage (client cache). `ProtectedRoute` only checks localStorage — server-side validation happens on actual API/socket calls.

`Game.jsx` is 1200+ lines and handles all in-game UI, socket event subscription, and local state. It's a candidate for component extraction.

## ML Service

Model: NumPy DQN with 4 inputs (`player_score`, `dealer_visible`, `usable_ace`, `true_count`) → 2 outputs (Q-hit, Q-stand). Weights at `ml_service/train/blackjack_dqn.npz`. Retrain with `ml_service/train/train.py`.

## Known Issues / Incomplete Features

- **Double Down** — button rendered in Game.jsx but backend action not implemented
- `frontend/src/services/socket.js` — empty placeholder (actual socket is `src/socket.js`)
- `JWT_SECRET` has insecure hardcoded fallback in `authController.js` and `authMiddleware.js`
- `blackjack.conf` (active nginx config) missing the `/ml` proxy route — use `app.conf` for ML service access
- `dj.js` is a duplicate DB pool; the canonical pool is in `authController.js`
- No rate limiting on REST or WebSocket events
