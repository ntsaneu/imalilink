import { Router } from 'express';
import { SettlementController } from './settlement.controller';
import { authenticateJWT, requireScopes } from '../../middleware/auth';

const router = Router();
const controller = new SettlementController();

router.get('/pending', controller.getPending);
router.get('/provider/:provider_code/:date', controller.getProviderSettlements);
router.get('/:date', controller.getReport);
router.get('/:date/instructions', controller.getInstructions);
router.post('/run', authenticateJWT, requireScopes('admin'), controller.runNetting);
router.post('/:date/confirm', authenticateJWT, requireScopes('admin'), controller.confirm);

export default router;
