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
      { id: "emerald-room", name: "Emerald Room", players: 2, maxPlayers: 4, status: "Esperando" },
      { id: "gold-room", name: "Golden Table", players: 1, maxPlayers: 4, status: "Disponible" },
      { id: "royal-room", name: "Royal Lounge", players: 4, maxPlayers: 4, status: "Completa" },
      { id: "diamond-room", name: "Diamond Room", players: 3, maxPlayers: 4, status: "Disponible" },
      { id: "velvet-room", name: "Velvet Room", players: 2, maxPlayers: 4, status: "Esperando" },
    ],
    []
  );

  const visibleCards = 3;
  const maxIndex = Math.max(0, tables.length - visibleCards);

  const handleJoinTable = (tableId, isFull) => {
    if (isFull) return;
    localStorage.setItem("selectedRoom", tableId);
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
          <div className="profile-bg-cards__deck">
            <div className="floating-card floating-card--back profile-card--1"></div>
            <div className="floating-card floating-card--front profile-card--2">
              <span>A♠</span>
            </div>
            <div className="floating-card floating-card--front profile-card--3">
              <span>K♥</span>
            </div>
          </div>
        </div>
        <section className="lobby-header">
          <div className="lobby-header__copy">
            <span className="lobby-header__eyebrow">Lobby</span>
            <h1>Hola, {username}</h1>
            <p>Elige una mesa disponible para entrar a jugar.</p>
          </div>

          <button
            className="btn btn-pill-profile"
            onClick={() => navigate("/profile")}
            type="button"
          >
            <span className="btn-circle__content">
              <span className="btn-circle__icon"></span>
              <span className="btn-circle__label">Perfil</span>
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
              aria-label="Mover mesas a la izquierda"
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
                        <span className="table-card__tag">{table.status}</span>
                        <h3>{table.name}</h3>
                      </div>

                      <span
                        className={`table-status ${
                          isFull ? "table-status--danger" : "table-status--ok"
                        }`}
                      >
                        {isFull ? "Completa" : "Disponible"}
                      </span>
                    </div>

                    <div className="table-card__meta">
                      <div>
                        <small>Jugadores</small>
                        <strong>
                          {table.players}/{table.maxPlayers}
                        </strong>
                      </div>

                      <div>
                        <small>Tipo</small>
                        <strong>Multiplayer</strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-block"
                      disabled={isFull}
                      onClick={() => handleJoinTable(table.id, isFull)}
                    >
                      {isFull ? "Mesa completa" : "Unirme a la mesa"}
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
              aria-label="Mover mesas a la derecha"
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