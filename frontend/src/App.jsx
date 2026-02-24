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
      {/* --- HEADER --- */}
      <header className="game-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '24px' }}>🃏</div>
          <h2 style={{ margin: 0, color: 'var(--gold)' }}>{roomId}</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{textAlign: 'right'}}>
            <span style={{ opacity: 0.7, fontSize: '0.7rem', display: 'block' }}>JUGADOR</span>
            <span style={{ fontWeight: 'bold' }}>{user.username}</span>
          </div>
          <button onClick={onLogout} className="btn-casino" style={{background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c'}}>
            SALIR
          </button>
        </div>
      </header>

      {/* --- ZONA DEL DEALER --- */}
      <div className="dealer-section">
        <div style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '2px' }}>DEALER</div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {gameState.dealerHand.map((c, i) => (
            <Card key={i} value={c.value} suit={c.suit} />
          ))}
          {/* Carta boca abajo si estamos jugando */}
          {gameState.gameState === 'playing' && (
            <div style={{ width: '80px', height: '110px', background: 'linear-gradient(45deg, #800, #c00)', borderRadius: '8px', border: '2px solid white' }} />
          )}
        </div>
        
        <div style={{marginTop: '15px'}}>
           <span className="score-badge">Puntos: {gameState.dealerScore}</span>
        </div>
      </div>

      {/* --- BOTÓN DE INICIO (SOLO EN WAITING) --- */}
      {gameState.gameState === 'waiting' && (
        <div style={{ margin: '20px' }}>
          <button onClick={handleStart} className="btn-casino" style={{background: 'var(--gold)', color: 'black', padding: '15px 40px', fontSize: '1.2rem'}}>
            REPARTIR CARTAS
          </button>
          <p style={{marginTop: 10, opacity: 0.7}}>Jugadores en mesa: {gameState.playerOrder.length}</p>
        </div>
      )}

      {/* GRID DE JUGADORES */}
      <div className="players-grid">
        {gameState.playerOrder.map((playerId) => {
          const player = gameState.players[playerId];
          
          // 1. ¿Soy yo este jugador? (Para saber si poner "TÚ")
          const isMe = String(playerId) === String(user.id);
          
          // 2. ¿Es el turno de ESTE asiento específico? (Para el borde dorado)
          // Comparamos el Turno Global con el ID de ESTE asiento
          const isSeatTurn = String(gameState.turn) === String(playerId);
        
          return (
            <div 
              key={playerId} 
              // CORREGIDO: Usamos isSeatTurn para la clase CSS
              className={`player-seat ${isMe ? 'is-me' : ''} ${isSeatTurn ? 'active-turn' : ''}`}
            >
              
              {/* Cartel de turno: Solo si es el turno de ESTE asiento */}
              {isSeatTurn && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', 
                  background: 'var(--gold)', color: 'black', padding: '4px 12px', 
                  borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900', zIndex: 10,
                  boxShadow: '0 0 10px var(--gold)'
                }}>
                  TURNO
                </div>
              )}
              
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: isMe ? 'var(--gold)' : 'white' }}>
                  {isMe ? 'TÚ' : player.username}
                </span>
                <span className="score-badge">{player.score}</span>
              </div>
            
              {/* Cartas */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0' }}>
                {player.hand.map((c, i) => (
                  <div key={i} style={{ transform: 'scale(0.85)', margin: '0 -15px', transition: 'transform 0.2s' }}>
                    <Card value={c.value} suit={c.suit} />
                  </div>
                ))}
              </div>
              
              {/* Resultados */}
              {player.result && (
                <div style={{ 
                  marginTop: '15px', fontWeight: '900', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  color: player.result === 'win' ? '#2ecc71' : player.result === 'push' ? '#f1c40f' : '#e74c3c' 
                }}>
                  {player.result.toUpperCase()}
                </div>
              )}
      
              {/* BOTONES: Solo si soy YO y además es el turno de ESTE asiento (que soy yo) */}
              {isMe && isSeatTurn && gameState.gameState === 'playing' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                  <button onClick={handleHit} className="btn-casino btn-hit">PEDIR</button>
                  <button onClick={handleStand} className="btn-casino btn-stand">PLANTAR</button>
                </div>
              )}
              
              {/* Mensaje "Pensando..." para los rivales */}
              {!isMe && isSeatTurn && gameState.gameState === 'playing' && (
                <div style={{textAlign: 'center', marginTop: 10, color: 'var(--gold-light)', fontStyle: 'italic', fontSize: '0.8rem'}}>
                  Pensando...
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