import { Request, Response } from 'express';
import { settlementService } from './settlement.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class SettlementController {
  /**
   * POST /api/v1/settlements/run
   * Trigger netting for a date (admin only).
   */
  runNetting = async (req: Request, res: Response) => {
    try {
      const { settlement_date } = req.body;

      const result = await settlementService.runNetting(settlement_date);

      return successResponse(
        res,
        result,
        `Netting complete for ${result.settlement_date}`,
        HTTP_STATUS.CREATED
      );
    } catch (error: any) {
      logger.error('Run netting error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * POST /api/v1/settlements/run-full-cycle
   * Run netting + generate report.
   */
  runFullCycle = async (req: Request, res: Response) => {
    try {
      const { settlement_date } = req.body;

      const result = await settlementService.runFullCycle(settlement_date);

      return successResponse(res, result, 'Full settlement cycle complete');
    } catch (error: any) {
      logger.error('Run full cycle error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/settlements/:date
   * Get settlement report for a date.
   */
  getReport = async (req: Request, res: Response) => {
    try {
      const { date } = req.params;

      const report = await settlementService.generateReport(date);

      return successResponse(res, report);
    } catch (error: any) {
      logger.error('Get report error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/settlements/:date/instructions
   * Get all settlement instructions for a date.
   */
  getInstructions = async (req: Request, res: Response) => {
    try {
      const { date } = req.params;

      const instructions = await settlementService.getInstructions(date);

      return successResponse(res, {
        settlement_date: date,
        count: instructions.length,
        instructions,
      });
    } catch (error: any) {
      logger.error('Get instructions error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * POST /api/v1/settlements/:date/confirm
   * Confirm a settlement (mark as settled).
   */
  confirm = async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      const { from_provider, to_provider, reference } = req.body;

      if (!from_provider || !to_provider) {
        return errorResponse(
          res,
          'Missing from_provider and to_provider',
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const result = await settlementService.confirmSettlement(
        date,
        from_provider,
        to_provider,
        reference
      );

      return successResponse(res, { confirmed: result }, 'Settlement confirmed');
    } catch (error: any) {
      logger.error('Confirm settlement error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/settlements/pending
   * Get all pending settlements across all dates.
   */
  getPending = async (req: Request, res: Response) => {
    try {
      const pending = await settlementService.getPendingSettlements();

      return successResponse(res, {
        count: pending.length,
        settlements: pending,
      });
    } catch (error: any) {
      logger.error('Get pending error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/settlements/provider/:provider_code/:date
   * Get settlements for a specific provider on a date.
   */
  getProviderSettlements = async (req: Request, res: Response) => {
    try {
      const { provider_code, date } = req.params;

      const settlements = await settlementService.getProviderSettlements(
        provider_code,
        date
      );

      return successResponse(res, {
        provider_code,
        settlement_date: date,
        count: settlements.length,
        settlements,
      });
    } catch (error: any) {
      logger.error('Get provider settlements error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };
}