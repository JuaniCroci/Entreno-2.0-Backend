import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requestContext } from './config/db.js';
import { notFound } from './common/errors/notFound.js';
import { errorHandler } from './common/errors/errorHandler.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import usuariosRoutes from './modules/usuarios/routes/usuarios.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  app.use(requestContext);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
