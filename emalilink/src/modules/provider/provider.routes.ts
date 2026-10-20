import { Router } from 'express';
import { ProviderController } from './provider.controller';
import { authenticate, authenticateAPIKey, authenticateJWT, requireScopes } from '../../middleware/auth';

const router = Router();
const controller = new ProviderController();

// ─────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no authentication required)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/providers
 * List all providers. Public — useful for discovery.
 */
router.get('/', controller.list);

/**
 * GET /api/v1/providers/summary
 * Get ecosystem summary. Public — useful for dashboards.
 * NOTE: Must be defined BEFORE /:provider_code to avoid route conflict.
 */
router.get('/summary', controller.getSummary);

/**
 * GET /api/v1/providers/with-adapters
 * List providers that have working adapters.
 * NOTE: Must be defined BEFORE /:provider_code.
 */
router.get('/with-adapters', controller.getWithAdapters);

/**
 * GET /api/v1/providers/health/all
 * Check health of all providers.
 * NOTE: Must be defined BEFORE /:provider_code.
 */
router.get('/health/all', controller.getAllHealth);

/**
 * GET /api/v1/providers/:provider_code
 * Get details of a single provider. Public.
 */
router.get('/:provider_code', controller.getOne);

/**
 * GET /api/v1/providers/:provider_code/stats
 * Get transaction stats for a provider. Requires API key.
 */
router.get(
  '/:provider_code/stats',
  authenticateAPIKey,
  requireScopes('read'),
  controller.getStats
);

/**
 * GET /api/v1/providers/:provider_code/health
 * Check health of a provider's adapter.
 */
router.get('/:provider_code/health', controller.getHealth);

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTES (JWT authentication required)
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/providers
 * Create a new provider. Admin only.
 */
router.post(
  '/',
  authenticateJWT,
  requireScopes('admin'),
  controller.create
);

/**
 * PATCH /api/v1/providers/:provider_code
 * Update a provider. Admin only.
 */
router.patch(
  '/:provider_code',
  authenticateJWT,
  requireScopes('admin'),
  controller.update
);

/**
 * DELETE /api/v1/providers/:provider_code
 * Deactivate a provider. Admin only.
 */
router.delete(
  '/:provider_code',
  authenticateJWT,
  requireScopes('admin'),
  controller.deactivate
);

export default router;