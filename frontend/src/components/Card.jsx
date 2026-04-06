import React from "react";

const Card = ({ value, suit, hidden = false }) => {
  const isRed = suit === "♥" || suit === "♦";

  return (
    <>
      <style>{`
        .playing-card-scene {
          width: 96px;
          height: 136px;
          perspective: 900px;
          margin: 4px;
          flex: 0 0 auto;
        }

        .playing-card {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.55s ease;
        }

        .playing-card.is-hidden {
          transform: rotateY(180deg);
        }

        .playing-card__face {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          backface-visibility: hidden;
          overflow: hidden;
          box-sizing: border-box;
        }

        .playing-card__front {
          background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
          border: 1px solid #d8d8d8;
          box-shadow:
            0 10px 20px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px;
        }

        .playing-card__front.red {
          color: #c61f32;
        }

        .playing-card__front.black {
          color: #151515;
        }

        .playing-card__corner {
          display: flex;
          flex-direction: column;
          line-height: 1;
          font-weight: 700;
        }

        .playing-card__corner--top {
          align-self: flex-start;
        }

        .playing-card__corner--bottom {
          align-self: flex-end;
          transform: rotate(180deg);
        }

        .playing-card__value {
          font-size: 1.05rem;
        }

        .playing-card__suit-small {
          font-size: 0.95rem;
          margin-top: 2px;
        }

        .playing-card__center-suit {
          align-self: center;
          font-size: 2.9rem;
          line-height: 1;
        }

        .playing-card__back {
          transform: rotateY(180deg);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
            repeating-linear-gradient(
              45deg,
              #7f1630 0px,
              #7f1630 10px,
              #a32042 10px,
              #a32042 20px
            );
          border: 2px solid #f4f0e4;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .playing-card__back-frame {
          width: calc(100% - 12px);
          height: calc(100% - 12px);
          border: 2px solid rgba(255, 255, 255, 0.45);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .playing-card__back-center {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>

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
    </>
  );
};

export default Card;

/* OLD CARD ELEMENT */

/*
import React from 'react';

const Card = ({ value, suit, hidden }) => {
  const isRed = suit === '♥' || suit === '♦';

  // --- ESTILOS ---
  
  // 1. El escenario 3D
  const sceneStyle = {
    width: '100px',
    height: '140px',
    perspective: '600px',
    margin: '5px' // Espacio entre cartas
  };

  // 2. La carta que gira
  const cardStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    transform: hidden ? 'rotateY(180deg)' : 'rotateY(0deg)',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  // 3. Estilo base para ambas caras (Frente y Dorso)
  const faceStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Pega los números a las esquinas
    padding: '8px', // He reducido el padding para que quepa todo
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    backgroundColor: 'white',
    fontFamily: 'Arial, sans-serif'
  };

  // 4. Cara FRONTAL (Números)
  const frontStyle = {
    ...faceStyle,
    color: isRed ? '#d40000' : 'black', // Rojo más bonito
    transform: 'rotateY(0deg)'
  };

  // 5. Cara TRASERA (Dorso con patrón)
  const backStyle = {
    ...faceStyle,
    background: '#b02a2a', // Rojo oscuro
    // Un patrón de cuadros css puro para que quede chulo
    backgroundImage: `
      repeating-linear-gradient(45deg, transparent, transparent 10px, #902020 10px, #902020 20px),
      linear-gradient(to bottom, #b02a2a, #801010)
    `,
    transform: 'rotateY(180deg)',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid white'
  };

  // Estilos de texto para que no se desborden
  const cornerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: '1', // IMPORTANTE: Evita que se separen mucho verticalmente
    fontSize: '16px', // Tamaño contenido
    fontWeight: 'bold'
  };

  const centerSuitStyle = {
    alignSelf: 'center',
    fontSize: '40px', // El palo central grande
    lineHeight: '1',
    marginTop: '-5px' // Pequeño ajuste visual
  };

  return (
    <div style={sceneStyle}>
      <div style={cardStyle}>
        
        {/* CARA DE DELANTE *}
        <div style={frontStyle}>
          
          {/* Esquina Superior Izquierda *}
          <div style={{ ...cornerStyle, alignSelf: 'flex-start' }}>
            <div>{value}</div>
            <div style={{ fontSize: '14px' }}>{suit}</div>
          </div>

          {/* Palo Central Gigante *}
          <div style={centerSuitStyle}>
            {suit}
          </div>

          {/* Esquina Inferior Derecha (Rotada) *}
          <div style={{ ...cornerStyle, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
            <div>{value}</div>
            <div style={{ fontSize: '14px' }}>{suit}</div>
          </div>
          
        </div>

        {/* CARA DE DETRÁS *}
        <div style={backStyle}>
          {/* Círculo decorativo en el centro del dorso *}
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            border: '2px solid rgba(255,255,255,0.3)', 
            backgroundColor: 'rgba(0,0,0,0.1)' 
          }}></div>
        </div>

      </div>
    </div>
  );
};

export default Card;
*/