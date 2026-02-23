const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_super_secreto_cambiar_en_produccion';

// Middleware para verificar JWT token
const authMiddleware = (req, res, next) => {
    try {
        // Obtener token de la cookie httpOnly
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No se proporcionó token de autenticación' 
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Añadir información del usuario al request
        req.user = decoded;

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expirado' 
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido' 
            });
        }

        console.error('Error en authMiddleware:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor' 
        });
    }
};

module.exports = authMiddleware;
