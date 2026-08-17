import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { historyController } from './history.controller.js';

export const historyRouter = Router();

historyRouter.get('/', requireAuth, historyController);
