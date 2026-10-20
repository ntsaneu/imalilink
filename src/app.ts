import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import registryRoutes from './modules/registry/registry.routes';
import transactionRoutes from './modules/transaction/transaction.routes';
import providerRoutes from './modules/provider/provider.routes';
import settlementRoutes from './modules/settlement/settlement.routes';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './config/logger';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
    next();
  });

  app.use('/api/', rateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'eMali_link', version: '1.0.0', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/registry', registryRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/providers', providerRoutes);
  app.use('/api/v1/settlements', settlementRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
