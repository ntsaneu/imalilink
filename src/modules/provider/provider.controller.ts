import { Request, Response } from 'express';
import { ProviderService } from './provider.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class ProviderController {
  private service: ProviderService;

  constructor() { this.service = new ProviderService(); }

  list = async (req: Request, res: Response) => {
    try {
      const { status, type } = req.query;
      const providers = await this.service.listProviders({ status: status as string, type: type as string });
      return successResponse(res, { providers, count: providers.length });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getOne = async (req: Request, res: Response) => {
    try {
      const provider = await this.service.getPublicProvider(req.params.provider_code);
      return successResponse(res, provider);
    } catch (error: any) {
      if (error.message.includes('not found')) return errorResponse(res, error.message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getProviderStats(req.params.provider_code);
      return successResponse(res, stats);
    } catch (error: any) {
      if (error.message.includes('not found')) return errorResponse(res, error.message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getHealth = async (req: Request, res: Response) => {
    try {
      const health = await this.service.checkProviderHealth(req.params.provider_code);
      return successResponse(res, health);
    } catch (error: any) {
      if (error.message.includes('not found')) return errorResponse(res, error.message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getAllHealth = async (_req: Request, res: Response) => {
    try {
      const health = await this.service.checkAllProvidersHealth();
      return successResponse(res, { health, count: health.length });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getSummary = async (_req: Request, res: Response) => {
    try {
      const summary = await this.service.getProviderSummary();
      return successResponse(res, summary);
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };

  getWithAdapters = async (_req: Request, res: Response) => {
    try {
      const providers = await this.service.getProvidersWithAdapters();
      return successResponse(res, { providers, count: providers.length });
    } catch (error: any) {
      return errorResponse(res, error.message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_ERROR);
    }
  };
}
