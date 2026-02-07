import { useState, useEffect } from 'react';
import { socket } from './socket';
import Card from './components/Card';
import './App.css';

function App() {
  const [roomId, setRoomId] = useState("mesa-1");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");

  useEffect(() => {
    const onConnect = () => {
        setMyId(socket.id);
        // Enviar como objeto para coincidir con la desestructuración en el servidor
        socket.emit('join_game', { roomId });
    };
    const onGameUpdate = (state) => setGameState(state);

    socket.on('connect', onConnect);
    socket.on('game_update', onGameUpdate);
    
    if (socket.connected) onConnect();

    return () => {
        socket.off('connect', onConnect);
        socket.off('game_update', onGameUpdate);
    };
  }, []);

  const handleStart = () => socket.emit('start_round', roomId);
  const handleHit = () => socket.emit('action_hit', roomId);
  const handleStand = () => socket.emit('action_stand', roomId);

  if (!gameState) return <div style={{color:'white'}}>Cargando Lobby...</div>;

  // Detectamos si soy el "Host" (el primero de la lista) para mostrar el botón de empezar
  const amIHost = gameState.playerOrder[0] === myId;

  return (
    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#2d572c', minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      
      {/* CABECERA */}
      <div style={{marginBottom: 20}}>
          <h1>Mesa Multijugador: {roomId}</h1>
          <p>Estado: <strong>{gameState.gameState.toUpperCase()}</strong></p>
          
          {/* BOTÓN START: Solo si estamos esperando y soy el Host (o simplificado para todos) */}
          {gameState.gameState === 'waiting' && (
              <div style={{padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 10, display: 'inline-block'}}>
                  <p>Esperando jugadores... ({gameState.playerOrder.length} sentados)</p>
                  <button onClick={handleStart} style={{padding: '10px 30px', fontSize: 20, cursor: 'pointer', background: '#d4af37', border: 'none', borderRadius: 5}}>
                      REPARTIR CARTAS 
                  </button>
              </div>
          )}
      </div>
      
      {/* 1. DEALER AREA */}
      <div style={{ marginBottom: 40, padding: 20, borderBottom: '2px dashed #fff5' }}>
        <h2>Dealer</h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            {gameState.dealerHand.map((c, i) => <Card key={i} value={c.value} suit={c.suit} />)}
            {gameState.gameState === 'playing' && 
                <div style={{width: 100, height: 140, background: '#a00', borderRadius: 10, border: '2px solid white', margin: 5}}></div>
            }
        </div>
        <h2>(Puntos: {gameState.dealerScore})</h2>
      </div>

      {/* 2. PLAYERS ROW (Fila de asientos) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          
          {gameState.playerOrder.map((playerId) => {
              const player = gameState.players[playerId];
              const isMe = playerId === myId;
              const isMyTurn = gameState.turn === playerId;

              // Estilo dinámico si es mi turno
              const seatStyle = {
                  border: isMyTurn ? '4px solid yellow' : '1px solid #ccc',
                  background: isMe ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
                  padding: 10, borderRadius: 10, minWidth: 200,
                  boxShadow: isMyTurn ? '0 0 20px yellow' : 'none',
                  transition: 'all 0.3s'
              };

              return (
                  <div key={playerId} style={seatStyle}>
                      <h3 style={{color: isMe ? '#88ff88' : 'white'}}>
                          {isMe ? 'TÚ' : `JUGADOR ${playerId.substr(0,4)}`}
                      </h3>
                      <p>Puntos: {player.score}</p>
                      
                      {/* CARTAS DEL JUGADOR */}
                      <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.8)' }}>
                          {player.hand.map((c, i) => <Card key={i} value={c.value} suit={c.suit} />)}
                      </div>

                      {/* RESULTADO FINAL */}
                      {player.result && (
                          <div style={{fontWeight: 'bold', fontSize: 20, color: player.result === 'win' ? '#0f0' : 'red'}}>
                              {player.result.toUpperCase()}
                          </div>
                      )}

                      {/* BOTONES DE ACCIÓN (Solo se muestran en MI asiento cuando es MI turno) */}
                      {isMe && isMyTurn && gameState.gameState === 'playing' && (
                          <div style={{marginTop: 10}}>
                              <button onClick={handleHit} style={{margin: 5, padding: '10px 20px', background: 'green', color: 'white', border:'none', cursor:'pointer'}}>PEDIR</button>
                              <button onClick={handleStand} style={{margin: 5, padding: '10px 20px', background: 'red', color: 'white', border:'none', cursor:'pointer'}}>PLANTARSE</button>
                          </div>
                      )}
                      
                      {/* Mensaje de estado para otros */}
                      {!isMe && isMyTurn && <p style={{color:'yellow'}}>Pensando...</p>}
                  </div>
              );
          })}
      </div>
    </div>
  )
}

export default App;