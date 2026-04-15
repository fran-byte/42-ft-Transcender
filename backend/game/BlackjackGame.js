const Deck = require("./Deck");

class BlackjackGame {
  constructor(id, emitUpdate, config = {}) {
    const normalizedConfig =
      typeof config === "number"
        ? { maxPlayers: config }
        : {
            maxPlayers: config.maxPlayers ?? 6,
            minBet: config.minBet ?? 5,
            maxBet: config.maxBet ?? 500,
            roomName: config.roomName ?? id,
            mode: config.mode ?? "Multiplayer",
          };

    this.id = id;
    this.emitUpdate = emitUpdate;

    this.maxPlayers = normalizedConfig.maxPlayers;
    this.minBet = normalizedConfig.minBet;
    this.maxBet = normalizedConfig.maxBet;
    this.roomName = normalizedConfig.roomName;
    this.mode = normalizedConfig.mode;

    this.deck = new Deck(6);
    this.players = {};
    this.playerOrder = [];
    this.spectators = [];

    this.dealerHand = [];
    this.gameState = "waiting";
    this.turn = null;
    this.turnTimer = null;

    this.DISCONNECT_GRACE_MS = 20000;
  }

  notifyStateChange() {
    if (typeof this.emitUpdate === "function") {
      this.emitUpdate(this.getPublicState());
    }
  }

  ensureSocketSet(entity) {
    if (!entity.socketIds || !(entity.socketIds instanceof Set)) {
      entity.socketIds = new Set();
    }
  }

  addSocketToEntity(entity, socketId) {
    this.ensureSocketSet(entity);
    if (socketId) entity.socketIds.add(socketId);
  }

  removeSocketFromEntity(entity, socketId) {
    this.ensureSocketSet(entity);
    if (socketId) entity.socketIds.delete(socketId);
  }

  hasActiveConnection(entity) {
    this.ensureSocketSet(entity);
    return entity.socketIds.size > 0;
  }

  getSeatedPlayersCount() {
    return this.playerOrder.filter((id) => !!this.players[id]).length;
  }

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
      if (!latestPlayer || this.hasActiveConnection(latestPlayer)) return;

      if (this.gameState === "playing") {
        latestPlayer.isDisconnected = true;
        latestPlayer.disconnectTimer = null;
        return;
      }

      delete this.players[userId];
      this.playerOrder = this.playerOrder.filter((id) => id !== userId);
      this.notifyStateChange();
    }, this.DISCONNECT_GRACE_MS);
  }

  scheduleSpectatorCleanup(userId) {
    const spectator = this.spectators.find((s) => s.userId === userId);
    if (!spectator) return;

    this.clearDisconnectTimerForSpectator(userId);

    spectator.disconnectTimer = setTimeout(() => {
      const latestSpectator = this.spectators.find((s) => s.userId === userId);
      if (!latestSpectator || this.hasActiveConnection(latestSpectator)) return;

      this.spectators = this.spectators.filter((s) => s.userId !== userId);
      this.notifyStateChange();
    }, this.DISCONNECT_GRACE_MS);
  }

  pruneDisconnectedWaitingUsers() {
    if (this.gameState !== "waiting") return;

    this.playerOrder = this.playerOrder.filter((id) => {
      const player = this.players[id];
      if (!player) return false;

      if (player.isDisconnected && !this.hasActiveConnection(player)) {
        this.clearDisconnectTimerForPlayer(id);
        delete this.players[id];
        return false;
      }

      return true;
    });

    this.spectators = this.spectators.filter((spec) => {
      if (spec.isDisconnected && !this.hasActiveConnection(spec)) {
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

      if (player.isDisconnected && !this.hasActiveConnection(player)) {
        this.clearDisconnectTimerForPlayer(id);
        delete this.players[id];
        return false;
      }

      return true;
    });

    this.spectators = this.spectators.filter((spec) => {
      if (spec.isDisconnected && !this.hasActiveConnection(spec)) {
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

  addPlayer(
    userId,
    socketId,
    username,
    avatar = null,
    preferredRole = "player",
    chips = null
  ) {
    const safeChips = Number.isFinite(chips) && chips >= 0 ? chips : 0;

    if (this.players[userId]) {
      console.log(`♻️ Reconexión: Actualizando socket de ${username}`);
      const player = this.players[userId];
      this.clearDisconnectTimerForPlayer(userId);
      this.addSocketToEntity(player, socketId);

      player.socketId = socketId;
      player.username = username;
      player.avatar = avatar;
      player.isDisconnected = false;

      return { role: "player", success: true, reconnected: true };
    }

    const existingSpectator = this.spectators.find((s) => s.userId === userId);
    if (existingSpectator) {
      this.clearDisconnectTimerForSpectator(userId);
      this.addSocketToEntity(existingSpectator, socketId);

      existingSpectator.username = username;
      existingSpectator.avatar = avatar;
      existingSpectator.isDisconnected = false;

      return { role: "spectator", success: true, reconnected: true };
    }

    if (preferredRole === "spectator") {
      const spectator = {
        userId,
        username,
        avatar,
        chips: safeChips,
        isDisconnected: false,
        disconnectTimer: null,
        socketIds: new Set(),
      };

      this.addSocketToEntity(spectator, socketId);
      this.spectators.push(spectator);

      return {
        role: "spectator",
        success: true,
        reason: "preferred_spectator",
      };
    }

    const tableFull = this.getSeatedPlayersCount() >= this.maxPlayers;
    const gameInProgress = this.gameState !== "waiting";

    if (tableFull || gameInProgress) {
      const spectator = {
        userId,
        username,
        avatar,
        chips: safeChips,
        isDisconnected: false,
        disconnectTimer: null,
        socketIds: new Set(),
      };

      this.addSocketToEntity(spectator, socketId);
      this.spectators.push(spectator);

      return {
        role: "spectator",
        success: true,
        reason: tableFull ? "table_full" : "game_in_progress",
      };
    }

    const player = {
      id: userId,
      username,
      avatar,
      hand: [],
      score: 0,
      status: "waiting",
      result: null,
      bet: 0,
      chips: safeChips,
      isSpectator: false,
      isDisconnected: false,
      disconnectTimer: null,
      socketIds: new Set(),
    };

    this.addSocketToEntity(player, socketId);
    this.players[userId] = player;
    this.playerOrder.push(userId);

    return { role: "player", success: true };
  }

  removePlayer(userId, socketId) {
    const player = this.players[userId];

    if (player) {
      this.removeSocketFromEntity(player, socketId);
      if (this.hasActiveConnection(player)) return;

      player.isDisconnected = true;
      this.schedulePlayerCleanup(userId);
      return;
    }

    const spectator = this.spectators.find((s) => s.userId === userId);
    if (spectator) {
      this.removeSocketFromEntity(spectator, socketId);
      if (this.hasActiveConnection(spectator)) return;

      console.log(`🔌 Jugador ${userId} desconectado. Esperando reconexión...`);
      spectator.isDisconnected = true;
      this.scheduleSpectatorCleanup(userId);
    }
  }

  placeBet(userId, amount) {
    if (this.gameState !== "waiting") return false;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return false;
    if (!Number.isFinite(amount) || amount <= 0) return false;

    if (player.isBetting) return false;
    player.isBetting = true;

    try {
      if (amount > player.chips) return false;

      const nextBet = player.bet + amount;

      if (nextBet > this.maxBet) return false;

      player.bet = nextBet;
      player.chips -= amount;

      return true;
    } finally {
      player.isBetting = false;
    }
  }

  clearBet(userId) {
    if (this.gameState !== "waiting") return false;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return false;

    player.chips += player.bet;
    player.bet = 0;
    return true;
  }

  updatePlayerWallet(userId, newBalance) {
    const player = this.players[userId];
    if (!player || player.isDisconnected) return false;

    if (!Number.isFinite(newBalance) || newBalance < 0) return false;

    if (this.gameState !== "waiting") return false;
    if ((player.bet ?? 0) > 0) return false;

    player.chips = newBalance;
    return true;
  }

  canStartRound() {
    if (this.gameState !== "waiting") return false;

    const activePlayers = this.getActivePlayerIds().map((id) => this.players[id]);
    if (activePlayers.length === 0) return false;

    return activePlayers.every(
      (player) =>
        player &&
        player.bet >= this.minBet &&
        player.bet <= this.maxBet
    );
  }

  promoteSpectatorsToPlayers() {
    if (this.gameState !== "waiting") return;

    while (
      this.spectators.length > 0 &&
      this.getSeatedPlayersCount() < this.maxPlayers
    ) {
      const spec = this.spectators[0];

      if (!spec || spec.isDisconnected || !this.hasActiveConnection(spec)) {
        this.clearDisconnectTimerForSpectator(spec?.userId);
        this.spectators.shift();
        continue;
      }

      this.spectators.shift();

      this.players[spec.userId] = {
        id: spec.userId,
        username: spec.username,
        avatar: spec.avatar || null,
        hand: [],
        score: 0,
        status: "waiting",
        result: null,
        bet: 0,
        chips: Number.isFinite(spec.chips) && spec.chips >= 0 ? spec.chips : 0,
        isDisconnected: false,
        isSpectator: false,
        disconnectTimer: null,
        socketIds: spec.socketIds || new Set(),
      };

      this.playerOrder.push(spec.userId);
    }
  }

  startRound(requestingUserId) {
    if (!this.players[requestingUserId]) return;
    if (this.playerOrder.length === 0) return;
    if (this.gameState === "playing") return;
    if (!this.canStartRound()) return;

    const activePlayerIds = this.getActivePlayerIds();
    if (activePlayerIds.length === 0) return;

    this.playerOrder = activePlayerIds;

    this.clearTurnTimer();
    this.deck.reset();
    this.gameState = "playing";
    this.dealerHand = this.deck.deal(2);

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (!player) return;

      player.hand = this.deck.deal(2);
      player.score = this.calculateScore(player.hand);
      player.status = "playing";
      player.result = null;

      if (player.score === 21) {
        player.status = "blackjack";
      }
    });

    this.turn = this.playerOrder[0];

    if (
      (this.players[this.turn] &&
        this.players[this.turn].status === "blackjack") ||
      this.players[this.turn]?.score === 21
    ) {
      this.nextTurn();
    } else {
      this.startTurnTimer();
    }
  }

  hit(userId) {
    if (this.gameState !== "playing" || this.turn !== userId) return;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return;

    this.clearTurnTimer();

    player.hand.push(this.deck.deal(1)[0]);
    player.score = this.calculateScore(player.hand);

    if (player.score >= 21) {
      if (player.score > 21) player.status = "busted";
      else player.status = "stood";
      this.nextTurn();
    } else {
      this.startTurnTimer();
    }
  }

  stand(userId) {
    if (this.gameState !== "playing" || this.turn !== userId) return;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return;

    this.clearTurnTimer();
    player.status = "stood";
    this.nextTurn();
  }

  startTurnTimer() {
    this.clearTurnTimer();
    const currentTurnUserId = this.turn;

    this.turnTimer = setTimeout(() => {
      console.log(`⏰ TIEMPO AGOTADO para ${currentTurnUserId}. STAND automático.`);
      this.stand(currentTurnUserId);

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

      if (nextPlayer.status === "blackjack" || nextPlayer.score === 21) {
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
    this.turn = "dealer";
    let dealerScore = this.calculateScore(this.dealerHand);

    while (dealerScore < 17) {
      this.dealerHand.push(this.deck.deal(1)[0]);
      dealerScore = this.calculateScore(this.dealerHand);
    }

    this.gameState = "finished";
    this.resolveWinners();
  }

  resolveWinners() {
    const dealerScore = this.calculateScore(this.dealerHand);

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (!player) return;

      if (player.status === "blackjack" && dealerScore !== 21) {
        player.result = "win";
        player.chips += Math.floor(player.bet * 2.5);
      } else if (player.status === "busted") {
        player.result = "lose";
      } else if (dealerScore > 21) {
        player.result = "win";
        player.chips += player.bet * 2;
      } else if (player.score > dealerScore) {
        player.result = "win";
        player.chips += player.bet * 2;
      } else if (player.score < dealerScore) {
        player.result = "lose";
      } else {
        player.result = "push";
        player.chips += player.bet;
      }

      if (player.chips < 0) player.chips = 0;
    });
  }

  calculateScore(hand) {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
      if (["J", "Q", "K"].includes(card.value)) {
        score += 10;
      } else if (card.value === "A") {
        aces += 1;
        score += 11;
      } else {
        score += parseInt(card.value, 10);
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score;
  }

  resetRound() {
    this.clearTurnTimer();
    this.gameState = "waiting";
    this.dealerHand = [];
    this.turn = null;
    this.deck.reset();

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (!player) return;

      player.hand = [];
      player.score = 0;
      player.status = "waiting";
      player.result = null;
      player.bet = 0;
    });

    this.cleanupDisconnectedAfterRound();
    this.promoteSpectatorsToPlayers();
  }

  getPublicState() {
    const visibleHand =
      this.gameState === "playing" ? [this.dealerHand[0]] : this.dealerHand;

    const publicPlayers = {};

    this.playerOrder.forEach((id) => {
      const p = this.players[id];
      if (!p) return;

      publicPlayers[id] = {
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        hand: p.hand,
        score: p.score,
        status: p.status,
        result: p.result,
        bet: p.bet,
        chips: p.chips,
        isDisconnected: p.isDisconnected,
        connectedSockets: p.socketIds ? p.socketIds.size : 0,
      };
    });

    return {
      id: this.id,
      roomName: this.roomName,
      mode: this.mode,
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
        connectedSockets: s.socketIds ? s.socketIds.size : 0,
      })),
      maxPlayers: this.maxPlayers,
      minBet: this.minBet,
      maxBet: this.maxBet,
      canStart: this.canStartRound(),
    };
  }
}

module.exports = BlackjackGame;