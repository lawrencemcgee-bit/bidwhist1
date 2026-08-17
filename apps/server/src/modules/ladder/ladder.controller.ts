import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getLadder, getMyRank } from './ladder.service.js';

export const ladderController = asyncHandler(async (_req: Request, res: Response) => {
  const ladder = await getLadder(100);
  res.json({ ladder });
});

export const myRankController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }
  const rank = await getMyRank(req.user.id);
  res.json({ rank });
});
