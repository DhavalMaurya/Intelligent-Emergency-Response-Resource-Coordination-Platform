import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  getNotificationsHandler,
  acknowledgeNotificationHandler,
  manualEscalateHandler,
} from '../controllers/notification.controller.js';

const router = Router();

// 1. Get notifications list (Authenticated users)
router.get('/', requireAuth, getNotificationsHandler);

// 2. Acknowledge notification (Operators / Supervisors / Control Room / Admin)
router.patch(
  '/:id/acknowledge',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  acknowledgeNotificationHandler
);

// 3. Manual supervisor escalation (Operators / Supervisors / Control Room / Admin)
router.post(
  '/escalate/:incidentId',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  manualEscalateHandler
);

export default router;
