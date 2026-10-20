import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticateAPIKey, authenticateJWT, requireScopes } from '../../middleware/auth';

const router = Router();
const controller = new SettlementController();

// ─────────────────────────────────────────────────────────────────
// PROVIDER ROUTES (API key auth)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/settlements/pending
 * Get all pending settlements. Requires API key.
 * NOTE: Must be defined BEFORE /:date to avoid route conflict.
 */
router.get(
  '/pending',
  authenticateAPIKey,
  requireScopes('read'),
  controller.getPending
);

/**
 * GET /api/v1/settlements/provider/:provider_code/:date
 * Get settlements for a specific provider.
 */
router.get(
  '/provider/:provider_code/:date',
  authenticateAPIKey,
  requireScopes('read'),
  controller.getProviderSettlements
);

/**
 * GET /api/v1/settlements/:date
 * Get settlement report for a date.
 */
router.get(
  '/:date',
  authenticateAPIKey,
  requireScopes('read'),
  controller.getReport
);

/**
 * GET /api/v1/settlements/:date/instructions
 * Get settlement instructions for a date.
 */
router.get(
  '/:date/instructions',
  authenticateAPIKey,
  requireScopes('read'),
  controller.getInstructions
);

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTES (JWT auth)
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/settlements/run
 * Trigger netting manually (admin only).
 */
router.post(
  '/run',
  authenticateJWT,
  requireScopes('admin'),
  controller.runNetting
);

/**
 * POST /api/v1/settlements/run-full-cycle
 * Trigger full netting + report cycle (admin only).
 */
router.post(
  '/run-full-cycle',
  authenticateJWT,
  requireScopes('admin'),
  controller.runFullCycle
);

/**
 * POST /api/v1/settlements/:date/confirm
 * Confirm a settlement as settled (admin only).
 */
router.post(
  '/:date/confirm',
  authenticateJWT,
  requireScopes('admin'),
  controller.confirm
);

export default router;