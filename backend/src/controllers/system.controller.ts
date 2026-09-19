import { Request, Response, NextFunction } from 'express';
import { getDatabaseHealth } from '../config/db.js';
import { getRedisHealth } from '../config/redis.js';
import { env } from '../config/env.js';

export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      getDatabaseHealth(),
      getRedisHealth(),
    ]);

    let geminiStatus: 'NOT_CONFIGURED' | 'CONFIGURED' | 'AVAILABLE_HEALTHY' = 'NOT_CONFIGURED';
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '' && env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      geminiStatus = 'CONFIGURED';
    }

    const healthReport = {
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      services: {
        api: {
          status: 'OPERATIONAL',
          version: '1.0.0',
          port: env.PORT,
        },
        database: {
          service: 'MongoDB',
          status: dbHealth.status,
          latencyMs: dbHealth.latencyMs,
          databaseName: dbHealth.databaseName,
          error: dbHealth.error,
        },
        cacheAndQueues: {
          service: 'Redis / BullMQ',
          status: redisHealth.status,
          latencyMs: redisHealth.latencyMs,
          error: redisHealth.error,
        },
        realtime: {
          service: 'Socket.IO',
          status: 'ACTIVE',
          connectedClientsCount: 0,
        },
        aiEngine: {
          service: 'Google Gemini (Reserved for Phase 3)',
          status: geminiStatus,
          model: env.GEMINI_MODEL,
          embeddingModel: env.GEMINI_EMBEDDING_MODEL,
          phaseTarget: 'Phase 3 - AI Intelligence',
        },
      },
      thresholds: {
        targetResponseTimeMinutes: env.TARGET_RESPONSE_TIME_MINUTES,
        criticalDispatchTimeoutMinutes: env.CRITICAL_DISPATCH_TIMEOUT_MINUTES,
      },
    };

    res.json({
      success: true,
      data: healthReport,
    });
  } catch (err) {
    next(err);
  }
};
