
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

⏱️ PLAN DE TRABAJO POR SEMANAS

Semana 1:

· Persona A: Docker + entorno
· Persona B: Lógica básica del Blackjack (mazo, valores)
· Persona C: Diseño de la mesa y cartas estáticas
· Persona D: Esquema BD + modelo de usuario con fichas

Semana 2:

· Persona B: API completa (deal, hit, stand, dealer)
· Persona C: Interactividad (botones, actualización UI)
· Persona D: Sistema de apuestas y transacciones
· Integración básica

Semana 3:

· Persona B: WebSocket para multijugador (si aplica)
· Persona C: Animaciones y efectos
· Persona D: Estadísticas y leaderboard
· Testing y pulido final

---

