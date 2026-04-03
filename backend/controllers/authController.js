const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Función para cerrar sesión (limpiar cookie)
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Sesión cerrada' });
};

// Configuración de la base de datos
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    user: process.env.DB_USER || 'transcendence',
    password: process.env.DB_PASSWORD || 'transcendence',
    database: process.env.DB_NAME || 'transcendence',
    port: 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'tu_super_secreto_cambiar_en_produccion';
const SALT_ROUNDS = 10;

// Registro de nuevo usuario
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validación básica
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email y password son requeridos' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'El password debe tener al menos 6 caracteres' 
            });
        }

        // Verificar si el usuario ya existe
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'El usuario o email ya existe' 
            });
        }

        // Hash del password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insertar usuario en la base de datos
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash) 
             VALUES ($1, $2, $3) 
             RETURNING id, username, email, balance, created_at`,
            [username, email, password_hash]
        );

        const user = result.rows[0];

        // Generar JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Establecer cookie httpOnly (más seguro que localStorage)
        res.cookie('token', token, {
            httpOnly: true,  // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: parseFloat(user.balance),
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor' 
        });
    }
};

// Login de usuario
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validación básica
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username y password son requeridos' 
            });
        }

        // Buscar usuario
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        const user = result.rows[0];

        // Verificar password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        // Generar JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Establecer cookie httpOnly (más seguro que localStorage)
        res.cookie('token', token, {
            httpOnly: true,  // No accesible desde JavaScript (protege contra XSS)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        res.json({
                    success: true,
                    message: 'Login exitoso',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        balance: parseFloat(user.balance)
                    }
                });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor' 
        });
    }
};

// Verificar token (para rutas protegidas)
exports.verifyToken = async (req, res) => {
    try {
        // El middleware ya verificó el token y añadió req.user
        const result = await pool.query(
            'SELECT id, username, email, balance FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: parseFloat(user.balance)
            }
        });

    } catch (error) {
        console.error('Error en verifyToken:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor' 
        });
    }
    };
    // Obtener balance del usuario
exports.getBalance = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT balance FROM users WHERE id = $1',
            [req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        res.json({ success: true, balance: parseFloat(result.rows[0].balance) });
    } catch (error) {
        console.error('Error en getBalance:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// Actualizar balance del usuario (ingresar, retirar, resultado partida)
exports.updateBalance = async (req, res) => {
    try {
        const { amount, type } = req.body;
        // type: 'deposit' | 'withdraw' | 'game_result'
        // amount: positivo para ingresar, negativo para retirar

        if (amount === undefined || !type) {
            return res.status(400).json({ success: false, message: 'amount y type son requeridos' });
        }

        // Obtener balance actual
        const current = await pool.query(
            'SELECT balance FROM users WHERE id = $1',
            [req.user.userId]
        );

        const currentBalance = parseFloat(current.rows[0].balance);
        const newBalance = currentBalance + parseFloat(amount);

        if (newBalance < 0) {
            return res.status(400).json({ success: false, message: 'Saldo insuficiente' });
        }

        const result = await pool.query(
            'UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance',
            [newBalance, req.user.userId]
        );

        res.json({ success: true, balance: parseFloat(result.rows[0].balance) });
    } catch (error) {
        console.error('Error en updateBalance:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
    
};
