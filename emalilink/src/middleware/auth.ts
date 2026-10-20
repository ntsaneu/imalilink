import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { errorResponse } from '../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { getOne } from '../config/database';

/**
 * Extended Express Request with authenticated user/provider context.
 */
export interface AuthRequest extends Request {
  auth?: {
    type: 'jwt' | 'api_key';
    subject: string; // user ID or provider_code
    scopes: string[];
  };
}

/**
 * JWT payload structure.
 */
interface JWTPayload {
  sub: string; // subject (user ID)
  scopes: string[];
  iat: number;
  exp: number;
}

/**
 * Verify a JWT token and attach the payload to the request.
 */
export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(
      res,
      'Missing or invalid Authorization header. Expected: Bearer <token>',
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const token = authHeader.substring(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JWTPayload;

    req.auth = {
      type: 'jwt',
      subject: decoded.sub,
      scopes: decoded.scopes || [],
    };

    logger.info(`JWT authenticated: ${decoded.sub}`, {
      scopes: decoded.scopes,
    });

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(
        res,
        'Token has expired',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return errorResponse(
        res,
        'Invalid token',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    logger.error('JWT verification error:', error);
    return errorResponse(
      res,
      'Authentication failed',
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};

/**
 * Verify an API key and attach the provider context to the request.
 *
 * API keys are stored in the database, hashed.
 * Format: "emk_live_<random>" or "emk_test_<random>"
 */
export const authenticateAPIKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return errorResponse(
      res,
      'Missing X-API-Key header',
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  try {
    // Look up the provider by API key hash
    // In production, API keys are hashed with SHA-256 before storage
    const provider = await getOne<{
      provider_code: string;
      provider_name: string;
      status: string;
      scopes: string;
    }>(
      `SELECT provider_code, provider_name, status, scopes 
       FROM provider_api_keys 
       WHERE api_key_hash = ? AND status = 'active'`,
      [hashApiKey(apiKey)]
    );

    if (!provider) {
      logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 12)}...`);
      return errorResponse(
        res,
        'Invalid API key',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    if (provider.status !== 'active') {
      return errorResponse(
        res,
        `Provider ${provider.provider_code} is ${provider.status}`,
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    req.auth = {
      type: 'api_key',
      subject: provider.provider_code,
      scopes: provider.scopes ? provider.scopes.split(',') : ['read', 'write'],
    };

    logger.info(`API key authenticated: ${provider.provider_code}`);

    next();
  } catch (error: any) {
    logger.error('API key verification error:', error);
    return errorResponse(
      res,
      'Authentication failed',
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};

/**
 * Combined authentication — accepts EITHER JWT OR API key.
 * Use this for endpoints that both dashboards and providers can call.
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const hasJWT = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = !!req.headers['x-api-key'];

  if (hasJWT) {
    return authenticateJWT(req, res, next);
  }

  if (hasAPIKey) {
    return authenticateAPIKey(req, res, next);
  }

  return errorResponse(
    res,
    'Authentication required. Provide either Bearer token or X-API-Key header.',
    ERROR_CODES.UNAUTHORIZED,
    HTTP_STATUS.UNAUTHORIZED
  );
};

/**
 * Scope-based authorization.
 * Requires the authenticated principal to have at least one of the given scopes.
 */
export const requireScopes = (...requiredScopes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return errorResponse(
        res,
        'Authentication required',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const hasScope = requiredScopes.some((scope) =>
      req.auth!.scopes.includes(scope)
    );

    if (!hasScope) {
      logger.warn(
        `Access denied for ${req.auth.subject}. Required: ${requiredScopes.join(', ')}. Has: ${req.auth.scopes.join(', ')}`
      );

      return errorResponse(
        res,
        `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        ERROR_CODES.FORBIDDEN,
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  };
};

/**
 * Provider ownership check — ensures a provider can only act on its own resources.
 */
export const requireProviderOwnership = (
  getProviderFromRequest: (req: AuthRequest) => string | undefined
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return errorResponse(
        res,
        'Authentication required',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // JWT users (admins) bypass ownership check
    if (req.auth.type === 'jwt') {
      return next();
    }

    const requestProvider = getProviderFromRequest(req);

    if (requestProvider && requestProvider !== req.auth.subject) {
      logger.warn(
        `Ownership violation: ${req.auth.subject} tried to act as ${requestProvider}`
      );

      return errorResponse(
        res,
        'You can only act on behalf of your own provider',
        ERROR_CODES.FORBIDDEN,
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  };
};

/**
 * Hash an API key using SHA-256.
 * Used to compare the incoming key against the stored hash.
 */
export const hashApiKey = (apiKey: string): string => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Generate a new API key pair (key + hash).
 * Call this when onboarding a new provider.
 */
export const generateApiKey = (
  environment: 'live' | 'test' = 'test'
): { apiKey: string; hash: string; prefix: string } => {
  const crypto = require('crypto');
  const random = crypto.randomBytes(32).toString('hex');
  const apiKey = `emk_${environment}_${random}`;
  const hash = hashApiKey(apiKey);
  const prefix = apiKey.substring(0, 16);

  return { apiKey, hash, prefix };
};

/**
 * Generate a JWT token for a user.
 * Call this after successful login.
 */
export const generateJWT = (
  userId: string,
  scopes: string[] = ['read', 'write', 'admin']
): string => {
  const payload: Partial<JWTPayload> = {
    sub: userId,
    scopes,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiry as any,
    issuer: 'emalilink',
  });
};