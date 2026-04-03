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
          players: 1,
          maxPlayers: 1,
          seats: 1,
          stakes: "$5 / $200",
          status: "Open",
          mode: "Solo",
        };
  } catch (error) {
    storedRoom = {
      id: "solo-table",
      name: "Solo Table",
      players: 1,
      maxPlayers: 1,
      seats: 1,
      stakes: "$5 / $200",
      status: "Open",
      mode: "Solo",
    };
  }

  const isSoloTable =
    storedRoom.mode === "Solo" || storedRoom.id === "solo-table";
  const isMultiplayerPreview = !isSoloTable;

  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [roomId] = useState(storedRoom.id || "solo-table");
  const [tableLabel] = useState(storedRoom.name || "Solo Table");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");

  const [selectedBet, setSelectedBet] = useState(25);
  const [tableBet, setTableBet] = useState(0);
  const [activeBet, setActiveBet] = useState(0);
  const [isDragOverBetZone, setIsDragOverBetZone] = useState(false);

  const userStorageKey = authUser?.id || authUser?.username || "guest";
  const scoreKey = `blackjackSessionScore_${userStorageKey}`;
  const balanceKey = `blackjackBalance_${userStorageKey}`;

  const [sessionScore, setSessionScore] = useState(() => {
    return Number(localStorage.getItem(scoreKey) || 0);
  });

  const [balance, setBalance] = useState(() => {
    const storedBalance = Number(localStorage.getItem(balanceKey));
    if (Number.isNaN(storedBalance) || storedBalance <= 0) {
      localStorage.setItem(balanceKey, "5");
      return 5;
    }
    return storedBalance;
  });

  const lastProcessedRoundRef = useRef("");
  const previousDealerCountRef = useRef(0);
  const previousPlayerCountsRef = useRef({});

  useEffect(() => {
    const verifyUser = async () => {
      if (authUser?.id) return;

      try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setAuthUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("username", data.user.username);
          localStorage.setItem("email", data.user.email);
          localStorage.setItem("isLoggedIn", "true");
        } else {
          console.warn("Unauthenticated user");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error verifying this user:", error);
      }
    };

    verifyUser();
  }, [authUser]);

    useEffect(() => {
      if (!authUser?.id && !authUser?.username) return;

      const storageUserKey = authUser?.id || authUser?.username || "guest";
      const newScoreKey = `blackjackSessionScore_${storageUserKey}`;
      const newBalanceKey = `blackjackBalance_${storageUserKey}`;
      const statsKey = `stats_${authUser?.id || storageUserKey}`;

      setSessionScore(Number(localStorage.getItem(newScoreKey) || 0));

      const storedBalance = Number(localStorage.getItem(newBalanceKey));
      if (Number.isNaN(storedBalance) || storedBalance <= 0) {
        localStorage.setItem(newBalanceKey, "5");
        setBalance(5);
      } else {
        setBalance(storedBalance);
      }

      if (!localStorage.getItem(statsKey)) {
        localStorage.setItem(
          statsKey,
          JSON.stringify({
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesPushed: 0,
            blackjacks: 0,
          })
        );
      }
    }, [authUser]);

  useEffect(() => {
    if (!authUser?.id) return;

    const onConnect = () => {
      console.log("Joining room:", roomId, "as user:", authUser);
      setMyId(authUser.id);

      socket.emit("join_game", {
        roomId,
        user: authUser,
      });
    };

    const onGameUpdate = (state) => {
      console.log("GAME UPDATE RECEIVED:", state);
      setGameState(state);
    };

    socket.on("connect", onConnect);
    socket.on("game_update", onGameUpdate);

    if (!socket.connected) {
      socket.connect();
    } 
    else {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("game_update", onGameUpdate);
    };
  }, [roomId, authUser]);

  const fallbackState = {
    gameState: "waiting",
    dealerHand: [],
    dealerScore: 0,
    players: {},
    playerOrder: [],
    turn: null,
  };

  const safeState = gameState || fallbackState;

  const rawPlayerOrder = safeState.playerOrder ?? [];
  const rawPlayers = safeState.players ?? {};
  const dealerHand = safeState.dealerHand ?? [];
  const dealerScore = safeState.dealerScore ?? 0;
  const currentTurn = safeState.turn ?? null;
  const currentGameState = safeState.gameState ?? "waiting";

  const normalizedState = useMemo(() => {
    if (!isSoloTable) {
      return {
        players: rawPlayers,
        playerOrder: rawPlayerOrder,
      };
    }

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

    return {
      players: {},
      playerOrder: [],
    };
  }, [isSoloTable, myId, rawPlayers, rawPlayerOrder]);

  const players = normalizedState.players;
  const playerOrder = normalizedState.playerOrder;
  const myPlayer = players?.[myId] ?? players?.[playerOrder[0]] ?? null;

  const calculateHandValue = (hand = []) => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      const value = String(card?.value ?? "").toUpperCase();

      if (["K", "Q", "J"].includes(value)) {
        total += 10;
      } else if (value === "A") {
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

  const previewPlayers = useMemo(() => {
    if (!isMultiplayerPreview) return [];

    const seatCount = Math.max(
      2,
      Number(
        storedRoom.seats ?? storedRoom.maxPlayers ?? storedRoom.players ?? 2
      )
    );

    const currentPlayers = Math.max(1, Number(storedRoom.players ?? 1));

    return Array.from({ length: seatCount }, (_, index) => ({
      id: `preview-${index + 1}`,
      label: index === 0 ? "YOU" : `PLAYER ${index + 1}`,
      isMe: index === 0,
      occupied: index < currentPlayers,
    }));
  }, [
    isMultiplayerPreview,
    storedRoom.players,
    storedRoom.maxPlayers,
    storedRoom.seats,
  ]);

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
      if (isMultiplayerPreview) return;
      if (!gameState || !myPlayer || !authUser?.id) return;
      if (currentGameState !== "finished") return;
      if (!myPlayer.result) return;

      const roundKey = JSON.stringify({
        dealer: dealerHand,
        hand: myPlayer.hand ?? [],
        result: myPlayer.result,
        state: currentGameState,
        activeBet,
      });

      if (lastProcessedRoundRef.current === roundKey) return;

      const pointsToAdd = myPlayer.result === "win" ? 1 : 0;

      setSessionScore((prevScore) => {
        const updatedScore = prevScore + pointsToAdd;
        localStorage.setItem(scoreKey, String(updatedScore));
        return updatedScore;
      });

      setBalance((prevBalance) => {
        let updatedBalance = prevBalance;

        if (myPlayer.result === "win") {
          updatedBalance = prevBalance + activeBet;
        } else if (myPlayer.result === "lose") {
          updatedBalance = Math.max(0, prevBalance - activeBet);
        }

        localStorage.setItem(balanceKey, String(updatedBalance));
        return updatedBalance;
      });

      const statsKey = `stats_${authUser.id}`;
      const rawStats = localStorage.getItem(statsKey);
      const previousStats = rawStats
        ? JSON.parse(rawStats)
        : {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesPushed: 0,
            blackjacks: 0,
          };

      const updatedStats = {
        ...previousStats,
        gamesPlayed: Number(previousStats.gamesPlayed || 0) + 1,
        gamesWon:
          Number(previousStats.gamesWon || 0) + (myPlayer.result === "win" ? 1 : 0),
        gamesLost:
          Number(previousStats.gamesLost || 0) + (myPlayer.result === "lose" ? 1 : 0),
        gamesPushed:
          Number(previousStats.gamesPushed || 0) + (myPlayer.result === "push" ? 1 : 0),
        blackjacks:
          Number(previousStats.blackjacks || 0) + (myPlayer.status === "blackjack" ? 1 : 0),
      };

      localStorage.setItem(statsKey, JSON.stringify(updatedStats));

      lastProcessedRoundRef.current = roundKey;
    }, [
      isMultiplayerPreview,
      gameState,
      myPlayer,
      dealerHand,
      currentGameState,
      activeBet,
      scoreKey,
      balanceKey,
      authUser,
    ]);

  const handleStart = () => {
    if (isMultiplayerPreview) return;
    if (tableBet <= 0) return;
    if (tableBet > balance) return;

    setActiveBet(tableBet);
    lastProcessedRoundRef.current = "";

    socket.emit("start_round", roomId);
  };

  const handleHit = () => {
    if (isMultiplayerPreview) return;
    socket.emit("action_hit", roomId);
  };

  const handleStand = () => {
    if (isMultiplayerPreview) return;
    socket.emit("action_stand", roomId);
  };

  const handleDouble = () => {
    console.log("Double action is not implemented in the backend yet.");
  };

  const addChipToBet = (chipValue) => {
    if (currentGameState !== "waiting" || isMultiplayerPreview) return;
    setSelectedBet(chipValue);
    setTableBet((prev) => prev + chipValue);
  };

  const clearBet = () => {
    if (currentGameState !== "waiting" || isMultiplayerPreview) return;
    setTableBet(0);
  };

  const handleChipSelect = (chipValue) => {
    setSelectedBet(chipValue);
    addChipToBet(chipValue);
  };

  const handleChipDragStart = (event, chipValue) => {
    event.dataTransfer.setData("text/plain", String(chipValue));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleBetZoneDragOver = (event) => {
    if (currentGameState !== "waiting" || isMultiplayerPreview) return;
    event.preventDefault();
    setIsDragOverBetZone(true);
  };

  const handleBetZoneDragLeave = () => {
    setIsDragOverBetZone(false);
  };

  const handleBetZoneDrop = (event) => {
    if (currentGameState !== "waiting" || isMultiplayerPreview) return;

    event.preventDefault();
    const droppedValue = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isNaN(droppedValue) && droppedValue > 0) {
      setSelectedBet(droppedValue);
      setTableBet((prev) => prev + droppedValue);
    }

    setIsDragOverBetZone(false);
  };

  const gameStatusLabel = useMemo(() => {
    if (isMultiplayerPreview) return "Preview mode";

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
  }, [currentGameState, isMultiplayerPreview]);

  const amIHost = isSoloTable ? true : playerOrder[0] === myId;

  const isMyTurn = isSoloTable
    ? currentTurn === myId || currentTurn === playerOrder[0]
    : currentTurn === myId;

  const seatedCount = isSoloTable ? 1 : playerOrder.length;

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
                <span className="hud-box__label">Current Bet</span>
                <strong>{tableBet}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Active Bet</span>
                <strong>{activeBet}</strong>
              </div>
            </div>

            {isMultiplayerPreview && (
              <div className="multiplayer-banner">
                Multiplayer mode is still being implemented. Seat layout preview only.
              </div>
            )}

            {(currentGameState === "waiting" || isMultiplayerPreview) && (
              <div className="table-felt-text">
                <p className="table-felt-text__title">Blackjack</p>
                <p>
                  {storedRoom.stakes} · {storedRoom.seats} seat table ·{" "}
                  {storedRoom.mode}
                </p>
              </div>
            )}

            <div className="dealer-zone">
              <div className="dealer-zone__header">
                <h2>Dealer</h2>
                <span className="dealer-zone__score">Total: {dealerScore}</span>
              </div>

              <div className="dealer-hand">
                {!isMultiplayerPreview &&
                  dealerHand.map((card, index) => {
                    const animate = shouldAnimateDealerCard(index);

                    return (
                      <div
                        key={`dealer-${card?.value ?? "x"}-${card?.suit ?? "x"}-${index}`}
                        className={animate ? "deal-card deal-card--dealer" : ""}
                        style={animate ? { animationDelay: getDealerAnimationDelay(index) } : undefined}
                      >
                        <Card value={card?.value} suit={card?.suit} />
                      </div>
                    );
                  })}

                {!isMultiplayerPreview &&
                  currentGameState === "playing" &&
                  dealerHand.length > 0 && (
                    <div className="deal-card deal-card--dealer" style={{ animationDelay: "0.16s" }}>
                      <Card hidden={true} />
                    </div>
                  )}
              </div>
            </div>

            {!isMultiplayerPreview && currentGameState === "waiting" && (
              <div className="table-center-message">
                <p>
                  Waiting for players... <strong>({seatedCount} seated)</strong>
                </p>

                {amIHost ? (
                  <>
                    <button
                      className="casino-btn casino-btn--gold"
                      onClick={handleStart}
                      type="button"
                      disabled={tableBet <= 0 || tableBet > balance}
                    >
                      Deal Cards
                    </button>

                    {tableBet <= 0 && (
                      <div className="table-center-message__hint">
                        Place a bet first
                      </div>
                    )}

                    {tableBet > balance && (
                      <div className="table-center-message__hint">
                        Not enough balance
                      </div>
                    )}
                  </>
                ) : (
                  <span className="table-center-message__sub">
                    The host will start the round when the table is ready
                  </span>
                )}
              </div>
            )}

            <div className="players-arc">
              {isMultiplayerPreview
                ? previewPlayers.map((player, index) => (
                    <article
                      key={player.id}
                      className={[
                        "player-seat",
                        "player-seat--preview",
                        player.isMe ? "player-seat--me" : "",
                        !player.occupied ? "player-seat--empty" : "",
                      ].join(" ")}
                      style={{
                        "--seat-index": index,
                        "--seat-total": previewPlayers.length,
                      }}
                    >
                      <div className="player-seat__badge">{player.label}</div>

                      <div className="player-seat__cards player-seat__cards--placeholder">
                        <div className="player-seat__placeholder-card"></div>
                        <div className="player-seat__placeholder-card"></div>
                      </div>

                      <div className="player-seat__status">
                        <span className="thinking-text">
                          {player.isMe
                            ? "Ready"
                            : player.occupied
                            ? "Waiting"
                            : "Empty seat"}
                        </span>
                      </div>
                    </article>
                  ))
                : playerOrder.map((playerId, index) => {
                    const player = players?.[playerId];
                    if (!player) return null;

                    const isMe = playerId === myId || playerId === playerOrder[0];
                    const isTurn = isSoloTable
                      ? currentTurn === playerId || currentTurn === myId
                      : currentTurn === playerId;
                    const hand = player.hand ?? [];

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

                        <div className="player-seat__hand-stack">
                          <div className="player-seat__cards">
                            {hand.map((card, cardIndex) => {
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
                                      ? { animationDelay: getPlayerAnimationDelay(playerId, cardIndex) }
                                      : undefined
                                  }
                                >
                                  <Card value={card?.value} suit={card?.suit} />
                                </div>
                              );
                            })}
                          </div>

                          {isMe && hand.length > 0 && (
                            <div className="hand-total-box hand-total-box--below">
                              <span className="hand-total-box__label">Total</span>
                              <strong>{myHandValue}</strong>
                            </div>
                          )}
                        </div>

                        <div className="player-seat__status">
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

                          {!isMe && isTurn && (
                            <span className="thinking-text">Thinking...</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
            </div>

            <div className="game-controls-bar game-controls-bar--inside">
              <div className="bet-panel">
                <div
                  className={`bet-drop-zone ${isDragOverBetZone ? "is-drag-over" : ""}`}
                  onDragOver={handleBetZoneDragOver}
                  onDragLeave={handleBetZoneDragLeave}
                  onDrop={handleBetZoneDrop}
                >
                  <span className="bet-drop-zone__label">Drop chip here</span>
                  <span className="bet-drop-zone__value">{tableBet}</span>
                </div>

                <div className="bet-panel__label">
                  Click chips to add bet or drag them to the table
                </div>

                <div className="bet-chips">
                  {[5, 10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      draggable={currentGameState === "waiting" && !isMultiplayerPreview}
                      className={`bet-chip bet-chip--${chip} ${
                        selectedBet === chip ? "is-selected" : ""
                      }`}
                      onClick={() => handleChipSelect(chip)}
                      onDragStart={(event) => handleChipDragStart(event, chip)}
                      disabled={currentGameState !== "waiting" || isMultiplayerPreview}
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
                    disabled={currentGameState !== "waiting" || isMultiplayerPreview || tableBet === 0}
                  >
                    Clear Bet
                  </button>
                </div>
              </div>

              <div className="action-status-panel action-status-panel--right">
                <div className="status-mini-panel">
                  <div className="status-mini-panel__item">
                    <span>Balance</span>
                    <strong>{balance}</strong>
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
                      isMultiplayerPreview ||
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
                    <span className="casino-action__sub">Not available yet</span>
                  </button>

                  <button
                    className="casino-action casino-action--green"
                    onClick={handleHit}
                    disabled={
                      isMultiplayerPreview ||
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
                      isMultiplayerPreview ||
                      !(currentGameState === "playing" && isMyTurn)
                    }
                    type="button"
                  >
                    <span className="casino-action__title">Stand</span>
                    <span className="casino-action__sub">Hold hand</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Game;