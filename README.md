
👥 DISTRIBUCIÓN PARA BLACKJACK

PERSONA A: "Infraestructura & Docker"

```
✅ docker-compose.yml (Node.js + MySQL + Redis opcional)
✅ Dockerfile con todas las dependencias
✅ Configuración de puertos (3000 para web, 6379 para Redis si se usa)
✅ Variables de entorno para conexiones
```

PERSONA B: "Backend Core & Lógica del Juego"

```
✅ API REST para Blackjack: /api/blackjack/deal, /hit, /stand, /double
✅ Lógica completa del Blackjack (21, dealer rules, splits, insurance)
✅ WebSocket/Socket.io para juego en tiempo real (si es multijugador)
✅ Gestión de apuestas y chips virtuales
```

PERSONA C: "Frontend & UI del Blackjack"

```
✅ Interfaz visual del Blackjack (cartas, mesa, fichas)
✅ Animaciones de reparto de cartas
✅ Diseño de cartas con CSS/Canvas
✅ Panel de controles (Pedir, Plantarse, Doblar)
✅ Marcador de puntos y estado del juego
```

PERSONA D: "Base de Datos & Sistema de Economía"

```
✅ Modelos: User (con balance de fichas), GameHistory, Transactions
✅ Lógica de apuestas y gestión de saldo
✅ Historial de partidas con estadísticas
✅ Sistema de recompensas/niveles (opcional)
✅ Leaderboard por ganancias
```

---

🃏 ESPECIFICACIONES DEL BLACKJACK

Reglas básicas a implementar:

1. Mazo: 1-8 barajas (52 cartas cada una)
2. Valores de cartas:
   · 2-10: valor nominal
   · J, Q, K: 10 puntos
   · As: 1 u 11 puntos (automático según mejor mano)
3. Acciones del jugador:
   · Pedir carta (Hit)
   · Plantarse (Stand)
   · Doblar apuesta (Double)
   · Dividir (Split) - OPCIONAL
   · Seguro (Insurance) - OPCIONAL
4. Reglas del dealer:
   · Se planta en 17 o más
   · Pide en 16 o menos
   · As cuenta como 11 si no se pasa de 21

---

📁 ESTRUCTURA ESPECÍFICA PARA BLACKJACK

```
transcendence/
├── public/
│   ├── blackjack.html          # Mesa principal de Blackjack
│   ├── css/
│   │   ├── blackjack.css       # Estilos específicos
│   │   └── cards.css           # Estilos de cartas
│   └── js/
│       ├── blackjack/
│       │   ├── game.js         # Lógica del juego en cliente
│       │   ├── deck.js         # Manejo del mazo
│       │   ├── ui.js           # Actualizar interfaz
│       │   ├── cards.js        # Renderizado de cartas
│       │   └── chips.js        # Sistema de fichas
│       └── socket.js           # Conexión WebSocket
├── src/
│   ├── games/
│   │   └── blackjack/
│   │       ├── BlackjackGame.js # Clase principal del juego
│   │       ├── Deck.js          # Mazo en servidor
│   │       ├── Dealer.js        # Lógica del dealer
│   │       ├── Player.js        # Jugador con mano y apuesta
│   │       └── rules.js         # Reglas del Blackjack
│   ├── controllers/
│   │   └── blackjackController.js
│   └── routes/
│       └── blackjack.js        # Rutas API del Blackjack
```

---

🎮 IMPLEMENTACIÓN DETALLADA POR PERSONA

Persona B (Lógica del Blackjack - Backend):

```javascript
// src/games/blackjack/BlackjackGame.js
class BlackjackGame {
    constructor(gameId, players) {
        this.gameId = gameId;
        this.deck = new Deck(6); // 6 barajas
        this.dealer = new Dealer();
        this.players = players;
        this.currentPlayerIndex = 0;
        this.state = 'betting'; // betting, playing, ended
    }
    
    dealInitialCards() {
        // Repartir 2 cartas a cada jugador
        this.players.forEach(player => {
            player.addCard(this.deck.draw());
            player.addCard(this.deck.draw());
        });
        // Dealer: una carta visible, una oculta
        this.dealer.addCard(this.deck.draw());
        this.dealer.addHiddenCard(this.deck.draw());
    }
    
    calculateHandValue(cards) {
        // Calcular valor con As flexible
        let value = 0;
        let aces = 0;
        
        cards.forEach(card => {
            if (card.value === 'A') {
                aces++;
                value += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                value += 10;
            } else {
                value += parseInt(card.value);
            }
        });
        
        // Ajustar Ases si nos pasamos
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }
    
    playerHit(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.stand) return;
        
        const card = this.deck.draw();
        player.addCard(card);
        
        if (this.calculateHandValue(player.cards) > 21) {
            player.bust = true;
            this.nextPlayer();
        }
        
        return card;
    }
    
    dealerPlay() {
        this.dealer.revealHiddenCard();
        
        while (this.calculateHandValue(this.dealer.cards) < 17) {
            this.dealer.addCard(this.deck.draw());
        }
        
        this.determineWinners();
    }
}
```

Persona C (Interfaz del Blackjack - Frontend):

```html
<!-- public/blackjack.html -->
<div class="blackjack-table">
    <!-- Área del dealer -->
    <div class="dealer-area">
        <h3>Dealer</h3>
        <div class="dealer-cards" id="dealer-cards">
            <!-- Cartas renderizadas dinámicamente -->
        </div>
        <div class="dealer-score" id="dealer-score">Puntos: ?</div>
    </div>
    
    <!-- Área del jugador -->
    <div class="player-area">
        <h3>Tú</h3>
        <div class="player-cards" id="player-cards"></div>
        <div class="player-score" id="player-score">Puntos: 0</div>
        <div class="player-chips">
            <span class="chips">Fichas: <span id="chips-balance">1000</span></span>
            <input type="number" id="bet-amount" value="10" min="10" max="100">
            <button onclick="placeBet()">Apostar</button>
        </div>
    </div>
    
    <!-- Controles del juego -->
    <div class="game-controls" id="game-controls">
        <button onclick="gameHit()" id="hit-btn">Pedir Carta</button>
        <button onclick="gameStand()" id="stand-btn">Plantarse</button>
        <button onclick="gameDouble()" id="double-btn">Doblar</button>
        <button onclick="newGame()" id="new-game-btn">Nueva Partida</button>
    </div>
    
    <!-- Mensajes del juego -->
    <div class="game-message" id="game-message"></div>
</div>
```

Persona D (Base de Datos & Economía):

```sql
-- database/script.sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    chips_balance INT DEFAULT 1000,
    level INT DEFAULT 1,
    total_games_played INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blackjack_games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    bet_amount INT NOT NULL,
    player_outcome ENUM('win', 'loss', 'push', 'blackjack') NOT NULL,
    player_hand VARCHAR(255),
    dealer_hand VARCHAR(255),
    player_score INT,
    dealer_score INT,
    chips_won INT,
    chips_before INT,
    chips_after INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type ENUM('bet', 'win', 'bonus', 'purchase') NOT NULL,
    amount INT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

🎯 FUNCIONALIDADES CLAVE DEL BLACKJACK

Obligatorias:

1. Sistema de apuestas con fichas virtuales
2. Reparto de cartas con animaciones
3. Cálculo automático de puntuaciones (As flexible)
4. Turnos (jugador → dealer)
5. Determinación de ganador (blackjack, 21, más cerca de 21, bust)
6. Actualización de saldo automática

Opcionales (para nota extra):

1. Split (dividir parejas)
2. Insurance (seguro contra blackjack del dealer)
3. Múltiples jugadores en misma mesa (WebSocket)
4. Diferentes temas de cartas
5. Sistema de logros/trofeos
6. Chat en la mesa

---

📁 ESTRUCTURA COMPLETA DEL PROYECTO

```
transcendence-blackjack/
│
├── 📄 .dockerignore
├── 📄 .env.example
├── 📄 .gitignore
│
├── 📄 docker-compose.yml          # Persona A
├── 📄 Dockerfile                  # Persona A
├── 📄 package.json                # Persona A
├── 📄 README.md                   # Persona A
│
├── 📄 server.js                   # Persona B (ENTRY POINT)
│
├── 📂 public/                     # Persona C (FRONTEND ESTÁTICO)
│   ├── 📄 index.html              # Landing page
│   ├── 📄 login.html              # Login
│   ├── 📄 register.html           # Registro
│   ├── 📄 blackjack.html          # Juego principal
│   ├── 📄 profile.html            # Perfil usuario
│   ├── 📄 lobby.html              # Sala de espera (opcional multijugador)
│   ├── 📄 privacy-policy.html     # Política privacidad
│   ├── 📄 terms-of-service.html   # Términos servicio
│   │
│   ├── 📂 css/                    # Persona C
│   │   ├── 📄 style.css           # Estilos generales
│   │   ├── 📄 blackjack.css       # Estilos específicos juego
│   │   ├── 📄 cards.css           # Estilos cartas
│   │   └── 📄 auth.css            # Estilos login/register
│   │
│   ├── 📂 js/                     # Persona C
│   │   ├── 📄 auth.js             # Login/register frontend
│   │   ├── 📄 api.js              # Llamadas API REST
│   │   │
│   │   ├── 📂 blackjack/          # LÓGICA JUEGO CLIENTE
│   │   │   ├── 📄 game.js         # Controlador principal juego
│   │   │   ├── 📄 deck.js         # Mazo en cliente
│   │   │   ├── 📄 cardRenderer.js # Renderizado cartas
│   │   │   ├── 📄 ui.js           # Actualización interfaz
│   │   │   ├── 📄 chips.js        # Sistema de fichas frontend
│   │   │   └── 📄 audio.js        # Sonidos (opcional)
│   │   │
│   │   └── 📄 socket.js           # WebSocket client (si multijugador)
│   │
│   └── 📂 assets/                 # Persona C
│       ├── 📂 images/             # Imágenes, iconos
│       │   ├── 📄 logo.png
│       │   ├── 📄 card-back.png   # Dorso carta
│       │   └── 📄 chips.png       # Fichas
│       └── 📂 sounds/             # Sonidos (opcional)
│           ├── 📄 card-deal.mp3
│           ├── 📄 chip-bet.mp3
│           └── 📄 win.mp3
│
├── 📂 src/                        # Persona B y D (BACKEND)
│   │
│   ├── 📄 app.js                  # Configuración Express
│   │
│   ├── 📂 config/                 # Persona A/B
│   │   ├── 📄 database.js         # Configuración DB
│   │   ├── 📄 socket.js           # Configuración WebSocket
│   │   └── 📄 constants.js        # Constantes del juego
│   │
│   ├── 📂 middleware/             # Persona B
│   │   ├── 📄 auth.js             # Middleware autenticación
│   │   ├── 📄 validation.js       # Validación datos
│   │   └── 📄 errorHandler.js     # Manejo errores
│   │
│   ├── 📂 models/                 # Persona D (MODELOS BD)
│   │   ├── 📄 User.js             # Modelo usuario
│   │   ├── 📄 BlackjackGame.js    # Modelo partida
│   │   ├── 📄 Transaction.js      # Modelo transacción
│   │   └── 📄 Leaderboard.js      # Modelo ranking
│   │
│   ├── 📂 controllers/            # Persona B (CONTROLADORES)
│   │   ├── 📄 authController.js   # Login/register
│   │   ├── 📄 userController.js   # Perfil usuario
│   │   ├── 📄 blackjackController.js # Controlador juego
│   │   ├── 📄 gameHistoryController.js # Historial
│   │   └── 📄 leaderboardController.js # Ranking
│   │
│   ├── 📂 routes/                 # Persona B (RUTAS API)
│   │   ├── 📄 auth.js             # Rutas autenticación
│   │   ├── 📄 users.js            # Rutas usuario
│   │   ├── 📄 blackjack.js        # Rutas juego
│   │   ├── 📄 gameHistory.js      # Rutas historial
│   │   └── 📄 leaderboard.js      # Rutas ranking
│   │
│   ├── 📂 services/               # Persona B/D (LÓGICA NEGOCIO)
│   │   ├── 📄 authService.js      # Servicio autenticación
│   │   ├── 📄 userService.js      # Servicio usuario
│   │   ├── 📄 chipService.js      # Gestión fichas
│   │   └── 📄 statisticService.js # Estadísticas
│   │
│   ├── 📂 games/                  # Persona B (LÓGICA JUEGO SERVER)
│   │   └── 📂 blackjack/
│   │       ├── 📄 BlackjackEngine.js # Motor principal juego
│   │       ├── 📄 Deck.js            # Mazo (servidor)
│   │       ├── 📄 Dealer.js          # Lógica dealer
│   │       ├── 📄 Player.js          # Jugador (mano, apuesta)
│   │       ├── 📄 GameRules.js       # Reglas blackjack
│   │       ├── 📄 GameState.js       # Estado partida
│   │       └── 📄 Card.js            # Modelo carta
│   │
│   ├── 📂 websocket/              # Persona B (si multijugador)
│   │   ├── 📄 socketManager.js     # Gestor conexiones
│   │   ├── 📄 gameRooms.js         # Salas de juego
│   │   └── 📄 blackjackSocket.js   # Eventos específicos blackjack
│   │
│   └── 📂 utils/                  # Persona B/D (UTILIDADES)
│       ├── 📄 helpers.js           # Funciones helper
│       ├── 📄 validators.js        # Validaciones
│       ├── 📄 cardUtils.js         # Utilidades cartas
│       └── 📄 logger.js            # Logging
│
├── 📂 database/                   # Persona D (SCRIPTS BD)
│   ├── 📄 init.sql                # Script inicialización
│   ├── 📄 schema.sql              # Esquema completo
│   ├── 📄 seed.sql                # Datos iniciales (opcional)
│   └── 📄 migrations/             # Migraciones (opcional)
│       └── 📄 001_initial.sql
│
├── 📂 tests/                      # (OPCIONAL) Tests
│   ├── 📄 auth.test.js
│   ├── 📄 blackjack.test.js
│   └── 📄 user.test.js
│
└── 📂 docs/                       # (OPCIONAL) Documentación
    ├── 📄 API.md                  # Documentación API
    ├── 📄 GAMERULES.md            # Reglas blackjack
    └── 📄 SETUP.md                # Guía instalación
```

---

📄 ARCHIVOS CLAVE EXPLICADOS

1. server.js (Persona B)

```javascript
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Conectar a BD
connectDB();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

2. docker-compose.yml (Persona A)

```yaml
version: '3.8'
services:
  app:
    build: .
    container_name: blackjack-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql_db
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=blackjack_db
      - JWT_SECRET=supersecretkey
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mysql_db
      - redis
    volumes:
      - ./:/app
      - /app/node_modules
    command: npm run dev

  mysql_db:
    image: mysql:8.0
    container_name: blackjack-mysql
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=blackjack_db
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    container_name: blackjack-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

3. package.json (Persona A)

```json
{
  "name": "transcendence-blackjack",
  "version": "1.0.0",
  "description": "Blackjack online multiplayer",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "docker:up": "docker-compose up --build",
    "docker:down": "docker-compose down",
    "db:migrate": "node database/migrate.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.0.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.0.0",
    "express-session": "^1.17.0",
    "cors": "^2.8.5",
    "socket.io": "^4.5.0",
    "redis": "^4.0.0",
    "uuid": "^9.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.0.0"
  }
}
```

4. public/js/blackjack/game.js (Persona C)

```javascript
// Controlador principal del juego en cliente
class BlackjackGameClient {
    constructor() {
        this.playerCards = [];
        this.dealerCards = [];
        this.gameState = 'waiting'; // waiting, betting, player-turn, dealer-turn, ended
        this.betAmount = 10;
        this.playerBalance = 1000;
    }
    
    async dealCards() {
        const response = await fetch('/api/blackjack/deal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet: this.betAmount })
        });
        
        const data = await response.json();
        this.updateGameState(data);
    }
    
    async hit() {
        const response = await fetch('/api/blackjack/hit', {
            method: 'POST'
        });
        
        const data = await response.json();
        this.updateGameState(data);
    }
    
    updateUI(gameState) {
        // Actualizar cartas, puntuaciones, botones
        document.getElementById('player-score').textContent = `Puntos: ${gameState.playerScore}`;
        document.getElementById('dealer-score').textContent = `Puntos: ${gameState.dealerScore || '?'}`;
        
        // Renderizar cartas
        this.renderCards(gameState.playerCards, 'player-cards');
        this.renderCards(gameState.dealerCards, 'dealer-cards');
    }
}
```

---

🔧 INSTALACIÓN RÁPIDA

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd transcendence-blackjack

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Levantar con Docker
docker-compose up --build

# 5. Acceder
# http://localhost:3000
```
