CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 1000.00,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    games_pushed INTEGER DEFAULT 0,
    blackjacks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    result TEXT NOT NULL,
    bet NUMERIC NOT NULL DEFAULT 0,
    player_score INTEGER NOT NULL DEFAULT 0,
    dealer_score INTEGER NOT NULL DEFAULT 0,
    chips_after NUMERIC NOT NULL DEFAULT 0,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insertamos un usuario de test para poder loguearnos luego
-- La password es '123456' (hasheada con bcrypt)
-- INSERT INTO users (username, email, password_hash, balance) 
-- VALUES ('JugadorTest', 'test@casino.com', '$2b$10$P8.uY/./.', 5000.00)
-- ON CONFLICT (username) DO NOTHING;
