import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socket } from './socket';
import Card from './components/Card';
import Login from './components/Login';
import Register from './components/Register';
import './App.css';

// --- COMPONENTE DE LA MESA DE JUEGO ---
function GameTable({ user, onLogout }) {
  const [roomId] = useState("Mesa VIP #1");
  const [gameState, setGameState] = useState(null);

  // Lógica de conexión y eventos del Socket
  useEffect(() => {
    const onConnect = () => {
      console.log('🔌 Conectado al servidor. Enviando credenciales...');
      // CRÍTICO: Enviamos user.id para que el servidor sepa quién somos tras un F5
      socket.emit('join_game', { 
        roomId, 
        user: { id: user.id, username: user.username }
      });
    };

    const onGameUpdate = (state) => {
      console.log('🎮 Estado recibido:', state);
      setGameState(state);
    };

    socket.on('connect', onConnect);
    socket.on('game_update', onGameUpdate);

    // Si ya estaba conectado (navegación rápida), forzamos el join manual
    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('game_update', onGameUpdate);
    };
  }, [roomId, user.id, user.username]);

  // Acciones del jugador
  const handleStart = () => socket.emit('start_round', roomId);
  const handleHit = () => socket.emit('action_hit', roomId);
  const handleStand = () => socket.emit('action_stand', roomId);

  // Pantalla de carga mientras llega el estado del juego
  if (!gameState) {
    return (
      <div className="game-container" style={{justifyContent: 'center'}}>
        <div style={{fontSize: '3rem'}}>🎰</div>
        <h2>Conectando al Casino...</h2>
      </div>
    );
  }

    return (
    <div className="game-container">
      {/* HEADER VIP */}
      <header className="game-header">
        <div className="header-left">
          <div style={{ fontSize: '28px', filter: 'drop-shadow(0 0 5px gold)' }}>💰</div>
          <h2 style={{ margin: 0, letterSpacing: '2px', color: 'var(--gold)' }}>{roomId.toUpperCase()}</h2>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
            <span style={{ color: 'var(--gold)', fontSize: '0.65rem', fontWeight: '900', display: 'block' }}>ACCOUNT STATUS</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{user.username.toUpperCase()}</span>
          </div>
          <button onClick={onLogout} className="btn-casino" style={{ padding: '8px 20px', fontSize: '0.7rem', background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', color: '#e74c3c' }}>
            LEAVE TABLE
          </button>
        </div>
      </header>

      {/* ZONA DEL DEALER */}
      <div className="dealer-section">
        <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '4px' }}>DEALER</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          {gameState.dealerHand.map((c, i) => (
            <div key={i} style={{ transform: 'rotate(-2deg)' }}>
              <Card value={c.value} suit={c.suit} />
            </div>
          ))}
          {gameState.gameState === 'playing' && (
            <div className="card-back-v2" style={{ 
              width: '80px', height: '115px', 
              background: 'repeating-linear-gradient(45deg, #800, #800 10px, #a00 10px, #a00 20px)',
              borderRadius: '10px', border: '3px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' 
            }} />
          )}
        </div>
        <div style={{ marginTop: '20px' }}>
          <span className="score-badge">DEALER STANDS ON 17</span>
          <span className="score-badge" style={{ marginLeft: '10px', background: 'white' }}>{gameState.dealerScore}</span>
        </div>
      </div>

      {/* BOTÓN START CON ESTILO "INVITACIÓN AL JUEGO" */}
      {gameState.gameState === 'waiting' && (
        <div style={{ textAlign: 'center', margin: '20px' }}>
          <button onClick={handleStart} className="btn-casino" 
            style={{ background: 'var(--gold)', color: 'black', padding: '20px 60px', fontSize: '1.4rem', boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)' }}>
            PLACE YOUR BETS
          </button>
        </div>
      )}

      {/* GRID DE JUGADORES */}
      <div className="players-grid">
        {gameState.playerOrder.map((playerId) => {
          const player = gameState.players[playerId];
          const isMe = String(playerId) === String(user.id);
          const isSeatTurn = String(gameState.turn) === String(playerId);

          return (
            <div key={playerId} className={`player-seat ${isMe ? 'is-me' : ''} ${isSeatTurn ? 'active-turn' : ''}`}>
              {isSeatTurn && (
                <div className="turn-label" style={{
                  position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', 
                  background: 'var(--gold)', color: 'black', padding: '4px 15px', 
                  borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900', boxShadow: '0 0 15px var(--gold)'
                }}>
                  ACTING...
                </div>
              )}

              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '900', letterSpacing: '1px', fontSize: '0.9rem' }}>
                  {isMe ? 'Yo' : player.username.toUpperCase()}
                </span>
                <span className="score-badge">{player.score}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', height: '120px' }}>
                {player.hand.map((c, i) => (
                  <div key={i} style={{ transform: `translateX(${i * -20}px) rotate(${i * 2}deg)`, zIndex: i }}>
                    <Card value={c.value} suit={c.suit} />
                  </div>
                ))}
              </div>

              {player.result && (
                <div style={{ 
                  marginTop: '15px', fontWeight: '900', fontSize: '1.5rem',
                  textAlign: 'center', color: player.result === 'win' ? '#2ecc71' : '#e74c3c',
                  textShadow: '0 0 10px rgba(0,0,0,0.5)'
                }}>
                  {player.result.toUpperCase()}
                </div>
              )}

              {isMe && isSeatTurn && gameState.gameState === 'playing' && (
                <div style={{ display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'center' }}>
                  <button onClick={handleHit} className="btn-casino btn-hit">HIT</button>
                  <button onClick={handleStand} className="btn-casino btn-stand">STAND</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (RUTAS Y AUTH) ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // 1. Verificar sesión al cargar la página (F5)
  useEffect(() => {
    fetch('/api/auth/verify', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      })
      .catch(err => console.error('Error de sesión:', err))
      .finally(() => setIsCheckingAuth(false));
  }, []);

  // 2. Handlers de Login/Registro
  const handleAuthSuccess = (userData) => {
    console.log('✅ Auth correcta:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    navigate('/');
  };

  // 3. Handler de Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    socket.disconnect(); // Desconectamos socket al salir voluntariamente
    navigate('/login');
  };

  if (isCheckingAuth) {
    return (
      <div className="game-container" style={{justifyContent: 'center'}}>
        <h1>Cargando Casino...</h1>
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
            <Login onLogin={handleAuthSuccess} onSwitchToRegister={() => navigate('/register')} />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      <Route 
        path="/register" 
        element={
          !isAuthenticated ? (
            <Register onRegister={handleAuthSuccess} onSwitchToLogin={() => navigate('/login')} />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;