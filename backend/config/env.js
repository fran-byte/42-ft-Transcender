import 'dotenv/config';

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'blackjack_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'blackjack_db',
    port: 5432,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'tu_super_secreto_cambiar_en_produccion',
    expiresIn: '7d',
  },
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'https://blackjack.local',
  },
};
