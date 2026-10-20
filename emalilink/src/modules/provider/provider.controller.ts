import { Request, Response } from 'express';
import { ProviderService } from './provider.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { HTTP_STATUS, ERROR_CODES } from '../../utils/constants';
import { logger } from '../../config/logger';

export class ProviderController {
  private service: ProviderService;

  constructor() {
    this.service = new ProviderService();
  }

  /**
   * GET /api/v1/providers
   * List all providers, with optional filters.
   */
  list = async (req: Request, res: Response) => {
    try {
      const { status, type } = req.query;

      const providers = await this.service.listProviders({
        status: status as string,
        type: type as string,
      });

      return successResponse(res, {
        providers,
        count: providers.length,
      });
    } catch (error: any) {
      logger.error('List providers error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/:provider_code
   * Get details of a single provider.
   */
  getOne = async (req: Request, res: Response) => {
    try {
      const { provider_code } = req.params;

      const provider = await this.service.getPublicProvider(provider_code);

      return successResponse(res, provider);
    } catch (error: any) {
      logger.error('Get provider error:', error);

      if (error.message.includes('not found')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * POST /api/v1/providers
   * Create a new provider (admin only).
   */
  create = async (req: Request, res: Response) => {
    try {
      const { provider_code, provider_name, provider_type, api_endpoint, webhook_url } =
        req.body;

      if (!provider_code || !provider_name || !provider_type) {
        return errorResponse(
          res,
          'Missing required fields: provider_code, provider_name, provider_type',
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const provider = await this.service.createProvider({
        provider_code,
        provider_name,
        provider_type,
        api_endpoint,
        webhook_url,
      });

      return successResponse(
        res,
        provider,
        'Provider created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error: any) {
      logger.error('Create provider error:', error);

      if (error.message.includes('already exists')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.DUPLICATE,
          HTTP_STATUS.CONFLICT
        );
      }

      if (error.message.includes('Invalid')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * PATCH /api/v1/providers/:provider_code
   * Update a provider (admin only).
   */
  update = async (req: Request, res: Response) => {
    try {
      const { provider_code } = req.params;
      const updates = req.body;

      const provider = await this.service.updateProvider(provider_code, updates);

      return successResponse(res, provider, 'Provider updated successfully');
    } catch (error: any) {
      logger.error('Update provider error:', error);

      if (error.message.includes('not found')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      if (error.message.includes('Invalid')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.VALIDATION_ERROR,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * DELETE /api/v1/providers/:provider_code
   * Deactivate a provider (soft delete).
   */
  deactivate = async (req: Request, res: Response) => {
    try {
      const { provider_code } = req.params;

      const result = await this.service.deactivateProvider(provider_code);

      if (!result) {
        return errorResponse(
          res,
          'Failed to deactivate provider',
          ERROR_CODES.INTERNAL_ERROR,
          HTTP_STATUS.INTERNAL_ERROR
        );
      }

      return successResponse(res, { deactivated: true }, 'Provider deactivated');
    } catch (error: any) {
      logger.error('Deactivate provider error:', error);

      if (error.message.includes('not found')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      if (error.message.includes('already inactive')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.CONFLICT,
          HTTP_STATUS.CONFLICT
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/:provider_code/stats
   * Get transaction statistics for a provider.
   */
  getStats = async (req: Request, res: Response) => {
    try {
      const { provider_code } = req.params;

      const stats = await this.service.getProviderStats(provider_code);

      return successResponse(res, stats);
    } catch (error: any) {
      logger.error('Get provider stats error:', error);

      if (error.message.includes('not found')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/:provider_code/health
   * Check health of a provider's adapter.
   */
  getHealth = async (req: Request, res: Response) => {
    try {
      const { provider_code } = req.params;

      const health = await this.service.checkProviderHealth(provider_code);

      return successResponse(res, health);
    } catch (error: any) {
      logger.error('Get provider health error:', error);

      if (error.message.includes('not found')) {
        return errorResponse(
          res,
          error.message,
          ERROR_CODES.NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }

      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/health/all
   * Check health of all providers.
   */
  getAllHealth = async (req: Request, res: Response) => {
    try {
      const health = await this.service.checkAllProvidersHealth();

      return successResponse(res, {
        health,
        count: health.length,
      });
    } catch (error: any) {
      logger.error('Get all health error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/summary
   * Get a summary of the provider ecosystem.
   */
  getSummary = async (req: Request, res: Response) => {
    try {
      const summary = await this.service.getProviderSummary();

      return successResponse(res, summary);
    } catch (error: any) {
      logger.error('Get summary error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };

  /**
   * GET /api/v1/providers/with-adapters
   * List providers that have working adapters.
   */
  getWithAdapters = async (req: Request, res: Response) => {
    try {
      const providers = await this.service.getProvidersWithAdapters();

      return successResponse(res, {
        providers,
        count: providers.length,
      });
    } catch (error: any) {
      logger.error('Get providers with adapters error:', error);
      return errorResponse(
        res,
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  };
}