import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  databasePath: process.env.DATABASE_PATH || './database/emalilink.db',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiry: process.env.JWT_EXPIRY || '1h',
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
};

// Validate required env vars in production
if (env.nodeEnv === 'production') {
  const required = ['JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}