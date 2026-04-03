const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Rutas protegidas (requieren token)
router.get('/verify', authMiddleware, authController.verifyToken);
// Rutas de balance (protegidas)
router.get('/balance', authMiddleware, authController.getBalance);
router.post('/balance', authMiddleware, authController.updateBalance);

module.exports = router;
