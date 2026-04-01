import { useState, useEffect, useMemo, useRef } from "react";
import { socket } from "../socket";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Game.css";

function Game() {
  const storedRoomRaw = localStorage.getItem("selectedRoom");

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

  const [roomId] = useState(storedRoom.id || "solo-table");
  const [tableLabel] = useState(storedRoom.name || "Solo Table");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");

  const [selectedBet, setSelectedBet] = useState(25);
  const [tableBet, setTableBet] = useState(null);
  const [isDragOverBetZone, setIsDragOverBetZone] = useState(false);

  const [sessionScore, setSessionScore] = useState(() => {
    const username = localStorage.getItem("username") || "guest";
    const scoreKey = `blackjackSessionScore_${username}`;
    return Number(localStorage.getItem(scoreKey) || 0);
  });

  const lastProcessedRoundRef = useRef("");

  useEffect(() => {
    const onConnect = () => {
      console.log("Joining room:", roomId);
      setMyId(socket.id);
      socket.emit("join_game", { roomId });
    };

    const onGameUpdate = (state) => {
      console.log("GAME UPDATE RECEIVED:", state);
      setGameState(state);
    };

    socket.on("connect", onConnect);
    socket.on("game_update", onGameUpdate);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("game_update", onGameUpdate);
    };
  }, [roomId]);

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

  /* SOLO TABLE FIX
     If backend duplicates players after refresh, force solo mode to only use me.
     If my socket entry is not ready yet, keep only the first player. */
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
  const myPlayer =
    players?.[myId] ?? players?.[playerOrder[0]] ?? null;

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

  useEffect(() => {
    if (isMultiplayerPreview) return;
    if (!gameState || !myPlayer) return;
    if (currentGameState !== "finished") return;
    if (!myPlayer.result) return;

    const roundKey = JSON.stringify({
      dealer: dealerHand,
      hand: myPlayer.hand ?? [],
      result: myPlayer.result,
      state: currentGameState,
    });

    if (lastProcessedRoundRef.current === roundKey) return;

    const pointsToAdd = myPlayer.result === "win" ? 1 : 0;
    const username = localStorage.getItem("username") || "guest";
    const scoreKey = `blackjackSessionScore_${username}`;

    setSessionScore((prevScore) => {
      const updatedScore = prevScore + pointsToAdd;
      localStorage.setItem(scoreKey, String(updatedScore));
      return updatedScore;
    });

    lastProcessedRoundRef.current = roundKey;
  }, [isMultiplayerPreview, gameState, myPlayer, dealerHand, currentGameState]);

  const handleStart = () => {
    if (isMultiplayerPreview) return;
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

  const handleChipSelect = (chipValue) => {
    setSelectedBet(chipValue);
  };

  const handleChipDragStart = (event, chipValue) => {
    event.dataTransfer.setData("text/plain", String(chipValue));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleBetZoneDragOver = (event) => {
    event.preventDefault();
    setIsDragOverBetZone(true);
  };

  const handleBetZoneDragLeave = () => {
    setIsDragOverBetZone(false);
  };

  const handleBetZoneDrop = (event) => {
    event.preventDefault();
    const droppedValue = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isNaN(droppedValue) && droppedValue > 0) {
      setTableBet(droppedValue);
      setSelectedBet(droppedValue);
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

  const amIHost =
    isSoloTable ? true : playerOrder[0] === myId;

  const isMyTurn =
    isSoloTable
      ? currentTurn === myId || currentTurn === playerOrder[0]
      : currentTurn === myId;

  const seatedCount = isSoloTable ? 1 : playerOrder.length;

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

              <div className="hud-box hud-box--center">
                <span className="hud-box__label">Status</span>
                <strong>{gameStatusLabel}</strong>
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
                <p>Dealer stands on ---- · Insurance pays --- to 1</p>
              </div>
            )}

            <div className="dealer-zone">
              <div className="dealer-zone__header">
                <h2>Dealer</h2>
                <span className="dealer-zone__score">Total: {dealerScore}</span>
              </div>

              <div className="dealer-hand">
                {!isMultiplayerPreview &&
                  dealerHand.map((card, index) => (
                    <div
                      key={`${card?.value ?? "x"}-${card?.suit ?? "x"}-${index}`}
                      className="deal-card deal-card--dealer"
                      style={{ animationDelay: `${index * 0.18}s` }}
                    >
                      <Card value={card?.value} suit={card?.suit} />
                    </div>
                  ))}

                {!isMultiplayerPreview && currentGameState === "playing" && (
                  <div
                    className="deal-card deal-card--dealer"
                    style={{ animationDelay: `${dealerHand.length * 0.18}s` }}
                  >
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
                  <button
                    className="casino-btn casino-btn--gold"
                    onClick={handleStart}
                    type="button"
                  >
                    Deal Cards
                  </button>
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

                        <div className="player-seat__hand-row">
                          <div className="player-seat__cards">
                            {hand.map((card, cardIndex) => (
                              <div
                                key={`${card?.value ?? "x"}-${card?.suit ?? "x"}-${cardIndex}`}
                                className="deal-card"
                                style={{ animationDelay: `${cardIndex * 0.14}s` }}
                              >
                                <Card value={card?.value} suit={card?.suit} />
                              </div>
                            ))}
                          </div>

                          {isMe && hand.length > 0 && (
                            <div className="hand-total-box">
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
                  className={`bet-drop-zone ${
                    isDragOverBetZone ? "is-drag-over" : ""
                  }`}
                  onDragOver={handleBetZoneDragOver}
                  onDragLeave={handleBetZoneDragLeave}
                  onDrop={handleBetZoneDrop}
                >
                  <span className="bet-drop-zone__label">Drop chip here</span>
                  {tableBet && (
                    <span className="bet-drop-zone__value">{tableBet}</span>
                  )}
                </div>

                <div className="bet-panel__label">Drag a chip to the table</div>

                <div className="bet-chips">
                  {[5, 10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      draggable
                      className={`bet-chip bet-chip--${chip} ${
                        selectedBet === chip ? "is-selected" : ""
                      }`}
                      onClick={() => handleChipSelect(chip)}
                      onDragStart={(event) => handleChipDragStart(event, chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="action-status-panel action-status-panel--right">
                <div className="status-mini-panel status-mini-panel--single">
                  <div className="status-mini-panel__item status-mini-panel__item--score">
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