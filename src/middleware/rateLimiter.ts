import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const rateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  message: { success: false, error: 'Too many requests. Please try again later.', error_code: 'TOO_MANY_REQUESTS' },
  standardHeaders: true,
  legacyHeaders: false,
});
