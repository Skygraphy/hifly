import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { login, register, changePassword } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.patch('/password', requireAuth, changePassword);

export default router;
