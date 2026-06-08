import { Router } from 'express';
import { optionalAuth, requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import { list, update } from '../controllers/settings.controller';

const router = Router();

// Read: any logged-in user (filters by role server-side); anonymous gets nothing
router.get('/', optionalAuth, list);

// Write: only super_admin
router.patch('/:key', requireSuperAdmin, update);

export default router;
