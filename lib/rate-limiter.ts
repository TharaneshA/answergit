import { Redis } from 'ioredis';
import { logger } from './logger';

const DAILY_LIMIT = 20; // 20 requests per day per IP
const WINDOW_SECONDS = 24 * 60 * 60; // 24 hours in seconds

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // Unix timestamp when limit resets
}

export class RateLimiter {
  private static redis: Redis;

  private static async getClient(): Promise<Redis> {
    if (!this.redis) {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable not configured');
      }

      this.redis = new Redis(redisUrl);

      this.redis.on('error', (error) => {
        logger.error(`Redis rate limiter error: ${error}`, { prefix: 'RateLimit' });
      });
    }

    return this.redis;
  }

  private static getKey(ip: string): string {
    return `ratelimit:${ip}`;
  }

  static async check(ip: string): Promise<RateLimitInfo> {
    try {
      const client = await this.getClient();
      const key = this.getKey(ip);

      // Get current count
      const data = await client.get(key);

      if (!data) {
        // First request from this IP
        return {
          allowed: true,
          remaining: DAILY_LIMIT,
          limit: DAILY_LIMIT,
          resetAt: Math.floor(Date.now() / 1000) + WINDOW_SECONDS
        };
      }

      const { count, resetAt } = JSON.parse(data);
      const remaining = Math.max(0, DAILY_LIMIT - count);

      return {
        allowed: count < DAILY_LIMIT,
        remaining,
        limit: DAILY_LIMIT,
        resetAt
      };
    } catch (error) {
      logger.error(`Rate limit check error: ${error}`, { prefix: 'RateLimit' });
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: DAILY_LIMIT,
        limit: DAILY_LIMIT,
        resetAt: Math.floor(Date.now() / 1000) + WINDOW_SECONDS
      };
    }
  }

  static async increment(ip: string): Promise<RateLimitInfo> {
    try {
      const client = await this.getClient();
      const key = this.getKey(ip);

      const data = await client.get(key);

      let count: number;
      let resetAt: number;

      if (!data) {
        // First request
        count = 1;
        resetAt = Math.floor(Date.now() / 1000) + WINDOW_SECONDS;
      } else {
        const parsed = JSON.parse(data);
        count = parsed.count + 1;
        resetAt = parsed.resetAt;
      }

      // Calculate TTL (time until reset)
      const ttl = resetAt - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        await client.setex(key, ttl, JSON.stringify({ count, resetAt }));
      }

      const remaining = Math.max(0, DAILY_LIMIT - count);

      logger.info(`Rate limit for ${ip}: ${count}/${DAILY_LIMIT} used`, { prefix: 'RateLimit' });

      return {
        allowed: count <= DAILY_LIMIT,
        remaining,
        limit: DAILY_LIMIT,
        resetAt
      };
    } catch (error) {
      logger.error(`Rate limit increment error: ${error}`, { prefix: 'RateLimit' });
      return {
        allowed: true,
        remaining: DAILY_LIMIT - 1,
        limit: DAILY_LIMIT,
        resetAt: Math.floor(Date.now() / 1000) + WINDOW_SECONDS
      };
    }
  }
}
