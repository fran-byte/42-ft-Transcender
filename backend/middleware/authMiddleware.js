import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export default function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No se proporcionó token de autenticación' });
    }

    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
    next(error);
  }
}
