import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../socket";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Lobby() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const autoMoveRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lobbyRooms, setLobbyRooms] = useState({});

  const tables = useMemo(
    () => [
      {
        id: "solo-table",
        name: "Solo Table",
        maxPlayers: 1,
        minBet: 5,
        maxBet: 200,
        stakes: "$5 / $200",
        mode: "Solo",
        description: "A private practice table just for you",
      },
      {
        id: "gold-room",
        name: "Golden Table",
        maxPlayers: 2,
        minBet: 10,
        maxBet: 1000,
        stakes: "$10 / $1000",
        mode: "Versus",
        description: "A two-player table for competitive duels",
      },
      {
        id: "emerald-room",
        name: "Emerald Room",
        maxPlayers: 4,
        minBet: 5,
        maxBet: 500,
        stakes: "$5 / $500",
        mode: "Multiplayer",
        description: "A relaxed table with soft stakes",
      },
      {
        id: "royal-room",
        name: "Royal Lounge",
        maxPlayers: 4,
        minBet: 25,
        maxBet: 2000,
        stakes: "$25 / $2000",
        mode: "Multiplayer",
        description: "A room for sharper players with bolder bets",
      },
      {
        id: "diamond-room",
        name: "Diamond Room",
        maxPlayers: 5,
        minBet: 35,
        maxBet: 3500,
        stakes: "$35 / $3500",
        mode: "Multiplayer",
        description: "A five-seat premium table for larger hands",
      },
      {
        id: "velvet-room",
        name: "Velvet Room",
        maxPlayers: 6,
        minBet: 10,
        maxBet: 1000,
        stakes: "$10 / $1000",
        mode: "Multiplayer",
        description: "Wider table for +4 players",
      },
    ],
    []
  );
  
  const visibleCards = 3;
  const maxIndex = Math.max(0, tables.length - visibleCards);

  useEffect(() => {
    const existingSelectedRoom = localStorage.getItem("selectedRoom");

    if (!existingSelectedRoom && tables.length > 0) {
      localStorage.setItem("selectedRoom", JSON.stringify(tables[0]));
    }
  }, [tables]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleLobbyState = (rooms) => {
      const mappedRooms = {};

      if (Array.isArray(rooms)) {
        rooms.forEach((room) => {
          mappedRooms[room.roomId] = room;
        });
      }

      setLobbyRooms(mappedRooms);
    };

    socket.on("lobby_state", handleLobbyState);
    socket.emit("get_lobby_state");

    return () => {
      socket.off("lobby_state", handleLobbyState);
    };
  }, []);

  const handleJoinTable = (table) => {
    localStorage.setItem("selectedRoom", JSON.stringify(table));
    navigate("/game");
  };

  const goLeft = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const goRight = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const stopAutoMove = () => {
    if (autoMoveRef.current) {
      clearInterval(autoMoveRef.current);
      autoMoveRef.current = null;
    }
  };

  const startAutoMove = (direction) => {
    stopAutoMove();

    autoMoveRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (direction === "right") return Math.min(prev + 1, maxIndex);
        return Math.max(prev - 1, 0);
      });
    }, 550);
  };

  useEffect(() => {
    return () => stopAutoMove();
  }, []);

  return (
    <div className="page shell">
      <Navbar />

      <main className="profile-page profile-page--decorated">
        <div className="profile-bg-cards" aria-hidden="true">
          <div className="profile-bg-cards__deck profile-bg-cards__deck--rich">
            <div className="casino-card casino-card--back profile-casino-card profile-casino-card--1">
              <div className="casino-card__inner"></div>
            </div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--2">
              <div className="casino-card__inner">
                <div className="casino-card__corner casino-card__corner--top">
                  <span>A</span>
                  <span>♠</span>
                </div>
                <div className="casino-card__center">♠</div>
                <div className="casino-card__corner casino-card__corner--bottom">
                  <span>A</span>
                  <span>♠</span>
                </div>
              </div>
            </div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--3 card-red">
              <div className="casino-card__inner">
                <div className="casino-card__corner casino-card__corner--top">
                  <span>K</span>
                  <span>♥</span>
                </div>
                <div className="casino-card__center">♥</div>
                <div className="casino-card__corner casino-card__corner--bottom">
                  <span>K</span>
                  <span>♥</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="lobby-header">
          <div className="lobby-header__copy">
            <span className="lobby-header__eyebrow">Lobby</span>
            <h1>Hi, {username || "Player"}!</h1>
            <p>Choose a table to start playing</p>
          </div>

          <button
            className="btn btn-pill-profile"
            onClick={() => navigate("/profile")}
            type="button"
          >
            <span className="btn-circle__content">
              <span className="btn-circle__icon"></span>
              <span className="btn-circle__label">My profile</span>
            </span>
          </button>
        </section>

        <section className="tables-carousel">
          <div
            className="carousel-side-zone carousel-side-zone--left"
            onMouseEnter={() => {
              goLeft();
              startAutoMove("left");
            }}
            onMouseLeave={stopAutoMove}
          >
            <button
              className="carousel-arrow"
              aria-label="Move tables to the left"
              onClick={goLeft}
              type="button"
              disabled={currentIndex === 0}
            >
              ‹
            </button>
          </div>

          <div className="tables-carousel__viewport">
            <div
              className="tables-grid--scroll"
              style={{
                transform: `translateX(calc(-${currentIndex} * ((100% - 2rem) / 3 + 1rem)))`,
              }}
            >
              {tables.map((table) => {
                const isSolo = table.mode === "Solo";
                const roomInfo = lobbyRooms[table.id];

                const playersCount = roomInfo?.playersCount ?? 0;
                const spectatorsCount = roomInfo?.spectatorsCount ?? 0;
                const totalConnected = roomInfo?.totalConnected ?? playersCount + spectatorsCount;

                const isFull = playersCount >= table.maxPlayers;
                const isInGame = roomInfo?.gameState === "playing";

                const statusLabel = isSolo
                  ? "Private"
                  : isFull
                    ? "Full"
                    : isInGame
                      ? "In Game"
                      : "Live Room";

                const statusClass = isFull
                  ? "table-status table-status--danger"
                  : "table-status table-status--ok";
                
                return (
                  <article className="glass-card table-card" key={table.id}>
                    <div className="table-card__top">
                      <div>
                        <span className="table-card__tag">{table.mode}</span>
                        <h3>{table.name}</h3>
                      </div>

                       <span className={statusClass}>{statusLabel}</span>
                    </div>

                    <div className="table-preview">
                      <div className="table-preview__felt">
                        <div className="table-preview__arc"></div>
                        <div className="table-preview__dealer">DEALER</div>
                        <div className="table-preview__spot table-preview__spot--1"></div>
                        <div className="table-preview__spot table-preview__spot--2"></div>
                        <div className="table-preview__spot table-preview__spot--3"></div>
                        <div className="table-preview__chip table-preview__chip--1"></div>
                        <div className="table-preview__chip table-preview__chip--2"></div>
                      </div>
                    </div>

                    <div className="table-card__meta">
                      <div>
                        <small>Stakes</small>
                        <strong>{table.stakes}</strong>
                      </div>

                      <div>
                        <small>Players</small>
                        <strong>
                          {playersCount} / {table.maxPlayers}
                        </strong>
                      </div>

                      <div>
                        <small>Watching</small>
                        <strong>{spectatorsCount}</strong>
                      </div>
                    </div>

                    <p className="table-card__description">{table.description}</p>

                    <div className="table-card__footer-info">
                      <small>Total connected: {totalConnected}</small>
                    </div>

                    <button
                      className="btn btn-gold btn-block"
                      onClick={() => handleJoinTable(table)}
                      type="button"
                    >
                      Join Table
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <div
            className="carousel-side-zone carousel-side-zone--right"
            onMouseEnter={() => {
              goRight();
              startAutoMove("right");
            }}
            onMouseLeave={stopAutoMove}
          >
            <button
              className="carousel-arrow"
              aria-label="Move tables to the right"
              onClick={goRight}
              type="button"
              disabled={currentIndex === maxIndex}
            >
              ›
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Lobby;