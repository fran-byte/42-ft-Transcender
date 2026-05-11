
# Docker & Infrastructure Setup

### Overview

The project is fully containerized using **Docker Compose** to ensure an easy and reproducible setup.  
All services are isolated in their own containers and communicate through a shared Docker network.

The stack includes:

*   Frontend (React)
*   Backend (Node.js / API)
*   PostgreSQL database
*   Nginx reverse proxy with HTTPS
*   Monitoring stack (Prometheus, Grafana, cAdvisor)

***

### Services Architecture

*   **Frontend**
    *   Runs the React application in development mode.
    *   Hot reload enabled using volumes.
    *   Exposed internally on port `5173`.

*   **Backend**
    *   Node.js API server.
    *   Connects to PostgreSQL using environment variables.
    *   Handles authentication (JWT), game logic and WebSockets.
    *   Exposed internally on port `3000`.

*   **Database (PostgreSQL)**
    *   Persistent data stored using Docker volumes.
    *   Database schema initialized automatically using an `init.sql` script.
    *   Restart policy enabled to avoid accidental data loss.

*   **Nginx**
    *   Acts as a **reverse proxy** for frontend, backend API and WebSockets.
    *   Forces **HTTP → HTTPS** redirection.
    *   Uses a self-signed SSL certificate for local development.
    *   Routes:
        *   `/` → frontend
        *   `/api/` → backend REST API
        *   `/socket.io/` → backend WebSockets

*   **Prometheus**
    *   Collects metrics from backend services.
    *   Used as the main metrics source for monitoring.

*   **Grafana**
    *   Provides dashboards and visual monitoring.
    *   Uses persistent storage for dashboards and configuration.

*   **cAdvisor**
    *   Monitors Docker containers performance (CPU, memory, disk, network).
    *   Feeds container metrics to Prometheus.

***

### Networking & Security

*   All services run inside a private Docker network.
*   Only Nginx exposes ports to the host (`80` and `443`).
*   Backend and database are never directly accessible from outside.
*   HTTPS is enforced using Nginx with SSL certificates.

***

### Environment Configuration

*   Sensitive values (DB credentials, JWT secret, Grafana credentials) are stored in a `.env` file.
*   An automated setup generates secure random values when the `.env` file is missing.
*   Environment variables are injected into containers at runtime.

***

### Makefile Workflow

A custom **Makefile** is provided to simplify project management:

Common commands:

*   `make` / `make all` → full setup and start
*   `make up` → start containers
*   `make down` → stop and remove containers
*   `make fclean` → full cleanup (containers, images, volumes)
*   `make logs` → view logs
*   `make re` → rebuild everything from scratch

The setup process also:

*   Generates SSL certificates if missing
*   Creates a valid `.env` file
*   Checks Nginx configuration
*   Helps configure `/etc/hosts` for local domain access

***

### Access

After setup:

*   Application: `https://blackjack.local`
*   Grafana: `http://localhost:3001`
*   Prometheus: `http://localhost:9090`
*   cAdvisor: `http://localhost:8080`

> Note: the SSL certificate is self-signed and must be accepted manually in the browser.


