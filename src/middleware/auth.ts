import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { errorResponse } from '../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { getOne } from '../config/database';

export interface AuthRequest extends Request {
  auth?: { type: 'jwt' | 'api_key'; subject: string; scopes: string[] };
}

interface JWTPayload { sub: string; scopes: string[]; iat: number; exp: number; }

export const hashApiKey = (apiKey: string): string =>
  crypto.createHash('sha256').update(apiKey).digest('hex');

export const generateApiKey = (environment: 'live' | 'test' = 'test') => {
  const random = crypto.randomBytes(32).toString('hex');
  const apiKey = `emk_${environment}_${random}`;
  return { apiKey, hash: hashApiKey(apiKey), prefix: apiKey.substring(0, 16) };
};

export const generateJWT = (userId: string, scopes: string[] = ['read', 'write', 'admin']): string => {
  return jwt.sign({ sub: userId, scopes }, env.jwtSecret, { expiresIn: env.jwtExpiry as any, issuer: 'emalilink' });
};

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Missing or invalid Authorization header. Expected: Bearer <token>', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), env.jwtSecret) as JWTPayload;
    req.auth = { type: 'jwt', subject: decoded.sub, scopes: decoded.scopes || [] };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }
    return errorResponse(res, 'Invalid token', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

export const authenticateAPIKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return errorResponse(res, 'Missing X-API-Key header', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
  try {
    const provider = await getOne<{ provider_code: string; status: string; scopes: string }>(
      `SELECT provider_code, status, scopes FROM provider_api_keys WHERE api_key_hash = ? AND status = 'active'`,
      [hashApiKey(apiKey)]
    );
    if (!provider) {
      return errorResponse(res, 'Invalid API key', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }
    req.auth = { type: 'api_key', subject: provider.provider_code, scopes: provider.scopes ? provider.scopes.split(',') : ['read', 'write'] };
    next();
  } catch (error: any) {
    logger.error('API key verification error:', error);
    return errorResponse(res, 'Authentication failed', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.headers.authorization?.startsWith('Bearer ')) return authenticateJWT(req, res, next);
  if (req.headers['x-api-key']) return authenticateAPIKey(req, res, next);
  return errorResponse(res, 'Authentication required.', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
};

export const requireScopes = (...requiredScopes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return errorResponse(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }
    const hasScope = requiredScopes.some((scope) => req.auth!.scopes.includes(scope));
    if (!hasScope) {
      return errorResponse(res, `Insufficient permissions. Required: ${requiredScopes.join(', ')}`, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
    next();
  };
};
