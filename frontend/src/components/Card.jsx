import React from 'react';

const Card = ({ value, suit }) => {
  // Color rojo para corazones y diamantes
  const isRed = suit === '♥' || suit === '♦';
  
  return (
    <div style={{
      width: '100px',
      height: '140px',
      backgroundColor: 'white',
      borderRadius: '10px',
      border: '1px solid #ccc',
      boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '10px',
      margin: '5px',
      color: isRed ? 'red' : 'black',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      {/* Esquina superior izquierda */}
      <div style={{ textAlign: 'left' }}>
        <div>{value}</div>
        <div>{suit}</div>
      </div>
      
      {/* Centro grande */}
      <div style={{ alignSelf: 'center', fontSize: '40px' }}>
        {suit}
      </div>

      {/* Esquina inferior derecha (invertida) */}
      <div style={{ textAlign: 'right', transform: 'rotate(180deg)' }}>
        <div>{value}</div>
        <div>{suit}</div>
      </div>
    </div>
  );
};

export default Card;