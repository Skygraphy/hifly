import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { getTree, create, update, remove } from '../controllers/regions.controller';

const router = Router();

router.get('/', getTree);                    // public — needed for picker UI
router.post('/', requireSuperAdmin, create);
router.patch('/:id', requireSuperAdmin, update);
router.delete('/:id', requireSuperAdmin, remove);

export default router;
