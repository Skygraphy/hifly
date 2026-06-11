import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { syncImageData, syncImageDataStatus } from '../controllers/admin.controller';

const router = Router();

router.get('/sync-image-data/status', requireSuperAdmin, syncImageDataStatus);
router.post('/sync-image-data', requireSuperAdmin, syncImageData);

export default router;
