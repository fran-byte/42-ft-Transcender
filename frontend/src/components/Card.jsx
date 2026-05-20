import React from "react";
import "../styles/Card.css"; // ← Ruta correcta desde components/

const Card = ({ value, suit, hidden = false }) => {
  const isRed = suit === "♥" || suit === "♦";

  return (
    <div className="playing-card-scene">
      <div className={`playing-card ${hidden ? "is-hidden" : ""}`}>
        <div
          className={`playing-card__face playing-card__front ${
            isRed ? "red" : "black"
          }`}
        >
          <div className="playing-card__corner playing-card__corner--top">
            <span className="playing-card__value">{value}</span>
            <span className="playing-card__suit-small">{suit}</span>
          </div>

          <div className="playing-card__center-suit">{suit}</div>

          <div className="playing-card__corner playing-card__corner--bottom">
            <span className="playing-card__value">{value}</span>
            <span className="playing-card__suit-small">{suit}</span>
          </div>
        </div>

        <div className="playing-card__face playing-card__back">
          <div className="playing-card__back-frame">
            <div className="playing-card__back-center"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Card);
