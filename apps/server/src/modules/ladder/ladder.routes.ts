import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { ladderController, myRankController } from './ladder.controller.js';

export const ladderRouter = Router();

ladderRouter.get('/', ladderController);
ladderRouter.get('/me', requireAuth, myRankController);
