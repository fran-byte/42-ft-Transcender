# ft_transcendence — Blackjack

![Version](https://img.shields.io/badge/VERSION-1.0.0-purple?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-PRODUCTION-brightgreen?style=for-the-badge)
![Node.js](https://img.shields.io/badge/NODE.JS-22.x-green?style=for-the-badge)
![React](https://img.shields.io/badge/REACT-18.x-blue?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/POSTGRESQL-15-blue?style=for-the-badge)
![Docker](https://img.shields.io/badge/DOCKER-28.x-blue?style=for-the-badge)
![Nginx](https://img.shields.io/badge/NGINX-1.27-green?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/SOCKET.IO-4.x-black?style=for-the-badge)
![License](https://img.shields.io/badge/LICENSE-MIT-yellow?style=for-the-badge)
![42](https://img.shields.io/badge/42-PROJECT-black?style=for-the-badge)

_This project has been created as part of the 42 curriculum by frromero, allera-m, msoriano, maanguit and mamagalh_

---

![DESCRIPTION](https://img.shields.io/badge/DESCRIPTION-blue?style=for-the-badge)

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

![FEATURES](https://img.shields.io/badge/FEATURES-blue?style=for-the-badge)

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

![INSTRUCTIONS](https://img.shields.io/badge/INSTRUCTIONS-green?style=for-the-badge)

# Instructions

![PREREQUISITES](https://img.shields.io/badge/PREREQUISITES-lightgrey?style=for-the-badge)

## Prerequisites

Required software:

- Docker
- Docker Compose
- Make

---

![INSTALLATION](https://img.shields.io/badge/INSTALLATION-lightgrey?style=for-the-badge)

## Installation

Clone repository:

```bash
git clone <repository_url>
cd ft_transcendence
```

---

![START](https://img.shields.io/badge/START-green?style=for-the-badge)

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

![ACCESS](https://img.shields.io/badge/ACCESS-blue?style=for-the-badge)

## Access

| Service     | URL                     |
| ----------- | ----------------------- |
| Application | https://blackjack.local |
| Grafana     | http://localhost:3001   |
| Prometheus  | http://localhost:9090   |
| cAdvisor    | http://localhost:8080   |

> ⚠️ Self-signed SSL certificates are used for local development.

---

![RESOURCES](https://img.shields.io/badge/RESOURCES-yellow?style=for-the-badge)

# Resources

![DOCUMENTATION](https://img.shields.io/badge/DOCUMENTATION-lightgrey?style=for-the-badge)

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

![ADDITIONAL](https://img.shields.io/badge/ADDITIONAL_DOCS-lightgrey?style=for-the-badge)

## Additional Documentation

Additional technical documentation:

- `docs/docker.md`
- `docs/gameplay.md`

---

![AI USAGE](https://img.shields.io/badge/AI_USAGE-purple?style=for-the-badge)

# AI Usage

During development, AI tools (ChatGPT, GitHub Copilot) were used for:

- Code documentation generation (JSDoc comments, function descriptions)
- Debugging assistance for WebSocket synchronization and reconnection issues
- Identifying and fixing recurring errors in React components
- Reviewing and refactoring code for performance optimization (`useMemo`, `React.memo`)
- Generating boilerplate code for repetitive tasks

All AI-generated code was reviewed, tested, and fully understood by team members before integration. No code was blindly copied without comprehension.

---

![TEAM](https://img.shields.io/badge/TEAM_INFORMATION-orange?style=for-the-badge)

# Team Information

![MSORIANO](https://img.shields.io/badge/MSORIANO-blue?style=for-the-badge)

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

![FRROMERO](https://img.shields.io/badge/FRROMERO-blue?style=for-the-badge)

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

![MAANGUIT](https://img.shields.io/badge/MAANGUIT-blue?style=for-the-badge)

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

---

![ALLERA-M](https://img.shields.io/badge/ALLERA--M-blue?style=for-the-badge)

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

![MAMAGALH](https://img.shields.io/badge/MAMAGALH-blue?style=for-the-badge)

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

![PROJECT MANAGEMENT](https://img.shields.io/badge/PROJECT_MANAGEMENT-green?style=for-the-badge)

# Project Management

![WORK](https://img.shields.io/badge/WORK_ORGANIZATION-lightgrey?style=for-the-badge)

## Work Organization

The project was developed iteratively using task distribution between frontend, backend, infrastructure, and gameplay systems.

Development included:

- Feature planning
- Weekly synchronization meetings
- Incremental integration
- Collaborative debugging and testing

---

![TOOLS](https://img.shields.io/badge/TOOLS-lightgrey?style=for-the-badge)

## Project Management Tools

- GitHub
- GitHub Issues
- Git branches and pull requests
- Docker Compose

---

![COMMUNICATION](https://img.shields.io/badge/COMMUNICATION-lightgrey?style=for-the-badge)

## Communication

- Discord
- 42 intra
- GitHub discussions

---

![TECH STACK](https://img.shields.io/badge/TECHNICAL_STACK-red?style=for-the-badge)

# Technical Stack

![FRONTEND](https://img.shields.io/badge/FRONTEND-blue?style=for-the-badge)

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

![BACKEND](https://img.shields.io/badge/BACKEND-blue?style=for-the-badge)

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

![DATABASE](https://img.shields.io/badge/DATABASE-blue?style=for-the-badge)

## Database

- PostgreSQL

### Why PostgreSQL?

PostgreSQL was chosen because:

- Strong reliability
- ACID compliance
- Relational structure suitable for users, matches and statistics
- Excellent Docker support

---

![INFRASTRUCTURE](https://img.shields.io/badge/INFRASTRUCTURE-blue?style=for-the-badge)

## Infrastructure

- Docker
- Docker Compose
- Nginx
- HTTPS/SSL
- Prometheus
- Grafana
- cAdvisor

---

![DATABASE SCHEMA](https://img.shields.io/badge/DATABASE_SCHEMA-orange?style=for-the-badge)

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

![FEATURES LIST](https://img.shields.io/badge/FEATURES_LIST-green?style=for-the-badge)

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

![MODULES](https://img.shields.io/badge/MODULES-purple?style=for-the-badge)

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

![JUSTIFICATION](https://img.shields.io/badge/MODULE_JUSTIFICATION-blue?style=for-the-badge)

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

![LEGAL](https://img.shields.io/badge/LEGAL-red?style=for-the-badge)

# Legal

The application includes accessible Privacy Policy and Terms of Service pages, reachable via footer links from any page of the application. These pages contain relevant content specific to this project and are not placeholders.

---

![CONTRIBUTIONS](https://img.shields.io/badge/INDIVIDUAL_CONTRIBUTIONS-green?style=for-the-badge)

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

![REALTIME](https://img.shields.io/badge/REAL--TIME_MULTIPLAYER_SYSTEM-blue?style=for-the-badge)

# Real-Time Multiplayer System

The application uses Socket.IO for real-time synchronization between all clients.

Implemented features include:

- Room-based synchronization
- Turn synchronization
- Spectator synchronization
- Disconnect grace timers
- Reconnection recovery
- Real-time state broadcasting
