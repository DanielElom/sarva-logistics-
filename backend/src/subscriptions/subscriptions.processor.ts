/**
 * @module SubscriptionsProcessor
 * @description BullMQ worker that runs the subscription expiry cron job.
 *
 * Cron schedule: every hour on the hour (0 * * * *)
 * Calls SubscriptionsService.checkAndExpireSubscriptions() which finds all
 * active subscriptions past their endDate and marks them EXPIRED.
 *
 * Why hourly instead of exact per-subscription expiry?
 *   Simpler to implement. Max 1-hour delay is acceptable for subscription expiry.
 *   Production upgrade: schedule a BullMQ delayed job per subscription at
 *   creation time so expiry fires at the exact moment, not up to 1h later.
 *
 * Two separate Redis connections are required by BullMQ — one for the queue
 * client, one for the worker — this is a BullMQ architectural constraint.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionsProcessor.name);
  private queue!: Queue;
  private worker!: Worker;
  private queueRedis!: Redis;
  private workerRedis!: Redis;

  constructor(private subscriptionsService: SubscriptionsService) {}

  async onModuleInit() {
    const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

    this.queueRedis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.workerRedis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    this.queue = new Queue('subscriptions', { connection: this.queueRedis });

    // Remove any stale repeatable job, then add fresh cron
    await this.queue.removeRepeatable('expire-subscriptions', {
      pattern: '0 * * * *',
    });
    await this.queue.add(
      'expire-subscriptions',
      {},
      { repeat: { pattern: '0 * * * *' } },
    );

    this.worker = new Worker(
      'subscriptions',
      async (job: Job) => {
        if (job.name === 'expire-subscriptions') {
          await this.subscriptionsService.checkAndExpireSubscriptions();
        }
      },
      { connection: this.workerRedis },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Expire-subscriptions cron registered');
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
    await this.queueRedis.quit();
    await this.workerRedis.quit();
  }
}
