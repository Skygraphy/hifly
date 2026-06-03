import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { list, getOne, updateTags, deleteOne, deleteBulk } from '../controllers/images.controller';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/tags', updateTags);
router.delete('/', deleteBulk);
router.delete('/:id', deleteOne);

export default router;
