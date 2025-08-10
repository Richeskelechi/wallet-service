import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisCacheService } from './cache.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        });
      },
    },
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class CacheModule {}
