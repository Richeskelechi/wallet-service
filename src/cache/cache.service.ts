import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly defaultTtlSeconds: number;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    // Read default TTL (in seconds) from env or fallback to 3600 (1 hour)
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

  async del(key: string) {
    await this.redis.del(key);
  }
}
