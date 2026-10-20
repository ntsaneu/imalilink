import { Router } from 'express';
import { RegistryController } from './registry.controller';
import { authenticateAPIKey, requireScopes } from '../../middleware/auth';

const router = Router();
const controller = new RegistryController();

// All registry routes require API key authentication
router.use(authenticateAPIKey);

// Register a phone number (requires 'write' scope)
router.post('/register', requireScopes('write'), controller.register);

// Resolve a phone number (requires 'read' scope)
router.get('/resolve/:phone_number', requireScopes('read'), controller.resolve);

// Deactivate a link (requires 'write' scope)
router.delete('/:phone_number/:provider_code', requireScopes('write'), controller.deactivate);

export default router;