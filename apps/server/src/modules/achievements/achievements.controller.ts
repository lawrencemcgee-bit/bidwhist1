import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listAchievements } from './achievements.service.js';

export const achievementsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }
  const achievements = await listAchievements(req.user.id);
  res.json({ achievements });
});
