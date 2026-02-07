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
        
        {/* CARA DE DELANTE */}
        <div style={frontStyle}>
          
          {/* Esquina Superior Izquierda */}
          <div style={{ ...cornerStyle, alignSelf: 'flex-start' }}>
            <div>{value}</div>
            <div style={{ fontSize: '14px' }}>{suit}</div>
          </div>

          {/* Palo Central Gigante */}
          <div style={centerSuitStyle}>
            {suit}
          </div>

          {/* Esquina Inferior Derecha (Rotada) */}
          <div style={{ ...cornerStyle, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
            <div>{value}</div>
            <div style={{ fontSize: '14px' }}>{suit}</div>
          </div>
          
        </div>

        {/* CARA DE DETRÁS */}
        <div style={backStyle}>
          {/* Círculo decorativo en el centro del dorso */}
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