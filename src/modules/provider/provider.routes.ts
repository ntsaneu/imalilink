import { Router } from 'express';
import { ProviderController } from './provider.controller';

const router = Router();
const controller = new ProviderController();

router.get('/', controller.list);
router.get('/summary', controller.getSummary);
router.get('/with-adapters', controller.getWithAdapters);
router.get('/health/all', controller.getAllHealth);
router.get('/:provider_code', controller.getOne);
router.get('/:provider_code/stats', controller.getStats);
router.get('/:provider_code/health', controller.getHealth);

export default router;
