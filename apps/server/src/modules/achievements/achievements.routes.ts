import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { achievementsController } from './achievements.controller.js';

export const achievementsRouter = Router();

achievementsRouter.get('/', requireAuth, achievementsController);
