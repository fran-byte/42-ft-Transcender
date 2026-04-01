import { useState, useEffect, useMemo, useRef } from "react";
import { socket } from "../socket";
import Card from "../components/Card";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Game.css";

function Game() {
  /* SELECTED TABLE DATA
     Reads the selected table from localStorage.
     Falls back to a default solo table if nothing is stored. */
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

  /* ROOM / PLAYER STATE */
  const [roomId] = useState(storedRoom.id || "solo-table");
  const [tableLabel] = useState(storedRoom.name || "Solo Table");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");

  /* UI-ONLY CHIP SELECTION */
  const [selectedBet, setSelectedBet] = useState(25);

  /* SESSION SCORE
     Accumulates wins across rounds. */
  const [sessionScore, setSessionScore] = useState(() => {
    return Number(localStorage.getItem("blackjackSessionScore") || 0);
  });

  /* ROUND TRACKER
     Prevents counting the same finished round multiple times. */
  const lastProcessedRoundRef = useRef("");

  useEffect(() => {
    /* CONNECT HANDLER */
    const onConnect = () => {
      console.log("Joining room:", roomId);
      setMyId(socket.id);
      socket.emit("join_game", { roomId });
    };

    /* GAME UPDATE HANDLER */
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

  /* SAFE DERIVED VALUES
     Avoids crashes if backend sends partial data. */
  const playerOrder = gameState?.playerOrder ?? [];
  const players = gameState?.players ?? {};
  const dealerHand = gameState?.dealerHand ?? [];
  const dealerScore = gameState?.dealerScore ?? 0;
  const currentTurn = gameState?.turn ?? null;
  const currentGameState = gameState?.gameState ?? "waiting";
  const myPlayer = players?.[myId] ?? null;

  /* ROUND RESULT -> SESSION SCORE */
  useEffect(() => {
    if (!gameState || !myId || !myPlayer) return;
    if (currentGameState !== "finished") return;
    if (!myPlayer.result) return;

    const roundKey = JSON.stringify({
      dealer: dealerHand,
      hand: myPlayer.hand ?? [],
      result: myPlayer.result,
      state: currentGameState,
    });

    if (lastProcessedRoundRef.current === roundKey) return;

    let pointsToAdd = 0;
    if (myPlayer.result === "win") pointsToAdd = 1;

    const updatedScore = sessionScore + pointsToAdd;
    setSessionScore(updatedScore);
    localStorage.setItem("blackjackSessionScore", String(updatedScore));

    lastProcessedRoundRef.current = roundKey;
  }, [gameState, myId, myPlayer, dealerHand, currentGameState, sessionScore]);

  /* GAME ACTIONS */
  const handleStart = () => {
    socket.emit("start_round", roomId);
  };

  const handleHit = () => {
    socket.emit("action_hit", roomId);
  };

  const handleStand = () => {
    socket.emit("action_stand", roomId);
  };

  const handleDouble = () => {
    console.log("Double action is not implemented in the backend yet.");
  };

  const handleChipSelect = (chipValue) => {
    setSelectedBet(chipValue);
  };

  /* GAME STATUS LABEL */
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

  /* LOADING SCREEN */
  if (!gameState) {
    return (
      <div className="game-page">
        <Navbar />
        <main className="game-main game-loading">
          <div className="game-loading__box">Loading table...</div>
        </main>
        <Footer />
      </div>
    );
  }

  /* DERIVED PLAYER INFO */
  const amIHost = playerOrder[0] === myId;
  const isMyTurn = currentTurn === myId;

  return (
    <div className="game-page">
      <Navbar />

      <main className="game-main blackjack-page">
        <section className="blackjack-wrapper">
          <div className="blackjack-table">
            <div className="table-hud">
              <div className="hud-box">
                <span className="hud-box__label">Table</span>
                <strong>{tableLabel}</strong>
              </div>

              <div className="hud-box hud-box--center">
                <span className="hud-box__label">Status</span>
                <strong>{gameStatusLabel}</strong>
              </div>

              <div className="hud-box">
                <span className="hud-box__label">Selected Chip</span>
                <strong>{selectedBet}</strong>
              </div>
            </div>

            {currentGameState === "waiting" && (
              <div className="table-felt-text">
                <p className="table-felt-text__title">Blackjack</p>
                <p>Dealer stands on 17 · Insurance pays 2 to 1</p>
              </div>
            )}

            <div className="dealer-zone">
              <div className="dealer-zone__header">
                <h2>Dealer</h2>
                <span className="dealer-zone__score">Score: {dealerScore}</span>
              </div>

              <div className="dealer-hand">
                {dealerHand.map((card, index) => (
                  <div
                    key={`${card?.value ?? "x"}-${card?.suit ?? "x"}-${index}`}
                    className="deal-card deal-card--dealer"
                    style={{ animationDelay: `${index * 0.18}s` }}
                  >
                    <Card value={card?.value} suit={card?.suit} />
                  </div>
                ))}

                {currentGameState === "playing" && (
                  <div
                    className="deal-card deal-card--dealer"
                    style={{ animationDelay: `${dealerHand.length * 0.18}s` }}
                  >
                    <Card hidden={true} />
                  </div>
                )}
              </div>
            </div>

            {currentGameState === "waiting" && (
              <div className="table-center-message">
                <p>
                  Waiting for players... <strong>({playerOrder.length} seated)</strong>
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
              {playerOrder.map((playerId, index) => {
                const player = players?.[playerId];
                if (!player) return null;

                const isMe = playerId === myId;
                const isTurn = currentTurn === playerId;
                const hand = player.hand ?? [];

                return (
                  <article
                    key={playerId}
                    className={[
                      "player-seat",
                      isMe ? "player-seat--me" : "",
                      isTurn ? "player-seat--active" : "",
                    ].join(" ")}
                  >
                    <div className="player-seat__badge">
                      {isMe ? "YOU" : `PLAYER ${index + 1}`}
                    </div>

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
                <div className="bet-panel__label">Chip Selection (UI only)</div>

                <div className="bet-chips">
                  {[5, 10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`bet-chip bet-chip--${chip} ${
                        selectedBet === chip ? "is-selected" : ""
                      }`}
                      onClick={() => handleChipSelect(chip)}
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
                    disabled={!(currentGameState === "playing" && isMyTurn)}
                    type="button"
                  >
                    <span className="casino-action__title">Hit</span>
                    <span className="casino-action__sub">Draw a card</span>
                  </button>

                  <button
                    className="casino-action casino-action--gold"
                    onClick={handleStand}
                    disabled={!(currentGameState === "playing" && isMyTurn)}
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