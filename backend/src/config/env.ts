import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ps9_emergency_demo'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev_jwt_secret_ps9_local'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ENABLE_DEMO_SEEDING: z.string().default('true').transform((v) => v === 'true'),
  DEMO_SEED_PASSWORD: z.string().default('demo_password_123'),
  TARGET_RESPONSE_TIME_MINUTES: z.string().default('8').transform((v) => parseInt(v, 10)),
  CRITICAL_DISPATCH_TIMEOUT_MINUTES: z.string().default('5').transform((v) => parseInt(v, 10)),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
});

export const env = envSchema.parse(process.env);
