import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { initiate, confirm } from '../controllers/upload.controller';

const router = Router();

router.use(requireAuth);
router.post('/initiate', initiate);
router.post('/confirm', confirm);

export default router;
