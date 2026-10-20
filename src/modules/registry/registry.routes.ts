import { Router } from 'express';
import { RegistryController } from './registry.controller';

const router = Router();
const controller = new RegistryController();

router.post('/register', controller.register);
router.get('/resolve/:phone_number', controller.resolve);
router.delete('/:phone_number/:provider_code', controller.deactivate);

export default router;
