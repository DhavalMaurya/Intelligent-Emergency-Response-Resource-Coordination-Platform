import { Router } from 'express';
import { getOverview } from '../controllers/analytics.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/overview', optionalAuth, getOverview);

export default router;
