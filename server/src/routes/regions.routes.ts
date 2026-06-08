import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { getTree, create, remove } from '../controllers/regions.controller';

const router = Router();

router.get('/', getTree);                    // public — needed for picker UI
router.post('/', requireSuperAdmin, create);
router.delete('/:id', requireSuperAdmin, remove);

export default router;
