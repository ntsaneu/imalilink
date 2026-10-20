import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { errorResponse } from '../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, path: req.path, method: req.method });
  if (res.headersSent) return next(err);
  return errorResponse(res, err.message || 'Internal server error', ERROR_CODES.INTERNAL_ERROR, err.statusCode || HTTP_STATUS.INTERNAL_ERROR);
};

export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, `Endpoint ${req.method} ${req.path} not found`, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
};
