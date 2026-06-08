import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { listUsers, updateUserRole } from '../controllers/users.controller';

const router = Router();

router.use(requireSuperAdmin);
router.get('/', listUsers);
router.patch('/:id/role', updateUserRole);

export default router;
