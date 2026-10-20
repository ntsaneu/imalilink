import { Request, Response, NextFunction } from 'express';
import { RegistryService } from './registry.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class RegistryController {
  private service: RegistryService;

  constructor() {
    this.service = new RegistryService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone_number, provider_code, wallet_id } = req.body;

      if (!phone_number || !provider_code || !wallet_id) {
        return errorResponse(
          res,
          'Missing required fields: phone_number, provider_code, wallet_id',
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const result = await this.service.registerPhone({
        phone_number,
        provider_code,
        wallet_id,
      });

      logger.info(`Phone registered: ${result.phone_number} → ${result.provider_code}`);
      return successResponse(res, result, 'Phone number registered successfully', HTTP_STATUS.CREATED);
    } catch (error: any) {
      logger.error('Registration error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.VALIDATION_ERROR,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  };

  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone_number } = req.params;

      const result = await this.service.resolvePhone(phone_number);

      return successResponse(res, result, 'Phone number resolved successfully');
    } catch (error: any) {
      logger.error('Resolution error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.VALIDATION_ERROR,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone_number, provider_code } = req.params;

      const result = await this.service.deactivateLink(phone_number, provider_code);

      if (!result) {
        return errorResponse(
          res,
          'Link not found',
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      return successResponse(res, { deactivated: true }, 'Link deactivated successfully');
    } catch (error: any) {
      logger.error('Deactivation error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };
}