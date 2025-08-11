import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly defaultTtlSeconds: number;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.defaultTtlSeconds = Number(process.env.REDIS_CACHE_TTL) || 3600;
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    const val = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;

    await this.redis.set(key, val, 'EX', ttl);
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.redis.get(key);
    return val ? JSON.parse(val) : null;
  }

  async del(...keys: string[]) {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Use SCAN instead of KEYS for safer pattern matching in production
  async keys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100, // batch size for each scan iteration
    });

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      stream.on('end', () => {
        resolve(keys);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async delByPattern(pattern: string) {
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await this.del(...keys);
    }
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await (this.redis as any).set(key, 'locked', 'NX', 'EX', ttlSeconds.toString());
    return result === 'OK';
  }
  
  async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
