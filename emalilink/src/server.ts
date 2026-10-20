import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { db } from './config/database';
import fs from 'fs';
import path from 'path';

const startServer = async () => {
  try {
    // Run database migrations
    const schema = fs.readFileSync(
      path.join(__dirname, 'database/migrations/001_initial_schema.sql'),
      'utf8'
    );

    await new Promise<void>((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info('✅ Database schema initialized');

    // Start Express server
    const app = createApp();

    const server = app.listen(env.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 eMali_link API Server                                   ║
║                                                               ║
║   📡 Running on:  http://localhost:${env.port}                  ║
║   🏥 Health:      http://localhost:${env.port}/health           ║
║   🌍 Environment: ${env.nodeEnv}                                ║
║                                                               ║
║   📚 Endpoints:                                               ║
║   POST  /api/v1/registry/register                             ║
║   GET   /api/v1/registry/resolve/:phone_number                ║
║   DELETE /api/v1/registry/:phone_number/:provider_code        ║
║   POST  /api/v1/transactions                                  ║
║   GET   /api/v1/transactions/:transaction_id                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        db.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();