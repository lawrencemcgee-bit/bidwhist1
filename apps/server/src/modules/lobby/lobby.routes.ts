import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createTableController,
  deleteTableController,
  getTableController,
  listTablesController,
} from './lobby.controller.js';
import { createTableSchema } from './lobby.validators.js';

export const lobbyRouter = Router();

lobbyRouter.use(requireAuth);

lobbyRouter.get('/', listTablesController);
lobbyRouter.post('/', validateBody(createTableSchema), createTableController);
lobbyRouter.get('/:id', getTableController);
lobbyRouter.delete('/:id', deleteTableController);
