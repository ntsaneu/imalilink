import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message: message || 'Success',
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (
  res: Response,
  error: string,
  errorCode: string,
  statusCode: number = 500,
  details?: any
) => {
  return res.status(statusCode).json({
    success: false,
    error,
    error_code: errorCode,
    details,
    timestamp: new Date().toISOString(),
  });
};