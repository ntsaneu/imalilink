import { Request, Response, NextFunction } from 'express';
import { getOne } from '../config/database';
import { errorResponse } from '../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

export const idempotencyCheck = async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return errorResponse(res, 'Missing Idempotency-Key header', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
  }
  const existing = await getOne<any>(`SELECT transaction_id, status FROM transactions WHERE idempotency_key = ?`, [idempotencyKey]);
  if (existing) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { transaction_id: existing.transaction_id, status: existing.status, idempotent_replay: true },
      message: 'Transaction already processed (idempotent replay)',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};
