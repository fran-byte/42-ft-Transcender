import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getLeaderboardHandler } from '../controllers/authController.js';

const router = Router();

router.get('/', authMiddleware, getLeaderboardHandler);

export default router;
