import { Router } from 'express';
import { getIncidents, getIncidentById, performIncidentAction } from '../controllers/incidents.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getIncidents);
router.get('/:id', optionalAuth, getIncidentById);
router.patch('/:id/action', requireAuth, performIncidentAction);

export default router;
