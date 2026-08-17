import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { HttpError } from '../../middleware/error.js';
import { createTable, deleteTable, getTable, listTables } from './lobby.service.js';

export const listTablesController = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ tables: await listTables() });
});

export const createTableController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  const table = await createTable(req.user.id, req.body);
  res.status(201).json({ table });
});

export const getTableController = asyncHandler(async (req: Request, res: Response) => {
  const table = await getTable(req.params.id);
  res.json({ table });
});

export const deleteTableController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  }
  await deleteTable(req.params.id, req.user.id);
  res.status(204).send();
});
