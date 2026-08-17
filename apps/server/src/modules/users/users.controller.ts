import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getProfile } from './users.service.js';

export const profileController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }
  const { id } = req.params as { id: string };
  const profile = await getProfile(id);
  if (!profile) {
    res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    return;
  }
  res.json(profile);
});
