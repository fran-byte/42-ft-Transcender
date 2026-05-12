import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { logout, register, login, verifyToken } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', authMiddleware, verifyToken);

export default router;
