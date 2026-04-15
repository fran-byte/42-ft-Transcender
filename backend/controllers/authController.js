const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || "database",
  user: process.env.DB_USER || "transcendence",
  password: process.env.DB_PASSWORD || "transcendence",
  database: process.env.DB_NAME || "transcendence",
  port: 5432,
});

const JWT_SECRET =
  process.env.JWT_SECRET || "tu_super_secreto_cambiar_en_produccion";
const SALT_ROUNDS = 10;

// Log out
exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Sesión cerrada" });
};

// Sign up
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email y password son requeridos",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "El password debe tener al menos 6 caracteres",
      });
    }

    const userExists = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El usuario o email ya existe",
      });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, balance, created_at`,
      [username, email, password_hash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: parseFloat(user.balance),
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username y password son requeridos",
      });
    }

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Login exitoso",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: parseFloat(user.balance),
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// Verify token
exports.verifyToken = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, balance FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: parseFloat(user.balance),
      },
    });
  } catch (error) {
    console.error("Error en verifyToken:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// GET balance
exports.getBalance = async (req, res) => {
  try {
    const result = await pool.query("SELECT balance FROM users WHERE id = $1", [
      req.user.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      balance: parseFloat(result.rows[0].balance),
    });
  } catch (error) {
    console.error("Error en getBalance:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// Update balance
exports.updateBalance = async (req, res) => {
  try {
    const { amount, type } = req.body;

    if (amount === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: "amount y type son requeridos",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount inválido",
      });
    }

    if (!["deposit", "withdraw"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type inválido",
      });
    }

    const current = await pool.query(
      "SELECT balance FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const currentBalance = parseFloat(current.rows[0].balance);

    let newBalance = currentBalance;

    if (type === "deposit") {
      newBalance = currentBalance + numericAmount;
    } else if (type === "withdraw") {
      newBalance = currentBalance - numericAmount;
    }

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: "Saldo insuficiente",
      });
    }

    const result = await pool.query(
      "UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance",
      [newBalance, req.user.userId]
    );

    res.json({
      success: true,
      balance: parseFloat(result.rows[0].balance),
    });
  } catch (error) {
    console.error("Error en updateBalance:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// History
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `
      SELECT
        room_id,
        room_name,
        result,
        bet,
        player_score,
        dealer_score,
        chips_after,
        played_at
      FROM game_history
      WHERE user_id = $1
      ORDER BY played_at DESC
      LIMIT 5
      `,
      [userId]
    );

    res.json({
      success: true,
      history: result.rows.map((row) => ({
        roomId: row.room_id,
        roomName: row.room_name,
        result: row.result,
        bet: Number(row.bet),
        score: Number(row.player_score),
        dealerScore: Number(row.dealer_score),
        chipsAfter: Number(row.chips_after),
        playedAt: row.played_at,
      })),
    });
  } catch (error) {
    console.error("Error en getHistory:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

// Stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT games_played, games_won, games_lost, games_pushed, blackjacks 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      gamesPlayed: parseInt(result.rows[0].games_played) || 0,
      gamesWon: parseInt(result.rows[0].games_won) || 0,
      gamesLost: parseInt(result.rows[0].games_lost) || 0,
      gamesPushed: parseInt(result.rows[0].games_pushed) || 0,
      blackjacks: parseInt(result.rows[0].blackjacks) || 0,
    });
  } catch (error) {
    console.error("Error en getStats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gamesPlayed, gamesWon, gamesLost, gamesPushed, blackjacks } =
      req.body;

    await pool.query(
      `UPDATE users SET 
        games_played = $1, 
        games_won = $2, 
        games_lost = $3, 
        games_pushed = $4,
        blackjacks = $5
       WHERE id = $6`,
      [
        gamesPlayed,
        gamesWon,
        gamesLost,
        gamesPushed,
        blackjacks || 0,
        userId,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error en updateStats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, username, balance
      FROM users
      ORDER BY balance DESC, username ASC
      LIMIT 3
      `
    );

    res.json({
      success: true,
      leaderboard: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        balance: Number(row.balance),
      })),
    });
  } catch (error) {
    console.error("Error en getLeaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};