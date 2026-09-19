import { Router } from 'express';
import { getResources, getResourceById, updateResourceStatus } from '../controllers/resources.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getResources);
router.get('/:id', optionalAuth, getResourceById);
router.patch('/:id/status', requireAuth, updateResourceStatus);

export default router;
