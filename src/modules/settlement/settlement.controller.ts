import { Request, Response } from 'express';
import { settlementService } from './settlement.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class SettlementController {
  runNetting = async (req: Request, res: Response) => {
    try {
      const { settlement_date } = req.body;
      const result = await settlementService.runNetting(settlement_date);
      return successResponse(res, result, `Netting complete for ${result.settlement_date}`, HTTP_STATUS.CREATED);
    } catch (error: any) {
      logger.error('Run netting error:', error);
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getReport = async (req: Request, res: Response) => {
    try {
      const report = await settlementService.generateReport(req.params.date);
      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getInstructions = async (req: Request, res: Response) => {
    try {
      const instructions = await settlementService.getInstructions(req.params.date);
      return successResponse(res, { settlement_date: req.params.date, count: instructions.length, instructions });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getPending = async (_req: Request, res: Response) => {
    try {
      const pending = await settlementService.getPendingSettlements();
      return successResponse(res, { count: pending.length, settlements: pending });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getProviderSettlements = async (req: Request, res: Response) => {
    try {
      const settlements = await settlementService.getProviderSettlements(req.params.provider_code, req.params.date);
      return successResponse(res, { provider_code: req.params.provider_code, settlement_date: req.params.date, count: settlements.length, settlements });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  confirm = async (req: Request, res: Response) => {
    try {
      const { from_provider, to_provider, reference } = req.body;
      if (!from_provider || !to_provider) return errorResponse(res, 'Missing from_provider and to_provider', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      const result = await settlementService.confirmSettlement(req.params.date, from_provider, to_provider, reference);
      return successResponse(res, { confirmed: result }, 'Settlement confirmed');
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };
}
