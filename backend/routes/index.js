import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import leaderboardRouter from './leaderboard.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/leaderboard', leaderboardRouter);

export default router;
