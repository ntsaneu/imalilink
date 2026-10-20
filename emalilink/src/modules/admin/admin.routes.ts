import { Router } from 'express';
import { authenticateJWT, requireScopes } from '../../middleware/auth';

const router = Router();

// All admin routes require JWT
router.use(authenticateJWT);

// Only admins can view all transactions
router.get(
  '/transactions',
  requireScopes('admin'),
  (req, res) => {
    // Return all transactions
  }
);

// Only admins can view settlement reports
router.get(
  '/settlements/:date',
  requireScopes('admin'),
  (req, res) => {
    // Return settlement report
  }
);

export default router;