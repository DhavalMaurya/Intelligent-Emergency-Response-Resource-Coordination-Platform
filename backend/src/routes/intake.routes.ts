import { Router } from 'express';
import {
  submitCitizenReport,
  createOperatorIncident,
  resolveReportCorrelation,
  submitFieldUpdate,
  ingestSensorTelemetry,
  getReports,
  getCorrelationSuggestions,
  triggerDemoScenario,
} from '../controllers/intake.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { citizenRateLimiter, citizenSanitizerAndHoneypot } from '../middleware/rateLimiter.js';
import { validateCoordinatesMiddleware } from '../middleware/geoValidator.js';

const router = Router();

// Public Citizen Intake (Abuse-protected, rate-limited, geo-bounded)
router.post(
  '/citizen',
  citizenRateLimiter,
  citizenSanitizerAndHoneypot,
  validateCoordinatesMiddleware,
  submitCitizenReport
);

// EOC Operator Intake ("Submit & Recommend")
router.post(
  '/operator',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  validateCoordinatesMiddleware,
  createOperatorIncident
);

// Restricted Correlation & Merge Endpoint:
// Explicitly restricted to authorized Operator / Supervisor / Control Room (and Admin) roles!
router.post(
  '/correlate',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  resolveReportCorrelation
);

// Field Team Updates
router.post(
  '/field-update',
  requireAuth,
  requireRole(['FIELD_TEAM', 'OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  submitFieldUpdate
);

// Sensor Telemetry & Breach Ingestion (with repeat-reading telemetry update suppression)
router.post('/sensor-event', ingestSensorTelemetry);

// Reports Triage Feed & Duplicates
router.get('/reports', getReports);
router.get('/correlation-suggestions', requireAuth, getCorrelationSuggestions);

// 1-Click Interactive Hackathon Demo Scenarios
router.post('/demo/scenario/:scenarioName', triggerDemoScenario);

export default router;
