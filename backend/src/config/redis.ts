import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { env } from './env.js';

export interface RedisHealth {
  status: 'READY' | 'CONNECTING' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  latencyMs?: number;
  error?: string;
}

let redisHealth: RedisHealth = {
  status: 'DISCONNECTED',
};

export let redisClient: Redis | null = null;
export let incidentQueue: Queue | null = null;

export const initRedis = async (): Promise<boolean> => {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      retryStrategy: () => null, // don't infinite loop if redis is down
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisHealth.status = 'CONNECTING';
    });

    redisClient.on('ready', () => {
      redisHealth.status = 'READY';
      console.log('[Redis] Connected and ready');
    });

    redisClient.on('error', (err) => {
      redisHealth = { status: 'DISCONNECTED', error: err.message };
    });

    const start = Date.now();
    await redisClient.connect();
    await redisClient.ping();
    redisHealth = {
      status: 'READY',
      latencyMs: Date.now() - start,
    };

    // Initialize BullMQ Queue groundwork for future Phase 4 job processing
    incidentQueue = new Queue('incident-tasks', {
      connection: redisClient,
    });

    return true;
  } catch (err: any) {
    redisHealth = {
      status: 'DISCONNECTED',
      error: err.message,
    };
    console.warn(`[Redis] Redis connection warning: ${err.message}. Running without active Redis cache.`);
    return false;
  }
};

export const getRedisHealth = async (): Promise<RedisHealth> => {
  if (redisClient && redisClient.status === 'ready') {
    try {
      const start = Date.now();
      await redisClient.ping();
      return {
        status: 'READY',
        latencyMs: Date.now() - start,
      };
    } catch (e: any) {
      return { status: 'DISCONNECTED', error: e.message };
    }
  }
  return redisHealth;
};
