import { Router } from 'express';
import {
  getHospitals,
  getNearestHospital,
  updateHospitalStatus,
} from '../controllers/hospital.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public / Operator endpoints
router.get('/', getHospitals);
router.get('/nearest', getNearestHospital);

// Authenticated status update
router.patch(
  '/:id/status',
  requireAuth,
  updateHospitalStatus
);

export default router;

