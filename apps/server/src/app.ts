import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { lobbyRouter } from './modules/lobby/lobby.routes.js';
import { historyRouter } from './modules/history/history.routes.js';
import { ladderRouter } from './modules/ladder/ladder.routes.js';
import { achievementsRouter } from './modules/achievements/achievements.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tables', lobbyRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/ladder', ladderRouter);
  app.use('/api/achievements', achievementsRouter);
  app.use('/api/users', usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
