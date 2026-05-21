_This project has been created as part of the 42 curriculum by frromero, allera-m, msoriano, maanguit and mamagalh_

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

---

## Key Features

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

# Instructions

## Prerequisites

Required software:

- Docker
- Docker Compose
- Make

---

## Installation

Clone repository:

```bash
git clone <repository_url>
cd ft_transcendence
```

---

## Start Project

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

## Access

| Service     | URL                     |
| ----------- | ----------------------- |
| Application | https://blackjack.local |
| Grafana     | http://localhost:3001   |
| Prometheus  | http://localhost:9090   |
| cAdvisor    | http://localhost:8080   |

> ⚠️ Self-signed SSL certificates are used for local development.

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

---

## Additional Documentation

Additional technical documentation:

- `docs/docker.md`
- `docs/gameplay.md`

---

# AI Usage

During development, AI tools (ChatGPT, GitHub Copilot) were used for:

- Code documentation generation (JSDoc comments, function descriptions)
- Debugging assistance for WebSocket synchronization and reconnection issues
- Identifying and fixing recurring errors in React components
- Reviewing and refactoring code for performance optimization (`useMemo`, `React.memo`)
- Generating boilerplate code for repetitive tasks

All AI-generated code was reviewed, tested, and fully understood by team members before integration. No code was blindly copied without comprehension.

---

# Team Information

## msoriano

### Roles

- PM
- Frontend Developer
- Gameplay Developer

### Responsibilities

- Frontend architecture (main owner)
- Game UI/UX
- Spectator mode
- Responsive design
- Multiplayer synchronization
- Blackjack gameplay logic

---

## frromero

### Roles

- Infrastructure Developer
- Backend Support

### Responsibilities

- Docker infrastructure (docker-compose.yml, multi-container orchestration)
- Nginx configuration and HTTPS setup (self-signed certificates, reverse proxy)
- Makefile automation for project setup
- Backend API support (assisted allera-m with debugging and fixes)
- PostgreSQL integration support

---

## maanguit

### Roles

- AI Developer
- Backend Support
- Frontend Support

### Responsibilities

- AI integration within the backend (AI opponent logic and behavior)
- Backend support (assisted allera-m with backend tasks)
- Frontend support (assisted msoriano with frontend tasks)
- Testing
- Initialization of the `docker-compose-dev.yml` development branch

---

## allera-m

### Roles

- Tech Lead
- Full Stack Developer (Backend Owner)

### Responsibilities

- System architecture
- WebSocket synchronization
- Multiplayer game management
- Backend API (main owner)
- Authentication system logic
- Reconnection/disconnection handling
- Code review and integration

---

## mamagalh

### Roles

- DevOps / Monitoring Developer
- Docker Support

### Responsibilities

- Metrics integration using Prometheus, Grafana and cAdvisor (3 services)
- Docker orchestration support (assisted frromero with container setup)
- Custom Grafana dashboards
- Container performance monitoring

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

| Field         | Type    |
| ------------- | ------- |
| id            | INTEGER |
| username      | VARCHAR |
| email         | VARCHAR |
| password_hash | VARCHAR |
| balance       | INTEGER |

---

### stats

Stores player statistics.

| Field        | Type    |
| ------------ | ------- |
| user_id      | INTEGER |
| wins         | INTEGER |
| losses       | INTEGER |
| games_played | INTEGER |

---

### history

Stores match history.

| Field        | Type      |
| ------------ | --------- |
| id           | INTEGER   |
| user_id      | INTEGER   |
| result       | VARCHAR   |
| chips_change | INTEGER   |
| created_at   | TIMESTAMP |

---

## Relationships

```txt
users
 ├── stats
 └── history
```

---

## Database Schema Diagram

```text
┌─────────────────┐     ┌─────────────────┐
│      users      │     │      stats      │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │────<│ user_id (FK)    │
│ username        │     │ wins            │
│ email           │     │ losses          │
│ password_hash   │     │ games_played    │
│ balance         │     └─────────────────┘
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│     history     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ result          │
│ chips_change    │
│ created_at      │
└─────────────────┘
```

---

# Features List

| Feature                  | Description                             | Team Member(s)                      |
| ------------------------ | --------------------------------------- | ----------------------------------- |
| Multiplayer Blackjack    | Real-time blackjack gameplay            | msoriano, allera-m                  |
| Authentication System    | Register/login/logout system            | allera-m (main), frromero (support) |
| AI Opponent              | Automated blackjack bots                | maanguit                            |
| Spectator Mode           | Watch ongoing matches live              | msoriano                            |
| Statistics & Leaderboard | Persistent stats system                 | allera-m (main), frromero (support) |
| Responsive Design        | Mobile/tablet support                   | msoriano                            |
| HTTPS Infrastructure     | Secure HTTPS deployment                 | frromero                            |
| Monitoring Stack         | Grafana/Prometheus/cAdvisor integration | mamagalh                            |
| Reconnection System      | Grace timers and reconnect recovery     | allera-m                            |
| Docker Orchestration     | Multi-container setup                   | frromero (main), mamagalh (support) |

---

# Modules

| Module                             | Type  | Points |
| ---------------------------------- | ----- | ------ |
| Frontend + Backend Framework       | Major | 2      |
| Real-Time Features with WebSockets | Major | 2      |
| Standard User Management           | Major | 2      |
| Statistics / History               | Minor | 1      |
| AI Opponent                        | Major | 2      |
| Web-Based Game                     | Major | 2      |
| Remote Players                     | Major | 2      |
| Multiplayer Game (3+ players)      | Major | 2      |
| Spectator Mode                     | Minor | 1      |
| Additional Browser Support         | Minor | 1      |
| Backend as Microservices           | Major | 2      |

**Total: 19 points (14 required + 5 bonus)**

---

# Module Justification

## Frontend + Backend Framework

Implemented using React and Express.js.

## Real-Time Features with WebSockets

Implemented using Socket.IO for multiplayer synchronization.

## Standard User Management

JWT authentication, secure cookies, login/register/logout system.

## Statistics / History

Persistent player statistics and match history stored in PostgreSQL.

## AI Opponent

Author: maanguit

`ml_service/` is a dedicated Python microservice running a **Dueling Double DQN** (D3QN) with **Prioritized Experience Replay** (PER), trained with PyTorch and served at runtime as a Flask REST API (`POST /predict`) using pure NumPy inference. The AI receives the game state (player score, dealer card, usable ace, true count, can double) and returns the optimal action (hit / stand / double). Trained mean reward ~-0.0186 — competitive without being perfect. The backend falls back to a basic strategy if the ML service is unavailable.

## Web-Based Game

Fully browser-playable blackjack game.

## Remote Players

Real-time multiplayer matches across different clients.

## Multiplayer Game

Multiple simultaneous players interacting in the same room.

## Spectator Mode

Users can watch ongoing matches and join when seats become available.

## Backend as Microservices

Author: maanguit

The `ml_service/` directory is the dedicated microservice that satisfies this module: a standalone Python/Flask container with a single responsibility (DQN inference for the AI opponent), fully decoupled from the Node.js backend. It exposes a clean REST API (`POST /predict`, `GET /health`) and is called by the backend over the internal Docker network. Each service in the stack (frontend, backend, database, ml_service, nginx, monitoring) runs in its own container with its own Dockerfile and configuration, orchestrated via docker-compose. Nginx acts as the external gateway — `ml_service` is never exposed directly.

## Additional Browser Support

Tested compatibility with:

- Chrome
- Firefox
- Edge

---

# Legal

The application includes accessible Privacy Policy and Terms of Service pages, reachable via footer links from any page of the application. These pages contain relevant content specific to this project and are not placeholders.

---

# Individual Contributions

## msoriano

- Frontend architecture (main owner)
- Responsive design
- Spectator system
- Game UI implementation
- Lobby system

### Challenges

Managing responsive multiplayer layouts and synchronization issues.

---

## frromero

- Docker infrastructure (main owner)
- Nginx and HTTPS setup
- Makefile automation
- Backend API support (assisted allera-m)
- PostgreSQL integration support

### Challenges

Container networking and HTTPS reverse proxy configuration.

---

## maanguit

- AI integration within the backend (main owner)
- Backend support (assisted allera-m)
- Frontend support (assisted msoriano)
- Testing
- Initialization of `docker-compose-dev.yml`

### Challenges

Integrating AI logic within the existing backend architecture and maintaining a stable development environment.

---

## allera-m

- Backend API (main owner)
- Authentication system logic
- WebSocket synchronization
- Multiplayer game management
- Reconnection/disconnection handling
- Statistics and history system

### Challenges

Handling race conditions, reconnect logic and multiplayer edge cases.

---

## mamagalh

- Metrics integration with Prometheus, Grafana and cAdvisor (main owner - 3 services)
- Monitoring stack orchestration
- Custom Grafana dashboards
- Container performance monitoring
- Docker orchestration support (assisted frromero)

### Challenges

Configuring three monitoring services to work together and display meaningful metrics.

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

```




```
