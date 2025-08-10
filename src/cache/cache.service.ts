import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async set(key: string, value: any, ttlSeconds?: number) {
    const val = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, val, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, val);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.redis.get(key);
    return val ? JSON.parse(val) : null;
  }

  async del(key: string) {
    await this.redis.del(key);
  }
}
