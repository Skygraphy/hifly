import { Router } from 'express';
import { list } from '../controllers/tags.controller';

const router = Router();

// Public — tags are visible to everyone (needed for public gallery filter)
router.get('/', list);

export default router;
