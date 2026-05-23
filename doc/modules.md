# ft_transcendence — Module Checklist

# Estimated Total

| Module | Points |
|---|---|
| Frontend + Backend Framework       | 2 |
| Real-Time Features with WebSockets | 2 |
| Statistics / History               | 1 |
| AI Opponent                        | 2 |
| Web-Based Game                     | 2 |
| Remote Players                     | 2 |
| Multiplayer Game                   | 2 |
| Spectator Mode                     | 1 |
| Additional Browser Support         | 1 |
| Backend as Microservices           | 2 |
| Prometheus / Grafana Monitoring    | 2 |
| Custom RL Training Pipeline        | 2 |

## Estimated Total: 21 Points

This satisfies the mandatory minimum requirement.

Subject reference: Minimum 14 mandatory points required. :contentReference[oaicite:5]{index=5}

---

## Mandatory Technical Requirements

### Web, Git and errors ✅
Requirement:
- The project must be a web application, and requires a frontend, backend and a database                                       ✅
- Git must be used with clear and meaningful commit messages. The repository must show:                                ✅
    ◦ Commits from all team members.
    ◦ Clear commit messages describing the changes.
    ◦ Proper work distribution across the team.
- Deployment must use a containerization solution (**Docker**, Podman, or equivalent) and run with a single command (**make**) ✅
- Your website must be compatible with the latest stable version of Google Chrome                                               ✅
- No warnings or errors should appear in console     ✅
- The project must include accessible Privacy Policy and Terms of Service pages with relevant content                          ✅

### Multi-user Support ✅
Requirement:
- Multiple users connected simultaneously ✅
- Real-time synchronization               ✅
- No race conditions/data corruption      ✅

How we satisfy it:
- Multiplayer blackjack tables with Socket.IO
- Real-time state synchronization
- Spectator mode
- Reconnection handling
- Turn synchronization
- Disconnect grace timers

How to test:
1. Open 2–4 browser tabs/incognito windows
2. Join same table with different users
3. Perform simultaneous actions (bet, hit, stand)
4. Verify all clients update instantly
5. Disconnect/reconnect during a turn
6. Verify state remains synchronized

Subject reference: Multi-user Support mandatory requirement. :contentReference[oaicite:0]{index=0}

### Responsive Frontend ✅
Requirement:
- Responsive across devices                                ✅
- CSS framework or styling solution                        ✅
- Database must have a clear schema                        ✅
- Stores credentials [.env]                                ✅
- Basic user management system (email + password)          ✅
- Any connection to the backend, from a browser, from a script, from an external API, etc., must use **HTTPS**                     ✅

How we satisfy it:
- Responsive blackjack table
- Mobile breakpoints
- Adaptive HUD/cards/layout
- Dynamic spectator/player layout
- HTTPS local certificates               
- Secure websocket connections           

How to test:
1. Open Chrome DevTools
2. Toggle mobile device toolbar
3. Test multiple resolutions:
   - 1920x1080
   - 768x1024
   - iPhone sizes
4. Verify layout remains usable

How to test:
1. Verify app runs on https://
2. Verify browser lock icon
3. Verify WSS websocket connection

Subject reference: Responsive frontend required. :contentReference[oaicite:1]{index=1}

Subject reference: HTTPS mandatory. :contentReference[oaicite:4]{index=4}

---

### Frontend + Backend Framework ✅ (Major Module — 2pts)
Requirement:
- Use frontend framework                ✅
- Use backend framework                 ✅

How we satisfy it:
- React frontend
- Component architecture
- React Router
- State management with hooks

- Express.js backend
- REST API
- Middleware architecture
- Socket.IO integration

How to test:
1. Show React project structure
2. Show routing/components/hooks usage
3. Verify SPA navigation works

1. Show Express routes/controllers
2. Show middleware/authentication
3. Verify API endpoints work

Subject reference: React accepted as framework. :contentReference[oaicite:2]{index=2}

Points: 2

---

## Real-Time Features with WebSockets ✅ (Major Module — 2pts)
Requirement:
- Real-time updates across clients             ✅
- Handle connection/disconnection gracefully   ✅
- Efficient message broadcasting               ✅

How we satisfy it:
- The game uses Socket.IO to synchronize blackjack table state in real time.
- Player actions such as joining a room, placing bets, hitting, standing, doubling, adding/removing AI players, and resetting rounds are broadcast to all connected clients.
- Spectators receive live game updates without needing to refresh.
- Disconnections are handled through socket events and grace timers.
- Reconnection logic preserves the player seat temporarily and allows users to recover from connection issues.
- Room state is emitted only to the affected room, avoiding unnecessary global broadcasts.

How to test:
1. Open the game in two or more browsers/incognito windows.
2. Log in with different users.
3. Join the same multiplayer table.
4. Place a bet with one user and verify the other clients update instantly.
5. Start a round and perform actions such as Hit, Stand, or Double.
6. Verify all connected clients see the same cards, turn, bets, player statuses, and results.
7. Join a full/ongoing table with another user and verify spectator mode receives live updates.
8. Disconnect one player during the game.
9. Verify the player appears as disconnected instead of being removed immediately.
10. Reconnect before the grace timer ends and verify the player recovers their seat.
11. Disconnect and wait past the grace timer; verify the game state remains stable and updates for all clients.

Points: 2

---

## Additional Browser Support ✅ (Minor Module — 1pt)
Requirement:
- Full compatibility with at least two additional browsers.  ✅
- Test and fix all features in each browser.                 ✅
- Document browser-specific limitations.                     ✅
- Maintain consistent UI/UX.                                 ✅

Target browsers:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge

Validation checklist:
- Register/login/logout works.
- Lobby loads correctly.
- Multiplayer rooms work.
- Blackjack gameplay works.
- Bets, Hit, Stand, Double and Next Round work.
- AI opponent works.
- Spectator mode works.
- Reconnection/disconnection grace timers work.
- HTTPS works.
- WebSocket connection works.
- Responsive layout works.
- No browser console errors or warnings.

Known limitations:
- No known limitations after testing.

Status:
- Chrome: tested
- Firefox: pending/tested
- Edge: pending/tested

Points: 1

---

## Statistics / Match History ✅ (Minor Module — 1pt)
How we satisfy it:
- Balance tracking            ✅
- Match history               ✅
- Leaderboards                ✅
- Persistent stats            ✅

How to test:
1. Play multiple rounds
2. Open profile/stats
3. Verify persistence after refresh

Possible points: 1

---

## AI Opponent ✅ (Major Module — 2pts)
Requirement:
- The AI must be challenging and able to win occasionally.         ✅
- The AI should simulate human-like behavior (not perfect play).   ✅
- Must be able to explain the AI implementation during evaluation. ✅

How we satisfy it:
- `ml_service/` is a dedicated Python microservice running a **Dueling Double DQN** (D3QN) with **Prioritized Experience Replay** (PER), trained with PyTorch.
- The trained model is exported to NumPy `.npz` format and served at runtime without PyTorch — pure NumPy inference via a Flask REST API (`POST /predict`).
- The AI receives 5 game-state features (player score, dealer visible card, usable ace, true count, can double) and returns the optimal action (hit / stand / double) with confidence and Q-values.
- The model is competitive but not perfect: trained mean reward ~-0.0186 (near the theoretical optimum for blackjack, which always has a slight house edge), making it challenging without being unbeatable.
- The backend (`backend/services/mlService.js`) calls `http://ml-service:5000/predict` over the internal Docker network and falls back to a basic strategy if the service is unavailable.

How to test:
1. Add AI player to a table.
2. Start game and verify AI takes autonomous actions (hit/stand/double).
3. Verify AI decisions vary and are non-trivial.
4. Run `docker compose ps` and confirm `blackjack-ml-service` container is running.
5. Call `GET http://localhost:5000/health` and verify `model_loaded: true`.

Subject reference: IV.4 — Major: AI Opponent.

Points: 2

---

## Backend as Microservices ✅ (Major Module — 2pts)
Requirement:
- Design loosely-coupled services with clear interfaces.   ✅
- Use REST APIs or message queues for communication.       ✅
- Each service should have a single responsibility.        ✅

How we satisfy it:
- The `ml_service/` is the key dedicated microservice that demonstrates this architecture: a standalone Python/Flask container with a single responsibility (DQN inference for the AI opponent), completely independent from the Node.js backend.
- `ml_service` exposes a clear REST API: `POST /predict` (AI action) and `GET /health` (status).
- The backend calls `ml_service` over the internal Docker network via `http://ml-service:5000`.
- Each service (frontend, backend, database, ml_service, nginx, monitoring) runs in its own container, orchestrated via docker-compose.
- Nginx acts as reverse proxy/gateway routing external requests to the correct service.
- `ml_service` has its own `Dockerfile`, dependencies, and codebase — entirely decoupled from the rest.

How to test:
1. Run `docker compose ps` and verify `blackjack-ml-service` runs as a separate container.
2. Stop `ml_service` (`docker compose stop ml-service`) and verify the rest of the app keeps running (AI falls back to basic strategy).
3. Call `POST http://localhost:5000/predict` directly with a game state and verify it returns an action.
4. Verify `ml_service` has its own `Dockerfile` and no shared code with the backend.
5. Verify Nginx does not expose `ml_service` externally — only the backend calls it internally.

Subject reference: IV.7 — Major: Backend as microservices.

Points: 2

---

## Web-Based Game ✅ (Major Module — 2pts)
How we satisfy it:
- Fully playable browser blackjack   ✅
- Real-time multiplayer gameplay     ✅
- Game state synchronization         ✅
- Betting system                     ✅

How to test:
1. Create room
2. Start game
3. Play complete blackjack round

Points: 2

---

## Remote Players ✅ (Major Module — 2pts)
How we satisfy it:
- Socket.IO multiplayer             ✅
- Shared room state                 ✅
- Turn synchronization              ✅
- Cross-client updates              ✅

How to test:
1. Host with VM
1. Open tabs on separate computers (127.0...)
2. Join same room
3. Verify actions sync live

Points: 2

---

## Multiplayer Game ✅ (Major Module — 2pts)
How we satisfy it:
- Support for three or more players simultaneously  ✅
- Fair gameplay mechanics for all participants      ✅
- Proper synchronization across all clients         ✅

How to test:
1. Open multiple devices/tabs (incognito mode)
2. Join same room
3. Verify actions sync live

Points: 2

---

## Spectator Mode ✅ (Minor/Custom Module — 1pt)
How we satisfy it:
- Spectators can watch live games
- Real-time updates
- Spectator queue system
- Promotion into empty seats

How to test:
1. Join full table
2. Verify spectator mode activates
3. Leave player seat
4. Verify spectator promotion

Possible points: 1

---

