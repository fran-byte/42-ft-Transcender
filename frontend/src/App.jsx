import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socket } from './socket';
import Card from './components/Card';
import Login from './components/Login';
import Register from './components/Register';
import './App.css';

// Componente de la mesa de Blackjack
function GameTable({ user, onLogout }) {
  const [roomId] = useState("mesa-1");
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState("");

  useEffect(() => {
    const onConnect = () => {
      console.log('🔌 Socket conectado:', socket.id);
      setMyId(socket.id);
      socket.emit('join_game', { roomId, username: user.username });
    };

    const onDisconnect = () => {
      console.log('❌ Socket desconectado');
    };

    const onGameUpdate = (state) => {
      console.log('🎮 Game update recibido:', state);
      setGameState(state);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_update', onGameUpdate);

    // Conectar si no está conectado
    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_update', onGameUpdate);
    };
  }, [roomId, user.username]);

  const handleStart = () => socket.emit('start_round', roomId);
  const handleHit = () => socket.emit('action_hit', roomId);
  const handleStand = () => socket.emit('action_stand', roomId);

  if (!gameState) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2d572c',
        color: 'white',
        fontSize: '20px'
      }}>
        <div>🎰 Conectando a la mesa...</div>
        <div style={{marginTop: 10, fontSize: 14, opacity: 0.7}}>
          Socket ID: {myId || 'conectando...'}
        </div>
        <button 
          onClick={onLogout}
          style={{
            marginTop: 20,
            padding: '10px 20px',
            background: '#c33',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#2d572c', minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <div style={{marginBottom: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px'}}>
          <h1>Mesa Multijugador: {roomId}</h1>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span style={{fontSize: '18px'}}>👤 {user.username}</span>
            <button 
              onClick={onLogout}
              style={{
                padding: '8px 16px',
                background: '#c33',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
        <p>Estado: <strong>{gameState?.gameState.toUpperCase()}</strong></p>
        
        {gameState && gameState.gameState === 'waiting' && (
          <div style={{padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 10, display: 'inline-block'}}>
            <p>Esperando jugadores... ({gameState.playerOrder.length} sentados)</p>
            <button onClick={handleStart} style={{padding: '10px 30px', fontSize: 20, cursor: 'pointer', background: '#d4af37', border: 'none', borderRadius: 5}}>
              REPARTIR CARTAS 
            </button>
          </div>
        )}
      </div>
      
      {gameState && (
        <>
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {gameState.playerOrder.map((playerId) => {
              const player = gameState.players[playerId];
              const isMe = playerId === myId;
              const isMyTurn = gameState.turn === playerId;

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
                    {isMe ? `TÚ (${player.username})` : player.username}
                  </h3>
                  <p>Puntos: {player.score}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.8)' }}>
                    {player.hand.map((c, i) => <Card key={i} value={c.value} suit={c.suit} />)}
                  </div>

                  {player.result && (
                    <div style={{fontWeight: 'bold', fontSize: 20, color: player.result === 'win' ? '#0f0' : 'red'}}>
                      {player.result.toUpperCase()}
                    </div>
                  )}

                  {isMe && isMyTurn && gameState.gameState === 'playing' && (
                    <div style={{marginTop: 10}}>
                      <button onClick={handleHit} style={{margin: 5, padding: '10px 20px', background: 'green', color: 'white', border:'none', cursor:'pointer'}}>PEDIR</button>
                      <button onClick={handleStand} style={{margin: 5, padding: '10px 20px', background: 'red', color: 'white', border:'none', cursor:'pointer'}}>PLANTARSE</button>
                    </div>
                  )}
                  
                  {!isMe && isMyTurn && <p style={{color:'yellow'}}>Pensando...</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Componente principal con rutas
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Verificar sesión al cargar
  useEffect(() => {
    fetch('/api/auth/verify', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      })
      .catch(err => {
        console.error('Error verificando sesión:', err);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  const handleLogin = (userData) => {
    console.log('✅ Login exitoso:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    navigate('/');
  };

  const handleRegister = (userData) => {
    console.log('✅ Registro exitoso:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    
    setUser(null);
    setIsAuthenticated(false);
    socket.disconnect();
    navigate('/login');
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        fontSize: '24px'
      }}>
        🎰 Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <GameTable user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="/login" 
        element={
          !isAuthenticated ? (
            <Login 
              onLogin={handleLogin}
              onSwitchToRegister={() => navigate('/register')}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      <Route 
        path="/register" 
        element={
          !isAuthenticated ? (
            <Register 
              onRegister={handleRegister}
              onSwitchToLogin={() => navigate('/login')}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} 
      />
    </Routes>
  );
}

export default App;