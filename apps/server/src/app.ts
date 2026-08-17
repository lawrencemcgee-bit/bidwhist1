import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { lobbyRouter } from './modules/lobby/lobby.routes.js';
import { historyRouter } from './modules/history/history.routes.js';
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
