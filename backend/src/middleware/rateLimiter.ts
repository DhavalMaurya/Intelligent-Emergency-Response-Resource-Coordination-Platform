import { Request, Response, NextFunction } from 'express';

// In-memory sliding window rate limiter
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10; // 10 requests per 15 min

// Cleanup stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export const citizenRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp =
    (req.headers['x-client-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();

  let record = rateLimitStore.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(clientIp, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many emergency reports submitted from this IP address. Please wait before submitting again.',
        retryAfterMinutes: 15,
      },
    });
    return;
  }

  record.timestamps.push(now);
  next();
};

export const citizenSanitizerAndHoneypot = (req: Request, res: Response, next: NextFunction): void => {
  // Honeypot check: bot fields 'website' or 'faxNumber' must be empty
  if (req.body.website || req.body.faxNumber) {
    res.status(400).json({
      success: false,
      error: {
        code: 'ABUSE_DETECTED',
        message: 'Automated submission detected.',
      },
    });
    return;
  }

  // Payload size check (under 10KB)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10 * 1024) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Payload exceeds maximum limit of 10KB.',
      },
    });
    return;
  }

  // HTML sanitization helper
  const stripHtml = (str: unknown): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '').trim();
  };

  if (req.body.rawText) {
    req.body.rawText = stripHtml(req.body.rawText).slice(0, 1000);
  }
  if (req.body.description) {
    req.body.description = stripHtml(req.body.description).slice(0, 1000);
  }
  if (req.body.callerInfo?.name) {
    req.body.callerInfo.name = stripHtml(req.body.callerInfo.name).slice(0, 100);
  }
  if (req.body.callerInfo?.phone) {
    req.body.callerInfo.phone = stripHtml(req.body.callerInfo.phone).slice(0, 30);
  }
  if (req.body.location?.address) {
    req.body.location.address = stripHtml(req.body.location.address).slice(0, 200);
  }

  next();
};
