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

router.get('/stats', authMiddleware, authController.getStats);
router.post('/stats', authMiddleware, authController.updateStats);

router.get("/history", authMiddleware, authController.getHistory);
router.get("/leaderboard", authMiddleware, authController.getLeaderboard);

module.exports = router;
