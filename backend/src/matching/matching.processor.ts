/**
 * @module MatchingProcessor
 * @description BullMQ worker for rider timeout jobs on the 'matching' queue.
 *
 * When MatchingService sends a job request to a rider, it enqueues a
 * 'rider-timeout' BullMQ delayed job with a 30-second delay.
 * If the rider accepts within 30s, the job is removed before it fires.
 * If not, this worker fires riderRejected() which advances to the next candidate.
 *
 * BullMQ delayed jobs survive server restarts — if the server crashes mid-dispatch,
 * the timeout job will still fire after the delay when the server comes back up.
 * This prevents orders from being permanently stuck awaiting a rider who never responds.
 *
 * Uses a dedicated ioredis connection (workerRedis) separate from the shared
 * RedisService connection, as required by BullMQ's worker architecture.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { MatchingService } from './matching.service';

@Injectable()
export class MatchingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingProcessor.name);
  private worker!: Worker;
  private workerRedis!: Redis;

  constructor(private matchingService: MatchingService) {}

  onModuleInit() {
    this.workerRedis = new Redis(
      process.env['REDIS_URL'] || 'redis://localhost:6379',
      { maxRetriesPerRequest: null },
    );

    this.worker = new Worker(
      'matching',
      async (job: Job) => {
        if (job.name === 'rider-timeout') {
          const { orderId, riderId } = job.data as {
            orderId: string;
            riderId: string;
          };
          this.logger.log(
            `Timeout fired: rider ${riderId} did not respond for order ${orderId}`,
          );
          await this.matchingService.riderRejected(orderId, riderId);
        }
      },
      { connection: this.workerRedis },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('BullMQ matching worker started');
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.workerRedis.quit();
  }
}
