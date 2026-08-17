import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { historyController, replayController } from './history.controller.js';

export const historyRouter = Router();

historyRouter.get('/', requireAuth, historyController);
historyRouter.get('/:id/replay', requireAuth, replayController);
