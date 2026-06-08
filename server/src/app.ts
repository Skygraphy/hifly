import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import imagesRoutes from './routes/images.routes';
import tagsRoutes from './routes/tags.routes';
import usersRoutes from './routes/users.routes';
import regionsRoutes from './routes/regions.routes';
import settingsRoutes from './routes/settings.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/images', imagesRoutes);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/regions', regionsRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(errorHandler);

  return app;
}
