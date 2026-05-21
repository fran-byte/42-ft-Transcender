*This project has been created as part of the 42 curriculum by <frromero>, <allera-m>, <msoriano>, <manguita> and <login>*

# ft_transcendence — Blackjack 

## Description
ft_transcendence is a real-time multiplayer blackjack platform developed as part of the 42 curriculum.

The goal of the project was to build a complete full-stack web application combining:

- Real-time multiplayer gameplay
- Authentication and user management
- Responsive frontend
- WebSocket synchronization
- AI-controlled opponents
- Persistent statistics and history
- Secure HTTPS infrastructure
- Dockerized deployment

The application supports multiple simultaneous users playing blackjack together in real time through Socket.IO synchronization.

### Key Features

- Multiplayer blackjack tables
- AI opponents
- Spectator mode
- Real-time gameplay synchronization
- Reconnection handling with grace timers
- Match history and leaderboard
- Secure authentication system
- Responsive design
- Dockerized infrastructure
- HTTPS support
- Monitoring stack with Grafana and Prometheus

---

## Instructions

### Prerequisites

Required software:

- Docker
- Docker Compose
- Make

---

### Installation

Clone repository:

```bash
git clone <repository_url>
cd ft_transcendence
```

---

### Start Project

Run:

```bash
make
```

This automatically:
- Builds containers
- Generates SSL certificates
- Creates environment variables
- Starts all services

---

### Access

| Service | URL |
|---|---|
| Application | https://blackjack.local |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| cAdvisor | http://localhost:8080 |

⚠️ Self-signed SSL certificates are used for local development.

---

# Resources

## Documentation

- https://react.dev/
- https://socket.io/docs/
- https://expressjs.com/
- https://www.postgresql.org/docs/
- https://docs.docker.com/
- https://nginx.org/en/docs/
- https://grafana.com/docs/
- https://prometheus.io/docs/

### Additional Documentation

Additional technical documentation:
- `docs/docker.md`
- `docs/gameplay.md`

---

# Team Information

## <login1>

### Roles
- PM
- Frontend Developer
- Gameplay Developer

### Responsibilities
- Frontend architecture
- Game UI/UX
- Spectator mode
- Responsive design
- Multiplayer synchronization
- Blackjack gameplay logic

---

## <login2>

### Roles
- Backend Developer
- Infrastructure Developer

### Responsibilities
- Backend API
- Authentication system
- Database integration
- Docker infrastructure
- Nginx and HTTPS setup
- Monitoring stack

---

## <login3>

### Roles
- Tech Lead
- Full Stack Developer

### Responsibilities
- System architecture
- WebSocket synchronization
- Multiplayer game management
- AI system
- Reconnection/disconnection handling
- Code review and integration

---

# Project Management

## Work Organization

The project was developed iteratively using task distribution between frontend, backend, infrastructure, and gameplay systems.

Development included:
- Feature planning
- Weekly synchronization meetings
- Incremental integration
- Collaborative debugging and testing

---

## Project Management Tools

- GitHub
- GitHub Issues
- Git branches and pull requests
- Docker Compose

---

## Communication

- Discord
- 42 intra
- GitHub discussions

---

# Technical Stack

## Frontend

- React
- Vite
- React Router
- CSS

### Why React?

React was chosen because:
- Component-based architecture
- Fast UI rendering
- Easy state management
- Strong ecosystem for SPA applications

---

## Backend

- Node.js
- Express.js
- Socket.IO

### Why Express + Socket.IO?

- Lightweight backend architecture
- Excellent WebSocket support
- Real-time synchronization
- Easy integration with REST APIs

---

## Database

- PostgreSQL

### Why PostgreSQL?

PostgreSQL was chosen because:
- Strong reliability
- ACID compliance
- Relational structure suitable for users, matches and statistics
- Excellent Docker support

---

## Infrastructure

- Docker
- Docker Compose
- Nginx
- HTTPS/SSL
- Prometheus
- Grafana
- cAdvisor

---

# Database Schema

## Main Tables

### users

Stores user accounts and authentication data.

| Field | Type |
|---|---|
| id | INTEGER |
| username | VARCHAR |
| email | VARCHAR |
| password_hash | VARCHAR |
| balance | INTEGER |

---

### stats

Stores player statistics.

| Field | Type |
|---|---|
| user_id | INTEGER |
| wins | INTEGER |
| losses | INTEGER |
| games_played | INTEGER |

---

### history

Stores match history.

| Field | Type |
|---|---|
| id | INTEGER |
| user_id | INTEGER |
| result | VARCHAR |
| chips_change | INTEGER |
| created_at | TIMESTAMP |

---

## Relationships

```txt
users
 ├── stats
 └── history
```

---

# Features List

| Feature | Description | Team Member(s) |
|---|---|---|
| Multiplayer Blackjack | Real-time blackjack gameplay | <login1>, <login3> |
| Authentication System | Register/login/logout system | <login2> |
| AI Opponent | Automated blackjack bots | <login3> |
| Spectator Mode | Watch ongoing matches live | <login1> |
| Statistics & Leaderboard | Persistent stats system | <login2> |
| Responsive Design | Mobile/tablet support | <login1> |
| HTTPS Infrastructure | Secure HTTPS deployment | <login2> |
| Monitoring Stack | Grafana/Prometheus integration | <login2> |
| Reconnection System | Grace timers and reconnect recovery | <login3> |

---

# Modules

| Module | Points |
|---|---|
| Frontend + Backend Framework       | 2 |
| Real-Time Features with WebSockets | 2 |
| Standard User Management           | 2 |
| Statistics / History               | 1 |
| AI Opponent                        | 2 |
| Web-Based Game                     | 2 |
| Remote Players                     | 2 |
| Multiplayer Game                   | 2 |
| Spectator Mode                     | 1 |
| Additional Browser Support         | 1 |

## Estimated Total: 17 Points

---

## Module Justification

### Frontend + Backend Framework
Implemented using React and Express.js.

### Real-Time Features with WebSockets
Implemented using Socket.IO for multiplayer synchronization.

### Standard User Management
JWT authentication, secure cookies, login/register/logout system.

### Statistics / History
Persistent player statistics and match history stored in PostgreSQL.

### AI Opponent
AI-controlled blackjack players capable of autonomous gameplay.

### Web-Based Game
Fully browser-playable blackjack game.

### Remote Players
Real-time multiplayer matches across different clients.

### Multiplayer Game
Multiple simultaneous players interacting in the same room.

### Spectator Mode
Users can watch ongoing matches and join when seats become available.

### Additional Browser Support
Tested compatibility with:
- Chrome
- Firefox
- Edge

---

# Individual Contributions

## <login1>

- Frontend architecture
- Responsive design
- Spectator system
- Game UI implementation
- Lobby system

### Challenges
Managing responsive multiplayer layouts and synchronization issues.

---

## <login2>

- Backend API
- PostgreSQL integration
- Docker infrastructure
- HTTPS setup
- Monitoring tools

### Challenges
Container networking and HTTPS reverse proxy configuration.

---

## <login3>

- Multiplayer synchronization
- AI gameplay system
- Reconnection/disconnection handling
- Socket event management

### Challenges
Handling race conditions, reconnect logic and multiplayer edge cases.

---

# Real-Time Multiplayer System

The application uses Socket.IO for real-time synchronization between all clients.

Implemented features include:
- Room-based synchronization
- Turn synchronization
- Spectator synchronization
- Disconnect grace timers
- Reconnection recovery
- Real-time state broadcasting
