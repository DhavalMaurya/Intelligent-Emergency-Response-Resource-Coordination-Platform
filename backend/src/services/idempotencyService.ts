import crypto from 'crypto';

interface CachedEvent {
  hash: string;
  timestamp: number;
}

class IdempotencyService {
  private cache: Map<string, CachedEvent> = new Map();
  private readonly ttlMs: number = 60 * 1000; // 60 seconds

  constructor() {
    // Cleanup expired cache every 30 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > this.ttlMs) {
          this.cache.delete(key);
        }
      }
    }, 30 * 1000);
  }

  /**
   * Generates a hash for sensor telemetry or event payloads.
   */
  public generateHash(payload: Record<string, any>): string {
    const serialized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Checks if an event is a duplicate within the 60-second sliding window.
   * If duplicate, returns true.
   * If new, stores it and returns false.
   */
  public isDuplicate(key: string): boolean {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && now - existing.timestamp < this.ttlMs) {
      return true;
    }

    this.cache.set(key, { hash: key, timestamp: now });
    return false;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const idempotencyService = new IdempotencyService();
