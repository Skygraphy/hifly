import { Router } from 'express';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { list, getOne, updateTags, deleteOne, deleteBulk, updateRegion } from '../controllers/images.controller';

const router = Router();

// Public endpoints — auth optional (affects whether download URLs are included)
router.get('/', optionalAuth, list);
router.get('/:id', optionalAuth, getOne);

// Require any login for tag updates
router.patch('/:id/tags', requireAuth, updateTags);
router.patch('/:id/region', requireAdmin, updateRegion);

// Admin-only for destructive operations
router.delete('/', requireAdmin, deleteBulk);
router.delete('/:id', requireAdmin, deleteOne);

export default router;
