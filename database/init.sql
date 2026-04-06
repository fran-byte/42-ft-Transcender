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
    user_id INT NOT NULL,
    result VARCHAR(20) NOT NULL,
    amount_won DECIMAL(10, 2) NOT NULL,
    game_data JSONB,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertamos un usuario de test para poder loguearnos luego
-- La password es '123456' (hasheada con bcrypt)
-- INSERT INTO users (username, email, password_hash, balance) 
-- VALUES ('JugadorTest', 'test@casino.com', '$2b$10$P8.uY/./.', 5000.00)
-- ON CONFLICT (username) DO NOTHING;
