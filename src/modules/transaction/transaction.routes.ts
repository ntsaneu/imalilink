import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { idempotencyCheck } from '../../middleware/idempotency';

const router = Router();
const controller = new TransactionController();

router.post('/', idempotencyCheck, controller.create);
router.get('/:transaction_id', controller.getStatus);

export default router;
