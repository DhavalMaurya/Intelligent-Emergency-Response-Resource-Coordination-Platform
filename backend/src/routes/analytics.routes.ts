import { Router } from 'express';
import {
  getOverview,
  getShortageForecast,
  getOperationalInsights,
} from '../controllers/analytics.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/overview', optionalAuth, getOverview);
router.get('/shortage-forecast', optionalAuth, getShortageForecast);
router.get('/insights', optionalAuth, getOperationalInsights);

export default router;
