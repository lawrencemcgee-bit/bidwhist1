import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { profileController } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/:id', requireAuth, profileController);
