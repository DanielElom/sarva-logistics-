/**
 * @module RedisModule
 * @description Shared Redis client for caching, OTP storage, and pub/sub.
 *
 * @Global — RedisService is available in every module without explicit import.
 * Used for: OTP TTLs (otp:/forgot: keys), dynamic pricing config (config: keys),
 * rider matching locks (match: keys), BullMQ queue connections (separate clients).
 *
 * Note: BullMQ requires its own ioredis connections (not this shared client)
 * because BullMQ enters a blocking-command mode that prevents other commands.
 */
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
