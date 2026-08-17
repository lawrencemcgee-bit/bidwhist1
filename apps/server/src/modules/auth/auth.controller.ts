import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { HttpError } from '../../middleware/error.js';
import { login, register, getUserById, updateAvatar } from './auth.service.js';

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const result = await register(req.body);
  res.status(201).json(result);
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body);
  res.json(result);
});

export const logoutController = (_req: Request, res: Response) => {
  res.status(204).send();
};

export const meController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  const user = await getUserById(req.user.id);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User no longer exists');
  }
  res.json({ user });
});

export const updateAvatarController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  const user = await updateAvatar(req.user.id, req.body.avatarId);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User no longer exists');
  }
  res.json({ user });
});
