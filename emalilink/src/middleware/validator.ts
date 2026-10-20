import { Request, Response, NextFunction } from 'express';

/**
 * Simple request body validator.
 * For production, use a library like Zod or Joi.
 */
export const validateRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        error_code: 'VALIDATION_ERROR',
      });
    }
    next();
  };
};