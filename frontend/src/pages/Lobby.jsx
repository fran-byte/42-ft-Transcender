import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Lobby() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const autoMoveRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const tables = useMemo(
    () => [
      {
        id: "solo-table",
        name: "Solo Table",
        players: 0,
        maxPlayers: 1,
        seats: 1,
        stakes: "$5 / $200",
        status: "Open",
        mode: "Solo",
      },
      {
        id: "emerald-room",
        name: "Emerald Room",
        players: 2,
        maxPlayers: 4,
        seats: 4,
        stakes: "$5 / $500",
        status: "Waiting...",
        mode: "Multiplayer",
      },
      {
        id: "gold-room",
        name: "Golden Table",
        players: 1,
        maxPlayers: 4,
        seats: 4,
        stakes: "$10 / $1000",
        status: "Open",
        mode: "Multiplayer",
      },
      {
        id: "royal-room",
        name: "Royal Lounge",
        players: 4,
        maxPlayers: 4,
        seats: 4,
        stakes: "$25 / $2000",
        status: "Full",
        mode: "Multiplayer",
      },
      {
        id: "diamond-room",
        name: "Diamond Room",
        players: 3,
        maxPlayers: 5,
        seats: 5,
        stakes: "$15 / $1500",
        status: "Open",
        mode: "Multiplayer",
      },
      {
        id: "velvet-room",
        name: "Velvet Room",
        players: 2,
        maxPlayers: 6,
        seats: 6,
        stakes: "$20 / $2500",
        status: "Waiting...",
        mode: "Multiplayer",
      },
    ],
    []
  );

  const visibleCards = 3;
  const maxIndex = Math.max(0, tables.length - visibleCards);

  /* DEFAULT TABLE
     Ensures the first table (solo table) is available as default
     when entering the game without manually choosing another table. */
  useEffect(() => {
    const existingSelectedRoom = localStorage.getItem("selectedRoom");

    if (!existingSelectedRoom && tables.length > 0) {
      localStorage.setItem("selectedRoom", JSON.stringify(tables[0]));
    }
  }, [tables]);

  const handleJoinTable = (table, isFull) => {
    if (isFull) return;
    localStorage.setItem("selectedRoom", JSON.stringify(table));
    navigate("/game");
  };

  const goLeft = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const goRight = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
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

  const stopAutoMove = () => {
    if (autoMoveRef.current) {
      clearInterval(autoMoveRef.current);
      autoMoveRef.current = null;
    }
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
            <div className="casino-card casino-card--back profile-casino-card profile-casino-card--1"></div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--2">
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

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--3 card-red">
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

        <section className="lobby-header">
          <div className="lobby-header__copy">
            <span className="lobby-header__eyebrow">Lobby</span>
            <h1>Hi, {username}!</h1>
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
            onMouseEnter={() => goLeft() || startAutoMove("left")}
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
                const isFull = table.players >= table.maxPlayers;

                return (
                  <article className="glass-card table-card" key={table.id}>
                    <div className="table-card__top">
                      <div>
                        <span className="table-card__tag">{table.mode}</span>
                        <h3>{table.name}</h3>
                      </div>

                      <span
                        className={`table-status ${
                          table.status === "Full"
                            ? "table-status--danger"
                            : "table-status--ok"
                        }`}
                      >
                        {table.status}
                      </span>
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
                        <small>Seats</small>
                        <strong>
                          {table.players}/{table.seats}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-gold btn-block"
                      disabled={isFull}
                      onClick={() => handleJoinTable(table, isFull)}
                      type="button"
                    >
                      {isFull ? "Table Full" : "Join Table"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <div
            className="carousel-side-zone carousel-side-zone--right"
            onMouseEnter={() => goRight() || startAutoMove("right")}
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