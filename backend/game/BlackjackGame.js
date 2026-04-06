const Deck = require('./Deck');

class BlackjackGame {
    constructor(id, emitUpdate, maxPlayers = 6) {
        this.id = id;
        this.emitUpdate = emitUpdate;
        this.maxPlayers = maxPlayers;
        this.deck = new Deck(6);
        this.players = {}; // CLAVE: userId (persistencia entre F5)
        this.playerOrder = []; // LISTA: userId
        this.spectators = []; // Lista de espera
        this.dealerHand = [];
        this.gameState = 'waiting'; 
        this.turn = null; 
        this.turnTimer = null; 

        this.DISCONNECT_GRACE_MS = 20000;
    }
      // -------------------------
  // HELPERS DE DESCONEXIÓN
  // -------------------------
  clearDisconnectTimerForPlayer(userId) {
    const player = this.players[userId];
    if (player?.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
  }

  clearDisconnectTimerForSpectator(userId) {
    const spectator = this.spectators.find((s) => s.userId === userId);
    if (spectator?.disconnectTimer) {
      clearTimeout(spectator.disconnectTimer);
      spectator.disconnectTimer = null;
    }
  }

  schedulePlayerCleanup(userId) {
    const player = this.players[userId];
    if (!player) return;

    this.clearDisconnectTimerForPlayer(userId);

    player.disconnectTimer = setTimeout(() => {
      const latestPlayer = this.players[userId];
      if (!latestPlayer || latestPlayer.socketId) return;

      // Si sigue jugando, no lo borramos en mitad de ronda
      if (this.gameState === "playing") {
        latestPlayer.isDisconnected = true;
        latestPlayer.disconnectTimer = null;
        return;
      }

      delete this.players[userId];
      this.playerOrder = this.playerOrder.filter((id) => id !== userId);
      this.emitState();
    }, this.DISCONNECT_GRACE_MS);
  }

  scheduleSpectatorCleanup(userId) {
    const spectator = this.spectators.find((s) => s.userId === userId);
    if (!spectator) return;

    this.clearDisconnectTimerForSpectator(userId);

    spectator.disconnectTimer = setTimeout(() => {
      const latestSpectator = this.spectators.find((s) => s.userId === userId);
      if (!latestSpectator || latestSpectator.socketId) return;

      this.spectators = this.spectators.filter((s) => s.userId !== userId);
      this.emitState();
    }, this.DISCONNECT_GRACE_MS);
  }

  pruneDisconnectedWaitingUsers() {
    if (this.gameState !== "waiting") return;

    this.playerOrder = this.playerOrder.filter((id) => {
      const player = this.players[id];
      if (!player) return false;

      if (player.isDisconnected && !player.socketId) {
        this.clearDisconnectTimerForPlayer(id);
        delete this.players[id];
        return false;
      }

      return true;
    });

    this.spectators = this.spectators.filter((spec) => {
      if (spec.isDisconnected && !spec.socketId) {
        this.clearDisconnectTimerForSpectator(spec.userId);
        return false;
      }
      return true;
    });
  }

  cleanupDisconnectedAfterRound() {
    this.playerOrder = this.playerOrder.filter((id) => {
      const player = this.players[id];
      if (!player) return false;

      if (player.isDisconnected && !player.socketId) {
        this.clearDisconnectTimerForPlayer(id);
        delete this.players[id];
        return false;
      }

      return true;
    });

    this.spectators = this.spectators.filter((spec) => {
      if (spec.isDisconnected && !spec.socketId) {
        this.clearDisconnectTimerForSpectator(spec.userId);
        return false;
      }
      return true;
    });
  }

  getActivePlayerIds() {
    return this.playerOrder.filter((id) => {
      const player = this.players[id];
      return player && !player.isDisconnected;
    });
  }

    // --- MANEJO DE JUGADORES (Con soporte F5) ---
    addPlayer(userId, socketId, username, avatar = null, preferredRole = "player") {
        // Si el usuario ya está en la mesa (por ejemplo, tras un F5)
        if (this.players[userId]) {
            console.log(`♻️ Reconexión: Actualizando socket de ${username}`);
            const player = this.players[userId];
            this.clearDisconnectTimerForPlayer(userId);
            player.socketId = socketId;
            player.username = username;
            player.avatar = avatar;
            player.isDisconnected = false;

            return { role: "player", success: true, reconnected: true };
        }

        // Reconexión como spectator
        const existingSpectator = this.spectators.find((s) => s.userId === userId);
        if (existingSpectator) {
            this.clearDisconnectTimerForSpectator(userId);

            existingSpectator.socketId = socketId;
            existingSpectator.username = username;
            existingSpectator.avatar = avatar;
            existingSpectator.isDisconnected = false;

            return { role: "spectator", success: true, reconnected: true };
        }

        // Si el usuario pide entrar como spectator, lo respetamos
        if (preferredRole === "spectator") {
            this.spectators.push({
                userId,
                socketId,
                username,
                avatar,
                isDisconnected: false,
                disconnectTimer: null,
        });

        return { role: "spectator", success: true, reason: "preferred_spectator" };
        }

        const tableFull = this.playerOrder.length >= this.maxPlayers;
        const gameInProgress = this.gameState !== 'waiting';

        // Si la partida está en curso o la mesa llena -> espectador
        if (tableFull || gameInProgress) {
            this.spectators.push({ userId, socketId, username, avatar, isDisconnected: false, disconnectTimer: null, });
            return { role: 'spectator', success: true, reason: tableFull ? 'table_full' : 'game_in_progress'};
        }

        // Nuevo asiento en la mesa
        this.players[userId] = {
            id: userId,
            username,
            avatar,
            socketId,
            hand: [],
            score: 0,
            status: 'waiting', 
            result: null,
            bet: 0,
            isSpectator: false,
            isDisconnected: false,
            disconnectTimer: null,
        };
        
        this.playerOrder.push(userId);
        return { role: 'player', success: true };
    }

    removePlayer(userId, socketId) {
        const player = this.players[userId];

        if (player) {
        // Ignoramos disconnects viejos
            if (player.socketId && player.socketId !== socketId) {
                return;
            }

            player.socketId = null;
            player.isDisconnected = true;
            this.schedulePlayerCleanup(userId);
            return;
        }

        const spectator = this.spectators.find((s) => s.userId === userId);
        if (spectator) {
        // Ignoramos disconnects viejos
            if (spectator.socketId && spectator.socketId !== socketId) {
                return;
            }

            console.log(`🔌 Jugador ${userId} desconectado. Esperando reconexión...`);
            spectator.socketId = null;
            spectator.isDisconnected = true;
            this.scheduleSpectatorCleanup(userId);
        }
    }

    // --- LOGICA DE BETS ---
    placeBet(userId, amount) {
        if (this.gameState !== "waiting") return false;
        if (!this.players[userId]) return false;
        if (this.players[userId].isDisconnected) return false;
        if (!Number.isFinite(amount) || amount <= 0) return false;

        this.players[userId].bet += amount;
        return true;
    }

    clearBet(userId) {
        if (this.gameState !== "waiting") return false;
        if (!this.players[userId]) return false;
        if (this.players[userId].isDisconnected) return false;

        this.players[userId].bet = 0;
        return true;
    }

    canStartRound() {
        if (this.gameState !== "waiting") return false;

        const activePlayers = this.getActivePlayerIds().map((id) => this.players[id]);

        if (activePlayers.length === 0) return false;

        return activePlayers.every((player) => player && player.bet > 0);
    }

    // Los espectadores pueden entrar a la partida cuando acaba
    promoteSpectatorsToPlayers() {
        if (this.gameState !== "waiting") return;

        while (
        this.spectators.length > 0 &&
        this.playerOrder.length < this.maxPlayers
        ) {
        const spec = this.spectators[0];

        // Si está desconectado, lo saltamos y borramos
        if (!spec || spec.isDisconnected || !spec.socketId) {
            this.clearDisconnectTimerForSpectator(spec?.userId);
            this.spectators.shift();
            continue;
        }

        this.spectators.shift();

        this.players[spec.userId] = {
            id: spec.userId,
            socketId: spec.socketId,
            username: spec.username,
            avatar: spec.avatar || null,
            hand: [],
            score: 0,
            status: "waiting",
            result: null,
            bet: 0,
            isDisconnected: false,
            isSpectator: false,
            disconnectTimer: null,
        };

        this.playerOrder.push(spec.userId);
        }
    }
    // --- LÓGICA DE PARTIDA ---
    startRound(requestingUserId) {
        if (!this.players[requestingUserId]) return;
        if (this.playerOrder.length === 0) return;
        if (this.gameState === "playing") return;
        if (!this.canStartRound()) return;
    
        const activePlayerIds = this.getActivePlayerIds();
        if (activePlayerIds.length === 0) return;

        // Reordenamos para que solo jueguen los activos
        this.playerOrder = activePlayerIds;
        
        this.clearTurnTimer();
        this.deck.reset();
        this.gameState = 'playing';
        this.dealerHand = this.deck.deal(2);

        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if (!player) return;

            player.hand = this.deck.deal(2);
            player.score = this.calculateScore(player.hand);
            player.status = 'playing';
            player.result = null;

            // --- CORRECCIÓN 21 NATURAL ---
            if (player.score === 21) {
                player.status = 'blackjack';
            }
        });

        this.turn = this.playerOrder[0];
        
        // Si el primer jugador tiene Blackjack o 21, saltamos turno automáticamente
        if (this.players[this.turn].status === 'blackjack' || this.players[this.turn].score === 21) {
            this.nextTurn();
        } else {
            this.startTurnTimer();
        }
    }

    hit(userId) {
        if (this.gameState !== 'playing' || this.turn !== userId) return;

        const player = this.players[userId]; 
        if (!player || player.isDisconnected) return;

        this.clearTurnTimer();

        player.hand.push(this.deck.deal(1)[0]);
        player.score = this.calculateScore(player.hand);

        if (player.score >= 21) {
            if (player.score > 21) player.status = 'busted';
            else player.status = 'stood'; // 21 exactos obliga a plantarse
            this.nextTurn();
        } else {
            this.startTurnTimer();
        }
    }

    stand(userId) {
        if (this.gameState !== 'playing' || this.turn !== userId) return;

        const player = this.players[userId];
        if (!player || player.isDisconnected) return;
        this.clearTurnTimer();
        player.status = 'stood';
        this.nextTurn();
    }

    // --- TEMPORIZADOR ANTI-AFK ---
    startTurnTimer() {
        this.clearTurnTimer();
        const currentTurnUserId = this.turn;

        this.turnTimer = setTimeout(() => {
            console.log(`⏰ TIEMPO AGOTADO para ${currentTurnUserId}. STAND automático.`);
            this.stand(currentTurnUserId);
            
            // Forzamos actualización visual a todos
            if (this.emitUpdate) this.emitUpdate(this.getPublicState());
        }, 15000); 
    }

    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
    }

    nextTurn() {
        const currentIndex = this.playerOrder.indexOf(this.turn);
        
        if (currentIndex < this.playerOrder.length - 1) {
            const nextUserId = this.playerOrder[currentIndex + 1];
            this.turn = nextUserId;

            const nextPlayer = this.players[nextUserId];

            if (!nextPlayer || nextPlayer.isDisconnected) {
                this.nextTurn();
                return;
            }
            // --- CORRECCIÓN 21 NATURAL (Salto automático) ---
            if (nextPlayer.status === "blackjack" ||
                nextPlayer.score === 21) {
                this.nextTurn();
            } else {
                this.startTurnTimer();
            }
        } else {
            this.clearTurnTimer();
            this.playDealerTurn();
        }
    }

    playDealerTurn() {
        this.turn = 'dealer';
        let dealerScore = this.calculateScore(this.dealerHand);

        while (dealerScore < 17) {
            this.dealerHand.push(this.deck.deal(1)[0]);
            dealerScore = this.calculateScore(this.dealerHand);
        }

        this.gameState = 'finished';
        this.resolveWinners();
    }

    resolveWinners() {
        const dealerScore = this.calculateScore(this.dealerHand);
        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if(!player) return;

            if (player.status === 'blackjack' && dealerScore !== 21) player.result = 'win';
            else if (player.status === 'busted') player.result = 'lose';
            else if (dealerScore > 21) player.result = 'win';
            else if (player.score > dealerScore) player.result = 'win';
            else if (player.score < dealerScore) player.result = 'lose';
            else player.result = 'push';
        });
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        for (let card of hand) {
            if (['J', 'Q', 'K'].includes(card.value)) score += 10;
            else if (card.value === 'A') { aces += 1; score += 11; }
            else score += parseInt(card.value);
        }
        while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
        return score;
    }

    resetRound() {
        this.clearTurnTimer();
        this.gameState = 'waiting';
        this.dealerHand = [];
        this.turn = null;
        this.deck.reset();

        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if(!player) return;
            player.hand = [];
            player.score = 0;
            player.status = 'waiting';
            player.result = null;
            player.bet = 0;
        });
        this.cleanupDisconnectedAfterRound();
        this.promoteSpectatorsToPlayers();
    }

    getPublicState() {
        const visibleHand = (this.gameState === 'playing') ? [this.dealerHand[0]] : this.dealerHand;
        
        const publicPlayers = {};

        this.playerOrder.forEach(id => {
            const p = this.players[id];
            if (!p) 
                return;

            publicPlayers[id] = {
                id: p.id,
                username:p.username,
                avatar:p.avatar,
                hand: p.hand,
                score: p.score,
                status: p.status,
                result: p.result,
                bet: p.bet,
                isDisconnected: p.isDisconnected,
        };
    });

    return {
            id: this.id,
            gameState: this.gameState,
            turn: this.turn,
            dealerHand: visibleHand,
            dealerScore: this.calculateScore(visibleHand),
            playerOrder: this.playerOrder,
            players: publicPlayers,
            spectators: this.spectators.map((s) => ({
                id: s.userId,
                username: s.username,
                avatar: s.avatar || null,
                isDisconnected: !!s.isDisconnected,
            })),
            maxPlayers: this.maxPlayers,
            canStart: this.canStartRound(),
        };
    }
}
            
module.exports = BlackjackGame;