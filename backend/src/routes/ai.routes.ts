import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getAIHealthStatus,
  extractEntitiesHandler,
  summarizeIncidentHandler,
  recommendResourcesHandler,
  aiAssistantChatHandler,
} from '../controllers/ai.controller.js';

const router = Router();

// In-memory rate limiter for AI endpoints (20 req / 1 min)
const aiRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const aiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.user?.id || req.ip || 'anonymous';
  const now = Date.now();
  const record = aiRateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    aiRateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
    return next();
  }

  if (record.count >= 20) {
    return next(
      new AppError(
        'Rate limit exceeded for AI endpoints (Max 20 req/min). Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      )
    );
  }

  record.count++;
  next();
};

// 1. Health check (Public)
router.get('/health', getAIHealthStatus);

// 2. Entity extraction (Authenticated users)
router.post('/extract', requireAuth, aiRateLimiter, extractEntitiesHandler);

// 3. Situation summarization (Operators / Supervisors / Control Room / Admin)
router.post(
  '/summarize/:incidentId',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  aiRateLimiter,
  summarizeIncidentHandler
);

// 4. Ranked resource recommendations (Operators / Supervisors / Control Room / Admin)
router.post(
  '/recommend-resources',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  aiRateLimiter,
  recommendResourcesHandler
);

// 5. Conversational Command Assistant (Operators / Supervisors / Control Room / Admin)
router.post(
  '/assistant/chat',
  requireAuth,
  requireRole(['OPERATOR', 'SUPERVISOR', 'CONTROL_ROOM', 'ADMIN']),
  aiRateLimiter,
  aiAssistantChatHandler
);

export default router;
