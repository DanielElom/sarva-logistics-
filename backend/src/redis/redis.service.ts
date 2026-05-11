/**
 * @module RedisService
 * @description Thin wrapper around ioredis for key-value cache operations.
 *
 * Methods:
 *   get(key)              — returns null if key does not exist
 *   set(key, value, ttl?) — optional TTL in seconds (EX flag)
 *   setNx(key, value)     — atomic set-if-not-exists, returns true on success
 *                           Used by MatchingService for 30s rider request locks.
 *   del(key)              — remove a key (e.g. after OTP verification)
 *
 * The shared Redis connection is separate from BullMQ connections, which
 * require their own ioredis instances due to blocking command constraints.
 */
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async setNx(key: string, value: string): Promise<boolean> {
    const result = await this.client.setnx(key, value);
    return result === 1;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
