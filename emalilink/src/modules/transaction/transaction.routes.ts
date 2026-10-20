import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { idempotencyCheck } from '../../middleware/idempotency';
import { authenticateAPIKey, requireScopes } from '../../middleware/auth';

const router = Router();
const controller = new TransactionController();

router.use(authenticateAPIKey);

router.post(
  '/',
  requireScopes('write'),
  idempotencyCheck,
  controller.create
);

router.get('/:transaction_id', requireScopes('read'), controller.getStatus);

export default router;