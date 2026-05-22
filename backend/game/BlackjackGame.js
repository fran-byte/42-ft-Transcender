import Deck from "./Deck.js";

export default class BlackjackGame {
  constructor(
    id,
    emitUpdate,
    config = {},
    onAITurn = null,
    syncBalance = null,
    onRoundFinished = null) {
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
    this.onAITurn = onAITurn;
    this.syncBalance = syncBalance;
    this.onRoundFinished = onRoundFinished;

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
    this.nextRoundTimer = null;

    this.NEXT_ROUND_GRACE_MS = 10000;           // waits for host to press next round
    this.DISCONNECT_GRACE_MS = 15000;           // waits for player to reconnect before marking as disconnected
    this.DISCONNECTED_TURN_GRACE_MS = 15000;    // waits for disconnected player's turn to end before auto-playing for them or skipping their turn
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

  getHumanPlayerIds() {
    return this.playerOrder.filter((id) => {
      const player = this.players[id];
      return player && !player.isAI && !player.isDisconnected;
    });
  }

  clearNextRoundTimer() {
    if (this.nextRoundTimer) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
  }

  startNextRoundTimer() {
    this.clearNextRoundTimer();

    if (this.gameState !== "finished") return;

    const hostId = this.playerOrder[0];
    const host = this.players[hostId];

    if (!host || host.isAI) return;

    this.nextRoundTimer = setTimeout(() => {
      const latestHost = this.players[hostId];
      if (!latestHost || latestHost.isAI || this.gameState !== "finished") return;

      latestHost.isDisconnected = true;
      latestHost.disconnectTimer = null;

      this.clearNextRoundTimer();

      this.resetRound();

      this.notifyStateChange();
    }, this.NEXT_ROUND_GRACE_MS);
  }

  startDisconnectedTurnGrace(userId) {
    this.clearTurnTimer();

    this.turnTimer = setTimeout(async () => {
      const player = this.players[userId];

      if (!player) return;
      if (!player.isDisconnected) return;
      if (this.gameState !== "playing") return;
      if (this.turn !== userId) return;

      player.status = "stood";

      await this.nextTurn();

      this.notifyStateChange();
    }, this.DISCONNECTED_TURN_GRACE_MS);
  }

  ensureHumanHost() {
    if (this.playerOrder.length === 0) return;

    const currentHost = this.players[this.playerOrder[0]];

    if (currentHost && !currentHost.isAI && !currentHost.isDisconnected) return;

    const humanHostId = this.getHumanPlayerIds()[0];

    if (!humanHostId) return;

    this.playerOrder = [
      humanHostId,
      ...this.playerOrder.filter((id) => id !== humanHostId),
    ];
  }

  schedulePlayerCleanup(userId) {
    const player = this.players[userId];
    if (!player) return;

    this.clearDisconnectTimerForPlayer(userId);

    player.disconnectTimer = setTimeout(() => {
      const latestPlayer = this.players[userId];
      if (!latestPlayer || this.hasActiveConnection(latestPlayer)) return;

      latestPlayer.isDisconnected = true;
      latestPlayer.disconnectTimer = null;

      this.pruneDisconnectedUser();

      const onlyBotsReset = this.resetToWaitingIfOnlyBotsRemain();
      //this.resetToWaitingIfOnlyBotsRemain();
      
      this.promoteSpectatorsToPlayers();
      this.ensureHumanHost();

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

  pruneDisconnectedUser() {
    //if (this.gameState !== "waiting") return;

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

  // ✅ BUG FIX (commit 7404696): trailing comma added to chips parameter
  addPlayer(
    userId,
    socketId,
    username,
    avatar = null,
    preferredRole = "player",
    chips = null,
  ) {
    const safeChips = Number.isFinite(chips) && chips >= 0 ? chips : 0;

    if (this.players[userId]) {
      const player = this.players[userId];
      this.clearDisconnectTimerForPlayer(userId);
      this.addSocketToEntity(player, socketId);

      player.socketId = socketId;
      player.username = username;
      player.avatar = avatar;
      player.isDisconnected = false;
      
      if (this.turn === userId && this.gameState === "playing") {
        this.clearTurnTimer();
        this.startTurnTimer();
      }

      return { role: "player", success: true, reconnected: true };
    }

   const existingSpectatorIndex = this.spectators.findIndex(
      (s) => s.userId === userId
    );

    if (existingSpectatorIndex !== -1) {
      const existingSpectator = this.spectators[existingSpectatorIndex];

      this.clearDisconnectTimerForSpectator(userId);
      this.addSocketToEntity(existingSpectator, socketId);

      existingSpectator.username = username;
      existingSpectator.avatar = avatar;
      existingSpectator.isDisconnected = false;

      const canJoinAsPlayer =
        this.gameState === "waiting" &&
        this.getSeatedPlayersCount() < this.maxPlayers;

      if (canJoinAsPlayer) {
        this.spectators.splice(existingSpectatorIndex, 1);

        this.players[userId] = {
          id: userId,
          username,
          avatar,
          hand: [],
          score: 0,
          status: "waiting",
          result: null,
          bet: 0,
          chips: Number.isFinite(existingSpectator.chips)
            ? existingSpectator.chips
            : safeChips,
          isSpectator: false,
          isDisconnected: false,
          disconnectTimer: null,
          socketIds: existingSpectator.socketIds || new Set(),
        };

        this.playerOrder.push(userId);
        this.ensureHumanHost();

        return { role: "player", success: true, promoted: true };
      }

      return { role: "spectator", success: true, reconnected: true };
    }

    if (preferredRole === "spectator" &&
      (this.gameState !== "waiting" || this.getSeatedPlayersCount() >= this.maxPlayers)) {
      const spectator = {
        userId,
        username,
        avatar,
        chips: safeChips,
        preferredSpectator: true,
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
        preferredSpectator: false,
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
    this.ensureHumanHost();

    return { role: "player", success: true };
  }

  addAIPlayer(botId, botName = "Dealer Bot") {
    if (this.getHumanPlayerIds().length === 0) {
      return { success: false, reason: "human_host_required" };
    }

    if (this.getSeatedPlayersCount() >= this.maxPlayers) {
      return { success: false, reason: "table_full" };
    }

    if (this.players[botId]) {
      return { success: true, reason: "already_exists" };
    }

    const player = {
      id: botId,
      username: botName,
      avatar: null,
      hand: [],
      score: 0,
      status: "waiting",
      result: null,
      bet: 0,
      chips: 1000,
      isSpectator: false,
      isDisconnected: false,
      isAI: true,
      disconnectTimer: null,
      socketIds: new Set(),
    };

    this.players[botId] = player;
    this.playerOrder.push(botId);

    return {
      success: true,
      reason: "ai_added",
      player: { id: botId, username: botName },
    };
  }

  removeAIPlayer(botId) {
    const player = this.players[botId];

    if (!player || !player.isAI) {
      return { success: false, reason: "not_found" };
    }

    delete this.players[botId];
    this.playerOrder = this.playerOrder.filter((id) => id !== botId);

    if (this.gameState === "waiting") {
      this.promoteSpectatorsToPlayers();
      this.ensureHumanHost();
    }

    return { success: true, reason: "ai_removed" };
  }

  getDeckInfo() {
    return {
      cards: [...this.deck.cards],
      total: 312,
      remaining: this.deck.cards.length,
    };
  }

  calculateAdvantage() {
    const cards = this.deck.cards;
    if (cards.length === 0) return 0;

    let runningCount = 0;
    for (const card of cards) {
      const v = card.value;
      if (["2", "3", "4", "5", "6"].includes(v)) {
        runningCount += 1;
      } else if (["10", "J", "Q", "K", "A"].includes(v)) {
        runningCount -= 1;
      }
    }

    const numDecks = cards.length / 52;
    const trueCount = numDecks > 0 ? runningCount / numDecks : 0;

    const baseAdvantage = -0.005;
    const advantage = baseAdvantage + trueCount * 0.005;

    return advantage;
  }

  calculateKellyBet(userId) {
    const player = this.players[userId];
    if (!player || player.chips <= 0) return 0;

    const advantage = this.calculateAdvantage();
    const bankroll = player.chips;
    const minBet = this.minBet;
    const maxBet = this.maxBet;

    console.log(
      `📊 Kelly debug: player=${userId}, bankroll=${bankroll}, advantage=${advantage}, minBet=${minBet}, maxBet=${maxBet}`,
    );

    const p = 0.5 + advantage;
    const odds = 1.5;
    const kellyFraction = (odds * p - (1 - p)) / odds;
    const halfKelly = Math.max(0, kellyFraction * 0.5);

    let bet = halfKelly * bankroll;

    console.log(
      `📊 Kelly debug: p=${p}, kellyFraction=${kellyFraction}, halfKelly=${halfKelly}, bet_raw=${bet}`,
    );

    bet = Math.max(minBet, Math.min(maxBet, Math.floor(bet)));

    console.log(`📊 Kelly debug: bet_final=${bet}`);

    if (bet < minBet) {
      bet = minBet;
    }
    if (bet > player.chips) {
      bet = player.chips;
    }

    return bet;
  }

  aiPlaceBets() {
    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (!player?.isAI) return;

      console.log(
        `🤖 IA ${id} tiene chips=${player.chips}, bet_actual=${player.bet}`,
      );

      if (player.chips <= 0 && player.bet === 0) {
        console.log(
          `🤖 IA ${id} sin fichas ni apuesta. Eliminando después de ronda.`,
        );
        return;
      }

      if (player.chips > 0 && player.bet === 0) {
        const betAmount = this.calculateKellyBet(id);
        console.log(`🤖 IA ${id} calculado Kelly bet: ${betAmount}`);

        if (betAmount > 0) {
          this.placeBet(id, betAmount);
          console.log(
            `🤖 IA ${id} apostó: ${betAmount}, chips restantes: ${player.chips}`,
          );
        }
      }
    });
  }

  removePlayer(userId, socketId) {
    const player = this.players[userId];

    if (player) {
      this.removeSocketFromEntity(player, socketId);
      if (this.hasActiveConnection(player)) 
      {
        //this.clearDisconnectTimerForPlayer(userId);
        //this.clearNextRoundTimer();
        return;
      }
      player.isDisconnected = true;
      this.schedulePlayerCleanup(userId);

      if (this.gameState === "playing" && this.turn === userId) {
        this.startDisconnectedTurnGrace(userId);
      }

      this.notifyStateChange();
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

  resetToWaitingIfOnlyBotsRemain() {
    const humanPlayers = this.getHumanPlayerIds();

    if (humanPlayers.length > 0) return false;

    this.clearTurnTimer();
    this.gameState = "waiting";
    this.turn = null;
    this.dealerHand = [];
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

    return true;
  }

  leavePlayer(userId, socketId) {
    const player = this.players[userId];

    if (player) {
      const wasCurrentTurn = this.turn === userId;

      this.removeSocketFromEntity(player, socketId);

      if (!this.hasActiveConnection(player)) {
        this.clearNextRoundTimer();
        this.clearDisconnectTimerForPlayer(userId);
        delete this.players[userId];
        this.playerOrder = this.playerOrder.filter((id) => id !== userId);
        this.ensureHumanHost();
      }

      const onlyBotsReset = this.resetToWaitingIfOnlyBotsRemain();

      this.promoteSpectatorsToPlayers();
      this.ensureHumanHost();

      if (!onlyBotsReset && wasCurrentTurn && this.gameState === "playing") {
        if (this.playerOrder.length === 0) {
          this.clearTurnTimer();
          this.playDealerTurn();
        } else {
          const nextPlayerId = this.playerOrder[0];
          this.turn = nextPlayerId;
          this.startTurnTimer();
        }
      }

      this.notifyStateChange();
      return;
    }

    const spectator = this.spectators.find((s) => s.userId === userId);

    if (spectator) {
      this.removeSocketFromEntity(spectator, socketId);

      if (!this.hasActiveConnection(spectator)) {
        this.clearDisconnectTimerForSpectator(userId);
        this.spectators = this.spectators.filter((s) => s.userId !== userId);
      }

      this.notifyStateChange();
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

  // Pure check used by getPublicState() — no side effects.
  // AI players are treated as always ready (they auto-bet when canStartRound() is called).
  canStartRoundCheck() {
    if (this.gameState !== "waiting") return false;

    const humanPlayers = this.getHumanPlayerIds();
    if (humanPlayers.length === 0) return false;

    const activePlayers = this.getActivePlayerIds().map(
      (id) => this.players[id],
    );

    if (activePlayers.length === 0) return false;

    return activePlayers.every((player) => {
      if (player?.isAI) return true;
      return player && player.bet >= this.minBet && player.bet <= this.maxBet;
    });
  }

  // Places AI bets then validates all bets. Called only from start_round handler and startRound().
  canStartRound() {
    if (this.gameState !== "waiting") return false;

    const humanPlayers = this.getHumanPlayerIds();
    if (humanPlayers.length === 0) return false;

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (player?.isAI && player.bet === 0) {
        const betAmount = this.calculateKellyBet(id);
        if (betAmount > 0) this.placeBet(id, betAmount);
      }
    });

    const activePlayers = this.getActivePlayerIds().map(
      (id) => this.players[id],
    );

    if (activePlayers.length === 0) return false;

    return activePlayers.every((player) => {
      if (player?.isAI) return true;
      return player && player.bet >= this.minBet && player.bet <= this.maxBet;
    });
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

      if (spec.preferredSpectator) {
        this.spectators.push(this.spectators.shift());
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

  async startRound(requestingUserId) {
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
      await this.nextTurn();
    } else {
      await this.startTurnTimer();
    }
  }

  async hit(userId) {
    if (this.gameState !== "playing" || this.turn !== userId) return;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return;

    this.clearTurnTimer();

    player.hand.push(this.deck.deal(1)[0]);
    player.score = this.calculateScore(player.hand);

    if (player.score >= 21) {
      player.status = player.score > 21 ? "busted" : "stood";
      await this.nextTurn();
    } else {
      await this.startTurnTimer();
    }
  }

  async stand(userId) {
    if (this.gameState !== "playing" || this.turn !== userId) return;

    const player = this.players[userId];
    if (!player || player.isDisconnected) return;

    this.clearTurnTimer();
    player.status = "stood";
    await this.nextTurn();
  }

  canDouble(userId) {
    if (this.gameState !== "playing" || this.turn !== userId) return false;
    const player = this.players[userId];
    if (!player || player.isDisconnected) return false;
    if (!Array.isArray(player.hand) || player.hand.length !== 2) return false;
    if (typeof player.bet !== "number" || player.bet <= 0) return false;
    if (player.chips < player.bet) return false;
    return true;
  }

  async doubleDown(userId) {
    if (!this.canDouble(userId)) return false;

    const player = this.players[userId];
    this.clearTurnTimer();

    player.chips -= player.bet;
    player.bet *= 2;

    player.hand.push(this.deck.deal(1)[0]);
    player.score = this.calculateScore(player.hand);
    player.status = player.score > 21 ? "busted" : "stood";

    await this.nextTurn();
    return true;
  }

  async startTurnTimer() {
    this.clearTurnTimer();
    const currentTurnUserId = this.turn;
    const currentPlayer = this.players[currentTurnUserId];

    if (currentPlayer?.isAI && this.onAITurn) {
      await this.onAITurn(currentTurnUserId, currentPlayer, this.dealerHand[0]);
      return;
    }

    this.turnTimer = setTimeout(async () => {
      // If player is disconnected, skip to next player
      if (currentPlayer?.isDisconnected) {
        console.log(
          `⏰ Turno del jugador desconectado ${currentTurnUserId} agotado. Pasando al siguiente.`
        );
        await this.nextTurn();
      } else {
        console.log(
          `⏰ TIEMPO AGOTADO para ${currentTurnUserId}. STAND automático.`,
        );
        await this.stand(currentTurnUserId);
      }
      if (this.emitUpdate) this.emitUpdate(this.getPublicState());
    }, 15000);
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  async nextTurn() {
    const currentIndex = this.playerOrder.indexOf(this.turn);

    if (currentIndex < this.playerOrder.length - 1) {
      const nextUserId = this.playerOrder[currentIndex + 1];
      this.turn = nextUserId;

      const nextPlayer = this.players[nextUserId];

      if (!nextPlayer || nextPlayer.isDisconnected) {
        await this.nextTurn();
        return;
      }

      if (nextPlayer.status === "blackjack" || nextPlayer.score === 21) {
        await this.nextTurn();
      } else {
        await this.startTurnTimer();
      }
    } else {
      this.clearTurnTimer();
      await this.playDealerTurn();
    }
  }

  async playDealerTurn() {
    this.turn = "dealer";
    let dealerScore = this.calculateScore(this.dealerHand);

    while (dealerScore < 17) {
      this.dealerHand.push(this.deck.deal(1)[0]);
      dealerScore = this.calculateScore(this.dealerHand);
    }

    this.gameState = "finished";
    this.resolveWinners();
    if (this.onRoundFinished) await this.onRoundFinished(this);
      this.startNextRoundTimer();
  }

  resolveWinners() {
    const dealerScore = this.calculateScore(this.dealerHand);
    console.log(`🃏Resolver ganadores: dealerScore=${dealerScore}`);

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (!player) return;
      const betAmount = player.bet;
      const chipsBefore = player.chips;

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

      const chipsChanged = player.chips !== chipsBefore;
      console.log(
        `🏆 user=${id}, result=${player.result}, bet=${betAmount}, chips_before=${chipsBefore}, chips_after=${player.chips}, changed=${chipsChanged}`,
      );
    });

    this.playerOrder.forEach((id) => {
      const player = this.players[id];
      if (player?.isAI && player.chips <= 0) {
        console.log(`🤖 IA ${id} sin fiches. Eliminando.`);
        delete this.players[id];
        this.playerOrder = this.playerOrder.filter((pid) => pid !== id);
      }
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

  hasUsableAce(hand) {
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

    if (aces === 0) return false;

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score < 21 && aces > 0;
  }

  getTrueCount() {
    const cards = this.deck.cards;
    if (cards.length === 0) return 0;

    let runningCount = 0;
    for (const card of cards) {
      const v = card.value;
      if (["2", "3", "4", "5", "6"].includes(v)) runningCount += 1;
      else if (["10", "J", "Q", "K", "A"].includes(v)) runningCount -= 1;
    }

    const numDecks = cards.length / 52;
    return numDecks > 0 ? runningCount / numDecks : 0;
  }

    resetRound() {
      this.clearNextRoundTimer();
      this.clearTurnTimer();
      this.gameState = "waiting";
      this.dealerHand = [];
      this.turn = null;
      this.deck.reset();

      this.cleanupDisconnectedAfterRound();

      this.promoteSpectatorsToPlayers();
      this.ensureHumanHost();

      this.playerOrder.forEach((id) => {
        const player = this.players[id];
        if (!player) return;

        player.hand = [];
        player.score = 0;
        player.status = "waiting";
        player.result = null;
        player.bet = 0;
      });

      this.notifyStateChange();
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
        isAI: p.isAI || false,
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
      canStart: this.canStartRoundCheck(),
    };
  }
}
