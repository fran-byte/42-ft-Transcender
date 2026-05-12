import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import env from '../config/env.js';

const SALT_ROUNDS = 10;

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(userId, username) {
  return jwt.sign({ userId, username }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

export async function registerUser({ username, email, password }) {
  if (!username || !email || !password) {
    const err = new Error('Username, email y password son requeridos');
    err.status = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error('El password debe tener al menos 6 caracteres');
    err.status = 400;
    throw err;
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );

  if (existing.rows.length > 0) {
    const err = new Error('El usuario o email ya existe');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, balance, created_at`,
    [username, email, password_hash]
  );

  const user = result.rows[0];
  const token = signToken(user.id, user.username);

  return {
    token,
    cookieOptions,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: parseFloat(user.balance),
      createdAt: user.created_at,
    },
  };
}

export async function loginUser({ username, password }) {
  if (!username || !password) {
    const err = new Error('Username y password son requeridos');
    err.status = 400;
    throw err;
  }

  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length === 0) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  const token = signToken(user.id, user.username);

  return {
    token,
    cookieOptions,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: parseFloat(user.balance),
    },
  };
}
