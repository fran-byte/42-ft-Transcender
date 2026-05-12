import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getBalanceHandler, updateBalanceHandler,
  getStatsHandler, updateStatsHandler,
  getHistoryHandler,
} from '../controllers/authController.js';

const router = Router();

router.use(authMiddleware);

router.get('/balance', getBalanceHandler);
router.post('/balance', updateBalanceHandler);
router.get('/stats', getStatsHandler);
router.post('/stats', updateStatsHandler);
router.get('/history', getHistoryHandler);

export default router;
