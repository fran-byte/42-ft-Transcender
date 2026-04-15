import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Game.css";

const API_URL = "";

function Game() {
  const storedRoomRaw = localStorage.getItem("selectedRoom");
  const navigate = useNavigate();

  let storedRoom;
  try {
    storedRoom = storedRoomRaw
      ? JSON.parse(storedRoomRaw)
      : {
          id: "solo-table",
          name: "Solo Table",
          maxPlayers: 1,
          seats: 1,
          stakes: "$5 / $200",
          minBet: 5,
          maxBet: 200,
          mode: "Solo",
        };
  } catch {
    storedRoom = {
      id: "solo-table",
      name: "Solo Table",
      maxPlayers: 1,
      seats: 1,
      stakes: "$5 / $200",
      minBet: 5,
      maxBet: 200,
      mode: "Solo",
    };
  }

  const isSoloTable =
    storedRoom.mode === "Solo" || storedRoom.id === "solo-table";

  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
    const [roomId] = useState(() => storedRoom.id || "solo-table");
    const roleStorageKey = useMemo(() => {
    const tempUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = tempUser?.id || "guest";
    return `blackjack_role_${roomId}_${userId}`;
  }, [roomId]);

  const [tableLabel] = useState(storedRoom.name || "Blackjack Table");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");
  const [myRole, setMyRole] = useState(() => {
    try {
      return sessionStorage.getItem(roleStorageKey) || "player";
    } catch {
      return "player";
    }
  });

  const [selectedBet, setSelectedBet] = useState(25);
  const [isDragOverBetZone, setIsDragOverBetZone] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(100);
  const [walletMsg, setWalletMsg] = useState("");

  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesPushed: 0,
    blackjacks: 0,
  });

  const userStorageKey = authUser?.id || authUser?.username || "guest";
  const scoreKey = `blackjackSessionScore_${userStorageKey}`;

  const [sessionScore, setSessionScore] = useState(() => {
    return Number(localStorage.getItem(scoreKey) || 0);
  });

  const isWalletAmountValid =
    Number.isFinite(walletAmount) &&
    walletAmount >= 10 &&
    walletAmount <= 10000;

  const lastProcessedRoundRef = useRef("");
  const previousDealerCountRef = useRef(0);
  const previousPlayerCountsRef = useRef({});

  const syncBalance = (newBalance) => {
    const numericBalance = Number(newBalance ?? 0);

    setBalance(numericBalance);

    setAuthUser((prev) => {
      if (!prev) return prev;

      const updatedUser = {
        ...prev,
        balance: numericBalance,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setAuthUser(data.user);
          setBalance(Number(data.user.balance ?? 0));

          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("username", data.user.username);
          localStorage.setItem("email", data.user.email);
          localStorage.setItem("isLoggedIn", "true");
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error verifying user:", error);
        navigate("/login");
      }
    };

    verifyUser();
  }, [navigate]);

  useEffect(() => {
    const bootstrapUserData = async () => {
      if (!authUser?.id && !authUser?.username) return;

      const storageUserKey = authUser?.id || authUser?.username || "guest";
      const newScoreKey = `blackjackSessionScore_${storageUserKey}`;
      const localStatsKey = `stats_${authUser?.id || storageUserKey}`;

      setSessionScore(Number(localStorage.getItem(newScoreKey) || 0));

      try {
        const balanceRes = await fetch("/api/auth/balance", {
          method: "GET",
          credentials: "include",
        });

        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          if (balanceData.success) {
            syncBalance(balanceData.balance);
          }
        }
      } catch (error) {
        console.error("Error loading balance:", error);
      }

      try {
        const statsRes = await fetch("/api/auth/stats", {
          method: "GET",
          credentials: "include",
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const backendStats = statsData?.stats || statsData || {};

          const normalizedStats = {
            gamesPlayed: Number(backendStats.gamesPlayed || 0),
            gamesWon: Number(backendStats.gamesWon || 0),
            gamesLost: Number(backendStats.gamesLost || 0),
            gamesPushed: Number(backendStats.gamesPushed || 0),
            blackjacks: Number(backendStats.blackjacks || 0),
          };

          setStats(normalizedStats);
          localStorage.setItem(localStatsKey, JSON.stringify(normalizedStats));
        } else {
          const rawLocalStats = localStorage.getItem(localStatsKey);
          if (rawLocalStats) {
            setStats(JSON.parse(rawLocalStats));
          } else {
            const emptyStats = {
              gamesPlayed: 0,
              gamesWon: 0,
              gamesLost: 0,
              gamesPushed: 0,
              blackjacks: 0,
            };
            setStats(emptyStats);
            localStorage.setItem(localStatsKey, JSON.stringify(emptyStats));
          }
        }
      } catch (error) {
        console.error("Error loading stats:", error);

        const rawLocalStats = localStorage.getItem(localStatsKey);
        if (rawLocalStats) {
          setStats(JSON.parse(rawLocalStats));
        }
      }
    };

    bootstrapUserData();
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.id) return;

    const onConnect = () => {
      setMyId(authUser.id);

      const persistedRole =
        sessionStorage.getItem(roleStorageKey) || myRole || "player";

      socket.emit("join_game", {
        roomId,
        user: authUser,
        maxPlayers: Number(storedRoom.seats || storedRoom.maxPlayers || 4),
        preferredRole: isSoloTable ? "player" : persistedRole,
      });
    };

    const onJoinResult = (payload) => {
      console.log("join_result:", payload);
      const nextRole = payload?.role || "player";
      setMyRole(nextRole);
      sessionStorage.setItem(roleStorageKey, nextRole);
    };

    const onGameUpdate = (state) => {
      setGameState(state);
    };

    socket.on("connect", onConnect);
    socket.on("join_result", onJoinResult);
    socket.on("game_update", onGameUpdate);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("join_result", onJoinResult);
      socket.off("game_update", onGameUpdate);
    };
  }, [
    roomId,
    authUser,
    storedRoom.seats,
    storedRoom.maxPlayers,
    roleStorageKey,
    myRole,
    isSoloTable,
  ]);

  const fallbackState = {
    gameState: "waiting",
    dealerHand: [],
    dealerScore: 0,
    players: {},
    playerOrder: [],
    turn: null,
    spectators: [],
    maxPlayers: Number(storedRoom.seats || storedRoom.maxPlayers || 4),
    minBet: Number(storedRoom.minBet || 5),
    maxBet: Number(storedRoom.maxBet || 500),
    canStart: false,
  };

  const safeState = gameState || fallbackState;

  const rawPlayerOrder = safeState.playerOrder ?? [];
  const rawPlayers = safeState.players ?? {};
  const dealerHand = safeState.dealerHand ?? [];
  const dealerScore = safeState.dealerScore ?? 0;
  const currentTurn = safeState.turn ?? null;
  const currentGameState = safeState.gameState ?? "waiting";
  const spectators = safeState.spectators ?? [];
  const maxPlayers = safeState.maxPlayers ?? 4;
  const canStart = safeState.canStart ?? false;

  const normalizedState = useMemo(() => {
    if (isSoloTable) {
      if (myId && rawPlayers[myId]) {
        return {
          players: { [myId]: rawPlayers[myId] },
          playerOrder: [myId],
        };
      }

      const firstPlayerId = rawPlayerOrder[0];
      if (firstPlayerId && rawPlayers[firstPlayerId]) {
        return {
          players: { [firstPlayerId]: rawPlayers[firstPlayerId] },
          playerOrder: [firstPlayerId],
        };
      }

      return { players: {}, playerOrder: [] };
    }

    return {
      players: rawPlayers,
      playerOrder: rawPlayerOrder,
    };
  }, [isSoloTable, myId, rawPlayers, rawPlayerOrder]);

  const players = normalizedState.players;
  const playerOrder = normalizedState.playerOrder;
  const myPlayer = players?.[myId] ?? null;
  const myBet = myPlayer?.bet ?? 0;

  const isSpectator = myRole === "spectator";
  const amIHost = playerOrder[0] === myId;
  const isMyTurn = currentTurn === myId;
  const seatedCount = playerOrder.length;
  const hostId = playerOrder[0] || null;

  const calculateHandValue = (hand = []) => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      const value = String(card?.value ?? "").toUpperCase();

      if (["K", "Q", "J"].includes(value)) total += 10;
      else if (value === "A") {
        total += 11;
        aces += 1;
      } else {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) total += parsed;
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  };

  const myHandValue = calculateHandValue(myPlayer?.hand ?? []);

  const shouldAnimateDealerCard = (index) => {
    if (currentGameState !== "playing") return false;
    const previousCount = previousDealerCountRef.current;
    const currentCount = dealerHand.length;
    if (currentCount <= previousCount) return false;
    return index >= previousCount;
  };

  const getDealerAnimationDelay = (index) => {
    const previousCount = previousDealerCountRef.current;
    const orderAmongNewCards = index - previousCount;
    return `${Math.max(0, orderAmongNewCards) * 0.12}s`;
  };

  const shouldAnimatePlayerCard = (playerId, index, handLength) => {
    if (currentGameState !== "playing") return false;
    const previousCount = previousPlayerCountsRef.current[playerId] ?? 0;
    if (handLength <= previousCount) return false;
    return index >= previousCount;
  };

  const getPlayerAnimationDelay = (playerId, index) => {
    const previousCount = previousPlayerCountsRef.current[playerId] ?? 0;
    const orderAmongNewCards = index - previousCount;
    return `${Math.max(0, orderAmongNewCards) * 0.12}s`;
  };

  useEffect(() => {
    const nextPlayerCounts = {};

    playerOrder.forEach((playerId) => {
      nextPlayerCounts[playerId] = players?.[playerId]?.hand?.length ?? 0;
    });

    previousDealerCountRef.current = dealerHand.length;
    previousPlayerCountsRef.current = nextPlayerCounts;

    if (currentGameState === "waiting") {
      previousDealerCountRef.current = 0;
      previousPlayerCountsRef.current = {};
    }
  }, [dealerHand, players, playerOrder, currentGameState]);

  useEffect(() => {
    if (!gameState || !myPlayer || !authUser?.id) return;
    if (currentGameState !== "finished") return;
    if (!myPlayer.result) return;

    const roundBet = Number(myPlayer?.bet ?? 0);

    const roundKey = JSON.stringify({
      dealer: dealerHand,
      hand: myPlayer.hand ?? [],
      result: myPlayer.result,
      state: currentGameState,
      bet: roundBet,
    });

    if (lastProcessedRoundRef.current === roundKey) return;

    const pointsToAdd = myPlayer.result === "win" ? 1 : 0;

    setSessionScore((prevScore) => {
      const updatedScore = prevScore + pointsToAdd;
      localStorage.setItem(scoreKey, String(updatedScore));
      return updatedScore;
    });

    fetch("/api/auth/balance", {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.success) {
          syncBalance(data.balance);
        }
      })
      .catch((err) => console.error("Error refreshing balance:", err));

    const localStatsKey = `stats_${authUser.id}`;

    const updatedStats = {
      gamesPlayed: Number(stats.gamesPlayed || 0) + 1,
      gamesWon:
        Number(stats.gamesWon || 0) + (myPlayer.result === "win" ? 1 : 0),
      gamesLost:
        Number(stats.gamesLost || 0) + (myPlayer.result === "lose" ? 1 : 0),
      gamesPushed:
        Number(stats.gamesPushed || 0) + (myPlayer.result === "push" ? 1 : 0),
      blackjacks:
        Number(stats.blackjacks || 0) +
        (myPlayer.status === "blackjack" ? 1 : 0),
    };

    setStats(updatedStats);
    localStorage.setItem(localStatsKey, JSON.stringify(updatedStats));

    const saveStats = async () => {
      try {
        const res = await fetch("/api/auth/stats", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedStats),
        });

        const data = await res.json();
        console.log("stats saved:", data);
      } catch (error) {
        console.error("Error saving stats:", error);
      }
    };

    saveStats();
    lastProcessedRoundRef.current = roundKey;
  }, [
    gameState,
    myPlayer,
    dealerHand,
    currentGameState,
    scoreKey,
    authUser,
    stats,
  ]);

  const handleStart = () => {
    if (isSpectator) return;
    if (!amIHost) return;
    socket.emit("start_round", roomId);
  };

  const handleHit = () => {
    if (isSpectator) return;
    socket.emit("action_hit", roomId);
  };

  const handleStand = () => {
    if (isSpectator) return;
    socket.emit("action_stand", roomId);
  };

  const handleResetRound = () => {
    if (isSpectator) return;
    if (!amIHost) return;
    lastProcessedRoundRef.current = "";
    socket.emit("reset_round", roomId);
  };

  const handleDouble = () => {
    console.log("Double action is not implemented in the backend yet.");
  };

  const addChipToBet = (chipValue) => {
    if (currentGameState !== "waiting") return;
    if (isSpectator) return;

    if (chipValue > (myPlayer?.chips ?? 0)) return;

    setSelectedBet(chipValue);
    socket.emit("place_bet", {
      roomId,
      amount: chipValue,
    });
  };

  const clearBet = () => {
    if (currentGameState !== "waiting") return;
    if (isSpectator) return;
    socket.emit("clear_bet", roomId);
  };

  const handleChipSelect = (chipValue) => {
    setSelectedBet(chipValue);
    addChipToBet(chipValue);
  };

  const handleChipDragStart = (event, chipValue) => {
    if (currentGameState !== "waiting") return;
    if (isSpectator) return;

    event.dataTransfer.setData("text/plain", String(chipValue));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleBetZoneDragOver = (event) => {
    if (currentGameState !== "waiting") return;
    if (isSpectator) return;

    event.preventDefault();
    setIsDragOverBetZone(true);
  };

  const handleBetZoneDragLeave = () => {
    setIsDragOverBetZone(false);
  };

  const handleBetZoneDrop = (event) => {
    if (currentGameState !== "waiting") return;
    if (isSpectator) return;

    event.preventDefault();
    const droppedValue = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isNaN(droppedValue) && droppedValue > 0) {
      setSelectedBet(droppedValue);
      socket.emit("place_bet", {
        roomId,
        amount: droppedValue,
      });
    }

    setIsDragOverBetZone(false);
  };

  const gameStatusLabel = useMemo(() => {
    switch (currentGameState) {
      case "waiting":
        return "Waiting for players";
      case "playing":
        return "Round in progress";
      case "finished":
        return "Round finished";
      default:
        return "Loading";
    }
  }, [currentGameState]);

  if (!authUser) {
    return (
      <div className="game-page">
        <Navbar />
        <main className="game-main blackjack-page">
          <section className="blackjack-wrapper">
            <div className="blackjack-table">
              <div className="table-center-message">
                <p>Verifying session...</p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="game-page">
      <Navbar />

      <main className="game-main blackjack-page">
        <section className="blackjack-wrapper">
          <div className="blackjack-table">
            <div className="table-hud table-hud--centered">
              <div className="hud-box">
                <span className="hud-box__label">Table</span>
                <strong>{tableLabel}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Status</span>
                <strong>{gameStatusLabel}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Players</span>
                <strong>
                  {seatedCount}/{maxPlayers}
                </strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Spectators</span>
                <strong>{spectators.length}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Your Bet</span>
                <strong>{myBet}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Stakes</span>
                <strong>
                  {safeState.minBet} / {safeState.maxBet}
                </strong>
              </div>
            </div>

            {isSpectator && (
              <div className="multiplayer-banner">
                You are spectating this table. You can watch live, but you cannot
                play.
              </div>
            )}

            <div className="table-felt-text">
              <p className="table-felt-text__title">Blackjack</p>
              <p>
                {storedRoom.stakes} · {storedRoom.seats || maxPlayers} seat table
                · {storedRoom.mode}
              </p>
            </div>

            <div className="dealer-zone">
              <div className="dealer-zone__header">
                <h2>Dealer</h2>
                <span className="dealer-zone__score">Total: {dealerScore}</span>
              </div>

              <div className="dealer-hand">
                {dealerHand.map((card, index) => {
                  const animate = shouldAnimateDealerCard(index);

                  return (
                    <div
                      key={`dealer-${card?.value ?? "x"}-${card?.suit ?? "x"}-${index}`}
                      className={animate ? "deal-card deal-card--dealer" : ""}
                      style={
                        animate
                          ? { animationDelay: getDealerAnimationDelay(index) }
                          : undefined
                      }
                    >
                      <Card value={card?.value} suit={card?.suit} />
                    </div>
                  );
                })}

                {currentGameState === "playing" && dealerHand.length > 0 && (
                  <div
                    className="deal-card deal-card--dealer"
                    style={{ animationDelay: "0.16s" }}
                  >
                    <Card hidden={true} />
                  </div>
                )}
              </div>
            </div>

            {currentGameState === "waiting" && (
              <div className="table-center-message">
                <p>
                  Waiting for players... <strong>({seatedCount} seated)</strong>
                </p>

                {amIHost && !isSpectator ? (
                  <>
                    <button
                      className="casino-btn casino-btn--gold"
                      onClick={handleStart}
                      type="button"
                      disabled={!canStart}
                    >
                      Deal Cards
                    </button>

                    {!canStart && (
                      <div className="table-center-message__hint">
                        All seated players need to place a bet first
                      </div>
                    )}
                  </>
                ) : (
                  <span className="table-center-message__sub">
                    {isSpectator
                      ? "You are watching this table as spectator"
                      : "The host will start the round when the table is ready"}
                  </span>
                )}
              </div>
            )}

            {currentGameState === "finished" && amIHost && !isSpectator && (
              <div className="table-center-message">
                <button
                  className="casino-btn casino-btn--gold"
                  onClick={handleResetRound}
                  type="button"
                >
                  Next Round
                </button>
              </div>
            )}

            <div className="players-arc">
              {playerOrder.map((playerId, index) => {
                const player = players?.[playerId];
                if (!player) return null;

                const isMe = playerId === myId;
                const isTurn = currentTurn === playerId;
                const hand = player.hand ?? [];
                const handValue = calculateHandValue(hand);

                const shouldHideLastCard =
                  !isMe && currentGameState === "playing" && hand.length > 0;

                const visibleCards = shouldHideLastCard
                  ? hand.slice(0, -1)
                  : hand;

                return (
                  <article
                    key={playerId}
                    className={[
                      "player-seat",
                      isMe ? "player-seat--me" : "",
                      isTurn ? "player-seat--active" : "",
                    ].join(" ")}
                    style={{
                      "--seat-index": index,
                      "--seat-total": playerOrder.length,
                    }}
                  >
                    <div className="player-seat__badge">
                      {isMe ? "YOU" : `PLAYER ${index + 1}`}
                    </div>

                    <div className="player-seat__meta">
                      <strong>{player.username}</strong>
                      {playerId === hostId && (
                        <span className="host-badge">
                          <span className="host-badge__icon">♛</span>
                          HOST
                        </span>
                      )}
                    </div>

                    <div className="player-seat__meta">
                      <span>Bet: {player.bet ?? 0}</span>
                    </div>

                    <div className="player-seat__hand-stack">
                      <div className="player-seat__cards">
                        {visibleCards.map((card, cardIndex) => {
                          const animate = shouldAnimatePlayerCard(
                            playerId,
                            cardIndex,
                            hand.length
                          );

                          return (
                            <div
                              key={`${playerId}-${card?.value ?? "x"}-${card?.suit ?? "x"}-${cardIndex}`}
                              className={animate ? "deal-card" : ""}
                              style={
                                animate
                                  ? {
                                      animationDelay: getPlayerAnimationDelay(
                                        playerId,
                                        cardIndex
                                      ),
                                    }
                                  : undefined
                              }
                            >
                              <Card value={card?.value} suit={card?.suit} />
                            </div>
                          );
                        })}

                        {shouldHideLastCard && (
                          <div className="deal-card">
                            <Card hidden={true} />
                          </div>
                        )}
                      </div>

                      {isMe && hand.length > 0 && (
                        <div className="hand-total-box hand-total-box--below">
                          <span className="hand-total-box__label">Total</span>
                          <strong>{handValue}</strong>
                        </div>
                      )}
                    </div>

                    <div className="player-seat__status">
                      {player.isDisconnected && (
                        <span className="thinking-text">Disconnected</span>
                      )}

                      {!player.isDisconnected && !player.result && player.status && (
                        <span className="thinking-text">
                          {String(player.status).toUpperCase()}
                        </span>
                      )}

                      {player.result && (
                        <span
                          className={[
                            "result-pill",
                            player.result === "win"
                              ? "result-pill--win"
                              : player.result === "push"
                              ? "result-pill--push"
                              : "result-pill--lose",
                          ].join(" ")}
                        >
                          {String(player.result).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="game-controls-bar game-controls-bar--inside">
              <div className="action-status-panel action-status-panel--right">
                <div className="status-mini-panel">
                  <div className="status-mini-panel__item">
                    <span>Balance</span>
                    <strong>{balance}</strong>
                    <button
                      className="wallet-trigger"
                      onClick={() => setShowWallet(true)}
                      type="button"
                    >
                      <span className="wallet-trigger__icon">💰</span>
                      <span>Wallet</span>
                    </button>
                  </div>

                  <div className="status-mini-panel__item">
                    <span>Your Score</span>
                    <strong>{sessionScore}</strong>
                  </div>
                </div>

                <div className="actions-panel">
                  <button
                    className="casino-action casino-action--secondary"
                    onClick={handleDouble}
                    disabled={
                      isSpectator ||
                      !(
                        currentGameState === "playing" &&
                        isMyTurn &&
                        (myPlayer?.hand?.length ?? 0) === 2
                      )
                    }
                    type="button"
                    title="Backend support not implemented yet"
                  >
                    <span className="casino-action__title">Double</span>
                    <span className="casino-action__sub">
                      Not available yet
                    </span>
                  </button>

                  <button
                    className="casino-action casino-action--green"
                    onClick={handleHit}
                    disabled={
                      isSpectator ||
                      !(currentGameState === "playing" && isMyTurn)
                    }
                    type="button"
                  >
                    <span className="casino-action__title">Hit</span>
                    <span className="casino-action__sub">Draw a card</span>
                  </button>

                  <button
                    className="casino-action casino-action--gold"
                    onClick={handleStand}
                    disabled={
                      isSpectator ||
                      !(currentGameState === "playing" && isMyTurn)
                    }
                    type="button"
                  >
                    <span className="casino-action__title">Stand</span>
                    <span className="casino-action__sub">Hold hand</span>
                  </button>
                </div>
              </div>

              {spectators.length > 0 && (
                <div className="spectator-panel">
                  <div className="spectator-panel__header">
                    <div>
                      <span className="spectator-panel__eyebrow">Live rail</span>
                      <h3>Spectators</h3>
                    </div>
                    <span className="spectator-panel__count">
                      {spectators.length}
                    </span>
                  </div>

                  <div className="spectator-panel__list">
                    {spectators.map((spec) => (
                      <div
                        key={spec.id}
                        className={`spectator-pill ${
                          spec.isDisconnected ? "spectator-pill--offline" : ""
                        }`}
                      >
                        <div className="spectator-pill__avatar">
                          {spec.avatar ? (
                            <img src={spec.avatar} alt={spec.username} />
                          ) : (
                            <span>
                              {spec.username?.charAt(0)?.toUpperCase() || "S"}
                            </span>
                          )}
                        </div>

                        <div className="spectator-pill__meta">
                          <strong>{spec.username}</strong>
                          <span>
                            {spec.isDisconnected
                              ? "Disconnected"
                              : "Watching live"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSpectator && (
                <div className="bet-panel">
                  <div
                    className={`bet-drop-zone ${
                      isDragOverBetZone ? "is-drag-over" : ""
                    }`}
                    onDragOver={handleBetZoneDragOver}
                    onDragLeave={handleBetZoneDragLeave}
                    onDrop={handleBetZoneDrop}
                  >
                    <span className="bet-drop-zone__label">Drop chip here</span>
                    <span className="bet-drop-zone__value">{myBet}</span>
                  </div>

                  <div className="bet-panel__label">
                    Click chips to add bet or drag them to the table
                  </div>

                  <div className="bet-chips">
                    {[5, 10, 25, 50, 100].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        draggable={currentGameState === "waiting"}
                        className={`bet-chip bet-chip--${chip} ${
                          selectedBet === chip ? "is-selected" : ""
                        }`}
                        onClick={() => handleChipSelect(chip)}
                        onDragStart={(event) => handleChipDragStart(event, chip)}
                        disabled={currentGameState !== "waiting"}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="bet-chip-actions">
                    <button
                      type="button"
                      className="casino-btn casino-btn--ghost"
                      onClick={clearBet}
                      disabled={currentGameState !== "waiting" || myBet === 0}
                    >
                      Clear Bet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showWallet && (
        <div
          className="wallet-modal"
          onClick={() => {
            setShowWallet(false);
            setWalletMsg("");
          }}
        >
          <div
            className="wallet-modal__card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wallet-modal__header">
              <div>
                <span className="wallet-modal__eyebrow">Bankroll</span>
                <h2>Wallet</h2>
              </div>

              <button
                className="wallet-modal__close"
                onClick={() => {
                  setShowWallet(false);
                  setWalletMsg("");
                }}
                type="button"
                aria-label="Close wallet"
              >
                ✕
              </button>
            </div>

            <div className="wallet-balance">
              <span className="wallet-balance__label">Current balance</span>
              <strong className="wallet-balance__value">${balance}</strong>
            </div>

            <div className="wallet-form">
              <label htmlFor="wallet-amount" className="wallet-form__label">
                Amount
              </label>
              <input
                id="wallet-amount"
                className="wallet-form__input"
                type="number"
                min="10"
                max="10000"
                value={walletAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  setWalletAmount(value === "" ? 0 : Number(value));
                }}
              />
            </div>

            {walletMsg && (
              <p
                className={`wallet-message ${
                  walletMsg.toLowerCase().includes("error")
                    ? "wallet-message--error"
                    : "wallet-message--success"
                }`}
              >
                {walletMsg}
              </p>
            )}

            <div className="wallet-actions">
              <button
                className="casino-btn casino-btn--gold"
                type="button"
                disabled={!isWalletAmountValid}
                onClick={async () => {
                  if (!isWalletAmountValid) {
                    setWalletMsg(
                      "Error: enter a valid amount between 10 and 10000"
                    );
                    return;
                  }

                  setWalletMsg("");

                  const res = await fetch("/api/auth/balance", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      amount: walletAmount,
                      type: "deposit",
                    }),
                  });

                  const data = await res.json();

                  if (data.success) {
                    syncBalance(data.balance);
                    
                    socket.emit("sync_wallet_balance", {
                    roomId,
                    userId: authUser.id,
                    balance: Number(data.balance),
                  });

                  setWalletMsg(`Deposited +$${walletAmount}`);
                }
                else {
                    setWalletMsg("Error: " + data.message);
                  }
                }}
              >
                Deposit
              </button>

              <button
                className="casino-btn casino-btn--ghost"
                type="button"
                onClick={async () => {
                  if (!isWalletAmountValid) {
                    setWalletMsg(
                      "Error: enter a valid amount between 10 and 10000"
                    );
                    return;
                  }

                  if (walletAmount > balance) {
                    setWalletMsg("Error: insufficient balance");
                    return;
                  }

                  setWalletMsg("");

                  const res = await fetch("/api/auth/balance", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      amount: walletAmount,
                      type: "withdraw",
                    }),
                  });

                  const data = await res.json();

                  if (data.success) {
                    syncBalance(data.balance);
                    socket.emit("sync_wallet_balance", {
                      roomId,
                      userId: authUser.id,
                      balance: Number(data.balance),
                    });

                    setWalletMsg(`Withdrawn -$${walletAmount}`);
                  }
                  else {
                    setWalletMsg("Error: " + data.message);
                  }
                }}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Game;