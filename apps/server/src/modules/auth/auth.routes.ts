import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  loginController,
  logoutController,
  meController,
  registerController,
  updateAvatarController,
} from './auth.controller.js';
import { loginSchema, registerSchema, updateAvatarSchema } from './auth.validators.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), registerController);
authRouter.post('/login', validateBody(loginSchema), loginController);
authRouter.post('/logout', requireAuth, logoutController);
authRouter.get('/me', requireAuth, meController);
authRouter.patch('/me/avatar', requireAuth, validateBody(updateAvatarSchema), updateAvatarController);
