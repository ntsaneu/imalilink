import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { db } from './config/database';
import fs from 'fs';
import path from 'path';

const startServer = async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'database/migrations/001_initial_schema.sql'), 'utf8');
    await new Promise<void>((resolve, reject) => {
      db.exec(schema, (err) => (err ? reject(err) : resolve()));
    });
    logger.info('Database schema initialized');

    const app = createApp();
    const server = app.listen(env.port, () => {
      logger.info(`eMali_link API Server running on http://localhost:${env.port}`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down...');
      server.close(() => { db.close(); process.exit(0); });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
