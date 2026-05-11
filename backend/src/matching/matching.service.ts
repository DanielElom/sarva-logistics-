/**
 * @module MatchingService
 * @description Implements Fair-Ride's rider-matching algorithm.
 *
 * MATCHING ALGORITHM
 * ==================
 * Step 1 — Premium detection:
 *   If order.isPremium === true (subscribed business user),
 *   only FLEET riders are considered. Guarantees SLA for paying business accounts.
 *
 * Step 2 — Geo filtering:
 *   Haversine SQL finds riders within 3km of pickup.
 *   Only riders where isOnline=true AND verificationStatus=VERIFIED qualify.
 *   Production upgrade path: replace NEARBY_RIDERS_SQL with ST_DWithin (PostGIS).
 *
 * Step 3 — Ranking:
 *   Riders sorted by: acceptanceRate DESC, avgResponseTime ASC
 *   High acceptance rate = reliable; low response time = fast.
 *   Ranking uses EMA (α=0.1) so one bad outcome doesn't tank a rider permanently.
 *
 * Step 4 — Request dispatch:
 *   Top-ranked rider receives Socket.io job_request event.
 *   Redis key `match:{orderId}:{riderId}` with 30s TTL is the lock.
 *   BullMQ `rider-timeout` job fires after 30s for non-response.
 *
 * Step 5 — Fallback:
 *   Reject/timeout → next rider in ranked list.
 *   All exhausted → emit no_riders_available to customer.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OrdersService } from '../orders/orders.service';
import { MatchingGateway } from './matching.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, RiderType } from '../../generated/prisma/enums';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const MATCH_TTL_S = 30;
const CANDIDATE_TTL_S = 300;
const RADIUS_METRES = 3000;
const EMA_ALPHA = 0.1;

interface NearbyRider {
  id: string;
  userId: string;
  riderType: string;
  acceptanceRate: number;
  avgResponseTime: number;
  distance_metres: number;
}

// Haversine distance query using plain PostgreSQL (no PostGIS required).
// Swap out for ST_DWithin when PostGIS is available in production.
const NEARBY_RIDERS_SQL = `
  SELECT *
  FROM (
    SELECT
      rp.id,
      rp."userId",
      rp."riderType",
      rp."acceptanceRate",
      rp."avgResponseTime",
      (6371000 * acos(
        LEAST(1.0,
          cos(radians($2)) * cos(radians(rp.latitude)) *
          cos(radians(rp.longitude) - radians($1)) +
          sin(radians($2)) * sin(radians(rp.latitude))
        )
      )) AS distance_metres
    FROM "RiderProfile" rp
    WHERE rp."isOnline" = true
      AND rp."verificationStatus" = 'VERIFIED'
      AND rp.latitude IS NOT NULL
      AND rp.longitude IS NOT NULL
  ) sub
  WHERE sub.distance_metres <= $3
  ORDER BY sub.distance_metres ASC
`;

@Injectable()
export class MatchingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingService.name);
  private matchQueue!: Queue;
  private queueRedis!: Redis;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => MatchingGateway))
    private gateway: MatchingGateway,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.queueRedis = new Redis(
      process.env['REDIS_URL'] || 'redis://localhost:6379',
      { maxRetriesPerRequest: null },
    );
    this.matchQueue = new Queue('matching', { connection: this.queueRedis });
    this.logger.log('Matching queue initialized');
  }

  async onModuleDestroy() {
    await this.matchQueue.close();
    await this.queueRedis.quit();
  }

  private get db() {
    return this.prisma as any;
  }

  /**
   * Entry point for the matching algorithm. Called by OrdersService after order creation.
   * Queries nearby online/verified riders, applies premium filter, ranks them,
   * stores candidate list in Redis, then dispatches to the top-ranked rider.
   */
  async findMatch(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`findMatch: order ${orderId} not found`);
      return;
    }

    const lat = parseFloat(order.pickupLatitude.toString());
    const lng = parseFloat(order.pickupLongitude.toString());

    const raw = (await (this.prisma as any).$queryRawUnsafe(
      NEARBY_RIDERS_SQL,
      lng,
      lat,
      RADIUS_METRES,
    )) as NearbyRider[];

    let candidates = raw;
    if (order.isPremium) {
      candidates = candidates.filter((r) => r.riderType === RiderType.FLEET);
    }

    this.logger.log(
      `Order ${orderId}: found ${candidates.length} candidate(s) within ${RADIUS_METRES}m` +
        (order.isPremium ? ' (FLEET only)' : ''),
    );

    if (candidates.length === 0) {
      this.gateway.emitNoRidersAvailable(order.userId);
      this.notifications.sendOrderNotification(orderId, 'NO_RIDERS').catch(() => null);
      return;
    }

    candidates.sort((a, b) => {
      if (b.acceptanceRate !== a.acceptanceRate)
        return b.acceptanceRate - a.acceptanceRate;
      return a.avgResponseTime - b.avgResponseTime;
    });

    await this.redisService.set(
      `match:${orderId}:candidates`,
      JSON.stringify(candidates.map((r) => r.id)),
      CANDIDATE_TTL_S,
    );

    await this.requestRider(orderId, candidates[0].id, candidates[0].userId);
  }

  /**
   * Sends a job request to a specific rider and starts the 30s response timer.
   *
   * @param orderId - The order awaiting assignment
   * @param riderId - RiderProfile.id of the target rider
   * @param riderUserId - User.id of the target rider (for Socket.io room lookup)
   */
  async requestRider(
    orderId: string,
    riderId: string,
    riderUserId: string,
  ): Promise<void> {
    const requestTime = Date.now();
    // Store with 30s TTL — auto-expires if rider goes offline without responding
    await this.redisService.set(
      `match:${orderId}:${riderId}`,
      JSON.stringify({ requestTime }),
      MATCH_TTL_S,
    );

    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, phone: true } },
      },
    });
    // Emit to rider's personal Socket.io room: user:{riderUserId}
    this.gateway.emitJobRequest(riderUserId, order);

    // BullMQ timeout job fires riderRejected() after 30s if rider doesn't respond.
    // Using BullMQ (not setTimeout) so timeouts survive server restarts.
    await this.matchQueue.add(
      'rider-timeout',
      { orderId, riderId },
      { delay: MATCH_TTL_S * 1000 },
    );

    this.logger.log(`Dispatched order ${orderId} → rider ${riderId} (30s timeout)`);
  }

  /**
   * Called when a rider taps Accept. Clears the Redis lock, updates EMA metrics,
   * sets order status to ASSIGNED, and notifies the customer via Socket.io.
   */
  async riderAccepted(orderId: string, riderId: string): Promise<void> {
    const key = `match:${orderId}:${riderId}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      this.logger.warn(`riderAccepted: key ${key} expired — ignoring late accept`);
      return;
    }

    const { requestTime } = JSON.parse(raw) as { requestTime: number };
    const responseTimeSecs = (Date.now() - requestTime) / 1000;

    await this.redisService.del(key);
    await this.redisService.del(`match:${orderId}:candidates`);

    const profile = await this.db.riderProfile.findUnique({ where: { id: riderId } });
    const newRate =
      profile.acceptanceRate * (1 - EMA_ALPHA) + 1 * EMA_ALPHA;
    const newAvgResponse =
      profile.avgResponseTime * (1 - EMA_ALPHA) + responseTimeSecs * EMA_ALPHA;

    await Promise.all([
      this.db.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ASSIGNED, riderId },
      }),
      this.db.riderProfile.update({
        where: { id: riderId },
        data: { acceptanceRate: newRate, avgResponseTime: newAvgResponse },
      }),
    ]);

    const assigned = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        rider: { include: { user: { select: { name: true, phone: true } } } },
      },
    });

    this.gateway.emitOrderAssigned(assigned.userId, assigned);
    this.notifications.sendOrderNotification(orderId, 'ASSIGNED').catch(() => null);
    this.logger.log(
      `Rider ${riderId} accepted order ${orderId} in ${responseTimeSecs.toFixed(1)}s`,
    );
  }

  /**
   * Called on explicit reject OR BullMQ 30s timeout.
   * Updates EMA metrics for this rider then tries the next candidate in the list.
   * If no candidates remain, emits no_riders_available to the customer.
   */
  async riderRejected(orderId: string, riderId: string): Promise<void> {
    const key = `match:${orderId}:${riderId}`;
    const raw = await this.redisService.get(key);

    if (raw) {
      const { requestTime } = JSON.parse(raw) as { requestTime: number };
      const responseTimeSecs = (Date.now() - requestTime) / 1000;
      await this.redisService.del(key);

      const profile = await this.db.riderProfile.findUnique({ where: { id: riderId } });
      const newRate =
        profile.acceptanceRate * (1 - EMA_ALPHA) + 0 * EMA_ALPHA;
      const newAvgResponse =
        profile.avgResponseTime * (1 - EMA_ALPHA) + responseTimeSecs * EMA_ALPHA;

      await this.db.riderProfile.update({
        where: { id: riderId },
        data: { acceptanceRate: newRate, avgResponseTime: newAvgResponse },
      });
    }

    const candidatesRaw = await this.redisService.get(`match:${orderId}:candidates`);
    if (!candidatesRaw) {
      this.logger.log(`No candidates list for order ${orderId} — already assigned or expired`);
      return;
    }

    const candidates: string[] = JSON.parse(candidatesRaw);
    const idx = candidates.indexOf(riderId);
    const remaining = candidates.slice(idx + 1);

    if (remaining.length === 0) {
      await this.redisService.del(`match:${orderId}:candidates`);
      const order = await this.db.order.findUnique({ where: { id: orderId } });
      if (order) {
        this.gateway.emitNoRidersAvailable(order.userId);
        this.logger.log(`Order ${orderId}: all candidates exhausted`);
      }
      return;
    }

    await this.redisService.set(
      `match:${orderId}:candidates`,
      JSON.stringify(remaining),
      CANDIDATE_TTL_S,
    );

    const nextRiderId = remaining[0];
    const nextProfile = await this.db.riderProfile.findUnique({
      where: { id: nextRiderId },
    });

    this.logger.log(
      `Order ${orderId}: rider ${riderId} rejected — trying next rider ${nextRiderId}`,
    );
    await this.requestRider(orderId, nextRiderId, nextProfile.userId);
  }

  /**
   * Updates rider GPS coordinates in RiderProfile for the live operations map.
   * Called from MatchingGateway on every location_update Socket.io event.
   */
  async updateRiderLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.db.riderProfile.updateMany({
      where: { userId },
      data: { latitude, longitude, lastSeenAt: new Date() },
    });
  }
}
