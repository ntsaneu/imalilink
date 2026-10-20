import { Request, Response } from 'express';
import { TransactionService } from './transaction.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class TransactionController {
  private service: TransactionService;

  constructor() {
    this.service = new TransactionService();
  }

  create = async (req: Request, res: Response) => {
    try {
      const { sender_provider, sender_wallet_id, recipient_phone, recipient_provider, amount, currency } = req.body;
      if (!sender_provider || !sender_wallet_id || !recipient_phone || !recipient_provider || !amount) {
        return errorResponse(res, 'Missing required fields', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }
      if (amount <= 0) {
        return errorResponse(res, 'Amount must be greater than 0', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      }
      const idempotencyKey = req.headers['idempotency-key'] as string;
      const result = await this.service.createTransaction(
        { sender_provider, sender_wallet_id, recipient_phone, recipient_provider, amount, currency },
        idempotencyKey
      );
      return successResponse(res, result, 'Transaction completed successfully', HTTP_STATUS.CREATED);
    } catch (error: any) {
      logger.error('Transaction error:', error);
      return errorResponse(res, error.message, ERROR_CODES.PROVIDER_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
  };

  getStatus = async (req: Request, res: Response) => {
    try {
      const { transaction_id } = req.params;
      const tx = await this.service.getTransaction(transaction_id);
      return successResponse(res, tx, 'Transaction retrieved');
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
  };
}
