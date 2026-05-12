import { registerUser, loginUser } from '../services/authService.js';
import { getUser, getBalance, updateBalance, getStats, updateStats, getHistory, getLeaderboard } from '../services/userService.js';

export function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true, message: 'Sesión cerrada' });
}

export async function register(req, res, next) {
  try {
    const { token, cookieOptions, user } = await registerUser(req.body);
    res.cookie('token', token, cookieOptions);
    res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { token, cookieOptions, user } = await loginUser(req.body);
    res.cookie('token', token, cookieOptions);
    res.json({ success: true, message: 'Login exitoso', user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

export async function verifyToken(req, res, next) {
  try {
    const user = await getUser(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, user: { ...user, balance: parseFloat(user.balance) } });
  } catch (err) {
    next(err);
  }
}

export async function getBalanceHandler(req, res, next) {
  try {
    const balance = await getBalance(req.user.userId);
    if (balance === null) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, balance });
  } catch (err) {
    next(err);
  }
}

export async function updateBalanceHandler(req, res, next) {
  try {
    const { amount, type } = req.body;
    if (amount === undefined || !type) {
      return res.status(400).json({ success: false, message: 'amount y type son requeridos' });
    }
    const balance = await updateBalance(req.user.userId, type, amount);
    res.json({ success: true, balance });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

export async function getStatsHandler(req, res, next) {
  try {
    const stats = await getStats(req.user.userId);
    if (!stats) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function updateStatsHandler(req, res, next) {
  try {
    await updateStats(req.user.userId, req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryHandler(req, res, next) {
  try {
    const history = await getHistory(req.user.userId);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
}

export async function getLeaderboardHandler(req, res, next) {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (err) {
    next(err);
  }
}
