import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { list } from '../controllers/tags.controller';

const router = Router();

router.use(requireAuth);
router.get('/', list);

export default router;
