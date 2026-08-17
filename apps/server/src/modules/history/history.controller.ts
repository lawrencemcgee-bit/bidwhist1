import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listHistory, getReplay } from './history.service.js';

export const historyController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }
  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 50;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const entries = await listHistory(req.user.id, limit);
  res.json({ history: entries });
});

export const replayController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }
  const { id } = req.params as { id: string };
  const replay = await getReplay(req.user.id, id);
  if (!replay) {
    res.status(404).json({ error: 'Game not found', code: 'NOT_FOUND' });
    return;
  }
  res.json(replay);
});
